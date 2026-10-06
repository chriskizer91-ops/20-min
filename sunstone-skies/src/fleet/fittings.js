// fittings.js: everything else on each levelled-up ship's deck and round its hull.
//   rails round the waist, the quarterdeck and the forecastle; stairs and ladders between them
//   a double wheel (it spins as she turns), the binnacle with its compass, a skylight over the great cabin
//   the belfry, the capstan, hatches and gratings, barrels, crates and rope
//   a ship's boat hanging from davits on each quarter
//   catheads at the bow with boarding grapnels hanging from them, and a gilt storm-bird for a figurehead
//   lanterns built in the round, three great ones on the taffrail
//   the belly fins (they tilt as she climbs or dives) and the rudder (it swings as she turns)
import * as THREE from 'three';
import { clamp, lerp, place, frame, lathe, tube, box, polygon, walls, toRect, sheet } from '../ship/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- rails ----------
function railPath(hull, z0, z1, side, inset, step) {
  const pts = [], n = Math.max(2, Math.ceil(Math.abs(z1 - z0) / step));
  for (let i = 0; i <= n; i++) { const z = lerp(z0, z1, i / n); pts.push(V(side * (hull.deckHalf(z) - inset), hull.deckY(z), z)); }
  return pts;
}
function railAlong(batch, pts, R, q, S, h, closed = false) {
  if (pts.length < 2) return;
  const sc = R.railScale, top = pts.map((p) => p.clone().add(V(0, h, 0)));
  if (q.balusterStep && q.balusters) {
    batch.add('brass', tube(top, 0.045 * sc, q.tubeRad, 1, closed));
    batch.add('brass', tube(pts.map((p) => p.clone().add(V(0, 0.05, 0))), 0.058 * sc, q.tubeRad, 1, closed));
    batch.add('bronze', tube(pts.map((p) => p.clone().add(V(0, h * 0.22, 0))), 0.022 * sc, Math.max(3, q.tubeRad - 3), 1, closed));
  } else batch.add('brass', tube(top, 0.05 * sc, q.tubeRad, 1, closed));
  let carry = 0, count = 0;
  const step = q.balusterStep ? q.balusterStep * R.rail.step : 0, postEvery = q.balusterStep ? Math.max(3, Math.round(9 / q.balusterStep)) : 0;
  for (let i = 0; i < pts.length - 1 && step; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    let d = carry;
    while (d < len) {
      const p = a.clone().lerp(b, d / len);
      if (count % postEvery === 0 || !q.balusters) {
        batch.add('brass', box(0.1 * sc, h + 0.05, 0.1 * sc), place([p.x, p.y + (h + 0.05) / 2, p.z]));
        if (q.balusters) batch.add('brass', S.knob, place([p.x, p.y + h + 0.05, p.z], { scale: sc }));
      } else batch.add('bronze', S.baluster, place([p.x, p.y + 0.05, p.z], { scale: [sc, h - 0.06, sc] }));
      count++; d += step;
    }
    carry = d - len;
  }
}
export function rails(hull, batch, R, q, S) {
  const { zs, zb } = hull, Q = R.quarterdeck, F = R.forecastle, h = R.rail.h, inset = 0.06 * R.railScale, st = q.railPath, k = R.kit;
  const bowEnd = zb - 0.3 * k, zt = zs + 0.1 * k;
  // the stern's rail (the taffrail), from port across to starboard
  const across = (z) => { const out = []; for (let i = 0; i <= 12; i++) out.push(V(lerp(1, -1, i / 12) * (hull.deckHalf(z) - inset), hull.deckY(z), z)); return out; };
  const round = (z0) => [...railPath(hull, z0, bowEnd, 1, inset, st), ...railPath(hull, bowEnd, z0, -1, inset, st).slice(1)];
  if (!Q && !F) {
    // a flush deck: one rail all the way round
    const pts = [...round(zt), ...across(zt).slice(1).reverse().slice(1)];
    railAlong(batch, [...pts, pts[0].clone()], R, q, S, h);
  } else if (!Q) {
    // a forecastle only: the waist from the stern to the forecastle, round the stern
    railAlong(batch, [...railPath(hull, F.back - 0.12, zt, 1, inset, st), ...across(zt).slice(1), ...railPath(hull, zt, F.back - 0.12, -1, inset, st).slice(1)], R, q, S, h);
  } else if (F) {
    // the waist, each side, between the raised decks
    for (const s of [1, -1]) railAlong(batch, railPath(hull, Q.front + 0.12, F.back - 0.12, s, inset, st), R, q, S, h);
  } else railAlong(batch, round(Q.front + 0.12), R, q, S, h);
  if (Q) {
    // the quarterdeck: down each side, across the stern, and its breast rail, open where each flight of stairs comes up
    const qh = R.rail.quarterH ?? h, qb = Q.front - 0.1, y = hull.deckY(qb), edge = hull.deckHalf(qb) - inset;
    if (!R.battlements) railAlong(batch, [...railPath(hull, qb, zt, 1, inset, st), ...across(zt).slice(1), ...railPath(hull, zt, qb, -1, inset, st).slice(1)], R, q, S, qh);
    const gaps = flights(Q.stairs).map((x) => [x - Q.stairs.width / 2 - 0.06, x + Q.stairs.width / 2 + 0.06]).sort((a, b) => a[0] - b[0]);
    let from = -edge;
    for (const [a, b] of [...gaps, [edge, edge]]) { if (a - from > 0.25) railAlong(batch, [V(from, y, qb), V(a, y, qb)], R, q, S, qh); from = b; }
  }
  if (F) {
    // the forecastle: round the bow, and its breast rail with gaps for the two ladders
    const fb = F.back + 0.1, fh = R.rail.foreH ?? h;
    if (!R.battlements) railAlong(batch, round(fb), R, q, S, fh);
    const y = hull.deckY(fb), lw = F.ladder.width / 2, lx = F.ladder.x;
    for (const s of [1, -1]) {
      railAlong(batch, [V(s * (hull.deckHalf(fb) - inset), y, fb), V(s * (lx + lw + 0.08), y, fb)], R, q, S, fh);
      railAlong(batch, [V(s * (lx - lw - 0.08), y, fb), V(s * 0.75, y, fb)], R, q, S, fh);
    }
  }
}

