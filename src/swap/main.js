import * as THREE from 'three';
import stall from '../../scenes/quills-stall.json';
import { swapImages, quillPortraits } from '../assets-swap.js';
import { bootTown } from '../town.js';
import { createQuill } from '../actors/quill.js';
import { openSwapShop, iconOf } from './ui.js';
import { newInventory, holdings, basketUsed, basketSlots, THINGS, QUILL_LINES } from './swaps.js';

// The swap shop demo (swap-shop.html): Mister Quill's striped stall in Wickhollow square (docs/SLICE.md, the optional
// rooms), a one-screen town. The witch walks in; Quill fusses behind his counter and Inkblot, his crow, hops about
// the cobbles. Talk to Quill and the shop opens (src/swap/ui.js): his wares, what he wants for each, and what she
// has, which is a basket of herbs, a couple of brews and a dud, and a few found things, so several swaps can be
// tried. His own swap, for the skiff, is one line of the stall: a Warming Balm and the bow-lamp. Once he has it his
// hands are warm, and he flexes his fingers instead of blowing on them.

const $ = (id) => document.getElementById(id);
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// Her things, kept here between visits to the shop (swaps.js shape)
let inventory = newInventory();
let shop = null;
let swappedSkiffNow = false;

// ---------------------------------------------------------------- the stall
const STALL = {
  music: 'wickhollow', // the synth's music-box lullaby; the shop itself plays Thareia's 'Market Day'
  ambience: [
    { sfx: 'crickets', first: 3, gap: 7, spread: 6 },
    { sfx: 'owl', first: 24, gap: 30, spread: 30 },
    { sfx: 'clock', first: 11, gap: 22, spread: 16 }, // somewhere on the stall, one of his clocks
  ],
  herbTotal: 0,
  enter(field) {
    const { paint, scene } = field;
    const S = scene.spots;
    const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

    // Mister Quill, behind his counter, facing out over it
    const quill = createQuill();
    const home = at(S.quill);
    quill.rest = headingTo(home, at([745, 760]));
    field.addPerson(quill, home, quill.rest);
    field.quill = quill;

    // Inkblot pecks about the cobbles, and flies up to the birdcage, the counter, the chests, the scroll crate or the
    // spare top hat on the post if she crowds him
    const top = (base, topY) => at(base).setY(paint.heightAbove(base, topY));
    const crow = field.addCrow(at([610, 735]), {
      ground: [[610, 735], [840, 700], [990, 760], [470, 750], [1180, 730], [720, 830], [1060, 850], [390, 700]].map((p) => at(p)),
      high: [top([508, 618], 206), top([785, 634], 440), top([400, 655], 508), top([1165, 668], 588), top([1258, 668], 168)],
    });

    const portrait = () => (inventory.skiff ? quillPortraits.happy : quillPortraits.cold);
    const quillThing = {
      id: 'quill', name: 'Mister Quill', actor: quill, pos: quill.root.position, lift: 1.25, voice: 0,
      portrait: (line) => (line.mood === 'happy' || inventory.skiff ? quillPortraits.happy : portrait()),
      get lines() { return inventory.skiff ? LINES.quillWarm : LINES.quill; },
      onLine: () => { if (!quill.busy) quill.play('talk'); },
      onEnd: () => openShop(field),
    };
    field.things.push(
      quillThing,
      { id: 'inkblot', name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, lines: LINES.inkblot },
      { id: 'moon-cloth', name: null, pos: at([645, 652]), lift: 0.55, lines: LINES.cloth, sound: 'ui-page' },
      { id: 'tags', name: null, pos: at([985, 652]), lift: 0.6, lines: LINES.tags, sound: 'ui-page' },
      { id: 'birdcage', name: null, pos: at([510, 652]), lift: 1.5, lines: LINES.birdcage, sound: 'chime' },
      { id: 'top-hat', name: null, pos: at([1250, 674]), lift: 2.0, lines: LINES.hat, sound: 'ui-page' },
      { id: 'scrolls', name: null, pos: at([1205, 674]), lift: 0.9, lines: LINES.scrolls, sound: 'ui-page' },
      { id: 'spyglass', name: null, pos: at([1075, 650]), lift: 1.15, lines: LINES.telescope, sound: 'spyglass' },
      { id: 'crystal-ball', name: null, pos: at([890, 650]), lift: 1.3, lines: LINES.ball, sound: 'secret' },
      { id: 'chests', name: null, pos: at([310, 674]), lift: 0.4, lines: LINES.chests, sound: 'chest' },
    );
  },
  update(field, dt) {
    for (const v of field.villagers) v.update(dt, 0, 0);
  },
  labels(field) {
    const card = (name) => {
      const c = field.stage.cutouts.cards.find((k) => k.name === name);
      const box = new THREE.Box3().setFromObject(c.mesh);
      return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
    };
    return { floor: field.paint.toWorld(760, 800), counter: card('the counter'), lantern: card('lantern and crate, left') };
  },
};

