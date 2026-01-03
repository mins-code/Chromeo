
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Task, ViewMode, TaskStatus, Partner, TaskPriority, TaskType, ThemeOption, Budget, RecurringTransaction, ViewSourceMode } from './types';
import * as TaskService from './services/taskService';
import * as SmsService from './services/smsService';
import { supabase } from './services/supabaseClient';
import TaskCard from './components/TaskCard';
import TaskEditor from './components/TaskEditor';
import Stats from './components/Stats';
import Button from './components/Button';
import Input from './components/Input';
import Auth from './components/Auth';
import CollaborationSettings from './components/CollaborationSettings';
import { Search, Filter, Users, Link2, Share2, HeartHandshake, CalendarClock, Sparkles, LogOut, Bell, Palette, Check, CheckCircle2, Zap, Anchor, Sun, Moon, CalendarDays, Clock, CheckSquare, Activity, ArrowRight, Repeat, AlertCircle, User, MessageSquare, Loader2, X, AlertTriangle, Trash2 } from 'lucide-react';
import { enhanceTaskWithAI } from './services/geminiService';
import { ParsedTaskData } from './services/geminiService';
import { getGreeting, t } from './themeText';
import CommandBar from './components/CommandBar';

// Lazy load heavy components for better initial bundle size
const AIChat = lazy(() => import('./components/AIChat'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner'));

// Import new hooks and contexts
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useTasks } from './hooks/useTasks';
import { useBudget } from './hooks/useBudget';
import { useUserSettings } from './hooks/useUserSettings';
import { useRoutines } from './hooks/useRoutines';
import * as PartnerService from './services/partnerService';
import * as NotificationService from './services/notificationService';
import { NotificationSettings, Routine } from './types';
import RoutineEditor from './components/RoutineEditor';
import RoutineList from './components/RoutineList';

// Custom Hooks
import { useSMSListener } from './hooks/useSMSListener';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { useRecurringProcessor } from './hooks/useRecurringProcessor';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Import page components
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';

// Map URL paths to ViewMode for Layout compatibility
const pathToViewMode: Record<string, ViewMode> = {
    '/': 'activities',
    '/activities': 'activities',
    '/tasks': 'tasks',
    '/reminders': 'reminders',
    '/events': 'events',
    '/appointments': 'appointments',
    '/calendar': 'calendar',
    '/budget': 'budget',
    '/ai-chat': 'ai-chat',
    '/settings': 'settings',
    '/routines': 'routines',
};

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

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentView: ViewMode = pathToViewMode[location.pathname] || 'dashboard';

    // Use new contexts and hooks
    const { session, isAuthLoading, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const { 
        tasks, 
        isLoading: isTasksLoading, 
        createTask, 
        updateTask, 
        deleteTask, 
        toggleStatus 
    } = useTasks();
    const { 
        budget, 
        isLoading: isBudgetLoading, 
        refetch: refetchBudget, 
        processRecurring 
    } = useBudget();
    
    // Network Status
    const isOnline = useNetworkStatus();

    // Local UI state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Username state
    const [username, setUsername] = useState('User');

    // State for creating task from calendar or create button
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);
    const [editorInitialType, setEditorInitialType] = useState<TaskType>('TASK');

    // Partner State
    const [partner, setPartner] = useState<Partner | null>(null);

    // Tag Filtering State for Calendar
    const [selectedCalendarTags, setSelectedCalendarTags] = useState<string[]>([]);

    // Command Bar State (Cmd+K)
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

    // AI Chat Modal State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);

    // Calendar Navigate Date State
    const [calendarNavigateDate, setCalendarNavigateDate] = useState<Date | undefined>(undefined);

    // View Source Mode State - persisted to localStorage, defaults to 'combined'
    const [viewSourceMode, setViewSourceMode] = useState<ViewSourceMode>(() => {
        const saved = localStorage.getItem('viewSourceMode');
        return (saved as ViewSourceMode) || 'combined';
    });
    const handleViewSourceModeChange = (mode: ViewSourceMode) => {
        setViewSourceMode(mode);
        localStorage.setItem('viewSourceMode', mode);
    };
    const [hasConnectedPartners, setHasConnectedPartners] = useState(false);

    // Notification Settings State
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
        NotificationService.getSettings()
    );

    // Routine State
    const { 
        routines, 
        saveRoutine: saveRoutineHook, 
        deleteRoutine: deleteRoutineHook, 
        toggleRoutine: toggleRoutineHook 
    } = useRoutines();
    const [isRoutineEditorOpen, setIsRoutineEditorOpen] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>(undefined);

    // --- CUSTOM HOOKS INTEGRATION ---

    // SMS Listener
    const { lastSmsTransaction, setLastSmsTransaction } = useSMSListener();

    // Notification Scheduler
    const { 
        notificationPermission,
        handleNotificationToggle, 
        handleNotificationPreferenceChange 
    } = useNotificationScheduler(tasks, notificationSettings, setNotificationSettings);

    // Recurring Processor
    const { 
        dueRecurringItems, 
        showRecurringModal, 
        handleProcessRecurring, 
        handleDismissRecurring 
    } = useRecurringProcessor();

    // --- END HOOKS ---

    // Load username when session changes
    useEffect(() => {
        const loadUsername = async () => {
            if (session?.user) {
                const { data } = await supabase
                    .from('user_settings')
                    .select('display_name')
                    .eq('user_id', session.user.id)
                    .single();
                if (data?.display_name) {
                    setUsername(data.display_name);
                }
            }
        };
        loadUsername();
    }, [session]);

    // Check for connected partners
    useEffect(() => {
        const checkPartners = async () => {
            if (session?.user) {
                const partnerships = await PartnerService.getPartnerships();
                const acceptedPartners = partnerships.filter(p => p.status === 'accepted');
                setHasConnectedPartners(acceptedPartners.length > 0);
                
                if (acceptedPartners.length > 0) {
                    const firstPartner = acceptedPartners[0];
                    setPartner({
                        id: firstPartner.partnerId,
                        name: firstPartner.partnerName || firstPartner.partnerEmail,
                        email: firstPartner.partnerEmail,
                        isConnected: true
                    });
                } else {
                    setPartner(null);
                }
            }
        };
        checkPartners();
    }, [session]);

    // Initialize calendar tags
    useEffect(() => {
        if (tasks.length > 0) {
            const allUniqueTags = new Set<string>();
            tasks.forEach(t => t.tags.forEach(tag => allUniqueTags.add(tag)));
            if (tasks.some(t => t.tags.length === 0)) allUniqueTags.add('Untagged');
            const sortedTags = Array.from(allUniqueTags).sort((a, b) => {
                if (a === 'Untagged') return -1;
                if (b === 'Untagged') return 1;
                return a.localeCompare(b);
            });
            setSelectedCalendarTags(sortedTags);
        }
    }, [tasks]);

    // Global Cmd+K keyboard listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandBarOpen(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Routine Handlers
    const handleSaveRoutine = (routine: Routine) => {
        saveRoutineHook(routine);
        setIsRoutineEditorOpen(false);
        setEditingRoutine(undefined);
    };

    const handleDeleteRoutine = (id: string) => {
        deleteRoutineHook(id);
        setIsRoutineEditorOpen(false);
        setEditingRoutine(undefined);
    };

    const handleToggleRoutine = (id: string) => {
        toggleRoutineHook(id);
    };

    const handleCreateRoutine = () => {
        setEditingRoutine(undefined);
        setIsRoutineEditorOpen(true);
    };

    const handleEditRoutine = (routine: Routine) => {
        setEditingRoutine(routine);
        setIsRoutineEditorOpen(true);
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

    // Handler for Command Bar parsed task data
    const handleCommandBarTask = (parsedData: ParsedTaskData) => {
        const taskDraft: Partial<Task> = {
            title: parsedData.title,
            type: parsedData.type,
            dueDate: parsedData.dueDate,
            reminderTime: parsedData.reminderTime,
            description: parsedData.description,
            priority: parsedData.priority === 'HIGH' ? TaskPriority.HIGH :
                      parsedData.priority === 'LOW' ? TaskPriority.LOW : TaskPriority.MEDIUM,
            duration: parsedData.duration,
            location: parsedData.location,
            status: TaskStatus.TODO,
            tags: [],
            subtasks: [],
            dependencyIds: [],
            isShared: false
        };
        handleEditDraft(taskDraft);
    };

    const handleSaveTask = async (taskData: Partial<Task>) => {
        console.log('[App] handleSaveTask called with:', taskData);
        let savedTask: Task | null = null;

        try {
            if (taskData.id) {
                savedTask = await updateTask(taskData as Task);
            } else {
                savedTask = await createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
            }
            console.log('[App] Task saved successfully:', savedTask);
        } catch (error) {
            console.error('[App] Error saving task:', error);
        }

        if (savedTask && savedTask.tags) {
            setSelectedCalendarTags(prev => {
                const newTags = savedTask!.tags.filter(t => !prev.includes(t));
                return [...prev, ...newTags];
            });
        }
    };

    const handleDeleteTask = async (id: string) => {
        const success = await deleteTask(id);
        if (success) {
            setIsEditorOpen(false);
        }
    };

    const handleToggleStatus = async (task: Task) => {
        await toggleStatus(task);
    };

    const handleAIAnalysis = async (task: Task) => {
        const enhanced = await enhanceTaskWithAI(task.title, allTags);
        if (enhanced && enhanced.subtasks) {
            const subtasks = enhanced.subtasks.map(s => ({
                id: crypto.randomUUID(),
                title: s.title,
                isCompleted: false
            }));
            await updateTask({ ...task, subtasks: [...task.subtasks, ...subtasks] });
        }
    };

    const handleAutoCreatedTask = async (taskData: Partial<Task>) => {
        const newTask = await createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
        if (newTask && newTask.tags && Array.isArray(newTask.tags)) {
            setSelectedCalendarTags(prev => {
                const newTags = newTask.tags.filter(t => !prev.includes(t));
                return [...prev, ...newTags];
            });
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

        console.log(`Renaming tag "${oldTag}" to "${finalTag}"`);
        const tasksToUpdate = tasks.filter(t => t.tags.includes(oldTag));
        console.log(`Found ${tasksToUpdate.length} tasks with tag "${oldTag}"`);

        // Server Update using the hook's updateTask
        for (const t of tasksToUpdate) {
            const newTags = t.tags.map(tag => tag === oldTag ? finalTag : tag);
            const uniqueTags = [...new Set(newTags)];
            try {
                await updateTask({ ...t, tags: uniqueTags });
                console.log(`✓ Updated task "${t.title}" tags:`, uniqueTags);
            } catch (error) {
                console.error(`✗ Failed to update task "${t.title}":`, error);
            }
        }

        setSelectedCalendarTags(prev => {
            if (prev.includes(oldTag)) {
                const others = prev.filter(t => t !== oldTag);
                return [...others, finalTag];
            }
            return prev;
        });
        
        console.log(`Tag rename complete: "${oldTag}" -> "${finalTag}"`);
    };

    const handleSignOut = async () => {
        await signOut();
    };

    // Filter tasks based on View Source Mode (Personal, Partners, Combined)
    const visibleTasks = useMemo(() => {
        if (!session?.user?.id) return [];
        switch (viewSourceMode) {
            case 'personal':
                return tasks.filter(t => t.user_id === session.user.id && !t.isShared);
            case 'partners':
                return tasks.filter(t => 
                    t.user_id !== session.user.id || // Tasks created by partners
                    (t.user_id === session.user.id && t.isShared) // Tasks created by user and shared
                );
            case 'combined':
                return tasks;
            default:
                return tasks.filter(t => t.user_id === session.user.id);
        }
    }, [tasks, viewSourceMode, session?.user?.id]);

    // Computed Values needed for AI context
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        visibleTasks.forEach(t => t.tags.forEach(tag => tags.add(tag)));
        if (visibleTasks.some(t => t.tags.length === 0)) tags.add('Untagged');
        return Array.from(tags).sort((a, b) => {
            if (a === 'Untagged') return -1;
            if (b === 'Untagged') return 1;
            return a.localeCompare(b);
        });
    }, [visibleTasks]);

    const filteredTasks = useMemo(() => {
        return visibleTasks.filter(t => {
            if (currentView === 'tasks' && t.type !== 'TASK') return false;
            if (currentView === 'events' && t.type !== 'EVENT') return false;
            if (currentView === 'appointments' && t.type !== 'APPOINTMENT') return false;
            if (currentView === 'reminders' && t.type !== 'REMINDER') return false;

            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [visibleTasks, searchQuery, filterStatus, currentView]);

    const calendarFilteredTasks = useMemo(() => {
        return visibleTasks.filter(t => {
            if (t.tags.length === 0) {
                return selectedCalendarTags.includes('Untagged');
            }
            return t.tags.some(tag => selectedCalendarTags.includes(tag));
        });
    }, [visibleTasks, selectedCalendarTags]);

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

    // Calculate tasks due today
    const todaysPendingTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return visibleTasks.filter(t => {
            if (t.status === TaskStatus.DONE) return false;
            
            const dateStr = t.dueDate || t.reminderTime;
            if (!dateStr) return false;
            
            const taskDate = new Date(dateStr);
            return taskDate >= today && taskDate < tomorrow;
        });
    }, [visibleTasks]);

    // Budget Calculations
    const totalExpenses = budget.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const budgetRemaining = budget.limit - totalExpenses;

    const userStats = {
        userName: username,
        pendingTasks: todaysPendingTasks.length,
        totalTasks: tasks.length,
        budgetRemaining: budgetRemaining,
        partnerName: partner?.name
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const getHeaderInfo = () => {
        switch (currentView) {
            case 'reminders': return { title: t(theme, 'reminders'), subtitle: 'Don\'t forget these important items', icon: Bell };
            case 'events': return { title: t(theme, 'events'), subtitle: 'Upcoming social and work gatherings', icon: CalendarDays };
            case 'appointments': return { title: t(theme, 'appointments'), subtitle: 'Scheduled meetings and visits', icon: Clock };
            case 'tasks': return { title: t(theme, 'tasks'), subtitle: 'Manage and track your daily activities', icon: CheckSquare };
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

    if (isTasksLoading && tasks.length === 0) { // Only show full loader on initial fetch
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
            onNavigate={(view) => navigate(viewModeToPath[view])}
            onAddTask={(type) => handleCreateTask(undefined, type)}
            userStats={userStats}
            currentTheme={theme}
            onThemeChange={(t) => setTheme(t, true)}
            calendarTags={allTags}
            selectedTags={selectedCalendarTags}
            onToggleTag={handleToggleCalendarTag}
            onRenameTag={handleRenameTag}
            viewSourceMode={viewSourceMode}
            onViewSourceModeChange={handleViewSourceModeChange}
            hasConnectedPartners={hasConnectedPartners}
            onCreateRoutine={handleCreateRoutine}
            onOpenAI={() => setIsAIChatOpen(true)}
            onCalendarDateSelect={(date) => setCalendarNavigateDate(date)}
        >
            {/* Offline Indicator */}
            {!isOnline && (
                 <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-1 text-xs font-bold shadow-md animate-slide-down">
                     You are offline. Changes will rely on cache and retry when online.
                 </div>
            )}

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

            {/* VIEW: ACTIVITIES (Home) */}
            {(currentView === 'dashboard' || currentView === 'activities') && (
                <ActivitiesPage username={username} onEditTask={handleEditTask} />
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
                                <Button variant="ghost" onClick={() => { setSearchQuery(''); setFilterStatus('ALL') }} className="mt-2 text-brand-500">Clear Filters</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW: CALENDAR */}
            {currentView === 'calendar' && (
                <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
                    <CalendarView
                        tasks={calendarFilteredTasks}
                        recurringTransactions={budget.recurring}
                        onDateClick={(date) => handleCreateTask(date)}
                        onEditTask={handleEditTask}
                        onUpdateTask={(task) => updateTask(task)}
                        onToggleStatus={handleToggleStatus}
                        selectedDate={calendarNavigateDate}
                    />
                </Suspense>
            )}

            {/* VIEW: BUDGET */}
            {currentView === 'budget' && (
                <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
                    <BudgetPlanner currentTheme={theme} />
                </Suspense>
            )}

            {/* AI CHAT MODAL */}
            {(currentView === 'ai-chat' || isAIChatOpen) && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-4xl h-[85vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-white dark:bg-slate-900 animate-scale-in">
                        <button
                            onClick={() => {
                                setIsAIChatOpen(false);
                                if (currentView === 'ai-chat') {
                                    navigate('/activities');
                                }
                            }}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-slate-300"
                        >
                            <X size={20} />
                        </button>
                        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
                            <AIChat
                                onConfirmTask={handleAutoCreatedTask}
                                onEditTask={handleEditDraft}
                                userName={username}
                                existingTags={allTags}
                            />
                        </Suspense>
                    </div>
                </div>
            )}

            {/* VIEW: ROUTINES */}
            {currentView === 'routines' && (
                <RoutineList
                    routines={routines}
                    onEdit={handleEditRoutine}
                    onDelete={handleDeleteRoutine}
                    onToggle={handleToggleRoutine}
                    onCreate={handleCreateRoutine}
                />
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
                                            onClick={() => setTheme(t as ThemeOption)}
                                            className={`relative p-4 rounded-xl border-2 transition-all group overflow-hidden ${theme === t ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-white/10 hover:border-brand-500/50'}`}
                                        >
                                            <div className={`h-20 rounded-lg mb-3 border shadow-inner flex items-center justify-center ${t === 'dark' ? 'bg-[#000000] border-white/15' :
                                                t === 'light' ? 'bg-slate-50 border-slate-200' :
                                                    t === 'cyberpunk' ? 'bg-[#0a0014] border-[#00FFFF]/30' :
                                                        t === 'sunset' ? 'bg-[#4c0519] border-rose-500/30' :
                                                            'bg-[#0A0A0A] border-[#D4A574]/30'
                                                }`}>
                                                {t === 'dark' ? <Moon className="text-[#E0E0E0]" /> :
                                                    t === 'light' ? <Sun className="text-orange-400" /> :
                                                        t === 'cyberpunk' ? <Zap className="text-[#00FFFF]" /> :
                                                            t === 'sunset' ? <Sun className="text-rose-400" /> :
                                                                <Anchor className="text-[#D4A574]" />}
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{t}</p>
                                            {theme === t && <div className="absolute top-2 right-2 text-brand-500"><CheckCircle2 size={16} /></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Notifications Section */}
                        <div className="col-span-1 lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
                                <Bell className="text-brand-500" />
                                <h3>Notifications</h3>
                            </div>
                            <div className="bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                                {/* Main Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Enable Notifications</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Get notified about tasks, events, and budget alerts
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleNotificationToggle(!notificationSettings.enabled)}
                                        className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                                            notificationSettings.enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                        disabled={notificationPermission === 'denied'}
                                    >
                                        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                                            notificationSettings.enabled ? 'translate-x-7' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                {/* Permission Status */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-black/20">
                                    <div className={`w-2 h-2 rounded-full ${
                                        notificationPermission === 'granted' ? 'bg-emerald-500' :
                                        notificationPermission === 'denied' ? 'bg-red-500' :
                                        'bg-yellow-500'
                                    }`} />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        Permission: {
                                            notificationPermission === 'granted' ? 'Granted' :
                                            notificationPermission === 'denied' ? 'Denied (Enable in browser settings)' :
                                            notificationPermission === 'unsupported' ? 'Not supported in this browser' :
                                            'Not requested'
                                        }
                                    </span>
                                </div>

                                {/* Notification Preferences */}
                                {notificationSettings.enabled && (
                                    <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
                                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Notification Types</h5>
                                        
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <CheckSquare size={18} className="text-blue-500" />
                                                <span className="text-slate-800 dark:text-slate-100 font-medium">Task Reminders</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.taskReminders}
                                                onChange={(e) => handleNotificationPreferenceChange('taskReminders', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <CalendarDays size={18} className="text-purple-500" />
                                                <span className="text-slate-800 dark:text-slate-100 font-medium">Event & Appointment Reminders</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.eventReminders}
                                                onChange={(e) => handleNotificationPreferenceChange('eventReminders', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle size={18} className="text-amber-500" />
                                                <span className="text-slate-800 dark:text-slate-100 font-medium">Budget Alerts</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.budgetAlerts}
                                                onChange={(e) => handleNotificationPreferenceChange('budgetAlerts', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                            />
                                        </label>

                                        {/* Lead Time Selector */}
                                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                                            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                Remind me before event starts
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { value: 5, label: '5 min' },
                                                    { value: 15, label: '15 min' },
                                                    { value: 60, label: '1 hour' },
                                                    { value: 720, label: '12 hours' },
                                                    { value: 1440, label: '1 day' },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => handleNotificationPreferenceChange('reminderMinutesBefore', option.value)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                            notificationSettings.reminderMinutesBefore === option.value
                                                                ? 'bg-brand-500 text-slate-900 shadow-md'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => handleNotificationPreferenceChange('reminderMinutesBefore', -1)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        ![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore)
                                                            ? 'bg-brand-500 text-slate-900 shadow-md'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                            
                                            {/* Custom Input */}
                                            {![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore) && (
                                                <div className="flex items-center gap-3 mt-3 animate-fade-in">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="999"
                                                        defaultValue={
                                                            notificationSettings.reminderMinutesBefore >= 1440 
                                                                ? Math.floor(notificationSettings.reminderMinutesBefore / 1440)
                                                                : notificationSettings.reminderMinutesBefore >= 60
                                                                    ? Math.floor(notificationSettings.reminderMinutesBefore / 60)
                                                                    : notificationSettings.reminderMinutesBefore > 0 
                                                                        ? notificationSettings.reminderMinutesBefore 
                                                                        : 30
                                                        }
                                                        onChange={(e) => {
                                                            const num = parseInt(e.target.value) || 1;
                                                            const unitSelect = document.getElementById('reminder-unit') as HTMLSelectElement;
                                                            const unit = unitSelect?.value || 'minutes';
                                                            const multiplier = unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1;
                                                            handleNotificationPreferenceChange('reminderMinutesBefore', num * multiplier);
                                                        }}
                                                        className="w-20 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                                    />
                                                    <select
                                                        id="reminder-unit"
                                                        defaultValue={
                                                            notificationSettings.reminderMinutesBefore >= 1440 ? 'days' :
                                                            notificationSettings.reminderMinutesBefore >= 60 ? 'hours' : 'minutes'
                                                        }
                                                        onChange={(e) => {
                                                            const numInput = e.target.previousElementSibling as HTMLInputElement;
                                                            const num = parseInt(numInput?.value) || 1;
                                                            const unit = e.target.value;
                                                            const multiplier = unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1;
                                                            handleNotificationPreferenceChange('reminderMinutesBefore', num * multiplier);
                                                        }}
                                                        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                                    >
                                                        <option value="minutes">minutes</option>
                                                        <option value="hours">hours</option>
                                                        <option value="days">days</option>
                                                    </select>
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">before</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Test Notification Button */}
                                        <div className="pt-4">
                                            <Button
                                                variant="secondary"
                                                onClick={() => NotificationService.sendTestNotification()}
                                                className="flex items-center gap-2"
                                            >
                                                <Bell size={16} />
                                                Send Test Notification
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Collaboration Section */}
                        <CollaborationSettings 
                            currentUserId={session?.user?.id}
                            currentUserEmail={session?.user?.email}
                        />

                        {/* Danger Zone - Account Deletion (at bottom) */}
                        <div className="glass rounded-2xl p-6 lg:col-span-2 border-2 border-red-500/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
                                    <p className="text-sm text-slate-500">Irreversible actions</p>
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
                                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Delete Account</h4>
                                <p className="text-sm text-red-600/80 dark:text-red-300/80 mb-4">
                                    Once you delete your account, all your data will be permanently erased. This action cannot be undone.
                                    You will receive a confirmation email before the deletion is processed.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="danger"
                                        onClick={async () => {
                                            if (!confirm('Are you sure you want to request account deletion? You will receive a confirmation link.')) {
                                                return;
                                            }
                                            try {
                                                const { data, error } = await supabase.functions.invoke('account-deletion', {
                                                    body: { action: 'request' }
                                                });
                                                
                                                console.log('Account deletion response:', { data, error });
                                                
                                                if (error) {
                                                    console.error('Supabase function error:', error);
                                                    alert(`Failed to request account deletion: ${error.message || JSON.stringify(error)}`);
                                                    return;
                                                }
                                                
                                                if (data?.success) {
                                                    if (data.confirmationUrl) {
                                                        // Show URL directly
                                                        alert(`Click OK to copy the confirmation URL, then paste it in your browser to complete deletion.\n\nURL: ${data.confirmationUrl}\n\nThis link expires in 24 hours.`);
                                                        // Copy to clipboard
                                                        navigator.clipboard.writeText(data.confirmationUrl);
                                                    } else {
                                                        alert('A confirmation email has been sent to your email address. Please check your inbox to complete the deletion process. The link expires in 24 hours.');
                                                    }
                                                } else {
                                                    // Handle pending request case where URL is returned despite success: false
                                                    if (data?.confirmationUrl) {
                                                        alert(`Click OK to copy the confirmation URL, then paste it in your browser to complete deletion.\n\nURL: ${data.confirmationUrl}\n\nThis link expires in 24 hours.`);
                                                        navigator.clipboard.writeText(data.confirmationUrl);
                                                    } else {
                                                        const errorMsg = data?.error || data?.message || 'Unknown error occurred';
                                                        alert(`Failed to request deletion: ${errorMsg}`);
                                                    }
                                                }
                                            } catch (err: any) {
                                                console.error('Deletion request error:', err);
                                                alert(`Failed to request account deletion: ${err.message || 'Please try again.'}`);
                                            }
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Request Account Deletion
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            try {
                                                const { data, error } = await supabase.functions.invoke('account-deletion', {
                                                    body: { action: 'resend' }
                                                });
                                                
                                                console.log('Resend email response:', { data, error });
                                                
                                                if (error) {
                                                    console.error('Resend error:', error);
                                                    alert(`Failed to resend email: ${error.message || JSON.stringify(error)}`);
                                                    return;
                                                }
                                                
                                                if (data?.success) {
                                                    if (data.confirmationUrl) {
                                                        // Show URL directly
                                                        alert(`Click OK to copy the confirmation URL, then paste it in your browser to complete deletion.\n\nURL: ${data.confirmationUrl}`);
                                                        // Copy to clipboard
                                                        navigator.clipboard.writeText(data.confirmationUrl);
                                                    } else {
                                                        alert(data.message || 'Confirmation email has been resent. Please check your inbox.');
                                                    }
                                                } else {
                                                    const errorMsg = data?.error || data?.message || 'Unknown error occurred';
                                                    alert(`Failed to resend email: ${errorMsg}`);
                                                }
                                            } catch (err: any) {
                                                console.error('Resend error:', err);
                                                alert(`Failed to resend email: ${err.message || 'Please try again.'}`);
                                            }
                                        }}
                                        className="flex items-center gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                    >
                                        <Bell size={16} />
                                        Resend Confirmation Email
                                    </Button>
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

            {/* Routine Editor Modal */}
            <RoutineEditor
                isOpen={isRoutineEditorOpen}
                onClose={() => setIsRoutineEditorOpen(false)}
                onSave={handleSaveRoutine}
                onDelete={handleDeleteRoutine}
                routine={editingRoutine}
            />

            {/* Command Bar (Cmd+K Quick Add) */}
            <CommandBar
                isOpen={isCommandBarOpen}
                onClose={() => setIsCommandBarOpen(false)}
                onTaskParsed={handleCommandBarTask}
            />

        </Layout>
    );
};

export default App;
