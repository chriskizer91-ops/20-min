import * as THREE from 'three';
import { cyl, taperedTube } from './kit.js';
import { mat, glow, paint, mergeParts, rng, TAU } from './bosses-kit.js';
import { fx as fxArt, faces as faceArt } from '../assets.js';
import { faceTools, sampleSkin, reskin, rgb } from './face-sheet.js';

// The Lantern Mother's things: the lamplighter's lantern full of Wickhollow's borrowed violet flames, her hooked
// lamp-pole, the lace of her veil, her faces, and the lamp-moths that come to her light. The model is in
// bosses-lantern.js.

export const LM = {
  skin: '#dcd6ec', skinShade: '#b8aed4', hair: '#261c34', hairTip: '#4a3a64', gown: '#221a2e', coat: '#2c3040', coatLining: '#4a3a5c',
  lace: '#1f1830', laceHi: '#b9a8e0', brass: '#7a6640', brassDark: '#4a3a22', verdigris: '#6f9a8a', wood: '#3e2c22',
  flame: '#c77dff', flameCore: '#f3dcff', lily: '#f4e6f0', lilyHeart: '#f0d27a', pad: '#3f6a4a', glow: '#b58cff',
};

// Sprites cut from a sheet (each with its own frame): the sprites exist at once, their pictures arrive when the
// image has loaded (cloning before then would upload an empty texture).
export function sheetSprites(url, n, cols, rows, make) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    list.push(make(s, i) ?? { s });
  }
  const sheet = { list, ready: false };
  new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    for (const it of list) {
      it.tex = t.clone();
      it.tex.repeat.set(1 / cols, 1 / rows);
      if (rows > 1) it.tex.offset.y = 1 - 1 / rows;
      it.s.material.map = it.tex;
      it.s.material.needsUpdate = true;
      it.s.visible = true;
    }
    sheet.ready = true;
  });
  return sheet;
}

