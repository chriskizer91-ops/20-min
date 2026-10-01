// The night as data: everything the game remembers, in one plain object that saves as JSON (no DOM, no three.js, so
// tests/game.test.mjs can check it in Node).
//
//   newGame()                      the start of the night: the cottage, an empty basket, the witch alone
//   save(state) / load()           localStorage (SAVE_KEY); load() gives null when there's nothing (or nothing readable)
//   partyFor(state)                the party as encounters.js startEncounter wants it: [{ id, level, relics, hp, mp }]
//   battleBag(state)               what she can drink or throw in a fight (the battle rules' consumables)
//   afterBattle(state, out, opts)  a fight's outcome folded in: HP and MP, XP and levels, what was drunk or thrown,
//                                  what was gathered, pried loose or dropped. Returns what to tell her.
//   join(state, id)                Inkblot or Nettie joins, with the witch's XP (encounters.js: "each with the witch's XP")
//   restParty(state)               everyone mended (a rest point)
//   storyFloor(state, id)          a story beat raises everyone's XP to its floor (encounters.js STORY_FLOORS)
//
// The bag uses the item ids in src/items.js (Quill's catalogue): herbs, brews, moonwater, charms, found things, relics.
import { makeHero, STORY_FLOORS } from '../battle/encounters.js';
import { levelForXp } from '../../vendor/aethermoor/src/rules/progression.js';
import { WITCH_CONSUMABLES } from '../../vendor/aethermoor/src/data/witch.js';

export const SAVE_KEY = 'moonlight-in-the-aether:save';
export const HERO_ORDER = ['witch', 'inkblot', 'nettie'];
export const HERO_NAMES = { witch: 'The Witch', inkblot: 'Inkblot', nettie: 'Nettie' };

// Where the night starts: the opening ends in her cottage, by the armchair (docs/SLICE.md screen 1)
export const START = { screen: 'cottage-inside', pixel: null, heading: 0 };
export const ARMCHAIR = { screen: 'cottage-inside', pixel: [800, 650], heading: 0, name: 'her armchair' };

export function newGame() {
  return {
    v: 1,
    playtime: 0, // seconds
    where: { ...START }, // where she is (the screen, and the painting pixel under her feet)
    rest: { ...ARMCHAIR }, // her last rest point: where she wakes after a lost fight
    bag: {},
    swaps: {}, // Quill's swaps made (swaps.js inventory.swaps)
    grimoire: null, // her grimoire (src/brew/rules.js newGrimoire), once she's brewed
    picked: [], // herbs gathered (field.picked), so they stay picked
    visits: {}, // how often she's spoken to each person or thing (field.visits)
    seenHerbs: [], // herb kinds she's gathered before
    flags: {}, // the night's shared record: silas, wickhollowWater, skiff, skiffAwake, b3, ending...
    areas: {}, // each area's own record (src/areas/*: host.state(name, defaults))
    party: ['witch'], // who's with her, in the order they walk
    heroes: { witch: { xp: 0, hp: null, mp: null } }, // hp/mp null: full
    fights: {}, // fight id -> 'won'
    gear: [], // loot that dropped: names and rarities, for the record (there's no equip screen yet)
    seen: [], // cut-scenes played
  };
}

// (in a sandbox that blocks storage, even looking at localStorage throws)
const local = () => { try { return globalThis.localStorage; } catch { return null; } };

export function save(state, storage = local()) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // no storage here (a private window): the night goes on, it just won't keep
  }
}

export function load(storage = local()) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.where) return null;
    return { ...newGame(), ...s };
  } catch {
    return null;
  }
}

export function clearSave(storage = local()) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* nothing to clear */ }
}

// ---------------------------------------------------------------- the bag
export const count = (state, id) => state.bag[id] ?? 0;
export function give(state, id, n = 1) {
  state.bag[id] = count(state, id) + n;
}
export function take(state, id, n = 1) {
  const left = count(state, id) - n;
  if (left > 0) state.bag[id] = left;
  else delete state.bag[id];
}

// What she can use in a fight: the brews and duds the battle rules know (vendor witch.js WITCH_CONSUMABLES), and one
// bottle of raw moonwater to throw for 2d6 Tide (docs/LORE.md §8; docs/BALANCE.md's bags carry one). She never takes
// into a fight the moonwater she still needs for the night's three required brews (Lantern Oil for Silas, a Warming
// Balm for Quill, a Hush Tea for Nettie), so no fight can leave her unable to make them. Wisp-Calm is a field brew.
export const BATTLE_ITEMS = Object.keys(WITCH_CONSUMABLES);
export function moonwaterNeeded(state) {
  const f = state.flags, areas = state.areas;
  const still = [
    !areas.gloamwood?.relit && count(state, 'lantern-oil') === 0,
    !f.skiff && count(state, 'warming-balm') === 0,
    !state.party.includes('nettie') && count(state, 'hush-tea') === 0,
  ];
  return still.filter(Boolean).length;
}
export function battleBag(state) {
  const bag = Object.fromEntries(BATTLE_ITEMS.filter((id) => id !== 'moonwater' && count(state, id) > 0).map((id) => [id, count(state, id)]));
  const spare = Math.min(1, count(state, 'moonwater') - moonwaterNeeded(state));
  if (spare > 0) bag.moonwater = spare;
  return bag;
}

// ---------------------------------------------------------------- the party
export const level = (state, id) => levelForXp(state.heroes[id]?.xp ?? 0);

// What each of them wears into a fight: Nettie her Hexbane Shawl always (docs/LORE.md §9), Inkblot his tail feather
// once it's back from his nest in the Hollow
export function relicsOf(state, id) {
  if (id === 'nettie') return ['hexbane-shawl'];
  if (id === 'inkblot' && count(state, 'inkblots-feather') > 0) return ['inkblots-feather'];
  return [];
}

