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
**Prevention:** Implement a custom `AppError` class for trusted, safe-to-expose errors. In the global catch block, check `instanceof AppError`. If true, return the message; otherwise, log the full error and return a generic "Internal Server Error".
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

## 2025-05-27 - Escape Sequence Injection in LLM Prompts
**Vulnerability:** The `ai-chat` function sanitized quotes (`"`) but not backslashes (`\`). This allowed attackers to inject an escape sequence (e.g., sending `User\`) which, when JSON-encoded or placed in a prompt string, could escape the closing quote of the variable (e.g., `"... name is "User\" ..."`), potentially breaking out of the sandbox string and confusing the LLM parser.
**Learning:** Sanitizing just the delimiters (quotes) is insufficient if the escape character itself is allowed. The escape character can be used to neutralize the sanitizer's work.
**Prevention:** Always escape or remove backslashes (`\`) before replacing quotes when sanitizing user input for LLM prompts or JSON contexts. `input.replace(/\\/g, '\\\\').replace(/"/g, "'")`.