// ---------------------------------------------------------------- the lantern
// A tall hexagonal lamplighter's lantern: a ring handle, a pointed cap with a chimney, six brass bars, violet-tinted
// glass, a heavy base. Inside, many small flames drift: the lights she borrowed from Wickhollow.
export function buildLantern(part, thin) {
  const brass = mat(LM.brass, { emissive: new THREE.Color('#3a2a10'), emissiveIntensity: 0.4 });
  const dark = mat(LM.brassDark);
  const lantern = new THREE.Group();
  lantern.name = 'lantern';
  // everything hangs below the handle (the origin)
  part(lantern, new THREE.TorusGeometry(0.045, 0.009, 6, 18), brass, { pos: [0, -0.045, 0], ink: thin });
  const cap = mergeParts([
    { geo: new THREE.ConeGeometry(0.12, 0.1, 6), pos: [0, -0.14, 0] },
    { geo: new THREE.CylinderGeometry(0.02, 0.025, 0.05, 6), pos: [0, -0.09, 0] },
    { geo: new THREE.SphereGeometry(0.018, 8, 6), pos: [0, -0.065, 0] },
    { geo: new THREE.CylinderGeometry(0.125, 0.125, 0.02, 6), pos: [0, -0.195, 0] },
  ]);
  part(lantern, cap, brass, { ink: thin });
  const bars = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    bars.push({ geo: new THREE.CylinderGeometry(0.007, 0.007, 0.26, 4), pos: [Math.cos(a) * 0.105, -0.33, Math.sin(a) * 0.105] });
  }
  bars.push({ geo: new THREE.CylinderGeometry(0.115, 0.115, 0.012, 6), pos: [0, -0.21, 0] });
  bars.push({ geo: new THREE.CylinderGeometry(0.115, 0.115, 0.012, 6), pos: [0, -0.45, 0] });
  part(lantern, mergeParts(bars), dark, { ink: false });
  const glassMat = new THREE.MeshToonMaterial({ color: '#9a86d8', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#4a2a80'), emissiveIntensity: 0.15 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 6, 1, true), glassMat);
  glass.position.y = -0.33;
  glass.renderOrder = 3;
  lantern.add(glass);
  part(lantern, mergeParts([
    { geo: new THREE.CylinderGeometry(0.125, 0.14, 0.05, 6), pos: [0, -0.475, 0] },
    { geo: new THREE.CylinderGeometry(0.08, 0.06, 0.03, 6), pos: [0, -0.515, 0] },
  ]), brass, { ink: thin });

  // The flames: witchfire sprites (art/fx/witchfire.webp, eight frames), each on its own frame and path.
  const r = rng(29);
  const sheet = sheetSprites(fxArt.witchfire, 9, 8, 1, (s, i) => {
    s.material.blending = THREE.AdditiveBlending;
    s.material.opacity = 1;
    s.center.set(0.5, 0.25);
    s.renderOrder = 4;
    lantern.add(s);
    return { s, a: r() * TAU, rr: 0.025 + r() * 0.045, y: -0.42 + r() * 0.13, sp: 0.6 + r() * 0.9, f: Math.floor(r() * 8), size: 0.055 + r() * 0.03, lit: 1, home: false, hx: 0, hy: 0, hz: 0, ht: 0 };
  });
  const flames = sheet.list;
  const core = glow(LM.flameCore, 0.15, 0.35);
  core.position.y = -0.33;
  lantern.add(core);
  const aura = glow(LM.flame, 1.1, 0.35);
  aura.position.y = -0.33;
  lantern.add(aura);
  const light = new THREE.PointLight(LM.flame, 1.3, 4, 2);
  light.position.y = -0.33;
  lantern.add(light);
  return { lantern, flames, core, aura, light, glassMat, brass };
}

// ---------------------------------------------------------------- the lamp-pole
// The long hooked pole she lit Misthollow's lamps with: a wooden shaft, a brass hook and a little wick-holder on
// top, a brass ferrule at the foot. Its origin is where she grips it.
export function buildPole(part, thin) {
  const pole = new THREE.Group();
  pole.name = 'lamp-pole';
  const wood = mat(LM.wood);
  const brass = mat(LM.brass, { emissive: new THREE.Color('#3a2a10'), emissiveIntensity: 0.3 });
  part(pole, cyl(0.016, 0.02, 2.4, 7), wood, { pos: [0, 0.1, 0], ink: thin });
  part(pole, mergeParts([
    { geo: new THREE.CylinderGeometry(0.024, 0.018, 0.08, 7), pos: [0, -1.08, 0] },
    { geo: new THREE.CylinderGeometry(0.022, 0.022, 0.05, 7), pos: [0, 1.3, 0] },
  ]), brass, { ink: thin });
  // the hook, and a wick-holder like a tiny bell
  part(pole, taperedTube([[0, 1.3, 0], [0, 1.42, 0], [0.03, 1.5, 0], [0.09, 1.5, 0], [0.11, 1.44, 0], [0.09, 1.4, 0]], 0.012, 0.008, 16, 5), brass, { ink: thin });
  part(pole, mergeParts([
    { geo: new THREE.ConeGeometry(0.03, 0.05, 8), pos: [-0.04, 1.36, 0], rot: [0, 0, Math.PI] },
    { geo: new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), pos: [-0.02, 1.39, 0], rot: [0, 0, 1.0] },
  ]), brass, { ink: thin });
  const tipFlame = glow(LM.flame, 0.12, 0);
  tipFlame.position.set(-0.04, 1.33, 0);
  pole.add(tipFlame);
  return { pole, tipFlame };
}

