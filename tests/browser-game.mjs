// Plays the whole built game in headless Chromium: node tests/browser-game.mjs (run `node tools/build.mjs game` first).
// It serves dist/game/ over http (the game loads its art as files), then plays the night through, mostly by its test
// handle (window.__play) so it needn't walk every step: the title and New game, the Opening, the cottage (the hag
// stone, the moonwater, a rest), the garden, a Heartsease Tonic at her own cauldron, Inkblot joining in the square,
// Hilde's Horseshoe charm, B1 on the lantern path (a real fight, won), Silas and his flame, the bridge by Wisp-Calm,
// B3 in the Hollow, Quill's swap for the Magpie, the Skiff Wakes and the flight to Bogmire, Nettie's Middle Turn and
// Hush Tea, a lost fight (she wakes at her last rest with everything she had), B5, and the Lantern Mother, through
// Lights Out to the Ending; then the title again, with Continue. Software rendering runs at a few frames a second, so
// every wait is generous; the whole run takes a while.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

// ---------------------------------------------------------------- dist/game over http
const ROOT = resolve('dist/game');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

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
const P = 'window.__play';
const here = () => game(() => window.__play.town?.here?.id ?? null);
const showing = () => game(() => [...document.body.classList].find((c) => c.startsWith('mode-'))?.slice(5) ?? null);
const bag = (id) => game((id) => window.__play.state.bag[id] ?? 0, id);
const flag = (id) => game((id) => !!window.__play.state.flags[id], id);
const talking = () => game(() => window.__play.town?.field.talking?.thing?.id ?? (window.__play.town?.field.talking ? '?' : null));

