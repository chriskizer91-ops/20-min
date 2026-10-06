// progress.js: the Captain's progress, all as plain numbers (no drawing here), so it can be tested and tuned.
//   Ships: the Captain starts in the Skiff and buys the others with shards, up to the Galleon and the Man-o'-war.
//   Parts: ten of them, each in five marks (Mk IV from the fifth voyage, Mk V from the seventh). Every part gains
//     something and costs something in flight. A ship has one part slot (Skiff) up to six (Man-o'-war). A part bought
//     is the Captain's on every ship; each ship has its own slots.
//   Tuning: the crystal power shared between sails, guns and lift. Free to change.
//   Renown: kills and waves raise the Captain's level; each level is a skill point for the Helm, Gunnery, Crew or
//     Crystals, whose ranks make the ship better and unlock the four abilities (Crystal Surge, Double Shot, Damage
//     Control, Sunstone Ward).
//   Voyages: the levels. Each is a run of waves ending with a named raider captain; each voyage is harder than the last.
//   Shards: paid by ship class, in full for a hull kill and half for a crystal kill. They go in the hold, which is
//     banked in port; flying on after a wave raises the hold's bonus, and going down loses what's in it. A wave the
//     Captain went down in comes back weaker (the raiders lost ships too), so no wave is a wall.
// The numbers and the reasons for them are in docs/balance.md.

export const SHIP_ORDER = ['skiff', 'cutter', 'brig', 'frigate', 'galleon', 'manowar'];
export const SHIP_PRICE = { skiff: 0, cutter: 250, brig: 700, frigate: 2000, galleon: 5000, manowar: 9000 };
export const SLOTS = { skiff: 1, cutter: 2, brig: 3, frigate: 4, galleon: 5, manowar: 6 };

// How much a part's gain and its cost grow with its mark (Mk I to V), and the voyage each mark can be bought from
export const GAIN = [0, 1, 1.5, 2, 2.4, 2.8], COST = [0, 1, 1.15, 1.3, 1.4, 1.5];
export const MARK_FROM = [0, 1, 1, 1, 5, 7];
export const MAX_MARK = 5;
export const MARKS = ['', 'Mk I', 'Mk II', 'Mk III', 'Mk IV', 'Mk V'];

// Each part: what it gains (+) and costs (−) at Mk I, as multipliers on the ship's numbers (see `effects`).
// `look` is the fitting the ship's model shows; `group` parts can't be fitted together (two kinds of canvas).
export const PARTS = [
  { id: 'armour', name: 'Armour plate', gain: 'More hull', cost: 'Slower, climbs worse', price: [150, 350, 700, 1300, 2200], look: 'armour',
    plus: { hull: 0.25 }, minus: { speed: -0.06, climb: -0.12 } },
  { id: 'racing', name: 'Racing canvas', gain: 'More speed', cost: 'Weaker sails', price: [120, 300, 600, 1100, 1900], look: 'racing', group: 'canvas',
    plus: { speed: 0.1 }, minus: { sails: -0.25 } },
  { id: 'storm', name: 'Storm canvas', gain: 'Tougher sails', cost: 'Slower', price: [100, 260, 520, 1000, 1700], look: 'storm', group: 'canvas',
    plus: { sails: 0.4 }, minus: { speed: -0.05 } },
  { id: 'longFocus', name: 'Long-focus guns', gain: 'More range', cost: 'Less damage', price: [140, 340, 680, 1250, 2100], look: 'longFocus',
    plus: { range: 0.25 }, minus: { damage: -0.12 } },
  { id: 'highAngle', name: 'High-angle mounts', gain: 'Guns tilt further', cost: 'Slower reload', price: [110, 280, 560, 1050, 1800], look: 'highAngle',
    plus: { pitch: 0.6 }, minus: { reload: 0.12 } },
  { id: 'heavyShot', name: 'Heavy shot', gain: 'More damage', cost: 'Less range', price: [160, 380, 760, 1400, 2400], look: 'heavyShot',
    plus: { damage: 0.2 }, minus: { range: -0.12 } },
  { id: 'loaders', name: 'Rapid loaders', gain: 'Faster reload', cost: 'Guns swing less', price: [150, 360, 720, 1350, 2300], look: null,
    plus: { reload: -0.15 }, minus: { swing: -0.2 } },
  { id: 'cage', name: 'Crystal cage', gain: 'Tougher crystals', cost: 'Less power to share', price: [130, 320, 640, 1200, 2000], look: 'cage',
    plus: { crystals: 0.5 }, minus: { power: -0.15 } },
  { id: 'vents', name: 'Overcharged vents', gain: 'Climbs faster', cost: 'Weaker crystals', price: [100, 260, 520, 1000, 1700], look: 'vents',
    plus: { climb: 0.25 }, minus: { crystals: -0.15 } },
  { id: 'fins', name: 'Trim fins', gain: 'Turns tighter', cost: 'Slower', price: [100, 260, 520, 1000, 1700], look: null,
    plus: { turn: 0.15 }, minus: { speed: -0.04 } },
];
export const partById = (id) => PARTS.find((p) => p.id === id);

