
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Task, ViewMode, TaskStatus, Partner, TaskPriority, TaskType, ViewSourceMode } from './types';
import { getUrgencyScore } from './utils/taskScoring';
import { logger } from './utils/logger';
// Services imported only where needed

import TaskCard from './components/TaskCard';
import TaskEditor from './components/TaskEditor';
import FocusSession from './components/FocusSession';
import MorningBriefingModal from './components/MorningBriefingModal';
import Button from './components/Button';
import Auth from './components/Auth';
import Select from './components/Select';
import { Search, Filter, Bell, CalendarDays, Clock, CheckSquare, Activity, ArrowRight, Repeat, MessageSquare, Loader2, X } from 'lucide-react';
import { enhanceTaskWithAI } from './services/geminiService';
import { ParsedTaskData } from './services/geminiService';
import { t } from './themeText';
import CommandBar from './components/CommandBar';

// Lazy load heavy components for better initial bundle size
const AIChat = lazy(() => import('./components/AIChat'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner'));
const NotesManager = lazy(() => import('./components/NotesManager'));
import DebugLogPage from './pages/DebugLogPage';

// Import new hooks and contexts
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useTasks } from './hooks/useTasks';
import { useBudget } from './hooks/useBudget';
import { useUserSettings } from './hooks/useUserSettings';
import { usePartners } from './hooks/usePartners';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import { useSystemNotifications } from './hooks/useSystemNotifications';
import { useRoutines } from './hooks/useRoutines';
import * as NotificationService from './services/notificationService';

import { NotificationSettings, Routine } from './types';
import RoutineEditor from './components/RoutineEditor';
import RoutineList from './components/RoutineList';
// SettingsPage handles DeleteAccountModal internally
import SettingsPage from './pages/SettingsPage';

// Custom Hooks
import { useSMSListener } from './hooks/useSMSListener';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { useRecurringProcessor } from './hooks/useRecurringProcessor';
import { useMorningBriefing } from './hooks/useMorningBriefing';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Import page components
import ActivitiesPage from './pages/ActivitiesPage';
import DayPlannerPage from './pages/DayPlannerPage';

// Map URL paths to ViewMode for Layout compatibility
const pathToViewMode: Record<string, ViewMode> = {
    '/': 'activities',
    '/activities': 'activities',
    '/all-activities': 'all-activities',
    '/tasks': 'tasks',
    '/reminders': 'reminders',
    '/events': 'events',
    '/appointments': 'appointments',
    '/calendar': 'calendar',
    '/budget': 'budget',
    '/ai-chat': 'ai-chat',
    '/settings': 'settings',
    '/routines': 'routines',
    '/notes': 'notes',
    '/notes': 'notes',
    '/day-planner': 'day-planner',
    '/debug-logs': 'debug-logs',
};

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
    'notes': '/notes',
    'notes': '/notes',
    'day-planner': '/day-planner',
    'debug-logs': '/debug-logs',
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
        isLoading: _isBudgetLoading, 
        refetch: _refetchBudget, 
        processRecurring 
    } = useBudget();
    
    // Network Status
    const isOnline = useNetworkStatus();

    // Local UI state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Focus Mode State
    const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
    const [focusedTask, setFocusedTask] = useState<Task | undefined>(undefined);

    // User Settings
    const { displayName: username, updateDisplayName: setUsername } = useUserSettings();


    // State for creating task from calendar or create button
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);
    const [editorInitialType, setEditorInitialType] = useState<TaskType>('TASK');

    // Partner State
    const { partner, hasConnectedPartners } = usePartners();


    // Tag Filtering State for Calendar
    const [selectedCalendarTags, setSelectedCalendarTags] = useState<string[]>([]);

    // Command Bar State (Cmd+K)
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

    // AI Chat Modal State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);

    // Calendar Navigate Date State
    const [calendarNavigateDate, setCalendarNavigateDate] = useState<Date | undefined>(undefined);

    // Calendar Visible Tags State - tags from tasks in the current calendar period
    const [calendarVisibleTags, setCalendarVisibleTags] = useState<string[]>([]);

    const [viewSourceMode, setViewSourceMode] = useState<ViewSourceMode>('combined');

    const handleViewSourceModeChange = useCallback((mode: ViewSourceMode) => {
        setViewSourceMode(mode);
        localStorage.setItem('viewSourceMode', mode);
    }, []);


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

    // Google Calendar Integration State
    const { 
        isEnabled: googleCalendarEnabled, 
        hasToken: hasGoogleToken, 
        events: externalEvents, 
        isLoading: isLoadingGoogleEvents, 
        toggleEnabled: handleGoogleCalendarToggle 
    } = useGoogleCalendar();


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
        isProcessing: isProcessingRecurring,
        processingIds: processingRecurringIds,
        handleProcessRecurring, 
        handleProcessAllRecurring,
        handleDismissRecurring 
    } = useRecurringProcessor();

    // Morning Briefing
    const {
        showBriefing,
        overdueTasks,
        dismissBriefing
    } = useMorningBriefing({ tasks });

    // --- END HOOKS ---

    // System Notifications
    useSystemNotifications(session, notificationSettings);

    // Load username and check partners are now handled by hooks


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
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Startup Logging
    useEffect(() => {
        logger.info('App mounted', {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            resolution: `${window.innerWidth}x${window.innerHeight}`
        });
        
        // Log unhandled promise rejections
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            logger.error('Unhandled Promise Rejection', event.reason as Error);
        };
        
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, []);

    // System Notifications initialized by hook


    // Google Calendar Logic is now in useGoogleCalendar hook


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

    // Routine Handlers
    const handleSaveRoutine = useCallback((routine: Routine) => {
        saveRoutineHook(routine);
        setIsRoutineEditorOpen(false);
        setEditingRoutine(undefined);
    }, [saveRoutineHook]);

    const handleDeleteRoutine = useCallback((id: string) => {
        deleteRoutineHook(id);
        setIsRoutineEditorOpen(false);
        setEditingRoutine(undefined);
    }, [deleteRoutineHook]);

    const handleToggleRoutine = useCallback((id: string) => {
        toggleRoutineHook(id);
    }, [toggleRoutineHook]);

    const handleCreateRoutine = useCallback(() => {
        setEditingRoutine(undefined);
        setIsRoutineEditorOpen(true);
    }, []);

    const handleEditRoutine = useCallback((routine: Routine) => {
        setEditingRoutine(routine);
        setIsRoutineEditorOpen(true);
    }, []);

    const handleUsernameChange = useCallback((name: string) => {
        setUsername(name);
    }, [setUsername]);

    const handleCreateTask = useCallback((initialDate?: Date, type: TaskType = 'TASK') => {
        setEditingTask(undefined);
        setCalendarSelectedDate(initialDate);
        setEditorInitialType(type);
        setIsEditorOpen(true);
    }, []);

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setCalendarSelectedDate(undefined);
        setEditorInitialType(task.type);
        setIsEditorOpen(true);
    }, []);

    const handleEditDraft = useCallback((taskData: Partial<Task>) => {
        setEditingTask(taskData as Task);
        setCalendarSelectedDate(undefined);
        setEditorInitialType(taskData.type || 'TASK');
        setIsEditorOpen(true);
    }, []);

    // Handler for Command Bar parsed task data
    const handleCommandBarTask = useCallback((parsedData: ParsedTaskData) => {
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
    }, [handleEditDraft]);

    // ⚡ Performance Optimization: Memoized handler to prevent re-renders of TaskEditor
    const handleSaveTask = useCallback(async (taskData: Partial<Task>) => {
        logger.debug('[App] handleSaveTask called', { taskData });
        let savedTask: Task | null = null;

        try {
            if (taskData.id) {
                savedTask = await updateTask(taskData as Task);
            } else {
                savedTask = await createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
            }
            logger.debug('[App] Task saved successfully', { savedTask });
        } catch (error) {
            logger.error('[App] Error saving task', error as Error);
        }

        if (savedTask && savedTask.tags) {
            setSelectedCalendarTags(prev => {
                const newTags = savedTask!.tags.filter(t => !prev.includes(t));
                return [...prev, ...newTags];
            });
        }
    }, [updateTask, createTask]);

    // ⚡ Performance Optimization: Memoized handler to prevent re-renders of TaskEditor
    const handleDeleteTask = useCallback(async (id: string) => {
        const success = await deleteTask(id);
        if (success) {
            setIsEditorOpen(false);
        }
    }, [deleteTask]);

    // ⚡ Performance Optimization: Memoized handler to prevent re-renders of TaskCard and CalendarView
    const handleToggleStatus = useCallback(async (task: Task) => {
        await toggleStatus(task);
    }, [toggleStatus]);

    // ⚡ Performance Optimization: Memoized handler to prevent re-renders of TaskCard
    const handleAIAnalysis = useCallback(async (task: Task) => {
        const enhanced = await enhanceTaskWithAI(task.title, allTags);
        if (enhanced && enhanced.subtasks) {
            const subtasks = enhanced.subtasks.map(s => ({
                id: crypto.randomUUID(),
                title: s.title,
                isCompleted: false
            }));
            await updateTask({ ...task, subtasks: [...task.subtasks, ...subtasks] });
        }
    }, [allTags, updateTask]);

    // Focus Mode Handlers
    const handleStartFocus = useCallback((task: Task) => {
        setFocusedTask(task);
        setIsFocusModeOpen(true);
    }, []);

    const handleCompleteFocus = useCallback(async (task: Task) => {
        await toggleStatus(task);
        setIsFocusModeOpen(false);
        setFocusedTask(undefined);
    }, [toggleStatus]);

    const handleAutoCreatedTask = useCallback(async (taskData: Partial<Task>) => {
        const newTask = await createTask(taskData as Omit<Task, 'id' | 'createdAt'>);
        if (newTask && newTask.tags && Array.isArray(newTask.tags)) {
            setSelectedCalendarTags(prev => {
                const newTags = newTask.tags.filter(t => !prev.includes(t));
                return [...prev, ...newTags];
            });
        }
    }, [createTask]);

    const handleToggleCalendarTag = useCallback((tag: string) => {
        setSelectedCalendarTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);

    const handleRenameTag = useCallback(async (oldTag: string, newTag: string) => {
        if (!newTag.trim() || oldTag === newTag) return;
        const finalTag = newTag.trim();

        logger.debug(`Renaming tag "${oldTag}" to "${finalTag}"`);
        const tasksToUpdate = tasks.filter(t => t.tags.includes(oldTag));
        logger.debug(`Found ${tasksToUpdate.length} tasks with tag "${oldTag}"`);

        // Server Update using the hook's updateTask
        for (const t of tasksToUpdate) {
            const newTags = t.tags.map(tag => tag === oldTag ? finalTag : tag);
            const uniqueTags = [...new Set(newTags)];
            try {
                await updateTask({ ...t, tags: uniqueTags });
                logger.debug(`✓ Updated task "${t.title}" tags`, { tags: uniqueTags });
            } catch (error) {
                logger.error(`Failed to update task "${t.title}"`, error as Error);
            }
        }

        setSelectedCalendarTags(prev => {
            if (prev.includes(oldTag)) {
                const others = prev.filter(t => t !== oldTag);
                return [...others, finalTag];
            }
            return prev;
        });
        
        logger.debug(`Tag rename complete: "${oldTag}" -> "${finalTag}"`);
    }, [tasks, updateTask]);

    const handleSignOut = useCallback(async () => {
        await signOut();
    }, [signOut]);

    const filteredTasks = useMemo(() => {
        // ⚡ Bolt Optimization: Lift search query processing out of loop
        const query = searchQuery.toLowerCase();
        const hasQuery = query.length > 0;

        const filtered = visibleTasks
            .filter(t => {
                if (currentView === 'tasks' && t.type !== 'TASK') return false;
                if (currentView === 'events' && t.type !== 'EVENT') return false;
                if (currentView === 'appointments' && t.type !== 'APPOINTMENT') return false;
                if (currentView === 'reminders' && t.type !== 'REMINDER') return false;

                // Optimization: Skip expensive string operations if no search query
                const matchesSearch = !hasQuery ||
                    t.title.toLowerCase().includes(query) ||
                    t.tags.some(tag => tag.toLowerCase().includes(query));

                const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
                return matchesSearch && matchesStatus;
            });

        // ⚡ Bolt Optimization: Pre-calculate scores to avoid O(N log N) recalculations during sort
        const scores = new Map<string, number>();
        filtered.forEach(task => scores.set(task.id, getUrgencyScore(task)));

        return filtered.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    }, [visibleTasks, searchQuery, filterStatus, currentView]);

    const calendarFilteredTasks = useMemo(() => {
        // ⚡ Bolt Optimization: Use Set for O(1) tag lookup instead of O(K) array includes
        const selectedTagsSet = new Set(selectedCalendarTags);

        return visibleTasks.filter(t => {
            if (t.tags.length === 0) {
                return selectedTagsSet.has('Untagged');
            }
            return t.tags.some(tag => selectedTagsSet.has(tag));
        });
    }, [visibleTasks, selectedCalendarTags]);

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

    const userStats = useMemo(() => ({
        userName: username,
        pendingTasks: todaysPendingTasks.length,
        totalTasks: tasks.length,
        budgetRemaining: budgetRemaining,
        partnerName: partner?.name
    }), [username, todaysPendingTasks.length, tasks.length, budgetRemaining, partner?.name]);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const getHeaderInfo = () => {
        switch (currentView) {
            case 'reminders': return { title: t(theme, 'reminders'), subtitle: 'Don\'t forget these important items', icon: Bell };
            case 'events': return { title: t(theme, 'events'), subtitle: 'Upcoming social and work gatherings', icon: CalendarDays };
            case 'appointments': return { title: t(theme, 'appointments'), subtitle: 'Scheduled meetings and visits', icon: Clock };
            case 'tasks': return { title: t(theme, 'tasks'), subtitle: 'Manage and track your daily activities', icon: CheckSquare };
            case 'all-activities': return { title: 'All Activities', subtitle: 'Tasks, Reminders, Events & Appointments', icon: Activity };
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

    if (currentView === 'debug-logs') {
        return <DebugLogPage />;
    }

    return (
        <Layout
            currentView={currentView}
            onNavigate={(view) => navigate(viewModeToPath[view])}
            onAddTask={(type) => handleCreateTask(undefined, type)}
            userStats={userStats}
            currentTheme={theme}
            onThemeChange={(t) => setTheme(t, true)}
            calendarTags={currentView === 'calendar' && calendarVisibleTags.length > 0 ? calendarVisibleTags : allTags}
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Repeat size={24} />
                                    <h3 className="text-xl font-bold">Recurring Items Due</h3>
                                </div>
                                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                                    {dueRecurringItems.length} pending
                                </span>
                            </div>
                            <p className="opacity-90 mt-2 text-sm">The following scheduled payments are due for processing.</p>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                            {dueRecurringItems.map(item => {
                                const isItemProcessing = processingRecurringIds.has(item.id);
                                return (
                                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 transition-all ${isItemProcessing ? 'opacity-60' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-white truncate">{item.description}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className={`text-sm font-semibold ${item.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                </span>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-500 capitalize">{item.frequency}</span>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            onClick={() => handleProcessRecurring(item.id)}
                                            disabled={isProcessingRecurring || isItemProcessing}
                                        >
                                            {isItemProcessing ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                                    <span className="hidden sm:inline">Processing</span>
                                                </span>
                                            ) : (
                                                'Confirm'
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <Button variant="ghost" onClick={handleDismissRecurring} disabled={isProcessingRecurring}>
                                Remind Me Later
                            </Button>
                            <div className="flex gap-2">
                                {dueRecurringItems.length > 1 && (
                                    <Button 
                                        variant="primary" 
                                        onClick={handleProcessAllRecurring}
                                        disabled={isProcessingRecurring}
                                    >
                                        {isProcessingRecurring ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                                Processing All...
                                            </span>
                                        ) : (
                                            `Approve All (${dueRecurringItems.length})`
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: ACTIVITIES (Home) */}
            {(currentView === 'dashboard' || currentView === 'activities') && (
                <ActivitiesPage username={username} onEditTask={handleEditTask} />
            )}

            {/* VIEW: LISTS */}
            {(currentView === 'tasks' || currentView === 'reminders' || currentView === 'events' || currentView === 'appointments' || currentView === 'all-activities') && (
                <div className="space-y-6 h-full flex flex-col animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center border-b border-slate-200 dark:border-white/5 pb-6">
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
                            <Select
                                value={filterStatus}
                                onChange={(value) => setFilterStatus(value)}
                                options={[
                                    { value: 'ALL', label: 'All Status' },
                                    { value: TaskStatus.TODO, label: 'To Do' },
                                    { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                                    { value: TaskStatus.DONE, label: 'Done' }
                                ]}
                                currentTheme={theme}
                                className="w-40"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pb-20">
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                allTasks={tasks}
                                onEdit={handleEditTask}
                                onToggleStatus={handleToggleStatus}
                                onAIAnalysis={handleAIAnalysis}
                                onFocus={handleStartFocus}
                            />
                        ))}
                        {filteredTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400 glass-panel rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4">
                                    <Filter size={32} className="text-brand-500" />
                                </div>
                                <p className="font-medium text-slate-600 dark:text-slate-300">No {currentView} found matching your filters.</p>
                                <Button variant="ghost" onClick={() => { setSearchQuery(''); setFilterStatus('ALL') }} className="mt-3 text-brand-500">Clear Filters</Button>
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
                        externalEvents={externalEvents}
                        onDateClick={handleCreateTask}
                        onEditTask={handleEditTask}
                        onUpdateTask={updateTask}
                        onToggleStatus={handleToggleStatus}
                        selectedDate={calendarNavigateDate}
                        onVisibleTagsChange={setCalendarVisibleTags}
                        unfilteredTasks={visibleTasks}
                        currentTheme={theme}
                    />
                </Suspense>
            )}

            {/* VIEW: BUDGET */}
            {currentView === 'budget' && (
                <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
                    <BudgetPlanner currentTheme={theme} />
                </Suspense>
            )}

            {/* VIEW: NOTES */}
            {currentView === 'notes' && (
                <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500" size={32} /></div>}>
                    <NotesManager currentTheme={theme} />
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

            {/* VIEW: DAY PLANNER */}
            {currentView === 'day-planner' && (
                <DayPlannerPage
                    tasks={visibleTasks}
                    onCreateTask={handleCreateTask}
                    onEditTask={handleEditTask}
                    createTask={createTask}
                />
            )}

            {/* VIEW: SETTINGS */}
            {currentView === 'settings' && (
                <SettingsPage
                    session={session}
                    username={username}
                    onUsernameChange={handleUsernameChange}
                    onSignOut={handleSignOut}
                    notificationSettings={notificationSettings}
                    notificationPermission={notificationPermission}
                    onNotificationToggle={handleNotificationToggle}
                    onNotificationPreferenceChange={handleNotificationPreferenceChange}
                    onNavigate={(path) => navigate(path)}
                    googleCalendarEnabled={googleCalendarEnabled}
                    hasGoogleToken={hasGoogleToken}
                    onGoogleCalendarToggle={handleGoogleCalendarToggle}
                />
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
                globalNotificationSettings={notificationSettings}
                onStartFocus={editingTask ? () => handleStartFocus(editingTask) : undefined}
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

            {/* Focus Mode Overlay */}
            {focusedTask && (
                <FocusSession
                    task={focusedTask}
                    isOpen={isFocusModeOpen}
                    onClose={() => {
                        setIsFocusModeOpen(false);
                        setFocusedTask(undefined);
                    }}
                    onComplete={handleCompleteFocus}
                />
            )}

            {/* Morning Briefing Modal */}
            <MorningBriefingModal
                isOpen={showBriefing}
                onClose={dismissBriefing}
                tasks={overdueTasks}
                username={username}
                onMoveToToday={async (taskIds) => {
                    const today = new Date().toISOString();
                    for (const id of taskIds) {
                        const task = tasks.find(t => t.id === id);
                        if (task) {
                            await updateTask({ ...task, dueDate: today });
                        }
                    }
                    dismissBriefing();
                }}
                onDelete={async (taskIds) => {
                    for (const id of taskIds) {
                        await deleteTask(id);
                    }
                    dismissBriefing();
                }}
            />


        </Layout>
    );
};

export default App;
