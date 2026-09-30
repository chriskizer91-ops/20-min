import * as THREE from 'three';
import { LAYER_ACTORS } from '../layers.js';

// Shared pieces for the chunky, big-headed 3D characters: three-step toon shading (so they read like
// painted pixels once scaled down) and an ink outline around each part.

const gradient = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const cache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts }));
  return cache.get(key);
}

export const INK = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color('#12091a') }, thickness: { value: 0.016 } },
  vertexShader: /* glsl */ `
    uniform float thickness;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      mv.xyz += normalize(normalMatrix * normal) * thickness;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }`,
  side: THREE.BackSide,
});

// Add a mesh to a parent. opts: pos, rot, scale, ink (outline, default true), name.
export function part(parent, geometry, material, opts = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  if (opts.pos) mesh.position.set(...opts.pos);
  if (opts.rot) mesh.rotation.set(...opts.rot);
  if (opts.scale) mesh.scale.set(...(Array.isArray(opts.scale) ? opts.scale : [opts.scale, opts.scale, opts.scale]));
  if (opts.name) mesh.name = opts.name;
  if (opts.ink !== false) {
    const ink = new THREE.Mesh(geometry, INK);
    ink.name = 'ink';
    mesh.add(ink);
  }
  parent.add(mesh);
  return mesh;
}

// An empty joint to rotate a limb around.
export function joint(parent, pos = [0, 0, 0], name) {
  const g = new THREE.Group();
  g.position.set(...pos);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

export const sphere = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
export const cyl = (rt, rb, h, n = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
export const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
export const lathe = (pts, n = 14) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);

// A skirt or coat: a lathe from `top` radius to `bottom` radius, with a zig-zag hem and an optional
// opening at the front (gap in radians).
export function skirt({ top, bottom, height, flare = 0.5, points = 16, zig = 0.03, gap = 0 }) {
  const rows = 5;
  const positions = [];
  const idx = [];
  const start = Math.PI / 2 + gap / 2; // +z is the front; leave the gap centered on it
  const span = Math.PI * 2 - gap;
  const cols = points + (gap ? 1 : 0);
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const radius = top + (bottom - top) * Math.pow(v, flare);
    for (let c = 0; c < cols; c++) {
      const a = start + (c / (gap ? points : points)) * span;
      const drop = r === rows ? (c % 2 ? zig : -zig * 0.3) : 0;
      positions.push(Math.cos(a) * radius, -v * height - drop, Math.sin(a) * radius);
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols - (gap ? 1 : 0); c++) {
      const c2 = (c + 1) % cols;
      const a = r * cols + c, b = r * cols + c2, d = (r + 1) * cols + c, e = (r + 1) * cols + c2;
      idx.push(a, d, b, b, d, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A soft round shadow on the ground.
const shadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

export function blobShadow(radius = 0.3, opacity = 0.55) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false, color: 0x000000 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

// A soft glow sprite (for witchfire, lamps and ghosts).
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.45)'));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function glowSprite(color, size, opacity = 1, layer = LAYER_ACTORS) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.set(size, size, 1);
  s.layers.set(layer);
  return s;
}

// Put a whole model on one render layer.
export function onLayer(root, layer = LAYER_ACTORS) {
  root.traverse((o) => o.layers.set(layer));
  return root;
}

// Turn smoothly toward an angle.
export function turnToward(current, target, rate, dt) {
  let d = target - current;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return current + d * (1 - Math.exp(-rate * dt));
}

// A springy value, for things that lag and wobble (the hat tip, the hair).
export class Spring {
  constructor(stiffness = 60, damping = 8) {
    this.k = stiffness;
    this.d = damping;
    this.x = 0;
    this.v = 0;
  }
  update(target, dt) {
    const a = (target - this.x) * this.k - this.v * this.d;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
}
