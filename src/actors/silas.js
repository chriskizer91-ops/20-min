import * as THREE from 'three';
import { joint, sphere, cyl, cone, lathe, skirt, swayCloth, taperedTube, blobShadow, onLayer, Spring, turnToward, glowSprite, crescentShape, badge, toon } from './kit.js';
import { mat, inkMat, makePart, paint, Strands, rng, ss, lerp, TAU } from './bosses-kit.js';
import { merge, win, arch, holdOrientation } from './party-kit.js';

// Silas the Lamplighter, a ghost (Follow Me Down Witch Way: witch_game_assets/design/LORE.md and npcs/silas/): "a lanky
// young man in a lamplighter's long coat with brass buttons and a peaked cap, carrying a long lamplighter's pole".
// Patient and proud of his lamps; the wisps keep blowing his flame out, so he has never finished his rounds. His
// sprites draw him pale and sea-glass blue: a slate cap with a brass badge, soft tousled hair, a turned-up collar
// and a white cravat, a double row of brass buttons, and a coat that dissolves below the knee into curling mist.
// The pole's head is a brass cup and cage with a little lamp hung off its hook; it smokes while it's out.
//
// He's drawn the way Witch Way draws its ghosts and the bosses' kit draws the Drowned Chorister: a little see-through
// at the heart and glowing at the edges, and fading right away where the coat turns to mist.
//
// Idle life: he floats and bobs, the mist curls, he looks about at his lamps and blinks; now and then he lifts the
// pole to peer at the wick (a sigh, while it's out), straightens his cap, or polishes a button. Once his pole is lit
// he admires his lamps instead, hand on hip. Moves: talk (an open hand and a nod), relight (the pole up high, and
// the flame catches: onHit), tip (tips his cap), give (holds something out), point (the pole along the path).
// setLit(true) lights the pole. tip() is where the flame is, in the world.

const C = {
  skin: '#d2eaec', skinShade: '#a9cdd3', glow: '#9ff0ff', line: '#2a4a56', eye: '#1f3a46', iris: '#5fb0bc',
  hair: '#e6f2ee', hairTip: '#b4d2d8', coat: '#34485a', coatDark: '#233240', coatEdge: '#5a7488', cap: '#2e3e4e',
  capDark: '#1e2a36', brass: '#d8a848', brassDark: '#8a6424', cravat: '#eef8f8', wood: '#4a3226', woodDark: '#2e1e18',
  flame: '#ffb24a', flameCore: '#fff2c0', smoke: '#9aa8b0', mist: '#c8f4f4',
};

