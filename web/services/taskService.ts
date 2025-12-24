
import { Task, TaskStatus, TaskPriority, Partner } from "../types";
import { supabase } from "./supabaseClient";

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  // Map database columns (snake_case) to TypeScript interface (camelCase)
  return data.map((t: any) => ({
    ...t,
    dueDate: t.due_date,
    reminderTime: t.reminder_time,
    dependencyIds: t.dependency_ids || [],
    isShared: t.is_shared,
    createdAt: new Date(t.created_at).getTime() // Convert timestamp string to number for app compatibility
  })) as Task[];
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

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

  return {
      ...data,
      dueDate: data.due_date,
      reminderTime: data.reminder_time,
      dependencyIds: data.dependency_ids || [],
      isShared: data.is_shared,
      createdAt: new Date(data.created_at).getTime()
  } as Task;
};

export const updateTask = async (updatedTask: Task): Promise<Task | null> => {
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
    recurrence: updatedTask.recurrence
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

  return {
    ...data,
    dueDate: data.due_date,
    reminderTime: data.reminder_time,
    dependencyIds: data.dependency_ids || [],
    isShared: data.is_shared,
    createdAt: new Date(data.created_at).getTime()
  } as Task;
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
