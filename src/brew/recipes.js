// What goes into the pot and what comes out: docs/LORE.md §8 ("Herbs and brews"), in plain data with no DOM, so
// the rules (rules.js) and the node tests (tests/brew.test.mjs) can read it as well as the cauldron screen.
//
// - The eleven herbs are Witch Way's, with LORE's virtues, where they grow tonight and their battle use.
// - The six brews are LORE's table (Witch Way's own recipes): moonwater plus each listed herb once.
// - The three duds are the ones the battle bag carries. Witch Way's dose herbs make their own duds when two go in
//   one pot: two witch's bells make Hiccup Tonic (as in Witch Way). Witch Way's Droopy Hat Draught came from two
//   wolfsbane, but wolfsbane isn't one of LORE's eleven herbs, so here it comes from the other dose herb: two
//   mandrakes (whose scream sends her hat flying, LORE §7). Any other wrong mix is Swamp Tea, as in Witch Way.
//
// Ids: herbs use the art file names (art/herbs/<id>.webp, and src/data/herbs.js), and every brew and dud id is the
// battle bag's own (vendor/aethermoor/src/data/witch.js, WITCH_CONSUMABLES), except Wisp-Calm, a field brew only.
import { WITCH_CONSUMABLES } from '../../vendor/aethermoor/src/data/witch.js';

export const BASE = 'moonwater';
export const MAX_HERBS = 3; // Witch Way's pot: a bottle of moonwater and up to three herbs (docs/SLICE.md §4)

// Each virtue tints the pot, so the colour of the water tells you what's in it.
export const VIRTUES = {
  Calm: { color: '#b48cff' },
  Light: { color: '#ffe79a' },
  Heart: { color: '#ff78b0' },
  Memory: { color: '#8fdcb4' },
  Endure: { color: '#d8e2ff' },
  Warm: { color: '#ff8a38' },
  Root: { color: '#9a6a34' },
};
export const MOONWATER_COLOR = '#8fb8ff';

export const HERBS = {
  lavender: {
    name: 'Lavender', virtues: ['Calm'], grows: "Her garden; Silas's garden; Nettie's window boxes", battle: 'cures Spooked and Charmed',
    note: 'It settles even the jumpiest wisp. Also sextons.',
  },
  moonpetal: {
    name: 'Moonpetal', virtues: ['Light'], grows: "Her garden wall; the square's walls", battle: 'Radiant; Warded',
    note: "Wickhollow's lanterns burn its oil, so the whole village smells faintly of it after dark.",
  },
  witchs_bells: {
    name: "Witch's bells", virtues: ['Heart'], dose: true, grows: "Her garden's foxgloves; the lantern path", battle: 'heals',
    note: 'A dose herb: one bell steadies a heart. Two in one pot and the pot hiccups.',
  },
  nightrose: {
    name: 'Nightrose', virtues: ['Heart'], grows: 'The riverbank by the jetty, under a clear moon', battle: 'a gift for Rosalind',
    note: "It only opens while no cloud covers the moon. It isn't in any recipe. It's a gift.",
  },
  chapel_moss: {
    name: 'Chapel moss', virtues: ['Memory'], grows: 'The chapel stones in the square', battle: 'cleanses Rotting and Hexed',
    note: 'From the oldest stones. Wren said it was so nobody is forgotten.',
  },
  silver_mugwort: {
    name: 'Silver mugwort', virtues: ['Memory', 'Endure'], grows: "The lantern path stream; Bogmire's plank edges", battle: 'cleanses; Guarding',
    note: "For remembering and for holding on. Travellers tuck it in their boots so they never tire.",
  },
  ember_star_lily: {
    name: 'Ember-star lily', virtues: ['Warm'], grows: 'The lantern path', battle: 'Ember; cures Chilled',
    note: 'Warm to the touch, even in frost. Mind your sleeves.',
  },
  wisp_sprout: {
    name: 'Wisp-sprout', virtues: ['Calm'], rare: true, grows: "Silas's garden; Sour Wisps", battle: 'calms spirits',
    note: 'A rare calm. It only comes up in moonlight, and it hums if you listen.',
  },
  bogwick: {
    name: 'Bogwick', virtues: ['Light'], grows: "Silas's garden; Bogmire's lamp-pole planters; Boglurchers; fen patches", battle: 'Radiant; Warded',
    note: 'Every head ends in a little wick, lit. Clean a hollowed patch before you pick.',
  },
  glowcap: {
    name: 'Glowcap', virtues: ['Warm'], grows: 'Glowcap foes only: Gather it', battle: 'Ember; cures Chilled',
    note: "It doesn't grow under a full moon. The glowcaps carry it, and they'll share if you ask with the athame.",
  },
  mandrake: {
    name: 'Mandrake', virtues: ['Root'], dose: true, grows: 'The Hollowed Mandrake only', battle: 'Rooted',
    note: "A dose herb. Say sorry before you pick it. Two in one pot, and say sorry to your hat.",
  },
};
export const HERB_IDS = Object.keys(HERBS);

