/**
 * Offline Notification Service
 * 
 * Caches scheduled notifications in IndexedDB so they can be fired
 * even when the device is offline. The service worker checks this cache
 * periodically and fires any overdue notifications.
 */

import { logger } from '../utils/logger';

const DB_NAME = 'chronodex-notifications';
const DB_VERSION = 2; // v2 adds the sync-queue store
const STORE_NAME = 'scheduled-notifications';
const SYNC_QUEUE_STORE = 'sync-queue';

export interface CachedNotification {
  id: string;
  taskId?: string;
  title: string;
  body: string;
  scheduledTime: number; // Unix timestamp in ms
  fired: boolean;
  createdAt: number;
  syncedAt?: number;
  type?: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER';
}

/**
 * A deferred action that was captured while offline and must be replayed
 * against the Supabase push-notification Edge Function once connectivity resumes.
 */
export interface SyncAction {
  id: string;           // uuid generated at insertion time
  action: 'schedule' | 'cancel';
  payload: any;         // exact body forwarded to supabase.functions.invoke
  timestamp: number;    // Date.now() at insertion
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB for offline notifications
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('Failed to open notifications DB', request.error as unknown as Error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      logger.debug('[OfflineNotifications] Database initialized');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // v1 → scheduled-notifications store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
        store.createIndex('fired', 'fired', { unique: false });
        store.createIndex('taskId', 'taskId', { unique: false });
        logger.debug('[OfflineNotifications] scheduled-notifications store created');
      }

      // v2 → sync-queue store for deferred Supabase actions
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        logger.debug('[OfflineNotifications] sync-queue store created');
      }
    };
  });
};

/**
 * Cache a notification for offline use
 */
export const cacheNotification = async (notification: Omit<CachedNotification, 'createdAt' | 'fired'>): Promise<void> => {
  try {
    const db = await initDB();
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const cachedNotification: CachedNotification = {
      ...notification,
      fired: false,
      createdAt: Date.now(),
    };
    
    store.put(cachedNotification);
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        logger.debug(`[OfflineNotifications] Cached notification: ${notification.id}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    
    // Notify service worker about the new notification
    notifyServiceWorker();
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to cache notification', error as Error);
  }
};

/**
 * Get all cached notifications
 */
export const getCachedNotifications = async (): Promise<CachedNotification[]> => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to get cached notifications', error as Error);
    return [];
  }
};

/**
 * Get notifications that are overdue and not yet fired
 */
export const getOverdueNotifications = async (): Promise<CachedNotification[]> => {
  try {
    const all = await getCachedNotifications();
    const now = Date.now();
    return all.filter(n => n.scheduledTime <= now && !n.fired);
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to get overdue notifications', error as Error);
    return [];
  }
};

/**
 * Get upcoming notifications (not yet due, not fired)
 */
export const getUpcomingNotifications = async (): Promise<CachedNotification[]> => {
  try {
    const all = await getCachedNotifications();
    const now = Date.now();
    return all.filter(n => n.scheduledTime > now && !n.fired);
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to get upcoming notifications', error as Error);
    return [];
  }
};

/**
 * Mark a notification as fired
 */
export const markNotificationAsFired = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.get(id);
    
    request.onsuccess = () => {
      const notification = request.result;
      if (notification) {
        notification.fired = true;
        store.put(notification);
        logger.debug(`[OfflineNotifications] Marked as fired: ${id}`);
      }
    };
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to mark notification as fired', error as Error);
  }
};

/**
 * Remove a cached notification
 */
export const removeCachedNotification = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        logger.debug(`[OfflineNotifications] Removed notification: ${id}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to remove notification', error as Error);
  }
};

/**
 * Remove notification by task ID
 */
export const removeCachedNotificationByTaskId = async (taskId: string): Promise<void> => {
  try {
    const db = await initDB();
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('taskId');
    
    const request = index.openCursor(IDBKeyRange.only(taskId));
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        logger.debug(`[OfflineNotifications] Removed notifications for task: ${taskId}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to remove notifications by task ID', error as Error);
  }
};

/**
 * Clear old fired notifications (cleanup)
 * Removes notifications that were fired more than 24 hours ago
 */
export const cleanupOldNotifications = async (): Promise<void> => {
  try {
    const all = await getCachedNotifications();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const oldNotifications = all.filter(n => 
      n.fired && n.scheduledTime < oneDayAgo
    );
    
    for (const notification of oldNotifications) {
      await removeCachedNotification(notification.id);
    }
    
    if (oldNotifications.length > 0) {
      logger.debug(`[OfflineNotifications] Cleaned up ${oldNotifications.length} old notifications`);
    }
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to cleanup old notifications', error as Error);
  }
};

/**
 * Notify service worker to check for due notifications
 */
const notifyServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CHECK_NOTIFICATIONS'
    });
  }
};

/**
 * Get notification stats for debugging
 */
export const getNotificationStats = async (): Promise<{
  total: number;
  upcoming: number;
  overdue: number;
  fired: number;
}> => {
  try {
    const all = await getCachedNotifications();
    const now = Date.now();
    
    return {
      total: all.length,
      upcoming: all.filter(n => n.scheduledTime > now && !n.fired).length,
      overdue: all.filter(n => n.scheduledTime <= now && !n.fired).length,
      fired: all.filter(n => n.fired).length,
    };
  } catch {
    return { total: 0, upcoming: 0, overdue: 0, fired: 0 };
  }
};

/**
 * Export all cached notifications (for debugging)
 */
export const exportCachedNotifications = async (): Promise<string> => {
  const notifications = await getCachedNotifications();
  return JSON.stringify(notifications, null, 2);
};

// ─── Sync Queue ──────────────────────────────────────────────────────────────

/**
 * Persist a deferred Supabase action to the sync queue.
 * Called when the device is offline or when a network-level error occurs
 * so the action is not lost and can be replayed via `flushSyncQueue`.
 */
export const addSyncAction = async (
  action: Omit<SyncAction, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    const db = await initDB();
    const record: SyncAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SYNC_QUEUE_STORE).put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        logger.debug(`[OfflineNotifications] Sync action queued: ${record.action} (${record.id})`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to queue sync action', error as Error);
  }
};

/**
 * Return all queued sync actions sorted oldest-first.
 */
export const getSyncActions = async (): Promise<SyncAction[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const request = tx.objectStore(SYNC_QUEUE_STORE).getAll();
      request.onsuccess = () => {
        const sorted = (request.result as SyncAction[]).sort(
          (a, b) => a.timestamp - b.timestamp
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to get sync actions', error as Error);
    return [];
  }
};

/**
 * Remove a successfully-replayed sync action from the queue.
 */
export const removeSyncAction = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SYNC_QUEUE_STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        logger.debug(`[OfflineNotifications] Sync action removed: ${id}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    logger.error('[OfflineNotifications] Failed to remove sync action', error as Error);
  }
};
