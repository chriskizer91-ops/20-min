import * as THREE from 'three';
import { joint, sphere, cyl, lathe, taperedTube, blobShadow, onLayer, Spring } from './kit.js';
import { mat, glowMat, inkMat, makePart, paint, glow, Particles, Pulses, movePlayer, window4, ss, lerp, clamp, rng, flash, mergeParts, TAU } from './bosses-kit.js';

// The Gloamwing (docs/LORE.md §7; Aethermoor's `gloamwing`): "a moth the size of a cart, with the Dawnbell spun
// into its silk". The first boss, a relic-bearer: pale, big and beautiful, never scary. Intents: Dreamdust (scales
// like snow: every hero Spooked) and Bell-Hum (the Dawnbell hums on its thorax: Radiant to all, Staggered). Beaten,
// it flutters up after the moon, then sleeps on Silas's moth-bower.
//
// A great ivory moth with lilac wings (a crescent moon on each), a fluffy collar, feathered antennae and big dark
// gentle eyes. The Dawnbell hangs from its chest in a nest of silk; `dropRelic()` snaps the threads and the bell
// falls free and rings on the ground. `grip(k)` shows how hard the silk still holds it (1 held, 0 about to go).

const C = {
  fur: '#e6dbc6', furShade: '#d2c3a8', collar: '#f3ecdd', band: '#e8d3a2', lilac: '#d7c6ea', eye: '#241a38',
  antenna: '#ead7a0', leg: '#e7ddcc', joint: '#e8c3cf', proboscis: '#c9a86a', bell: '#d8ae52', bellDark: '#8a6424',
  silk: '#f6f3ff', withy: '#6b5238', leaf: '#5f8a55', flower: '#f5f0ff', glow: '#fff0c4',
};

