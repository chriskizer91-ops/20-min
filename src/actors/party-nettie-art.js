import * as THREE from 'three';
import { canvasTexture, ellipse, mixColor } from './party-kit.js';

// Nettie's painted pieces: her face (six moods), the knotted Hexbane Shawl, her robe, the hat's felt and the fen
// water her Tide spell throws. All painted in code on canvases.

export const NC = {
  skin: '#eac4a2', skinShade: '#c99878', cheek: 'rgba(214,112,92,0.34)', lip: '#8e4448', line: 'rgba(120,64,50,0.45)',
  brow: '#2a2230', lash: '#1e141a', white: '#f4ecdc', iris: '#4a2616', irisRing: '#8a5a24',
  hair: '#2f2838', hairLight: '#4a3f58', hairDark: '#211b29', streak: '#d8d2de',
  hat: '#54402e', hatDark: '#3e2f24', band: '#627030', patch: '#6f5a8a',
  robe: '#6b7337', robeDark: '#4d5328', trim: '#3d5e40', petticoat: '#3f4e40', mud: '#5a4630',
  shawl: '#d8d2ba', hex: '#c6f25e', sash: '#9c2e24', sashDark: '#6e1f1a', leather: '#5c3b26', boot: '#382820',
  wood: '#6e4e2c', woodDark: '#4a3420', amber: '#f2b440', reed: '#8e9a44', bone: '#e8dfc4', tin: '#8c8a7c',
  sea: '#34b4ae', ruby: '#c02c40', amberGlass: '#e09a2a', emerald: '#2f9a5a', toad: '#7c7a3a', toadDark: '#4e4c26', toadBelly: '#d8c888',
};

