/**
 * Notification Service
 * Handles Web Push Notifications for background/offline notifications
 * 
 * This service uses the Push API to deliver notifications even when:
 * - The browser tab is closed
 * - The PWA is in the background
 * - The device is locked (but powered on)
 */

import { NotificationSettings } from '../types';
import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';
import * as OfflineNotifications from './offlineNotificationService';
import { nativeNotifications } from './nativeNotificationService';

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  taskReminders: true,
  eventReminders: true,
  budgetAlerts: true,
  reminderMinutesBefore: 15,
};

const SETTINGS_KEY = 'chronodex_notification_settings';
const PUSH_SUBSCRIPTION_KEY = 'chronodex_push_subscription';

// VAPID public key - this should match your Supabase secrets
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Feature flag to disable push notification backend calls
// Set to true when the push-notification Edge Function is properly deployed and working
const PUSH_NOTIFICATIONS_BACKEND_ENABLED = true;

/**
 * Check if browser supports notifications
 */
export const isSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Check if browser supports Web Push
 */
export const isPushSupported = (): boolean => {
  return 'PushManager' in window && 'serviceWorker' in navigator;
};

/**
 * Get current notification permission status
 */
export const getPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission from user
 */
export const requestPermission = async (): Promise<boolean> => {
  if (!isSupported()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    logger.error('Error requesting notification permission', error as Error);
    return false;
  }
};

/**
 * Get notification settings from localStorage
 */
export const getSettings = (): NotificationSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    logger.error('Error reading notification settings', error as Error);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save notification settings to localStorage
 */
export const saveSettings = (settings: NotificationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('Error saving notification settings', error as Error);
  }
};

/**
 * Convert VAPID key to Uint8Array for Push API
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to Web Push notifications
 */
export const subscribeToPush = async (): Promise<boolean> => {
  // Skip if backend is disabled
  if (!PUSH_NOTIFICATIONS_BACKEND_ENABLED) {
    console.debug('Push notification backend is disabled');
    return false;
  }

  if (!isPushSupported()) {
    logger.warn('Push notifications not supported in this browser');
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    logger.error('VAPID_PUBLIC_KEY not configured');
    return false;
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('User not authenticated');
      return false;
    }

    // Check for valid session to avoid 401 errors
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logger.error('No valid session');
      return false;
    }

    // Save subscription to backend
    const { error } = await supabase.functions.invoke('push-notification', {
      body: {
        action: 'subscribe',
        userId: user.id,
        subscription: subscription.toJSON(),
      },
    });

    if (error) throw error;

    // Cache subscription locally
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription.toJSON()));
    
    logger.info('Push notification subscription successful');
    return true;
  } catch (error) {
    logger.error('Error subscribing to push notifications', error as Error);
    return false;
  }
};

/**
 * Unsubscribe from Web Push notifications
 */
export const unsubscribeFromPush = async (): Promise<boolean> => {
  // Skip if backend is disabled
  if (!PUSH_NOTIFICATIONS_BACKEND_ENABLED) return true;
  if (!isPushSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    if (user && session) {
      await supabase.functions.invoke('push-notification', {
        body: {
          action: 'unsubscribe',
          userId: user.id,
        },
      });
    }

    localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
    logger.info('Unsubscribed from push notifications');
    return true;
  } catch (error) {
    logger.error('Error unsubscribing from push', error as Error);
    return false;
  }
};

/**
 * Check if user is subscribed to push
 */
export const isPushSubscribed = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

/**
 * Send a notification immediately (via Service Worker for background support)
 */
export const sendNotification = async (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): Promise<boolean> => {
  if (!isSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  
  const settings = getSettings();
  if (!settings.enabled) return false;

  try {
    // Use Service Worker showNotification for better background support
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: options?.body,
        icon: options?.icon || '/logo-dark.jpg',
        badge: '/logo-dark.jpg',
        tag: options?.tag,
        data: options?.data,
        requireInteraction: false,
        vibrate: [100, 50, 100],
      } as any);
      return true;
    } else {
      // Fallback to regular Notification
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/logo-dark.jpg',
        tag: options?.tag,
        data: options?.data,
      });

      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      setTimeout(() => notification.close(), 10000);
      return true;
    }
  } catch (error) {
    logger.error('Error sending notification', error as Error);
    return false;
  }
};

