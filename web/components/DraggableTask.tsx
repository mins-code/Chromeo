import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskType, TaskStatus } from '../types';
import { Clock, CheckCircle2 } from 'lucide-react';

interface DraggableTaskProps {
  task: Task;
  children?: React.ReactNode;
  variant?: 'block' | 'chip';
}

// Type-based background colors
export const TYPE_COLORS: Record<TaskType, string> = {
  TASK: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  EVENT: 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300',
  REMINDER: 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300',
  APPOINTMENT: 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300',
};

// Muted colors for completed tasks
const COMPLETED_COLORS = 'bg-slate-200/50 dark:bg-slate-700/30 border-slate-400 dark:border-slate-500 text-slate-500 dark:text-slate-400';

/**
 * ⚡ Performance Optimization:
 * Wrapped in React.memo to prevent unnecessary re-renders when parent components update
 * (e.g. `currentTime` tick in WeekView).
 */
const DraggableTask = React.memo(({ task, children, variant = 'chip' }: DraggableTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const isCompleted = task.status === TaskStatus.DONE;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : isCompleted ? 0.7 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const colorClass = isCompleted ? COMPLETED_COLORS : (TYPE_COLORS[task.type] || TYPE_COLORS.TASK);

  if (children) {
    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        {children}
      </div>
    );
  }

  // Default chip rendering
  if (variant === 'chip') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 ${colorClass} transition-opacity flex items-center gap-1`}
      >
        {isCompleted && <CheckCircle2 size={8} className="shrink-0" />}
        <span className={isCompleted ? 'line-through' : ''}>{task.title}</span>
      </div>
    );
  }

  // Block variant for week view
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute left-1 right-1 px-2 py-1 rounded-md border-l-4 ${colorClass} overflow-hidden shadow-sm hover:shadow-md transition-all`}
    >
      <div className={`text-xs font-medium truncate flex items-center gap-1 ${isCompleted ? 'line-through' : ''}`}>
        {isCompleted && <CheckCircle2 size={10} className="shrink-0" />}
        {task.title}
      </div>
      {task.reminderTime && (
        <div className="flex items-center gap-1 text-[10px] opacity-75 mt-0.5">
          <Clock size={8} />
          {new Date(task.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
});

export default DraggableTask;

