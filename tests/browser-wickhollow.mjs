// Plays the built Wickhollow demo in headless Chromium: node tests/browser-wickhollow.mjs (run
// `node tools/build.mjs wickhollow` first). Checks that it starts inside the cottage without errors, walks with the
// keys, takes the hag stone and two moonwater, rests in the armchair, finds the cauldron, goes out to the garden,
// gathers a lavender, finds the grey bed (which can't be picked, and whose rot trail Moonlight shows), walks out of the
// gate to the square (where Hilde, Agnes, Inkblot and the square's herbs are), hears where the lane leads, goes down
// the steps to the riverbank (the Magpie moored cold, the lamp-moths, Quill on his stool), gathers a nightrose, gives it to
// Rosalind for the Bell charm, and walks back up to the square. Software rendering runs at a few frames a second, so
// every wait is generous.
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
const text = (id) => game((id) => document.getElementById(id).textContent, id);
const screenOf = (x, y) => game(([x, y]) => { const g = window.__game; const s = g.stage.pixelToScreen(new g.THREE.Vector2(x, y)); return [s.x, s.y]; }, [x, y]);
const thingOnScreen = (id) => game((id) => {
  const g = window.__game, t = g.field.things.find((k) => k.id === id);
  if (!t) return null;
  const lift = t.lift ?? (t.crow ? 0.15 : t.actor ? 0.6 : t.herb ? 0.2 : 0.3);
  const s = g.stage.worldToScreen(t.pos.clone().setY(t.pos.y + lift));
  return [s.x, s.y];
}, id);
// Put her somewhere (in painting pixels) without walking, facing a way, with the view scrolled straight to her
const putAt = (x, y, heading = Math.PI) => game(([x, y, heading]) => {
  const g = window.__game;
  g.player.path = null;
  g.player.pos.copy(g.paint.toWorld(x, y));
  g.player.heading = heading;
  g.stage.setFocus(g.paint.toPixel(g.player.pos.clone().setY(0.8)), true);
}, [x, y, heading]);
const pageThrough = async (watch) => {
  const seen = [];
  for (let i = 0; i < 40 && (await game(() => !!window.__game.field.talking)); i++) {
    await wait(700);
    seen.push(await text('talk-text'));
    await page.keyboard.press('Space');
    await wait(300);
    if (watch) await watch();
  }
  return { closed: await game(() => !window.__game.field.talking), seen: seen.join(' | ') };
};
// Tap a thing (by id): she walks over and talks to it; then page through
const talkTo = async (id) => {
  const at = await thingOnScreen(id);
  if (!at) return { met: false, closed: false, seen: '' };
  await page.mouse.click(...at);
  const met = await until((id) => window.__game.field.talking?.thing.id === id, id, 200);
  await wait(1500);
  return { met, ...(await pageThrough()) };
};
// Tap an herb of a kind: she walks over, kneels and picks it
const gather = async (kind) => {
  const id = await game((kind) => window.__game.field.things.find((t) => t.herb === kind)?.id, kind);
  if (!id) return false;
  const at = await thingOnScreen(id);
  const before = await game((kind) => window.__game.field.basket[kind] ?? 0, kind);
  await page.mouse.click(...at);
  return until(([kind, before]) => (window.__game.field.basket[kind] ?? 0) > before, [kind, before], 200);
};
// Walk with a key until the town has gone to another screen
const walkOut = async (key, to) => {
  await page.keyboard.down(key);
  const went = await until((to) => window.__game.here.id === to, to, 120, 250);
  await page.keyboard.up(key);
  await until(() => !window.__game.field.locked && !window.__game.player.path, null, 120);
  await wait(800);
  return went;
};

