// progress.js: the Captain's progress, all as plain numbers (no drawing here), so it can be tested and tuned.
//   Ships: the Captain starts in the Skiff and buys the others with shards.
//   Parts: ten of them, each in three marks. Every part gains something and costs something in flight. A ship has
//     one part slot (Skiff) up to four (Frigate). A part bought is the Captain's on every ship; each ship has its own slots.
//   Tuning: the crystal power shared between sails, guns and lift. Free to change.
//   Renown: kills and waves raise the Captain's level; each level is a skill point for the Helm, Gunnery or Crew,
//     whose ranks make the ship better and unlock the three abilities (Crystal Surge, Double Shot, Damage Control).
//   Voyages: the levels. Each is a run of waves ending with a named raider captain; each voyage is harder than the last.
//   Shards: paid by ship class, in full for a hull kill and half for a crystal kill. They go in the hold, which is
//     banked in port; flying on after a wave raises the hold's bonus, and going down loses what's in it.
// The numbers and the reasons for them are in docs/balance.md.

export const SHIP_ORDER = ['skiff', 'cutter', 'brig', 'frigate'];
export const SHIP_PRICE = { skiff: 0, cutter: 300, brig: 900, frigate: 2200 };
export const SLOTS = { skiff: 1, cutter: 2, brig: 3, frigate: 4 };

// How much a part's gain and its cost grow with its mark (Mk I, II, III)
const GAIN = [0, 1, 1.5, 2], COST = [0, 1, 1.15, 1.3];

// Each part: what it gains (+) and costs (−) at Mk I, as multipliers on the ship's numbers (see `effects`).
// `look` is the fitting the ship's model shows; `group` parts can't be fitted together (two kinds of canvas).
export const PARTS = [
  { id: 'armour', name: 'Armour plate', gain: 'More hull', cost: 'Slower, climbs worse', price: [150, 350, 700], look: 'armour',
    plus: { hull: 0.25 }, minus: { speed: -0.06, climb: -0.12 } },
  { id: 'racing', name: 'Racing canvas', gain: 'More speed', cost: 'Weaker sails', price: [120, 300, 600], look: 'racing', group: 'canvas',
    plus: { speed: 0.1 }, minus: { sails: -0.25 } },
  { id: 'storm', name: 'Storm canvas', gain: 'Tougher sails', cost: 'Slower', price: [100, 260, 520], look: 'storm', group: 'canvas',
    plus: { sails: 0.4 }, minus: { speed: -0.05 } },
  { id: 'longFocus', name: 'Long-focus guns', gain: 'More range', cost: 'Less damage', price: [140, 340, 680], look: 'longFocus',
    plus: { range: 0.25 }, minus: { damage: -0.12 } },
  { id: 'highAngle', name: 'High-angle mounts', gain: 'Guns tilt further', cost: 'Slower reload', price: [110, 280, 560], look: 'highAngle',
    plus: { pitch: 0.6 }, minus: { reload: 0.12 } },
  { id: 'heavyShot', name: 'Heavy shot', gain: 'More damage', cost: 'Less range', price: [160, 380, 760], look: 'heavyShot',
    plus: { damage: 0.2 }, minus: { range: -0.12 } },
  { id: 'loaders', name: 'Rapid loaders', gain: 'Faster reload', cost: 'Guns swing less', price: [150, 360, 720], look: null,
    plus: { reload: -0.15 }, minus: { swing: -0.2 } },
  { id: 'cage', name: 'Crystal cage', gain: 'Tougher crystals', cost: 'Less power to share', price: [130, 320, 640], look: 'cage',
    plus: { crystals: 0.5 }, minus: { power: -0.15 } },
  { id: 'vents', name: 'Overcharged vents', gain: 'Climbs faster', cost: 'Weaker crystals', price: [100, 260, 520], look: 'vents',
    plus: { climb: 0.25 }, minus: { crystals: -0.15 } },
  { id: 'fins', name: 'Trim fins', gain: 'Turns tighter', cost: 'Slower', price: [100, 260, 520], look: null,
    plus: { turn: 0.15 }, minus: { speed: -0.04 } },
];
export const partById = (id) => PARTS.find((p) => p.id === id);

