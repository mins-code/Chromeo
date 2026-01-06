/**
 * Day Plan Service
 * Manages day plans, templates, and task flowcharts
 */

import { DayPlan, DayPlanTemplate, Task, TaskLink, TaskLayout } from '../types';

const DAY_PLANS_KEY = 'chronodex_day_plans';
const TEMPLATES_KEY = 'chronodex_day_plan_templates';

// ============ Day Plans ============

/**
 * Get all day plans from localStorage
 */
const getAllDayPlans = (): Record<string, DayPlan> => {
  try {
    const stored = localStorage.getItem(DAY_PLANS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading day plans:', error);
    return {};
  }
};

/**
 * Save all day plans to localStorage
 */
const saveAllDayPlans = (plans: Record<string, DayPlan>): void => {
  try {
    localStorage.setItem(DAY_PLANS_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Error saving day plans:', error);
  }
};

/**
 * Get day plan for a specific date
 */
export const getDayPlan = (date: string): DayPlan | null => {
  const plans = getAllDayPlans();
  return plans[date] || null;
};

/**
 * Save or update day plan
 */
export const saveDayPlan = (plan: DayPlan): DayPlan => {
  const plans = getAllDayPlans();
  const updatedPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };
  plans[plan.date] = updatedPlan;
  saveAllDayPlans(plans);
  return updatedPlan;
};

/**
 * Delete day plan
 */
export const deleteDayPlan = (date: string): boolean => {
  const plans = getAllDayPlans();
  if (plans[date]) {
    delete plans[date];
    saveAllDayPlans(plans);
    return true;
  }
  return false;
};

/**
 * Clone day plan to another date(s)
 */
export const cloneDayPlan = (
  sourcePlanId: string,
  targetDates: string[],
  adjustTimes?: boolean
): DayPlan[] => {
  const plans = getAllDayPlans();
  const sourcePlan = Object.values(plans).find(p => p.id === sourcePlanId);
  
  if (!sourcePlan) {
    throw new Error('Source plan not found');
  }

  const clonedPlans: DayPlan[] = [];

  targetDates.forEach(targetDate => {
    const clonedPlan: DayPlan = {
      ...sourcePlan,
      id: crypto.randomUUID(),
      date: targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clonedPlans.push(saveDayPlan(clonedPlan));
  });

  return clonedPlans;
};

/**
 * Add task to day plan
 */
export const addTaskToPlan = (
  planId: string,
  taskId: string,
  position: { x: number; y: number }
): DayPlan | null => {
  const plans = getAllDayPlans();
  const plan = Object.values(plans).find(p => p.id === planId);
  
  if (!plan) return null;

  // Add task ID if not already in plan
  if (!plan.taskIds.includes(taskId)) {
    plan.taskIds.push(taskId);
  }

  // Add or update layout
  const existingLayoutIndex = plan.layout.findIndex(l => l.taskId === taskId);
  const newLayout: TaskLayout = {
    taskId,
    x: position.x,
    y: position.y,
  };

  if (existingLayoutIndex >= 0) {
    plan.layout[existingLayoutIndex] = newLayout;
  } else {
    plan.layout.push(newLayout);
  }

  return saveDayPlan(plan);
};

/**
 * Remove task from day plan
 */
export const removeTaskFromPlan = (planId: string, taskId: string): DayPlan | null => {
  const plans = getAllDayPlans();
  const plan = Object.values(plans).find(p => p.id === planId);
  
  if (!plan) return null;

  // Remove task ID
  plan.taskIds = plan.taskIds.filter(id => id !== taskId);

  // Remove layout
  plan.layout = plan.layout.filter(l => l.taskId !== taskId);

  // Remove links involving this task
  plan.links = plan.links.filter(
    link => link.fromTaskId !== taskId && link.toTaskId !== taskId
  );

  return saveDayPlan(plan);
};

/**
 * Link two tasks
 */
export const linkTasks = (
  planId: string,
  fromTaskId: string,
  toTaskId: string,
  linkType: 'flow' | 'dependency' = 'flow'
): TaskLink | null => {
  const plans = getAllDayPlans();
  const plan = Object.values(plans).find(p => p.id === planId);
  
  if (!plan) return null;

  // Check if tasks exist in plan
  if (!plan.taskIds.includes(fromTaskId) || !plan.taskIds.includes(toTaskId)) {
    return null;
  }

  // Create new link
  const newLink: TaskLink = {
    id: crypto.randomUUID(),
    fromTaskId,
    toTaskId,
    linkType,
  };

  plan.links.push(newLink);
  saveDayPlan(plan);

  return newLink;
};

/**
 * Remove task link
 */
export const removeTaskLink = (planId: string, linkId: string): boolean => {
  const plans = getAllDayPlans();
  const plan = Object.values(plans).find(p => p.id === planId);
  
  if (!plan) return false;

  const initialLength = plan.links.length;
  plan.links = plan.links.filter(link => link.id !== linkId);

  if (plan.links.length < initialLength) {
    saveDayPlan(plan);
    return true;
  }

  return false;
};

// ============ Templates ============

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
export const applyTemplate = (
  templateId: string,
  date: string,
  userId: string
): DayPlan | null => {
  const templates = getAllTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) return null;

  const newPlan: DayPlan = {
    id: crypto.randomUUID(),
    userId,
    date,
    taskIds: [], // Will be populated when tasks are created
    links: template.links.map(link => ({
      ...link,
      id: crypto.randomUUID(),
    })),
    layout: template.layout.map(item => ({
      ...item,
      taskId: '', // Will be updated when tasks are created
    })),
    templateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveDayPlan(newPlan);
};
