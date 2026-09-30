// Build the demo pages: node tools/build-demo.mjs
//   square.html            Wickhollow Square with the HD witch (the game's own page and engine)
//   viewer.html            the witch up close
//   build/artifact/        one page holding both views, for hosting where files are capped at 15 MB: index.html
//                          (a page body, for a host that adds its own <html>/<head>) and the model in two parts
// The pages load witch-hd.glb from beside them; it is never inlined.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

const doc = (body) => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${body}
</html>
`;

// ---------------------------------------------------------------- shared pieces
const LOADING_CSS = `
  /* Loading the model */
  #loading { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding-inline: 16px; background: var(--night); transition: opacity 0.8s; }
  #loading.done { opacity: 0; pointer-events: none; }
  #loading .box { width: min(460px, 100%); text-align: center; }
  #loading h1 { margin: 0 0 8px; font: 400 clamp(40px, 9vw, 60px)/0.95 var(--display); color: var(--cream); text-wrap: balance; }
  #loading p { margin: 0 0 14px; color: var(--dim); font-variant-numeric: tabular-nums; }
  #load-pick { display: grid; gap: 10px; justify-items: center; padding: 16px; border: 2px dashed rgba(236, 220, 184, 0.5); border-radius: 8px; }
  #load-pick label { padding: 8px 14px; background: var(--magenta); border: 1px solid var(--cream); border-radius: 6px; color: #fff; cursor: pointer; }
  #load-pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  @media (prefers-reduced-motion: reduce) { #loading { transition: none; } }
`;
const LOADING_HTML = `<div id="loading"><div class="box">
  <h1>The Moonlight Witch</h1>
  <p id="load-text">Loading the witch…</p>
  <div id="load-pick" hidden>
    <p>Choose <b>witch-hd.glb</b> (it’s in the same folder as this page), or drop it here.</p>
    <label>Choose the model<input id="load-file" type="file" accept=".glb,model/gltf-binary"></label>
  </div>
</div></div>`;

// The square: the game's own page (../index.html) with a panel of her moves added
const index = readFileSync(resolve(repo, 'index.html'), 'utf8');
function squarePage({ closeButton = false } = {}) {
  const page = index.slice(index.indexOf('<!-- PAGE -->') + 13, index.indexOf('<!-- /PAGE -->')).trim();
  const css = page.slice(page.indexOf('<style>') + 7, page.indexOf('</style>'));
  let markup = page.slice(page.indexOf('</style>') + 8).trim();
  const put = (before, text) => {
    if (!markup.includes(before)) throw new Error(`the game's page changed: can't find ${before}`);
    markup = markup.replace(before, text + before);
  };
  put('<button id="btn-backstage"', `${closeButton ? '<button id="btn-close" title="See her up close">Up close</button>\n  ' : ''}<button id="btn-moves" aria-expanded="true" title="Her animations (keys 1-9)">Moves</button>
  <button id="btn-zoom" aria-pressed="false" title="Move the camera in close to her">Zoom</button>
  <button id="btn-run" aria-pressed="false" title="Run (or hold Shift)">Run</button>
  <button id="btn-look" aria-pressed="false" title="Her materials: HD (as authored) or toon (like the game)">HD</button>
  `);
  put('<p id="error" hidden></p>', `<section id="moves" aria-label="Her moves"><p class="small">Shift to run. Keys 1-9 play moves.</p></section>\n`);
  const extraCss = `
  /* The HD witch's panel of moves */
  #moves { position: fixed; right: var(--gutter); top: calc(62px + env(safe-area-inset-top, 0px)); display: grid; gap: 6px; width: 168px; padding: 10px;
    background: var(--panel); border: 1px solid rgba(236, 220, 184, 0.55); border-radius: 8px; }
  #moves button { padding: 6px 10px; font-size: 14px; text-align: left; background: rgba(58, 22, 49, 0.9); border: 1px solid rgba(236, 220, 184, 0.4); border-radius: 6px; }
  #moves button:hover { border-color: var(--cream); }
  #moves .small { margin: 2px 0 0; font-size: 12px; color: var(--dim); }
  #btn-close { color: var(--gold); }
  body.backstage #moves { display: none; }
  @media (max-width: 560px) {
    #moves { top: auto; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); left: var(--gutter); width: auto; grid-template-columns: repeat(2, minmax(0, 1fr)); z-index: 2; }
    #moves .small { grid-column: 1 / -1; }
  }
