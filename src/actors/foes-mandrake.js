import * as THREE from 'three';
import { part, joint, sphere, taperedTube, blobShadow, onLayer, Spring } from './kit.js';
import { Hollow, hollowDressing, Actions, Motes, paintedFace, paint, texture, canvasTexture, space, fxGroup, ss, bell, hold } from './foes-common.js';

// The Hollowed Mandrake: Witch Way's mandrake (herbs/mandrake_128.png: a pale root with a face, root legs and a
// crown of big crinkled leaves) with Aethermoor's briarling stats. "Grey leaves, with the face of a cross turnip"
// (docs/LORE.md §7). A plump turnip body blushing purple at the shoulders, root arms and legs, hairy rootlets.
// Intents: Scream (all Staggered; the witch's hat flies off), Tangle (Rooted); its plain hit is a whip of its
// root arm. Beaten, it sulks: sits with its back half turned, arms folded, leaves drooping, huffing.
// When moonlight breaks its Hollowed omen, its leaves flush green again.

const C = {
  skin: '#ecd6b0', skinDark: '#b99870', blush: '#a2609e', root: '#b08c64', rootDark: '#7e5f40',
  leaf: '#8c9888', leafVein: '#5d6a5e', leafRib: '#c6ccc0', green: '#6f9d58', ink: '#2a1a18',
};

function bulbTexture() {
  // Lathe v runs bottom (canvas bottom) to top (canvas top); u starts at the back
  return canvasTexture(128, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, C.skinDark);
    grad.addColorStop(0.18, C.skin);
    grad.addColorStop(0.55, C.skin);
    grad.addColorStop(0.75, '#c595b0');
    grad.addColorStop(0.9, C.blush);
    grad.addColorStop(1, '#7d4d86');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    let seed = 13;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Wrinkle rings round the root, and a few pits
    for (let i = 0; i < 26; i++) {
      const y = H * (0.2 + rand() * 0.75), x = rand() * W, w = 10 + rand() * 30;
      g.strokeStyle = 'rgba(120,85,50,0.35)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y + 2 + rand() * 2, x + w, y); g.stroke();
    }
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(110,75,45,0.4)'; g.fillRect(rand() * W, H * (0.1 + rand() * 0.8), 1.5, 1.5); }
  });
}

// A leaf: veins painted for the front face (u 0-0.5) and mirrored for the back (u 0.5-1). The leaf is an
// ellipsoid stretched along its length, so u runs round its edge and v from stalk (bottom) to tip (top).
function leafTexture() {
  return canvasTexture(128, 128, (g, W, H) => {
    g.fillStyle = C.leaf;
    g.fillRect(0, 0, W, H);
    for (const cx of [W * 0.25, W * 0.75]) {
      // lighter toward the middle, darker at the edges
      const grad = g.createLinearGradient(cx - W / 4, 0, cx + W / 4, 0);
      grad.addColorStop(0, 'rgba(60,70,62,0.5)');
      grad.addColorStop(0.5, 'rgba(210,220,205,0.25)');
      grad.addColorStop(1, 'rgba(60,70,62,0.5)');
      g.fillStyle = grad;
      g.fillRect(cx - W / 4, 0, W / 2, H);
      // side veins, sweeping toward the tip
      g.strokeStyle = C.leafVein;
      g.lineWidth = 2;
      for (let y = H * 0.95; y > H * 0.1; y -= 11) {
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s * 12, y - 6, cx + s * 30, y - 16); g.stroke(); }
      }
      // midrib
      g.strokeStyle = C.leafRib;
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx, H); g.lineTo(cx, 4); g.stroke();
    }
  });
}

