import * as THREE from 'three';
import graveyardScene from '../../scenes/battle-graveyard.json';
import gloamwoodScene from '../../scenes/battle-gloamwood.json';
import openFenScene from '../../scenes/battle-open-fen.json';
import boardwalkScene from '../../scenes/battle-long-boardwalk.json';
import mothersHollowScene from '../../scenes/battle-mothers-hollow.json';
import graveyardArt from '../../art/battle/graveyard-night.webp';
import gloamwoodArt from '../../art/battle/gloamwood-night.webp';
import openFenArt from '../../art/battle/open-fen-night.webp';
import boardwalkArt from '../../art/battle/long-boardwalk-night.webp';
import mothersHollowArt from '../../art/battle/mothers-hollow-night.webp';
import { fonts } from '../assets.js';
import { PaintCamera } from '../paint.js';
import { buildCutouts } from '../layers.js';
import { Stage, LAYER_GLOW } from '../stage.js';
import { createWitch } from '../actors/witch.js';
import { createInkblot } from '../actors/inkblot.js';
import { createNettie } from '../actors/nettie.js';
import { createMarshLight, createLampMoth, createGlowcap, createMandrake, createBoglurcher, createMireLeech } from '../actors/foes.js';
import { createWillowWight } from '../actors/bosses-willow.js';
import { createDrownedChorister } from '../actors/bosses-chorister.js';
import { createGloamwing } from '../actors/bosses-gloamwing.js';
import { createLanternMother } from '../actors/bosses-lantern.js';
import { glowSprite, onLayer } from '../actors/kit.js';
import { createSound } from '../audio/sound.js';
import { RARITY } from './engine.js';
import { ENCOUNTERS, ORDER, startEncounter, nextForm, CURVE } from './encounters.js';
import { Director } from './director.js';
import { Fx } from './fx.js';

// The battle demo: the night's six fights (docs/SLICE.md §2, tuned in docs/BALANCE.md), each on its own painted
// backdrop, with the party it's met with: the witch and Inkblot in the Gloamwood, and Nettie too in the fen. Pick a
// fight, or play them in order. B6 turns into Lights Out when her first form is beaten.

// The backdrops all share one painter's camera (a low side view), so one Stage serves them all.
const SCENES = {
  gloamwood: { data: gloamwoodScene, art: gloamwoodArt },
  graveyard: { data: graveyardScene, art: graveyardArt },
  'open-fen': { data: openFenScene, art: openFenArt },
  boardwalk: { data: boardwalkScene, art: boardwalkArt },
  'mothers-hollow': { data: mothersHollowScene, art: mothersHollowArt },
};
// B2's twisted grove is in the Gloamwood too; B3 is the Hollow, Thareia's graveyard
const BACKDROP = { B1: 'gloamwood', B2: 'gloamwood', B3: 'graveyard', B4: 'open-fen', B5: 'boardwalk', B6: 'mothers-hollow', B6b: 'mothers-hollow' };
const MUSIC = { B3: 'boss', B6: 'boss', B6b: 'boss' };

const HEROES = { witch: createWitch, inkblot: createInkblot, nettie: createNettie };
// Each foe model and how big to stand it (the models are life-size; the rabble stand a little larger, so they read)
const FOES = {
  'marsh-light': [(o) => createMarshLight('#8fe89a', o), 1.35], 'lamp-moth': [createLampMoth, 1.4], glowcap: [createGlowcap, 1.3],
  'hollowed-mandrake': [createMandrake, 1.45], boglurcher: [createBoglurcher, 1.1], 'mire-leech': [createMireLeech, 1.4],
  'willow-wight': [createWillowWight, 0.95], drowned: [createDrownedChorister, 1], gloamwing: [createGloamwing, 0.95],
  'lantern-mother': [createLanternMother, 0.95], silas: [createSilasFlame, 1],
};
const HERO_SCALE = { inkblot: 1.7 };

