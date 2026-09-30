// Wickhollow Square with the HD witch. This is the game's src/main.js, adapted: it loads witch-hd.glb first and
// uses it in place of the code-built witch; she walks (or runs, with Shift) and has a row of buttons for her
// animations. Everything else (the painting, the walkmesh, the cut-outs, Hilde, Agnes, Inkblot, the herbs) is
// the game's own code, imported unchanged from ../../src.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import sceneData from '../../scenes/wickhollow-square.json';
import { images, fonts } from '../../src/assets.js';
import { PaintCamera } from '../../src/paint.js';
import { Walkmesh } from '../../src/walkmesh.js';
import { buildCutouts, LAYER_GUIDES, LAYER_BACKSTAGE } from '../../src/layers.js';
import { Stage, LAYER_GLOW } from '../../src/stage.js';
import { glowSprite, turnToward } from '../../src/actors/kit.js';
import { createKeys } from '../../src/input.js';
import { Field } from '../../src/field.js';
import { createWitchHD } from './witch-hd-actor.js';

const WALK_SPEED = 1.15; // meters per second
const RUN_SPEED = 2.3; // the game's own pace; hold Shift
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- getting the model
// Served over http: fetch it (whole, or in parts where a host limits file size). Opened from disk, browsers
// won't let a page read files next to it, so we ask for the file instead.
async function loadModelBytes() {
  const status = (t) => { $('load-text').textContent = t; };
  try {
    const res = await fetch('witch-hd.glb');
    if (res.ok) return await readWithProgress(res, status);
  } catch {}
  try {
    const parts = [];
    for (let i = 1; i < 10; i++) {
      const res = await fetch(`witch-hd.glb.part${i}`);
      if (!res.ok) break;
      status(`Loading the witch, part ${i}…`);
      parts.push(new Uint8Array(await res.arrayBuffer()));
    }
    if (parts.length) {
      const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
      let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out.buffer;
    }
  } catch {}
  // Ask for the file
  $('load-pick').hidden = false;
  status('Opened from your disk, so the page can’t fetch the model by itself.');
  return new Promise((resolve) => {
    const take = (file) => { status('Reading the witch…'); file.arrayBuffer().then(resolve); };
    $('load-file').addEventListener('change', (e) => e.target.files[0] && take(e.target.files[0]));
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) take(f); });
  });
}
async function readWithProgress(res, status) {
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total) return res.arrayBuffer();
  const reader = res.body.getReader();
  const buf = new Uint8Array(total);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf.set(value, got);
    got += value.length;
    status(`Loading the witch… ${Math.round((got / total) * 100)}%`);
  }
  return buf.buffer;
}

