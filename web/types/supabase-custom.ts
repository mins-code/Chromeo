/**
 * Supabase Custom Types & Transformation Layer
 * 
 * This file provides:
 * 1. Convenience type aliases for database tables
 * 2. Functions to transform snake_case DB types to camelCase frontend types
 * 3. Functions to transform camelCase frontend types to snake_case for DB writes
 */

import { Database } from './supabase';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  SubTask,
  RecurrenceConfig,
  Transaction,
  RecurringTransaction,
  Note,
  ChecklistItem,
  Routine,
  RoutinePattern,
} from '../types';

// ============================================================================
// Database Row Type Aliases
// ============================================================================

/** Task row from database (snake_case) */
export type DbTask = Database['public']['Tables']['tasks']['Row'];

/** Task insert payload for database */
export type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];

/** Task update payload for database */
export type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];

/** Transaction row from database */
export type DbTransaction = Database['public']['Tables']['transactions']['Row'];

/** Transaction insert payload */
export type DbTransactionInsert = Database['public']['Tables']['transactions']['Insert'];

/** User settings row from database */
export type DbUserSettings = Database['public']['Tables']['user_settings']['Row'];

/** Note row from database */
export type DbNote = Database['public']['Tables']['notes']['Row'];

/** Routine row from database */
export type DbRoutine = Database['public']['Tables']['routines']['Row'];

/** Profile row from database */
export type DbProfile = Database['public']['Tables']['profiles']['Row'];

/** Partnership row from database */
export type DbPartnership = Database['public']['Tables']['partnerships']['Row'];

// ============================================================================
// Database → Frontend Mappers (snake_case → camelCase)
// ============================================================================

/**
 * Maps a database task row to the frontend Task type.
 * Handles null coalescing and type conversions.
 */
export const mapTaskFromDb = (dbTask: DbTask): Task => ({
  id: dbTask.id,
  user_id: dbTask.user_id,
  title: dbTask.title,
  description: dbTask.description ?? undefined,
  status: (dbTask.status as TaskStatus) ?? TaskStatus.TODO,
  priority: (dbTask.priority as TaskPriority) ?? TaskPriority.MEDIUM,
  dueDate: dbTask.due_date ?? undefined,
  reminderTime: dbTask.reminder_time ?? undefined,
  subtasks: (dbTask.subtasks as SubTask[]) ?? [],
  tags: dbTask.tags ?? [],
  type: (dbTask.type as TaskType) ?? 'TASK',
  duration: dbTask.duration ?? undefined,
  location: dbTask.location ?? undefined,
  dependencyIds: dbTask.dependency_ids ?? [],
  isShared: dbTask.is_shared ?? false,
  recurrence: dbTask.recurrence as RecurrenceConfig | undefined,
  createdAt: dbTask.created_at ? new Date(dbTask.created_at).getTime() : Date.now(),
  notificationEnabled: dbTask.notification_enabled ?? undefined,
  notificationMinutesBefore: dbTask.notification_minutes_before ?? undefined,
  notificationTime: dbTask.notification_time ?? undefined,
});

/**
 * Maps a database transaction row to the frontend Transaction type.
 */
export const mapTransactionFromDb = (dbTx: DbTransaction): Transaction => ({
  id: dbTx.id,
  description: dbTx.description,
  amount: dbTx.amount,
  type: dbTx.type as 'income' | 'expense',
  date: dbTx.date ? new Date(dbTx.date).getTime() : Date.now(),
});

/**
 * Maps a recurring transaction from database.
 */
export const mapRecurringTransactionFromDb = (dbTx: DbTransaction): RecurringTransaction | null => {
  if (!dbTx.frequency || !dbTx.next_due_date) return null;
  
  return {
    id: dbTx.id,
    description: dbTx.description,
    amount: dbTx.amount,
    type: dbTx.type as 'income' | 'expense',
    frequency: dbTx.frequency as RecurringTransaction['frequency'],
    nextDueDate: dbTx.next_due_date,
  };
};

/**
 * Maps a database note row to the frontend Note type.
 */
export const mapNoteFromDb = (dbNote: DbNote): Note => ({
  id: dbNote.id,
  user_id: dbNote.user_id,
  title: dbNote.title,
  content: dbNote.content,
  isChecklist: dbNote.is_checklist ?? false,
  checklistItems: (dbNote.checklist_items as ChecklistItem[]) ?? [],
  isShared: dbNote.is_shared ?? false,
  createdAt: dbNote.created_at ?? new Date().toISOString(),
  updatedAt: dbNote.updated_at ?? new Date().toISOString(),
});

/**
 * Maps a database routine row to the frontend Routine type.
 */
