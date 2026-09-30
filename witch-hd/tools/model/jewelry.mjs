// Small metal things: chains of real interlocking links, charms (crosses, stars, crescents, keys), beads.
import * as THREE from 'three';
import { Geo, torus, slab, sphere, tube, spline, frames } from '../lib/geo.mjs';

// A chain of oval links along a path of points (arrays). Each link turns 90 degrees from the last.
export function chain(points, { link = 0.006, wire = 0.0007, detail = [14, 6] } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const L = curve.getLength();
  const n = Math.max(2, Math.floor(L / (link * 0.72)));
  const parts = [];
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const g = torus(link * 0.36, wire, detail[0], detail[1]); // in the xz-plane, ring axis y
    g.scale(1, 1, 1.45); // long along z
    // Orient: z -> tangent; alternate the ring's plane
    const side = new THREE.Vector3().crossVectors(tan, Math.abs(tan.dot(up)) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    const normal = new THREE.Vector3().crossVectors(side, tan).normalize();
    const [ax, ay] = i % 2 ? [side, normal] : [normal, side];
    const m = new THREE.Matrix4().makeBasis(ax, ay, tan).setPosition(p);
    g.apply(m);
    parts.push(g);
  }
  return Geo.merge(parts);
}

// Flat charms, centered at the origin in the xy-plane, hanging from the top (y = 0 is the loop).
export function cross(s = 0.01, d = 0.0025) {
  const a = s * 0.18;
  const o = [[-a, 0], [a, 0], [a, -s * 0.35], [s * 0.42, -s * 0.35], [s * 0.42, -s * 0.35 - 2 * a], [a, -s * 0.35 - 2 * a], [a, -s * 1.3], [-a, -s * 1.3], [-a, -s * 0.35 - 2 * a], [-s * 0.42, -s * 0.35 - 2 * a], [-s * 0.42, -s * 0.35], [-a, -s * 0.35]];
  const g = slab(o, d, { bevel: d * 0.3 });
  return withLoop(g, s);
}
export function star(s = 0.01, d = 0.0025, points = 5) {
  const o = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 ? s * 0.42 : s;
    o.push([Math.sin(a) * r, Math.cos(a) * r - s]);
  }
  return withLoop(slab(o, d, { bevel: d * 0.3 }), s * 0.1);
}
export function crescent(s = 0.01, d = 0.0025) {
  const o = [];
  const N = 40;
  for (let i = 0; i <= N; i++) { const a = -Math.PI * 0.8 + (i / N) * Math.PI * 1.6; o.push([Math.sin(a) * s, Math.cos(a) * s - s]); }
  for (let i = N; i >= 0; i--) { const a = -Math.PI * 0.62 + (i / N) * Math.PI * 1.24; o.push([Math.sin(a) * s * 0.78 + s * 0.22, Math.cos(a) * s * 0.78 - s - s * 0.02]); }
  return withLoop(slab(o, d, { bevel: d * 0.25 }), s * 0.1);
}
function withLoop(g, s) {
  const loop = torus(s * 0.16, s * 0.045, 16, 6);
  loop.rotate(Math.PI / 2, 0, 0);
  loop.move(0, s * 0.12, 0);
  return Geo.merge([g, loop]);
}

// Place a charm (built in its own xy-plane) at a point, facing `dir`.
export function placeFacing(g, pos, dir, roll = 0) {
  const z = new THREE.Vector3(...dir).normalize();
  const y = new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const yy = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, yy, z);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationZ(roll));
  m.setPosition(new THREE.Vector3(...pos));
  return g.apply(m);
}

export function beadString(points, r, { gap = 0.1, detail = [12, 8] } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const L = curve.getLength();
  const n = Math.floor(L / (r * 2 * (1 + gap)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt((i + 0.5) / n);
    out.push(sphere(r, ...detail).move(p.x, p.y, p.z));
  }
  return Geo.merge(out);
}