// The Captain's skills: three lines of six ranks. Each rank adds a little; rank 2 unlocks the line's ability, rank 4
// makes it stronger and rank 6 makes it come back sooner.
export const SKILLS = [
  { id: 'helm', name: 'Helm', per: { turn: 0.04, speed: 0.02 }, about: 'Turning and speed',
    ability: { id: 'surge', name: 'Crystal Surge', key: 'z', about: 'A burst of speed and turning', cooldown: 35, time: [6, 9], cut: 10 } },
  { id: 'gunnery', name: 'Gunnery', per: { reload: -0.05, damage: 0.03 }, about: 'Reload and damage',
    ability: { id: 'double', name: 'Double Shot', key: 'x', about: 'The guns reload twice as fast', cooldown: 45, time: [8, 8], cut: 10 } },
  { id: 'crew', name: 'Crew', per: { hull: 0.05, repair: 0.2 }, about: 'Hull and repairs',
    ability: { id: 'control', name: 'Damage Control', key: 'v', about: 'Patches up the ship in a hurry', cooldown: 60, time: [6, 6], cut: 15 } },
];
export const MAX_RANK = 6;

// Renown needed to go from level n to n + 1, and the highest level
export const levelCost = (n) => 50 + 40 * (n - 1);
export const MAX_LEVEL = 19;
export function levelOf(renown) {
  let n = 1, need = levelCost(1);
  while (n < MAX_LEVEL && renown >= need) { renown -= need; n++; need = levelCost(n); }
  return { level: n, into: renown, need: n < MAX_LEVEL ? need : 0 };
}

// What a raider pays when it goes down, and how much renown it brings
export const BOUNTY = { skiff: 15, cutter: 30, brig: 60, frigate: 110 };
export const RENOWN = { skiff: 10, cutter: 20, brig: 40, frigate: 75 };
export const THREAT = { skiff: 1, cutter: 2, brig: 4, frigate: 7 };

// The three difficulty settings: the raiders' sailing pace, how slowly they reload, how far off they aim (per metre),
// what shards pay, and how much of the hold survives going down
export const DIFFICULTY = {
  fair: { name: 'Fair Winds', pace: 0.88, slow: 1.75, aim: 0.026, pay: 1, keep: 0.5 },
  rough: { name: 'Rough Air', pace: 0.92, slow: 1.5, aim: 0.02, pay: 1.25, keep: 0 },
  black: { name: 'Black Sky', pace: 0.97, slow: 1.25, aim: 0.014, pay: 1.6, keep: 0 },
};

// Voyages: v = 1, 2, 3, ... Each has more waves than the last, and its raiders are tougher, hit harder and shoot better
export const wavesIn = (v) => Math.min(10, 4 + v);
export function raiderLevel(v) {
  const k = v - 1;
  return { health: 1 + 0.18 * k, damage: 1 + 0.1 * k, slow: Math.max(0.7, 1 - 0.06 * k), aim: Math.max(0.4, 1 - 0.08 * k) };
}
// Which classes a voyage's raiders sail: Brigs from the second voyage, Frigates from the third
const POOLS = [['skiff', 'cutter'], ['skiff', 'cutter', 'brig'], ['skiff', 'cutter', 'brig', 'frigate']];
const poolFor = (v) => POOLS[Math.min(POOLS.length - 1, v - 1)];
// A wave's strength, in threat points (a Skiff is 1, a Frigate 7)
export const budget = (v, w) => Math.round((2 + 1.2 * w) * (1 + 0.45 * (v - 1)));

