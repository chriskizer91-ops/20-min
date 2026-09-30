// Foe models for the bestiary (owned by the foe modeler): the rabble of the Gloamwood and the Gloomfen.
import { createMarshLight, createLampMoth, createGlowcap, createMandrake, createBoglurcher, createMireLeech } from './foes.js';

export const FOES = [
  { id: 'sour-wisp', name: 'Sour Wisp', group: 'Foes', make: () => createMarshLight('#8fe89a'), note: 'Aethermoor marsh-light, drawn as a Witch Way wisp: grey at the edges and pouting.' },
  { id: 'lamp-moth', name: 'Lamp-Moth', group: 'Foes', make: createLampMoth, note: 'Pale gold, carrying one violet Wickhollow flame.' },
  { id: 'glowcap', name: 'Glowcap', group: 'Foes', make: createGlowcap, note: 'Child-sized, with a spotted amber cap; walks toward light.' },
  { id: 'mandrake', name: 'Hollowed Mandrake', group: 'Foes', make: createMandrake, note: 'Grey leaves, with the face of a cross turnip. Its scream sends hats flying.' },
  { id: 'boglurcher', name: 'Boglurcher', group: 'Foes', make: createBoglurcher, note: 'A heap of bog with eyes in it.' },
  { id: 'mire-leech', name: 'Mire Leech', group: 'Foes', make: createMireLeech, note: 'Glossy and black, more slug than horror.' },
];
