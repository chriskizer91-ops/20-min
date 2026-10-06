// hull.js: each levelled-up ship's hull. Shaped the same way as every ship (ship/hull.js): a top outline for the width, a
// side outline for the deck edge and the keel. Two changes make it read as a frigate:
//   the sides lean in above the gun deck (tumblehome), so the hull is widest at the gun ports, not at the rail
//   the deck edge steps up cleanly at a forecastle and a quarterdeck, with stations either side of each step
// Then what dresses it: the gun strake's gold pinstripes, the channels the shrouds are made fast to, the stern
// gallery and the quarter galleries, the bulkheads under the raised decks, the keel with its glowing lift vents,
// and (a garage fitting) armour plate. A hull can wear iron plates instead of planks (the Man-o'-war: skin 'plates'),
// and a ship with two gun decks has two strakes.
import * as THREE from 'three';
import { curve, clamp, lerp, sheet, polygon, place, box, lathe, tube, toRect } from '../ship/kit.js';
import { hullBand, hullStrap, rivetRow, hullDecal } from '../ship/hull.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// The ship's gun strakes as a list of [top, bottom]: one, or one for each gun deck
export const strakesOf = (R) => (!R.strake ? [] : Array.isArray(R.strake[0]) ? R.strake : [R.strake]);

export function makeHull(R) {
  const H = R.hull;
  const half = curve(H.half), rim = curve(H.rim), keel = curve(H.keel);
  const p = H.fullness ?? 0.75, wale0 = H.wale ?? 0, lean = H.tumblehome ?? 0.05;
  const zs = H.stern, zb = H.bow;
  // the wale (where the wall meets the round bowl) never drops below a third of the way down to the keel
  const wale = (z) => Math.min(rim(z), Math.max(wale0, keel(z) + (rim(z) - keel(z)) * 0.62));
  const wallH = (z) => Math.max(0, rim(z) - wale(z));
  const bowlD = (z) => Math.max(0.02, wale(z) - keel(z));
  const fw = (z) => { const w = wallH(z); return w / (w + bowlD(z) * 1.3); };
  function at(z, t, side = 1) {
    const f = fw(z);
    if (t < f) { const k = t / f; return [side * half(z) * (1 - lean * (1 - k) * Math.min(1, wallH(z) / 1.5)), rim(z) - k * wallH(z), z]; }
    const a = ((t - f) / (1 - f)) * Math.PI / 2;
    return [side * half(z) * Math.cos(a), wale(z) - bowlD(z) * Math.pow(Math.sin(a), p), z];
  }
  function tAt(z, y) {
    const f = fw(z);
    if (y >= wale(z) && wallH(z) > 1e-3) return clamp((rim(z) - y) / wallH(z), 0, 1) * f;
    const s = clamp((wale(z) - y) / bowlD(z), 0, 1);
    return f + (1 - f) * (Math.asin(Math.pow(s, 1 / p)) / (Math.PI / 2));
  }
  function normal(z, t, side = 1) {
    const e = 0.004, a = at(z, Math.max(0, t - e), side), b = at(z, Math.min(1, t + e), side);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return new THREE.Vector3(-dy * side, dx * side, 0).normalize();
  }
  function arc(z, t, steps = 12) {
    let s = 0, prev = at(z, 1);
    for (let i = 1; i <= steps; i++) { const q = at(z, 1 - (1 - t) * (i / steps)); s += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    return s;
  }
  const station = (u) => lerp(zs, zb, 0.5 - 0.5 * Math.cos(Math.PI * u));
  const deckY = (z) => rim(z) - 0.035;
  const deckHalf = (z) => Math.abs(at(z, 0, 1)[0]);
  // the hull's side at height y (for fittings on the wall): the point and its outward normal
  const side = (z, y, s) => { const t = tAt(z, y); return { p: V(...at(z, t, s)), n: normal(z, t, s), t }; };
  return { R, half, rim, keel, wale, wallH, bowlD, at, tAt, normal, arc, station, zs, zb, deckY, deckHalf, side };
}

// Stations along the hull: closer near the ends, and a pair hugging each step of the deck edge so it stays sharp
function stations(hull, n, steps) {
  const list = [];
  for (let i = 0; i <= n; i++) list.push(hull.station(i / n));
  for (const z of steps) for (const d of [-0.06, -0.012, 0.012, 0.06]) list.push(z + d);
  list.sort((a, b) => a - b);
  return list.filter((z, i) => i === 0 || z - list[i - 1] > 0.008);
}

const ringT = (j) => Math.pow(j, 1.15);
export function buildHull(hull, batch, q) {
  const { R, at, arc, zs, zb } = hull, T = R.tiles, skin = R.skin ?? 'hull', tile = skin === 'plates' ? T.plates : T.planks;
  const Z = stations(hull, q.stations, R.steps ?? []), I = Z.length - 1, J = q.rings;
  const zi = (u) => Z[Math.round(u * I)];
  for (const s of [1, -1]) {
    batch.add(skin, sheet(I, J, (i, j) => at(zi(i), ringT(j), s), (i, j) => { const z = zi(i); return [z / tile[0], arc(z, ringT(j)) / tile[1]]; }, s < 0));
  }
  // the stern's flat transom and a cap where the hull meets the ram
  for (const [z, face] of [[zs, -1], [zb, 1]]) {
    const K = Math.max(4, Math.round(J * 0.8)), pts = [];
    for (let k = 0; k <= K; k++) { const p = at(z, ringT(k / K), 1); pts.push([p[0], p[1]]); }
    for (let k = K - 1; k >= 0; k--) { const p = at(z, ringT(k / K), -1); pts.push([p[0], p[1]]); }
    if (Math.abs(pts[0][0]) < 0.03) continue;
    const g = polygon(pts, (x, y) => [x / tile[0], y / tile[1]]);
    if (face < 0) g.rotateY(Math.PI);
    g.translate(0, 0, z + face * 0.002);
    batch.add(skin, g);
  }
  // the deck: boards fore and aft, stepping up to the raised decks
  const A = q.deckAcross * 2;
  batch.add('deck', sheet(I, A, (i, j) => { const z = zi(i); return [(j * 2 - 1) * hull.deckHalf(z) * 0.985, hull.deckY(z), z]; },
    (i, j, pp) => [pp[2] / T.deck[0], pp[0] / T.deck[1]], false));
}

// ---------- brass: bands, straps, rivets, the keel shoe; and the gun strake's gold pinstripes ----------
export function brass(hull, batch, R, q, S) {
  const B = R.bands, T = R.tiles, { zs, zb, keel, rim } = hull, k = R.kit;
  const span = (y) => { let a = zb, b = zs; for (let z = zs; z <= zb; z += 0.05) if (keel(z) < y - 0.08 && rim(z) > y + 0.05) { a = Math.min(a, z); b = Math.max(b, z); } return [a + 0.03, b - 0.03]; };
  const I = Math.max(8, Math.round(q.stations * 0.8));
  for (const s of [1, -1]) {
    const [y0, y1] = B.sheer, [a, b] = span(y1);
    hullBand(hull, batch, { z0: a, z1: b, top: () => y0, bottom: () => y1, side: s, tile: T.band, I, J: q.level === 'far' ? 1 : 2, edges: q.level !== 'far' });
    if (q.level === 'far') continue;
    if (q.rivets) for (const yy of [y0 - 0.06 * k, y1 + 0.06 * k]) rivetRow(hull, batch, { z0: a, z1: b, y: () => yy, side: s, step: 0.36 * k * q.rivetStep, rivet: S.rivet, r: 0.03 * k });
    // a band round the raised decks, just under their rail
    for (const [z0, z1] of R.raised ?? []) hullBand(hull, batch, { z0, z1, top: (z) => rim(z) - 0.04 * k, bottom: (z) => rim(z) - 0.32 * k, side: s, tile: T.band, I: Math.max(6, Math.round(I * 0.25)) });
    for (const [z, w] of B.straps) hullStrap(hull, batch, { z, width: w, side: s, J: Math.max(6, Math.round(q.rings * 0.9)) });
    // lower bands: one, or a list of them (a ship with two gun decks has one between them)
    for (const [l0, l1] of B.lower ? (Array.isArray(B.lower[0]) ? B.lower : [B.lower]) : []) { const [c, d] = span(l1); hullBand(hull, batch, { z0: c, z1: d, top: () => l0, bottom: () => l1, side: s, tile: T.band, I }); }
    // each strake's gold pinstripes, top and bottom
    for (const [p0, p1] of strakesOf(R)) {
      const [e, f] = span(p1), w = 0.035 * Math.max(0.6, k);
      for (const y of [p0, p1]) hullBand(hull, batch, { z0: e, z1: f, top: () => y + w, bottom: () => y - w, side: s, tile: [1, 1], I, J: 1, key: 'gilt', off: 0.022 * k, edges: false });
    }
    // the keel shoe
    hullBand(hull, batch, { z0: zs + 0.02, z1: zb - 0.02, top: (z) => keel(z) + 0.36 * Math.max(0.5, k), bottom: (z) => keel(z), side: s, tile: T.band, I, J: 1 });
  }
}

// ---------- the channels: ledges on the hull's side at each mast, where the shrouds are made fast ----------
// Returns, for each mast and side, where its shrouds end (the deadeyes), for the rigging
export function channels(hull, batch, R, q, S) {
  const out = [], k = R.kit;
  for (const [mi, M] of R.masts.entries()) {
    if (!M.channel) { out[mi] = null; continue; }
    const L = M.channel, y = hull.deckY(M.z) - 0.42 * k, n = M.deadeyes ?? 4, feet = { 1: [], [-1]: [] };
    for (const s of [1, -1]) {
      const z0 = M.z - L * 0.62, z1 = M.z + L * 0.38;
      const at = (z) => hull.side(z, y, s), out0 = 0.62 * k;
      // the ledge: a plank standing out from the side
      const pts = [];
      for (let i = 0; i <= 6; i++) { const z = lerp(z0, z1, i / 6), a = at(z); pts.push({ in: a.p.clone(), out: a.p.clone().addScaledVector(a.n.clone().setY(0).normalize(), out0) }); }
      if (q.level === 'far') { feet[s].push(...[0.2, 0.5, 0.8].map((t) => pts[Math.round(t * 6)].out.clone().add(V(0, 0.3 * k, 0)))); continue; }
      const top = sheet(6, 1, (i, j) => { const P = pts[Math.round(i * 6)]; return (j ? P.out : P.in).toArray().map((v, c) => v + (c === 1 ? 0.06 * k : 0)); }, (i, j, pp) => [pp[2] / 2.6, j * 0.25], s < 0);
      batch.add('wood', top);
      const edge = sheet(6, 1, (i, j) => { const P = pts[Math.round(i * 6)].out; return [P.x, P.y + (0.06 - j * 0.14) * k, P.z]; }, (i, j, pp) => [pp[2] / 2.6, j * 0.1], s > 0);
      batch.add('wood', edge);
      batch.add('brass', tube(pts.map((P) => P.out.clone().add(V(0, 0.07 * k, 0))), 0.03 * k, Math.max(3, q.tubeRad - 2), 2), null);
      // deadeyes along the edge, with chain plates down the side to the sheer band
      for (let i = 0; i < n; i++) {
        const z = lerp(z0 + 0.25 * k, z1 - 0.25 * k, i / (n - 1)), a = at(z), o = a.p.clone().addScaledVector(a.n.clone().setY(0).normalize(), out0 - 0.04 * k);
        if (q.level === 'full') {
          batch.add('wood', lathe([[0.001, -0.06], [0.11, -0.05], [0.13, 0], [0.11, 0.05], [0.001, 0.06]].map(([r, y]) => [r * k, y * k]), Math.max(6, q.latheSeg >> 1)).rotateX(Math.PI / 2), place(o.clone().add(V(0, 0.22 * k, 0)), { euler: [0, Math.PI / 2, 0] }));
          const lo = hull.side(z, R.bands.sheer[1] + 0.05, s);
          batch.add('brass', tube([o.clone().add(V(0, 0.12 * k, 0)), o.clone().add(V(0, -0.05 * k, 0)), lo.p.clone().addScaledVector(lo.n, 0.05 * k)], 0.022 * k, 4, 3, false, 0), null);
        }
        feet[s].push(o.clone().add(V(0, 0.3 * k, 0)));
      }
    }
    out[mi] = feet;
  }
  return out;
}

// ---------- the stern: the transom's windows, the stern gallery (a balcony round it), the quarter galleries ----------
export function stern(hull, batch, R, q, S, glows) {
  if (!R.gallery) return;
  const G = R.gallery, zs = hull.zs, seg = Math.max(6, q.latheSeg);
  const hw = hull.half(zs) * 0.98, d = G.depth, y0 = G.floor, y1 = G.roof;
  const win = S.rects.windows3;
  // the gallery's floor and roof: flat slabs round the transom, rounded at the corners
  const outline = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; outline.push([Math.cos(a) * hw, -Math.sin(a) * d]); }
  const slab = (y, th, key) => {
    const g = polygon(outline.map(([x, z]) => [x, z]), (x, z) => [x / 2, z / 2]);
    g.rotateX(Math.PI / 2); g.translate(0, y, zs);
    batch.add(key, g);
    const g2 = g.clone(); g2.translate(0, -th, 0); batch.add(key, g2);
    const rim = outline.map(([x, z]) => V(x, y - th / 2, zs + z));
    batch.add(key === 'deck' ? 'gilt' : 'wood', tube(rim, th / 2, 4, 2), null);
  };
  slab(y0, 0.16, 'deck');
  slab(y1, 0.14, 'wood');
  if (q.level === 'far') return;
  // the transom: a row of tall windows lit from within, framed in gilt
  const n = G.windows, ww = (hw * 2 - 0.6) / n;
  for (let i = 0; i < n; i++) {
    const x = -hw + 0.3 + ww * (i + 0.5);
    const g = toRect(new THREE.PlaneGeometry(ww * 0.86, y1 - y0 - 0.32), win);
    batch.add('parts', g, place([x, (y0 + y1) / 2, zs - 0.016], { euler: [0, Math.PI, 0] }));
    batch.add('gilt', box(0.07, y1 - y0 - 0.18, 0.06), place([x + ww / 2, (y0 + y1) / 2, zs - 0.03]));
    glows.push({ p: V(x, (y0 + y1) / 2, zs - 0.4), size: 1.4, color: 0xffb46a, chan: 8 });
  }
  batch.add('gilt', box(hw * 2 - 0.4, 0.09, 0.07), place([0, y1 - 0.12, zs - 0.03]));
  batch.add('gilt', box(hw * 2 - 0.4, 0.09, 0.07), place([0, y0 + 0.14, zs - 0.03]));
  // the balcony's rail: turned balusters round the floor's edge
  const rh = 0.72, rail = outline.map(([x, z]) => V(x * 0.97, y0, zs + z * 0.97));
  batch.add('gilt', tube(rail.map((p) => p.clone().add(V(0, rh, 0))), 0.045, Math.max(4, q.tubeRad), 2), null);
  batch.add('gilt', tube(rail.map((p) => p.clone().add(V(0, 0.06, 0))), 0.05, Math.max(4, q.tubeRad), 2), null);
  const nb = q.level === 'full' ? 34 : 10;
  for (let i = 0; i <= nb; i++) {
    const a = (i / nb) * Math.PI, p = V(Math.cos(a) * hw * 0.97, y0 + 0.06, zs - Math.sin(a) * d * 0.97);
    if (q.level === 'full') batch.add('wood', S.baluster, place(p, { scale: [1.2, rh - 0.06, 1.2] }));
    else batch.add('wood', box(0.06, rh - 0.06, 0.06), place(p.clone().add(V(0, (rh - 0.06) / 2, 0))));
  }
  // posts holding the roof up at the corners, and carved brackets under the floor
  for (const a of [0.12, 0.5, 0.88]) {
    const p = V(Math.cos(a * Math.PI) * hw * 0.95, 0, zs - Math.sin(a * Math.PI) * d * 0.95);
    batch.add('gilt', lathe([[0.07, 0], [0.09, 0.08], [0.05, 0.2], [0.06, (y1 - y0) * 0.5], [0.05, y1 - y0 - 0.2], [0.09, y1 - y0 - 0.06], [0.08, y1 - y0]], seg), place([p.x, y0, p.z]));
  }
  for (const x of [-0.75, -0.25, 0.25, 0.75]) {
    const pts = [[0, 0], [-d * 0.95, 0], [-d * 0.6, -0.25], [-0.2, -0.75], [0, -0.85]];
    const g = polygon(pts, (u, v) => [u, v]);
    g.rotateY(-Math.PI / 2); g.translate(x * hw, y0 - 0.16, zs);
    batch.add('gilt', g);
  }
  // the stern's crown: a gilt arch over the taffrail with the Captain's star
  const yT = hull.rim(zs);
  const arch = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; arch.push(V(Math.cos(a) * hw * 0.62, yT + 0.1 + Math.sin(a) * 0.55, zs - 0.06)); }
  batch.add('gilt', tube(arch, 0.07, Math.max(4, q.tubeRad), 2), null);
  const star = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 0.16 : 0.42; star.push([Math.sin(a) * r, Math.cos(a) * r]); }
  const sg = polygon(star, (x, y) => [x, y]); sg.rotateY(Math.PI); sg.translate(0, yT + 0.32, zs - 0.08);
  batch.add('gilt', sg);
}

