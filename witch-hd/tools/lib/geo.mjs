// Geometry built from parametric surfaces and swept tubes. A Geo is plain arrays: positions, normals, uvs and
// triangle indices, plus an optional per-vertex "tag" array that parts use to steer skin weights and colors.
import * as THREE from 'three';

export class Geo {
  constructor(pos = [], nor = [], uv = [], idx = []) {
    this.pos = pos; this.nor = nor; this.uv = uv; this.idx = idx;
    this.extra = null; // optional per-vertex values (e.g. {t: [...], s: [...]}) for weights/colors
  }
  get count() { return this.pos.length / 3; }
  get tris() { return this.idx.length / 3; }

  static merge(list) {
    const g = new Geo();
    const extraKeys = list[0]?.extra ? Object.keys(list[0].extra) : null;
    if (extraKeys) g.extra = Object.fromEntries(extraKeys.map((k) => [k, []]));
    for (const s of list) {
      const base = g.count;
      push(g.pos, s.pos); push(g.nor, s.nor); push(g.uv, s.uv);
      for (const i of s.idx) g.idx.push(i + base);
      if (extraKeys) for (const k of extraKeys) push(g.extra[k], s.extra?.[k] ?? new Array(s.count).fill(0));
    }
    return g;
  }

  // Apply a THREE.Matrix4 (normals use its normal matrix).
  apply(m) {
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const flip = m.determinant() < 0;
    for (let i = 0; i < this.pos.length; i += 3) {
      v.set(this.pos[i], this.pos[i + 1], this.pos[i + 2]).applyMatrix4(m);
      this.pos[i] = v.x; this.pos[i + 1] = v.y; this.pos[i + 2] = v.z;
      n.set(this.nor[i], this.nor[i + 1], this.nor[i + 2]).applyMatrix3(nm).normalize();
      this.nor[i] = n.x; this.nor[i + 1] = n.y; this.nor[i + 2] = n.z;
    }
    if (flip) for (let i = 0; i < this.idx.length; i += 3) { const t = this.idx[i + 1]; this.idx[i + 1] = this.idx[i + 2]; this.idx[i + 2] = t; }
    return this;
  }

