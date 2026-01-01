import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat, Calendar, CalendarDays, CalendarClock, Settings2, DollarSign, CheckCircle2, Circle } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { format, addWeeks, subWeeks, startOfWeek, addMonths, subMonths, isSameDay, addDays, subDays } from 'date-fns';
import { Task, TaskPriority, TaskStatus, RecurringTransaction } from '../types';
import Button from './Button';
import CalendarDayCell from './CalendarDayCell';
import WeekView from './WeekView';
import DayView from './DayView';
import CustomIntervalView from './CustomIntervalView';
import DraggableTask, { TYPE_COLORS } from './DraggableTask';

interface CalendarViewProps {
    tasks: Task[];
    recurringTransactions?: RecurringTransaction[];
    onDateClick: (date: Date) => void;
    onEditTask: (task: Task) => void;
    onUpdateTask?: (task: Task) => void;
    onToggleStatus?: (task: Task) => void;
    selectedDate?: Date; // Jump to this date when provided
}

type ViewMode = 'month' | 'week' | 'day' | 'custom';
type IntervalUnit = 'day' | 'week' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, recurringTransactions = [], onDateClick, onEditTask, onUpdateTask, onToggleStatus, selectedDate: propSelectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [customIntervalValue, setCustomIntervalValue] = useState(3); // Numeric value
    const [customIntervalUnit, setCustomIntervalUnit] = useState<IntervalUnit>('day'); // Unit
    const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
    const intervalDropdownRef = useRef<HTMLDivElement>(null);

    // Handle selectedDate prop - jump to that date when it changes
    useEffect(() => {
        if (propSelectedDate) {
            setCurrentDate(propSelectedDate);
            setViewMode('day'); // Switch to day view when a specific date is selected
        }
    }, [propSelectedDate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (intervalDropdownRef.current && !intervalDropdownRef.current.contains(event.target as Node)) {
                setShowIntervalDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const currentMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    // Calculate custom interval in days based on value and unit
    const customIntervalDays = useMemo(() => {
        switch (customIntervalUnit) {
            case 'week': return customIntervalValue * 7;
            case 'month': return customIntervalValue * 30; // Approximate
            default: return customIntervalValue;
        }
    }, [customIntervalValue, customIntervalUnit]);

    // Get display label for custom interval
    const getCustomIntervalLabel = () => {
        const unitLabels: Record<IntervalUnit, string> = { day: 'D', week: 'W', month: 'M' };
        return `${customIntervalValue}${unitLabels[customIntervalUnit]}`;
    };

    // Validate and clamp interval value
    const handleIntervalValueChange = (value: number) => {
        // Calculate max value based on unit (12 months max = 365 days)
        let maxValue: number;
        switch (customIntervalUnit) {
            case 'month': maxValue = 12; break;
            case 'week': maxValue = 52; break; // ~12 months
            default: maxValue = 365; break; // 12 months in days
        }
        const clampedValue = Math.max(1, Math.min(maxValue, value));
        setCustomIntervalValue(clampedValue);
    };

    // Handle unit change and adjust value if needed
    const handleIntervalUnitChange = (unit: IntervalUnit) => {
        setCustomIntervalUnit(unit);
        // Clamp value to new unit's max
        let maxValue: number;
        switch (unit) {
            case 'month': maxValue = 12; break;
            case 'week': maxValue = 52; break;
            default: maxValue = 365; break;
        }
        if (customIntervalValue > maxValue) {
            setCustomIntervalValue(maxValue);
        }
    };

    const navigate = (direction: number) => {
        if (viewMode === 'month') {
            setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        } else if (viewMode === 'day') {
            setCurrentDate(direction > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
        } else if (viewMode === 'custom') {
            setCurrentDate(direction > 0 ? addDays(currentDate, customIntervalDays) : subDays(currentDate, customIntervalDays));
        }
    };


    // Optimized helper to check if a recurring task happens on a specific date without re-parsing dates
    const checkRecurrence = useCallback((task: Task, taskDate: Date, date: Date): boolean => {
        const isSameDay = taskDate.getDate() === date.getDate() &&
            taskDate.getMonth() === date.getMonth() &&
            taskDate.getFullYear() === date.getFullYear();

        if (isSameDay) return true;

        if (!task.recurrence || task.recurrence.frequency === 'none') return false;
        if (date < taskDate) return false;
        if (task.recurrence.endDate && date > new Date(task.recurrence.endDate)) return false;

        const diffTime = Math.abs(date.getTime() - taskDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const { frequency, interval } = task.recurrence;

        if (frequency === 'daily') {
            return diffDays % interval === 0;
        }

        if (frequency === 'weekly') {
            if (date.getDay() !== taskDate.getDay()) return false;
            const diffWeeks = Math.floor(diffDays / 7);
            return diffWeeks % interval === 0;
        }

        if (frequency === 'monthly') {
            if (date.getDate() !== taskDate.getDate()) return false;
            const monthDiff = (date.getFullYear() - taskDate.getFullYear()) * 12 + (date.getMonth() - taskDate.getMonth());
            return monthDiff > 0 && monthDiff % interval === 0;
        }

        if (frequency === 'yearly') {
            return date.getMonth() === taskDate.getMonth() && date.getDate() === taskDate.getDate();
        }

        return false;
    }, []);

    // Wrapper for single date checks (legacy support)
    const doesTaskOccurOnDate = useCallback((task: Task, date: Date): boolean => {
        let taskDateStr = task.dueDate || task.reminderTime;
        if (!taskDateStr) return false;

        if (taskDateStr.length === 10 && !taskDateStr.includes('T')) {
            taskDateStr += 'T00:00:00';
        }

        const taskDate = new Date(taskDateStr);
        return checkRecurrence(task, taskDate, date);
    }, [checkRecurrence]);

    // Helper to check if a recurring transaction is due on a specific date
    const getFinancialItemsForDate = useCallback((date: Date): RecurringTransaction[] => {
        return recurringTransactions.filter(transaction => {
            const dueDate = new Date(transaction.nextDueDate);
            return isSameDay(dueDate, date);
        });
    }, [recurringTransactions]);

    // Optimized calendar generation: O(Tasks + Days) instead of O(Tasks * Days)
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        // 1. Initialize Map for tasks
        const tasksByDay = new Map<number, Task[]>();
        for (let i = 1; i <= daysInMonth; i++) tasksByDay.set(i, []);

        // 2. Iterate Tasks Once
        tasks.forEach(task => {
            let taskDateStr = task.dueDate || task.reminderTime;
            if (!taskDateStr) return;

            if (taskDateStr.length === 10 && !taskDateStr.includes('T')) {
                taskDateStr += 'T00:00:00';
            }

            const taskDate = new Date(taskDateStr);

            // Optimization for non-recurring (O(1) insertion)
            if (!task.recurrence || task.recurrence.frequency === 'none') {
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                    const day = taskDate.getDate();
                    if (tasksByDay.has(day)) {
                        tasksByDay.get(day)!.push(task);
                    }
                }
            } else {
                // Recurring: Check against days in month
                // This is still iterated, but only for recurring tasks (minority)
                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDayDate = new Date(year, month, day);
                    if (checkRecurrence(task, taskDate, currentDayDate)) {
                        tasksByDay.get(day)!.push(task);
                    }
                }
            }
        });

        // 3. Build Result Array
        const days: Array<{ day: number | null; date?: Date; tasks?: Task[]; financialItems?: RecurringTransaction[] }> = [];

        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayTasks = tasksByDay.get(i) || [];
            const financialItems = getFinancialItemsForDate(date);
            days.push({ day: i, date: date, tasks: dayTasks, financialItems });
        }

        return days;
    }, [currentMonth, tasks, checkRecurrence, getFinancialItemsForDate]);

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    const selectedDayTasks = selectedDate
        ? tasks.filter(task => doesTaskOccurOnDate(task, selectedDate))
        : [];

    // Drag and Drop handlers
    const handleDragStart = (event: any) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over || !onUpdateTask) return;

        const task = tasks.find(t => t.id === active.id);
        if (!task) return;

        // Parse the droppable ID to get the new date/time
        const overId = over.id as string;
        let newDate: Date;

        if (overId.includes('-')) {
            // Week view: format is "yyyy-MM-dd-HH"
            const parts = overId.split('-');
            if (parts.length === 4) {
                // Week view hour cell
                const [year, month, day, hour] = parts;
                newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
            } else if (parts.length === 3) {
                // Month view day cell
                const [year, month, day] = parts;
                newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                return;
            }
        } else {
            return;
        }

        // Update task with new date
        const updatedTask: Task = {
            ...task,
            dueDate: newDate.toISOString(),
            reminderTime: task.reminderTime 
                ? new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 
                    new Date(task.reminderTime).getHours(), new Date(task.reminderTime).getMinutes()
                  ).toISOString()
                : undefined
        };

        onUpdateTask(updatedTask);
    };

    const getHeaderTitle = () => {
        if (viewMode === 'month') {
            return currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        } else if (viewMode === 'week') {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
            return format(weekStart, 'MMM d, yyyy');
        } else if (viewMode === 'day') {
            return format(currentDate, 'EEEE, MMMM d, yyyy');
        } else {
            // Custom interval
            const endDate = addDays(currentDate, customIntervalDays - 1);
            return `${format(currentDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        }
    };


    return (
        <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
        >
            <div className="h-full flex flex-col animate-fade-in relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {getHeaderTitle()}
                    </h2>
                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    viewMode === 'month'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <Calendar size={16} />
                                Month
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    viewMode === 'week'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <CalendarDays size={16} />
                                Week
                            </button>
                            <button
                                onClick={() => setViewMode('day')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    viewMode === 'day'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <CalendarClock size={16} />
                                Day
                            </button>
                            
                            {/* Custom Interval Dropdown */}
                            <div className="relative" ref={intervalDropdownRef}>
                                <button
                                    onClick={() => {
                                        setShowIntervalDropdown(!showIntervalDropdown);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        viewMode === 'custom'
                                            ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Settings2 size={16} />
                                    {viewMode === 'custom' ? getCustomIntervalLabel() : 'Custom'}
                                </button>
                                
                                {showIntervalDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-white/10 p-3 z-50 animate-scale-in">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Custom Interval</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={customIntervalUnit === 'month' ? 12 : customIntervalUnit === 'week' ? 52 : 365}
                                                value={customIntervalValue}
                                                onChange={(e) => handleIntervalValueChange(parseInt(e.target.value) || 1)}
                                                className="w-16 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                            />
                                            <select
                                                value={customIntervalUnit}
                                                onChange={(e) => handleIntervalUnitChange(e.target.value as IntervalUnit)}
                                                className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                            >
                                                <option value="day">Day{customIntervalValue !== 1 ? 's' : ''}</option>
                                                <option value="week">Week{customIntervalValue !== 1 ? 's' : ''}</option>
                                                <option value="month">Month{customIntervalValue !== 1 ? 's' : ''}</option>
                                            </select>
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Min: 1 day • Max: 12 months</p>
                                        <button
                                            onClick={() => {
                                                setViewMode('custom');
                                                setShowIntervalDropdown(false);
                                            }}
                                            className="w-full mt-3 px-3 py-1.5 bg-brand-500 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:bg-brand-600 transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Today Button */}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentDate(new Date())}
                            className="text-brand-500 hover:text-brand-600"
                        >
                            Today
                        </Button>

                        {/* Navigation */}
                        <div className="flex gap-2">
                            <Button variant="secondary" size="icon" onClick={() => navigate(-1)}>
                                <ChevronLeft size={20} />
                            </Button>
                            <Button variant="secondary" size="icon" onClick={() => navigate(1)}>
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Calendar Content */}
                {viewMode === 'month' && (
                    <div className="flex-1 min-h-0 flex flex-col">
                        {/* Day Names */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
                            {calendarDays.map((cell, idx) => (
                                <CalendarDayCell
                                    key={idx}
                                    day={cell.day}
                                    date={cell.date || null}
                                    tasks={cell.tasks || []}
                                    financialItems={cell.financialItems || []}
                                    isToday={cell.date?.toDateString() === new Date().toDateString()}
                                    onClick={() => cell.date && handleDayClick(cell.date)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'week' && (
                    <WeekView
                        tasks={tasks}
                        currentDate={currentDate}
                        onEditTask={onEditTask}
                    />
                )}

                {viewMode === 'day' && (
                    <DayView
                        tasks={tasks}
                        currentDate={currentDate}
                        onEditTask={onEditTask}
                    />
                )}

                {viewMode === 'custom' && (
                    <CustomIntervalView
                        tasks={tasks}
                        currentDate={currentDate}
                        intervalDays={customIntervalDays}
                        onEditTask={onEditTask}
                    />
                )}

                {/* Day Detail Modal */}
                {selectedDate && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)} />
                        <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[70vh]">
                            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                        {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">{selectedDayTasks.length} tasks scheduled</p>
                                </div>
                                <button onClick={() => setSelectedDate(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedDayTasks.length === 0 && (
                                    <p className="text-center text-slate-500 py-8 italic">No tasks for this day.</p>
                                )}
                                {selectedDayTasks.map(task => {
                                    const colorClass = TYPE_COLORS[task.type] || TYPE_COLORS.TASK;
                                    const isDone = task.status === TaskStatus.DONE;
                                    return (
                                        <div
                                            key={task.id}
                                            className={`group p-3 rounded-xl border-l-4 cursor-pointer transition-all ${colorClass} hover:shadow-md ${isDone ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Toggle Status Button */}
                                                {onToggleStatus && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onToggleStatus(task);
                                                        }}
                                                        className={`mt-0.5 flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 ${
                                                            isDone
                                                                ? 'text-emerald-500 drop-shadow-sm'
                                                                : 'text-slate-400 hover:text-brand-500'
                                                        }`}
                                                        aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                                                    >
                                                        {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                    </button>
                                                )}
                                                
                                                {/* Task Content */}
                                                <div className="flex-1 min-w-0" onClick={() => onEditTask(task)}>
                                                    <h4 className={`font-semibold text-sm ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{task.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs opacity-75 mt-1">
                                                        {task.reminderTime && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(task.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                        {task.recurrence && task.recurrence.frequency !== 'none' && (
                                                            <span className="flex items-center gap-1">
                                                                <Repeat size={10} /> {task.recurrence.frequency}
                                                            </span>
                                                        )}
                                                        {isDone && (
                                                            <span className="text-emerald-500 font-medium">✓ Done</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        onDateClick(selectedDate);
                                        setSelectedDate(null);
                                    }}
                                >
                                    <Plus size={16} className="mr-2" /> Add Task for this Day
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTask && (
                        <div className={`px-3 py-2 rounded-lg shadow-lg border-l-4 ${TYPE_COLORS[activeTask.type]}`}>
                            <span className="text-sm font-medium">{activeTask.title}</span>
                        </div>
                    )}
                </DragOverlay>
            </div>
        </DndContext>
    );
};

export default CalendarView;
