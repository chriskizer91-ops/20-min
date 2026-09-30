// The last beat of the Ending: the grimoire open at the Dawnbell's page. There's no painting of it, so it is
// drawn here: an open book in candlelight, the bell sketched in ink on one page, its name and two notes on the
// other. The notes are the lore's (LORE §7 and §9): the Dawnbell was spun into the Gloamwing's silk, and it
// comes from a shrine far north. Unlike the paintings, the book is laid out for the screen it's on: an open
// spread when there's room, one page with the drawing above the words on a tall phone. It keeps the bottom of
// the screen clear for the captions.
import { ease } from './screen.js';

const INK = '#3b2331';
const WASH = 'rgba(214, 160, 70, 0.22)';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// One page of parchment. `spine` is the side the binding is on (-1 left, 1 right, 0 for a lone page); the
// page sags a little toward it and darkens into the gutter.
function page(g, x, y, w, h, spine) {
  const sag = h * 0.014;
  g.beginPath();
  if (spine < 0) {
    g.moveTo(x, y + sag); g.quadraticCurveTo(x + w * 0.3, y - sag * 0.4, x + w, y);
    g.lineTo(x + w, y + h); g.quadraticCurveTo(x + w * 0.3, y + h + sag * 0.4, x, y + h - sag);
  } else if (spine > 0) {
    g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.7, y - sag * 0.4, x + w, y + sag);
    g.lineTo(x + w, y + h - sag); g.quadraticCurveTo(x + w * 0.7, y + h + sag * 0.4, x, y + h);
  } else {
    g.rect(x, y, w, h);
  }
  g.closePath();
  const paper = g.createLinearGradient(x, 0, x + w, 0);
  const edge = '#cdb383', mid = '#ecdfc0', gutter = '#a98e62';
  if (spine < 0) { paper.addColorStop(0, gutter); paper.addColorStop(0.1, mid); paper.addColorStop(0.85, mid); paper.addColorStop(1, edge); }
  else if (spine > 0) { paper.addColorStop(0, edge); paper.addColorStop(0.15, mid); paper.addColorStop(0.9, mid); paper.addColorStop(1, gutter); }
  else { paper.addColorStop(0, edge); paper.addColorStop(0.12, mid); paper.addColorStop(0.88, mid); paper.addColorStop(1, edge); }
  g.fillStyle = paper;
  g.fill();
  // foxing: a warm stain in one corner
  const stain = g.createRadialGradient(x + w * (spine > 0 ? 0.15 : 0.85), y + h * 0.88, 0, x + w * (spine > 0 ? 0.15 : 0.85), y + h * 0.88, w * 0.45);
  stain.addColorStop(0, 'rgba(150, 100, 40, 0.16)');
  stain.addColorStop(1, 'rgba(150, 100, 40, 0)');
  g.fillStyle = stain;
  g.fill();
}

