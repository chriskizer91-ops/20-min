// The six battles of the slice (docs/SLICE.md §2), in Aethermoor's formats, and how to start them.
//
//   ENCOUNTERS[id]                       B1..B6 (and B6b, the final boss's second form): foes, party, bag, flags
//   CURVE                                the party's XP and level at each fight (Aethermoor's XP rules + story floors)
//   startEncounter(id, opts) -> state    a vendor battle state (rules/battle.js), ready for act()/foeTurn()
//   nextForm(state) -> state | null      after B6's first form is won: B6b, with the party as it stood
//   makeParty(party) -> { heroes, inventory }
//
// Numbers are tuned with tools/balance.mjs; docs/BALANCE.md has the targets, the results and the reasons.

import { createBattle } from '../../vendor/aethermoor/src/rules/battle.js';
import { buildFoe } from '../../vendor/aethermoor/src/rules/foe.js';
import { deriveHero } from '../../vendor/aethermoor/src/rules/stats.js';
import { generateItem, relicItem } from '../../vendor/aethermoor/src/rules/loot.js';
import { xpForLevel, levelForXp } from '../../vendor/aethermoor/src/rules/progression.js';
import { HEROES } from '../../vendor/aethermoor/src/data/heroes.js';
import { SLOTS } from '../../vendor/aethermoor/src/data/items.js';
import { RELICS } from '../../vendor/aethermoor/src/data/relics.js';
import { createRng } from '../../vendor/aethermoor/src/core/rng.js';

// ---- the fights ----------------------------------------------------------------------------------------------------------
// foes: FoeSpawns (rules/battle.js createBattle): family, level, variant, omens, name.
// party: hero ids; levels come from CURVE, relics from `wears` (what a typical player has equipped by then).
// bag: the brews a typical player carries in (docs/BALANCE.md §4 follows the moonwater through the night).
// flags: noFlee (bosses), required, firstStrike ('can': Moonlight on a foe's back in the field gives one).

const INKBLOT_FEATHER = { inkblot: ['inkblots-feather'] }; // back from his nest in the Hollow (B3's screen)
const NETTIE_SHAWL = { nettie: ['hexbane-shawl'] };        // she always wears it (LORE §9)

