-- Multi-Device Push Notification Support
-- Previously, only one subscription per user was stored due to UNIQUE(user_id)
-- This migration allows multiple devices per user to receive notifications

-- Step 1: Drop the unique constraint that only allows ONE device per user
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Step 2: Add columns for multi-device support
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Create unique index for user+endpoint (allows multiple devices per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint 
ON push_subscriptions (user_id, (subscription->>'endpoint'));

-- Step 4: Index for getting all devices for a user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
