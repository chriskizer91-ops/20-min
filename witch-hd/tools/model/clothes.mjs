// Her black dress: a fitted bodice laced up the front with a lace-trimmed neckline, a skirt that falls in soft
// folds to tattered points with a high slit over her left leg, a lilac lace underskirt, a plum sash with a gold
// buckle, a pouch, and her jewelry (a velvet choker with a crescent, a key pendant, bracelets).
import * as THREE from 'three';
import { Geo, surface, cloth, tube, torus, spline, sphere, smooth, clamp, lerp, rng, noise3, slab } from '../lib/geo.mjs';
import { torsoPoint } from './body.mjs';
import { chain, crescent, placeFacing, beadString } from './jewelry.mjs';
import { ARM_ANGLE } from './skeleton.mjs';

const nz = noise3(17);

// Neckline height around the torso (a = 0 front): a soft V in front, higher at the sides and back
export function necklineY(a) {
  const f = Math.cos(a); // 1 front, -1 back
  const v = Math.max(0, f) ** 3;
  return lerp(0.852, 0.79, v) + (f < 0 ? 0.004 * -f : 0);
}

// ---------------------------------------------------------------- bodice
export function buildBodice() {
  const parts = [];
  const bottom = 0.6;
  const at = (u, v, off) => {
    const a = (u - 0.5) * Math.PI * 2;
    const y = lerp(necklineY(a), bottom, v);
    // Princess seams: soft vertical ridges; a little pull at the waist
    const seam = 0.0012 * Math.cos(a * 4) * smooth(0.6, 0.72, y);
    return torsoPoint(y, a, off + seam);
  };
  const bodice = cloth(160, 44, (u, v) => at(u, v, 0.0055), 0.003, { closeU: true, uv: (u, v) => [u, v * 0.4] });
  parts.push({ geo: bodice, mat: 'dress', what: 'bodice' });

  // Lace frill along the neckline: a ruffled strip standing up and out
  const frill = surface(260, 5, (u, v) => {
    const a = (u - 0.5) * Math.PI * 2;
    const y0 = necklineY(a);
    const ruffle = Math.sin(u * Math.PI * 2 * 44) * 0.0025 * v;
    const p = torsoPoint(y0 - 0.002 + v * 0.011, a, 0.007 + v * 0.004 + ruffle);
    return p;
  }, { closeU: true, uv: (u, v) => [u * 8, v] });
  const frillBack = frill.clone().flip();
  parts.push({ geo: Geo.merge([frill, frillBack]), mat: 'lace', what: 'bodice' });

  // Front lacing: grommets down both sides of a closure, and a lace crossing between them
  const holes = 9;
  const laceL = [], laceR = [];
  const metal = [];
  for (let i = 0; i < holes; i++) {
    const y = lerp(0.775, 0.625, i / (holes - 1));
    for (const s of [1, -1]) {
      const a = s * 0.13;
      const p = torsoPoint(y, a, 0.0085);
      const n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const g = torus(0.0026, 0.0009, 16, 8);
      g.rotate(Math.PI / 2, 0, 0);
      placeFacing(g, p, n.toArray());
      metal.push(g);
      (s > 0 ? laceL : laceR).push(p);
    }
  }
  const laces = [];
  for (let i = 0; i < holes - 1; i++) {
    for (const [A, B] of [[laceL[i], laceR[i + 1]], [laceR[i], laceL[i + 1]]]) {
      const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2 + 0.0025];
      laces.push(tube(spline([A, m, B], 10), 0.0011, { radial: 6 }));
    }
  }
  // A small bow at the top, with two tails
  const top = torsoPoint(0.782, 0, 0.011);
  for (const s of [1, -1]) {
    const loop = [];
    for (let i = 0; i <= 20; i++) { const t = (i / 20) * Math.PI * 2; loop.push([top[0] + s * (0.008 + Math.cos(t) * 0.007), top[1] + Math.sin(t) * 0.004, top[2] + 0.002]); }
    laces.push(tube(loop, 0.0013, { radial: 6 }));
    laces.push(tube(spline([top, [top[0] + s * 0.006, top[1] - 0.02, top[2] + 0.004], [top[0] + s * 0.01, top[1] - 0.038, top[2] + 0.002]], 16), 0.0011, { radial: 6 }));
  }
  laces.push(sphere(0.0028, 10, 8).move(top[0], top[1], top[2] + 0.002));
  parts.push({ geo: Geo.merge(laces), mat: 'laceCord', what: 'bodice' });
  parts.push({ geo: Geo.merge(metal), mat: 'gold', what: 'bodice' });
  return parts;
}

