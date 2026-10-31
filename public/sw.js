const CACHE_NAME = 'buildbuds-notifications-v1';

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
    body: 'New message in Build Buds Community Hub',
    channelId: 'general-chat',
    tag: 'buildbuds-msg',
    icon: '/assets/aistudio/images/aurora logo (1).png',
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
      icon: payload.icon || '/assets/aistudio/images/aurora logo (1).png',
      badge: '/assets/aistudio/images/aurora logo (1).png',
      tag: payload.tag || `buildbuds-${Date.now()}`,
      data: {
        channelId: payload.channelId || 'general-chat',
        url: self.registration.scope,
      },
    })
  );
});

// Handle clicking a browser notification: focus the Build Buds tab and switch to the target channel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetChannelId = event.notification.data?.channelId || 'general-chat';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'BUILDBUDS_NOTIFICATION_CLICK',
              channelId: targetChannelId,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(`/?channel=${encodeURIComponent(targetChannelId)}`);
        }
        return undefined;
      })
  );
});
