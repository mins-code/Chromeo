import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';
import Layout from './components/Layout';
import CalendarView from './components/CalendarView';
import TaskEditor from './components/TaskEditor';
import AIChat from './components/AIChat';
import BudgetPlanner from './components/BudgetPlanner';
import Stats from './components/Stats';
import { Task, ViewMode, ThemeOption, TaskType, TaskStatus, TaskPriority } from './types';
import { 
  fetchTasks, 
  addTask, 
  updateTask, 
  deleteTask, 
  syncSharedTasks 
} from './services/taskService';
import { listenForIncomingSMS } from './services/smsService';
import { CalendarDays, CheckSquare, Bell, Calendar, DollarSign, MessageSquare, Settings, LayoutDashboard, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadTasks();
      listenForIncomingSMS((parsed) => {
        console.log('Parsed SMS transaction:', parsed);
      });
    }
  }, [session]);

  const loadTasks = async () => {
    if (!session?.user) return;
    try {
      const data = await fetchTasks(session.user.id);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    if (!session?.user) return;
    try {
      const task = await addTask({ ...newTask, userId: session.user.id });
      setTasks([...tasks, task]);
      if (task.isShared) {
        await syncSharedTasks(session.user.id);
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      await updateTask(updatedTask);
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (updatedTask.isShared) {
        await syncSharedTasks(session!.user.id);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTasks([]);
  };

  if (loading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center theme-${theme}`}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-bold text-primary">Loading ChronoDeX...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth theme={theme} />;
  }

  const menuItems = [
    { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as ViewMode, label: 'Calendar', icon: CalendarDays },
    { id: 'tasks' as ViewMode, label: 'Tasks', icon: CheckSquare },
    { id: 'reminders' as ViewMode, label: 'Reminders', icon: Bell },
    { id: 'events' as ViewMode, label: 'Events', icon: Calendar },
    { id: 'budget' as ViewMode, label: 'Budget', icon: DollarSign },
    { id: 'ai-chat' as ViewMode, label: 'AI Assistant', icon: MessageSquare },
    { id: 'activities' as ViewMode, label: 'Activities', icon: Activity },
  ];

  return (
    <div className={`h-screen w-screen overflow-hidden theme-${theme}`}>
      {/* Dynamic Background Based on Theme */}
      <div className="fixed inset-0 -z-10 theme-bg"></div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 h-full border-r border-border bg-sidebar backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"></div>
          
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-8 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg ring-4 ring-primary/10">
                  <span className="text-2xl theme-icon">📋</span>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    ChronoDeX
                  </h1>
                  <p className="text-xs text-secondary font-medium tracking-wide uppercase">Task Manager</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mt-4"></div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = viewMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setViewMode(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 scale-[1.02]'
                        : 'text-text-secondary hover:bg-surface hover:shadow-md hover:scale-[1.01]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
                    )}
                    
                    <div className={`absolute inset-0 bg-gradient-to-r from-surface/0 to-surface/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ${isActive ? 'hidden' : ''}`}></div>
                    
                    <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className={`font-semibold relative z-10 ${isActive ? 'tracking-wide' : ''}`}>{item.label}</span>
                    
                    {isActive && (
                      <div className="ml-auto relative z-10">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 mb-3 shadow-lg border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-primary/20">
                    {session.user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text truncate text-sm">{session.user.email}</p>
                    <p className="text-xs text-text-secondary">Account</p>
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent-dark text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Theme Selector */}
              <div className="bg-surface/40 rounded-xl p-3 backdrop-blur-sm border border-border">
                <p className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light', icon: '☀️', name: 'Light' },
                    { id: 'dark', icon: '🌙', name: 'Dark' },
                    { id: 'sunset', icon: '🌅', name: 'Sunset' },
                    { id: 'cyberpunk', icon: '🌃', name: 'Cyber' },
                    { id: 'onepiece', icon: '⚓', name: 'One Piece' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as ThemeOption)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-300 flex flex-col items-center gap-1 ${
                        theme === t.id
                          ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md scale-105'
                          : 'bg-surface text-text-secondary hover:bg-surface-hover hover:scale-102'
                      }`}
                      title={t.name}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[10px]">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className="h-20 border-b border-border bg-header backdrop-blur-xl shadow-lg px-8 flex items-center justify-between relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary via-accent to-primary"></div>
            
            <div>
              <h2 className="text-3xl font-black tracking-tight text-text">
                {viewMode === 'dashboard' && '🎯 Dashboard'}
                {viewMode === 'calendar' && '📅 Calendar'}
                {viewMode === 'tasks' && '✅ Tasks'}
                {viewMode === 'reminders' && '🔔 Reminders'}
                {viewMode === 'events' && '🎉 Events'}
                {viewMode === 'budget' && '💰 Budget'}
                {viewMode === 'ai-chat' && '🤖 AI Assistant'}
                {viewMode === 'activities' && '⚡ Activities'}
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-full bg-success/10 border-2 border-success/30 shadow-sm">
                  <span className="text-sm font-bold text-success">{tasks.filter(t => t.status === TaskStatus.DONE).length} ✓</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-info/10 border-2 border-info/30 shadow-sm">
                  <span className="text-sm font-bold text-info">{tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length} ⚡</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-warning/10 border-2 border-warning/30 shadow-sm">
                  <span className="text-sm font-bold text-warning">{tasks.filter(t => t.status === TaskStatus.TODO).length} 📋</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area with Scroll */}
          <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
            <div className="max-w-7xl mx-auto">
              {viewMode === 'dashboard' && (
                <div className="space-y-6">
                  <Stats tasks={tasks} theme={theme} />
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setViewMode('tasks')}
                      className="p-6 rounded-2xl bg-gradient-to-br from-primary to-accent text-white hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative z-10">
                        <CheckSquare className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold mb-1">Manage Tasks</h3>
                        <p className="text-white/80 text-sm">Organize your work</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setViewMode('calendar')}
                      className="p-6 rounded-2xl bg-gradient-to-br from-info to-info-dark text-white hover:shadow-2xl hover:shadow-info/30 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative z-10">
                        <CalendarDays className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold mb-1">View Calendar</h3>
                        <p className="text-white/80 text-sm">Plan your schedule</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setViewMode('ai-chat')}
                      className="p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative z-10">
                        <MessageSquare className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold mb-1">AI Assistant</h3>
                        <p className="text-white/80 text-sm">Get smart help</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              {viewMode === 'calendar' && (
                <CalendarView 
                  tasks={tasks} 
                  onTaskClick={(task) => setEditingTask(task)}
                  theme={theme}
                />
              )}
              
              {(viewMode === 'tasks' || viewMode === 'reminders' || viewMode === 'events' || viewMode === 'appointments') && (
                <Layout
                  tasks={tasks.filter(t => {
                    if (viewMode === 'tasks') return t.type === 'TASK';
                    if (viewMode === 'reminders') return t.type === 'REMINDER';
                    if (viewMode === 'events') return t.type === 'EVENT';
                    if (viewMode === 'appointments') return t.type === 'APPOINTMENT';
                    return true;
                  })}
                  onAddTask={() => setEditingTask({
                    id: '',
                    title: '',
                    status: TaskStatus.TODO,
                    priority: TaskPriority.MEDIUM,
                    subtasks: [],
                    tags: [],
                    createdAt: Date.now(),
                    type: viewMode === 'tasks' ? 'TASK' : 
                          viewMode === 'reminders' ? 'REMINDER' : 
                          viewMode === 'events' ? 'EVENT' : 'APPOINTMENT',
                    dependencyIds: [],
                    isShared: false
                  })}
                  onTaskClick={(task) => setEditingTask(task)}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  theme={theme}
                />
              )}
              
              {viewMode === 'budget' && <BudgetPlanner theme={theme} />}
              
              {viewMode === 'ai-chat' && <AIChat tasks={tasks} theme={theme} />}
              
              {viewMode === 'activities' && (
                <div className="bg-surface backdrop-blur-sm rounded-2xl p-8 border border-border shadow-xl">
                  <h3 className="text-2xl font-black text-text mb-6">Activity Stream</h3>
                  <p className="text-text-secondary">Recent activity will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Editor Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-surface backdrop-blur-xl rounded-3xl shadow-2xl border border-border animate-slideUp">
            <TaskEditor
              task={editingTask}
              onSave={(task) => {
                if (task.id) {
                  handleUpdateTask(task as Task);
                } else {
                  handleAddTask(task);
                }
                setEditingTask(null);
              }}
              onCancel={() => setEditingTask(null)}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Light Theme (Default) */
        .theme-light {
          --color-primary: #3B82F6;
          --color-primary-dark: #2563EB;
          --color-accent: #8B5CF6;
          --color-accent-dark: #7C3AED;
          --color-bg: #F9FAFB;
          --color-surface: rgba(255, 255, 255, 0.8);
          --color-surface-hover: rgba(243, 244, 246, 0.9);
          --color-sidebar: rgba(255, 255, 255, 0.9);
          --color-header: rgba(255, 255, 255, 0.8);
          --color-text: #111827;
          --color-text-secondary: #6B7280;
          --color-border: rgba(229, 231, 235, 0.5);
          --color-success: #10B981;
          --color-info: #3B82F6;
          --color-warning: #F59E0B;
          --color-danger: #EF4444;
        }

        .theme-light .theme-bg {
          background: linear-gradient(135deg, #F0F9FF 0%, #E0E7FF 50%, #EDE9FE 100%);
        }

        .theme-light .theme-icon::before {
          content: '📋';
        }

        /* Dark Theme */
        .theme-dark {
          --color-primary: #3B82F6;
          --color-primary-dark: #2563EB;
          --color-accent: #8B5CF6;
          --color-accent-dark: #7C3AED;
          --color-bg: #0F172A;
          --color-surface: rgba(30, 41, 59, 0.8);
          --color-surface-hover: rgba(51, 65, 85, 0.9);
          --color-sidebar: rgba(15, 23, 42, 0.95);
          --color-header: rgba(30, 41, 59, 0.8);
          --color-text: #F1F5F9;
          --color-text-secondary: #94A3B8;
          --color-border: rgba(51, 65, 85, 0.5);
          --color-success: #10B981;
          --color-info: #3B82F6;
          --color-warning: #F59E0B;
          --color-danger: #EF4444;
        }

        .theme-dark .theme-bg {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%);
        }

        .theme-dark .theme-icon::before {
          content: '🌙';
        }

        /* Sunset Theme */
        .theme-sunset {
          --color-primary: #F59E0B;
          --color-primary-dark: #D97706;
          --color-accent: #EF4444;
          --color-accent-dark: #DC2626;
          --color-bg: #FFF7ED;
          --color-surface: rgba(255, 247, 237, 0.8);
          --color-surface-hover: rgba(254, 243, 199, 0.9);
          --color-sidebar: rgba(255, 237, 213, 0.9);
          --color-header: rgba(254, 243, 199, 0.8);
          --color-text: #78350F;
          --color-text-secondary: #92400E;
          --color-border: rgba(251, 191, 36, 0.3);
          --color-success: #10B981;
          --color-info: #3B82F6;
          --color-warning: #F59E0B;
          --color-danger: #EF4444;
        }

        .theme-sunset .theme-bg {
          background: linear-gradient(135deg, #FFF7ED 0%, #FED7AA 30%, #FCA5A5 70%, #F87171 100%);
        }

        .theme-sunset .theme-icon::before {
          content: '🌅';
        }

        /* Cyberpunk Theme */
        .theme-cyberpunk {
          --color-primary: #06B6D4;
          --color-primary-dark: #0891B2;
          --color-accent: #EC4899;
          --color-accent-dark: #DB2777;
          --color-bg: #0C0A1F;
          --color-surface: rgba(20, 16, 46, 0.9);
          --color-surface-hover: rgba(30, 24, 66, 0.95);
          --color-sidebar: rgba(12, 10, 31, 0.95);
          --color-header: rgba(20, 16, 46, 0.9);
          --color-text: #E0F2FE;
          --color-text-secondary: #A5F3FC;
          --color-border: rgba(6, 182, 212, 0.3);
          --color-success: #10B981;
          --color-info: #06B6D4;
          --color-warning: #FBBF24;
          --color-danger: #EC4899;
        }

        .theme-cyberpunk .theme-bg {
          background: linear-gradient(135deg, #0C0A1F 0%, #1E1852 50%, #2D1B69 100%);
          position: relative;
        }

        .theme-cyberpunk .theme-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(0deg, transparent 0px, rgba(6, 182, 212, 0.03) 1px, transparent 2px, transparent 4px),
            repeating-linear-gradient(90deg, transparent 0px, rgba(236, 72, 153, 0.03) 1px, transparent 2px, transparent 4px);
        }

        .theme-cyberpunk .theme-icon::before {
          content: '🌃';
        }

        /* One Piece Theme */
        .theme-onepiece {
          --color-primary: #E62020;
          --color-primary-dark: #B71C1C;
          --color-accent: #FFD700;
          --color-accent-dark: #FFA500;
          --color-bg: #F4E4BC;
          --color-surface: rgba(234, 221, 207, 0.8);
          --color-surface-hover: rgba(242, 229, 188, 0.9);
          --color-sidebar: rgba(250, 237, 205, 0.9);
          --color-header: rgba(255, 248, 220, 0.8);
          --color-text: #2C1810;
          --color-text-secondary: #5D4037;
          --color-border: rgba(139, 110, 87, 0.3);
          --color-success: #008000;
          --color-info: #3B82F6;
          --color-warning: #FF9800;
          --color-danger: #E62020;
        }

        .theme-onepiece .theme-bg {
          background: linear-gradient(135deg, #FEF3C7 0%, #FED7AA 50%, #FEE2E2 100%);
          position: relative;
        }

        .theme-onepiece .theme-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 69, 19, 0.02) 2px, rgba(139, 69, 19, 0.02) 4px);
        }

        .theme-onepiece .theme-icon::before {
          content: '⚓';
        }

        /* Apply theme colors to components */
        .bg-primary { background-color: var(--color-primary); }
        .bg-accent { background-color: var(--color-accent); }
        .bg-surface { background-color: var(--color-surface); }
        .bg-surface-hover { background-color: var(--color-surface-hover); }
        .bg-sidebar { background-color: var(--color-sidebar); }
        .bg-header { background-color: var(--color-header); }
        .text-primary { color: var(--color-primary); }
        .text-accent { color: var(--color-accent); }
        .text-text { color: var(--color-text); }
        .text-text-secondary { color: var(--color-text-secondary); }
        .text-success { color: var(--color-success); }
        .text-info { color: var(--color-info); }
        .text-warning { color: var(--color-warning); }
        .border-primary { border-color: var(--color-primary); }
        .border-accent { border-color: var(--color-accent); }
        .border-border { border-color: var(--color-border); }
        .border-success { border-color: var(--color-success); }
        .border-info { border-color: var(--color-info); }
        .border-warning { border-color: var(--color-warning); }

        .from-primary { --tw-gradient-from: var(--color-primary); }
        .to-accent { --tw-gradient-to: var(--color-accent); }
        .from-primary-dark { --tw-gradient-from: var(--color-primary-dark); }
        .to-accent-dark { --tw-gradient-to: var(--color-accent-dark); }
        .from-info { --tw-gradient-from: var(--color-info); }
        .to-info-dark { --tw-gradient-to: #2563EB; }
        .bg-success\/10 { background-color: rgb(from var(--color-success) r g b / 0.1); }
        .bg-info\/10 { background-color: rgb(from var(--color-info) r g b / 0.1); }
        .bg-warning\/10 { background-color: rgb(from var(--color-warning) r g b / 0.1); }
        .border-success\/30 { border-color: rgb(from var(--color-success) r g b / 0.3); }
        .border-info\/30 { border-color: rgb(from var(--color-info) r g b / 0.3); }
        .border-warning\/30 { border-color: rgb(from var(--color-warning) r g b / 0.3); }
        .shadow-primary\/30 { --tw-shadow-color: rgb(from var(--color-primary) r g b / 0.3); }
        .shadow-info\/30 { --tw-shadow-color: rgb(from var(--color-info) r g b / 0.3); }
        .ring-primary\/10 { --tw-ring-color: rgb(from var(--color-primary) r g b / 0.1); }
        .ring-primary\/20 { --tw-ring-color: rgb(from var(--color-primary) r g b / 0.2); }
      `}</style>
    </div>
  );
};

export default App;
