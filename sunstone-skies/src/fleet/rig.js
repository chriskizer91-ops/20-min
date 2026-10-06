// rig.js: each levelled-up ship's working parts. Like ship/kit.js's Batch, every material's pieces are joined into a few
// meshes, but here a piece can move: it carries a channel (which control moves it), a pivot and an axis, and the
// vertex shader turns it round that axis or slides it along it (shaders.js). So the wing sails fold back and furl,
// the gun-port lids swing open, the guns run out and kick back, the rudder, wheel and belly fins answer the helm,
// all without leaving a handful of draw calls.
//   channel 0 never moves; a piece's weight (0..1) scales its channel's turn, so a rope tied between a moving yard
//   and the fixed rail bends instead of tearing off the rail.
// Pieces can also belong to a fitting (armour, racing canvas, ...): each fitting's pieces are their own meshes, shown
// or hidden as the garage fits them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv', 'color', 'billow', 'tag'];
const SIZE = { position: 3, normal: 3, uv: 2, color: 3, billow: 1, tag: 1, rig: 1, rigP: 3, rigA: 3, rigF: 3 };
export const CHANNELS = 40;

export class RigBatch {
  // still: a far-off ship's parts never move, so they all join the fixed meshes
  constructor({ still = false } = {}) { this.parts = new Map(); this.names = ['fixed']; this.still = still; }
  // a channel's number, made on first use
  ch(name) { let i = this.names.indexOf(name); if (i < 0) { i = this.names.length; this.names.push(name); } if (i >= CHANNELS) throw new Error('too many channels'); return i; }
  // key: material; matrix: where the piece goes (in the ship's frame); o: { ch, pivot, axis, weight(p), furl(p), tag, fit }
  add(key, geometry, matrix, o = {}) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const n of Object.keys(g.attributes)) if (!KEEP.includes(n)) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    const count = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    if (o.tag != null) g.setAttribute('tag', new THREE.Float32BufferAttribute(new Float32Array(count).fill(o.tag), 1));
    const moving = o.ch > 0 && !this.still;
    if (moving) {
      const P = g.attributes.position, rig = new Float32Array(count), rp = new Float32Array(count * 3), ra = new Float32Array(count * 3), rf = new Float32Array(count * 3);
      const p = new THREE.Vector3(), axis = o.axis.clone().normalize();
      for (let i = 0; i < count; i++) {
        p.fromBufferAttribute(P, i);
        const w = o.weight ? Math.min(1, Math.max(0, o.weight(p))) : 1;
        rig[i] = o.ch + (1 - w) * 0.999;
        rp.set([o.pivot.x, o.pivot.y, o.pivot.z], i * 3); ra.set([axis.x, axis.y, axis.z], i * 3);
        if (o.furl) { const t = o.furl(p); rf.set([t.x - p.x, t.y - p.y, t.z - p.z], i * 3); }
      }
      g.setAttribute('rig', new THREE.Float32BufferAttribute(rig, 1));
      g.setAttribute('rigP', new THREE.Float32BufferAttribute(rp, 3));
      g.setAttribute('rigA', new THREE.Float32BufferAttribute(ra, 3));
      g.setAttribute('rigF', new THREE.Float32BufferAttribute(rf, 3));
    }
    const group = `${key}|${o.fit ?? ''}|${moving ? 'rig' : ''}`;
    if (!this.parts.has(group)) this.parts.set(group, { key, fit: o.fit ?? null, moving, list: [] });
    this.parts.get(group).list.push(g);
    return g;
  }
  // the same batch, adding these options to every piece (a fitting, a channel) for code that doesn't know about them
  with(extra) { const b = this; return { add: (k, g, m, o = {}) => b.add(k, g, m, { ...o, ...extra }), ch: (n) => b.ch(n), with: (e) => b.with({ ...extra, ...e }) }; }
  // join each group's pieces; pieces missing an attribute the others have get it filled in (white for colour)
  build() {
    const out = [];
    for (const { key, fit, moving, list } of this.parts.values()) {
      const names = new Set();
      for (const g of list) for (const n of Object.keys(g.attributes)) names.add(n);
      for (const g of list) for (const n of names) if (!g.attributes[n]) {
        const fill = new Float32Array(g.attributes.position.count * SIZE[n]);
        if (n === 'color') fill.fill(1);
        g.setAttribute(n, new THREE.Float32BufferAttribute(fill, SIZE[n]));
      }
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      out.push({ key, fit, moving, geometry: merged });
    }
    return out;
  }
}

// The controls a channel answers to: x turns it (radians), y slides it (metres along its axis), z furls it (0..1)
export function rigState(names) {
  const state = Array.from({ length: CHANNELS }, () => new THREE.Vector3());
  const index = Object.fromEntries(names.map((n, i) => [n, i]));
  return {
    state, index,
    set(name, x, y = 0, z = 0) { const i = index[name]; if (i != null) state[i].set(x, y, z); },
    get(name) { const i = index[name]; return i != null ? state[i] : null; },
    // every channel whose name starts with this
    each(prefix, fn) { for (const [n, i] of Object.entries(index)) if (n.startsWith(prefix)) fn(state[i], n); },
  };
}
