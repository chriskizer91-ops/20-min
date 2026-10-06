// check-shipyard.mjs: opens the shipyard demo in a headless browser the size of a laptop and of a phone, works the
// levelled-up Frigate through its panel, checks every part answers, and takes pictures into shots/ (or the folder given).
// Then it chooses each of the six ships in turn.
//   the detail dial: full, middle and far within their budgets; the old Frigate unchanged
//   working parts: sails furl and fold, the helm, the fins, battle stations, firing a closed side
//   damage: the three sliders reach the ship; the garage: four slots, the fifth part refused, one kind of canvas;
//   the power shares add up
// Run: node tools/build.mjs shipyard && node tools/check-shipyard.mjs [folder]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2] ?? root + 'shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
const SIZES = { laptop: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } };
const BUDGET = { full: [180000, 250000], middle: [20000, 38000], far: [2000, 7000] };
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
const expect = (ok, what) => { if (!ok) problems.push(what); };

async function open(size) {
  const page = await browser.newPage(SIZES[size]);
  page.on('pageerror', (e) => problems.push(`${size}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${size} console: ${m.text()}`); });
  await page.goto(`file://${root}dist/shipyard.html`);
  await page.waitForFunction(() => window.__yard?.ready || !document.getElementById('error').hidden, null, { timeout: 180000 });
  const err = await page.evaluate(() => (document.getElementById('error').hidden ? null : document.getElementById('error').textContent));
  if (err) problems.push(`${size}: ${err}`);
  return page;
}
const ch = (page, name) => page.evaluate((n) => window.__yard.ship.rig.get(n)?.toArray(), name);
const step = (page, s) => page.evaluate((s) => window.__yard.step(s), s);

