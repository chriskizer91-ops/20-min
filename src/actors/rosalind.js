import * as THREE from 'three';
import {
  toon, toonMap, part, joint, sphere, cyl, lathe, skirt, swayCloth, taperedTube, glowSprite, blobShadow, onLayer, Spring, turnToward,
} from './kit.js';
import { paintedFace, canvasTexture, merge, ellipse, win, arch, lerp, holdOrientation } from './party-kit.js';

// Rosalind, a ghost, from Follow Me Down Witch Way (witch_game_assets/design/LORE.md and her portraits in
// witch_game_assets/npcs/rosalind): "a young woman in a high-necked, old-fashioned gown with long sleeves, her hair
// drifting as if underwater, and a tiny silver bell on a ribbon at her throat." She is "wistful and a little
// dramatic", and has waited a hundred years for someone to bring her a rose. Here she waits on the Sable riverbank,
// where she used to hold little picnics by the bench (WW's river.js). Her portraits give the rest: pale sea-green all
// over, a cloud of long wavy hair with pale roses in it, lace at the collar and cuffs, and a black bow over the bell;
// in the happy one she holds a red rose to her cheek. A ghost, so no feet: her gown trails off into a wisp, and she
// floats. Moves: talk (an open hand, a tilt of the head), sigh (the back of her hand to her brow, as in her portrait),
// twirl (round and round, the gown flaring), cheer (hands clasped to her heart). Idle: she drifts up and down, her hair
// and sleeves float as if the river were over her, she looks out at the water, and now and then she sighs.
// holdRose(true) puts a nightrose in her hand, held up by her cheek.

const C = {
  skin: '#d8efea', skinShade: '#a9d0cc', blush: 'rgba(214,150,168,0.45)', lip: '#b88492', lash: '#2c4a52',
  iris: '#3d7480', irisLight: '#86c3c8',
  hair: '#b9dedd', hairShade: '#86b8bc', hairDeep: '#5f8f98',
  gown: '#8ec4c6', gownShade: '#62999f', lace: '#d4efeb', bow: '#23343c', silver: '#eef4f6', silverDark: '#9fb3bc',
  rosePale: '#e3f1ee', roseRed: '#c41f45', roseDeep: '#8a1030', leaf: '#4f8a5c', glow: '#9fe8ec',
};

// A ghost's stuff: lit a little from inside. Her body is solid enough to take an ink outline; only her edges (the mist
// at her hem, the trailing wisp, the lace at her cuffs) are see-through, and those have no outline, which would show
// through them as a dark smudge.
const ghost = (color, opts = {}) => toon(color, { emissive: new THREE.Color('#2e7680'), emissiveIntensity: 0.32, ...opts });
const mist = (color, opacity, opts = {}) => ghost(color, { transparent: true, opacity, depthWrite: false, ...opts });

