/// <reference lib="webworker" />

/**
 * Custom Service Worker for ChronoDeX
 * Handles push notifications and background sync
 */

declare const self: ServiceWorkerGlobalScope;

// Listen for push events (notifications from server)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options: NotificationOptions = {
      body: data.body || '',
      icon: data.icon || '/logo-dark.jpg',
      badge: data.badge || '/logo-dark.jpg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      tag: data.tag || `notification-${Date.now()}`,
      requireInteraction: true, // Keep notification visible until user interacts
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ChronoDeX', options)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('ChronoDeX', {
        body: event.data?.text() || 'You have a new notification',
        icon: '/logo-dark.jpg',
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/activities';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to the right page
            if (client.url !== urlToOpen) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // If not open, open new window
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Handle subscription change (e.g., browser regenerated subscription)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  // Re-subscribe with new subscription
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: (self as any).VAPID_PUBLIC_KEY // Set during registration
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    })
  );
});

// Periodic background sync for checking notifications (if supported)
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'check-notifications') {
    console.log('[SW] Periodic sync: checking notifications');
    // This could fetch due notifications from server
  }
});

console.log('[SW] ChronoDeX Push Service Worker loaded');
