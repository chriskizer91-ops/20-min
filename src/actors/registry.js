// Every 3D model, for the bestiary page. Each list is owned by one modeler, so they can work at once.
import { PARTY } from './registry-party.js';
import { FOES } from './registry-foes.js';
import { BOSSES } from './registry-bosses.js';
import { PEOPLE } from './registry-people.js';

export const MODELS = [...PARTY, ...FOES, ...BOSSES, ...PEOPLE];
