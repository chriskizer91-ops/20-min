// shipyard.js: the demo page for the Captain's six levelled-up ships. The chosen ship floats over the sunset cloud
// sea, and the panel works her: the working parts (sail, helm, climb, battle stations, firing), damage (hull, sails,
// crystals), the garage (the game's ten parts; one slot on a Skiff up to four on a Frigate) and the crystal power shared
// between sails, guns and lift. "Old" shows the game's ship as it was, and "Both" puts them side by side.
import * as THREE from 'three';
import { loadShipArt } from '../ship/materials.js';
import { buildShip } from '../ship/build.js';
import { FLEET as OLD } from '../ships/index.js';
import { fleetArt, COLOURS } from '../fleet/materials.js';
import { buildFleetShip, NO_FIT } from '../fleet/build.js';
import { ELEVATE } from '../fleet/guns.js';
import { FLEET } from '../fleet/index.js';
import { gunsOf, makeBolts } from '../game/guns.js';
import { makeSmoke } from '../game/effects.js';
import { SUN, makeSky, makeClouds, makePeaks } from './sunset.js';
import { PARTS, SLOTS } from '../game/progress.js';

const $ = (id) => document.getElementById(id);

// The garage's parts are the game's own (src/game/progress.js): each gains something and costs something in flight.
// Most show on the ship; Rapid loaders and Trim fins don't change her looks.
const pct = (x) => `${x > 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;
const WORDS = { hull: 'hull', sails: 'sails', crystals: 'crystals', speed: 'speed', turn: 'turning', climb: 'climbing', damage: 'damage',
  reload: 'reload time', range: 'range', pitch: 'gun tilt', swing: 'gun swing', power: 'power to share' };
const words = (o) => Object.entries(o).map(([k, x]) => `${pct(x)} ${WORDS[k]}`).join(', ');

async function main() {
  const canvas = $('stage');
  const touch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const clouds = makeClouds();
  scene.add(makeSky(), clouds, makePeaks());
  scene.fog = new THREE.Fog(0xd9958c, 900, 5200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeSky());
  const cl = makeClouds(); cl.position.y = -40; envScene.add(cl);
  scene.environment = pmrem.fromScene(envScene, 0.04, 1, 4000).texture;
  scene.environmentIntensity = 0.85;
  const hemi = new THREE.HemisphereLight(0x8d9cff, 0xe39a7c, 0.55);
  const sun = new THREE.DirectionalLight(0xffc28a, 3.0);
  sun.castShadow = true; sun.shadow.mapSize.set(touch ? 2048 : 4096, touch ? 2048 : 4096);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  const fill = new THREE.DirectionalLight(0x8f9cff, 0.55);
  scene.add(hemi, sun, sun.target, fill);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70000);

  const art = await loadShipArt(renderer), fart = fleetArt(art);
  // each ship is built when first wanted, and kept; so is its old self
  const built = new Map(), olds = new Map();
  const shipOf = (id) => { if (!built.has(id)) built.set(id, buildFleetShip(FLEET.find((R) => R.id === id), 'full', fart)); return built.get(id); };
  const oldOf = (id) => { if (!olds.has(id)) olds.set(id, buildShip(OLD.find((R) => R.id === id), 'full', art)); return olds.get(id); };
  let ship = shipOf('frigate'), old = null;
  const oldShip = () => (old = oldOf(ship.recipe.id));
  const bolts = makeBolts(scene), smoke = makeSmoke(scene, 500);
  const holder = new THREE.Group(); scene.add(holder);

  const state = { which: 'after', view: 'turn', yaw: 0.9, pitch: 0.24, dist: 60, target: new THREE.Vector3(), aim: null, idle: 0, minDist: 10, maxDist: 200 };
  let shown = [];
  function show() {
    holder.clear();
    shown = state.which === 'before' ? [oldShip()] : state.which === 'both' ? [ship, oldShip()] : [ship];
    const gap = ship.length * 0.55 + 2;
    shown.forEach((s, i) => { s.root.position.set(i ? -gap : (shown.length > 1 ? gap : 0), i ? ship.length * 0.04 : 0, i ? -ship.length * 0.15 : 0); holder.add(s.root); });
    const box = new THREE.Box3();
    for (const s of shown) { s.root.updateMatrixWorld(true); box.expandByObject(s.root); }
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), r = Math.max(size.x, size.z, size.y);
    state.target.copy(c).setY(c.y - size.y * 0.06);
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    state.dist = Math.max(r * 1.15, (r * 0.56) / Math.tan(hfov / 2));
    state.minDist = r * 0.12; state.maxDist = r * 3;
    const sr = r * 0.72;
    Object.assign(sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: sr * 6 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(c); sun.position.copy(c).addScaledVector(SUN.clone().setY(0.55).normalize(), sr * 3);
    fill.position.copy(c).add(new THREE.Vector3(30, 20, 40));
    for (const b of $('which').children) b.setAttribute('aria-pressed', String(b.dataset.which === state.which));
    $('panel').style.opacity = state.which === 'before' ? '0.55' : '1';
    const R = ship.recipe;
    $('title').querySelector('h1').textContent = `The ${R.name}`;
    $('title').querySelector('p').textContent = state.which === 'before' ? `${R.cls} · ${R.length} m · as it was` : state.which === 'both' ? 'New (right) and old (left)' : `${R.cls} · ${R.length} m · levelled up`;
    for (const b of $('fleet').children) b.setAttribute('aria-pressed', String(b.dataset.ship === R.id));
    setView(state.view, true); counts();
  }
  function counts() {
    const n = shown.reduce((a, s) => a + s.stats.triangles, 0), d = shown.reduce((a, s) => a + s.stats.drawCalls, 0);
    $('tri').textContent = `${n.toLocaleString()} triangles · ${d} draw calls`;
  }

  // ---------- the camera: drag round the ship, pinch or scroll to zoom; views snap it ----------
  const VIEWS = { turn: null, side: [Math.PI / 2, 0.05, 1], front: [0.35, 0.12, 0.7], back: [Math.PI - 0.45, 0.16, 0.7], deck: [0.7, 0.62, 0.62], below: [1.1, -0.42, 0.85] };
  function setView(v, quiet) {
    state.view = v;
    for (const b of $('views').children) b.setAttribute('aria-pressed', String(b.dataset.view === v));
    state.aim = VIEWS[v] ? { yaw: VIEWS[v][0], pitch: VIEWS[v][1], dist: state.dist * VIEWS[v][2] } : null;
    if (!quiet) state.idle = 0;
  }
  const pointers = new Map();
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); state.idle = 0; state.aim = null; });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const [c, d] = [...pointers.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (d0 > 0) state.dist = THREE.MathUtils.clamp(state.dist * d0 / d1, state.minDist, state.maxDist);
      return;
    }
    state.yaw -= (e.clientX - p.x) * 0.006; state.pitch = THREE.MathUtils.clamp(state.pitch + (e.clientY - p.y) * 0.004, -0.7, 1.5);
    p.x = e.clientX; p.y = e.clientY; state.idle = 0;
    if (state.view !== 'turn') { state.view = 'turn'; for (const b of $('views').children) b.setAttribute('aria-pressed', String(b.dataset.view === 'turn')); }
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); state.dist = THREE.MathUtils.clamp(state.dist * Math.exp(e.deltaY * 0.001), state.minDist, state.maxDist); state.idle = 0; }, { passive: false });
  for (const b of $('views').children) b.addEventListener('click', () => setView(b.dataset.view));
  for (const b of $('which').children) b.addEventListener('click', () => { state.which = b.dataset.which; show(); });

  // ---------- the panel ----------
  for (const t of $('tabs').children) t.addEventListener('click', () => {
    for (const x of $('tabs').children) { x.setAttribute('aria-selected', String(x === t)); $(`tab-${x.dataset.tab}`).hidden = x !== t; }
  });
  $('btn-panel').addEventListener('click', () => {
    const closed = document.body.classList.toggle('closed');
    $('btn-panel').textContent = closed ? 'Controls' : 'Hide'; $('btn-panel').setAttribute('aria-expanded', String(!closed));
    frameView();
  });
  // on a phone the open panel covers the lower half, so the picture moves up above it
  function frameView() {
    const w = innerWidth, h = innerHeight, covered = w < 700 && !document.body.classList.contains('closed');
    if (covered) camera.setViewOffset(w, h, 0, h * 0.22, w, h); else camera.clearViewOffset();
  }
  let C = ship.control;
  // choosing another ship: she takes over the panel's settings
  function select(id) {
    const next = shipOf(id);
    if (next === ship) return;
    const nc = next.control;
    for (const k of ['sail', 'turn', 'climb']) nc[k] = C[k];
    Object.assign(nc.stations, C.stations); Object.assign(nc.power, C.power); Object.assign(nc.damage, C.damage);
    ship = next; C = nc; G = gunsOf(ship); pending.clear();
    while (on.size > slots()) on.delete([...on].at(-1)); // a smaller ship has fewer slots
    ship.fit({ ...NO_FIT, ...looksOn() });
    garage(); show();
  }
  for (const R of FLEET) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.ship = R.id; b.innerHTML = `<b>${R.name}</b><small>${R.cls}</small>`;
    b.addEventListener('click', () => select(R.id));
    $('fleet').append(b);
  }
  const slider = (id, out, fn) => { const el = $(id); const go = () => { $(out).textContent = fn(+el.value); }; el.addEventListener('input', go); go(); return el; };
  slider('c-sail', 'o-sail', (v) => { C.sail = v / 100; return `${v}%`; });
  slider('c-turn', 'o-turn', (v) => { C.turn = v / 100; return v === 0 ? 'ahead' : v < 0 ? 'to port' : 'starboard'; });
  slider('c-climb', 'o-climb', (v) => { C.climb = v / 100; return v === 0 ? 'level' : v > 0 ? 'climb' : 'dive'; });
  for (const s of ['port', 'starboard']) $(`st-${s}`).addEventListener('click', (e) => {
    C.stations[s] = C.stations[s] ? 0 : 1; e.currentTarget.setAttribute('aria-pressed', String(!!C.stations[s]));
  });
  // firing: a closed side opens up and runs out first, then fires
  const pending = new Set();
  for (const b of document.querySelectorAll('[data-fire]')) b.addEventListener('click', () => {
    if (state.which === 'before') return;
    const bat = b.dataset.fire;
    if ((bat === 'port' || bat === 'starboard') && C.stations[bat] < 0.5) { C.stations[bat] = 1; $(`st-${bat}`).setAttribute('aria-pressed', 'true'); }
    pending.add(bat);
  });
  let G = gunsOf(ship);
  const wp = new THREE.Vector3(), wd = new THREE.Vector3(), nm = new THREE.Matrix3();
  function fire(bat) {
    ship.fire(bat);
    ship.root.updateMatrixWorld(true); nm.getNormalMatrix(ship.body.matrixWorld);
    for (const g of G[bat]) {
      wp.copy(g.p).applyMatrix4(ship.body.matrixWorld); wd.copy(g.d).applyMatrix3(nm).normalize();
      if (ship.fitted.highAngle) wd.y += Math.sin(ELEVATE);
      if (ship.fitted.longFocus) wp.addScaledVector(wd, 1.2 * ship.recipe.kit);
      bolts.fire(wp, wd.normalize(), g.kind, 'player', null);
      for (let i = 0; i < 3; i++) smoke.emit(wp.clone().addScaledVector(wd, 1 + i * 1.2), wd.clone().multiplyScalar(6 - i * 1.5).add({ x: 0, y: 0.6, z: 0 }), 2.2 + Math.random(), 1.2, 5 + i * 1.5, 0.85, 0.55);
    }
  }
  const health = (k) => slider(`d-${k}`, `o-${k}`, (v) => { C.damage[k] = 1 - v / 100; return `${v}%`; });
  const dmg = ['hull', 'sails', 'crystals'].map(health);
  $('btn-repair').addEventListener('click', () => { for (const el of dmg) { el.value = 100; el.dispatchEvent(new Event('input')); } });
  // the garage: tap a part to put it on or take it off; one slot on a Skiff, up to four on a Frigate; one kind of canvas
  const slots = () => SLOTS[ship.recipe.id];
  const on = new Set(); // the parts fitted (some don't show on the ship, so the model's own list isn't enough)
  const looksOn = () => Object.fromEntries(PARTS.filter((P) => P.look).map((P) => [P.look, on.has(P.id)]));
  for (const P of PARTS) {
    const d = document.createElement('div'); d.className = 'part';
    d.innerHTML = `<b>${P.name}</b><button type="button" class="chip" aria-pressed="false">Fit</button><small class="gain">${words(P.plus)} (Mk I)</small><small class="cost">${words(P.minus)}${P.look ? '' : ' · doesn\'t show on her'}</small>`;
    const btn = d.querySelector('button');
    btn.addEventListener('click', () => {
      if (on.has(P.id)) on.delete(P.id);
      else {
        const clash = P.group && [...on].find((id) => PARTS.find((x) => x.id === id).group === P.group);
        if (clash) on.delete(clash); // one kind of canvas at a time: the new one goes on instead
        if (on.size >= slots()) { $('slots').textContent = `${slots() === 1 ? 'The one slot is' : `All ${slots()} slots are`} full: take a part off first`; return; }
        on.add(P.id);
      }
      ship.fit({ ...NO_FIT, ...looksOn() }); garage(); counts();
    });
    d.dataset.part = P.id;
    $('parts').append(d);
  }
  function garage() {
    $('slots').textContent = `${on.size} of ${slots()} part slot${slots() > 1 ? 's' : ''} used`;
    for (const d of $('parts').children) { const f = on.has(d.dataset.part); const b = d.querySelector('button'); b.setAttribute('aria-pressed', String(f)); b.textContent = f ? 'Fitted' : 'Fit'; }
  }
  garage();
  // the power: three shares that always add up to the whole
  const pw = { sails: $('p-sails'), guns: $('p-guns'), lift: $('p-lift') };
  function share(changed) {
    const keys = Object.keys(pw), v = Object.fromEntries(keys.map((k) => [k, +pw[k].value]));
    const others = keys.filter((k) => k !== changed), rest = 100 - v[changed], sum = others.reduce((a, k) => a + v[k], 0);
    for (const k of others) v[k] = sum > 0 ? (v[k] / sum) * rest : rest / 2;
    for (const k of keys) { pw[k].value = Math.round(v[k]); C.power[k] = v[k] / 100; }
    $('o-psails').textContent = `${Math.round(v.sails)}%`; $('o-pguns').textContent = `${Math.round(v.guns)}%`; $('o-plift').textContent = `${Math.round(v.lift)}%`;
  }
  for (const k in pw) pw[k].addEventListener('input', () => share(k));
  $('btn-even').addEventListener('click', () => { pw.sails.value = 33; pw.guns.value = 33; pw.lift.value = 34; share('lift'); });
  share('lift');

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 55 : 38; camera.updateProjectionMatrix(); frameView();
    state.glowScale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    camera.userData.pixelScale = state.glowScale;
  }
  addEventListener('resize', () => { resize(); show(); });
  if (innerWidth < 700) { document.body.classList.add('closed'); $('btn-panel').textContent = 'Controls'; $('btn-panel').setAttribute('aria-expanded', 'false'); }
  resize(); show();

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), time = 0;
  function tick(dt) {
    time += dt; state.idle += dt;
    if (state.view === 'turn' && state.idle > 3 && pointers.size === 0 && !calm) state.yaw += dt * 0.1;
    if (state.aim) {
      const k = 1 - Math.exp(-dt * 4);
      let dy = state.aim.yaw - state.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      state.yaw += dy * k; state.pitch += (state.aim.pitch - state.pitch) * k; state.dist += (state.aim.dist - state.dist) * k;
    }
    const cp = Math.cos(state.pitch);
    camera.position.set(Math.sin(state.yaw) * cp, Math.sin(state.pitch), Math.cos(state.yaw) * cp).multiplyScalar(state.dist).add(state.target);
    camera.lookAt(state.target);
    for (const bat of [...pending]) if (ship.ready(bat) > 0.98) { pending.delete(bat); fire(bat); }
    ship.update(dt, { calm: true, turn: C.turn, climb: C.climb });
    if (old && shown.includes(old)) old.update(dt, { calm: true, turn: C.turn, climb: C.climb });
      for (const s of shown) s.glow.material.uniforms.uScale.value = state.glowScale;
    bolts.update(dt, () => false, camera); smoke.update(dt, camera);
    clouds.material.uniforms.uTime.value = time;
    art.M.canvas.userData.time.value = time;
    art.M.gem.emissiveIntensity = 0.55 + Math.sin(time * 2.4) * 0.09;
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.body.classList.add('ready');

  // for tools/check-shipyard.mjs
  window.__yard = {
    ready: true, state, renderer, scene, camera, select,
    get ship() { return ship; }, get control() { return C; },
    which(w) { state.which = w; show(); },
    view(v, yaw, pitch, dist) { setView(v); if (yaw != null) { state.aim = null; state.yaw = yaw; state.pitch = pitch; if (dist) state.dist = dist; } state.idle = -1e9; },
    // fit these looks (or parts) outright, slots or not
    fit(f) {
      on.clear();
      for (const [k, v] of Object.entries(f)) { const P = PARTS.find((x) => x.look === k || x.id === k); if (v && P) on.add(P.id); }
      ship.fit({ ...NO_FIT, ...looksOn() }); garage(); counts();
    },
    fire(b) { pending.add(b); },
    step(seconds) { for (let t = 0; t < seconds; t += 1 / 30) tick(1 / 30); },
    oldStats: (id = ship.recipe.id) => oldOf(id).stats,
    // a ship at another level of detail (and colours), for the checks
    build: (level, raider, id = ship.recipe.id) => buildFleetShip(FLEET.find((R) => R.id === id), level, fart, raider ? { colours: COLOURS.raider } : {}),
  };
}

main().catch((err) => {
  console.error(err);
  const e = $('error'); e.hidden = false; e.textContent = `The shipyard couldn't load: ${err.message}`;
});
