// sim-voyage.mjs: a simulated Captain, for balancing the progression (docs/balance.md). Two ways to run it:
//
//   node tools/sim-voyage.mjs campaign [fair|rough|black] [minutes of game time] [stop after voyage]
//     sails voyage after voyage from a new Captain, shopping in port, and reports every wave and every voyage
//   node tools/sim-voyage.mjs wave [difficulty] voyage wave ship=brig ranks=gunnery:2,crew:2 parts=armour:1,heavyShot:2 runs=4
//     sails one wave again and again with that ship and kit (parts listed are fitted), and reports how often it's won
//     (add vs=cutter,cutter to fight those raiders instead of the voyage's wave; brig* is a raider captain in a Brig)
//   node tools/sim-voyage.mjs waves [difficulty] [runs]
//     every kit in KITS below through every wave of the voyage it's likely to sail (fresh each wave): the table in balance.md
//   node tools/sim-voyage.mjs ladder [difficulty] [runs]
//     every kit in KITS below against bigger and bigger groups of raiders: how much each kit can take on (balance.md)
//
// The bot plays on the game's own clock, with the same rules a player has:
//   in port it spends skill points (on the skill with the fewest ranks), buys the next ship when it can, saves for it
//   when it's less than two voyages' pay away, and otherwise fills its slots with parts and upgrades them; in a fight it
//   keeps the nearest raider in its sights (broadside ships keep it abeam), fires, and uses its abilities; after a wave
//   it puts in to port when hurt or after two waves, else flies on.
// Build first: node tools/build.mjs game
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const [mode = 'campaign', difficulty = 'rough', ...rest] = process.argv.slice(2);
const kv = Object.fromEntries(rest.filter((a) => a.includes('=')).map((a) => a.split('=')));
const nums = rest.filter((a) => !a.includes('=')).map(Number);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const DT = 1 / 30; // a coarser clock than the game's own, to sail faster; the fights come out the same

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('file://' + root + 'dist/game.html', { timeout: 300000 });
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 300000 });
  await page.evaluate(install, { difficulty, DT });
  return page;
}

