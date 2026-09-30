// Battle balance, fast: the six fights of the slice with fewer seeds than tools/balance.mjs, so a change that breaks the
// balance fails here. Seeds are fixed, so the numbers are exact for the current rules and data; the bands are looser than
// docs/BALANCE.md's targets because 50 fights are few. Run: node --test tests/balance.test.mjs (npm test runs it too).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { battery, playFight, arrivals, GATHERS } from '../tools/balance.mjs';
import { ENCOUNTERS, ORDER, CURVE, startEncounter, nextForm, partyFor } from '../src/battle/encounters.js';
import { act, foeTurn, commands } from '../vendor/aethermoor/src/rules/battle.js';
import { buildFoe } from '../vendor/aethermoor/src/rules/foe.js';

const N = 50, SEED = 424242;
const run = (id, policy, o = {}) => battery(id, { n: N, policy, seed0: SEED, ...o });
const pct = x => `${Math.round(100 * x)}%`;
const within = (x, lo, hi, what) => assert.ok(x >= lo && x <= hi, `${what}: ${pct(x)} is outside ${pct(lo)}-${pct(hi)}`);
// play until it is this hero's turn (foes act on their own)
function toHero(s, id) {
  for (let i = 0; i < 60 && !s.ended && s.actor !== id; i++) {
    const u = s.units[s.actor];
    s = u.side === 'hero' ? act(s, { ...commands(s, u.id).find(c => c.id === 'defend') }).state : foeTurn(s).state;
  }
  return s;
}

// ---- the fights build as the docs say --------------------------------------------------------------------------------

test('every encounter builds, with the party at the level the curve gives it', () => {
  for (const id of Object.keys(ENCOUNTERS)) {
    const s = startEncounter(id, { seed: 3 });
    const heroes = Object.values(s.units).filter(u => u.side === 'hero');
    assert.deepEqual(heroes.map(h => h.heroId).sort(), [...ENCOUNTERS[id].party].sort(), `${id} party`);
    for (const h of heroes) assert.equal(h.level, CURVE.typical[id].level, `${id} ${h.heroId} level`);
  }
  // both paths through the slice meet every fight at the same level (the story floors see to it)
  for (const id of ['B1', 'B3', 'B5', 'B6']) assert.equal(CURVE.brisk[id].level, CURVE.typical[id].level, id);
  assert.deepEqual(ORDER.map(id => CURVE.typical[id].level), [1, 2, 2, 3, 3, 4]);
});

test('bosses cannot be fled; the Lantern Mother has a second form with Silas beside the party', () => {
  for (const id of ['B3', 'B6', 'B6b']) assert.equal(startEncounter(id).ctx.noFlee, true, id);
  let s = startEncounter('B6', { seed: 5 });
  const lm = Object.values(s.units).find(u => u.family === 'lantern-mother');
  s = { ...s, units: { ...s.units, [lm.id]: { ...lm, hp: 0, ko: true } }, ended: { result: 'victory' } };
  s.units.witch = { ...s.units.witch, hp: 7 };
  const two = nextForm(s);
  assert.ok(two, 'a second form follows');
  assert.equal(two.units.witch.hp, 7, 'HP carries over');
  const silas = Object.values(two.units).find(u => u.family === 'silas');
  assert.ok(silas && silas.side === 'ally', 'Silas fights on the party\'s side');
});

// ---- the rules the kits rely on --------------------------------------------------------------------------------------

test('Gather never does damage', () => {
  for (const id of ['B1', 'B2', 'B4', 'B5']) {
    let s = toHero(startEncounter(id, { seed: 11 }), 'witch');
    const foe = Object.values(s.units).find(u => u.side === 'foe' && GATHERS[u.family]);
    const before = foe.hp;
    const r = act(s, { ...commands(s, 'witch').find(c => c.id === 'gather'), target: foe.id });
    assert.ok(!r.events.some(e => e.t === 'damage' && e.target === foe.id), `${id}: Gather hurt ${foe.name}`);
    assert.equal(r.state.units[foe.id].hp, before);
  }
});

test('with no relic her Full Moon is Moonrise, and Moonrise strips Hollowed from every foe', () => {
  let s = toHero(startEncounter('B4', { seed: 2 }), 'witch');
  s = { ...s, units: { ...s.units, witch: { ...s.units.witch, surge: 100 } } };
  const moon = commands(s, 'witch').find(c => c.id === 'surge');
  assert.equal(moon.power, 'moonrise');
  // mark every foe as having struck, so only Moonrise can take the Omen now
  for (const f of Object.values(s.units)) if (f.side === 'foe') s.units[f.id] = { ...f, struck: true };
  const target = Object.values(s.units).find(u => u.side === 'foe').id;
  const r = act(s, { ...moon, target });
  for (const f of Object.values(r.state.units)) if (f.side === 'foe' && !f.ko) assert.ok(!f.omens.includes('hollowed'), `${f.name} still Hollowed`);
});

