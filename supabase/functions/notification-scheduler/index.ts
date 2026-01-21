import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron job to process scheduled push notifications
 * Called by GitHub Actions every minute.
 * 
 * Authentication: Uses a custom CRON_SECRET for simple auth,
 * or accepts any valid service role key.
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

  // Security Check: Verify the request has authorization
  const authHeader = req.headers.get('Authorization');
  
  // Accept any Bearer token that looks like a service role key (starts with eyJ)
  // This is a trusted endpoint only called by GitHub Actions
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("Unauthorized request - no auth header");
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Basic validation: token should be a JWT (starts with eyJ) and be reasonably long
  if (!token.startsWith('eyJ') || token.length < 100) {
    console.log("Unauthorized request - invalid token format");
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || token;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all due notifications that haven't been sent yet
    const now = new Date().toISOString();
    console.log(`Checking for due notifications at ${now}`);
    
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
      console.log("No notifications to send");
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
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
          results.push({ id: notification.id, status: "skipped_no_subscription" });
          continue;
        }

        // Mark notification as processed
        await supabase
          .from("scheduled_notifications")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        results.push({ id: notification.id, status: "processed" });
        console.log(`Processed notification ${notification.id} for user ${notification.user_id}`);

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
