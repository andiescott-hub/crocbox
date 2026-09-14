// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { padAxis, createInput } from '../src/game/useInput.js';

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
  assert.equal(i.left, false);
  assert.equal(i.right, false);
});
