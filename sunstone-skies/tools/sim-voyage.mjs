// sim-voyage.mjs: a simulated Captain, for balancing the progression (docs/balance.md). Ways to run it:
//
//   node tools/sim-voyage.mjs campaign [minutes of game time] [stop after this many voyages]
//     a new Captain sailing the three charts: in port it shops, picks the hardest chart its ship is ready for (by the
//     strength rating; once it has nothing left to buy, the hardest that's a hard fight), and sets sail; it reports
//     every wave and every voyage, and stops when Black Sky's tenth voyage is done
//   node tools/sim-voyage.mjs wave chart voyage wave ship=brig ranks=gunnery:2,crew:2 parts=armour:1,heavyShot:2 runs=4
//     one wave again and again with that ship and kit (parts listed are fitted), and how often it's won
//     (add vs=cutter,cutter to fight those raiders instead; brig* is a raider captain in a Brig; typical=1 for the
//     typical wave the rating uses)
//   node tools/sim-voyage.mjs waves [runs] [only=best] [chart=black v=10]
//     every kit in KITS below through every wave of the voyage it's likely to sail (fresh each wave); only= picks the
//     kits whose names have that in them, and chart= and v= send them on that voyage instead
//   node tools/sim-voyage.mjs ladder [runs]
//     every kit in KITS below against bigger and bigger groups of raiders of one class
//   node tools/sim-voyage.mjs rate [runs] [chart] [ships=skiff,cutter] [how=plain,best]
//     every kit in RATE_KITS against a typical wave (the middle of a long voyage) at one danger after another, on
//     Rough Air (or the chart given): the danger each kit is ready for, which sets the strength rating's numbers
//     (POWER and UPGRADE in progress.js)
//
// The bot plays on the game's own clock, with the same rules a player has:
//   in port it spends skill points (on the skill with the fewest ranks), buys the next ship when it can, saves for it
//   when it's less than two voyages' pay away, and otherwise fills its slots with parts and upgrades them; in a fight it
//   keeps the nearest raider in its sights (broadside ships keep it abeam), fires, and uses its abilities; after a wave
//   it puts in to port when hurt or after two waves, else flies on.
// Build first: node tools/build.mjs game
import { chromium } from 'playwright';
import * as P from '../src/game/progress.js';

const root = new URL('..', import.meta.url).pathname;
const [mode = 'campaign', ...rest] = process.argv.slice(2);
const kv = Object.fromEntries(rest.filter((a) => a.includes('=')).map((a) => a.split('=')));
const args = rest.filter((a) => !a.includes('='));
const nums = args.map(Number).filter((x) => !Number.isNaN(x));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const DT = 1 / 30; // a coarser clock than the game's own, to sail faster; the fights come out the same

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('file://' + root + 'dist/game.html', { timeout: 300000 });
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 300000 });
  await page.evaluate(install, { DT });
  return page;
}
async function openPages(n) { const out = []; for (let i = 0; i < n; i++) out.push(await openPage()); return out; } // one after another: they load faster

