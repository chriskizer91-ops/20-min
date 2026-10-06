// build.mjs: makes the pages in dist/, each one file with everything inside (three.js, the ships, their painted
// textures, the map and the two game fonts), so they open on a phone with no internet.
//   dist/game.html     Skies of Aethermoor: fly the Captain's ships over the map
//   dist/hangar.html   the Captain's ships up close
// and, for each, a .artifact.html copy for publishing on claude.ai (which supplies the document around the page).
// Run: node tools/build.mjs   (after `npm install`)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const PAGES = [
  { name: 'game', entry: 'src/game/main.js', html: 'demos/game.html' },
  { name: 'hangar', entry: 'src/demo/hangar.js', html: 'demos/hangar.html' },
];
const font = (f) => 'data:font/woff;base64,' + readFileSync(root + 'assets/fonts/' + f).toString('base64');
mkdirSync(root + 'dist', { recursive: true });
for (const P of PAGES) {
  const out = await build({
    entryPoints: [root + P.entry], bundle: true, format: 'iife', minify: true, target: 'es2020', write: false,
    loader: { '.webp': 'dataurl', '.avif': 'dataurl', '.json': 'json' }, legalComments: 'none',
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  let html = readFileSync(root + P.html, 'utf8')
    .replace('/*FONT_DISPLAY*/', font('jacquard-12.woff'))
    .replace('/*FONT_BODY*/', font('pixelify-sans.woff'));
  html = html.replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
  writeFileSync(`${root}dist/${P.name}.html`, html);
  const page = html.replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '').replace(/<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/<\/head>\s*<body>\s*/i, '').replace(/<\/body>\s*<\/html>\s*$/i, '\n');
  writeFileSync(`${root}dist/${P.name}.artifact.html`, page);
  console.log(`dist/${P.name}.html: ${(html.length / 1048576).toFixed(2)} MB`);
}
