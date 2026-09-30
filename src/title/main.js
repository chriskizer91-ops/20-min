// The title screen and the cut-scene player: the game's front door, under the logo "Witch Way".
//
// The title is art batch 2's painting of the skiff over the valley, alive with twinkling stars, drifting clouds and
// flames, and motes off the crystals (./sky.js), with the logo in the empty sky. "Tap to begin" comes first,
// because a browser only lets a page make sound after a tap; then the menu: New game plays the Opening, Story
// lists the four cut-scenes (./scenes.js), and Sound switches sound and music on and off.
//
// Everything is drawn on one canvas (./screen.js) that dissolves from shot to shot; the logo, menu, captions and
// dialogue box are HTML over it (title.html).
import { FONTS, STILLS, FX } from './art.js';
import { SCENES, sceneById } from './scenes.js';
import { createScreen } from './screen.js';
import { createTitleShot } from './sky.js';
import { createPlayer } from './player.js';
import { createSound } from '../audio/sound.js';

const $ = (id) => document.getElementById(id);
const clock = () => performance.now() / 1000;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Music by the scenes' names. 'title' is Thareia's main theme; sound.js sends a plain 'title' to the synth's
// older title track, so it's asked for by its full name.
const TRACKS = { title: 'thareia:title' };

function decoded(src) {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img, () => img);
}

// The stills, made into images as a scene reaches them and decoded a beat ahead, so a dissolve never waits on one
function createImages() {
  const cache = new Map();
  const get = (key) => {
    if (!cache.has(key)) { const img = new Image(); img.src = STILLS[key].src; cache.set(key, img); }
    return cache.get(key);
  };
  return { get, warm(keys) { for (const k of keys) if (STILLS[k]) get(k).decode?.().catch(() => {}); } };
}