function install({ DT }) {
  localStorage.clear();
  const g = window.__game;
  window.requestAnimationFrame = () => 0; // stop drawing: the bot runs the clock itself
  g.begin('campaign', true);
  const P = g.P, PRIORITY = ['armour', 'heavyShot', 'loaders', 'storm', 'cage', 'fins'], SKILL = ['gunnery', 'crew', 'helm', 'crystals'];
  const bot = window.__bot = { t: 0, log: [], wave: null, shopping: true, choose: null, done: 0, after: 0, earned: 0, last: 400, paid: [], cap: 900 }; // cap: a fight still going after this many seconds is called slow
  const voyagesDone = (c) => P.CHART_ORDER.reduce((a, id) => a + P.doneOn(c, id), 0);
  // in port: skills, then the next ship as soon as it's affordable; parts when the next ship is more than two voyages'
  // pay away (it saves for the ship when it's close), the parts it uses most first, then their upgrades; then the chart
  bot.shop = () => {
    const c = g.captain;
    if (bot.shopping) {
      // what the last voyage paid (its last hold is banked as the next one begins), to judge how far off the next ship is
      bot.earned += Math.max(0, c.shards - bot.after);
      if (voyagesDone(c) !== bot.done) { bot.paid.push(bot.earned); bot.last = Math.max(200, bot.earned); bot.earned = 0; bot.done = voyagesDone(c); }
      // each point to the skill with the fewest ranks (Gunnery first when they're level)
      for (let i = 0; P.skillPoints(c) > 0 && i < 30; i++) P.rankUp(c, [...SKILL].sort((a, b) => c.ranks[a] - c.ranks[b])[0]);
      const next = P.SHIP_ORDER[P.SHIP_ORDER.indexOf(c.ships.at(-1)) + 1];
      if (next && c.shards >= P.SHIP_PRICE[next]) { P.buyShip(c, next); P.chooseShip(c, next); }
      const after = P.SHIP_ORDER[P.SHIP_ORDER.indexOf(c.ships.at(-1)) + 1];
      const saving = after && P.SHIP_PRICE[after] - c.shards <= bot.last * 2; // the next ship is within two voyages' pay: save
      if (!saving) {
        for (const id of PRIORITY) {
          if (c.fitted[c.ship].length >= P.SLOTS[c.ship] && !c.fitted[c.ship].includes(id)) continue;
          if (!c.parts[id] && c.shards >= P.partById(id).price[0]) P.buyPart(c, id);
        }
        // upgrade what's fitted, cheapest first
        for (let pass = 0; pass < 3; pass++) for (const id of [...c.fitted[c.ship]].sort((a, b) => P.partById(a).price[c.parts[a] ?? 0] - P.partById(b).price[c.parts[b] ?? 0])) {
          const m = c.parts[id]; if (m >= P.MAX_MARK || !P.markOpen(c, m + 1)) continue;
          if (c.shards >= P.partById(id).price[m]) P.buyPart(c, id);
        }
      }
      for (const id of PRIORITY) if (c.parts[id]) P.fitPart(c, id);
      // the chart: the hardest one the ship is ready for (once there's nothing left to buy, the hardest one that's a
      // hard fight); failing that, the one closest to ready
      const open = P.CHART_ORDER.filter((id) => P.chartOpen(c, id));
      const margin = (id) => P.strength(c) - P.needFor(id, P.on(c, id).voyage);
      const maxed = c.ships.length === P.SHIP_ORDER.length && c.fitted[c.ship].length === P.SLOTS[c.ship]
        && c.fitted[c.ship].every((id) => c.parts[id] === P.MAX_MARK) && Object.values(c.ranks).every((r) => r === P.MAX_RANK);
      const ok = maxed ? ['ready', 'hard'] : ['ready'];
      c.chart = [...open].reverse().find((id) => ok.includes(P.readiness(c, id))) ?? open.reduce((a, b) => (margin(b) > margin(a) ? b : a));
      bot.after = c.shards;
      P.save(c);
    }
    g.garage.render(); document.getElementById('g-sail').click(); // set sail (leaving port refits the ship)
  };
  // in a fight: the nearest raider in the sights, abilities when they help
  bot.fight = () => {
    const P2 = g.player, live = g.raiders.list.filter((r) => !r.f.down);
    if (!live.length || P2.down) return { fire: false, sail: 0, sailTo: 0.6, turn: 0, climb: 0 };
    live.sort((a, b) => a.f.pos.distanceTo(P2.pos) - b.f.pos.distanceTo(P2.pos));
    const r = live[0], T = P2.pos.clone(); T.y += P2.ship.recipe.length * 0.42 + 2;
    const look = r.f.pos.clone().sub(T).normalize();
    g.cam.pitch = Math.max(-0.35, -Math.asin(look.y)); const a = Math.atan2(look.x, look.z) - P2.heading; g.cam.yaw = Math.atan2(Math.sin(a), Math.cos(a));
    const d = r.f.pos.distanceTo(P2.pos), bs = P2.ship.recipe.ports ? 1 : 0;
    const want = bs && d < 700 ? g.cam.yaw - Math.sign(g.cam.yaw || 1) * Math.PI / 2 : g.cam.yaw;
    if (d < 500) g.abilities.use('double');
    if (d < 400 || P2.frac('hull') < 0.6) g.abilities.use('ward');
    if (P2.frac('hull') < 0.5 || P2.frac('crystals') < 0.55 || P2.frac('sails') < 0.4) g.abilities.use('control');
    if (d > 600) g.abilities.use('surge');
    return { fire: true, turn: Math.max(-1, Math.min(1, -want * 2)), climb: Math.max(-1, Math.min(1, (r.f.pos.y - P2.pos.y) / 40)), sail: 0, sailTo: 0.75 };
  };
  const label = (c) => `${c.chart[0].toUpperCase()}${P.on(c).voyage}`;
  // run the game for a while; report what happened
  bot.run = (seconds) => {
    const W = g.waves, c = g.captain;
    for (let s = 0; s < seconds; s += 0.25) {
      if (W.state === 'port') { bot.shop(); continue; }
      if (W.state === 'after') {
        const P2 = g.player, hurt = Math.min(P2.frac('hull'), P2.frac('sails'), P2.frac('crystals'));
        const port = bot.choose ? bot.choose() : hurt < 0.6 || c.streak >= 2;
        document.getElementById(port ? 'btn-port' : 'btn-flyon').click();
        continue;
      }
      if (W.state === 'calm' && (bot.vs || bot.typical)) { // these raiders instead of the voyage's wave
        const D = P.danger(c), level = P.raiderLevel(D);
        if (bot.vs) {
          const ids = bot.vs.map((x) => x.replace('*', '')), boss = P.waveOf(D, 10, 10).captain;
          W.groups = [ids];
          g.raiders.spawnWave(ids, g.player, { chart: c.chart, level, captain: bot.vs[0].endsWith('*') ? { ...boss, id: ids[0] } : null });
        } else {
          W.groups = P.waveOf(D, 9, 4 + (bot.k % 3)).groups.map((x) => [...x]); // a typical wave: the middle of a long voyage (waves 4 to 6 of 9 in turn)
          g.raiders.spawnWave(W.groups[0], g.player, { chart: c.chart, level });
        }
        W.wave = { boss: false }; W.next = 1; W.threat = W.groups[0].reduce((a, id) => a + P.THREAT[id], 0);
        W.state = 'fight';
      }
      if (W.state === 'fight' && !bot.wave) bot.wave = { at: label(c), D: P.danger(c), w: P.on(c).wave, t: bot.t, low: 1, ship: c.ship, raiders: g.raiders.list.filter((r) => !r.f.down).map((r) => (r.captain ? `${r.name} (${r.id})` : r.id)).join(' '), more: W.groups.slice(1).map((x) => x.join(' ')).join(' + ') };
      const ctl = W.state === 'fight' ? bot.fight() : { fire: false, sail: 0, sailTo: 0.6 };
      g.step(0.25, ctl, DT); bot.t += 0.25;
      if (bot.wave) bot.wave.low = Math.min(bot.wave.low, g.player.frac('hull'));
      const slow = bot.wave && bot.t - bot.wave.t > bot.cap, done = bot.wave && (W.state !== 'fight' || W.lost > 0 || slow);
      if (done) {
        const b = bot.wave, lost = W.lost > 0 || g.player.down;
        bot.log.push({ ...b, time: Math.round(bot.t - b.t), low: Math.round(b.low * 100), outcome: lost ? 'LOST' : slow ? 'slow' : 'won', hold: c.hold, shards: c.shards, level: P.levelOf(c.renown).level, strength: P.strength(c) });
        if (slow) g.director.toPort('In port', '');
        bot.wave = null;
        if (lost) g.step(8, {}, DT); // towed home
      }
    }
    const out = bot.log.splice(0);
    return { out, t: bot.t, done: voyagesDone(c), charts: c.charts, shards: c.shards, ships: c.ships, parts: c.parts, fitted: c.fitted[c.ship], ranks: c.ranks, level: P.levelOf(c.renown).level, strength: P.strength(c), paid: bot.paid };
  };
  // set the Captain up for one wave, with this ship and kit, fresh in port, on a chart's voyage (any chart, open or not)
  bot.setup = ({ chart = 'rough', v, w = 1, ship, ranks, parts, vs, typical }) => {
    const c = g.captain;
    Object.assign(c, { hold: 0, streak: 0, shards: 0, ship, ships: [...P.SHIP_ORDER], chart });
    c.charts[chart] = { voyage: v, wave: w, tries: 0 };
    c.best = Math.max(0, P.dangerOf(chart, v) - 1);
    c.ranks = { helm: 0, gunnery: 0, crew: 0, crystals: 0, ...ranks };
    c.parts = { ...parts }; c.fitted[ship] = Object.keys(parts);
    c.renown = 0; for (let n = 1; n <= Object.values(c.ranks).reduce((a, b) => a + b, 0); n++) c.renown += P.levelCost(n);
    bot.shopping = false; bot.choose = () => true; bot.wave = null; bot.log = []; bot.vs = vs ?? null; bot.typical = !!typical; bot.k = (bot.k ?? 0) + 1;
    g.director.toPort('In port', '');
  };
}

