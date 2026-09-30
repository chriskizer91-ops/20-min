// Which bones swing, how stiff they are, and what they bump into.
import * as THREE from 'three';
import { HEAD_CENTER } from '../model/skeleton.mjs';
import { BACK_CHAINS } from '../model/hair.mjs';
import { SKIRT_CHAINS } from '../model/clothes.mjs';
import { CAPE_BACK } from '../model/shawl.mjs';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function springSetup(skel) {
  const rest = (n) => skel.get(n).rest.clone();
  const colliders = {
    head: { type: 'sphere', bone: 'head', c: V(...HEAD_CENTER).add(V(0, 0.005, -0.01)), r: 0.15 },
    neck: { type: 'capsule', a: ['neck', rest('neck')], b: ['head', V(0, 0.99, -0.006)], r: 0.045 },
    torso: { type: 'capsule', a: ['spine', V(0, 0.66, -0.012)], b: ['chest', V(0, 0.8, -0.016)], r: 0.105 },
    hips: { type: 'capsule', a: ['hips', V(0, 0.46, 0)], b: ['hips', V(0, 0.6, 0)], r: 0.13 },
    // The skirt's bell, a little inside the cloth, in three steps
    skirtTop: { type: 'sphere', bone: 'hips', c: V(0, 0.6, -0.005), r: 0.105 },
    skirtMid: { type: 'capsule', a: ['hips', V(0, 0.44, -0.005)], b: ['hips', V(0, 0.52, -0.005)], r: 0.145 },
    skirtLow: { type: 'capsule', a: ['hips', V(0, 0.3, -0.005)], b: ['hips', V(0, 0.38, -0.005)], r: 0.175 },
  };
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    colliders[`shoulder${S}`] = { type: 'sphere', bone: `clavicle_${S}`, c: V(s * 0.1, 0.835, -0.012), r: 0.068 };
    colliders[`upperarm${S}`] = { type: 'capsule', a: [`upperarm_${S}`, rest(`upperarm_${S}`)], b: [`forearm_${S}`, rest(`forearm_${S}`)], r: 0.058 };
    colliders[`forearm${S}`] = { type: 'capsule', a: [`forearm_${S}`, rest(`forearm_${S}`)], b: [`hand_${S}`, rest(`hand_${S}`)], r: 0.05 };
    colliders[`thigh${S}`] = { type: 'capsule', a: [`thigh_${S}`, rest(`thigh_${S}`)], b: [`shin_${S}`, rest(`shin_${S}`)], r: 0.066 };
    colliders[`shin${S}`] = { type: 'capsule', a: [`shin_${S}`, rest(`shin_${S}`)], b: [`foot_${S}`, rest(`foot_${S}`)], r: 0.052 };
  }
  const legs = ['thighL', 'thighR', 'shinL', 'shinR'];
  const body = ['head', 'neck', 'torso', 'shoulderL', 'shoulderR', 'upperarmL', 'upperarmR'];
  const chains = [];
  // Hair: lags and swings, lies over her back and shoulders
  BACK_CHAINS.forEach((psi, k) => {
    const bones = [0, 1, 2, 3].map((j) => `hair_back${k}_${j}`);
    const last = rest(bones[3]);
    chains.push({ bones, tail: last.clone().add(V(Math.sin(psi) * 0.02, -0.11, Math.cos(psi) * 0.015)), stiffness: 0.55, drag: 0.28, gravity: 0.35, radius: 0.018, colliders: [...body, 'hips'] });
  });
  for (const S of ['L', 'R']) {
    const bones = [0, 1, 2].map((j) => `hair_side_${S}_${j}`);
    chains.push({ bones, tail: rest(bones[2]).add(V(0, -0.1, 0.01)), stiffness: 0.6, drag: 0.3, gravity: 0.35, radius: 0.016, colliders: [...body] });
  }
  // Skirt: holds its bell shape, swings with her hips, and gets out of the way of her legs
  for (let k = 0; k < SKIRT_CHAINS; k++) {
    const bones = [0, 1, 2].map((j) => `skirt${k}_${j}`);
    const a = (k / SKIRT_CHAINS) * Math.PI * 2;
    chains.push({ bones, tail: rest(bones[2]).add(V(Math.sin(a) * 0.035, -0.1, Math.cos(a) * 0.035)), stiffness: 1.3, drag: 0.32, gravity: 0.18, radius: 0.012, colliders: legs });
  }
  // The shawl's back and front panels
  CAPE_BACK.forEach((phi, k) => {
    const bones = [0, 1].map((j) => `cape_back${k}_${j}`);
    chains.push({ bones, tail: rest(bones[1]).add(V(Math.sin(phi) * 0.045, -0.17, Math.cos(phi) * 0.045)), stiffness: 0.9, drag: 0.3, gravity: 0.3, radius: 0.012, colliders: ['skirtTop', 'skirtMid', 'skirtLow', ...legs] });
  });
  for (const S of ['L', 'R']) {
    const bones = [0, 1].map((j) => `cape_front_${S}_${j}`);
    chains.push({ bones, tail: rest(bones[1]).add(V(0, -0.13, 0.03)), stiffness: 0.9, drag: 0.3, gravity: 0.3, radius: 0.012, colliders: ['skirtMid', 'skirtLow', ...legs] });
  }
  // Sleeve drapes: they hang from her arms, mostly by gravity
  for (const S of ['L', 'R']) {
    for (let i = 0; i < 3; i++) {
      const b = `drape_${S}_${i}`;
      chains.push({ bones: [b], tail: rest(b).add(V(0, -0.14, -0.01)), stiffness: 0.18, drag: 0.22, gravity: 1.1, radius: 0.015, colliders: ['skirtTop', 'skirtMid', 'skirtLow', ...legs] });
    }
  }
  // Hat: stiff felt, the tip nods and sways
  chains.push({ bones: ['hat_crown1', 'hat_crown2', 'hat_crown3', 'hat_crown4'], tail: skel.get('hat_crown4').tipEnd, stiffness: 2.6, drag: 0.28, gravity: 0.08, radius: 0 });
  // Charms on the hat band
  for (const b of skel.bones.filter((x) => x.name.startsWith('hat_charm'))) {
    chains.push({ bones: [b.name], tail: b.rest.clone().add(V(0, -0.02, 0.003)), stiffness: 0.08, drag: 0.18, gravity: 0.9, radius: 0 });
  }
  return { chains, colliders };
}
