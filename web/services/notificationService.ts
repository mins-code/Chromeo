/**
 * Notification Service
 * Handles browser/system notifications using the Web Notifications API
 */

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  budgetAlerts: boolean;
  reminderMinutesBefore: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  taskReminders: true,
  eventReminders: true,
  budgetAlerts: true,
  reminderMinutesBefore: 15,
};

const SETTINGS_KEY = 'chronodex_notification_settings';

// Store scheduled notification timeouts for cleanup
const scheduledNotifications = new Map<string, NodeJS.Timeout>();

/**
 * Check if browser supports notifications
 */
export const isSupported = (): boolean => {
  return 'Notification' in window;
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
    console.error('Error requesting notification permission:', error);
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
    console.error('Error reading notification settings:', error);
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
    console.error('Error saving notification settings:', error);
  }
};

/**
 * Send a notification immediately
 */
export const sendNotification = (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): Notification | null => {
  if (!isSupported()) return null;
  if (Notification.permission !== 'granted') return null;
  
  const settings = getSettings();
  if (!settings.enabled) return null;

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/logo-dark.jpg',
      tag: options?.tag,
      data: options?.data,
      badge: '/logo-dark.jpg',
      requireInteraction: false,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    } else {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

/**
 * Schedule a notification for a specific time
 */
export const scheduleNotification = (
  id: string,
  title: string,
  scheduledTime: Date,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): void => {
  // Cancel any existing notification with this ID
  cancelNotification(id);

  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  // Don't schedule if time has passed or is more than 24 hours away
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;

  const timeout = setTimeout(() => {
    sendNotification(title, options);
    scheduledNotifications.delete(id);
  }, delay);

  scheduledNotifications.set(id, timeout);
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = (id: string): void => {
  const timeout = scheduledNotifications.get(id);
  if (timeout) {
    clearTimeout(timeout);
    scheduledNotifications.delete(id);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = (): void => {
  scheduledNotifications.forEach((timeout) => clearTimeout(timeout));
  scheduledNotifications.clear();
};

/**
 * Send a test notification
 */
export const sendTestNotification = (): Notification | null => {
  return sendNotification('ChronoDeX Notifications Enabled! 🎉', {
    body: 'You will now receive reminders for your tasks, events, and budget alerts.',
    tag: 'test-notification',
  });
};

/**
 * Schedule task reminder notification
 */
export const scheduleTaskReminder = (
  taskId: string,
  title: string,
  reminderTime: Date,
  taskType: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER',
  onClickNavigate?: () => void
): void => {
  const settings = getSettings();
  
  // Check if this type of notification is enabled
  if (!settings.enabled) return;
  if (taskType === 'TASK' && !settings.taskReminders) return;
  if ((taskType === 'EVENT' || taskType === 'APPOINTMENT') && !settings.eventReminders) return;
  if (taskType === 'REMINDER' && !settings.taskReminders) return;

  // Calculate notification time (subtract lead time)
  const notifyTime = new Date(reminderTime.getTime() - settings.reminderMinutesBefore * 60 * 1000);

  const typeLabels: Record<string, string> = {
    'TASK': '📋 Task Reminder',
    'EVENT': '🎉 Upcoming Event',
    'APPOINTMENT': '📅 Appointment Soon',
    'REMINDER': '⏰ Reminder',
  };

  scheduleNotification(
    `task-${taskId}`,
    typeLabels[taskType] || 'Reminder',
    notifyTime,
    {
      body: title,
      tag: `task-${taskId}`,
      onClick: onClickNavigate,
    }
  );
};

/**
 * Send budget alert notification
 */
export const sendBudgetAlert = (
  alertType: 'low_budget' | 'recurring_due',
  details: {
    amount?: number;
    description?: string;
    remaining?: number;
  }
): Notification | null => {
  const settings = getSettings();
  if (!settings.enabled || !settings.budgetAlerts) return null;

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

  return null;
};
