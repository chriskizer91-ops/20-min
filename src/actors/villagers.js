import * as THREE from 'three';
import { toon, part, joint, sphere, cyl, cone, lathe, skirt, blobShadow, glowSprite, onLayer, Spring, turnToward } from './kit.js';

// The three friends in the square, from LORE.md in Follow Me Down Witch Way:
// Hilde the blacksmith at her anvil, Agnes Grimsby (a kindly ghost, always knitting) by the chapel,
// and Inkblot, Mister Quill's crow, who hops about and flies off if you crowd him.

// ---------------------------------------------------------------- Hilde
export function createHilde() {
  const C = { skin: '#e2a07c', braid: '#c8612e', tunic: '#5f7446', apron: '#6b4428', trousers: '#4a3a2e', boot: '#2e2320', iron: '#3b3d48', wood: '#7a5230', soot: '#3a2a2a' };
  const root = new THREE.Group();
  root.name = 'hilde';
  const body = joint(root);
  for (const side of [-1, 1]) {
    const hip = joint(body, [side * 0.09, 0.32, 0]);
    part(hip, cyl(0.06, 0.055, 0.24, 8), toon(C.trousers), { pos: [0, -0.12, 0] });
    part(hip, sphere(0.07, 10, 7), toon(C.boot), { pos: [0, -0.27, 0.03], scale: [1, 0.7, 1.4] });
  }
  const torso = joint(body, [0, 0.34, 0]);
  part(torso, cyl(0.19, 0.17, 0.42, 12), toon(C.tunic), { pos: [0, 0.2, 0] });
  part(torso, new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(C.tunic), { pos: [0, 0.4, 0], scale: [1, 0.45, 0.9] });
  // Leather apron, hanging to the knees
  part(torso, skirt({ top: 0.195, bottom: 0.215, height: 0.52, flare: 1, points: 10, zig: 0.01, gap: Math.PI * 1.1 }), toon(C.apron, { side: THREE.DoubleSide }), { pos: [0, 0.4, 0.005] });
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.22, 0.36, 0]);
    shoulder.rotation.z = side * 0.18;
    part(shoulder, cyl(0.065, 0.06, 0.15, 8), toon(C.tunic), { pos: [0, -0.07, 0] });
    const elbow = joint(shoulder, [0, -0.15, 0]);
    part(elbow, cyl(0.055, 0.05, 0.15, 8), toon(C.skin), { pos: [0, -0.07, 0] });
    const hand = part(elbow, sphere(0.055, 8, 6), toon(C.skin), { pos: [0, -0.17, 0] });
    return { shoulder, elbow, hand };
  });
  // Hammer in her right hand
  const hammer = joint(arms[1].hand, [0, 0, 0]);
  part(hammer, cyl(0.018, 0.018, 0.34, 6), toon(C.wood), { pos: [0, 0, 0.12], rot: [Math.PI / 2, 0, 0] });
  part(hammer, cyl(0.045, 0.045, 0.16, 8), toon(C.iron), { pos: [0, 0, 0.28], rot: [0, 0, Math.PI / 2] });
  const neck = joint(torso, [0, 0.45, 0]);
  const head = joint(neck, [0, 0.15, 0]);
  part(head, sphere(0.175, 14, 10), toon(C.skin), { scale: [1, 0.95, 0.95] });
  part(head, new THREE.SphereGeometry(0.185, 14, 8, 0, Math.PI * 2, 0, 1.25), toon(C.braid), { pos: [0, 0.01, -0.01] });
  part(head, new THREE.TorusGeometry(0.15, 0.045, 6, 16), toon(C.braid), { pos: [0, 0.1, -0.01], rot: [Math.PI / 2 + 0.15, 0, 0] });
  for (const side of [-1, 1]) {
    part(head, sphere(0.024, 6, 5), toon('#2a1a1a'), { pos: [side * 0.062, -0.01, 0.155], scale: [1, 1.3, 0.5], ink: false });
    part(head, sphere(0.03, 6, 5), toon('#e0786a'), { pos: [side * 0.1, -0.06, 0.13], scale: [1, 0.6, 0.4], ink: false });
  }
  part(head, sphere(0.018, 6, 5), toon(C.soot), { pos: [0.01, -0.04, 0.172], scale: [1.4, 0.8, 0.5], ink: false });
  root.add(blobShadow(0.36, 0.5));
  onLayer(root);

  let t = Math.random(), mode = 'work', faceTo = null, swing = 0, laugh = 0;
  const events = { strike: null };
  return {
    root, head, name: 'Hilde', height: 1.3, radius: 0.3, portrait: 'hilde', voice: 3,
    events,
    lookAt(angle) { faceTo = angle; mode = angle === null ? 'work' : 'talk'; },
    laugh() { laugh = 1.2; },
    update(dt, workHeading) {
      t += dt;
      const target = mode === 'talk' && faceTo !== null ? faceTo : workHeading;
      root.rotation.y = turnToward(root.rotation.y, target, 8, dt);
      if (mode === 'work') {
        // Four blows (raise the hammer slowly, bring it down fast), then a breather, and again.
        const cycle = 1.1, blows = 4, rest = 3.2, round = cycle * blows + rest;
        const r = t % round, p = r < cycle * blows ? (r % cycle) / cycle : 1;
        const prev = swing;
        swing = p < 0.55 ? THREE.MathUtils.smoothstep(p, 0, 0.55) : p < 0.66 ? 1 - (p - 0.55) / 0.11 : 0;
        if (prev > 0.2 && swing === 0) events.strike?.();
        arms[1].shoulder.rotation.x = -0.5 - swing * 2.1;
        arms[1].elbow.rotation.x = -0.9 + swing * 0.5;
        arms[0].shoulder.rotation.x = -0.6;
        arms[0].elbow.rotation.x = -0.8;
        torso.rotation.x = 0.15 - swing * 0.12;
      } else {
        arms[1].shoulder.rotation.x += (-0.2 - arms[1].shoulder.rotation.x) * 0.15;
        arms[1].elbow.rotation.x += (-0.6 - arms[1].elbow.rotation.x) * 0.15;
        arms[0].shoulder.rotation.x += (0.1 - arms[0].shoulder.rotation.x) * 0.15;
        arms[0].shoulder.rotation.z = -0.18 - Math.max(0, laugh) * 0.4;
        torso.rotation.x += (0 - torso.rotation.x) * 0.15;
      }
      laugh -= dt;
      const shake = laugh > 0 ? Math.sin(t * 30) * 0.03 : 0;
      body.position.y = Math.sin(t * 2) * 0.006 + Math.abs(shake);
      head.rotation.z = shake;
    },
  };
}

