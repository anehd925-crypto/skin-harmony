// BeautyLens Service Worker
// 푸시 알림 수신 및 클릭 처리

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BeautyLens', body: event.data.text() };
  }

  const title = payload.title || 'BeautyLens';
  const options = {
    body: payload.body || '새로운 알림이 있습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'beautylens-notification',
    data: {
      url: payload.url || '/',
      productId: payload.productId || null,
    },
    actions: [
      { action: 'open', title: '확인하기' },
      { action: 'dismiss', title: '닫기' },
    ],
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // 없으면 새 탭 열기
      return clients.openWindow(targetUrl);
    })
  );
});

// 백그라운드 동기화 (선택적)
self.addEventListener('notificationclose', () => {
  // 알림 닫힘 이벤트 — 필요 시 분석 용도로 활용 가능
});
