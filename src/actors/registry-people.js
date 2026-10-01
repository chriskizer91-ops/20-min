// People of the towns and wild places for the bestiary: the folk the witch meets who never fight (Silas fights only as
// a guest, in Lights Out). Each entry: { id, name, group, make: () => model, note }
import { createGretch } from './gretch.js';
import { createQuill } from './quill.js';
import { createSilas } from './silas.js';
import { createRosalind } from './rosalind.js';
import { createCauldron } from './cauldron.js';

export const PEOPLE = [
  { id: 'quill', name: 'Mister Quill', group: 'People', make: createQuill, note: '"Everything\'s a swap." Wickhollow\'s curio-seller and the Magpie\'s old skipper: a plum frock coat with too many pockets, a top hat with a brass clockwork eye, and fingers the cold got into until a Warming Balm.' },
  { id: 'silas', name: 'Silas', group: 'People', make: createSilas, note: 'The ghost lamplighter of the lantern path, with his lamp-pole. Bring him Lantern Oil and his lanterns light one by one; in Lights Out he steps out of the bow-lamp\'s flame.' },
  { id: 'rosalind', name: 'Rosalind', group: 'People', make: createRosalind, note: 'A ghost in a sea-green gown on the Sable riverbank, who misses roses. A nightrose earns the Bell charm.' },
  { id: 'gretch', name: 'Mayor Gretch', group: 'People', make: createGretch, note: '"Wipe your boots. No, the other way. We keep the mud outside." Bogmire\'s mayor: a red gown, a wolf fur, the chain of office, the town\'s keys and its ledger, and mud to the ankles.' },
  { id: 'cauldron', name: 'The Cauldron', group: 'Things', make: createCauldron, note: 'The great pot from her hearth, for Pick Your Poison: herbs, moonwater, a stir and a witchfire blessing.' },
];
