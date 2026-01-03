-- Add notification fields to tasks table
-- These fields allow per-task notification customization

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notification_minutes_before INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notification_time TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.tasks.notification_enabled IS 
  'Per-task notification override: NULL = use global settings, true/false = override';
  
COMMENT ON COLUMN public.tasks.notification_minutes_before IS 
  'Custom lead time for relative notifications (overrides global settings)';
  
COMMENT ON COLUMN public.tasks.notification_time IS 
  'Absolute notification time (independent of task due date)';
