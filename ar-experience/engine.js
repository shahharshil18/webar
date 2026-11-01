import * as THREE from 'three'
import { MindARThree } from 'mindar-image-three'
import { Controller } from 'mindar-image'   // same chunk (same TensorFlow instance) — used to pre-warm the GPU
import { PoseSmoother } from './pose-filter.js'
import { createContent } from './content.js'

// MindAR (tracking) + three.js (rendering), configured the way production WebAR is:
//  * HD camera feed — MindAR asks for no resolution at all, so browsers hand back ~640x480,
//    which is why the camera looked soft. Tiered by device so weak phones aren't pushed.
//  * Pixel ratio capped — MindAR renders at devicePixelRatio (3 on most phones) with MSAA,
//    ~9x the pixels of a 1x canvas for a single textured quad.
//  * Smoothing done on the pose (see pose-filter.js); MindAR's own filter is switched to pass-through.
//  * Pause + release the camera when the page is hidden, resume when it comes back.
//  * Nothing renders while there is nothing to draw.

const TIERS = {
  high: { cam: [1280, 720], maxDpr: 2 },
  mid:  { cam: [960, 540],  maxDpr: 1.75 },
  low:  { cam: [640, 480],  maxDpr: 1.5 },
}

// ?q=low|mid|high forces a tier (handy for comparing devices).
export function pickTier(search = location.search) {
  const forced = new URLSearchParams(search).get('q')
  if (TIERS[forced]) return forced
  const memory = navigator.deviceMemory          // GB, Chromium only
  const cores = navigator.hardwareConcurrency || 4
  if ((memory && memory <= 2) || cores <= 2) return 'low'
  if ((memory && memory <= 4) || cores <= 4) return 'mid'
  return 'high'
}

// Spinning up TensorFlow's WebGL backend and compiling its kernels is the slowest part of starting the
// tracker (seconds on a phone), and none of it needs the camera. Run MindAR's own warm-up on a blank frame
// while the user is still on the start screen; the real start then finds everything cached.
async function prewarmTracker(mindUrl, [camW, camH]) {
  const [w, h] = window.innerHeight > window.innerWidth ? [Math.min(camW, camH), Math.max(camW, camH)] : [camW, camH]
  const controller = new Controller({ inputWidth: w, inputHeight: h })
  try {
    await controller.addImageTargets(mindUrl)
    const blank = document.createElement('canvas')
    blank.width = w; blank.height = h
    controller.dummyRun(blank)
  } finally {
    controller.worker.terminate()
  }
}

let lastCameraError = null
function requestCameraResolution([width, height]) {
  const md = navigator.mediaDevices
  if (!md?.getUserMedia || md.__argiftPatched) return
  const original = md.getUserMedia.bind(md)
  md.getUserMedia = async constraints => {
    try {
      if (constraints && typeof constraints.video === 'object') {
        // `max` is symmetric because some browsers apply constraints to the rotated (portrait) frame.
        constraints = {
          ...constraints,
          video: {
            width: { ideal: width, max: 1280 },
            height: { ideal: height, max: 1280 },
            frameRate: { ideal: 30, max: 30 },
            ...constraints.video,
          },
        }
      }
      return await original(constraints)
    } catch (err) {
      lastCameraError = err
      throw err
    }
  }
  md.__argiftPatched = true
}

export function describeCameraError(err = lastCameraError) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access is blocked. Allow the camera for this site in your browser settings, then reload.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again.'
    default:
      return 'The camera could not be started. Try again, or use Chrome on Android or Safari on iOS.'
  }
}