export const ENCOUNTERS = {
  B1: {
    id: 'B1', name: 'The Lantern Path', where: 'the lantern path, Wickhollow\'s wilds',
    backdrop: 'battle-gloamwood-night', stopgap: 'TH: battle-forest-ruins.png, night-graded',
    foes: [
      { family: 'hollowed-mandrake', level: 1, name: 'Hollowed Mandrake' },
      { family: 'glowcap', level: 1, name: 'Glowcap' },
    ],
    party: ['witch', 'inkblot'],
    bag: { 'heartsease-tonic': 1 },
    flags: { required: true, noFlee: true, tutorial: true },
    teaches: 'd20 rolls and grazes, intent dice, Witchfire beating Verdant, Gather (glowcap for the Warming Balm), the gentle mandrake and the hat gag.',
  },
  B2: {
    id: 'B2', name: 'The Twisted Grove', where: 'the twisted grove, off the Sable bridge',
    backdrop: 'graveyard-night',
    foes: [
      { family: 'marsh-light', level: 1, name: 'Sour Wisp' },
      { family: 'lamp-moth', level: 1, variant: 'wickhollow', name: 'Lamp-Moth' },
      { family: 'marsh-light', level: 1, name: 'Sour Wisp' },
    ],
    party: ['witch', 'inkblot'],
    bag: { 'heartsease-tonic': 2, moonwater: 1 },
    flags: { required: false, skip: 'wisp-calm' },
    teaches: 'Radiant on Radiant is x0.5, so Witchfire, not Moonlight; Inkblot\'s Pinch takes a flame; Wisp-Calm ends a fight.',
  },
  B3: {
    id: 'B3', name: 'The Gloamwing', where: 'the Hollow',
    backdrop: 'graveyard-night',
    foes: [{ family: 'gloamwing', level: 2, variant: 'moonlight', name: 'The Gloamwing' }],
    party: ['witch', 'inkblot'],
    bag: { 'heartsease-tonic': 2, moonwater: 1 },
    flags: { required: true, noFlee: true, boss: true },
    teaches: 'Grip & Claim on the Dawnbell, a Stagger (Pinch) cancelling a charge, Witchfire against a boss weak to Ember, the gold card.',
  },
  B4: {
    id: 'B4', name: 'The Murkway', where: 'the Murkway, a plank path over black pools',
    backdrop: 'battle-open-fen', stopgap: 'graveyard-night',
    foes: [
      { family: 'mire-leech', level: 2, omens: ['hollowed'], name: 'Hollowed Mire Leech' },
      { family: 'boglurcher', level: 4, omens: ['hollowed'], name: 'Hollowed Boglurcher' },
      { family: 'mire-leech', level: 2, omens: ['hollowed'], name: 'Hollowed Mire Leech' },
    ],
    party: ['witch', 'inkblot', 'nettie'],
    wears: { ...INKBLOT_FEATHER, ...NETTIE_SHAWL },
    bag: { 'heartsease-tonic': 1, 'remembrance-incense': 1, 'lantern-oil': 1 },
    flags: { required: false, firstStrike: 'can' },
    teaches: 'Nettie\'s first fight; Radiant against Blight, where the first hit wins: Moonlight on a foe\'s back in the field for a First Strike, then Moonlight before the rot lands.',
  },
  B5: {
    id: 'B5', name: 'The Long Boardwalk', where: 'the Long Boardwalk, on stilts in the mist',
    backdrop: 'battle-long-boardwalk',
    foes: [
      { family: 'drowned', level: 1, variant: 'choir', name: 'Drowned Chorister' },
      { family: 'willow-wight', level: 6, name: 'Willow-Wight' },
      { family: 'drowned', level: 1, variant: 'choir', name: 'Drowned Chorister' },
    ],
    party: ['witch', 'inkblot', 'nettie'],
    wears: { ...INKBLOT_FEATHER, ...NETTIE_SHAWL },
    bag: { 'heartsease-tonic': 1, 'remembrance-incense': 1, 'lantern-oil': 1 },
    flags: { required: true },
    teaches: 'Nettie\'s heals and Tide; Hexed and Rooted; Remembrance Incense.',
  },
  B6: {
    id: 'B6', name: 'The Lantern Mother', where: 'Mother\'s Hollow, the sunken house',
    backdrop: 'battle-mothers-hollow', stopgap: 'TH: battle-dark-cathedral.png',
    foes: [{ family: 'lantern-mother', level: 5, variant: 'moonlight', name: 'The Lantern Mother' }],
    party: ['witch', 'inkblot', 'nettie'],
    wears: { ...INKBLOT_FEATHER, ...NETTIE_SHAWL },
    bag: { 'heartsease-tonic': 1, 'lantern-oil': 1, moonwater: 1 },
    flags: { required: true, noFlee: true, boss: true, final: true },
    next: 'B6b',
    teaches: 'Two grip meters (Lantern and Veil); Tide (thrown moonwater, Nettie\'s jars) against her weakness; Lantern Oil against Lights Out.',
  },
  // The same fight, after the cut: "The lamps go out, all but hers, and the one at the skiff's bow." Silas steps out of
  // the bow-lamp's flame and fights as a guest (A's `allies`). nextForm() carries the party, the bag and the grips over.
  B6b: {
    id: 'B6b', name: 'Lights Out', where: 'Mother\'s Hollow, every lamp out but two',
    backdrop: 'battle-mothers-hollow-dark',
    foes: [{ family: 'lantern-mother', level: 5, variant: 'lights-out', name: 'The Lantern Mother' }],
    allies: [{ family: 'silas', level: 4, name: 'Silas' }],
    party: ['witch', 'inkblot', 'nettie'],
    wears: { ...INKBLOT_FEATHER, ...NETTIE_SHAWL },
    bag: {},
    flags: { required: true, noFlee: true, boss: true, final: true, form: 2 },
    teaches: 'Silas lights the lamps; Lantern Oil against Snuff.',
  },
};

