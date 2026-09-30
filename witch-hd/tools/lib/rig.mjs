// The skeleton and the skinned-mesh builder. Every bone rests with no rotation (its local frame lines up with
// the model's: +y up, +z forward, +x her left), so a pose is just rotations about world-aligned axes.
import * as THREE from 'three';
import { GL } from './glb.mjs';

export class Skeleton {
  constructor() {
    this.bones = [];
    this.byName = new Map();
  }
  add(name, parent, pos) {
    if (this.byName.has(name)) throw new Error(`bone ${name} twice`);
    const p = parent ? this.get(parent) : null;
    const b = { name, parent: p, index: this.bones.length, rest: new THREE.Vector3(...pos), children: [] };
    b.local = p ? b.rest.clone().sub(p.rest) : b.rest.clone();
    if (p) p.children.push(b);
    this.bones.push(b);
    this.byName.set(name, b);
    return b;
  }
  get(name) {
    const b = this.byName.get(name);
    if (!b) throw new Error(`no bone ${name}`);
    return b;
  }
  has(name) { return this.byName.has(name); }
  // Chain from a bone up to the root
  ancestors(name) {
    const out = [];
    for (let b = this.get(name); b; b = b.parent) out.push(b);
    return out;
  }
}

// Linear sRGB helpers
export const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function hexToLinear(hex) {
  const c = new THREE.Color(hex); // three converts hex from sRGB to linear working space
  return [c.r, c.g, c.b];
}

// A skinned mesh, built up from Geos. Each part is given a material key, skin weights and vertex colors.
// Parts are packed into primitives of fewer than 65536 vertices (so indices fit in 16 bits).
export class MeshBuilder {
  constructor(name, skeleton, { morphs = [] } = {}) {
    this.name = name;
    this.skel = skeleton;
    this.morphs = morphs; // names of morph targets (blend shapes)
    this.prims = []; // { mat, pos, nor, uv, col, jnt, wgt, idx, morph: {name: []} }
    this.tris = 0;
  }

  // geo: a Geo. opts.mat: material key. opts.bone: one bone for all, or opts.weights(p, i, geo) -> [[bone, w], ...]
  // opts.color: [r,g,b] linear multiplier, or fn(p, n, i, geo) -> [r,g,b]. opts.morphs: {name: fn(p, i, geo) -> [dx,dy,dz]}
  add(geo, opts) {
    const n = geo.count;
    if (!n) return;
    if (n > 65535) {
      // Split a big Geo by triangles into pieces
      for (const piece of splitGeo(geo, 60000)) this.add(piece, opts);
      return;
    }
    let prim = this.prims.findLast((p) => p.mat === opts.mat);
    if (!prim || prim.pos.length / 3 + n > 65535) {
      prim = { mat: opts.mat, pos: [], nor: [], uv: [], col: [], jnt: [], wgt: [], idx: [], morph: Object.fromEntries(this.morphs.map((m) => [m, []])) };
      this.prims.push(prim);
    }
    const base = prim.pos.length / 3;
    const p = new THREE.Vector3(), nv = new THREE.Vector3();
    const rigid = typeof opts.bone === 'string' ? this.skel.get(opts.bone).index : -1;
    const constCol = Array.isArray(opts.color) ? opts.color : null;
    for (let i = 0; i < n; i++) {
      p.set(geo.pos[i * 3], geo.pos[i * 3 + 1], geo.pos[i * 3 + 2]);
      nv.set(geo.nor[i * 3], geo.nor[i * 3 + 1], geo.nor[i * 3 + 2]);
      prim.pos.push(p.x, p.y, p.z);
      prim.nor.push(nv.x, nv.y, nv.z);
      prim.uv.push(geo.uv[i * 2] ?? 0, geo.uv[i * 2 + 1] ?? 0);
      const c = constCol ?? (opts.color ? opts.color(p, nv, i, geo) : [1, 1, 1]);
      prim.col.push(c[0], c[1], c[2], c[3] ?? 1);
      if (rigid >= 0) { prim.jnt.push(rigid, 0, 0, 0); prim.wgt.push(255, 0, 0, 0); }
      else {
        const w = opts.weights(p, i, geo);
        const [j4, w4] = packWeights(w.map(([b, x]) => [typeof b === 'string' ? this.skel.get(b).index : b.index ?? b, x]));
        prim.jnt.push(...j4); prim.wgt.push(...w4);
      }
      for (const m of this.morphs) {
        const f = opts.morphs?.[m];
        if (f) { const d = f(p.clone(), i, geo); prim.morph[m].push(d[0], d[1], d[2]); }
        else prim.morph[m].push(0, 0, 0);
      }
    }
    for (const k of geo.idx) prim.idx.push(k + base);
    this.tris += geo.idx.length / 3;
  }

