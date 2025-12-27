
import React, { useState, useRef, useEffect } from 'react';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { ViewMode, TaskType, ThemeOption } from '../types';
import { Plus, Settings, X, Wallet, CheckCircle2, User, ChevronDown, Calendar, CheckSquare, Clock, Moon, Sun, ChevronLeft, ChevronRight, Menu, PanelLeft, PanelLeftClose, Bell, ChevronUp, Check, Pencil } from 'lucide-react';
import { t, ThemeText } from '../themeText';

// Map navigation IDs to themeText keys
const navIdToTextKey: Record<string, keyof Omit<ThemeText, 'greeting'>> = {
    'dashboard': 'dashboard',
    'activities': 'activities',
    'tasks': 'tasks',
    'reminders': 'reminders',
    'events': 'events',
    'appointments': 'appointments',
    'calendar': 'calendar',
    'budget': 'budgetPlan',
    'ai-chat': 'aiAssistant',
    'settings': 'settings',
};

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
    // New props for Calendar Tag Filtering
    calendarTags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
    // Rename Tag functionality
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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Helper function to get theme-specific navigation label
    const getNavLabel = (id: string, defaultLabel: string): string => {
        const textKey = navIdToTextKey[id];
        return textKey ? t(currentTheme, textKey) : defaultLabel;
    };


    // Tag Editing State
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editTagValue, setEditTagValue] = useState('');

    // State for expanded nested menus
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
        if (currentTheme === 'light') {
            onThemeChange('dark');
        } else {
            onThemeChange('light');
        }
    };

    const handleParentClick = (itemId: string, hasChildren: boolean) => {
        onNavigate(itemId as ViewMode);

        if (hasChildren) {
            // Accordion behavior: Open clicked, close others
            setExpandedMenus({ [itemId]: true });
        } else {
            // Close all dropdowns if clicking a non-expandable item
            setExpandedMenus({});
        }
    };

    const handleArrowClick = (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();

        if (itemId === 'calendar') {
            if (currentView === 'calendar') {
                // If already on calendar view, toggle the menu
                setExpandedMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
            } else {
                // Navigate to calendar and ensure expanded, close others
                onNavigate(itemId as ViewMode);
                setExpandedMenus({ [itemId]: true });
            }
        } else {
            // Standard behavior for others (like Activities): Toggle only
            setExpandedMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
        }
    };

    const handleWrapperEnter = (itemId: string) => {
        // Calendar: Click only (per previous request)
        if (itemId === 'calendar') return;

        // Activities/Others: Open on Hover
        setExpandedMenus(prev => ({ ...prev, [itemId]: true }));
    };

    const handleWrapperLeave = (itemId: string) => {
        // Calendar: Maintain state (Click to toggle)
        if (itemId === 'calendar') return;

        // Activities/Others: Close on Mouse Leave
        setExpandedMenus(prev => ({ ...prev, [itemId]: false }));
    };

    const handleChildClick = (parentId: string, childId: string) => {
        onNavigate(childId as ViewMode);
        // Keep parent open when clicking a child, close others
        setExpandedMenus({ [parentId]: true });
    };

    // Logic to allow immediate collapse even if hovered
    const handleToggleSidebar = () => {
        if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
        } else {
            setIsSidebarCollapsed(true);
            setIgnoreHover(true);
        }
    };

    const handleSidebarEnter = () => {
        setIsSidebarHovered(true);
    };

    const handleSidebarLeave = () => {
        setIsSidebarHovered(false);
        setIgnoreHover(false);
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

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitEditTag();
        } else if (e.key === 'Escape') {
            setEditingTag(null);
        }
    };

    const isExpanded = !isSidebarCollapsed || (isSidebarHovered && !ignoreHover);
    const sidebarWidth = isExpanded ? 'w-72' : 'w-20';

    const userInitials = userStats.userName
        ? userStats.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className={`h-screen w-screen overflow-hidden font-sans transition-colors duration-500`}>
            {/* Global Background */}
            <div className="flex h-full w-full bg-gradient-main text-slate-800 dark:text-slate-200">

                {/* Sidebar */}
                <aside
                    className={`hidden md:flex flex-col glass z-40 shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-white/5 relative ${sidebarWidth}`}
                    onMouseEnter={handleSidebarEnter}
                    onMouseLeave={handleSidebarLeave}
                >

                    {/* Sidebar Header */}
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                        <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                            {/* Theme-specific logo + text */}
                            <div className="flex items-center gap-2">
                                <img
                                    src={currentTheme === 'cyberpunk' ? '/logo-cyberpunk.jpg' : currentTheme === 'onepiece' ? '/logo-onepiece.png' : currentTheme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
                                    alt={APP_NAME}
                                    className="h-9 w-auto rounded-lg"
                                />
                                <span className={`text-lg font-bold tracking-wide font-display ${currentTheme === 'light' ? 'text-slate-800' : currentTheme === 'onepiece' ? 'text-[#E8DCD0]' : 'text-white'}`}>
                                    {APP_NAME}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleToggleSidebar}
                            className={`p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ${!isExpanded ? 'mx-auto' : ''}`}
                            title={isSidebarCollapsed ? "Pin Sidebar Open" : "Collapse Sidebar"}
                        >
                            {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
                        {NAVIGATION_ITEMS.map((item) => {
                            const Icon = item.icon;

                            // Dynamic Children Handling
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
                                    {/* Parent Item */}
                                    <button
                                        onClick={() => handleParentClick(item.id, hasChildren)}
                                        className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap relative ${isActive || isParentActive
                                            ? 'bg-brand-500/5 text-brand-600 dark:text-brand-300 border border-brand-500/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
                                            }`}
                                        title={!isExpanded ? item.label : undefined}
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 shrink-0">
                                            <Icon size={20} className={`transition-colors ${isActive || isParentActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                        </div>

                                        <span className={`transition-all duration-300 flex-1 text-left ${!isExpanded ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 ml-1'}`}>
                                            {getNavLabel(item.id, item.label)}
                                        </span>

                                        {hasChildren && isExpanded && (
                                            <div
                                                className="text-slate-400 p-1 hover:text-brand-500 dark:hover:text-brand-400 z-10"
                                                onClick={(e) => handleArrowClick(e, item.id)}
                                            >
                                                {isMenuExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </div>
                                        )}

                                        {isActive && isExpanded && !hasChildren && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
                                        )}
                                    </button>

                                    {/* Children Items */}
                                    {hasChildren && isMenuExpanded && isExpanded && (
                                        <div className="mt-1 ml-4 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 animate-slide-up">
                                            {item.id === 'calendar' ? (
                                                // Special Calendar Filters
                                                calendarTags.map(tag => {
                                                    const isSelected = selectedTags.includes(tag);
                                                    const isEditing = editingTag === tag;

                                                    return (
                                                        <div
                                                            key={tag}
                                                            onClick={(e) => { e.stopPropagation(); if (!isEditing) onToggleTag(tag); }}
                                                            className="group w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative"
                                                        >
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <input
                                                                        ref={editInputRef}
                                                                        type="text"
                                                                        value={editTagValue}
                                                                        onChange={(e) => setEditTagValue(e.target.value)}
                                                                        onKeyDown={handleEditKeyDown}
                                                                        onBlur={submitEditTag}
                                                                        className="flex-1 bg-white dark:bg-slate-800 border border-brand-500 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none min-w-0"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div
                                                                        className={`w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                                                                            ? 'bg-brand-500 border-brand-500 text-white'
                                                                            : 'border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-brand-400'
                                                                            }`}
                                                                    >
                                                                        <Check size={10} strokeWidth={4} />
                                                                    </div>
                                                                    <span className={`text-sm truncate transition-colors flex-1 ${isSelected ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>
                                                                        {tag}
                                                                    </span>

                                                                    {onRenameTag && tag !== 'Untagged' && (
                                                                        <button
                                                                            onClick={(e) => startEditingTag(tag, e)}
                                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-500 p-1 transition-opacity"
                                                                            title="Rename Tag"
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
                                                // Standard Nested Items
                                                item.children?.map(child => {
                                                    const ChildIcon = child.icon;
                                                    const isChildActive = currentView === child.id;
                                                    return (
                                                        <button
                                                            key={child.id}
                                                            onClick={(e) => { e.stopPropagation(); handleChildClick(item.id, child.id); }}
                                                            className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap ${isChildActive
                                                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300 shadow-sm'
                                                                : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                                                <ChildIcon size={18} strokeWidth={isChildActive ? 2.5 : 2} className={isChildActive ? 'text-brand-500 dark:text-brand-400' : 'text-current'} />
                                                            </div>
                                                            <span>{getNavLabel(child.id, child.label)}</span>
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}

                                    {/* Collapsed Parent Indicator dot if nested child is active */}
                                    {hasChildren && !isExpanded && isParentActive && (
                                        <div className="mx-auto mt-1 w-1 h-1 rounded-full bg-brand-500" />
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">

                        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-4'}`}>

                            {/* User Profile */}
                            <div
                                className={`flex items-center gap-2 p-1 rounded-xl transition-colors relative cursor-pointer hover:bg-black/5 dark:hover:bg-white/5`}
                                ref={profileRef}
                                onClick={() => setShowProfileStats(!showProfileStats)}
                                title="Profile"
                            >
                                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/20">
                                    {userInitials}
                                </div>
                                {isExpanded && (
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{userStats.userName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Pro Plan</p>
                                    </div>
                                )}
                            </div>

                            {/* Icons Group */}
                            <div className={`flex ${isExpanded ? 'gap-1' : 'flex-col gap-2'}`}>
                                {/* Quick Theme Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    title="Toggle Theme"
                                >
                                    {currentTheme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                                </button>

                                {/* Settings Icon */}
                                <button
                                    onClick={() => { onNavigate('settings'); setExpandedMenus({}); }}
                                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                                    title="Settings"
                                >
                                    <Settings size={20} />
                                </button>
                            </div>

                        </div>

                        {/* Profile Popover */}
                        {showProfileStats && (
                            <div className="absolute bottom-4 left-full ml-4 w-72 glass-panel rounded-2xl shadow-2xl p-5 animate-scale-in z-50 bg-white/90 dark:bg-slate-900/90">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/5">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Account Overview</h3>
                                    <button onClick={(e) => { e.stopPropagation(); setShowProfileStats(false) }} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase">Today's Load</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{userStats.pendingTasks} Pending</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase">Partner</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{userStats.partnerName || 'Not Connected'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                    {/* TOP Header */}
                    <header className="h-20 glass border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 z-30 shrink-0">
                        {/* Brand */}
                        <div className="flex items-center gap-6">
                            {/* Mobile Menu Trigger (Visible only on mobile) */}
                            <button
                                className="md:hidden text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                                onClick={() => setIsMobileSidebarOpen(true)}
                            >
                                <Menu size={24} />
                            </button>

                            {/* Theme-specific logo + text (mobile) */}
                            <div className="flex md:hidden items-center gap-2">
                                <img
                                    src={currentTheme === 'cyberpunk' ? '/logo-cyberpunk.jpg' : currentTheme === 'onepiece' ? '/logo-onepiece.png' : currentTheme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
                                    alt={APP_NAME}
                                    className="h-8 w-auto rounded-lg"
                                />
                                <span className={`text-lg font-bold tracking-wide font-display ${currentTheme === 'light' ? 'text-slate-800' : currentTheme === 'onepiece' ? 'text-[#E8DCD0]' : 'text-white'}`}>
                                    {APP_NAME}
                                </span>
                            </div>

                            {/* Create Button moved to Header */}
                            <div className="relative hidden md:block" ref={createMenuRef}>
                                <button
                                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                    <span>Create</span>
                                    <ChevronDown size={14} className={`opacity-60 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Create Dropdown */}
                                {showCreateMenu && (
                                    <div className="absolute top-full left-0 mt-2 w-48 glass-panel rounded-xl overflow-hidden animate-scale-in z-50 flex flex-col p-1.5 shadow-xl bg-white dark:bg-slate-900/95">
                                        <button
                                            onClick={() => { onAddTask('EVENT'); setShowCreateMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-left transition-colors group"
                                        >
                                            <Calendar size={16} className="text-brand-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Event</span>
                                        </button>
                                        <button
                                            onClick={() => { onAddTask('TASK'); setShowCreateMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-left transition-colors group"
                                        >
                                            <CheckSquare size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Task</span>
                                        </button>
                                        <button
                                            onClick={() => { onAddTask('APPOINTMENT'); setShowCreateMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-left transition-colors group"
                                        >
                                            <Clock size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Appointment</span>
                                        </button>
                                        <button
                                            onClick={() => { onAddTask('REMINDER'); setShowCreateMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-left transition-colors group"
                                        >
                                            <Bell size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reminder</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side Header Items */}
                        <div className="flex items-center gap-6">
                            {/* Budget Widget */}
                            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer shadow-sm" onClick={() => onNavigate('budget')}>
                                <div className="p-1.5 bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-400">
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Budget</p>
                                    <p className={`text-sm font-bold leading-none ${userStats.budgetRemaining < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {userStats.budgetRemaining.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Mobile Sidebar Drawer */}
                    {isMobileSidebarOpen && (
                        <div className="md:hidden fixed inset-0 z-50">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                                onClick={() => setIsMobileSidebarOpen(false)}
                            />
                            {/* Drawer */}
                            <aside className="absolute left-0 top-0 h-full w-72 glass shadow-2xl border-r border-slate-200 dark:border-white/5 flex flex-col animate-slide-in-left">
                                {/* Drawer Header */}
                                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={currentTheme === 'cyberpunk' ? '/logo-cyberpunk.jpg' : currentTheme === 'onepiece' ? '/logo-onepiece.png' : currentTheme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
                                            alt={APP_NAME}
                                            className="h-9 w-auto rounded-lg"
                                        />
                                        <span className={`text-lg font-bold tracking-wide font-display ${currentTheme === 'light' ? 'text-slate-800' : currentTheme === 'onepiece' ? 'text-[#E8DCD0]' : 'text-white'}`}>
                                            {APP_NAME}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileSidebarOpen(false)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Drawer Nav */}
                                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar">
                                    {NAVIGATION_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = currentView === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { onNavigate(item.id as ViewMode); setIsMobileSidebarOpen(false); }}
                                                className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap ${isActive
                                                    ? 'bg-brand-500/5 text-brand-600 dark:text-brand-300 border border-brand-500/10'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-center w-6 h-6 shrink-0">
                                                    <Icon size={20} className={`transition-colors ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                                </div>
                                                <span className="flex-1 text-left">{getNavLabel(item.id, item.label)}</span>
                                                {isActive && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </nav>

                                {/* Drawer Footer */}
                                <div className="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 p-1">
                                            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/20">
                                                {userInitials}
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{userStats.userName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Pro Plan</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={toggleTheme}
                                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                {currentTheme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                                            </button>
                                            <button
                                                onClick={() => { onNavigate('settings'); setIsMobileSidebarOpen(false); }}
                                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* Content Scroll Container */}
                    <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-0 relative scroll-smooth">
                        <div className="container mx-auto max-w-6xl p-4 md:p-8 lg:p-10 space-y-8">
                            {children}
                        </div>
                    </main>

                    {/* Mobile Floating Action Button (FAB) */}
                    <div className="md:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                        <button
                            onClick={() => onAddTask('TASK')}
                            className="pointer-events-auto bg-brand-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(14,165,233,0.4)] active:scale-90 transition-transform border-4 border-slate-50 dark:border-slate-900"
                        >
                            <Plus size={28} />
                        </button>
                    </div>

                    {/* Mobile Bottom Nav */}
                    <div className="md:hidden absolute bottom-0 left-0 right-0 glass border-t border-slate-200 dark:border-white/10 pb-safe-area z-30">
                        <div className="flex justify-around items-center h-20 px-4 pb-2">
                            {NAVIGATION_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id as ViewMode)}
                                        className={`flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all ${isActive ? 'text-brand-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-brand-500/10' : ''}`}>
                                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'scale-110 transition-transform' : ''} />
                                        </div>
                                        <span className={`text-[10px] font-medium ${isActive ? 'text-brand-500' : 'text-slate-500'}`}>{getNavLabel(item.id, item.label)}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
