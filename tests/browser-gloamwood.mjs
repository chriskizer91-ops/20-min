// Plays the built Gloamwood demo in headless Chromium: node tests/browser-gloamwood.mjs (run `node tools/build.mjs
// gloamwood` first). Set SHOTS=<folder> to save screenshots along the way. Checks that it starts on the lantern path
// with one Lantern Oil and every lantern dark; walks with the keys and to a tapped spot; walking up to B1's foes shows
// the encounter card, and after it they step off the path; gathers an herb; draws three moonwater at the crock; the
// kettle says she can brew; Silas takes the oil and the five lanterns light one by one down the path; he gives the
// Owl charm and the bow-lamp flame and tells her about the Hollow; the bench rests and saves; the top exit names the
// square; and the way down to the Sable bridge leads there. Software rendering runs at a few frames a second, so every
// wait is generous.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const wait = (ms) => page.waitForTimeout(ms);
const game = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/glo-test-${name}.png` }); };
const until = async (fn, arg, tries = 160, every = 300) => {
  for (let i = 0; i < tries; i++) { if (await game(fn, arg)) return true; await wait(every); }
  return false;
};
const pixel = () => game(() => { const g = window.__game; const p = g.paint.toPixel(g.player.pos); return { x: p.x, y: p.y }; });
const here = () => game(() => window.__game.here.id);
const screenOf = (x, y) => game(([x, y]) => { const g = window.__game; const s = g.stage.pixelToScreen(new g.THREE.Vector2(x, y)); return [s.x, s.y]; }, [x, y]);
const thingOnScreen = (id) => game((id) => {
  const g = window.__game, t = g.field.things.find((k) => k.id === id);
  if (!t) return null;
  const lift = t.lift ?? (t.crow ? 0.15 : t.actor ? 0.6 : t.herb ? 0.2 : 0.3);
  const s = g.stage.worldToScreen(t.pos.clone().setY(t.pos.y + lift));
  return [s.x, s.y];
}, id);
// Put her somewhere (in painting pixels) without walking, facing a way
const putAt = (x, y, heading = Math.PI) => game(([x, y, heading]) => {
  const g = window.__game;
  g.player.path = null;
  g.player.pos.copy(g.paint.toWorld(x, y));
  g.player.heading = heading;
}, [x, y, heading]);
const talkText = () => game(() => document.getElementById('talk-text').textContent);
const pageThrough = async (seen = []) => {
  for (let i = 0; i < 60 && (await game(() => !!window.__game.field.talking)); i++) {
    await until(() => !window.__game.field.talking || document.getElementById('talk-more').hidden === false, null, 40, 150);
    seen.push(await talkText());
    await page.keyboard.press('Space');
    await wait(350);
  }
  return game(() => !window.__game.field.talking);
};
// How bright the shown painting is round a painting pixel (0-255)
const brightness = (x, y) => game(([x, y]) => {
  const img = window.__game.stage.painting.image;
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d');
  g.drawImage(img, x - 6, y - 6, 12, 12, 0, 0, 12, 12);
  const d = g.getImageData(0, 0, 12, 12).data;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) max = Math.max(max, (d[i] + d[i + 1] + d[i + 2]) / 3);
  return max;
}, [x, y]);

await page.goto(pathToFileURL(resolve('dist/gloamwood.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
await wait(1500);
check(await here() === 'lantern-path', 'the game starts on the lantern path');
check(await game(() => document.getElementById('place-name').textContent === 'The Lantern Path'), 'the place name says The Lantern Path');
check(await game(() => window.__game.field.items['lantern-oil'] === 1 && /Lantern Oil ×1/.test(document.getElementById('basket').textContent)),
  'she starts with one Lantern Oil in her basket');
const lanterns = await game(() => window.__game.here.data.lanterns.map((l) => l.pixel));
const darkBefore = [];
for (const [x, y] of lanterns) darkBefore.push(await brightness(x, y));
check(darkBefore.every((b) => b < 120) && (await game(() => window.__game.field.path.lanterns.lamps.every((l) => l.k === 0))),
  `every lantern starts dark (brightest glass ${Math.round(Math.max(...darkBefore))})`);
await shot('start');

// Walking with the keys: she starts at the top of the path, by the way to the square
const start = await pixel();
await page.keyboard.down('ArrowDown'); await wait(2500); await page.keyboard.up('ArrowDown');
const moved = await pixel();
check(moved.y > start.y + 20, `the down arrow walks her down the path (${Math.round(start.y)} -> ${Math.round(moved.y)})`);

// Tap a spot on the cobbles (one with nobody on it: Inkblot hops about)
const target = await game(() => {
  const g = window.__game;
  for (const [x, y] of [[1150, 400], [1130, 360], [1180, 440]]) {
    const s = g.stage.pixelToScreen(new g.THREE.Vector2(x, y));
    if (g.field.things.every((t) => g.stage.worldToScreen(t.pos).distanceTo(s) > 70)) return [x, y];
  }
  return [1150, 400];
});
await page.mouse.click(...(await screenOf(...target)));
await wait(600);
await until(() => !window.__game.player.path, null, 200);
const there = await pixel();
check(Math.hypot(there.x - target[0], there.y - target[1]) < 30, `tapping the path walks her there (${target} -> ${Math.round(there.x)}, ${Math.round(there.y)})`);

// B1: walking on down the path to the footbridge runs into the mandrake and the glowcap
await page.mouse.click(...(await screenOf(1060, 560)));
const carded = await until(() => !document.getElementById('encounter').hidden, null, 200);
const card = await game(() => ({ tag: document.getElementById('enc-tag').textContent, title: document.getElementById('enc-title').textContent, text: document.getElementById('enc-text').textContent }));
check(carded && card.tag === 'B1' && card.title === 'The Lantern Path' && /Hollowed Mandrake and a Glowcap block the path/.test(card.text),
  `walking up to the foes shows the encounter card ("${card.tag} · ${card.title}: ${card.text}")`);
check(await game(() => window.__game.field.locked), 'she waits while the card is up');
await shot('card');
const foesBefore = await game(() => window.__game.field.path.foes.map((f) => f.root.position.toArray()));
await page.click('#enc-go');
await wait(500);
check(await game(() => document.getElementById('encounter').hidden && !window.__game.field.locked), '"Let her pass" closes the card');
await until(() => window.__game.field.path.foes.every((f) => !f.stepping), null, 100);
const aside = await game((before) => {
  const g = window.__game;
  return g.field.path.foes.every((f, i) => f.obstacle.off && f.root.position.distanceTo(new g.THREE.Vector3(...before[i])) > 0.5);
}, foesBefore);
check(aside, 'the mandrake and the glowcap step off the path');

// Gather the ember-star lily by the junction
const lily = await game(() => window.__game.field.things.find((t) => t.herb === 'ember_star_lily' && t.pos.x > -2)?.id ?? window.__game.field.things.find((t) => t.herb === 'ember_star_lily')?.id);
await putAt(640, 712, -Math.PI / 2);
await wait(800);
await page.mouse.click(...(await thingOnScreen(lily)));
const picked = await until(() => window.__game.field.basket.ember_star_lily === 1, null, 200);
check(picked, 'tapping an ember-star lily walks her over, kneels and puts it in the basket');
check(await game(() => /1 of 10/.test(document.getElementById('basket-count').textContent)), `the basket counts the path's herbs (${await game(() => document.getElementById('basket-count').textContent)})`);
await shot('gathered');

