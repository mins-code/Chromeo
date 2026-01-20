import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const SW_VERSION = '1.2.0';

console.log(`[SW] ChronoDeX Service Worker v${SW_VERSION} loading...`);

// Store VAPID key for re-subscription
let VAPID_PUBLIC_KEY = null;

// IndexedDB configuration for offline notifications
const DB_NAME = 'chronodex-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled-notifications';

/**
 * Open IndexedDB for offline notifications
 */
const openNotificationsDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[SW] Failed to open notifications DB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
        store.createIndex('fired', 'fired', { unique: false });
      }
    };
  });
};

/**
 * Get all unfired notifications that are due
 */
const getOverdueNotifications = async () => {
  try {
    const db = await openNotificationsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const now = Date.now();
        const overdue = request.result.filter(n => 
          n.scheduledTime <= now && !n.fired
        );
        resolve(overdue);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting overdue notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as fired in IndexedDB
 */
const markNotificationAsFired = async (id) => {
  try {
    const db = await openNotificationsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const notification = getRequest.result;
        if (notification) {
          notification.fired = true;
          store.put(notification);
        }
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[SW] Error marking notification as fired:', error);
  }
};

/**
 * Check and fire any overdue offline notifications
 */
const checkOfflineNotifications = async () => {
  try {
    const overdueNotifications = await getOverdueNotifications();
    
    if (overdueNotifications.length === 0) {
      return;
    }
    
    console.log(`[SW] Found ${overdueNotifications.length} overdue offline notification(s)`);
    
    for (const notification of overdueNotifications) {
      // Show the notification
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/logo-dark.jpg',
        badge: '/logo-dark.jpg',
        tag: notification.id,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: {
          taskId: notification.taskId,
          url: notification.taskId ? `/activities` : '/',
          offlineNotification: true
        },
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
      });
      
      // Mark as fired
      await markNotificationAsFired(notification.id);
      console.log(`[SW] Fired offline notification: ${notification.title}`);
    }
  } catch (error) {
    console.error('[SW] Error checking offline notifications:', error);
  }
};

// Check for offline notifications every 30 seconds
let notificationCheckInterval = null;

const startNotificationChecker = () => {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  
  // Check immediately on start
  checkOfflineNotifications();
  
  // Then check every 30 seconds
  notificationCheckInterval = setInterval(() => {
    checkOfflineNotifications();
  }, 30000);
  
  console.log('[SW] Offline notification checker started');
};

/**
 * Push Event Handler
 * This is the core of background notifications - it's triggered by the browser
 * when a push message is received from the server, even when the app is closed.
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  // Always show a notification - this is required by the Push API
  // If we don't show a notification, the browser may revoke push permission
  const showNotification = async () => {
    let title = 'ChronoDeX';
    let options = {
      body: 'You have a new notification',
      icon: '/logo-dark.jpg',
      badge: '/logo-dark.jpg',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      renotify: true,
      silent: false,
    };

    if (event.data) {
      try {
        const data = event.data.json();
        title = data.title || title;
        options = {
          body: data.body || options.body,
          icon: data.icon || options.icon,
          badge: data.badge || options.badge,
          vibrate: [200, 100, 200],
          data: data.data || {},
          tag: data.tag || `chronodex-${Date.now()}`,
          requireInteraction: true,
          renotify: true,
          silent: false,
          actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
        };
      } catch (parseError) {
        console.error('[SW] Error parsing push data, using text fallback:', parseError);
        try {
          options.body = event.data.text() || options.body;
        } catch (textError) {
          console.error('[SW] Failed to get text from push data:', textError);
        }
      }
    }

    return self.registration.showNotification(title, options);
  };

  event.waitUntil(showNotification());
});

/**
 * Notification Click Handler
 * Opens the app when user taps on a notification
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/activities';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to the right page if not already there
            if (!client.url.includes(urlToOpen)) {
              return client.navigate(urlToOpen);
            }
            return;
          }
        }
        // If app is not open, open new window
        return self.clients.openWindow(urlToOpen);
      })
  );
});

/**
 * Notification Close Handler
 * Logs when user dismisses a notification
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

/**
 * Push Subscription Change Handler
 * Re-subscribes when browser regenerates subscription
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed, re-subscribing...');
  
  event.waitUntil(
    (async () => {
      if (!VAPID_PUBLIC_KEY) {
        console.error('[SW] Cannot re-subscribe: VAPID key not set');
        return;
      }

      try {
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
        });
        
        console.log('[SW] Re-subscribed successfully');
        
        // Notify all clients about the new subscription
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: subscription.toJSON()
          });
        });
      } catch (error) {
        console.error('[SW] Failed to re-subscribe:', error);
      }
    })()
  );
});

/**
 * Message Handler
 * Receives messages from the main app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_VAPID_KEY') {
    VAPID_PUBLIC_KEY = event.data.key;
    console.log('[SW] VAPID public key set');
  }
  
  // Check notifications on demand
  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    console.log('[SW] Received CHECK_NOTIFICATIONS message');
    checkOfflineNotifications();
  }
  
  // Respond to ping messages (useful for checking if SW is active)
  if (event.data && event.data.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', version: SW_VERSION });
  }
});

/**
 * Install Event
 * Skip waiting to activate immediately
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

/**
 * Activate Event
 * Claim all clients immediately and start notification checker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Start the offline notification checker
      startNotificationChecker();
    })()
  );
});

console.log('[SW] ChronoDeX Service Worker loaded successfully');

