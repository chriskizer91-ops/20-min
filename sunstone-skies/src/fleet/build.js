// build.js: puts a levelled-up ship together and runs its working parts. It gives back what the game's ships give back
// (ship/build.js: root, body, update, stats, ...), so the game can fly it, plus the controls the shipyard and the
// game turn:
//   control.sail       0..1: the wing sails fold back and furl as sail is taken in, and spread as it's let out
//   control.turn/climb the rudder swings, the wheel spins, the belly fins tilt (from update's opts in the game)
//   control.stations   per side, 0..1: the gun-port lids swing open and the guns run out
//   fire(battery)      that battery's guns kick back and flash, then roll out again
//   control.power      the crystal power shared between sails, guns and lift: the conduits, the yard-tip crystals
//                      and the lift vents glow with each share
//   control.damage     0..1 for hull, sails and crystals: scorched and holed planks, torn sails, crystals going dark
//   fit({...})         the garage's fittings: armour, racing canvas, long-focus guns, high-angle mounts, crystal cage
import * as THREE from 'three';
import { LEVELS, shipMotion } from '../ship/build.js';
import { commonShapes, bow } from '../ship/parts.js';
import { clamp, lerp, smooth, triangles, lathe } from '../ship/kit.js';
import { RigBatch, rigState, CHANNELS } from './rig.js';
import { COLOURS } from './materials.js';
import { makeHull, buildHull, brass, channels, stern, quarterGalleries, windows, vents, armour } from './hull.js';
import { guns } from './guns.js';
import { furnaces, conduits } from './crystals.js';
import { masts, bowsprit } from './rigging.js';
import { deck, rails, boats, bowWork, lanterns, fins, rudder } from './fittings.js';

// The levelled-up ships are drawn finer than the game's old ones: full detail is about twice their budget, since only the
// ship you fly (or one right alongside) is ever drawn at full
// Each ship's recipe sets how fine it's drawn (fine: smaller ships spend their triangles on finer detail)
function detailFor(level, R) {
  const FINE = R.fine ?? 1.25, q = { ...LEVELS[level], level }, r = Math.sqrt(FINE);
  if (level === 'full') {
    q.stations = Math.round(q.stations * r); q.rings = Math.round(q.rings * r);
    q.latheSeg = Math.round(q.latheSeg * r); q.tubeRad = Math.round(q.tubeRad * r); q.sailDiv = Math.round(q.sailDiv * r);
    q.balusterStep = 1 / FINE; q.rivetStep = 1 / FINE;
  }
  if (level === 'middle') { q.balusterStep = 2.5; q.sailDiv = 5; q.balusters = false; q.railPath = 1.0; q.latheSeg = 6; }
  if (level === 'far') q.balusters = false;
  if (level === 'full') q.balusters = true;
  return q;
}

export const FITTINGS = ['armour', 'racing', 'storm', 'longFocus', 'highAngle', 'heavyShot', 'cage', 'vents'];
export const NO_FIT = Object.fromEntries(FITTINGS.map((f) => [f, false]));

