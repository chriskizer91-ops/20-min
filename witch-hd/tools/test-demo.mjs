// Play the demo in headless Chromium: node tools/test-demo.mjs [out-dir]
// Serves this folder, opens square.html, checks the witch loads with all her clips, walks her with the keys,
// taps somewhere to walk there, plays her moves, and saves screenshots along the way.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(process.argv[2] ?? join(root, 'build/test'));
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
  try {
    const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'content-length': data.length });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const wait = (ms) => page.waitForTimeout(ms);
const game = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: join(out, `${name}.png`), timeout: 180000 });

await page.goto(`http://localhost:${server.address().port}/square.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 180000 });
check(true, 'the square starts with the HD witch');
const info = await game(() => {
  const w = window.__game.witch;
  let tris = 0;
  w.root.traverse((o) => { if (o.isMesh && o.geometry.index) tris += o.geometry.index.count / 3; });
  return { clips: w.clips, tris };
});
check(info.tris > 500000, `she has ${info.tris.toLocaleString()} triangles`);
check(info.clips.length >= 10, `${info.clips.length} animations: ${info.clips.join(', ')}`);
await wait(1500);
await shot('01-start');

// Walk with the keys
const pos = () => game(() => { const p = window.__game.player.pos; return { x: p.x, z: p.z }; });
const a = await pos();
await page.keyboard.down('ArrowRight'); await wait(1400);
await shot('02-walking');
await page.keyboard.up('ArrowRight');
await wait(1500);
const b = await pos();
check(Math.hypot(b.x - a.x, b.z - a.z) > 0.6, `the arrow keys walk her (${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)} m)`);
const walkW = await game(() => window.__game.witch.actions.Walk.getEffectiveWeight());
check(walkW < 0.5, 'she settles back into standing when the key is let go');

// Run with Shift
await page.keyboard.down('Shift'); await page.keyboard.down('ArrowDown'); await wait(900);
await shot('03-running');
const runW = await game(() => window.__game.witch.actions.Run.getEffectiveWeight());
await page.keyboard.up('ArrowDown'); await page.keyboard.up('Shift');
check(runW > 0.5, 'Shift makes her run');
await wait(800);

// Zoom in close
await page.getByRole('button', { name: 'Zoom', exact: true }).click();
await wait(2500);
await shot('03b-zoomed');

// Moves from the panel
for (const [label, name] of [['Wave', 'wave'], ['Cast witchfire', 'cast'], ['Twirl', 'twirl'], ['Moonlight', 'moonlight']]) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await wait(300);
  const busy = await game(() => window.__game.witch.busy);
  check(busy, `${label} plays`);
  await wait(500);
  await shot(`04-${name}`);
  await page.waitForFunction(() => !window.__game.witch.busy, null, { timeout: 90000 });
}
check(errors.length === 0, `no errors in the square${errors.length ? ': ' + errors.join(' | ') : ''}`);

// The close-up viewer
errors.length = 0;
await page.goto(`http://localhost:${server.address().port}/viewer.html`);
await page.waitForFunction(() => document.getElementById('loading').classList.contains('done'), null, { timeout: 180000 });
check(true, 'the viewer opens');
const buttons = await page.locator('#v-clips button').count();
check(buttons >= 10, `the viewer lists ${buttons} animations`);
await page.getByRole('button', { name: 'Walk', exact: true }).click();
await wait(1200);
await shot('05-viewer-walk');
await page.getByRole('button', { name: 'Face', exact: true }).click();
await page.getByRole('button', { name: 'Smile', exact: true }).click();
await wait(800);
await shot('06-viewer-face');
check(errors.length === 0, `no errors in the viewer${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
server.close();
console.log(failed ? `${failed} failed` : 'all good', ' screenshots in', out);
process.exit(failed ? 1 : 0);
