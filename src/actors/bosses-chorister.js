import * as THREE from 'three';
import { joint, sphere, cyl, lathe, skirt, swayCloth, taperedTube, onLayer, Spring } from './kit.js';
import { mat, glowMat, inkMat, makePart, paint, glow, dotTexture, Strands, Particles, Pulses, movePlayer, window4, ss, lerp, rng, flash, TAU } from './bosses-kit.js';

// The Drowned Chorister (docs/LORE.md §7; Aethermoor's `drowned`, `choir` variant): one of drowned Misthollow's
// choir, still singing in its sleep, drawn as one of Follow Me Down Witch Way's kind ghosts ("70-80% opacity with a
// glow and a bob"). Intents: The Lullaby (A's Hymn: every hero Hexed) and Toll (a bell under the water: every hero
// Spooked). Beaten, it wakes, asks "Is it morning?" and stays to listen.
//
// A ghost in a water-darkened cassock and a lace surplice, a pleated ruff, wet hair that drifts as if it were
// still under the water, eyes closed and mouth open in song, holding an open hymnal whose pages turn by
// themselves. It drips, and bubbles still rise off it.

const C = {
  skin: '#bfe0e6', glow: '#8fe8f5', hair: '#173440', hairTip: '#2f6272', cassock: '#2b4c60', surplice: '#b9d9df',
  ruff: '#f4fcfc', cover: '#43305a', gold: '#e2bd67', page: '#f4ecd2', ribbon: '#a4447a', ink: '#0d3140', bell: '#bfeff2',
};

