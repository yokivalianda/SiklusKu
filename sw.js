// ============================================================
// SiklusKu Service Worker
// Ganti versi CACHE_VERSION setiap kali ada update fitur baru
// Contoh: 'v3' → 'v4' → 'v5' dst.
// ============================================================
const CACHE_VERSION = 'v2.5'; // ← GANTI INI SETIAP UPDATE
const CACHE_NAME = `siklusku-${CACHE_VERSION}`;

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL: cache aset penting ──
self.addEventListener('install', e => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('[SW] Cache addAll failed:', err))
  );
  // Langsung aktif tanpa tunggu tab lama ditutup
  self.skipWaiting();
});

// ── ACTIVATE: hapus cache versi lama ──
self.addEventListener('activate', e => {
  console.log(`[SW] Activating ${CACHE_NAME}, removing old caches...`);
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k.startsWith('siklusku-') && k !== CACHE_NAME)
          .map(k => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      );
    }).then(() => {
      // Ambil alih semua tab yang terbuka — user langsung dapat versi baru
      return self.clients.claim();
    })
  );
});

// ── FETCH: network first untuk HTML, cache first untuk aset ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Jangan cache request ke Supabase, Google, CDN eksternal
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('fonts.gstatic.com')
  ) return;

  // Untuk file HTML: Network First (selalu coba ambil terbaru)
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Simpan versi terbaru ke cache
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Untuk aset lain (icon, manifest): Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        try {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        } catch(err) {}
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(clientList => {
      for(const client of clientList){
        if(client.url.includes(self.location.origin) && 'focus' in client){
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ── BROADCAST UPDATE ke semua tab ──
// Kirim pesan ke app bahwa ada versi baru tersedia
self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});

