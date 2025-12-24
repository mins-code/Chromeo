
import { LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Bot, Settings, Users, Wallet, Bell, Clock, FolderKanban, CalendarDays, LayoutGrid } from 'lucide-react';

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
