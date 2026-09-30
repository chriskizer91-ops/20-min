import * as THREE from 'three';
import mapPainting from '../../art/map/gloomfen-region.webp';
import { fonts } from '../assets.js';
import { MAP, PLACES, WINDOWS, LIGHT_PATH } from '../data/places.js';
import { PaintCamera } from '../paint.js';
import { buildCutouts } from '../layers.js';
import { Stage, LAYER_GLOW } from '../stage.js';
import { createAirship } from '../actors/airship.js';
import { createWitch } from '../actors/witch.js';
import { createCrow } from '../actors/villagers.js';
import { glowSprite, onLayer } from '../actors/kit.js';
import { createKeys } from '../input.js';
import { createSound } from '../audio/sound.js';

// The airship demo: the witch's skiff flying over the painted map of the Gloomfen, between her village and
// Bogmire. Nothing happens in the air but the flight: cute music, clouds, the lit towns below. Tap the map to
// fly somewhere, steer with the arrow keys, or pick a town and she flies there and sets down at its dock.

const CRUISE = 4.5; // m/s: Wickhollow to Bogmire in about 25 seconds
const CRUISE_ALT = 7, DOCK_ALT = 1.3; // m above the map
const TURN = 1.5; // rad/s at most
const SHIP_SCALE = 1.6; // about the size of the skiffs painted at the docks
const TUNES = [{ id: 'flight', name: 'Sunstone Wind' }, { id: 'travel', name: 'Over the Wilds' }];

// Three looks for the same daytime painting. The grade tints the painting; the lights match it.
const TIMES = {
  day: { name: 'Day', tint: [1, 1, 1], saturation: 1, lift: [0, 0, 0], vignette: 0.25, sky: '#fff4de', ground: '#50603c', hemi: 1.5, sun: '#fff0d4', sunI: 1.8, windows: 0, clouds: '#ffffff', cloudOpacity: 1, shadow: 0.35 },
  dusk: { name: 'Dusk', tint: [1.06, 0.76, 0.6], saturation: 0.95, lift: [0.025, 0.008, 0.03], vignette: 0.7, sky: '#ffb892', ground: '#3a2a48', hemi: 1.1, sun: '#ffa26a', sunI: 1.5, windows: 0.75, clouds: '#ffd2bc', cloudOpacity: 1, shadow: 0.28 },
  night: { name: 'Night', tint: [0.3, 0.37, 0.66], saturation: 0.55, lift: [0, 0.004, 0.02], vignette: 1.1, sky: '#9ab0ff', ground: '#1a1830', hemi: 0.8, sun: '#c4d0ff', sunI: 0.9, windows: 1, clouds: '#6f7cb8', cloudOpacity: 0.92, shadow: 0.18 },
};
const ORDER = ['night', 'dusk', 'day'];

