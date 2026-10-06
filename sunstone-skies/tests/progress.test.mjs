// The Captain's progress: levels, parts and slots, tuning, the charts and their dangers, waves, shards, strength,
// saves. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/game/progress.js';

test('levels need more renown each time, up to the top level', () => {
  assert.deepEqual(P.levelOf(0), { level: 1, into: 0, need: 50 });
  assert.equal(P.levelOf(50).level, 2);
  assert.equal(P.levelOf(50 + 170).level, 3);
  assert.equal(P.levelOf(50 + 169).level, 2);
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
  assert.match(P.buyPart(c, 'armour'), /Mk IV is sold once you've beaten a danger 4 voyage/); // Mk IV and V come later
  c.best = 6;
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
  c.renown = 50 + 170 + 290; // level 4: three points
  assert.equal(P.skillPoints(c), 3);
  P.rankUp(c, 'helm'); P.rankUp(c, 'helm');
  assert.deepEqual(P.abilities(c).map((a) => a.id), ['surge']);
  assert.ok(P.effects(c).turn > 1.07);
});

test('the charts: danger is the voyage plus the chart\'s offset, and the harder charts open later', () => {
  const c = P.newCaptain();
  assert.equal(c.chart, 'fair');
  assert.deepEqual(P.CHART_ORDER.map((id) => P.dangerOf(id, 1)), [1, 3, 6]);
  assert.equal(P.dangerOf('black', 10), 15);
  assert.ok(P.chartOpen(c, 'fair') && !P.chartOpen(c, 'rough') && !P.chartOpen(c, 'black'));
  P.on(c, 'fair').voyage = 3; // two Fair Winds voyages done
  assert.ok(P.chartOpen(c, 'rough') && !P.chartOpen(c, 'black'));
  P.on(c, 'rough').voyage = 4; // three on Rough Air
  assert.ok(P.chartOpen(c, 'black'));
  // each chart keeps its own place
  c.chart = 'black';
  assert.equal(P.danger(c), 6);
  assert.equal(P.on(c).voyage, 1);
  assert.equal(P.on(c, 'fair').voyage, 3);
  assert.ok(P.freeCaptain().chart === 'rough' && P.chartOpen(P.freeCaptain(), 'black'));
});

test('waves grow through a voyage, come in groups, and the last brings a captain', () => {
  const threat = (w) => w.groups.flat().reduce((a, id) => a + P.THREAT[id], 0);
  assert.deepEqual(P.waveOf(1, 5, 1).groups, [['skiff', 'skiff']]); // the first wave of all: two Skiffs
  assert.deepEqual(P.waveOf(3, 7, 3), P.waveOf(3, 7, 3)); // the same each time
  assert.deepEqual([1, 2, 6, 10, 14].map(P.wavesIn), [5, 6, 10, 10, 10]);
  for (let D = 1; D <= P.DANGERS.length + 2; D++) for (const v of [1, 4, 8]) {
    const R = P.dangerRow(D), n = P.wavesIn(v), least = Math.min(...R.pool.map((id) => P.THREAT[id]));
    for (let w = 1; w < n; w++) {
      const W = P.waveOf(D, n, w);
      assert.ok(!W.boss && !W.captain);
      if (D === 1 && w === 1) continue;
      // as strong as the table says (or a little short, when no class in the pool fits the last points)
      const want = Math.round(R.from + (R.to - R.from) * (w - 1) / (n - 2));
      assert.ok(threat(W) <= want && threat(W) > want - least, `danger ${D}, voyage ${v}, wave ${w}: ${threat(W)} for ${want}`);
      for (const g of W.groups) assert.ok(g.length >= 1 && g.length <= 4);
      for (const id of W.groups.flat()) assert.ok(R.pool.includes(id), `danger ${D}: ${id} isn't in the pool`);
    }
    const B = P.waveOf(D, n, n);
    assert.ok(B.boss && B.captain && B.captain.id === R.boss.id && B.captain.fits.length <= P.SLOTS[B.captain.id]);
  }
  assert.ok(P.waveOf(6, 10, 9).groups.length >= 2); // big waves come in more than one group
  assert.ok(threat(P.waveOf(P.DANGERS.length + 3, 10, 9)) > threat(P.waveOf(P.DANGERS.length, 10, 9))); // past the table, stronger
  for (let D = 2; D <= 16; D++) assert.ok(P.raiderLevel(D).health > P.raiderLevel(D - 1).health);
  // a wave the Captain went down in comes back weaker, down to a little under half
  for (const [D, n, w] of [[2, 6, 5], [4, 8, 7], [8, 10, 9], [13, 10, 9]]) {
    const t = [0, 1, 2, 5].map((k) => threat(P.waveOf(D, n, w, k)));
    assert.ok(t[1] < t[0] && t[2] < t[1] && t[3] <= t[2] && t[3] >= t[0] * 0.3, `danger ${D} wave ${w}: ${t}`);
  }
  assert.deepEqual(P.waveOf(1, 5, 1, 3).groups, [['skiff']]);
  assert.ok(P.waveOf(1, 5, 5, 2).captain.health < P.waveOf(1, 5, 5).captain.health);
  // Black Sky shows no mercy: its next wave doesn't ease after going down; Rough Air's does
  const c = P.newCaptain(); c.chart = 'black'; c.charts.black.tries = 3;
  assert.deepEqual(P.nextWave(c), P.waveOf(6, 5, 1, 0));
  c.chart = 'rough'; c.charts.rough.tries = 3;
  assert.ok(threat(P.nextWave(c)) < threat(P.waveOf(3, 5, 1, 0)));
});

test('shards: by danger and chart, half for a crystal kill; flying on raises the hold, going down loses it', () => {
  const c = P.newCaptain();
  const brig = P.bounty(c, 'brig', 'hull');
  assert.equal(brig, Math.round(60 * P.CHARTS.fair.pay));
  assert.equal(P.bounty(c, 'brig', 'crystals'), Math.round(60 * P.CHARTS.fair.pay / 2));
  c.charts.fair.voyage = 3; assert.equal(P.bounty(c, 'brig', 'hull'), Math.round(60 * 1.08 * P.CHARTS.fair.pay)); // 4% more each danger
  c.charts.rough.voyage = 1; c.chart = 'rough'; // the same danger on Rough Air pays more
  assert.ok(P.bounty(c, 'brig', 'hull') > Math.round(60 * 1.08 * P.CHARTS.fair.pay));
  c.chart = 'fair'; c.charts.fair.voyage = 1;
  c.hold = 100; P.flyOn(c); P.flyOn(c);
  assert.equal(P.bank(c), 120);
  assert.equal(c.shards, 120);
  c.hold = 80; c.chart = 'rough';
  assert.deepEqual(P.wentDown(c), { kept: 0, lost: 80 });
  assert.equal(c.charts.rough.tries, 1);
  c.chart = 'fair'; c.hold = 80;
  assert.deepEqual(P.wentDown(c), { kept: 40, lost: 40 }); // Fair Winds keeps half
  assert.equal(c.charts.fair.tries, 1); // the wave comes back weaker
  P.waveBeaten(c); assert.equal(c.charts.fair.tries, 0); assert.equal(c.charts.fair.wave, 2);
  c.hold = 100;
  assert.equal(P.voyageDone(c), 125);
  assert.equal(c.charts.fair.voyage, 2); assert.equal(c.charts.fair.wave, 1); assert.equal(c.best, 1);
  c.chart = 'rough'; c.charts.rough.voyage = 4; P.voyageDone(c);
  assert.equal(c.best, 6); // the best is a danger, whichever chart
});

// a Captain in this ship with every skill at `rank` and her slots filled with parts at `mark`
const kitted = (ship, rank, mark) => {
  const c = P.newCaptain(); c.ships = [...P.SHIP_ORDER]; c.ship = ship;
  for (const k in c.ranks) c.ranks[k] = rank;
  if (mark) for (const id of ['armour', 'heavyShot', 'loaders', 'storm', 'cage', 'fins'].slice(0, P.SLOTS[ship])) { c.parts[id] = mark; c.fitted[ship].push(id); }
  return c;
};

test('strength: a bigger ship and better parts and skills make a stronger one', () => {
  const c = P.newCaptain();
  assert.equal(P.kitFactor(c), 1);
  c.shards = 1e6; for (const id of P.SHIP_ORDER) P.buyShip(c, id);
  const plain = P.SHIP_ORDER.map((id) => P.strength(c, id));
  for (let i = 1; i < plain.length; i++) assert.ok(plain[i] > plain[i - 1], `${P.SHIP_ORDER[i]} ${plain[i]} vs ${plain[i - 1]}`);
  for (const id of P.SHIP_ORDER) {
    const s = [kitted(id, 0, 0), kitted(id, 3, 2), kitted(id, 6, 5)].map((k) => P.strength(k));
    assert.ok(s[0] < s[1] && s[1] < s[2], `${id}: plain ${s[0]}, half ${s[1]}, best ${s[2]}`);
  }
  // skills unlock abilities, and they count
  const ranks = kitted('brig', 2, 0), worth = P.abilityWorth(ranks);
  assert.ok(worth.guns > 1 && worth.tough > 1 && worth.handling > 1);
});

test('strength: the danger scale, and what each chart\'s voyages need', () => {
  // the danger power rises with every danger, and strength is the danger with a ship's power
  for (let D = 2; D <= 20; D++) assert.ok(P.dangerPower(D) > P.dangerPower(D - 1));
  for (const D of [1, 4, 9, 15]) assert.ok(Math.abs(P.dangerWith(P.dangerPower(D)) - D) < 1e-9);
  // on Rough Air a voyage needs its danger; Black Sky's sharper raiders need more, Fair Winds' sloppy ones less
  for (let v = 1; v <= 10; v++) assert.equal(P.needFor('rough', v), P.dangerOf('rough', v));
  for (let D = 6; D <= 15; D++) {
    const need = (ch) => P.needFor(ch, D - P.CHARTS[ch].offset);
    assert.ok(need('black') > need('rough') && need('rough') > need('fair'), `danger ${D}`);
  }
  // each chart's voyages need more and more
  for (const ch of P.CHART_ORDER) for (let v = 2; v <= 12; v++) assert.ok(P.needFor(ch, v) > P.needFor(ch, v - 1), `${ch} ${v}`);
});

test('strength: Fair Winds from the start, Black Sky only with upgrades, and its last voyage hard even with everything', () => {
  const n = P.newCaptain();
  assert.equal(P.readiness(n, 'fair'), 'ready');
  assert.equal(P.readiness(n, 'black'), 'beyond');
  // no ship with nothing fitted and no skills is ready for Black Sky's first voyage
  for (const id of P.SHIP_ORDER) assert.notEqual(P.readiness(kitted(id, 0, 0), 'black'), 'ready', id);
  // a Man-o'-war with every part at Mk V and every skill at the top is close to Black Sky's tenth voyage, but not over it
  const best = kitted('manowar', 6, 5), need = P.needFor('black', 10), s = P.strength(best);
  assert.ok(s < need + 0.5 && s >= need - 1.5, `strength ${s}, Black Sky voyage 10 needs ${need}`);
  best.charts.black.voyage = 10;
  assert.notEqual(P.readiness(best, 'black'), 'beyond');
  best.charts.black.voyage = 1;
  assert.equal(P.readiness(best, 'black'), 'ready');
});

test('saves: one from before the charts sailed Fair Winds; one from before a new ship or skill gets them', () => {
  const old = { version: 1, difficulty: 'rough', shards: 500, hold: 0, streak: 0, renown: 300, ships: ['skiff', 'cutter'], ship: 'cutter',
    parts: { armour: 2 }, fitted: { skiff: [], cutter: ['armour'], brig: [], frigate: [] }, power: { sails: 0.5, guns: 0.25, lift: 0.25 },
    ranks: { helm: 1, gunnery: 1, crew: 0 }, voyage: 4, wave: 2, best: 3, tries: 1 };
  const c = P.fromSave(old);
  assert.equal(c.version, 2);
  assert.equal(c.chart, 'fair');
  assert.deepEqual(c.charts.fair, { voyage: 4, wave: 2, tries: 0 });
  assert.ok(P.chartOpen(c, 'rough'));
  assert.equal(c.best, 3);
  assert.equal(c.ranks.crystals, 0);
  assert.deepEqual(c.fitted.galleon, []);
  assert.ok(!('voyage' in c) && !('difficulty' in c));
  assert.equal(P.fromSave({ version: 9 }), null);
  const again = P.fromSave(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(again, c);
});
