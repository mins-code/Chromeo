import { useState, useEffect } from 'react';
import * as NotificationService from '../services/notificationService';
import { Task, TaskStatus, NotificationSettings } from '../types';

export const useNotificationScheduler = (
    tasks: Task[], 
    notificationSettings: NotificationSettings, 
    setNotificationSettings: (settings: NotificationSettings) => void
) => {
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
        NotificationService.getPermissionStatus()
    );

    // Schedule notifications for tasks with reminder times
    useEffect(() => {
        // Early return if notification backend is disabled
        const settings = NotificationService.getSettings();
        if (!settings.enabled) return;

        // Check for authentication before attempting to schedule notifications
        const scheduleForTasks = async () => {
            // Verify user is authenticated with valid session before making API calls
            const { supabase } = await import('../services/supabaseClient');
            const { data: { session } } = await supabase.auth.getSession();
            
            // Skip scheduling if no valid session (prevents 401 errors)
            if (!session) {
                console.debug('Skipping notification scheduling: No authenticated session');
                return;
            }

            tasks.forEach(task => {
                const reminderTime = task.reminderTime || task.dueDate;
                if (!reminderTime || task.status === TaskStatus.DONE) {
                    NotificationService.cancelNotification(`task-${task.id}`);
                    return;
                }

                // Determine if notification should be enabled for this task
                const taskNotificationEnabled = task.notificationEnabled !== undefined 
                    ? task.notificationEnabled 
                    : notificationSettings.enabled;

                if (!taskNotificationEnabled) {
                    NotificationService.cancelNotification(`task-${task.id}`);
                    return;
                }

                // Determine notification time
                let notifyTime: Date;

                if (task.notificationTime) {
                    // Use absolute notification time if set
                    notifyTime = new Date(task.notificationTime);
                } else {
                    // Fallback to relative time logic
                    const reminderTime = task.reminderTime || task.dueDate;
                    
                    // Determine lead time (task-specific or global)
                    const leadTimeMinutes = task.notificationMinutesBefore !== undefined 
                        ? task.notificationMinutesBefore 
                        : notificationSettings.reminderMinutesBefore;

                     if (reminderTime) {
                        notifyTime = new Date(new Date(reminderTime).getTime() - leadTimeMinutes * 60 * 1000);
                     } else {
                         return; // No time base available
                     }
                }
                
                const typeLabels: Record<string, string> = {
                    'TASK': '📋 Task Reminder',
                    'EVENT': '🎉 Upcoming Event',
                    'APPOINTMENT': '📅 Appointment Soon',
                    'REMINDER': '⏰ Reminder',
                };

                NotificationService.scheduleNotification(
                    `task-${task.id}`,
                    typeLabels[task.type] || 'Reminder',
                    notifyTime,
                    {
                        body: task.title,
                        taskId: task.id
                    }
                );
            });
        };

        // Run async scheduling
        scheduleForTasks();

        return () => {
            NotificationService.cancelAllNotifications();
        };
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
    const handleNotificationPreferenceChange = (key: keyof NotificationSettings, value: boolean | number) => {
        const newSettings = { ...notificationSettings, [key]: value };
        setNotificationSettings(newSettings);
        NotificationService.saveSettings(newSettings);
    };

    return {
        notificationPermission,
        handleNotificationToggle,
        handleNotificationPreferenceChange
    };
};
