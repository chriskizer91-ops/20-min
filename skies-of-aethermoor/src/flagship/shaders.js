// shaders.js: what the flagship's materials add to three.js's own shaders. Each feature is switched on per material:
//   RIG     the working parts: turn round a pivot, slide along an axis, furl towards the yard (rig.js)
//   RIPPLE  sails and pennants rippling in the wind (a furled sail stops rippling)
//   HOLES   sails torn by shot: holes with scorched edges open as the sails' health falls
//   SCORCH  the hull charred by shot, then holed and smouldering as its health falls
//   STRAKE  the gun strake painted in the Captain's plum (or a raider's rust)
//   GEM     sunstone crystals going dark one by one as the crystals' health falls
//   FLOW    the aether conduits: pulses of light running to the sails, the guns or the lift vents, as bright as the
//           share of crystal power each gets
// The numbers they read live in one set of uniforms per ship, so each ship shows its own damage.
import * as THREE from 'three';
import { CHANNELS } from './rig.js';

export function shipUniforms() {
  return {
    uTime: { value: 0 },
    uRig: { value: Array.from({ length: CHANNELS }, () => new THREE.Vector3()) },
    uSailDmg: { value: 0 }, uHullDmg: { value: 0 }, uCrystal: { value: 1 },
    uPow: { value: new THREE.Vector3(1 / 3, 1 / 3, 1 / 3) },
    uStrake: { value: new THREE.Vector4(-0.9, -2.7, 1, 0) },
    uPaint: { value: new THREE.Color(0x6a2456) },
    uFlowColor: { value: new THREE.Color(0xff7418) },
  };
}

const NOISE = /* glsl */`
  float fh3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float fvn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(fh3(i), fh3(i + vec3(1, 0, 0)), f.x), mix(fh3(i + vec3(0, 1, 0)), fh3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(fh3(i + vec3(0, 0, 1)), fh3(i + vec3(1, 0, 1)), f.x), mix(fh3(i + vec3(0, 1, 1)), fh3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float ffbm(vec3 p) { return fvn(p) * 0.58 + fvn(p * 2.13 + 7.1) * 0.29 + fvn(p * 4.7 + 3.3) * 0.13; }`;

const VERT_HEAD = /* glsl */`
  varying vec3 vRest;
  varying float vTag;
  attribute float tag;
  uniform float uTime;
  #ifdef RIG
    attribute float rig; attribute vec3 rigP; attribute vec3 rigA; attribute vec3 rigF;
    uniform vec3 uRig[${CHANNELS}];
    vec3 rigRot(vec3 v, vec3 a, float t) { float c = cos(t), s = sin(t); return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c); }
  #endif
  #ifdef RIPPLE
    attribute float billow;
  #endif
`;
const NORMAL_V = /* glsl */`
  #include <beginnormal_vertex>
  #ifdef RIG
  { float k_ = floor(rig + 0.0005); float w_ = 1.0 - (rig - k_) / 0.999; objectNormal = rigRot(objectNormal, rigA, uRig[int(k_)].x * w_); }
  #endif
`;
const BEGIN_V = /* glsl */`
  #include <begin_vertex>
  vRest = position; vTag = tag;
  float rFurl = 0.0;
  #ifdef RIG
    float rK = floor(rig + 0.0005); float rW = 1.0 - (rig - rK) / 0.999; vec3 rS = uRig[int(rK)]; rFurl = rS.z;
  #endif
  #ifdef RIPPLE
    #ifdef PENNANT
      transformed.x += billow * (sin(uTime * 5.5 - billow * 9.0) * 0.32 + sin(uTime * 3.1 - billow * 5.0) * 0.12);
      transformed.y -= billow * billow * 0.35;
    #else
      transformed += normal * billow * (1.0 - rFurl) * (sin(uTime * 2.3 + position.x * 0.9 + position.y * 0.6) * 0.05 + sin(uTime * 3.7 + position.z * 1.3) * 0.025);
    #endif
  #endif
  #ifdef RIG
    transformed += rigF * rFurl;
    transformed = rigP + rigRot(transformed - rigP, rigA, rS.x * rW) + rigA * rS.y * rW;
  #endif
`;

