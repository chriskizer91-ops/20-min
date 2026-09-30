import * as THREE from 'three';
import { Stage } from './stage.js';
import { Field } from './field.js';
import { createWitch } from './actors/witch.js';
import { createKeys } from './input.js';
import { buildScreen, walkPlayer, loadTexture, loadFonts } from './screen.js';

// A town of painted screens joined by doors, the way FF9 strings its field screens together. Each screen is a
// scene file plus a cast (who and what is on it: see Field). An exit with "to" leads to another screen: walking
// into it fades out to violet (docs/SLICE.md §5: "the short fade goes to violet rather than black"), swaps the
// painting, the camera, the floor and the cast, puts her in the matching doorway (the new screen's "arrivals",
// keyed by the screen she came from) and fades back in as she takes a few steps into the room. The music changes
// only if the new cast asks for different music. Every screen is built once, the first time it's needed (the rest
// are built quietly after the first is up), and kept.
//
//   bootTown({ screens: { id: { data, cast } }, start: id, images: { path: url }, footsteps: 'step-wood' })

const PLAYER_RADIUS = 0.18;
const FACING = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 };
const FADE_OUT = 450, FADE_IN = 650; // ms, matching #fade's transition in the page
const STEP_EVERY = 1.12; // s: Thareia's 'step-wood' is four footfalls, about her pace

export async function bootTown({ screens, start, images, footsteps = 'step-wood' }) {
  loadFonts();
  const canvas = document.getElementById('stage');
  const loading = new Map();
  const screen = (id) => {
    if (!loading.has(id)) loading.set(id, (async () => {
      const { data, cast } = screens[id];
      const painting = await loadTexture(images[data.image]);
      const s = buildScreen(data, painting);
      s.walk.buildGrid(PLAYER_RADIUS);
      return Object.assign(s, { id, cast });
    })());
    return loading.get(id);
  };

  let here = await screen(start);
  const stage = new Stage(canvas, { paint: here.paint, painting: here.painting, world: here.world, cutouts: here.cutouts });
  const witch = createWitch();
  const player = { actor: witch, pos: new THREE.Vector3(), heading: 0, path: null, onArrive: null, radius: PLAYER_RADIUS };
  player.obstacle = { x: 0, z: 0, r: PLAYER_RADIUS, off: true };
  place(here, here.data.spawn);
  here.world.add(witch.root, witch.fx);
  aim(here);
  const field = new Field({ world: here.world, walk: here.walk, paint: here.paint, stage, player, scene: here.data, cast: here.cast });
  const keys = createKeys((what) => field.onKey(what));
  field.keys = keys;
  addEventListener('resize', () => stage.resize());

  // ---------------------------------------------------------------- through a door
  const fade = document.getElementById('fade');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let going = false;
  field.onExit = (exit) => go(exit.to);
  async function go(to) {
    if (going || !screens[to]) return;
    going = true;
    const from = here.id;
    field.locked = true;
    player.path = null;
    fade.classList.add('on');
    field.audio.sfx('door');
    const [next] = await Promise.all([screen(to), sleep(FADE_OUT)]);
    field.leave();
    stage.setScreen(next);
    next.cutouts.uniforms.tintAmount.value = stage.showGuides ? 1 : 0;
    here = next;
    const at = next.data.arrivals?.[from] ?? next.data.spawn;
    place(next, at);
    next.world.add(witch.root, witch.fx);
    aim(next);
    field.enter({ world: next.world, walk: next.walk, paint: next.paint, scene: next.data }, next.cast);
    stage.setFocus(next.paint.toPixel(focusPoint()), true);
    field.showPlace();
    field.locked = false;
    if (at.walk) field.walkTo(next.paint.toWorld(...at.walk));
    fade.classList.remove('on');
    await sleep(FADE_IN);
    going = false;
  }

  function place(s, at) {
    const [x, y, h = 0] = at.pixel;
    player.pos.copy(s.paint.toWorld(x, y, h));
    player.pos.y = s.walk.heightAt(player.pos.x, player.pos.z, h);
    player.heading = FACING[at.facing] ?? 0;
    player.path = null;
    player.onArrive = null;
    player.obstacle.x = player.pos.x;
    player.obstacle.z = player.pos.z;
  }
  // Behind the scenes, the camera orbits the middle of the floor, far enough out to take in this screen's painting
  function aim(s) {
    const c = s.walk.bounds.getCenter(new THREE.Vector3());
    stage.target.set(c.x, 0.5, c.z);
    stage.reveal.dist = Math.max(32, s.paint.distance * 2.1);
  }
  const focusPoint = () => player.pos.clone().add(new THREE.Vector3(0, 0.8, 0));

  // ---------------------------------------------------------------- each frame
  let last = performance.now(), time = 0, stepWait = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    const before = player.heading;
    const speed = walkPlayer(player, here.walk, keys, field.canWalk(), dt, here.paint);
    const turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before)) / Math.max(dt, 1e-3);
    witch.root.position.copy(player.pos);
    witch.root.rotation.y = player.heading;
    witch.update(dt, speed, turn);
    // Her boots on the boards
    if (speed > 0) {
      if ((stepWait -= dt) <= 0) { field.audio.sfx(footsteps); stepWait = STEP_EVERY; }
    } else stepWait = 0;

    field.update(dt, time);
    for (const lamp of here.lamps) lamp.flicker(time);
    stage.setFocus(here.paint.toPixel(focusPoint()));
    stage.update(dt);
    // The little camera model is where the view starts from, so keep it out of the way until we've left it.
    here.cameraModel.visible = stage.revealCam.position.distanceTo(here.paint.camera.position) > 8;
    stage.render();
    field.afterRender();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    stage.setFocus(here.paint.toPixel(focusPoint()), true);
    frame(now);
    document.body.classList.add('ready');
    // Build the other screens while she looks around, so their doors open without a wait
    setTimeout(() => { for (const id of Object.keys(screens)) screen(id); }, 1500);
  });

  // A handle for tests and for poking at things from the browser console.
  const game = {
    THREE, stage, player, field, witch, go,
    get here() { return here; },
    get paint() { return here.paint; },
    get walk() { return here.walk; },
    get world() { return here.world; },
  };
  window.__game = game;
  return game;
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
