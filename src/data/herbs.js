// Herbs of Wickhollow, from Follow Me Down Witch Way (LORE.md and game/data/scenes.json). The notes are
// written in the witch's grimoire voice for this demo; the facts in them (lantern oil, clear moons, "so nobody
// is forgotten") are the source game's.
import { herbs as icons } from '../assets.js';

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
};

// Where they grow in the well square: the source game's own herb spots on this painting, keeping the ones
// she can reach from the walkmesh.
export const SQUARE_HERBS = [
  ['moonpetal', 925, 516], ['moonpetal', 1098, 622], ['moonpetal', 468, 890], ['moonpetal', 1095, 452],
  ['lavender', 625, 902], ['lavender', 1140, 868], ['lavender', 1302, 1010],
  ['nightrose', 1228, 470], ['nightrose', 836, 414], ['nightrose', 1308, 905],
  ['chapel_moss', 700, 486],
];
