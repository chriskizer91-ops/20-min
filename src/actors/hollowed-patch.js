import * as THREE from 'three';
import { createHerb } from './herbs.js';
import { toon, taperedTube, glowSprite, onLayer } from './kit.js';
import { Hollow, Motes, rotDecal, texture, canvasTexture, ss } from './foes-common.js';
import { fx as fxArt } from '../assets.js';

// A Hollowed herb patch, for the fen (docs/LORE.md §8's new rule: "clean the patch before you pick"). It wraps
// createHerb (herbs.js) and gives the same plant the Hollowed look the fen's foes wear (foes-common.js): grey as ash,
// cracked, drooping, no twinkle, on a disc of cracked grey mud. Cleaning it takes two steps:
//   reveal()      Moonlight shows the rot: the cracks light silver, and black runners show, wound round the stems
//                 and spreading over the ground
//   burn(done)    witchfire burns it off ("Witchfire burns nothing that belongs"): violet flames lick up, the rot
//                 shrivels, the grey drains away, and the plant blooms at once, whatever the moon says. done() fires
//                 when it can be picked.
// createHollowedPatch(kind, { glow, cleaned }) -> { root, kind, state, reveal(), burn(done), update(dt) }
// state: 'grey' | 'shown' | 'burning' | 'bloomed'. cleaned: start bloomed (a patch she cleaned earlier tonight).

const ROT = '#1c1426', ROT_GLOW = '#3a1850';

