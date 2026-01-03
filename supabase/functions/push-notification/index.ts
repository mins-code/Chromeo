import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Web Push requires these for sending notifications
import webpush from "https://esm.sh/web-push@3.6.6";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🛡️ SECURITY: Verify Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify auth
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.");
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, subscription, notification, taskId } = await req.json();

    // Use the authenticated user's ID
    const userId = user.id;

    // Action: Subscribe - Save push subscription to database
    if (action === "subscribe") {
      if (!subscription) {
        throw new Error("Missing subscription");
      }

      // Upsert subscription (update if exists, insert if new)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: userId,
          subscription: subscription,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subscription saved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Unsubscribe - Remove push subscription
    if (action === "unsubscribe") {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subscription removed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Schedule - Schedule a notification for later
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

    // Action: Cancel - Cancel a scheduled notification
    if (action === "cancel") {
      if (!taskId) {
        throw new Error("Missing taskId");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId); // Ensure user can only delete their own

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Send - Send notification immediately (for testing or from scheduler)
    if (action === "send") {
      if (!notification) {
        throw new Error("Missing notification");
      }

      // Get user's subscription
      const { data: subData, error: subError } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", userId)
        .single();

      if (subError || !subData) {
        throw new Error("User not subscribed to push notifications");
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/logo-dark.jpg",
        badge: "/logo-dark.jpg",
        data: notification.data || {},
      });

      await webpush.sendNotification(subData.subscription, payload);

      return new Response(
        JSON.stringify({ success: true, message: "Notification sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
