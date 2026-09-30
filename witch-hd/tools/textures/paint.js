// Texture painters. These run in the browser (Canvas 2D) from tools/paint-textures.mjs, which saves each one to
// build/textures/. Each returns a canvas.
/* eslint-env browser */

const TAU = Math.PI * 2;
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// A tapered stroke along a path of points: width(t) at each point, filled as one polygon.
function taper(g, pts, width, color) {
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = width(i / (pts.length - 1)) / 2;
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.beginPath();
  g.moveTo(...left[0]);
  for (const p of left) g.lineTo(...p);
  for (const p of right.reverse()) g.lineTo(...p);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}
// Points along a cubic Bezier
function bez(p0, p1, p2, p3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

// ---------------------------------------------------------------- eyes
// Her left eye as she'd see it in a mirror: the inner corner is on the left of the image, the outer corner on
// the right (the right eye uses mirrored uvs). Amber-brown, with a warm glow at the bottom of the iris.
const EYE = {
  inner: [78, 300], outer: [448, 250],
  topC1: [120, 150], topC2: [360, 70],
  botC1: [150, 450], botC2: [390, 430],
};
function eyeOutline(g) {
  g.beginPath();
  g.moveTo(...EYE.inner);
  g.bezierCurveTo(...EYE.topC1, ...EYE.topC2, ...EYE.outer);
  g.bezierCurveTo(...EYE.botC2, ...EYE.botC1, ...EYE.inner);
  g.closePath();
}

export function eyeOpen() {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.save();
  eyeOutline(g);
  g.clip();
  // Sclera, shaded under the lid
  const sg = g.createLinearGradient(0, 80, 0, 440);
  sg.addColorStop(0, '#c9b8cf'); sg.addColorStop(0.35, '#f4eef2'); sg.addColorStop(1, '#fffaf6');
  g.fillStyle = sg; g.fillRect(0, 0, 512, 512);
  // Iris
  const cx = 262, cy = 285, rx = 118, ry = 138;
  g.save();
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
  const ig = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  ig.addColorStop(0, '#2a140c'); ig.addColorStop(0.35, '#5a2e17'); ig.addColorStop(0.7, '#a45a28'); ig.addColorStop(1, '#e8a653');
  g.fillStyle = ig; g.fillRect(0, 0, 512, 512);
  // Radial fibers
  const r = rand(11);
  for (let i = 0; i < 140; i++) {
    const a = r() * TAU;
    const r0 = 30 + r() * 30, r1 = 80 + r() * 60;
    g.strokeStyle = r() < 0.5 ? 'rgba(255,200,120,0.12)' : 'rgba(40,15,5,0.18)';
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0 * (rx / ry), cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * r1 * (rx / ry), cy + Math.sin(a) * r1);
    g.stroke();
  }
  // Glow at the bottom
  const glow = g.createRadialGradient(cx, cy + 90, 5, cx, cy + 90, 110);
  glow.addColorStop(0, 'rgba(255,214,140,0.75)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 512, 512);
  // Pupil
  const pg = g.createRadialGradient(cx, cy - 10, 10, cx, cy - 10, 80);
  pg.addColorStop(0, '#120806'); pg.addColorStop(1, '#2b140b');
  g.fillStyle = pg;
  g.beginPath(); g.ellipse(cx, cy - 12, 52, 66, 0, 0, TAU); g.fill();
  // Dark rim
  g.lineWidth = 12; g.strokeStyle = 'rgba(25,10,6,0.85)';
  g.beginPath(); g.ellipse(cx, cy, rx - 5, ry - 5, 0, 0, TAU); g.stroke();
  g.restore();
  // Shadow of the lid across the top of the iris
  const lid = g.createLinearGradient(0, 70, 0, 230);
  lid.addColorStop(0, 'rgba(40,10,30,0.75)'); lid.addColorStop(1, 'rgba(40,10,30,0)');
  g.fillStyle = lid; g.fillRect(0, 0, 512, 512);
  // Highlights: a big soft one up-left, a small one down-right, and a sparkle
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.ellipse(212, 200, 34, 42, -0.3, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(318, 352, 15, 13, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.arc(250, 250, 7, 0, TAU); g.fill();
  g.restore();

  // Upper lash line: thick, tapering at the inner corner, flicking out at the outer corner
  const top = bez(EYE.inner, EYE.topC1, EYE.topC2, EYE.outer, 60);
  taper(g, top, (t) => 6 + 30 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) * (t > 0.92 ? 1 - (t - 0.92) * 4 : 1), '#1d0f14');
  // Outer lashes
  for (const [dx, dy, len, ang] of [[0, 0, 70, -0.5], [-22, -22, 58, -0.95], [-48, -38, 44, -1.25]]) {
    const b = [EYE.outer[0] + dx, EYE.outer[1] + dy];
    const pts = bez(b, [b[0] + Math.cos(ang) * len * 0.5, b[1] + Math.sin(ang) * len * 0.5], [b[0] + Math.cos(ang - 0.2) * len * 0.8, b[1] + Math.sin(ang - 0.2) * len * 0.9], [b[0] + Math.cos(ang - 0.35) * len, b[1] + Math.sin(ang - 0.35) * len], 16);
    taper(g, pts, (t) => 14 * (1 - t) + 1, '#1d0f14');
  }
  // Lower lash: a thin warm line on the outer half
  const bot = bez(EYE.inner, EYE.botC1, EYE.botC2, EYE.outer, 60).slice(26);
  taper(g, bot, (t) => 2 + 7 * Math.sin(t * Math.PI), 'rgba(90,45,50,0.9)');
  // Crease above the lid
  const crease = bez([150, 118], [210, 70], [330, 50], [420, 150], 40);
  taper(g, crease, (t) => 5 * Math.sin(t * Math.PI), 'rgba(150,80,70,0.55)');
  return c;
}

// Closed and smiling: a curved lash line (like ^) with a flick at the outer corner.
export function eyeClosed() {
  const c = canvas(512, 512), g = c.getContext('2d');
  const arc = bez([100, 310], [180, 200], [340, 190], [440, 290], 50);
  taper(g, arc, (t) => 8 + 22 * Math.sin(t * Math.PI), '#1d0f14');
  for (const [k, len, ang] of [[1, 58, 0.55], [0.93, 46, 0.2], [0.86, 36, -0.1]]) {
    const b = arc[Math.round(k * 50)];
    const pts = bez(b, [b[0] + Math.cos(ang) * len * 0.4, b[1] + Math.sin(ang) * len * 0.4 - 10], [b[0] + Math.cos(ang) * len * 0.8, b[1] + Math.sin(ang) * len * 0.7 - 6], [b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len], 12);
    taper(g, pts, (t) => 12 * (1 - t) + 1, '#1d0f14');
  }
  return c;
}

// ---------------------------------------------------------------- mouths: four cells in a row (256 each)
export function mouths() {
  const c = canvas(1024, 256), g = c.getContext('2d');
  const ink = '#5b2230';
  // 0: a small closed smile
  taper(g, bez([70, 118], [100, 150], [156, 150], [186, 118], 40), (t) => 4 + 7 * Math.sin(t * Math.PI), ink);
  // 1: an open, happy smile
  g.save(); g.translate(256, 0);
  g.beginPath();
  g.moveTo(58, 100);
  g.bezierCurveTo(100, 108, 156, 108, 198, 100);
  g.bezierCurveTo(190, 200, 66, 200, 58, 100);
  g.closePath();
  g.fillStyle = '#7c2433'; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#e67d86';
  g.beginPath(); g.ellipse(128, 190, 52, 38, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff6f0';
  g.fillRect(70, 96, 116, 14);
  g.restore();
  g.lineWidth = 6; g.strokeStyle = ink; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(58, 100);
  g.bezierCurveTo(100, 108, 156, 108, 198, 100);
  g.bezierCurveTo(190, 200, 66, 200, 58, 100);
  g.stroke();
  g.restore();
  // 2: a little 'o' of surprise
  g.save(); g.translate(512, 0);
  g.fillStyle = '#7c2433';
  g.beginPath(); g.ellipse(128, 128, 30, 40, 0, 0, TAU); g.fill();
  g.save(); g.clip();
  g.fillStyle = '#e67d86'; g.beginPath(); g.ellipse(128, 168, 28, 22, 0, 0, TAU); g.fill();
  g.restore();
  g.lineWidth = 6; g.strokeStyle = ink; g.beginPath(); g.ellipse(128, 128, 30, 40, 0, 0, TAU); g.stroke();
  g.restore();
  // 3: a wobbly grimace (hurt)
  g.save(); g.translate(768, 0);
  const pts = [];
  for (let i = 0; i <= 50; i++) { const t = i / 50; pts.push([60 + t * 136, 130 + Math.sin(t * Math.PI * 3) * 9 - Math.sin(t * Math.PI) * 6]); }
  taper(g, pts, (t) => 4 + 5 * Math.sin(t * Math.PI), ink);
  g.restore();
  return c;
}

// ---------------------------------------------------------------- fabrics
// The shawl: magenta wool with a gold-stitched border of moons and stars along the hem (v near 1) and the
// front edges (u near 0 and 1). u runs around her from one front edge to the other; v from neck to hem.
export function shawl() {
  const W = 2048, H = 1024;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#8c1d50';
  g.fillRect(0, 0, W, H);
  const r = rand(5);
  // Woven texture: fine horizontal and vertical threads
  for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(90,30,60,${0.04 + r() * 0.05})`; g.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x += 3) { g.fillStyle = `rgba(90,30,60,${0.03 + r() * 0.04})`; g.fillRect(x, 0, 1, H); }
  // Soft mottling
  for (let i = 0; i < 400; i++) {
    const x = r() * W, y = r() * H, rad = 20 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${r() < 0.5 ? '255,220,235' : '70,10,40'},0.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const gold = '#e3bb62';
  const stitchLine = (y0, dash = 14, gap = 9, w = 5) => {
    for (let x = 0; x < W; x += dash + gap) { g.fillStyle = gold; g.fillRect(x, y0 - w / 2, dash, w); }
  };
  const moon = (x, y, s) => {
    g.fillStyle = gold;
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.arc(x + s * 0.45, y - s * 0.15, s * 0.82, 0, TAU, true); g.fill('evenodd');
  };
  const star = (x, y, s) => {
    g.fillStyle = gold; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? s * 0.42 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  };
  // Hem border (v near 1): two running stitches with moons and stars between
  const hemTop = H * 0.86;
  stitchLine(hemTop);
  stitchLine(H * 0.975, 10, 7, 4);
  for (let x = 30, i = 0; x < W; x += 64, i++) {
    if (i % 2) moon(x, H * 0.918, 17); else star(x, H * 0.918, 15);
  }
  // Dots along the very edge (like the pixel art's gold edge dots)
  for (let x = 8; x < W; x += 22) { g.fillStyle = gold; g.beginPath(); g.arc(x, H * 0.994, 4, 0, TAU); g.fill(); }
  // Front edges (u near 0 and 1): a vertical border
  for (const x0 of [0, W]) {
    const dir = x0 === 0 ? 1 : -1;
    for (let y = 0; y < hemTop; y += 23) { g.fillStyle = gold; g.fillRect(x0 + dir * 38 - 2.5, y, 5, 14); }
    for (let y = 40, i = 0; y < hemTop - 20; y += 70, i++) {
      if (i % 2) moon(x0 + dir * 18, y, 11); else star(x0 + dir * 18, y, 10);
    }
  }
  // Neckline stitch (v near 0)
  stitchLine(H * 0.03, 12, 8, 4);
  // Scattered tiny stars in the field
  for (let i = 0; i < 90; i++) {
    const x = 60 + r() * (W - 120), y = 60 + r() * (hemTop - 120);
    g.globalAlpha = 0.55; star(x, y, 4 + r() * 3); g.globalAlpha = 1;
  }
  return c;
}

// Dress fabric: black crepe with faint vertical pleat shading, and a darker lace band pattern at the bottom.
export function dress() {
  const W = 1024, H = 1024;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#1c1522'; g.fillRect(0, 0, W, H);
  const r = rand(21);
  for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255,0.02' : '0,0,0,0.12'})`; g.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255,0.015' : '0,0,0,0.08'})`; g.fillRect(x, 0, 1, H); }
  // A band of lace near the hem: scallops and little holes
  const y0 = H * 0.9;
  g.fillStyle = 'rgba(92,70,112,0.95)';
  for (let x = 0; x < W; x += 32) {
    g.beginPath(); g.arc(x + 16, y0, 16, 0, Math.PI); g.fill();
  }
  g.fillStyle = '#1c1522';
  for (let x = 0; x < W; x += 32) { g.beginPath(); g.arc(x + 16, y0 + 6, 5, 0, TAU); g.fill(); }
  for (let x = 8; x < W; x += 16) { g.fillStyle = 'rgba(92,70,112,0.9)'; g.fillRect(x, H * 0.96, 8, 4); }
  return c;
}

// Plum felt for the hat: soft fibrous noise (multiplied by the plum color)
export function felt() {
  const W = 1024, H = 1024;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#7d1f4f'; g.fillRect(0, 0, W, H);
  const r = rand(33);
  for (let i = 0; i < 26000; i++) {
    const x = r() * W, y = r() * H, a = r() * TAU, l = 3 + r() * 9;
    g.strokeStyle = r() < 0.5 ? `rgba(255,190,225,${0.04 + r() * 0.08})` : `rgba(40,5,25,${0.08 + r() * 0.14})`;
    g.lineWidth = 0.8 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

// Leather for the boots, pouch and sheath: fine grain with creases
export function leather() {
  const W = 512, H = 512;
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#2e211e'; g.fillRect(0, 0, W, H);
  const r = rand(44);
  for (let i = 0; i < 9000; i++) {
    const x = r() * W, y = r() * H;
    g.fillStyle = r() < 0.5 ? 'rgba(255,230,210,0.05)' : 'rgba(0,0,0,0.2)';
    g.beginPath(); g.arc(x, y, 0.6 + r() * 1.6, 0, TAU); g.fill();
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = r() * H, l = 20 + r() * 60;
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 12, x + l, y + (r() - 0.5) * 8); g.stroke();
  }
  return c;
}
