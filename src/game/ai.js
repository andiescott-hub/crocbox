import { FINISHER_THRESHOLD } from './constants.js';
import { canAct } from './fighter.js';

// A deliberately small opponent brain. `skill` (0..1) comes from the ladder
// entry and moves four dials: how often it thinks, how often it commits, how
// well it protects its own boundary, and whether it hunts the finisher.
export function createBrain(skill) {
  return { skill, think: 0.2 + (1 - skill) * 0.45, intent: 'approach', hold: 0, reactedTo: null };
}

export function stepBrain(brain, self, foe, dt, out) {
  out.left = false;
  out.right = false;
  out.scratch = false;
  out.box = false;
  out.bite = false;
  out.regen = false;

  brain.think -= dt;
  brain.hold = Math.max(0, brain.hold - dt);

  const gap = Math.abs(foe.x - self.x);
  const dir = Math.sign(foe.x - self.x) || 1;
  const s = brain.skill;

  // A crocodile in the air cannot turn, so stepping back is the answer to a
  // jump bite. How reliably it reads one is the clearest skill difference on
  // the ladder: croc 1 walks into most of them, croc 5 almost never does.
  const bite = foe.action?.type === 'bite' ? foe.action : null;
  if (bite && brain.reactedTo !== bite) {
    brain.reactedTo = bite;
    if (gap < 520 && Math.random() < 0.3 + s * 0.62) {
      brain.intent = 'dodge';
      brain.think = 0.1 + (1 - s) * 0.28;
      brain.hold = 0.8;
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
      if (dir > 0) out.left = true;
      else out.right = true;
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
  // [T13] The finisher cuts both ways. A confident opponent goes hunting for it
  // the moment the player's coat drops under the threshold.
  const finisherOn = foe.scales < FINISHER_THRESHOLD && Math.random() < 0.06 + s * 0.55;
  const r = Math.random();

  if (finisherOn && gap > 150 && gap < 460) {
    out.bite = true;
    brain.hold = 1.0 + (1 - s) * 0.8;
    return;
  }
  if (gap > 210) {
    if (r < 0.1 + s * 0.24) {
      out.bite = true;
      brain.hold = 1.2 + (1 - s) * 1.1;
    }
    return;
  }
  if (r < 0.42 + s * 0.2) {
    out.scratch = true;
    brain.hold = 0.3 + (1 - s) * 0.75;
  } else if (r < 0.8) {
    out.box = true;
    brain.hold = 0.55 + (1 - s) * 0.95;
  }
}
