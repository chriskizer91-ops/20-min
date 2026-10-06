// The Captain's six ships, levelled up, smallest first. Their stats are the game's (src/ships/index.js). The Galleon
// and the Man-o'-war came last, from Chris's art packs for them; raiders sail all six.
import skiff from './skiff.js';
import cutter from './cutter.js';
import brig from './brig.js';
import frigate from './frigate.js';
import galleon from './galleon.js';
import manowar from './manowar.js';

export const FLEET = [skiff, cutter, brig, frigate, galleon, manowar];
export { STATS } from '../ships/index.js';
