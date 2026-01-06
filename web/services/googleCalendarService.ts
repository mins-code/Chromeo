/**
 * Google Calendar Service
 * Handles fetching and transforming events from Google Calendar API
 */

// ============ Types ============

/**
 * Represents an event from an external calendar source (Google Calendar)
 * Designed to be compatible with the Task interface for unified rendering
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO date string
  end?: string;         // ISO date string
  description?: string;
  location?: string;
  htmlLink: string;     // Direct link to view in Google Calendar
  source: 'google';     // Identifier for external source
  allDay?: boolean;     // Whether this is an all-day event
}

/** Google Calendar API response item */
interface GoogleCalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink: string;
  start: {
    dateTime?: string;  // ISO date-time for timed events
    date?: string;      // YYYY-MM-DD for all-day events
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

/** Google Calendar API response */
interface GoogleCalendarResponse {
  items?: GoogleCalendarEventItem[];
  error?: {
    code: number;
    message: string;
  };
}

// ============ Constants ============

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ============ Error Types ============

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'GoogleCalendarError';
  }
}

// ============ API Functions ============

/**
 * Fetch events from the user's primary Google Calendar within a date range.
 * 
 * @param accessToken - Google OAuth access token
 * @param timeMin - Start of date range (ISO string)
 * @param timeMax - End of date range (ISO string)
 * @returns Array of CalendarEvent objects
 * @throws GoogleCalendarError on API errors
 */
export async function listGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',       // Expand recurring events into instances
    orderBy: 'startTime',       // Sort by start time
    maxResults: '250',          // Reasonable limit for a month view
  });

  const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GoogleCalendarResponse;
      
      switch (response.status) {
        case 401:
          throw new GoogleCalendarError(
            'Google Calendar access token expired or invalid. Please re-authenticate.',
            'UNAUTHORIZED'
          );
        case 403:
          throw new GoogleCalendarError(
            'Access to Google Calendar denied. Please check permissions.',
            'FORBIDDEN'
          );
        case 404:
          throw new GoogleCalendarError(
            'Google Calendar not found.',
            'NOT_FOUND'
          );
        default:
          throw new GoogleCalendarError(
            errorData.error?.message || `Google Calendar API error: ${response.status}`,
            'UNKNOWN'
          );
      }
    }

    const data = await response.json() as GoogleCalendarResponse;
    
    if (!data.items) {
      return [];
    }

    // Transform Google Calendar events to our CalendarEvent format
    return data.items
      .filter((item): item is GoogleCalendarEventItem => !!item.start)
      .map((item): CalendarEvent => {
        const isAllDay = !!item.start.date;
        
        return {
          id: `google_${item.id}`,
          title: item.summary || '(No title)',
          start: item.start.dateTime || item.start.date || '',
          end: item.end?.dateTime || item.end?.date,
          description: item.description,
          location: item.location,
          htmlLink: item.htmlLink,
          source: 'google',
          allDay: isAllDay,
        };
      });
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new GoogleCalendarError(
      'Failed to connect to Google Calendar. Please check your internet connection.',
      'NETWORK',
      error
    );
  }
}

/**
 * Check if a CalendarEvent falls on a specific date
 */
export function doesEventOccurOnDate(event: CalendarEvent, date: Date): boolean {
  const eventStart = new Date(event.start);
  const eventEnd = event.end ? new Date(event.end) : eventStart;
  
  // Normalize dates to midnight for comparison
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  
  if (event.allDay && event.end) {
    // All-day events: end date is exclusive in Google Calendar
    const endDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
    return targetDate >= startDate && targetDate < endDate;
  }
  
  // Timed events: check if event spans the target date
  const endDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
  return targetDate >= startDate && targetDate <= endDate;
}

/**
 * Format event time for display
 */
export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  
  const startDate = new Date(event.start);
  const endDate = event.end ? new Date(event.end) : null;
  
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  
  const startTime = startDate.toLocaleTimeString([], timeOptions);
  
  if (endDate) {
    const endTime = endDate.toLocaleTimeString([], timeOptions);
    return `${startTime} - ${endTime}`;
  }
  
  return startTime;
}
