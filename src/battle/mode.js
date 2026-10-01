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
import { createSilas } from '../actors/silas.js';
import { glowSprite } from '../actors/kit.js';
import { ENCOUNTERS, startEncounter, nextForm } from './encounters.js';
import { Director } from './director.js';
import { Fx } from './fx.js';

// The battle screen: one of the night's fights (docs/SLICE.md §2, tuned in docs/BALANCE.md) on its own painted
// backdrop, with the 3D party on one side and the foes on the other, played out by the Director on Aethermoor's rules.
// The battle demo (src/battle/main.js) and the game both use it.
//
//   const battle = createBattleMode({ canvas, renderer, audio })
//   const { out, herbs, heroIds, id } = await battle.fight('B3', { party, bag, firstStrike, seed })
//   battle.frame(now)           draws a frame (the page calls it while the fight is on screen)
//   battle.active               false: its keys and taps are ignored (the game has another screen up)
//
// fight() resolves when the fight is over: won (out.result 'victory'), or lost ('defeat'). B6 turns into B6b, Lights
// Out, as her first form falls: one fight, from the caller's side. herbs: what Gather cut, over the whole fight.
// heroIds: the battle's unit ids -> hero ids. The page's markup is battle.html's (labels, ribbon, banner, caption,
// roll, cursor, menu, party, where).

// The backdrops all share one painter's camera (a low side view), so one Stage serves them all.
const SCENES = {
  gloamwood: { data: gloamwoodScene, art: gloamwoodArt },
  graveyard: { data: graveyardScene, art: graveyardArt },
  'open-fen': { data: openFenScene, art: openFenArt },
  boardwalk: { data: boardwalkScene, art: boardwalkArt },
  'mothers-hollow': { data: mothersHollowScene, art: mothersHollowArt },
};
// B2's twisted grove is in the Gloamwood too; B3 is the Hollow, Thareia's graveyard
export const BACKDROP = { B1: 'gloamwood', B2: 'gloamwood', B3: 'graveyard', B4: 'open-fen', B5: 'boardwalk', B6: 'mothers-hollow', B6b: 'mothers-hollow' };
const MUSIC = { B3: 'boss', B6: 'boss', B6b: 'boss' };

const HEROES = { witch: createWitch, inkblot: createInkblot, nettie: createNettie };
// Each foe model and how big to stand it (the models are life-size; the rabble stand a little larger, so they read)
const FOES = {
  'marsh-light': [(o) => createMarshLight('#8fe89a', o), 1.35], 'lamp-moth': [createLampMoth, 1.4], glowcap: [createGlowcap, 1.3],
  'hollowed-mandrake': [createMandrake, 1.45], boglurcher: [createBoglurcher, 1.1], 'mire-leech': [createMireLeech, 1.4],
  'willow-wight': [createWillowWight, 0.95], drowned: [createDrownedChorister, 1], gloamwing: [createGloamwing, 0.95],
  'lantern-mother': [createLanternMother, 0.95], silas: [createSilas, 1],
};
const HERO_SCALE = { inkblot: 1.7 };

const loader = new THREE.TextureLoader();
const load = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));

