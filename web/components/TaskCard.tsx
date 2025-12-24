
import React from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Calendar, CheckCircle2, Circle, MoreVertical, Sparkles, Bell, Users, Lock, Clock, MapPin } from 'lucide-react';
import Button from './Button';

interface TaskCardProps {
  task: Task;
  allTasks?: Task[]; 
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onAIAnalysis?: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, allTasks = [], onEdit, onToggleStatus, onAIAnalysis }) => {
  const isDone = task.status === TaskStatus.DONE;
  
  // Check dependencies
  const unfinishedDependencies = task.dependencyIds?.map(id => allTasks.find(t => t.id === id)).filter(t => t && t.status !== TaskStatus.DONE);
  const isBlocked = unfinishedDependencies && unfinishedDependencies.length > 0;
  const blockedBy = unfinishedDependencies?.[0]?.title;

  // Subtask progress
  const totalSub = task.subtasks.length;
  const doneSub = task.subtasks.filter(s => s.isCompleted).length;
  const progressPercent = totalSub > 0 ? (doneSub / totalSub) * 100 : 0;

  const typeLabel = task.type === 'EVENT' ? 'Event' : task.type === 'APPOINTMENT' ? 'Appt' : 'Task';

  return (
    <div 
        className={`group relative glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${isDone ? 'opacity-60 grayscale-[0.5]' : ''} ${isBlocked ? 'border-red-500/30 bg-red-500/5' : ''}`}
        onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox Area */}
        <button 
          onClick={(e) => { 
              e.stopPropagation(); 
              if(!isBlocked) onToggleStatus(task); 
          }}
          disabled={isBlocked && !isDone}
          className={`mt-0.5 flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 ${
              isBlocked && !isDone
              ? 'text-red-400/50 cursor-not-allowed'
              : isDone 
                ? 'text-emerald-500 drop-shadow-sm' 
                : 'text-slate-400 hover:text-brand-500'
          }`}
        >
          {isBlocked && !isDone ? <Lock size={22} /> : (isDone ? <CheckCircle2 size={24} weight="fill" /> : <Circle size={24} />)}
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-semibold text-[15px] truncate pr-2 flex items-center gap-2 ${isDone ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400' : 'text-slate-800 dark:text-slate-100'} ${isBlocked && !isDone ? 'text-slate-500' : ''}`}>
              {task.title}
            </h3>
            
            <div className="flex items-center gap-2">
                 {task.type !== 'TASK' && (
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                         task.type === 'EVENT' ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                     }`}>
                         {typeLabel}
                     </span>
                 )}
                 {task.isShared && <Users size={14} className="text-blue-500 dark:text-blue-400" />}
                 <div className={`w-2 h-2 rounded-full ${
                     task.priority === TaskPriority.HIGH ? 'bg-red-500 shadow-sm' :
                     task.priority === TaskPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                 }`} />
            </div>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
            {task.description || "No description"}
          </p>
          
          {isBlocked && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 mb-3 flex items-start gap-2">
                  <Lock size={12} className="text-red-400 mt-0.5" /> 
                  <p className="text-xs text-red-500 dark:text-red-300">
                    Waiting for: <span className="font-semibold">{blockedBy}</span>
                    {unfinishedDependencies.length > 1 && ` +${unfinishedDependencies.length - 1}`}
                  </p>
              </div>
          )}

          {/* Subtask Progress Bar */}
          {totalSub > 0 && !isDone && (
              <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                      <span>Progress</span>
                      <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                  </div>
              </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
             {task.reminderTime && (
               <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${new Date(task.reminderTime) < new Date() ? 'bg-red-500/5 border-red-500/20 text-red-500 dark:text-red-400' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-600 dark:text-yellow-500'}`}>
                 <Bell size={12} />
                 <span>{new Date(task.reminderTime).toLocaleDateString(undefined, {month:'short', day:'numeric'})} {new Date(task.reminderTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
             )}
             
             {!task.reminderTime && task.dueDate && (
               <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                 <Calendar size={12} />
                 <span>{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
               </div>
             )}
             
             {task.duration && (
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                     <Clock size={12} />
                     <span>{task.duration}m</span>
                 </div>
             )}
             
             {task.location && (
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                     <MapPin size={12} />
                     <span className="truncate max-w-[100px]">{task.location}</span>
                 </div>
             )}

             {task.tags.map(tag => (
               <span key={tag} className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">#{tag}</span>
             ))}
          </div>
        </div>

        {/* Hover Actions - Visible on group hover */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                <MoreVertical size={14} />
            </Button>
            {onAIAnalysis && !isDone && (
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 text-purple-500 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10" 
                    onClick={(e) => { e.stopPropagation(); onAIAnalysis(task); }}
                    title="AI Breakdown"
                >
                    <Sparkles size={14} />
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
