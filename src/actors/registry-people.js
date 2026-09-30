// People of the towns for the bestiary (owned by the town builder): the folk the witch meets who never fight.
// Each entry: { id, name, group, make: () => model, note }
import { createGretch } from './gretch.js';

export const PEOPLE = [
  { id: 'gretch', name: 'Mayor Gretch', group: 'People', make: createGretch, note: '"Wipe your boots. No, the other way. We keep the mud outside." Bogmire\'s mayor: a red gown, a wolf fur, the chain of office, the town\'s keys and its ledger, and mud to the ankles.' },
];
