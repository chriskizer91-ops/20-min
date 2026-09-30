// Veteran and boss models for the bestiary (owned by the boss modeler): the Long Boardwalk's veterans and the
// two bosses of the Hollow and Mother's Hollow (docs/LORE.md §7).
import { createWillowWight } from './bosses-willow.js';
import { createDrownedChorister } from './bosses-chorister.js';
import { createGloamwing } from './bosses-gloamwing.js';
import { createLanternMother } from './bosses-lantern.js';

export const BOSSES = [
  { id: 'willow-wight', name: 'Willow-Wight', group: 'Veterans', make: createWillowWight, note: 'A weeping black willow that pulled up its roots. Beaten, it roots and sleeps: only a willow again.' },
  { id: 'drowned-chorister', name: 'Drowned Chorister', group: 'Veterans', make: createDrownedChorister, note: 'Misthollow\'s drowned choir, still singing in its sleep. Beaten, it wakes, asks "Is it morning?" and stays to listen.' },
  { id: 'gloamwing', name: 'The Gloamwing', group: 'Bosses', make: createGloamwing, note: 'A moth the size of a cart, with the Dawnbell spun into its silk. Beaten, it flutters up after the moon, then sleeps on a moth-bower.' },
  { id: 'lantern-mother', name: 'The Lantern Mother', group: 'Bosses', make: createLanternMother, note: 'Misthollow\'s last lamplighter, in a wet lace veil, with a lantern of borrowed flames. Kind, and wrong. Beaten, the veil falls: "Are they safe?" She stays.' },
];
