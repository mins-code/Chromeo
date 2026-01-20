/**
 * Native Notification Service
 * 
 * Provides a unified interface for notifications on both web and native platforms.
 * On web: Uses Web Push API (existing notificationService.ts)
 * On native (Android): Uses Capacitor Local Notifications for reliable background notifications
 * 
 * Local notifications work offline and don't require a server - they're scheduled
 * directly on the device, just like native apps!
 */

import { logger } from '../utils/logger';

// Type definitions for Capacitor plugins (loaded dynamically)
type LocalNotificationsPlugin = {
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: LocalNotification[] }): Promise<unknown>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
  addListener(event: string, callback: (data: unknown) => void): Promise<{ remove: () => void }>;
};

type PushNotificationsPlugin = {
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(event: string, callback: (data: unknown) => void): Promise<{ remove: () => void }>;
};

type CapacitorType = {
  isNativePlatform(): boolean;
  getPlatform(): string;
};

interface LocalNotification {
  id: number;
  title: string;
  body: string;
  schedule?: { at: Date };
  extra?: Record<string, unknown>;
  smallIcon?: string;
  largeIcon?: string;
  sound?: string;
  channelId?: string;
}

export type Platform = 'web' | 'android' | 'ios';

interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  scheduledAt?: Date;
  data?: Record<string, unknown>;
}

interface TokenData {
  value: string;
}

class NativeNotificationService {
  private platform: Platform = 'web';
  private fcmToken: string | null = null;
  private initialized = false;
  private LocalNotifications: LocalNotificationsPlugin | null = null;
  private PushNotifications: PushNotificationsPlugin | null = null;
  private Capacitor: CapacitorType | null = null;

  constructor() {
    // Platform detection is async, start with web
    this.detectPlatform();
  }

  /**
   * Detect the current platform (web, android, ios)
   */
  private async detectPlatform(): Promise<void> {
    try {
      // Dynamic import to avoid issues in web context
      const { Capacitor } = await import('@capacitor/core');
      this.Capacitor = Capacitor;
      
      if (Capacitor.isNativePlatform()) {
        this.platform = Capacitor.getPlatform() as 'android' | 'ios';
        logger.info(`[NativeNotifications] Native platform detected: ${this.platform}`);
      } else {
        this.platform = 'web';
        logger.info('[NativeNotifications] Web platform detected');
      }
    } catch (error) {
      this.platform = 'web';
      logger.debug('[NativeNotifications] Capacitor not available, defaulting to web');
    }
  }

  /**
   * Initialize notifications based on platform
   * Must be called after app startup
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Wait for platform detection
    await this.detectPlatform();

    if (this.platform === 'web') {
      this.initialized = true;
      return true;
    }

    try {
      // Dynamic import Capacitor plugins
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      this.LocalNotifications = LocalNotifications;
      this.PushNotifications = PushNotifications;

      // Request permission for local notifications
      const localPerm = await LocalNotifications.requestPermissions();
      if (localPerm.display !== 'granted') {
        logger.warn('[NativeNotifications] Local notification permission denied');
        return false;
      }

      // Create notification channel for Android
      if (this.platform === 'android') {
        await this.createNotificationChannel();
      }

      // Initialize push notifications for server-side push
      const pushPerm = await PushNotifications.requestPermissions();
      if (pushPerm.receive === 'granted') {
        await PushNotifications.register();

        // Listen for FCM token
        PushNotifications.addListener('registration', async (token: unknown) => {
          const tokenData = token as TokenData;
          this.fcmToken = tokenData.value;
          logger.info('[NativeNotifications] FCM Token received');
          await this.saveFcmToken(tokenData.value);
        });

        // Listen for push notifications when app is in foreground
        PushNotifications.addListener('pushNotificationReceived', async (notification: unknown) => {
          const notif = notification as { title?: string; body?: string; data?: Record<string, unknown> };
          logger.info('[NativeNotifications] Push received in foreground:', notif);
          
          // Show as local notification since we're in foreground
          if (this.LocalNotifications) {
            await this.LocalNotifications.schedule({
              notifications: [{
                id: Math.floor(Math.random() * 100000),
                title: notif.title || 'ChronoDeX',
                body: notif.body || '',
                schedule: { at: new Date() },
                smallIcon: 'ic_stat_icon',
                sound: 'default',
                channelId: 'chronodex-reminders',
              }],
            });
          }
        });

        // Listen for notification tap
        PushNotifications.addListener('pushNotificationActionPerformed', (action: unknown) => {
          logger.info('[NativeNotifications] Push notification tapped:', action);
          // The web view will handle navigation based on URL
        });
      }

      // Listen for local notification tap
      LocalNotifications.addListener('localNotificationActionPerformed', (action: unknown) => {
        logger.info('[NativeNotifications] Local notification tapped:', action);
      });

      this.initialized = true;
      logger.info('[NativeNotifications] Initialized successfully');
      return true;
    } catch (error) {
      logger.error('[NativeNotifications] Initialization failed', error as Error);
      return false;
    }
  }

  /**
   * Create notification channel for Android (required for Android 8+)
   */
  private async createNotificationChannel(): Promise<void> {
    try {
      // Channels are created via android configuration
      // This is a placeholder for any runtime channel creation
      logger.debug('[NativeNotifications] Using default notification channel');
    } catch (error) {
      logger.error('[NativeNotifications] Failed to create channel', error as Error);
    }
  }