// ---------- the glows: soft points for every crystal, lantern, window, gun and vent, each on a channel ----------
const GLOW_CH = 48;
function glowGeometry(glows) {
  const pos = [], col = [], size = [], kind = [], chan = [], tag = [], rig = [], rp = [], ra = [];
  const c = new THREE.Color();
  for (const g of glows) {
    pos.push(g.p.x, g.p.y, g.p.z); c.set(g.color); col.push(c.r, c.g, c.b); size.push(g.size);
    kind.push(g.pulse ? 1 : g.flicker ? 2 : 0); chan.push(g.chan ?? 0); tag.push(g.tag ?? 0);
    rig.push(g.rig?.ch ?? 0); rp.push(...(g.rig ? g.rig.pivot.toArray() : [0, 0, 0])); ra.push(...(g.rig ? g.rig.axis.toArray() : [0, 1, 0]));
  }
  const geo = new THREE.BufferGeometry(), F = (a, n) => new THREE.Float32BufferAttribute(a, n);
  geo.setAttribute('position', F(pos, 3)); geo.setAttribute('color', F(col, 3)); geo.setAttribute('size', F(size, 1)); geo.setAttribute('kind', F(kind, 1));
  geo.setAttribute('chan', F(chan, 1)); geo.setAttribute('tag', F(tag, 1)); geo.setAttribute('rig', F(rig, 1)); geo.setAttribute('rigP', F(rp, 3)); geo.setAttribute('rigA', F(ra, 3));
  return geo;
}
function glowPoints(geo, U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScale: { value: 400 }, uCrystal: U.uCrystal, uRig: U.uRig, uGlowK: { value: new Array(GLOW_CH).fill(1) } },
    vertexShader: `attribute float size; attribute float kind; attribute float chan; attribute float tag; attribute float rig; attribute vec3 rigP; attribute vec3 rigA;
      varying vec3 vCol; varying float vA; uniform float uTime; uniform float uScale; uniform float uCrystal; uniform float uGlowK[${GLOW_CH}]; uniform vec3 uRig[${CHANNELS}];
      vec3 rigRot(vec3 v, vec3 a, float t) { float c = cos(t), s = sin(t); return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c); }
      void main() {
        vec3 p = position; vec3 rs = uRig[int(rig + 0.5)];
        if (rig > 0.5) p = rigP + rigRot(p - rigP, rigA, rs.x) + rigA * rs.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float ph = position.x * 3.1 + position.z * 1.7;
        float k = kind > 1.5 ? 0.88 + 0.08 * sin(uTime * 13.0 + ph) + 0.05 * sin(uTime * 7.3 + ph) : kind > 0.5 ? 0.86 + 0.14 * sin(uTime * 2.4 + ph) : 1.0;
        k *= uGlowK[int(chan + 0.5)];
        if (chan > 0.5 && chan < 1.5) k *= 1.0 - step(uCrystal, tag);
        vCol = color; vA = min(k, 1.6);
        gl_PointSize = k < 0.01 ? 0.0 : min(size * min(k, 1.3) * uScale / -mv.z, 360.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vCol; varying float vA;
      void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2) * 0.85 * vA;
        if (a < 0.003) discard; gl_FragColor = vec4(vCol * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.renderOrder = 2;
  return pts;
}

// Embers drifting up off every crystal; a dead crystal gives none
function emberGeometry(embers, per) {
  const pos = [], seed = [], spread = [], tag = [];
  embers.forEach((e, i) => { for (let k = 0; k < per; k++) { pos.push(e.p.x, e.p.y, e.p.z); seed.push(i * 13.7 + k * 1.618); spread.push(e.r, e.h); tag.push(e.tag ?? 0); } });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  geo.setAttribute('spread', new THREE.Float32BufferAttribute(spread, 2));
  geo.setAttribute('tag', new THREE.Float32BufferAttribute(tag, 1));
  return geo;
}
function emberPoints(geo, U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScale: { value: 400 }, uCrystal: U.uCrystal },
    vertexShader: `attribute float seed; attribute vec2 spread; attribute float tag; uniform float uTime; uniform float uScale; uniform float uCrystal; varying float vA; varying float vHot;
      float h1(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float life = fract(uTime * (0.22 + 0.12 * h1(seed)) + h1(seed * 1.3));
        float a = h1(seed * 2.1) * 6.2831 + uTime * (0.6 + h1(seed) * 0.8);
        vec3 p = position + vec3(cos(a) * spread.x * (0.3 + life * 0.9), life * spread.y * 1.6, sin(a) * spread.x * (0.3 + life * 0.9));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.12, life) * (1.0 - life) * (1.0 - step(uCrystal, tag)); vHot = 1.0 - life;
        gl_PointSize = (0.05 + 0.06 * h1(seed * 3.3)) * spread.y * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; varying float vHot;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 1.5) * vA;
        if (a < 0.01) discard; gl_FragColor = vec4(mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.9, 0.55), vHot) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.renderOrder = 3;
  return pts;
}