  // Convenience transforms
  move(x, y, z) { return this.apply(new THREE.Matrix4().makeTranslation(x, y, z)); }
  scale(x, y = x, z = x) { return this.apply(new THREE.Matrix4().makeScale(x, y, z)); }
  rotate(x, y, z, order = 'XYZ') { return this.apply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z, order))); }
  place(pos, quat, scale = [1, 1, 1]) {
    return this.apply(new THREE.Matrix4().compose(new THREE.Vector3(...pos), quat, new THREE.Vector3(...scale)));
  }
  mirrorX() { return this.apply(new THREE.Matrix4().makeScale(-1, 1, 1)); }
  clone() {
    const g = new Geo([...this.pos], [...this.nor], [...this.uv], [...this.idx]);
    if (this.extra) g.extra = Object.fromEntries(Object.entries(this.extra).map(([k, a]) => [k, [...a]]));
    return g;
  }
  // Deform every vertex: fn(p: Vector3, i) mutates p. Normals are recomputed afterwards.
  deform(fn, recompute = true) {
    const p = new THREE.Vector3();
    for (let i = 0; i < this.count; i++) {
      p.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      fn(p, i);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    }
    if (recompute) this.computeNormals();
    return this;
  }
  // Smooth normals from faces (area weighted), merging vertices that share a position.
  computeNormals(weld = true) {
    const n = new Float32Array(this.pos.length);
    const P = this.pos;
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3, b = this.idx[i + 1] * 3, c = this.idx[i + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
    }
    if (weld) {
      const map = new Map();
      const key = (i) => `${Math.round(P[i] * 1e5)},${Math.round(P[i + 1] * 1e5)},${Math.round(P[i + 2] * 1e5)}`;
      for (let i = 0; i < P.length; i += 3) {
        const k = key(i);
        const s = map.get(k);
        if (s) { s.push(i); } else map.set(k, [i]);
      }
      for (const list of map.values()) {
        if (list.length < 2) continue;
        let x = 0, y = 0, z = 0;
        for (const i of list) { x += n[i]; y += n[i + 1]; z += n[i + 2]; }
        for (const i of list) { n[i] = x; n[i + 1] = y; n[i + 2] = z; }
      }
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      this.nor[i] = n[i] / l; this.nor[i + 1] = n[i + 1] / l; this.nor[i + 2] = n[i + 2] / l;
    }
    this.nor.length = n.length;
    return this;
  }
  flip() {
    for (let i = 0; i < this.idx.length; i += 3) { const t = this.idx[i + 1]; this.idx[i + 1] = this.idx[i + 2]; this.idx[i + 2] = t; }
    for (let i = 0; i < this.nor.length; i++) this.nor[i] = -this.nor[i];
    return this;
  }
  // Make the surface face away from a point or an axis: center(p) -> the point it should face away from
  orientOut(center = () => [0, 0, 0]) {
    let dot = 0;
    for (let i = 0; i < this.count; i++) {
      const p = [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
      const c = center(p);
      dot += (p[0] - c[0]) * this.nor[i * 3] + (p[1] - c[1]) * this.nor[i * 3 + 1] + (p[2] - c[2]) * this.nor[i * 3 + 2];
    }
    if (dot < 0) this.flip();
    return this;
  }
  // Tag every vertex with extra values: tag({t: fn(i) or const})
  tag(values) {
    this.extra ??= {};
    for (const [k, v] of Object.entries(values))
      this.extra[k] = typeof v === 'function' ? Array.from({ length: this.count }, (_, i) => v(i)) : new Array(this.count).fill(v);
    return this;
  }
  bounds() {
    const b = new THREE.Box3();
    for (let i = 0; i < this.pos.length; i += 3) b.expandByPoint(new THREE.Vector3(this.pos[i], this.pos[i + 1], this.pos[i + 2]));
    return b;
  }
}

function push(dst, src) { for (let i = 0; i < src.length; i++) dst.push(src[i]); }

// From a three.js BufferGeometry
export function fromThree(bg) {
  const g = bg.index ? bg : bg; // non-indexed geometries get sequential indices
  const pos = Array.from(g.attributes.position.array);
  if (!g.attributes.normal) g.computeVertexNormals();
  const nor = Array.from(g.attributes.normal.array);
  const uv = g.attributes.uv ? Array.from(g.attributes.uv.array) : new Array((pos.length / 3) * 2).fill(0);
  const idx = g.index ? Array.from(g.index.array) : Array.from({ length: pos.length / 3 }, (_, i) => i);
  return new Geo(pos, nor, uv, idx);
}

// ---------------------------------------------------------------- parametric surfaces

