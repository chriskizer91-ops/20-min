import * as THREE from 'three';
import { part, joint, sphere, taperedTube, glowSprite, blobShadow, onLayer, Spring } from './kit.js';
import { Hollow, hollowDressing, Actions, Motes, Tube, texture, canvasTexture, space, fxGroup, ss, bell, hold } from './foes-common.js';

// The Boglurcher (Aethermoor's boglurcher): "a heap of bog with eyes in it. It was lying in wait before you
// knew it was there." A lumpy mound of wet peat with moss, reeds and a lily pad on it, and five eyes of
// different sizes sunk into it, each blinking and glancing on its own. It breathes, bubbles and drips. Mud arms
// come out of it to grab. Intents: Mire Grab (Rooted), Drag Under (charging); its plain hit is a Slam.
// Beaten, its eyes close one by one: it's just bog now, with bogwick growing on it (docs/LORE.md §7-8).

const C = {
  mud: '#56462f', mudDark: '#33291c', mudLight: '#7a6746', moss: '#617036', mossLight: '#8a9a4a', reed: '#6b7a3a',
  eye: '#efe7bf', iris: '#d49a2c', pupil: '#1e140c', pad: '#4f7a3c', catkin: '#5a3a22', ember: '#ffae4a',
};
const R = 0.5, HGT = 0.72; // the heap at rest

function mudTexture() {
  return canvasTexture(256, 128, (g, W, H) => {
    g.fillStyle = C.mud;
    g.fillRect(0, 0, W, H);
    let seed = 17;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const blot = (x, y, r, col) => { for (const ox of [-W, 0, W]) { g.fillStyle = col; g.beginPath(); g.ellipse(x + ox, y, r * 1.6, r, 0, 0, Math.PI * 2); g.fill(); } };
    for (let i = 0; i < 90; i++) blot(rand() * W, rand() * H, 3 + rand() * 9, rand() < 0.5 ? 'rgba(40,30,18,0.45)' : 'rgba(120,100,66,0.35)');
    // Moss patches, mostly on top (the top of the texture is the top of the heap)
    for (let i = 0; i < 40; i++) blot(rand() * W, rand() * H * 0.55, 3 + rand() * 8, rand() < 0.5 ? 'rgba(98,112,52,0.7)' : 'rgba(130,150,70,0.5)');
    // Wet streaks running down
    for (let i = 0; i < 50; i++) {
      const x = rand() * W, y = rand() * H;
      g.strokeStyle = 'rgba(190,190,150,0.35)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 3, y + 4 + rand() * 8); g.stroke();
    }
    // Bits of twig and dead reed
    for (let i = 0; i < 26; i++) {
      const x = rand() * W, y = rand() * H, a = rand() * Math.PI;
      g.strokeStyle = rand() < 0.5 ? 'rgba(150,120,70,0.8)' : 'rgba(60,45,25,0.8)';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); g.stroke();
    }
  }, { repeat: [2, 1] });
}

// How lumpy the heap is in a direction (unit sphere point): low lumps, a second mound slumped on one side, a
// saggy lobe at the back, and drooping lobes round the bottom.
function lumpAt(x, y, z) {
  let l = 1 + 0.09 * Math.sin(x * 4.1 + 1.3) * Math.sin(z * 3.7 + 0.4) + 0.06 * Math.sin(y * 6 + x * 3) + 0.05 * Math.sin(z * 7 - y * 4);
  const bump = (bx, by, bz, w, amt) => { const d = (x - bx) ** 2 + (y - by) ** 2 + (z - bz) ** 2; return amt * Math.exp(-d / w); };
  l += bump(0.75, 0.45, -0.3, 0.12, 0.16) + bump(-0.55, 0.3, -0.6, 0.15, 0.12) + bump(-0.2, 0.9, 0.25, 0.1, 0.08);
  // drooping lobes round the bottom
  if (y < 0.35) l += (0.35 - y) * 0.25 * (0.5 + 0.5 * Math.sin(Math.atan2(x, z) * 7 + 1));
  return l;
}

