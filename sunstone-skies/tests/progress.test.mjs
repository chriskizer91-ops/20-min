// The Captain's progress: levels, parts and slots, tuning, waves, shards. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/game/progress.js';

test('levels need more renown each time, up to the top level', () => {
  assert.deepEqual(P.levelOf(0), { level: 1, into: 0, need: 50 });
  assert.equal(P.levelOf(50).level, 2);
  assert.equal(P.levelOf(50 + 140).level, 3);
  assert.equal(P.levelOf(50 + 139).level, 2);
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
  assert.match(P.buyPart(c, 'armour'), /Mk IV is sold from voyage 5/); // Mk IV and V come later in the campaign
  c.voyage = 7;
  P.buyPart(c, 'armour'); P.buyPart(c, 'armour');
  assert.ok(Math.abs(P.effects(c).hull - 1.7) < 1e-9);
  assert.match(P.buyPart(c, 'armour'), /best/);
});

test('four skills of six ranks, and the top level is enough for all of them', () => {
  const c = P.newCaptain(); c.renown = 1e9;
  assert.equal(P.SKILLS.length, 4);
  assert.equal(P.skillPoints(c), P.SKILLS.length * P.MAX_RANK);
  for (const S of P.SKILLS) for (let r = 0; r < P.MAX_RANK; r++) assert.equal(P.rankUp(c, S.id), null);
  assert.equal(P.skillPoints(c), 0);
  assert.deepEqual(P.abilities(c).map((a) => a.id), ['surge', 'double', 'control', 'ward']);
  const ward = P.abilities(c).find((a) => a.id === 'ward');
  assert.ok(ward.strong && ward.cooldown === 38 && ward.time === 7);
  const f = P.freeCaptain();
  assert.ok(P.PARTS.every((p) => f.parts[p.id] === P.MAX_MARK) && f.ranks.crystals === P.MAX_RANK);
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
  c.renown = 50 + 140 + 230; // level 4: three points
  assert.equal(P.skillPoints(c), 3);
  P.rankUp(c, 'helm'); P.rankUp(c, 'helm');
  assert.deepEqual(P.abilities(c).map((a) => a.id), ['surge']);
  assert.ok(P.effects(c).turn > 1.07);
});

test('waves grow through a voyage, come in groups, and the last brings a captain', () => {
  const threat = (w) => w.groups.flat().reduce((a, id) => a + P.THREAT[id], 0);
  assert.deepEqual(P.waveOf(1, 1).groups, [['skiff', 'skiff']]); // the first wave of all: two Skiffs
  assert.deepEqual(P.waveOf(2, 3), P.waveOf(2, 3)); // the same each time
  for (let v = 1; v <= 8; v++) {
    const V = P.VOYAGES[Math.min(v, P.VOYAGES.length) - 1];
    assert.equal(P.wavesIn(v), V.waves.length + 1);
    for (let w = 1; w < P.wavesIn(v); w++) {
      const W = P.waveOf(v, w);
      assert.ok(!W.boss && !W.captain);
      // as strong as the table says (or a little short, when no class in the pool fits the last points)
      const want = V.waves[w - 1], least = Math.min(...V.pool.map((id) => P.THREAT[id]));
      if (typeof want === 'number' && v <= P.VOYAGES.length) assert.ok(threat(W) <= want && threat(W) > want - least, `voyage ${v} wave ${w}: ${threat(W)} for ${want}`);
      for (const g of W.groups) assert.ok(g.length >= 1 && g.length <= 4);
      for (const id of W.groups.flat()) assert.ok(V.pool.includes(id), `voyage ${v}: ${id} isn't in the pool`);
    }
    const B = P.waveOf(v, P.wavesIn(v));
    assert.ok(B.boss && B.captain && B.captain.id === V.boss.id && B.captain.fits.length <= P.SLOTS[B.captain.id]);
  }
  assert.ok(P.waveOf(6, 9).groups.length >= 2); // big waves come in more than one group
  assert.ok(threat(P.waveOf(9, 9)) > threat(P.waveOf(6, 9))); // past the table, a tenth stronger each voyage
  assert.ok(P.raiderLevel(4).health > P.raiderLevel(1).health);
  // a wave the Captain went down in comes back weaker, down to a little under half
  for (const [v, w] of [[2, 5], [4, 7], [8, 9]]) {
    const t = [0, 1, 2, 5].map((n) => threat(P.waveOf(v, w, n)));
    assert.ok(t[1] < t[0] && t[2] < t[1] && t[3] <= t[2] && t[3] >= t[0] * 0.3, `voyage ${v} wave ${w}: ${t}`);
  }
  assert.deepEqual(P.waveOf(1, 1, 3).groups, [['skiff']]);
  assert.ok(P.waveOf(1, P.wavesIn(1), 2).captain.health < P.waveOf(1, P.wavesIn(1)).captain.health);
});

test('shards: half for a crystal kill, more on harder settings; flying on raises the hold, going down loses it', () => {
  const c = P.newCaptain('rough');
  assert.equal(P.bounty(c, 'brig', 'hull'), 75);
  assert.equal(P.bounty(c, 'brig', 'crystals'), Math.round(75 / 2));
  c.voyage = 3; assert.equal(P.bounty(c, 'brig', 'hull'), 90); c.voyage = 1; // a tenth more each voyage
  c.hold = 100; P.flyOn(c); P.flyOn(c);
  assert.equal(P.bank(c), 120);
  assert.equal(c.shards, 120);
  c.hold = 80;
  assert.deepEqual(P.wentDown(c), { kept: 0, lost: 80 });
  const f = P.newCaptain('fair'); f.hold = 80;
  assert.deepEqual(P.wentDown(f), { kept: 40, lost: 40 });
  assert.equal(f.tries, 1); // the wave comes back weaker
  P.waveBeaten(f); assert.equal(f.tries, 0);
  c.hold = 100; c.voyage = 1;
  assert.equal(P.voyageDone(c), 125);
  assert.equal(c.voyage, 2);
});
