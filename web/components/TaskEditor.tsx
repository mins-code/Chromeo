import React, { useState, useEffect, useId } from 'react';
import { Task, TaskPriority, TaskStatus, SubTask, RecurrenceConfig, TaskType, NotificationSettings } from '../types';
import Button from './Button';
import Input from './Input';
import { X, Plus, Trash2, Wand2, Bell, Link as LinkIcon, Users, Check, Repeat, MapPin, Clock, Play } from 'lucide-react';
import { enhanceTaskWithAI } from '../services/geminiService';
import { logger } from '../utils/logger';
import DateTimePicker from './DateTimePicker';
import Select from './Select';
import { useTheme } from '../context/ThemeContext';

interface TaskEditorProps {
  task?: Task;
  availableTasks: Task[]; // For dependency selection
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  initialDate?: Date; // For opening from Calendar
  initialType?: TaskType;
  globalNotificationSettings?: NotificationSettings;
  onStartFocus?: () => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, availableTasks, isOpen, onClose, onSave, onDelete, initialDate, initialType = 'TASK', globalNotificationSettings, onStartFocus }) => {
  const { theme } = useTheme();

  // Helper function to format minutes into a readable string
  const formatMinutesLabel = (minutes: number): string => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return days === 1 ? '1 day before' : `${days} days before`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return hours === 1 ? '1 hr before' : `${hours} hrs before`;
    } else {
      return `${minutes} min before`;
    }
  };

  // Helper function to format date for datetime-local input (without timezone conversion)
  const formatDateTimeLocal = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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

  // Per-task Notification Fields
  const [notificationEnabled, setNotificationEnabled] = useState<boolean | undefined>(undefined);
  const [notificationMode, setNotificationMode] = useState<'relative' | 'absolute'>('relative');
  const [notificationTime, setNotificationTime] = useState('');
  const [notificationMinutesBefore, setNotificationMinutesBefore] = useState<number | undefined>(undefined);
  const [showCustomNotification, setShowCustomNotification] = useState(false);
  const [customNotificationValue, setCustomNotificationValue] = useState(30);
  const [customNotificationUnit, setCustomNotificationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  const [isEnhancing, setIsEnhancing] = useState(false);

  // Focus management for subtasks
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  
  // Tag autocomplete states
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const listboxId = useId();
  
  // Extract all existing tags from available tasks
  const existingTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    availableTasks.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [availableTasks]);
  
  // Filter tags based on input - case sensitive matching
  const suggestedTags = React.useMemo(() => {
    if (!newTag.trim()) return existingTags;
    return existingTags.filter(tag => 
      tag.includes(newTag.trim()) && !tags.includes(tag)
    );
  }, [newTag, existingTags, tags]);

  // Handle subtask focus
  useEffect(() => {
    if (focusTarget) {
      const el = document.getElementById(`subtask-input-${focusTarget}`);
      if (el) {
        el.focus();
        setFocusTarget(null);
      }
    }
  }, [subtasks, focusTarget]);

  useEffect(() => {
    if (task) {
      setType(task.type || 'TASK');
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setSubtasks(task.subtasks);
      setTags(task.tags);
      setReminderTime(task.reminderTime ? formatDateTimeLocal(task.reminderTime) : (task.dueDate ? formatDateTimeLocal(task.dueDate) : ''));
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
      
      // Load notification settings
      // Load notification settings
      setNotificationEnabled(task.notificationEnabled);
      if (task.notificationTime) {
          setNotificationMode('absolute');
          setNotificationTime(formatDateTimeLocal(task.notificationTime));
          setNotificationMinutesBefore(undefined);
      } else {
          setNotificationMode('relative');
          setNotificationTime('');
          setNotificationMinutesBefore(task.notificationMinutesBefore);
          
          if (task.notificationMinutesBefore && ![5, 15, 60, 720, 1440].includes(task.notificationMinutesBefore)) {
            setShowCustomNotification(true);
            if (task.notificationMinutesBefore >= 1440) {
              setCustomNotificationValue(Math.floor(task.notificationMinutesBefore / 1440));
              setCustomNotificationUnit('days');
            } else if (task.notificationMinutesBefore >= 60) {
              setCustomNotificationValue(Math.floor(task.notificationMinutesBefore / 60));
              setCustomNotificationUnit('hours');
            } else {
              setCustomNotificationValue(task.notificationMinutesBefore);
              setCustomNotificationUnit('minutes');
            }
          } else {
            setShowCustomNotification(false);
          }
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
        setReminderTime(initialDate ? formatDateTimeLocal(initialDate) : '');
        setDependencyIds([]);
        setIsShared(false);
        setDuration('');
        setLocation('');
        setRecurrenceFreq('none');
        setRecurrenceInterval(1);
        setRecurrenceEnd('');
        
        // Reset notification settings
        // Reset notification settings
        setNotificationEnabled(undefined);
        setNotificationMode('relative');
        setNotificationTime('');
        setNotificationMinutesBefore(undefined);
        setShowCustomNotification(false);
        setCustomNotificationValue(30);
        setCustomNotificationUnit('minutes');
    }
  }, [task, isOpen, initialDate, initialType]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    logger.debug('[TaskEditor] Save clicked', { title });
    if (!title.trim()) {
      logger.warn('[TaskEditor] Title is empty, cannot save');
      return;
    }
    
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
      location,

      notificationEnabled,
      notificationMinutesBefore: notificationMode === 'relative' ? notificationMinutesBefore : undefined,
      notificationTime: notificationMode === 'absolute' && notificationTime ? new Date(notificationTime).toISOString() : undefined
    });
    onClose();
  };

  const handleAddSubtask = () => {
      const newId = crypto.randomUUID();
      setSubtasks([...subtasks, { id: newId, title: '', isCompleted: false }]);
      setFocusTarget(newId);
  };

  const handleUpdateSubtask = (id: string, val: string) => {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, title: val } : s));
  };

  const handleDeleteSubtask = (id: string) => {
      setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent, index: number, id: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSubtask();
    } else if (e.key === 'Backspace' && !subtasks[index].title) {
        e.preventDefault();
        if (subtasks.length > 0) {
            const prevIndex = index - 1;
            if (prevIndex >= 0) {
                setFocusTarget(subtasks[prevIndex].id);
            }
            handleDeleteSubtask(id);
        }
    }
  };
  
  const handleToggleSubtask = (id: string) => {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Prevent form submission
          
          // If suggestions are shown and there's a selection, add the suggested tag
          if (showTagSuggestions && suggestedTags.length > 0 && selectedSuggestionIndex >= 0) {
              const selectedTag = suggestedTags[selectedSuggestionIndex];
              if (!tags.includes(selectedTag)) {
                  setTags([...tags, selectedTag]);
              }
              setNewTag('');
              setShowTagSuggestions(false);
              setSelectedSuggestionIndex(0);
          } else if (newTag.trim()) {
              // Otherwise add the typed tag
              if (!tags.includes(newTag.trim())) {
                  setTags([...tags, newTag.trim()]);
              }
              setNewTag('');
              setShowTagSuggestions(false);
          }
      } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (suggestedTags.length > 0) {
              setShowTagSuggestions(true);
              setSelectedSuggestionIndex(prev => 
                  prev < suggestedTags.length - 1 ? prev + 1 : 0
              );
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (suggestedTags.length > 0) {
              setShowTagSuggestions(true);
              setSelectedSuggestionIndex(prev => 
                  prev > 0 ? prev - 1 : suggestedTags.length - 1
              );
          }
      } else if (e.key === 'Escape') {
          setShowTagSuggestions(false);
          setSelectedSuggestionIndex(0);
      }
  };

  const selectSuggestedTag = (tag: string) => {
      if (!tags.includes(tag)) {
          setTags([...tags, tag]);
      }
      setNewTag('');
      setShowTagSuggestions(false);
      setSelectedSuggestionIndex(0);
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        className="relative glass rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-title"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <h2 id="task-editor-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{task ? 'Edit' : 'Create New'}</h2>
             <div
                role="radiogroup"
                aria-label="Task Type"
                className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-0.5"
             >
                 <button 
                    role="radio"
                    aria-checked={type === 'TASK'}
                    onClick={() => setType('TASK')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'TASK' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Task
                 </button>
                 <button 
                    role="radio"
                    aria-checked={type === 'REMINDER'}
                    onClick={() => setType('REMINDER')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'REMINDER' ? 'bg-yellow-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Reminder
                 </button>
                 <button 
                    role="radio"
                    aria-checked={type === 'EVENT'}
                    onClick={() => setType('EVENT')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'EVENT' ? 'bg-brand-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Event
                 </button>
                 <button 
                    role="radio"
                    aria-checked={type === 'APPOINTMENT'}
                    onClick={() => setType('APPOINTMENT')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${type === 'APPOINTMENT' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                     Appt
                 </button>
             </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close modal"
          >
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

            {/* Tags - Moved to top */}
            <div className="relative">
               <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1 flex items-center gap-2">
                   Tags
                   {newTag && <span className="text-[10px] normal-case font-normal text-brand-500 animate-fade-in">Type tag and press enter</span>}
               </label>
               <div className="flex flex-wrap gap-2 mb-3">
                   {tags.map(tag => (
                       <span key={tag} className="bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-brand-500/20">
                           {tag}
                           <button onClick={() => removeTag(tag)} className="hover:text-slate-800 dark:hover:text-white" aria-label={`Remove tag ${tag}`}><X size={12} /></button>
                       </span>
                   ))}
               </div>
               <div className="flex gap-2">
                   <div className="flex-1">
                       <Input 
                           role="combobox"
                           aria-autocomplete="list"
                           aria-expanded={showTagSuggestions && suggestedTags.length > 0}
                           aria-controls={showTagSuggestions && suggestedTags.length > 0 ? listboxId : undefined}
                           aria-activedescendant={showTagSuggestions && suggestedTags.length > 0 ? `${listboxId}-option-${selectedSuggestionIndex}` : undefined}
                           placeholder="Type tag..." 
                           value={newTag} 
                           onChange={e => {
                               setNewTag(e.target.value);
                               setShowTagSuggestions(true);
                               setSelectedSuggestionIndex(0);
                           }}
                           onKeyDown={handleAddTag}
                           onFocus={() => {
                               if (suggestedTags.length > 0) {
                                   setShowTagSuggestions(true);
                               }
                           }}
                           onBlur={() => {
                               // Delay to allow click on suggestion
                               setTimeout(() => setShowTagSuggestions(false), 150);
                           }}
                           className="text-sm py-2"
                           enterKeyHint="done"
                       />
                   </div>
                   <button
                       type="button"
                       onClick={() => {
                           if (showTagSuggestions && suggestedTags.length > 0 && selectedSuggestionIndex >= 0) {
                               const selectedTag = suggestedTags[selectedSuggestionIndex];
                               if (!tags.includes(selectedTag)) {
                                   setTags([...tags, selectedTag]);
                               }
                               setNewTag('');
                               setShowTagSuggestions(false);
                               setSelectedSuggestionIndex(0);
                           } else if (newTag.trim()) {
                               if (!tags.includes(newTag.trim())) {
                                   setTags([...tags, newTag.trim()]);
                               }
                               setNewTag('');
                               setShowTagSuggestions(false);
                           }
                       }}
                       disabled={!newTag.trim() && !(showTagSuggestions && suggestedTags.length > 0)}
                       className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                           newTag.trim() || (showTagSuggestions && suggestedTags.length > 0)
                               ? 'bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-95'
                               : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                       }`}
                       aria-label="Add tag"
                   >
                       <Plus size={18} />
                   </button>
               </div>
               
               {/* Autocomplete Dropdown */}
               {showTagSuggestions && suggestedTags.length > 0 && (
                   <ul
                       id={listboxId}
                       role="listbox"
                       className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-scale-in p-0 m-0 list-none"
                   >
                       {suggestedTags.map((tag, index) => (
                           <li
                               key={tag}
                               id={`${listboxId}-option-${index}`}
                               role="option"
                               aria-selected={index === selectedSuggestionIndex}
                               onClick={() => selectSuggestedTag(tag)}
                               className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                                   index === selectedSuggestionIndex
                                       ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300'
                                       : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                               }`}
                           >
                               <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
                               {tag}
                           </li>
                       ))}
                   </ul>
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
                    <DateTimePicker
                        label={isEventOrAppointment ? 'Start Date & Time' : 'Due Date & Time'}
                        value={reminderTime}
                        onChange={setReminderTime}
                        placeholder="Select date and time"
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

            {/* Per-Task Notification Settings */}
            {reminderTime && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <Bell size={16} className="text-amber-500" />
                    Notification for this {type.toLowerCase()}
                  </div>
                  <button
                    onClick={() => {
                      const newValue = notificationEnabled === undefined ? true : notificationEnabled === true ? false : undefined;
                      setNotificationEnabled(newValue);
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      notificationEnabled === true ? 'bg-amber-500' : 
                      notificationEnabled === false ? 'bg-slate-300 dark:bg-slate-600' :
                      'bg-gradient-to-r from-slate-300 to-amber-400 dark:from-slate-600 dark:to-amber-500'
                    }`}
                    title={
                      notificationEnabled === undefined ? 'Using global settings' :
                      notificationEnabled ? 'Enabled' : 'Disabled'
                    }
                    aria-label={
                      notificationEnabled === true ? 'Disable notification' :
                      notificationEnabled === false ? 'Use global settings' :
                      'Enable notification'
                    }
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      notificationEnabled === true ? 'translate-x-6' : 
                      notificationEnabled === false ? 'translate-x-0' :
                      'translate-x-3'
                    }`} />
                  </button>
                </div>
                
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                  {notificationEnabled === undefined && (
                    globalNotificationSettings?.enabled 
                      ? `• Using global notification settings (${formatMinutesLabel(globalNotificationSettings.reminderMinutesBefore)})`
                      : '• Using global notification settings (off)'
                  )}
                  {notificationEnabled === true && '• Notification enabled for this item'}
                  {notificationEnabled === false && '• Notification disabled for this item'}
                </p>

                {(notificationEnabled === undefined || notificationEnabled === true) && (
                  <div className="space-y-3">
                    {/* Notification Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => {
                              setNotificationMode('relative');
                              // Auto-switch to custom if in default mode
                              if (notificationEnabled === undefined) setNotificationEnabled(true);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                notificationMode === 'relative' 
                                ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Time Before
                        </button>
                        <button
                            onClick={() => {
                                setNotificationMode('absolute');
                                // Auto-switch to custom if in default mode
                                if (notificationEnabled === undefined) setNotificationEnabled(true);
                                // Default absolute time to reminder time if available, or now
                                if (!notificationTime) {
                                  setNotificationTime(reminderTime || new Date().toISOString().slice(0, 16));
                                }
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                notificationMode === 'absolute' 
                                ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Specific Time
                        </button>
                    </div>

                    {notificationMode === 'relative' ? (
                        <>
                            <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300">
                              Notify me before
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: undefined, label: 'Default' },
                                { value: 5, label: '5 min' },
                                { value: 15, label: '15 min' },
                                { value: 60, label: '1 hr' },
                                { value: 720, label: '12 hr' },
                                { value: 1440, label: '1 day' },
                              ].map((option) => (
                                <button
                                  key={option.label}
                                  onClick={() => {
                                    // Auto-switch to custom if in default mode and selecting non-default option
                                    if (notificationEnabled === undefined && option.value !== undefined) {
                                      setNotificationEnabled(true);
                                    }
                                    setNotificationMinutesBefore(option.value);
                                    setShowCustomNotification(false);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    !showCustomNotification && notificationMinutesBefore === option.value
                                      ? 'bg-amber-500 text-white shadow-md'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-600'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  // Auto-switch to custom if in default mode
                                  if (notificationEnabled === undefined) setNotificationEnabled(true);
                                  setShowCustomNotification(true);
                                  const multiplier = customNotificationUnit === 'days' ? 1440 : customNotificationUnit === 'hours' ? 60 : 1;
                                  setNotificationMinutesBefore(customNotificationValue * multiplier);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  showCustomNotification
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-600'
                                }`}
                              >
                                Custom
                              </button>
                            </div>

                            {showCustomNotification && (
                              <div className="flex items-center gap-2 mt-2 animate-fade-in">
                                <input
                                  type="number"
                                  min="1"
                                  max="999"
                                  value={customNotificationValue}
                                  onChange={(e) => {
                                    const num = parseInt(e.target.value) || 1;
                                    setCustomNotificationValue(num);
                                    const multiplier = customNotificationUnit === 'days' ? 1440 : customNotificationUnit === 'hours' ? 60 : 1;
                                    setNotificationMinutesBefore(num * multiplier);
                                  }}
                                  className="w-16 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                                <Select
                                  value={customNotificationUnit}
                                  onChange={(value) => {
                                    const unit = value as 'minutes' | 'hours' | 'days';
                                    setCustomNotificationUnit(unit);
                                    const multiplier = unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1;
                                    setNotificationMinutesBefore(customNotificationValue * multiplier);
                                  }}
                                  options={[
                                    { value: 'minutes', label: 'minutes' },
                                    { value: 'hours', label: 'hours' },
                                    { value: 'days', label: 'days' }
                                  ]}
                                  currentTheme={theme}
                                  className="w-24"
                                />
                                <span className="text-xs text-amber-600 dark:text-amber-400">before</span>
                              </div>
                            )}
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                                Notify exactly at
                            </label>
                            <DateTimePicker
                                value={notificationTime}
                                onChange={setNotificationTime}
                                placeholder="Select notification time"
                            />
                             <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/80">
                                This notification time is fixed and won't change even if you reschedule the task.
                            </p>
                        </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <Select
                        label="Priority"
                        value={priority}
                        onChange={(value) => setPriority(value as TaskPriority)}
                        options={Object.values(TaskPriority).map(p => ({ value: p, label: p }))}
                        currentTheme={theme}
                        className="w-full"
                    />
                </div>
                <div>
                    <Select
                        label="Status"
                        value={status}
                        onChange={(value) => setStatus(value as TaskStatus)}
                        options={Object.values(TaskStatus).map(s => ({ value: s, label: s.replace('_', ' ') }))}
                        currentTheme={theme}
                        className="w-full"
                    />
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
                          <Select
                              value={recurrenceFreq}
                              onChange={(value) => setRecurrenceFreq(value as any)}
                              options={[
                                  { value: 'none', label: 'Does not repeat' },
                                  { value: 'daily', label: 'Daily' },
                                  { value: 'weekly', label: 'Weekly' },
                                  { value: 'monthly', label: 'Monthly' },
                                  { value: 'yearly', label: 'Yearly' }
                              ]}
                              currentTheme={theme}
                          />
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
                    {subtasks.map((st, index) => (
                        <div key={st.id} className="flex items-center gap-3 group bg-slate-50 dark:bg-black/20 p-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all">
                             <input 
                                type="checkbox" 
                                checked={st.isCompleted} 
                                onChange={() => handleToggleSubtask(st.id)}
                                className="rounded-md border-slate-400 dark:border-slate-600 bg-transparent text-brand-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                                aria-label={`Mark "${st.title || 'subtask'}" as ${st.isCompleted ? 'incomplete' : 'complete'}`}
                            />
                            <input 
                                id={`subtask-input-${st.id}`}
                                type="text"
                                value={st.title}
                                onChange={(e) => handleUpdateSubtask(st.id, e.target.value)}
                                onKeyDown={(e) => handleSubtaskKeyDown(e, index, st.id)}
                                className={`flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}
                                placeholder="What needs to be done?"
                                aria-label="Subtask title"
                            />
                            <button
                                onClick={() => handleDeleteSubtask(st.id)}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1"
                                aria-label="Delete subtask"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {subtasks.length === 0 && (
                        <p className="text-xs text-slate-500 italic ml-1">No subtasks yet.</p>
                    )}
                </div>
             </div>
         </div>

         {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 flex justify-between items-center z-10">
            {task ? (
                <Button variant="danger" size="icon" onClick={() => onDelete && onDelete(task.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400" aria-label="Delete task">
                    <Trash2 size={18} />
                </Button>
            ) : <div />}
            
            <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400">Cancel</Button>
                {task && onStartFocus && (
                    <Button 
                        variant="secondary" 
                        onClick={() => { onClose(); onStartFocus(); }}
                        className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/20"
                    >
                        <Play size={16} className="mr-2" /> Focus
                    </Button>
                )}
                <Button variant="primary" onClick={handleSave} className="shadow-lg shadow-brand-500/25">Save</Button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(TaskEditor);