import * as THREE from 'three';
import { joint, sphere, cyl, lathe, skirt, swayCloth, onLayer, Spring } from './kit.js';
import { mat, inkMat, makePart, glow, Strands, Particles, Pulses, movePlayer, window4, ss, lerp, clamp, rng, flash, mergeParts, drape, rippleDrape, paint, TAU } from './bosses-kit.js';
import { LM, buildLantern, buildPole, makeLace, makeFaces, makeGownTexture, makeCoatTexture, buildMoths, lilyGeometry, sheetSprites } from './bosses-lantern-parts.js';
import { fx as fxArt } from '../assets.js';

// The Lantern Mother (docs/LORE.md §2, §4, §7; Aethermoor's `lantern-mother`): "tall, in a wet lace veil, carrying a
// lantern of borrowed flames". Misthollow's last lamplighter, who led its children out along the Long Boardwalk the
// night the water rose, went back for the last one, and never learned they all got home. Kind, and wrong. The final
// boss, a champion with three phases: Lamplight; the Children's Road (Mourning: her lamp-moths gather); Lights Out
// (Snuff). Intents: Hush Now (every hero Hexed) and Lead Them Down (charging: Led Away). Her Lantern and her Veil each
// have a grip meter and can be pried loose: dropRelic('lantern' | 'veil'). Beaten, the veil falls, she asks "Are
// they safe?", and stays.
//
// A tall, slender ghost in a wet gown and a lamplighter's coat, a long black lace veil that ripples and trails on
// the ground, a wreath of water-lilies, long wet hair, a hooked lamp-pole, and a hexagonal lantern in which
// Wickhollow's violet flames drift like fireflies in a jar. Fen water drips from her hem, sleeves and veil.

