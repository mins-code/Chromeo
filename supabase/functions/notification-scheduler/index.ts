import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.6";

/**
 * Robust constant-time comparison using hashing to prevent timing attacks.
 * Compares SHA-256 hashes of inputs to avoid length leakage and content-based timing differences.
 */
async function safeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  const aHash = await crypto.subtle.digest("SHA-256", aBuf);
  const bHash = await crypto.subtle.digest("SHA-256", bBuf);

  // Compare hashes byte-by-byte in constant time
  const aView = new DataView(aHash);
  const bView = new DataView(bHash);

  let mismatch = 0;
  for (let i = 0; i < aView.byteLength; i++) {
    mismatch |= aView.getUint8(i) ^ bView.getUint8(i);
  }

  return mismatch === 0;
}

/**
 * Cron job to process scheduled push notifications
 * Called by GitHub Actions every minute.
 * 
 * MULTI-DEVICE SUPPORT: Sends notifications to ALL devices registered by the user
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

  // Security Check: Verify the request has authorization from the Service Role (Cron/GitHub Actions)
  const authHeader = req.headers.get('Authorization');
  
  // 🛡️ SECURITY: Strictly verify the Service Role Key for Cron/System calls
  // Use constant-time comparison to prevent timing attacks
  const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  const authorized = await safeCompare(authHeader || '', expectedAuth);

  if (!authorized) {
    console.log("Unauthorized request - invalid service role key");
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader!.replace('Bearer ', '');

  try {
    // Setup VAPID for web push
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("VAPID keys not configured!");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // 🛡️ SECURITY: Use the Service Role Key explicitly since we verified it
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      .lte("scheduled_at", now)
      .limit(50); // 🛡️ SECURITY: Limit batch size to prevent DoS/timeout

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

    const results: Array<{ id: string; status: string; devices: number; errors?: string[] }> = [];

    for (const notification of dueNotifications) {
      try {
        // Get ALL push subscriptions for this user (multi-device support!)
        const { data: subscriptions, error: subError } = await supabase
          .from("push_subscriptions")
          .select("id, subscription, platform, fcm_token")
          .eq("user_id", notification.user_id);

        if (subError) {
          console.error(`Error fetching subscriptions for user ${notification.user_id}:`, subError);
          results.push({ id: notification.id, status: "error", devices: 0, errors: [subError.message] });
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No subscriptions for user ${notification.user_id}, marking as sent`);
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notification.id);
          results.push({ id: notification.id, status: "skipped_no_subscription", devices: 0 });
          continue;
        }

        console.log(`Found ${subscriptions.length} device(s) for user ${notification.user_id}`);

        // Prepare push payload
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: "/logo-dark.jpg",
          badge: "/logo-dark.jpg",
          tag: `task-${notification.task_id || notification.id}`,
          data: {
            taskId: notification.task_id,
            url: "/activities",
          },
        });

        const deviceErrors: string[] = [];
        let successfulDevices = 0;

        // Send to ALL devices
        for (const sub of subscriptions) {
          try {
            if (sub.subscription && sub.platform === 'web') {
              // Web Push notification
              await webpush.sendNotification(sub.subscription, payload);
              successfulDevices++;
              console.log(`✓ Sent to web device ${sub.id}`);
              
              // Update last_active timestamp
              await supabase
                .from("push_subscriptions")
                .update({ last_active: new Date().toISOString() })
                .eq("id", sub.id);
            } else if (sub.fcm_token && (sub.platform === 'android' || sub.platform === 'ios')) {
              // FCM for native apps - would need additional implementation
              console.log(`FCM notification for ${sub.platform} device ${sub.id} - not yet implemented`);
              // TODO: Implement FCM sending when Firebase is configured
            }
          } catch (pushError: unknown) {
            const errorMsg = pushError instanceof Error ? pushError.message : String(pushError);
            console.error(`Failed to send to device ${sub.id}:`, errorMsg);
            deviceErrors.push(`Device ${sub.id}: ${errorMsg}`);

            // If subscription is invalid (410 Gone), remove it
            if (pushError && typeof pushError === 'object' && 'statusCode' in pushError) {
              const statusCode = (pushError as { statusCode: number }).statusCode;
              if (statusCode === 410) {
                console.log(`Removing expired subscription ${sub.id}`);
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("id", sub.id);
              }
            }
          }
        }

        // Mark notification as sent
        await supabase
          .from("scheduled_notifications")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        results.push({ 
          id: notification.id, 
          status: successfulDevices > 0 ? "sent" : "failed",
          devices: successfulDevices,
          errors: deviceErrors.length > 0 ? deviceErrors : undefined
        });
        
        console.log(`Notification ${notification.id}: sent to ${successfulDevices}/${subscriptions.length} devices`);

      } catch (processError: unknown) {
        const errorMessage = processError instanceof Error ? processError.message : String(processError);
        console.error(`Failed to process notification ${notification.id}:`, processError);
        results.push({ id: notification.id, status: "error", devices: 0, errors: [errorMessage] });
      }
    }

    const totalSent = results.filter(r => r.status === "sent").length;
    const totalDevices = results.reduce((acc, r) => acc + r.devices, 0);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${dueNotifications.length} notifications, sent to ${totalDevices} devices`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Notification scheduler error:", error);
    // 🛡️ SECURITY: Log detailed error but don't leak it to client
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