// ---------------------------------------------------------------- skirts
// The skirt's radius around the body at height y and angle a, before folds.
export function skirtRadius(y, a, top) {
  const base = torsoPoint(Math.max(y, 0.5), a, 0.008);
  const r0 = Math.hypot(base[0], base[2]);
  const drop = top - y;
  // Flares quickly over the hips, then falls more straight
  const flare = 0.34 * drop - 0.18 * drop * drop + 0.03 * smooth(0, 0.08, drop);
  return r0 + Math.max(0, flare);
}

// A skirt from `top` down to hem(u) with folds. Options for a slit (at angle slitA, from the hem up to slitTop).
function skirtSurface({ top, hem, folds, foldAmp, slit = null, nu = 260, nv = 70, phase = 0 }) {
  const gapAt = (y) => (slit ? slit.width * smooth(slit.top, slit.top - 0.1, y) : 0);
  return (u, v) => {
    // u: 0..1 around, starting and ending at the slit (or the back when there's none)
    const start = slit ? slit.angle : Math.PI;
    const yEdge = hem(u);
    const y = lerp(top, yEdge, v);
    const g = gapAt(y);
    const a = start + g / 2 + u * (Math.PI * 2 - g);
    const drop = top - y;
    const amp = foldAmp * smooth(0.0, 0.2, drop);
    let r = skirtRadius(y, a, top);
    r += amp * Math.sin(a * folds + phase + nz(Math.cos(a), Math.sin(a), y * 3) * 1.2);
    r += 0.006 * nz(Math.cos(a) * 2, Math.sin(a) * 2, y * 5) * smooth(0, 0.2, drop);
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };
}

export function buildSkirts() {
  const parts = [];
  const R = rng(8);
  // Outer skirt: black, pointed tatters, a slit at her left front
  const pts = 11;
  const jitter = Array.from({ length: pts + 1 }, () => R());
  const hemOuter = (u) => {
    const x = u * pts;
    const i = Math.floor(x), f = x - i;
    const tri = 1 - Math.abs(f - 0.5) * 2; // 0 at the notch, 1 at the point
    const depth = 0.045 + 0.03 * jitter[i % pts];
    return 0.325 - depth * Math.pow(tri, 1.6) + 0.02 * jitter[(i + 3) % pts];
  };
  const outer = skirtSurface({ top: 0.648, hem: hemOuter, folds: 13, foldAmp: 0.014, slit: { angle: 0.42, width: 0.5, top: 0.44 } });
  parts.push({ geo: cloth(240, 40, outer, 0.003, { uv: (u, v) => [u, v * 0.88] }), mat: 'dress', what: 'skirt' });

  // A shorter over-layer at the back and sides, with bigger points (a bustle of tatters)
  const hemOver = (u) => {
    const x = u * 7;
    const f = x - Math.floor(x);
    const tri = 1 - Math.abs(f - 0.5) * 2;
    return 0.45 - 0.07 * Math.pow(tri, 1.4);
  };
  const over = (u, v) => {
    const a = Math.PI * 0.35 + u * Math.PI * 1.3; // her left side, round the back, to her right side
    const y = lerp(0.648, hemOver(u), v);
    const drop = 0.648 - y;
    let r = skirtRadius(y, a, 0.648) + 0.012 + 0.01 * smooth(0, 0.2, drop);
    r += 0.012 * smooth(0, 0.15, drop) * Math.sin(a * 11 + 1.3);
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };
  parts.push({ geo: cloth(140, 26, over, 0.0028, { uv: (u, v) => [u, v * 0.7] }), mat: 'dressDark', what: 'skirt' });

  // Underskirt: lilac lace, longer, with a scalloped hem, no slit
  const hemUnder = (u) => 0.285 - 0.012 * Math.abs(Math.sin(u * Math.PI * 30)) + 0.008 * Math.sin(u * Math.PI * 2 * 3);
  const under = skirtSurface({ top: 0.62, hem: hemUnder, folds: 21, foldAmp: 0.01, phase: 1.1, slit: { angle: 0.42, width: 0.42, top: 0.42 } });
  const underGeo = cloth(200, 30, (u, v) => { const p = under(u, v); const s = 0.965; return [p[0] * s, p[1], p[2] * s]; }, 0.002, { uv: (u, v) => [u, 0.55 + v * 0.45] });
  parts.push({ geo: underGeo, mat: 'lace', what: 'skirt' });
  return parts;
}

