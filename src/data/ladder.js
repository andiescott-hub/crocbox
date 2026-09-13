// Ladder data. PLAN.md §5 - keep this an array of configs, never five hardcoded
// cards, so a second dimension can be appended without a rewrite.
//
// `coat` and `hearts` are [proposed] numbers (PLAN.md §5). Rewards are Tristan's.
// `power` multiplies what the opponent sheds off you, and `skill` drives the
// brain in game/ai.js. Both are [proposed] dials, not Tristan's numbers: croc 1
// has to be a pushover or the first fight teaches the wrong lesson.
export const LADDER = [
  { id: 'croc-1', rank: 1, name: 'CROC 1', coat: 30, hearts: 3, reward: 1, tint: '#c9d6a4', skill: 0.14, power: 0.5 },
  { id: 'croc-2', rank: 2, name: 'CROC 2', coat: 40, hearts: 4, reward: 2, tint: '#e2c48a', skill: 0.3, power: 0.65 },
  { id: 'croc-3', rank: 3, name: 'CROC 3', coat: 55, hearts: 5, reward: 4, tint: '#d79a7c', skill: 0.5, power: 0.82 },
  { id: 'croc-4', rank: 4, name: 'CROC 4', coat: 70, hearts: 5, reward: 8, tint: '#b98fd0', skill: 0.68, power: 0.95 },
  { id: 'croc-5', rank: 5, name: 'CROC 5', coat: 90, hearts: 6, reward: 16, tint: '#e08585', skill: 0.78, power: 1 }
];

// Portraits grow with rank (README §5).
// Open question 5 for Tristan is how much armour each croc should have, and
// the table above is the plan's guess. It produces five to eleven second
// fights, not the thirty to sixty the plan asks for. `node tools/simulate.mjs`
// measures this. Roughly doubling the coats and halving `power` gets fights to
// fifteen to twenty seconds and brings ring-outs up from 5% to ~30%:
//
//   coat 55/80/110/150/200, power 0.34/0.44/0.56/0.66/0.76
//
// That is a bigger change than a tuning pass, so it waits for him.
export const portraitScale = (rank) => 0.78 + rank * 0.09;

export const getCroc = (id) => LADDER.find((c) => c.id === id);
