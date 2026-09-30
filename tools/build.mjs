// Build each demo into one HTML file you can double-click: node tools/build.mjs
//   dist/<name>.html           the page, everything inlined (art, fonts, code)
//   dist/<name>.fragment.html  the same page without <html>/<head>/<body>, for hosts that add their own
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

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
];

const only = process.argv[2];
mkdirSync('dist', { recursive: true });
for (const page of PAGES) {
  if (only && page.name !== only) continue;
  if (!existsSync(page.html) || !existsSync(page.entry)) { if (only) console.log(`${page.name}: ${page.html} or ${page.entry} doesn't exist yet`); continue; }
  const result = await esbuild.build({
    entryPoints: [page.entry],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: 'es2020',
    legalComments: 'none',
    loader: { '.webp': 'dataurl', '.png': 'dataurl', '.ttf': 'dataurl' },
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
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
  writeFileSync(`dist/${page.name}.html`, full);
  writeFileSync(`dist/${page.name}.fragment.html`, `${body}\n${script}\n`);
  console.log(`dist/${page.name}.html  ${(full.length / 1e6).toFixed(2)} MB`);
}