// ---------- stairs and ladders ----------
// Where a raised deck's flights of stairs are: one in the middle, or a pair at ±x (a tall castle's)
const flights = (St) => (St.x ? [St.x, -St.x] : [0]);
function steps(batch, hull, x, w, zTop, zBottom, q, k = 1) {
  const yT = hull.deckY(zTop + Math.sign(zTop - zBottom) * 0.3 * k), yB = hull.deckY(zBottom), n = Math.max(3, Math.round((yT - yB) / (0.23 * k)));
  const rise = (yT - yB) / n, run = (zBottom - zTop) / n;
  for (let i = 0; i < n; i++) batch.add('deck', box(w, 0.07 * k, Math.abs(run) + 0.06 * k, 1), place([x, yB + rise * (i + 1) - 0.035 * k, zBottom - run * (i + 0.5)]));
  for (const s of [1, -1]) {
    const a = V(x + s * (w / 2 + 0.05 * k), yB, zBottom), b = V(x + s * (w / 2 + 0.05 * k), yT, zTop);
    batch.add('wood', box(0.1 * k, 0.32 * k, a.distanceTo(b), 1), new THREE.Matrix4().compose(a.clone().lerp(b, 0.5).add(V(0, 0.08 * k, 0)), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), b.clone().sub(a).normalize()), V(1, 1, 1)));
    if (q.level !== 'full') continue;
    const hr = 0.85 * k;
    batch.add('brass', tube([a.clone().add(V(0, hr, 0)), b.clone().add(V(0, hr, 0))], 0.035 * k, q.tubeRad, 2), null);
    for (const t of [0.05, 0.5, 0.95]) { const p = a.clone().lerp(b, t); batch.add('brass', new THREE.CylinderGeometry(0.025 * k, 0.025 * k, hr, 5), place([p.x, p.y + hr / 2, p.z])); }
  }
}

// A tall castle's face (the Galleon's and the Man-o'-war's): storeys of lit windows between gilt bands, and a door at
// the foot of the quarterdeck's. dir: +1 faces forward, -1 aft
function castleFace(batch, glows, rects, { z, dir, x0, x1, yB, yT, k, door = false }) {
  const width = x1 - x0, cx = (x0 + x1) / 2;
  if (width < 1.2 * k || yT - yB < 1.2 * k) return;
  const zf = z + dir * 0.13 * k, rot = dir > 0 ? 0 : Math.PI, storeys = Math.max(1, Math.round((yT - yB) / (2.5 * k))), sh = (yT - yB) / storeys;
  for (let st = 0; st < storeys; st++) {
    const y0 = yB + st * sh, ym = y0 + sh * 0.52, withDoor = door && st === 0;
    if (st > 0) batch.add('gilt', box(width + 0.2 * k, 0.12 * k, 0.12 * k), place([cx, y0, zf + dir * 0.02 * k]));
    const win = withDoor ? rects.windows2 : rects.windows3, ph = Math.min(sh - 0.8 * k, 1.6 * k), pw = ph * win.w / win.h;
    // panels across the face (either side of the door on the bottom storey)
    for (const [a, b] of withDoor ? [[x0, cx - 0.9 * k], [cx + 0.9 * k, x1]] : [[x0, x1]]) {
      const n = Math.floor((b - a) / (pw + 0.3 * k));
      for (let i = 0; i < n; i++) {
        const x = a + (i + 0.5) * (b - a) / n;
        batch.add('parts', toRect(new THREE.PlaneGeometry(pw, ph), win), place([x, ym, zf], { euler: [0, rot, 0] }));
        for (const [by, bh] of [[ph / 2 + 0.07 * k, 0.1 * k], [-ph / 2 - 0.08 * k, 0.14 * k]]) batch.add('gilt', box(pw + 0.24 * k, bh, 0.09 * k), place([x, ym + by, zf + dir * 0.02 * k]));
        glows.push({ p: V(x, ym, z + dir * 0.6 * k), size: 1.5 * k, color: 0xffb46a, chan: 8 });
      }
    }
  }
  if (!door) return;
  const dw = 1.15 * k, dh = Math.min(2.1 * k, sh - 0.3 * k);
  batch.add('dark', new THREE.PlaneGeometry(dw, dh), place([cx, yB + dh / 2, zf], { euler: [0, rot, 0] }));
  batch.add('wood', box(dw - 0.1 * k, dh - 0.08 * k, 0.06 * k, 1.4), place([cx, yB + dh / 2, zf + dir * 0.03 * k]));
  for (const [x, y, w, h] of [[0, dh + 0.06 * k, dw + 0.24 * k, 0.12 * k], [dw / 2 + 0.06 * k, dh / 2, 0.12 * k, dh], [-dw / 2 - 0.06 * k, dh / 2, 0.12 * k, dh]])
    batch.add('gilt', box(w, h, 0.1 * k), place([cx + x, yB + y, zf + dir * 0.04 * k]));
  const arch = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; arch.push(V(cx + Math.cos(a) * (dw / 2 + 0.1 * k), yB + dh + 0.1 * k + Math.sin(a) * 0.35 * k, zf + dir * 0.05 * k)); }
  batch.add('gilt', tube(arch, 0.06 * k, 4, 2), null);
}