// ---------------------------------------------------------------- Agnes
export function createAgnes() {
  const C = { ghost: '#cfeff0', shawl: '#9fd6de', dark: '#4f7f8a', glow: '#8fe8f0', yarn: '#f0b8c8' };
  const ghost = (color, extra = {}) => toon(color, { transparent: true, opacity: 0.82, emissive: new THREE.Color('#2f6f7a'), emissiveIntensity: 0.6, ...extra });
  const root = new THREE.Group();
  root.name = 'agnes';
  const float = joint(root, [0, 0.28, 0]);
  // A plump body that trails away into a wisp instead of legs
  const body = part(float, lathe([[0.001, 0.62], [0.16, 0.6], [0.24, 0.45], [0.25, 0.25], [0.19, 0.08], [0.1, -0.05], [0.05, -0.15], [0.001, -0.2]].reverse(), 14), ghost(C.ghost));
  part(float, skirt({ top: 0.17, bottom: 0.27, height: 0.26, flare: 0.8, points: 14, zig: 0.02 }), ghost(C.shawl, { side: THREE.DoubleSide }), { pos: [0, 0.6, 0] });
  const tail = joint(float, [0, -0.15, -0.02]);
  part(tail, cone(0.06, 0.2, 8), ghost(C.ghost), { pos: [0, -0.08, -0.03], rot: [Math.PI + 0.6, 0, 0] });
  // Arms, knitting
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(float, [side * 0.2, 0.52, 0.02]);
    shoulder.rotation.set(-0.9, 0, side * 0.35);
    part(shoulder, cyl(0.04, 0.05, 0.2, 7), ghost(C.shawl), { pos: [0, -0.09, 0] });
    const hand = part(shoulder, sphere(0.045, 8, 6), ghost(C.ghost), { pos: [0, -0.2, 0] });
    part(hand, cyl(0.006, 0.006, 0.2, 4), toon('#e8e2c8'), { pos: [-side * 0.04, 0.02, 0.06], rot: [0.9, 0, side * 0.9], ink: false });
    return shoulder;
  });
  part(float, sphere(0.07, 8, 6), toon(C.yarn, { emissive: new THREE.Color('#5a2a3a') }), { pos: [0, 0.3, 0.22] });
  // Head: a bun with a needle through it, round spectacles
  const head = joint(float, [0, 0.8, 0]);
  part(head, sphere(0.17, 14, 10), ghost(C.ghost), { scale: [1, 0.95, 0.95] });
  part(head, new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, 1.3), ghost('#e8fbfb'), { pos: [0, 0.01, -0.01] });
  part(head, sphere(0.085, 10, 8), ghost('#e8fbfb'), { pos: [0, 0.17, -0.04] });
  part(head, cyl(0.006, 0.006, 0.26, 4), toon('#d9c78a'), { pos: [0, 0.2, -0.04], rot: [0, 0, 1.2], ink: false });
  for (const side of [-1, 1]) {
    part(head, sphere(0.02, 6, 5), toon(C.dark), { pos: [side * 0.058, -0.01, 0.155], scale: [1, 1.2, 0.5], ink: false });
    part(head, new THREE.TorusGeometry(0.036, 0.006, 4, 12), toon('#d9c78a'), { pos: [side * 0.058, -0.008, 0.165], ink: false });
  }
  const aura = glowSprite(C.glow, 1.3, 0.35);
  aura.position.y = 0.75;
  root.add(aura);
  const light = new THREE.PointLight(C.glow, 0.8, 2.5, 2);
  light.position.y = 0.8;
  root.add(light);
  root.add(blobShadow(0.26, 0.25));
  onLayer(root);

  let t = Math.random() * 10, faceTo = null;
  return {
    root, head, name: 'Agnes', height: 1.3, radius: 0.28, portrait: 'agnes', voice: 4,
    lookAt(angle) { faceTo = angle; },
    update(dt, restHeading) {
      t += dt;
      float.position.y = 0.28 + Math.sin(t * 1.6) * 0.06;
      float.rotation.z = Math.sin(t * 0.9) * 0.04;
      tail.rotation.x = Math.sin(t * 2.4) * 0.3;
      tail.rotation.z = Math.cos(t * 1.7) * 0.25;
      arms[0].rotation.x = -0.9 + Math.sin(t * 9) * 0.12;
      arms[1].rotation.x = -0.9 - Math.sin(t * 9) * 0.12;
      head.rotation.z = Math.sin(t * 0.7) * 0.06;
      root.rotation.y = turnToward(root.rotation.y, faceTo ?? restHeading, 5, dt);
      aura.material.opacity = 0.3 + Math.sin(t * 2.1) * 0.06;
      body.material.opacity = 0.78 + Math.sin(t * 1.3) * 0.06;
    },
  };
}