// ---------------------------------------------------------------- lace
// The veil's lace: a fine net, rosettes and leaves, a scalloped hem, and beads of water. Returns the colour map and
// an alpha map (net faint, motifs solid, holes gone). The canvas top is the top of the veil (flipY false).
export function makeLace(seed = 3, repeat = 3, clearTop = false) {
  const W = 512, H = 512;
  const r = rng(seed);
  const motifs = [];
  // rosettes scattered over the net, thinning toward the top
  // (the face veil keeps its top clear, so her face shows through)
  if (!clearTop) for (let i = 0; i < 14; i++) motifs.push({ x: r() * W, y: H * (0.2 + r() * 0.5), s: 22 + r() * 16, k: r() });
  const rosette = (g, x, y, s, fill, stroke) => {
    g.save();
    g.translate(x, y);
    for (let p = 0; p < 6; p++) {
      g.rotate(TAU / 6);
      g.beginPath(); g.ellipse(0, s * 0.5, s * 0.25, s * 0.45, 0, 0, TAU);
      g.fillStyle = fill; g.fill();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
    }
    g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
    g.restore();
  };
  const spray = (g, x, y, s, rot, fill) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.strokeStyle = fill;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.5, s, 0); g.stroke();
    for (let p = -2; p <= 2; p++) { g.fillStyle = fill; g.beginPath(); g.ellipse(p * s * 0.42, -s * 0.22 + (p % 2 ? 7 : -7), s * 0.14, s * 0.3, p * 0.5, 0, TAU); g.fill(); }
    g.restore();
  };
  const pattern = (g, fill, stroke) => {
    for (const m of motifs) m.k < 0.6 ? rosette(g, m.x, m.y, m.s, fill, stroke) : spray(g, m.x, m.y, m.s, m.k * 6, fill);
    // an insertion band of small rosettes
    for (let x = 16; x < W; x += 64) rosette(g, x, H * 0.76, 14, fill, stroke);
    // the border: a dense band with scallops and eyelets
    g.fillStyle = fill;
    g.fillRect(0, H * 0.84, W, H * 0.07);
    for (let x = 0; x < W; x += 32) { g.beginPath(); g.arc(x + 16, H * 0.91, 16, 0, Math.PI); g.fill(); }
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, H * 0.84); g.lineTo(W, H * 0.84); g.stroke();
      for (let x = 0; x < W; x += 32) { g.beginPath(); g.arc(x + 16, H * 0.91, 16, 0, Math.PI); g.stroke(); }
    }
  };
  const map = paint(W, H, (g) => {
    g.fillStyle = LM.lace;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,100,170,0.5)';
    g.lineWidth = 1;
    for (let x = -H; x < W + H; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.35, H); g.stroke(); g.beginPath(); g.moveTo(x, 0); g.lineTo(x - H * 0.35, H); g.stroke(); }
    pattern(g, '#3e325e', '#8e7eba');
    // beads of fen water
    for (let i = 0; i < 60; i++) {
      g.fillStyle = 'rgba(220,235,255,0.95)';
      g.beginPath(); g.arc(r() * W, r() * H * 0.95, 1.8 + r() * 1.8, 0, TAU); g.fill();
    }
  }, { flipY: false, repeat: [repeat, 1] });
  const alpha = paint(W, H, (g) => {
    // the net fades in from sheer at the top to a little denser low down
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#303030');
    grad.addColorStop(0.8, '#4a4a4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H * 0.84);
    g.strokeStyle = '#7a7a7a';
    g.lineWidth = 1.2;
    for (let x = -H; x < W + H; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.35, H * 0.84); g.stroke(); g.beginPath(); g.moveTo(x, 0); g.lineTo(x - H * 0.35, H * 0.84); g.stroke(); }
    pattern(g, '#c4c4c4', '#dcdcdc');
    g.fillStyle = '#000000';
    for (let x = 0; x < W; x += 32) { g.beginPath(); g.arc(x + 16, H * 0.895, 5, 0, TAU); g.fill(); g.beginPath(); g.arc(x, H * 0.865, 3, 0, TAU); g.fill(); }
  }, { flipY: false, srgb: false, repeat: [repeat, 1] });
  return { map, alpha };
}

