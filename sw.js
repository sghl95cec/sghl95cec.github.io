/* CEC Code Assistant service worker: works offline. Its own cache names (cca-*), never the census's. */
var CACHE = 'cca-6f57c8ca74';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './pack/protocols.json'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('cca-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;            // the census server (POST) is never cached
  if (/version\.json$/.test(u.pathname) || u.searchParams.has('v') || u.searchParams.has('t')) {  // update checks: network first
    e.respondWith(fetch(e.request).then(function (r) {
      if (r.ok && /protocols\.json$/.test(u.pathname)) { var c2 = r.clone(); caches.open(CACHE).then(function (c) { c.put('./pack/protocols.json', c2); }); }
      return r;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(function (r) {
      if (r.ok && u.pathname.indexOf('/.well-known/') < 0) { var c2 = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, c2); }); }
      return r;
    }).catch(function () { return e.request.mode === 'navigate' ? caches.match('./index.html') : undefined; });
  }));
});
