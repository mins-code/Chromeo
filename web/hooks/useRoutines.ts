import { useState, useEffect, useCallback } from 'react';
import { Routine } from '../types';
import * as RoutineService from '../services/routineService';

/**
 * Hook to manage routines with optimistic updates.
 * Currently uses localStorage via routineService, but interface is ready for
 * future Supabase migration (Phase 4).
 */
export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load routines on mount
  useEffect(() => {
    const loadRoutines = () => {
      try {
        const loaded = RoutineService.getRoutines();
        setRoutines(loaded);
      } catch (err) {
        console.error('Failed to load routines:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutines();
  }, []);

  // Save a routine (create or update)
  const saveRoutine = useCallback((routine: Routine) => {
    const updated = RoutineService.saveRoutine(routine);
    setRoutines(updated);
    return updated;
  }, []);

  // Delete a routine
  const deleteRoutine = useCallback((id: string) => {
    const updated = RoutineService.deleteRoutine(id);
    setRoutines(updated);
    return updated;
  }, []);

  // Toggle routine active state
  const toggleRoutine = useCallback((id: string) => {
    const updated = RoutineService.toggleRoutine(id);
    setRoutines(updated);
    return updated;
  }, []);

  // Check if routine is active on a specific date
  const isRoutineActiveOn = useCallback((routine: Routine, date: Date): boolean => {
    return RoutineService.isRoutineActiveOnDate(routine, date);
  }, []);

  // Get human-readable pattern description
  const getPatternDescription = useCallback((routine: Routine): string => {
    return RoutineService.getPatternDescription(routine.pattern);
  }, []);

  return {
    routines,
    isLoading,
    saveRoutine,
    deleteRoutine,
    toggleRoutine,
    isRoutineActiveOn,
    getPatternDescription,
  };
}
