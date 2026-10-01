// Plays the built Bogmire demo in headless Chromium: node tests/browser-bogmire.mjs (run `node tools/build.mjs bogmire`
// first). Checks that it starts without errors, walks with the keys, walks to a tapped spot, talks to Mayor Gretch,
// goes through Nettie's door and arrives inside her hut, talks to Nettie, fills up at the rain-butt, comes back out
// through the gate to Nettie's door, and gathers an herb. Software rendering runs at a few frames a second, so every
// wait is generous.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const wait = (ms) => page.waitForTimeout(ms);
const game = (fn, arg) => page.evaluate(fn, arg);
const until = async (fn, arg, tries = 160, every = 300) => {
  for (let i = 0; i < tries; i++) { if (await game(fn, arg)) return true; await wait(every); }
  return false;
};
const pixel = () => game(() => { const g = window.__game; const p = g.paint.toPixel(g.player.pos); return { x: p.x, y: p.y, h: g.player.pos.y }; });
const here = () => game(() => window.__game.here.id);
// Where a painting pixel (or a thing, by id) is on the screen, to click it
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
const pageThrough = async () => {
  for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) { await page.keyboard.press('Space'); await wait(450); }
  return game(() => !window.__game.field.talking);
};

await page.goto(pathToFileURL(resolve('dist/bogmire.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
check(await here() === 'bogmire-moot-circle', 'the game starts on the moot-circle');
check(await game(() => document.getElementById('place-name').textContent === 'Bogmire'), 'the place name says Bogmire');

// Walking with the keys: she starts on the mast deck, facing the town
const start = await pixel();
await page.keyboard.down('ArrowLeft'); await wait(2500); await page.keyboard.up('ArrowLeft');
const moved = await pixel();
check(moved.x < start.x - 20, `the left arrow walks her toward the town (${Math.round(start.x)} -> ${Math.round(moved.x)})`);

// Tap a spot on the circle in front of the fire (one with nobody on it: Inkblot hops about)
const target = await game(() => {
  const g = window.__game;
  for (const [x, y] of [[880, 615], [700, 600], [940, 590], [660, 590]]) {
    const s = g.stage.pixelToScreen(new g.THREE.Vector2(x, y));
    const clear = g.field.things.every((t) => g.stage.worldToScreen(t.pos).distanceTo(s) > 90);
    if (clear) return [x, y];
  }
  return [880, 615];
});
await page.mouse.click(...(await screenOf(...target)));
await wait(600);
await until(() => !window.__game.player.path, null, 200);
const there = await pixel();
check(Math.hypot(there.x - target[0], there.y - target[1]) < 30, `tapping the planks walks her there (${target} -> ${Math.round(there.x)}, ${Math.round(there.y)})`);

// Gretch: tap her, and she walks over and talks
const gretch = await thingOnScreen('gretch');
await page.mouse.click(...gretch);
const met = await until(() => window.__game.field.talking?.thing.id === 'gretch', null, 200);
await wait(2500);
const talk = await game(() => ({ who: document.getElementById('talk-name').textContent, text: document.getElementById('talk-text').textContent }));
check(met && talk.who === 'Mayor Gretch' && talk.text.startsWith('Wipe your boots'), `tapping Mayor Gretch talks to her ("${talk.text.slice(0, 34)}...")`);
check(await game(() => document.getElementById('talk-face').src.startsWith('data:image/png')), 'Gretch has a portrait of her own model');
check(await pageThrough(), 'Space pages through her lines and closes the dialogue');

// Nettie's door: stand on her landing, tap the door, and through it
await putAt(232, 628, -Math.PI / 2);
await wait(600);
const door = await screenOf(176, 596);
await page.mouse.click(...door);
const inside = await until(() => window.__game.here.id === 'nettie-hut' && !window.__game.field.locked, null, 200);
check(inside, `walking into Nettie's door fades to her hut (${await here()})`);
await wait(1500);
check(await game(() => document.getElementById('place-name').textContent === "Nettie's hut"), 'the place name says Nettie\'s hut');
const arrived = await pixel();
check(arrived.y > 700 && Math.abs(arrived.x - 775) < 60, `she arrives at the hut's gate and steps in (${Math.round(arrived.x)}, ${Math.round(arrived.y)})`);

// Nettie
const nettie = await thingOnScreen('nettie');
await page.mouse.click(...nettie);
const metNettie = await until(() => window.__game.field.talking?.thing.id === 'nettie', null, 200);
await wait(2500);
const nt = await game(() => document.getElementById('talk-text').textContent);
check(metNettie && nt.startsWith('Healer, herbalist, witch'), `tapping Nettie talks to her ("${nt.slice(0, 34)}...")`);
let turn = false;
for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) {
  if ((await game(() => document.getElementById('talk-text').textContent)).includes('were called')) turn = true;
  await page.keyboard.press('Space'); await wait(450);
}
check(turn && (await game(() => !window.__game.field.talking)), 'she tells the middle turn ("Your lamps weren\'t stolen. They were called.") and the dialogue closes');

// The rain-butt gives three moonwater
const butt = await thingOnScreen('rain-butt');
await page.mouse.click(...butt);
await until(() => window.__game.field.talking?.thing.id === 'rain-butt', null, 200);
await pageThrough();
check(await game(() => window.__game.field.bag.moonwater === 3), 'Nettie\'s rain-butt gives three moonwater');

// Back out through the gate, to Nettie's door
await putAt(775, 800, 0);
await wait(600);
await page.keyboard.down('ArrowDown');
const outside = await until(() => window.__game.here.id === 'bogmire-moot-circle', null, 120, 250);
await page.keyboard.up('ArrowDown');
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const back = await pixel();
check(outside && back.x < 300 && back.y > 580, `walking out through the gate comes back out at Nettie's door (${Math.round(back.x)}, ${Math.round(back.y)})`);

// Gather the lavender in the barrel by her door
const lav = await game(() => window.__game.field.things.find((t) => t.herb === 'lavender')?.id);
const herb = await thingOnScreen(lav);
await page.mouse.click(...herb);
const picked = await until(() => window.__game.field.bag.lavender === 1, null, 200);
check(picked, 'tapping the lavender walks her over, kneels and puts it in the basket');
check(await game(() => document.getElementById('basket-count').textContent === '1 of 8'), `the basket counts Bogmire's herbs (${await game(() => document.getElementById('basket-count').textContent)})`);

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
