// The shawl: magenta wool stitched in gold, the Moonlight Witch's signature. It is a cape (a collar over the
// shoulders, two front panels framing the bodice, and a long back falling to tattered points) plus two wide bell
// sleeves over her arms. Each sleeve trails a long, pointed drape that hangs from its own bones, so when she lifts
// her arms the drapes fall like wings.
import * as THREE from 'three';
import { Geo, cloth, frames, spline, smooth, clamp, lerp, rng, noise3 } from '../lib/geo.mjs';
import { torsoPoint, armPoints } from './body.mjs';
import { ARM_ANGLE } from './skeleton.mjs';
import { skirtRadius } from './clothes.mjs';
import { chainWeights } from '../lib/rig.mjs';

const nz = noise3(23);
const NECK = new THREE.Vector3(0, 0.884, -0.012);

// ---------------------------------------------------------------- the cape's shape: a convex hull around the body
function hull2d(points) {
  const P = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of P) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of P.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const hullCache = new Map();
function hullAt(y, skel) {
  const key = Math.round(y * 2000);
  if (hullCache.has(key)) return hullCache.get(key);
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const p = torsoPoint(clamp(y, 0.5, 0.884), a, 0.014);
    pts.push([p[0], p[2]]);
  }
  // Over the skirt, which flares out below the waist (plus its folds)
  if (y < 0.648) {
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r = skirtRadius(y, a, 0.648) + 0.016 + 0.012 * smooth(0.62, 0.45, y);
      pts.push([Math.sin(a) * r, Math.cos(a) * r]);
    }
  }
  // Shoulders and the tops of the arms
  for (const side of [1, -1]) {
    const { sh, el } = armPoints(skel, side);
    const add = (cx, cz, r) => { for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
    const dy = y - sh.y;
    if (Math.abs(dy) < 0.06) add(sh.x - side * 0.01, sh.z, Math.sqrt(0.06 * 0.06 - dy * dy) + 0.004);
    if (y < sh.y && y > el.y + 0.04) {
      const t = (sh.y - y) / (sh.y - el.y);
      add(lerp(sh.x, el.x, t), lerp(sh.z, el.z, t), 0.048 + 0.012 * smooth(0.02, 0.0, sh.y - y));
    }
  }
  const h = hull2d(pts);
  hullCache.set(key, h);
  return h;
}
// Distance from the body's axis to the hull in direction phi (0 = front, +pi/2 = her left)
function hullRadius(y, phi, skel) {
  const h = hullAt(y, skel);
  const cz = -0.01;
  const dx = Math.sin(phi), dz = Math.cos(phi);
  let best = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    // ray (0,cz) + t*(dx,dz) against segment a-b
    const ex = b[0] - a[0], ez = b[1] - a[1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - 0) * ez - (a[1] - cz) * ex) / den;
    const s = ((a[0] - 0) * dz - (a[1] - cz) * dx) / den;
    if (t > 0 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.max(best, t);
  }
  return best;
}

// The front opening: how far round from the front each front edge sits, by height
const frontEdge = (y) => lerp(0.62, 0.3, smooth(0.5, 0.884, y)) + 0.08 * smooth(0.75, 0.6, y);

// The hem's height around the cape (phi from the left front edge round the back)
function capeHem(phi, R) {
  const a = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi))); // 0 front .. pi back
  const front = 0.47, side = 0.742, back = 0.37;
  let y;
  if (a < 1.05) y = lerp(front, side, smooth(0.8, 1.05, a));
  else if (a < 1.95) y = side;
  else y = lerp(side, back, smooth(1.95, 2.35, a));
  return y;
}

