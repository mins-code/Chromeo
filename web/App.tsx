
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Task, ViewMode, TaskStatus, Partner, TaskPriority, TaskType, ThemeOption, Budget, RecurringTransaction } from './types';
import * as TaskService from './services/taskService';
import * as BudgetService from './services/budgetService';
import * as SmsService from './services/smsService';
import { supabase } from './services/supabaseClient';
import TaskCard from './components/TaskCard';
import TaskEditor from './components/TaskEditor';
import AIChat from './components/AIChat';
import Stats from './components/Stats';
import BudgetPlanner from './components/BudgetPlanner';
import CalendarView from './components/CalendarView';
import Button from './components/Button';
import Input from './components/Input';
import Auth from './components/Auth';
import { Search, Filter, Users, Link2, Share2, HeartHandshake, CalendarClock, Sparkles, LogOut, Bell, Palette, Check, CheckCircle2, Zap, Anchor, Sun, Moon, CalendarDays, Clock, CheckSquare, Activity, ArrowRight, Repeat, AlertCircle, User, MessageSquare, Loader2 } from 'lucide-react';
import { enhanceTaskWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Theme State
  const [theme, setTheme] = useState<ThemeOption>('dark');
  const [username, setUsername] = useState('User');

  // State for creating task from calendar or create button
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);
  const [editorInitialType, setEditorInitialType] = useState<TaskType>('TASK');
  
  // Partner State
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerEmailInput, setPartnerEmailInput] = useState('');

  // Budget State
  const [budget, setBudget] = useState<Budget>({ limit: 0, duration: 'Monthly', transactions: [], recurring: [], savings: 0 });
  const [dueRecurringItems, setDueRecurringItems] = useState<RecurringTransaction[]>([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  
  // SMS Notification State
  const [lastSmsTransaction, setLastSmsTransaction] = useState<SmsService.ParsedSMS | null>(null);

  // Tag Filtering State for Calendar
  const [selectedCalendarTags, setSelectedCalendarTags] = useState<string[]>([]);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Auth Session Error:", error.message);
            }
            setSession(data?.session ?? null);
        } catch (err) {
            console.error("Auth Initialization Failed:", err);
            setSession(null);
        } finally {
            setIsAuthLoading(false);
        }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Data Loading
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
      setIsDataLoading(true);
      try {
        const loadedTasks = await TaskService.getTasks();
        setTasks(loadedTasks);
        
        // Initialize Tags
        const allUniqueTags = new Set<string>();
        loadedTasks.forEach(t => t.tags.forEach(tag => allUniqueTags.add(tag)));
        if(loadedTasks.some(t => t.tags.length === 0)) allUniqueTags.add('Untagged');
        setSelectedCalendarTags(Array.from(allUniqueTags));

        // Load Budget
        const loadedBudget = await BudgetService.getBudget();
        setBudget(loadedBudget);

        // Check Recurring
        const now = new Date();
        const due = loadedBudget.recurring.filter(r => new Date(r.nextDueDate) <= now);
        if (due.length > 0) {
            setDueRecurringItems(due);
            setShowRecurringModal(true);
        }

        // Get Display Name from DB (User Settings)
        if (session?.user) {
            const { data } = await supabase.from('user_settings').select('display_name, theme').eq('user_id', session.user.id).single();
            if (data?.display_name) setUsername(data.display_name);
            if (data?.theme) applyTheme(data.theme as ThemeOption, false);
            else {
                // Initial Load Theme from LocalStorage fallback or default
                const savedTheme = localStorage.getItem('chronodex_theme') as ThemeOption | null;
                applyTheme(savedTheme || 'dark', false);
            }
        }

      } catch (error) {
          console.error("Failed to load data", error);
      } finally {
          setIsDataLoading(false);
      }
  };

  // Setup SMS Listener
  useEffect(() => {
    const handleSmsEvent = async (event: CustomEvent) => {
        const { body, sender } = event.detail;
        if (body) {
            // Use processAndSaveSMS to ensure it goes to DB
            const parsed = await SmsService.processAndSaveSMS(body, sender || 'Unknown');
            if (parsed) {
                // Refresh budget to show new item
                const loadedBudget = await BudgetService.getBudget();
                setBudget(loadedBudget);
                
                setLastSmsTransaction(parsed);
                setTimeout(() => setLastSmsTransaction(null), 5000);
            }
        }
    };
    window.addEventListener('sms_received', handleSmsEvent as EventListener);
    return () => {
        window.removeEventListener('sms_received', handleSmsEvent as EventListener);
    };
  }, []); 

  const handleProcessRecurring = async (id: string) => {
      const updatedBudget = await BudgetService.processRecurringTransaction(id);
      setBudget(updatedBudget);
      setDueRecurringItems(prev => prev.filter(item => item.id !== id));
      if (dueRecurringItems.length <= 1) {
          setShowRecurringModal(false);
      }
  };

  const handleDismissRecurring = () => {
      setShowRecurringModal(false);
  };

  const applyTheme = (newTheme: ThemeOption, saveToDb = true) => {
      setTheme(newTheme);
      localStorage.setItem('chronodex_theme', newTheme);
      
      document.documentElement.classList.remove('dark', 'theme-cyberpunk', 'theme-sunset', 'theme-onepiece');
      
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else if (newTheme !== 'light') document.documentElement.classList.add('dark', `theme-${newTheme}`);

      if (saveToDb && session?.user) {
          supabase.from('user_settings').upsert({ user_id: session.user.id, theme: newTheme }).then();
      }
  };

  const handleUsernameChange = (name: string) => {
      setUsername(name);
      if (session?.user) {
          supabase.from('user_settings').upsert({ user_id: session.user.id, display_name: name }).then();
      }
  };

  const handleCreateTask = (initialDate?: Date, type: TaskType = 'TASK') => {
    setEditingTask(undefined);
    setCalendarSelectedDate(initialDate);
    setEditorInitialType(type);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setCalendarSelectedDate(undefined);
    setEditorInitialType(task.type);
    setIsEditorOpen(true);
  };

  const handleEditDraft = (taskData: Partial<Task>) => {
    setEditingTask(taskData as Task);
    setCalendarSelectedDate(undefined);
    setEditorInitialType(taskData.type || 'TASK');
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    let savedTask: Task | null = null;

    if (taskData.id) {
        savedTask = await TaskService.updateTask(taskData as Task);
        if (savedTask) {
             setTasks(prev => prev.map(t => t.id === savedTask!.id ? savedTask! : t));
        }
    } else {
        savedTask = await TaskService.createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
        if (savedTask) {
             setTasks(prev => [savedTask!, ...prev]);
        }
    }

    if (savedTask && savedTask.tags) {
        setSelectedCalendarTags(prev => {
            const newTags = savedTask!.tags.filter(t => !prev.includes(t));
            return [...prev, ...newTags];
        });
    }
  };

  const handleDeleteTask = async (id: string) => {
      const success = await TaskService.deleteTask(id);
      if (success) {
          setTasks(prev => prev.filter(t => t.id !== id));
          setIsEditorOpen(false);
      }
  };

  const handleToggleStatus = async (task: Task) => {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      const updated = await TaskService.updateTask({ ...task, status: newStatus });
      if (updated) {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
  };

  // Computed Values needed for AI context
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    if(tasks.some(t => t.tags.length === 0)) tags.add('Untagged');
    return Array.from(tags).sort();
  }, [tasks]);

  const handleAIAnalysis = async (task: Task) => {
       const enhanced = await enhanceTaskWithAI(task.title, allTags);
       if (enhanced && enhanced.subtasks) {
           const subtasks = enhanced.subtasks.map(s => ({
               id: crypto.randomUUID(),
               title: s.title,
               isCompleted: false
           }));
           const updatedTask = await TaskService.updateTask({ ...task, subtasks: [...task.subtasks, ...subtasks] });
           if(updatedTask) {
               setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
           }
       }
  };

  const handleAutoCreatedTask = async (taskData: Partial<Task>) => {
      const newTask = await TaskService.createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
      if (newTask) {
          setTasks(prev => [newTask, ...prev]);
          if (newTask.tags && Array.isArray(newTask.tags)) {
            setSelectedCalendarTags(prev => {
                const newTags = newTask.tags.filter(t => !prev.includes(t));
                return [...prev, ...newTags];
            });
          }
      }
  };
  
  const handleToggleCalendarTag = (tag: string) => {
      setSelectedCalendarTags(prev => 
          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag) return;
    const finalTag = newTag.trim();

    // Optimistic Update
    setTasks(prev => prev.map(t => {
        if (t.tags.includes(oldTag)) {
            const newTags = t.tags.map(tag => tag === oldTag ? finalTag : tag);
            return { ...t, tags: [...new Set(newTags)] };
        }
        return t;
    }));
    
    // Server Update (Fire and forget loop)
    tasks.forEach(async (t) => {
        if (t.tags.includes(oldTag)) {
             const newTags = t.tags.map(tag => tag === oldTag ? finalTag : tag);
             const uniqueTags = [...new Set(newTags)];
             await TaskService.updateTask({ ...t, tags: uniqueTags });
        }
    });

    setSelectedCalendarTags(prev => {
        if (prev.includes(oldTag)) {
            const others = prev.filter(t => t !== oldTag);
            return [...others, finalTag];
        }
        return prev;
    });
  };

  const handleBudgetUpdate = async (newBudget: Budget) => {
      setBudget(newBudget);
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setTasks([]);
      setSession(null);
  };

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          if (currentView === 'tasks' && t.type !== 'TASK') return false;
          if (currentView === 'events' && t.type !== 'EVENT') return false;
          if (currentView === 'appointments' && t.type !== 'APPOINTMENT') return false;
          if (currentView === 'reminders' && t.type !== 'REMINDER') return false;

          const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
          return matchesSearch && matchesStatus;
      });
  }, [tasks, searchQuery, filterStatus, currentView]);

  const calendarFilteredTasks = useMemo(() => {
      return tasks.filter(t => {
          if (t.tags.length === 0) {
              return selectedCalendarTags.includes('Untagged');
          }
          return t.tags.some(tag => selectedCalendarTags.includes(tag));
      });
  }, [tasks, selectedCalendarTags]);

  const sortedTodoTasks = useMemo(() => {
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
  
  const getTopItem = (type: TaskType) => {
    return tasks
      .filter(t => t.type === type && t.status !== TaskStatus.DONE)
      .sort((a, b) => {
         const pWeight = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
         if (pWeight[a.priority] !== pWeight[b.priority]) return pWeight[b.priority] - pWeight[a.priority];
         
         const dateA = a.dueDate || a.reminderTime || (Number.MAX_SAFE_INTEGER + '');
         const dateB = b.dueDate || b.reminderTime || (Number.MAX_SAFE_INTEGER + '');
         return new Date(dateA).getTime() - new Date(dateB).getTime();
      })[0];
  }

  // Budget Calculations
  const totalExpenses = budget.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const budgetRemaining = budget.limit - totalExpenses;

  const userStats = {
      userName: username,
      pendingTasks: sortedTodoTasks.length,
      totalTasks: tasks.length,
      budgetRemaining: budgetRemaining,
      partnerName: partner?.name
  };
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const getHeaderInfo = () => {
      switch(currentView) {
          case 'reminders': return { title: 'Reminders', subtitle: 'Don\'t forget these important items', icon: Bell };
          case 'events': return { title: 'Events', subtitle: 'Upcoming social and work gatherings', icon: CalendarDays };
          case 'appointments': return { title: 'Appointments', subtitle: 'Scheduled meetings and visits', icon: Clock };
          case 'tasks': return { title: 'My Tasks', subtitle: 'Manage and track your daily activities', icon: CheckSquare };
          default: return { title: 'Items', subtitle: 'List View', icon: CheckSquare };
      }
  };

  const headerInfo = getHeaderInfo();
  const HeaderIcon = headerInfo.icon;

  // -- RENDER STATES --

  if (isAuthLoading) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-brand-500">
              <Loader2 size={48} className="animate-spin" />
          </div>
      );
  }

  if (!session) {
      return <Auth />;
  }

  if (isDataLoading && tasks.length === 0) { // Only show full loader on initial fetch
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-brand-500 gap-4">
             <Loader2 size={48} className="animate-spin" />
             <p className="text-slate-400 text-sm animate-pulse">Syncing your ChronoDeX...</p>
        </div>
      );
  }

  return (
    <Layout 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onAddTask={(type) => handleCreateTask(undefined, type)}
        userStats={userStats}
        currentTheme={theme}
        onThemeChange={(t) => applyTheme(t, true)}
        calendarTags={allTags}
        selectedTags={selectedCalendarTags}
        onToggleTag={handleToggleCalendarTag}
        onRenameTag={handleRenameTag}
    >
        {/* SMS Notification Toast */}
        {lastSmsTransaction && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-brand-500 animate-slide-up max-w-sm w-full">
                <div className={`p-2 rounded-full ${lastSmsTransaction.type === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <MessageSquare size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase text-slate-400">New {lastSmsTransaction.type} Detected</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{lastSmsTransaction.description}</p>
                    <p className={`text-lg font-bold ${lastSmsTransaction.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {lastSmsTransaction.type === 'expense' ? '-' : '+'}{lastSmsTransaction.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </p>
                </div>
                <button onClick={() => setLastSmsTransaction(null)} className="text-slate-400 hover:text-slate-600">
                    <ArrowRight size={18} />
                </button>
            </div>
        )}

        {/* Recurring Transactions Modal */}
        {showRecurringModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-in">
                    <div className="p-6 bg-brand-500 text-white">
                        <div className="flex items-center gap-3">
                            <Repeat size={24} />
                            <h3 className="text-xl font-bold">Recurring Items Due</h3>
                        </div>
                        <p className="opacity-90 mt-1 text-sm">The following items are due for processing.</p>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {dueRecurringItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">{item.description}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <span className={item.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>
                                            {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </span>
                                        <span>• {item.frequency}</span>
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => handleProcessRecurring(item.id)}>
                                    Confirm
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                        <Button variant="ghost" onClick={handleDismissRecurring}>Close</Button>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
                    <div>
                        <p className="text-brand-500 font-medium text-sm mb-1 uppercase tracking-wide flex items-center gap-2">
                             <CalendarClock size={16} /> {today}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Good Day, {username}.</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">You have {sortedTodoTasks.length} pending tasks today.</p>
                    </div>
                    <div className="hidden md:block">
                        <Button variant="secondary" onClick={() => setCurrentView('tasks')}>View All Tasks</Button>
                    </div>
                </header>
                
                <Stats tasks={tasks} onNavigate={setCurrentView} />

                <div className="pt-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">Recent Priorities</h3>
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider bg-black/5 dark:bg-white/5 px-2 py-1 rounded">Sorted by Urgency</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {sortedTodoTasks.slice(0, 4).map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                allTasks={tasks}
                                onEdit={handleEditTask}
                                onToggleStatus={handleToggleStatus}
                                onAIAnalysis={handleAIAnalysis}
                            />
                        ))}
                         {sortedTodoTasks.length === 0 && (
                             <div className="col-span-full py-16 text-center bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 border-dashed rounded-2xl backdrop-blur-sm">
                                 <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500">
                                     <Sparkles size={32} />
                                 </div>
                                 <h4 className="text-slate-800 dark:text-slate-200 font-semibold text-lg">All caught up!</h4>
                                 <p className="text-slate-500 mt-1">Enjoy your free time or start something new.</p>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: ACTIVITIES */}
        {currentView === 'activities' && (
             <div className="space-y-8 animate-fade-in h-full">
                 <header className="border-b border-slate-200 dark:border-white/5 pb-6">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-3">
                        <Activity className="text-brand-500" size={32} />
                        Activities
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Overview of your organized items.</p>
                 </header>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[
                         { id: 'tasks', label: 'Tasks', icon: CheckSquare, type: 'TASK' as TaskType, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                         { id: 'reminders', label: 'Reminders', icon: Bell, type: 'REMINDER' as TaskType, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                         { id: 'events', label: 'Events', icon: CalendarDays, type: 'EVENT' as TaskType, color: 'text-brand-500', bg: 'bg-brand-500/10' },
                         { id: 'appointments', label: 'Appointments', icon: Clock, type: 'APPOINTMENT' as TaskType, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                     ].map(cat => {
                         const topItem = getTopItem(cat.type);
                         const count = tasks.filter(t => t.type === cat.type && t.status !== TaskStatus.DONE).length;
                         const Icon = cat.icon;

                         return (
                            <div 
                                key={cat.id}
                                onClick={() => setCurrentView(cat.id as ViewMode)}
                                className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-64"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${cat.bg} ${cat.color} mb-2`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 transition-transform duration-300 group-hover:-translate-x-7">
                                        {count} Pending
                                    </div>
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{cat.label}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Manage your {cat.label.toLowerCase()}
                                </p>

                                {topItem ? (
                                    <div className="mt-auto bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            topItem.priority === TaskPriority.HIGH ? 'bg-red-500' :
                                            topItem.priority === TaskPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{topItem.title}</p>
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
                         )
                     })}
                 </div>
             </div>
        )}

        {/* VIEW: LISTS */}
        {(currentView === 'tasks' || currentView === 'reminders' || currentView === 'events' || currentView === 'appointments') && (
            <div className="space-y-6 h-full flex flex-col animate-fade-in">
                <header className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center border-b border-slate-200 dark:border-white/5 pb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <HeaderIcon className="text-brand-500" size={32} />
                            {headerInfo.title}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {headerInfo.subtitle}
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                            />
                        </div>
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-sm"
                        >
                            <option value="ALL">All Status</option>
                            <option value={TaskStatus.TODO}>To Do</option>
                            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                            <option value={TaskStatus.DONE}>Done</option>
                        </select>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-4 pb-20">
                     {filteredTasks.map(task => (
                         <TaskCard 
                            key={task.id} 
                            task={task} 
                            allTasks={tasks} 
                            onEdit={handleEditTask} 
                            onToggleStatus={handleToggleStatus}
                            onAIAnalysis={handleAIAnalysis}
                        />
                     ))}
                     {filteredTasks.length === 0 && (
                         <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white/40 dark:bg-dark-surface/30 rounded-2xl border border-slate-200 dark:border-white/5 border-dashed">
                             <Filter size={48} className="mb-4 opacity-20" />
                             <p className="font-medium">No {currentView} found matching your filters.</p>
                             <Button variant="ghost" onClick={() => {setSearchQuery(''); setFilterStatus('ALL')}} className="mt-2 text-brand-500">Clear Filters</Button>
                         </div>
                     )}
                </div>
            </div>
        )}

        {/* VIEW: CALENDAR */}
        {currentView === 'calendar' && (
            <CalendarView 
                tasks={calendarFilteredTasks}
                onDateClick={(date) => handleCreateTask(date)}
                onEditTask={handleEditTask}
            />
        )}
        
        {/* VIEW: BUDGET */}
        {currentView === 'budget' && (
            <BudgetPlanner budget={budget} onUpdate={handleBudgetUpdate} />
        )}

        {/* VIEW: AI CHAT */}
        {currentView === 'ai-chat' && (
            <div className="h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-slate-50/50 dark:bg-dark-bg/50 animate-fade-in relative">
                <AIChat 
                    onConfirmTask={handleAutoCreatedTask} 
                    onEditTask={handleEditDraft}
                    userName={username} 
                    existingTags={allTags} 
                />
            </div>
        )}

         {/* VIEW: SETTINGS */}
         {currentView === 'settings' && (
            <div className="space-y-8 animate-fade-in h-full flex flex-col">
                 <header className="border-b border-slate-200 dark:border-white/5 pb-6">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your preferences, account, and team.</p>
                 </header>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto pb-20">
                     {/* Profile Settings */}
                     <div className="col-span-1 lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
                             <User className="text-brand-500" />
                             <h3>Profile</h3>
                         </div>
                         <div className="bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Profile Settings</h4>
                            <Input 
                                label="Display Name / Nickname"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                placeholder="How should we call you?"
                            />
                             <div className="mt-4">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1 font-mono">Account</label>
                                <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">Logged in as {session?.user?.email}</p>
                                <Button variant="secondary" onClick={handleSignOut} className="w-auto border-red-500/20 text-red-500 hover:bg-red-500/10">
                                    <LogOut size={16} className="mr-2" /> Sign Out
                                </Button>
                             </div>
                         </div>
                     </div>

                    <div className="col-span-1 lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
                             <Palette className="text-brand-500" />
                             <h3>Appearance</h3>
                         </div>
                         <div className="bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Select Theme</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {['dark', 'light', 'cyberpunk', 'sunset', 'onepiece'].map((t) => (
                                    <button 
                                    key={t}
                                    onClick={() => applyTheme(t as ThemeOption)}
                                    className={`relative p-4 rounded-xl border-2 transition-all group overflow-hidden ${theme === t ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-white/10 hover:border-brand-500/50'}`}
                                >
                                    <div className={`h-20 rounded-lg mb-3 border shadow-inner flex items-center justify-center ${
                                        t === 'dark' ? 'bg-[#020617] border-white/10' : 
                                        t === 'light' ? 'bg-slate-50 border-slate-200' :
                                        t === 'cyberpunk' ? 'bg-[#050505] border-pink-500/30' :
                                        t === 'sunset' ? 'bg-[#4c0519] border-rose-500/30' :
                                        'bg-[#0c4a6e] border-yellow-500/30'
                                    }`}>
                                        {t === 'dark' ? <Moon className="text-blue-500" /> :
                                         t === 'light' ? <Sun className="text-orange-400" /> :
                                         t === 'cyberpunk' ? <Zap className="text-pink-500" /> :
                                         t === 'sunset' ? <Sun className="text-rose-400" /> :
                                         <Anchor className="text-yellow-400" />}
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{t}</p>
                                    {theme === t && <div className="absolute top-2 right-2 text-brand-500"><CheckCircle2 size={16} /></div>}
                                </button>
                                ))}
                            </div>
                         </div>
                    </div>
                 </div>
            </div>
        )}

        <TaskEditor 
            isOpen={isEditorOpen} 
            onClose={() => setIsEditorOpen(false)} 
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
            task={editingTask}
            availableTasks={tasks} 
            initialDate={calendarSelectedDate} 
            initialType={editorInitialType}
        />

    </Layout>
  );
};

export default App;