function install({ difficulty, DT }) {
  localStorage.clear();
  const g = window.__game;
  window.requestAnimationFrame = () => 0; // stop drawing: the bot runs the clock itself
  g.begin('campaign', difficulty);
  const P = g.P, PRIORITY = ['armour', 'heavyShot', 'loaders', 'storm', 'cage', 'fins'], SKILL = ['gunnery', 'crew', 'helm', 'crystals'];
  const bot = window.__bot = { t: 0, log: [], wave: null, shopping: true, choose: null, v: 1, after: 0, earned: 0, last: 400, paid: {} };
  // in port: skills, then the next ship as soon as it's affordable; parts when the next ship is more than a voyage's
  // pay away (it saves for the ship when it's close), the parts it uses most first, then their upgrades
  bot.shop = () => {
    const c = g.captain;
    if (bot.shopping) {
      // what the last voyage paid (its last hold is banked as the next one begins), to judge how far off the next ship is
      bot.earned += Math.max(0, c.shards - bot.after);
      if (c.voyage !== bot.v) { bot.paid[bot.v] = bot.earned; bot.last = Math.max(200, bot.earned); bot.earned = 0; bot.v = c.voyage; }
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
      if (W.state === 'calm' && bot.vs) { // these raiders instead of the voyage's wave
        const v = c.voyage, ids = bot.vs.map((x) => x.replace('*', '')), boss = P.waveOf(v, P.wavesIn(v)).captain;
        W.wave = { boss: false }; W.groups = [ids]; W.next = 1;
        g.raiders.spawnWave(ids, g.player, { difficulty: c.difficulty, level: P.raiderLevel(v), captain: bot.vs[0].endsWith('*') ? { ...boss, id: ids[0] } : null });
        W.state = 'fight';
      }
      if (W.state === 'fight' && !bot.wave) bot.wave = { v: c.voyage, w: c.wave, t: bot.t, low: 1, ship: c.ship, raiders: g.raiders.list.filter((r) => !r.f.down).map((r) => (r.captain ? `${r.name} (${r.id})` : r.id)).join(' '), more: (W.groups[1] ?? []).join(' ') };
      const ctl = W.state === 'fight' ? bot.fight() : { fire: false, sail: 0, sailTo: 0.6 };
      g.step(0.25, ctl, DT); bot.t += 0.25;
      if (bot.wave) bot.wave.low = Math.min(bot.wave.low, g.player.frac('hull'));
      const slow = bot.wave && bot.t - bot.wave.t > 300, done = bot.wave && (W.state !== 'fight' || W.lost > 0 || slow);
      if (done) {
        const b = bot.wave, lost = W.lost > 0 || g.player.down;
        bot.log.push({ ...b, time: Math.round(bot.t - b.t), low: Math.round(b.low * 100), outcome: lost ? 'LOST' : slow ? 'slow' : 'won', hold: c.hold, shards: c.shards, level: P.levelOf(c.renown).level });
        if (slow) g.director.toPort('In port', '');
        bot.wave = null;
        if (lost) g.step(8, {}, DT); // towed home
      }
    }
    const out = bot.log.splice(0);
    return { out, t: bot.t, voyage: c.voyage, shards: c.shards, ships: c.ships, parts: c.parts, fitted: c.fitted[c.ship], ranks: c.ranks, level: P.levelOf(c.renown).level, paid: bot.paid };
  };
  // set the Captain up for one wave, with this ship and kit, fresh in port
  bot.setup = ({ v, w, ship, ranks, parts, vs }) => {
    const c = g.captain;
    Object.assign(c, { voyage: v, wave: w, hold: 0, streak: 0, shards: 0, ship, ships: [...P.SHIP_ORDER] });
    c.ranks = { helm: 0, gunnery: 0, crew: 0, crystals: 0, ...ranks };
    c.parts = { ...parts }; c.fitted[ship] = Object.keys(parts);
    c.renown = 0; for (let n = 1; n <= Object.values(c.ranks).reduce((a, b) => a + b, 0); n++) c.renown += P.levelCost(n);
    bot.shopping = false; bot.choose = () => true; bot.wave = null; bot.log = []; bot.vs = vs ?? null;
    g.director.toPort('In port', '');
  };
}

const row = (w) => `${String(w.v).padStart(6)} ${String(w.w).padStart(4)}  ${w.ship.padEnd(8)} ${String(w.time).padStart(5)} s ${String(w.low).padStart(8)}%   ${w.outcome.padEnd(7)} ${String(w.level).padStart(5)} ${String(w.hold).padStart(5)} ${String(w.shards).padStart(7)}  ${w.raiders}${w.more ? ` + ${w.more}` : ''}`;
const head = 'voyage wave  ship      time  lowest hull  outcome  level  hold  shards  raiders';

const list = (str) => Object.fromEntries((str ?? '').split(',').filter(Boolean).map((x) => { const [k, n] = x.split(':'); return [k, +(n ?? 1)]; }));
// sail one setup `runs` times on a page; the waves' rows, and how it went
async function trial(page, setup, runs, print) {
  let won = 0, time = 0, low = 0, n = 0;
  for (let i = 0; i < runs; i++) {
    await page.evaluate((s) => window.__bot.setup(s), setup);
    let got = [];
    for (let k = 0; k < 12 && !got.length; k++) got = (await page.evaluate(() => window.__bot.run(30))).out;
    for (const x of got.slice(0, 1)) { if (print) console.log(row(x)); n++; won += x.outcome === 'won'; time += x.time; low += x.outcome === 'won' ? x.low : 0; }
  }
  return { won, n, time: Math.round(time / Math.max(1, n)), low: won ? Math.round(low / won) : null };
}