const row = (w) => `${w.at.padStart(4)} ${String(w.D).padStart(4)} ${String(w.w).padStart(4)}  ${w.ship.padEnd(8)} ${String(w.time).padStart(5)} s ${String(w.low).padStart(8)}%   ${w.outcome.padEnd(7)} ${String(w.level).padStart(5)} ${w.strength.toFixed(1).padStart(8)} ${String(w.hold).padStart(5)} ${String(w.shards).padStart(7)}  ${w.raiders}${w.more ? ` + ${w.more}` : ''}`;
const head = 'sail  dgr wave  ship      time  lowest hull  outcome  level strength  hold  shards  raiders';

const list = (str) => Object.fromEntries((str ?? '').split(',').filter(Boolean).map((x) => { const [k, n] = x.split(':'); return [k, +(n ?? 1)]; }));
// sail one setup `runs` times on a page; how it went
async function trial(page, setup, runs, print) {
  let won = 0, slow = 0, time = 0, low = 0, n = 0;
  for (let i = 0; i < runs; i++) {
    await page.evaluate((s) => window.__bot.setup(s), setup);
    let got = [];
    for (let k = 0; k < 40 && !got.length; k++) got = (await page.evaluate(() => window.__bot.run(30))).out; // up to 20 minutes: past the slow cap
    for (const x of got.slice(0, 1)) { if (print) console.log(row(x)); n++; won += x.outcome === 'won'; slow += x.outcome === 'slow'; time += x.time; low += x.outcome === 'won' ? x.low : 0; }
  }
  return { won, slow, n, time: Math.round(time / Math.max(1, n)), low: won ? Math.round(low / won) : null };
}
// run jobs on several pages at once
async function pool(pages, jobs, work) {
  let next = 0;
  await Promise.all(pages.map(async (page) => { while (next < jobs.length) { const j = jobs[next++]; await work(page, j); } }));
}

