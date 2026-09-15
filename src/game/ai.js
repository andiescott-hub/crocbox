import { FINISHER_THRESHOLD } from './constants.js';
import { canAct, isAirborne } from './fighter.js';

// A deliberately small opponent brain. `skill` (0..1) comes from the ladder
// entry and moves four dials: how often it thinks, how often it commits, how
// well it protects its own boundary, and whether it hunts the finisher.
export function createBrain(skill) {
  return {
    skill,
    think: 0.2 + (1 - skill) * 0.45,
    intent: 'approach',
    hold: 0,
    reactedTo: null,
    airPlan: null
  };
}

export function stepBrain(brain, self, foe, dt, out) {
  out.left = false;
  out.right = false;
  out.vertical = 0;
  out.jump = false;
  out.scratch = false;
  out.box = false;
  out.bite = false;
  out.regen = false;

  brain.think -= dt;
  brain.hold = Math.max(0, brain.hold - dt);

  const gap = Math.abs(foe.x - self.x);
  const dir = Math.sign(foe.x - self.x) || 1;
  const s = brain.skill;

  // Already committed to a jump: spend it. One attack per jump, so this is the
  // only chance.
  if (isAirborne(self)) {
    if (!self.airAttacked && canAct(self) && self.vy > -260) {
      const plan = brain.airPlan ?? 'box';
      out[plan] = true;
      brain.airPlan = null;
    }
    return out;
  }

  // A crocodile under the finisher threshold is one jump bite from losing, and
  // it knows it. Everything below gets sharper when its coat is that thin.
  const cornered = self.scales < FINISHER_THRESHOLD;
  const alert = cornered ? 0.35 + s * 0.6 : 0.2 + s * 0.5;

  // Anti-air. A crouched uppercut catches a jumping crocodile and puts it back
  // in the air, and it is the reason the air game does not run the fight.
  const incoming = isAirborne(foe) && foe.vy > -300;
  if (incoming && gap < 320 && Math.random() < alert) {
    out.vertical = -1;
    out.box = true;
    brain.hold = 0.35;
    return out;
  }

  // Out of uppercut range, back off instead. Full tilt away is also a guard,
  // and a guard refuses the finisher outright.
  if (incoming && gap < 560 && Math.random() < (cornered ? 0.55 + s * 0.4 : 0.25 + s * 0.5)) {
    brain.intent = 'dodge';
    brain.think = 0.1 + (1 - s) * 0.26;
    brain.hold = cornered ? 0.9 : 0.6;
  }

  // Guard a wind-up. Reading it is skill; croc 1 rarely does.
  const windup = foe.action && foe.action.phase === 'windup' ? foe.action : null;
  if (windup && brain.reactedTo !== windup) {
    brain.reactedTo = windup;
    if (gap < 260 && Math.random() < 0.05 + s * 0.45) {
      brain.intent = 'dodge';
      brain.hold = 0.45;
      brain.think = 0.25;
    }
  }

  if (brain.think <= 0) {
    brain.think = 0.16 + (1 - s) * 0.4 + Math.random() * 0.2;

    if (self.hearts <= 1 && self.regenCd <= 0 && gap > 430 && self.scales === 0) {
      brain.intent = 'regen';
    } else if (self.pushProgress > 0.62) {
      // Being shoved toward its own line: fight back into the middle.
      brain.intent = 'charge';
    } else if (gap > 300) {
      brain.intent = 'approach';
    } else if (gap < 150 && Math.random() < 0.3 * (1 - s) + 0.2) {
      // Reset the spacing rather than standing in the pocket trading forever.
      brain.intent = 'retreat';
    } else {
      brain.intent = 'strike';
    }
  }

  if (!canAct(self)) return out;

  switch (brain.intent) {
    case 'dodge':
      // Full tilt away is also a guard, which is the point of retreating.
      if (dir > 0) out.left = true;
      else out.right = true;
      break;
    case 'airattack':
      out.jump = true;
      brain.intent = 'approach';
      break;
    case 'regen':
      out.regen = true;
      break;
    case 'retreat':
      if (dir > 0) out.left = true;
      else out.right = true;
      break;
    case 'approach':
    case 'charge':
      if (dir > 0) out.right = true;
      else out.left = true;
      if (gap < 190 && brain.hold <= 0 && Math.random() < 0.5 + s * 0.4) {
        pickAttack(brain, self, foe, out, gap, s);
      }
      break;
    case 'strike':
    default:
      if (gap > 165) {
        if (dir > 0) out.right = true;
        else out.left = true;
      }
      if (brain.hold <= 0) pickAttack(brain, self, foe, out, gap, s);
      break;
  }

  return out;
}

function pickAttack(brain, self, foe, out, gap, s) {
  const r = Math.random();

  // [T13] The finisher cuts both ways, but it now costs a jump. A confident
  // opponent goes hunting for it once the player's coat drops under the line.
  const finisherOn = foe.scales < FINISHER_THRESHOLD && Math.random() < 0.08 + s * 0.5;
  if (finisherOn && gap > 150 && gap < 430 && !foe.guarding) {
    brain.airPlan = 'bite';
    brain.intent = 'airattack';
    out.jump = true;
    brain.hold = 1.1 + (1 - s) * 0.9;
    return;
  }

  // A grounded crocodile that will not crouch is asking for a sweep.
  if (gap < 190 && r < 0.14 + s * 0.16) {
    out.vertical = -1;
    out.scratch = true;
    brain.hold = 0.5 + (1 - s) * 0.6;
    return;
  }

  // Guarding opponents have to be opened up; a jump attack goes over the top.
  if (gap > 200 && gap < 430 && (foe.guarding || r < 0.08 + s * 0.16)) {
    brain.airPlan = r < 0.5 ? 'box' : 'scratch';
    brain.intent = 'airattack';
    out.jump = true;
    brain.hold = 1.0 + (1 - s) * 0.9;
    return;
  }

  if (gap > 210) return;

  if (r < 0.38 + s * 0.18) {
    out.scratch = true;
    brain.hold = 0.3 + (1 - s) * 0.75;
  } else if (r < 0.72) {
    out.box = true;
    brain.hold = 0.55 + (1 - s) * 0.95;
  } else {
    out.bite = true;
    brain.hold = 0.45 + (1 - s) * 0.8;
  }
}
