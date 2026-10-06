// sunset.js: the shipyard's sky, shared by the hangar and the shipyard demos. Night blue overhead, gold and rose at
// the horizon, a sea of cloud below lit by the low sun, and peaks breaking through it far off, the way Chris's
// painting of the Brig shows it.
import * as THREE from 'three';

export const SUN = new THREE.Vector3(-0.62, 0.16, -0.77).normalize();

// ---------- the sky: night blue overhead, gold and rose at the horizon, the low sun, a few stars ----------
// One sky colour for every direction, shared by the sky and by the far edge of the cloud sea, so they meet with no seam
const SKY_GLSL = `
  vec3 skyColor(vec3 d, vec3 sun) {
    float h = d.y, s = max(dot(normalize(vec3(d.x, max(d.y, 0.0), d.z)), sun), 0.0);
    vec3 zen = vec3(0.05, 0.07, 0.22), mid = vec3(0.27, 0.25, 0.53), low = vec3(0.93, 0.55, 0.47), hor = vec3(1.0, 0.74, 0.52);
    vec3 c = mix(hor, low, smoothstep(0.0, 0.08, h));
    c = mix(c, mid, smoothstep(0.06, 0.34, h));
    c = mix(c, zen, smoothstep(0.3, 0.95, h));
    c = mix(c, vec3(0.86, 0.6, 0.62), (1.0 - s) * (1.0 - smoothstep(0.0, 0.1, h)) * 0.6);
    c += vec3(1.0, 0.6, 0.3) * pow(s, 8.0) * 0.32 * (1.0 - smoothstep(0.1, 0.6, h));
    return c;
  }`;
export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun; ${SKY_GLSL}
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir); float s = max(dot(d, uSun), 0.0);
        vec3 c = skyColor(d, uSun);
        c += vec3(1.0, 0.8, 0.55) * pow(s, 90.0) * 0.7 + vec3(1.0, 0.93, 0.78) * smoothstep(0.9994, 0.9997, s) * 3.0;
        vec3 q = floor(d * 380.0); float st = step(0.9965, hash(q)) * smoothstep(0.3, 0.75, d.y);
        c += vec3(0.9, 0.9, 1.0) * st * 0.8;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  m.scale.setScalar(30000); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------- the sea of cloud below: lit gold and rose towards the sun, lavender in its own shade ----------
export function makeClouds() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime; uniform vec3 uSun; ${SKY_GLSL}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
      void main() {
        vec2 p = vW.xz * 0.0042 + vec2(uTime * 0.004, uTime * 0.0015);
        float n = fbm(p), n2 = fbm(p * 3.1 + 5.0);
        float puff = smoothstep(0.28, 0.78, n * 0.75 + n2 * 0.35);
        float toward = fbm(p - uSun.xz * 0.035);
        float lit = clamp(0.55 + (n - toward) * 5.5, 0.0, 1.0);
        vec3 shade = vec3(0.37, 0.34, 0.6), sunlit = vec3(1.0, 0.82, 0.7), rim = vec3(1.0, 0.64, 0.5);
        vec3 c = mix(shade, sunlit, lit * 0.85 + 0.15 * puff);
        c = mix(c, rim, pow(lit, 6.0) * 0.35);
        c = mix(vec3(0.3, 0.27, 0.5), c, 0.45 + 0.55 * puff);
        vec3 toCam = vW - cameraPosition; float d = length(toCam.xz);
        vec3 haze = skyColor(normalize(vec3(toCam.x, 0.0, toCam.z)), uSun);
        c = mix(c, haze, smoothstep(300.0, 5000.0, d));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2), mat);
  m.position.y = -70; m.frustumCulled = false;
  return m;
}

// ---------- peaks breaking through the clouds far off, snow on their tops ----------
export function makePeaks() {
  const group = new THREE.Group();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2, d = 1500 + rnd() * 3600, h = 200 + rnd() * 560, r = h * (0.32 + rnd() * 0.22);
    const g = new THREE.ConeGeometry(r, h, 9, 8);
    const p = g.attributes.position, col = [];
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k), t = (y + h / 2) / h;
      if (t < 0.99) {
        const j = 0.6 + rnd() * 0.8;
        p.setX(k, p.getX(k) * j); p.setZ(k, p.getZ(k) * (0.6 + rnd() * 0.8)); p.setY(k, y + (rnd() - 0.5) * h * 0.1);
      }
      const snow = t > 0.6 + rnd() * 0.15;
      col.push(...(snow ? [0.86, 0.84, 0.98] : [0.2 + t * 0.14, 0.19 + t * 0.12, 0.34 + t * 0.12]));
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.set(Math.cos(a) * d, -70 + h * 0.3, Math.sin(a) * d);
    m.rotation.y = rnd() * 6;
    group.add(m);
  }
  return group;
}
