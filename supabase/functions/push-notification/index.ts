import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication - Edge Functions require a valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized - No authentication provided",
          code: "NO_AUTH_HEADER"
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized - Invalid or expired token",
          code: "INVALID_TOKEN" 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Rate Limiting (Atomic RPC)
    const rateLimitKey = `push-notification:${user.id}`;

    const { data: requestCount, error: rpcError } = await supabase.rpc('increment_rate_limit', {
      p_key: rateLimitKey,
      p_window_duration_seconds: 60
    });

    if (rpcError) {
        console.error("Rate limit check failed:", rpcError.message);
        return new Response(
            JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (requestCount > 20) { // Limit: 20 requests per minute
        return new Response(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { action, subscription, notification, taskId, userId: requestedUserId } = await req.json();

    // Default to authenticated user, but allow service_role to override
    let userId = user.id;
    if (user.role === 'service_role' && requestedUserId) {
      userId = requestedUserId;
    }

    // Action: Subscribe
    if (action === "subscribe") {
      if (!subscription || !subscription.endpoint) {
        throw new Error("Missing subscription or endpoint");
      }

      const endpoint = subscription.endpoint;

      // Check if this exact subscription already exists
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("subscription->>endpoint", endpoint)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("push_subscriptions")
          .update({
            subscription: subscription,
            platform: "web",
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("push_subscriptions")
          .insert({
            user_id: userId,
            subscription: subscription,
            platform: "web",
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription saved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Unsubscribe
    if (action === "unsubscribe") {
      let query = supabase.from("push_subscriptions").delete().eq("user_id", userId);

      // 🛡️ ENHANCEMENT: Allow targeted unsubscribe if endpoint is provided
      if (subscription && subscription.endpoint) {
         query = query.eq("subscription->>endpoint", subscription.endpoint);
      }

      const { error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subscription(s) removed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Schedule
    if (action === "schedule") {
      if (!notification || !notification.scheduledTime) {
        throw new Error("Missing required fields for scheduling");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .upsert({
          user_id: userId,
          task_id: taskId || null,
          title: notification.title,
          body: notification.body,
          scheduled_at: notification.scheduledTime,
          sent: false,
        }, {
          onConflict: taskId ? "task_id" : undefined,
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification scheduled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Cancel
    if (action === "cancel") {
      if (!taskId) {
        throw new Error("Missing taskId");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Send
    if (action === "send") {
      if (!notification) {
        throw new Error("Missing notification");
      }

      const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
      const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
      const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("VAPID keys not configured.");
      }

      webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

      // 🛡️ FIX: Fetch ALL subscriptions (handles multi-device users)
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", userId);

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
            JSON.stringify({ success: false, message: "User has no push subscriptions" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/logo-dark.jpg",
        badge: "/logo-dark.jpg",
        data: notification.data || {},
      });

      let sentCount = 0;
      let failCount = 0;

      for (const sub of subscriptions) {
        try {
            // 🛡️ SECURITY: webpush.sendNotification encrypts the payload automatically
            await webpush.sendNotification(sub.subscription, payload);
            sentCount++;

            // Update activity
            await supabase.from("push_subscriptions")
                .update({ last_active: new Date().toISOString() })
                .eq("id", sub.id);

        } catch (pushError: any) {
            failCount++;
            console.error(`Failed to send to subscription ${sub.id}:`, pushError);

            // Handle expired subscriptions (410 Gone)
            if (pushError?.statusCode === 410) {
                console.log(`Removing expired subscription ${sub.id}`);
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
        }
      }

      return new Response(
        JSON.stringify({
            success: sentCount > 0,
            message: `Notification sent to ${sentCount} devices (${failCount} failed)`,
            details: { sent: sentCount, failed: failCount }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("Push notification error:", error);

    return new Response(
      JSON.stringify({ error: "An unexpected error occurred processing your request." }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
