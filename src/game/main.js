import * as THREE from 'three';
import { createSound } from '../audio/sound.js';
import { Town } from '../town.js';
import { createWickhollow } from '../areas/wickhollow.js';
import { createGloamwood } from '../areas/gloamwood.js';
import { createHollow } from '../areas/hollow.js';
import { createBogmire } from '../areas/bogmire.js';
import { nettiePortraits } from '../assets-bogmire.js';
import { portraits } from '../assets.js';
import { createInkblot } from '../actors/inkblot.js';
import { createNettie } from '../actors/nettie.js';
import { RARITY } from '../../vendor/aethermoor/src/data/rarity.js';
import { ENCOUNTERS } from '../battle/encounters.js';
import { HERB_IDS } from '../brew/recipes.js';
import { THINGS, nameOf, iconOf, kindOf, sortBag, basketUsed, basketSlots } from '../items.js';
import * as G from './state.js';

// Moonlight in the Aether, the whole night in one page (docs/SLICE.md): the title and the Opening, Wickhollow, the
// Gloamwood and the Hollow, the Magpie down the Sable, Bogmire and its fen, the Lantern Mother, and the Ending.
//
// Four screens take turns (game.html has a <template> of HUD for each; only the one on show is in the page):
//   title    the title screen and the cut-scenes (src/title/mode.js), on its own 2D canvas
//   field    the painted screens of all three places (src/town.js, src/areas/*), on the shared WebGL canvas
//   battle   the fights (src/battle/mode.js), on the same canvas
//   map      the Magpie over the valley (src/airship/mode.js), on the same canvas
// The brewing screen (src/brew/ui.js) and Quill's shop (src/swap/ui.js) open over the field.
//
// The night itself is one plain object (src/game/state.js), saved to localStorage whenever she changes screens, rests,
// brews, swaps or wins a fight. The areas ask the game for what they can't do themselves through a host
// (src/areas/common.js): fights, the cauldron, the shop, the skiff, cut-scenes, rests, and who's in the party.

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Where the Magpie sets her down: the old jetty on the Sable, and Bogmire's mast
const LANDING = {
  wickhollow: { screen: 'sable-riverbank', pixel: [690, 630], facing: 'down', walk: [660, 740] },
  bogmire: { screen: 'bogmire-moot-circle', pixel: [1440, 598], facing: 'left', walk: [1330, 610] },
};
// The pots she brews at
const POTS = { cottage: 'Her cottage, at the hearth', kettle: "Silas's wayside kettle", nettie: "Nettie's hut, at her cauldron" };
const PORTRAIT = { witch: portraits['witch-calm'], inkblot: portraits.inkblot, nettie: nettiePortraits['nettie-calm'] };

// ---------------------------------------------------------------- the screens and their HUDs
// Each screen's HUD comes out of its <template> once, and goes in and out of the page as the screen is shown
const huds = {};
function hud(name) {
  if (!huds[name]) {
    const box = document.createElement('div');
    box.className = `mode mode-${name}`;
    box.append($(`mode-${name}`).content.cloneNode(true));
    huds[name] = box;
  }
  return huds[name];
}
let showing = null;
function show(name) {
  if (showing === name) return;
  if (showing) huds[showing]?.remove();
  showing = name;
  document.body.append(hud(name));
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim();
  document.body.classList.add(`mode-${name}`, 'ready');
}

const fade = {
  async out(slow = false) {
    $('fade').classList.toggle('slow', slow);
    $('fade').classList.add('on');
    await sleep(slow ? 1100 : 460);
  },
  async in(slow = false) {
    $('fade').classList.toggle('slow', slow);
    $('fade').classList.remove('on');
    await sleep(slow ? 1100 : 650);
  },
};
const busy = (on) => { $('busy').hidden = !on; };

// ---------------------------------------------------------------- the game
const game = {
  state: null, audio: null, renderer: null, town: null, title: null, battle: null, map: null, areas: null,
  current: null, // the screen drawing each frame: { frame(now) }
  party: {}, // the follower models: { inkblot, nettie }
};
window.__play = game;

