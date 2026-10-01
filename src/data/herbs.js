// Herbs of Wickhollow, from Follow Me Down Witch Way (LORE.md and game/data/scenes.json). The notes are
// written in the witch's grimoire voice for this demo; the facts in them (lantern oil, clear moons, "so nobody
// is forgotten") are the source game's.
import { herbs as icons } from '../assets.js';
// The Gloamwood's icons are imported here rather than in assets.js, which this file's builder doesn't own.
import witchsBells from '../../art/herbs/witchs_bells.webp';
import emberStarLily from '../../art/herbs/ember_star_lily.webp';
import wispSprout from '../../art/herbs/wisp_sprout.webp';

export const HERBS = {
  moonpetal: {
    name: 'Moonpetal', icon: icons.moonpetal, glow: '#e9e1ff',
    note: "Moonpetal. Wickhollow's lanterns burn its oil, so the whole village smells faintly of it after dark.",
  },
  lavender: {
    name: 'Lavender', icon: icons.lavender, glow: '#c9a8ff',
    note: 'Lavender. It settles even the jumpiest wisp. Also sextons.',
  },
  nightrose: {
    name: 'Nightrose', icon: icons.nightrose, glow: '#ff9fb8',
    note: "Nightrose. It only opens while no cloud covers the moon. Tonight it's showing off.",
  },
  chapel_moss: {
    name: 'Chapel moss', icon: icons.chapel_moss, glow: '#b8f0a0',
    note: 'Chapel moss, from the oldest stones. Wren said it was so nobody is forgotten.',
  },
  // Bogmire's two (LORE.md §8): bogwick from the lamp-pole planters, silver mugwort from the plank edges
  bogwick: {
    name: 'Bogwick', icon: icons.bogwick, glow: '#e2ff8a',
    note: 'Bogwick. Every head ends in a little wick, lit. Moonpetal and bogwick make Lantern Oil.',
  },
  silver_mugwort: {
    name: 'Silver mugwort', icon: icons.silver_mugwort, glow: '#e6ecff',
    note: "Silver mugwort, for remembering and for holding on. It likes a plank's edge and a bit of damp.",
  },
  // The Gloamwood's three (LORE.md §8): witch's bells and ember-star lily on the lantern path, wisp-sprout in Silas's
  // garden. Their notes are WW's own herb lines (witch_game_assets/design/LORE.md), shortened.
  witchs_bells: {
    name: "Witch's bells", icon: witchsBells, glow: '#d49cff',
    note: "Witch's bells. One sprig steadies a tired heart. Any more and you'll be hiccuping bubbles, so count carefully.",
  },
  ember_star_lily: {
    name: 'Ember-star lily', icon: emberStarLily, glow: '#ff9a4a',
    note: "Ember-star lily. It holds the day's warmth long after dark. The old stories say it lights the way home for anyone who's lost.",
  },
  wisp_sprout: {
    name: 'Wisp-sprout', icon: wispSprout, glow: '#c8ffb0',
    note: "Wisp-sprout. One uncurls wherever a will-o'-wisp stops to rest, and no wisp can resist its own. The heart of Wisp-Calm.",
  },
};

// Where they grow in the well square: the source game's own herb spots on this painting, keeping the ones
// she can reach from the walkmesh.
export const SQUARE_HERBS = [
  ['moonpetal', 925, 516], ['moonpetal', 1098, 622], ['moonpetal', 468, 890], ['moonpetal', 1095, 452],
  ['lavender', 625, 902], ['lavender', 1140, 868], ['lavender', 1302, 1010],
  ['nightrose', 1228, 470], ['nightrose', 836, 414], ['nightrose', 1308, 905],
  ['chapel_moss', 700, 486],
];
