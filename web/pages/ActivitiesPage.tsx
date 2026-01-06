import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskType, TaskStatus, TaskPriority, ViewMode } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useRoutines } from '../hooks/useRoutines';
import { useBudget } from '../hooks/useBudget';
import { useTheme } from '../context/ThemeContext';
import TaskCard from '../components/TaskCard';
import Stats from '../components/Stats';
import Button from '../components/Button';
import { Activity, CheckSquare, Bell, CalendarDays, Clock, ArrowRight, Repeat, CalendarClock, Sparkles } from 'lucide-react';
import { getGreeting, t } from '../themeText';
import { enhanceTaskWithAI } from '../services/geminiService';

const viewModeToPath: Record<ViewMode, string> = {
  'dashboard': '/',
  'activities': '/activities',
  'all-activities': '/all-activities',
  'tasks': '/tasks',
  'reminders': '/reminders',
  'events': '/events',
  'appointments': '/appointments',
  'calendar': '/calendar',
  'budget': '/budget',
  'ai-chat': '/ai-chat',
  'settings': '/settings',
  'routines': '/routines',
  'day-planner': '/day-planner',
  'notes': '/notes',
};

// Function to get activity categories with themed labels
const getActivityCategories = (theme: string) => [
  { id: 'tasks', label: t(theme as any, 'tasks'), icon: CheckSquare, type: 'TASK' as TaskType, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'reminders', label: t(theme as any, 'reminders'), icon: Bell, type: 'REMINDER' as TaskType, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'events', label: t(theme as any, 'events'), icon: CalendarDays, type: 'EVENT' as TaskType, color: 'text-brand-500', bg: 'bg-brand-500/10' },
  { id: 'appointments', label: t(theme as any, 'appointments'), icon: Clock, type: 'APPOINTMENT' as TaskType, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'routines', label: 'Routines', icon: Repeat, type: null as unknown as TaskType, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

interface ActivitiesPageProps {
  username: string;
  onEditTask: (task: Task) => void;
}

const ActivitiesPage: React.FC<ActivitiesPageProps> = ({ username, onEditTask }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { tasks, updateTask, toggleStatus } = useTasks();
  const { routines } = useRoutines();
  const { budget } = useBudget();

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Compute sorted tasks by urgency (from dashboard)
  const sortedTodoTasks = React.useMemo(() => {
    const getTaskScore = (t: Task) => {
      let score = 0;
      if (t.priority === TaskPriority.HIGH) score += 100;
      else if (t.priority === TaskPriority.MEDIUM) score += 50;
      else score += 10;

      const dateStr = t.dueDate || t.reminderTime;
      if (dateStr) {
        const due = new Date(dateStr).getTime();
        const now = Date.now();
        const diffHours = (due - now) / (1000 * 60 * 60);

        if (diffHours < 0) score += 200;
        else if (diffHours < 24) score += 150;
        else if (diffHours < 72) score += 80;
        else if (diffHours < 168) score += 40;
      }
      if (t.status === TaskStatus.IN_PROGRESS) score += 20;
      return score;
    };

    return tasks
      .filter(t => t.status !== TaskStatus.DONE)
      .sort((a, b) => getTaskScore(b) - getTaskScore(a));
  }, [tasks]);

  // Get all tags for AI analysis
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tasks]);

  const handleToggleStatus = async (task: Task) => {
    await toggleStatus(task);
  };

  const handleAIAnalysis = async (task: Task) => {
    const enhanced = await enhanceTaskWithAI(task.title, allTags);
    if (enhanced?.subtasks) {
      const subtasks = enhanced.subtasks.map(s => ({
        id: crypto.randomUUID(),
        title: s.title,
        isCompleted: false
      }));
      await updateTask({ ...task, subtasks: [...task.subtasks, ...subtasks] });
    }
  };

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

  const getCount = (cat: ReturnType<typeof getActivityCategories>[0]) => {
    if (cat.id === 'routines') {
      return routines.filter(r => r.isEnabled).length;
    }
    return tasks.filter(t => t.type === cat.type && t.status !== TaskStatus.DONE).length;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
        <div>
          <p className="text-brand-500 font-medium text-sm mb-1 uppercase tracking-wide flex items-center gap-2">
            <CalendarClock size={16} /> {today}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {getGreeting(theme, username)}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            You have {sortedTodoTasks.length} pending tasks today.
          </p>
        </div>
        <div className="hidden md:block">
          <Button variant="secondary" onClick={() => navigate('/all-activities')}>
            View All Activities
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <Stats 
        tasks={tasks} 
        budget={budget} 
        onNavigate={(view) => navigate(viewModeToPath[view])} 
      />

      {/* Recent Priorities Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">
            Recent Priorities
          </h3>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
            Sorted by Urgency
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sortedTodoTasks.slice(0, 4).map(task => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={tasks}
              onEdit={onEditTask}
              onToggleStatus={handleToggleStatus}
              onAIAnalysis={handleAIAnalysis}
            />
          ))}
          {sortedTodoTasks.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 border-dashed rounded-2xl backdrop-blur-sm">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500">
                <Sparkles size={32} />
              </div>
              <h4 className="text-slate-800 dark:text-slate-200 font-semibold text-lg">
                All caught up!
              </h4>
              <p className="text-slate-500 mt-1">
                Enjoy your free time or start something new.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activities Section Header */}
      <div className="pt-6 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-brand-500" size={24} />
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">
            Activities Overview
          </h3>
        </div>

        {/* Activity Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getActivityCategories(theme).map(cat => {
            const isRoutines = cat.id === 'routines';
            const topItem = isRoutines ? undefined : getTopItem(cat.type);
            const count = getCount(cat);
            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                onClick={() => navigate(viewModeToPath[cat.id as ViewMode])}
                className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-56"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${cat.bg} ${cat.color} mb-2`}>
                    <Icon size={24} />
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
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
    </div>
  );
};

export default ActivitiesPage;
