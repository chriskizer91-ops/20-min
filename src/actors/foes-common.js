import * as THREE from 'three';
import { RIM, glowTexture } from './kit.js';

// Shared pieces for the rabble (foes-*.js), on top of kit.js:
//   Hollow    per-model materials that can turn Hollowed (grey, cracked, hollow-eyed, trailing rot), and the
//             moonlight that breaks it (the cracks flare silver and close)
//   Actions   a move player: durations, the moment a move lands, aliases for intent names, the beaten pose
//   Motes     pooled sprites in world space for spores, dust, sparks, smoke, bubbles
//   Tube      a tube whose spine is moved every frame (a wisp's curl, a leech, a mud arm)
//   Face      a painted face on a patch of sphere, with moods to swap between
// Everything is drawn in code; nothing here loads a file.

// The same three-step ramp kit.js uses, so foes shade like the witch.
const gradient = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

// ---------------------------------------------------------------- Hollowed: grey, cracks, and the silver that heals them
export const HOLLOW_HEAD = /* glsl */ `
uniform float hollow; uniform float hollowHeal; uniform float crackScale;
varying vec3 vHollowPos;
vec3 hollowHash(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}
float hollowNoise(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = hollowHash(p).x, b = hollowHash(p + vec3(1, 0, 0)).x, c = hollowHash(p + vec3(0, 1, 0)).x, d = hollowHash(p + vec3(1, 1, 0)).x;
  float e = hollowHash(p + vec3(0, 0, 1)).x, g = hollowHash(p + vec3(1, 0, 1)).x, h = hollowHash(p + vec3(0, 1, 1)).x, i = hollowHash(p + vec3(1, 1, 1)).x;
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, i, f.x), f.y), f.z);
}
// Cell edges of a 3D Voronoi pattern read as cracks; a smooth noise lets them run out and leaves patches whole.
float hollowCracks(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 b = vec3(float(i), float(j), float(k));
    vec3 r = b - f + hollowHash(p + b);
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float keep = smoothstep(0.45, 0.7, hollowNoise(x * 0.55 + 3.1));
  float width = 0.02 + 0.05 * keep;
  return (1.0 - smoothstep(width * 0.5, width, edge)) * keep;
}`;

const RIM_HEAD = 'uniform vec3 rimColor; uniform float rimStrength; uniform float rimScale;';
const RIM_BODY = `
  float rimAmount = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
  outgoingLight += rimColor * smoothstep(0.62, 0.8, rimAmount) * rimStrength * rimScale;`;

function patch(material, U, { rim = 0, crack = 1 } = {}) {
  const lit = material.isMeshToonMaterial;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.hollow = U.hollow;
    shader.uniforms.hollowHeal = U.heal;
    shader.uniforms.crackScale = { value: U.scale * crack };
    if (lit) {
      shader.uniforms.rimColor = { value: RIM.color };
      shader.uniforms.rimStrength = RIM.strength;
      shader.uniforms.rimScale = { value: rim };
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHollowPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHollowPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HOLLOW_HEAD}\n${lit ? RIM_HEAD : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hCrack = 0.0;
        if (hollow > 0.001) {
          hCrack = hollowCracks(vHollowPos * crackScale) * smoothstep(0.0, 0.5, hollow);
          float g = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 ash = vec3(g * 0.8 + 0.07) * vec3(0.92, 0.9, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, ash, hollow);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.04, 0.07), hCrack * (1.0 - hollowHeal));
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(dot(totalEmissiveRadiance, vec3(0.299, 0.587, 0.114))) * 0.4, hollow);`)
      .replace('#include <opaque_fragment>', `${lit ? RIM_BODY : ''}
        outgoingLight += vec3(0.8, 0.86, 1.0) * hCrack * hollowHeal * 1.6;
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => (lit ? 'foe-toon' : 'foe-basic');
  return material;
}