// A grid surface: f(u, v) -> [x,y,z] for u in [0,1] (nu segments) and v in [0,1] (nv segments).
// closeU wraps u (a tube or lathe); normals come from the grid itself so seams stay smooth.
// out: 'auto' | +1 | -1 flips the winding. uvScale maps u,v to texture uv.
export function surface(nu, nv, f, { closeU = false, flip = false, uv = null, normals = 'grid' } = {}) {
  const cols = closeU ? nu : nu + 1;
  const rows = nv + 1;
  const P = new Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) P[j * cols + i] = f(i / nu, j / nv);
  const g = new Geo();
  // Vertices: when closed, add a seam copy so uvs can wrap
  const outCols = closeU ? nu + 1 : cols;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < outCols; i++) {
      const p = P[j * cols + (i % cols)];
      g.pos.push(p[0], p[1], p[2]);
      const u = i / nu, v = j / nv;
      const t = uv ? uv(u, v) : [u, v];
      g.uv.push(t[0], t[1]);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * outCols + i, b = a + 1, c = a + outCols, d = c + 1;
      if (flip) g.idx.push(a, b, c, b, d, c); else g.idx.push(a, c, b, b, c, d);
    }
  if (normals === 'grid') {
    // Central differences over the grid (wrapping in u when closed), with a face-normal fallback at poles.
    const at = (i, j) => {
      if (closeU) i = ((i % cols) + cols) % cols; else i = Math.max(0, Math.min(cols - 1, i));
      j = Math.max(0, Math.min(rows - 1, j));
      return P[j * cols + i];
    };
    const tmp = new Geo([...g.pos], [], g.uv, g.idx).computeNormals(false);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < outCols; i++) {
        const du = sub(at(i + 1, j), at(i - 1, j)), dv = sub(at(i, j + 1), at(i, j - 1));
        let n = cross(dv, du);
        if (flip) n = n.map((x) => -x);
        const l = Math.hypot(...n);
        const k = (j * outCols + i) * 3;
        if (l < 1e-12) g.nor.push(tmp.nor[k], tmp.nor[k + 1], tmp.nor[k + 2]);
        else g.nor.push(n[0] / l, n[1] / l, n[2] / l);
      }
    // The grid normal's sign follows the winding; make it agree with the triangles
    let agree = 0;
    for (let k = 0; k < g.nor.length; k += 3) agree += g.nor[k] * tmp.nor[k] + g.nor[k + 1] * tmp.nor[k + 1] + g.nor[k + 2] * tmp.nor[k + 2];
    if (agree < 0) for (let k = 0; k < g.nor.length; k++) g.nor[k] = -g.nor[k];
  } else g.computeNormals();
  g.rows = rows; g.cols = outCols;
  return g;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// A cloth panel with thickness: the surface f(u,v) is offset along its normal by +/- thickness/2, and the
// open edges are closed with a rim, so it reads as fabric from both sides with single-sided materials.
// thick may be a number or fn(u,v). Returns { outer, inner, rim } merged, tagged with u, v and side.
export function cloth(nu, nv, f, thick, { closeU = false, uv = null, rimU = true, rimV = true } = {}) {
  const base = surface(nu, nv, f, { closeU, uv });
  const cols = base.cols, rows = base.rows;
  const T = typeof thick === 'function' ? thick : () => thick;
  const outer = base.clone(), inner = base.clone();
  const us = [], vs = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { us.push(i / nu); vs.push(j / nv); }
  for (let k = 0; k < base.count; k++) {
    const h = T(us[k], vs[k]) / 2;
    for (let c = 0; c < 3; c++) {
      outer.pos[k * 3 + c] += base.nor[k * 3 + c] * h;
      inner.pos[k * 3 + c] -= base.nor[k * 3 + c] * h;
    }
  }
  inner.flip();
  outer.tag({ u: (i) => us[i], v: (i) => vs[i], side: 1 });
  inner.tag({ u: (i) => us[i], v: (i) => vs[i], side: -1 });
  const parts = [outer, inner];
  // Rims: walk each open boundary and stitch outer to inner
  const rim = (list) => {
    const g = new Geo();
    for (let s = 0; s < list.length; s++) {
      const k = list[s];
      for (const src of [outer, inner]) {
        g.pos.push(src.pos[k * 3], src.pos[k * 3 + 1], src.pos[k * 3 + 2]);
        g.uv.push(src.uv[k * 2], src.uv[k * 2 + 1]);
      }
    }
    for (let s = 0; s < list.length - 1; s++) {
      const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
      g.idx.push(a, c, b, b, c, d);
    }
    g.computeNormals(false);
    g.tag({ u: (i) => us[list[i >> 1]], v: (i) => vs[list[i >> 1]], side: 0 });
    return g;
  };
  const edges = []; // [boundary list, offset to the neighbor one step inside]
  if (rimV) {
    edges.push([Array.from({ length: cols }, (_, i) => (rows - 1) * cols + i), -cols]); // v = 1 (hem)
    edges.push([Array.from({ length: cols }, (_, i) => cols - 1 - i), cols]); // v = 0 (top)
  }
  if (rimU && !closeU) {
    edges.push([Array.from({ length: rows }, (_, j) => j * cols), 1]); // u = 0
    edges.push([Array.from({ length: rows }, (_, j) => (rows - 1 - j) * cols + cols - 1), -1]); // u = 1
  }
  for (const [list, inward] of edges) {
    const r = rim(list);
    // Face the rim outward: its normals should point away from the panel's interior
    let dot = 0;
    for (let s = 0; s < list.length; s++) {
      const k = list[s], kin = k + inward;
      for (let c = 0; c < 3; c++) dot += (base.pos[k * 3 + c] - base.pos[kin * 3 + c]) * (r.nor[s * 6 + c] + r.nor[s * 6 + 3 + c]);
    }
    if (dot < 0) r.flip();
    parts.push(r);
  }
  const g = Geo.merge(parts);
  return g;
}