await page.goto(pathToFileURL(resolve('dist/wickhollow.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 });
await wait(1500);

// ---------------------------------------------------------------- 1. the cottage
check(await here() === 'cottage-inside', 'the game starts inside the cottage, where the opening ends');
check(await text('place-name') === 'Wickhollow' && await text('place-sub') === 'The Cottage', `the place name says Wickhollow, the Cottage (${await text('place-sub')})`);
const start = await pixel();
await page.keyboard.down('ArrowLeft'); await wait(2000); await page.keyboard.up('ArrowLeft');
const moved = await pixel();
check(moved.x < start.x - 20, `the left arrow walks her across the floorboards (${Math.round(start.x)} -> ${Math.round(moved.x)})`);
const ids = await game(() => window.__game.field.things.map((t) => t.id));
check(['armchair', 'cauldron', 'round-window', 'worktable', 'chest'].every((id) => ids.includes(id)), `the cottage has its armchair, cauldron, round window, worktable and chest (${ids.join(', ')})`);

const table = await talkTo('worktable');
check(table.met && table.closed && await game(() => window.__game.field.kept?.hag_stone === 1), `her worktable gives her the hag stone ("${table.seen.slice(0, 60)}...")`);
check((await text('basket-list')).includes('Hag stone'), 'the hag stone shows in the basket');
const chest = await talkTo('chest');
check(chest.met && await game(() => window.__game.field.items.moonwater === 2), 'the chest at the foot of the stairs gives two moonwater');
const chair = await talkTo('armchair');
check(chair.met && await game(() => window.__game.field.rested?.at === 'cottage-inside'), 'the armchair is a rest point: she rests, mends and saves');
const pot = await talkTo('cauldron');
check(pot.met && /brew/i.test(pot.seen), `the cauldron (id 'cauldron') says she'll brew there ("${pot.seen.slice(0, 50)}...")`);

// Out of the front door (with the keys: the basket's panel sits over the doorstep on this screen size)
await putAt(1240, 930, Math.PI / 2);
await wait(600);
await page.keyboard.down('ArrowRight');
await page.keyboard.down('ArrowDown');
const inGarden = await until(() => window.__game.here.id === 'cottage-garden' && !window.__game.field.locked, null, 200, 250);
await page.keyboard.up('ArrowDown');
await page.keyboard.up('ArrowRight');
check(inGarden, `walking out of the front door fades to the garden (${await here()})`);
await wait(1500);
check(await text('place-sub') === 'The Cottage Garden', 'the place name says the Cottage Garden');
const door = await pixel();
check(door.y < 640 && Math.abs(door.x - 1040) < 120, `she comes out at the cottage door (${Math.round(door.x)}, ${Math.round(door.y)})`);

// ---------------------------------------------------------------- 2. the garden
check(await gather('lavender'), 'tapping a lavender walks her over, kneels and puts it in the basket');
const kinds = await game(() => [...new Set(window.__game.field.things.filter((t) => t.herb).map((t) => t.herb))].sort().join(', '));
check(kinds === 'lavender, moonpetal, witchs_bells', `the garden grows lavender, moonpetal and witch's bells (${kinds})`);
check(await text('basket-count') === '1 of 20', `the basket counts the whole town's herbs (${await text('basket-count')})`);
const grey = await game(() => { const t = window.__game.field.things.find((k) => k.id === 'grey-bed'); return t && !t.herb; });
check(grey, 'the grey lavender bed is there, and it is not an herb to pick');
const bed = await talkTo('grey-bed');
check(bed.met && /grey/i.test(bed.seen) && /rot/i.test(bed.seen), `it says a line about the rot ("${bed.seen.slice(0, 70)}...")`);
check(await game(() => window.__game.field.basket.lavender === 1), 'and nothing came out of it into the basket');
check(await until(() => window.__wick.G.trail?.marks.some((m) => m.material.opacity > 0.2), null, 40), 'Moonlight shows the rot trail running down the path');

// Out of the gate, to the square
await putAt(920, 940, 0);
await wait(600);
check(await walkOut('ArrowDown', 'wickhollow-square'), 'walking out of the garden gate fades to the square');
check(await text('place-sub') === 'The Well Square', 'the place name says the Well Square');
const lane = await pixel();
check(lane.x < 480 && lane.y < 700, `she comes up the lane behind Quill's stall (${Math.round(lane.x)}, ${Math.round(lane.y)})`);

// ---------------------------------------------------------------- 3. the square, as the square demo has it
const cast = await game(() => window.__game.field.things.map((t) => t.name).filter(Boolean).join(', '));
check(['Hilde', 'Agnes', 'Inkblot'].every((n) => cast.includes(n)), `Hilde, Agnes and Inkblot are in the square (${cast})`);
check(await game(() => window.__game.field.things.filter((t) => t.herb).length === 11), 'the square\'s eleven herbs are planted');
await putAt(1150, 1030, 0);
await wait(600);
await page.keyboard.down('ArrowDown');
const toldLane = await until(() => /lantern path/.test(document.getElementById('toast').textContent), null, 60, 250);
await page.keyboard.up('ArrowDown');
check(toldLane && await here() === 'wickhollow-square', `the lane says it leads to the lantern path ("${(await text('toast')).slice(0, 50)}...")`);

// Down the steps to the riverbank
await putAt(350, 800, 0);
await wait(600);
check(await walkOut('ArrowDown', 'sable-riverbank'), 'walking down the steps fades to the riverbank');
check(await text('place-sub') === 'The Sable Riverbank', 'the place name says the Sable Riverbank');

// ---------------------------------------------------------------- 4. the riverbank
const skiff = await game(() => {
  const s = window.__game.field.group.getObjectByName('the-magpie');
  if (!s) return null;
  let lights = 0, glows = 0;
  s.traverse((o) => { if (o.isPointLight) lights++; if (o.isSprite) glows++; });
  return { lights, glows, low: s.position.y < 0 };
});
check(skiff && skiff.lights === 0 && skiff.glows === 0 && skiff.low, `the Magpie is moored at the jetty, cold and unlit, low on the water (${JSON.stringify(skiff)})`);
const moths = await game(() => { const g = window.__game.field.group; let n = 0; g.traverse((o) => { if (o.name === 'lamp-moth') n++; }); return n; });
check(moths >= 2, `lamp-moths carry their flames down the river (${moths})`);
check(await until(() => window.__wick.R.moths?.some((m) => m.moth.root.visible), null, 40), 'at least one is on the wing');
check(await game(() => Array.isArray(window.__game.here.data.spots.quill)), 'the scene names a spot for Quill by his skiff');
const stool = await talkTo('quill');
check(stool.met && /swap/.test(stool.seen) && /lights in her/.test(stool.seen), `Quill, on his stool by the skiff, sets his swap ("${stool.seen.slice(0, 50)}...")`);
check(await gather('nightrose'), 'she gathers a nightrose by the jetty');
const ros = await talkTo('rosalind');
check(ros.met && /rose/.test(ros.seen), `Rosalind talks about her rose ("${ros.seen.slice(0, 60)}...")`);
check(await game(() => window.__game.field.kept?.bell_charm === 1 && !window.__game.field.basket.nightrose), 'she takes the nightrose and gives the Bell charm');

// Back up the steps
await putAt(150, 1000, 0);
await wait(600);
check(await walkOut('ArrowLeft', 'wickhollow-square'), 'walking back along the path fades to the square');
const steps = await pixel();
check(steps.x < 520 && steps.y > 700, `she comes up the steps from the river (${Math.round(steps.x)}, ${Math.round(steps.y)})`);

check(errors.length === 0, `no errors in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
process.exit(failed ? 1 : 0);
