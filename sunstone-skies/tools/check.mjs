// check.mjs: opens the built pages in a headless browser the size of a laptop (Sunstone Skies is a laptop game),
// checks nothing went wrong, and takes pictures into shots/ (or the folder given).
//   dist/hangar.html  every ship at every level of detail, with its triangle count kept near its budget
//   dist/game.html    each of the six ships flown: how fast it goes, turns and climbs; every battery fired at a
//                     raider and hitting it; a raider shot down; raiders fighting back; the Captain going down and
//                     coming back; the keyboard, mouse and touch controls answering; pictures of a battle
// Run: node tools/build.mjs && node tools/check.mjs [folder]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2] ?? root + 'shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
const ships = ['skiff', 'cutter', 'brig', 'frigate']; // the old hangar's four
const fleet = [...ships, 'galleon', 'manowar']; // the game's six
const BUDGET = { full: [80000, 125000], middle: [10000, 32000], far: [1000, 6000] };
const SIZES = { laptop: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } };

async function open(file, name, ready) {
  const page = await browser.newPage(SIZES[name]);
  page.on('pageerror', (e) => problems.push(`${file} ${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${file} ${name} console: ${m.text()}`); });
  await page.goto(`file://${root}dist/${file}.html`);
  await page.waitForFunction(ready, null, { timeout: 180000 });
  return page;
}
const shot = (page, path) => page.screenshot({ path: `${out}/${path}.png`, timeout: 120000 });
const wait = (page, fn, arg, what) => page.waitForFunction(fn, arg, { timeout: 60000, polling: 100 }).catch(() => problems.push(`${what}: didn't happen`));

// ---------- the hangar ----------
for (const name of ['laptop']) {
  const page = await open('hangar', name, () => window.__hangar?.ready || !document.getElementById('error').hidden);
  if (name === 'laptop') {
    const table = await page.evaluate((ships) => ships.map((id) => [id, ...['full', 'middle', 'far'].map((l) => window.__hangar.stats(id, l))]), ships);
    for (const [id, ...levels] of table) {
      console.log(id.padEnd(8), levels.map((s, i) => `${['full', 'middle', 'far'][i]} ${s.triangles.toLocaleString().padStart(7)} (${s.drawCalls} calls)`).join('  '));
      levels.forEach((s, i) => { const l = ['full', 'middle', 'far'][i], [a, b] = BUDGET[l]; if (s.triangles < a || s.triangles > b) problems.push(`${id} ${l}: ${s.triangles} triangles, outside ${a}-${b}`); });
    }
  }
  const shots = name === 'laptop'
    ? ships.flatMap((id) => [[id, 'turn', 0.9, 0.28], [id, 'side', Math.PI / 2, 0.04]]).concat([['all', 'turn', 0.75, 0.32]])
    : [['brig', 'turn', 0.9, 0.3], ['skiff', 'turn', 0.9, 0.3], ['all', 'turn', 0.75, 0.32]];
  for (const [id, view, yaw, pitch] of shots) {
    await page.evaluate(([id, view, yaw, pitch]) => { window.__hangar.select(id); window.__hangar.view(view, yaw, pitch); }, [id, view, yaw, pitch]);
    await page.waitForTimeout(1200);
    await shot(page, `${name}-${id}-${view}`);
  }
  await page.close();
}