/**
 * Schedule a notification for a specific time (via backend)
 * This works even when the app is closed!
 */
export const scheduleNotification = async (
  id: string,
  title: string,
  scheduledTime: Date,
  options?: {
    body?: string;
    taskId?: string;
  }
): Promise<boolean> => {
  const settings = getSettings();
  if (!settings.enabled) return false;

  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  // Don't schedule if time has passed
  if (delay <= 0) return false;

  // ALWAYS cache locally for offline support
  try {
    await OfflineNotifications.cacheNotification({
      id,
      taskId: options?.taskId || id,
      title,
      body: options?.body || '',
      scheduledTime: scheduledTime.getTime(),
    });
    logger.debug(`[Notifications] Cached notification locally: ${id}`);
  } catch (cacheError) {
    logger.error('[Notifications] Failed to cache notification locally', cacheError as Error);
  }

  // Skip server-side scheduling if backend is disabled
  if (!PUSH_NOTIFICATIONS_BACKEND_ENABLED) return true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // Still return true since we cached locally

    // Also check for a valid session to avoid 401 errors
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true; // Still return true since we cached locally

    // Silently fail if push notification function is not available
    // This prevents CORS errors when the function isn't deployed or configured
    const { error } = await supabase.functions.invoke('push-notification', {
      body: {
        action: 'schedule',
        userId: user.id,
        taskId: options?.taskId || id,
        notification: {
          title,
          body: options?.body,
          scheduledTime: scheduledTime.toISOString(),
        },
      },
    }).catch((err) => {
      // Suppress 401 errors (user not authenticated) - this is expected
      if (err?.message?.includes('401') || err?.status === 401) {
        return { error: null }; // Silently ignore auth errors
      }
      return { error: { message: 'Push notification service unavailable' } };
    });

    if (error) {
      // Silently log the error instead of throwing
      console.debug('Push notification scheduling skipped:', error.message);
      // Still return true since we have local cache
    }
    
    logger.debug(`Scheduled notification for ${scheduledTime.toISOString()}`);
    return true;
  } catch (error) {
    // Silently handle errors to prevent console spam
    console.debug('Error scheduling notification on server:', error);
    // Return true since we still have local cache working
    return true;
  }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (taskId: string): Promise<boolean> => {
  // Always remove from local cache
  try {
    await OfflineNotifications.removeCachedNotificationByTaskId(taskId);
    logger.debug(`[Notifications] Removed notification from local cache: ${taskId}`);
  } catch (cacheError) {
    logger.error('[Notifications] Failed to remove notification from local cache', cacheError as Error);
  }

  // Skip server-side cancellation if backend is disabled
  if (!PUSH_NOTIFICATIONS_BACKEND_ENABLED) return true;

  try {
    // Check for valid session before making API call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true; // Still return true since we cleared local cache

    const { error } = await supabase.functions.invoke('push-notification', {
      body: {
        action: 'cancel',
        taskId,
      },
    }).catch((err) => {
      // Suppress 401 errors (user not authenticated) - this is expected
      if (err?.message?.includes('401') || err?.status === 401) {
        return { error: null }; // Silently ignore auth errors
      }
      return { error: { message: 'Push notification service unavailable' } };
    });

    if (error) {
      console.debug('Push notification cancellation skipped:', error.message);
    }
    return true;
  } catch (error) {
    console.debug('Error cancelling notification on server:', error);
    return true; // Still return true since we cleared local cache
  }
};

/**
 * Cancel all scheduled notifications for a user
 */
export const cancelAllNotifications = async (): Promise<void> => {
  // Clear local cache
  try {
    await OfflineNotifications.cleanupOldNotifications();
    logger.debug('[Notifications] Cleaned up old notifications from local cache');
  } catch (error) {
    logger.error('[Notifications] Failed to cleanup local cache', error as Error);
  }
  
  // This would require a backend endpoint to delete all user's scheduled notifications
  logger.debug('Cancel all notifications - server-side not implemented for push');
};

/**
 * Send a test notification
 */
