// Her face: painted eyes and mouths laid onto the skin as thin decals, brows as little strokes, and her round
// gold glasses. Expressions are morph targets (blend shapes):
//   Blink     the open eyes fold down onto the lash line and the closed, smiling eyes (^ ^) open out
//   Smile     the small closed smile tucks under the skin and an open, happy mouth grows in its place
//   Surprise  a little 'o' and raised brows
//   Pain      a wobbly grimace and worried brows
// Everything here is in head-local space (the head center at the origin).
import * as THREE from 'three';
import { Geo, surface, tube, torus, spline, smooth, lerp } from '../lib/geo.mjs';
import { faceZ, faceNormal, surfacePoint, EAR_DIR } from './head.mjs';

const LIFT = 0.00045; // decals float this far off the skin

// A patch of the face surface around (cx, cy), w x h meters, uv mapped to a texture rectangle.
function decal(cx, cy, w, h, { uv0 = [0, 0], uv1 = [1, 1], mirror = false, n = 28, tilt = 0 } = {}) {
  const g = surface(n, n, (u, v) => {
    const lx = (u - 0.5) * w, ly = (0.5 - v) * h;
    const x = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt);
    const y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    const nn = faceNormal(x, y);
    const z = faceZ(x, y);
    return [x + nn.x * LIFT, y + nn.y * LIFT, z + nn.z * LIFT];
  }, {
    uv: (u, v) => [lerp(uv0[0], uv1[0], mirror ? 1 - u : u), lerp(uv0[1], uv1[1], v)],
  });
  // Tag each vertex with its patch coordinates for morphs
  const us = [], vs = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { us.push(i / n); vs.push(j / n); }
  g.tag({ u: (i) => us[i], v: (i) => vs[i] });
  return g;
}

// Move a point to (x, y) on the face surface
function onFace(x, y, lift = LIFT) {
  const nn = faceNormal(x, y);
  const z = faceZ(x, y);
  return new THREE.Vector3(x + nn.x * lift, y + nn.y * lift, z + nn.z * lift);
}

export const EYES = { x: 0.051, y: -0.037, size: 0.084 };
export const MOUTH = { x: 0, y: -0.097, w: 0.04 };

export function buildFace() {
  const out = []; // { geo, mat, morphs }
  const { x: ex, y: ey, size } = EYES;
  // The painted eye's lids close onto this line (fraction of the patch height from the top)
  const closeV = 0.62;
  for (const side of [1, -1]) {
    const cx = side * ex;
    const tilt = side * 0.03;
    const open = decal(cx, ey, size, size, { mirror: side < 0, tilt });
    const lineY = (u) => ey + (0.5 - closeV) * size + (u - 0.5) * size * Math.sin(tilt);
    const collapse = (p, i, geo) => {
      const u = geo.extra.u[i];
      const x = cx + (u - 0.5) * size;
      const q = onFace(x, lineY(u), LIFT);
      return [q.x - p.x, q.y - p.y, q.z - p.z];
    };
    out.push({ geo: open, mat: 'eyeOpen', morphs: { Blink: collapse } });
    // Closed eyes: rest collapsed on the line (invisible), Blink opens them out
    const closed = decal(cx, ey + 0.004, size, size, { mirror: side < 0, tilt });
    const full = closed.clone();
    const collapsedPos = [];
    for (let i = 0; i < closed.count; i++) {
      const u = closed.extra.u[i];
      const q = onFace(cx + (u - 0.5) * size, lineY(u) + 0.004, LIFT * 1.5);
      collapsedPos.push(q);
      closed.pos[i * 3] = q.x; closed.pos[i * 3 + 1] = q.y; closed.pos[i * 3 + 2] = q.z;
    }
    out.push({
      geo: closed, mat: 'eyeClosed',
      morphs: { Blink: (p, i) => [full.pos[i * 3] - collapsedPos[i].x, full.pos[i * 3 + 1] - collapsedPos[i].y, full.pos[i * 3 + 2] - collapsedPos[i].z] },
    });
  }

  // Mouths: four cells of the mouth sheet at the same spot
  const mw = MOUTH.w, mh = mw;
  const hide = (p) => { const n = faceNormal(p.x, p.y); return [-n.x * 0.004, -n.y * 0.004, -n.z * 0.004]; };
  for (let cell = 0; cell < 4; cell++) {
    const g = decal(MOUTH.x, MOUTH.y, mw, mh, { uv0: [cell / 4, 0], uv1: [(cell + 1) / 4, 1], n: 20 });
    if (cell === 0) {
      out.push({ geo: g, mat: 'mouth', morphs: { Smile: hide, Surprise: hide, Pain: hide } });
      continue;
    }
    // Collapsed to the mouth's center at rest; the morph grows it out
    const full = g.clone();
    const c = onFace(MOUTH.x, MOUTH.y, LIFT);
    for (let i = 0; i < g.count; i++) { g.pos[i * 3] = c.x; g.pos[i * 3 + 1] = c.y; g.pos[i * 3 + 2] = c.z; }
    const grow = (p, i) => [full.pos[i * 3] - c.x, full.pos[i * 3 + 1] - c.y, full.pos[i * 3 + 2] - c.z];
    const name = ['', 'Smile', 'Surprise', 'Pain'][cell];
    out.push({ geo: g, mat: 'mouth', morphs: { [name]: grow } });
  }

  // Brows: short tapered strokes on the forehead
  for (const side of [1, -1]) {
    const ctrl = [[0.022, 0.006], [0.042, 0.017], [0.062, 0.019], [0.078, 0.012]].map(([x, y]) => [side * x, y]);
    const pts = spline(ctrl.map(([x, y]) => onFace(x, y, 0.0012).toArray()), 30);
    const g = tube(pts, (t) => [0.0021 * (1 - 0.65 * t) + 0.0004, 0.0009], { radial: 10, up: [0, 0, 1] });
    const raise = (p) => { const k = 1 - Math.abs(p.x) / 0.1; return [0, 0.006 + 0.002 * k, 0]; };
    const worry = (p) => { const k = smooth(0.08, 0.02, Math.abs(p.x)); return [side * 0.001 * k, 0.006 * k - 0.001, 0]; };
    out.push({ geo: g, mat: 'brow', morphs: { Surprise: raise, Pain: worry } });
  }
  return out;
}