// ---------- the game ----------
const gameReady = () => window.__game?.ready || !document.getElementById('error').hidden;
// the game opens on its start screen; most checks fly in free flight, where every ship is there to fly
// set up a fight near the Captain, run it for a while with the Captain firing at the nearest raider, then hold it
function battle(ids = ['frigate', 'cutter']) {
  const g = window.__game, P = g.player;
  g.raiders.clear(); P.repair(1); g.waves.timer = 1e9; g.raiders.setAI(true);
  const f = P.forward();
  ids.forEach((id, i) => g.raiders.spawn(id, P.pos.clone().addScaledVector(f, 260 + i * 90).add({ x: (i - 0.5) * 140, y: 10, z: 0 }), P.heading + (i ? 2.4 : -1.2)));
  for (let k = 0; k < 40; k++) {
    const live = g.raiders.list.filter((r) => !r.f.down).sort((a, b) => a.f.pos.distanceTo(P.pos) - b.f.pos.distanceTo(P.pos));
    if (live[0]) {
      const T = P.pos.clone(); T.y += P.ship.recipe.length * 0.42 + 2;
      const look = live[0].f.pos.clone().sub(T).normalize(), a = Math.atan2(look.x, look.z) - P.heading;
      g.cam.pitch = Math.max(-0.3, -Math.asin(look.y) + 0.08); g.cam.yaw = Math.atan2(Math.sin(a), Math.cos(a));
    }
    g.step(0.25, { fire: true, sail: 0 });
  }
  g.raiders.setAI(false);
}
{
  const page = await open('game', 'laptop', gameReady);
  await shot(page, 'laptop-start');
  await page.click('#start-free');
  // Each ship flown on the game's own clock (software drawing is too slow to fly in real time): 20 seconds at full
  // sail turning and climbing, then each battery fired at a raider of the same class sitting 260 m off on its side.
  const flown = await page.evaluate((ships) => {
    const g = window.__game, res = [], PARTS = ['hull', 'sails', 'crystals'];
    g.waves.timer = 1e9; g.raiders.setAI(false);
    const aimAt = (P, tp) => {
      const T = P.pos.clone(); T.y += P.ship.recipe.length * 0.42 + 2;
      const look = tp.clone().sub(T).normalize(), a = Math.atan2(look.x, look.z) - P.heading;
      g.cam.pitch = -Math.asin(look.y); g.cam.yaw = Math.atan2(Math.sin(a), Math.cos(a));
    };
    const still = (P) => { P.speed = 3; P.sail = 0.05; P.vy = 0; P.turn = 0; P.climb = 0; };
    for (const id of ships) {
      g.fly(id); const P = g.player; P.repair(1);
      P.pos.set(0, 700, 6000); P.heading = 0; P.sail = 1; P.vy = 0; P.turn = 0; P.climb = 0;
      g.step(20, { sail: 1, turn: 1, climb: 1 });
      const r = { id, kmh: Math.round(P.speed * 3.6), turned: Math.round(Math.abs(P.heading) * 180 / Math.PI), climbed: Math.round(P.pos.y - 700), guns: {} };
      for (const [b, rel] of [['bow', 0], ['port', Math.PI / 2], ['starboard', -Math.PI / 2], ['stern', Math.PI]]) {
        const n = g.gunnery.count(b); if (!n) continue;
        g.raiders.clear(); P.pos.set(0, 900, 0); P.heading = 0.4; still(P);
        const dir = 0.4 + rel, tp = P.pos.clone().add({ x: Math.sin(dir) * 260, y: 6, z: Math.cos(dir) * 260 });
        const foe = g.raiders.spawn(id, tp, 1.0, true);
        aimAt(P, tp); g.step(0.05, { fire: false });
        const label = document.getElementById('battery-name').textContent, reach = document.getElementById('battery-count').textContent;
        const locked = g.locked === foe;
        // 3.5 s: two volleys land (a Cutter's three-gun broadside misses a still Cutter about one volley in ten)
        aimAt(P, tp); g.step(3.5, { fire: true });
        r.guns[b] = { n, label, locked, reach, parts: PARTS.filter((k) => foe.f.health[k] < foe.f.full[k]) };
      }
      res.push(r);
    }
    // a raider brought down: one more shot to its hull, then it falls below the clouds and is gone
    g.fly('brig'); const P = g.player; g.raiders.clear(); P.pos.set(0, 900, 0); P.heading = 0; still(P);
    const foe = g.raiders.spawn('cutter', P.pos.clone().add({ x: 0, y: 4, z: 240 }), 2, true); foe.f.health.hull = 10;
    const d0 = g.downed; aimAt(P, foe.f.pos); g.step(2, { fire: true });
    const why = foe.f.down?.why; g.step(18, {});
    const sinking = { why, counted: g.downed - d0, gone: !g.raiders.list.includes(foe) };
    // detail: a raider far off uses the far model, a near one the middle
    const far = g.raiders.spawn('brig', P.pos.clone().add({ x: 0, y: 0, z: 2500 }), 0, true), near = g.raiders.spawn('brig', P.pos.clone().add({ x: 60, y: 0, z: 80 }), 0, true);
    g.step(0.05, {});
    const detail = { far: far.ship.level, near: near.ship.level };
    // the raiders fight: wave 3 (a Cutter) sent at a Captain who does nothing for a minute
    g.raiders.clear(); g.raiders.setAI(true); P.repair(1); P.pos.set(0, 800, 3000); P.heading = Math.PI; P.sail = 0.5;
    Object.assign(g.waves, { n: 2, state: 'calm', timer: 0.1 });
    g.step(60, {});
    const fight = { raiders: g.raiders.list.map((r) => r.id).join(' '), hurt: PARTS.filter((k) => P.health[k] < P.full[k]) };
    // the Captain going down, and back in the air
    P.hit('hull', 1e6); g.step(0.1, {});
    const down = !!P.down; g.step(8, {});
    const back = { down, back: !P.down && P.frac('hull') === 1, cleared: g.raiders.list.length === 0 };
    g.waves.timer = 1e9; g.raiders.setAI(false);
    return { res, sinking, detail, fight, back };
  }, fleet);
  const NAMES = { bow: 'Bow guns', port: 'Port broadside', starboard: 'Starboard broadside', stern: 'Stern guns' };
  for (const r of flown.res) {
    console.log(`${r.id.padEnd(8)} ${String(r.kmh).padStart(3)} km/h, turned ${String(r.turned).padStart(3)}° and climbed ${String(r.climbed).padStart(3)} m in 20 s;`,
      Object.entries(r.guns).map(([b, x]) => `${b} ${x.n} ${x.parts.length ? 'hit ' + x.parts.join('+') : 'MISSED'}`).join(', '));
    if (r.kmh < 60 || r.turned < 90 || r.climbed < 60) problems.push(`${r.id}: flies badly (${r.kmh} km/h, ${r.turned}°, ${r.climbed} m)`);
    for (const [b, x] of Object.entries(r.guns)) {
      if (!x.parts.length) problems.push(`${r.id}: ${b} guns missed a raider 260 m away`);
      if (x.label !== NAMES[b]) problems.push(`${r.id}: looking ${b} picked "${x.label}"`);
      if (!x.locked || x.reach === 'out of reach') problems.push(`${r.id}: ${b} guns didn't lock on to a raider in reach`);
    }
  }
  const { sinking, detail, fight, back } = flown;
  console.log(`raider shot down: ${sinking.why}, counted ${sinking.counted}, ${sinking.gone ? 'gone below the clouds' : 'STILL THERE'}; detail far ${detail.far}, near ${detail.near}`);
  console.log(`raiders fighting a Captain doing nothing for a minute (${fight.raiders || 'none left'}): hurt ${fight.hurt.join('+') || 'NOTHING'}; going down ${back.down ? 'and back in the air' : 'FAILED'}`);
  if (sinking.why !== 'hull' || sinking.counted !== 1 || !sinking.gone) problems.push(`a raider shot down didn't go down properly: ${JSON.stringify(sinking)}`);
  if (detail.far !== 'far' || detail.near !== 'middle') problems.push(`raider detail levels wrong: ${JSON.stringify(detail)}`);
  if (!fight.hurt.length) problems.push('the raiders never hurt the Captain in a minute');
  if (!back.down || !back.back || !back.cleared) problems.push(`the Captain going down and coming back failed: ${JSON.stringify(back)}`);

  // the real keys and mouse
  await page.evaluate(() => { const g = window.__game; g.raiders.clear(); g.fly('brig'); g.player.pos.set(0, 680, 2600); g.player.heading = Math.PI; g.player.sail = 0.5; g.cam.yaw = 0; });
  await page.keyboard.press('2');
  await wait(page, () => window.__game.player.ship.recipe.id === 'cutter', null, 'key 2 picks the Cutter');
  await page.keyboard.press('3');
  await wait(page, () => window.__game.player.ship.recipe.id === 'brig', null, 'key 3 picks the Brig');
  const s0 = await page.evaluate(() => window.__game.player.sail);
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await wait(page, (s0) => window.__game.player.sail > s0 + 0.01 && window.__game.player.turn > 0.02, s0, 'W and D set more sail and turn');
  await page.keyboard.up('d'); await page.keyboard.up('w');
  await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(760, 330, { steps: 6 }); await page.mouse.up();
  await wait(page, () => Math.abs(window.__game.cam.yaw) > 0.1, null, 'dragging the mouse swings the camera');
  const reloaded = () => page.evaluate(() => { const g = window.__game; for (const k in g.gunnery.ready) g.gunnery.ready[k] = 0; g.bolts.bolts.length = 0; g.cam.yaw = 0.15; g.cam.pitch = 0.12; });
  await page.mouse.click(640, 300);
  await wait(page, () => /\b(locked|nolock)\b/.test(document.body.className), null, 'a click locks the mouse to the view (or the page says to drag instead)');
  console.log(`mouse: ${await page.evaluate(() => document.body.classList.contains('locked') ? 'locked to the view' : 'drag to aim')}`);
  await reloaded(); await page.mouse.down();
  await wait(page, () => window.__game.bolts.bolts.length > 0, null, 'left click fires');
  await page.mouse.up(); await page.keyboard.press('Escape');
  await reloaded(); await page.keyboard.down('f');
  await wait(page, () => window.__game.bolts.bolts.length > 0, null, 'F fires');
  await page.keyboard.up('f');
  // a battle to look at: a Frigate and a Cutter against the Brig
  await page.evaluate(battle);
  await page.waitForTimeout(2500);
  await shot(page, 'laptop-battle');
  await page.close();
}
{
  // a voyage: a new Captain in port on Fair Winds, a wave, its shards and renown, the choice after it, banking in
  // port, the garage, skills and their abilities, the last wave's raider captain ending the voyage, going down; then
  // Rough Air opening after two Fair Winds voyages, and a voyage on it
  const page = await open('game', 'laptop', gameReady);
  await page.click('#start-new');
  const v = await page.evaluate(() => {
    const g = window.__game, P = g.P, c = g.captain, out = {};
    const charts = () => [...document.querySelectorAll('.g-chart')].map((a) => ({ shut: a.classList.contains('shut'), on: a.classList.contains('on'), ready: a.querySelector('.g-ready')?.className }));
    out.start = { state: g.waves.state, ship: g.player.ship.recipe.id, shards: c.shards, chart: c.chart, tab: g.garage.tab, charts: charts() };
    document.getElementById('g-sail').click(); g.step(7, {});
    out.wave = g.raiders.list.map((r) => r.id);
    for (const r of g.raiders.list) r.f.hit('crystals', 1e6); // crystal kills pay half
    g.step(1, {});
    out.after = { state: g.waves.state, hold: c.hold, renown: c.renown, wave: P.on(c).wave, choice: !document.getElementById('choice').hidden };
    document.getElementById('btn-flyon').click(); g.step(8.5, {});
    out.flewOn = { streak: c.streak, state: g.waves.state, raiders: g.raiders.list.length };
    for (const r of g.raiders.list) r.f.hit('hull', 1e6);
    g.step(1, {});
    const hold = c.hold;
    document.getElementById('btn-port').click();
    out.port = { state: g.waves.state, shards: c.shards, expected: Math.round(hold * 1.1), garage: !document.getElementById('port').hidden };
    // the garage: buy and fit storm canvas; the ship's sails get tougher and her canvas shows it
    c.shards += 3000; g.garage.tab = 'parts';
    const sails0 = g.player.full.sails;
    document.querySelector('[data-act="buypart"][data-id="storm"]').click();
    document.querySelector('[data-act="fit"][data-id="storm"]').click();
    out.part = { fitted: c.fitted.skiff, sails: [sails0, g.player.full.sails], shows: g.player.ship.fitted.storm };
    // Mk II and III now; Mk IV waits for the fifth voyage
    for (let i = 0; i < 2; i++) document.querySelector('[data-act="buypart"][data-id="storm"]').click();
    out.part.mark = c.parts.storm; out.part.later = document.querySelector('[data-act="fit"][data-id="storm"], [data-act="unfit"][data-id="storm"]')?.closest('.g-part')?.querySelector('.later')?.textContent;
    // buy the Cutter and sail her
    g.garage.tab = 'ships';
    document.querySelector('[data-act="buyship"][data-id="cutter"]').click();
    document.querySelector('[data-act="sail"][data-id="cutter"]').click();
    out.ship = g.player.ship.recipe.id;
    // skills: renown for five levels, two ranks of Helm (Crystal Surge on Z) and two of Crystals (Sunstone Ward on B)
    for (let n = 1; n <= 4; n++) c.renown += P.levelCost(n);
    g.garage.tab = 'captain';
    for (const id of ['helm', 'helm', 'crystals', 'crystals']) document.querySelector(`[data-act="rank"][data-id="${id}"]`).click();
    out.skill = { ranks: c.ranks.helm, abilities: P.abilities(c).map((a) => a.id) };
    document.getElementById('g-sail').click(); g.step(1, {});
    g.abilities.use('surge'); g.step(0.5, {});
    out.surge = g.player.boost.speed;
    g.abilities.use('ward'); g.step(1.2, {});
    const h0 = g.player.health.hull; g.player.hit('hull', 100);
    out.ward = { shield: g.player.shield, took: Math.round(h0 - g.player.health.hull), shows: g.ward.mesh.visible };
    g.step(8, {});
    out.ward.after = { shield: g.player.shield, shows: g.ward.mesh.visible };
    // the last wave: its raider captain, and the voyage done
    g.raiders.clear(); P.on(c).wave = P.wavesIn(1); g.waves.state = 'calm'; g.waves.timer = 0.1; g.step(0.5, {});
    const boss = g.raiders.list.find((r) => r.captain);
    out.boss = boss ? { name: boss.name, id: boss.id, hull: boss.f.full.hull, fits: Object.entries(boss.ship.shown.fitted).filter(([, on]) => on).map(([k]) => k) } : null;
    for (const r of g.raiders.list) r.f.hit('hull', 1e6);
    g.step(1, {});
    out.done = { state: g.waves.state, voyage: P.on(c).voyage, wave: P.on(c).wave, hold: c.hold, best: c.best };
    // going down loses the hold
    document.getElementById('g-sail').click(); g.step(7, {}); c.hold = 50;
    g.player.hit('hull', 1e6); g.step(8, {});
    out.down = { state: g.waves.state, hold: c.hold, shards: c.shards, tries: P.on(c).tries };
    // two Fair Winds voyages done: Rough Air opens; sail it
    P.on(c, 'fair').voyage = 3; g.garage.tab = 'charts';
    out.opened = charts();
    document.querySelector('[data-act="chart"][data-id="rough"]').click();
    out.rough = { chart: c.chart, sail: document.getElementById('g-sail').textContent };
    document.getElementById('g-sail').click(); g.step(7, {});
    out.rough.banner = document.getElementById('banner-title').textContent;
    out.rough.raiders = g.raiders.list.length; out.rough.purse = document.getElementById('purse').textContent;
    return out;
  });
  console.log(`voyage: ${JSON.stringify(v)}`);
  if (v.start.state !== 'port' || v.start.ship !== 'skiff' || v.start.chart !== 'fair' || v.start.tab !== 'charts') problems.push(`a new Captain should start in port in the Skiff, on Fair Winds: ${JSON.stringify(v.start)}`);
  if (v.start.charts.map((x) => x.shut).join() !== 'false,true,true' || !/ready/.test(v.start.charts[0].ready)) problems.push(`the charts at the start: ${JSON.stringify(v.start.charts)}`);
  if (!v.wave.length) problems.push('no raiders came when the Captain set sail');
  if (v.after.state !== 'after' || !v.after.choice || v.after.hold <= 0 || v.after.wave !== 2) problems.push(`after the first wave: ${JSON.stringify(v.after)}`);
  if (v.flewOn.streak !== 1 || v.flewOn.state !== 'fight') problems.push(`flying on: ${JSON.stringify(v.flewOn)}`);
  if (v.port.state !== 'port' || v.port.shards !== v.port.expected || !v.port.garage) problems.push(`putting in to port: ${JSON.stringify(v.port)}`);
  if (v.part.fitted[0] !== 'storm' || !(v.part.sails[1] > v.part.sails[0]) || !v.part.shows) problems.push(`fitting a part: ${JSON.stringify(v.part)}`);
  if (v.part.mark !== 3 || !/Mk IV once you've beaten danger 4/.test(v.part.later ?? '')) problems.push(`Mk II, III, and Mk IV waiting: ${JSON.stringify(v.part)}`);
  if (v.ship !== 'cutter') problems.push(`buying and sailing the Cutter: ${v.ship}`);
  if (v.skill.ranks !== 2 || v.skill.abilities.join() !== 'surge,ward' || !(v.surge > 1.4)) problems.push(`skills and Crystal Surge: ${JSON.stringify(v.skill)} surge ${v.surge}`);
  if (v.ward.shield !== 0.5 || v.ward.took !== 50 || !v.ward.shows || v.ward.after.shield !== 1 || v.ward.after.shows) problems.push(`the Sunstone Ward: ${JSON.stringify(v.ward)}`);
  if (!v.boss || v.boss.id !== 'cutter' || !v.boss.fits.length) problems.push(`the last wave's raider captain: ${JSON.stringify(v.boss)}`);
  if (v.done.state !== 'port' || v.done.voyage !== 2 || v.done.wave !== 1 || v.done.hold !== 0 || v.done.best !== 1) problems.push(`the voyage ending: ${JSON.stringify(v.done)}`);
  if (v.down.state !== 'port' || v.down.hold !== 0 || v.down.tries !== 1) problems.push(`going down: ${JSON.stringify(v.down)}`);
  if (v.opened[1].shut || !v.opened[2].shut) problems.push(`Rough Air should open after two Fair Winds voyages, Black Sky not yet: ${JSON.stringify(v.opened)}`);
  if (v.rough.chart !== 'rough' || !/Rough Air, voyage 1/.test(v.rough.sail) || !/Rough Air, voyage 1/.test(v.rough.banner) || !v.rough.raiders || !/danger 3/.test(v.rough.purse)) problems.push(`sailing Rough Air: ${JSON.stringify(v.rough)}`);
  await page.evaluate(() => { const g = window.__game; g.garage.tab = 'parts'; });
  await page.waitForTimeout(1200);
  await shot(page, 'laptop-garage');
  await page.close();
}

await browser.close();
if (problems.length) { console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log('all good');
