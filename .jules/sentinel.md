## 2024-05-24 - Rate Limiting Fail-Closed
**Vulnerability:** Rate limiting logic in Edge Functions would "fail open" if the database check returned an error (e.g. timeout or connection issue), effectively bypassing the limit during outages or attacks.
**Learning:** `supabase.from(...).single()` returns an error if no rows are found, which forces developers to assume *any* error means "no record exists" unless they carefully check error codes. This leads to catching real DB errors as "fresh user".
**Prevention:** Use `.maybeSingle()` which returns `null` for no rows, separating "no data" from "database error". Always explicitly check `error` and return 503 if the rate limiter is down.
