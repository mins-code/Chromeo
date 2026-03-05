1. **Target**: `supabase/functions/account-deletion/index.ts`
2. **Issue**: Overly permissive CORS configuration (`"Access-Control-Allow-Origin": "*"`).
3. **Fix**: Implement dynamic CORS validation similar to `ai-chat` or `push-notification`. Ensure `Origin` validation against allowed origins (`APP_URL`, localhost) and set `Vary: Origin`.

Also, there's another issue I saw in the same file: "account_deletion_requests" is included in the `tablesToDelete` array which deletes everything `eq("user_id", userId)`. BUT, the user account deletion needs this table to keep track of its status, and it already gets deleted/marked as confirmed later or earlier. Let me verify the code for `account-deletion/index.ts` first.
