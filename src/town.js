import * as THREE from 'three';
import { Stage } from './stage.js';
import { Field } from './field.js';
import { createWitch } from './actors/witch.js';
import { createKeys } from './input.js';
import { turnToward } from './actors/kit.js';
import { buildScreen, walkPlayer, loadTexture, loadFonts, WALK_SPEED } from './screen.js';

// A town of painted screens joined by doors, the way FF9 strings its field screens together. Each screen is a
// scene file plus a cast (who and what is on it: see Field). An exit with "to" leads to another screen: walking
// into it fades out to violet (docs/SLICE.md §5: "the short fade goes to violet rather than black"), swaps the
// painting, the camera, the floor and the cast, puts her in the matching doorway (the new screen's "arrivals",
// keyed by the screen she came from) and fades back in as she takes a few steps into the room. The music changes
// only if the new cast asks for different music. Every screen is built once, the first time it's needed, and kept;
// the screens next door are built quietly in the background, so their doors open without a wait.
//
//   const town = new Town({ screens: { id: { data, cast } }, images: { path: url }, footsteps, renderer })
//   await town.start(id, at)     the first screen, with her at `at` ({ pixel, facing }) or its spawn
//   town.frame(now)              one frame (the game calls it from its own loop; bootTown runs one for a demo)
//   town.go(id, at)              through a door to another screen (or to `at` on it: a landing, a wake-up)
//   town.setParty([...])         who follows her about: [{ id, actor, lines? }], walking in her footsteps
//   town.active                  false while another screen (a battle, the map) has the canvas: no frames, no keys
//
// Her boots sound like the floor she's on: a scene's "footsteps" (step-wood, step-stone, step-grass), else the town's.
// bootTown({ screens, start, images, footsteps }) is the demos' way in: a Town on its own canvas, with its own loop.