export function createGloamwing() {
  const ink = inkMat('#12091a', { scale: 1.3 });
  const thin = inkMat('#12091a', { scale: 0.8 });
  const part = makePart(ink);
  const furMat = mat(C.fur, { emissive: new THREE.Color('#3a3020'), emissiveIntensity: 0.12 });
  const shadeMat = mat(C.furShade, { emissive: new THREE.Color('#2a2018'), emissiveIntensity: 0.3 });
  const collarMat = mat(C.collar, { emissive: new THREE.Color('#4a4030'), emissiveIntensity: 0.15 });
  const abdomenMat = mat('#ffffff', { map: makeAbdomenTexture(), emissive: new THREE.Color('#ffd98a'), emissiveMap: makeAbdomenGlow(), emissiveIntensity: 0.5 });
  const eyeMat = mat(C.eye, { emissive: new THREE.Color('#3a2a6a'), emissiveIntensity: 0.4, rim: 1.6 });
  const antMat = mat(C.antenna, { emissive: new THREE.Color('#3a3018'), emissiveIntensity: 0.3 });
  const legMat = mat(C.leg);
  const wingTex = { fore: makeWingTexture('fore'), hind: makeWingTexture('hind') };
  const wingMats = ['fore', 'hind'].map((k) => mat('#ffffff', { map: wingTex[k], side: THREE.DoubleSide, alphaTest: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: wingTex[k], emissiveIntensity: 0.12 }));
  const own = [furMat, shadeMat, collarMat, abdomenMat, antMat, legMat, ...wingMats];

  const root = new THREE.Group();
  root.name = 'gloamwing';
  const HOVER = 1.3, PITCH = -1.0; // it hovers nearly upright, so its wings face you
  const fly = joint(root, [0, HOVER, 0], 'fly');
  const body = joint(fly, [0, 0, 0], 'body'); // +z is the head; pitched nose-up while it hovers

  // ---------------------------------------------------------------- thorax, collar, head
  const thorax = part(body, sphere(0.24, 20, 16), furMat, { scale: [1, 0.92, 1.1] });
  // a fluffy collar of fur tufts between head and thorax
  const rf = rng(7);
  const puffs = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + rf() * 0.15;
    const r = 0.2 + rf() * 0.02;
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.95, 0.35).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    puffs.push({ geo: new THREE.SphereGeometry(0.075, 10, 8), pos: [Math.cos(a) * r, Math.sin(a) * r * 0.95, 0.2], rot: [e.x, e.y, e.z], scale: [0.8, 1.35 + rf() * 0.3, 0.7] });
  }
  const collarGeo = mergeParts(puffs);
  part(body, collarGeo, collarMat);
  part(body, sphere(0.2, 16, 12), collarMat, { pos: [0, 0, 0.19], scale: [1, 0.95, 0.5], ink: false });

  const head = joint(body, [0, 0.03, 0.32], 'head');
  part(head, sphere(0.155, 18, 14), furMat, { scale: [1.05, 0.95, 0.95] });
  // a tuft on top and fluffy cheeks
  const tuftGeo = mergeParts([
    { geo: new THREE.ConeGeometry(0.05, 0.12, 5), pos: [0, 0.15, 0.02], rot: [0.3, 0, 0] },
    { geo: new THREE.ConeGeometry(0.045, 0.1, 5), pos: [0.06, 0.13, 0.0], rot: [0.2, 0, -0.5] },
    { geo: new THREE.ConeGeometry(0.045, 0.1, 5), pos: [-0.06, 0.13, 0.0], rot: [0.2, 0, 0.5] },
    { geo: new THREE.ConeGeometry(0.04, 0.09, 5), pos: [0.12, -0.04, 0.06], rot: [0, 0, -1.9] },
    { geo: new THREE.ConeGeometry(0.04, 0.09, 5), pos: [-0.12, -0.04, 0.06], rot: [0, 0, 1.9] },
  ]);
  tuftGeo.computeVertexNormals();
  part(head, tuftGeo, collarMat);
  // big, dark, gentle eyes with two catch-lights each
  const eyes = [-1, 1].map((side) => {
    const e = part(head, sphere(0.085, 16, 12), eyeMat, { pos: [side * 0.1, 0.02, 0.07], scale: [0.85, 1, 0.9], ink: thin });
    const hl = new THREE.Mesh(sphere(0.02, 8, 6), glowMat('#ffffff'));
    hl.position.set(-side * 0.012 + side * 0.03, 0.035, 0.07);
    e.add(hl);
    const hl2 = new THREE.Mesh(sphere(0.01, 6, 5), glowMat('#e8dcff'));
    hl2.position.set(side * 0.05, -0.02, 0.065);
    e.add(hl2);
    return e;
  });
  // a curled proboscis, tucked under
  {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, a = t * Math.PI * 2.4, r = 0.05 * (1 - t * 0.7);
      pts.push([0, -0.1 - Math.sin(a) * r - t * 0.02, 0.1 + Math.cos(a) * r * 0.9 - 0.04]);
    }
    part(head, taperedTube(pts, 0.012, 0.005, 24, 5), mat(C.proboscis), { ink: thin });
  }
  // feathered antennae: a shaft with barbs on both sides, like a fern
  const antennae = [-1, 1].map((side) => {
    const j = joint(head, [side * 0.05, 0.12, 0.08]);
    const shaft = [[0, 0, 0], [side * 0.08, 0.18, 0.06], [side * 0.2, 0.34, 0.0], [side * 0.34, 0.42, -0.12]];
    const curve = new THREE.CatmullRomCurve3(shaft.map((p) => new THREE.Vector3(...p)));
    const pieces = [{ geo: taperedTube(shaft, 0.014, 0.006, 16, 5) }];
    const p = new THREE.Vector3(), tan = new THREE.Vector3();
    for (let i = 2; i < 18; i++) {
      const t = i / 18;
      curve.getPointAt(t, p);
      curve.getTangentAt(t, tan);
      const len = 0.075 * Math.sin(t * Math.PI) + 0.02;
      for (const s of [-1, 1]) {
        const dir = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(s).add(new THREE.Vector3(0, 0, 0.35)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const e = new THREE.Euler().setFromQuaternion(q);
        pieces.push({ geo: new THREE.CylinderGeometry(0.0015, 0.005, len, 4), pos: [p.x + dir.x * len / 2, p.y + dir.y * len / 2, p.z + dir.z * len / 2], rot: [e.x, e.y, e.z] });
      }
    }
    const g = mergeParts(pieces);
    part(j, g, antMat, { ink: thin });
    return { j, side, s: new Spring(30, 4) };
  });

  // ---------------------------------------------------------------- abdomen: soft, banded, glowing faintly
  const abdomenJ = joint(body, [0, -0.02, -0.18], 'abdomen');
  const abdomenGeo = (() => {
    const pts = [];
    const L = 0.78;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      let r = 0.2 * Math.sin(Math.min(1, t * 1.1 + 0.18) * Math.PI) * (1 - t * 0.35) + 0.015;
      r *= 1 - 0.06 * Math.pow(Math.abs(Math.sin(t * Math.PI * 6)), 6);
      pts.push(new THREE.Vector2(Math.max(0.002, r), -t * L));
    }
    const g = new THREE.LatheGeometry(pts.reverse(), 16);
    // lay it along -z, curving down a little toward the tip
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = -y / L;
      p.setXYZ(i, x, -z - t * t * 0.18, y);
    }
    g.computeVertexNormals();
    return g;
  })();
  const abdomen = part(abdomenJ, abdomenGeo, abdomenMat);
  // Phase 2: it begins to wrap itself in silk (A's Cocoon), strand by strand round its abdomen.
  const silkWraps = [0.18, 0.32, 0.46, 0.58].map((d, i) => {
    const r = 0.2 * Math.sin(Math.min(1, (d / 0.78) * 1.1 + 0.18) * Math.PI) * (1 - (d / 0.78) * 0.35) + 0.03;
    const w = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 5, 24), new THREE.MeshToonMaterial({ color: C.silk, transparent: true, opacity: 0.85, emissive: new THREE.Color('#9a94c0'), emissiveIntensity: 0.5 }));
    w.position.set(0, -((d / 0.78) ** 2) * 0.18, -d);
    w.rotation.set(0.15 * (i % 2 ? 1 : -1), 0.25 * (i % 2 ? -1 : 1), 0);
    w.scale.setScalar(0.001);
    abdomenJ.add(w);
    return w;
  });

  // ---------------------------------------------------------------- legs (dangling while it hovers)
  const legs = [];
  for (const [i, [z, rx, rz]] of [[0.12, 1.2, 0.5], [0.02, 0.5, 0.55], [-0.08, 0.2, 0.5]].entries())
    for (const side of [-1, 1]) {
      const hip = joint(body, [side * 0.1, -0.15, z]);
      hip.rotation.set(rx, 0, side * rz);
      part(hip, taperedTube([[0, 0, 0], [0, -0.09, 0.015], [0, -0.19, 0]], 0.022, 0.016, 6, 6), i === 0 ? collarMat : legMat, { ink: thin });
      const knee = joint(hip, [0, -0.19, 0]);
      part(knee, taperedTube([[0, 0, 0], [0, -0.1, 0.025], [0, -0.21, 0.035]], 0.014, 0.007, 6, 5), legMat, { ink: thin });
      part(knee, sphere(0.018, 8, 6), mat(C.joint), { ink: false });
      if (i === 0) part(knee, sphere(0.032, 8, 6), collarMat, { pos: [0, -0.06, 0.015], scale: [1, 1.8, 1], ink: thin });
      legs.push({ hip, knee, side, i, base: hip.rotation.clone() });
    }

  // ---------------------------------------------------------------- wings
  // Each wing is a grid (so its tip can bend) with a painted texture whose alpha is the wing's outline.
  const wings = [];
  const makeWing = (kind, side, pivotPos) => {
    const spec = kind === 'fore' ? { span: 1.42, z0: -0.5, z1: 0.42, nx: 18, nz: 12 } : { span: 1.12, z0: -0.95, z1: 0.3, nx: 16, nz: 14 };
    const g = new THREE.PlaneGeometry(spec.span, spec.z1 - spec.z0, spec.nx, spec.nz);
    g.rotateX(-Math.PI / 2); // lie flat, facing up; plane y becomes -z
    g.translate(spec.span / 2, 0, (spec.z0 + spec.z1) / 2);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / spec.span, (pos.getZ(i) - spec.z0) / (spec.z1 - spec.z0));
    g.userData.rest = Float32Array.from(pos.array);
    g.userData.span = spec.span;
    const pivot = joint(body, pivotPos);
    const holder = joint(pivot, [0, 0, 0]);
    holder.scale.x = side;
    const m = new THREE.Mesh(g, wingMats[kind === 'fore' ? 0 : 1]);
    m.frustumCulled = false;
    holder.add(m);
    wings.push({ kind, side, pivot, geo: g, bend: new Spring(26, 3.5), prevAngle: 0 });
  };
  for (const side of [-1, 1]) {
    makeWing('fore', side, [side * 0.13, 0.12, 0.06]);
    makeWing('hind', side, [side * 0.12, 0.04, -0.1]);
  }

  // ---------------------------------------------------------------- the Dawnbell, spun into silk on its chest
  const bellHang = joint(body, [0, -0.2, 0.16], 'bell-hang');
  const bell = joint(bellHang, [0, 0, 0], 'dawnbell');
  const bellTex = makeBellTexture();
  const bellMat = mat('#d8b478', { map: bellTex, emissive: new THREE.Color('#ffcf6a'), emissiveIntensity: 0 });
  part(bell, lathe([[0.02, 0.0], [0.05, -0.01], [0.075, -0.04], [0.085, -0.1], [0.1, -0.17], [0.135, -0.215], [0.14, -0.23]].reverse(), 22), bellMat);
  part(bell, new THREE.CircleGeometry(0.135, 22), mat(C.bellDark), { pos: [0, -0.215, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  part(bell, new THREE.TorusGeometry(0.03, 0.01, 6, 14), mat(C.bell), { pos: [0, 0.02, 0] });
  const clapper = joint(bell, [0, -0.05, 0]);
  part(clapper, cyl(0.006, 0.006, 0.14, 4), mat(C.bellDark), { pos: [0, -0.07, 0], ink: false });
  part(clapper, sphere(0.03, 10, 8), mat(C.bellDark), { pos: [0, -0.15, 0], ink: false });
  const bellGlow = glow('#ffe39a', 0.9, 0);
  bellGlow.position.y = -0.1;
  bell.add(bellGlow);
  const bellLight = new THREE.PointLight('#ffe2a0', 0, 3, 2);
  bellLight.position.y = -0.12;
  bell.add(bellLight);
  // the silk: a nest round the bell's crown, two bands round the bell, threads up to its chest and legs
  const silkMat = mat(C.silk, { transparent: true, opacity: 0.8, emissive: new THREE.Color('#9a94c0'), emissiveIntensity: 0.4 });
  const nest = part(bell, new THREE.SphereGeometry(0.075, 14, 8, 0, TAU, 0, Math.PI * 0.6), silkMat, { pos: [0, 0.0, 0], scale: [1.2, 0.9, 1.2], ink: thin });
  const bands = [0.07, 0.14].map((y, i) => part(bell, new THREE.TorusGeometry(0.09 + i * 0.03, 0.006, 5, 22), silkMat, { pos: [0, -y, 0], rot: [Math.PI / 2 + (i ? 0.2 : -0.25), 0.1, 0], ink: false }));
  const threads = [];
  const threadEnds = [[0, 0.14, 0.02], [0.1, 0.12, -0.05], [-0.1, 0.12, -0.05], [0.16, 0.05, 0.08], [-0.16, 0.05, 0.08], [0.05, 0.1, 0.12], [-0.06, 0.1, 0.12]];
  for (const [x, y, z] of threadEnds) {
    const t = part(bellHang, taperedTube([[0, 0.01, 0], [x * 0.5, y * 0.5 + 0.02, z * 0.5], [x, y, z]], 0.006, 0.004, 6, 4), silkMat, { ink: false });
    threads.push(t);
  }

  // ---------------------------------------------------------------- the moth-bower it sleeps on (after ko)
  const bower = joint(root, [0, 0, -0.1], 'moth-bower');
  bower.visible = false;
  const bowerParts = [];
  for (const [side, lean] of [[-1, 0], [1, 0.08], [-1, 0.12], [1, -0.06]]) {
    const x0 = side * (0.55 + lean), z0 = lean * 0.6;
    bowerParts.push({ geo: taperedTube([[x0, 0, z0], [x0 * 0.95, 0.55, z0], [x0 * 0.7, 1.0, z0 * 0.5], [0, 1.18 + lean * 0.3, 0], [-x0 * 0.4, 1.08, -z0 * 0.3]], 0.035, 0.015, 20, 6) });
  }
  bowerParts.push({ geo: taperedTube([[-0.6, 0.35, 0.02], [0, 0.42, 0.05], [0.6, 0.3, 0.0]], 0.02, 0.02, 12, 5) });
  bowerParts.push({ geo: taperedTube([[-0.52, 0.75, 0], [0, 0.82, 0.04], [0.52, 0.72, 0]], 0.018, 0.018, 12, 5) });
  part(bower, mergeParts(bowerParts), mat(C.withy));
  // moonflowers and leaves wound through it
  const flowerGeo = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * TAU, r = i % 2 ? 0.035 : 0.075;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ShapeGeometry(s, 3);
  })();
  const blooms = [], leafBits = [];
  const rb = rng(17);
  for (let i = 0; i < 14; i++) {
    const t = i / 13, side = i % 2 ? 1 : -1;
    const a = t * Math.PI;
    const x = Math.cos(a) * 0.56 * (1 - 0.08 * rb()), y = Math.sin(a) * 1.12 + 0.02;
    blooms.push({ geo: flowerGeo, pos: [x, y, 0.06 + rb() * 0.03], rot: [0, (rb() - 0.5) * 0.6, rb() * 3] });
    leafBits.push({ geo: new THREE.SphereGeometry(0.05, 6, 4), pos: [x + side * 0.05, y - 0.08, 0.02], scale: [0.5, 1, 0.2], rot: [0, 0, side * 0.7] });
  }
  const bloomMesh = part(bower, mergeParts(blooms), mat(C.flower, { side: THREE.DoubleSide, emissive: new THREE.Color('#b8a8ff'), emissiveIntensity: 0.45 }), { ink: false });
  part(bower, mergeParts(leafBits), mat(C.leaf), { ink: thin });

  // ---------------------------------------------------------------- dust, rings, glow
  const dust = new Particles(220, { color: '#f4ecff', size: 0.075 });
  const sparks = new Particles(40, { color: '#fff1b8', size: 0.06 });
  root.add(dust.points, sparks.points);
  const rings = new Pulses(root, 5, '#ffe7a0', { inner: 0.9, flat: false });
  const groundRings = new Pulses(root, 4, '#fff0c8', { inner: 0.9 });
  const halo = glow('#e8dcff', 3.2, 0.14);
  fly.add(halo);
  const light = new THREE.PointLight('#fff1d0', 1.2, 4.5, 2);
  light.position.set(0, -0.1, 0.3);
  fly.add(light);
  const shadow = blobShadow(1.1, 0.35);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- relic
  const relic = { state: 'held', grip: 1, vy: 0, vx: 0, vz: 0, spin: 0, lie: 0, bounces: 0 };
  function setGrip(k) {
    relic.grip = clamp(k, 0, 1);
    const n = Math.ceil(relic.grip * threads.length);
    threads.forEach((t, i) => (t.visible = relic.state === 'held' && i < n));
    bands[1].visible = relic.state === 'held' && relic.grip > 0.5;
  }
  function dropRelic() {
    if (relic.state !== 'held') return false;
    relic.state = 'falling';
    for (const t of threads) t.visible = false;
    for (const b of bands) b.visible = false;
    nest.visible = false;
    root.updateMatrixWorld(true);
    root.attach(bell);
    bell.getWorldPosition(v);
    root.worldToLocal(v);
    for (let i = 0; i < 24; i++) sparks.spawn(v.x, v.y, v.z, (Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 0.5, i % 2 ? '#ffffff' : null);
    relic.vx = 0.3;
    relic.vz = 0.5;
    relic.vy = 0.4;
    relic.spin = 0;
    return true;
  }

  // ---------------------------------------------------------------- animation
  const moves = movePlayer({
    attack: [1.3, 0.5], 'wing-buffet': [1.3, 0.5], dreamdust: [2.4, 0.55], 'bell-hum': [2.4, 0.55], cast: [2.4, 0.55],
    hurt: [0.6, 0.1], ko: [5.0, 0.95], rise: [1.6, 1],
  });
  const S = { bellX: new Spring(18, 2.2), bellZ: new Spring(18, 2.2), pitch: new Spring(8, 4), head: new Spring(20, 4) };
  let time = rf() * 10, flapPhase = 0, flapRate = 1.4, look = 0, lookT = 0, nextLook = 2, flashOn = false, phaseN = 1, silkT = 0;
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const prevBell = new THREE.Vector3();

  // A pose for the wings: angle (up is +), sweep (back is +), and how much each pair follows.
  function wingPose(up, sweep, hindLag = 0.25, hindScale = 0.85) {
    for (const W of wings) {
      const fore = W.kind === 'fore';
      const a = fore ? up : up * hindScale - hindLag;
      W.pivot.rotation.set(0, W.side * sweep * (fore ? 1 : 1.3), W.side * a, 'YXZ');
    }
  }

  const api = {
    root, name: 'The Gloamwing', height: 2.6, radius: 1.2, center: 1.3,
    // Moves: attack/wing-buffet (a downstroke like a door slammed in a gale), dreamdust (scales like snow: all
    // Spooked), bell-hum (the Dawnbell hums: Radiant to all, Staggered; also its cast), hurt, ko (flutters up after
    // the moon, then sleeps on a moth-bower), rise. Relic: dropRelic() and grip(0-1). phase(1|2).
    moves: ['attack', 'wing-buffet', 'dreamdust', 'bell-hum', 'cast', 'hurt', 'ko', 'rise'],
    play: (name, onHit, opts) => moves.play(name, onHit, opts),
    get busy() { return moves.busy; },
    get relic() { return relic.state; },
    dropRelic,
    grip: setGrip,
    // Phase 2 (below half): it begins to spin silk about itself, and the moons on its wings brighten.
    phase(n) { phaseN = n; },
    update(dt) {
      dt = Math.min(dt, 0.05);
      time += dt;
      flapRate = 1.2;
      let flapAmp = 0.4, flapBase = 0.04, sweep = -0.05, pitch = PITCH, rise = 0, lean = 0, forward = 0, sleep = 0, hum = 0, dustRate = 1.2, bellShine = 0;
      fly.position.set(0, HOVER, 0);
      fly.rotation.set(0, 0, 0);
      let manualWings = false;

      const a = moves.step(dt);
      if (a) {
        const k = a.k, arc = Math.sin(k * Math.PI);
        const name = a.name === 'attack' ? 'wing-buffet' : a.name === 'cast' ? 'bell-hum' : a.name;
        switch (name) {
          case 'wing-buffet': {
            // Rise, lift the wings high, then one great downstroke as it surges forward.
            const wind = window4(k, 0, 0.35, 0.38, 0.5);
            const stroke = window4(k, 0.38, 0.52, 0.65, 1);
            manualWings = true;
            wingPose(0.25 + wind * 0.95 - stroke * 1.25, 0.05 - wind * 0.25 + stroke * 0.2, 0.2 - stroke * 0.3);
            rise = wind * 0.25 - stroke * 0.1;
            forward = stroke * 0.7;
            pitch += wind * -0.2 + stroke * 0.35;
            if (a.hit && k < 0.53) for (let i = 0; i < 30; i++) dust.spawn((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 0.8, 0.6 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4, -0.4, 2.5 + Math.random(), 1.2);
            break;
          }
          case 'dreamdust': {
            // It rises and spreads its wings wide and shivers them; scales pour off like snow.
            const up = window4(k, 0, 0.25, 0.8, 1);
            rise = up * 0.35;
            flapRate = 1.4 + up * 5;
            flapAmp = 0.62 - up * 0.45;
            flapBase = 0.22 + up * 0.25;
            sweep = 0.05 - up * 0.15;
            pitch += up * 0.2;
            dustRate = 1.2 + up * 110;
            halo.material.opacity = 0.14 + up * 0.25;
            break;
          }
          case 'bell-hum': {
            // Wings held high and still, trembling; the Dawnbell glows and hums, rings of light go out.
            const up = window4(k, 0, 0.2, 0.82, 1);
            manualWings = true;
            const tremble = Math.sin(time * 70) * 0.03 * up;
            wingPose(0.22 + up * 0.95 + tremble, 0.05 - up * 0.1, 0.1);
            rise = up * 0.2;
            pitch += up * 0.12;
            hum = up;
            bellShine = relic.state === 'held' ? up : up * 0.25;
            if (relic.state === 'held' && Math.floor((a.t - dt) / 0.3) !== Math.floor(a.t / 0.3) && k > 0.2 && k < 0.85) {
              bell.getWorldPosition(v);
              root.worldToLocal(v);
              rings.fire(v, { from: 0.1, to: 1.8, life: 0.9, peak: 0.8 });
            }
            if (a.hit && k < 0.57) groundRings.fire(v.set(0, 0.03, 0), { from: 0.3, to: 3, life: 1.3, peak: 0.8 });
            break;
          }
          case 'hurt': {
            // It jerks back, wings crumpling for a moment.
            manualWings = true;
            wingPose(0.2 - arc * 0.6, 0.05 + arc * 0.5, 0.1);
            forward = -arc * 0.3;
            pitch -= arc * 0.25;
            if (a.first) for (let i = 0; i < 20; i++) dust.spawn((Math.random() - 0.5) * 1.8, 1.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.4, 1.5);
            break;
          }
          case 'ko': {
            // Beaten, it looks up, flutters up after the moon (out of sight), and comes down again to sleep on
            // the moth-bower, which grows up out of the ground while it's away.
            const up = ss(k, 0.06, 0.42);
            const down = ss(k, 0.5, 0.86);
            const fold = ss(k, 0.84, 0.98);
            rise = up * 2.6 - down * (2.6 + HOVER - 1.28);
            fly.position.x = Math.sin(ss(k, 0.06, 0.5) * Math.PI * 2) * 0.4 * (1 - down);
            fly.rotation.y = Math.sin(k * 9) * 0.3 * (1 - fold);
            flapRate = 1.4 + up * 2.5 * (1 - down) + down * 0.5 * (1 - fold);
            pitch = lerp(PITCH - window4(k, 0, 0.08, 0.4, 0.5) * 0.3, 0.05, fold);
            bower.visible = k > 0.35;
            const grow = ss(k, 0.38, 0.62);
            bower.scale.set(1, Math.max(0.001, grow), 1);
            bloomMesh.scale.setScalar(Math.max(0.001, ss(k, 0.55, 0.8)));
            if (fold > 0) { manualWings = true; sleepWings(fold); }
            sleep = fold;
            break;
          }
          case 'rise': {
            const wake = ss(k, 0, 0.7);
            rise = (1 - wake) * -0.25;
            pitch = lerp(0.05, PITCH, wake);
            if (wake < 1) { manualWings = true; sleepWings(1 - wake); }
            bower.scale.set(1, Math.max(0.001, 1 - ss(k, 0.3, 1)), 1);
            bower.visible = k < 0.98;
            sleep = 1 - wake;
            break;
          }
        }
        if (k >= 1) moves.finish();
      } else if (moves.downed) {
        rise = -0.25;
        pitch = 0.05 + Math.sin(time * 0.8) * 0.02;
        manualWings = true;
        sleepWings(1);
        sleep = 1;
        bower.visible = true;
        bower.scale.set(1, 1, 1);
        bloomMesh.scale.setScalar(1);
      }
      function sleepWings(s) {
        // Asleep it lies along the top of the bower with its wings spread and drooping over it, so the moons
        // on them show, the way a luna moth rests.
        for (const W of wings) {
          const fore = W.kind === 'fore';
          const flapNow = Math.sin(flapPhase) * 0.5 + 0.2;
          W.pivot.rotation.set(0, W.side * lerp(0.05, fore ? 0.3 : 0.55, s), W.side * lerp(flapNow, fore ? -0.28 + Math.sin(time * 0.7) * 0.03 : -0.4, s), 'YXZ');
        }
      }

      // Flight: a slow, soft flap; the body rises on each downstroke
      flapPhase += dt * flapRate * TAU * (1 - sleep * 0.97);
      const flap = Math.sin(flapPhase);
      if (!manualWings) wingPose(flapBase + flap * flapAmp, sweep + Math.cos(flapPhase) * 0.08);
      const bob = -Math.cos(flapPhase) * 0.05 * (1 - sleep);
      fly.position.y += rise + bob + Math.sin(time * 0.6) * 0.04 * (1 - sleep);
      fly.position.z = forward;
      body.rotation.set(S.pitch.update(pitch, dt), 0, Math.sin(time * 0.5) * 0.04 * (1 - sleep));
      shadow.material.opacity = 0.35 / (1 + Math.max(0, fly.position.y - 1) * 0.6);

      // Wings bend a little at the tips as they beat (the tips lag)
      for (const W of wings) {
        const ang = W.pivot.rotation.z * W.side;
        const vel = (ang - W.prevAngle) / Math.max(dt, 1e-3);
        W.prevAngle = ang;
        const b = W.bend.update(clamp(-vel * 0.05, -0.35, 0.35), dt);
        const rest = W.geo.userData.rest, pos = W.geo.attributes.position, span = W.geo.userData.span;
        for (let i = 0; i < pos.count; i++) {
          const x = rest[i * 3], z = rest[i * 3 + 2];
          const t = x / span;
          pos.setY(i, rest[i * 3 + 1] + b * t * t * span * 0.6 + Math.sin(time * 3 + z * 4 + t * 2) * 0.012 * t);
        }
        pos.needsUpdate = true;
        W.geo.computeVertexNormals();
      }

      // Head and antennae: it looks about, antennae twitch; abdomen breathes
      if ((nextLook -= dt) < 0) { lookT = (rf() - 0.5) * 0.7; nextLook = 1.5 + rf() * 3; }
      look += (lookT * (1 - sleep) - look) * (1 - Math.exp(-dt * 3));
      head.rotation.set(S.head.update(-body.rotation.x * 0.8 - 0.1 + (a?.name === 'ko' && a.k < 0.5 ? -0.5 : 0) + sleep * 0.25, dt), look, 0);
      for (const A of antennae) {
        const tw = A.s.update(Math.sin(time * 2.3 + A.side) * 0.1 + (Math.sin(time * 7 + A.side * 2) > 0.95 ? 0.3 : 0), dt);
        A.j.rotation.set(-0.1 + tw + sleep * 0.9, 0, A.side * (0.1 + sleep * 0.5));
      }
      abdomenJ.rotation.x = Math.sin(time * 1.1) * 0.06 + (1 - sleep) * 0.05 - hum * 0.1;
      abdomen.scale.set(1 + Math.sin(time * 1.6) * 0.03, 1 + Math.sin(time * 1.6) * 0.03, 1);
      for (const L of legs) {
        const paddle = Math.sin(time * 2 + L.i * 1.3 + L.side) * 0.12 * (1 - sleep);
        L.hip.rotation.set(L.base.x + paddle + sleep * 0.6, L.base.y, L.base.z * (1 - sleep * 0.5));
        L.knee.rotation.x = (L.i === 0 ? 1.4 : 0.5) + paddle * 0.5 + sleep * 0.8;
      }
      for (const E of eyes) E.scale.y = lerp(1, 0.1, sleep);

      // The Dawnbell: hangs straight down in its silk and swings; hums and glows; or falls free and rings.
      if (relic.state === 'held') {
        root.getWorldQuaternion(q);
        bellHang.parent.getWorldQuaternion(q2);
        bellHang.quaternion.copy(q2.invert().multiply(q));
        bell.getWorldPosition(v);
        const vel = v.clone().sub(prevBell).divideScalar(Math.max(dt, 1e-3));
        prevBell.copy(v);
        const loose = 1 + (1 - relic.grip) * 2;
        bell.rotation.set(S.bellX.update(clamp(vel.z * 0.08, -0.5, 0.5) * loose + Math.sin(time * 1.3) * 0.04 * loose, dt), 0, S.bellZ.update(clamp(-vel.x * 0.08, -0.5, 0.5) * loose + Math.sin(time * 1.7) * 0.03 * loose, dt));
        clapper.rotation.x = -bell.rotation.x * 0.6 + Math.sin(time * 40) * 0.1 * hum;
        bell.position.set(Math.sin(time * 60) * 0.004 * hum, 0, 0);
      } else if (relic.state === 'falling' || relic.state === 'dropped') {
        const ground = 0.03;
        if (relic.state === 'falling') {
          relic.vy -= 9.8 * dt;
          bell.position.x += relic.vx * dt;
          bell.position.y += relic.vy * dt;
          bell.position.z += relic.vz * dt;
          bell.rotation.x += dt * 2;
          if (bell.position.y < ground + 0.12) {
            bell.position.y = ground + 0.12;
            relic.bounces++;
            groundRings.fire(v.set(bell.position.x, 0.02, bell.position.z), { from: 0.05, to: 0.9, life: 0.9, peak: 0.9 });
            for (let i = 0; i < 10; i++) sparks.spawn(bell.position.x, 0.1, bell.position.z, (Math.random() - 0.5) * 1, Math.random() * 1, (Math.random() - 0.5) * 1, 0.7);
            relic.ring = 1;
            if (relic.bounces > 2 || Math.abs(relic.vy) < 1) { relic.state = 'dropped'; relic.vy = 0; }
            else { relic.vy = -relic.vy * 0.35; relic.vx *= 0.6; relic.vz *= 0.6; }
          }
        } else {
          // lying on its side, rocking to a stop
          relic.lie = Math.min(1, relic.lie + dt * 2);
          bell.position.y = lerp(bell.position.y, ground + 0.11, relic.lie);
          bell.rotation.set(lerp(bell.rotation.x % TAU, Math.PI / 2 - 0.12, relic.lie) + Math.sin(time * 6) * 0.05 * Math.max(0, relic.ring), 0.4, 0);
        }
        relic.ring = Math.max(0, (relic.ring ?? 0) - dt * 0.6);
        bellShine = Math.max(bellShine, relic.ring * 0.8);
      }
      bellMat.emissiveIntensity = bellShine * 0.9;
      bellGlow.material.opacity = bellShine * 0.9 + Math.max(0, Math.sin(time * 1.3)) * 0.12;
      bellLight.intensity = bellShine * 3;

      // Silk (phase 2): threads spin out round its abdomen now and then, the moons on its wings brighten
      for (const m of wingMats) m.emissiveIntensity = 0.12 + (phaseN >= 2 ? 0.14 + Math.sin(time * 2) * 0.04 : 0) + hum * 0.15;
      silkWraps.forEach((w, i) => { const t = phaseN >= 2 ? 1 : 0; const s2 = lerp(w.scale.x, Math.max(0.001, t), 1 - Math.exp(-dt * (1.2 - i * 0.2))); w.scale.setScalar(s2); w.rotation.z += dt * 0.3 * (i % 2 ? 1 : -1); });
      if (phaseN >= 2 && (silkT -= dt) < 0) { silkT = 0.2; abdomen.getWorldPosition(v); root.worldToLocal(v); sparks.spawn(v.x + (Math.random() - 0.5) * 0.3, v.y, v.z, 0, 0.1, 0, 1.5, '#f6f3ff'); }

      // Dust: scales drift off its wings like snow
      if (dustRate > 0 && sleep < 0.5) {
        let n = dustRate * dt;
        while (n > 0) {
          if (Math.random() < n) {
            const W = wings[Math.floor(Math.random() * wings.length)];
            W.pivot.children[0].children[0].localToWorld(v.set(Math.random() * W.geo.userData.span * 0.9, 0, (Math.random() - 0.6) * 0.6));
            root.worldToLocal(v);
            const pour = dustRate > 10;
            dust.spawn(v.x, v.y, v.z, (Math.random() - 0.5) * 0.2, pour ? -0.3 : -0.12, pour ? 0.6 + Math.random() * 0.8 : 0.05, pour ? 2.4 : 3.2, Math.random() < 0.3 ? '#fff3c0' : null);
          }
          n -= 1;
        }
      }
      dust.update(dt, { drag: 0.4, wobble: 0.08, time, gravity: 0.05 });
      sparks.update(dt, { gravity: 1.5, drag: 1 });
      rings.update(dt);
      groundRings.update(dt);
      light.intensity = 1.2 + hum * 1.2 - sleep * 0.6;
      halo.material.opacity = Math.max(halo.material.opacity * 0.98, 0.14 - sleep * 0.06);

      // Hurt flash
      const hurtK = a && a.name === 'hurt' ? Math.sin(a.k * Math.PI) : 0;
      if (hurtK > 0 || flashOn) { flash(own, hurtK * 0.35, '#fff6e0'); flashOn = hurtK > 0; }
    },
  };
  setGrip(1);
  return api;
}

// ---------------------------------------------------------------- painted in code

// A wing, drawn in its own rectangle (u root→tip, v trailing→leading). Transparent outside the outline, which is
// inked like everything else.
function makeWingTexture(kind) {
  const W = 512, H = kind === 'fore' ? 328 : 568;
  return paint(W, H, (g) => {
    // canvas y runs down; v runs up, so y = (1 - v) * H
    const P = (u, v) => [u * W, (1 - v) * H];
    const path = new Path2D();
    if (kind === 'fore') {
      // root, along the leading edge out to a rounded, hooked apex, down the outer margin, back along the trailing edge
      path.moveTo(...P(0.0, 0.62));
      path.bezierCurveTo(...P(0.3, 0.82), ...P(0.72, 0.95), ...P(0.95, 0.9));
      path.bezierCurveTo(...P(1.02, 0.86), ...P(0.99, 0.72), ...P(0.94, 0.62));
      path.bezierCurveTo(...P(0.9, 0.4), ...P(0.86, 0.12), ...P(0.72, 0.05));
      path.bezierCurveTo(...P(0.5, 0.0), ...P(0.25, 0.12), ...P(0.02, 0.4));
      path.closePath();
    } else {
      // rounder, with a long trailing tail like a luna moth's
      path.moveTo(...P(0.0, 0.84));
      path.bezierCurveTo(...P(0.3, 0.98), ...P(0.72, 0.98), ...P(0.86, 0.8));
      path.bezierCurveTo(...P(0.97, 0.66), ...P(0.9, 0.5), ...P(0.8, 0.45));
      path.bezierCurveTo(...P(0.82, 0.3), ...P(0.9, 0.12), ...P(0.97, 0.03));
      path.bezierCurveTo(...P(0.99, 0.0), ...P(0.9, 0.0), ...P(0.86, 0.04));
      path.bezierCurveTo(...P(0.72, 0.2), ...P(0.6, 0.4), ...P(0.45, 0.48));
      path.bezierCurveTo(...P(0.3, 0.55), ...P(0.12, 0.62), ...P(0.02, 0.7));
      path.closePath();
    }
    g.save();
    g.clip(path);
    // ivory at the root, lilac toward the margin
    const grad = g.createRadialGradient(0, (1 - (kind === 'fore' ? 0.5 : 0.76)) * H, 10, 0, (1 - 0.5) * H, W * 1.05);
    grad.addColorStop(0, '#fbf5e8');
    grad.addColorStop(0.45, kind === 'fore' ? '#f1e6d6' : '#f3e2e6');
    grad.addColorStop(0.8, kind === 'fore' ? '#dccdea' : '#e0cde8');
    grad.addColorStop(1, '#c9b6e2');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // a soft rose-gold band
    g.strokeStyle = 'rgba(232,190,150,0.35)';
    g.lineWidth = 26;
    g.beginPath();
    if (kind === 'fore') { g.moveTo(...P(0.35, 0.95)); g.bezierCurveTo(...P(0.42, 0.6), ...P(0.4, 0.3), ...P(0.32, 0.0)); }
    else { g.moveTo(...P(0.3, 1)); g.bezierCurveTo(...P(0.4, 0.8), ...P(0.4, 0.62), ...P(0.3, 0.5)); }
    g.stroke();
    // veins from the root
    const r = rng(kind === 'fore' ? 41 : 43);
    g.strokeStyle = 'rgba(150,125,110,0.45)';
    g.lineWidth = 2;
    const vy = kind === 'fore' ? 0.5 : 0.76;
    for (let i = 0; i < 9; i++) {
      const tv = kind === 'fore' ? 0.08 + i * 0.105 : 0.02 + i * 0.12;
      const tu = kind === 'fore' ? 1 : i > 5 ? 0.96 : 0.85;
      g.beginPath();
      g.moveTo(...P(0.02, vy));
      g.quadraticCurveTo(...P(0.45, vy + (tv - vy) * 0.5 + 0.04), ...P(tu, tv));
      g.stroke();
    }
    // a wavy line and dots near the margin
    g.strokeStyle = 'rgba(120,95,150,0.5)';
    g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const [x, y] = kind === 'fore' ? P(0.8 + Math.sin(t * Math.PI) * 0.1, 0.1 + t * 0.78) : P(0.7 + Math.sin(t * Math.PI) * 0.1, 0.5 + t * 0.4);
      g.lineTo(x + Math.sin(t * 40) * 3, y);
    }
    g.stroke();
    // the moon on each wing: a gold ring, violet-blue within, a pale crescent
    const [ex, ey] = kind === 'fore' ? P(0.6, 0.55) : P(0.55, 0.72);
    const er = kind === 'fore' ? 46 : 34;
    g.fillStyle = '#e9c878';
    g.beginPath(); g.ellipse(ex, ey, er, er * 0.92, 0, 0, TAU); g.fill();
    g.fillStyle = '#4b3c7e';
    g.beginPath(); g.ellipse(ex, ey, er * 0.76, er * 0.7, 0, 0, TAU); g.fill();
    g.fillStyle = '#f4efff';
    g.beginPath(); g.arc(ex - er * 0.08, ey, er * 0.5, 0, TAU); g.fill();
    g.fillStyle = '#4b3c7e';
    g.beginPath(); g.arc(ex + er * 0.14, ey - er * 0.08, er * 0.44, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,40,70,0.7)';
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(ex, ey, er, er * 0.92, 0, 0, TAU); g.stroke();
    // dusting of scales
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(160,130,170,0.18)';
      g.fillRect(r() * W, r() * H, 2, 2);
    }
    // tail tip (hind wing): lavender
    if (kind === 'hind') {
      const tg = g.createLinearGradient(...P(0.8, 0.4), ...P(0.95, 0.0));
      tg.addColorStop(0, 'rgba(200,170,230,0)');
      tg.addColorStop(1, 'rgba(180,150,220,0.8)');
      g.fillStyle = tg;
      g.fillRect(...P(0.75, 0.45), W * 0.25, H * 0.45);
    }
    g.restore();
    // the ink line round it
    g.strokeStyle = '#1e1226';
    g.lineWidth = 7;
    g.stroke(path);
    // a scalloped, darker fringe just inside the margin
    g.save();
    g.clip(path);
    g.strokeStyle = 'rgba(150,120,180,0.55)';
    g.lineWidth = 12;
    g.stroke(path);
    g.restore();
  }, { wrap: false });
}

