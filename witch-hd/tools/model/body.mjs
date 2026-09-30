// Her body under the clothes: the torso shape (the bodice is fitted over it), the neck and collarbones, arms
// in fitted black sleeves, hands with jointed fingers and plum nails, and legs in dark stockings.
import * as THREE from 'three';
import { Geo, surface, tube, spline, blob, smooth, clamp, lerp } from '../lib/geo.mjs';
import { chainWeights, segDist } from '../lib/rig.mjs';
import { ARM_ANGLE } from './skeleton.mjs';

// ---------------------------------------------------------------- the torso shape
// Cross-sections by height: [y, half-width, half-depth, z-center]
const TORSO = [
  [0.49, 0.092, 0.072, 0.0],
  [0.53, 0.104, 0.078, 0.0],
  [0.57, 0.108, 0.079, 0.0],
  [0.62, 0.096, 0.071, -0.002],
  [0.665, 0.083, 0.063, -0.004],
  [0.71, 0.087, 0.066, -0.004],
  [0.75, 0.094, 0.07, -0.006],
  [0.79, 0.1, 0.066, -0.01],
  [0.825, 0.098, 0.058, -0.012],
  [0.848, 0.072, 0.048, -0.014],
  [0.866, 0.044, 0.038, -0.014],
  [0.885, 0.034, 0.033, -0.012],
];
// Smooth (Catmull-Rom) interpolation between the sections, so the surface has no creases at the keys
function interp(y) {
  const n = TORSO.length;
  if (y <= TORSO[0][0]) return TORSO[0];
  if (y >= TORSO[n - 1][0]) return TORSO[n - 1];
  let i = 0;
  while (TORSO[i + 1][0] < y) i++;
  const p0 = TORSO[Math.max(0, i - 1)], p1 = TORSO[i], p2 = TORSO[i + 1], p3 = TORSO[Math.min(n - 1, i + 2)];
  const t = (y - p1[0]) / (p2[0] - p1[0]);
  const t2 = t * t, t3 = t2 * t;
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

// A point on the torso at height y and angle a (0 = front, +pi/2 = her left), pushed out by `off`.
export function torsoPoint(y, a, off = 0) {
  const [, hw, hd, zc] = interp(y);
  const s = Math.sin(a), c = Math.cos(a);
  // Superellipse: a boxier section at the hips, rounder above
  const e = 2.4;
  const k = Math.pow(Math.pow(Math.abs(s), e) + Math.pow(Math.abs(c), e), -1 / e);
  let x = s * k * hw, z = c * k * hd + zc;
  // Bust: two soft mounds
  for (const side of [-1, 1]) {
    const d = Math.hypot((x - side * 0.047) / 1.1, (y - 0.752) / 1.0);
    const m = Math.max(0, 1 - (d / 0.045) ** 2);
    if (c > 0) z += m * m * 0.02 * c;
  }
  // Shoulder blades and a little bottom
  if (c < 0) {
    for (const side of [-1, 1]) z -= Math.max(0, 1 - Math.hypot(x - side * 0.05, (y - 0.79) * 0.8) / 0.05) ** 2 * 0.006;
    z -= Math.max(0, 1 - Math.hypot(x / 1.3, (y - 0.54) * 1.1) / 0.09) ** 2 * 0.012 * -c;
  }
  const n = new THREE.Vector3(s / hw, 0, c / hd).normalize();
  return [x + n.x * off, y, z + n.z * off];
}

// Torso bone weights by height, with the shoulders leaning onto the upper arms.
export function torsoWeights(p) {
  const y = p.y;
  const w = [];
  const hips = 1 - smooth(0.585, 0.65, y);
  const spine = smooth(0.585, 0.65, y) * (1 - smooth(0.7, 0.77, y));
  const chest = smooth(0.7, 0.77, y) * (1 - smooth(0.852, 0.885, y));
  const neck = smooth(0.852, 0.885, y);
  if (hips > 0) w.push(['hips', hips]);
  if (spine > 0) w.push(['spine', spine]);
  if (chest > 0) {
    const side = p.x > 0 ? 'L' : 'R';
    const sh = smooth(0.065, 0.1, Math.abs(p.x)) * smooth(0.77, 0.82, y);
    w.push(['chest', chest * (1 - sh * 0.7)]);
    if (sh > 0) { w.push([`clavicle_${side}`, chest * sh * 0.4]); w.push([`upperarm_${side}`, chest * sh * 0.3]); }
  }
  if (neck > 0) w.push(['neck', neck]);
  return w;
}

// The skin you see at the neckline: neck, collarbones and the top of the chest (the bodice covers the rest)
export function buildChestSkin() {
  const g = surface(96, 40, (u, v) => {
    const a = (u - 0.5) * Math.PI * 2;
    const y = lerp(0.885, 0.72, v);
    const p = torsoPoint(y, a, 0);
    // collarbones: a slight ridge
    if (Math.cos(a) > 0) {
      const cx = Math.abs(p[0]);
      const ridge = Math.max(0, 1 - Math.abs(y - (0.838 - cx * 0.12)) / 0.008) * smooth(0.012, 0.03, cx) * (1 - smooth(0.06, 0.085, cx));
      p[2] += ridge * 0.0025;
    }
    return p;
  }, { closeU: true });
  return g;
}

export function buildNeck() {
  // From inside the chest up into the head
  const pts = spline([[0, 0.84, -0.016], [0, 0.9, -0.012], [0, 0.97, -0.004], [0, 1.0, 0.0]], 24);
  return tube(pts, (t) => lerp(0.036, 0.031, smooth(0, 0.6, t)), { radial: 32, caps: false });
}

// ---------------------------------------------------------------- arms (fitted sleeves)
export function armPoints(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const sh = skel.get(`upperarm_${S}`).rest, el = skel.get(`forearm_${S}`).rest, wr = skel.get(`hand_${S}`).rest;
  return { sh, el, wr };
}

export function buildArm(skel, side) {
  const { sh, el, wr } = armPoints(skel, side);
  const start = sh.clone().add(new THREE.Vector3(-side * 0.035, 0.012, 0));
  const pts = [];
  const ctrl = [start, sh, el, wr.clone().add(wr.clone().sub(el).normalize().multiplyScalar(0.012))];
  // Dense samples, extra dense near the elbow
  const segs = 70;
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  for (let i = 0; i <= segs; i++) pts.push(curve.getPointAt(i / segs).toArray());
  const total = curve.getLength();
  const elbowT = (start.distanceTo(sh) + sh.distanceTo(el)) / total;
  const radius = (t, a) => {
    // shoulder cap -> upper arm -> elbow -> forearm -> wrist
    let r;
    if (t < 0.12) r = lerp(0.044, 0.041, t / 0.12);
    else if (t < elbowT) r = lerp(0.041, 0.03, smooth(0.12, elbowT, t));
    else r = lerp(0.03, 0.0225, smooth(elbowT, 1, t));
    // Forearm is a little flatter
    const flat = t > elbowT ? 0.88 : 0.96;
    return [r, r * flat];
  };
  const g = tube(pts, radius, { radial: 36, caps: false, up: [0, 0, 1] });
  return g;
}

export function armWeights(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const { wr } = armPoints(skel, side);
  const end = wr.clone().add(new THREE.Vector3(Math.sin(ARM_ANGLE) * side, -Math.cos(ARM_ANGLE), 0).multiplyScalar(0.1));
  return (p) => {
    const w = chainWeights(skel, [`upperarm_${S}`, `forearm_${S}`, `hand_${S}`], end, p, 0.022);
    // The top of the shoulder leans on the chest
    const sh = skel.get(`upperarm_${S}`).rest;
    const inward = (sh.x - p.x) * side; // how far toward the body from the shoulder joint
    const k = smooth(-0.015, 0.03, inward);
    if (k > 0) {
      for (const e of w) e[1] *= 1 - k * 0.6;
      w.push(['chest', k * 0.45], [`clavicle_${S}`, k * 0.15]);
    }
    return w;
  };
}

// ---------------------------------------------------------------- hands
// The palm is a rounded slab; each finger is a tapered tube through its three bones with a rounded tip.
export function buildHand(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const wr = skel.get(`hand_${S}`).rest;
  const d = new THREE.Vector3(Math.sin(ARM_ANGLE) * side, -Math.cos(ARM_ANGLE), 0);
  const n = new THREE.Vector3(-Math.cos(ARM_ANGLE) * side, -Math.sin(ARM_ANGLE), 0); // palm normal
  const fwd = new THREE.Vector3(0, 0, 1);
  const parts = [];
  // Palm: a superellipsoid box in (d, fwd, n) axes
  const palm = blob(40, 28, (dir) => {
    const e = 3.2;
    const k = Math.pow(Math.pow(Math.abs(dir[0]), e) + Math.pow(Math.abs(dir[1]), e) + Math.pow(Math.abs(dir[2]), e), -1 / e);
    return [dir[0] * k, dir[1] * k, dir[2] * k];
  });
  // Local axes: x -> along the hand (d), y -> across (fwd), z -> thickness (n)
  palm.deform((p) => {
    const along = p.y * 0.026 + 0.022; // blob's y is our "along"
    const across = p.z * 0.022 * (1 + 0.12 * (p.y + 1) / 2);
    const thick = p.x * 0.0105 * (1 - 0.15 * (p.y + 1) / 2);
    const q = wr.clone().addScaledVector(d, along).addScaledVector(fwd, across).addScaledVector(n, thick - 0.001);
    // Slight cup: the palm side is hollow in the middle
    const cup = Math.max(0, 1 - (p.y * p.y + p.z * p.z)) * (p.x > 0 ? 0.003 : 0);
    q.addScaledVector(n, -cup);
    p.copy(q);
  });
  palm.tag({ finger: -1 });
  parts.push(palm);

  const fingerR = { index: 0.0068, middle: 0.007, ring: 0.0066, pinky: 0.0057, thumb: 0.0078 };
  for (const [name, r0] of Object.entries(fingerR)) {
    const bones = [1, 2, 3].map((k) => skel.get(`${name}${k}_${S}`));
    const tip = bones[2].tipEnd;
    let startP = bones[0].rest.clone();
    if (name !== 'thumb') startP.addScaledVector(d, -0.012); else startP.addScaledVector(d, -0.004);
    const ctrl = [startP, ...bones.map((b) => b.rest), new THREE.Vector3(...tip)];
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.3);
    const pts = Array.from({ length: 41 }, (_, i) => curve.getPointAt(i / 40).toArray());
    const len = curve.getLength();
    const tipLen = 0.006;
    const g = tube(pts, (t, a) => {
      const s = t * len;
      let r = r0 * lerp(1, 0.78, t);
      // knuckle bulges
      for (const b of bones.slice(1)) {
        const bs = startP.distanceTo(bones[0].rest) + (b === bones[1] ? bones[0].rest.distanceTo(b.rest) : bones[0].rest.distanceTo(bones[1].rest) + bones[1].rest.distanceTo(b.rest));
        r *= 1 + 0.07 * Math.exp(-(((s - bs) / 0.004) ** 2));
      }
      // Round the fingertip
      const fromTip = len - s;
      if (fromTip < tipLen) r *= Math.sqrt(Math.max(0, 1 - ((tipLen - fromTip) / tipLen) ** 2));
      return [r, r * 0.86];
    }, { radial: 16, caps: false, up: n.toArray() });
    g.tag({ finger: Object.keys(fingerR).indexOf(name) });
    parts.push(g);
    // Nail: a thin plum shell on the back of the last bone
    const nailBase = new THREE.Vector3(...tip).addScaledVector(curve.getTangentAt(1), -0.0085);
    const nailDir = curve.getTangentAt(1);
    const nailN = n.clone().multiplyScalar(-1);
    if (name === 'thumb') nailN.copy(n).multiplyScalar(-0.3).add(fwd.clone().multiplyScalar(-0.2)).add(new THREE.Vector3(side * 0.9, 0, 0)).normalize();
    const nailSide = new THREE.Vector3().crossVectors(nailDir, nailN).normalize();
    nailN.crossVectors(nailSide, nailDir).normalize();
    const nail = surface(10, 10, (u, v) => {
      const x = (u - 0.5) * 2, y = v;
      const w = r0 * 0.8 * Math.sqrt(Math.max(0, 1 - Math.pow(y * 1.02, 6)));
      const q = nailBase.clone().addScaledVector(nailDir, y * 0.0085).addScaledVector(nailSide, x * w);
      q.addScaledVector(nailN, r0 * 0.86 * Math.sqrt(Math.max(0, 1 - x * x * 0.8)) + 0.00035 - 0.0003 * y * y);
      return q.toArray();
    });
    nail.tag({ finger: 10 + Object.keys(fingerR).indexOf(name) });
    parts.push(nail);
  }
  return parts;
}

