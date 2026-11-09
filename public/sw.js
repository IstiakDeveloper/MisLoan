const CACHE_NAME = 'mis-loan-v7';

const offlinePage = () =>
  new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline - Mis Loan</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #334155; padding: 1rem; }
    .card { background: #fff; border-radius: 12px; padding: 2rem; max-width: 400px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #0f172a; }
    p { margin: 0 0 1.5rem; font-size: 0.875rem; color: #64748b; }
    button { background: #008030; color: #fff; border: none; padding: 0.625rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #004030; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mis Loan</h1>
    <p>You're offline or the connection was lost. Please check your network and try again.</p>
    <button type="button" onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      if (!self.registration.active) {
        return self.skipWaiting();
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

function isNavigation(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.destination === 'document');
}

// Cache only public, versioned assets. Authenticated HTML and API responses
// must never survive logout or become visible to another user of this device.
function isPublicAsset(req) {
  const url = new URL(req.url);
  return url.origin === self.location.origin &&
    (url.pathname.startsWith('/build/assets/') || url.pathname.startsWith('/icons/'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isNavigation(request)) {
    event.respondWith(fetch(request).catch(() => offlinePage()));
    return;
  }

  if (!isPublicAsset(request)) return;
  event.respondWith(
    fetch(request).then(async (response) => {
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Mis Loan', body: event.data && event.data.text() };
  }
  const title = data.title || 'Mis Loan';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url: data.url || '/login' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/login';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
