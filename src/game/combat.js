import {
  ARENA,
  ARENA_MID,
  LEFT_LINE,
  RIGHT_LINE,
  MOVES,
  PHYSICS,
  REGEN,
  FINISHER_THRESHOLD,
  HIT_STOP,
  KO_HANG,
  STAGE
} from './constants.js';
import {
  attackPoint,
  canAct,
  circleHitsBody,
  createFighter,
  integrate,
  startMove,
  stepFighterTimers
} from './fighter.js';
import { spawnScales, stepScales } from './particles.js';
import { createBrain, stepBrain } from './ai.js';

export const COUNTDOWN = 1.1;

export function createMatch({ player, opponent }) {
  const p = createFighter({
    id: 'player',
    name: player.name,
    nameplate: player.nameplate,
    tint: player.tint,
    x: ARENA_MID - 280,
    facing: 1,
    // player.scales is the wallet AND the armour - one number, not two
    // (PLAN.md §9). The match works on a copy; the wallet settles at the end.
    scales: player.scales,
    maxScales: Math.max(player.scales, 40),
    hearts: player.hearts,
    maxHearts: player.maxHearts,
    clawLevel: player.clawLevel,
    isPlayer: true
  });

  const o = createFighter({
    id: 'opp',
    name: opponent.name,
    nameplate: '',
    tint: opponent.tint,
    x: ARENA_MID + 280,
    facing: -1,
    // [T13] Opponents regrow their scales between matches, so every fight
    // starts against a full coat.
    scales: opponent.coat,
    maxScales: opponent.coat,
    hearts: opponent.hearts,
    maxHearts: opponent.hearts,
    clawMul: opponent.power ?? 1
  });

  return {
    player: p,
    opp: o,
    brain: createBrain(opponent.skill),
    brainOut: {},
    opponent,
    particles: [],
    stars: [],
    time: 0,
    status: 'countdown', // countdown -> fighting -> ending -> result
    countdown: COUNTDOWN,
    hitstop: 0,
    shake: 0,
    shakeSeed: Math.random() * 100,
    camera: ARENA_MID,
    outcome: null,
    danceT: 0,
    banner: null, // { text, t, tone }
    rewardTicked: 0
  };
}

function shake(match, mag) {
  match.shake = Math.max(match.shake, mag);
}

function setBanner(match, text, tone = 'amber') {
  match.banner = { text, t: 0, tone };
}

function pushProgressFor(f, foe) {
  // How close this fighter is to the painted line behind it. The README's
  // objective bar is exactly this reading for the opponent.
  const behindRight = foe.x <= f.x;
  const span = behindRight ? RIGHT_LINE - ARENA_MID : ARENA_MID - LEFT_LINE;
  const travelled = behindRight ? f.x - ARENA_MID : ARENA_MID - f.x;
  return Math.max(0, Math.min(1, travelled / span));
}

function ringedOut(f, foe) {
  return foe.x <= f.x ? f.x >= RIGHT_LINE : f.x <= LEFT_LINE;
}

function finish(match, winner, reason) {
  if (match.outcome) return;
  match.outcome = { winner, reason };
  match.status = 'ending';
  match.endTimer = KO_HANG;
  const loser = winner === 'player' ? match.opp : match.player;
  loser.ko = true;
  loser.action = null;
  loser.vx *= 0.4;
  if (reason === 'finisher') setBanner(match, 'FINISHED!', 'green');
  else if (reason === 'ringout') setBanner(match, 'RING OUT!', 'amber');
  else setBanner(match, 'KNOCKOUT!', 'amber');
  shake(match, 20);
}