export const sendTestNotification = async (): Promise<boolean> => {
  return sendNotification('ChronoDeX Notifications Enabled! 🎉', {
    body: 'You will now receive reminders for your tasks, events, and budget alerts.',
    tag: 'test-notification',
  });
};

/**
 * Schedule task reminder notification
 */
export const scheduleTaskReminder = async (
  taskId: string,
  title: string,
  reminderTime: Date,
  taskType: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER',
  minutesBefore?: number
): Promise<void> => {
  const settings = getSettings();
  
  // Check if this type of notification is enabled
  if (!settings.enabled) return;
  if (taskType === 'TASK' && !settings.taskReminders) return;
  if ((taskType === 'EVENT' || taskType === 'APPOINTMENT') && !settings.eventReminders) return;
  if (taskType === 'REMINDER' && !settings.taskReminders) return;

  // Calculate notification time (subtract lead time)
  const leadTime = minutesBefore ?? settings.reminderMinutesBefore;
  const notifyTime = new Date(reminderTime.getTime() - leadTime * 60 * 1000);

  const typeLabels: Record<string, string> = {
    'TASK': '📋 Task Reminder',
    'EVENT': '🎉 Upcoming Event',
    'APPOINTMENT': '📅 Appointment Soon',
    'REMINDER': '⏰ Reminder',
  };

  const notificationTitle = typeLabels[taskType] || 'Reminder';

  // Use native local notifications on Android/iOS (works offline!)
  if (nativeNotifications.isNative()) {
    await nativeNotifications.scheduleLocal({
      id: taskId,
      title: notificationTitle,
      body: title,
      scheduledAt: notifyTime,
      data: { taskId, url: '/activities' },
    });
    logger.debug(`[Notifications] Scheduled native notification for ${notifyTime.toISOString()}`);
    return;
  }

  // Web Push for browsers (requires server-side scheduling)
  await scheduleNotification(
    `task-${taskId}`,
    notificationTitle,
    notifyTime,
    {
      body: title,
      taskId: taskId,
    }
  );
};

/**
 * Send budget alert notification
 */
export const sendBudgetAlert = async (
  alertType: 'low_budget' | 'recurring_due',
  details: {
    amount?: number;
    description?: string;
    remaining?: number;
  }
): Promise<boolean> => {
  const settings = getSettings();
  if (!settings.enabled || !settings.budgetAlerts) return false;

  if (alertType === 'low_budget' && details.remaining !== undefined) {
    return sendNotification('💰 Budget Alert', {
      body: `Your remaining budget is ₹${details.remaining.toLocaleString()}. Consider reviewing your expenses.`,
      tag: 'budget-alert',
    });
  }

  if (alertType === 'recurring_due' && details.description) {
    return sendNotification('🔄 Recurring Transaction Due', {
      body: `${details.description}: ₹${details.amount?.toLocaleString() || 0}`,
      tag: `recurring-${details.description}`,
    });
  }

  return false;
};

/**
 * Initialize push notifications (call on app startup)
 */
export const initializePushNotifications = async (): Promise<boolean> => {
  const settings = getSettings();
  
  // Initialize offline notification database regardless of settings
  // This ensures we can cache notifications for offline use
  try {
    await OfflineNotifications.initDB();
    logger.debug('[Notifications] Offline notification database initialized');
    
    // Cleanup old notifications
    await OfflineNotifications.cleanupOldNotifications();
    
    // Notify service worker to check for any pending notifications
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_NOTIFICATIONS'
      });
    }
  } catch (error) {
    logger.error('[Notifications] Failed to initialize offline notifications', error as Error);
  }
  
  if (!settings.enabled) return false;
  
  if (Notification.permission !== 'granted') {
    return false;
  }

  // Subscribe to push if not already
  const isSubscribed = await isPushSubscribed();
  if (!isSubscribed) {
    return subscribeToPush();
  }

  return true;
};

/**
 * Get offline notification statistics (for debugging)
 */
export const getOfflineNotificationStats = async () => {
  return OfflineNotifications.getNotificationStats();
};

/**
 * Force check for pending offline notifications
 */
export const checkPendingOfflineNotifications = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CHECK_NOTIFICATIONS'
    });
  }
};
