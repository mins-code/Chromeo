#!/bin/bash
# Check if note_shares, notes, day_plans are handled in account-deletion function
grep -E "notes|note_shares|day_plans" supabase/functions/account-deletion/index.ts
