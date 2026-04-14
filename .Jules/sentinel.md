## 2026-04-14 - GDPR Data Deletion Completeness
**Vulnerability:** The account deletion edge function missed tables without a direct `user_id` column (`partnerships`, `note_shares`) and recently added tables (`day_plans`, `notes`), leaving orphaned personal data violating GDPR.
**Learning:** Hardcoded table arrays for account deletion are fragile as schema evolves. Tables lacking a direct `user_id` column require explicit, separate deletion logic using their relevant foreign keys.
**Prevention:** Whenever new tables with user data are created, the account deletion function MUST be manually updated. Ensure all foreign key references to users (e.g., `owner_id`, `user_id_1`) are explicitly handled.
