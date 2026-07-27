const CACHE = 'cuidado-v2';
const ASSETS = ['./', './index.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if(res && res.status===200 && res.type==='basic'){
      const c=res.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c));
    }
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
self.addEventListener('push', e => {
  const d = e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(d.title||'❤️ Cuidado com Amor',{
    body:d.body||'Nova atualização', vibrate:[200,100,200],
    requireInteraction: d.requireInteraction||false, tag: d.tag||'default'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cs=>{
    for(const c of cs) if('focus' in c) return c.focus();
    if(clients.openWindow) return clients.openWindow('./');
  }));
});