export function handWeights(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const names = ['index', 'middle', 'ring', 'pinky', 'thumb'];
  return (p, i, geo) => {
    const f = geo.extra?.finger?.[i] ?? -1;
    if (f < 0) return [[`hand_${S}`, 1]];
    const name = names[f % 10];
    const bones = [`${name}1_${S}`, `${name}2_${S}`, `${name}3_${S}`];
    const tip = skel.get(bones[2]).tipEnd;
    const w = chainWeights(skel, bones, new THREE.Vector3(...tip), p, 0.0035);
    // The base of each finger blends into the palm
    const b1 = skel.get(bones[0]).rest;
    const d = p.distanceTo(b1);
    const toward = segDist(p, skel.get(`hand_${S}`).rest, b1);
    if (toward.t < 1 && d < 0.02 && f < 10) {
      const k = 1 - smooth(-0.006, 0.004, -(1 - toward.t) * skel.get(`hand_${S}`).rest.distanceTo(b1) + 0.0);
      w.push([`hand_${S}`, Math.max(0, (1 - toward.t) * 2 - 0.2)]);
    }
    return w;
  };
}

// ---------------------------------------------------------------- legs (stockings)
export function buildLeg(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const th = skel.get(`thigh_${S}`).rest, kn = skel.get(`shin_${S}`).rest, an = skel.get(`foot_${S}`).rest;
  const top = th.clone().add(new THREE.Vector3(-side * 0.012, 0.045, 0));
  const ctrl = [top, th, kn, an, an.clone().add(new THREE.Vector3(0, -0.03, 0.004))];
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const pts = Array.from({ length: 81 }, (_, i) => curve.getPointAt(i / 80).toArray());
  const L = curve.getLength();
  const kneeS = top.distanceTo(th) + th.distanceTo(kn);
  const g = tube(pts, (t, a) => {
    const s = t * L;
    const y = pts[Math.round(t * 80)][1];
    let r;
    if (y > 0.5) r = lerp(0.056, 0.064, smooth(0.5, 0.56, y));
    else if (y > 0.305) r = lerp(0.04, 0.056, smooth(0.31, 0.5, y));
    else if (y > 0.2) r = lerp(0.04, 0.043, Math.sin(((y - 0.2) / 0.105) * Math.PI));
    else r = lerp(0.027, 0.041, smooth(0.1, 0.2, y));
    // Calf muscle at the back, knee cap at the front
    const ang = a * Math.PI * 2;
    const back = -Math.cos(ang);
    const calf = y < 0.3 && y > 0.12 ? Math.max(0, back) * 0.006 * Math.sin(((y - 0.12) / 0.18) * Math.PI) : 0;
    const knee = Math.exp(-(((s - kneeS) / 0.02) ** 2)) * Math.max(0, -back) * 0.003;
    return [r + calf + knee, r * 0.96 + calf + knee];
  }, { radial: 40, caps: false, up: [0, 0, 1] });
  return g;
}

export function legWeights(skel, side) {
  const S = side > 0 ? 'L' : 'R';
  const an = skel.get(`foot_${S}`).rest;
  return (p) => {
    const w = chainWeights(skel, [`thigh_${S}`, `shin_${S}`, `foot_${S}`], an.clone().add(new THREE.Vector3(0, -0.05, 0.06)), p, 0.03);
    // Top of the thigh blends into the hips
    const k = smooth(0.49, 0.575, p.y);
    if (k > 0) { for (const e of w) e[1] *= 1 - k; w.push(['hips', k]); }
    return w;
  };
}
