import * as THREE from 'three';
import { part, joint, sphere, taperedTube, skirt, glowSprite, blobShadow, onLayer, Spring } from './kit.js';
import { fx as fxArt } from '../assets.js';
import { Trail } from './witch-moves.js';
import { Hollow, hollowDressing, Actions, Motes, texture, canvasTexture, space, fxGroup, ss, bell, hold } from './foes-common.js';

// The Lamp-Moth (Aethermoor's lamp-moth): "a moth the size of a hand, pale gold, drawn to the Lantern Mother's
// light", made big enough to read, and carrying one violet Wickhollow flame it has borrowed (docs/LORE.md §7).
// Furry body with a cream ruff, feathered antennae, four soft wings painted with veins, a wavy band, a fringe
// and a violet eyespot. It flies gracefully: slow beats, glides, a lazy figure-eight, the flame swinging under
// it like a lantern. Intents: Dust in the Eyes (Spooked), Circle the Light (Hasted), Batter. Beaten, it drops
// the flame, which floats home, and settles on the ground to rest.

const C = {
  fur: '#e6c270', furLight: '#f7e2a4', furDark: '#b58d45', leg: '#9c7e48', eye: '#241830',
  wing: '#efcf82', wingEdge: '#f9e8b8', vein: 'rgba(150,112,58,0.55)', band: '#a27a40', spot: '#6b3f7a',
};

// ---------------------------------------------------------------- textures, painted in code
function furTexture() {
  return canvasTexture(128, 128, (g, W, H) => {
    g.fillStyle = C.fur;
    g.fillRect(0, 0, W, H);
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      const x = rand() * W, y = rand() * H, len = 3 + rand() * 6, a = Math.PI / 2 + (rand() - 0.5) * 0.9;
      g.strokeStyle = rand() < 0.5 ? 'rgba(255,248,220,0.55)' : 'rgba(170,135,70,0.45)';
      g.lineWidth = 1.2;
      for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        g.stroke();
      }
    }
  }, { repeat: [3, 2] });
}

// Bands for the abdomen: fur with darker rings
function bandTexture() {
  return canvasTexture(64, 64, (g, W, H) => {
    g.fillStyle = C.fur;
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 16) { g.fillStyle = 'rgba(160,120,60,0.45)'; g.fillRect(0, y, W, 5); }
    let seed = 9;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = rand() * W, y = rand() * H;
      g.strokeStyle = rand() < 0.5 ? 'rgba(255,248,220,0.5)' : 'rgba(160,125,65,0.4)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 2, y + 4); g.stroke();
    }
  }, { repeat: [3, 1] });
}

