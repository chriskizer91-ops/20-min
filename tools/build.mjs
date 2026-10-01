// Build each page into one HTML file you can double-click: node tools/build.mjs [name] [--full]
//   dist/<name>.html           the page, everything inlined (art, fonts, code)
//   dist/<name>.fragment.html  the same page without <html>/<head>/<body>, for hosts that add their own
// The whole game (dist/game.html) holds every painting of the night. At full quality that's over the 16 MB a published
// page can be, so its paintings are first made a little smaller by tools/compact-art.py (Pillow), into
// node_modules/.cache/compact-art/, and the game reads those copies; the demos use the originals. game.html itself is
// written first, by tools/game-page.mjs. `node tools/build.mjs game --full` writes dist/game-full.html instead, with the
// original paintings: about 20 MB, too big to publish, but fine to open from a file (it isn't kept in git).
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
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
  { html: 'game.html', entry: 'src/game/main.js', name: 'game', compact: true },
];
const LIMIT = 16e6; // the most a published page can be

// The game's paintings come from the compact copies, where there are any
const COMPACT = 'node_modules/.cache/compact-art';
const compactArt = {
  name: 'compact-art',
  setup(build) {
    build.onLoad({ filter: /\.webp$/ }, (args) => {
      const small = join(COMPACT, relative(process.cwd(), args.path));
      return { contents: readFileSync(existsSync(small) ? small : args.path), loader: 'dataurl' };
    });
  },
};

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const full = process.argv.includes('--full');
mkdirSync('dist', { recursive: true });
if (!only || only === 'game') gamePage();
for (const page of PAGES) {
  if (only && page.name !== only) continue;
  if (!existsSync(page.html) || !existsSync(page.entry)) { if (only) console.log(`${page.name}: ${page.html} or ${page.entry} doesn't exist yet`); continue; }
  const name = page.compact && full ? `${page.name}-full` : page.name;
  if (page.compact && !full) {
    try { execFileSync('python3', ['tools/compact-art.py'], { stdio: 'inherit' }); } catch { console.log('compact-art: not run (python3 and Pillow are needed); using the full-size art'); }
  }
  const result = await esbuild.build({
    entryPoints: [page.entry],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: 'es2020',
    legalComments: 'none',
    loader: { '.webp': 'dataurl', '.png': 'dataurl', '.ttf': 'dataurl' },
    plugins: page.compact && !full ? [compactArt] : [],
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = readFileSync(page.html, 'utf8');
  const body = html.slice(html.indexOf('<!-- PAGE -->') + 13, html.indexOf('<!-- /PAGE -->')).trim();
  const script = `<script>${js}</script>`;
  const doc = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${body}
${script}
</html>
`;
  writeFileSync(`dist/${name}.html`, doc);
  writeFileSync(`dist/${name}.fragment.html`, `${body}\n${script}\n`);
  const size = Buffer.byteLength(doc);
  console.log(`dist/${name}.html  ${(size / 1e6).toFixed(2)} MB${size > LIMIT ? `  (over the ${LIMIT / 1e6} MB a published page can be)` : ''}`);
}