export const ORDER = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

// ---- the level curve ---------------------------------------------------------------------------------------------------
// Every hero in the party gets each won fight's full XP (Aethermoor's rules/gauntlet.js awardXp), and XP to the next
// level is 30 x L^1.55 (L2 at 30, L3 at 118, L4 at 283, L5 at 540). A fight's XP is its foes' (TUNING.xp.tier x level,
// +20% an Omen; summoned moths give none). Story floors: at a story beat every hero's XP is raised to at least a floor,
// so a player who skips the optional fights (B2, B4) is never walled, and one who fights them is a little ahead.
// Inkblot joins in the square (before B1) and Nettie at her hut (before B4), each with the witch's XP.
export const STORY_FLOORS = {
  B2: { xp: xpForLevel(2), why: 'Silas relit at the wayside kettle, and the way to the Hollow opens: level 2.' },
  B4: { xp: xpForLevel(3), why: 'Nettie\'s hut: the middle turn, an hour\'s sleep, and Nettie joins. Level 3.' },
};

export function fightXp(id) {
  const e = ENCOUNTERS[id];
  return e.foes.reduce((a, f, i) => a + buildFoe(f, { id: `x${i}` }).xp, 0);
}

// The XP and level each fight is met at, on a path through the slice (a list of fight ids in order)
export function curveFor(path) {
  const out = {};
  let xp = 0;
  for (const id of ORDER) {
    for (const [at, f] of Object.entries(STORY_FLOORS)) if (at === id) xp = Math.max(xp, f.xp);
    const floorOnly = !path.includes(id);
    if (!floorOnly) out[id] = { xp, level: levelForXp(xp) };
    if (!floorOnly) xp += fightXp(id);
  }
  out.end = { xp, level: levelForXp(xp) };
  return out;
}

export const PATHS = {
  typical: ORDER,                 // every fight, about 35 minutes
  brisk: ['B1', 'B3', 'B5', 'B6'], // the required four (Wisp-Calm past B2, round B4), about 25 minutes
};

export const CURVE = { typical: curveFor(PATHS.typical), brisk: curveFor(PATHS.brisk) };
CURVE.typical.B6b = CURVE.typical.B6;
CURVE.brisk.B6b = CURVE.brisk.B6;

// ---- building the party ----------------------------------------------------------------------------------------------------

// A hero at `level` as Aethermoor's levelling makes one (rules/progression.js levelUp): the average hit-die roll each
// level, +1 to the pair of scores in `asi` every fourth level, skills by level. Starting gear comes from heroes.js;
// `relics` are equipped over it (in their own slots). Gear is rolled from a fixed seed, so it is the same every fight.
export function makeHero(id, { level = 1, relics = [], names = {} } = {}) {
  const data = HEROES[id];
  const rng = createRng(`gear:${id}`);
  const base = { ...data.base };
  for (let l = 4; l <= level; l += 4) for (const a of data.asi[(l / 4 - 1) % data.asi.length]) base[a] = Math.min(20, base[a] + 1);
  const hero = {
    id, name: data.name, level, xp: xpForLevel(level), hp: null, mp: null, surge: 0, base,
    gear: Object.fromEntries(SLOTS.map(s => [s, null])),
    skills: data.skills.filter(s => s.level <= level).map(s => s.id),
    domains: Object.fromEntries([data.domain, ...(data.secondary || [])].map((d, i) => [d, { level: i ? Math.ceil(level / 2) : level, path: null, opt7: null, opt13: null }])),
    hpRolls: [],
  };
  const inventory = [];
  const prov = { from: 'home', where: 'Wickhollow', day: 1 };
  for (const [slot, g] of Object.entries(data.gear)) {
    const item = generateItem(rng, { base: g.base, rarity: g.rarity, ilvl: level, provenance: prov });
    if (names[g.base]) item.name = names[g.base];
    inventory.push(item);
    hero.gear[slot] = item.uid;
  }
  for (const r of relics) {
    const item = relicItem(r, rng, prov);
    inventory.push(item);
    hero.gear[RELICS[r].slot] = item.uid;
  }
  const d = deriveHero(hero, inventory);
  return { hero: { ...hero, hp: d.maxHp, mp: d.maxMp }, inventory };
}

