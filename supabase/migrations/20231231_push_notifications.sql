-- Push Subscriptions table to store user's push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,  -- Contains endpoint, keys, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Scheduled Notifications table for backend-triggered push notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT,  -- Optional: link to task for easy cancellation
    title TEXT NOT NULL,
    body TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id)  -- One notification per task
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for push_subscriptions
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Policies for scheduled_notifications
CREATE POLICY "Users can manage own scheduled notifications" ON scheduled_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due 
    ON scheduled_notifications(scheduled_at, sent) 
    WHERE sent = FALSE;

-- Index for task lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_task 
    ON scheduled_notifications(task_id) 
    WHERE task_id IS NOT NULL;
