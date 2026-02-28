
// Transaction Categories for Budget Planner AI Auto-Categorization
export const TRANSACTION_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Travel',
  'Income',
  'Other',
  'Uncategorized'
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export type TaskType = 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER';

/**
 * Maps to an Android notification channel ID.
 * - sound_default: Standard device default sound
 * - sound_chime/beep/synth/alarm: Bundled audio files in the APK
 * - sound_custom_os: A channel the user can configure via Android OS settings
 */
export type NotificationSound =
  | 'sound_default'
  | 'sound_chime'
  | 'sound_beep'
  | 'sound_synth'
  | 'sound_alarm'
  | 'sound_custom_os';

export type ThemeOption = 'light' | 'dark' | 'cyberpunk' | 'sunset' | 'onepiece';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface RecurrenceConfig {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g. every 2 weeks
  days?: number[]; // [0-6] for weekly specific days (0=Sun)
  endDate?: string; // ISO date string for when recurrence stops
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // ISO date string
  subtasks: SubTask[];
  tags: string[];
  createdAt: number;
  
  // New Features
  type: TaskType;
  duration?: number; // in minutes
  location?: string;
  reminderTime?: string; // ISO date string for specific reminder
  dependencyIds: string[]; // IDs of tasks that must be completed first
  isShared: boolean; // Shared with partner
  recurrence?: RecurrenceConfig;
  
  // Per-task notification settings (overrides global settings)
  notificationEnabled?: boolean; // undefined = use global, true/false = override
  notificationMinutesBefore?: number; // Custom lead time for this task
  notificationTime?: string; // Absolute notification time (ISO date string)
  notificationSoundId?: NotificationSound; // Android notification channel / sound
}


export interface Partner {
  id: string;
  name: string;
  email: string;
  isConnected: boolean;
}

export interface Partnership {
  id: string;
  partnerId: string;
  partnerEmail: string;
  partnerName?: string;
  status: 'pending' | 'accepted';
  isIncoming: boolean; // true if this user received the invite
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isOwner: boolean;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted';
}

export interface UserSearchResult {
  id: string;
  email: string;
  fullName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error'; // Track message status
  error?: string; // Error message if failed
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: number;
  category?: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string; // ISO Date string
}

export interface BudgetShare {
  id: string;
  partnerId: string;
  partnerEmail: string;
  partnerName?: string;
  createdAt: string;
}

export interface SharedBudgetInfo {
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  shareId: string;
  createdAt: string;
}

export interface Budget {
  limit: number;
  duration: string; // e.g. "Monthly", "Weekly"
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  savings: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  isChecklist: boolean;
  checklistItems: ChecklistItem[];
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteShare {
  id: string;
  noteId: string;
  ownerId: string;
  sharedWithId: string;
  sharedWithEmail: string;
  sharedWithName?: string;
  createdAt: string;
}

export type ViewMode = 'dashboard' | 'activities' | 'all-activities' | 'tasks' | 'reminders' | 'events' | 'appointments' | 'budget' | 'ai-chat' | 'settings' | 'calendar' | 'routines' | 'day-planner' | 'notes' | 'debug-logs';

export type ViewSourceMode = 'personal' | 'partners' | 'combined';

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  budgetAlerts: boolean;
  reminderMinutesBefore: number;
  defaultNotificationSound?: NotificationSound; // Default Android channel for all tasks
}

// Routine Pattern Types
export type RoutinePatternType = 'weekday' | 'interval' | 'cycle';

export interface WeekdayPattern {
  type: 'weekday';
  days: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export interface IntervalPattern {
  type: 'interval';
  every: number; // Every N days
  startDate: string; // ISO date to count from
}

export interface CycleItem {
  name: string;
  color?: string; // Optional color for visual distinction
}

export interface CyclePattern {
  type: 'cycle';
  items: CycleItem[]; // e.g., [{name: "Push"}, {name: "Pull"}, {name: "Legs"}, {name: "Rest"}]
  startDate: string; // ISO date to start cycle from
}

export type RoutinePattern = WeekdayPattern | IntervalPattern | CyclePattern;

export interface Routine {
  id: string;
  name: string;
  description?: string;
  pattern: RoutinePattern;
  time?: string; // HH:mm format for when routine occurs
  duration?: number; // Duration in minutes
  isActive: boolean;
  notificationEnabled?: boolean;
  notificationMinutesBefore?: number;
  notificationTime?: string; // Absolute ISO date string for notification
  createdAt: string;
  updatedAt: string;
}

// ============ Day Planner Types ============

// Task link definition (soft or hard dependency)
export interface TaskLink {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  linkType: 'flow' | 'dependency'; // 'flow' = soft suggestion, 'dependency' = hard blocker
  sourceHandle?: string; // 'top' | 'bottom' | 'left' | 'right'
  targetHandle?: string; // 'top' | 'bottom' | 'left' | 'right'
}

// Visual layout position for task in flowchart
export interface TaskLayout {
  taskId: string;
  x: number; // X position in canvas
  y: number; // Y position in canvas
}

// Day plan template (reusable)
export interface DayPlanTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: Omit<Task, 'id' | 'user_id' | 'createdAt'>[]; // Task data without IDs
  links: Omit<TaskLink, 'id'>[]; // Links without IDs
  layout: Omit<TaskLayout, 'taskId'>[]; // Relative positions
  createdAt: string;
}

// Day plan for a specific date
export interface DayPlan {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  taskIds: string[]; // References to actual Task IDs
  links: TaskLink[]; // Connections between tasks  
  layout: TaskLayout[]; // Visual positions
  templateId?: string; // If created from template
  isRecurring?: boolean; // If part of recurring plan
  recurringConfig?: RecurrenceConfig;
  createdAt: string;
  updatedAt: string;
}

// ============ Database Response Types (snake_case from Supabase) ============

/** Database response for tasks table */
export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  reminder_time?: string;
  subtasks: SubTask[];
  tags: string[];
  type: TaskType;
  duration?: number;
  location?: string;
  dependency_ids: string[];
  is_shared: boolean;
  recurrence?: RecurrenceConfig;
  next_recurrence_date?: string;
  created_at: string;
  notification_enabled?: boolean;
  notification_minutes_before?: number;
  notification_time?: string;
  notification_sound_id?: NotificationSound;
}

/** Database response for transactions table */
export interface DbTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_due_date?: string;
  category?: string;
}

/** Database response for user_settings table */
export interface DbUserSettings {
  user_id: string;
  display_name?: string;
  theme?: ThemeOption;
  budget_limit?: number;
  budget_duration?: string;
  savings?: number;
}

/** Database response for budget_shares with joined profile */
export interface DbBudgetShare {
  id: string;
  owner_id?: string;
  partner_id: string;
  created_at: string;
  partner?: {
    id: string;
    email: string;
    full_name?: string;
  } | Array<{
    id: string;
    email: string;
    full_name?: string;
  }>;
}

/** Database response for notes table */
export interface DbNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_checklist: boolean;
  checklist_items: ChecklistItem[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

/** Database response for note_shares with joined profile */
export interface DbNoteShare {
  id: string;
  note_id: string;
  owner_id: string;
  shared_with_id: string;
  created_at: string;
  shared_with?: {
    id: string;
    email: string;
    full_name?: string;
  } | Array<{
    id: string;
    email: string;
    full_name?: string;
  }>;
}