// The kits a Captain might have at each stage (ship, skill ranks, fitted parts), and the voyage they're likely to sail
const KITS = [
  { name: 'Skiff, new', chart: 'fair', v: 1, ship: 'skiff', ranks: {}, parts: {} },
  { name: 'Cutter, new', chart: 'fair', v: 2, ship: 'cutter', ranks: { gunnery: 1, crew: 1 }, parts: { armour: 1 } },
  { name: 'Cutter, seasoned', chart: 'rough', v: 1, ship: 'cutter', ranks: { gunnery: 2, crew: 1, helm: 1 }, parts: { armour: 1, heavyShot: 1 } },
  { name: 'Brig, new', chart: 'rough', v: 2, ship: 'brig', ranks: { gunnery: 2, crew: 2, helm: 1, crystals: 1 }, parts: { armour: 2, heavyShot: 1, loaders: 1 } },
  { name: 'Brig, seasoned', chart: 'rough', v: 3, ship: 'brig', ranks: { gunnery: 3, crew: 3, helm: 2, crystals: 2 }, parts: { armour: 2, heavyShot: 2, loaders: 1 } },
  { name: 'Frigate, new', chart: 'black', v: 1, ship: 'frigate', ranks: { gunnery: 4, crew: 4, helm: 2, crystals: 2 }, parts: { armour: 3, heavyShot: 2, loaders: 2, storm: 1 } },
  { name: 'Galleon, new', chart: 'black', v: 3, ship: 'galleon', ranks: { gunnery: 5, crew: 5, helm: 4, crystals: 4 }, parts: { armour: 4, heavyShot: 4, loaders: 3, storm: 3, cage: 2 } },
  { name: 'Man-o\'-war, new', chart: 'black', v: 6, ship: 'manowar', ranks: { gunnery: 6, crew: 6, helm: 5, crystals: 5 }, parts: { armour: 5, heavyShot: 5, loaders: 4, storm: 4, cage: 3, fins: 3 } },
  { name: 'Man-o\'-war, at her best', chart: 'black', v: 10, ship: 'manowar', ranks: { gunnery: 6, crew: 6, helm: 6, crystals: 6 }, parts: { armour: 5, heavyShot: 5, loaders: 5, storm: 5, cage: 5, fins: 5 } },
];
const GROUPS = { skiff: [1, 2, 3, 4, 5], cutter: [1, 2, 3, 4], brig: [1, 2, 3], frigate: [1, 2, 3], galleon: [1, 2, 3], manowar: [1, 2] };
// For the strength rating: every ship plain, with only skills, with only parts, half-upgraded, and at her best (her
// slots filled in this order)
const FILL = ['armour', 'heavyShot', 'loaders', 'storm', 'cage', 'fins'];
const kitOf = (ship, rank, mark) => ({ ship, ranks: Object.fromEntries(['gunnery', 'crew', 'helm', 'crystals'].map((k) => [k, rank])),
  parts: Object.fromEntries(FILL.slice(0, mark ? P.SLOTS[ship] : 0).map((id) => [id, mark])) });
