import * as THREE from 'three';
import sceneData from '../../scenes/battle-graveyard.json';
import { battleArt, fonts } from '../assets.js';
import { PaintCamera } from '../paint.js';
import { buildCutouts } from '../layers.js';
import { Stage, LAYER_GLOW } from '../stage.js';
import { createWitch } from '../actors/witch.js';
import { createMarshLight, createLampMoth } from '../actors/foes.js';
import { glowSprite } from '../actors/kit.js';
import { createSound } from '../audio/sound.js';
import { startBattle, RARITY } from './engine.js';
import { Director } from './director.js';
import { Fx } from './fx.js';

// Battle demo: the witch against Gloomfen foes on Thareia's graveyard backdrop.

async function boot() {
  for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  const painting = await new Promise((res, rej) => new THREE.TextureLoader().load(battleArt[sceneData.image], (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));
  const paint = new PaintCamera(sceneData.size, sceneData.camera);
  const world = new THREE.Scene();
  const cutouts = buildCutouts(sceneData, paint, painting);
  world.add(cutouts.group);
  addLights(world, sceneData, paint);
  const stage = new Stage(document.getElementById('stage'), { paint, painting, world, cutouts });

  const at = (x, y) => paint.toWorld(x, y);
  const audio = createSound();
  const fx = new Fx(world);
  let director = null;
  let run = 0;

  // One fight: the witch against two marsh-lights and a lamp-moth, from Aethermoor's Gloomfen.
  function fight() {
    run++;
    for (const o of [...world.children]) if (o.userData.actor) world.remove(o);
    document.getElementById('labels').replaceChildren();
    document.getElementById('result').hidden = true;
    const state = startBattle({
      party: [{ id: 'witch', level: 5 }], // solo until Inkblot joins the party; wins about 9 fights in 10 with sensible play
      // docs/SLICE.md's second fight: two Sour Wisps and a Lamp-Moth carrying one of Wickhollow's flames
      foes: [{ family: 'marsh-light', name: 'Sour Wisp' }, { family: 'lamp-moth' }, { family: 'marsh-light', name: 'Sour Wisp' }],
      bag: { 'heartsease-tonic': 2, 'hush-tea': 1, moonwater: 2 },
      seed: 7 + run,
      names: { witchfire: 'Witchfire' },
    });
    const witch = createWitch();
    witch.root.position.copy(at(1060, 770));
    witch.root.rotation.y = -Math.PI / 2 + 0.4;
    const makers = { 'marsh-light': () => createMarshLight('#8fe89a'), 'lamp-moth': () => createLampMoth() };
    const spots = [[420, 700], [560, 625], [470, 830]];
    const actors = { witch };
    let i = 0;
    for (const u of Object.values(state.units)) {
      if (u.side !== 'foe') continue;
      const a = makers[u.family]();
      a.root.position.copy(at(...spots[i++]));
      a.root.rotation.y = Math.PI / 2 - 0.35;
      a.root.scale.setScalar(u.family === 'lamp-moth' ? 1.9 : 1.35);
      actors[u.id] = a;
    }
    for (const a of Object.values(actors)) { a.root.userData.actor = true; world.add(a.root); }
    witch.fx.userData.actor = true;
    world.add(witch.fx);
    // The camera sweeps in, as FF9's does when a battle starts.
    stage.setZoom(1.45, true);
    stage.setFocus(paint.toPixel(witch.root.position.clone().setY(1)), true);
    stage.setZoom(1);
    setTimeout(() => stage.setFocus(new THREE.Vector2(724, 640)), 300);
    audio.music('battle');
    director = new Director({ stage, actors, state, audio, fx, onEnd: (out) => finish(out) });
    director.run();
  }

  function finish(out) {
    const box = document.getElementById('result');
    box.hidden = false;
    const win = out?.result === 'victory';
    document.getElementById('result-title').textContent = win ? 'Victory' : 'The witch is sent home';
    const lines = [];
    if (win) {
      audio.sfx('victory');
      setTimeout(() => audio.music('victory'), 600);
      director.actors.witch.play('cheer');
      director.actors.witch.setMood('happy');
      lines.push(`${out.xp} XP · ${out.gold} gold`);
    } else {
      audio.music(null);
      lines.push('Nothing is lost. She wakes by her own hearth, and the Hollow is still there tomorrow.');
    }
    document.getElementById('result-text').textContent = lines.join(' ');
    const loot = document.getElementById('result-loot');
    const herbs = (director.herbs || []).map((h) => ({ name: h.replace('_', '-').replace(/^./, (c) => c.toUpperCase()), rarity: 'herb' }));
    loot.replaceChildren(...[...herbs, ...(out?.drops || [])].map((item) => {
      const li = document.createElement('li');
      const r = item.rarity === 'herb' ? { name: 'Gathered', color: '#9dffb0' } : RARITY[item.rarity];
      li.style.setProperty('--rarity', r?.color || '#ccc');
      li.innerHTML = `<b></b><span></span>`;
      li.querySelector('b').textContent = item.name;
      li.querySelector('span').textContent = r?.name || item.rarity;
      return li;
    }));
  }

  document.getElementById('again').addEventListener('click', () => { audio.unlock(); fight(); });
  addEventListener('pointerdown', () => audio.unlock(), { once: true });
  addEventListener('keydown', (e) => {
    audio.unlock();
    if (!director?.targeting) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') director.targetKey(-1);
    else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') director.targetKey(1);
    else if (e.code === 'Enter' || e.code === 'Space') director.targeting.pick(director.targeting.opts[director.targeting.i]);
    else if (e.code === 'Escape' || e.code === 'Backspace') director.targeting.cancel();
    e.preventDefault();
  });
  document.getElementById('stage').addEventListener('pointerup', (e) => director?.tapAt(e.clientX, e.clientY));
  addEventListener('resize', () => stage.resize());

  fight();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const [id, a] of Object.entries(director.actors)) id === 'witch' ? a.update(dt, 0, 0) : a.update(dt);
    fx.update(dt);
    stage.update(dt);
    stage.render();
    director.afterRender();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => { last = now; frame(now); document.body.classList.add('ready'); });
  window.__battle = { THREE, paint, stage, world, get director() { return director; }, fight };
}

function addLights(world, scene, paint) {
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight('#8b80d8', '#2b1b2e', 1.2));
  const moon = new THREE.DirectionalLight('#d4cdff', 1.6);
  moon.position.set(-8, 10, -6);
  lights.add(moon, moon.target);
  for (const l of scene.lights) {
    const base = paint.toWorld(...l.base);
    const toCam = new THREE.Vector3(paint.camera.position.x - base.x, 0, paint.camera.position.z - base.z).normalize();
    const at = paint.toPlane(...l.pixel, new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, base));
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
    light.position.copy(at);
    lights.add(light);
    const glow = glowSprite(l.color, l.glow ?? 1.1, 0.3, LAYER_GLOW);
    glow.material.depthTest = false;
    glow.position.copy(at);
    world.add(glow);
  }
  lights.traverse((o) => o.layers.enableAll());
  world.add(lights);
}

boot().catch((e) => { console.error(e); });