export function createSilas() {
  const ghostInk = inkMat('#16323c', { opacity: 0.75 });
  const part = makePart(ghostInk, { order: 1, inkOrder: 2 });
  const solid = makePart(inkMat('#12091a'));
  const G = (color, core = 0.88, extra = {}, strength = 0.4) =>
    mat(color, { ghost: { glow: C.glow, core, strength }, emissive: new THREE.Color('#123e48'), emissiveIntensity: 0.22, depthWrite: true, ...extra });

  const faces = makeFaces();
  const skinMat = G('#ffffff', 0.97, { map: faces.texture, emissiveIntensity: 0.08 }, 0.22);
  const handMat = G(C.skin, 0.86);
  const coatMat = G('#ffffff', 0.93, { map: coatTexture(), alphaMap: fadeAlpha(), side: THREE.DoubleSide, emissiveIntensity: 0.12 }, 0.26);
  const chestMat = G('#ffffff', 0.95, { map: chestTexture(), emissiveIntensity: 0.12 }, 0.28);
  const sleeveMat = G(C.coat, 0.93, { emissiveIntensity: 0.12 }, 0.28);
  const edgeMat = G(C.coatEdge, 0.9, { side: THREE.DoubleSide });
  const cuffMat = G(C.mist, 0.35, { side: THREE.DoubleSide, depthWrite: false }, 0.6);
  const cravatMat = G(C.cravat, 0.92, { side: THREE.DoubleSide });
  const capMat = G(C.cap, 0.96, { side: THREE.DoubleSide, emissiveIntensity: 0.1 }, 0.3);
  const hairMat = G('#ffffff', 0.9, { vertexColors: true, emissiveIntensity: 0.12 }, 0.3);
  const scalpMat = G(C.hair, 0.94, { emissiveIntensity: 0.12 }, 0.3);
  const mistMat = G(C.mist, 0.14, { vertexColors: true, depthWrite: false }, 0.4);
  const brassMat = mat(C.brass, { emissive: new THREE.Color('#4a3006'), emissiveIntensity: 0.35 });
  const woodMat = mat(C.wood);

  const root = new THREE.Group();
  root.name = 'silas';
  const float = joint(root, [0, 0.2, 0], 'float');
  const torso = joint(float, [0, 0.8, 0], 'torso');

  // ---------------------------------------------------------------- the long coat, and the mist it turns into
  const coatGeo = skirt({ top: 0.15, bottom: 0.29, height: 0.66, flare: 0.8, points: 22, zig: 0.03, rows: 6, ragged: 0.07 });
  part(torso, coatGeo, coatMat, { pos: [0, 0.06, 0] });
  const tails = new Strands();
  const rt = rng(7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + rt() * 0.4;
    const x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22;
    const curl = (rt() - 0.5) * 0.2;
    tails.add([[x, 0, z], [x * 0.85, -0.14, z * 0.85], [x * 0.55 + curl, -0.28, z * 0.55], [x * 0.25 - curl, -0.4 - rt() * 0.1, z * 0.3 + curl * 0.5]], 0.05, 0.005, {
      segments: 12, radial: 5, color: '#bff0f2', tip: '#3f8290', stiff: 4, damp: 1.1, wave: 0.14, sway: 1.5,
    });
  }
  // one long curl that sweeps round to the side, the way his sprite ends in a swirl
  tails.add([[0.05, 0, 0.1], [0.12, -0.18, 0.12], [0.2, -0.36, 0.02], [0.1, -0.5, -0.1], [-0.05, -0.44, -0.08]], 0.07, 0.01, {
    segments: 16, radial: 6, color: '#cff6f6', tip: '#4f98a4', stiff: 3, damp: 1, wave: 0.1, sway: 1.2,
  });
  tails.build(mistMat, null, part, joint(torso, [0, -0.56, 0]));

  // ---------------------------------------------------------------- chest, lapels, collar, cravat, buttons
  part(torso, lathe([[0.001, 0.37], [0.07, 0.365], [0.125, 0.34], [0.155, 0.27], [0.162, 0.17], [0.152, 0.07], [0.148, 0.0]].reverse(), 18), chestMat);
  // lapels: two long triangles turned back over the chest, their edges catching the light
  const lapel = (s) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(s * 0.085, 0.02);
    shape.lineTo(s * 0.06, 0.2);
    shape.lineTo(s * 0.012, 0.1);
    shape.closePath();
    return new THREE.ShapeGeometry(shape).rotateX(-0.28).translate(s * 0.012, 0.13, 0.152);
  };
  part(torso, merge([lapel(1), lapel(-1)]), edgeMat, {});
  // the turned-up collar, a ring that flares up round the neck and stands open at the front
  part(torso, lathe([[0.09, 0], [0.11, 0.05], [0.125, 0.1]], 14).rotateY(Math.PI).translate(0, 0.33, 0), sleeveMat, {});
  part(torso, new THREE.LatheGeometry([[0.09, 0], [0.11, 0.05], [0.125, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 14, Math.PI * 0.3, Math.PI * 1.4).translate(0, 0.335, 0), edgeMat, { ink: false });
  // the cravat: a knot at the throat and two soft lobes falling over the waistcoat, with a gold pin
  const cravat = joint(torso, [0, 0.33, 0.1], 'cravat');
  part(cravat, merge([
    new THREE.SphereGeometry(0.035, 10, 8).scale(1.2, 0.9, 0.8),
    new THREE.SphereGeometry(0.045, 10, 8).scale(0.8, 1.3, 0.45).rotateZ(0.35).translate(-0.022, -0.06, 0.012),
    new THREE.SphereGeometry(0.045, 10, 8).scale(0.8, 1.3, 0.45).rotateZ(-0.35).translate(0.022, -0.065, 0.012),
  ]), cravatMat, {});
  solid(cravat, sphere(0.011, 6, 5), brassMat, { pos: [0, -0.01, 0.035], ink: false });
  // brass buttons, two rows down the front, and the belt of the coat
  const buttons = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const y = 0.22 - i * 0.065, r = 0.158 - Math.abs(y - 0.17) * 0.05;
    buttons.push(new THREE.SphereGeometry(0.012, 6, 5).scale(1, 1, 0.6).translate(s * 0.05, y, Math.sqrt(Math.max(0, r * r - 0.0025))));
  }
  solid(torso, merge(buttons), brassMat, { ink: false });

  // ---------------------------------------------------------------- arms: long sleeves, ragged ghostly cuffs
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.18, 0.3, 0]);
    part(shoulder, sphere(0.062, 10, 8), sleeveMat, { scale: [1, 0.85, 1] });
    part(shoulder, cyl(0.05, 0.045, 0.27, 9), sleeveMat, { pos: [0, -0.13, 0] });
    const elbow = joint(shoulder, [0, -0.27, 0]);
    elbow.rotation.order = 'YXZ';
    part(elbow, cyl(0.045, 0.058, 0.23, 9, true), sleeveMat, { pos: [0, -0.11, 0] });
    part(elbow, skirt({ top: 0.055, bottom: 0.085, height: 0.09, flare: 0.8, points: 10, zig: 0.02, rows: 2, ragged: 0.03 }), cuffMat, { pos: [0, -0.2, 0], ink: false });
    const wrist = joint(elbow, [0, -0.25, 0]);
    part(wrist, sphere(0.042, 10, 8), handMat, { pos: [0, -0.02, 0.005], scale: [0.9, 1.15, 0.75] });
    part(wrist, sphere(0.017, 6, 5), handMat, { pos: [-side * 0.03, -0.012, 0.022], scale: [0.9, 1.3, 0.9], ink: false });
    return { side, shoulder, elbow, wrist };
  });
  const [armR, armL] = arms; // his right is x -

  // ---------------------------------------------------------------- the lamplighter's pole
  // Held in his right hand, 2.2 m long; the head is a brass cup in a little cage, with a lamp on a hook.
  const poleHold = joint(armR.wrist, [0, -0.02, 0.01], 'pole');
  const pole = joint(poleHold, [0, 0, 0]);
  solid(pole, cyl(0.016, 0.02, 2.2, 7), woodMat, { pos: [0, 0.15, 0] });
  solid(pole, merge([
    new THREE.CylinderGeometry(0.024, 0.024, 0.05, 8).translate(0, -0.93, 0),
    new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8).translate(0, 0.35, 0),
    new THREE.CylinderGeometry(0.022, 0.026, 0.06, 8).translate(0, 1.2, 0),
  ]), brassMat, { ink: false });
  const head = joint(pole, [0, 1.25, 0], 'pole-head');
  solid(head, lathe([[0.012, 0], [0.05, 0.03], [0.058, 0.08], [0.052, 0.1]], 10), brassMat, {});
  solid(head, merge([
    ...[0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4).translate(0.05, 0.16, 0).rotateY((i / 4) * TAU)),
    new THREE.TorusGeometry(0.05, 0.006, 4, 12).rotateX(Math.PI / 2).translate(0, 0.22, 0),
    new THREE.ConeGeometry(0.055, 0.06, 8).translate(0, 0.25, 0),
    // the hook, out to one side, and the little lamp hanging from it
    new THREE.TorusGeometry(0.03, 0.005, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(0, 0.19, 0.06),
  ]), brassMat, { ink: false });
  const wick = joint(head, [0, 0.1, 0], 'wick');
  const lampJ = joint(head, [0, 0.16, 0.09], 'little lamp');
  solid(lampJ, merge([
    new THREE.CylinderGeometry(0.018, 0.022, 0.05, 6).translate(0, -0.045, 0),
    new THREE.ConeGeometry(0.024, 0.025, 6).translate(0, -0.012, 0),
    new THREE.SphereGeometry(0.008, 5, 4).translate(0, -0.08, 0),
  ]), brassMat, { ink: false });
  const lampGlass = solid(lampJ, cyl(0.014, 0.017, 0.04, 6), mat('#6a5a48', { emissive: new THREE.Color('#ffa040'), emissiveIntensity: 0 }), { pos: [0, -0.045, 0], ink: false });

  // The flame (once he's lit), and smoke curling off the cold wick (until then)
  const flame = joint(wick, [0, 0, 0], 'flame');
  const flameMat = new THREE.MeshBasicMaterial({ color: C.flame, transparent: true, opacity: 0.95 });
  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 8).translate(0, 0.065, 0), flameMat);
  const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 6).translate(0, 0.035, 0), new THREE.MeshBasicMaterial({ color: C.flameCore }));
  flame.add(flameOuter, flameInner);
  const flameGlow = glowSprite('#ffb45a', 0.7, 0.8);
  flameGlow.position.y = 0.06;
  flame.add(flameGlow);
  const flameLight = new THREE.PointLight('#ffb060', 0, 4.5, 2);
  flameLight.position.y = 0.1;
  flame.add(flameLight);
  flame.visible = false;
  const smoke = Array.from({ length: 5 }, (_, i) => {
    const s = glowSprite(C.smoke, 0.06, 0);
    s.material.blending = THREE.NormalBlending;
    wick.add(s);
    return { s, age: i / 5, seed: i * 1.7 };
  });

  // ---------------------------------------------------------------- head, face, hair, cap
  const neck = joint(torso, [0, 0.37, 0], 'neck');
  part(neck, cyl(0.04, 0.045, 0.07, 8), handMat, { pos: [0, 0.02, 0], ink: false });
  const headJ = joint(neck, [0, 0.17, 0.01], 'head');
  part(headJ, new THREE.SphereGeometry(0.175, 28, 20), skinMat, { scale: [0.96, 1.02, 0.95] });
  for (const s of [-1, 1]) part(headJ, sphere(0.03, 8, 6), handMat, { pos: [s * 0.166, -0.01, -0.01], scale: [0.45, 1, 0.75], ink: false });
  // scalp: all but the face; soft pale hair
  part(headJ, new THREE.SphereGeometry(0.185, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.64), scalpMat, { pos: [0, 0.008, -0.006] });
  part(headJ, new THREE.SphereGeometry(0.187, 24, 8, 0, Math.PI * 2, 0, 0.62), scalpMat, { pos: [0, 0.01, 0] });
  const hair = new Strands();
  const rh = rng(12);
  const lock = (a, y, drop, thick, out = 0.02, sweep = 0, curl = 0.02) => {
    const x = Math.sin(a) * 0.178, z = Math.cos(a) * 0.178;
    const o = [Math.sin(a) * out, Math.cos(a) * out];
    hair.add([[x * 0.86, y + 0.02, z * 0.86], [x + o[0], y - 0.04, z + o[1]], [x + o[0] * 1.3 + sweep * 0.5 + curl, y - drop * 0.6, z + o[1] * 1.3],
      [x + o[0] + sweep - curl + (rh() - 0.5) * 0.02, y - drop, z + o[1] + curl * 0.5]],
    thick, thick * 0.3, { segments: 10, radial: 5, color: C.hair, tip: C.hairTip, stiff: 6 + rh() * 3, damp: 1.4, wave: 0.02, sway: 0.8, lag: 0.8 });
  };
  // a tousled fringe swept to his left, locks round the ears, and a soft fall at the nape
  for (const [a, sweep, d] of [[-0.62, 0.03, 0.08], [-0.38, 0.035, 0.07], [-0.14, 0.04, 0.06], [0.1, 0.04, 0.055], [0.34, 0.03, 0.065], [0.6, 0.02, 0.075]]) lock(a, 0.15, d, 0.03, 0.025, sweep, 0.015);
  for (const s of [-1, 1]) {
    lock(s * 0.95, 0.07, 0.17, 0.035, 0.02, 0, s * 0.02);
    lock(s * 1.35, 0.08, 0.2, 0.038, 0.02, 0, -s * 0.02);
    lock(s * 2.0, 0.09, 0.19, 0.04, 0.02, 0, s * 0.015);
  }
  lock(Math.PI, 0.1, 0.2, 0.045, 0.02);
  hair.build(hairMat, ghostInk, part, headJ);
  // the peaked cap: a soft slate crown, a brass band and badge, a short black visor
  const cap = joint(headJ, [0, 0.13, -0.02], 'cap');
  cap.rotation.x = -0.2;
  part(cap, lathe([[0.001, 0.115], [0.15, 0.11], [0.192, 0.09], [0.198, 0.066], [0.182, 0.03], [0.172, 0]].reverse(), 20), capMat, {});
  solid(cap, new THREE.TorusGeometry(0.174, 0.011, 5, 22), brassMat, { pos: [0, 0.012, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  part(cap, new THREE.CylinderGeometry(0.17, 0.17, 0.012, 16, 1, false, -Math.PI / 2.6, Math.PI / 1.3).scale(1, 1, 0.42), mat(C.capDark), { pos: [0, 0.006, 0.09], rot: [0.12, 0, 0] });
  solid(cap, badge(crescentShape(0.032, 0.8, 0.45), 0.012), brassMat, { pos: [0, 0.06, 0.2], rot: [-0.3, 0, 0.5], ink: false });

  // ---------------------------------------------------------------- his light: a cool glow round him, and a shadow
  const aura = glowSprite(C.glow, 1.5, 0.28);
  aura.position.y = 1.1;
  root.add(aura);
  const light = new THREE.PointLight(C.glow, 0.7, 2.6, 2);
  light.position.set(0, 2.0, -0.1); // above him, so it lights the path round him more than his own front
  root.add(light);
  const shadow = blobShadow(0.3, 0.28);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- life
  const S = { coat: new Spring(24, 4), pole: new Spring(30, 5), capX: new Spring(40, 5), lampX: new Spring(30, 2.2), lampZ: new Spring(30, 2.2) };
  let time = Math.random() * 10, look = 0, lookTarget = 0, nextLook = 2, blinkT = 2.5, mood = 'calm', faceTo = null;
  let action = null, fidget = null, nextFidget = 5 + Math.random() * 3, lit = false, litK = 0, catchK = 0;
  const ACTIONS = { talk: 1.5, relight: 2.6, tip: 1.4, give: 1.6, point: 1.8 };
  const poleQ = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();

  const api = {
    root, head: headJ, name: 'Silas', height: 1.78, radius: 0.4, center: 1.0,
    moves: Object.keys(ACTIONS),
    face: faces,
    rest: 0,
    get busy() { return !!action; },
    get lit() { return lit; },
    get mood() { return mood; },
    setMood(m) { mood = m; },
    lookAt(angle) { faceTo = angle; },
    setLit(on) { lit = on; if (on) catchK = 1; },
    // Where the pole's flame is, in the world (for the flame that runs from lamp to lamp)
    tip(out = new THREE.Vector3()) { wick.updateWorldMatrix(true, false); return wick.getWorldPosition(out).add(v.set(0, 0.05, 0)); },
    play(name, onHit) {
      if (!ACTIONS[name]) return;
      fidget = null;
      action = { name, t: 0, dur: ACTIONS[name], onHit, hit: false };
    },
    // speed and turn as the town's other people take them (he never walks: he floats where he is)
    update(dt, speed = 0, turn = 0) {
      time += dt;
      if (faceTo !== null || !action) root.rotation.y = turnToward(root.rotation.y, faceTo ?? api.rest, 4, dt);

      // Float and bob; the coat and the mist lag behind any turn
      float.position.y = 0.2 + Math.sin(time * 1.5) * 0.035;
      float.rotation.z = Math.sin(time * 0.8) * 0.025 - turn * 0.02;
      float.rotation.x = Math.sin(time * 0.6) * 0.015;
      const breath = Math.sin(time * 1.6);
      torso.rotation.set(0.02, 0, 0);
      torso.scale.set(1 + breath * 0.01, 1 + breath * 0.008, 1 + breath * 0.01);
      headJ.rotation.set(-0.06, 0, 0); // up a touch, so the painter's camera (high above) sees his face
      cap.rotation.x = -0.2;

      // Rest pose: the pole upright at his right side, the left hand easy at his side
      armR.shoulder.rotation.set(-0.2, 0, -0.32);
      armR.elbow.rotation.set(-0.95, -0.2, 0);
      armR.wrist.rotation.set(0.3, 0, 0);
      armL.shoulder.rotation.set(0.05 + Math.sin(time * 1.2) * 0.03, 0, 0.14);
      armL.elbow.rotation.set(-0.3, 0, 0);
      armL.wrist.rotation.set(0, 0, 0);
      let poleLean = { x: 0.04, z: 0.08 }, faceNow = null, lift = 0;

      // Idle: peer at the wick (a sigh, while it's cold), straighten the cap, polish a button; lit, admire his lamps
      if (!action && faceTo === null && (nextFidget -= dt) < 0) {
        const pick = lit ? ['admire', 'cap', 'polish'] : ['wick', 'cap', 'wick', 'polish'];
        fidget = { name: pick[Math.floor(Math.random() * pick.length)], t: 0 };
        nextFidget = 5 + Math.random() * 5;
      }
      if (fidget) {
        fidget.t += dt;
        const f = fidget.t;
        if (fidget.name === 'wick') {
          // Lift the pole, tip the head back to look at the cold wick, a small sigh, and down again
          const k = f / 2.6, p = win(k, 0, 1, 0.25), sigh = arch(k, 0.55, 0.85);
          lift = p * 0.18;
          armR.shoulder.rotation.x -= p * 0.35;
          armR.elbow.rotation.x += p * 0.2;
          headJ.rotation.x = lerp(-0.06, -0.35, p) + sigh * 0.15;
          torso.rotation.x -= sigh * 0.05;
          faceNow = p > 0.4 ? 'sad' : null;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'cap') {
          // The left hand up to the visor, a tug straight, and down
          const k = f / 1.5, p = win(k, 0, 1, 0.28), tug = arch(k, 0.45, 0.65);
          armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -2.3, p), 0, lerp(0.14, 0.35, p));
          armL.elbow.rotation.set(lerp(-0.3, -1.5, p), lerp(0, -0.4, p), 0);
          cap.rotation.x = -0.2 + tug * 0.12;
          headJ.rotation.x = -0.06 - tug * 0.06;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'polish') {
          // Breathe on a button and rub it with the cuff
          const k = f / 2.2, p = win(k, 0, 1, 0.2), rub = Math.sin(fidget.t * 16) * win(k, 0.35, 0.9, 0.05);
          armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -0.9, p), 0, lerp(0.14, -0.15, p));
          armL.elbow.rotation.set(lerp(-0.3, -1.7 + rub * 0.12, p), lerp(0, 0.6, p), 0);
          headJ.rotation.x = lerp(-0.06, 0.42, p);
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'admire') {
          // Hand on hip, a slow look round at every lamp, pleased
          const k = f / 3.2, p = win(k, 0, 1, 0.2);
          armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, 0.1, p), 0, lerp(0.14, 0.55, p));
          armL.elbow.rotation.set(lerp(-0.3, -1.6, p), lerp(0, 1.2, p), 0);
          headJ.rotation.y = Math.sin(k * TAU) * 0.6 * p;
          headJ.rotation.x = lerp(-0.06, -0.1, p);
          torso.rotation.x -= p * 0.04;
          faceNow = p > 0.3 ? 'happy' : null;
          if (k >= 1) fidget = null;
        }
      }

      // Moves
      if (action) {
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        switch (action.name) {
          case 'talk': {
            // The free hand open, palm up, making his point; a nod
            const p = win(k, 0, 1, 0.2), beat = Math.sin(action.t * 7);
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -0.7 + beat * 0.08, p), 0, lerp(0.14, 0.3, p));
            armL.elbow.rotation.set(lerp(-0.3, -0.9 + beat * 0.1, p), lerp(0, 0.3, p), 0);
            armL.wrist.rotation.set(lerp(0, -0.4, p), lerp(0, 1.1, p), 0);
            headJ.rotation.x += arch(k, 0.3, 0.6) * 0.12;
            faceNow = Math.sin(action.t * 15) > 0.1 && k < 0.85 ? 'talk' : null;
            hitAt(0.5);
            break;
          }
          case 'relight': {
            // Both hands on the pole, up high, the head to the sky; the flame catches, and he laughs
            const up = win(k, 0.02, 0.92, 0.2), jolt = arch(k, 0.5, 0.7);
            lift = up * 0.35 + jolt * 0.05;
            armR.shoulder.rotation.x -= up * 1.2;
            armR.elbow.rotation.x += up * 0.55;
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -2.2, up), 0, lerp(0.14, -0.35, up));
            armL.elbow.rotation.set(lerp(-0.3, -0.6, up), 0, 0);
            poleLean = { x: 0.04 - up * 0.1, z: 0.08 - up * 0.12 };
            headJ.rotation.x = lerp(-0.06, -0.45, up);
            float.position.y += jolt * 0.06;
            faceNow = k < 0.52 ? 'surprised' : 'happy';
            hitAt(0.52);
            break;
          }
          case 'tip': {
            // A tip of the cap, and a little bow
            const k2 = win(k, 0, 1, 0.25), bow = arch(k, 0.3, 0.8);
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -2.4, k2), 0, lerp(0.14, 0.3, k2));
            armL.elbow.rotation.set(lerp(-0.3, -1.4, k2), lerp(0, -0.3, k2), 0);
            cap.rotation.x = -0.2 - bow * 0.35;
            cap.position.y = 0.13 + bow * 0.04;
            torso.rotation.x += bow * 0.2;
            headJ.rotation.x += bow * 0.15;
            faceNow = 'happy';
            hitAt(0.5);
            break;
          }
          case 'give': {
            // The left hand out, palm up, with something in it
            const p = win(k, 0, 1, 0.25);
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -1.2, p), 0, lerp(0.14, 0.05, p));
            armL.elbow.rotation.set(lerp(-0.3, -0.35, p), lerp(0, 0.2, p), 0);
            armL.wrist.rotation.set(lerp(0, -0.3, p), lerp(0, 1.4, p), 0);
            torso.rotation.x += p * 0.08;
            headJ.rotation.x = lerp(-0.06, 0.3, p);
            faceNow = 'happy';
            hitAt(0.55);
            break;
          }
          case 'point': {
            // The pole held out along the path, like a signpost
            const p = win(k, 0, 1, 0.22);
            armR.shoulder.rotation.set(lerp(armR.shoulder.rotation.x, -1.3, p), lerp(0, -0.4, p), lerp(-0.1, -0.35, p));
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -0.25, p), 0, 0);
            poleLean = { x: 0.04 + p * 0.9, z: 0.08 + p * 0.25 };
            headJ.rotation.y = -p * 0.5;
            headJ.rotation.x = lerp(-0.06, 0, p);
            hitAt(0.5);
            break;
          }
        }
        if (k >= 1) {
          if (!action.hit) action.onHit?.();
          action = null;
        }
      }
      armR.shoulder.rotation.x -= lift * 0.6;

      // The pole stays upright in his hand (a little lean, a little lag), whatever the arm does
      const lean = S.pole.update(poleLean.x - turn * 0.03, dt);
      e.set(lean, 0, poleLean.z + float.rotation.z * 0.5);
      holdOrientation(pole, root, poleQ.setFromEuler(e));
      lampJ.rotation.x = S.lampX.update(-lean * 0.9 + Math.sin(time * 1.3) * 0.05, dt);
      lampJ.rotation.z = S.lampZ.update(-turn * 0.08 + Math.sin(time * 0.9) * 0.05, dt);

      // The flame: flicker when lit; flare when it catches. Smoke from the cold wick until then.
      litK += ((lit ? 1 : 0) - litK) * (1 - Math.exp(-dt * 5));
      catchK = Math.max(0, catchK - dt * 1.2);
      flame.visible = litK > 0.02;
      if (flame.visible) {
        const fl = 1 + Math.sin(time * 17) * 0.08 + Math.sin(time * 29 + 1) * 0.06;
        flame.scale.set(litK * (1 + catchK * 0.6), litK * fl * (1 + catchK), litK * (1 + catchK * 0.6));
        flameGlow.material.opacity = 0.75 * litK * fl;
        flameGlow.scale.setScalar(0.7 + catchK * 0.8);
        flameLight.intensity = (2.4 + catchK * 3) * litK * fl;
        lampGlass.material.emissiveIntensity = 1.2 * litK * fl;
      }
      for (const p of smoke) {
        p.age += dt / 2.2;
        if (p.age >= 1) p.age -= 1;
        const a = p.age;
        p.s.position.set(Math.sin(a * 5 + p.seed) * 0.04 * a, 0.02 + a * 0.45, Math.cos(a * 4 + p.seed) * 0.03 * a);
        p.s.material.opacity = (1 - litK) * Math.sin(a * Math.PI) * 0.4;
        p.s.scale.setScalar(0.04 + a * 0.12);
      }

      // Look about when idle, toward whoever he's talking to otherwise; blink
      if ((nextLook -= dt) < 0) { lookTarget = faceTo !== null || action ? 0 : (Math.random() - 0.5) * 1.0; nextLook = 1.8 + Math.random() * 3; }
      look += (lookTarget - look) * (1 - Math.exp(-dt * 3));
      headJ.rotation.y += look;
      if ((blinkT -= dt) < 0) blinkT = 2.2 + Math.random() * 3;
      faces.show(faceNow ?? (blinkT < 0.13 && mood !== 'happy' ? 'blink' : mood));

      // The coat and the mist, and his glow (warmer once the pole is lit)
      const drag = S.coat.update(turn * 0.02, dt);
      swayCloth(coatGeo, { drag, lift: 0.01, time: time * 0.9, ripple: 0.014, side: drag * 0.5 });
      tails.update(dt, time, { wind: [Math.sin(time * 0.5) * 0.12 - turn * 0.05, -0.08], gust: 0.35, flow: 0.6 });
      hair.update(dt, time, { wind: [Math.sin(time * 0.4) * 0.05, -0.03], gust: 0.15, flow: 0.4 });
      aura.material.opacity = 0.24 + Math.sin(time * 2.1) * 0.05;
      shadow.position.y = 0.01;
    },
  };
  return api;
}

