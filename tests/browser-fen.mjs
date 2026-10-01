// Plays Bogmire's fen in the built demo, in headless Chromium: node tests/browser-fen.mjs (run `node tools/build.mjs
// bogmire` first). Down the pier to the Murkway; Hag-Sight lights the planks that hold, and only those are floor; a
// Hollowed patch takes Moonlight, then witchfire, then blooms and can be picked; the planks through the fog are a
// way round B4. On the Long Boardwalk, B5's card; the bench under the lamp-post rests and saves. At Mother's Hollow
// the Lantern Mother speaks, then B6's card. Back down the boardwalk to the Murkway, B4's card on the high path, and
// home to the moot-circle. Nettie and Inkblot follow her once she's met Nettie. Software rendering runs at a few
// frames a second (and the game's clock with it), so every wait is generous.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
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
const here = () => game(() => window.__game.here.id);
const pixel = () => game(() => { const g = window.__game; const p = g.paint.toPixel(g.player.pos); return { x: Math.round(p.x), y: Math.round(p.y) }; });
const putAt = (x, y, heading = Math.PI) => game(([x, y, heading]) => {
  const g = window.__game;
  g.player.path = null;
  g.player.pos.copy(g.paint.toWorld(x, y));
  g.player.heading = heading;
}, [x, y, heading]);
const walkTo = (x, y) => game(([x, y]) => { const g = window.__game; g.field.walkTo(g.paint.toWorld(x, y)); }, [x, y]);
const unfocus = () => game(() => document.activeElement?.blur?.());
const talkTo = (id) => game((id) => { const g = window.__game; const t = g.field.things.find((k) => k.id === id); if (t) g.field.talk(t); return !!t; }, id);
const idle = () => until(() => !window.__game.field.talking && !window.__game.witch.busy && !window.__game.field.locked, null, 200);
const pageThrough = async () => {
  for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) { await page.keyboard.press('Space'); await wait(450); }
  return game(() => !window.__game.field.talking);
};
const card = () => game(() => ({ shown: !document.getElementById('encounter').hidden, name: document.getElementById('enc-name').textContent, foes: document.getElementById('enc-foes').textContent, link: document.getElementById('enc-link').getAttribute('href') }));
const carryOn = async () => { await page.click('#enc-go'); await unfocus(); return until(() => document.getElementById('encounter').hidden && !window.__game.field.locked, null, 40); };
const thingOnScreen = (id) => game((id) => {
  const g = window.__game, t = g.field.things.find((k) => k.id === id);
  if (!t) return null;
  const s = g.stage.worldToScreen(t.pos.clone().setY(t.pos.y + (t.lift ?? 0.6)));
  return [s.x, s.y];
}, id);

