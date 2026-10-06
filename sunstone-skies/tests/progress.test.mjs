// The Captain's progress: levels, parts and slots, tuning, waves, shards. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/game/progress.js';

test('levels need more renown each time, up to the top level', () => {
  assert.deepEqual(P.levelOf(0), { level: 1, into: 0, need: 50 });
  assert.equal(P.levelOf(50).level, 2);
  assert.equal(P.levelOf(50 + 90).level, 3);
  assert.equal(P.levelOf(1e9).level, P.MAX_LEVEL);
});

test('a new Captain sails a plain Skiff: every number is even', () => {
  const c = P.newCaptain();
  const e = P.effects(c);
  for (const [k, v] of Object.entries(e)) assert.ok(Math.abs(v - 1) < 1e-9, `${k} is ${v}`);
});

test('parts cost shards, fill slots, and the two canvases exclude each other', () => {
  const c = P.newCaptain();
  assert.match(P.buyPart(c, 'armour'), /150 shards/);
  c.shards = 10000;
  assert.equal(P.buyPart(c, 'armour'), null);
  assert.equal(c.parts.armour, 1);
  assert.equal(P.fitPart(c, 'armour'), null);
  P.buyPart(c, 'racing');
  assert.match(P.fitPart(c, 'racing'), /one slot/); // the Skiff has one slot
  assert.equal(P.buyShip(c, 'brig'), null); P.chooseShip(c, 'brig');
  P.buyPart(c, 'storm');
  assert.equal(P.fitPart(c, 'racing'), null);
  assert.match(P.fitPart(c, 'storm'), /one kind of canvas/);
  assert.equal(P.fitPart(c, 'armour'), null);
  P.buyPart(c, 'cage');
  assert.equal(P.fitPart(c, 'cage'), null);
  P.buyPart(c, 'vents');
  assert.match(P.fitPart(c, 'vents'), /All 3 slots/);
  assert.deepEqual(P.looks(c), { racing: true, armour: true, cage: true });
});

test('a part gains more with each mark, and costs a little more too', () => {
  const c = P.newCaptain(); c.shards = 10000;
  P.buyPart(c, 'armour'); P.fitPart(c, 'armour');
  const e1 = P.effects(c);
  P.buyPart(c, 'armour'); P.buyPart(c, 'armour');
  const e3 = P.effects(c);
  assert.ok(Math.abs(e1.hull - 1.25) < 1e-9 && Math.abs(e3.hull - 1.5) < 1e-9);
  assert.ok(e3.speed < e1.speed && e3.speed > 0.9);
  assert.match(P.buyPart(c, 'armour'), /best/);
});

test('tuning: more power to the sails is more speed and less of the rest; the cage leaves less to share', () => {
  const c = P.newCaptain();
  P.setPower(c, 'sails', 0.8);
  const sum = c.power.sails + c.power.guns + c.power.lift;
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const e = P.effects(c);
  assert.ok(e.speed > 1.1 && e.reload > 1 && e.climb < 1);
  const d = P.newCaptain(); d.shards = 1e4; P.buyPart(d, 'cage'); P.fitPart(d, 'cage');
  const f = P.effects(d);
  assert.ok(f.speed < 1 && f.reload > 1 && f.crystals > 1.4);
});

test('skills: points come from levels, and rank 2 unlocks the line\'s ability', () => {
  const c = P.newCaptain();
  assert.match(P.rankUp(c, 'helm'), /No skill points/);
  c.renown = 50 + 90 + 130; // level 4: three points
  assert.equal(P.skillPoints(c), 3);
  P.rankUp(c, 'helm'); P.rankUp(c, 'helm');
  assert.deepEqual(P.abilities(c).map((a) => a.id), ['surge']);
  assert.ok(P.effects(c).turn > 1.07);
});

test('waves grow through a voyage, and the last brings a captain', () => {
  const w1 = P.waveOf(1, 1), w5 = P.waveOf(1, P.wavesIn(1));
  assert.deepEqual(P.waveOf(1, 1), w1); // the same each time
  const threat = (w) => w.groups.flat().reduce((a, id) => a + P.THREAT[id], 0);
  assert.ok(threat(w1) >= 2 && threat(w1) <= P.budget(1, 1));
  assert.ok(w5.boss && w5.captain && w5.captain.id === 'brig');
  for (const id of P.waveOf(1, 3).groups.flat()) assert.ok(['skiff', 'cutter'].includes(id));
  assert.ok(P.waveOf(3, 6).groups.flat().length >= 3);
  assert.ok(P.budget(3, 5) > P.budget(1, 5));
  assert.ok(P.raiderLevel(4).health > P.raiderLevel(1).health);
});

test('shards: half for a crystal kill, more on harder settings; flying on raises the hold, going down loses it', () => {
  const c = P.newCaptain('rough');
  assert.equal(P.bounty(c, 'brig', 'hull'), 75);
  assert.equal(P.bounty(c, 'brig', 'crystals'), Math.round(75 / 2));
  c.hold = 100; P.flyOn(c); P.flyOn(c);
  assert.equal(P.bank(c), 120);
  assert.equal(c.shards, 120);
  c.hold = 80;
  assert.deepEqual(P.wentDown(c), { kept: 0, lost: 80 });
  const f = P.newCaptain('fair'); f.hold = 80;
  assert.deepEqual(P.wentDown(f), { kept: 40, lost: 40 });
  c.hold = 100; c.voyage = 1;
  assert.equal(P.voyageDone(c), 125);
  assert.equal(c.voyage, 2);
});