// One per model: every material it makes shares the model's hollow amount (so two wisps can differ).
export class Hollow {
  constructor({ scale = 8 } = {}) {
    this.u = { hollow: { value: 0 }, heal: { value: 0 }, scale };
    this.cache = new Map();
    this.target = 0;
    this.k = 0;
    this.breakT = -1; // counts up while moonlight breaks the omen
  }
  toon(color, opts = {}) {
    const key = 't' + color + JSON.stringify(opts);
    if (!this.cache.has(key)) {
      const { rim = 1, crack = 1, ...rest } = opts;
      this.cache.set(key, patch(new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...rest }), this.u, { rim, crack }));
    }
    return this.cache.get(key);
  }
  toonMap(map, opts = {}) {
    const { rim = 1, crack = 1, ...rest } = opts;
    return patch(new THREE.MeshToonMaterial({ map, gradientMap: gradient, ...rest }), this.u, { rim, crack });
  }
  basic(color, opts = {}) {
    const { crack = 1, ...rest } = opts;
    return patch(new THREE.MeshBasicMaterial({ color, ...rest }), this.u, { crack });
  }
  get on() { return this.target > 0; }
  // on: greys and cracks it. off, after being on: the moonlight breaks it (cracks flare silver, then close).
  set(on, { instant = false } = {}) {
    const was = this.target;
    this.target = on ? 1 : 0;
    if (instant) { this.k = this.target; this.breakT = -1; }
    else if (!on && was) this.breakT = 0;
    if (on) this.breakT = -1;
  }
  update(dt) {
    let heal = 0;
    if (this.breakT >= 0) {
      // 0-0.35 s the cracks light up; 0.35-1.4 s the grey drains away; the glow lingers a little after.
      this.breakT += dt;
      const t = this.breakT;
      heal = THREE.MathUtils.smoothstep(t, 0, 0.3) * (1 - THREE.MathUtils.smoothstep(t, 1.1, 1.7));
      this.k = 1 - THREE.MathUtils.smoothstep(t, 0.35, 1.4);
      if (t > 1.7) { this.breakT = -1; this.k = 0; }
    } else {
      this.k += (this.target - this.k) * (1 - Math.exp(-dt * 3));
      if (Math.abs(this.k - this.target) < 0.002) this.k = this.target;
    }
    this.u.hollow.value = this.k;
    this.u.heal.value = heal;
    return { k: this.k, heal, breaking: this.breakT >= 0 };
  }
}

// The rot a Hollowed foe leaves on the ground: grey-violet runners and a smear trailing behind it.
let rotTex = null;
export function rotDecal(radius = 0.5, trail = 1.6) {
  if (!rotTex) {
    rotTex = canvasTexture(256, 256, (g, W, H) => {
      let seed = 11;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const blot = (x, y, r, a, col) => { g.fillStyle = col.replace('A', a); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
      // Runners wandering out from the middle, thinning as they go
      for (let n = 0; n < 11; n++) {
        let x = W / 2, y = H / 2, a = (n / 11) * Math.PI * 2 + rand() * 0.4;
        const len = 30 + rand() * 60;
        for (let i = 0; i < len; i++) {
          a += (rand() - 0.5) * 0.6;
          x += Math.cos(a) * 1.8;
          y += Math.sin(a) * 1.8;
          const r = 5 * (1 - i / len) + 1;
          blot(x, y, r + 1.5, 0.55, 'rgba(30,24,40,A)');
          blot(x, y, r * 0.5, 0.8, 'rgba(96,90,110,A)');
          if (rand() < 0.04) blot(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 2 + rand() * 3, 0.6, 'rgba(120,114,130,A)');
        }
      }
      // A blotchy pool in the middle
      for (let i = 0; i < 40; i++) blot(W / 2 + (rand() - 0.5) * 60, H / 2 + (rand() - 0.5) * 60, 6 + rand() * 12, 0.35, 'rgba(34,28,44,A)');
      for (let i = 0; i < 30; i++) blot(W / 2 + (rand() - 0.5) * 70, H / 2 + (rand() - 0.5) * 70, 1.5 + rand() * 3, 0.7, 'rgba(130,124,142,A)');
    });
  }
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: rotTex, transparent: true, depthWrite: false, opacity: 0, color: '#ffffff' });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.4, radius * 2.4), mat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.006;
  pool.renderOrder = -1;
  // The smear behind: the same runners, stretched out along -z
  const smear = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.3, radius * trail), mat);
  smear.rotation.x = -Math.PI / 2;
  smear.position.set(0, 0.005, -radius * (0.5 + trail * 0.45));
  smear.renderOrder = -1;
  group.add(pool, smear);
  group.visible = false;
  return {
    group,
    set(k) { group.visible = k > 0.01; mat.opacity = k * 0.85; },
  };
}

