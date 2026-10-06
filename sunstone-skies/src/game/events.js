// events.js: what happens in the game, for whatever wants to hear about it: the sound, the hit marks by the crosshair,
// the flight guide. The game says what happened (emit) and doesn't need to know who's listening (on).
//   shot     { owner: 'player' | 'raider', battery, count, pos }     a battery fired
//   hit      { owner, target: 'enemy' | 'player', part, damage, at } a shot landed (part: hull, sails or crystals)
//   sunk     { id, captain, how, pos }                                a raider went down
//   ability  { id }                                                  the Captain used an ability
//   wave     { reinforcements }                                       raiders are coming in
//   mode     { mode: 'title' | 'port' | 'flight' | 'photo' }          where the player is now
//   pause    { paused }
//   level    { level }                                                the Captain went up a level
//   voyage   { chart, voyage }                                        a voyage was finished
//   aim      { part }                                                 the part of a raider the guns aim at changed
//   power    { mode }                                                 the crystal power was shifted in flight
//   course   { what: 'start' | 'ring' | 'finish', ... }               a flight course (explore)
//   waypoint { what: 'set' | 'reached' }
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name)?.delete(fn);
}

export function emit(name, detail = {}) {
  for (const fn of listeners.get(name) ?? []) {
    try { fn(detail); } catch (err) { console.error(`Sunstone Skies: ${name}`, err); } // a listener's trouble never stops the game
  }
}
