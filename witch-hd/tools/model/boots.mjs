// Her boots: black leather, laced up the front to just under the knee, with a folded cuff, a strap with a gold
// buckle, a stacked heel and a welted sole.
import * as THREE from 'three';
import { Geo, surface, tube, torus, spline, sphere, smooth, clamp, lerp, slab } from '../lib/geo.mjs';
import { chainWeights } from '../lib/rig.mjs';

// Foot profile along z (heel -> toe), relative to the ankle's x. [z, halfWidth, top]
const FOOT = [[-0.058, 0.0, 0.05], [-0.054, 0.02, 0.07], [-0.04, 0.025, 0.085], [-0.015, 0.026, 0.1], [0.01, 0.027, 0.098], [0.035, 0.03, 0.074], [0.06, 0.031, 0.056], [0.085, 0.027, 0.046], [0.1, 0.019, 0.04], [0.108, 0.0, 0.034]];
// Smooth (Catmull-Rom) through the profile keys, so the shoe has no creases
const lerpProfile = (z) => {
  const n = FOOT.length;
  if (z <= FOOT[0][0]) return FOOT[0];
  if (z >= FOOT[n - 1][0]) return FOOT[n - 1];
  let i = 0;
  while (FOOT[i + 1][0] < z) i++;
  const p0 = FOOT[Math.max(0, i - 1)], p1 = FOOT[i], p2 = FOOT[i + 1], p3 = FOOT[Math.min(n - 1, i + 2)];
  const t = (z - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
  const cr = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  return [z, Math.max(0, cr(1)), cr(2)];
};
const SOLE = 0.013, HEEL = 0.024;
const bottomAt = (z) => lerp(SOLE, HEEL, smooth(-0.005, -0.025, z));

export function buildBoot(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const ank = skel.get(`foot_${S}`).rest, knee = skel.get(`shin_${S}`).rest;
  const cx = ank.x, cz = ank.z;
  const parts = [];

  // ---------------------------------------------------------------- the foot: a lofted superellipse shoe
  const z0 = FOOT[0][0], z1 = FOOT.at(-1)[0];
  const foot = surface(48, 64, (u, v) => {
    // v: heel -> toe with rounded ends
    const z = lerp(z0, z1, v);
    const [, hw0, top] = lerpProfile(z);
    const end = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v - 0.5) * 2, 8)));
    const hw = Math.max(hw0, 0.001) * (0.25 + 0.75 * end);
    const bot = bottomAt(z);
    const mid = (top + bot) / 2, hh = ((top - bot) / 2) * (0.3 + 0.7 * end);
    const a = u * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const e = s < 0 ? 5 : 2.4; // flatter underneath
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.4) * hw;
    const y = mid + Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * hh;
    return [cx + x * (side > 0 ? 1 : 1), y, cz + z];
  }, { closeU: true, uv: (u, v) => [u * 2, v * 2] });
  foot.orientOut((p) => [cx, 0.05, p[2]]);
  foot.tag({ region: 1 });
  parts.push({ geo: foot, mat: 'boot' });

  // Sole and heel: a slab under the footprint, and a stacked heel block
  const outline = [];
  for (let i = 0; i <= 40; i++) {
    const z = lerp(z0 + 0.001, z1 - 0.001, i / 40);
    outline.push([lerpProfile(z)[1] + 0.0035, z]);
  }
  const ring = outline.map(([w, z]) => [w, z]).concat(outline.slice().reverse().map(([w, z]) => [-w, z]));
  const sole = slab(ring.map(([x, z]) => [x, z]), SOLE, { bevel: 0.0015 });
  sole.rotate(Math.PI / 2, 0, 0); // slab is in xy with depth z -> lay it flat (y up)
  sole.move(cx, SOLE / 2, cz);
  sole.computeNormals();
  sole.tag({ region: 1 });
  parts.push({ geo: sole, mat: 'sole' });
  const heelRing = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const z = lerp(-0.057, -0.018, t); heelRing.push([lerpProfile(z)[1] + 0.002, z]); }
  const heelOutline = heelRing.concat(heelRing.slice().reverse().map(([w, z]) => [-w, z]));
  const heel = slab(heelOutline, HEEL - SOLE + 0.002, { bevel: 0.001 });
  heel.rotate(Math.PI / 2, 0, 0);
  heel.move(cx, SOLE + (HEEL - SOLE) / 2, cz);
  heel.computeNormals();
  heel.tag({ region: 1 });
  parts.push({ geo: heel, mat: 'sole' });
  // Welt: a thin rolled line where the upper meets the sole
  const welt = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const k = t < 0.5 ? t * 2 : (1 - t) * 2;
    const z = lerp(z0 + 0.003, z1 - 0.002, k);
    const w = lerpProfile(z)[1] + 0.0025;
    welt.push([cx + (t < 0.5 ? w : -w), bottomAt(z) + 0.0015, cz + z]);
  }
  parts.push({ geo: tube(welt, 0.0016, { radial: 6, caps: false }).tag({ region: 1 }), mat: 'sole' });
  // Toe cap seam
  const seam = [];
  for (let i = 0; i <= 30; i++) {
    const a = lerp(-1.3, 1.3, i / 30);
    const z = 0.07 - 0.012 * Math.cos(a);
    const [, hw, top] = lerpProfile(z);
    const bot = bottomAt(z);
    const mid = (top + bot) / 2, hh = (top - bot) / 2;
    const x = Math.sin(a) * hw * 1.02, y = mid + Math.cos(a) ** 0.8 * hh * 1.02;
    seam.push([cx + x, y + 0.0006, cz + z]);
  }
  parts.push({ geo: tube(seam, 0.0011, { radial: 6 }).tag({ region: 1 }), mat: 'boot' });

  // ---------------------------------------------------------------- the shaft: up the shin to below the knee
  const top = 0.285;
  const shaftAxis = (y) => {
    const t = (y - ank.y) / (knee.y - ank.y);
    return new THREE.Vector3(lerp(ank.x, knee.x, t), y, lerp(ank.z, knee.z, t) + 0.004);
  };
  const legR = (y) => {
    if (y > 0.2) return lerp(0.04, 0.043, Math.sin(((y - 0.2) / 0.105) * Math.PI));
    return lerp(0.027, 0.041, smooth(0.1, 0.2, y));
  };
  const shaft = surface(56, 52, (u, v) => {
    const y = lerp(top, ank.y - 0.01, v);
    const c = shaftAxis(y);
    const a = u * Math.PI * 2; // 0 = front
    const back = -Math.cos(a);
    const calf = y < 0.3 && y > 0.12 ? Math.max(0, back) * 0.006 * Math.sin(((y - 0.12) / 0.18) * Math.PI) : 0;
    let r = legR(y) + 0.0065 + calf;
    // Ankle: wider and deeper to meet the shoe
    const ankle = smooth(0.14, ank.y, y);
    r += ankle * 0.004;
    // Leather creases around the ankle
    r += 0.0012 * Math.sin(y * 260) * smooth(0.16, 0.12, y) * smooth(0.08, 0.1, y);
    return [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r * (1 + 0.15 * ankle * Math.max(0, Math.cos(a)))];
  }, { closeU: true, uv: (u, v) => [u * 2, v * 2] });
  shaft.orientOut((p) => { const c = shaftAxis(p[1]); return [c.x, p[1], c.z]; });
  shaft.tag({ region: 0 });
  parts.push({ geo: shaft, mat: 'boot' });

  // Folded cuff at the top
  const cuff = surface(72, 10, (u, v) => {
    const y = lerp(top + 0.012, top - 0.028, v);
    const c = shaftAxis(y);
    const a = u * Math.PI * 2;
    const r = legR(y) + 0.011 + 0.004 * (1 - v) + 0.0015 * Math.sin(a * 7);
    return [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r];
  }, { closeU: true, uv: (u, v) => [u * 2, v * 0.3] });
  cuff.orientOut((p) => { const c = shaftAxis(p[1]); return [c.x, p[1], c.z]; });
  const cuffIn = surface(72, 4, (u, v) => {
    const y = lerp(top + 0.012, top - 0.004, v);
    const c = shaftAxis(y);
    const a = u * Math.PI * 2;
    const r = legR(y) + 0.004;
    return [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r];
  }, { closeU: true });
  cuffIn.orientOut((p) => { const c = shaftAxis(p[1]); return [c.x, p[1], c.z]; }).flip();
  const lip = [];
  for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; const y = top + 0.012; const c = shaftAxis(y); const r = legR(y) + 0.0085; lip.push([c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r]); }
  parts.push({ geo: Geo.merge([cuff, cuffIn]).tag({ region: 0 }), mat: 'boot' });
  parts.push({ geo: tube(lip, 0.0035, { radial: 8, caps: false }).tag({ region: 0 }), mat: 'boot' });

  // Laces: eyelets either side of the front, crossing laces and a bow
  const eyes = [];
  const L = [], Rr = [];
  const holes = 8;
  for (let i = 0; i < holes; i++) {
    const y = lerp(0.118, 0.262, i / (holes - 1));
    const c = shaftAxis(y);
    const r = legR(y) + 0.0075;
    for (const s of [1, -1]) {
      const a = s * 0.3;
      const p = [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r];
      const g = torus(0.0024, 0.0008, 14, 6);
      g.rotate(Math.PI / 2, 0, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
      g.place(p, q);
      eyes.push(g);
      (s > 0 ? L : Rr).push(p);
    }
  }
  const laces = [];
  for (let i = 0; i < holes - 1; i++) {
    for (const [A, B] of [[L[i], Rr[i + 1]], [Rr[i], L[i + 1]]]) {
      const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2 + 0.003];
      laces.push(tube(spline([A, m, B], 8), 0.0011, { radial: 6 }));
    }
  }
  const bowAt = shaftAxis(0.268);
  const bow = [bowAt.x, 0.268, bowAt.z + legR(0.268) + 0.011];
  for (const s of [1, -1]) {
    const loop = [];
    for (let i = 0; i <= 18; i++) { const t = (i / 18) * Math.PI * 2; loop.push([bow[0] + s * (0.007 + Math.cos(t) * 0.006), bow[1] + Math.sin(t) * 0.0035, bow[2] + 0.002]); }
    laces.push(tube(loop, 0.0012, { radial: 6 }));
    laces.push(tube(spline([bow, [bow[0] + s * 0.004, bow[1] - 0.015, bow[2] + 0.004], [bow[0] + s * 0.007, bow[1] - 0.03, bow[2] + 0.003]], 12), 0.0011, { radial: 6 }));
  }
  laces.push(sphere(0.0025, 10, 8).move(...bow));
  parts.push({ geo: Geo.merge(laces).tag({ region: 0 }), mat: 'bootLace' });
  parts.push({ geo: Geo.merge(eyes).tag({ region: 0 }), mat: 'gold' });
  // Tongue showing between the laces
  const tongue = surface(10, 30, (u, v) => {
    const y = lerp(0.265, 0.11, v);
    const c = shaftAxis(y);
    const a = (u - 0.5) * 0.6;
    const r = legR(y) + 0.0068;
    return [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r];
  });
  tongue.orientOut((p) => { const c = shaftAxis(p[1]); return [c.x, p[1], c.z]; });
  parts.push({ geo: tongue.tag({ region: 0 }), mat: 'bootDark' });

  // A strap round the ankle with a gold buckle on the outside
  const strapY = 0.14;
  const strap = surface(72, 4, (u, v) => {
    const y = strapY + (v - 0.5) * 0.012;
    const c = shaftAxis(y);
    const a = u * Math.PI * 2;
    const r = legR(y) + 0.0095 + 0.0015 * Math.sin(v * Math.PI);
    return [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r];
  }, { closeU: true, uv: (u, v) => [u * 2, v * 0.2] });
  strap.orientOut((p) => { const c = shaftAxis(p[1]); return [c.x, p[1], c.z]; });
  parts.push({ geo: strap.tag({ region: 0 }), mat: 'strap' });
  const bc = shaftAxis(strapY);
  const bA = side * Math.PI / 2;
  const buckle = torus(0.008, 0.0014, 24, 8);
  buckle.scale(1, 1, 0.75);
  buckle.rotate(0, 0, Math.PI / 2);
  const bq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(Math.sin(bA), 0, Math.cos(bA)));
  buckle.place([bc.x + Math.sin(bA) * (legR(strapY) + 0.012), strapY, bc.z + Math.cos(bA) * (legR(strapY) + 0.012)], bq);
  parts.push({ geo: buckle.tag({ region: 0 }), mat: 'gold' });
  return parts;
}

export function bootWeights(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const ank = skel.get(`foot_${S}`).rest, toe = skel.get(`toe_${S}`).rest;
  return (p, i, geo) => {
    const region = geo.extra?.region?.[i] ?? 0;
    if (region === 0) {
      // Shaft: shin, handing over to the foot at the ankle
      const k = smooth(ank.y + 0.035, ank.y - 0.01, p.y);
      return [[`shin_${S}`, 1 - k], [`foot_${S}`, k]];
    }
    // Shoe: foot, toe box bends with the toe; the heel top blends toward the shin
    const t = smooth(toe.z - 0.02, toe.z + 0.005, p.z);
    const up = smooth(ank.y - 0.005, ank.y + 0.02, p.y) * smooth(0.02, -0.01, p.z - ank.z);
    return [[`foot_${S}`, (1 - t) * (1 - up)], [`toe_${S}`, t * (1 - up)], [`shin_${S}`, up]];
  };
}