// ---------------------------------------------------------------- the face
// The canvas covers the front half of her head (see paintedFace): x 256 is the middle of her face, y 256 her eye
// line (a little above), y 345 her mouth. Her own left is the viewer's right.
export function drawNettieFace(g, mood, S) {
  const k = S / 512;
  g.save();
  g.scale(k, k);
  g.fillStyle = NC.skin;
  g.fillRect(0, 0, 512, 512);
  // a little warmth and age: cheeks, freckles, lines by the mouth, a mole
  for (const x of [194, 318]) {
    const grad = g.createRadialGradient(x, 305, 2, x, 305, 26);
    grad.addColorStop(0, mood === 'happy' ? 'rgba(220,108,92,0.5)' : NC.cheek);
    grad.addColorStop(1, 'rgba(214,112,92,0)');
    g.fillStyle = grad;
    ellipse(g, x, 305, 30, 22);
    g.fill();
  }
  g.fillStyle = 'rgba(150,90,60,0.4)';
  for (const [x, y] of [[226, 296], [234, 302], [219, 305], [286, 296], [278, 303], [293, 305], [252, 312], [262, 311]]) {
    g.beginPath();
    g.arc(x, y, 1.7, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = NC.line;
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath(); // the lines from nose to mouth
    g.moveTo(256 + s * 22, 318);
    g.quadraticCurveTo(256 + s * 34, 334, 256 + s * 33, 352);
    g.stroke();
    // crow's feet
    for (const a of [-0.35, 0, 0.35]) {
      g.beginPath();
      g.moveTo(256 + s * 72, 262 + a * 10);
      g.lineTo(256 + s * 82, 262 + a * 22);
      g.stroke();
    }
  }
  // the shadow under her nose (the nose itself is modelled)
  g.fillStyle = 'rgba(150,80,60,0.35)';
  ellipse(g, 256, 316, 14, 5);
  g.fill();
  g.fillStyle = '#5a3228';
  g.beginPath(); // her mole
  g.arc(298, 344, 3, 0, Math.PI * 2);
  g.fill();

  // brows: thick, dark, the left one (viewer's right) always a little higher: she's never quite convinced
  const browSets = {
    calm: [[-1, 236, 0.1], [1, 228, -0.28]],
    blink: [[-1, 236, 0.1], [1, 229, -0.25]],
    surprised: [[-1, 220, -0.15], [1, 214, -0.3]],
    happy: [[-1, 232, 0], [1, 228, -0.1]],
    cross: [[-1, 240, 0.42], [1, 238, 0.36]],
    hurt: [[-1, 230, -0.35], [1, 230, -0.35]],
  };
  g.strokeStyle = NC.brow;
  g.lineCap = 'round';
  for (const [s, y, tilt] of browSets[mood]) {
    // tilt > 0: the inner end down (cross); < 0: the inner end up (worried or sceptical)
    const inner = 256 + s * 16, outer = 256 + s * 70;
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(inner, y + tilt * 16);
    g.quadraticCurveTo(256 + s * 42, y - 9 + tilt * 4, outer, y + 4 - tilt * 6);
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#5a5060'; // a grey thread in them
    g.beginPath();
    g.moveTo(256 + s * 30, y - 3 + tilt * 10);
    g.quadraticCurveTo(256 + s * 44, y - 8 + tilt * 3, 256 + s * 58, y - 2 - tilt * 4);
    g.stroke();
    g.strokeStyle = NC.brow;
  }

  // eyes
  const eye = (s, { open = 1, lid = 0.32, lower = 0, look = 0 } = {}) => {
    const cx = 256 + s * 46, cy = 262, rx = 25, ry = 15 * open;
    g.save();
    g.beginPath(); // the almond
    g.moveTo(cx - rx, cy);
    g.quadraticCurveTo(cx - rx * 0.2, cy - ry * 1.9, cx + rx, cy - 2);
    g.quadraticCurveTo(cx + rx * 0.2, cy + ry * 1.3, cx - rx, cy);
    g.closePath();
    g.fillStyle = NC.white;
    g.fill();
    g.clip();
    const ix = cx + look * 4 - s * 1, iy = cy - 1;
    g.fillStyle = NC.irisRing;
    g.beginPath(); g.arc(ix, iy, 13.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = NC.iris;
    g.beginPath(); g.arc(ix, iy, 10.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#140a08';
    g.beginPath(); g.arc(ix, iy, 5.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ix - 4, iy - 5, 3.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ix + 4.5, iy + 3.5, 1.5, 0, Math.PI * 2); g.fill();
    // the heavy upper lid (skin, a shade darker) comes down over the top of the iris
    g.fillStyle = mixColor(NC.skin, NC.skinShade, 0.55);
    g.fillRect(cx - rx - 2, cy - 30, rx * 2 + 4, 30 - ry * (1.6 - lid * 2.2) + 12 * lid);
    if (lower > 0) { g.fillStyle = NC.skin; g.fillRect(cx - rx - 2, cy + ry * (1 - lower), rx * 2 + 4, 30); }
    g.restore();
    // lash line along the lid's edge, and a flick at the outer corner
    const lidY = cy - ry * (1.6 - lid * 2.2) + 12 * lid;
    g.strokeStyle = NC.lash;
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(cx - rx - 1, cy + 1);
    g.quadraticCurveTo(cx, Math.min(lidY, cy) - 4, cx + rx + 2, cy - 2);
    g.stroke();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx + s * rx, cy - 2);
    g.lineTo(cx + s * (rx + 8), cy - 7);
    g.stroke();
    g.lineWidth = 1.8;
    g.strokeStyle = 'rgba(80,40,30,0.6)';
    g.beginPath();
    g.moveTo(cx - rx + 4, cy + ry * 0.9 * (1 - lower) + 2);
    g.quadraticCurveTo(cx, cy + ry * 1.25 * (1 - lower) + 3, cx + rx - 2, cy + 3);
    g.stroke();
  };
  const closed = (s, curve) => {
    const cx = 256 + s * 46, cy = 264;
    g.strokeStyle = NC.lash;
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(cx - 22, cy - curve * 0.3);
    g.quadraticCurveTo(cx, cy + curve, cx + 22, cy - curve * 0.3);
    g.stroke();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx + s * 20, cy);
    g.lineTo(cx + s * 28, cy - 5);
    g.stroke();
  };
  const squeeze = (s) => {
    const cx = 256 + s * 46, cy = 262;
    g.strokeStyle = NC.lash;
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(cx - s * 18, cy - 10);
    g.lineTo(cx + s * 8, cy);
    g.lineTo(cx - s * 18, cy + 9);
    g.stroke();
  };
  for (const s of [-1, 1]) {
    if (mood === 'calm') eye(s, { lid: s > 0 ? 0.3 : 0.4, look: 0.3 });
    else if (mood === 'blink') closed(s, 6);
    else if (mood === 'surprised') eye(s, { open: 1.15, lid: -0.05 });
    else if (mood === 'happy') closed(s, -9);
    else if (mood === 'cross') eye(s, { lid: 0.62, lower: 0.25 });
    else if (mood === 'hurt') squeeze(s);
  }

  // mouth
  g.strokeStyle = NC.lip;
  g.lineCap = 'round';
  g.lineWidth = 4.5;
  if (mood === 'calm' || mood === 'blink') {
    // the smirk: flat on her right, hooked up on her left
    g.beginPath();
    g.moveTo(228, 348);
    g.quadraticCurveTo(256, 352, 276, 346);
    g.quadraticCurveTo(284, 343, 288, 336);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(290, 332); g.lineTo(292, 340); g.stroke(); // the dimple
  } else if (mood === 'surprised') {
    g.fillStyle = '#6a2a30';
    ellipse(g, 258, 350, 9, 12);
    g.fill();
  } else if (mood === 'happy') {
    // a real grin, rare: open, with her teeth
    g.fillStyle = '#6a2a30';
    g.beginPath();
    g.moveTo(224, 340);
    g.quadraticCurveTo(256, 350, 292, 334);
    g.quadraticCurveTo(262, 382, 224, 340);
    g.fill();
    g.fillStyle = '#f4ecdc';
    g.beginPath();
    g.moveTo(228, 342);
    g.quadraticCurveTo(256, 351, 288, 337);
    g.lineTo(284, 346);
    g.quadraticCurveTo(256, 356, 232, 348);
    g.fill();
  } else if (mood === 'cross') {
    g.beginPath();
    g.moveTo(232, 352);
    g.quadraticCurveTo(258, 344, 284, 350);
    g.stroke();
  } else if (mood === 'hurt') {
    g.beginPath();
    g.moveTo(230, 350);
    for (let i = 0; i <= 6; i++) g.lineTo(230 + i * 9, 348 + (i % 2 ? -4 : 3));
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the Hexbane Shawl
// "Knotted by Nettie from bog-cotton and hag's hair, one knot for every curse she ever undid": a solid knotted band
// round the shoulders, then an open net of knots, then a fringe of knotted tassels. One thread through it glows.
// The canvas's top is the neckline (flipY off); alpha cuts the holes. Returns { map, glow } (glow: emissive map).
export function shawlTextures() {
  const W = 512, H = 256;
  const net = (g, glowOnly) => {
    if (!glowOnly) {
      // the dense band at the top
      g.fillStyle = NC.shawl;
      g.fillRect(0, 0, W, H * 0.3);
      g.fillStyle = 'rgba(120,110,90,0.35)';
      for (let y = 6; y < H * 0.3; y += 10)
        for (let x = (y / 10) % 2 ? 0 : 8; x < W; x += 16) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
      // the open net: diamonds of cord, a knot at every crossing
      g.strokeStyle = NC.shawl;
      g.lineWidth = 6;
      const step = 32;
      for (let x = -H; x < W + H; x += step) {
        g.beginPath(); g.moveTo(x, H * 0.28); g.lineTo(x + H * 0.62, H * 0.9); g.stroke();
        g.beginPath(); g.moveTo(x, H * 0.28); g.lineTo(x - H * 0.62, H * 0.9); g.stroke();
      }
      g.fillStyle = NC.shawl;
      for (let row = 0; row * step * 0.5 + H * 0.28 < H * 0.9; row++)
        for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
          g.beginPath(); g.arc(x, H * 0.28 + row * step * 0.5, 6, 0, Math.PI * 2); g.fill();
        }
      // the hem cord and the tassels
      g.fillRect(0, H * 0.88, W, 8);
      for (let x = 8; x < W; x += 16) {
        g.fillRect(x - 3, H * 0.88, 6, H * 0.1);
        g.beginPath(); g.arc(x, H * 0.93, 5, 0, Math.PI * 2); g.fill();
      }
      // a few bog-amber and bone beads knotted in
      for (const [x, y, c] of [[40, 0.45, '#d8a040'], [168, 0.62, '#e8dfc4'], [300, 0.45, '#d8a040'], [430, 0.62, '#e8dfc4']]) {
        g.fillStyle = c;
        g.beginPath(); g.arc(x, H * y, 7, 0, Math.PI * 2); g.fill();
      }
    }
    // the glowing thread: one hex she kept, tied through the whole shawl
    g.strokeStyle = glowOnly ? NC.hex : mixColor(NC.shawl, NC.hex, 0.7);
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 0; x <= W; x += 16) g.lineTo(x, H * (0.52 + 0.14 * Math.sin((x / W) * Math.PI * 6)));
    g.stroke();
  };
  const map = canvasTexture(W, H, (g) => net(g, false), { flipY: false });
  const glow = canvasTexture(W, H, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); net(g, true); }, { flipY: false });
  for (const t of [map, glow]) { t.wrapT = THREE.ClampToEdgeWrapping; }
  return { map, glow };
}

