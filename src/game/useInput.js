import { useEffect, useRef } from 'react';

// Keyboard for the desk, touch for the iPad. PLAN.md §3 lists the inputs:
// LMB/left tap scratch, RMB/right tap box, space/up-swipe jump bite, E regenerate.

const KEY_HELD = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyS: 'crouch',
  ArrowDown: 'crouch'
};

const KEY_PRESS = {
  KeyJ: 'scratch',
  KeyK: 'box',
  KeyL: 'bite',
  Space: 'jump',
  KeyW: 'jump',
  ArrowUp: 'jump',
  KeyE: 'regen'
};

// How far the thumb travels for full tilt, and the slack around the centre,
// as fractions of the stage so they hold at any screen size.
const PAD_FULL = 0.055; // about 62px at the 1120px reference
const PAD_DEAD = 0.006;
// Vertical is coarser on purpose: walking must never trip a jump or a crouch,
// so the thumb has to mean it. Measured against stage height.
const PAD_V_FULL = 0.075;
const PAD_V_DEAD = 0.028;
const JUMP_AT = 0.6;
const CROUCH_AT = -0.45;

// Thumb displacement to speed. Pulled out as a pure function so it can be
// asserted on directly; the rest of the pad is DOM plumbing around it.
export function padAxis(dx) {
  const t = (Math.abs(dx) - PAD_DEAD) / (PAD_FULL - PAD_DEAD);
  return t <= 0 ? 0 : Math.sign(dx) * Math.min(1, t);
}

// Positive is up. dy is in screen space, where down is positive, so it flips.
export function padVertical(dy) {
  const up = -dy;
  const t = (Math.abs(up) - PAD_V_DEAD) / (PAD_V_FULL - PAD_V_DEAD);
  return t <= 0 ? 0 : Math.sign(up) * Math.min(1, t);
}

export const readsAsJump = (v) => v >= JUMP_AT;
export const readsAsCrouch = (v) => v <= CROUCH_AT;

export function createInput() {
  // `axis` and `vertical` are the analog pad, -1 to 1. Keyboard keeps the
  // booleans. `jump` is an edge, `crouch` and `vertical` are held.
  return {
    left: false,
    right: false,
    crouch: false,
    axis: 0,
    vertical: 0,
    jump: false,
    scratch: false,
    box: false,
    bite: false,
    regen: false
  };
}