const PLAYER_RADIUS = 0.18;
const FACING = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 };
const FADE_OUT = 450, FADE_IN = 650; // ms, matching #fade's transition in the page
const STEP_EVERY = 1.12; // s: Thareia's footsteps are four footfalls, about her pace
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Town {
  constructor({ screens, images, footsteps = 'step-wood', renderer = null, canvas = document.getElementById('stage'), prebuild = 'near' }) {
    Object.assign(this, { screens, images, footsteps, renderer, canvas, prebuild });
    this.THREE = THREE;
    this.loading = new Map();
    this.active = true;
    this.going = false;
    this.followers = [];
    this.time = 0;
    this.last = null;
    this.stepWait = 0;
  }

  // Build a screen (once) and keep it
  screen(id) {
    if (!this.loading.has(id)) this.loading.set(id, (async () => {
      const { data, cast } = this.screens[id];
      const painting = await loadTexture(this.images[data.image]);
      const s = buildScreen(data, painting);
      s.walk.buildGrid(PLAYER_RADIUS);
      return Object.assign(s, { id, cast });
    })());
    return this.loading.get(id);
  }

  // Screens she isn't near give their painting back to the GPU (it uploads again, from the picture kept in memory, if
  // she comes back), so a long night over many screens doesn't fill a phone's memory
  rest(id) {
    const near = new Set([id, ...(this.screens[id]?.data.exits ?? []).map((e) => e.to)]);
    for (const [other, p] of this.loading) {
      if (near.has(other)) continue;
      p.then((s) => { if (this.here?.id !== other) s.painting.dispose(); }).catch(() => {});
    }
  }

  // The screens next door to this one, built while she looks around
  warmNeighbours(id) {
    const ids = this.prebuild === 'all' ? Object.keys(this.screens) : (this.screens[id]?.data.exits ?? []).map((e) => e.to).filter((to) => to && this.screens[to]);
    setTimeout(() => { for (const n of ids) this.screen(n).catch((err) => console.warn('screen', n, err)); }, 1500);
  }

  // memory: what the field starts with ({ bag, picked, visits, seenHerbs }: see Field)
  async start(id, at = null, memory = {}) {
    loadFonts();
    this.here = await this.screen(id);
    const here = this.here;
    this.stage = new Stage(this.canvas, { paint: here.paint, painting: here.painting, world: here.world, cutouts: here.cutouts, renderer: this.renderer });
    this.witch = createWitch();
    this.player = { actor: this.witch, pos: new THREE.Vector3(), heading: 0, path: null, onArrive: null, radius: PLAYER_RADIUS };
    this.player.obstacle = { x: 0, z: 0, r: PLAYER_RADIUS, off: true };
    this.place(here, at ?? here.data.spawn);
    here.world.add(this.witch.root, this.witch.fx);
    this.aim(here);
    this.field = new Field({ world: here.world, walk: here.walk, paint: here.paint, stage: this.stage, player: this.player, scene: here.data, cast: here.cast, followers: this.followers, memory });
    this.field.hasScreen = (to) => !!this.screens[to];
    this.keys = createKeys((what) => { if (this.active) this.field.onKey(what); });
    this.field.keys = this.keys;
    this.field.onExit = (exit) => this.go(exit.to);
    this.fade = document.getElementById('fade');
    addEventListener('resize', () => this.stage.resize());
    this.stage.setFocus(here.paint.toPixel(this.focusPoint()), true);
    this.warmNeighbours(id);
    return this;
  }

  // ---------------------------------------------------------------- through a door, or straight to a spot
  // `at`: where she appears ({ pixel, facing, walk }); otherwise the new screen's arrival for the screen she came from.
  // `fade`: false when the caller has already covered the screen (a landing from the map, waking after a fight).
  async go(to, at = null, { fade = true } = {}) {
    if (this.going || !this.screens[to]) return false;
    this.going = true;
    const { field, player, stage, witch } = this;
    const from = this.here.id;
    field.locked = true;
    player.path = null;
    if (fade) {
      this.fade?.classList.add('on');
      field.audio.sfx('door');
    }
    const [next] = await Promise.all([this.screen(to), sleep(fade ? FADE_OUT : 0)]);
    field.leave();
    stage.setScreen(next);
    next.cutouts.uniforms.tintAmount.value = stage.showGuides ? 1 : 0;
    this.here = next;
    const spot = at ?? next.data.arrivals?.[from] ?? next.data.spawn;
    this.place(next, spot);
    next.world.add(witch.root, witch.fx);
    this.aim(next);
    field.from = from;
    field.enter({ world: next.world, walk: next.walk, paint: next.paint, scene: next.data }, next.cast);
    this.enterParty(spot);
    stage.setFocus(next.paint.toPixel(this.focusPoint()), true);
    field.showPlace();
    field.locked = false;
    if (spot.walk) field.walkTo(next.paint.toWorld(...spot.walk));
    this.warmNeighbours(to);
    this.rest(to);
    this.onScreen?.(next, from);
    if (fade) {
      this.fade?.classList.remove('on');
      await sleep(FADE_IN);
    }
    this.going = false;
    return true;
  }

  place(s, at) {
    const { player } = this;
    const [x, y, h = 0] = at.pixel;
    player.pos.copy(s.paint.toWorld(x, y, h));
    player.pos.y = s.walk.heightAt(player.pos.x, player.pos.z, h);
    player.heading = FACING[at.facing] ?? at.heading ?? 0;
    player.path = null;
    player.onArrive = null;
    player.obstacle.x = player.pos.x;
    player.obstacle.z = player.pos.z;
  }

  // Behind the scenes, the camera orbits the middle of the floor, far enough out to take in this screen's painting
  aim(s) {
    const c = s.walk.bounds.getCenter(new THREE.Vector3());
    this.stage.target.set(c.x, 0.5, c.z);
    this.stage.reveal.dist = Math.max(32, s.paint.distance * 2.1);
  }

  focusPoint() {
    return this.player.pos.clone().add(new THREE.Vector3(0, 0.8, 0));
  }

  // Where she is, for a save: the screen, the painting pixel under her feet, and which way she faces
  where() {
    const p = this.here.paint.toPixel(this.player.pos);
    return { screen: this.here.id, pixel: [Math.round(p.x), Math.round(p.y)], heading: Math.round(this.player.heading * 100) / 100 };
  }

  // ---------------------------------------------------------------- the party, following her
  // members: [{ id, actor, lines? }] in the order they walk behind her (Nettie first, then the crow).
  setParty(members) {
    const keep = new Set(members.map((m) => m.actor));
    for (const f of this.followers) if (!keep.has(f.actor)) { f.actor.root.removeFromParent(); f.actor.fx?.removeFromParent(); }
    const was = new Map(this.followers.map((f) => [f.actor, f]));
    this.followers.length = 0;
    for (const m of members) this.followers.push(was.get(m.actor) ?? { ...m, fresh: true });
    if (this.field) this.enterParty(null, true);
  }

  // Bring the party onto the screen she's on: behind her, the way she came in (or just behind her, where she stands)
  enterParty(spot, keepPlaces = false) {
    const { field, player } = this;
    const show = this.followers.filter(() => this.partyOn?.(this.here.id) ?? true);
    field.things = field.things.filter((t) => !t.id?.startsWith?.('party-'));
    this.trail = [];
    if (!show.length) return;
    const P = player.pos;
    const into = spot?.walk ? this.here.paint.toWorld(...spot.walk).sub(P).setY(0).normalize()
      : new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
    if (into.lengthSq() < 1e-6) into.set(0, 0, -1);
    const behind = (d) => P.clone().addScaledVector(into, -d);
    show.forEach((f, i) => {
      const { actor } = f;
      field.group.add(actor.root);
      if (actor.fx) field.group.add(actor.fx);
      if (!keepPlaces || f.fresh || !actor.root.parent) {
        actor.root.position.copy(behind(0.9 + i * 0.8));
        actor.root.position.y = this.here.walk.heightAt(actor.root.position.x, actor.root.position.z, P.y);
        actor.root.rotation.y = Math.atan2(into.x, into.z);
      }
      f.fresh = false;
      field.things.push({
        id: `party-${f.id}`, name: f.name, actor, pos: actor.root.position, portrait: f.portrait, voice: f.voice, lift: f.lift ?? 0.6,
        get lines() { return f.lines?.(field) ?? { first: ['…'] }; },
        onEnd: () => actor.setMood?.('calm'),
      });
    });
    this.trail = [behind(0.9 + show.length * 0.8 + 0.6)];
    for (let d = 0.9 + show.length * 0.8; d > 0; d -= 0.5) this.trail.push(behind(d));
    this.trail.push(P.clone());
  }

  followParty(dt) {
    const show = this.followers.filter((f) => f.actor.root.parent === this.field.group);
    if (!show.length) return;
    const P = this.player.pos, T = this.trail;
    if (!T.length || T[T.length - 1].distanceTo(P) > 0.1) {
      T.push(P.clone());
      if (T.length > 80) T.shift();
    }
    // A point `d` back along her trail
    const back = (d) => {
      let left = d;
      for (let i = T.length - 1; i > 0; i--) {
        const seg = T[i].distanceTo(T[i - 1]);
        if (seg >= left) return T[i].clone().lerp(T[i - 1], left / seg);
        left -= seg;
      }
      return T[0].clone();
    };
    const talking = this.field.talking?.thing?.actor;
    show.forEach((f, i) => {
      const actor = f.actor, pos = actor.root.position;
      const to = back(0.95 + i * 0.85).sub(pos).setY(0);
      const dist = to.length();
      let speed = 0;
      const before = actor.root.rotation.y;
      if (dist > 0.06 && talking !== actor && !actor.busy) {
        speed = Math.min(WALK_SPEED * (1.15 + i * 0.15), dist / Math.max(dt, 1e-3));
        pos.addScaledVector(to.normalize(), speed * dt);
        actor.root.rotation.y = turnToward(before, Math.atan2(to.x, to.z), 10, dt);
      } else {
        actor.root.rotation.y = turnToward(before, Math.atan2(P.x - pos.x, P.z - pos.z), 3, dt);
      }
      pos.y = this.here.walk.heightAt(pos.x, pos.z, pos.y);
      const turn = Math.atan2(Math.sin(actor.root.rotation.y - before), Math.cos(actor.root.rotation.y - before)) / Math.max(dt, 1e-3);
      actor.update(dt, speed > 0.2 ? speed : 0, turn);
    });
  }

  // ---------------------------------------------------------------- each frame
  frame(now) {
    if (this.last === null) this.last = now;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const { player, witch, field, stage, here } = this;

    const before = player.heading;
    const speed = walkPlayer(player, here.walk, this.keys, field.canWalk(), dt, here.paint);
    const turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before)) / Math.max(dt, 1e-3);
    witch.root.position.copy(player.pos);
    witch.root.rotation.y = player.heading;
    witch.update(dt, speed, turn);
    // Her boots on the boards
    if (speed > 0) {
      if ((this.stepWait -= dt) <= 0) { field.audio.sfx(here.data.footsteps ?? this.footsteps); this.stepWait = STEP_EVERY; }
    } else this.stepWait = 0;

    field.update(dt, this.time);
    this.followParty(dt);
    for (const lamp of here.lamps) lamp.flicker(this.time);
    stage.setFocus(here.paint.toPixel(this.focusPoint()));
    stage.update(dt);
    // The little camera model is where the view starts from, so keep it out of the way until we've left it.
    here.cameraModel.visible = stage.revealCam.position.distanceTo(here.paint.camera.position) > 8;
    stage.render();
    field.afterRender();
  }

  // Hand the canvas to another screen (a battle, the map) and back. Nothing moves while she's away.
  pause() {
    this.active = false;
    this.field.paused = true;
    this.keys.clear();
    this.player.path = null;
  }
  resume() {
    this.active = true;
    this.field.paused = false;
    this.player.path = null;
    this.last = null;
    this.keys.clear();
    this.stage.resize();
    this.stage.setFocus(this.here.paint.toPixel(this.focusPoint()), true);
    // the screen's own music again (a cut-scene or a fight will have played its own)
    if (this.here.cast.music !== undefined) this.field.audio.music(this.here.cast.music);
  }

  // A handle for tests and for poking at things from the browser console
  get paint() { return this.here.paint; }
  get walk() { return this.here.walk; }
  get world() { return this.here.world; }
}

