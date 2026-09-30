import * as THREE from 'three';
import { toon, part, joint, cyl, sphere, lathe, glowSprite } from './kit.js';

// The witch's knife and her spell effects: the athame (sheathed on her hip, drawn into her right hand), the
// streak its blade leaves, the rune of Witch Way traced in the air, the ring of Moonlight, her sheer purple veil
// and a brew bottle. Effects that stay put in the world (the trail, the rune, the ring) live in `fx`, a group the
// scene adds next to her.

const SILVER = '#dfe3ec', GOLD = '#e2bd67', HILT = '#2a1c18', LEATHER = '#4a3025';

// ---------------------------------------------------------------- the athame
export function buildAthame(hips, wrist) {
  const sheath = joint(hips, [-0.13, 0.12, 0.05], 'sheath');
  sheath.rotation.set(0.15, 0, 0.25);
  part(sheath, cyl(0.017, 0.011, 0.14, 6), toon(LEATHER), { pos: [0, -0.07, 0] });
  part(sheath, cyl(0.02, 0.02, 0.012, 8), toon(GOLD), { pos: [0, 0, 0], ink: false });

  // The knife itself: grip below the origin, blade above, along +y
  const knife = new THREE.Group();
  knife.name = 'athame';
  part(knife, cyl(0.009, 0.011, 0.065, 8), toon(HILT), { pos: [0, -0.034, 0] });
  part(knife, sphere(0.015, 8, 6), toon(SILVER), { pos: [0, -0.072, 0] });
  part(knife, new THREE.BoxGeometry(0.06, 0.01, 0.016), toon(GOLD), { pos: [0, 0.003, 0] });
  const shape = new THREE.Shape();
  shape.moveTo(-0.012, 0);
  shape.lineTo(-0.0135, 0.085);
  shape.quadraticCurveTo(-0.008, 0.125, 0, 0.145);
  shape.quadraticCurveTo(0.008, 0.125, 0.0135, 0.085);
  shape.lineTo(0.012, 0);
  shape.lineTo(-0.012, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 });
  bladeGeo.translate(0, 0.008, -0.002);
  const blade = new THREE.Mesh(bladeGeo, new THREE.MeshToonMaterial({ color: '#cfd6e0', emissive: new THREE.Color('#6c6a9a'), emissiveIntensity: 0.35 }));
  knife.add(blade);
  const glint = glowSprite('#ffffff', 0.22, 0);
  glint.position.y = 0.12;
  knife.add(glint);
  const tip = new THREE.Object3D();
  tip.position.y = 0.15;
  knife.add(tip);
  const base = new THREE.Object3D();
  base.position.y = 0.03;
  knife.add(base);

  let drawn = false;
  const api = {
    knife, blade, glint, tip, base, sheath,
    get drawn() { return drawn; },
    // Into her right hand: grip in the fist, blade forward.
    draw() {
      if (drawn) return;
      drawn = true;
      wrist.add(knife);
      knife.position.set(0, -0.045, 0.012);
      knife.rotation.set(Math.PI / 2, 0, 0);
      glint.material.opacity = 1;
    },
    // Back in the sheath, blade down, grip showing.
    sheathe() {
      if (!drawn && knife.parent === sheath) return;
      drawn = false;
      sheath.add(knife);
      knife.position.set(0, 0.075, 0);
      knife.rotation.set(Math.PI, 0, 0);
    },
  };
  api.sheathe();
  return api;
}

// ---------------------------------------------------------------- a streak behind the blade
export class Trail {
  constructor(color = '#d8c8ff', life = 0.22) {
    this.life = life;
    this.color = new THREE.Color(color);
    this.pts = [];
    this.on = false;
    const max = 40;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(max * 6), 3));
    this.geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(max * 6), 3));
    const idx = [];
    for (let i = 0; i < max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx);
    this.max = max;
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
  }
  update(dt, a, b) {
    for (const p of this.pts) p.age += dt;
    if (this.on) this.pts.push({ a: a.clone(), b: b.clone(), age: 0 });
    this.pts = this.pts.filter((p) => p.age < this.life).slice(-this.max);
    const pos = this.geo.attributes.position, col = this.geo.attributes.color;
    this.pts.forEach((p, i) => {
      const k = 1 - p.age / this.life;
      pos.setXYZ(i * 2, p.a.x, p.a.y, p.a.z);
      pos.setXYZ(i * 2 + 1, p.b.x, p.b.y, p.b.z);
      col.setXYZ(i * 2, this.color.r * k * 0.3, this.color.g * k * 0.3, this.color.b * k * 0.3);
      col.setXYZ(i * 2 + 1, this.color.r * k, this.color.g * k, this.color.b * k);
    });
    pos.needsUpdate = col.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (this.pts.length - 1) * 6));
  }
}