export function useMatchInput(stageRef, { enabled = true, onAnyInput, padRef } = {}) {
  const input = useRef(createInput());

  const press = (name) => {
    if (onAnyInput && onAnyInput(name) === false) return;
    if (name in input.current) input.current[name] = true;
  };

  useEffect(() => {
    if (!enabled) return undefined;

    const down = (e) => {
      if (e.repeat) return;
      const held = KEY_HELD[e.code];
      if (held) {
        input.current[held] = true;
        if (onAnyInput) onAnyInput(held);
        e.preventDefault();
        return;
      }
      const hit = KEY_PRESS[e.code];
      if (hit) {
        press(hit);
        e.preventDefault();
      }
    };
    const up = (e) => {
      const held = KEY_HELD[e.code];
      if (held) input.current[held] = false;
    };
    const blur = () => {
      input.current.left = false;
      input.current.right = false;
      input.current.crouch = false;
      input.current.axis = 0;
      input.current.vertical = 0;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [enabled, onAnyInput]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !enabled) return undefined;

    // Left half is the movement hand, right half is the fighting hand, and the
    // two never overlap. Put a thumb down anywhere on the left and that spot
    // becomes the centre: push left to back off, push right to close in, let go
    // to stop. No fixed stick to find and nothing to look at while fighting.
    //
    // One entry per finger, and no pointer capture: capturing on the stage
    // would swallow the HUD buttons, and holding the pad with one thumb while
    // tapping BOX with the other is the whole point on an iPad.
    const active = new Map();
    let padId = null;

    const rectPos = (e) => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };

    const showPad = (t) => {
      const host = padRef?.current;
      if (!host) return;
      const [ring, nub] = host.children;
      if (!ring || !nub) return;
      host.style.opacity = '1';
      ring.style.left = `${t.originX * 100}%`;
      ring.style.top = `${t.originY * 100}%`;
      nub.style.left = `${t.thumbX * 100}%`;
      nub.style.top = `${t.thumbY * 100}%`;
    };

    const hidePad = () => {
      if (padRef?.current) padRef.current.style.opacity = '0';
    };

    const onDown = (e) => {
      // Anything inside the HUD is a button; let it handle its own press.
      if (e.target instanceof Element && e.target.closest('.hud')) return;

      if (e.pointerType === 'mouse') {
        // Mouse keeps the handoff's mapping straight off the buttons.
        press(e.button === 2 ? 'box' : 'scratch');
        e.preventDefault();
        return;
      }

      const p = rectPos(e);
      const zone = p.x < 0.5 ? 'move' : 'hit';
      const t = {
        zone,
        pointerType: e.pointerType,
        originX: p.x,
        originY: p.y,
        thumbX: p.x,
        thumbY: p.y,
        axis: 0,
        vertical: 0,
        jumped: false,
        moved: false,
        t0: performance.now()
      };
      active.set(e.pointerId, t);

      if (zone === 'move') {
        // The newest thumb owns the pad, so shifting grip just re-centres.
        padId = e.pointerId;
        showPad(t);
      }
      e.preventDefault();
    };

    const onMove = (e) => {
      const t = active.get(e.pointerId);
      // Mouse and touch can be handed the same pointer id, and on a hybrid
      // device a stray cursor move would otherwise steer the pad.
      if (!t || t.pointerType !== e.pointerType) return;
      const p = rectPos(e);
      t.thumbX = p.x;
      t.thumbY = p.y;

      if (t.zone === 'move') {
        let dx = p.x - t.originX;
        // Push past full tilt sideways and the centre follows, so you never run
        // out of screen mid-fight. Vertical does not recentre: up and down are
        // deliberate gestures, not a place the thumb should be able to settle.
        if (Math.abs(dx) > PAD_FULL) {
          t.originX = p.x - Math.sign(dx) * PAD_FULL;
          dx = Math.sign(dx) * PAD_FULL;
        }
        t.axis = padAxis(dx);
        t.vertical = padVertical(p.y - t.originY);

        // Jump is an edge, so holding the thumb up does not pogo. It re-arms
        // once the thumb comes back toward the middle.
        if (readsAsJump(t.vertical)) {
          if (!t.jumped) {
            t.jumped = true;
            press('jump');
          }
        } else if (t.vertical < JUMP_AT * 0.5) {
          t.jumped = false;
        }

        if (e.pointerId === padId) showPad(t);
        applyAxis();
      }
    };

    const onUp = (e) => {
      const t = active.get(e.pointerId);
      if (!t || t.pointerType !== e.pointerType) return;
      active.delete(e.pointerId);

      if (t.zone === 'hit' && !t.moved && performance.now() - t.t0 < 260) {
        press('box');
      }
      if (e.pointerId === padId) {
        padId = null;
        // Hand back to another thumb still on the pad, if there is one.
        for (const [id, other] of active) {
          if (other.zone === 'move') {
            padId = id;
            showPad(other);
            break;
          }
        }
        if (padId === null) hidePad();
      }
      applyAxis();
    };

    // Releasing always stops the crocodile, and so does easing back to centre.
    // The old build only recomputed on the way out, so a thumb returning to the
    // middle kept walking.
    function applyAxis() {
      let axis = 0;
      let vertical = 0;
      for (const t of active.values()) {
        if (t.zone !== 'move') continue;
        if (t.axis && Math.abs(t.axis) > Math.abs(axis)) axis = t.axis;
        if (t.vertical && Math.abs(t.vertical) > Math.abs(vertical)) vertical = t.vertical;
      }
      input.current.axis = axis;
      // Only the crouch half of the vertical range is held; the jump half is
      // consumed as an edge above.
      input.current.vertical = readsAsCrouch(vertical) ? vertical : 0;
    }

    const noMenu = (e) => e.preventDefault();

    // A finger lifted outside the stage, or a touch iOS quietly cancels, never
    // reports to the element. Without a window-level backstop the crocodile
    // would walk off on its own.
    const onLostPointer = (e) => {
      if (active.has(e.pointerId)) onUp(e);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', noMenu);
    window.addEventListener('pointerup', onLostPointer);
    window.addEventListener('pointercancel', onLostPointer);
    window.addEventListener('blur', hidePad);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('pointerup', onLostPointer);
      window.removeEventListener('pointercancel', onLostPointer);
      window.removeEventListener('blur', hidePad);
      input.current.axis = 0;
      hidePad();
    };
  }, [stageRef, enabled, onAnyInput, padRef]);

  const clearEdges = () => {
    const i = input.current;
    i.scratch = false;
    i.box = false;
    i.bite = false;
    i.regen = false;
    i.jump = false;
  };

  return { input, press, clearEdges };
}