// ---------- the deck ----------
export function deck(hull, batch, R, q, S, glows) {
  if (q.level === 'far') return;
  const seg = Math.max(6, q.latheSeg), rects = S.rects, Q = R.quarterdeck, F = R.forecastle, k = R.kit, win = rects.windows2;
  // the quarterdeck: stairs up its front, and its front wall with windows either side of them
  if (Q) {
    for (const x of flights(Q.stairs)) steps(batch, hull, x, Q.stairs.width, Q.front, Q.stairs.bottom, q, k);
    const z = Q.front, yT = hull.deckY(z - 0.25 * k), yB = hull.deckY(z + 0.3 * k), hw = hull.deckHalf(z + 0.3 * k) - 0.05 * k, sw = Q.stairs.width;
    batch.add('wood', box(hw * 2, yT - yB, 0.12 * k, 1.2), place([0, (yT + yB) / 2, z + 0.06 * k]));
    batch.add('gilt', box(hw * 2, 0.08 * k, 0.16 * k), place([0, yT - 0.04 * k, z + 0.08 * k]));
    if (!Q.stairs.x) {
      const pw = Math.min(1.9 * k, hw - sw / 2 - 0.35 * k), ph = Math.min(pw * win.h / win.w, yT - yB - 0.3 * k);
      if (pw > 0.3) for (const s of [1, -1]) {
        batch.add('parts', toRect(new THREE.PlaneGeometry(pw, ph), win), place([s * (sw / 2 + 0.25 * k + pw / 2), yB + (yT - yB) * 0.52, z + 0.125 * k]));
        glows.push({ p: V(s * (sw / 2 + 0.25 * k + pw / 2), yB + (yT - yB) * 0.52, z + 0.5 * k), size: 1.3 * k, color: 0xffb46a, chan: 8 });
      }
    } else castleFace(batch, glows, rects, { z, dir: 1, x0: -(Q.stairs.x - sw / 2 - 0.3 * k), x1: Q.stairs.x - sw / 2 - 0.3 * k, yB, yT, k, door: true });
  }
  // the forecastle: ladders either side, and its back wall with a door and two small windows
  if (F) {
    for (const s of [1, -1]) steps(batch, hull, s * F.ladder.x, F.ladder.width, F.back, F.ladder.bottom, q, k);
    const z = F.back, yT = hull.deckY(z + 0.25 * k), yB = hull.deckY(z - 0.3 * k), hw = hull.deckHalf(z - 0.3 * k) - 0.05 * k;
    batch.add('wood', box(hw * 2, yT - yB, 0.12 * k, 1.2), place([0, (yT + yB) / 2, z - 0.06 * k]));
    batch.add('gilt', box(hw * 2, 0.08 * k, 0.16 * k), place([0, yT - 0.04 * k, z - 0.08 * k]));
    const dw = 0.9 * k, dh = Math.min(1.0 * k, yT - yB - 0.12 * k);
    batch.add('dark', new THREE.PlaneGeometry(dw, dh), place([0, yB + dh / 2, z - 0.125 * k], { euler: [0, Math.PI, 0] }));
    batch.add('wood', box(dw - 0.08 * k, dh - 0.06 * k, 0.05 * k, 1.4), place([0, yB + dh / 2, z - 0.15 * k]));
    for (const [x, y, w, h] of [[0, dh + 0.04 * k, dw + 0.16 * k, 0.08 * k], [dw / 2 + 0.04 * k, dh / 2, 0.08 * k, dh], [-dw / 2 - 0.04 * k, dh / 2, 0.08 * k, dh]]) batch.add('gilt', box(w, h, 0.08 * k), place([x, yB + y, z - 0.15 * k]));
    const ww = 0.7 * k;
    for (const s of [1, -1]) {
      const x = s * Math.min(hw - 0.6 * k, F.ladder.x + F.ladder.width / 2 + 0.75 * k);
      batch.add('parts', toRect(new THREE.PlaneGeometry(ww, ww * win.h / win.w * 2), rects.windows3), place([x, yB + (yT - yB) * 0.5, z - 0.125 * k], { euler: [0, Math.PI, 0] }));
    }
    // a tall forecastle has a storey of windows above the door, across the middle
    if (yT - yB > 3.2 * k) castleFace(batch, glows, rects, { z, dir: -1, x0: -(F.ladder.x - F.ladder.width / 2 - 0.3 * k), x1: F.ladder.x - F.ladder.width / 2 - 0.3 * k, yB: yB + dh + 0.35 * k, yT, k });
  }
  // the wheel (on the Frigate, two on one axle): a working part that spins with the helm
  { const W = R.wheel, y0 = hull.deckY(W.z), r = W.r, cy = y0 + r * 1.5, kw = r / 0.72, pair = W.double ? [-0.4 * kw, 0.4 * kw] : [0.08 * kw];
    const rig = { ch: batch.ch('wheel'), pivot: V(0, cy, W.z), axis: V(0, 0, 1) };
    const bz = W.double ? 0 : -0.12 * kw, bd = W.double ? 0.52 * kw : 0.3 * kw;
    batch.add('wood', box(0.34 * kw, cy - y0 - 0.12 * kw, bd, 2), place([0, (y0 + cy - 0.12 * kw) / 2, W.z + bz]));
    batch.add('brass', box(0.4 * kw, 0.06 * kw, bd + 0.06 * kw), place([0, cy - 0.15 * kw, W.z + bz]));
    batch.add('brass', box(0.4 * kw, 0.06 * kw, bd + 0.06 * kw), place([0, y0 + 0.08 * kw, W.z + bz]));
    if (W.double) batch.add('bronze', new THREE.CylinderGeometry(0.05 * kw, 0.05 * kw, 0.95 * kw, 8).rotateX(Math.PI / 2), place([0, cy, W.z]), rig);
    for (const dz of pair) {
      const m = place([0, cy, W.z + dz]);
      const add = (key, g, mat) => batch.add(key, g, new THREE.Matrix4().multiplyMatrices(m, mat ?? new THREE.Matrix4()), rig);
      add('wood', new THREE.TorusGeometry(r * 0.78, r * 0.06, Math.max(4, seg >> 2), seg * 2));
      add('wood', new THREE.TorusGeometry(r * 0.3, r * 0.045, 4, seg));
      add('brass', new THREE.TorusGeometry(r * 0.66, r * 0.02, 4, seg * 2));
      add('brass', lathe([[0.001, -0.07 * kw], [r * 0.16, -0.07 * kw], [r * 0.18, 0], [r * 0.16, 0.07 * kw], [0.001, 0.09 * kw]], seg).rotateX(Math.PI / 2));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = V(Math.cos(a), Math.sin(a), 0);
        add('wood', lathe([[r * 0.045, 0], [r * 0.035, r * 0.78]], 5), place([0, 0, 0], { dir: d }));
        add('wood', lathe([[r * 0.04, 0], [r * 0.06, r * 0.08], [r * 0.045, r * 0.16], [r * 0.065, r * 0.22], [0.001, r * 0.27]], 6), place(d.clone().multiplyScalar(r * 0.84), { dir: d }));
      }
    }
  }
  // the binnacle: a pedestal with the compass under a glass dome, lit from within
  if (R.binnacle) { const z = R.binnacle.z, y = hull.deckY(z);
    batch.add('wood', lathe([[0.26, 0], [0.26, 0.08], [0.18, 0.14], [0.16, 0.7], [0.24, 0.78], [0.25, 0.86]].map(([a, b]) => [a * k, b * k]), seg), place([0, y, z]));
    batch.add('brass', lathe([[0.25 * k, 0], [0.27 * k, 0.04 * k], [0.25 * k, 0.08 * k]], seg), place([0, y + 0.86 * k, z]));
    batch.add('glass', new THREE.SphereGeometry(0.2 * k, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2), place([0, y + 0.92 * k, z]));
    batch.add('brass', lathe([[0.03 * k, 0], [0.04 * k, 0.05 * k], [0.001, 0.12 * k]], 6), place([0, y + 1.1 * k, z]));
    for (const s of [1, -1]) batch.add('iron', new THREE.SphereGeometry(0.09 * k, 8, 6), place([s * 0.36 * k, y + 0.86 * k, z]));
    glows.push({ p: V(0, y + 1.0 * k, z), size: 0.8 * k, color: 0xffd08a, chan: 0 });
  }
  // the skylight over the great cabin: a glazed roof, lit from below
  if (R.skylight) { const z = R.skylight.z, y = hull.deckY(z), w = (R.skylight.w ?? 1.1) * k, l = 0.8 * k;
    batch.add('wood', box(w + 0.12 * k, 0.3 * k, l + 0.12 * k, 1.4), place([0, y + 0.15 * k, z]));
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(w, l * 0.62); g.rotateX(-Math.PI / 2 + s * 0.55);
      batch.add('glass', g, place([0, y + 0.42 * k, z + s * l * 0.26]));
    }
    batch.add('brass', box(w + 0.16 * k, 0.05 * k, 0.06 * k), place([0, y + 0.6 * k, z]));
    for (let i = 0; i <= 4; i++) for (const s of [1, -1]) batch.add('brass', box(0.03 * k, 0.03 * k, l * 0.62), new THREE.Matrix4().multiplyMatrices(place([(i / 4 - 0.5) * w, y + 0.44 * k, z + s * l * 0.26]), new THREE.Matrix4().makeRotationX(s * 0.55)));
    glows.push({ p: V(0, y + 0.6 * k, z), size: 1.4 * k, color: 0xffb46a, chan: 8 });
  }
  // the belfry, with its bell
  if (R.belfry) { const z = R.belfry.z, y = hull.deckY(z);
    for (const s of [1, -1]) batch.add('gilt', lathe([[0.06, 0], [0.07, 0.1], [0.04, 0.2], [0.05, 0.9], [0.07, 1.0]].map(([a, b]) => [a * k, b * k]), seg), place([s * 0.42 * k, y, z]));
    batch.add('gilt', box(1.0 * k, 0.1 * k, 0.18 * k), place([0, y + 1.04 * k, z]));
    batch.add('gilt', lathe([[0.55, 0], [0.4, 0.12], [0.1, 0.3], [0.001, 0.32]].map(([a, b]) => [a * k, b * k]), seg), place([0, y + 1.09 * k, z], { scale: [1, 1, 0.35] }));
    batch.add('brass', lathe([[0.001, 0.0], [0.2, 0.0], [0.19, 0.06], [0.14, 0.18], [0.12, 0.34], [0.06, 0.4], [0.001, 0.42]].map(([a, b]) => [a * k, b * k]), seg), place([0, y + 0.52 * k, z]));
  }
  // the capstan
  if (R.capstan) {
    const z = R.capstan.z, y = hull.deckY(z), k = 1.15 * R.kit;
    batch.add('wood', lathe([[0.45 * k, 0], [0.45 * k, 0.08 * k], [0.3 * k, 0.14 * k], [0.26 * k, 0.5 * k], [0.32 * k, 0.6 * k], [0.36 * k, 0.72 * k], [0.001, 0.76 * k]], seg), place([0, y, z]));
    for (const yy of [0.08, 0.6]) batch.add('brass', S.ring(0.4 * k * (yy < 0.3 ? 1.1 : 0.85), 0.025 * k), place([0, y + yy * k, z]));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; batch.add('wood', lathe([[0.03 * k, 0], [0.025 * k, 0.9 * k]], 5), place([0, y + 0.66 * k, z], { dir: [Math.cos(a), 0.06, Math.sin(a)] })); }
  }
  // hatches with gratings
  for (const Hh of R.hatches ?? []) {
    const y = hull.deckY(Hh.z), h = 0.18 * k;
    batch.add('brass', box(Hh.wid + 0.12 * k, h, Hh.len + 0.12 * k), place([0, y + h / 2, Hh.z]));
    const g = toRect(new THREE.PlaneGeometry(Hh.len, Hh.wid), rects.hatch);
    g.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);
    batch.add('parts', g, place([0, y + h + 0.004, Hh.z]));
  }
  // the fife rails at each mast's foot, with belaying pins
  if (q.level === 'full') for (const M of R.masts) {
    const y0 = hull.deckY(M.z), fr = (M.fife ?? 1.05) * k, fh = 0.7 * k, corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (const [cx, cz] of corners) batch.add('wood', box(0.11 * k, fh, 0.11 * k, 2), place([cx * fr, y0 + fh / 2, M.z + cz * fr]));
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4], len = Math.hypot((bx - ax) * fr, (bz - az) * fr);
      batch.add('wood', box(len, 0.08 * k, 0.18 * k, 2), place([(ax + bx) / 2 * fr, y0 + fh, M.z + (az + bz) / 2 * fr], { euler: [0, ax === bx ? Math.PI / 2 : 0, 0] }));
      for (let j = 1; j < 5; j++) batch.add('brass', lathe([[0.022, -0.12], [0.03, 0.02], [0.018, 0.06], [0.03, 0.16], [0.001, 0.2]].map(([a, b]) => [a * k, b * k]), 5), place([lerp(ax, bx, j / 5) * fr, y0 + fh, M.z + lerp(az, bz, j / 5) * fr]));
    }
  }
  if (!q.cargo) return;
  // barrels with brass hoops, coils of rope, crates bound in brass
  const C = R.cargo ?? {}, kc = 1.05 * k;
  const barrel = lathe([[0.001, 0], [0.24 * kc, 0], [0.27 * kc, 0.12 * kc], [0.29 * kc, 0.32 * kc], [0.27 * kc, 0.52 * kc], [0.24 * kc, 0.64 * kc], [0.001, 0.64 * kc]], seg);
  for (const [x, z] of C.barrels ?? []) {
    const y = hull.deckY(z);
    for (const [dx, dz] of [[0, 0], [0.55 * kc, 0.1 * kc], [0.2 * kc, -0.52 * kc]]) {
      const bx = x + dx * Math.sign(-x || 1);
      batch.add('wood', barrel, place([bx, y, z + dz]));
      for (const t of [0.12, 0.52]) batch.add('brass', S.ring(0.27 * kc, 0.02 * kc), place([bx, y + t * kc, z + dz]));
    }
  }
  for (const [x, z] of C.coils ?? []) { const y = hull.deckY(z); for (let i = 0; i < 3; i++) batch.add('rope', new THREE.TorusGeometry((0.3 - i * 0.05) * kc, 0.045 * kc, 4, Math.max(8, seg)).rotateX(Math.PI / 2), place([x, y + 0.045 * kc + i * 0.08 * kc, z])); }
  for (const [x, z] of C.crates ?? []) {
    const y = hull.deckY(z), s = 0.62 * kc;
    batch.add('deck', box(s, s, s, 1.2), place([x, y + s / 2, z], { euler: [0, 0.3, 0] }));
    for (const dy of [0.04 * kc, s - 0.04 * kc]) batch.add('brass', box(s + 0.02 * kc, 0.05 * kc, s + 0.02 * kc), place([x, y + dy, z], { euler: [0, 0.3, 0] }));
  }
}

