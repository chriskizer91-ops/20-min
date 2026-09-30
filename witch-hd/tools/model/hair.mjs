// Her hair: long, wavy and full, falling to the middle of her back, in warm brown with caramel lights.
//   - a scalp cap with fine grooves, so she has hair even without the hat
//   - pointed, side-swept bangs over her forehead
//   - locks framing her face that fall in front of her shoulders
//   - the mane: a few hundred wavy locks in three layers, draped over her shoulders and the shawl, each made of a
//     main clump and thinner strands around it
// Locks near the scalp move with the head; below, they hang from chains of hair bones that sway.
import * as THREE from 'three';
import { Geo, surface, tube, spline, smooth, clamp, lerp, rng, noise3 } from '../lib/geo.mjs';
import { headSDF, headRadius, HC } from './head.mjs';
import { torsoPoint } from './body.mjs';
import { HAT_ORIGIN } from './hat.mjs';

const C0 = new THREE.Vector3(0, 0.02, -0.01); // cranium center, head-local

// ---------------------------------------------------------------- the hairline
// Head-local direction -> is it scalp? Returns the height of the hairline for an azimuth (0 = front).
export function hairlineY(psi) {
  const a = Math.abs(psi);
  // front forehead -> temples -> in front of the ear -> behind the ear -> nape
  const keys = [[0, 0.06], [0.5, 0.05], [0.9, 0.022], [1.25, -0.01], [1.45, -0.03], [1.75, -0.02], [2.2, -0.075], [Math.PI, -0.1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a0, y0] = keys[i], [a1, y1] = keys[i + 1];
    if (a <= a1) { const t = smooth(0, 1, (a - a0) / (a1 - a0)); return lerp(y0, y1, t); }
  }
  return -0.1;
}

// ---------------------------------------------------------------- collision with her body (world space)
const tmp = new THREE.Vector3();
function pushOut(p, margin = 0.006) {
  // Head: step out along the SDF gradient
  const q = tmp.copy(p).sub(HC);
  for (let k = 0; k < 4; k++) {
    const d = headSDF(q);
    if (d >= margin) break;
    const e = 0.001;
    const g = new THREE.Vector3(
      headSDF(q.clone().setX(q.x + e)) - headSDF(q.clone().setX(q.x - e)),
      headSDF(q.clone().setY(q.y + e)) - headSDF(q.clone().setY(q.y - e)),
      headSDF(q.clone().setZ(q.z + e)) - headSDF(q.clone().setZ(q.z - e)),
    ).normalize();
    q.addScaledVector(g, margin - d);
  }
  p.copy(q).add(HC);
  // Neck
  capsule(p, [0, 0.84, -0.014], [0, 1.0, -0.004], 0.052);
  // Shoulders (with the shawl over them) and upper arms
  for (const s of [1, -1]) {
    sphereOut(p, [s * 0.1, 0.835, -0.012], 0.068);
    capsule(p, [s * 0.105, 0.832, -0.012], [s * 0.175, 0.682, -0.006], 0.062);
  }
  // Torso plus the shawl: an inflated torso
  if (p.y > 0.45 && p.y < 0.9) {
    const a = Math.atan2(p.x, p.z);
    const s = torsoPoint(p.y, a, 0.036);
    const r = Math.hypot(s[0], s[2] + 0.0);
    const cz = torsoPoint(p.y, 0, 0)[2] * 0 ;
    const pr = Math.hypot(p.x, p.z - cz);
    if (pr < r) { const k = r / (pr || 1e-6); p.x *= k; p.z = cz + (p.z - cz) * k; }
  }
}
function sphereOut(p, c, r) {
  const d = tmp.set(p.x - c[0], p.y - c[1], p.z - c[2]);
  const l = d.length();
  if (l < r) p.set(c[0], c[1], c[2]).addScaledVector(d.normalize(), r);
}
function capsule(p, a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const ab = B.clone().sub(A);
  const t = clamp(p.clone().sub(A).dot(ab) / ab.lengthSq());
  const c = A.addScaledVector(ab, t);
  const d = p.clone().sub(c);
  const l = d.length();
  if (l < r) p.copy(c).addScaledVector(d.normalize(), r);
}

