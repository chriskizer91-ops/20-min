// Take screenshots of the built game in headless Chromium, for checking the look without a screen.
//   node tools/shot.mjs out.png [--size 1280x800] [--wait 1500] [--eval "js run in the page first"]
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const [w, h] = opt('--size', '1280x800').split('x').map(Number);
const wait = Number(opt('--wait', '1200'));
const evals = [];
for (let i; (i = args.indexOf('--eval')) >= 0; ) evals.push(args.splice(i, 2)[1]);
const out = args[0] || 'shot.png';

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(pathToFileURL(resolve('dist/wickhollow-square.html')).href);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 20000 }).catch(() => errors.push('never became ready'));
for (const js of evals) {
  const r = await page.evaluate(js);
  if (r !== undefined) console.log('eval:', JSON.stringify(r));
  await page.waitForTimeout(wait);
}
if (!evals.length) await page.waitForTimeout(wait);
await page.screenshot({ path: out });
console.log('wrote', out);
if (errors.length) console.log(errors.join('\n'));
await browser.close();
