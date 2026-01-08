import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Task } from '../types';
import { Clock, CheckCircle2, AlertCircle, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface TaskNodeProps {
  data: {
    task: Task;
    onClick: () => void;
    onCreateFromHandle?: (taskId: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  };
}

// Custom handle with add button on hover
const HandleWithAdd: React.FC<{
  id: string;
  type: 'source' | 'target';
  position: Position;
  onAdd?: () => void;
}> = ({ id, type, position, onAdd }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Position the add button based on handle position
  const getButtonPosition = () => {
    switch (position) {
      case Position.Top: return { bottom: '100%', left: '50%', transform: 'translate(-50%, -4px)' };
      case Position.Bottom: return { top: '100%', left: '50%', transform: 'translate(-50%, 4px)' };
      case Position.Left: return { right: '100%', top: '50%', transform: 'translate(-4px, -50%)' };
      case Position.Right: return { left: '100%', top: '50%', transform: 'translate(4px, -50%)' };
      default: return {};
    }
  };

  return (
    <div
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'absolute', ...getHandleContainerPosition(position) }}
    >
      <Handle
        id={id}
        type={type}
        position={position}
        isConnectable={true}
        className="!w-4 !h-4 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900 hover:!bg-indigo-400 hover:!scale-125 transition-transform !relative !transform-none !top-0 !left-0"
        style={{ position: 'relative' }}
      />
      {/* Add button on hover */}
      {isHovered && onAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          style={{
            position: 'absolute',
            ...getButtonPosition(),
            zIndex: 50,
          }}
          className="flex items-center justify-center w-6 h-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all hover:scale-110 animate-fade-in"
          title="Create new task"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
};

// Get container position for handle wrapper
const getHandleContainerPosition = (position: Position): React.CSSProperties => {
  switch (position) {
    case Position.Top: return { top: 0, left: '50%', transform: 'translate(-50%, -50%)' };
    case Position.Bottom: return { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' };
    case Position.Left: return { left: 0, top: '50%', transform: 'translate(-50%, -50%)' };
    case Position.Right: return { right: 0, top: '50%', transform: 'translate(50%, -50%)' };
    default: return {};
  }
};

const TaskNode: React.FC<TaskNodeProps> = ({ data }) => {
  const { task, onClick, onCreateFromHandle } = data;

  // Priority colors
  const priorityConfig = {
    HIGH: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    MEDIUM: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
    LOW: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  };

  const config = priorityConfig[task.priority] || priorityConfig.LOW;

  // Status icon
  const StatusIcon = task.status === 'DONE' ? CheckCircle2 : 
                     task.status === 'IN_PROGRESS' ? AlertCircle : 
                     Clock;

  const handleCreateTask = (position: 'top' | 'bottom' | 'left' | 'right') => {
    if (onCreateFromHandle) {
      onCreateFromHandle(task.id, position);
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 ${config.border} shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[240px] max-w-[280px]`}
    >
      {/* Connection Handles - All 4 sides with add button on hover */}
      <HandleWithAdd
        id="top"
        type="target"
        position={Position.Top}
        onAdd={() => handleCreateTask('top')}
      />
      <HandleWithAdd
        id="bottom"
        type="source"
        position={Position.Bottom}
        onAdd={() => handleCreateTask('bottom')}
      />
      <HandleWithAdd
        id="left"
        type="target"
        position={Position.Left}
        onAdd={() => handleCreateTask('left')}
      />
      <HandleWithAdd
        id="right"
        type="source"
        position={Position.Right}
        onAdd={() => handleCreateTask('right')}
      />

      {/* Header */}
      <div className={`${config.bg} px-4 py-2 border-b ${config.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${config.text}`}>
            {task.priority}
          </span>
        </div>
        <StatusIcon size={14} className={`${config.text}`} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h4 className={`font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 ${
          task.status === 'DONE' ? 'line-through opacity-60' : ''
        }`}>
          {task.title}
        </h4>

        {/* Time and Duration */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{format(new Date(task.dueDate), 'h:mm a')}</span>
            </div>
          )}
          {task.duration && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{task.duration}m</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-xs">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Subtasks progress */}
        {task.subtasks.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ 
                  width: `${(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskNode;