// ---------------------------------------------------------------- a lock's path
// root: world point on the scalp; out: outward normal there. Grows down along the head, then falls, then waves.
function lockPath(root, out, { length, n = 44, spread = 0.2, wave = 0.018, wavelength = 0.11, phase = 0, curl = 0, sideDir = null, fall = null, hug = 0.03, lift = 0 }) {
  const pts = [root.clone()];
  const down = new THREE.Vector3(0, -1, 0);
  // Initial direction: down the scalp (tangent), leaning the way the hair is combed (sideDir)
  let dir = down.clone().sub(out.clone().multiplyScalar(down.dot(out))).normalize();
  if (sideDir) dir.addScaledVector(sideDir, 0.6).normalize();
  const step = length / n;
  const p = root.clone();
  for (let i = 1; i <= n; i++) {
    const s = i * step;
    const g = smooth(hug, hug + 0.12, s);
    const fallDir = (fall ?? down.clone().addScaledVector(out.clone().setY(0).normalize(), spread)).normalize();
    const tangent = dir.clone().sub(out.clone().multiplyScalar(dir.dot(out) - lift)).normalize();
    const target = tangent.lerp(fallDir, g).normalize();
    dir.lerp(target, 0.35).normalize();
    p.addScaledVector(dir, step);
    pushOut(p, 0.007 + 0.004 * smooth(0, 0.2, s));
    pts.push(p.clone());
  }
  // Waves: sideways and a little outward, growing along the lock
  const res = [];
  for (let i = 0; i < pts.length; i++) {
    const s = i * step;
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const o = pts[i].clone().sub(HC).setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(t, o).normalize();
    const amp = wave * smooth(0.04, 0.2, s);
    const w = Math.sin((s / wavelength) * Math.PI * 2 + phase);
    const q = pts[i].clone().addScaledVector(side, amp * w).addScaledVector(o, amp * 0.5 * Math.cos((s / wavelength) * Math.PI * 2 + phase));
    // A curl at the tip
    if (curl) {
      const k = smooth(0.7, 1, i / (pts.length - 1));
      q.addScaledVector(o, curl * k * k).addScaledVector(side, curl * 0.6 * k * k * Math.sign(w || 1));
    }
    pushOut(q, 0.006);
    res.push(q.toArray());
  }
  return res;
}

// A lock: an elliptical tube (wide across the hair's surface, thin outward), tapering to a point.
function lockGeo(pts, width, thick, { radial = 10, segs = null, taper = 0.8, twist = 0, up = null } = {}) {
  const P = segs ? spline(pts, segs) : pts;
  return tube(P, (t) => {
    const base = Math.pow(1 - t, taper) * (0.35 + 0.65 * smooth(0, 0.08, t)) + 0.02;
    const k = Math.min(1, base * 1.1);
    return [thick * k, width * k];
  }, { radial, up: up ?? [0, 0, 1], twist: twist ? (t) => t * twist : null });
}

