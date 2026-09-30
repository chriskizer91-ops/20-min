import * as THREE from 'three';
import { toon, toonMap, part, joint, sphere, cyl, lathe, taperedTube, badge, starShape, blobShadow, glowSprite, onLayer, Spring } from './kit.js';
import {
  bladeGeometry, beakGeometry, PROFILE, canvasTexture, merge, mixColor, Particles, sparkSprite, twinkleTexture, worldPos, holdOrientation,
  ss, win, arch, lerp, clamp,
} from './party-kit.js';

// Inkblot, Mister Quill's crow, from Follow Me Down Witch Way: "a glossy black crow with a blue-violet sheen, amber
// eyes, a tiny brass ring on one leg, and a gap in his tail where a feather is missing." A thief with good
// intentions; he only says "Kraa." In battle he is the party's relic-thief: he pecks, pinches, pries relics loose,
// shouts "Kraa!" so foes look at him instead, and flies brews to friends.
// Built like the witch: toon shading, ink outlines, joints for every limb, and layered feathers (each one a
// flattened spindle) on wings that really fold and spread. He is small (0.44 m); the battle screen scales him up.

const C = {
  feather: '#221c35', dark: '#141022', sheen: '#6f5ee0', sheen2: '#4f86e0', beak: '#34303d', leg: '#2a2632',
  iris: '#ffab1f', pupil: '#120a12', ring: '#e0ae4c', cord: '#a0304a', charm: '#e6e2d4', flame: '#c77dff',
};
const HIP = 0.15; // hip height when standing
const TILT = 0.55; // the body leans back this much, head up, tail down
const L1 = 0.07, L2 = 0.085; // drumstick and bare leg
const FOOT = 0.012; // the foot joint's height above the ground when standing
const HIP_X = 0.028;
const PRIMARY_SPREAD = [0.3, 0.55, 0.8, 1.05, 1.3]; // fan angles of the five "fingers" with the wing open
const ARM = 0.055, FOREARM = 0.07; // wing bones: shoulder to elbow, elbow to wrist
const TAIL_SLOTS = 8, TAIL_GAP = 5; // one slot left empty: the missing feather

