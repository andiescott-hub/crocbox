// The move grid. Three attack buttons crossed with three stances.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMove, STANCES, ATTACKS, FINISHER_THRESHOLD } from '../src/game/constants.js';

const stances = Object.keys(STANCES);
const attacks = Object.keys(ATTACKS);

test('every stance and attack pair resolves to a usable move', () => {
  for (const stance of stances) {
    for (const attack of attacks) {
      const m = resolveMove(stance, attack);
      assert.ok(m, `${stance}.${attack} missing`);
      assert.ok(m.label && m.label.length, `${stance}.${attack} has no label`);
      assert.ok(m.shed >= 1 && m.active > 0 && m.reach > 0);
    }
  }
});

test('the nine moves have nine distinct names, so the buttons always tell you', () => {
  const names = stances.flatMap((s) => attacks.map((a) => resolveMove(s, a).label));
  assert.equal(new Set(names).size, 9);
});

test('only the airborne bite finishes', () => {
  const finishers = stances.flatMap((s) =>
    attacks.filter((a) => resolveMove(s, a).effect === 'finisher').map((a) => `${s}.${a}`)
  );
  assert.deepEqual(finishers, ['air.bite']);
});

test('box owns the shove and the jump bite does not', () => {
  const box = resolveMove('stand', 'box');
  const jumpBite = resolveMove('air', 'bite');
  const scratch = resolveMove('stand', 'scratch');
  assert.ok(box.push > jumpBite.push * 2, 'box should shove far harder than a pounce');
  assert.ok(box.push > scratch.push);
});

test('the crouched uppercut is the anti-air', () => {
  const upper = resolveMove('crouch', 'box');
  assert.equal(upper.effect, 'launch');
  assert.ok(upper.launch < 0, 'launch sends the target upward');
});

test('the finisher lands on a stripped crocodile', () => {
  // Zero scales is inside the window, one scale is not.
  assert.ok(0 < FINISHER_THRESHOLD);
  assert.ok(!(1 < FINISHER_THRESHOLD));
});