// Page through whatever's being said
const pageThrough = async () => {
  const seen = [];
  for (let i = 0; i < 40 && (await game(() => !!window.__play.town.field.talking)); i++) {
    await wait(600);
    seen.push(await game(() => document.getElementById('talk-text')?.textContent ?? ''));
    await page.keyboard.press('Space');
    await wait(250);
  }
  return seen.join(' | ');
};
// Talk to a thing on this screen (by id), the way a tap ends: she faces it and the dialogue starts
const talkTo = async (id) => {
  const ok = await game((id) => {
    const f = window.__play.town.field, t = f.things.find((k) => k.id === id);
    if (!t) return false;
    f.talk(t);
    return true;
  }, id);
  if (!ok) return null;
  return pageThrough();
};
// Go to a screen at once (as if she'd walked through its door), and wait for the field to settle
const goTo = async (screen, pixel = null) => {
  await game(([screen, pixel]) => window.__play.town.go(screen, pixel ? { pixel, facing: 'down' } : null), [screen, pixel]);
  await until((s) => window.__play.town.here.id === s && !window.__play.town.going, screen, 200);
  await wait(1200);
};
// Put her at a painting pixel on this screen
const putAt = (x, y) => game(([x, y]) => {
  const t = window.__play.town, p = t.paint.toWorld(x, y);
  t.player.path = null;
  t.player.pos.copy(p);
  t.player.pos.y = t.walk.heightAt(p.x, p.z, 0);
}, [x, y]);
// Pick an herb on this screen (she kneels and picks it)
const gather = async (kind) => {
  const before = await bag(kind);
  const ok = await game((kind) => {
    const f = window.__play.town.field, t = f.things.find((k) => k.herb === kind);
    if (!t) return false;
    f.talk(t);
    return true;
  }, kind);
  return ok && until(([kind, before]) => (window.__play.state.bag[kind] ?? 0) > before, [kind, before], 100);
};
// Win the fight that's on: the foes' HP is set low, and the party's first command is chosen until it's over
const winFight = async () => {
  await until(() => document.body.classList.contains('mode-battle') && !!window.__play.battle?.director, null, 200);
  for (let i = 0; i < 400; i++) {
    const r = await game(() => {
      const d = window.__play.battle?.director;
      if (!document.body.classList.contains('mode-battle')) return 'gone';
      if (!document.getElementById('result')?.hidden) return 'result';
      if (d) for (const u of Object.values(d.state.units)) if (u.side === 'foe' && u.hp > 1) u.hp = 1;
      if (d?.targeting) return 'target';
      const b = document.querySelector('#menu:not([hidden]) #menu-list button:not([disabled])');
      if (b) { b.click(); return 'command'; }
      return 'wait';
    });
    if (r === 'result' || r === 'gone') return r;
    if (r === 'target') await page.keyboard.press('Enter');
    await wait(r === 'wait' ? 500 : 300);
  }
  return 'stuck';
};
// Lose the fight that's on: the party's HP is set to 1, and they Be Still until the foes are done
const loseFight = async () => {
  await until(() => document.body.classList.contains('mode-battle') && !!window.__play.battle?.director, null, 200);
  for (let i = 0; i < 400; i++) {
    const r = await game(() => {
      const d = window.__play.battle?.director;
      if (!document.getElementById('result')?.hidden) return 'result';
      if (d) for (const u of Object.values(d.state.units)) if (u.side === 'hero' && u.hp > 1) u.hp = 1;
      if (d?.targeting) { d.targeting.cancel(); return 'cancel'; }
      const list = [...document.querySelectorAll('#menu:not([hidden]) #menu-list button:not([disabled])')];
      const still = list.find((b) => /Be Still|Puff Up|Stand Firm/.test(b.textContent)) ?? list[0];
      if (still) { still.click(); return 'command'; }
      return 'wait';
    });
    if (r === 'result') return r;
    if (r === 'cancel') await page.keyboard.press('Escape');
    await wait(r === 'wait' ? 500 : 300);
  }
  return 'stuck';
};
const carryOn = async () => {
  await game(() => document.getElementById('result-go')?.click());
  return until(() => document.body.classList.contains('mode-field') && window.__play.town?.active && !window.__play.town.going, null, 200);
};
// The cauldron: herbs into the pot, moonwater, stir, bless, and step away
const brewOnce = async (herbs) => {
  const idle = () => until(() => window.__play.cauldron && !window.__play.cauldron.busy, null, 200);
  const cmd = async (id) => { await idle(); await game((id) => document.querySelector(`.pyp-commands [data-cmd="${id}"]`).click(), id); await wait(400); };
  await cmd('herbs');
  for (const h of herbs) { await game((h) => document.querySelector(`.pyp-herbs [data-herb="${h}"]`).click(), h); await wait(500); }
  await game(() => document.querySelector('.pyp-done').click());
  await cmd('water');
  await cmd('stir');
  await cmd('bless');
  await until(() => !document.querySelector('.pyp-card')?.hidden, null, 100);
  await wait(800);
  await game(() => document.querySelector('.pyp-card button')?.click());
  await wait(600);
  await cmd('leave');
  return until(() => !window.__play.cauldron && window.__play.town.active, null, 100);
};
// A cut-scene: skip it once it has started
const skipScene = async () => {
  await until(() => document.body.classList.contains('mode-title') && !document.getElementById('cut')?.hidden, null, 200);
  await wait(1500);
  await game(() => window.__play.title.skip());
  return until(() => !document.body.classList.contains('mode-title'), null, 200);
};

// ---------------------------------------------------------------- the title, and New game
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForFunction(() => document.body.classList.contains('mode-title'), null, { timeout: 60000 });
await until(() => !document.getElementById('press')?.hidden, null, 100);
check(await game(() => !document.getElementById('press').hidden), '"Tap to begin" comes first');
await page.mouse.click(640, 400);
await until(() => !document.getElementById('menu').hidden, null, 50);
const menu = await game(() => [...document.querySelectorAll('#menu-list button')].map((b) => b.textContent));
check(menu[0] === 'New game' && !menu.includes('Continue'), `the title menu offers New game (${menu.join(', ')})`);
await game(() => window.__play.title.choose('New game'));
check(await until(() => !document.getElementById('cut').hidden, null, 100), 'New game plays the Opening');
await wait(2500);
await game(() => window.__play.title.skip());
check(await until(() => window.__play.town?.here?.id === 'cottage-inside' && window.__play.current === window.__play.town, null, 300),
  `the Opening ends in her cottage (${await here()})`);
