import { useEffect } from 'react';
import { logger } from '../utils/logger';
import { nativeNotifications } from '../services/nativeNotificationService';
import * as NotificationService from '../services/notificationService';
import { Session } from '@supabase/supabase-js';
import { NotificationSettings } from '../types';

export function useSystemNotifications(session: Session | null, notificationSettings: NotificationSettings) {
    useEffect(() => {
        const initializeNotifications = async () => {
            // Initialize native notifications first (for Capacitor Android/iOS)
            // This is a no-op on web, but essential for native apps
            if (session?.user && notificationSettings.enabled) {
                await nativeNotifications.initialize();
                logger.debug('[useSystemNotifications] Native notifications initialized');
            }

            // For web: Register service worker and web push
            if ('serviceWorker' in navigator) {
                try {
                    // Register the custom service worker
                    const registration = await navigator.serviceWorker.register(
                        '/sw.js',
                        { scope: '/' }
                    );
                    
                    logger.debug('[useSystemNotifications] Service Worker registered', { registration });

                    // Wait for service worker to be ready
                    await navigator.serviceWorker.ready;

                    // Send VAPID public key to service worker for push subscription
                    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                    if (vapidKey && registration.active) {
                        registration.active.postMessage({
                            type: 'SET_VAPID_KEY',
                            key: vapidKey
                        });
                    }

                    // Initialize push notifications if enabled and user is authenticated
                    if (session?.user && notificationSettings.enabled) {
                        await NotificationService.initializePushNotifications();
                    }
                } catch (error) {
                    logger.error('[useSystemNotifications] Service Worker registration failed', error as Error);
                }
            }
        };

        initializeNotifications();
    }, [session, notificationSettings.enabled]);
}
