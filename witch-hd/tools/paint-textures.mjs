// Paint the textures in headless Chromium: node tools/paint-textures.mjs  ->  build/textures/*.png|jpg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

// name -> [painter, format]
export const TEXTURES = {
  'eye-open': ['eyeOpen', 'png'],
  'eye-closed': ['eyeClosed', 'png'],
  mouths: ['mouths', 'png'],
  shawl: ['shawl', 'jpg'],
  dress: ['dress', 'jpg'],
  felt: ['felt', 'jpg'],
  leather: ['leather', 'jpg'],
};

const dir = new URL('../build/textures/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const src = readFileSync(new URL('./textures/paint.js', import.meta.url), 'utf8');
const names = [...new Set(Object.values(TEXTURES).map(([p]) => p))];
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: src.replace(/^export /gm, '') + `\nwindow.P = { ${names.join(', ')} };` });
const only = process.argv.slice(2);
for (const [name, [painter, fmt]] of Object.entries(TEXTURES)) {
  if (only.length && !only.includes(name)) continue;
  const url = await page.evaluate(([p, f]) => window.P[p]().toDataURL(f === 'jpg' ? 'image/jpeg' : 'image/png', 0.9), [painter, fmt]);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(dir + `${name}.${fmt}`, buf);
  console.log(`${name}.${fmt}  ${(buf.length / 1024).toFixed(0)} KB`);
}
await browser.close();
