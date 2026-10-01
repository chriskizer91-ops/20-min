// Plays the built brewing demo in headless Chromium: node tests/browser-brewing.mjs (run `node tools/build.mjs brewing`
// first). It starts at her cottage hearth with a full basket and eight moonwater, brews Hush Tea with the mouse
// (herbs, moonwater, stir, bless), checks the card and the grimoire, brews Heartsease Tonic with the keys alone, makes a
// dud, hits the moonwater limit, fishes an herb back out, leaves a half-made pot and comes back, opens the cauldron in
// its small and its overlay-only views, and checks the phone layout. Software rendering runs at a few frames a second,
// so every wait is generous.
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
const until = async (fn, arg, tries = 200, every = 300) => {
  for (let i = 0; i < tries; i++) { if (await game(fn, arg)) return true; await wait(every); }
  return false;
};
const idle = () => until(() => window.__brew.cauldron && !window.__brew.cauldron.busy);
// (a step that can't be done yet is aria-disabled, and still clickable, to hear why: so click it from the page)
const cmd = async (id) => { await idle(); await game((id) => document.querySelector(`.pyp-commands [data-cmd="${id}"]`).click(), id); await wait(300); };
const herb = async (id) => { await page.click(`.pyp-herbs [data-herb="${id}"]`); await wait(500); };
const say = () => game(() => document.querySelector('.pyp-say').textContent);
const st = () => game(() => window.__brew.state);
const pot = () => game(() => window.__brew.cauldron.pot);
const basketRow = (name) => game((name) => [...document.querySelectorAll('#basket li')].find((li) => li.textContent.startsWith(name))?.textContent ?? '', name);
const card = () => game(() => {
  const c = document.querySelector('.pyp-card');
  return { shown: !c.hidden, name: c.querySelector('h3')?.textContent, fresh: !!c.querySelector('.pyp-new'), text: c.textContent };
});
const waitCard = () => until(() => !document.querySelector('.pyp-card').hidden);