// A demo's town: a Town on the page's #stage, with its own frame loop. Resolves to the Town (also window.__game).
export async function bootTown(opts) {
  const town = new Town({ ...opts, prebuild: opts.prebuild ?? 'all' });
  await town.start(opts.start);
  requestAnimationFrame((now) => {
    town.last = now;
    const loop = (t) => { town.frame(t); requestAnimationFrame(loop); };
    loop(now);
    document.body.classList.add('ready');
  });
  window.__game = town;
  return town;
}

// A dialogue portrait for someone with no painted one: their own model, rendered close up from the front against
// the talk box's plum, once for each mood (a face that's painted on a canvas swaps with the mood). Returns
// portrait(mood) -> a data: URL. frame: { at, from, fov } in the model's own space, looking at its face.
export function modelPortrait(renderer, actor, { at = [0, 1.08, 0], from = [0.4, 1.13, 1.36], fov = 22, size = 192 } = {}) {
  const cache = {};
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#d8d0ff', '#3a2440', 1.7));
  const key = new THREE.DirectionalLight('#fff0dc', 1.9);
  key.position.set(1.5, 2.6, 3);
  scene.add(key, key.target);
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 20);
  cam.position.set(...from);
  cam.lookAt(...at);
  const rt = new THREE.WebGLRenderTarget(size, size);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const pixels = new Uint8Array(size * size * 4);
  return (mood = 'calm') => {
    if (cache[mood]) return cache[mood];
    const root = actor.root, parent = root.parent;
    const pos = root.position.clone(), yaw = root.rotation.y;
    root.position.set(0, 0, 0);
    root.rotation.y = 0;
    actor.face?.show(mood);
    scene.add(root);
    root.updateMatrixWorld(true);
    const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, pixels);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clear, alpha);
    parent?.add(root);
    root.position.copy(pos);
    root.rotation.y = yaw;

    // Onto the talk box's plum, the right way up
    const img = new ImageData(new Uint8ClampedArray(pixels.buffer.slice(0)), size, size);
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = size;
    tmp.getContext('2d').putImageData(img, 0, 0);
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const g = out.getContext('2d');
    const grad = g.createRadialGradient(size * 0.45, size * 0.4, size * 0.1, size / 2, size / 2, size * 0.75);
    grad.addColorStop(0, '#5a2a52');
    grad.addColorStop(1, '#231a2c');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    g.save();
    g.translate(0, size);
    g.scale(1, -1);
    g.drawImage(tmp, 0, 0);
    g.restore();
    return (cache[mood] = out.toDataURL());
  };
}