export async function createBattleMode({ canvas, renderer = null, audio, first = 'B1' }) {
  const $ = (id) => document.getElementById(id);
  const paint = new PaintCamera(graveyardScene.size, graveyardScene.camera);
  const world = new THREE.Scene();
  const firstScene = SCENES[BACKDROP[first] ?? 'gloamwood'];
  firstScene.texture = await load(firstScene.art);
  firstScene.cutouts = buildCutouts(firstScene.data, paint, firstScene.texture);
  const stage = new Stage(canvas, { paint, painting: firstScene.texture, world, cutouts: firstScene.cutouts, renderer });
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

  const fx = new Fx(world);
  let director = null, fightId = null;
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
    $('labels')?.replaceChildren();
    cast.heroes = {};
    cast.foes = {};
  }

  // Build the fight's models on its backdrop and hand the state to a director
  function stageFight(state, { keepHeroes = false, onEnd }) {
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
    director = new Director({ stage, actors, state, audio, fx, spawn, onEnd });
    return director;
  }

  // One form of a fight: resolves with the director's outcome. onStart: once it's on screen.
  async function form(id, state, { keepHeroes = false, onStart = null } = {}) {
    fightId = id;
    $('result') && ($('result').hidden = true);
    const e = ENCOUNTERS[id];
    if (!keepHeroes) clearStage();
    else {
      // Keep the party standing; the boss rises again for her second form
      for (const o of [...world.children]) if (o.userData.actor && !Object.values(cast.heroes).some((h) => h.root === o || h.fx === o)) world.remove(o);
      $('labels')?.replaceChildren();
    }
    await useScene(BACKDROP[id], { dark: id === 'B6b' });
    return new Promise((resolve) => {
      const d = stageFight(state, { keepHeroes, onEnd: (out) => resolve({ out, director: d }) });
      const where = $('where');
      if (where) where.textContent = `${id.replace('b', '')} · ${e.name}${e.flags.boss ? ' · boss' : ''}`;
      // The camera sweeps in, as FF9's does when a battle starts
      const lead = Object.values(cast.heroes)[0];
      stage.resize();
      stage.setZoom(1.45, true);
      stage.setFocus(paint.toPixel(lead.root.position.clone().setY(1)), true);
      stage.setZoom(1);
      setTimeout(() => stage.setFocus(new THREE.Vector2(724, 660)), 300);
      audio.music(MUSIC[id] ?? 'battle');
      d.run();
      onStart?.();
    });
  }

  // A whole fight, from the first form to the last
  let runs = 0;
  async function fight(id, opts = {}) {
    runs++;
    let state = opts.state ?? startEncounter(id, { seed: opts.seed ?? 7 + runs * 13, names: { witchfire: 'Witchfire' }, party: opts.party, bag: opts.bag, firstStrike: opts.firstStrike });
    const heroIds = Object.fromEntries(Object.values(state.units).filter((u) => u.side === 'hero').map((u) => [u.id, u.heroId ?? u.id]));
    let current = id, keepHeroes = false;
    const herbs = [];
    for (;;) {
      const { out, director: d } = await form(current, state, { keepHeroes, onStart: current === id ? opts.onStart : null });
      herbs.push(...(d.herbs ?? []));
      const win = out?.result === 'victory';
      // B6's first form won: the lamps go out, all but hers and the one at the skiff's bow, and Silas steps out of it
      const nextId = ENCOUNTERS[current]?.next;
      if (win && nextId) {
        const next = nextForm(d.state);
        if (next) {
          d.caption('The lamps go out, all but hers, and the one at the skiff\'s bow.');
          audio.sfx('nightfall');
          await new Promise((r) => setTimeout(r, 2400));
          const boss = Object.values(cast.foes)[0];
          boss?.play?.('rise');
          boss?.phase?.(3);
          state = next;
          current = nextId;
          keepHeroes = true;
          continue;
        }
      }
      // The end: everyone cheers, or the music stops
      if (win) {
        audio.sfx('victory');
        setTimeout(() => audio.music('victory'), 600);
        for (const h of Object.values(cast.heroes)) { h.play?.('cheer'); h.setMood?.('happy'); }
      } else audio.music(null);
      return { id: current, out, herbs, heroIds, state: d.state };
    }
  }

  const mode = {
    THREE, stage, paint, world, active: true,
    get director() { return director; },
    get fightId() { return fightId; },
    fight,
    resize: () => stage.resize(),
    // One frame: every model moves, the effects run, and the HUD follows the models
    frame(now) {
      const dt = THREE.MathUtils.clamp((now - (mode.last ?? now)) / 1000, 0, 0.05);
      mode.last = now;
      if (director) for (const a of new Set(Object.values(director.actors))) a.update(dt, 0, 0);
      fx.update(dt);
      stage.update(dt);
      stage.render();
      director?.afterRender();
    },
  };

  // Choosing a target with the keys, and tapping one
  addEventListener('keydown', (e) => {
    if (!mode.active || !director?.targeting) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') director.targetKey(-1);
    else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') director.targetKey(1);
    else if (e.code === 'Enter' || e.code === 'Space') director.targeting.pick(director.targeting.opts[director.targeting.i]);
    else if (e.code === 'Escape' || e.code === 'Backspace') director.targeting.cancel();
    else return;
    e.preventDefault();
  });
  canvas.addEventListener('pointerup', (e) => { if (mode.active) director?.tapAt(e.clientX, e.clientY); });
  addEventListener('resize', () => { if (mode.active) stage.resize(); });
  return mode;
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