// ---------- the ship's boats, hanging from davits on each quarter ----------
export function boats(hull, batch, R, q, S) {
  if (q.level === 'far' || !R.boats) return;
  const B = R.boats, seg = Math.max(6, q.latheSeg), k = R.kit;
  for (const s of B.sides ?? [1, -1]) {
    const zc = B.z, L = B.len, beam = B.beam, depth = 0.55 * B.len / 3.9;
    const xc = s * (hull.half(zc) + beam / 2 + 0.25 * k), yc = B.y;
    // the boat's hull: pointed at the bow, a small transom at the stern, painted plum with a gilt gunwale
    const half = (u) => beam / 2 * Math.pow(Math.sin(Math.PI * clamp(0.08 + u * 0.92, 0, 1)), 0.6) * (u < 0.5 ? lerp(0.75, 1, u * 2) : 1);
    const g = sheet(16, 8, (i, j) => {
      const u = i, a = (j * 2 - 1) * Math.PI / 2, w = half(u);
      return [xc + Math.sin(a) * w, yc - Math.cos(a) * depth * (0.7 + 0.3 * Math.sin(Math.PI * u)), zc + (u - 0.5) * L];
    }, (i, j) => [i * 2, j], s > 0);
    batch.add('plumwood', g);
    const rim = [];
    for (let i = 0; i <= 16; i++) rim.push(V(xc + half(i / 16), yc, zc + (i / 16 - 0.5) * L));
    for (let i = 16; i >= 0; i--) rim.push(V(xc - half(i / 16), yc, zc + (i / 16 - 0.5) * L));
    batch.add('gilt', tube(rim, 0.035 * k, 4, 1, true, 0.2), null);
    for (const t of [0.3, 0.5, 0.7]) batch.add('wood', box(half(t) * 1.9, 0.05 * k, 0.22 * k), place([xc, yc - 0.12 * k, zc + (t - 0.5) * L]));
    if (q.level === 'full') for (const dx of [-0.12, 0.12]) batch.add('wood', lathe([[0.025 * k, 0], [0.025 * k, L * 0.62], [0.07 * k, L * 0.66], [0.06 * k, L * 0.74], [0.001, L * 0.76]], 4), place([xc + dx * k, yc - 0.06 * k, zc - L * 0.38], { dir: [0, 0.04, 1] }));
    // davits: iron arms curving up from the deck and out over the boat, with falls down to it
    for (const t of [0.15, 0.85]) {
      const z = zc + (t - 0.5) * L, inner = V(s * (hull.deckHalf(z) - 0.35 * k), hull.deckY(z), z);
      const head = V(xc, yc + 1.25 * k, z);
      batch.add('iron', tube([inner, inner.clone().setY(yc + 0.6 * k), V(lerp(inner.x, xc, 0.55), yc + 1.5 * k, z), head], 0.07 * k, Math.max(4, q.tubeRad - 1), 3), null);
      batch.add('dark', box(0.12 * k, 0.22 * k, 0.1 * k), place(head.clone().add(V(0, -0.15 * k, 0))));
      batch.add('rope', tube([head.clone().add(V(0, -0.25 * k, 0)), V(xc, yc + 0.05 * k, z)], 0.02 * k, 3, 1), null);
    }
  }
}