// ---------------------------------------------------------------- tubes along curves

// Rotation-minimizing frames along a polyline of points (arrays), with an optional initial normal.
export function frames(points, up = [0, 1, 0]) {
  const P = points.map((p) => new THREE.Vector3(...p));
  const n = P.length;
  const T = P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    return b.clone().sub(a).normalize();
  });
  const N = [], B = [];
  let nn = new THREE.Vector3(...up);
  if (Math.abs(nn.dot(T[0])) > 0.95) nn = new THREE.Vector3(1, 0, 0);
  nn.sub(T[0].clone().multiplyScalar(nn.dot(T[0]))).normalize();
  N.push(nn);
  B.push(T[0].clone().cross(nn));
  for (let i = 1; i < n; i++) {
    // Double reflection method
    const v1 = P[i].clone().sub(P[i - 1]);
    const c1 = v1.dot(v1) || 1e-12;
    const rL = N[i - 1].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(N[i - 1])));
    const tL = T[i - 1].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(T[i - 1])));
    const v2 = T[i].clone().sub(tL);
    const c2 = v2.dot(v2) || 1e-12;
    const ni = rL.sub(v2.clone().multiplyScalar((2 / c2) * v2.dot(rL))).normalize();
    N.push(ni);
    B.push(T[i].clone().cross(ni));
  }
  return { P, T, N, B };
}

// Sample a Catmull-Rom curve through control points into n+1 points.
export function spline(ctrl, n, { closed = false, tension = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map((p) => new THREE.Vector3(...p)), closed, 'centripetal', tension);
  return Array.from({ length: n + 1 }, (_, i) => curve.getPointAt(i / n).toArray());
}

