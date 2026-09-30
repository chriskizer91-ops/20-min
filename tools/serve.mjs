// Play from source with live rebuilding: node tools/serve.mjs, then open http://localhost:8000
import * as esbuild from 'esbuild';

const port = Number(process.env.PORT || 8000);
const ctx = await esbuild.context({
  entryPoints: ['src/main.js'],
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
console.log(`Wickhollow Square: http://localhost:${p}/`);
