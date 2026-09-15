import {
  AIR_WHIFF_RECOVERY,
  ARENA,
  BODY,
  GUARD,
  PHYSICS,
  REGEN,
  CLAW_MULTIPLIER,
  resolveMove
} from './constants.js';

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
    // What the left thumb is doing: 'stand', 'crouch' or 'air'.
    stance: 'stand',
    guarding: false,
    // One attack per jump, so the air is a commitment rather than a platform.
    airAttacked: false,
    downed: 0,
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

export const isAirborne = (f) => f.y < -0.5 || f.vy !== 0;

// Being in the air no longer blocks acting - attacking from up there is the
// point. What blocks it is having already spent this jump.
export const canAct = (f) =>
  !f.ko &&
  f.downed <= 0 &&
  f.stun <= 0 &&
  f.vulnerable <= 0 &&
  f.action === null &&
  !(isAirborne(f) && f.airAttacked);

export const isBusy = (f) => !canAct(f);

export function stanceOf(f) {
  if (isAirborne(f)) return 'air';
  return f.stance === 'crouch' ? 'crouch' : 'stand';
}

export function jump(f, heading = 0) {
  if (!canAct(f) || isAirborne(f)) return false;
  f.vy = PHYSICS.jumpVelocity;
  f.y = -0.001;
  // [T13] Airborne means committed. The heading is set at take-off and cannot
  // be changed, so a jump is a decision about where you will land.
  f.vx = heading * PHYSICS.jumpForward;
  f.airAttacked = false;
  f.guarding = false;
  f.stance = 'air';
  return true;
}

export function bodyBox(f) {
  return {
    left: f.x - BODY.halfWidth,
    right: f.x + BODY.halfWidth,
    top: ARENA.ground + f.y - BODY.height,
    bottom: ARENA.ground + f.y
  };
}

export function startMove(f, attack) {
  if (!canAct(f)) return false;

  if (attack === 'regenerate') {
    if (f.regenCd > 0 || f.hearts >= f.maxHearts || isAirborne(f)) return false;
    f.action = { type: 'regenerate', t: 0, duration: REGEN.duration, healed: false };
    f.vx = 0;
    f.guarding = false;
    return true;
  }

  const stance = stanceOf(f);
  const move = resolveMove(stance, attack);
  if (!move) return false;

  // [T13] Box is one arm. Alternate arms on consecutive punches.
  const arm = attack === 'box' ? -f.lastArm : f.lastArm;
  if (attack === 'box') f.lastArm = arm;

  f.action = { type: attack, stance, move, t: 0, phase: 'windup', arm, connected: false };
  // Throwing an attack drops the guard; you cannot hide behind it and hit.
  f.guarding = false;
  if (stance === 'air') f.airAttacked = true;
  else f.vx *= 0.35;
  return true;
}

export function attackPoint(f) {
  const a = f.action;
  if (!a || !a.move || a.phase !== 'active') return null;
  const m = a.move;
  return {
    x: f.x + f.facing * m.reach,
    // Air moves carry their hitbox down with the crocodile.
    y: ARENA.ground + f.y - m.hitHeight,
    r: m.hitRadius,
    move: m,
    type: a.type
  };
}

export const AIR_WHIFF = AIR_WHIFF_RECOVERY;

// Guard is a held state, not a move: firm lean away from the opponent, on the
// ground, not mid-attack.
export function updateGuard(f, axisAwayFromFoe) {
  f.guarding =
    !isAirborne(f) &&
    f.action === null &&
    f.stun <= 0 &&
    f.downed <= 0 &&
    !f.ko &&
    axisAwayFromFoe >= GUARD.threshold;
  return f.guarding;
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
  if (f.downed > 0) f.downed = Math.max(0, f.downed - dt);
}

export function integrate(f, dt) {
  // Airborne first: the bite arc owns the fighter until it lands.
  if (f.y < 0 || f.vy !== 0) {
    f.vy += PHYSICS.gravity * dt;
    f.y += f.vy * dt;
    if (f.y >= 0) {
      f.y = 0;
      f.vy = 0;
      f.airAttacked = false;
      if (f.stance === 'air') f.stance = 'stand';
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
