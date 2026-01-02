-- Create rate_limits table for Edge Function throttling
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL, -- Format: 'function_name:user_id' or 'function_name:ip'
    count int NOT NULL DEFAULT 1,
    window_start timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS (though Edge Functions usually bypass if using service role, helpful for admin)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS rate_limits_key_idx ON public.rate_limits(key);

-- Indexes for Tasks performance
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_type_idx ON public.tasks(type);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);

-- Indexes for Transactions performance
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions(type);

-- Function to clean up old rate limit entries (can be called via cron or periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    -- Delete entries older than 24 hours (safeguard)
    -- In practice, windows are short (starts at 'window_start'), so we can clean up anything older than 1 hour safely for most use cases
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
