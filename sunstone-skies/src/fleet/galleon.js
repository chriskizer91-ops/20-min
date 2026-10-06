// The Galleon, levelled up: the Doldrums, the treasure ship. Her hull, castles, ports, guns, crystals and masts are the
// game's Galleon (src/ships/galleon.js), measured off Chris's pictures of her (the Galleon art pack): tall and wide, a
// two-storey stern castle full of windows, a forecastle, two decks of eight gun ports a side, four crystal crowns and
// two masts. Levelled up as the richest ship in the sky: two plum gun strakes with gilt lids, the stern castle's
// storeys of lit windows between gilt bands, stairs up both sides of it, a stern gallery and quarter galleries, a gilt
// sunburst on the bow, a cargo boom swinging a net of treasure in over the main hatch, chests of gold on deck, anchors
// at the catheads, channels and fighting tops, ribbed wing sails, lift vents, conduits, and every garage fitting.
// Metres; z forward, y up, the main deck at y = 0; x is to port.
import base from '../ships/galleon.js';

export default {
  ...base,
  kit: 1.2, fine: 0.85, fleetTile: 1.15,
  hull: { ...base.hull, tumblehome: 0.1 },
  steps: [-21.35, 12.5],
  raised: [[-29.97, -21.5], [12.65, 22.05]],
  quarterdeck: { front: -21.35, height: 5.69, stairs: { bottom: -16.8, width: 2.3, x: 4.75 } },
  forecastle: { back: 12.5, height: 3.42, ladder: { bottom: 9.85, width: 1.3, x: 3.9 } },
  strake: [[-1.0, -3.25], [-4.32, -6.6]],
  bands: { ...base.bands },
  masts: [
    { z: 16.4, height: 16.5, channel: 4.4, fife: 1.1, tiers: [{ at: 0.42, span: 11.5, rise: 1.1, sweep: 1.2 }, { at: 0.76, span: 10.6, rise: 1.0, sweep: 1.3 }] },
    { z: -19.0, height: 18.2, channel: 4.6, fife: 1.1, nest: true, tiers: [{ at: 0.42, span: 12.0, rise: 1.1, sweep: 1.2 }, { at: 0.76, span: 11.0, rise: 1.0, sweep: 1.3 }] },
  ],
  sunburst: { z: 22.3, y: 2.15, r: 1.45, tilt: 0.3 },
  catheads: { z: 19.2 },
  anchors: { len: 3.4, drop: 1.4 },
  derrick: { x: 5.3, z: -1.35, post: 7.2, reach: 5.2, top: 6.6, load: 2.9 },
  chests: [[1.9, -3.25, 0.3, true], [-1.9, 4.75, -0.2, false], [2.1, -7.55, 1.1, false], [-1.85, -11.75, 0.6, true]],
  wheel: { z: -27.0, r: 1.0, double: true },
  binnacle: { z: -25.4 },
  skylight: { z: -23.6, w: 1.6 },
  capstan: { z: 13.75 },
  gallery: { depth: 1.5, floor: 3.05, roof: 5.5, windows: 6 },
  quarterGalleries: { z0: -29.4, z1: -26.5, y0: 3.1, y1: 5.35, out: 0.85 },
  boats: { z: -8.0, len: 5.4, beam: 1.7, y: 1.35 },
  vents: { z0: -24, z1: 18, n: 22 },
  armour: { rows: [[-7.3, -7.95], [-8.15, -8.8]], plate: 2.4 },
  windows: {
    side: [{ z0: -26.1, z1: -22.4, y0: 3.5, y1: 5.1, reps: 2, frame: true, glow: 1.6 }, { z0: -29.2, z1: -22.4, y0: 1.2, y1: 2.8, reps: 3, frame: true, glow: 1.6 },
      { z0: 15.4, z1: 19.6, y0: 1.75, y1: 3.0, reps: 2, frame: true }],
    transom: { w: 8.0, y0: 1.05, y1: 2.65, reps: 3 },
  },
  lanterns: [
    ...base.lanterns,
    { at: [0, 5.69, -29.75], post: 0.5, scale: 2.6 }, { at: [2.6, 5.69, -29.7], post: 0.4, scale: 2.1 }, { at: [-2.6, 5.69, -29.7], post: 0.4, scale: 2.1 },
  ],
  cargo: { barrels: [[5.4, -16.0], [-5.4, -2.0], [5.3, 6.4]], coils: [[-2.6, -9.5], [2.6, 6.2], [0, 18.4]],
    crates: [[-5.3, -11.0], [5.4, 1.6], [-5.2, 9.0], [5.2, -7.0]] },
  rail: { h: 0.85, step: 0.42, quarterH: 0.8, foreH: 0.8 },
};
