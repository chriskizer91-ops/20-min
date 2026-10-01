import { createBogmire } from './areas/bogmire.js';
import { nettiePortraits as NP } from './assets-bogmire.js';
import { bootTown } from './town.js';
import { createNettie } from './actors/nettie.js';
import { createInkblot } from './actors/inkblot.js';

// The Bogmire demo (bogmire.html): the fen town and its fen as their own page (docs/SLICE.md, screens 9 to 13). The
// screens and their casts are src/areas/bogmire.js, shared with the game. Here each fight is an encounter card, and
// after it she carries on; once she has met Nettie, Nettie and Inkblot follow her out onto the fen.

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// FF9 cuts to its battles with a swirl; this is a violet flash, then the card. It closes with "Carry on" or Escape.
async function showCard(id, F) {
  const fade = $('fade');
  fade.classList.add('on');
  await sleep(500);
  fade.classList.remove('on');
  $('enc-kicker').textContent = F.kicker;
  $('enc-name').textContent = F.name;
  $('enc-foes').replaceChildren(...F.foes.map(([name, what]) => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = name;
    const span = document.createElement('span');
    span.textContent = what;
    li.append(b, span);
    return li;
  }));
  $('enc-note').textContent = F.note;
  $('enc-link').href = `hollow-battle.html#${id}`;
  const card = $('encounter');
  card.dataset.fight = id;
  card.hidden = false;
  $('enc-go').focus({ preventScroll: true });
  return new Promise((resolve) => {
    const close = () => {
      if (card.hidden) return;
      card.hidden = true;
      $('enc-go').removeEventListener('click', close);
      removeEventListener('keydown', key);
      resolve('card');
    };
    const key = (e) => { if (e.code === 'Escape') close(); };
    $('enc-go').addEventListener('click', close);
    addEventListener('keydown', key);
  });
}

const area = createBogmire({
  game: false, state: (name, defaults) => defaults, flags: {},
  encounter: (id, { field, card }) => {
    field.audio.sfx('ui-open');
    return showCard(id, card).then((r) => { field.audio.sfx('back'); return r; });
  },
});

bootTown({ screens: area.screens, start: 'bogmire-moot-circle', images: area.images }).then((game) => {
  area.bindFenControls(game);
  // Nettie and Inkblot walk out onto the fen with her, once she's met Nettie
  const nettie = createNettie(), inkblot = createInkblot();
  const party = [
    { id: 'nettie', name: 'Nettie', actor: nettie, portrait: NP['nettie-calm'], voice: 5, lines: area.partyLines.nettie },
    { id: 'inkblot', name: 'Inkblot', actor: inkblot, portrait: 'inkblot', voice: 6, lift: 0.3, lines: area.partyLines.inkblot },
  ];
  const met = () => (game.field.visits.get('nettie') ?? 0) > 0;
  game.partyOn = (id) => area.FEN.includes(id);
  game.onScreen = () => { if (met() && !game.followers.length) game.setParty(party); };
  game.night = area.night;
  game.party = { get on() { return met() && area.FEN.includes(game.here.id); }, nettie, inkblot };
}).catch((err) => {
  console.error(err);
  const box = $('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