export function buildShawl(skel) {
  const parts = [];
  const R = rng(31);
  // ---------------------------------------------------------------- cape
  const NU = 220, NV = 44;
  const tatters = Array.from({ length: 40 }, () => R());
  const hemAt = (phi) => {
    const base = capeHem(phi, R);
    const a = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi)));
    if (a > 1.0 && a < 2.0) return base; // the short sides stay straight (the sleeves take over)
    // Tattered points
    const x = (phi / (Math.PI * 2)) * 26;
    const f = x - Math.floor(x);
    const tri = 1 - Math.abs(f - 0.5) * 2;
    const depth = 0.03 + 0.04 * tatters[((Math.floor(x) % 40) + 40) % 40];
    return base - depth * Math.pow(tri, 1.5) + 0.02;
  };
  const capeAt = (u, v, off = 0) => {
    const ytop = NECK.y;
    // phi runs from the left front edge round the back to the right front edge; the edge moves with height
    const yGuess = lerp(ytop, 0.5, v);
    const fe = frontEdge(yGuess);
    const phi = fe + u * (Math.PI * 2 - 2 * fe);
    const hem = hemAt(phi);
    const y = lerp(ytop, hem, v);
    const collar = smooth(0, 0.14, v);
    const rNeck = 0.05;
    let r = lerp(rNeck, hullRadius(y, phi, skel), collar);
    // Folds: deeper as it falls, deepest at the back
    const drop = ytop - y;
    const back = smooth(1.2, 2.4, Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi))));
    const amp = (0.006 + 0.01 * back) * smooth(0.05, 0.3, drop);
    r += amp * Math.sin(phi * 16 + nz(Math.cos(phi) * 2, drop * 3, 0) * 2);
    r += 0.008 * smooth(0.1, 0.4, drop) * nz(Math.cos(phi) * 3, Math.sin(phi) * 3, drop * 4);
    // Hang a little away from the body as it falls, and lift the front panels off the chest
    r += 0.01 * smooth(0.1, 0.35, drop) + off;
    return [Math.sin(phi) * r, y, -0.01 + Math.cos(phi) * r];
  };
  const cape = cloth(NU, NV, (u, v) => capeAt(u, v), 0.0045, { uv: (u, v) => [u, v] });
  parts.push({ geo: cape, what: 'cape' });

  // ---------------------------------------------------------------- bell sleeves with hanging drapes
  for (const side of [1, -1]) {
    const S = side > 0 ? 'L' : 'R';
    const { sh, el, wr } = armPoints(skel, side);
    const d = wr.clone().sub(el).normalize();
    const start = sh.clone().add(new THREE.Vector3(-side * 0.03, 0.03, 0));
    const end = wr.clone().addScaledVector(d, 0.004);
    const axis = spline([start.toArray(), sh.toArray(), el.toArray(), end.toArray()], 60);
    const F = frames(axis, [0, 0, 1]);
    const n = axis.length - 1;
    const sleeveAt = (u, v, extra = 0) => {
      const k = Math.min(n, Math.round(v * n));
      const a = u * Math.PI * 2;
      // bell: snug at the shoulder, wide at the wrist; a little droop on the underside
      let r = lerp(0.056, 0.074, smooth(0.25, 1, v)) + extra;
      r *= 1 + 0.06 * Math.sin(a * 5 + v * 4) * smooth(0.3, 1, v);
      const off = F.N[k].clone().multiplyScalar(Math.cos(a) * r).add(F.B[k].clone().multiplyScalar(Math.sin(a) * r));
      return F.P[k].clone().add(off);
    };
    const sleeve = cloth(72, 44, (u, v) => sleeveAt(u, v).toArray(), 0.004, { closeU: true, uv: (u, v) => [u * 0.5, 0.3 + v * 0.58] });
    sleeve.tag({ side });
    parts.push({ geo: sleeve, what: 'sleeve', side });

    // The drape: attached along the back-outer side of the sleeve, hanging straight down to tattered points
    const out = new THREE.Vector3(Math.cos(ARM_ANGLE) * side, Math.sin(ARM_ANGLE), 0);
    const attachDir = out.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0, -0.85)).normalize();
    // Which u on the sleeve points that way (at the wrist frame)
    let bestU = 0, bestDot = -2;
    for (let i = 0; i < 360; i++) {
      const u = i / 360, a = u * Math.PI * 2;
      const dir = F.N[n].clone().multiplyScalar(Math.cos(a)).add(F.B[n].clone().multiplyScalar(Math.sin(a)));
      if (dir.dot(attachDir) > bestDot) { bestDot = dir.dot(attachDir); bestU = u; }
    }
    const tat = Array.from({ length: 12 }, () => R());
    const drapeLen = (a) => {
      const x = a * 4.5;
      const f = x - Math.floor(x);
      const tri = 1 - Math.abs(f - 0.5) * 2;
      return lerp(0.05, 0.2, a) + 0.05 * Math.pow(tri, 1.5) * (0.6 + 0.8 * tat[Math.floor(x) % 12]);
    };
    const A0 = 0.35;
    const drapeAt = (a, b) => {
      const v = lerp(A0, 1, a);
      // Spread the attach line a little around the sleeve
      const u = bestU + (a - 0.5) * 0.08 * side;
      const top = sleeveAt(u, v, 0.002);
      const L = drapeLen(a);
      const p = top.clone();
      p.y -= L * b;
      p.addScaledVector(out, 0.03 * Math.sin(b * Math.PI * 0.7) + 0.01 * b);
      p.z -= 0.012 * b;
      p.addScaledVector(out, 0.008 * Math.sin(a * 14 + b * 3) * b);
      return p.toArray();
    };
    const drape = cloth(70, 22, drapeAt, 0.0038, { uv: (a, b) => [0.5 + a * 0.25, 0.45 + b * 0.55] });
    drape.tag({ side });
    parts.push({ geo: drape, what: 'drape', side, drapeAt, A0 });
  }
  return parts;
}