export function createRosalind() {
  const root = new THREE.Group();
  root.name = 'rosalind';
  const float = joint(root, [0, 0.16, 0], 'float'); // she hovers
  const body = joint(float, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- the gown: a long skirt that trails into a wisp
  const hips = joint(body, [0, 0.72, 0], 'hips');
  const underGeo = skirt({ top: 0.13, bottom: 0.3, height: 0.66, flare: 0.8, points: 22, zig: 0.035, rows: 6, ragged: 0.07 });
  const under = part(hips, underGeo, mist(C.lace, 0.5, { side: THREE.DoubleSide }), { ink: false });
  const gownGeo = skirt({ top: 0.14, bottom: 0.28, height: 0.6, flare: 0.72, points: 18, zig: 0.05, rows: 6, ragged: 0.06, backDrop: 0.08 });
  const gown = part(hips, gownGeo, toonMap(gownTexture(), { side: THREE.DoubleSide, emissive: new THREE.Color('#2e7680'), emissiveIntensity: 0.4 }));
  // Where her feet would be, the hem thins into curling wisps, and one long one trails behind
  const wisps = part(hips, merge([0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = (i / 7) * Math.PI * 2 + 0.3, r = 0.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    return taperedTube([[x, -0.56, z], [x * 0.9, -0.66, z * 0.9], [x * 0.6 + 0.02, -0.72, z * 0.6], [x * 0.45, -0.7, z * 0.45 - 0.02]], 0.035, 0.004, 8, 5);
  })), mist(C.lace, 0.5), { ink: false });
  const tail = joint(hips, [0, -0.5, -0.12], 'tail');
  part(tail, taperedTube([[0, 0, 0], [0, -0.12, -0.1], [0.04, -0.16, -0.26], [0, -0.12, -0.4]], 0.09, 0.006, 12, 7), mist(C.gown, 0.55), { ink: false });

  // ---------------------------------------------------------------- a slim bodice, a sash, the high lace collar
  const torso = joint(hips, [0, 0.02, 0], 'torso');
  part(torso, lathe([[0.12, 0], [0.13, 0.05], [0.14, 0.12], [0.145, 0.18], [0.13, 0.24], [0.1, 0.28], [0.05, 0.3], [0.001, 0.305]], 16), toonMap(bodiceTexture(), { emissive: new THREE.Color('#2e7680'), emissiveIntensity: 0.4 }));
  part(torso, sphere(0.085, 10, 8), ghost(C.gown), { pos: [0, 0.17, 0.055], scale: [1.35, 0.8, 0.75] }); // her front
  part(torso, new THREE.TorusGeometry(0.128, 0.018, 5, 18), ghost(C.gownShade), { pos: [0, 0.01, 0], rot: [Math.PI / 2, 0, 0], ink: false }); // the sash
  const neck = joint(torso, [0, 0.29, 0], 'neck');
  part(neck, cyl(0.045, 0.05, 0.08, 10), ghost(C.skin), { pos: [0, 0.03, 0], ink: false });
  // The collar: a frill of lace standing up round her neck, higher at the back
  part(neck, skirt({ top: 0.058, bottom: 0.075, height: 0.07, flare: 1, points: 16, zig: 0.012, rows: 2 }).rotateX(Math.PI).translate(0, -0.005, 0), ghost(C.lace, { side: THREE.DoubleSide }), { pos: [0, 0.0, 0] });
  // A black bow at her throat, and under it the tiny silver bell on its ribbon
  part(neck, merge([
    new THREE.SphereGeometry(0.022, 7, 5).scale(1.3, 0.8, 0.5).translate(-0.024, 0, 0),
    new THREE.SphereGeometry(0.022, 7, 5).scale(1.3, 0.8, 0.5).translate(0.024, 0, 0),
    new THREE.SphereGeometry(0.011, 6, 5),
    new THREE.CylinderGeometry(0.004, 0.007, 0.05, 4).rotateZ(0.35).translate(-0.01, -0.03, 0),
    new THREE.CylinderGeometry(0.004, 0.007, 0.05, 4).rotateZ(-0.35).translate(0.01, -0.03, 0),
  ]), toon(C.bow), { pos: [0, 0.0, 0.07], ink: false });
  const bellPivot = joint(neck, [0, -0.02, 0.075], 'bell');
  const bell = joint(bellPivot, [0, 0, 0]);
  part(bell, lathe([[0.001, 0], [0.008, -0.002], [0.013, -0.012], [0.016, -0.03], [0.021, -0.038], [0.001, -0.038]], 10),
    toon(C.silver, { emissive: new THREE.Color('#6a8a96'), emissiveIntensity: 0.5 }), { pos: [0, -0.012, 0] });
  part(bell, sphere(0.006, 5, 4), toon(C.silverDark), { pos: [0, -0.052, 0], ink: false });
  part(bell, new THREE.TorusGeometry(0.006, 0.0022, 4, 8), toon(C.silverDark), { pos: [0, -0.008, 0], ink: false });

  // ---------------------------------------------------------------- arms: puffed shoulders, long bell sleeves, lace
  const armMat = ghost(C.gown), handMat = ghost(C.skin);
  const sleeveGeos = [];
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.135, 0.245, 0]);
    part(shoulder, sphere(0.055, 10, 8), armMat, { pos: [side * 0.01, -0.01, 0], scale: [1, 1.05, 1] }); // the puff
    part(shoulder, cyl(0.034, 0.03, 0.15, 8), armMat, { pos: [0, -0.08, 0] });
    const elbow = joint(shoulder, [0, -0.155, 0]);
    elbow.rotation.order = 'YXZ';
    part(elbow, cyl(0.028, 0.03, 0.13, 8), armMat, { pos: [0, -0.06, 0] });
    // The long sleeve flares from the elbow to past the wrist, lined with lace
    const sleeveGeo = skirt({ top: 0.032, bottom: 0.085, height: 0.2, flare: 1.4, points: 12, zig: 0.014, rows: 4, ragged: 0.02 });
    sleeveGeos.push(sleeveGeo);
    part(elbow, sleeveGeo, ghost(C.gown, { side: THREE.DoubleSide }), { pos: [0, -0.02, 0] });
    part(elbow, skirt({ top: 0.07, bottom: 0.082, height: 0.03, flare: 1, points: 12, zig: 0.012, rows: 1 }), mist(C.lace, 0.6, { side: THREE.DoubleSide }), { pos: [0, -0.205, 0], ink: false });
    const wrist = joint(elbow, [0, -0.15, 0]);
    part(wrist, sphere(0.03, 9, 7), handMat, { pos: [0, -0.024, 0.004], scale: [0.85, 1.25, 0.6], ink: false });
    part(wrist, sphere(0.012, 6, 5), handMat, { pos: [-side * 0.022, -0.012, 0.012], scale: [0.9, 1.5, 0.9], ink: false }); // thumb
    return { shoulder, elbow, wrist, side };
  });
  const [armR, armL] = arms; // arms[0] is her right (x -), arms[1] her left

  // The nightrose she's given, in her right hand (hidden until then), held upright by her cheek whatever her hand does
  const rose = joint(armR.wrist, [0.0, -0.03, 0.012], 'rose');
  part(rose, cyl(0.0035, 0.0035, 0.13, 4), toon(C.leaf), { pos: [0, 0.04, 0], ink: false });
  part(rose, merge([0, 1, 2].map((k) => new THREE.SphereGeometry(0.03 - k * 0.008, 8, 6).scale(1, 0.72, 1).translate(0, 0.11 + k * 0.009, 0))),
    toon(C.roseRed, { emissive: new THREE.Color('#5a0018'), emissiveIntensity: 0.45 }));
  part(rose, new THREE.SphereGeometry(0.018, 6, 4).scale(1.6, 0.3, 0.8).translate(0.014, 0.05, 0), toon(C.leaf), { ink: false });
  const roseUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0, -0.35)); // tipped toward her face
  rose.visible = false;

  // ---------------------------------------------------------------- head and face
  const head = joint(neck, [0, 0.205, 0.005], 'head');
  const skull = part(head, new THREE.SphereGeometry(0.188, 28, 20), toon(C.skin), { scale: [0.98, 1.02, 0.96] });
  const face = paintedFace(skull, ['calm', 'blink', 'talk', 'happy', 'sad', 'surprised', 'dramatic'], drawRosalindFace, { rim: 0.3 });
  Object.assign(skull.material, { emissive: new THREE.Color('#2e6a72'), emissiveIntensity: 0.22 });
  part(head, sphere(0.019, 8, 6), ghost(C.skin), { pos: [0, -0.034, 0.18], scale: [0.8, 1, 0.8], ink: false }); // a small nose

  // ---------------------------------------------------------------- hair: a cloud of long waves, drifting
  const hair = joint(head, [0, 0, 0], 'hair');
  const hairMat = ghost(C.hair, { side: THREE.DoubleSide });
  // The cap, all but the face, and the parting swept to her left
  part(hair, new THREE.SphereGeometry(0.2, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.74), hairMat, { pos: [0, 0.008, -0.004] });
  part(hair, new THREE.SphereGeometry(0.203, 24, 8, 0, Math.PI * 2, 0, 0.8), ghost(C.hair), { pos: [0, 0.01, 0], ink: false });
  // The fringe, swept from a parting on her right across to her left in two soft waves
  part(hair, merge([
    taperedTube([[-0.05, 0.155, 0.1], [-0.1, 0.13, 0.15], [-0.15, 0.06, 0.16], [-0.18, -0.03, 0.12]], 0.038, 0.012, 12, 6),
    taperedTube([[-0.04, 0.165, 0.09], [0.04, 0.16, 0.155], [0.12, 0.11, 0.16], [0.175, 0.03, 0.135]], 0.034, 0.011, 12, 6),
    taperedTube([[-0.07, 0.17, 0.04], [-0.13, 0.15, 0.1], [-0.185, 0.09, 0.1]], 0.032, 0.012, 10, 6),
  ]), ghost(C.hairShade), {});
  // A long curtain of waves down her back (it ripples as if the river were over her), and locks over it: two each
  // side framing her face and over her shoulders, and three down her back that float out on their own currents
  const curtainGeo = skirt({ top: 0.19, bottom: 0.33, height: 0.8, flare: 0.75, points: 22, zig: 0.06, gap: 2.1, rows: 6, ragged: 0.1, backDrop: 0.06 });
  part(hair, curtainGeo, ghost(C.hairShade, { side: THREE.DoubleSide }), { pos: [0, 0.03, -0.02] });
  const locks = [];
  const lock = (rootPos, drop, spread, thick, tone, waves, kink, ink = true) => {
    const j = joint(hair, rootPos);
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, wave = Math.sin(t * Math.PI * waves) * kink * Math.min(1, t * 1.6);
      pts.push([spread[0] * t + wave, -drop * t, spread[1] * t + wave * 0.5]);
    }
    part(j, taperedTube(pts, thick, thick * 0.22, 18, 6), ghost(tone, { side: THREE.DoubleSide }), { ink });
    locks.push({ j, i: locks.length, a: Math.atan2(-rootPos[0], -rootPos[2]), sx: new Spring(14, 2.2), sz: new Spring(14, 2.2) });
  };
  for (const side of [-1, 1]) {
    lock([side * 0.18, -0.03, 0.07], 0.52, [side * 0.07, 0.08], 0.045, C.hair, 3.2, 0.05);
    lock([side * 0.2, 0.0, -0.03], 0.66, [side * 0.12, 0.02], 0.052, C.hairShade, 2.6, 0.06);
    lock([side * 0.11, 0.03, -0.17], 0.78, [side * 0.14, -0.12], 0.055, side < 0 ? C.hair : C.hairDeep, 2.2, 0.07, false);
  }
  lock([0, 0.06, -0.19], 0.84, [0, -0.16], 0.06, C.hair, 2, 0.07, false);
  // Pale roses tucked in over her left ear, as in her portraits
  part(hair, merge([[0.17, 0.09, 0.06, 0.03], [0.185, 0.03, 0.0, 0.026], [0.15, 0.13, -0.02, 0.022]].flatMap(([x, y, z, r]) => [0, 1].map((k) =>
    new THREE.SphereGeometry(r - k * 0.009, 8, 6).scale(1, 0.75, 1).translate(x, y + k * 0.008, z)))),
  ghost(C.rosePale), { ink: false });

  // ---------------------------------------------------------------- her own light, and a faint shadow
  const aura = glowSprite(C.glow, 1.5, 0.3);
  aura.position.y = 0.95;
  root.add(aura);
  const light = new THREE.PointLight(C.glow, 0.6, 2.6, 2);
  light.position.set(0, 1.25, 0.55);
  root.add(light);
  const shadow = blobShadow(0.24, 0.22);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- animation
  const S = { lean: new Spring(12, 4), bellX: new Spring(30, 1.6), bellZ: new Spring(30, 1.6), sway: new Spring(10, 3) };
  let time = Math.random() * 10, look = 0, lookTarget = 0, nextLook = 2, blinkT = 2.5, holding = false, spin = 0;
  let fidget = null, nextFidget = 5 + Math.random() * 3, action = null, mood = 'calm', faceTo = null, lastYaw = 0;
  const ACTIONS = { talk: 1.6, sigh: 2.2, twirl: 2.2, cheer: 1.4 };
  const MOODS = { sigh: 'dramatic', twirl: 'happy', cheer: 'happy' };

  const api = {
    root, head, name: 'Rosalind', height: 1.62, radius: 0.26, center: 0.9,
    moves: Object.keys(ACTIONS),
    get busy() { return !!action; },
    get mood() { return mood; },
    face,
    rest: 0, // the heading she floats at when nobody's talking to her
    setMood(m) { mood = m; },
    lookAt(angle) { faceTo = angle; },
    holdRose(on = true) { holding = on; rose.visible = on; },
    play(name, onHit) {
      if (!ACTIONS[name]) return;
      action = { name, t: 0, dur: ACTIONS[name], onHit, hit: false };
    },
    update(dt, speed = 0, turn = 0) {
      time += dt;
      if (action?.name !== 'twirl') root.rotation.y = turnToward(root.rotation.y, faceTo ?? api.rest, 4, dt);
      const yawRate = Math.atan2(Math.sin(root.rotation.y - lastYaw), Math.cos(root.rotation.y - lastYaw)) / Math.max(dt, 1e-3);
      lastYaw = root.rotation.y;
      turn += yawRate;

      // Drifting: up and down, and a slow lean one way and the other
      float.position.y = 0.16 + Math.sin(time * 1.3) * 0.045 + Math.sin(time * 0.53) * 0.02;
      body.rotation.set(0, 0, 0);
      body.position.set(0, 0, 0);
      const drift = Math.sin(time * 0.7);
      hips.rotation.set(0, 0, drift * 0.03);
      torso.rotation.set(S.lean.update(-0.03 + Math.sin(time * 1.3 + 1) * 0.02, dt), 0, -drift * 0.04);
      const breath = Math.sin(time * 1.5);
      torso.scale.set(1 + breath * 0.01, 1 + breath * 0.012, 1 + breath * 0.01);

      // At rest: her left hand lightly at her waist, her right hanging soft; both drift a little
      armR.shoulder.rotation.set(0.05 + Math.sin(time * 0.9) * 0.05, 0, -0.16 - breath * 0.02);
      armR.elbow.rotation.set(-0.25, 0, 0);
      armR.wrist.rotation.set(0.1, 0, 0);
      armL.shoulder.rotation.set(-0.2 + Math.sin(time * 0.9 + 2) * 0.04, 0, 0.12);
      armL.elbow.rotation.set(-1.2, -0.6, 0);
      armL.wrist.rotation.set(0.2, 0, 0.2);
      if (holding) {
        // The rose held up by her cheek, as in her happy portrait
        armR.shoulder.rotation.set(-1.3, 0, -0.65);
        armR.elbow.rotation.set(-1.95, 0.9, 0);
        armR.wrist.rotation.set(0, 0, 0);
      }
      head.rotation.set(0.12, 0, Math.sin(time * 0.6) * 0.05); // she looks a little down: wistful
      let faceNow = null;

      // Idle: she sighs, or turns to look out at the river
      if (!action && faceTo === null) {
        if ((nextFidget -= dt) < 0) { fidget = { name: Math.random() < 0.55 ? 'sigh' : 'river', t: 0 }; nextFidget = 6 + Math.random() * 6; }
      }
      if (fidget) {
        fidget.t += dt;
        const f = fidget.t;
        if (fidget.name === 'sigh') {
          const k = f / 2, up = arch(k, 0, 0.45), down = arch(k, 0.35, 1);
          torso.scale.y *= 1 + up * 0.03;
          torso.rotation.x += down * 0.06;
          head.rotation.x += down * 0.12;
          faceNow = down > 0.3 ? 'blink' : null;
          if (k >= 1) fidget = null;
        } else {
          const k = f / 3, p = win(k, 0, 1, 0.25);
          head.rotation.y += p * 0.7;
          torso.rotation.y = p * 0.2;
          armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, -0.6, p);
          armL.elbow.rotation.set(lerp(-1.2, -1.7, p), lerp(-0.6, -1.1, p), 0);
          faceNow = p > 0.4 ? 'sad' : null;
          if (k >= 1) fidget = null;
        }
      }

      // ---- moves
      if (action) {
        fidget = null;
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        switch (action.name) {
          case 'talk': {
            // An open hand, lifted and turned up; a tilt of the head on the important word
            const p = win(k, 0, 1, 0.2), beat = Math.sin(action.t * 6);
            const A = holding ? armL : armR, s = A.side;
            A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.7 + beat * 0.08, p);
            A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, s * 0.45, p);
            A.elbow.rotation.set(lerp(A.elbow.rotation.x, -0.9 + beat * 0.12, p), lerp(A.elbow.rotation.y, s * 0.3, p), 0);
            A.wrist.rotation.set(lerp(A.wrist.rotation.x, -0.4, p), lerp(0, s * 1.1, p), 0);
            head.rotation.z += arch(k, 0.3, 0.7) * 0.12;
            faceNow = Math.sin(action.t * 15) > 0.1 && k < 0.85 ? 'talk' : null;
            hitAt(0.5);
            break;
          }
          case 'sigh': {
            // "A hundred years!": the back of her right hand to her brow, head back, eyes shut
            const p = win(k, 0.05, 0.92, 0.22);
            armR.shoulder.rotation.set(lerp(armR.shoulder.rotation.x, -2.05, p), 0, lerp(armR.shoulder.rotation.z, 0.1, p));
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.0, p), lerp(armR.elbow.rotation.y, 0.3, p), 0);
            armR.wrist.rotation.set(lerp(0.1, -0.6, p), 0, 0);
            armL.shoulder.rotation.z = lerp(armL.shoulder.rotation.z, 0.5, p);
            armL.elbow.rotation.set(lerp(armL.elbow.rotation.x, -0.5, p), lerp(armL.elbow.rotation.y, -0.2, p), 0);
            head.rotation.x -= p * 0.22;
            head.rotation.z -= p * 0.14;
            torso.rotation.x -= p * 0.08;
            faceNow = 'dramatic';
            hitAt(0.5);
            break;
          }
          case 'twirl': {
            // Round she goes, twice, arms out, the gown flaring
            const p = win(k, 0, 1, 0.12), e = THREE.MathUtils.smootherstep(k, 0.05, 0.95);
            spin = e * Math.PI * 4;
            for (const A of arms) {
              A.shoulder.rotation.set(lerp(A.shoulder.rotation.x, -0.2, p), 0, lerp(A.shoulder.rotation.z, A.side * 1.2, p));
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -0.3, p), 0, 0);
            }
            float.position.y += arch(k, 0.1, 0.9) * 0.08;
            head.rotation.x -= p * 0.15;
            faceNow = 'happy';
            hitAt(0.6);
            break;
          }
          case 'cheer': {
            // Both hands clasped to her heart
            const p = win(k, 0, 1, 0.18);
            for (const A of arms) {
              A.shoulder.rotation.set(lerp(A.shoulder.rotation.x, -0.9, p), 0, lerp(A.shoulder.rotation.z, A.side * 0.1, p));
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -1.5, p), lerp(A.elbow.rotation.y, -A.side * 0.9, p), 0);
            }
            float.position.y += arch(k, 0.1, 0.6) * 0.05;
            head.rotation.z += arch(k, 0.1, 0.9) * 0.12;
            faceNow = 'happy';
            hitAt(0.4);
            break;
          }
        }
        if (k >= 1) {
          if (!action.hit) action.onHit?.();
          action = null;
          spin = 0;
        }
      }
      body.rotation.y = spin;
      const spinning = action?.name === 'twirl' ? Math.min(1, Math.abs(Math.sin(action.t / action.dur * Math.PI)) * 1.4) : 0;

      // Head: look about now and then; toward whoever she's talking to otherwise; blink
      if ((nextLook -= dt) < 0) { lookTarget = faceTo !== null ? 0 : (Math.random() - 0.5) * 0.9; nextLook = 2 + Math.random() * 3; }
      look += (lookTarget - look) * (1 - Math.exp(-dt * 2.5));
      head.rotation.y += look;
      if ((blinkT -= dt) < 0) blinkT = 2.4 + Math.random() * 3;
      face.show(faceNow ?? (blinkT < 0.14 && mood !== 'happy' ? 'blink' : action ? MOODS[action.name] ?? mood : mood));

      // Underwater drift: the gown, the sleeves, the hair and the bell all float and lag
      const sway = S.sway.update(-turn * 0.02, dt);
      swayCloth(gownGeo, { drag: sway, lift: 0.01 + spinning * 0.09, time: time * 0.6, ripple: 0.014 + spinning * 0.01 });
      swayCloth(underGeo, { drag: sway * 0.8, lift: 0.008 + spinning * 0.1, time: time * 0.55 + 1, ripple: 0.016 });
      for (const [i, g] of sleeveGeos.entries()) swayCloth(g, { drag: Math.sin(time * 0.8 + i) * 0.02, lift: 0.004 + spinning * 0.02, time: time * 0.7 + i * 2, ripple: 0.008 });
      tail.rotation.set(Math.sin(time * 1.1) * 0.25 - spinning * 0.3, Math.sin(time * 0.7) * 0.35, Math.cos(time * 0.9) * 0.2);
      wisps.rotation.y = Math.sin(time * 0.5) * 0.15;
      swayCloth(curtainGeo, { drag: 0.04 + sway * 1.5 + Math.sin(time * 0.6) * 0.03, lift: 0.03 + spinning * 0.12, time: time * 0.5, ripple: 0.03 + spinning * 0.02 });
      for (const L of locks) {
        // Each lock floats on its own slow current, lifts a little away from her, and swings out when she spins
        const drift = Math.sin(time * 0.75 + L.i * 0.9) * 0.12, lift = 0.08 + Math.sin(time * 0.5 + L.i * 1.7) * 0.05;
        L.j.rotation.x = L.sx.update(-Math.cos(L.a) * (lift + spinning * 0.5) + drift * 0.3 - head.rotation.x * 0.5, dt);
        L.j.rotation.z = L.sz.update(Math.sin(L.a) * (lift + spinning * 0.5) + drift + turn * 0.03, dt);
      }
      if (holding) holdOrientation(rose, torso, roseUp);
      bell.rotation.x = S.bellX.update(-torso.rotation.x * 0.8 + Math.sin(time * 1.3) * 0.1, dt);
      bell.rotation.z = S.bellZ.update(-turn * 0.05 - torso.rotation.z + spinning * 0.5 * Math.sin(time * 9), dt);
      aura.material.opacity = 0.26 + Math.sin(time * 1.9) * 0.05;
      light.intensity = 0.55 + Math.sin(time * 1.9) * 0.06;
      shadow.material.opacity = 0.2 - (float.position.y - 0.16) * 0.6;
    },
  };
  return api;
}

