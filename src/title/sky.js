// The title screen's painting (art/stills/title-skiff-over-valley.webp) and the life drawn over it, all in the
// painting's own pixels so it moves with the slow pan:
//   - stars twinkling in the empty upper third, which the painting leaves for the logo;
//   - three of the batch's painted night clouds (art/fx/night-clouds.webp) drifting right to left, against the
//     skiff's heading, so she seems to sail on. A cut-out of the skiff is erased from them, so they pass behind
//     her, the same trick the field screens use for the well and the lamps;
//   - a few painted violet flames (art/fx/drifting-lights.webp, top row) drifting on ahead of her, the lights
//     she follows down the valley, flickering through their four frames;
//   - golden motes (the same sheet's bottom row) streaming back from the crystals in her brazier.
// With reduced motion the painting holds still and nothing drifts or twinkles.
import { move } from './screen.js';

const W = 1672, H = 941;

// The skiff's outline in painting pixels (masts, sails and hull), traced over the painting
const SKIFF = [[175, 560], [230, 400], [285, 358], [300, 342], [318, 358], [332, 420], [400, 515], [480, 555],
  [522, 640], [560, 588], [622, 588], [652, 608], [702, 668], [698, 700], [694, 792], [660, 794], [640, 764],
  [600, 802], [500, 856], [380, 852], [280, 832], [188, 782], [148, 722], [132, 680], [168, 650], [163, 600]];
const CRYSTALS = [372, 640]; // the violet heart of the brazier
const CLOUD_SCALE = 0.5; // the clouds are soft, so they're drawn at half the painting's resolution

// A small seeded random, so the stars sit in the same places every time
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

// A four-point star with a soft halo, drawn once and stamped
function starSprite() {
  const c = canvas(32, 32), g = c.getContext('2d');
  const halo = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  halo.addColorStop(0, 'rgba(255, 250, 235, 1)');
  halo.addColorStop(0.18, 'rgba(236, 224, 255, 0.75)');
  halo.addColorStop(0.5, 'rgba(170, 150, 255, 0.12)');
  halo.addColorStop(1, 'rgba(170, 150, 255, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(255, 252, 240, 0.85)';
  g.fillRect(15, 3, 2, 26);
  g.fillRect(3, 15, 26, 2);
  return c;
}

function glowSprite(rgb) {
  const c = canvas(64, 64), g = c.getContext('2d');
  const halo = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  halo.addColorStop(0, `rgba(${rgb}, 0.9)`);
  halo.addColorStop(0.35, `rgba(${rgb}, 0.35)`);
  halo.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, 64, 64);
  return c;
}

// The skiff's cut-out, blurred at the edge so a cloud slides behind her softly. The blur comes from a shadow
// cast by a copy drawn off to one side, which works in every browser (ctx.filter doesn't in older Safari).
function skiffMask() {
  const c = canvas(W * CLOUD_SCALE, H * CLOUD_SCALE), g = c.getContext('2d');
  const off = c.width + 50;
  g.shadowColor = '#000';
  g.shadowBlur = 6;
  g.shadowOffsetX = off;
  g.beginPath();
  for (const [x, y] of SKIFF) g.lineTo(x * CLOUD_SCALE - off, y * CLOUD_SCALE);
  g.closePath();
  g.fill();
  return c;
}

