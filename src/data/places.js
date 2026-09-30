// The world map (art batch 2, #01: art/map/world-night.webp, 1536 x 1024): the valley at night, from Wickhollow in
// the upper left, where the Gloamwood meets the Sable, down the river to Bogmire on its stilts in the lower right.
// Positions are painting pixels. Towns have a dock where the skiff sets down; the wild places are reached on foot
// from the nearest town, and they are where the foes and most of the herbs are (docs/SLICE.md, "The route").
export const MAP = {
  image: 'art/map/world-night.webp',
  size: [1536, 1024],
  // A bird's-eye view that flattens toward its painted horizon: trees at the bottom are only about 1.7 times the
  // size of trees in the middle. A 34 degree lens looking 32 degrees down gives that much perspective, and 12
  // pixels to the meter makes the Magpie a little longer than a Bogmire hut.
  camera: { fov: 34, pitch: 32, ppm: 12 },
  // Where the skiff may fly: the valley floor, not the mountains and sky at the top
  bounds: { x0: 70, x1: 1466, y0: 190, y1: 975 },
};

export const PLACES = [
  {
    id: 'wickhollow', kind: 'town', name: 'Wickhollow', pixel: [180, 262], dock: [292, 448], dockAlt: 1.3, heading: Math.PI / 2,
    blurb: "The witch's village, where the Gloamwood meets the Sable: her cottage and garden, the square with its well and chapel, Hilde's smithy, Quill's stall, and the old jetty where the Magpie is tied.",
    herbs: ['lavender', 'moonpetal', "witch's bells", 'chapel moss', 'nightrose'],
    near: ['the-lantern-path', 'the-twisted-grove', 'the-hollow'],
    music: 'wickhollow',
  },
  {
    id: 'bogmire', kind: 'town', name: 'Bogmire', pixel: [1300, 790], dock: [1372, 742], dockAlt: 4.5, heading: -Math.PI / 2,
    blurb: 'A stilt town on plank streets around the moot-circle, with lanterns on poles and a mooring mast where the Magpie ties up. Every lamp burns a borrowed violet flame. Mayor Gretch keeps the mud outside, and Nettie has her hut here.',
    herbs: ['bogwick', 'silver mugwort', 'lavender'],
    near: ['the-murkway', 'the-long-boardwalk', 'mothers-hollow'],
    music: 'marsh',
  },
  // The Gloamwood, on foot from Wickhollow
  {
    id: 'the-lantern-path', kind: 'wild', name: 'The Lantern Path', pixel: [600, 392], from: 'wickhollow',
    blurb: 'Out of the bottom of the square and along the Sable: Silas among his dark lanterns, his garden, and the wayside kettle.',
    foes: ['Hollowed Mandrake', 'Glowcap'], herbs: ["witch's bells", 'ember-star lily', 'silver mugwort', 'wisp-sprout'],
  },
  {
    id: 'the-twisted-grove', kind: 'wild', name: 'The Twisted Grove', pixel: [930, 272], from: 'wickhollow',
    blurb: 'Over the stone bridge, where the lights float away under the arches and sour wisps crowd the gnarled trees.',
    foes: ['Sour Wisps', 'Lamp-Moth'], herbs: ['—'],
  },
  {
    id: 'the-hollow', kind: 'wild', name: 'The Hollow', pixel: [1085, 282], from: 'wickhollow',
    blurb: "A marsh graveyard behind an iron gate. The Gloamwing hangs in the bone-hung trees, fat with light, and Inkblot's nest is here.",
    foes: ['the Gloamwing'], herbs: ['bogwick (once the bed is cleaned)'],
  },
  // The fen, on foot from Bogmire
  {
    id: 'the-murkway', kind: 'wild', name: 'The Murkway', pixel: [1150, 572], from: 'bogmire',
    blurb: 'A plank path over black pools, past old fen graves. Fog covers the low planks; Hag-Sight shows which ones hold.',
    foes: ['Boglurcher', 'Mire Leeches'], herbs: ['bogwick', 'silver mugwort'],
  },
  {
    id: 'the-long-boardwalk', kind: 'wild', name: 'The Long Boardwalk', pixel: [1092, 706], from: 'bogmire',
    blurb: "Planks on stilts, with lamp-posts burning Wickhollow's stolen flames out into the mist.",
    foes: ['Willow-Wight', 'Drowned Choristers'], herbs: ['silver mugwort'],
  },
  {
    id: 'mothers-hollow', kind: 'wild', name: "Mother's Hollow", pixel: [962, 652], from: 'bogmire', hidden: true,
    blurb: 'Black willows around a sunken house. Every window is lit.',
    foes: ['???'], herbs: ['—'],
  },
  // Seen from the air only
  {
    id: 'misthollow', kind: 'sight', name: 'Drowned Misthollow', pixel: [1400, 452],
    blurb: 'A hundred years ago the water rose over Misthollow. Its towers still stand, knee-deep in the fen.',
  },
];

// The stolen lights drift down the Sable from Wickhollow's bridge to Mother's Hollow, showing her the way.
export const LIGHT_PATH = [[330, 372], [288, 432], [360, 492], [470, 512], [512, 582], [600, 640], [720, 662], [840, 652], [950, 656]];
