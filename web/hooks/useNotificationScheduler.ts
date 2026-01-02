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

            // Determine lead time (task-specific or global)
            const leadTimeMinutes = task.notificationMinutesBefore !== undefined 
                ? task.notificationMinutesBefore 
                : notificationSettings.reminderMinutesBefore;

            // Schedule the notification with custom lead time
            const notifyTime = new Date(new Date(reminderTime).getTime() - leadTimeMinutes * 60 * 1000);
            
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

        return () => {
            NotificationService.cancelAllNotifications();
        };
    }, [tasks, notificationSettings.enabled, notificationSettings.reminderMinutesBefore]);

    // Handle notification settings toggle
    const handleNotificationToggle = async (enabled: boolean) => {
        if (enabled && notificationPermission !== 'granted') {
            const granted = await NotificationService.requestPermission();
            setNotificationPermission(NotificationService.getPermissionStatus());
            if (!granted) return;
        }

        const newSettings = { ...notificationSettings, enabled };
        setNotificationSettings(newSettings);
        NotificationService.saveSettings(newSettings);

        if (enabled) {
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