// The crock gives three moonwater, and the kettle says she can brew
await page.mouse.click(...(await thingOnScreen('crock')));
await until(() => window.__game.field.talking?.thing.id === 'crock', null, 200);
await pageThrough();
check(await game(() => window.__game.field.items.moonwater === 3), 'the wayside crock gives three moonwater');
await page.mouse.click(...(await thingOnScreen('kettle')));
await until(() => window.__game.field.talking?.thing.id === 'kettle', null, 200);
const kettleLines = [];
await pageThrough(kettleLines);
check(kettleLines.some((l) => /I can brew here/.test(l)) && (await game(() => window.__game.field.things.find((t) => t.id === 'kettle').brew === 'wayside')),
  'the wayside kettle (id "kettle") says she can brew here');

// Silas: tap him, he talks, takes the oil, and the lanterns light one by one down the path
await page.mouse.click(...(await thingOnScreen('silas')));
const met = await until(() => window.__game.field.talking?.thing.id === 'silas', null, 200);
await until(() => document.getElementById('talk-more').hidden === false, null, 100, 200);
const first = await talkText();
check(met && first.startsWith('Evening! Mind the pole.'), `tapping Silas talks to him ("${first.slice(0, 40)}...")`);
check(await game(() => document.getElementById('talk-name').textContent === 'Silas' && document.getElementById('talk-face').src.startsWith('data:image/webp')), 'Silas has his own painted portrait');
const silasLines = [];
await pageThrough(silasLines);
check(silasLines.some((l) => /Lantern Oil! Look at that flame/.test(l)), 'he sees the Lantern Oil ("Lantern Oil! Look at that flame...")');
// the relight: record when each lantern starts to light
await page.evaluate(() => {
  const g = window.__game, lamps = g.field.path.lanterns.lamps;
  window.__lit = lamps.map(() => null);
  const t0 = performance.now();
  const poll = () => { lamps.forEach((l, i) => { if (window.__lit[i] === null && l.target > 0) window.__lit[i] = performance.now() - t0; }); if (window.__lit.some((v) => v === null)) requestAnimationFrame(poll); };
  poll();
});
await wait(4000);
await shot('relighting');
const allLit = await until(() => window.__game.field.path.lanterns.lamps.every((l) => l.k >= 1), null, 500);
const order = await game(() => window.__lit);
const inOrder = order.every((v, i) => v !== null && (i === 0 || v > order[i - 1]));
check(allLit && inOrder, `all five lanterns light, one by one down the path (${order.map((v) => Math.round(v / 100) / 10).join('s, ')}s)`);
await wait(1500);
const litAfter = [];
for (const [x, y] of lanterns) litAfter.push(await brightness(x, y));
check(litAfter.every((b, i) => b > darkBefore[i] + 40), `the painting's lanterns shine again (${litAfter.map(Math.round).join(', ')})`);
check(await game(() => window.__game.field.path.silas.lit && window.__game.field.items['lantern-oil'] === 0), "Silas's pole is lit, and the oil is used");
await shot('relit');
// then he goes on: the Owl charm, the flame for the skiff's bow, and the moths in the Hollow
const thanked = await until(() => window.__game.field.talking?.thing.id === 'silas', null, 300);
const thanks = [];
await pageThrough(thanks);
check(thanked && thanks.some((l) => /Owl charm/.test(l)) && thanks.some((l) => /no wind or wisp can blow it out/.test(l)) && thanks.some((l) => /gather in the Hollow/.test(l)),
  'he gives the Owl charm and a flame for the skiff\'s bow, and says the moths gather in the Hollow');
