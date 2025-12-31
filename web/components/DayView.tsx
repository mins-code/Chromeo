import React, { useMemo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../types';
import DraggableTask from './DraggableTask';
import { format, isToday, parseISO, getHours, getMinutes } from 'date-fns';

interface DayViewProps {
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
      className={`relative border-b border-slate-200 dark:border-white/5 transition-colors ${
        isOver ? 'bg-brand-500/10' : ''
      }`}
      style={{ height: HOUR_HEIGHT }}
    >
      {children}
    </div>
  );
};

const DayView: React.FC<DayViewProps> = ({ tasks, currentDate, onEditTask }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Filter tasks for the current day
  const dayTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = getTaskDate(task);
      if (!taskDate) return false;
      return (
        taskDate.getDate() === currentDate.getDate() &&
        taskDate.getMonth() === currentDate.getMonth() &&
        taskDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [tasks, currentDate]);

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

  const isTodayView = isToday(currentDate);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with day name */}
      <div className="flex border-b border-slate-200 dark:border-white/5">
        <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
        <div
          className={`flex-1 text-center py-4 ${
            isTodayView ? 'bg-brand-500/5' : ''
          }`}
        >
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {format(currentDate, 'EEEE')}
          </div>
          <div className={`text-2xl font-bold ${isTodayView ? 'text-brand-500' : 'text-slate-700 dark:text-slate-200'}`}>
            {format(currentDate, 'd')}
          </div>
          <div className="text-sm text-slate-500">
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>
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

          {/* Day column */}
          <div className={`flex-1 relative ${isTodayView ? 'bg-brand-500/5' : ''}`}>
            {/* Hour cells (droppable) */}
            {HOURS.map(hour => (
              <DroppableHourCell key={hour} dayDate={currentDate} hour={hour} />
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
            {isTodayView && (
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
        </div>
      </div>
    </div>
  );
};

export default DayView;
