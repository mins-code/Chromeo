-- Migration: Optimize RLS policies for tasks table
-- This migration optimizes the performance of Row Level Security policies
-- by creating a cached partner lookup function and adding proper indexes.

-- ============================================================================
-- 1. Create the partner lookup function
-- ============================================================================
-- This function returns all partner UUIDs for a given user.
-- SECURITY DEFINER: Runs with the privileges of the function owner
-- STABLE: Indicates the function cannot modify the database and returns
--         consistent results for the same arguments within a single query.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_partners(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN user_id_1 = user_uuid THEN user_id_2
      ELSE user_id_1
    END AS partner_id
  FROM public.partnerships
  WHERE 
    (user_id_1 = user_uuid OR user_id_2 = user_uuid)
    AND status = 'accepted';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_partners(uuid) TO authenticated;

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

-- Composite index on partnerships for fast partner lookups
-- This covers both directions of the partnership relationship
CREATE INDEX IF NOT EXISTS idx_partnerships_user1_user2_status 
  ON public.partnerships(user_id_1, user_id_2, status);

-- Additional index for the reverse lookup direction
CREATE INDEX IF NOT EXISTS idx_partnerships_user2_user1_status 
  ON public.partnerships(user_id_2, user_id_1, status);

-- Index on tasks.is_shared for quick filtering of shared tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_shared 
  ON public.tasks(is_shared) 
  WHERE is_shared = true;

-- ============================================================================
-- 3. Refactor the Task RLS policy
-- ============================================================================

-- Drop the existing inefficient policy
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;

-- Create the optimized policy using the new function
-- This is much more efficient because:
-- 1. The function result can be cached within the transaction (STABLE)
-- 2. The IN clause with the function is evaluated once per query, not per row
-- 3. The is_shared check short-circuits for non-shared tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    (
      is_shared = true 
      AND user_id IN (SELECT public.get_user_partners(auth.uid()))
    )
  );

-- ============================================================================
-- 4. Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.get_user_partners(uuid) IS 
  'Returns all accepted partner UUIDs for the given user. Used by RLS policies for efficient partner lookups.';

COMMENT ON INDEX idx_partnerships_user1_user2_status IS 
  'Composite index for fast partnership lookups in get_user_partners function.';

COMMENT ON INDEX idx_tasks_is_shared IS 
  'Partial index for quickly filtering shared tasks in RLS policies.';
