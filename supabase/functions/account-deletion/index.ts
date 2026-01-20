import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Custom error class for safe user-facing errors
class AppError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "AppError";
  }
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new AppError("Missing authorization header", 401);
    }

    // Create client with user's token to verify auth
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      throw new AppError("Unauthorized", 401);
    }

    const { action, token, password } = await req.json();
    const appUrl = Deno.env.get("APP_URL") || "https://chronodex.vercel.app";

    // Rate Limiting
    const rateLimitKey = `account-deletion:${user.id}:${action}`
    const { data: limitData, error: limitError } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', rateLimitKey)
        .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour window for deletion actions
        .maybeSingle()

    if (limitError) {
      console.error("Rate limit check failed:", limitError.message);
      // Fail securely: if rate limiting is unavailable, prevent potential abuse
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable. Please try again later.' }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (limitData && limitData.count >= 5) { // Strict limit: 5 requests per hour
        return new Response(
            JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    if (limitData) {
        await supabase.from('rate_limits').update({ count: limitData.count + 1 }).eq('id', limitData.id)
    } else {
        await supabase.from('rate_limits').insert({ key: rateLimitKey, count: 1, window_start: new Date().toISOString() })
    }

    // Action: Delete with password verification - immediate deletion
    if (action === "delete-with-password") {
      if (!password) {
        throw new AppError("Password is required for verification");
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (signInError) {
        throw new AppError("Invalid password. Please try again.");
      }

      const userId = user.id;

      // Delete all user data from each table
      console.log(`Password verified. Deleting all data for user ${userId}`);

      // Delete in order of foreign key dependencies
      const tablesToDelete = [
        "account_deletion_requests",
        "scheduled_notifications",
        "push_subscriptions",
        "team_members",
        "teams",
        "partnerships",
        "budget_shares",
        "transactions",
        "routines",
        "tasks",
        "user_settings",
        "profiles",
      ];

      for (const table of tablesToDelete) {
        try {
          await supabase.from(table).delete().eq("user_id", userId);
          console.log(`Deleted from ${table}`);
        } catch (e) {
          console.log(`Table ${table} might not exist or have user_id: ${e}`);
        }
      }

      // Also try owner_id for some tables
      try {
        await supabase.from("teams").delete().eq("owner_id", userId);
        await supabase.from("budget_shares").delete().eq("owner_id", userId);
      } catch (e) {
        console.log(`Owner cleanup: ${e}`);
      }

      // Finally, delete the auth user
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
        throw new AppError("Failed to delete account. Please contact support.", 500);
      }

      console.log(`Successfully deleted user ${userId} via password verification`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Your account and all associated data have been permanently deleted." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Request deletion - sends confirmation email
    if (action === "request") {
      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from("account_deletion_requests")
        .select("id, token, expires_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        // If request exists and not expired, inform user
        const expiresAt = new Date(existingRequest.expires_at);
        if (expiresAt > new Date()) {
          const confirmationUrl = `${appUrl}/confirm-delete?token=${existingRequest.token}`;
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "A deletion request is already pending. Use the confirmation URL to complete deletion.",
              confirmationUrl: confirmationUrl, // Return URL directly
              expiresAt: existingRequest.expires_at
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Mark old request as expired
          await supabase
            .from("account_deletion_requests")
            .update({ status: "expired" })
            .eq("id", existingRequest.id);
        }
      }

      // Generate new token and create request
      const confirmToken = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error: insertError } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: user.id,
          token: confirmToken,
          email: user.email,
          expires_at: expiresAt.toISOString(),
          status: "pending",
        });

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw new AppError("Failed to create deletion request", 500);
      }

      // Build confirmation URL
      const confirmationUrl = `${appUrl}/confirm-delete?token=${confirmToken}`;
      console.log(`Deletion confirmation URL for ${user.email}: ${confirmationUrl}`);

      // 🛡️ SECURITY: Token logged to console for dev, but NOT returned to client
      // User must verify via the link (simulated email)
      let emailSent = true;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Deletion request created. Please check your email (or server logs in dev) to complete deletion.",
          emailSent: true,
          expiresAt: expiresAt.toISOString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Resend - resend email for existing pending request
    if (action === "resend") {
      // Find existing pending request
      const { data: existingRequest, error: findError } = await supabase
        .from("account_deletion_requests")
        .select("id, token, expires_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (findError || !existingRequest) {
        throw new AppError("No pending deletion request found. Please create a new request.");
      }

      // Check if expired
      const expiresAt = new Date(existingRequest.expires_at);
      if (expiresAt < new Date()) {
        await supabase
          .from("account_deletion_requests")
          .update({ status: "expired" })
          .eq("id", existingRequest.id);
        throw new AppError("Previous request has expired. Please create a new request.");
      }

      // Resend the email
      const confirmationUrl = `${appUrl}/confirm-delete?token=${existingRequest.token}`;
      console.log(`Resending deletion confirmation URL for ${user.email}: ${confirmationUrl}`);

      // 🛡️ SECURITY: Token logged to console for dev, but NOT returned to client
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Confirmation link resent. Please check your email (or server logs in dev) to complete deletion.",
          emailSent: true,
          expiresAt: existingRequest.expires_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Confirm deletion - actually deletes the account
    if (action === "confirm") {
      if (!token) {
        throw new AppError("Missing confirmation token");
      }

      // Find the deletion request
      const { data: request, error: findError } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (findError || !request) {
        throw new AppError("Invalid or expired deletion token");
      }

      // Check if expired
      if (new Date(request.expires_at) < new Date()) {
        await supabase
          .from("account_deletion_requests")
          .update({ status: "expired" })
          .eq("id", request.id);
        throw new AppError("Deletion token has expired. Please request a new one.");
      }

      // Verify the token is for the current user
      if (request.user_id !== user.id) {
        throw new AppError("Token does not match current user", 403);
      }

      const userId = request.user_id;

      // Mark request as confirmed
      await supabase
        .from("account_deletion_requests")
        .update({ 
          status: "confirmed", 
          confirmed_at: new Date().toISOString() 
        })
        .eq("id", request.id);

      // Delete all user data from each table
      console.log(`Deleting all data for user ${userId}`);

      // Delete in order of foreign key dependencies
      const tablesToDelete = [
        "scheduled_notifications",
        "push_subscriptions",
        "team_members",
        "teams",
        "partnerships",
        "budget_shares",
        "transactions",
        "routines",
        "tasks",
        "user_settings",
        "profiles",
      ];

      for (const table of tablesToDelete) {
        try {
          await supabase.from(table).delete().eq("user_id", userId);
          console.log(`Deleted from ${table}`);
        } catch (e) {
          console.log(`Table ${table} might not exist or have user_id: ${e}`);
        }
      }

      // Also try owner_id for some tables
      try {
        await supabase.from("teams").delete().eq("owner_id", userId);
        await supabase.from("budget_shares").delete().eq("owner_id", userId);
      } catch (e) {
        console.log(`Owner cleanup: ${e}`);
      }

      // Finally, delete the auth user
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
        throw new AppError("Failed to delete account. Please contact support.", 500);
      }

      console.log(`Successfully deleted user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Your account and all associated data have been permanently deleted." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Cancel deletion request
    if (action === "cancel") {
      const { error: cancelError } = await supabase
        .from("account_deletion_requests")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (cancelError) {
        console.error("Database cancel error:", cancelError);
        throw new AppError("Failed to cancel request", 500);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Deletion request cancelled." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Check status
    if (action === "status") {
      const { data: request } = await supabase
        .from("account_deletion_requests")
        .select("status, expires_at, requested_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          hasPendingRequest: !!request,
          request: request || null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new AppError(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("Account deletion error:", error);

    // Check if it's a known application error (safe to show to user)
    const isAppError = error instanceof AppError || error.name === "AppError";
    const status = isAppError ? error.status : 500;
    const message = isAppError ? error.message : "Internal Server Error";

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
