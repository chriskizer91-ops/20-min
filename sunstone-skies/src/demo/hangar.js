// hangar.js: the demo page. The Captain's four ships, one at a time or all together, above a sea of cloud at
// sunset with peaks breaking through, the way Chris's painting of the Brig shows it. Drag to turn round a ship,
// pinch to zoom; switch ships, views and the detail dial at the bottom.
import * as THREE from 'three';
import { loadShipArt } from '../ship/materials.js';
import { buildShip } from '../ship/build.js';
import { SHIPS, STATS } from '../ships/index.js';
import { SUN, makeSky, makeClouds, makePeaks } from './sunset.js';

const $ = (id) => document.getElementById(id);

async function main() {
  const canvas = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sky = makeSky(), clouds = makeClouds(), peaks = makePeaks();
  scene.add(sky, clouds, peaks);
  scene.fog = new THREE.Fog(0xd9958c, 900, 5200);

  // the sky itself lights the brass: reflections come from a blurred copy of it
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeSky());
  const cl = makeClouds(); cl.position.y = -40; envScene.add(cl);
  scene.environment = pmrem.fromScene(envScene, 0.04, 1, 4000).texture;
  scene.environmentIntensity = 0.85;

  const hemi = new THREE.HemisphereLight(0x8d9cff, 0xe39a7c, 0.55);
  const sun = new THREE.DirectionalLight(0xffc28a, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const fill = new THREE.DirectionalLight(0x8f9cff, 0.55);
  scene.add(hemi, sun, sun.target, fill);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70000);
  const art = await loadShipArt(renderer);

  // ships are built when first wanted, and kept
  const built = new Map();
  const getShip = (R, level) => {
    const key = R.id + ':' + level;
    if (!built.has(key)) built.set(key, buildShip(R, level, art));
    return built.get(key);
  };

  const state = { ship: 'brig', level: 'full', view: 'turn', yaw: 0.9, pitch: 0.28, dist: 30, target: new THREE.Vector3(), aim: null, idle: 0, all: false };
  const shown = [];
  const holder = new THREE.Group(); scene.add(holder);

  function frameFor(list) {
    const box = new THREE.Box3();
    for (const s of list) { s.root.updateMatrixWorld(true); box.expandByObject(s.root); }
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    return { c, size, r: Math.max(size.x, size.z, size.y) };
  }
  function show() {
    holder.clear(); shown.length = 0;
    const list = state.all ? SHIPS : SHIPS.filter((R) => R.id === state.ship);
    let x = 0, y = 0;
    const tall = camera.aspect < 0.9;
    list.forEach((R, i) => {
      const s = getShip(R, state.level);
      s.root.position.set(0, 0, 0);
      if (state.all && tall) {
        // on a tall screen, one above another, smallest at the bottom
        s.root.position.set(0, y, 0);
        y += R.length * 0.5 + 4;
      } else if (state.all) {
        // in echelon, smallest nearest, each a little higher and further back
        s.root.position.set(x, i * 2.5, -i * 7);
        x += 16 + R.length * 0.35;
      }
      holder.add(s.root); shown.push(s);
    });
    const f = frameFor(shown);
    state.target.copy(f.c);
    // far enough back that the whole ship fits across the screen, which matters on a tall phone
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    state.dist = Math.max(f.r * (state.all ? 1.15 : 1.25), (f.r * (state.all ? 0.5 : 0.56)) / Math.tan(hfov / 2));
    state.minDist = (state.all ? f.r * 0.25 : f.r * 0.35); state.maxDist = f.r * 3;
    // the sun's shadow covers what is shown
    const r = f.r * 0.75;
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 6 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(f.c);
    sun.position.copy(f.c).addScaledVector(SUN.clone().setY(0.55).normalize(), r * 3);
    fill.position.copy(f.c).add(new THREE.Vector3(30, 20, 40));
    updateCard(); updateTri(); setView(state.view, true);
  }

  // ---------- the camera: drag round the ship, pinch or scroll to zoom; views snap it ----------
  const VIEWS = { turn: null, side: [Math.PI / 2, 0.04], front: [0, 0.06], back: [Math.PI, 0.1], top: [Math.PI / 2, 1.45], deck: [0.6, 0.55] };
  function setView(v, quiet) {
    state.view = v;
    for (const b of $('views').children) b.setAttribute('aria-pressed', String(b.dataset.view === v));
    if (VIEWS[v]) state.aim = { yaw: VIEWS[v][0], pitch: VIEWS[v][1], dist: v === 'deck' ? state.dist * 0.62 : state.dist };
    else state.aim = null;
    if (!quiet) state.idle = 0;
  }
  const pointers = new Map();
  let pinch = null;
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
    state.yaw -= (e.clientX - p.x) * 0.006; state.pitch = THREE.MathUtils.clamp(state.pitch + (e.clientY - p.y) * 0.004, -0.55, 1.5);
    p.x = e.clientX; p.y = e.clientY; state.idle = 0;
    if (state.view !== 'turn') setView('turn', true);
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); state.dist = THREE.MathUtils.clamp(state.dist * Math.exp(e.deltaY * 0.001), state.minDist, state.maxDist); state.idle = 0; }, { passive: false });

  // ---------- the buttons ----------
  const shipsEl = $('ships');
  for (const R of SHIPS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.ship = R.id;
    b.innerHTML = `<b>${R.name}</b><small>${R.cls}</small>`;
    b.addEventListener('click', () => { state.all = false; state.ship = R.id; mark(); show(); });
    shipsEl.append(b);
  }
  const allB = document.createElement('button');
  allB.type = 'button'; allB.dataset.ship = 'all'; allB.innerHTML = '<b>All four</b><small>Together</small>';
  allB.addEventListener('click', () => { state.all = true; mark(); show(); });
  shipsEl.append(allB);
  function mark() { for (const b of shipsEl.children) b.setAttribute('aria-pressed', String(state.all ? b.dataset.ship === 'all' : b.dataset.ship === state.ship)); }
  for (const b of $('views').children) b.addEventListener('click', () => setView(b.dataset.view));
  for (const b of $('levels').children) b.addEventListener('click', () => {
    state.level = b.dataset.level;
    for (const x of $('levels').children) x.setAttribute('aria-pressed', String(x === b));
    show();
  });
  $('btn-card').addEventListener('click', () => {
    const open = $('card').hidden; $('card').hidden = !open;
    $('btn-card').textContent = open ? 'Hide stats' : 'Stats'; $('btn-card').setAttribute('aria-expanded', String(open));
  });
  function updateCard() {
    const R = SHIPS.find((s) => s.id === state.ship), St = STATS[R.id];
    if (state.all) {
      $('card-name').textContent = 'The fleet'; $('card-cls').textContent = 'Skiff · Cutter · Brig · Frigate';
      $('card-blurb').textContent = 'The four ships the Captain moves up through, at the same scale.';
      $('card-stats').innerHTML = SHIPS.map((S) => `<dt>${S.name}</dt><dd>${S.cls}, ${S.length} m</dd>`).join('');
      return;
    }
    $('card-name').textContent = R.name; $('card-cls').textContent = `${R.cls} · ${R.length} m long`;
    $('card-blurb').textContent = St.blurb;
    const bar = (v) => `<span class="bar" style="width:${v * 5}px"></span>${v}`;
    $('card-stats').innerHTML = [
      ['Hull', St.hull.toLocaleString()], ['Sails', St.sails.toLocaleString()], ['Crystals', St.crystals.toLocaleString()], ['Crew', St.crew],
      ['Speed', bar(St.speed)], ['Turning', bar(St.turning)], ['Climbing', bar(St.climbing)],
      ['Guns', `${St.bow} bow · ${St.stern} stern · ${St.side} a side`],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }
  function updateTri() {
    const tri = shown.reduce((n, s) => n + s.stats.triangles, 0), dc = shown.reduce((n, s) => n + s.stats.drawCalls, 0);
    const name = { full: 'Full detail', middle: 'Middle detail', far: 'Far detail' }[state.level];
    $('tri').textContent = `${name}: ${tri.toLocaleString()} triangles${state.all ? ' for all four' : ''} · ${dc} draw calls`;
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // on a tall phone screen the ship needs more room across
    camera.fov = w < h ? 52 : 38;
    camera.updateProjectionMatrix();
    const scale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const s of built.values()) s.glow.material.uniforms.uScale.value = scale;
    state.glowScale = scale;
  }
  addEventListener('resize', () => { resize(); show(); });

  if (innerWidth < 640) { $('card').hidden = true; $('btn-card').textContent = 'Stats'; $('btn-card').setAttribute('aria-expanded', 'false'); }
  resize(); mark(); show();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    state.idle += dt;
    if (state.view === 'turn' && state.idle > 2.5 && pointers.size === 0 && !calm) state.yaw += dt * 0.12;
    if (state.aim) {
      const k = 1 - Math.exp(-dt * 4);
      let dy = state.aim.yaw - state.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      state.yaw += dy * k; state.pitch += (state.aim.pitch - state.pitch) * k; state.dist += (state.aim.dist - state.dist) * k;
    }
    const cp = Math.cos(state.pitch);
    camera.position.set(Math.sin(state.yaw) * cp, Math.sin(state.pitch), Math.cos(state.yaw) * cp).multiplyScalar(state.dist).add(state.target);
    camera.lookAt(state.target);
    for (const s of shown) { s.update(dt); if (state.glowScale) s.glow.material.uniforms.uScale.value = state.glowScale; }
    clouds.material.uniforms.uTime.value = time;
    art.M.canvas.userData.time.value = time;
    art.M.crystal.emissiveIntensity = 1.05 + Math.sin(time * 2.4) * 0.15;
    art.M.gem.emissiveIntensity = 0.55 + Math.sin(time * 2.4) * 0.09;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.body.classList.add('ready');

  // for the checks in tools/check.mjs
  window.__hangar = {
    ready: true, renderer, scene, camera, state,
    stats(id, level) { const R = SHIPS.find((s) => s.id === id); return getShip(R, level).stats; },
    select(id) { if (id === 'all') { state.all = true; } else { state.all = false; state.ship = id; } mark(); show(); },
    level(l) { state.level = l; for (const x of $('levels').children) x.setAttribute('aria-pressed', String(x.dataset.level === l)); show(); },
    view(v, yaw, pitch, dist) { setView(v); if (yaw != null) { state.aim = null; state.yaw = yaw; state.pitch = pitch; if (dist) state.dist = dist; } },
  };
}

main().catch((err) => {
  console.error(err);
  const e = $('error'); e.hidden = false; e.textContent = `The ships couldn't load: ${err.message}`;
});
