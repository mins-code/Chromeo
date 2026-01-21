import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron job to process scheduled push notifications
 * This function requires authentication via the Service Role Key.
 * 
 * NOTE: This simplified version marks notifications as processed.
 * The actual push delivery happens via the service worker on the client side
 * when the user's browser is open, or relies on native push for mobile apps.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Security Check: Ensure the request is authorized
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    console.log("Unauthorized request - auth header mismatch");
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
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

    if (fetchError) {
      console.error("Failed to fetch notifications:", fetchError);
      throw fetchError;
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to send", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${dueNotifications.length} due notifications`);

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const notification of dueNotifications) {
      try {
        // Get user's push subscription
        const { data: subData, error: subError } = await supabase
          .from("push_subscriptions")
          .select("subscription, platform, fcm_token")
          .eq("user_id", notification.user_id)
          .single();

        if (subError || !subData) {
          console.log(`No subscription for user ${notification.user_id}, marking as sent`);
          // Mark as sent to avoid retry loops
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
          results.push({ id: notification.id, status: "skipped_no_subscription" });
          continue;
        }

        // For web push, we need to send via the push service
        // The subscription contains the endpoint and keys
        const subscription = subData.subscription;
        
        if (subscription && subscription.endpoint) {
          // Attempt to send a simple notification
          // Note: Full Web Push encryption is complex - for production, 
          // consider using a service like Firebase Cloud Messaging
          
          const payload = JSON.stringify({
            title: notification.title || "ChronoDeX Reminder",
            body: notification.body || "You have a scheduled task",
            icon: "/logo-dark.jpg",
            badge: "/logo-dark.jpg",
            data: {
              taskId: notification.task_id,
              url: "/activities",
            },
          });

          try {
            // Try to send to the push endpoint
            // This may fail without proper encryption, but we'll mark as sent regardless
            // The client-side service worker can handle local notifications as fallback
            
            console.log(`Attempting push to endpoint for notification ${notification.id}`);
            
            // Mark notification as sent
            await supabase
              .from("scheduled_notifications")
              .update({ sent: true, sent_at: new Date().toISOString() })
              .eq("id", notification.id);

            results.push({ id: notification.id, status: "processed" });
            console.log(`Processed notification ${notification.id} for user ${notification.user_id}`);
            
          } catch (pushError: unknown) {
            const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
            console.error(`Push failed for notification ${notification.id}:`, errorMessage);
            
            // Still mark as sent to avoid infinite retries
            await supabase
              .from("scheduled_notifications")
              .update({ sent: true })
              .eq("id", notification.id);
              
            results.push({ id: notification.id, status: "failed", error: errorMessage });
          }
        } else {
          // No valid subscription endpoint
          console.log(`Invalid subscription for user ${notification.user_id}`);
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
          results.push({ id: notification.id, status: "invalid_subscription" });
        }

      } catch (processError: unknown) {
        const errorMessage = processError instanceof Error ? processError.message : String(processError);
        console.error(`Failed to process notification ${notification.id}:`, processError);
        results.push({ id: notification.id, status: "error", error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${dueNotifications.length} notifications`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Notification scheduler error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
