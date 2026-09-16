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

// How close two crocodiles can stand. Every attack reach and every range the
// opponent brain reasons about is measured from here, so this is the one number
// to change if the rig's proportions change again. Nose to nose has to be far
// enough apart that two long snouts do not read as one animal.
export const SEPARATION = 240;
// What a grounded attack has to cross to reach the far crocodile's body.
export const CONTACT = SEPARATION - BODY.halfWidth;

export const PHYSICS = {
  walkSpeed: 300,
  drag: 3.4, // exponential decay on knockback velocity, per second
  gravity: 2100,
  jumpVelocity: -860,
  jumpForward: 430
};

// [T13] The finisher. A jump bite that connects on a target under this many
// scales kills instantly, both ways. The single most important number here,
// and the plan says to expect to move it.
//
// Moved from 25 to 1, so it lands on a crocodile with no coat left at all.
// At 25 the lethal window was open for half of a fight against croc 1, whose
// whole coat is 30, so the fight was over the moment it began and every other
// move was preamble. At 1 the coat has to come off first, which is what
// scratch, box, sweep and uppercut are for, and the window is a fifth of the
// fight rather than half.
//
// It also makes the rule visible. Under 25 scales looks like any other
// crocodile; no scales at all is [T13]'s underpants state, readable from across
// the arena and already described in the plan as "one good hit from losing".
// Put it back to 25 here if Tristan wants his number.
export const FINISHER_THRESHOLD = 1;

// [T13] Losing costs five scales. That is all.
export const DEFEAT_SCALE_COST = 5;

// The move grid. Three attack buttons crossed with three stances from the left
// thumb, Mortal Kombat style: the button says how you hit, the stance says what
// the hit does. Nine moves out of four controls, and the jump bite stops being
// a button you can mash.
//
// PLAN.md §7.1 shed counts (scratch 3, box 6, bite 12) are the standing and
// airborne baselines; the stance multiplies from there.

export const ATTACKS = {
  scratch: {
    windup: 0.1,
    active: 0.07,
    recover: 0.26,
    shed: 3,
    heartDamage: 1,
    push: 300,
    shake: 6,
    hitStop: 0.035,
    reach: 136,
    hitHeight: 58,
    hitRadius: 36,
    stun: 0.2
  },
  box: {
    windup: 0.22,
    active: 0.09,
    recover: 0.46,
    shed: 6,
    heartDamage: 1,
    push: 1150,
    shake: 15,
    hitStop: 0.1,
    reach: 140,
    hitHeight: 70,
    hitRadius: 40,
    stun: 0.4
  },
  bite: {
    windup: 0.16,
    active: 0.1,
    recover: 0.36,
    shed: 8,
    heartDamage: 2,
    push: 400,
    shake: 12,
    hitStop: 0.08,
    reach: 138,
    hitHeight: 52,
    hitRadius: 38,
    stun: 0.3
  }
};

// What the left thumb is doing. `names` drive the HUD button labels, which is
// how the grid teaches itself without a tutorial screen.
export const STANCES = {
  stand: {
    shed: 1,
    push: 1,
    stun: 1,
    names: { scratch: 'SCRATCH', box: 'BOX', bite: 'BITE' }
  },
  crouch: {
    shed: 1.2,
    push: 0.8,
    stun: 1.2,
    names: { scratch: 'SWEEP', box: 'UPPER CUT', bite: 'CHOMP' }
  },
  air: {
    shed: 1.35,
    push: 1,
    stun: 1.1,
    names: { scratch: 'DIVE', box: 'HAMMER', bite: 'JUMP BITE' }
  }
};

// Per-cell overrides, absolute rather than multiplied. Only where a move is
// genuinely its own thing rather than a harder version of the standing one.
export const CELLS = {
  'crouch.scratch': { effect: 'knockdown', reach: 148, hitHeight: 24, stun: 0.8, push: 520, shake: 12 },
  // The anti-air. Catching a jumping crocodile with this is the whole point of
  // crouching, and it is what stops the air game running the fight.
  'crouch.box': { effect: 'launch', push: 380, launch: -780, stun: 0.55, shake: 17, hitHeight: 46, reach: 134 },
  'crouch.bite': { effect: 'clamp', push: 0, stun: 0.95, hitHeight: 30, reach: 138, shake: 10 },
  // Air windows are long: you commit at the top of the jump and the hit is
  // live most of the way down, so timing the jump is the skill, not the frame.
  'air.scratch': { reach: 106, hitHeight: 40, hitStop: 0.05, windup: 0.06, active: 0.26 },
  'air.box': { effect: 'slam', push: 620, shake: 18, hitHeight: 46, hitStop: 0.11, windup: 0.12, active: 0.3 },
  // [T13] The finisher lives here now, and only here.
  'air.bite': {
    effect: 'finisher',
    shed: 12,
    push: 430,
    shake: 21,
    hitStop: 0.12,
    reach: 112,
    hitHeight: 34,
    hitRadius: 32,
    windup: 0.1,
    active: 0.34
  }
};

export function resolveMove(stance, attack) {
  const base = ATTACKS[attack];
  if (!base) return null;
  const st = STANCES[stance] ?? STANCES.stand;
  const cell = CELLS[`${stance}.${attack}`] ?? {};
  return {
    attack,
    stance,
    label: st.names[attack],
    ...base,
    shed: Math.max(1, Math.round(base.shed * st.shed)),
    push: base.push * st.push,
    stun: base.stun * st.stun,
    ...cell
  };
}

export const moveLabel = (stance, attack) => (STANCES[stance] ?? STANCES.stand).names[attack];

// Held guard. Pulling the thumb firmly away from the opponent plants the
// crocodile behind its forearms.
export const GUARD = {
  // How far back the thumb has to lean before a retreat becomes a block.
  threshold: 0.6,
  shed: 0.3,
  push: 0.3,
  stun: 0.45,
  walkScale: 0.55,
  // [proposed] A guarded jump bite still hurts, but it does not finish you.
  // Without this the finisher is unanswerable, which is what left it ending
  // nine fights in ten.
  stopsFinisher: true
};

// Jumping is the left thumb's job now, so nothing gates it but the landing.
export const JUMP = { cooldown: 0 };

export const REGEN = {
  duration: 1.3, // animation locked; cannot act during
  heal: 1,
  healAt: 0.72, // fraction of the animation where the heart comes back
  cooldown: 14
};

// Per-move now; the constant is the floor for anything that does not set one.
export const HIT_STOP = 0.05;

// Landing an air attack that missed. Being committed in the air is the cost of
// the stance, and the reason the crouch uppercut has something to punish.
export const AIR_WHIFF_RECOVERY = 0.85;
export const KO_HANG = 0.55; // beat before the dance starts

export const CLAW_MULTIPLIER = (level) => 1 + 0.25 * level;