export function createHollowedPatch(kind, { glow, cleaned = false } = {}) {
  const root = new THREE.Group();
  root.name = `hollowed-${kind}`;
  const herb = createHerb(kind, glow ? { glow } : undefined);
  root.add(herb.root);
  const plant = herb.root.children.find((o) => !o.isSprite);
  const [glowSpr, twinkle] = herb.root.children.filter((o) => o.isSprite);
  const glowColor = glowSpr.material.color.clone();

  // The plant's own materials, swapped for ones that can go grey and crack (a Hollow per patch, so one patch can
  // bloom while its neighbours stay grey). With the hollow amount at 0 they draw exactly as before.
  const H = new Hollow({ scale: 26 });
  const swapped = new Map();
  plant.traverse((o) => {
    if (!o.isMesh || o.name === 'ink') return;
    const m = o.material;
    if (!swapped.has(m)) {
      const hex = `#${m.color.getHexString()}`;
      swapped.set(m, m.isMeshToonMaterial
        ? H.toon(hex, { emissive: `#${m.emissive.getHexString()}`, emissiveIntensity: m.emissiveIntensity, side: m.side, rim: 0.8 })
        : H.basic(hex, { transparent: m.transparent, opacity: m.opacity }));
    }
    o.material = swapped.get(m);
  });

  // Cracked grey mud round its roots
  const mud = new THREE.Mesh(new THREE.CircleGeometry(0.26, 28), new THREE.MeshBasicMaterial({ map: crackedMud(), transparent: true, depthWrite: false }));
  mud.rotation.x = -Math.PI / 2;
  mud.position.y = 0.004;
  mud.renderOrder = -2;
  root.add(mud);

  // The rot itself, hidden until Moonlight shows it: runners over the ground, and black tendrils wound round the stems
  const runners = rotDecal(0.2, 1.1);
  runners.group.rotation.y = Math.random() * Math.PI * 2;
  root.add(runners.group);
  const tendrils = new THREE.Group();
  const rotMat = toon(ROT, { emissive: new THREE.Color(ROT_GLOW), emissiveIntensity: 0.7 });
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI * 2 + 0.3, turns = 0.9 + (i % 2) * 0.4, top = 0.16 + (i % 3) * 0.05;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, a = a0 + t * turns * Math.PI * 2, r = 0.075 - t * 0.04;
      pts.push([Math.cos(a) * r, t * top, Math.sin(a) * r]);
    }
    pts.unshift([Math.cos(a0) * 0.14, 0, Math.sin(a0) * 0.14]);
    const m = new THREE.Mesh(taperedTube(pts, 0.011, 0.002, 18, 5), rotMat);
    tendrils.add(m);
  }
  tendrils.scale.set(1, 0.001, 1);
  tendrils.visible = false;
  root.add(tendrils);
  const rotLight = glowSprite('#8a52c8', 0.55, 0);
  rotLight.position.y = 0.08;
  root.add(rotLight);

  // Witchfire: violet flames from the witch's own sheet (art/fx/witchfire.webp, eight frames)
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const tex = fireSheet().clone();
    tex.repeat.set(1 / 8, 1);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    s.center.set(0.5, 0.12);
    const a = (i / 5) * Math.PI * 2;
    s.position.set(i ? Math.cos(a) * 0.12 : 0, 0, i ? Math.sin(a) * 0.1 : 0);
    s.visible = false;
    root.add(s);
    flames.push({ s, tex, frame: i * 1.7, size: i ? 0.2 : 0.3 });
  }
  const fireLight = new THREE.PointLight('#c77dff', 0, 2.2, 2);
  fireLight.position.y = 0.25;
  root.add(fireLight);
  const flakes = new Motes(root, { count: 14, map: texture('flake'), blending: THREE.NormalBlending });
  const glints = new Motes(root, { count: 20, map: texture('sparkle') });
  onLayer(root);

  let state = cleaned ? 'bloomed' : 'grey';
  let t = 0, stateT = 0, flakeT = 0, onBloom = null;
  const v = new THREE.Vector3(), vel = new THREE.Vector3();
  const setHollow = (k, heal) => { H.u.hollow.value = k; H.u.heal.value = heal; };
  setHollow(cleaned ? 0 : 1, 0);
  if (cleaned) mud.visible = false;

  const api = {
    root, kind, herb,
    get state() { return state; },
    // Moonlight: the rot shows
    reveal() {
      if (state !== 'grey') return false;
      state = 'shown';
      stateT = 0;
      tendrils.visible = true;
      return true;
    },
    // Witchfire: the rot burns off, and it blooms
    burn(done) {
      if (state !== 'shown') return false;
      state = 'burning';
      stateT = 0;
      onBloom = done ?? null;
      for (const f of flames) f.s.visible = true;
      return true;
    },
    update(dt) {
      t += dt;
      stateT += dt;
      herb.update(dt);
      let droop = 0, heal = 0, hollow = 0, fire = 0, rotShow = 0, rotBurn = 0, pop = 0;
      switch (state) {
        case 'grey':
          droop = 1;
          hollow = 1;
          break;
        case 'shown': {
          // the cracks light up silver as the moonlight finds them, then keep a faint pulse; the rot creeps into view
          droop = 1;
          hollow = 1;
          const k = ss(stateT, 0, 0.9);
          heal = ss(stateT, 0, 0.25) * (1 - ss(stateT, 0.5, 1.2)) * 0.9 + k * (0.22 + Math.sin(t * 3) * 0.08);
          rotShow = k;
          break;
        }
        case 'burning': {
          // 0-1.1 s the flames rise and the rot shrivels; the grey drains 0.6-1.6 s; at 1.4 s it blooms
          const k = stateT;
          fire = ss(k, 0, 0.25) * (1 - ss(k, 1.0, 1.5));
          rotShow = 1;
          rotBurn = ss(k, 0.15, 1.0);
          hollow = 1 - ss(k, 0.6, 1.6);
          heal = (1 - ss(k, 0.9, 1.6)) * 0.6;
          droop = 1 - ss(k, 0.8, 1.6);
          pop = ss(k, 1.2, 1.5) * (1 - ss(k, 1.5, 2.0));
          if ((flakeT -= dt) < 0 && k < 1.1) {
            flakeT = 0.06;
            const a = Math.random() * Math.PI * 2;
            flakes.emit({ pos: v.set(Math.cos(a) * 0.08, 0.05 + Math.random() * 0.12, Math.sin(a) * 0.08), vel: vel.set((Math.random() - 0.5) * 0.1, 0.35 + Math.random() * 0.2, (Math.random() - 0.5) * 0.1), life: 1.1, size: 0.035, grow: 0.3, color: Math.random() < 0.5 ? '#2e2838' : '#57505f', opacity: 0.9, spin: 2 });
          }
          if (k >= 1.35 && !api.bloomedOnce) {
            api.bloomedOnce = true;
            for (let i = 0; i < 18; i++) {
              const a = Math.random() * Math.PI * 2;
              glints.emit({ pos: v.set(0, 0.18, 0), vel: vel.set(Math.cos(a) * 0.35, 0.3 + Math.random() * 0.6, Math.sin(a) * 0.35), life: 0.8 + Math.random() * 0.4, size: 0.06 + Math.random() * 0.05, grow: 0.3, color: i % 3 ? '#f4efff' : '#d9b8ff', gravity: 0.5, drag: 1.5, spin: 3 });
            }
          }
          if (k >= 2.0) {
            state = 'bloomed';
            stateT = 0;
            for (const f of flames) f.s.visible = false;
            tendrils.visible = false;
            const done = onBloom;
            onBloom = null;
            done?.();
          }
          break;
        }
        default: // bloomed
          break;
      }
      setHollow(hollow, heal);
      // Grey and drooping: squashed a little, leaning; blooming gives a little bounce
      plant.scale.set(1 + pop * 0.12, 1 - droop * 0.2 + pop * 0.18, 1 + pop * 0.12);
      plant.rotation.x += droop * 0.22;
      plant.rotation.z += droop * 0.1;
      // No twinkle while grey; the glow goes the colour of ash
      twinkle.visible = state === 'bloomed' || hollow < 0.3;
      glowSpr.material.color.copy(glowColor).lerp(ASH, hollow * 0.85);
      glowSpr.material.opacity *= 1 - hollow * 0.9;
      mud.visible = hollow > 0.01;
      mud.material.opacity = Math.min(1, hollow * 1.2);
      // The rot: shows under Moonlight, shrivels in the flames
      runners.set(rotShow * (1 - rotBurn));
      tendrils.scale.set(1 - rotBurn * 0.6, Math.max(0.001, rotShow * (1 - rotBurn)), 1 - rotBurn * 0.6);
      rotLight.material.opacity = rotShow * (1 - rotBurn) * (0.35 + Math.sin(t * 2.4) * 0.12);
      // Witchfire
      fireLight.intensity = fire * (3 + Math.sin(t * 23) * 0.6);
      for (const f of flames) {
        f.frame += dt * 14;
        f.tex.offset.x = (Math.floor(f.frame) % 8) / 8;
        f.s.material.opacity = fire;
        const s = f.size * (0.6 + fire * 0.6);
        f.s.scale.set(s, s * (341 / 128), 1);
      }
      flakes.update(dt);
      glints.update(dt);
    },
  };
  return api;
}

