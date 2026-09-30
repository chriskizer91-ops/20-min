import * as THREE from 'three';
import {
  toon, toonMap, part, joint, sphere, cyl, lathe, skirt, swayCloth, taperedTube, blobShadow, onLayer, Spring, turnToward,
} from './kit.js';
import { paintedFace, canvasTexture, merge, ellipse, mixColor, win, arch, lerp } from './party-kit.js';

// Mayor Gretch of Bogmire, from Aethermoor (New-game, claude/cool-ptolemy-uc93gg: map-sprites.js and dialogue.js):
// "a stout older woman in a red gown, a fur on her shoulders and the chain of office over it", silver hair in a
// bun, dark leather gloves and boots, a gold chain with a topaz, and a bronze key. "Wipe your boots. No, the other
// way. We keep the mud outside." She keeps the town "with two things, fear and favours", counts everything twice,
// and is kinder than she lets on. Here, where the sources are silent: the mud she keeps outside is all over her own
// boots and hem; the town's keys hang from her belt; she carries the town ledger under her arm; and she peers over a
// pair of pince-nez. Moves: talk, boots (points at your boots, wags a finger, and shows you which way to wipe),
// fuss (straightens the chain), count (taps the ledger twice), sigh, cheer, walk. Idle: she breathes, shifts her
// weight, rocks on her heels, pats the keys, tugs the chain and checks the ledger.

const C = {
  skin: '#f0c9ad', skinShade: '#d9a88c', cheek: 'rgba(222,104,104,0.5)', lip: '#a44850', line: 'rgba(140,80,64,0.5)',
  hair: '#d9d6e0', hairShade: '#aaa6b8', hairDark: '#8a8698', brow: '#b8b4c4',
  gown: '#9c2230', gownDark: '#6e1622', gold: '#e2b85a', goldDark: '#a8812e', topaz: '#ffc640',
  fur: '#8a7866', furLight: '#b8a890', furDark: '#5a4a3c', leather: '#3a2a22', leatherLight: '#5a4030',
  boot: '#2e221e', mud: '#5a4630', mudWet: '#3e3024', petticoat: '#3a2e3a', ledger: '#3f5a3a', page: '#efe4c4',
  bronze: '#b0783a', ribbon: '#3a2440', flower: '#b88af0',
};

