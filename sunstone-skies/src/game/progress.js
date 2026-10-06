// progress.js: the Captain's progress, all as plain numbers (no drawing here), so it can be tested and tuned.
//   Ships: the Captain starts in the Skiff and buys the others with shards, up to the Galleon and the Man-o'-war.
//   Parts: ten of them, each in five marks (Mk IV once a danger 4 voyage is beaten, Mk V after danger 6). Every part
//     gains something and costs something in flight. A ship has one part slot (Skiff) up to six (Man-o'-war). A part bought
//     is the Captain's on every ship; each ship has its own slots.
//   Tuning: the crystal power shared between sails, guns and lift. Free to change.
//   Renown: kills and waves raise the Captain's level; each level is a skill point for the Helm, Gunnery, Crew or
//     Crystals, whose ranks make the ship better and unlock the four abilities (Crystal Surge, Double Shot, Damage
//     Control, Sunstone Ward).
//   Charts: three of them, Fair Winds, Rough Air and Black Sky, each ten voyages (and more) long. One Captain sails them
//     all, with one fleet and one purse: shards won on an easier chart buy the upgrades a harder one needs. Each
//     voyage has a danger number (its voyage number, plus 2 on Rough Air and 5 on Black Sky); the danger sets its
//     raiders, and how much they pay. Rough Air opens after two Fair Winds voyages, Black Sky after three on Rough Air.
//   Voyages: runs of waves, each ending with a named raider captain.
//   Strength: how ready the Captain's ship is, on the same scale as danger.
//   Shards: paid by ship class and danger, in full for a hull kill and half for a crystal kill. They go in the hold,
//     which is banked in port; flying on after a wave raises the hold's bonus, and going down loses what's in it. On
//     Fair Winds and Rough Air a wave the Captain went down in comes back weaker (the raiders lost ships too); Black Sky
//     shows no mercy.
// The numbers and the reasons for them are in docs/balance.md.

export const SHIP_ORDER = ['skiff', 'cutter', 'brig', 'frigate', 'galleon', 'manowar'];
export const SHIP_PRICE = { skiff: 0, cutter: 250, brig: 700, frigate: 2500, galleon: 8000, manowar: 15000 };
export const SLOTS = { skiff: 1, cutter: 2, brig: 3, frigate: 4, galleon: 5, manowar: 6 };

// How much a part's gain and its cost grow with its mark (Mk I to V), and the danger of the voyage the Captain must
// have beaten (on any chart) before the port's shipwrights sell that mark
export const GAIN = [0, 1, 1.5, 2, 2.4, 2.8], COST = [0, 1, 1.15, 1.3, 1.4, 1.5];
export const MARK_FROM = [0, 0, 0, 0, 4, 6];
export const MAX_MARK = 5;
export const MARKS = ['', 'Mk I', 'Mk II', 'Mk III', 'Mk IV', 'Mk V'];

