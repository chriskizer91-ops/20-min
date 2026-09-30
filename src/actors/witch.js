import * as THREE from 'three';
import {
  toon, toonMap, part, joint, sphere, cyl, cone, lathe, skirt, swayCloth, taperedTube, badge, starShape, crescentShape,
  blobShadow, onLayer, Spring, RIM,
} from './kit.js';
import { faces, fx as fxArt } from '../assets.js';
import { buildAthame, Trail, buildRune, buildMoonRing, buildVeil, buildBottle } from './witch-moves.js';

// The Moonlight Witch, from Follow Me Down Witch Way's LORE.md: "a tall plum hat with cream horns and a
// chain of silver charms, round glasses, long wavy hair, a sheer purple veil and shawl stitched with gold, a
// black dress, buckled boots, and a silver athame", plus her basket and the violet witchfire in her hand.
// FF9 proportions: a big head and a bigger hat. Everything is built from shapes in code; her face is painted
// (art/faces/witch.webp) and swaps for blinks and moods. Her walk, hair, hem and charms move in code.

const C = {
  skin: '#eec59d', hair: '#6b4230', hairDark: '#56331f', hairLight: '#80503a',
  hat: '#7a1b4a', band: '#ecdcb8', horn: '#f1e6c8', gold: '#e2bd67', silver: '#dfe3ec',
  shawl: '#a8245f', shawlIn: '#5d1438', dress: '#1f1727', lace: '#5b4a70', stocking: '#1b1520',
  boot: '#2e1f1c', cuff: '#45302a', belt: '#4e1a38', leather: '#4a3025', blade: '#cfd6e0',
  wicker: '#a0703f', herb: '#6fa35a', flower: '#a77bd9', glove: '#2a2030',
};

