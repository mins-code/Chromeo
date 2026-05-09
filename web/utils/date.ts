/**
 * Date Utilities
 * 
 * Centralized date handling to ensure consistent formatting across the app
 * and proper UTC ↔ Local Time conversion.
 * 
 * All database dates are stored as ISO 8601 strings in UTC.
 * All user-facing dates should be displayed in the user's local timezone.
 */

// ============================================================================
// Core Conversion Functions
// ============================================================================

/**
 * Parses a date input (string or Date) into a Date object.
 * Handles ISO strings from the database (UTC) correctly.
 */
export const parseDate = (date: string | Date | number): Date => {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  return new Date(date);
};

/**
 * Converts a Date to ISO 8601 string for database storage.
 * Always returns UTC time.
 */
export const toIsoString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Gets the current date/time as an ISO string (for database writes).
 */
export const nowIso = (): string => {
  return new Date().toISOString();
};

// ============================================================================
// Formatting Functions (Local Timezone)
// ============================================================================

const shortFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const weekdayUSFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const numericFormatter = new Intl.DateTimeFormat();
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const time24Formatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
const longDateTimeFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Formats a date for display: "Jan 6" or "Dec 25"
 */
export const formatDateShort = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return shortFormatter.format(d);
};

/**
 * Formats a date with full month: "January 6, 2026"
 */
export const formatDateLong = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return longFormatter.format(d);
};

/**
 * Formats a date with weekday: "Monday, January 6"
 */
export const formatDateWithWeekday = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return weekdayFormatter.format(d);
};

/**
 * Formats a date with weekday (US format): "Monday, January 6"
 */
export const formatDateWithWeekdayUS = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return weekdayUSFormatter.format(d);
};

/**
 * Formats a date as "MM/DD/YYYY" or locale equivalent
 */
export const formatDateNumeric = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return numericFormatter.format(d);
};

/**
 * Formats time only: "2:30 PM"
 */
export const formatTime = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return timeFormatter.format(d);
};

/**
 * Formats time in 24-hour format: "14:30"
 */
export const formatTime24 = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return time24Formatter.format(d);
};

/**
 * Formats date and time: "Jan 6, 2:30 PM"
 */
export const formatDateTime = (date: string | Date): string => {
  const d = parseDate(date);
  return `${formatDateShort(d)}, ${formatTime(d)}`;
};

/**
 * Formats date and time with full month: "January 6, 2026 at 2:30 PM"
 */
export const formatDateTimeLong = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  return longDateTimeFormatter.format(d);
};

// ============================================================================
// Comparison Functions
// ============================================================================

/**
 * Checks if two dates are on the same calendar day (in local timezone).
 */
export const isSameDay = (d1: string | Date, d2: string | Date): boolean => {
  const date1 = parseDate(d1);
  const date2 = parseDate(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Checks if a date is today (in local timezone).
 */
export const isToday = (date: string | Date): boolean => {
  return isSameDay(date, new Date());
};

/**
 * Checks if a date is in the past (before today).
 */
export const isPast = (date: string | Date): boolean => {
  const d = parseDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

/**
 * Checks if a date is in the future (after today).
 */
export const isFuture = (date: string | Date): boolean => {
  const d = parseDate(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d > today;
};

/**
 * Checks if a date is tomorrow.
 */
export const isTomorrow = (date: string | Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
};

// ============================================================================
// Date Manipulation
// ============================================================================

/**
 * Gets the start of the day (midnight) for a date.
 */
export const startOfDay = (date: string | Date): Date => {
  const d = parseDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Gets the end of the day (23:59:59.999) for a date.
 */
export const endOfDay = (date: string | Date): Date => {
  const d = parseDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Adds days to a date.
 */
export const addDays = (date: string | Date, days: number): Date => {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Gets the date as a YYYY-MM-DD string (for database keys).
 */
export const toDateKey = (date: string | Date): string => {
  const d = parseDate(date);
  if (Number.isNaN(d.valueOf())) return 'Invalid Date';
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
};

// ============================================================================
// Relative Date Formatting
// ============================================================================

/**
 * Returns a relative date string like "Today", "Tomorrow", "Yesterday", or the formatted date.
 */
export const formatRelativeDate = (date: string | Date): string => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  
  return formatDateShort(date);
};

/**
 * Returns a human-readable relative time like "in 2 hours", "3 days ago", etc.
 */
export const formatTimeAgo = (date: string | Date): string => {
  const d = parseDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) {
    // Future dates
    const absDiffMins = Math.abs(diffMins);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    
    if (absDiffMins < 60) return `in ${absDiffMins} minute${absDiffMins === 1 ? '' : 's'}`;
    if (absDiffHours < 24) return `in ${absDiffHours} hour${absDiffHours === 1 ? '' : 's'}`;
    return `in ${absDiffDays} day${absDiffDays === 1 ? '' : 's'}`;
  }

  // Past dates
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return formatDateShort(date);
};

// ============================================================================
// Today's Date Helpers
// ============================================================================

/**
 * Gets today's date formatted for display: "Monday, January 6"
 */
export const getTodayFormatted = (): string => {
  return formatDateWithWeekdayUS(new Date());
};

/**
 * Gets today's date as a YYYY-MM-DD key.
 */
export const getTodayKey = (): string => {
  return toDateKey(new Date());
};
