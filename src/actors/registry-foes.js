// Foe models for the bestiary (owned by the foe modeler): the rabble of the Gloamwood and the Gloomfen.
import { createMarshLight, createLampMoth } from './foes.js';

export const FOES = [
  { id: 'sour-wisp', name: 'Sour Wisp', group: 'Foes', make: () => createMarshLight('#8fe89a'), note: 'Aethermoor marsh-light, drawn as a Witch Way wisp.' },
  { id: 'lamp-moth', name: 'Lamp-Moth', group: 'Foes', make: createLampMoth, note: 'Carries a stolen Wickhollow flame.' },
];