export function createDrownedChorister() {
  const ghostInk = inkMat(C.ink, { opacity: 0.7, scale: 1 });
  const part = makePart(ghostInk, { order: 1, inkOrder: 2 });
  const solid = makePart(inkMat('#12091a', { scale: 1 }));
  const G = (color, core = 0.62, extra = {}, strength = 0.55) => mat(color, { ghost: { glow: C.glow, core, strength }, emissive: new THREE.Color('#12404a'), emissiveIntensity: 0.3, depthWrite: true, ...extra });

  const faceTex = makeFaces();
  faceTex.show('sing');
  const skinMat = G('#ffffff', 0.97, { map: faceTex.texture, emissiveIntensity: 0.15 }, 0.4);
  const handMat = G(C.skin, 0.82);
  const hairMat = G('#ffffff', 0.88, { vertexColors: true, emissiveIntensity: 0.1 }, 0.22);
  const scalpMat = G(C.hair, 0.92, { emissiveIntensity: 0.1 }, 0.22);
  const cassockMat = G('#ffffff', 0.9, { map: makeCassockTexture(), alphaMap: makeFadeAlpha(), side: THREE.DoubleSide });
  const surpliceMat = G(C.surplice, 0.6, { alphaMap: makeLaceAlpha(), side: THREE.DoubleSide, alphaTest: 0.02 }, 0.45);
  const sleeveMat = G(C.surplice, 0.66, { alphaMap: makeLaceAlpha(true), side: THREE.DoubleSide, alphaTest: 0.02 });
  const ruffMat = G(C.ruff, 0.85, { side: THREE.DoubleSide });
  const mistMat = G('#bfeff2', 0.12, { vertexColors: true, depthWrite: false }, 0.35);
  const own = [skinMat, handMat, hairMat, scalpMat, cassockMat, surpliceMat, sleeveMat, ruffMat];

  const root = new THREE.Group();
  root.name = 'drowned-chorister';
  const float = joint(root, [0, 0.3, 0], 'float');
  const torso = joint(float, [0, 0.72, 0], 'torso');

  // ---------------------------------------------------------------- cassock, and the mist it trails into
  const cassock = part(torso, skirt({ top: 0.15, bottom: 0.33, height: 0.86, flare: 0.8, points: 22, zig: 0.035, rows: 7, ragged: 0.08 }), cassockMat, { pos: [0, 0.06, 0] });
  const tails = new Strands();
  const rt = rng(4);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + rt() * 0.4;
    const x = Math.cos(a) * 0.25, z = Math.sin(a) * 0.25;
    const curl = (rt() - 0.5) * 0.16;
    tails.add([[x, 0.08, z], [x * 0.9, -0.08, z * 0.9], [x * 0.7 + curl, -0.2, z * 0.7], [x * 0.45 - curl, -0.3 - rt() * 0.08, z * 0.45 + curl * 0.5]], 0.035, 0.004, {
      segments: 12, radial: 5, color: '#9fe2ea', tip: '#2f7282', stiff: 4, damp: 1.1, wave: 0.12, sway: 1.6,
    });
  }
  tails.build(mistMat, null, part, joint(torso, [0, -0.74, 0]));

  // ---------------------------------------------------------------- body, surplice, ruff
  part(torso, lathe([[0.001, 0.34], [0.09, 0.335], [0.15, 0.3], [0.165, 0.2], [0.155, 0.08], [0.15, 0.0]].reverse(), 16), cassockMat);
  const surpliceGeo = skirt({ top: 0.17, bottom: 0.33, height: 0.52, flare: 0.75, points: 26, zig: 0.012, rows: 6 });
  const surplice = part(torso, surpliceGeo, surpliceMat, { pos: [0, 0.31, 0], ink: false });
  // A pleated ruff at the throat
  part(torso, ruffGeometry(0.075, 0.17, 22, 0.03), ruffMat, { pos: [0, 0.33, 0] });

  // ---------------------------------------------------------------- arms, sleeves and the hymnal
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.16, 0.27, 0]);
    part(shoulder, cyl(0.04, 0.045, 0.18, 8), cassockMat, { pos: [0, -0.09, 0] });
    const elbow = joint(shoulder, [0, -0.18, 0]);
    part(elbow, cyl(0.035, 0.04, 0.15, 8), cassockMat, { pos: [0, -0.07, 0] });
    // the surplice's wide bell sleeve
    const sleeveGeo = skirt({ top: 0.06, bottom: 0.13, height: 0.3, flare: 0.9, points: 14, zig: 0.01, rows: 3 });
    const sleeve = part(shoulder, sleeveGeo, sleeveMat, { pos: [0, 0.02, 0], ink: false });
    const wrist = joint(elbow, [0, -0.15, 0]);
    part(wrist, sphere(0.04, 10, 8), handMat, { pos: [0, -0.02, 0], scale: [0.9, 1.1, 0.7] });
    return { side, shoulder, elbow, wrist, sleeveGeo };
  });
  const [armR, armL] = arms; // x - is its right

  const book = joint(torso, [0, 0.1, 0.25], 'hymnal');
  book.rotation.x = 0.62;
  const pagesTex = makePagesTexture();
  const coverMat = mat('#ffffff', { map: makeCoverTexture(), emissive: new THREE.Color('#1a0f22') });
  const pageMat = mat(C.page, { map: pagesTex, emissive: new THREE.Color('#fff0c0'), emissiveIntensity: 0.25 });
  const halves = [-1, 1].map((side) => {
    const hinge = joint(book, [0, 0, 0]);
    solid(hinge, new THREE.BoxGeometry(0.15, 0.21, 0.012), coverMat, { pos: [side * 0.075, 0, 0.004] });
    const pages = solid(hinge, new THREE.BoxGeometry(0.138, 0.195, 0.016), pageMat, { pos: [side * 0.07, 0, -0.01], ink: false });
    pages.geometry = pages.geometry.clone();
    // map each half's page face to its half of the spread
    const uv = pages.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    hinge.rotation.y = side * 0.35;
    return { hinge, side };
  });
  // a page that turns by itself now and then
  const turner = joint(book, [0, 0, -0.019]);
  const pageGeo = new THREE.PlaneGeometry(0.134, 0.19, 4, 1);
  pageGeo.translate(0.067, 0, 0);
  const turnPage = new THREE.Mesh(pageGeo, mat(C.page, { side: THREE.DoubleSide, emissive: new THREE.Color('#fff0c0'), emissiveIntensity: 0.3 }));
  turner.add(turnPage);
  turner.visible = false;
  // the ribbon bookmark
  const ribbon = new Strands();
  ribbon.add([[0, 0, 0], [0.01, -0.08, 0.01], [0.02, -0.2, 0.0]], 0.008, 0.006, { segments: 8, radial: 3, color: C.ribbon, tip: '#c0508a', stiff: 9, damp: 1.5, wave: 0.03 });
  ribbon.build(mat('#ffffff', { vertexColors: true }), null, solid, joint(book, [0.005, -0.1, -0.01]));
  const bookGlow = glow('#fff2c8', 0.5, 0.35);
  bookGlow.position.set(0, 0.02, -0.05);
  book.add(bookGlow);

  // ---------------------------------------------------------------- head, face, wet hair
  const neck = joint(torso, [0, 0.35, 0], 'neck');
  part(neck, cyl(0.035, 0.04, 0.06, 8), handMat, { pos: [0, 0.02, 0], ink: false });
  const head = joint(neck, [0, 0.16, 0], 'head');
  part(head, new THREE.SphereGeometry(0.19, 28, 20), skinMat, { scale: [1, 0.97, 0.95] });
  // scalp: everything but the face, with a centre parting
  part(head, new THREE.SphereGeometry(0.2, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.62), scalpMat, { pos: [0, 0.008, -0.004] });
  part(head, new THREE.SphereGeometry(0.202, 24, 8, 0, Math.PI * 2, 0, 0.6), scalpMat, { pos: [0, 0.01, 0] });
  const hair = new Strands();
  const rh = rng(9);
  const lock = (a, y, drop, thick, wave, out = 0.025, sweep = 0) => {
    const x = Math.sin(a) * 0.19, z = Math.cos(a) * 0.19;
    const o = [Math.sin(a) * out, Math.cos(a) * out];
    hair.add([[x * 0.85, y + 0.02, z * 0.85], [x + o[0], y - 0.05, z + o[1]], [x + o[0] * 1.2 + sweep * 0.5, y - drop * 0.6, z + o[1] * 1.2], [x + o[0] + sweep + (rh() - 0.5) * 0.03, y - drop, z + o[1]]],
      thick, thick * 0.22, { segments: 12, radial: 6, color: C.hair, tip: C.hairTip, stiff: 4 + rh() * 2, damp: 1.1, wave, sway: 1.3, lag: 1.2 });
  };
  // a fringe swept to one side, locks that frame the face to the jaw, and long wet strands behind
  for (const [a, sweep, d] of [[-0.62, 0.015, 0.1], [-0.42, 0.025, 0.12], [-0.2, 0.03, 0.11], [0.02, 0.035, 0.12], [0.24, 0.04, 0.11], [0.46, 0.03, 0.1], [0.66, 0.02, 0.09]]) lock(a, 0.16, d, 0.026, 0.015, 0.018, sweep);
  for (const side of [-1, 1]) {
    lock(side * 0.95, 0.08, 0.26, 0.038, 0.05, 0.02);
    lock(side * 1.3, 0.1, 0.34, 0.042, 0.06, 0.022);
    lock(side * 1.8, 0.1, 0.4, 0.045, 0.07, 0.025);
    lock(side * 2.4, 0.12, 0.44, 0.05, 0.07, 0.025);
  }
  lock(Math.PI, 0.14, 0.48, 0.055, 0.07, 0.025);
  hair.build(hairMat, ghostInk, part, head);

  // ---------------------------------------------------------------- the bell under the water (Toll)
  // It rises out of the puddle in front, half under the water, and swings.
  const bellJ = joint(root, [0, 0.3, 0.55], 'bell');
  const bellMat = G(C.bell, 0.28, { side: THREE.DoubleSide, depthWrite: false });
  const bellBody = part(bellJ, lathe([[0.02, 0.36], [0.12, 0.35], [0.17, 0.3], [0.19, 0.18], [0.22, 0.06], [0.3, -0.02], [0.32, -0.05]].reverse().map(([x, y]) => [x, y - 0.3]), 20), bellMat, { ink: false });
  part(bellBody, sphere(0.05, 8, 6), bellMat, { pos: [0, -0.34, 0], ink: false });
  bellJ.visible = false;

  // ---------------------------------------------------------------- water, bubbles, notes, glow
  const drips = new Particles(40, { color: '#a8f4ff', size: 0.035 });
  const bubbles = new Particles(40, { color: '#cffaff', size: 0.045 });
  const mist = new Particles(40, { color: '#bff4ff', size: 0.16, opacity: 0.6 });
  root.add(drips.points, bubbles.points, mist.points);
  const ripples = new Pulses(root, 6, '#8fe8f0', { inner: 0.86 });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: '#0b2530', transparent: true, opacity: 0.55, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.004;
  root.add(puddle);
  const puddleShine = glow('#7fe0f0', 0.9, 0.18);
  puddleShine.position.y = 0.02;
  puddleShine.scale.set(0.9, 0.3, 1);
  root.add(puddleShine);
  const noteTex = makeNoteTextures();
  const notes = Array.from({ length: 7 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex[i % noteTex.length], color: '#dffcff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(0.13, 0.13, 1);
    root.add(s);
    return { s, t: 1, life: 2, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 };
  });
  const question = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeQuestionTexture(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  question.scale.set(0.2, 0.2, 1);
  question.position.set(0.3, 1.78, 0.15);
  root.add(question);
  const aura = glow(C.glow, 1.8, 0.28);
  aura.position.y = 1.2;
  root.add(aura);
  const light = new THREE.PointLight('#9fefff', 0.7, 2.6, 2);
  light.position.set(0, 0.8, 0.7);
  root.add(light);
  onLayer(root);

  // ---------------------------------------------------------------- animation
  const moves = movePlayer({
    attack: [1.3, 0.5], 'cold-hands': [1.3, 0.5], lullaby: [2.4, 0.55], toll: [2.6, 0.45], cast: [2.4, 0.55],
    hurt: [0.6, 0.1], ko: [3.6, 0.9], rise: [1.2, 1],
  });
  const S = { sway: new Spring(10, 3), lean: new Spring(14, 4), book: new Spring(30, 5) };
  let time = rt() * 10, blinkT = 3, noteT = 1, dripT = 0, bubbleT = 0, turnT = 5, turnK = -1, flashOn = false, wake = 0, ask = 0;
  const v = new THREE.Vector3();

  function note(fromMouth = true, spread = 1, speed = 1) {
    const n = notes.find((q) => q.t >= 1) ?? notes[0];
    head.getWorldPosition(v);
    root.worldToLocal(v);
    n.x = v.x + (fromMouth ? 0 : (Math.random() - 0.5) * 0.4);
    n.y = v.y - 0.06;
    n.z = v.z + 0.2;
    const a = Math.random() * TAU;
    n.vx = Math.cos(a) * 0.12 * spread;
    n.vz = 0.1 + Math.sin(a) * 0.08 * spread;
    n.vy = (0.18 + Math.random() * 0.1) * speed;
    n.t = 0;
    n.life = 2.2 + Math.random();
    n.spin = (Math.random() - 0.5) * 2;
  }

  const api = {
    root, head, name: 'Drowned Chorister', height: 1.95, radius: 0.35, center: 1.15,
    // Moves: attack/cold-hands (a wet, cold hand reaches for yours), lullaby (the hymn that kept something asleep
    // for a thousand years: all Hexed; also its cast), toll (a bell tolls under the water: all Spooked), hurt, ko
    // (it wakes, "Is it morning?", and stays to listen), rise.
    moves: ['attack', 'cold-hands', 'lullaby', 'toll', 'cast', 'hurt', 'ko', 'rise'],
    play: (name, onHit, opts) => moves.play(name, onHit, opts),
    get busy() { return moves.busy; },
    update(dt) {
      dt = Math.min(dt, 0.05);
      time += dt;
      // A slow three-four sway: it is always singing, even asleep.
      const beat = time * 1.4;
      const sway = Math.sin(beat * Math.PI / 1.5);
      float.position.set(0, 0.3 + Math.sin(time * 1.3) * 0.045, 0);
      float.rotation.set(0, 0, S.sway.update(sway * 0.05, dt));
      torso.rotation.set(S.lean.update(0.03 + Math.sin(time * 0.7) * 0.02, dt), Math.sin(time * 0.5) * 0.06, 0);
      head.rotation.set(-0.12 + Math.sin(time * 0.9) * 0.03, 0, -sway * 0.08);
      // Arms hold the hymnal up
      for (const A of arms) {
        A.shoulder.rotation.set(-0.55, 0, A.side * 0.12);
        A.elbow.rotation.set(-1.05, 0, 0);
      }
      book.position.set(0, 0.1 + Math.sin(time * 1.3 + 0.5) * 0.005, 0.25);
      book.rotation.set(0.62, 0, 0);
      let spread = 0.35, face = Math.sin(time * 1.1) > 0 ? 'sing' : 'sing2', noteRate = 0.7, wet = 1, bookOpen = 1, awake = 0;
      light.intensity = 0.7;
      aura.material.opacity = 0.28 + Math.sin(time * 1.7) * 0.05;
      ask = Math.max(0, ask - dt * 0.4);

      const a = moves.step(dt);
      if (a) {
        const k = a.k, bell = Math.sin(k * Math.PI);
        const name = a.name === 'attack' ? 'cold-hands' : a.name === 'cast' ? 'lullaby' : a.name;
        switch (name) {
          case 'cold-hands': {
            // It drifts in, still singing, and a cold wet hand closes on yours.
            const reach = window4(k, 0.15, 0.45, 0.6, 0.95);
            float.position.z = reach * 0.55;
            float.position.y -= reach * 0.05;
            armR.shoulder.rotation.x = lerp(-0.55, -1.45, reach);
            armR.shoulder.rotation.z = lerp(-0.12, -0.05, reach);
            armR.elbow.rotation.x = lerp(-1.05, -0.15, reach);
            torso.rotation.x += reach * 0.2;
            book.position.x = reach * 0.06;
            face = reach > 0.5 ? 'sing2' : face;
            noteRate = 0.2;
            if (a.hit && k < 0.53) for (let i = 0; i < 14; i++) { armR.wrist.getWorldPosition(v); root.worldToLocal(v); mist.spawn(v.x, v.y, v.z, (Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.3, 0.3 + Math.random() * 0.4, 0.9); }
            break;
          }
          case 'lullaby': {
            // It opens the hymnal wide, lifts its face, and sings the hymn; notes spiral out and a hush rolls
            // over the ground.
            const up = window4(k, 0.05, 0.3, 0.8, 1);
            head.rotation.x -= up * 0.35;
            torso.rotation.x -= up * 0.08;
            float.position.y += up * 0.12;
            spread = 0.35 + up * 0.35;
            for (const A of arms) { A.shoulder.rotation.x -= up * 0.35; A.shoulder.rotation.z += A.side * up * 0.1; }
            book.position.y += up * 0.08;
            book.position.z += up * 0.06;
            face = 'sing2';
            noteRate = 6 * up;
            aura.material.opacity += up * 0.2;
            aura.material.color.set('#c7b0ff').lerp(new THREE.Color(C.glow), 1 - up);
            light.intensity += up * 1.5;
            if (a.hit && k < 0.57) for (let i = 0; i < 3; i++) setTimeout(() => ripples.fire(v.set(0, 0.02, 0), { from: 0.3, to: 2.6, life: 1.6, peak: 0.6, color: '#c7a8ff' }), i * 250);
            break;
          }
          case 'toll': {
            // It stops singing and bows its head; somewhere under the water a bell tolls, twice.
            const show = window4(k, 0.05, 0.25, 0.8, 1);
            bellJ.visible = show > 0.01;
            bellBody.material.userData.ghost.core.value = 0.28 * show;
            bellBody.material.opacity = show;
            const swing = Math.sin(ss(k, 0.1, 0.9) * Math.PI * 4) * 0.35 * show;
            bellJ.rotation.z = swing;
            bellJ.position.y = 0.42 - (1 - show) * 0.5;
            bellJ.scale.setScalar(0.85);
            head.rotation.x += show * 0.3;
            torso.rotation.x += show * 0.08;
            face = 'toll';
            noteRate = 0;
            for (const A of arms) A.shoulder.rotation.x += show * 0.2;
            const toll = (at) => a.t - dt < at * a.dur && a.t >= at * a.dur;
            if (toll(0.3) || toll(0.62)) {
              ripples.fire(v.set(0, 0.02, 0), { from: 0.2, to: 3.2, life: 1.8, peak: 0.9 });
              ripples.fire(v.set(0, 0.02, 0), { from: 0.1, to: 2.0, life: 1.4, peak: 0.6 });
              light.intensity += 2;
            }
            aura.material.opacity += show * 0.15;
            break;
          }
          case 'hurt': {
            float.position.z = -bell * 0.2;
            torso.rotation.x -= bell * 0.25;
            face = 'hurt';
            noteRate = 0;
            if (a.first) for (let i = 0; i < 10; i++) bubbles.spawn((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3, 0, 0.4, 0, 1.2);
            break;
          }
          case 'ko': {
            // It wakes. The singing stops, its eyes open, the hymnal closes; it looks about ("Is it morning?"),
            // then settles down, hymnal to its chest, to listen.
            wake = ss(k, 0.05, 0.2);
            const look = window4(k, 0.2, 0.3, 0.55, 0.65);
            head.rotation.y = Math.sin(ss(k, 0.22, 0.6) * Math.PI * 2) * 0.45 * look;
            head.rotation.x = lerp(head.rotation.x, 0.05, wake);
            if (k > 0.22 && ask === 0 && k < 0.3) ask = 1;
            listen(ss(k, 0.55, 0.95));
            bookOpen = 1 - ss(k, 0.1, 0.35);
            face = k < 0.2 ? (k < 0.12 ? 'sing' : 'blink') : k < 0.6 ? 'wake' : 'listen';
            noteRate = 0;
            break;
          }
          case 'rise': {
            const back = ss(k, 0, 0.8);
            listen(1 - back);
            bookOpen = back;
            face = back > 0.5 ? 'sing' : 'listen';
            noteRate = 0;
            break;
          }
        }
        if (k >= 1) { moves.finish(); bellJ.visible = false; }
      } else if (moves.downed) {
        listen(1);
        bookOpen = 0;
        face = 'listen';
        noteRate = 0;
      }
      function listen(s) {
        awake = s;
        float.position.y -= s * 0.12;
        head.rotation.x = lerp(head.rotation.x, 0.02, s);
        head.rotation.z = lerp(head.rotation.z, 0.22 + Math.sin(time * 0.8) * 0.04, s);
        head.rotation.y = lerp(head.rotation.y, 0.1, s);
        float.rotation.z *= 1 - s * 0.7;
        // the closed hymnal hugged to its chest
        for (const A of arms) {
          A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.45, s);
          A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * -0.12, s);
          A.elbow.rotation.x = lerp(A.elbow.rotation.x, -1.75, s);
        }
        book.position.lerp(v.set(0.075, 0.13, 0.21), s);
        book.rotation.x = lerp(book.rotation.x, -0.08, s);
        book.rotation.y = lerp(book.rotation.y, Math.PI / 2, s);
      }

      // The book: open or shut (the halves fold on the spine), and now and then a page turns by itself.
      for (const H of halves) {
        H.hinge.rotation.y = H.side * lerp(Math.PI / 2 - 0.02, spread, bookOpen);
        H.hinge.position.x = H.side * 0.013 * (1 - bookOpen);
      }
      if (bookOpen > 0.95 && !a && (turnT -= dt) < 0) { turnT = 6 + rt() * 6; turnK = 0; }
      if (turnK >= 0) {
        turnK += dt / 0.9;
        turner.visible = turnK < 1 && bookOpen > 0.9;
        turner.rotation.y = -ss(turnK, 0, 1) * Math.PI * 0.96 + 0.3;
        turnPage.position.z = -Math.sin(turnK * Math.PI) * 0.03;
        if (turnK >= 1) { turnK = -1; turner.visible = false; }
      }
      bookGlow.material.opacity = 0.35 * bookOpen;

      // Face: sings with its eyes shut; blinks once it is awake
      if ((blinkT -= dt) < 0) blinkT = 2.5 + rt() * 3;
      if (awake > 0.5 && face === 'listen' && blinkT < 0.14) face = 'blink';
      faceTex.show(face);

      // Notes drift up out of its song
      if (noteRate > 0 && (noteT -= dt * noteRate) < 0) { noteT = 1; note(true, 1 + (noteRate > 2 ? 1.5 : 0), noteRate > 2 ? 1.5 : 1); }
      for (const n of notes) {
        if (n.t >= 1) { n.s.material.opacity = 0; continue; }
        n.t += dt / n.life;
        n.x += n.vx * dt + Math.sin(time * 2 + n.spin * 3) * 0.1 * dt;
        n.y += n.vy * dt;
        n.z += n.vz * dt;
        n.s.position.set(n.x, n.y, n.z);
        n.s.material.rotation = Math.sin(time * 2 + n.spin) * 0.3;
        n.s.material.opacity = Math.min(1, n.t * 6) * (1 - ss(n.t, 0.6, 1)) * 0.9;
      }
      question.material.opacity = Math.min(1, ask * 3) * (ask > 0 ? 1 : 0);
      question.position.y = 1.78 + (1 - ask) * 0.12;

      // Water: drips from the sleeves and hem (a ripple where each lands), bubbles still rising off it
      if ((dripT -= dt) < 0) {
        dripT = 0.12 + rt() * 0.25;
        const from = rt();
        if (from < 0.5) { arms[from < 0.25 ? 0 : 1].wrist.getWorldPosition(v); v.y -= 0.05; }
        else { const ang = rt() * TAU; torso.localToWorld(v.set(Math.cos(ang) * 0.3, -0.75, Math.sin(ang) * 0.3)); }
        root.worldToLocal(v);
        const q = drips.spawn(v.x, v.y, v.z, 0, -0.2, 0, 1.2);
        q.splash = true;
      }
      drips.update(dt, { gravity: 4, floor: 0.012 });
      for (const q of drips.p) if (q.splash && q.vy === 0 && q.age < 1) { q.splash = false; const i = drips.p.indexOf(q); ripples.fire(v.set(drips.pos[i * 3], 0.012, drips.pos[i * 3 + 2]), { from: 0.02, to: 0.18, life: 0.7, peak: 0.5 }); }
      if ((bubbleT -= dt) < 0) {
        bubbleT = 0.25 + rt() * 0.4;
        const ang = rt() * TAU, r = 0.1 + rt() * 0.3;
        bubbles.spawn(Math.cos(ang) * r, 0.3 + rt() * 1.2, Math.sin(ang) * r, 0, 0.25 + rt() * 0.15, 0, 2.5);
      }
      bubbles.update(dt, { wobble: 0.08, time });
      mist.update(dt, { drag: 1.5, wobble: 0.05, time });
      ripples.update(dt);

      // Hurt: it flickers
      const hurtK = a && a.name === 'hurt' ? Math.sin(a.k * Math.PI) : 0;
      if (hurtK > 0 || flashOn) {
        flash(own, hurtK * 0.5, '#e8ffff');
        flashOn = hurtK > 0;
        root.visible = !(hurtK > 0.3 && Math.floor(time * 30) % 3 === 0);
      } else root.visible = true;

      // Cloth, hair, tails and ribbon drift as if it were still under the water
      swayCloth(surpliceGeo, { time: time * 0.6, ripple: 0.018, lift: 0.01 + wet * 0.005, drag: Math.sin(time * 0.8) * 0.02 });
      swayCloth(cassock.geometry, { time: time * 0.5, ripple: 0.02, drag: Math.sin(time * 0.7 + 1) * 0.03 });
      for (const A of arms) swayCloth(A.sleeveGeo, { time: time * 0.7 + A.side, ripple: 0.012, lift: 0.01 });
      hair.update(dt, time, { wind: [Math.sin(time * 0.4) * 0.08, -0.05], gust: 0.3, flow: 0.5 });
      tails.update(dt, time, { wind: [Math.sin(time * 0.6) * 0.1, -0.12 - (a?.name === 'cold-hands' ? 0.2 : 0)], gust: 0.4, flow: 0.7 });
      ribbon.update(dt, time, { wind: [0, 0.05], gust: 0.2 });
    },
  };
  return api;
}

