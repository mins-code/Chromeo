import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat } from 'lucide-react';
import { Task, TaskPriority, ThemeOption } from '../types';
import Button from './Button';
import CalendarDayCell from './CalendarDayCell';

interface CalendarViewProps {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEditTask: (task: Task) => void;
  theme: ThemeOption;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick, onEditTask, theme }) => {
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

  const doesTaskOccurOnDate = (task: Task, date: Date): boolean => {
    let taskDateStr = task.dueDate || task.reminderTime;
    if (!taskDateStr) return false;
    
    if (taskDateStr.length === 10 && !taskDateStr.includes('T')) {
        taskDateStr += 'T00:00:00';
    }

    const taskDate = new Date(taskDateStr);
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

    if (frequency === 'daily') return diffDays % interval === 0;
    if (frequency === 'weekly') {
       if (date.getDay() !== taskDate.getDay()) return false;
       return Math.floor(diffDays / 7) % interval === 0;
    }
    if (frequency === 'monthly') {
      if (date.getDate() !== taskDate.getDate()) return false;
      const monthDiff = (date.getFullYear() - taskDate.getFullYear()) * 12 + (date.getMonth() - taskDate.getMonth());
      return monthDiff > 0 && monthDiff % interval === 0;
    }
    if (frequency === 'yearly') return date.getMonth() === taskDate.getMonth() && date.getDate() === taskDate.getDate();

    return false;
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: Array<{ day: number | null; date?: Date; tasks?: Task[] }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null });
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayTasks = tasks.filter(task => doesTaskOccurOnDate(task, date));
      days.push({ day: i, date: date, tasks: dayTasks });
    }
    return days;
  }, [currentMonth, tasks]);

  const selectedDayTasks = selectedDate 
    ? tasks.filter(task => doesTaskOccurOnDate(task, selectedDate)) 
    : [];

  return (
    <div className={`h-full flex flex-col animate-fade-in relative theme-${theme}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
            <h2 className="text-3xl font-bold text-text">
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
            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-text-secondary uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
                {calendarDays.map((cell, idx) => (
                    <CalendarDayCell
                        key={idx}
                        day={cell.day}
                        date={cell.date || null}
                        tasks={cell.tasks}
                        isToday={cell.date?.toDateString() === new Date().toDateString()}
                        onClick={() => cell.date && setSelectedDate(cell.date)}
                        theme={theme}
                    />
                ))}
            </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDate && (
             <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)} />
                 <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[70vh] border border-border">
                     <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover">
                         <div>
                             <h3 className="text-xl font-bold text-text">
                                 {selectedDate.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
                             </h3>
                             <p className="text-xs text-text-secondary font-medium">{selectedDayTasks.length} tasks scheduled</p>
                         </div>
                         <button onClick={() => setSelectedDate(null)} className="p-1 rounded-full hover:bg-border text-text-secondary hover:text-text">
                             <X size={20} />
                         </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface">
                         {selectedDayTasks.length === 0 && (
                             <p className="text-center text-text-secondary py-8 italic">No tasks for this day.</p>
                         )}
                         {selectedDayTasks.map(task => (
                             <div 
                                key={task.id} 
                                onClick={() => onEditTask(task)}
                                className="group bg-surface-hover border border-border p-3 rounded-xl hover:border-primary/30 cursor-pointer transition-all flex items-start gap-3"
                             >
                                 <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                     task.priority === TaskPriority.HIGH ? 'bg-danger' :
                                     task.priority === TaskPriority.MEDIUM ? 'bg-warning' : 'bg-success'
                                 }`} />
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-semibold text-text text-sm truncate">{task.title}</h4>
                                     <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                                         {task.reminderTime && (
                                             <span className="flex items-center gap-1">
                                                 <Clock size={10} /> 
                                                 {new Date(task.reminderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </span>
                                         )}
                                         {task.recurrence && task.recurrence.frequency !== 'none' && (
                                             <span className="flex items-center gap-1 text-success">
                                                 <Repeat size={10} /> {task.recurrence.frequency}
                                             </span>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>

                     <div className="p-4 border-t border-border bg-surface-hover">
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