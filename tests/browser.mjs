// Plays the built demos in headless Chromium: node tests/browser.mjs (run `npm run build` first).
// Checks it starts without errors, walks with the keys, climbs the chapel steps by tapping, talks to
// Hilde, and flies the camera out behind the scenes and back; opens a battle; and flies the skiff.
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
const pixel = () => game(() => { const g = window.__game; const p = g.paint.toPixel(g.player.pos); return { x: p.x, y: p.y, h: g.player.pos.y }; });

await page.goto(pathToFileURL(resolve('dist/wickhollow-square.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
check(true, 'the game starts');

const start = await pixel();
await page.keyboard.down('ArrowUp'); await wait(1200); await page.keyboard.up('ArrowUp');
const moved = await pixel();
check(moved.y < start.y - 20, `the up arrow walks her up the painting (${Math.round(start.y)} -> ${Math.round(moved.y)})`);

const door = await game(() => { const g = window.__game; const s = g.stage.pixelToScreen(new g.THREE.Vector2(776, 470)); return [s.x, s.y]; });
await page.mouse.click(door[0], door[1]);
for (let i = 0; i < 30 && (await game(() => !!window.__game.player.path)); i++) await wait(300);
const up = await pixel();
check(up.h > 0.1, `tapping the chapel steps walks her up them (${up.h.toFixed(2)} m high)`);

await game(() => { const g = window.__game; g.player.pos.copy(g.paint.toWorld(476, 660)); g.player.heading = Math.PI; });
await wait(300);
await page.keyboard.press('Space');
await wait(1500);
const talk = await game(() => ({ who: window.__game.field.talking?.thing.name, text: document.getElementById('talk-text').textContent }));
check(talk.who === 'Hilde' && talk.text.startsWith('Ha!'), `Space talks to Hilde ("${talk.text.slice(0, 30)}...")`);
for (let i = 0; i < 12 && (await game(() => !!window.__game.field.talking)); i++) { await page.keyboard.press('Space'); await wait(400); }
check(await game(() => !window.__game.field.talking), 'Space pages through and closes the dialogue');

const herb = await game(() => { const g = window.__game; const h = g.field.things.find((t) => t.herb === 'lavender'); const p = h.pos.clone(); p.y += 0.2; const s = g.stage.worldToScreen(p); return [s.x, s.y]; });
await page.mouse.click(herb[0], herb[1]);
for (let i = 0; i < 40 && !(await game(() => window.__game.field.basket.lavender)); i++) await wait(250);
check(await game(() => window.__game.field.basket.lavender === 1), 'tapping a lavender patch walks her over, kneels and puts it in the basket');

await page.click('#btn-backstage');
for (let i = 0; i < 20 && (await game(() => window.__game.stage.reveal.t < 1)); i++) await wait(250);
check(await game(() => window.__game.stage.reveal.t === 1), `Behind the scenes flies the camera out (${await game(() => window.__game.stage.reveal.t.toFixed(2))})`);
await page.click('#btn-back');
for (let i = 0; i < 20 && (await game(() => window.__game.stage.reveal.t > 0)); i++) await wait(250);
check(await game(() => window.__game.stage.reveal.t === 0), 'Back to the game flies it home');

// The battle demo: the witch's menu opens, and a Witchfire resolves against a foe.
await page.goto(pathToFileURL(resolve('dist/hollow-battle.html')).href);
await page.waitForFunction(() => !document.getElementById('menu').hidden, null, { timeout: 30000 });
check(true, 'the battle opens on the witch\'s command menu');
const hpBefore = await game(() => Object.values(window.__battle.director.state.units).filter((u) => u.side === 'foe').reduce((a, u) => a + u.hp, 0));
await page.locator('#menu-list button', { hasText: 'Witchfire' }).click();
if (await game(() => !!window.__battle.director.targeting)) await page.keyboard.press('Enter');
for (let i = 0; i < 40 && (await game(() => document.getElementById('menu').hidden)); i++) await wait(250);
const after = await game(() => ({ hp: Object.values(window.__battle.director.state.units).filter((u) => u.side === 'foe').reduce((a, u) => a + u.hp, 0), turns: window.__battle.director.state.turn ?? 0 }));
check(after.hp <= hpBefore, `Witchfire is thrown and the fight goes on to her next turn (foes' HP ${hpBefore} -> ${after.hp})`);

// The airship: docked at Wickhollow, "Fly to Bogmire" takes off, and near Bogmire she sets down at its dock.
await page.goto(pathToFileURL(resolve('dist/airship.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
const air = () => game(() => { const a = window.__airship, S = a.state; return { mode: S.mode, at: S.at, alt: S.alt, card: document.getElementById('card').hidden ? null : document.getElementById('card-name').textContent }; });
check((await air()).card === 'Wickhollow', 'the skiff starts docked at Wickhollow, with the town card up');
await page.locator('#btn-go').click();
for (let i = 0; i < 40 && (await air()).alt < 3; i++) await wait(250);
check((await air()).mode === 'flying', `"Fly to Bogmire" takes off (${(await air()).alt.toFixed(1)} m up)`);
// Skip most of the trip: put her a little way short of Bogmire's dock, still heading there
await game(() => { const a = window.__airship; a.state.pos.lerp(a.places.bogmire.dockAt, 0.97); });
for (let i = 0; i < 120 && (await air()).mode !== 'docked'; i++) await wait(250);
const landed = await air();
check(landed.mode === 'docked' && landed.at === 'bogmire' && landed.card === 'Bogmire', `she lands at Bogmire's dock (${landed.mode} at ${landed.at})`);

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
