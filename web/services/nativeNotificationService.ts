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
  createChannel(channel: {
    id: string;
    name: string;
    importance?: number;
    description?: string;
    sound?: string;
    visibility?: number;
    vibration?: boolean;
  }): Promise<void>;
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
  /** Android notification channel ID — maps to a specific sound/importance */
  soundId?: string;
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
    // Platform detection will be done lazily on initialize or first use
    this.platform = 'web';
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
    logger.debug('[NativeNotifications] Initialize called');
    if (this.initialized) {
      logger.debug('[NativeNotifications] Already initialized');
      return true;
    }

    // Wait for platform detection
    try {
      if (!this.Capacitor) {
        logger.debug('[NativeNotifications] Detecting platform...');
        await this.detectPlatform();
      }
    } catch (e) {
      logger.error('[NativeNotifications] Platform detection failed', e as Error);
    }

    if (this.platform === 'web') {
      this.initialized = true;
      return true;
    }

    try {
      // Dynamic import Capacitor plugins
      logger.debug('[NativeNotifications] Importing LocalNotifications plugin...');
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      this.LocalNotifications = LocalNotifications;

      // Request permission for local notifications
      logger.debug('[NativeNotifications] Requesting local notification permissions...');
      const localPerm = await LocalNotifications.requestPermissions();
      logger.info(`[NativeNotifications] Local permission status: ${localPerm.display}`);
      
      if (localPerm.display !== 'granted') {
        logger.warn('[NativeNotifications] Local notification permission denied');
        return false;
      }

      // Create notification channel for Android
      if (this.platform === 'android') {
        await this.createNotificationChannel();
      }

      // Try to initialize push notifications (optional - requires Firebase)
      try {
        // NOTE: Push Notifications require google-services.json to be present in android/app/
        // Without it, calling register() crashes the app on some devices.
        // We are disabling this by default to prevent crashes for users without Firebase.
        // Uncomment the code below ONLY if you have set up Firebase.
        
        /*
        const { PushNotifications } = await import('@capacitor/push-notifications');
        this.PushNotifications = PushNotifications;

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
            logger.info('[NativeNotifications] Push notification tapped:', action as Record<string, unknown>);
            // The web view will handle navigation based on URL
          });
          
          logger.info('[NativeNotifications] Push notifications initialized successfully');
        }
        */
        logger.info('[NativeNotifications] Push notifications skipped (requires firebase config)');
      } catch (pushError) {
        // This is expected if google-services.json is missing or Firebase isn't configured
        // The app will continue to work with Local Notifications only
        logger.info('[NativeNotifications] Push notifications not available (Firebase not configured). Local notifications will work normally.');
        // Don't log as error since this is expected behavior
      }

      // Listen for local notification tap
      LocalNotifications.addListener('localNotificationActionPerformed', (action: unknown) => {
        logger.info('[NativeNotifications] Local notification tapped:', action as Record<string, unknown>);
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
   * Create the 6 Android notification channels for the hybrid sound system.
   *
   * Channel importance levels:
   *   3 = IMPORTANCE_DEFAULT (shows notification, plays sound)
   *   4 = IMPORTANCE_HIGH    (makes noise, pops on screen)
   *   5 = IMPORTANCE_MAX     (urgent, uses full-screen intent)
   *
   * The `sound_custom_os` channel has no bundled sound so the user can choose
   * their own via Android System Settings → App → Notifications.
   */
  private async createNotificationChannel(): Promise<void> {
    if (!this.LocalNotifications) return;
    try {
      const channels: Parameters<LocalNotificationsPlugin['createChannel']>[0][] = [
        {
          id: 'sound_default',
          name: 'Default Sound',
          importance: 3,
          vibration: true,
        },
        {
          id: 'sound_chime',
          name: 'Chime',
          importance: 4,
          sound: 'chime.mp3',
          vibration: true,
        },
        {
          id: 'sound_beep',
          name: 'Digital Beep',
          importance: 4,
          sound: 'beep.mp3',
          vibration: true,
        },
        {
          id: 'sound_synth',
          name: 'Synth',
          importance: 4,
          sound: 'synth.mp3',
          vibration: true,
        },
        {
          id: 'sound_alarm',
          name: 'Loud Alarm',
          importance: 5,
          sound: 'alarm.mp3',
          visibility: 1,
          vibration: true,
        },
        {
          id: 'sound_custom_os',
          name: 'Custom OS Alert',
          importance: 5,
          description: 'Change this sound in your phone settings to customize it.',
          vibration: true,
        },
      ];

      for (const channel of channels) {
        await this.LocalNotifications.createChannel(channel);
        logger.debug(`[NativeNotifications] Created channel: ${channel.id}`);
      }

      logger.info('[NativeNotifications] All 6 notification channels created');
    } catch (error) {
      logger.error('[NativeNotifications] Failed to create notification channels', error as Error);
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
          // Use the task-specific channel (sound). Falls back to 'sound_default'
          // which maps to the standard device notification sound.
          channelId: notification.soundId || 'sound_default',
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
