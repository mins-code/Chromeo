import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat } from 'lucide-react';
import { Task, TaskPriority } from '../types';
import Button from './Button';
import CalendarDayCell from './CalendarDayCell';

interface CalendarViewProps {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEditTask: (task: Task) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick, onEditTask }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  // Helper to check if a recurring task happens on a specific date
  const doesTaskOccurOnDate = (task: Task, date: Date): boolean => {
    let taskDateStr = task.dueDate || task.reminderTime;
    if (!taskDateStr) return false;
    
    // Fix for pure date strings (YYYY-MM-DD) being interpreted as UTC.
    // If we receive a string length 10 without time, assume it's a local date 
    // and append T00:00:00 to force local interpretation in browsers.
    if (taskDateStr.length === 10 && !taskDateStr.includes('T')) {
        taskDateStr += 'T00:00:00';
    }

    const taskDate = new Date(taskDateStr);
    
    // Normal Task Check
    const isSameDay = taskDate.getDate() === date.getDate() && 
                      taskDate.getMonth() === date.getMonth() && 
                      taskDate.getFullYear() === date.getFullYear();

    if (isSameDay) return true;

    // Recurrence Check
    if (!task.recurrence || task.recurrence.frequency === 'none') return false;

    // Must be AFTER start date
    if (date < taskDate) return false;

    // Check End Date
    if (task.recurrence.endDate && date > new Date(task.recurrence.endDate)) return false;

    // Check Interval Logic
    const diffTime = Math.abs(date.getTime() - taskDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const { frequency, interval } = task.recurrence;

    if (frequency === 'daily') {
      return diffDays % interval === 0;
    }
    
    if (frequency === 'weekly') {
       // Check if day of week matches (0-6)
       if (date.getDay() !== taskDate.getDay()) return false;
       const diffWeeks = Math.floor(diffDays / 7);
       return diffWeeks % interval === 0;
    }

    if (frequency === 'monthly') {
      // Simple check: same day of month. 
      if (date.getDate() !== taskDate.getDate()) return false;
      const monthDiff = (date.getFullYear() - taskDate.getFullYear()) * 12 + (date.getMonth() - taskDate.getMonth());
      return monthDiff > 0 && monthDiff % interval === 0;
    }
    
    if (frequency === 'yearly') {
       return date.getMonth() === taskDate.getMonth() && date.getDate() === taskDate.getDate();
    }

    return false;
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Padding for prev month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null });
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayTasks = tasks.filter(task => doesTaskOccurOnDate(task, date));
      days.push({ day: i, date: date, tasks: dayTasks });
    }
    
    return days;
  }, [currentMonth, tasks]);

  const handleDayClick = (date: Date) => {
      setSelectedDate(date);
  };

  const selectedDayTasks = selectedDate 
    ? tasks.filter(task => doesTaskOccurOnDate(task, selectedDate)) 
    : [];

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => changeMonth(-1)}>
                    <ChevronLeft size={20} />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => changeMonth(1)}>
                    <ChevronRight size={20} />
                </Button>
            </div>
        </div>

        {/* Calendar Grid */}
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
                        tasks={cell.tasks}
                        isToday={cell.date?.toDateString() === new Date().toDateString()}
                        onClick={() => cell.date && handleDayClick(cell.date)}
                    />
                ))}
            </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDate && (
             <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)} />
                 <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[70vh]">
                     <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                         <div>
                             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                 {selectedDate.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
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
                         {selectedDayTasks.map(task => (
                             <div 
                                key={task.id} 
                                onClick={() => onEditTask(task)}
                                className="group bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl hover:border-brand-500/30 cursor-pointer transition-all flex items-start gap-3"
                             >
                                 <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                     task.priority === TaskPriority.HIGH ? 'bg-red-500' :
                                     task.priority === TaskPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                                 }`} />
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">{task.title}</h4>
                                     <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                         {task.reminderTime && (
                                             <span className="flex items-center gap-1">
                                                 <Clock size={10} /> 
                                                 {new Date(task.reminderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </span>
                                         )}
                                         {task.recurrence && task.recurrence.frequency !== 'none' && (
                                             <span className="flex items-center gap-1 text-emerald-500">
                                                 <Repeat size={10} /> {task.recurrence.frequency}
                                             </span>
                                         )}
                                     </div>
                                 </div>
                             </div>
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
                             <Plus size={16} className="mr-2" /> Add Task for this Day
                         </Button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default CalendarView;