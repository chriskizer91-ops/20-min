// rigging.js: the flagship's masts, wing sails and rigging.
//   Masts in three parts, as on a real frigate: the lower mast, a fighting top (a platform with a rail) where it
//   meets the topmast, and a pole above with the pennant; the mainmast has a crow's nest.
//   Wing sails are ribbed like a bat's wing: battens fan out from the yard's root, and the canvas bellies between
//   them, so the trailing edge is scalloped. A plum stripe runs along it. Each yard is a working part: as sail is
//   taken in, the canvas folds down onto its yard like a fan and the yards swing back along the hull, like a bird
//   folding its wings; let out, they spread wide again.
//   Racing canvas (a garage fitting) is a second set: pale silk with more battens and a fuller, rounder edge.
//   The shrouds come down to deadeyes on the channels; stays run mast to mast and out to the bowsprit.
import * as THREE from 'three';
import { clamp, lerp, place, lathe, tube, box, toRect } from '../ship/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SAIL = { a: [493, 55], b: [72, 253], c: [495, 310] }; // the canvas's corners in the sail picture (mast top, yard tip, yard root)

// Where a point on a sail lies in its own frame: p - C = α (B - C) + β (A - B); furled, it lies at C + α (B - C)
function furlTo(A, B, C) {
  const u = B.clone().sub(C), v = A.clone().sub(B), uu = u.dot(u), uv = u.dot(v), vv = v.dot(v), det = uu * vv - uv * uv;
  return (p) => { const d = p.clone().sub(C), du = d.dot(u), dv = d.dot(v); const a = clamp((du * vv - dv * uv) / det, 0, 1.05); return C.clone().addScaledVector(u, a); };
}

// One ribbed wing sail from the mast top A, out to the yard's tip B, back to its root C
function wingSail(batch, A, B, C, o) {
  const { n, uvOf, belly, battens, scallop, roach, trim, key, fit, rig, q } = o;
  const ua = uvOf(SAIL.a), ub = uvOf(SAIL.b), uc = uvOf(SAIL.c);
  const nrm = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)).normalize();
  if (nrm.z < 0) nrm.negate();
  const nb = battens - 1;
  const edge = (s) => 1 - scallop * Math.pow(Math.sin(Math.PI * ((s * nb) % 1)), 1.4) + roach * Math.sin(Math.PI * s);
  const bulge = (s) => Math.sin(Math.PI * ((s * nb) % 1));
  const point = (rho, s) => {
    const r = rho * edge(s), wa = r * s, wb = r * (1 - s), wc = 1 - r;
    const g = Math.pow(Math.max(0, 27 * Math.max(0, wa) * Math.max(0, wb) * Math.max(0, wc)), 0.8), pb = bulge(s) * Math.pow(r, 0.8);
    const off = belly * (0.7 * g + 0.4 * pb);
    const p = A.clone().multiplyScalar(wa).add(B.clone().multiplyScalar(wb)).add(C.clone().multiplyScalar(wc)).addScaledVector(nrm, off);
    return { p, uv: [ua[0] * wa + ub[0] * wb + uc[0] * wc, ua[1] * wa + ub[1] * wb + uc[1] * wc], bil: Math.min(1, g * 0.6 + pb * 0.7) };
  };
  // rows from the root out to the edge, with extra rows framing the trim stripe so it stays crisp
  const rows = [];
  for (let i = 0; i <= n; i++) rows.push(i / n);
  if (trim) rows.push(...trim.flatMap(([a, b]) => [a - 0.004, a + 0.004, b - 0.004, b + 0.004]));
  rows.sort((a, b) => a - b);
  const R = rows.filter((x, i) => i === 0 || x - rows[i - 1] > 1e-4), cols = n * 2 + nb * 2;
  const pos = [], uv = [], bil = [], col = [], idx = [];
  for (let i = 0; i < R.length; i++) for (let j = 0; j <= cols; j++) {
    const pt = point(R[i], j / cols);
    pos.push(pt.p.x, pt.p.y, pt.p.z); uv.push(...pt.uv); bil.push(pt.bil);
    const inTrim = trim && trim.some(([a, b]) => R[i] > a && R[i] < b);
    col.push(...(inTrim ? o.trimColour : [1, 1, 1]));
  }
  const W = cols + 1;
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < cols; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('billow', new THREE.Float32BufferAttribute(bil, 1));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const furl = furlTo(A, B, C);
  batch.add(key, g, null, { ...rig, furl, fit });
  if (q.level !== 'full') return;
  // battens: thin rods from the root out to the edge, on the canvas's ridges
  const radial = Math.max(3, q.tubeRad - 3);
  for (let k = 1; k < nb; k++) {
    const pts = []; for (let i = 0; i <= 6; i++) pts.push(point(0.04 + 0.96 * (i / 6), k / nb).p.addScaledVector(nrm, 0.02));
    batch.add('wood', tube(pts, 0.028, radial, 2), null, { ...rig, furl, fit });
  }
  // the bolt rope along the trailing edge
  if (q.level === 'full') {
    const pts = []; for (let j = 0; j <= cols; j += 2) pts.push(point(1, j / cols).p);
    batch.add('rope', tube(pts, 0.03, 4, 1), null, { ...rig, furl, fit });
  }
}

// The canvas furled on its yard: a roll along the yard, thickest at the root, that grows as the sail is taken in
function bundle(batch, root, tip, r, rig, fit, key, rect) {
  const d = tip.clone().sub(root), len = d.length();
  const g = lathe([[0.001, 0], [r * 0.7, 0.02 * len], [r, 0.12 * len], [r * 0.85, 0.5 * len], [r * 0.45, 0.85 * len], [0.001, 0.92 * len]], 7);
  // it wears plain canvas from the middle of the sail picture
  toRect(g, { u0: lerp(rect.u0, rect.u1, 0.55), u1: lerp(rect.u0, rect.u1, 0.75), v0: lerp(rect.v0, rect.v1, 0.45), v1: lerp(rect.v0, rect.v1, 0.6) });
  const out = batch.add(key, g, place(root.clone().add(V(0, -r * 0.6, 0)), { dir: d }), { ...rig, furl: (p) => p, fit });
  // collapse it onto its axis: the furl channel grows it back out
  const P = out.attributes.position, F = out.attributes.rigF, dir = d.clone().normalize(), base = root.clone().add(V(0, -r * 0.6, 0)), p = V(0, 0, 0);
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i);
    const a = base.clone().addScaledVector(dir, p.clone().sub(base).dot(dir));
    F.setXYZ(i, p.x - a.x, p.y - a.y, p.z - a.z); P.setXYZ(i, a.x, a.y, a.z);
  }
}

export function masts(hull, batch, R, q, S, glows, feet, colours) {
  const rect = S.rects.sail, seg = Math.max(6, q.latheSeg), rs = R.railScale;
  const sailUV = (pt) => { const [x, y] = pt; return [lerp(rect.u0, rect.u1, x / rect.w), 1 - lerp(rect.v0, rect.v1, y / rect.h)]; };
  const ropes = [], rr = 0.02 + R.length * 0.0004;
  const ropeTo = (a, b, rig) => ropes.push({ a, b, rig });
  R.masts.forEach((M, mi) => {
    const y0 = hull.deckY(M.z), H = M.height, r0 = 0.1 + 0.0045 * R.length + 0.03, top = M.tiers[1].at * H - 0.28;
    const mx = (y) => (y - y0 < top ? lerp(r0, r0 * 0.78, (y - y0) / top) : lerp(r0 * 0.62, r0 * 0.4, (y - y0 - top) / (H - top)));
    const truck = H + (M.nest ? 1.6 : 0.4);
    // the lower mast, the topmast and the pole
    batch.add('wood', lathe([[r0, 0], [r0 * 0.9, top * 0.5], [r0 * 0.78, top + 0.5]], seg), place([0, y0, M.z]));
    batch.add('wood', lathe([[r0 * 0.62, 0], [r0 * 0.5, (H - top) * 0.6], [r0 * 0.4, H - top + 0.3], [r0 * 0.25, truck - top]], seg), place([0, y0 + top - 0.6, M.z + r0 * 0.05]));
    batch.add('brass', lathe([[r0 * 1.9, 0], [r0 * 1.9, 0.08], [r0 * 1.45, 0.16], [r0 * 1.15, 0.3], [r0 * 1.1, 0.42]], seg), place([0, y0, M.z]));
    const bands = q.level === 'far' ? 0 : q.level === 'full' ? Math.max(3, Math.round(H / 1.0)) : 3;
    for (let i = 1; i < bands; i++) { const y = y0 + (i / bands) * H; if (Math.abs(y - y0 - top) > 0.4) batch.add('brass', S.ring(mx(y), 0.035 + R.length * 0.0008), place([0, y, M.z])); }
    batch.add('brass', lathe([[r0 * 0.4, 0], [r0 * 0.5, 0.1], [r0 * 0.3, 0.22], [r0 * 0.4, 0.36], [r0 * 0.2, 0.5], [0.001, 0.82]], seg), place([0, y0 + truck, M.z]));
    pennant(batch, V(0, y0 + truck - 0.05, M.z), H * 0.45, H * 0.05, q.level === 'full' ? 22 : q.level === 'middle' ? 6 : 2, colours.pennant);
    // the fighting top: a round platform on trestle-trees, with a rail; the mast cap above it
    const yT = y0 + top, tr = r0 * 5.2;
    if (q.level !== 'far') {
      batch.add('deck', lathe([[0.001, -0.06], [tr, -0.06], [tr, 0.06], [0.001, 0.06]], Math.max(10, seg)), place([0, yT, M.z], { scale: [1, 1, 0.82] }));
      batch.add('brass', S.ring(tr, 0.05), place([0, yT, M.z], { scale: [1, 1, 0.82] }));
      for (const x of [-1, 1]) batch.add('wood', box(0.14, 0.18, tr * 1.7), place([x * r0 * 1.2, yT - 0.15, M.z]));
      for (const z of [-1, 1]) batch.add('wood', box(tr * 1.9, 0.12, 0.12), place([0, yT - 0.12, M.z + z * tr * 0.45]));
      batch.add('brass', box(r0 * 3.2, 0.32, r0 * 2.2), place([0, yT + 0.62, M.z]));
      if (q.level === 'full') {
        const ring = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; ring.push(V(Math.sin(a) * tr * 0.96, yT + 0.55, M.z + Math.cos(a) * tr * 0.96 * 0.82)); }
        batch.add('brass', tube(ring, 0.03, 4, 1, true), null);
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; batch.add('bronze', new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), place([Math.sin(a) * tr * 0.96, yT + 0.3, M.z + Math.cos(a) * tr * 0.96 * 0.82])); }
      }
      // futtock shrouds: from the top's rim down to the lower mast
      for (const s of [1, -1]) for (const dz of [-0.4, 0.4]) ropeTo(V(s * tr * 0.92, yT, M.z + dz), V(s * r0 * 0.9, yT - 1.4, M.z + dz * 0.5));
    }
    // the crow's nest: a hooped basket high on the mainmast
    if (M.nest && q.level !== 'far') {
      const yn = y0 + H * 0.985, nr = r0 * 3.4;
      batch.add('wood', lathe([[nr * 0.86, 0], [nr, 0.12], [nr * 1.04, 0.45], [nr, 0.75], [nr * 0.94, 0.8]], Math.max(10, seg)), place([0, yn, M.z]));
      batch.add('deck', new THREE.CircleGeometry(nr * 0.86, Math.max(10, seg)).rotateX(-Math.PI / 2), place([0, yn + 0.02, M.z]));
      for (const y of [0.1, 0.72]) batch.add('brass', S.ring(lerp(nr * 0.98, nr, y), 0.035), place([0, yn + y, M.z]));
      glows.push({ p: V(0, yn + 1.0, M.z), size: 1.6, color: 0xffb860, chan: 0, flicker: true });
    }
    // the yards and their wing sails, each pair a working part
    M.tiers.forEach((Ti, ti) => {
      const yr = y0 + Ti.at * H;
      if (q.level !== 'far') batch.add('brass', lathe([[mx(yr) * 1.25, -0.12], [mx(yr) * 1.4, -0.06], [mx(yr) * 1.4, 0.06], [mx(yr) * 1.25, 0.12]], seg), place([0, yr, M.z]));
      for (const side of [1, -1]) {
        const rig = { ch: batch.ch(`yard:${mi}:${ti}:${side > 0 ? 'port' : 'starboard'}`), pivot: V(0, yr, M.z), axis: V(0, side, 0) };
        const root = V(side * mx(yr), yr, M.z), tip = V(side * Ti.span, yr + Ti.rise, M.z - Ti.sweep);
        const yd = tip.clone().sub(root), len = yd.length();
        batch.add('wood', lathe([[0.085 * rs, 0], [0.06 * rs, len * 0.6], [0.048 * rs, len]], Math.max(5, seg >> 1)), place(root, { dir: yd }), rig);
        if (q.level !== 'far') {
          batch.add('brass', lathe([[0.065, 0], [0.08, 0.05], [0.065, 0.12], [0.04, 0.16], [0.001, 0.42]].map(([a, b]) => [a * rs, b * rs]), Math.max(5, seg >> 1)), place(tip, { dir: yd }), rig);
          batch.add('brass', S.ring(0.07 * rs, 0.03), place(root.clone().lerp(tip, 0.5), { dir: yd }), rig);
          // a sunstone at the yard's tip, glowing with the sails' share of the crystal power
          batch.add('crystal', lathe([[0.001, -0.12], [0.07, 0], [0.001, 0.2]], 5), place(tip.clone().addScaledVector(yd.clone().normalize(), 0.5), { dir: yd }), rig);
        }
        glows.push({ p: tip.clone().addScaledVector(yd.clone().normalize(), 0.55), size: 0.9, color: 0xffb04a, chan: 7, rig });
        if (q.level === 'full') batch.add('dark', box(0.12, 0.2, 0.1), place(tip.clone().add(V(0, -0.14, 0))), rig); // a block for the sheet
        const yA = ti === M.tiers.length - 1 ? y0 + H * 0.95 : yT - 0.12;
        const A = V(side * mx(yA), yA, M.z), Bp = root.clone().lerp(tip, 0.96), Cp = root.clone().lerp(tip, 0.035).add(V(0, 0.05, 0));
        const common = { uvOf: sailUV, q, rig, trimColour: colours.trim };
        wingSail(batch, A, Bp, Cp, { ...common, n: q.sailDiv, belly: 0.1 * len, battens: 5, scallop: 0.07, roach: 0, trim: [[0.86, 0.92]], key: 'canvas', fit: 'canvas' });
        if (q.level === 'full') wingSail(batch, A, Bp, Cp, { ...common, n: q.sailDiv, belly: 0.08 * len, battens: 7, scallop: 0.025, roach: 0.1, trim: [[0.8, 0.83], [0.87, 0.9]], key: 'silk', fit: 'racing', trimColour: [0.92, 0.7, 0.28] });
        if (q.level !== 'far') bundle(batch, Cp.clone().add(V(0, -0.02, 0)), Bp, 0.17 * rs + 0.04, rig, null, 'canvas', rect);
        ropeTo(A.clone(), tip.clone().add(V(0, 0.05, 0)), rig);
        // the sheet, from the yard's tip down to the rail: it bends as the yard swings
        const zr = clamp(tip.z - 0.6, hull.zs + 0.3, hull.zb - 0.3), end = V(side * (hull.deckHalf(zr) - 0.05), hull.deckY(zr) + R.rail.h, zr);
        const L = tip.distanceTo(end);
        ropeTo(tip.clone(), end, { ...rig, weight: (p) => p.distanceTo(end) / L });
      }
    });
    // shrouds from the top down to the deadeyes on the channels, with ratlines; topmast shrouds to the top's rim
    const head = yT - 0.3;
    for (const side of [1, -1]) {
      const f = feet?.[mi]?.[side] ?? [];
      const hd = V(side * mx(head), head, M.z);
      for (const p of f) ropeTo(hd, p);
      if (q.ratlines && f.length > 1) {
        const rungs = Math.floor((head - f[0].y) / 0.42);
        for (let i = 1; i < rungs; i++) { const t = i / rungs; batch.add('rope', tube(f.map((p) => p.clone().lerp(hd, t)), 0.013 + R.length * 0.0003, 3, 2, false, 0), null); }
      }
      const th = V(side * mx(y0 + H * 0.93), y0 + H * 0.93, M.z), rim = [-0.5, 0, 0.5].map((dz) => V(side * tr * 0.9, yT + 0.08, M.z + dz));
      for (const p of rim) ropeTo(th, p);
      if (q.ratlines) {
        const rungs = Math.floor((th.y - yT) / 0.45);
        for (let i = 1; i < rungs; i++) { const t = i / rungs; batch.add('rope', tube(rim.map((p) => p.clone().lerp(th, t)), 0.012, 3, 2, false, 0), null); }
      }
      // a backstay from the masthead to the channel's aft end
      if (f.length) ropeTo(V(side * mx(y0 + H * 0.9), y0 + H * 0.9, M.z), f[0].clone().add(V(0, 0, -0.6)));
    }
  });
  // stays: the foremast out to the bowsprit, and mast to mast; the mizzen back to the taffrail
  const sorted = [...R.masts].sort((a, b) => b.z - a.z);
  const topOf = (M, k = 0.94) => V(0, hull.deckY(M.z) + M.height * k, M.z);
  const B = R.bowsprit;
  if (B) {
    const a = V(...B.from), b = V(...B.to);
    ropeTo(topOf(sorted[0]), b.clone()); ropeTo(topOf(sorted[0], 0.62), a.clone().lerp(b, 0.62));
  }
  for (let i = 0; i < sorted.length - 1; i++) { ropeTo(topOf(sorted[i + 1]), topOf(sorted[i], 0.6)); ropeTo(topOf(sorted[i + 1], 0.55), V(0, hull.deckY(sorted[i].z) + 0.8, sorted[i].z)); }
  const last = sorted[sorted.length - 1];
  for (const side of [1, -1]) ropeTo(topOf(last), V(side * (hull.deckHalf(hull.zs + 0.5) - 0.1), hull.deckY(hull.zs + 0.5) + 0.1, hull.zs + 0.5));
  if (!q.ropeRad) return;
  for (const { a, b, rig } of ropes) {
    const mid = a.clone().lerp(b, 0.5).add(V(0, -a.distanceTo(b) * 0.012, 0));
    batch.add('rope', tube([a, mid, b], rr, q.ropeRad, Math.max(1, q.tubePer >> 1), false, 0.5), null, rig ?? {});
  }
}

// A pennant: a long tapering streamer from the mast top, flying aft: the hoist in one colour, the fly in another
function pennant(batch, top, len, wid, n, [hoist, fly]) {
  const pos = [], col = [], bil = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, w = wid * (1 - t * 0.92);
    for (const s of [0.5, -0.5]) { pos.push(top.x, top.y - wid * 0.5 + s * w, top.z - t * len); col.push(...(t < 0.12 ? hoist : fly)); bil.push(t); }
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('billow', new THREE.Float32BufferAttribute(bil, 1));
  g.setIndex(idx); g.computeVertexNormals();
  batch.add('flag', g);
}

// The bowsprit and jib-boom out over the ram, with a dolphin striker below and its stays
export function bowsprit(hull, batch, R, q, S, glows) {
  const B = R.bowsprit, a = V(...B.from), b = V(...B.to), d = b.clone().sub(a), seg = Math.max(6, q.latheSeg);
  batch.add('wood', lathe([[B.r, 0], [B.r * 0.85, d.length() * 0.6], [B.r * 0.55, d.length()]], Math.max(6, seg >> 1)), place(a, { dir: d }));
  for (const t of [0.12, 0.35, 0.58, 0.8]) batch.add('brass', S.ring(lerp(B.r, B.r * 0.55, t) * 1.02, 0.035), place(a.clone().lerp(b, t), { dir: d }));
  batch.add('brass', lathe([[B.r * 0.6, 0], [B.r * 0.8, 0.08], [B.r * 0.5, 0.2], [0.001, 0.7]], Math.max(6, seg >> 1)), place(b, { dir: d }));
  glows.push({ p: b.clone().add(d.clone().normalize().multiplyScalar(0.4)), size: 0.7, color: 0xffc070, chan: 0 });
  if (q.level === 'far') return;
  const sp = a.clone().lerp(b, 0.55), down = sp.clone().add(V(0, -1.7, 0.2));
  batch.add('wood', lathe([[0.07, 0], [0.05, 1.7]], 6), place(sp, { dir: down.clone().sub(sp) }));
  const rr = 0.02 + R.length * 0.0004;
  for (const [p0, p1] of [[b, down], [down, V(0, hull.deckY(hull.zb) - 0.6, hull.zb - 0.2)]]) batch.add('rope', tube([p0, p0.clone().lerp(p1, 0.5).add(V(0, -0.05, 0)), p1], rr, Math.max(3, q.ropeRad), 2, false, 0.5), null);
  for (const s of [1, -1]) batch.add('rope', tube([a.clone().lerp(b, 0.45), V(s * hull.deckHalf(hull.zb - 1.5) * 0.9, hull.deckY(hull.zb - 1.5) + 0.2, hull.zb - 1.5)], rr, Math.max(3, q.ropeRad), 2, false, 0.5), null);
  // a net under the bowsprit, between it and the head rails
  if (q.level === 'full') for (let i = 0; i <= 6; i++) {
    const t = 0.05 + (i / 6) * 0.42, p = a.clone().lerp(b, t);
    for (const s of [1, -1]) batch.add('rope', tube([p, V(s * (0.5 + t * 0.6), p.y - 0.4 - t * 0.5, p.z - 0.4)], 0.012, 3, 1), null);
  }
}