async function boot() {
  const fonts = Object.entries(FONTS).map(([family, url]) => new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {}));
  const [painting, clouds, lights] = await Promise.all([decoded(STILLS.title.src), decoded(FX.clouds), decoded(FX.lights)]);
  await Promise.race([Promise.all(fonts), new Promise((r) => setTimeout(r, 3000))]);

  const audio = createSound();
  let playing = null;
  const music = (name) => {
    const id = TRACKS[name] ?? name;
    if (id === playing) return; // asking again would start the piece over
    playing = id;
    audio.music(id);
  };

  const screen = createScreen($('stage'));
  const titleShot = createTitleShot({ painting, clouds, lights, reduced });
  screen.push(titleShot, 1.2, clock());
  const images = createImages();

  // ---------------------------------------------------------------- the title screen
  // mode: 'press' (tap to begin), 'menu', or 'scene'
  let mode = 'press', list = 'main', sel = 0, readyAt = 0, fromStory = null;
  const MAIN = [
    { id: 'new', label: 'New game' },
    { id: 'story', label: 'Story' },
    { id: 'sound', label: () => (audio.enabled ? 'Sound on' : 'Sound off') },
  ];
  const STORY = [...SCENES.map((s) => ({ id: s.id, label: s.name, note: s.note, scene: true })), { id: 'back', label: 'Back' }];
  const items = () => (list === 'main' ? MAIN : STORY);
  const labelOf = (item) => (typeof item.label === 'function' ? item.label() : item.label);

  function showLogo(on, again = false) {
    const logo = $('logo');
    if (again) { logo.classList.remove('show'); void logo.offsetWidth; }
    logo.classList.toggle('show', on);
  }

  function renderMenu() {
    $('menu-title').hidden = list !== 'story';
    $('menu-list').replaceChildren(...items().map((item, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === sel ? 'on' : '';
      b.dataset.id = item.id;
      const label = document.createElement('span');
      label.textContent = labelOf(item);
      b.append(label);
      if (item.note) { const note = document.createElement('small'); note.textContent = item.note; b.append(note); }
      if (item.id === 'sound') b.setAttribute('aria-pressed', String(audio.enabled));
      b.addEventListener('click', () => { if (clock() >= readyAt) activate(i); });
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && sel !== i) select(i); });
      b.addEventListener('focus', () => { if (sel !== i) select(i, false); });
      li.append(b);
      return li;
    }));
  }

  function select(i, sound = true) {
    const n = items().length;
    sel = (i + n) % n;
    if (sound) audio.sfx('ui-cursor');
    $('menu-list').querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === sel));
  }

  function openList(name, at = 0) {
    list = name;
    sel = at;
    renderMenu();
  }

  function showMenu() {
    mode = 'menu';
    $('press').hidden = true;
    $('cut').hidden = true;
    $('menu').hidden = false;
    showLogo(true);
    renderMenu();
    readyAt = clock() + 0.45; // the tap that got us here mustn't land on a menu item
  }

  // The first tap: sound can start now
  function begin() {
    if (mode !== 'press') return;
    audio.unlock();
    music('title');
    audio.sfx('ui-confirm');
    showMenu();
  }

  function activate(i) {
    const item = items()[i];
    if (!item) return;
    audio.unlock();
    if (item.id === 'new') return play('opening', false);
    if (item.id === 'story') { audio.sfx('ui-open'); return openList('story'); }
    if (item.id === 'back') { audio.sfx('ui-back'); return openList('main', 1); }
    if (item.id === 'sound') {
      const on = !audio.enabled;
      audio.setEnabled(on);
      audio.setMusicEnabled(on);
      if (on) audio.sfx('ui-confirm');
      return renderMenu();
    }
    if (item.scene) play(item.id, true);
  }

  // ---------------------------------------------------------------- the cut-scenes
  const player = createPlayer({
    screen, images, titleShot, audio, music, reduced,
    // The Opening ends on the title card: the title painting with the logo, and no menu yet
    onCard: () => showLogo(true, true),
    onEnd: (scene) => {
      showMenu();
      if (fromStory) openList('story', SCENES.indexOf(scene));
      else openList('main', 0);
      readyAt = clock() + 0.6;
    },
  });

  function play(id, story) {
    const scene = sceneById(id);
    audio.sfx('ui-confirm');
    fromStory = story;
    mode = 'scene';
    $('menu').hidden = true;
    $('cut').hidden = false;
    showLogo(false);
    // Scenes picked from the Story list say which they are, top left, the way FF9 names a place
    const name = $('scene-name');
    name.textContent = scene.name;
    name.hidden = !story;
    name.classList.remove('fade');
    void name.offsetWidth;
    name.classList.add('fade');
    player.start(scene, clock());
  }

  function leave() {
    if (mode !== 'scene') return;
    audio.sfx('ui-back');
    player.skip(clock());
  }

  $('btn-skip').addEventListener('click', (e) => { e.currentTarget.blur(); player.skip(clock()); });
  $('btn-auto').addEventListener('click', (e) => {
    e.currentTarget.blur();
    player.auto = !player.auto;
    $('btn-auto').setAttribute('aria-pressed', String(player.auto));
  });
  // A tap anywhere in a scene (except on its buttons) moves it on
  $('cut').addEventListener('click', (e) => { if (!e.target.closest('button')) player.advance(clock()); });
  addEventListener('pointerdown', (e) => { if (mode === 'press' && e.isPrimary) { e.preventDefault(); begin(); } });

  const UP = ['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'], DOWN = ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'];
  const GO = ['Enter', 'Space', 'NumpadEnter'];
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.code;
    // A focused button (reached with Tab) clicks itself on Enter or Space
    if (GO.includes(k) && e.target.closest?.('button')) return;
    if (mode === 'press') {
      if (['Tab', 'ShiftLeft', 'ShiftRight'].includes(k)) return;
      e.preventDefault();
      begin();
    } else if (mode === 'menu') {
      if (UP.includes(k)) select(sel - 1);
      else if (DOWN.includes(k)) select(sel + 1);
      else if (GO.includes(k)) { if (!e.repeat) activate(sel); }
      else if (k === 'Escape' || k === 'Backspace') { if (list === 'story') { audio.sfx('ui-back'); openList('main', 1); } }
      else return;
      e.preventDefault();
    } else if (mode === 'scene') {
      if (GO.includes(k)) { if (!e.repeat) player.advance(clock()); }
      else if (k === 'Escape') leave();
      else return;
      e.preventDefault();
    }
  });

  // ---------------------------------------------------------------- each frame
  let last = clock();
  function frame() {
    const now = clock();
    const dt = Math.min(0.1, now - last);
    last = now;
    player.update(dt, now);
    screen.draw(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.body.classList.add('ready');
  $('press').hidden = false;
  showLogo(true);

  // For tests and screenshots
  window.__title = {
    get state() {
      return {
        mode, list, selected: sel, items: mode === 'scene' ? [] : items().map(labelOf), auto: player.auto,
        logo: $('logo').classList.contains('show'), sound: audio.enabled, scene: player.state,
      };
    },
    scenes: SCENES.map((s) => s.id),
    begin,
    choose(label) { const i = items().findIndex((it) => labelOf(it) === label); if (i >= 0) activate(i); return i >= 0; },
    play: (id) => { if (mode === 'press') begin(); play(id, true); },
    advance: () => player.advance(clock()),
    skip: () => player.skip(clock()),
    escape: leave,
    set auto(on) { player.auto = on; $('btn-auto').setAttribute('aria-pressed', String(player.auto)); },
    get auto() { return player.auto; },
    // Jump to a beat of the playing scene, for screenshots
    to: (beat) => player.jump(beat, clock()),
  };
}

boot().catch((err) => {
  console.error(err);
  const box = $('error');
  box.hidden = false;
  box.textContent = `The title screen couldn't start: ${err.message}`;
});
