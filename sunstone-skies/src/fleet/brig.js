// The Brig, levelled up: the Tradewind, the all-rounder. Her hull, stern castle, windows, ports, guns, crystals and masts
// are the game's Brig (src/ships/brig.js), measured off Chris's pictures of her, so she keeps the look he drew: a raised
// stern deck with stairs, three arched windows across the stern over a stern gun, bow guns either side of the ram.
// Levelled up like the Tempest: a plum gun strake with gilt lids, channels for the shrouds, fighting tops, ribbed
// wing sails, a gilt gull on the ram, lift vents, conduits, and every garage fitting.
import base from '../ships/brig.js';

export default {
  ...base,
  kit: 0.85, fine: 1.75,
  steps: [-9.02],
  raised: [[-12.47, -9.15]],
  strake: [-0.84, -2.5],
  masts: [
    { z: 6.9, height: 8.0, channel: 2.2, deadeyes: 3, fife: 0.85, tiers: [{ at: 0.42, span: 5.0, rise: 0.55, sweep: 0.5 }, { at: 0.74, span: 5.3, rise: 0.6, sweep: 0.7 }] },
    { z: -9.75, height: 6.6, channel: 1.8, deadeyes: 3, fife: 0.55, tiers: [{ at: 0.38, span: 4.6, rise: 0.5, sweep: 0.5 }, { at: 0.72, span: 4.9, rise: 0.55, sweep: 0.7 }] },
  ],
  figurehead: { z: 8.72, y: 0.62, scale: 0.85 },
  vents: { z0: -8.2, z1: 6.6, n: 10 },
  armour: { rows: [[-2.56, -2.84], [-3.2, -3.55]], plate: 1.25 },
  lanterns: [
    { at: [2.15, 1.75, -12.25], post: 0.55, scale: 1.45 }, { at: [-2.15, 1.75, -12.25], post: 0.55, scale: 1.45 },
    { at: [2.55, 1.75, -9.25], post: 0.55 }, { at: [-2.55, 1.75, -9.25], post: 0.55 },
    { at: [2.0, 0.1, 7.5], post: 0.6 }, { at: [-2.0, 0.1, 7.5], post: 0.6 },
    { at: [0, -1.25, 9.55], hang: 0.5 }, { at: [2.95, -1.05, 6.3], hang: 0.45 }, { at: [-2.95, -1.05, 6.3], hang: 0.45 },
    { at: [2.55, -0.8, -11.6], hang: 0.45 }, { at: [-2.55, -0.8, -11.6], hang: 0.45 },
  ],
};