// ---------------------------------------------------------------- bones
export const CAPE_BACK = [Math.PI - 0.75, Math.PI, Math.PI + 0.75];
export function addShawlBones(skel) {
  CAPE_BACK.forEach((phi, k) => {
    let parent = 'chest';
    for (const [j, y] of [0.74, 0.55].entries()) {
      const r = [0.125, 0.19][j];
      skel.add(`cape_back${k}_${j}`, parent, [Math.sin(phi) * r, y, -0.01 + Math.cos(phi) * r]);
      parent = `cape_back${k}_${j}`;
    }
  });
  for (const side of [1, -1]) {
    const S = side > 0 ? 'L' : 'R';
    let parent = 'chest';
    for (const [j, y] of [0.73, 0.6].entries()) {
      const phi = side * 0.75;
      const r = [0.11, 0.155][j];
      skel.add(`cape_front_${S}_${j}`, parent, [Math.sin(phi) * r, y, -0.01 + Math.cos(phi) * r]);
      parent = `cape_front_${S}_${j}`;
    }
  }
}
// Drape bones sit along each sleeve's attach line (made after the shawl is built)
export function addDrapeBones(skel, parts) {
  for (const p of parts.filter((q) => q.what === 'drape')) {
    const S = p.side > 0 ? 'L' : 'R';
    [0.15, 0.55, 0.92].forEach((a, i) => {
      const top = new THREE.Vector3(...p.drapeAt(a, 0));
      const parent = a < 0.35 ? `upperarm_${S}` : `forearm_${S}`;
      skel.add(`drape_${S}_${i}`, parent, top.toArray());
    });
  }
}

// ---------------------------------------------------------------- weights
export function shawlWeights(skel, part) {
  if (part.what === 'cape') {
    return (p, i, geo) => {
      const u = geo.extra.u[i], v = geo.extra.v[i];
      const phi = Math.atan2(p.x, p.z + 0.01);
      const a = Math.abs(phi);
      const side = p.x > 0 ? 'L' : 'R';
      const w = [];
      // The collar and shoulders: chest, leaning onto the arms over the shoulders
      const top = smooth(0.8, 0.84, p.y);
      const sh = smooth(0.06, 0.14, Math.abs(p.x)) * smooth(0.72, 0.8, p.y) * smooth(0.6, 1.2, a) * smooth(2.5, 1.9, a);
      const bodyW = 1 - sh;
      if (sh > 0) { w.push([`upperarm_${side}`, sh * 0.8], [`clavicle_${side}`, sh * 0.2]); }
      if (top > 0) w.push(['chest', top * bodyW]);
      const low = (1 - top) * bodyW;
      if (low <= 0) return w;
      // Panels: back chains or front chains, interpolated by angle and height
      const byHeight = (y, ys) => {
        if (y >= ys[0]) return [[-1, (y - ys[0]) / (0.84 - ys[0])], [0, 1 - (y - ys[0]) / (0.84 - ys[0])]];
        if (y >= ys[1]) { const t = (ys[0] - y) / (ys[0] - ys[1]); return [[0, 1 - t], [1, t]]; }
        return [[1, 1]];
      };
      if (a > 1.3) {
        let ph = phi < 0 ? phi + Math.PI * 2 : phi;
        const f = clamp((ph - CAPE_BACK[0]) / 0.75, 0, 1.999);
        const k0 = Math.floor(f), t = f - k0;
        for (const [k, kw] of [[k0, 1 - t], [Math.min(2, k0 + 1), t]])
          for (const [j, x] of byHeight(p.y, [0.74, 0.55])) w.push([j < 0 ? 'chest' : `cape_back${k}_${j}`, low * kw * Math.max(0, x)]);
      } else {
        for (const [j, x] of byHeight(p.y, [0.73, 0.6])) w.push([j < 0 ? 'chest' : `cape_front_${side}_${j}`, low * Math.max(0, x)]);
      }
      return w;
    };
  }
  const S = part.side > 0 ? 'L' : 'R';
  const { wr } = armPoints(skel, part.side);
  const end = wr.clone().add(new THREE.Vector3(Math.sin(ARM_ANGLE) * part.side, -Math.cos(ARM_ANGLE), 0).multiplyScalar(0.1));
  const armW = (p) => {
    const w = chainWeights(skel, [`upperarm_${S}`, `forearm_${S}`], end, p, 0.035);
    // Top of the sleeve leans on the chest
    const sh = skel.get(`upperarm_${S}`).rest;
    const k = smooth(0.0, 0.04, (sh.x - p.x) * part.side + (p.y - sh.y) * 0.5);
    if (k > 0) { for (const e of w) e[1] *= 1 - k * 0.7; w.push(['chest', k * 0.7]); }
    return w;
  };
  if (part.what === 'sleeve') return armW;
  // drape: blend from the sleeve at the top to the nearest drape bones below
  const bones = [0, 1, 2].map((i) => skel.get(`drape_${S}_${i}`));
  return (p, i, geo) => {
    const a = geo.extra.u[i], b = geo.extra.v[i];
    const hang = smooth(0.0, 0.35, b);
    const w = armW(p).map(([n, x]) => [n, x * (1 - hang)]);
    const pos = [0.15, 0.55, 0.92];
    let k0 = 0;
    while (k0 < 1 && a > pos[k0 + 1]) k0++;
    const t = clamp((a - pos[k0]) / (pos[k0 + 1] - pos[k0]), 0, 1);
    w.push([bones[k0].name, hang * (1 - t)], [bones[k0 + 1].name, hang * t]);
    return w;
  };
}
