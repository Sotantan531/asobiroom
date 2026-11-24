/* Network-first PWA cache; never touches localStorage, IndexedDB or remote records. */
const CACHE = 'asobiroom-shell-v11';
const SHELL = ['/', '/asobi-config.js', '/asobi-brand.js', '/asobi-brand.css', '/asobi-player.js', '/asobi-activity.js', '/asobi-community.js', '/asobi-community.css', '/asobi-theme.css', '/asobi-theme.js', '/home-dashboard.js', '/home-dashboard.css', '/home-catalog.js', '/home-catalog.css', '/manifest.webmanifest', '/icon-192.png'];
const MAX_ENTRIES = 100;
const MAX_ITEM_BYTES = 2 * 1024 * 1024;
const excluded = path => /^\/(?:ops|share-test|sector-\d+-preview)(?:\/|$)/.test(path);
let queue = Promise.resolve();
function remember(cache, request, response) {
  const job = queue.then(async () => {
    if ((await response.clone().blob()).size > MAX_ITEM_BYTES) return;
    await cache.put(request, response);
    const keys = await cache.keys();
    const url = new URL(request.url);
    for (const key of keys) {
      const old = new URL(key.url);
      if (old.pathname === url.pathname && old.href !== url.href && (old.searchParams.has('v') || url.searchParams.has('v')) && [...old.searchParams.keys(), ...url.searchParams.keys()].every(k => k === 'v')) await cache.delete(key);
    }
    const remaining = await cache.keys();
    const removable = remaining.filter(key => !SHELL.includes(new URL(key.url).pathname) || new URL(key.url).search);
    for (let i = 0; i < remaining.length - MAX_ENTRIES && i < removable.length; i++) await cache.delete(removable[i]);
  });
  queue = job.catch(() => {});
  return queue;
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('asobiroom-shell-') && key !== CACHE).map(key => caches.delete(key)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || excluded(url.pathname)) return;
  if (!['document', 'script', 'style', 'image', 'manifest'].includes(request.destination)) return;
  if (request.headers.has('Authorization') || request.headers.has('Range')) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, {cache: ['document','script','style'].includes(request.destination) ? 'no-cache' : 'default'});
      if (response.ok && response.status === 200 && response.type === 'basic' && !response.redirected && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) {
        try { await remember(await caches.open(CACHE), request, response.clone()); } catch { /* Cache failure must not break online play. */ }
      }
      return response;
    } catch {
      try { return await (await caches.open(CACHE)).match(request) || Response.error(); } catch { return Response.error(); }
    }
  })());
});
