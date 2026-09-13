import { useEffect, useRef } from 'react';

// Keyboard for the desk, touch for the iPad. PLAN.md §3 lists the inputs:
// LMB/left tap scratch, RMB/right tap box, space/up-swipe jump bite, E regenerate.

const KEY_HELD = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right'
};

const KEY_PRESS = {
  KeyJ: 'scratch',
  KeyK: 'box',
  Space: 'bite',
  KeyW: 'bite',
  ArrowUp: 'bite',
  KeyE: 'regen'
};

export function createInput() {
  return { left: false, right: false, scratch: false, box: false, bite: false, regen: false };
}

export function useMatchInput(stageRef, { enabled = true, onAnyInput } = {}) {
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

    // One entry per finger. No pointer capture: capturing on the stage would
    // swallow the HUD buttons, and holding the movement pad with one thumb
    // while tapping BOX with the other is the whole point on an iPad.
    const active = new Map();

    const rectPos = (e) => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
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
      active.set(e.pointerId, {
        x0: p.x,
        y0: p.y,
        moved: false,
        t0: performance.now(),
        // Left half of the arena is the movement pad, right half is attacks.
        zone: p.x < 0.5 ? 'move' : 'hit'
      });
      e.preventDefault();
    };

    const applyHeld = () => {
      let left = false;
      let right = false;
      for (const t of active.values()) {
        if (t.zone === 'move' && t.moved) {
          left = left || t.dir < 0;
          right = right || t.dir > 0;
        }
      }
      input.current.left = left;
      input.current.right = right;
    };

    const onMove = (e) => {
      const t = active.get(e.pointerId);
      if (!t) return;
      const p = rectPos(e);
      const dx = p.x - t.x0;
      const dy = p.y - t.y0;

      if (t.zone === 'move' && Math.abs(dx) > 0.012) {
        t.moved = true;
        t.dir = Math.sign(dx);
        applyHeld();
      }
      // Up-swipe is the jump bite, from either half.
      if (dy < -0.09 && Math.abs(dy) > Math.abs(dx)) {
        t.moved = true;
        press('bite');
        t.y0 = p.y;
      }
    };

    const onUp = (e) => {
      const t = active.get(e.pointerId);
      if (!t) return;
      active.delete(e.pointerId);
      if (!t.moved && performance.now() - t.t0 < 260) {
        press(t.zone === 'move' ? 'scratch' : 'box');
      }
      applyHeld();
    };

    const noMenu = (e) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', noMenu);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('contextmenu', noMenu);
    };
  }, [stageRef, enabled, onAnyInput]);

  const clearEdges = () => {
    const i = input.current;
    i.scratch = false;
    i.box = false;
    i.bite = false;
    i.regen = false;
  };

  return { input, press, clearEdges };
}
