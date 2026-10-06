// raiders.js: the raiders, the Captain's enemies. They fly the same six levelled-up classes as the Captain (Skiff,
// Cutter, Brig, Frigate, Galleon, Man-o'-war), drawn at full, middle or far detail by how big they look (the Galleon and
// the Man-o'-war at most at middle), and they fly by the same rules (flight.js). Raiders are easy to tell apart: rust-red sails and strake, darker planks, crimson pennants with a
// black hoist. Their sails, gun lids and guns work like the Captain's, and their damage shows.
//   Skiffs and Cutters chase: they come at the Captain bow-first, fire their bow guns, and break away when close.
//   Brigs, Frigates, Galleons and Men-o'-war fight broadside: they come alongside at a few hundred metres and fire
//   whole sides.
// How hard they fight comes from the chart and the voyage's danger (progress.js). A raider captain sails a ship fitted
// out with garage parts, which show on it, and is half as tough again as the rest of their class (more at the top
// dangers).
import * as THREE from 'three';
import { shipMotion } from '../ship/build.js';
import { STATS } from '../ships/index.js';
import { FLEET } from '../fleet/index.js';
import { makeFlyer } from './flight.js';
import { makeGunnery, intercept } from './guns.js';
import { hitZones, firstHit } from './damage.js';
import { CLOUD_Y } from './world.js';
import { fleetModel, fleetShip } from '../fleet/build.js';
import { COLOURS } from '../fleet/materials.js';
import { CHARTS, effects, looks, newCaptain } from './progress.js';
import { emit } from './events.js';

// How the raiders compare with the Captain on the middle chart (Rough Air): sail a little slower, reload half as
// slowly again, and aim a little off (by this much for every metre to the target)
export const RAIDER = { pace: CHARTS.rough.pace, slow: CHARTS.rough.slow, aim: CHARTS.rough.aim };
const ROLE = { skiff: 'chaser', cutter: 'chaser', brig: 'broadside', frigate: 'broadside', galleon: 'broadside', manowar: 'broadside' };
// The Galleon and the Man-o'-war are drawn at most at middle detail as raiders: there can be several of them in a fight
const TOP = { galleon: 'middle', manowar: 'middle' };
// Free flight's waves: the old ladder, then three to six mixed
export const WAVES = [['skiff'], ['skiff', 'skiff'], ['cutter'], ['cutter', 'skiff'], ['brig'], ['brig', 'cutter'], ['frigate'],
  ['frigate', 'cutter', 'cutter'], ['brig', 'brig', 'skiff', 'skiff'], ['frigate', 'brig', 'cutter', 'cutter', 'skiff']];
export function waveAt(n) {
  if (n < WAVES.length) return WAVES[n];
  const pool = ['skiff', 'skiff', 'cutter', 'cutter', 'cutter', 'brig', 'brig', 'frigate'];
  if (n >= WAVES.length + 4) pool.push('galleon'); // the big ships join free flight's later waves
  if (n >= WAVES.length + 8) pool.push('manowar');
  return Array.from({ length: Math.min(6, 3 + ((n - WAVES.length) >> 1)) }, () => pool[Math.floor(Math.random() * pool.length)]);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// One raider ship: its own full, middle and far ships (sharing the class's models), swapped by how big it looks, so its
// sails furl, its lids open, its guns kick and its damage shows on it alone. The full one is built the first time
// it comes close.
function raiderShip(T, fart, fits) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const make = (model) => { const s = fleetShip(model, fart, { motion: false, fits }); body.add(s.root); return s; };
  const ships = { middle: make(T.midModel), far: make(T.farModel), full: null };
  ships.far.root.visible = false;
  const move = shipMotion(T.R, body, []);
  let px = 400;
  return {
    root, body, recipe: T.R, hull: T.midModel.hull, length: T.R.length, level: 'middle',
    get shown() { return ships[this.level]; },
    update(dt, opts) { move(dt, opts); this.shown.update(dt, opts); },
    detail(level, pixelScale) {
      if (level === 'full' && !ships.full) { ships.full = make(T.fullModel()); }
      for (const [k, s] of Object.entries(ships)) if (s) s.root.visible = k === level;
      this.level = level; px = pixelScale;
      for (const s of Object.values(ships)) if (s) s.glow.material.uniforms.uScale.value = px;
    },
    fire(b) { for (const s of Object.values(ships)) s?.fire(b); },
    // its sail, its gun decks (manned while it fights) and its damage, from how it's flying
    sync(f, fighting) {
      for (const s of Object.values(ships)) {
        if (!s) continue;
        const C = s.control; C.sail = f.sail;
        C.stations.port = C.stations.starboard = fighting ? 1 : 0;
        for (const k of ['hull', 'sails', 'crystals']) C.damage[k] = 1 - f.frac(k);
      }
    },
  };
}

