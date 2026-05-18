import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat, Calendar, CalendarDays, CalendarClock, Settings2, CheckCircle2, Circle, ExternalLink, MapPin } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addMonths, subMonths, addDays, subDays, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { formatDateWithWeekday } from '../utils/date';
import { Task, TaskStatus, RecurringTransaction, ThemeOption } from '../types';
import { CalendarEvent, formatEventTime, doesEventOccurOnDate } from '../services/googleCalendarService';
import Button from './Button';
import CalendarDayCell from './CalendarDayCell';
import WeekView from './WeekView';
import DayView from './DayView';
import CustomIntervalView from './CustomIntervalView';
import { TYPE_COLORS } from './DraggableTask';
import Select from './Select';

interface CalendarViewProps {
    tasks: Task[];
    recurringTransactions?: RecurringTransaction[];
    externalEvents?: CalendarEvent[]; // Google Calendar events
    onDateClick: (date: Date) => void;
    onEditTask: (task: Task) => void;
    onUpdateTask?: (task: Task) => void;
    onToggleStatus?: (task: Task) => void;
    selectedDate?: Date; // Jump to this date when provided
    onVisibleTagsChange?: (tags: string[]) => void; // Report tags visible in current view
    unfilteredTasks?: Task[]; // Tasks before filtering by selected tags (for computing available tags)
    currentTheme?: ThemeOption;
}

type ViewMode = 'month' | 'week' | 'day' | 'custom';
type IntervalUnit = 'day' | 'week' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, recurringTransactions = [], externalEvents = [], onDateClick, onEditTask, onUpdateTask, onToggleStatus, selectedDate: propSelectedDate, onVisibleTagsChange, unfilteredTasks, currentTheme = 'dark' }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [customIntervalValue, setCustomIntervalValue] = useState(3); // Numeric value
    const [customIntervalUnit, setCustomIntervalUnit] = useState<IntervalUnit>('day'); // Unit
    const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
    const intervalDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<CalendarEvent | null>(null); // Google event detail modal

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

    // Handle Escape key to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedGoogleEvent) {
                    setSelectedGoogleEvent(null);
                } else if (selectedDate) {
                    setSelectedDate(null);
                }
            }
        };

        if (selectedDate || selectedGoogleEvent) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDate, selectedGoogleEvent]);


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

    // ⚡ Bolt Optimization: Pre-parse dates to avoid repeated new Date() calls during navigation/filtering
    // Also store startNormalized (midnight) to prevent creating new Date() objects inside calendarDays loop
    const taskDatesMap = useMemo(() => {
        const map = new Map<string, { start: Date; startNormalized: Date; end?: Date }>();
        // Use unfilteredTasks if available, otherwise tasks.
        // This ensures we cover all potential tasks that might be visible.
        (unfilteredTasks || tasks).forEach(task => {
            let dateStr = task.dueDate || task.reminderTime;
            if (dateStr) {
                 // Standardize date-only strings to local midnight (T00:00:00)
                 if (dateStr.length === 10 && !dateStr.includes('T')) {
                    dateStr += 'T00:00:00';
                 }
                 const start = new Date(dateStr);
                 // Pre-calculate midnight normalized date for consistent math without repeated allocations
                 // ⚡ Optimization: Pre-calculate normalized start (midnight) once here
                 // instead of recalculating it for every task on every month navigation
                 const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                 const end = task.recurrence?.endDate ? new Date(task.recurrence.endDate) : undefined;
                 map.set(task.id, { start, startNormalized, end });
            }
        });
        return map;
    }, [tasks, unfilteredTasks]);

    // Compute tags visible in the current view period
    const visibleTags = useMemo(() => {
        const tags = new Set<string>();
        
        // Determine date range based on view mode
        let rangeStart: Date;
        let rangeEnd: Date;
        
        if (viewMode === 'month') {
            rangeStart = startOfMonth(currentDate);
            rangeEnd = endOfMonth(currentDate);
        } else if (viewMode === 'week') {
            rangeStart = startOfWeek(currentDate, { weekStartsOn: 0 });
            rangeEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        } else if (viewMode === 'day') {
            rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
        } else {
            // Custom interval
            rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            rangeEnd = addDays(rangeStart, customIntervalDays - 1);
            rangeEnd.setHours(23, 59, 59);
        }

        // Check each task to see if it falls within the range
        // Use unfilteredTasks if available to show ALL possible tags for this view, otherwise fall back to tasks
        (unfilteredTasks || tasks).forEach(task => {
            // ⚡ Bolt Optimization: Skip expensive date parsing if all tags are already visible
            if (task.tags.length === 0) {
                if (tags.has('Untagged')) return;
            } else {
                if (task.tags.every(tag => tags.has(tag))) return;
            }

            // ⚡ Bolt Optimization: Use pre-parsed date
            const dates = taskDatesMap.get(task.id);
            if (!dates) return;
            const { start: taskDate, end: taskEndDate } = dates;
            
            // Check if task is within range (including recurrence)
            const isInRange = taskDate >= rangeStart && taskDate <= rangeEnd;
            
            // For recurring tasks, we need to check if any occurrence is in range
            let hasOccurrenceInRange = isInRange;

            // ⚡ Performance Optimization: Mathematical check instead of iterative day-by-day loop
            // Reduces complexity from O(Tasks * ViewDays) to O(Tasks)
            if (!hasOccurrenceInRange && task.recurrence && task.recurrence.frequency !== 'none') {
                const { frequency, interval } = task.recurrence;
                const recurrenceInterval = interval || 1;

                // Check bounds
                if (taskEndDate && taskEndDate < rangeStart) return; // Recursion ended before this view
                if (taskDate > rangeEnd) return; // Starts after this view

                // Check specific frequencies mathematically
                if (frequency === 'daily') {
                    // Find days between start and range start
                    const diffDays = differenceInCalendarDays(rangeStart, taskDate);

                    if (diffDays <= 0) {
                        // Task starts inside or after rangeStart, but we know taskDate <= rangeEnd
                        // If taskDate >= rangeStart, it would be caught by isInRange.
                        // If taskDate > rangeEnd, caught by bounds check.
                        // So taskDate < rangeStart. diffDays > 0.
                        // Wait, if diffDays <= 0, taskDate >= rangeStart.
                        // Since !isInRange, this case shouldn't be possible unless taskDate > rangeEnd (caught).
                        // However, just to be safe/complete:
                         hasOccurrenceInRange = true; // Should have been caught by isInRange if logic holds
                    } else {
                        // Task starts before range. Calculate next occurrence >= rangeStart
                        const remainder = diffDays % recurrenceInterval;
                        const daysToNext = remainder === 0 ? 0 : (recurrenceInterval - remainder);
                        const nextOccurrence = addDays(rangeStart, daysToNext);
                        
                        if (nextOccurrence <= rangeEnd && (!taskEndDate || nextOccurrence <= taskEndDate)) {
                            hasOccurrenceInRange = true;
                        }
                    }
                } else if (frequency === 'weekly') {
                    // Find next occurrence that matches weekday AND interval
                    const diffDays = differenceInCalendarDays(rangeStart, taskDate);

                    if (diffDays <= 0) {
                        hasOccurrenceInRange = true;
                    } else {
                        // Align to week interval
                        // We need (date - taskDate) in days to be multiple of (7 * interval)
                        const daysPerPeriod = 7 * recurrenceInterval;
                        const remainder = diffDays % daysPerPeriod;
                        const daysToNext = remainder === 0 ? 0 : (daysPerPeriod - remainder);
                        const nextOccurrence = addDays(rangeStart, daysToNext);

                        if (nextOccurrence <= rangeEnd && (!taskEndDate || nextOccurrence <= taskEndDate)) {
                            hasOccurrenceInRange = true;
                        }
                    }
                } else if (frequency === 'monthly') {
                    // Monthly is sparse, safe to iterate months or just check specific day
                    // Check if the day of month exists in the range
                    let candidate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), taskDate.getDate());

                    // Handle case where month doesn't have that day (e.g. 31st in Feb) - Date object auto-corrects to Mar 2/3
                    // We need to strictly match the day
                    while (candidate <= rangeEnd) {
                        if (candidate >= rangeStart && candidate.getDate() === taskDate.getDate()) {
                             // Check interval
                             const monthDiff = (candidate.getFullYear() - taskDate.getFullYear()) * 12 + (candidate.getMonth() - taskDate.getMonth());
                             if (monthDiff % recurrenceInterval === 0 && (!taskEndDate || candidate <= taskEndDate)) {
                                 hasOccurrenceInRange = true;
                                 break;
                             }
                        }
                        candidate = addMonths(candidate, 1);
                        // Reset date to target day (in case addMonths shifted it due to shorter months)
                        candidate.setDate(taskDate.getDate());
                    }
                } else if (frequency === 'yearly') {
                     let candidate = new Date(rangeStart.getFullYear(), taskDate.getMonth(), taskDate.getDate());
                     while (candidate <= rangeEnd) {
                         if (candidate >= rangeStart &&
                             candidate.getMonth() === taskDate.getMonth() &&
                             candidate.getDate() === taskDate.getDate()) {
                                 if ((!taskEndDate || candidate <= taskEndDate)) {
                                     hasOccurrenceInRange = true;
                                     break;
                                 }
                         }
                         candidate = new Date(candidate.getFullYear() + 1, taskDate.getMonth(), taskDate.getDate());
                     }
                }
            }
            
            if (hasOccurrenceInRange) {
                if (task.tags.length === 0) {
                    tags.add('Untagged');
                } else {
                    task.tags.forEach(tag => tags.add(tag));
                }
            }
        });

        return Array.from(tags).sort((a, b) => {
            if (a === 'Untagged') return -1;
            if (b === 'Untagged') return 1;
            return a.localeCompare(b);
        });
    }, [tasks, unfilteredTasks, currentDate, viewMode, customIntervalDays, taskDatesMap]);

    // Report visible tags to parent component
    const prevVisibleTagsRef = useRef<string[]>([]);

    useEffect(() => {
        if (onVisibleTagsChange) {
            // ⚡ Performance Optimization: Only notify parent if tags actually changed
            // This prevents the parent App component (and the whole tree) from re-rendering
            // when navigating months if the visible tags remain the same.
            const isSame = visibleTags.length === prevVisibleTagsRef.current.length &&
                visibleTags.every((tag, i) => tag === prevVisibleTagsRef.current[i]);

            if (!isSame) {
                prevVisibleTagsRef.current = visibleTags;
                onVisibleTagsChange(visibleTags);
            }
        }
    }, [visibleTags, onVisibleTagsChange]);
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
    const checkRecurrence = useCallback((task: Task, taskDate: Date, date: Date, endDate?: Date | null): boolean => {
        const isSameDay = taskDate.getDate() === date.getDate() &&
            taskDate.getMonth() === date.getMonth() &&
            taskDate.getFullYear() === date.getFullYear();

        if (isSameDay) return true;

        if (!task.recurrence || task.recurrence.frequency === 'none') return false;

        // ⚡ Bolt Optimization: Early exit if date is past recurrence end date
        if (endDate && differenceInCalendarDays(date, endDate) > 0) return false;

        if (date < taskDate) return false;

        const { frequency, interval } = task.recurrence;

        // ⚡ Bolt Optimization: Daily recurrence with interval 1 matches every day
        // (after start date and before end date checks above)
        if (frequency === 'daily' && interval === 1) return true;

        // ⚡ Correctness Fix: Use differenceInCalendarDays to correctly handle time-of-day discrepancies and DST
        const diffDays = differenceInCalendarDays(date, taskDate);
        if (diffDays <= 0) return false;

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


    // Optimized calendar generation: O(Tasks + Days) instead of O(Tasks * Days)
    const calendarDays = useMemo(() => {
        // ⚡ Bolt Optimization: Skip expensive calculation if not in month view
        if (viewMode !== 'month') return [];

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        // 1. Pre-calculate Financial Items Map (O(Transactions) instead of O(Transactions * Days))
        const financialItemsMap = new Map<number, RecurringTransaction[]>();
        recurringTransactions.forEach(item => {
            const itemDate = new Date(item.nextDueDate);
            if (itemDate.getMonth() === month && itemDate.getFullYear() === year) {
                const day = itemDate.getDate();
                if (!financialItemsMap.has(day)) {
                    financialItemsMap.set(day, []);
                }
                financialItemsMap.get(day)!.push(item);
            }
        });

        // 2. Initialize Map for tasks
        const tasksByDay = new Map<number, Task[]>();
        for (let i = 1; i <= daysInMonth; i++) tasksByDay.set(i, []);

        // ⚡ Performance Optimization: Pre-calculate dates for the month
        // Reduces allocations from O(RecurringTasks * Days) to O(Days)
        const monthDates: Date[] = [];
        // Index 0 unused to match 1-based days
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates[i] = new Date(year, month, i);
        }

        // 2. Iterate Tasks Once
        tasks.forEach(task => {
            // ⚡ Bolt Optimization: Use pre-parsed date
            const dates = taskDatesMap.get(task.id);
            if (!dates) return;
            const { start: taskDate, startNormalized, end: taskEndDate } = dates;

            // Normalize task start to midnight for consistent math
            // ⚡ Bolt Optimization: Use pre-calculated normalized date
            // ⚡ Bolt Optimization: Use cached normalized start date
            // Avoids calling new Date() for every task when navigating months
            const taskStart = startNormalized;

            // Optimization for non-recurring (O(1) insertion)
            if (!task.recurrence || task.recurrence.frequency === 'none') {
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                    const day = taskDate.getDate();
                    if (tasksByDay.has(day)) {
                        tasksByDay.get(day)!.push(task);
                    }
                }
            } else {
                // Recurring: Optimized check
                const { frequency, interval = 1 } = task.recurrence;

                // If task ended before this month, skip
                if (taskEndDate && taskEndDate < monthDates[1]) return;

                // If task starts after this month, skip
                // (Note: taskStart is already normalized to midnight)
                if (taskStart > monthDates[daysInMonth]) return;

                // ⚡ Bolt Optimization: Special case for Daily (Interval 1)
                // This is the most common recurrence and we can fill it with a simple loop
                if (frequency === 'daily' && interval === 1) {
                    let startDay = 1;
                    if (taskStart.getFullYear() === year && taskStart.getMonth() === month) {
                        startDay = taskStart.getDate();
                    }

                    let endDay = daysInMonth;
                    if (taskEndDate && taskEndDate.getFullYear() === year && taskEndDate.getMonth() === month) {
                        endDay = taskEndDate.getDate();
                    }

                    for (let d = startDay; d <= endDay; d++) {
                        tasksByDay.get(d)!.push(task);
                    }
                    return;
                }

                // For other frequencies, we "jump" to valid occurrences
                if (frequency === 'daily' || frequency === 'weekly') {
                    let current = new Date(taskStart);

                    // Fast-forward if start is before this month
                    if (current < monthDates[1]) {
                        const diffDays = differenceInCalendarDays(monthDates[1], current);
                        const period = frequency === 'weekly' ? 7 * interval : interval;

                        // Calculate days to add to land on or after month start
                        const remainder = diffDays % period;
                        const toAdd = remainder === 0 ? 0 : (period - remainder);
                        current = addDays(monthDates[1], toAdd);
                    }

                    // ⚡ Bolt Optimization: Integer-based loop instead of recurring Date object creation
                    // Once we are inside the month, we can rely on simple integer addition
                    // This avoids thousands of Date allocations for recurring tasks

                    // First, ensure current is strictly within or past month start
                    // (Jump logic above ensures it's >= monthDates[1], but addDays might overshoot if toAdd is huge)
                    if (current > monthDates[daysInMonth]) return;

                    // If for some reason current is still before month start (shouldn't happen with correct jump logic), forward it
                    while (current < monthDates[1]) {
                         const step = frequency === 'weekly' ? 7 * interval : interval;
                         current = addDays(current, step);
                    }

                    // Check bounds again
                    if (current > monthDates[daysInMonth]) return;

                    let day = current.getDate();
                    const step = frequency === 'weekly' ? 7 * interval : interval;

                    // Determine strict end limit for this task in this month
                    let endLimit = daysInMonth;
                    if (taskEndDate && taskEndDate.getFullYear() === year && taskEndDate.getMonth() === month) {
                        endLimit = Math.min(endLimit, taskEndDate.getDate());
                    }

                    while (day <= endLimit) {
                         if (tasksByDay.has(day)) {
                             tasksByDay.get(day)!.push(task);
                         }
                         day += step;
                    }
                } else if (frequency === 'monthly') {
                    // Check if this month aligns with start month
                    const monthsDiff = (year - taskStart.getFullYear()) * 12 + (month - taskStart.getMonth());

                    if (monthsDiff >= 0 && monthsDiff % interval === 0) {
                        // This month is a candidate. Day is taskStart.getDate()
                        const targetDay = taskStart.getDate();
                        // Check if day exists in this month
                        if (targetDay <= daysInMonth) {
                             const candidate = new Date(year, month, targetDay);
                             if ((!taskEndDate || candidate <= taskEndDate) && candidate >= taskStart) {
                                  tasksByDay.get(targetDay)!.push(task);
                             }
                        }
                    }
                } else if (frequency === 'yearly') {
                     // Check if month matches
                     if (taskStart.getMonth() === month) {
                         const yearsDiff = year - taskStart.getFullYear();
                         if (yearsDiff >= 0 && yearsDiff % interval === 0) {
                             const targetDay = taskStart.getDate();
                             if (targetDay <= daysInMonth) {
                                 const candidate = new Date(year, month, targetDay);
                                 if ((!taskEndDate || candidate <= taskEndDate) && candidate >= taskStart) {
                                     tasksByDay.get(targetDay)!.push(task);
                                 }
                             }
                         }
                     }
                }
            }
        });

        // 4. Build Result Array
        const days: Array<{ day: number | null; date?: Date; tasks?: Task[]; financialItems?: RecurringTransaction[] }> = [];

        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayTasks = tasksByDay.get(i) || [];
            const financialItems = financialItemsMap.get(i) || [];
            days.push({ day: i, date: date, tasks: dayTasks, financialItems });
        }

        return days;
    }, [currentMonth, tasks, recurringTransactions, taskDatesMap, viewMode]);

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    // ⚡ Performance Optimization: Memoize filtered tasks for selected date
    // Prevents re-filtering the entire task list on every render (e.g. when hovering)
    const selectedDayTasks = useMemo(() =>
        selectedDate
            ? tasks.filter(task => {
                const dates = taskDatesMap.get(task.id);
                if (!dates) return false;
                return checkRecurrence(task, dates.start, selectedDate, dates.end);
            })
            : []
    , [selectedDate, tasks, taskDatesMap, checkRecurrence]);

    // ⚡ Performance Optimization: Memoize filtered Google events
    const selectedDayGoogleEvents = useMemo(() =>
        selectedDate
            ? externalEvents.filter(event => doesEventOccurOnDate(event, selectedDate))
            : []
    , [selectedDate, externalEvents]);

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

    // ⚡ Bolt Optimization: Calculate today string once per render
    // instead of re-calculating it for every cell in the loop.
    const todayStr = new Date().toDateString();

    return (
        <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
        >
            <div className="h-full flex flex-col animate-fade-in relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
                    <h2 className="text-xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {getHeaderTitle()}
                    </h2>
                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                        {/* View Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 sm:p-1 shrink-0">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                    viewMode === 'month'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                                aria-label="Month view"
                            >
                                <Calendar size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Month</span>
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                    viewMode === 'week'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                                aria-label="Week view"
                            >
                                <CalendarDays size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Week</span>
                            </button>
                            <button
                                onClick={() => setViewMode('day')}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                    viewMode === 'day'
                                        ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                                aria-label="Day view"
                            >
                                <CalendarClock size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Day</span>
                            </button>
                            
                            {/* Custom Interval Dropdown */}
                            <div className="relative" ref={intervalDropdownRef}>
                                <button
                                    onClick={() => {
                                        setShowIntervalDropdown(!showIntervalDropdown);
                                    }}
                                    className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                        viewMode === 'custom'
                                            ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                    aria-label="Custom interval view"
                                    aria-haspopup="dialog"
                                    aria-expanded={showIntervalDropdown}
                                >
                                    <Settings2 size={14} className="sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">{viewMode === 'custom' ? getCustomIntervalLabel() : 'Custom'}</span>
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
                                            <Select
                                                value={customIntervalUnit}
                                                onChange={(value) => handleIntervalUnitChange(value as IntervalUnit)}
                                                options={[
                                                    { value: 'day', label: `Day${customIntervalValue !== 1 ? 's' : ''}` },
                                                    { value: 'week', label: `Week${customIntervalValue !== 1 ? 's' : ''}` },
                                                    { value: 'month', label: `Month${customIntervalValue !== 1 ? 's' : ''}` }
                                                ]}
                                                currentTheme={currentTheme}
                                                className="flex-1 min-w-[100px]"
                                            />
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
                            className="text-brand-500 hover:text-brand-600 text-xs sm:text-sm shrink-0"
                        >
                            Today
                        </Button>

                        {/* Navigation */}
                        <div className="flex gap-1 sm:gap-2 shrink-0">
                            <Button variant="secondary" size="icon" onClick={() => navigate(-1)} className="w-8 h-8 sm:w-10 sm:h-10" aria-label="Previous period">
                                <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                            </Button>
                            <Button variant="secondary" size="icon" onClick={() => navigate(1)} className="w-8 h-8 sm:w-10 sm:h-10" aria-label="Next period">
                                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
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
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-[600px]">
                            {calendarDays.map((cell, idx) => (
                                <CalendarDayCell
                                    key={idx}
                                    day={cell.day}
                                    date={cell.date || null}
                                    tasks={cell.tasks || []}
                                    financialItems={cell.financialItems || []}
                                    isToday={cell.date?.toDateString() === todayStr}
                                    onClick={() => cell.date && handleDayClick(cell.date)}
                                    taskDatesMap={taskDatesMap}
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
                                        {formatDateWithWeekday(selectedDate)}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {selectedDayTasks.length + selectedDayGoogleEvents.length} activities scheduled
                                        {selectedDayGoogleEvents.length > 0 && (
                                            <span className="ml-1 text-blue-500">
                                                ({selectedDayGoogleEvents.length} from Google)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedDate(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white" aria-label="Close">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedDayTasks.length === 0 && selectedDayGoogleEvents.length === 0 && (
                                    <p className="text-center text-slate-500 py-8 italic">No activities for this day.</p>
                                )}
                                
                                {/* App Tasks */}
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
                                                <button
                                                    type="button"
                                                    className="flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-sm"
                                                    onClick={() => onEditTask(task)}
                                                >
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
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Google Calendar Events */}
                                {selectedDayGoogleEvents.map(event => (
                                    <button
                                        type="button"
                                        key={event.id}
                                        onClick={() => setSelectedGoogleEvent(event)}
                                        className="group w-full text-left p-3 rounded-xl border-l-4 border-l-blue-500 cursor-pointer transition-all bg-blue-50 dark:bg-blue-500/10 hover:shadow-md hover:bg-blue-100 dark:hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Google Icon */}
                                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold">G</span>
                                            </div>
                                            
                                            {/* Event Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{event.title}</h4>
                                                <div className="flex items-center gap-3 text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {formatEventTime(event)}
                                                    </span>
                                                    {event.location && (
                                                        <span className="flex items-center gap-1 truncate">
                                                            <MapPin size={10} />
                                                            {event.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <ExternalLink size={14} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        onDateClick(selectedDate);
                                        setSelectedDate(null);
                                    }}
                                >
                                    <Plus size={16} className="mr-2" /> Add Activity for this Day
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Event Detail Modal */}
                {selectedGoogleEvent && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedGoogleEvent(null)} />
                        <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[70vh]">
                            {/* Header */}
                            <div className="p-4 border-b border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                        <span className="text-white text-lg font-bold">G</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Google Calendar</p>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedGoogleEvent.title}</h3>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedGoogleEvent(null)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white" aria-label="Close">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Time */}
                                <div className="flex items-start gap-3">
                                    <Clock size={18} className="text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Time</p>
                                        <p className="text-sm text-slate-800 dark:text-slate-100">{formatEventTime(selectedGoogleEvent)}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(selectedGoogleEvent.start).toLocaleDateString(undefined, { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Location */}
                                {selectedGoogleEvent.location && (
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-blue-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Location</p>
                                            <p className="text-sm text-slate-800 dark:text-slate-100">{selectedGoogleEvent.location}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {selectedGoogleEvent.description && (
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Description</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedGoogleEvent.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
                                <a
                                    href={selectedGoogleEvent.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    <ExternalLink size={16} />
                                    View in Google Calendar
                                </a>
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

export default React.memo(CalendarView);
