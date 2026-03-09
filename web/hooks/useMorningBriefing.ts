/**
 * useMorningBriefing Hook
 *
 * Manages the "Morning Briefing" feature which shows overdue tasks
 * when the user opens the app for the first time each day.
 */

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../types';
import { startOfDay } from '../utils/date';

const BRIEFING_DATE_KEY = 'last_briefing_date';

interface UseMorningBriefingProps {
  tasks: Task[];
}

interface UseMorningBriefingReturn {
  showBriefing: boolean;
  overdueTasks: Task[];
  dismissBriefing: () => void;
}

export function useMorningBriefing({ tasks }: UseMorningBriefingProps): UseMorningBriefingReturn {
  const [showBriefing, setShowBriefing] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Get today's date as a string for comparison
    const today = new Date().toDateString();
    const lastBriefingDate = localStorage.getItem(BRIEFING_DATE_KEY);

    // Only trigger briefing check if this is a new day
    if (lastBriefingDate === today) {
      return;
    }

    // Get the start of today (midnight) for comparison
    const todayStart = startOfDay(new Date());

    // Filter tasks that are overdue:
    // - Has a dueDate that is before today's start
    // - Status is not DONE
    const overdue = tasks.filter((task) => {
      if (task.status === TaskStatus.DONE) return false;
      if (!task.dueDate) return false;

      const taskDueDate = new Date(task.dueDate);
      return taskDueDate < todayStart;
    });

    if (overdue.length > 0) {
      setOverdueTasks(overdue);
      setShowBriefing(true);
    }

    // Update the last briefing date
    localStorage.setItem(BRIEFING_DATE_KEY, today);
  }, [tasks]);

  const dismissBriefing = useCallback(() => {
    setShowBriefing(false);
  }, []);

  return {
    showBriefing,
    overdueTasks,
    dismissBriefing,
  };
}
