// Poses: a rotation (and optional offset/scale) per bone, forward kinematics, two-bone leg IK, and helpers for
// posing arms, hands and the spine with angles about the model's own axes (every bone rests unrotated).
import * as THREE from 'three';
import { ARM_ANGLE } from '../model/skeleton.mjs';

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();

export class Pose {
  constructor(skel) {
    this.skel = skel;
    const n = skel.bones.length;
    this.q = Array.from({ length: n }, () => new THREE.Quaternion());
    this.t = Array.from({ length: n }, () => new THREE.Vector3());
    this.s = new Array(n).fill(1);
    this.morph = { Blink: 0, Smile: 0, Surprise: 0, Pain: 0 };
    this.athame = 0; // 0 sheathed, 1 in her right hand
    this.fire = 0; // witchfire size (0 = out)
    this.root = new THREE.Vector3(); // where the root is in the world (for the physics)
    this.rootYaw = 0;
    this.W = null;
  }
  i(name) { return this.skel.get(name).index; }
  // Rotate a bone about an axis given in its rest frame (= the model's axes), after what it already has.
  rot(name, axis, angle) {
    if (!angle) return this;
    const i = this.i(name);
    _q.setFromAxisAngle(axis instanceof THREE.Vector3 ? axis.clone().normalize() : new THREE.Vector3(...axis).normalize(), angle);
    this.q[i].premultiply(_q);
    return this;
  }
  // Rotate about the bone's own (already rotated) axis
  rotLocal(name, axis, angle) {
    if (!angle) return this;
    const i = this.i(name);
    _q.setFromAxisAngle(axis instanceof THREE.Vector3 ? axis.clone().normalize() : new THREE.Vector3(...axis).normalize(), angle);
    this.q[i].multiply(_q);
    return this;
  }
  euler(name, x = 0, y = 0, z = 0) {
    // twist (y) first, then pitch (x), then roll (z)
    return this.rot(name, Y, y).rot(name, X, x).rot(name, Z, z);
  }
  move(name, x = 0, y = 0, z = 0) { this.t[this.i(name)].add(new THREE.Vector3(x, y, z)); return this; }
  setQ(name, q) { this.q[this.i(name)].copy(q); return this; }

  // ---------------------------------------------------------------- forward kinematics
  fk() {
    const bones = this.skel.bones;
    const W = this.W ?? bones.map(() => new THREE.Matrix4());
    const m = new THREE.Matrix4(), rootM = new THREE.Matrix4().compose(this.root, new THREE.Quaternion().setFromAxisAngle(Y, this.rootYaw), new THREE.Vector3(1, 1, 1));
    for (const b of bones) {
      const i = b.index;
      const tr = b.local.clone().add(this.t[i]);
      const s = this.s[i];
      m.compose(tr, this.q[i], new THREE.Vector3(s, s, s));
      if (b.parent) W[i].multiplyMatrices(W[b.parent.index], m);
      else W[i].multiplyMatrices(rootM, m);
    }
    this.W = W;
    return W;
  }
  worldPos(name, out = new THREE.Vector3()) { return out.setFromMatrixPosition(this.W[this.i(name)]); }
  worldQuat(name, out = new THREE.Quaternion()) {
    const m = this.W[this.i(name)];
    const p = new THREE.Vector3(), s = new THREE.Vector3();
    m.decompose(p, out, s);
    return out;
  }
  // A rest-space point carried by a bone into the world
  carry(name, restPoint) {
    const b = this.skel.get(name);
    return new THREE.Vector3().copy(restPoint).sub(b.rest).applyMatrix4(this.W[b.index]);
  }

  // ---------------------------------------------------------------- legs: two-bone IK
  // ankle: world target; footQ: world rotation for the foot; kneeDir: world hint for where the knee points.
  legIK(side, ankle, footQ, kneeDir = null) {
    const S = side > 0 ? 'L' : 'R';
    const sk = this.skel;
    const th = sk.get(`thigh_${S}`), sh = sk.get(`shin_${S}`), ft = sk.get(`foot_${S}`);
    this.fk();
    const hipsQ = this.worldQuat('hips');
    const H = this.worldPos(`thigh_${S}`);
    const L1 = sh.rest.distanceTo(th.rest), L2 = ft.rest.distanceTo(sh.rest);
    const D = ankle.clone().sub(H);
    let dist = D.length();
    dist = Math.min(dist, (L1 + L2) * 0.9995);
    dist = Math.max(dist, Math.abs(L1 - L2) + 1e-4);
    const Dn = D.clone().normalize();
    const pole = (kneeDir ?? Z.clone().applyQuaternion(hipsQ)).clone();
    const P = pole.sub(Dn.clone().multiplyScalar(pole.dot(Dn))).normalize();
    const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const K = H.clone().addScaledVector(Dn, L1 * cosA).addScaledVector(P, L1 * sinA);
    const A = H.clone().addScaledVector(Dn, dist);
    const u1 = K.clone().sub(H).normalize(), u2 = A.clone().sub(K).normalize();
    const hinge = new THREE.Vector3().crossVectors(P, Dn).normalize();
    const r1 = sh.rest.clone().sub(th.rest).normalize(), r2 = ft.rest.clone().sub(sh.rest).normalize();
    const Q1 = frameRot(r1, X, u1, hinge), Q2 = frameRot(r2, X, u2, hinge);
    this.q[th.index].copy(hipsQ.clone().invert().multiply(Q1));
    this.q[sh.index].copy(Q1.clone().invert().multiply(Q2));
    this.q[ft.index].copy(Q2.clone().invert().multiply(footQ));
    return { knee: K, reach: D.length() / (L1 + L2) };
  }