// ---------------------------------------------------------------- pieces

// A pleated ruff: a flat ring folded up and down all the way round.
function ruffGeometry(inner, outer, pleats, depth) {
  const pos = [], idx = [];
  const segs = pleats * 4, rings = 3;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const rad = inner + (outer - inner) * t;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * TAU;
      const fold = Math.sin(a * pleats) * depth * (0.3 + t * 0.7);
      pos.push(Math.cos(a) * rad, fold - t * 0.02, Math.sin(a) * rad);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < segs; i++) {
      const a = r * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- painted in code

// Its faces, painted onto the front of the head (u 0.25 is the front) and swapped for moods.
function makeFaces() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  // 1 cm on the head is about 8.6 px here; the face is centred at u 0.25, a little below the equator.
  const cx = W / 4, cy = H / 2 + 14;
  const eyeX = 50, eyeY = cy - 2;
  const INKC = '#15384a';
  const draw = (mood) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.skin;
    g.fillRect(0, 0, W, H);
    // draw the features 1.4x about the face centre (eyes stay at eyeX)
    g.translate(cx, cy);
    g.scale(1.4, 1.4);
    g.translate(-cx, -cy);
    // soft cheeks
    for (const s of [-1, 1]) {
      const grad = g.createRadialGradient(cx + s * 66, cy + 34, 0, cx + s * 66, cy + 34, 30);
      grad.addColorStop(0, 'rgba(236,160,200,0.6)');
      grad.addColorStop(1, 'rgba(236,160,200,0)');
      g.fillStyle = grad;
      g.fillRect(cx + s * 66 - 30, cy + 4, 60, 60);
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // brows: soft, a little raised (hurt pulls them together, waking lifts them)
    g.strokeStyle = INKC;
    g.lineWidth = 4.5;
    for (const s of [-1, 1]) {
      const lift = mood === 'wake' ? -10 : mood === 'hurt' ? 6 : 0;
      g.beginPath();
      g.moveTo(cx + s * (eyeX - 20), eyeY - 34 + lift + (mood === 'hurt' ? 5 : 0));
      g.quadraticCurveTo(cx + s * eyeX, eyeY - 42 + lift, cx + s * (eyeX + 20), eyeY - 34 + lift);
      g.stroke();
    }
    for (const s of [-1, 1]) {
      const x = cx + s * eyeX;
      if (mood === 'wake' || mood === 'listen') {
        const h = mood === 'wake' ? 25 : 21;
        g.fillStyle = '#f4feff';
        g.beginPath(); g.ellipse(x, eyeY, 18, h, 0, 0, TAU); g.fill();
        const iris = g.createLinearGradient(0, eyeY - h, 0, eyeY + h);
        iris.addColorStop(0, '#153e4e');
        iris.addColorStop(1, '#3f94a8');
        g.fillStyle = iris;
        g.beginPath(); g.ellipse(x, eyeY + 2, 14, h - 3, 0, 0, TAU); g.fill();
        g.fillStyle = '#0d2833';
        g.beginPath(); g.ellipse(x, eyeY + 3, 7, h - 10, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x - 5, eyeY - 8, 5.5, 0, TAU); g.fill();
        g.beginPath(); g.arc(x + 6, eyeY + 8, 2.5, 0, TAU); g.fill();
        g.strokeStyle = INKC;
        g.lineWidth = 5;
        g.beginPath(); g.ellipse(x, eyeY, 18, h, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        // lashes at the outer corner
        g.beginPath(); g.moveTo(x + s * 15, eyeY - h + 8); g.lineTo(x + s * 23, eyeY - h + 2); g.stroke();
      } else if (mood === 'hurt') {
        g.strokeStyle = INKC;
        g.lineWidth = 5;
        g.beginPath(); g.moveTo(x - s * 16, eyeY - 9); g.lineTo(x + s * 8, eyeY); g.lineTo(x - s * 16, eyeY + 9); g.stroke();
      } else if (mood === 'blink') {
        g.strokeStyle = INKC;
        g.lineWidth = 5;
        g.beginPath(); g.arc(x, eyeY + 8, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      } else {
        // closed, asleep: a gentle downward curve with long lashes
        g.strokeStyle = INKC;
        g.lineWidth = 5;
        g.beginPath(); g.arc(x, eyeY - 10, 18, Math.PI * 0.16, Math.PI * 0.84); g.stroke();
        g.lineWidth = 3.5;
        for (const l of [0.12, 0.45, 0.8]) {
          const ang = Math.PI * (0.16 + l * 0.68);
          const px = x + Math.cos(ang) * 18, py = eyeY - 10 + Math.sin(ang) * 18;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ang) * 7, py + Math.sin(ang) * 7); g.stroke();
        }
      }
    }
    // nose: the faintest shadow
    g.fillStyle = 'rgba(60,120,135,0.35)';
    g.beginPath(); g.ellipse(cx, cy + 20, 5, 3.5, 0, 0, TAU); g.fill();
    // mouth
    const my = cy + 48;
    g.strokeStyle = INKC;
    g.lineWidth = 4.5;
    if (mood === 'sing' || mood === 'sing2') {
      const h = mood === 'sing' ? 12 : 17;
      g.fillStyle = '#17394a';
      g.beginPath(); g.ellipse(cx, my, 11, h, 0, 0, TAU); g.fill();
      g.fillStyle = '#d98aac';
      g.beginPath(); g.ellipse(cx, my + h * 0.45, 7, h * 0.38, 0, 0, TAU); g.fill();
    } else if (mood === 'toll') {
      g.beginPath(); g.moveTo(cx - 10, my); g.quadraticCurveTo(cx, my + 3, cx + 10, my); g.stroke();
    } else if (mood === 'wake') {
      g.fillStyle = '#17394a';
      g.beginPath(); g.ellipse(cx, my, 7, 9, 0, 0, TAU); g.fill();
    } else if (mood === 'hurt') {
      g.beginPath(); g.arc(cx, my + 10, 11, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    } else {
      g.beginPath(); g.arc(cx, my - 10, 14, Math.PI * 0.22, Math.PI * 0.78); g.stroke();
    }
  };
  let current = null;
  return {
    texture,
    show(mood) {
      if (mood === current) return;
      current = mood;
      draw(mood);
      texture.needsUpdate = true;
    },
  };
}

function makeCoverTexture() {
  // Plum leather, a gold border, and a gold bell (Misthollow's bells) on the cover.
  return paint(128, 160, (g, W, H) => {
    g.fillStyle = C.cover;
    g.fillRect(0, 0, W, H);
    const r = rng(2);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(20,8,30,${0.2 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 3, 2); }
    g.strokeStyle = C.gold;
    g.lineWidth = 4;
    g.strokeRect(10, 10, W - 20, H - 20);
    g.lineWidth = 2;
    g.strokeRect(17, 17, W - 34, H - 34);
    g.fillStyle = C.gold;
    const x = W / 2, y = H / 2 - 4;
    g.beginPath();
    g.moveTo(x - 6, y - 22);
    g.quadraticCurveTo(x - 20, y - 18, x - 20, y + 6);
    g.lineTo(x - 26, y + 18);
    g.lineTo(x + 26, y + 18);
    g.lineTo(x + 20, y + 6);
    g.quadraticCurveTo(x + 20, y - 18, x + 6, y - 22);
    g.closePath();
    g.fill();
    g.beginPath(); g.arc(x, y - 25, 5, 0, TAU); g.fill();
    g.beginPath(); g.arc(x, y + 22, 6, 0, TAU); g.fill();
  }, { wrap: false });
}

function makeFadeAlpha() {
  // The cassock fades into mist toward its hem, in streaks.
  return paint(128, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#f0f0f0');
    grad.addColorStop(1, '#202020');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const r = rng(6);
    for (let i = 0; i < 18; i++) {
      const x = r() * W;
      const s = g.createLinearGradient(0, H * 0.55, 0, H);
      s.addColorStop(0, 'rgba(0,0,0,0)');
      s.addColorStop(1, 'rgba(0,0,0,0.8)');
      g.fillStyle = s;
      g.fillRect(x, H * 0.55, 3 + r() * 8, H * 0.45);
    }
  }, { srgb: false, flipY: false });
}

