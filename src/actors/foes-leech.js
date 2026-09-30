import * as THREE from 'three';
import { part, joint, sphere, taperedTube, blobShadow, onLayer, Spring } from './kit.js';
import { Hollow, hollowDressing, Actions, Motes, Tube, texture, canvasTexture, space, fxGroup, ss, bell, hold } from './foes-common.js';

// The Mire Leech (Aethermoor's mire-leech): "a leech as long as your arm, black and patient, lying in the fords
// of the safe paths." Here it is "glossy and black, more slug than horror" (docs/LORE.md §7): a soft segmented
// body that ripples as it breathes, a pale sheen along its back, two little eye-stalks, a round sucker mouth it
// keeps tucked away, lying in its own patch of black water. Intents: Latch On (Snagged), Drink (drains and heals);
// its plain hit is a lunge and a gummy nip. Beaten, it uses its own Sink: it lets go and slips back into the water.

const C = {
  skin: '#221e2c', band: '#2c2838', sheen: '#9aa3c8', belly: '#3c3a44', teal: '#2f5a5a',
  mouth: '#b9909e', mouthIn: '#4a2632', eye: '#f2f0ea', pupil: '#120e16', water: '#0a0d16',
};
const N = 16; // spine points

function skinTexture() {
  // The tube's u runs round the body with its back at u = 0.5; v runs tail (0) to head (1)
  return canvasTexture(128, 256, (g, W, H) => {
    g.fillStyle = C.skin;
    g.fillRect(0, 0, W, H);
    // A teal-violet sheen down the flanks
    const side = g.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(60,58,68,0.9)');
    side.addColorStop(0.2, 'rgba(47,90,90,0.35)');
    side.addColorStop(0.5, 'rgba(40,36,56,0)');
    side.addColorStop(0.8, 'rgba(47,90,90,0.35)');
    side.addColorStop(1, 'rgba(60,58,68,0.9)');
    g.fillStyle = side;
    g.fillRect(0, 0, W, H);
    // Soft rings, one per segment
    for (let y = 0; y < H; y += 16) { g.fillStyle = 'rgba(8,6,12,0.35)'; g.fillRect(0, y, W, 1.5); }
    // A darker line down the middle of the back, like a slug's, and a soft frill low on each side
    g.fillStyle = 'rgba(6,4,10,0.6)';
    g.fillRect(W * 0.485, 0, W * 0.03, H);
    // The gloss: a long wet highlight either side of the back line, wobbling a little
    for (const [x0, w, a] of [[0.4, 0.07, 0.8], [0.54, 0.05, 0.55], [0.3, 0.03, 0.3]]) {
      for (let y = 0; y < H; y += 2) {
        const x = W * x0 + Math.sin(y * 0.07) * 2;
        const grad = g.createLinearGradient(x, 0, x + W * w, 0);
        grad.addColorStop(0, 'rgba(180,190,230,0)');
        grad.addColorStop(0.5, `rgba(210,220,250,${a})`);
        grad.addColorStop(1, 'rgba(180,190,230,0)');
        g.fillStyle = grad;
        g.fillRect(x, y, W * w, 2);
      }
    }
    // Tiny pale speckles
    let seed = 23;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(180,190,210,0.4)'; g.fillRect(rand() * W, rand() * H, 1.5, 1.5); }
  });
}

