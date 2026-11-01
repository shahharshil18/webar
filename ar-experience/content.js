import * as THREE from 'three'

// What gets drawn on top of the artwork. One textured plane in marker space
// (1 unit = marker width, so the plane is 1 x ratio), three kinds of source.
//
// Visual-quality rules that matter on a live camera feed:
//  * every texture is tagged sRGB — MindAR's renderer outputs sRGB, an untagged
//    video texture comes out washed-out;
//  * media is cropped ("cover") or letterboxed ("contain") instead of stretched
//    when its aspect ratio doesn't match the artwork;
//  * content fades/scales in instead of popping;
//  * photos keep mipmaps + anisotropic filtering so they don't shimmer at an angle.

const FADE_IN_SECONDS = 0.45
const COVER_MAX_MISMATCH = 1.3   // crop up to ~23% of the media; beyond that letterbox instead
const MAX_PHOTO_PX = 2048

const TEXT_THEMES = {
  golden:   { color: '#f0c060', bg: '#1a0a00', font: 'Playfair Display',   gf: 'Playfair+Display:ital,wght@1,700' },
  midnight: { color: '#c8d8ff', bg: '#0a0f1e', font: 'Cormorant Garamond', gf: 'Cormorant+Garamond:ital,wght@1,600' },
  sakura:   { color: '#4a1530', bg: '#ffd6e7', font: 'DM Serif Display',   gf: 'DM+Serif+Display:ital@1' },
  forest:   { color: '#c8f5c8', bg: '#1a3a1a', font: 'Libre Baskerville',  gf: 'Libre+Baskerville:ital,wght@1,700' },
}

const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const wait = ms => new Promise(r => setTimeout(r, ms))