// The kits a Captain might have at each stage (ship, skill ranks, fitted parts), and the raiders to try them on
const KITS = [
  { name: 'Skiff, new', v: 1, ship: 'skiff', ranks: {}, parts: {} },
  { name: 'Skiff, voyage 1 done', v: 1, ship: 'skiff', ranks: { gunnery: 1, crew: 1 }, parts: { armour: 1 } },
  { name: 'Cutter, new', v: 2, ship: 'cutter', ranks: { gunnery: 2, crew: 1, helm: 1 }, parts: { armour: 1, heavyShot: 1 } },
  { name: 'Cutter, seasoned', v: 3, ship: 'cutter', ranks: { gunnery: 2, crew: 2, helm: 1, crystals: 1 }, parts: { armour: 2, heavyShot: 1 } },
  { name: 'Brig, new', v: 3, ship: 'brig', ranks: { gunnery: 3, crew: 2, helm: 1, crystals: 1 }, parts: { armour: 2, heavyShot: 1, loaders: 1 } },
  { name: 'Brig, seasoned', v: 4, ship: 'brig', ranks: { gunnery: 3, crew: 3, helm: 2, crystals: 2 }, parts: { armour: 2, heavyShot: 2, loaders: 1 } },
  { name: 'Frigate, new', v: 5, ship: 'frigate', ranks: { gunnery: 4, crew: 4, helm: 2, crystals: 2 }, parts: { armour: 2, heavyShot: 2, loaders: 2, storm: 1 } },
  { name: 'Frigate, at her best', v: 6, ship: 'frigate', ranks: { gunnery: 5, crew: 5, helm: 3, crystals: 3 }, parts: { armour: 4, heavyShot: 3, loaders: 3, storm: 3 } },
  { name: 'Galleon, new', v: 7, ship: 'galleon', ranks: { gunnery: 5, crew: 5, helm: 4, crystals: 4 }, parts: { armour: 4, heavyShot: 4, loaders: 3, storm: 3, cage: 2 } },
  { name: 'Man-o\'-war, new', v: 9, ship: 'manowar', ranks: { gunnery: 6, crew: 6, helm: 5, crystals: 5 }, parts: { armour: 5, heavyShot: 5, loaders: 4, storm: 4, cage: 3, fins: 3 } },
];
const GROUPS = { skiff: [1, 2, 3, 4, 5], cutter: [1, 2, 3, 4], brig: [1, 2, 3], frigate: [1, 2, 3], galleon: [1, 2, 3], manowar: [1, 2] };