function makeCassockTexture() {
  // Slate-teal cloth, darker and wetter toward the hem, with water-lines, folds and a few bits of duckweed.
  return paint(256, 256, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#34596e');
    grad.addColorStop(0.55, '#213f50');
    grad.addColorStop(1, '#0f222c');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 22) {
      const f = g.createLinearGradient(x, 0, x + 22, 0);
      f.addColorStop(0, 'rgba(0,20,30,0.25)');
      f.addColorStop(0.5, 'rgba(160,230,240,0.08)');
      f.addColorStop(1, 'rgba(0,20,30,0.25)');
      g.fillStyle = f;
      g.fillRect(x, 0, 22, H);
    }
    const r = rng(12);
    g.strokeStyle = 'rgba(170,240,250,0.18)';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = H * (0.45 + i * 0.12);
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.08 + i) * 3);
      g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(120,170,90,0.7)' : 'rgba(90,140,70,0.6)';
      g.beginPath(); g.arc(r() * W, H * (0.75 + r() * 0.25), 1.5 + r() * 2.5, 0, TAU); g.fill();
    }
    // a column of little buttons down the front (u 0.25 is the front)
    g.fillStyle = 'rgba(210,240,245,0.5)';
    for (let y = 8; y < H * 0.6; y += 14) { g.beginPath(); g.arc(W * 0.25, y, 2.5, 0, TAU); g.fill(); }
  }, { wrap: true, flipY: false });
}

