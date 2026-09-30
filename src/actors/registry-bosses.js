// Veteran and boss models for the bestiary (owned by the boss modeler): the Long Boardwalk's veterans and the
// two bosses of the Hollow and Mother's Hollow (docs/LORE.md §7).
import { createWillowWight } from './bosses-willow.js';

export const BOSSES = [
  { id: 'willow-wight', name: 'Willow-Wight', group: 'Veterans', make: createWillowWight, note: 'A weeping black willow that pulled up its roots. Beaten, it roots and sleeps: only a willow again.' },
];