await wait(2500);
check(await showing() === 'field' && await game(() => document.getElementById('place-sub').textContent === 'The Cottage'), 'the field is up, and names the place');

// ---------------------------------------------------------------- the cottage
await talkTo('worktable');
check(await bag('hag-stone') === 1, 'her worktable gives her the hag stone');
await talkTo('chest');
check(await bag('moonwater') === 2, 'the chest gives two moonwater');
await talkTo('armchair');
check(await game(() => window.__play.state.rest.name === 'her armchair' && JSON.parse(localStorage.getItem('moonlight-in-the-aether:save')).bag.moonwater === 2),
  'the armchair is a rest point, and the night is saved');

// ---------------------------------------------------------------- the garden, and a Heartsease Tonic at her own pot
await goTo('cottage-garden');
check(await gather('witchs_bells'), "she gathers witch's bells in the garden");
await gather('lavender');
await goTo('cottage-inside', [760, 560]);
await game(() => { const f = window.__play.town.field; f.talk(f.things.find((t) => t.id === 'cauldron')); });
await pageThrough();
check(await until(() => !!window.__play.cauldron, null, 100), 'her cauldron opens the brewing screen');
await brewOnce(['witchs_bells']);
check(await bag('heartsease-tonic') === 1 && await bag('moonwater') === 1 && await bag('witchs_bells') === 0,
  `a Heartsease Tonic: one witch's bells and one moonwater gone into it (moonwater ${await bag('moonwater')})`);

// ---------------------------------------------------------------- the square: Inkblot joins, and Hilde's charm
await goTo('wickhollow-square');
check(await until(() => !!window.__play.town.field.talking, null, 100), 'in the square, Inkblot comes to her');
await pageThrough();
check(await game(() => window.__play.state.party.includes('inkblot') && window.__play.town.followers.length === 1), 'Inkblot joins the party, and follows her');
check(await bag('wickhollow-flame') === 1, 'he drops a rescued flame in her basket');
const hilde = await game(() => window.__play.town.field.things.findIndex((t) => t.name === 'Hilde'));
await game((i) => { const f = window.__play.town.field; f.talk(f.things[i]); }, hilde);
await pageThrough();
check(await bag('charm-horseshoe') === 1 && await bag('heartsease-tonic') === 0, 'Hilde swaps her Horseshoe charm for the Heartsease Tonic');
check(await game(() => window.__play.town.field.exits.find((e) => e.to === 'sable-bridge') && !!window.__play.town.here.cast.locked({ to: 'sable-bridge' })),
  "the stone bridge waits until Silas has said where the lights go");

// ---------------------------------------------------------------- the lantern path: B1, and Silas
await goTo('lantern-path');
check(await game(() => window.__play.town.followers[0].actor.root.parent === window.__play.town.field.group), 'Inkblot comes down the lane with her');
await putAt(1050, 560);
check(await until(() => document.body.classList.contains('mode-battle'), null, 120), 'walking up to the mandrake and the glowcap swirls into B1');
const won1 = await winFight();
check(won1 === 'result' && await game(() => document.getElementById('result-title').textContent === 'Victory'), `B1 is won (${won1})`);
const xp1 = await game(() => window.__play.state.heroes.witch.xp);
check(xp1 > 0, `the party gains XP (${xp1})`);
check(await carryOn(), 'Carry on goes back to the lantern path');
check(await until(() => window.__play.state.fights.B1 === 'won' && window.__play.state.areas.gloamwood.foesAside, null, 60), 'and the foes have stepped aside');
// Lantern Oil (brewed elsewhere, here from the bag) for Silas
await game(() => { window.__play.town.field.give('lantern-oil', 1); });
await putAt(360, 860);
await talkTo('silas');
check(await until(() => window.__play.state.areas.gloamwood.relit, null, 400), "Silas's lanterns are relit");
await until(() => !!window.__play.town.field.talking, null, 200);
await pageThrough();
check(await flag('silas') && await bag('bow-lamp') === 1 && await bag('charm-owl') === 1, 'Silas gives her the Owl charm and his flame for the bow, and says where the moths go');