function makeAbdomenTexture() {
  // Soft fur in bands of ivory, pale gold and lilac (v runs along the abdomen).
  return paint(64, 256, (g, W, H) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#f3ecdf' : i % 4 === 0 ? C.band : C.lilac;
      g.fillRect(0, (i / 8) * H, W, H / 8);
    }
    const r = rng(5);
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(150,120,90,0.25)';
      g.lineWidth = 1;
      const x = r() * W, y = r() * H;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 5); g.stroke();
    }
  }, { wrap: true });
}

function makeAbdomenGlow() {
  // The light it's "fat with": the gold bands glow.
  return paint(64, 256, (g, W, H) => {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i += 4) {
      const grad = g.createLinearGradient(0, (i / 8) * H, 0, ((i + 1) / 8) * H);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#000000');
      g.fillStyle = grad;
      g.fillRect(0, (i / 8) * H, W, H / 8);
    }
  }, { wrap: true });
}

function makeBellTexture() {
  // Old gold, darker in the hollows, with a band of sun-rays (the dawn) round its waist.
  return paint(256, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f0cf7a');
    grad.addColorStop(0.5, C.bell);
    grad.addColorStop(1, '#b8893a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#8a6424';
    g.lineWidth = 3;
    for (const y of [H * 0.52, H * 0.72, H * 0.9]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#fff0b8';
    for (let x = 8; x < W; x += 32) {
      g.beginPath();
      g.arc(x + 8, H * 0.62, 6, Math.PI, 0);
      g.fill();
      for (let k = -2; k <= 2; k++) {
        g.save(); g.translate(x + 8, H * 0.62); g.rotate(k * 0.4); g.fillRect(-1, -14, 2, 6); g.restore();
      }
    }
    for (let x = 0; x < W; x += 6) { g.fillStyle = 'rgba(255,240,200,0.18)'; g.fillRect(x, 0, 2, H); }
  }, { wrap: true, flipY: true });
}