export function createInkblot() {
  const root = new THREE.Group();
  root.name = 'inkblot';
  const mover = joint(root, [0, 0, 0], 'mover'); // darts, flight paths and turns
  const hips = joint(mover, [0, HIP, 0], 'hips'); // the body pivots here
  const trunk = joint(hips, [0, 0.07, 0.005], 'trunk');
  trunk.rotation.x = -TILT;

  // ---------------------------------------------------------------- body: an egg of overlapping feathers
  const bodyTex = scallops({ cols: 10, rows: 9, base: C.feather, dark: C.dark, edge: C.sheen, strength: 0.42 });
  const bodyMat = toonMap(bodyTex);
  const torsoGeo = lathe([[0.002, -0.15], [0.03, -0.14], [0.056, -0.11], [0.076, -0.062], [0.087, -0.01], [0.089, 0.035], [0.083, 0.074], [0.066, 0.106], [0.036, 0.127], [0.002, 0.133]], 16);
  torsoGeo.rotateX(Math.PI / 2); // along +z (the front)
  const torso = part(trunk, torsoGeo, bodyMat);
  const breastTex = scallops({ cols: 12, rows: 8, base: C.feather, dark: C.dark, edge: C.sheen2, sheenByU: false, strength: 0.26 });
  const breast = part(trunk, sphere(0.068, 14, 10), toonMap(breastTex), { pos: [0, -0.024, 0.058], scale: [1.02, 0.98, 0.95] });
  part(trunk, sphere(0.056, 12, 8), toonMap(breastTex), { pos: [0, 0.03, 0.094] }); // the thick neck, under the head

  // ---------------------------------------------------------------- head, beak, eyes
  const neck = joint(trunk, [0, 0.042, 0.1], 'neck');
  neck.rotation.x = TILT; // level again
  const head = joint(neck, [0, 0.052, 0.018], 'head');
  head.rotation.order = 'YXZ';
  const headTex = scallops({ cols: 16, rows: 8, base: C.feather, dark: C.dark, edge: C.sheen, sheenByU: false, strength: 0.22 });
  part(head, sphere(0.07, 18, 14), toonMap(headTex), { scale: [0.94, 0.9, 1.06] });
  // the scruffy crown: a few feathers at the back that never lie flat
  const crown = part(head, merge([
    taperedTube([[0.004, 0.056, -0.012], [0.008, 0.07, -0.03], [0.012, 0.07, -0.048]], 0.01, 0.0015, 8, 5),
    taperedTube([[-0.008, 0.054, -0.022], [-0.012, 0.066, -0.042], [-0.01, 0.064, -0.06]], 0.009, 0.0015, 8, 5),
    taperedTube([[0.012, 0.05, -0.03], [0.02, 0.058, -0.05], [0.024, 0.052, -0.066]], 0.008, 0.0015, 8, 5),
  ]), toon(C.feather));
  // shaggy throat hackles, like the portrait's
  const hackles = part(head, merge([-0.02, 0, 0.02].map((x) =>
    taperedTube([[x, -0.038, 0.036], [x * 1.3, -0.062, 0.024], [x * 1.4, -0.08, 0.004]], 0.013, 0.002, 8, 5))), toon(C.feather));

  const beak = joint(head, [0, -0.014, 0.054], 'beak');
  const beakMat = toon(C.beak);
  part(beak, beakGeometry(0.082, 0.036, 0.025, 0.013, 'upper'), beakMat);
  // the bristles that cover the base of a crow's beak
  part(beak, merge([-0.008, 0, 0.008].map((x) =>
    taperedTube([[x, 0.012, -0.004], [x * 0.9, 0.022, 0.018], [x * 0.7, 0.017, 0.042]], 0.009, 0.0015, 8, 5))), toon(C.feather));
  const jaw = joint(beak, [0, 0, 0], 'jaw');
  part(jaw, beakGeometry(0.07, 0.032, 0.014, 0.007, 'lower'), beakMat);
  const beakTip = joint(beak, [0, -0.012, 0.074], 'beak-tip');

  const irisMat = new THREE.MeshBasicMaterial({ color: C.iris });
  const pupilMat = new THREE.MeshBasicMaterial({ color: C.pupil });
  const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [-1, 1].map((s) => {
    const e = joint(head, [s * 0.043, 0.006, 0.043]);
    e.rotation.y = s * 0.74;
    const lid = joint(e, [0, 0, 0]);
    part(lid, sphere(0.0168, 14, 10), toon(C.dark), { scale: [1.06, 1.06, 0.5], pos: [0, 0, -0.002], ink: false }); // the dark rim
    part(lid, sphere(0.0158, 14, 10), irisMat, { scale: [1, 1, 0.5], ink: false });
    part(lid, sphere(0.0082, 10, 8), pupilMat, { pos: [0, 0, 0.0062], scale: [1, 1, 0.5], ink: false });
    part(lid, sphere(0.0034, 6, 5), glintMat, { pos: [s * -0.003, 0.0058, 0.0098], ink: false });
    return lid;
  });
  // feathered brow ridges: they frown, rise and scheme
  const brows = [-1, 1].map((s) => {
    const b = joint(head, [s * 0.037, 0.028, 0.049]);
    b.rotation.set(0.25, s * 0.55, 0, 'YXZ');
    part(b, sphere(0.015, 10, 6), toon(C.dark), { scale: [1.6, 0.42, 0.8] });
    return { b, s };
  });

  // ---------------------------------------------------------------- the charm: a little brass key on a red thread
  const collar = joint(trunk, [0, 0.03, 0.098]);
  collar.rotation.x = -0.9;
  part(collar, new THREE.TorusGeometry(0.051, 0.0028, 4, 20, Math.PI), toon(C.cord), { rot: [0, 0, Math.PI], ink: false });
  const keyPivot = joint(collar, [0, -0.051, 0.0]);
  const key = joint(keyPivot, [0, 0, 0]);
  part(key, merge([
    new THREE.TorusGeometry(0.007, 0.0022, 5, 10).translate(0, -0.008, 0),
    new THREE.CylinderGeometry(0.0022, 0.0022, 0.022, 5).translate(0, -0.025, 0),
    new THREE.BoxGeometry(0.008, 0.005, 0.003).translate(0.004, -0.033, 0),
  ]), toon(C.ring), { scale: 1 });

  // ---------------------------------------------------------------- wings
  // Three bones, as a bird's: the arm (tertials), the forearm (coverts and four secondaries) and the hand (five long
  // primaries, the "fingers" a crow shows in flight). Folded, the arm points back along his side, the forearm doubles
  // forward over it and the hand points back again, so the wing's top faces out and the feathers close up behind it;
  // open, every bone lines up and the feathers fan out. Each joint slerps between the two.
  const featherMat = toonMap(featherTexture(C.feather, C.sheen));
  const primaryMat = toonMap(featherTexture(C.dark, C.sheen2));
  const covertMat = toonMap(featherTexture(C.feather, C.sheen, true));
  const secGeo = bladeGeometry(0.11, 0.038, { thick: 0.12, profile: PROFILE.feather, bend: -0.008 });
  const priGeos = [0.17, 0.185, 0.195, 0.198, 0.185].map((len, i) => bladeGeometry(len, 0.036 - i * 0.0022, { thick: 0.11, profile: PROFILE.primary, bend: -0.012 }));
  const basis = (x, y) => {
    const X = new THREE.Vector3(...x).normalize(), Y = new THREE.Vector3(...y);
    Y.addScaledVector(X, -Y.dot(X)).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, new THREE.Vector3().crossVectors(X, Y)));
  };
  const euler = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  const wings = [-1, 1].map((s) => {
    // Folded orientations in the body's frame (x: the bone, y: the wing's top, z: toward its leading edge)
    const armFold = basis([0, -0.3 * s, -s], [-s, 0.25, 0]); // back and down; top turned in, under the forearm
    const foreFold = basis([0, 0.1 * s, s], [s, 0.4, 0]); // forward; top facing out
    const handFold = basis([-0.12, -0.14 * s, -s], [s, 0.4, 0]); // back again, tips drawn in over the tail
    const Q = {
      armSpread: euler(0, s * 0.1, 0), armFold,
      foreSpread: euler(0, -s * 0.08, 0), foreFold: armFold.clone().invert().multiply(foreFold),
      handSpread: euler(0, s * 0.18, 0), handFold: foreFold.clone().invert().multiply(handFold),
    };
    const shoulder = joint(trunk, [s * 0.07, 0.05, 0.058]);
    part(shoulder, merge([0, 1].map((i) => bladeGeometry(0.085, 0.034, { thick: 0.13, profile: PROFILE.feather, bend: -0.005 }).translate(s * (0.014 + i * 0.024), 0.004 - i * 0.003, 0.002))), featherMat);
    const elbow = joint(shoulder, [s * ARM, 0, 0]);
    // coverts: two rows of short feathers along the forearm (merged: one mesh, one outline, every edge drawn)
    const coverts = [];
    for (let i = 0; i < 4; i++) {
      coverts.push(bladeGeometry(0.046, 0.032, { thick: 0.16, profile: PROFILE.covert }).rotateY(s * 0.25).translate(s * (0.0 + i * 0.022), 0.012, 0.012));
      coverts.push(bladeGeometry(0.066, 0.034, { thick: 0.14, profile: PROFILE.covert }).rotateY(s * 0.2).translate(s * (0.006 + i * 0.022), 0.008, -0.004));
    }
    part(elbow, merge(coverts), covertMat);
    const secondaries = [0, 1, 2, 3].map((i) => {
      const j = joint(elbow, [s * (0.004 + i * 0.021), 0.004 - i * 0.0026, -0.006]);
      part(j, secGeo, featherMat);
      return j;
    });
    const wrist = joint(elbow, [s * FOREARM, 0, 0]);
    const primaries = priGeos.map((geo, i) => {
      const j = joint(wrist, [s * i * 0.009, -0.009 - i * 0.0026, 0.002]);
      part(j, geo, primaryMat);
      return j;
    });
    return { s, shoulder, elbow, wrist, secondaries, primaries, Q };
  });

  // ---------------------------------------------------------------- tail, with the gap
  const tail = joint(trunk, [0, 0.014, -0.122], 'tail');
  const tailFeathers = [];
  for (let i = 0; i < TAIL_SLOTS; i++) {
    if (i === TAIL_GAP) continue;
    const mid = Math.abs(i - (TAIL_SLOTS - 1) / 2);
    const j = joint(tail, [0, 0.0028 * (4 - mid), 0]);
    part(j, bladeGeometry(0.158 - mid * 0.006, 0.042, { thick: 0.11, profile: PROFILE.tail, bend: -0.006 }), featherMat);
    tailFeathers.push({ j, i });
  }
  part(trunk, sphere(0.04, 10, 8), bodyMat, { pos: [0, -0.012, -0.118], scale: [1, 0.7, 1.3] }); // under-tail coverts

  // ---------------------------------------------------------------- legs, feet, the brass ring
  const legMat = toonMap(legTexture());
  const footGeo = merge([
    ...[-0.015, 0, 0.015].map((dx) => taperedTube([[0, 0, 0], [dx * 0.5, -0.003, 0.02], [dx, -0.007, 0.04], [dx * 1.05, -0.012, 0.047]], 0.0056, 0.0014, 8, 5)),
    taperedTube([[0, 0, 0], [0, -0.004, -0.017], [0, -0.01, -0.029]], 0.0052, 0.0014, 6, 5),
  ]);
  const legs = [-1, 1].map((s) => {
    const hip = joint(hips, [s * HIP_X, -0.004, 0]);
    part(hip, sphere(0.024, 10, 8), toon(C.feather), { pos: [0, -0.018, 0.002], scale: [0.95, 1.2, 1.1] }); // the feathered thigh
    part(hip, cyl(0.013, 0.008, L1 * 0.85, 7), toon(C.feather), { pos: [0, -L1 * 0.52, 0] });
    const heel = joint(hip, [0, -L1, 0]);
    part(heel, sphere(0.0082, 8, 6), toon(C.leg), { ink: false });
    part(heel, cyl(0.0062, 0.0056, L2, 7), legMat, { pos: [0, -L2 / 2, 0] });
    const foot = joint(heel, [0, -L2, 0]);
    part(foot, footGeo, toon(C.leg), { pos: [0, -0.003, 0] });
    return { s, hip, heel, foot };
  });
  // The ring is on his right leg (x -): brass, a little worn
  part(legs[0].heel, new THREE.TorusGeometry(0.0094, 0.0034, 6, 14), toon(C.ring, { emissive: '#3a2400' }), { pos: [0, -L2 * 0.58, 0], rot: [Math.PI / 2, 0, 0] });

  // ---------------------------------------------------------------- things he carries
  // The loot: whatever he pinched, held in his beak (a stolen light, by default: a Wickhollow flame)
  const loot = joint(beakTip, [0, -0.002, 0.008], 'loot');
  part(loot, sphere(0.011, 10, 8), new THREE.MeshBasicMaterial({ color: '#f4e4ff' }), { ink: false });
  const lootGlow = glowSprite(C.flame, 0.16, 0.9);
  loot.add(lootGlow);
  const lootTwinkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: twinkleTexture(), color: '#fff2c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lootTwinkle.scale.setScalar(0.09);
  loot.add(lootTwinkle);
  loot.visible = false;
  // A brew for Fetch, carried in his feet
  const bottlePivot = joint(legs[1].foot, [0, -0.008, 0.02]);
  const bottle = joint(bottlePivot, [0, 0, 0]);
  part(bottle, lathe([[0.001, -0.04], [0.016, -0.038], [0.018, -0.02], [0.01, -0.006], [0.0065, 0.0], [0.007, 0.006]].reverse(), 10), new THREE.MeshToonMaterial({ color: '#b8ffd0', transparent: true, opacity: 0.8 }));
  part(bottle, sphere(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#6dffa0' }), { pos: [0, -0.026, 0], ink: false });
  part(bottle, cyl(0.006, 0.0055, 0.01, 6), toon('#8a5a36'), { pos: [0, 0.008, 0], ink: false });
  const bottleGlow = glowSprite('#7dffb0', 0.14, 0.6);
  bottleGlow.position.y = -0.024;
  bottle.add(bottleGlow);
  bottlePivot.visible = false;
  // Dizzy stars, when he's knocked down
  const stars = joint(head, [0, 0.1, -0.01]);
  const starMat = new THREE.MeshBasicMaterial({ color: '#ffe38a' });
  const starMeshes = [0, 1, 2].map(() => part(stars, badge(starShape(0.016), 0.004), starMat, { ink: false }));
  stars.visible = false;

  const shadow = blobShadow(0.17, 0.45);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- effects in the world (the scene adds `fx`)
  const fx = new THREE.Group();
  fx.name = 'inkblot-fx';
  const sparkles = new Particles(fx, 18, () => sparkSprite('#fff2c0', twinkleTexture()));
  const glows = new Particles(fx, 8, () => sparkSprite('#c77dff'));
  const featherBits = new Particles(fx, 6, () => new THREE.Mesh(bladeGeometry(0.05, 0.018, { thick: 0.2, profile: PROFILE.feather, bend: 0.01 }), toon(C.feather)));
  const rings = new Particles(fx, 4, () => new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 4, 28), new THREE.MeshBasicMaterial({ color: '#ffe7b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---------------------------------------------------------------- animation
  // Every frame builds a pose (P) from the rest pose: locomotion, idle habits and the current move each add to it;
  // then the pose drives the joints (the legs by a little two-bone IK so the feet stay planted).
  const P = makePose();
  const S = {
    yaw: new Spring(260, 28), pitch: new Spring(260, 28), roll: new Spring(200, 22),
    tail: new Spring(110, 9), spread: new Spring(90, 12), puff: new Spring(60, 9), key: new Spring(50, 4), keyZ: new Spring(50, 4),
  };
  let time = 0, walkPh = 0, hopPh = 0, flapPh = 0, prevSpeed = 0;
  let walkAmt = 0, hopAmt = 0, flyAmt = 0;
  let look = { yaw: 0, pitch: 0, roll: 0 }, nextLook = 1, blinkT = 2.5, habit = null, nextHabit = 3;
  let action = null, perched = false, downed = false, mood = 'calm';
  const ACTIONS = {
    peck: 0.9, pinch: 1.8, kraa: 1.3, caw: 0.8, fetch: 2.8, preen: 2.4, puff: 1.9,
    hop: 2.8, walk: 3.6, fly: 4.2, perch: 0.9, cheer: 1.6, hurt: 0.6, ko: 1.3, rise: 0.9,
  };
  const ALIAS = { attack: 'peck', provoke: 'kraa' };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const eu = new THREE.Euler(), AX = new THREE.Vector3(1, 0, 0);

  function spawnRing(k) {
    const p = rings.spawn(worldPos(beakTip, v1), { life: 0.45, size: 0.03, grow: 5 + k * 2, opacity: 0.8 });
    beakTip.getWorldQuaternion(p.o.quaternion);
    p.o.position.add(v2.set(0, 0, 0.02).applyQuaternion(p.o.quaternion));
  }
  function burst(at, n, { color = '#fff2c0', speed = 0.8, size = 0.05, up = 0.4 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = speed * (0.4 + Math.random() * 0.6);
      sparkles.spawn(at, { vel: [Math.cos(a) * r, up + Math.random() * 0.5, Math.sin(a) * r], life: 0.5 + Math.random() * 0.4, size: size * (0.6 + Math.random() * 0.8), drag: 3, color });
    }
  }
  function loseFeathers(n) {
    const at = worldPos(trunk, v1);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      featherBits.spawn(at, { vel: [Math.cos(a) * 0.5, 0.6 + Math.random() * 0.4, Math.sin(a) * 0.5], life: 1.4, size: 1, gravity: 1.2, drag: 2.5, spin: [3 + Math.random() * 4, 2, 5 * (Math.random() - 0.5)], rot: [Math.random() * 6, Math.random() * 6, 0] });
    }
  }

  const api = {
    root, head, beakTip, fx,
    name: 'Inkblot',
    height: 0.44,
    radius: 0.14,
    center: 0.24,
    // Moves: peck (hop in and peck; also 'attack'), pinch (dart in, snatch, flutter back with it), kraa (the
    // provoke: puff up, mantle and shout), caw, fetch (fly a brew to a friend), preen, puff (proud), and three
    // walks to show off: hop, walk, fly (take off, circle, land). perch settles him down until he's moved again.
    // cheer, hurt, ko (sits down, dazed), rise. opts.reach: how far peck, pinch and fetch go (m).
    moves: ['peck', 'pinch', 'kraa', 'caw', 'fetch', 'preen', 'puff', 'hop', 'walk', 'fly', 'perch', 'cheer', 'hurt', 'ko', 'rise'],
    get busy() { return !!action; },
    get perched() { return perched; },
    setMood(m) { mood = m; },
    play(name, onHit, opts = {}) {
      name = ALIAS[name] ?? name;
      if (!ACTIONS[name]) return;
      const reach = opts.reach ?? { peck: 0.3, pinch: 1.1, fetch: 1.2 }[name] ?? 0;
      if (name === 'rise') downed = false;
      if (name !== 'perch') perched = false;
      action = { name, t: 0, dur: ACTIONS[name] * (opts.slow ?? 1), onHit, hit: false, reach, fired: {} };
    },
    update(dt, speed = 0, turn = 0) {
      time += dt;
      resetPose(P);
      const accel = (speed - prevSpeed) / Math.max(dt, 1e-3);
      prevSpeed = speed;
      if (speed > 0.05) perched = false;

      // ---- locomotion: walk when slow, hop when quicker, fly when fast. The demo moves drive it too.
      let gait = speed, demoTurn = 0;
      if (action && ['walk', 'hop', 'fly'].includes(action.name)) gait = 0; // they drive their own
      const rate = 1 - Math.exp(-dt * 6);
      walkAmt += ((gait > 0.02 && gait < 0.7 ? 1 : 0) - walkAmt) * rate;
      hopAmt += ((gait >= 0.7 && gait < 1.8 ? 1 : 0) - hopAmt) * rate;
      flyAmt += ((gait >= 1.8 ? 1 : 0) - flyAmt) * (1 - Math.exp(-dt * 3));
      walkPh += (Math.min(gait, 0.7) * dt / 0.14) * Math.PI * 2;
      hopPh = (hopPh + dt * Math.max(0.8, gait / (0.12 + gait * 0.08)) * (hopAmt > 0.01 ? 1 : 0)) % 1;
      flapPh += dt * Math.PI * 2 * 5.2;
      if (walkAmt > 0.01) walkGait(P, walkAmt, walkPh);
      if (hopAmt > 0.01) hopGait(P, hopAmt, hopPh);
      if (flyAmt > 0.01) flyGait(P, flyAmt, flapPh, -turn * 0.25);
      P.pitch += clamp(accel * 0.01, -0.15, 0.15) * (1 - flyAmt);

      const still = walkAmt + hopAmt + flyAmt < 0.05 && !action;
      // ---- persistent poses: perched on something, or knocked down
      if (perched && !action) perchPose(P, 1);
      if (downed && !action) koPose(P, 1);

      // ---- idle habits: a bird's head moves in snaps; he blinks, flicks his tail, pecks at nothing, shuffles
      if ((nextLook -= dt) < 0) {
        const curious = Math.random() < 0.3;
        look = { yaw: (Math.random() - 0.5) * (perched ? 1.2 : 1.8), pitch: (Math.random() - 0.4) * 0.45, roll: curious ? (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.2) : 0 };
        nextLook = 0.35 + Math.random() * (perched ? 2.5 : 1.6);
      }
      if (still && !downed) {
        P.headYaw += look.yaw; P.headPitch += look.pitch; P.headRoll += look.roll;
        if (!perched && (nextHabit -= dt) < 0) {
          habit = { name: ['peckGround', 'shuffle', 'flick', 'caw', 'peckGround', 'flick'][Math.floor(Math.random() * 6)], t: 0 };
          nextHabit = 3 + Math.random() * 4;
        }
      } else if (!still) habit = null;
      if (habit) {
        habit.t += dt;
        const h = habit.t;
        switch (habit.name) {
          case 'peckGround': { const d = 0.6, k = h / d, p = arch(k, 0, 1), jab = arch(k, 0.35, 0.6);
            P.pitch += p * 0.45; P.headPitch += p * 0.35 + jab * 0.35; P.neckZ += jab * 0.012; P.beak += arch(k, 0.25, 0.45) * 0.4; P.headYaw -= look.yaw * p;
            if (k >= 1) habit = null; break; }
          case 'shuffle': { const k = h / 0.55, p = arch(k, 0, 1);
            for (const w of P.wings) { w.fold -= p * 0.22; w.flap += p * 0.1; } P.puff += p * 0.5; P.roll += Math.sin(h * 30) * 0.04 * p;
            if (k >= 1) habit = null; break; }
          case 'flick': { const k = h / 0.4, p = arch(k, 0, 1);
            P.tailPitch -= p * 0.35; P.tailSpread += p * 0.6;
            if (k >= 1) habit = null; break; }
          case 'caw': { const k = h / 0.7, c = arch(k, 0.15, 0.6);
            P.beak += c; P.neckZ += c * 0.014; P.headPitch -= c * 0.25; P.pitch += c * 0.12; P.tailPitch -= c * 0.25; P.puff += c * 0.3;
            if (!habit.rung && k > 0.25) { habit.rung = true; spawnRing(0); }
            if (k >= 1) habit = null; break; }
        }
      }

      // ---- the current move
      if (action) {
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        const once = (key, at, fn) => { if (!action.fired[key] && k >= at) { action.fired[key] = true; fn(); } };
        const R = action.reach;
        switch (action.name) {
          case 'peck': {
            // Hop in, rear back, jab, and hop home.
            const out = ss(k, 0.02, 0.25) * (1 - ss(k, 0.72, 0.95));
            P.z += R * out;
            P.lift += (arch(k, 0.02, 0.25) + arch(k, 0.72, 0.95)) * 0.05;
            for (const w of P.wings) { w.fold -= (arch(k, 0.02, 0.25) + arch(k, 0.72, 0.95)) * 0.35; w.flap += arch(k, 0.02, 0.25) * 0.3; }
            const back = arch(k, 0.25, 0.48), jab = arch(k, 0.44, 0.62);
            P.pitch += -back * 0.25 + jab * 0.55;
            P.headPitch += -back * 0.3 + jab * 0.55;
            P.neckZ += -back * 0.012 + jab * 0.03;
            P.beak += arch(k, 0.38, 0.52) * 0.5;
            P.brow += win(k, 0.2, 0.7) * 0.8;
            P.tailPitch -= jab * 0.3;
            hitAt(0.53);
            break;
          }
          case 'pinch': {
            // Crouch, dart in low and fast, snatch it, flutter back with it and show it off; then it's gone (stashed).
            const crouch = arch(k, 0, 0.16);
            P.hipY -= crouch * 0.035; P.pitch += crouch * 0.35; P.tailPitch -= crouch * 0.3; P.brow += win(k, 0, 0.9) * 0.6;
            const out = ss(k, 0.12, 0.42), home = ss(k, 0.52, 0.84);
            P.z += R * (out - home);
            const air = win(k, 0.12, 0.86, 0.05);
            flyGait(P, air, flapPh * 1.35, 0, 0.12 * arch(k, 0.1, 0.5) + 0.1 * arch(k, 0.5, 0.88));
            P.pitch -= arch(k, 0.5, 0.86) * 0.55; // upright as he backs off
            P.tailSpread += arch(k, 0.48, 0.95) * 0.8; // the fan shows the gap
            const snatch = arch(k, 0.38, 0.54);
            P.headPitch += snatch * 0.55; P.neckZ += snatch * 0.03; P.pitch += snatch * 0.2;
            P.beak += arch(k, 0.36, 0.47) * 1.0;
            loot.visible = k > 0.47 && k < 0.96;
            once('grab', 0.47, () => burst(worldPos(beakTip, v1), 8, { speed: 0.6 }));
            hitAt(0.47);
            const show = arch(k, 0.86, 1);
            P.headPitch -= show * 0.45; P.puff += show * 0.7; P.lid += show * 0.4;
            once('stash', 0.96, () => burst(worldPos(beakTip, v1), 6, { color: '#e2c8ff', speed: 0.4 }));
            break;
          }
          case 'kraa': {
            // Puff up, half-open the wings over his back, and shout twice. Foes can't help but look.
            const on = win(k, 0, 1, 0.14);
            P.puff += on; P.tailSpread += on * 0.9; P.brow += on;
            for (const w of P.wings) { w.fold -= on * 0.5; w.flap += on * 0.35; w.twist -= on * 0.2; }
            const c1 = arch(k, 0.18, 0.42), c2 = arch(k, 0.5, 0.8);
            const c = c1 * 0.8 + c2;
            P.beak += c; P.neckZ += c * 0.024; P.headPitch -= c * 0.32; P.pitch += c * 0.2; P.tailPitch -= c * 0.35;
            P.hipY -= c * 0.01;
            once('r1', 0.24, () => spawnRing(0));
            once('r2', 0.56, () => spawnRing(1));
            once('r3', 0.63, () => spawnRing(1.5));
            hitAt(0.56);
            break;
          }
          case 'caw': {
            const c = arch(k, 0.15, 0.6);
            P.beak += c; P.neckZ += c * 0.016; P.headPitch -= c * 0.3; P.pitch += c * 0.14; P.tailPitch -= c * 0.3; P.puff += c * 0.4;
            for (const w of P.wings) w.fold -= c * 0.15;
            once('r', 0.25, () => spawnRing(0));
            hitAt(0.3);
            break;
          }
          case 'fetch': {
            // Pick up the brew, take off, fly it over, let go, turn round, fly home and land.
            bottlePivot.visible = k > 0.08 && k < 0.5;
            P.pitch += arch(k, 0, 0.1) * 0.6; P.headPitch += arch(k, 0, 0.1) * 0.4;
            const air = win(k, 0.1, 0.95, 0.06);
            const out = ss(k, 0.16, 0.45), home = ss(k, 0.62, 0.86);
            P.z += R * (out - home);
            P.yaw += ss(k, 0.48, 0.62) * Math.PI + ss(k, 0.84, 0.95) * Math.PI;
            flyGait(P, air, flapPh, (arch(k, 0.48, 0.62) + arch(k, 0.84, 0.95)) * -0.5, 0.4 * ss(k, 0.1, 0.2) * (1 - ss(k, 0.86, 0.97)));
            P.tuck = Math.min(P.tuck, 1 - arch(k, 0.1, 0.5) * 0.6); // hold the bottle down a little
            once('drop', 0.46, () => { burst(worldPos(bottle, v1), 10, { color: '#9dffb0', speed: 0.5 }); glows.spawn(v1, { life: 0.7, size: 0.4, grow: 1, color: '#7dffb0', opacity: 0.8 }); });
            hitAt(0.46);
            break;
          }
          case 'preen': {
            // Turn right round to the left wing, nibble along it, then a good shake from beak to tail.
            const turn = win(k, 0.02, 0.6, 0.1);
            P.headYaw += turn * 2.1; P.headPitch += turn * 0.45; P.hipYaw += turn * 0.3; P.headRoll -= turn * 0.25;
            P.wings[1].fold -= turn * 0.25; P.wings[1].flap += turn * 0.2; P.wings[1].twist -= turn * 0.25;
            const nib = win(k, 0.12, 0.55, 0.04);
            P.beak += nib * (0.25 + 0.25 * Math.sin(action.t * 55));
            P.headPitch += nib * Math.sin(action.t * 23) * 0.06; P.headYaw += nib * Math.sin(action.t * 17) * 0.08;
            P.puff += nib * 0.3;
            const shake = win(k, 0.62, 0.86, 0.04);
            P.puff += shake; P.roll += shake * Math.sin(action.t * 42) * 0.14; P.headYaw += shake * Math.sin(action.t * 38) * 0.3;
            P.tailYaw += shake * Math.sin(action.t * 40) * 0.25; for (const w of P.wings) w.fold -= shake * 0.18;
            P.lid += arch(k, 0.86, 0.95);
            break;
          }
          case 'puff': {
            // Proud: chest out, chin up, eyes half shut, tail fanned wide (gap and all), and a little strut.
            const p = win(k, 0, 1, 0.18);
            P.puff += p; P.hipY += p * 0.018; P.pitch -= p * 0.22; P.headPitch -= p * 0.35; P.lid += p * 0.45; P.brow -= p * 0.3;
            P.tailSpread += p; P.tailPitch -= p * 0.15;
            for (const w of P.wings) { w.fold -= p * 0.12; w.flap -= p * 0.15; }
            walkGait(P, win(k, 0.25, 0.75, 0.1) * 0.7, action.t * 11);
            break;
          }
          case 'hop': {
            // Three hops out, a hop round, three hops back, and round again.
            const n = Math.min(7, Math.floor(k * 8)), hp = k * 8 - n;
            const step = ss(hp, 0.16, 0.84);
            if (n < 3) P.z += 0.12 * (n + step);
            else if (n === 3) { P.z += 0.36; P.yaw += Math.PI * step; }
            else if (n < 7) { P.z += 0.36 - 0.12 * (n - 4 + step); P.yaw += Math.PI; }
            else P.yaw += Math.PI + Math.PI * step;
            hopGait(P, 1, k >= 1 ? 0 : hp);
            break;
          }
          case 'walk': {
            // Walk out with the head-bob and swagger, turn, walk back, turn.
            const out = ss(k, 0, 0.42), back = ss(k, 0.52, 0.92);
            P.z += 0.32 * (out - back);
            P.yaw += ss(k, 0.4, 0.54) * Math.PI + ss(k, 0.9, 1) * Math.PI;
            walkGait(P, win(k, 0, 1, 0.04), action.t * 9.5);
            break;
          }
          case 'fly': {
            // Take off, one circle out to his left and back, and land with the wings flared.
            const air = win(k, 0.04, 0.97, 0.06);
            const a = Math.PI * 2 * ss(k, 0.1, 0.86);
            const Rc = 0.55;
            P.x += Rc - Rc * Math.cos(a);
            P.z += Rc * Math.sin(a);
            P.yaw += a;
            const height = 0.55 * ss(k, 0.03, 0.16) * (1 - ss(k, 0.84, 0.97));
            const flare = arch(k, 0.82, 0.99);
            flyGait(P, air, flapPh * (1 - flare * 0.5), -0.5 * win(k, 0.12, 0.84, 0.08), height);
            P.pitch -= flare * 0.75 + arch(k, 0, 0.1) * 0.2;
            for (const w of P.wings) { w.flap += flare * 0.35; w.fold = Math.max(0, w.fold - flare * 0.5); }
            P.tailSpread += flare; P.tailPitch += flare * 0.3;
            P.tuck *= 1 - flare;
            for (const f of P.feet) f.z += flare * 0.035;
            P.hipY -= arch(k, 0, 0.08) * 0.03 + arch(k, 0.95, 1) * 0.03;
            break;
          }
          case 'perch':
            perchPose(P, ss(k, 0, 1));
            break;
          case 'cheer': {
            // Two hops with the wings thrown up and a caw at the top of each.
            const n = Math.min(1, Math.floor(k * 2)), hp = k * 2 - n;
            const up = arch(hp, 0.15, 0.85);
            P.lift += up * 0.1; P.hipY -= arch((hp + 0.15) % 1, 0, 0.3) * 0.03;
            for (const w of P.wings) { w.fold -= win(k, 0, 1, 0.1) * 0.9; w.flap += 0.55 + up * 0.4; }
            P.beak += up; P.headPitch -= up * 0.35; P.puff += 0.6; P.tailSpread += 1;
            for (const f of P.feet) { f.y += up * 0.1; f.curl += up * 0.6; }
            once('r1', 0.2, () => spawnRing(0));
            once('r2', 0.7, () => spawnRing(0));
            once('s', 0.72, () => burst(worldPos(trunk, v1), 8, { speed: 0.7, up: 0.8 }));
            break;
          }
          case 'hurt': {
            const b = arch(k, 0, 1);
            P.z -= b * 0.08; P.pitch -= b * 0.3; P.puff += b; P.lid += b; P.beak += b * 0.7; P.brow -= b * 0.6;
            for (const w of P.wings) { w.fold -= b * 0.5; w.flap += b * 0.3; }
            P.tailSpread += b * 0.6;
            once('f', 0.05, () => loseFeathers(2));
            break;
          }
          case 'ko':
            koPose(P, ss(k, 0.1, 0.65));
            P.z -= arch(k, 0, 0.3) * 0.06;
            once('f', 0.1, () => loseFeathers(3));
            break;
          case 'rise': {
            koPose(P, 1 - ss(k, 0, 0.6));
            const shake = arch(k, 0.6, 1);
            P.puff += shake; P.roll += shake * Math.sin(action.t * 40) * 0.12;
            break;
          }
        }
        if (k >= 1) {
          if (action.name === 'ko') downed = true;
          if (action.name === 'perch') perched = true;
          loot.visible = false;
          bottlePivot.visible = false;
          action = null;
        }
      }

      // ---- expressions
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3.5;
      if (blinkT < 0.12) P.lid = 1;
      if (perched && !action) P.lid = Math.max(P.lid, 0.45);
      if (downed && !action) P.lid = Math.max(P.lid, 0.85);
      if (mood === 'cross') P.brow += 0.8;
      if (mood === 'proud') { P.lid += 0.35; P.headPitch -= 0.15; }

      applyPose(dt);
      starsUpdate(dt);
      sparkles.update(dt); glows.update(dt); featherBits.update(dt); rings.update(dt);
    },
  };

  // ---------------------------------------------------------------- gaits
  function walkGait(P, amt, ph) {
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI;
      P.feet[i].z += Math.sin(p) * 0.03 * amt;
      P.feet[i].y += Math.max(0, Math.cos(p)) * 0.024 * amt;
      P.feet[i].curl += Math.max(0, Math.cos(p)) * 0.6 * amt;
    }
    P.hipY -= (0.006 + Math.abs(Math.sin(ph)) * 0.006) * amt;
    P.roll += Math.sin(ph) * 0.1 * amt; // the swagger
    P.hipYaw += Math.sin(ph) * 0.14 * amt;
    const step = (((ph / Math.PI) % 1) + 1) % 1;
    // The head holds still while the body walks under it, then thrusts forward: the bob every bird does.
    P.neckZ += (step < 0.7 ? 0.5 - step / 0.7 : (step - 0.7) / 0.3 - 0.5) * 0.034 * amt;
    P.tailPitch += Math.sin(ph * 2) * 0.06 * amt;
    P.pitch += 0.08 * amt;
  }
  function hopGait(P, amt, hp) {
    const air = arch(hp, 0.16, 0.84), squat = arch((hp + 0.16) % 1, 0, 0.32);
    P.lift += air * 0.075 * amt;
    P.hipY -= squat * 0.03 * amt;
    P.pitch += squat * 0.2 * amt;
    for (const f of P.feet) { f.z -= air * 0.015 * amt; f.curl += air * 0.7 * amt; }
    for (const w of P.wings) { w.fold -= air * 0.3 * amt; w.flap += air * 0.25 * amt; }
    P.tailPitch += (squat * 0.15 - air * 0.25) * amt;
  }
  function flyGait(P, amt, ph, bank = 0, height = 0.42) {
    if (amt <= 0) return;
    P.lift += height * amt - Math.sin(ph) * 0.018 * amt;
    P.pitch += 0.5 * amt;
    P.tuck = Math.max(P.tuck, amt);
    const fl = Math.sin(ph), up = Math.cos(ph);
    for (const w of P.wings) {
      w.fold = lerp(w.fold, 0.3 * Math.max(0, up), amt);
      w.flap = lerp(w.flap, 0.22 + 0.85 * fl, amt);
      w.bend = lerp(w.bend, -0.5 * up, amt);
      w.twist = lerp(w.twist, -0.22 * up, amt);
    }
    P.tailSpread = lerp(P.tailSpread, 0.45, amt);
    P.tailPitch += 0.1 * amt;
    P.roll += bank;
  }
  function perchPose(P, d) {
    P.hipY = lerp(P.hipY, 0.078, d);
    P.pitch += 0.12 * d;
    for (const f of P.feet) { f.z = lerp(f.z, 0.0, d); f.curl += 0.9 * d; }
    P.puff += 0.5 * d;
    P.neckY -= 0.012 * d;
    P.tailPitch += 0.25 * d;
  }
  function koPose(P, d) {
    P.hipY = lerp(P.hipY, 0.04, d);
    P.pitch -= 0.28 * d;
    P.roll += 0.2 * d;
    P.kneeUp = d > 0.3;
    for (const [i, f] of P.feet.entries()) { f.z = lerp(f.z, 0.075, d); f.y = lerp(f.y, 0.014 + i * 0.012, d); f.curl -= 0.5 * d; }
    for (const w of P.wings) { w.fold -= 0.45 * d; w.flap -= 0.55 * d; }
    P.neckY -= 0.01 * d;
    P.headRoll += Math.sin(time * 3) * 0.3 * d;
    P.headYaw += Math.sin(time * 2.1) * 0.35 * d;
    P.headPitch += 0.15 * d;
    P.tailPitch += 0.4 * d;
    P.tailSpread += 0.3 * d;
    P.lid += 0.6 * d;
    stars.visible = d > 0.6;
  }
  function starsUpdate(dt) {
    if (!(downed || action?.name === 'ko')) stars.visible = false;
    if (!stars.visible) return;
    stars.rotation.y += dt * 3;
    starMeshes.forEach((m, i) => {
      const a = (i / 3) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.075, Math.sin(time * 4 + i * 2) * 0.01, Math.sin(a) * 0.075);
      m.rotation.y = -stars.rotation.y;
      m.rotation.z = time * 2 + i;
    });
  }

  // ---------------------------------------------------------------- pose -> joints
  function applyPose(dt) {
    mover.position.set(P.x, P.lift, P.z);
    mover.rotation.y = P.yaw;
    hips.position.y = P.hipY;
    hips.rotation.set(P.pitch, P.hipYaw, P.roll);
    const puff = S.puff.update(clamp(P.puff, 0, 1.3), dt);
    const breathe = 1 + Math.sin(time * 2.6) * 0.012;
    torso.scale.set(1 + puff * 0.1, (1 + puff * 0.12) * breathe, 1 + puff * 0.04);
    breast.scale.set(1.02 + puff * 0.2, (0.98 + puff * 0.18) * breathe, 0.95 + puff * 0.2);
    hackles.scale.setScalar(1 + puff * 0.35);
    crown.scale.setScalar(1 + puff * 0.4);
    neck.position.set(0, 0.046 + P.neckY, 0.1 + P.neckZ);
    head.rotation.set(
      S.pitch.update(P.headPitch, dt) - P.pitch * 0.7,
      S.yaw.update(P.headYaw, dt) - P.hipYaw * 0.8,
      S.roll.update(P.headRoll, dt) - P.roll * 0.6,
    );
    jaw.rotation.x = clamp(P.beak, 0, 1.2) * 0.55;
    for (const e of eyes) e.scale.y = 1 - 0.92 * clamp(P.lid, 0, 1);
    for (const { b, s } of brows) { b.rotation.z = s * 0.4 * clamp(P.brow, -1, 1.2); b.position.y = 0.032 - 0.004 * clamp(P.brow, 0, 1) + 0.004 * clamp(-P.brow, 0, 1); }
    // the key swings from its thread
    keyPivot.rotation.x = S.key.update(-(P.pitch) + 0.9 - TILT, dt) + Math.sin(time * 2) * 0.05;
    keyPivot.rotation.z = S.keyZ.update(-P.roll + P.hipYaw * 0.3, dt);

    for (const [i, W] of wings.entries()) {
      const w = P.wings[i], s = W.s, f = clamp(w.fold, 0, 1), Q = W.Q;
      // shoulder: sweep and flap (in the body's frame), then the fold, then a twist about the bone
      W.shoulder.quaternion.setFromEuler(eu.set(0, s * w.sweep, s * w.flap * (1 - f * 0.55)));
      W.shoulder.quaternion.multiply(qTmp.slerpQuaternions(Q.armSpread, Q.armFold, f)).multiply(q1.setFromAxisAngle(AX, w.twist));
      W.elbow.quaternion.slerpQuaternions(Q.foreSpread, Q.foreFold, f);
      W.wrist.quaternion.slerpQuaternions(Q.handSpread, Q.handFold, f).multiply(q1.setFromEuler(eu.set(0, s * w.hand, -s * w.bend)));
      W.secondaries.forEach((j, n) => (j.rotation.y = lerp(-s * (0.02 + n * 0.06), s * (1.12 - n * 0.05), f)));
      W.primaries.forEach((j, n) => (j.rotation.y = -s * lerp(PRIMARY_SPREAD[n], 1.5 + n * 0.02, f)));
    }
    tail.rotation.set(S.tail.update(P.tailPitch, dt), P.tailYaw, 0);
    const spread = lerp(0.085, 0.21, clamp(S.spread.update(P.tailSpread, dt), 0, 1.2));
    for (const { j, i } of tailFeathers) j.rotation.y = (i - (TAIL_SLOTS - 1) / 2) * spread;

    // legs: two-bone IK in the side plane; the heel bends back (or forward, sitting with his legs out)
    for (const [i, L] of legs.entries()) {
      const F = P.feet[i];
      let fy = F.y, fz = F.z, curl = F.curl;
      if (P.tuck > 0) { fy = lerp(fy, P.hipY - 0.055, P.tuck); fz = lerp(fz, -0.085, P.tuck); curl += 1.3 * P.tuck; }
      const hy = P.hipY - 0.004, hz = 0;
      const dy = fy - hy, dz = fz - hz;
      const d = clamp(Math.hypot(dy, dz), Math.abs(L1 - L2) + 0.002, L1 + L2 - 0.002);
      const base = Math.atan2(dz, -dy);
      const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const thigh = P.kneeUp ? base + A : base - A;
      const heelY = hy - L1 * Math.cos(thigh), heelZ = hz + L1 * Math.sin(thigh);
      const tar = Math.atan2(fz - heelZ, -(fy - heelY));
      L.hip.rotation.set(-thigh - P.pitch, 0, -P.roll * 0.8);
      L.heel.rotation.x = -tar + thigh;
      L.foot.rotation.x = tar + curl;
    }
    // the brew hangs from his foot
    if (bottlePivot.visible) holdOrientation(bottlePivot, root, q1.identity());

    shadow.position.set(P.x, 0.002, P.z);
    const lift = Math.max(0, P.lift);
    shadow.material.opacity = 0.45 / (1 + lift * 3);
    shadow.scale.setScalar(1 / (1 + lift * 0.8));
    lootTwinkle.material.rotation = time * 3;
    lootGlow.material.opacity = 0.75 + Math.sin(time * 19) * 0.15;
  }

  return api;
}

