// Headless balance harness. The fight sim has no DOM dependency, so the whole
// ladder can be played thousands of times in a second. Use it before touching
// coats, rewards or the finisher threshold.
//
//   node tools/simulate.mjs [runsPerCroc] [playerSkill]

import { createMatch, stepMatch } from '../src/game/combat.js';
import { createBrain, stepBrain } from '../src/game/ai.js';
import { LADDER } from '../src/data/ladder.js';
import { FINISHER_THRESHOLD } from '../src/game/constants.js';
import { STARTING_SCALES } from '../src/state/initialState.js';

const runs = Number(process.argv[2] ?? 400);
const playerSkill = Number(process.argv[3] ?? 0.6);
const DT = 1 / 60;
const MAX_SECONDS = 120;

function playOnce(opponent, player) {
  const match = createMatch({ player, opponent });
  const brain = createBrain(playerSkill);
  const out = {};
  let t = 0;
  while (!match.outcome && t < MAX_SECONDS) {
    const input =
      match.status === 'fighting' ? stepBrain(brain, match.player, match.opp, DT, out) : {};
    stepMatch(match, DT, input);
    if (input.scratch) input.scratch = false;
    if (input.box) input.box = false;
    if (input.bite) input.bite = false;
    if (input.regen) input.regen = false;
    t += DT;
  }
  return {
    won: match.outcome?.winner === 'player',
    reason: match.outcome?.reason ?? 'timeout',
    seconds: t,
    scalesLeft: match.player.scales
  };
}

const PROFILES = {
  fresh: { scales: STARTING_SCALES, hearts: 3, maxHearts: 3, clawLevel: 0 },
  geared: { scales: 70, hearts: 5, maxHearts: 5, clawLevel: 2 }
};

function report(label, gear) {
  const player = { name: 'CROCO', nameplate: '', tint: '#ffffff', ...gear };
  console.log(
    `\n${label}: ${gear.scales} scales, ${gear.maxHearts} hearts, claw lvl ${gear.clawLevel}`
  );
  console.log('croc  coat  win%   avg s   ko%  ring%  fin%  timeout%  avg scales left');
  for (const croc of LADDER) {
    runLadder(croc, player);
  }
}

function runLadder(croc, player) {
  const results = Array.from({ length: runs }, () => playOnce(croc, player));
  const wins = results.filter((r) => r.won).length;
  const pct = (n) => ((n / runs) * 100).toFixed(0).padStart(4);
  const count = (reason) => results.filter((r) => r.reason === reason).length;
  const avg = (fn) => (results.reduce((a, r) => a + fn(r), 0) / runs).toFixed(1);
  console.log(
    `${String(croc.rank).padStart(4)}  ${String(croc.coat).padStart(4)}  ${pct(wins)}%  ${avg(
      (r) => r.seconds
    ).padStart(5)}  ${pct(count('ko'))} ${pct(count('ringout'))} ${pct(count('finisher'))}  ${pct(
      count('timeout')
    )}      ${avg((r) => r.scalesLeft).padStart(5)}`
  );
}

console.log(`player skill ${playerSkill}, ${runs} fights per croc, finisher threshold ${FINISHER_THRESHOLD}`);
report('fresh', PROFILES.fresh);
report('geared', PROFILES.geared);
