// ARgift Service Worker — caches heavy CDN scripts so repeat visits are instant
const CACHE = 'argift-sw-v1'

// Pre-cache these on install (A-Frame + MindAR are ~4 MB combined)
const PRECACHE = [
  'https://cdn.jsdelivr.net/npm/aframe@1.4.2/dist/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;600&display=swap',
]

// ── Install: fetch & cache CDN assets immediately ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE).catch(() => {})) // don't fail install on network error
      .then(() => self.skipWaiting())
  )
})

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: cache-first for CDN, network-first for everything else ─────────────
self.addEventListener('fetch', event => {
  const url = event.request.url

  // Cache-first for CDN scripts and fonts (large, versioned, stable)
  if (url.includes('cdn.jsdelivr.net') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(event.request, clone)).catch(() => {})
          }
          return res
        })
      })
    )
    return
  }

  // Let all other requests (Supabase API, media, etc.) go to network normally
})
