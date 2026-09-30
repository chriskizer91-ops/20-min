// Party models for the bestiary (owned by the party modeler): the Moonlight Witch's companions.
// Each entry: { id, name, group, make: () => model, note }
import { createWitch } from './witch.js';

export const PARTY = [
  { id: 'witch', name: 'The Moonlight Witch', group: 'Party', make: createWitch, note: 'The standard every model is held to.' },
];
