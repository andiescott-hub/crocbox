// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  padAxis,
  padVertical,
  readsAsJump,
  readsAsCrouch,
  createInput
} from '../src/game/useInput.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);

// dx is thumb displacement from the pad's centre, as a fraction of stage width.
// PAD_DEAD is 0.006 and full tilt is 0.055.
test('the pad reads a resting thumb as a dead stop', () => {
  near(padAxis(0), 0);
  near(padAxis(0.004), 0);
  // The original bug: easing back through the centre left the crocodile
  // walking, because the axis was only recomputed on the way out.
  near(padAxis(-0.003), 0);
});

test('the pad is proportional between the dead zone and full tilt', () => {
  near(padAxis(0.0305), 0.5);
  near(padAxis(-0.0305), -0.5);
});

test('the pad clamps at full tilt in both directions', () => {
  near(padAxis(0.055), 1);
  near(padAxis(-0.055), -1);
  near(padAxis(0.4), 1);
  near(padAxis(-0.4), -1);
});

test('a fresh input frame is at rest', () => {
  const i = createInput();
  assert.equal(i.axis, 0);
  assert.equal(i.vertical, 0);
  assert.equal(i.jump, false);
  assert.equal(i.left, false);
  assert.equal(i.right, false);
});

// Vertical is coarser than horizontal on purpose: walking must never trip a
// jump or a crouch, so the thumb has to mean it. dy is screen space, down
// positive, so up reads negative.
test('the pad ignores small vertical wobble while walking', () => {
  near(padVertical(0), 0);
  near(padVertical(-0.02), 0);
  near(padVertical(0.02), 0);
});

test('a firm flick up reads as a jump and a firm pull down as a crouch', () => {
  assert.ok(readsAsJump(padVertical(-0.075)));
  assert.ok(readsAsCrouch(padVertical(0.075)));
  // A gentle lean is neither.
  assert.ok(!readsAsJump(padVertical(-0.035)));
  assert.ok(!readsAsCrouch(padVertical(0.035)));
});