// The bell, in a box `size` tall centred on (cx, top..top+size): a wash of colour, then ink over it
function bell(g, cx, top, size) {
  const P = (x, y) => [cx + x * size, top + y * size];
  const outline = () => {
    g.beginPath();
    g.moveTo(...P(-0.12, 0.16));
    g.bezierCurveTo(...P(-0.24, 0.17), ...P(-0.22, 0.46), ...P(-0.25, 0.62));
    g.bezierCurveTo(...P(-0.28, 0.76), ...P(-0.35, 0.82), ...P(-0.42, 0.86));
    g.quadraticCurveTo(...P(0, 0.95), ...P(0.42, 0.86));
    g.bezierCurveTo(...P(0.35, 0.82), ...P(0.28, 0.76), ...P(0.25, 0.62));
    g.bezierCurveTo(...P(0.22, 0.46), ...P(0.24, 0.17), ...P(0.12, 0.16));
    g.quadraticCurveTo(...P(0, 0.12), ...P(-0.12, 0.16));
    g.closePath();
  };
  // It hung in the Gloamwing's silk: a thread up from the crown, and a few loose wisps round the shoulders
  g.strokeStyle = 'rgba(59, 35, 49, 0.4)';
  g.lineCap = 'round';
  g.lineWidth = Math.max(1, size * 0.005);
  g.beginPath();
  g.moveTo(...P(0, 0.035));
  g.bezierCurveTo(...P(0.03, -0.03), ...P(-0.03, -0.07), ...P(0.01, -0.12));
  g.stroke();
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(...P(side * 0.05, 0.11));
    g.bezierCurveTo(...P(side * 0.22, 0.12), ...P(side * 0.3, 0.2), ...P(side * 0.29, 0.34));
    g.moveTo(...P(side * 0.08, 0.13));
    g.bezierCurveTo(...P(side * 0.2, 0.18), ...P(side * 0.34, 0.24), ...P(side * 0.33, 0.44));
    g.stroke();
  }
  outline();
  g.fillStyle = WASH;
  g.fill();
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.5, size * 0.012);
  g.stroke();
  // the crown loop
  g.beginPath();
  g.ellipse(...P(0, 0.09), size * 0.07, size * 0.055, 0, 0, Math.PI * 2);
  g.stroke();
  // two bands round the waist, and the lip's inner edge
  g.lineWidth = Math.max(1, size * 0.007);
  for (const y of [0.66, 0.7]) {
    g.beginPath();
    g.moveTo(...P(-0.265, y));
    g.quadraticCurveTo(...P(0, y + 0.05), ...P(0.265, y));
    g.stroke();
  }
  g.beginPath();
  g.moveTo(...P(-0.4, 0.86));
  g.quadraticCurveTo(...P(0, 0.8), ...P(0.4, 0.86));
  g.stroke();
  // hatching down the shadowed side, kept inside the outline
  g.save();
  outline();
  g.clip();
  g.strokeStyle = 'rgba(59, 35, 49, 0.7)';
  g.lineWidth = Math.max(1, size * 0.006);
  for (let i = 0; i < 8; i++) {
    const y = 0.25 + i * 0.065;
    g.beginPath();
    g.moveTo(...P(0.13 + i * 0.008, y));
    g.lineTo(...P(0.3, y - 0.06));
    g.stroke();
  }
  g.restore();
  // the clapper
  g.beginPath();
  g.moveTo(...P(0, 0.84));
  g.lineTo(...P(0, 0.93));
  g.stroke();
  g.beginPath();
  g.arc(...P(0, 0.955), size * 0.03, 0, Math.PI * 2);
  g.fillStyle = INK;
  g.fill();
}

// A small compass, pointing north: where the bell came from
function compass(g, cx, cy, r) {
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = Math.max(1, r * 0.06);
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cy - r * 1.35);
  g.lineTo(cx + r * 0.22, cy);
  g.lineTo(cx, cy + r * 0.7);
  g.lineTo(cx - r * 0.22, cy);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cy - r * 1.35);
  g.lineTo(cx + r * 0.22, cy);
  g.lineTo(cx - r * 0.22, cy);
  g.closePath();
  g.fill();
  g.font = `400 ${Math.round(r * 0.9)}px 'Jacquard 12', Georgia, serif`;
  g.textAlign = 'center';
  g.fillText('N', cx, cy - r * 1.5);
}