// A tube along points. radius(t, a) -> r (or [rx, ry] for an elliptical section); twist(t) radians.
// caps: close both ends with a fan. Tagged with t (0..1 along) and a (0..1 around).
export function tube(points, radius, { radial = 8, caps = true, up, twist = null, uvScale = [1, 1], capStart = caps, capEnd = caps } = {}) {
  const { P, T, N, B } = frames(points, up);
  const n = P.length;
  const R = typeof radius === 'function' ? radius : () => radius;
  const g = new Geo();
  const ts = [], as = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const tw = twist ? twist(t) : 0;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2 + tw;
      let r = R(t, j / radial);
      let rx = r, ry = r;
      if (Array.isArray(r)) [rx, ry] = r;
      const cx = Math.cos(a), sy = Math.sin(a);
      const off = N[i].clone().multiplyScalar(cx * rx).add(B[i].clone().multiplyScalar(sy * ry));
      const p = P[i].clone().add(off);
      g.pos.push(p.x, p.y, p.z);
      g.uv.push((j / radial) * uvScale[0], t * uvScale[1]);
      ts.push(t); as.push(j / radial);
    }
  }
  const cols = radial + 1;
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      g.idx.push(a, b, c, b, d, c);
    }
  const addCap = (ring, center, dir, t) => {
    const ci = g.count;
    g.pos.push(center.x, center.y, center.z);
    g.uv.push(0.5, t);
    ts.push(t); as.push(0);
    for (let j = 0; j < radial; j++) {
      const a = ring * cols + j, b = ring * cols + j + 1;
      if (dir > 0) g.idx.push(ci, a, b); else g.idx.push(ci, b, a);
    }
  };
  if (capStart) addCap(0, P[0], 1, 0);
  if (capEnd) addCap(n - 1, P[n - 1], -1, 1);
  g.computeNormals(false);
  // Seam: average normals of the duplicated first/last column
  for (let i = 0; i < n; i++) {
    const a = (i * cols) * 3, b = (i * cols + radial) * 3;
    for (let c = 0; c < 3; c++) { const m = (g.nor[a + c] + g.nor[b + c]) / 2; g.nor[a + c] = g.nor[b + c] = m; }
    const l = Math.hypot(g.nor[a], g.nor[a + 1], g.nor[a + 2]) || 1;
    for (let c = 0; c < 3; c++) { g.nor[a + c] /= l; g.nor[b + c] = g.nor[a + c]; }
  }
  g.tag({ t: (i) => ts[i], a: (i) => as[i] });
  return g;
}

// A lathe (surface of revolution) from a profile of [r, y] pairs.
export function lathe(profile, segments = 32, { phase = 0, arc = Math.PI * 2 } = {}) {
  const pts = spline(profile.map(([r, y]) => [r, y, 0]), profile.length * 8);
  const closed = arc >= Math.PI * 2 - 1e-6;
  return surface(segments, pts.length - 1, (u, v) => {
    const k = Math.round(v * (pts.length - 1));
    const [r, y] = pts[k];
    const a = phase + u * arc;
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  }, { closeU: closed });
}

// An ellipsoid-like blob: f(dir) scales the radius. A UV sphere with nu x nv segments.
export function blob(nu, nv, rfn) {
  return surface(nu, nv, (u, v) => {
    const th = u * Math.PI * 2, ph = v * Math.PI;
    const d = [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)];
    const r = rfn(d, u, v);
    return Array.isArray(r) ? r : [d[0] * r, d[1] * r, d[2] * r];
  }, { closeU: true });
}

export function sphere(r, nu = 24, nv = 16) {
  return blob(nu, nv, () => r);
}

// A torus ring lying in the xz-plane (axis y).
export function torus(R, r, nu = 32, nv = 10, arc = Math.PI * 2) {
  const closed = arc >= Math.PI * 2 - 1e-6;
  return surface(nu, nv, (u, v) => {
    const a = u * arc, b = v * Math.PI * 2;
    const rr = R + Math.cos(b) * r;
    return [Math.cos(a) * rr, Math.sin(b) * r, Math.sin(a) * rr];
  }, { closeU: closed });
}

// Extrude a closed 2D outline (array of [x,y]) to a slab of depth d centered on z=0, with a bevel.
export function slab(outline, d, { bevel = 0 } = {}) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  geo.translate(0, 0, -d / 2);
  const g = fromThree(geo.toNonIndexed());
  g.computeNormals(false);
  return g;
}

export function shapeSlab(shape, d, { bevel = 0, curveSegments = 12 } = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
  geo.translate(0, 0, -d / 2);
  return fromThree(geo.toNonIndexed());
}

// Seeded random numbers, so every build is the same.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Smooth 3D value noise (for fabric folds and bumps).
export function noise3(seed = 7) {
  const r = rng(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const vals = Array.from({ length: 256 }, () => r() * 2 - 1);
  const h = (x, y, z) => vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
  };
}

export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
