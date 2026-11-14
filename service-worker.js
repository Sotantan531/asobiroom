/* PWA の最小限のキャッシュ。常にネットワークを優先し、ゲーム記録・広告はキャッシュしない。 */
const CACHE = 'asobiroom-shell-v3';
const SHELL = ['/', '/asobi-config.js', '/asobi-player.js', '/asobi-activity.js', '/asobi-community.js', '/asobi-community.css', '/asobi-theme.css', '/asobi-theme.js', '/home-dashboard.js', '/home-dashboard.css', '/manifest.webmanifest', '/icon-192.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('asobiroom-shell-') && key !== CACHE).map(key => caches.delete(key)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (!['document', 'script', 'style', 'image', 'manifest'].includes(request.destination)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // 古いHTML/CSS/JSが端末のHTTPキャッシュに残っても最新版を確認する。
      const response = await fetch(request, {
        cache: ['document', 'script', 'style'].includes(request.destination) ? 'no-cache' : 'default'
      });
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch {
      const hit = await cache.match(request);
      return hit || Response.error();
    }
  })());
});