// A lumpy heap: the top of a sphere, squashed, with a skirt of mud spreading at the bottom. Rest positions are
// kept so it can breathe, rise, slump, reach and sink every frame.
function heapPoint(x, y, z, out = [0, 0, 0]) {
  const lump = lumpAt(x, y, z);
  let px = x * R * lump, py = y * HGT * (0.94 + 0.1 * Math.sin(x * 5 + z * 3)), pz = z * R * lump;
  py *= 1 - 0.08 * z;
  // Below the waist it flattens out into a skirt of mud on the ground
  if (y < 0) {
    const spread = 1 + -y * 2.2;
    px *= spread; pz *= spread;
    py = 0.004;
  }
  out[0] = px; out[1] = py; out[2] = pz;
  return out;
}

function heapGeometry() {
  const g = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const pos = g.attributes.position;
  const rest = new Float32Array(pos.count * 3);
  const o = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    heapPoint(pos.getX(i), pos.getY(i), pos.getZ(i), o);
    rest.set(o, i * 3);
    pos.setXYZ(i, ...o);
  }
  g.computeVertexNormals();
  g.userData.rest = rest;
  return g;
}

// Where a point of the heap is now: height, width, a lean, and a bulge toward +z.
function deformPoint(p, s, out) {
  const h = Math.min(1, Math.max(0, p.y / HGT));
  const fwd = Math.max(0, p.z / R);
  const wob = s.wobble ? Math.sin(s.t * 18 + p.y * 12 + p.x * 6) * s.wobble * h : 0;
  const w = s.width * (1 + wob);
  out.set(
    p.x * w + s.leanX * h * h,
    p.y * s.height * (1 + s.breath * h) + s.reachUp * fwd * h,
    p.z * w + s.leanZ * h * h + s.reach * fwd * fwd * (0.3 + h * 0.7),
  );
  return out;
}

// Bogwick: a reed with a brown catkin whose tip smoulders (art/herbs/bogwick.webp)
function bogwick(parent, H, pos, height, lean) {
  const j = joint(parent, pos);
  j.rotation.set(lean[0], 0, lean[1]);
  part(j, taperedTube([[0, 0, 0], [0.005, height * 0.5, 0], [0, height, 0.005]], 0.008, 0.004, 6, 4), H.toon(C.reed), { ink: false });
  part(j, new THREE.CapsuleGeometry(0.016, 0.07, 3, 8), H.toon(C.catkin), { pos: [0, height + 0.02, 0.004] });
  const tip = part(j, sphere(0.012, 6, 5), H.basic(C.ember), { pos: [0, height + 0.07, 0.004], ink: false });
  const glow = glowSprite(C.ember, 0.18, 0.7);
  glow.position.set(0, height + 0.07, 0.004);
  j.add(glow);
  // Two blade leaves
  for (const s of [-1, 1]) part(j, taperedTube([[0, 0, 0], [s * 0.02, height * 0.3, 0.01], [s * 0.05, height * 0.55, 0.02]], 0.007, 0.001, 6, 3), H.toon('#56702f'), { ink: false });
  j.scale.setScalar(0.001);
  j.visible = false;
  return { j, glow, tip };
}

