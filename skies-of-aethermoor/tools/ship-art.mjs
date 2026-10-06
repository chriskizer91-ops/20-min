// ship-art.mjs: cuts the painted pieces every ship is dressed in out of Chris's Brig pictures (art/ships/brig-*.png).
//   assets/ships/planks.webp   hull planks, seamless both ways, for tiling along every hull
//   assets/ships/deck.webp     deck boards, seamless both ways
//   assets/ships/band.webp     the brass band with its rivets, seamless side to side
//   assets/ships/parts.webp    sail canvas, furnace, lantern, rudder, fin, crystal, windows, hatch: one sheet, background cut away
//   assets/ships/parts.json    where each piece is on parts.webp (0..1, y down)
// Run: node tools/ship-art.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const ART = new URL('../art/ships/', import.meta.url).pathname;
const OUT = new URL('../assets/ships/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Pixel boxes [x0, y0, x1, y1] measured on gridded copies of the pictures
const TILES = {
  planks: { src: 'brig-hull.png', box: [548, 440, 858, 497] },
  deck: { src: 'brig-hull.png', box: [690, 655, 870, 705] },
  band: { src: 'brig-hull.png', box: [545, 321, 860, 354] },
};
const PARTS = {
  sail: { src: 'brig-parts.png', box: [20, 15, 578, 380], cut: true },
  furnace: { src: 'brig-parts.png', box: [1256, 218, 1434, 374], cut: true },
  furnaceTop: { src: 'brig-parts.png', box: [1212, 30, 1478, 222], cut: true },
  lantern: { src: 'brig-parts.png', box: [64, 706, 188, 942], cut: true },
  rudder: { src: 'brig-parts.png', box: [760, 440, 918, 658], cut: true },
  fin: { src: 'brig-parts.png', box: [948, 490, 1184, 656], cut: true },
  crystal: { src: 'brig-parts.png', box: [708, 62, 836, 308], cut: true },
  windows2: { src: 'brig-parts.png', box: [1132, 756, 1474, 920], cut: true },
  windows3: { src: 'brig-hull.png', box: [160, 248, 304, 312] },
  hatch: { src: 'brig-hull.png', box: [706, 706, 840, 804] },
  bowGun: { src: 'brig-parts.png', box: [22, 486, 390, 646], cut: true },
  portLid: { src: 'brig-parts.png', box: [494, 456, 666, 524], cut: true },
};

async function crop(src, [x0, y0, x1, y1]) {
  const { data, info } = await sharp(ART + src).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// The pictures' background is a flat light grey; anything close to it becomes see-through, with a soft edge
function cutBackground(img) {
  const { data, w, h } = img;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const d = Math.hypot(r - 207, g - 207, b - 208) + (Math.max(r, g, b) - Math.min(r, g, b)) * 1.5;
    data[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - 14) / 26)));
  }
  return img;
}

// Make a picture repeat without a seam: its far edge fades into its near edge (as the Art Farm's paper-art.py does)
function seamless(img, frac, axis) {
  const { data, w, h } = img;
  const along = axis === 'x' ? w : h, n = Math.round(along * frac), nw = axis === 'x' ? w - n : w, nh = axis === 'x' ? h : h - n;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const p = axis === 'x' ? x : y, o = (y * nw + x) * 4, a = (y * w + x) * 4;
    if (p < n) {
      const t = p / n, b = axis === 'x' ? (y * w + x + nw) * 4 : ((y + nh) * w + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(data[b + c] * (1 - t) + data[a + c] * t);
    } else for (let c = 0; c < 4; c++) out[o + c] = data[a + c];
  }
  return { data: out, w: nw, h: nh };
}

const save = (img, name, opts = {}) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 95, ...opts }).toFile(OUT + name);

// Repeating tiles
let planks = await crop(TILES.planks.src, TILES.planks.box);
planks = seamless(seamless(planks, 0.18, 'x'), 0.22, 'y');
await save(planks, 'planks.webp');
let deck = await crop(TILES.deck.src, TILES.deck.box);
deck = seamless(seamless(deck, 0.2, 'x'), 0.22, 'y');
await save(deck, 'deck.webp');
let band = await crop(TILES.band.src, TILES.band.box);
band = seamless(band, 0.15, 'x');
await save(band, 'band.webp');

// The parts sheet: a simple shelf packer with 6 px of padding, each piece's edge pixels pulled out into its padding
const pieces = [];
for (const [name, p] of Object.entries(PARTS)) {
  const img = await crop(p.src, p.box);
  pieces.push({ name, img: p.cut ? cutBackground(img) : img });
}
pieces.sort((a, b) => b.img.h - a.img.h);
const W = 1024, PAD = 6;
let x = 0, y = 0, rowH = 0;
for (const p of pieces) {
  const pw = p.img.w + PAD * 2, ph = p.img.h + PAD * 2;
  if (x + pw > W) { x = 0; y += rowH; rowH = 0; }
  p.at = [x + PAD, y + PAD]; x += pw; rowH = Math.max(rowH, ph);
}
const H = 1 << Math.ceil(Math.log2(y + rowH));
const sheet = Buffer.alloc(W * H * 4);
const rects = {};
for (const { name, img, at: [ax, ay] } of pieces) {
  for (let yy = -PAD; yy < img.h + PAD; yy++) for (let xx = -PAD; xx < img.w + PAD; xx++) {
    const sx = Math.min(img.w - 1, Math.max(0, xx)), sy = Math.min(img.h - 1, Math.max(0, yy));
    const s = (sy * img.w + sx) * 4, d = ((ay + yy) * W + ax + xx) * 4;
    const edge = xx < 0 || yy < 0 || xx >= img.w || yy >= img.h;
    for (let c = 0; c < 4; c++) sheet[d + c] = img.data[s + c];
    if (edge && PARTS[name].cut) sheet[d + 3] = Math.min(sheet[d + 3], 0);
  }
  rects[name] = { u0: ax / W, v0: ay / H, u1: (ax + img.w) / W, v1: (ay + img.h) / H, w: img.w, h: img.h, box: PARTS[name].box };
}
await save({ data: sheet, w: W, h: H }, 'parts.webp');
writeFileSync(OUT + 'parts.json', JSON.stringify({ size: [W, H], rects }, null, 1) + '\n');
console.log('planks', planks.w, planks.h, '· deck', deck.w, deck.h, '· band', band.w, band.h, '· parts', W, H);