// ---------------------------------------------------------------- his face
// Painted per mood on a canvas that covers the front half of the head (x 256 the middle, y 262 the eyes, y 322 the
// mouth). Pale sea-glass skin, soft heavy-lidded eyes that look down, fine silver brows, and a shy smile.
function makeFaces() {
  const moods = ['calm', 'blink', 'talk', 'happy', 'sad', 'surprised'];
  const size = 512;
  const canvases = {};
  for (const m of moods) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    drawFace(c.getContext('2d'), m);
    canvases[m] = c;
  }
  const texture = new THREE.CanvasTexture(canvases.calm);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1); // the canvas is the front half of the sphere; the back clamps to its edge
  let current = 'calm';
  return {
    texture,
    get mood() { return current; },
    show(name) {
      if (name === current || !canvases[name]) return;
      current = name;
      texture.image = canvases[name];
      texture.needsUpdate = true;
    },
  };
}

function drawFace(g, mood) {
  g.fillStyle = C.skin;
  g.fillRect(0, 0, 512, 512);
  // a cool shade toward the sides, and a faint blue under the eyes
  const side = g.createLinearGradient(0, 0, 512, 0);
  side.addColorStop(0, 'rgba(120,170,180,0.55)');
  side.addColorStop(0.28, 'rgba(120,170,180,0)');
  side.addColorStop(0.72, 'rgba(120,170,180,0)');
  side.addColorStop(1, 'rgba(120,170,180,0.55)');
  g.fillStyle = side;
  g.fillRect(0, 0, 512, 512);
  for (const x of [204, 308]) {
    const grad = g.createRadialGradient(x, 290, 2, x, 290, 30);
    grad.addColorStop(0, 'rgba(110,160,190,0.28)');
    grad.addColorStop(1, 'rgba(110,160,190,0)');
    g.fillStyle = grad;
    g.fillRect(x - 32, 258, 64, 64);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // brows: fine and silver, raised at the middle when he's sad or surprised
  const brow = { calm: [0, 0], blink: [0, 0], talk: [-4, 0], happy: [-6, -0.1], sad: [-4, 0.5], surprised: [-18, 0.1] }[mood];
  g.strokeStyle = '#8fb4bc';
  g.lineWidth = 7;
  for (const s of [-1, 1]) {
    const inner = 256 + s * 22, outer = 256 + s * 82, y = 214 + brow[0];
    g.beginPath();
    g.moveTo(inner, y - brow[1] * 18);
    g.quadraticCurveTo(256 + s * 52, y - 10 - brow[1] * 6, outer, y + 4 + brow[1] * 6);
    g.stroke();
  }

  // eyes: heavy-lidded and looking down, with long dark lashes
  const eye = (s, { open = 0.55, look = 0.35 } = {}) => {
    const cx = 256 + s * 52, cy = 262, rx = 27, ry = 18;
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.clip();
    g.fillStyle = '#f2fafa';
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    const iy = cy + look * 8;
    g.fillStyle = C.iris;
    g.beginPath(); g.arc(cx + s * 2, iy, 14, 0, TAU); g.fill();
    g.fillStyle = '#1c3440';
    g.beginPath(); g.arc(cx + s * 2, iy, 7, 0, TAU); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(cx + s * 2 - 5, iy - 4, 3.5, 0, TAU); g.fill();
    // the lid comes down over the top of the eye
    g.fillStyle = C.skinShade;
    g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, (ry * 2 + 2) * (1 - open));
    g.restore();
    const lidY = cy - ry + (ry * 2) * (1 - open);
    g.strokeStyle = C.eye;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx - rx - 2, cy + 2);
    g.quadraticCurveTo(cx, lidY - 4, cx + rx + 2, cy);
    g.stroke();
    // a lash flick at the outer corner
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(cx + s * (rx - 2), cy - 1);
    g.lineTo(cx + s * (rx + 8), cy - 7);
    g.stroke();
  };
  const closed = (s, curve) => {
    const cx = 256 + s * 52, cy = 266;
    g.strokeStyle = C.eye;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx - 24, cy - curve * 0.3);
    g.quadraticCurveTo(cx, cy + curve, cx + 24, cy - curve * 0.3);
    g.stroke();
  };
  for (const s of [-1, 1]) {
    if (mood === 'blink') closed(s, 6);
    else if (mood === 'happy') closed(s, -12);
    else if (mood === 'surprised') eye(s, { open: 0.95, look: 0 });
    else if (mood === 'sad') eye(s, { open: 0.45, look: 0.5 });
    else eye(s, { open: 0.55, look: 0.35 });
  }

  // a fine nose, just a shadow
  g.strokeStyle = 'rgba(80,130,145,0.55)';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(262, 272);
  g.quadraticCurveTo(268, 292, 258, 300);
  g.stroke();

  // mouth: a shy, lopsided smile; open when he talks
  g.strokeStyle = '#4f7f8c';
  g.fillStyle = '#3a5f6a';
  g.lineWidth = 5.5;
  if (mood === 'talk') {
    g.beginPath();
    g.ellipse(258, 326, 13, 9, 0, 0, TAU);
    g.fill();
  } else if (mood === 'happy') {
    g.beginPath();
    g.moveTo(228, 316);
    g.quadraticCurveTo(258, 330, 290, 312);
    g.quadraticCurveTo(260, 350, 228, 316);
    g.fill();
  } else if (mood === 'sad') {
    g.beginPath();
    g.moveTo(240, 330);
    g.quadraticCurveTo(258, 322, 278, 330);
    g.stroke();
  } else if (mood === 'surprised') {
    g.beginPath();
    g.ellipse(258, 328, 10, 13, 0, 0, TAU);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(236, 320);
    g.quadraticCurveTo(258, 332, 282, 316);
    g.stroke();
  }
}

