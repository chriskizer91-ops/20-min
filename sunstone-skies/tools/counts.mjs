// counts.mjs: how many triangles each part of a levelled-up ship takes at each level of detail, without a browser.
// Run: node tools/counts.mjs [ship] [level]
import * as THREE from 'three';
import rectsJson from '../assets/ships/parts.json' with { type: 'json' };
import { FLEET } from '../src/fleet/index.js';
import { buildFleetShip } from '../src/fleet/build.js';
import { RigBatch } from '../src/fleet/rig.js';
import { shipUniforms } from '../src/fleet/shaders.js';

// materials aren't needed to count: plain stand-ins
const fart = { rects: rectsJson.rects, instance: (colours = { trim: [1, 1, 1], pennant: [[1, 1, 1], [1, 1, 1]], sails: 0xffffff, sailGlow: 0 }) => ({
  U: shipUniforms(), colours, get: () => new THREE.MeshStandardMaterial(), depth: () => new THREE.MeshDepthMaterial(),
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
// node tools/counts.mjs [ship] [level]: one ship and level in detail, or every ship and level in brief
const [only, lvl] = process.argv.slice(2);
for (const R of FLEET.filter((r) => !only || r.id === only)) for (const level of lvl ? [lvl] : ['full', 'middle', 'far']) {
  tally.clear();
  const s = buildFleetShip(R, level, fart);
  console.log(`${R.id.padEnd(8)} ${level.padEnd(6)} ${s.stats.triangles.toLocaleString().padStart(8)} triangles shown, ${s.stats.drawCalls} draw calls`);
  if (!only) continue;
  const rows = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 18);
  for (const [k, n] of rows) console.log('  ' + String(Math.round(n)).padStart(7) + '  ' + k);
}
