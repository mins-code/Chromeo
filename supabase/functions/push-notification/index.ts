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

// Custom error class for safe user-facing errors
class AppError extends Error {
  constructor(message: string, public status: number = 400, public code?: string) {
    super(message);
    this.name = "AppError";
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication - Edge Functions require a valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AppError("Unauthorized - No authentication provided", 401, "NO_AUTH_HEADER");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new AppError("Unauthorized - Invalid or expired token", 401, "INVALID_TOKEN");
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

    // Action: Subscribe - Save push subscription to database
    if (action === "subscribe") {
      if (!subscription || !subscription.endpoint) {
        throw new AppError("Missing subscription endpoint");
      }

      // Check if this exact subscription already exists
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("subscription->>endpoint", subscription.endpoint)
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
        throw new AppError("Missing required fields for scheduling");
      }

      // 🛡️ SECURITY: Prevent IDOR - Check if this task ID is already scheduled by another user
      // Since 'task_id' is UNIQUE, upserting would overwrite the existing owner's notification
      if (taskId) {
        const { data: existing } = await supabase
          .from("scheduled_notifications")
          .select("user_id")
          .eq("task_id", taskId)
          .single();

        if (existing && existing.user_id !== userId) {
          console.error(`IDOR Attempt: User ${userId} tried to overwrite notification for task ${taskId} owned by ${existing.user_id}`);
          throw new AppError("You do not have permission to modify this notification", 403);
        }
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
        throw new AppError("Missing taskId");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId); // 🛡️ SECURITY: Prevent IDOR

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Send - Send notification immediately (using web-push for encryption)
    if (action === "send") {
      if (!notification) {
        throw new AppError("Missing notification");
      }

      const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
      const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
      const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        // Internal misconfiguration
        console.error("VAPID keys not configured");
        throw new Error("VAPID keys not configured");
      }

      // Configure web-push with VAPID details
      webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

      // Get ALL user's subscriptions
      // 🛡️ SECURITY: Use .select() instead of .single() to handle multiple devices securely
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", userId);

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        throw new AppError("User not subscribed to push notifications", 404);
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/logo-dark.jpg",
        badge: "/logo-dark.jpg",
        data: notification.data || {},
      });

      let successCount = 0;
      const errors = [];

      // Send to all devices using encrypted web-push
      for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(sub.subscription, payload);
            successCount++;
        } catch (pushError: any) {
             console.error(`Push failed for sub ${sub.id}:`, pushError);
             // Remove expired subscriptions
             if (pushError.statusCode === 410) {
                 await supabase.from("push_subscriptions").delete().eq("id", sub.id);
             }
             errors.push(pushError.message);
        }
      }

      if (successCount === 0 && errors.length > 0) {
          // If all failed, return error safely
          throw new AppError("Failed to send notification to any device", 500);
      }

      return new Response(
        JSON.stringify({ success: true, message: `Notification sent to ${successCount} devices` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new AppError(`Unknown action: ${action}`);

  } catch (err: any) {
    // 🛡️ SECURITY: Log full error internally but return generic message to client
    console.error("Push notification error:", err);

    const isAppError = err instanceof AppError || err.name === "AppError";
    const status = isAppError ? err.status : 500;
    const message = isAppError ? err.message : "An unexpected error occurred processing your request.";
    const code = isAppError ? err.code : undefined;

    return new Response(
      JSON.stringify({ error: message, code }),
      { 
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
