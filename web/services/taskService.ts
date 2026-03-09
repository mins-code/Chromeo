/**
 * Task Service
 *
 * Handles all task-related database operations.
 * Uses the transformation layer for type-safe DB interactions.
 */

import { Task, Partner, RecurrenceConfig } from '../types';
import {
  DbTask,
  mapTaskFromDb,
  mapTaskToDbInsert,
  mapTaskToDbUpdate,
} from '../types/supabase-custom';
import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the next recurrence date based on the recurrence configuration.
 */
const calculateNextRecurrence = (
  recurrence: RecurrenceConfig,
  startDate: string
): string | null => {
  if (recurrence.frequency === 'none') return null;

  const next = new Date(startDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return next.toISOString();
};

// ============================================================================
// Task CRUD Operations
// ============================================================================

/**
 * Fetches all tasks for the current user.
 * RLS policies ensure users only see their own tasks and shared tasks from partners.
 */
export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching tasks', error);
    return [];
  }

  // Map each database row to frontend Task type
  return (data as DbTask[]).map(mapTaskFromDb);
};

/**
 * Creates a new task.
 */
export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Calculate next_recurrence_date if task has recurrence
  let nextRecurrenceDate: string | null = null;
  if (task.recurrence && task.recurrence.frequency !== 'none') {
    const baseDate = task.dueDate || task.reminderTime || new Date().toISOString();
    nextRecurrenceDate = calculateNextRecurrence(task.recurrence, baseDate);
  }

  // Map frontend task to database insert payload
  const dbPayload = mapTaskToDbInsert(task, user.id, nextRecurrenceDate);

  const { data, error } = await supabase.from('tasks').insert(dbPayload).select().single();

  if (error) {
    logger.error('Error creating task', error);
    return null;
  }

  // Map database response back to frontend Task type
  return mapTaskFromDb(data as DbTask);
};

/**
 * Updates an existing task.
 */
export const updateTask = async (updatedTask: Task): Promise<Task | null> => {
  // Calculate next_recurrence_date if task has recurrence
  let nextRecurrenceDate: string | null = null;
  if (updatedTask.recurrence && updatedTask.recurrence.frequency !== 'none') {
    const baseDate = updatedTask.dueDate || updatedTask.reminderTime || new Date().toISOString();
    nextRecurrenceDate = calculateNextRecurrence(updatedTask.recurrence, baseDate);
  }

  // Map frontend task to database update payload
  const dbPayload = mapTaskToDbUpdate(updatedTask, nextRecurrenceDate);

  const { data, error } = await supabase
    .from('tasks')
    .update(dbPayload)
    .eq('id', updatedTask.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating task', error);
    return null;
  }

  // Map database response back to frontend Task type
  return mapTaskFromDb(data as DbTask);
};

/**
 * Deletes a task by ID.
 */
export const deleteTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    logger.error('Error deleting task', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return true;
};

// ============================================================================
// Partner Operations (Legacy - kept for backward compatibility)
// ============================================================================

/**
 * Gets the stored partner from localStorage.
 * @deprecated Use partnerService instead for database-backed partnerships.
 */
export const getPartner = (): Partner | null => {
  const stored = localStorage.getItem('chronodex_partner');
  return stored ? JSON.parse(stored) : null;
};

/**
 * Connects a partner and stores in localStorage.
 * @deprecated Use partnerService instead for database-backed partnerships.
 */
export const connectPartner = (email: string): Partner => {
  const partner: Partner = {
    id: 'p1',
    name: email.split('@')[0],
    email: email,
    isConnected: true,
  };
  localStorage.setItem('chronodex_partner', JSON.stringify(partner));
  return partner;
};

/**
 * Disconnects the current partner.
 * @deprecated Use partnerService instead for database-backed partnerships.
 */
export const disconnectPartner = (): void => {
  localStorage.removeItem('chronodex_partner');
};