async function boot() {
  for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  const painting = await new Promise((res, rej) => new THREE.TextureLoader().load(mapPainting, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    res(t);
  }, undefined, rej));
  const paint = new PaintCamera(MAP.size, MAP.camera);
  const world = new THREE.Scene();
  const cutouts = buildCutouts({ layers: [] }, paint, painting);
  world.add(cutouts.group);
  const canvas = document.getElementById('stage');
  const stage = new Stage(canvas, { paint, painting, world, cutouts });
  const audio = createSound();
  const at = (x, y, h = 0) => paint.toWorld(x, y, h);
  const place = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  for (const p of PLACES) {
    p.ground = at(...p.pixel);
    p.dockAt = p.dock ? at(...p.dock) : p.ground;
  }

  // ---------------------------------------------------------------- light, time of day
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.position.set(-30, 60, -20);
  const lights = new THREE.Group();
  lights.add(hemi, sun, sun.target);
  lights.traverse((o) => o.layers.enableAll());
  world.add(lights);
  let time = pickTime();
  const look = structuredClone(TIMES[time]);

  // Lit windows and a few marsh-lights drifting over the wild places, both only after dark
  const windows = WINDOWS.map(([x, y], i) => {
    const g = glowSprite(i % 3 ? '#ffc46e' : '#ffae5a', 4, 0, LAYER_GLOW);
    const core = glowSprite('#fff1c8', 0.9, 1, LAYER_GLOW);
    g.material.depthTest = core.material.depthTest = false;
    g.position.copy(at(x, y, 0.4));
    core.position.copy(g.position);
    world.add(g, core);
    return { g, core, seed: Math.random() * 10 };
  });
  const wisps = PLACES.filter((p) => p.kind === 'wild').flatMap((p) => [0, 1].map((k) => {
    const g = glowSprite(p.hidden ? '#c77dff' : '#8fffa0', 1.6, 0, LAYER_GLOW);
    g.material.depthTest = false;
    world.add(g);
    return { g, home: p.ground.clone(), a: Math.random() * 6, r: 1.5 + k * 1.8, s: 0.3 + Math.random() * 0.3 };
  }));

  // The stolen lights: violet flames drifting down the waterways toward Mother's Hollow, to show the way
  const trail = new THREE.CatmullRomCurve3(LIGHT_PATH.map(([x, y]) => at(x, y)));
  const trailLength = trail.getLength();
  const flames = Array.from({ length: 16 }, (_, i) => {
    const g = glowSprite('#c77dff', 2.4, 0, LAYER_GLOW);
    const core = glowSprite('#f4e4ff', 0.55, 0, LAYER_GLOW);
    g.material.depthTest = core.material.depthTest = false;
    world.add(g, core);
    return { g, core, u: i / 16, seed: Math.random() * 10 };
  });

  // ---------------------------------------------------------------- clouds
  const cloudTex = [0, 1, 2].map((k) => cloudTexture(k));
  const shadowTex = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
  })());
  const span = { x0: at(0, 512).x - 10, x1: at(1536, 512).x + 10 };
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], transparent: true, depthWrite: false, opacity: 0.9 }));
    const w = 8 + (i * 5) % 7;
    s.scale.set(w, w * 0.5, 1);
    s.center.set(0.5, 0.2); // anchored near its flat base
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, w * 0.45), new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0.1, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = -2;
    const px = [180, 1040, 640, 1480, 420, 860][i], py = [300, 180, 860, 420, 980, 340][i];
    const g = at(px, py);
    const c = { s, shadow, x: g.x, z: g.z, y: 13 + (i % 3) * 2.5, speed: 0.35 + (i % 4) * 0.08 };
    world.add(s, shadow);
    return c;
  });

  // ---------------------------------------------------------------- the skiff and her crew
  const ship = createAirship();
  ship.root.scale.setScalar(SHIP_SCALE);
  world.add(ship.root, ship.fx);
  const witch = createWitch();
  witch.root.position.copy(ship.helm);
  ship.deck.add(witch.root);
  world.add(witch.fx);
  const crow = createCrow();
  crow.root.position.copy(ship.perch);
  crow.root.rotation.y = -0.9;
  ship.deck.add(crow.root);
  onLayer(ship.root);

  const home = place.wickhollow;
  const S = {
    mode: 'docked', at: home.id, pos: home.dockAt.clone(), alt: DOCK_ALT, heading: home.heading,
    speed: 0, turn: 0, climb: 0, target: null, landAt: null, show: null, seen: new Set(), overview: false, tune: 0,
  };

  // ---------------------------------------------------------------- HUD
  const $ = (id) => document.getElementById(id);
  const labels = PLACES.map((p) => {
    const el = document.createElement('button');
    el.className = `label ${p.kind}`;
    el.innerHTML = p.kind === 'town' ? `<b>${p.name}</b>` : p.kind === 'sight' ? `<span>${p.name}</span>` : `<i></i><span>${p.hidden ? '???' : p.name}</span>`;
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); flyTo(p.id); });
    $('labels').append(el);
    return { p, el };
  });
  for (const id of ['wickhollow', 'bogmire']) $(`go-${id}`).addEventListener('click', () => { audio.unlock(); flyTo(id); });
  $('btn-takeoff').addEventListener('click', () => { audio.unlock(); takeOff(); });
  $('btn-land').addEventListener('click', () => { if (S.near) flyTo(S.near.id); });
  $('btn-close').addEventListener('click', () => showCard(null));
  $('btn-time').addEventListener('click', () => { time = ORDER[(ORDER.indexOf(time) + 1) % ORDER.length]; saveTime(time); audio.sfx('ui-confirm'); syncButtons(); });
  $('btn-map').addEventListener('click', () => { S.overview = !S.overview; audio.sfx('map-open'); syncButtons(); });
  $('btn-tune').addEventListener('click', () => {
    audio.unlock();
    S.tune = (S.tune + 1) % TUNES.length;
    if (S.mode !== 'docked') audio.music(TUNES[S.tune].id);
    syncButtons();
  });
  $('btn-sound').addEventListener('click', () => { audio.unlock(); const on = !audio.enabled; audio.setEnabled(on); audio.setMusicEnabled(on); syncButtons(); });
  function syncButtons() {
    $('btn-time').textContent = TIMES[time].name;
    $('btn-map').textContent = S.overview ? 'Follow' : 'Map';
    $('btn-map').setAttribute('aria-pressed', String(S.overview));
    $('btn-tune').textContent = `♪ ${TUNES[S.tune].name}`;
    $('btn-sound').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  }
  syncButtons();

  // The card at the bottom: a town when she's docked, or a wild place she's flying over.
  function showCard(p) {
    S.show = p;
    const card = $('card');
    card.hidden = !p;
    $('dest').hidden = !!p;
    if (!p) return;
    card.dataset.kind = p.kind;
    $('card-name').textContent = p.hidden ? 'A light in the willows' : p.name;
    const from = p.from && place[p.from];
    $('card-sub').textContent = p.kind === 'town' ? (S.mode === 'docked' ? 'Docked' : 'Town') : p.kind === 'sight' ? 'Seen from the air' : `Wild place · on foot from ${from.name}`;
    $('card-text').textContent = p.blurb;
    const rows = [];
    if (p.foes) rows.push(['Foes', p.foes]);
    if (p.herbs && p.herbs[0] !== '—') rows.push([p.kind === 'town' ? 'Herbs in town' : 'Herbs', p.herbs]);
    if (p.near) rows.push(['On foot from here', p.near.map((id) => place[id].hidden ? '???' : place[id].name)]);
    $('card-rows').replaceChildren(...rows.map(([k, list]) => {
      const row = document.createElement('p');
      row.innerHTML = `<b>${k}</b> ${list.map((x) => `<span>${x}</span>`).join('')}`;
      return row;
    }));
    const docked = S.mode === 'docked' && p.kind === 'town';
    const other = p.id === 'wickhollow' ? place.bogmire : place.wickhollow;
    $('btn-takeoff').hidden = !docked;
    $('btn-close').hidden = docked;
    const go = $('btn-go');
    go.hidden = !docked;
    go.textContent = `Fly to ${other.name}`;
    go.onclick = () => { audio.unlock(); flyTo(other.id); };
  }

  // ---------------------------------------------------------------- flying
  function takeOff() {
    if (S.mode !== 'docked') return;
    S.mode = 'flying';
    S.at = null;
    audio.sfx('ship-takeoff');
    setTimeout(() => audio.sfx('sails'), 900);
    audio.music(TUNES[S.tune].id);
    witch.setMood?.('happy');
    showCard(null);
  }

  function flyTo(id) {
    const p = place[id];
    if (S.mode === 'docked' && S.at === id) { showCard(p); return; }
    audio.sfx('ui-confirm');
    takeOff();
    S.target = (p.kind === 'town' ? p.dockAt : p.ground).clone();
    S.landAt = p.kind === 'town' ? id : null;
    S.goal = p;
    showCard(null);
  }

  function land(p) {
    S.mode = 'landing';
    S.landAt = p.id;
    S.target = null;
    audio.sfx('ship-land');
  }

  function docked(p) {
    S.mode = 'docked';
    S.at = p.id;
    S.speed = 0;
    audio.sfx('dock-clamp');
    audio.music(p.music);
    witch.play?.('cheer');
    showCard(p);
  }

  const keys = createKeys((what) => {
    audio.unlock();
    if (what === 'act') {
      if (S.mode === 'docked') takeOff();
      else if (S.near) flyTo(S.near.id);
    }
    if (what === 'back') showCard(null);
  });

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    const px = stage.screenToPixel(e.clientX, e.clientY);
    // A tap near a place flies there; anywhere else, she flies over that spot.
    const hit = PLACES.find((p) => Math.hypot(p.pixel[0] - px.x, p.pixel[1] - px.y) < 45);
    if (hit) return flyTo(hit.id);
    const clamped = clampPixel(px);
    if (S.mode === 'docked') takeOff();
    if (S.mode === 'landing') return;
    S.target = at(clamped.x, clamped.y);
    S.landAt = null;
    S.goal = null;
    const mark = $('tapmark');
    const sp = stage.pixelToScreen(clamped);
    mark.style.transform = `translate(${sp.x}px, ${sp.y}px)`;
    mark.classList.remove('on');
    void mark.offsetWidth;
    mark.classList.add('on');
  });

  function clampPixel(p) {
    return new THREE.Vector2(THREE.MathUtils.clamp(p.x, 70, MAP.size[0] - 70), THREE.MathUtils.clamp(p.y, 150, MAP.size[1] - 60));
  }

  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function fly(dt) {
    let desired = null, throttle = 0;
    const k = keys.vector();
    if (k && S.mode !== 'landing') {
      if (S.mode === 'docked') takeOff();
      S.target = null;
      S.landAt = null;
      S.goal = null;
      desired = Math.atan2(k.x, k.z);
      throttle = 1;
    } else if (S.target && S.mode === 'flying') {
      const dx = S.target.x - S.pos.x, dz = S.target.z - S.pos.z;
      const d = Math.hypot(dx, dz);
      desired = Math.atan2(dx, dz);
      throttle = Math.min(1, d / 9);
      if (d < 0.35 + S.speed * 0.12) {
        const goal = S.goal;
        S.target = null;
        if (S.landAt) land(place[S.landAt]);
        else if (goal) showCard(goal);
      }
    }
    if (S.mode === 'landing') {
      const p = place[S.landAt];
      S.pos.lerp(p.dockAt, 1 - Math.exp(-dt * 2));
      desired = p.heading;
      throttle = 0;
    }
    if (desired !== null) {
      const diff = wrap(desired - S.heading);
      const turn = THREE.MathUtils.clamp(diff * 2.2, -TURN, TURN);
      S.heading = wrap(S.heading + turn * dt);
      S.turn += (turn - S.turn) * (1 - Math.exp(-dt * 4));
      throttle *= Math.max(0.2, (Math.cos(diff) + 1) / 2);
    } else S.turn *= Math.exp(-dt * 4);
    // She can't go fast until she's up
    throttle *= THREE.MathUtils.clamp((S.alt - DOCK_ALT) / 3, 0.15, 1);
    S.speed += (CRUISE * throttle - S.speed) * (1 - Math.exp(-dt * 1.4));
    S.pos.x += Math.sin(S.heading) * S.speed * dt;
    S.pos.z += Math.cos(S.heading) * S.speed * dt;
    const px = paint.toPixel(S.pos);
    const c = clampPixel(px);
    if (c.x !== px.x || c.y !== px.y) S.pos.copy(at(c.x, c.y));

    const wantAlt = S.mode === 'flying' ? CRUISE_ALT : DOCK_ALT;
    const before = S.alt;
    S.alt += (wantAlt - S.alt) * (1 - Math.exp(-dt * (S.mode === 'flying' ? 0.9 : 1.3)));
    S.climb = (S.alt - before) / Math.max(dt, 1e-4);
    if (S.mode === 'landing' && Math.abs(S.alt - DOCK_ALT) < 0.05 && S.pos.distanceTo(place[S.landAt].dockAt) < 0.1) docked(place[S.landAt]);

    // Near a town in the air, offer to land; near a wild place, say what's there.
    S.near = null;
    if (S.mode === 'flying') {
      for (const p of PLACES) {
        const d = Math.hypot(p.ground.x - S.pos.x, p.ground.z - S.pos.z);
        if (p.kind === 'town' && d < 9) S.near = p;
        if (p.kind !== 'town' && d < 5 && !S.target && S.show !== p) {
          showCard(p);
          if (!S.seen.has(p.id)) { S.seen.add(p.id); audio.sfx('new-area'); }
        }
      }
      if (S.show && S.show.kind !== 'town' && Math.hypot(S.show.ground.x - S.pos.x, S.show.ground.z - S.pos.z) > 9 && S.goal !== S.show) showCard(null);
    }
    $('btn-land').hidden = !S.near || !!S.target || !!S.show;
    if (S.near) $('btn-land').textContent = `Land at ${S.near.name}`;
  }

  // ---------------------------------------------------------------- frame
  const zoomFor = () => {
    const { w, h } = stage.cssSize;
    const base = Math.max(w / MAP.size[0], h / MAP.size[1]);
    // About 760 painting pixels across the long side of a screen; closer on a phone held upright
    return S.overview ? 1 : THREE.MathUtils.clamp(Math.max(w, h) / (base * (h > w ? 580 : 760)), 1, 2.6);
  };
  stage.setZoom(zoomFor(), true);
  addEventListener('resize', () => { stage.resize(); stage.setZoom(zoomFor(), true); });

  const focus = new THREE.Vector3();
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.05);
    last = now;
    t += dt;
    fly(dt);

    ship.root.position.set(S.pos.x, S.alt, S.pos.z);
    ship.root.rotation.y = S.heading;
    ship.update(dt, S.speed, S.turn, S.climb, 0);
    witch.update(dt, 0, 0);
    crow.update(dt, 'stand', ship.perch.y);

    // Time of day: glide the grade and the lights toward the chosen look
    const L = TIMES[time], g = 1 - Math.exp(-dt * 2);
    for (const k of ['saturation', 'vignette', 'hemi', 'sunI', 'windows', 'cloudOpacity', 'shadow']) look[k] += (L[k] - look[k]) * g;
    stage.grade.tint.lerp(new THREE.Color(...L.tint), g);
    stage.grade.lift.lerp(new THREE.Color(...L.lift), g);
    stage.grade.saturation = look.saturation;
    stage.grade.vignette = look.vignette;
    hemi.color.lerp(new THREE.Color(L.sky), g);
    hemi.groundColor.lerp(new THREE.Color(L.ground), g);
    hemi.intensity = look.hemi;
    sun.color.lerp(new THREE.Color(L.sun), g);
    sun.intensity = look.sunI;
    ship.shadow.material.opacity *= look.shadow / 0.35;
    for (const w of windows) {
      const f = 1 + Math.sin(t * 3 + w.seed) * 0.08 + Math.sin(t * 7.7 + w.seed) * 0.06;
      w.g.material.opacity = look.windows * 0.8 * f;
      w.core.material.opacity = look.windows * f;
    }
    for (const w of wisps) {
      w.a += dt * w.s;
      w.g.position.set(w.home.x + Math.cos(w.a) * w.r, 0.8 + Math.sin(w.a * 2.3) * 0.4, w.home.z + Math.sin(w.a) * w.r * 0.7);
      w.g.material.opacity = look.windows * (0.55 + Math.sin(t * 5 + w.a) * 0.2);
    }
    for (const f of flames) {
      f.u = (f.u + dt * 0.7 / trailLength) % 1;
      const p = trail.getPointAt(f.u);
      p.y = 2.2 + Math.sin(t * 1.7 + f.seed) * 0.35;
      p.x += Math.sin(t * 0.9 + f.seed) * 0.5;
      f.g.position.copy(p);
      f.core.position.copy(p);
      const fade = Math.min(1, f.u * 8, (1 - f.u) * 8) * (0.35 + look.windows * 0.65);
      f.g.material.opacity = fade * (0.7 + Math.sin(t * 9 + f.seed) * 0.1);
      f.core.material.opacity = fade;
    }
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > span.x1) c.x = span.x0;
      c.s.position.set(c.x, c.y, c.z);
      c.shadow.position.set(c.x, 0.03, c.z);
      c.s.material.color.lerp(new THREE.Color(L.clouds), g);
      c.s.material.opacity = look.cloudOpacity;
      c.shadow.material.opacity = look.shadow * 0.35;
    }

    // The camera follows the ship, a little ahead of where she's going
    if (S.overview) focus.set(0, 0, 0), stage.setFocus(new THREE.Vector2(MAP.size[0] / 2, MAP.size[1] / 2));
    else {
      focus.set(S.pos.x + Math.sin(S.heading) * S.speed * 0.6, S.alt * 0.6, S.pos.z + Math.cos(S.heading) * S.speed * 0.6);
      // Centre her in the space above the panel at the bottom, not the whole screen
      const free = $('dock').getBoundingClientRect().top - 8;
      const fp = paint.toPixel(focus);
      fp.y += Math.max(0, stage.cssSize.h / 2 - free / 2) / stage.scale;
      stage.setFocus(fp);
    }
    if (Math.abs(stage.zoomTarget - zoomFor()) > 1e-3) stage.setZoom(zoomFor());
    stage.update(dt);
    stage.render();

    for (const { p, el } of labels) {
      const s = stage.pixelToScreen(new THREE.Vector2(...p.pixel));
      const off = s.x < -80 || s.y < -40 || s.x > stage.cssSize.w + 80 || s.y > stage.cssSize.h + 40;
      el.hidden = off || (S.mode === 'docked' && S.at === p.id);
      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      el.classList.toggle('goal', S.goal === p);
    }
    requestAnimationFrame(frame);
  }

  showCard(home);
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
  window.__airship = { THREE, stage, paint, ship, witch, state: S, places: place, flyTo, takeOff, setTime: (k) => { time = k; syncButtons(); } };
}