const ASH = new THREE.Color('#8f8a98');

let sheet = null;
function fireSheet() {
  if (!sheet) {
    sheet = new THREE.TextureLoader().load(fxArt.witchfire);
    sheet.colorSpace = THREE.SRGBColorSpace;
  }
  return sheet;
}

// Grey mud, dried and cracked: a disc that fades at its edge, crazed with dark cracks
let mudTex = null;
function crackedMud() {
  if (mudTex) return mudTex;
  mudTex = canvasTexture(128, 128, (g, W) => {
    const c = W / 2;
    const grad = g.createRadialGradient(c, c, 4, c, c, c);
    grad.addColorStop(0, 'rgba(92,86,98,0.95)');
    grad.addColorStop(0.65, 'rgba(74,68,80,0.85)');
    grad.addColorStop(1, 'rgba(60,54,66,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, W);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.strokeStyle = 'rgba(22,18,28,0.9)';
    g.lineCap = 'round';
    // Cracks: wandering lines out from near the middle, forking as they go
    const crack = (x, y, a, len, w) => {
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < len; i++) {
        a += (rand() - 0.5) * 0.9;
        x += Math.cos(a) * 5;
        y += Math.sin(a) * 5;
        g.lineTo(x, y);
        if (rand() < 0.12 && w > 0.8) { g.stroke(); crack(x, y, a + (rand() < 0.5 ? 1 : -1) * 0.9, len - i - 2, w * 0.6); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); }
      }
      g.stroke();
    };
    for (let i = 0; i < 7; i++) crack(c + (rand() - 0.5) * 16, c + (rand() - 0.5) * 16, (i / 7) * Math.PI * 2, 9 + Math.floor(rand() * 4), 2.2);
    // pale flakes at the crack edges
    g.fillStyle = 'rgba(170,164,176,0.5)';
    for (let i = 0; i < 40; i++) { const a = rand() * Math.PI * 2, r = rand() * c * 0.8; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 1); }
  });
  return mudTex;
}
