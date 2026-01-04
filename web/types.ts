
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

export type ThemeOption = 'light' | 'dark' | 'cyberpunk' | 'sunset' | 'onepiece';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface RecurrenceConfig {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g. every 2 weeks
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

export interface Budget {
  limit: number;
  duration: string; // e.g. "Monthly", "Weekly"
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  savings: number;
}

export type ViewMode = 'dashboard' | 'activities' | 'all-activities' | 'tasks' | 'reminders' | 'events' | 'appointments' | 'budget' | 'ai-chat' | 'settings' | 'calendar' | 'routines';

export type ViewSourceMode = 'personal' | 'partners' | 'combined';

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  budgetAlerts: boolean;
  reminderMinutesBefore: number;
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
