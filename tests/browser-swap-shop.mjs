// Plays the built swap shop demo in headless Chromium: node tests/browser-swap-shop.mjs (run `node tools/build.mjs
// swap-shop` first). Checks that the stall starts without errors and she walks in; that the keys and a tap walk her;
// that tapping Quill walks her to the counter and he talks (with his own portrait), and that his last line opens the
// shop; that the shop lists his wares with what he wants, her things and her basket's slots; a swap by keyboard
// (the gloves), a swap by taps through the confirm step (the wisp jar, for her dud), a ware she can't afford yet (the
// Owl charm), the herb line with herbs she picks, and Quill's own swap for the skiff (his hands warm up); that Escape
// leaves the shop and he says goodbye; and that he greets her as a warm man after. Software rendering runs at a few
// frames a second, so every wait is generous.
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
const pixel = () => game(() => { const g = window.__game; const p = g.paint.toPixel(g.player.pos); return { x: p.x, y: p.y }; });
const screenOf = (x, y) => game(([x, y]) => { const g = window.__game; const s = g.stage.pixelToScreen(new g.THREE.Vector2(x, y)); return [s.x, s.y]; }, [x, y]);
const thingOnScreen = (id) => game((id) => {
  const g = window.__game, t = g.field.things.find((k) => k.id === id);
  if (!t) return null;
  const lift = t.lift ?? (t.crow ? 0.15 : t.actor ? 0.6 : t.herb ? 0.2 : 0.3);
  const s = g.stage.worldToScreen(t.pos.clone().setY(t.pos.y + lift));
  return [s.x, s.y];
}, id);
const pageThrough = async () => {
  for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) { await page.keyboard.press('Space'); await wait(500); }
  return game(() => !window.__game.field.talking);
};
const bag = (id) => game((id) => window.__swap.inventory.bag[id] ?? 0, id);
const shopOpen = () => game(() => !!window.__swap.shop && !!document.querySelector('.swap-shop'));
const said = () => game(() => document.querySelector('.ss-say')?.textContent ?? '');
// Choose a ware in the open shop with the arrow keys
const keyTo = async (id) => {
  for (let i = 0; i < 14; i++) {
    if (await game(() => window.__swap.shop?.selected) === id) return true;
    await page.keyboard.press('ArrowDown');
    await wait(250);
  }
  return false;
};
// Wait out a swap's flourish
const settled = () => until(() => !window.__swap.shop?.busy, null, 80, 300);

