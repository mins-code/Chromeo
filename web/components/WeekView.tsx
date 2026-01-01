import React, { useMemo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../types';
import DraggableTask, { TYPE_COLORS } from './DraggableTask';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
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
  const id = `${format(dayDate, 'yyyy-MM-dd')}-${hour.toString().padStart(2, '0')}`;
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

const WeekView: React.FC<WeekViewProps> = ({ tasks, currentDate, onEditTask }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get days of the week
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

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
  // Optimized: O(N) single pass instead of O(7N) nested loop
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const weekMap = new Map<string, Task[]>();

    // Initialize buckets for the week days
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      grouped[key] = [];
      weekMap.set(key, grouped[key]);
    });

    // Single pass through tasks
    tasks.forEach(task => {
      const taskDate = getTaskDate(task);
      if (taskDate) {
        // We use the same format logic as the keys to ensure matching local dates
        const key = format(taskDate, 'yyyy-MM-dd');
        const bucket = weekMap.get(key);
        if (bucket) {
          bucket.push(task);
        }
      }
    });

    return grouped;
  }, [tasks, weekDays]);

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

  const todayIndex = weekDays.findIndex(day => isToday(day));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with day names */}
      <div className="flex border-b border-slate-200 dark:border-white/5">
        <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className={`flex-1 text-center py-3 border-r border-slate-200 dark:border-white/5 ${
              isToday(day) ? 'bg-brand-500/5' : ''
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {format(day, 'EEE')}
            </div>
            <div className={`text-lg font-bold ${isToday(day) ? 'text-brand-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid area */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-full">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5">
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

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[dayKey] || [];

            return (
              <div
                key={dayIdx}
                className={`flex-1 relative ${isToday(day) ? 'bg-brand-500/5' : ''}`}
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
                    className="absolute left-0 right-0 z-10"
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
  );
};

export default WeekView;
