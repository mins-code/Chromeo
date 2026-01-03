-- Allow partners to update and delete tasks that are shared with them

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Create new update policy that allows:
-- 1. Task owner to update their own tasks
-- 2. Partners to update tasks shared with them (when is_shared = true and partnership is accepted)
CREATE POLICY "Users can update their own tasks or shared tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    (is_shared = true AND EXISTS (
      SELECT 1 FROM public.partnerships
      WHERE ((user_id_1 = auth.uid() AND user_id_2 = tasks.user_id)
          OR (user_id_1 = tasks.user_id AND user_id_2 = auth.uid()))
        AND status = 'accepted'
    ))
  );

-- Create new delete policy that allows:
-- 1. Task owner to delete their own tasks
-- 2. Partners to delete tasks shared with them (when is_shared = true and partnership is accepted)
CREATE POLICY "Users can delete their own tasks or shared tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    (is_shared = true AND EXISTS (
      SELECT 1 FROM public.partnerships
      WHERE ((user_id_1 = auth.uid() AND user_id_2 = tasks.user_id)
          OR (user_id_1 = tasks.user_id AND user_id_2 = auth.uid()))
        AND status = 'accepted'
    ))
  );

-- Add comments to explain the policies
COMMENT ON POLICY "Users can update their own tasks or shared tasks" ON public.tasks IS 
  'Allows task owners and accepted partners to update shared tasks (all fields including tags, deadlines, notifications, etc.)';

COMMENT ON POLICY "Users can delete their own tasks or shared tasks" ON public.tasks IS 
  'Allows task owners and accepted partners to delete shared tasks';
