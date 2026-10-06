// guns.js: the flagship's guns, all of them working parts.
//   Broadsides: each port has a lid hinged at its top, gilt outside and red lead inside, so with the lids shut the
//   plum strake shows a row of gold squares (the "chequer"). At battle stations the lids swing up and the guns run
//   out; when a side fires its guns kick back into the hull and roll out again.
//   Chasers at the bow and stern: long guns on swivels, which kick back along their barrels.
// Two garage fittings change them (docs/frigate.md):
//   long-focus guns: longer barrels with glass lenses along them (more range, less damage)
//   high-angle mounts: barrels raised on brass elevating arcs (they tilt further, but reload slower)
// Every gun is built in all four ways, and the builder shows the one the garage fits.
import * as THREE from 'three';
import { lerp, place, frame, lathe, box } from '../ship/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const along = (g) => g.rotateX(Math.PI / 2);
const VARIANTS = [['std', 'lo'], ['long', 'lo'], ['std', 'hi'], ['long', 'hi']];
export const ELEVATE = 0.2; // how far the high-angle mounts raise the barrels (radians)

// A broadside barrel pointing along +z from its trunnions at the origin: bronze with brass rings, a flared muzzle,
// a glowing crystal in its mouth. Long-focus barrels are longer, with two glass lenses.
function barrel(add, r, L, kind, seg, plain) {
  const long = kind === 'long', len = long ? L * 1.55 : L;
  if (plain) {
    add('bronze', along(lathe([[r * 1.3, -0.5 * L], [r * 1.05, 0.1 * L], [r * 0.95, len * 0.85], [r * 1.2, len * 0.97], [r * 0.95, len]], seg)));
    add('crystal', along(lathe([[r * 0.8, 0], [0.001, 0.16 * L]], 5)), place([0, 0, len - 0.04 * L]));
    return len;
  }
  add('bronze', along(lathe([[r * 1.3, -0.5 * L], [r * 1.32, -0.42 * L], [r * 1.2, -0.38 * L], [r * 1.18, 0.05 * L], [r * 1.05, 0.1 * L], [r * 0.95, len * 0.85], [r * 1.15, len * 0.88],
    [r * 1.2, len * 0.97], [r * 0.95, len]], seg)));
  add('bronze', along(lathe([[0.001, -0.62 * L], [r * 0.5, -0.6 * L], [r * 0.7, -0.53 * L], [r * 1.3, -0.5 * L]], seg)));
  for (const t of [0.0, 0.32, 0.62]) add('brass', along(lathe([[r * 1.08, -0.02], [r * 1.22, 0], [r * 1.08, 0.02]].map(([a, b]) => [a * (1 - t * 0.15), b * L * 3]), seg)), place([0, 0, t * len]));
  if (long) for (const t of [0.42, 0.72]) {
    add('brass', along(lathe([[r * 1.0, -0.06], [r * 1.55, -0.05], [r * 1.6, 0], [r * 1.55, 0.05], [r * 1.0, 0.06]], seg)), place([0, 0, t * len]));
    add('glass', along(new THREE.CylinderGeometry(r * 1.42, r * 1.42, 0.05, seg)), place([0, 0, t * len]));
  }
  add('crystal', along(lathe([[r * 0.8, 0], [r * 0.8, 0.06 * L], [r * 0.45, 0.13 * L], [0.001, (long ? 0.32 : 0.16) * L]], 6)), place([0, 0, len - 0.04 * L]));
  return len;
}

// One broadside port: frame, opening, lid (on its hinge channel) and the gun in all its fittings (on its run-out channel)
function port(batch, m, w, h, q, S, glows, side, chan) {
  const b = Math.min(w, h) * 0.1, d = 0.11, seg = q.latheSeg;
  const at = (mat) => new THREE.Matrix4().multiplyMatrices(m, mat);
  batch.add('dark', new THREE.PlaneGeometry(w, h), at(place([0, 0, 0.018])));
  for (const [x, y, bw, bh] of [[0, h / 2 + b / 2, w + 2 * b, b], [0, -h / 2 - b / 2, w + 2 * b, b], [w / 2 + b / 2, 0, b, h], [-w / 2 - b / 2, 0, b, h]])
    batch.add('brass', box(bw, bh, d), at(place([x, y, d / 2 - 0.015])));
  if (q.rivets) for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) batch.add('brass', S.rivet, at(place([x * (w / 2 + b / 2), y * (h / 2 + b / 2), d - 0.012], { dir: V(0, 0, 1), scale: b * 0.32 })));
  // the lid, hinged along its top edge; shut it sits in the frame
  const hinge = V(0, h / 2, 0.075).applyMatrix4(m), axis = V(1, 0, 0).transformDirection(m);
  const lid = { ch: chan.lids, pivot: hinge, axis };
  const t = 0.07, lw = w - 0.02, lh = h - 0.02;
  batch.add('wood', box(lw, lh, t, 1.3), at(place([0, 0, 0.06])), lid);
  batch.add('gilt', new THREE.PlaneGeometry(lw * 0.97, lh * 0.97), at(place([0, 0, 0.06 + t / 2 + 0.004])), lid);
  batch.add('redlead', new THREE.PlaneGeometry(lw * 0.97, lh * 0.97).rotateY(Math.PI), at(place([0, 0, 0.06 - t / 2 - 0.004])), lid);
  if (q.level === 'full') for (const x of [-0.28, 0.28]) {
    batch.add('brass', box(0.07, lh * 0.82, 0.025), at(place([x * lw, lh * 0.08, 0.06 + t / 2 + 0.014])), lid);
    batch.add('brass', new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6).rotateZ(Math.PI / 2), at(place([x * lw, h / 2, 0.075])), lid);
  }
  if (!q.portGuns) return;
  // the gun, level in its port even where the hull leans; in four fittings
  const n = V(0, 0, 1).transformDirection(m), level = n.clone().setY(0).normalize(), right = new THREE.Vector3().crossVectors(UP, level);
  const p0 = V(0, -0.02 * h, -0.02).applyMatrix4(m);
  const r = Math.min(w, h) * 0.16, L = 0.82 * h;
  for (const [kind, mount] of VARIANTS) {
    if (q.level !== 'full' && (kind === 'long' || mount === 'hi')) continue;
    const up = mount === 'hi' ? new THREE.Quaternion().setFromAxisAngle(right, -ELEVATE) : new THREE.Quaternion();
    const dir = level.clone().applyQuaternion(up), upv = UP.clone().applyQuaternion(up);
    const gm = frame(p0, new THREE.Vector3().crossVectors(upv, dir), upv, dir);
    const fit = `guns-${kind}-${mount}`;
    const o = { ch: chan.guns, pivot: p0, axis: dir, fit };
    const add = (key, g, mat) => batch.add(key, g, mat ? new THREE.Matrix4().multiplyMatrices(gm, mat) : gm, o);
    const len = barrel(add, r, L, kind, seg, q.level !== 'full');
    glows.push({ p: V(0, 0, len + 0.12 * L).applyMatrix4(gm), size: 0.8 * h, color: 0xff9a30, chan: (side > 0 ? 2 : 3) + (kind === 'long' ? 8 : 0) + (mount === 'hi' ? 16 : 0) });
    if (mount === 'hi' && kind === 'std') {
      // the elevating arc: a brass quadrant on the sill, with its screw
      const arc = [];
      for (let i = 0; i <= 8; i++) { const a = -0.2 + (i / 8) * 0.9; arc.push(V(0, -h * 0.5 + Math.sin(a) * 0.28, 0.02 + Math.cos(a) * 0.28)); }
      for (const x of [-w * 0.3, w * 0.3]) batch.add('brass', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc.map((p) => p.clone().setX(x))), 8, 0.025, 4), at(new THREE.Matrix4()), { fit: 'mount-hi' });
      batch.add('brass', box(w * 0.75, 0.06, 0.16), at(place([0, -h * 0.5 + 0.03, 0.12])), { fit: 'mount-hi' });
    }
  }
}

// A long gun (bow and stern chasers) pointing along +z from its pivot at the origin; its swivel stands `post` below.
// The base stays put; the chamber and barrel kick back along the barrel on the battery's channel.
function longGun(batch, m, len, q, S, glows, { post = 0.42, swivel = true, chan, glowChan }) {
  const s = len / 2.6, seg = q.latheSeg;
  if (q.level !== 'full') {
    // far off, a chaser is a barrel with a crystal at each end
    const o = { ch: chan, pivot: V(0, 0, 0).applyMatrix4(m), axis: V(0, 0, 1).transformDirection(m), fit: 'guns-std-lo' };
    batch.add('bronze', along(lathe([[0.14 * s, -0.5 * s], [0.12 * s, 0.3 * s], [0.08 * s, len], [0.11 * s, len + 0.15 * s]], Math.max(5, seg >> 1))), m, o);
    batch.add('crystal', along(lathe([[0.06 * s, 0], [0.001, 0.26 * s]], 4)), new THREE.Matrix4().multiplyMatrices(m, place([0, 0, len + 0.15 * s])), o);
    glows.push({ p: V(0, 0, len + 0.3 * s).applyMatrix4(m), size: 0.75 * s, color: 0xffa040, chan: glowChan });
    if (swivel) batch.add('bronze', new THREE.CylinderGeometry(0.08 * s, 0.12 * s, post, 5), new THREE.Matrix4().multiplyMatrices(m, place([0, -post / 2, 0])));
    return;
  }
  const fixed = (key, g, mat, fit) => batch.add(key, g, mat ? new THREE.Matrix4().multiplyMatrices(m, mat) : m, fit ? { fit } : {});
  if (swivel) {
    fixed('brass', lathe([[0.001, 0], [0.34 * s, 0], [0.34 * s, 0.05 * s], [0.28 * s, 0.08 * s], [0.12 * s, 0.1 * s], [0.001, 0.1 * s]], seg), place([0, -post, 0]));
    fixed('bronze', new THREE.CylinderGeometry(0.075 * s, 0.1 * s, post - 0.12 * s, Math.max(6, seg >> 1)), place([0, -post / 2 - 0.02 * s, 0]));
    for (const x of [-1, 1]) fixed('brass', box(0.04 * s, 0.26 * s, 0.16 * s), place([x * 0.18 * s, -0.04 * s, 0]));
    fixed('brass', box(0.4 * s, 0.05 * s, 0.14 * s), place([0, -0.17 * s, 0]));
    fixed('bronze', new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.44 * s, 6).rotateZ(Math.PI / 2), null);
    // the high-angle mount's quadrant, standing beside the gun
    if (q.level === 'full') for (const x of [-1, 1]) {
      const arc = [];
      for (let i = 0; i <= 8; i++) { const a = -0.3 + (i / 8) * 1.0; arc.push(V(x * 0.22 * s, Math.sin(a) * 0.36 * s - 0.05 * s, Math.cos(a) * 0.36 * s - 0.1 * s)); }
      fixed('brass', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 8, 0.03 * s, 4), null, 'mount-hi');
    }
  }
  for (const [kind, mount] of VARIANTS) {
    if (q.level !== 'full' && (kind === 'long' || mount === 'hi')) continue;
    const lm = mount === 'hi' ? new THREE.Matrix4().multiplyMatrices(m, new THREE.Matrix4().makeRotationX(-ELEVATE)) : m;
    const dir = V(0, 0, 1).transformDirection(lm), pivot = V(0, 0, 0).applyMatrix4(lm);
    const o = { ch: chan, pivot, axis: dir, fit: `guns-${kind}-${mount}` };
    const add = (key, g, mat) => batch.add(key, g, mat ? new THREE.Matrix4().multiplyMatrices(lm, mat) : lm, o);
    // the crystal chamber in its brass caps
    add('crystal', along(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.62 * s, Math.max(6, seg >> 1), 1)), place([0, 0, -0.06 * s]));
    for (const z of [-0.4, 0.27]) add('brass', along(lathe([[0.001, -0.07 * s], [0.15 * s, -0.07 * s], [0.17 * s, -0.03 * s], [0.17 * s, 0.03 * s], [0.15 * s, 0.07 * s], [0.001, 0.07 * s]], seg)), place([0, 0, z * s]));
    for (const x of [-1, 1]) add('brass', box(0.03 * s, 0.03 * s, 0.6 * s), place([x * 0.12 * s, 0.1 * s, -0.06 * s]));
    add('brass', along(lathe([[0.001, -0.05 * s], [0.1 * s, -0.05 * s], [0.12 * s, 0.02 * s], [0.06 * s, 0.1 * s], [0.001, 0.12 * s]], seg)), place([0, 0, -0.5 * s]));
    const L = (len - 0.45 * s) * (kind === 'long' ? 1.45 : 1);
    add('wood', along(lathe([[0.1 * s, 0], [0.095 * s, L * 0.5], [0.075 * s, L]], seg)), place([0, 0, 0.34 * s]));
    for (let i = 0; i < 4; i++) { const t = 0.08 + i * 0.27; add('brass', along(S.ring(lerp(0.1, 0.075, t) * s, 0.025 * s)), place([0, 0, 0.34 * s + t * L])); }
    if (kind === 'long') for (const t of [0.4, 0.7]) {
      add('brass', along(S.ring(lerp(0.1, 0.075, t) * s, 0.07 * s)), place([0, 0, 0.34 * s + t * L]));
      add('glass', along(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.03 * s, seg)), place([0, 0, 0.34 * s + t * L]));
    }
    add('brass', along(lathe([[0.07 * s, 0], [0.11 * s, 0.05 * s], [0.12 * s, 0.14 * s], [0.08 * s, 0.17 * s], [0.04 * s, 0.17 * s]], seg)), place([0, 0, 0.3 * s + L]));
    add('crystal', along(lathe([[0.055 * s, 0], [0.06 * s, 0.05 * s], [0.001, (kind === 'long' ? 0.42 : 0.26) * s]], 6)), place([0, 0, 0.45 * s + L]));
    const vc = (kind === 'long' ? 8 : 0) + (mount === 'hi' ? 16 : 0);
    glows.push({ p: V(0, 0, 0.55 * s + L).applyMatrix4(lm), size: 0.75 * s, color: 0xffa040, chan: glowChan + vc });
    glows.push({ p: V(0, 0, -0.06 * s).applyMatrix4(lm), size: 0.6 * s, color: 0xff9830, chan: glowChan + vc });
  }
}

