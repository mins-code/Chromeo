-- Create day_plans table for storing flowchart data
CREATE TABLE public.day_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date text NOT NULL, -- Date key like "2026-01-08"
  task_ids text[] DEFAULT array[]::text[], -- Array of task IDs in the plan
  links jsonb DEFAULT '[]'::jsonb, -- TaskLink objects: {id, fromTaskId, toTaskId, linkType, sourceHandle, targetHandle}
  layout jsonb DEFAULT '[]'::jsonb, -- TaskLayout objects: {taskId, x, y}
  template_id uuid, -- Optional reference to a template
  is_recurring boolean DEFAULT false,
  recurring_config jsonb, -- Optional recurring settings
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Each user can have only one plan per date
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own day plans
CREATE POLICY "Users can view their own day plans" ON public.day_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day plans" ON public.day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day plans" ON public.day_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day plans" ON public.day_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups by user and date
CREATE INDEX day_plans_user_id_idx ON public.day_plans(user_id);
CREATE INDEX day_plans_date_idx ON public.day_plans(date);
CREATE INDEX day_plans_user_date_idx ON public.day_plans(user_id, date);
