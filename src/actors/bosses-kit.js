import * as THREE from 'three';
import { INK, RIM, taperedTube } from './kit.js';
import { LAYER_ACTORS } from '../layers.js';

// Helpers for the veterans and bosses (the Willow-Wight, the Drowned Chorister, the Gloamwing and the Lantern
// Mother), on top of kit.js: the same three-step toon shading and moonlit rim, plus what these four need that the
// witch doesn't: materials each model owns (so one can flash when hurt without flashing its twin), a ghost shader
// that glows at the edges and thins in the middle, outlines in any colour, leafy strands and wet hair that sway on
// springs (one mesh for many), long cloth that ripples and pools on the ground, particles, and a move player.

export const ss = THREE.MathUtils.smoothstep;
export const lerp = THREE.MathUtils.lerp;
export const clamp = THREE.MathUtils.clamp;
export const TAU = Math.PI * 2;

// A seeded random, so every model is the same each time it's built.
export function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------------------------------------------------------------- materials

const GRADIENT = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

// A toon material this model owns (not shared through kit's cache), with the same moonlit rim as toon().
// ghost: { glow, core, strength } makes it a ghost: see-through in the middle (core opacity), solid and glowing
// at the edges, the way Witch Way draws its ghosts.
export function mat(color, opts = {}) {
  const { rim = 1, ghost = null, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...rest });
  if (ghost) {
    m.transparent = true;
    m.userData.ghost = {
      glow: { value: new THREE.Color(ghost.glow ?? '#9ff0ff') },
      core: { value: ghost.core ?? 0.55 },
      strength: { value: ghost.strength ?? 0.7 },
    };
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: RIM.color };
    shader.uniforms.rimStrength = RIM.strength;
    shader.uniforms.rimScale = { value: rim };
    let head = 'uniform vec3 rimColor; uniform float rimStrength; uniform float rimScale;';
    let body = `
        float rimAmount = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
        outgoingLight += rimColor * smoothstep(0.62, 0.8, rimAmount) * rimStrength * rimScale;`;
    if (m.userData.ghost) {
      const g = m.userData.ghost;
      shader.uniforms.ghostGlow = g.glow;
      shader.uniforms.ghostCore = g.core;
      shader.uniforms.ghostStrength = g.strength;
      head += ' uniform vec3 ghostGlow; uniform float ghostCore; uniform float ghostStrength;';
      body += `
        float fres = pow(rimAmount, 1.6);
        outgoingLight += ghostGlow * fres * ghostStrength;
        diffuseColor.a *= mix(ghostCore, 1.0, fres);`;
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${head}`)
      .replace('#include <opaque_fragment>', `${body}\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => (m.userData.ghost ? 'rim-ghost' : 'rim');
  return m;
}

// Plain glowing stuff (flames, eyes, bell-light): no shading.
export const glowMat = (color, opacity = 1, extra = {}) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, ...extra });

