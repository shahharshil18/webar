import { prefetchMedia } from './media.js'

// Boot flow, in the order things become possible:
//   1. no ?pid=            → plain landing screen, camera never touched
//   2. kick off the engine download + experience lookup in parallel
//   3. show the tap-to-start screen as soon as the record is known; media and the
//      tracking file keep downloading behind it
//   4. on tap (a user gesture): unlock media audio, start the camera + tracker

const { url: SUPABASE_URL, key: SUPABASE_KEY } = window.__ARGIFT__ || {}
const $ = id => document.getElementById(id)

const SCREENS = ['loading-screen', 'start-screen', 'nolink-screen', 'error-screen']
const showScreen = name => SCREENS.forEach(id => { $(id).hidden = id !== name })

function showError(message) {
  $('error-message').textContent = message
  $('scan-hint').hidden = true
  $('cta-bar').classList.remove('visible')
  showScreen('error-screen')
}

// ── Service worker: caches the engine CDN files so repeat visits skip ~3 MB ──────
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})

// ── Tracking-file cache (IndexedDB) ─────────────────────────────────────────────
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('argift-v1', 1)
    r.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('mind')) db.createObjectStore('mind')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    r.onsuccess = e => res(e.target.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbGet(store, key) {
  const db = await idbOpen()
  return new Promise((res, rej) => {
    const r = db.transaction(store, 'readonly').objectStore(store).get(key)
    r.onsuccess = e => res(e.target.result ?? null)
    r.onerror = () => rej(r.error)
  })
}
async function idbSet(store, key, val) {
  const db = await idbOpen()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(val, key)
    tx.oncomplete = res
    tx.onerror = () => rej(tx.error)
  })
}

// Remote .mind → local blob URL, cache-first.
async function loadMindBlob(url) {
  if (!url) throw new Error('No marker file configured.')
  const make = buf => URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }))
  const cached = await idbGet('mind', url).catch(() => null)
  if (cached) return make(cached)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not load the tracking data for this gift.')
  const buf = await res.arrayBuffer()
  idbSet('mind', url, buf).catch(() => {})   // write-behind
  return make(buf)
}

async function fetchExperience(pid) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?product_id=eq.${encodeURIComponent(pid)}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: ctrl.signal })
    if (!r.ok) throw new Error('Failed to fetch experience')
    const rows = await r.json()
    if (!rows.length) throw new Error('No AR experience found for this product.')
    return rows[0]
  } catch (e) {
    throw e.name === 'AbortError' ? new Error('The connection timed out. Check your signal and try again.') : e
  } finally {
    clearTimeout(timer)
  }
}

// ── UI wiring ───────────────────────────────────────────────────────────────────
let engine = null

function showScanning() {
  $('scan-hint').hidden = false
  $('cta-bar').classList.remove('visible')
}

function wireExperience(exp) {
  const handlers = {
    onFound() {
      performance.mark('argift:found')
      $('scan-hint').hidden = true
      navigator.vibrate?.(20)
      const cta = $('btn-cta')
      if (exp.cta_label && exp.cta_url) {
        cta.textContent = exp.cta_label
        cta.hidden = false
        cta.onclick = () => window.open(exp.cta_url, '_blank', 'noopener')
      } else {
        cta.hidden = true
      }
      $('cta-bar').classList.add('visible')
    },
    onLost: showScanning,
    onSoundBlocked(blocked) { $('sound-chip').hidden = !blocked },
  }

  $('sound-chip').onclick = () => engine?.unmute()
  $('btn-replay').onclick = () => engine?.replay()
  $('btn-share').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'ARgift', url: location.href }) } catch {} }
    else { await navigator.clipboard?.writeText(location.href).catch(() => {}); alert('Link copied!') }
  }
  return handlers
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('__') || !SUPABASE_URL.startsWith('https://')) {
    return showError('Config error: VITE_SUPABASE_URL is missing. Set it in Vercel → Settings → Environment Variables, then redeploy.')
  }
  if (!(HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'))) {
    return showError('This browser is too old for AR. Please update Chrome (Android) or Safari (iOS 16.4+).')
  }

  const params = new URLSearchParams(location.search)
  const pid = params.get('pid') || params.get('id')
  if (!pid) return showScreen('nolink-screen')

  // Start the heavy download (three.js + MindAR, ~3 MB) now, in parallel with the lookup.
  const enginePromise = import('./engine.js')
  enginePromise.catch(() => {})

  $('loading-status').textContent = 'Opening your experience…'
  let exp
  try { exp = await fetchExperience(pid) }
  catch (e) { return showError(e.message) }

  // Everything below keeps downloading while the user reads the start screen.
  const mindPromise = loadMindBlob(exp.marker_url)
  const media = prefetchMedia(exp)
  const handlers = wireExperience(exp)

  // Build everything that does not need the camera — renderer, scene, textures, shader
  // compilation — while the user reads the start screen. The tap only has to open the
  // camera and start the tracker.
  const preparedPromise = Promise.all([enginePromise, mindPromise]).then(([{ createEngine }, mindUrl]) =>
    createEngine({ container: $('ar-container'), mindUrl, exp, media, handlers }))
  preparedPromise.catch(e => { console.error(e); showError(e.message || 'Failed to prepare the AR experience.') })

  showScreen('start-screen')

  $('btn-start').addEventListener('click', async () => {
    performance.mark('argift:tap')
    $('btn-start').disabled = true
    media.unlock()                 // must happen inside this tap
    $('loading-status').textContent = 'Starting camera…'
    showScreen('loading-screen')
    try {
      engine = await preparedPromise
      performance.mark('argift:engine-ready')
      await engine.start()
      performance.mark('argift:tracker-ready')
      showScreen(null)
      showScanning()
    } catch (e) {
      console.error(e)
      showError(e.message || 'Failed to start the AR experience.')
    }
  }, { once: true })
}

// Free the camera while the page is in the background; pick up again on return.
document.addEventListener('visibilitychange', () => {
  if (!engine) return
  if (document.hidden) engine.pause()
  else engine.resume().catch(e => showError(e.message))
})
window.addEventListener('pagehide', () => engine?.dispose())

main()