// Each part: what it gains (+) and costs (−) at Mk I, as multipliers on the ship's numbers (see `effects`).
// `look` is the fitting the ship's model shows; `group` parts can't be fitted together (two kinds of canvas).
export const PARTS = [
  { id: 'armour', name: 'Armour plate', gain: 'More hull', cost: 'Slower, climbs worse', price: [150, 350, 700, 2100, 3500], look: 'armour',
    plus: { hull: 0.25 }, minus: { speed: -0.06, climb: -0.12 } },
  { id: 'racing', name: 'Racing canvas', gain: 'More speed', cost: 'Weaker sails', price: [120, 300, 600, 1750, 3050], look: 'racing', group: 'canvas',
    plus: { speed: 0.1 }, minus: { sails: -0.25 } },
  { id: 'storm', name: 'Storm canvas', gain: 'Tougher sails', cost: 'Slower', price: [100, 260, 520, 1600, 2700], look: 'storm', group: 'canvas',
    plus: { sails: 0.4 }, minus: { speed: -0.05 } },
  { id: 'longFocus', name: 'Long-focus guns', gain: 'More range', cost: 'Less damage', price: [140, 340, 680, 2000, 3350], look: 'longFocus',
    plus: { range: 0.25 }, minus: { damage: -0.12 } },
  { id: 'highAngle', name: 'High-angle mounts', gain: 'Guns tilt further', cost: 'Slower reload', price: [110, 280, 560, 1700, 2900], look: 'highAngle',
    plus: { pitch: 0.6 }, minus: { reload: 0.12 } },
  { id: 'heavyShot', name: 'Heavy shot', gain: 'More damage', cost: 'Less range', price: [160, 380, 760, 2250, 3850], look: 'heavyShot',
    plus: { damage: 0.2 }, minus: { range: -0.12 } },
  { id: 'loaders', name: 'Rapid loaders', gain: 'Faster reload', cost: 'Guns swing less', price: [150, 360, 720, 2150, 3700], look: null,
    plus: { reload: -0.15 }, minus: { swing: -0.2 } },
  { id: 'cage', name: 'Crystal cage', gain: 'Tougher crystals', cost: 'Less power to share', price: [130, 320, 640, 1900, 3200], look: 'cage',
    plus: { crystals: 0.5 }, minus: { power: -0.15 } },
  { id: 'vents', name: 'Overcharged vents', gain: 'Climbs faster', cost: 'Weaker crystals', price: [100, 260, 520, 1600, 2700], look: 'vents',
    plus: { climb: 0.25 }, minus: { crystals: -0.15 } },
  { id: 'fins', name: 'Trim fins', gain: 'Turns tighter', cost: 'Slower', price: [100, 260, 520, 1600, 2700], look: null,
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
export const levelCost = (n) => 50 + 120 * (n - 1);
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

// The three charts. Each has its own raiders (their sailing pace, how slowly they reload, how far off they aim, per
// metre), its own pay, how much of the hold survives going down, whether a lost wave comes back weaker (mercy), and
// how much harder its voyages are than their number (offset: a chart's voyage v has danger v + offset). power: how
// much stronger its raiders are than Rough Air's at the same danger, on the strength scale's power (Fair Winds'
// are sloppy shots, Black Sky's sharp; measured, docs/balance.md). opens: the voyages on another chart to finish first.
export const CHART_ORDER = ['fair', 'rough', 'black'];
export const CHARTS = {
  fair: { name: 'Fair Winds', offset: 0, pace: 0.88, slow: 1.75, aim: 0.026, pay: 1.2, keep: 0.5, mercy: true, power: -0.6,
    about: 'Sloppy raiders. Going down keeps half the hold, and a wave you lose comes back weaker.' },
  rough: { name: 'Rough Air', offset: 2, pace: 0.92, slow: 1.5, aim: 0.02, pay: 1.3, keep: 0, mercy: true, power: 0, opens: { chart: 'fair', after: 2 },
    about: 'Raiders as they\'re meant to be, and better pay. Going down loses the hold; a wave you lose comes back weaker.' },
  black: { name: 'Black Sky', offset: 5, pace: 0.97, slow: 1.3, aim: 0.016, pay: 1.4, keep: 0, mercy: false, power: 0.5, opens: { chart: 'rough', after: 3 },
    about: 'Fast, sharp-eyed raiders and the best pay, but no mercy: going down loses the hold, and a wave you lose comes back just as strong.' },
};
export const dangerOf = (chart, voyage) => voyage + CHARTS[chart].offset;
// the voyage under way on a chart ({ voyage, wave, tries }), how many voyages are done on it, and whether it's open
export const on = (c, chart = c.chart) => c.charts[chart];
export const doneOn = (c, chart) => on(c, chart).voyage - 1;
export function chartOpen(c, chart) { const O = CHARTS[chart].opens; return !!c.free || !O || doneOn(c, O.chart) >= O.after; }
// the danger of the voyage under way on the chart being sailed
export const danger = (c) => dangerOf(c.chart, on(c).voyage);

// Voyages: each is a run of waves and then a raider captain. How many waves follows the voyage's number on its chart
// (five on the first voyage, one more each voyage, up to ten); how strong they are follows its danger. For each
// danger the table says:
//   from, to  the strength of its first and last waves before the captain's, in threat points (THREAT: a Skiff is 1,
//             a Frigate 4); the waves between climb evenly
//   group     the most threat that comes in at once; the rest of a wave follows as reinforcements
//   pool      the classes its raiders sail
//   boss      the raider captain's class, and the threat of the escort that comes with them
//   first     (danger 1 only) the very first wave of all, two Skiffs
// The numbers come from tools/sim-voyage.mjs (docs/balance.md). Past the last row the last is sailed again, a tenth
// stronger for each danger more.
export const DANGERS = [
  { from: 2, to: 3, group: 3, pool: ['skiff', 'cutter'], boss: { id: 'cutter', escort: 1 }, first: ['skiff', 'skiff'] },
  { from: 3, to: 6, group: 4, pool: ['skiff', 'cutter'], boss: { id: 'brig', escort: 1 } },
  { from: 4, to: 8, group: 5, pool: ['skiff', 'cutter'], boss: { id: 'brig', escort: 3 } },
  { from: 6, to: 11, group: 6, pool: ['skiff', 'cutter', 'brig'], boss: { id: 'frigate', escort: 3 } },
  { from: 8, to: 15, group: 8, pool: ['cutter', 'brig', 'frigate'], boss: { id: 'frigate', escort: 5 } },
  { from: 9, to: 17, group: 9, pool: ['cutter', 'brig', 'frigate'], boss: { id: 'frigate', escort: 7 } },
  { from: 12, to: 20, group: 10, pool: ['cutter', 'brig', 'frigate', 'galleon'], boss: { id: 'galleon', escort: 8 } },
  { from: 14, to: 24, group: 11, pool: ['brig', 'frigate', 'galleon'], boss: { id: 'manowar', escort: 9 } },
  { from: 16, to: 26, group: 13, pool: ['brig', 'frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 11 } },
  { from: 18, to: 29, group: 15, pool: ['frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 13 } },
  { from: 21, to: 34, group: 17, pool: ['frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 16 } },
  { from: 24, to: 40, group: 20, pool: ['frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 18 } },
  { from: 28, to: 41, group: 22, pool: ['frigate', 'galleon', 'manowar'], boss: { id: 'manowar', escort: 26 } },
  { from: 32, to: 44, group: 24, pool: ['galleon', 'manowar', 'frigate'], boss: { id: 'manowar', escort: 32 } },
  { from: 38, to: 52, group: 29, pool: ['galleon', 'manowar'], boss: { id: 'manowar', escort: 40 } },
];
export const dangerRow = (D) => {
  const R = DANGERS[Math.min(DANGERS.length, Math.max(1, D)) - 1], more = 1 + 0.1 * Math.max(0, D - DANGERS.length);
  return more === 1 ? R : { ...R, from: Math.round(R.from * more), to: Math.round(R.to * more), group: Math.round(R.group * more), boss: { ...R.boss, escort: Math.round(R.boss.escort * more) } };
};
// how many waves a voyage has (the last brings its captain)
export const wavesIn = (voyage) => Math.min(10, 4 + Math.max(1, voyage));
// the classes a danger's raiders sail, its captain's among them
export const classesOf = (D) => { const R = dangerRow(D); return [...new Set([...R.pool, R.boss.id, ...(R.first ?? [])])]; };
// The higher the danger, the tougher the raiders, the harder they hit, the faster they reload and the straighter they
// shoot; from danger 8 (when the Captain may sail a Man-o'-war) they toughen faster, and past 10 faster still
export function raiderLevel(D) {
  const k = D - 1, late = Math.min(3, Math.max(0, k - 6)), past = Math.max(0, D - 10);
  return { health: 1 + 0.1 * k + 0.1 * late + 0.1 * past, damage: 1 + 0.06 * k + 0.04 * late - 0.01 * past,
    slow: Math.max(0.8, 1 - 0.04 * k), aim: Math.max(0.6, 1 - 0.06 * k) };
}

// A small deterministic random, so a voyage's waves are the same each time it's sailed
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// The raiders of wave w (1..n) of an n-wave voyage of danger D, in groups: the first comes in at once, each of the
// others as reinforcements once the one before is mostly down. The last wave brings a raider captain, fitted out with
// parts, and an escort. tries: how many times the Captain has gone down in this wave; on a chart with mercy, each time
// it comes back a little weaker (pass 0 on a chart without)
export const easing = (tries = 0) => Math.max(0.45, 1 - 0.15 * tries);
export function waveOf(D, n, w, tries = 0) {
  const V = dangerRow(D), R = rng(D * 7919 + w * 104729 + n * 31), boss = w === n, ease = easing(tries);
  const pick = (left) => {
    const can = V.pool.filter((id) => THREAT[id] <= left);
    if (!can.length) return null;
    // bigger ships are likelier as the strength grows
    const weights = can.map((id) => THREAT[id] * 0.6 + 1);
    let x = R() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < can.length; i++) { x -= weights[i]; if (x <= 0) return can[i]; }
    return can.at(-1);
  };
  if (!boss && w === 1 && V.first) return { D, w, boss, captain: null, groups: [V.first.slice(0, Math.max(1, Math.round(V.first.length * ease)))] };
  const strength = n > 2 ? V.from + (V.to - V.from) * (w - 1) / (n - 2) : V.to;
  let left = Math.round((boss ? V.boss.escort : Math.max(1, strength)) * ease), captain = null;
  if (boss) {
    const id = V.boss.id;
    captain = { id, name: CAPTAINS[(D - 1) % CAPTAINS.length], fits: BOSS_FITS[(D - 1) % BOSS_FITS.length].slice(0, SLOTS[id]), mark: captainMark(D), health: captainHealth(D) * Math.max(0.7, 1 - 0.1 * tries) };
  }
  // fill groups up to the danger's group strength, at most four ships each (the captain comes on top of the first)
  const groups = [];
  let g = [], room = V.group;
  while (left > 0) {
    let id = g.length < 4 ? pick(Math.min(left, room)) : null;
    if (!id) { groups.push(g); g = []; room = V.group; id = pick(Math.min(left, room)); }
    if (!id) break;
    g.push(id); left -= THREAT[id]; room -= THREAT[id];
  }
  groups.push(g);
  return { D, w, boss, captain, groups: groups.filter((x, i) => x.length || (i === 0 && captain)) };
}
export const CAPTAINS = ['Captain Rook', 'Black Meg', 'Old Sallow', 'the Widow Crane', 'Captain Harrow', 'Iron Tam', 'the Sky Duke'];
// the mark of a raider captain's parts: Mk I at danger 1 and 2, up to Mk III from danger 5, Mk IV from 12, Mk V from 14;
// and how much tougher than the rest of their class they are: half as tough again, and a tenth more for each danger past 10
export const captainMark = (D) => (D >= 14 ? 5 : D >= 12 ? 4 : Math.min(3, Math.ceil(D / 2)));
export const captainHealth = (D) => 1.5 + 0.1 * Math.max(0, D - 10);
const BOSS_FITS = [['heavyShot', 'armour'], ['storm', 'cage', 'heavyShot'], ['armour', 'fins', 'loaders'], ['racing', 'loaders', 'heavyShot', 'armour'], ['cage', 'heavyShot', 'armour', 'loaders']];

// ---------- the Captain ----------
export function newCaptain() {
  return {
    version: 2,
    shards: 0, hold: 0, streak: 0, renown: 0,
    ships: ['skiff'], ship: 'skiff',
    parts: {}, // part id -> mark (1..5)
    fitted: Object.fromEntries(SHIP_ORDER.map((id) => [id, []])), // ship -> part ids in its slots
    power: { sails: 1 / 3, guns: 1 / 3, lift: 1 / 3 },
    ranks: { helm: 0, gunnery: 0, crew: 0, crystals: 0 },
    // the chart being sailed; on each chart, the voyage under way, the next wave in it, and how many times the
    // Captain has gone down in that wave
    chart: 'fair',
    charts: Object.fromEntries(CHART_ORDER.map((id) => [id, { voyage: 1, wave: 1, tries: 0 }])),
    best: 0, // the highest danger of a voyage finished, on any chart
  };
}
// Everything unlocked, for free flight
export function freeCaptain() {
  const c = newCaptain();
  c.ships = [...SHIP_ORDER]; c.ship = 'frigate'; c.free = true; c.chart = 'rough';
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
export const markOpen = (c, m) => !!c.free || c.best >= MARK_FROM[m];
export function buyPart(c, id) {
  const P = partById(id), m = nextMark(c, id);
  if (m > MAX_MARK) return 'Already at its best';
  if (!markOpen(c, m)) return `${MARKS[m]} is sold once you've beaten a danger ${MARK_FROM[m]} voyage`;
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
// What a raider going down pays into the hold: by class, danger and chart; half for crystals, triple for a captain
export function bounty(c, cls, how, captain = false) {
  const base = BOUNTY[cls] * (1 + 0.04 * (danger(c) - 1)) * CHARTS[c.chart].pay * (how === 'crystals' ? 0.5 : 1) * (captain ? 3 : 1);
  return Math.round(base);
}
export const holdBonus = (c) => Math.min(1.5, 1 + 0.1 * c.streak);
export function renownFor(c, cls, captain = false) { return Math.round(RENOWN[cls] * (1 + 0.05 * (danger(c) - 1)) * (captain ? 3 : 1)); }
export const waveRenown = (c) => 10 + 5 * danger(c);

// A wave beaten (not the last): the next one is the one to sail. Then the Captain flies on (the hold's bonus grows,
// the damage stays) or puts in to port (the hold is banked)
export function waveBeaten(c) { on(c).wave++; on(c).tries = 0; }
export function flyOn(c) { c.streak++; }
export function bank(c) {
  const paid = Math.round(c.hold * holdBonus(c));
  c.shards += paid; c.hold = 0; c.streak = 0;
  return paid;
}
// The last wave beaten: the voyage is done, the hold banked with a quarter more, and the chart's next voyage waits
export function voyageDone(c) {
  c.hold = Math.round(c.hold * 1.25);
  const paid = bank(c), at = on(c);
  c.best = Math.max(c.best, danger(c)); at.voyage++; at.wave = 1; at.tries = 0;
  return paid;
}
// Going down: the hold is lost (on Fair Winds, half is kept and banked), and the wave is sailed again: a little weaker,
// on a chart with mercy
export function wentDown(c) {
  const kept = Math.round(c.hold * CHARTS[c.chart].keep);
  c.shards += kept; const lost = c.hold - kept;
  c.hold = 0; c.streak = 0; on(c).tries++;
  return { kept, lost };
}
// The wave of the voyage under way, as the Captain will meet it
export function nextWave(c) {
  const at = on(c), D = danger(c);
  return waveOf(D, wavesIn(at.voyage), at.wave, CHARTS[c.chart].mercy ? at.tries : 0);
}

// ---------- strength: how ready the Captain's ship is, on the danger scale ----------
// Power, for raiders and for the Captain's ship alike, is counted the way two fleets trading broadsides wear each other
// down: how much they can take, times how much they dish out (as a power of two, so one more is twice as strong).
// A danger's power is its typical wave's (the middle of a long voyage) on Rough Air: its ships, counted by threat, and
// how tough they are, how hard they hit, how fast they reload and how well they aim at that danger. It rises with
// every danger, faster at first.
const DANGER_POWER = [];
export function dangerPower(D) {
  if (!DANGER_POWER.length) {
    const at = (d, w) => {
      const W = waveOf(d, 9, w), T = W.groups.flat().reduce((a, id) => a + THREAT[id], 0), L = raiderLevel(d);
      return Math.log2(T * L.health * T * L.damage / L.slow / Math.sqrt(L.aim));
    };
    for (let d = 1; d <= 30; d++) DANGER_POWER.push(Math.max((at(d, 4) + at(d, 5) + at(d, 6)) / 3, (DANGER_POWER.at(-1) ?? -Infinity) + 0.05));
  }
  const i = Math.max(1, Math.min(DANGER_POWER.length - 1, Math.floor(D)));
  return DANGER_POWER[i - 1] + (D - i) * (DANGER_POWER[i] - DANGER_POWER[i - 1]);
}
// the danger with this power (between dangers, part of the way; past the ends, at the nearest step's pace)
export function dangerWith(x) {
  dangerPower(1);
  const C = DANGER_POWER;
  let i = 1; while (i < C.length - 1 && x > C[i]) i++;
  return i + (x - C[i - 1]) / (C[i] - C[i - 1]);
}
// What the abilities add over a fight, by how much of it each is working and how strong it is: Double Shot to the
// guns, the Sunstone Ward and Damage Control to toughness, Crystal Surge to handling
export function abilityWorth(c) {
  const w = { guns: 1, tough: 1, handling: 1 };
  for (const A of abilities(c)) {
    const up = A.time / A.cooldown;
    if (A.id === 'double') w.guns *= 1 + up * ((A.strong ? 2.5 : 2) - 1);
    if (A.id === 'ward') w.tough /= 1 - up * (1 - (A.strong ? 1 / 3 : 0.5));
    if (A.id === 'control') w.tough *= 1 + (A.strong ? 0.45 : 0.3) * 0.5 * (60 / A.cooldown); // about half what's missing, each time
    if (A.id === 'surge') w.handling *= 1 + up * 0.35;
  }
  return w;
}
// A ship's kit factor: what her parts, skills, tuning and abilities make of her (1 for a plain ship), from her
// toughness (hull, crystals and sails), her firepower (damage over reload time) and her handling (turning and speed),
// which counts for a lot: a ship that can't bring her guns round or get clear doesn't win. The abilities count for
// half what they'd add if they were always to hand. Her power: her class's with nothing fitted (BASE), and UPGRADE more
// for each doubling of the kit factor. Her strength: the danger with that power, which is the danger of the Rough
// Air voyages she's ready for. There the simulated Captain, in her and with her kit, wins three waves in four of the
// middle of a voyage. The numbers come from tools/sim-voyage.mjs rate (docs/balance.md).
export const BASE = { skiff: 4.09, cutter: 4.56, brig: 5.64, frigate: 6.75, galleon: 7.37, manowar: 8.93 };
export const UPGRADE = 2.4;
export function kitFactor(c, ship = c.ship) {
  const e = effects(c, ship), w = abilityWorth(c);
  const tough = (0.6 * e.hull + 0.25 * e.crystals + 0.15 * e.sails) * Math.sqrt(w.tough), guns = (e.damage / e.reload) * Math.sqrt(w.guns);
  return Math.sqrt(tough * guns) * Math.sqrt(e.turn * e.speed) * Math.sqrt(w.handling);
}
export const shipPower = (c, ship = c.ship) => BASE[ship] + UPGRADE * Math.log2(kitFactor(c, ship));
const tenth = (x) => Math.round(x * 10) / 10;
export const strength = (c, ship = c.ship) => tenth(Math.max(0.5, dangerWith(shipPower(c, ship))));
// The strength a chart's voyage needs: its danger's power, with that chart's raiders (CHARTS power)
export const needFor = (chart, voyage) => tenth(dangerWith(dangerPower(dangerOf(chart, voyage)) + CHARTS[chart].power));
// How the Captain's ship stands against a chart's next voyage: 'ready', 'hard' (a hard fight), or 'beyond' her
export function readiness(c, chart, ship = c.ship) {
  const need = needFor(chart, on(c, chart).voyage), s = strength(c, ship);
  return s >= need ? 'ready' : s >= need - 1.5 ? 'hard' : 'beyond';
}

// ---------- saving ----------
const KEY = 'sunstone-skies:captain:1';
export function save(c) { if (c.free) return; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage: progress lasts this visit */ } }
export function load() {
  try { return fromSave(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; }
}
// A saved Captain, brought up to date: a save from before a new skill or ship gets them; one from before the charts
// had sailed Fair Winds
export function fromSave(c) {
  if (c?.version !== 1 && c?.version !== 2) return null;
  const n = newCaptain(), out = { ...n, ...c, version: 2, ranks: { ...n.ranks, ...c.ranks }, fitted: { ...n.fitted, ...c.fitted }, charts: { ...n.charts, ...c.charts } };
  if (c.version === 1) {
    out.chart = 'fair';
    out.charts = { ...n.charts, fair: { voyage: c.voyage ?? 1, wave: c.wave ?? 1, tries: 0 } };
    out.best = Math.max(0, (c.voyage ?? 1) - 1);
    for (const k of ['difficulty', 'voyage', 'wave', 'tries']) delete out[k];
  }
  if (!chartOpen(out, out.chart)) out.chart = 'fair';
  return out;
}
export function forget() { try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ } }
