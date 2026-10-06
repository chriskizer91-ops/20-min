// The Cutter, levelled up: the Gale, the fast raider. The game's Cutter (src/ships/cutter.js): long, low and narrow,
// a raked prow, two masts of wing sails swept back like a swallow's, three ports a side, a gun at each end.
// Levelled up: the sheer band lifted clear of the ports and a plum gun strake with gilt lids below it, small channels,
// crosstrees at the mastheads, ribbed sails, the bowsprit raised clear of the bow gun, gilt swallow's wings along the
// bows, a binnacle by the wheel, lift vents, conduits, and every garage fitting.
import base from '../ships/cutter.js';

export default {
  ...base,
  kit: 0.7, fine: 2.4, lanternScale: 0.8, battens: 4,
  bands: { sheer: [-0.04, -0.2], straps: [[-5.8, 0.3], [3.9, 0.32], [5.45, 0.2]] },
  strake: [-0.25, -1.34],
  bowsprit: { from: [0, 0.95, 4.2], to: [0, 2.15, 8.7], r: 0.12 },
  masts: [
    { z: 2.5, height: 6.2, channel: 1.3, deadeyes: 3, fife: 0.75, tiers: [{ at: 0.5, span: 3.9, rise: 0.75, sweep: 1.9 }] },
    { z: -3.65, height: 5.7, channel: 1.2, deadeyes: 3, fife: 0.75, tiers: [{ at: 0.48, span: 3.7, rise: 0.7, sweep: 1.8 }] },
  ],
  figurehead: { z: 4.75, y: -0.2, scale: 0.62, body: false, spread: 0.72 },
  binnacle: { z: -5.5 },
  vents: { z0: -5.0, z1: 3.6, n: 8 },
  armour: { rows: [[-1.42, -1.75]], plate: 0.95 },
};
