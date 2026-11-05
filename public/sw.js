const CACHE_NAME = 'buildbuds-notifications-v2';
const BRAND_ICON = '/assets/aistudio/images/aurora-logo.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Web Push events when delivered from a push service
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Build Buds Community',
    body: 'New update from Build Buds',
    channelId: 'general-chat',
    actionUrl: '/community',
    tag: 'buildbuds-msg',
    icon: BRAND_ICON,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || BRAND_ICON,
      badge: BRAND_ICON,
      tag: payload.tag || `buildbuds-${Date.now()}`,
      renotify: true,
      data: {
        channelId: payload.channelId || 'general-chat',
        actionUrl: payload.actionUrl || '/community',
        url: self.registration.scope,
      },
    })
  );
});

// Handle clicking a browser notification: focus the Build Buds tab and navigate to target
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetChannelId = event.notification.data?.channelId || '';
  const targetActionUrl = event.notification.data?.actionUrl || '/community';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'BUILDBUDS_NOTIFICATION_CLICK',
              channelId: targetChannelId,
              actionUrl: targetActionUrl,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          if (targetChannelId) {
            return self.clients.openWindow(`/hub?channel=${encodeURIComponent(targetChannelId)}`);
          }
          return self.clients.openWindow(targetActionUrl);
        }
        return undefined;
      })
  );
});