export function createGretch() {
  const root = new THREE.Group();
  root.name = 'gretch';
  const body = joint(root, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- legs and the famous muddy boots
  const hips = joint(body, [0, 0.36, 0], 'hips');
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.085, 0, 0]);
    const knee = joint(hip, [0, -0.17, 0]);
    part(knee, cyl(0.062, 0.058, 0.12, 10), toon(C.boot), { pos: [0, -0.1, 0] });
    part(knee, cyl(0.068, 0.066, 0.03, 10), toon(C.leatherLight), { pos: [0, -0.045, 0] }); // the boot's turned-down top
    const ankle = joint(knee, [0, -0.15, 0]);
    part(ankle, sphere(0.06, 12, 8), toon(C.boot), { pos: [0, -0.01, 0.035], scale: [1, 0.72, 1.6] });
    // mud: caked round the sole and up the toe, and splashed up the shaft
    part(ankle, cyl(0.062, 0.064, 0.02, 12), toon(C.mud), { pos: [0, -0.03, 0.035], scale: [1, 1, 1.6], ink: false });
    part(ankle, sphere(0.034, 8, 6), toon(C.mudWet), { pos: [0.005 * side, 0.0, 0.1], scale: [1.2, 0.6, 0.9], ink: false });
    part(knee, merge([[0.05, -0.12], [-0.04, -0.14], [0.02, -0.08]].map(([a, y]) =>
      new THREE.SphereGeometry(0.018, 6, 4).scale(1, 1.4, 0.5).translate(Math.sin(a * 20) * 0.058, y, Math.cos(a * 20) * 0.058))), toon(C.mud), { ink: false });
    return { hip, knee, ankle };
  });

  // ---------------------------------------------------------------- the red gown, its petticoat, and the mud on its hem
  const petticoat = part(hips, skirt({ top: 0.19, bottom: 0.285, height: 0.5, flare: 0.8, points: 18, zig: 0.018, rows: 5, ragged: 0.03 }),
    toonMap(gownTexture(C.petticoat, C.mudWet, false), { side: THREE.DoubleSide }), { pos: [0, 0.27, 0] });
  const gown = part(hips, skirt({ top: 0.205, bottom: 0.305, height: 0.46, flare: 0.7, points: 22, zig: 0.012, rows: 6 }),
    toonMap(gownTexture(C.gown, C.gownDark, true), { side: THREE.DoubleSide }), { pos: [0, 0.27, 0] });

  // ---------------------------------------------------------------- a stout torso, the belt, the keys
  const torso = joint(hips, [0, 0.26, 0], 'torso');
  const bodice = toonMap(bodiceTexture());
  part(torso, lathe([[0.2, 0], [0.225, 0.07], [0.222, 0.14], [0.2, 0.2], [0.16, 0.25], [0.08, 0.28], [0.001, 0.285]], 18), bodice, {});
  part(torso, sphere(0.15, 12, 8), toon(C.gown), { pos: [0, 0.12, 0.08], scale: [1.25, 0.8, 0.8] }); // her front
  part(torso, cyl(0.212, 0.216, 0.055, 18), toon(C.leather), { pos: [0, 0.015, 0] });
  part(torso, new THREE.BoxGeometry(0.06, 0.05, 0.02), toon(C.gold), { pos: [0, 0.015, 0.216] });
  part(torso, new THREE.BoxGeometry(0.036, 0.028, 0.024), toon(C.leather), { pos: [0, 0.015, 0.218], ink: false });
  // The town's keys on a ring at her right hip: they swing, and jingle when she pats them
  const keysPivot = joint(hips, [-0.2, 0.25, 0.06], 'keys');
  const keys = joint(keysPivot, [0, 0, 0]);
  part(keys, merge([
    new THREE.TorusGeometry(0.03, 0.005, 5, 14).translate(0, -0.03, 0),
    ...[-0.5, 0, 0.45].flatMap((a, i) => {
      const len = 0.07 + i * 0.012, x = Math.sin(a) * 0.03, y = -0.058;
      return [
        new THREE.TorusGeometry(0.011, 0.004, 4, 8).rotateZ(a).translate(x, y, 0.004 * i),
        new THREE.CylinderGeometry(0.0045, 0.0045, len, 5).translate(0, -len / 2, 0).rotateZ(a).translate(x + Math.sin(a) * 0.01, y - 0.011, 0.004 * i),
        new THREE.BoxGeometry(0.016, 0.01, 0.005).translate(0.008, -len + 0.005, 0).rotateZ(a).translate(x + Math.sin(a) * 0.01, y - 0.011, 0.004 * i),
      ];
    }),
  ]), toon(C.bronze, { emissive: new THREE.Color('#3a2008'), emissiveIntensity: 0.4 }), { ink: false });
  part(keysPivot, cyl(0.007, 0.007, 0.03, 5), toon(C.leather), { pos: [0, -0.012, 0], ink: false });

  // ---------------------------------------------------------------- the fur on her shoulders, and the chain of office
  const furPivot = joint(torso, [0, 0.245, 0], 'fur');
  const furTex = furTexture();
  const furGeo = skirt({ top: 0.14, bottom: 0.3, height: 0.2, flare: 0.55, points: 22, zig: 0.035, rows: 4, gap: 1.5, backDrop: 0.08, ragged: 0.04 });
  const furCape = part(furPivot, furGeo, toonMap(furTex, { side: THREE.DoubleSide }));
  part(furPivot, new THREE.SphereGeometry(0.16, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), toonMap(furTex), { pos: [0, -0.03, 0], scale: [1.05, 0.5, 1] });
  part(furPivot, new THREE.TorusGeometry(0.105, 0.045, 7, 18), toonMap(furTex), { pos: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] });
  // The chain: gold links over the fur, round the back of her neck and down to the medallion on her chest
  const chainCurve = new THREE.CatmullRomCurve3([
    [0, 0.07, 0.232], [0.09, 0.12, 0.222], [0.135, 0.2, 0.17], [0.16, 0.255, 0.0], [0.1, 0.275, -0.12], [0, 0.28, -0.145],
    [-0.1, 0.275, -0.12], [-0.16, 0.255, 0.0], [-0.135, 0.2, 0.17], [-0.09, 0.12, 0.222],
  ].map((p) => new THREE.Vector3(...p)), true);
  const links = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const t = i / N, p = chainCurve.getPointAt(t), tan = chainCurve.getTangentAt(t);
    const link = new THREE.TorusGeometry(0.013, 0.0045, 4, 8);
    link.scale(1.35, 1, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tan);
    if (i % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    link.applyQuaternion(q).translate(p.x, p.y, p.z);
    links.push(link);
  }
  const goldMat = toon(C.gold, { emissive: new THREE.Color('#4a3000'), emissiveIntensity: 0.35 });
  part(torso, merge(links), goldMat, { ink: false });
  // The medallion hangs from the chain: a gold disc with a raised rim, Bogmire's topaz in the middle
  const medalPivot = joint(torso, [0, 0.075, 0.235], 'medallion');
  const medal = joint(medalPivot, [0, -0.045, 0.012]);
  part(medal, cyl(0.046, 0.046, 0.012, 16), goldMat, { rot: [Math.PI / 2, 0, 0] });
  part(medal, new THREE.TorusGeometry(0.04, 0.006, 5, 16), toon(C.goldDark), { pos: [0, 0, 0.007], ink: false });
  const topaz = part(medal, sphere(0.02, 10, 8), new THREE.MeshToonMaterial({ color: C.topaz, emissive: new THREE.Color('#a86a00'), emissiveIntensity: 0.9 }), { pos: [0, 0, 0.01], scale: [1, 1, 0.55], ink: false });
  part(medal, cyl(0.008, 0.008, 0.02, 5), goldMat, { pos: [0, 0.048, 0], ink: false });

  // ---------------------------------------------------------------- arms, gloves, and the ledger
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.215, 0.205, 0]);
    shoulder.rotation.z = side * 0.3;
    part(shoulder, cyl(0.062, 0.066, 0.16, 10), toon(C.gown), { pos: [0, -0.08, 0] });
    part(shoulder, sphere(0.07, 10, 7), toonMap(furTex), { pos: [side * 0.01, -0.005, 0], scale: [1.05, 0.85, 1.05] });
    const elbow = joint(shoulder, [0, -0.155, 0]);
    elbow.rotation.order = 'YXZ';
    part(elbow, cyl(0.06, 0.092, 0.14, 12, true), toon(C.gown, { side: THREE.DoubleSide }), { pos: [0, -0.065, 0] });
    part(elbow, new THREE.TorusGeometry(0.09, 0.009, 4, 16), toon(C.gold, { rim: 0.4 }), { pos: [0, -0.135, 0], rot: [Math.PI / 2, 0, 0], ink: false });
    const wrist = joint(elbow, [0, -0.14, 0]);
    part(wrist, sphere(0.046, 10, 7), toon(C.leather), { pos: [0, -0.022, 0], scale: [1, 1.15, 0.78] });
    part(wrist, sphere(0.019, 6, 5), toon(C.leather), { pos: [-side * 0.032, -0.015, 0.018], scale: [0.9, 1.3, 0.9] }); // thumb
    part(wrist, cyl(0.05, 0.05, 0.025, 10), toon(C.leatherLight), { pos: [0, 0.012, 0], ink: false }); // the glove's cuff
    return { shoulder, elbow, wrist, side };
  });
  const [armR, armL] = arms; // arms[0] is her right (x -), arms[1] her left
  // her right forefinger, for pointing and wagging (hidden in her fist otherwise)
  const finger = joint(armR.wrist, [0.004, -0.05, 0.012]);
  part(finger, taperedTube([[0, 0, 0], [0, -0.03, 0.004], [0, -0.052, 0.008]], 0.011, 0.008, 6, 5), toon(C.leather));
  finger.scale.setScalar(0.01);
  // The town ledger, fat and green, held in her left hand against her side
  const ledgerPivot = joint(armL.wrist, [0.01, -0.04, 0.02], 'ledger');
  const ledger = joint(ledgerPivot, [0, 0, 0]);
  part(ledger, new THREE.BoxGeometry(0.045, 0.2, 0.15), toonMap(ledgerTexture()), {});
  part(ledger, new THREE.BoxGeometry(0.036, 0.19, 0.142), toon(C.page), { pos: [0.006, 0, 0.002], ink: false });
  part(ledger, new THREE.BoxGeometry(0.006, 0.07, 0.004), toon('#b83a3a'), { pos: [-0.004, -0.12, 0.05], ink: false }); // a ribbon marker

  // ---------------------------------------------------------------- head, face, silver hair
  const neck = joint(torso, [0, 0.28, 0.01], 'neck');
  part(neck, cyl(0.065, 0.075, 0.06, 10), toon(C.skin), { pos: [0, 0.02, 0], ink: false });
  const head = joint(neck, [0, 0.145, 0.01], 'head');
  const skull = part(head, new THREE.SphereGeometry(0.19, 28, 20), toon(C.skin), { scale: [1.04, 0.98, 0.96] });
  const face = paintedFace(skull, ['calm', 'blink', 'talk', 'happy', 'cross', 'surprised', 'fuss'], drawGretchFace, { rim: 0.3 });
  const skinMat = toon(C.skin, { rim: 0.4 });
  // a double chin, a round button nose (a little pink), and ears
  part(head, sphere(0.125, 14, 10), skinMat, { pos: [0, -0.12, 0.045], scale: [1.12, 0.55, 0.92] });
  part(head, sphere(0.032, 10, 8), toon('#f2b8a4', { rim: 0.5 }), { pos: [0, -0.03, 0.19], scale: [1.1, 0.95, 0.85] });
  for (const s of [-1, 1]) part(head, sphere(0.034, 8, 6), skinMat, { pos: [s * 0.192, -0.01, -0.005], scale: [0.45, 1, 0.75] });
  // pince-nez on her nose, and the cord that ties them to her chain
  const specs = joint(head, [0, 0.012, 0.188], 'pince-nez');
  part(specs, merge([
    new THREE.TorusGeometry(0.028, 0.0035, 4, 14).translate(-0.042, 0, 0.004),
    new THREE.TorusGeometry(0.028, 0.0035, 4, 14).translate(0.042, 0, 0.004),
    new THREE.TorusGeometry(0.014, 0.003, 4, 8, Math.PI).translate(0, 0.004, 0.008),
  ]), toon(C.gold, { rim: 0.2 }), { ink: false });
  part(head, taperedTube([[0.068, 0.012, 0.185], [0.13, -0.08, 0.16], [0.14, -0.2, 0.14], [0.12, -0.3, 0.16]], 0.0028, 0.0028, 10, 4), toon(C.ribbon), { ink: false });

  const hair = joint(head, [0, 0, 0], 'hair');
  const hairMat = toon(C.hair, { side: THREE.DoubleSide });
  // Scalp: all but the face; the crown
  part(hair, new THREE.SphereGeometry(0.203, 24, 14, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.6), hairMat, { pos: [0, 0.01, -0.005] });
  part(hair, new THREE.SphereGeometry(0.205, 24, 8, 0, Math.PI * 2, 0, 0.72), toon(C.hair), { pos: [0, 0.012, 0] });
  // Swept back hard from the forehead to the bun, in firm silver waves; two stubborn curls over the ears
  part(hair, merge([-0.55, -0.2, 0.2, 0.55].map((a) => {
    const x = Math.sin(a) * 0.19, z = Math.cos(a) * 0.19;
    return taperedTube([[x * 0.9, 0.1, z * 0.95], [x * 1.05, 0.17, z * 0.5], [x * 0.6, 0.21, -0.02], [x * 0.2, 0.2, -0.1]], 0.04, 0.022, 10, 6);
  })), toon(C.hairShade), {});
  const curls = [-1, 1].map((s) => {
    const j = joint(hair, [s * 0.175, -0.02, 0.08]);
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = i * 0.62, r = 0.028 - i * 0.0018; pts.push([s * (Math.cos(a) * r), -i * 0.009, Math.sin(a) * r]); }
    part(j, taperedTube(pts, 0.015, 0.006, 20, 5), toon(C.hair));
    return { j, spring: new Spring(40, 3) };
  });
  // The bun: tall and tight, wound with a plum ribbon, two bronze pins through it, and a marsh violet tucked in
  const bunPivot = joint(hair, [0, 0.17, -0.1], 'bun');
  const bun = joint(bunPivot, [0, 0, 0]);
  part(bun, sphere(0.105, 14, 10), toon(C.hair), { pos: [0, 0.03, -0.01], scale: [1, 0.9, 1] });
  part(bun, taperedTube([[-0.09, 0.02, 0.02], [-0.05, 0.1, -0.02], [0.03, 0.12, -0.05], [0.08, 0.06, -0.03]], 0.03, 0.02, 10, 6), toon(C.hairShade));
  part(bun, new THREE.TorusGeometry(0.078, 0.016, 6, 18), toon(C.ribbon), { pos: [0, -0.035, 0], rot: [Math.PI / 2 + 0.2, 0, 0] });
  part(bun, merge([
    new THREE.CylinderGeometry(0.004, 0.004, 0.28, 5).rotateZ(1.25).rotateY(0.3).translate(0, 0.04, 0),
    new THREE.CylinderGeometry(0.004, 0.004, 0.26, 5).rotateZ(-1.1).rotateY(-0.4).translate(0, 0.02, 0),
    new THREE.SphereGeometry(0.012, 6, 5).translate(-0.126, 0.085, 0.04),
    new THREE.SphereGeometry(0.012, 6, 5).translate(0.11, 0.075, 0.05),
  ]), toon(C.bronze), { ink: false });
  part(bun, merge([0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    return new THREE.SphereGeometry(0.016, 6, 4).scale(1.4, 0.4, 0.8).rotateY(-a).translate(0.09 + Math.cos(a) * 0.016, 0.0, 0.05 + Math.sin(a) * 0.016);
  })), toon(C.flower, { emissive: new THREE.Color('#40207a'), emissiveIntensity: 0.4 }), { ink: false });
  part(bun, sphere(0.008, 5, 4), toon('#ffe27a'), { pos: [0.09, 0.006, 0.05], ink: false });

  const shadow = blobShadow(0.38, 0.5);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- animation
  const S = {
    lean: new Spring(20, 6), fur: new Spring(30, 5), keysX: new Spring(38, 2.6), keysZ: new Spring(38, 2.6),
    medal: new Spring(40, 3), medalZ: new Spring(40, 3), bun: new Spring(60, 5),
  };
  let phase = 0, time = Math.random() * 10, look = 0, lookTarget = 0, nextLook = 2, blinkT = 2, prevSpeed = 0;
  let fidget = null, nextFidget = 4 + Math.random() * 3, action = null, mood = 'calm', faceTo = null;
  const ACTIONS = { talk: 1.5, boots: 2.6, fuss: 1.6, count: 1.9, sigh: 1.6, cheer: 1.3 };
  const MOODS = { boots: 'cross', fuss: 'fuss', count: 'fuss', cheer: 'happy', sigh: 'calm' };

  const api = {
    root, head, name: 'Mayor Gretch', height: 1.46, radius: 0.28, center: 0.75,
    moves: Object.keys(ACTIONS),
    get busy() { return !!action; },
    get mood() { return mood; },
    face,
    // The heading she rests at when nobody's talking to her
    rest: 0,
    setMood(m) { mood = m; },
    lookAt(angle) { faceTo = angle; },
    play(name, onHit) {
      if (!ACTIONS[name]) return;
      action = { name, t: 0, dur: ACTIONS[name], onHit, hit: false };
    },
    // speed: m/s if she's walking; turn: how fast she's turning (rad/s), for the fur and the keys
    update(dt, speed = 0, turn = 0) {
      time += dt;
      const accel = (speed - prevSpeed) / Math.max(dt, 1e-3);
      prevSpeed = speed;
      const moving = Math.min(1, speed / 1.4);
      phase += ((speed * dt) / 0.42) * Math.PI;
      const s = Math.sin(phase), c = Math.cos(phase);
      if (faceTo !== null || !moving) root.rotation.y = turnToward(root.rotation.y, faceTo ?? api.rest, 6, dt);

      // Legs: short steps and a waddle
      for (const [i, L] of legs.entries()) {
        const p = i ? phase + Math.PI : phase;
        const swing = Math.sin(p) * 0.45 * moving;
        L.hip.rotation.set(swing, 0, 0);
        L.knee.rotation.x = Math.max(0, -Math.cos(p)) * 0.7 * moving;
        L.ankle.rotation.x = -swing * 0.4;
      }
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      hips.position.y = 0.36 + Math.abs(c) * 0.02 * moving;
      hips.rotation.set(0, s * 0.08 * moving, c * 0.07 * moving + Math.sin(time * 0.55) * 0.025 * (1 - moving));
      hips.position.x = Math.sin(time * 0.55) * 0.012 * (1 - moving);
      const breath = Math.sin(time * 1.7);
      torso.rotation.set(S.lean.update(0.05 * moving - accel * 0.008, dt), -s * 0.1 * moving, -hips.rotation.z * 0.8);
      torso.scale.set(1 + breath * 0.012, 1 + breath * 0.01, 1 + breath * 0.012);

      // Arms at rest: the right hand on her middle, the left holding the ledger against her side
      armR.shoulder.rotation.set(-0.35 + s * 0.3 * moving, 0, -0.3 - 0.05 * breath);
      armR.elbow.rotation.set(-1.2 + 0.5 * moving, -0.6 * (1 - moving), 0);
      armR.wrist.rotation.set(0.2, 0, 0);
      armL.shoulder.rotation.set(-0.1 - s * 0.25 * moving, 0, 0.42);
      armL.elbow.rotation.set(-0.85, 0.55, 0);
      armL.wrist.rotation.set(0, 0, -0.35);
      ledgerPivot.rotation.set(0.1, 0.2, 0);
      ledgerPivot.position.set(0.01, -0.04, 0.02);
      finger.scale.setScalar(0.01);
      head.rotation.set(0, 0, 0);
      specs.position.set(0, 0.012, 0.188);
      let keyKick = 0, faceNow = null;

      // Idle fidgets: pat the keys, tug the chain straight, peer at the ledger, rock on her heels
      if (!moving && !action && faceTo === null) {
        if ((nextFidget -= dt) < 0) { fidget = { name: ['keys', 'chain', 'ledger', 'rock'][Math.floor(Math.random() * 4)], t: 0 }; nextFidget = 5 + Math.random() * 5; }
      }
      if (fidget) {
        fidget.t += dt;
        const f = fidget.t;
        if (fidget.name === 'keys') {
          const k = f / 1.3, p = win(k, 0, 1, 0.25);
          armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, 0.05, p);
          armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.35, p);
          armR.elbow.rotation.set(lerp(-1.2, -0.35, p), lerp(-0.6, 0, p), 0);
          if (p > 0.8) keyKick = Math.sin(time * 22) * 0.6;
          head.rotation.x = 0.15 * p;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'chain') {
          const k = f / 1.4, p = win(k, 0, 1, 0.3), tug = arch(k, 0.45, 0.7);
          for (const A of [armR, armL]) {
            A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.85 + tug * 0.25, p);
            A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.18, p);
            A.elbow.rotation.set(lerp(A.elbow.rotation.x, -1.55, p), lerp(A.elbow.rotation.y, A.side * 0.7, p), 0);
          }
          torso.rotation.x -= tug * 0.06;
          head.rotation.x = -0.1 * p;
          faceNow = p > 0.5 ? 'fuss' : null;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'ledger') {
          const k = f / 2.2, p = win(k, 0, 1, 0.22);
          armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -0.95, p), 0, lerp(0.42, 0.12, p));
          armL.elbow.rotation.set(lerp(-0.85, -1.2, p), lerp(0.55, 0.9, p), 0);
          armL.wrist.rotation.z = lerp(-0.35, 0.3, p);
          ledgerPivot.rotation.set(lerp(0.1, -0.2, p), lerp(0.2, -1.2, p), lerp(0, 0.2, p));
          head.rotation.set(0.28 * p, 0.35 * p, 0);
          specs.position.y = 0.012 - 0.012 * p; // she looks over the top of them
          faceNow = p > 0.5 ? 'fuss' : null;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'rock') {
          const k = f / 1.6, up = arch(k, 0, 0.5) + arch(k, 0.5, 1) * 0.7;
          body.position.y = up * 0.025;
          for (const L of legs) L.ankle.rotation.x = up * 0.35;
          torso.rotation.x += up * 0.03;
          if (k >= 1) fidget = null;
        }
      }

      // ---- moves
      if (action) {
        fidget = null;
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const bell = Math.sin(k * Math.PI);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        switch (action.name) {
          case 'talk': {
            // An open hand, turned up, making her point; a nod on the important word
            const p = win(k, 0, 1, 0.2), beat = Math.sin(action.t * 7);
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -0.75 + beat * 0.08, p);
            armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.45, p);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.05 + beat * 0.12, p), lerp(armR.elbow.rotation.y, 0.3, p), 0);
            armR.wrist.rotation.set(lerp(0.2, -0.5, p), lerp(0, -1.2, p), 0);
            head.rotation.x = arch(k, 0.35, 0.6) * 0.12;
            faceNow = Math.sin(action.t * 16) > 0.1 && k < 0.85 ? 'talk' : null;
            hitAt(0.5);
            break;
          }
          case 'boots': {
            // "Wipe your boots." She leans in and points at them; "No," a wag of the finger; "the other way": she
            // shows you, dragging her own boot back across the planks, twice.
            const point = win(k, 0.02, 0.55, 0.1), wag = win(k, 0.28, 0.55, 0.05);
            const show = win(k, 0.55, 0.98, 0.08), drag = Math.max(arch(k, 0.6, 0.75), arch(k, 0.78, 0.93));
            finger.scale.setScalar(Math.max(0.01, point));
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -0.55 - wag * 0.5, point);
            armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.15, point);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -0.25 - wag * 0.6, point), lerp(armR.elbow.rotation.y, wag * Math.sin(action.t * 24) * 0.35, point), 0);
            torso.rotation.x += point * (0.22 - wag * 0.12);
            head.rotation.x += point * 0.22;
            legs[0].hip.rotation.x = -show * 0.15 + drag * 0.4;
            legs[0].knee.rotation.x = show * 0.25 + drag * 0.2;
            legs[0].ankle.rotation.x = -drag * 0.3;
            hips.position.y += show * 0.01;
            armL.shoulder.rotation.z += show * 0.15;
            faceNow = 'cross';
            hitAt(0.3);
            break;
          }
          case 'fuss': {
            // Both hands to the chain: straighten it, square the shoulders, brush the fur
            const p = win(k, 0, 1, 0.2), tug = arch(k, 0.3, 0.55), brush = Math.max(0, Math.sin(action.t * 18)) * win(k, 0.6, 0.95, 0.05);
            for (const A of [armR, armL]) {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.9 + tug * 0.3, p);
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.15, p);
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -1.5 + brush * 0.3 * (A.side > 0 ? 1 : 0), p), lerp(A.elbow.rotation.y, A.side * 0.75, p), 0);
            }
            torso.rotation.x -= tug * 0.08;
            body.position.y = tug * 0.012;
            faceNow = 'fuss';
            hitAt(0.5);
            break;
          }
          case 'count': {
            // "Counted twice": the ledger up, and two taps on it with a gloved finger
            const p = win(k, 0, 1, 0.18), taps = Math.max(arch(k, 0.35, 0.5), arch(k, 0.58, 0.73));
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -1.0, p), 0, lerp(0.42, 0.1, p));
            armL.elbow.rotation.set(lerp(-0.85, -1.15, p), lerp(0.55, 1.0, p), 0);
            ledgerPivot.rotation.set(lerp(0.1, -0.1, p), lerp(0.2, -1.3, p), 0);
            finger.scale.setScalar(Math.max(0.01, p));
            armR.shoulder.rotation.set(lerp(armR.shoulder.rotation.x, -1.0 + taps * 0.15, p), 0, lerp(armR.shoulder.rotation.z, -0.05, p));
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.2 + taps * 0.25, p), lerp(armR.elbow.rotation.y, -0.9, p), 0);
            head.rotation.set(0.22 * p, 0.2 * p, 0);
            specs.position.y = 0.012 - 0.01 * p;
            faceNow = 'fuss';
            hitAt(0.5);
            break;
          }
          case 'sigh': {
            // Shoulders up with the breath in, and down, and a tilt of the head: kind, tired, not saying so
            const up = arch(k, 0, 0.45), down = arch(k, 0.4, 1);
            torso.scale.y *= 1 + up * 0.04;
            torso.rotation.x += down * 0.08 - up * 0.04;
            for (const A of [armR, armL]) A.shoulder.rotation.z -= A.side * up * 0.1;
            head.rotation.set(down * 0.12, 0, down * 0.12);
            faceNow = down > 0.3 ? 'blink' : null;
            hitAt(0.5);
            break;
          }
          case 'cheer': {
            // Two quick claps, pleased with herself
            const p = win(k, 0, 1, 0.15), clap = Math.abs(Math.sin(action.t * 13)) * win(k, 0.15, 0.85, 0.05);
            for (const A of [armR, armL]) {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -1.05, p);
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * (0.25 - clap * 0.1), p);
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -0.9, p), lerp(A.elbow.rotation.y, A.side * (0.9 + clap * 0.35), p), 0);
            }
            body.position.y = arch(k, 0.2, 0.7) * 0.03;
            faceNow = 'happy';
            hitAt(0.4);
            break;
          }
        }
        if (k >= 1) {
          if (!action.hit) action.onHit?.();
          action = null;
        }
      }

      // Head: look about when idle; toward whoever she's talking to otherwise; blink
      if ((nextLook -= dt) < 0) { lookTarget = moving > 0.1 || faceTo !== null ? 0 : (Math.random() - 0.5) * 1.1; nextLook = 1.6 + Math.random() * 3; }
      look += (lookTarget * (1 - moving) - look) * (1 - Math.exp(-dt * 4));
      head.rotation.y += look - torso.rotation.y * 0.8;
      head.rotation.x += -torso.rotation.x * 0.6;
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3;
      face.show(faceNow ?? (blinkT < 0.13 && mood !== 'happy' ? 'blink' : action ? MOODS[action.name] ?? mood : mood));

      // Secondary motion: the fur, the keys, the medallion, the bun and the curls
      const drag = S.fur.update(0.05 * moving, dt);
      swayCloth(furGeo, { drag, lift: 0.004 + 0.01 * moving, time, ripple: 0.004 + 0.006 * moving });
      swayCloth(gown.geometry, { drag: drag * 0.6, lift: Math.abs(s) * 0.02 * moving, time: time * 1.2, ripple: 0.003 + 0.006 * moving });
      swayCloth(petticoat.geometry, { drag: drag * 0.5, lift: Math.abs(s) * 0.018 * moving, time: time * 1.1, ripple: 0.003 });
      keys.rotation.x = S.keysX.update(0.5 * moving * Math.abs(s) + keyKick * 0.4 - accel * 0.04 + hips.rotation.z * 0.5, dt);
      keys.rotation.z = S.keysZ.update(-turn * 0.1 + keyKick * 0.5 + Math.sin(time * 0.9) * 0.05, dt);
      medal.rotation.x = S.medal.update(-torso.rotation.x * 0.8 + 0.25 * moving * Math.abs(c), dt);
      medal.rotation.z = S.medalZ.update(-turn * 0.08 - torso.rotation.z, dt);
      bun.rotation.x = S.bun.update(-accel * 0.02 + head.rotation.x * 0.1, dt);
      for (const [i, cu] of curls.entries()) cu.j.rotation.x = cu.spring.update(0.3 * moving + Math.sin(time * 1.3 + i) * 0.06, dt);
      topaz.material.emissiveIntensity = 0.8 + Math.sin(time * 2.3) * 0.15;
    },
  };
  return api;
}

