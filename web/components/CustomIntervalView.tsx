import React, { useMemo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../types';
import DraggableTask from './DraggableTask';
import { toLocalDateKey } from '../utils/fastDate';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';

interface CustomIntervalViewProps {
  tasks: Task[];
  currentDate: Date;
  intervalDays: number; // Number of days to show (e.g., 3, 5, 14)
  onEditTask: (task: Task) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour

interface DroppableHourCellProps {
  dayDate: Date;
  hour: number;
  children?: React.ReactNode;
}

const DroppableHourCell: React.FC<DroppableHourCellProps> = ({ dayDate, hour, children }) => {
  const id = `${toLocalDateKey(dayDate)}-${hour.toString().padStart(2, '0')}`;
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date: dayDate, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative border-b border-r border-slate-200 dark:border-white/5 transition-colors ${
        isOver ? 'bg-brand-500/10' : ''
      }`}
      style={{ height: HOUR_HEIGHT }}
    >
      {children}
    </div>
  );
};

const CustomIntervalView: React.FC<CustomIntervalViewProps> = ({ 
  tasks, 
  currentDate, 
  intervalDays,
  onEditTask 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate array of days to display
  const displayDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < intervalDays; i++) {
      days.push(addDays(currentDate, i));
    }
    return days;
  }, [currentDate, intervalDays]);

  // Parse task time and get hour/minutes
  const getTaskTime = (task: Task): { hour: number; minutes: number } | null => {
    const timeStr = task.reminderTime || task.dueDate;
    if (!timeStr) return null;
    
    try {
      const date = parseISO(timeStr);
      return { hour: getHours(date), minutes: getMinutes(date) };
    } catch {
      return null;
    }
  };

  // Get task date for comparison
  const getTaskDate = (task: Task): Date | null => {
    const timeStr = task.reminderTime || task.dueDate;
    if (!timeStr) return null;
    try {
      return parseISO(timeStr);
    } catch {
      return null;
    }
  };

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    displayDays.forEach(day => {
      const key = toLocalDateKey(day);
      grouped[key] = tasks.filter(task => {
        const taskDate = getTaskDate(task);
        return taskDate && isSameDay(taskDate, day);
      });
    });
    return grouped;
  }, [tasks, displayDays]);

  // Calculate task block position and height
  const getTaskStyle = (task: Task): React.CSSProperties => {
    const time = getTaskTime(task);
    if (!time) return { display: 'none' };

    const top = time.hour * HOUR_HEIGHT + (time.minutes / 60) * HOUR_HEIGHT;
    const duration = task.duration || 60; // Default 60 minutes
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 24); // Minimum 24px

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  }, [currentTime]);

  const todayIndex = displayDays.findIndex(day => isToday(day));

  // Calculate column width based on interval
  const getColumnClass = () => {
    if (intervalDays <= 3) return 'min-w-[200px]';
    if (intervalDays <= 5) return 'min-w-[150px]';
    if (intervalDays <= 7) return 'min-w-[120px]';
    return 'min-w-[100px]'; // For 2 weeks or more
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scrollable container for both header and grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with day names - no separate scroll */}
        <div className="flex border-b border-slate-200 dark:border-white/5 flex-shrink-0">
          <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 z-20" /> {/* Time column spacer */}
          <div className="flex-1 overflow-hidden">
            <div className="flex">
              {displayDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex-1 ${getColumnClass()} text-center py-3 border-r border-slate-200 dark:border-white/5 ${
                    isToday(day) ? 'bg-brand-500/5' : ''
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday(day) ? 'text-brand-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {format(day, 'd')}
                  </div>
                  {/* Show month name for first day or when month changes */}
                  {(idx === 0 || day.getDate() === 1) && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      {format(day, 'MMM')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable grid area - controls horizontal scroll for both header and grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Time column - sticky */}
          <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 z-10 overflow-y-auto">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="text-right pr-2 text-xs text-slate-400 font-medium"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns container - scrolls both x and y */}
          <div className="flex-1 overflow-auto">
            <div className="flex min-h-full">
              {displayDays.map((day, dayIdx) => {
                const dayKey = toLocalDateKey(day);
                const dayTasks = tasksByDay[dayKey] || [];

                return (
                  <div
                    key={dayIdx}
                    className={`flex-1 ${getColumnClass()} relative ${isToday(day) ? 'bg-brand-500/5' : ''}`}
                  >
                    {/* Hour cells (droppable) */}
                    {HOURS.map(hour => (
                      <DroppableHourCell key={hour} dayDate={day} hour={hour} />
                    ))}

                    {/* Task blocks */}
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        style={getTaskStyle(task)}
                        className="absolute left-1 right-1 z-10"
                        onClick={() => onEditTask(task)}
                      >
                        <DraggableTask task={task} variant="block" />
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {dayIdx === todayIndex && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: currentTimePosition }}
                      >
                        <div className="relative flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomIntervalView);
