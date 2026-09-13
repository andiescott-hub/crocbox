import { ARENA, LEFT_LINE, RIGHT_LINE, STAGE } from '../constants.js';

// Placeholder stadium, drawn rather than photographed. PLAN.md §8: the 176
// concept renders are not licensed for production and anything that moves has
// to be drawn for animation, so the arena is procedural for now and sized to
// drop a real backdrop in behind it later.

const CROWD_BANDS = [
  { y: 96, h: 58, base: '#171b13', dot: '#2c3323' },
  { y: 154, h: 62, base: '#1c2117', dot: '#343c29' },
  { y: 216, h: 66, base: '#222719', dot: '#3d452e' }
];

let crowdCache = null;

function crowdTexture() {
  if (crowdCache) return crowdCache;
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 24;
  const g = c.getContext('2d');
  for (let i = 0; i < 150; i += 1) {
    const x = Math.random() * 240;
    const y = Math.random() * 24;
    const r = 1.4 + Math.random() * 2.2;
    g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.14})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  crowdCache = c;
  return c;
}

export function drawArena(ctx, camera, time) {
  const w = STAGE.w;
  const h = STAGE.h;
  const offset = camera - w / 2;

  // Roof and upper dark.
  const sky = ctx.createLinearGradient(0, 0, 0, ARENA.ground);
  sky.addColorStop(0, '#080a07');
  sky.addColorStop(0.42, '#12160f');
  sky.addColorStop(1, '#1b2016');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Roof trusses - parallax at a third of the camera speed.
  ctx.save();
  ctx.translate(-offset * 0.28, 0);
  ctx.strokeStyle = 'rgba(58,66,46,0.55)';
  ctx.lineWidth = 3;
  for (let x = -400; x < ARENA.width + 400; x += 190) {
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.lineTo(x + 95, 74);
    ctx.lineTo(x + 190, -20);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-400, 74);
  ctx.lineTo(ARENA.width + 400, 74);
  ctx.stroke();

  // Floodlights.
  for (let x = -300; x < ARENA.width + 300; x += 380) {
    const lx = x + 190;
    const flicker = 0.82 + Math.sin(time * 2.1 + x) * 0.05;
    ctx.save();
    ctx.shadowColor = 'rgba(255,226,160,0.8)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = `rgba(255,236,190,${0.92 * flicker})`;
    ctx.fillRect(lx - 22, 62, 44, 10);
    ctx.restore();
    ctx.fillStyle = '#232819';
    ctx.fillRect(lx - 26, 56, 52, 7);
    const beam = ctx.createLinearGradient(lx, 74, lx, ARENA.ground);
    beam.addColorStop(0, `rgba(255,232,178,${0.13 * flicker})`);
    beam.addColorStop(1, 'rgba(255,232,178,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lx - 34, 74);
    ctx.lineTo(lx + 34, 74);
    ctx.lineTo(lx + 250, ARENA.ground);
    ctx.lineTo(lx - 250, ARENA.ground);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Crowd bands - progressively less parallax as they come forward.
  const tex = crowdTexture();
  CROWD_BANDS.forEach((band, i) => {
    const par = 0.36 + i * 0.12;
    ctx.save();
    ctx.translate(-offset * par, 0);
    ctx.fillStyle = band.base;
    ctx.fillRect(-600, band.y, ARENA.width + 1200, band.h);
    const pattern = ctx.createPattern(tex, 'repeat');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pattern;
    ctx.fillRect(-600, band.y, ARENA.width + 1200, band.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-600, band.y + band.h - 6, ARENA.width + 1200, 6);
    ctx.restore();
  });

  // Barrier wall behind the floor.
  ctx.save();
  ctx.translate(-offset * 0.72, 0);
  ctx.fillStyle = '#0e1109';
  ctx.fillRect(-600, 282, ARENA.width + 1200, ARENA.ground - 282);
  ctx.fillStyle = '#161a11';
  ctx.fillRect(-600, 282, ARENA.width + 1200, 26);
  ctx.strokeStyle = 'rgba(80,90,62,0.35)';
  ctx.lineWidth = 2;
  for (let x = -600; x < ARENA.width + 600; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 308);
    ctx.lineTo(x, ARENA.ground);
    ctx.stroke();
  }
  ctx.restore();

  drawFloor(ctx, offset);
}

function drawFloor(ctx, offset) {
  const w = STAGE.w;
  const h = STAGE.h;

  const floor = ctx.createLinearGradient(0, ARENA.ground - 30, 0, h);
  floor.addColorStop(0, '#3a3f31');
  floor.addColorStop(0.18, '#2f342a');
  floor.addColorStop(1, '#1a1d17');
  ctx.fillStyle = floor;
  ctx.fillRect(0, ARENA.ground - 30, w, h - ARENA.ground + 30);

  // Concrete slab joints, scrolling with the camera.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ARENA.ground - 30, w, h - ARENA.ground + 30);
  ctx.clip();
  ctx.translate(-offset, 0);
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 2;
  for (let x = 0; x < ARENA.width; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA.ground - 26);
    ctx.lineTo(x - 60, h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  for (let i = 1; i < 4; i += 1) {
    const y = ARENA.ground + i * i * 16;
    ctx.beginPath();
    ctx.moveTo(-600, y);
    ctx.lineTo(ARENA.width + 600, y);
    ctx.stroke();
  }

  // Painted amber boundary lines - the ring-out edges.
  [LEFT_LINE, RIGHT_LINE].forEach((lx) => {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#f0b256';
    ctx.lineWidth = 9;
    ctx.shadowColor = 'rgba(240,178,86,0.5)';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(lx, ARENA.ground - 26);
    ctx.lineTo(lx - 70, h);
    ctx.stroke();
    ctx.restore();

    // Hazard hatching outside the line.
    const dir = lx < ARENA.width / 2 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#f6c987';
    ctx.lineWidth = 8;
    for (let i = 1; i <= 8; i += 1) {
      const x = lx + dir * i * 18;
      ctx.beginPath();
      ctx.moveTo(x, ARENA.ground - 20);
      ctx.lineTo(x - 46, h);
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}

export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    STAGE.w / 2,
    STAGE.h * 0.46,
    60,
    STAGE.w / 2,
    STAGE.h * 0.46,
    STAGE.w * 0.68
  );
  g.addColorStop(0, 'rgba(4,5,4,0)');
  g.addColorStop(1, 'rgba(4,5,4,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE.w, STAGE.h);
}