  // Write into a GLB. materials: {key: materialIndex}; textured: keys of materials that use a texture (only
  // those get uvs). Returns the glTF mesh index.
  emit(glb, materials, textured = new Set()) {
    const primitives = [];
    for (const pr of this.prims) {
      const count = pr.pos.length / 3;
      const nor = new Float32Array(pr.nor);
      for (let i = 0; i < nor.length; i += 3) {
        const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]);
        if (l > 1e-8) { nor[i] /= l; nor[i + 1] /= l; nor[i + 2] /= l; } else { nor[i] = 0; nor[i + 1] = 1; nor[i + 2] = 0; }
      }
      const attributes = {
        POSITION: glb.accessor(new Float32Array(pr.pos), 'VEC3', { minmax: true, target: 34962 }),
        NORMAL: glb.accessor(nor, 'VEC3', { target: 34962 }),
      };
      if (textured.has(pr.mat)) {
        const inUnit = pr.uv.every((x) => x >= 0 && x <= 1);
        attributes.TEXCOORD_0 = inUnit
          ? glb.accessor(Uint16Array.from(pr.uv, (x) => Math.round(x * 65535)), 'VEC2', { normalized: true, target: 34962 })
          : glb.accessor(new Float32Array(pr.uv), 'VEC2', { target: 34962 });
      }
      const hasColor = pr.col.some((x) => x < 0.999);
      if (hasColor) attributes.COLOR_0 = glb.accessor(Uint8Array.from(pr.col, (x) => Math.round(Math.max(0, Math.min(1, x)) * 255)), 'VEC4', { normalized: true, target: 34962 });
      attributes.JOINTS_0 = glb.accessor(Uint8Array.from(pr.jnt), 'VEC4', { target: 34962 });
      attributes.WEIGHTS_0 = glb.accessor(Uint8Array.from(pr.wgt), 'VEC4', { normalized: true, target: 34962 });
      const prim = {
        attributes,
        indices: glb.accessor(count < 65536 ? Uint16Array.from(pr.idx) : Uint32Array.from(pr.idx), 'SCALAR', { target: 34963 }),
        material: materials[pr.mat],
      };
      if (materials[pr.mat] == null) throw new Error(`no material ${pr.mat}`);
      if (this.morphs.length) {
        prim.targets = this.morphs.map((m) => {
          const d = pr.morph[m];
          return { POSITION: d.some((x) => x !== 0) ? glb.accessor(new Float32Array(d), 'VEC3', { minmax: true, target: 34962 }) : glb.zeros(count) };
        });
      }
      primitives.push(prim);
    }
    const def = { name: this.name, primitives };
    if (this.morphs.length) {
      def.weights = this.morphs.map(() => 0);
      def.extras = { targetNames: this.morphs };
    }
    return glb.mesh(def);
  }
}

