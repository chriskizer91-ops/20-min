import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toonMap, glowTexture } from './kit.js';
import { LAYER_ACTORS } from '../layers.js';

// Shared pieces for the witch's companions (Inkblot and Nettie), on top of kit.js: feather and leaf blades,
// a beak, faces painted on a canvas, textures painted in code, and a small particle pool for spell effects.

export const ss = THREE.MathUtils.smoothstep;
export const lerp = THREE.MathUtils.lerp;
export const clamp = THREE.MathUtils.clamp;
// 0 -> 1 -> 0: rises over [a, a + soft], falls over [b - soft, b].
export const win = (k, a, b, soft = 0.08) => ss(k, a, a + soft) * (1 - ss(k, b - soft, b));
// 0 -> 1 -> 0 as a sine arch over [a, b].
export const arch = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));

export function mixColor(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

// A texture painted on a canvas.
export function canvasTexture(w, h, draw, { repeat, wrap = true, flipY = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = flipY;
  tex.anisotropy = 4;
  if (wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(...repeat);
  return tex;
}

// Merge several geometries into one (so a tuft of feathers or a fringe of tassels costs one mesh and one outline).
export function merge(geos) {
  const g = mergeGeometries(geos.map((x) => (x.index ? x : mergeVertices(x))), false);
  for (const x of geos) x.dispose();
  return g;
}

// Blade outlines: half-width (as a fraction of the width) along the length, from base to tip.
export const PROFILE = {
  feather: [[0, 0.1], [0.06, 0.32], [0.25, 0.47], [0.55, 0.5], [0.8, 0.42], [0.94, 0.24], [1, 0.02]],
  primary: [[0, 0.12], [0.08, 0.36], [0.3, 0.5], [0.62, 0.42], [0.86, 0.26], [1, 0.03]],
  tail: [[0, 0.12], [0.05, 0.36], [0.2, 0.5], [0.84, 0.5], [0.95, 0.34], [1, 0.04]],
  covert: [[0, 0.2], [0.12, 0.44], [0.45, 0.5], [0.8, 0.4], [1, 0.03]],
  leaf: [[0, 0.12], [0.12, 0.42], [0.4, 0.5], [0.78, 0.3], [1, 0.01]],
  tassel: [[0, 0.3], [0.2, 0.5], [0.6, 0.42], [1, 0.08]],
};

// A flattened spindle along -z from the origin, thin in y: a feather, a leaf or a reed blade. `bend` curls the
// tip up (+y), `droop` sideways (+x). UV: u runs around (0 = the top face's midline), v from base to tip.
export function bladeGeometry(length, width, { thick = 0.14, profile = PROFILE.feather, bend = 0, droop = 0, radial = 8 } = {}) {
  const pts = profile.map(([t, hw]) => new THREE.Vector2(Math.max(0.0004, hw * width), t * length));
  const geo = new THREE.LatheGeometry(pts, radial);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = y / length;
    // lathe: x = r sin(phi), z = r cos(phi); flatten z, then bend the tip toward +z (becomes +y below)
    pos.setZ(i, pos.getZ(i) * thick + bend * t * t);
    pos.setX(i, pos.getX(i) + droop * t * t);
  }
  geo.rotateX(-Math.PI / 2); // +y (length) -> -z, z (thin) -> +y
  geo.computeVertexNormals();
  return geo;
}

// A beak: a cone along +z with a flat gape. `part` is 'upper' (rounded ridge on top) or 'lower'.
export function beakGeometry(len, width, height, droop, part = 'upper') {
  const geo = new THREE.ConeGeometry(1, 1, 12, 6, false);
  geo.translate(0, 0.5, 0);
  geo.rotateX(Math.PI / 2); // tip toward +z; the circle in x/y
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), t = pos.getZ(i);
    const yy = part === 'upper' ? Math.max(y, -0.08) * height : Math.min(y, 0.08) * height;
    pos.setXYZ(i, x * width * 0.5, yy - droop * t * t + (part === 'upper' ? 0.0 : 0), t * len);
  }
  geo.computeVertexNormals();
  return geo;
}