async function boot() {
  for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));
  const paint = new PaintCamera(graveyardScene.size, graveyardScene.camera);
  const world = new THREE.Scene();
  const first = SCENES[BACKDROP[pickFromHash() ?? 'B1']];
  first.texture = await load(first.art);
  first.cutouts = buildCutouts(first.data, paint, first.texture);
  const stage = new Stage(document.getElementById('stage'), { paint, painting: first.texture, world, cutouts: first.cutouts });
  const lightRig = new THREE.Group();
  world.add(lightRig);
  let scene = null;

  // Go to a backdrop: its painting, its cut-outs, its lights
  async function useScene(key, { dark = false } = {}) {
    const S = SCENES[key];
    S.texture ??= await load(S.art);
    S.cutouts ??= buildCutouts(S.data, paint, S.texture);
    if (scene?.cutouts) world.remove(scene.cutouts.group);
    world.add(S.cutouts.group);
    stage.setScreen({ paint, painting: S.texture, world, cutouts: S.cutouts });
    lightRig.clear();
    addLights(lightRig, S.data, paint, { dark });
    // Lights Out: every lamp in the painting dims, and the night closes in
    stage.grade.tint.setRGB(...(dark ? [0.5, 0.48, 0.72] : [1, 1, 1]));
    stage.grade.vignette = dark ? 1.2 : 0.25;
    scene = S;
  }

  const audio = createSound();
  const fx = new Fx(world);
  let director = null, fightId = null, run = 0;
  const cast = { heroes: {}, foes: {} };

  const at = (x, y) => paint.toWorld(x, y);
  // The two sides face each other, turned a little toward the camera, so we see their faces (FF9 does the same)
  const FACING = { hero: -Math.PI / 2 + 0.45, foe: Math.PI / 2 - 0.45 };
  // On a phone held upright only a narrow slice of the painting fits, and the menus take the bottom: draw both sides
  // in toward the middle, and back a little so they stand above the menus.
  const layout = ([x, y]) => (innerHeight > innerWidth ? [724 + (x - 724) * 0.55, 560 + (y - 560) * 0.45] : [x, y]);
  function place(actor, spot, scale, side) {
    actor.root.position.copy(at(...layout(spot)));
    actor.root.scale.setScalar(scale);
    actor.root.rotation.y = FACING[side];
    actor.root.userData.actor = true;
    world.add(actor.root);
    if (actor.fx) { actor.fx.userData.actor = true; world.add(actor.fx); }
  }
  function makeFoe(u, spot) {
    const [make, scale] = FOES[u.family] ?? FOES['marsh-light'];
    const a = make({ hollowed: (u.omens || []).includes('hollowed') });
    place(a, spot, scale, 'foe');
    if ((u.omens || []).includes('hollowed')) a.setHollowed?.(true, { instant: true });
    return a;
  }
  function clearStage() {
    for (const o of [...world.children]) if (o.userData.actor) world.remove(o);
    document.getElementById('labels').replaceChildren();
    cast.heroes = {};
    cast.foes = {};
  }

  // Build the fight's models on its backdrop and hand the state to a director
  function stageFight(id, state, { keepHeroes = false } = {}) {
    const spots = scene.data.spots;
    const actors = {};
    const heroes = Object.values(state.units).filter((u) => u.side === 'hero');
    heroes.forEach((u, i) => {
      const hero = u.heroId ?? u.id;
      let a = keepHeroes ? cast.heroes[hero] : null;
      if (!a) {
        a = HEROES[hero]();
        place(a, spots.heroes[i], HERO_SCALE[hero] ?? 1, 'hero');
        cast.heroes[hero] = a;
      }
      a.setMood?.('calm');
      actors[u.id] = a;
    });
    const foes = Object.values(state.units).filter((u) => u.side === 'foe');
    foes.forEach((u, i) => {
      const spot = foes.length === 1 ? [560, 760] : spots.foes[i % spots.foes.length];
      actors[u.id] = cast.foes[u.id] = makeFoe(u, spot);
    });
    // Guests on the party's side (Silas, in Lights Out) stand behind the heroes
    Object.values(state.units).filter((u) => u.side === 'ally').forEach((u) => {
      const a = makeFoe(u, [1290, 700]);
      a.root.rotation.y = FACING.hero;
      actors[u.id] = a;
    });
    // A foe that joins mid-fight takes the first free spot, or stands beside the others
    let extra = 0;
    const spawn = (u) => {
      const taken = Object.values(actors).map((a) => a.root.position);
      const free = spots.foes.find((p) => !taken.some((q) => q.distanceTo(at(...layout(p))) < 0.8)) ?? [380 + (extra++ % 3) * 90, 640 + extra * 40];
      const a = makeFoe(u, free);
      actors[u.id] = a;
      return a;
    };
    director = new Director({ stage, actors, state, audio, fx, spawn, onEnd: (out) => finish(out) });
    return director;
  }

  async function fight(id, { state = null, keepHeroes = false } = {}) {
    run++;
    fightId = id;
    document.getElementById('result').hidden = true;
    document.getElementById('picker').hidden = true;
    history.replaceState(null, '', `#${id}`);
    const e = ENCOUNTERS[id];
    if (!keepHeroes) clearStage();
    else {
      // Keep the party standing; the boss rises again for her second form
      for (const o of [...world.children]) if (o.userData.actor && !Object.values(cast.heroes).some((h) => h.root === o || h.fx === o)) world.remove(o);
      document.getElementById('labels').replaceChildren();
    }
    await useScene(BACKDROP[id], { dark: id === 'B6b' });
    state ??= startEncounter(id, { seed: 7 + run * 13, names: { witchfire: 'Witchfire' } });
    const d = stageFight(id, state, { keepHeroes });
    document.getElementById('where').textContent = `${id.replace('b', '')} · ${e.name}${e.flags.boss ? ' · boss' : ''}`;
    // The camera sweeps in, as FF9's does when a battle starts
    const lead = Object.values(cast.heroes)[0];
    stage.setZoom(1.45, true);
    stage.setFocus(paint.toPixel(lead.root.position.clone().setY(1)), true);
    stage.setZoom(1);
    setTimeout(() => stage.setFocus(new THREE.Vector2(724, 660)), 300);
    audio.music(MUSIC[id] ?? 'battle');
    d.run();
  }

  async function finish(out) {
    const win = out?.result === 'victory';
    // B6's first form won: the lamps go out, all but hers and the one at the skiff's bow, and Silas steps out of it
    if (win && ENCOUNTERS[fightId]?.next) {
      const next = nextForm(director.state);
      if (next) {
        director.caption('The lamps go out, all but hers, and the one at the skiff\'s bow.');
        audio.sfx('nightfall');
        await new Promise((r) => setTimeout(r, 2400));
        const boss = Object.values(cast.foes)[0];
        boss?.play?.('rise');
        boss?.phase?.(3);
        return fight(ENCOUNTERS[fightId].next, { state: next, keepHeroes: true });
      }
    }
    const box = document.getElementById('result');
    box.hidden = false;
    const at = ORDER.indexOf(fightId === 'B6b' ? 'B6' : fightId);
    const nextId = win ? ORDER[at + 1] : null;
    document.getElementById('result-title').textContent = win ? 'Victory' : 'The party is sent home';
    const lines = [];
    const heroes = Object.values(cast.heroes);
    if (win) {
      audio.sfx('victory');
      setTimeout(() => audio.music('victory'), 600);
      for (const h of heroes) { h.play?.('cheer'); h.setMood?.('happy'); }
      lines.push(`${out.xp} XP · ${out.gold} gold`);
      if (fightId === 'B6b') lines.push('The veil falls. "Are they safe?" Everyone got home. Every one.');
    } else {
      audio.music(null);
      lines.push('Nothing is lost. She wakes by her last rest with everything she had, and the fight waits.');
    }
    document.getElementById('result-text').textContent = lines.join(' ');
    const loot = document.getElementById('result-loot');
    const herbs = (director.herbs || []).map((h) => ({ name: h.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()), rarity: 'herb' }));
    // The Wickhollow flames aren't loot: they float home (LORE §9)
    const drops = (out?.drops || []).filter((d) => !/wickhollow flame/i.test(d.name));
    loot.replaceChildren(...[...herbs, ...drops].map((item) => {
      const li = document.createElement('li');
      const r = item.rarity === 'herb' ? { name: 'Gathered', color: '#9dffb0' } : RARITY[item.rarity];
      li.style.setProperty('--rarity', r?.color || '#ccc');
      li.innerHTML = '<b></b><span></span>';
      li.querySelector('b').textContent = item.name;
      li.querySelector('span').textContent = r?.name || item.rarity;
      return li;
    }));
    const again = document.getElementById('again');
    again.textContent = win ? 'Fight again' : 'Try again';
    const onward = document.getElementById('onward');
    onward.hidden = !nextId;
    if (nextId) onward.textContent = `On to ${ENCOUNTERS[nextId].name}`;
    onward.onclick = () => { audio.unlock(); fight(nextId); };
  }

  // The fight picker
  const list = document.getElementById('fights');
  list.replaceChildren(...ORDER.map((id) => {
    const e = ENCOUNTERS[id];
    const b = document.createElement('button');
    const party = e.party.map((h) => ({ witch: 'the witch', inkblot: 'Inkblot', nettie: 'Nettie' }[h])).join(', ');
    b.innerHTML = `<b>${e.name}</b><span>${e.where} · ${party} · level ${CURVE.typical[id]?.level ?? 1}${e.flags.boss ? ' · boss' : ''}${e.flags.required ? '' : ' · optional'}</span>`;
    b.addEventListener('click', () => { audio.unlock(); audio.sfx('ui-confirm'); fight(id); });
    return b;
  }));
  document.getElementById('btn-fights').addEventListener('click', () => { audio.sfx('ui-open'); document.getElementById('picker').hidden = false; });
  document.getElementById('picker-close').addEventListener('click', () => { document.getElementById('picker').hidden = true; });
  document.getElementById('again').addEventListener('click', () => { audio.unlock(); fight(fightId === 'B6b' ? 'B6' : fightId); });
  document.getElementById('choose').addEventListener('click', () => { document.getElementById('picker').hidden = false; });
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

  await fight(pickFromHash() ?? 'B1');
  let last = performance.now();
  function frame(now) {
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.05);
    last = now;
    for (const a of new Set(Object.values(director.actors))) a.update(dt, 0, 0);
    fx.update(dt);
    stage.update(dt);
    stage.render();
    director.afterRender();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => { last = now; frame(now); document.body.classList.add('ready'); });
  window.__battle = { THREE, paint, stage, world, get director() { return director; }, get fightId() { return fightId; }, fight, ENCOUNTERS };
}

