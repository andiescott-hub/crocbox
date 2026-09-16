import { ARENA, STAGE } from '../constants.js';
import { drawArena, drawVignette } from './arena.js';
import { crocHeadHeight, drawCroc } from './croc.js';
import { scaleAlpha, scaleGlint, VFX } from '../particles.js';
import { danceState, victoryState } from './dance.js';

function drawScales(ctx, particles) {
  for (const p of particles) {
    if (p.dead) continue;
    const a = scaleAlpha(p);
    if (a <= 0) continue;
    // Flipping end over end, not spinning flat: the squash runs off cos(spin).
    const squash = Math.cos(p.spin);
    const lit = squash >= 0;
    const w = Math.max(1.2, Math.abs(squash) * p.size);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.fillStyle = lit ? VFX.litFace : VFX.backFace;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(w * 0.6, -p.size * 0.34);
    ctx.lineTo(w * 0.44, p.size * 0.9);
    ctx.lineTo(-w * 0.44, p.size * 0.9);
    ctx.lineTo(-w * 0.6, -p.size * 0.34);
    ctx.closePath();
    ctx.fill();
    const glint = scaleGlint(p);
    if (glint > 0) {
      ctx.globalAlpha = a * glint;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -p.size * 0.2, w * 0.3, p.size * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Concrete dust. Drawn under everything else so the crocodiles kick it up
// rather than wear it.
function drawDust(ctx, list) {
  for (const d of list) {
    const k = d.t / d.life;
    ctx.save();
    ctx.globalAlpha = 0.34 * (1 - k);
    ctx.fillStyle = '#9aa189';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawImpacts(ctx, impacts) {
  for (const p of impacts) {
    const k = p.t / p.life;
    if (k >= 1) continue;
    const ease = 1 - Math.pow(1 - k, 2.4);
    const fade = 1 - k;

    ctx.save();
    ctx.translate(p.x, p.y);

    const w = p.spec.weight;

    // Two shock rings at different speeds, flattened along the punch.
    ctx.globalAlpha = fade * 0.95;
    ctx.strokeStyle = p.spec.hue;
    ctx.lineWidth = 7 * w * fade + 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, (14 + p.spec.reach * 1.2) * ease, (10 + p.spec.reach * 0.82) * ease, 0, 0, Math.PI * 2);
    ctx.stroke();

    const fast = 1 - Math.pow(1 - Math.min(1, k * 1.8), 2.4);
    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * w * fade + 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, (10 + p.spec.reach * 1.5) * fast, (7 + p.spec.reach) * fast, 0, 0, Math.PI * 2);
    ctx.stroke();

    // White core. Brief, but bright enough to punch a hole in the frame.
    if (k < 0.45) {
      const c = 1 - k / 0.45;
      ctx.globalAlpha = c;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.spec.reach * 0.55 * c + 8 * w, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = c * 0.5;
      ctx.fillStyle = p.spec.hue;
      ctx.beginPath();
      ctx.arc(0, 0, p.spec.reach * 0.85 * c + 12 * w, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shards, fanned forward along the punch.
    ctx.globalAlpha = fade;
    ctx.strokeStyle = p.spec.hue;
    ctx.lineCap = 'round';
    for (const sh of p.shards) {
      const sk = Math.max(0, (k - sh.delay) / (1 - sh.delay));
      if (sk <= 0) continue;
      const e = 1 - Math.pow(1 - sk, 3);
      const inner = sh.len * e * 0.52;
      const outer = sh.len * e;
      ctx.lineWidth = sh.w * (1 - sk);
      ctx.strokeStyle = sk < 0.4 ? '#ffffff' : p.spec.hue;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sh.a) * inner, Math.sin(sh.a) * inner * 0.72);
      ctx.lineTo(Math.cos(sh.a) * outer, Math.sin(sh.a) * outer * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawNameplate(ctx, f, text, tone, headHeight) {
  if (!text) return;
  const y = ARENA.ground + f.y - headHeight - 44;
  ctx.save();
  ctx.font = "14px 'Bungee', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.max(70, ctx.measureText(text).width + 26);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(9,11,8,0.72)';
  ctx.strokeStyle = tone;
  ctx.lineWidth = 2;
  const x = f.x - w / 2;
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y - 15);
  ctx.arcTo(x + w, y - 15, x + w, y + 15, r);
  ctx.arcTo(x + w, y + 15, x, y + 15, r);
  ctx.arcTo(x, y + 15, x, y - 15, r);
  ctx.arcTo(x, y - 15, x + w, y - 15, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = tone;
  ctx.fillText(text, f.x, y + 1);
  ctx.restore();
}

export function renderMatch(ctx, match, { victoryDance = null, dt = 1 / 60 } = {}) {
  const shake = match.shake;
  // Random shake for noise, plus a directional kick so the camera visibly gets
  // shoved the way the punch went.
  const sx = (shake > 0 ? (Math.random() - 0.5) * shake : 0) + (match.camKick ?? 0);
  const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;

  ctx.save();
  ctx.clearRect(0, 0, STAGE.w, STAGE.h);
  ctx.translate(sx, sy);

  drawArena(ctx, match.camera, match.time);

  ctx.save();
  ctx.translate(-(match.camera - STAGE.w / 2), 0);

  const { player, opp } = match;
  const winner = match.outcome ? (match.outcome.winner === 'player' ? player : opp) : null;
  const loser = match.outcome ? (match.outcome.winner === 'player' ? opp : player) : null;

  // Draw the further fighter first so the near one overlaps cleanly.
  const danceFor = (f) => {
    if (match.status !== 'result') return null;
    // [T13] The loser dances in the middle of the arena; the same animation
    // plays whichever crocodile lost.
    if (f === loser) return danceState(match.danceT);
    if (f === winner) return victoryState(match.danceT, f.isPlayer ? victoryDance : null);
    return null;
  };

  const order = player.x <= opp.x ? [opp, player] : [player, opp];
  for (const f of order) {
    drawCroc(ctx, f, { time: match.time, dt, dance: danceFor(f), dust: match.dust });
  }

  drawDust(ctx, match.dust ?? []);
  drawScales(ctx, match.particles);
  drawImpacts(ctx, match.impacts ?? []);

  drawNameplate(ctx, player, player.nameplate, '#bfe06e', crocHeadHeight(player, danceFor(player)));
  drawNameplate(ctx, opp, opp.name, '#f0a05c', crocHeadHeight(opp, danceFor(opp)));

  ctx.restore();
  drawVignette(ctx);
  ctx.restore();
}

// The rig spans roughly 400 x 300 local units, so fit to whichever axis binds
// and let `zoom` be a straight relative size (the ladder uses it to grow
// portraits with rank).
const RIG = { w: 420, h: 300 };

export function renderPortrait(ctx, { tint, scales = 30, maxScales = 40, time = 0, dt = 1 / 60, dance = null, w, h, zoom = 1, state = null }) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.5 + 4, h * 0.96);
  const k = Math.min(h / RIG.h, w / RIG.w) * zoom;
  ctx.scale(k, k);
  // A portrait keeps its own persistent fighter so the tail spring has
  // somewhere to live between frames.
  const f =
    state ??
    {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      moving: 0,
      walkPhase: 0,
      action: null,
      stance: 'stand',
      guarding: false,
      downed: 0,
      stun: 0,
      vulnerable: 0,
      hitFlash: 0,
      isPlayer: true
    };
  f.tint = tint;
  f.scales = scales;
  f.maxScales = maxScales;
  drawCroc(ctx, f, { time, dt, dance, groundY: 0 });
  ctx.restore();
}
