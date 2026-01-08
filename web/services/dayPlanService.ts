/**
 * Day Plan Service
 * Manages day plans, templates, and task flowcharts
 * Now synced to Supabase for cross-device access
 */

import { DayPlan, DayPlanTemplate, Task, TaskLink, TaskLayout } from '../types';
import { supabase } from './supabaseClient';

// ============ Day Plans (Supabase) ============

/**
 * Get day plan for a specific date
 */
export const getDayPlan = async (date: string): Promise<DayPlan | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('day_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error || !data) return null;

    // Convert from DB format to DayPlan format
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      taskIds: data.task_ids || [],
      links: (data.links || []) as TaskLink[],
      layout: (data.layout || []) as TaskLayout[],
      templateId: data.template_id,
      isRecurring: data.is_recurring,
      recurringConfig: data.recurring_config,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error reading day plan:', error);
    return null;
  }
};

/**
 * Save or update day plan (upsert)
 */
export const saveDayPlan = async (plan: DayPlan): Promise<DayPlan> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const dbPlan = {
      id: plan.id,
      user_id: user.id,
      date: plan.date,
      task_ids: plan.taskIds,
      links: plan.links,
      layout: plan.layout,
      template_id: plan.templateId || null,
      is_recurring: plan.isRecurring || false,
      recurring_config: plan.recurringConfig || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('day_plans')
      .upsert(dbPlan, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Error saving day plan:', error);
      throw error;
    }

    return {
      ...plan,
      id: data.id,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error saving day plan:', error);
    throw error;
  }
};

/**
 * Delete day plan
 */