async function boot() {
  const audio = (game.audio = createSound());
  addEventListener('pointerdown', () => audio.unlock());
  addEventListener('keydown', () => audio.unlock());
  game.renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: false, powerPreference: 'high-performance' });
  game.renderer.autoClear = false;

  // The one frame loop: whichever screen is up draws
  const loop = (now) => {
    try { game.current?.frame(now); } catch (err) { report(err); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // The title screen, and New game or Continue
  show('title');
  const { createTitleMode } = await import('../title/mode.js');
  game.title = await createTitleMode({ canvas: $('cut-stage'), audio, game: true });
  game.current = game.title;
  const saved = G.load();
  const choice = location.hash === '#continue' && saved ? 'continue' : location.hash === '#new' ? 'new' : await game.title.menu({ canContinue: !!saved });
  history.replaceState(null, '', location.pathname + location.search);
  if (choice === 'continue' && saved) {
    game.state = saved;
  } else {
    G.clearSave();
    game.state = G.newGame();
    await game.title.play('opening');
    game.state.seen.push('opening');
  }
  game.title.active = false;
  await startField();
}

// ---------------------------------------------------------------- the field: every painted screen of the night
async function startField() {
  const state = game.state;
  show('field');
  busy(true);
  const host = makeHost();
  const areas = [createWickhollow(host), createGloamwood(host), createHollow(host), createBogmire(host)];
  game.areas = areas;
  const screens = Object.assign({}, ...areas.map((a) => a.screens));
  const images = Object.assign({}, ...areas.map((a) => a.images));
  const town = (game.town = new Town({ screens, images, footsteps: 'step-stone', renderer: game.renderer, canvas: $('stage') }));
  const where = state.where;
  await town.start(where.screen, where.pixel ? { pixel: where.pixel, heading: where.heading } : null);
  const field = town.field;
  // Her things are the night's
  field.bag = state.bag;
  field.picked = new Set(state.picked);
  field.visits = new Map(Object.entries(state.visits));
  field.seenHerbs = new Set(state.seenHerbs);
  field.basketLabel = () => `${basketUsed(state.bag)} of ${basketSlots(state.bag)} slots`;
  field.onBag = () => save();
  if (Object.keys(state.bag).length) field.showBasket();
  areas.find((a) => a.bindFenControls)?.bindFenControls(town);
  town.onScreen = () => save();
  setParty();
  bindMenu();
  busy(false);
  game.current = town;
  town.last = null;
  await nextFrame();
  field.showPlace();
  save();
}

function save() {
  const { state, town } = game;
  if (!state) return;
  if (town?.here && !town.going) state.where = town.where();
  if (town?.field) {
    state.picked = [...town.field.picked];
    state.visits = Object.fromEntries(town.field.visits);
    state.seenHerbs = [...town.field.seenHerbs];
  }
  G.save(state);
}

// The bag is one object everyone shares (the field's, the state's): change it in place
function setBag(bag) {
  const b = game.state.bag;
  for (const k of Object.keys(b)) delete b[k];
  Object.assign(b, bag);
}

// ---------------------------------------------------------------- what the areas ask of the game
function makeHost() {
  const state = game.state;
  return {
    game: true,
    state(name, defaults) {
      // a fresh copy of the defaults, with anything new since the save was made
      state.areas[name] = { ...structuredClone(defaults), ...(state.areas[name] ?? {}) };
      return state.areas[name];
    },
    flags: state.flags,
    joined: (id) => state.party.includes(id),
    join: (id, field, opts) => join(id, field, opts),
    encounter: (id, opts) => encounter(id, opts),
    brew: (field, where) => brew(field, where),
    shop: (field) => shop(field),
    fly: (field, from) => fly(from),
    cutscene: (id) => cutscene(id),
    rest: (field, spot) => rest(spot),
    storyFloor: (id) => G.storyFloor(state, id),
  };
}

// ---------------------------------------------------------------- the party
// Who walks with her: Inkblot from the square, Nettie from her hut. What they say when she turns to them.
const PARTY_LINES = {
  inkblot: () => ({
    first: ['Kraa. [Inkblot hops along at your heels, one eye on every light.]'],
    again: ['Kraa! [He fluffs up, very pleased with himself, for no reason he will share.]'],
  }),
  nettie: () => ({
    first: [{ say: 'Moonlight. Very pretty. Down here we use a lamp and a stick.', face: nettiePortraits['nettie-sly'] }],
    again: [{ say: "Well? Walk on. She won't sit herself down.", face: nettiePortraits['nettie-calm'] }],
  }),
};
function setParty(opts = {}) {
  const { state, town } = game;
  const fen = game.areas.find((a) => a.partyLines);
  const onFen = () => fen?.FEN.includes(town.here.id);
  const members = [];
  if (state.party.includes('nettie')) {
    game.party.nettie ??= opts.nettie ?? createNettie();
    members.push({ id: 'nettie', name: 'Nettie', actor: game.party.nettie, portrait: nettiePortraits['nettie-calm'], voice: 5, lines: () => (onFen() ? fen.partyLines.nettie() : PARTY_LINES.nettie()) });
  }
  if (state.party.includes('inkblot')) {
    game.party.inkblot ??= createInkblot();
    members.push({ id: 'inkblot', name: 'Inkblot', actor: game.party.inkblot, portrait: 'inkblot', voice: 6, lift: 0.3, lines: () => (onFen() ? fen.partyLines.inkblot() : PARTY_LINES.inkblot()) });
  }
  town.setParty(members);
}

function join(id, field, { from = null, actor = null } = {}) {
  const { state, town } = game;
  G.join(state, id);
  if (id === 'nettie' && actor) {
    // the Nettie by the hearth is the one who walks out with her
    game.party.nettie = actor;
    field.villagers = field.villagers.filter((v) => v !== actor);
    field.walk.obstacles = field.walk.obstacles.filter((o) => o !== actor.obstacle);
  }
  setParty();
  if (id === 'inkblot' && from) {
    const crow = game.party.inkblot;
    crow.root.position.copy(from);
    crow.root.position.y = town.here.walk.heightAt(from.x, from.z, 0);
  }
  field.toast(`${G.HERO_NAMES[id]} joins the party.`, 'quest');
  save();
}

// ---------------------------------------------------------------- resting
function rest(spot) {
  const { state, town } = game;
  G.restParty(state);
  state.rest = { ...town.where(), name: spot?.name ?? 'a rest' };
  save();
}

// ---------------------------------------------------------------- the cauldron
function brew(field, where) {
  const { state, town, audio } = game;
  return new Promise((resolve) => {
    import('../brew/ui.js').then(({ openCauldron }) => {
      town.pause();
      const basket = Object.fromEntries(HERB_IDS.filter((h) => state.bag[h] > 0).map((h) => [h, state.bag[h]]));
      const bag = Object.fromEntries(Object.entries(state.bag).filter(([id]) => kindOf(id) === 'brew' || kindOf(id) === 'dud'));
      const back = (now) => {
        const next = { ...state.bag };
        for (const h of HERB_IDS) delete next[h];
        for (const [id] of Object.entries(next)) if (kindOf(id) === 'brew' || kindOf(id) === 'dud') delete next[id];
        Object.assign(next, Object.fromEntries(Object.entries(now.basket).filter(([, n]) => n > 0)));
        Object.assign(next, Object.fromEntries(Object.entries(now.bag).filter(([, n]) => n > 0)));
        if (now.moonwater > 0) next.moonwater = now.moonwater;
        else delete next.moonwater;
        setBag(next);
        state.grimoire = now.grimoire;
        field.showBasket();
        save();
      };
      game.cauldron = openCauldron({
        basket, bag, moonwater: state.bag.moonwater ?? 0, grimoire: state.grimoire ?? undefined,
        view: 'small', audio, music: null, place: POTS[where] ?? 'At the cauldron',
        onBrew: (result, now) => back(now),
        onClose: (now) => {
          back(now);
          game.cauldron = null;
          town.resume();
          resolve();
        },
      });
    });
  });
}

// ---------------------------------------------------------------- Quill's swap shop
function shop(field) {
  const { state, town, audio } = game;
  return new Promise((resolve) => {
    import('../swap/ui.js').then(({ openSwapShop }) => {
      town.pause();
      const quill = field.things.find((t) => t.id === 'quill')?.actor;
      audio.music('town'); // Thareia's "Market Day"
      game.shop = openSwapShop({
        inventory: { bag: { ...state.bag }, swaps: { ...state.swaps }, skiff: !!state.flags.skiff },
        sfx: (name, opts) => audio.sfx(name, opts),
        react: (event) => {
          if (event === 'skiff') { quill?.setWarm?.(true); quill?.play?.('flex'); }
          else if (event === 'swap') quill?.play?.('swap');
        },
        onSwap: (result, inv) => {
          setBag(inv.bag);
          state.swaps = { ...inv.swaps };
          state.flags.skiff = !!inv.skiff;
          field.showBasket();
          save();
        },
        onClose: (inv) => {
          game.shop = null;
          setBag(inv.bag);
          state.swaps = { ...inv.swaps };
          state.flags.skiff = !!inv.skiff;
          field.showBasket();
          town.resume();
          if (state.flags.skiff && !state.flags.b3) field.toast("The Magpie is hers to fly, once she knows where the lights go: the Hollow, Silas said.", 'quest');
          else if (state.flags.skiff) field.toast('The Magpie is hers. Tap the skiff at the jetty to go aboard.', 'quest');
          save();
          resolve();
        },
      });
    });
  });
}

// ---------------------------------------------------------------- cut-scenes
async function cutscene(id) {
  const { town, title } = game;
  town.pause();
  await fade.out(true);
  show('title');
  title.active = true;
  game.current = title;
  $('fade').classList.remove('on');
  await title.play(id);
  title.active = false;
  game.state.seen.push(id);
  $('fade').classList.add('on');
  await sleep(300);
  show('field');
  game.current = town;
  town.resume();
  await fade.in();
  save();
}

// ---------------------------------------------------------------- the Magpie
async function fly(from) {
  const { state, town, audio } = game;
  town.pause();
  // The first time: the Skiff Wakes, at the jetty
  if (!state.flags.skiffAwake && from === 'wickhollow') {
    await fade.out(true);
    show('title');
    game.title.active = true;
    game.current = game.title;
    $('fade').classList.remove('on');
    await game.title.play('skiff');
    game.title.active = false;
    state.flags.skiffAwake = true;
    state.seen.push('skiff');
    $('fade').classList.add('on');
    await sleep(300);
  } else {
    audio.sfx('deck-steps');
    await fade.out();
  }
  show('map');
  game.current = null; // nothing draws while the map gets ready
  if (!game.map) {
    busy(true);
    const { createMapMode } = await import('../airship/mode.js');
    game.map = await createMapMode({ canvas: $('stage'), renderer: game.renderer, audio });
    busy(false);
  }
  const map = game.map;
  map.active = true;
  game.current = map;
  const landed = map.fly({ from, nettie: state.party.includes('nettie'), lightsHome: !!state.flags.lightsHome });
  await fade.in();
  const { to } = await landed;
  map.active = false;
  await fade.out();
  show('field');
  game.current = town;
  town.resume();
  const at = LANDING[to];
  await town.go(at.screen, at, { fade: false });
  town.field.audio.music(town.here.cast.music);
  await fade.in();
  save();
}

// ---------------------------------------------------------------- fights
// The field spins away into a flash (FF9's swirl), the fight is fought, and the field comes back: after a win, just
// as it was; after a loss, at her last rest, with everything she had (docs/LORE.md §3: "Nothing is lost").
async function encounter(id, { field, firstStrike = false } = {}) {
  const { state, town, audio } = game;
  town.pause();
  const snap = G.snapshot(state);
  audio.sfx(ENCOUNTERS[id]?.flags.boss ? 'boss' : 'foe-charge');
  await swirl();
  show('battle');
  game.current = null; // nothing draws under the swirl while the fight gets ready
  if (!game.battle) {
    busy(true);
    const { createBattleMode } = await import('../battle/mode.js');
    game.battle = await createBattleMode({ canvas: $('stage'), renderer: game.renderer, audio, first: id });
    busy(false);
  }
  const battle = game.battle;
  battle.active = true;
  game.current = battle;
  let started;
  const onScreen = new Promise((r) => { started = r; });
  const bagIn = G.battleBag(state);
  const fighting = battle.fight(id, { party: G.partyFor(state), bag: bagIn, firstStrike, seed: Math.floor(Math.random() * 1e6), onStart: () => started() });
  await onScreen;
  await nextFrame();
  $('swirl').hidden = true;
  $('swirl').classList.remove('go');
  const r = await fighting;
  const report = G.afterBattle(state, r.out, { herbs: r.herbs, heroIds: r.heroIds, fight: id, bagIn });
  if (report.won) {
    if (id === 'B3') state.flags.b3 = true;
    if (id === 'B6') state.flags.b6 = true;
  }
  await showResult(id, report, r);
  battle.active = false;
  if (report.won && id === 'B6') {
    ending();
    return 'won';
  }
  await fade.out();
  show('field');
  game.current = town;
  if (!report.won) {
    G.afterDefeat(state, snap);
    town.resume();
    const R = state.rest;
    await town.go(R.screen, { pixel: R.pixel, heading: R.heading ?? 0 }, { fade: false });
    town.field.audio.music(town.here.cast.music);
    await fade.in();
    town.field.toast(`She wakes at ${R.name ?? 'her last rest'}, mended, with everything she had. The fight waits.`, 'ui-save');
    save();
    return 'lost';
  }
  town.resume();
  town.field.audio.music(town.here.cast.music);
  town.field.showBasket();
  await fade.in();
  save();
  return 'won';
}

// FF9's swirl: the frame on screen, spun and blurred away into a violet-white flash
async function swirl() {
  const { town, renderer } = game;
  const box = $('swirl'), c = $('swirl-canvas');
  c.width = innerWidth;
  c.height = innerHeight;
  town.frame(performance.now()); // draw one more frame, and catch it before it's gone
  c.getContext('2d').drawImage(renderer.domElement, 0, 0, c.width, c.height);
  box.hidden = false;
  box.classList.remove('go');
  void box.offsetWidth;
  box.classList.add('go');
  await sleep(1000);
}

// After a fight: what it was worth, and one button back to the night
function showResult(id, report, r) {
  const { audio } = game;
  return new Promise((resolve) => {
    const box = $('result');
    box.hidden = false;
    $('result-title').textContent = report.won ? 'Victory' : 'The party is sent home';
    const text = $('result-text');
    text.replaceChildren();
    if (report.won) {
      const lines = [`${report.xp} XP each.`];
      for (const l of report.levels) lines.push(`${G.HERO_NAMES[l.id]} is level ${l.level}!`);
      if (r.id === 'B6b') lines.push('The veil falls. "Are they safe?"');
      text.textContent = lines.join(' ');
      if (report.levels.length) setTimeout(() => audio.sfx('levelup'), 900);
    } else {
      text.textContent = 'Nothing is lost. She wakes by her last rest with everything she had, and the fight waits.';
    }
    const items = report.got.map((id2) => ({ name: nameOf(id2), rarity: kindOf(id2) === 'herb' ? 'herb' : THINGS_RARITY(id2), icon: iconOf(id2) }));
    for (const g of report.gear) items.push({ name: g.name, rarity: g.rarity });
    $('result-loot').replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      const rr = item.rarity === 'herb' ? { name: 'Gathered', color: '#9dffb0' } : RARITY[item.rarity] ?? { name: '', color: '#ecdcb8' };
      li.style.setProperty('--rarity', rr.color);
      li.innerHTML = '<b></b><span></span>';
      li.querySelector('b').textContent = item.name;
      li.querySelector('span').textContent = rr.name;
      return li;
    }));
    const go = $('result-go');
    go.textContent = report.won ? (r.id === 'B6b' ? 'Sit her down' : 'Carry on') : 'Wake up';
    setTimeout(() => go.focus({ preventScroll: true }), 400);
    const done = () => {
      go.removeEventListener('click', done);
      removeEventListener('keydown', key);
      box.hidden = true;
      audio.sfx('ui-confirm');
      resolve();
    };
    const key = (e) => { if (['Enter', 'Space', 'NumpadEnter', 'Escape'].includes(e.code)) { e.preventDefault(); done(); } };
    go.addEventListener('click', done);
    setTimeout(() => addEventListener('keydown', key), 600);
  });
}
const THINGS_RARITY = (id) => ({ relic: 'heirloom', charm: 'heirloom', found: 'worn' }[kindOf(id)] ?? 'wrought');

