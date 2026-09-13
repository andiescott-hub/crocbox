import { DEFEAT_SCALE_COST } from '../game/constants.js';
import { LADDER } from '../data/ladder.js';
import { BAGS, BAG_UPGRADE_COST, getBag } from '../data/bags.js';
import { STALLS } from '../data/market.js';
import { freshState } from './initialState.js';

const stallCost = (id) => STALLS.find((s) => s.id === id)?.cost ?? Infinity;

export function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...action.state, screen: 'title' };

    case 'goto':
      return { ...state, screen: action.screen, match: null };

    case 'start-match': {
      const entry = state.ladder.find((e) => e.id === action.id);
      if (!entry || entry.state === 'locked') return state;
      return { ...state, screen: 'match', match: { opponentId: action.id }, lastResult: null };
    }

    // Settles a finished fight. PLAN.md §3: a win pays the reward, a loss costs
    // five scales and nothing else. Hearts carry out of the fight so FOOD has a
    // job, but a defeat restores them - losing must not spiral. [proposed]
    case 'match-result': {
      const { won, reason, heartsLeft, opponentId } = action;
      const player = { ...state.player };
      const opponent = LADDER.find((c) => c.id === opponentId);

      if (won) {
        player.scales += opponent ? opponent.reward : 0;
        player.hearts = Math.max(1, heartsLeft);
      } else {
        player.scales = Math.max(0, player.scales - DEFEAT_SCALE_COST);
        player.hearts = player.maxHearts;
      }

      let ladder = state.ladder;
      if (won) {
        const idx = state.ladder.findIndex((e) => e.id === opponentId);
        ladder = state.ladder.map((e, i) => {
          if (i === idx) return { ...e, state: 'beaten' };
          if (i === idx + 1 && e.state === 'locked') return { ...e, state: 'available' };
          return e;
        });
      }

      return {
        ...state,
        player,
        ladder,
        match: null,
        screen: 'ladder',
        lastResult: { won, reason, opponentId, reward: won && opponent ? opponent.reward : 0 }
      };
    }

    case 'buy': {
      const cost = stallCost(action.item);
      if (state.player.scales < cost) return state;
      const player = { ...state.player, scales: state.player.scales - cost };
      switch (action.item) {
        case 'hearts':
          player.maxHearts += 1;
          player.hearts += 1;
          break;
        case 'food':
          player.hearts = player.maxHearts;
          break;
        case 'claws':
          player.clawLevel += 1;
          break;
        case 'bags': {
          const next = getBag(player.bagLevel + 1);
          if (!next || next.locked) return state;
          player.bagLevel = next.tier;
          break;
        }
        default:
          return state;
      }
      return { ...state, player };
    }

    case 'upgrade-bag': {
      const next = BAGS.find((b) => b.tier === state.training.bagTier + 1);
      if (!next || next.locked) return state;
      if (state.player.scales < BAG_UPGRADE_COST) return state;
      return {
        ...state,
        player: {
          ...state.player,
          scales: state.player.scales - BAG_UPGRADE_COST,
          bagLevel: Math.max(state.player.bagLevel, next.tier)
        },
        training: { bagTier: next.tier, bagDamage: 0 }
      };
    }

    case 'set-bag-tier':
      return { ...state, training: { bagTier: action.tier, bagDamage: 0 } };

    case 'bag-progress':
      return {
        ...state,
        player: action.hearts !== undefined ? { ...state.player, hearts: action.hearts } : state.player,
        training: { ...state.training, bagDamage: action.damage }
      };

    case 'customise':
      return { ...state, player: { ...state.player, ...action.patch } };

    case 'reset':
      return { ...freshState(), screen: 'ladder' };

    default:
      return state;
  }
}
