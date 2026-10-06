// game-shots.mjs: pictures of the game flying the levelled-up Frigate: in a fight with a raider Frigate alongside,
// and close to that raider, for checking by eye. Run: node tools/build.mjs game && node tools/game-shots.mjs [folder]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2] ?? root + 'shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`file://${root}dist/game.html`);
await page.waitForFunction(() => window.__game?.ready || !document.getElementById('error').hidden, null, { timeout: 180000 });
await page.addStyleTag({ content: '#help{display:none!important}' });
// the Frigate in a fight: a raider Frigate on her port beam and a Cutter ahead, the Captain firing at the Frigate
const info = await page.evaluate(() => {
  const g = window.__game;
  g.fly('frigate'); const P = g.player;
  g.raiders.clear(); P.repair(1); P.pos.set(0, 900, 0); P.heading = 0; P.sail = 0.7; g.waves.timer = 1e9; g.raiders.setAI(false);
  g.waves.state = 'fight';
  const foe = g.raiders.spawn('frigate', P.pos.clone().add({ x: 150, y: 4, z: 30 }), 0.1);
  g.raiders.spawn('cutter', P.pos.clone().add({ x: -60, y: 30, z: 420 }), Math.PI);
  g.cam.yaw = 1.2; g.cam.pitch = 0.12;
  for (let i = 0; i < 12; i++) g.step(0.25, { fire: i % 3 === 0, sail: 0 });
  foe.f.hit('hull', foe.f.full.hull * 0.45); foe.f.hit('sails', foe.f.full.sails * 0.5); foe.f.hit('crystals', foe.f.full.crystals * 0.4);
  P.hit('hull', P.full.hull * 0.3); P.hit('sails', P.full.sails * 0.25);
  g.step(1, {});
  return { ship: P.ship.recipe.name, level: foe.ship.level, raiders: g.raiders.list.length };
});
console.log(info);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/game-frigate-fight.png`, timeout: 120000 });
// close to the raider Frigate, from the Captain's deck
await page.evaluate(() => { const g = window.__game; g.cam.yaw = 1.45; g.cam.pitch = 0.05; g.cam.zoom = 0.6; g.step(0.1, {}); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/game-raider-frigate.png`, timeout: 120000 });
// the Captain's Frigate seen from behind and above, sail taken in
await page.evaluate(() => { const g = window.__game; g.raiders.clear(); g.waves.state = 'calm'; g.cam.yaw = 2.6; g.cam.pitch = 0.35; g.cam.zoom = 0.8; g.step(4, { sail: -1 }); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/game-frigate-calm.png`, timeout: 120000 });
await browser.close();
console.log('done');