// Everything around a Hollowed foe besides its materials: rot on the ground, dark flakes lifting off it, and
// when moonlight breaks the omen, a silver ring at its feet and a burst of glints. body() gives a local point
// on the foe to emit from.
export function hollowDressing({ root, fx, sp, radius, body }) {
  const rot = rotDecal(radius);
  root.add(rot.group);
  const flakes = new Motes(fx, { count: 10, map: texture('flake'), blending: THREE.NormalBlending });
  const glints = new Motes(fx, { count: 18, map: texture('sparkle') });
  const ringMat = new THREE.MeshBasicMaterial({ map: texture('ring'), color: '#dfe6ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.visible = false;
  root.add(ring);
  let flakeT = 0, wasBreaking = false, breakT = 0;
  const v = new THREE.Vector3();
  return {
    update(dt, st) {
      rot.set(st.k);
      if (st.k > 0.4 && !st.breaking && (flakeT -= dt) < 0) {
        flakeT = 0.22 + Math.random() * 0.25;
        const s = sp.scale;
        flakes.emit({ pos: sp.at(...body(), v), vel: sp.dir((Math.random() - 0.5) * 0.1, 0.18 + Math.random() * 0.1, (Math.random() - 0.5) * 0.1), life: 1.6, size: 0.05 * s, grow: 0.6, color: Math.random() < 0.5 ? '#2e2838' : '#57505f', opacity: 0.85, wobble: 0.02 * s, spin: 1.5 });
      }
      if (st.breaking && !wasBreaking) {
        breakT = 0;
        const s = sp.scale;
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          glints.emit({ pos: sp.at(...body(), v), vel: sp.dir(Math.cos(a) * 0.5, 0.4 + Math.random() * 0.9, Math.sin(a) * 0.5), life: 0.8 + Math.random() * 0.5, size: (0.08 + Math.random() * 0.08) * s, grow: 0.3, color: i % 3 ? '#e6ecff' : '#b9a6ff', gravity: 0.6 * s, drag: 1.5, spin: 3 });
        }
      }
      wasBreaking = st.breaking;
      if (st.breaking || breakT < 1.2) {
        breakT += dt;
        const k = Math.min(1, breakT / 1.2);
        ring.visible = k < 1 && st.breaking;
        ring.scale.setScalar(radius * (0.5 + ss(k, 0, 0.7) * 1.4));
        ringMat.opacity = Math.sin(k * Math.PI) * 0.9;
      } else ring.visible = false;
      flakes.update(dt);
      glints.update(dt);
    },
  };
}

// ---------------------------------------------------------------- Actions
// defs: { name: [seconds, landsAt 0-1] }. aliases: { 'intent-id': 'move' }.
export class Actions {
  constructor(defs, aliases = {}) {
    this.defs = defs;
    this.aliases = aliases;
    this.current = null;
    this.beaten = false;
  }
  get names() { return Object.keys(this.defs); }
  get busy() { return !!this.current; }
  play(name, onHit, opts = {}) {
    name = this.aliases[name] ?? name;
    const d = this.defs[name];
    if (!d) return null;
    // A move cut short still lands, so nothing waiting on it hangs.
    if (this.current && !this.current.hit) this.current.onHit?.();
    this.beaten = false;
    this.current = { name, t: 0, k: 0, dur: d[0] * (opts.slow ?? 1), at: d[1], onHit, hit: false, opts, fresh: true };
    return this.current;
  }
  // Advance; returns the move in progress (name, k 0-1, t seconds, fresh on its first frame) or null.
  step(dt) {
    const a = this.current;
    if (!a) return null;
    if (a.fresh) a.fresh = a.t === 0;
    a.t += dt;
    a.k = Math.min(1, a.t / a.dur);
    if (!a.hit && a.k >= a.at) { a.hit = true; a.onHit?.(); }
    return a;
  }
  // Call once the pose for a finished move is applied.
  done() {
    const a = this.current;
    if (!a || a.k < 1) return false;
    if (a.name === 'ko') this.beaten = true;
    this.current = null;
    return true;
  }
}

// ---------------------------------------------------------------- where things are in the world
export function space(root) {
  const q = new THREE.Quaternion(), s = new THREE.Vector3();
  return {
    at(x, y, z, out = new THREE.Vector3()) { root.updateWorldMatrix(true, false); return root.localToWorld(out.set(x, y, z)); },
    dir(x, y, z, out = new THREE.Vector3()) { root.getWorldQuaternion(q); root.getWorldScale(s); return out.set(x, y, z).applyQuaternion(q).multiplyScalar(s.x); },
    of(obj, out = new THREE.Vector3()) { obj.updateWorldMatrix(true, false); return obj.getWorldPosition(out); },
    get scale() { root.getWorldScale(s); return s.x; },
  };
}

// The world-space effects group. The bestiary adds it to the scene; if nobody does, it follows the model
// into whatever the model is added to, and is tagged so the battle's cleanup removes it with the actors.
export function fxGroup(root, name) {
  const fx = new THREE.Group();
  fx.name = name + '-fx';
  fx.userData.actor = true;
  fx.userData.adopt = () => { if (!fx.parent && root.parent) root.parent.add(fx); };
  return fx;
}

// ---------------------------------------------------------------- Motes: pooled sprites in world space
export class Motes {
  constructor(parent, { count = 24, map = texture('dot'), blending = THREE.AdditiveBlending, order = 0 } = {}) {
    this.items = [];
    this.next = 0;
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending, opacity: 0 }));
      s.visible = false;
      s.renderOrder = order;
      parent.add(s);
      this.items.push({ s, pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, life: 0, alive: false });
    }
  }
  // o: pos, vel, life, size, grow (x size at end), color, opacity, gravity, drag, spin, wobble, fade (0-1 of life spent fading in)
  emit(o) {
    const it = this.items[this.next++ % this.items.length];
    it.alive = true;
    it.age = 0;
    it.life = o.life ?? 1;
    it.pos.copy(o.pos);
    it.vel.copy(o.vel ?? ZERO);
    it.size = o.size ?? 0.1;
    it.grow = o.grow ?? 1;
    it.opacity = o.opacity ?? 1;
    it.gravity = o.gravity ?? 0;
    it.drag = o.drag ?? 0;
    it.spin = o.spin ?? 0;
    it.wobble = o.wobble ?? 0;
    it.fade = o.fade ?? 0.15;
    it.phase = Math.random() * 6;
    it.s.material.color.set(o.color ?? '#ffffff');
    it.s.material.rotation = o.rot ?? Math.random() * Math.PI * 2;
    it.s.visible = true;
    return it;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const k = it.age / it.life;
      if (k >= 1) { it.alive = false; it.s.visible = false; continue; }
      it.vel.y -= it.gravity * dt;
      it.vel.multiplyScalar(Math.max(0, 1 - it.drag * dt));
      it.pos.addScaledVector(it.vel, dt);
      it.s.position.copy(it.pos);
      if (it.wobble) it.s.position.x += Math.sin(it.age * 5 + it.phase) * it.wobble;
      const size = it.size * (1 + (it.grow - 1) * k);
      it.s.scale.set(size, size, 1);
      const fadeIn = it.fade > 0 ? Math.min(1, k / it.fade) : 1;
      it.s.material.opacity = it.opacity * fadeIn * (1 - k * k);
      it.s.material.rotation += it.spin * dt;
    }
  }
}
const ZERO = new THREE.Vector3();

