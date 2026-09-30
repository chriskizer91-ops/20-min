import * as THREE from 'three';
import { joint, glowSprite, blobShadow, onLayer, Spring, INK } from './kit.js';
import {
  Hollow, HOLLOW_HEAD, hollowDressing, Actions, Motes, Tube, paintedFace, paint, texture, space, fxGroup, ss, bell, hold,
} from './foes-common.js';

// The Sour Wisp: Aethermoor's marsh-light ("a light over the black water, the size and colour of a lantern
// flame") drawn as a Follow Me Down Witch Way wisp (witch_game_assets/fx/wisp_128.png): a green teardrop flame
// with a pale heart, a face low on the bulb, a tip that twists up into a curl, embers lifting off it and
// diamond glints around it. This one is sour: grey at the edges and pouting (docs/LORE.md §7).
// Intents: Lure (Charmed), Flicker (Guarding), Cold Fire. Beaten, it hiccups, turns green again and drifts
// off, shy.

const R = 0.165; // the bulb
const ASH = new THREE.Color('#8c8a96'), ASH_INK = new THREE.Color('#2c2a33');

// A flame that shades itself in steps like the toon parts: a pale heart, green, a darker band, and an edge
// that can go grey (sour) or green (itself again). Its surface ripples upward like a flame; the outline ripples
// with it. It can go Hollowed like everything else.
const DISPLACE = /* glsl */ `
  uniform float time; uniform float ripple;
  vec3 flameDisplace(vec3 p, vec3 n) {
    float up = smoothstep(-0.03, 0.2, p.y);
    float a = atan(p.x, p.z);
    float w = sin(p.y * 34.0 - time * 7.5 + a * 3.0) * 0.55 + sin(p.y * 19.0 - time * 5.0 - a * 2.0) * 0.45;
    return p + n * w * ripple * up;
  }`;

function flameMaterial(H, u) {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, hollow: H.u.hollow, hollowHeal: H.u.heal, crackScale: { value: 9 } },
    transparent: true,
    vertexShader: /* glsl */ `
      ${DISPLACE}
      varying vec3 vN; varying vec3 vV; varying vec3 vHollowPos; varying vec3 vPos;
      void main() {
        vHollowPos = position; vPos = position;
        vec4 mv = modelViewMatrix * vec4(flameDisplace(position, normal), 1.0);
        vV = -mv.xyz; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 core; uniform vec3 mid; uniform vec3 deep; uniform vec3 edge; uniform float sour;
      uniform float opacity; uniform float flash; uniform float time; uniform float lift; uniform float hScale;
      varying vec3 vN; varying vec3 vV; varying vec3 vPos;
      ${HOLLOW_HEAD}
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float h = clamp(vPos.y * hScale + lift, 0.0, 1.0);
        float lick = sin(vPos.y * 40.0 - time * 7.0 + atan(vPos.x, vPos.z) * 2.0) * 0.04;
        float x = f + h * 0.3 + lick;
        vec3 c = core;
        c = mix(c, mid, step(0.2, x));
        c = mix(c, deep, step(0.52, x));
        c = mix(c, edge, step(0.72, f + lick) * sour + step(0.84, f) * (1.0 - sour));
        c = mix(c, vec3(1.0), flash);
        float hCrack = 0.0;
        if (hollow > 0.001) {
          hCrack = hollowCracks(vHollowPos * crackScale) * smoothstep(0.0, 0.5, hollow);
          float g = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(c, vec3(g * 0.75 + 0.1) * vec3(0.92, 0.92, 1.0), hollow);
          c = mix(c, vec3(0.08, 0.07, 0.1), hCrack * (1.0 - hollowHeal));
          c += vec3(0.8, 0.86, 1.0) * hCrack * hollowHeal * 1.5;
        }
        gl_FragColor = vec4(c, opacity * (1.0 - smoothstep(0.9, 1.0, f) * 0.4));
        #include <colorspace_fragment>
      }`,
  });
}