export function buildHair(skel) {
  const R = rng(42);
  const nz = noise3(9);
  const parts = []; // {geo, kind: 'cap'|'bang'|'side'|'back', psi, tone}
  const localToWorld = (v) => v.clone().add(HC);

  // ---------------------------------------------------------------- scalp cap with grooves
  {
    const dir = new THREE.Vector3();
    const NU = 160, NV = 80;
    const cap = surface(NU, NV, (u, v) => {
      const psi = (u - 0.5) * Math.PI * 2; // 0 at the front
      const ph = v * Math.PI * 0.78;
      dir.set(Math.sin(ph) * Math.sin(psi), Math.cos(ph), Math.sin(ph) * Math.cos(psi));
      const r = headRadius(dir);
      const base = new THREE.Vector3(0, -0.02, 0.01).addScaledVector(dir, r);
      const hl = hairlineY(psi);
      const inside = smooth(hl - 0.012, hl + 0.01, base.y);
      const groove = 0.0012 * Math.pow(Math.abs(Math.sin(psi * 34 + nz(psi * 3, ph * 4, 0) * 2)), 0.5);
      const off = (0.0035 + groove) * inside + 0.0006 * inside;
      const q = base.addScaledVector(dir, off - 0.0012 * (1 - inside));
      return [q.x, q.y, q.z];
    }, { closeU: true });
    // Drop triangles that are fully outside the hairline (they sit under the skin)
    const keep = [];
    for (let i = 0; i < cap.idx.length; i += 3) {
      let ok = 0;
      for (let k = 0; k < 3; k++) {
        const v = cap.idx[i + k];
        const u = (v % cap.cols) / (cap.cols - 1);
        const y = cap.pos[v * 3 + 1];
        if (y > hairlineY((u - 0.5) * Math.PI * 2) - 0.012) ok++;
      }
      if (ok === 3) keep.push(cap.idx[i], cap.idx[i + 1], cap.idx[i + 2]);
    }
    cap.idx = keep;
    cap.move(HC.x, HC.y, HC.z);
    parts.push({ geo: cap, kind: 'cap' });
  }

  // Root on the scalp: azimuth psi (0 = front, +: her left), height y (head-local); returns world point + normal
  const rootAt = (psi, y, lift = 0.004) => {
    // find the elevation whose head point has this height
    let lo = 0.02, hi = Math.PI * 0.95;
    const d = new THREE.Vector3();
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      d.set(Math.sin(m) * Math.sin(psi), Math.cos(m), Math.sin(m) * Math.cos(psi));
      const yy = -0.02 + d.y * headRadius(d);
      if (yy > y) lo = m; else hi = m;
    }
    const r = headRadius(d);
    const p = new THREE.Vector3(0, -0.02, 0.01).addScaledVector(d, r + lift);
    const e = 0.001, q = p.clone();
    const n = new THREE.Vector3(
      headSDF(q.clone().setX(q.x + e)) - headSDF(q.clone().setX(q.x - e)),
      headSDF(q.clone().setY(q.y + e)) - headSDF(q.clone().setY(q.y - e)),
      headSDF(q.clone().setZ(q.z + e)) - headSDF(q.clone().setZ(q.z - e)),
    ).normalize();
    return { p: localToWorld(p), n };
  };

  // ---------------------------------------------------------------- the mane (back and sides), three layers
  // Hat band sits at about head-local y = 0.05..0.11 (tilted), so visible roots are around the band and below.
  const hatY = HAT_ORIGIN.y - HC.y;
  const layers = [
    { count: 58, y: [hatY + 0.02, hatY + 0.07], len: [0.5, 0.6], width: [0.026, 0.034], tone: 0.7, spread: 0.08 },
    { count: 72, y: [hatY - 0.01, hatY + 0.04], len: [0.44, 0.58], width: [0.024, 0.032], tone: 0.85, spread: 0.16 },
    { count: 64, y: [hatY - 0.04, hatY + 0.0], len: [0.34, 0.52], width: [0.02, 0.028], tone: 1.0, spread: 0.24 },
  ];
  // Neighbouring locks wave together: the phase drifts slowly around the head
  const wavePhase = (psi) => nz(psi * 2.2, 0, 0) * 5 + psi * 1.5;
  for (const [li, L] of layers.entries()) {
    for (let k = 0; k < L.count; k++) {
      // Spread around the back and sides (not the face): psi from 1.05 to pi on both sides
      const f = (k + R() * 0.8) / L.count;
      const psi = (f < 0.5 ? 1 : -1) * lerp(1.1, Math.PI, (f < 0.5 ? f * 2 : (f - 0.5) * 2)) ;
      const yLocal = lerp(L.y[0], L.y[1], R());
      const { p, n } = rootAt(psi, Math.max(yLocal, hairlineY(psi) + 0.005), 0.005 + li * 0.003);
      const back = Math.abs(psi) / Math.PI; // 1 at the very back
      // Longest at the middle of the back, so the ends make a soft V; some locks fall shorter
      const length = lerp(L.len[0], L.len[1], R()) * lerp(0.78, 1.06, back ** 2) * (R() < 0.2 ? 0.8 : 1);
      const width = lerp(L.width[0], L.width[1], R());
      const phase = wavePhase(psi) + (R() - 0.5) * 0.8;
      const wl = 0.15 + nz(psi * 1.3, 5, 0) * 0.03;
      const pts = lockPath(p, n, {
        length, spread: L.spread + R() * 0.08, wave: 0.018 + R() * 0.01, wavelength: wl, phase,
        curl: R() < 0.5 ? 0.014 * R() : 0, hug: 0.05 + li * 0.02,
      });
      parts.push({ geo: lockGeo(pts, width, width * 0.32, { segs: 30, radial: 8, taper: 0.7 }), kind: 'back', psi, tone: L.tone * (0.88 + R() * 0.24), layer: li });
      // Strands around the clump: thinner, following it loosely
      const strands = 2;
      for (let s = 0; s < strands; s++) {
        const off = new THREE.Vector3((R() - 0.5) * width * 1.4, (R() - 0.5) * 0.01, (R() - 0.5) * width * 0.6);
        const p2 = p.clone().add(off);
        const pts2 = lockPath(p2, n, {
          length: length * (0.8 + R() * 0.25), spread: L.spread + R() * 0.1, wave: 0.016 + R() * 0.012, wavelength: wl * (0.9 + R() * 0.2),
          phase: phase + (R() - 0.5) * 1.2, curl: R() < 0.5 ? 0.016 * R() : 0, hug: 0.05 + li * 0.02,
        });
        const w2 = width * (0.28 + R() * 0.22);
        parts.push({ geo: lockGeo(pts2, w2, w2 * 0.45, { segs: 26, radial: 4, taper: 0.9 }), kind: 'back', psi, tone: L.tone * (0.92 + R() * 0.3), layer: li });
      }
    }
  }

  // ---------------------------------------------------------------- locks framing her face
  for (const side of [1, -1]) {
    for (let k = 0; k < 5; k++) {
      const psi = side * (0.95 + k * 0.1 + R() * 0.04);
      const { p, n } = rootAt(psi, hatY + 0.025 + R() * 0.02, 0.006);
      const length = 0.34 + R() * 0.12 - k * 0.02;
      const fwd = new THREE.Vector3(side * 0.25, -1, 0.35 - k * 0.05).normalize();
      const pts = lockPath(p, n, { length, fall: fwd, wave: 0.018 + R() * 0.008, wavelength: 0.14 + R() * 0.03, phase: R() * 6, hug: 0.07, curl: 0.01 });
      const width = 0.018 + R() * 0.008;
      parts.push({ geo: lockGeo(pts, width, width * 0.35, { segs: 40, radial: 8, taper: 0.75 }), kind: 'side', side, psi, tone: 0.9 + R() * 0.2 });
      for (let s = 0; s < 3; s++) {
        const p2 = p.clone().add(new THREE.Vector3((R() - 0.5) * 0.012, 0, (R() - 0.5) * 0.012));
        const pts2 = lockPath(p2, n, { length: length * (0.7 + R() * 0.35), fall: fwd, wave: 0.016 + R() * 0.012, wavelength: 0.13 + R() * 0.04, phase: R() * 6, hug: 0.07, curl: 0.012 * R() });
        const w2 = width * (0.3 + R() * 0.2);
        parts.push({ geo: lockGeo(pts2, w2, w2 * 0.5, { segs: 28, radial: 5, taper: 0.9 }), kind: 'side', side, psi, tone: 0.95 + R() * 0.25 });
      }
    }
  }

  // ---------------------------------------------------------------- bangs: pointed clumps over the forehead
  // Parted a little to her left; the locks sweep outward from the part and end above the glasses.
  // An under-layer of wide, flat, darker locks fills the forehead; pointed clumps lie on top.
  const part = 0.12;
  const bangLayer = (count, { lift, width, endLift, tone, reach, thin }) => {
    for (let k = 0; k < count; k++) {
      const f = (k + 0.5) / count;
      const psi = lerp(-1.0, 1.0, f) + (R() - 0.5) * 0.05;
      const away = Math.sign(psi - part) || 1;
      const rootPsi = psi * 0.55 + part * 0.45;
      const rootY = hatY + 0.055 + 0.01 * Math.cos(psi * 2);
      const root = rootAt(rootPsi, rootY, lift);
      const endPsi = psi + away * 0.1;
      const centre = 1 - Math.abs(psi) / 1.0;
      let endY = lerp(0.034, reach, centre) + (R() - 0.5) * 0.01;
      if (Math.abs(psi) > 0.7) endY -= 0.05 * (Math.abs(psi) - 0.7) / 0.3; // the outer ones sweep down past the temples
      const end = rootAt(endPsi, endY, endLift);
      const mid = rootAt(lerp(rootPsi, endPsi, 0.5), lerp(rootY, endY, 0.45), (lift + endLift) / 2 + 0.003);
      const pts = spline([root.p, mid.p, end.p].map((v) => v.toArray()), 30);
      const w = width * (0.85 + R() * 0.3);
      parts.push({ geo: lockGeo(pts, w, w * thin, { radial: 10, taper: 1.0, up: root.n.toArray() }), kind: 'bang', tone: tone * (0.92 + R() * 0.16) });
    }
  };
  bangLayer(14, { lift: 0.004, width: 0.036, endLift: 0.004, tone: 0.72, reach: 0.028, thin: 0.22 });
  bangLayer(21, { lift: 0.007, width: 0.028, endLift: 0.008, tone: 1.0, reach: 0.016, thin: 0.3 });
  // A few fine wisps
  for (let k = 0; k < 10; k++) {
    const psi = lerp(-0.8, 0.8, R());
    const away = Math.sign(psi - part) || 1;
    const root = rootAt(psi * 0.55 + part * 0.45, hatY + 0.055, 0.009);
    const end = rootAt(psi + away * 0.14, 0.02 + R() * 0.015, 0.009);
    const mid = rootAt(psi * 0.8 + away * 0.05, (hatY + 0.055 + 0.02) / 2, 0.012);
    const pts = spline([root.p, mid.p, end.p].map((v) => v.toArray()), 24);
    parts.push({ geo: lockGeo(pts, 0.006, 0.0025, { radial: 6, taper: 1.2, up: root.n.toArray() }), kind: 'bang', tone: 1.05 });
  }
  return parts;
}