// Wrap `text` to `width`, returning the lines
function wrap(g, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// The words: the bell's name, a flourish, and the two notes
function words(g, x, y, w, h) {
  const head = Math.min(h * 0.16, w * 0.17);
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `400 ${Math.round(head)}px 'Jacquard 12', Georgia, serif`;
  g.fillText('The Dawnbell', x + w / 2, y + head);
  g.strokeStyle = INK;
  g.lineWidth = Math.max(1, head * 0.03);
  g.beginPath();
  g.moveTo(x + w * 0.22, y + head * 1.35);
  g.bezierCurveTo(x + w * 0.4, y + head * 1.15, x + w * 0.6, y + head * 1.55, x + w * 0.78, y + head * 1.35);
  g.stroke();
  const body = Math.max(13, head * 0.4);
  g.font = `400 ${Math.round(body)}px 'Pixelify Sans', sans-serif`;
  let ty = y + head * 2.05;
  for (const note of ["Spun into the Gloamwing's silk.", 'From a shrine somewhere far north.']) {
    for (const line of wrap(g, note, w * 0.84)) { g.fillText(line, x + w / 2, ty); ty += body * 1.35; }
    ty += body * 0.5;
  }
  return ty;
}

// Draw the grimoire for a screen of vw x vh CSS pixels, pushed in by `zoom` (1 = fitted)
function drawGrimoire(g, vw, vh, zoom) {
  // Candlelight on a dark table
  const glow = g.createRadialGradient(vw * 0.5, vh * 0.35, 0, vw * 0.5, vh * 0.35, Math.max(vw, vh) * 0.75);
  glow.addColorStop(0, '#3d2233');
  glow.addColorStop(0.55, '#1c1020');
  glow.addColorStop(1, '#0a060d');
  g.fillStyle = glow;
  g.fillRect(0, 0, vw, vh);

  // The book fits between the top buttons and the captions. A phone on its side has little height to spare,
  // and a book that narrow clears the buttons in the corner, so it starts near the top.
  const short = vh < 500;
  const top = short ? 14 : Math.max(64, vh * 0.1), bottom = short ? vh - 64 : vh * 0.72;
  const availW = vw - 32, availH = bottom - top;
  const spread = availW / availH > 1.05;
  const aspect = spread ? 1.42 : 0.7;
  let bw = Math.min(availW, availH * aspect, 1100), bh = bw / aspect;
  if (bh > availH) { bh = availH; bw = bh * aspect; }
  g.save();
  g.translate(vw / 2, top + availH / 2);
  g.scale(zoom, zoom);
  g.translate(-bw / 2, -bh / 2);

  // The cover, a little bigger than the pages, and its shadow on the table
  const pad = bh * 0.035;
  g.shadowColor = 'rgba(0, 0, 0, 0.6)';
  g.shadowBlur = bh * 0.08;
  g.shadowOffsetY = bh * 0.03;
  roundRect(g, -pad, -pad * 0.8, bw + pad * 2, bh + pad * 1.8, pad * 0.8);
  g.fillStyle = '#4a1a36';
  g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = '#2a0c1e';
  g.lineWidth = 2;
  g.stroke();

  if (spread) {
    page(g, 0, 0, bw / 2, bh, 1);
    page(g, bw / 2, 0, bw / 2, bh, -1);
    bell(g, bw / 4, bh * 0.1, bh * 0.72);
    const end = words(g, bw / 2 + bw * 0.05, bh * 0.14, bw * 0.4, bh);
    const r = bh * 0.05;
    if (end + r * 2.6 < bh * 0.95) compass(g, bw * 0.75, Math.max(bh * 0.8, end + r * 2), r);
  } else {
    page(g, 0, 0, bw, bh, 0);
    bell(g, bw / 2, bh * 0.06, bh * 0.4);
    const end = words(g, bw * 0.06, bh * 0.5, bw * 0.88, bh * 0.5);
    compass(g, bw / 2, Math.min(bh * 0.9, end + bh * 0.08), bh * 0.035);
  }
  g.restore();
}

// As a shot for ./screen.js: a slow push in from `from` to `to` (only their zoom is used; the page is centred)
export function grimoireShot(from, to, t0, dur, reduced) {
  return {
    kind: 'grimoire',
    draw(g, v, now) {
      const k = reduced ? 1 : ease((now - t0) / dur);
      g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      drawGrimoire(g, v.vw, v.vh, from[2] + (to[2] - from[2]) * k);
    },
  };
}