// An ellipsoid leaf with a crinkled edge, cupped and drooping; base at the origin, tip along +y.
function leafGeometry(len, width, droop, seed) {
  const g = new THREE.SphereGeometry(1, 12, 14);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
    // around the leaf is the sphere's x-z; along it is y. Make x the width and z the thickness.
    const t = (y0 + 1) / 2; // 0 at the stalk, 1 at the tip
    const taper = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) * (1 - 0.35 * t);
    let x = x0 * width * taper;
    let z = z0 * 0.006;
    const edge = Math.abs(x0);
    x += Math.sign(x0) * Math.sin(t * 28 + seed) * 0.008 * edge * taper;
    z += Math.sin(t * 22 + seed * 2) * 0.01 * edge; // crinkles
    // The leaf leans out with its local -z facing the sky: edges curl up (-z), the tip droops out and down (+z)
    z -= edge * edge * width * 0.25; // cupped
    const y = t * len;
    z += droop * t * t * len;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function drawFace(g, W, H, mood) {
  g.translate(W / 2, H / 2);
  g.scale(1.3, 1.3);
  g.translate(-W / 2, -H / 2 - 4);
  const ink = C.ink, cx = W / 2, ey = 84, dx = 36;
  const brows = (angle, lift = 0) => { for (const s of [-1, 1]) paint.line(g, [[cx + s * (dx + 18), ey - 20 - lift - angle * 6], [cx + s * (dx - 14), ey - 20 - lift + angle * 8]], 6, ink); };
  const lumps = () => { paint.blush(g, cx - 62, ey + 30, 20, 'rgba(170,90,110,0.35)'); paint.blush(g, cx + 62, ey + 30, 20, 'rgba(170,90,110,0.35)'); };
  if (mood === 'hollow') {
    for (const s of [-1, 1]) {
      const grad = g.createRadialGradient(cx + s * dx, ey, 2, cx + s * dx, ey, 20);
      grad.addColorStop(0, 'rgba(12,10,16,1)'); grad.addColorStop(0.75, 'rgba(24,20,28,0.9)'); grad.addColorStop(1, 'rgba(24,20,28,0)');
      g.fillStyle = grad; g.beginPath(); g.ellipse(cx + s * dx, ey, 17, 20, 0, 0, Math.PI * 2); g.fill();
    }
    paint.curve(g, [cx - 20, ey + 52], [cx, ey + 44], [cx + 20, ey + 52], 4, 'rgba(24,20,28,0.85)');
    return;
  }
  const squint = (open = 1) => {
    for (const s of [-1, 1]) {
      const x = cx + s * dx;
      paint.ellipse(g, x, ey + 2, 11, 9 * open, ink);
      paint.ellipse(g, x - 3, ey - 1, 3, 3 * open, '#fff');
    }
  };
  if (mood === 'cross' || mood === 'blink' || mood === 'whip') {
    // The cross turnip: heavy brows down to the middle, little squinting eyes, a big frown
    lumps();
    if (mood === 'blink') for (const s of [-1, 1]) paint.line(g, [[cx + s * dx - 11, ey + 2], [cx + s * dx + 11, ey + 2]], 4, ink);
    else squint(mood === 'whip' ? 0.6 : 1);
    brows(1);
    if (mood === 'whip') {
      // gritted teeth
      paint.ellipse(g, cx, ey + 44, 22, 10, ink);
      g.fillStyle = '#efe6d2'; g.fillRect(cx - 18, ey + 38, 36, 10);
      paint.line(g, [[cx - 6, ey + 38], [cx - 6, ey + 48]], 1.5, ink); paint.line(g, [[cx + 6, ey + 38], [cx + 6, ey + 48]], 1.5, ink);
    } else {
      paint.curve(g, [cx - 24, ey + 52], [cx, ey + 34], [cx + 24, ey + 52], 5, ink);
      paint.curve(g, [cx - 14, ey + 56], [cx, ey + 50], [cx + 14, ey + 56], 3, 'rgba(120,70,70,0.6)');
    }
    // a furrow between the brows
    paint.line(g, [[cx - 3, ey - 30], [cx - 1, ey - 22]], 2, 'rgba(90,60,40,0.7)');
    paint.line(g, [[cx + 3, ey - 30], [cx + 1, ey - 22]], 2, 'rgba(90,60,40,0.7)');
  }
  if (mood === 'scream') {
    // Eyes screwed shut, brows up, a mouth like a cellar door
    for (const s of [-1, 1]) paint.line(g, [[cx + s * dx - 13 * s, ey - 8], [cx + s * dx + 10 * s, ey], [cx + s * dx - 13 * s, ey + 8]], 5, ink);
    brows(-1, 10);
    paint.ellipse(g, cx, ey + 46, 26, 32, ink);
    paint.ellipse(g, cx, ey + 62, 15, 10, '#a0404a');
    lumps();
  }
  if (mood === 'sulk') {
    // Eyes shut, cheeks puffed, lower lip out
    for (const s of [-1, 1]) paint.curve(g, [cx + s * dx - 12, ey], [cx + s * dx, ey + 6], [cx + s * dx + 12, ey], 4, ink);
    brows(0.6);
    paint.ellipse(g, cx - 58, ey + 30, 18, 14, 'rgba(200,120,130,0.4)');
    paint.ellipse(g, cx + 58, ey + 30, 18, 14, 'rgba(200,120,130,0.4)');
    paint.curve(g, [cx - 14, ey + 46], [cx, ey + 40], [cx + 14, ey + 46], 4, ink);
    paint.ellipse(g, cx, ey + 49, 10, 5, 'rgba(170,90,100,0.9)');
  }
  if (mood === 'ouch') {
    for (const s of [-1, 1]) paint.line(g, [[cx + s * dx - 12 * s, ey - 9], [cx + s * dx + 10 * s, ey], [cx + s * dx - 12 * s, ey + 9]], 5, ink);
    brows(-0.5, 4);
    paint.line(g, [[cx - 16, ey + 46], [cx - 8, ey + 40], [cx, ey + 46], [cx + 8, ey + 40], [cx + 16, ey + 46]], 4, ink);
  }
}