// The Captain's skills: four lines of six ranks. Each rank adds a little; rank 2 unlocks the line's ability, rank 4
// makes it stronger and rank 6 makes it come back sooner.
export const SKILLS = [
  { id: 'helm', name: 'Helm', per: { turn: 0.04, speed: 0.02 }, about: 'Turning and speed',
    ability: { id: 'surge', name: 'Crystal Surge', key: 'z', about: 'A burst of speed and turning', cooldown: 35, time: [6, 9], cut: 10 } },
  { id: 'gunnery', name: 'Gunnery', per: { reload: -0.05, damage: 0.03 }, about: 'Reload and damage',
    ability: { id: 'double', name: 'Double Shot', key: 'x', about: 'The guns reload twice as fast', cooldown: 45, time: [8, 8], cut: 10 } },
  { id: 'crew', name: 'Crew', per: { hull: 0.05, repair: 0.2 }, about: 'Hull and repairs',
    ability: { id: 'control', name: 'Damage Control', key: 'v', about: 'Patches up the ship in a hurry', cooldown: 60, time: [6, 6], cut: 15 } },
  { id: 'crystals', name: 'Crystals', per: { crystals: 0.05, power: 0.03 }, about: 'Crystals and power',
    ability: { id: 'ward', name: 'Sunstone Ward', key: 'b', about: 'A ward of crystal light: hits do half damage', cooldown: 50, time: [5, 7], cut: 12 } },
];
export const MAX_RANK = 6;

// Renown needed to go from level n to n + 1, and the highest level (enough for every skill at the top rank)
export const levelCost = (n) => 50 + 90 * (n - 1);
export const MAX_LEVEL = 25;
export function levelOf(renown) {
  let n = 1, need = levelCost(1);
  while (n < MAX_LEVEL && renown >= need) { renown -= need; n++; need = levelCost(n); }
  return { level: n, into: renown, need: n < MAX_LEVEL ? need : 0 };
}

// What a raider pays when it goes down, and how much renown it brings
export const BOUNTY = { skiff: 15, cutter: 30, brig: 60, frigate: 110, galleon: 160, manowar: 240 };
export const RENOWN = { skiff: 10, cutter: 20, brig: 40, frigate: 75, galleon: 110, manowar: 170 };
export const THREAT = { skiff: 1, cutter: 2, brig: 3, frigate: 4, galleon: 6, manowar: 8 };

// The three difficulty settings: the raiders' sailing pace, how slowly they reload, how far off they aim (per metre),
// what shards pay, and how much of the hold survives going down
export const DIFFICULTY = {
  fair: { name: 'Fair Winds', pace: 0.88, slow: 1.75, aim: 0.026, pay: 1, keep: 0.5 },
  rough: { name: 'Rough Air', pace: 0.92, slow: 1.5, aim: 0.02, pay: 1.25, keep: 0 },
  black: { name: 'Black Sky', pace: 0.97, slow: 1.3, aim: 0.016, pay: 1.4, keep: 0 },
};