// A face painted on a canvas for a sphere head. The canvas (size x size) covers the front half of the sphere:
// its centre is the middle of the face, its left and right edges the sides of the head (90 degrees round),
// its top the crown and its bottom the chin. Moods are painted once each and swapped (for blinks).
export function paintedFace(skull, moods, draw, { size = 512, rim = 0.35 } = {}) {
  const textures = {};
  for (const m of moods) {
    const tex = canvasTexture(size, size, (g) => draw(g, m, size), { wrap: false });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1); // u 0-0.5 (the front) is the canvas; the back half clamps to its edge (plain skin)
    textures[m] = tex;
  }
  const mat = toonMap(textures[moods[0]], { rim });
  skull.material = mat;
  let current = moods[0];
  return {
    show(name) {
      if (name === current || !textures[name]) return;
      current = name;
      mat.map = textures[name];
    },
    get mood() { return current; },
  };
}

// Canvas helpers for painted faces: (u, v) are the face's own coordinates in the canvas, 0-1.
export function ellipse(g, x, y, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- particles
// A pool of sprites or small meshes that drift, spin, grow and fade: sparkles, drops, feathers, motes.
export class Particles {
  constructor(parent, count, make) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const o = make(i);
      o.visible = false;
      o.layers.set(LAYER_ACTORS);
      o.traverse?.((c) => c.layers.set(LAYER_ACTORS));
      parent.add(o);
      this.items.push({ o, life: 0, age: 0, v: new THREE.Vector3(), spin: new THREE.Vector3(), size: 1, grow: 0, gravity: 0, drag: 0, fade: 1 });
    }
    this.next = 0;
  }
  spawn(pos, { vel = [0, 0, 0], life = 0.8, size = 0.1, grow = 0, gravity = 0, drag = 0, spin = [0, 0, 0], color, opacity = 1, rot } = {}) {
    const p = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    p.o.visible = true;
    p.o.position.copy(pos);
    p.v.set(...vel);
    p.spin.set(...spin);
    if (rot) p.o.rotation.set(...rot);
    p.life = life;
    p.age = 0;
    p.size = size;
    p.grow = grow;
    p.gravity = gravity;
    p.drag = drag;
    p.opacity = opacity;
    const mat = p.o.material;
    if (mat && color) mat.color.set(color);
    this.apply(p, 0);
    return p;
  }
  apply(p, k) {
    const s = p.size * (1 + p.grow * k);
    p.o.scale.set(s, s, s);
    const mat = p.o.material;
    if (mat) mat.opacity = p.opacity * (k < 0.15 ? k / 0.15 : 1 - ss(k, 0.55, 1));
  }
  update(dt) {
    for (const p of this.items) {
      if (!p.o.visible) continue;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) { p.o.visible = false; continue; }
      p.v.y -= p.gravity * dt;
      p.v.multiplyScalar(Math.exp(-p.drag * dt));
      p.o.position.addScaledVector(p.v, dt);
      p.o.rotation.x += p.spin.x * dt;
      p.o.rotation.y += p.spin.y * dt;
      p.o.rotation.z += p.spin.z * dt;
      this.apply(p, k);
    }
  }
}

// A glow sprite made for a particle pool (its own material, so each can fade on its own).
export function sparkSprite(color = '#ffffff', tex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex ?? sharedGlow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  return s;
}
let glowTex = null;
function sharedGlow() { return (glowTex ??= glowTexture()); }

// A four-pointed twinkle, for sparkles that should read as "shiny" rather than as a soft glow.
let twinkleTex = null;
export function twinkleTexture() {
  return (twinkleTex ??= canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = i % 2 ? 4 : 31;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.fill();
  }, { wrap: false }));
}

// Where a point of a model is in the world right now.
const tmp = new THREE.Vector3();
export function worldPos(obj, out = tmp.clone()) {
  obj.updateWorldMatrix(true, false);
  return obj.getWorldPosition(out);
}

// Hold an object at a fixed orientation in `frame`'s space (e.g. a staff kept upright, or a lantern hanging
// straight down), whatever its parent is doing. `q` is the wanted orientation relative to `frame`.
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
export function holdOrientation(obj, frame, q) {
  obj.parent.updateWorldMatrix(true, false);
  obj.parent.getWorldQuaternion(qa).invert();
  frame.getWorldQuaternion(qb);
  obj.quaternion.copy(qa.multiply(qb).multiply(q));
}
