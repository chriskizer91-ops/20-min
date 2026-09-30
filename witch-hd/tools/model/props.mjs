// Things she carries: the silver athame (sheathed on her right hip, drawn into her right hand during actions),
// its leather sheath, and the violet witchfire that burns in her left palm when she casts.
import * as THREE from 'three';
import { Geo, surface, tube, torus, spline, sphere, lathe, smooth, lerp, slab, rng } from '../lib/geo.mjs';
import { chain, crescent, placeFacing } from './jewelry.mjs';
import { ARM_ANGLE } from './skeleton.mjs';

// ---------------------------------------------------------------- the knife, in its own frame
// Origin at the middle of the grip; +y runs to the blade's point; the blade's edges are along x.
export function buildKnife() {
  const metal = [], gold = [], grip = [];
  // Blade: a double-edged leaf with a raised spine down the middle
  const blade = surface(16, 60, (u, v) => {
    const y = lerp(0.034, 0.138, v);
    const w = 0.0095 * (1 - Math.pow(v, 1.8)) * (1 + 0.25 * Math.sin(v * Math.PI * 0.8)) + 0.0002;
    const a = u * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = c * w;
    const z = s * (0.0028 * (1 - Math.abs(c) ** 0.7)) * (1 - 0.6 * v);
    return [x, y, z];
  }, { closeU: true });
  metal.push(blade);
  // Crossguard: a gold bar curving toward the blade, with little orbs at the ends
  const guard = spline([[-0.024, 0.036, 0], [-0.012, 0.03, 0], [0, 0.029, 0], [0.012, 0.03, 0], [0.024, 0.036, 0]], 30);
  gold.push(tube(guard, (t) => 0.0032 - 0.0012 * Math.sin(t * Math.PI), { radial: 10 }));
  for (const s of [-1, 1]) gold.push(sphere(0.0038, 12, 8).move(s * 0.025, 0.037, 0));
  // Grip: wrapped leather (a spiral wrap)
  grip.push(tube([[0, -0.026, 0], [0, 0.027, 0]], (t, a) => 0.0065 + 0.0007 * Math.pow(Math.abs(Math.sin((t * 9 + a) * Math.PI)), 3), { radial: 20, caps: false, up: [1, 0, 0] }));
  // Collars and pommel: a gold crescent cradling a moonstone
  const collar = torus(0.0068, 0.0014, 20, 8);
  gold.push(collar.clone().move(0, 0.026, 0), collar.clone().move(0, -0.026, 0));
  const moonC = crescent(0.011, 0.004);
  moonC.rotate(0, 0, Math.PI);
  moonC.move(0, -0.028, 0);
  gold.push(moonC);
  const stone = sphere(0.0045, 16, 12).move(0, -0.037, 0);
  // A charm on a short chain from the pommel
  const hang = chain([[0, -0.042, 0], [0.002, -0.058, 0.002]], { link: 0.004, wire: 0.0005, detail: [10, 5] });
  const charm = crescent(0.0065, 0.0018);
  placeFacing(charm, [0.002, -0.06, 0.002], [0, 0, 1], 0.3);
  gold.push(hang, charm);
  return { metal: Geo.merge(metal), gold: Geo.merge(gold), grip: Geo.merge(grip), stone };
}

