import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      throw new Error("Missing authorization header");
    }

    // Create client with user's token to verify auth
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, token } = await req.json();
    const appUrl = Deno.env.get("APP_URL") || "https://chronodex.vercel.app";

    // Action: Request deletion - sends confirmation email
    if (action === "request") {
      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from("account_deletion_requests")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        // If request exists and not expired, inform user
        const expiresAt = new Date(existingRequest.expires_at);
        if (expiresAt > new Date()) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "A deletion request is already pending. Please check your email.",
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

      if (insertError) throw insertError;

      // Build confirmation URL
      const confirmationUrl = `${appUrl}/confirm-delete?token=${confirmToken}`;
      console.log(`Deletion confirmation URL for ${user.email}: ${confirmationUrl}`);

      // Send confirmation email using Brevo (formerly Sendinblue)
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      let emailSent = false;
      
      if (brevoApiKey) {
        try {
          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "Chromeo", email: "noreply@chromeo.app" },
              to: [{ email: user.email }],
              subject: "Confirm Account Deletion - Chromeo",
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #dc2626;">Account Deletion Request</h1>
                  <p>Hello,</p>
                  <p>We received a request to delete your Chromeo account. If you made this request, click the button below to confirm:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" 
                       style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Confirm Account Deletion
                    </a>
                  </div>
                  <p><strong>This link will expire in 24 hours.</strong></p>
                  <p>If you didn't request this, you can safely ignore this email. Your account will remain active.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 12px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${confirmationUrl}" style="color: #3b82f6;">${confirmationUrl}</a>
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
            console.log("Confirmation email sent successfully via Brevo");
          } else {
            const errorData = await emailResponse.text();
            console.error("Brevo email error:", errorData);
          }
        } catch (emailErr) {
          console.error("Failed to send email via Brevo:", emailErr);
        }
      } else {
        console.log("BREVO_API_KEY not configured - email not sent");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: emailSent 
            ? "Deletion request created. Please check your email to confirm."
            : "Deletion request created. Email could not be sent - please contact support.",
          emailSent,
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
        throw new Error("No pending deletion request found. Please create a new request.");
      }

      // Check if expired
      const expiresAt = new Date(existingRequest.expires_at);
      if (expiresAt < new Date()) {
        await supabase
          .from("account_deletion_requests")
          .update({ status: "expired" })
          .eq("id", existingRequest.id);
        throw new Error("Previous request has expired. Please create a new request.");
      }

      // Resend the email
      const confirmationUrl = `${appUrl}/confirm-delete?token=${existingRequest.token}`;
      console.log(`Resending deletion confirmation URL for ${user.email}: ${confirmationUrl}`);

      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      let emailSent = false;
      
      if (brevoApiKey) {
        try {
          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "Chromeo", email: "noreply@chromeo.app" },
              to: [{ email: user.email }],
              subject: "Confirm Account Deletion - Chromeo (Resent)",
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #dc2626;">Account Deletion Request</h1>
                  <p>Hello,</p>
                  <p>We received a request to delete your Chromeo account. If you made this request, click the button below to confirm:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" 
                       style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Confirm Account Deletion
                    </a>
                  </div>
                  <p><strong>This link will expire at ${expiresAt.toLocaleString()}.</strong></p>
                  <p>If you didn't request this, you can safely ignore this email. Your account will remain active.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 12px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${confirmationUrl}" style="color: #3b82f6;">${confirmationUrl}</a>
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
            console.log("Confirmation email resent successfully via Brevo");
          } else {
            const errorData = await emailResponse.text();
            console.error("Brevo email error:", errorData);
            // Return the actual error for debugging
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Email service error: ${errorData}`,
                emailSent: false
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (emailErr) {
          console.error("Failed to resend email via Brevo:", emailErr);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Email error: ${emailErr}`,
              emailSent: false
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.log("BREVO_API_KEY not configured - email not sent");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: emailSent 
            ? "Confirmation email has been resent. Please check your inbox."
            : "Could not send email. RESEND_API_KEY not configured.",
          emailSent,
          expiresAt: existingRequest.expires_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Confirm deletion - actually deletes the account
    if (action === "confirm") {
      if (!token) {
        throw new Error("Missing confirmation token");
      }

      // Find the deletion request
      const { data: request, error: findError } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (findError || !request) {
        throw new Error("Invalid or expired deletion token");
      }

      // Check if expired
      if (new Date(request.expires_at) < new Date()) {
        await supabase
          .from("account_deletion_requests")
          .update({ status: "expired" })
          .eq("id", request.id);
        throw new Error("Deletion token has expired. Please request a new one.");
      }

      // Verify the token is for the current user
      if (request.user_id !== user.id) {
        throw new Error("Token does not match current user");
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
        throw new Error("Failed to delete account. Please contact support.");
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

      if (cancelError) throw cancelError;

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

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