const HOW = [['plain', 0, 0], ['skills', 6, 0], ['parts', 0, 5], ['half', 3, 2], ['best', 6, 5]];
const RATE_KITS = P.SHIP_ORDER.flatMap((ship) => HOW.map(([how, rank, mark]) => ({ name: `${ship}, ${how}`, how, ...kitOf(ship, rank, mark) })));
// the kit on a Captain: its strength number from progress.js (on a chart: the danger there it's rated for), and its
// kit factor
function rated(K, chart = 'rough') {
  const c = P.newCaptain(); c.ships = [...P.SHIP_ORDER]; c.ship = K.ship; c.ranks = { ...c.ranks, ...K.ranks }; c.parts = { ...K.parts }; c.fitted[K.ship] = Object.keys(K.parts);
  return { strength: P.strength(c), onChart: Math.round(P.dangerWith(P.shipPower(c) - P.CHARTS[chart].power) * 10) / 10, factor: P.kitFactor(c) };
}

if (mode === 'wave') {
  const [chart = 'rough', v = 1, w = 1] = [args[0], +(args[1] ?? 1), +(args[2] ?? 1)], runs = +(kv.runs ?? 4);
  const setup = { chart, v, w, ship: kv.ship ?? 'skiff', ranks: list(kv.ranks), parts: list(kv.parts), vs: kv.vs ? kv.vs.split(',') : null, typical: !!kv.typical };
  console.log(`Sunstone Skies: ${P.CHARTS[chart].name}, voyage ${v} (danger ${P.dangerOf(chart, v)}), ${setup.vs ? setup.vs.join(' ') : setup.typical ? 'a typical wave' : `wave ${w}`}, ${runs} times, in the ${setup.ship}, ranks ${JSON.stringify(setup.ranks)}, parts ${JSON.stringify(setup.parts)}`);
  console.log(head);
  const r = await trial(await openPage(), setup, runs, true);
  console.log(`won ${r.won} of ${r.n}; ${r.time} s a fight; lowest hull when won ${r.low ?? '-'}%`);
} else if (mode === 'waves') {
  const runs = nums[0] ?? 4, pages = await openPages(3), results = new Map(), jobs = [];
  const kits = KITS.filter((K) => !kv.only || K.name.toLowerCase().includes(kv.only.toLowerCase()))
    .map((K) => ({ ...K, chart: kv.chart ?? K.chart, v: kv.v ? +kv.v : K.v }));
  for (const K of kits) for (let w = 1; w <= P.wavesIn(K.v); w++) jobs.push({ K, w });
  await pool(pages, jobs, async (page, { K, w }) => results.set(`${K.name}|${w}`, await trial(page, { chart: K.chart, v: K.v, w, ship: K.ship, ranks: K.ranks, parts: K.parts }, runs, false)));
  console.log(`Sunstone Skies: each kit through each wave of its voyage, fresh from port, ${runs} times`);
  console.log('wins out of fights (average seconds a fight, lowest hull when won)');
  for (const K of kits) {
    const n = P.wavesIn(K.v), D = P.dangerOf(K.chart, K.v), waves = Array.from({ length: n }, (_, i) => P.waveOf(D, n, i + 1));
    console.log(`\n${K.name}: ${P.CHARTS[K.chart].name} voyage ${K.v} (danger ${D}), in the ${K.ship} (strength ${rated(K).strength}), ranks ${JSON.stringify(K.ranks)}, parts ${JSON.stringify(K.parts)}`);
    waves.forEach((W, i) => {
      const r = results.get(`${K.name}|${i + 1}`), who = (W.captain ? `${W.captain.name} (${W.captain.id}) + ` : '') + W.groups.map((g) => g.join(' ')).join(' | then ');
      console.log(`  wave ${String(i + 1).padStart(2)}  ${`${r.won}/${r.n}`.padEnd(4)} ${`${r.time} s`.padStart(6)} ${r.low != null ? `${r.low}%`.padStart(5) : '    -'}   ${who}`);
    });
  }
} else if (mode === 'ladder') {
  const runs = nums[0] ?? 4, pages = await openPages(3), results = new Map(), jobs = [];
  for (const K of KITS) for (const [cls, ns] of Object.entries(GROUPS)) for (const n of ns) jobs.push({ K, cls, n });
  await pool(pages, jobs, async (page, { K, cls, n }) => {
    // no point sending a Skiff against three Frigates: skip groups past what the kit lost to a size smaller
    const before = results.get(`${K.name}|${cls}|${n - 1}`);
    if (before && before.won === 0) { results.set(`${K.name}|${cls}|${n}`, { won: 0, n: 0 }); return; }
    results.set(`${K.name}|${cls}|${n}`, await trial(page, { chart: K.chart, v: K.v, w: 1, ship: K.ship, ranks: K.ranks, parts: K.parts, vs: Array(n).fill(cls) }, runs, false));
  });
  console.log(`Sunstone Skies: each kit against groups of one class, ${runs} fights each, raiders at the kit's voyage`);
  console.log('wins out of fights (average seconds a fight, lowest hull when won)');
  for (const K of KITS) {
    console.log(`\n${K.name} (${P.CHARTS[K.chart].name} voyage ${K.v}, danger ${P.dangerOf(K.chart, K.v)}): ${K.ship}, ranks ${JSON.stringify(K.ranks)}, parts ${JSON.stringify(K.parts)}`);
    for (const [cls, ns] of Object.entries(GROUPS)) {
      console.log(`  ${cls.padEnd(8)}` + ns.map((n) => { const r = results.get(`${K.name}|${cls}|${n}`); return `${n}: ${r.n ? `${r.won}/${r.n} (${r.time}s${r.low != null ? `, ${r.low}%` : ''})` : '-'}`.padEnd(20); }).join(''));
    }
  }
} else if (mode === 'rate') {
  // each kit against a typical wave at one danger after another: up while it still wins, down until it wins every fight
  const runs = nums[0] ?? 6, chart = args.find((a) => P.CHARTS[a]) ?? 'rough', pages = await openPages(3), only = kv.ships?.split(',');
  const hows = kv.how?.split(','), kits = RATE_KITS.filter((K) => (!only || only.includes(K.ship)) && (!hows || hows.includes(K.how))), byKit = new Map();
  const fight = async (page, K, D) => {
    const key = `${K.name}|${D}`;
    if (!byKit.has(key)) byKit.set(key, await trial(page, { chart, v: D - P.CHARTS[chart].offset, ship: K.ship, ranks: K.ranks, parts: K.parts, typical: true }, runs, false));
    return byKit.get(key);
  };
  const ratingOf = new Map();
  await pool(pages, kits, async (page, K) => {
    let D = Math.max(1, Math.round(rated(K).strength)), r = await fight(page, K, D);
    while (r.won / r.n >= 0.75 && D < 22) r = await fight(page, K, ++D); // up until it fails
    while (D > 1) { const s = await fight(page, K, D - 1); if (s.won / s.n >= 0.75) break; D--; } // down to one it passes
    // the rating: the last danger it passes, plus how far towards passing the next
    const lo = byKit.get(`${K.name}|${D - 1}`), hi = byKit.get(`${K.name}|${D}`);
    const pass = lo ? lo.won / lo.n : 1, fail = hi.won / hi.n;
    ratingOf.set(K.name, Math.max(0.5, (D - 1) + (pass > fail ? Math.min(1, (pass - 0.75) / (pass - fail)) : 0)));
    console.log(`${K.name.padEnd(18)} measured ${ratingOf.get(K.name).toFixed(1).padStart(5)}   (progress.js says ${rated(K, chart).onChart})   ` +
      [...byKit].filter(([k]) => k.startsWith(K.name + '|')).sort((a, b) => +a[0].split('|')[1] - +b[0].split('|')[1]).map(([k, x]) => `${k.split('|')[1]}: ${x.won}/${x.n}${x.slow ? ` (${x.slow} slow)` : ''}`).join(' '));
  });
  // how well progress.js matches, and the BASE (per ship) and UPGRADE that would match these measurements best:
  // a measured rating on this chart is a ship's power of that danger's, plus the chart's (progress.js strength)
  const pts = kits.map((K) => ({ ship: K.ship, y: ratingOf.get(K.name), x: Math.log2(rated(K, chart).factor) })), ships = [...new Set(pts.map((p) => p.ship))];
  const powerOf = (D) => P.dangerPower(D) + P.CHARTS[chart].power, toD = (power) => P.dangerWith(power - P.CHARTS[chart].power);
  const miss = (base, b) => Math.sqrt(pts.reduce((s2, p) => s2 + (toD(base[p.ship] + b * p.x) - p.y) ** 2, 0) / pts.length);
  let best = null;
  for (let b = 1.5; b <= 4.01; b += 0.05) {
    const base = Object.fromEntries(ships.map((ship) => { const q = pts.filter((p) => p.ship === ship); return [ship, q.reduce((s2, p) => s2 + powerOf(p.y) - b * p.x, 0) / q.length]; }));
    const m = miss(base, b); if (!best || m < best.m) best = { m, b, base };
  }
  console.log(`\nOn ${P.CHARTS[chart].name}, ${runs} fights a point. progress.js misses by ${miss(P.BASE, P.UPGRADE).toFixed(2)} dangers, typically.`);
  console.log(`These measurements alone fit best (typically ${best.m.toFixed(2)} off) with:`);
  console.log(`  export const BASE = ${JSON.stringify(Object.fromEntries(Object.entries(best.base).map(([k, v]) => [k, Math.round(v * 100) / 100])))};`);
  console.log(`  export const UPGRADE = ${Math.round(best.b * 100) / 100};`);
} else {
  const [minutes = 600, stopAt = 30] = nums, page = await openPage();
  console.log(`Sunstone Skies: a simulated Captain on the three charts, up to ${minutes} minutes of game time or ${stopAt} voyages`);
  console.log(head);
  let t = 0, done = 0, charts = null;
  while (t < minutes * 60 && done < stopAt) {
    const r = await page.evaluate(() => window.__bot.run(60));
    for (const w of r.out) console.log(row(w));
    if (r.done !== done) {
      // which chart's voyage just ended
      const id = P.CHART_ORDER.find((k) => r.charts[k].voyage !== charts?.[k]?.voyage) ?? '?';
      const v = r.charts[id] ? r.charts[id].voyage - 1 : '?';
      console.log(`  -- ${P.CHARTS[id]?.name ?? id} voyage ${v} (danger ${P.CHARTS[id] ? P.dangerOf(id, v) : '?'}) done at ${Math.round(r.t / 60)} min: paid ${r.paid.at(-1) ?? '?'} (the voyage before), ${r.shards} shards, ships ${r.ships.join(' ')}, strength ${r.strength}, parts ${JSON.stringify(r.parts)}, ranks ${JSON.stringify(r.ranks)}, level ${r.level}`);
    }
    t = r.t; done = r.done; charts = JSON.parse(JSON.stringify(r.charts));
    if (charts.black.voyage > 10) break; // Black Sky's tenth voyage done: the end of the charts
  }
  console.log(`stopped at ${Math.round(t / 60)} min of game time, ${done} voyages done: ${P.CHART_ORDER.map((k) => `${P.CHARTS[k].name} ${charts[k].voyage - 1}`).join(', ')}`);
}
await browser.close();