// ---------------------------------------------------------------- small textures, drawn once
export function canvasTexture(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  tex.anisotropy = 4;
  return tex;
}

const textures = {};
export function texture(name) {
  if (textures[name]) return textures[name];
  let tex;
  if (name === 'dot') tex = glowTexture();
  if (name === 'sparkle') {
    // A four-pointed glint, like the ones around Witch Way's wisps
    tex = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(32, 2); g.quadraticCurveTo(35, 29, 62, 32); g.quadraticCurveTo(35, 35, 32, 62);
      g.quadraticCurveTo(29, 35, 2, 32); g.quadraticCurveTo(29, 29, 32, 2);
      g.fill();
    });
  }
  if (name === 'puff') {
    // A soft lumpy cloud (spores, dust, smoke); tinted by the sprite
    tex = canvasTexture(64, 64, (g) => {
      for (const [x, y, r, a] of [[32, 34, 22, 0.5], [22, 30, 14, 0.45], [42, 28, 15, 0.45], [30, 22, 13, 0.4], [38, 40, 14, 0.4]]) {
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
      }
    });
  }
  if (name === 'heart') {
    tex = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(32, 50);
      g.bezierCurveTo(8, 34, 14, 12, 32, 24);
      g.bezierCurveTo(50, 12, 56, 34, 32, 50);
      g.fill();
    });
  }
  if (name === 'flake') {
    // A dark flake of rot, for Hollowed foes (drawn with normal blending)
    tex = canvasTexture(32, 32, (g) => {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.moveTo(16, 3); g.lineTo(27, 12); g.lineTo(22, 28); g.lineTo(8, 25); g.lineTo(5, 11);
      g.fill();
    });
  }
  if (name === 'ring') {
    tex = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 20, 32, 32, 31);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
  }
  textures[name] = tex;
  return tex;
}

