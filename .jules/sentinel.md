## 2024-05-24 - Rate Limiting Fail-Closed
**Vulnerability:** Rate limiting logic in Edge Functions would "fail open" if the database check returned an error (e.g. timeout or connection issue), effectively bypassing the limit during outages or attacks.
**Learning:** `supabase.from(...).single()` returns an error if no rows are found, which forces developers to assume *any* error means "no record exists" unless they carefully check error codes. This leads to catching real DB errors as "fresh user".
**Prevention:** Use `.maybeSingle()` which returns `null` for no rows, separating "no data" from "database error". Always explicitly check `error` and return 503 if the rate limiter is down.

## 2024-05-25 - Securing Cron-Triggered Functions
**Vulnerability:** The `notification-scheduler` Edge Function was exposed publicly without authentication, allowing any internet user to trigger the notification dispatch process, leading to potential DoS.
**Learning:** "Cron jobs" in Supabase are just HTTP requests. Unless the target function *explicitly* checks for an Authorization header (usually matching `SUPABASE_SERVICE_ROLE_KEY`), the endpoint is public.
**Prevention:** Always verify `Authorization: Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` for functions intended only for internal scheduling.

## 2024-05-26 - Context Injection in LLMs
**Vulnerability:** The `ai-chat` Edge Function allowed a raw `tagsContext` string to be appended directly to the system prompt. A malicious user (or compromised client) could inject newlines and override system instructions (Prompt Injection) by crafting a malicious context string.
**Learning:** Constructing LLM prompts by concatenating user-provided "context" strings is dangerous. Even with basic sanitization (removing quotes), attackers can use newlines to break out of the context block and issue new system commands.
**Prevention:**
1. Move prompt construction to the server. Accept structured data (e.g., arrays) from the client instead of pre-formatted text strings.
2. Strictly sanitize inputs meant for context: remove newlines and control characters unless absolutely necessary.
3. Use structured "System Instructions" or "Data" blocks clearly delimited from "User Instructions" if the model supports it.