// Round gold wire glasses: two rims, a bridge, hinges and temples back to her ears, and faint lenses.
export function buildGlasses() {
  const frame = [], lenses = [];
  const R = 0.037, wire = 0.0017;
  const rimZ = (side) => faceZ(side * EYES.x, EYES.y) + 0.016;
  for (const side of [1, -1]) {
    const c = new THREE.Vector3(side * EYES.x, EYES.y + 0.002, rimZ(side));
    const yaw = side * 0.2;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, yaw, 0));
    const rim = torus(R, wire, 72, 10);
    rim.rotate(Math.PI / 2, 0, 0);
    rim.place(c.toArray(), q);
    frame.push(rim);
    // A lens: a thin disc, slightly domed
    const lens = surface(48, 6, (u, v) => {
      const a = u * Math.PI * 2, r = v * (R - 0.0005);
      return [Math.cos(a) * r, Math.sin(a) * r, 0.0015 * (1 - (r / R) ** 2)];
    }, { closeU: true });
    lens.place(c.toArray(), q);
    lenses.push(lens);
    // Hinge: where the rim meets the temple
    const hinge = new THREE.Vector3(R, 0, 0).applyQuaternion(q).multiplyScalar(side).add(c);
    const knob = torus(0.0022, 0.0012, 16, 8);
    knob.place(hinge.toArray(), q);
    frame.push(knob);
    // Temple arm back along the side of her head to the ear, hooking down behind it
    const ear = surfacePoint([side * EAR_DIR[0], EAR_DIR[1], EAR_DIR[2]], 0);
    const ctrl = [hinge.toArray()];
    for (const [k, off] of [[0.25, 0.004], [0.5, 0.0035], [0.75, 0.0032], [1, 0.0035]]) {
      const d = new THREE.Vector3().lerpVectors(hinge.clone().setY(EYES.y), ear.clone().setY(EYES.y), k);
      d.y = lerp(EYES.y + 0.004, ear.y + 0.012, k);
      ctrl.push(surfacePoint(d.clone().sub(new THREE.Vector3(0, -0.02, 0.01)), off).toArray());
    }
    ctrl.push(surfacePoint([side, -0.5, -0.45], 0.004).toArray());
    const pts = spline(ctrl, 48);
    frame.push(tube(pts, wire * 0.95, { radial: 8 }));
  }
  // Bridge: a small arch over the nose between the inner edges of the rims
  const inner = (side) => new THREE.Vector3(-R, 0, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, side * 0.2, 0))).multiplyScalar(side).add(new THREE.Vector3(side * EYES.x, EYES.y + 0.002, rimZ(side)));
  const a = inner(1), b = inner(-1);
  const mid = new THREE.Vector3(0, EYES.y + 0.009, faceZ(0, EYES.y + 0.01) + 0.012);
  frame.push(tube(spline([a.toArray(), mid.toArray(), b.toArray()], 24), wire, { radial: 8 }));
  return { frame: Geo.merge(frame), lenses: Geo.merge(lenses) };
}