if (mode === 'wave') {
  const [v = 1, w = 1] = nums, runs = +(kv.runs ?? 4);
  const setup = { v, w, ship: kv.ship ?? 'skiff', ranks: list(kv.ranks), parts: list(kv.parts), vs: kv.vs ? kv.vs.split(',') : null };
  console.log(`Sunstone Skies on ${difficulty}: voyage ${v}, ${setup.vs ? setup.vs.join(' ') : `wave ${w}`}, ${runs} times, in the ${setup.ship}, ranks ${JSON.stringify(setup.ranks)}, parts ${JSON.stringify(setup.parts)}`);
  console.log(head);
  const r = await trial(await openPage(), setup, runs, true);
  console.log(`won ${r.won} of ${r.n}; ${r.time} s a fight; lowest hull when won ${r.low ?? '-'}%`);
} else if (mode === 'waves') {
  const runs = nums[0] ?? 4, pages = [], P = await import('../src/game/progress.js');
  for (let i = 0; i < 3; i++) pages.push(await openPage()); // one after another: the pages load faster that way
  const jobs = [];
  for (const K of KITS) for (let w = 1; w <= P.wavesIn(K.v); w++) jobs.push({ K, w });
  const results = new Map();
  let next = 0;
  await Promise.all(pages.map(async (page) => {
    while (next < jobs.length) {
      const { K, w } = jobs[next++];
      results.set(`${K.name}|${w}`, await trial(page, { v: K.v, w, ship: K.ship, ranks: K.ranks, parts: K.parts }, runs, false));
    }
  }));
  console.log(`Sunstone Skies on ${difficulty}: each kit through each wave of its voyage, fresh from port, ${runs} times`);
  console.log('wins out of fights (average seconds a fight, lowest hull when won)');
  for (const K of KITS) {
    const n = P.wavesIn(K.v), waves = Array.from({ length: n }, (_, i) => P.waveOf(K.v, i + 1));
    console.log(`\n${K.name}: voyage ${K.v}, in the ${K.ship}, ranks ${JSON.stringify(K.ranks)}, parts ${JSON.stringify(K.parts)}`);
    waves.forEach((W, i) => {
      const r = results.get(`${K.name}|${i + 1}`), who = (W.captain ? `${W.captain.name} (${W.captain.id}) + ` : '') + W.groups.map((g) => g.join(' ')).join(' | then ');
      console.log(`  wave ${String(i + 1).padStart(2)}  ${`${r.won}/${r.n}`.padEnd(4)} ${`${r.time} s`.padStart(6)} ${r.low != null ? `${r.low}%`.padStart(5) : '    -'}   ${who}`);
    });
  }
} else if (mode === 'ladder') {
  const runs = nums[0] ?? 4, pages = [];
  for (let i = 0; i < 3; i++) pages.push(await openPage());
  const jobs = [];
  for (const K of KITS) for (const [cls, ns] of Object.entries(GROUPS)) for (const n of ns) jobs.push({ K, cls, n });
  const results = new Map();
  let next = 0;
  await Promise.all(pages.map(async (page) => {
    while (next < jobs.length) {
      const j = jobs[next++], { K, cls, n } = j;
      // no point sending a Skiff against three Frigates: skip groups far past what the kit beat a size smaller
      const before = results.get(`${K.name}|${cls}|${n - 1}`);
      if (before && before.won === 0) { results.set(`${K.name}|${cls}|${n}`, { won: 0, n: 0 }); continue; }
      const r = await trial(page, { v: K.v, w: 1, ship: K.ship, ranks: K.ranks, parts: K.parts, vs: Array(n).fill(cls) }, runs, false);
      results.set(`${K.name}|${cls}|${n}`, r);
    }
  }));
  console.log(`Sunstone Skies on ${difficulty}: each kit against groups of one class, ${runs} fights each, raiders at the kit's voyage`);
  console.log('wins out of fights (average seconds a fight, lowest hull when won)');
  for (const K of KITS) {
    console.log(`\n${K.name} (voyage ${K.v}): ${K.ship}, ranks ${JSON.stringify(K.ranks)}, parts ${JSON.stringify(K.parts)}`);
    for (const [cls, ns] of Object.entries(GROUPS)) {
      console.log(`  ${cls.padEnd(8)}` + ns.map((n) => { const r = results.get(`${K.name}|${cls}|${n}`); return `${n}: ${r.n ? `${r.won}/${r.n} (${r.time}s${r.low != null ? `, ${r.low}%` : ''})` : '-'}`.padEnd(20); }).join(''));
    }
  }
} else {
  const [minutes = 30, stopAt = 99] = nums, page = await openPage();
  console.log(`Sunstone Skies: a simulated Captain on ${difficulty}, up to ${minutes} minutes of game time`);
  console.log(head);
  let t = 0, voyage = 1;
  while (t < minutes * 60 && voyage <= stopAt) {
    const r = await page.evaluate(() => window.__bot.run(60));
    for (const w of r.out) console.log(row(w));
    if (r.voyage !== voyage) console.log(`  -- voyage ${voyage} done at ${Math.round(r.t / 60)} min: paid ${r.paid[voyage - 1] ?? '?'} (the voyage before), ${r.shards} shards, ships ${r.ships.join(' ')}, parts ${JSON.stringify(r.parts)}, fitted ${r.fitted.join(' ')}, ranks ${JSON.stringify(r.ranks)}, level ${r.level}`);
    t = r.t; voyage = r.voyage;
  }
  console.log(`stopped at ${Math.round(t / 60)} min of game time, on voyage ${voyage}`);
}
await browser.close();
