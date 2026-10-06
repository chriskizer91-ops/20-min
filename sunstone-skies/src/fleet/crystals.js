// crystals.js: each levelled-up ship's sunstone furnaces and the conduits that carry their power.
//   Each furnace is the ships' own (ship/parts.js): a column wearing the painted furnace windows, brass arms and a
//   crown of crystals. Here it also gets a halo ring round the crown, a valve wheel and a pressure gauge, and every
//   crystal is numbered so that, as the crystals' health falls, they go dark one by one.
//   A crystal cage (a garage fitting) closes a brass lattice over each crown.
//   Glass conduits run from the furnaces to the masts (the sails' share of power), along both sides of the deck to
//   the guns (the guns' share), and down through the deck to the lift vents under the keel (the lift's share).
//   Pulses of light run along them, brighter and faster for the system that gets more of the power.
import * as THREE from 'three';
import { clamp, lerp, place, lathe, tube, box } from '../ship/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const golden = (i) => (i * 0.6180339 + 0.13) % 1;

export function furnaces(hull, batch, R, q, S, glows, lights, embers) {
  const C = R.cluster, rects = S.rects, seg = q.level === 'full' ? Math.max(8, q.latheSeg) : q.level === 'middle' ? 6 : 5;
  let gemIndex = 0;
  const out = [];
  for (const cl of R.clusters) {
    const k = cl.scale ?? 1, r = C.r * k, h = C.h * k, y0 = hull.deckY(cl.z), m0 = place([0, y0, cl.z]), kv = k * Math.min(1, C.r * 1.15);
    const add = (key, g, mat, o) => batch.add(key, g, mat ? new THREE.Matrix4().multiplyMatrices(m0, mat) : m0, o);
    add('brass', lathe([[r * 1.18, 0], [r * 1.2, 0.06 * k], [r * 1.14, 0.12 * k], [r * 1.04, 0.14 * k], [r * 1.02, 0.2 * k]], seg));
    const col = new THREE.CylinderGeometry(r, r, h * 0.82, Math.max(10, seg), Math.max(1, q.latheSeg >> 3), true);
    const fr = rects.furnace, pos = col.attributes.position, uv = col.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) / (h * 0.82) + 0.5;
      uv.setXY(i, lerp(fr.u0, fr.u1, lerp(0.04, 0.96, 0.5 + 0.5 * x / r)), 1 - lerp(fr.v0, fr.v1, lerp(0.92, 0.1, y)));
    }
    add('parts', col, place([0, 0.2 * k + h * 0.41, 0]));
    if (q.level !== 'far') for (const [y, w] of [[0.2, 0.05], [0.2 + h * 0.82 / k * 0.5, 0.035], [0.2 + h * 0.82 / k, 0.06]]) add('brass', S.ring(r * 1.0, w * k), place([0, y * k, 0]));
    const top = 0.2 * k + h * 0.82;
    add('brass', lathe([[r * 1.06, 0], [r * 1.08, 0.06 * k], [r * 0.9, 0.16 * k], [r * 0.62, 0.26 * k], [r * 0.56, 0.3 * k]], seg), place([0, top, 0]));
    const u0 = top + 0.28 * k, u1 = u0 + 0.5 * k;
    add('bronze', new THREE.CylinderGeometry(r * 0.52, r * 0.56, u1 - u0, seg, 1), place([0, (u0 + u1) / 2, 0]));
    const ribs = q.level === 'full' ? 12 : q.level === 'middle' ? 6 : 0;
    for (let i = 0; i < ribs; i++) { const a = (i / ribs) * Math.PI * 2; add('brass', new THREE.CylinderGeometry(0.035 * k, 0.035 * k, u1 - u0 + 0.06 * k, 6), place([Math.sin(a) * r * 0.57, (u0 + u1) / 2, Math.cos(a) * r * 0.57])); }
    add('brass', S.ring(r * 0.55, 0.05 * k), place([0, u1, 0]));
    // the valve wheel and the gauge on the column's side
    if (q.level === 'full') {
      const vy = 0.2 * kv + h * 0.55, vx = r * 1.04;
      add('brass', new THREE.TorusGeometry(0.2 * kv, 0.025 * kv, 4, 14).rotateY(Math.PI / 2), place([vx + 0.12 * kv, vy, 0]));
      for (let i = 0; i < 4; i++) add('brass', box(0.02, 0.4 * kv, 0.02).rotateX((i * Math.PI) / 4), place([vx + 0.12 * kv, vy, 0]));
      add('brass', new THREE.CylinderGeometry(0.03 * kv, 0.03 * kv, 0.14 * kv, 6).rotateZ(Math.PI / 2), place([vx + 0.05 * kv, vy, 0]));
      add('brass', new THREE.CylinderGeometry(0.13 * kv, 0.13 * kv, 0.06 * kv, 14).rotateZ(Math.PI / 2), place([-vx - 0.04 * kv, vy + 0.15 * kv, 0]));
      add('glass', new THREE.CircleGeometry(0.1 * kv, 14).rotateY(-Math.PI / 2), place([-vx - 0.075 * kv, vy + 0.15 * kv, 0]));
    }
    // the stem and the crown of cups, one crystal in each
    const n = C.crystals, cupY = u1 + 0.6 * k, spread = C.spread * k;
    add('brass', new THREE.CylinderGeometry(0.13 * k, 0.17 * k, cupY - u1 + 0.1, seg >> 1), place([0, (u1 + cupY) / 2 + 0.05, 0]));
    const spots = [{ x: 0, z: 0, y: cupY + 0.12 * k, h: C.center * k, w: C.center * k * 0.4 }];
    const around = n - 1;
    for (let i = 0; i < around; i++) {
      const a = around === 2 ? (i === 0 ? 0 : Math.PI) : Math.PI / 4 + (i / around) * Math.PI * 2;
      const hh = C.around * k * (0.92 + 0.16 * ((i * 7) % 3) / 2);
      spots.push({ x: Math.sin(a) * spread, z: Math.cos(a) * spread, y: cupY - 0.08 * k, h: hh, w: hh * 0.46 });
    }
    const tubePer = Math.max(2, q.tubePer);
    let crownTop = 0;
    spots.forEach((c, i) => {
      if (i > 0) {
        const d = V(c.x, 0, c.z).normalize();
        const pts = [V(d.x * r * 0.4, u0 + 0.1 * k, d.z * r * 0.4), V(d.x * r * 0.75, u0 + 0.05 * k, d.z * r * 0.75), V(c.x * 0.95, u1 + 0.05 * k, c.z * 0.95), V(c.x, c.y - 0.2 * k, c.z)];
        add('brass', tube(pts, 0.065 * k, Math.max(5, q.tubeRad), tubePer));
      }
      if (!q.allCrystals && i > 0) return;
      const cw = c.w / 0.42;
      add('brass', lathe([[0.04 * cw, -0.18 * cw], [0.12 * cw, -0.12 * cw], [0.13 * cw, -0.02 * cw], [0.21 * cw, 0.04 * cw], [0.24 * cw, 0.16 * cw], [0.21 * cw, 0.17 * cw], [0.18 * cw, 0.07 * cw]], seg), place([c.x, c.y, c.z]));
      const H = c.h, W = c.w, g = lathe([[0.001, -0.08 * H], [0.44 * W, 0.04 * H], [0.5 * W, 0.36 * H], [0.47 * W, 0.58 * H], [0.001, H]], 6).toNonIndexed();
      const P = g.attributes.position, U = g.attributes.uv, cr = rects.crystal;
      for (let j = 0; j < P.count; j++) {
        const u = 0.5 + 0.5 * (P.getX(j) / (0.5 * W)) * 0.62, v = clamp(1 - P.getY(j) / H, 0, 1);
        U.setXY(j, lerp(cr.u0, cr.u1, u), 1 - lerp(cr.v0, cr.v1, lerp(0.02, 0.8, v)));
      }
      // each crystal is numbered (0..1, scattered): it goes dark once the crystals' health falls to its number
      const tag = golden(gemIndex++) * 0.98 + 0.01;
      add('gem', g, place([c.x, c.y + 0.02 * k, c.z], { spin: i * 0.7 + 0.3 }), { tag });
      glows.push({ p: V(c.x, c.y + H * 0.45, c.z).applyMatrix4(m0), size: H * 1.6, color: 0xff9a2a, pulse: true, chan: 1, tag });
      embers.push({ p: V(c.x, c.y + H * 0.6, c.z).applyMatrix4(m0), r: W, h: H, tag });
      if (i === 0) glows.push({ p: V(c.x, c.y + H * 0.38, c.z).applyMatrix4(m0), size: H * 0.55, color: 0xb25cff, pulse: true, chan: 1, tag });
      crownTop = Math.max(crownTop, c.y + H);
    });
    // a brass halo round the crown, on three thin stays
    if (q.level === 'full') {
      const hy = cupY + C.around * k * 0.55, hr = spread + C.around * k * 0.32;
      add('brass', S.ring(hr, 0.035 * kv), place([0, hy, 0]));
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; add('brass', tube([V(Math.sin(a) * r * 0.5, u1, Math.cos(a) * r * 0.5), V(Math.sin(a) * hr, hy, Math.cos(a) * hr)], 0.02 * k, 4, 1)); }
    }
    // the crystal cage (garage fitting): a lattice dome closed over the crown
    if (q.level !== 'far') {
      const cr = spread + C.around * k * 0.42, cb = cupY - 0.3 * k, ct = crownTop + 0.25 * k, mer = q.level === 'full' ? 10 : 6;
      const cage = { fit: 'cage' };
      for (let i = 0; i < mer; i++) {
        const a = (i / mer) * Math.PI * 2, pts = [];
        for (let j = 0; j <= 8; j++) { const t = j / 8, rr = cr * Math.cos(t * Math.PI / 2 * 0.92), y = cb + (ct - cb) * Math.sin(t * Math.PI / 2); pts.push(V(Math.sin(a) * rr, y, Math.cos(a) * rr)); }
        add('brass', tube(pts, 0.04 * kv, 4, 2), null, cage);
      }
      for (const t of [0, 0.35, 0.65, 0.88]) {
        const rr = cr * Math.cos(t * Math.PI / 2 * 0.92), y = cb + (ct - cb) * Math.sin(t * Math.PI / 2);
        add('brass', S.ring(rr, 0.04 * kv), place([0, y, 0]), cage);
      }
      add('brass', lathe([[0.12 * kv, 0], [0.16 * kv, 0.1 * kv], [0.06 * kv, 0.24 * kv], [0.001, 0.42 * kv]], seg), place([0, ct - 0.02, 0]), cage);
      add('iron', S.ring(cr, 0.07 * k), place([0, cb, 0]), cage);
    }
    glows.push({ p: V(0, 0.2 * k + h * 0.45, 0).applyMatrix4(m0), size: r * 2.6, color: 0xff8a2a, chan: 8 });
    lights.push({ p: V(0, cupY + 0.6 * k, 0).applyMatrix4(m0), power: 2.2 * k * R.length / 25 + 1 });
    out.push({ z: cl.z, r: r * 1.2, y0 });
  }
  return out;
}