// ---------------------------------------------------------------- sash, buckle, pouch
export function buildSash() {
  const parts = [];
  const sash = cloth(200, 8, (u, v) => {
    const a = (u - 0.5) * Math.PI * 2;
    const y = lerp(0.683, 0.632, v);
    return torsoPoint(y, a, 0.012 + 0.002 * Math.sin(a * 9));
  }, 0.003, { closeU: true, uv: (u, v) => [u * 4, v * 0.1] });
  parts.push({ geo: sash, mat: 'sash' });
  // Buckle: a gold crescent frame at the front
  const front = torsoPoint(0.657, 0, 0.017);
  const b = crescent(0.02, 0.003);
  b.move(0, 0.02, 0);
  placeFacing(b, front, [0, 0, 1], Math.PI / 2);
  parts.push({ geo: b, mat: 'gold' });
  // The knot's tails hanging on her right front
  for (const [dx, len] of [[-0.05, 0.1], [-0.035, 0.085]]) {
    const top = torsoPoint(0.65, Math.atan2(dx, 0.07), 0.018);
    const tail = cloth(8, 20, (u, v) => {
      const w = lerp(0.016, 0.012, v);
      return [top[0] + (u - 0.5) * w + 0.004 * Math.sin(v * 5), top[1] - v * len, top[2] + 0.004 + 0.01 * v + 0.003 * Math.sin(v * 7 + u)];
    }, 0.0025, { uv: (u, v) => [u, v * 0.2] });
    parts.push({ geo: tail, mat: 'sash' });
  }
  // Pouch on her left hip: a rounded leather bag with a flap and a gold clasp
  const pc = torsoPoint(0.6, Math.PI * 0.5, 0.03);
  const bag = surface(32, 20, (u, v) => {
    const a = u * Math.PI * 2, ph = v * Math.PI;
    const x = Math.sin(ph) * Math.cos(a) * 0.012, z = Math.sin(ph) * Math.sin(a) * 0.028, y = -Math.cos(ph) * 0.032;
    return [pc[0] + x + 0.004, pc[1] + y - 0.01 * Math.max(0, -Math.cos(ph)), pc[2] + z];
  }, { closeU: true });
  parts.push({ geo: bag, mat: 'leather' });
  const flap = cloth(16, 10, (u, v) => {
    const a = (u - 0.5) * Math.PI * 0.95;
    return [pc[0] + 0.015 + 0.004 * v, pc[1] + 0.03 - v * 0.03, pc[2] + Math.sin(a) * 0.029 * (1 - 0.3 * v * v)];
  }, 0.002);
  parts.push({ geo: flap, mat: 'leather' });
  parts.push({ geo: sphere(0.004, 12, 8).move(pc[0] + 0.02, pc[1] + 0.0, pc[2]), mat: 'gold' });
  return parts;
}