// ---------------------------------------------------------------- the end of the night
async function ending() {
  const { state, title } = game;
  state.flags.lightsHome = true;
  state.flags.ending = true;
  save();
  await fade.out(true);
  show('title');
  title.active = true;
  game.current = title;
  $('fade').classList.remove('on');
  await title.play('ending');
  state.seen.push('ending');
  save();
  // The title again: Continue walks her back into the night, with the lights gone home
  const choice = await title.menu({ canContinue: true });
  location.hash = choice === 'continue' ? '#continue' : '#new';
  location.reload();
}

// ---------------------------------------------------------------- the menu: the party, and what she keeps
function bindMenu() {
  const { state, town, audio } = game;
  const menu = $('game-menu');
  const open = () => {
    if (town.field.talking || town.field.locked || !town.active) return;
    town.pause();
    renderMenu();
    menu.hidden = false;
    audio.sfx('ui-open');
    $('game-menu-close').focus({ preventScroll: true });
  };
  const close = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    audio.sfx('ui-close');
    town.resume();
  };
  $('btn-menu').addEventListener('click', () => (menu.hidden ? open() : close()));
  $('game-menu-close').addEventListener('click', close);
  $('game-menu-quit').addEventListener('click', () => {
    save();
    location.hash = '';
    location.reload();
  });
  addEventListener('keydown', (e) => {
    if (showing !== 'field' || e.target.closest?.('input, textarea')) return;
    if (e.code === 'KeyM' && !e.repeat) { e.preventDefault(); menu.hidden ? open() : close(); }
    else if (e.code === 'Escape' && !menu.hidden) { e.preventDefault(); close(); }
  });
  function renderMenu() {
    $('menu-party').replaceChildren(...state.party.map((id) => {
      const s = G.heroStatus(state, id);
      const row = document.createElement('div');
      row.className = 'member';
      const bar = (label, v, max, cls) => `<div class="bar ${cls}"><span>${label}</span><i><u style="width:${Math.round((v / max) * 100)}%"></u></i><em>${v}/${max}</em></div>`;
      row.innerHTML = `<img alt=""><div><b></b><small>level ${s.level}</small>${bar('HP', s.hp, s.maxHp, 'hp')}${bar('MP', s.mp, s.maxMp, 'mp')}</div>`;
      row.querySelector('img').src = PORTRAIT[id];
      row.querySelector('b').textContent = s.name;
      return row;
    }));
    const kept = sortBag(state.bag).filter(([id]) => ['charm', 'relic', 'found', 'keep', 'gear', 'curio'].includes(kindOf(id)));
    $('menu-kept').replaceChildren(...kept.map(([id, n]) => {
      const li = document.createElement('li');
      li.innerHTML = '<img alt=""><span><b></b><small></small></span>';
      li.querySelector('img').src = iconOf(id);
      li.querySelector('b').textContent = n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id);
      li.querySelector('small').textContent = THINGS[id]?.does ?? '';
      return li;
    }));
    const mins = Math.round(state.playtime / 60);
    $('menu-note').textContent = `${state.rest?.name ? `Last rest: ${state.rest.name}. ` : ''}${mins ? `${mins} minute${mins === 1 ? '' : 's'} into the night.` : ''}`;
  }
}

// The time she's spent in the night, counted while the page is open
setInterval(() => { if (game.state && !document.hidden) game.state.playtime += 1; }, 1000);

function report(err) {
  console.error(err);
  const box = $('error');
  if (box && box.hidden) { box.hidden = false; box.textContent = `Something went wrong: ${err.message}`; }
}

boot().catch(report);
