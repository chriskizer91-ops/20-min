import * as THREE from 'three';
import { part, joint, sphere, cyl, taperedTube, skirt, glowSprite, blobShadow, onLayer, Spring } from './kit.js';
import { Hollow, hollowDressing, Actions, Motes, paintedFace, paint, texture, canvasTexture, space, fxGroup, ss, bell, hold } from './foes-common.js';

// The Glowcap (Aethermoor's glowcap): "mushrooms the size of children that walk toward light. Any light."
// Child-sized, with a spotted amber cap that glows from its gills (docs/LORE.md §7; Witch Way's herb notes:
// "they glow just enough to see themselves by, and they're faintly warm... Admire the spots. Don't lick them.")
// A cream stem with a frilly ring, stubby legs and mitten hands, a dreamy face that keeps looking up for a light.
// Intents: Spore Puff (all Poisoned), Glow (Warded); its plain hit is a Headbutt. Beaten, it sits down and puts
// down roots.

const C = {
  cap: '#d8862c', capDark: '#9c4d1a', capLight: '#f2b453', spot: '#fff0c8', gill: '#ffcf6b',
  stem: '#f3e9d4', stemDark: '#cdb892', ring: '#f1e4c6', foot: '#c4a67c', root: '#8d6c48', ink: '#2a1a14',
};

function capTexture() {
  // Along the lathe: v = 0 under the rim (canvas bottom) to v = 1 at the crown (canvas top)
  return canvasTexture(128, 128, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, C.capLight);
    grad.addColorStop(0.45, C.cap);
    grad.addColorStop(0.85, C.capDark);
    grad.addColorStop(1, '#6e3514');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    let seed = 4;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Faint streaks running down from the crown, and a mottle
    for (let i = 0; i < 70; i++) {
      const x = rand() * W;
      g.strokeStyle = rand() < 0.5 ? 'rgba(255,220,150,0.18)' : 'rgba(120,50,10,0.16)';
      g.lineWidth = 1 + rand() * 2;
      g.beginPath(); g.moveTo(x, H * rand() * 0.2); g.lineTo(x + (rand() - 0.5) * 4, H * (0.4 + rand() * 0.4)); g.stroke();
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,230,170,0.12)'; g.beginPath(); g.arc(rand() * W, rand() * H * 0.8, 3 + rand() * 5, 0, Math.PI * 2); g.fill(); }
  }, { repeat: [1, 1] });
}

function gillTexture() {
  return canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#e59a3c';
    g.fillRect(0, 0, W, H);
    const grad = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W / 2);
    grad.addColorStop(0, '#fff2b8');
    grad.addColorStop(0.5, C.gill);
    grad.addColorStop(1, '#d9822c');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // Gills: fine lines from the stem to the rim
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      g.strokeStyle = i % 2 ? 'rgba(150,70,20,0.55)' : 'rgba(255,245,200,0.5)';
      g.lineWidth = i % 2 ? 1.5 : 1;
      g.beginPath();
      g.moveTo(W / 2 + Math.cos(a) * 30, H / 2 + Math.sin(a) * 30);
      g.lineTo(W / 2 + Math.cos(a) * 128, H / 2 + Math.sin(a) * 128);
      g.stroke();
    }
  });
}

function stemTexture() {
  return canvasTexture(64, 64, (g, W, H) => {
    g.fillStyle = C.stem;
    g.fillRect(0, 0, W, H);
    let seed = 6;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Fibres running up the stem
    for (let i = 0; i < 40; i++) {
      const x = rand() * W;
      g.strokeStyle = rand() < 0.5 ? 'rgba(190,165,120,0.22)' : 'rgba(255,255,245,0.5)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (rand() - 0.5) * 3, H); g.stroke();
    }
  }, { repeat: [4, 1] });
}