// ---------------------------------------------------------------- the bridge by Wisp-Calm, and the Hollow (B3)
await game(() => { window.__play.town.field.give('wisp-calm', 1); });
await goTo('sable-bridge');
await putAt(1350, 240);
check(await until(() => window.__play.state.areas.gloamwood.wispsAway, null, 200), 'Wisp-Calm lets her past the Sour Wisps, without a fight');
check(await bag('wisp-calm') === 0, 'and the Wisp-Calm is used');
await goTo('the-hollow');
check(await here() === 'the-hollow', 'the far end of the bridge leads on to the Hollow');
const perch = await game(() => window.__play.town.here.data.spots['gloamwing perch']);
await putAt(perch[0] + 40, perch[1] + 60);
check(await until(() => document.body.classList.contains('mode-battle'), null, 200), 'the Gloamwing comes down out of the tree: B3');
const won3 = await winFight();
check(won3 === 'result', `B3 is won (${won3})`);
await carryOn();
check(await flag('b3'), 'the Gloamwing is beaten');
await until(() => !!window.__play.town.field.talking, null, 200);
const seen3 = await pageThrough();
check(/Further than I can walk tonight/.test(seen3), 'the moths stream away downriver: "Further than I can walk tonight."');
check(await until(() => (window.__play.state.bag['inkblots-feather'] ?? 0) === 1, null, 50), "Inkblot's tail feather is back");

// ---------------------------------------------------------------- Quill's swap, the Skiff Wakes, and the flight
await game(() => { window.__play.town.field.give('warming-balm', 1); });
await goTo('sable-riverbank');
await talkTo('quill');
check(await until(() => !!window.__play.shop, null, 100), "talking to Quill opens his swap shop");
await game(() => { const s = window.__play.shop; s.select('the-magpie'); s.confirm(); });
await wait(800);
await game(() => window.__play.shop.accept());
await until(() => !window.__play.shop.busy, null, 100);
check(await flag('skiff') && await bag('warming-balm') === 0 && await bag('bow-lamp') === 0, 'the Magpie is hers, for a Warming Balm and the bow-lamp');
await game(() => window.__play.shop.close());
await until(() => !window.__play.shop && window.__play.town.active, null, 100);
await talkTo('magpie');
check(await skipScene(), 'boarding the Magpie plays the Skiff Wakes');
check(await until(() => document.body.classList.contains('mode-map') && !!window.__play.map, null, 200), 'then the map, docked at Wickhollow');
await game(() => window.__play.map.flyTo('bogmire'));
check(await until(() => window.__play.map.state.mode === 'docked' && window.__play.map.state.at === 'bogmire', null, 400, 500), 'she flies down the Sable and docks at Bogmire');
await game(() => document.getElementById('btn-ashore').click());
check(await until(() => window.__play.town?.here?.id === 'bogmire-moot-circle' && window.__play.town.active, null, 200), 'and goes ashore at the mast');

// ---------------------------------------------------------------- Bogmire: the fen waits for Nettie; the Middle Turn
check(await game(() => !!window.__play.town.here.cast.locked({ to: 'murkway' })), 'the fen waits until Nettie is with her');
await goTo('nettie-hut');
await talkTo('nettie');
check(await skipScene(), "Nettie's first words lead into the Middle Turn");
await until(() => !!window.__play.town.field.talking, null, 200);
await pageThrough();
check(await game(() => window.__play.state.areas.bogmire.asked), 'and then she wants a Hush Tea');
await game(() => { window.__play.town.field.give('hush-tea', 1); });
await talkTo('nettie');
check(await until(() => !!window.__play.town.field.talking, null, 200), 'she drinks it, sleeps an hour, and wakes');
await pageThrough();
check(await game(() => window.__play.state.party.join() === 'witch,inkblot,nettie'), 'Nettie joins the party');

