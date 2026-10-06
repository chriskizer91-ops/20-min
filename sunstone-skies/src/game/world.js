// world.js: Aethermoor to fly over. Chris's map lies flat far below as the ground: nine tiles, 23 km across, painted
// straight down like a view from the air (the top-down set from the version of the game Chris sent on October 6, 4 m
// to a pixel). The open sea runs on past its edges, a broken deck of cloud floats between, and big clouds drift at the
// ship's height. The sky is late afternoon with the sun low in the west.
import * as THREE from 'three';
import tile1 from '../../assets/map/tile-1.avif';
import tile2 from '../../assets/map/tile-2.avif';
import tile3 from '../../assets/map/tile-3.avif';
import tile4 from '../../assets/map/tile-4.avif';
import tile5 from '../../assets/map/tile-5.avif';
import tile6 from '../../assets/map/tile-6.avif';
import tile7 from '../../assets/map/tile-7.avif';
import tile8 from '../../assets/map/tile-8.avif';
import tile9 from '../../assets/map/tile-9.avif';

export const MAP = { w: 23040, h: 15360, px: 4 }; // metres; x runs east, z runs south, the map's centre at the origin
export const SUN = new THREE.Vector3(-0.55, 0.52, 0.25).normalize();
export const CLOUD_Y = 430, THINNING = 2400;

// The regions, a 12 x 8 grid over the map read off Chris's painting (names from the Magpie page)
const GRID = ['sssswwsppppp', 'sssswwhppppp', 'swwwwhhppppp', 'swwwwhhppkks', 'sggwwhhkkkks', 'sggwwfhkkkks', 'sswfffkkkkss', 'ssssssssssss'];
const NAMES = { s: 'The Open Sea', w: 'The Verdant Wilds', g: 'The Gloamwood', f: 'The Gloomfen', h: 'The Hearthsea', p: 'The Ironspire Peaks', k: 'The Sunscorch Wastes' };
export function regionAt(x, z) {
  const c = Math.floor((x / MAP.w + 0.5) * 12), r = Math.floor((z / MAP.h + 0.5) * 8);
  if (c < 0 || c > 11 || r < 0 || r > 7) return NAMES.s;
  return NAMES[GRID[r][c]];
}

const SKY_GLSL = `
  vec3 skyColor(vec3 d, vec3 sun) {
    float h = d.y, s = max(dot(normalize(vec3(d.x, max(d.y, 0.0), d.z)), sun), 0.0);
    vec3 zen = vec3(0.13, 0.3, 0.66), mid = vec3(0.36, 0.58, 0.88), hor = vec3(0.84, 0.88, 0.93), warm = vec3(1.0, 0.86, 0.66);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h));
    c = mix(c, zen, smoothstep(0.2, 0.9, h));
    c = mix(c, warm, pow(s, 5.0) * 0.55 * (1.0 - smoothstep(0.0, 0.5, h)));
    return c;
  }`;
export const HAZE = new THREE.Color(0xc9d6e6);

function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun; ${SKY_GLSL}
      void main() { vec3 d = normalize(vDir); float s = max(dot(d, uSun), 0.0);
        vec3 c = skyColor(d, uSun) + vec3(1.0, 0.92, 0.75) * (pow(s, 120.0) * 0.9 + smoothstep(0.9993, 0.9996, s) * 4.0);
        c = mix(c, vec3(0.78, 0.84, 0.92), smoothstep(0.0, -0.2, d.y));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), mat);
  m.scale.setScalar(50000); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// cloud shadows on the ground, and the deck of cloud itself, share one pattern so the shadows line up
const CLOUD_GLSL = `
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.07 + 13.3; a *= 0.5; } return v; }
  float cover(vec2 xz, float t) { vec2 p = xz * 0.00045 + vec2(t * 0.0022, t * 0.0009); return smoothstep(0.44, 0.64, fbm(p) * 0.85 + fbm(p * 3.3 + 7.0) * 0.25); }`;