// ---------------------------------------------------------------- the pose
function makePose() {
  return {
    x: 0, z: 0, lift: 0, yaw: 0, hipY: HIP, pitch: 0, roll: 0, hipYaw: 0,
    feet: [{ y: FOOT, z: 0.006, curl: 0 }, { y: FOOT, z: 0.006, curl: 0 }], tuck: 0, kneeUp: false,
    neckY: 0, neckZ: 0, headYaw: 0, headPitch: 0, headRoll: 0, beak: 0, lid: 0, brow: 0,
    wings: [0, 1].map(() => ({ fold: 1, flap: 0, twist: 0, sweep: 0, hand: 0, bend: 0 })),
    tailPitch: 0, tailSpread: 0, tailYaw: 0, puff: 0,
  };
}
function resetPose(P) {
  Object.assign(P, { x: 0, z: 0, lift: 0, yaw: 0, hipY: HIP, pitch: 0, roll: 0, hipYaw: 0, tuck: 0, kneeUp: false, neckY: 0, neckZ: 0, headYaw: 0, headPitch: 0, headRoll: 0, beak: 0, lid: 0, brow: 0, tailPitch: 0, tailSpread: 0, tailYaw: 0, puff: 0 });
  for (const f of P.feet) Object.assign(f, { y: FOOT, z: 0.006, curl: 0 });
  for (const w of P.wings) Object.assign(w, { fold: 1, flap: 0, twist: 0, sweep: 0, hand: 0, bend: 0 });
}

