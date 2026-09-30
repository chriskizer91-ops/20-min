// Her head: a soft, round FF9-style face sculpted from blended ellipsoids (a signed distance field) and
// sampled on a dense sphere. Ears with crescent earrings. The eyes, brows and mouth are separate decals and
// strokes in face.mjs so they can blink and change mood (morph targets).
import * as THREE from 'three';
import { Geo, surface, tube, spline, sphere, smooth, torus, blob } from '../lib/geo.mjs';
import { HEAD_CENTER } from './skeleton.mjs';

export const HC = new THREE.Vector3(...HEAD_CENTER);

// ---------------------------------------------------------------- the sculpt
const ell = (p, c, r) => {
  const x = (p.x - c[0]) / r[0], y = (p.y - c[1]) / r[1], z = (p.z - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return (k0 * (k0 - 1)) / (k1 || 1e-9);
};
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};

// Signed distance to the skin, in head-local coordinates (head center at the origin)
export function headSDF(p) {
  let d = ell(p, [0, 0.022, -0.01], [0.139, 0.138, 0.14]); // cranium
  d = smin(d, ell(p, [0, -0.045, 0.03], [0.118, 0.1, 0.112]), 0.06); // lower face
  for (const s of [-1, 1]) d = smin(d, ell(p, [s * 0.06, -0.06, 0.058], [0.055, 0.045, 0.05]), 0.05); // cheeks
  d = smin(d, ell(p, [0, -0.103, 0.074], [0.036, 0.03, 0.036]), 0.04); // chin
  d = smin(d, ell(p, [0, -0.056, 0.127], [0.0095, 0.013, 0.01]), 0.012); // button nose
  return d;
}

const RAY_O = new THREE.Vector3(0, -0.02, 0.01);
export function headRadius(dir) {
  // Bisection along a ray from inside the head
  let lo = 0, hi = 0.3;
  const p = new THREE.Vector3();
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    p.copy(RAY_O).addScaledVector(dir, m);
    if (headSDF(p) < 0) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

// The skin point in a direction from inside the head, pushed out by `off`
export function surfacePoint(dir, off = 0) {
  const d = new THREE.Vector3(...(Array.isArray(dir) ? dir : dir.toArray())).normalize();
  return RAY_O.clone().addScaledVector(d, headRadius(d) + off);
}
export const EAR_DIR = [1, -0.26, -0.12];

// Where a ray going backward (-z) from the front hits the face: for placing decals. (x, y) head-local.
export function faceZ(x, y) {
  let lo = -0.05, hi = 0.2; // z; inside at lo, outside at hi
  const p = new THREE.Vector3(x, y, 0);
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    p.z = m;
    if (headSDF(p) < 0) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
export function faceNormal(x, y) {
  const e = 0.001;
  const z = faceZ(x, y);
  const dx = (faceZ(x + e, y) - faceZ(x - e, y)) / (2 * e);
  const dy = (faceZ(x, y + e) - faceZ(x, y - e)) / (2 * e);
  return new THREE.Vector3(-dx, -dy, 1).normalize();
}

export function buildHead() {
  const dir = new THREE.Vector3();
  const g = surface(180, 124, (u, v) => {
    const th = u * Math.PI * 2 + Math.PI; // seam at the back
    const ph = v * Math.PI;
    dir.set(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
    const r = headRadius(dir);
    return [RAY_O.x + dir.x * r, RAY_O.y + dir.y * r, RAY_O.z + dir.z * r];
  }, { closeU: true });
  g.computeNormals();
  return g;
}

// Skin tint in head-local space: rosy cheeks, a warm nose tip, a touch of shade under the jaw.
export function skinTint(p) {
  let r = 1, gg = 1, b = 1;
  for (const s of [-1, 1]) {
    const d = Math.hypot((p.x - s * 0.064) / 1.25, p.y + 0.071);
    const blush = (1 - smooth(0.006, 0.03, d)) * smooth(0.04, 0.09, p.z);
    gg -= blush * 0.2; b -= blush * 0.17;
  }
  const nose = 1 - smooth(0.004, 0.016, Math.hypot(p.x, p.y + 0.06, (p.z - 0.143) * 0.8));
  gg -= nose * 0.1; b -= nose * 0.1;
  // under the chin and toward the back of the jaw
  const under = smooth(-0.07, -0.13, p.y) * smooth(0.12, 0.0, p.z) * 0.25;
  r -= under * 0.6; gg -= under; b -= under * 0.8;
  return [r, gg, b];
}

// A small rounded ear, facing out and a little forward.
export function buildEar(side) {
  // A flattened egg with a hollow in its outer face and a rolled rim
  const ear = blob(40, 30, (d) => {
    const y = d[1], z = d[2], x = d[0];
    const rim = Math.hypot(y, z);
    let rx = 0.0065;
    if (x > 0) rx -= 0.005 * Math.max(0, 1 - (rim / 0.85) ** 4); // the hollow
    const ry = y > 0 ? 0.027 : 0.022;
    return [x * rx, y * ry, z * 0.0165 * (1 - 0.15 * Math.max(0, y))];
  });
  ear.rotate(0, -0.3, 0.1);
  const at = surfacePoint(EAR_DIR, 0.001);
  ear.move(at.x, at.y, at.z);
  if (side < 0) ear.mirrorX();
  return ear;
}

// A crescent earring on a short loop, hanging from the earlobe (head-local, relative to the lobe)
export function buildEarring(side) {
  const parts = [];
  const loop = torus(0.0045, 0.0009, 20, 8);
  loop.rotate(Math.PI / 2, 0, 0);
  loop.move(0, -0.004, 0);
  parts.push(loop);
  // Crescent: a thick arc swept along a moon outline
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = -Math.PI * 0.85 + (i / 28) * Math.PI * 1.7;
    pts.push([Math.sin(a) * 0.009, -Math.cos(a) * 0.009 - 0.018, 0]);
  }
  parts.push(tube(pts, (t) => 0.0006 + 0.0024 * Math.sin(t * Math.PI), { radial: 10, up: [0, 0, 1] }));
  const star = sphere(0.0022, 12, 8);
  star.move(0, -0.0085, 0);
  parts.push(star);
  const g = Geo.merge(parts);
  const at = surfacePoint(EAR_DIR, 0.004);
  g.move(at.x - 0.001, at.y - 0.024, at.z + 0.002);
  if (side < 0) g.mirrorX();
  return g;
}