// ---------------------------------------------------------------- the face
// The canvas covers the front half of her head (see paintedFace in party-kit.js): x 256 is the middle of her face,
// y 262 her eye line, y 322 her mouth. Her own left is the viewer's right. Big soft eyes under heavy lids, long lashes,
// brows that tilt up in the middle (she is wistful even when she's happy), a small mouth, and a little rose in her cheeks.
function drawRosalindFace(g, mood, S) {
  const k = S / 512;
  g.save();
  g.scale(k, k);
  g.fillStyle = C.skin;
  g.fillRect(0, 0, 512, 512);
  for (const x of [186, 326]) {
    const grad = g.createRadialGradient(x, 300, 4, x, 300, 40);
    grad.addColorStop(0, mood === 'happy' || mood === 'surprised' ? 'rgba(214,140,160,0.6)' : C.blush);
    grad.addColorStop(1, 'rgba(214,150,168,0)');
    g.fillStyle = grad;
    ellipse(g, x, 300, 44, 32);
    g.fill();
  }
  g.fillStyle = 'rgba(120,170,172,0.35)'; // under the nose
  ellipse(g, 256, 292, 12, 4);
  g.fill();

  // brows: fine, and tilted up in the middle
  const brows = {
    calm: [210, 0.35], blink: [212, 0.35], talk: [204, 0.3], happy: [206, 0.2], sad: [206, 0.75], surprised: [190, 0.1], dramatic: [200, 0.9],
  };
  const [by, tilt] = brows[mood];
  g.strokeStyle = C.hairDeep;
  g.lineWidth = 6;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 22, by - tilt * 14);
    g.quadraticCurveTo(256 + s * 52, by - 10, 256 + s * 84, by + 4 + tilt * 8);
    g.stroke();
  }

  // eyes: large, sea-green, under heavy lids; long lashes
  const eye = (s, { open = 1, lid = 0.35, look = 0, drop = 0 } = {}) => {
    const cx = 256 + s * 54, cy = 262 + drop, rx = 28, ry = 19 * open;
    g.save();
    g.beginPath();
    g.moveTo(cx - rx, cy);
    g.quadraticCurveTo(cx, cy - ry * 1.9, cx + rx, cy);
    g.quadraticCurveTo(cx, cy + ry * 1.4, cx - rx, cy);
    g.closePath();
    g.fillStyle = '#f4fbfa';
    g.fill();
    g.clip();
    const ix = cx + look * 6, iy = cy + 2;
    g.fillStyle = C.iris;
    g.beginPath(); g.arc(ix, iy, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.irisLight;
    g.beginPath(); g.arc(ix, iy + 3, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16262c';
    g.beginPath(); g.arc(ix, iy, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ix - 5, iy - 6, 4.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ix + 5, iy + 5, 2, 0, Math.PI * 2); g.fill();
    // the lid
    const lidY = cy - ry * (1.5 - lid * 2.2);
    g.fillStyle = C.skinShade;
    g.fillRect(cx - rx - 2, cy - 40, rx * 2 + 4, lidY - (cy - 40));
    g.restore();
    g.strokeStyle = C.lash;
    g.lineWidth = 5.5;
    g.beginPath();
    g.moveTo(cx - rx - 2, cy + 2);
    g.quadraticCurveTo(cx, Math.min(lidY, cy) - 4, cx + rx + 4, cy - 2);
    g.stroke();
    g.lineWidth = 3;
    for (const t of [0.7, 0.85, 1]) { // lashes at the outer corner
      const x = cx + s * rx * t, y = cy - 2 - (1 - t) * 8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 9, y - 7 + t * 2); g.stroke();
    }
  };
  const closed = (s, curve, drop = 0) => {
    const cx = 256 + s * 54, cy = 266 + drop;
    g.strokeStyle = C.lash;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(cx - 24, cy - curve * 0.3);
    g.quadraticCurveTo(cx, cy + curve, cx + 24, cy - curve * 0.3);
    g.stroke();
    g.lineWidth = 3;
    for (const t of [0.6, 0.8, 1]) { const x = cx + s * 24 * t; g.beginPath(); g.moveTo(x, cy - curve * 0.3 + 2); g.lineTo(x + s * 7, cy + 5); g.stroke(); }
  };
  for (const s of [-1, 1]) {
    if (mood === 'blink') closed(s, 6);
    else if (mood === 'happy') closed(s, -10);
    else if (mood === 'dramatic') closed(s, 7, 2);
    else if (mood === 'surprised') eye(s, { open: 1.15, lid: 0 });
    else if (mood === 'sad') eye(s, { lid: 0.5, look: -0.3, drop: 2 });
    else if (mood === 'talk') eye(s, { lid: 0.3, look: 0.2 });
    else eye(s, { lid: 0.42, look: 0.1, drop: 1 });
  }
  if (mood === 'sad' || mood === 'dramatic') { // a single ghostly tear
    g.fillStyle = 'rgba(200,250,255,0.9)';
    ellipse(g, 256 + 60, 300, 4, 7);
    g.fill();
  }

  // mouth: small; a soft smile, open to speak, a little 'o'
  g.strokeStyle = C.lip;
  g.fillStyle = '#7a4a5a';
  g.lineCap = 'round';
  g.lineWidth = 5;
  if (mood === 'talk') {
    ellipse(g, 256, 324, 12, 10);
    g.fill();
  } else if (mood === 'happy') {
    g.beginPath();
    g.moveTo(232, 318);
    g.quadraticCurveTo(256, 342, 280, 318);
    g.quadraticCurveTo(256, 330, 232, 318);
    g.fill();
  } else if (mood === 'surprised') {
    ellipse(g, 256, 326, 8, 11);
    g.fill();
  } else if (mood === 'sad' || mood === 'dramatic') {
    g.beginPath();
    g.moveTo(240, 328);
    g.quadraticCurveTo(256, 318, 272, 328);
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(240, 322);
    g.quadraticCurveTo(256, 330, 272, 321);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- cloth, painted in code
// The gown: sea-green, in soft pleats, with a band of lace near the hem that fades into mist at the very bottom
function gownTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = C.gown;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const grad = g.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, 'rgba(40,90,100,0.2)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(40,90,100,0.2)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 16, h);
    }
    g.fillStyle = C.lace;
    g.fillRect(0, h * 0.7, w, h * 0.05);
    for (let x = 4; x < w; x += 10) { g.beginPath(); g.arc(x, h * 0.77, 3, 0, Math.PI); g.fill(); }
    const mist = g.createLinearGradient(0, h * 0.8, 0, h);
    mist.addColorStop(0, 'rgba(232,247,244,0)');
    mist.addColorStop(1, 'rgba(232,247,244,0.85)');
    g.fillStyle = mist;
    g.fillRect(0, h * 0.8, w, h * 0.2);
  }, { flipY: false });
}

// The bodice: pin-tucks down the front and a row of tiny pearl buttons
function bodiceTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = C.gown;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,90,100,0.35)';
    g.lineWidth = 2;
    for (const x of [0.18, 0.21, 0.29, 0.32]) { g.beginPath(); g.moveTo(w * x, 0); g.lineTo(w * x, h); g.stroke(); }
    g.fillStyle = C.lace;
    for (let y = 12; y < h - 8; y += 16) { g.beginPath(); g.arc(w * 0.25, y, 3, 0, Math.PI * 2); g.fill(); }
  }, { flipY: false });
}
