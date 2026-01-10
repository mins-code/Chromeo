-- Create rate_limits table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL,
    count int NOT NULL DEFAULT 1,
    window_start timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Ensure UNIQUE constraint on key for atomic upsert support
DROP INDEX IF EXISTS rate_limits_key_idx;
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_key_unique_idx ON public.rate_limits(key);

-- Grant access to service_role (which Edge Functions usually use)
GRANT ALL ON public.rate_limits TO service_role;

-- Function for atomic increment with window reset
-- Uses SECURITY DEFINER to bypass RLS and ensure permissions
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_key text,
    p_window_duration_seconds int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
    v_window_start timestamptz;
BEGIN
    -- Attempt to upsert
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE
    SET
        -- If current window is expired, reset count to 1 and start new window
        count = CASE
            WHEN rate_limits.window_start < (now() - (p_window_duration_seconds || ' seconds')::interval)
            THEN 1
            ELSE rate_limits.count + 1
        END,
        -- If current window is expired, reset window_start to now
        window_start = CASE
            WHEN rate_limits.window_start < (now() - (p_window_duration_seconds || ' seconds')::interval)
            THEN now()
            ELSE rate_limits.window_start
        END
    RETURNING count INTO v_count;

    RETURN v_count;
END;
$$;

-- Grant execute permission to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, int) TO service_role;