// Voyages: v = 1, 2, 3, ... Each is a run of waves and then a raider captain. The table says, for each voyage:
//   waves  each wave's strength in threat points (THREAT: a Skiff is 1, a Frigate 4), or the raiders themselves
//   group  the most threat that comes in at once; the rest of a wave follows as reinforcements
//   pool   the classes its raiders sail
//   boss   the raider captain's class, and the threat of the escort that comes with them
// The strengths come from tools/sim-voyage.mjs (docs/balance.md): each voyage is sized for the ship and kit a
// Captain is likely to have by then. Past the last row the last voyage is sailed again, a tenth stronger each time.
export const VOYAGES = [
  { waves: [['skiff', 'skiff'], 2, 3, 3], group: 3, pool: ['skiff', 'cutter'], boss: { id: 'cutter', escort: 1 } },
  { waves: [3, 4, 4, 5, 6], group: 4, pool: ['skiff', 'cutter'], boss: { id: 'brig', escort: 1 } },
  { waves: [4, 5, 5, 6, 7, 8], group: 5, pool: ['skiff', 'cutter'], boss: { id: 'brig', escort: 3 } },
  { waves: [6, 7, 8, 9, 10, 11, 12], group: 6, pool: ['skiff', 'cutter', 'brig'], boss: { id: 'frigate', escort: 3 } },
  { waves: [8, 9, 10, 11, 12, 13, 14, 15], group: 8, pool: ['cutter', 'brig', 'frigate'], boss: { id: 'frigate', escort: 5 } },
  { waves: [10, 11, 12, 13, 14, 15, 16, 17, 18], group: 9, pool: ['cutter', 'brig', 'frigate'], boss: { id: 'frigate', escort: 7 } },
  { waves: [12, 13, 14, 15, 16, 17, 18, 19, 20], group: 10, pool: ['cutter', 'brig', 'frigate', 'galleon'], boss: { id: 'galleon', escort: 8 } },
  { waves: [13, 14, 15, 16, 17, 18, 19, 20, 21], group: 10, pool: ['brig', 'frigate', 'galleon'], boss: { id: 'manowar', escort: 8 } },
  { waves: [18, 19, 21, 22, 24, 25, 27, 28, 30], group: 15, pool: ['brig', 'frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 12 } },
  { waves: [20, 22, 23, 25, 27, 28, 30, 32, 34], group: 17, pool: ['frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 14 } },
];
const voyageOf = (v) => {
  const V = VOYAGES[Math.min(VOYAGES.length, v) - 1], more = 1 + 0.1 * Math.max(0, v - VOYAGES.length);
  return more === 1 ? V : { ...V, waves: V.waves.map((x) => (Array.isArray(x) ? x : Math.round(x * more))), group: Math.round(V.group * more), boss: { ...V.boss, escort: Math.round(V.boss.escort * more) } };
};
export const wavesIn = (v) => voyageOf(v).waves.length + 1;
// the classes a voyage's raiders sail, its captain's among them
export const classesOf = (v) => { const V = voyageOf(v); return [...new Set([...V.pool, V.boss.id, ...V.waves.filter(Array.isArray).flat()])]; };
// Each voyage its raiders are a little tougher, hit a little harder, reload a little faster and shoot a little straighter;
// from the eighth (when the Captain may sail a Man-o'-war) they toughen faster
export function raiderLevel(v) {
  const k = v - 1, late = Math.max(0, k - 6);
  return { health: 1 + 0.1 * k + 0.1 * late, damage: 1 + 0.06 * k + 0.04 * late, slow: Math.max(0.8, 1 - 0.04 * k), aim: Math.max(0.6, 1 - 0.06 * k) };
}

// A small deterministic random, so a voyage's waves are the same each time it's sailed
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// The raiders of wave w (1..) of voyage v, in groups: the first comes in at once, each of the others as reinforcements
// once the one before is mostly down. The last wave brings a raider captain, fitted out with parts, and an escort.
// tries: how many times the Captain has gone down in this wave; each time it comes back a little weaker
export const easing = (tries = 0) => Math.max(0.45, 1 - 0.15 * tries);
export function waveOf(v, w, tries = 0) {
  const V = voyageOf(v), R = rng(v * 7919 + w * 104729), boss = w === wavesIn(v), ease = easing(tries);
  const pick = (left) => {
    const can = V.pool.filter((id) => THREAT[id] <= left);
    if (!can.length) return null;
    // bigger ships are likelier as the strength grows
    const weights = can.map((id) => THREAT[id] * 0.6 + 1);
    let x = R() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < can.length; i++) { x -= weights[i]; if (x <= 0) return can[i]; }
    return can.at(-1);
  };
  if (!boss && Array.isArray(V.waves[w - 1])) { const fixed = V.waves[w - 1]; return { v, w, boss, captain: null, groups: [fixed.slice(0, Math.max(1, Math.round(fixed.length * ease)))] }; }
  let left = Math.round((boss ? V.boss.escort : Math.max(1, V.waves[w - 1])) * ease), captain = null;
  if (boss) {
    const n = v - 1, id = V.boss.id;
    captain = { id, name: CAPTAINS[n % CAPTAINS.length], fits: BOSS_FITS[n % BOSS_FITS.length].slice(0, SLOTS[id]), mark: Math.min(3, Math.ceil(v / 2)), health: 1.5 * Math.max(0.7, 1 - 0.1 * tries) };
  }
  // fill groups up to the voyage's group strength, at most four ships each (the captain comes on top of the first)
  const groups = [];
  let g = [], room = V.group;
  while (left > 0) {
    let id = g.length < 4 ? pick(Math.min(left, room)) : null;
    if (!id) { groups.push(g); g = []; room = V.group; id = pick(Math.min(left, room)); }
    if (!id) break;
    g.push(id); left -= THREAT[id]; room -= THREAT[id];
  }
  groups.push(g);
  return { v, w, boss, captain, groups: groups.filter((x, i) => x.length || (i === 0 && captain)) };
}
export const CAPTAINS = ['Captain Rook', 'Black Meg', 'Old Sallow', 'the Widow Crane', 'Captain Harrow', 'Iron Tam', 'the Sky Duke'];
const BOSS_FITS = [['heavyShot', 'armour'], ['storm', 'cage', 'heavyShot'], ['armour', 'longFocus', 'loaders'], ['racing', 'loaders', 'heavyShot', 'armour'], ['cage', 'heavyShot', 'armour', 'loaders']];

// ---------- the Captain ----------
export function newCaptain(difficulty = 'rough') {
  return {
    version: 1, difficulty,
    shards: 0, hold: 0, streak: 0, renown: 0,
    ships: ['skiff'], ship: 'skiff',
    parts: {}, // part id -> mark (1..3)
    fitted: Object.fromEntries(SHIP_ORDER.map((id) => [id, []])), // ship -> part ids in its slots
    power: { sails: 1 / 3, guns: 1 / 3, lift: 1 / 3 },
    ranks: { helm: 0, gunnery: 0, crew: 0, crystals: 0 },
    voyage: 1, wave: 1, best: 0, // the voyage under way, the next wave in it, the highest voyage finished
    tries: 0, // how many times the Captain has gone down in this wave
  };
}
// Everything unlocked, for free flight
export function freeCaptain() {
  const c = newCaptain('rough');
  c.ships = [...SHIP_ORDER]; c.ship = 'frigate'; c.free = true;
  for (const p of PARTS) c.parts[p.id] = MAX_MARK;
  c.ranks = Object.fromEntries(SKILLS.map((S) => [S.id, MAX_RANK])); c.renown = 1e9;
  return c;
}
export const skillPoints = (c) => levelOf(c.renown).level - 1 - Object.values(c.ranks).reduce((a, b) => a + b, 0);

// What the Captain can do with the garage; each returns an error in plain words, or null when done
export function buyShip(c, id) {
  if (c.ships.includes(id)) return null;
  if (c.shards < SHIP_PRICE[id]) return `The ${id} costs ${SHIP_PRICE[id]} shards`;
  c.shards -= SHIP_PRICE[id]; c.ships.push(id); return null;
}
export function chooseShip(c, id) { if (!c.ships.includes(id)) return 'Buy her first'; c.ship = id; return null; }
export const nextMark = (c, id) => (c.parts[id] ?? 0) + 1;
// whether the port's shipwrights sell this mark yet
export const markOpen = (c, m) => c.free || c.voyage >= MARK_FROM[m];
export function buyPart(c, id) {
  const P = partById(id), m = nextMark(c, id);
  if (m > MAX_MARK) return 'Already at its best';
  if (!markOpen(c, m)) return `${MARKS[m]} is sold from voyage ${MARK_FROM[m]}`;
  const price = P.price[m - 1];
  if (c.shards < price) return `${MARKS[m]} costs ${price} shards`;
  c.shards -= price; c.parts[id] = m; return null;
}
export function fitPart(c, id, on = true) {
  const list = c.fitted[c.ship];
  if (!on) { c.fitted[c.ship] = list.filter((x) => x !== id); return null; }
  if (!c.parts[id]) return 'Buy it first';
  if (list.includes(id)) return null;
  const P = partById(id);
  if (P.group && list.some((x) => partById(x).group === P.group)) return `She can only carry one kind of ${P.group}`;
  if (list.length >= SLOTS[c.ship]) return SLOTS[c.ship] === 1 ? 'Her one slot is full' : `All ${SLOTS[c.ship]} slots are full`;
  list.push(id); return null;
}
export function rankUp(c, skill) {
  if (skillPoints(c) <= 0) return 'No skill points: win renown to gain a level';
  if (c.ranks[skill] >= MAX_RANK) return 'Already at the top rank';
  c.ranks[skill]++; return null;
}
// Share the power: set one share and spread the rest over the other two in their old proportion
export function setPower(c, key, value) {
  const keys = ['sails', 'guns', 'lift'], v = Math.min(1, Math.max(0, value)), others = keys.filter((k) => k !== key);
  const rest = 1 - v, sum = others.reduce((a, k) => a + c.power[k], 0);
  c.power[key] = v;
  for (const k of others) c.power[k] = sum > 0 ? (c.power[k] / sum) * rest : rest / 2;
}

// The abilities the Captain has unlocked, with their numbers at the Captain's current ranks
export function abilities(c) {
  return SKILLS.filter((S) => c.ranks[S.id] >= 2).map((S) => {
    const r = c.ranks[S.id], A = S.ability;
    return { ...A, skill: S.id, time: A.time[r >= 4 ? 1 : 0], cooldown: A.cooldown - (r >= 6 ? A.cut : 0), strong: r >= 4 };
  });
}

// ---------- what it all does to a ship ----------
// Multipliers on the ship's numbers. hull/sails/crystals: full health. speed/turn/climb: flying. damage/reload/range/
// pitch/swing: the guns (reload is the time between volleys; range is the bolt's speed, so how far it flies).
// power: the crystal power there is to share. repair: how fast the crew patch her between waves.
export function effects(c, shipId = c.ship) {
  const e = { hull: 1, sails: 1, crystals: 1, speed: 1, turn: 1, climb: 1, damage: 1, reload: 1, range: 1, pitch: 1, swing: 1, power: 1, repair: 1 };
  const add = (k, x) => { e[k] *= 1 + x; };
  for (const id of c.fitted[shipId] ?? []) {
    const P = partById(id), m = c.parts[id] ?? 0;
    if (!m) continue;
    for (const [k, x] of Object.entries(P.plus)) add(k, x * GAIN[m]);
    for (const [k, x] of Object.entries(P.minus)) add(k, x * COST[m]);
  }
  for (const S of SKILLS) for (const [k, x] of Object.entries(S.per)) add(k, x * (c.ranks[S.id] ?? 0));
  // tuning: each share, as a share of the power there is, against an even three-way split
  const t = e.power, s = c.power.sails * t, g = c.power.guns * t, l = c.power.lift * t;
  e.speed *= 0.85 + 0.45 * s;
  e.reload /= 0.85 + 0.45 * g; e.damage *= 0.95 + 0.15 * g;
  e.climb *= 0.8 + 0.6 * l;
  return e;
}
// Which fittings the ship's model shows
export function looks(c, shipId = c.ship) {
  const out = {};
  for (const id of c.fitted[shipId] ?? []) { const L = partById(id).look; if (L && c.parts[id]) out[L] = true; }
  return out;
}

// ---------- shards and renown ----------
// What a raider going down pays into the hold: by class, voyage and difficulty; half for crystals, triple for a captain
export function bounty(c, cls, how, captain = false) {
  const D = DIFFICULTY[c.difficulty], v = c.voyage;
  const base = BOUNTY[cls] * (1 + 0.1 * (v - 1)) * D.pay * (how === 'crystals' ? 0.5 : 1) * (captain ? 3 : 1);
  return Math.round(base);
}
export const holdBonus = (c) => Math.min(1.5, 1 + 0.1 * c.streak);
export function renownFor(c, cls, captain = false) { return Math.round(RENOWN[cls] * (1 + 0.1 * (c.voyage - 1)) * (captain ? 3 : 1)); }
export const waveRenown = (c) => 10 + 5 * c.voyage;

// A wave beaten (not the last): the next one is the one to sail. Then the Captain flies on (the hold's bonus grows,
// the damage stays) or puts in to port (the hold is banked)
export function waveBeaten(c) { c.wave++; c.tries = 0; }
export function flyOn(c) { c.streak++; }
export function bank(c) {
  const paid = Math.round(c.hold * holdBonus(c));
  c.shards += paid; c.hold = 0; c.streak = 0;
  return paid;
}
// The last wave beaten: the voyage is done, the hold banked with a quarter more, and the next voyage waits
export function voyageDone(c) {
  c.hold = Math.round(c.hold * 1.25);
  const paid = bank(c);
  c.best = Math.max(c.best, c.voyage); c.voyage++; c.wave = 1; c.tries = 0;
  return paid;
}
// Going down: the hold is lost (on Fair Winds, half is kept and banked), and the wave is sailed again, a little weaker
export function wentDown(c) {
  const kept = Math.round(c.hold * DIFFICULTY[c.difficulty].keep);
  c.shards += kept; const lost = c.hold - kept;
  c.hold = 0; c.streak = 0; c.tries = (c.tries ?? 0) + 1;
  return { kept, lost };
}

// ---------- saving ----------
const KEY = 'sunstone-skies:captain:1';
export function save(c) { if (c.free) return; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage: progress lasts this visit */ } }
export function load() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (c?.version !== 1) return null;
    const n = newCaptain(c.difficulty);
    return { ...n, ...c, ranks: { ...n.ranks, ...c.ranks }, fitted: { ...n.fitted, ...c.fitted } }; // a save from before a new skill or ship
  } catch { return null; }
}
export function forget() { try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ } }
