# Sentinel's Journal

## 2024-05-25 - Securing Cron-Triggered Functions
**Vulnerability:** The `notification-scheduler` Edge Function was exposed publicly without authentication, allowing any internet user to trigger the notification dispatch process, leading to potential DoS.
**Learning:** "Cron jobs" in Supabase are just HTTP requests. Unless the target function *explicitly* checks for an Authorization header (usually matching `SUPABASE_SERVICE_ROLE_KEY`), the endpoint is public.
**Prevention:** Always verify `Authorization: Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` for functions intended only for internal scheduling.

## 2024-05-26 - Information Leakage via Error Messages
**Vulnerability:** Defaulting to returning `error.message` in API responses exposes internal database errors (like `PostgrestError` details) when unhandled exceptions occur.
**Learning:** Caught exceptions in Edge Functions can contain sensitive schema details (table names, constraints). Treating all errors as user-facing by default (via `JSON.stringify({ error: error.message })`) is insecure.
**Prevention:** Implement a custom `SafeError` class for intentional user-facing errors. In the catch block, only expose messages from `SafeError` instances; mask all other errors as "Internal Server Error".
## 2024-05-26 - Secure Error Handling in Edge Functions
**Vulnerability:** Returning `error.message` directly to the client in a global `catch` block can leak sensitive database information (schema, constraints) or internal stack details if the error originates from an unhandled system failure.
**Learning:** Third-party client libraries (like `supabase-js`) throw error objects that contain implementation details. Blindly forwarding these to the client exposes the system's internals.
**Prevention:** Implement a `SafeError` class for intentional, user-facing validation errors. In the global error handler, check `error instanceof SafeError`: if true, return the message; otherwise, log the full error securely and return a generic "An unexpected error occurred".
## 2024-05-26 - Context Injection in LLMs
**Vulnerability:** The `ai-chat` Edge Function allowed a raw `tagsContext` string to be appended directly to the system prompt. A malicious user (or compromised client) could inject newlines and override system instructions (Prompt Injection) by crafting a malicious context string.
**Learning:** Constructing LLM prompts by concatenating user-provided "context" strings is dangerous. Even with basic sanitization (removing quotes), attackers can use newlines to break out of the context block and issue new system commands.
**Prevention:**
1. Move prompt construction to the server. Accept structured data (e.g., arrays) from the client instead of pre-formatted text strings.
2. Strictly sanitize inputs meant for context: remove newlines and control characters unless absolutely necessary.
3. Use structured "System Instructions" or "Data" blocks clearly delimited from "User Instructions" if the model supports it.
## 2024-05-24 - Secure Error Handling Pattern
**Vulnerability:** Edge Functions were returning `error.message` directly to the client in catch blocks, potentially exposing database schema details or internal logic upon unexpected crashes.
**Learning:** `catch(error)` captures everything, including syntax errors or database timeouts. Blindly re-throwing or returning `error.message` is an information leak.
**Prevention:** Implement a custom `AppError` class for trusted, safe-to-expose errors. In the global catch block, check `instanceof AppError`. If true, return the message; otherwise, log the full error securely and return a generic "Internal Server Error".
## 2024-05-24 - Prompt Injection via Input Formatting
**Vulnerability:** The AI chat function allowed newlines in the `tagsContext` parameter. Malicious users could potentially inject system instructions by formatting tags to look like new system prompts (e.g., `\n\nSYSTEM: ...`).
**Learning:** Client-side formatting (clients adding `\n\n` for aesthetics) can conflict with server-side security hygiene.
**Prevention:** Strictly sanitize input on the server side (disallowing newlines in context fields) even if it means altering the formatting intended by the client. The server must own the prompt structure.
## 2024-05-20 - Rate Limiting Fail-Closed
**Vulnerability:** The rate limiting logic in `ai-chat` initially continued execution even if the database check for the rate limit record failed (e.g., due to connection error).
**Learning:** Security controls must "fail closed". If the control mechanism (rate limiter) is broken, the safe default is to deny access, not grant it.
**Prevention:** In the `if (error)` block of a security check, always `return` or `throw` to stop execution. Never just log and continue.

## 2024-05-21 - Securing Cron-Triggered Functions
**Vulnerability:** Functions like `process-recurring` intended for cron execution were public.
**Learning:** Even "internal" functions on the web are public if they have a URL. Relying on "nobody knows the URL" is security by obscurity.
**Prevention:** Verify the `Authorization` header matches `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` for functions that should only be triggered by the system/cron.

## 2024-05-24 - Edge Function Information Leakage
**Vulnerability:** Supabase Edge Functions were catching all errors and returning `error.message` directly to the client in the JSON response.
**Learning:** This "Fail Closed" but "Talkative" approach violates the Principle of Least Information. While it helps debugging, it exposes internal state (like "VAPID keys not configured" or database connection strings if they bubble up) to end users.
**Prevention:** Always implement a top-level `catch` block that logs the full error to `console.error` (which goes to Supabase logs) but returns a generic "An unexpected error occurred" message to the HTTP client. Use a specific error code if the client needs to react differently, but never pass through the raw exception message.

## 2026-01-20 - Account Deletion Token Leak
**Vulnerability:** The account deletion confirmation token was returned directly in the HTTP response body to the client, allowing instant account deletion without email access.
**Learning:** Security workarounds for infrastructure limitations (like broken email) often introduce critical vulnerabilities. "Temporary" hacks in dev environments can be dangerous if they expose sensitive tokens.
**Prevention:** Never return authentication or verification tokens in API responses. Always use out-of-band channels (email, SMS) or server-side logs (for dev) to deliver secrets.
## 2025-05-27 - Escape Sequence Injection in LLM Prompts
**Vulnerability:** The `ai-chat` function sanitized quotes (`"`) but not backslashes (`\`). This allowed attackers to inject an escape sequence (e.g., sending `User\`) which, when JSON-encoded or placed in a prompt string, could escape the closing quote of the variable (e.g., `"... name is "User\" ..."`), potentially breaking out of the sandbox string and confusing the LLM parser.
**Learning:** Sanitizing just the delimiters (quotes) is insufficient if the escape character itself is allowed. The escape character can be used to neutralize the sanitizer's work.
**Prevention:** Always escape or remove backslashes (`\`) before replacing quotes when sanitizing user input for LLM prompts or JSON contexts. `input.replace(/\\/g, '\\\\').replace(/"/g, "'")`.

## 2025-05-27 - Hardening Content Security Policy
**Vulnerability:** The application's CSP included `'unsafe-eval'`, which significantly weakens protection against XSS attacks by allowing string execution. It also whitelisted `https://cdn.jsdelivr.net`, which allows loading arbitrary scripts from a public CDN.
**Learning:** Default or copied CSP configurations often include `'unsafe-eval'` for compatibility, but modern React applications (especially with Vite) do not require it in production. Broad CDN whitelists undermine CSP effectiveness.
**Prevention:**
1. Remove `'unsafe-eval'` from `script-src` to prevent arbitrary code execution.
2. Remove broad CDN whitelists (`cdn.jsdelivr.net`) and use specific sources (like `esm.sh`) or strictly `self`.
3. Add `object-src 'none'` to prevent Flash/Java applet injection.

## 2025-05-27 - Rate Limiting Race Condition (TOCTOU)
**Vulnerability:** Rate limiting in `ai-chat` and `account-deletion` edge functions was implemented using a "Read-Check-Write" pattern. High-concurrency requests could exploit this race condition (Time-of-Check to Time-of-Use) to bypass limits, as multiple requests could read the same "under limit" count before any write occurred.
**Learning:** Database constraints or atomic operations are required for robust rate limiting. Application-level checks without locking are insufficient for enforcing strict quotas.
**Prevention:** Use atomic Database RPC functions (like `increment_rate_limit` with `ON CONFLICT DO UPDATE`) to handle the check-and-increment logic in a single transaction, ensuring strict serialization of counter updates.

## 2025-05-27 - Loose Token Validation in Edge Functions
**Vulnerability:** The `notification-scheduler` function allowed any user with a valid JWT to trigger the notification process because it only validated the token format (`startsWith('eyJ')`) and used a fallback key from the request if the environment variable wasn't matched.
**Learning:** Validating that a token *exists* and *looks like* a JWT is not the same as validating *authorization*. Using a fallback like `Deno.env.get('KEY') || token` essentially allows the user-provided token to bypass the requirement for the environment key if the logic isn't strict.
**Prevention:** For system-only functions, strictly compare `req.headers.get('Authorization')` against `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`. Do not accept user tokens as a fallback.
## 2026-01-25 - Notification Scheduler Auth Bypass
**Vulnerability:** The `notification-scheduler` Edge Function used a weak validation check (`startsWith('eyJ')`) for the Authorization header, allowing unauthorized users to trigger the notification dispatch process.
**Learning:** Checking for the *format* of a token is not authentication. Any string can be made to look like a JWT.
**Prevention:** For service-to-service or cron-triggered functions, strictly validate that the `Authorization` header matches `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`.

## 2026-01-28 - Timing Attacks on Auth Tokens
**Vulnerability:** The `notification-scheduler` used a standard string comparison (`!==`) to validate the Service Role Key. This is vulnerable to timing attacks, where an attacker can deduce the key byte-by-byte by measuring the response time of the function.
**Learning:** Standard string comparisons fail early on mismatch. `crypto.subtle` in Web Crypto API lacks `timingSafeEqual`, requiring careful implementation in Deno/Edge environments.
**Prevention:** Use a constant-time comparison algorithm. A portable approach is to hash both the input and the secret (e.g., SHA-256) and then compare the hashes using a bitwise constant-time loop.
## 2024-05-28 - Secure Web Push Notifications
**Vulnerability:** The `push-notification` Edge Function attempted to send encrypted Web Push notifications by manually setting `Content-Encoding: aes128gcm` on a plain JSON payload. This resulted in either unencrypted transmission (privacy leak) or client-side decryption failure (functional breakage).
**Learning:** Web Push encryption (AES128GCM) is complex to implement manually. Using standard libraries like `web-push` ensures compliance with the protocol and proper encryption of sensitive payloads.
**Prevention:** Avoid rolling custom crypto or manual implementation of complex security protocols. Use established, audited libraries (e.g., `web-push` via `esm.sh`) for security-critical tasks like notification encryption.
## 2025-05-27 - IDOR via Service Role Client
**Vulnerability:** The `push-notification` Edge Function utilized a Service Role client (which bypasses RLS) to perform `upsert` operations on the `scheduled_notifications` table. This allowed any authenticated user to overwrite a notification scheduled by another user by guessing the `task_id` (since `task_id` is unique and the `upsert` updated the existing record regardless of ownership).
**Learning:** When using administrative/service-role clients in serverless functions to bypass some restrictions (like subscription checks), you essentially disable the database's security layer (RLS). You must manually re-implement ownership checks in your application logic.
**Prevention:**
1. Prefer using a user-scoped client (passed with the user's JWT) for user-initiated actions so RLS policies are enforced.
2. If a Service Role client is necessary, explicitly query and verify ownership of the resource (`user_id` match) before performing updates or deletes.

## 2026-01-29 - Account Deletion Token Leak in Pending Request
**Vulnerability:** When a user with a pending account deletion request tried to request deletion again, the API returned the existing confirmation token (hash) and constructed URL in the JSON response.
**Learning:** Inconsistent security logic across different states of the same workflow (new request vs. pending request) can leave gaps. Developers might secure the "happy path" but forget edge cases.
**Prevention:** Ensure that sensitive data (tokens, secrets) is NEVER returned to the client in any state. Audit all exit points of an API function, not just the main success path.

## 2026-01-30 - DoS and Data Integrity in Batch Processing
**Vulnerability:** The `process-recurring` function iterated over recurring items without a try/catch block for individual items. A single malformed record (e.g., invalid date) would crash the entire function (DoS). Additionally, the logic updated the "next due date" *after* insertion without checking for errors; if the update failed, the next run would duplicate the insertion (Infinite Loop).
**Learning:** Batch processing systems must be resilient to partial failures ("Poison Pills"). Also, when "check-then-act" or "insert-then-update" patterns are used without database transactions, the code must handle the "middle state" failure scenario explicitly.
**Prevention:**
1. Wrap each item in a loop with its own `try/catch` block.
2. Calculate derived values (like dates) *before* performing any side effects (inserts).
3. Explicitly handle errors in secondary operations (updates) and log them as critical integrity risks.

## 2026-02-01 - SSRF Protection via Domain Whitelisting
**Vulnerability:** The `push-notification` function relied on a blacklist to prevent Server-Side Request Forgery (SSRF), blocking `localhost` and some private IPs. This allowed attackers to potentially target other internal services or arbitrary external endpoints by using unblocked private ranges or DNS rebinding.
**Learning:** Blacklists are inherently incomplete. Security controls based on "what is known bad" often fail against novel or obscure vectors.
**Prevention:** Use a whitelist of "known good" values whenever possible. For Web Push, restricting endpoints to a small list of trusted browser vendors (Google, Mozilla, Apple, Microsoft) eliminates the risk of SSRF without compromising functionality.
## 2025-05-28 - Prompt Injection via Conversation History
**Vulnerability:** The `ai-chat` Edge Function constructed the conversation history for the LLM by directly trusting the content of previous messages provided by the client. A malicious user could craft a request with a fake "model" message containing instructions to ignore previous rules or reveal secrets, effectively forging the conversation context.
**Learning:** LLMs treat the entire context window (including "history") as ground truth. If the application blindly trusts the client to provide the history, the client can rewrite the "past" to influence the "future" behavior of the model.
**Prevention:**
1. Treat conversation history as untrusted user input.
2. Sanitize the content of *all* messages in the history, not just the current message.
3. Ideally, store conversation history on the server and retrieve it by session ID, rather than accepting it from the client (though this requires stateful backend). If client-side history is necessary, it must be strictly validated and sanitized.
## 2026-02-21 - IDOR in Notification Scheduling
**Vulnerability:** The `push-notification` Edge Function used a `service_role` client to schedule notifications. It allowed any authenticated user to schedule a notification for ANY task ID, regardless of ownership. Since notifications are unique per task, this allowed an attacker to "lock" the notification slot for a victim's task, preventing the victim from scheduling their own notification (DoS).
**Learning:** Using `service_role` clients in user-facing functions bypasses RLS. You cannot rely on "implied" permissions.
**Prevention:** Always verify resource ownership (e.g., `task.user_id === userId`) explicitly when performing operations on behalf of a user using a privileged client.
## 2026-05-12 - Incomplete Account Deletion
**Vulnerability:** The account deletion edge function failed to delete user data from recently added tables (`notes`, `note_shares`, `day_plans`) and tables lacking a direct `user_id` column (`partnerships`, `note_shares` shared with others). This resulted in orphaned personal data remaining in the database after a user deleted their account, violating GDPR and data privacy expectations.
**Learning:** Hardcoded arrays of tables to delete in application logic are brittle and prone to becoming outdated as the database schema evolves. Tables with non-standard foreign keys (e.g., `owner_id`, `user_id_1`) are easily missed.
**Prevention:**
1. Use foreign keys with `ON DELETE CASCADE` referencing the core `profiles` or `auth.users` tables wherever possible to handle automatic data cleanup at the database level.
2. When manual deletion is necessary, ensure all table dependencies and non-standard foreign keys are explicitly handled in both password-based and token-based deletion flows.