// The quarter galleries: a bay of windows bulging from each side near the stern, with a little roof and a finial
export function quarterGalleries(hull, batch, R, q, S, glows) {
  if (q.level === 'far' || !R.quarterGalleries) return;
  const Qg = R.quarterGalleries, seg = Math.max(6, q.latheSeg), win = S.rects.windows3;
  for (const s of [1, -1]) {
    const zm = (Qg.z0 + Qg.z1) / 2, L = Qg.z1 - Qg.z0, ym = (Qg.y0 + Qg.y1) / 2, H = Qg.y1 - Qg.y0;
    const base = hull.side(zm, ym, s), nx = base.n.clone().setY(0).normalize();
    // the bay: three faces, the middle one parallel to the hull
    const o = Qg.out, f = [[-L / 2, 0], [-L / 2 + 0.55, o], [L / 2 - 0.55, o], [L / 2, 0]];
    const toW = (zz, oo, y) => { const a = hull.side(zm + zz, y, s); return a.p.clone().addScaledVector(nx, oo); };
    for (let i = 0; i < 3; i++) {
      const [za, oa] = f[i], [zb2, ob] = f[i + 1];
      batch.add('wood', sheet(1, 1, (u, v) => toW(lerp(za, zb2, u), lerp(oa, ob, u), lerp(Qg.y0, Qg.y1, v)).toArray(), (u, v) => [u, v], s < 0));
      // windows on each face
      const cz = (za + zb2) / 2, co = (oa + ob) / 2, c = toW(cz, co + 0.02, ym);
      const ang = Math.atan2((ob - oa) * s, zb2 - za);
      const w = Math.hypot(zb2 - za, ob - oa) * 0.8;
      batch.add('parts', toRect(new THREE.PlaneGeometry(w, H * 0.55), win), place(c, { euler: [0, s * Math.PI / 2 - ang, 0] }));
      glows.push({ p: c.clone().addScaledVector(nx, 0.3), size: 1.1, color: 0xffb46a, chan: 8 });
    }
    // floor and roof plates, edged in gilt
    for (const y of [Qg.y0, Qg.y1]) {
      batch.add('gilt', tube(f.map(([zz, oo]) => toW(zz, oo + 0.05, y)), 0.06, 4, 2, false, 0), null);
      batch.add('wood', sheet(3, 1, (u, v) => { const k = Math.min(2, Math.floor(u * 3)), t = u * 3 - k, a = f[k], b = f[k + 1]; return toW(lerp(a[0], b[0], t), lerp(a[1], b[1], t) * v, y).toArray(); }, (u, v) => [u, v], (y === Qg.y0) !== (s < 0)));
    }
    const top = toW(0, o * 0.55, Qg.y1);
    batch.add('gilt', lathe([[L * 0.36, 0], [L * 0.33, 0.18], [L * 0.22, 0.42], [0.1, 0.62], [0.05, 0.75], [0.09, 0.82], [0.001, 1.0]], seg), place(top, { scale: [1, 1, 0.55] }));
    const bot = toW(0, o * 0.55, Qg.y0);
    batch.add('gilt', lathe([[0.001, -0.9], [0.08, -0.72], [0.05, -0.6], [L * 0.2, -0.32], [L * 0.32, -0.08], [L * 0.34, 0]], seg), place(bot, { scale: [1, 1, 0.55] }));
  }
}

