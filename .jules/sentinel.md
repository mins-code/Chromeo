# Sentinel's Journal

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
