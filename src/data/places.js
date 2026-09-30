// The world map: Thareia's Gloomfen region painting (art/map/gloomfen-region.webp, 1536 x 1024), with the two
// towns the skiff flies between and the wild places around them. Positions are painting pixels. Towns have a
// dock where the skiff sets down; the wild places are reached on foot from the nearest town, and they are where
// the foes and most of the herbs are. Names follow docs/LORE.md; the lore pass may still rename the wild places.
export const MAP = {
  image: 'art/map/gloomfen-region.webp',
  size: [1536, 1024],
  // A high painter's camera: the painting is a three-quarter bird's-eye view, and the lens is long so it reads
  // nearly flat. Its pitch matches the painting's houses (walls and roofs about equal). 12 pixels to the meter makes the skiff about the size of the ships painted at the docks.
  camera: { fov: 16, pitch: 42, ppm: 12 },
};

export const PLACES = [
  {
    id: 'wickhollow', kind: 'town', name: 'Wickhollow', pixel: [1196, 640], dock: [1352, 712], heading: -Math.PI / 2,
    blurb: "The witch's village, where the Gloamwood meets the Sable: her cottage and garden, the square with its well and chapel, Hilde's smithy, Quill's stall, and the old jetty where the skiff is tied.",
    herbs: ['lavender', 'moonpetal', "witch's bells", 'chapel moss', 'nightrose'],
    near: ['the-lantern-path', 'the-twisted-grove', 'the-hollow'],
    music: 'wickhollow',
  },
  {
    id: 'bogmire', kind: 'town', name: 'Bogmire', pixel: [276, 500], dock: [470, 520], heading: Math.PI / 2,
    blurb: 'A stilt town on plank streets, with lanterns on poles and a mooring mast. Every lamp burns a borrowed violet flame. Mayor Gretch keeps the mud outside, and Nettie has her hut here.',
    herbs: ['bogwick', 'silver mugwort', 'lavender'],
    near: ['the-murkway', 'the-long-boardwalk', 'mothers-hollow'],
    music: 'marsh',
  },
  // The Gloamwood, on foot from Wickhollow
  {
    id: 'the-lantern-path', kind: 'wild', name: 'The Lantern Path', pixel: [1330, 390], from: 'wickhollow',
    blurb: 'Out of the bottom of the square: Silas among his dark lanterns, his garden, and the wayside kettle.',
    foes: ['Hollowed Mandrake', 'Glowcap'], herbs: ["witch's bells", 'ember-star lily', 'silver mugwort', 'wisp-sprout'],
  },
  {
    id: 'the-twisted-grove', kind: 'wild', name: 'The Twisted Grove', pixel: [1176, 300], from: 'wickhollow',
    blurb: 'Over the stone bridge, where the lights float away under the arches and sour wisps crowd the trees.',
    foes: ['Sour Wisps', 'Lamp-Moth'], herbs: ['—'],
  },
  {
    id: 'the-hollow', kind: 'wild', name: 'The Hollow', pixel: [1040, 236], from: 'wickhollow',
    blurb: "A marsh graveyard behind an iron gate. The Gloamwing hangs in the bone-hung trees, fat with light, and Inkblot's nest is here.",
    foes: ['the Gloamwing'], herbs: ['bogwick (once the bed is cleaned)'],
  },
  // The fen, on foot from Bogmire
  {
    id: 'the-murkway', kind: 'wild', name: 'The Murkway', pixel: [806, 612], from: 'bogmire',
    blurb: 'A plank path over black pools, past old fen graves. Fog covers the low planks; Hag-Sight shows which ones hold.',
    foes: ['Boglurcher', 'Mire Leeches'], herbs: ['bogwick', 'silver mugwort'],
  },
  {
    id: 'the-long-boardwalk', kind: 'wild', name: 'The Long Boardwalk', pixel: [640, 420], from: 'bogmire',
    blurb: "Planks on stilts, with lamp-posts burning Wickhollow's stolen flames out into the mist.",
    foes: ['Willow-Wight', 'Drowned Choristers'], herbs: ['silver mugwort'],
  },
  {
    id: 'mothers-hollow', kind: 'wild', name: "Mother's Hollow", pixel: [330, 340], from: 'bogmire', hidden: true,
    blurb: 'Black willows around a sunken house. Every window is lit.',
    foes: ['???'], herbs: ['—'],
  },
  // Seen from the air only
  {
    id: 'misthollow', kind: 'sight', name: 'Drowned Misthollow', pixel: [980, 470],
    blurb: 'A hundred years ago the water rose over Misthollow. Its chapel still stands, knee-deep in the fen.',
  },
];

// The stolen lights drift down the waterways from Wickhollow to Mother's Hollow, showing her the way.
export const LIGHT_PATH = [[1196, 650], [1060, 610], [930, 600], [810, 560], [700, 480], [580, 430], [470, 400], [390, 370], [330, 345]];

// Lit windows, for night: painting pixels of the houses and towers
export const WINDOWS = [
  // Wickhollow
  [1150, 620], [1170, 650], [1200, 612], [1222, 660], [1246, 626], [1262, 690], [1276, 640], [1192, 690], [1130, 670],
  // Bogmire
  [232, 512], [262, 480], [290, 520], [318, 500], [340, 470], [300, 548], [252, 540], [206, 500],
  // Nettie's hut, the bridge house, the old tower, farms up north
  [676, 380], [921, 282], [824, 96], [1162, 30], [1128, 92], [1256, 128], [1462, 152], [1290, 212], [932, 90],
];