// ---------------------------------------------------------------- feathers painted in code
// Rows of overlapping feathers, each one's rounded tip catching the sheen. The canvas's top is the front of the
// part (chest, crown); tips point down it. sheenByU brightens the back (u = 0.5) and dulls the belly (u = 0).
function scallops({ cols, rows, base, dark, edge, sheenByU = true, strength = 0.7, size = 256 }) {
  return canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const fw = w / cols, fh = h / rows, r = fw * 0.56;
    for (let row = rows + 1; row >= -1; row--) {
      const y = row * fh;
      for (let c = -1; c <= cols; c++) {
        const x = (c + (row % 2) * 0.5) * fw;
        const u = (((x / w) % 1) + 1) % 1;
        const sheen = sheenByU ? Math.pow(0.5 - 0.5 * Math.cos(u * Math.PI * 2), 1.4) : 1;
        const tip = mixColor(base, edge, (0.2 + 0.8 * sheen) * strength);
        const grad = g.createLinearGradient(0, y - fh * 1.2, 0, y + r);
        grad.addColorStop(0, dark);
        grad.addColorStop(0.6, base);
        grad.addColorStop(1, tip);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x - r, y - fh * 1.6);
        g.lineTo(x - r, y);
        g.arc(x, y, r, Math.PI, 0, true);
        g.lineTo(x + r, y - fh * 1.6);
        g.closePath();
        g.fill();
        g.strokeStyle = mixColor(tip, '#e8e0ff', 0.25 * strength);
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(x, y, r - 1.2, Math.PI * 0.82, Math.PI * 0.18, true);
        g.stroke();
      }
    }
  });
}

