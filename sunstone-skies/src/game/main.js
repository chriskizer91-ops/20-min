// main.js: Sunstone Skies, the laptop game. The Captain flies the four levelled-up ships over Chris's map and fights
// waves of raiders: swing the camera round the ship to aim, and whichever guns face where you look fire. Shots tear
// the hull, the sails or the crystals (docs/ships.md); a raider with no hull left goes down, and so does the Captain.
// Two ways to play (voyage.js): voyages, where shards from raiders buy ships and parts in port and renown buys
// skills (progress.js, garage.js, abilities.js); and free flight, with everything unlocked.
import * as THREE from 'three';
import { loadShipArt } from '../ship/materials.js';
import { STATS } from '../ships/index.js';
import { FLEET } from '../fleet/index.js';
import { fleetArt } from '../fleet/materials.js';
import { buildFleetShip } from '../fleet/build.js';
import { makeWorld, regionAt, SUN, HAZE, MAP, THINNING } from './world.js';
import { makeInput } from './input.js';
import { makeFlyer } from './flight.js';
import { makeBolts, makeGunnery, batteryFor, BATTERY_NAMES, intercept } from './guns.js';
import { makeRaiders } from './raiders.js';
import { hitZones, firstHit } from './damage.js';
import { makeSmoke, smokeFrom, makeWard } from './effects.js';
import * as P from './progress.js';
import { makeDirector } from './voyage.js';
import { makeAbilities } from './abilities.js';
import { makeGarage } from './garage.js';
import minimapUrl from '../../assets/map/minimap.webp';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;
const PARTS = ['hull', 'sails', 'crystals'];
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const compassDeg = (heading) => ((180 - THREE.MathUtils.radToDeg(heading)) % 360 + 360) % 360; // north is up the map (-z)
const SHIPS = FLEET;
const NAMES = Object.fromEntries(SHIPS.map((R) => [R.id, R.name]));

