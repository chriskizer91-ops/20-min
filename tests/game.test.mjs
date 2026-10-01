// The game's record of the night (src/game/state.js): the bag, the party's levels, HP and MP, fights folded in,
// a lost fight costing nothing, and saving.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, save, load, give, take, count, battleBag, partyFor, join, restParty, storyFloor, afterBattle, snapshot, afterDefeat,
  heroStatus, level, SAVE_KEY,
} from '../src/game/state.js';
import { startEncounter } from '../src/battle/encounters.js';
import { xpForLevel } from '../vendor/aethermoor/src/rules/progression.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('a new night starts in her cottage, alone, with an empty basket', () => {
  const s = newGame();
  assert.equal(s.where.screen, 'cottage-inside');
  assert.deepEqual(s.party, ['witch']);
  assert.deepEqual(s.bag, {});
  assert.equal(level(s, 'witch'), 1);
});

test('things go in and out of the bag', () => {
  const s = newGame();
  give(s, 'moonwater', 2);
  give(s, 'lavender');
  take(s, 'moonwater');
  assert.equal(count(s, 'moonwater'), 1);
  take(s, 'lavender');
  assert.equal('lavender' in s.bag, false);
});

test('the battle bag is the brews and duds, never herbs or charms, and one moonwater she can spare', () => {
  const s = newGame();
  Object.assign(s.bag, { moonwater: 3, 'heartsease-tonic': 1, 'wisp-calm': 1, lavender: 2, 'charm-owl': 1, 'swamp-tea': 1 });
  assert.deepEqual(battleBag(s), { 'heartsease-tonic': 1, 'swamp-tea': 1 }, 'three moonwater, three required brews still to make: none to throw');
  s.bag['lantern-oil'] = 1; // one brewed
  assert.deepEqual(battleBag(s), { 'heartsease-tonic': 1, 'swamp-tea': 1, 'lantern-oil': 1, moonwater: 1 }, 'one to spare: one bottle to throw');
});

test('Inkblot and Nettie join with the witch\'s XP, in walking order', () => {
  const s = newGame();
  s.heroes.witch.xp = 50;
  join(s, 'nettie');
  join(s, 'inkblot');
  assert.deepEqual(s.party, ['witch', 'inkblot', 'nettie']);
  assert.equal(s.heroes.nettie.xp, 50);
  assert.equal(s.heroes.inkblot.xp, 50);
});

test('story floors raise everyone, and never lower anyone', () => {
  const s = newGame();
  join(s, 'inkblot');
  s.heroes.witch.xp = 500;
  storyFloor(s, 'B2');
  assert.equal(s.heroes.inkblot.xp, xpForLevel(2));
  assert.equal(s.heroes.witch.xp, 500);
});

test('the party goes into a fight as it stands, and a fight can start from it', () => {
  const s = newGame();
  join(s, 'inkblot');
  const spec = partyFor(s);
  assert.deepEqual(spec.map((p) => p.id), ['witch', 'inkblot']);
  assert.ok(spec.every((p) => p.level === 1 && p.hp > 0));
  const b = startEncounter('B1', { party: spec, bag: battleBag(s), seed: 3 });
  assert.equal(Object.values(b.units).filter((u) => u.side === 'hero').length, 2);
  // Inkblot's feather goes into the fight once it's in the bag; Nettie always wears her shawl
  give(s, 'inkblots-feather');
  join(s, 'nettie');
  const relics = Object.fromEntries(partyFor(s).map((p) => [p.id, p.relics]));
  assert.deepEqual(relics, { witch: [], inkblot: ['inkblots-feather'], nettie: ['hexbane-shawl'] });
});

test('a won fight folds in: HP and MP, XP and levels, the bag, herbs and relics', () => {
  const s = newGame();
  join(s, 'inkblot');
  Object.assign(s.bag, { moonwater: 2, 'heartsease-tonic': 1, lavender: 1 });
  const bagIn = { moonwater: 1, 'heartsease-tonic': 1 };
  const out = {
    result: 'victory', xp: 40,
    party: [{ id: 'h1', hp: 0, mp: 1 }, { id: 'h2', hp: 7, mp: 2 }],
    bag: { 'heartsease-tonic': 1 }, consumables: { 'hearth-tonic': 1 },
    claimed: [{ base: 'dawnbell', name: 'Dawnbell', rarity: 'heirloom' }],
    drops: [{ base: 'gloves', name: 'Willowmurk Gloves', rarity: 'wrought' }],
  };
  const before = heroStatus(s, 'witch').maxHp;
  const r = afterBattle(s, out, { herbs: ['glowcap'], heroIds: { h1: 'witch', h2: 'inkblot' }, fight: 'B3', bagIn });
  assert.equal(r.won, true);
  assert.equal(s.fights.B3, 'won');
  assert.equal(s.heroes.witch.hp, 1 + heroStatus(s, 'witch').maxHp - before, 'a hero sitting down gets up with 1 HP, plus what the new level brings');
  assert.equal(s.heroes.witch.xp, 40);
  assert.ok(r.levels.some((l) => l.id === 'witch' && l.level === 2), 'forty XP is level 2');
  assert.equal(count(s, 'moonwater'), 1, 'what was thrown is gone');
  assert.equal(count(s, 'heartsease-tonic'), 2, 'what was not drunk stays, and a dropped Hearth Tonic comes home as a Heartsease Tonic');
  assert.equal(count(s, 'lavender'), 1, 'herbs never go into a fight');
  assert.equal(count(s, 'glowcap'), 1);
  assert.equal(count(s, 'dawnbell'), 1);
  assert.equal(s.gear.length, 1);
});

test('a lost fight costs nothing: the bag comes back and everyone is mended', () => {
  const s = newGame();
  Object.assign(s.bag, { moonwater: 2, 'lantern-oil': 1 });
  const snap = snapshot(s);
  s.heroes.witch.hp = 0;
  const r = afterBattle(s, { result: 'defeat', xp: 0, party: [], bag: {} }, {});
  assert.equal(r.won, false);
  afterDefeat(s, snap);
  assert.deepEqual(s.bag, { moonwater: 2, 'lantern-oil': 1 });
  assert.equal(heroStatus(s, 'witch').hp, heroStatus(s, 'witch').maxHp);
});

test('a rest mends everyone in the party', () => {
  const s = newGame();
  join(s, 'inkblot');
  s.heroes.witch.hp = 3;
  s.heroes.inkblot.mp = 0;
  restParty(s);
  assert.equal(heroStatus(s, 'witch').hp, heroStatus(s, 'witch').maxHp);
  assert.equal(heroStatus(s, 'inkblot').mp, heroStatus(s, 'inkblot').maxMp);
});

test('the night saves and loads, and a bad save loads as nothing', () => {
  const store = memory();
  const s = newGame();
  give(s, 'moonwater', 2);
  s.flags.silas = true;
  assert.equal(save(s, store), true);
  const back = load(store);
  assert.deepEqual(back.bag, { moonwater: 2 });
  assert.equal(back.flags.silas, true);
  store.setItem(SAVE_KEY, '{not json');
  assert.equal(load(store), null);
  assert.equal(load(memory()), null);
});