// A dark outline for the flame, like the ink around the toon parts but in the flame's own deep colour.
function flameInk(color, u) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, thickness: INK.uniforms.thickness, opacity: { value: 1 }, time: u.time, ripple: u.ripple },
    vertexShader: /* glsl */ `
      ${DISPLACE}
      uniform float thickness;
      void main() {
        vec4 mv = modelViewMatrix * vec4(flameDisplace(position, normal), 1.0);
        mv.xyz += normalize(normalMatrix * normal) * thickness;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `uniform vec3 color; uniform float opacity; void main() { gl_FragColor = vec4(color, opacity);
      #include <colorspace_fragment>
    }`,
    side: THREE.BackSide,
    transparent: true,
  });
}

// The face, painted per mood on a patch of the bulb.
function drawFace(g, W, H, mood) {
  // Painted at twice size, around the middle of the patch
  g.translate(W / 2, H / 2);
  g.scale(1.7, 1.7);
  g.translate(-W / 2, -H / 2 - 6);
  const ink = '#1b1030', cx = W / 2, ey = 86, dx = 36;
  const eye = (x, lid, look = 0, tilt = 1) => {
    // A dark oval with a glint; `lid` hides the top of it (sour, heavy-lidded), slanting down toward the nose
    g.save();
    g.beginPath();
    const s = Math.sign(x - cx) * tilt;
    g.moveTo(x - 20, ey - 16 + lid * 30 + s * lid * 8);
    g.lineTo(x + 20, ey - 16 + lid * 30 - s * lid * 8);
    g.lineTo(x + 20, ey + 30);
    g.lineTo(x - 20, ey + 30);
    g.clip();
    paint.ellipse(g, x + look, ey, 11, 15, ink);
    paint.ellipse(g, x + look - 3.5, ey - 6, 4, 4.5, '#ffffff');
    paint.ellipse(g, x + look + 4, ey + 6, 1.8, 1.8, 'rgba(255,255,255,0.8)');
    g.restore();
    if (lid > 0) paint.line(g, [[x - 14, ey - 16 + lid * 30 + s * lid * 7], [x + 14, ey - 16 + lid * 30 - s * lid * 7]], 4, ink);
  };
  const cheeks = (a = 0.4) => { paint.blush(g, cx - 58, ey + 26, 20, `rgba(255,150,175,${a})`); paint.blush(g, cx + 58, ey + 26, 20, `rgba(255,150,175,${a})`); };
  if (mood === 'hollow') {
    // Hollow-eyed: two empty dark hollows, no glint, and a flat little mouth
    for (const s of [-1, 1]) {
      const grad = g.createRadialGradient(cx + s * dx, ey, 2, cx + s * dx, ey, 17);
      grad.addColorStop(0, 'rgba(10,8,16,1)');
      grad.addColorStop(0.7, 'rgba(20,16,28,0.9)');
      grad.addColorStop(1, 'rgba(20,16,28,0)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(cx + s * dx, ey, 15, 19, 0, 0, Math.PI * 2); g.fill();
    }
    paint.line(g, [[cx - 8, ey + 44], [cx + 8, ey + 44]], 3, 'rgba(20,16,28,0.8)');
    return;
  }
  if (mood === 'pout' || mood === 'focus') {
    cheeks(mood === 'pout' ? 0.3 : 0.2);
    eye(cx - dx, mood === 'focus' ? 0.5 : 0.36);
    eye(cx + dx, mood === 'focus' ? 0.5 : 0.36);
    if (mood === 'pout') {
      // The pout: a small frown with the lower lip pushed out
      paint.curve(g, [cx - 11, ey + 44], [cx, ey + 34], [cx + 11, ey + 44], 4, ink);
      paint.ellipse(g, cx, ey + 45, 7, 4, 'rgba(210,120,150,0.85)');
    } else {
      // Blowing cold fire: a small round mouth
      paint.ellipse(g, cx, ey + 42, 7, 8, ink);
      paint.ellipse(g, cx, ey + 44, 4, 4, 'rgba(160,230,200,0.9)');
    }
  }
  if (mood === 'blink') {
    cheeks(0.3);
    for (const s of [-1, 1]) paint.curve(g, [cx + s * dx - 11, ey + 2], [cx + s * dx, ey + 8], [cx + s * dx + 11, ey + 2], 4, ink);
    paint.curve(g, [cx - 11, ey + 44], [cx, ey + 34], [cx + 11, ey + 44], 4, ink);
    paint.ellipse(g, cx, ey + 45, 7, 4, 'rgba(210,120,150,0.85)');
  }
  if (mood === 'sly') {
    // Lure: eyes slid to one side, one brow up, a little smile. Come along.
    cheeks(0.45);
    eye(cx - dx, 0.25, 6, -0.6);
    eye(cx + dx, 0.1, 6, -0.6);
    paint.curve(g, [cx + dx - 12, ey - 26], [cx + dx, ey - 34], [cx + dx + 12, ey - 28], 3.5, ink);
    paint.curve(g, [cx - 10, ey + 38], [cx + 2, ey + 46], [cx + 14, ey + 36], 4, ink);
  }
  if (mood === 'ouch') {
    for (const s of [-1, 1]) paint.line(g, [[cx + s * dx - 10 * s, ey - 10], [cx + s * dx + 8 * s, ey], [cx + s * dx - 10 * s, ey + 10]], 4.5, ink);
    paint.line(g, [[cx - 12, ey + 42], [cx - 6, ey + 38], [cx, ey + 42], [cx + 6, ey + 38], [cx + 12, ey + 42]], 3.5, ink);
  }
  if (mood === 'hic') {
    cheeks(0.5);
    for (const s of [-1, 1]) { paint.ellipse(g, cx + s * dx, ey, 10, 12, ink); paint.ellipse(g, cx + s * dx - 3, ey - 4, 3.5, 3.5, '#fff'); }
    paint.ellipse(g, cx, ey + 42, 5, 6, ink);
  }
  if (mood === 'shy') {
    // Itself again: eyes shut in happy arcs, a big blush, a small smile, looking down
    cheeks(0.75);
    for (const s of [-1, 1]) paint.curve(g, [cx + s * dx - 11, ey + 6], [cx + s * dx, ey - 5], [cx + s * dx + 11, ey + 6], 4, ink);
    paint.curve(g, [cx - 7, ey + 38], [cx, ey + 44], [cx + 7, ey + 38], 3.5, ink);
  }
}

export function createSourWisp(tint = '#8fe89a', { hollowed = false } = {}) {
  const root = new THREE.Group();
  root.name = 'sour-wisp';
  const H = new Hollow({ scale: 9 });
  const fx = fxGroup(root, 'sour-wisp');
  const sp = space(root);

  const green = new THREE.Color(tint);
  const col = {
    core: green.clone().lerp(new THREE.Color('#fbfff0'), 0.72),
    mid: green.clone().lerp(new THREE.Color('#e8ffe0'), 0.12),
    deep: green.clone().multiplyScalar(0.74),
    sour: new THREE.Color('#9aa29c'), // grey at the edges
    itself: green.clone().lerp(new THREE.Color('#2fd35a'), 0.6),
  };
  const U = {
    core: { value: col.core.clone() }, mid: { value: col.mid.clone() }, deep: { value: col.deep.clone() }, edge: { value: col.sour.clone() },
    sour: { value: 1 }, opacity: { value: 0.96 }, flash: { value: 0 }, time: { value: 0 }, lift: { value: 0 }, hScale: { value: 2.4 }, ripple: { value: 0.009 },
  };
  const flame = flameMaterial(H, U);
    const tailMat = flameMaterial(H, { ...U, lift: { value: -0.06 }, hScale: { value: 0 } });
  const inkGreen = col.deep.clone().multiplyScalar(0.32);
  const outline = flameInk(inkGreen, U);
  const withInk = (mesh) => { const o = new THREE.Mesh(mesh.geometry, outline); o.name = 'ink'; mesh.add(o); return mesh; };

  // ---------------------------------------------------------------- the flame
  const float = joint(root, [0, 0.5, 0], 'float');
  const sway = joint(float, [0, 0, 0], 'sway');
  // A teardrop: the lower half a true sphere (so the face sits on it), drawing up into a point
  const prof = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2 + 0.25); prof.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)); }
  for (const [x, y] of [[0.148, 0.09], [0.126, 0.135], [0.1, 0.175], [0.074, 0.21], [0.052, 0.242], [0.032, 0.272], [0.012, 0.295]]) prof.push(new THREE.Vector2(x, y));
  prof[0].x = 0.001;
  const bodyGeo = new THREE.LatheGeometry(prof, 22);
  const body = withInk(new THREE.Mesh(bodyGeo, flame));
  sway.add(body);

  // The tip twists up and over into a curl; its spine is rebuilt every frame from springs
  const tail = new Tube(12, 7);
  const tailMesh = withInk(new THREE.Mesh(tail.geometry, tailMat));
  tailMesh.frustumCulled = false;
  sway.add(tailMesh);
  const spine = Array.from({ length: 12 }, () => new THREE.Vector3());
  const tailS = { x: new Spring(30, 5), z: new Spring(30, 5) };

  // The face, low on the bulb
  const face = paintedFace(H, { radius: R * 1.012, width: 1.5, height: 1.15, moods: ['pout', 'blink', 'focus', 'sly', 'ouch', 'hic', 'shy', 'hollow'], draw: drawFace, lit: false });
  const facePivot = joint(sway, [0, 0, 0], 'face');
  facePivot.add(face.mesh);
  face.mesh.rotation.x = 0.12;

  // Light: a halo, a light on its surroundings, a pool of green on the ground
  const glow = glowSprite(tint, 1.3, 0.5);
  sway.add(glow);
  const light = new THREE.PointLight(tint, 2.2, 4, 2);
  float.add(light);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: texture('dot'), color: tint, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.01;
  root.add(pool);
  const shadow = blobShadow(0.16, 0.25);
  root.add(shadow);

  // Diamond glints that circle it
  const glints = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture('sparkle'), color: col.core, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    float.add(s);
    glints.push({ s, a: (i / 4) * Math.PI * 2, r: 0.24 + (i % 2) * 0.06, y: 0.05 + i * 0.07, sp: 0.6 + i * 0.13 });
  }

  onLayer(root);

  // World-space effects: cold fire, charm hearts, sour smoke, hiccup puffs
  const sparks = new Motes(fx, { count: 26, map: texture('sparkle') });
  const hearts = new Motes(fx, { count: 8, map: texture('heart') });
  const smoke = new Motes(fx, { count: 10, map: texture('puff'), blending: THREE.NormalBlending });
  const dressing = hollowDressing({ root, fx, sp, radius: 0.35, body: () => [(Math.random() - 0.5) * 0.2, 0.5 + Math.random() * 0.2, (Math.random() - 0.5) * 0.2] });

  // ---------------------------------------------------------------- moves
  const act = new Actions({
    attack: [0.95, 0.5], // Cold Fire: darts in and touches you with a fire that gives no heat
    cast: [1.5, 0.6], // Lure: bobs away, beckoning with its curl, and you want very much to follow
    flicker: [1.1, 0.5], // Flicker: gutters out and lights again a step away (Guarding)
    hurt: [0.5, 0.2],
    ko: [3.2, 0.9], // hiccups, turns green again, drifts off shy
    hollowed: [0.8, 0.5],
    moonlit: [1.7, 0.4],
  }, { 'cold-fire': 'attack', lure: 'cast', guard: 'flicker' });

  let t = Math.random() * 10, blinkT = 2, look = 0, lookTarget = 0, nextLook = 1.5, huff = 0, nextHuff = 4 + Math.random() * 4;
  let smokeT = 0, emberT = 0, gone = false;
  const bob = new Spring(25, 5);
  const v = new THREE.Vector3();
  if (hollowed) H.set(true, { instant: true });

  const api = {
    root, fx, name: 'Sour Wisp', height: 0.9, radius: 0.25, center: 0.52,
    moves: ['attack', 'cast', 'flicker', 'hurt', 'ko', 'hollowed', 'moonlit'],
    // Which move shows each of its intents (Aethermoor move ids)
    intents: { 'cold-fire': 'attack', lure: 'cast', flicker: 'flicker' },
    get busy() { return act.busy; },
    get hollowed() { return H.on; },
    setHollowed(on, opts) { H.set(on, opts); },
    play(name, onHit, opts) {
      if (name === 'hollowed') H.set(true);
      if (name === 'moonlit') H.set(false);
      const a = act.play(name, onHit, opts);
      if (a) { gone = false; float.visible = true; }
    },
    update(dt) {
      t += dt;
      fx.userData.adopt();
      U.time.value = t;
      const hs = H.update(dt);
      dressing.update(dt, hs);

      // Idle: bob, drift a little figure-eight, flicker, glance about, blink, and now and then a sour huff
      let y = 0.5 + bob.update(Math.sin(t * 2.1) * 0.05, dt);
      let x = Math.sin(t * 0.7) * 0.04, z = Math.sin(t * 1.4) * 0.03;
      let sx = 1, sy = 1, lean = Math.sin(t * 1.3) * 0.08, tilt = Math.cos(t * 0.9) * 0.06;
      let mood = hs.k > 0.5 ? 'hollow' : 'pout';
      let curl = 0, flash = 0, glowK = 1, opacity = 0.96, spin = 0;
      const flick = 1 + Math.sin(t * 13) * 0.025 + Math.sin(t * 7.3) * 0.02;
      sx *= flick; sy /= flick;
      if ((nextLook -= dt) < 0) { lookTarget = (Math.random() - 0.5) * 0.5; nextLook = 1.2 + Math.random() * 2.5; }
      look += (lookTarget - look) * (1 - Math.exp(-dt * 6));
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3;
      if (blinkT < 0.12 && mood === 'pout') mood = 'blink';
      if (!act.busy && !act.beaten && (nextHuff -= dt) < 0) { huff = 0.6; nextHuff = 5 + Math.random() * 5; }
      if (huff > 0) {
        // Hmph: a quick puff up, a little grey smoke off the top
        huff -= dt;
        const h = bell(1 - huff / 0.6);
        sy *= 1 + h * 0.12; sx *= 1 - h * 0.05;
        if (huff < 0.35 && huff + dt >= 0.35 && hs.k < 0.5) for (let i = 0; i < 3; i++) smoke.emit({ pos: sp.at(x, y + 0.3, z, v), vel: sp.dir((Math.random() - 0.5) * 0.12, 0.25, 0), life: 1.2, size: 0.1 * sp.scale, grow: 2.2, color: '#7b8480', opacity: 0.5, wobble: 0.02 });
      }
      // Sour smoke curling off its grey edges
      if (U.sour.value > 0.5 && hs.k < 0.5 && !gone && (smokeT -= dt) < 0) {
        smokeT = 0.5 + Math.random() * 0.5;
        const a = Math.random() * Math.PI * 2;
        smoke.emit({ pos: sp.at(x + Math.cos(a) * R * 0.9, y + 0.08 + Math.random() * 0.1, z + Math.sin(a) * R * 0.9, v), vel: sp.dir(Math.cos(a) * 0.04, 0.16, Math.sin(a) * 0.04), life: 1.6, size: 0.07 * sp.scale, grow: 2.4, color: '#8d948f', opacity: 0.32, wobble: 0.015 });
      }

      const a = act.step(dt);
      if (a) {
        const k = a.k;
        switch (a.name) {
          case 'attack': {
            // Wind back, dart in stretched long, touch, and a burst of cold fire; then home
            const back = hold(k, 0, 0.25, 0.3, 0.4);
            const out = hold(k, 0.3, 0.48, 0.6, 1);
            z += -back * 0.15 + out * (a.opts.reach ?? 0.75);
            y += out * 0.05;
            lean = -back * 0.3 + out * 0.5;
            sx *= 1 - out * 0.15; sy *= 1 + back * 0.1 - out * 0.1;
            mood = hs.k > 0.5 ? 'hollow' : 'focus';
            curl = out * 0.8;
            flash = hold(k, 0.46, 0.5, 0.52, 0.62) * 0.5;
            if (a.hit && !a.burst) {
              a.burst = true;
              const s = sp.scale;
              for (let i = 0; i < 16; i++) {
                const ang = Math.random() * Math.PI * 2;
                sparks.emit({ pos: sp.at(x, y, z + R, v), vel: sp.dir(Math.cos(ang) * 0.6, Math.sin(ang) * 0.6 + 0.2, 0.5 + Math.random() * 0.5), life: 0.5 + Math.random() * 0.4, size: (0.06 + Math.random() * 0.07) * s, grow: 0.4, color: i % 2 ? '#bff8ff' : col.core, drag: 3, spin: 4 });
              }
            }
            break;
          }
          case 'cast': {
            // Lure: drift back and to one side, bobbing, curl beckoning, brighter; hearts float to you
            const away = hold(k, 0, 0.3, 0.8, 1);
            z -= away * 0.35;
            x += away * 0.2;
            y += Math.sin(k * Math.PI * 4) * 0.06 * away;
            curl = Math.sin(k * Math.PI * 6) * 0.9 * away;
            lean = -0.15 * away;
            mood = hs.k > 0.5 ? 'hollow' : 'sly';
            glowK = 1 + away * 0.8 + Math.sin(k * 30) * 0.1 * away;
            if (k > 0.25 && k < 0.75 && Math.random() < dt * 10) {
              const s = sp.scale;
              hearts.emit({ pos: sp.at(x + (Math.random() - 0.5) * 0.2, y + 0.1, z + 0.1, v), vel: sp.dir((Math.random() - 0.5) * 0.15, 0.1, 0.8), life: 1.1, size: 0.09 * s, grow: 1.3, color: Math.random() < 0.5 ? col.core : '#b7ffc4', wobble: 0.03 * s });
            }
            break;
          }
          case 'flicker': {
            // Gutter down to an ember, go out, pop alight a step away, drift back
            const out = ss(k, 0, 0.3);
            const lit = ss(k, 0.42, 0.5);
            const size = k < 0.4 ? 1 - out * 0.85 : lit * (1 + bell(ss(k, 0.42, 0.62)) * 0.25);
            sx *= Math.max(0.01, size); sy *= Math.max(0.01, size * (k < 0.4 ? 0.9 : 1));
            x += (k < 0.42 ? 0 : 0.42) * (1 - ss(k, 0.62, 1));
            glowK = Math.max(0.05, size);
            if (k < 0.4 && Math.random() < dt * 18) sparks.emit({ pos: sp.at(x, y + 0.05, z, v), vel: sp.dir((Math.random() - 0.5) * 0.3, 0.3, (Math.random() - 0.5) * 0.3), life: 0.4, size: 0.04 * sp.scale, color: col.core, drag: 2 });
            if (a.hit && !a.burst) {
              a.burst = true;
              for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2;
                sparks.emit({ pos: sp.at(x + Math.cos(ang) * 0.3, y + 0.05, z + Math.sin(ang) * 0.3, v), vel: sp.dir(-Math.sin(ang) * 0.5, 0.15, Math.cos(ang) * 0.5), life: 0.8, size: 0.07 * sp.scale, color: '#e6fff0', drag: 1, spin: 3 });
              }
            }
            break;
          }
          case 'hurt': {
            const b = bell(k);
            z -= b * 0.22;
            sx *= 1 + b * 0.18; sy *= 1 - b * 0.2;
            lean = -b * 0.4;
            flash = b * 0.7 * (1 - k);
            mood = hs.k > 0.5 ? 'hollow' : 'ouch';
            curl = Math.sin(k * 30) * 0.4 * b;
            break;
          }
          case 'ko': {
            // Three hiccups; each one it greens a little more. Then it goes shy and drifts away.
            let hic = 0;
            for (const at of [0.06, 0.2, 0.34]) hic = Math.max(hic, hold(k, at, at + 0.02, at + 0.04, at + 0.09));
            y += hic * 0.1;
            sy *= 1 + hic * 0.25; sx *= 1 - hic * 0.12;
            mood = k < 0.42 ? (hic > 0.3 ? 'hic' : 'pout') : 'shy';
            if (hs.k > 0.5) mood = 'hollow';
            for (const at of [0.06, 0.2, 0.34]) if (k >= at && !a['h' + at]) {
              a['h' + at] = true;
              for (let i = 0; i < 4; i++) smoke.emit({ pos: sp.at(x, y + 0.28, z, v), vel: sp.dir((Math.random() - 0.5) * 0.3, 0.35, 0.1), life: 0.9, size: 0.08 * sp.scale, grow: 2, color: i < 2 ? '#9aa39d' : '#b9ffc6', opacity: 0.55 });
              sparks.emit({ pos: sp.at(x, y + 0.2, z + 0.1, v), vel: sp.dir(0, 0.4, 0.2), life: 0.5, size: 0.1 * sp.scale, color: '#d8ffe0' });
            }
            U.sour.value = 1 - ss(k, 0.05, 0.45);
            const off = ss(k, 0.5, 1);
            y += off * 1.3 + Math.sin(k * 20) * 0.03 * off;
            x -= off * 0.7;
            z -= off * 0.5;
            spin = -off * 1.6;
            look = -0.35 * ss(k, 0.42, 0.5);
            lean = 0.25 * ss(k, 0.42, 0.55); // head down, shy
            sx *= 1 - off * 0.5; sy *= 1 - off * 0.5;
            opacity = 0.96 * (1 - ss(k, 0.75, 1));
            glowK = 1 - off;
            break;
          }
          case 'hollowed': y -= bell(k) * 0.08; sy *= 1 - bell(k) * 0.08; break;
          case 'moonlit': {
            // Moonlight breaks the omen: it lifts, blinks and brightens
            const b = bell(k);
            y += b * 0.08;
            flash = hold(k, 0.15, 0.25, 0.3, 0.6) * 0.5;
            break;
          }
        }
        if (act.done() && a.name === 'ko') gone = true;
      }
      if (act.beaten || gone) {
        // Drifted off: nothing left here
        float.visible = false;
        pool.visible = shadow.visible = false;
        light.intensity = 0;
      } else {
        float.visible = pool.visible = shadow.visible = true;
        if (!a || a.name !== 'ko') U.sour.value += (1 - U.sour.value) * (1 - Math.exp(-dt * 2));
      }

      float.position.set(x, y, z);
      float.rotation.y = spin;
      sway.rotation.set(lean, 0, tilt);
      sway.scale.set(sx, sy, sx);
      facePivot.rotation.y = look;
      face.show(mood);
      U.flash.value = flash;
      U.opacity.value = opacity;
      U.edge.value.copy(col.itself).lerp(col.sour, U.sour.value);
      outline.uniforms.opacity.value = opacity;
      outline.uniforms.color.value.copy(inkGreen).lerp(ASH_INK, hs.k);
      face.mesh.material.opacity = opacity;
      shadow.position.set(x, 0.005, z);
      pool.position.set(x, 0.01, z);
      shadow.material.opacity = 0.25 * (1 - (y - 0.5) * 0.8);

      // Glow, light and glints, greyed when Hollowed
      const greyed = hs.k;
      glow.material.opacity = 0.5 * glowK * flick * (1 - greyed * 0.6) * opacity;
      glow.material.color.set(tint).lerp(ASH, greyed);
      glow.scale.setScalar(1.3 * (0.8 + glowK * 0.2));
      if (!act.beaten && !gone) light.intensity = 2.2 * glowK * flick * (1 - greyed * 0.7);
      light.color.set(tint).lerp(ASH, greyed);
      pool.material.opacity = 0.22 * glowK * (1 - greyed) * opacity;
      for (const gl of glints) {
        gl.a += dt * gl.sp;
        gl.s.position.set(Math.cos(gl.a) * gl.r, gl.y + Math.sin(t * 2 + gl.a) * 0.04, Math.sin(gl.a) * gl.r);
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + gl.a * 3);
        gl.s.scale.setScalar(0.05 + tw * 0.05);
        gl.s.material.opacity = (0.4 + tw * 0.6) * (1 - greyed) * glowK * opacity;
      }

      // The curl: up from the tip, bending over, lagging behind as it moves
      const lagX = tailS.x.update(-x * 2 + Math.sin(t * 1.7) * 0.25, dt);
      const lagZ = tailS.z.update(-z * 2 + Math.cos(t * 1.3) * 0.2, dt);
      const base = 0.17;
      let px = 0, py = base, pz = 0;
      for (let i = 0; i < 12; i++) {
        const tt = i / 11;
        spine[i].set(px, py, pz);
        // Leans one way, then twists over the other into a curl (the Witch Way wisp's tip)
        const ang = -0.22 + 0.7 * tt + 2.5 * tt * tt + curl * 1.2 * tt + Math.sin(t * 2.6 - tt * 3) * 0.18 * tt;
        const step = 0.036 * (1 - tt * 0.4);
        px += Math.sin(ang) * step + lagX * 0.012 * tt;
        py += Math.cos(ang) * step;
        pz += lagZ * 0.012 * tt + Math.sin(t * 2.3 + i * 0.4) * 0.004;
      }
      tail.update(spine, (tt) => 0.064 * Math.pow(1 - tt, 1.5) + 0.004);
      // Embers lift off the tip and fade
      if (!gone && !act.beaten && (emberT -= dt) < 0) {
        emberT = 0.18 + Math.random() * 0.25;
        const e = spine[4 + Math.floor(Math.random() * 5)];
        v.copy(e).applyMatrix4(sway.matrixWorld);
        sparks.emit({ pos: v, vel: sp.dir((Math.random() - 0.5) * 0.08, 0.22 + Math.random() * 0.12, (Math.random() - 0.5) * 0.08), life: 0.9 + Math.random() * 0.5, size: (0.035 + Math.random() * 0.03) * sp.scale, grow: 0.3, color: hs.k > 0.5 ? '#a9a6b0' : Math.random() < 0.6 ? col.mid : col.core, opacity: 0.9, wobble: 0.015 * sp.scale });
      }
      sparks.update(dt);
      hearts.update(dt);
      smoke.update(dt);
    },
  };
  return api;
}