function applyHit(match, attacker, target, type) {
  const m = MOVES[type];
  const impactX = attacker.x + attacker.facing * (m.reach * 0.85);
  const impactY = ARENA.ground + target.y - m.hitHeight;

  target.stun = m.stun;
  target.hitFlash = 0.2;
  target.vx += attacker.facing * m.push;
  match.hitstop = HIT_STOP;
  shake(match, m.shake);

  // [T13] A jump bite on a target under the threshold kills outright. Checked
  // before the coat is stripped, and it applies to both fighters.
  if (type === 'bite' && target.scales < FINISHER_THRESHOLD) {
    spawnScales(match.particles, {
      x: impactX,
      y: impactY,
      count: Math.max(6, target.scales),
      dir: attacker.facing,
      power: 1.6,
      towardCamera: target.isPlayer
    });
    target.scales = 0;
    target.hearts = 0;
    finish(match, attacker.id === 'player' ? 'player' : 'opp', 'finisher');
    return;
  }

  if (target.scales > 0) {
    // Armour layer. Damage stops at the coat; it does not spill into hearts on
    // the same hit, which keeps "strip it, then kill it" readable.
    const shed = Math.max(1, Math.round(m.shed * attacker.clawMul));
    const removed = Math.min(shed, target.scales);
    target.scales -= removed;
    spawnScales(match.particles, {
      x: impactX,
      y: impactY,
      count: removed,
      dir: attacker.facing,
      power: type === 'bite' ? 1.5 : type === 'box' ? 1.15 : 0.9,
      towardCamera: target.isPlayer
    });
    if (target.scales === 0) setBanner(match, `${target.name} IS STRIPPED`, 'green');
  } else {
    target.hearts = Math.max(0, target.hearts - m.heartDamage);
    if (target.hearts === 0) {
      finish(match, attacker.id === 'player' ? 'player' : 'opp', 'ko');
      return;
    }
  }
}

function stepAction(match, f, foe, dt) {
  const a = f.action;
  if (!a) return;
  a.t += dt;

  if (a.type === 'regenerate') {
    if (!a.healed && a.t >= REGEN.duration * REGEN.healAt) {
      a.healed = true;
      f.hearts = Math.min(f.maxHearts, f.hearts + REGEN.heal);
    }
    if (a.t >= a.duration) {
      f.action = null;
      f.regenCd = REGEN.cooldown;
    }
    return;
  }

  if (a.type === 'bite') {
    // Airborne for the whole move. The hit window is live from the apex down.
    // Live only on the way down and only near the concrete, so a bite thrown
    // from too far or too early sails over the target's back.
    const descending = f.vy > 40;
    const low = -f.y < MOVES.bite.liveBelow;
    if (!a.connected && descending && low) {
      const point = attackPoint(f);
      if (point && circleHitsBody(point, foe)) {
        a.connected = true;
        applyHit(match, f, foe, 'bite');
      }
    }
    if (f.y === 0 && a.t > 0.08) {
      f.action = null;
      // [proposed] A bite that misses leaves it open for roughly a second.
      if (!a.connected) f.vulnerable = MOVES.bite.whiffRecovery;
      else f.vulnerable = 0.18;
      f.vx *= 0.2;
    }
    return;
  }

  const m = MOVES[a.type];
  if (a.phase === 'windup' && a.t >= m.windup) {
    a.phase = 'active';
    a.t = 0;
  } else if (a.phase === 'active') {
    if (!a.connected) {
      const point = attackPoint(f);
      if (point && circleHitsBody(point, foe)) {
        a.connected = true;
        applyHit(match, f, foe, a.type);
      }
    }
    if (a.t >= m.active) {
      a.phase = 'recover';
      a.t = 0;
    }
  } else if (a.phase === 'recover' && a.t >= m.recover) {
    f.action = null;
  }
}

function applyInput(f, input, dt) {
  if (!canAct(f)) {
    f.moving = Math.max(0, f.moving - dt * 6);
    return;
  }
  let move = 0;
  if (input.left) move -= 1;
  if (input.right) move += 1;
  if (move !== 0) {
    f.x += move * PHYSICS.walkSpeed * dt;
    f.walkPhase += dt * 9;
    f.moving = Math.min(1, f.moving + dt * 8);
  } else {
    f.moving = Math.max(0, f.moving - dt * 8);
  }
  if (input.bite) startMove(f, 'bite');
  else if (input.box) startMove(f, 'box');
  else if (input.scratch) startMove(f, 'scratch');
  else if (input.regen) startMove(f, 'regenerate');
}

