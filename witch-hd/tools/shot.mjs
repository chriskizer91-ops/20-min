// Render the model from a few angles into one PNG, in headless Chromium.
//   node tools/shot.mjs out.png [--views front,side,back,q] [--clip Walk --time 0.3] [--zoom head|full|feet|hands] [--size 512]
//   Several shots in one run: --batch shots.json  ([{out, views, clip, time, zoom, size, morphs}])
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  try {
    const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const ZOOM = {
  full: { target: [0, 0.86, 0], dist: 3.9 },
  body: { target: [0, 0.75, 0], dist: 2.6 },
  head: { target: [0, 1.1, 0.05], dist: 1.25 },
  face: { target: [0, 1.08, 0.1], dist: 0.75 },
  hat: { target: [0, 1.38, 0], dist: 1.9 },
  feet: { target: [0, 0.15, 0.05], dist: 1.3 },
  hands: { target: [0.24, 0.5, 0.05], dist: 0.8 },
  torso: { target: [0, 0.72, 0.05], dist: 1.5 },
};
const VIEWS = { front: 0, q: 35, side: 90, back: 180, qb: 145, left: -90, ql: -35 };
function makeViews(list, zoom, pitch) {
  const z = ZOOM[zoom] ?? ZOOM.full;
  return list.split(',').map((v) => ({ yaw: VIEWS[v] ?? Number(v), pitch, ...z }));
}

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
await page.goto(`http://localhost:${port}/tools/viewer/shot.html`);
await page.waitForFunction(() => window.ready);
const model = opt('model', 'witch-hd.glb');
const info = await page.evaluate((u) => window.load('/' + u), model);
console.log(`${info.tris.toLocaleString()} triangles, ${info.bones} bones; clips: ${info.clips.join(', ') || 'none'}`);

const batchFile = opt('batch', null);
const jobs = batchFile ? JSON.parse(await readFile(batchFile, 'utf8')) : [{
  out: args[0] ?? 'shot.png', views: opt('views', 'front,q,side,back'), zoom: opt('zoom', 'full'), clip: opt('clip', null),
  time: opt('time', '0').split(',').map(Number), size: Number(opt('size', 512)), pitch: Number(opt('pitch', 5)), cols: opt('cols', null), hide: opt('hide', ''),
}];
const compose = (urls, horizontal) => page.evaluate(async ([list, horizontal]) => {
  const imgs = await Promise.all(list.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
  const c = document.createElement('canvas');
  if (horizontal) { c.width = imgs.reduce((s, i) => s + i.width, 0); c.height = imgs[0].height; }
  else { c.width = imgs[0].width; c.height = imgs.reduce((s, i) => s + i.height, 0); }
  let o = 0; const g = c.getContext('2d');
  for (const i of imgs) { if (horizontal) { g.drawImage(i, o, 0); o += i.width; } else { g.drawImage(i, 0, o); o += i.height; } }
  return c.toDataURL('image/png');
}, [urls, horizontal]);
for (const j of jobs) {
  // A strip of frames, each with its own clip, time and view
  if (j.frames) {
    const urls = [];
    for (const f of j.frames) {
      const z = ZOOM[f.zoom ?? 'full'];
      urls.push(await page.evaluate((o) => window.render(o), { views: [{ yaw: f.yaw ?? 0, pitch: f.pitch ?? 5, ...z }], size: j.size ?? 400, clip: f.clip ?? null, time: f.time ?? 0 }));
    }
    const url = await compose(urls, true);
    await writeFile(j.out, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', j.out);
    continue;
  }
  const views = Array.isArray(j.views) ? j.views : makeViews(j.views ?? 'front,q,side,back', j.zoom ?? 'full', j.pitch ?? 5);
  const times = Array.isArray(j.time) ? j.time : [j.time ?? 0];
  const all = [];
  for (const t of times) all.push(...views.map((v) => ({ ...v, _t: t })));
  // Render each time separately (a clip time per row)
  const urls = [];
  for (const t of times) urls.push(await page.evaluate((o) => window.render(o), { views, size: j.size ?? 512, clip: j.clip ?? null, time: t, morphs: j.morphs ?? null, hide: (j.hide || '').split(',').filter(Boolean) }));
  if (urls.length === 1) await writeFile(j.out, Buffer.from(urls[0].split(',')[1], 'base64'));
  else {
    const horizontal = views.length === 1;
    const stacked = await page.evaluate(async ([list, horizontal]) => {
      const imgs = await Promise.all(list.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
      const c = document.createElement('canvas');
      if (horizontal) { c.width = imgs.reduce((s, i) => s + i.width, 0); c.height = imgs[0].height; }
      else { c.width = imgs[0].width; c.height = imgs.reduce((s, i) => s + i.height, 0); }
      let o = 0; const g = c.getContext('2d');
      for (const i of imgs) { if (horizontal) { g.drawImage(i, o, 0); o += i.width; } else { g.drawImage(i, 0, o); o += i.height; } }
      return c.toDataURL('image/png');
    }, [urls, horizontal]);
    await writeFile(j.out, Buffer.from(stacked.split(',')[1], 'base64'));
  }
  console.log('wrote', j.out);
}
await browser.close();
server.close();
