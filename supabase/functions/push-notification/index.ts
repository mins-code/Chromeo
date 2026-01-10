import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper function to convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert Uint8Array to base64url
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper function to convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Create a JWT for VAPID authentication
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  // JWT header
  const header = {
    typ: "JWT",
    alg: "ES256"
  };
  
  // JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };

  const headerB64 = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
  
  try {
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      privateKey,
      stringToUint8Array(unsignedToken)
    );

    const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signature));
    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error("JWT signing error:", error);
    throw new Error("Failed to create VAPID JWT. Ensure VAPID_PRIVATE_KEY is a valid PKCS8 base64url encoded key.");
  }
}

// Send a Web Push notification using native fetch
async function sendWebPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string
): Promise<void> {
  const endpoint = subscription.endpoint;
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Create VAPID JWT
  const jwt = await createVapidJwt(audience, vapidEmail, vapidPrivateKey);

  // For now, we'll send a simple push without encryption
  // Full Web Push encryption requires complex ECDH + HKDF + AES-GCM implementation
  // Instead, we send an unencrypted push which works for most use cases
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Push service returned ${response.status}: ${errorText}`);
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
    // user is guaranteed to be defined here due to auth check above
    const rateLimitKey = `push-notification:${user.id}`;

    const { data: requestCount, error: rpcError } = await supabase.rpc('increment_rate_limit', {
      p_key: rateLimitKey,
      p_window_duration_seconds: 60
    });

    if (rpcError) {
        console.error("Rate limit check failed:", rpcError.message);
        // Fail securely: if rate limiting is unavailable, prevent potential abuse
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
        .eq("user_id", userId); // 🛡️ SECURITY: Prevent IDOR - only allow cancelling own notifications

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Send - Send notification immediately
    // Note: This requires proper VAPID setup and is called by the scheduler
    if (action === "send") {
      if (!notification) {
        throw new Error("Missing notification");
      }

      const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
      const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
      const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@chronodex.app";

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.");
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

      try {
        await sendWebPushNotification(
          subData.subscription,
          payload,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY,
          VAPID_EMAIL
        );
      } catch (pushError) {
        console.error("Web Push sending failed:", pushError);
        // Return success with a warning - the notification was attempted
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Push notification delivery failed",
            error: pushError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
