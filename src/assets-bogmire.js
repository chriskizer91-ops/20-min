// Bogmire's art (bogmire.html): the two paintings and Nettie's portraits. They live in their own module, imported
// only by the Bogmire page, so the other demos don't carry them. (The fen herbs' small icons are in assets.js,
// with the others, because the herb list is shared.)
import bogmireMootCircle from '../art/backgrounds/bogmire-moot-circle.webp';
import nettieHutInside from '../art/backgrounds/nettie-hut-inside.webp';
import nettieCalm from '../art/portraits/nettie-calm.webp';
import nettieDelighted from '../art/portraits/nettie-delighted.webp';
import nettieCross from '../art/portraits/nettie-cross.webp';
import nettieSly from '../art/portraits/nettie-sly.webp';

export const bogmireImages = {
  'art/backgrounds/bogmire-moot-circle.webp': bogmireMootCircle,
  'art/backgrounds/nettie-hut-inside.webp': nettieHutInside,
};
export const nettiePortraits = { 'nettie-calm': nettieCalm, 'nettie-delighted': nettieDelighted, 'nettie-cross': nettieCross, 'nettie-sly': nettieSly };

// The fen (docs/SLICE.md screens 11-13): Thareia's graveyard path at night for the Murkway, and art batch 2's Long
// Boardwalk and Mother's Hollow
import graveyardPath from '../art/backgrounds/graveyard-path.webp';
import longBoardwalk from '../art/backgrounds/long-boardwalk.webp';
import mothersHollow from '../art/backgrounds/mothers-hollow.webp';

Object.assign(bogmireImages, {
  'art/backgrounds/graveyard-path.webp': graveyardPath,
  'art/backgrounds/long-boardwalk.webp': longBoardwalk,
  'art/backgrounds/mothers-hollow.webp': mothersHollow,
});
