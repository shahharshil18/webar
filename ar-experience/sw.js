// ARgift Service Worker — caches the heavy engine files (three.js + MindAR/TensorFlow, ~3 MB)
// so repeat visits start instantly. Versioned URLs only; the app's own files always come
// from the network so a deploy can never leave a stale mix of modules behind.
const CACHE = 'argift-sw-v2'

const PRECACHE = [
  'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/renderers/CSS3DRenderer.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/controller-mGt1s8dJ.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/ui-fBadYuor.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
]

// ── Install: fetch & cache CDN assets immediately ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})))) // one miss must not fail install
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

// ── Fetch: cache-first for versioned CDN files and fonts, network for the rest ─
self.addEventListener('fetch', event => {
  const url = event.request.url
  if (!(url.includes('cdn.jsdelivr.net') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'))) return

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
})