// party: [{ id, level, relics?, hp?, mp?, surge? }]
export function makeParty(party, { names } = {}) {
  const heroes = [], inventory = [];
  for (const p of party) {
    const made = makeHero(p.id, { level: p.level, relics: p.relics || [], names });
    const h = made.hero;
    heroes.push({ ...h, hp: p.hp ?? h.hp, mp: p.mp ?? h.mp, surge: p.surge ?? 0 });
    inventory.push(...made.inventory);
  }
  return { heroes, inventory };
}

// The party spec an encounter is met with: levels from the curve (path 'typical' or 'brisk', or a number to force one),
// relics from `wears` (opts.wears adds more, e.g. { witch: ['hag-stone'] }).
export function partyFor(id, { path = 'typical', level, wears = {} } = {}) {
  const e = ENCOUNTERS[id];
  const lv = level ?? CURVE[path][id]?.level ?? 1;
  return e.party.map(h => ({ id: h, level: lv, relics: [...(e.wears?.[h] || []), ...(wears[h] || [])] }));
}

// ---- starting a fight -------------------------------------------------------------------------------------------------------
// opts: seed, firstStrike (B4 after Moonlight on a foe's back), path/level/wears (partyFor), party (a ready spec, e.g.
// carried HP), bag (overrides the encounter's), names (renames starting gear).
export function startEncounter(id, opts = {}) {
  const e = ENCOUNTERS[id];
  if (!e) throw new Error(`Unknown encounter ${id}`);
  const spec = opts.party || partyFor(id, opts);
  const { heroes, inventory } = makeParty(spec, { names: opts.names });
  const foes = e.foes.map(f => ({ ...f, omens: [...(f.omens || [])] }));
  return createBattle({
    heroes, foes, allies: e.allies || [], seed: opts.seed ?? 1,
    ctx: {
      inventory, bag: { ...(opts.bag || e.bag) },
      noFlee: !!e.flags.noFlee, firstStrike: !!opts.firstStrike,
      gentle: true, // nothing shatters (LORE §3): a holder brought round keeps, or lets go of, what it holds
      backdrop: e.backdrop, where: e.where, nodeId: e.id,
    },
  });
}

// After the first form of B6 is won: the second form, with each hero's HP, MP and Full Moon as they stood (a fallen
// hero gets up with 1 HP, as the lamps go out), the bag as it was, and the Lantern and Veil as far pried as they were.
export function nextForm(state, opts = {}) {
  const next = ENCOUNTERS[ENCOUNTERS[state.ctx.nodeId]?.next];
  if (!next || state.ended?.result !== 'victory') return null;
  const heroes = Object.values(state.units).filter(u => u.side === 'hero');
  const spec = partyFor(next.id, opts).map(p => {
    const u = heroes.find(h => h.heroId === p.id);
    return u ? { ...p, hp: Math.max(1, u.hp), mp: u.mp, surge: u.surge } : p;
  });
  const boss = Object.values(state.units).find(u => u.side === 'foe' && !u.summonedBy && u.held?.length);
  const s = startEncounter(next.id, { ...opts, party: spec, bag: state.bag });
  if (boss) {
    const f = Object.values(s.units).find(u => u.side === 'foe' && u.family === boss.family);
    for (const p of f.held) {
      const was = boss.held.find(q => q.relic === p.relic);
      if (was) { p.held = was.held; p.grip = Math.min(p.max, Math.round(p.max * was.grip / was.max)); p.by = was.by || null; }
    }
  }
  return s;
}