// A map tile: 1920 x 1280 pixels of map with a 16-pixel border copied from its neighbours all round (1952 x 1312), so
// the seams between tiles don't show when the far ground is drawn small
const TILE = { w: 1952, h: 1312, border: 16 };
function loadTexture(url, renderer) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    t.offset.set(TILE.border / TILE.w, TILE.border / TILE.h); t.repeat.set(1 - 2 * TILE.border / TILE.w, 1 - 2 * TILE.border / TILE.h);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; res(t);
  }, undefined, rej));
}

// Close to the ground the map's pixels would show, so below about 900 m a fine grain is laid over it, fixed to the
// ground (finer grain where there's room for it on screen, none where it would only shimmer), a little stronger in the
// woods, and slow ripples on the water. The map stays the only source of what's where. (The idea, and much of how,
// from the same version Chris sent.)
const DETAIL_GLSL = `
  float gh(vec2 p) { vec3 q = fract(vec3(p.x, p.y, p.x + p.y) * vec3(0.1031, 0.11369, 0.13787)); q += dot(q, q.yzx + 19.19); return fract((q.x + q.y) * q.z); }
  float gn(vec2 p) { vec2 c = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gh(c), gh(c + vec2(1.0, 0.0)), f.x), mix(gh(c + vec2(0.0, 1.0)), gh(c + vec2(1.0)), f.x), f.y) - 0.5; }
  float grainAt(vec2 p, float freq, float footprint) { return (1.0 - smoothstep(0.16, 0.9, footprint * freq)) * gn(p * freq); }
  vec3 groundDetail(vec3 col, vec3 w, float t) {
    float near = 1.0 - smoothstep(250.0, 950.0, abs(cameraPosition.y - w.y));
    if (near < 0.001) return col;
    float footprint = max(length(dFdx(w.xz)), length(dFdy(w.xz)));
    float water = smoothstep(1.1, 1.55, max(col.b, col.g) / max(col.r, 0.006)) * smoothstep(0.55, 0.95, col.b / max(col.g, 0.006));
    float wood = smoothstep(1.0, 1.5, col.g / max(col.r, 0.006)) * (1.0 - water);
    float grain = 0.52 * grainAt(w.xz, 0.36, footprint) + 0.3 * grainAt(w.xz + 7.37, 0.95, footprint) + 0.18 * grainAt(w.xz - 3.81, 2.35, footprint);
    float ripple = (0.55 * sin(dot(w.xz, vec2(0.7, 0.41)) + t * 0.23) + 0.45 * sin(dot(w.xz, vec2(-0.26, 0.67)) - t * 0.18)) * (1.0 - smoothstep(0.16, 0.9, footprint * 0.82));
    return col * (1.0 + near * mix(grain * (0.1 + 0.035 * wood), grain * 0.02 + ripple * 0.028, water));
  }`;

