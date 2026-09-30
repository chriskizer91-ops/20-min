// The HD witch up close: orbit around her, play any clip, try her faces, switch HD/toon.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import jacquard from '../../art/fonts/Jacquard12-Regular.ttf';
import pixelify from '../../art/fonts/PixelifySans[wght].ttf';

for (const [family, url] of [['Jacquard 12', jacquard], ['Pixelify Sans', pixelify]]) {
  new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
}

const $ = (id) => document.getElementById(id);

async function loadModelBytes() {
  const status = (t) => { $('load-text').textContent = t; };
  try {
    const res = await fetch('witch-hd.glb');
    if (res.ok) {
      const total = Number(res.headers.get('content-length')) || 0;
      if (!res.body || !total) return await res.arrayBuffer();
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
  $('load-pick').hidden = false;
  status('Opened from your disk, so the page can’t fetch the model by itself.');
  return new Promise((resolve) => {
    const take = (file) => { status('Reading the witch…'); file.arrayBuffer().then(resolve); };
    $('load-file').addEventListener('change', (e) => e.target.files[0] && take(e.target.files[0]));
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) take(f); });
  });
}

async function boot() {
  const bytes = await loadModelBytes();
  $('load-pick').hidden = true;
  $('load-text').textContent = 'Dressing her…';
  const gltf = await new GLTFLoader().parseAsync(bytes, '');

  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171020');
  scene.fog = new THREE.Fog('#171020', 6, 14);
  scene.add(new THREE.HemisphereLight('#cfd0ff', '#3a2433', 1.25));
  const key = new THREE.DirectionalLight('#fff0dd', 2.6);
  key.position.set(-1.6, 2.8, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -0.2, near: 0.5, far: 8 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#c9b6ff', 2.0);
  rim.position.set(0.8, 2.2, -3);
  scene.add(rim);
  const fillL = new THREE.DirectionalLight('#9fb0ff', 0.7);
  fillL.position.set(2.5, 1.2, 1.5);
  scene.add(fillL);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: '#2b2233', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const rug = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 96), new THREE.MeshBasicMaterial({ color: '#e2bd67', transparent: true, opacity: 0.35 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.002;
  scene.add(rug);

  const model = gltf.scene;
  const meshes = [];
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = !o.material.transparent; meshes.push(o); } });
  scene.add(model);
  let tris = 0;
  for (const m of meshes) tris += m.geometry.index.count / 3;
  $('stats').textContent = `${Math.round(tris).toLocaleString()} triangles · ${meshes.length} parts · ${gltf.animations.length} animations`;

  const fireBone = model.getObjectByName('witchfire');
  const fireLight = new THREE.PointLight('#b46bff', 0, 2.5, 2);
  fireLight.position.y = 0.06;
  fireBone.add(fireLight);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 40);
  camera.position.set(0.9, 1.2, 3.1);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.minDistance = 0.35;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.53;

  // Materials: HD or toon
  const standard = new Map(meshes.map((m) => [m, m.material]));
  const toonMats = new Map();
  const gradient = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const setToon = (on) => {
    for (const m of meshes) {
      const src = standard.get(m);
      if (!on || src.transparent) { m.material = src; continue; }
      if (!toonMats.has(src)) toonMats.set(src, new THREE.MeshToonMaterial({ color: src.color, map: src.map, vertexColors: src.vertexColors, gradientMap: gradient, emissive: src.emissive, emissiveIntensity: src.emissiveIntensity }));
      m.material = toonMats.get(src);
    }
  };

  // Animation
  const mixer = new THREE.AnimationMixer(model);
  let current = null;
  const play = (name) => {
    const clip = gltf.animations.find((a) => a.name === name);
    const next = mixer.clipAction(clip);
    const loop = ['Idle', 'Walk', 'Run'].includes(name) || $('repeat').checked;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = true;
    next.play();
    if (current && current !== next) current.crossFadeTo(next, 0.25, false);
    current = next;
    for (const b of $('clips').children) b.setAttribute('aria-pressed', String(b.dataset.clip === name));
  };
  mixer.addEventListener('finished', () => { if (!$('repeat').checked) setTimeout(() => play('Idle'), 150); });
  const labels = { CastWitchfire: 'Cast witchfire', ThrowWitchfire: 'Throw witchfire', AthameDash: 'Athame dash' };
  for (const a of gltf.animations) {
    const b = document.createElement('button');
    b.textContent = labels[a.name] ?? a.name;
    b.dataset.clip = a.name;
    b.addEventListener('click', () => play(a.name));
    $('clips').appendChild(b);
  }
  play('Idle');

  // Faces (on top of the clip)
  const faces = meshes.filter((m) => m.morphTargetDictionary);
  let mood = null;
  for (const name of ['Blink', 'Smile', 'Surprise', 'Pain']) {
    const b = document.createElement('button');
    b.textContent = name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      mood = mood === name ? null : name;
      for (const c of $('faces').children) c.setAttribute('aria-pressed', String(c.textContent === mood));
    });
    $('faces').appendChild(b);
  }
  $('look').addEventListener('click', () => {
    const on = $('look').getAttribute('aria-pressed') !== 'true';
    $('look').setAttribute('aria-pressed', String(on));
    $('look').textContent = on ? 'Toon' : 'HD';
    setToon(on);
  });
  $('spin').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    $('spin').setAttribute('aria-pressed', String(controls.autoRotate));
  });
  const focus = { Full: [0, 0.8, 0, 3.2], Face: [0, 1.08, 0.05, 0.8], Hat: [0, 1.35, 0, 1.6], Hands: [0.2, 0.55, 0.05, 1.0], Boots: [0, 0.18, 0.05, 1.0] };
  for (const [name, [x, y, z, d]] of Object.entries(focus)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.addEventListener('click', () => {
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.target.set(x, y, z);
      camera.position.copy(controls.target).addScaledVector(dir, d);
    });
    $('focus').appendChild(b);
  }

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    mixer.update(dt);
    if (mood) for (const m of faces) { const i = m.morphTargetDictionary[mood]; m.morphTargetInfluences[i] = 1; }
    const s = fireBone.scale.x;
    fireLight.intensity = s > 0.05 ? 2 * s : 0;
    controls.update();
    renderer.render(scene, camera);
  });
  $('loading').classList.add('done');
  window.__viewer = { gltf, mixer, play, scene, camera, controls, renderer };
}

boot().catch((err) => {
  console.error(err);
  $('load-text').textContent = `Couldn't load her: ${err.message}`;
});
