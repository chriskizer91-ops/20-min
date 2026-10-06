// closeups.mjs: close pictures of one ship's details, for checking the model by eye.
// Run: node tools/build.mjs && node tools/closeups.mjs brig [folder]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const id = process.argv[2] ?? 'brig', out = process.argv[3] ?? root + 'shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('file://' + root + 'dist/hangar.html');
await page.waitForFunction(() => window.__hangar?.ready, null, { timeout: 180000 });
await page.addStyleTag({ content: '#dock,#card,#btn-card,#title{display:none!important}' });
await page.evaluate((id) => window.__hangar.select(id), id);
// [name, target offset as fractions of the ship's length (x, y, z), yaw, pitch, distance as a fraction of length]
const L = await page.evaluate(() => window.__hangar.state.dist / 1.25);
const shots = [
  ['crystals', [0, 0.18, 0.12], 0.7, 0.25, 0.28], ['stern', [0, 0.02, -0.45], 2.5, 0.22, 0.42], ['bow', [0, 0, 0.42], 0.55, 0.12, 0.42],
  ['deck', [0, 0.05, 0.05], 0.4, 0.75, 0.55], ['below', [0, -0.1, 0], 1.0, -0.4, 0.75], ['ports', [0.1, -0.06, 0], 1.45, 0.02, 0.4],
];
for (const [name, off, yaw, pitch, d] of shots) {
  await page.evaluate(([off, yaw, pitch, d, len]) => {
    const h = window.__hangar, s = h.state;
    h.view('turn', yaw, pitch, d * len * 1.6);
    s.idle = -1e9;
    s.target.set(off[0] * len, off[1] * len, off[2] * len);
  }, [off, yaw, pitch, d, L]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${id}-${name}.png`, timeout: 90000 });
}
await browser.close();
console.log('done');