function pickFromHash() {
  const id = location.hash.slice(1).toUpperCase();
  return ENCOUNTERS[id] && id !== 'B6B' ? id : null;
}

// Silas, the ghost lamplighter, steps out of the bow-lamp's flame in Lights Out. He has no model yet: he shows as
// that flame, a warm lamplight that brightens when he lights the lamps.
function createSilasFlame() {
  const root = new THREE.Group();
  root.name = 'silas';
  const flame = glowSprite('#ffc46e', 1.1, 0.95);
  const core = glowSprite('#fff4d6', 0.35, 1);
  flame.position.y = core.position.y = 1.2;
  const light = new THREE.PointLight('#ffb45e', 5, 8, 2);
  light.position.y = 1.2;
  root.add(flame, core, light);
  onLayer(root);
  let t = 0, pulse = 0;
  return {
    root, name: 'Silas', height: 1.5, radius: 0.3, center: 1.2,
    play(name, onHit) { pulse = 1; setTimeout(() => onHit?.(), 300); },
    get busy() { return false; },
    update(dt) {
      t += dt;
      pulse = Math.max(0, pulse - dt * 0.8);
      const f = 1 + Math.sin(t * 9) * 0.06 + pulse * 0.8;
      flame.scale.setScalar(1.1 * f);
      light.intensity = 5 * f;
      root.position.y = Math.sin(t * 1.6) * 0.08;
    },
  };
}

function addLights(group, scene, paint, { dark = false } = {}) {
  group.add(new THREE.HemisphereLight('#8b80d8', '#2b1b2e', dark ? 0.7 : 1.2));
  const moon = new THREE.DirectionalLight('#d4cdff', dark ? 0.9 : 1.6);
  moon.position.set(-8, 10, -6);
  group.add(moon, moon.target);
  for (const l of scene.lights) {
    if (dark && !/window|door/.test(l._what)) continue; // Lights Out: only her house stays lit
    const base = paint.toWorld(...l.base);
    const toCam = new THREE.Vector3(paint.camera.position.x - base.x, 0, paint.camera.position.z - base.z).normalize();
    const at = paint.toPlane(...l.pixel, new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, base));
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
    light.position.copy(at);
    group.add(light);
    const glow = glowSprite(l.color, l.glow ?? 1.1, 0.3, LAYER_GLOW);
    glow.material.depthTest = false;
    glow.position.copy(at);
    group.add(glow);
  }
  group.traverse((o) => o.layers.enableAll());
  for (const o of group.children) if (o.isSprite) o.layers.set(LAYER_GLOW);
}

boot().catch((e) => { console.error(e); });
