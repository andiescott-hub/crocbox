import { ARENA, MOVES, REGEN } from '../constants.js';
import { hideColors, mix, SCALE_LIT, SCALE_BACK } from './colors.js';

// The crocodile rig. Deliberately stylised and drawn in code: PLAN.md §8 rules
// the concept renders out for anything that moves, so this is the placeholder
// that animates. Everything is posed from the fighter's own state, so one call
// covers idle, walk, scratch, box, jump bite, regenerate, hit and the dance.

const SCALE_SLOTS = 12; // along the back
const TAIL_SLOTS = 6;

// Two-bone IK for a leg. Returns the knee position.
function knee(rx, ry, fx, fy, l1, l2, bendDir) {
  const dx = fx - rx;
  const dy = fy - ry;
  const d = Math.max(0.001, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hSq = Math.max(0, l1 * l1 - a * a);
  const h = Math.sqrt(hSq);
  const ux = dx / d;
  const uy = dy / d;
  return [rx + a * ux - bendDir * h * uy, ry + a * uy + bendDir * h * ux];
}

function drawLimb(ctx, rx, ry, fx, fy, l1, l2, bendDir, color, width) {
  const [kx, ky] = knee(rx, ry, fx, fy, l1, l2, bendDir);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // Foot / claws.
  ctx.lineWidth = width * 0.62;
  ctx.beginPath();
  ctx.moveTo(fx - 4, fy);
  ctx.lineTo(fx + 15, fy);
  ctx.stroke();
}

function bodyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-74, -74);
  ctx.bezierCurveTo(-78, -104, -20, -112, 22, -104);
  ctx.bezierCurveTo(44, -100, 60, -96, 66, -84);
  ctx.bezierCurveTo(74, -70, 72, -56, 62, -46);
  ctx.bezierCurveTo(30, -32, -30, -30, -62, -40);
  ctx.bezierCurveTo(-72, -46, -72, -60, -74, -74);
  ctx.closePath();
}

// The tail's top edge, as two quadratics. The ridge scales are placed along
// this same curve so they never float off the tail.
function tailTop(swing) {
  return {
    a: [-58, -84, -104, -86 + swing * 10, -128, -58 + swing * 26],
    b: [-128, -58 + swing * 26, -172, -50 + swing * 34, -196, -34 + swing * 54]
  };
}

function quadAt([x0, y0, x1, y1, x2, y2], t) {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
}

export function tailTopPoint(swing, k) {
  const c = tailTop(swing);
  return k < 0.5 ? quadAt(c.a, k * 2) : quadAt(c.b, (k - 0.5) * 2);
}

function tailPath(ctx, swing) {
  const c = tailTop(swing);
  ctx.beginPath();
  ctx.moveTo(c.a[0], c.a[1]);
  ctx.quadraticCurveTo(c.a[2], c.a[3], c.a[4], c.a[5]);
  ctx.quadraticCurveTo(c.b[2], c.b[3], c.b[4], c.b[5]);
  ctx.quadraticCurveTo(-166, -34 + swing * 30, c.a[4] + 6, c.a[5] + 20);
  ctx.quadraticCurveTo(-100, -50 + swing * 8, -58, -44);
  ctx.closePath();
}

function headPath(ctx, jaw) {
  // Upper jaw and skull.
  ctx.beginPath();
  ctx.moveTo(24, -100);
  ctx.bezierCurveTo(64, -114, 96, -110, 108, -100);
  ctx.lineTo(178, -88);
  ctx.quadraticCurveTo(190, -85, 188, -76);
  ctx.lineTo(184, -70);
  ctx.lineTo(104, -72);
  ctx.bezierCurveTo(80, -72, 46, -74, 26, -78);
  ctx.closePath();
  return jaw;
}

function lowerJawPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(52, -70);
  ctx.lineTo(178, -68);
  ctx.quadraticCurveTo(186, -66, 180, -58);
  ctx.lineTo(96, -54);
  ctx.quadraticCurveTo(62, -54, 52, -60);
  ctx.closePath();
}