export const mapRoutineFromDb = (dbRoutine: DbRoutine): Routine => ({
  id: dbRoutine.id,
  name: dbRoutine.name,
  description: dbRoutine.description ?? undefined,
  pattern: dbRoutine.pattern as RoutinePattern,
  time: dbRoutine.time ?? undefined,
  duration: dbRoutine.duration ?? undefined,
  isActive: dbRoutine.is_active ?? true,
  notificationEnabled: dbRoutine.notification_enabled ?? undefined,
  notificationMinutesBefore: dbRoutine.notification_minutes_before ?? undefined,
  notificationTime: dbRoutine.notification_time ?? undefined,
  createdAt: dbRoutine.created_at ?? new Date().toISOString(),
});

// ============================================================================
// Frontend → Database Mappers (camelCase → snake_case)
// ============================================================================

/**
 * Maps a frontend Task to database insert payload.
 * Use for creating new tasks.
 */
export const mapTaskToDbInsert = (
  task: Omit<Task, 'id' | 'createdAt'>,
  userId: string,
  nextRecurrenceDate?: string | null
): DbTaskInsert => ({
  user_id: userId,
  title: task.title,
  description: task.description ?? null,
  status: task.status,
  priority: task.priority,
  due_date: task.dueDate ?? null,
  reminder_time: task.reminderTime ?? null,
  subtasks: task.subtasks as unknown as Database['public']['Tables']['tasks']['Row']['subtasks'],
  tags: task.tags,
  type: task.type,
  duration: task.duration ?? null,
  location: task.location ?? null,
  dependency_ids: task.dependencyIds,
  is_shared: task.isShared,
  recurrence: task.recurrence as unknown as Database['public']['Tables']['tasks']['Row']['recurrence'],
  next_recurrence_date: nextRecurrenceDate ?? null,
  notification_enabled: task.notificationEnabled ?? null,
  notification_minutes_before: task.notificationMinutesBefore ?? null,
  notification_time: task.notificationTime ?? null,
});

/**
 * Maps a frontend Task to database update payload.
 * Use for updating existing tasks.
 */
export const mapTaskToDbUpdate = (
  task: Partial<Task>,
  nextRecurrenceDate?: string | null
): DbTaskUpdate => {
  const update: DbTaskUpdate = {};

  if (task.title !== undefined) update.title = task.title;
  if (task.description !== undefined) update.description = task.description ?? null;
  if (task.status !== undefined) update.status = task.status;
  if (task.priority !== undefined) update.priority = task.priority;
  if (task.dueDate !== undefined) update.due_date = task.dueDate ?? null;
  if (task.reminderTime !== undefined) update.reminder_time = task.reminderTime ?? null;
  if (task.subtasks !== undefined) update.subtasks = task.subtasks as unknown as DbTaskUpdate['subtasks'];
  if (task.tags !== undefined) update.tags = task.tags;
  if (task.type !== undefined) update.type = task.type;
  if (task.duration !== undefined) update.duration = task.duration ?? null;
  if (task.location !== undefined) update.location = task.location ?? null;
  if (task.dependencyIds !== undefined) update.dependency_ids = task.dependencyIds;
  if (task.isShared !== undefined) update.is_shared = task.isShared;
  if (task.recurrence !== undefined) update.recurrence = task.recurrence as unknown as DbTaskUpdate['recurrence'];
  if (nextRecurrenceDate !== undefined) update.next_recurrence_date = nextRecurrenceDate;
  if (task.notificationEnabled !== undefined) update.notification_enabled = task.notificationEnabled ?? null;
  if (task.notificationMinutesBefore !== undefined) update.notification_minutes_before = task.notificationMinutesBefore ?? null;
  if (task.notificationTime !== undefined) update.notification_time = task.notificationTime ?? null;

  return update;
};

/**
 * Maps a frontend Note to database insert payload.
 */
export const mapNoteToDbInsert = (
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Database['public']['Tables']['notes']['Insert'] => ({
  user_id: userId,
  title: note.title,
  content: note.content,
  is_checklist: note.isChecklist,
  checklist_items: note.checklistItems as unknown as Database['public']['Tables']['notes']['Row']['checklist_items'],
  is_shared: note.isShared,
});

/**
 * Maps a frontend Routine to database insert payload.
 */
export const mapRoutineToDbInsert = (
  routine: Omit<Routine, 'id' | 'createdAt'>,
  userId: string
): Database['public']['Tables']['routines']['Insert'] => ({
  user_id: userId,
  name: routine.name,
  description: routine.description ?? null,
  pattern: routine.pattern as unknown as Database['public']['Tables']['routines']['Row']['pattern'],
  time: routine.time ?? null,
  duration: routine.duration ?? null,
  is_active: routine.isActive,
  notification_enabled: routine.notificationEnabled ?? null,
  notification_minutes_before: routine.notificationMinutesBefore ?? null,
  notification_time: routine.notificationTime ?? null,
});

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { Database } from './supabase';