function waterTexture() {
  return canvasTexture(128, 128, (g, W, H) => {
    const grad = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    grad.addColorStop(0, 'rgba(18,24,40,1)');
    grad.addColorStop(0.75, 'rgba(10,13,22,0.95)');
    grad.addColorStop(1, 'rgba(10,13,22,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // A few moonlit glints on the black water
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(170,180,230,0.22)';
    for (const [x, y, w] of [[38, 46, 14], [76, 82, 10]]) { g.beginPath(); g.arc(x, y + 40, 40, -Math.PI / 2 - w / 80, -Math.PI / 2 + w / 80); g.stroke(); }
  });
}

export function createMireLeech({ hollowed = false } = {}) {
  const outer = new THREE.Group();
  outer.name = 'mire-leech';
  // Built at arm's length, then shown a little larger so it reads on the dark ground
  const root = joint(outer, [0, 0, 0], 'leech');
  root.scale.setScalar(1.2);
  const H = new Hollow({ scale: 12 });
  const fx = fxGroup(outer, 'mire-leech');
  const sp = space(root);

  // ---------------------------------------------------------------- its patch of black water
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ map: waterTexture(), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.004, -0.12);
  pool.scale.set(1, 1.3, 1);
  pool.renderOrder = -1;
  root.add(pool);
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: '#8f9ac8', transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.008;
    m.visible = false;
    root.add(m);
    ripples.push({ m, t: -1 });
  }
  let rippleNext = 0, rippleT = 0;
  const ripple = (x, z, size = 0.35) => { const r = ripples[rippleNext++ % 4]; r.t = 0; r.size = size; r.m.position.set(x, 0.008, z); r.m.visible = true; };

  // ---------------------------------------------------------------- the body
  const skin = H.toonMap(skinTexture(), { rim: 1.8 });
  const tube = new Tube(N, 12);
  const body = part(root, tube.geometry, skin);
  body.frustumCulled = false;
  const spine = Array.from({ length: N }, () => new THREE.Vector3());
  const ctrl = Array.from({ length: 5 }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');

  // Head parts ride on the front of the tube
  const head = joint(root, [0, 0, 0], 'head');
  const eyeStalks = [];
  const eyeWhite = H.toon(C.eye, { rim: 0.5 });
  for (const side of [-1, 1]) {
    const j = joint(head, [side * 0.028, 0.035, -0.01]);
    j.rotation.set(0.35, 0, -side * 0.35);
    part(j, taperedTube([[0, 0, 0], [0, 0.03, 0.004], [0, 0.055, 0]], 0.012, 0.008, 6, 6), skin);
    const eye = joint(j, [0, 0.062, 0]);
    part(eye, sphere(0.021, 10, 8), eyeWhite);
    const pupil = part(eye, sphere(0.012, 8, 6), H.basic(C.pupil), { pos: [0, 0.0, 0.014], scale: [1, 1.2, 0.6], ink: false });
    part(eye, sphere(0.005, 5, 4), H.basic('#ffffff'), { pos: [-0.005, 0.006, 0.02], ink: false });
    eyeStalks.push({ j, eye, pupil, side, s: new Spring(60, 6) });
  }
  // Two little feelers under the chin
  for (const side of [-1, 1]) part(head, taperedTube([[0, 0, 0], [side * 0.015, -0.01, 0.02], [side * 0.02, -0.02, 0.03]], 0.007, 0.003, 4, 5), skin, { pos: [side * 0.02, -0.025, 0.02], ink: false });
  // A small, slightly smug smile under the eye-stalks (hidden while the sucker is out)
  // (the head's +z runs out along the body, +y is its back; the chin faces forward-and-down from there)
  const chin = joint(head, [0, 0, 0], 'chin');
  chin.rotation.x = 0.75;
  const smile = part(chin, new THREE.TorusGeometry(0.015, 0.0035, 4, 10, Math.PI), H.basic('#0a080e'), { pos: [0, 0.004, 0.06], rot: [0, 0, Math.PI], ink: false });
  const cheeks = [-1, 1].map((side) => part(chin, sphere(0.007, 6, 4), H.basic('#7a4a66'), { pos: [side * 0.027, 0.008, 0.055], scale: [1.4, 0.8, 0.4], ink: false }));
  // The sucker: a soft pink ring with a dark middle, tucked flat until it latches
  const mouth = joint(head, [0, -0.012, 0.052], 'mouth');
  part(mouth, new THREE.TorusGeometry(0.03, 0.012, 8, 16), H.toon(C.mouth, { rim: 0.6 }), {});
  part(mouth, new THREE.CircleGeometry(0.03, 14), H.basic(C.mouthIn), { pos: [0, 0, -0.004], ink: false });

  const shadow = blobShadow(0.3, 0.3);
  shadow.scale.set(1, 1.6, 1);
  shadow.position.z = -0.1;
  root.add(shadow);
  onLayer(outer);

  // ---------------------------------------------------------------- effects
  const bubbles = new Motes(fx, { count: 16, map: texture('ring') });
  const drops = new Motes(fx, { count: 16, map: texture('dot') });
  const heal = new Motes(fx, { count: 16, map: texture('sparkle') });
  const dressing = hollowDressing({ root, fx, sp, radius: 0.4, body: () => { const s = spine[4 + Math.floor(Math.random() * 10)]; return [s.x, s.y + 0.05, s.z]; } });

  const act = new Actions({
    attack: [1.0, 0.45], // a lunge and a gummy nip
    latch: [2.0, 0.3], // Latch On: up out of the ford and fastens on (Snagged)
    cast: [2.4, 0.5], // Drink: it drinks, and swells, and heals by what it drinks
    hurt: [0.55, 0.2],
    ko: [2.4, 0.5], // Sink: it lets go and slips back into the black water
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { 'latch-on': 'latch', drink: 'cast', sink: 'ko', nip: 'attack' });

  let t = Math.random() * 10, blinkT = 2, look = 0, lookT = 0, nextLook = 1;
  const S = { headZ: new Spring(40, 6), headY: new Spring(40, 6), sway: new Spring(20, 4), mouth: new Spring(50, 6) };
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), m4 = new THREE.Matrix4();
  if (hollowed) H.set(true, { instant: true });

  const api = {
    root: outer, fx, name: 'Mire Leech', height: 0.55, radius: 0.36, center: 0.24,
    moves: ['attack', 'latch', 'cast', 'hurt', 'ko', 'hollowed', 'moonlit'],
    intents: { latch: 'latch', drink: 'cast', sink: 'ko' },
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

      // ---- idle: the head reared up, swaying and peering about; the body breathes in slow ripples
      let headZ = 0.16, headY = 0.34, sway = Math.sin(t * 0.8) * 0.07, lean = 0;
      let squeeze = 0, gulp = -1, mouthOpen = 0, stalks = 1, sink = 0, glow = 0, pulse = 0, arch = 0;
      if ((nextLook -= dt) < 0) { lookT = (Math.random() - 0.5) * 1.2; nextLook = 1 + Math.random() * 2.5; }
      look += (lookT - look) * (1 - Math.exp(-dt * 4));
      if ((blinkT -= dt) < 0) blinkT = 2.5 + Math.random() * 3;
      if (blinkT < 0.15) stalks = 0.4;
      const a = act.step(dt);
      if (a) {
        const k = a.k;
        const reach = a.opts.reach ?? 0.75;
        switch (a.name) {
          case 'attack': {
            // Rear back, lunge, a gummy nip, and settle
            const back = hold(k, 0, 0.3, 0.32, 0.4);
            const out = hold(k, 0.35, 0.45, 0.55, 0.85);
            headZ += -back * 0.12 + out * reach * 0.75;
            headY += back * 0.08 - out * 0.12;
            mouthOpen = hold(k, 0.3, 0.4, 0.45, 0.5);
            stalks = 1 - out * 0.6;
            if (a.hit && !a.burst) { a.burst = true; for (let i = 0; i < 6; i++) drops.emit({ pos: sp.of(mouth, v), vel: sp.dir((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, 0.2), life: 0.5, size: 0.03 * sp.scale, color: '#6a7aa0', gravity: 2 }); }
            break;
          }
          case 'latch': {
            // Up out of the ford and fastened on; three hard squeezes; then it lets go with a pop
            const out = hold(k, 0.08, 0.28, 0.82, 0.92);
            headZ += out * reach;
            headY -= out * 0.1;
            arch = out;
            mouthOpen = hold(k, 0.15, 0.25, 0.8, 0.85);
            for (const at of [0.4, 0.55, 0.7]) squeeze = Math.max(squeeze, hold(k, at - 0.06, at, at + 0.02, at + 0.08));
            stalks = 1 - out * 0.5;
            if (k > 0.86 && !a.pop) { a.pop = true; ripple(0, reach * 0.8, 0.25); }
            break;
          }
          case 'cast': {
            // Drink: fastened on, gulps run down it from head to tail; it swells, and glows well again
            const out = hold(k, 0.05, 0.2, 0.75, 0.88);
            headZ += out * reach;
            headY -= out * 0.1;
            arch = out;
            mouthOpen = out;
            const g = ((k - 0.2) / 0.55) * 3; // three gulps
            if (k > 0.2 && k < 0.75) gulp = 1 - (g % 1);
            glow = hold(k, 0.25, 0.4, 0.8, 0.95);
            if (k > 0.75 && k < 0.95 && Math.random() < dt * 20) {
              const s = spine[3 + Math.floor(Math.random() * 12)];
              heal.emit({ pos: sp.at(s.x, s.y + 0.05, s.z, v), vel: sp.dir(0, 0.4, 0), life: 0.9, size: 0.06 * sp.scale, color: '#9dffb0', spin: 3 });
            }
            break;
          }
          case 'hurt': {
            const b = bell(k);
            headZ -= b * 0.14;
            headY -= b * 0.08;
            lean = -b;
            stalks = 1 - b * 0.9;
            squeeze = b * 0.5;
            break;
          }
          case 'ko': sink = ss(k, 0.12, 0.85); stalks = 1 - ss(k, 0, 0.2); break;
          case 'hollowed': squeeze = bell(k) * 0.3; break;
          case 'moonlit': headY += bell(k) * 0.05; break;
        }
        act.done();
      }
      if (act.beaten) sink = 1;

      // ---- the spine: tail lying in the water behind, body along the ground, the front rearing up to the head
      const hz = S.headZ.update(headZ, dt), hy = S.headY.update(headY, dt), sw = S.sway.update(sway + look * 0.08, dt);
      const wig = (p) => Math.sin(t * 1.6 - p * 3) * 0.05 + (p - 1.5) * 0.04 * Math.sin(p * 2.1);
      ctrl[0].set(wig(0) * 1.4, 0.03, -0.5);
      ctrl[1].set(wig(1), 0.06, -0.3);
      ctrl[2].set(wig(2) * 0.7, 0.075, -0.1 + hz * 0.25);
      ctrl[3].set(sw * 0.5, 0.1 + hy * 0.4 + arch * (0.12 + squeeze * 0.05), hz * 0.55 - 0.02);
      ctrl[4].set(sw, hy, hz);
      // Sinking: everything slides back and down into the middle of the pool, shrinking away
      const sinkC = v2.set(0, -0.05, -0.2);
      for (const c of ctrl) c.lerp(sinkC, sink * sink);
      curve.updateArcLengths();
      for (let i = 0; i < N; i++) curve.getPointAt(i / (N - 1), spine[i]);
      const shrink = 1 - sink * 0.85;
      tube.update(spine, (s) => {
        let r = 0.058 + 0.036 * Math.sin(Math.min(1, s * 1.25) * Math.PI * 0.95);
        r *= Math.sqrt(Math.min(1, s / 0.06)) * Math.sqrt(Math.min(1, (1 - s) / 0.07));
        r *= 1 + Math.sin(s * 14 - t * 3) * 0.05 + pulse; // it breathes in ripples
        if (gulp >= 0) r *= 1 + 0.35 * Math.exp(-((s - gulp) ** 2) / 0.006);
        r *= 1 - squeeze * 0.2 * Math.sin(s * Math.PI);
        return Math.max(0.0005, r * shrink * (1 + glow * 0.08));
      }, undefined, (s) => 0.68 + 0.32 * ss(s, 0.45, 0.8));

      // ---- the head rides the front of the tube: +z along the body, +y its back (the tube's own frame, so it
      // never flips when it rears straight up)
      const tip = spine[N - 1], fi = N - 2;
      m4.makeBasis(v.copy(tube.B[fi]).negate(), tube.N[fi], tube.T[fi]);
      head.quaternion.setFromRotationMatrix(m4);
      head.position.copy(spine[N - 2]).lerp(tip, 0.4);
      head.scale.setScalar(Math.max(0.001, shrink));
      head.rotateZ(lean * 0.3);
      for (const E of eyeStalks) {
        const s = E.s.update(stalks, dt);
        E.j.scale.set(1, Math.max(0.05, s), 1);
        E.j.rotation.set(0.35 + (1 - s) * 0.6, look * 0.3, -E.side * 0.35 + Math.sin(t * 2 + E.side) * 0.08);
        E.eye.scale.setScalar(Math.max(0.2, s));
        E.pupil.position.x = look * 0.004;
      }
      const mo = S.mouth.update(mouthOpen, dt);
      mouth.scale.setScalar(Math.max(0.001, mo * 1.1));
      mouth.visible = mo > 0.02;
      smile.visible = mo < 0.3 && hs.k < 0.5;
      for (const c of cheeks) c.visible = smile.visible;
      mouth.position.z = 0.045 + mo * 0.02;
      eyeWhite.color.set(C.eye).lerp(DULL, hs.k * 0.8);
      skin.emissive.set(DRINK).multiplyScalar(glow * 0.35);

      // ---- water: ripples round where it lies, bubbles as it sinks
      if ((rippleT -= dt) < 0) { rippleT = 1.2 + Math.random() * 1.5; ripple(spine[3].x, spine[3].z, 0.3 + sink * 0.3); }
      if (sink > 0.05 && sink < 0.99 && Math.random() < dt * 14) bubbles.emit({ pos: sp.at((Math.random() - 0.5) * 0.2, 0.02, -0.2 + (Math.random() - 0.5) * 0.2, v), vel: sp.dir(0, 0.15, 0), life: 0.6, size: (0.03 + Math.random() * 0.04) * sp.scale, grow: 1.4, color: '#9aa6d8', opacity: 0.8 });
      if (act.beaten && Math.random() < dt * 0.6) bubbles.emit({ pos: sp.at((Math.random() - 0.5) * 0.3, 0.02, -0.2 + (Math.random() - 0.5) * 0.3, v), vel: sp.dir(0, 0.08, 0), life: 0.8, size: 0.035 * sp.scale, grow: 1.5, color: '#9aa6d8', opacity: 0.6 });
      for (const r of ripples) {
        if (r.t < 0) continue;
        r.t += dt;
        const k = r.t / 1.3;
        if (k >= 1) { r.t = -1; r.m.visible = false; continue; }
        r.m.scale.setScalar(0.05 + k * r.size);
        r.m.material.opacity = (1 - k) * 0.35;
      }
      body.visible = sink < 0.995;
      head.visible = sink < 0.95;
      shadow.material.opacity = 0.3 * (1 - sink);
      bubbles.update(dt);
      drops.update(dt);
      heal.update(dt);
    },
  };
  return api;
}
const DULL = new THREE.Color('#77737e'), DRINK = new THREE.Color('#4a2a6a');
