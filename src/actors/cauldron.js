import * as THREE from 'three';
import { toon, part, joint, cyl, lathe, badge, crescentShape, starShape, blobShadow, onLayer, Spring, glowSprite, glowTexture } from './kit.js';
import { Particles, sparkSprite, twinkleTexture, canvasTexture, merge, ss, win, arch, lerp } from './party-kit.js';
import { fx as fxArt } from '../assets.js';
import { LAYER_ACTORS } from '../layers.js';
import { LAYER_GLOW } from '../stage.js';

// The witch's cauldron, for brewing ("Pick Your Poison", docs/SLICE.md §5): a round-bellied iron pot on three stubby
// legs, with a thick lip, an iron band round its belly, a gold crescent on the front (the witch's own sign) and a
// bail to hang it by. Built in code from kit.js's toon parts and ink outlines, like the witch.
//
// It has a life of its own:
//   - Witchfire burns violet under it on bare stone (art/fx/witchfire.webp, the flame in her hand): "Witchfire burns
//     nothing that belongs." setFire(0..1) damps it to embers or lights it with a whoosh.
//   - The water swirls and bubbles, and its colour eases toward whatever setColor() asks: moonwater's blue, then each
//     herb's virtue as it goes in. Steam curls up, tinted by the brew.
//   - Herbs dropped in (dropHerb, with the herb's icon) fall, splash and float, turning on the surface; stirring
//     speeds them round, and the blessing dissolves them.
// Moves (play): talk (it burbles and rocks, as if answering back), drop (a splash), pour (a bottle of moonwater tips
// over it), stir (the water whirls), bless (a witchfire flash into the pot), good (sparkles, a glow and a column of
// light: a good brew), dud (a comic puff and plop: the pot jumps, a fat bubble swells and bursts, a cloud rolls out).
// Idle: the water swirls, a bubble now and then, steam, the flames flicker, and a boiling pot rattles on its legs.
//
//   createCauldron() -> { root, height, radius, moves, play(name, onHit), update(dt), setFire(k), setWater(on),
//                         setColor(hex, instant), dropHerb(iconUrl), takeHerb(index), clearHerbs(), bail, liquid }

const C = {
  iron: '#211c26', ironLight: '#332b3a', band: '#16121a', gold: '#e2bd67', legs: '#1c1820', ash: '#5a4a52',
};
const RIM_Y = 0.74, RIM_R = 0.37, BELLY_R = 0.46, WATER_Y = 0.69, DRY_Y = 0.2;