// ---------------------------------------------------------------- bones and weights
// Back chains fan across her back; side chains hang in front of her shoulders.
export const BACK_CHAINS = [-2, -1, 0, 1, 2].map((k) => Math.PI + k * 0.5);
export function addHairBones(skel) {
  const chains = [];
  const y0 = HC.y - 0.06;
  BACK_CHAINS.forEach((psi, i) => {
    const name = `hair_back${i}`;
    let parent = 'head';
    const bones = [];
    for (let j = 0; j < 4; j++) {
      const y = y0 - j * 0.1;
      // Out over the shawl: the lower bones sit further back
      const r = lerp(0.12, 0.13, j / 3);
      const p = [Math.sin(psi) * r * (1 + 0.25 * (j / 3)), y, -0.012 + Math.cos(psi) * r];
      skel.add(`${name}_${j}`, parent, p);
      parent = `${name}_${j}`;
      bones.push(`${name}_${j}`);
    }
    chains.push({ psi, bones });
  });
  for (const side of [1, -1]) {
    const S = side > 0 ? 'L' : 'R';
    let parent = 'head';
    for (let j = 0; j < 3; j++) {
      const y = HC.y - 0.05 - j * 0.1;
      skel.add(`hair_side_${S}_${j}`, parent, [side * (0.13 + j * 0.01), y, 0.05 - j * 0.01]);
      parent = `hair_side_${S}_${j}`;
    }
  }
  return chains;
}