// A wing: outline path in canvas space (root at the left middle), painted with veins, a wavy band, an eyespot
// and a hair fringe past the edge that makes the silhouette feathery. Alpha-tested, so no ink around it; the
// dark edge is painted in.
function wingTexture(kind) {
  const W = 256, H = kind === 'fore' ? 160 : 192;
  return canvasTexture(W, H, (g) => {
    const outline = new Path2D();
    let tip, rootY;
    if (kind === 'fore') {
      rootY = 84;
      outline.moveTo(6, 70);
      outline.bezierCurveTo(60, 40, 150, 10, 232, 22); // leading edge up to the tip
      outline.bezierCurveTo(252, 26, 250, 50, 240, 70); // round tip
      outline.bezierCurveTo(226, 110, 200, 138, 170, 146); // outer margin
      outline.bezierCurveTo(110, 150, 50, 122, 6, 98); // trailing edge back to the root
      outline.closePath();
      tip = [236, 40];
    } else {
      rootY = 60;
      outline.moveTo(6, 48);
      outline.bezierCurveTo(70, 22, 150, 18, 196, 40);
      outline.bezierCurveTo(236, 62, 240, 120, 210, 156);
      outline.bezierCurveTo(176, 188, 110, 190, 70, 170);
      outline.bezierCurveTo(36, 150, 12, 110, 6, 78);
      outline.closePath();
      tip = [200, 110];
    }
    // Fringe: fine hairs all round the outer edge, drawn first so the wing covers their roots
    g.save();
    g.strokeStyle = C.wingEdge;
    g.lineWidth = 1.6;
    let seed = kind === 'fore' ? 5 : 8;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const probe = document.createElement('canvas').getContext('2d');
    for (let a = -1.35; a < 1.45; a += 0.018) {
      // walk out from the wing's middle until we leave the outline, then draw a hair past it
      const cx = kind === 'fore' ? 120 : 110, cy = rootY;
      let r = 20;
      while (r < 260 && probe.isPointInPath(outline, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8)) r += 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8;
      if (x < 40) continue;
      const len = 5 + rand() * 6;
      g.beginPath(); g.moveTo(x - Math.cos(a) * 3, y - Math.sin(a) * 3); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.8); g.stroke();
    }
    g.restore();
    // The wing: pale gold, lighter toward the edge
    g.save();
    g.clip(outline);
    const grad = g.createRadialGradient(0, rootY, 10, 0, rootY, 250);
    grad.addColorStop(0, C.furDark);
    grad.addColorStop(0.18, C.wing);
    grad.addColorStop(0.85, C.wingEdge);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // Veins fanning from the root
    g.strokeStyle = C.vein;
    g.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + (i / 8) * 1.8;
      g.beginPath();
      g.moveTo(8, rootY);
      g.quadraticCurveTo(90, rootY + Math.sin(a) * 30, 8 + Math.cos(a) * 260, rootY + Math.sin(a) * 180);
      g.stroke();
    }
    // A wavy band across the middle, and a fainter one near the edge
    for (const [dist, width, alpha] of [[kind === 'fore' ? 120 : 95, 7, 0.75], [kind === 'fore' ? 190 : 150, 3, 0.45]]) {
      g.strokeStyle = C.band;
      g.globalAlpha = alpha;
      g.lineWidth = width;
      g.beginPath();
      for (let k = 0; k <= 30; k++) {
        const a = -1.3 + (k / 30) * 2.6;
        const r = dist + Math.sin(k * 1.9) * 6;
        const x = 8 + Math.cos(a) * r, y = rootY + Math.sin(a) * r * 0.75;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    // Eyespot: a small dark crescent on the forewing; a violet eye on the hindwing
    if (kind === 'fore') {
      g.fillStyle = 'rgba(110,74,40,0.8)';
      g.beginPath(); g.ellipse(150, 60, 10, 14, 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.wing;
      g.beginPath(); g.ellipse(154, 57, 7, 11, 0.4, 0, Math.PI * 2); g.fill();
      // Tip dusting
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(140,100,50,0.35)'; g.fillRect(tip[0] - 30 + rand() * 40, tip[1] - 10 + rand() * 40, 2, 2); }
    } else {
      for (const [r, col] of [[27, C.spot], [21, '#d9a6ef'], [14, '#3a2046'], [5, '#fff4ff']]) {
        g.fillStyle = col;
        g.beginPath(); g.ellipse(118 - (r === 5 ? 5 : 0), 104 - (r === 5 ? 5 : 0), r, r * 0.9, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // Scale dust
    for (let i = 0; i < 220; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,250,230,0.35)' : 'rgba(150,110,60,0.18)'; g.fillRect(rand() * W, rand() * H, 1.5, 1.5); }
    g.restore();
    // A dark painted edge in place of the ink outline
    g.strokeStyle = '#4a3420';
    g.lineWidth = 3;
    g.stroke(outline);
  });
}

// A feathered antenna, drawn flat: a shaft with barbs slanting up both sides, shortening toward the tip.
function antennaTexture() {
  return canvasTexture(64, 128, (g, W, H) => {
    g.strokeStyle = '#6e5430';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(32, H); g.lineTo(32, 4); g.stroke();
    g.lineWidth = 1.6;
    for (let y = H - 8; y > 8; y -= 4) {
      const len = 26 * Math.sin(((H - y) / H) * Math.PI * 0.95) + 3;
      g.strokeStyle = y % 8 ? '#c9a866' : '#e9d19a';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(32, y); g.lineTo(32 + s * len, y - len * 0.55); g.stroke(); }
    }
  });
}

// A flat wing as a grid in the x-z plane (span along x, leading edge toward +z), so it can flex every frame.
function wingGeometry(span, chord, side) {
  const sx = 8, sz = 4;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= sz; j++)
    for (let i = 0; i <= sx; i++) {
      const u = i / sx, v = j / sz;
      pos.push(side * u * span, 0, (v - 0.5) * chord);
      uv.push(u, v);
    }
  for (let j = 0; j < sz; j++)
    for (let i = 0; i < sx; i++) {
      const a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData = { sx, sz, span, chord, side };
  return g;
}

// Bend a wing: the tips trail the stroke (flex), the trailing edge twists (twist).
function flexWing(geo, flex, twist) {
  const { sx, sz, span, chord, side } = geo.userData;
  const pos = geo.attributes.position;
  for (let j = 0; j <= sz; j++)
    for (let i = 0; i <= sx; i++) {
      const u = i / sx, v = j / sz;
      const y = (flex * u * u + twist * (0.5 - v) * u) * span;
      pos.setXYZ(j * (sx + 1) + i, side * u * span * (1 - Math.abs(flex) * 0.1 * u), y, (v - 0.5) * chord);
    }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function createLampMoth({ hollowed = false } = {}) {
  const root = new THREE.Group();
  root.name = 'lamp-moth';
  const H = new Hollow({ scale: 12 });
  const fx = fxGroup(root, 'lamp-moth');
  const sp = space(root);
  const fur = furTexture(), bands = bandTexture();
  const furMat = H.toonMap(fur, { rim: 1.2 });

  const fly = joint(root, [0, 0.95, 0], 'fly');
  const body = joint(fly, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- body
  part(body, sphere(0.075, 14, 10), furMat, { scale: [1, 0.95, 1.15] });
  // A shaggy cream ruff round the neck, hem toward the back
  const ruff = joint(body, [0, 0.01, 0.05]);
  ruff.rotation.x = Math.PI / 2 + 0.2;
  part(ruff, skirt({ top: 0.045, bottom: 0.1, height: 0.08, flare: 0.6, points: 14, zig: 0.018, rows: 2, ragged: 0.02 }), H.toon(C.furLight, { side: THREE.DoubleSide }), { pos: [0, 0.01, 0] });
  // Head, with big dark eyes and a fluffy brow
  const head = joint(body, [0, 0.015, 0.085], 'head');
  part(head, sphere(0.052, 12, 9), furMat, { scale: [1.05, 1, 0.9] });
  part(head, sphere(0.034, 8, 6), H.toon(C.furLight), { pos: [0, 0.03, 0.025], scale: [1.5, 0.7, 1] });
  const eyeMat = H.toon(C.eye, { rim: 2 });
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = part(head, sphere(0.03, 12, 9), eyeMat, { pos: [side * 0.036, 0, 0.026] });
    const shine = part(e, sphere(0.008, 6, 4), H.basic('#ffffff'), { pos: [-0.006, 0.012, 0.024], ink: false });
    const shine2 = part(e, sphere(0.004, 5, 4), H.basic('#e6d4ff'), { pos: [0.01, -0.008, 0.026], ink: false });
    eyes.push({ e, shine, shine2 });
  }
  // A little fuzzy muzzle
  part(head, sphere(0.022, 8, 6), H.toon(C.furLight), { pos: [0, -0.024, 0.036], scale: [1.2, 0.8, 0.8] });
  // Feathered antennae on springs
  const antTex = antennaTexture();
  const antMat = H.toonMap(antTex, { side: THREE.DoubleSide, alphaTest: 0.5, rim: 0.5 });
  const antennae = [];
  for (const side of [-1, 1]) {
    const j = joint(head, [side * 0.02, 0.045, 0.02]);
    j.rotation.set(0.3, 0, -side * 0.5);
    part(j, taperedTube([[0, 0, 0], [0, 0.03, 0.005], [0, 0.07, 0]], 0.005, 0.003, 6, 4), H.toon('#6e5430'), { ink: false });
    const fea = joint(j, [0, 0.015, 0]);
    for (const r of [0, Math.PI / 2]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.13), antMat);
      m.position.y = 0.065;
      m.rotation.y = r;
      fea.add(m);
    }
    antennae.push({ j, side, s: new Spring(45, 5), sx: new Spring(45, 5) });
  }

  // Abdomen: four furry banded segments, each on a lagging spring
  const bandMat = H.toonMap(bands, { rim: 1.2 });
  const abd = [];
  let prev = joint(body, [0, -0.01, -0.06], 'abdomen');
  for (const [i, r] of [0.058, 0.052, 0.042, 0.03].entries()) {
    const seg = joint(prev, [0, 0, i ? -0.052 : 0]);
    part(seg, sphere(r, 12, 8), bandMat, { pos: [0, 0, -0.03], scale: [1, 0.95, 1.25] });
    abd.push({ seg, s: new Spring(60, 7) });
    prev = seg;
  }
  // A cream tuft on the tail
  part(prev, taperedTube([[0, 0, -0.06], [0, 0.005, -0.085], [0, 0.02, -0.1]], 0.02, 0.004, 5, 6), H.toon(C.furLight), { ink: false });

  // Legs: six, jointed, furry at the top; the front pair holds the flame
  const legMat = H.toon('#7a6038');
  const legs = [];
  for (const [i, z] of [0.035, 0, -0.035].entries())
    for (const side of [-1, 1]) {
      const hip = joint(body, [side * 0.035, -0.055, z]);
      const front = i === 0;
      const pts = front
        ? [[0, 0, 0], [side * 0.03, -0.045, 0.035], [side * 0.02, -0.095, 0.03], [side * 0.01, -0.12, 0.02]]
        : [[0, 0, 0], [side * 0.03, -0.025, -0.01], [side * 0.035, -0.035, -0.05 - i * 0.02], [side * 0.02, -0.03, -0.08 - i * 0.02]];
      part(hip, taperedTube(pts, 0.009, 0.004, 8, 5), legMat, { ink: front });
      legs.push({ hip, side, i, phase: Math.random() * 6 });
    }

  // ---------------------------------------------------------------- wings
  const foreTex = wingTexture('fore'), hindTex = wingTexture('hind');
  const wingOpts = { side: THREE.DoubleSide, alphaTest: 0.5, rim: 0.6, emissive: new THREE.Color('#6a4c18'), emissiveIntensity: 0.45 };
  const foreMat = H.toonMap(foreTex, wingOpts), hindMat = H.toonMap(hindTex, wingOpts);
  const wings = [];
  for (const side of [-1, 1]) {
    for (const [kind, span, chord, pos, sweep] of [['fore', 0.4, 0.22, [0.04, 0.025, 0.025], -0.12], ['hind', 0.3, 0.22, [0.035, 0.005, -0.04], 0.55]]) {
      const pivot = joint(body, [side * pos[0], pos[1], pos[2]]);
      pivot.rotation.set(kind === 'fore' ? 0.35 : 0.2, side * sweep, 0);
      const geo = wingGeometry(span, chord, side);
      const mesh = new THREE.Mesh(geo, kind === 'fore' ? foreMat : hindMat);
      // Shift so the texture's root (left middle) sits on the pivot
      mesh.position.z = kind === 'fore' ? 0.0055 : -0.041;
      pivot.add(mesh);
      wings.push({ pivot, geo, side, kind, flex: new Spring(90, 9) });
    }
  }

  // ---------------------------------------------------------------- the borrowed flame
  // One of Wickhollow's violet flames (the witch's own art/fx/witchfire.webp frames), held under it
  const hang = joint(body, [0, -0.17, 0.03], 'flame');
  const fireTex = new THREE.TextureLoader().load(fxArt.witchfire);
  fireTex.colorSpace = THREE.SRGBColorSpace;
  fireTex.repeat.set(1 / 8, 1);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, depthWrite: false, transparent: true }));
  const FW = 0.085;
  flame.scale.set(FW, FW * (341 / 128), 1);
  flame.center.set(0.5, 0.2);
  const flameGlow = glowSprite('#c77dff', 0.42, 0.6);
  flameGlow.position.y = 0.03;
  const flameHolder = new THREE.Group();
  flameHolder.add(flame, flameGlow);
  hang.add(flameHolder);
  const fireLight = new THREE.PointLight('#c77dff', 0.3, 2.2, 2);
  fireLight.position.set(0, -0.1, 0.18);
  flameHolder.add(fireLight);

  const shadow = blobShadow(0.2, 0.22);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- effects
  const dust = new Motes(fx, { count: 36, map: texture('sparkle') });
  const puffs = new Motes(fx, { count: 8, map: texture('puff'), blending: THREE.AdditiveBlending });
  const trail = new Trail('#ffd98a', 0.25);
  fx.add(trail.mesh);
  const dressing = hollowDressing({ root, fx, sp, radius: 0.35, body: () => [(Math.random() - 0.5) * 0.3, 0.9 + Math.random() * 0.1, (Math.random() - 0.5) * 0.2] });

  const act = new Actions({
    attack: [1.2, 0.45], // Batter: it batters at your face the way a moth batters at a lamp
    cast: [1.2, 0.5], // Dust in the Eyes: a clap of the wings and a burst of glittering dust
    circle: [1.8, 0.8], // Circle the Light: round and round its flame, faster and faster (Hasted)
    hurt: [0.55, 0.2],
    ko: [3.4, 0.2], // drops the flame, which floats home; it flutters down to rest
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { batter: 'attack', dust: 'cast', 'dust-in-the-eyes': 'cast', 'circle-the-light': 'circle' });

  let t = Math.random() * 10, phase = 0, glide = 0, nextGlide = 3 + Math.random() * 3, blink = 0;
  let dropped = null; // the flame on its way home { t, from }
  let frame = 0;
  const S = { pitch: new Spring(18, 5), roll: new Spring(18, 5), swingX: new Spring(22, 2.2), swingZ: new Spring(22, 2.2) };
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), last = new THREE.Vector3();
  if (hollowed) H.set(true, { instant: true });

  const dropFlame = () => {
    // Out of its legs and into the world: it falls a little, then floats up and away home
    const at = sp.of(flameHolder, new THREE.Vector3());
    fx.add(flameHolder);
    flameHolder.position.copy(at);
    flameHolder.scale.setScalar(sp.scale);
    dropped = { t: 0, from: at.clone(), home: sp.dir(-0.6, 2.6, -1.4) };
  };
  const takeFlame = () => {
    hang.add(flameHolder);
    flameHolder.position.set(0, 0, 0);
    flameHolder.scale.setScalar(1);
    flameHolder.visible = true;
    dropped = null;
  };

  const api = {
    root, fx, name: 'Lamp-Moth', height: 1.2, radius: 0.3, center: 0.95,
    moves: ['attack', 'cast', 'circle', 'hurt', 'ko', 'hollowed', 'moonlit'],
    intents: { batter: 'attack', dust: 'cast', circle: 'circle' },
    get busy() { return act.busy; },
    get hollowed() { return H.on; },
    setHollowed(on, opts) { H.set(on, opts); },
    play(name, onHit, opts) {
      if (name === 'hollowed') H.set(true);
      if (name === 'moonlit') H.set(false);
      const a = act.play(name, onHit, opts);
      if (a && a.name !== 'ko' && dropped) takeFlame();
    },
    update(dt) {
      t += dt;
      fx.userData.adopt();
      const hs = H.update(dt);
      dressing.update(dt, hs);

      // ---- graceful flight: slow beats, now and then a glide on raised wings, a lazy figure-eight
      let freq = 3.1, amp = 1, x = Math.sin(t * 0.45) * 0.12, y = 0.95 + Math.sin(t * 0.9) * 0.05, z = Math.sin(t * 0.6) * 0.06;
      let roll = 0, pitch = 0.08, yaw = Math.cos(t * 0.45) * 0.25, ground = 0;
      if (!act.busy && !act.beaten && (nextGlide -= dt) < 0) { glide = 0.9; nextGlide = 3.5 + Math.random() * 4; }
      let gliding = 0;
      if (glide > 0) { glide -= dt; gliding = bell(1 - glide / 0.9); }
      let restWings = 0; // 1: spread flat and resting on the ground
      let flashK = 0;
      const a = act.step(dt);
      if (a) {
        const k = a.k;
        switch (a.name) {
          case 'attack': {
            // Flutter in, three quick batters at the face, flutter back
            const out = hold(k, 0, 0.22, 0.78, 1);
            z += out * (a.opts.reach ?? 0.8);
            y += out * 0.08;
            let bat = 0;
            for (const at of [0.3, 0.45, 0.6]) bat = Math.max(bat, hold(k, at - 0.06, at, at + 0.01, at + 0.08));
            z += bat * 0.14;
            pitch -= bat * 0.5;
            freq = 3.1 + out * 4;
            amp = 1 + out * 0.2;
            if (a.hit && !a.burst) {
              a.burst = true;
              for (let i = 0; i < 8; i++) dust.emit({ pos: sp.at(x, y, z + 0.12, v), vel: sp.dir((Math.random() - 0.5) * 0.6, (Math.random() - 0.3) * 0.5, 0.2), life: 0.6, size: 0.05 * sp.scale, color: '#ffe7a8', drag: 2, gravity: 0.3, spin: 3 });
            }
            break;
          }
          case 'cast': {
            // Rise, wings high, then a hard clap forward: a spray of glittering dust
            const up = hold(k, 0, 0.35, 0.6, 1);
            y += up * 0.12;
            const raise = hold(k, 0.1, 0.4, 0.42, 0.5);
            const clap = hold(k, 0.42, 0.5, 0.6, 0.8);
            amp = 1 - raise;
            freq = k < 0.4 ? 2 : 3.1;
            pitch += -raise * 0.3 + clap * 0.45;
            a.wingOverride = raise * 1.25 - clap * 0.8;
            if (k > 0.45 && k < 0.62) {
              for (let i = 0; i < 3; i++) {
                const spread = 0.6;
                dust.emit({ pos: sp.at(x + (Math.random() - 0.5) * 0.3, y, z + 0.1, v), vel: sp.dir((Math.random() - 0.5) * spread, (Math.random() - 0.4) * spread, 1.1 + Math.random() * 0.6), life: 0.8 + Math.random() * 0.4, size: (0.04 + Math.random() * 0.05) * sp.scale, color: Math.random() < 0.7 ? '#ffe7a8' : '#ffffff', drag: 1.4, gravity: 0.4, spin: 4 });
              }
              if (Math.random() < dt * 20) puffs.emit({ pos: sp.at(x, y, z + 0.2, v), vel: sp.dir((Math.random() - 0.5) * 0.3, 0, 0.9), life: 0.9, size: 0.2 * sp.scale, grow: 2.5, color: '#8a7440', opacity: 0.5, drag: 1.5 });
            }
            break;
          }
          case 'circle': {
            // Round and round the light, banking, faster and faster; a golden streak behind
            const on = hold(k, 0, 0.12, 0.85, 1);
            const ang = Math.pow(k, 1.6) * Math.PI * 2 * 2.5;
            const r = 0.4 * on;
            x += Math.sin(ang) * r;
            z += (Math.cos(ang) - 1) * r * 0.8;
            y += Math.sin(ang * 2) * 0.04 * on;
            yaw = ang * on + yaw * (1 - on) + Math.PI / 2 * on;
            roll = -0.7 * on;
            freq = 3.1 + k * 5 * on;
            trail.on = on > 0.3;
            break;
          }
          case 'hurt': {
            const b = bell(k);
            z -= b * 0.3;
            y += b * 0.06;
            roll = Math.sin(k * Math.PI * 2) * 0.9 * b;
            pitch -= b * 0.5;
            amp = 1 + b * 0.4;
            flashK = b * (1 - k);
            for (const e of eyes) e.e.scale.set(1, 1 - b * 0.6, 1);
            break;
          }
          case 'ko': {
            // Let go of the flame; flutter down in a slow spiral; settle, wings spread flat, resting
            if (k > 0.08 && !dropped && flameHolder.parent === hang) dropFlame();
            const down = ss(k, 0.15, 0.85);
            const spiral = (1 - down) * 0.2;
            x += Math.sin(k * 14) * spiral;
            z += Math.cos(k * 14) * spiral * 0.5;
            y = y * (1 - down) + 0.11 * down;
            yaw = yaw * (1 - down) + Math.sin(k * 14) * 0.5 * (1 - down);
            freq = 3.1 - down * 2.4;
            restWings = ss(k, 0.8, 0.95);
            ground = down;
            break;
          }
          case 'hollowed': y -= bell(k) * 0.06; break;
          case 'moonlit': y += bell(k) * 0.08; flashK = hold(k, 0.15, 0.25, 0.3, 0.6) * 0.4; break;
        }
        if (a.name !== 'circle') trail.on = false;
        if (a.name !== 'hurt') for (const e of eyes) e.e.scale.set(1, 1, 1);
        act.done();
      } else trail.on = false;
      if (act.beaten) {
        // Resting on the ground, wings flat, breathing slowly; now and then a slow open-and-close
        y = 0.11;
        x = z = 0;
        yaw = 0;
        pitch = 0.05;
        restWings = 1;
        ground = 1;
        freq = 0.4;
      }

      // Flap: a quick downstroke, slower upstroke; the hindwings follow a beat behind
      phase += dt * freq * Math.PI * 2;
      const s = Math.sin(phase);
      const stroke = s > 0 ? s : s * 0.75;
      const glideAngle = 0.75 + Math.sin(t * 9) * 0.04;
      let foreAngle = (0.5 + 0.7 * stroke * amp) * (1 - gliding) + glideAngle * gliding;
      let hindAngle = (0.42 + 0.6 * Math.sin(phase - 0.5) * amp) * (1 - gliding) + (glideAngle - 0.1) * gliding;
      if (a?.wingOverride !== undefined) { foreAngle += a.wingOverride; hindAngle += a.wingOverride * 0.8; }
      if (restWings) {
        const breathe = act.beaten ? Math.max(0, Math.sin(t * 0.8)) * 0.35 : 0;
        foreAngle = foreAngle * (1 - restWings) + (0.05 + breathe) * restWings;
        hindAngle = hindAngle * (1 - restWings) + (0.02 + breathe * 0.8) * restWings;
      }
      y += (-Math.cos(phase) * 0.018 * amp) * (1 - gliding) * (1 - ground) - gliding * 0.03;

      fly.position.set(x, y, z);
      fly.rotation.set(0, yaw, 0);
      // Pitch and bank from how it moves
      const vy = (y - last.y) / Math.max(dt, 1e-3), vx = (x - last.x) / Math.max(dt, 1e-3);
      last.set(x, y, z);
      body.rotation.x = S.pitch.update(pitch - THREE.MathUtils.clamp(vy, -2, 2) * 0.12 * (1 - ground), dt);
      body.rotation.z = S.roll.update(roll - THREE.MathUtils.clamp(vx, -2, 2) * 0.25 * (1 - ground), dt);
      for (const w of wings) {
        const ang = w.kind === 'fore' ? foreAngle : hindAngle;
        w.pivot.rotation.z = w.side * ang;
        // The tips trail the stroke, the trailing edge twists
        const vel = Math.cos(phase - (w.kind === 'fore' ? 0 : 0.5)) * freq * 0.03 * (1 - gliding) * amp;
        flexWing(w.geo, w.flex.update(-vel * 1.2 * (1 - restWings), dt), vel * 0.8 * (1 - restWings));
      }
      // The abdomen swings behind, the antennae bob
      for (const [i, seg] of abd.entries()) seg.seg.rotation.x = seg.s.update(-0.12 - Math.cos(phase) * 0.05 * (1 - ground) - (i === 0 ? THREE.MathUtils.clamp(vy, -1, 1) * 0.15 : 0) + ground * 0.12, dt);
      for (const an of antennae) {
        an.j.rotation.x = 0.3 + an.s.update(Math.sin(phase) * 0.12 * (1 - ground) + Math.sin(t * 1.3 + an.side) * 0.08 - (act.beaten ? 0.35 : 0), dt);
        an.j.rotation.z = -an.side * 0.5 + an.sx.update(Math.sin(t * 1.7 + an.side * 2) * 0.1, dt);
      }
      for (const L of legs) L.hip.rotation.x = Math.sin(t * 2 + L.phase) * 0.12 + (L.i ? 0.3 : 0) - ground * 0.3;
      head.rotation.y = Math.sin(t * 0.7) * 0.2 * (1 - ground);
      head.rotation.x = Math.sin(t * 1.1) * 0.08;
      // Blinks: the eyes can't close, so they glint off and on
      if ((blink -= dt) < 0) blink = 2 + Math.random() * 3;
      for (const e of eyes) e.shine.visible = blink > 0.1 && hs.k < 0.5;
      eyeMat.color.set(C.eye).lerp(MILK, hs.k * 0.7);

      // The flame swings under it like a lantern, lagging the flight
      if (!dropped) {
        hang.rotation.x = S.swingX.update(-THREE.MathUtils.clamp((z - last.z) * 30 + vy * 0.1, -1, 1) * 0.3 - body.rotation.x, dt);
        hang.rotation.z = S.swingZ.update(-body.rotation.z + THREE.MathUtils.clamp(vx, -2, 2) * 0.2, dt);
      }
      frame += dt * 12;
      fireTex.offset.x = (Math.floor(frame) % 8) / 8;
      const flick = 0.85 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29) * 0.07;
      fireLight.intensity = 0.3 * flick * (1 - hs.k * 0.5);
      flameGlow.material.opacity = 0.6 * flick;
      if (dropped) {
        // Down a little, a moment's pause, then up and away home
        dropped.t += dt;
        const d = dropped.t;
        const fall = ss(d, 0, 0.35) * 0.18 * sp.scale;
        const rise = ss(d, 0.6, 3.2);
        v.copy(dropped.from).addScaledVector(dropped.home, rise);
        v.y -= fall * (1 - rise);
        v.x += Math.sin(d * 3) * 0.08 * rise * sp.scale;
        flameHolder.position.copy(v);
        const fade = 1 - ss(d, 2.4, 3.2);
        flame.material.opacity = fade;
        flameGlow.material.opacity *= fade;
        fireLight.intensity *= fade;
        if (d > 3.2) flameHolder.visible = false;
      } else flame.material.opacity = 1;

      shadow.position.set(x, 0.004, z);
      shadow.material.opacity = 0.22 + ground * 0.3 - (y - 0.07) * 0.1;
      shadow.scale.setScalar(1 - (y - 0.07) * 0.3);
      foreMat.emissiveIntensity = hindMat.emissiveIntensity = 0.45 + flashK * 2;

      // A little golden dust drifts off the wings as it flies
      if (!act.beaten && Math.random() < dt * 3) {
        const w = wings[Math.floor(Math.random() * 4)];
        dust.emit({ pos: sp.of(w.pivot, v).add(sp.dir(w.side * 0.15, 0, 0, v2)), vel: sp.dir(0, -0.1, 0), life: 1.6, size: 0.03 * sp.scale, color: hs.k > 0.5 ? '#9c98a4' : '#ffe7a8', opacity: 0.8, wobble: 0.02 * sp.scale, spin: 2 });
      }
      dust.update(dt);
      puffs.update(dt);
      sp.of(body, v);
      trail.update(dt, v, v2.copy(v).add(sp.dir(0, 0.05, 0, v3)));
    },
  };
  return api;
}
const MILK = new THREE.Color('#9d98a8');
