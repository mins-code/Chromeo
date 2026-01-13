import React, { useMemo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../types';
import DraggableTask from './DraggableTask';
import { format, isToday, parseISO, getHours, getMinutes } from 'date-fns';
import { Maximize2, Minimize2 } from 'lucide-react';

interface DayViewProps {
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

/**
 * ⚡ Performance Optimization:
 * Wrapped in React.memo to prevent grid re-renders when `currentTime` updates every minute.
 */
const DroppableHourCell = React.memo(({ dayDate, hour, height, intervalHours, children }: DroppableHourCellProps) => {
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
});

// Helper functions moved outside to be stable for memoization
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

const getTaskDate = (task: Task): Date | null => {
  const timeStr = task.reminderTime || task.dueDate;
  if (!timeStr) return null;
  try {
    return parseISO(timeStr);
  } catch {
    return null;
  }
};

interface TaskBlockProps {
    task: Task;
    style: React.CSSProperties;
    onEditTask: (task: Task) => void;
}

/**
 * ⚡ Performance Optimization:
 * Memoized component to prevent re-renders of task blocks when parent re-renders (e.g. time updates).
 * Uses stable `style` object from `taskStyles` map.
 */
const TaskBlock = React.memo(({ task, style, onEditTask }: TaskBlockProps) => {
    return (
        <div
            style={style}
            className="absolute left-1 right-1 z-10"
            onClick={() => onEditTask(task)}
        >
            <DraggableTask task={task} variant="block" />
        </div>
    );
});

const DayView: React.FC<DayViewProps> = ({ tasks, currentDate, onEditTask }) => {
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

  // Pre-calculate task styles to prevent object recreation on every render
  const taskStyles = useMemo(() => {
      const styles = new Map<string, React.CSSProperties>();

      dayTasks.forEach(task => {
          const time = getTaskTime(task);
          if (!time) {
              styles.set(task.id, { display: 'none' });
              return;
          }

          // Calculate position based on interval
          const cellHeight = HOUR_HEIGHT * INTERVAL_HOURS;
          const top = (time.hour / INTERVAL_HOURS) * cellHeight + (time.minutes / 60) * (HOUR_HEIGHT);
          const duration = task.duration || 60; // Default 60 minutes
          const height = Math.max((duration / 60) * HOUR_HEIGHT, 24); // Minimum 24px

          styles.set(task.id, {
              top: `${top}px`,
              height: `${height}px`,
          });
      });
      return styles;
  }, [dayTasks, HOUR_HEIGHT, INTERVAL_HOURS]);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const cellHeight = HOUR_HEIGHT * INTERVAL_HOURS;
    return (hours / INTERVAL_HOURS) * cellHeight + (minutes / 60) * HOUR_HEIGHT;
  }, [currentTime, HOUR_HEIGHT, INTERVAL_HOURS]);

  const isTodayView = isToday(currentDate);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with day name */}
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
                className="text-right pr-2 text-xs text-slate-400 font-medium flex items-start pt-1"
                style={{ height: HOUR_HEIGHT * INTERVAL_HOURS }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className={`flex-1 relative ${isTodayView ? 'bg-brand-500/5' : ''}`}>
            {/* Hour cells (droppable) */}
            {HOURS.map(hour => (
              <DroppableHourCell 
                key={hour} 
                dayDate={currentDate} 
                hour={hour}
                height={HOUR_HEIGHT * INTERVAL_HOURS}
                intervalHours={INTERVAL_HOURS}
              />
            ))}

            {/* Task blocks */}
            {dayTasks.map(task => (
              <TaskBlock
                key={task.id}
                task={task}
                style={taskStyles.get(task.id) || { display: 'none' }}
                onEditTask={onEditTask}
              />
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

export default React.memo(DayView);

