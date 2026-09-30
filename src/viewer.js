import * as THREE from 'three';
import { createWitch } from './actors/witch.js';
import { fonts, images } from './assets.js';
import { RIM, INK } from './actors/kit.js';

// "The Witch, Up Close": the Moonlight Witch on a turntable in Wren's cottage, large enough to see every
// detail, with buttons to try her moves and faces. It's a demo page for checking the model, not part of
// the game's story.

for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});

document.getElementById('backdrop').style.setProperty('--room', `url(${images['art/backgrounds/cottage-inside.webp']})`);
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

// Cottage light: a warm hearth to her left, cool moonlight from the window behind, a dim room
scene.add(new THREE.HemisphereLight('#8b80d8', '#3a2418', 0.8));
const hearth = new THREE.PointLight('#ffa050', 6, 8, 2);
hearth.position.set(-1.6, 1.1, 1.0);
scene.add(hearth);
const moon = new THREE.DirectionalLight('#cfc8ff', 1.3);
moon.position.set(2, 3, -3);
scene.add(moon);
const fill = new THREE.DirectionalLight('#ffe0c0', 0.25);
fill.position.set(1, 2, 3);
scene.add(fill);

// A round rug to stand on
const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), new THREE.MeshToonMaterial({ color: '#3a1d3f' }));
rug.rotation.x = -Math.PI / 2;
scene.add(rug);
const rim = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 48), new THREE.MeshBasicMaterial({ color: '#b08a4a' }));
rim.rotation.x = -Math.PI / 2;
rim.position.y = 0.002;
scene.add(rim);

const witch = createWitch();
scene.add(witch.root);
witch.root.traverse((o) => o.layers.enableAll());

const view = { yaw: 0.35, pitch: 0.1, dist: 4.4, spin: true, target: new THREE.Vector3(0, 0.84, 0), game: false };
// Up close the ink outline would be too heavy, so draw it thinner here than in the game.
INK.uniforms.thickness.value = 0.009;
let mode = 'idle';
let pixel = 0;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setPixelRatio(pixel ? Math.min(devicePixelRatio, 2) / pixel / 1.5 : Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Frame her whole height on a phone held upright, too.
  camera.fov = camera.aspect < 0.8 ? 40 : 30;
  const panel = document.getElementById('panel').getBoundingClientRect().height + 20;
  camera.setViewOffset(w, h, 0, panel * 0.5, w, h);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Drag to turn her, pinch or wheel to zoom
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); setSpin(false); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  view.yaw -= (e.clientX - drag.x) * 0.008;
  view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - drag.y) * 0.005, -0.2, 1.2);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.dist = THREE.MathUtils.clamp(view.dist * Math.exp(e.deltaY * 0.001), 1.4, 8); }, { passive: false });

// Buttons
const $ = (id) => document.getElementById(id);
function pick(group, id) {
  for (const b of document.querySelectorAll(`[data-group="${group}"]`)) b.setAttribute('aria-pressed', String(b.id === id));
}
for (const [id, m] of [['m-idle', 'idle'], ['m-walk', 'walk']]) $(id).addEventListener('click', () => { mode = m; pick('move', id); });
for (const [id, a] of [['m-harvest', 'harvest'], ['m-cast', 'cast'], ['m-cheer', 'cheer']])
  $(id).addEventListener('click', () => { mode = 'idle'; pick('move', 'm-idle'); witch.play(a); });
for (const [id, m] of [['f-calm', 'calm'], ['f-happy', 'happy'], ['f-surprised', 'surprised']])
  $(id).addEventListener('click', () => { witch.setMood(m); pick('face', id); });
function setSpin(on) { view.spin = on; $('v-spin').setAttribute('aria-pressed', String(on)); }
$('v-spin').addEventListener('click', () => setSpin(!view.spin));
$('v-game').addEventListener('click', () => {
  view.game = !view.game;
  $('v-game').setAttribute('aria-pressed', String(view.game));
});
$('v-pixels').addEventListener('click', () => {
  pixel = pixel === 0 ? 2 : pixel === 2 ? 1 : 0;
  canvas.classList.toggle('pixelated', pixel > 0);
  $('v-pixels').textContent = pixel ? `Pixels ${pixel}×` : 'Pixels off';
  resize();
});

let last = performance.now(), time = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  if (view.spin) view.yaw += dt * 0.35;
  witch.update(dt, mode === 'walk' ? 2.1 : 0, 0);
  // The in-game camera: far away, looking down 30 degrees with a long lens, as in the square
  const pitch = view.game ? 0.52 : view.pitch;
  const dist = view.game ? 6.5 : view.dist;
  const t = view.game ? new THREE.Vector3(0, 0.8, 0) : view.target;
  camera.position.set(Math.sin(view.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(view.yaw) * Math.cos(pitch)).multiplyScalar(dist).add(t);
  camera.lookAt(t);
  hearth.intensity = 6 * (0.92 + Math.sin(time * 6.3) * 0.05 + Math.sin(time * 11.7) * 0.04);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame((now) => { last = now; frame(now); document.body.classList.add('ready'); });

window.__viewer = { THREE, witch, view, scene, camera, RIM, setMode: (m) => (mode = m) };