// ---------------------------------------------------------------- Inkblot
export function createCrow() {
  const C = { feather: '#221a38', sheen: '#3b2d66', beak: '#57515e', eye: '#ffb020', leg: '#3a3440', ring: '#d9b45a' };
  const root = new THREE.Group();
  root.name = 'inkblot';
  const body = joint(root, [0, 0.19, 0]);
  part(body, sphere(0.1, 10, 8), toon(C.feather), { scale: [0.85, 0.8, 1.3] });
  const head = joint(body, [0, 0.07, 0.1]);
  part(head, sphere(0.065, 10, 8), toon(C.feather));
  part(head, cone(0.022, 0.08, 6), toon(C.beak), { pos: [0, -0.01, 0.08], rot: [Math.PI / 2, 0, 0] });
  for (const side of [-1, 1]) part(head, sphere(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: C.eye }), { pos: [side * 0.045, 0.015, 0.035], ink: false });
  const wings = [-1, 1].map((side) => {
    const w = joint(body, [side * 0.07, 0.03, 0.01]);
    part(w, sphere(0.08, 8, 6), toon(C.sheen), { pos: [side * 0.02, -0.01, -0.03], scale: [0.25, 0.7, 1.4] });
    return w;
  });
  // Tail with the famous gap where a feather is missing
  const tail = joint(body, [0, 0.01, -0.12]);
  for (const x of [-0.035, 0.035]) part(tail, sphere(0.05, 6, 5), toon(C.feather), { pos: [x, 0, -0.06], scale: [0.4, 0.15, 1.6] });
  for (const side of [-1, 1]) {
    part(body, cyl(0.007, 0.007, 0.1, 4), toon(C.leg), { pos: [side * 0.035, -0.1, 0], ink: false });
  }
  part(body, new THREE.TorusGeometry(0.012, 0.004, 4, 8), toon(C.ring), { pos: [0.035, -0.11, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  body.scale.setScalar(1.35);
  const shadow = blobShadow(0.17, 0.45);
  root.add(shadow);
  onLayer(root);

  let t = 0, flap = 0;
  return {
    root, head, body, shadow, name: 'Inkblot', height: 0.32, radius: 0.12, portrait: 'inkblot', voice: 6,
    // state: 'stand' | 'hop' | 'fly'
    update(dt, state, groundY) {
      t += dt;
      if (state === 'fly') {
        flap += dt * 22;
        for (const [i, w] of wings.entries()) w.rotation.z = (i ? -1 : 1) * (0.3 + Math.sin(flap) * 1.1);
        body.rotation.x = -0.2;
        tail.rotation.x = 0.2;
      } else {
        for (const [i, w] of wings.entries()) w.rotation.z += ((i ? -1 : 1) * 0.05 - w.rotation.z) * 0.3;
        body.rotation.x += (0 - body.rotation.x) * 0.2;
        // Peck and look about
        const peck = Math.max(0, Math.sin(t * 1.3) - 0.85) * 6;
        head.rotation.x = peck * 0.9;
        head.rotation.y = Math.sin(t * 0.8) * 0.6;
        tail.rotation.x = Math.sin(t * 3) * 0.05;
      }
      // The shadow stays on the ground under him, however high he flies.
      shadow.position.y = groundY - root.position.y + 0.01;
      const lift = Math.max(0, root.position.y - groundY);
      shadow.material.opacity = 0.45 / (1 + lift * 0.8);
    },
  };
}

export { Spring };
