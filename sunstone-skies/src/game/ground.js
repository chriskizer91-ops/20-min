// ground.js: trees, close to the ground. Flying low (the camera under about 500 m), real trees stand up out of the
// map's woods round the ship: the map is read once to find its woodland, and the trees nearest the camera are grown
// there, each a cluster of rounded crowns on a trunk, tinted like the wood they stand in, rising as the camera comes
// down and fading out at a distance. They're drawn as one batch, so hundreds cost little.
// (After the near-ground trees in the version of the game made with ChatGPT that Chris sent.)
import * as THREE from 'three';
import { MAP } from './world.js';

const SAMPLE = { w: 1920, h: 1280 }; // the whole map, read at a third of its size
const LIMIT = 700, GRID = 40, STREAM = 720, SEEN = 620;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z, salt) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 69069);
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

function geometry(positions, indices, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  if (colors) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}
// a crown of five rounded lobes, lit lighter on top (1 m tall: each tree is scaled to its height)
function crowns() {
  const pos = [], col = [], idx = [], seg = 9, rings = 5;
  const lobes = [[0, 0.74, 0, 0.34, 0.38, 0.31], [-0.26, 0.59, 0.09, 0.3, 0.3, 0.29], [0.23, 0.66, -0.08, 0.3, 0.32, 0.29], [-0.04, 0.53, -0.25, 0.29, 0.29, 0.29], [0.08, 0.55, 0.27, 0.28, 0.29, 0.28]];
  lobes.forEach(([x, y, z, rx, ry, rz], li) => {
    const base = pos.length / 3;
    for (let r = 0; r <= rings; r++) {
      const phi = (r / rings) * Math.PI;
      for (let s = 0; s <= seg; s++) {
        const a = (s / seg) * Math.PI * 2, bump = 1 + 0.055 * Math.sin(a * 3 + li * 1.7) * Math.sin(phi);
        pos.push(x + Math.sin(phi) * Math.cos(a) * rx * bump, y + Math.cos(phi) * ry, z + Math.sin(phi) * Math.sin(a) * rz * bump);
        const light = 0.76 + 0.2 * Math.max(0, Math.cos(phi)) + 0.025 * Math.sin(a * 4 + li);
        col.push(light * 0.88, light, light * 0.77);
      }
    }
    for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) { const a = base + r * (seg + 1) + s, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  });
  return geometry(pos, idx, col);
}
function trunk() {
  const pos = [], idx = [], seg = 10;
  for (let r = 0; r < 2; r++) for (let s = 0; s <= seg; s++) { const a = (s / seg) * Math.PI * 2, rad = r ? 0.024 : 0.04; pos.push(Math.cos(a) * rad, r * 0.54, Math.sin(a) * rad); }
  for (let s = 0; s < seg; s++) { const b = s + seg + 1; idx.push(s, b, s + 1, b, b + 1, s + 1); }
  return geometry(pos, idx);
}

// tiles: the map's nine textures (world.js), in reading order; each has a border of `border` pixels round its map
export function makeGround(scene, tiles, border = 16) {
  const group = new THREE.Group(); group.name = 'trees near the ground'; group.visible = false;
  scene.add(group);
  // read the map once: each tile's own part drawn into one picture of the whole map
  let pixels = null;
  try {
    const c = document.createElement('canvas'); c.width = SAMPLE.w; c.height = SAMPLE.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    tiles.forEach((t, i) => {
      const img = t.image, iw = img.width - 2 * border, ih = img.height - 2 * border;
      g.drawImage(img, border, border, iw, ih, (i % 3) * SAMPLE.w / 3, Math.floor(i / 3) * SAMPLE.h / 3, SAMPLE.w / 3, SAMPLE.h / 3);
    });
    pixels = g.getImageData(0, 0, SAMPLE.w, SAMPLE.h).data;
  } catch { /* the map couldn't be read: no trees, the rest is the same */ }
  const sample = (x, z) => {
    const col = Math.floor((x / MAP.w + 0.5) * SAMPLE.w), row = Math.floor((z / MAP.h + 0.5) * SAMPLE.h);
    if (!pixels || col < 0 || col >= SAMPLE.w || row < 0 || row >= SAMPLE.h) return null;
    const o = (row * SAMPLE.w + col) * 4;
    return [pixels[o], pixels[o + 1], pixels[o + 2]];
  };
  const green = (c) => c && c[1] > 40 && c[1] < 142 && c[0] < 98 && c[2] < 94 && c[1] > c[0] * 1.16 && c[1] > c[2] * 1.25 && c[1] - c[0] > 14;
  // woodland, not a smooth green field: green here and round about, and uneven
  function wood(x, z) {
    const mid = sample(x, z);
    if (!green(mid)) return null;
    const near = [mid, sample(x - 18, z), sample(x + 18, z), sample(x, z - 18), sample(x, z + 18)];
    if (near.filter(green).length < 4) return null;
    const g = near.filter(Boolean).map((c) => c[1]);
    return Math.max(...g) - Math.min(...g) < 12 ? null : mid;
  }

  const make = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, LIMIT); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); return m; };
  const leaves = make(crowns(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, metalness: 0, vertexColors: true, envMapIntensity: 0.18 }));
  const trunks = make(trunk(), new THREE.MeshStandardMaterial({ color: 0x725b3b, roughness: 1, metalness: 0, envMapIntensity: 0.12 }));
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), tint = new THREE.Color();
  let trees = [], cx = NaN, cz = NaN;
  // the woodland round a point, nearest first, on a jittered 40 m grid (the same trees every time)
  function gather(x, z) {
    const out = [], n = Math.ceil(STREAM / GRID), mx = Math.floor(x / GRID), mz = Math.floor(z / GRID);
    for (let i = mx - n; i <= mx + n; i++) for (let j = mz - n; j <= mz + n; j++) {
      const px = (i + 0.5) * GRID + (hash(i, j, 1) - 0.5) * 22, pz = (j + 0.5) * GRID + (hash(i, j, 2) - 0.5) * 22, d = Math.hypot(px - x, pz - z);
      if (d > STREAM) continue;
      const c = wood(px, pz); if (!c) continue;
      out.push({ x: px, z: pz, h: 16 + hash(i, j, 3) * 8, w: 0.74 + hash(i, j, 4) * 0.22, yaw: hash(i, j, 5) * Math.PI * 2, c, d });
    }
    out.sort((a, b) => a.d - b.d);
    trees = out.slice(0, LIMIT); cx = x; cz = z;
  }
  // every frame: grow the trees near the camera when it's low enough to see them
  function update(camera) {
    const cam = camera.position, low = 1 - smooth(160, 500, cam.y);
    if (!pixels || low < 0.002) { group.visible = false; leaves.count = trunks.count = 0; return 0; }
    if (!Number.isFinite(cx) || Math.hypot(cam.x - cx, cam.z - cz) > 100) gather(cam.x, cam.z);
    let n = 0;
    for (const t of trees) {
      const k = low * (1 - smooth(430, SEEN, Math.hypot(cam.x - t.x, cam.z - t.z)));
      if (k < 0.003) continue;
      const h = t.h * k;
      m4.makeRotationY(t.yaw).scale(sc.set(h * t.w, h, h * t.w)).setPosition(t.x, 0.03, t.z);
      leaves.setMatrixAt(n, m4); trunks.setMatrixAt(n, m4);
      leaves.setColorAt(n, tint.setRGB((t.c[0] * 0.5 + 25) / 255, (t.c[1] * 0.55 + 39) / 255, (t.c[2] * 0.45 + 18) / 255, THREE.SRGBColorSpace));
      n++;
    }
    leaves.count = trunks.count = n;
    leaves.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    group.visible = n > 0;
    return n;
  }
  return { update, group, get trees() { return leaves.count; }, readable: () => !!pixels };
}