// Keep the four biggest weights and round them to bytes that add up to exactly 255.
export function packWeights(list) {
  const merged = new Map();
  for (const [j, w] of list) if (w > 0) merged.set(j, (merged.get(j) ?? 0) + w);
  let top = [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((s, [, w]) => s + w, 0) || 1;
  top = top.map(([j, w]) => [j, (w / sum) * 255]);
  const bytes = top.map(([, w]) => Math.floor(w));
  let rest = 255 - bytes.reduce((a, b) => a + b, 0);
  const order = top.map(([, w], i) => [w - Math.floor(w), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) bytes[order[k][1]]++;
  const j4 = [0, 0, 0, 0], w4 = [0, 0, 0, 0];
  top.forEach(([j], i) => { if (bytes[i] > 0) { j4[i] = j; w4[i] = bytes[i]; } });
  if (!top.length) w4[0] = 255;
  return [j4, w4];
}

function splitGeo(geo, maxVerts) {
  const out = [];
  let cur = null, map = null;
  const extraKeys = geo.extra ? Object.keys(geo.extra) : [];
  for (let t = 0; t < geo.idx.length; t += 3) {
    if (!cur || cur.pos.length / 3 > maxVerts - 3) {
      cur = { pos: [], nor: [], uv: [], idx: [], extra: Object.fromEntries(extraKeys.map((k) => [k, []])) };
      map = new Map();
      out.push(cur);
    }
    for (let k = 0; k < 3; k++) {
      const v = geo.idx[t + k];
      let m = map.get(v);
      if (m == null) {
        m = cur.pos.length / 3;
        map.set(v, m);
        cur.pos.push(geo.pos[v * 3], geo.pos[v * 3 + 1], geo.pos[v * 3 + 2]);
        cur.nor.push(geo.nor[v * 3], geo.nor[v * 3 + 1], geo.nor[v * 3 + 2]);
        cur.uv.push(geo.uv[v * 2], geo.uv[v * 2 + 1]);
        for (const key of extraKeys) cur.extra[key].push(geo.extra[key][v]);
      }
      cur.idx.push(m);
    }
  }
  return out.map((c) => Object.assign(Object.create(Object.getPrototypeOf(geo)), { pos: c.pos, nor: c.nor, uv: c.uv, idx: c.idx, extra: extraKeys.length ? c.extra : null }));
}

// ---------------------------------------------------------------- weight helpers

// Distance from p to segment ab
export function segDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / (abx * abx + aby * aby + abz * abz || 1)));
  return { d: Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y, a.z + abz * t - p.z), t };
}

// Weights along a chain of bones by where p projects onto it, blending across each joint over `blend` meters.
// chain: array of bone objects (with .rest) in order; the last one's segment runs to `end` (a Vector3).
export function chainWeights(skel, names, end, p, blend = 0.03) {
  const bones = names.map((n) => skel.get(n));
  const pts = bones.map((b) => b.rest).concat([end]);
  // Position along the chain (in meters), from the closest segment
  let best = { d: Infinity, s: 0 };
  let acc = 0;
  for (let i = 0; i < bones.length; i++) {
    const len = pts[i].distanceTo(pts[i + 1]);
    const r = segDist(p, pts[i], pts[i + 1]);
    if (r.d < best.d - 1e-9) best = { d: r.d, s: acc + r.t * len };
    acc += len;
  }
  // Boundaries between bones in chain distance
  const out = [];
  let start = 0;
  const bounds = [];
  for (let i = 0; i < bones.length; i++) { bounds.push(start); start += pts[i].distanceTo(pts[i + 1]); }
  for (let i = 0; i < bones.length; i++) {
    const a = bounds[i], b = i + 1 < bones.length ? bounds[i + 1] : Infinity;
    // weight = ramp up across a, ramp down across b
    const up = i === 0 ? 1 : smoothRamp(best.s, a - blend, a + blend);
    const down = b === Infinity ? 1 : 1 - smoothRamp(best.s, b - blend, b + blend);
    const w = Math.min(up, down);
    if (w > 1e-4) out.push([names[i], w]);
  }
  return out;
}

export function smoothRamp(x, a, b) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