// ---------------------------------------------------------------- the rune: a line through a diamond
export function buildRune() {
  const group = new THREE.Group();
  const P = (x, y) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath();
  const pts = [P(0, -0.26), P(0.19, 0), P(0, 0.26), P(-0.19, 0), P(0, -0.26), P(0, -0.38), P(0, 0.38)];
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  const geo = new THREE.TubeGeometry(path, 120, 0.013, 5, false);
  const mat = new THREE.MeshBasicMaterial({ color: '#c9b3ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Mesh(geo, mat);
  const glow = glowSprite('#b58cff', 1.3, 0);
  group.add(line, glow);
  group.visible = false;
  const total = geo.index.count;
  return {
    group,
    // progress: 0-1 how much is traced; bright: extra glow once it's done
    set(progress, bright, fade = 1) {
      group.visible = progress > 0 && fade > 0;
      geo.setDrawRange(0, Math.floor((total * Math.min(1, progress)) / 6) * 6);
      mat.opacity = fade;
      glow.material.opacity = bright * 0.8 * fade;
      line.scale.setScalar(1 + bright * 0.08);
    },
    // The point along the path at a progress, in the rune's own space (for her hand to follow)
    at(progress) { return path.getPointAt(Math.min(1, Math.max(0, progress))); },
  };
}

// ---------------------------------------------------------------- the ring of Moonlight
export function buildMoonRing() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: '#e6ecff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#8f9cff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.2 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.005;
  const column = glowSprite('#dfe6ff', 1, 0);
  column.center.set(0.5, 0.15);
  group.add(ring, inner, column);
  group.visible = false;
  return {
    group,
    set(k) {
      group.visible = k > 0 && k < 1;
      const r = 0.4 + THREE.MathUtils.smoothstep(k, 0, 0.5) * 1.6;
      ring.scale.setScalar(r);
      inner.scale.setScalar(r);
      const a = Math.sin(Math.min(1, k) * Math.PI);
      ring.material.opacity = a;
      inner.material.opacity = 0.22 * a;
      column.material.opacity = 0.7 * a;
      column.scale.set(1.2 + a * 0.6, 3.2 * a + 0.1, 1);
    },
  };
}

// ---------------------------------------------------------------- the veil
export function buildVeil(hat) {
  const geo = new THREE.CylinderGeometry(0.34, 0.42, 1.25, 28, 6, true);
  geo.translate(0, -0.62, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -1.2) pos.setY(i, y + Math.sin(i * 1.7) * 0.03);
  }
  const veil = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: '#a37dff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#3a1a6a'), emissiveIntensity: 0.6 }));
  veil.position.y = -0.03;
  veil.renderOrder = 2;
  hat.add(veil);
  veil.visible = false;
  return {
    veil,
    set(a) { veil.visible = a > 0.01; veil.material.opacity = 0.42 * a; },
  };
}

// ---------------------------------------------------------------- a brew bottle
export function buildBottle(wrist) {
  const g = joint(wrist, [0, -0.07, 0.02], 'bottle');
  part(g, lathe([[0.001, 0], [0.032, 0.004], [0.036, 0.04], [0.02, 0.07], [0.012, 0.085], [0.013, 0.1]].reverse(), 12), new THREE.MeshToonMaterial({ color: '#b8ffd0', transparent: true, opacity: 0.75 }));
  part(g, sphere(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: '#6dffa0' }), { pos: [0, 0.028, 0], ink: false });
  part(g, cyl(0.011, 0.01, 0.018, 6), toon('#8a5a36'), { pos: [0, 0.105, 0], ink: false });
  const glow = glowSprite('#7dffb0', 0.3, 0.6);
  glow.position.y = 0.03;
  g.add(glow);
  g.visible = false;
  return g;
}