export function createWitch() {
  const root = new THREE.Group();
  root.name = 'witch';
  const body = joint(root, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- hips, legs and boots
  const hips = joint(body, [0, 0.44, 0], 'hips');
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.072, 0, 0]);
    part(hip, cyl(0.05, 0.043, 0.21, 10), toon(C.stocking), { pos: [0, -0.1, 0] });
    const knee = joint(hip, [0, -0.2, 0]);
    part(knee, cyl(0.045, 0.04, 0.17, 10), toon(C.boot), { pos: [0, -0.1, 0] });
    part(knee, cyl(0.054, 0.05, 0.045, 10), toon(C.cuff), { pos: [0, -0.02, 0] });
    part(knee, new THREE.BoxGeometry(0.03, 0.02, 0.012), toon(C.gold), { pos: [0, -0.08, 0.045], ink: false });
    part(knee, new THREE.TorusGeometry(0.044, 0.006, 4, 12), toon(C.leather), { pos: [0, -0.08, 0], rot: [Math.PI / 2, 0, 0], ink: false });
    const ankle = joint(knee, [0, -0.19, 0]);
    part(ankle, sphere(0.05, 12, 8), toon(C.boot), { pos: [0, -0.015, 0.03], scale: [1, 0.75, 1.75] });
    part(ankle, cyl(0.02, 0.025, 0.03, 6), toon(C.leather), { pos: [0, -0.035, -0.035], ink: false });
    return { hip, knee, ankle };
  });

  // ---------------------------------------------------------------- dress, belt, athame, pouch
  const underskirt = part(hips, skirt({ top: 0.14, bottom: 0.27, height: 0.4, flare: 0.75, points: 24, zig: 0.018, rows: 5 }), toon(C.lace, { side: THREE.DoubleSide }), { pos: [0, 0.16, 0] });
  const outerSkirt = part(hips, skirt({ top: 0.135, bottom: 0.265, height: 0.36, flare: 0.7, points: 12, zig: 0.045, rows: 5 }), toon(C.dress, { side: THREE.DoubleSide }), { pos: [0, 0.17, 0] });
  part(hips, cyl(0.135, 0.14, 0.05, 16), toon(C.belt), { pos: [0, 0.16, 0] });
  part(hips, new THREE.BoxGeometry(0.045, 0.04, 0.015), toon(C.gold), { pos: [0, 0.16, 0.14] });
  // A little pouch on the left
  part(hips, sphere(0.045, 8, 6), toon(C.leather), { pos: [0.13, 0.09, 0.05], scale: [0.8, 1, 0.6] });

  // ---------------------------------------------------------------- torso, collar, shawl
  const torso = joint(hips, [0, 0.18, 0], 'torso');
  part(torso, cyl(0.1, 0.125, 0.24, 14), toon(C.dress), { pos: [0, 0.11, 0] });
  part(torso, sphere(0.1, 12, 8), toon(C.dress), { pos: [0, 0.13, 0.04], scale: [1.05, 0.8, 0.7] });
  part(torso, cyl(0.065, 0.08, 0.06, 12), toon(C.dress), { pos: [0, 0.25, 0] });
  part(torso, new THREE.TorusGeometry(0.08, 0.014, 5, 16), toon(C.lace), { pos: [0, 0.225, 0], rot: [Math.PI / 2, 0, 0] });
  part(torso, badge(crescentShape(0.028, 0.8, 0.45), 0.008), toon(C.gold), { pos: [0, 0.2, 0.086], ink: false });

  const shawlPivot = joint(torso, [0, 0.22, 0], 'shawl');
  const shawlTex = makeShawlTexture();
  const shawlGeo = skirt({ top: 0.13, bottom: 0.34, height: 0.42, flare: 0.75, points: 22, zig: 0.03, gap: 1.15, rows: 6, backDrop: 0.2, ragged: 0.05 });
  const shawl = part(shawlPivot, shawlGeo, toonMap(shawlTex, { side: THREE.FrontSide }));
  part(shawl, shawlGeo, toon(C.shawlIn, { side: THREE.BackSide, rim: 0 }), { ink: false });
  part(shawlPivot, new THREE.SphereGeometry(0.165, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toonMap(shawlTex), { pos: [0, -0.035, -0.005], scale: [1, 0.5, 0.95] });

  // ---------------------------------------------------------------- arms
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.135, 0.19, 0]);
    shoulder.rotation.z = side * 0.18;
    part(shoulder, cyl(0.04, 0.046, 0.16, 8), toon(C.dress), { pos: [0, -0.08, 0] });
    part(shoulder, sphere(0.05, 8, 6), toonMap(shawlTex), { pos: [side * 0.01, -0.01, 0], scale: [1, 0.8, 1] });
    const elbow = joint(shoulder, [0, -0.16, 0]);
    part(elbow, cyl(0.046, 0.072, 0.13, 10, true), toon(C.dress, { side: THREE.DoubleSide }), { pos: [0, -0.065, 0] });
    part(elbow, new THREE.TorusGeometry(0.07, 0.006, 4, 14), toon(C.lace, { rim: 0 }), { pos: [0, -0.13, 0], rot: [Math.PI / 2, 0, 0], ink: false });
    const wrist = joint(elbow, [0, -0.14, 0]);
    part(wrist, sphere(0.036, 8, 6), toon(C.glove), { pos: [0, -0.015, 0], scale: [1, 1.15, 0.8] });
    part(wrist, sphere(0.02, 6, 5), toon(C.skin), { pos: [0, -0.045, 0.008], scale: [1.3, 1, 0.8], ink: false });
    return { shoulder, elbow, wrist };
  });
  const [armL, armR] = [arms[1], arms[0]]; // arms[0] is her right (x -), arms[1] her left (x +)

  // Basket on her right arm, with herbs poking out
  const basketPivot = joint(armR.elbow, [0, -0.03, 0.05], 'basket');
  const basket = joint(basketPivot, [0, -0.14, 0.02]);
  const wicker = makeWickerTexture();
  part(basket, lathe([[0.001, 0], [0.07, 0.002], [0.095, 0.03], [0.105, 0.075], [0.11, 0.09]].reverse(), 14), toonMap(wicker, { side: THREE.DoubleSide }));
  part(basket, new THREE.TorusGeometry(0.108, 0.008, 4, 16), toon('#7a522c'), { pos: [0, 0.09, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  part(basket, new THREE.TorusGeometry(0.1, 0.008, 5, 12, Math.PI), toon('#7a522c'), { pos: [0, 0.09, 0], rot: [0, Math.PI / 2, 0] });
  const herbs = [];
  for (const [x, z, color, h] of [[0.03, 0.02, C.herb, 0.08], [-0.03, 0.03, C.flower, 0.07], [0, -0.04, C.herb, 0.09], [0.05, -0.03, '#d9c2ff', 0.06], [-0.05, -0.02, C.herb, 0.07]]) {
    const sprig = part(basket, cone(0.018, h, 5), toon(color), { pos: [x, 0.09 + h / 2 - 0.02, z], rot: [x * 3, 0, -z * 3] });
    herbs.push(sprig);
  }

  // The athame, sheathed on her right hip; drawn into her right hand to cut herbs, trace runes and dash
  const athame = buildAthame(hips, armR.wrist);
  const bottle = buildBottle(armL.wrist);

  // Witchfire, the violet flame in her left hand (art/fx/witchfire.webp, eight frames)
  const fire = new THREE.Group();
  fire.position.set(0, -0.08, 0.035);
  armL.wrist.add(fire);
  const fireTex = new THREE.TextureLoader().load(fxArt.witchfire);
  fireTex.colorSpace = THREE.SRGBColorSpace;
  fireTex.repeat.set(1 / 8, 1);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, depthWrite: false, transparent: true }));
  flame.scale.set(0.13, 0.13 * (341 / 128), 1);
  flame.center.set(0.5, 0.2);
  fire.add(flame);
  const fireLight = new THREE.PointLight('#c77dff', 0.6, 1.8, 2);
  fireLight.position.y = 0.06;
  fire.add(fireLight);

  // ---------------------------------------------------------------- head, face, hair
  const neck = joint(torso, [0, 0.26, 0], 'neck');
  part(neck, cyl(0.032, 0.036, 0.06, 8), toon(C.skin), { pos: [0, 0.02, 0], ink: false });
  const head = joint(neck, [0, 0.16, 0], 'head');
  const faceMat = toon(C.skin, { rim: 0.35 });
  const skull = part(head, new THREE.SphereGeometry(0.2, 28, 20), faceMat, { scale: [1, 0.96, 0.95] });
  const face = makeFace(skull);

  const hair = joint(head, [0, 0, 0], 'hair');
  // Scalp: everything but the face
  part(hair, new THREE.SphereGeometry(0.212, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.64), toon(C.hair, { side: THREE.DoubleSide }), { pos: [0, 0.008, -0.004] });
  part(hair, new THREE.SphereGeometry(0.214, 24, 8, 0, Math.PI * 2, 0, 0.62), toon(C.hair), { pos: [0, 0.01, 0] });
  // Bangs: short locks sweeping across the forehead
  for (const [a, len, tone] of [[-0.55, 0.1, C.hair], [-0.25, 0.12, C.hairLight], [0.05, 0.11, C.hair], [0.32, 0.12, C.hairLight], [0.6, 0.1, C.hair]]) {
    const ax = Math.sin(a), az = Math.cos(a);
    const pts = [[ax * 0.17, 0.12, az * 0.13], [ax * 0.2, 0.08, az * 0.17], [ax * 0.2 + 0.02 * Math.sign(a || 1), 0.12 - len, az * 0.19]];
    part(hair, taperedTube(pts, 0.035, 0.008, 8, 6), toon(tone));
  }
  // Long wavy locks: at the sides (framing her face) and down her back. Each swings from its root.
  const locks = [];
  const lock = (root, drop, spread, thick, tone, waves = 2.5) => {
    const j = joint(hair, root);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const wave = Math.sin(t * Math.PI * waves) * 0.045 * Math.min(1, t * 1.6);
      pts.push([spread[0] * t + wave, -drop * t, spread[1] * t + wave * 0.5]);
    }
    part(j, taperedTube(pts, thick, thick * 0.3, 16, 7), toon(tone));
    locks.push({ j, spring: new Spring(26 + Math.random() * 8, 4.5), side: new Spring(22, 4), phase: Math.random() * 6 });
    return j;
  };
  for (const side of [-1, 1]) {
    lock([side * 0.17, -0.02, 0.07], 0.36, [side * 0.03, 0.04], 0.045, C.hairLight, 3);
    lock([side * 0.19, 0.0, -0.02], 0.44, [side * 0.06, 0.0], 0.05, C.hair, 2.5);
    lock([side * 0.15, 0.03, -0.12], 0.52, [side * 0.06, -0.06], 0.055, C.hairDark, 2);
  }
  lock([0.06, 0.04, -0.17], 0.56, [0.03, -0.07], 0.06, C.hair, 2);
  lock([-0.06, 0.04, -0.17], 0.56, [-0.03, -0.07], 0.06, C.hairLight, 2.2);
  lock([0, 0.08, -0.18], 0.5, [0, -0.08], 0.06, C.hairDark, 1.8);

  // ---------------------------------------------------------------- hat
  const hat = joint(head, [0, 0.15, -0.03], 'hat');
  hat.rotation.x = -0.28;
  part(hat, brimGeometry(0.19, 0.38), toon(C.hat, { side: THREE.DoubleSide }));
  part(hat, cyl(0.196, 0.202, 0.075, 20), toon(C.band), { pos: [0, 0.045, 0] });
  part(hat, cyl(0.199, 0.205, 0.012, 20), toon(C.hat), { pos: [0, 0.012, 0], ink: false });
  part(hat, badge(crescentShape(0.035, 0.78, 0.5), 0.01), toon(C.gold), { pos: [0, 0.048, 0.205], rot: [0, 0, 0.5], ink: false });
  for (const side of [-1, 1]) {
    const pts = [[0, 0, 0], [side * 0.05, 0.035, 0.01], [side * 0.08, 0.1, 0], [side * 0.06, 0.165, -0.01], [side * 0.02, 0.185, 0]];
    part(hat, taperedTube(pts, 0.03, 0.006, 14, 7), toon(C.horn), { pos: [side * 0.19, 0.055, 0.04] });
  }
  const cone1 = joint(hat, [0, 0.08, 0]);
  part(cone1, cyl(0.135, 0.195, 0.2, 18, true), toon(C.hat, { side: THREE.DoubleSide }), { pos: [0, 0.1, 0] });
  const cone2 = joint(cone1, [0, 0.19, 0]);
  part(cone2, cyl(0.095, 0.137, 0.17, 16, true), toon(C.hat, { side: THREE.DoubleSide }), { pos: [0, 0.085, 0] });
  const cone3 = joint(cone2, [0, 0.16, 0]);
  part(cone3, cyl(0.055, 0.097, 0.15, 14, true), toon(C.hat, { side: THREE.DoubleSide }), { pos: [0, 0.075, 0] });
  const cone4 = joint(cone3, [0, 0.14, 0]);
  part(cone4, cone(0.057, 0.17, 12), toon(C.hat), { pos: [0, 0.085, 0] });
  part(cone4, badge(starShape(0.022), 0.008), toon(C.silver), { pos: [0, 0.18, 0], ink: false });

  // Charms on little chains around the front of the brim
  const charms = [];
  for (const [i, a] of [-1.05, -0.55, 0, 0.55, 1.05].entries()) {
    const ang = Math.PI / 2 + a;
    const pivot = joint(hat, [Math.cos(ang) * 0.3, -0.03, Math.sin(ang) * 0.3]);
    part(pivot, cyl(0.0025, 0.0025, 0.06, 3), toon(C.silver), { pos: [0, -0.03, 0], ink: false });
    const shape = i % 2 ? crescentShape(0.02, 0.78, 0.5) : starShape(0.02);
    part(pivot, badge(shape, 0.006), toon(i === 2 ? C.gold : C.silver), { pos: [0, -0.07, 0], rot: [0, -a, 0], ink: false });
    charms.push({ pivot, sx: new Spring(40, 3.5), sz: new Spring(40, 3.5) });
  }

  const veil = buildVeil(hat);
  const shadow = blobShadow(0.32, 0.5);
  root.add(shadow);
  onLayer(root);

  // Spell effects that stay put in the world: the scene adds `fx` beside her.
  const fx = new THREE.Group();
  fx.name = 'witch-fx';
  const trail = new Trail('#e2d4ff');
  const rune = buildRune();
  const moonRing = buildMoonRing();
  fx.add(trail.mesh, rune.group, moonRing.group);

  // ---------------------------------------------------------------- animation
  const S = {
    hatBack: new Spring(55, 6), hatSide: new Spring(55, 6), shawl: new Spring(30, 5), lean: new Spring(20, 6),
  };
  let phase = 0, time = 0, look = 0, lookTarget = 0, nextLook = 2, blinkT = 3, prevSpeed = 0, fidget = 0, nextFidget = 6;
  let action = null; // { name, t, dur, onHit, hit }
  let mood = 'calm';
  let downed = false;
  const ACTIONS = {
    harvest: 1.7, cast: 1.3, throw: 0.9, moonlight: 1.8, rune: 1.7, dash: 1.1, brew: 1.4, veil: 1.6,
    cheer: 1.0, hurt: 0.5, ko: 1.2, rise: 0.8,
  };
  const ss = THREE.MathUtils.smoothstep;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

  const api = {
    root, head, fire, hat, basket, fx, athame,
    height: 1.68,
    radius: 0.2,
    get busy() { return !!action; },
    setMood(m) { mood = m; face.show(m); },
    // Moves: harvest (kneel, cut with the athame, pick), cast (raise the witchfire), throw (fling it), moonlight
    // (a ring of silver light at her feet), rune (trace Witch Way's sign in the air with the athame), dash (the
    // athame lunge from the showcase art), brew (drink one), veil (draw her veil and turn), cheer, hurt, ko, rise.
    // onHit fires at the moment it lands.
    moves: Object.keys(ACTIONS),
    play(name, onHit, opts = {}) {
      if (!ACTIONS[name]) return;
      if (name === 'rise') downed = false;
      action = { name, t: 0, dur: ACTIONS[name] * (opts.slow ?? 1), onHit, hit: false, reach: opts.reach ?? 1.3 };
      if (name === 'rune') {
        root.updateMatrixWorld();
        rune.group.position.copy(root.localToWorld(v1.set(0, 1.05, 0.62)));
        rune.group.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()));
      }
      if (name === 'moonlight') moonRing.group.position.copy(root.getWorldPosition(v1)).setY(v1.y + 0.02);
    },
    update(dt, speed, turn = 0) {
      time += dt;
      const accel = (speed - prevSpeed) / Math.max(dt, 1e-3);
      prevSpeed = speed;
      const moving = Math.min(1, speed / 2);
      phase += ((speed * dt) / 0.6) * Math.PI;
      const s = Math.sin(phase), c = Math.cos(phase);

      // Legs: a proper step, with the knee bending as the leg comes forward
      for (const [i, L] of legs.entries()) {
        const p = i ? phase + Math.PI : phase;
        const swing = Math.sin(p) * 0.55 * moving;
        L.hip.rotation.x = swing;
        L.knee.rotation.x = Math.max(0, -Math.cos(p)) * 0.9 * moving;
        L.ankle.rotation.x = -swing * 0.4;
      }
      hips.position.y = 0.44 + Math.abs(c) * 0.03 * moving - 0.015 * moving + Math.sin(time * 2.1) * 0.004 * (1 - moving);
      hips.rotation.y = s * 0.12 * moving;
      hips.rotation.z = c * 0.04 * moving;
      torso.rotation.y = -s * 0.2 * moving;
      torso.rotation.x = S.lean.update(0.12 * moving - accel * 0.01, dt);
      torso.scale.y = 1 + Math.sin(time * 2.1) * 0.01 * (1 - moving);

      // Arms: her right arm carries the basket (a small swing); her left holds the witchfire out
      armR.shoulder.rotation.x = -s * 0.25 * moving - 0.1;
      armR.elbow.rotation.x = -1.2;
      // Witchfire held out to her side, palm up, as in the showcase art
      armL.shoulder.rotation.x = s * 0.3 * moving - 0.25;
      armL.shoulder.rotation.z = 0.42 - 0.15 * moving;
      armL.elbow.rotation.x = -0.75 - 0.15 * (1 - moving);

      // Idle fidgets: push the glasses up, or look about
      if (!moving && !action) {
        if ((nextFidget -= dt) < 0) { fidget = 1.4; nextFidget = 7 + Math.random() * 6; }
      }
      if (fidget > 0) {
        fidget -= dt;
        const f = Math.sin(Math.min(1, (1.4 - fidget) / 1.4) * Math.PI);
        armL.shoulder.rotation.x -= f * 1.6;
        armL.elbow.rotation.x -= f * 1.0;
        armL.shoulder.rotation.z -= f * 0.35;
      }

      // Actions
      trail.on = false;
      if (action) {
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const bell = Math.sin(k * Math.PI);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        const kneel = (down) => {
          hips.position.y -= down * 0.2;
          for (const L of legs) { L.hip.rotation.x = -down * 1.1; L.knee.rotation.x = down * 1.9; L.ankle.rotation.x = -down * 0.7; }
          legs[1].hip.rotation.x = -down * 0.5;
          torso.rotation.x = down * 0.45;
        };
        switch (action.name) {
          case 'harvest': {
            // Kneel, draw the athame, a few quick cuts at the stem, the left hand gathers, stand, sheathe.
            const down = ss(k, 0, 0.3) * (1 - ss(k, 0.72, 1));
            kneel(down);
            if (k > 0.12 && k < 0.86) athame.draw(); else athame.sheathe();
            armR.shoulder.rotation.x = -down * 1.15;
            armR.elbow.rotation.x = -0.35 - down * 0.2;
            const cutting = k > 0.35 && k < 0.6;
            armR.shoulder.rotation.z = -0.18 + (cutting ? Math.sin(action.t * 38) * 0.14 : 0);
            trail.on = cutting;
            armL.shoulder.rotation.x = -down * 0.9;
            armL.elbow.rotation.x = -0.3;
            hitAt(0.55);
            break;
          }
          case 'cast':
            armL.shoulder.rotation.x = -bell * 2.6;
            armL.elbow.rotation.x = -0.2;
            torso.rotation.x = -bell * 0.12;
            flame.scale.set(0.13 * (1 + bell * 1.4), 0.13 * (341 / 128) * (1 + bell * 1.4), 1);
            fireLight.intensity = 0.6 + bell * 4;
            hitAt(0.55);
            break;
          case 'throw': {
            // Wind up behind, then fling the witchfire forward; it comes back to her palm a moment later.
            const wind = ss(k, 0, 0.4) * (1 - ss(k, 0.4, 0.5));
            const fling = ss(k, 0.4, 0.55) * (1 - ss(k, 0.75, 1));
            armL.shoulder.rotation.x = wind * 0.9 - fling * 1.9 - 0.25 * (1 - wind - fling);
            armL.elbow.rotation.x = -0.9 * wind - 0.1;
            torso.rotation.y = wind * 0.45 - fling * 0.35;
            const size = k < 0.45 ? 1 + wind * 1.2 : k < 0.8 ? 0.001 : ss(k, 0.8, 1);
            flame.scale.set(0.13 * size, 0.13 * (341 / 128) * size, 1);
            fireLight.intensity = 0.6 * size + wind * 2;
            hitAt(0.45);
            break;
          }
          case 'moonlight':
            // Both arms rise, her face lifts to the moon, and a ring of silver light opens around her.
            armL.shoulder.rotation.z = 0.42 + bell * 1.5;
            armR.shoulder.rotation.z = -0.18 - bell * 1.3;
            armL.shoulder.rotation.x = -bell * 0.6;
            armR.shoulder.rotation.x = -bell * 0.5;
            armL.elbow.rotation.x = armR.elbow.rotation.x = -0.25;
            torso.rotation.x = -bell * 0.18;
            body.position.y = bell * 0.05;
            moonRing.set(k);
            RIM.strength.value = 0.32 + bell * 0.9;
            hitAt(0.5);
            break;
          case 'rune': {
            // Draw the athame and trace a line through a diamond in the air; the rune flares when it's done.
            if (k > 0.05 && k < 0.95) athame.draw(); else athame.sheathe();
            const traceK = ss(k, 0.15, 0.7);
            const p = rune.at(traceK);
            const tracing = k > 0.15 && k < 0.72;
            armR.shoulder.rotation.x = -1.35 - (tracing ? p.y * 1.7 : 0) * 1 + (1 - ss(k, 0, 0.15)) * 1.2 * (k < 0.15 ? 1 : 0);
            armR.elbow.rotation.x = -0.15;
            torso.rotation.y = tracing ? p.x * 1.4 : torso.rotation.y;
            trail.on = tracing;
            const flare = ss(k, 0.68, 0.78) * (1 - ss(k, 0.8, 1));
            rune.set(traceK, flare, 1 - ss(k, 0.85, 1));
            hitAt(0.72);
            break;
          }
          case 'dash': {
            // The athame lunge: crouch, spring forward with a sweeping cut, hop back.
            if (k < 0.95) athame.draw(); else athame.sheathe();
            const crouch = ss(k, 0, 0.18) * (1 - ss(k, 0.18, 0.3));
            const out = ss(k, 0.18, 0.42) * (1 - ss(k, 0.58, 0.92));
            body.position.z = out * action.reach;
            body.position.y = Math.sin(ss(k, 0.58, 0.92) * Math.PI) * 0.18;
            shadow.position.z = body.position.z;
            hips.position.y -= crouch * 0.12 + out * 0.06;
            for (const L of legs) L.knee.rotation.x = Math.max(L.knee.rotation.x, crouch * 0.9 + out * 0.5);
            legs[0].hip.rotation.x = -out * 0.8;
            legs[1].hip.rotation.x = out * 0.6;
            torso.rotation.x = out * 0.35 + crouch * 0.2;
            const sweep = ss(k, 0.3, 0.48);
            armR.shoulder.rotation.x = -1.7 + sweep * 2.0;
            armR.shoulder.rotation.z = -0.9 + sweep * 0.8;
            armR.elbow.rotation.x = -0.2;
            trail.on = k > 0.28 && k < 0.52;
            armL.shoulder.rotation.x = out * 0.8;
            hitAt(0.45);
            break;
          }
          case 'brew': {
            // A bottle from her pouch, a quick drink, and a sparkle.
            const up = ss(k, 0.1, 0.35) * (1 - ss(k, 0.7, 0.9));
            bottle.visible = k > 0.08 && k < 0.88;
            flame.visible = !bottle.visible;
            fireLight.intensity = bottle.visible ? 0 : fireLight.intensity;
            armL.shoulder.rotation.x = -up * 1.45;
            armL.shoulder.rotation.z = 0.25 - up * 0.15;
            armL.elbow.rotation.x = -0.4 - up * 1.3;
            head.rotation.x = -up * 0.35;
            bottle.rotation.x = -up * 1.2;
            hitAt(0.6);
            break;
          }
          case 'veil': {
            // Her sheer purple veil falls around her as she turns once.
            veil.set(ss(k, 0, 0.25) * (1 - ss(k, 0.8, 1)));
            body.rotation.y = ss(k, 0.1, 0.65) * Math.PI * 2;
            armL.shoulder.rotation.z = 0.42 + bell * 0.5;
            armR.shoulder.rotation.z = -0.18 - bell * 0.5;
            hitAt(0.4);
            break;
          }
          case 'cheer':
            body.position.y = Math.max(0, Math.sin(k * Math.PI * 2)) * 0.08;
            armL.shoulder.rotation.x = -bell * 2.4;
            armR.shoulder.rotation.x = -bell * 1.2;
            break;
          case 'hurt':
            torso.rotation.x = -bell * 0.35;
            body.position.z = -bell * 0.12;
            shadow.position.z = body.position.z;
            face.show('surprised');
            break;
          case 'ko':
          case 'rise': {
            const d = action.name === 'ko' ? ss(k, 0, 0.7) : 1 - ss(k, 0, 1);
            kneel(d);
            torso.rotation.x = d * 0.7;
            armL.shoulder.rotation.x = armR.shoulder.rotation.x = d * 0.3;
            head.rotation.x = d * 0.5;
            break;
          }
        }
        if (k >= 1) {
          if (action.name === 'ko') downed = true;
          action = null;
          flame.scale.set(0.13, 0.13 * (341 / 128), 1);
          flame.visible = true;
          bottle.visible = false;
          body.position.set(0, 0, 0);
          body.rotation.y = 0;
          shadow.position.z = 0;
          veil.set(0);
          rune.set(0, 0, 0);
          moonRing.set(0);
          RIM.strength.value = 0.32;
          athame.sheathe();
        }
      } else if (downed) {
        hips.position.y -= 0.2;
        for (const L of legs) { L.hip.rotation.x = -1.1; L.knee.rotation.x = 1.9; L.ankle.rotation.x = -0.7; }
        torso.rotation.x = 0.7;
        head.rotation.x = 0.5;
      }
      // The blade leaves a streak while it cuts, and glints when it's drawn.
      if (athame.drawn) {
        athame.glint.material.opacity = Math.max(0, athame.glint.material.opacity - dt * 3);
        trail.update(dt, athame.base.getWorldPosition(v1), athame.tip.getWorldPosition(v2));
      } else trail.update(dt, v1, v2);

      // The basket hangs straight down whatever the arm is doing.
      basketPivot.rotation.x = -(armR.shoulder.rotation.x + armR.elbow.rotation.x + torso.rotation.x);
      basketPivot.rotation.z = -armR.shoulder.rotation.z;

      // Head: look about when idle, blink, keep level
      if ((nextLook -= dt) < 0) { lookTarget = moving > 0.1 ? 0 : (Math.random() - 0.5) * 1.0; nextLook = 1.5 + Math.random() * 3; }
      look += (lookTarget * (1 - moving) - look) * (1 - Math.exp(-dt * 5));
      head.rotation.y = look - torso.rotation.y * 0.8;
      if (!action || !['brew', 'ko', 'rise'].includes(action.name)) head.rotation.x = downed ? 0.5 : -torso.rotation.x * 0.6 - 0.04;
      if ((blinkT -= dt) < 0) blinkT = 2.2 + Math.random() * 3;
      if (action?.name !== 'hurt') face.show(blinkT < 0.13 && mood !== 'happy' ? 'blink' : downed ? 'blink' : mood);

      // Secondary motion: the hat tip, hair, hem and charms lag behind
      const tip = S.hatBack.update(0.28 * moving + Math.sin(time * 1.3) * 0.03 - accel * 0.02, dt);
      const side = S.hatSide.update(-turn * 0.06, dt);
      cone2.rotation.set(-0.22 + tip * 0.35, 0, side);
      cone3.rotation.set(-0.35 + tip * 0.6, 0, side * 1.4);
      cone4.rotation.set(-0.5 + tip * 0.9, 0, side * 1.8);
      for (const L of locks) {
        L.j.rotation.x = L.spring.update(0.35 * moving + Math.sin(time * 1.7 + L.phase) * 0.03 + Math.abs(s) * 0.05 * moving, dt);
        L.j.rotation.z = L.side.update(-turn * 0.05, dt);
      }
      for (const [i, ch] of charms.entries()) {
        ch.pivot.rotation.x = ch.sx.update(0.5 * moving + Math.abs(c) * 0.25 * moving + Math.sin(time * 2 + i) * 0.05, dt);
        ch.pivot.rotation.z = ch.sz.update(-turn * 0.08 + s * 0.2 * moving, dt);
      }
      const drag = S.shawl.update(0.07 * moving, dt);
      swayCloth(shawlGeo, { drag, lift: 0.01 * moving, time, ripple: 0.006 + 0.01 * moving });
      swayCloth(outerSkirt.geometry, { drag: drag * 0.5, lift: Math.abs(s) * 0.02 * moving, time: time * 1.3, ripple: 0.004 + 0.006 * moving });
      swayCloth(underskirt.geometry, { drag: drag * 0.4, lift: Math.abs(s) * 0.015 * moving, time: time * 1.2, ripple: 0.003 });

      // Witchfire: step through the eight frames and flicker the light
      const frame = Math.floor(time * 12) % 8;
      fireTex.offset.x = frame / 8;
      if (!action || action.name !== 'cast') fireLight.intensity = 0.6 * (0.85 + Math.sin(time * 17) * 0.08 + Math.sin(time * 29) * 0.07);
    },
  };
  return api;
}

// ---------------------------------------------------------------- the painted face

// Her face sheet has four faces: calm, blink, surprised, happy. Each is painted onto the front of the head
// through a wrap-around texture (the rest is plain skin), and we swap between them.
function makeFace(skull) {
  const moods = { calm: [0, 0], blink: [1, 0], surprised: [0, 1], happy: [1, 1] };
  const textures = {};
  let current = 'calm';
  const img = new Image();
  img.onload = () => {
    const skin = sampleCorner(img);
    for (const [name, [cx, cy]] of Object.entries(moods)) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const g = canvas.getContext('2d');
      g.fillStyle = skin;
      g.fillRect(0, 0, 1024, 512);
      const q = img.width / 2;
      // The face in each quarter spans about x 6-94% and y 26-84%; place it on the front (u = 0.25).
      const sx = cx * q + q * 0.06, sy = cy * q + q * 0.26, sw = q * 0.88, sh = q * 0.58;
      const w = 330, h = w * (sh / sw);
      g.drawImage(img, sx, sy, sw, sh, 256 - w / 2, 270 - h * 0.5, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textures[name] = tex;
    }
    const mat = skull.material.clone();
    mat.onBeforeCompile = skull.material.onBeforeCompile;
    mat.customProgramCacheKey = skull.material.customProgramCacheKey;
    mat.color.set('#ffffff');
    mat.map = textures[current];
    skull.material = mat;
  };
  img.src = faces.witch;
  return {
    show(name) {
      if (name === current) return;
      current = name;
      if (textures[name]) { skull.material.map = textures[name]; }
    },
  };
}

function sampleCorner(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d');
  g.drawImage(img, 4, 4, 1, 1, 0, 0, 1, 1);
  const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${gg},${b})`;
}

// ---------------------------------------------------------------- cloth and wicker, painted in code

function makeShawlTexture() {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // Magenta with soft vertical folds
  g.fillStyle = C.shawl;
  g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 32) {
    const grad = g.createLinearGradient(x, 0, x + 32, 0);
    grad.addColorStop(0, 'rgba(60,0,30,0.18)');
    grad.addColorStop(0.5, 'rgba(255,120,190,0.08)');
    grad.addColorStop(1, 'rgba(60,0,30,0.18)');
    g.fillStyle = grad;
    g.fillRect(x, 0, 32, H);
  }
  // Gold stitching: a running stitch near the hem and one near the top, with little crescents between
  g.strokeStyle = C.gold;
  g.lineWidth = 3;
  g.setLineDash([9, 6]);
  for (const y of [H * 0.84, H * 0.93, H * 0.06]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.setLineDash([]);
  g.fillStyle = C.gold;
  for (let x = 20; x < W; x += 48) {
    const y = H * 0.885;
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.arc(x + 3, y - 1.5, 5, 0, Math.PI * 2, true);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(236,210,150,0.35)';
    g.fillRect((i * 97) % W, 30 + ((i * 53) % (H * 0.6)), 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function makeWickerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a522c';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8)
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle = (x + y) % 16 ? '#b48048' : '#9a6a38';
      g.fillRect(x + 1, y + 1, 6, 6);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

// A wide brim that droops at the edge, with a gentle wave.
function brimGeometry(inner, outer, segments = 40) {
  const pts = [];
  const idx = [];
  const rings = 4;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const radius = inner + (outer - inner) * t;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const droop = -0.055 * t * t + Math.sin(a * 5) * 0.008 * t * t;
      pts.push(Math.cos(a) * radius, droop, Math.sin(a) * radius);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < segments; i++) {
      const a = r * (segments + 1) + i, b = a + 1, c = a + segments + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export { RIM };