// ---------------------------------------------------------------- the robe
// Sedge green, folds, two patches with big stitches, a fen-moss trim, and the hem stained with mud. Canvas top is
// the waist (flipY off), so it suits skirt().
export function robeTexture(base = NC.robe, trim = NC.trim, patches = true) {
  return canvasTexture(512, 256, (g, W, H) => {
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 28) {
      const grad = g.createLinearGradient(x, 0, x + 28, 0);
      grad.addColorStop(0, 'rgba(20,24,0,0.2)');
      grad.addColorStop(0.5, 'rgba(255,255,200,0.07)');
      grad.addColorStop(1, 'rgba(20,24,0,0.2)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 28, H);
    }
    // weave
    g.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    if (patches) {
      patch(g, 90, 70, 60, 50, NC.patch, '#d8c890');
      patch(g, 330, 120, 50, 44, '#8a6a3a', '#e8dcb0');
    }
    // mud climbing up the hem
    const mud = g.createLinearGradient(0, H * 0.66, 0, H);
    mud.addColorStop(0, 'rgba(70,52,30,0)');
    mud.addColorStop(0.6, 'rgba(70,52,30,0.55)');
    mud.addColorStop(1, 'rgba(60,42,24,0.85)');
    g.fillStyle = mud;
    g.fillRect(0, H * 0.66, W, H * 0.34);
    g.fillStyle = 'rgba(60,44,26,0.5)';
    for (let i = 0; i < 30; i++) { g.beginPath(); g.arc((i * 83) % W, H * 0.72 + ((i * 37) % 40), 3 + (i % 4) * 2, 0, Math.PI * 2); g.fill(); }
    // fen-moss trim
    g.fillStyle = trim;
    g.fillRect(0, H * 0.9, W, H * 0.1);
    g.strokeStyle = '#a8b870';
    g.setLineDash([6, 6]);
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, H * 0.905); g.lineTo(W, H * 0.905); g.stroke();
    g.setLineDash([]);
  }, { flipY: false });
}