function teeth(ctx, count, x0, x1, y, dir, size) {
  ctx.fillStyle = '#f4f2e2';
  for (let i = 0; i < count; i += 1) {
    const x = x0 + ((x1 - x0) * i) / (count - 1);
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + dir * size * 2.1);
    ctx.closePath();
    ctx.fill();
  }
}

// Resolve the fighter's action into pose numbers the rig understands.
function poseFor(f, time, dance) {
  const pose = {
    crouch: 0,
    pitch: 0,
    lift: 0,
    rear: 0,
    supine: 0,
    jaw: 0,
    headTilt: 0,
    tail: Math.sin(time * 1.6 + f.x * 0.01) * 0.16,
    armL: { swing: 0, punch: 0 },
    armR: { swing: 0, punch: 0 },
    hips: 0,
    tongue: 0,
    crossEyes: 0,
    stars: 0,
    starAngle: 0,
    armsClamped: 0,
    lean: 0
  };

  if (dance) {
    pose.supine = dance.supine;
    pose.rear = dance.rise;
    pose.lift = -dance.hop;
    pose.lean = dance.lean + dance.wobble * 0.4;
    pose.headTilt = dance.headTilt;
    pose.tail = dance.tail;
    pose.hips = dance.hips || 0;
    pose.tongue = dance.tongue || 0;
    pose.crossEyes = dance.crossEyes || 0;
    pose.stars = dance.stars;
    pose.starAngle = dance.starAngle;
    pose.armsClamped = dance.arm || 0;
    pose.armJiggle = dance.armJiggle || 0;
    pose.jaw = (dance.tongue || 0) * 0.4;
    pose.triumphant = !!dance.triumphant;
    pose.headTilt += pose.rear * 0.78;
    return pose;
  }

  // Idle breathing and the walk cycle.
  const breathe = Math.sin(time * 2.2 + f.x * 0.02) * 1.4;
  pose.lift = breathe * (1 - f.moving);
  const step = Math.sin(f.walkPhase);
  pose.armL.swing = step * 0.5 * f.moving;
  pose.armR.swing = -step * 0.5 * f.moving;
  pose.lift += Math.abs(step) * -3 * f.moving;

  const a = f.action;
  if (a) {
    if (a.type === 'scratch') {
      const p = a.phase === 'windup' ? -a.t / MOVES.scratch.windup : a.phase === 'active' ? 1 : 1 - a.t / MOVES.scratch.recover;
      const arm = a.arm > 0 ? pose.armR : pose.armL;
      arm.punch = Math.max(-0.4, p) * 0.85;
      pose.pitch = Math.max(0, p) * 0.06;
      pose.jaw = Math.max(0, p) * 0.35;
    } else if (a.type === 'box') {
      // [T13] One front leg punches while the other three hold it up.
      const p =
        a.phase === 'windup'
          ? -(a.t / MOVES.box.windup)
          : a.phase === 'active'
          ? 1
          : 1 - a.t / MOVES.box.recover;
      const arm = a.arm > 0 ? pose.armR : pose.armL;
      arm.punch = Math.max(-0.55, p);
      pose.pitch = Math.max(0, p) * 0.1;
      pose.crouch = 5 * Math.max(0, -p);
      pose.jaw = Math.max(0, p) * 0.2;
    } else if (a.type === 'bite') {
      // Jaws first, all four legs tucked.
      pose.pitch = 0.34 + Math.min(0.3, Math.max(-0.2, f.vy / 2600));
      pose.jaw = 1;
      pose.armL.punch = 0.35;
      pose.armR.punch = 0.35;
      pose.tail = -0.4;
    } else if (a.type === 'regenerate') {
      const k = Math.min(1, a.t / (REGEN.duration * 0.35));
      const down = a.t > REGEN.duration * 0.78 ? (a.t - REGEN.duration * 0.78) / (REGEN.duration * 0.22) : 0;
      pose.rear = Math.max(0, k - down);
      pose.jaw = 0.7 * pose.rear;
      pose.armL.punch = 0.5 * pose.rear;
      pose.armR.punch = 0.5 * pose.rear;
    }
  }

  pose.headTilt += pose.rear * 0.78;

  if (f.stun > 0) {
    pose.pitch = -0.16 * Math.min(1, f.stun * 4);
    pose.headTilt = -0.3 * Math.min(1, f.stun * 4);
  }
  if (f.vulnerable > 0 && !f.action) {
    pose.crouch = 12 * Math.min(1, f.vulnerable);
    pose.headTilt = 0.2;
  }
  return pose;
}