// ---------------------------------------------------------------- faces
// Painted onto the front of the head (u 0.25). Kind, and sad: soft brows that lift in the middle, large downcast
// violet eyes with long lashes, a small mouth, and the shine of an old tear.
export function makeFaces() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const cx = W / 4, cy = H / 2 + 16;
  const eyeX = 44, eyeY = cy - 4;
  const INKC = '#1c1230';
  const draw = (mood) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = LM.skin;
    g.fillRect(0, 0, W, H);
    // a cool shadow under the brow line and down the sides of the face
    const sh = g.createRadialGradient(cx, cy + 10, 30, cx, cy + 10, 140);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(120,100,170,0.35)');
    g.fillStyle = sh;
    g.fillRect(cx - 200, cy - 200, 400, 400);
    g.translate(cx, cy);
    g.scale(1.35, 1.35);
    g.translate(-cx, -cy);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // cheeks
    for (const s of [-1, 1]) {
      const grad = g.createRadialGradient(cx + s * 52, cy + 28, 0, cx + s * 52, cy + 28, 22);
      grad.addColorStop(0, mood === 'grief' || mood === 'ask' ? 'rgba(220,140,190,0.5)' : 'rgba(210,150,200,0.35)');
      grad.addColorStop(1, 'rgba(210,150,200,0)');
      g.fillStyle = grad;
      g.fillRect(cx + s * 52 - 22, cy + 6, 44, 44);
    }
    // brows: thin, lifting in the middle (sadness); higher for grief and asking, lower and straight for stern
    g.strokeStyle = '#3a2a4e';
    g.lineWidth = 3.2;
    for (const s of [-1, 1]) {
      const inner = { grief: -12, ask: -10, stern: 2, hurt: -6, hush: -4 }[mood] ?? -7;
      const outer = { grief: 2, ask: -6, stern: -2 }[mood] ?? 0;
      g.beginPath();
      g.moveTo(cx + s * (eyeX - 16), eyeY - 26 + inner);
      g.quadraticCurveTo(cx + s * (eyeX + 2), eyeY - 34 + (inner + outer) / 2, cx + s * (eyeX + 20), eyeY - 25 + outer);
      g.stroke();
    }
    for (const s of [-1, 1]) {
      const x = cx + s * eyeX;
      const closed = mood === 'blink' || mood === 'hush' || mood === 'hurt';
      if (closed) {
        g.strokeStyle = INKC;
        g.lineWidth = 3.5;
        g.beginPath();
        if (mood === 'hurt') { g.moveTo(x - s * 14, eyeY - 7); g.lineTo(x + s * 8, eyeY); g.lineTo(x - s * 14, eyeY + 6); }
        else g.arc(x, eyeY - 8, 16, Math.PI * 0.18, Math.PI * 0.82);
        g.stroke();
        if (mood !== 'hurt') {
          g.lineWidth = 2.5;
          for (const l of [0.1, 0.35, 0.6, 0.85]) {
            const ang = Math.PI * (0.18 + l * 0.64);
            const px = x + Math.cos(ang) * 16, py = eyeY - 8 + Math.sin(ang) * 16;
            g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ang) * 6, py + Math.sin(ang) * 7); g.stroke();
          }
        }
        continue;
      }
      // open: almond eyes, lids a little lowered (downcast), bigger when she asks
      const open = mood === 'ask' ? 1.12 : mood === 'stern' ? 0.62 : mood === 'rest' ? 0.7 : 0.86;
      const h = 17 * open;
      g.fillStyle = '#f6f2ff';
      g.beginPath(); g.ellipse(x, eyeY + 2, 17, h, 0, 0, TAU); g.fill();
      const iris = g.createRadialGradient(x, eyeY + 4, 2, x, eyeY + 4, 14);
      const glowEye = mood === 'stern';
      iris.addColorStop(0, glowEye ? '#f0d8ff' : '#8a64c8');
      iris.addColorStop(0.6, glowEye ? '#b07cff' : '#5a3a92');
      iris.addColorStop(1, '#2a1a48');
      g.fillStyle = iris;
      g.beginPath(); g.ellipse(x, eyeY + 4, 12.5, Math.min(h + 1, 15), 0, 0, TAU); g.fill();
      if (!glowEye) { g.fillStyle = '#180e2a'; g.beginPath(); g.ellipse(x, eyeY + 5, 5.5, Math.min(h - 3, 8), 0, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(x - 4, eyeY - 2, 3.8, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + 5, eyeY + 9, 1.8, 0, TAU); g.fill();
      // the upper lid, heavy and lowered, and long lashes toward the outer corner
      g.fillStyle = LM.skin;
      const lid = mood === 'ask' ? 0 : mood === 'stern' ? 10 : mood === 'calm' ? 8 : 5;
      g.beginPath(); g.ellipse(x, eyeY - h + lid - 6, 20, 10, 0, 0, TAU); g.fill();
      g.strokeStyle = INKC;
      g.lineWidth = 3.8;
      g.beginPath(); g.ellipse(x, eyeY + 2, 17, h, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.lineWidth = 2.6;
      for (const l of [0.62, 0.78, 0.94]) {
        const ang = Math.PI * (1 + l * (s > 0 ? 1 : 0) + (s > 0 ? 0 : 1 - l));
        const px = x + Math.cos(ang) * 17, py = eyeY + 2 + Math.sin(ang) * h;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ang) * 7, py + Math.sin(ang) * 7 - 2); g.stroke();
      }
      g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(x, eyeY + 2, 16, h, 0, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      // the wet shine of tears (grief)
      if (mood === 'grief') {
        g.fillStyle = 'rgba(210,235,255,0.85)';
        g.beginPath(); g.ellipse(x, eyeY + h + 1, 11, 2.5, 0, 0, TAU); g.fill();
      }
    }
    // a tear track down one cheek, catching the light
    g.strokeStyle = mood === 'grief' ? 'rgba(200,230,255,0.9)' : 'rgba(200,225,255,0.45)';
    g.lineWidth = mood === 'grief' ? 3 : 2;
    g.beginPath(); g.moveTo(cx + eyeX - 6, eyeY + 20); g.quadraticCurveTo(cx + eyeX - 2, eyeY + 40, cx + eyeX - 8, eyeY + 56); g.stroke();
    if (mood === 'grief') { g.beginPath(); g.moveTo(cx - eyeX + 6, eyeY + 20); g.quadraticCurveTo(cx - eyeX + 2, eyeY + 42, cx - eyeX + 7, eyeY + 60); g.stroke(); }
    // nose: a soft line
    g.strokeStyle = 'rgba(110,90,150,0.6)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx + 2, cy + 8); g.quadraticCurveTo(cx + 5, cy + 18, cx, cy + 20); g.stroke();
    // mouth
    const my = cy + 40;
    g.strokeStyle = '#6a3a60';
    g.fillStyle = '#9a4a78';
    g.lineWidth = 3;
    if (mood === 'hush') {
      g.beginPath(); g.ellipse(cx, my, 5, 4, 0, 0, TAU); g.fill();
    } else if (mood === 'ask') {
      g.fillStyle = '#4a2240';
      g.beginPath(); g.ellipse(cx, my + 1, 7, 6, 0, 0, TAU); g.fill();
      g.fillStyle = '#b86a90';
      g.beginPath(); g.ellipse(cx, my - 3, 9, 3, 0, 0, Math.PI); g.fill();
    } else if (mood === 'grief' || mood === 'hurt') {
      g.beginPath(); g.moveTo(cx - 11, my + 4); g.quadraticCurveTo(cx, my - 3, cx + 11, my + 4); g.stroke();
    } else if (mood === 'stern') {
      g.beginPath(); g.moveTo(cx - 10, my); g.lineTo(cx + 10, my); g.stroke();
    } else {
      // a small, kind, sad smile
      g.beginPath(); g.moveTo(cx - 9, my); g.quadraticCurveTo(cx, my + 3, cx + 9, my); g.stroke();
      g.fillStyle = 'rgba(190,110,150,0.5)';
      g.beginPath(); g.ellipse(cx, my + 4, 6, 2, 0, 0, TAU); g.fill();
    }
  };
  // Her painted faces from art batch 2 (#18), once the sheet has loaded; the code-painted face shows until then.
  let painted = null;
  const sheet = new Image();
  sheet.onload = () => {
    painted = paintedLanternFaces(sheet);
    const m = current;
    current = null;
    if (m) show(m);
  };
  sheet.src = faceArt.nettieLanternMother;
  let current = null;
  const show = (mood) => {
    if (mood === current) return;
    current = mood;
    if (painted) painted(g, mood, W, H, cx, cy);
    else draw(mood);
    texture.needsUpdate = true;
  };
  return { texture, show };
}

