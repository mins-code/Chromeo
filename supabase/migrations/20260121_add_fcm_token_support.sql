-- Add FCM token support for native Android/iOS push notifications
-- This allows the notification-scheduler to send push notifications via Firebase Cloud Messaging

-- Add fcm_token column to push_subscriptions
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

-- Create index for faster FCM token lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm 
ON push_subscriptions(fcm_token) WHERE fcm_token IS NOT NULL;

-- Create index for platform-based queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform 
ON push_subscriptions(platform);

-- Add comment for documentation
COMMENT ON COLUMN push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token for Android/iOS native push notifications';
COMMENT ON COLUMN push_subscriptions.platform IS 'Platform of the device: web, android, or ios';
