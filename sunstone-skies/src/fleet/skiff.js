// The Skiff, levelled up: the Zephyr, the Captain's first ship, about the Magpie's size. The game's Skiff
// (src/ships/skiff.js): an open deck, one crown of three crystals, one pair of wing sails, a swivel gun at the prow and
// one on each rail. Levelled up: a plum band with gold pinstripes along her sides, crosstrees at the masthead, ribbed
// sails, gilt wings along the bows, a little binnacle by the wheel, lift vents, conduits, and every garage fitting.
import base from '../ships/skiff.js';

export default {
  ...base,
  kit: 0.55, fine: 3.2, lanternScale: 0.65, battens: 4,
  strake: [-0.36, -0.66],
  masts: [{ z: 1.45, height: 3.7, fife: 0.5, tiers: [{ at: 0.5, span: 2.7, rise: 0.4, sweep: 0.35 }] }],
  figurehead: { z: 2.95, y: -0.2, scale: 0.36, body: false, spread: 0.5 },
  binnacle: { z: -2.7 },
  vents: { z0: -2.2, z1: 2.0, n: 4 },
  armour: { rows: [[-0.72, -1.02]], plate: 0.75 },
};
