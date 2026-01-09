import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.6";

/**
 * Cron job to send scheduled push notifications
 * This function requires authentication via the Service Role Key.
 * It uses the service role key to access the database securely.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Security Check: Ensure the request is authorized
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all due notifications that haven't been sent yet
    const now = new Date().toISOString();
    const { data: dueNotifications, error: fetchError } = await supabase
      .from("scheduled_notifications")
      .select(`
        id,
        user_id,
        task_id,
        title,
        body,
        scheduled_at
      `)
      .eq("sent", false)
      .lte("scheduled_at", now);

    if (fetchError) throw fetchError;

    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to send", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${dueNotifications.length} due notifications`);

    const results = [];

    for (const notification of dueNotifications) {
      try {
        // Get user's push subscription
        const { data: subData, error: subError } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("user_id", notification.user_id)
          .single();

        if (subError || !subData) {
          console.log(`No subscription for user ${notification.user_id}, skipping`);
          // Mark as sent anyway to avoid retry loops
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
          continue;
        }

        // Send push notification
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: "/logo-dark.jpg",
          badge: "/logo-dark.jpg",
          data: {
            taskId: notification.task_id,
            url: "/activities",
          },
        });

        await webpush.sendNotification(subData.subscription, payload);

        // Mark notification as sent
        await supabase
          .from("scheduled_notifications")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        results.push({ id: notification.id, status: "sent" });
        console.log(`Sent notification ${notification.id} to user ${notification.user_id}`);

      } catch (sendError) {
        console.error(`Failed to send notification ${notification.id}:`, sendError);
        
        // If subscription is invalid (gone), remove it
        if (sendError.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", notification.user_id);
          
          // Mark notification as sent to avoid retry
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
        }
        
        results.push({ id: notification.id, status: "failed", error: sendError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${dueNotifications.length} notifications`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Notification scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