// ---------------------------------------------------------------- the shop
function openShop(field) {
  if (shop) return;
  const { quill, stage, player } = field;
  field.locked = true;
  field.keys?.clear();
  document.body.classList.add('shopping');
  // Quill keeps his eyes on her (and on her basket), and the camera leans in on the counter
  quill.lookAt(headingTo(quill.root.position, player.pos));
  quill.setMood('calm');
  stage.setZoom(matchMedia('(max-width: 720px)').matches ? 1 : 1.3);
  field.audio.music('town'); // Thareia's "Market Day"
  swappedSkiffNow = false;
  shop = openSwapShop({
    inventory,
    sfx: (name, opts) => field.audio.sfx(name, opts),
    onSwap(result, inv) {
      inventory = inv;
      showSatchel(result.gave.map((g) => g.id));
      // Inkblot can't resist a swap: he flies up onto the counter to look
      if (field.crow && field.crow.state === 'stand') field.crowFly(field.perches.high[1], true);
    },
    react(event, detail) {
      if (event === 'open' || event === 'close') quill.play('tip');
      else if (event === 'select' || event === 'short') { if (!quill.busy) quill.play('talk'); }
      else if (event === 'swap') { quill.setMood('happy'); quill.play('swap'); setTimeout(() => quill.setMood('calm'), 2500); }
      else if (event === 'skiff') {
        // Warm hands at last: he flexes his fingers ("The skiff wakes", docs/SLICE.md §3)
        swappedSkiffNow = true;
        quill.setWarm(true);
        quill.setMood('happy');
        quill.play('flex');
        field.audio.sfx('kraa');
      }
    },
    onClose(inv) {
      inventory = inv;
      shop = null;
      field.locked = false;
      document.body.classList.remove('shopping');
      stage.setZoom(1);
      field.audio.music('wickhollow');
      quill.lookAt(null);
      quill.setMood('calm');
      showSatchel();
      // a parting word
      setTimeout(() => field.talk({
        name: 'Mister Quill', actor: quill, pos: quill.root.position, voice: 0, visits: 0,
        portrait: () => (inventory.skiff ? quillPortraits.happy : quillPortraits.cold),
        lines: { first: [swappedSkiffNow ? { say: QUILL_LINES.skiffDone, mood: 'happy' } : { say: QUILL_LINES.leave }] },
        onLine: () => { if (!quill.busy) quill.play('talk'); },
      }), 300);
    },
  });
}

// ---------------------------------------------------------------- her basket, on the field
function showSatchel(fresh = []) {
  const box = $('satchel');
  box.hidden = false;
  const g = holdings(inventory);
  const items = [...g.basket, ...g.found, ...g.worn, ...g.curios];
  $('satchel-list').replaceChildren(...items.map(({ id, n }) => {
    const li = document.createElement('li');
    li.title = THINGS[id].name;
    if (fresh.includes(id)) li.className = 'fresh';
    const img = document.createElement('img');
    img.src = iconOf(id);
    img.alt = THINGS[id].name;
    li.append(img);
    if (n > 1) { const b = document.createElement('b'); b.textContent = `×${n}`; li.append(b); }
    return li;
  }));
  $('satchel-count').textContent = `${basketUsed(inventory)} of ${basketSlots(inventory)} slots`;
  $('satchel-skiff').hidden = !inventory.skiff;
}