export function createTitleShot({ painting, clouds, lights, reduced }) {
  const rnd = seeded(20260930);
  const stars = Array.from({ length: 64 }, () => ({
    x: rnd() * W, y: 8 + rnd() * H * 0.3, size: 5 + rnd() ** 2 * 11, rate: 0.5 + rnd() * 1.6, phase: rnd() * 6.3, base: 0.3 + rnd() * 0.45,
  }));
  // cell: which of the three puffy clouds; y, w in painting pixels; drift in px/s (right to left)
  const puffs = [
    { cell: 1, x: 1180, y: 150, w: 470, alpha: 0.3, drift: 6 },
    { cell: 0, x: 560, y: 372, w: 400, alpha: 0.62, drift: 9 },
    { cell: 2, x: 1500, y: 548, w: 430, alpha: 0.5, drift: 12.5 },
  ];
  // Flames drift from just off her bow on down the valley, fading in and out, one every few seconds
  const flames = Array.from({ length: 4 }, (_, i) => ({ age: i * 3.4, life: 13.6, lane: i }));
  let motes = [];
  let nextMote = 0;
  const star = starSprite(), violet = glowSprite('178, 92, 255'), gold = glowSprite('255, 196, 96');
  const mask = skiffMask();
  const cloudLayer = canvas(W * CLOUD_SCALE, H * CLOUD_SCALE), cg = cloudLayer.getContext('2d');
  let time = 0, last = null;

  function flamePlace(f) {
    const k = f.age / f.life;
    const lane = [[742, 604, 1030, 560], [760, 690, 1090, 742], [700, 540, 960, 470], [770, 640, 1150, 650]][f.lane];
    const x = lane[0] + (lane[2] - lane[0]) * k;
    const y = lane[1] + (lane[3] - lane[1]) * k + Math.sin(time * 1.3 + f.lane * 2) * 7;
    const fade = Math.min(1, f.age / 1.6, (f.life - f.age) / 2.2);
    return { x, y, fade: Math.max(0, fade), size: 44 + f.lane * 5 - k * 10 };
  }

  function step(dt) {
    time += dt;
    for (const p of puffs) {
      p.x -= p.drift * dt;
      if (p.x < -p.w / 2) p.x = W + p.w / 2;
    }
    for (const f of flames) if ((f.age += dt) > f.life) f.age -= f.life;
    nextMote -= dt;
    while (nextMote < 0 && motes.length < 40) {
      nextMote += 0.13;
      motes.push({
        x: CRYSTALS[0] + (Math.random() - 0.5) * 50, y: CRYSTALS[1] + (Math.random() - 0.5) * 36,
        vx: -(12 + Math.random() * 22), vy: -(3 + Math.random() * 12), age: 0, life: 1.8 + Math.random() * 1.4,
        size: 14 + Math.random() * 14, frame: (Math.random() * 4) | 0,
      });
    }
    for (const m of motes) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vy -= 3 * dt; }
    motes = motes.filter((m) => m.age < m.life);
  }
  // With reduced motion the scene is posed once, mid-drift, and stays that way
  if (reduced) { for (const f of flames) f.age = f.life * (0.3 + f.lane * 0.12); }

  // The slow pan. On a tall phone only a quarter of the painting's width fits, so the camera stays on the skiff,
  // from the crystals to the witch at the rail;
  // wider screens hold the whole valley and sway gently from side to side. The top edge stays pinned (y 0, the
  // clamp does the rest), so the sky the logo sits in is always on screen.
  function framing(vw, vh) {
    const sway = reduced ? 0 : Math.sin((time / 80) * Math.PI * 2);
    const breathe = reduced ? 0 : Math.sin((time / 57) * Math.PI * 2);
    if (vw / vh < 0.9) return [0.3 + 0.025 * sway, 0, 1.04 + 0.015 * breathe];
    return [0.5 + 0.03 * sway, 0, 1.04 + 0.02 * breathe];
  }

  return {
    kind: 'title',
    get time() { return time; },
    draw(ctx, v, now, alpha) {
      const dt = last === null ? 0 : Math.min(0.1, now - last);
      last = now;
      if (!reduced) step(dt);
      const f = framing(v.vw, v.vh);
      const m = move(v.vw, v.vh, W, H, f, f, 0);
      ctx.setTransform(m.s * v.dpr, 0, 0, m.s * v.dpr, m.ox * v.dpr, m.oy * v.dpr);
      ctx.drawImage(painting, 0, 0, W, H);

      // Clouds, with the skiff cut out of them
      cg.globalCompositeOperation = 'source-over';
      cg.clearRect(0, 0, cloudLayer.width, cloudLayer.height);
      for (const p of puffs) {
        cg.globalAlpha = p.alpha;
        const w = p.w * CLOUD_SCALE;
        cg.drawImage(clouds, p.cell * 256, 0, 256, 256, (p.x - p.w / 2) * CLOUD_SCALE, (p.y - p.w / 2) * CLOUD_SCALE, w, w);
      }
      cg.globalAlpha = 1;
      cg.globalCompositeOperation = 'destination-out';
      cg.drawImage(mask, 0, 0);
      ctx.drawImage(cloudLayer, 0, 0, W, H);

      // Stars, flames and motes add light
      ctx.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const tw = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * s.rate * 2 + s.phase);
        ctx.globalAlpha = alpha * s.base * (0.35 + 0.65 * tw * tw);
        ctx.drawImage(star, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      for (const fl of flames) {
        const p = flamePlace(fl);
        if (p.fade <= 0) continue;
        const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 17 + fl.lane * 5);
        ctx.globalAlpha = alpha * p.fade * 0.45 * flicker;
        ctx.drawImage(violet, p.x - p.size * 1.2, p.y - p.size * 1.1, p.size * 2.4, p.size * 2.4);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * p.fade;
        const frame = reduced ? 0 : Math.floor(time * 8 + fl.lane * 1.7) % 4;
        ctx.drawImage(lights, frame * 128, 0, 128, 128, p.x - p.size / 2, p.y - p.size * 0.62, p.size, p.size);
        ctx.globalCompositeOperation = 'lighter';
      }
      for (const mo of motes) {
        const k = mo.age / mo.life;
        ctx.globalAlpha = alpha * Math.sin(Math.PI * k) * 0.9;
        if (mo.frame === 0) ctx.drawImage(gold, mo.x - mo.size * 0.6, mo.y - mo.size * 0.6, mo.size * 1.2, mo.size * 1.2);
        ctx.drawImage(lights, mo.frame * 128, 128, 128, 128, mo.x - mo.size / 2, mo.y - mo.size / 2, mo.size, mo.size);
      }
    },
  };
}