// A glowing conduit along these points: a glass tube with pulses running along it, held by brass clamps
function conduit(batch, pts, sys, q, S, r = 0.095) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), len = curve.getLength();
  const n = Math.max(4, Math.round(len * (q.level === 'full' ? 3 : 1)));
  const g = new THREE.TubeGeometry(curve, n, r, q.level === 'full' ? 7 : 4, false);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.6);
  batch.add('flow', g, null, { tag: sys });
  if (q.level !== 'full') return;
  const clamps = Math.floor(len / (r * 11.5));
  for (let i = 1; i < clamps; i++) {
    const t = i / clamps, p = curve.getPointAt(t), d = curve.getTangentAt(t);
    batch.add('brass', S.clamp(r * 1.25, r * 0.32), place(p, { dir: d }));
  }
}
export function conduits(hull, batch, R, q, S, furn) {
  if (q.level === 'far') return;
  const k = R.kit, lift = 0.09 * k, r = 0.095 * k, guns = R.ports || R.swivels?.length;
  for (const F of furn) {
    // to the nearest mast: along the deck, then up its foot
    const M = R.masts.reduce((a, b) => (Math.abs(b.z - F.z) < Math.abs(a.z - F.z) ? b : a));
    const my = hull.deckY(M.z), dz = Math.sign(M.z - F.z) || 1, x0 = 0.55 * k;
    conduit(batch, [V(x0, F.y0 + 0.35 * k, F.z + dz * F.r * 0.6), V(x0, F.y0 + lift, F.z + dz * (F.r + 0.4 * k)), V(x0, my + lift, M.z - dz * 1.4 * k),
      V(0.36 * k, my + 0.5 * k, M.z - dz * 0.3 * k), V(0.3 * k, my + 1.3 * k, M.z - dz * 0.24 * k)], 0, q, S, r);
    // out to each side, for the guns
    if (guns) for (const s of [1, -1]) {
      const x1 = s * (hull.deckHalf(F.z) - 0.55 * k);
      conduit(batch, [V(s * F.r * 0.7, F.y0 + 0.3 * k, F.z), V(s * (F.r + 0.4 * k), F.y0 + lift, F.z), V(x1, F.y0 + lift, F.z)], 1, q, S, r);
    }
    // down through the deck, to the lift vents
    const xl = -0.4 * k;
    conduit(batch, [V(xl, F.y0 + 0.5 * k, F.z - dz * F.r * 0.75), V(xl, F.y0 + lift, F.z - dz * (F.r + 0.3 * k)), V(xl, F.y0 + lift, F.z - dz * (F.r + 0.9 * k)), V(xl, F.y0 - 0.3 * k, F.z - dz * (F.r + 1.0 * k))], 2, q, S, r);
    batch.add('brass', S.ring(0.16 * k, 0.05 * k), place([xl, F.y0 + 0.02, F.z - dz * (F.r + 1.0 * k)]));
  }
  // the gun mains: along each side of the waist, inside the rail, the length of the gun deck
  if (!guns) return;
  const z0 = (R.quarterdeck?.front ?? hull.zs + 1.2 * k) + 0.5 * k, z1 = (R.forecastle?.back ?? hull.zb - 1.5 * k) - 0.4 * k;
  for (const s of [1, -1]) {
    const pts = [], n = Math.max(3, Math.round((z1 - z0) / 1.2));
    for (let i = 0; i <= n; i++) { const z = lerp(z0, z1, i / n); pts.push(V(s * (hull.deckHalf(z) - 0.55 * k), hull.deckY(z) + lift, z)); }
    conduit(batch, pts, 1, q, S, r * 1.05);
  }
}
