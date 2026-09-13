import { ARENA, BODY, MOVES, PHYSICS, REGEN, CLAW_MULTIPLIER } from './constants.js';

export function createFighter({
  id,
  name,
  nameplate = '',
  tint = '#ffffff',
  x,
  facing,
  scales,
  maxScales,
  hearts,
  maxHearts,
  clawLevel = 0,
  clawMul,
  isPlayer = false
}) {
  return {
    id,
    name,
    nameplate,
    tint,
    isPlayer,
    x,
    vx: 0,
    y: 0, // height above the concrete; 0 is grounded
    vy: 0,
    facing,
    scales,
    maxScales,
    hearts,
    maxHearts,
    clawMul: clawMul ?? CLAW_MULTIPLIER(clawLevel),
    action: null,
    stun: 0,
    vulnerable: 0,
    hitFlash: 0,
    regenCd: 0,
    lastArm: 1,
    walkPhase: 0,
    moving: 0,
    ko: false,
    ringedOut: false,
    // Progress toward the boundary behind this fighter, 0..1, for the HUD bar.
    pushProgress: 0
  };
}

export const isBusy = (f) =>
  f.ko || f.stun > 0 || f.vulnerable > 0 || f.action !== null || f.y < 0 || f.vy !== 0;

export const canAct = (f) => !isBusy(f);

export function bodyBox(f) {
  return {
    left: f.x - BODY.halfWidth,
    right: f.x + BODY.halfWidth,
    top: ARENA.ground + f.y - BODY.height,
    bottom: ARENA.ground + f.y
  };
}

export function startMove(f, type) {
  if (!canAct(f)) return false;
  if (type === 'regenerate') {
    if (f.regenCd > 0 || f.hearts >= f.maxHearts) return false;
    f.action = { type: 'regenerate', t: 0, duration: REGEN.duration, healed: false };
    f.vx = 0;
    return true;
  }
  if (type === 'bite') {
    f.action = { type: 'bite', t: 0, connected: false };
    f.vy = PHYSICS.jumpVelocity;
    f.y = -0.001;
    // [T13] Airborne means committed: facing and heading are locked from here.
    f.vx = f.facing * PHYSICS.jumpForward;
    return true;
  }
  const move = MOVES[type];
  if (!move) return false;
  // [T13] Box is one arm. Alternate arms on consecutive punches.
  const arm = type === 'box' ? -f.lastArm : f.lastArm;
  if (type === 'box') f.lastArm = arm;
  f.action = { type, t: 0, phase: 'windup', arm, connected: false };
  f.vx *= 0.35;
  return true;
}

export function attackPoint(f) {
  const a = f.action;
  if (!a) return null;
  if (a.type === 'bite') {
    const m = MOVES.bite;
    return {
      x: f.x + f.facing * m.reach,
      y: ARENA.ground + f.y - m.hitHeight,
      r: m.hitRadius,
      move: m,
      type: 'bite'
    };
  }
  const m = MOVES[a.type];
  if (!m || a.phase !== 'active') return null;
  return {
    x: f.x + f.facing * m.reach,
    y: ARENA.ground - m.hitHeight,
    r: m.hitRadius,
    move: m,
    type: a.type
  };
}

export function circleHitsBody(point, target) {
  const b = bodyBox(target);
  const cx = Math.max(b.left, Math.min(point.x, b.right));
  const cy = Math.max(b.top, Math.min(point.y, b.bottom));
  const dx = point.x - cx;
  const dy = point.y - cy;
  return dx * dx + dy * dy <= point.r * point.r;
}

export function stepFighterTimers(f, dt) {
  if (f.stun > 0) f.stun = Math.max(0, f.stun - dt);
  if (f.vulnerable > 0) f.vulnerable = Math.max(0, f.vulnerable - dt);
  if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - dt);
  if (f.regenCd > 0) f.regenCd = Math.max(0, f.regenCd - dt);
}

export function integrate(f, dt) {
  // Airborne first: the bite arc owns the fighter until it lands.
  if (f.y < 0 || f.vy !== 0) {
    f.vy += PHYSICS.gravity * dt;
    f.y += f.vy * dt;
    if (f.y >= 0) {
      f.y = 0;
      f.vy = 0;
    }
  }
  f.x += f.vx * dt;
  f.vx *= Math.exp(-PHYSICS.drag * dt);
  if (Math.abs(f.vx) < 2) f.vx = 0;

  // Fighters can be shoved past the line - that is the ring-out - but never
  // off the world.
  const edge = 40;
  if (f.x < edge) {
    f.x = edge;
    f.vx = 0;
  }
  if (f.x > ARENA.width - edge) {
    f.x = ARENA.width - edge;
    f.vx = 0;
  }
}