const FRAG_HEAD = /* glsl */`
  varying vec3 vRest;
  varying float vTag;
  uniform float uTime, uSailDmg, uHullDmg, uCrystal;
  uniform vec3 uPow, uPaint, uFlowColor;
  uniform vec4 uStrake;
  ${NOISE}
`;
const COLOR_F = /* glsl */`
  #include <color_fragment>
  float dDark = 0.0; vec3 dGlow = vec3(0.0);
  #ifdef HOLES
  { float n = ffbm(vRest * 0.6); float t = uSailDmg > 0.02 ? 0.16 + uSailDmg * 0.42 : -1.0;
    if (n < t) discard;
    dDark = 1.0 - smoothstep(t, t + 0.06, n);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.06, 0.04), dDark * 0.9); }
  #endif
  #ifdef STRAKE
  { float s = smoothstep(uStrake.y - 0.012, uStrake.y + 0.012, vRest.y) * (1.0 - smoothstep(uStrake.x - 0.012, uStrake.x + 0.012, vRest.y)) * uStrake.z;
    float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    diffuseColor.rgb = mix(diffuseColor.rgb, uPaint * (0.5 + lum * 1.7), s);
    dDark = max(dDark, s * 0.75); }
  #endif
  #ifdef SCORCH
  { float n = ffbm(vRest * 0.7 + 2.0); float t = uHullDmg > 0.02 ? 0.14 + uHullDmg * 0.42 : -1.0;
    float c = 1.0 - smoothstep(t - 0.04, t + 0.025, n), hole = 1.0 - smoothstep(t - 0.13, t - 0.1, n);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.03, 0.025), c * 0.9);
    diffuseColor.rgb *= 1.0 - hole * 0.95;
    dDark = max(dDark, c);
    // a thin glowing rim round each hole once she's badly hurt, smouldering
    float ember = smoothstep(t - 0.12, t - 0.1, n) * (1.0 - smoothstep(t - 0.095, t - 0.075, n));
    dGlow += vec3(1.0, 0.22, 0.03) * ember * smoothstep(0.4, 0.8, uHullDmg) * (0.6 + 0.4 * sin(uTime * 7.0 + vRest.z * 3.0)) * 0.9; }
  #endif
  #ifdef GEM
  { float dead = step(uCrystal, vTag); vec3 cold = vec3(0.22, 0.18, 0.3);
    diffuseColor.rgb = mix(diffuseColor.rgb, cold * (0.6 + dot(diffuseColor.rgb, vec3(0.33))), dead);
    dDark = max(dDark, dead * 0.96); }
  #endif
`;
const EMISSIVE_F = /* glsl */`
  #include <emissivemap_fragment>
  totalEmissiveRadiance *= 1.0 - dDark;
  #if defined(HOLES) && defined(USE_COLOR)
    totalEmissiveRadiance *= vColor.rgb;
  #endif
  totalEmissiveRadiance += dGlow;
  #ifdef GEM
    totalEmissiveRadiance += vec3(0.5, 0.25, 0.9) * step(uCrystal, vTag) * 0.05 * (0.5 + 0.5 * sin(uTime * 9.0 + vRest.y * 20.0));
  #endif
  #ifdef FLOW
  { float share = vTag < 0.5 ? uPow.x : vTag < 1.5 ? uPow.y : uPow.z;
    float pulse = pow(0.5 + 0.5 * sin(vFlowU * 6.2831 - uTime * (1.5 + share * 9.0)), 5.0);
    float live = smoothstep(0.0, 0.25, uCrystal);
    totalEmissiveRadiance = uFlowColor * (0.12 + share * 1.3) * (0.3 + pulse * 1.7) * live; }
  #endif
`;

// Patch a material for these features. The ship's uniforms (shipUniforms) are shared by all its materials.
export function patch(mat, U, feats) {
  const f = [...new Set(feats)].sort();
  mat.defines = { ...(mat.defines ?? {}) };
  for (const k of f) mat.defines[k] = '';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_HEAD + (f.includes('FLOW') ? 'varying float vFlowU;\n' : '') + sh.vertexShader
      .replace('#include <beginnormal_vertex>', NORMAL_V)
      .replace('#include <begin_vertex>', BEGIN_V + (f.includes('FLOW') ? 'vFlowU = uv.x;\n' : ''));
    sh.fragmentShader = FRAG_HEAD + (f.includes('FLOW') ? 'varying float vFlowU;\n' : '') + sh.fragmentShader
      .replace('#include <color_fragment>', COLOR_F)
      .replace('#include <emissivemap_fragment>', EMISSIVE_F);
  };
  mat.customProgramCacheKey = () => 'flagship:' + f.join(',');
  return mat;
}

// The shadow a moving part casts has to move with it
export function depthFor(U, feats) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const f = feats.filter((k) => k === 'RIG' || k === 'RIPPLE' || k === 'PENNANT');
  d.defines = Object.fromEntries(f.map((k) => [k, '']));
  d.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <begin_vertex>', BEGIN_V);
  };
  d.customProgramCacheKey = () => 'flagship-depth:' + f.join(',');
  return d;
}
