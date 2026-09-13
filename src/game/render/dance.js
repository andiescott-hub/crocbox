// The loser's dance. PLAN.md §7.2, and the reason §7.3 is cheap: the whole
// routine is one sine wave driving five numbers, so a captured performance is
// five curves replayed through this same rig rather than motion capture.
//
// [T13] The player's crocodile does exactly this when it loses. No special case.

export const DANCE_DEFAULTS = {
  tempo: 2.15, // hops per second
  hop: 1,
  lean: 1,
  arm: 1,
  head: 1
};

const BEAT_ONE = 1.45; // flat on its back, stars circling
const BEAT_TWO = 1.15; // the slow, ease-out push up onto the hind legs

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Captured dances arrive as { fps, tempo[], hop[], lean[], arm[], head[] }.
// Missing or short curves fall back to the hand-animated defaults, which is
// the §7.3 rule: a bad pose read still gets you a crocodile that dances.
function sample(curves, key, t) {
  const arr = curves && curves[key];
  if (!Array.isArray(arr) || arr.length === 0) return DANCE_DEFAULTS[key];
  const fps = curves.fps || 30;
  const i = (t * fps) % arr.length;
  const a = arr[Math.floor(i)];
  const b = arr[(Math.floor(i) + 1) % arr.length];
  const f = i - Math.floor(i);
  const v = a + (b - a) * f;
  return Number.isFinite(v) ? v : DANCE_DEFAULTS[key];
}

export function danceState(t, curves = null) {
  if (t < BEAT_ONE) {
    const k = t / BEAT_ONE;
    return {
      beat: 1,
      supine: 1,
      rise: 0,
      wobble: 0,
      stars: Math.min(1, k * 3),
      starAngle: t * 3.4,
      hop: 0,
      lean: Math.sin(t * 5) * 0.04,
      arm: 0,
      headTilt: Math.sin(t * 4.2) * 0.12,
      tongue: 0,
      hips: 0,
      tail: Math.sin(t * 3.1) * 0.2,
      crossEyes: 1
    };
  }

  if (t < BEAT_ONE + BEAT_TWO) {
    const k = (t - BEAT_ONE) / BEAT_TWO;
    const e = easeOut(k);
    // The last part of standing is the unsteady part.
    const wobble = Math.sin(k * 14) * Math.max(0, k - 0.55) * 0.6;
    return {
      beat: 2,
      supine: 1 - e,
      rise: e,
      wobble,
      stars: Math.max(0, 1 - k * 1.8),
      starAngle: t * 3.4,
      hop: 0,
      lean: wobble * 0.5,
      arm: e,
      headTilt: wobble * 0.8,
      tongue: 0,
      hips: 0,
      tail: Math.sin(t * 4) * 0.25,
      crossEyes: 1
    };
  }

  // The loop.
  const lt = t - BEAT_ONE - BEAT_TWO;
  const tempo = sample(curves, 'tempo', lt);
  const phase = lt * tempo * Math.PI * 2;
  const s = Math.sin(phase);
  const hopAmt = sample(curves, 'hop', lt);
  const leanAmt = sample(curves, 'lean', lt);
  const armAmt = sample(curves, 'arm', lt);
  const headAmt = sample(curves, 'head', lt);

  return {
    beat: 3,
    supine: 0,
    rise: 1,
    wobble: 0,
    stars: 0,
    starAngle: t * 3.4,
    // Foot to foot: the hop is the rectified sine so both feet get a beat.
    hop: Math.abs(s) * 18 * hopAmt,
    // Head tilts against the lean.
    lean: s * 0.19 * leanAmt,
    headTilt: -s * 0.26 * headAmt,
    hips: s * 0.24,
    // Front arms clamped over the underpants, jiggling half a beat behind.
    arm: armAmt,
    armJiggle: Math.sin(phase - Math.PI * 0.5) * 0.32 * armAmt,
    // Tail counter-swings.
    tail: -s * 0.42,
    // Tongue flicks on the same beat as the feet.
    tongue: Math.max(0, Math.sin(phase * 2)),
    crossEyes: 1,
    phase
  };
}

// The winner gets a simpler bounce. PLAN.md §7.3: ship the win screen with a
// hand-animated dance, add camera capture as an upgrade on top of it.
export function victoryState(t, curves = null) {
  const tempo = sample(curves, 'tempo', t);
  const phase = t * tempo * Math.PI * 2;
  const s = Math.sin(phase);
  return {
    beat: 3,
    supine: 0,
    rise: 1,
    wobble: 0,
    stars: 0,
    starAngle: 0,
    hop: Math.abs(s) * 14 * sample(curves, 'hop', t),
    lean: s * 0.1 * sample(curves, 'lean', t),
    headTilt: s * 0.14 * sample(curves, 'head', t),
    hips: s * 0.14,
    arm: sample(curves, 'arm', t),
    armJiggle: Math.sin(phase - Math.PI * 0.5) * 0.5,
    tail: -s * 0.3,
    tongue: Math.max(0, Math.sin(phase * 2)),
    crossEyes: 0,
    phase,
    triumphant: true
  };
}