export function createBoglurcher({ hollowed = false } = {}) {
  const root = new THREE.Group();
  root.name = 'boglurcher';
  const H = new Hollow({ scale: 7 });
  const fx = fxGroup(root, 'boglurcher');
  const sp = space(root);

  const heapGeo = heapGeometry();
  const heap = part(root, heapGeo, H.toonMap(mudTexture(), { rim: 0.7 }));
  heap.frustumCulled = false;

  // ---------------------------------------------------------------- dressing that rides on the heap
  // Each item sits on a rest point of the surface and follows it as the heap deforms
  const riders = [];
  const ride = (obj, rest, lift = 0) => { riders.push({ obj, rest: new THREE.Vector3(...rest), lift }); root.add(obj); return obj; };
  const surface = (dirX, dirZ, up) => {
    // A rest point on the heap in a direction, `up` 0 (bottom) to 1 (crown)
    const theta = Math.acos(up) * 0.95;
    const a = Math.atan2(dirX, dirZ);
    return heapPoint(Math.sin(theta) * Math.sin(a), Math.cos(theta), Math.sin(theta) * Math.cos(a));
  };

  // Moss clumps and a lily pad on top, reeds poking out
  const mossMat = H.toon(C.moss), mossLight = H.toon(C.mossLight);
  for (const [dx, dz, up, r, m] of [[-0.3, 0.2, 0.92, 0.12, mossMat], [0.5, -0.4, 0.8, 0.1, mossLight], [-0.6, -0.5, 0.7, 0.11, mossMat], [0.1, -0.2, 0.97, 0.09, mossLight]]) {
    const g = new THREE.Group();
    part(g, sphere(r, 10, 6), m, { scale: [1.3, 0.3, 1.1] });
    ride(g, surface(dx, dz, up), -0.05);
  }
  const pad = new THREE.Group();
  const padGeo = new THREE.CircleGeometry(0.07, 14, 0.4, Math.PI * 2 - 0.4);
  padGeo.rotateX(-Math.PI / 2);
  part(pad, padGeo, H.toon(C.pad, { side: THREE.DoubleSide }), { ink: false });
  pad.rotation.set(0.25, 0.5, 0.1);
  ride(pad, surface(0.45, 0.35, 0.72), 0.004);
  const reeds = [];
  const reedMat = H.toon(C.reed), reedDry = H.toon('#9a8a52');
  for (const [dx, dz, up, len, lean] of [[-0.2, -0.3, 0.88, 0.34, [-0.25, 0.25]], [0.6, -0.1, 0.62, 0.26, [0.1, -0.5]], [-0.7, 0.1, 0.5, 0.24, [0.1, 0.6]]]) {
    const g = new THREE.Group();
    const j = joint(g, [0, 0, 0]);
    j.rotation.set(lean[0], 0, lean[1]);
    // A clump of three: two green blades and a broken dry one
    for (const [k, [ox, oz, f, m]] of [[0, 0, 1, reedMat], [0.025, 0.015, 0.8, reedMat], [-0.02, 0.02, 0.55, reedDry]].entries()) {
      const L = len * f;
      part(j, taperedTube([[ox, -0.02, oz], [ox + 0.01 * (k - 1), L * 0.5, oz], [ox + 0.035 * (k - 1), L, oz + 0.01]], 0.012, 0.002, 6, 4), m, { ink: k === 0 });
    }
    ride(g, surface(dx, dz, up));
    reeds.push({ j, lean, phase: Math.random() * 6 });
  }

  // ---------------------------------------------------------------- the eyes
  const eyeWhite = H.toon(C.eye, { rim: 0.6 }), irisMat = H.toon(C.iris, { rim: 0 }), pupilMat = H.basic(C.pupil), shineMat = H.basic('#ffffff');
  const lidMat = H.toon(C.mudLight);
  const eyes = [];
  const EYES = [
    // [dirX, dirZ, up, radius]
    [-0.28, 1, 0.55, 0.062], [0.35, 1, 0.62, 0.05], [0.05, 1, 0.3, 0.038], [-0.75, 0.7, 0.35, 0.034], [0.75, 0.55, 0.78, 0.03],
  ];
  for (const [dx, dz, up, r] of EYES) {
    const g = new THREE.Group();
    const ball = joint(g, [0, 0, 0]);
    part(ball, sphere(r, 14, 10), eyeWhite);
    part(ball, sphere(r * 0.6, 12, 8), irisMat, { pos: [0, 0, r * 0.78], scale: [1, 1, 0.35], ink: false });
    part(ball, sphere(r * 0.3, 10, 6), pupilMat, { pos: [0, 0, r * 0.92], scale: [0.75, 1.1, 0.3], ink: false });
    const shine = part(ball, sphere(r * 0.16, 6, 4), shineMat, { pos: [-r * 0.25, r * 0.3, r * 0.95], ink: false });
    // A mud lid: the top half of a shell; rolls forward to close
    const lid = joint(g, [0, 0, 0]);
    part(lid, new THREE.SphereGeometry(r * 1.12, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
    const rest = surface(dx, dz, up);
    ride(g, rest, -r * 0.35);
    eyes.push({ g, ball, lid, shine, r, rest: new THREE.Vector3(...rest), blink: 1 + Math.random() * 3, look: new THREE.Vector2(), lookT: new THREE.Vector2(), next: Math.random() * 2, shut: 0 });
  }

  // ---------------------------------------------------------------- mud arms (Mire Grab, Drag Under)
  const armMat = H.toonMap(mudTexture(), { rim: 1.2 });
  const arms = [-1, 1].map((side) => {
    const tube = new Tube(10, 8);
    const mesh = part(root, tube.geometry, armMat);
    mesh.frustumCulled = false;
    const hand = joint(root, [0, 0, 0]);
    part(hand, sphere(0.06, 10, 8), armMat, { scale: [1.1, 0.8, 1] });
    const fingers = [];
    for (const a of [-0.6, 0, 0.6]) {
      const f = joint(hand, [Math.sin(a) * 0.04, 0.02, Math.cos(a) * 0.035]);
      part(f, taperedTube([[0, 0, 0], [Math.sin(a) * 0.02, 0.04, Math.cos(a) * 0.02], [Math.sin(a) * 0.01, 0.07, Math.cos(a) * 0.01]], 0.02, 0.008, 5, 6), armMat);
      fingers.push({ f, a });
    }
    mesh.visible = hand.visible = false;
    return { side, tube, mesh, hand, fingers, pts: Array.from({ length: 10 }, () => new THREE.Vector3()) };
  });

  // Bubbles that rise through the surface and pop, and drips sliding down
  const bubbles = [];
  const bubbleMat = H.toon('#8a7d5c', { transparent: true, opacity: 0.9, rim: 1.5 });
  for (let i = 0; i < 3; i++) {
    const m = part(root, sphere(1, 10, 8), bubbleMat, { ink: false });
    m.visible = false;
    bubbles.push({ m, t: -Math.random() * 3, rest: new THREE.Vector3(), size: 0.03 });
  }
  const drips = [];
  for (let i = 0; i < 3; i++) {
    const m = part(root, sphere(0.02, 6, 5), H.toon('#9a8c68', { rim: 2 }), { ink: false, scale: [1, 1.5, 1] });
    drips.push({ m, t: Math.random(), a: Math.random() * Math.PI * 2 });
  }

  // Bogwick, for when it's just bog
  const wicks = [];
  for (const [dx, dz, up, h, lean] of [[0, 0.2, 0.97, 0.3, [0.05, 0.1]], [-0.3, 0.5, 0.8, 0.24, [0.2, 0.3]], [0.4, 0.3, 0.75, 0.26, [0.15, -0.35]], [-0.5, -0.4, 0.7, 0.22, [-0.3, 0.3]], [0.3, -0.6, 0.72, 0.27, [-0.25, -0.2]], [-0.05, -0.3, 0.9, 0.2, [-0.1, 0]]]) {
    const g = new THREE.Group();
    const w = bogwick(g, H, [0, 0, 0], h, lean);
    ride(g, surface(dx, dz, up), -0.01);
    wicks.push(w);
  }

  const shadow = blobShadow(0.62, 0.55);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- effects
  const splats = new Motes(fx, { count: 30, map: texture('puff'), blending: THREE.NormalBlending });
  const flecks = new Motes(fx, { count: 24, map: texture('flake'), blending: THREE.NormalBlending });
  const flies = new Motes(fx, { count: 8, map: texture('dot') });
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 36), new THREE.MeshBasicMaterial({ color: '#b8b0a0', transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.01;
    m.visible = false;
    root.add(m);
    ripples.push({ m, t: -1 });
  }
  let rippleNext = 0;
  const ripple = (z = 0, size = 1) => { const r = ripples[rippleNext++ % 4]; r.t = 0; r.size = size; r.m.position.z = z; r.m.visible = true; };
  const dressing = hollowDressing({ root, fx, sp, radius: 0.6, body: () => [(Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.35, (Math.random() - 0.5) * 0.5] });

  const act = new Actions({
    attack: [1.3, 0.55], // Slam: a wet mound of marsh falls on you
    cast: [2.0, 0.72], // Drag Under: it sinks low, charging, then drags you under
    'mire-grab': [1.6, 0.5], // Mire Grab: mud-hands grab your ankles (Rooted)
    hurt: [0.6, 0.2],
    ko: [3.0, 0.5], // its eyes close; now it's just bog, with bogwick growing on it
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { slam: 'attack', 'drag-under': 'cast', grab: 'mire-grab' });

  let t = Math.random() * 10;
  const S = { wobble: new Spring(40, 3), height: new Spring(30, 4), reach: new Spring(35, 5) };
  const st = { t: 0, width: 1, height: 1, breath: 0, leanX: 0, leanZ: 0, reach: 0, reachUp: 0, wobble: 0 };
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), n = new THREE.Vector3();
  const pos = heapGeo.attributes.position, rest = heapGeo.userData.rest, p = new THREE.Vector3();
  if (hollowed) H.set(true, { instant: true });

  const api = {
    root, fx, name: 'Boglurcher', height: 0.85, radius: 0.55, center: 0.38,
    moves: ['attack', 'cast', 'mire-grab', 'hurt', 'ko', 'hollowed', 'moonlit'],
    intents: { slam: 'attack', 'drag-under': 'cast', 'mire-grab': 'mire-grab' },
    get busy() { return act.busy; },
    get hollowed() { return H.on; },
    setHollowed(on, opts) { H.set(on, opts); },
    play(name, onHit, opts) {
      if (name === 'hollowed') H.set(true);
      if (name === 'moonlit') H.set(false);
      act.play(name, onHit, opts);
    },
    update(dt) {
      t += dt;
      fx.userData.adopt();
      const hs = H.update(dt);
      dressing.update(dt, hs);

      // ---- idle: slow breathing heave, a lazy slump from side to side; the eyes do the watching
      let height = 1, width = 1, leanX = Math.sin(t * 0.6) * 0.025, leanZ = 0, reach = 0, reachUp = 0, jiggle = 0;
      let breath = Math.sin(t * 1.4) * 0.035;
      let eyesShut = 0, arm = 0, armGrip = 0;
      let armTarget = 0.9, armLift = 0, wick = 0;
      const a = act.step(dt);
      if (a) {
        const k = a.k;
        switch (a.name) {
          case 'attack': {
            // Rise up tall, lean over, and fall on you in a wet heap; splat
            const rise = hold(k, 0, 0.35, 0.45, 0.55);
            const fall = hold(k, 0.45, 0.55, 0.7, 1);
            height = 1 + rise * 0.35 - fall * 0.3;
            width = 1 - rise * 0.12 + fall * 0.12;
            leanZ = -rise * 0.1 + fall * 0.25;
            reach = fall * (a.opts.reach ?? 0.55);
            reachUp = -fall * 0.1;
            if (a.hit && !a.burst) {
              a.burst = true;
              jiggle = 1;
              ripple(0.7, 0.8);
              for (let i = 0; i < 14; i++) {
                const ang = Math.random() * Math.PI - Math.PI / 2;
                splats.emit({ pos: sp.at(Math.sin(ang) * 0.3, 0.1, 0.75, v), vel: sp.dir(Math.sin(ang) * 1.2, 0.8 + Math.random() * 0.8, Math.cos(ang) * 0.6), life: 0.7, size: (0.06 + Math.random() * 0.06) * sp.scale, grow: 1.4, color: Math.random() < 0.5 ? C.mud : C.mudLight, opacity: 0.9, gravity: 4 * sp.scale, drag: 0.5 });
              }
            }
            break;
          }
          case 'cast': {
            // Sink into a puddle with just its eyes up (charging), ripples; then surge forward as a wave, grab, drag
            const sink = hold(k, 0, 0.3, 0.6, 0.68);
            const surge = hold(k, 0.62, 0.72, 0.82, 1);
            height = 1 - sink * 0.62 + surge * 0.15;
            width = 1 + sink * 0.28;
            reach = surge * (a.opts.reach ?? 0.7);
            reachUp = surge * 0.12;
            breath = Math.sin(t * 6) * 0.04 * sink;
            if (sink > 0.5 && (a.rt = (a.rt ?? 0) - dt) < 0) { a.rt = 0.35; ripple(0, 0.7); }
            arm = surge;
            armTarget = 0.6 + surge * 0.4;
            armGrip = ss(k, 0.72, 0.78);
            if (a.hit && !a.burst) {
              a.burst = true;
              jiggle = 0.8;
              for (let i = 0; i < 10; i++) splats.emit({ pos: sp.at((Math.random() - 0.5) * 0.6, 0.05, 0.8, v), vel: sp.dir((Math.random() - 0.5) * 1, 0.9 + Math.random() * 0.5, 0.2), life: 0.7, size: 0.08 * sp.scale, grow: 1.3, color: C.mud, gravity: 4 * sp.scale });
            }
            break;
          }
          case 'mire-grab': {
            // Mud arms slither out along the ground, rise at your ankles and clench; hold; slide back
            arm = hold(k, 0.05, 0.4, 0.75, 0.95);
            armTarget = a.opts.reach ?? 1;
            armLift = hold(k, 0.3, 0.42, 0.7, 0.85);
            armGrip = hold(k, 0.42, 0.5, 0.7, 0.8);
            leanZ = arm * 0.08;
            height = 1 - arm * 0.08;
            if (a.hit && !a.burst) { a.burst = true; ripple(armTarget, 0.5); }
            break;
          }
          case 'hurt': {
            if (k < 0.1 && !a.burst) {
              a.burst = true;
              jiggle = 1.2;
              for (let i = 0; i < 8; i++) splats.emit({ pos: sp.at((Math.random() - 0.5) * 0.4, 0.5, -0.1, v), vel: sp.dir((Math.random() - 0.5) * 1.2, 0.8, -0.6), life: 0.6, size: 0.06 * sp.scale, color: C.mud, gravity: 4 * sp.scale });
            }
            height = 1 - bell(k) * 0.12;
            leanZ = -bell(k) * 0.12;
            eyesShut = bell(k) * 0.8;
            break;
          }
          case 'ko': eyesShut = k; wick = ss(k, 0.4, 1); height = 1 - ss(k, 0.1, 0.6) * 0.25; width = 1 + ss(k, 0.1, 0.6) * 0.08; break;
          case 'hollowed': height = 1 - bell(k) * 0.06; break;
          case 'moonlit': height = 1 + bell(k) * 0.05; break;
        }
        act.done();
      }
      if (act.beaten) { eyesShut = 1; wick = 1; height = 0.75; width = 1.08; breath = 0; leanX = 0; }
      if (jiggle) S.wobble.v += jiggle * 1.5;

      st.t = t;
      st.height = S.height.update(height, dt);
      st.width = width;
      st.breath = breath;
      st.leanX = leanX;
      st.leanZ = leanZ;
      st.reach = S.reach.update(reach, dt);
      st.reachUp = reachUp;
      st.wobble = S.wobble.update(0, dt) * 0.12;

      // Deform the heap
      for (let i = 0; i < pos.count; i++) {
        p.set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
        deformPoint(p, st, v);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      pos.needsUpdate = true;
      heapGeo.computeVertexNormals();

      // Everything riding on it follows its surface
      for (const r of riders) {
        deformPoint(r.rest, st, r.obj.position);
        n.copy(r.rest).setY(r.rest.y * 0.6 + 0.15).normalize();
        r.obj.position.addScaledVector(n, r.lift);
      }
      // Eyes: face out of the heap, glance about on their own, blink on their own
      for (const e of eyes) {
        n.set(e.rest.x, e.rest.y * 0.7 + 0.05, e.rest.z).normalize();
        e.g.quaternion.setFromUnitVectors(v.set(0, 0, 1), n);
        if ((e.next -= dt) < 0) { e.lookT.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.4) * 0.5); e.next = 0.8 + Math.random() * 2.5; }
        e.look.lerp(e.lookT, 1 - Math.exp(-dt * 8));
        e.ball.rotation.set(-e.look.y, e.look.x, 0);
        if ((e.blink -= dt) < 0) e.blink = 1.5 + Math.random() * 4;
        const blink = e.blink < 0.14 ? 1 : 0;
        // Beaten, they close one after another
        const order = eyes.indexOf(e) / eyes.length;
        const shut = Math.max(blink, ss(eyesShut, order * 0.6, order * 0.6 + 0.4), hs.k > 0.5 ? 0.35 : 0);
        e.shut += (shut - e.shut) * (1 - Math.exp(-dt * 20));
        e.lid.rotation.x = -0.75 + e.shut * 2.3;
        e.shine.visible = e.shut < 0.5;
        // Hollow-eyed: the whites go grey and dull
      }
      eyeWhite.color.set(C.eye).lerp(DULL, hs.k * 0.8);

      // Mud arms: out of the front of the heap, along the ground, up at the end into a grabbing hand
      for (const A of arms) {
        const on = arm > 0.02;
        A.mesh.visible = A.hand.visible = on;
        if (!on) continue;
        const reachZ = 0.35 + (armTarget - 0.35) * arm;
        for (let i = 0; i < 10; i++) {
          const tt = i / 9;
          const z = 0.3 + (reachZ - 0.3) * tt;
          const y = 0.12 * (1 - tt) + Math.sin(tt * Math.PI) * 0.05 + ss(tt, 0.75, 1) * armLift * 0.12 + 0.02;
          A.pts[i].set(A.side * (0.18 - 0.08 * tt) + Math.sin(t * 5 + tt * 6 + A.side) * 0.02 * arm, y, z);
        }
        A.tube.update(A.pts, (tt) => (0.075 - tt * 0.035) * Math.min(1, arm * 3));
        A.hand.position.copy(A.pts[9]);
        A.hand.rotation.set(-0.3 - armLift * 0.4, 0, 0);
        A.hand.scale.setScalar(Math.max(0.001, Math.min(1, arm * 2)));
        for (const F of A.fingers) F.f.rotation.set(0.2 + armGrip * 1.4, 0, -Math.sin(F.a) * (0.5 - armGrip * 0.4));
      }

      // Reeds sway; bubbles rise and pop; drips slide
      for (const r of reeds) r.j.rotation.set(r.lean[0] + Math.sin(t * 1.2 + r.phase) * 0.06, 0, r.lean[1] + Math.sin(t * 0.9 + r.phase) * 0.05);
      const alive = !act.beaten && hs.k < 0.5;
      for (const b of bubbles) {
        b.t += dt;
        if (b.t < 0 || !alive) { b.m.visible = false; continue; }
        if (b.t === dt || !b.placed) {
          b.placed = true;
          const r = surface(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.35 + Math.random() * 0.55);
          b.rest.set(...r);
          b.size = 0.02 + Math.random() * 0.025;
        }
        const k = b.t / 1.4;
        deformPoint(b.rest, st, b.m.position);
        b.m.visible = true;
        b.m.scale.setScalar(Math.max(0.001, b.size * ss(k, 0, 0.9)));
        if (k >= 1) {
          flecks.emit({ pos: sp.of(b.m, v), vel: sp.dir(0, 0.4, 0), life: 0.4, size: 0.03 * sp.scale, color: C.mudLight, gravity: 1.5, spin: 5 });
          b.t = -Math.random() * 2.5;
          b.placed = false;
        }
      }
      for (const d of drips) {
        d.t += dt * 0.35;
        if (d.t > 1) { d.t = 0; d.a = Math.random() * Math.PI * 2; }
        const up = 0.75 - d.t * 0.7;
        deformPoint(v2.set(...surface(Math.sin(d.a), Math.cos(d.a), Math.max(0.05, up))), st, d.m.position);
        d.m.visible = alive && up > 0.08;
      }

      // Bogwick grows when it's just bog; the tips smoulder; a firefly or two comes to see
      for (const [i, w] of wicks.entries()) {
        const g = ss(wick, i * 0.1, i * 0.1 + 0.45);
        w.j.visible = g > 0.01;
        w.j.scale.setScalar(Math.max(0.001, g));
        w.glow.material.opacity = 0.7 * g * (0.8 + Math.sin(t * 3 + i) * 0.2);
      }
      if (wick > 0.8 && Math.random() < dt * 0.8) flies.emit({ pos: sp.at((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6, v), vel: sp.dir((Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2), life: 3, size: 0.06 * sp.scale, color: '#d8ff7a', wobble: 0.06 * sp.scale });

      for (const r of ripples) {
        if (r.t < 0) continue;
        r.t += dt;
        const k = r.t / 1.1;
        if (k >= 1) { r.t = -1; r.m.visible = false; continue; }
        r.m.scale.setScalar(0.3 + k * r.size);
        r.m.material.opacity = (1 - k) * 0.5;
      }
      shadow.scale.setScalar(st.width * (1 + st.reach * 0.3));
      shadow.position.z = st.reach * 0.3;
      splats.update(dt);
      flecks.update(dt);
      flies.update(dt);
    },
  };
  return api;
}
const DULL = new THREE.Color('#77737e');
