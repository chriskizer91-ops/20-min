// Bake clips: run each clip's pose function over time with the spring physics, and sample every bone's local
// rotation (and the few translations and scales that move) at 30 frames a second.
import * as THREE from 'three';
import { Pose } from './pose.mjs';
import { SpringSim } from './dynamics.mjs';

export const FPS = 30;
const SUB = 2; // physics steps per frame (60 Hz)

// clip: { name, duration, loop, speed (m/s the root travels, for the physics), pose(p, t) }
export function bakeClip(skel, clip, springs, extras) {
  const sim = new SpringSim(skel, springs.chains, springs.colliders);
  const frames = Math.round(clip.duration * FPS);
  const dt = 1 / (FPS * SUB);
  const pose = new Pose(skel);
  const build = (t, travel) => {
    pose.q.forEach((q) => q.identity());
    pose.t.forEach((v) => v.set(0, 0, 0));
    pose.s.fill(1);
    pose.morph = { Blink: 0, Smile: 0, Surprise: 0, Pain: 0 };
    pose.athame = 0; pose.fire = 0;
    pose.root.set(0, 0, travel);
    clip.pose(pose, t);
  };
  const samples = [];
  const record = () => samples.push({
    q: pose.q.map((q) => q.clone()), t: pose.t.map((v) => v.clone()), s: pose.s.slice(),
    morph: { ...pose.morph }, athame: pose.athame, fire: pose.fire, W: pose.W.map((m) => m.clone()),
  });
  const speed = clip.speed ?? 0;
  if (clip.loop) {
    // Run a few cycles so the physics falls into its rhythm. Record r0 (the end of the next-to-last cycle) and
    // r1..rn over the last cycle; rn should match r0, and any difference is spread across the cycle.
    const cycles = 3;
    build(0, 0);
    sim.reset(pose);
    for (let c = 0; c < cycles; c++) {
      for (let f = 0; f < frames; f++) {
        for (let k = 0; k < SUB; k++) {
          const t = (f + (k + 1) / SUB) / FPS;
          build(t >= clip.duration - 1e-9 ? 0 : t, (c * clip.duration + t) * speed);
          sim.step(pose, dt);
        }
        if (c === cycles - 1 || (c === cycles - 2 && f === frames - 1)) { extras(pose); record(); }
      }
    }
    const n = samples.length - 1;
    for (let i = 0; i < skel.bones.length; i++) {
      if (!sim.names.has(skel.bones[i].name)) continue;
      const corr = samples[n].q[i].clone().invert().multiply(samples[0].q[i]);
      for (let f = 1; f <= n; f++) samples[f].q[i].multiply(new THREE.Quaternion().slerp(corr, f / n));
    }
  } else {
    // Let everything settle in the first pose, then play through
    build(0, 0);
    sim.reset(pose);
    for (let k = 0; k < FPS * SUB * 1.2; k++) { build(0, 0); sim.step(pose, dt); }
    for (let f = 0; f <= frames; f++) {
      if (f > 0) for (let k = 0; k < SUB; k++) {
        const t = Math.min(clip.duration, (f - 1 + (k + 1) / SUB) / FPS);
        build(t, t * speed);
        sim.step(pose, dt);
      }
      extras(pose);
      record();
    }
  }
  return { name: clip.name, duration: clip.duration, loop: !!clip.loop, samples };
}

function cloneSample(s) {
  return { q: s.q.map((q) => q.clone()), t: s.t.map((v) => v.clone()), s: s.s.slice(), morph: { ...s.morph }, athame: s.athame, fire: s.fire };
}

// Write baked clips into the GLB. boneNodes[i] is the node of bone i; faceNode gets the morph weights.
export function writeAnimations(glb, skel, baked, boneNodes, faceNode, morphNames) {
  const n = skel.bones.length;
  // Which bones move in any clip: every clip then carries a track for each (so switching clips never
  // leaves a bone where another clip put it)
  const rotMoves = new Array(n).fill(false), trMoves = new Array(n).fill(false), scMoves = new Array(n).fill(false);
  for (const c of baked) for (const s of c.samples) for (let i = 0; i < n; i++) {
    const q = s.q[i];
    if (Math.abs(q.x) + Math.abs(q.y) + Math.abs(q.z) > 1e-5) rotMoves[i] = true;
    if (s.t[i].lengthSq() > 1e-10) trMoves[i] = true;
    if (Math.abs(s.s[i] - 1) > 1e-4) scMoves[i] = true;
  }
  for (const c of baked) {
    const frames = c.samples.length;
    const times = new Float32Array(frames);
    for (let f = 0; f < frames; f++) times[f] = Math.min(c.duration, f / FPS);
    const input = glb.accessor(times, 'SCALAR', { minmax: true });
    const channels = [], samplers = [];
    const add = (node, path, values, type) => {
      samplers.push({ input, output: glb.accessor(values, type), interpolation: 'LINEAR' });
      channels.push({ sampler: samplers.length - 1, target: { node, path } });
    };
    for (let i = 0; i < n; i++) {
      const b = skel.bones[i];
      if (rotMoves[i]) {
        const v = new Float32Array(frames * 4);
        let prev = null;
        c.samples.forEach((s, f) => {
          const q = s.q[i].clone().normalize();
          if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); // keep neighbours on the same side
          v.set([q.x, q.y, q.z, q.w], f * 4);
          prev = q;
        });
        add(boneNodes[i], 'rotation', v, 'VEC4');
      }
      if (trMoves[i]) {
        const v = new Float32Array(frames * 3);
        c.samples.forEach((s, f) => v.set([b.local.x + s.t[i].x, b.local.y + s.t[i].y, b.local.z + s.t[i].z], f * 3));
        add(boneNodes[i], 'translation', v, 'VEC3');
      }
      if (scMoves[i]) {
        const v = new Float32Array(frames * 3);
        c.samples.forEach((s, f) => v.set([s.s[i], s.s[i], s.s[i]], f * 3));
        add(boneNodes[i], 'scale', v, 'VEC3');
      }
    }
    if (faceNode != null) {
      const v = new Float32Array(frames * morphNames.length);
      c.samples.forEach((s, f) => morphNames.forEach((m, k) => { v[f * morphNames.length + k] = s.morph[m] ?? 0; }));
      add(faceNode, 'weights', v, 'SCALAR');
    }
    glb.json.animations.push({ name: c.name, channels, samplers });
  }
}
