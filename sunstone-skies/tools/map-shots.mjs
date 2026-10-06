// map-shots.mjs: pictures of Aethermoor from the air, for checking the ground by eye: over the central city from
// cruising height, low over the western woods, along the coast of the Hearthsea, and the big map.
// Run: node tools/build.mjs game && node tools/map-shots.mjs [folder]
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
await page.click('#start-free');
// put the Frigate somewhere, facing somewhere, with the camera behind her looking down a little
const view = (o) => page.evaluate((o) => {
  const g = window.__game;
  g.fly('frigate'); const P = g.player;
  g.raiders.clear(); g.waves.timer = 1e9; g.raiders.setAI(false); g.waves.state = 'calm';
  P.pos.set(o.x, o.y, o.z); P.heading = o.heading; P.sail = 0.4; P.vy = 0;
  g.cam.yaw = o.yaw ?? 0; g.cam.pitch = o.pitch; g.cam.zoom = o.zoom ?? 1;
  g.step(0.5, { sail: 0 });
}, o);
const shots = [
  ['map-city', { x: 0, y: 700, z: 2300, heading: Math.PI, pitch: 0.42 }],
  ['map-woods-low', { x: -6000, y: 170, z: 600, heading: Math.PI * 0.75, pitch: 0.28 }],
  ['map-coast', { x: -2600, y: 520, z: -2600, heading: Math.PI * 0.25, pitch: 0.36, yaw: 0.5 }],
];
for (const [name, o] of shots) {
  await view(o);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
}
await page.keyboard.press('m');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/map-big.png`, timeout: 120000 });
await browser.close();
console.log('done');