async function boot() {
  loadFonts();
  const bytes = await loadModelBytes();
  $('load-pick').hidden = true;
  $('load-text').textContent = 'Dressing her…';
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  $('loading').classList.add('done');

  const canvas = $('stage');
  const painting = await loadTexture(images[sceneData.image]);
  const paint = new PaintCamera(sceneData.size, sceneData.camera);
  const walk = new Walkmesh(sceneData, paint);

  const world = new THREE.Scene();
  const cutouts = buildCutouts(sceneData, paint, painting);
  world.add(cutouts.group);
  world.add(buildGuides(walk, cutouts));
  const backstage = buildBackstage(paint, painting, cutouts);
  world.add(backstage);
  const cameraModel = backstage.getObjectByName('painter-camera');
  const lamps = addLights(world, sceneData, paint);

  const stage = new Stage(canvas, { paint, painting, world, cutouts });
  const center = walk.bounds.getCenter(new THREE.Vector3());
  stage.target.set(center.x, 0.5, center.z);

  const witch = createWitchHD(gltf);
  world.add(witch.root, witch.fx);
  const player = {
    actor: witch,
    pos: paint.toWorld(...sceneData.spawn.pixel),
    heading: { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[sceneData.spawn.facing] ?? 0,
    path: null,
    onArrive: null,
    radius: 0.18,
  };
  player.obstacle = { x: player.pos.x, z: player.pos.z, r: player.radius, off: true };

  const field = new Field({ world, walk, paint, stage, player, scene: sceneData });
  walk.buildGrid(player.radius);
  // Draw her smooth by default so the detail shows (the Pixels button still cycles 1x, 2x, off)
  stage.setPixelSize(0);
  $('btn-pixels').textContent = 'Pixels off';

  const keys = createKeys((what) => field.onKey(what));
  field.keys = keys;
  let running = false;
  addEventListener('keydown', (e) => { if (e.key === 'Shift') running = true; });
  addEventListener('keyup', (e) => { if (e.key === 'Shift') running = false; });
  addEventListener('blur', () => { running = false; });
  addEventListener('resize', () => stage.resize());
  setupMoves(witch, field);

  let last = performance.now();
  let time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    let speed = 0, turn = 0;
    const pace = running || $('btn-run').getAttribute('aria-pressed') === 'true' ? RUN_SPEED : WALK_SPEED;
    const before = player.heading;
    const dir = field.canWalk() ? keys.vector() : null;
    if (dir) {
      player.path = null;
      player.onArrive = null;
      player.heading = turnToward(player.heading, Math.atan2(dir.x, dir.z), 14, dt);
      if (walk.step(player.pos, dir.x * pace * dt, dir.z * pace * dt, player.radius, player.obstacle)) speed = pace;
    } else if (player.path && field.canWalk()) {
      const next = player.path[0];
      const dx = next.x - player.pos.x, dz = next.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = pace * dt;
      if (dist <= stepLen) {
        player.pos.set(next.x, 0, next.z);
        player.path.shift();
        if (!player.path.length) {
          player.path = null;
          const done = player.onArrive;
          player.onArrive = null;
          done?.();
        }
      } else {
        player.heading = turnToward(player.heading, Math.atan2(dx, dz), 12, dt);
        if (!walk.step(player.pos, (dx / dist) * stepLen, (dz / dist) * stepLen, player.radius, player.obstacle)) player.path = null;
      }
      speed = pace;
    }
    turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before)) / Math.max(dt, 1e-3);
    player.pos.y = walk.heightAt(player.pos.x, player.pos.z, player.pos.y);
    witch.root.position.copy(player.pos);
    witch.root.rotation.y = player.heading;
    witch.update(dt, speed, turn);

    field.update(dt, time);
    for (const lamp of lamps) lamp.flicker(time);

    const focus = paint.toPixel(player.pos.clone().add(new THREE.Vector3(0, 0.8, 0)));
    stage.setFocus(focus);
    stage.update(dt);
    cameraModel.visible = stage.revealCam.position.distanceTo(paint.camera.position) > 8;
    stage.render();
    field.afterRender();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    stage.setFocus(paint.toPixel(player.pos), true);
    frame(now);
    document.body.classList.add('ready');
  });

  window.__game = { THREE, paint, walk, stage, player, field, world, witch };
}

// The animation buttons (and number keys 1-9)
function setupMoves(witch, field) {
  const moves = [
    ['Wave', 'wave'], ['Curtsy', 'curtsy'], ['Cheer', 'cheer'], ['Cast witchfire', 'cast'], ['Throw witchfire', 'throw'],
    ['Moonlight', 'moonlight'], ['Athame dash', 'dash'], ['Twirl', 'twirl'], ['Gather', 'harvest'], ['Hurt', 'hurt'],
  ];
  const box = $('moves');
  moves.forEach(([label, move], i) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = i < 9 ? `${label} (${i + 1})` : label;
    b.addEventListener('click', () => go(move));
    box.appendChild(b);
  });
  const go = (move) => {
    if (witch.busy || field.talking) return;
    field.player.path = null;
    witch.play(move, move === 'hurt' ? () => witch.setMood('calm') : null);
  };
  addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && !e.repeat) go(moves[n - 1][1]);
  });
  const look = $('btn-look');
  look.addEventListener('click', () => {
    const toon = look.getAttribute('aria-pressed') !== 'true';
    witch.setToon(toon);
    look.setAttribute('aria-pressed', String(toon));
    look.textContent = toon ? 'Toon' : 'HD';
  });
  const zoom = $('btn-zoom');
  zoom.addEventListener('click', () => {
    const on = zoom.getAttribute('aria-pressed') !== 'true';
    zoom.setAttribute('aria-pressed', String(on));
    window.__game.stage.setZoom(on ? 2.6 : 1);
  });
  const run = $('btn-run');
  run.addEventListener('click', () => run.setAttribute('aria-pressed', String(run.getAttribute('aria-pressed') !== 'true')));
  $('btn-moves').addEventListener('click', () => {
    const open = box.hidden;
    box.hidden = !open;
    $('btn-moves').setAttribute('aria-expanded', String(open));
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, reject);
  });
}

