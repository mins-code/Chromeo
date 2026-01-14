## 2024-05-24 - Rate Limiting Fail-Closed
**Vulnerability:** Rate limiting logic in Edge Functions would "fail open" if the database check returned an error (e.g. timeout or connection issue), effectively bypassing the limit during outages or attacks.
**Learning:** `supabase.from(...).single()` returns an error if no rows are found, which forces developers to assume *any* error means "no record exists" unless they carefully check error codes. This leads to catching real DB errors as "fresh user".
**Prevention:** Use `.maybeSingle()` which returns `null` for no rows, separating "no data" from "database error". Always explicitly check `error` and return 503 if the rate limiter is down.

## 2024-05-25 - Securing Cron-Triggered Functions
**Vulnerability:** The `notification-scheduler` Edge Function was exposed publicly without authentication, allowing any internet user to trigger the notification dispatch process, leading to potential DoS.
**Learning:** "Cron jobs" in Supabase are just HTTP requests. Unless the target function *explicitly* checks for an Authorization header (usually matching `SUPABASE_SERVICE_ROLE_KEY`), the endpoint is public.
**Prevention:** Always verify `Authorization: Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` for functions intended only for internal scheduling.

## 2024-05-24 - Secure Error Handling Pattern
**Vulnerability:** Edge Functions were returning `error.message` directly to the client in catch blocks, potentially exposing database schema details or internal logic upon unexpected crashes.
**Learning:** `catch(error)` captures everything, including syntax errors or database timeouts. Blindly re-throwing or returning `error.message` is an information leak.
**Prevention:** Implement a custom `AppError` class for trusted, safe-to-expose errors. In the global catch block, check `instanceof AppError`. If true, return the message; otherwise, log the full error and return a generic "Internal Server Error".
