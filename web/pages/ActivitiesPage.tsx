import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskType, TaskStatus, TaskPriority, ViewMode } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useRoutines } from '../hooks/useRoutines';
import { Activity, CheckSquare, Bell, CalendarDays, Clock, ArrowRight, Repeat } from 'lucide-react';

const viewModeToPath: Record<ViewMode, string> = {
  'dashboard': '/',
  'activities': '/activities',
  'tasks': '/tasks',
  'reminders': '/reminders',
  'events': '/events',
  'appointments': '/appointments',
  'calendar': '/calendar',
  'budget': '/budget',
  'ai-chat': '/ai-chat',
  'settings': '/settings',
  'routines': '/routines',
};

// Using null for type on routines since it's not a TaskType
const ACTIVITY_CATEGORIES = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, type: 'TASK' as TaskType, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'reminders', label: 'Reminders', icon: Bell, type: 'REMINDER' as TaskType, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'events', label: 'Events', icon: CalendarDays, type: 'EVENT' as TaskType, color: 'text-brand-500', bg: 'bg-brand-500/10' },
  { id: 'appointments', label: 'Appointments', icon: Clock, type: 'APPOINTMENT' as TaskType, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'routines', label: 'Routines', icon: Repeat, type: null as unknown as TaskType, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const ActivitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { routines } = useRoutines();

  const getTopItem = (type: TaskType | null): Task | undefined => {
    if (!type) return undefined; // Routines don't have tasks
    return tasks
      .filter(t => t.type === type && t.status !== TaskStatus.DONE)
      .sort((a, b) => {
        const pWeight = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
        if (pWeight[a.priority] !== pWeight[b.priority]) {
          return pWeight[b.priority] - pWeight[a.priority];
        }
        const dateA = a.dueDate || a.reminderTime || String(Number.MAX_SAFE_INTEGER);
        const dateB = b.dueDate || b.reminderTime || String(Number.MAX_SAFE_INTEGER);
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })[0];
  };

  const getCount = (cat: typeof ACTIVITY_CATEGORIES[0]) => {
    if (cat.id === 'routines') {
      return routines.filter(r => r.isEnabled).length;
    }
    return tasks.filter(t => t.type === cat.type && t.status !== TaskStatus.DONE).length;
  };

  return (
    <div className="space-y-8 animate-fade-in h-full">
      <header className="border-b border-slate-200 dark:border-white/5 pb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-3">
          <Activity className="text-brand-500" size={32} />
          Activities
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Overview of your organized items.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACTIVITY_CATEGORIES.map(cat => {
          const isRoutines = cat.id === 'routines';
          const topItem = isRoutines ? undefined : getTopItem(cat.type);
          const count = getCount(cat);
          const Icon = cat.icon;

          return (
            <div
              key={cat.id}
              onClick={() => navigate(viewModeToPath[cat.id as ViewMode])}
              className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-64"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${cat.bg} ${cat.color} mb-2`}>
                  <Icon size={24} />
                </div>
                <div className="bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 transition-transform duration-300 group-hover:-translate-x-7">
                  {isRoutines ? `${count} Active` : `${count} Pending`}
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                {cat.label}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {isRoutines ? 'Manage recurring activities' : `Manage your ${cat.label.toLowerCase()}`}
              </p>

              {isRoutines ? (
                <div className="mt-auto bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {count > 0 ? `${count} active routine${count > 1 ? 's' : ''}` : 'No routines yet'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Set up recurring schedules
                    </p>
                  </div>
                </div>
              ) : topItem ? (
                <div className="mt-auto bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    topItem.priority === TaskPriority.HIGH ? 'bg-red-500' :
                    topItem.priority === TaskPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {topItem.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {topItem.dueDate || topItem.reminderTime
                        ? new Date(topItem.dueDate || topItem.reminderTime!).toLocaleDateString()
                        : 'No Date'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-auto h-14 flex items-center justify-center text-slate-400 text-sm italic bg-white/30 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                  No pending items
                </div>
              )}

              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 text-slate-400">
                <ArrowRight size={20} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivitiesPage;
