// The bridge to Aethermoor's battle rules (vendor/aethermoor). Everything about who hits whom, for how much,
// comes from there; this file only builds the party and the foes in its formats.
import { createBattle, current, commands, targets, act, foeTurn, outcome, inspect, timeline } from '../../vendor/aethermoor/src/rules/battle.js';
import { buildFoe } from '../../vendor/aethermoor/src/rules/foe.js';
import { deriveHero } from '../../vendor/aethermoor/src/rules/stats.js';
import { generateItem } from '../../vendor/aethermoor/src/rules/loot.js';
import { HEROES } from '../../vendor/aethermoor/src/data/heroes.js';
import { SLOTS } from '../../vendor/aethermoor/src/data/items.js';
import { RARITY } from '../../vendor/aethermoor/src/data/rarity.js';
import { STATUSES } from '../../vendor/aethermoor/src/data/statuses.js';
import { createRng } from '../../vendor/aethermoor/src/core/rng.js';

export { current, commands, targets, act, foeTurn, outcome, inspect, timeline, RARITY, STATUSES };

// A level-L hero with her starting gear, as Aethermoor's newGame would make one. `names` renames items
// (her quarterstaff is a birch broom).
export function makeHero(id, { level = 1, seed = 1, names = {} } = {}) {
  const rng = createRng(`${id}:${seed}`);
  const data = HEROES[id];
  const inventory = [];
  const hero = {
    id, name: data.name, level, xp: 0, hp: null, mp: null, surge: 0,
    base: { ...data.base },
    gear: Object.fromEntries(SLOTS.map((s) => [s, null])),
    skills: data.skills.filter((s) => s.level <= level).map((s) => s.id),
    domains: Object.fromEntries([data.domain, ...(data.secondary || [])].map((d) => [d, { level, path: null, opt7: null, opt13: null }])),
    hpRolls: [],
  };
  for (const [slot, g] of Object.entries(data.gear)) {
    const item = generateItem(rng, { base: g.base, rarity: g.rarity, ilvl: level, provenance: { from: 'her cottage', where: 'Wickhollow', day: 1 } });
    if (names[g.base]) item.name = names[g.base];
    inventory.push(item);
    hero.gear[slot] = item.uid;
  }
  const d = deriveHero(hero, inventory);
  return { hero: { ...hero, hp: d.maxHp, mp: d.maxMp }, inventory };
}

// Start a fight. party: [{ id, level }], foes: [{ family, level, name? }], bag: { consumableId: count }.
export function startBattle({ party, foes, bag = {}, seed = 1, names }) {
  const heroes = [];
  const inventory = [];
  for (const p of party) {
    const made = makeHero(p.id, { level: p.level, seed, names });
    heroes.push(made.hero);
    inventory.push(...made.inventory);
  }
  const built = foes.map((f, i) => buildFoe({ family: f.family, level: f.level || 1, variant: f.variant }, { id: `foe${i + 1}`, seq: i, name: f.name }));
  return createBattle({ heroes, foes: built, seed, ctx: { inventory, bag: { ...bag } } });
}
