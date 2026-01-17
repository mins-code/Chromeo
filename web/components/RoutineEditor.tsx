import React, { useState, useEffect } from 'react';
import { Routine, RoutinePattern, WeekdayPattern, IntervalPattern, CyclePattern, CycleItem } from '../types';
import Button from './Button';
import Input from './Input';
import TimePickerDropdown from './TimePickerDropdown';
import { X, Plus, Trash2, GripVertical, Clock, Bell, Calendar, Repeat, CheckCircle2 } from 'lucide-react';
import * as RoutineService from '../services/routineService';

interface RoutineEditorProps {
  routine?: Routine;
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: Routine) => void;
  onDelete?: (id: string) => void;
}

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CYCLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
];

const RoutineEditor: React.FC<RoutineEditorProps> = ({ routine, isOpen, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [patternType, setPatternType] = useState<'weekday' | 'interval' | 'cycle'>('weekday');
  
  // Weekday pattern state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  
  // Interval pattern state
  const [intervalEvery, setIntervalEvery] = useState(2);
  const [intervalStartDate, setIntervalStartDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Cycle pattern state
  const [cycleItems, setCycleItems] = useState<CycleItem[]>([
    { name: 'Day 1', color: CYCLE_COLORS[0] },
    { name: 'Day 2', color: CYCLE_COLORS[1] }
  ]);
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newCycleItemName, setNewCycleItemName] = useState('');
  
  // Time and notification
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState<number | ''>(60);
  const [isActive, setIsActive] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean | undefined>(undefined);
  const [notificationMinutesBefore, setNotificationMinutesBefore] = useState<number | undefined>(undefined);

  // Load routine data
  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setDescription(routine.description || '');
      setPatternType(routine.pattern.type);
      setTime(routine.time || '09:00');
      setDuration(routine.duration || 60);
      setIsActive(routine.isActive);
      setNotificationEnabled(routine.notificationEnabled);
      setNotificationMinutesBefore(routine.notificationMinutesBefore);
      
      if (routine.pattern.type === 'weekday') {
        setSelectedDays((routine.pattern as WeekdayPattern).days);
      } else if (routine.pattern.type === 'interval') {
        const p = routine.pattern as IntervalPattern;
        setIntervalEvery(p.every);
        setIntervalStartDate(new Date(p.startDate).toISOString().slice(0, 10));
      } else if (routine.pattern.type === 'cycle') {
        const p = routine.pattern as CyclePattern;
        setCycleItems(p.items);
        setCycleStartDate(new Date(p.startDate).toISOString().slice(0, 10));
      }
    } else {
      // Reset to defaults
      setName('');
      setDescription('');
      setPatternType('weekday');
      setSelectedDays([1, 2, 3, 4, 5]);
      setIntervalEvery(2);
      setIntervalStartDate(new Date().toISOString().slice(0, 10));
      setCycleItems([
        { name: 'Day 1', color: CYCLE_COLORS[0] },
        { name: 'Day 2', color: CYCLE_COLORS[1] }
      ]);
      setCycleStartDate(new Date().toISOString().slice(0, 10));
      setTime('09:00');
      setDuration(60);
      setIsActive(true);
      setNotificationEnabled(undefined);
      setNotificationMinutesBefore(undefined);
    }
  }, [routine, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addCycleItem = () => {
    if (newCycleItemName.trim()) {
      setCycleItems([...cycleItems, { 
        name: newCycleItemName.trim(), 
        color: CYCLE_COLORS[cycleItems.length % CYCLE_COLORS.length] 
      }]);
      setNewCycleItemName('');
    }
  };

  const removeCycleItem = (index: number) => {
    setCycleItems(cycleItems.filter((_, i) => i !== index));
  };

  const updateCycleItemName = (index: number, newName: string) => {
    setCycleItems(cycleItems.map((item, i) => 
      i === index ? { ...item, name: newName } : item
    ));
  };

  const updateCycleItemColor = (index: number, newColor: string) => {
    setCycleItems(cycleItems.map((item, i) => 
      i === index ? { ...item, color: newColor } : item
    ));
  };

  const applyPreset = (preset: { name: string; pattern: RoutinePattern }) => {
    setName(preset.name);
    setPatternType(preset.pattern.type);
    
    if (preset.pattern.type === 'weekday') {
      setSelectedDays((preset.pattern as WeekdayPattern).days);
    } else if (preset.pattern.type === 'interval') {
      setIntervalEvery((preset.pattern as IntervalPattern).every);
    } else if (preset.pattern.type === 'cycle') {
      setCycleItems((preset.pattern as CyclePattern).items);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    let pattern: RoutinePattern;
    
    if (patternType === 'weekday') {
      pattern = { type: 'weekday', days: selectedDays };
    } else if (patternType === 'interval') {
      pattern = { 
        type: 'interval', 
        every: intervalEvery, 
        startDate: new Date(intervalStartDate).toISOString() 
      };
    } else {
      pattern = { 
        type: 'cycle', 
        items: cycleItems, 
        startDate: new Date(cycleStartDate).toISOString() 
      };
    }
    
    const now = new Date().toISOString();
    const routineData: Routine = {
      id: routine?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      pattern,
      time,
      duration: duration === '' ? undefined : Number(duration),
      isActive,
      notificationEnabled,
      notificationMinutesBefore,
      createdAt: routine?.createdAt || now,
      updatedAt: now
    };
    
    onSave(routineData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Repeat className="text-emerald-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              {routine ? 'Edit Routine' : 'New Routine'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5" aria-label="Close editor">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Presets */}
          {!routine && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {RoutineService.PRESET_PATTERNS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <Input 
            label="ROUTINE NAME" 
            placeholder="E.g. Morning Workout, Work Hours" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            autoFocus
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Description (Optional)</label>
            <textarea 
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[60px] resize-none transition-all hover:border-slate-400 dark:hover:border-slate-500"
              placeholder="What's this routine for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Pattern Type Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Pattern Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-1">
              <button 
                onClick={() => setPatternType('weekday')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${patternType === 'weekday' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Weekdays
              </button>
              <button 
                onClick={() => setPatternType('interval')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${patternType === 'interval' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Interval
              </button>
              <button 
                onClick={() => setPatternType('cycle')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${patternType === 'cycle' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Cycle
              </button>
            </div>
          </div>

          {/* Weekday Pattern */}
          {patternType === 'weekday' && (
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Select Days</label>
              <div className="flex gap-2">
                {DAY_NAMES.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleDay(index)}
                    title={FULL_DAY_NAMES[index]}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      selectedDays.includes(index)
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Weekdays
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => setSelectedDays([0, 6])}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Weekends
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  All
                </button>
              </div>
            </div>
          )}

          {/* Interval Pattern */}
          {patternType === 'interval' && (
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">Every</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalEvery}
                  onChange={e => setIntervalEvery(parseInt(e.target.value) || 1)}
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-center text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">day(s)</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Starting from</label>
                <input
                  type="date"
                  value={intervalStartDate}
                  onChange={e => setIntervalStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Cycle Pattern */}
          {patternType === 'cycle' && (
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Cycle Items (in order)</label>
              
              <div className="space-y-2">
                {cycleItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                    <GripVertical size={14} className="text-slate-400" />
                    <div 
                      className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow"
                      style={{ backgroundColor: item.color || CYCLE_COLORS[0] }}
                      onClick={() => {
                        const currentIndex = CYCLE_COLORS.indexOf(item.color || CYCLE_COLORS[0]);
                        const nextColor = CYCLE_COLORS[(currentIndex + 1) % CYCLE_COLORS.length];
                        updateCycleItemColor(index, nextColor);
                      }}
                      title="Click to change color"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateCycleItemName(index, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm text-slate-800 dark:text-slate-200"
                      placeholder="Item name"
                    />
                    <span className="text-xs text-slate-400">Day {index + 1}</span>
                    {cycleItems.length > 2 && (
                      <button onClick={() => removeCycleItem(index)} className="text-slate-400 hover:text-red-500 p-1" aria-label="Remove cycle item">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCycleItemName}
                  onChange={e => setNewCycleItemName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCycleItem()}
                  placeholder="Add cycle item..."
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Button variant="secondary" size="sm" onClick={addCycleItem}>
                  <Plus size={16} />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Cycle starts from</label>
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={e => setCycleStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              {/* Preset cycles */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {RoutineService.PRESET_PATTERNS.filter(p => p.pattern.type === 'cycle').map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        const p = preset.pattern as CyclePattern;
                        setCycleItems(p.items);
                        setName(preset.name);
                      }}
                      className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
            <TimePickerDropdown
              label="Time"
              value={time}
              onChange={setTime}
            />
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Duration (min)
              </label>
              <input
                type="number"
                min="0"
                placeholder="60"
                value={duration}
                onChange={e => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Active</p>
                <p className="text-xs text-slate-500">Show this routine on calendar</p>
              </div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              aria-label={isActive ? 'Deactivate routine' : 'Activate routine'}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Notification */}
          <div className="bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell size={20} className={notificationEnabled ? 'text-amber-500' : 'text-slate-400'} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Notification</p>
                  <p className="text-xs text-slate-500">
                    {notificationEnabled === undefined ? 'Use global settings' :
                     notificationEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
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
                aria-label={notificationEnabled === true ? 'Disable notification' : notificationEnabled === false ? 'Use global settings' : 'Enable notification'}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  notificationEnabled === true ? 'translate-x-6' : 
                  notificationEnabled === false ? 'translate-x-0' :
                  'translate-x-3'
                }`} />
              </button>
            </div>

            {/* Notification Timing - Show when enabled or using global settings */}
            {notificationEnabled !== false && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-white/10">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Notify me before routine starts
                </label>
                <select
                  value={notificationMinutesBefore ?? 15}
                  onChange={(e) => setNotificationMinutesBefore(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 flex justify-between items-center z-10">
          {routine && onDelete ? (
            <Button variant="danger" size="icon" onClick={() => onDelete(routine.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400" aria-label="Delete routine">
              <Trash2 size={18} />
            </Button>
          ) : <div />}
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400">Cancel</Button>
            <Button variant="primary" onClick={handleSave} className="shadow-lg shadow-emerald-500/25 bg-emerald-500 hover:bg-emerald-600">Save Routine</Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(RoutineEditor);