// ---------- the bow: catheads with grapnels, and the storm-bird figurehead ----------
export function bowWork(hull, batch, R, q, S) {
  if (q.level === 'far') return;
  const seg = Math.max(6, q.latheSeg), k = R.kit;
  if (R.catheads) for (const s of [1, -1]) {
    const Cz = R.catheads.z;
    const y = hull.deckY(Cz) + 0.35 * k, root = V(s * (hull.deckHalf(Cz) - 0.6 * k), y, Cz), tip = V(s * (hull.deckHalf(Cz) + 0.95 * k), y + 0.2 * k, Cz + 0.5 * k);
    const d = tip.clone().sub(root);
    batch.add('wood', box(0.28 * k, 0.28 * k, d.length(), 1.4), new THREE.Matrix4().compose(root.clone().lerp(tip, 0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.clone().normalize()), V(1, 1, 1)));
    batch.add('gilt', new THREE.CylinderGeometry(0.17 * k, 0.17 * k, 0.04 * k, seg).rotateX(Math.PI / 2), place(tip.clone().addScaledVector(d.clone().normalize(), 0.02 * k), { quat: new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.clone().normalize()) }));
    if (q.level !== 'full') continue;
    // a boarding grapnel hanging from it on a short chain
    const gy = y - 1.25 * k, gp = tip.clone().setY(gy);
    batch.add('rope', tube([tip.clone().add(V(0, -0.15 * k, 0)), gp.clone().add(V(0, 0.55 * k, 0))], 0.025 * k, 3, 1), null);
    batch.add('iron', new THREE.TorusGeometry(0.08 * k, 0.02 * k, 4, 10), place(gp.clone().add(V(0, 0.55 * k, 0)), { euler: [0, 0, Math.PI / 2] }));
    batch.add('iron', new THREE.CylinderGeometry(0.035 * k, 0.035 * k, 0.55 * k, 6), place(gp.clone().add(V(0, 0.27 * k, 0))));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4, o = V(Math.cos(a), 0, Math.sin(a));
      const pts = [gp.clone(), gp.clone().addScaledVector(o, 0.22 * k).add(V(0, 0.02 * k, 0)), gp.clone().addScaledVector(o, 0.3 * k).add(V(0, 0.2 * k, 0)), gp.clone().addScaledVector(o, 0.24 * k).add(V(0, 0.32 * k, 0))];
      batch.add('iron', tube(pts, 0.03 * k, 4, 3), null);
    }
  }
  // the figurehead: a gilt bird leaning out over the ram, its wings raised and spread back along the bows (a storm-bird
  // on the Frigate, a gull on the Brig). Where a bow gun sits on the stem, only the wings are carved, along the bows.
  if (!R.figurehead) return;
  const F = R.figurehead, kf = F.scale ?? 1, base = V(0, F.y, F.z), lean = V(0, 0.75, 1).normalize();
  if (F.body !== false) {
    batch.add('gilt', lathe([[0.001, 0], [0.22, 0.1], [0.3, 0.42], [0.28, 0.75], [0.2, 1.0], [0.13, 1.18]].map(([a, b]) => [a * kf, b * kf]), seg), place(base, { dir: lean, scale: [1, 1, 0.85] }));
    const head = base.clone().addScaledVector(lean, 1.28 * kf);
    batch.add('gilt', lathe([[0.001, -0.16], [0.13, -0.1], [0.15, 0.05], [0.11, 0.17], [0.001, 0.22]].map(([a, b]) => [a * kf, b * kf]), seg), place(head, { dir: [0, 0.15, 1] }));
    // the hooked beak, the crest swept back, and crystal eyes
    batch.add('gilt', lathe([[0.075, 0], [0.06, 0.12], [0.03, 0.26], [0.001, 0.34]].map(([a, b]) => [a * kf, b * kf]), seg), place(head.clone().add(V(0, 0, 0.18 * kf)), { dir: [0, -0.25, 1] }));
    batch.add('gilt', lathe([[0.025, 0], [0.02, 0.08], [0.001, 0.16]].map(([a, b]) => [a * kf, b * kf]), 5), place(head.clone().add(V(0, -0.06 * kf, 0.48 * kf)), { dir: [0, -1, -0.2] }));
    for (const [dx, up] of [[0, 0.5], [0.07, 0.3], [-0.07, 0.3]]) batch.add('gilt', lathe([[0.035, 0], [0.03, 0.2], [0.001, 0.5]].map(([a, b]) => [a * kf, b * kf]), 5), place(head.clone().add(V(dx * kf, 0.12 * kf, -0.08 * kf)), { dir: [dx * 2, up, -1] }));
    for (const s of [1, -1]) batch.add('crystal', new THREE.SphereGeometry(0.035 * kf, 6, 4), place(head.clone().add(V(s * 0.11 * kf, 0.04 * kf, 0.1 * kf))));
    // tail feathers fanned along the stem below
    for (let i = -2; i <= 2; i++) batch.add('gilt', lathe([[0.05, 0], [0.08, 0.3], [0.001, 0.75]].map(([a, b]) => [a * kf, b * kf]), 5), place(base.clone().add(V(i * 0.1 * kf, 0, -0.05)), { dir: [i * 0.25, -1, -0.3] }));
  }
  // the wings: flat gilt shapes with feathered trailing edges, raised up and back from the shoulders
  const outline = [[0, 0], [0.1, 0.55], [0.55, 1.05], [1.15, 1.42]];
  const fingers = 6;
  for (let i = 0; i <= fingers; i++) {
    const t = i / fingers, tipU = lerp(1.15, 2.3, t), tipV = lerp(1.42, 0.25, Math.pow(t, 0.9));
    outline.push([tipU, tipV]);
    if (i < fingers) { const t2 = (i + 0.55) / fingers; outline.push([lerp(1.15, 2.3, t2) - 0.32, lerp(1.42, 0.25, Math.pow(t2, 0.9)) - 0.2]); }
  }
  outline.push([1.6, -0.05], [0.8, -0.12]);
  const pts = outline.map(([u, v]) => [u * kf, v * kf]);
  for (const s of [1, -1]) {
    const shoulder = base.clone().addScaledVector(lean, 0.55 * kf).add(V(s * (F.spread ?? 0.24 * kf), 0, 0));
    const u = V(s * 0.42, 0.05, -1).normalize(), v = V(s * 0.55, 1, 0.25).normalize(), n = new THREE.Vector3().crossVectors(u, v).normalize();
    const m = new THREE.Matrix4().makeBasis(u, v, n).setPosition(shoulder);
    for (const f of [1, -1]) batch.add('gilt', polygon(pts, (x, y) => [x, y]).translate(0, 0, f * 0.03), m);
    batch.add('gilt', walls(pts, 0.06), m);
    // raised quills along the feathers
    if (q.level === 'full') for (let i = 0; i < fingers; i++) {
      const t = (i + 0.2) / fingers, a = V(lerp(0.5, 1.0, t) * kf, lerp(0.5, 0.9, t) * kf, 0.05).applyMatrix4(m), b2 = V(lerp(1.15, 2.3, t) * kf - 0.05, lerp(1.42, 0.25, Math.pow(t, 0.9)) * kf, 0.05).applyMatrix4(m);
      batch.add('brass', tube([a, b2], 0.022 * kf, 3, 1), null);
    }
  }
}