export async function createContent({ renderer, exp, media, onSoundBlocked = () => {} }) {
  let source
  if (media.kind === 'video') source = videoSource(media.video, onSoundBlocked)
  else if (media.kind === 'photo' && (await media.ready)) source = photoSource(media.image, renderer)
  else source = await textSource(exp)

  const material = new THREE.MeshBasicMaterial({
    map: source.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  const group = new THREE.Group()   // scaled for the pop-in, so the mesh keeps its fitted size
  group.add(mesh)

  let ratio = parseFloat(exp.marker_aspect_ratio) || 1
  let shown = false
  let elapsed = 0

  function layout(newRatio) {
    if (newRatio > 0) ratio = newRatio
    source.relayout?.(ratio)
    fitMedia(mesh, source.texture, source.aspect(), ratio)
  }
  layout(ratio)
  source.onMetadata?.(() => layout(ratio))
  if (!source.texture.isVideoTexture) renderer.initTexture(source.texture)   // upload before it is needed

  return {
    object: group,
    layout,
    show() {
      shown = true; elapsed = 0
      group.visible = true
      source.play?.()
    },
    hide() {
      shown = false
      material.opacity = 0
      source.pause?.()
    },
    update(dt) {
      if (!shown) return
      // Don't fade in over a black frame: wait until the media actually has pixels.
      if (!source.ready()) return
      elapsed += dt
      const k = easeOutCubic(Math.min(1, elapsed / FADE_IN_SECONDS))
      material.opacity = k
      const s = 0.94 + 0.06 * k
      group.scale.set(s, s, 1)
    },
    replay() { source.replay?.() },
    unmute() { source.unmute?.() },
    pause() { source.pause?.() },
    dispose() {
      source.dispose?.()
      source.texture.dispose()
      material.dispose()
      mesh.geometry.dispose()
    },
  }
}

// ── media fitting ───────────────────────────────────────────────────────────────
// Plane is 1 wide x `ratio` tall (the artwork). Crop to cover when the media is close
// to the artwork's shape, otherwise shrink the plane to the media's own shape.
function fitMedia(mesh, texture, srcAspect, ratio) {
  const planeAspect = 1 / ratio
  const mismatch = Math.max(srcAspect, planeAspect) / Math.min(srcAspect, planeAspect)
  texture.repeat.set(1, 1)
  texture.offset.set(0, 0)
  mesh.scale.set(1, ratio, 1)

  if (mismatch <= COVER_MAX_MISMATCH) {
    if (srcAspect > planeAspect) {          // media wider than the artwork: crop the sides
      texture.repeat.x = planeAspect / srcAspect
      texture.offset.x = (1 - texture.repeat.x) / 2
    } else {                                // media taller: crop top and bottom
      texture.repeat.y = srcAspect / planeAspect
      texture.offset.y = (1 - texture.repeat.y) / 2
    }
  } else if (srcAspect > planeAspect) {
    mesh.scale.set(1, 1 / srcAspect, 1)
  } else {
    mesh.scale.set(ratio * srcAspect, ratio, 1)
  }
}

// ── video ───────────────────────────────────────────────────────────────────────
function videoSource(video, onSoundBlocked) {
  // three r147 uploads a new frame only when the decoder produced one
  // (requestVideoFrameCallback), not on every render.
  const texture = new THREE.VideoTexture(video)
  texture.encoding = THREE.sRGBEncoding
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  return {
    texture,
    aspect: () => (video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9),
    onMetadata: cb => video.addEventListener('loadedmetadata', cb, { once: true }),
    ready: () => video.readyState >= 2,
    async play() {
      video.muted = false
      try { await video.play(); onSoundBlocked(false) }
      catch {
        // Browser refused sound without a fresh gesture: play silently and offer a button.
        video.muted = true
        try { await video.play() } catch {}
        onSoundBlocked(true)
      }
    },
    pause() { video.pause() },
    replay() { video.currentTime = 0; video.muted = false; video.play().catch(() => {}) },
    unmute() { video.muted = false; onSoundBlocked(false) },
  }
}

// ── photo ───────────────────────────────────────────────────────────────────────
function photoSource(image, renderer) {
  // Cap texture size: a 12 MP photo is ~48 MB of GPU memory for no visible gain here.
  const scale = Math.min(1, MAX_PHOTO_PX / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.encoding = THREE.sRGBEncoding
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  return { texture, aspect: () => canvas.width / canvas.height, ready: () => true }
}

// ── text ────────────────────────────────────────────────────────────────────────
async function textSource(exp) {
  const theme = TEXT_THEMES[exp.template_id] || TEXT_THEMES.golden
  const message = exp.text_message || 'A gift for you ✦'
  await ensureFont(theme)

  const canvas = document.createElement('canvas')
  const texture = new THREE.CanvasTexture(canvas)
  texture.encoding = THREE.sRGBEncoding
  texture.anisotropy = 4

  const draw = ratio => {
    const W = 1024
    const H = Math.max(256, Math.min(2048, Math.round(W * ratio)))
    canvas.width = W; canvas.height = H
    drawMessage(canvas.getContext('2d'), W, H, message, theme)
    texture.needsUpdate = true
  }
  draw(parseFloat(exp.marker_aspect_ratio) || 1)

  // The canvas is redrawn at the artwork's exact shape, so it always fits 1:1.
  return { texture, aspect: () => canvas.width / canvas.height, ready: () => true, relayout: draw }
}

function drawMessage(ctx, W, H, message, theme) {
  ctx.globalAlpha = 0.94
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1

  const maxWidth = W * 0.78
  let size = W * 0.1, lines = []
  for (; size >= W * 0.04; size -= 2) {
    ctx.font = `italic 700 ${size}px "${theme.font}", Georgia, serif`
    lines = wrapLines(ctx, message, maxWidth)
    if (lines.length * size * 1.25 <= H * 0.68) break
  }

  const lineHeight = size * 1.25
  const top = H / 2 - ((lines.length - 1) * lineHeight) / 2
  ctx.fillStyle = theme.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * lineHeight))

  // thin accent rules above and below the block
  ctx.globalAlpha = 0.35
  ctx.fillRect(W * 0.38, top - lineHeight * 0.95, W * 0.24, 2)
  ctx.fillRect(W * 0.38, top + (lines.length - 1) * lineHeight + lineHeight * 0.95, W * 0.24, 2)
  ctx.globalAlpha = 1
}

function wrapLines(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word }
      else line = test
    }
    lines.push(line)
  }
  return lines
}

async function ensureFont(theme) {
  try {
    if (!document.querySelector(`link[data-font="${theme.font}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.dataset.font = theme.font
      link.href = `https://fonts.googleapis.com/css2?family=${theme.gf}&display=swap`
      const loaded = new Promise(res => { link.onload = res; link.onerror = res })
      document.head.appendChild(link)
      await Promise.race([loaded, wait(2500)])
    }
    await Promise.race([document.fonts.load(`italic 700 48px "${theme.font}"`), wait(2500)])
  } catch { /* fall back to Georgia */ }
}