{
  const page = await open('laptop');
  // the detail dial
  const levels = await page.evaluate(() => ['full', 'middle', 'far'].map((l) => { const s = window.__yard.build(l, l !== 'full'); return [l, s.stats.triangles, s.stats.drawCalls]; }));
  for (const [l, n, d] of levels) { console.log(`${l.padEnd(6)} ${n.toLocaleString().padStart(8)} triangles, ${d} draw calls`); const [a, b] = BUDGET[l]; expect(n >= a && n <= b, `${l}: ${n} triangles, outside ${a}-${b}`); }
  const old = await page.evaluate(() => window.__yard.oldStats().triangles);
  console.log(`old    ${old.toLocaleString().padStart(8)} triangles (the game's Frigate as it was)`);
  expect(old === 104414, `the old Frigate changed: ${old} triangles`);
  await shot(page, 'yard-laptop-new');

  // sails: all in, then all out
  const sail = async (v) => { await page.fill('#c-sail', String(v)); await page.dispatchEvent('#c-sail', 'input'); await step(page, 4); };
  await sail(0);
  const inn = await ch(page, 'yard:1:1:port');
  await shot(page, 'yard-laptop-furled');
  await sail(100);
  const outt = await ch(page, 'yard:1:1:port');
  console.log(`sails in: folded ${inn[0].toFixed(2)} rad, furled ${inn[2].toFixed(2)}; out: folded ${outt[0].toFixed(2)}, furled ${outt[2].toFixed(2)}`);
  expect(inn[0] > 0.9 && inn[2] > 0.9, `taking in sail didn't fold and furl the wings: ${inn}`);
  expect(outt[0] < 0.05 && outt[2] < 0.05, `letting out sail didn't spread the wings: ${outt}`);
  // the helm and the fins
  await page.fill('#c-turn', '80'); await page.dispatchEvent('#c-turn', 'input');
  await page.fill('#c-climb', '100'); await page.dispatchEvent('#c-climb', 'input');
  const w0 = (await ch(page, 'wheel'))[0]; await step(page, 2);
  const rud = (await ch(page, 'rudder'))[0], w1 = (await ch(page, 'wheel'))[0], fin = (await ch(page, 'fin:0'))[0];
  console.log(`helm: rudder ${rud.toFixed(2)} rad, wheel turned ${(w1 - w0).toFixed(2)} rad, fins ${fin.toFixed(2)} rad`);
  expect(rud < -0.3 && w1 - w0 > 1 && fin < -0.2, `the helm didn't answer: rudder ${rud}, wheel ${w1 - w0}, fins ${fin}`);
  for (const id of ['#c-turn', '#c-climb']) { await page.fill(id, '0'); await page.dispatchEvent(id, 'input'); }
  // battle stations on the port side: lids up, guns out
  await page.click('#st-port'); await step(page, 3);
  const lid = (await ch(page, 'lids:port'))[0], run = (await ch(page, 'guns:port'))[1];
  console.log(`port guns out: lids at ${lid.toFixed(2)} rad, guns ${run.toFixed(2)} m from run out`);
  expect(lid < -1.9 && Math.abs(run) < 0.02, `battle stations didn't open the port side: lids ${lid}, guns ${run}`);
  // firing the closed starboard side: it opens, runs out and fires
  await page.click('[data-fire="starboard"]');
  for (let i = 0; i < 12; i++) { await step(page, 0.25); if (await page.evaluate(() => window.__yard.ship.rig.get('guns:starboard').y < -0.2 && window.__yard.ship.ready('starboard') > 0.98)) break; }
  const fired = await page.evaluate(() => ({ lid: window.__yard.ship.rig.get('lids:starboard').x, kick: window.__yard.ship.rig.get('guns:starboard').y }));
  console.log(`fired the starboard side from shut: lids ${fired.lid.toFixed(2)} rad, guns kicked back ${fired.kick.toFixed(2)} m`);
  expect(fired.lid < -1.9 && fired.kick < -0.2, `firing a shut side didn't open it and fire: ${JSON.stringify(fired)}`);
  await page.evaluate(() => window.__yard.view('turn', 1.25, 0.06, window.__yard.state.dist * 0.45));
  await page.click('[data-fire="port"]'); await step(page, 0.15);
  await shot(page, 'yard-laptop-broadside');

  // damage, through the sliders
  await page.click('[data-tab="damage"]');
  for (const [k, v] of [['hull', 30], ['sails', 40], ['crystals', 45]]) { await page.fill(`#d-${k}`, String(v)); await page.dispatchEvent(`#d-${k}`, 'input'); }
  await step(page, 0.2);
  const U = await page.evaluate(() => { const u = window.__yard.ship.uniforms; return [u.uHullDmg.value, u.uSailDmg.value, u.uCrystal.value]; });
  console.log(`damage: hull ${U[0].toFixed(2)}, sails ${U[1].toFixed(2)}, crystals alive ${U[2].toFixed(2)}`);
  expect(Math.abs(U[0] - 0.7) < 0.01 && Math.abs(U[1] - 0.6) < 0.01 && Math.abs(U[2] - 0.45) < 0.01, `damage didn't reach the ship: ${U}`);
  await page.evaluate(() => window.__yard.view('turn', 0.9, 0.22, window.__yard.state.dist * 2.2));
  await step(page, 0.5);
  await shot(page, 'yard-laptop-damage');
  await page.click('#btn-repair');

  // the garage: four slots
  await page.click('[data-tab="garage"]');
  for (const id of ['armour', 'racing', 'longFocus', 'cage', 'highAngle']) await page.click(`[data-part="${id}"] button`);
  const g = await page.evaluate(() => ({ fitted: window.__yard.ship.fitted, slots: document.getElementById('slots').textContent,
    shown: window.__yard.ship.meshes.filter((m) => m.visible && m.userData.fit).map((m) => m.userData.fit) }));
  const on = Object.entries(g.fitted).filter(([, v]) => v).map(([k]) => k);
  console.log(`garage: fitted ${on.join(', ')}; "${g.slots}"; showing ${[...new Set(g.shown)].join(', ')}`);
  expect(on.length === 4 && !g.fitted.highAngle, `the garage let in more than four parts: ${on}`);
  expect(/full/.test(g.slots), `no word that the slots are full: "${g.slots}"`);
  for (const f of ['armour', 'racing', 'cage', 'guns-long-lo']) expect(g.shown.includes(f), `fitted part not shown: ${f}`);
  expect(!g.shown.includes('canvas'), 'the plain canvas still shows under the racing canvas');
  await page.evaluate(() => window.__yard.view('turn', 0.95, 0.16, window.__yard.state.dist * 1.0));
  await step(page, 0.5);
  await shot(page, 'yard-laptop-garage');
  // one kind of canvas at a time: storm canvas goes on in place of the racing canvas
  await page.click('[data-part="storm"] button');
  const st = await page.evaluate(() => ({ fitted: window.__yard.ship.fitted, pressed: [...document.querySelectorAll('#parts [aria-pressed="true"]')].map((b) => b.closest('[data-part]').dataset.part) }));
  console.log(`storm canvas fitted: ${st.pressed.join(', ')}`);
  expect(st.fitted.storm && !st.fitted.racing && st.pressed.length === 4, `storm canvas didn't take the racing canvas's place: ${st.pressed}`);
  // every ship of the fleet, and the parts carried over to the smaller ones' slots
  for (const id of ['skiff', 'cutter', 'brig', 'frigate', 'galleon', 'manowar']) {
    await page.evaluate((id) => window.__yard.select(id), id); await step(page, 0.3);
    const r = await page.evaluate(() => ({ id: window.__yard.ship.recipe.id, slots: document.getElementById('slots').textContent, tris: window.__yard.ship.stats.triangles }));
    console.log(`${r.id.padEnd(8)} ${r.tris.toLocaleString().padStart(8)} triangles; "${r.slots}"`);
    expect(r.id === id, `choosing the ${id} didn't change the ship`);
    if (id === 'skiff') expect(/^1 of 1/.test(r.slots), `the Skiff's one slot: "${r.slots}"`);
    if (id === 'manowar') expect(/of 6/.test(r.slots), `the Man-o'-war's six slots: "${r.slots}"`);
  }

  // the power: shares always add up to the whole
  await page.click('[data-tab="power"]');
  await page.fill('#p-sails', '70'); await page.dispatchEvent('#p-sails', 'input');
  const p = await page.evaluate(() => window.__yard.control.power);
  const sum = p.sails + p.guns + p.lift;
  console.log(`power: sails ${Math.round(p.sails * 100)}%, guns ${Math.round(p.guns * 100)}%, lift ${Math.round(p.lift * 100)}%`);
  expect(Math.abs(sum - 1) < 0.02 && Math.abs(p.sails - 0.7) < 0.01, `the power shares don't add up: ${JSON.stringify(p)}`);

  // old and both
  await page.click('[data-which="both"]'); await step(page, 0.3);
  await shot(page, 'yard-laptop-both');
  await page.click('[data-which="before"]'); await step(page, 0.3);
  await page.click('[data-which="after"]');
  await page.close();
}
{
  const page = await open('phone');
  await page.waitForTimeout(1500);
  await shot(page, 'yard-phone');
  const closed = await page.evaluate(() => document.body.classList.contains('closed'));
  expect(closed, 'phone: the panel should start closed so the ship shows');
  await page.tap('#btn-panel');
  await page.tap('[data-tab="garage"]');
  await page.tap('[data-part="cage"] button');
  await page.waitForTimeout(800);
  await shot(page, 'yard-phone-panel');
  const fitted = await page.evaluate(() => window.__yard.ship.fitted.cage);
  expect(fitted, 'phone: tapping a part didn\'t fit it');
  // the view buttons sit in one row below the panel
  const vb = await page.locator('#views').boundingBox(), pb = await page.locator('#panel').boundingBox();
  expect(vb.height < 50 && vb.y >= pb.y + pb.height - 1, `phone: the view buttons overlap the panel (${JSON.stringify(vb)})`);
  // nothing on the page sticks out past the screen
  const wide = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map((e) => e.id || e.className).slice(0, 5));
  expect(!wide.length, `phone: these stick out past the screen: ${wide}`);
  await page.close();
}
await browser.close();
if (problems.length) { console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log('all good');
