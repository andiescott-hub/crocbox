import { SAVE_KEY, freshState } from './initialState.js';

// One key, one blob. PLAN.md §1: no server, no account.
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.player) return null;
    const base = freshState();
    return {
      ...base,
      player: { ...base.player, ...data.player },
      ladder: Array.isArray(data.ladder) && data.ladder.length ? data.ladder : base.ladder,
      training: { ...base.training, ...(data.training || {}) }
    };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        player: state.player,
        ladder: state.ladder,
        training: state.training
      })
    );
  } catch {
    // A full or blocked localStorage must never take the game down.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