export async function makeWorld(renderer) {
  const group = new THREE.Group();
  const time = { value: 0 };
  group.add(makeSky());

  // the map: nine tiles, each 7.68 x 5.12 km, its colours kept as painted, with cloud shadows passing over and the fine
  // grain close to
  const urls = [tile1, tile2, tile3, tile4, tile5, tile6, tile7, tile8, tile9];
  const textures = await Promise.all(urls.map((u) => loadTexture(u, renderer)));
  const tw = MAP.w / 3, th = MAP.h / 3;
  const shade = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time; sh.uniforms.uSun = { value: SUN };
      sh.vertexShader = 'varying vec3 vWorld;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vWorld;\nuniform float uTime;\nuniform vec3 uSun;\n' + CLOUD_GLSL + '\n' + DETAIL_GLSL + '\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\ndiffuseColor.rgb = groundDetail(diffuseColor.rgb, vWorld, uTime);\nvec2 sp = vWorld.xz - uSun.xz / uSun.y * ' + CLOUD_Y.toFixed(1) + ';\ndiffuseColor.rgb *= 1.0 - 0.38 * cover(sp, uTime);');
    };
    mat.customProgramCacheKey = () => 'ground-cloud-shadow-detail';
    return mat;
  };
  textures.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tw, th).rotateX(-Math.PI / 2), shade(new THREE.MeshBasicMaterial({ map: t, toneMapped: false })));
    m.position.set(-MAP.w / 2 + tw * (col + 0.5), 0, -MAP.h / 2 + th * (row + 0.5));
    group.add(m);
  });
  // the open sea past the map's edges, the same deep blue as the map's own sea at its edges. It's drawn first and the
  // map over it: laid just under the map instead, the two would flicker where the far ground is too far off to tell
  // them apart
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160000, 160000).rotateX(-Math.PI / 2), shade(new THREE.MeshBasicMaterial({ color: 0x002951, toneMapped: false, depthWrite: false })));
  sea.renderOrder = -5; group.add(sea);

  // the deck of cloud: white and gold-edged from above, grey from beneath, gaps where the ground shows through
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(160000, 160000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: time, uSun: { value: SUN } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime; uniform vec3 uSun; ${SKY_GLSL} ${CLOUD_GLSL}
      void main() {
        float c = cover(vW.xz, uTime);
        float lit = cover(vW.xz + uSun.xz * 160.0, uTime);
        vec3 top = mix(vec3(1.0, 0.97, 0.92), vec3(0.74, 0.77, 0.86), lit * 0.6) ;
        vec3 under = vec3(0.62, 0.65, 0.72);
        vec3 col = cameraPosition.y > vW.y ? top : under;
        vec3 toCam = vW - cameraPosition; float d = length(toCam);
        vec3 haze = skyColor(normalize(vec3(toCam.x, 0.0, toCam.z)), uSun);
        float fade = smoothstep(9000.0, 38000.0, d);
        col = mix(col, haze, fade);
        gl_FragColor = vec4(col, c * 0.94 * (1.0 - fade * 0.25));
        #include <colorspace_fragment>
      }`,
  }));
  deck.position.y = CLOUD_Y; deck.renderOrder = 1; group.add(deck);

  // big drifting clouds at the ship's height, kept round the ship as it flies
  const puffs = makePuffs();
  group.add(puffs.mesh);

  return { group, time, puffs, deck };
}

// A soft cumulus picture drawn once, and instanced billboards of it
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const x = 60 + rnd() * 136, y = 92 + rnd() * 90 - (i < 8 ? 30 : 0), r = 28 + rnd() * 44;
    const grd = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
    const shade = 225 + Math.round(rnd() * 30);
    grd.addColorStop(0, `rgba(${shade},${shade},${Math.min(255, shade + 8)},0.85)`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makePuffs() {
  const N = 110, SPAN = 14000;
  const geo = new THREE.PlaneGeometry(1, 1);
  const offs = new Float32Array(N * 3), sizes = new Float32Array(N);
  let seed = 9; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) { offs.set([rnd() * SPAN, 520 + rnd() * 1500, rnd() * SPAN], i * 3); sizes[i] = 260 + rnd() * 520; }
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offs, 3));
  geo.setAttribute('size', new THREE.InstancedBufferAttribute(sizes, 1));
  const ig = new THREE.InstancedBufferGeometry().copy(geo); ig.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uMap: { value: cloudTexture() }, uCenter: { value: new THREE.Vector3() }, uSpan: { value: SPAN }, uSun: { value: SUN } },
    vertexShader: `attribute vec3 offset; attribute float size; uniform vec3 uCenter; uniform float uSpan; varying vec2 vUv; varying float vFade;
      void main() {
        vec3 p = offset; p.xz = uCenter.xz + mod(offset.xz - uCenter.xz + uSpan * 0.5, uSpan) - uSpan * 0.5;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += position.xy * vec2(size * 1.6, size);
        float d = length(p.xz - uCenter.xz);
        vFade = 1.0 - smoothstep(uSpan * 0.32, uSpan * 0.5, d);
        vFade *= smoothstep(60.0, 260.0, -mv.z);
        vUv = uv; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; varying float vFade;
      void main() { vec4 c = texture2D(uMap, vUv); c.rgb *= mix(0.82, 1.06, vUv.y); c.a *= vFade * 0.9; if (c.a < 0.01) discard; gl_FragColor = c;
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(ig, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 2;
  return { mesh, follow: (p) => mat.uniforms.uCenter.value.copy(p) };
}
