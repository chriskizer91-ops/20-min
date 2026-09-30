// Plays the title page in headless Chromium: node tests/browser-title.mjs (build it first: node tools/build.mjs title).
// Checks it starts without errors; the first tap brings up the title menu; New game plays the Opening beat by beat
// to its title card and back to the title; the Story list plays The Middle Turn, where Nettie speaks with her
// portrait; Escape leaves a scene; and on a phone nothing spills off the screen.
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
const state = () => page.evaluate(() => window.__title.state);
const menuItems = () => page.locator('#menu-list button > span').allTextContents();
// Is the canvas showing a painting, rather than the night behind it? (the middle of the screen, a little down)
const painted = () => page.evaluate(() => {
  const c = document.getElementById('stage'), g = c.getContext('2d');
  const d = g.getImageData(Math.floor(c.width / 2) - 20, Math.floor(c.height * 0.55) - 20, 40, 40).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
  return sum / (d.length / 4) / 3 > 20;
});

await page.goto(pathToFileURL(resolve('dist/title.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__title, null, { timeout: 30000 });
check(true, 'the title page starts');
check(await page.isVisible('#press') && (await state()).mode === 'press', '"Tap to begin" shows first');

await page.mouse.click(640, 400);
await page.waitForSelector('#menu:not([hidden])', { timeout: 5000 });
let items = await menuItems();
check(items.join('|') === 'New game|Story|Sound on', `a tap brings up the title menu (${items.join(', ')})`);
check((await state()).logo && await page.isVisible('#logo h1'), 'the logo is up');
await wait(1500);
check(await painted(), 'the title painting is drawn');

// New game: the Opening, one Space at a time (Auto off, so only the keys move it on)
await page.evaluate(() => { window.__title.auto = false; });
await page.locator('#menu-list button', { hasText: 'New game' }).click();
await page.waitForFunction(() => window.__title.state.scene?.beat === 0, null, { timeout: 10000 });
check((await state()).scene.scene === 'opening', 'New game plays the Opening');
await wait(2500);
check(await painted() && (await state()).scene.still === 'moonrise', 'its first beat shows the moonrise painting');
const beats = new Set();
let s = await state(), card = false, captions = 0, spoken = 0;
for (let i = 0; i < 40 && s.mode === 'scene'; i++) {
  if (s.scene) {
    beats.add(s.scene.beat);
    if (s.scene.card) { card = true; break; }
    if (s.scene.text && !s.scene.speaker && await page.isVisible('#caption')) captions++;
    if (s.scene.speaker && await page.isVisible('#talk')) spoken++;
  }
  await page.keyboard.press('Space');
  await wait(450);
  s = await state();
}
check(card && beats.size === 5, `Space plays the Opening through its ${beats.size} beats to the title card`);
check(captions > 0 && spoken > 0, `narration shows as captions and the witch's line in the dialogue box (${captions} captions, ${spoken} spoken)`);
await wait(1800);
check((await state()).logo && await page.isVisible('#logo h1'), 'the title card shows the logo');
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__title.state.mode === 'menu', null, { timeout: 8000 }).catch(() => {});
s = await state();
check(s.mode === 'menu' && await page.isVisible('#menu') && s.list === 'main', 'moving on from the title card returns to the title menu');

// Story: The Middle Turn, where Nettie speaks
await wait(700);
await page.locator('#menu-list button', { hasText: 'Story' }).click();
items = await menuItems();
check(['The Opening', 'The Skiff Wakes', 'The Middle Turn', 'The Ending'].every((n) => items.includes(n)), `Story lists the cut-scenes (${items.join(', ')})`);
await page.locator('#menu-list button', { hasText: 'The Middle Turn' }).click();
await page.waitForFunction(() => window.__title.state.scene?.speaker === 'Nettie', null, { timeout: 15000 }).catch(() => {});
await wait(600);
const talk = await page.evaluate(() => ({
  name: document.getElementById('talk-name').textContent,
  face: document.getElementById('talk-face').getBoundingClientRect().width > 0,
  box: !document.getElementById('talk').hidden,
}));
check(talk.box && talk.name === 'Nettie' && talk.face, `The Middle Turn opens on Nettie, named and with her portrait ("${talk.name}")`);
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__title.state.mode === 'menu', null, { timeout: 8000 }).catch(() => {});
s = await state();
check(s.mode === 'menu' && s.list === 'story', 'Escape leaves the scene for the Story list');

// On a phone, upright and on its side, nothing spills off the screen
for (const [w, h] of [[390, 844], [844, 390]]) {
  await page.setViewportSize({ width: w, height: h });
  await wait(400);
  const fit = await page.evaluate(() => {
    const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5; };
    return { scroll: document.documentElement.scrollWidth <= innerWidth, menu: inside(document.getElementById('menu')), logo: inside(document.querySelector('#logo h1')) };
  });
  check(fit.scroll && fit.menu && fit.logo, `at ${w}x${h} the logo and menu fit on screen`);
}

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