// The model: every piece of one ship at one level of detail, in one set of colours. It's built once and shared by
// every ship drawn from it (the Captain's, or each raider's), each with its own materials, damage and working parts.
export function fleetModel(R, level, fart, colours = COLOURS.captain) {
  const q = detailFor(level, R);
  R.kit ??= 1;
  R.tiles = { planks: [4.67, 0.81], deck: [2.65, 0.72], band: [4.93, 0.61] };
  R.railScale = clamp(R.length / 25, 0.55, 1.2);
  // rings get more sides the bigger they are, so the crowns' halos and the tops' rims stay round
  const S = { ...commonShapes(q), rects: fart.rects,
    baluster: lathe([[0.042, 0], [0.042, 0.07], [0.022, 0.13], [0.03, 0.3], [0.04, 0.5], [0.03, 0.68], [0.02, 0.84], [0.042, 0.92], [0.042, 1]], 5),
    clamp: (r, w) => lathe([[r, -w], [r + w, 0], [r, w]], 8),
    ring: (r, w) => lathe([[r, -w], [r + w * 0.8, -w * 0.5], [r + w, 0], [r + w * 0.8, w * 0.5], [r, w]], Math.max(q.latheSeg, Math.round(r * q.latheSeg * (r > 0.6 ? 1.4 : 0)))) };
  const hull = makeHull(R);
  const batch = new RigBatch({ still: level === 'far' }), glows = [], lights = [], embers = [];
  buildHull(hull, batch, q);
  brass(hull, batch, R, q, S);
  const feet = channels(hull, batch, R, q, S);
  stern(hull, batch, R, q, S, glows);
  quarterGalleries(hull, batch, R, q, S, glows);
  windows(hull, batch, R, q, S, glows);
  guns(hull, batch, R, q, S, glows);
  const furn = furnaces(hull, batch, R, q, S, glows, lights, embers);
  conduits(hull, batch, R, q, S, furn);
  masts(hull, batch, R, q, S, glows, feet, colours);
  if (R.bowsprit) bowsprit(hull, batch, R, q, S, glows);
  bow(hull, batch, { ...R, bowsprit: null }, q, S, glows);
  bowWork(hull, batch, R, q, S);
  fins(hull, batch, R, q, S);
  rudder(hull, batch, R, q, S);
  lanterns(hull, batch, R, q, S, glows);
  deck(hull, batch, R, q, S, glows);
  rails(hull, batch, R, q, S);
  boats(hull, batch, R, q, S);
  vents(hull, batch, R, q, glows);
  armour(hull, batch, R, q, S);

  return { R, level, q, hull, colours, parts: batch.build(), names: batch.names, glows: glowGeometry(glows), embers: level === 'far' ? null : emberGeometry(embers, level === 'full' ? 14 : 5), lights };
}