// ---------------------------------------------------------------- the coat, painted in code
function coatTexture() {
  // Slate-blue wool, darker at the folds, a paler edge down the opening, and a hem that fades
  return paint(256, 128, (g, w, h) => {
    g.fillStyle = C.coat;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 20) {
      const grad = g.createLinearGradient(x, 0, x + 20, 0);
      grad.addColorStop(0, 'rgba(10,20,30,0.3)');
      grad.addColorStop(0.5, 'rgba(160,200,220,0.07)');
      grad.addColorStop(1, 'rgba(10,20,30,0.3)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 20, h);
    }
    // the front edges of the coat (u 0 and 1 are the front) and a pocket flap each side
    g.fillStyle = C.coatEdge;
    g.fillRect(w * 0.012, 0, 3, h);
    g.fillRect(w * 0.988 - 3, 0, 3, h);
    g.fillStyle = C.coatDark;
    g.fillRect(w * 0.07, h * 0.22, 24, 8);
    g.fillRect(w * 0.93 - 24, h * 0.22, 24, 8);
    g.fillStyle = C.brass;
    for (const x of [w * 0.07 + 12, w * 0.93 - 12]) { g.beginPath(); g.arc(x, h * 0.25, 2.5, 0, TAU); g.fill(); }
  }, { flipY: false });
}

