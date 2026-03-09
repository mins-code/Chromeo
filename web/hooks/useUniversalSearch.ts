/**
 * useUniversalSearch Hook
 *
 * Provides aggregated search across tasks, notes, transactions, and static pages.
 * Used by CommandBar for the Universal Search feature.
 */

import { useMemo } from 'react';
import { Task, Note, Transaction } from '../types';

// Search result type
export type SearchResultType = 'TASK' | 'NOTE' | 'PAGE' | 'TRANSACTION';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

// Static pages available in the app
const STATIC_PAGES: SearchResult[] = [
  { type: 'PAGE', id: 'dashboard', title: 'Dashboard', subtitle: 'Home overview', url: '/' },
  {
    type: 'PAGE',
    id: 'calendar',
    title: 'Calendar',
    subtitle: 'View your schedule',
    url: '/calendar',
  },
  { type: 'PAGE', id: 'budget', title: 'Budget', subtitle: 'Manage finances', url: '/budget' },
  { type: 'PAGE', id: 'notes', title: 'Notes', subtitle: 'Your notes & lists', url: '/notes' },
  {
    type: 'PAGE',
    id: 'activities',
    title: 'Activities',
    subtitle: 'Tasks & reminders',
    url: '/activities',
  },
  {
    type: 'PAGE',
    id: 'day-planner',
    title: 'Day Planner',
    subtitle: 'Plan your day',
    url: '/day-planner',
  },
  {
    type: 'PAGE',
    id: 'settings',
    title: 'Settings',
    subtitle: 'App preferences',
    url: '/settings',
  },
];

interface UseUniversalSearchOptions {
  query: string;
  tasks: Task[];
  notes: Note[];
  transactions: Transaction[];
  maxResults?: number;
}

/**
 * Universal search hook that filters across multiple data sources
 */
export function useUniversalSearch({
  query,
  tasks,
  notes,
  transactions,
  maxResults = 8,
}: UseUniversalSearchOptions): { results: SearchResult[] } {
  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    // Return empty if no query
    if (!trimmedQuery) {
      return [];
    }

    const searchResults: SearchResult[] = [];

    // Filter tasks by title
    const matchingTasks = tasks
      .filter((task) => task.title.toLowerCase().includes(trimmedQuery))
      .slice(0, 3)
      .map(
        (task): SearchResult => ({
          type: 'TASK',
          id: task.id,
          title: task.title,
          subtitle: task.dueDate
            ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
            : task.type,
          url: `/activities`, // Navigate to activities page
        })
      );
    searchResults.push(...matchingTasks);

    // Filter notes by title or content
    const matchingNotes = notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(trimmedQuery) ||
          note.content.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 3)
      .map(
        (note): SearchResult => ({
          type: 'NOTE',
          id: note.id,
          title: note.title,
          subtitle: note.content.slice(0, 50) + (note.content.length > 50 ? '...' : ''),
          url: '/notes',
        })
      );
    searchResults.push(...matchingNotes);

    // Filter transactions by description
    const matchingTransactions = transactions
      .filter((tx) => tx.description.toLowerCase().includes(trimmedQuery))
      .slice(0, 3)
      .map(
        (tx): SearchResult => ({
          type: 'TRANSACTION',
          id: tx.id,
          title: tx.description,
          subtitle: `${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)}`,
          url: '/budget',
        })
      );
    searchResults.push(...matchingTransactions);

    // Filter static pages
    const matchingPages = STATIC_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(trimmedQuery) ||
        (page.subtitle && page.subtitle.toLowerCase().includes(trimmedQuery))
    ).slice(0, 2);
    searchResults.push(...matchingPages);

    // Return limited results
    return searchResults.slice(0, maxResults);
  }, [query, tasks, notes, transactions, maxResults]);

  return { results };
}
