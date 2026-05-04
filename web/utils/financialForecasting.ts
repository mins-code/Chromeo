/**
 * Financial Forecasting Utility
 * 
 * Projects budget balance over time based on recurring transactions.
 */

import { RecurringTransaction } from '../types';

/**
 * Represents a single data point in the forecast projection.
 */
export interface ForecastDataPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Projected balance on this date */
  balance: number;
  /** Comma-separated list of transactions occurring on this date */
  label: string;
}

interface ParsedTransaction {
  transaction: RecurringTransaction;
  nextDue: Date;
  nextDueDay: number;
  nextDueDayOfWeek: number;
  nextDueMonth: number;
}

/**
 * Checks if a recurring transaction falls on a specific date based on its frequency.
 * 
 * @param parsed - The pre-parsed transaction to check
 * @param checkDate - The date to check against
 * @param checkDay - The day of the month of the check date
 * @param checkDayOfWeek - The day of the week of the check date
 * @param checkMonth - The month of the check date
 * @param checkYear - The year of the check date
 * @param lastDayOfMonth - The last day of the month for the check date
 * @returns true if the transaction occurs on checkDate
 */
function isTransactionDue(
  parsed: ParsedTransaction,
  checkDate: Date,
  checkDay: number,
  checkDayOfWeek: number,
  checkMonth: number,
  checkYear: number,
  lastDayOfMonth: number
): boolean {
  const { transaction, nextDue, nextDueDay, nextDueDayOfWeek, nextDueMonth } = parsed;
  
  // The transaction must be active (nextDueDate should be on or before the checkDate for daily/weekly/monthly)
  // But we need to calculate if the recurrence pattern falls on checkDate
  
  switch (transaction.frequency) {
    case 'daily':
      // Daily transactions occur every day, starting from nextDueDate
      return checkDate >= nextDue;
      
    case 'weekly':
      // Weekly transactions occur on the same day of week as nextDueDate
      if (checkDate < nextDue) return false;
      return checkDayOfWeek === nextDueDayOfWeek;
      
    case 'monthly': {
      // Monthly transactions occur on the same day of month
      if (checkDate < nextDue) return false;
      // Handle month-end edge case (e.g., 31st doesn't exist in all months)
      const targetDay = Math.min(nextDueDay, lastDayOfMonth);
      return checkDay === targetDay;
    }
    case 'yearly':
      // Yearly transactions occur on the same month and day
      if (checkDate < nextDue) return false;
      // Handle Feb 29 edge case
      if (nextDueMonth === 1 && nextDueDay === 29) {
        // Leap year check for Feb 29
        const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear(checkYear)) {
          // On non-leap years, treat Feb 29 as Feb 28
          return checkMonth === 1 && checkDay === 28;
        }
      }
      return checkMonth === nextDueMonth && checkDay === nextDueDay;
      
    default:
      return false;
  }
}

/**
 * Calculates a 30-day (or custom) forecast of budget balance based on recurring transactions.
 * 
 * @param currentBalance - The starting balance (usually remaining budget)
 * @param recurring - Array of recurring transactions
 * @param startDate - The date to start the projection from
 * @param daysToProject - Number of days to project (default: 30)
 * @returns Array of ForecastDataPoint representing daily balance projections
 * 
 * @example
 * ```typescript
 * const forecast = calculateForecast(5000, recurringTransactions, new Date(), 30);
 * // Returns 30 data points showing projected balance each day
 * ```
 */
export function calculateForecast(
  currentBalance: number,
  recurring: RecurringTransaction[],
  startDate: Date,
  daysToProject: number = 30
): ForecastDataPoint[] {
  const results: ForecastDataPoint[] = [];
  let runningBalance = currentBalance;
  
  // Normalize startDate to midnight to avoid time-related issues
  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);
  
  // Pre-parse transaction dates to avoid Date instantiation in the inner loop
  const parsedRecurring: ParsedTransaction[] = recurring.map(t => {
    const nextDue = new Date(t.nextDueDate);
    nextDue.setHours(0, 0, 0, 0); // Normalize to midnight to fix checkDate >= nextDue
    return {
      transaction: t,
      nextDue,
      nextDueDay: nextDue.getDate(),
      nextDueDayOfWeek: nextDue.getDay(),
      nextDueMonth: nextDue.getMonth()
    };
  });

  for (let i = 0; i < daysToProject; i++) {
    const checkDate = new Date(normalizedStart);
    checkDate.setDate(normalizedStart.getDate() + i);
    
    const checkDay = checkDate.getDate();
    const checkDayOfWeek = checkDate.getDay();
    const checkMonth = checkDate.getMonth();
    const checkYear = checkDate.getFullYear();
    const lastDayOfMonth = new Date(checkYear, checkMonth + 1, 0).getDate();

    // Find all recurring transactions due on this date
    const dueTransactions: RecurringTransaction[] = [];
    
    for (const parsed of parsedRecurring) {
      if (isTransactionDue(parsed, checkDate, checkDay, checkDayOfWeek, checkMonth, checkYear, lastDayOfMonth)) {
        dueTransactions.push(parsed.transaction);
        
        // Update running balance
        if (parsed.transaction.type === 'income') {
          runningBalance += parsed.transaction.amount;
        } else {
          runningBalance -= parsed.transaction.amount;
        }
      }
    }
    
    // Create label from transaction descriptions
    const label = dueTransactions.map(t => t.description).join(', ');
    
    // Format date as YYYY-MM-DD
    const dateString = checkDate.toISOString().split('T')[0];
    
    results.push({
      date: dateString,
      balance: Math.round(runningBalance * 100) / 100, // Round to 2 decimal places
      label
    });
  }
  
  return results;
}

/**
 * Formats a forecast date for display.
 * 
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Jan 15")
 */
export function formatForecastDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
