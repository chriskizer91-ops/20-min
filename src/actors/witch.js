import * as THREE from 'three';
import { toon, part, joint, sphere, cyl, cone, lathe, skirt, blobShadow, glowSprite, onLayer, Spring } from './kit.js';

// The Moonlight Witch, built from about forty simple shapes: FF9 proportions (a big head and a bigger
// hat), a plum hat with cream horns, round glasses, a magenta shawl with a ragged hem, a black dress and
// buckled boots. Her walk is worked out in code each frame, so it keeps in step at any speed.

const C = {
  skin: '#f1c9a5', blush: '#e89a94', hair: '#6a4130', hairDark: '#4e2f24',
  hat: '#7d1c4d', hatBand: '#ecdcb8', horn: '#f1e6c8', charm: '#d9dde6', gold: '#e2bd67',
  shawl: '#a3245f', shawlInside: '#5d1438', dress: '#231a2c', stocking: '#1d1623', boot: '#3d2621',
  eye: '#2a1830', flame: '#c77dff',
};

export function createWitch() {
  const root = new THREE.Group();
  root.name = 'witch';
  const body = joint(root, [0, 0, 0], 'body'); // bobs while walking

  // Legs and boots
  const legs = [-1, 1].map((side) => {
    const hip = joint(body, [side * 0.075, 0.36, 0]);
    part(hip, cyl(0.045, 0.04, 0.27, 8), toon(C.stocking), { pos: [0, -0.14, 0] });
    part(hip, sphere(0.06, 10, 7), toon(C.boot), { pos: [0, -0.3, 0.025], scale: [1, 0.75, 1.45] });
    part(hip, cyl(0.05, 0.05, 0.02, 8), toon(C.gold), { pos: [0, -0.26, 0.03], ink: false });
    return hip;
  });

  const torso = joint(body, [0, 0.62, 0], 'torso');
  // Dress
  part(torso, skirt({ top: 0.12, bottom: 0.25, height: 0.42, flare: 0.7, points: 16, zig: 0.025 }), toon(C.dress, { side: THREE.DoubleSide }), { pos: [0, 0.02, 0] });
  part(torso, cyl(0.11, 0.125, 0.24, 10), toon(C.dress), { pos: [0, 0.12, 0] });
  part(torso, sphere(0.02, 6, 5), toon(C.gold), { pos: [0, 0.16, 0.115], ink: false });
  // Shawl: open at the front, with a ragged hem that sways
  const shawlPivot = joint(torso, [0, 0.25, 0]);
  const shawl = part(shawlPivot, skirt({ top: 0.14, bottom: 0.3, height: 0.56, flare: 0.8, points: 18, zig: 0.05, gap: 1.0 }), toon(C.shawl, { side: THREE.FrontSide }), {});
  part(shawl, skirt({ top: 0.135, bottom: 0.29, height: 0.55, flare: 0.8, points: 18, zig: 0.05, gap: 1.0 }), toon(C.shawlInside, { side: THREE.BackSide }), { ink: false });
  part(shawlPivot, sphere(0.17, 12, 6), toon(C.shawl), { pos: [0, -0.02, -0.01], scale: [1, 0.45, 0.92] });

  // Arms: a sleeve that widens into a bell, and a hand
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.15, 0.2, 0]);
    shoulder.rotation.z = side * 0.22;
    part(shoulder, cyl(0.045, 0.055, 0.17, 8), toon(C.shawl), { pos: [0, -0.08, 0] });
    const elbow = joint(shoulder, [0, -0.16, 0]);
    part(elbow, cyl(0.055, 0.085, 0.15, 8), toon(C.shawl, { side: THREE.DoubleSide }), { pos: [0, -0.07, 0] });
    const hand = part(elbow, sphere(0.042, 8, 6), toon(C.skin), { pos: [0, -0.17, 0] });
    return { shoulder, elbow, hand };
  });

  // Witchfire, a violet flame held in her left hand
  const fire = new THREE.Group();
  fire.position.set(0, -0.06, 0.03);
  arms[0].hand.add(fire);
  const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: '#f3d4ff' }));
  fire.add(flame);
  const flameGlow = glowSprite(C.flame, 0.24, 0.7);
  fire.add(flameGlow);
  const fireLight = new THREE.PointLight(C.flame, 0.9, 2.2, 2);
  fire.add(fireLight);

  // Head
  const neck = joint(torso, [0, 0.27, 0], 'neck');
  const head = joint(neck, [0, 0.16, 0], 'head');
  part(head, sphere(0.19, 14, 11), toon(C.skin), { scale: [1, 0.95, 0.95] });
  // Face: eyes behind round glasses, cheeks
  for (const side of [-1, 1]) {
    part(head, sphere(0.03, 8, 6), toon(C.eye), { pos: [side * 0.068, -0.01, 0.162], scale: [1.05, 1.5, 0.55], ink: false });
    part(head, sphere(0.009, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), { pos: [side * 0.06 + 0.01, 0.012, 0.178], ink: false });
    part(head, new THREE.TorusGeometry(0.045, 0.007, 4, 14), toon(C.gold), { pos: [side * 0.066, -0.002, 0.182], ink: false });
    part(head, sphere(0.026, 6, 5), toon(C.blush), { pos: [side * 0.11, -0.06, 0.14], scale: [1, 0.6, 0.4], ink: false });
  }
  part(head, cyl(0.004, 0.004, 0.04, 4), toon(C.gold), { pos: [0, 0.002, 0.19], rot: [0, 0, Math.PI / 2], ink: false });
  // Hair: a cap that leaves the face open, bangs, and a long wavy fall down the back
  part(head, new THREE.SphereGeometry(0.205, 14, 10, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8), toon(C.hair, { side: THREE.DoubleSide }), { pos: [0, 0.01, -0.005] });
  part(head, new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, 0.9), toon(C.hair), { pos: [0, 0.02, 0.01] });
  const hairFall = joint(head, [0, 0.02, -0.08], 'hairFall');
  part(hairFall, lathe([[0.001, 0.02], [0.16, -0.05], [0.2, -0.3], [0.19, -0.5], [0.12, -0.6], [0.001, -0.61]].reverse(), 10), toon(C.hairDark), { scale: [1, 1, 0.5], pos: [0, 0, -0.04] });

  // Hat: drooping brim, cream band and horns, and a crooked cone in three joints so the tip can swing
  const hat = joint(head, [0, 0.14, -0.035], 'hat');
  hat.rotation.x = -0.3;
  part(hat, lathe([[0.001, 0.012], [0.19, 0.012], [0.3, -0.008], [0.335, -0.04], [0.325, -0.05], [0.19, -0.01], [0.001, -0.01]].reverse(), 16), toon(C.hat));
  part(hat, cyl(0.2, 0.205, 0.07, 14), toon(C.hatBand), { pos: [0, 0.045, 0] });
  for (const side of [-1, 1]) {
    const horn = part(hat, new THREE.TorusGeometry(0.06, 0.02, 5, 8, Math.PI * 0.85), toon(C.horn), { pos: [side * 0.2, 0.07, 0.02] });
    horn.rotation.set(0, side > 0 ? 0 : Math.PI, 0.3);
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i - 2) * 0.32;
    part(hat, sphere(0.014, 5, 4), toon(i === 2 ? C.gold : C.charm), { pos: [Math.cos(a) * 0.205, 0.02, Math.sin(a) * 0.205], ink: false });
  }
  const cone1 = joint(hat, [0, 0.08, 0]);
  part(cone1, cyl(0.135, 0.19, 0.2, 12), toon(C.hat), { pos: [0, 0.1, 0] });
  const cone2 = joint(cone1, [0, 0.2, 0]);
  cone2.rotation.x = -0.35;
  part(cone2, cyl(0.075, 0.135, 0.18, 10), toon(C.hat), { pos: [0, 0.09, 0] });
  const cone3 = joint(cone2, [0, 0.18, 0]);
  cone3.rotation.x = -0.55;
  part(cone3, cone(0.075, 0.2, 8), toon(C.hat), { pos: [0, 0.1, 0] });

  const shadow = blobShadow(0.3, 0.5);
  root.add(shadow);
  onLayer(root);

  // ---- animation ----
  const hatSwing = new Spring(55, 6), hatSide = new Spring(55, 6), hairSwing = new Spring(30, 5), shawlSwing = new Spring(40, 6);
  let phase = 0, time = 0, look = 0, lookTarget = 0, nextLook = 2, blinkT = 3;
  const eyes = head.children.filter((m) => m.geometry?.parameters?.radius === 0.03);

  return {
    root, head, fire,
    height: 1.62,
    radius: 0.2,
    // speed: meters per second she's moving; turn: how fast she's turning (for the hat to lean into)
    update(dt, speed, turn = 0) {
      time += dt;
      const moving = Math.min(1, speed / 2);
      phase += (speed * dt) / 0.55 * Math.PI;
      const s = Math.sin(phase);
      for (const [i, hip] of legs.entries()) hip.rotation.x = (i ? -s : s) * 0.65 * moving;
      for (const [i, arm] of arms.entries()) {
        arm.shoulder.rotation.x = (i ? s : -s) * 0.55 * moving + (i === 0 ? -0.35 * (1 - moving) : 0);
        arm.elbow.rotation.x = -0.25 - 0.3 * moving - (i === 0 ? 0.55 * (1 - moving) : 0);
      }
      body.position.y = Math.abs(Math.cos(phase)) * 0.035 * moving + Math.sin(time * 2.2) * 0.004 * (1 - moving);
      torso.rotation.x = 0.1 * moving;
      torso.rotation.y = s * 0.08 * moving;
      head.rotation.x = -0.06 * moving;
      // Idle: look around now and then, and blink
      if ((nextLook -= dt) < 0) { lookTarget = moving > 0.1 ? 0 : (Math.random() - 0.5) * 1.1; nextLook = 1.5 + Math.random() * 3; }
      look += (lookTarget * (1 - moving) - look) * (1 - Math.exp(-dt * 5));
      head.rotation.y = look;
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3;
      for (const e of eyes) e.scale.y = blinkT < 0.12 ? 0.15 : 1.15;
      // Secondary motion: the hat tip, hair and shawl lag behind
      const tip = hatSwing.update(0.3 * moving + Math.sin(time * 1.3) * 0.04, dt);
      cone2.rotation.x = -0.35 + tip * 0.5;
      cone3.rotation.x = -0.55 + tip * 0.9;
      const side = hatSide.update(-turn * 0.08, dt);
      cone2.rotation.z = side;
      cone3.rotation.z = side * 1.5;
      hairFall.rotation.x = hairSwing.update(0.25 * moving + s * 0.05 * moving, dt);
      shawlPivot.rotation.x = -shawlSwing.update(0.18 * moving, dt) * 0.5;
      shawl.rotation.y = s * 0.05 * moving;
      // Witchfire flickers
      const flick = 0.85 + Math.sin(time * 17) * 0.08 + Math.sin(time * 29) * 0.07;
      flame.scale.setScalar(flick);
      flameGlow.material.opacity = 0.55 * flick;
      fireLight.intensity = 0.9 * flick;
    },
  };
}
