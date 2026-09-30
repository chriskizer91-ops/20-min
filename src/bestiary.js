import * as THREE from 'three';
import { MODELS } from './actors/registry.js';
import { createWitch } from './actors/witch.js';
import { fonts, battleArt } from './assets.js';
import { INK } from './actors/kit.js';

// The bestiary: every 3D model on a turntable, with its moves, next to the witch for scale. For checking that
// each character is modelled as well as she is. Open with #<id> to start on one model.

for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
document.getElementById('backdrop').style.setProperty('--room', `url(${battleArt['art/battle/graveyard-night.webp']})`);

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
scene.add(new THREE.HemisphereLight('#8b80d8', '#2b1b2e', 1.1));
const moon = new THREE.DirectionalLight('#d4cdff', 1.6);
moon.position.set(-3, 5, 2);
scene.add(moon);
const warm = new THREE.PointLight('#ffb45e', 5, 10, 2);
warm.position.set(2.5, 2, 2.5);
scene.add(warm);
const ground = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshToonMaterial({ color: '#2a2233' }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
INK.uniforms.thickness.value = 0.009;

const view = { yaw: 0.5, pitch: 0.18, dist: 5, spin: true, withWitch: true };
let current = null, witch = null;

function show(entry) {
  if (current) scene.remove(current.model.root, ...(current.model.fx ? [current.model.fx] : []));
  const model = entry.make();
  scene.add(model.root);
  if (model.fx) scene.add(model.fx);
  current = { entry, model };
  model.root.position.set(view.withWitch && entry.id !== 'witch' ? 0.55 : 0, 0, 0);
  document.getElementById('name').textContent = entry.name;
  document.getElementById('note').textContent = entry.note || '';
  const moves = document.getElementById('moves');
  moves.replaceChildren(...(model.moves || []).map((m) => {
    const b = document.createElement('button');
    b.textContent = m;
    b.addEventListener('click', () => model.play?.(m));
    return b;
  }));
  for (const b of document.querySelectorAll('#models button')) b.setAttribute('aria-pressed', String(b.dataset.id === entry.id));
  document.querySelector(`#models button[data-id="${entry.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  view.height = Math.max(model.height ?? 1.5, 1.7);
  view.target = new THREE.Vector3(0, view.height * 0.5, 0);
  frameModel();
  if (witch) witch.root.visible = view.withWitch && entry.id !== 'witch';
}

// Back off far enough that the model fits, with some air, in the part of the screen the panel leaves free.
function frameModel() {
  const H = canvas.clientHeight || innerHeight;
  const panel = document.getElementById('panel').getBoundingClientRect().height + 20;
  const free = THREE.MathUtils.clamp((H - panel) / H, 0.3, 1);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const aspect = (canvas.clientWidth || innerWidth) / H;
  // How wide the pair is: the witch at -0.8 and the model at +0.55, each with some room either side
  const r = Math.max(0.35, current?.model.radius ?? 0.4);
  const width = view.withWitch && current?.entry.id !== 'witch' ? 1.35 + 0.35 + r + 0.3 : 2 * r + 0.6;
  view.dist = Math.max(3.6, (view.height * 1.3) / (2 * tan * free), (width * 1.25) / (2 * tan * aspect));
}

witch = createWitch();
witch.root.position.set(-0.8, 0, 0);
scene.add(witch.root);

document.getElementById('models').replaceChildren(...MODELS.map((e) => {
  const b = document.createElement('button');
  b.dataset.id = e.id;
  b.textContent = e.name;
  b.addEventListener('click', () => { show(e); history.replaceState(null, '', `#${e.id}`); });
  return b;
}));
document.getElementById('spin').addEventListener('click', (e) => { view.spin = !view.spin; e.target.setAttribute('aria-pressed', String(view.spin)); });
document.getElementById('scale').addEventListener('click', (e) => { view.withWitch = !view.withWitch; e.target.setAttribute('aria-pressed', String(view.withWitch)); show(current.entry); });

let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); view.spin = false; });
canvas.addEventListener('pointermove', (e) => { if (!drag) return; view.yaw -= (e.clientX - drag.x) * 0.008; view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - drag.y) * 0.005, -0.2, 1.3); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.dist = THREE.MathUtils.clamp(view.dist * Math.exp(e.deltaY * 0.001), 1.5, 30); }, { passive: false });

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.8 ? 42 : 30;
  const panel = document.getElementById('panel').getBoundingClientRect().height + 20;
  camera.setViewOffset(w, h, 0, panel * 0.5, w, h);
  camera.updateProjectionMatrix();
  if (current) frameModel();
}
addEventListener('resize', resize);
// The panel changes height with each model's list of moves
new ResizeObserver(() => resize()).observe(document.getElementById('panel'));

const start = MODELS.find((m) => m.id === location.hash.slice(1)) ?? MODELS[0];
show(start);
resize();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (view.spin) view.yaw += dt * 0.35;
  current.model.update(dt, 0, 0);
  witch.update(dt, 0, 0);
  camera.position.set(Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw) * Math.cos(view.pitch)).multiplyScalar(view.dist).add(view.target);
  camera.lookAt(view.target);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame((now) => { last = now; frame(now); document.body.classList.add('ready'); });
window.__bestiary = { THREE, show, MODELS, get current() { return current; }, view, scene, camera };