function drawFace(g, W, H, mood) {
  g.translate(W / 2, H / 2);
  g.scale(1.45, 1.45);
  g.translate(-W / 2, -H / 2 - 14);
  const ink = C.ink, cx = W / 2, ey = 92, dx = 40;
  const cheeks = (a = 0.5) => { paint.blush(g, cx - 64, ey + 26, 22, `rgba(255,130,110,${a})`); paint.blush(g, cx + 64, ey + 26, 22, `rgba(255,130,110,${a})`); };
  const eyes = (lookX, lookY, lid = 0) => {
    for (const s of [-1, 1]) {
      const x = cx + s * dx;
      paint.ellipse(g, x, ey, 14, 18, ink);
      paint.ellipse(g, x + lookX * 0.6, ey + lookY * 0.6 + 4, 9, 10, '#7a4420');
      paint.ellipse(g, x + lookX - 4, ey + lookY - 5, 5.5, 5.5, '#fff');
      paint.ellipse(g, x + lookX + 5, ey + lookY + 7, 2.5, 2.5, 'rgba(255,240,200,0.95)');
      if (lid) paint.curve(g, [x - 14, ey - 16], [x, ey - 22 - lid * 4], [x + 14, ey - 16], 3, ink);
    }
  };
  const closed = (smile = 1) => { for (const s of [-1, 1]) paint.curve(g, [cx + s * dx - 13, ey + 2 - 4 * smile], [cx + s * dx, ey + 2 + 8 * smile], [cx + s * dx + 13, ey + 2 - 4 * smile], 4.5, ink); };
  if (mood === 'hollow') {
    for (const s of [-1, 1]) {
      const grad = g.createRadialGradient(cx + s * dx, ey, 2, cx + s * dx, ey, 20);
      grad.addColorStop(0, 'rgba(12,10,16,1)');
      grad.addColorStop(0.75, 'rgba(24,20,28,0.9)');
      grad.addColorStop(1, 'rgba(24,20,28,0)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(cx + s * dx, ey, 18, 22, 0, 0, Math.PI * 2); g.fill();
    }
    paint.line(g, [[cx - 10, ey + 46], [cx + 10, ey + 46]], 3, 'rgba(24,20,28,0.8)');
    return;
  }
  if (mood === 'dreamy') { cheeks(); eyes(-3, -6, 0); paint.ellipse(g, cx, ey + 44, 6, 7, ink); paint.ellipse(g, cx, ey + 46, 3.5, 3.5, '#b0503a'); }
  if (mood === 'blink') { cheeks(); closed(0.3); paint.ellipse(g, cx, ey + 44, 6, 7, ink); }
  if (mood === 'bonk') {
    cheeks(0.6);
    for (const s of [-1, 1]) paint.line(g, [[cx + s * dx - 12 * s, ey - 10], [cx + s * dx + 10 * s, ey], [cx + s * dx - 12 * s, ey + 10]], 5, ink);
    paint.line(g, [[cx - 14, ey + 44], [cx + 14, ey + 44]], 5, ink);
  }
  if (mood === 'puff') {
    cheeks(0.8);
    closed(-0.6);
    paint.ellipse(g, cx - 60, ey + 30, 16, 12, 'rgba(255,170,140,0.4)');
    paint.ellipse(g, cx + 60, ey + 30, 16, 12, 'rgba(255,170,140,0.4)');
    paint.ellipse(g, cx, ey + 44, 4, 4, ink);
  }
  if (mood === 'glow') { cheeks(0.6); closed(1); paint.curve(g, [cx - 12, ey + 40], [cx, ey + 50], [cx + 12, ey + 40], 4, ink); }
  if (mood === 'ouch') {
    for (const s of [-1, 1]) { paint.line(g, [[cx + s * dx - 10, ey - 10], [cx + s * dx + 10, ey + 10]], 4.5, ink); paint.line(g, [[cx + s * dx + 10, ey - 10], [cx + s * dx - 10, ey + 10]], 4.5, ink); }
    paint.ellipse(g, cx, ey + 44, 8, 6, ink);
  }
  if (mood === 'rest') { cheeks(0.7); closed(0.8); paint.curve(g, [cx - 9, ey + 42], [cx, ey + 48], [cx + 9, ey + 42], 3.5, ink); }
}

export function createGlowcap({ hollowed = false } = {}) {
  const root = new THREE.Group();
  root.name = 'glowcap';
  const H = new Hollow({ scale: 9 });
  const fx = fxGroup(root, 'glowcap');
  const sp = space(root);

  const body = joint(root, [0, 0, 0], 'body');
  const hips = joint(body, [0, 0.13, 0], 'hips');

  // ---------------------------------------------------------------- legs and feet
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.07, 0, 0]);
    part(hip, cyl(0.05, 0.056, 0.1, 10), H.toon(C.stemDark), { pos: [0, -0.05, 0] });
    const foot = joint(hip, [0, -0.1, 0]);
    part(foot, sphere(0.062, 12, 8), H.toon(C.foot), { pos: [0, -0.005, 0.018], scale: [1, 0.55, 1.3] });
    // Three stubby root toes
    for (const a of [-0.5, 0, 0.5]) part(foot, taperedTube([[0, 0, 0], [Math.sin(a) * 0.03, -0.01, 0.03], [Math.sin(a) * 0.05, -0.024, 0.045]], 0.016, 0.004, 5, 5), H.toon(C.root), { pos: [0, -0.01, 0.045], ink: false });
    return { hip, foot };
  });

  // ---------------------------------------------------------------- stem, ring, arms, face
  const torso = joint(hips, [0, 0, 0], 'stem');
  const stemMat = H.toonMap(stemTexture(), { rim: 1 });
  const stemProfile = [[0.001, -0.02], [0.13, -0.01], [0.15, 0.06], [0.14, 0.16], [0.118, 0.27], [0.102, 0.36], [0.098, 0.43], [0.001, 0.44]];
  part(torso, new THREE.LatheGeometry(stemProfile.map(([x, y]) => new THREE.Vector2(x, y)), 18), stemMat);
  // The ring (annulus): a frilly skirt round the stem just under the cap
  const ringGeo = skirt({ top: 0.1, bottom: 0.155, height: 0.07, flare: 0.6, points: 18, zig: 0.012, rows: 2, ragged: 0.01 });
  part(torso, ringGeo, H.toon(C.ring, { side: THREE.DoubleSide }), { pos: [0, 0.37, 0] });

  const arms = [-1, 1].map((side) => {
    const sh = joint(torso, [side * 0.115, 0.24, 0.01]);
    sh.rotation.z = side * 0.5;
    part(sh, taperedTube([[0, 0, 0], [side * 0.012, -0.05, 0.01], [side * 0.01, -0.09, 0.02]], 0.032, 0.026, 6, 7), H.toon(C.stem), {});
    part(sh, sphere(0.034, 10, 8), H.toon(C.stemDark), { pos: [side * 0.01, -0.105, 0.022], scale: [1, 0.9, 1] });
    return { sh, side };
  });

  const face = paintedFace(H, {
    cone: { top: 0.119, bottom: 0.147, height: 0.15 }, width: 1.7, size: [256, 176], draw: drawFace, rim: 0.2,
    moods: ['dreamy', 'blink', 'bonk', 'puff', 'glow', 'ouch', 'rest', 'hollow'],
  });
  const faceHolder = joint(torso, [0, 0.2, 0]);
  faceHolder.add(face.mesh);

  // ---------------------------------------------------------------- the cap
  const capJ = joint(torso, [0, 0.42, 0], 'cap');
  const capProfile = [[0.001, 0.3], [0.08, 0.29], [0.16, 0.255], [0.23, 0.195], [0.28, 0.12], [0.305, 0.05], [0.31, 0.0], [0.295, -0.03], [0.265, -0.035]];
  const capGeo = new THREE.LatheGeometry(capProfile.map(([x, y]) => new THREE.Vector2(x, y)).reverse(), 26);
  const capMat = H.toonMap(capTexture(), { rim: 1.1, emissive: new THREE.Color('#3a1a06'), emissiveIntensity: 0.4 });
  const cap = part(capJ, capGeo, capMat);
  // Gills underneath, glowing
  const gillMat = H.toonMap(gillTexture(), { side: THREE.DoubleSide, emissive: new THREE.Color('#ffb347'), emissiveIntensity: 0.9, rim: 0 });
  const gills = new THREE.Mesh(new THREE.CircleGeometry(0.285, 28), gillMat);
  gills.rotation.x = Math.PI / 2;
  gills.position.y = -0.025;
  capJ.add(gills);
  // Spots: cream warts scattered over the cap, each sitting on the surface
  const spotMat = H.toon(C.spot, { emissive: new THREE.Color('#6a5020'), emissiveIntensity: 0.5 });
  const capCurve = new THREE.SplineCurve(capProfile.slice(0, 7).map(([x, y]) => new THREE.Vector2(x, y)));
  // [how far from the crown 0-1, angle round from the front, radius]
  const SPOTS = [
    [0, 0, 0.05], [0.3, 0.2, 0.034], [0.55, -0.35, 0.03], [0.72, 0.45, 0.026], [0.42, 1.2, 0.03], [0.68, 1.6, 0.024],
    [0.33, -1.1, 0.028], [0.62, -1.5, 0.032], [0.5, 2.3, 0.03], [0.78, 2.8, 0.022], [0.35, 3.1, 0.026], [0.6, -2.4, 0.03],
    [0.82, -0.9, 0.02], [0.84, 1.0, 0.018], [0.25, -2.5, 0.024],
  ];
  for (const [tt, a, r] of SPOTS) {
    const p = capCurve.getPoint(tt);
    const m = part(capJ, sphere(r, 10, 6), spotMat, { pos: [Math.sin(a) * p.x, p.y, Math.cos(a) * p.x], ink: false });
    // Flatten against the cap, facing out from it
    const n = new THREE.Vector3(Math.sin(a) * p.x, p.y + 0.12, Math.cos(a) * p.x).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    m.scale.set(1, 0.4, 1);
  }

  // Light: warm under the cap, a halo
  const light = new THREE.PointLight('#ffb347', 0.35, 2.5, 2);
  light.position.set(0, -0.05, 0.4);
  capJ.add(light);
  const halo = glowSprite('#ffb347', 1.1, 0.28);
  halo.position.y = 0.02;
  capJ.add(halo);

  // Roots, for when it sits down and stays (hidden until then)
  const roots = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const len = 0.18 + (i % 3) * 0.06;
    const pts = [[0, 0.03, 0], [Math.sin(a) * len * 0.4, 0.0, Math.cos(a) * len * 0.4], [Math.sin(a + 0.3) * len * 0.8, -0.005, Math.cos(a + 0.3) * len * 0.8], [Math.sin(a + 0.2) * len, -0.01, Math.cos(a + 0.2) * len]];
    const j = joint(root, [0, 0, 0]);
    part(j, taperedTube(pts, 0.03, 0.006, 8, 5), H.toon('#a58158'), {});
    j.scale.setScalar(0.001);
    j.visible = false;
    roots.push(j);
  }

  const shadow = blobShadow(0.3, 0.45);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- effects
  const spores = new Motes(fx, { count: 40, map: texture('dot') });
  const clouds = new Motes(fx, { count: 12, map: texture('puff'), blending: THREE.AdditiveBlending });
  const wardMat = new THREE.MeshBasicMaterial({ map: texture('ring'), color: '#ffcf6b', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
  const ward = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), wardMat);
  ward.rotation.x = -Math.PI / 2;
  ward.position.y = 0.03;
  ward.visible = false;
  root.add(ward);
  const wardDome = glowSprite('#ffcf6b', 1.4, 0);
  wardDome.position.y = 0.45;
  root.add(wardDome);
  const dressing = hollowDressing({ root, fx, sp, radius: 0.4, body: () => [(Math.random() - 0.5) * 0.4, 0.55 + Math.random() * 0.25, (Math.random() - 0.5) * 0.4] });

  const act = new Actions({
    attack: [1.2, 0.5], // Headbutt: a spongy, surprisingly heavy cap
    cast: [1.5, 0.5], // Spore Puff: a cloud of glowing spores over everyone
    glow: [1.4, 0.5], // Glow: its gills blaze (Warded)
    hurt: [0.55, 0.2],
    ko: [2.6, 0.5], // sits down and puts down roots
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { headbutt: 'attack', 'spore-puff': 'cast', spores: 'cast' });

  let t = Math.random() * 10, blinkT = 2, step = 0, nextStep = 2, lookUp = 0, nextLook = 2, lookTarget = 0;
  const S = { capX: new Spring(40, 4), capZ: new Spring(40, 4), squash: new Spring(70, 6), ring: new Spring(30, 4) };
  const v = new THREE.Vector3();
  if (hollowed) H.set(true, { instant: true });

  const api = {
    root, fx, name: 'Glowcap', height: 0.9, radius: 0.32, center: 0.5,
    moves: ['attack', 'cast', 'glow', 'hurt', 'ko', 'hollowed', 'moonlit'],
    intents: { headbutt: 'attack', 'spore-puff': 'cast', glow: 'glow' },
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

      // ---- idle: sway from foot to foot, now and then a little toddle toward a light it can see; gaze up at it
      let z = 0, x = 0, bodyY = 0, lean = 0, tilt = Math.sin(t * 1.8) * 0.05, turn = 0;
      let hipY = 0.13, squash = 0, capPush = 0, glowK = 1, mood = hs.k > 0.5 ? 'hollow' : 'dreamy';
      let legL = 0, legR = 0, armOut = 0, armFwd = 0, sit = 0, rootK = 0;
      if (!act.busy && !act.beaten && (nextStep -= dt) < 0) { step = 1.2; nextStep = 3 + Math.random() * 3; }
      if (step > 0) {
        // Two little steps forward and back again: drawn toward the light, then shy of it
        step -= dt;
        const k = 1 - step / 1.2;
        const p = k * Math.PI * 4;
        legL = Math.max(0, Math.sin(p)) * 0.5;
        legR = Math.max(0, -Math.sin(p)) * 0.5;
        z = Math.sin(k * Math.PI) * 0.08;
        tilt += Math.sin(p) * 0.08;
        bodyY = Math.abs(Math.sin(p)) * 0.015;
      }
      if ((nextLook -= dt) < 0) { lookTarget = Math.random() < 0.6 ? 1 : 0; nextLook = 2 + Math.random() * 3; }
      lookUp += (lookTarget - lookUp) * (1 - Math.exp(-dt * 2));
      turn = Math.sin(t * 0.4) * 0.25;
      if ((blinkT -= dt) < 0) blinkT = 2.5 + Math.random() * 3;
      if (blinkT < 0.13 && mood === 'dreamy') mood = 'blink';
      armOut = Math.sin(t * 1.8) * 0.08;

      const a = act.step(dt);
      if (a) {
        const k = a.k;
        switch (a.name) {
          case 'attack': {
            // Toddle in, rear back, bonk with the cap, wobble home
            const out = hold(k, 0, 0.3, 0.7, 1);
            z += out * (a.opts.reach ?? 0.55);
            const p = k * Math.PI * 8;
            legL = Math.max(0, Math.sin(p)) * 0.5 * (k < 0.3 || k > 0.7 ? 1 : 0);
            legR = Math.max(0, -Math.sin(p)) * 0.5 * (k < 0.3 || k > 0.7 ? 1 : 0);
            const rear = hold(k, 0.3, 0.42, 0.44, 0.48);
            const bonk = hold(k, 0.44, 0.5, 0.56, 0.7);
            lean = -rear * 0.35 + bonk * 0.75;
            capPush = bonk;
            mood = hs.k > 0.5 ? 'hollow' : k > 0.3 && k < 0.7 ? 'bonk' : mood;
            armFwd = -rear * 0.6 + bonk * 0.4;
            if (a.hit && !a.burst) {
              a.burst = true;
              for (let i = 0; i < 10; i++) spores.emit({ pos: sp.at(0, 0.7, z + 0.3, v), vel: sp.dir((Math.random() - 0.5) * 0.9, Math.random() * 0.6, 0.3), life: 0.6, size: 0.05 * sp.scale, color: '#ffd27a', drag: 2, gravity: 0.5 });
            }
            break;
          }
          case 'cast': {
            // Crouch, the cap swells, then a big puff of glowing spores out from under it
            const crouch = hold(k, 0, 0.35, 0.45, 0.55);
            const puff = hold(k, 0.45, 0.5, 0.6, 0.9);
            squash = crouch * 0.18 - puff * 0.1;
            capPush = crouch * 0.12 - puff * 0.05;
            mood = hs.k > 0.5 ? 'hollow' : 'puff';
            armOut = crouch * 0.5;
            glowK = 1 + puff * 1.2;
            if (k > 0.45 && k < 0.7) {
              const s = sp.scale;
              for (let i = 0; i < 2; i++) {
                const ang = Math.random() * Math.PI * 2;
                clouds.emit({ pos: sp.at(Math.cos(ang) * 0.25, 0.4, Math.sin(ang) * 0.25, v), vel: sp.dir(Math.cos(ang) * 0.5, 0.15, Math.sin(ang) * 0.5 + 0.6), life: 1.6, size: 0.3 * s, grow: 3, color: Math.random() < 0.5 ? '#c9b24a' : '#9fc24a', opacity: 0.45, drag: 1.2 });
                spores.emit({ pos: sp.at(Math.cos(ang) * 0.28, 0.42, Math.sin(ang) * 0.28, v), vel: sp.dir(Math.cos(ang) * 0.6, 0.2 + Math.random() * 0.4, Math.sin(ang) * 0.6 + 0.8), life: 1.4 + Math.random() * 0.6, size: (0.03 + Math.random() * 0.03) * s, color: Math.random() < 0.6 ? '#ffe08a' : '#c8ff8a', drag: 1, wobble: 0.03 * s });
              }
            }
            break;
          }
          case 'glow': {
            // Stand tall, eyes closed, gills blazing; a warm ring of light round its feet
            const on = hold(k, 0, 0.35, 0.75, 1);
            squash = -on * 0.06;
            mood = hs.k > 0.5 ? 'hollow' : 'glow';
            glowK = 1 + on * 2.2;
            armOut = on * 0.9;
            ward.visible = true;
            ward.scale.setScalar(0.5 + ss(k, 0, 0.5) * 0.6);
            wardMat.opacity = on * 0.8;
            wardDome.material.opacity = on * 0.35;
            if (Math.random() < dt * 14 * on) spores.emit({ pos: sp.at((Math.random() - 0.5) * 0.7, 0.05, (Math.random() - 0.5) * 0.7, v), vel: sp.dir(0, 0.5, 0), life: 1.2, size: 0.04 * sp.scale, color: '#ffe08a', wobble: 0.02 });
            break;
          }
          case 'hurt': {
            const b = bell(k);
            z -= b * 0.15;
            lean = -b * 0.3;
            capPush = -b * 0.3;
            mood = hs.k > 0.5 ? 'hollow' : 'ouch';
            armOut = b * 0.8;
            break;
          }
          case 'ko': sit = ss(k, 0, 0.3); rootK = ss(k, 0.35, 1); break;
          case 'hollowed': squash = bell(k) * 0.08; break;
          case 'moonlit': squash = -bell(k) * 0.06; glowK = 1 + bell(k); break;
        }
        act.done();
      }
      if (a?.name !== 'glow') { ward.visible = false; wardDome.material.opacity = 0; }
      if (act.beaten) { sit = 1; rootK = 1; }
      if (sit > 0) {
        // Plop: down on its bottom, legs out in front, a wobble; then it settles and roots
        hipY = 0.13 - sit * 0.1;
        legL = legR = -sit * 1.35;
        lean = lean * (1 - sit) - sit * 0.08;
        squash += Math.sin(Math.min(1, sit * 1.4) * Math.PI) * 0.1;
        mood = hs.k > 0.5 ? 'hollow' : sit > 0.5 ? 'rest' : 'ouch';
        armOut = sit * 0.4;
        glowK *= 1 - sit * 0.3 + Math.sin(t * 1.2) * 0.1 * sit;
        tilt *= 1 - sit;
        turn *= 1 - sit;
        z *= 1 - sit;
      }
      for (const [i, r] of roots.entries()) {
        const g = ss(rootK, i * 0.08, i * 0.08 + 0.45);
        r.visible = g > 0.01;
        r.scale.setScalar(Math.max(0.001, g));
      }

      body.position.set(x, bodyY, z);
      body.rotation.y = turn;
      hips.position.y = hipY;
      hips.rotation.set(lean, 0, tilt);
      legs[0].hip.rotation.x = -legR;
      legs[1].hip.rotation.x = -legL;
      for (const L of legs) L.foot.rotation.x = Math.max(0, -L.hip.rotation.x) * 0.3 - Math.min(0, L.hip.rotation.x) * 0.9;
      const sq = S.squash.update(squash, dt);
      torso.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
      for (const A of arms) {
        A.sh.rotation.z = A.side * (0.5 + armOut);
        A.sh.rotation.x = -armFwd;
      }
      // The cap lags and wobbles on its stem, and tips back when it looks up for the light
      capJ.rotation.x = S.capX.update(-lean * 0.6 + capPush * 0.8 - lookUp * 0.18 * (1 - sit) + sit * 0.15, dt);
      capJ.rotation.z = S.capZ.update(-tilt * 1.6, dt);
      capJ.scale.set(1 + Math.max(0, capPush) * 0.1 - Math.min(0, capPush) * 0.3, 1 - Math.max(0, capPush) * 0.15 + Math.max(0, -capPush) * 0.1, 1 + Math.max(0, capPush) * 0.1);
      faceHolder.rotation.x = -lookUp * 0.12 * (1 - sit);
      face.show(mood);
      swayRing(ringGeo, S.ring.update(tilt * 2 + lean, dt), t);

      // Glow: gills, spots, light, halo
      const pulse = 0.9 + Math.sin(t * 2.2) * 0.1;
      const greyed = 1 - hs.k * 0.75;
      gillMat.emissiveIntensity = 0.9 * glowK * pulse * greyed;
      spotMat.emissiveIntensity = 0.5 * glowK * greyed;
      light.intensity = 0.35 * glowK * pulse * greyed;
      halo.material.opacity = 0.28 * glowK * pulse * greyed;
      halo.scale.setScalar(1.1 * (0.8 + glowK * 0.2));
      shadow.position.set(x, 0.004, z);
      // A few spores always drifting up out of the gills
      if (Math.random() < dt * 2.5 * greyed) {
        const ang = Math.random() * Math.PI * 2;
        spores.emit({ pos: sp.of(capJ, v).add(sp.dir(Math.cos(ang) * 0.2, -0.04, Math.sin(ang) * 0.2)), vel: sp.dir(0, 0.12, 0), life: 2.4, size: 0.025 * sp.scale, color: hs.k > 0.5 ? '#a9a4b0' : '#ffe08a', opacity: 0.9, wobble: 0.03 * sp.scale });
      }
      spores.update(dt);
      clouds.update(dt);
    },
  };
  return api;
}

// The ring under the cap sways a little as it moves.
function swayRing(geo, amount, time) {
  const { rows, cols, rest } = geo.userData;
  const pos = geo.attributes.position;
  for (let r = 1; r <= rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = (r * cols + c) * 3;
      const f = r / rows;
      pos.setXYZ(r * cols + c, rest[k] * (1 + Math.sin(time * 3 + c) * 0.02 * f), rest[k + 1], rest[k + 2] - amount * 0.03 * f);
    }
  pos.needsUpdate = true;
}
