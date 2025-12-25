import React from 'react';
import { Task, TaskPriority, TaskStatus, ThemeOption } from '../types';
import { Calendar, CheckCircle2, Circle, MoreVertical, Sparkles, Bell, Users, Lock, Clock, MapPin } from 'lucide-react';
import Button from './Button';

interface TaskCardProps {
  task: Task;
  allTasks?: Task[]; 
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onAIAnalysis?: (task: Task) => void;
  theme: ThemeOption;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, allTasks = [], onEdit, onToggleStatus, onAIAnalysis, theme }) => {
  const isDone = task.status === TaskStatus.DONE;
  
  const unfinishedDependencies = task.dependencyIds?.map(id => allTasks.find(t => t.id === id)).filter(t => t && t.status !== TaskStatus.DONE);
  const isBlocked = unfinishedDependencies && unfinishedDependencies.length > 0;
  const blockedBy = unfinishedDependencies?.[0]?.title;

  const totalSub = task.subtasks.length;
  const doneSub = task.subtasks.filter(s => s.isCompleted).length;
  const progressPercent = totalSub > 0 ? (doneSub / totalSub) * 100 : 0;

  const typeLabel = task.type === 'EVENT' ? 'Event' : task.type === 'APPOINTMENT' ? 'Appt' : 'Task';

  return (
    <div 
        className={`group relative bg-surface border border-border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 theme-${theme} ${isDone ? 'opacity-60' : ''} ${isBlocked ? 'border-danger/30 bg-danger/5' : ''}`}
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
              ? 'text-danger/50 cursor-not-allowed'
              : isDone 
                ? 'text-success drop-shadow-sm' 
                : 'text-text-secondary hover:text-primary'
          }`}
        >
          {isBlocked && !isDone ? <Lock size={22} /> : (isDone ? <CheckCircle2 size={24} weight="fill" /> : <Circle size={24} />)}
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-semibold text-[15px] truncate pr-2 flex items-center gap-2 ${isDone ? 'text-text-secondary line-through' : 'text-text'} ${isBlocked && !isDone ? 'text-text-secondary' : ''}`}>
              {task.title}
            </h3>
            
            <div className="flex items-center gap-2">
                 {task.type !== 'TASK' && (
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                         task.type === 'EVENT' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                     }`}>
                         {typeLabel}
                     </span>
                 )}
                 {task.isShared && <Users size={14} className="text-info" />}
                 <div className={`w-2 h-2 rounded-full ${
                     task.priority === TaskPriority.HIGH ? 'bg-danger shadow-sm' :
                     task.priority === TaskPriority.MEDIUM ? 'bg-warning' : 'bg-success'
                 }`} />
            </div>
          </div>
          
          <p className="text-sm text-text-secondary mb-3 line-clamp-2 leading-relaxed">
            {task.description || "No description"}
          </p>
          
          {isBlocked && (
              <div className="bg-danger/5 border border-danger/20 rounded-lg p-2 mb-3 flex items-start gap-2">
                  <Lock size={12} className="text-danger mt-0.5" /> 
                  <p className="text-xs text-danger">
                    Waiting for: <span className="font-semibold">{blockedBy}</span>
                    {unfinishedDependencies.length > 1 && ` +${unfinishedDependencies.length - 1}`}
                  </p>
              </div>
          )}

          {/* Subtask Progress Bar */}
          {totalSub > 0 && !isDone && (
              <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-text-secondary mb-1 uppercase tracking-wider font-semibold">
                      <span>Progress</span>
                      <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                  </div>
              </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary font-medium">
             {task.reminderTime && (
               <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${new Date(task.reminderTime) < new Date() ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-warning/5 border-warning/20 text-warning'}`}>
                 <Bell size={12} />
                 <span>{new Date(task.reminderTime).toLocaleDateString(undefined, {month:'short', day:'numeric'})} {new Date(task.reminderTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
             )}
             
             {!task.reminderTime && task.dueDate && (
               <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-hover border border-border">
                 <Calendar size={12} />
                 <span>{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
               </div>
             )}
             
             {task.duration && (
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-hover border border-border">
                     <Clock size={12} />
                     <span>{task.duration}m</span>
                 </div>
             )}
             
             {task.location && (
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-hover border border-border">
                     <MapPin size={12} />
                     <span className="truncate max-w-[100px]">{task.location}</span>
                 </div>
             )}

             {task.tags.map(tag => (
               <span key={tag} className="bg-surface-hover px-2 py-1 rounded-md border border-border hover:bg-border transition-colors">#{tag}</span>
             ))}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-surface/80 backdrop-blur border-border" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                <MoreVertical size={14} />
            </Button>
            {onAIAnalysis && !isDone && (
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 text-accent border-accent/20 hover:bg-accent/10" 
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