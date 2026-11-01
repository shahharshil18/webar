// One-Euro filtering (Casiez et al., CHI 2012) applied to the *decomposed* pose
// rather than MindAR's raw 4x4 matrix.
//
// MindAR's built-in filter runs on the 16 matrix elements: translation is in the
// hundreds-to-thousands, rotation terms are <= 1. A single minCF/beta pair can
// therefore never suit both — translation goes effectively unfiltered while
// rotation lags (or the reverse). Filtering position in marker-width units and
// rotation in radians gives each its own meaningful cutoff.
//
// Defaults come from a minimax search over a simulated handheld signal (rest, slow,
// walking-pace and fast motion, at three measurement-noise levels, 30 Hz updates):
// end-to-end error is ~15-25% below unfiltered and never above it. They are a safe
// starting point, not a measurement from a real device — re-tune after on-device tests.

const TWO_PI = Math.PI * 2
const alpha = (dt, cutoff) => {
  const r = TWO_PI * cutoff * dt
  return r / (r + 1)
}

export const POSE_DEFAULTS = {
  posMinCutoff: 0.6,   // Hz — smoothing at rest (lower = steadier, laggier)
  posBeta: 80,         // cutoff gain per (marker-widths / second) above the dead-zone
  rotMinCutoff: 0.6,   // Hz
  rotBeta: 80,         // cutoff gain per (radian / second) above the dead-zone
  dCutoff: 1.0,        // Hz — smoothing of the speed estimate itself
  posDeadzone: 0.15,   // marker-widths / second below which motion counts as sensor noise
  rotDeadzone: 0.12,   // radians / second, same idea for rotation
  resetGap: 0.4,       // seconds without data before the filter restarts from scratch
}

export class PoseSmoother {
  constructor(opts = {}) {
    Object.assign(this, POSE_DEFAULTS, opts)
    this.pos = [0, 0, 0]
    this.quat = [0, 0, 0, 1]
    this.speed = 0
    this.angSpeed = 0
    this.t = 0
    this.ready = false
  }

  reset() { this.ready = false }

  // pos: [x, y, z] in marker-width units, quat: unit [x, y, z, w], t: seconds.
  // Returns this (read .pos / .quat). Inputs are not modified.
  filter(pos, quat, t) {
    const dt = t - this.t
    if (!this.ready || dt <= 0 || dt > this.resetGap) {
      this.pos[0] = pos[0]; this.pos[1] = pos[1]; this.pos[2] = pos[2]
      this.quat[0] = quat[0]; this.quat[1] = quat[1]; this.quat[2] = quat[2]; this.quat[3] = quat[3]
      this.speed = 0
      this.angSpeed = 0
      this.t = t
      this.ready = true
      return this
    }
    this.t = t

    // ── position ──
    const dx = pos[0] - this.pos[0], dy = pos[1] - this.pos[1], dz = pos[2] - this.pos[2]
    const rawSpeed = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt
    this.speed += (rawSpeed - this.speed) * alpha(dt, this.dCutoff)
    const ap = alpha(dt, this.posMinCutoff + this.posBeta * Math.max(0, this.speed - this.posDeadzone))
    this.pos[0] += dx * ap; this.pos[1] += dy * ap; this.pos[2] += dz * ap

    // ── rotation ── (shortest-path slerp with an adaptive step)
    let [qx, qy, qz, qw] = quat
    const [px, py, pz, pw] = this.quat
    let dot = px * qx + py * qy + pz * qz + pw * qw
    if (dot < 0) { qx = -qx; qy = -qy; qz = -qz; qw = -qw; dot = -dot }
    const angle = 2 * Math.acos(Math.min(1, dot))
    this.angSpeed += (angle / dt - this.angSpeed) * alpha(dt, this.dCutoff)
    const ar = alpha(dt, this.rotMinCutoff + this.rotBeta * Math.max(0, this.angSpeed - this.rotDeadzone))

    // nlerp is indistinguishable from slerp at these small per-frame angles
    let rx = px + (qx - px) * ar
    let ry = py + (qy - py) * ar
    let rz = pz + (qz - pz) * ar
    let rw = pw + (qw - pw) * ar
    const len = Math.hypot(rx, ry, rz, rw) || 1
    this.quat[0] = rx / len; this.quat[1] = ry / len; this.quat[2] = rz / len; this.quat[3] = rw / len
    return this
  }
}