// ---------------------------------------------------------------- the face
// The canvas covers the front half of her head (see paintedFace in party-kit.js): x 256 is the middle of her face,
// y 262 her eye line, y 350 her mouth. Her own left is the viewer's right. Round rosy cheeks, small bright eyes under
// heavy silver brows, laugh lines she'd deny, and a small mouth that purses when she's fussing.
function drawGretchFace(g, mood, S) {
  const k = S / 512;
  g.save();
  g.scale(k, k);
  g.fillStyle = C.skin;
  g.fillRect(0, 0, 512, 512);
  // cheeks, big and round, rosier when she's pleased or cross
  for (const x of [186, 326]) {
    const grad = g.createRadialGradient(x, 318, 4, x, 318, 46);
    grad.addColorStop(0, mood === 'happy' || mood === 'cross' ? 'rgba(226,96,96,0.62)' : C.cheek);
    grad.addColorStop(1, 'rgba(226,110,110,0)');
    g.fillStyle = grad;
    ellipse(g, x, 318, 50, 40);
    g.fill();
  }
  g.strokeStyle = C.line;
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath(); // laugh lines, from nose to mouth
    g.moveTo(256 + s * 26, 322);
    g.quadraticCurveTo(256 + s * 40, 338, 256 + s * 36, 362);
    g.stroke();
    for (const a of [-0.4, 0.1, 0.55]) { // crow's feet
      g.beginPath();
      g.moveTo(256 + s * 74, 266 + a * 8);
      g.lineTo(256 + s * 86, 262 + a * 22);
      g.stroke();
    }
  }
  g.fillStyle = 'rgba(160,90,70,0.3)'; // under the nose (the nose is modelled)
  ellipse(g, 256, 322, 16, 5);
  g.fill();
  g.fillStyle = '#7a4a3a';
  g.beginPath(); // a beauty mark, which she calls a beauty mark
  g.arc(318, 352, 3.2, 0, Math.PI * 2);
  g.fill();

  // brows: heavy and silver, and they do most of her talking
  const brows = {
    calm: [[-1, 222, 0.05], [1, 222, 0.05]], blink: [[-1, 224, 0.05], [1, 224, 0.05]], talk: [[-1, 216, -0.1], [1, 214, -0.1]],
    happy: [[-1, 216, -0.15], [1, 216, -0.15]], cross: [[-1, 230, 0.5], [1, 230, 0.5]], surprised: [[-1, 200, -0.2], [1, 198, -0.2]],
    fuss: [[-1, 228, 0.25], [1, 206, -0.3]],
  };
  for (const [s, y, tilt] of brows[mood]) {
    const inner = 256 + s * 18, outer = 256 + s * 80;
    g.strokeStyle = C.hairDark;
    g.lineWidth = 17;
    g.beginPath();
    g.moveTo(inner, y + tilt * 18);
    g.quadraticCurveTo(256 + s * 48, y - 12 + tilt * 4, outer, y + 6 - tilt * 6);
    g.stroke();
    g.strokeStyle = C.brow;
    g.lineWidth = 11;
    g.stroke();
  }

  // eyes: small and bright, pale blue
  const eye = (s, { open = 1, lid = 0.3, look = 0 } = {}) => {
    const cx = 256 + s * 50, cy = 266, rx = 21, ry = 14 * open;
    g.save();
    g.beginPath();
    g.moveTo(cx - rx, cy);
    g.quadraticCurveTo(cx, cy - ry * 1.9, cx + rx, cy);
    g.quadraticCurveTo(cx, cy + ry * 1.5, cx - rx, cy);
    g.closePath();
    g.fillStyle = '#f6efe2';
    g.fill();
    g.clip();
    const ix = cx + look * 4, iy = cy;
    g.fillStyle = '#3a5a8a';
    g.beginPath(); g.arc(ix, iy, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7aa2d8';
    g.beginPath(); g.arc(ix, iy, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#10141c';
    g.beginPath(); g.arc(ix, iy, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ix - 4, iy - 4.5, 3.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = mixColor(C.skin, C.skinShade, 0.5);
    g.fillRect(cx - rx - 2, cy - 30, rx * 2 + 4, 30 - ry * (1.5 - lid * 2.4) + 10 * lid);
    g.restore();
    g.strokeStyle = '#3a2a2a';
    g.lineWidth = 4.5;
    const lidY = cy - ry * (1.5 - lid * 2.4) + 10 * lid;
    g.beginPath();
    g.moveTo(cx - rx - 1, cy + 1);
    g.quadraticCurveTo(cx, Math.min(lidY, cy) - 3, cx + rx + 1, cy);
    g.stroke();
  };
  const closed = (s, curve) => {
    const cx = 256 + s * 50, cy = 268;
    g.strokeStyle = '#3a2a2a';
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(cx - 19, cy - curve * 0.3);
    g.quadraticCurveTo(cx, cy + curve, cx + 19, cy - curve * 0.3);
    g.stroke();
  };
  for (const s of [-1, 1]) {
    if (mood === 'blink') closed(s, 5);
    else if (mood === 'happy') closed(s, -10);
    else if (mood === 'surprised') eye(s, { open: 1.25, lid: -0.1 });
    else if (mood === 'cross') eye(s, { open: 0.85, lid: 0.55 });
    else if (mood === 'fuss') eye(s, { lid: s > 0 ? 0.15 : 0.5, look: -0.6 });
    else eye(s, { lid: 0.28, look: 0.3 });
  }

  // mouth: small, and pursed when she's fussing
  g.strokeStyle = C.lip;
  g.fillStyle = '#6a2830';
  g.lineCap = 'round';
  g.lineWidth = 6;
  if (mood === 'calm' || mood === 'blink') {
    g.beginPath(); // a small, satisfied smile
    g.moveTo(236, 352);
    g.quadraticCurveTo(256, 362, 278, 350);
    g.stroke();
  } else if (mood === 'talk') {
    ellipse(g, 257, 356, 15, 11);
    g.fill();
    g.fillStyle = '#f2e8dc';
    g.fillRect(246, 346, 22, 5);
  } else if (mood === 'happy') {
    g.beginPath();
    g.moveTo(226, 344);
    g.quadraticCurveTo(256, 356, 288, 344);
    g.quadraticCurveTo(258, 390, 226, 344);
    g.fill();
    g.fillStyle = '#f2e8dc';
    g.fillRect(238, 347, 38, 6);
  } else if (mood === 'cross') {
    g.beginPath(); // tight, and turned down
    g.moveTo(236, 360);
    g.quadraticCurveTo(256, 348, 278, 360);
    g.stroke();
  } else if (mood === 'surprised') {
    ellipse(g, 257, 358, 10, 14);
    g.fill();
  } else if (mood === 'fuss') {
    g.beginPath(); // pursed, pulled to one side
    g.moveTo(258, 354);
    g.quadraticCurveTo(270, 348, 282, 356);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(262, 346); g.lineTo(264, 342); g.moveTo(272, 345); g.lineTo(274, 341); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- cloth and fur, painted in code

// The gown: deep red with a gold band near the hem, darker folds, and fen mud splashed up from the bottom.
function gownTexture(base, dark, band) {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 22) {
      const grad = g.createLinearGradient(x, 0, x + 22, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.18)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 22, h);
    }
    if (band) {
      g.fillStyle = C.gold;
      g.fillRect(0, h * 0.8, w, h * 0.06);
      g.fillStyle = C.goldDark;
      for (let x = 4; x < w; x += 12) g.fillRect(x, h * 0.815, 5, h * 0.03);
      g.fillStyle = C.gold;
      g.fillRect(0, h * 0.9, w, 2);
    }
    // mud: a dark tidemark, and splashes above it
    g.fillStyle = dark;
    g.globalAlpha = 0.35;
    g.fillRect(0, h * 0.94, w, h * 0.06);
    g.fillStyle = C.mud;
    g.globalAlpha = 0.8;
    for (let i = 0; i < 26; i++) {
      const x = (i * 53) % w, y = h * (0.9 + ((i * 17) % 10) / 100);
      ellipse(g, x, y, 2 + (i % 3), 1.5 + (i % 2));
      g.fill();
    }
    g.globalAlpha = 1;
  }, { flipY: false });
}