export function makeRaiders(scene, art, bolts, fart) {
  // each class's models, built the first time a raider of that class is needed (or warmed up in port beforehand)
  const T = {}, built = {};
  for (const R of FLEET) Object.defineProperty(T, R.id, { enumerable: true, get() {
    if (built[R.id]) return built[R.id];
    const midModel = fleetModel(R, 'middle', fart, COLOURS.raider), farModel = fleetModel(R, 'far', fart, COLOURS.raider);
    let full = null;
    return (built[R.id] = { R, midModel, farModel, fullModel: () => (full ??= fleetModel(R, 'full', fart, COLOURS.raider)), zones: hitZones(fleetShip(midModel, fart)) });
  } });
  const warm = (ids) => { for (const id of ids) void T[id]; };
  const list = [];
  let ai = true;

  // A raider. o: { chart, level (progress.js raiderLevel), captain: { name, fits, health } }
  function spawn(id, pos, heading, frozen = false, o = {}) {
    const D = CHARTS[o.chart ?? 'rough'], L = o.level ?? { health: 1, damage: 1, slow: 1, aim: 1 }, cap = o.captain;
    // a captain's ship carries parts (Mk I on the first voyage, better later); their numbers come from the same rules as the Captain's
    let m = {}, fits = {};
    if (cap) {
      const c = newCaptain(); c.ship = id; c.fitted[id] = [...cap.fits];
      for (const p of cap.fits) c.parts[p] = cap.mark ?? 2;
      m = effects(c, id); fits = looks(c, id);
    }
    const tough = L.health * (cap?.health ?? 1);
    const mods = { ...m, hull: (m.hull ?? 1) * tough, sails: (m.sails ?? 1) * tough, crystals: (m.crystals ?? 1) * tough };
    const ship = raiderShip(T[id], fart, fits);
    const f = makeFlyer(ship, STATS[id], { pos, heading }, D.pace, mods);
    f.sail = 0.85; f.speed = f.H.vmax * 0.6; f.aimY = T[id].zones.aim.y;
    ship.root.position.copy(pos); ship.root.rotation.y = heading;
    scene.add(ship.root);
    const role = ROLE[id];
    const gun = makeGunnery(ship, D.slow * L.slow, { ...m, damage: (m.damage ?? 1) * L.damage }, fits.heavyShot ? 1.25 : 1);
    const r = { id, R: T[id].R, name: cap ? cap.name : `Raider ${T[id].R.cls}`, captain: cap ?? null, ship, f, gun, zones: T[id].zones, role, frozen,
      aim: D.aim * L.aim, mode: 'attack', timer: 0, side: 1, alt: (Math.random() - 0.5) * (role === 'chaser' ? 90 : 20), counted: false, gone: false };
    ship.update(0, {}); ship.root.updateMatrixWorld(true);
    list.push(r);
    return r;
  }

  // a wave of raiders, 1.5 to 1.9 km ahead of the Captain, more or less, coming in
  // o: as spawn's, plus captain for the first ship of the group, and from: the bearing to come in on
  function spawnWave(ids, foe, o = {}) {
    const base = o.from ?? foe.heading + (Math.random() - 0.5) * 1.4;
    ids.forEach((id, i) => {
      const a = base + (i - (ids.length - 1) / 2) * 0.24, d = 1500 + Math.random() * 400;
      const pos = new THREE.Vector3(foe.pos.x + Math.sin(a) * d, clamp(foe.pos.y + (Math.random() - 0.5) * 160, 200, 2000), foe.pos.z + Math.cos(a) * d);
      spawn(id, pos, a + Math.PI, false, { ...o, captain: i === 0 ? o.captain : null });
    });
    return base;
  }

  // where to steer: chasers come at the foe bow-first and break away when close; broadside ships keep it abeam
  function steer(r, foe, dt) {
    const me = r.f, L = r.R.length, P = foe.pos, dx = P.x - me.pos.x, dz = P.z - me.pos.z, d = Math.hypot(dx, dz, P.y - me.pos.y);
    const bearing = Math.atan2(dx, dz), rel = wrap(bearing - me.heading);
    r.timer -= dt;
    let want, sailTo = 1;
    if (r.mode === 'break') {
      want = r.breakH;
      if (r.timer <= 0) r.mode = 'attack';
    } else if (r.role === 'chaser' || d > 1500) {
      const ahead = P.clone().addScaledVector(foe.velocity, Math.min(3, d / 250));
      want = Math.atan2(ahead.x - me.pos.x, ahead.z - me.pos.z);
      sailTo = d < 300 ? 0.6 : 1;
      if (r.role === 'chaser' && d < 70 + L * 4) {
        r.mode = 'break'; r.timer = 3 + Math.random() * 2.5;
        r.breakH = bearing + (Math.random() < 0.5 ? 1 : -1) * (1.8 + Math.random() * 0.7); r.alt = (Math.random() - 0.5) * 140;
      }
    } else {
      if (Math.abs(rel) > 0.35 && Math.abs(rel) < Math.PI - 0.35) r.side = Math.sign(rel);
      const ideal = 260 + L * 4, k = clamp((d - ideal) / 300, -1, 1);
      want = bearing - r.side * (Math.PI / 2 - k * 0.9);
      sailTo = 0.75;
    }
    // keep clear of the other raiders
    let vx = Math.sin(want), vz = Math.cos(want);
    for (const o of list) {
      if (o === r || o.f.down) continue;
      const ox = me.pos.x - o.f.pos.x, oz = me.pos.z - o.f.pos.z, dd = Math.hypot(ox, oz), keep = (L + o.R.length) * 3 + 40;
      if (dd < keep && dd > 0.1) { const w = ((keep - dd) / keep) * 1.5; vx += (ox / dd) * w; vz += (oz / dd) * w; }
    }
    const err = wrap(Math.atan2(vx, vz) - me.heading), wantY = clamp(P.y + r.alt, 150, 2200);
    return { turn: clamp(-err * 2.2, -1, 1), climb: clamp((wantY - me.pos.y) / 60, -1, 1), sailTo };
  }

  // fire every battery that can reach where the foe will be, a little off
  const off = new THREE.Vector3();
  function shoot(r, foe) {
    for (const b of ['bow', 'port', 'starboard', 'stern']) {
      if (r.gun.ready[b] > 0 || !r.gun.count(b)) continue;
      const m = r.gun.muzzle(b);
      const aim = intercept(m.p, r.f.velocity, foe.aimAt(), foe.velocity, m.K.speed);
      const dist = aim.distanceTo(m.p);
      if (dist > m.K.speed * m.K.life * 0.7 || !r.gun.reaches(b, aim)) continue; // they hold fire till it's worth it
      const e = dist * r.aim + 1.5;
      aim.add(off.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2 * e));
      const n = r.gun.fire(b, aim, bolts, 'raider', r.f.velocity);
      if (n) { r.ship.fire?.(b); emit('shot', { owner: 'raider', battery: b, count: n, pos: r.f.pos }); }
    }
  }

  // every frame: steer, fly, fire, pick the detail level; returns the raiders that went down this frame
  function update(dt, foe, camera) {
    const downed = [];
    const toScreen = 1 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const r of list) {
      const live = !r.f.down;
      if (r.frozen && live) r.ship.update(dt, { calm: true });
      else r.f.update(dt, live && ai && !foe.down ? steer(r, foe, dt) : { turn: 0, climb: 0, sailTo: 0.6 });
      r.ship.sync?.(r.f, live && ai && !r.frozen && !foe.down);
      r.ship.root.updateMatrixWorld(true);
      r.gun.update(dt);
      if (live && ai && !r.frozen && !foe.down) shoot(r, foe);
      if (r.f.down && !r.counted) { r.counted = true; downed.push(r); }
      if (r.f.down && (r.f.pos.y < CLOUD_Y - 140 || r.f.down.t > 16)) r.gone = true;
      const size = (r.R.length / Math.max(1, camera.position.distanceTo(r.f.pos))) * toScreen;
      r.ship.detail(size < 0.06 ? 'far' : size > 0.32 && !TOP[r.id] ? 'full' : 'middle', camera.userData.pixelScale ?? 500);
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].gone) { scene.remove(list[i].ship.root); list.splice(i, 1); }
    return downed;
  }

  // the first raider a shot from a to b (world) hits, and where
  function hitBy(a, b) {
    let best = null;
    for (const r of list) {
      if (r.f.down) continue;
      const h = firstHit(r.zones, r.ship.body, a, b);
      if (h && (!best || h.t < best.h.t)) best = { r, h };
    }
    return best;
  }

  function clear() { for (const r of list) scene.remove(r.ship.root); list.length = 0; }
  return { list, spawn, spawnWave, update, hitBy, clear, warm, templates: T, setAI: (on) => { ai = on; } };
}
