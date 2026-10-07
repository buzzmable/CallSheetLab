// Call Sheet Lab offline helper.
// Bump VERSION whenever you upload a new index.html so phones and installed copies pick it up.
const VERSION = 'csl-v38';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2',
  './fonts/inter-latin-700-normal.woff2', './fonts/inter-latin-800-normal.woff2', './fonts/ibm-plex-mono-latin-500-normal.woff2',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Everything the app needs is on this site; leave any other request alone.
  if (new URL(req.url).origin !== self.location.origin) return;
  // The page itself: try the network first so updates show up, fall back to the saved copy offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(res => {
      const u = new URL(req.url);
      const isShell = u.pathname === new URL('./', self.registration.scope).pathname || u.pathname.endsWith('/index.html');
      // only a good copy of the app itself replaces the offline copy (never a 404 page)
      if (res.ok && isShell) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else (icons, fonts, PDF tools): saved copy first, then network, and remember what we fetched.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req).then(r => r || Response.error()))));
});