const HIP = { x: -46, y: -56 };
const REAR_ANGLE = 1.18; // radians of hip rotation for a full rear-up

// Rearing and lying on the back are the same thing to the rig: one rotation
// about the hips. The hind feet are then counter-rotated so they stay planted.
function bodyAngle(pose) {
  return pose.pitch + pose.lean - pose.supine * (Math.PI - 0.3) - pose.rear * REAR_ANGLE;
}

function unrotate(tx, ty, theta) {
  const dx = tx - HIP.x;
  const dy = ty - HIP.y;
  const c = Math.cos(-theta);
  const s = Math.sin(-theta);
  return [HIP.x + dx * c - dy * s, HIP.y + dx * s + dy * c];
}

export function crocHeadHeight(f, dance) {
  const rear = dance ? dance.rise : f.action?.type === 'regenerate' ? 1 : 0;
  const hop = dance ? dance.hop || 0 : 0;
  return 118 + rear * 96 + hop;
}

export function drawCroc(ctx, f, { time, dance = null, groundY = ARENA.ground } = {}) {
  const stripped = f.scales === 0;
  const c = hideColors(f.tint, stripped);
  const pose = poseFor(f, time, dance);
  const airborne = f.y < -1;
  const theta = bodyAngle(pose);

  ctx.save();
  ctx.translate(f.x, groundY);

  // Ground shadow, tightening as the croc rises.
  const lift = -f.y + Math.max(0, -pose.lift);
  const shadowK = Math.max(0.28, 1 - lift / 420);
  ctx.save();
  ctx.globalAlpha = 0.42 * shadowK;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 6, 118 * shadowK, 15 * shadowK, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(0, f.y);
  ctx.scale(f.facing, 1);

  ctx.translate(0, pose.lift + pose.crouch + pose.supine * 30);
  ctx.translate(HIP.x, HIP.y);
  ctx.rotate(theta);
  ctx.translate(-HIP.x, -HIP.y);

  const targets = legTargets(pose, f, airborne, theta);

  drawFarSide(ctx, c, pose, targets);
  drawTail(ctx, c, pose, stripped);
  drawBody(ctx, c, stripped);
  if (stripped) drawUnderpants(ctx, pose);
  drawScaleRow(ctx, f, stripped);
  drawNearSide(ctx, c, pose, targets);
  drawHead(ctx, c, pose, stripped, f);

  if (f.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, f.hitFlash * 2);
    ctx.fillStyle = '#fff';
    bodyPath(ctx);
    ctx.fill();
    headPath(ctx, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  if (pose.stars > 0) drawStars(ctx, f, pose, groundY);
}

function legTargets(pose, f, airborne, theta) {
  const planted = !airborne && pose.supine < 0.25;
  const step = Math.sin(f.walkPhase);
  const stepBack = Math.sin(f.walkPhase + Math.PI);
  const walking = planted && pose.rear < 0.2 ? f.moving : 0;
  const loose = airborne || pose.supine > 0.25;
  const my = loose ? -20 : 0;

  let backNear = [-58 + stepBack * 18 * walking, my - Math.max(0, stepBack) * 12 * walking];
  let backFar = [-64 + step * 16 * walking, my - Math.max(0, step) * 10 * walking];

  if (planted && pose.rear > 0.05) {
    // Standing on the hind legs: keep the feet on the concrete under the hips.
    const hop = pose.lift + pose.supine * 30;
    backNear = unrotate(-34 + pose.hips * 14, -hop, theta);
    backFar = unrotate(-58 - pose.hips * 10, -hop, theta);
  } else if (planted) {
    backNear = unrotate(backNear[0], backNear[1] - pose.lift, theta);
    backFar = unrotate(backFar[0], backFar[1] - pose.lift, theta);
  }

  const frontNear = planted && pose.rear < 0.2
    ? unrotate(46 + step * 20 * walking, -Math.max(0, step) * 12 * walking - pose.lift, theta)
    : [40, my - 24];
  const frontFar = planted && pose.rear < 0.2
    ? unrotate(40 + stepBack * 18 * walking, -Math.max(0, stepBack) * 10 * walking - pose.lift, theta)
    : [34, my - 22];

  return { frontNear, frontFar, backNear, backFar };
}

function armTarget(pose, side, base) {
  const arm = side === 'near' ? pose.armR : pose.armL;
  if (pose.triumphant) return [26, -128 - (pose.armJiggle || 0) * 10];
  if (pose.armsClamped > 0) {
    // Clamped over the underpants, jiggling half a beat behind the body.
    const j = (pose.armJiggle || 0) * 6;
    return [-4 + j * 0.4, -48 + j];
  }
  const punch = arm.punch;
  if (punch <= 0) {
    return [base[0] + punch * 26, base[1] + punch * 10];
  }
  return [base[0] + punch * 96, base[1] - 22 - punch * 18];
}

function drawFarSide(ctx, c, pose, t) {
  const dark = mix(c.mid, '#000', 0.42);
  const front = armTarget(pose, 'far', t.frontFar);
  drawLimb(ctx, 40, -58, front[0], front[1], 36, 36, 1, dark, 17);
  drawLimb(ctx, -54, -58, t.backFar[0], t.backFar[1], 40, 40, -1, dark, 20);
}

function drawNearSide(ctx, c, pose, t) {
  const front = armTarget(pose, 'near', t.frontNear);
  drawLimb(ctx, 48, -56, front[0], front[1], 38, 38, 1, c.mid, 19);
  drawLimb(ctx, -46, -56, t.backNear[0], t.backNear[1], 42, 42, -1, c.mid, 23);
}

function drawTail(ctx, c, pose, stripped) {
  ctx.fillStyle = c.mid;
  tailPath(ctx, pose.tail);
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!stripped) {
    // Tail ridge.
    ctx.fillStyle = SCALE_BACK;
    for (let i = 0; i < TAIL_SLOTS; i += 1) {
      const k = 0.08 + (i / (TAIL_SLOTS - 1)) * 0.82;
      const [x, y] = tailTopPoint(pose.tail, k);
      const size = 9 - k * 4;
      ctx.beginPath();
      ctx.moveTo(x - size, y + 3);
      ctx.lineTo(x, y - size * 1.3);
      ctx.lineTo(x + size, y + 3);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawBody(ctx, c, stripped) {
  bodyPath(ctx);
  const g = ctx.createLinearGradient(0, -112, 0, -30);
  g.addColorStop(0, c.mid);
  g.addColorStop(0.6, c.light);
  g.addColorStop(1, c.belly);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Belly plates.
  ctx.strokeStyle = stripped ? 'rgba(120,110,80,0.35)' : 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 2;
  for (let x = -46; x < 52; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, -44);
    ctx.lineTo(x + 4, -33);
    ctx.stroke();
  }
}

function drawScaleRow(ctx, f, stripped) {
  if (stripped) return;
  const ratio = f.maxScales > 0 ? f.scales / f.maxScales : 0;
  const shown = Math.max(1, Math.round(ratio * SCALE_SLOTS));
  for (let i = 0; i < SCALE_SLOTS; i += 1) {
    const k = i / (SCALE_SLOTS - 1);
    const x = -66 + k * 118;
    const y = -104 - Math.sin(k * Math.PI) * 8;
    if (i >= shown) {
      // Bare patch where a scale used to be.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = i % 2 === 0 ? SCALE_LIT : SCALE_BACK;
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 8);
    ctx.lineTo(x, y - 9);
    ctx.lineTo(x + 9, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// [T13] The underpants state. Pale hide, white waistband, red spotted pants.
function drawUnderpants(ctx, pose) {
  ctx.save();
  ctx.translate(0, pose.hips * 3);
  // Pants.
  ctx.fillStyle = '#c5272b';
  ctx.beginPath();
  ctx.moveTo(-66, -58);
  ctx.quadraticCurveTo(-24, -70, 10, -58);
  ctx.lineTo(10, -34);
  ctx.quadraticCurveTo(-28, -22, -66, -32);
  ctx.closePath();
  ctx.fill();
  // Spots.
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const spots = [
    [-52, -48],
    [-32, -54],
    [-12, -46],
    [-44, -34],
    [-20, -30]
  ];
  spots.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Waistband.
  ctx.fillStyle = '#f6f4ea';
  ctx.beginPath();
  ctx.moveTo(-68, -62);
  ctx.quadraticCurveTo(-24, -74, 12, -62);
  ctx.lineTo(12, -53);
  ctx.quadraticCurveTo(-24, -65, -68, -53);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHead(ctx, c, pose, stripped, f) {
  ctx.save();
  // Head pivots at the base of the skull.
  ctx.translate(42, -86);
  ctx.rotate(pose.headTilt);
  ctx.translate(-42, 86);

  // Lower jaw swings open.
  ctx.save();
  ctx.translate(54, -66);
  ctx.rotate(pose.jaw * 0.52);
  ctx.translate(-54, 66);
  lowerJawPath(ctx);
  ctx.fillStyle = mix(c.belly, '#000', 0.08);
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  teeth(ctx, 7, 74, 170, -66, -1, 4);
  if (pose.tongue > 0) {
    ctx.fillStyle = '#e2607a';
    ctx.beginPath();
    ctx.ellipse(112 + pose.tongue * 34, -60, 30 + pose.tongue * 16, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  headPath(ctx, pose.jaw);
  const g = ctx.createLinearGradient(0, -112, 0, -66);
  g.addColorStop(0, c.mid);
  g.addColorStop(1, c.light);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  teeth(ctx, 8, 72, 172, -72, 1, 4);

  // Nostril and brow ridge.
  ctx.fillStyle = c.line;
  ctx.beginPath();
  ctx.ellipse(168, -84, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!stripped) {
    ctx.fillStyle = SCALE_BACK;
    for (let i = 0; i < 4; i += 1) {
      const x = 64 + i * 22;
      ctx.beginPath();
      ctx.moveTo(x - 6, -98 + i * 2.4);
      ctx.lineTo(x, -106 + i * 2.4);
      ctx.lineTo(x + 6, -98 + i * 2.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Eye.
  const ex = 88;
  const ey = -104;
  ctx.fillStyle = mix(c.mid, '#fff', 0.1);
  ctx.beginPath();
  ctx.ellipse(ex, ey, 11, 9.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f6f6ec';
  ctx.beginPath();
  ctx.ellipse(ex, ey + 0.5, 6.8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crossed eyes for the dance, otherwise a slit pupil tracking forward.
  const px = pose.crossEyes ? ex + 4 : ex + 2.4;
  const py = pose.crossEyes ? ey + 2.5 : ey + 0.5;
  ctx.fillStyle = '#12150f';
  ctx.beginPath();
  ctx.ellipse(px, py, 2.2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.stun > 0 || pose.crossEyes) {
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ex - 12, ey - 13);
    ctx.lineTo(ex + 10, ey - 17);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStars(ctx, f, pose, groundY) {
  ctx.save();
  ctx.translate(f.x, groundY - 108);
  ctx.globalAlpha = pose.stars;
  for (let i = 0; i < 5; i += 1) {
    const a = pose.starAngle + (i / 5) * Math.PI * 2;
    const x = Math.cos(a) * 62;
    const y = Math.sin(a) * 18 - 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.6);
    ctx.fillStyle = '#ffd287';
    ctx.beginPath();
    for (let p = 0; p < 10; p += 1) {
      const r = p % 2 === 0 ? 9 : 3.6;
      const ang = (p / 10) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