export function stepMatch(match, dt, input) {
  match.time += dt;

  if (match.banner) {
    match.banner.t += dt;
    if (match.banner.t > 1.8) match.banner = null;
  }
  if (match.shake > 0) match.shake = Math.max(0, match.shake - dt * 46);

  if (match.status === 'countdown') {
    match.countdown -= dt;
    if (match.countdown <= 0) match.status = 'fighting';
    stepScales(match.particles, dt, ARENA.ground);
    updateCamera(match, dt);
    return match;
  }

  if (match.hitstop > 0) {
    match.hitstop -= dt;
    stepScales(match.particles, dt, ARENA.ground);
    updateCamera(match, dt);
    return match;
  }

  const { player, opp } = match;

  if (match.status === 'fighting') {
    // Both fighters face each other unless committed to a move. [T13] a croc
    // in the air cannot turn.
    if (canAct(player)) player.facing = opp.x >= player.x ? 1 : -1;
    if (canAct(opp)) opp.facing = player.x >= opp.x ? 1 : -1;

    applyInput(player, input, dt);
    const aiInput = stepBrain(match.brain, opp, player, dt, match.brainOut);
    applyInput(opp, aiInput, dt);

    stepAction(match, player, opp, dt);
    stepAction(match, opp, player, dt);

    stepFighterTimers(player, dt);
    stepFighterTimers(opp, dt);
    integrate(player, dt);
    integrate(opp, dt);
    separate(player, opp);

    player.pushProgress = pushProgressFor(player, opp);
    opp.pushProgress = pushProgressFor(opp, player);

    if (!match.outcome) {
      if (ringedOut(opp, player)) finish(match, 'player', 'ringout');
      else if (ringedOut(player, opp)) finish(match, 'opp', 'ringout');
    }
  } else {
    // ending / result - the loser still falls, the winner still settles.
    stepFighterTimers(player, dt);
    stepFighterTimers(opp, dt);
    integrate(player, dt);
    integrate(opp, dt);
    separate(player, opp);
    if (match.status === 'ending') {
      match.endTimer -= dt;
      if (match.endTimer <= 0) {
        match.status = 'result';
        match.danceT = 0;
      }
    } else {
      match.danceT += dt;
    }
  }

  stepScales(match.particles, dt, ARENA.ground);
  updateCamera(match, dt);
  return match;
}

function separate(a, b) {
  // Crocodiles are solid. Airborne bites pass over, everything else shoulders.
  if (a.y < -40 || b.y < -40) return;
  const min = 198;
  const d = b.x - a.x;
  const dist = Math.abs(d);
  if (dist >= min || dist === 0) return;
  const push = (min - dist) / 2;
  const dir = Math.sign(d) || 1;
  a.x -= push * dir;
  b.x += push * dir;
}

function updateCamera(match, dt) {
  const mid = (match.player.x + match.opp.x) / 2;
  const half = STAGE.w / 2;
  const target = Math.max(half, Math.min(ARENA.width - half, mid));
  const k = 1 - Math.exp(-6 * dt);
  match.camera += (target - match.camera) * k;
}

// Snapshot for the DOM HUD. Kept small and flat so React re-renders stay cheap.
export function hudSnapshot(match) {
  const { player, opp } = match;
  return {
    status: match.status,
    countdown: Math.max(0, Math.ceil(match.countdown)),
    playerScales: player.scales,
    playerHearts: player.hearts,
    playerMaxHearts: player.maxHearts,
    oppHearts: opp.hearts,
    oppMaxHearts: opp.maxHearts,
    oppScales: opp.scales,
    oppName: opp.name,
    reward: match.opponent.reward,
    ringOutProgress: opp.pushProgress,
    playerDanger: player.pushProgress,
    regenCooldown: Math.ceil(player.regenCd),
    regenReady: player.regenCd <= 0 && player.hearts < player.maxHearts,
    canAct: canAct(player),
    finisherOpen: opp.scales < FINISHER_THRESHOLD,
    finisherRisk: player.scales < FINISHER_THRESHOLD,
    banner: match.banner ? match.banner.text : null,
    bannerTone: match.banner ? match.banner.tone : null,
    outcome: match.outcome
  };
}