check(await game(() => window.__game.field.items['owl-charm'] === 1 && window.__game.field.items['bow-flame'] === 1), 'the Owl charm and the bow-lamp flame are in her basket');
await shot('thanked');

// The bench: rest, and the night is saved
await page.mouse.click(...(await thingOnScreen('bench')));
await until(() => window.__game.field.talking?.thing.id === 'bench', null, 200);
await pageThrough();
await until(() => !window.__game.field.locked, null, 100);
check(await game(() => { try { return !!JSON.parse(localStorage.getItem('witch-way:gloamwood')).night.relit; } catch { return false; } }), 'resting on the bench saves the night');

// The top of the path names the square
await putAt(1176, 240, Math.PI);
await wait(600);
await page.keyboard.down('ArrowUp');
const toast = await until(() => /square/.test(document.getElementById('toast').textContent) && !document.getElementById('toast').classList.contains('gone'), null, 60, 200);
await page.keyboard.up('ArrowUp');
check(toast, `the top of the path names the way back to the square ("${await game(() => document.getElementById('toast').textContent)}")`);

// And on down to the Sable bridge
const hasBridge = await game(() => !!window.__game.field.exits.find((e) => e.to === 'sable-bridge'));
if (hasBridge) {
  await putAt(480, 1010, 0);
  await wait(600);
  await page.keyboard.down('ArrowDown');
  const crossed = await until(() => window.__game.here.id === 'sable-bridge', null, 120, 250);
  await page.keyboard.up('ArrowDown');
  await until(() => !window.__game.field.locked, null, 100);
  check(crossed && (await game(() => document.getElementById('place-name').textContent === 'The Sable Bridge')), `the way down leads to the Sable bridge (${await here()})`);
  check(await game(() => window.__game.field.bridge.moths.length === 2 && window.__game.field.bridge.moths.every((m) => m.moth.root.parent)), 'lamp-moths carry lights away under the arches');
  await shot('bridge');
  // B2: walking on toward the twisted grove, the Sour Wisps
  await putAt(1150, 350, Math.PI / 2);
  await wait(800);
  await page.mouse.click(...(await screenOf(1470, 214)));
  const wisped = await until(() => !document.getElementById('encounter').hidden, null, 200);
  const card2 = await game(() => ({ tag: document.getElementById('enc-tag').textContent, title: document.getElementById('enc-title').textContent, text: document.getElementById('enc-text').textContent, note: document.getElementById('enc-note').textContent }));
  check(wisped && card2.tag === 'B2' && /Sour Wisps crowd the twisted grove/.test(card2.text) && /Wisp-Calm/.test(card2.note),
    `walking up to the twisted grove shows B2's card ("${card2.tag} · ${card2.title}: ${card2.text}")`);
  await shot('bridge-card');
  await page.click('#enc-go');
  await wait(500);
  check(await game(() => window.__game.night.wispsAway && window.__game.field.bridge.wisps.every((w) => w.obstacle.off)), 'the wisps drift off, and let her by');
  await putAt(1490, 214, Math.PI / 2);
  await wait(600);
  await page.keyboard.down('ArrowRight');
  const hollow = await until(() => /Hollow/.test(document.getElementById('toast').textContent) && !document.getElementById('toast').classList.contains('gone'), null, 60, 200);
  await page.keyboard.up('ArrowRight');
  check(hollow, `the far end leads on to the Hollow ("${await game(() => document.getElementById('toast').textContent)}")`);
}

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