export function createLanternMother() {
  const ink = inkMat('#12091a', { scale: 1.2 });
  const thin = inkMat('#12091a', { scale: 0.75 });
  const part = makePart(ink);
  const ghostSkin = (color, extra = {}) => mat(color, { ghost: { glow: '#e6dcff', core: 1, strength: 0.35 }, emissive: new THREE.Color('#2a2440'), emissiveIntensity: 0.25, ...extra });
  const face = makeFaces();
  face.show('calm');
  const skinMat = ghostSkin('#ffffff', { map: face.texture });
  const handMat = ghostSkin(LM.skin);
  const hairMat = mat('#ffffff', { vertexColors: true, emissive: new THREE.Color('#1a1030'), emissiveIntensity: 0.3 });
  const scalpMat = mat(LM.hair, { emissive: new THREE.Color('#1a1030'), emissiveIntensity: 0.3 });
  const gownMat = mat('#ffffff', { map: makeGownTexture(), alphaMap: makeHemFade(), transparent: true, side: THREE.DoubleSide, emissive: new THREE.Color('#1a1030'), emissiveIntensity: 0.25 });
  const coatTex = makeCoatTexture();
  const coatMat = mat('#ffffff', { map: coatTex, side: THREE.FrontSide, emissive: new THREE.Color('#10101a'), emissiveIntensity: 0.2 });
  const liningMat = mat(LM.coatLining, { side: THREE.BackSide, rim: 0 });
  const bodiceMat = mat(LM.coat, { emissive: new THREE.Color('#10101a'), emissiveIntensity: 0.2 });
  const laceTrim = mat('#cfc2ea', { side: THREE.DoubleSide, emissive: new THREE.Color('#3a2a5a'), emissiveIntensity: 0.4 });
  const brass = mat(LM.brass, { emissive: new THREE.Color('#3a2a10'), emissiveIntensity: 0.4 });
  const lace = makeLace(3, 4), laceFront = makeLace(8, 2, true);
  const veilMat = mat('#ffffff', { map: lace.map, alphaMap: lace.alpha, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#ffffff'), emissiveMap: lace.map, emissiveIntensity: 0.3, rim: 1.2 });
  const veilFrontMat = mat('#ffffff', { map: laceFront.map, alphaMap: laceFront.alpha, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#ffffff'), emissiveMap: laceFront.map, emissiveIntensity: 0.3, rim: 1.2 });
  const own = [skinMat, handMat, hairMat, gownMat, coatMat, bodiceMat, laceTrim];

  const rw = rng(23);
  const root = new THREE.Group();
  root.name = 'lantern-mother';
  // She is built at about 2.1 m and drawn a little larger: tall, about 2.4 m to the top of her wreath.
  const SCALE = 1.12;
  const body = joint(root, [0, 0, 0], 'body');
  body.scale.setScalar(SCALE);

  // ---------------------------------------------------------------- the gown, pooling on the ground, dripping
  const gownJ = joint(body, [0, 0, 0], 'gown');
  const gownGeo = drape({
    profile: [[0.13, 1.16], [0.19, 1.0], [0.24, 0.76], [0.33, 0.46], [0.45, 0.18], [0.54, 0.0], [0.6, -0.14]],
    cols: 36, rows: 12, ground: 0.004, ragged: 0.02, zig: 0.01,
    drop: (a, v) => Math.pow(v, 3) * 0.3 * Math.max(0, -Math.sin(a)),
  });
  const gown = part(gownJ, gownGeo, gownMat);
  // ---------------------------------------------------------------- hips, coat, bodice
  const hips = joint(body, [0, 1.12, 0], 'hips');
  const coatGeo = skirt({ top: 0.16, bottom: 0.38, height: 0.74, flare: 0.8, points: 24, zig: 0.03, gap: 1.0, rows: 6, backDrop: 0.16, ragged: 0.05 });
  const coat = part(hips, coatGeo, coatMat, { pos: [0, 0.04, 0] });
  part(coat, coatGeo, liningMat, { ink: false });
  const torso = joint(hips, [0, 0, 0], 'torso');
  part(torso, lathe([[0.06, 0.5], [0.12, 0.45], [0.155, 0.36], [0.17, 0.26], [0.16, 0.12], [0.145, 0.0], [0.15, -0.04]].reverse(), 18), bodiceMat);
  // a row of brass buttons, and a belt
  const buttons = [];
  for (let i = 0; i < 6; i++) { const y = 0.05 + i * 0.065; buttons.push({ geo: new THREE.SphereGeometry(0.014, 8, 6), pos: [0, y, 0.148 + Math.sin((y / 0.5) * Math.PI) * 0.018] }); }
  part(torso, mergeParts(buttons), brass, { ink: false });
  part(torso, cyl(0.152, 0.152, 0.04, 18), mat('#1a1622'), { pos: [0, 0.0, 0] });
  // a high lace collar
  part(torso, skirt({ top: 0.055, bottom: 0.1, height: 0.1, flare: 1.2, points: 22, zig: 0.012, rows: 2 }), laceTrim, { pos: [0, 0.6, 0], ink: thin });
  // the lamplighter's capelet over her shoulders
  const capeGeo = drape({ profile: [[0.07, 0.0], [0.13, -0.02], [0.2, -0.06], [0.25, -0.12], [0.27, -0.2], [0.28, -0.24]], cols: 26, rows: 6, scallop: 0.02 });
  const cape = part(torso, capeGeo, mat('#ffffff', { map: makeCapeTexture(), side: THREE.FrontSide, emissive: new THREE.Color('#10101a'), emissiveIntensity: 0.2 }), { pos: [0, 0.54, 0] });
  part(cape, capeGeo, liningMat, { ink: false });

  // ---------------------------------------------------------------- arms
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.19, 0.44, 0]);
    part(shoulder, cyl(0.045, 0.05, 0.27, 9), bodiceMat, { pos: [0, -0.13, 0] });
    const elbow = joint(shoulder, [0, -0.27, 0]);
    part(elbow, cyl(0.036, 0.045, 0.24, 9), bodiceMat, { pos: [0, -0.12, 0] });
    part(elbow, skirt({ top: 0.04, bottom: 0.075, height: 0.09, flare: 1, points: 14, zig: 0.01, rows: 2 }), laceTrim, { pos: [0, -0.2, 0], ink: thin });
    const wrist = joint(elbow, [0, -0.25, 0]);
    part(wrist, sphere(0.04, 10, 8), handMat, { pos: [0, -0.04, 0.005], scale: [0.85, 1.35, 0.6] });
    part(wrist, sphere(0.014, 6, 5), handMat, { pos: [side * -0.035, -0.02, 0.02], scale: [1, 1.8, 1], ink: false });
    return { side, shoulder, elbow, wrist };
  });
  const [armR, armL] = arms; // x - is her right (the pole), x + her left (the lantern)

  // ---------------------------------------------------------------- head, face, hair
  const neck = joint(torso, [0, 0.5, 0], 'neck');
  part(neck, cyl(0.036, 0.042, 0.14, 8), handMat, { pos: [0, 0.06, 0], ink: false });
  const head = joint(neck, [0, 0.22, 0], 'head');
  part(head, new THREE.SphereGeometry(0.165, 28, 20), skinMat, { scale: [0.96, 1.02, 0.94] });
  part(head, new THREE.SphereGeometry(0.174, 24, 14, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.66), scalpMat, { pos: [0, 0.008, -0.006] });
  part(head, new THREE.SphereGeometry(0.176, 24, 8, 0, Math.PI * 2, 0, 0.55), scalpMat, { pos: [0, 0.01, 0] });
  const hair = new Strands();
  const rh = rng(31);
  const lock = (a, y, drop, thick, out = 0.02, fwd = 0) => {
    const x = Math.sin(a) * 0.165, z = Math.cos(a) * 0.165;
    const o = [Math.sin(a) * out, Math.cos(a) * out];
    hair.add([[x * 0.85, y + 0.03, z * 0.85], [x + o[0], y - 0.08, z + o[1]], [x + o[0] * 1.6, y - drop * 0.4, z + o[1] * 1.6 + fwd * 0.5], [x + o[0] * 1.8 + (rh() - 0.5) * 0.04, y - drop * 0.75, z + o[1] * 1.4 + fwd], [x + o[0] * 1.6, y - drop, z + o[1] * 1.2 + fwd]],
      thick, thick * 0.25, { segments: 16, radial: 6, color: LM.hair, tip: LM.hairTip, stiff: 3 + rh() * 2, damp: 1, wave: 0.03, sway: 1.1, lag: 1 });
  };
  // parted in the middle; two long locks down over her shoulders in front, the rest down her back
  for (const side of [-1, 1]) {
    lock(side * 0.78, 0.1, 0.3, 0.032, 0.02);
    lock(side * 1.1, 0.06, 0.62, 0.042, 0.03, 0.1);
    lock(side * 1.5, 0.08, 0.72, 0.045, 0.035);
    lock(side * 2.0, 0.1, 0.8, 0.05, 0.035);
    lock(side * 2.6, 0.1, 0.84, 0.05, 0.03);
  }
  lock(Math.PI, 0.12, 0.86, 0.055, 0.03);
  hair.build(hairMat, thin, part, head);

  // ---------------------------------------------------------------- a wreath of water-lilies
  const crown = joint(head, [0, 0.13, -0.02], 'crown');
  crown.rotation.x = -0.2;
  part(crown, new THREE.TorusGeometry(0.125, 0.014, 6, 24), mat(LM.pad), { rot: [Math.PI / 2, 0, 0], ink: thin });
  const lilies = [], pads = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i - 3) * 0.55;
    const big = i === 3 ? 1.3 : i % 2 ? 0.8 : 1;
    const g = lilyGeometry(big);
    lilies.push({ geo: g, pos: [Math.cos(a) * 0.125, 0.015, Math.sin(a) * 0.125], rot: [0, 0, 0] });
    lilies.push({ geo: new THREE.SphereGeometry(0.014 * big, 8, 6), pos: [Math.cos(a) * 0.125, 0.025, Math.sin(a) * 0.125] });
    pads.push({ geo: new THREE.CircleGeometry(0.04, 10, 0.3, TAU - 0.6), pos: [Math.cos(a + 0.27) * 0.13, 0.005, Math.sin(a + 0.27) * 0.13], rot: [-Math.PI / 2, 0, a] });
  }
  part(crown, mergeParts(lilies), mat(LM.lily, { side: THREE.DoubleSide, emissive: new THREE.Color('#f0c8ff'), emissiveIntensity: 0.35 }), { ink: false });
  part(crown, mergeParts(pads), mat(LM.pad, { side: THREE.DoubleSide }), { ink: false });

  // ---------------------------------------------------------------- the veil: a sheer front over her face, a long back to the ground
  // The front (blusher) hangs from the wreath over her face to her breast; it lifts back for Mourning.
  const veilLift = joint(crown, [0, 0, 0.02], 'veil-lift');
  const veilFrontGeo = drape({
    profile: [[0.05, 0.02], [0.13, -0.01], [0.18, -0.09], [0.195, -0.18], [0.2, -0.27], [0.23, -0.36], [0.28, -0.46]],
    cols: 24, rows: 10, span: 3.4, center: Math.PI / 2, scallop: 0.012,
  });
  const veilFront = new THREE.Mesh(veilFrontGeo, veilFrontMat);
  veilFront.renderOrder = 5;
  veilLift.add(veilFront);
  // The back: from the wreath down her back and onto the ground, where it trails.
  const veilBackGeo = drape({
    profile: [[0.05, 0.87], [0.14, 0.84], [0.195, 0.75], [0.215, 0.65], [0.28, 0.5], [0.34, 0.28], [0.39, 0.0], [0.46, -0.4], [0.53, -0.8], [0.6, -1.08], [0.66, -1.3]],
    cols: 34, rows: 18, span: 4.3, center: -Math.PI / 2, ground: -1.115, scallop: 0.015,
    drop: (a, v) => Math.pow(v, 2.5) * 0.25 * Math.max(0, -Math.sin(a)),
  });
  const veilBack = new THREE.Mesh(veilBackGeo, veilMat);
  veilBack.renderOrder = 5;
  const veilBackJ = joint(torso, [0, 0, -0.02], 'veil-back');
  veilBackJ.add(veilBack);
  for (const m of [veilFront, veilBack]) m.frustumCulled = false;
  const veil = { state: 'held', t: 0, grip: 1, meshes: [{ m: veilFront, geo: veilFrontGeo }, { m: veilBack, geo: veilBackGeo }] };

  // ---------------------------------------------------------------- the lantern and the pole
  const L = buildLantern(part, thin);
  L.lantern.scale.setScalar(SCALE);
  root.add(L.lantern);
  const lanternState = { state: 'held', grip: 1, vy: 0, swingX: new Spring(14, 2), swingZ: new Spring(14, 2), prev: new THREE.Vector3(), rest: new THREE.Vector3(), placed: 0 };
  const P = buildPole(part, thin);
  P.pole.scale.setScalar(SCALE);
  root.add(P.pole);
  const poleState = { plant: 0, planted: new THREE.Vector3(0, 0, 0), tilt: 0 };

  // ---------------------------------------------------------------- lamp-moths, the road-lights, water, glow
  const moths = buildMoths(6);
  for (const m of moths) root.add(m.s);
  const road = sheetSprites(fxArt.witchfire, 6, 8, 1, (s, i) => {
    s.material.blending = THREE.AdditiveBlending;
    s.center.set(0.5, 0.2);
    const t = i / 5;
    s.position.set(0.75 + t * 0.9, 0.35 + Math.sin(t * 3) * 0.08, 0.1 - t * 1.1);
    const halo = glow(LM.flame, 0.5, 0);
    s.add(halo);
    root.add(s);
    return { s, halo, on: 0, f: i * 3, want: 0 };
  }).list;
  const drips = new Particles(50, { color: '#b8c8ff', size: 0.035 });
  const mist = new Particles(30, { color: '#a898d8', size: 0.3, opacity: 0.35 });
  const motes = new Particles(60, { color: '#d9b8ff', size: 0.07 });
  const homeward = new Particles(20, { color: LM.flame, size: 0.14 });
  root.add(drips.points, mist.points, motes.points, homeward.points);
  const ripples = new Pulses(root, 8, '#a8b0ff', { inner: 0.88 });
  const waves = new Pulses(root, 4, '#c9a0ff', { inner: 0.8 });
  const dark = new Pulses(root, 2, '#0a0612', { inner: 0.4, additive: false });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: '#0a0c18', transparent: true, opacity: 0.6, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.003;
  puddle.renderOrder = -1;
  root.add(puddle);
  const aura = glow('#8a6ad8', 2.8, 0.12);
  aura.position.y = 1.4;
  root.add(aura);
  onLayer(root);

  // ---------------------------------------------------------------- relics
  function dropRelic(which = 'lantern') {
    if (which === 'veil') return dropVeil();
    if (lanternState.state !== 'held') return false;
    lanternState.state = 'falling';
    lanternState.vy = 0;
    // the borrowed flames go home: all but one float up out of it and away
    L.flames.forEach((f, i) => { if (i > 0) sendHome(f, i); });
    return true;
  }
  function sendHome(f, i) {
    if (f.home) return;
    f.home = true;
    f.ht = -i * 0.12;
    L.lantern.localToWorld(v.set(Math.cos(f.a) * f.rr, f.y, Math.sin(f.a) * f.rr));
    root.worldToLocal(v);
    f.hx = v.x; f.hy = v.y; f.hz = v.z;
    f.dx = (Math.random() - 0.3) * 0.8; f.dz = -0.4 - Math.random() * 0.6;
  }
  function dropVeil() {
    if (veil.state !== 'held') return false;
    veil.state = 'falling';
    veil.t = 0;
    root.updateMatrixWorld(true);
    for (const V of veil.meshes) {
      root.attach(V.m);
      V.m.updateMatrix();
      const M = V.m.matrix, inv = M.clone().invert();
      const pos = V.geo.attributes.position, target = new Float32Array(pos.count * 3);
      const p = new THREE.Vector3();
      const r = rng(V.m === veilFront ? 3 : 5);
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(M);
        // lie on the ground behind her, spread out, in soft folds
        const x = p.x * 1.35 + (V.m === veilFront ? 0.15 : 0);
        const z = p.z * 1.15 - 0.35 - (V.m === veilFront ? 0.05 : 0);
        const y = 0.01 + Math.max(0, Math.sin(x * 9 + z * 5)) * 0.03 + r() * 0.004 + (V.m === veilFront ? 0.012 : 0);
        p.set(x, y, z).applyMatrix4(inv);
        target.set([p.x, p.y, p.z], i * 3);
      }
      V.target = target;
    }
    for (let i = 0; i < 16; i++) motes.spawn((Math.random() - 0.5) * 0.5, 1.8 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0.3, -0.2, 1.6);
    return true;
  }
  function setGrip(which, k) {
    if (which === 'veil') veil.grip = clamp(k, 0, 1);
    else lanternState.grip = clamp(k, 0, 1);
  }

  // ---------------------------------------------------------------- animation
  const moves = movePlayer({
    attack: [1.5, 0.5], 'lamp-pole': [1.5, 0.5], 'hush-now': [2.2, 0.55], 'lead-them-down': [2.8, 0.62], mourning: [2.6, 0.55],
    snuff: [2.6, 0.7], moths: [1.8, 0.6], cast: [2.0, 0.55], hurt: [0.7, 0.1], ko: [5.4, 0.9], rise: [1.8, 1],
  });
  const S = { lean: new Spring(10, 4), turn: new Spring(6, 4), wind: new Spring(4, 3), phase: new Spring(3, 3) };
  let time = rw() * 10, blinkT = 3, dripT = 0, mistT = 0, flashOn = false, phaseN = 1, phaseK = 1, mood = 'calm', downedT = 0;
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), q = new THREE.Quaternion();
  const COL = { deep: new THREE.Color(0.3, 0.1, 0.55), white: new THREE.Color(1, 0.92, 1), lilac: new THREE.Color(0.7, 0.55, 1) };
  const handPos = (A, out) => { A.wrist.localToWorld(out.set(0, -0.06, 0.01)); return root.worldToLocal(out); };

  const api = {
    root, head, face, name: 'The Lantern Mother', height: 2.5, radius: 0.65, center: 1.45,
    // Moves: attack/lamp-pole (her hooked pole, swung like a scythe), hush-now ("hush now, hush": all Hexed),
    // lead-them-down (charging: she takes your hand to lead you down under the water, where it's safe: Led Away),
    // mourning (she lifts her veil and you see her grief), snuff (she pinches out the lamps), moths (a lamp-moth comes
    // to her light), cast (lantern flare: every lamp flares at once), hurt, ko (the veil falls: "Are they safe?";
    // she stays), rise. Relics: dropRelic('lantern' | 'veil'), grip(which, 0-1). Phases: phase(1 | 2 | 3).
    moves: ['attack', 'lamp-pole', 'hush-now', 'lead-them-down', 'mourning', 'snuff', 'moths', 'cast', 'hurt', 'ko', 'rise'],
    play: (name, onHit, opts) => {
      const ok = moves.play(name, onHit, opts);
      if (ok && name === 'moths') for (const m of moths) if (!m.on && m.want !== 1) { m.want = 1; m.arrive = 0; break; }
      return ok;
    },
    get busy() { return moves.busy; },
    get relics() { return { lantern: lanternState.state, veil: veil.state }; },
    dropRelic,
    grip: setGrip,
    phase(n) {
      phaseN = clamp(n, 1, 3);
      // the Children's Road: the lamps along the drowned path light one by one; the lamp-moths gather.
      road.forEach((r, i) => (r.want = phaseN === 2 ? 1 : 0));
      road.forEach((r, i) => (r.delay = i * 0.35));
      moths.forEach((m, i) => (m.want = phaseN === 2 ? (i < 4 ? 1 : m.want) : 0));
    },
    update(dt) {
      dt = Math.min(dt, 0.05);
      time += dt;
      const breathe = Math.sin(time * 1.1);
      phaseK += ((phaseN) - phaseK) * (1 - Math.exp(-dt * 1.5));
      const p2 = clamp(1 - Math.abs(phaseK - 2), 0, 1), p3 = clamp(phaseK - 2, 0, 1);

      // ---- rest pose: tall and still, the lantern held out, the pole at her side, the faintest float
      body.position.set(0, 0, 0);
      body.rotation.set(0, S.turn.update(p2 * -0.3, dt), 0);
      hips.position.set(0, 1.12 + breathe * 0.006 + Math.sin(time * 0.7) * 0.01, 0);
      hips.rotation.set(0, 0, Math.sin(time * 0.5) * 0.015);
      torso.rotation.set(S.lean.update(0.02 + p2 * 0.06 - p3 * 0.03, dt), 0, 0);
      neck.rotation.set(0, 0, 0);
      head.rotation.set(0.08 + p2 * 0.12 + Math.sin(time * 0.6) * 0.02, 0, Math.sin(time * 0.45) * 0.03);
      armL.shoulder.rotation.set(-0.62 - p3 * 0.25, 0, 0.26);
      armL.elbow.rotation.set(-0.95 - p3 * 0.3, 0, 0);
      armR.shoulder.rotation.set(-0.12, 0, -0.14);
      armR.elbow.rotation.set(-0.38, 0, 0);
      gownJ.scale.set(1, 1, 1);
      coat.scale.set(1, 1, 1);
      mood = p3 > 0.5 ? 'stern' : p2 > 0.5 ? 'grief' : 'calm';
      let plant = 0, poleSwing = 0, poleTilt = 0.04, lanternLift = 0, flare = 0, hush = 0, wind = [0, 0], veilUp = 0, kneel = 0, gust = 0, dim = 0;
      aura.material.color.set('#8a6ad8').lerp(COL.deep, p3);

      const a = moves.step(dt);
      if (a) {
        const k = a.k, arc = Math.sin(k * Math.PI);
        const name = a.name === 'attack' ? 'lamp-pole' : a.name === 'cast' ? 'flare' : a.name;
        switch (name) {
          case 'lamp-pole': {
            // She lifts the long pole and sweeps it down and across like a scythe.
            const up = window4(k, 0, 0.35, 0.38, 0.5);
            const sweep = window4(k, 0.38, 0.55, 0.7, 1);
            armR.shoulder.rotation.x += -up * 1.6 - sweep * 0.6;
            armR.shoulder.rotation.z += -up * 0.4 + sweep * 0.5;
            armR.elbow.rotation.x += up * 0.3;
            torso.rotation.y = -up * 0.35 + sweep * 0.45;
            torso.rotation.x += sweep * 0.12;
            body.position.z = sweep * 0.3;
            poleSwing = -up * 0.6 + sweep * 1.9;
            gust = sweep;
            mood = 'stern';
            if (a.hit && k < 0.52) waves.fire(v.set(0, 0.03, 0.9), { from: 0.1, to: 0.9, life: 0.6, peak: 0.6 });
            break;
          }
          case 'hush-now': {
            // She draws the lantern close and breathes "hush now, hush"; the flames dim, and a violet hush
            // rolls out over the ground.
            const draw = window4(k, 0, 0.3, 0.75, 1);
            armL.shoulder.rotation.x += -draw * 0.35;
            armL.shoulder.rotation.z += -draw * 0.2;
            armL.elbow.rotation.x += -draw * 0.55;
            torso.rotation.x += draw * 0.1;
            head.rotation.x += draw * 0.22;
            head.rotation.z += draw * 0.12;
            hush = window4(k, 0.35, 0.5, 0.7, 0.9);
            dim = draw * 0.6;
            mood = draw > 0.3 ? 'hush' : mood;
            if (a.hit && k < 0.58) for (let i = 0; i < 3; i++) setTimeout(() => waves.fire(v2.set(0, 0.03, 0), { from: 0.3, to: 3.2, life: 1.8, peak: 0.7 }), i * 300);
            if (hush > 0.2 && Math.random() < dt * 60) { const ang = Math.random() * TAU; motes.spawn(Math.cos(ang) * 0.3, 0.2 + Math.random() * 0.6, Math.sin(ang) * 0.3, Math.cos(ang) * 1.1, 0.05, Math.sin(ang) * 1.1, 1.6); }
            break;
          }
          case 'lead-them-down': {
            // Charging: she lets the pole stand, holds out her hand to one of you, glides close to take it,
            // and turns to lead you down the path of little lights. Then she comes back.
            plant = window4(k, 0, 0.1, 0.9, 1);
            const offer = window4(k, 0.08, 0.3, 0.85, 1);
            const glide = window4(k, 0.45, 0.62, 0.75, 0.95);
            armR.shoulder.rotation.x += -offer * 1.25;
            armR.shoulder.rotation.z += offer * 0.1;
            armR.elbow.rotation.x += offer * 0.2;
            torso.rotation.x += offer * 0.12;
            head.rotation.x += offer * 0.1;
            body.position.z = glide * 0.8;
            body.rotation.y += glide * 0.25;
            mood = 'calm';
            for (const [i, r] of road.entries()) r.lead = Math.max(r.lead ?? 0, ss(k, 0.2 + i * 0.05, 0.35 + i * 0.05) * (1 - ss(k, 0.85, 1)));
            break;
          }
          case 'mourning': {
            // She lets the pole stand, lifts her veil back with her hand, and you see her grief.
            plant = window4(k, 0, 0.1, 0.9, 1);
            const reach = window4(k, 0.05, 0.25, 0.8, 1);
            veilUp = window4(k, 0.18, 0.4, 0.82, 0.98);
            armR.shoulder.rotation.x += -reach * (1.9 + veilUp * 0.8);
            armR.shoulder.rotation.z += -reach * 0.1;
            armR.elbow.rotation.x += -reach * 1.2 + veilUp * 0.6;
            head.rotation.x += -veilUp * 0.12;
            mood = veilUp > 0.3 ? 'grief' : mood;
            if (a.hit && k < 0.57) { dark.fire(v.set(0, 0.03, 0), { from: 0.4, to: 2.6, life: 1.6, peak: 0.55 }); for (let i = 0; i < 20; i++) motes.spawn((Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.8, 0.2, (Math.random() - 0.5) * 0.5, -0.2, 0.6, 2, '#6a4a9a'); }
            break;
          }
          case 'snuff': {
            // She pinches out the lamps one by one, and the dark comes in close.
            plant = window4(k, 0, 0.1, 0.9, 1);
            const reach = window4(k, 0.05, 0.2, 0.85, 1);
            armR.shoulder.rotation.x += -reach * 1.3;
            armR.shoulder.rotation.z += -reach * 0.35 + Math.sin(k * 30) * 0.05 * reach;
            armR.elbow.rotation.x += -reach * 0.4;
            torso.rotation.y = -reach * 0.2;
            mood = 'stern';
            const outs = Math.floor(ss(k, 0.2, 0.75) * 9);
            L.flames.forEach((f, i) => { if (i > 0 && !f.home) f.lit = i <= outs ? Math.max(0, f.lit - dt * 6) : f.lit; });
            road.forEach((r, i) => { if (k > 0.2 + i * 0.08) r.snuffed = 1; });
            if (a.hit && k < 0.72) dark.fire(v.set(0, 0.03, 0), { from: 3.2, to: 0.6, life: 1.3, peak: 0.7 });
            break;
          }
          case 'moths': {
            // She holds up the lantern, and a lamp-moth comes to it out of the dark.
            lanternLift = window4(k, 0, 0.3, 0.7, 1);
            armL.shoulder.rotation.x += -lanternLift * 0.9;
            armL.elbow.rotation.x += lanternLift * 0.6;
            head.rotation.x -= lanternLift * 0.15;
            break;
          }
          case 'flare': {
            // Lantern Flare: she raises the lantern high and every flame in it flares at once.
            lanternLift = window4(k, 0, 0.35, 0.7, 1);
            armL.shoulder.rotation.x += -lanternLift * 1.5;
            armL.shoulder.rotation.z += lanternLift * 0.1;
            armL.elbow.rotation.x += lanternLift * 0.75;
            head.rotation.x -= lanternLift * 0.2;
            torso.rotation.x -= lanternLift * 0.05;
            flare = window4(k, 0.4, 0.52, 0.62, 0.9);
            gust = flare * 0.8;
            if (a.hit && k < 0.57) { waves.fire(v.set(0, 0.03, 0), { from: 0.2, to: 3.6, life: 1.4, peak: 1 }); waves.fire(v.set(0, 0.03, 0), { from: 0.1, to: 2.2, life: 1.1, peak: 0.8 }); }
            break;
          }
          case 'hurt': {
            torso.rotation.x -= arc * 0.22;
            body.position.z = -arc * 0.15;
            head.rotation.x -= arc * 0.15;
            mood = 'hurt';
            gust = arc * 1.2;
            dim = arc * 0.3;
            break;
          }
          case 'ko': {
            // The veil falls. She sinks down, sets the lantern on the ground, the borrowed lights float home, and
            // she looks up: "Are they safe?"
            if (k > 0.1) dropVeil();
            plant = ss(k, 0.1, 0.25);
            kneel = ss(k, 0.25, 0.55);
            const setDown = window4(k, 0.4, 0.58, 0.7, 0.85);
            armL.shoulder.rotation.x += setDown * 0.2 + kneel * 0.3;
            armL.elbow.rotation.x += setDown * 0.7;
            if (k > 0.62 && lanternState.state === 'held') { lanternState.state = 'placing'; }
            if (k > 0.66) L.flames.forEach((f, i) => { if (i > 0 && k > 0.66 + i * 0.02) sendHome(f, i); });
            mood = k < 0.55 ? 'grief' : 'ask';
            head.rotation.x = lerp(head.rotation.x, -0.28, ss(k, 0.6, 0.8));
            head.rotation.y = lerp(0, 0.15, ss(k, 0.6, 0.8));
            restHands(ss(k, 0.72, 0.95));
            break;
          }
          case 'rise': {
            kneel = 1 - ss(k, 0, 0.8);
            plant = 1 - ss(k, 0.6, 0.95);
            restHands(1 - ss(k, 0, 0.5));
            mood = 'calm';
            if (k > 0.5 && lanternState.state !== 'held') { lanternState.state = 'held'; L.flames.forEach((f) => { f.home = false; f.lit = 1; }); }
            break;
          }
        }
        if (k >= 1) moves.finish();
      } else if (moves.downed) {
        downedT += dt;
        kneel = 1;
        plant = 1;
        restHands(1);
        head.rotation.x = -0.28 + Math.sin(time * 0.7) * 0.03;
        head.rotation.y = 0.15;
        mood = downedT > 4 ? 'rest' : 'ask';
      }
      if (!moves.downed) downedT = 0;
      function restHands(s) {
        // kneeling, her hands folded in her lap
        for (const A of arms) {
          A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.2, s);
          A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.16, s);
          A.elbow.rotation.x = lerp(A.elbow.rotation.x, -1.05, s);
          A.elbow.rotation.z = lerp(0, -A.side * 0.85, s);
        }
      }
      // Kneeling: she sinks down and her gown pools round her
      if (kneel > 0) {
        hips.position.y -= kneel * 0.5;
        gownJ.scale.set(1 + kneel * 0.25, 1 - kneel * 0.44, 1 + kneel * 0.25);
        coat.scale.set(1 + kneel * 0.1, 1 - kneel * 0.3, 1 + kneel * 0.1);
        torso.rotation.x += kneel * 0.05;
      }

      // ---- face
      if ((blinkT -= dt) < 0) blinkT = 2.5 + rw() * 3.5;
      if (blinkT < 0.13 && !['hush', 'hurt'].includes(mood)) face.show('blink');
      else face.show(mood);

      // ---- the pole: in her hand, or standing by itself where she let it go
      handPos(armR, v);
      if (plant < 0.01) poleState.planted.set(v.x, 0, v.z);
      const poleHand = v.clone();
      const planted = v2.set(poleState.planted.x, 1.1 * SCALE, poleState.planted.z);
      P.pole.position.copy(poleHand).lerp(planted, plant);
      P.pole.rotation.set(poleSwing * (1 - plant), 0, poleTilt + Math.sin(time * 0.8) * 0.01 + poleSwing * 0.35 * (1 - plant), 'YXZ');
      P.tipFlame.material.opacity = phaseN >= 2 ? 0.8 : 0.35;

      // ---- the lantern: hangs from her hand and swings; or falls to the ground; or is set down
      handPos(armL, v);
      if (lanternState.state === 'held') {
        const vel = v.clone().sub(lanternState.prev).divideScalar(Math.max(dt, 1e-3));
        lanternState.prev.copy(v);
        const loose = 1 + (1 - lanternState.grip) * 2;
        L.lantern.position.copy(v);
        L.lantern.rotation.set(lanternState.swingX.update(clamp(vel.z * 0.12, -0.6, 0.6) * loose + Math.sin(time * 1.1) * 0.03 * loose, dt), 0, lanternState.swingZ.update(clamp(-vel.x * 0.12, -0.6, 0.6) * loose + Math.sin(time * 0.9) * 0.03 * loose + (1 - lanternState.grip) * 0.3, dt));
      } else if (lanternState.state === 'falling') {
        lanternState.vy -= 9.8 * dt;
        L.lantern.position.y += lanternState.vy * dt;
        L.lantern.rotation.x *= 0.95;
        L.lantern.rotation.z *= 0.95;
        if (L.lantern.position.y < 0.54 * SCALE) {
          L.lantern.position.y = 0.54 * SCALE;
          if (Math.abs(lanternState.vy) > 1.2) { lanternState.vy = -lanternState.vy * 0.25; ripples.fire(v2.set(L.lantern.position.x, 0.01, L.lantern.position.z), { from: 0.05, to: 0.7, life: 0.9, peak: 0.8 }); }
          else { lanternState.state = 'dropped'; lanternState.vy = 0; }
        }
      } else if (lanternState.state === 'placing') {
        // she sets it down in front of her, gently
        lanternState.placed = Math.min(1, lanternState.placed + dt * 1.5);
        L.lantern.position.lerp(v2.set(0.3, 0.54 * SCALE, 0.48), lanternState.placed * 0.2);
        L.lantern.rotation.x *= 0.9;
        L.lantern.rotation.z *= 0.9;
        if (lanternState.placed >= 1) lanternState.state = 'dropped';
      } else {
        L.lantern.rotation.x *= 0.9;
        L.lantern.rotation.z *= 0.9;
      }
      if (lanternState.state === 'held' || moves.now?.name === 'rise') lanternState.placed = 0;
      if (lanternLift > 0) L.lantern.rotation.x *= 1 - lanternLift * 0.6;

      // ---- the flames inside: drifting like fireflies in a jar; merging into one in Lights Out; going home
      const merge = p3;
      for (const [i, f] of L.flames.entries()) {
        f.f = (f.f + dt * 12 * (0.8 + (i % 3) * 0.15)) % 8;
        if (f.tex) f.tex.offset.x = Math.floor(f.f) / 8;
        if (f.home) {
          f.ht += dt;
          const t = Math.max(0, f.ht);
          // out of the lantern, up, and away toward Wickhollow
          f.s.visible = false;
          if (t > 0 && t < 3.2 && Math.random() < dt * 20) homeward.spawn(f.hx + f.dx * t * 0.5, f.hy + t * 0.55, f.hz + f.dz * t * 0.5, 0, 0.1, 0, 0.6);
          continue;
        }
        if (!['snuff'].includes(moves.now?.name)) f.lit = Math.min(1, f.lit + dt * 0.8);
        f.a += dt * f.sp;
        const rr = f.rr * (1 - merge) * (1 + hush * 0.4);
        const bob = Math.sin(time * f.sp * 2 + i) * 0.02;
        f.s.visible = f.lit > 0.02 && !!f.tex;
        f.s.position.set(Math.cos(f.a) * rr, lerp(f.y + bob, -0.4, merge), Math.sin(f.a) * rr);
        const main = i === 0;
        const size = (main ? 0.1 + merge * 0.1 : f.size * (1 - merge * 0.7)) * (1 + flare * 1.2) * (1 - dim * 0.5) * f.lit;
        f.s.scale.set(size, size * (341 / 128) * 0.9, 1);
        f.s.material.color.set('#ffffff').lerp(COL.lilac, merge * (main ? 0.2 : 0));
      }
      const litCount = L.flames.reduce((s, f) => s + (f.home ? 0 : f.lit), 0) / L.flames.length;
      L.light.intensity = (0.4 + litCount * 1.0) * (1 + flare * 3 + merge * 0.8) * (1 - dim * 0.6);
      L.light.color.set(LM.flame).lerp(COL.white, merge * 0.6 + flare * 0.4);
      L.core.material.opacity = 0.3 + merge * 0.5 + flare * 0.5;
      L.core.scale.setScalar(0.14 + merge * 0.22 + flare * 0.3);
      L.aura.material.opacity = (0.2 + litCount * 0.2 + flare * 0.5) * (1 - dim * 0.5);
      L.aura.scale.setScalar(1.1 + flare * 1.6 + merge * 0.4);
      L.glassMat.emissiveIntensity = 0.15 + flare + merge * 0.5;

      // ---- the road of little lights (the Children's Road) and the lamp-moths
      for (const [i, r] of road.entries()) {
        if (r.delay > 0) r.delay -= dt;
        const want = (r.want && !r.snuffed && r.delay <= 0 ? 1 : 0) + (r.lead ?? 0);
        r.on += (Math.min(1, want) - r.on) * (1 - Math.exp(-dt * (want > r.on ? 3 : 6)));
        if (moves.now?.name !== 'snuff') r.snuffed = 0;
        r.lead = Math.max(0, (r.lead ?? 0) - dt * 0.5);
        r.f = (r.f + dt * 10) % 8;
        if (r.tex) r.tex.offset.x = Math.floor(r.f) / 8;
        r.s.material.opacity = r.on;
        r.s.scale.set(0.12 * r.on + 0.001, 0.12 * (341 / 128) * r.on + 0.001, 1);
        r.halo.material.opacity = r.on * 0.5;
        r.s.position.y = 0.35 + Math.sin(i * 1.7) * 0.08 + Math.sin(time * 1.3 + i) * 0.04;
      }
      L.lantern.getWorldPosition(v);
      root.worldToLocal(v);
      v.y -= 0.33;
      for (const [i, m] of moths.entries()) {
        const target = m.want && lanternState.state === 'held' ? 1 : 0;
        m.on += (target - m.on) * (1 - Math.exp(-dt * 1.5));
        m.a += dt * m.sp;
        const far = 1 - m.on;
        m.s.position.set(v.x + Math.cos(m.a) * (m.r + far * 2.5), v.y + m.y + Math.sin(time * 3 + i) * 0.05 + far * 1.5, v.z + Math.sin(m.a) * (m.r + far * 2.5));
        m.f = (m.f + dt * 14) % 4;
        if (m.tex) m.tex.offset.x = Math.floor(m.f) / 4;
        m.s.material.opacity = Math.min(1, m.on * 1.5) * 0.95;
        m.g.material.opacity = m.on * 0.5;
      }

      // ---- the veil: ripples; lifts back for Mourning; falls to the ground when it comes loose
      const windY = S.wind.update(p3 * 0.14 + gust * 0.1, dt);
      wind = [Math.sin(time * 0.7) * 0.02, -windY];
      if (veil.state === 'held') {
        const slip = (1 - veil.grip) * 0.35;
        veilLift.rotation.x = -veilUp * 3.85 - slip;
        veilBackJ.rotation.x = slip * 0.3;
        rippleDrape(veilFrontGeo, { time, ripple: 0.006 + gust * 0.02, wave: 0.008 + veilUp * 0.02, wind: [wind[0] * 0.3, wind[1] * 0.3], pin: 1.8 });
        rippleDrape(veilBackGeo, { time: time * 0.8, ripple: 0.012 + gust * 0.03, wave: 0.02 + p3 * 0.03, wind, pin: 1.4, drag: 0.02 * Math.sin(time * 0.5) });
      } else {
        veil.t += dt;
        const blend = ss(veil.t, 0.1, 1.8);
        const flutter = Math.sin(Math.min(1, veil.t / 1.8) * Math.PI);
        for (const V of veil.meshes) rippleDrape(V.geo, { time, ripple: 0.03 * flutter, wave: 0.06 * flutter, lift: 0.15 * window4(veil.t, 0, 0.3, 0.4, 1.0), pin: 1, blend, target: V.target });
        if (veil.t > 2) veil.state = 'dropped';
      }

      // ---- cloth, hair and weed
      swayCloth(coatGeo, { time: time * 0.8, ripple: 0.006 + gust * 0.01, drag: 0.02 * Math.sin(time * 0.6) + windY * 0.3 });
      rippleDrape(capeGeo, { time, ripple: 0.004 + gust * 0.01, wave: 0.004, drag: windY * 0.3, pin: 2 });
      rippleDrape(gownGeo, { time: time * 0.6, ripple: 0.004, wave: 0.006, pin: 2, flare: kneel * 0.05 });
      hair.update(dt, time, { wind: [wind[0], wind[1] * 2], gust: 0.2 + gust, flow: 0.5 });

      // ---- fen water: drips from her hem, sleeves, veil and lantern, rings where they land; a low mist
      if ((dripT -= dt) < 0) {
        dripT = 0.08 + rw() * 0.18;
        const from = rw();
        if (from < 0.3) { const A = arms[from < 0.15 ? 0 : 1]; A.elbow.localToWorld(v.set(0, -0.24, 0.03)); root.worldToLocal(v); }
        else if (from < 0.45 && lanternState.state === 'held') { L.lantern.localToWorld(v.set((rw() - 0.5) * 0.1, -0.53, (rw() - 0.5) * 0.1)); root.worldToLocal(v); }
        else if (from < 0.75 && veil.state === 'held') { veilFront.localToWorld(v.set(Math.cos(rw() * 3.4 + 0.2) * 0.26, -0.46, Math.sin(rw() * 3.4 + 0.2) * 0.26)); root.worldToLocal(v); }
        else { const ang = rw() * TAU; v.set(Math.cos(ang) * 0.4, 0.35, Math.sin(ang) * 0.4); }
        const q2 = drips.spawn(v.x, v.y, v.z, 0, -0.3, 0, 1.2);
        q2.splash = true;
      }
      drips.update(dt, { gravity: 4, floor: 0.01 });
      for (let i = 0; i < drips.count; i++) { const q2 = drips.p[i]; if (q2.splash && q2.vy === 0 && q2.age < 1) { q2.splash = false; ripples.fire(v2.set(drips.pos[i * 3], 0.01, drips.pos[i * 3 + 2]), { from: 0.02, to: 0.2, life: 0.8, peak: 0.45 }); } }
      // a few borrowed sparks always drift up round her, like fireflies let out of a jar
      if (Math.random() < dt * (1.5 + p2 * 2) && !moves.downed) { const ang = Math.random() * TAU, r = 0.35 + Math.random() * 0.5; motes.spawn(Math.cos(ang) * r, 0.3 + Math.random() * 1.2, Math.sin(ang) * r, 0, 0.12 + Math.random() * 0.1, 0, 3.5); }
      if ((mistT -= dt) < 0) { mistT = 0.3; const ang = rw() * TAU, r = 0.5 + rw() * 0.4; mist.spawn(Math.cos(ang) * r, 0.08, Math.sin(ang) * r, Math.cos(ang) * 0.05, 0.02, Math.sin(ang) * 0.05, 4); }
      mist.update(dt, { wobble: 0.03, time, fadeIn: 0.3 });
      motes.update(dt, { drag: 0.8, wobble: 0.1, time });
      homeward.update(dt, { drag: 0.5, fadeIn: 0.05 });
      ripples.update(dt);
      waves.update(dt);
      dark.update(dt);
      aura.material.opacity = (0.12 + Math.sin(time * 1.2) * 0.02) * (1 - p3 * 0.3) + hush * 0.15;

      // ---- hurt flash
      const hurtK = a && a.name === 'hurt' ? Math.sin(a.k * Math.PI) : 0;
      if (hurtK > 0 || flashOn) { flash(own, hurtK * 0.3, '#f0e8ff'); flashOn = hurtK > 0; }
    },
  };
  return api;
}

// The capelet: coat wool with a brass-coloured trim and a row of little brass studs at its edge.
function makeCapeTexture() {
  return paint(256, 64, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3a4052');
    grad.addColorStop(1, '#2a2e3c');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8a7a52';
    g.fillRect(0, H - 9, W, 4);
    g.fillStyle = '#c8b27a';
    for (let x = 6; x < W; x += 16) { g.beginPath(); g.arc(x, H - 16, 2.2, 0, TAU); g.fill(); }
  }, { flipY: false, repeat: [3, 1] });
}

// The gown fades a little toward its hem where it lies in the water.
function makeHemFade() {
  return paint(64, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#f4f4f4');
    grad.addColorStop(1, '#8a8a8a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }, { srgb: false, flipY: false });
}