// ---------- lanterns, in the round: brass frame, glowing glass, a cap and a ring to hang it by ----------
function lantern(batch, p, sc, q, glows) {
  const seg = 6;
  if (q.level === 'far') { glows.push({ p: p.clone().add(V(0, 0.23 * sc, 0)), size: 1.6 * sc, color: 0xffb860, flicker: true, chan: 0 }); return; }
  if (q.level !== 'full') {
    batch.add('glass', new THREE.CylinderGeometry(0.11, 0.09, 0.3, 5), place(p.clone().add(V(0, 0.23 * sc, 0)), { scale: sc }));
    batch.add('brass', new THREE.ConeGeometry(0.14, 0.22, 5), place(p.clone().add(V(0, 0.48 * sc, 0)), { scale: sc }));
    glows.push({ p: p.clone().add(V(0, 0.23 * sc, 0)), size: 1.6 * sc, color: 0xffb860, flicker: true, chan: 0 });
    return;
  }
  batch.add('brass', lathe([[0.001, 0], [0.12, 0], [0.13, 0.04], [0.1, 0.08]], seg), place(p, { scale: sc }));
  batch.add('glass', new THREE.CylinderGeometry(0.11, 0.09, 0.3, seg), place(p.clone().add(V(0, 0.23 * sc, 0)), { scale: sc }));
  if (q.level === 'full') for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2 + Math.PI / seg; batch.add('brass', box(0.02, 0.32, 0.02), place(p.clone().add(V(Math.sin(a) * 0.105 * sc, 0.23 * sc, Math.cos(a) * 0.105 * sc)), { scale: sc })); }
  batch.add('brass', lathe([[0.14, 0], [0.13, 0.04], [0.06, 0.13], [0.03, 0.2], [0.05, 0.24], [0.001, 0.3]], seg), place(p.clone().add(V(0, 0.38 * sc, 0)), { scale: sc }));
  glows.push({ p: p.clone().add(V(0, 0.23 * sc, 0)), size: 1.6 * sc, color: 0xffb860, flicker: true, chan: 0 });
}
export function lanterns(hull, batch, R, q, S, glows) {
  const k = R.kit;
  for (const L of R.lanterns) {
    const p = V(...L.at), sc = L.scale ?? R.lanternScale ?? 1.4 * k;
    if (L.post) {
      if (q.level !== 'far') batch.add('bronze', lathe([[0.06 * k, 0], [0.05 * k, 0.05 * k], [0.035 * k, 0.1 * k], [0.035 * k, L.post - 0.05 * k], [0.07 * k, L.post]], 6), place(p));
      lantern(batch, p.clone().add(V(0, L.post, 0)), sc, q, glows);
    } else {
      batch.add('brass', new THREE.CylinderGeometry(0.018 * k, 0.018 * k, L.hang, 4), place([p.x, p.y - L.hang / 2, p.z]));
      lantern(batch, p.clone().add(V(0, -L.hang - 0.42 * sc, 0)), sc, q, glows);
    }
  }
}