// ---------- the stern castle's windows: a row along each side and a row across the transom, lit from within ----------
// (a castle two storeys high has rows of them: `side` and `transom` can be lists, and `reps` panels side by side)
export function windows(hull, batch, R, q, S, glows) {
  const W = R.windows, k = R.kit;
  if (!W || q.level === 'far') return;
  for (const Ws of W.side ? [].concat(W.side) : []) for (const s of [1, -1]) for (let r = 0, n = Ws.reps ?? 1; r < n; r++) {
    const z0 = lerp(Ws.z0, Ws.z1, r / n), z1 = lerp(Ws.z0, Ws.z1, (r + 1) / n), gap = n > 1 ? 0.12 * k : 0;
    hullDecal(hull, batch, { ...Ws, z0: z0 + gap, z1: z1 - gap, side: s, rect: S.rects.windows3, I: Math.max(2, Math.round(q.rings / 3)), J: 2, off: 0.012 * k });
    const a = hull.side((z0 + z1) / 2, (Ws.y0 + Ws.y1) / 2, s);
    glows.push({ p: a.p.clone().addScaledVector(a.n, 0.45 * k), size: (Ws.glow ?? 1.3) * k, color: 0xffb46a, chan: 8 });
    // gilt sills and lintels on a castle's rows
    if (Ws.frame && q.level === 'full') for (const y of [Ws.y0 - 0.09 * k, Ws.y1 + 0.09 * k]) hullBand(hull, batch, { z0: z0 + gap, z1: z1 - gap, top: () => y + 0.07 * k, bottom: () => y - 0.07 * k, side: s, tile: [1, 1], I: 3, J: 1, key: 'gilt', off: 0.04 * k, edges: false });
  }
  for (const T of W.transom ? [].concat(W.transom) : []) {
    const h = T.y1 - T.y0, n = T.twin ? 2 : T.reps ?? 1, zs = hull.zs;
    for (let i = 0; i < n; i++) {
      const w = T.twin ? T.w * 0.5 : T.w / n - (n > 1 ? 0.2 * k : 0), cx = T.twin ? (i ? 0.52 : -0.52) * T.w : (i - (n - 1) / 2) * (T.w / n);
      batch.add('parts', toRect(new THREE.PlaneGeometry(w, h), S.rects.windows3), place([cx, (T.y0 + T.y1) / 2, zs - 0.012], { euler: [0, Math.PI, 0] }));
      for (const [bx, by, bw, bh] of [[0, h / 2 + 0.05 * k, w + 0.2 * k, 0.1 * k], [0, -h / 2 - 0.05 * k, w + 0.2 * k, 0.1 * k], [w / 2 + 0.05 * k, 0, 0.1 * k, h], [-w / 2 - 0.05 * k, 0, 0.1 * k, h]])
        batch.add('gilt', box(bw, bh, 0.06 * k), place([cx + bx, (T.y0 + T.y1) / 2 + by, zs - 0.03 * k]));
      glows.push({ p: V(cx, (T.y0 + T.y1) / 2, zs - 0.5 * k), size: 1.5 * k, color: 0xffb46a, chan: 8 });
    }
  }
}