// An ink outline in any colour, as thick as kit's INK (it shares its thickness, which each page sets) times `scale`.
const inks = new Map();
export function inkMat(color = '#12091a', { opacity = 1, scale = 1 } = {}) {
  const key = `${color}|${opacity}|${scale}`;
  if (!inks.has(key)) {
    inks.set(key, new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, thickness: INK.uniforms.thickness, scale: { value: scale }, opacity: { value: opacity } },
      vertexShader: /* glsl */ `
        uniform float thickness; uniform float scale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          mv.xyz += normalize(normalMatrix * normal) * thickness * scale;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `uniform vec3 color; uniform float opacity; void main() { gl_FragColor = vec4(color, opacity); }`,
      side: THREE.BackSide,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
    }));
  }
  return inks.get(key);
}

// Like kit's part(), but the outline can be any ink (opts.ink: false, true, or an inkMat()). For see-through
// ghosts pass { order: 1, inkOrder: 2 }: the body draws first and writes depth, so its outline only shows round
// the edge instead of darkening the middle.
export function makePart(defaultInk, defaults = {}) {
  return function piece(parent, geometry, material, opts = {}) {
    opts = { ...defaults, ...opts };
    const mesh = new THREE.Mesh(geometry, material);
    if (opts.pos) mesh.position.set(...opts.pos);
    if (opts.rot) mesh.rotation.set(...opts.rot);
    if (opts.scale) mesh.scale.set(...(Array.isArray(opts.scale) ? opts.scale : [opts.scale, opts.scale, opts.scale]));
    if (opts.name) mesh.name = opts.name;
    if (opts.order !== undefined) mesh.renderOrder = opts.order;
    const ink = opts.ink === undefined ? defaultInk : opts.ink === true ? defaultInk : opts.ink;
    if (ink) {
      const outline = new THREE.Mesh(geometry, ink);
      outline.name = 'ink';
      outline.renderOrder = opts.inkOrder ?? (opts.order !== undefined ? opts.order - 1 : 0);
      mesh.add(outline);
    }
    parent.add(mesh);
    return mesh;
  };
}

// ---------------------------------------------------------------- textures painted in code

// flipY false maps the canvas top to v = 0 (the top row of a skirt() or drape()).
export function paint(w, h, draw, { repeat, wrap = true, srgb = true, flipY = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(...repeat);
  tex.flipY = flipY;
  tex.anisotropy = 4;
  return tex;
}

let dot = null;
// A soft round dot, shared by every sprite and particle here.
export function dotTexture() {
  if (!dot) {
    dot = paint(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.22, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.22)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }, { wrap: false });
  }
  return dot;
}

export function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.set(size, size, 1);
  s.layers.set(LAYER_ACTORS);
  return s;
}

// ---------------------------------------------------------------- strands: fronds, wet hair, tendrils

// A tube along a curve that thins from r0 to r1, with optional leafy bumps along it.
function strandGeometry(points, r0, r1, { segments = 12, radial = 5, bumps = 0, bumpAmp = 0, flat = 1 } = {}) {
  const geo = taperedTube(points, 1, 1, segments, radial);
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const c = new THREE.Vector3(), n = new THREE.Vector3(), v = new THREE.Vector3();
  const t = new Float32Array(pos.count);
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    curve.getPointAt(s, c);
    let r = r0 + (r1 - r0) * s;
    if (bumps) r *= 1 + bumpAmp * Math.pow(Math.abs(Math.sin(s * bumps * Math.PI)), 0.7) * Math.min(1, s * 4);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      n.fromBufferAttribute(nor, k);
      v.copy(n).multiplyScalar(r);
      v.x *= flat;
      pos.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z);
      t[k] = s;
    }
  }
  geo.computeVertexNormals();
  geo.setAttribute('along', new THREE.BufferAttribute(t, 1));
  return geo;
}

// Many swaying strands in one mesh (one draw, one outline). Each strand bends from its root on its own spring,
// pushed by wind, by a wave that runs down it, and by the mesh moving (they trail behind when it swings).
export class Strands {
  constructor() {
    this.items = [];
  }

  // points: from root to tip, in the mesh's space. o: segments, radial, bumps, bumpAmp, color, tip (colour at
  // the tip), stiff, damp, sway (how far wind moves it), wave (serpentine ripple), lag (how much it trails).
  add(points, r0, r1, o = {}) {
    const geo = strandGeometry(points, r0, r1, o);
    const len = points.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1], p[2] - points[i - 1][2]) : 0), 0);
    this.items.push({
      geo, len, o,
      sx: 0, vx: 0, sz: 0, vz: 0,
      k: o.stiff ?? 14, d: o.damp ?? 2.6,
      phase: o.phase ?? this.items.length * 1.37,
      sway: o.sway ?? 1, wave: o.wave ?? 0, lag: o.lag ?? 1,
    });
    return this;
  }

  // Merge into one geometry and make the mesh (with an outline if `ink` is given).
  build(material, ink = null, piece = null, parent = null) {
    const n = this.items.reduce((s, it) => s + it.geo.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const along = new Float32Array(n), owner = new Uint16Array(n);
    const idx = [];
    let base = 0;
    const cA = new THREE.Color(), cB = new THREE.Color(), cc = new THREE.Color();
    this.items.forEach((it, s) => {
      const g = it.geo;
      const p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv, a = g.attributes.along;
      cA.set(it.o.color ?? '#ffffff');
      cB.set(it.o.tip ?? it.o.color ?? '#ffffff');
      for (let i = 0; i < p.count; i++) {
        const k = base + i;
        pos.set([p.getX(i), p.getY(i), p.getZ(i)], k * 3);
        nor.set([nn.getX(i), nn.getY(i), nn.getZ(i)], k * 3);
        uv.set([u.getX(i), u.getY(i)], k * 2);
        cc.copy(cA).lerp(cB, a.getX(i));
        col.set([cc.r, cc.g, cc.b], k * 3);
        along[k] = a.getX(i);
        owner[k] = s;
      }
      const index = g.index.array;
      for (let i = 0; i < index.length; i++) idx.push(index[i] + base);
      it.start = base;
      it.count = p.count;
      base += p.count;
      g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    this.rest = Float32Array.from(pos);
    this.along = along;
    this.owner = owner;
    this.geometry = geo;
    if (piece && parent) this.mesh = piece(parent, geo, material, { ink: ink ?? false });
    else {
      this.mesh = new THREE.Mesh(geo, material);
      if (ink) { const o = new THREE.Mesh(geo, ink); o.name = 'ink'; this.mesh.add(o); }
    }
    this.mesh.frustumCulled = false;
    this.mesh.children.forEach((c) => (c.frustumCulled = false));
    this.prev = null;
    return this.mesh;
  }

  // wind: [x, z] lean in the mesh's space; gust: extra shiver; push: [x, z] a shove (e.g. when hit); flow: speed
  // of the wave running down each strand; still: 0-1 how much the strands settle (asleep).
  update(dt, time, { wind = [0, 0], gust = 0, push = null, flow = 1, still = 0, amp = 1 } = {}) {
    if (!this.mesh) return;
    dt = Math.min(dt, 0.05);
    // How the mesh moved: strands trail the other way.
    const wp = this.mesh.getWorldPosition(_v1);
    let lx = 0, lz = 0;
    if (this.prev && dt > 0) {
      _v2.subVectors(wp, this.prev).divideScalar(dt);
      this.mesh.getWorldQuaternion(_q).invert();
      _v2.applyQuaternion(_q);
      const s = this.mesh.getWorldScale(_v3).x || 1;
      lx = clamp(-_v2.x / s, -6, 6) * 0.09;
      lz = clamp(-_v2.z / s, -6, 6) * 0.09;
    }
    this.prev = (this.prev ?? new THREE.Vector3()).copy(wp);
    const live = 1 - still;
    for (const it of this.items) {
      const sw = it.sway * amp * live;
      const tx = wind[0] * sw + Math.sin(time * 1.1 + it.phase) * 0.05 * sw + Math.sin(time * 3.7 + it.phase * 2.3) * gust * 0.08 + lx * it.lag + (push ? push[0] : 0);
      const tz = wind[1] * sw + Math.cos(time * 0.9 + it.phase * 1.3) * 0.05 * sw + Math.cos(time * 4.1 + it.phase) * gust * 0.08 + lz * it.lag + (push ? push[1] : 0);
      it.vx += ((tx - it.sx) * it.k - it.vx * it.d) * dt;
      it.sx += it.vx * dt;
      it.vz += ((tz - it.sz) * it.k - it.vz * it.d) * dt;
      it.sz += it.vz * dt;
    }
    const pos = this.geometry.attributes.position.array, rest = this.rest, along = this.along;
    for (const it of this.items) {
      const L = it.len, w = it.wave * live;
      for (let i = it.start; i < it.start + it.count; i++) {
        const t = along[i];
        const f = Math.pow(t, 1.5);
        const wave = w ? Math.sin(time * 2.2 * flow - t * 7 + it.phase) * w * t : 0;
        const wave2 = w ? Math.cos(time * 1.7 * flow - t * 5 + it.phase * 1.7) * w * t : 0;
        const dx = (it.sx * f + wave) * L, dz = (it.sz * f + wave2) * L;
        const k = i * 3;
        pos[k] = rest[k] + dx;
        pos[k + 1] = rest[k + 1] + ((dx * dx + dz * dz) / Math.max(0.15, L)) * 0.5 * t;
        pos[k + 2] = rest[k + 2] + dz;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion();

// ---------------------------------------------------------------- long cloth: veils, gowns, robes

// A hanging cloth traced down a profile: [[radius, y], ...] from top to bottom, around `span` radians centred on
// `center` (π/2 is the front, -π/2 the back). drop(a, v) lets some of it hang longer (a train). What reaches the
// ground spreads out along it. The hem can be ragged or scalloped.
export function drape({ profile, cols = 24, rows = 10, span = TAU, center = Math.PI / 2, drop = null, ground = null, ragged = 0, zig = 0, seed = 3, scallop = 0 }) {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const closed = span >= TAU - 1e-3;
  const n = closed ? cols : cols;
  const step = closed ? span / cols : span / (cols - 1);
  const start = center - span / 2;
  const rand = rng(seed);
  const tatter = Array.from({ length: n }, () => rand());
  const positions = [], uvs = [];
  const p = new THREE.Vector2();
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    curve.getPoint(v, p);
    for (let c = 0; c < n; c++) {
      const a = start + c * step;
      let radius = p.x, y = p.y;
      if (drop) y -= drop(a, v);
      if (r === rows) y -= (c % 2 ? zig : -zig * 0.3) + ragged * tatter[c] + (scallop ? Math.abs(Math.sin(c * Math.PI / 2)) * scallop : 0);
      if (ground !== null && y < ground) { radius += (ground - y) * 0.9; y = ground + (c % 3) * 0.002; }
      positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
      uvs.push(closed ? c / n : c / (n - 1), 1 - v);
    }
  }
  const idx = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < (closed ? n : n - 1); c++) {
      const c2 = (c + 1) % n;
      const a = r * n + c, b = r * n + c2, d = (r + 1) * n + c, e = (r + 1) * n + c2;
      idx.push(a, d, b, b, d, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData = { rows, cols: n, rest: Float32Array.from(positions), ground, start, step };
  return g;
}

// Ripple a drape: waves that run down the cloth, wind that lifts it (in its own space), a lag (drag) and a flare.
// Rows near the top barely move; what lies on the ground slides but stays down. `blend` and `target` morph it
// toward another shape (a veil falling to the ground).
export function rippleDrape(geo, { time = 0, ripple = 0.02, wave = 0.02, wind = [0, 0], flare = 0, drag = 0, pin = 1.4, speed = 1, blend = 0, target = null, lift = 0 } = {}) {
  const { rows, cols, rest, ground } = geo.userData;
  const pos = geo.attributes.position;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const f = Math.pow(v, pin);
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, k = i * 3;
      let x = rest[k], y = rest[k + 1], z = rest[k + 2];
      const len = Math.hypot(x, z) || 1;
      const onGround = ground !== null && y <= ground + 0.01;
      const out = (flare + Math.sin(time * 2.3 * speed + c * 0.9 + r * 0.5) * ripple) * f;
      const w = Math.sin(time * 1.6 * speed - v * 6 + c * 0.35) * wave * f;
      x += (x / len) * out + wind[0] * f + w * (-z / len);
      z += (z / len) * out + wind[1] * f - drag * f + w * (x / len);
      if (!onGround) y += (Math.abs(wind[0]) + Math.abs(wind[1])) * f * 0.35 + lift * f + Math.abs(drag) * f * 0.3;
      if (target && blend > 0) {
        x += (target[k] - x) * blend;
        y += (target[k + 1] - y) * blend;
        z += (target[k + 2] - z) * blend;
      }
      pos.setXYZ(i, x, y, z);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------------------------------------------------------------- particles

const colors = new Map();
// Points that are born, drift and fade: drips, dust, bubbles, leaves. They live in `parent`'s space.
export class Particles {
  constructor(count, { color = '#ffffff', size = 0.05, opacity = 1, additive = true, texture = dotTexture() } = {}) {
    this.count = count;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3).fill(0);
    this.col = new Float32Array(count * 4).fill(0);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    this.base = new THREE.Color(color);
    this.material = new THREE.PointsMaterial({
      size, map: texture, vertexColors: true, transparent: true, opacity, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.p = Array.from({ length: count }, () => ({ age: 1, life: 0, vx: 0, vy: 0, vz: 0, c: null, fade: 1 }));
    this.next = 0;
  }
  spawn(x, y, z, vx = 0, vy = 0, vz = 0, life = 1, color = null) {
    const i = this.next;
    this.next = (this.next + 1) % this.count;
    const q = this.p[i];
    q.age = 0; q.life = life; q.vx = vx; q.vy = vy; q.vz = vz;
    q.c = color ? (color.isColor ? color : (colors.get(color) ?? colors.set(color, new THREE.Color(color)).get(color))) : null;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    return q;
  }
  // gravity: m/s² down; drag: 0-1 per second; floor: particles stop there (drips), or null; wobble: sideways drift.
  update(dt, { gravity = 0, drag = 0, floor = null, wobble = 0, time = 0, fadeIn = 0.1 } = {}) {
    const c = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      const q = this.p[i];
      if (q.age >= 1) { this.col[i * 4 + 3] = 0; continue; }
      q.age += dt / q.life;
      q.vy -= gravity * dt;
      const d = Math.max(0, 1 - drag * dt);
      q.vx *= d; q.vy *= d; q.vz *= d;
      const k = i * 3;
      this.pos[k] += (q.vx + (wobble ? Math.sin(time * 3 + i) * wobble : 0)) * dt;
      this.pos[k + 1] += q.vy * dt;
      this.pos[k + 2] += (q.vz + (wobble ? Math.cos(time * 2.6 + i * 1.3) * wobble : 0)) * dt;
      if (floor !== null && this.pos[k + 1] < floor) { this.pos[k + 1] = floor; q.vx = q.vy = q.vz = 0; q.age = Math.max(q.age, 0.85); }
      c.copy(q.c ?? this.base);
      const a = Math.min(1, q.age / fadeIn) * (1 - ss(q.age, 0.6, 1));
      this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b; this.col[i * 4 + 3] = a;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// A ring of light that opens on the ground (or in the air) and fades: tolls, hums, hushes.
export class Pulses {
  constructor(parent, count, color, { inner = 0.9, flat = true, additive = true } = {}) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(inner, 1, 48), new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
      if (flat) m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.frustumCulled = false;
      parent.add(m);
      this.items.push({ m, t: 1, life: 1, from: 0.2, to: 2, peak: 1 });
    }
    this.i = 0;
  }
  fire(pos, { from = 0.2, to = 2, life = 1, peak = 1, color = null } = {}) {
    const it = this.items[this.i];
    this.i = (this.i + 1) % this.items.length;
    it.m.position.copy(pos);
    Object.assign(it, { t: 0, life, from, to, peak });
    if (color) it.m.material.color.set(color);
    it.m.visible = true;
    return it.m;
  }
  update(dt) {
    for (const it of this.items) {
      if (it.t >= 1) { it.m.visible = false; continue; }
      it.t = Math.min(1, it.t + dt / it.life);
      const e = 1 - Math.pow(1 - it.t, 2.2);
      it.m.scale.setScalar(it.from + (it.to - it.from) * e);
      it.m.material.opacity = it.peak * Math.sin(Math.min(1, it.t * 1.4) * Math.PI) * (1 - it.t * 0.5);
    }
  }
}

// ---------------------------------------------------------------- moves

// Plays one move at a time. table: { name: [seconds, hitAt] }. The pose code reads `now` ({ name, k, t, dur }).
// onHit fires once when k passes hitAt. 'ko' leaves the model downed until 'rise'.
export function movePlayer(table, { onStart } = {}) {
  let action = null;
  let downed = false;
  return {
    table,
    get now() { return action; },
    get downed() { return downed; },
    set downed(v) { downed = v; },
    get busy() { return !!action; },
    play(name, onHit, opts = {}) {
      const entry = table[name];
      if (!entry) return false;
      if (downed && name !== 'rise' && name !== 'ko') { onHit?.(); return false; }
      if (name === 'rise' && !downed) { onHit?.(); return false; }
      const [dur, hit = 0.5] = entry;
      action = { name, t: 0, k: 0, dur: dur * (opts.slow ?? 1), hitAt: hit, onHit, hit: false, opts, first: true };
      onStart?.(name, action);
      return true;
    },
    // Advance; returns the move being played (or null). The move ends when k reaches 1.
    step(dt) {
      if (!action) return null;
      action.first = action.t === 0;
      action.t += dt;
      action.k = Math.min(1, action.t / action.dur);
      if (!action.hit && action.k >= action.hitAt) { action.hit = true; action.onHit?.(); }
      return action;
    },
    finish() {
      if (!action) return;
      if (!action.hit) action.onHit?.();
      if (action.name === 'ko') downed = true;
      if (action.name === 'rise') downed = false;
      action = null;
    },
  };
}

// A bell curve that rises over [a, b] and falls over [c, d].
export const window4 = (k, a, b, c, d) => ss(k, a, b) * (1 - ss(k, c, d));

// Merge several geometries (with the same attributes) into one, applying each one's transform first.
export function mergeParts(list) {
  const geos = list.map(({ geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...(Array.isArray(scale) ? scale : [scale, scale, scale])));
    g.applyMatrix4(m);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  const total = geos.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

// Flash a model's own materials (hurt): k 0-1.
export function flash(materials, k, color = '#ffffff') {
  for (const m of materials) {
    if (!m.emissive) continue;
    if (!m.userData.baseEmissive) m.userData.baseEmissive = { c: m.emissive.clone(), i: m.emissiveIntensity };
    const b = m.userData.baseEmissive;
    m.emissive.copy(b.c).lerp(_c.set(color), k);
    m.emissiveIntensity = b.i + (1 - b.i) * k * 0.8;
  }
}
const _c = new THREE.Color();

// Count what a model draws (for keeping it phone-friendly).
export function census(root) {
  let meshes = 0, outlines = 0, sprites = 0, points = 0, lights = 0;
  root.traverse((o) => {
    if (o.isMesh) { meshes++; if (o.name === 'ink') outlines++; }
    else if (o.isSprite) sprites++;
    else if (o.isPoints) points++;
    else if (o.isLight) lights++;
  });
  return { meshes, outlines, sprites, points, lights };
}
