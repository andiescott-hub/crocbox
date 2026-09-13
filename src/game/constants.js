// Every tuning number the fight uses. Values marked [T13] came from Tristan on
// 13 September 2026 and should not be changed without him. Everything else is
// a dial.

export const STAGE = { w: 1120, h: 671 };

export const ARENA = {
  width: 1900,
  ground: 520, // world y of the concrete
  boundary: 170 // painted amber lines sit this far in from each end
};

export const LEFT_LINE = ARENA.boundary;
export const RIGHT_LINE = ARENA.width - ARENA.boundary;
export const ARENA_MID = ARENA.width / 2;

export const BODY = { halfWidth: 78, height: 104 };

export const PHYSICS = {
  walkSpeed: 300,
  drag: 3.4, // exponential decay on knockback velocity, per second
  gravity: 2100,
  jumpVelocity: -860,
  jumpForward: 430
};

// [T13] The finisher. A jump bite that connects on a target under this many
// scales kills instantly, both ways. The single most important number here.
export const FINISHER_THRESHOLD = 25;

// [T13] Losing costs five scales. That is all.
export const DEFEAT_SCALE_COST = 5;

// PLAN.md §7.1 - shed counts before multipliers, and the screen shake per move.
export const MOVES = {
  scratch: {
    label: 'SCRATCH',
    windup: 0.1,
    active: 0.07,
    recover: 0.26,
    shed: 3,
    heartDamage: 1,
    push: 340,
    shake: 5,
    reach: 104,
    hitHeight: 58,
    hitRadius: 36,
    stun: 0.14
  },
  box: {
    label: 'BOX',
    windup: 0.22,
    active: 0.09,
    recover: 0.46,
    shed: 6,
    heartDamage: 1,
    push: 900,
    shake: 11,
    reach: 124,
    hitHeight: 70,
    hitRadius: 40,
    stun: 0.26
  },
  bite: {
    label: 'BITE',
    shed: 12,
    heartDamage: 2,
    push: 1180,
    shake: 17,
    reach: 96,
    hitHeight: 34,
    // Small and late on purpose: the bite is the only move with air time, so
    // it has to be aimed and it has to be dodgeable.
    hitRadius: 32,
    liveBelow: 78, // only live once the jaws are this close to the concrete
    stun: 0.34,
    // [proposed] A bite that misses leaves the biter open. Long enough that
    // throwing bites on spec is a losing strategy rather than the whole game.
    whiffRecovery: 1.5
  }
};

export const REGEN = {
  duration: 1.3, // animation locked; cannot act during
  heal: 1,
  healAt: 0.72, // fraction of the animation where the heart comes back
  cooldown: 14
};

export const HIT_STOP = 0.055;
export const KO_HANG = 0.55; // beat before the dance starts

export const CLAW_MULTIPLIER = (level) => 1 + 0.25 * level;
