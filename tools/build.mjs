// Build each demo into one HTML file you can double-click: node tools/build.mjs
//   dist/<name>.html           the page, everything inlined (art, fonts, code)
//   dist/<name>.fragment.html  the same page without <html>/<head>/<body>, for hosts that add their own
// The whole game is too big for one file (every painting of the night), so it's a page and a folder of art beside it:
//   dist/game/index.html       the page and its code; the paintings, portraits and fonts load from dist/game/art/
//   dist/game/index.fragment.html   (as above)
// Serve dist/game/ over http to play it (npm run serve has it at /game.html; the browser won't load art from file://
// into WebGL). game.html itself is written first, by tools/game-page.mjs.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { gamePage } from './game-page.mjs';

export const PAGES = [
  { html: 'index.html', entry: 'src/main.js', name: 'wickhollow-square' },
  { html: 'witch.html', entry: 'src/viewer.js', name: 'witch-up-close' },
  { html: 'battle.html', entry: 'src/battle/main.js', name: 'hollow-battle' },
  { html: 'bestiary.html', entry: 'src/bestiary.js', name: 'bestiary' },
  { html: 'airship.html', entry: 'src/airship/main.js', name: 'airship' },
  { html: 'bogmire.html', entry: 'src/bogmire.js', name: 'bogmire' },
  { html: 'title.html', entry: 'src/title/main.js', name: 'title' },
  { html: 'wickhollow.html', entry: 'src/wickhollow.js', name: 'wickhollow' },
  { html: 'gloamwood.html', entry: 'src/gloamwood.js', name: 'gloamwood' },
  { html: 'brewing.html', entry: 'src/brew/main.js', name: 'brewing' },
  { html: 'swap-shop.html', entry: 'src/swap/main.js', name: 'swap-shop' },
  { html: 'game.html', entry: 'src/game/main.js', name: 'game', files: true },
];

const only = process.argv[2];
mkdirSync('dist', { recursive: true });
if (!only || only === 'game') gamePage();
for (const page of PAGES) {
  if (only && page.name !== only) continue;
  if (!existsSync(page.html) || !existsSync(page.entry)) { if (only) console.log(`${page.name}: ${page.html} or ${page.entry} doesn't exist yet`); continue; }
  const out = page.files ? `dist/${page.name}` : 'dist';
  const result = await esbuild.build({
    entryPoints: [page.entry],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: 'es2020',
    legalComments: 'none',
    ...(page.files
      ? { outdir: out, outbase: '.', assetNames: '[dir]/[name]', loader: { '.webp': 'file', '.png': 'file', '.ttf': 'file' } }
      : { loader: { '.webp': 'dataurl', '.png': 'dataurl', '.ttf': 'dataurl' } }),
  });
  if (page.files) {
    rmSync(out, { recursive: true, force: true });
    for (const f of result.outputFiles) {
      if (f.path.endsWith('.js')) continue;
      mkdirSync(dirname(f.path), { recursive: true });
      writeFileSync(f.path, f.contents);
    }
  }
  const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const html = readFileSync(page.html, 'utf8');
  const body = html.slice(html.indexOf('<!-- PAGE -->') + 13, html.indexOf('<!-- /PAGE -->')).trim();
  const script = `<script>${js}</script>`;
  const full = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${body}
${script}
</html>
`;
  const file = page.files ? `${out}/index` : `dist/${page.name}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${file}.html`, full);
  writeFileSync(`${file}.fragment.html`, `${body}\n${script}\n`);
  const art = page.files ? `, with ${result.outputFiles.length - 1} files of art (${(result.outputFiles.reduce((a, f) => a + (f.path.endsWith('.js') ? 0 : f.contents.length), 0) / 1e6).toFixed(1)} MB)` : '';
  console.log(`${file}.html  ${(full.length / 1e6).toFixed(2)} MB${art}`);
}