export function createMandrake({ hollowed = false } = {}) {
  const root = new THREE.Group();
  root.name = 'mandrake';
  const H = new Hollow({ scale: 10 });
  const fx = fxGroup(root, 'mandrake');
  const sp = space(root);

  const body = joint(root, [0, 0, 0], 'body');
  const hips = joint(body, [0, 0.11, 0], 'hips');

  // ---------------------------------------------------------------- root legs
  const rootMat = H.toon(C.root), rootDark = H.toon(C.rootDark);
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.05, 0.03, 0]);
    part(hip, taperedTube([[0, 0, 0], [side * 0.02, -0.06, 0.01], [side * 0.025, -0.12, 0.02]], 0.046, 0.022, 8, 7), rootMat);
    const foot = joint(hip, [side * 0.025, -0.125, 0.02]);
    for (const a of [-0.7, 0, 0.7]) part(foot, taperedTube([[0, 0, 0], [Math.sin(a) * 0.03, -0.008, Math.cos(a) * 0.03], [Math.sin(a) * 0.055, -0.012, Math.cos(a) * 0.05]], 0.012, 0.003, 5, 5), rootDark, { ink: false });
    return { hip, foot, side };
  });

  // ---------------------------------------------------------------- the turnip
  const torso = joint(hips, [0, 0, 0], 'turnip');
  const bulbProfile = [[0.001, -0.03], [0.05, -0.01], [0.1, 0.03], [0.132, 0.09], [0.136, 0.14], [0.12, 0.2], [0.09, 0.245], [0.055, 0.272], [0.025, 0.285], [0.001, 0.29]];
  const bulbGeo = new THREE.LatheGeometry(bulbProfile.map(([x, y]) => new THREE.Vector2(x, y)), 22, Math.PI, Math.PI * 2);
  part(torso, bulbGeo, H.toonMap(bulbTexture(), { rim: 1.1 }));
  // A little root tail under it
  part(torso, taperedTube([[0, -0.02, 0], [0.01, -0.06, -0.02], [-0.01, -0.09, -0.03]], 0.02, 0.003, 6, 5), rootDark, { ink: false });
  // Hairy rootlets on its flanks
  const hairs = [];
  for (const [x, y, z, s] of [[0.12, 0.06, 0.05, 1], [-0.125, 0.08, -0.02, -1], [0.1, 0.03, -0.07, 1], [-0.09, 0.02, 0.07, -1], [0.02, 0.0, -0.1, 1]]) {
    const j = joint(torso, [x, y, z]);
    part(j, taperedTube([[0, 0, 0], [s * 0.018, -0.006, 0], [s * 0.03, -0.004, 0.008]], 0.005, 0.0015, 5, 4), rootDark, { ink: false });
    hairs.push(j);
  }

  const face = paintedFace(H, {
    radius: 0.139, width: 1.45, height: 1.15, size: [256, 192], draw: drawFace, rim: 0.3,
    moods: ['cross', 'blink', 'whip', 'scream', 'sulk', 'ouch', 'hollow'],
  });
  const faceJ = joint(torso, [0, 0.12, 0], 'face');
  faceJ.add(face.mesh);

  // ---------------------------------------------------------------- root arms
  const arms = [-1, 1].map((side) => {
    const sh = joint(torso, [side * 0.125, 0.15, 0.01]);
    part(sh, taperedTube([[0, 0, 0], [side * 0.035, -0.025, 0.005], [side * 0.06, -0.055, 0.01]], 0.024, 0.016, 7, 6), rootMat);
    const el = joint(sh, [side * 0.06, -0.055, 0.01]);
    part(el, taperedTube([[0, 0, 0], [side * 0.012, -0.03, 0.01], [side * 0.016, -0.055, 0.015]], 0.016, 0.01, 6, 6), rootMat);
    const hand = joint(el, [side * 0.016, -0.055, 0.015]);
    for (const a of [-0.5, 0, 0.5]) part(hand, taperedTube([[0, 0, 0], [side * Math.sin(a) * 0.02, -0.02, Math.cos(a) * 0.01], [side * Math.sin(a) * 0.03, -0.035, Math.cos(a) * 0.015]], 0.006, 0.002, 4, 4), rootDark, { ink: false });
    return { sh, el, hand, side };
  });

  // ---------------------------------------------------------------- the crown of leaves
  const crown = joint(torso, [0, 0.28, 0], 'leaves');
  const leafTex = leafTexture();
  const leafMat = H.toonMap(leafTex, { rim: 0.8 });
  const leaves = [];
  const LEAVES = [
    // [angle round from the front, lean out, length, width, droop]
    [0.15, 0.55, 0.3, 0.085, 0.35], [1.2, 0.75, 0.28, 0.08, 0.4], [2.3, 0.65, 0.31, 0.085, 0.35], [3.3, 0.5, 0.33, 0.09, 0.3],
    [4.3, 0.7, 0.29, 0.08, 0.4], [5.3, 0.6, 0.28, 0.08, 0.35], [0.75, 0.2, 0.24, 0.07, 0.2],
  ];
  for (const [i, [a, lean, len, w, droop]] of LEAVES.entries()) {
    const yaw = joint(crown, [Math.sin(a) * 0.015, 0, Math.cos(a) * 0.015]);
    yaw.rotation.y = a;
    const j = joint(yaw, [0, 0, 0]);
    // Lean out toward +z of the yawed joint (the leaf's back faces out, so it cups up)
    j.rotation.x = lean;
    part(j, leafGeometry(len, w, droop, i * 1.7), leafMat);
    leaves.push({ j, lean, s: new Spring(35 + i * 3, 3.5), sz: new Spring(35, 3.5), phase: i * 0.9 });
  }
  // A short grey stalk cluster where they join
  part(crown, sphere(0.035, 8, 6), H.toon('#7b8676'), { pos: [0, 0.005, 0], scale: [1, 0.6, 1] });

  const shadow = blobShadow(0.2, 0.45);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- effects
  // Scream: rings of sound rolling out ahead of it
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 32), new THREE.MeshBasicMaterial({ color: '#e8dcff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }));
    m.visible = false;
    fx.add(m);
    rings.push({ m, t: -1 });
  }
  let ringNext = 0;
  const dirt = new Motes(fx, { count: 20, map: texture('puff'), blending: THREE.NormalBlending });
  const bits = new Motes(fx, { count: 16, map: texture('flake'), blending: THREE.NormalBlending });
  // Tangle: roots that burst out of the ground in front of it, curl, and sink again
  const snare = joint(root, [0, 0, 1], 'tangle');
  const snares = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pts = [[Math.cos(a) * 0.14, -0.02, Math.sin(a) * 0.14], [Math.cos(a) * 0.12, 0.12, Math.sin(a) * 0.12], [Math.cos(a + 0.8) * 0.06, 0.22, Math.sin(a + 0.8) * 0.06], [Math.cos(a + 1.8) * 0.03, 0.26, Math.sin(a + 1.8) * 0.03]];
    const j = joint(snare, [0, 0, 0]);
    part(j, taperedTube(pts, 0.028, 0.005, 10, 6), rootMat);
    j.scale.setScalar(0.001);
    snares.push(j);
  }
  snare.visible = false;
  const dressing = hollowDressing({ root, fx, sp, radius: 0.3, body: () => [(Math.random() - 0.5) * 0.25, 0.2 + Math.random() * 0.25, (Math.random() - 0.5) * 0.2] });

  const act = new Actions({
    attack: [1.0, 0.5], // a whip of its root arm (the briarling's Thorn Jab)
    cast: [1.6, 0.45], // Scream: everyone Staggered, and the witch's hat flies off
    tangle: [1.6, 0.55], // Tangle: roots out of the ground round your ankles (Rooted)
    hurt: [0.55, 0.2],
    ko: [1.6, 0.6], // sulks
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { scream: 'cast', 'thorn-jab': 'attack', whip: 'attack' });

  let t = Math.random() * 10, blinkT = 2, grumble = 0, nextGrumble = 4, huffT = 3;
  let cured = 0; // leaves greening after moonlight breaks the omen
  const S = { lean: new Spring(30, 5), squash: new Spring(80, 7) };
  const v = new THREE.Vector3();
  const leafGrey = new THREE.Color(C.leaf), leafGreen = new THREE.Color('#9fd07e');
  if (hollowed) H.set(true, { instant: true });

  const emitRing = (at, dir, big) => {
    const r = rings[ringNext++ % rings.length];
    r.t = 0;
    r.m.position.copy(at);
    r.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    r.big = big;
    r.m.visible = true;
  };

  const api = {
    root, fx, name: 'Hollowed Mandrake', height: 0.65, radius: 0.22, center: 0.3,
    moves: ['attack', 'cast', 'tangle', 'hurt', 'ko', 'hollowed', 'moonlit'],
    intents: { scream: 'cast', tangle: 'tangle', 'thorn-jab': 'attack' },
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
      if (hs.breaking) cured = Math.min(1, cured + dt * 0.8);
      else if (H.on) cured = Math.max(0, cured - dt);

      // ---- idle: a cross little bounce from root to root, arms folded-ish, leaves bobbing; now and then a grumble
      let bob = Math.abs(Math.sin(t * 2.6)) * 0.012, tilt = Math.sin(t * 2.6) * 0.06, lean = 0, turn = Math.sin(t * 0.5) * 0.2;
      let z = 0, squash = 0, sit = 0, blow = 0, shake = 0;
      let mood = hs.k > 0.5 ? 'hollow' : 'cross';
      // Arms: x swings forward (-) and back (+), z raises out to the side, el bends the forearm in. Idle: hands on hips.
      let armR = { x: 0.1, z: 0.3, el: 1.5 }, armL = { x: 0.1, z: 0.3, el: 1.5 };
      if (!act.busy && !act.beaten && (nextGrumble -= dt) < 0) { grumble = 0.8; nextGrumble = 4 + Math.random() * 4; }
      if (grumble > 0) {
        grumble -= dt;
        const g = bell(1 - grumble / 0.8);
        shake = Math.sin(t * 50) * 0.04 * g;
        squash = g * 0.06;
        if (grumble < 0.4 && grumble + dt >= 0.4) for (let i = 0; i < 2; i++) dirt.emit({ pos: sp.at(0, 0.3, 0.1, v), vel: sp.dir((i - 0.5) * 0.3, 0.3, 0.1), life: 0.7, size: 0.06 * sp.scale, grow: 2, color: '#b8b0a8', opacity: 0.5 });
      }
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3;
      if (blinkT < 0.12 && mood === 'cross') mood = 'blink';

      const a = act.step(dt);
      if (a) {
        const k = a.k;
        switch (a.name) {
          case 'attack': {
            // Hop in, wind the right root arm back, whip it round, hop back
            const out = hold(k, 0, 0.25, 0.75, 1);
            z += out * (a.opts.reach ?? 0.5);
            bob += Math.abs(Math.sin(k * Math.PI * 4)) * 0.05 * (k < 0.25 || k > 0.75 ? 1 : 0);
            const wind = hold(k, 0.2, 0.4, 0.42, 0.5);
            const whip = hold(k, 0.42, 0.52, 0.6, 0.8);
            armR = { x: 0.1 + wind * 1.2 - whip * 1.9, z: 0.3 + wind * 0.6 + whip * 0.5, el: 1.5 * (1 - wind - whip) + wind * 0.6 };
            turn = wind * 0.5 - whip * 0.6;
            mood = hs.k > 0.5 ? 'hollow' : 'whip';
            if (a.hit && !a.burst) {
              a.burst = true;
              for (let i = 0; i < 6; i++) bits.emit({ pos: sp.at(0, 0.3, z + 0.25, v), vel: sp.dir((Math.random() - 0.5) * 0.8, Math.random() * 0.8, 0.3), life: 0.6, size: 0.04 * sp.scale, color: '#8c9888', gravity: 1.5, spin: 6 });
            }
            break;
          }
          case 'cast': {
            // Breathe in (stretch, leaves fold back), then SCREAM: shaking, leaves blasted up, rings of sound
            const inhale = hold(k, 0, 0.35, 0.38, 0.42);
            const scream = hold(k, 0.4, 0.45, 0.85, 1);
            squash = -inhale * 0.12 + scream * 0.06;
            lean = -inhale * 0.2 - scream * 0.25;
            blow = inhale * 0.4 + scream * 1.3;
            shake = Math.sin(t * 70) * 0.05 * scream;
            mood = hs.k > 0.5 ? 'hollow' : scream > 0.2 ? 'scream' : 'cross';
            armR = armL = { x: -scream * 0.3, z: 0.3 + scream * 1.6, el: 1.5 * (1 - scream) - scream * 0.3 };
            if (scream > 0.5 && (a.ringT = (a.ringT ?? 0) - dt) < 0) {
              a.ringT = 0.12;
              emitRing(sp.at(0, 0.28, 0.18, v), sp.dir(0, 0.1, 1).normalize(), false);
            }
            if (a.hit && !a.burst) {
              a.burst = true;
              emitRing(sp.at(0, 0.03, 0, v), sp.dir(0, 1, 0).normalize(), true);
              for (let i = 0; i < 10; i++) {
                const ang = Math.random() * Math.PI * 2;
                dirt.emit({ pos: sp.at(Math.cos(ang) * 0.15, 0.03, Math.sin(ang) * 0.15, v), vel: sp.dir(Math.cos(ang) * 0.8, 0.2, Math.sin(ang) * 0.8), life: 0.8, size: 0.08 * sp.scale, grow: 2.5, color: '#6b5a4a', opacity: 0.55, drag: 2 });
              }
            }
            break;
          }
          case 'tangle': {
            // Stamp, plunge both root arms into the earth, and roots burst up round your ankles
            const stamp = hold(k, 0.05, 0.15, 0.18, 0.25);
            const plunge = hold(k, 0.22, 0.35, 0.8, 0.95);
            bob += stamp * 0.06;
            squash = plunge * 0.1;
            lean = plunge * 0.45;
            armR = armL = { x: -plunge * 1.3, z: 0.3 - plunge * 0.1, el: 1.5 * (1 - plunge) };
            mood = hs.k > 0.5 ? 'hollow' : 'whip';
            snare.visible = true;
            snare.position.z = a.opts.reach ?? 1;
            for (const [i, s] of snares.entries()) {
              const g = ss(k, 0.35 + i * 0.03, 0.5 + i * 0.03) * (1 - ss(k, 0.82, 0.98));
              s.scale.set(Math.max(0.001, g), Math.max(0.001, g * (1 + Math.sin(t * 8 + i) * 0.05)), Math.max(0.001, g));
              s.rotation.y = Math.sin(t * 3 + i) * 0.2 * g;
            }
            if (k > 0.35 && !a.dust) {
              a.dust = true;
              for (let i = 0; i < 8; i++) {
                const ang = Math.random() * Math.PI * 2;
                dirt.emit({ pos: sp.at(Math.cos(ang) * 0.1, 0.03, snare.position.z + Math.sin(ang) * 0.1, v), vel: sp.dir(Math.cos(ang) * 0.4, 0.4, Math.sin(ang) * 0.4), life: 0.9, size: 0.07 * sp.scale, grow: 2, color: '#5e4c3c', opacity: 0.6, gravity: 0.3, drag: 1.5 });
              }
            }
            break;
          }
          case 'hurt': {
            const b = bell(k);
            z -= b * 0.14;
            lean = -b * 0.35;
            squash = b * 0.1;
            mood = hs.k > 0.5 ? 'hollow' : 'ouch';
            armR = armL = { x: b * 0.3, z: 0.3 + b * 1.1, el: 1.5 * (1 - b) };
            break;
          }
          case 'ko': sit = ss(k, 0, 0.35); break;
          case 'hollowed': squash = bell(k) * 0.08; break;
          case 'moonlit': squash = -bell(k) * 0.08; break;
        }
        act.done();
      }
      if (!a || a.name !== 'tangle') snare.visible = false;
      if (act.beaten) sit = 1;
      if (sit > 0) {
        // Sulking: plonked down, half turned away, arms folded tight, leaves drooping; a huff now and then
        bob *= 1 - sit;
        tilt *= 1 - sit;
        turn = turn * (1 - sit) + 1.9 * sit;
        lean = lean * (1 - sit) + 0.12 * sit;
        armR = armL = { x: -0.9 * sit + armR.x * (1 - sit), z: 0.3 * (1 - sit) - 0.15 * sit, el: 1.5 + sit * 0.4 }; // folded tight
        mood = hs.k > 0.5 ? 'hollow' : 'sulk';
        if (act.beaten && (huffT -= dt) < 0) {
          huffT = 2.5 + Math.random() * 2;
          grumble = 0.5;
          dirt.emit({ pos: sp.at(-0.05, 0.25, 0.05, v), vel: sp.dir(-0.3, 0.15, 0.1), life: 0.8, size: 0.05 * sp.scale, grow: 2.5, color: '#c8c0b8', opacity: 0.5 });
        }
        if (grumble > 0) { grumble -= dt; squash += bell(1 - grumble / 0.5) * 0.05; }
      }

      body.position.set(shake, bob - sit * 0.06, z);
      body.rotation.y = turn;
      hips.rotation.set(S.lean.update(lean, dt), 0, tilt);
      const sq = S.squash.update(squash, dt);
      torso.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
      // Legs: stepping in the idle bounce, straight out in front when sat
      for (const L of legs) {
        L.hip.rotation.x = -Math.max(0, Math.sin(t * 2.6 + (L.side > 0 ? 0 : Math.PI))) * 0.25 * (1 - sit) - sit * 1.3;
        L.hip.rotation.z = L.side * sit * 0.3;
        L.foot.rotation.x = sit * 0.9;
      }
      for (const [A, p] of [[arms[0], armR], [arms[1], armL]]) {
        A.sh.rotation.set(p.x, 0, A.side * (p.z - 0.3));
        A.el.rotation.set(0, 0, -A.side * p.el * 0.9);
      }
      // Leaves: bob on springs, fold back to inhale, blast up in a scream, droop when sulking
      for (const L of leaves) {
        const target = L.lean + Math.sin(t * 2 + L.phase) * 0.05 + (shake ? shake * 3 : 0) - blow * 0.6 + sit * 0.5 + squash * 1.5;
        L.j.rotation.x = L.s.update(target, dt);
        L.j.rotation.z = L.sz.update(tilt * 1.5 + Math.sin(t * 1.3 + L.phase) * 0.04 + (blow > 0.5 ? Math.sin(t * 40 + L.phase) * 0.15 : 0), dt);
      }
      faceJ.rotation.y = 0;
      face.show(mood);
      leafMat.color.copy(leafGrey).lerp(leafGreen, cured);

      // Scream rings roll outward and fade
      for (const r of rings) {
        if (r.t < 0) continue;
        r.t += dt;
        const k = r.t / (r.big ? 0.9 : 0.7);
        if (k >= 1) { r.t = -1; r.m.visible = false; continue; }
        const size = (r.big ? 0.3 + k * 1.6 : 0.12 + k * 0.7) * sp.scale;
        r.m.scale.setScalar(size);
        if (!r.big) r.m.position.add(sp.dir(0, 0, 1.6 * dt, v));
        r.m.material.opacity = (1 - k) * (r.big ? 0.45 : 0.55);
      }
      dirt.update(dt);
      bits.update(dt);
      shadow.position.set(0, 0.004, z);
    },
  };
  return api;
}
