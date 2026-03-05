import { useState, useEffect, useRef } from 'react';
import * as NotificationService from '../services/notificationService';
import { Task, TaskStatus, NotificationSettings } from '../types';

/**
 * Computes a hash string for the fields that determine whether a notification
 * needs to be rescheduled. Any change in these four fields will trigger a
 * reschedule for that specific task.
 */
function getTaskHash(task: Task, globalEnabled: boolean, globalLeadMinutes: number): string {
  const notifEnabled =
    task.notificationEnabled !== undefined ? task.notificationEnabled : globalEnabled;
  return [
    task.reminderTime ?? '',
    task.dueDate ?? '',
    task.notificationTime ?? '',
    task.notificationMinutesBefore ?? globalLeadMinutes,
    task.status,
    String(notifEnabled),
  ].join('|');
}

export const useNotificationScheduler = (
  tasks: Task[],
  notificationSettings: NotificationSettings,
  setNotificationSettings: (settings: NotificationSettings) => void
) => {
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(NotificationService.getPermissionStatus());

  /**
   * Tracks the last-known state of each scheduled task as taskId -> hash.
   * Persists across renders without triggering re-renders itself.
   */
  const scheduledTasksRef = useRef<Map<string, string>>(new Map());

  // Schedule/cancel notifications only for tasks that have actually changed
  useEffect(() => {
    // Early return if notification backend is disabled
    const settings = NotificationService.getSettings();
    if (!settings.enabled) return;

    const scheduleForTasks = async () => {
      // Verify user is authenticated with valid session before making API calls
      const { supabase } = await import('../services/supabaseClient');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Skip scheduling if no valid session (prevents 401 errors)
      if (!session) {
        console.debug('Skipping notification scheduling: No authenticated session');
        return;
      }

      const prevMap = scheduledTasksRef.current;
      const nextMap = new Map<string, string>();

      // --- Pass 1: Process current tasks (schedule new / changed, cancel done/disabled) ---
      for (const task of tasks) {
        const notifId = `task-${task.id}`;
        const reminderTime = task.reminderTime || task.dueDate;

        const taskNotificationEnabled =
          task.notificationEnabled !== undefined
            ? task.notificationEnabled
            : notificationSettings.enabled;

        // Determine whether this task should have an active notification
        const shouldCancel =
          !reminderTime || task.status === TaskStatus.DONE || !taskNotificationEnabled;

        if (shouldCancel) {
          // Only cancel if it was previously scheduled
          if (prevMap.has(task.id)) {
            NotificationService.cancelNotification(notifId);
          }
          // Do NOT add to nextMap — task has no active notification
          continue;
        }

        const newHash = getTaskHash(
          task,
          notificationSettings.enabled,
          notificationSettings.reminderMinutesBefore
        );

        // Skip if nothing relevant changed
        if (prevMap.get(task.id) === newHash) {
          nextMap.set(task.id, newHash);
          continue;
        }

        // Determine notification time
        let notifyTime: Date;

        if (task.notificationTime) {
          notifyTime = new Date(task.notificationTime);
        } else {
          const leadTimeMinutes =
            task.notificationMinutesBefore !== undefined
              ? task.notificationMinutesBefore
              : notificationSettings.reminderMinutesBefore;

          if (reminderTime) {
            notifyTime = new Date(Date.parse(reminderTime) - leadTimeMinutes * 60 * 1000);
          } else {
            continue; // No time base available
          }
        }

        const typeLabels: Record<string, string> = {
          TASK: '📋 Task Reminder',
          EVENT: '🎉 Upcoming Event',
          APPOINTMENT: '📅 Appointment Soon',
          REMINDER: '⏰ Reminder',
        };

        NotificationService.scheduleNotification(
          notifId,
          typeLabels[task.type] || 'Reminder',
          notifyTime,
          {
            body: task.title,
            taskId: task.id,
          }
        );

        nextMap.set(task.id, newHash);
      }

      // --- Pass 2: Cancel notifications for tasks that no longer exist in the array ---
      const currentTaskIds = new Set(tasks.map((t) => t.id));
      for (const [prevId] of prevMap) {
        if (!currentTaskIds.has(prevId)) {
          NotificationService.cancelNotification(`task-${prevId}`);
        }
      }

      // Commit the new state
      scheduledTasksRef.current = nextMap;
    };

    scheduleForTasks();

    // No cleanup — individual cancellations are handled above via diffing,
    // so a blanket cancelAllNotifications() on unmount is not needed.
  }, [tasks, notificationSettings.enabled, notificationSettings.reminderMinutesBefore]);

  // Handle notification settings toggle
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      // Request permission (will initialize native notifications on Capacitor)
      const granted = await NotificationService.requestPermission();
      setNotificationPermission(NotificationService.getPermissionStatus());
      if (!granted) return;
    }

    const newSettings = { ...notificationSettings, enabled };
    setNotificationSettings(newSettings);
    NotificationService.saveSettings(newSettings);

    if (enabled) {
      // Send test notification to confirm it works
      NotificationService.sendTestNotification();
    }
  };

  // Handle notification preference changes
  const handleNotificationPreferenceChange = (
    key: keyof NotificationSettings,
    value: boolean | number | string
  ) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    NotificationService.saveSettings(newSettings);
  };

  return {
    notificationPermission,
    handleNotificationToggle,
    handleNotificationPreferenceChange,
  };
};
