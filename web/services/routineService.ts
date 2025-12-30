/**
 * Routine Service
 * Handles CRUD operations and pattern matching for routines
 */

import { Routine, RoutinePattern, WeekdayPattern, IntervalPattern, CyclePattern, CycleItem } from '../types';

const STORAGE_KEY = 'chronodex_routines';

/**
 * Get all routines from localStorage
 */
export const getRoutines = (): Routine[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading routines:', error);
  }
  return [];
};

/**
 * Save routines to localStorage
 */
const saveRoutines = (routines: Routine[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  } catch (error) {
    console.error('Error saving routines:', error);
  }
};

/**
 * Create or update a routine
 */
export const saveRoutine = (routine: Routine): Routine => {
  const routines = getRoutines();
  const existingIndex = routines.findIndex(r => r.id === routine.id);
  
  if (existingIndex >= 0) {
    routines[existingIndex] = routine;
  } else {
    routines.push(routine);
  }
  
  saveRoutines(routines);
  return routine;
};

/**
 * Delete a routine
 */
export const deleteRoutine = (id: string): boolean => {
  const routines = getRoutines();
  const filtered = routines.filter(r => r.id !== id);
  
  if (filtered.length < routines.length) {
    saveRoutines(filtered);
    return true;
  }
  return false;
};

/**
 * Toggle routine active status
 */
export const toggleRoutine = (id: string): Routine | null => {
  const routines = getRoutines();
  const routine = routines.find(r => r.id === id);
  
  if (routine) {
    routine.isActive = !routine.isActive;
    saveRoutines(routines);
    return routine;
  }
  return null;
};

/**
 * Check if a routine is active on a specific date
 */
export const isRoutineActiveOnDate = (routine: Routine, date: Date): boolean => {
  if (!routine.isActive) return false;
  
  const pattern = routine.pattern;
  
  switch (pattern.type) {
    case 'weekday':
      return pattern.days.includes(date.getDay());
      
    case 'interval': {
      const startDate = new Date(pattern.startDate);
      startDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      
      const diffTime = checkDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // If date is before start date, not active
      if (diffDays < 0) return false;
      
      return diffDays % pattern.every === 0;
    }
    
    case 'cycle': {
      // Cycle is always "active" on every day, but shows different items
      const startDate = new Date(pattern.startDate);
      startDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      
      const diffTime = checkDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // If date is before start date, not active
      return diffDays >= 0;
    }
    
    default:
      return false;
  }
};

/**
 * Get the cycle item active on a specific date (for cycle patterns)
 */
export const getCycleItemForDate = (routine: Routine, date: Date): CycleItem | null => {
  if (routine.pattern.type !== 'cycle') return null;
  
  const pattern = routine.pattern as CyclePattern;
  const startDate = new Date(pattern.startDate);
  startDate.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const diffTime = checkDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0 || pattern.items.length === 0) return null;
  
  const cycleIndex = diffDays % pattern.items.length;
  return pattern.items[cycleIndex];
};

/**
 * Get all routines active on a specific date with their display info
 */
export interface RoutineForDate {
  routine: Routine;
  displayName: string; // For cycles, this is the cycle item name
  color?: string;
}

export const getRoutinesForDate = (date: Date): RoutineForDate[] => {
  const routines = getRoutines();
  const activeRoutines: RoutineForDate[] = [];
  
  for (const routine of routines) {
    if (!isRoutineActiveOnDate(routine, date)) continue;
    
    if (routine.pattern.type === 'cycle') {
      const cycleItem = getCycleItemForDate(routine, date);
      if (cycleItem) {
        activeRoutines.push({
          routine,
          displayName: `${routine.name}: ${cycleItem.name}`,
          color: cycleItem.color
        });
      }
    } else {
      activeRoutines.push({
        routine,
        displayName: routine.name,
        color: undefined
      });
    }
  }
  
  return activeRoutines;
};

/**
 * Get a human-readable description of a routine pattern
 */
export const getPatternDescription = (pattern: RoutinePattern): string => {
  switch (pattern.type) {
    case 'weekday': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = pattern.days.map(d => dayNames[d]).join(', ');
      
      // Check for common patterns
      if (pattern.days.length === 5 && 
          pattern.days.includes(1) && pattern.days.includes(2) && 
          pattern.days.includes(3) && pattern.days.includes(4) && pattern.days.includes(5)) {
        return 'Weekdays';
      }
      if (pattern.days.length === 2 && pattern.days.includes(0) && pattern.days.includes(6)) {
        return 'Weekends';
      }
      if (pattern.days.length === 7) {
        return 'Every day';
      }
      
      return days;
    }
    
    case 'interval':
      if (pattern.every === 1) return 'Every day';
      if (pattern.every === 2) return 'Every other day';
      return `Every ${pattern.every} days`;
      
    case 'cycle': {
      const itemNames = pattern.items.map(i => i.name).join(' → ');
      return `Cycle: ${itemNames}`;
    }
    
    default:
      return 'Unknown pattern';
  }
};

/**
 * Create a new routine with defaults
 */
export const createNewRoutine = (name: string = ''): Routine => {
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    pattern: {
      type: 'weekday',
      days: [1, 2, 3, 4, 5] // Default to weekdays
    },
    time: '09:00',
    duration: 60,
    isActive: true,
    notificationEnabled: undefined,
    notificationMinutesBefore: undefined,
    createdAt: new Date().toISOString()
  };
};

/**
 * Preset patterns for quick selection
 */
export const PRESET_PATTERNS: { name: string; pattern: RoutinePattern }[] = [
  {
    name: 'Weekdays',
    pattern: { type: 'weekday', days: [1, 2, 3, 4, 5] }
  },
  {
    name: 'Weekends',
    pattern: { type: 'weekday', days: [0, 6] }
  },
  {
    name: 'Every Day',
    pattern: { type: 'weekday', days: [0, 1, 2, 3, 4, 5, 6] }
  },
  {
    name: 'Every Other Day',
    pattern: { type: 'interval', every: 2, startDate: new Date().toISOString() }
  },
  {
    name: 'Every 3 Days',
    pattern: { type: 'interval', every: 3, startDate: new Date().toISOString() }
  },
  {
    name: 'PPL Split (Push/Pull/Legs/Rest)',
    pattern: {
      type: 'cycle',
      items: [
        { name: 'Push', color: '#EF4444' },
        { name: 'Pull', color: '#3B82F6' },
        { name: 'Legs', color: '#10B981' },
        { name: 'Rest', color: '#6B7280' }
      ],
      startDate: new Date().toISOString()
    }
  },
  {
    name: 'Upper/Lower Split',
    pattern: {
      type: 'cycle',
      items: [
        { name: 'Upper Body', color: '#8B5CF6' },
        { name: 'Lower Body', color: '#F59E0B' },
        { name: 'Rest', color: '#6B7280' }
      ],
      startDate: new Date().toISOString()
    }
  }
];
