/**
 * Task scoring and sorting utilities
 * Centralized logic for task urgency and priority calculations
 */

import { Task, TaskPriority, TaskStatus } from '../types';

/**
 * Urgency score weights configuration
 */
export const URGENCY_WEIGHTS = {
  // Priority weights
  PRIORITY_HIGH: 100,
  PRIORITY_MEDIUM: 50,
  PRIORITY_LOW: 10,

  // Deadline proximity weights
  OVERDUE: 200,
  DUE_WITHIN_24H: 150,
  DUE_WITHIN_3_DAYS: 80,
  DUE_WITHIN_WEEK: 40,

  // Status weights
  IN_PROGRESS_BONUS: 20,
} as const;

/**
 * Calculate urgency score for a task (higher = more urgent)
 * Used for sorting tasks by priority and deadline proximity
 *
 * @param task - The task to calculate urgency for
 * @param now - Optional timestamp to use for "now" (defaults to Date.now())
 * @returns Numeric urgency score (higher = more urgent)
 */
export function getUrgencyScore(task: Task, now: number = Date.now()): number {
  let score = 0;

  // Priority scoring
  switch (task.priority) {
    case TaskPriority.HIGH:
      score += URGENCY_WEIGHTS.PRIORITY_HIGH;
      break;
    case TaskPriority.MEDIUM:
      score += URGENCY_WEIGHTS.PRIORITY_MEDIUM;
      break;
    case TaskPriority.LOW:
    default:
      score += URGENCY_WEIGHTS.PRIORITY_LOW;
      break;
  }

  // Deadline proximity scoring
  const dateStr = task.dueDate || task.reminderTime;
  if (dateStr) {
    // ⚡ Bolt Optimization: Use Date.parse() instead of new Date().getTime()
    // This avoids creating a full Date object just to get the timestamp,
    // which is significantly faster in tight loops (like list sorting).
    const due = Date.parse(dateStr);
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      score += URGENCY_WEIGHTS.OVERDUE; // Overdue
    } else if (diffHours < 24) {
      score += URGENCY_WEIGHTS.DUE_WITHIN_24H; // Due within 24h
    } else if (diffHours < 72) {
      score += URGENCY_WEIGHTS.DUE_WITHIN_3_DAYS; // Due within 3 days
    } else if (diffHours < 168) {
      score += URGENCY_WEIGHTS.DUE_WITHIN_WEEK; // Due within a week
    }
  }

  // In-progress bonus
  if (task.status === TaskStatus.IN_PROGRESS) {
    score += URGENCY_WEIGHTS.IN_PROGRESS_BONUS;
  }

  return score;
}

/**
 * Sort tasks by urgency score (most urgent first)
 *
 * @param tasks - Array of tasks to sort
 * @returns New array sorted by urgency (does not mutate original)
 */
export function sortByUrgency(tasks: Task[]): Task[] {
  // ⚡ Bolt Optimization: Schwartzian Transform (Decorate-Sort-Undecorate)
  // Replaces O(N log N) scoring calls with O(N) calls by calculating the score exactly once per task.
  const now = Date.now();
  return tasks
    .map((task) => ({ task, score: getUrgencyScore(task, now) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.task);
}

/**
 * Filter and sort tasks that are not done
 *
 * @param tasks - Array of tasks
 * @returns Tasks that are not DONE, sorted by urgency
 */
export function getActiveTasks(tasks: Task[]): Task[] {
  return sortByUrgency(tasks.filter((t) => t.status !== TaskStatus.DONE));
}

/**
 * Get tasks due today (or before)
 *
 * @param tasks - Array of tasks to filter
 * @returns Tasks due today or overdue
 */
export function getTodaysTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tasks.filter((task) => {
    if (task.status === TaskStatus.DONE) return false;

    const dateStr = task.dueDate || task.reminderTime;
    if (!dateStr) return false;

    const taskDate = new Date(dateStr);
    return taskDate >= today && taskDate < tomorrow;
  });
}

/**
 * Get overdue tasks
 *
 * @param tasks - Array of tasks to filter
 * @returns Tasks that are past their due date
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  const nowTs = Date.now();

  return tasks.filter((task) => {
    if (task.status === TaskStatus.DONE) return false;

    const dateStr = task.dueDate || task.reminderTime;
    if (!dateStr) return false;

    // ⚡ Bolt Optimization: Use Date.parse for faster timestamp comparison
    return Date.parse(dateStr) < nowTs;
  });
}

/**
 * Get top N most urgent tasks
 *
 * @param tasks - Array of tasks
 * @param n - Number of tasks to return
 * @returns Top N most urgent tasks
 */
export function getTopUrgentTasks(tasks: Task[], n: number = 5): Task[] {
  return getActiveTasks(tasks).slice(0, n);
}
