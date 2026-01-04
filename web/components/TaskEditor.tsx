import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, SubTask, RecurrenceConfig, TaskType } from '../types';
import Button from './Button';
import Input from './Input';
import { X, Plus, Trash2, Wand2, Bell, Link as LinkIcon, Users, Check, Repeat, Calendar, MapPin, Clock } from 'lucide-react';
import { enhanceTaskWithAI } from '../services/geminiService';
import DateTimePicker from './DateTimePicker';

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
  
  // Tag autocomplete states
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
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

  if (!isOpen) return null;

  const handleSave = () => {
    console.log('[TaskEditor] Save clicked, title:', title);
    if (!title.trim()) {
      console.warn('[TaskEditor] Title is empty, cannot save');
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
                           <button onClick={() => removeTag(tag)} className="hover:text-slate-800 dark:hover:text-white"><X size={12} /></button>
                       </span>
                   ))}
               </div>
               <div className="flex gap-2">
                   <div className="flex-1">
                       <Input 
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
                   >
                       <Plus size={18} />
                   </button>
               </div>
               
               {/* Autocomplete Dropdown */}
               {showTagSuggestions && suggestedTags.length > 0 && (
                   <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-scale-in">
                       {suggestedTags.map((tag, index) => (
                           <button
                               key={tag}
                               type="button"
                               onClick={() => selectSuggestedTag(tag)}
                               className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                   index === selectedSuggestionIndex
                                       ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300'
                                       : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                               }`}
                           >
                               <span className="flex items-center gap-2">
                                   <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                                   {tag}
                               </span>
                           </button>
                       ))}
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
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      notificationEnabled === true ? 'translate-x-6' : 
                      notificationEnabled === false ? 'translate-x-0' :
                      'translate-x-3'
                    }`} />
                  </button>
                </div>
                
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                  {notificationEnabled === undefined && '• Using global notification settings'}
                  {notificationEnabled === true && '• Notification enabled for this item'}
                  {notificationEnabled === false && '• Notification disabled for this item'}
                </p>

                {(notificationEnabled === undefined || notificationEnabled === true) && (
                  <div className="space-y-3">
                    {/* Notification Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setNotificationMode('relative')}
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
                                // Default absolute time to reminder time if available, or now. Wait, use reminder time only if it's there
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
                                <select
                                  value={customNotificationUnit}
                                  onChange={(e) => {
                                    const unit = e.target.value as 'minutes' | 'hours' | 'days';
                                    setCustomNotificationUnit(unit);
                                    const multiplier = unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1;
                                    setNotificationMinutesBefore(customNotificationValue * multiplier);
                                  }}
                                  className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                >
                                  <option value="minutes">minutes</option>
                                  <option value="hours">hours</option>
                                  <option value="days">days</option>
                                </select>
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