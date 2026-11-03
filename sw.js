// Embergate offline cache (only used when hosted over https)
// v2: NETWORK-FIRST for the page, so a new index.html on the server is picked up on the next launch.
// Falls back to the cached copy when offline (or the network is slower than 4 s).
const CACHE = 'eg-9a842ff6cf', FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
function netFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')).then(r => { if (!done && r) { done = true; resolve(r); } return r; });
    const timer = setTimeout(fallback, 4000);
    fetch(req, { cache: 'no-store' }).then(res => {
      clearTimeout(timer);
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, cp)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(timer); fallback().then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const pn = url.pathname; const page = req.mode === 'navigate' || pn.endsWith('/') || pn.endsWith('index.html') || pn.endsWith('manifest.webmanifest') || pn.endsWith('sw.js');
  if (page) { e.respondWith(netFirst(req)); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
});
