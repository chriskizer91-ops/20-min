import { openCauldron } from './ui.js';
import { hearthImages, herbIcons, brewArt, itemArt } from './assets.js';
import { HERBS, HERB_IDS, ALL, byId } from './recipes.js';
import { newGrimoire, seeHerbs } from './rules.js';
import { fonts } from '../assets.js';
import { createSound } from '../audio/sound.js';

// The brewing demo (brewing.html): her cottage hearth, "Pick Your Poison" (docs/SLICE.md §5). She starts with a
// basketful, enough to make every one of LORE's six brews once and a dud or two, and the night's eight moonwater
// (SLICE §4: 2 carried, 3 from Wickhollow, 3 from Nettie's). The page shows her basket, her moonwater, what she has
// brewed and her grimoire, around the reusable cauldron screen (openCauldron in ui.js) in its 'hearth' view.

for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});

// Every recipe once: witch's bells; ember-star lily + glowcap; moonpetal + bogwick; lavender + silver mugwort;
// lavender + wisp-sprout; chapel moss + silver mugwort. Then two more witch's bells (Hiccup Tonic), two mandrakes
// (Droopy Hat Draught) and a nightrose (Swamp Tea, or Rosalind's gift): three duds on offer, moonwater for two.
export const START = {
  basket: { lavender: 2, moonpetal: 1, witchs_bells: 3, nightrose: 1, chapel_moss: 1, silver_mugwort: 2, ember_star_lily: 1, wisp_sprout: 1, bogwick: 1, glowcap: 1, mandrake: 2 },
  moonwater: 8,
};
const fresh = () => ({ basket: { ...START.basket }, moonwater: START.moonwater, bag: {}, grimoire: seeHerbs(newGrimoire(), START.basket) });

const $ = (id) => document.getElementById(id);
const audio = createSound();
let state = fresh();
let cauldron = null;
let lastBrewed = null;

function open() {
  $('reopen').hidden = true;
  $('away').hidden = true;
  cauldron = openCauldron({
    ...state,
    view: 'hearth',
    painting: hearthImages['art/brews/cottage-hearth.webp'],
    place: 'Her cottage, at the hearth',
    audio,
    music: 'wickhollow',
    onBrew(result, now) {
      state = now;
      lastBrewed = result.id;
      renderBasket();
    },
    onClose(now) {
      cauldron = null;
      if (restarting) return;
      state = now;
      renderBasket();
      $('away').hidden = false;
      $('reopen').hidden = false;
      $('reopen').focus();
    },
  });
  return cauldron.ready;
}

function renderBasket() {
  const herbs = HERB_IDS.filter((h) => (state.basket[h] ?? 0) > 0);
  const total = herbs.reduce((n, h) => n + state.basket[h], 0);
  $('basket-count').textContent = `${total} herbs`;
  const row = (icon, name, n, cls = '') => `<li class="${cls}"><img src="${icon}" alt=""><span>${name}</span>×${n}</li>`;
  $('basket-herbs').innerHTML = [
    row(itemArt.moonwater, 'Moonwater', state.moonwater, 'water'),
    ...herbs.map((h) => row(herbIcons[h], HERBS[h].name, state.basket[h])),
  ].join('') + (herbs.length ? '' : '<li class="none">No herbs left.</li>');
  const brewed = ALL.filter((b) => (state.bag[b.id] ?? 0) > 0);
  $('brewed-count').textContent = brewed.length ? `${brewed.reduce((n, b) => n + state.bag[b.id], 0)} bottles` : '';
  $('basket-brews').innerHTML = brewed.map((b) => row(brewArt[b.id], b.name + (b.kind === 'dud' ? ' (dud)' : ''), state.bag[b.id], b.id === lastBrewed ? 'fresh' : '')).join('')
    || '<li class="none">Nothing yet.</li>';
}

// ---------------------------------------------------------------- the buttons
$('btn-grimoire').addEventListener('click', async () => {
  audio.unlock();
  if (!cauldron) await open();
  cauldron.openGrimoire();
});
$('btn-sound').addEventListener('click', () => {
  audio.unlock();
  const on = !audio.enabled;
  audio.setEnabled(on);
  audio.setMusicEnabled(on);
  $('btn-sound').setAttribute('aria-pressed', String(on));
  $('btn-sound').textContent = on ? 'Sound on' : 'Sound off';
});
let restarting = false;
$('btn-again').addEventListener('click', () => {
  audio.unlock();
  restarting = true;
  cauldron?.close();
  restarting = false;
  state = fresh();
  lastBrewed = null;
  renderBasket();
  open();
});
$('btn-basket').addEventListener('click', () => {
  const on = !document.body.classList.contains('show-basket');
  document.body.classList.toggle('show-basket', on);
  $('btn-basket').setAttribute('aria-pressed', String(on));
});
$('reopen').addEventListener('click', () => { audio.unlock(); open(); });
addEventListener('pointerdown', () => audio.unlock(), { once: true });
addEventListener('keydown', () => audio.unlock(), { once: true });

renderBasket();
open().then(() => requestAnimationFrame(() => document.body.classList.add('ready'))).catch((err) => {
  console.error(err);
  const box = $('error');
  box.hidden = false;
  box.textContent = `The cauldron couldn't start: ${err.message}`;
});

// A handle for tests and for poking at things from the console
window.__brew = {
  START, openCauldron, byId,
  get cauldron() { return cauldron; },
  get state() { return state; },
  open,
};
