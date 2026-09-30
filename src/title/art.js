// Every picture the title page shows, imported here rather than through src/assets.js so the page carries only
// what it uses (the build turns each import into a data: URL inside dist/title.html). The heavier paintings come
// from art/title/, lighter copies baked by src/title/bake-art.py, to keep the page under 6 MB; the rest are the
// originals.
import title from '../../art/stills/title-skiff-over-valley.webp';
import moonrise from '../../art/title/moonrise.webp';
import squareFromTheWell from '../../art/title/square-from-the-well.webp';
import lightsDownTheRiver from '../../art/title/lights-go-down-the-river.webp';
import witchAtHerDoor from '../../art/title/witch-at-her-door.webp';
import skiffWakes from '../../art/title/the-skiff-wakes.webp';
import misthollowSank from '../../art/stills/the-night-misthollow-sank.webp';
import witchfireCauldron from '../../art/stills/witchfire-cauldron.webp';
import lightsGoHome from '../../art/title/lights-go-home.webp';
import twoLamplighters from '../../art/title/two-lamplighters.webp';
import nettieHut from '../../art/title/nettie-hut-inside.webp';
import bogmireMast from '../../art/title/bogmire-moot-circle.webp';
import clouds from '../../art/title/night-clouds-puffy.webp';
import lights from '../../art/fx/drifting-lights.webp';
import witchCalm from '../../art/portraits/witch-calm.webp';
import witchDelighted from '../../art/portraits/witch-delighted.webp';
import witchSurprised from '../../art/portraits/witch-surprised.webp';
import witchSly from '../../art/portraits/witch-sly.webp';
import nettieCalm from '../../art/portraits/nettie-calm.webp';
import nettieDelighted from '../../art/portraits/nettie-delighted.webp';
import nettieCross from '../../art/portraits/nettie-cross.webp';
import nettieSly from '../../art/portraits/nettie-sly.webp';
import motherVeiled from '../../art/portraits/lantern-mother-veiled.webp';
import motherGrieving from '../../art/portraits/lantern-mother-veiled-grieving.webp';
import motherSurprised from '../../art/portraits/lantern-mother-unveiled-surprised.webp';
import motherSmiling from '../../art/portraits/lantern-mother-unveiled-smiling.webp';
import inkblot from '../../art/portraits/inkblot.png';
import hilde from '../../art/portraits/hilde.png';
import agnes from '../../art/portraits/agnes.png';
import jacquard from '../../art/fonts/Jacquard12-Regular.ttf';
import pixelify from '../../art/fonts/PixelifySans[wght].ttf';

// The paintings, with their size in pixels (the camera moves are worked out in painting pixels, before the
// picture has loaded). The two field screens are 3:2 paintings cropped to 16:9 by the bake.
export const STILLS = {
  title: { src: title, w: 1672, h: 941 },
  moonrise: { src: moonrise, w: 1672, h: 941 },
  'square-from-the-well': { src: squareFromTheWell, w: 1672, h: 941 },
  'lights-go-down-the-river': { src: lightsDownTheRiver, w: 1672, h: 941 },
  'witch-at-her-door': { src: witchAtHerDoor, w: 1672, h: 941 },
  'the-skiff-wakes': { src: skiffWakes, w: 1672, h: 941 },
  'the-night-misthollow-sank': { src: misthollowSank, w: 1672, h: 940 },
  'witchfire-cauldron': { src: witchfireCauldron, w: 1672, h: 941 },
  'lights-go-home': { src: lightsGoHome, w: 1672, h: 941 },
  'two-lamplighters': { src: twoLamplighters, w: 1672, h: 941 },
  'nettie-hut': { src: nettieHut, w: 1536, h: 864 },
  'bogmire-mast': { src: bogmireMast, w: 1536, h: 864 },
};

// clouds: the three puffy night clouds in a row of 256 px cells; lights: top row four frames of a violet flame,
// bottom row four of golden motes, 128 px cells.
export const FX = { clouds, lights };

// Portraits by speaker and expression. The three villagers' are small pixel-art PNGs, drawn pixelated.
export const PORTRAITS = {
  witch: { calm: witchCalm, delighted: witchDelighted, surprised: witchSurprised, sly: witchSly },
  nettie: { calm: nettieCalm, delighted: nettieDelighted, cross: nettieCross, sly: nettieSly },
  mother: { veiled: motherVeiled, grieving: motherGrieving, surprised: motherSurprised, smiling: motherSmiling },
  inkblot: { calm: inkblot },
  hilde: { calm: hilde },
  agnes: { calm: agnes },
};
export const PIXEL_PORTRAITS = new Set([inkblot, hilde, agnes]);

export const FONTS = { 'Jacquard 12': jacquard, 'Pixelify Sans': pixelify };
