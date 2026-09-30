// Build the whole game into one HTML file you can double-click: node tools/build.mjs
//   dist/wickhollow-square.html           the game, everything inlined (art, fonts, code)
//   dist/wickhollow-square.fragment.html  the same page without <html>/<head>/<body>, for hosts that add their own
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  loader: { '.webp': 'dataurl', '.png': 'dataurl', '.ttf': 'dataurl' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('index.html', 'utf8');
const page = html.slice(html.indexOf('<!-- PAGE -->') + 13, html.indexOf('<!-- /PAGE -->')).trim();
const script = `<script>${js}</script>`;

mkdirSync('dist', { recursive: true });
const full = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${page}
${script}
</html>
`;
writeFileSync('dist/wickhollow-square.html', full);
writeFileSync('dist/wickhollow-square.fragment.html', `${page}\n${script}\n`);
console.log(`dist/wickhollow-square.html  ${(full.length / 1e6).toFixed(2)} MB`);