`;
  return { css: css + extraCss, markup };
}

// The viewer: all of its rules live under #viewer, so it can share a page with the square
const VIEWER_CSS = `
  /* The witch up close */
  #viewer { --night: #171020; --panel: rgba(24, 12, 30, 0.88); }
  #v-view { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; background: var(--night); }
  #viewer header { position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); left: var(--gutter); right: calc(var(--gutter) + 250px); pointer-events: none; text-shadow: 0 2px 0 #000; }
  #viewer h1 { margin: 0; font: 400 clamp(36px, 6vw, 56px)/0.95 var(--display); color: var(--cream); text-wrap: balance; }
  #viewer header p { margin: 6px 0 0; color: var(--dim); font-size: 14px; font-variant-numeric: tabular-nums; }
  #v-panel { position: fixed; right: var(--gutter); top: calc(14px + env(safe-area-inset-top, 0px)); width: 234px; max-height: calc(100% - 28px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); overflow: auto;
    display: grid; gap: 10px; padding: 12px; background: var(--panel); border: 2px solid var(--cream); border-radius: 8px; font: 15px/1.4 var(--body); color: var(--ink); }
  #v-panel h2 { margin: 0; font: 400 13px var(--body); color: var(--gold); letter-spacing: 0.06em; text-transform: uppercase; }
  #viewer .row { display: flex; flex-wrap: wrap; gap: 6px; }
  #viewer button { font: 13px var(--body); color: var(--ink); cursor: pointer; padding: 5px 9px; background: rgba(58, 22, 49, 0.9); border: 1px solid rgba(236, 220, 184, 0.45); border-radius: 6px; }
  #viewer button:hover { border-color: var(--cream); }
  #viewer button[aria-pressed='true'] { background: var(--magenta); border-color: var(--cream); color: #fff; }
  #viewer button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  #viewer #go-square { width: 100%; padding: 9px 12px; font-size: 15px; background: var(--magenta); border-color: var(--cream); color: #fff; }
  #viewer label.check { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--dim); }
  @media (max-width: 620px) {
    #viewer header { right: var(--gutter); }
    #v-panel { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); left: var(--gutter); width: auto; max-height: 40%; }
  }
`;
const viewerMarkup = ({ squareButton = false } = {}) => `<div id="viewer">
<canvas id="v-view" aria-label="The Moonlight Witch in 3D; drag to turn around her, scroll or pinch to zoom"></canvas>
<header>
  <h1>The Moonlight Witch</h1>
  <p id="v-stats">Drag to look around her. Scroll or pinch to zoom.</p>
</header>
<section id="v-panel" aria-label="Try her out">
  ${squareButton ? '<button id="go-square" type="button">Walk her around the square</button>\n  ' : ''}<h2>Animations</h2>
  <div class="row" id="v-clips"></div>
  <label class="check"><input id="v-repeat" type="checkbox"> Repeat</label>
  <h2>Face</h2>
  <div class="row" id="v-faces"></div>
  <h2>Look</h2>
  <div class="row"><button id="v-look" type="button" aria-pressed="false">HD</button><button id="v-spin" type="button" aria-pressed="false">Turn</button></div>
  <h2>Look at</h2>
  <div class="row" id="v-focus"></div>
</section>
</div>`;

// ---------------------------------------------------------------- square.html
{
  const sq = squarePage();
  const js = await bundle('demo/square-page.js');
  const html = doc(`<title>Wickhollow Square, HD Witch</title>
<style>${sq.css}${LOADING_CSS}</style>
${sq.markup}
${LOADING_HTML}
<script>${js}</script>`);
  writeFileSync(resolve(here, 'square.html'), html);
  console.log(`square.html  ${(html.length / 1e6).toFixed(2)} MB`);
}

// ---------------------------------------------------------------- viewer.html
{
  const sq = squarePage(); // for the game's color and font tokens
  const tokens = sq.css.slice(sq.css.indexOf(':root'), sq.css.indexOf('}', sq.css.indexOf(':root')) + 1);
  const js = await bundle('demo/viewer-page.js');
  const html = doc(`<title>Moonlight Witch HD</title>
<style>
  ${tokens}
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html, body { height: 100%; margin: 0; overflow: hidden; background: var(--night); color: var(--ink); }
  body { font: 15px/1.4 var(--body); -webkit-user-select: none; user-select: none; }
${VIEWER_CSS}${LOADING_CSS}</style>
${viewerMarkup()}
${LOADING_HTML}
<script>${js}</script>`);
  writeFileSync(resolve(here, 'viewer.html'), html);
  console.log(`viewer.html  ${(html.length / 1e6).toFixed(2)} MB`);
}

// ---------------------------------------------------------------- the one-page app, and the model in parts
{
  const out = resolve(here, 'build/artifact');
  mkdirSync(out, { recursive: true });
  const glb = readFileSync(resolve(here, 'witch-hd.glb'));
  const PART = 12 * 1024 * 1024;
  const parts = [];
  for (let i = 0, o = 0; o < glb.length; i++, o += PART) {
    const name = `witch-hd.part${i + 1}.bin`;
    const chunk = glb.subarray(o, Math.min(glb.length, o + PART));
    writeFileSync(resolve(out, name), chunk);
    parts.push({ name, size: chunk.length });
  }
  const sq = squarePage({ closeButton: true });
  const js = await bundle('demo/app.js');
  // A page body: the host adds <!doctype>, <html>, <head> and <body>. Title and style come first.
  const page = `<title>Moonlight Witch HD</title>
<style>${sq.css}${VIEWER_CSS}${LOADING_CSS}</style>
<div id="square" hidden>
${sq.markup}
</div>
${viewerMarkup({ squareButton: true })}
${LOADING_HTML}
<script>window.WITCH_PARTS = ${JSON.stringify(parts)};</script>
<script>${js}</script>
`;
  writeFileSync(resolve(out, 'index.html'), page);
  console.log(`build/artifact/index.html  ${(page.length / 1e6).toFixed(2)} MB, model in ${parts.length} parts: ${parts.map((p) => `${(p.size / 1e6).toFixed(1)} MB`).join(', ')}`);
}
