import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, SubTask, RecurrenceConfig, TaskType } from '../types';
import Button from './Button';
import Input from './Input';
import { X, Plus, Trash2, Wand2, Bell, Link as LinkIcon, Users, Check, Repeat, Calendar, MapPin, Clock } from 'lucide-react';
import { enhanceTaskWithAI } from '../services/geminiService';

interface TaskEditorProps {
  task?: Task;
  availableTasks: Task[]; // For dependency selection
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  initialDate?: Date; // For opening from Calendar
  initialType?: TaskType;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, availableTasks, isOpen, onClose, onSave, onDelete, initialDate, initialType = 'TASK' }) => {
  const [type, setType] = useState<TaskType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // New Fields
  const [reminderTime, setReminderTime] = useState('');
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [duration, setDuration] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  
  // Recurrence Fields
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
        // Reset for new task
        setType(initialType);
        setTitle('');
        setDescription('');
        setPriority(TaskPriority.MEDIUM);
        setStatus(TaskStatus.TODO);
        setSubtasks([]);
        setTags([]);
        // If initialDate provided (from Calendar), set it as default reminder/due date
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
      dueDate: reminderTime ? new Date(reminderTime).toISOString() : undefined, // Simplify: map reminder input to due date for now
      reminderTime: reminderTime ? new Date(reminderTime).toISOString() : undefined,
      dependencyIds,
      isShared,
      recurrence,
      duration: duration === '' ? undefined : Number(duration),
      location
    });
    onClose();
  };

  const handleAddSubtask = () => {
      setSubtasks([...subtasks, { id: crypto.randomUUID(), title: '', isCompleted: false }]);
  };

  const handleUpdateSubtask = (id: string, val: string) => {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, title: val } : s));
  };

  const handleDeleteSubtask = (id: string) => {
      setSubtasks(subtasks.filter(s => s.id !== id));
  };
  
  const handleToggleSubtask = (id: string) => {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newTag.trim()) {
          if(!tags.includes(newTag.trim())) {
              setTags([...tags, newTag.trim()]);
          }
          setNewTag('');
      }
  };

  const removeTag = (t: string) => {
      setTags(tags.filter(tag => tag !== t));
  };

  const toggleDependency = (id: string) => {
      if (dependencyIds.includes(id)) {
          setDependencyIds(dependencyIds.filter(d => d !== id));
      } else {
          setDependencyIds([...dependencyIds, id]);
      }
  };

  const handleAIEnhance = async () => {
      if (!title) return;
      setIsEnhancing(true);
      
      // Calculate all existing tags from available tasks
      const allExistingTags = Array.from(new Set(availableTasks.flatMap(t => t.tags))) as string[];
      
      const enhancedData = await enhanceTaskWithAI(title, allExistingTags);
      
      if (enhancedData) {
          setDescription(enhancedData.description || description);
          if (enhancedData.priority) setPriority(enhancedData.priority);
          if (enhancedData.tags) setTags([...new Set([...tags, ...enhancedData.tags])]);
          if (enhancedData.subtasks) {
              setSubtasks([...subtasks, ...enhancedData.subtasks]);
          }
      }
      setIsEnhancing(false);
  };

  const isEventOrAppointment = type === 'EVENT' || type === 'APPOINTMENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{task ? 'Edit' : 'Create New'}</h2>
             <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-0.5">
                 <button 
                    onClick={() => setType('TASK')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'TASK' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Task
                 </button>
                 <button 
                    onClick={() => setType('REMINDER')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'REMINDER' ? 'bg-yellow-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Reminder
                 </button>
                 <button 
                    onClick={() => setType('EVENT')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'EVENT' ? 'bg-brand-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Event
                 </button>
                 <button 
                    onClick={() => setType('APPOINTMENT')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'APPOINTMENT' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Appt
                 </button>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
            <div className="space-y-3">
                 <Input 
                    label="TITLE" 
                    placeholder={type === 'TASK' ? "E.g. Redesign homepage" : type === 'REMINDER' ? "E.g. Buy milk" : type === 'EVENT' ? "E.g. Birthday Party" : "E.g. Dentist"} 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    autoFocus
                    className="text-lg font-medium"
                />
                 {title && !isEnhancing && (
                    <button 
                        onClick={handleAIEnhance} 
                        className="w-full py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-medium transition-all border border-purple-500/20 hover:border-purple-500/30 group"
                    >
                        <Wand2 size={16} className="group-hover:rotate-12 transition-transform" /> 
                        Auto-Enhance with Gemini AI
                    </button>
                )}
                {isEnhancing && (
                    <div className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Wand2 size={16} className="animate-spin text-purple-400" /> Thinking...
                    </div>
                )}
            </div>

            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Description</label>
                <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[100px] resize-none transition-all hover:border-slate-400 dark:hover:border-slate-500"
                    placeholder="Add more details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>

            {/* Time & Duration Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                 <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                        <Bell size={16} className="text-brand-500" /> 
                        {isEventOrAppointment ? 'Start Date & Time' : 'Due Date & Time'}
                    </label>
                    <input 
                        type="datetime-local"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 [color-scheme:light] dark:[color-scheme:dark]" 
                    />
                 </div>
                 
                 {isEventOrAppointment && (
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                <Clock size={16} className="text-purple-500" /> Duration (Minutes)
                            </label>
                            <input 
                                type="number"
                                min="0"
                                placeholder="e.g. 60"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" 
                            />
                        </div>
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                <MapPin size={16} className="text-red-500" /> Location
                            </label>
                             <input 
                                type="text"
                                placeholder="Add location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" 
                            />
                        </div>
                    </div>
                 )}
             </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Priority</label>
                    <div className="relative">
                        <select 
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        >
                            {Object.values(TaskPriority).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Status</label>
                    <div className="relative">
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        >
                            {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                 <div>
                     <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                        <Users size={16} className="text-blue-500" /> Collaboration
                    </label>
                    <button
                        onClick={() => setIsShared(!isShared)}
                        className={`w-full px-3 py-2 rounded-lg text-sm border flex items-center justify-between transition-all ${
                            isShared 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span>{isShared ? 'Shared with Partner' : 'Private'}</span>
                        {isShared && <Check size={14} />}
                    </button>
                 </div>
             </div>

             {/* Recurrence Settings */}
             <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                 <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
                     <Repeat size={16} className="text-emerald-500" /> Repeated Item
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-semibold text-slate-500 mb-1.5">Frequency</label>
                         <select 
                             value={recurrenceFreq}
                             onChange={e => setRecurrenceFreq(e.target.value as any)}
                             className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                         >
                             <option value="none">Does not repeat</option>
                             <option value="daily">Daily</option>
                             <option value="weekly">Weekly</option>
                             <option value="monthly">Monthly</option>
                             <option value="yearly">Yearly</option>
                         </select>
                     </div>
                     {recurrenceFreq !== 'none' && (
                         <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Repeat Every</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        min="1"
                                        value={recurrenceInterval}
                                        onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                        className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                    <span className="text-sm text-slate-400">
                                        {recurrenceFreq === 'daily' ? 'day(s)' : 
                                         recurrenceFreq === 'weekly' ? 'week(s)' : 
                                         recurrenceFreq === 'monthly' ? 'month(s)' : 'year(s)'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">End Date (Optional)</label>
                                <input 
                                    type="date"
                                    value={recurrenceEnd}
                                    onChange={e => setRecurrenceEnd(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                         </div>
                     )}
                 </div>
             </div>
             
             {/* Dependencies */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1 flex items-center gap-2">
                    <LinkIcon size={12} /> Dependencies
                </label>
                <div className="max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                     {availableTasks.length === 0 && <p className="text-xs text-slate-500 p-2">No other tasks available to link.</p>}
                     {availableTasks
                        .filter(t => t.id !== task?.id) // Cannot depend on self
                        .map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => toggleDependency(t.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                                dependencyIds.includes(t.id) ? 'bg-brand-500/20 text-brand-600 dark:text-brand-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                dependencyIds.includes(t.id) ? 'border-brand-500 bg-brand-500' : 'border-slate-400 dark:border-slate-600'
                            }`}>
                                {dependencyIds.includes(t.id) && <Plus size={10} className="text-white" />}
                            </div>
                            <span className="truncate">{t.title}</span>
                        </div>
                     ))}
                </div>
             </div>

             {/* Subtasks */}
             <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Subtasks</label>
                    <button onClick={handleAddSubtask} className="text-xs font-medium px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 text-brand-600 dark:text-brand-400 transition-colors">
                        <Plus size={12} /> Add Item
                    </button>
                </div>
                <div className="space-y-2.5">
                    {subtasks.map(st => (
                        <div key={st.id} className="flex items-center gap-3 group bg-slate-50 dark:bg-black/20 p-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all">
                             <input 
                                type="checkbox" 
                                checked={st.isCompleted} 
                                onChange={() => handleToggleSubtask(st.id)}
                                className="rounded-md border-slate-400 dark:border-slate-600 bg-transparent text-brand-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                            />
                            <input 
                                type="text"
                                value={st.title}
                                onChange={(e) => handleUpdateSubtask(st.id, e.target.value)}
                                className={`flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}
                                placeholder="What needs to be done?"
                            />
                            <button onClick={() => handleDeleteSubtask(st.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {subtasks.length === 0 && (
                        <p className="text-xs text-slate-500 italic ml-1">No subtasks yet.</p>
                    )}
                </div>
             </div>

             {/* Tags */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                        <span key={tag} className="bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-brand-500/20">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-slate-800 dark:hover:text-white"><X size={12} /></button>
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
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 flex justify-between items-center z-10">
            {task ? (
                <Button variant="danger" size="icon" onClick={() => onDelete && onDelete(task.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400">
                    <Trash2 size={18} />
                </Button>
            ) : <div />}
            
            <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400">Cancel</Button>
                <Button variant="primary" onClick={handleSave} className="shadow-lg shadow-brand-500/25">Save</Button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TaskEditor;