export function createCauldron() {
  const root = new THREE.Group();
  root.name = 'cauldron';
  const body = joint(root, [0, 0, 0], 'body');
  const pot = joint(body, [0, 0, 0], 'pot');

  // ---------------------------------------------------------------- the iron pot
  const iron = toon(C.iron, { side: THREE.DoubleSide, rim: 0.7 });
  const profile = [[0.001, 0.09], [0.16, 0.095], [0.3, 0.13], [0.4, 0.2], [0.45, 0.3], [BELLY_R, 0.4], [0.445, 0.5], [0.41, 0.6], [0.37, 0.67], [0.355, 0.71], [RIM_R, RIM_Y]];
  part(pot, lathe(profile, 28), iron);
  part(pot, new THREE.TorusGeometry(RIM_R + 0.005, 0.035, 8, 32), toon(C.ironLight), { pos: [0, RIM_Y, 0], rot: [Math.PI / 2, 0, 0] });
  part(pot, new THREE.TorusGeometry(BELLY_R + 0.004, 0.02, 6, 32), toon(C.band), { pos: [0, 0.42, 0], rot: [Math.PI / 2, 0, 0] });
  // rivets round the band, and the witch's crescent (with a little star) on the front
  part(pot, merge(Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    return new THREE.SphereGeometry(0.013, 6, 4).translate(Math.cos(a) * (BELLY_R + 0.022), 0.42, Math.sin(a) * (BELLY_R + 0.022));
  })), toon(C.ironLight), { ink: false });
  part(pot, badge(crescentShape(0.075, 0.8, 0.45), 0.012), toon(C.gold, { emissive: new THREE.Color('#5a3a10'), emissiveIntensity: 0.4 }), { pos: [-0.012, 0.52, 0.425], rot: [-0.25, 0, 0.5], ink: false });
  part(pot, badge(starShape(0.026), 0.01), toon(C.gold, { emissive: new THREE.Color('#5a3a10'), emissiveIntensity: 0.4 }), { pos: [0.05, 0.575, 0.405], rot: [-0.35, 0, 0], ink: false });
  // two lugs at the lip, and the bail that hangs from them
  part(pot, merge([-1, 1].map((s) => new THREE.TorusGeometry(0.045, 0.012, 6, 12).translate(s * (RIM_R + 0.03), RIM_Y - 0.06, 0))), toon(C.ironLight));
  const bail = part(pot, new THREE.TorusGeometry(RIM_R + 0.03, 0.013, 6, 24, Math.PI), toon(C.ironLight), { pos: [0, RIM_Y - 0.06, 0] });
  bail.name = 'bail';
  bail.rotation.x = -1.42; // off its hook, the bail lies back against the far side of the rim
  const bailRest = bail.rotation.x;
  // three stubby legs
  part(pot, merge([0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    return new THREE.CylinderGeometry(0.035, 0.022, 0.12, 6).translate(Math.cos(a) * 0.25, 0.06, Math.sin(a) * 0.25);
  })), toon(C.legs));
  const shadow = blobShadow(0.62, 0.55);
  root.add(shadow);

  // ---------------------------------------------------------------- the water
  const liquidUniforms = {
    colA: { value: new THREE.Color('#8fb8ff') }, colB: { value: new THREE.Color('#e6f0ff') }, spark: { value: new THREE.Color('#ffffff') },
    time: { value: 0 }, swirl: { value: 0 }, glow: { value: 0 }, murk: { value: 0 },
  };
  const liquidMat = new THREE.ShaderMaterial({
    uniforms: liquidUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xz / ${(0.36).toFixed(2)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 colA; uniform vec3 colB; uniform vec3 spark; uniform float time; uniform float swirl; uniform float glow; uniform float murk;
      varying vec2 vP;
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);
        float t = time * (0.5 + swirl * 3.5);
        float bands = sin(a * 2.0 - r * 8.0 + t * 1.6) * 0.5 + 0.5;
        float fine = sin(a * 5.0 + r * 14.0 - t * 2.3) * 0.5 + 0.5;
        float ripple = sin(r * 26.0 - time * 3.0) * 0.5 + 0.5;
        vec3 c = mix(colA, colB, bands * 0.45 + fine * 0.15 + ripple * 0.08);
        c = mix(c, colA * 0.45, murk * fine);
        c *= mix(1.2, 0.62, smoothstep(0.25, 1.0, r));
        c += spark * glow * (1.0 - r * 0.7);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  // A shallow dome, so the surface shows from a low camera and heaves when it boils
  const liquidGeo = new THREE.SphereGeometry(1, 28, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  liquidGeo.scale(0.355, 0.04, 0.355);
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  liquid.name = 'liquid';
  liquid.position.y = DRY_Y;
  liquid.visible = false;
  pot.add(liquid);
  const surfaceGlow = glowSprite('#8fb8ff', 1.3, 0);
  surfaceGlow.position.y = WATER_Y + 0.08;
  pot.add(surfaceGlow);

  // ---------------------------------------------------------------- witchfire underneath
  const fireTex = new THREE.TextureLoader().load(fxArt.witchfire);
  fireTex.colorSpace = THREE.SRGBColorSpace;
  fireTex.repeat.set(1 / 8, 1);
  const fireTex2 = fireTex.clone();
  fireTex2.repeat.set(1 / 8, 1);
  const flames = [];
  const fire = joint(root, [0, 0, 0], 'fire');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const r = i === 6 ? 0 : 0.3 + (i % 2) * 0.06;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? fireTex2 : fireTex, depthWrite: false, transparent: true }));
    s.center.set(0.5, 0.12);
    s.position.set(Math.cos(a) * r, 0.0, Math.sin(a) * r);
    fire.add(s);
    flames.push({ s, size: i === 6 ? 0.34 : 0.22 + (i % 3) * 0.04, phase: i * 1.7 });
  }
  const fireLight = new THREE.PointLight('#b86bff', 0, 2.2, 2);
  fireLight.position.set(0, 0.03, 0.05);
  root.add(fireLight);
  // the brew's own light, in its colour, up over the rim: it lights her face from below as the colour changes
  const brewLight = new THREE.PointLight('#8fb8ff', 0, 2.5, 2);
  brewLight.position.set(0, RIM_Y + 0.3, -0.1);
  pot.add(brewLight);
  const fireGlow = glowSprite('#a85cff', 1.6, 0, LAYER_GLOW);
  fireGlow.position.set(0, 0.12, 0.15);
  fireGlow.material.depthTest = false;
  root.add(fireGlow);

  // ---------------------------------------------------------------- herbs afloat
  const floaters = [];
  const floatGroup = joint(pot, [0, 0, 0], 'floaters');
  const loader = new THREE.TextureLoader();
  const iconCache = new Map();
  const iconTex = (url) => {
    if (!iconCache.has(url)) {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      iconCache.set(url, t);
    }
    return iconCache.get(url);
  };

  // ---------------------------------------------------------------- the pour: a bottle of moonwater and its stream
  const bottle = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  bottle.scale.set(0.3, 0.3, 1);
  bottle.visible = false;
  root.add(bottle);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 1, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: '#bcd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  stream.visible = false;
  root.add(stream);

  // ---------------------------------------------------------------- particles: bubbles, steam, splashes, sparkles, puffs
  const fxGroup = joint(root, [0, 0, 0], 'cauldron-fx');
  const bubbleTex = canvasTexture(64, 64, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 5;
    g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(24, 23, 5, 0, Math.PI * 2); g.fill();
  }, { wrap: false });
  const puffTex = canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(30, 28, 2, 32, 32, 31);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }, { wrap: false });
  const soft = glowTexture();
  const bubbles = new Particles(fxGroup, 16, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false })));
  const steam = new Particles(fxGroup, 18, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false, opacity: 0.4 })));
  const drops = new Particles(fxGroup, 18, () => sparkSprite('#cfe2ff'));
  const sparkles = new Particles(fxGroup, 28, () => sparkSprite('#fff4c0', twinkleTexture()));
  const puffs = new Particles(fxGroup, 14, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })));
  const flare = glowSprite('#ffffff', 2.4, 0, LAYER_GLOW);
  flare.material.depthTest = false;
  flare.position.y = RIM_Y + 0.25;
  root.add(flare);
  const column = glowSprite('#ffffff', 1, 0, LAYER_GLOW);
  column.name = 'column';
  column.material.depthTest = false;
  column.center.set(0.5, 0.05);
  column.position.y = RIM_Y;
  root.add(column);
  // the dud's big comic bubble
  const plop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshToonMaterial({ color: '#7d9a3a', transparent: true, opacity: 0.85 }));
  plop.name = 'plop';
  plop.visible = false;
  pot.add(plop);

  onLayer(root);
  // glows that should bloom over everything stay on their own layer
  for (const g of [fireGlow, flare, column]) g.layers.set(LAYER_GLOW);

  // ---------------------------------------------------------------- state
  const S = { hop: new Spring(90, 9), rock: new Spring(40, 5), squash: new Spring(120, 10) };
  const colour = new THREE.Color('#8fb8ff'), target = new THREE.Color('#8fb8ff'), light = new THREE.Color(), steamCol = new THREE.Color();
  let time = 0, fireK = 0, fireWant = 0, water = false, level = DRY_Y, action = null, bubbleWait = 0.5, steamWait = 0.2;
  let swirl = 0, glow = 0, murk = 0, boil = 0;
  const ACTIONS = { talk: 1.0, drop: 0.9, pour: 1.5, stir: 2.2, bless: 1.1, good: 1.8, dud: 1.8 };
  const v = new THREE.Vector3();
  const surface = () => level + 0.035;
  const onSurface = (r = 0.25) => { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r; return v.set(Math.cos(a) * d, surface(), Math.sin(a) * d).clone(); };
  const toRoot = (p) => p.multiply(body.scale).add(body.position);

  function spawnBubble(big = false) {
    if (!water) return;
    const p = onSurface(0.28);
    bubbles.spawn(toRoot(p), { vel: [0, 0.05, 0], life: big ? 0.9 : 0.45 + Math.random() * 0.4, size: big ? 0.09 : 0.035 + Math.random() * 0.035, grow: 0.9, color: `#${light.getHexString()}`, opacity: 0.9 });
  }
  function spawnSteam(n = 1, strong = 0) {
    for (let i = 0; i < n; i++) {
      const p = onSurface(0.22);
      p.y += 0.05;
      steam.spawn(toRoot(p), {
        vel: [(Math.random() - 0.5) * 0.08, 0.28 + Math.random() * 0.2 + strong * 0.3, (Math.random() - 0.5) * 0.05],
        life: 1.8 + Math.random() * 1.2, size: 0.18 + strong * 0.12, grow: 1.9, drag: 0.4, color: `#${steamCol.getHexString()}`, opacity: 0.28 + strong * 0.2,
      });
    }
  }
  function splash(n, color = '#cfe2ff', speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      drops.spawn(toRoot(onSurface(0.12)), {
        vel: [Math.cos(a) * 0.5 * speed, (0.9 + Math.random() * 0.6) * speed, Math.sin(a) * 0.5 * speed], gravity: 3.2, life: 0.55, size: 0.07, color, opacity: 0.95,
      });
    }
  }

  const api = {
    root, pot, body, bail, liquid, fire, fx: null,
    height: 1.0, radius: BELLY_R,
    get busy() { return !!action; },
    get water() { return water; },
    get colour() { return `#${target.getHexString()}`; },
    get fireLevel() { return fireK; },
    get herbs() { return floaters.length; },
    moves: Object.keys(ACTIONS),
    play(name, onHit) {
      if (!ACTIONS[name]) return;
      action = { name, t: 0, dur: ACTIONS[name], onHit, hit: false };
      if (name === 'pour') {
        bottle.material.map = api.moonwaterIcon ? iconTex(api.moonwaterIcon) : null;
        bottle.material.needsUpdate = true;
      }
    },
    // 0 is cold iron and a few embers; 1 is witchfire, lit. It eases there.
    setFire(k, instant = false) { fireWant = k; if (instant) fireK = k; },
    setWater(on, instant = false) {
      water = on;
      liquid.visible = true;
      if (instant) level = on ? WATER_Y : DRY_Y;
      if (!on && instant) liquid.visible = false;
    },
    setColor(hex, instant = false) {
      if (!hex) return;
      target.set(hex);
      if (instant) colour.copy(target);
    },
    // A murky swirl through the water (a wrong mix brewing)
    setMurk(k) { murk = k; },
    dropHerb(url) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(url), transparent: true, depthWrite: false }));
      s.layers.set(LAYER_ACTORS);
      s.scale.setScalar(0.3);
      floatGroup.add(s);
      const slot = floaters.length;
      const f = { s, t: 0, a: slot * 2.1 + Math.random() * 0.6, r: 0.13 + (slot % 2) * 0.07, spin: 0.35 + Math.random() * 0.2, fall: 1, gone: 0 };
      s.position.set(Math.cos(f.a) * f.r, RIM_Y + 0.75, Math.sin(f.a) * f.r);
      floaters.push(f);
      api.play('drop');
      return f;
    },
    takeHerb(index) {
      const f = floaters[index];
      if (!f) return;
      floaters.splice(index, 1);
      f.lift = 1;
      lifted.push(f);
    },
    clearHerbs() { for (const f of floaters) f.gone = f.gone || 0.001; },
    update(dt) {
      time += dt;
      liquidUniforms.time.value = time;
      // ---- the fire eases toward what it's asked, and flickers
      fireK += (fireWant - fireK) * (1 - Math.exp(-dt * (fireWant > fireK ? 3 : 1.5)));
      const frame = Math.floor(time * 12) % 8;
      fireTex.offset.x = frame / 8;
      fireTex2.offset.x = ((frame + 3) % 8) / 8;
      for (const f of flames) {
        const k = fireK * (0.85 + Math.sin(time * 7 + f.phase) * 0.1 + Math.sin(time * 13.7 + f.phase * 2) * 0.06);
        f.s.visible = k > 0.03;
        const s = f.size * Math.max(0.05, k) * (1 + boil * 0.25);
        f.s.scale.set(s, s * (341 / 128), 1);
        f.s.material.opacity = Math.min(1, k * 1.4);
      }
      fireLight.intensity = fireK * (0.7 + Math.sin(time * 17) * 0.1 + Math.sin(time * 29) * 0.08);
      fireGlow.material.opacity = 0.18 + fireK * 0.3;

      // ---- the water rises or drains, and its colour eases toward the target
      const want = water ? WATER_Y : DRY_Y;
      level += (want - level) * (1 - Math.exp(-dt * 2.2));
      liquid.visible = water || level > DRY_Y + 0.02;
      liquid.position.y = level;
      boil = water ? fireK : 0;
      liquid.scale.set(1, 1 + boil * 0.5 * (0.6 + Math.sin(time * 5.1) * 0.4), 1);
      colour.lerp(target, 1 - Math.exp(-dt * 2.5));
      light.copy(colour).lerp(new THREE.Color('#ffffff'), 0.45);
      steamCol.copy(colour).lerp(new THREE.Color('#d6bcff'), 0.6); // violet steam, tinted by the brew
      liquidUniforms.colA.value.copy(colour);
      liquidUniforms.colB.value.copy(light);
      liquidUniforms.swirl.value = swirl;
      liquidUniforms.glow.value = glow;
      liquidUniforms.murk.value += (murk - liquidUniforms.murk.value) * (1 - Math.exp(-dt * 2));
      surfaceGlow.material.color.copy(colour);
      brewLight.color.copy(light);
      brewLight.intensity = water ? 0.35 + boil * 0.25 + glow * 1.2 : 0;
      surfaceGlow.material.opacity = water ? 0.12 + boil * 0.1 + glow * 0.5 : 0;
      surfaceGlow.position.y = level + 0.1;
      swirl = Math.max(0, swirl - dt * 0.6);
      glow = Math.max(0, glow - dt * 0.35);

      // ---- bubbles and steam while it boils
      if (boil > 0.2) {
        if ((bubbleWait -= dt) < 0) { spawnBubble(); bubbleWait = 0.12 + Math.random() * (0.5 - swirl * 0.3); }
        if ((steamWait -= dt) < 0) { spawnSteam(1); steamWait = 0.35 + Math.random() * 0.35; }
      }
      // a boiling pot rattles a little on its legs
      const rattle = boil * (Math.sin(time * 31) * 0.004 + Math.sin(time * 47) * 0.003);

      // ---- herbs: falling in, then afloat, turning
      for (const f of [...floaters]) {
        f.t += dt;
        f.a += dt * f.spin * (1 + swirl * 5);
        const bob = Math.sin(time * 2.4 + f.a * 3) * 0.012;
        const x = Math.cos(f.a) * f.r, z = Math.sin(f.a) * f.r;
        if (f.fall > 0) {
          f.fall = Math.max(0, f.fall - dt * 2.2);
          f.s.position.set(x, surface() + 0.02 + f.fall * f.fall * 0.9, z);
          if (f.fall === 0 && water) splash(6, `#${light.getHexString()}`, 0.8);
        } else f.s.position.set(x, surface() + 0.03 + bob, z);
        f.s.material.rotation = Math.sin(time * 1.3 + f.a) * 0.3;
        if (f.gone) {
          f.gone += dt;
          const k = Math.min(1, f.gone / 0.8);
          f.s.scale.setScalar(0.3 * (1 - k));
          f.s.material.opacity = 1 - k;
          if (k >= 1) { floatGroup.remove(f.s); floaters.splice(floaters.indexOf(f), 1); }
        }
      }
      for (const f of [...lifted]) {
        f.lift -= dt * 1.6;
        f.s.position.y += dt * 1.2;
        f.s.material.opacity = Math.max(0, f.lift);
        if (f.lift <= 0) { floatGroup.remove(f.s); lifted.splice(lifted.indexOf(f), 1); }
      }

      // ---- moves
      let hop = 0, squash = 0, rock = 0;
      if (action) {
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        switch (action.name) {
          case 'talk':
            // a burble: two bubbles, a little hop and a rock, as if it had an opinion
            rock = Math.sin(k * Math.PI * 4) * 0.05 * arch(k, 0, 1);
            hop = arch(k, 0.1, 0.35) * 0.02 + arch(k, 0.45, 0.7) * 0.015;
            if (k > 0.1 && !action.b1) { action.b1 = true; spawnBubble(true); }
            if (k > 0.45 && !action.b2) { action.b2 = true; spawnBubble(true); }
            hitAt(0.5);
            break;
          case 'drop':
            squash = arch(k, 0.35, 0.7) * 0.04;
            hitAt(0.45);
            break;
          case 'pour': {
            // the bottle drifts in over the pot, tips, and a stream of moonwater runs down into it
            const inK = ss(k, 0, 0.25), outK = ss(k, 0.8, 1);
            bottle.visible = k < 0.98;
            bottle.position.set(lerp(-0.75, 0.22, inK) + outK * 0.4, RIM_Y + 0.38 + (1 - inK) * 0.12 + outK * 0.2, 0.26);
            bottle.material.rotation = -ss(k, 0.2, 0.35) * 2.0 * (1 - outK);
            bottle.material.opacity = Math.min(inK * 2, 1 - outK);
            const flow = win(k, 0.3, 0.8, 0.06);
            stream.visible = flow > 0.01;
            const top = bottle.position.y - 0.12, bottom = surface();
            stream.position.set(0.1, (top + bottom) / 2, 0.2);
            stream.scale.set(1 + Math.sin(time * 40) * 0.15, Math.max(0.01, top - bottom), 1);
            stream.material.opacity = flow * 0.85;
            if (flow > 0.5 && Math.random() < dt * 30) splash(1, '#dfeaff', 0.6);
            hitAt(0.4);
            break;
          }
          case 'stir':
            swirl = Math.max(swirl, win(k, 0.05, 0.95, 0.15) * 1.2);
            if (Math.random() < dt * 8) spawnBubble();
            hitAt(0.5);
            break;
          case 'bless': {
            // witchfire flares under the pot and leaps into it
            const f = arch(k, 0, 0.6);
            fireK = Math.max(fireK, 1 + f * 0.8);
            glow = Math.max(glow, arch(k, 0.35, 1) * 0.6);
            liquidUniforms.spark.value.set('#d9a8ff');
            if (k > 0.4 && !action.spray) { action.spray = true; splash(10, '#e7c8ff', 1.1); for (const f2 of floaters) f2.gone = f2.gone || 0.001; }
            hitAt(0.5);
            break;
          }
          case 'good': {
            // sparkles fountain up, the water glows its brew's colour and a column of light stands over it
            const burst = arch(k, 0, 0.5);
            glow = Math.max(glow, burst * 1.3);
            liquidUniforms.spark.value.copy(light);
            flare.material.color.copy(light);
            flare.material.opacity = burst * 0.6;
            column.material.color.copy(light);
            column.material.opacity = arch(k, 0.05, 0.9) * 0.32;
            column.scale.set(0.5 + burst * 0.3, 2.4 * arch(k, 0.05, 0.9) + 0.05, 1);
            if (!action.burst) {
              action.burst = true;
              for (let i = 0; i < 26; i++) {
                const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 0.7;
                sparkles.spawn(toRoot(onSurface(0.18)), {
                  vel: [Math.cos(a) * sp * 0.6, 1.2 + Math.random() * 1.3, Math.sin(a) * sp * 0.6], gravity: 0.9, drag: 0.6,
                  life: 1.2 + Math.random() * 0.8, size: 0.09 + Math.random() * 0.08, color: i % 3 ? `#${light.getHexString()}` : '#fff6c8', spin: [0, 0, 3],
                });
              }
              spawnSteam(4, 1);
            }
            hop = arch(k, 0, 0.25) * 0.03;
            hitAt(0.3);
            break;
          }
          case 'dud': {
            // Plop. The pot jumps, a fat bubble swells up out of it and bursts, and a cloud rolls out over the rim.
            squash = arch(k, 0, 0.14) * 0.14 - arch(k, 0.14, 0.34) * 0.1 + Math.sin(k * 30) * 0.03 * (1 - ss(k, 0.3, 0.8));
            hop = arch(k, 0.1, 0.34) * 0.14;
            rock = Math.sin(k * Math.PI * 7) * 0.08 * (1 - ss(k, 0.3, 1));
            const swell = ss(k, 0.02, 0.3);
            plop.visible = k < 0.32;
            plop.material.color.copy(colour);
            plop.position.y = surface() + 0.05 + swell * 0.12;
            plop.scale.setScalar(0.2 + swell * 1.1);
            if (k > 0.32 && !action.popped) {
              action.popped = true;
              splash(12, `#${light.getHexString()}`, 1.2);
              for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                puffs.spawn(toRoot(onSurface(0.1)).add(v.set(0, 0.12, 0)), {
                  vel: [Math.cos(a) * (0.8 + Math.random() * 0.4), 0.6 + Math.random() * 0.6, Math.sin(a) * (0.5 + Math.random() * 0.3)], drag: 1.4,
                  life: 1.2 + Math.random() * 0.7, size: 0.18 + Math.random() * 0.1, grow: 1.3, color: ['#9aa886', '#b8a8c8', '#c9d6a0'][i % 3], opacity: 0.85,
                });
              }
            }
            hitAt(0.32);
            break;
          }
        }
        if (k >= 1) {
          if (action.name === 'pour') { bottle.visible = false; stream.visible = false; }
          if (action.name === 'good') { flare.material.opacity = 0; column.material.opacity = 0; }
          plop.visible = false;
          action = null;
        }
      }
      body.position.y = S.hop.update(hop, dt);
      const sq = S.squash.update(squash, dt);
      body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
      body.rotation.z = S.rock.update(rock, dt) + rattle;
      bail.rotation.x = bailRest + Math.max(0, hop) * 2 + Math.abs(sq) * 1.5;

      bubbles.update(dt);
      steam.update(dt);
      drops.update(dt);
      sparkles.update(dt);
      puffs.update(dt);
    },
  };
  const lifted = [];
  api.setFire(0, true);
  return api;
}
