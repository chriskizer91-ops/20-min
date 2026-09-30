import * as THREE from 'three';
import { blobShadow, onLayer } from '../../src/actors/kit.js';

// The HD witch (witch-hd.glb) as a game actor. It has the same shape as src/actors/witch.js's createWitch(),
// so the square's code can drive it unchanged: update(dt, speed, turn) each frame, play(move, onHit) for actions,
// busy while one plays, setMood(mood) for her face.

// The game's move names -> the clips in the file, and when (0..1 of the clip) the move "lands"
const MOVES = {
  harvest: ['Gather', 0.5], cast: ['CastWitchfire', 0.45], throw: ['ThrowWitchfire', 0.45], moonlight: ['Moonlight', 0.5],
  dash: ['AthameDash', 0.4], cheer: ['Cheer', 0.3], wave: ['Wave', 0.3], curtsy: ['Curtsy', 0.5], hurt: ['Hurt', 0.2],
  veil: ['Twirl', 0.5], twirl: ['Twirl', 0.5], rune: ['Wave', 0.5], brew: ['Curtsy', 0.5],
};
// How fast each loop moves her when played at normal speed (meters per second); see tools/anim/clips.mjs
const NATIVE = { Walk: 0.72, Run: 1.65 };

export function createWitchHD(gltf, { toonLook = false } = {}) {
  const root = new THREE.Group();
  root.name = 'witch-hd';
  const model = gltf.scene;
  root.add(model);
  const meshes = [];
  model.traverse((o) => {
    if (o.isMesh) { o.frustumCulled = false; meshes.push(o); }
  });
  root.add(blobShadow(0.3, 0.5));
  onLayer(root);

  // Materials: as authored (PBR), or flat toon shading to sit with the painted game
  const standard = new Map(meshes.map((m) => [m, m.material]));
  const toonMats = new Map();
  const gradient = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  function setToon(on) {
    for (const m of meshes) {
      const src = standard.get(m);
      if (!on || src.transparent) { m.material = src; continue; }
      if (!toonMats.has(src)) {
        const t = new THREE.MeshToonMaterial({ color: src.color, map: src.map, vertexColors: src.vertexColors, gradientMap: gradient, emissive: src.emissive, emissiveMap: src.emissiveMap, emissiveIntensity: src.emissiveIntensity });
        toonMats.set(src, t);
      }
      m.material = toonMats.get(src);
    }
  }
  setToon(toonLook);

  // Faces: the morph targets on the Face mesh
  const faces = meshes.filter((m) => m.morphTargetDictionary);
  const face = (name, value) => {
    for (const m of faces) {
      const i = m.morphTargetDictionary[name];
      if (i != null) m.morphTargetInfluences[i] = Math.max(m.morphTargetInfluences[i], value);
    }
  };

  // The witchfire bone gets a violet light that grows with the flame
  const fireBone = model.getObjectByName('witchfire');
  const fireLight = new THREE.PointLight('#b46bff', 0, 2.2, 2);
  fireLight.position.set(0, 0.06, 0);
  fireBone?.add(fireLight);
  fireLight.layers.enableAll();

  // A soft moonlit fill that follows her from the camera's side, so the detail reads in the dark square
  const fill = new THREE.PointLight('#d9d0ff', 2.2, 6, 1.6);
  fill.layers.enableAll();
  const fx = new THREE.Group();
  fx.add(fill);

  // Animation
  const mixer = new THREE.AnimationMixer(model);
  const clip = (name) => gltf.animations.find((a) => a.name === name);
  const act = Object.fromEntries(gltf.animations.map((a) => [a.name, mixer.clipAction(a)]));
  const loops = ['Idle', 'Walk', 'Run'];
  for (const n of loops) { act[n].play(); act[n].setEffectiveWeight(n === 'Idle' ? 1 : 0); }
  const weights = { Idle: 1, Walk: 0, Run: 0 };
  let action = null; // { name, a, t, dur, hitAt, onHit, hit, fade }
  let mood = 'calm', blinkT = 2.5, blink = 0;

  const api = {
    root, fx, gltf, mixer, actions: act, fill,
    height: 1.59,
    radius: 0.2,
    get busy() { return !!action; },
    moves: Object.keys(MOVES),
    clips: gltf.animations.map((a) => a.name),
    setMood(m) { mood = m; },
    setToon,
    // Play an action: a game move name (harvest, cast, ...) or a clip name (Gather, Wave, ...)
    play(name, onHit, opts = {}) {
      const [clipName, hitAt] = MOVES[name] ?? [name, 0.5];
      const a = act[clipName];
      if (!a) return;
      if (action) action.a.fadeOut(0.1);
      a.reset();
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.timeScale = 1 / (opts.slow ?? 1);
      a.setEffectiveWeight(1);
      a.fadeIn(0.18);
      a.play();
      action = { name, a, t: 0, dur: clip(clipName).duration * (opts.slow ?? 1), hitAt, onHit, hit: false };
    },
    update(dt, speed = 0, turn = 0) {
      // Which loop: stand, walk or run, matched to how fast she is going so her feet don't slide
      const target = action ? null : speed < 0.05 ? 'Idle' : speed < 1.5 ? 'Walk' : 'Run';
      for (const n of loops) {
        const w = action ? 0 : n === target ? 1 : 0;
        weights[n] += (w - weights[n]) * (1 - Math.exp(-dt * (action ? 14 : 10)));
        act[n].setEffectiveWeight(weights[n]);
      }
      if (speed > 0.05) {
        act.Walk.timeScale = Math.max(0.6, speed / NATIVE.Walk);
        act.Run.timeScale = Math.max(0.6, speed / NATIVE.Run);
      }
      if (action) {
        action.t += dt;
        const k = action.t / action.dur;
        if (!action.hit && k >= action.hitAt) { action.hit = true; action.onHit?.(); }
        if (k >= 1) {
          action.a.fadeOut(0.3);
          action = null;
        }
      }
      mixer.update(dt);
      fill.position.copy(root.position).add(new THREE.Vector3(0.4, 1.7, 1.6));
      // Blinks and moods on top of whatever the clip does with her face
      if ((blinkT -= dt) < 0) { blink = 0.14; blinkT = 2.2 + Math.random() * 3.5; }
      if (blink > 0) { blink -= dt; face('Blink', Math.sin((1 - blink / 0.14) * Math.PI)); }
      if (mood === 'happy') face('Smile', 1);
      if (mood === 'surprised') face('Surprise', 1);
      // The flame's light follows its size
      if (fireBone) {
        const s = fireBone.scale.x;
        fireLight.intensity = s > 0.05 ? 1.8 * s * (0.85 + 0.15 * Math.sin(performance.now() / 45)) : 0;
      }
    },
  };
  return api;
}
