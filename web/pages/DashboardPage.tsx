import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskType, TaskStatus, TaskPriority, Budget, ViewMode } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useBudget } from '../hooks/useBudget';
import { useTheme } from '../context/ThemeContext';
import TaskCard from '../components/TaskCard';
import Stats from '../components/Stats';
import Button from '../components/Button';
import { CalendarClock, Sparkles } from 'lucide-react';
import { getGreeting } from '../themeText';
import { enhanceTaskWithAI } from '../services/geminiService';

interface DashboardPageProps {
  username: string;
  onEditTask: (task: Task) => void;
}

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

const DashboardPage: React.FC<DashboardPageProps> = ({ username, onEditTask }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { tasks, updateTask, toggleStatus } = useTasks();
  const { budget } = useBudget();

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Compute sorted tasks by urgency
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

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
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
          <Button variant="secondary" onClick={() => navigate('/tasks')}>
            View All Tasks
          </Button>
        </div>
      </header>

      <Stats 
        tasks={tasks} 
        budget={budget} 
        onNavigate={(view) => navigate(viewModeToPath[view])} 
      />

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
    </div>
  );
};

export default DashboardPage;
