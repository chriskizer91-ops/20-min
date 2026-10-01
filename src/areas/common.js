import * as THREE from 'three';
import { createHollowedPatch } from '../actors/hollowed-patch.js';
import { HERBS } from '../data/herbs.js';
import { turnToward } from '../actors/kit.js';

// Pieces the areas share (src/areas/*.js): Wickhollow, the Gloamwood and Bogmire.
//
// An area is a set of painted screens with their casts, made for a host:
//   createWickhollow(host) -> { screens: { id: { data, cast } }, images: { path: url } }
// The host is whoever runs the screens: a demo page (src/wickhollow.js and friends: encounter cards, and nothing
// carries over) or the game (src/game/: real battles, the cauldron, Quill's shop, the skiff, saving). What an area
// asks of it, all optional except state:
//   state(name, defaults)          this area's own record of the night (what's happened here), kept by the host
//   flags                          the night's shared record (Silas has said where the moths go, the skiff is hers...)
//   joined(id)                     is Inkblot / Nettie in the party?
//   join(id, field)                they join
//   encounter(id, { field, card, firstStrike }) -> Promise<'won' | 'lost' | 'card'>
//                                  a fight: the game plays it (and on a loss wakes her at her last rest before
//                                  resolving 'lost'); a demo shows the card ('card')
//   brew(field, where)             the cauldron screen at a pot ('cottage', 'kettle', 'nettie')
//   shop(field)                    Quill's swap shop
//   fly(field, from)               aboard the Magpie, from 'wickhollow' or 'bogmire'
//   cutscene(id)                   a painted cut-scene ('middle')
//   rest(field, where)             a rest point: everyone mended, and the night saved here
//   storyFloor(id)                 a story beat that sets the party's XP floor (encounters.js STORY_FLOORS)

export const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Just above a cut-out's card, for its label behind the scenes
export function cardTop(field) {
  return (name) => {
    const c = field.stage.cutouts.cards.find((k) => k.name === name);
    if (!c) return null;
    const box = new THREE.Box3().setFromObject(c.mesh);
    return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
  };
}

// Someone who turns to face whoever talks to them, and back to their own business after
export function facing(actor, rest) {
  let faceTo = null;
  actor.lookAt ??= (angle) => { faceTo = angle; };
  return (dt) => {
    const before = actor.root.rotation.y;
    actor.root.rotation.y = turnToward(before, faceTo ?? rest, 5, dt);
    const turn = Math.atan2(Math.sin(actor.root.rotation.y - before), Math.cos(actor.root.rotation.y - before)) / Math.max(dt, 1e-3);
    actor.update(dt, 0, turn);
  };
}

// A foe stepping off the path: a little hop and a turn, to a new spot, then it settles
export function stepAside(foe, to, dur = 1.6) {
  const from = foe.root.position.clone();
  let t = 0;
  foe.stepping = (dt) => {
    t = Math.min(1, t + dt / dur);
    const e = t * t * (3 - 2 * t);
    foe.root.position.lerpVectors(from, to, e);
    foe.root.position.y = from.y + (to.y - from.y) * e + Math.abs(Math.sin(t * Math.PI * 5)) * 0.06 * (1 - t);
    foe.root.rotation.y = turnToward(foe.root.rotation.y, t < 0.8 ? headingTo(from, to) : foe.rest, 8, dt);
    if (t >= 1) foe.stepping = null;
  };
}

// A set of flags kept as an array in the host's record (so it saves as JSON), used like a Set
export function flagSet(list) {
  return {
    has: (k) => list.includes(k),
    add: (k) => { if (!list.includes(k)) list.push(k); },
    get size() { return list.length; },
  };
}

// ---------------------------------------------------------------- Hollowed patches: clean the patch before you pick
// LORE §8's rule. [kind, x, y, lift] in painting pixels. `cleaned` remembers the ones she's cleaned tonight (flagSet).
// Looking at a grey patch, Moonlight shows the rot; looking again, witchfire burns it off and it blooms at once.
export function plantHollowed(field, list, cleaned) {
  const { paint, scene } = field;
  const patches = [];
  for (const [kind, x, y, lift = 0] of list) {
    const id = `${scene.id}:${kind}:${x},${y}`;
    if (field.picked.has(id)) continue;
    const patch = createHollowedPatch(kind, { glow: 0.5, cleaned: cleaned.has(id) });
    const pos = paint.toWorld(x, y, lift);
    patch.root.position.copy(pos);
    patch.root.rotation.y = Math.random() * Math.PI * 2;
    patch.root.scale.setScalar(1.7);
    field.group.add(patch.root);
    const name = HERBS[kind].name.toLowerCase();
    const thing = {
      id, patch, pos, name: null, lift: 0.2, sound: 'ui-page', visits: 0,
      get lines() { return { first: HOLLOWED[patch.state](name) }; },
      onEnd: (f) => cleanStep(f, thing, cleaned),
    };
    thing.bloom = () => Object.assign(thing, { herb: kind, plant: patch, group: patch.root, name: HERBS[kind].name });
    if (patch.state === 'bloomed') thing.bloom();
    field.things.push(thing);
    patches.push(thing);
  }
  return patches;
}

// After she's looked at a grey patch: Moonlight shows the rot. After she's seen the rot: witchfire burns it off.
function cleanStep(field, thing, cleaned) {
  const { patch } = thing;
  const witch = field.player.actor;
  if (patch.state === 'grey') {
    field.audio.sfx('radiant');
    witch.play('moonlight', () => {
      patch.reveal();
      field.audio.sfx('rot');
      field.toast('Moonlight shows the rot, wound round the roots.', 'wisp');
    });
  } else if (patch.state === 'shown') {
    witch.play('cast', () => {
      cleaned.add(thing.id);
      field.audio.sfx('burn');
      patch.burn(() => {
        thing.bloom();
        field.glints.burst(thing.pos.clone().setY(thing.pos.y + 0.3), 16);
        field.toast(`Witchfire burns nothing that belongs. The ${HERBS[thing.patch.kind].name.toLowerCase()} blooms.`, 'secret');
      });
    });
  }
}

// What she sees in a Hollowed patch, by what she's done to it so far
export const HOLLOWED = {
  grey: (name) => [
    `This was ${name}. Grey as ash now, and cracked right through. It's forgotten what it is.`,
    "Clean the patch before you pick. Moonlight first, to see where the rot's got in.",
  ],
  shown: (name) => [`There it is: the rot, wound round the ${name}'s roots like black string.`, 'Witchfire burns nothing that belongs.'],
  burning: () => ['Burning clean. Give it a moment.'],
  bloomed: () => [],
};

// Patches still Hollowed animate themselves (the field updates the ones in bloom, with the other herbs)
export function updateHollowed(patches, dt) {
  for (const t of patches ?? []) if (!t.herb) t.patch.update(dt);
}
