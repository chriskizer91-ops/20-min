import * as THREE from 'three';
import { toon, part, joint, sphere, cone, lathe, taperedTube, blobShadow, glowSprite, onLayer, Spring } from './kit.js';

// Foes from Aethermoor's Gloomfen (vendor/aethermoor/src/data/foes.js), built in the same chunky style as the
// witch. Each has update(dt) and play(name) for the battle screen: 'attack', 'hurt', 'cast', 'ko'.

// A soft flame: emissive, no outline, a little see-through at the edges.
const flameMat = (color, opacity = 0.92) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: true });

function actionPlayer(durations) {
  let action = null;
  return {
    play(name, onHit) { if (durations[name]) action = { name, t: 0, dur: durations[name], onHit, hit: false }; },
    step(dt) {
      if (!action) return null;
      action.t += dt;
      const k = Math.min(1, action.t / action.dur);
      if (!action.hit && k > 0.5) { action.hit = true; action.onHit?.(); }
      const a = { name: action.name, k };
      if (k >= 1 && action.name !== 'ko') action = null;
      return a;
    },
    get busy() { return !!action && action.name !== 'ko'; },
  };
}

// ---------------------------------------------------------------- Marsh-Light
// "A light over the black water, the size and colour of a lantern flame." Here it takes Witch Way's wisp look:
// a green teardrop flame with a curl at the tip and two dot eyes.
export function createMarshLight(tint = '#7dff8a') {
  const root = new THREE.Group();
  root.name = 'marsh-light';
  const float = joint(root, [0, 0.55, 0]);
  const color = new THREE.Color(tint);
  const core = color.clone().lerp(new THREE.Color('#fffbe0'), 0.6);
  const body = new THREE.Mesh(lathe([[0.001, -0.2], [0.13, -0.16], [0.19, -0.05], [0.17, 0.08], [0.1, 0.2], [0.03, 0.32], [0.001, 0.36]].reverse(), 18), flameMat(color, 0.85));
  float.add(body);
  const inner = new THREE.Mesh(sphere(0.1, 12, 10), flameMat(core, 0.95));
  inner.position.y = -0.05;
  inner.scale.set(1, 0.9, 0.7);
  float.add(inner);
  const tip = joint(float, [0, 0.3, 0]);
  const curl = new THREE.Mesh(taperedTube([[0, 0, 0], [0.02, 0.08, 0], [0.08, 0.14, 0], [0.12, 0.12, 0]], 0.04, 0.008, 10, 6), flameMat(color, 0.85));
  tip.add(curl);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(sphere(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#1b1030' }));
    eye.position.set(side * 0.055, -0.03, 0.15);
    eye.scale.set(0.9, 1.2, 0.5);
    float.add(eye);
  }
  const glow = glowSprite(tint, 1.4, 0.55);
  float.add(glow);
  const light = new THREE.PointLight(tint, 2.2, 4, 2);
  float.add(light);
  const embers = [];
  for (let i = 0; i < 5; i++) {
    const e = new THREE.Mesh(sphere(0.018, 5, 4), flameMat(core, 0.9));
    float.add(e);
    embers.push({ e, a: Math.random() * 6, r: 0.18 + Math.random() * 0.08, s: 0.8 + Math.random() });
  }
  root.add(blobShadow(0.22, 0.2));
  onLayer(root);

  const act = actionPlayer({ attack: 0.7, hurt: 0.45, cast: 0.9, ko: 1.2 });
  let t = Math.random() * 10;
  return {
    root, name: 'Marsh-Light', height: 0.9, radius: 0.25, center: 0.55,
    play: act.play, get busy() { return act.busy; },
    update(dt) {
      t += dt;
      float.position.y = 0.55 + Math.sin(t * 2.3) * 0.06;
      float.position.z = 0;
      const flick = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.1) * 0.03;
      body.scale.set(flick, 1 / flick, flick);
      tip.rotation.z = Math.sin(t * 3) * 0.3;
      tip.rotation.x = Math.cos(t * 2.2) * 0.2;
      glow.material.opacity = 0.5 * flick;
      light.intensity = 2.2 * flick;
      for (const m of embers) {
        m.a += dt * m.s;
        m.e.position.set(Math.cos(m.a) * m.r, 0.1 + Math.sin(m.a * 1.7) * 0.15, Math.sin(m.a) * m.r * 0.6);
      }
      const a = act.step(dt);
      if (a) {
        const bell = Math.sin(a.k * Math.PI);
        if (a.name === 'attack') float.position.z = bell * 0.9;
        if (a.name === 'cast') { float.scale.setScalar(1 + bell * 0.35); light.intensity += bell * 6; }
        if (a.name === 'hurt') { float.position.z = -bell * 0.25; body.material.color.copy(color).lerp(new THREE.Color('#ffffff'), bell); }
        if (a.name === 'ko') {
          // Beaten, it doesn't die: it hiccups, turns green again, and drifts off, shy (docs/LORE.md).
          const hic = Math.max(0, Math.sin(a.k * Math.PI * 6)) * (1 - a.k);
          float.scale.setScalar(Math.max(0.001, 1 - a.k * 0.75) * (1 + hic * 0.25));
          float.position.y += a.k * a.k * 1.6;
          float.position.x -= a.k * 0.6;
          body.material.color.copy(color).lerp(new THREE.Color('#6dff86'), Math.min(1, a.k * 2));
          glow.material.opacity *= 1 - a.k;
          light.intensity *= 1 - a.k;
        }
      } else float.scale.setScalar(1);
    },
  };
}

// ---------------------------------------------------------------- Lamp-Moth
// "A moth the size of a hand, pale gold, drawn to the Lantern Mother's light." Made larger here, so it reads.
export function createLampMoth() {
  const root = new THREE.Group();
  root.name = 'lamp-moth';
  const fly = joint(root, [0, 0.8, 0]);
  const C = { fur: '#e8d49a', furDark: '#b89a58', wing: '#f3e2b0', wingEdge: '#9a7a44', eye: '#231a2c', glow: '#ffd27a' };
  part(fly, sphere(0.07, 10, 8), toon(C.fur), { scale: [1, 1, 1.9], pos: [0, 0, -0.04] });
  const belly = part(fly, sphere(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe6a0' }), { pos: [0, -0.01, -0.14], scale: [1, 1, 1.3], ink: false });
  part(fly, sphere(0.055, 10, 8), toon(C.furDark), { pos: [0, 0.02, 0.1] });
  for (const side of [-1, 1]) {
    part(fly, sphere(0.022, 6, 5), toon(C.eye), { pos: [side * 0.035, 0.03, 0.14], ink: false });
    part(fly, taperedTube([[0, 0, 0], [side * 0.03, 0.06, 0.04], [side * 0.07, 0.1, 0.03]], 0.008, 0.004, 6, 4), toon(C.furDark), { pos: [side * 0.02, 0.06, 0.12], ink: false });
  }
  const wingShape = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(w * 0.3, h * 0.9, w * 0.9, h * 1.1, w, h * 0.55);
    s.bezierCurveTo(w * 1.05, h * 0.1, w * 0.6, -h * 0.25, 0, 0);
    return new THREE.ShapeGeometry(s, 8);
  };
  const wingTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = C.wing;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = C.wingEdge;
    g.beginPath(); g.arc(40, 30, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.wing;
    g.beginPath(); g.arc(40, 30, 5, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const wings = [];
  for (const side of [-1, 1]) {
    for (const [i, [w, h, z]] of [[0.34, 0.26, 0.02], [0.24, 0.18, -0.1]].entries()) {
      const pivot = joint(fly, [side * 0.04, 0.02, z]);
      const g = wingShape(w, h);
      // Map the shape's own coordinates to the texture
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / w, uv.getY(k) / h);
      const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ map: wingTex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = i ? -0.5 : 0.25;
      m.scale.x = side;
      pivot.add(m);
      wings.push({ pivot, side, i });
    }
  }
  const glow = glowSprite(C.glow, 0.9, 0.5);
  glow.position.z = -0.12;
  fly.add(glow);
  // The Wickhollow flame it carries off (docs/LORE.md): violet, hanging under it
  const stolen = glowSprite('#c77dff', 0.3, 0.95);
  const stolenCore = glowSprite('#ffffff', 0.09, 0.9);
  stolen.add(stolenCore);
  stolen.position.set(0, -0.12, 0.02);
  fly.add(stolen);
  const light = new THREE.PointLight(C.glow, 1.4, 3, 2);
  light.position.z = -0.1;
  fly.add(light);
  root.add(blobShadow(0.18, 0.18));
  onLayer(root);

  const act = actionPlayer({ attack: 0.6, hurt: 0.45, cast: 0.8, ko: 1.2 });
  let t = Math.random() * 10;
  const bob = new Spring(20, 4);
  return {
    root, name: 'Lamp-Moth', height: 1.0, radius: 0.25, center: 0.8,
    play: act.play, get busy() { return act.busy; },
    update(dt) {
      t += dt;
      const flap = Math.sin(t * 22);
      for (const w of wings) w.pivot.rotation.z = w.side * (0.25 + flap * 0.9) * (w.i ? 0.85 : 1);
      fly.position.y = 0.8 + bob.update(Math.sin(t * 3.1) * 0.08, dt);
      fly.position.x = Math.sin(t * 1.3) * 0.05;
      fly.position.z = 0;
      fly.rotation.x = -0.25;
      glow.material.opacity = 0.45 + Math.sin(t * 5) * 0.08;
      stolen.material.opacity = 0.8 + Math.sin(t * 17) * 0.15;
      const a = act.step(dt);
      if (a) {
        const bell = Math.sin(a.k * Math.PI);
        if (a.name === 'attack') fly.position.z = bell * 1.1;
        if (a.name === 'cast') { fly.position.y += bell * 0.3; glow.scale.setScalar(0.9 + bell); }
        if (a.name === 'hurt') fly.position.z = -bell * 0.3;
        if (a.name === 'ko') {
          // It flutters off toward some other light.
          fly.position.y += a.k * 2;
          fly.position.x += a.k * 1.5;
          fly.scale.setScalar(Math.max(0.001, 1 - a.k * 0.7));
          light.intensity = 1.4 * (1 - a.k);
          stolen.visible = false;
        }
      }
    },
  };
}