  // ---------------------------------------------------------------- arms and hands
  // Shoulder: raise (out to the side, from the rest angle), forward (swing forward), twist (about the arm)
  shoulder(side, { raise = 0, forward = 0, twist = 0, back = 0 } = {}) {
    const S = side > 0 ? 'L' : 'R';
    const d = armDir(side);
    return this.rotLocal(`upperarm_${S}`, d, twist * side).rot(`upperarm_${S}`, Z, side * raise).rot(`upperarm_${S}`, X, -forward + back);
  }
  clavicle(side, { up = 0, forward = 0 } = {}) {
    const S = side > 0 ? 'L' : 'R';
    return this.rot(`clavicle_${S}`, Z, side * up).rot(`clavicle_${S}`, Y, -side * forward);
  }
  // Elbow: bend brings the forearm forward and up; twist turns the palm (positive: palm forward)
  elbow(side, bend = 0, twist = 0) {
    const S = side > 0 ? 'L' : 'R';
    const d = armDir(side);
    const k = new THREE.Vector3().crossVectors(d, Z).normalize();
    return this.rotLocal(`forearm_${S}`, d, -twist * side).rot(`forearm_${S}`, k, bend);
  }
  // Wrist: flex bends the hand toward the palm; tilt bends it toward the thumb
  wrist(side, flex = 0, tilt = 0) {
    const S = side > 0 ? 'L' : 'R';
    const d = armDir(side), n = palmNormal(side);
    const k = new THREE.Vector3().crossVectors(d, n).normalize();
    return this.rot(`hand_${S}`, k, flex).rot(`hand_${S}`, n, tilt * side);
  }
  // Fingers: curl per joint (radians) for index, middle, ring, pinky; thumb curl and how far it swings across
  hand(side, { curl = [0.2, 0.25, 0.15], fingers = null, thumb = [0.2, 0.2, 0.1], spread = 0 } = {}) {
    const S = side > 0 ? 'L' : 'R';
    const d = armDir(side), n = palmNormal(side);
    const k = new THREE.Vector3().crossVectors(d, n).normalize();
    const names = ['index', 'middle', 'ring', 'pinky'];
    names.forEach((f, fi) => {
      const c = fingers?.[fi] ?? curl;
      for (let j = 0; j < 3; j++) this.rot(`${f}${j + 1}_${S}`, k, c[j] * (1 + (fi === 3 ? 0.1 : 0)));
      if (spread) this.rot(`${f}1_${S}`, n, spread * (fi - 1.5) * 0.12 * side);
    });
    // Thumb: curls toward the palm and across it
    const tb = this.skel.get(`thumb1_${S}`), t2 = this.skel.get(`thumb2_${S}`);
    const td = t2.rest.clone().sub(tb.rest).normalize();
    const tk = new THREE.Vector3().crossVectors(td, n).normalize();
    this.rot(`thumb1_${S}`, d, -side * thumb[0] * 0.8).rot(`thumb1_${S}`, tk, thumb[0] * 0.5);
    this.rot(`thumb2_${S}`, tk, thumb[1]);
    this.rot(`thumb3_${S}`, tk, thumb[2]);
    return this;
  }
}

export function armDir(side) { return new THREE.Vector3(Math.sin(ARM_ANGLE) * side, -Math.cos(ARM_ANGLE), 0); }
export function palmNormal(side) { return new THREE.Vector3(-Math.cos(ARM_ANGLE) * side, -Math.sin(ARM_ANGLE), 0); }

// Rotation taking a rest frame (dir a, side axis sa) to a new one (dir b, side axis sb)
export function frameRot(a, sa, b, sb) {
  const x0 = sa.clone().sub(a.clone().multiplyScalar(sa.dot(a))).normalize();
  const z0 = new THREE.Vector3().crossVectors(x0, a);
  const x1 = sb.clone().sub(b.clone().multiplyScalar(sb.dot(b))).normalize();
  const z1 = new THREE.Vector3().crossVectors(x1, b);
  const M0 = new THREE.Matrix4().makeBasis(x0, a, z0), M1 = new THREE.Matrix4().makeBasis(x1, b, z1);
  return new THREE.Quaternion().setFromRotationMatrix(M1.multiply(M0.transpose()));
}

export const HAND = {
  relaxed: { curl: [0.28, 0.35, 0.22], thumb: [0.25, 0.2, 0.15] },
  soft: { curl: [0.15, 0.2, 0.12], thumb: [0.15, 0.1, 0.08] },
  open: { curl: [0.03, 0.05, 0.03], thumb: [0.05, 0.0, 0.0], spread: 1.2 },
  cup: { curl: [0.25, 0.3, 0.2], thumb: [0.1, 0.1, 0.05], spread: 0.6 },
  fist: { curl: [1.35, 1.5, 0.9], thumb: [0.7, 0.6, 0.5] },
  grip: { curl: [1.2, 1.35, 0.85], thumb: [0.6, 0.5, 0.35] },
  pinch: { fingers: [[0.6, 0.7, 0.5], [0.9, 1.1, 0.7], [1.1, 1.3, 0.8], [1.2, 1.3, 0.8]], thumb: [0.6, 0.4, 0.3] },
  point: { fingers: [[0.0, 0.05, 0.03], [1.3, 1.5, 0.9], [1.35, 1.5, 0.9], [1.4, 1.5, 0.9]], thumb: [0.6, 0.5, 0.4] },
};

export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const bell = (a, b, x) => Math.sin(Math.PI * Math.max(0, Math.min(1, (x - a) / (b - a))));
export const lerp = (a, b, t) => a + (b - a) * t;
// Hold a value 0..1 between in/out ramps
export const env = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
