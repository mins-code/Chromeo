import { Task, TaskStatus, TaskPriority, Partner, RecurrenceConfig } from "../types";
import { supabase } from "./supabaseClient";

// Helper function to map DB snake_case columns to TypeScript camelCase interface
const mapDbTaskToTask = (dbTask: any): Task => ({
  ...dbTask,
  dueDate: dbTask.due_date,
  reminderTime: dbTask.reminder_time,
  dependencyIds: dbTask.dependency_ids || [],
  isShared: dbTask.is_shared,
  createdAt: new Date(dbTask.created_at).getTime()
});

// Helper function to calculate next recurrence date
const calculateNextRecurrence = (recurrence: RecurrenceConfig, startDate: string): string => {
  const next = new Date(startDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    case 'none':
      return null as any; // No recurrence
  }

  return next.toISOString();
};

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map(mapDbTaskToTask);
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  // Calculate next_recurrence_date if task has recurrence
  let nextRecurrenceDate = null;
  if (task.recurrence && task.recurrence.frequency !== 'none') {
    const baseDate = task.dueDate || task.reminderTime || new Date().toISOString();
    nextRecurrenceDate = calculateNextRecurrence(task.recurrence, baseDate);
  }

  const dbTask = {
    user_id: user.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate || null,
    reminder_time: task.reminderTime || null,
    subtasks: task.subtasks || [],
    tags: task.tags || [],
    type: task.type,
    duration: task.duration,
    location: task.location,
    dependency_ids: task.dependencyIds || [],
    is_shared: task.isShared || false,
    recurrence: task.recurrence,
    next_recurrence_date: nextRecurrenceDate,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(dbTask)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return mapDbTaskToTask(data);
};

export const updateTask = async (updatedTask: Task): Promise<Task | null> => {
  // Calculate next_recurrence_date if task has recurrence
  let nextRecurrenceDate = null;
  if (updatedTask.recurrence && updatedTask.recurrence.frequency !== 'none') {
    const baseDate = updatedTask.dueDate || updatedTask.reminderTime || new Date().toISOString();
    nextRecurrenceDate = calculateNextRecurrence(updatedTask.recurrence, baseDate);
  }

  const dbTask = {
    title: updatedTask.title,
    description: updatedTask.description,
    status: updatedTask.status,
    priority: updatedTask.priority,
    due_date: updatedTask.dueDate || null,
    reminder_time: updatedTask.reminderTime || null,
    subtasks: updatedTask.subtasks,
    tags: updatedTask.tags,
    type: updatedTask.type,
    duration: updatedTask.duration,
    location: updatedTask.location,
    dependency_ids: updatedTask.dependencyIds,
    is_shared: updatedTask.isShared,
    recurrence: updatedTask.recurrence,
    next_recurrence_date: nextRecurrenceDate
  };

  const { data, error } = await supabase
    .from('tasks')
    .update(dbTask)
    .eq('id', updatedTask.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return mapDbTaskToTask(data);
};

export const deleteTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    console.error("Error deleting task:", error);
    return false;
  }
  return true;
};

// --- Partner Service (Mock implementation for now, but ready for DB) ---
// In a real production app, this would query a 'profiles' table.

export const getPartner = (): Partner | null => {
  const stored = localStorage.getItem('chronodex_partner');
  return stored ? JSON.parse(stored) : null;
};

export const connectPartner = (email: string): Partner => {
  const partner: Partner = {
    id: 'p1',
    name: email.split('@')[0],
    email: email,
    isConnected: true
  };
  localStorage.setItem('chronodex_partner', JSON.stringify(partner));
  return partner;
};

export const disconnectPartner = () => {
  localStorage.removeItem('chronodex_partner');
};