// A hero's most HP and MP at their level, as the fights make them (encounters.js makeHero)
const maxCache = new Map();
export function maxOf(state, id) {
  const lv = level(state, id), relics = relicsOf(state, id);
  const key = `${id}:${lv}:${relics.join()}`;
  if (!maxCache.has(key)) {
    const { hero } = makeHero(id, { level: lv, relics });
    maxCache.set(key, { hp: hero.hp, mp: hero.mp });
  }
  return maxCache.get(key);
}

// Each of them as they stand: level, HP and MP (filled in where null means full)
export function heroStatus(state, id) {
  const h = state.heroes[id] ?? { xp: 0 };
  const max = maxOf(state, id);
  return { id, name: HERO_NAMES[id], level: level(state, id), xp: h.xp, hp: h.hp ?? max.hp, maxHp: max.hp, mp: h.mp ?? max.mp, maxMp: max.mp };
}

export function partyFor(state) {
  return state.party.map((id) => {
    const s = heroStatus(state, id);
    return { id, level: s.level, relics: relicsOf(state, id), hp: Math.max(1, Math.min(s.hp, s.maxHp)), mp: Math.min(s.mp, s.maxMp) };
  });
}

export function join(state, id) {
  if (state.party.includes(id)) return;
  state.party = HERO_ORDER.filter((h) => h === id || state.party.includes(h));
  state.heroes[id] = { xp: state.heroes.witch?.xp ?? 0, hp: null, mp: null };
}

export function restParty(state) {
  for (const id of state.party) Object.assign(state.heroes[id], { hp: null, mp: null });
}

export function storyFloor(state, id) {
  const floor = STORY_FLOORS[id]?.xp;
  if (floor === undefined) return;
  for (const h of Object.values(state.heroes)) h.xp = Math.max(h.xp, floor);
}

// ---------------------------------------------------------------- after a fight
// Aethermoor's own consumables, should one ever drop, come home as the night's nearest brew (docs/LORE.md §8's table)
const NEAREST = { 'hearth-tonic': 'heartsease-tonic', 'ember-salts': 'heartsease-tonic', 'frost-draught': 'warming-balm', bitterroot: 'remembrance-incense' };
const RELIC_IDS = ['dawnbell', 'lamplighters-lantern', 'mourning-veil', 'wickhollow-flame'];

// out: rules/battle.js outcome(); opts.herbs: what Gather cut (the director's herbs); opts.heroIds: unit id -> hero id.
// Returns { won, xp, levels: [{ id, level }], got: [ids], gear: [{ name, rarity }] }.
export function afterBattle(state, out, { herbs = [], heroIds = {}, fight = null, bagIn = battleBag(state) } = {}) {
  const won = out?.result === 'victory';
  const report = { won, xp: 0, levels: [], got: [], gear: [] };
  if (!won) return report;
  if (fight) state.fights[fight] = 'won';
  // HP, MP and Full Moon as they stood; anyone sitting down with their hat over their eyes gets up with 1 HP
  for (const p of out.party ?? []) {
    const id = heroIds[p.id] ?? p.id;
    const h = state.heroes[id];
    if (!h) continue;
    h.hp = Math.max(1, p.hp);
    h.mp = p.mp;
  }
  // XP to everyone in the party (Aethermoor's rules/gauntlet.js: every hero gets the fight's full XP)
  report.xp = out.xp ?? 0;
  for (const id of state.party) {
    const h = state.heroes[id];
    const before = level(state, id), oldMax = maxOf(state, id);
    h.xp += report.xp;
    const after = level(state, id);
    if (after > before) {
      report.levels.push({ id, level: after });
      // a level's new HP and MP come with it
      const max = maxOf(state, id);
      if (h.hp !== null) h.hp = Math.min(max.hp, h.hp + (max.hp - oldMax.hp));
      if (h.mp !== null) h.mp = Math.min(max.mp, h.mp + (max.mp - oldMax.mp));
    }
  }
  // The bag as the fight left it: what was drunk or thrown is gone (it went in with `bagIn`, the battle bag)
  for (const id of BATTLE_ITEMS) {
    const used = (bagIn[id] ?? 0) - (out.bag?.[id] ?? 0);
    if (used > 0) take(state, id, used);
  }
  // What Gather cut, and what she came away with
  for (const herb of herbs) { give(state, herb); report.got.push(herb); }
  for (const [id, n] of Object.entries(out.consumables ?? {})) {
    const mine = WITCH_CONSUMABLES[id] ? id : NEAREST[id];
    if (!mine) continue;
    give(state, mine, n);
    report.got.push(mine);
  }
  for (const item of [...(out.claimed ?? []), ...(out.drops ?? [])]) {
    const relic = RELIC_IDS.find((r) => item.base === r || item.relic === r);
    if (relic) {
      // A Wickhollow flame floats home; one Inkblot pinched back stays in her basket (Quill would like one)
      if (relic === 'wickhollow-flame' && !(out.claimed ?? []).includes(item)) continue;
      if (relic !== 'wickhollow-flame' && count(state, relic) > 0) continue;
      give(state, relic);
      report.got.push(relic);
    } else if (item.name) {
      const g = { name: item.name, rarity: item.rarity, base: item.base ?? null };
      state.gear.push(g);
      report.gear.push(g);
    }
  }
  return report;
}

// Everything the bag held going into a fight, so a lost fight costs nothing ("Nothing is lost", docs/LORE.md §3)
export const snapshot = (state) => ({ bag: { ...state.bag } });
export function afterDefeat(state, snap) {
  for (const k of Object.keys(state.bag)) delete state.bag[k]; // in place: the field holds this same bag
  Object.assign(state.bag, snap.bag);
  restParty(state);
}
