import * as THREE from 'three';
import { toon, part, joint, sphere, cyl, cone, taperedTube, glowSprite, onLayer } from './kit.js';

// Herbs as small 3D plants, in full colour, so they read against the night paintings. Each has a twinkle over it
// (like FF9's glinting pick-ups) and a soft glow on the ground. createHerb(kind) returns { root, update(dt) }.
// Kinds match art/herbs: moonpetal, lavender, nightrose, chapel_moss, and a generic fallback.

const STEM = '#4f8a3c', LEAF = '#5fa34a', LEAF_DARK = '#3d6e31';

function leaf(parent, len, angle, lift, color = LEAF) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(len * 0.45, len * 0.22, len, 0);
  s.quadraticCurveTo(len * 0.45, -len * 0.22, 0, 0);
  const m = part(parent, new THREE.ShapeGeometry(s, 5), toon(color, { side: THREE.DoubleSide }), { ink: false });
  m.rotation.set(-Math.PI / 2 + lift, angle, 0);
  return m;
}

function flower(parent, { petals = 5, r = 0.05, color, center = '#ffe28a', cup = 0.35 }) {
  const f = new THREE.Group();
  for (let i = 0; i < petals; i++) {
    const p = part(f, sphere(r * 0.55, 8, 6), toon(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.25 }), { ink: false });
    const a = (i / petals) * Math.PI * 2;
    p.position.set(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6);
    p.scale.set(1.2, 0.35, 0.7);
    p.rotation.set(0, -a, cup);
  }
  part(f, sphere(r * 0.3, 6, 5), toon(center), { pos: [0, r * 0.12, 0], ink: false });
  parent.add(f);
  return f;
}

const MAKERS = {
  // Pale lilac-white flowers that glow a little: "Wickhollow's lanterns burn its oil"
  moonpetal(g) {
    for (const [x, z, h, tilt] of [[0, 0, 0.3, 0], [0.07, 0.04, 0.22, 0.3], [-0.06, 0.05, 0.25, -0.3], [0.02, -0.07, 0.18, 0.2]]) {
      const stem = joint(g, [x, 0, z]);
      stem.rotation.set(tilt * 0.6, 0, tilt);
      part(stem, cyl(0.006, 0.008, h, 5), toon(STEM), { pos: [0, h / 2, 0], ink: false });
      const head = flower(stem, { petals: 6, r: 0.055, color: '#efe6ff', center: '#fff2b0' });
      head.position.y = h;
    }
    for (let i = 0; i < 5; i++) leaf(g, 0.11, (i / 5) * Math.PI * 2, 0.35, LEAF);
    return '#e9e1ff';
  },
  // Tall purple spikes
  lavender(g) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = 0.03 + (i % 3) * 0.02, h = 0.26 + (i % 3) * 0.06;
      const stem = joint(g, [Math.cos(a) * r, 0, Math.sin(a) * r]);
      stem.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      part(stem, cyl(0.005, 0.007, h, 4), toon('#6d8f5a'), { pos: [0, h / 2, 0], ink: false });
      for (let k = 0; k < 6; k++) part(stem, sphere(0.02 - k * 0.0015, 6, 5), toon(k % 2 ? '#9a6ae0' : '#b485f0', { emissive: new THREE.Color('#5a2a9a'), emissiveIntensity: 0.3 }), { pos: [0, h - 0.1 + k * 0.022, 0], ink: false });
    }
    for (let i = 0; i < 6; i++) leaf(g, 0.09, (i / 6) * Math.PI * 2 + 0.3, 0.6, '#7fa368');
    return '#c9a8ff';
  },
  // A low rose bush with deep red blooms; it only opens under a clear moon
  nightrose(g) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const l = part(g, sphere(0.06, 7, 5), toon(i % 2 ? LEAF_DARK : '#467a38'), { pos: [Math.cos(a) * 0.08, 0.07 + (i % 3) * 0.03, Math.sin(a) * 0.08], ink: false });
      l.scale.set(1, 0.6, 1);
    }
    for (const [x, y, z] of [[0, 0.2, 0], [0.08, 0.15, 0.05], [-0.07, 0.16, -0.03]]) {
      const rose = joint(g, [x, y, z]);
      for (let k = 0; k < 3; k++) {
        const p = part(rose, sphere(0.045 - k * 0.012, 8, 6), toon(k ? '#c41f45' : '#e0344f', { emissive: new THREE.Color('#5a0018'), emissiveIntensity: 0.35 }), { pos: [0, k * 0.012, 0], ink: k === 0 });
        p.scale.set(1, 0.7, 1);
      }
    }
    return '#ff8fa8';
  },
  // A cushion of moss on an old stone, with tiny pale spores
  chapel_moss(g) {
    const stone = part(g, sphere(0.12, 8, 6), toon('#7d7a86'), { pos: [0, 0.04, 0] });
    stone.scale.set(1.2, 0.55, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, sphere(0.05, 7, 5), toon(i % 2 ? '#5fa34a' : '#79bd5c', { emissive: new THREE.Color('#1f4a14'), emissiveIntensity: 0.3 }), { pos: [Math.cos(a) * 0.09, 0.09 + Math.sin(i) * 0.01, Math.sin(a) * 0.07], scale: [1, 0.5, 1], ink: false });
    }
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      part(g, sphere(0.008, 4, 3), new THREE.MeshBasicMaterial({ color: '#e8ffd8' }), { pos: [Math.cos(a) * 0.08, 0.13, Math.sin(a) * 0.06], ink: false });
    }
    return '#b8f0a0';
  },
};

export function createHerb(kind) {
  const root = new THREE.Group();
  root.name = `herb-${kind}`;
  const plant = joint(root, [0, 0, 0]);
  const glowColor = (MAKERS[kind] ?? MAKERS.moonpetal)(plant);
  const glow = glowSprite(glowColor, 0.9, 0.45);
  glow.position.y = 0.1;
  root.add(glow);
  // The twinkle: a small four-point star that turns and pulses above the plant
  const twinkle = glowSprite('#ffffff', 0.16, 0.9);
  twinkle.position.y = 0.48;
  root.add(twinkle);
  onLayer(root);
  let t = Math.random() * 10;
  return {
    root,
    update(dt) {
      t += dt;
      plant.rotation.z = Math.sin(t * 1.3) * 0.05;
      plant.rotation.x = Math.cos(t * 1.1) * 0.04;
      glow.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.1;
      const tw = Math.max(0, Math.sin(t * 2.6));
      twinkle.material.opacity = 0.35 + tw * 0.65;
      twinkle.scale.setScalar(0.12 + tw * 0.18);
      twinkle.position.y = 0.46 + Math.sin(t * 1.4) * 0.03;
    },
  };
}
