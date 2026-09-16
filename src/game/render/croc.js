import { ARENA, REGEN } from '../constants.js';
import { spawnDust } from '../particles.js';
import { hash01, hideColors, mix, SCALE_LIT, SCALE_BACK } from './colors.js';

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


// Sprawled crocodilian limb: thick upper arm, thinner forearm, splayed foot
// with claws. Drawn as tapered polygons rather than a stroked line so the
// shading has an edge to catch.
function drawLimb(ctx, rx, ry, fx, fy, l1, l2, bendDir, c, width, dim) {
  const [kx, ky] = knee(rx, ry, fx, fy, l1, l2, bendDir);

  const limb = (ax, ay, bx, by, wa, wb) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa, ay + ny * wa);
    ctx.lineTo(bx + nx * wb, by + ny * wb);
    ctx.lineTo(bx - nx * wb, by - ny * wb);
    ctx.lineTo(ax - nx * wa, ay - ny * wa);
    ctx.closePath();
  };

  const body = dim ? c.shadow : c.mid;
  const lit = dim ? mix(c.shadow, c.mid, 0.4) : c.flank;

  ctx.fillStyle = body;
  limb(rx, ry, kx, ky, width * 0.62, width * 0.4);
  ctx.fill();
  limb(kx, ky, fx, fy, width * 0.4, width * 0.28);
  ctx.fill();

  // Light down the leading edge.
  if (!dim) {
    ctx.strokeStyle = lit;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry - width * 0.5);
    ctx.lineTo(kx, ky - width * 0.32);
    ctx.stroke();
  }

  // Joints as discs, which is what stops a two-segment limb looking like two
  // rectangles bolted together.
  ctx.fillStyle = body;
  [[rx, ry, width * 0.6], [kx, ky, width * 0.4], [fx, fy, width * 0.28]].forEach(([jx, jy, r]) => {
    ctx.beginPath();
    ctx.arc(jx, jy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Foot: a short pad and three clawed toes fanned forward.
  ctx.save();
  ctx.translate(fx, fy);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(4, -3, width * 0.5, width * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = dim ? mix('#e8e2c6', c.shadow, 0.55) : '#e8e2c6';
  for (let i = 0; i < 3; i += 1) {
    const a = -0.35 + i * 0.35;
    ctx.beginPath();
    ctx.moveTo(6 + i * 5, -6);
    ctx.lineTo(6 + i * 5 + Math.cos(a) * 13, -6 + Math.sin(a) * 8);
    ctx.lineTo(6 + i * 5 + 3, -1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}


// Torso. Heavy through the shoulders, sagging belly, and a back line that dips
// behind the neck and rises again over the hips the way a crocodile's does.
function bodyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-84, -70);
  ctx.bezierCurveTo(-90, -104, -64, -112, -40, -108);
  ctx.bezierCurveTo(-8, -102, 12, -100, 30, -104);
  ctx.bezierCurveTo(46, -107, 58, -102, 68, -90);
  ctx.bezierCurveTo(76, -78, 74, -60, 64, -48);
  ctx.bezierCurveTo(46, -36, 10, -30, -24, -31);
  ctx.bezierCurveTo(-52, -32, -74, -40, -82, -50);
  ctx.closePath();
}

// The line where the pale underside meets the flank. Drawn as its own shape so
// the belly can be a different colour rather than a gradient guess.
function bellyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(62, -46);
  ctx.bezierCurveTo(46, -36, 10, -30, -24, -31);
  ctx.bezierCurveTo(-52, -32, -74, -40, -82, -50);
  ctx.bezierCurveTo(-62, -46, -20, -44, 18, -45);
  ctx.bezierCurveTo(40, -46, 54, -45, 62, -46);
  ctx.closePath();
}

// The tail's top edge, as two quadratics. The ridge scales are placed along
// this same curve so they never float off the tail.

// Tail. Simulated as a short chain of segments that spring toward the pose and
// lag behind it, so it whips on every jump, punch and shove instead of being
// welded to the hips. Deep at the base, tapering to a point, with the tall
// keel a crocodile swims with.
const TAIL_SEGS = 6;
const TAIL_LEN = 30;

export function stepTail(f, pose, dt, theta) {
  const sim = (f.tailSim ??= {
    a: new Array(TAIL_SEGS).fill(0),
    v: new Array(TAIL_SEGS).fill(0),
    lastTheta: theta,
    lastX: f.x
  });

  // Body rotation and sideways acceleration both crack the whip.
  const spin = (theta - sim.lastTheta) / Math.max(dt, 1 / 240);
  const slide = (f.x - sim.lastX) / Math.max(dt, 1 / 240);
  sim.lastTheta = theta;
  sim.lastX = f.x;
  sim.v[0] -= (spin * 0.9 + slide * 0.004) * dt * 30;

  for (let i = 0; i < TAIL_SEGS; i += 1) {
    const target = i === 0 ? pose.tail * 0.5 : sim.a[i - 1] * 0.82;
    const k = 150 - i * 14;
    const damp = 13 - i * 0.7;
    sim.v[i] += ((target - sim.a[i]) * k - sim.v[i] * damp) * dt;
    sim.a[i] += sim.v[i] * dt;
    sim.a[i] = Math.max(-0.75, Math.min(0.75, sim.a[i]));
  }
  return sim;
}

// Walk the chain and return the spine points plus a half-width at each.
function tailSpine(sim) {
  const pts = [];
  let x = -78;
  let y = -70;
  let ang = 0;
  for (let i = 0; i < TAIL_SEGS; i += 1) {
    const w = 30 - i * 4.6;
    pts.push({ x, y, w, ang });
    ang += (sim ? sim.a[i] : 0) + 0.06;
    x -= Math.cos(ang) * TAIL_LEN;
    y += Math.sin(ang) * TAIL_LEN;
  }
  pts.push({ x, y, w: 3, ang });
  return pts;
}


function tailOutline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  for (let i = pts.length - 1; i >= 0; i -= 1) ctx.lineTo(pts[i].x, pts[i].y + pts[i].w * 0.72);
  ctx.closePath();
}


export function tailTopPoint(swing, k) {
  const pts = tailSpine(null);
  const i = Math.min(pts.length - 1, Math.floor(k * (pts.length - 1)));
  return [pts[i].x, pts[i].y - pts[i].w];
}


function tailPath(ctx, sim) {
  tailOutline(ctx, tailSpine(sim));
}


// Skull and upper jaw. The shapes that say crocodile are the raised brow over
// the eye, the dip behind it, the long flat snout, the bulge at the nostrils,
// and the wavy tooth line.
function headPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(18, -96);
  ctx.bezierCurveTo(34, -108, 52, -114, 68, -116);
  ctx.bezierCurveTo(80, -118, 90, -114, 96, -106); // brow over the eye
  ctx.bezierCurveTo(106, -100, 122, -100, 150, -98);
  ctx.bezierCurveTo(176, -97, 192, -98, 202, -94); // nostril bulge
  ctx.bezierCurveTo(210, -91, 210, -82, 202, -78);
  ctx.lineTo(188, -76);
  ctx.bezierCurveTo(160, -70, 130, -72, 104, -70); // wavy jaw line
  ctx.bezierCurveTo(78, -68, 46, -72, 22, -78);
  ctx.closePath();
}


function lowerJawPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(24, -74);
  ctx.bezierCurveTo(52, -68, 84, -64, 112, -66);
  ctx.bezierCurveTo(146, -68, 176, -70, 196, -74);
  ctx.bezierCurveTo(204, -70, 202, -60, 192, -58);
  ctx.bezierCurveTo(160, -52, 120, -50, 92, -52);
  ctx.bezierCurveTo(56, -54, 32, -58, 24, -64);
  ctx.closePath();
}


// Interlocking teeth along a wavy jaw. `big` marks the oversized fourth
// mandibular tooth that sits outside a crocodile's lip, which is most of what
// separates a crocodile from an alligator at a glance.
function teeth(ctx, ctxDir, x0, x1, count, baseY, wave, size, big) {
  ctx.fillStyle = '#f6f3e4';
  for (let i = 0; i < count; i += 1) {
    const k = i / (count - 1);
    const x = x0 + (x1 - x0) * k;
    const y = baseY + Math.sin(k * Math.PI * 2) * wave;
    const h = (i === big ? size * 2.3 : size * (1.5 + hash01(i * 3.3) * 0.7));
    const w = i === big ? size * 0.85 : size * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.15, y + ctxDir * h);
    ctx.closePath();
    ctx.fill();
  }
}

// Resolve the fighter's action and stance into pose numbers the rig
// understands. One function covers all nine moves plus idle, walk, crouch,
// guard, regenerate, hit, knockdown and the dance.
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
    guard: 0,
    splay: 0,
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

  // Knocked flat by a sweep: on its back, scrambling up.
  if (f.downed > 0) {
    const k = Math.min(1, f.downed / 0.55);
    pose.supine = k;
    pose.crossEyes = 1;
    pose.stars = k * 0.8;
    pose.starAngle = time * 3.4;
    return pose;
  }

  // Idle breathing and the walk cycle.
  const breathe = Math.sin(time * 2.2 + f.x * 0.02) * 1.4;
  pose.lift = breathe * (1 - f.moving);
  const step = Math.sin(f.walkPhase);
  pose.armL.swing = step * 0.5 * f.moving;
  pose.armR.swing = -step * 0.5 * f.moving;
  pose.lift += Math.abs(step) * -3 * f.moving;

  // Airborne with nothing thrown yet: nose up on the way, nose down on the
  // fall, legs tucked. Without it a plain jump just hovers.
  if (f.y < -1 && !f.action) {
    pose.pitch = Math.max(-0.24, Math.min(0.3, f.vy / 2200));
    pose.tail = -0.25 - pose.pitch * 0.5;
    pose.armL.punch = -0.25;
    pose.armR.punch = -0.25;
  }

  // Held stances.
  if (f.stance === 'crouch') {
    pose.crouch = 30;
    pose.splay = 1;
    pose.pitch = -0.06;
    pose.tail = -0.3;
  }
  if (f.guarding) {
    pose.guard = 1;
    pose.crouch = Math.max(pose.crouch, 14);
    // Snout tucked down behind the forearms.
    pose.headTilt = 0.26;
    pose.jaw = 0;
    pose.tail = 0.3;
  }

  const a = f.action;
  if (a && a.type === 'regenerate') {
    const k = Math.min(1, a.t / (REGEN.duration * 0.35));
    const down = a.t > REGEN.duration * 0.78 ? (a.t - REGEN.duration * 0.78) / (REGEN.duration * 0.22) : 0;
    pose.rear = Math.max(0, k - down);
    pose.jaw = 0.7 * pose.rear;
    pose.armL.punch = 0.5 * pose.rear;
    pose.armR.punch = 0.5 * pose.rear;
  } else if (a && a.move) {
    const m = a.move;
    // -1 through 0 is the wind-up, 1 is the strike, back to 0 on recovery.
    const p =
      a.phase === 'windup'
        ? -(a.t / Math.max(0.01, m.windup))
        : a.phase === 'active'
        ? 1
        : 1 - a.t / Math.max(0.01, m.recover);
    const hit = Math.max(0, p);
    const wind = Math.max(0, -p);
    const arm = a.arm > 0 ? pose.armR : pose.armL;

    if (a.stance === 'air') {
      pose.guard = 0;
      if (a.type === 'bite') {
        // Jaws first, straight down.
        pose.pitch = 0.34 + Math.min(0.3, Math.max(-0.2, f.vy / 2600));
        pose.jaw = 1;
        pose.armL.punch = 0.35;
        pose.armR.punch = 0.35;
        pose.tail = -0.4;
      } else if (a.type === 'box') {
        // Both arms overhead, then driven down.
        pose.pitch = 0.12 + hit * 0.34;
        pose.armL.punch = -0.5 + hit * 1.5;
        pose.armR.punch = -0.5 + hit * 1.5;
        pose.jaw = hit * 0.4;
        pose.tail = 0.35;
      } else {
        // Claws out, body stretched along the dive.
        pose.pitch = 0.22;
        arm.punch = 0.4 + hit * 0.7;
        pose.jaw = 0.5;
        pose.tail = -0.2;
      }
    } else if (a.stance === 'crouch') {
      pose.crouch = 34;
      pose.splay = 1;
      if (a.type === 'scratch') {
        // Low sweep, right along the concrete.
        arm.punch = hit * 1.15;
        pose.pitch = -0.1 - hit * 0.12;
        pose.tail = -0.6 + hit * 1.2;
      } else if (a.type === 'box') {
        // Uppercut: coils down, then drives up off the hind legs.
        pose.crouch = 40 - hit * 54;
        pose.rear = hit * 0.55;
        arm.punch = hit;
        pose.pitch = -wind * 0.1;
        pose.jaw = hit * 0.5;
      } else {
        // Chomp: low lunge, jaws wide.
        pose.jaw = 0.4 + hit * 0.6;
        pose.pitch = hit * 0.18;
        pose.crouch = 34 - hit * 10;
      }
    } else if (a.type === 'box') {
      // [T13] One front leg punches while the other three hold it up.
      arm.punch = Math.max(-0.55, p);
      pose.pitch = hit * 0.1;
      pose.crouch = 5 * wind;
      pose.jaw = hit * 0.2;
    } else if (a.type === 'bite') {
      // Standing lunge, jaws first but feet planted.
      pose.jaw = 0.35 + hit * 0.65;
      pose.pitch = hit * 0.16;
      pose.crouch = 6 * wind;
    } else {
      arm.punch = Math.max(-0.4, p) * 0.85;
      pose.pitch = hit * 0.06;
      pose.jaw = hit * 0.35;
    }
  }

  if (f.stun > 0) {
    pose.pitch = -0.16 * Math.min(1, f.stun * 4);
    pose.headTilt = -0.3 * Math.min(1, f.stun * 4);
  }
  if (f.vulnerable > 0 && !f.action) {
    pose.crouch = Math.max(pose.crouch, 12 * Math.min(1, f.vulnerable));
    pose.headTilt = 0.2;
  }

  pose.headTilt += pose.rear * 0.78;
  return pose;
}