// ---------------------------------------------------------------- a lost fight costs nothing
await game(() => { window.__play.town.field.give('remembrance-incense', 1); });
const before = await game(() => ({ ...window.__play.state.bag }));
await goTo('murkway');
await game(() => {
  const f = window.__play.town.field, t = f.things.find((k) => k.id?.startsWith('B4-'));
  f.talk(t);
});
await pageThrough();
check(await until(() => document.body.classList.contains('mode-battle'), null, 200), 'B4 starts on the Murkway');
const lost = await loseFight();
check(lost === 'result' && await game(() => /sent home/.test(document.getElementById('result-title').textContent)), `B4 is lost (${lost})`);
await game(() => document.getElementById('result-go').click());
check(await until(() => window.__play.town?.active && window.__play.town.here.id === 'nettie-hut', null, 200), `she wakes at her last rest (${await here()})`);
const after = await game(() => ({ ...window.__play.state.bag }));
check(JSON.stringify(after) === JSON.stringify(before), 'with everything she had');
check(await until(() => !window.__play.state.areas.bogmire.met.includes('B4'), null, 60), 'and the fight waits for her');

// ---------------------------------------------------------------- the Long Boardwalk: a rest, and B5
await goTo('long-boardwalk');
await talkTo('rest-bench');
await wait(2000);
check(await game(() => window.__play.state.rest.name === 'the lamp-post bench'), 'the lamp-post bench is a rest point');
const zone = await game(() => window.__play.town.here.data.fight.zone);
const zx = zone.reduce((a, p) => a + p[0], 0) / zone.length, zy = zone.reduce((a, p) => a + p[1], 0) / zone.length;
await putAt(zx, zy);
check(await until(() => document.body.classList.contains('mode-battle'), null, 200), 'walking on into the mist: B5');
check((await winFight()) === 'result', 'B5 is won');
await carryOn();

// ---------------------------------------------------------------- Mother's Hollow: B6, Lights Out, and the Ending
await goTo('mothers-hollow');
await talkTo('lantern-mother');
check(await until(() => document.body.classList.contains('mode-battle'), null, 200), 'the Lantern Mother: B6');
const w6 = await winFight();
check(w6 === 'result' && await game(() => window.__play.battle.fightId === 'B6b'), `her first form falls into Lights Out, and that's won too (${await game(() => window.__play.battle.fightId)})`);
await game(() => document.getElementById('result-go').click());
check(await until(() => document.body.classList.contains('mode-title') && !document.getElementById('cut').hidden, null, 200), 'the Ending plays');
check(await flag('ending'), 'the night is over');
await wait(2000);
await game(() => window.__play.title.skip());
check(await until(() => !document.getElementById('menu').hidden, null, 100), 'and the title comes back');
const menu2 = await game(() => [...document.querySelectorAll('#menu-list button')].map((b) => b.textContent));
check(menu2[0] === 'Continue', `with Continue (${menu2.join(', ')})`);

// ---------------------------------------------------------------- Continue: back into the night, the lights gone home
await game(() => window.__play.title.choose('Continue'));
await page.waitForFunction(() => window.__play?.town?.here?.id && window.__play.current === window.__play.town, null, { timeout: 120000 });
await wait(2500);
check(await here() === 'mothers-hollow', `Continue picks the night up where it was saved (${await here()})`);
const epilogue = await talkTo('lantern-mother');
check(/got home/.test(epilogue ?? ''), `the Lantern Mother sits with her tea ("${(epilogue ?? '').slice(0, 60)}...")`);
check(await game(() => window.__play.state.flags.lightsHome), 'the lights have gone home');

check(!errors.length, `no errors in the console${errors.length ? `: ${errors.slice(0, 5).join(' / ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