// Where the knife rests in the sheath (world), and how it sits in her right fist (world, in the rest pose).
export function knifePoses(skel) {
  const mouth = new THREE.Vector3(-0.128, 0.618, 0.05);
  const dir = new THREE.Vector3(-0.2, -1, -0.28).normalize(); // down into the sheath
  // Sheathed: blade (+y) points along dir; edges face forward/back
  const ySh = dir.clone().negate().negate(); // +y of the knife -> dir
  const xSh = new THREE.Vector3(0, 0, 1).sub(ySh.clone().multiplyScalar(ySh.z)).normalize();
  const zSh = new THREE.Vector3().crossVectors(xSh, ySh);
  const sheathed = new THREE.Matrix4().makeBasis(xSh, ySh, zSh).setPosition(mouth.clone().addScaledVector(dir, -0.03));
  // In the fist: the grip across the palm, the blade out of the thumb side, edges up and down
  const wr = skel.get('hand_R').rest;
  const d = new THREE.Vector3(-Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0);
  const n = new THREE.Vector3(Math.cos(ARM_ANGLE), -Math.sin(ARM_ANGLE), 0);
  const g = wr.clone().addScaledVector(d, 0.04).addScaledVector(n, 0.017);
  const y = new THREE.Vector3(0, 0, 1).addScaledVector(d, -0.25).normalize();
  const x = d.clone().sub(y.clone().multiplyScalar(d.dot(y))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const held = new THREE.Matrix4().makeBasis(x, y, z).setPosition(g);
  return { sheathed, held, mouth, dir };
}

export function buildSheath(poses) {
  const { mouth, dir } = poses;
  const edge = new THREE.Vector3(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z)).normalize();
  const flat = new THREE.Vector3().crossVectors(edge, dir);
  const pts = [];
  for (let i = 0; i <= 30; i++) pts.push(mouth.clone().addScaledVector(dir, (i / 30) * 0.118).toArray());
  const body = tube(pts, (t) => [0.0125 * (1 - 0.55 * t * t) + 0.001, 0.0062 * (1 - 0.4 * t)], { radial: 20, up: edge.toArray() });
  const gold = [];
  const throat = torus(0.012, 0.0018, 24, 8);
  throat.scale(1, 1, 0.55);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
  const qFix = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0).applyQuaternion(q), edge);
  throat.place(mouth.toArray(), qFix.multiply(q));
  gold.push(throat);
  const tip = mouth.clone().addScaledVector(dir, 0.118);
  gold.push(sphere(0.004, 12, 8).move(tip.x, tip.y, tip.z));
  // Two straps up to the sash
  const straps = [];
  for (const k of [0.015, 0.045]) {
    const a = mouth.clone().addScaledVector(dir, k).addScaledVector(flat, -0.004);
    const b = new THREE.Vector3(-0.115, 0.645, 0.035 - k * 0.2);
    straps.push(tube(spline([a.toArray(), a.clone().lerp(b, 0.5).add(new THREE.Vector3(-0.004, 0, 0.004)).toArray(), b.toArray()], 10), [0.0012, 0.004], { radial: 8, up: flat.toArray() }));
  }
  return { body, gold: Geo.merge(gold), straps: Geo.merge(straps) };
}

// ---------------------------------------------------------------- witchfire
// Three nested flames, twisting as they rise, violet outside and nearly white at the heart. Built upright with
// its base at the origin; the witchfire bone holds it in her left palm and keeps it upright.
export function buildWitchfire() {
  const layer = (h, w, twist, tongues, seed) => {
    const R = rng(seed);
    const phase = R() * 6;
    return surface(40, 36, (u, v) => {
      const a = u * Math.PI * 2;
      // teardrop profile: round at the bottom, drawn to a point
      const r = w * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.62 + 0.38 * v * v)), 1.0) * Math.pow(1 - v, 0.55);
      const k = 1 + 0.35 * Math.sin(a * tongues + v * twist + phase) * smooth(0.15, 0.7, v);
      const y = v * h - 0.1 * h * Math.cos(Math.PI * v) * (1 - v);
      const lean = 0.08 * h * Math.sin(v * 3 + phase) * v;
      return [Math.cos(a) * r * k + lean, y - 0.1 * h * (1 - v) * 0, Math.sin(a) * r * k];
    }, { closeU: true });
  };
  return {
    outer: layer(0.15, 0.034, 5, 3, 1),
    mid: layer(0.11, 0.024, 6, 3, 2),
    core: layer(0.07, 0.014, 7, 2, 3),
  };
}

export function witchfireAnchor(skel) {
  const wr = skel.get('hand_L').rest;
  const d = new THREE.Vector3(Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0);
  const n = new THREE.Vector3(-Math.cos(ARM_ANGLE), -Math.sin(ARM_ANGLE), 0);
  return wr.clone().addScaledVector(d, 0.04).addScaledVector(n, 0.034);
}
