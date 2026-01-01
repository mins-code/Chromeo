import React, { useMemo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../types';
import DraggableTask, { TYPE_COLORS } from './DraggableTask';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';
import { Maximize2, Minimize2 } from 'lucide-react';

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onEditTask: (task: Task) => void;
}

// Time intervals: 4-hour (compact) or 1-hour (expanded)
const HOURS_COMPACT = [0, 4, 8, 12, 16, 20]; // 4-hour intervals
const HOURS_EXPANDED = Array.from({ length: 24 }, (_, i) => i); // 1-hour intervals

interface DroppableHourCellProps {
  dayDate: Date;
  hour: number;
  height: number;
  intervalHours: number;
  children?: React.ReactNode;
}

const DroppableHourCell: React.FC<DroppableHourCellProps> = ({ dayDate, hour, height, intervalHours, children }) => {
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
      style={{ height }}
    >
      {/* Show hour subdivisions in compact mode */}
      {intervalHours > 1 && (
        <>
          {Array.from({ length: intervalHours - 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-b border-dashed border-slate-200/50 dark:border-white/5"
              style={{ top: `${((i + 1) / intervalHours) * 100}%` }}
            />
          ))}
        </>
      )}
      {children}
    </div>
  );
};

const WeekView: React.FC<WeekViewProps> = ({ tasks, currentDate, onEditTask }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false); // Default to compact (4hr)

  const HOUR_HEIGHT = isExpanded ? 60 : 40; // Smaller cells in compact
  const INTERVAL_HOURS = isExpanded ? 1 : 4;
  const HOURS = isExpanded ? HOURS_EXPANDED : HOURS_COMPACT;

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
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      grouped[key] = tasks.filter(task => {
        const taskDate = getTaskDate(task);
        return taskDate && isSameDay(taskDate, day);
      });
    });
    return grouped;
  }, [tasks, weekDays]);

  // Calculate task block position and height
  const getTaskStyle = (task: Task): React.CSSProperties => {
    const time = getTaskTime(task);
    if (!time) return { display: 'none' };

    // Calculate position based on interval
    const cellHeight = HOUR_HEIGHT * INTERVAL_HOURS;
    const top = (time.hour / INTERVAL_HOURS) * cellHeight + (time.minutes / 60) * HOUR_HEIGHT;
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
    const cellHeight = HOUR_HEIGHT * INTERVAL_HOURS;
    return (hours / INTERVAL_HOURS) * cellHeight + (minutes / 60) * HOUR_HEIGHT;
  }, [currentTime, HOUR_HEIGHT, INTERVAL_HOURS]);

  const todayIndex = weekDays.findIndex(day => isToday(day));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with day names */}
      <div className="flex border-b border-slate-200 dark:border-white/5">
        <div className="w-16 flex-shrink-0 flex items-center justify-center">
          {/* Expand/Collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title={isExpanded ? "Compact view (4hr)" : "Expanded view (1hr)"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
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
                className="text-right pr-2 text-xs text-slate-400 font-medium flex items-start pt-1"
                style={{ height: HOUR_HEIGHT * INTERVAL_HOURS }}
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
                  <DroppableHourCell 
                    key={hour} 
                    dayDate={day} 
                    hour={hour}
                    height={HOUR_HEIGHT * INTERVAL_HOURS}
                    intervalHours={INTERVAL_HOURS}
                  />
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

