// The hat: a tall plum felt hat whose crown crumples and flops back over her right shoulder, a wide wavy brim
// with a rolled edge, a dark band trimmed in gold, cream ram horns curling at both sides, the gold sigil of
// Witch Way on the front, and a chain of charms draped across the band.
import * as THREE from 'three';
import { Geo, surface, cloth, tube, torus, spline, sphere, smooth, lerp, noise3 } from '../lib/geo.mjs';
import { chain, cross, star, crescent, placeFacing } from './jewelry.mjs';
import { chainWeights } from '../lib/rig.mjs';

// The hat's own frame: the bottom of the band, tipped back a little on her head
export const HAT_ORIGIN = new THREE.Vector3(0, 1.148, -0.016);
export const HAT_TILT = new THREE.Euler(-0.23, 0, 0.05);
const M = new THREE.Matrix4().compose(HAT_ORIGIN, new THREE.Quaternion().setFromEuler(HAT_TILT), new THREE.Vector3(1, 1, 1));
const toWorld = (p) => new THREE.Vector3(...p).applyMatrix4(M);

const BAND_R = 0.153, BAND_H = 0.062, BRIM_R = 0.33;
// The crown's spine, in hat space: up, then a crumpled bend, and the tip flopping back and to her right
const SPINE = [[0, BAND_H - 0.01, 0], [0, 0.18, -0.004], [-0.006, 0.3, -0.022], [-0.032, 0.39, -0.065], [-0.08, 0.425, -0.105], [-0.135, 0.405, -0.14], [-0.175, 0.35, -0.155]];

export function addHatBones(skel) {
  skel.add('hat', 'head', HAT_ORIGIN.toArray());
  const pts = spline(SPINE, 60);
  // Four crown bones along the spine
  const marks = [0.12, 0.38, 0.6, 0.8];
  let parent = 'hat';
  const curve = new THREE.CatmullRomCurve3(SPINE.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  marks.forEach((m, i) => {
    const p = toWorld(curve.getPointAt(m).toArray());
    skel.add(`hat_crown${i + 1}`, parent, p.toArray());
    parent = `hat_crown${i + 1}`;
  });
  skel.get(parent).tipEnd = toWorld(curve.getPointAt(1).toArray());
  return pts;
}

export function buildHat(skel) {
  const parts = []; // { geo, mat, weights|bone }
  const nz = noise3(3);

  // ---------------------------------------------------------------- brim: felt with thickness, wavy and drooping
  const brimAt = (u, v) => {
    const a = u * Math.PI * 2;
    const r = lerp(BAND_R - 0.004, BRIM_R, v);
    const edge = v * v;
    const wave = Math.sin(a * 5 + 0.7) * 0.009 * edge + Math.sin(a * 3 - 0.4) * 0.006 * edge + nz(Math.cos(a) * 3, Math.sin(a) * 3, 0) * 0.008 * edge;
    // droops more at the back and sides, lifts a touch at the front
    const front = Math.cos(a);
    const droop = -0.045 * edge + 0.026 * Math.max(0, front) * edge;
    const rr = r * (1 + 0.02 * Math.sin(a * 2));
    return [Math.sin(a) * rr, droop + wave, Math.cos(a) * rr];
  };
  const brim = cloth(240, 26, brimAt, (u, v) => lerp(0.007, 0.004, v), { closeU: true, uv: (u, v) => [u, v * 0.3] });
  parts.push({ geo: brim, mat: 'felt', part: 'brim' });
  // A rolled, stitched edge
  const edge = [];
  for (let i = 0; i <= 240; i++) edge.push(brimAt(i / 240, 1));
  parts.push({ geo: tube(edge, 0.0042, { radial: 10, caps: false }), mat: 'felt', part: 'brim' });
  // Gold running stitch just inside the edge
  const stitches = [];
  for (let i = 0; i < 150; i++) {
    const a0 = i / 150, a1 = a0 + 0.004;
    const p0 = brimAt(a0, 0.93), p1 = brimAt(a1, 0.93);
    p0[1] += 0.0042; p1[1] += 0.0042;
    stitches.push(tube([p0, p1], 0.0011, { radial: 6 }));
  }
  parts.push({ geo: Geo.merge(stitches), mat: 'gold', part: 'brim' });

  // ---------------------------------------------------------------- band, with gold piping
  const band = surface(160, 8, (u, v) => {
    const a = u * Math.PI * 2;
    const r = lerp(BAND_R + 0.003, BAND_R - 0.004, v);
    return [Math.sin(a) * r, v * BAND_H, Math.cos(a) * r];
  }, { closeU: true }).orientOut((p) => [0, p[1], 0]);
  parts.push({ geo: band, mat: 'band', part: 'band' });
  for (const [y, r] of [[0.004, BAND_R + 0.003], [BAND_H - 0.003, BAND_R - 0.004]]) {
    const pipe = torus(r, 0.0022, 160, 8);
    pipe.move(0, y, 0);
    parts.push({ geo: pipe, mat: 'gold', part: 'band' });
  }

  // ---------------------------------------------------------------- crown: a felt cone along the spine, crumpled at the bend
  const spine = spline(SPINE, 140);
  const crown = tube(spine, (t, a) => {
    let r = (BAND_R - 0.006) * Math.pow(1 - t, 0.82);
    r *= 1 + 0.06 * Math.sin(t * Math.PI) ; // a slight belly
    const ang = a * Math.PI * 2;
    // Creases: folds that run around the bend
    const bend = Math.exp(-(((t - 0.5) / 0.14) ** 2));
    r *= 1 + bend * (0.07 * Math.sin(ang * 3 + t * 20) + 0.04 * Math.sin(ang * 7 - t * 30));
    r *= 1 + 0.025 * nz(Math.cos(ang) * 2, t * 6, Math.sin(ang) * 2);
    return Math.max(r, 0.0015);
  }, { radial: 80, caps: false, capEnd: true, up: [0, 0, 1], uvScale: [1, 2] });
  parts.push({ geo: crown, mat: 'felt', part: 'crown' });

  // ---------------------------------------------------------------- ram horns, cream with ridges, one each side
  // A tapering spiral: from the band it rises, curls out and down, and the tip winds in and forward.
  for (const side of [1, -1]) {
    const pts = [];
    const turns = 1.45;
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const th = t * turns * Math.PI * 2;
      const phi = Math.PI * 0.92 - th;
      const R = 0.043 * Math.pow(1 - 0.72 * t, 1.1);
      const cx = BAND_R + 0.028, cy = 0.05;
      pts.push([side * (cx + Math.cos(phi) * R), cy + Math.sin(phi) * R, 0.004 + 0.042 * t * t]);
    }
    const horn = tube(pts, (t, a) => {
      const r = lerp(0.0175, 0.0028, Math.pow(t, 0.7));
      const ridge = 1 + 0.09 * Math.pow(Math.max(0, Math.sin(t * 110)), 4);
      return r * ridge;
    }, { radial: 20, up: [0, 0, 1] });
    horn.tag({ side });
    parts.push({ geo: horn, mat: 'horn', part: 'horn' });
  }

  // ---------------------------------------------------------------- the sigil: a ring on a staff, like a key
  const front = BAND_R + 0.006;
  const sig = [];
  const ring = torus(0.022, 0.0036, 48, 10);
  ring.rotate(Math.PI / 2, 0, 0);
  ring.move(0, BAND_H * 0.5, front + 0.003);
  sig.push(ring);
  sig.push(tube([[0, -0.012, front + 0.004], [0, BAND_H + 0.06, front - 0.012]], 0.0032, { radial: 10 }));
  sig.push(tube([[-0.011, BAND_H + 0.035, front - 0.006], [0.011, BAND_H + 0.035, front - 0.006]], 0.0026, { radial: 8 }));
  sig.push(sphere(0.006, 16, 12).move(0, BAND_H + 0.064, front - 0.013));
  sig.push(sphere(0.0045, 14, 10).move(0, -0.015, front + 0.004));
  // key teeth at the bottom of the staff
  sig.push(tube([[0, -0.004, front + 0.005], [0.008, -0.004, front + 0.005]], 0.0022, { radial: 8 }));
  parts.push({ geo: Geo.merge(sig), mat: 'gold', part: 'band' });

  // ---------------------------------------------------------------- the charm chain, and charms hanging from it
  const drape = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = lerp(-1.25, 1.25, t);
    const sag = Math.sin(t * Math.PI) * 0.018;
    drape.push([Math.sin(a) * (BAND_R + 0.008), BAND_H * 0.62 - sag, Math.cos(a) * (BAND_R + 0.008)]);
  }
  parts.push({ geo: chain(drape, { link: 0.0075, wire: 0.00095, detail: [10, 5] }), mat: 'gold', part: 'band' });
  const charms = [];
  const kinds = [cross, crescent, star, cross, star, crescent, cross];
  const spots = [0.1, 0.24, 0.38, 0.62, 0.76, 0.9];
  spots.forEach((t, i) => {
    const k = Math.round(t * 24);
    const at = drape[k];
    const out = [at[0], 0, at[2]];
    const len = 0.01 + (i % 2) * 0.009;
    const hang = [at[0] * 1.02, at[1] - len, at[2] * 1.02];
    const kind = kinds[i];
    const size = kind === cross ? 0.011 : 0.012;
    const c = kind(size, 0.0024);
    placeFacing(c, hang, out);
    const link = chain([at, hang], { link: 0.0045, wire: 0.0006, detail: [10, 5] });
    charms.push({ geo: Geo.merge([c, link]), pivot: at, mat: kind === crescent ? 'silver' : 'gold', index: i });
  });

  // ---------------------------------------------------------------- into world space
  for (const p of parts) p.geo.apply(M);
  for (const c of charms) { c.geo.apply(M); c.pivotWorld = toWorld(c.pivot); }
  return { parts, charms };
}

export function addCharmBones(skel, charms) {
  for (const c of charms) skel.add(`hat_charm${c.index}`, 'hat', c.pivotWorld.toArray());
}

// Crown weights: the band holds the base; up the spine it hands over to each crown bone in turn.
export function crownWeights(skel) {
  const names = ['hat_crown1', 'hat_crown2', 'hat_crown3', 'hat_crown4'];
  const tip = skel.get('hat_crown4').tipEnd;
  const base = skel.get('hat').rest;
  return (p) => {
    const w = chainWeights(skel, names, tip, p, 0.05);
    // Near the band, stay with the hat
    const d = p.clone().sub(base).applyQuaternion(new THREE.Quaternion().setFromEuler(HAT_TILT).invert()).y;
    const k = smooth(0.1, 0.2, d);
    for (const e of w) e[1] *= k;
    w.push(['hat', 1 - k]);
    return w;
  };
}
