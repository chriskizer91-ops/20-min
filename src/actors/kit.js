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

// A moonlit rim: a thin pale edge on the side away from the camera's view, stepped like the shading, so
// the characters stand out against the dark paintings.
export const RIM = { color: new THREE.Color('#b8b0ff'), strength: { value: 0.32 } };

function addRim(material, strength = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: RIM.color };
    shader.uniforms.rimStrength = RIM.strength;
    shader.uniforms.rimScale = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength; uniform float rimScale;')
      .replace('#include <opaque_fragment>', `
        float rimAmount = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
        outgoingLight += rimColor * smoothstep(0.62, 0.8, rimAmount) * rimStrength * rimScale;
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'rim';
  return material;
}

const cache = new Map();
export function toon(color, opts = {}) {
  const { rim = 1, ...rest } = opts;
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, addRim(new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...rest }), rim));
  return cache.get(key);
}

// A toon material with a texture (the face, the shawl's stitching); not cached.
export function toonMap(map, opts = {}) {
  const { rim = 1, ...rest } = opts;
  return addRim(new THREE.MeshToonMaterial({ map, gradientMap: gradient, ...rest }), rim);
}

// A tube that thins from r0 to r1 along a curve through points (for hair locks, horns, straps).
export function taperedTube(points, r0, r1, segments = 12, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const center = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, center);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      n.fromBufferAttribute(nor, k);
      v.copy(center).addScaledVector(n, r);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  // Close the thin end so the outline doesn't show inside it.
  return geo;
}

// A flat shape (star, crescent) given a little thickness.
export function badge(shape, depth = 0.008) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  geo.center();
  return geo;
}

export function starShape(r = 1, points = 5, inner = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}

export function crescentShape(r = 1, inner = 0.8, shift = 0.45) {
  // The outer disc minus a smaller disc shifted to the right, traced as one outline.
  const r2 = r * inner, d = r * shift;
  const x = (r * r - r2 * r2 + d * d) / (2 * d), y = Math.sqrt(Math.max(0, r * r - x * x));
  const s = new THREE.Shape();
  s.absarc(0, 0, r, Math.atan2(y, x), Math.PI * 2 + Math.atan2(-y, x), false);
  s.absarc(d, 0, r2, Math.atan2(-y, x - d), Math.atan2(y, x - d) - Math.PI * 2, true);
  return s;
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
export function skirt({ top, bottom, height, flare = 0.5, points = 16, zig = 0.03, gap = 0, rows = 5, backDrop = 0, ragged = 0 }) {
  const positions = [];
  const uvs = [];
  const idx = [];
  const start = Math.PI / 2 + gap / 2; // +z is the front; leave the gap centered on it
  const span = Math.PI * 2 - gap;
  const cols = points + (gap ? 1 : 0);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tatter = Array.from({ length: cols }, () => rand());
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const radius = top + (bottom - top) * Math.pow(v, flare);
    for (let c = 0; c < cols; c++) {
      const a = start + (c / points) * span;
      // The back can hang lower than the front (a shawl).
      const back = backDrop * Math.max(0, -Math.sin(a)) * v;
      let drop = 0;
      if (r === rows) drop = (c % 2 ? zig : -zig * 0.3) + ragged * tatter[c];
      positions.push(Math.cos(a) * radius, -v * height - back - drop, Math.sin(a) * radius);
      uvs.push(c / Math.max(1, cols - 1), v);
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
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData = { rows, cols, rest: Float32Array.from(positions) };
  return g;
}

// Make cloth sway: push the lower rows of a skirt() geometry out and back with a ripple.
// drag: how far the hem trails behind (walking), lift: flare out (turning), time: seconds.
export function swayCloth(geo, { drag = 0, lift = 0, time = 0, ripple = 0.012, side = 0 }) {
  const { rows, cols, rest } = geo.userData;
  const pos = geo.attributes.position;
  for (let r = 1; r <= rows; r++) {
    const f = Math.pow(r / rows, 1.6);
    for (let c = 0; c < cols; c++) {
      const k = (r * cols + c) * 3;
      const x = rest[k], y = rest[k + 1], z = rest[k + 2];
      const len = Math.hypot(x, z) || 1;
      const out = (lift + Math.sin(time * 5 + c * 1.3 + r) * ripple) * f;
      pos.setXYZ(r * cols + c, x + (x / len) * out + side * f, y + Math.abs(drag) * f * 0.35, z + (z / len) * out - drag * f);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
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
