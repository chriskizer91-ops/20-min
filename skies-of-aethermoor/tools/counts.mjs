// counts.mjs: how many triangles each part of the flagship takes at each level of detail, without a browser.
// Run: node tools/counts.mjs [level]
import * as THREE from 'three';
import rectsJson from '../assets/ships/parts.json' with { type: 'json' };
import frigate from '../src/flagship/frigate.js';
import { buildFlagship } from '../src/flagship/build.js';
import { RigBatch } from '../src/flagship/rig.js';
import { shipUniforms } from '../src/flagship/shaders.js';

// materials aren't needed to count: plain stand-ins
const fart = { rects: rectsJson.rects, instance: (colours = { trim: [1, 1, 1], pennant: [[1, 1, 1], [1, 1, 1]] }) => ({
  U: shipUniforms(), colours, get: () => new THREE.MeshBasicMaterial(), depth: () => new THREE.MeshDepthMaterial(),
}) };
// tally each part maker's triangles by wrapping the batch
const tally = new Map();
const add = RigBatch.prototype.add;
RigBatch.prototype.add = function (key, g, m, o) {
  const out = add.call(this, key, g, m, o);
  if (!this.still || true) {
    const who = new Error().stack.split('\n')[2].match(/at (\S+)/)?.[1] ?? '?';
    const k = `${who} ${key}${o?.fit ? ' [' + o.fit + ']' : ''}`;
    tally.set(k, (tally.get(k) ?? 0) + out.attributes.position.count / 3);
  }
  return out;
};
for (const level of process.argv[2] ? [process.argv[2]] : ['full', 'middle', 'far']) {
  tally.clear();
  const s = buildFlagship(frigate, level, fart);
  console.log(`${level}: ${s.stats.triangles.toLocaleString()} triangles shown, ${s.stats.drawCalls} draw calls`);
  const rows = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 18);
  for (const [k, n] of rows) console.log('  ' + String(Math.round(n)).padStart(7) + '  ' + k);
}
