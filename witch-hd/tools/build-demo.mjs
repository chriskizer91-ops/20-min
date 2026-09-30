// Build the town-square demo: node tools/build-demo.mjs  ->  square.html (next to witch-hd.glb)
// It takes the game's own page (../index.html), adds a loading screen and a panel of her moves, and bundles
// demo/square.js with the game's engine into one file. The model itself stays in witch-hd.glb beside it.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(here, '..');

const bundle = async (entry) => (await esbuild.build({
  entryPoints: [resolve(here, entry)],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  nodePaths: [resolve(here, 'node_modules')],
  loader: { '.webp': 'dataurl', '.png': 'dataurl', '.ttf': 'dataurl' },
  logLevel: 'warning',
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const js = await bundle('demo/square.js');

const index = readFileSync(resolve(repo, 'index.html'), 'utf8');
let body = index.slice(index.indexOf('<!-- PAGE -->') + 13, index.indexOf('<!-- /PAGE -->')).trim();
const put = (before, text) => {
  if (!body.includes(before)) throw new Error(`page changed: can't find ${before}`);
  body = body.replace(before, text + before);
};
body = body.replace('<title>Wickhollow Square</title>', '<title>Wickhollow Square, HD Witch</title>');
put('</style>', `
  /* The HD witch: a loading screen, and a panel of her moves */
  #loading { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: var(--night); transition: opacity 0.8s; }
  #loading.done { opacity: 0; pointer-events: none; }
  #loading .box { width: min(460px, calc(100% - 32px)); text-align: center; }
  #loading h1 { margin: 0 0 8px; font: 400 clamp(40px, 8vw, 60px)/0.95 var(--display); color: var(--cream); }
  #loading p { margin: 0 0 14px; color: var(--dim); }
  #load-pick { display: grid; gap: 10px; justify-items: center; padding: 16px; border: 2px dashed rgba(236, 220, 184, 0.5); border-radius: 8px; }
  #load-pick label { padding: 8px 14px; background: var(--magenta); border: 1px solid var(--cream); border-radius: 6px; color: #fff; cursor: pointer; }
  #load-pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  #moves { position: fixed; right: var(--gutter); top: calc(62px + env(safe-area-inset-top, 0px)); display: grid; gap: 6px; width: 168px; padding: 10px;
    background: var(--panel); border: 1px solid rgba(236, 220, 184, 0.55); border-radius: 8px; }
  #moves button { padding: 6px 10px; font-size: 14px; text-align: left; background: rgba(58, 22, 49, 0.9); border: 1px solid rgba(236, 220, 184, 0.4); border-radius: 6px; }
  #moves button:hover { border-color: var(--cream); }
  #moves .small { margin: 2px 0 0; font-size: 12px; color: var(--dim); }
  body.backstage #moves { display: none; }
  @media (max-width: 560px) { #moves { top: auto; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); width: calc(100% - 32px); grid-template-columns: repeat(2, 1fr); } #moves .small { grid-column: 1 / -1; } }
`);
put('<button id="btn-backstage"', `<button id="btn-moves" aria-expanded="true" title="Her animations (1-9)">Moves</button>
  <button id="btn-zoom" aria-pressed="false" title="Move the camera in close to her">Zoom</button>
  <button id="btn-run" aria-pressed="false" title="Run (or hold Shift)">Run</button>
  <button id="btn-look" aria-pressed="false" title="Her materials: HD (as authored) or toon (like the game)">HD</button>
  `);
put('<p id="error" hidden></p>', `<section id="moves" aria-label="Her moves"><p class="small">Shift to run. Keys 1-9 play moves.</p></section>
<div id="loading"><div class="box">
  <h1>The Moonlight Witch</h1>
  <p id="load-text">Loading the witch…</p>
  <div id="load-pick" hidden>
    <p>Choose <b>witch-hd.glb</b> (it’s in the same folder as this page), or drop it here.</p>
    <label>Choose the model<input id="load-file" type="file" accept=".glb,model/gltf-binary"></label>
  </div>
</div></div>
`);
const full = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${body}
<script>${js}</script>
</html>
`;
const out = resolve(here, 'square.html');
writeFileSync(out, full);
console.log(`${out}  ${(full.length / 1e6).toFixed(2)} MB`);

// ---------------------------------------------------------------- the close-up viewer
const viewerJs = await bundle('demo/viewer.js');
const viewer = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Moonlight Witch, HD</title>
<style>
  /* One dark look, like the game: plum, cream, magenta and gold, and Witch Way's pixel fonts */
  :root {
    color-scheme: dark;
    --night: #171020;
    --panel: rgba(24, 12, 30, 0.88);
    --plum: #3a1631;
    --cream: #ecdcb8;
    --ink: #f3ead8;
    --dim: #b9a9c4;
    --magenta: #c63d83;
    --gold: #e2bd67;
    --display: 'Jacquard 12', 'Georgia', serif;
    --body: 'Pixelify Sans', 'Trebuchet MS', system-ui, sans-serif;
    --gutter: max(16px, env(safe-area-inset-left, 0px));
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html, body { height: 100%; margin: 0; overflow: hidden; background: var(--night); color: var(--ink); }
  body { font: 15px/1.4 var(--body); -webkit-user-select: none; user-select: none; }
  #view { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
  header { position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); left: var(--gutter); pointer-events: none; text-shadow: 0 2px 0 #000; }
  h1 { margin: 0; font: 400 clamp(36px, 6vw, 56px)/0.95 var(--display); color: var(--cream); }
  header p { margin: 6px 0 0; color: var(--dim); font-size: 14px; }
  #panel { position: fixed; right: var(--gutter); top: calc(14px + env(safe-area-inset-top, 0px)); width: 230px; max-height: calc(100% - 28px); overflow: auto;
    display: grid; gap: 10px; padding: 12px; background: var(--panel); border: 2px solid var(--cream); border-radius: 8px; }
  #panel h2 { margin: 0; font: 400 13px var(--body); color: var(--gold); letter-spacing: 0.06em; text-transform: uppercase; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; }
  button { font: inherit; font-size: 13px; color: var(--ink); cursor: pointer; padding: 5px 9px; background: rgba(58, 22, 49, 0.9); border: 1px solid rgba(236, 220, 184, 0.45); border-radius: 6px; }
  button:hover { border-color: var(--cream); }
  button[aria-pressed='true'] { background: var(--magenta); border-color: var(--cream); color: #fff; }
  button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  label.check { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--dim); }
  #loading { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: var(--night); transition: opacity 0.8s; }
  #loading.done { opacity: 0; pointer-events: none; }
  #loading .box { width: min(460px, calc(100% - 32px)); text-align: center; }
  #loading h1 { margin-bottom: 8px; }
  #loading p { margin: 0 0 14px; color: var(--dim); }
  #load-pick { display: grid; gap: 10px; justify-items: center; padding: 16px; border: 2px dashed rgba(236, 220, 184, 0.5); border-radius: 8px; }
  #load-pick label { padding: 8px 14px; background: var(--magenta); border: 1px solid var(--cream); border-radius: 6px; color: #fff; cursor: pointer; }
  #load-pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  @media (max-width: 620px) {
    #panel { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); left: var(--gutter); width: auto; max-height: 42vh; }
    header p { display: none; }
  }
</style>
<canvas id="view" aria-label="The Moonlight Witch in 3D; drag to turn around her, scroll or pinch to zoom"></canvas>
<header>
  <h1>The Moonlight Witch</h1>
  <p id="stats">Drag to look around her. Scroll or pinch to zoom.</p>
</header>
<section id="panel" aria-label="Try her out">
  <h2>Animations</h2>
  <div class="row" id="clips"></div>
  <label class="check"><input id="repeat" type="checkbox"> Repeat</label>
  <h2>Face</h2>
  <div class="row" id="faces"></div>
  <h2>Look</h2>
  <div class="row"><button id="look" aria-pressed="false">HD</button><button id="spin" aria-pressed="false">Turn</button></div>
  <h2>Look at</h2>
  <div class="row" id="focus"></div>
</section>
<div id="loading"><div class="box">
  <h1>The Moonlight Witch</h1>
  <p id="load-text">Loading the witch…</p>
  <div id="load-pick" hidden>
    <p>Choose <b>witch-hd.glb</b> (it’s in the same folder as this page), or drop it here.</p>
    <label>Choose the model<input id="load-file" type="file" accept=".glb,model/gltf-binary"></label>
  </div>
</div></div>
<script>${viewerJs}</script>
</html>
`;
writeFileSync(resolve(here, 'viewer.html'), viewer);
console.log(`${resolve(here, 'viewer.html')}  ${(viewer.length / 1e6).toFixed(2)} MB`);
