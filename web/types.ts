
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
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
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

export interface Budget {
  limit: number;
  duration: string; // e.g. "Monthly", "Weekly"
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  savings: number;
}

export type ViewMode = 'dashboard' | 'activities' | 'tasks' | 'reminders' | 'events' | 'appointments' | 'budget' | 'ai-chat' | 'settings' | 'calendar';