export async function createEngine({ container, mindUrl, exp, media, handlers = {} }) {
  const tierName = pickTier()
  const tier = TIERS[tierName]
  requestCameraResolution(tier.cam)

  let mindar
  try {
    mindar = new MindARThree({
      container,
      imageTargetSrc: mindUrl,
      maxTrack: 1,
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',   // we draw our own UI
      // Pass-through: an enormous cutoff makes MindAR's matrix-element filter a no-op.
      filterMinCF: 1000, filterBeta: 0,
      warmupTolerance: 4,    // frames of stable detection before "found"
      missTolerance: 10,     // frames of grace before "lost" (~0.3 s) — no flicker on brief misses
    })
  } catch (err) {
    // three.js throws here when the browser has WebGL switched off or blocklisted.
    if (/webgl/i.test(String(err?.message))) {
      throw new Error('AR needs graphics acceleration (WebGL), which is turned off in this browser. Turn on hardware acceleration in the browser settings, or open this link on your phone.')
    }
    throw err
  }
  const { renderer, scene, camera } = mindar
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.maxDpr))
  renderer.setClearColor(0x000000, 0)

  const warm = prewarmTracker(mindUrl, tier.cam).catch(err => console.warn('tracker pre-warm skipped:', err))

  const content = await createContent({ renderer, exp, media, onSoundBlocked: handlers.onSoundBlocked })

  // Content hangs off its own node (not MindAR's anchor) so we can smooth the pose it follows.
  const root = new THREE.Group()
  root.visible = false
  root.add(content.object)
  scene.add(root)

  // Compile the shader and upload static textures now, so the first frame after "found" is not a hitch.
  root.visible = true
  renderer.compile(scene, camera)
  root.visible = false

  const anchor = mindar.addAnchor(0)
  const smoother = new PoseSmoother()
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3()

  // MindAR may still deliver one in-flight frame after stop(); ignore anything that arrives while not live.
  let live = false

  anchor.onTargetFound = () => {
    if (!live) return
    smoother.reset()
    root.visible = true
    content.show()
    handlers.onFound?.()
  }
  anchor.onTargetLost = () => {
    if (!live) return
    root.visible = false
    content.hide()
    handlers.onLost?.()
  }
  anchor.onTargetUpdate = () => {
    if (!live || !anchor.visible) return
    anchor.group.matrix.decompose(pos, quat, scale)
    // Position is in the tracker's pixel-ish units; the matrix scale equals the marker width,
    // so dividing by it gives marker-width units that the smoother's thresholds are written in.
    const unit = scale.x || 1
    const f = smoother.filter([pos.x / unit, pos.y / unit, pos.z / unit], [quat.x, quat.y, quat.z, quat.w], performance.now() / 1000)
    root.position.set(f.pos[0] * unit, f.pos[1] * unit, f.pos[2] * unit)
    root.quaternion.set(f.quat[0], f.quat[1], f.quat[2], f.quat[3])
    root.scale.copy(scale)
  }

  let state = 'idle'            // idle → running ⇄ paused
  let needsClear = false
  let last = performance.now()
  const tick = now => {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (root.visible) {
      content.update(dt)
      renderer.render(scene, camera)
      needsClear = true
    } else if (needsClear) {          // one last render to wipe the canvas, then stay idle
      renderer.render(scene, camera)
      needsClear = false
    }
  }

  async function begin() {
    await warm   // no-op once settled; avoids compiling the same kernels twice if the tap came early
    anchor.visible = false   // so the next detection fires onTargetFound again after a resume
    live = true
    try { await mindar.start() } catch (err) {
      live = false
      const e = new Error(describeCameraError(err || lastCameraError))
      e.cause = err
      throw e
    }
    state = 'running'
    // The compiled target knows its real size; trust it over the ratio stored in the database.
    const dims = mindar.controller?.markerDimensions?.[0]
    if (dims && dims[0] > 0) content.layout(dims[1] / dims[0])
    renderer.setAnimationLoop(tick)
  }

  return {
    tier: tierName,
    get camera() { return mindar.video ? { width: mindar.video.videoWidth, height: mindar.video.videoHeight } : null },
    start: begin,
    async pause() {
      if (state !== 'running') return
      state = 'paused'
      live = false
      renderer.setAnimationLoop(null)
      content.pause()
      root.visible = false
      anchor.visible = false
      mindar.stop()                   // releases the camera
      handlers.onLost?.()
    },
    async resume() { if (state === 'paused') await begin() },
    replay: () => content.replay(),
    unmute: () => content.unmute(),
    dispose() {
      live = false
      renderer.setAnimationLoop(null)
      if (state === 'running') { try { mindar.stop() } catch {} }
      state = 'idle'
      content.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      container.replaceChildren()
    },
  }
}