function makeLaceAlpha(sleeve = false) {
  // White is cloth, black is gone: a plain body, then a band of lace with holes and a scalloped edge at the hem.
  return paint(256, 128, (g, W, H) => {
    g.fillStyle = '#d0d0d0';
    g.fillRect(0, 0, W, H);
    const band = sleeve ? 0.6 : 0.72;
    const y0 = H * band;
    g.fillStyle = '#ffffff';
    g.fillRect(0, y0 - 5, W, 4);
    g.fillStyle = '#e0e0e0';
    g.fillRect(0, y0, W, H - y0);
    g.fillStyle = '#000000';
    const step = 16;
    for (let x = 0; x < W; x += step) {
      g.beginPath(); g.arc(x + step / 2, y0 + (H - y0) * 0.35, 4, 0, TAU); g.fill();
      g.beginPath(); g.arc(x, y0 + (H - y0) * 0.62, 2.5, 0, TAU); g.fill();
      // the scalloped edge
      g.beginPath();
      g.moveTo(x, H);
      g.arc(x + step / 2, H, step / 2, Math.PI, 0);
      g.lineTo(x + step, H + 1);
      g.lineTo(x, H + 1);
      g.fill();
    }
  }, { srgb: false, repeat: [sleeve ? 2 : 3, 1], flipY: false });
}

