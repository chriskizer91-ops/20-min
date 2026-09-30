// The rabble of the Gloamwood and the Gloomfen (docs/LORE.md §7), each built from shapes in code in the same
// chunky, toon-shaded style as the witch. Every model has the same shape:
//   root, fx          the model (origin on the ground, facing +z) and a world-space effects group
//   name, height, radius, center
//   moves             attack, cast (its special), its signature intents, hurt, ko; plus 'hollowed' and 'moonlit'
//                     (turn the Hollowed omen on, and have moonlight break it) so the bestiary can show both
//   intents           Aethermoor move id -> the move that shows it
//   play(name, onHit, opts)  onHit fires when the move lands; names can also be intent ids ('lure', 'batter')
//   busy, update(dt)
//   setHollowed(on)   grey, cracked, hollow-eyed, trailing rot; setHollowed(false) plays the moonlight breaking it
// Nothing dies: 'ko' plays each foe's "beaten" and it stays that way (sat down, rooted, sulking, asleep in the bog,
// sunk, drifted off) until another move is played.
// The pieces live in foes-*.js; this file is what the battle screen and the bestiary import.
import { createSourWisp } from './foes-wisp.js';

export { createSourWisp };
export { createLampMoth } from './foes-moth.js';

// Aethermoor's marsh-light, drawn as the Sour Wisp.
export function createMarshLight(tint = '#8fe89a', opts) { return createSourWisp(tint, opts); }
export { createGlowcap } from './foes-glowcap.js';
export { createMandrake } from './foes-mandrake.js';
export { createBoglurcher } from './foes-bog.js';
export { createMireLeech } from './foes-leech.js';
