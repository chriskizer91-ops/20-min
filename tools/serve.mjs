// Play from source with live rebuilding: node tools/serve.mjs, then open http://localhost:8000
import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';

const port = Number(process.env.PORT || 8000);
const ctx = await esbuild.context({
  entryPoints: Object.fromEntries(Object.entries({
    main: 'src/main.js', viewer: 'src/viewer.js', battle: 'src/battle/main.js', bestiary: 'src/bestiary.js', airship: 'src/airship/main.js',
    bogmire: 'src/bogmire.js', title: 'src/title/main.js',
    wickhollow: 'src/wickhollow.js', gloamwood: 'src/gloamwood.js', brewing: 'src/brew/main.js', 'swap-shop': 'src/swap/main.js',
  }).filter(([, file]) => existsSync(file))),
  bundle: true,
  format: 'esm',
  outdir: 'dev',
  publicPath: '/dev',
  sourcemap: true,
  loader: { '.webp': 'file', '.png': 'file', '.ttf': 'file' },
  logLevel: 'info',
});
await ctx.watch();
const { port: p } = await ctx.serve({ servedir: '.', port });
console.log(`Wickhollow Square: http://localhost:${p}/   The witch up close: http://localhost:${p}/witch.html`);