// ---------------------------------------------------------------- jewelry
export function buildJewelry(skel) {
  const parts = [];
  // Choker: a black velvet band round the neck with a little gold crescent
  const choker = cloth(96, 4, (u, v) => {
    const a = (u - 0.5) * Math.PI * 2;
    const y = lerp(0.908, 0.896, v);
    const r = 0.0375;
    return [Math.sin(a) * r, y, -0.012 + Math.cos(a) * r];
  }, 0.002, { closeU: true });
  parts.push({ geo: choker, mat: 'velvet', bone: 'neck' });
  const moon = crescent(0.0075, 0.0022);
  placeFacing(moon, [0, 0.896, 0.028], [0, -0.1, 1], Math.PI / 2);
  parts.push({ geo: moon, mat: 'gold', bone: 'neck' });
  // A long fine chain with a gold key pendant, lying on her chest
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const a = lerp(-1.5, 1.5, t);
    const y = 0.878 - 0.06 * Math.cos(a / 1.5 * Math.PI / 2) ** 0.6;
    const p = torsoPoint(Math.max(0.72, y), a, 0.012 + 0.004 * Math.cos(a));
    pts.push([p[0], y, p[2]]);
  }
  parts.push({ geo: chain(pts, { link: 0.005, wire: 0.0006, detail: [10, 5] }), mat: 'gold', bone: 'chest' });
  const bot = pts[15];
  const key = [];
  const ring = torus(0.0065, 0.0014, 24, 8);
  ring.rotate(Math.PI / 2, 0, 0);
  ring.move(0, -0.008, 0);
  key.push(ring);
  key.push(tube([[0, -0.015, 0], [0, -0.042, 0]], 0.0016, { radial: 8 }));
  key.push(tube([[0, -0.036, 0], [0.006, -0.036, 0]], 0.0013, { radial: 6 }));
  key.push(tube([[0, -0.041, 0], [0.005, -0.041, 0]], 0.0013, { radial: 6 }));
  key.push(sphere(0.0022, 10, 8).move(0, -0.0015, 0));
  const k = Geo.merge(key);
  k.move(bot[0], bot[1], bot[2] + 0.004);
  parts.push({ geo: k, mat: 'gold', bone: 'chest' });

  // Bracelets on both wrists: amethyst beads and a thin gold bangle
  for (const side of [1, -1]) {
    const S = side > 0 ? 'L' : 'R';
    const el = skel.get(`forearm_${S}`).rest, wr = skel.get(`hand_${S}`).rest;
    const d = wr.clone().sub(el).normalize();
    const axisQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    for (const [off, kind] of [[-0.014, 'beads'], [-0.024, 'bangle'], [-0.004, 'bangle']]) {
      const c = wr.clone().addScaledVector(d, off);
      const r = 0.0265 + (-off) * 0.1;
      if (kind === 'beads') {
        const ring = [];
        for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r * 0.9).applyQuaternion(axisQ).add(c).toArray()); }
        parts.push({ geo: beadString(ring, 0.0036, { gap: 0.05, detail: [12, 9] }), mat: 'amethyst', bone: `forearm_${S}` });
      } else {
        const g = torus(r, 0.0012, 48, 8);
        g.scale(1, 1, 0.9);
        g.apply(new THREE.Matrix4().makeRotationFromQuaternion(axisQ));
        g.move(c.x, c.y, c.z);
        parts.push({ geo: g, mat: 'gold', bone: `forearm_${S}` });
      }
    }
  }
  return parts;
}

// ---------------------------------------------------------------- skirt bones and weights
export const SKIRT_CHAINS = 10;
export function addSkirtBones(skel) {
  for (let k = 0; k < SKIRT_CHAINS; k++) {
    const a = (k / SKIRT_CHAINS) * Math.PI * 2;
    let parent = 'hips';
    for (let j = 0; j < 3; j++) {
      const y = [0.56, 0.44, 0.32][j];
      const r = skirtRadius(y, a, 0.648);
      skel.add(`skirt${k}_${j}`, parent, [Math.sin(a) * r, y, Math.cos(a) * r]);
      parent = `skirt${k}_${j}`;
    }
  }
}

export function skirtWeights() {
  const ys = [0.56, 0.44, 0.32];
  return (p) => {
    let a = Math.atan2(p.x, p.z);
    if (a < 0) a += Math.PI * 2;
    const f = (a / (Math.PI * 2)) * SKIRT_CHAINS;
    const k0 = Math.floor(f) % SKIRT_CHAINS, k1 = (k0 + 1) % SKIRT_CHAINS;
    const t = f - Math.floor(f);
    const w = [];
    const hipsW = smooth(0.5, 0.6, p.y);
    if (hipsW > 0) w.push(['hips', hipsW]);
    const rest = 1 - hipsW;
    if (rest > 0) {
      let hw;
      if (p.y >= ys[0]) hw = [[0, 1]];
      else if (p.y >= ys[1]) { const u = (ys[0] - p.y) / (ys[0] - ys[1]); hw = [[0, 1 - u], [1, u]]; }
      else if (p.y >= ys[2]) { const u = (ys[1] - p.y) / (ys[1] - ys[2]); hw = [[1, 1 - u], [2, u]]; }
      else hw = [[2, 1]];
      for (const [kk, kw] of [[k0, 1 - t], [k1, t]])
        for (const [j, x] of hw) w.push([`skirt${kk}_${j}`, kw * x * rest]);
    }
    return w;
  };
}