const HIP = { x: -46, y: -56 };
const REAR_ANGLE = 1.18; // radians of hip rotation for a full rear-up
// The redrawn crocodile is longer nose to tail than the old one. Scaled back so
// two of them still read as two at fighting distance.
const RIG_SCALE = 0.85;

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
  const crouched = !dance && f.stance === 'crouch' ? -28 : 0;
  return 118 + rear * 96 + hop + crouched;
}


export function drawCroc(
  ctx,
  f,
  { time, dt = 1 / 60, dance = null, groundY = ARENA.ground, dust = null } = {}
) {
  const stripped = f.scales === 0;
  const c = hideColors(f.tint, stripped);
  const pose = poseFor(f, time, dance);
  const airborne = f.y < -1;
  const theta = bodyAngle(pose);
  const tail = stepTail(f, pose, dt, theta);

  if (dust) trackDust(f, dust, groundY, airborne);

  ctx.save();
  ctx.translate(f.x, groundY);

  // Ground shadow, tightening as the crocodile rises.
  const lift = -f.y + Math.max(0, -pose.lift);
  const shadowK = Math.max(0.28, 1 - lift / 420);
  ctx.save();
  ctx.globalAlpha = 0.45 * shadowK;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 6, 126 * shadowK, 16 * shadowK, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(0, f.y);
  ctx.scale(f.facing * RIG_SCALE, RIG_SCALE);

  // Motion smear behind a committed air attack, drawn before the crocodile so
  // it trails rather than covers.
  if (airborne && f.action && f.action.stance === 'air') {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = c.back;
    for (let i = 1; i <= 3; i += 1) {
      ctx.save();
      ctx.translate(-f.vx * 0.012 * i, -f.vy * 0.012 * i);
      ctx.globalAlpha = 0.18 / i;
      bodyPath(ctx);
      ctx.fill();
      headPath(ctx);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.translate(0, pose.lift + pose.crouch + pose.supine * 30);

  // Squash on impact, stretch through a dive. Both around the hips, so the
  // feet stay put.
  const squash = f.hitFlash * 1.8;
  const stretch = airborne && f.action ? 0.1 : 0;
  if (squash > 0 || stretch > 0) {
    ctx.translate(HIP.x, 0);
    ctx.scale(1 + squash * 0.16 + stretch, 1 - squash * 0.16 - stretch * 0.5);
    ctx.translate(-HIP.x, 0);
  }

  ctx.translate(HIP.x, HIP.y);
  ctx.rotate(theta);
  ctx.translate(-HIP.x, -HIP.y);

  const targets = legTargets(pose, f, airborne, theta);

  drawFarSide(ctx, c, pose, targets);
  drawTail(ctx, c, pose, stripped, tail);
  drawBody(ctx, c, stripped, pose);
  if (stripped) drawUnderpants(ctx, pose);
  drawScaleRow(ctx, f, c, stripped);
  drawNearSide(ctx, c, pose, targets);
  drawHead(ctx, c, pose, stripped, f, time);

  if (pose.guard > 0) drawGuardArc(ctx, pose.guard);

  if (f.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, f.hitFlash * 2);
    ctx.fillStyle = '#fff';
    bodyPath(ctx);
    ctx.fill();
    headPath(ctx);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  if (pose.stars > 0) drawStars(ctx, f, pose, groundY);
}

// Footfalls and landings kick up the concrete. Tracked off the walk cycle and
// the moment the feet touch down, so it fires once per event rather than per
// frame.
function trackDust(f, dust, groundY, airborne) {
  const step = Math.sin(f.walkPhase);
  if (!airborne && f.moving > 0.35 && f.lastStep !== undefined && f.lastStep > 0 && step <= 0) {
    spawnDust(dust, { x: f.x - f.facing * 20, y: groundY, count: 3, power: 0.55 });
  }
  f.lastStep = step;

  if (f.wasAirborne && !airborne) {
    spawnDust(dust, { x: f.x, y: groundY, count: 9, power: 1.25, dir: Math.sign(f.vx) });
  }
  f.wasAirborne = airborne;

  if (f.downed > 0 && !f.dustedDown) {
    f.dustedDown = true;
    spawnDust(dust, { x: f.x, y: groundY, count: 12, power: 1.4 });
  } else if (f.downed <= 0) {
    f.dustedDown = false;
  }
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

  // Whatever vertical offset the body is carrying has to come back out of the
  // foot targets, or a crouching crocodile stands with its feet underground.
  const drop = pose.lift + pose.crouch + pose.supine * 30;
  // Crouched, the legs splay out sideways rather than tucking under.
  const splay = pose.splay * 22;

  if (planted && pose.rear > 0.05) {
    backNear = unrotate(-34 + pose.hips * 14, -drop, theta);
    backFar = unrotate(-58 - pose.hips * 10, -drop, theta);
  } else if (planted) {
    backNear = unrotate(backNear[0] - splay, backNear[1] - drop, theta);
    backFar = unrotate(backFar[0] - splay * 1.3, backFar[1] - drop, theta);
  }

  const frontNear = planted && pose.rear < 0.2
    ? unrotate(46 + splay + step * 20 * walking, -Math.max(0, step) * 12 * walking - drop, theta)
    : [40, my - 24];
  const frontFar = planted && pose.rear < 0.2
    ? unrotate(40 + splay * 1.2 + stepBack * 18 * walking, -Math.max(0, stepBack) * 10 * walking - drop, theta)
    : [34, my - 22];

  return { frontNear, frontFar, backNear, backFar };
}

function armTarget(pose, side, base) {
  const arm = side === 'near' ? pose.armR : pose.armL;
  if (pose.triumphant) return [26, -128 - (pose.armJiggle || 0) * 10];
  // Guard: both forearms up and crossed in front of the snout, high enough to
  // read from across the arena.
  if (pose.guard > 0 && arm.punch <= 0) {
    return side === 'near' ? [104, -104] : [92, -92];
  }
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
  const front = armTarget(pose, 'far', t.frontFar);
  drawLimb(ctx, 36, -62, front[0], front[1], 36, 36, 1, c, 22, true);
  drawLimb(ctx, -58, -62, t.backFar[0], t.backFar[1], 40, 40, -1, c, 26, true);
}


function drawNearSide(ctx, c, pose, t) {
  const front = armTarget(pose, 'near', t.frontNear);
  drawLimb(ctx, 48, -58, front[0], front[1], 38, 38, 1, c, 24, false);
  drawLimb(ctx, -50, -58, t.backNear[0], t.backNear[1], 42, 42, -1, c, 29, false);
}


function drawTail(ctx, c, pose, stripped, sim) {
  const pts = tailSpine(sim);

  tailOutline(ctx, pts);
  const g = ctx.createLinearGradient(0, -104, 0, -20);
  g.addColorStop(0, c.spine);
  g.addColorStop(0.45, c.back);
  g.addColorStop(1, c.mid);
  ctx.fillStyle = g;
  ctx.fill();

  // Banding down the tail, tightening toward the tip.
  ctx.save();
  tailOutline(ctx, pts);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.26)';
  ctx.lineWidth = 3;
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i];
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.w);
    ctx.lineTo(p.x + 5, p.y + p.w * 0.72);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.2;
  tailOutline(ctx, pts);
  ctx.stroke();

  if (!stripped) {
    // The keel: a double row at the base that merges into one tall crest.
    ctx.fillStyle = c.scute;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p = pts[i];
      const n = pts[i + 1];
      const steps = 2;
      for (let j = 0; j < steps; j += 1) {
        const t = j / steps;
        const x = p.x + (n.x - p.x) * t;
        const y = p.y + (n.y - p.y) * t;
        const w = p.w + (n.w - p.w) * t;
        const h = 6 + w * 0.42;
        const split = i < 2 ? 5 : 0; // double row near the hips
        [-split, split].forEach((off, idx) => {
          if (split === 0 && idx === 1) return;
          ctx.beginPath();
          ctx.moveTo(x - 6 + off, y - w + 3);
          ctx.quadraticCurveTo(x + off, y - w - h, x + 6 + off, y - w + 3);
          ctx.closePath();
          ctx.fill();
        });
      }
    }
  }

  // Rim light along the top of the tail.
  ctx.save();
  ctx.strokeStyle = c.rim;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  ctx.stroke();
  ctx.restore();
  void pose;
}