function makePagesTexture() {
  // Two pages of a hymnal: staves and notes, a drop capital, and water stains.
  return paint(256, 192, (g, W, H) => {
    g.fillStyle = C.page;
    g.fillRect(0, 0, W, H);
    const r = rng(3);
    for (const px of [0, W / 2]) {
      for (let s = 0; s < 4; s++) {
        const y0 = 24 + s * 40;
        g.strokeStyle = 'rgba(70,50,40,0.6)';
        g.lineWidth = 1;
        for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(px + 12, y0 + l * 4); g.lineTo(px + W / 2 - 12, y0 + l * 4); g.stroke(); }
        g.fillStyle = 'rgba(50,30,30,0.85)';
        for (let n = 0; n < 7; n++) {
          const x = px + 20 + n * 14 + r() * 3, y = y0 + Math.floor(r() * 8) * 2;
          g.beginPath(); g.ellipse(x, y, 2.6, 2, -0.4, 0, TAU); g.fill();
          g.fillRect(x + 2, y - 11, 1, 11);
        }
      }
      g.fillStyle = 'rgba(140,40,90,0.8)';
      g.font = 'bold 20px serif';
      g.fillText('M', px + 10, 18);
    }
    g.fillStyle = 'rgba(40,20,20,0.35)';
    g.fillRect(W / 2 - 1, 0, 2, H);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = 'rgba(120,150,150,0.18)';
      g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 20, 12 + r() * 10, r(), 0, TAU); g.fill();
    }
  }, { wrap: false });
}

function makeNoteTextures() {
  const draw = (kind) => paint(64, 64, (g) => {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    if (kind === 0) {
      g.beginPath(); g.ellipse(24, 46, 10, 7, -0.4, 0, TAU); g.fill();
      g.fillRect(31, 10, 4, 36);
      g.beginPath(); g.moveTo(35, 10); g.quadraticCurveTo(50, 18, 46, 32); g.stroke();
    } else {
      g.beginPath(); g.ellipse(16, 48, 8, 6, -0.4, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(44, 42, 8, 6, -0.4, 0, TAU); g.fill();
      g.fillRect(21, 14, 4, 34);
      g.fillRect(49, 8, 4, 34);
      g.save(); g.translate(23, 14); g.rotate(-0.2); g.fillRect(0, 0, 30, 7); g.restore();
    }
  }, { wrap: false });
  return [draw(0), draw(1)];
}

function makeQuestionTexture() {
  return paint(64, 64, (g) => {
    g.font = 'bold 52px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#12303a';
    g.strokeText('?', 32, 34);
    g.fillStyle = '#e8fdff';
    g.fillText('?', 32, 34);
  }, { wrap: false });
}