// The sheet's bottom row paints her twice: eyes open with old tear stains (left) and eyes closed in a smile (right).
// Her eight moods are built from those (see face-sheet.js), re-skinned from the sheet's pale blue to her own
// lavender so the face matches her hands. Cell coordinates (512 px): eyes at (150, 190) and (365, 190), brows y 66-138,
// mouth y 330-380.
function paintedLanternFaces(sheet) {
  const CELL = 512;
  const from = sampleSkin(sheet, 8, CELL + 8);
  const skin = [parseInt(LM.skin.slice(1, 3), 16), parseInt(LM.skin.slice(3, 5), 16), parseInt(LM.skin.slice(5, 7), 16)];
  const open = reskin(sheet, [0, CELL, CELL, CELL], from, skin);
  const smile = reskin(sheet, [CELL, CELL, CELL, CELL], from, skin);
  const EYES = [[150, 190], [365, 190]];
  const BROWS = [[60, 64, 224, 138], [284, 64, 452, 138]];
  const cells = {};
  const compose = (mood) => {
    const c = document.createElement('canvas');
    c.width = c.height = CELL;
    const g = c.getContext('2d');
    const closedSmile = mood === 'hush' || mood === 'rest';
    g.drawImage(closedSmile ? smile : open, 0, 0);
    const f = faceTools(g, skin);
    // The re-skinned nose comes out pinker than her portraits'; soften it
    g.globalAlpha = 0.45;
    f.erase(258, 290, 50, 42);
    g.globalAlpha = 1;
    const brow = { grief: [-0.22, 0], ask: [0, -14], stern: [0.3, 10], hurt: [-0.2, 4] }[mood];
    if (brow) BROWS.forEach((box, i) => f.moveBrow(open, box, i === 0 ? 1 : -1, ...brow));
    // A blink borrows the closed lids from the smiling face
    if (mood === 'blink') for (const [x, y] of EYES) f.transplant(smile, [x - 110, y - 62, 220, 110]);
    if (mood === 'hurt') {
      for (const [i, [x, y]] of EYES.entries()) {
        f.erase(x, y, 100, 58);
        f.closedEye(x, y, i === 0 ? -1 : 1, { lash: '#1c1230', sag: 12, crease: 'rgba(110,90,150,0.5)' });
      }
    }
    // Stern (her last phase): the irises burn violet
    if (mood === 'stern') {
      g.globalCompositeOperation = 'lighter';
      for (const [x, y] of EYES) {
        const glowG = g.createRadialGradient(x, y + 4, 2, x, y + 4, 34);
        glowG.addColorStop(0, 'rgba(240,210,255,0.95)');
        glowG.addColorStop(0.5, 'rgba(176,124,255,0.6)');
        glowG.addColorStop(1, 'rgba(176,124,255,0)');
        g.fillStyle = glowG;
        g.beginPath();
        g.arc(x, y + 4, 34, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    const mouth = { ask: 'o', stern: 'flat', hurt: 'down', grief: 'down' }[mood];
    if (mouth) {
      f.erase(258, 355, 96, 34);
      f.mouth(mouth, 258, 352, { lip: '#c47a9e', dark: '#6a3a60', half: 48 });
    }
    // Fade the cell's edges out, so it melts into the skin round it
    g.globalCompositeOperation = 'destination-in';
    const edge = g.createRadialGradient(256, 236, 150, 256, 236, 256);
    edge.addColorStop(0, '#000');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = edge;
    g.fillRect(0, 0, CELL, CELL);
    g.globalCompositeOperation = 'source-over';
    return c;
  };
  return (g, mood, W, H, cx, cy) => {
    cells[mood] ??= compose(mood);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = rgb(skin);
    g.fillRect(0, 0, W, H);
    // The cell drawn so its eyes land where the code-painted eyes were (cx +-59, cy - 5), a little squashed so the
    // mouth isn't too low on the round head
    const sx = 0.53, sy = 0.46;
    g.drawImage(cells[mood], cx - 257.5 * sx, cy - 5 - 190 * sy, CELL * sx, CELL * sy);
    // A cool shadow round the face, as the code-painted one had
    const sh = g.createRadialGradient(cx, cy + 10, 80, cx, cy + 10, 190);
    sh.addColorStop(0, 'rgba(120,100,170,0)');
    sh.addColorStop(1, 'rgba(120,100,170,0.35)');
    g.fillStyle = sh;
    g.fillRect(cx - 240, cy - 240, 480, 480);
  };
}

// ---------------------------------------------------------------- cloth
export function makeGownTexture() {
  // Deep violet-black, wetter and bluer toward the hem: tide-lines, long wet sheen streaks, drips and duckweed.
  return paint(512, 512, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2e2440');
    grad.addColorStop(0.45, '#221a30');
    grad.addColorStop(0.8, '#15192a');
    grad.addColorStop(1, '#0e1520');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const r = rng(14);
    for (let x = 0; x < W; x += 28) {
      const f = g.createLinearGradient(x, 0, x + 28, 0);
      f.addColorStop(0, 'rgba(0,0,10,0.3)');
      f.addColorStop(0.5, 'rgba(150,140,210,0.08)');
      f.addColorStop(1, 'rgba(0,0,10,0.3)');
      g.fillStyle = f;
      g.fillRect(x, 0, 28, H);
    }
    // wet sheen streaks
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = H * (0.3 + r() * 0.5), len = 40 + r() * 140;
      const s = g.createLinearGradient(0, y, 0, y + len);
      s.addColorStop(0, 'rgba(170,190,240,0)');
      s.addColorStop(0.5, 'rgba(170,190,240,0.22)');
      s.addColorStop(1, 'rgba(170,190,240,0)');
      g.fillStyle = s;
      g.fillRect(x, y, 2 + r() * 2, len);
    }
    // tide lines
    g.strokeStyle = 'rgba(150,180,200,0.22)';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = H * (0.66 + i * 0.09);
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + i * 2) * 4);
      g.stroke();
    }
    // duckweed and water beads near the hem
    for (let i = 0; i < 90; i++) {
      const y = H * (0.8 + r() * 0.2);
      g.fillStyle = r() < 0.6 ? `rgba(110,160,80,${0.6 + r() * 0.3})` : 'rgba(200,230,255,0.7)';
      g.beginPath(); g.arc(r() * W, y, 1.5 + r() * 2.5, 0, TAU); g.fill();
    }
  }, { flipY: false, repeat: [2, 1] });
}