// One feather's vanes: darker at the root, the sheen toward the tip, and a pale shaft down the middle of each face.
// (u = 0 and 0.5 are the midlines of the top and bottom faces; v runs root to tip, and flipY puts the tip at the top.)
function featherTexture(base, edge, rounded = false) {
  return canvasTexture(64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, mixColor(base, '#000000', 0.35));
    grad.addColorStop(0.55, base);
    grad.addColorStop(rounded ? 0.85 : 0.92, mixColor(base, edge, 0.5));
    grad.addColorStop(1, mixColor(base, edge, 0.2));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = mixColor(base, edge, 0.28);
    g.lineWidth = 1;
    for (let y = -20; y < h + 20; y += 6) {
      g.beginPath();
      g.moveTo(0, y + 5);
      g.lineTo(w * 0.25, y);
      g.lineTo(w * 0.5, y + 5);
      g.lineTo(w * 0.75, y);
      g.lineTo(w, y + 5);
      g.stroke();
    }
    g.fillStyle = mixColor(base, '#d8d0ff', 0.4);
    g.fillRect(0, 0, 1.5, h);
    g.fillRect(w - 1.5, 0, 1.5, h);
    g.fillRect(w / 2 - 0.75, 0, 1.5, h);
  });
}

// Scaly black legs: rings of scales down the bare part.
function legTexture() {
  return canvasTexture(32, 64, (g, w, h) => {
    g.fillStyle = C.leg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5a5566';
    g.lineWidth = 1.5;
    for (let y = 4; y < h; y += 8) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.arc(x + 4, y, 4, Math.PI, 0, true);
      g.stroke();
    }
  });
}
