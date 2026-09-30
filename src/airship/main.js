import * as THREE from 'three';
import mapPainting from '../../art/map/world-night.webp';
import cloudAtlas from '../../art/fx/night-clouds.webp';
import lightsAtlas from '../../art/fx/drifting-lights.webp';
import { fonts } from '../assets.js';
import { MAP, PLACES, LIGHT_PATH } from '../data/places.js';
import { PaintCamera } from '../paint.js';
import { buildCutouts } from '../layers.js';
import { Stage, LAYER_GLOW } from '../stage.js';
import { createAirship } from '../actors/airship.js';
import { createWitch } from '../actors/witch.js';
import { createCrow } from '../actors/party-crow.js';
import { createNettie } from '../actors/nettie.js';
import { glowSprite, onLayer } from '../actors/kit.js';
import { createKeys } from '../input.js';
import { createSound } from '../audio/sound.js';

// The airship demo: the Magpie flying over the painted valley at night, down the Sable from the witch's village
// to Bogmire. Nothing happens in the air but the flight: cute music, clouds, the lit towns below. Tap the map to
// fly somewhere, steer with the arrow keys, or pick a town and she flies there and sets down at its dock.

const CRUISE = 4.5; // m/s: Wickhollow to Bogmire in about 25 seconds
const CRUISE_ALT = 7; // m above the map; each town has its own dock height (the jetty, Bogmire's mast)
const TURN = 1.5; // rad/s at most
const SHIP_SCALE = 1.6;
const TUNES = [{ id: 'flight', name: 'Sunstone Wind' }, { id: 'travel', name: 'Over the Wilds' }];

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

  // ---------------------------------------------------------------- moonlight
  // The painting is already night, so it isn't graded; the models get a cool moon from the top right, where the
  // painted moon is, and a dim violet sky.
  const hemi = new THREE.HemisphereLight('#9aa8ff', '#1c1830', 0.95);
  const moon = new THREE.DirectionalLight('#d2d8ff', 1.1);
  moon.position.set(40, 60, -40);
  const lights = new THREE.Group();
  lights.add(hemi, moon, moon.target);
  lights.traverse((o) => o.layers.enableAll());
  world.add(lights);

  // Marsh-lights drifting over the wild places
  const wisps = PLACES.filter((p) => p.kind === 'wild').flatMap((p) => [0, 1].map((k) => {
    const g = glowSprite(p.hidden ? '#c77dff' : '#8fffa0', 1.6, 0, LAYER_GLOW);
    g.material.depthTest = false;
    world.add(g);
    return { g, home: p.ground.clone(), a: Math.random() * 6, r: 1.5 + k * 1.8, s: 0.3 + Math.random() * 0.3 };
  }));

  // The stolen lights: painted violet flames (art/fx/drifting-lights.webp, four frames) drifting down the Sable
  // toward Mother's Hollow, to show the way
  const [lightsTex, cloudTex] = await Promise.all([loadTexture(lightsAtlas), loadTexture(cloudAtlas)]);
  const trail = new THREE.CatmullRomCurve3(LIGHT_PATH.map(([x, y]) => at(x, y)));
  const trailLength = trail.getLength();
  const flames = Array.from({ length: 14 }, (_, i) => {
    const tex = lightsTex.clone();
    tex.repeat.set(0.25, 0.5);
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    f.scale.set(1.5, 1.5, 1);
    f.layers.set(LAYER_GLOW);
    const g = glowSprite('#b25cff', 3.2, 0, LAYER_GLOW);
    g.material.depthTest = false;
    world.add(g, f);
    return { f, tex, g, u: i / 14, seed: Math.random() * 10 };
  });

  // ---------------------------------------------------------------- clouds: the batch's painted night clouds (the puffy ones; the swirls read as storms)
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
  // Placed by where they show: each floats about 150 painting pixels above the ground point it's over
  const clouds = [[560, 760, 0], [980, 560, 1], [1420, 520, 4], [220, 980, 3], [780, 1060, 1], [60, 700, 4]].map(([px, py, k], i) => {
    const tex = cloudTex.clone();
    tex.repeat.set(1 / 3, 1 / 2);
    tex.offset.set((k % 3) / 3, k < 3 ? 0.5 : 0);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 }));
    const w = 13 + (i * 5) % 7;
    s.scale.set(w, w, 1);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.5), new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = -2;
    const g = at(px, py);
    world.add(s, shadow);
    // Each drifts east across the valley at its own depth, and comes round again from the west
    return { s, shadow, x: g.x, z: g.z, y: 14 + (i % 3) * 2.5, speed: 0.3 + (i % 4) * 0.07, x0: at(0, py).x - w, x1: at(1536, py).x + w };
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
  // Nettie comes aboard at Bogmire, where she joins the party (docs/SLICE.md)
  const nettie = createNettie();
  nettie.root.position.set(0.32, -0.06, 1.35);
  nettie.root.rotation.y = 0.5;
  nettie.root.visible = false;
  ship.deck.add(nettie.root);
  world.add(nettie.fx);
  onLayer(ship.root);

  const home = place.wickhollow;
  const S = {
    mode: 'docked', at: home.id, pos: home.dockAt.clone(), alt: home.dockAlt, heading: home.heading,
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
  $('btn-map').addEventListener('click', () => { S.overview = !S.overview; audio.sfx('map-open'); syncButtons(); });
  $('btn-tune').addEventListener('click', () => {
    audio.unlock();
    S.tune = (S.tune + 1) % TUNES.length;
    if (S.mode !== 'docked') audio.music(TUNES[S.tune].id);
    syncButtons();
  });
  $('btn-sound').addEventListener('click', () => { audio.unlock(); const on = !audio.enabled; audio.setEnabled(on); audio.setMusicEnabled(on); syncButtons(); });
  function syncButtons() {
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
    if (p.id === 'bogmire' && !nettie.root.visible) {
      // She's been waiting at the mast with her staff and lantern
      setTimeout(() => {
        nettie.root.visible = true;
        nettie.play('cheer');
        audio.sfx('deck-steps');
        $('card-text').textContent = `${p.blurb} Nettie climbs aboard: "Took your time."`;
      }, 900);
    }
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
    const B = MAP.bounds;
    return new THREE.Vector2(THREE.MathUtils.clamp(p.x, B.x0, B.x1), THREE.MathUtils.clamp(p.y, B.y0, B.y1));
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
    throttle *= THREE.MathUtils.clamp((S.alt - 1.3) / 3, 0.15, 1);
    S.speed += (CRUISE * throttle - S.speed) * (1 - Math.exp(-dt * 1.4));
    S.pos.x += Math.sin(S.heading) * S.speed * dt;
    S.pos.z += Math.cos(S.heading) * S.speed * dt;
    const px = paint.toPixel(S.pos);
    const c = clampPixel(px);
    if (c.x !== px.x || c.y !== px.y) S.pos.copy(at(c.x, c.y));

    const dockAlt = place[S.landAt ?? S.at]?.dockAlt ?? 1.3;
    const wantAlt = S.mode === 'flying' ? CRUISE_ALT : dockAlt;
    const before = S.alt;
    S.alt += (wantAlt - S.alt) * (1 - Math.exp(-dt * (S.mode === 'flying' ? 0.9 : 1.3)));
    S.climb = (S.alt - before) / Math.max(dt, 1e-4);
    if (S.mode === 'landing' && Math.abs(S.alt - dockAlt) < 0.05 && S.pos.distanceTo(place[S.landAt].dockAt) < 0.1) docked(place[S.landAt]);

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
    if (nettie.root.visible) nettie.update(dt, 0, 0);

    ship.shadow.material.opacity *= 0.55; // a moon shadow, fainter than the sun's
    for (const w of wisps) {
      w.a += dt * w.s;
      w.g.position.set(w.home.x + Math.cos(w.a) * w.r, 0.8 + Math.sin(w.a * 2.3) * 0.4, w.home.z + Math.sin(w.a) * w.r * 0.7);
      w.g.material.opacity = 0.5 + Math.sin(t * 5 + w.a) * 0.2;
    }
    for (const f of flames) {
      f.u = (f.u + dt * 0.7 / trailLength) % 1;
      const p = trail.getPointAt(f.u);
      p.y = 2.2 + Math.sin(t * 1.7 + f.seed) * 0.35;
      p.x += Math.sin(t * 0.9 + f.seed) * 0.5;
      f.f.position.copy(p);
      f.g.position.copy(p);
      const frame = Math.floor(t * 8 + f.seed * 3) % 4;
      f.tex.offset.set(frame * 0.25, 0.5);
      const fade = Math.min(1, f.u * 8, (1 - f.u) * 8);
      f.f.material.opacity = fade;
      f.g.material.opacity = fade * (0.55 + Math.sin(t * 9 + f.seed) * 0.08);
    }
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > c.x1) c.x = c.x0;
      c.s.position.set(c.x, c.y, c.z);
      c.shadow.position.set(c.x, 0.03, c.z);
    }

    // The camera follows the ship, a little ahead of where she's going
    if (S.overview) focus.set(0, 0, 0), stage.setFocus(new THREE.Vector2(MAP.size[0] / 2, MAP.size[1] / 2));
    else {
      focus.set(S.pos.x + Math.sin(S.heading) * S.speed * 0.6, S.alt * 0.6, S.pos.z + Math.cos(S.heading) * S.speed * 0.6);
      // Centre her in the space above the panel at the bottom, not the whole screen
      const panel = $('dock').getBoundingClientRect();
      const free = panel.height ? panel.top - 8 : stage.cssSize.h;
      const fp = paint.toPixel(focus);
      fp.y += Math.max(0, stage.cssSize.h / 2 - free / 2) / stage.scale;
      stage.setFocus(fp);
    }
    if (Math.abs(stage.zoomTarget - zoomFor()) > 1e-3) stage.setZoom(zoomFor());
    stage.update(dt);
    stage.render();

    const title = $('title').getBoundingClientRect(), titleBottom = title.bottom + 34, titleRight = title.right;
    for (const { p, el } of labels) {
      const s = stage.pixelToScreen(new THREE.Vector2(...p.pixel));
      const off = s.x < -80 || s.y < -40 || s.x > stage.cssSize.w + 80 || s.y > stage.cssSize.h + 40;
      const underTitle = s.y < titleBottom && s.x < titleRight + 60;
      el.hidden = off || underTitle || (S.mode === 'docked' && S.at === p.id);
      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      el.classList.toggle('goal', S.goal === p);
    }
    requestAnimationFrame(frame);
  }

  showCard(home);
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
  window.__airship = { THREE, stage, paint, ship, witch, nettie, state: S, places: place, flyTo, takeOff };
}

function loadTexture(url) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The map couldn't start: ${err.message}`; }
});

