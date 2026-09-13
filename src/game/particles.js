// Scale shed VFX. PLAN.md §7.1 - these constants are the deliverable from the
// prototype file, not suggestions.
//
// Scales flip end over end rather than spinning flat, so the horizontal squash
// runs off cos(spin) and the two faces are lit differently.

export const VFX = {
  gravity: 0.46,
  airDrag: 0.992,
  restitution: 0.35,
  friction: 0.66, // horizontal, applied per bounce
  litFace: '#d3f07a',
  backFace: '#6f9526',
  restTime: 1.0, // seconds a landed scale sits before the glint
  glintTime: 0.35,
  fadeTime: 0.55
};

let nextId = 1;

export function spawnScales(list, { x, y, count, dir, power = 1, towardCamera = false }) {
  for (let i = 0; i < count; i += 1) {
    const spread = (Math.random() - 0.5) * 1.5;
    const speed = (2.6 + Math.random() * 3.4) * power;
    list.push({
      id: nextId++,
      x: x + (Math.random() - 0.5) * 34,
      y: y + (Math.random() - 0.5) * 40,
      // Velocities are in prototype units (per 60hz tick), matched to the
      // gravity/drag constants above.
      vx: Math.cos(spread) * speed * dir + (Math.random() - 0.5) * 1.4,
      vy: -Math.abs(Math.sin(spread + 1.1)) * speed - 2.4,
      spin: Math.random() * Math.PI * 2,
      spinRate: (Math.random() - 0.5) * 0.46,
      size: 9 + Math.random() * 5,
      // Open question 2 for Tristan: your own scales flying at the camera.
      // Wired up but off until he answers.
      depth: towardCamera ? 1 : 0,
      landed: false,
      restT: 0,
      dead: false
    });
  }
}

export function stepScales(list, dt, groundY) {
  // The prototype's constants are per-tick at 60hz, so integrate in fixed
  // 60hz substeps and let dt decide how many.
  const steps = Math.max(1, Math.min(4, Math.round(dt * 60)));
  for (let s = 0; s < steps; s += 1) {
    for (const p of list) {
      if (p.dead || p.landed) continue;
      p.vy += VFX.gravity;
      p.vx *= VFX.airDrag;
      p.vy *= VFX.airDrag;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += p.spinRate;
      if (p.depth > 0) p.size += 0.09;
      if (p.y >= groundY) {
        p.y = groundY;
        if (Math.abs(p.vy) > 1.1) {
          p.vy = -p.vy * VFX.restitution;
          p.vx *= VFX.friction;
          p.spinRate *= VFX.friction;
        } else {
          p.landed = true;
          p.vx = 0;
          p.vy = 0;
          p.spinRate = 0;
          // Landed scales settle flat-ish so the glint has something to catch.
          p.spin = Math.round(p.spin / Math.PI) * Math.PI;
        }
      }
    }
  }

  let deadCount = 0;
  for (const p of list) {
    if (p.dead) {
      deadCount += 1;
      continue;
    }
    if (p.landed) {
      p.restT += dt;
      if (p.restT > VFX.restTime + VFX.glintTime + VFX.fadeTime) {
        p.dead = true;
        deadCount += 1;
      }
    }
  }

  if (deadCount > 40) {
    for (let i = list.length - 1; i >= 0; i -= 1) if (list[i].dead) list.splice(i, 1);
  }
}

export function scaleAlpha(p) {
  if (!p.landed) return 1;
  const t = p.restT - VFX.restTime - VFX.glintTime;
  if (t <= 0) return 1;
  return Math.max(0, 1 - t / VFX.fadeTime);
}

export function scaleGlint(p) {
  if (!p.landed) return 0;
  const t = p.restT - VFX.restTime;
  if (t < 0 || t > VFX.glintTime) return 0;
  return Math.sin((t / VFX.glintTime) * Math.PI);
}
