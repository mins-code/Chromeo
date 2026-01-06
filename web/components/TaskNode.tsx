import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Task } from '../types';
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TaskNodeProps {
  data: {
    task: Task;
    onClick: () => void;
  };
}

const TaskNode: React.FC<TaskNodeProps> = ({ data }) => {
  const { task, onClick } = data;

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

  return (
    <div 
      onClick={onClick}
      className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 ${config.border} shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[240px] max-w-[280px]`}
    >
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
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

        {/* Time & Duration */}
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
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Progress indicator for subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} subtasks
              </span>
              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all"
                  style={{ 
                    width: `${(task.subtasks.filter(st => st.isCompleted).length / task.subtasks.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskNode;