function drawBody(ctx, c, stripped, pose) {
  // Base hide, dark along the spine and warming down the flank.
  bodyPath(ctx);
  const g = ctx.createLinearGradient(0, -116, 0, -30);
  g.addColorStop(0, c.spine);
  g.addColorStop(0.28, c.back);
  g.addColorStop(0.62, c.mid);
  g.addColorStop(1, c.flank);
  ctx.fillStyle = g;
  ctx.fill();

  // Skin cells: small deterministic facets across the flank. Hashed rather
  // than random so they sit still between frames.
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  for (let i = 0; i < 46; i += 1) {
    const hx = -84 + hash01(i * 1.7) * 158;
    const hy = -106 + hash01(i * 4.1 + 9) * 74;
    const r = 4 + hash01(i * 7.3) * 5;
    ctx.globalAlpha = 0.16 + hash01(i * 2.9) * 0.12;
    ctx.fillStyle = i % 3 === 0 ? c.rim : c.shadow;
    ctx.beginPath();
    ctx.ellipse(hx, hy, r, r * 0.66, hash01(i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Shoulder and haunch mass, so the torso is not a flat slab.
  // Shoulder and haunch mass. Subtle: enough to round the torso, not enough to
  // bleach it.
  ctx.globalAlpha = 0.28;
  [[-54, -80, 34], [44, -84, 30]].forEach(([hx, hy, r]) => {
    const mass = ctx.createRadialGradient(hx, hy, 2, hx, hy, r);
    mass.addColorStop(0, c.flank);
    mass.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mass;
    ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // Pale underside with its banded belly scutes.
  bellyPath(ctx);
  ctx.fillStyle = mix(c.belly, c.flank, 0.42);
  ctx.fill();
  ctx.save();
  bellyPath(ctx);
  ctx.clip();
  ctx.strokeStyle = stripped ? 'rgba(150,140,110,0.5)' : 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let x = -80; x < 70; x += 13) {
    ctx.beginPath();
    ctx.moveTo(x, -60);
    ctx.lineTo(x + 5, -26);
    ctx.stroke();
  }
  ctx.restore();

  // Contact shadow where the legs meet the body.
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  ctx.globalAlpha = 0.4;
  [[-52, -52], [48, -50]].forEach(([ax, ay]) => {
    const ao = ctx.createRadialGradient(ax, ay, 2, ax, ay, 34);
    ao.addColorStop(0, c.shadow);
    ao.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ao;
    ctx.fillRect(ax - 40, ay - 40, 80, 80);
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.5;
  bodyPath(ctx);
  ctx.stroke();

  // Rim light along the back, from the floods overhead.
  ctx.save();
  ctx.strokeStyle = c.rim;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-84, -70);
  ctx.bezierCurveTo(-90, -104, -64, -112, -40, -108);
  ctx.bezierCurveTo(-8, -102, 12, -100, 30, -104);
  ctx.bezierCurveTo(46, -107, 58, -102, 68, -90);
  ctx.stroke();
  ctx.restore();
  void pose;
}


// The armour itself: two staggered rows of keeled scutes down the back, plus
// the nuchal cluster behind the skull. Each lost scale leaves a bare socket,
// so the coat visibly thins as it is knocked off.
function drawScaleRow(ctx, f, c, stripped) {
  if (stripped) return;
  const ratio = f.maxScales > 0 ? f.scales / f.maxScales : 0;
  const shown = Math.max(1, Math.round(ratio * SCALE_SLOTS));

  const row = (yOff, scale, lit) => {
    for (let i = 0; i < SCALE_SLOTS; i += 1) {
      const k = i / (SCALE_SLOTS - 1);
      const x = -78 + k * 142;
      const y = -104 - Math.sin(k * Math.PI) * 9 + yOff;
      if (i >= shown) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 7, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const h = (11 + hash01(i * 5.1) * 4) * scale;
      const w = 8.5 * scale;
      ctx.beginPath();
      ctx.moveTo(x - w, y + 7);
      ctx.quadraticCurveTo(x - w * 0.4, y - h * 0.5, x, y - h);
      ctx.quadraticCurveTo(x + w * 0.4, y - h * 0.5, x + w, y + 7);
      ctx.closePath();
      ctx.fillStyle = lit ? c.scuteLit : c.scute;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Keel: the ridge every scute carries down its middle.
      ctx.strokeStyle = lit ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x, y - h * 0.8);
      ctx.stroke();
    }
  };

  row(6, 0.72, false); // far row, sitting behind
  row(0, 1, true); // near row

  // Nuchal cluster on the neck.
  ctx.fillStyle = c.scute;
  for (let i = 0; i < 4; i += 1) {
    const x = 34 + (i % 2) * 15;
    const y = -100 + Math.floor(i / 2) * 11;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
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


function drawHead(ctx, c, pose, stripped, f, time) {
  ctx.save();
  ctx.translate(42, -86);
  ctx.rotate(pose.headTilt);
  ctx.translate(-42, 86);
  // A full-length crocodile snout is longer than two fighters standing at
  // punching distance can accommodate, so the skull is drawn slightly
  // foreshortened. Everything inside this block shares the squeeze.
  ctx.translate(20, 0);
  ctx.scale(0.86, 1);
  ctx.translate(-20, 0);

  // Lower jaw first, so the upper jaw and its teeth close over it.
  ctx.save();
  ctx.translate(26, -70);
  ctx.rotate(pose.jaw * 0.5);
  ctx.translate(-26, 70);
  lowerJawPath(ctx);
  const jg = ctx.createLinearGradient(0, -74, 0, -50);
  jg.addColorStop(0, c.flank);
  jg.addColorStop(1, c.belly);
  ctx.fillStyle = jg;
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Throat banding.
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1.6;
  for (let x = 40; x < 180; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, -66);
    ctx.lineTo(x + 3, -54);
    ctx.stroke();
  }
  teeth(ctx, -1, 44, 188, 11, -66, 3, 4.2, 3);
  if (pose.tongue > 0) {
    ctx.fillStyle = '#d4637c';
    ctx.beginPath();
    ctx.ellipse(110 + pose.tongue * 30, -60, 34 + pose.tongue * 16, 7, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Skull and upper jaw.
  headPath(ctx);
  const hg = ctx.createLinearGradient(0, -120, 0, -66);
  hg.addColorStop(0, c.spine);
  hg.addColorStop(0.35, c.back);
  hg.addColorStop(1, c.mid);
  ctx.fillStyle = hg;
  ctx.fill();

  // Snout ridges and pitting.
  ctx.save();
  headPath(ctx);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(104, -100);
  ctx.bezierCurveTo(140, -96, 172, -95, 198, -90);
  ctx.stroke();
  for (let i = 0; i < 22; i += 1) {
    const hx = 96 + hash01(i * 2.3) * 104;
    const hy = -100 + hash01(i * 5.7) * 22;
    ctx.globalAlpha = 0.2 + hash01(i * 3.1) * 0.16;
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.6 + hash01(i * 9.1) * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.5;
  headPath(ctx);
  ctx.stroke();
  teeth(ctx, 1, 40, 192, 12, -73, -3, 4, -1);

  // Rim light along the top of the skull and snout.
  ctx.save();
  ctx.strokeStyle = c.rim;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(34, -108);
  ctx.bezierCurveTo(52, -114, 68, -116, 96, -106);
  ctx.bezierCurveTo(122, -100, 176, -97, 202, -94);
  ctx.stroke();
  ctx.restore();

  // Nostril at the tip of the snout.
  ctx.fillStyle = c.line;
  ctx.beginPath();
  ctx.ellipse(192, -92, 4.6, 3.2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  if (!stripped) {
    // Scutes across the skull.
    ctx.fillStyle = c.scute;
    for (let i = 0; i < 5; i += 1) {
      const x = 44 + i * 13;
      ctx.beginPath();
      ctx.ellipse(x, -106 + Math.abs(i - 2) * 2, 5.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEye(ctx, c, pose, f, time);
  ctx.restore();
}

// A crocodile's eye sits on a raised orbital bump with a vertical slit pupil,
// and it blinks with a pale nictitating lid.
function drawEye(ctx, c, pose, f, time) {
  const ex = 76;
  const ey = -107;

  // Orbital bump.
  ctx.fillStyle = c.back;
  ctx.beginPath();
  ctx.ellipse(ex, ey + 3, 15, 10.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyeball.
  ctx.fillStyle = '#f3d98a';
  ctx.beginPath();
  ctx.ellipse(ex + 1, ey + 2, 8, 6.8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(ex + 1, ey + 1, 1, ex + 1, ey + 2, 8);
  iris.addColorStop(0, '#f8e7ab');
  iris.addColorStop(1, '#b08a2e');
  ctx.fillStyle = iris;
  ctx.fill();

  // Slit pupil, crossed inward for the dance.
  const px = pose.crossEyes ? ex + 5 : ex + 2;
  ctx.fillStyle = '#0d1109';
  ctx.beginPath();
  ctx.ellipse(px, ey + 2, 2.1, 7, pose.crossEyes ? 0.3 : 0, 0, Math.PI * 2);
  ctx.fill();

  // Catchlight.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(ex - 3, ey - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Blink: a fast pale lid, on its own slow rhythm per crocodile.
  const blink = Math.sin(time * 0.9 + f.x * 0.05);
  const lid = blink > 0.985 ? (blink - 0.985) / 0.015 : 0;
  const shut = f.ko || f.downed > 0 ? 0.75 : lid;
  if (shut > 0) {
    ctx.fillStyle = mix(c.mid, '#e8e6cf', 0.45);
    ctx.beginPath();
    ctx.ellipse(ex + 1, ey + 2 - 6.8 * (1 - shut), 8, 6.8 * shut, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ex - 15, ey - 7);
  ctx.bezierCurveTo(ex - 6, ey - 14, ex + 8, ey - 14, ex + 16, ey - 5);
  ctx.stroke();
}

// The clearest signal that a hit is about to be softened. Drawn in the
// crocodile's own frame so it faces wherever it does.
function drawGuardArc(ctx, amount) {
  ctx.save();
  ctx.globalAlpha = 0.5 * amount;
  ctx.strokeStyle = '#bfe06e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(74, -74, 78, -0.92, 0.92);
  ctx.stroke();
  ctx.globalAlpha = 0.22 * amount;
  ctx.lineWidth = 14;
  ctx.stroke();
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