await page.goto(pathToFileURL(resolve('dist/swap-shop.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
check(await game(() => window.__game.here.id) === 'quills-stall', 'the game starts at Quill\'s stall');
check(await game(() => document.getElementById('place-name').textContent === "Quill's Stall"), 'the place name says Quill\'s Stall');
check(await game(() => !!window.__swap.quill && window.__game.field.villagers.includes(window.__swap.quill)), 'Mister Quill is behind his counter');
check(await game(() => !!window.__game.field.crow), 'Inkblot is about');

// She walks in from the square
const arrived = await until(() => { const g = window.__game; return !g.player.path && g.paint.toPixel(g.player.pos).y < 800; }, null, 120);
const inside = await pixel();
check(arrived && inside.y < 800, `she walks in from the square, up to the counter (${Math.round(inside.x)}, ${Math.round(inside.y)})`);
check(await game(() => document.getElementById('satchel-count').textContent === '11 of 12 slots'), 'her basket shows on the field: 11 of 12 slots');

// Keys walk her
const before = await pixel();
await page.keyboard.down('ArrowRight'); await wait(2200); await page.keyboard.up('ArrowRight');
const after = await pixel();
check(after.x > before.x + 20, `the right arrow walks her along the counter (${Math.round(before.x)} -> ${Math.round(after.x)})`);

// A tap on the cobbles walks her there
await page.mouse.click(...(await screenOf(980, 790)));
await wait(600);
await until(() => !window.__game.player.path, null, 200);
const there = await pixel();
check(Math.hypot(there.x - 980, there.y - 790) < 35, `tapping the cobbles walks her there (${Math.round(there.x)}, ${Math.round(there.y)})`);

// Tap Quill: she walks to the counter and he talks
await page.mouse.click(...(await thingOnScreen('quill')));
const met = await until(() => window.__game.field.talking?.thing.id === 'quill', null, 200);
await until(() => !window.__game.field.talking?.typing, null, 60);
const talk = await game(() => ({ who: document.getElementById('talk-name').textContent, text: document.getElementById('talk-text').textContent, face: document.getElementById('talk-face').src }));
check(met && talk.who === 'Mister Quill' && talk.text.startsWith('Good evening, dear'), `tapping Quill talks to him ("${talk.text.slice(0, 40)}...")`);
check(talk.face.startsWith('data:image/webp'), 'Quill speaks with his own portrait');
const near = await game(() => { const g = window.__game; return g.player.pos.distanceTo(window.__swap.quill.root.position); });
check(near < 1.6, `she's at the counter, in front of him (${near.toFixed(2)} m)`);
check(await pageThrough(), 'Space pages through his lines');

// ...and the shop opens
const opened = await until(() => !!window.__swap.shop && document.querySelector('.swap-shop.on'), null, 60);
check(opened, 'talking to Quill opens the swap shop');
await wait(1200);
const shop = await game(() => ({
  wares: document.querySelectorAll('.ss-row').length,
  wants: document.querySelectorAll('.ss-row .ss-want').length,
  hers: document.querySelectorAll('.ss-hers li').length,
  slots: document.querySelector('.ss-slots').textContent,
  head: document.querySelector('.ss-who h2').textContent,
  locked: window.__game.field.locked,
}));
check(shop.wares === 12, `the shop lists his twelve wares (${shop.wares})`);
check(shop.wants >= 12, `each says what he wants for it (${shop.wants} wants shown)`);
check(shop.hers >= 14 && shop.slots === 'Basket 11 of 12', `what she has: ${shop.hers} things, ${shop.slots}`);
check(shop.locked, 'she stays put while the shop is open');
const preview = await game(() => ({ name: document.querySelector('.ss-title h3').textContent, color: document.querySelector('.ss-title h3').style.color, does: document.querySelector('.ss-does').textContent }));
check(preview.name && preview.color && preview.does.length > 20, `the preview shows the ware's name in its rarity's colour, and what it does (${preview.name}, ${preview.color})`);

// A swap by keyboard: the gloves, for two lavender
check(await keyTo('willowmurk-gloves'), 'the arrow keys choose a ware');
const glovesPreview = await game(() => ({ name: document.querySelector('.ss-title h3').textContent, color: document.querySelector('.ss-title h3').style.color }));
check(glovesPreview.name === 'Willowmurk Riding Gloves' && glovesPreview.color === 'rgb(244, 241, 232)', `the gloves are Wrought, in Wrought's colour (${glovesPreview.color})`);
await page.keyboard.press('Enter');
check(await until(() => window.__swap.shop.confirming, null, 20), 'Enter opens the confirm step');
const confirmText = await game(() => document.querySelector('.ss-box').textContent);
check(/Swap with Quill\?/.test(confirmText) && /Lavender/.test(confirmText) && /Willowmurk Riding Gloves/.test(confirmText), 'the confirm step shows what she gives and what she gets');
await page.keyboard.press('Enter');
await wait(400);
check(await bag('willowmurk-gloves') === 1 && await bag('lavender') === 1, 'Enter makes the swap: two lavender for the gloves');
check(await game(() => !!document.querySelector('.ss-burst')), 'a swap gets its flourish');
await settled();
check(await game(() => document.querySelector('[data-ware="willowmurk-gloves"] .ss-tag')?.textContent === 'She has it'), 'the gloves are hers now, and off his list');

// A swap by taps: the wisp jar, for any dud (her Swamp Tea)
await page.click('[data-ware="wisp-jar"]');
await wait(400);
await page.click('.ss-go');
check(await until(() => window.__swap.shop.confirming, null, 20), 'tapping the Swap button opens the confirm step');
const jarPick = await game(() => document.querySelector('.ss-box .ss-cycle .ss-chip span')?.textContent ?? '');
check(jarPick === 'Swamp Tea', `for "any dud", he'll take her Swamp Tea (${jarPick})`);
await page.click('.ss-yes');
await wait(400);
check(await bag('wisp-jar') === 1 && await bag('swamp-tea') === 0, 'the wisp jar is hers, and the dud is his');
check(await until(() => /vintage/.test(document.querySelector('.ss-say').textContent), null, 40), `Quill likes a dud ("${await said()}")`);
await settled();

// One she can't afford yet: the Owl charm wants Lantern Oil
await page.click('[data-ware="charm-owl"]');
await wait(400);
check(await game(() => document.querySelector('.ss-go').disabled), "the Owl charm's Swap button is off: she has no Lantern Oil");
await page.keyboard.press('Enter');
await wait(500);
check(!(await game(() => window.__swap.shop.confirming)) && await bag('charm-owl') === 0, 'and Enter does nothing but make Quill say so');

// The herb line: her Hush Tea for two nightrose, picked with the arrows in the confirm step
await page.click('[data-ware="two-herbs"]');
await wait(400);
await page.click('.ss-go');
await until(() => window.__swap.shop.confirming, null, 20);
// pay with the Hush Tea, not the skiff's Warming Balm
for (let i = 0; i < 6 && !(await game(() => /Hush Tea/.test(document.querySelector('.ss-box .ss-cycle').textContent))); i++) {
  await page.click('.ss-box .ss-cycle .ss-arrow:last-child'); await wait(250);
}
for (const n of [1, 2]) {
  for (let i = 0; i < 10 && !(await game((n) => /Nightrose/.test(document.querySelectorAll('.ss-box .ss-cycle')[n].textContent), n)); i++) {
    await game((n) => document.querySelectorAll('.ss-box .ss-cycle')[n].querySelector('.ss-arrow:last-child').click(), n);
    await wait(200);
  }
}
const herbsBefore = await bag('nightrose');
await page.click('.ss-yes');
await wait(400);
check(await bag('nightrose') === herbsBefore + 2 && await bag('hush-tea') === 0, `any brew or dud for two herbs of her choosing: Hush Tea for two nightrose (${herbsBefore} -> ${await bag('nightrose')})`);
await settled();

// Quill's own swap: the skiff, for the Warming Balm and the bow-lamp
check(await game(() => !window.__swap.quill.warm), "before the skiff swap, Quill's fingers are cold");
await page.click('[data-ware="the-magpie"]');
await wait(400);
await page.click('.ss-go');
await until(() => window.__swap.shop.confirming, null, 20);
await page.click('.ss-yes');
await wait(600);
check(await game(() => window.__swap.inventory.skiff === true), 'the Magpie is hers to fly');
check(await bag('warming-balm') === 0 && await bag('bow-lamp') === 0, 'for the Warming Balm and the bow-lamp');
check(await game(() => document.querySelector('.ss-burst.skiff') !== null), 'the skiff gets the big flourish');
check(await game(() => window.__swap.quill.warm), 'and Quill\'s hands are warm');
await settled();
check(await until(() => /lights in her/.test(document.querySelector('.ss-say').textContent), null, 30), `"Bring her back with the lights in her."`);

// Escape leaves the shop, and Quill says goodbye
await page.keyboard.press('Escape');
check(await until(() => !document.querySelector('.swap-shop'), null, 20), 'Escape leaves the shop');
check(await until(() => window.__game.field.talking?.thing.name === 'Mister Quill', null, 30), 'Quill has a parting word');
check(await pageThrough(), '...and Space closes it');
check(await game(() => !window.__game.field.locked), 'she can walk again');
check(await game(() => /of 12 slots/.test(document.getElementById('satchel-count').textContent) && !document.getElementById('satchel-skiff').hidden), 'her basket on the field has caught up (and says the skiff is hers)');

// Talking to him again: a warm man now, and the shop opens with his after line
await page.mouse.click(...(await thingOnScreen('quill')));
await until(() => window.__game.field.talking?.thing.id === 'quill', null, 200);
await until(() => !window.__game.field.talking?.typing, null, 60);
check(/Fingers toasty/.test(await game(() => document.getElementById('talk-text').textContent)), 'Quill greets her with warm fingers');
await pageThrough();
check(await until(() => !!window.__swap.shop, null, 40), 'and the shop opens again, with the swaps she made');
check(await game(() => document.querySelector('[data-ware="the-magpie"] .ss-tag')?.textContent === 'Swapped'), "his own swap is marked done");
await page.click('.ss-leave');
check(await until(() => !document.querySelector('.swap-shop'), null, 20), 'the Leave button closes it');

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