// ---------- the belly fins (they tilt as she climbs or dives) and the rudder (it swings as she turns) ----------
export function fins(hull, batch, R, q, S) {
  const rect = S.rects.fin, th = 0.07 + R.length * 0.0035;
  R.fins.forEach((F, fi) => {
    for (const side of [1, -1]) {
      const zm = (F.z0 + F.z1) / 2, p = hull.at(zm, 0.8, side), root = V(p[0], p[1] + 0.05, zm);
      const ang = F.tilt * Math.PI / 3, out = V(side * Math.cos(ang), -Math.sin(ang), 0);
      const chord = F.z1 - F.z0, tipChord = chord * 0.42, back = F.sweep < 0;
      const pts = back
        ? [[chord / 2, 0], [-chord / 2, 0], [-chord / 2 + F.sweep, F.span], [-chord / 2 + F.sweep + tipChord, F.span]]
        : [[-chord / 2, 0], [chord / 2, 0], [chord / 2 + F.sweep, F.span], [chord / 2 + F.sweep - tipChord, F.span]];
      const xs = pts.map((v) => v[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const uvOf = (x, y) => { const u = (x - x0) / (x1 - x0), v = y / F.span, px = lerp(7, 230, back ? 1 - u : u), py = lerp(9, 159, v); return [lerp(rect.u0, rect.u1, px / rect.w), 1 - lerp(rect.v0, rect.v1, py / rect.h)]; };
      const m = frame(root, V(0, 0, 1), out, new THREE.Vector3().crossVectors(V(0, 0, 1), out));
      // the fin turns on a pin across its root, like a diving plane
      const rig = { ch: batch.ch(`fin:${fi}`), pivot: root.clone().addScaledVector(out, 0.1), axis: out.clone().multiplyScalar(side) };
      for (const f of [1, -1]) batch.add('parts', polygon(pts, uvOf).translate(0, 0, f * th / 2), m, rig);
      batch.add('brass', walls(pts, th), m, rig);
      batch.add('brass', box(chord * 1.05, 0.14, th * 2.4), new THREE.Matrix4().multiplyMatrices(m, place([0, 0.03, 0])));
      if (q.level !== 'far') batch.add('brass', new THREE.CylinderGeometry(0.09, 0.09, th * 3, 8).rotateX(Math.PI / 2), new THREE.Matrix4().multiplyMatrices(m, place([0, 0.12, 0])));
    }
  });
}
export function rudder(hull, batch, R, q, S) {
  const D = R.rudder, rect = S.rects.rudder, th = 0.1 + R.length * 0.003, h = D.top - D.bottom, w = D.width;
  const pivotM = place([0, D.top, D.z], { euler: [0, -Math.PI / 2, 0] });
  const rig = { ch: batch.ch('rudder'), pivot: V(0, D.top, D.z), axis: V(0, 1, 0) };
  const add = (key, g, mat) => batch.add(key, g, new THREE.Matrix4().multiplyMatrices(pivotM, mat ?? new THREE.Matrix4()), rig);
  const pts = [[0, 0], [-w * 0.75, 0], [-w, -h * 0.25], [-w, -h * 0.92], [-w * 0.8, -h], [0, -h]];
  const uvOf = (x, y) => [lerp(rect.u0, rect.u1, lerp(0.16, 0.98, -x / w)), 1 - lerp(rect.v0, rect.v1, lerp(0.02, 0.98, -y / h))];
  for (const f of [1, -1]) add('parts', polygon(pts, uvOf).translate(0, 0, f * th / 2));
  add('brass', walls(pts, th));
  for (let i = 0; i < 4; i++) {
    const y = -h * (0.1 + i * 0.26);
    add('brass', new THREE.CylinderGeometry(0.07 + R.length * 0.002, 0.07 + R.length * 0.002, 0.3, 8), place([0.02, y, 0]));
    add('brass', box(w * 0.6, 0.1, th + 0.05), place([-w * 0.3, y, 0]));
  }
  add('gilt', new THREE.SphereGeometry(0.12, 8, 6), place([-w * 0.92, -h * 0.55, 0], { scale: [1, 1.4, 0.5] }));
}

// ---------- the big ships' own work: anchors, battlements, the sunburst, the cargo boom and the treasure ----------
// An anchor hanging at p (its ring), its shank `len` long, lying flat against the hull's side: an iron shank, a wooden
// stock across its head, and two arms curving up, fore and aft, to broad flukes
function anchor(batch, p, len, q) {
  const r = len * 0.045, seg = Math.max(5, q.latheSeg >> 1), foot = p.clone().add(V(0, -len, 0));
  batch.add('iron', new THREE.CylinderGeometry(r * 0.8, r, len, seg), place(p.clone().add(V(0, -len / 2, 0))));
  batch.add('iron', new THREE.TorusGeometry(r * 2.2, r * 0.5, 4, 10), place(p.clone().add(V(0, r * 2, 0)), { euler: [0, Math.PI / 2, 0] }));
  batch.add('wood', box(len * 0.5, r * 1.6, r * 1.6, 1.2), place(p.clone().add(V(0, -len * 0.1, 0))));
  for (const x of [-0.2, 0.2]) batch.add('iron', box(r * 0.5, r * 1.9, r * 1.9), place(p.clone().add(V(x * len, -len * 0.1, 0))));
  for (const a of [1, -1]) {
    const pts = []; for (let i = 0; i <= 6; i++) { const t = (i / 6) * Math.PI * 0.42; pts.push(foot.clone().add(V(0, (1 - Math.cos(t)) * len * 0.36, Math.sin(t) * len * 0.36 * a))); }
    batch.add('iron', tube(pts, r * 0.8, 5, 2), null);
    const fl = [[0, 0], [len * 0.1, -len * 0.04], [len * 0.12, len * 0.12], [0, len * 0.2], [-len * 0.06, len * 0.08]];
    for (const f of [1, -1]) batch.add('iron', polygon(fl, (x, y) => [x, y]).translate(0, 0, f * r * 0.3).rotateY(Math.PI / 2), place(pts.at(-1).clone().add(V(0, -len * 0.08, a * len * 0.02)), { euler: [a * 0.65, 0, 0] }));
  }
  batch.add('iron', new THREE.SphereGeometry(r * 1.4, 8, 6), place(foot));
}

export function bigWork(hull, batch, R, q, S, glows) {
  const k = R.kit, seg = Math.max(6, q.latheSeg);
  // anchors at the catheads, on chains down from them
  if (R.anchors && R.catheads && q.level !== 'far') for (const s of [1, -1]) {
    const Cz = R.catheads.z, y = hull.deckY(Cz) + 0.35 * k, tip = V(s * (hull.deckHalf(Cz) + 0.95 * k), y + 0.2 * k, Cz + 0.5 * k);
    const len = R.anchors.len, ring = tip.clone().add(V(0, -R.anchors.drop, 0));
    if (q.level === 'full') for (let i = 0; i < 10; i++) batch.add('iron', new THREE.TorusGeometry(0.09 * k, 0.03 * k, 4, 8), place(tip.clone().lerp(ring, (i + 0.5) / 10), { euler: [0, i % 2 ? 0 : Math.PI / 2, 0] }));
    else batch.add('iron', box(0.06 * k, R.anchors.drop, 0.06 * k), place(tip.clone().lerp(ring, 0.5)));
    anchor(batch, ring, len, q);
  }
  // battlements round the castles (the Man-o'-war): iron merlons with brass caps, and gaps between them to fire through
  if (R.battlements && q.level !== 'far') for (const [z0, z1, across] of R.battlements) {
    const w = 1.1 * k, gap = 0.75 * k, h = 1.05 * k, t = 0.3 * k, inset = 0.2 * k;
    const runs = [];
    for (const s of [1, -1]) { const pts = []; for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / Math.max(2, Math.round((z1 - z0) / 1.5))) pts.push(V(s * (hull.deckHalf(z) - inset), hull.deckY(z), z)); runs.push(pts); }
    if (across) { const z = across < 0 ? z0 : z1, pts = []; for (let i = 0; i <= 8; i++) pts.push(V(lerp(1, -1, i / 8) * (hull.deckHalf(z) - inset), hull.deckY(z), z)); runs.push(pts); }
    for (const pts of runs) {
      let d = gap / 2;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), dir = b.clone().sub(a).normalize();
        for (; d < len; d += w + gap) {
          const p = a.clone().addScaledVector(dir, Math.min(len, d + w / 2)), quat = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir);
          batch.add('plates', box(w, h, t, 0.35), new THREE.Matrix4().compose(p.clone().add(V(0, h / 2, 0)), quat, V(1, 1, 1)));
          batch.add('brass', box(w + 0.08 * k, 0.1 * k, t + 0.08 * k), new THREE.Matrix4().compose(p.clone().add(V(0, h + 0.05 * k, 0)), quat, V(1, 1, 1)));
          if (q.rivets) for (const [rx, ry] of [[-0.35, 0.25], [0.35, 0.25], [-0.35, 0.75], [0.35, 0.75]]) {
            const o = V(rx * w, ry * h, 0).applyQuaternion(quat), nrm = V(0, 0, 1).applyQuaternion(quat);
            for (const f of [1, -1]) batch.add('brass', S.rivet, place(p.clone().add(o).add(V(0, 0, 0)).addScaledVector(nrm, f * t / 2), { dir: nrm.clone().multiplyScalar(f), scale: 0.05 * k }));
          }
        }
        d -= len;
      }
    }
  }
  // the sunburst on the Galleon's bow: a gilt sun with sixteen rays and a sunstone at its heart
  if (R.sunburst && q.level !== 'far') {
    const Sb = R.sunburst, c = V(0, Sb.y, Sb.z), r = Sb.r, tilt = Sb.tilt ?? 0.25;
    const m = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt, 0, 0)), V(1, 1, 1));
    const rays = []; for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, rr = i % 2 ? r * 0.55 : i % 4 ? r * 0.92 : r * 1.12; rays.push([Math.sin(a) * rr, Math.cos(a) * rr]); }
    for (const f of [0.03, -0.03]) batch.add('gilt', polygon(rays, (x, y) => [x, y]).translate(0, 0, f * r), m);
    batch.add('gilt', walls(rays, 0.06 * r), m);
    batch.add('gilt', lathe([[r * 0.52, 0], [r * 0.5, 0.08 * r], [r * 0.38, 0.16 * r], [0.001, 0.2 * r]], seg).rotateX(Math.PI / 2), new THREE.Matrix4().multiplyMatrices(m, place([0, 0, 0.06 * r])));
    batch.add('crystal', lathe([[0.001, 0], [r * 0.2, 0.06 * r], [0.001, 0.3 * r]], 6).rotateX(Math.PI / 2), new THREE.Matrix4().multiplyMatrices(m, place([0, 0, 0.2 * r])));
    glows.push({ p: V(0, 0, 0.45 * r).applyMatrix4(m), size: r * 1.6, color: 0xffb23a, pulse: true, chan: 0 });
  }
  if (q.level === 'far') return;
  // treasure chests on deck (the Galleon): banded in gilt, some with the lid open and gold glowing inside
  for (const [x, z, a, open] of R.chests ?? []) {
    const y = hull.deckY(z), w = 0.95 * k, d = 0.62 * k, h = 0.5 * k, m = place([x, y, z], { euler: [0, a, 0] });
    const at = (mat) => new THREE.Matrix4().multiplyMatrices(m, mat);
    batch.add('wood', box(w, h, d, 1.3), at(place([0, h / 2, 0])));
    for (const bx of [-0.36, 0, 0.36]) batch.add('gilt', box(0.06 * k, h + 0.02 * k, d + 0.03 * k), at(place([bx * w, h / 2, 0])));
    const lid = new THREE.CylinderGeometry(d / 2, d / 2, w, Math.max(6, seg), 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
    if (open) {
      batch.add('wood', lid, at(new THREE.Matrix4().makeTranslation(0, h, -d / 2).multiply(new THREE.Matrix4().makeRotationX(-1.9)).multiply(new THREE.Matrix4().makeTranslation(0, 0, d / 2))));
      for (let i = 0; i < 7; i++) batch.add('gilt', new THREE.SphereGeometry(0.11 * k, 6, 4), at(place([(i / 6 - 0.5) * w * 0.8, h + 0.02 * k + (i % 2) * 0.06 * k, ((i * 3) % 5 / 4 - 0.5) * d * 0.6])));
      batch.add('crystal', lathe([[0.001, 0], [0.07 * k, 0.05 * k], [0.001, 0.26 * k]], 5), at(place([0.15 * w, h + 0.05 * k, 0], { euler: [0.3, 0, 0.4] })));
      glows.push({ p: V(0, h + 0.3 * k, 0).applyMatrix4(m), size: 1.2 * k, color: 0xffc04a, pulse: true, chan: 0 });
    } else {
      batch.add('wood', lid, at(place([0, h, 0])));
      batch.add('gilt', box(0.16 * k, 0.2 * k, 0.04 * k), at(place([0, h - 0.04 * k, d / 2 + 0.02 * k])));
    }
  }
  // the cargo boom (the Galleon): a samson post at the deck's edge, and a boom from its foot reaching in over the main
  // hatch, its whip down to a net of treasure on its way up
  if (R.derrick) {
    const D = R.derrick, s = Math.sign(D.x), y0 = hull.deckY(D.z), postTop = V(D.x, y0 + D.post, D.z);
    batch.add('wood', lathe([[0.26 * k, 0], [0.24 * k, D.post * 0.5], [0.2 * k, D.post]], Math.max(6, seg)), place([D.x, y0, D.z]));
    for (const t of [0.15, 0.55, 0.92]) batch.add('brass', S.ring(lerp(0.26, 0.2, t) * k, 0.045 * k), place([D.x, y0 + D.post * t, D.z]));
    batch.add('brass', lathe([[0.3 * k, 0], [0.26 * k, 0.1 * k], [0.12 * k, 0.24 * k], [0.001, 0.5 * k]], Math.max(6, seg >> 1)), place(postTop));
    const heel = V(D.x - s * 0.35 * k, y0 + 1.0 * k, D.z), head = V(D.x - s * D.reach, D.top, D.z), d = head.clone().sub(heel);
    batch.add('wood', lathe([[0.2 * k, 0], [0.16 * k, d.length() * 0.6], [0.12 * k, d.length()]], Math.max(6, seg >> 1)), place(heel, { dir: d }));
    for (const t of [0.05, 0.5, 0.95]) batch.add('brass', S.ring(lerp(0.2, 0.12, t) * k * 1.05, 0.04 * k), place(heel.clone().lerp(head, t), { dir: d }));
    batch.add('dark', box(0.28 * k, 0.4 * k, 0.22 * k), place(head.clone().add(V(0, -0.3 * k, 0))));
    const rr = 0.02 + R.length * 0.0004;
    batch.add('rope', tube([postTop.clone().add(V(0, -0.2 * k, 0)), postTop.clone().lerp(head, 0.5).add(V(0, -0.15, 0)), head], rr, 4, 2, false, 0.5), null);
    const load = V(head.x, D.load, head.z);
    batch.add('rope', tube([head.clone().add(V(0, -0.5 * k, 0)), load.clone().add(V(0, 0.9 * k, 0))], rr * 1.2, 4, 1), null);
    batch.add('iron', new THREE.TorusGeometry(0.16 * k, 0.04 * k, 4, 10), place(load.clone().add(V(0, 0.95 * k, 0)), { euler: [0, Math.PI / 2, 0] }));
    // the net: rope lines from the hook down round a chest, with crystal shards spilling out of the top
    batch.add('wood', box(0.9 * k, 0.55 * k, 0.6 * k, 1.3), place(load.clone().add(V(0, -0.35 * k, 0))));
    for (const bx of [-0.3, 0.3]) batch.add('gilt', box(0.06 * k, 0.57 * k, 0.63 * k), place(load.clone().add(V(bx * k, -0.35 * k, 0))));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, o = V(Math.sin(a) * 0.62 * k, 0, Math.cos(a) * 0.48 * k);
      batch.add('rope', tube([load.clone().add(V(0, 0.9 * k, 0)), load.clone().add(o).add(V(0, -0.05 * k, 0)), load.clone().add(o.clone().multiplyScalar(0.8)).add(V(0, -0.68 * k, 0)), load.clone().add(V(0, -0.7 * k, 0))], 0.025 * k, 3, 3), null);
    }
    batch.add('crystal', lathe([[0.001, 0], [0.12 * k, 0.1 * k], [0.001, 0.5 * k]], 5), place(load.clone().add(V(0.2 * k, -0.05 * k, 0.1 * k)), { euler: [0.4, 0, -0.3] }));
    glows.push({ p: load.clone(), size: 1.6 * k, color: 0xffb23a, pulse: true, chan: 0 });
  }
}
