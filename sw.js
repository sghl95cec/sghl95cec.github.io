/* CEC Census phone app: keeps the app itself on the phone so it opens without internet.
   Patient data is never stored here; calls to the Google script always go straight to Google. */
var CACHE = 'cec-census-67963109';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {                 // newest version when online
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {                                          // saved copy when offline
    return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
  }));
});

/* 24-11-2026 (V3.3): notifications. The push carries nothing: the app asks the census (with this phone's sign-in) what to show. */
function cecCfg() { return caches.open('cec-push').then(function (c) { return c.match('./push-cfg'); }).then(function (r) { return r ? r.json() : null; }).catch(function () { return null; }); }
self.addEventListener('push', function (e) {
  e.waitUntil(cecCfg().then(function (cfg) {
    if (!cfg || !cfg.url || !cfg.token) throw new Error('no sign-in');
    return fetch(cfg.url, { method: 'POST', body: JSON.stringify({ fn: 'apiNotices', args: [cfg.token] }), cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (o) {
      var list = o && o.ok ? (typeof o.result === 'string' ? JSON.parse(o.result) : o.result) : [];
      if (!list || !list.length) return self.registration.showNotification('CEC census', { body: 'You have a new reminder. Open the census.', tag: 'cec', icon: './icon-192.png', badge: './icon-192.png' });
      return Promise.all(list.map(function (n) {
        return self.registration.showNotification(n.title || 'CEC census', { body: n.text || '', tag: n.key || n.id, renotify: true, icon: './icon-192.png', badge: './icon-192.png', data: { page: n.page || '' }, vibrate: [200, 100, 200] });
      }));
    });
  }).catch(function () { return self.registration.showNotification('CEC census', { body: 'You have a new reminder. Open the census.', tag: 'cec', icon: './icon-192.png' }); }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var page = (e.notification.data && e.notification.data.page) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { cs[i].postMessage({ cecPage: page }); return cs[i].focus(); } }
    return self.clients.openWindow('./' + (page ? '#page=' + page : ''));
  }));
});
