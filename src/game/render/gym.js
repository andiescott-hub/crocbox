import { STAGE } from '../constants.js';

// Training row, first person. README §2: the lower centre stays clear because
// the player's own claws occupy it.

const BAG_TINTS = {
  1: ['#c9bb92', '#8d8158'],
  2: ['#8e8e86', '#4f4f49'],
  3: ['#9aa3ab', '#4a5158'],
  4: ['#8fa2b8', '#404d5e'],
  5: ['#6b4bd6', '#241c50']
};

export function drawGym(ctx, { tier, swing, hitFlash, time, claw, clawSide, damage }) {
  const w = STAGE.w;
  const h = STAGE.h;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0c0f0a');
  bg.addColorStop(0.45, '#171c13');
  bg.addColorStop(1, '#0a0c08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Roof rail the bags hang from.
  ctx.fillStyle = '#1d2218';
  ctx.fillRect(0, 60, w, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 76, w, 6);

  // Background bags receding down the row.
  for (let i = 0; i < 5; i += 1) {
    const k = i / 4;
    const x = 110 + i * 240 - 60;
    const s = 0.32 + k * 0.1;
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawBag(ctx, x, 76, s, ['#2a2f24', '#161a12'], Math.sin(time * 0.6 + i) * 0.03, 0);
    ctx.restore();
  }

  // Floor.
  const floor = ctx.createLinearGradient(0, h * 0.72, 0, h);
  floor.addColorStop(0, '#2a2f24');
  floor.addColorStop(1, '#12150f');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // The bag in front of the player.
  drawBag(ctx, w / 2, 76, 1, BAG_TINTS[tier] ?? BAG_TINTS[1], swing, hitFlash, tier, damage);

  drawClaws(ctx, claw, clawSide, time);

  const vig = ctx.createRadialGradient(w / 2, h * 0.46, 80, w / 2, h * 0.46, w * 0.7);
  vig.addColorStop(0, 'rgba(4,5,4,0)');
  vig.addColorStop(1, 'rgba(4,5,4,0.6)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawBag(ctx, x, topY, scale, tint, swing, flash, tier = 0, damage = 0) {
  const bagH = 320 * scale;
  const bagW = 132 * scale;
  const chain = 92 * scale;

  ctx.save();
  ctx.translate(x, topY);
  ctx.rotate(swing);

  // Chain.
  ctx.strokeStyle = '#5c6350';
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, chain);
  ctx.stroke();

  // Body.
  const g = ctx.createLinearGradient(-bagW / 2, 0, bagW / 2, 0);
  g.addColorStop(0, tint[1]);
  g.addColorStop(0.4, tint[0]);
  g.addColorStop(1, tint[1]);
  ctx.fillStyle = g;
  const r = 22 * scale;
  roundRect(ctx, -bagW / 2, chain, bagW, bagH, r);
  ctx.fill();

  // Straps.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-bagW / 2, chain + 18 * scale, bagW, 12 * scale);
  ctx.fillRect(-bagW / 2, chain + bagH - 40 * scale, bagW, 12 * scale);

  if (tier === 2 || tier === 3 || tier === 4 || tier === 5) {
    // Studs.
    ctx.fillStyle = tier >= 3 ? '#c9d2da' : '#b9b6a4';
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const sx = -bagW / 2 + 20 * scale + col * (bagW - 40 * scale) / 3;
        const sy = chain + 60 * scale + row * (bagH - 110 * scale) / 5;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.4 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (tier === 4 || tier === 5) {
    // Shield plate.
    ctx.fillStyle = 'rgba(180,205,235,0.22)';
    roundRect(ctx, -bagW / 2 + 14 * scale, chain + 90 * scale, bagW - 28 * scale, 130 * scale, 12 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,220,245,0.5)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  // Damage scuffs build as the bar fills.
  if (damage > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, damage * 0.7);
    ctx.strokeStyle = '#1a1109';
    ctx.lineWidth = 3 * scale;
    for (let i = 0; i < 8; i += 1) {
      const sy = chain + 70 * scale + i * 26 * scale;
      ctx.beginPath();
      ctx.moveTo(-30 * scale, sy);
      ctx.lineTo(26 * scale, sy + 12 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (flash > 0) {
    ctx.globalAlpha = Math.min(0.7, flash * 3);
    ctx.fillStyle = '#fff';
    roundRect(ctx, -bagW / 2, chain, bagW, bagH, r);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawClaws(ctx, claw, side, time) {
  const w = STAGE.w;
  const h = STAGE.h;
  const idle = Math.sin(time * 1.4) * 6;

  const hand = (baseX, dir, extend) => {
    ctx.save();
    ctx.translate(baseX, h - 30 - extend * 210 + idle);
    ctx.rotate(dir * (0.55 - extend * 0.5));
    ctx.fillStyle = '#6f8434';
    roundRect(ctx, -70, -40, 140, 220, 34);
    ctx.fill();
    ctx.strokeStyle = '#2b331a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Claws.
    ctx.fillStyle = '#e8f2d2';
    for (let i = 0; i < 3; i += 1) {
      const cx = -40 + i * 40;
      ctx.beginPath();
      ctx.moveTo(cx - 12, -34);
      ctx.lineTo(cx + 12, -34);
      ctx.lineTo(cx + dir * 4, -34 - 52 - extend * 26);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  hand(w * 0.26, -1, side === 'left' ? claw : claw * 0.12);
  hand(w * 0.74, 1, side === 'right' ? claw : claw * 0.12);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
