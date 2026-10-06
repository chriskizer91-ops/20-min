// The Man-o'-war, levelled up: the Thunderhead, the flying fortress. Her hull, castles, ports, guns, crystals and masts
// are the game's Man-o'-war (src/ships/manowar.js), measured off Chris's pictures of her (the Man-o'-war art pack):
// long and deep, clad in dark iron plates, castles at both ends, two decks of twelve gun ports a side, four guns
// straight out of the bow round the ram, five crystal crowns and three masts. Levelled up as a fortress: two plum gun
// strakes with gilt lids on the iron, battlements of riveted iron round both castles, the castles' storeys of lit
// windows, stairs up both sides of each, crow's nests on every mast, anchors at the catheads, channels and fighting
// tops, heavy ribbed wing sails, lift vents, conduits, and every garage fitting.
// Metres; z forward, y up, the main deck at y = 0; x is to port.
import base from '../ships/manowar.js';

export default {
  ...base,
  kit: 1.35, fine: 0.7, fleetTile: 1.3,
  steps: [-32.2, 22.1],
  raised: [[-44.97, -32.35], [22.25, 34.5]],
  quarterdeck: { front: -32.2, height: 6.4, stairs: { bottom: -27.3, width: 2.6, x: 5.1 } },
  forecastle: { back: 22.1, height: 6.1, ladder: { bottom: 17.3, width: 2.6, x: 5.1 } },
  strake: [[-1.55, -4.4], [-5.45, -8.35]],
  bands: { ...base.bands },
  battlements: [[-44.75, -32.45, -1], [22.35, 34.3, 1]],
  masts: [
    { z: 27.0, height: 23, channel: 5.0, fife: 1.3, nest: true, tiers: [{ at: 0.42, span: 10.4, rise: 1.0, sweep: 1.4 }, { at: 0.76, span: 9.6, rise: 0.9, sweep: 1.5 }] },
    { z: 0.5, height: 28, channel: 5.4, fife: 1.3, nest: true, tiers: [{ at: 0.42, span: 11.0, rise: 1.0, sweep: 1.4 }, { at: 0.76, span: 10.2, rise: 0.9, sweep: 1.5 }] },
    { z: -20.7, height: 26.5, channel: 5.2, fife: 1.3, nest: true, tiers: [{ at: 0.42, span: 10.8, rise: 1.0, sweep: 1.4 }, { at: 0.76, span: 10.0, rise: 0.9, sweep: 1.5 }] },
  ],
  catheads: { z: 31.2 },
  anchors: { len: 4.6, drop: 1.9 },
  wheel: { z: -41.6, r: 1.1, double: true },
  binnacle: { z: -39.9 },
  skylight: { z: -37.8, w: 1.8 },
  capstan: { z: 24.2 },
  boats: { z: -10.1, len: 6.2, beam: 1.9, y: 1.5 },
  vents: { z0: -36, z1: 28, n: 26 },
  armour: { rows: [[-10.15, -10.85], [-11.15, -11.9]], plate: 2.8 },
  windows: {
    side: [{ z0: -43.6, z1: -37.0, y0: 2.6, y1: 5.1, reps: 2, frame: true, glow: 1.7 }, { z0: 27.4, z1: 32.2, y0: 2.6, y1: 4.7, reps: 2, frame: true, glow: 1.5 }],
    transom: { w: 9.5, y0: 3.0, y1: 5.2, reps: 2 },
  },
  lanterns: [
    ...base.lanterns,
    { at: [0, 6.4, -44.75], post: 0.6, scale: 3.0 },
  ],
  rail: { h: 0.95, step: 0.45, quarterH: 0.9, foreH: 0.9 },
};