await page.goto(pathToFileURL(resolve('dist/bogmire.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
check(await here() === 'bogmire-moot-circle', 'the game starts on the moot-circle');
// As if she'd already met Nettie in her hut
await game(() => window.__game.field.visits.set('nettie', 1));

// ---------------------------------------------------------------- down the pier to the Murkway
await putAt(808, 940, 0);
await wait(500);
await page.keyboard.down('ArrowDown');
const murk = await until(() => window.__game.here.id === 'murkway', null, 120, 250);
await page.keyboard.up('ArrowDown');
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in1 = await pixel();
check(murk && in1.x < 300 && in1.y > 850, `walking off the bottom of the pier comes out on the Murkway, at the bottom of its path (${in1.x}, ${in1.y})`);
check(await game(() => document.getElementById('place-name').textContent === 'The Murkway'), 'the place name says The Murkway');
check(await game(() => window.__game.field.herbTotal === 16), `out on the fen the basket counts its herbs too (${await game(() => window.__game.field.herbTotal)})`);
check(await game(() => window.__game.field.audio.track === 'marsh'), "the marsh music carries on from the moot-circle");
check(await game(() => { const P = window.__game.party; return P.on && P.nettie.root.parent === window.__game.field.group && P.inkblot.root.parent === window.__game.field.group; }), 'Nettie and Inkblot come out onto the fen with her');

// Hag-Sight: the planks that hold are lit; only those are floor
check(await game(() => !document.getElementById('btn-hagsight').hidden), 'the Hag-Sight button shows on the Murkway');
await page.click('#btn-hagsight');
await unfocus();
const lit = await until(() => {
  const L = window.__game.field.fen.low;
  return document.body.classList.contains('hagsight') && L.glows.filter((g) => g.holds).every((g) => g.mat.opacity > 0.5);
}, null, 80);
check(lit && await game(() => document.getElementById('btn-hagsight').getAttribute('aria-pressed') === 'true'), 'Hag-Sight lights the planks that hold, through the fog');
const planks = await game(() => {
  const g = window.__game, L = g.field.fen.low;
  return L.planks.map((p) => { const m = p.a.clone().lerp(p.b, 0.5); return { holds: p.holds, floor: g.walk.canStand(m.x, m.z, 0.15) }; });
});
check(planks.filter((p) => p.holds).every((p) => p.floor) && planks.filter((p) => !p.holds).every((p) => !p.floor) && planks.some((p) => !p.holds),
  `she can stand on the ${planks.filter((p) => p.holds).length} planks that hold, and on none of the ${planks.filter((p) => !p.holds).length} that don't`);
await page.click('#btn-hagsight');
await unfocus();
// Trying a plank that won't hold
const rotten = await game(() => {
  const g = window.__game, L = g.field.fen.low, p = L.planks.filter((k) => !k.holds).at(-1);
  const s = g.stage.worldToScreen(p.a.clone().lerp(p.b, 0.5));
  return [s.x, s.y];
});
await putAt(1150, 690, 0);
await wait(300);
await page.mouse.click(...rotten);
check(await until(() => /soft/.test(document.getElementById('toast').textContent), null, 40), `tapping a plank that won't hold says so ("${await game(() => document.getElementById('toast').textContent.slice(0, 40))}...")`);
await until(() => !window.__game.player.path, null, 100);

// A Hollowed patch: grey; Moonlight shows the rot; witchfire burns it off; it blooms; she picks it
const patch = 'murkway:silver_mugwort:300,860';
await putAt(340, 800, Math.PI);
await wait(500);
const state = () => game((id) => window.__game.field.things.find((t) => t.id === id)?.patch.state, patch);
check(await state() === 'grey', 'a Hollowed patch of silver mugwort grows grey by the path');
await talkTo(patch);
await wait(1500);
const greyLine = await game(() => document.getElementById('talk-text').textContent);
await pageThrough();
check(await until((id) => window.__game.field.things.find((t) => t.id === id)?.patch.state === 'shown', patch, 200), `it can't be picked yet ("${greyLine.slice(0, 38)}..."); Moonlight shows the rot`);
await idle();
await talkTo(patch);
await wait(1200);
await pageThrough();
check(await until((id) => window.__game.field.things.find((t) => t.id === id)?.patch.state === 'bloomed', patch, 300), 'witchfire burns the rot off, and it blooms');
check(await game(() => window.__game.night.cleaned.includes('murkway:silver_mugwort:300,860')), 'the cleaned patch is remembered for the night');
await idle();
await talkTo(patch);
check(await until(() => window.__game.field.bag.silver_mugwort === 1, null, 200), 'then she can pick it, and it goes in the basket');

// The planks through the fog are a way round B4: with the high path blocked, she walks the bridge and the planks
// to the stilts and on to the Long Boardwalk, and B4 never starts
await idle();
await putAt(760, 590, 2.4);
await wait(500);
await game(() => {
  const g = window.__game;
  for (const [x, y] of [[800, 395], [810, 460], [830, 520], [900, 420], [1000, 370]]) {
    const p = g.paint.toWorld(x, y);
    g.walk.obstacles.push({ x: p.x, z: p.z, r: 1.3 });
  }
});
await walkTo(1300, 446);
const round = await until(() => window.__game.here.id === 'long-boardwalk', null, 500, 300);
check(round && !(await game(() => window.__game.night.met.includes('B4'))), `she walks round B4 by the planks through the fog, to the Long Boardwalk (${await here()})`);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in2 = await pixel();
check(in2.x < 300 && in2.y > 820, `she comes up onto the boardwalk at its bottom (${in2.x}, ${in2.y})`);

// ---------------------------------------------------------------- the Long Boardwalk
await walkTo(560, 680);
const b5 = await until(() => !document.getElementById('encounter').hidden, null, 300);
const c5 = await card();
check(b5 && c5.name === 'The Long Boardwalk' && c5.foes.includes('Willow-Wight') && c5.foes.includes('Drowned Chorister') && c5.link.endsWith('#B5'), `walking up the boardwalk meets B5's card (${c5.name}: ${c5.foes.slice(0, 40)}...)`);
check(await carryOn(), 'Carry on closes the card, and she can walk on');
const near = await game(() => { const g = window.__game, P = g.party; return Math.max(P.nettie.root.position.distanceTo(g.player.pos), P.inkblot.root.position.distanceTo(g.player.pos)); });
check(near < 3.5, `Nettie and Inkblot keep up with her (${near.toFixed(1)} m behind at most)`);

// The rest point: the bench under the lamp-post
check(await game(() => !!window.__game.field.rest?.marker.visible), 'the bench under the lamp-post is marked as a rest point');
await walkTo(790, 425);
await until(() => !window.__game.player.path, null, 200);
await talkTo('rest-bench');
await wait(1500);
await pageThrough();
const rested = await until(() => document.getElementById('toast').textContent.startsWith('Rested'), null, 100);
const saved = await game(() => { try { return JSON.parse(localStorage.getItem('witch-way:rest'))?.at; } catch { return null; } });
check(rested && saved?.includes('Long Boardwalk'), `resting at the bench mends everyone and saves (${saved})`);

// On to Mother's Hollow
await idle();
await walkTo(1340, 192);
const hollow = await until(() => window.__game.here.id === 'mothers-hollow', null, 400, 300);
check(hollow, `the far end of the boardwalk leads to Mother's Hollow (${await here()})`);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
check(await game(() => window.__game.field.audio.track === 'ruins'), "Mother's Hollow has quieter, eerier music");
check(await game(() => !window.__game.field.things.some((t) => t.herb || t.patch)), 'no herbs grow at Mother\'s Hollow');

// ---------------------------------------------------------------- the Lantern Mother
const mother = await thingOnScreen('lantern-mother');
await page.mouse.click(...mother);
const met = await until(() => window.__game.field.talking?.thing.id === 'lantern-mother', null, 300);
await wait(2500);
const said = await game(() => ({ who: document.getElementById('talk-name').textContent, text: document.getElementById('talk-text').textContent }));
check(met && said.who === 'The Lantern Mother' && said.text.startsWith('Hush now'), `tapping the Lantern Mother: she speaks ("${said.text.slice(0, 40)}...")`);
check(await game(() => document.getElementById('talk-face').src.startsWith('data:image/png')), 'she has a portrait of her own model');
let kind = false;
for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) {
  if ((await game(() => document.getElementById('talk-text').textContent)).includes('Kind, and wrong')) kind = true;
  await page.keyboard.press('Space'); await wait(450);
}
const b6 = await until(() => !document.getElementById('encounter').hidden, null, 100);
const c6 = await card();
check(kind && b6 && c6.name === 'The Lantern Mother' && c6.link.endsWith('#B6'), `she takes them for her lost children ("Kind, and wrong"), then B6's card (${c6.name})`);
check(await carryOn(), 'after the card she can carry on');

// Back to the boardwalk, and down to the Murkway
await walkTo(790, 1018);
const back = await until(() => window.__game.here.id === 'long-boardwalk', null, 300, 300);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in3 = await pixel();
check(back && in3.x > 1100 && in3.y < 320, `back down the jetty comes out at the far end of the boardwalk (${in3.x}, ${in3.y})`);
await putAt(150, 960, 0);
await wait(400);
await walkTo(110, 1020);
const down = await until(() => window.__game.here.id === 'murkway', null, 200, 300);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in4 = await pixel();
check(down && in4.x > 1150 && in4.y < 480, `down off the boardwalk comes out on the Murkway's stilts (${in4.x}, ${in4.y})`);
check(await game(() => window.__game.field.things.find((t) => t.id === 'murkway:silver_mugwort:300,860') === undefined), 'the patch she picked stays picked');

// B4 on the high path
await walkTo(900, 430);
const b4 = await until(() => !document.getElementById('encounter').hidden, null, 400);
const c4 = await card();
check(b4 && c4.name === 'The Murkway' && c4.foes.includes('Hollowed Boglurcher') && c4.foes.includes('Hollowed Mire Leech') && c4.link.endsWith('#B4'), `walking the high path meets B4's card (${c4.foes.slice(0, 44)}...)`);
check(await carryOn(), 'Carry on, and the way is hers again');

// Home
await putAt(120, 1000, 0);
await wait(400);
await walkTo(50, 1075);
const home = await until(() => window.__game.here.id === 'bogmire-moot-circle', null, 200, 300);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in5 = await pixel();
check(home && in5.y > 880 && Math.abs(in5.x - 808) < 120, `back up to Bogmire, at the bottom of the pier (${in5.x}, ${in5.y})`);
check(await game(() => document.getElementById('btn-hagsight').hidden && !document.body.classList.contains('hagsight')), 'the Hag-Sight button is only on the Murkway');

// And past the mast, the Long Boardwalk again, the short way
await putAt(1450, 598, Math.PI / 2);
await wait(400);
await walkTo(1532, 592);
const east = await until(() => window.__game.here.id === 'long-boardwalk', null, 200, 300);
await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
const in6 = await pixel();
check(east && in6.x < 320 && in6.y > 780, `past the mast, the Long Boardwalk runs out from Bogmire (${in6.x}, ${in6.y})`);

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
