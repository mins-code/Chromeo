
import { LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Bot, Settings, Users, Wallet, Bell, Clock, FolderKanban, CalendarDays, LayoutGrid, Repeat } from 'lucide-react';

export const APP_NAME = "ChronoDeX";

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { 
    id: 'activities', 
    label: 'Activities', 
    icon: LayoutGrid,
    children: [
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'reminders', label: 'Reminders', icon: Bell },
      { id: 'events', label: 'Events', icon: CalendarDays },
      { id: 'appointments', label: 'Appointments', icon: Clock },
      { id: 'routines', label: 'Routines', icon: Repeat },
    ]
  },
  { id: 'budget', label: 'Budget Plan', icon: Wallet },
  { id: 'ai-chat', label: 'AI Assistant', icon: Bot },
];

export const PRIORITY_COLORS = {
  LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  HIGH: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const STATUS_COLORS = {
  TODO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  IN_PROGRESS: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  DONE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

// Query configuration for TanStack Query hooks
export const QUERY_CONFIG = {
  staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
  gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes (formerly cacheTime)
  refetchOnWindowFocus: true,
  retry: 2,
} as const;

// API configuration
export const API_CONFIG = {
  defaultTimeout: 10000, // 10 seconds
  maxRetries: 3,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  ROUTINES: 'chronodex_routines',
  NOTIFICATION_SETTINGS: 'chronodex_notification_settings',
  PARTNER: 'chronodex_partner',
} as const;

