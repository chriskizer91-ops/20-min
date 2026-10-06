// yard-shots.mjs: pictures of the shipyard demo from set views, for checking the Frigate by eye.
// Run: node tools/build.mjs shipyard && node tools/yard-shots.mjs [folder] [name:yaw,pitch,dist,setup ...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2] ?? root + 'shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 400)); });
await page.goto('file://' + root + 'dist/shipyard.html');
await page.waitForFunction(() => window.__yard?.ready || !document.getElementById('error').hidden, null, { timeout: 180000 });
const err = await page.evaluate(() => document.getElementById('error').hidden ? null : document.getElementById('error').textContent);
if (err) { console.log(err); process.exit(1); }
await page.addStyleTag({ content: '#panel,#views,#which,#btn-panel{display:none!important}' });

await page.evaluate(() => { window.__yard.base = window.__yard.state.dist; });
const shots = process.argv.slice(3).length ? process.argv.slice(3) : ['turn:0.9,0.24,1,0,3,0', 'side:1.5708,0.04,0.9,0,3,0', 'stern:2.5,0.18,0.32,0,1,-18', 'bow:0.6,0.12,0.3,0,1,15', 'deck:0.5,0.75,0.55,0,0,0', 'below:1.1,-0.45,0.8,0,-1,0'];
for (const s of shots) {
  // name:yaw,pitch,distance (a fraction of the whole-ship distance),target x,y,z (metres),setup code
  const name = s.slice(0, s.indexOf(':')), rest = s.slice(s.indexOf(':') + 1), [yaw, pitch, d, tx = 0, ty = 0, tz = 0, ...setup] = rest.split(',');
  await page.evaluate(([yaw, pitch, d, t, setup]) => {
    const y = window.__yard;
    if (setup) new Function('y', setup.replace(/;?settle/, ''))(y);
    if (setup.includes('select(')) y.base = y.state.dist; // a new ship: distances are fractions of hers
    y.view('turn', +yaw, +pitch, y.base * +d);
    y.state.target.set(...t.map(Number)).add(y.ship.root.position);
    y.step(setup.includes('settle') ? 3 : 0.05);
  }, [yaw, pitch, d, [tx, ty, tz], setup.join(',')]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
}
console.log(await page.evaluate(() => `${window.__yard.ship.recipe.id}: ${window.__yard.ship.stats.triangles} triangles, ${window.__yard.ship.stats.drawCalls} draw calls`));
await browser.close();
