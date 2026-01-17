## 2024-05-24 - Rate Limiting Fail-Closed
**Vulnerability:** Rate limiting logic in Edge Functions would "fail open" if the database check returned an error (e.g. timeout or connection issue), effectively bypassing the limit during outages or attacks.
**Learning:** `supabase.from(...).single()` returns an error if no rows are found, which forces developers to assume *any* error means "no record exists" unless they carefully check error codes. This leads to catching real DB errors as "fresh user".
**Prevention:** Use `.maybeSingle()` which returns `null` for no rows, separating "no data" from "database error". Always explicitly check `error` and return 503 if the rate limiter is down.

## 2024-05-25 - Securing Cron-Triggered Functions
**Vulnerability:** The `notification-scheduler` Edge Function was exposed publicly without authentication, allowing any internet user to trigger the notification dispatch process, leading to potential DoS.
**Learning:** "Cron jobs" in Supabase are just HTTP requests. Unless the target function *explicitly* checks for an Authorization header (usually matching `SUPABASE_SERVICE_ROLE_KEY`), the endpoint is public.
**Prevention:** Always verify `Authorization: Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` for functions intended only for internal scheduling.

## 2024-05-26 - Information Leakage via Error Messages
**Vulnerability:** Defaulting to returning `error.message` in API responses exposes internal database errors (like `PostgrestError` details) when unhandled exceptions occur.
**Learning:** Caught exceptions in Edge Functions can contain sensitive schema details (table names, constraints). Treating all errors as user-facing by default (via `JSON.stringify({ error: error.message })`) is insecure.
**Prevention:** Implement a custom `SafeError` class for intentional user-facing errors. In the catch block, only expose messages from `SafeError` instances; mask all other errors as "Internal Server Error".