// One ship from a model: its own materials (so its own damage and power), its own working parts. motion: false
// leaves the swaying to whoever holds it (a raider's own ship wrapper)
export function fleetShip(model, fart, { fits, motion = true } = {}) {
  const { R, level, q, hull, lights } = model;
  const inst = fart.instance(model.colours);
  inst.U.uStrake.value.set(R.strake?.[0] ?? 0, R.strake?.[1] ?? 0, R.strake ? 1 : 0, 0);
  const U = inst.U;
  const root = new THREE.Group(); root.name = R.name;
  const body = new THREE.Group(); root.add(body);
  const meshes = [];
  for (const part of model.parts) {
    const mat = inst.get(part.key, part.moving), g = part.geometry;
    // a material coloured per vertex needs colours on every piece: plain white where none were given
    if (mat.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = part.key; mesh.castShadow = true; mesh.receiveShadow = true;
    if (part.moving) mesh.customDepthMaterial = inst.depth(part.key);
    mesh.userData = { fit: part.fit, moving: part.moving, triangles: triangles(part.geometry) };
    if (part.moving) mesh.frustumCulled = false; // it moves out of its rest-pose bounds
    body.add(mesh); meshes.push(mesh);
  }
  const glow = glowPoints(model.glows, U); glow.name = 'glow'; body.add(glow);
  const sparks = model.embers ? emberPoints(model.embers, U) : null;
  if (sparks) { sparks.name = 'embers'; body.add(sparks); }
  const lamps = [];
  if (q.lights) for (const L of lights) { const pl = new THREE.PointLight(0xffa64d, L.power * 6, 5 + R.length * 0.25, 2); pl.position.copy(L.p); body.add(pl); lamps.push(pl); }
  const bounds = new THREE.Box3().setFromObject(body);

  // ---------- the working parts ----------
  const rig = rigState(model.names);
  const control = {
    sail: 0.55, turn: 0, climb: 0,
    stations: { port: 0, starboard: 0 },
    power: { sails: 1 / 3, guns: 1 / 3, lift: 1 / 3 },
    damage: { hull: 0, sails: 0, crystals: 0 },
  };
  const now = { fold: 0.1, furl: [0, 0], lids: { port: 0, starboard: 0 }, run: { port: 0, starboard: 0 }, kick: { port: 0, starboard: 0, bow: 0, stern: 0 }, wheel: 0, rudder: 0, fin: 0, climb: 0 };
  let fitted = { ...NO_FIT };
  const variant = () => (q.level === 'full' ? (fitted.longFocus ? 8 : 0) + (fitted.highAngle ? 16 : 0) : 0);
  function fit(f = {}) {
    fitted = { ...fitted, ...f };
    const kind = q.level === 'full' && fitted.longFocus ? 'long' : 'std', mount = q.level === 'full' && fitted.highAngle ? 'hi' : 'lo';
    for (const m of meshes) {
      const F = m.userData.fit;
      m.visible = !F ? true : F === 'armour' ? fitted.armour : F === 'canvas' ? !fitted.racing || q.level !== 'full' : F === 'racing' ? fitted.racing
        : F === 'cage' ? fitted.cage : F === 'mount-hi' ? fitted.highAngle : F.startsWith('guns-') ? F === `guns-${kind}-${mount}` : true;
    }
    // storm canvas: heavier, greyer sailcloth
    for (const rig of [false, true]) { const mat = inst.get('canvas', rig); mat.color.set(fitted.storm ? 0xbdb2a2 : inst.colours.sails); mat.emissive.set(fitted.storm ? 0x4a3e32 : inst.colours.sailGlow); }
    stats.triangles = meshes.reduce((n, m) => n + (m.visible ? m.userData.triangles : 0), 0);
    stats.drawCalls = meshes.filter((m) => m.visible).length + 1 + (sparks ? 1 : 0);
    return fitted;
  }
  const stats = { triangles: 0, drawCalls: 0, parts: {} };
  for (const m of meshes) stats.parts[m.name] = (stats.parts[m.name] ?? 0) + m.userData.triangles;
  fit(fits);

  function fire(battery) { if (battery in now.kick) now.kick[battery] = 1; }

  const move = motion ? shipMotion(R, body, []) : ((t) => (dt) => (t += dt))(Math.random() * 10);
  const K = glow.material.uniforms.uGlowK.value;
  function update(dt, opts = {}) {
    const t = move(dt, opts);
    U.uTime.value = t;
    const c = control;
    if (opts.turn != null) c.turn = opts.turn;
    if (opts.climb != null) c.climb = opts.climb;
    if (opts.sail != null) c.sail = opts.sail;
    const ease = (a, b, rate) => a + (b - a) * (1 - Math.exp(-dt * rate));
    // sails: the wings fold back and the canvas furls as sail is taken in, the upper tier first
    now.fold = ease(now.fold, lerp(1.1, 0, smooth(0.0, 0.62, c.sail)), 1.6);
    // a ship with one tier of sails furls it at the halfway point between the two tiers' points
    const single = !R.masts.some((M) => M.tiers.length > 1);
    now.furl[1] = ease(now.furl[1], clamp((0.45 - c.sail) / 0.4, 0, 1), 2);
    now.furl[0] = ease(now.furl[0], clamp(((single ? 0.35 : 0.25) - c.sail) / (single ? 0.3 : 0.22), 0, 1), 2);
    rig.each('yard:', (v, name) => { const tier = +name.split(':')[2]; v.set(now.fold * (1 + tier * 0.12), 0, now.furl[tier]); });
    // the helm
    now.rudder = ease(now.rudder, -c.turn * 0.5, 4);
    now.wheel += c.turn * dt * 2.2;
    now.climb = ease(now.climb, c.climb, 3);
    rig.set('rudder', now.rudder); rig.set('wheel', now.wheel);
    rig.each('fin:', (v) => v.set(-now.climb * 0.32, 0, 0));
    // the guns: lids swing open, then the guns run out; to stand down, the guns run in, then the lids shut
    for (const s of ['port', 'starboard']) {
      const want = c.stations[s] > 0.5 || now.kick[s] > 0;
      if (want) { now.lids[s] = Math.min(1, now.lids[s] + dt * 1.4); if (now.lids[s] > 0.75) now.run[s] = Math.min(1, now.run[s] + dt * 1.1); }
      else { now.run[s] = Math.max(0, now.run[s] - dt * 1.1); if (now.run[s] < 0.1) now.lids[s] = Math.max(0, now.lids[s] - dt * 1.2); }
      const lid = smooth(0, 1, now.lids[s]), run = smooth(0, 1, now.run[s]), kick = Math.pow(now.kick[s], 2.2);
      rig.set(`lids:${s}`, -2.05 * lid);
      const ph = R.ports?.h ?? 1;
      rig.set(`guns:${s}`, 0, -(1 - run) * ph * 1.03 - kick * ph * 0.36);
    }
    for (const b of ['bow', 'stern']) rig.set(`guns:${b}`, 0, -Math.pow(now.kick[b], 2.2) * 0.38 * R.kit);
    // swivel guns on the rails kick back when their side fires, and are always ready
    for (const s of ['port', 'starboard']) rig.set(`swivel:${s}`, 0, -Math.pow(now.kick[s], 2.2) * 0.3 * R.kit);
    for (const b in now.kick) now.kick[b] = Math.max(0, now.kick[b] - dt / 1.6);
    // the glows: lanterns and windows steady; crystals by their health (shader); guns by run-out and firing;
    // the vents and yard-tip crystals by their share of the power
    const alive = 1 - c.damage.crystals, total = fitted.cage ? 0.8 : 1;
    const v = variant();
    for (const [b, base] of [['port', 2], ['starboard', 3], ['bow', 4], ['stern', 5], ['port', 14], ['starboard', 15]]) {
      const run = base < 4 ? smooth(0, 1, now.run[b]) : 1, flash = Math.pow(now.kick[b], 6) * 2.5;
      for (const o of [0, 8, 16, 24]) K[base + o] = o === v ? run * (0.55 + c.power.guns * 1.2 * total) + flash : 0;
    }
    K[6] = (0.15 + c.power.lift * 1.7 * total * (1 + Math.max(0, now.climb) * 0.6)) * Math.min(1, alive * 4) * (fitted.vents ? 1.8 : 1);
    K[7] = (0.15 + c.power.sails * 1.6 * total) * Math.min(1, alive * 4);
    U.uPow.value.set(c.power.sails * total, c.power.guns * total, c.power.lift * total);
    U.uHullDmg.value = c.damage.hull; U.uSailDmg.value = c.damage.sails; U.uCrystal.value = 1 - c.damage.crystals;
    for (const [i, pl] of lamps.entries()) pl.intensity = (0.88 + Math.sin(t * 2.4 + i) * 0.12) * lights[i].power * 6 * Math.max(0.1, alive);
    for (let i = 0; i < CHANNELS; i++) U.uRig.value[i].copy(rig.state[i]);
    if (sparks) sparks.material.uniforms.uScale.value = glow.material.uniforms.uScale.value;
    return t;
  }
  update(0);
  return { root, body, update, stats, bounds, glow, length: R.length, recipe: R, level, hull, control, fire, fit,
    ready: (b) => (R.ports && b in now.run ? now.run[b] : 1), get fitted() { return fitted; }, meshes, uniforms: U, rig, materials: inst };
}

export function buildFleetShip(R, level, fart, { colours, fits } = {}) {
  return fleetShip(fleetModel(R, level, fart, colours ?? COLOURS.captain), fart, { fits });
}
