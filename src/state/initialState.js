import { LADDER } from '../data/ladder.js';
import { TINTS } from '../data/palette.js';

export const SAVE_KEY = 'crocbox.save.v1';

// Starting scales sit well above the finisher threshold on purpose. The player
// needs a few hits of buffer before a jump bite can end them, otherwise every
// fight collapses into a bite race and nothing else in the model gets to work.
export const STARTING_SCALES = 45;

export function freshState() {
  return {
    screen: 'title',
    player: {
      name: 'CROCO',
      tint: TINTS[0].value,
      nameplate: 'BITE ME',
      scales: STARTING_SCALES,
      hearts: 3,
      maxHearts: 3,
      clawLevel: 0,
      bagLevel: 2, // README: LVL 1 and LVL 2 are owned from the start
      victoryDance: null
    },
    ladder: LADDER.map((c, i) => ({
      id: c.id,
      rank: c.rank,
      reward: c.reward,
      state: i === 0 ? 'available' : 'locked'
    })),
    training: { bagTier: 2, bagDamage: 0 },
    match: null,
    lastResult: null
  };
}
