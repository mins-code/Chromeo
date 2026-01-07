import React from 'react';
import { Task, TaskPriority } from '../types';
import Button from './Button';
import { Sun, Calendar, Trash2, X, Clock, AlertCircle } from 'lucide-react';
import { formatDateShort } from '../utils/date';

interface MorningBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  username: string;
  onMoveToToday: (taskIds: string[]) => void;
  onDelete: (taskIds: string[]) => void;
}

const MorningBriefingModal: React.FC<MorningBriefingModalProps> = ({
  isOpen,
  onClose,
  tasks,
  username,
  onMoveToToday,
  onDelete,
}) => {
  if (!isOpen || tasks.length === 0) return null;

  const priorityConfig = {
    [TaskPriority.HIGH]: {
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    [TaskPriority.MEDIUM]: {
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    [TaskPriority.LOW]: {
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  };

  const handleMoveAllToToday = () => {
    const taskIds = tasks.map(t => t.id);
    onMoveToToday(taskIds);
    onClose();
  };

  const handleDeleteAll = () => {
    const taskIds = tasks.map(t => t.id);
    onDelete(taskIds);
    onClose();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-white/10">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sun size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{getGreeting()}, {username}!</h2>
                <p className="text-amber-100 text-sm">
                  You have {tasks.length} pending {tasks.length === 1 ? 'task' : 'tasks'} from previous days
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
          {tasks.map(task => {
            const config = priorityConfig[task.priority];
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 transition-all hover:border-slate-300 dark:hover:border-white/10`}
              >
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <AlertCircle size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-white truncate">
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={12} />
                      Due {formatDateShort(task.dueDate)}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.color} ${config.border} border`}>
                  {task.priority}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleMoveAllToToday}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              Move All to Today
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Delete All
            </Button>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Dismiss for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default MorningBriefingModal;
