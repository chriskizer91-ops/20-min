// Party models for the bestiary (owned by the party modeler): the Moonlight Witch's companions.
// Each entry: { id, name, group, make: () => model, note }
import { createWitch } from './witch.js';
import { createInkblot } from './inkblot.js';

export const PARTY = [
  { id: 'witch', name: 'The Moonlight Witch', group: 'Party', make: createWitch, note: 'The standard every model is held to.' },
  { id: 'inkblot', name: 'Inkblot', group: 'Party', make: createInkblot, note: 'Mister Quill\'s crow: a thief with good intentions. "Kraa."' },
];