// ---------- the keel's lift vents: glowing slots either side of the keel, as bright as the lift's share of power ----------
export function vents(hull, batch, R, q, glows) {
  if (!R.vents) return;
  const V0 = R.vents, k = R.kit, n = q.level === 'full' ? V0.n : q.level === 'middle' ? Math.ceil(V0.n / 2) : 0;
  for (let i = 0; i < n; i++) {
    const z = lerp(V0.z0, V0.z1, (i + 0.5) / n), len = (V0.z1 - V0.z0) / n * 0.6;
    for (const s of [1, -1]) {
      const a = hull.side(z, hull.keel(z) + 0.55 * k, s);
      const m = place(a.p.clone().addScaledVector(a.n, 0.03 * k), { dir: a.n });
      batch.add('brass', box(0.32 * k, 0.05 * k, len + 0.14 * k), m);
      const g = new THREE.PlaneGeometry(len, 0.16 * k, 6, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
      batch.add('flow', g, new THREE.Matrix4().multiplyMatrices(m, place([0, 0.028 * k, 0])), { tag: 2 });
      if (i % 2 === 0) glows.push({ p: a.p.clone().addScaledVector(a.n, 0.4 * k), size: 2.2 * k, color: 0xffa040, chan: 6 });
    }
  }
}

// ---------- armour plate (a garage fitting): riveted iron plates over the hull below the gun strake ----------
export function armour(hull, batch, R, q, S) {
  if (q.level === 'far' || !R.armour) return;
  const A = R.armour, k = R.kit, { keel, rim, zs, zb } = hull;
  batch = batch.with({ fit: 'armour' });
  const span = (y) => { let a = zb, b = zs; for (let z = zs; z <= zb; z += 0.05) if (keel(z) < y - 0.12 && rim(z) > y + 0.05) { a = Math.min(a, z); b = Math.max(b, z); } return [a + 0.2, b - 0.2]; };
  for (const s of [1, -1]) for (const [y0, y1] of A.rows) {
    const [a, b] = span(y1), n = Math.max(2, Math.round((b - a) / A.plate));
    for (let i = 0; i < n; i++) {
      const z0 = lerp(a, b, i / n) + 0.03, z1 = lerp(a, b, (i + 1) / n) - 0.03;
      hullBand(hull, batch, { z0, z1, top: () => y0, bottom: () => y1, side: s, tile: [2, 2], I: 4, J: 2, key: 'iron', off: 0.07 * k, edges: true });
      if (q.rivets) for (const y of [y0 - 0.08 * k, y1 + 0.08 * k]) rivetRow(hull, batch, { z0, z1, y: () => y, side: s, step: 0.42 * k, rivet: S.rivet, r: 0.04 * k, off: 0.075 * k });
    }
  }
  // a beak of plate over the bow, round the ram's collar
  for (const s of [1, -1]) hullBand(hull, batch, { z0: zb - 3.2 * k, z1: zb - 0.15 * k, top: (z) => rim(z) - 0.5 * k, bottom: (z) => keel(z) + 0.5 * k, side: s, tile: [2, 2], I: 8, J: 4, key: 'iron', off: 0.08 * k });
}