// ---------------------------------------------------------------- a tube that bends every frame
// n spine points, `radial` sides. update(points, radius(t)) moves the vertices; normals are worked out from
// the spine (no seam), so a leech or a curl of flame can writhe cheaply. The ends close when radius reaches 0.
export class Tube {
  constructor(n = 12, radial = 8) {
    this.n = n;
    this.radial = radial;
    const count = n * (radial + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    const uv = [];
    for (let i = 0; i < n; i++) for (let j = 0; j <= radial; j++) uv.push(j / radial, i / (n - 1));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const idx = [];
    for (let i = 0; i < n - 1; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    g.setIndex(idx);
    this.geometry = g;
    this.T = Array.from({ length: n }, () => new THREE.Vector3());
    this.N = Array.from({ length: n }, () => new THREE.Vector3());
    this.B = Array.from({ length: n }, () => new THREE.Vector3());
    this.r = new Float32Array(n);
  }
  // points: n Vector3s. radius: (t, i) => r. up: which way the texture's middle column faces at the start.
  // flat: (t) => how much to squash the cross-section top-to-bottom (1 round, 0.7 a slug's flattened body).
  update(points, radius, up = UP, flat) {
    const { n, radial, T, N, B, r } = this;
    for (let i = 0; i < n; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
      T[i].subVectors(b, a).normalize();
      r[i] = radius(i / (n - 1), i);
    }
    // Parallel transport, so the tube doesn't twist
    N[0].copy(up).addScaledVector(T[0], -up.dot(T[0]));
    if (N[0].lengthSq() < 1e-6) N[0].set(1, 0, 0).addScaledVector(T[0], -T[0].x);
    N[0].normalize();
    for (let i = 1; i < n; i++) {
      N[i].copy(N[i - 1]).addScaledVector(T[i], -N[i - 1].dot(T[i])).normalize();
    }
    for (let i = 0; i < n; i++) B[i].crossVectors(T[i], N[i]);
    const pos = this.geometry.attributes.position, nor = this.geometry.attributes.normal;
    const d = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const seg = points[Math.min(n - 1, i + 1)].distanceTo(points[Math.max(0, i - 1)]) || 1e-4;
      const slope = (r[Math.min(n - 1, i + 1)] - r[Math.max(0, i - 1)]) / seg;
      const aN = flat ? flat(i / (n - 1)) : 1, aB = 1 / Math.sqrt(aN);
      for (let j = 0; j <= radial; j++) {
        const ang = (j / radial) * Math.PI * 2 - Math.PI;
        const c = Math.cos(ang), sn = Math.sin(ang);
        d.copy(N[i]).multiplyScalar(c * aN).addScaledVector(B[i], sn * aB);
        const k = i * (radial + 1) + j;
        pos.setXYZ(k, points[i].x + d.x * r[i], points[i].y + d.y * r[i], points[i].z + d.z * r[i]);
        nn.copy(N[i]).multiplyScalar(c / aN).addScaledVector(B[i], sn / aB).normalize().addScaledVector(T[i], -slope).normalize();
        nor.setXYZ(k, nn.x, nn.y, nn.z);
      }
    }
    pos.needsUpdate = nor.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- painted faces
// A patch of sphere in front of a head, painted on a canvas per mood. draw(g, w, h, mood) paints one mood on a
// transparent canvas. The patch spans `width` x `height` radians of a sphere of `radius`, centred on +z.
// Or, with cone: { top, bottom, height } (radii and metres), on a patch of a cone, for faces on stems and roots.
export function paintedFace(H, { radius, width = 1.4, height = 1.1, cone, size = [256, 192], moods, draw, rim = 0.3, lit = true }) {
  const geo = cone
    ? new THREE.CylinderGeometry(cone.top, cone.bottom, cone.height, 16, 4, true, -width / 2, width)
    : new THREE.SphereGeometry(radius, 20, 14, Math.PI / 2 - width / 2, width, Math.PI / 2 - height / 2, height);
  const tex = {};
  for (const m of moods) tex[m] = canvasTexture(size[0], size[1], (g, w, h) => draw(g, w, h, m));
  const opts = { transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false };
  const mat = lit ? H.toonMap(tex[moods[0]], { ...opts, rim }) : H.basic('#ffffff', { ...opts, map: tex[moods[0]] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  let current = moods[0];
  return {
    mesh,
    get mood() { return current; },
    show(m) { if (m === current || !tex[m]) return; current = m; mat.map = tex[m]; },
  };
}

// A few painting helpers for the faces.
export const paint = {
  ellipse(g, x, y, rx, ry, fill, rot = 0) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); },
  line(g, pts, width, color, cap = 'round') {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = cap; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  },
  curve(g, [x0, y0], [cx, cy], [x1, y1], width, color) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  },
  blush(g, x, y, r, color = 'rgba(255,120,140,0.45)') {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  },
};

// Ease helpers
export const ss = THREE.MathUtils.smoothstep;
export const bell = (k) => Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
// 0 -> 1 between a and b, then back to 0 between c and d
export const hold = (k, a, b, c, d) => ss(k, a, b) * (1 - ss(k, c, d));

