// ═══════════════════════════════════════════════════
// SERVICE WORKER — Cuidado com Amor PWA
// Versão: 1.0.0
// Responsável por: cache offline, notificações push
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'cuidado-com-amor-v1';
const CACHE_URLS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap',
];

// ── INSTALL: cacheia os arquivos essenciais ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(() => {
        // Falha silenciosa se algum recurso externo não carregar
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: serve do cache quando offline ──
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e de extensões do browser
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Só cacheia respostas válidas do mesmo domínio
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: retorna o index.html para navegação SPA
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '❤️ Cuidado com Amor';
  const options = {
    body: data.body || 'Nova atualização',
    icon: data.icon || './icon-192.png',
    badge: './icon-96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── CLIQUE NA NOTIFICAÇÃO ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (para ações feitas offline) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-logs') {
    // Quando voltar a internet, dispara evento para a página sincronizar
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_READY' }));
      })
    );
  }
});
