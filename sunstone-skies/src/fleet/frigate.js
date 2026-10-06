// The Frigate, levelled up: the Captain's biggest ship, the hunter. The same 40 m ship as the game's Frigate
// (src/ships/frigate.js) with the same guns, crystals and masts in the same places, so it flies and fights the same,
// but drawn as a frigate: sides leaning in above the gun deck, a raised forecastle and quarterdeck, a stern gallery
// and quarter galleries, a plum gun strake with gilt port lids, channels for the shrouds, fighting tops and a crow's
// nest, ribbed wing sails, a bowsprit, a storm-bird figurehead, boats on davits and grapnels at the catheads.
// Metres; z forward, y up, the main deck at y = 0; x is to port.
import base from '../ships/frigate.js';

export default {
  ...base,
  id: 'frigate', name: 'Tempest', cls: 'Frigate', length: 40, tileScale: 1, kit: 1, fine: 1.25,
  hull: {
    stern: -20, bow: 15.2, fullness: 0.88, wale: -1.0, tumblehome: 0.075,
    half: [[-20, 3.15], [-19, 3.9], [-16, 4.42], [-10, 4.62], [0, 4.66], [6, 4.56], [10, 4.06], [12.5, 3.25], [14.2, 2.05], [15.2, 0.8]],
    rim: [[-20, 1.95], [-18.5, 1.68], [-16, 1.55], [-13.72, 1.5], [-13.5, 0.06], [-8, 0], [0, 0], [6, 0.05], [9.98, 0.16], [10.2, 1.12], [13, 1.24], [15.2, 1.52]],
    keel: [[-20, -1.75], [-19, -2.85], [-17, -3.7], [-13, -4.4], [-5, -4.75], [4, -4.7], [9, -4.35], [12, -3.6], [13.8, -2.6], [14.8, -1.4], [15.2, -0.55]],
  },
  steps: [-13.61, 10.09],
  raised: [[-19.97, -13.75], [10.25, 15.1]],
  quarterdeck: { front: -13.6, height: 1.5, stairs: { bottom: -11.55, width: 2.4 } },
  forecastle: { back: 10.1, height: 1.12, ladder: { bottom: 8.75, width: 1.0, x: 1.55 } },
  strake: [-0.92, -2.66],
  bands: { sheer: [-0.36, -0.8], lower: [-3.25, -3.5], quarter: true, straps: [[-19.75, 0.4], [-13.0, 0.55], [-5.4, 0.5], [4.2, 0.5], [12.25, 0.55], [15.0, 0.4]] },
  ram: { from: 14.9, to: 20.6, y: -0.15, r: 0.95, collar: 1.3 },
  ports: { y: -1.78, z: [-11.4, -9.0, -6.6, -4.2, -1.8, 0.6, 3.0, 5.4, 7.8, 10.2], w: 1.08, h: 1.18 },
  bowGuns: [{ x: 1.35, y: 2.3, z: 13.05, len: 3.1 }, { x: -1.35, y: 2.3, z: 13.05, len: 3.1 }],
  sternGuns: [{ x: 1.45, y: -1.0, z: -20, len: 2.0, port: true }, { x: -1.45, y: -1.0, z: -20, len: 2.0, port: true }],
  clusters: [{ z: -7.0, scale: 1.05 }, { z: 1.25, scale: 1.1 }, { z: 8.85, scale: 1.0 }],
  cluster: { r: 1.0, h: 1.5, crystals: 5, center: 2.7, around: 1.45, spread: 1.2 },
  masts: [
    { z: 5.45, height: 14.4, channel: 3.2, tiers: [{ at: 0.4, span: 7.4, rise: 0.7, sweep: 0.8 }, { at: 0.72, span: 7.8, rise: 0.7, sweep: 0.9 }] },
    { z: -2.65, height: 15.6, channel: 3.4, nest: true, tiers: [{ at: 0.4, span: 7.3, rise: 0.7, sweep: 0.8 }, { at: 0.72, span: 7.7, rise: 0.7, sweep: 0.9 }] },
    { z: -15.6, height: 11.6, channel: 2.8, tiers: [{ at: 0.38, span: 6.5, rise: 0.6, sweep: 0.8 }, { at: 0.72, span: 6.8, rise: 0.6, sweep: 0.8 }] },
  ],
  bowsprit: { from: [0, 1.95, 13.7], to: [0, 6.5, 23.6], r: 0.26 },
  figurehead: { z: 15.3, y: 1.0, wing: 3.1, scale: 1.6 },
  catheads: { z: 13.35 },
  fins: [{ z0: -13.2, z1: -10.2, span: 2.9, sweep: -0.8, tilt: 0.5 }, { z0: 6.4, z1: 9.3, span: 2.9, sweep: 0.75, tilt: 0.5 }],
  rudder: { z: -19.95, top: -0.95, bottom: -5.0, width: 1.75 },
  wheel: { z: -18.1, r: 0.72, double: true },
  belfry: { z: 10.65 },
  binnacle: { z: -17.15 },
  skylight: { z: -19.3 },
  hatches: [{ z: -9.65, len: 1.5, wid: 1.8 }, { z: 3.4, len: 1.0, wid: 1.6 }, { z: 12.55, len: 1.0, wid: 1.3 }],
  capstan: { z: -0.8 },
  gallery: { depth: 1.05, floor: -0.32, roof: 1.62, windows: 5 },
  quarterGalleries: { z0: -19.5, z1: -16.7, y0: -0.75, y1: 1.45, out: 0.55 },
  boats: { z: -11.2, len: 3.9, beam: 1.25, y: 1.45 },
  vents: { z0: -12.5, z1: 10.5, n: 14 },
  armour: { rows: [[-2.85, -3.15], [-3.6, -4.15]], plate: 1.55 },
  windows: null,
  lanterns: [
    { at: [0, 1.95, -19.75], post: 0.35, scale: 2.2 }, { at: [2.3, 1.85, -19.65], post: 0.3, scale: 1.8 }, { at: [-2.3, 1.85, -19.65], post: 0.3, scale: 1.8 },
    { at: [4.05, 1.5, -13.9], post: 0.55 }, { at: [-4.05, 1.5, -13.9], post: 0.55 },
    { at: [2.75, 1.3, 13.9], post: 0.55 }, { at: [-2.75, 1.3, 13.9], post: 0.55 },
    { at: [0, 0.55, 16.35], hang: 0.5, scale: 1.2 }, { at: [4.35, -0.6, 11.0], hang: 0.45, scale: 1.2 }, { at: [-4.35, -0.6, 11.0], hang: 0.45, scale: 1.2 },
    { at: [2.2, -0.35, -20.9], hang: 0.4, scale: 1.2 }, { at: [-2.2, -0.35, -20.9], hang: 0.4, scale: 1.2 },
  ],
  cargo: { barrels: [[3.3, -12.2], [-3.4, -0.6], [3.3, 7.4], [-3.0, 12.9]], coils: [[1.1, 6.7], [-1.1, -1.6], [1.0, -14.6], [1.0, 12.0]],
    crates: [[-3.3, -9.6], [3.4, 2.9], [-3.4, 7.1]] },
  rail: { h: 0.72, step: 0.34, quarterH: 0.72, foreH: 0.7 },
};