export const deleteDayPlan = async (date: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('day_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);

    if (error) {
      console.error('Error deleting day plan:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting day plan:', error);
    return false;
  }
};

/**
 * Clone day plan to another date(s)
 */
export const cloneDayPlan = async (
  sourcePlanId: string,
  targetDates: string[],
  adjustTimes?: boolean
): Promise<DayPlan[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Find source plan
  const { data: sourcePlan, error: fetchError } = await supabase
    .from('day_plans')
    .select('*')
    .eq('id', sourcePlanId)
    .single();

  if (fetchError || !sourcePlan) {
    throw new Error('Source plan not found');
  }

  const clonedPlans: DayPlan[] = [];

  for (const targetDate of targetDates) {
    const clonedPlan: DayPlan = {
      id: crypto.randomUUID(),
      userId: user.id,
      date: targetDate,
      taskIds: sourcePlan.task_ids || [],
      links: (sourcePlan.links || []) as TaskLink[],
      layout: (sourcePlan.layout || []) as TaskLayout[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveDayPlan(clonedPlan);
    clonedPlans.push(saved);
  }

  return clonedPlans;
};

/**
 * Add task to day plan
 */
export const addTaskToPlan = async (
  planId: string,
  taskId: string,
  position: { x: number; y: number }
): Promise<DayPlan | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the plan
  const { data: plan, error } = await supabase
    .from('day_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) return null;

  // Add task ID if not already in plan
  const taskIds = plan.task_ids || [];
  if (!taskIds.includes(taskId)) {
    taskIds.push(taskId);
  }

  // Add or update layout
  const layout = (plan.layout || []) as TaskLayout[];
  const existingLayoutIndex = layout.findIndex((l: TaskLayout) => l.taskId === taskId);
  const newLayout: TaskLayout = { taskId, x: position.x, y: position.y };

  if (existingLayoutIndex >= 0) {
    layout[existingLayoutIndex] = newLayout;
  } else {
    layout.push(newLayout);
  }

  // Save updated plan
  const dayPlan: DayPlan = {
    id: plan.id,
    userId: plan.user_id,
    date: plan.date,
    taskIds,
    links: (plan.links || []) as TaskLink[],
    layout,
    templateId: plan.template_id,
    isRecurring: plan.is_recurring,
    recurringConfig: plan.recurring_config,
    createdAt: plan.created_at,
    updatedAt: new Date().toISOString(),
  };

  return saveDayPlan(dayPlan);
};

/**
 * Remove task from day plan
 */
export const removeTaskFromPlan = async (planId: string, taskId: string): Promise<DayPlan | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the plan
  const { data: plan, error } = await supabase
    .from('day_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) return null;

  // Remove task ID
  const taskIds = (plan.task_ids || []).filter((id: string) => id !== taskId);

  // Remove layout
  const layout = (plan.layout || []).filter((l: TaskLayout) => l.taskId !== taskId);

  // Remove links involving this task
  const links = (plan.links || []).filter(
    (link: TaskLink) => link.fromTaskId !== taskId && link.toTaskId !== taskId
  );

  // Save updated plan
  const dayPlan: DayPlan = {
    id: plan.id,
    userId: plan.user_id,
    date: plan.date,
    taskIds,
    links,
    layout,
    templateId: plan.template_id,
    isRecurring: plan.is_recurring,
    recurringConfig: plan.recurring_config,
    createdAt: plan.created_at,
    updatedAt: new Date().toISOString(),
  };

  return saveDayPlan(dayPlan);
};

/**
 * Link two tasks
 */
export const linkTasks = async (
  planId: string,
  fromTaskId: string,
  toTaskId: string,
  linkType: 'flow' | 'dependency' = 'flow'
): Promise<TaskLink | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the plan
  const { data: plan, error } = await supabase
    .from('day_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) return null;

  // Check if tasks exist in plan
  const taskIds = plan.task_ids || [];
  if (!taskIds.includes(fromTaskId) || !taskIds.includes(toTaskId)) {
    return null;
  }

  // Create new link
  const newLink: TaskLink = {
    id: crypto.randomUUID(),
    fromTaskId,
    toTaskId,
    linkType,
  };

  const links = [...(plan.links || []), newLink];

  // Save updated plan
  const dayPlan: DayPlan = {
    id: plan.id,
    userId: plan.user_id,
    date: plan.date,
    taskIds,
    links,
    layout: plan.layout || [],
    templateId: plan.template_id,
    isRecurring: plan.is_recurring,
    recurringConfig: plan.recurring_config,
    createdAt: plan.created_at,
    updatedAt: new Date().toISOString(),
  };

  await saveDayPlan(dayPlan);
  return newLink;
};

/**
 * Remove task link
 */
export const removeTaskLink = async (planId: string, linkId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Fetch the plan
  const { data: plan, error } = await supabase
    .from('day_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) return false;

  const links = (plan.links || []).filter((link: TaskLink) => link.id !== linkId);

  if (links.length === (plan.links || []).length) {
    return false; // No link was removed
  }

  // Save updated plan
  const dayPlan: DayPlan = {
    id: plan.id,
    userId: plan.user_id,
    date: plan.date,
    taskIds: plan.task_ids || [],
    links,
    layout: plan.layout || [],
    templateId: plan.template_id,
    isRecurring: plan.is_recurring,
    recurringConfig: plan.recurring_config,
    createdAt: plan.created_at,
    updatedAt: new Date().toISOString(),
  };

  await saveDayPlan(dayPlan);
  return true;
};

// ============ Templates (localStorage - local only for now) ============

const TEMPLATES_KEY = 'chronodex_day_plan_templates';
const RECURRING_PLANS_KEY = 'chronodex_recurring_plans';

/**
 * Get all templates
 */
const getAllTemplates = (): DayPlanTemplate[] => {
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading templates:', error);
    return [];
  }
};

/**
 * Save all templates
 */
const saveAllTemplates = (templates: DayPlanTemplate[]): void => {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving templates:', error);
  }
};

/**
 * Get all day plan templates
 */
export const getTemplates = (): DayPlanTemplate[] => {
  return getAllTemplates();
};

/**
 * Save day plan as template
 */
export const saveAsTemplate = (
  plan: DayPlan,
  tasks: Omit<Task, 'id' | 'user_id' | 'createdAt'>[],
  name: string,
  description?: string
): DayPlanTemplate => {
  const templates = getAllTemplates();
  
  const template: DayPlanTemplate = {
    id: crypto.randomUUID(),
    name,
    description,
    tasks: tasks,
    links: plan.links.map(({ fromTaskId, toTaskId, linkType }) => ({
      fromTaskId,
      toTaskId,
      linkType,
    })),
    layout: plan.layout.map(({ taskId, x, y }) => ({
      taskId,
      x,
      y,
    })),
    createdAt: new Date().toISOString(),
  };

  templates.push(template);
  saveAllTemplates(templates);

  return template;
};

/**
 * Delete template
 */
export const deleteTemplate = (templateId: string): boolean => {
  const templates = getAllTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  
  if (filtered.length < templates.length) {
    saveAllTemplates(filtered);
    return true;
  }

  return false;
};

/**
 * Create day plan from template
 */
export const applyTemplate = async (
  templateId: string,
  date: string,
  userId: string
): Promise<DayPlan | null> => {
  const templates = getAllTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) return null;

  const newPlan: DayPlan = {
    id: crypto.randomUUID(),
    userId,
    date,
    taskIds: [],
    links: template.links.map(link => ({
      ...link,
      id: crypto.randomUUID(),
    })),
    layout: template.layout.map(item => ({
      ...item,
      taskId: (item as any).taskId || '',
    })),
    templateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveDayPlan(newPlan);
};

// ============ Recurring Plans (localStorage - local only for now) ============

/**
 * Get all recurring plan configurations
 */
const getAllRecurringPlans = (): Record<string, DayPlan> => {
  try {
    const stored = localStorage.getItem(RECURRING_PLANS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading recurring plans:', error);
    return {};
  }
};

/**
 * Save all recurring plan configurations
 */
const saveAllRecurringPlans = (plans: Record<string, DayPlan>): void => {
  try {
    localStorage.setItem(RECURRING_PLANS_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Error saving recurring plans:', error);
  }
};

/**
 * Save a day plan as a recurring template
 */
export const saveRecurringRule = (
  template: DayPlanTemplate,
  recurringConfig: DayPlan['recurringConfig'],
  userId: string
): DayPlan => {
  const plans = getAllRecurringPlans();
  const id = crypto.randomUUID();
  
  const recurringPlan: DayPlan = {
    id,
    userId,
    date: 'RECURRING',
    taskIds: [],
    links: template.links.map(l => ({ ...l, id: crypto.randomUUID() })),
    layout: template.layout.map(l => ({ ...l, taskId: (l as any).taskId || '' })),
    templateId: template.id,
    isRecurring: true,
    recurringConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  plans[id] = recurringPlan;
  saveAllRecurringPlans(plans);
  return recurringPlan;
};

/**
 * Get all recurring rules
 */
export const getRecurringRules = (): DayPlan[] => {
  const plans = getAllRecurringPlans();
  return Object.values(plans);
};

/**
 * Check if a date matches a recurring rule
 */
export const checkForRecurringPlans = async (
  date: string, 
  userId: string
): Promise<DayPlanTemplate | null> => {
  // Check if plan already exists for this date
  const existingPlan = await getDayPlan(date);
  if (existingPlan && existingPlan.taskIds.length > 0) {
    return null; // Don't overwrite existing plans
  }

  const recurringRules = getRecurringRules();
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // Find matching rule
  const match = recurringRules.find(rule => {
    if (!rule.recurringConfig) return false;
    
    // Check specific days
    if (rule.recurringConfig.days && rule.recurringConfig.days.includes(dayOfWeek)) {
      return true;
    }
    
    // Check daily/weekly/monthly intervals
    if (rule.recurringConfig.frequency === 'daily') return true;
    if (rule.recurringConfig.frequency === 'weekly') return true;
    
    return false;
  });

  if (match && match.templateId) {
    const templates = getAllTemplates();
    const sourceTemplate = templates.find(t => t.id === match.templateId);
    return sourceTemplate || null;
  }

  return null;
};
