// abilities.js: the Captain's four abilities, unlocked by the skills (progress.js). Each runs for a few seconds and
// then has to come back before it can be used again.
//   Crystal Surge (Z): a burst of speed and turning, the sails glowing with the crystals' power
//   Double Shot (X): the gun crews reload twice as fast (two and a half times at rank 4)
//   Damage Control (V): the crew patch up hull, sails and crystals: 30% of what's missing (45% at rank 4)
//   Sunstone Ward (B): a ward of crystal light round the ship: hits do half damage (a third at rank 4)
import { abilities as unlocked } from './progress.js';
import { emit } from './events.js';

export function makeAbilities(env) {
  // env: { captain(), player(), gunnery(), toast(text) }
  const state = {}; // id -> { cool: seconds left before it's ready, on: seconds left running }
  const get = (id) => (state[id] ??= { cool: 0, on: 0 });
  function list() { return unlocked(env.captain()); }
  function use(id) {
    const A = list().find((a) => a.id === id), s = get(id), P = env.player();
    if (!A || P.down) return false;
    if (s.cool > 0) { env.toast(`${A.name} is back in ${Math.ceil(s.cool)} s`); return false; }
    s.on = A.time; s.cool = A.cooldown; s.strong = A.strong;
    if (id === 'control') { s.from = { hull: P.health.hull, sails: P.health.sails, crystals: P.health.crystals }; s.mend = A.strong ? 0.45 : 0.3; }
    env.toast(`${A.name}!`);
    emit('ability', { id });
    return true;
  }
  function update(dt) {
    const P = env.player(), G = env.gunnery();
    P.boost.speed = 1; P.boost.turn = 1; P.boost.accel = 1; G.haste = 1; P.shield = 1;
    for (const A of list()) {
      const s = get(A.id);
      s.cool = Math.max(0, s.cool - dt);
      if (s.on <= 0) continue;
      s.on = Math.max(0, s.on - dt);
      if (A.id === 'surge') { P.boost.speed = 1.45; P.boost.turn = 1.3; P.boost.accel = 3.5; }
      if (A.id === 'double') G.haste = s.strong ? 2.5 : 2;
      if (A.id === 'ward') P.shield = s.strong ? 1 / 3 : 0.5;
      if (A.id === 'control') for (const k of ['hull', 'sails', 'crystals']) {
        const gap = Math.max(0, P.full[k] - s.from[k]);
        P.health[k] = Math.min(P.full[k], P.health[k] + gap * s.mend * dt / A.time);
      }
    }
  }
  // for the HUD: each unlocked ability, how soon it's back (0..1 of its cooldown), and whether it's running
  function view() { return list().map((A) => { const s = get(A.id); return { ...A, wait: s.cool / A.cooldown, left: s.cool, on: s.on > 0 }; }); }
  function reset() { for (const k in state) delete state[k]; }
  // how bright the ward round the ship is: it comes up fast and fades in its last second
  function ward() { const s = get('ward'); return s.on > 0 ? Math.min(1, s.on, (list().find((a) => a.id === 'ward')?.time ?? 1) - s.on + 0.2) * (s.strong ? 1.25 : 1) : 0; }
  return { use, update, view, reset, ward, get surging() { return get('surge').on > 0; } };
}