// The battle text for a bag item, from the battle data itself: a brew's first sentence names its herbs (the card
// shows those as icons), and a dud's says "A dud.", so both go. Something thrown at a foe says so.
function battleLine(id, kind) {
  const item = WITCH_CONSUMABLES[id];
  if (!item) return null;
  let rest = item.text.slice(item.text.indexOf('. ') + 2);
  if (item.target === 'enemy' && !/^thrown/i.test(rest)) rest = `Thrown: ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
  return rest;
}

// LORE §8's table. `field` is LORE's "In the field" column (with SLICE's detail); `battle` is what the bag item does
// (its own text in the battle data, so the card always matches the fight).
export const BREWS = [
  {
    id: 'heartsease-tonic', name: 'Heartsease Tonic', herbs: ['witchs_bells'], color: '#e36cff', target: 'drink',
    field: 'The tutorial brew, at her own cauldron. It steadies a tired heart.',
  },
  {
    id: 'warming-balm', name: 'Warming Balm', herbs: ['ember_star_lily', 'glowcap'], color: '#ff5a2e', target: 'rub',
    field: "Warms Quill's hands, and with them the skiff.",
  },
  {
    id: 'lantern-oil', name: 'Lantern Oil', herbs: ['moonpetal', 'bogwick'], color: '#ffc444', target: 'party',
    field: "Relights Silas's lamp: the Owl charm, and a flame for the skiff's bow that no wind or wisp can blow out.",
  },
  {
    id: 'hush-tea', name: 'Hush Tea', herbs: ['lavender', 'silver_mugwort'], color: '#a98cff', target: 'throw',
    field: 'Nettie sleeps an hour, wakes cross and rested, and joins.',
  },
  {
    id: 'wisp-calm', name: 'Wisp-Calm', herbs: ['lavender', 'wisp_sprout'], color: '#5cf0a0', target: 'field',
    field: 'Opens the twisted grove: the wisps settle and drift aside.',
    battleNote: "Not a battle brew: it's for the twisted grove. Brew it and the wisps there never pick a fight.",
  },
  {
    id: 'remembrance-incense', name: 'Remembrance Incense', herbs: ['chapel_moss', 'silver_mugwort'], color: '#8fe8d4', target: 'party',
    field: "Nothing in the field needs it. It's kept for the boss, at Mother's Hollow.",
  },
].map((b) => ({ ...b, kind: 'brew', item: WITCH_CONSUMABLES[b.id] ? b.id : null, battle: battleLine(b.id, 'brew') ?? b.battleNote }));

// The duds. `rule` says what makes each one; `herb` is the dose herb whose double makes it.
export const DUDS = [
  {
    id: 'hiccup-tonic', name: 'Hiccup Tonic', herb: 'witchs_bells', color: '#c44bff', rule: "Two witch's bells in one pot",
    field: "Don't drink it: she'd hiccup bubbles for a minute.", say: "Two bells. I know better. I did it anyway.",
  },
  {
    id: 'droopy-hat-draught', name: 'Droopy Hat Draught', herb: 'mandrake', color: '#7fa6ff', rule: 'Two mandrakes in one pot',
    field: "Don't drink it: her hat would wilt.", say: 'Two mandrakes. My hat already knows.',
  },
  {
    id: 'swamp-tea', name: 'Swamp Tea', herb: null, color: '#7d9a3a', rule: 'Any other mix',
    field: "Don't drink it: she'd turn faintly green.", say: "That's not a brew. That's a pond.",
  },
].map((d) => ({ ...d, kind: 'dud', item: d.id, battle: battleLine(d.id, 'dud') }));

export const OTHER_DUD = 'swamp-tea';
export const ALL = [...BREWS, ...DUDS];
export const byId = (id) => ALL.find((x) => x.id === id) ?? null;