async function main() {
  const canvas = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HAZE, 4000, 34000);
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 70000);
  const [world, art] = await Promise.all([makeWorld(renderer), loadShipArt(renderer)]);
  const fart = fleetArt(art);
  scene.add(world.group);

  // the day sky lights the brass
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(world.group.children[0].clone());
  scene.environment = pmrem.fromScene(envScene, 0.04, 1, 60000).texture;
  scene.environmentIntensity = 0.9;
  const hemi = new THREE.HemisphereLight(0xc3dcff, 0x7c8a5c, 0.75);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  const bolts = makeBolts(scene), smoke = makeSmoke(scene), ward = makeWard(scene);
  const raiders = makeRaiders(scene, art, bolts, fart);

  // ---------- the Captain, and the ship they fly ----------
  let cap = P.load() ?? P.newCaptain();
  const built = new Map(), zones = new Map();
  const shipFor = (R) => { if (!built.has(R.id)) built.set(R.id, buildFleetShip(R, 'full', fart)); return built.get(R.id); };
  const start = { pos: new THREE.Vector3(0, 680, 2600), heading: Math.PI };
  let player = null, gunnery = null;
  function fly(id) {
    if (player?.down) return;
    const R = SHIPS.find((s) => s.id === id), ship = shipFor(R);
    const keep = player ? { pos: player.pos.clone(), heading: player.heading } : start;
    const worn = player ? PARTS.map((k) => player.frac(k)) : null; // damage carries over to the next ship
    if (player) scene.remove(player.ship.root);
    ship.root.rotation.set(0, keep.heading, 0);
    if (cap.ships.includes(id)) cap.ship = id;
    player = makeFlyer(ship, STATS[id], keep);
    if (worn) PARTS.forEach((k, i) => { player.health[k] = player.full[k] * worn[i]; });
    if (!zones.has(id)) zones.set(id, hitZones(ship));
    player.aimY = zones.get(id).aim.y;
    gunnery = makeGunnery(ship);
    outfit();
    scene.add(ship.root);
    const r = R.length * 0.85;
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 8 });
    sun.shadow.camera.updateProjectionMatrix();
    cam.dist = camDistFor(R);
    $('ship-name').textContent = R.name; $('ship-cls').textContent = `${R.cls} · ${R.length} m`;
    for (const b of $('ships').children) b.setAttribute('aria-pressed', String(b.dataset.ship === id));
  }
  // the Captain's parts, skills and tuning, on the ship: how she flies and fires, and what she shows
  function outfit() {
    const id = player.ship.recipe.id, e = P.effects(cap, id), L = P.looks(cap, id);
    player.setMods(e);
    gunnery.setMods(e, L.heavyShot ? 1.25 : 1);
    player.ship.fit(Object.fromEntries(Object.keys(player.ship.fitted).map((k) => [k, !!L[k]])));
    Object.assign(player.ship.control.power, cap.power);
  }

  // ---------- the camera: behind the ship, swung round it by the mouse or a drag ----------
  const cam = { yaw: 0, pitch: 0.2, dist: 40, zoom: 1, look: new THREE.Vector3(), shake: 0 };
  const camDistFor = (R) => R.length * 1.35 + 16;
  const aimPoint = new THREE.Vector3();
  let locked = null, reach = true;
  function placeCamera(dt, inp) {
    const sens = inp.locked ? 0.0026 : touch ? 0.0042 : 0.005;
    cam.yaw -= inp.look.x * sens;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + inp.look.y * sens, -0.35, 1.25);
    cam.zoom = THREE.MathUtils.clamp(cam.zoom * Math.pow(1.12, inp.zoom), 0.55, 2.6);
    // left alone for a while (and not mouse-locked), the camera eases back behind the ship
    const idle = performance.now() / 1000 - inp.lastLook;
    if (!inp.locked && idle > 3.5 && !inp.fire) {
      const k = 1 - Math.exp(-dt * 1.2);
      cam.yaw = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw)) * (1 - k); cam.pitch += (0.2 - cam.pitch) * k;
    }
    const a = player.heading + cam.yaw, R = player.ship.recipe;
    cam.look.set(Math.sin(a) * Math.cos(cam.pitch), -Math.sin(cam.pitch), Math.cos(a) * Math.cos(cam.pitch));
    const target = player.pos.clone().add(new THREE.Vector3(0, R.length * 0.42 + 2, 0));
    camera.position.copy(target).addScaledVector(cam.look, -cam.dist * cam.zoom);
    camera.lookAt(target);
    if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt); const s = cam.shake * 0.012; camera.rotation.x += (Math.random() - 0.5) * s; camera.rotation.y += (Math.random() - 0.5) * s; }
    // the guns lock on to the raider nearest the crosshair, and lead it
    locked = null;
    let bestA = Infinity;
    for (const r of raiders.list) {
      if (r.f.down) continue;
      const v = r.f.pos.clone().sub(camera.position), along = v.dot(cam.look);
      if (along <= 0) continue;
      const ang = v.angleTo(cam.look), tol = Math.max(0.05, Math.atan((r.R.length * 0.8) / along));
      if (ang < tol && ang < bestA) { bestA = ang; locked = r; }
    }
    aimPoint.copy(target).addScaledVector(cam.look, 800);
  }
  function aimFor(battery) {
    reach = true;
    if (!locked) return;
    player.ship.root.updateMatrixWorld(true);
    const m = gunnery.muzzle(battery);
    if (!m) { reach = false; return; }
    aimPoint.copy(intercept(m.p, player.velocity, locked.f.aimAt(), locked.f.velocity, m.K.speed));
    reach = gunnery.reaches(battery, aimPoint);
  }

  // ---------- shots landing ----------
  let hits = 0, downed = 0;
  const BURST = { hull: [0xffa040, 22, 1], sails: [0xf5e6c8, 14, 0.7], crystals: [0xffe08a, 34, 1.4] };
  function hitTest(b, a, c) {
    if (b.owner === 'player') {
      const h = raiders.hitBy(a, c);
      if (!h) return false;
      h.r.f.hit(h.h.part, b.K.damage); hits++;
      bolts.burst(h.h.at, ...BURST[h.h.part]);
      return true;
    }
    if (player.down) return false;
    const h = firstHit(zones.get(player.ship.recipe.id), player.ship.body, a, c);
    if (!h) return false;
    player.hit(h.part, b.K.damage);
    bolts.burst(h.at, ...BURST[h.part]);
    hurt = Math.min(1, hurt + 0.45); cam.shake = 0.3;
    return true;
  }

  // ---------- the raiders come in waves (voyage.js), and pay for going down ----------
  const director = makeDirector({
    captain: () => cap, raiders, player: () => player, classOf: (id) => SHIPS.find((s) => s.id === id).cls,
    compass: (a) => COMPASS[Math.round(compassDeg(a) / 45) % 8],
    ui: { banner, toast, choice: (on) => { $('choice').hidden = !on; }, port: (open) => (open ? enterPort() : leavePort()) },
  });
  const W = director.W;
  function reward(gone) {
    for (const r of gone) {
      downed++;
      bolts.burst(r.f.pos, 0xff8a3a, 60, 2.2); bolts.burst(r.f.pos.clone().add({ x: 0, y: 3, z: 0 }), 0xffe08a, 30, 1.6);
      const how = r.f.down.why, what = `${r.name} ${how === 'hull' ? 'going down' : 'sinking, crystals dead'}`;
      if (W.mode !== 'campaign') { toast(what); continue; }
      const shards = P.bounty(cap, r.id, how, !!r.captain), before = P.levelOf(cap.renown).level;
      cap.hold += shards; cap.renown += P.renownFor(cap, r.id, !!r.captain);
      toast(`${what} · +${shards} shards${how === 'crystals' ? ' (the crystals shattered: half pay)' : ''}`);
      const after = P.levelOf(cap.renown).level;
      if (after > before) banner(`Level ${after}`, 'A skill point to spend in port');
    }
  }
  function enterPort() {
    if (cap.ship !== player.ship.recipe.id) fly(cap.ship);
    player.repair(1); abilities.reset(); ward.mesh.visible = false;
    garage.open(); cam.yaw = 2.4; cam.pitch = 0.25;
    frameView();
  }
  function leavePort() { if (cap.ship !== player.ship.recipe.id) fly(cap.ship); else outfit(); garage.close(); cam.zoom = 1; frameView(); }
  // in port the garage covers the right of the screen, so the view moves over to put the ship in the space left
  function frameView() {
    const w = innerWidth, h = innerHeight, panel = $('port').hidden ? 0 : $('port').getBoundingClientRect().width + 16;
    if (panel) camera.setViewOffset(w, h, panel / 2, 0, w, h); else camera.clearViewOffset();
  }

  // ---------- the ship buttons and the help ----------
  for (const R of SHIPS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.ship = R.id; b.innerHTML = `<b>${R.name}</b><small>${R.cls}</small>`;
    b.addEventListener('click', () => { if (W.mode === 'free' || (W.state === 'port' && cap.ships.includes(R.id))) { P.chooseShip(cap, R.id); fly(R.id); garage.render(); } });
    $('ships').append(b);
  }
  const toggleHelp = () => { const h = $('help'); h.hidden = !h.hidden; $('btn-help').hidden = !h.hidden; };
  $('btn-help').addEventListener('click', toggleHelp);
  const mini = $('minimap'), mctx = mini.getContext('2d'), mimg = new Image(); mimg.src = minimapUrl;
  // the map's drawing size follows its size on screen (small in the corner, or big in the middle), so it stays sharp
  const sizeMap = () => { const r = mini.getBoundingClientRect(); mini.width = Math.round(r.width * devicePixelRatio); mini.height = Math.round(r.height * devicePixelRatio); mctx.imageSmoothingQuality = 'high'; };
  const bigMap = () => { mini.classList.toggle('wide'); sizeMap(); };
  mini.addEventListener('click', bigMap);

  const input = makeInput(canvas, document.body);
  canvas.addEventListener('pointerdown', () => setTimeout(() => $('touch-hint').classList.add('gone'), 4000), { once: true });
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix(); frameView();
    camera.userData.pixelScale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const s of built.values()) s.glow.material.uniforms.uScale.value = camera.userData.pixelScale;
    sizeMap();
  }
  addEventListener('resize', resize);

  // ---------- the garage, the abilities, the choice after a wave, and the start ----------
  const garage = makeGarage({ captain: () => cap, names: NAMES, free: () => W.mode === 'free',
    setSail: () => { if (W.mode === 'free') { garage.close(); frameView(); W.state = 'calm'; W.timer = Math.max(W.timer, 4); } else director.setSail(); },
    changed: () => { if (cap.ship !== player.ship.recipe.id) fly(cap.ship); else outfit(); updatePurse(); } });
  const abilities = makeAbilities({ captain: () => cap, player: () => player, gunnery: () => gunnery, toast });
  $('btn-flyon').addEventListener('click', () => director.flyOn());
  $('btn-port').addEventListener('click', () => director.putIn());
  $('btn-garage').addEventListener('click', () => openFreeGarage());
  for (const b of $('abilities').querySelectorAll('[data-ability]')) b.addEventListener('click', () => abilities.use(b.dataset.ability));
  // in free flight the garage opens between waves; the game waits while it's open
  function openFreeGarage() {
    if (W.mode !== 'free' || !director.calm || W.state === 'port') return;
    W.state = 'port'; garage.open(); frameView();
  }
  // begin playing: free flight, a new Captain (fresh: true), or carrying on with the saved one
  function begin(mode, fresh = false) {
    if (mode === 'free') cap = P.freeCaptain();
    else if (fresh) { P.forget(); cap = P.newCaptain(); P.save(cap); }
    else cap = P.load() ?? P.newCaptain();
    document.body.classList.toggle('free', mode === 'free');
    $('start').hidden = true;
    player = null; fly(cap.ship);
    director.begin(mode);
    abilities.reset(); updatePurse();
  }
  $('start-continue').hidden = !P.load();
  if (P.load()) $('start-new').textContent = 'A new Captain (starts over)';
  $('start-continue').addEventListener('click', () => begin('campaign'));
  // with a Captain saved, a new one takes a second click: the saved one is forgotten
  $('start-new').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (P.load() && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Click again to start over: the saved Captain is forgotten'; return; }
    begin('campaign', true);
  });
  $('start-free').addEventListener('click', () => begin('free'));
  fly(cap.ship);
  resize();

  // ---------- the HUD ----------
  let region = '', regionTimer = 0, hudTimer = 0, hurt = 0;
  const flash = (el) => { el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  function banner(title, line) { $('banner-title').textContent = title; $('banner-line').textContent = line; flash($('banner')); }
  function toast(text) { const t = $('toast'); t.textContent = text; flash(t); }
  const proj = new THREE.Vector3();
  function tags() {
    const W2 = innerWidth / 2, H2 = innerHeight / 2, placed = [];
    for (const r of raiders.list) {
      let el = r.tag;
      if (!el) {
        el = r.tag = document.createElement('div'); el.className = 'tag';
        el.innerHTML = `<span class="arrow">▲</span><b>${r.R.cls}</b> <span class="d"></span>${PARTS.map((k) => `<span class="meter ${k}"><i></i></span>`).join('')}`;
        $('tags').append(el);
      }
      if (r.f.down) { el.remove(); continue; }
      proj.copy(r.f.pos); proj.y += r.R.length * 0.45 + 3; proj.project(camera);
      // in pixels from the middle of the screen; off screen (or behind), pinned to the edge in its direction
      const behind = proj.z > 1;
      let x = proj.x * W2 * (behind ? -1 : 1), y = -proj.y * H2 * (behind ? -1 : 1);
      const ax = W2 - 50, ay = H2 - 46, k = Math.max(Math.abs(x) / ax, Math.abs(y) / ay);
      const edge = behind || k > 1;
      if (edge) { x /= Math.max(k, 1e-6); y /= Math.max(k, 1e-6); }
      el.classList.toggle('edge', edge); el.classList.toggle('locked', r === locked);
      placed.push({ el, x: W2 + x, y: H2 + y + (edge && y > 0 ? 40 : 0) });
      if (edge) el.querySelector('.arrow').style.transform = `rotate(${Math.atan2(x, -y)}rad)`;
      el.querySelector('.d').textContent = `${Math.round(r.f.pos.distanceTo(player.pos))} m`;
      PARTS.forEach((k, i) => { el.children[3 + i].firstChild.style.width = `${r.f.frac(k) * 100}%`; });
    }
    // tags that would land on top of each other are stacked instead
    placed.sort((a, b) => a.y - b.y);
    placed.forEach((a, i) => {
      for (let j = 0; j < i; j++) { const b = placed[j]; if (Math.abs(a.x - b.x) < 84 && a.y - b.y < 40) a.y = b.y + 40; }
      a.el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`;
    });
    for (const el of [...$('tags').children]) if (!raiders.list.some((r) => r.tag === el)) el.remove();
  }
  function hud(dt, battery) {
    hudTimer -= dt;
    hurt = Math.max(0, hurt - dt * 1.2);
    $('hurt').style.opacity = String(Math.max(hurt, player.down ? 0.6 : 0));
    const n = gunnery.count(battery), rl = gunnery.ready[battery], full = gunnery.reload(battery);
    $('battery-name').textContent = n ? BATTERY_NAMES[battery] : `No ${BATTERY_NAMES[battery].toLowerCase()}`;
    $('battery-count').textContent = !n ? '–' : locked && !reach ? 'out of reach' : `${n} gun${n > 1 ? 's' : ''}`;
    $('reload-bar').style.width = `${n ? (1 - rl / full) * 100 : 0}%`;
    $('aim').className = locked ? (reach ? 'locked' : 'locked far') : '';
    tags();
    if (hudTimer > 0) return;
    hudTimer = 0.1;
    $('r-speed').textContent = `${Math.round(player.speed * 3.6)} km/h`;
    $('r-height').textContent = `${Math.round(player.pos.y).toLocaleString()} m`;
    $('r-sail').textContent = `${Math.round(player.sail * 100)}%`;
    $('sail-bar').style.width = `${player.sail * 100}%`;
    for (const k of PARTS) {
      $(`h-${k}`).style.width = `${player.frac(k) * 100}%`;
      $(`n-${k}`).textContent = Math.ceil(player.health[k]);
      $(`row-${k}`).classList.toggle('low', player.frac(k) < 0.3);
    }
    updatePurse();
    abilityBar();
    const deg = compassDeg(player.heading);
    $('compass').textContent = `${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8]} ${Math.round(deg)}°`;
    const w = $('warn');
    if (player.down) w.hidden = true;
    else if (player.frac('crystals') < 0.5) { w.hidden = false; w.textContent = 'The crystals are cracked: she\'s sinking'; }
    else if (player.pos.y > THINNING - 350) { w.hidden = false; w.textContent = 'Nearing the Thinning: the crystals can\'t lift you higher'; }
    else if (Math.abs(player.pos.x) > MAP.w / 2 + 1500 || Math.abs(player.pos.z) > MAP.h / 2 + 1500) { w.hidden = false; w.textContent = 'Open sea: Aethermoor is behind you'; }
    else w.hidden = true;
    const r = regionAt(player.pos.x, player.pos.z);
    if (r !== region && (regionTimer -= 0.1) <= 0) { region = r; regionTimer = 2; const el = $('region'); el.textContent = r; flash(el); }
    // the corner map, with the ship as a gold arrow and the raiders as red dots
    if (mimg.complete && mimg.naturalWidth) {
      const W2 = mini.width, H2 = mini.height;
      mctx.drawImage(mimg, 0, 0, W2, H2);
      const x = (player.pos.x / MAP.w + 0.5) * W2, y = (player.pos.z / MAP.h + 0.5) * H2, s = Math.max(5, W2 / 40);
      mctx.fillStyle = '#ff4636'; mctx.strokeStyle = '#3a1631'; mctx.lineWidth = Math.max(1, s / 5);
      for (const q of raiders.list) if (!q.f.down) { mctx.beginPath(); mctx.arc((q.f.pos.x / MAP.w + 0.5) * W2, (q.f.pos.z / MAP.h + 0.5) * H2, s * 0.45, 0, Math.PI * 2); mctx.fill(); mctx.stroke(); }
      mctx.save(); mctx.translate(x, y); mctx.rotate(-player.heading + Math.PI);
      mctx.fillStyle = '#e2bd67'; mctx.lineWidth = Math.max(1.5, s / 4);
      mctx.beginPath(); mctx.moveTo(0, -s * 1.3); mctx.lineTo(s * 0.8, s); mctx.lineTo(0, s * 0.45); mctx.lineTo(-s * 0.8, s); mctx.closePath(); mctx.fill(); mctx.stroke();
      mctx.restore();
    }
  }

  // the shards, the hold, the voyage and the Captain's level
  function updatePurse() {
    if (!player) return;
    const lv = P.levelOf(cap.renown);
    if (W.mode === 'free') { $('purse').innerHTML = `Free flight · wave <b>${W.n + 1}</b> · downed <b>${downed}</b>`; $('level').hidden = true; return; }
    const at = P.on(cap);
    $('purse').innerHTML = `${P.CHARTS[cap.chart].name} · voyage <b>${at.voyage}</b> · wave <b>${at.wave}</b> of ${P.wavesIn(at.voyage)} · danger <b>${P.danger(cap)}</b> · hold <b>${cap.hold}</b>${cap.streak ? ` ×${P.holdBonus(cap).toFixed(1)}` : ''} · shards <b>${cap.shards.toLocaleString()}</b>`;
    $('level').hidden = false;
    $('level-n').textContent = lv.level;
    $('level-bar').style.width = `${lv.need ? (lv.into / lv.need) * 100 : 100}%`;
    $('level-pts').textContent = P.skillPoints(cap) > 0 ? ` · ${P.skillPoints(cap)} to spend` : '';
  }
  function abilityBar() {
    const have = new Map(abilities.view().map((a) => [a.id, a]));
    for (const el of $('abilities').querySelectorAll('[data-ability]')) {
      const a = have.get(el.dataset.ability);
      el.hidden = !a;
      if (!a) continue;
      el.classList.toggle('on', a.on); el.classList.toggle('ready', a.wait <= 0);
      el.querySelector('i').style.height = `${a.wait * 100}%`;
      el.querySelector('small').textContent = a.on ? 'now' : a.wait > 0 ? `${Math.ceil(a.left)} s` : 'ready';
    }
    $('abilities').hidden = !have.size;
  }

  let last = performance.now(), time = 0, held = null;
  // one step of the game: controls, flying, the raiders, the camera, the guns, the shots, the HUD
  function tick(dt) {
    time += dt;
    const inp = held ?? input.read();
    for (const k of inp.pressed) {
      if (k >= '1' && k <= '6') { const id = SHIPS[+k - 1].id; if (W.mode === 'free' || (W.state === 'port' && cap.ships.includes(id))) { P.chooseShip(cap, id); fly(id); garage.render(); } }
      else if (k === 'c') { cam.yaw = 0; cam.pitch = 0.2; }
      else if (k === 'm') bigMap();
      else if (k === 'h') toggleHelp();
      else if (k === 'z') abilities.use('surge');
      else if (k === 'x') abilities.use('double');
      else if (k === 'v') abilities.use('control');
      else if (k === 'b') abilities.use('ward');
      else if (k === 'g') { if (W.state === 'port' && W.mode === 'free') { garage.close(); frameView(); W.state = 'calm'; W.timer = Math.max(W.timer, 4); } else openFreeGarage(); }
      else if (k === 'Enter' && W.state === 'after') director.flyOn();
      else if (k === 'p' && W.state === 'after') director.putIn();
      else if (k === 'Enter' && W.state === 'port' && W.mode === 'campaign') director.setSail();
    }
    // in port (or the free-flight garage) the world waits: the ship rides at anchor and the camera turns round her
    if (W.state === 'port') {
      player.ship.root.position.copy(player.pos); player.ship.root.rotation.set(0, player.heading, 0);
      player.ship.update(dt, { calm: true, turn: 0, climb: 0 });
      player.ship.root.updateMatrixWorld(true);
      cam.yaw += dt * 0.08; cam.zoom = 0.85;
      placeCamera(dt, { ...inp, look: { x: inp.look.x, y: inp.look.y }, lastLook: performance.now() / 1000 });
      world.time.value = time; world.puffs.follow(player.pos);
      sun.target.position.copy(player.pos); sun.position.copy(player.pos).addScaledVector(SUN, 400);
      player.ship.glow.material.uniforms.uScale.value = camera.userData.pixelScale;
      director.update(dt);
      hud(dt, 'bow');
      return;
    }
    // the flagship's working parts: sail set, gun decks manned in a fight (or when a side is fired), damage shown
    const C = player.ship.control, facing = batteryFor(cam.yaw);
    if (C) {
      C.sail = player.sail;
      const fight = W.state === 'fight' && !player.down;
      for (const s of ['port', 'starboard']) C.stations[s] = fight || (inp.fire && facing === s) ? 1 : 0;
      for (const k of PARTS) C.damage[k] = 1 - player.frac(k);
    }
    abilities.update(dt);
    player.update(dt, inp);
    player.ship.root.updateMatrixWorld(true);
    const gone = raiders.update(dt, player, camera);
    placeCamera(dt, inp);
    const battery = batteryFor(cam.yaw);
    aimFor(battery);
    gunnery.update(dt);
    if (inp.fire && !player.down && gunnery.fire(battery, aimPoint, bolts, 'player', player.velocity)) player.ship.fire?.(battery);
    bolts.update(dt, hitTest, camera);
    smokeFrom(player, smoke, bolts.spark, dt);
    for (const r of raiders.list) smokeFrom(r.f, smoke, bolts.spark, dt);
    smoke.update(dt, camera);
    ward.update(player.ship, player.down ? 0 : abilities.ward(), time);
    reward(gone);
    director.update(dt);
    world.time.value = time;
    world.puffs.follow(player.pos);
    sun.target.position.copy(player.pos); sun.position.copy(player.pos).addScaledVector(SUN, 400);
    art.M.canvas.userData.time.value = time;
    art.M.gem.emissiveIntensity = 0.55 + Math.sin(time * 2.4) * 0.09;
    player.ship.glow.material.uniforms.uScale.value = camera.userData.pixelScale;
    hud(dt, battery);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.body.classList.add('ready');

  // for tools/check.mjs
  window.__game = {
    ready: true, get player() { return player; }, get gunnery() { return gunnery; }, cam, fly, input, raiders, bolts, renderer, camera, scene, waves: W,
    get captain() { return cap; }, director, garage, abilities, ward, begin, P,
    get hits() { return hits; }, get downed() { return downed; }, get locked() { return locked; },
    // run the game's clock without drawing, holding these controls (for tests on slow software rendering;
    // tools/sim-voyage.mjs uses longer ticks to sail faster)
    step(seconds, controls = {}, dt = 1 / 60) {
      held = { turn: 0, climb: 0, sail: 0, fire: false, look: { x: 0, y: 0 }, zoom: 0, pressed: new Set(), lastLook: performance.now() / 1000, locked: false, ...controls };
      for (let t = 0; t < seconds - 1e-6; t += dt) tick(dt);
      held = null;
    },
  };
}

main().catch((err) => {
  console.error(err);
  const e = $('error'); e.hidden = false; e.textContent = `The game couldn't start: ${err.message}`;
});