function pickTime() {
  try { const k = localStorage.getItem('airship-time'); if (k in TIMES) return k; } catch { /* no storage */ }
  return 'night'; // the game is one full-moon night
}
function saveTime(k) {
  try { localStorage.setItem('airship-time', k); } catch { /* no storage */ }
}

// A painted cumulus: a flat base, round heads piled up in the middle, lit from above and shaded underneath,
// with a soft edge. Drawn once per kind.
function cloudTexture(seed) {
  const W = 512, H = 256;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const heads = [];
  const n = 7 + seed;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = 70 + u * 372 + (rnd() - 0.5) * 30;
    const r = 34 + Math.sin(u * Math.PI) * (40 + rnd() * 26);
    heads.push([x, 196 - r * (0.55 + rnd() * 0.3), r]);
  }
  const shape = document.createElement('canvas');
  shape.width = W; shape.height = H;
  const g = shape.getContext('2d');
  const silhouette = (dy, shrink) => {
    g.beginPath();
    for (const [x, y, r] of heads) { g.moveTo(x + r * shrink, y + dy); g.arc(x, y + dy, r * shrink, 0, Math.PI * 2); }
    g.ellipse(256, 196 + dy, 200 * shrink, 22, 0, 0, Math.PI * 2);
    g.fill();
  };
  g.save();
  g.beginPath();
  g.rect(0, 0, W, 206);
  g.clip(); // a flat bottom
  g.fillStyle = '#7f86b8';
  silhouette(0, 1);
  g.fillStyle = '#c3c8e6';
  silhouette(-12, 0.92);
  g.fillStyle = '#ffffff';
  silhouette(-26, 0.78);
  // Sunlit rims on the tops of the heads
  g.fillStyle = 'rgba(255, 250, 240, 0.9)';
  for (const [x, y, r] of heads) { g.beginPath(); g.arc(x - r * 0.15, y - 26 - r * 0.2, r * 0.55, 0, Math.PI * 2); g.fill(); }
  g.restore();
  // Soften the edge
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const out = c.getContext('2d');
  out.filter = 'blur(3px)';
  out.drawImage(shape, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The map couldn't start: ${err.message}`; }
});