// A small deterministic random, so a voyage's waves are the same each time it's sailed
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// The raiders of wave w (1..) of voyage v: one or two groups (the second comes in as reinforcements once the first
// is mostly down). The last wave of a voyage brings a raider captain: one class up from the voyage's biggest, fitted
// out with parts, with an escort.
export function waveOf(v, w) {
  const R = rng(v * 7919 + w * 104729), pool = poolFor(v), boss = w === wavesIn(v);
  let left = budget(v, w);
  const pick = () => {
    const can = pool.filter((id) => THREAT[id] <= left);
    if (!can.length) return null;
    // bigger ships are likelier as the budget grows
    const weights = can.map((id) => THREAT[id] * 0.6 + 1);
    let x = R() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < can.length; i++) { x -= weights[i]; if (x <= 0) return can[i]; }
    return can.at(-1);
  };
  const ships = [];
  let captain = null;
  if (boss) {
    const top = pool.at(-1), up = SHIP_ORDER[Math.min(SHIP_ORDER.length - 1, SHIP_ORDER.indexOf(top) + 1)];
    captain = { id: up, name: CAPTAINS[(v - 1) % CAPTAINS.length], fits: BOSS_FITS[(v - 1) % BOSS_FITS.length], health: 2 };
    left = Math.max(0, left - THREAT[up] * 2);
  }
  while (left > 0 && ships.length < 7) { const id = pick(); if (!id) break; ships.push(id); left -= THREAT[id]; }
  // one group up to 4 ships; more than that and the rest come as reinforcements
  const first = ships.slice(0, 4), second = ships.slice(4);
  return { v, w, boss, captain, groups: second.length ? [first, second] : [first] };
}
export const CAPTAINS = ['Captain Rook', 'Black Meg', 'Old Sallow', 'the Widow Crane', 'Captain Harrow', 'Iron Tam', 'the Sky Duke'];
const BOSS_FITS = [['armour', 'heavyShot'], ['storm', 'cage'], ['armour', 'longFocus'], ['racing', 'loaders'], ['cage', 'heavyShot', 'armour']];

// ---------- the Captain ----------
export function newCaptain(difficulty = 'rough') {
  return {
    version: 1, difficulty,
    shards: 0, hold: 0, streak: 0, renown: 0,
    ships: ['skiff'], ship: 'skiff',
    parts: {}, // part id -> mark (1..3)
    fitted: { skiff: [], cutter: [], brig: [], frigate: [] }, // ship -> part ids in its slots
    power: { sails: 1 / 3, guns: 1 / 3, lift: 1 / 3 },
    ranks: { helm: 0, gunnery: 0, crew: 0 },
    voyage: 1, wave: 1, best: 0, // the voyage under way, the next wave in it, the highest voyage finished
  };
}
// Everything unlocked, for free flight
export function freeCaptain() {
  const c = newCaptain('rough');
  c.ships = [...SHIP_ORDER]; c.ship = 'frigate'; c.free = true;
  for (const p of PARTS) c.parts[p.id] = 3;
  c.ranks = { helm: MAX_RANK, gunnery: MAX_RANK, crew: MAX_RANK }; c.renown = 1e9;
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
export function buyPart(c, id) {
  const P = partById(id), m = nextMark(c, id);
  if (m > 3) return 'Already at its best';
  const price = P.price[m - 1];
  if (c.shards < price) return `Mk ${'I'.repeat(m)} costs ${price} shards`;
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
  const base = BOUNTY[cls] * (1 + 0.2 * (v - 1)) * D.pay * (how === 'crystals' ? 0.5 : 1) * (captain ? 3 : 1);
  return Math.round(base);
}
export const holdBonus = (c) => Math.min(1.5, 1 + 0.1 * c.streak);
export function renownFor(c, cls, captain = false) { return Math.round(RENOWN[cls] * (1 + 0.25 * (c.voyage - 1)) * (captain ? 3 : 1)); }
export const waveRenown = (c) => 15 * c.voyage;

// A wave beaten (not the last): the next one is the one to sail. Then the Captain flies on (the hold's bonus grows,
// the damage stays) or puts in to port (the hold is banked)
export function waveBeaten(c) { c.wave++; }
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
  c.best = Math.max(c.best, c.voyage); c.voyage++; c.wave = 1;
  return paid;
}
// Going down: the hold is lost (on Fair Winds, half is kept and banked), and the wave is sailed again
export function wentDown(c) {
  const kept = Math.round(c.hold * DIFFICULTY[c.difficulty].keep);
  c.shards += kept; const lost = c.hold - kept;
  c.hold = 0; c.streak = 0;
  return { kept, lost };
}

// ---------- saving ----------
const KEY = 'sunstone-skies:captain:1';
export function save(c) { if (c.free) return; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage: progress lasts this visit */ } }
export function load() {
  try { const c = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return c?.version === 1 ? c : null; } catch { return null; }
}
export function forget() { try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ } }
