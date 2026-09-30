import * as THREE from 'three';
import { ring } from './paint.js';

// The walkmesh: an invisible 3D floor traced over the painting. FF9 gives every field screen one.
// Characters stand on it, climb its slopes (the chapel steps) and can't leave it. It is built from
// polygons drawn in painting pixels, each corner with its own height, so a flight of stairs is just a
// polygon whose top corners sit higher than its bottom ones.
export class Walkmesh {
  constructor(scene, paint) {
    this.tris = [];
    for (const poly of scene.walk) {
      const outer = ring(poly.points);
      const holes = (poly.holes ?? []).map(ring);
      const pixels = [outer, ...holes].flat();
      const world = pixels.map(([x, y, h]) => paint.toWorld(x, y, h));
      const flat = (list) => list.map(([x, y]) => new THREE.Vector2(x, y));
      const faces = THREE.ShapeUtils.triangulateShape(flat(outer), holes.map(flat));
      for (const [i, j, k] of faces) this.tris.push(makeTri(world[i], world[j], world[k], poly.name));
    }
    this.edges = boundaryEdges(this.tris);
    this.obstacles = []; // {x, z, r}: characters standing still
    const box = new THREE.Box3();
    for (const t of this.tris) box.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
    this.bounds = box;
  }

  // The triangle under a point, or null if the point is off the floor.
  locate(x, z) {
    for (const t of this.tris) {
      if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
      const w = barycentric(t, x, z);
      if (w) return { tri: t, y: w[0] * t.a.y + w[1] * t.b.y + w[2] * t.c.y };
    }
    return null;
  }

  heightAt(x, z, fallback = 0) {
    return this.locate(x, z)?.y ?? fallback;
  }

  // Distance from a point to the nearest edge of the floor.
  edgeDistance(x, z) {
    let best = Infinity;
    for (const [a, b] of this.edges) best = Math.min(best, segmentDistance(x, z, a, b));
    return best;
  }

  // Can a character of radius r stand here? `ignore` is the character asking, so it isn't blocked by itself.
  canStand(x, z, r = 0, ignore = null, others = true) {
    if (!this.locate(x, z)) return false;
    if (r > 0 && this.edgeDistance(x, z) < r) return false;
    if (others) for (const o of this.obstacles) {
      if (o === ignore || o.off) continue;
      const dx = x - o.x, dz = z - o.z, min = r + o.r;
      if (dx * dx + dz * dz < min * min) return false;
    }
    return true;
  }

  // Take one step, sliding along walls instead of stopping dead against them.
  step(pos, dx, dz, r, ignore) {
    if (this.canStand(pos.x + dx, pos.z + dz, r, ignore)) return pos.set(pos.x + dx, 0, pos.z + dz), true;
    const len = Math.hypot(dx, dz);
    // Try the move turned a little either way, then each axis alone.
    for (const turn of [0.5, -0.5, 1.0, -1.0]) {
      const c = Math.cos(turn), s = Math.sin(turn);
      const tx = (dx * c - dz * s) * 0.8, tz = (dx * s + dz * c) * 0.8;
      if (this.canStand(pos.x + tx, pos.z + tz, r, ignore)) return pos.set(pos.x + tx, 0, pos.z + tz), true;
    }
    if (Math.abs(dx) > len * 0.2 && this.canStand(pos.x + dx, pos.z, r, ignore)) return pos.set(pos.x + dx, 0, pos.z), true;
    if (Math.abs(dz) > len * 0.2 && this.canStand(pos.x, pos.z + dz, r, ignore)) return pos.set(pos.x, 0, pos.z + dz), true;
    // Head-on into a wall or a round obstacle: slide along whatever is in the way.
    const wall = this.wallDirection(pos.x, pos.z, r, ignore);
    if (wall) {
      const { along, away } = wall;
      const d = dx * along.x + dz * along.z;
      if (Math.abs(d) > len * 0.1) {
        const sx = along.x * d + away.x * 0.004, sz = along.z * d + away.z * 0.004;
        if (this.canStand(pos.x + sx, pos.z + sz, r, ignore)) return pos.set(pos.x + sx, 0, pos.z + sz), true;
      }
    }
    return false;
  }

  // The nearest edge or obstacle to a point: which way runs along it, and which way leads away from it.
  wallDirection(x, z, r, ignore) {
    let best = null, bestD = Infinity;
    for (const [a, b] of this.edges) {
      const d = segmentDistance(x, z, a, b) - r;
      if (d < bestD) {
        bestD = d;
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const along = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
        let away = { x: -along.z, z: along.x };
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
        if ((x - mx) * away.x + (z - mz) * away.z < 0) away = { x: -away.x, z: -away.z };
        best = { along, away };
      }
    }
    for (const o of this.obstacles) {
      if (o === ignore || o.off) continue;
      const d = Math.hypot(x - o.x, z - o.z) - o.r - r;
      if (d < bestD) {
        bestD = d;
        const nx = x - o.x, nz = z - o.z, len = Math.hypot(nx, nz) || 1;
        best = { along: { x: -nz / len, z: nx / len }, away: { x: nx / len, z: nz / len } };
      }
    }
    return best;
  }

  // ---- tap-to-walk pathfinding: A* over a grid laid on the floor, then straightened out ----

  buildGrid(r, cell = 0.2) {
    const { min, max } = this.bounds;
    const cols = Math.ceil((max.x - min.x) / cell) + 1;
    const rows = Math.ceil((max.z - min.z) / cell) + 1;
    const open = new Uint8Array(cols * rows);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        open[j * cols + i] = this.canStand(min.x + i * cell, min.z + j * cell, r, null, false) ? 1 : 0;
    this.grid = { cols, rows, cell, open, x0: min.x, z0: min.z, r };
  }

  cellOf(x, z) {
    const g = this.grid;
    return [Math.round((x - g.x0) / g.cell), Math.round((z - g.z0) / g.cell)];
  }

  isOpen(i, j, ignore) {
    const g = this.grid;
    if (i < 0 || j < 0 || i >= g.cols || j >= g.rows || !g.open[j * g.cols + i]) return false;
    const x = g.x0 + i * g.cell, z = g.z0 + j * g.cell;
    for (const o of this.obstacles) {
      if (o === ignore || o.off) continue;
      const min = g.r + o.r;
      if ((x - o.x) ** 2 + (z - o.z) ** 2 < min * min) return false;
    }
    return true;
  }

  nearestOpen(x, z, ignore) {
    const g = this.grid;
    const [ci, cj] = this.cellOf(x, z);
    for (let rad = 0; rad < Math.max(g.cols, g.rows); rad++) {
      let best = null, bestD = Infinity;
      for (let j = cj - rad; j <= cj + rad; j++)
        for (let i = ci - rad; i <= ci + rad; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== rad || !this.isOpen(i, j, ignore)) continue;
          const d = (g.x0 + i * g.cell - x) ** 2 + (g.z0 + j * g.cell - z) ** 2;
          if (d < bestD) (bestD = d), (best = [i, j]);
        }
      if (best) return best;
    }
    return null;
  }

  // A list of points from `from` to `to` (or to the nearest reachable spot), or null.
  findPath(from, to, ignore) {
    const g = this.grid;
    const start = this.isOpen(...this.cellOf(from.x, from.z), ignore) ? this.cellOf(from.x, from.z) : this.nearestOpen(from.x, from.z, ignore);
    let goal = this.isOpen(...this.cellOf(to.x, to.z), ignore) ? this.cellOf(to.x, to.z) : this.nearestOpen(to.x, to.z, ignore);
    if (!start || !goal) return null;
    const exact = this.canStand(to.x, to.z, g.r, ignore);
    const key = (i, j) => j * g.cols + i;
    const came = new Map(), cost = new Map([[key(...start), 0]]);
    const heap = new Heap();
    heap.push([0, ...start]);
    const h = (i, j) => { const dx = Math.abs(i - goal[0]), dz = Math.abs(j - goal[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    let found = false, steps = 0;
    while (heap.size && steps++ < 40000) {
      const [, i, j] = heap.pop();
      if (i === goal[0] && j === goal[1]) { found = true; break; }
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (!this.isOpen(ni, nj, ignore)) continue;
          if (di && dj && (!this.isOpen(i + di, j, ignore) || !this.isOpen(i, j + dj, ignore))) continue;
          const c = cost.get(key(i, j)) + (di && dj ? 1.414 : 1);
          if (c < (cost.get(key(ni, nj)) ?? Infinity)) {
            cost.set(key(ni, nj), c);
            came.set(key(ni, nj), [i, j]);
            heap.push([c + h(ni, nj), ni, nj]);
          }
        }
    }
    if (!found) return null;
    const cells = [goal];
    for (let c = goal; c[0] !== start[0] || c[1] !== start[1]; ) cells.push((c = came.get(key(...c))));
    cells.reverse();
    const pts = cells.map(([i, j]) => new THREE.Vector3(g.x0 + i * g.cell, 0, g.z0 + j * g.cell));
    if (exact) pts[pts.length - 1] = new THREE.Vector3(to.x, 0, to.z);
    pts[0] = new THREE.Vector3(from.x, 0, from.z);
    // Straighten: skip ahead to the farthest point in plain view.
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; ) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.clearLine(pts[i], pts[j], g.r, ignore)) j--;
      out.push(pts[j]);
      i = j;
    }
    return out.slice(1);
  }

  clearLine(a, b, r, ignore) {
    const n = Math.ceil(a.distanceTo(b) / 0.08);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (!this.canStand(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r * 0.9, ignore)) return false;
    }
    return true;
  }

  // Where a ray first hits the floor (for taps), or null.
  raycast(ray) {
    let best = null;
    const hit = new THREE.Vector3();
    for (const t of this.tris) {
      if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) {
        const d = hit.distanceTo(ray.origin);
        if (!best || d < best.d) best = { d, point: hit.clone() };
      }
    }
    return best?.point ?? null;
  }
}

function makeTri(a, b, c, name) {
  return {
    a, b, c, name,
    minX: Math.min(a.x, b.x, c.x) - 1e-6, maxX: Math.max(a.x, b.x, c.x) + 1e-6,
    minZ: Math.min(a.z, b.z, c.z) - 1e-6, maxZ: Math.max(a.z, b.z, c.z) + 1e-6,
  };
}

function barycentric(t, x, z) {
  const { a, b, c } = t;
  const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  const w1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
  const w2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
  const w3 = 1 - w1 - w2;
  const e = -1e-5;
  return w1 >= e && w2 >= e && w3 >= e ? [w1, w2, w3] : null;
}

// Edges that belong to only one triangle are the floor's outline.
function boundaryEdges(tris) {
  const k = (v) => `${v.x.toFixed(3)},${v.z.toFixed(3)}`;
  const count = new Map();
  for (const t of tris)
    for (const [p, q] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
      const id = [k(p), k(q)].sort().join('|');
      const e = count.get(id);
      if (e) e.n++;
      else count.set(id, { n: 1, p, q });
    }
  return [...count.values()].filter((e) => e.n === 1).map((e) => [e.p, e.q]);
}

function segmentDistance(x, z, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}

// A small binary min-heap on the first element of each entry.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v) {
    const a = this.a;
    a.push(v);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
