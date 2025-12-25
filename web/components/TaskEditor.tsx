import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, SubTask, RecurrenceConfig, TaskType, ThemeOption } from '../types';
import Button from './Button';
import Input from './Input';
import { X, Plus, Trash2, Wand2, Bell, Link as LinkIcon, Users, Check, Repeat, Calendar, MapPin, Clock } from 'lucide-react';
import { enhanceTaskWithAI } from '../services/geminiService';

interface TaskEditorProps {
  task?: Task;
  availableTasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  initialDate?: Date;
  initialType?: TaskType;
  theme: ThemeOption;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, availableTasks, isOpen, onClose, onSave, onDelete, initialDate, initialType = 'TASK', theme }) => {
  const [type, setType] = useState<TaskType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [reminderTime, setReminderTime] = useState('');
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [duration, setDuration] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  
  const [recurrenceFreq, setRecurrenceFreq] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (task) {
      setType(task.type || 'TASK');
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setSubtasks(task.subtasks);
      setTags(task.tags);
      setReminderTime(task.reminderTime ? new Date(task.reminderTime).toISOString().slice(0, 16) : (task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''));
      setDependencyIds(task.dependencyIds || []);
      setIsShared(task.isShared || false);
      setDuration(task.duration || '');
      setLocation(task.location || '');
      
      if (task.recurrence) {
        setRecurrenceFreq(task.recurrence.frequency);
        setRecurrenceInterval(task.recurrence.interval);
        setRecurrenceEnd(task.recurrence.endDate ? new Date(task.recurrence.endDate).toISOString().slice(0, 10) : '');
      } else {
        setRecurrenceFreq('none');
        setRecurrenceInterval(1);
        setRecurrenceEnd('');
      }
    } else {
        setType(initialType);
        setTitle('');
        setDescription('');
        setPriority(TaskPriority.MEDIUM);
        setStatus(TaskStatus.TODO);
        setSubtasks([]);
        setTags([]);
        setReminderTime(initialDate ? initialDate.toISOString().slice(0, 16) : '');
        setDependencyIds([]);
        setIsShared(false);
        setDuration('');
        setLocation('');
        setRecurrenceFreq('none');
        setRecurrenceInterval(1);
        setRecurrenceEnd('');
    }
  }, [task, isOpen, initialDate, initialType]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    
    const recurrence: RecurrenceConfig | undefined = recurrenceFreq !== 'none' ? {
      frequency: recurrenceFreq,
      interval: recurrenceInterval,
      endDate: recurrenceEnd ? new Date(recurrenceEnd).toISOString() : undefined
    } : undefined;

    onSave({
      id: task?.id,
      type,
      title,
      description,
      priority,
      status,
      subtasks,
      tags,
      dueDate: reminderTime ? new Date(reminderTime).toISOString() : undefined,
      reminderTime: reminderTime ? new Date(reminderTime).toISOString() : undefined,
      dependencyIds,
      isShared,
      recurrence,
      duration: duration === '' ? undefined : Number(duration),
      location
    });
    onClose();
  };

  const handleAIEnhance = async () => {
      if (!title) return;
      setIsEnhancing(true);
      const allExistingTags = Array.from(new Set(availableTasks.flatMap(t => t.tags))) as string[];
      const enhancedData = await enhanceTaskWithAI(title, allExistingTags);
      
      if (enhancedData) {
          setDescription(enhancedData.description || description);
          if (enhancedData.priority) setPriority(enhancedData.priority);
          if (enhancedData.tags) setTags([...new Set([...tags, ...enhancedData.tags])]);
          if (enhancedData.subtasks) setSubtasks([...subtasks, ...enhancedData.subtasks]);
      }
      setIsEnhancing(false);
  };

  const isEventOrAppointment = type === 'EVENT' || type === 'APPOINTMENT';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 theme-${theme}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-semibold text-text tracking-tight">{task ? 'Edit' : 'Create New'}</h2>
             <div className="flex bg-surface border border-border rounded-lg p-0.5">
                 {[
                   { id: 'TASK', label: 'Task', color: 'bg-info text-white' },
                   { id: 'REMINDER', label: 'Reminder', color: 'bg-warning text-white' },
                   { id: 'EVENT', label: 'Event', color: 'bg-primary text-white' },
                   { id: 'APPOINTMENT', label: 'Appt', color: 'bg-accent text-white' }
                 ].map(t => (
                   <button 
                      key={t.id}
                      onClick={() => setType(t.id as TaskType)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === t.id ? `${t.color} shadow` : 'text-text-secondary hover:text-text'}`}
                   >
                       {t.label}
                   </button>
                 ))}
             </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text transition-colors p-1 rounded-full hover:bg-surface-hover">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 bg-surface">
            <div className="space-y-3">
                 <Input 
                    label="TITLE" 
                    placeholder="Enter title..."
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    autoFocus
                    className="text-lg font-medium"
                />
                 {title && !isEnhancing && (
                    <button 
                        onClick={handleAIEnhance} 
                        className="w-full py-2.5 flex items-center justify-center gap-2 bg-accent/10 text-accent rounded-xl text-sm font-medium transition-all border border-accent/20 hover:border-accent/30 group"
                    >
                        <Wand2 size={16} className="group-hover:rotate-12 transition-transform" /> 
                        Auto-Enhance with Gemini AI
                    </button>
                )}
            </div>

            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 ml-1">Description</label>
                <textarea 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none transition-all"
                    placeholder="Add more details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-hover p-4 rounded-2xl border border-border">
                 <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                        <Bell size={16} className="text-primary" /> 
                        {isEventOrAppointment ? 'Start Date & Time' : 'Due Date & Time'}
                    </label>
                    <input 
                        type="datetime-local"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    />
                 </div>
                 
                 {isEventOrAppointment && (
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                                <Clock size={16} className="text-accent" /> Duration (Minutes)
                            </label>
                            <input 
                                type="number"
                                min="0"
                                placeholder="e.g. 60"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                            />
                        </div>
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                                <MapPin size={16} className="text-danger" /> Location
                            </label>
                             <input 
                                type="text"
                                placeholder="Add location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                            />
                        </div>
                    </div>
                 )}
             </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 ml-1">Priority</label>
                    <div className="relative">
                        <select 
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                        >
                            {Object.values(TaskPriority).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 ml-1">Status</label>
                    <div className="relative">
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                        >
                            {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

             <div className="bg-surface-hover p-4 rounded-2xl border border-border">
                 <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                     <Repeat size={16} className="text-success" /> Repeated Item
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-semibold text-text-secondary mb-1.5">Frequency</label>
                         <select 
                             value={recurrenceFreq}
                             onChange={e => setRecurrenceFreq(e.target.value as any)}
                             className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                         >
                             <option value="none">Does not repeat</option>
                             <option value="daily">Daily</option>
                             <option value="weekly">Weekly</option>
                             <option value="monthly">Monthly</option>
                             <option value="yearly">Yearly</option>
                         </select>
                     </div>
                 </div>
             </div>
             
             {/* Tags */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 ml-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                        <span key={tag} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-primary/20">
                            {tag}
                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-text"><X size={12} /></button>
                        </span>
                    ))}
                </div>
                <Input 
                    placeholder="Type tag and press Enter" 
                    value={newTag} 
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="text-sm py-2"
                />
             </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-surface-hover flex justify-between items-center z-10">
            {task ? (
                <Button variant="danger" size="icon" onClick={() => onDelete && onDelete(task.id)} className="bg-danger/10 hover:bg-danger/20 text-danger">
                    <Trash2 size={18} />
                </Button>
            ) : <div />}
            
            <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="hover:bg-surface text-text-secondary">Cancel</Button>
                <Button variant="primary" onClick={handleSave} className="shadow-lg shadow-primary/25">Save</Button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TaskEditor;