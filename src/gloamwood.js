import { createGloamwood } from './areas/gloamwood.js';
import { bootTown } from './town.js';

// The Gloamwood demo (gloamwood.html): the lantern path and the Sable bridge as their own page (docs/SLICE.md screens
// 5 and 6). The screens and their casts are src/areas/gloamwood.js, shared with the game. Here the fights are
// encounter cards (the fights themselves are in the battle demo), and she starts with one Lantern Oil in her basket,
// brewed at home, so the relight can be played.

const $ = (id) => document.getElementById(id);

// The card that stands in for a fight: who's in the way, and a link to the fight in the battle demo
function showEncounter(id, { tag, title, text, foes, note }) {
  return new Promise((resolve) => {
    const card = $('encounter');
    $('enc-tag').textContent = tag;
    $('enc-title').textContent = title;
    $('enc-text').textContent = text;
    $('enc-foes').replaceChildren(...foes.map((f) => Object.assign(document.createElement('li'), { textContent: f })));
    $('enc-note').textContent = note;
    $('enc-battle').href = `hollow-battle.html#${id}`;
    card.hidden = false;
    const go = $('enc-go');
    setTimeout(() => go.focus({ preventScroll: true }), 50);
    const close = () => {
      card.hidden = true;
      go.removeEventListener('click', close);
      removeEventListener('keydown', key, true);
      resolve('card');
    };
    const key = (e) => {
      if (!['Space', 'Enter', 'KeyE', 'NumpadEnter', 'Escape'].includes(e.code) || e.target.closest?.('a, button')) return;
      e.preventDefault();
      e.stopPropagation(); // not on to the field, which would take it as "talk"
      close();
    };
    go.addEventListener('click', close);
    addEventListener('keydown', key, true);
  });
}

const area = createGloamwood({
  game: false, state: (name, defaults) => defaults, flags: {},
  encounter: (id, { card }) => showEncounter(id, card),
});

bootTown({ screens: area.screens, start: 'lantern-path', images: area.images, footsteps: 'step-stone' }).then((game) => {
  // She comes with one Lantern Oil in her basket, brewed at home, so the relight can be played
  game.field.give('lantern-oil', 1);
  game.field.showPlace(); // (again, now the page is up: building it can take a while on a slow device)
  game.night = area.night;
}).catch((err) => {
  console.error(err);
  const box = $('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
