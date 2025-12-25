import React, { useState, useRef, useEffect } from 'react';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { ViewMode, TaskType, ThemeOption } from '../types';
import { Plus, Settings, X, Wallet, CheckCircle2, User, ChevronDown, Calendar, CheckSquare, Clock, Moon, Sun, ChevronRight, Menu, PanelLeft, PanelLeftClose, Bell, Check, Pencil } from 'lucide-react';

export interface UserStats {
  userName: string;
  pendingTasks: number;
  totalTasks: number;
  budgetRemaining: number;
  partnerName?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onAddTask: (type?: TaskType) => void;
  userStats: UserStats;
  currentTheme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
  calendarTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onRenameTag?: (oldTag: string, newTag: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    currentView, 
    onNavigate, 
    onAddTask, 
    userStats, 
    currentTheme, 
    onThemeChange,
    calendarTags,
    selectedTags,
    onToggleTag,
    onRenameTag
}) => {
  const [showProfileStats, setShowProfileStats] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagValue, setEditTagValue] = useState('');

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      NAVIGATION_ITEMS.forEach(item => {
          const hasChildren = ('children' in item && !!item.children) || item.id === 'calendar';
          if (hasChildren) {
             const isChildActive = 'children' in item && item.children?.some(c => c.id === currentView);
             if (item.id === currentView || isChildActive) {
                 initial[item.id] = true;
             }
          }
      });
      return initial;
  });
  
  const profileRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileStats(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (editingTag && editInputRef.current) {
          editInputRef.current.focus();
      }
  }, [editingTag]);

  const toggleTheme = () => {
    onThemeChange(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleParentClick = (itemId: string, hasChildren: boolean) => {
      onNavigate(itemId as ViewMode);
      if (hasChildren) {
          setExpandedMenus({ [itemId]: true });
      } else {
          setExpandedMenus({});
      }
  };

  const handleArrowClick = (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      if (itemId === 'calendar') {
          if (currentView === 'calendar') {
              setExpandedMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
          } else {
              onNavigate(itemId as ViewMode);
              setExpandedMenus({ [itemId]: true });
          }
      } else {
          setExpandedMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
      }
  };

  const handleWrapperEnter = (itemId: string) => {
      if (itemId === 'calendar') return;
      setExpandedMenus(prev => ({ ...prev, [itemId]: true }));
  };

  const handleWrapperLeave = (itemId: string) => {
      if (itemId === 'calendar') return;
      setExpandedMenus(prev => ({ ...prev, [itemId]: false }));
  };
  
  const handleChildClick = (parentId: string, childId: string) => {
      onNavigate(childId as ViewMode);
      setExpandedMenus({ [parentId]: true });
  };

  const handleToggleSidebar = () => {
    if (isSidebarCollapsed) {
        setIsSidebarCollapsed(false);
    } else {
        setIsSidebarCollapsed(true);
        setIgnoreHover(true);
    }
  };

  const startEditingTag = (tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTag(tag);
      setEditTagValue(tag);
  };
  
  const submitEditTag = () => {
      if (editingTag && onRenameTag) {
          onRenameTag(editingTag, editTagValue);
      }
      setEditingTag(null);
      setEditTagValue('');
  };

  const isExpanded = !isSidebarCollapsed || (isSidebarHovered && !ignoreHover);
  const sidebarWidth = isExpanded ? 'w-72' : 'w-20';
  
  const userInitials = userStats.userName
    ? userStats.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className={`h-screen w-screen overflow-hidden font-sans transition-colors duration-500 theme-${currentTheme}`}>
      <div className="flex h-full w-full theme-bg text-text">
      
      {/* Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-sidebar backdrop-blur-xl z-40 shadow-2xl transition-all duration-300 ease-in-out border-r border-border relative ${sidebarWidth}`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => { setIsSidebarHovered(false); setIgnoreHover(false); }}
      >
        
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-border shrink-0">
             <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight font-display">
                    {APP_NAME}
                </h1>
             </div>

             <button
                onClick={handleToggleSidebar}
                className={`p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-colors ${!isExpanded ? 'mx-auto' : ''}`}
            >
                 {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
            {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                let hasChildren = ('children' in item && !!item.children) || (item.id === 'calendar' && calendarTags.length > 0);
                const isParentActive = (hasChildren && item.children?.some(child => child.id === currentView)) || (item.id === currentView);
                const isActive = currentView === item.id;
                const isMenuExpanded = expandedMenus[item.id];

                return (
                    <div 
                        key={item.id} 
                        onMouseEnter={() => handleWrapperEnter(item.id)}
                        onMouseLeave={() => handleWrapperLeave(item.id)}
                    >
                        <button
                            onClick={() => handleParentClick(item.id, hasChildren)}
                            className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap relative ${
                                isActive || isParentActive
                                ? 'bg-primary/10 text-primary border border-primary/10' 
                                : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                            }`}
                        >
                            <div className="flex items-center justify-center w-6 h-6 shrink-0">
                                <Icon size={20} className={`transition-colors ${isActive || isParentActive ? 'text-primary' : 'text-text-secondary group-hover:text-text'}`} />
                            </div>
                            
                            <span className={`transition-all duration-300 flex-1 text-left ${!isExpanded ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 ml-1'}`}>
                                {item.label}
                            </span>
                            
                            {hasChildren && isExpanded && (
                                <div 
                                    className="text-text-secondary p-1 hover:text-primary z-10" 
                                    onClick={(e) => handleArrowClick(e, item.id)}
                                >
                                    {isMenuExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                            )}

                            {isActive && isExpanded && !hasChildren && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                            )}
                        </button>
                        
                        {/* Children Items */}
                        {hasChildren && isMenuExpanded && isExpanded && (
                            <div className="mt-1 ml-4 pl-3 border-l border-border space-y-1">
                                {item.id === 'calendar' ? (
                                    calendarTags.map(tag => {
                                        const isSelected = selectedTags.includes(tag);
                                        const isEditing = editingTag === tag;
                                        
                                        return (
                                            <div 
                                                key={tag}
                                                onClick={(e) => { e.stopPropagation(); if(!isEditing) onToggleTag(tag); }}
                                                className="group w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover transition-colors relative"
                                            >
                                                {isEditing ? (
                                                     <div className="flex items-center gap-2 w-full">
                                                         <input 
                                                            ref={editInputRef}
                                                            type="text" 
                                                            value={editTagValue}
                                                            onChange={(e) => setEditTagValue(e.target.value)}
                                                            onBlur={submitEditTag}
                                                            onKeyDown={(e) => e.key === 'Enter' && submitEditTag()}
                                                            className="flex-1 bg-surface border border-primary rounded px-2 py-0.5 text-xs text-text focus:outline-none min-w-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                         />
                                                     </div>
                                                ) : (
                                                    <>
                                                        <div 
                                                            className={`w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0 ${
                                                                isSelected 
                                                                ? 'bg-primary border-primary text-white' 
                                                                : 'border-2 border-border text-transparent hover:border-primary'
                                                            }`}
                                                        >
                                                            <Check size={10} strokeWidth={4} />
                                                        </div>
                                                        <span className={`text-sm truncate transition-colors flex-1 ${isSelected ? 'text-text font-medium' : 'text-text-secondary'}`}>
                                                            {tag}
                                                        </span>
                                                        {onRenameTag && tag !== 'Untagged' && (
                                                            <button 
                                                                onClick={(e) => startEditingTag(tag, e)}
                                                                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-primary p-1 transition-opacity"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    item.children?.map(child => {
                                        const ChildIcon = child.icon;
                                        const isChildActive = currentView === child.id;
                                        return (
                                            <button
                                                key={child.id}
                                                onClick={(e) => { e.stopPropagation(); handleChildClick(item.id, child.id); }}
                                                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap ${
                                                    isChildActive
                                                    ? 'bg-primary/10 text-primary shadow-sm'
                                                    : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                                                }`}
                                            >
                                                 <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                                    <ChildIcon size={18} className={isChildActive ? 'text-primary' : 'text-current'} />
                                                 </div>
                                                <span>{child.label}</span>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border bg-surface/50">
            <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
                <div 
                    className={`flex items-center gap-2 p-1 rounded-xl transition-colors relative cursor-pointer hover:bg-surface-hover`}
                    ref={profileRef}
                    onClick={() => setShowProfileStats(!showProfileStats)}
                >
                     <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/20">
                        {userInitials}
                    </div>
                    {isExpanded && (
                        <div className="min-w-0 pr-2">
                            <p className="text-sm font-semibold text-text truncate">{userStats.userName}</p>
                            <p className="text-xs text-text-secondary truncate">Pro Plan</p>
                        </div>
                    )}
                </div>
                
                <div className={`flex ${isExpanded ? 'gap-1' : 'flex-col gap-2'}`}>
                    <button onClick={toggleTheme} className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-colors">
                        {currentTheme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button 
                        onClick={() => { onNavigate('settings'); setExpandedMenus({}); }}
                        className="p-2 text-text-secondary hover:text-text rounded-lg hover:bg-surface-hover"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>
            
             {/* Profile Popover */}
            {showProfileStats && (
                <div className="absolute bottom-4 left-full ml-4 w-72 bg-surface border border-border rounded-2xl shadow-2xl p-5 z-50">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                        <h3 className="font-bold text-text">Account Overview</h3>
                        <button onClick={(e) => {e.stopPropagation(); setShowProfileStats(false)}} className="text-text-secondary hover:text-text">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success/10 text-success">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-text-secondary font-bold uppercase">Today's Load</p>
                                <p className="text-sm text-text font-semibold">{userStats.pendingTasks} Pending</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-info/10 text-info">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-text-secondary font-bold uppercase">Partner</p>
                                <p className="text-sm text-text font-semibold">{userStats.partnerName || 'Not Connected'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 bg-header backdrop-blur-xl border-b border-border flex items-center justify-between px-6 z-30 shrink-0">
             <div className="flex items-center gap-6">
                <button className="md:hidden text-text-secondary">
                    <Menu size={24} />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight font-display md:hidden">
                    {APP_NAME}
                </h1>
                
                 <div className="relative hidden md:block" ref={createMenuRef}>
                     <button 
                        onClick={() => setShowCreateMenu(!showCreateMenu)}
                        className="flex items-center gap-2 bg-text text-bg px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Create</span>
                        <ChevronDown size={14} className={`opacity-60 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Create Dropdown */}
                    {showCreateMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-xl overflow-hidden z-50 flex flex-col p-1.5 shadow-xl">
                            {[
                              { id: 'EVENT', icon: Calendar, label: 'Event', color: 'text-primary' },
                              { id: 'TASK', icon: CheckSquare, label: 'Task', color: 'text-info' },
                              { id: 'APPOINTMENT', icon: Clock, label: 'Appointment', color: 'text-accent' },
                              { id: 'REMINDER', icon: Bell, label: 'Reminder', color: 'text-warning' }
                            ].map(type => (
                              <button 
                                  key={type.id}
                                  onClick={() => { onAddTask(type.id as TaskType); setShowCreateMenu(false); }} 
                                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover rounded-lg text-left transition-colors group"
                              >
                                  <type.icon size={16} className={`${type.color} group-hover:scale-110 transition-transform`} />
                                  <span className="text-sm font-semibold text-text">{type.label}</span>
                              </button>
                            ))}
                        </div>
                    )}
                 </div>
             </div>

             <div className="flex items-center gap-6">
                 <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-colors cursor-pointer shadow-sm" onClick={() => onNavigate('budget')}>
                     <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                         <Wallet size={18} />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none mb-1">Budget</p>
                         <p className={`text-sm font-bold leading-none ${userStats.budgetRemaining < 0 ? 'text-danger' : 'text-text'}`}>
                             {userStats.budgetRemaining.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                         </p>
                     </div>
                 </div>
             </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-0 relative scroll-smooth bg-transparent">
             <div className="container mx-auto max-w-6xl p-4 md:p-8 lg:p-10 space-y-8">
                {children}
             </div>
        </main>
      </div>
      </div>
    </div>
  );
};