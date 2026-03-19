## 2026-02-21 - Incomplete Account Deletion (Lingering Data)
**Vulnerability:** The `account-deletion` Edge Function relied on a hardcoded array of `tablesToDelete`. Newly added tables like `day_plans`, `notes`, and `note_shares` were missed, leading to sensitive user data remaining in the database after an account deletion request.
**Learning:** Hardcoded lists of dependencies in deletion logic require constant manual updates and are highly prone to omission when the database schema evolves. Furthermore, tables lacking a standard `user_id` column (like `note_shares` which uses `owner_id` and `shared_with_id`) require bespoke deletion logic, compounding the maintenance burden.
**Prevention:**
1. Whenever modifying the schema (e.g., adding a table linked to users), audit all user lifecycle functions (like account deletion) to ensure the new entities are included in the cleanup logic.
2. Rely on PostgreSQL's native `ON DELETE CASCADE` on foreign key references to `auth.users` or `profiles` whenever possible, mitigating the need to perform manual row-by-row deletion across all tables in application logic.
## 2026-02-21 - Incomplete Account Deletion (Lingering Data)
**Vulnerability:** The `account-deletion` Edge Function relied on a hardcoded array of `tablesToDelete`. Newly added tables like `day_plans`, `notes`, and `note_shares` were missed, leading to sensitive user data remaining in the database after an account deletion request.
**Learning:** Hardcoded lists of dependencies in deletion logic require constant manual updates and are highly prone to omission when the database schema evolves. Furthermore, tables lacking a standard `user_id` column (like `note_shares` which uses `owner_id` and `shared_with_id`) require bespoke deletion logic, compounding the maintenance burden.
**Prevention:**
1. Whenever modifying the schema (e.g., adding a table linked to users), audit all user lifecycle functions (like account deletion) to ensure the new entities are included in the cleanup logic.
2. Rely on PostgreSQL's native `ON DELETE CASCADE` on foreign key references to `auth.users` or `profiles` whenever possible, mitigating the need to perform manual row-by-row deletion across all tables in application logic.