test('Hollowed: moonlight breaks it before the rot lands, not after', () => {
  const foe = buildFoe({ family: 'mire-leech', level: 2, omens: ['hollowed'] }, { id: 'f1' });
  assert.ok(foe.omens.includes('hollowed'));
  let s = toHero(startEncounter('B4', { seed: 8, firstStrike: true }), 'witch');
  const fresh = Object.values(s.units).find(u => u.side === 'foe' && !u.struck && u.omens.includes('hollowed'));
  const r = act(s, { ...commands(s, 'witch').find(c => c.id === 'moonbeam'), target: fresh.id });
  assert.ok(!r.state.units[fresh.id].omens.includes('hollowed') || r.state.units[fresh.id].ko, 'a Moonbeam before its first hit breaks it');
  s = toHero(startEncounter('B4', { seed: 8, firstStrike: true }), 'witch');
  s = { ...s, units: { ...s.units, [fresh.id]: { ...s.units[fresh.id], struck: true, hp: 99, maxHp: 99 } } };
  const r2 = act(s, { ...commands(s, 'witch').find(c => c.id === 'moonbeam'), target: fresh.id });
  assert.ok(r2.state.units[fresh.id].omens.includes('hollowed'), 'after its rot has landed, moonlight no longer breaks it');
});

test('Heartsease gets a fallen friend up; Pinch can take a lamp-moth\'s flame', () => {
  let s = toHero(startEncounter('B2', { seed: 4 }), 'witch');
  s = { ...s, units: { ...s.units, inkblot: { ...s.units.inkblot, hp: 0, ko: true } } };
  const tonic = commands(s, 'witch').find(c => c.id === 'heartsease-tonic');
  const r = act(s, { ...tonic, target: 'inkblot' });
  assert.ok(!r.state.units.inkblot.ko && r.state.units.inkblot.hp > 0, 'revived');
  let pried = false;
  for (let seed = 1; seed < 30 && !pried; seed++) pried = playFight('B2', { seed, policy: 'expert' }).pried.includes('wickhollow-flame');
  assert.ok(pried, 'a flame is pried loose in some B2');
});

// ---- the balance targets, loosely (docs/BALANCE.md has the full numbers at 400 seeds) --------------------------------------

test('B1 tutorial and B2: sensible play always wins, naive nearly always', () => {
  within(run('B1', 'sensible').win, 0.97, 1, 'B1 sensible');
  within(run('B1', 'naive').win, 0.92, 1, 'B1 naive');
  within(run('B2', 'sensible').win, 0.92, 1, 'B2 sensible');
  within(run('B2', 'naive').win, 0.78, 1, 'B2 naive');
});

test('B3, the Gloamwing: medium; reading the ribbon pays', () => {
  const n = run('B3', 'naive'), s = run('B3', 'sensible'), e = run('B3', 'expert');
  within(n.win, 0.3, 0.72, 'B3 naive');
  within(s.win, 0.7, 0.95, 'B3 sensible');
  within(e.win, 0.9, 1, 'B3 expert');
  assert.ok(e.win > s.win && s.win > n.win, 'expert > sensible > naive');
});

test('B4, the Murkway: a First Strike makes it easy', () => {
  const plain = run('B4', 'sensible'), fs = run('B4', 'sensible', { firstStrike: true });
  within(plain.win, 0.6, 0.9, 'B4 sensible without First Strike');
  within(fs.win, 0.86, 1, 'B4 sensible with First Strike');
  assert.ok(fs.win - plain.win >= 0.08, 'the First Strike is worth having');
  assert.ok(fs.hollowed.broken > plain.hollowed.broken, 'with a First Strike more Hollowed break before they strike');
});

test('B5, the Long Boardwalk: hard for sensible play, fine for expert play', () => {
  within(run('B5', 'sensible').win, 0.55, 0.88, 'B5 sensible');
  within(run('B5', 'expert').win, 0.84, 1, 'B5 expert');
});

test('B6, the Lantern Mother, rested (a retry from Nettie\'s hut): sensible usually wins, expert nearly always', () => {
  const s = run('B6', 'sensible'), e = run('B6', 'expert');
  within(s.win, 0.6, 0.92, 'B6 sensible, rested');
  within(e.win, 0.85, 1, 'B6 expert, rested');
});

test('B6 as the night leaves you (straight from B5, no rest): sensible loses it about a third of the time', () => {
  const go = policy => battery('B6', { n: N, policy, seed0: SEED, arrive: arrivals('B6', { policy, n: N }) });
  const s = go('sensible'), e = go('expert');
  within(s.win, 0.4, 0.85, 'B6 sensible, first try');
  within(e.win, 0.75, 1, 'B6 expert, first try');
});

test('the Lantern Mother opens by tending the party (Come In Out of the Wet)', () => {
  let s = startEncounter('B6', { seed: 3 });
  for (const u of Object.values(s.units)) if (u.side === 'hero') s.units[u.id] = { ...u, hp: 5, mp: 0 };
  const lm = Object.values(s.units).find(u => u.side === 'foe');
  assert.equal(lm.intent.move, 'come-in');
  while (s.units[s.actor].side !== 'foe') s = act(s, { ...commands(s, s.actor).find(c => c.id === 'defend') }).state;
  const r = foeTurn(s);
  for (const u of Object.values(r.state.units)) if (u.side === 'hero') assert.ok(u.hp > 5 && u.mp >= 6, `${u.name} tended`);
});

test('fight lengths and hit rates stay in bounds', () => {
  const len = { B1: [0.6, 2.2], B2: [1, 2.5], B3: [2.2, 5], B4: [1.5, 3.5], B5: [2.4, 5], B6: [3.6, 6.5] };
  for (const id of ORDER) {
    const b = run(id, 'sensible');
    within(b.minutes / 10, len[id][0] / 10, len[id][1] / 10, `${id} sensible median minutes (x10)`);
    assert.ok(b.fastest >= 4, `${id}: won in ${b.fastest} hero turns`);
    within(b.fire.land + b.fire.graze, 0.65, 0.95, `${id} Witchfire landing (hit, crit or graze)`);
  }
});