function chestTexture() {
  // The chest: the coat's slate, with the waistcoat (a darker blue with its own small buttons) showing at the front
  return paint(256, 128, (g, w, h) => {
    g.fillStyle = C.coat;
    g.fillRect(0, 0, w, h);
    // (a lathe's u 0 and 1 are the front)
    g.fillStyle = '#22324a';
    g.fillRect(0, 0, w * 0.05, h);
    g.fillRect(w * 0.95, 0, w * 0.05, h);
  }, { flipY: true, wrap: true });
}

function fadeAlpha() {
  // Solid at the waist, thinning into mist in streaks toward the hem
  return paint(128, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#eeeeee');
    grad.addColorStop(1, '#141414');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const r = rng(3);
    for (let i = 0; i < 16; i++) {
      const x = r() * W;
      const s = g.createLinearGradient(0, H * 0.4, 0, H);
      s.addColorStop(0, 'rgba(0,0,0,0)');
      s.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = s;
      g.fillRect(x, H * 0.4, 3 + r() * 8, H * 0.6);
    }
  }, { srgb: false, flipY: false });
}

// ---------------------------------------------------------------- Silas's wayside things
// Witch Way's own props for the lantern path (game/art/props/kettle.webp, crock.webp, bench.webp), in 3D:
// an iron cauldron-kettle hung from an A-frame over a ring of embers, the moonwater crock on a mossy stump (a lilac
// jug with a gold moon on it), and a plank bench gone green with moss. Each returns { root, update(dt), radius }.

const PROP = { wood: '#6a4a32', woodDark: '#4a3222', iron: '#2c2834', ironRim: '#4a4454', stone: '#6e6878', moss: '#5f8a44', mossDark: '#3f6a34', brew: '#b88af0', rope: '#a88a5a' };

export function createWaysideKettle() {
  const root = new THREE.Group();
  root.name = 'wayside-kettle';
  const piece = makePart(inkMat('#12091a'));
  // the A-frame: three poles leaning together, lashed with rope at the top
  const top = new THREE.Vector3(0, 1.05, 0);
  const poles = [];
  for (const a of [0.5, 0.5 + TAU / 3, 0.5 + (2 * TAU) / 3]) {
    const foot = new THREE.Vector3(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46);
    poles.push(taperedTube([[foot.x, 0, foot.z], [foot.x * 0.5, 0.55, foot.z * 0.5], [top.x - foot.x * 0.08, top.y + 0.1, top.z - foot.z * 0.08]], 0.028, 0.02, 6, 5));
  }
  piece(root, merge(poles), toon(PROP.wood), {});
  piece(root, new THREE.TorusGeometry(0.045, 0.014, 5, 10), toon(PROP.rope), { pos: [0, 1.02, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  // the chain and the kettle swinging on it
  const swing = joint(root, [0, 1.0, 0], 'swing');
  piece(swing, merge([0, 1, 2, 3, 4, 5].map((i) => new THREE.TorusGeometry(0.018, 0.005, 4, 8).rotateY((i % 2) * Math.PI / 2).translate(0, -0.03 - i * 0.034, 0))), toon('#3a3640'), { ink: false });
  const pot = joint(swing, [0, -0.62, 0], 'pot');
  piece(pot, lathe([[0.02, -0.02], [0.16, 0.0], [0.22, 0.08], [0.23, 0.16], [0.2, 0.25], [0.17, 0.28], [0.18, 0.3], [0.165, 0.31]], 16), toon(PROP.iron, { side: THREE.DoubleSide }), {});
  piece(pot, new THREE.TorusGeometry(0.2, 0.01, 4, 14, Math.PI).rotateY(Math.PI / 2), toon('#3a3640'), { pos: [0, 0.3, 0], ink: false });
  for (const s of [-1, 1]) piece(pot, new THREE.CylinderGeometry(0.018, 0.02, 0.07, 6), toon(PROP.iron), { pos: [s * 0.1, -0.02, 0.06], ink: false });
  // the brew: violet, glowing, and steaming
  const brew = piece(pot, new THREE.CircleGeometry(0.16, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: PROP.brew }), { pos: [0, 0.27, 0], ink: false });
  const brewGlow = glowSprite('#c9a0ff', 0.6, 0.5);
  brewGlow.position.y = 0.34;
  pot.add(brewGlow);
  // the ring of stones round the embers
  piece(root, merge(Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU;
    return new THREE.SphereGeometry(0.075, 7, 5).scale(1.2, 0.6, 1).translate(Math.cos(a) * 0.26, 0.035, Math.sin(a) * 0.26);
  })), toon(PROP.stone), {});
  piece(root, merge(Array.from({ length: 7 }, (_, i) => {
    const a = i * 2.3, r = 0.04 + (i % 3) * 0.05;
    return new THREE.SphereGeometry(0.035, 6, 4).scale(1.3, 0.5, 1).translate(Math.cos(a) * r, 0.03, Math.sin(a) * r);
  })), new THREE.MeshBasicMaterial({ color: '#ff7a2a' }), { ink: false });
  const embers = glowSprite('#ff8a3a', 0.9, 0.55);
  embers.position.y = 0.12;
  root.add(embers);
  const light = new THREE.PointLight('#ff9a4a', 1.3, 2.6, 2);
  light.position.set(0, 0.35, 0.1);
  root.add(light);
  // ivy on the poles
  piece(root, merge(Array.from({ length: 8 }, (_, i) => {
    const t = 0.25 + (i % 4) * 0.17, a = 0.5 + Math.floor(i / 4) * (TAU / 3);
    return new THREE.SphereGeometry(0.035, 5, 4).scale(1.3, 0.6, 1).translate(Math.cos(a) * 0.46 * (1 - t), t * 1.05, Math.sin(a) * 0.46 * (1 - t) + 0.02);
  })), toon(PROP.moss), { ink: false });
  // steam: violet-white puffs that rise and fade
  const steam = Array.from({ length: 5 }, (_, i) => {
    const s = glowSprite('#e8dcff', 0.12, 0);
    pot.add(s);
    return { s, age: i / 5, seed: i * 1.3 };
  });
  root.add(blobShadow(0.55, 0.35));
  onLayer(root);
  let t = 0;
  return {
    root, radius: 0.42, name: 'the wayside kettle',
    update(dt) {
      t += dt;
      swing.rotation.z = Math.sin(t * 0.9) * 0.02;
      swing.rotation.x = Math.cos(t * 0.7) * 0.015;
      const f = 1 + Math.sin(t * 7.1) * 0.08 + Math.sin(t * 12.7) * 0.06;
      light.intensity = 1.3 * f;
      embers.material.opacity = 0.5 * f;
      brewGlow.material.opacity = 0.45 + Math.sin(t * 2) * 0.08;
      brew.position.y = 0.27 + Math.sin(t * 3) * 0.004;
      for (const p of steam) {
        p.age += dt / 2.4;
        if (p.age >= 1) p.age -= 1;
        const a = p.age;
        p.s.position.set(Math.sin(a * 4 + p.seed) * 0.06, 0.32 + a * 0.55, Math.cos(a * 3 + p.seed) * 0.04);
        p.s.material.opacity = Math.sin(a * Math.PI) * 0.45;
        p.s.scale.setScalar(0.1 + a * 0.22);
      }
    },
  };
}

export function createCrock() {
  const root = new THREE.Group();
  root.name = 'moonwater-crock';
  const piece = makePart(inkMat('#12091a'));
  // the stump, with roots
  piece(root, lathe([[0.2, 0], [0.16, 0.04], [0.14, 0.1], [0.14, 0.3], [0.001, 0.31]], 12), toon('#5a3e2c'), {});
  piece(root, new THREE.CircleGeometry(0.135, 12).rotateX(-Math.PI / 2), toon('#b08a5a'), { pos: [0, 0.312, 0], ink: false });
  piece(root, merge(Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + 0.3;
    return new THREE.SphereGeometry(0.05, 6, 4).scale(1, 0.5, 1).translate(Math.cos(a) * 0.17, 0.05 + (i % 2) * 0.1, Math.sin(a) * 0.15);
  })), toon(PROP.moss), { ink: false });
  // the jug: lilac glaze, a gold moon on its belly, a handle, and moonwater at the neck
  const jug = joint(root, [0, 0.31, 0], 'jug');
  piece(jug, lathe([[0.001, 0], [0.09, 0.01], [0.12, 0.08], [0.115, 0.16], [0.07, 0.24], [0.055, 0.28], [0.07, 0.31]], 14), toon('#aaa2cc', { side: THREE.DoubleSide }), {});
  piece(jug, new THREE.TorusGeometry(0.06, 0.013, 5, 10, Math.PI * 1.2), toon('#aaa2cc'), { pos: [-0.1, 0.19, 0], rot: [0, 0, 1.8], ink: false });
  piece(jug, badge(crescentShape(0.04, 0.8, 0.45), 0.006), toon('#e8c060', { emissive: new THREE.Color('#6a4a00'), emissiveIntensity: 0.4 }), { pos: [0, 0.12, 0.118], rot: [0, 0, 0.4], ink: false });
  const water = piece(jug, new THREE.CircleGeometry(0.058, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#cfe0ff' }), { pos: [0, 0.29, 0], ink: false });
  const glint = glowSprite('#bcd4ff', 0.35, 0.5);
  glint.position.y = 0.33;
  jug.add(glint);
  root.add(blobShadow(0.3, 0.35));
  onLayer(root);
  let t = 0, full = 1;
  return {
    root, radius: 0.22, name: 'the moonwater crock',
    setFull(on) { full = on ? 1 : 0; water.material.color.set(on ? '#cfe0ff' : '#3a3450'); },
    update(dt) {
      t += dt;
      glint.material.opacity = full * (0.4 + Math.sin(t * 2.3) * 0.12);
    },
  };
}

export function createBench() {
  const root = new THREE.Group();
  root.name = 'wayside-bench';
  const piece = makePart(inkMat('#12091a'));
  const wood = toon(PROP.wood), dark = toon(PROP.woodDark);
  const W = 1.1;
  // legs and armrests, seat planks, back rest
  piece(root, merge([
    ...[-1, 1].flatMap((s) => [
      new THREE.BoxGeometry(0.07, 0.42, 0.07).translate(s * (W / 2 - 0.06), 0.21, 0.14),
      new THREE.BoxGeometry(0.07, 0.8, 0.07).translate(s * (W / 2 - 0.06), 0.4, -0.16),
      new THREE.BoxGeometry(0.08, 0.05, 0.42).translate(s * (W / 2 - 0.04), 0.58, -0.01),
    ]),
  ]), dark, {});
  piece(root, merge([
    new THREE.BoxGeometry(W, 0.045, 0.17).translate(0, 0.43, 0.08).rotateZ(0.01),
    new THREE.BoxGeometry(W, 0.045, 0.16).translate(0, 0.43, -0.09).rotateZ(-0.012),
    new THREE.BoxGeometry(W - 0.04, 0.12, 0.04).translate(0, 0.66, -0.17),
    new THREE.BoxGeometry(W - 0.08, 0.1, 0.04).translate(0, 0.52, -0.17).rotateZ(0.015),
  ]), wood, {});
  // moss and ivy along it
  piece(root, merge(Array.from({ length: 9 }, (_, i) => {
    const x = (i / 8 - 0.5) * W * 0.95, top = i % 3 === 0;
    return new THREE.SphereGeometry(0.035 + (i % 2) * 0.012, 5, 4).scale(1.4, 0.5, 1).translate(x, top ? 0.72 : 0.45, top ? -0.17 : 0.15);
  })), toon(PROP.moss), { ink: false });
  piece(root, merge([-1, 1].map((s) => new THREE.SphereGeometry(0.07, 6, 4).scale(1, 0.7, 1).translate(s * (W / 2 - 0.02), 0.04, 0.14))), toon(PROP.mossDark), { ink: false });
  root.add(blobShadow(0.62, 0.35));
  onLayer(root);
  return { root, radius: 0.3, name: 'the wayside bench', update() {} };
}
