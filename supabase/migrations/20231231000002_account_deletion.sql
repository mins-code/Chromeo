-- Account Deletion Requests table
-- Stores pending deletion requests with confirmation tokens

CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
    UNIQUE(user_id, status) -- Only one pending request per user
);

-- Enable RLS
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own requests
CREATE POLICY "Users can view own deletion requests" ON account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_deletion_requests_token 
    ON account_deletion_requests(token) 
    WHERE status = 'pending';

-- Index for cleanup of expired requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_expires 
    ON account_deletion_requests(expires_at) 
    WHERE status = 'pending';