// The bodice: the gown's red, laced up the front with gold cord
function bodiceTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = C.gown;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.gownDark;
    g.fillRect(w * 0.23, 0, w * 0.04, h);
    g.strokeStyle = C.gold;
    g.lineWidth = 2;
    for (let y = 10; y < h - 10; y += 14) {
      g.beginPath();
      g.moveTo(w * 0.22, y);
      g.lineTo(w * 0.28, y + 7);
      g.moveTo(w * 0.28, y);
      g.lineTo(w * 0.22, y + 7);
      g.stroke();
    }
  }, { flipY: false });
}

// Wolf fur: grey-brown, in short strands, lighter at the tips
function furTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = C.fur;
    g.fillRect(0, 0, w, h);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 700; i++) {
      const x = rnd() * w, y = rnd() * h, len = 5 + rnd() * 9;
      g.strokeStyle = rnd() < 0.5 ? C.furDark : rnd() < 0.5 ? C.furLight : '#9a8a76';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rnd() - 0.5) * 3, y + len);
      g.stroke();
    }
  }, { flipY: false });
}

// The ledger's cover: green leather with gold corners and a label
function ledgerTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = C.ledger;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.gold;
    for (const [x, y] of [[0, 0], [w - 10, 0], [0, h - 10], [w - 10, h - 10]]) g.fillRect(x, y, 10, 10);
    g.fillStyle = C.page;
    g.fillRect(w * 0.25, h * 0.35, w * 0.5, h * 0.2);
  }, { wrap: false });
}