export function hairWeights(skel) {
  const backY = [0, 1, 2, 3].map((j) => skel.get(`hair_back0_${j}`).rest.y);
  const sideY = [0, 1, 2].map((j) => skel.get(`hair_side_L_${j}`).rest.y);
  const alongHeight = (y, ys) => {
    // returns [[index, weight], ...] across bones by height (bone j covers from its y downward)
    if (y >= ys[0]) return [[0, 1]];
    for (let j = 0; j < ys.length - 1; j++) {
      if (y >= ys[j + 1]) { const t = (ys[j] - y) / (ys[j] - ys[j + 1]); return [[j, 1 - t], [j + 1, t]]; }
    }
    return [[ys.length - 1, 1]];
  };
  return (p, i, geo, part) => {
    const headW = smooth(HC.y - 0.1, HC.y - 0.03, p.y);
    if (part.kind === 'cap' || part.kind === 'bang') return [['head', 1]];
    const w = [['head', headW]];
    const rest = 1 - headW;
    if (rest <= 0) return w;
    if (part.kind === 'side') {
      const S = part.side > 0 ? 'L' : 'R';
      for (const [j, x] of alongHeight(p.y, sideY)) w.push([`hair_side_${S}_${j}`, x * rest]);
      return w;
    }
    // back: blend the two nearest chains by the lock's root angle
    let psi = part.psi < 0 ? part.psi + Math.PI * 2 : part.psi; // 0..2pi, back = pi
    const idx = (psi - BACK_CHAINS[0]) / 0.5;
    const k0 = clamp(Math.floor(idx), 0, BACK_CHAINS.length - 2);
    const f = clamp(idx - k0, 0, 1);
    for (const [kk, kw] of [[k0, 1 - f], [k0 + 1, f]]) {
      if (kw <= 0) continue;
      for (const [j, x] of alongHeight(p.y, backY)) w.push([`hair_back${kk}_${j}`, kw * x * rest]);
    }
    return w;
  };
}

// Root-to-tip shading: dark at the scalp, warm in the middle, lighter at the ends.
export function hairColor(part) {
  return (p, n, i, geo) => {
    const t = geo.extra?.t?.[i] ?? 0.5;
    const tone = part.tone ?? 1;
    if (part.kind === 'cap') return [0.5, 0.47, 0.45];
    const root = smooth(0, 0.18, t);
    const k = lerp(0.48, 0.82, root) * tone * (1 + 0.12 * smooth(0.55, 1, t));
    // the underside of each lock is a little darker
    return [clamp(k), clamp(k * 0.97), clamp(k * 0.94)];
  };
}