export function makeCoatTexture() {
  // The lamplighter's coat: dark slate wool, a darker wet hem, a line of stitching and brass-bright piping.
  return paint(256, 256, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#343a4c');
    grad.addColorStop(0.7, '#262b3a');
    grad.addColorStop(1, '#161a24');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const r = rng(19);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.15})`; g.fillRect(r() * W, r() * H, 2, 3); }
    g.strokeStyle = 'rgba(200,170,110,0.55)';
    g.lineWidth = 3;
    g.setLineDash([6, 5]);
    g.beginPath(); g.moveTo(0, H * 0.9); g.lineTo(W, H * 0.9); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(170,190,220,0.2)';
    for (let i = 0; i < 20; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, H * 0.5); g.lineTo(x + (r() - 0.5) * 6, H); g.stroke(); }
  }, { flipY: false });
}

// ---------------------------------------------------------------- lamp-moths
// Little pale-gold moths (art/fx/moths-fireflies.webp's top row: four flaps) that come to her lantern.
export function buildMoths(count) {
  const r = rng(51);
  return sheetSprites(fxArt.mothsFireflies, count, 4, 2, (s) => {
    s.material.color.set('#fff6d8');
    s.scale.set(0.34, 0.34, 1);
    const g = glow('#ffd98a', 0.4, 0);
    s.add(g);
    return { s, g, a: r() * TAU, r: 0.28 + r() * 0.2, y: (r() - 0.5) * 0.3, sp: 1.6 + r() * 1.2, f: r() * 4, on: 0, want: 0 };
  }).list;
}

// A water-lily for her wreath: two rings of pointed petals and a gold heart.
export function lilyGeometry(scale = 1) {
  const petal = (len, wid) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(wid, len * 0.5, 0, len);
    s.quadraticCurveTo(-wid, len * 0.5, 0, 0);
    return new THREE.ShapeGeometry(s, 4);
  };
  const parts = [];
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + ring * 0.45;
      const tilt = ring ? 0.9 : 0.45;
      parts.push({ geo: petal(0.05 * scale * (ring ? 0.8 : 1), 0.018 * scale), rot: [-Math.PI / 2 + tilt, a, 0], rotOrder: 'YXZ' });
    }
  const geos = parts.map((p) => {
    const g = p.geo.clone();
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2], 'YXZ')));
    return { geo: g };
  });
  return mergeParts(geos);
}