function loadFonts() {
  for (const [family, url] of Object.entries(fonts)) {
    const face = new FontFace(family, `url(${url})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => {});
  }
}

// ---------------------------------------------------------------- the rest is as in src/main.js
function buildGuides(walk, cutouts) {
  const group = new THREE.Group();
  group.name = 'guides';
  const pos = [];
  for (const t of walk.tris) for (const v of [t.a, t.b, t.c]) pos.push(v.x, v.y + 0.01, v.z);
  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#35e6ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(fillGeo), new THREE.LineBasicMaterial({ color: '#35e6ff', transparent: true, opacity: 0.35 }));
  const edgePos = [];
  for (const [a, b] of walk.edges) edgePos.push(a.x, a.y + 0.02, a.z, b.x, b.y + 0.02, b.z);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: '#8ff4ff' }));
  for (const o of [fill, wire, edges]) {
    o.layers.set(LAYER_GUIDES);
    o.frustumCulled = false;
    group.add(o);
  }
  return group;
}

function buildBackstage(paint, painting, cutouts) {
  const group = new THREE.Group();
  group.name = 'backstage';
  const cam = paint.camera;
  const depth = paint.distance * 1.45;
  const h = 2 * depth * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const w = h * cam.aspect;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: painting, side: THREE.DoubleSide }));
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  backdrop.position.copy(cam.position).addScaledVector(forward, depth);
  backdrop.quaternion.copy(cam.quaternion);
  group.add(backdrop);
  const body = new THREE.Group();
  body.position.copy(cam.position);
  body.quaternion.copy(cam.quaternion);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.8), new THREE.MeshBasicMaterial({ color: '#f5d88a' }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.8, 12), new THREE.MeshBasicMaterial({ color: '#b8923e' }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -1.2;
  body.add(box, lens);
  body.name = 'painter-camera';
  group.add(body);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
    backdrop.position.clone()
      .add(new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar((x * w) / 2))
      .add(new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion).multiplyScalar((y * h) / 2)));
  const lines = [];
  for (const c of corners) lines.push(cam.position.x, cam.position.y, cam.position.z, c.x, c.y, c.z);
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; lines.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#f5d88a', transparent: true, opacity: 0.55 })));
  const cardLines = [];
  for (const card of cutouts.cards) {
    const p = card.mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3)
      for (const [a, b] of [[i, i + 1], [i + 1, i + 2], [i + 2, i]])
        cardLines.push(p.getX(a), p.getY(a), p.getZ(a), p.getX(b), p.getY(b), p.getZ(b));
  }
  const cardGeo = new THREE.BufferGeometry();
  cardGeo.setAttribute('position', new THREE.Float32BufferAttribute(cardLines, 3));
  group.add(new THREE.LineSegments(cardGeo, new THREE.LineBasicMaterial({ color: '#ff5fd8', transparent: true, opacity: 0.5 })));
  group.traverse((o) => { o.layers.set(LAYER_BACKSTAGE); o.frustumCulled = false; });
  return group;
}

function addLights(world, scene, paint) {
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight('#8b80d8', '#2b1b2e', 1.35));
  const moon = new THREE.DirectionalLight('#d4cdff', 1.5);
  moon.position.set(-8, 12, -6);
  lights.add(moon, moon.target);
  const lamps = [];
  for (const l of scene.lights) {
    const base = paint.toWorld(...l.base);
    const toCam = new THREE.Vector3(paint.camera.position.x - base.x, 0, paint.camera.position.z - base.z).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, base);
    const at = paint.toPlane(...l.pixel, plane);
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
    light.position.copy(at);
    lights.add(light);
    const glow = glowSprite(l.color, l.glow ?? 1.1, 0.35, LAYER_GLOW);
    glow.material.depthTest = false;
    glow.position.copy(at);
    world.add(glow);
    const seed = Math.random() * 10;
    lamps.push({
      flicker(t) {
        const f = 1 + Math.sin(t * 7.3 + seed) * 0.05 + Math.sin(t * 13.1 + seed * 2) * 0.04;
        light.intensity = l.intensity * f;
        glow.material.opacity = 0.32 * f;
      },
    });
  }
  lights.traverse((o) => o.layers.enableAll());
  world.add(lights);
  return lamps;
}

boot().catch((err) => {
  console.error(err);
  const box = $('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