await page.goto(pathToFileURL(resolve('dist/brewing.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
await wait(1500);

// ---------------------------------------------------------------- the hearth, the models, the start
check(await game(() => !!document.querySelector('.pyp.pyp--hearth canvas') && !!window.__brew.cauldron.view), 'the cauldron screen opens in its hearth view');
check((await basketRow('Moonwater')).endsWith('×8') && (await game(() => document.getElementById('basket-count').textContent)) === '16 herbs',
  `the page shows her basket: 16 herbs and eight moonwater (${await basketRow('Moonwater')})`);
const models = await game(() => {
  const v = window.__brew.cauldron.view;
  const count = (root) => { let all = 0, ink = 0; root.traverse((o) => { if (o.isMesh) { all++; if (o.name === 'ink') ink++; } }); return { all, ink }; };
  return { witch: count(v.witch.root), cauldron: count(v.cauldron.root), stir: v.witch.moves.includes('stir'), moves: v.cauldron.moves };
});
check(models.stir, `the witch has a stir move (${models.stir})`);
check(['talk', 'drop', 'pour', 'stir', 'bless', 'good', 'dud'].every((m) => models.moves.includes(m)), `the cauldron's moves: ${models.moves.join(', ')}`);
check(models.cauldron.all < 180 && models.witch.all < 180, `under 180 meshes: cauldron ${models.cauldron.all} (${models.cauldron.ink} outlines), witch ${models.witch.all} (${models.witch.ink} outlines)`);
check(await until(() => window.__brew.cauldron.view.cauldron.fireLevel > 0.5), 'witchfire catches under the pot as she arrives');
check(await game(() => window.__brew.cauldron.audio && document.querySelector('.pyp-title h2').textContent === 'Pick Your Poison'), 'the title reads Pick Your Poison');

// ---------------------------------------------------------------- Hush Tea, with the mouse
await cmd('herbs');
check(await game(() => !document.querySelector('.pyp-basket').hidden && document.querySelectorAll('.pyp-herbs button').length === 11), 'Herbs opens her basket, with all eleven herbs');
const colour = () => game(() => window.__brew.cauldron.view.cauldron.colour);
const c0 = await colour();
await herb('lavender');
await until((c) => window.__brew.cauldron.view.cauldron.colour !== c, c0, 40);
const c1 = await colour();
await herb('silver_mugwort');
await until((c) => window.__brew.cauldron.view.cauldron.colour !== c, c1, 40);
const c2 = await colour();
check((await pot()).herbs.join() === 'lavender,silver_mugwort', `lavender and silver mugwort go into the pot (${(await pot()).herbs})`);
check(c0 !== c1 && c1 !== c2, `the pot changes colour with each herb (${c0} -> ${c1} -> ${c2})`);
check(await game(() => window.__brew.cauldron.view.cauldron.herbs === 2), 'the two herbs float in the pot');
await page.click('.pyp-done');
await cmd('water');
await idle();
check((await pot()).water && (await st()).moonwater === 8, 'Moonwater pours one bottle in, and nothing is used up before the blessing');
check(await game(() => window.__brew.cauldron.view.cauldron.water), 'the water rises in the cauldron');
await cmd('water');
check((await say()).startsWith('One bottle a brew'), `a second bottle is refused ("${await say()}")`);
await cmd('stir');
const stirring = await game(() => {
  const w = window.__brew.cauldron.view.witch;
  return w.busy;
});
const spoon = await until(() => window.__brew.cauldron.view.witch.root.getObjectByName('spoon').visible, null, 60, 150);
check(stirring && spoon, `Stir: she stirs it with her spoon (busy ${stirring}, spoon out ${spoon})`);
await idle();
check((await pot()).stirred, 'the pot is stirred');
await cmd('bless');
check(await waitCard(), 'Bless: witchfire finishes it, and the card comes up');
let k = await card();
check(k.name === 'Hush Tea' && k.fresh && /New recipe!/.test(k.text), `the card: ${k.name}, "New recipe!" (${k.fresh})`);
check(/Nettie sleeps/.test(k.text) && /loses a turn/.test(k.text), 'the card says what it does in the field and in battle');
let s = await st();
check(s.moonwater === 7 && s.basket.lavender === 1 && s.basket.silver_mugwort === 1 && s.bag['hush-tea'] === 1,
  `the blessing uses one moonwater and the two herbs, and the bag holds hush-tea (${s.moonwater} moonwater, bag ${JSON.stringify(s.bag)})`);
check(s.grimoire.recipes.join() === 'hush-tea', 'the grimoire records Hush Tea');
check((await basketRow('Moonwater')).endsWith('×7') && (await basketRow('Hush Tea')).endsWith('×1'), 'the page\'s basket shows seven moonwater and the Hush Tea');
await page.keyboard.press('Enter');
await wait(500);
check(!(await card()).shown, 'Enter puts the card away');

// ---------------------------------------------------------------- Heartsease Tonic, with the keys alone
await idle();
await page.keyboard.press('Enter'); // Herbs (the cursor is back on the first command)
await wait(500);
check(await game(() => !document.querySelector('.pyp-basket').hidden), 'Enter on Herbs opens the basket');
// lavender, moonpetal, witch's bells: two to the right
await page.keyboard.press('ArrowRight'); await wait(200);
await page.keyboard.press('ArrowRight'); await wait(200);
await page.keyboard.press('Enter'); await wait(800);
await page.keyboard.press('Escape'); await wait(400);
check((await pot()).herbs.join() === 'witchs_bells', `the arrow keys pick witch's bells (${(await pot()).herbs})`);
const keyTo = async (id) => {
  for (let i = 0; i < 8; i++) {
    if (await game((id) => document.querySelector('.pyp-commands button.cur')?.dataset.cmd === id, id)) return true;
    await page.keyboard.press('ArrowDown'); await wait(200);
  }
  return false;
};
await keyTo('water'); await page.keyboard.press('Enter'); await idle();
await keyTo('stir'); await page.keyboard.press('Enter'); await idle();
await keyTo('bless'); await page.keyboard.press('Enter');
check(await waitCard(), 'the keys alone brew it');
k = await card();
check(k.name === 'Heartsease Tonic' && k.fresh, `Heartsease Tonic, new (${k.name})`);
check(/Heals 2d4/.test(k.text), 'Heartsease heals in battle');
await page.keyboard.press(' ');
await wait(500);

// the same recipe again is no longer new
await cmd('herbs'); await herb('witchs_bells'); await page.click('.pyp-done');
await cmd('water'); await cmd('stir'); await cmd('bless');
await waitCard();
k = await card();
check(k.name === 'Heartsease Tonic' && !k.fresh, 'a second Heartsease Tonic is no "New recipe!"');
check((await st()).grimoire.made['heartsease-tonic'] === 2 && (await st()).grimoire.recipes.length === 2, 'the grimoire counts it, and records it only once');
await page.click('.pyp-card-ok');
await wait(400);

// ---------------------------------------------------------------- a dud: two mandrakes
await cmd('herbs'); await herb('mandrake'); await herb('mandrake'); await page.click('.pyp-done');
await cmd('water'); await cmd('stir'); await cmd('bless');
await waitCard();
k = await card();
check(k.name === 'Droopy Hat Draught' && /A dud/.test(k.text) && /Exposed/.test(k.text) && k.fresh, `two mandrakes make a dud, with its own card (${k.name})`);
s = await st();
check(s.bag['droopy-hat-draught'] === 1 && s.moonwater === 4, `the dud goes in the bag for throwing, and costs a moonwater too (${s.moonwater} left)`);
await page.click('.pyp-card-ok');
await wait(400);

// ---------------------------------------------------------------- fishing an herb out, and leaving a half-made pot
await cmd('herbs'); await herb('moonpetal'); await page.click('.pyp-done');
await idle();
await page.click('.pyp-pot [data-slot="0"]');
await wait(500);
check((await pot()).herbs.length === 0 && (await st()).basket.moonpetal === 1, 'tapping an herb in the pot fishes it back out, and nothing is lost');
await cmd('herbs'); await herb('moonpetal'); await page.click('.pyp-done');
await cmd('leave');
await wait(800);
check(await game(() => !document.querySelector('.pyp') && !document.getElementById('reopen').hidden), 'Leave steps away from the pot');
s = await st();
check(s.basket.moonpetal === 1 && s.moonwater === 4, 'the half-made pot cost nothing');
await page.click('#reopen');
await page.waitForFunction(() => window.__brew.cauldron?.view, null, { timeout: 60000 });
await wait(1500);
check((await st()).grimoire.recipes.length === 3, 'back at the cauldron, the grimoire remembers');

// ---------------------------------------------------------------- the grimoire
await page.click('#btn-grimoire');
await wait(800);
const g = await game(() => ({
  open: !document.querySelector('.pyp-grimoire').hidden,
  tabs: [...document.querySelectorAll('.pyp-tabs button')].map((b) => b.textContent),
  filled: [...document.querySelectorAll('.pyp-pages button')].filter((b) => !b.classList.contains('blank')).length,
  page: document.querySelector('.pyp-page').textContent,
}));
check(g.open && g.tabs.join('|') === 'Brews 2/6|Duds 1/3|Herbs 11/11', `the grimoire can be browsed (${g.tabs.join(', ')})`);
await page.click('.pyp-pages [data-page="1"]');
await wait(500);
check(g.filled === 2 && /Not brewed tonight/.test(await game(() => document.querySelector('.pyp-page').textContent)), 'the pages she hasn\'t brewed are still blank (Warming Balm\'s)');
await page.click('.pyp-pages [data-page="3"]');
await wait(500);
check(/Hush Tea/.test(await game(() => document.querySelector('.pyp-page').textContent)) && /Brewed 1 time/.test(await game(() => document.querySelector('.pyp-page').textContent)), 'Hush Tea\'s page is filled in');
await page.click('[data-tab="duds"]');
await wait(500);
check(/Two mandrakes/.test(await game(() => document.querySelector('.pyp-page').textContent)) || (await game(() => document.querySelectorAll('.pyp-pages button:not(.blank)').length)) === 1, 'the dud has its page');
await page.keyboard.press('Escape');
await wait(500);
check(await game(() => document.querySelector('.pyp-grimoire').hidden), 'Escape closes the grimoire');

// ---------------------------------------------------------------- the moonwater limit, in an overlay with no 3D view
await game(() => { window.__dry = window.__brew.openCauldron({ basket: { lavender: 1 }, moonwater: 0, view: 'none' }); });
await wait(800);
check(await game(() => document.querySelectorAll('.pyp').length === 2 && !document.querySelector('.pyp--none canvas')?.offsetWidth), 'openCauldron works as an overlay with no 3D view');
await game(() => document.querySelector('.pyp--none [data-cmd="water"]').click());
await wait(400);
check(/No moonwater left/.test(await game(() => document.querySelector('.pyp--none .pyp-say').textContent)), 'with no moonwater, she can\'t pour');
await game(() => document.querySelector('.pyp--none [data-cmd="herbs"]').click());
await wait(400);
await game(() => document.querySelector('.pyp--none [data-herb="lavender"]').click());
await wait(400);
await game(() => document.querySelector('.pyp--none [data-cmd="stir"]').click());
await wait(400);
check(/dry pot/.test(await game(() => document.querySelector('.pyp--none .pyp-say').textContent)), 'and a dry pot can\'t be stirred or blessed');
let closedWith = await game(() => new Promise((r) => { window.__dry.close(); r(window.__dry.state); }));
check(closedWith.basket.lavender === 1 && closedWith.moonwater === 0, 'closing the overlay hands back everything');

// ---------------------------------------------------------------- the small 3D view, for an overlay on a field screen
await game(() => {
  window.__got = null;
  window.__small = window.__brew.openCauldron({ basket: { witchs_bells: 1 }, moonwater: 1, view: 'small', onBrew: (r) => { window.__got = r; } });
});
await game(() => window.__small.ready);
await wait(1500);
check(await game(() => { const c = document.querySelector('.pyp--small .pyp-scene canvas'); return c && c.offsetWidth > 200 && c.offsetWidth < 500; }), 'the small view has its own little 3D view of the cauldron and the witch');
for (const id of ['herbs']) await game((id) => document.querySelector(`.pyp--small [data-cmd="${id}"]`).click(), id);
await wait(400);
await game(() => document.querySelector('.pyp--small [data-herb="witchs_bells"]').click());
await wait(600);
for (const id of ['water', 'stir', 'bless']) {
  await until(() => !window.__small.busy);
  await game((id) => document.querySelector(`.pyp--small [data-cmd="${id}"]`).click(), id);
  await wait(300);
}
await until(() => !!window.__got);
const got = await game(() => window.__got);
check(got?.item === 'heartsease-tonic' && got.first, `onBrew hands the field the bag's item id (${got?.item})`);
await game(() => window.__small.close());
await wait(500);

// ---------------------------------------------------------------- phone width
await page.setViewportSize({ width: 390, height: 844 });
await wait(2500);
const phone = await game(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const menu = r('.pyp-menu'), scene = r('.pyp-scene'), tools = r('#tools');
  return {
    overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
    menu: menu && menu.left >= 0 && menu.right <= innerWidth && menu.bottom <= innerHeight,
    scene: scene && scene.height > 300,
    tools: tools && tools.right <= innerWidth,
  };
});
check(!phone.overflow && phone.menu && phone.scene && phone.tools, `at 390 x 844 everything fits: no sideways scroll, the menu in view, the hearth on top (${JSON.stringify(phone)})`);
await cmd('herbs');
check(await game(() => { const b = document.querySelector('.pyp-basket').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top > 0; }), 'the basket window fits a phone');
await page.click('.pyp-done');

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