function patch(g, x, y, w, h, color, thread) {
  g.save();
  g.translate(x, y);
  g.rotate(0.08);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < w; i += 8) g.fillRect(i, 0, 3, h);
  g.strokeStyle = thread;
  g.lineWidth = 2;
  g.setLineDash([5, 5]);
  g.strokeRect(3, 3, w - 6, h - 6);
  g.restore();
}

// Her bodice: the robe's green, laced up the front with a leather thong. Cylinder UVs start at the front (u = 0).
export function bodiceTexture() {
  return canvasTexture(256, 128, (g, W, H) => {
    g.fillStyle = NC.robe;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    for (const x0 of [0, W]) {
      g.fillStyle = NC.robeDark;
      g.fillRect(x0 - 12, 0, 24, H);
      g.strokeStyle = NC.leather;
      g.lineWidth = 3;
      for (let y = 8; y < H; y += 18) {
        g.beginPath(); g.moveTo(x0 - 9, y); g.lineTo(x0 + 9, y + 12); g.moveTo(x0 + 9, y); g.lineTo(x0 - 9, y + 12); g.stroke();
      }
    }
  });
}

// The hat's felt: peat brown, rubbed pale in places, a violet patch, big stitches and a bloom of moss.
export function feltTexture(withPatch = true) {
  return canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = NC.hat;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = i % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,230,190,0.05)';
      g.fillRect((i * 97) % W, (i * 61) % H, 3, 2);
    }
    if (withPatch) patch(g, 150, 70, 46, 40, NC.patch, '#e0d0a0');
    g.fillStyle = 'rgba(90,120,50,0.5)';
    for (const [x, y, r] of [[40, 200, 14], [52, 212, 9], [30, 214, 8], [200, 230, 10]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  });
}

// Fen water: black-green at the root, peat-brown in the body, pale foam at the crest.
export function waterTexture() {
  return canvasTexture(64, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, 'rgba(12,30,26,0.9)');
    grad.addColorStop(0.55, 'rgba(34,82,70,0.9)');
    grad.addColorStop(0.85, 'rgba(120,190,160,0.95)');
    grad.addColorStop(1, 'rgba(230,255,240,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(200,255,230,0.35)';
    g.lineWidth = 2;
    for (let y = 10; y < H; y += 14) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(20, y - 6, 40, y + 6, 64, y); g.stroke(); }
  });
}