  /**
   * Save FCM token to Supabase for server-side push
   */
  private async saveFcmToken(token: string): Promise<void> {
    try {
      const { supabase } = await import('./supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('[NativeNotifications] Cannot save FCM token: No user');
        return;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          platform: this.platform,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        logger.error('[NativeNotifications] Failed to save FCM token', error);
      } else {
        logger.info('[NativeNotifications] FCM token saved to Supabase');
      }
    } catch (error) {
      logger.error('[NativeNotifications] Error saving FCM token', error as Error);
    }
  }

  /**
   * Schedule a local notification
   * This is the key feature - local notifications work completely offline!
   */
  async scheduleLocal(notification: NotificationPayload): Promise<boolean> {
    if (this.platform === 'web') {
      // Web uses existing notificationService.ts
      return false;
    }

    if (!this.LocalNotifications) {
      await this.initialize();
      if (!this.LocalNotifications) {
        return false;
      }
    }

    try {
      // Generate a numeric ID from the string ID
      const numericId = this.stringToNumericId(notification.id);
      
      const scheduleAt = notification.scheduledAt || new Date();
      
      // Don't schedule if time has passed
      if (scheduleAt.getTime() <= Date.now()) {
        logger.debug(`[NativeNotifications] Skipping past notification: ${notification.title}`);
        return false;
      }

      await this.LocalNotifications.schedule({
        notifications: [{
          id: numericId,
          title: notification.title,
          body: notification.body,
          schedule: { at: scheduleAt },
          extra: notification.data,
          smallIcon: 'ic_stat_icon',
          largeIcon: 'ic_launcher',
          sound: 'default',
          channelId: 'chronodex-reminders',
        }],
      });

      logger.debug(`[NativeNotifications] Scheduled: "${notification.title}" for ${scheduleAt.toISOString()}`);
      return true;
    } catch (error) {
      logger.error('[NativeNotifications] Failed to schedule local notification', error as Error);
      return false;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancel(id: string): Promise<void> {
    if (this.platform === 'web') return;

    if (!this.LocalNotifications) {
      return;
    }

    try {
      const numericId = this.stringToNumericId(id);
      await this.LocalNotifications.cancel({ notifications: [{ id: numericId }] });
      logger.debug(`[NativeNotifications] Cancelled notification: ${id}`);
    } catch (error) {
      logger.error('[NativeNotifications] Failed to cancel notification', error as Error);
    }
  }

  /**
   * Cancel all pending notifications
   */
  async cancelAll(): Promise<void> {
    if (this.platform === 'web') return;

    if (!this.LocalNotifications) {
      return;
    }

    try {
      const pending = await this.LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await this.LocalNotifications.cancel({ notifications: pending.notifications });
        logger.debug(`[NativeNotifications] Cancelled ${pending.notifications.length} notifications`);
      }
    } catch (error) {
      logger.error('[NativeNotifications] Failed to cancel all notifications', error as Error);
    }
  }

  /**
   * Convert string ID to numeric ID for Capacitor
   */
  private stringToNumericId(id: string): number {
    // Use a hash function to convert string to number
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number and limit to safe range
    return Math.abs(hash) % 2147483647;
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return this.platform !== 'web';
  }

  /**
   * Get FCM token (for debugging)
   */
  getFcmToken(): string | null {
    return this.fcmToken;
  }
}

// Singleton instance
export const nativeNotifications = new NativeNotificationService();