export function guns(hull, batch, R, q, S, glows) {
  const chan = {
    port: { lids: batch.ch('lids:port'), guns: batch.ch('guns:port') },
    starboard: { lids: batch.ch('lids:starboard'), guns: batch.ch('guns:starboard') },
    bow: batch.ch('guns:bow'), stern: batch.ch('guns:stern'),
  };
  if (R.ports) for (const side of [1, -1]) for (const z of R.ports.z) {
    const t = hull.tAt(z, R.ports.y), p = hull.at(z, t, side), n = hull.normal(z, t, side);
    const up = UP.clone().sub(n.clone().multiplyScalar(n.y)).normalize(), right = new THREE.Vector3().crossVectors(up, n);
    const m = frame(V(...p), right, up, n);
    if (q.level === 'far') { batch.add('gilt', new THREE.PlaneGeometry(R.ports.w * 1.05, R.ports.h * 1.05), new THREE.Matrix4().multiplyMatrices(m, place([0, 0, 0.03]))); continue; }
    port(batch, m, R.ports.w, R.ports.h, q, S, glows, side, chan[side > 0 ? 'port' : 'starboard']);
  }
  for (const g of R.bowGuns) longGun(batch, place([g.x, g.y, g.z]), g.len, q, S, glows, { post: Math.max(0.3, g.y - hull.deckY(g.z)), chan: chan.bow, glowChan: 4 });
  for (const g of R.sternGuns ?? []) {
    const m = place([g.x, g.y, hull.zs - 0.005], { euler: [0, Math.PI, 0] });
    const w = 0.62 * g.len / 1.8 + 0.5, h = 0.75 * g.len / 1.8 + 0.4, b = Math.min(w, h) * 0.1;
    batch.add('dark', new THREE.PlaneGeometry(w, h), new THREE.Matrix4().multiplyMatrices(m, place([0, 0, 0.018])));
    for (const [x, y, bw, bh] of [[0, h / 2 + b / 2, w + 2 * b, b], [0, -h / 2 - b / 2, w + 2 * b, b], [w / 2 + b / 2, 0, b, h], [-w / 2 - b / 2, 0, b, h]])
      batch.add('gilt', box(bw, bh, 0.12), new THREE.Matrix4().multiplyMatrices(m, place([x, y, 0.045])));
    longGun(batch, new THREE.Matrix4().multiplyMatrices(m, place([0, 0, -0.3])), g.len, q, S, glows, { swivel: false, chan: chan.stern, glowChan: 5 });
  }
}