// ---------------------------------------------------------------- what they say
// Quill's first lines, his "Warming Balm" request and his after line are Follow Me Down Witch Way's
// (game/data/dialogue.json), with the skiff added to his request as docs/LORE.md has it. Lines with no name are the
// witch's own thoughts; { who: 'witch' } lines she says out loud.
const act = (move) => (field) => field.quill?.play(move);
const LINES = {
  quill: {
    first: [
      { say: 'Good evening, dear. Mister Quill. Everything on this stall is a swap. Everything.', do: act('talk') },
      { say: "I'd tip my hat, but my fingers ache so in the cold. Fingerless gloves. A mistake.", mood: 'cold', do: act('warm') },
      { say: "A Warming Balm for these poor fingers, and a lamp for my skiff's bow that won't blow out, and I'll swap you something marvelous: the skiff.", do: act('talk') },
      { who: 'witch', say: 'Show me the stall first. I have a basket full of maybes.', face: 'witch-sly' },
    ],
    again: [
      { say: "Back again? Splendid. Everything's a swap.", do: act('tip') },
    ],
  },
  quillWarm: {
    first: [{ say: 'Fingers toasty, pockets full of oddities. What more could a peddler want? A swap.', mood: 'happy', do: act('flex') }],
    again: [{ say: 'Fingers toasty, pockets full of oddities. What more could a peddler want? A swap.', mood: 'happy', do: act('flex') }],
  },
  inkblot: {
    first: [
      'Kraa! [A glossy black crow. His amber eyes go straight to your basket.]',
      "Kraa. [Quill's crow. He has the run of the stall, and he knows it.]",
    ],
    again: ['Kraa. [He eyes the counter, where the shiny things are.]'],
  },
  cloth: {
    first: ['A cloth hung from the counter, stitched with a crescent moon and stars.', "No prices anywhere. There never are. Everything's a swap."],
    again: ['The moon cloth. Not for swapping, I asked.'],
  },
  tags: {
    first: [
      'Every curio has a paper tag, in his curly writing. Not one says a price.',
      "This one says: ONE DUD (VINTAGE). That one says: A GOOD STORY. That one says: YOUR SECOND-BEST HAT.",
    ],
    again: ['YOUR SECOND-BEST HAT. I only have the one.'],
  },
  birdcage: {
    first: ['A brass birdcage with its door wide open. Inkblot nests in the Hollow; the cage is for show.'],
    again: ['The door is still open. It always will be.'],
  },
  hat: {
    first: ["A spare top hat on the post, hung with trinkets. He's wearing the good one."],
    again: ['The spare hat. Its feather has seen better nights.'],
  },
  scrolls: {
    first: ['Maps of the Sable, rolled tight. One is labelled BOGMIRE, BY SKIFF, in curly writing.', 'He used to fly the river at night, trading. That is where all of this came from.'],
    again: ['BOGMIRE, BY SKIFF. Underlined twice.'],
  },
  telescope: {
    first: ['A brass telescope on a stand, pointed at the sky over the stall.', 'For the moon, he says. Mostly for the moon.'],
    again: ['Still pointed at the moon. The moon is still there.'],
  },
  ball: {
    first: ['A crystal ball. Something violet turns slowly inside it.', "I'm not asking."],
    again: ['Still turning. Still not asking.'],
  },
  chests: {
    first: ['Chests of oddities, locked, with tags on the locks.', 'Even the locks are a swap, apparently.'],
    again: ['Locked. Tagged. Very Quill.'],
  },
};

// ---------------------------------------------------------------- go
bootTown({
  screens: { [stall.id]: { data: stall, cast: STALL } },
  start: stall.id,
  images: swapImages,
}).then((game) => {
  const { field, paint } = game;
  showSatchel();
  // She walks in from the square
  if (stall.enter?.walk) setTimeout(() => field.walkTo(paint.toWorld(...stall.enter.walk)), 400);
  // A handle for tests and the console
  window.__swap = {
    get inventory() { return inventory; },
    set inventory(inv) { inventory = inv; showSatchel(); },
    get shop() { return shop; },
    open: () => openShop(field),
    get quill() { return field.quill; },
  };
}).catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
