import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { getProviderToken, signInWithGoogleCalendar } from '../services/supabaseClient';
import {
  CalendarEvent,
  listGoogleEvents,
  GoogleCalendarError,
} from '../services/googleCalendarService';
import { useAuth } from '../context/AuthContext';

export function useGoogleCalendar() {
  const { session } = useAuth();

  // Google Calendar Integration State
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('googleCalendarEnabled') === 'true';
  });
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check token availability
  useEffect(() => {
    const checkGoogleToken = async () => {
      if (session?.user && isEnabled) {
        const token = await getProviderToken();
        setHasToken(!!token);
      } else {
        setHasToken(false);
      }
    };
    checkGoogleToken();
  }, [session, isEnabled]);

  // Fetch events when enabled and token available
  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!isEnabled || !hasToken) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = await getProviderToken();
        if (!token) {
          setHasToken(false);
          return;
        }

        // Fetch events for next 3 months
        const now = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        const fetchedEvents = await listGoogleEvents(
          token,
          now.toISOString(),
          threeMonthsLater.toISOString()
        );
        setEvents(fetchedEvents);
        logger.debug('[useGoogleCalendar] Fetched events', { count: fetchedEvents.length });
      } catch (error) {
        if (error instanceof GoogleCalendarError) {
          logger.error(
            '[useGoogleCalendar] Google Calendar error',
            error.code as unknown as Error,
            { message: error.message }
          );
          if (error.code === 'UNAUTHORIZED') {
            setHasToken(false);
          }
        } else {
          logger.error('[useGoogleCalendar] Failed to fetch events', error as Error);
        }
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleEvents();
  }, [isEnabled, hasToken]);

  // Toggle handler
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('googleCalendarEnabled', String(enabled));

    if (enabled) {
      // Check if we have a token
      const token = await getProviderToken();
      if (!token) {
        // Trigger OAuth flow
        logger.debug('[useGoogleCalendar] No Google token, triggering OAuth flow');
        await signInWithGoogleCalendar();
      } else {
        setHasToken(true);
      }
    } else {
      setEvents([]);
    }
  }, []);

  return {
    isEnabled,
    hasToken,
    events,
    isLoading,
    toggleEnabled,
  };
}
