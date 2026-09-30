// Build the witch: node tools/build-model.mjs  ->  witch-hd.glb
// Everything is made here in code: the skeleton, every piece of her, the painted textures (from build/textures),
// skin weights, face shapes and the animations.
import * as THREE from 'three';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { GLB } from './lib/glb.mjs';
import { MeshBuilder, hexToLinear } from './lib/rig.mjs';
import { buildSkeleton } from './model/skeleton.mjs';
import { buildHead, buildEar, buildEarring, skinTint, HC } from './model/head.mjs';
import { buildFace, buildGlasses } from './model/face.mjs';
import { addHatBones, buildHat, addCharmBones, crownWeights } from './model/hat.mjs';
import { buildHair, addHairBones, hairWeights, hairColor } from './model/hair.mjs';
import { buildBoot, bootWeights } from './model/boots.mjs';
import { bakeClip, writeAnimations } from './anim/bake.mjs';
import { springSetup } from './anim/springs.mjs';
import { CLIPS } from './anim/clips.mjs';
import { buildKnife, knifePoses, buildSheath, buildWitchfire, witchfireAnchor } from './model/props.mjs';
import { buildShawl, addShawlBones, addDrapeBones, shawlWeights } from './model/shawl.mjs';
import { buildBodice, buildSkirts, buildSash, buildJewelry, addSkirtBones, skirtWeights } from './model/clothes.mjs';
import { buildChestSkin, buildNeck, buildArm, armWeights, buildHand, handWeights, buildLeg, legWeights, torsoWeights } from './model/body.mjs';

const OUT = process.argv[2] ?? 'witch-hd.glb';
const skel = buildSkeleton();
addHatBones(skel);
addHairBones(skel);
addSkirtBones(skel);
addShawlBones(skel);
const KNIFE = knifePoses(skel);
skel.add('athame', 'hips', new THREE.Vector3().setFromMatrixPosition(KNIFE.sheathed).toArray());
skel.add('witchfire', 'hand_L', witchfireAnchor(skel).toArray());

// ---------------------------------------------------------------- materials
// Colors are the Moonlight Witch's from Follow Me Down Witch Way (sRGB hex).
const MATERIALS = {
  skin: { color: '#f4cfae', rough: 0.62 },
  nail: { color: '#6e1f4f', rough: 0.25 },
  sleeve: { color: '#1c1522', rough: 0.8 },
  stocking: { color: '#231a29', rough: 0.45 },
  gold: { color: '#e6bf68', rough: 0.28, metal: 1 },
  silver: { color: '#dfe3ec', rough: 0.22, metal: 1 },
  eyeOpen: { tex: 'eye-open.png', blend: true, rough: 0.3 },
  eyeClosed: { tex: 'eye-closed.png', blend: true, rough: 0.5 },
  mouth: { tex: 'mouths.png', blend: true, rough: 0.5 },
  brow: { color: '#4a2a20', rough: 0.8 },
  glass: { color: '#e8e4ff', rough: 0.05, alpha: 0.14, blend: true },
  felt: { tex: 'felt.jpg', rough: 0.9 },
  band: { color: '#2a1826', rough: 0.7 },
  horn: { color: '#ead9b4', rough: 0.4 },
  hair: { color: '#7e4d37', rough: 0.48 },
  dress: { tex: 'dress.jpg', rough: 0.75 },
  dressDark: { tex: 'dress.jpg', color: '#b8a8c8', rough: 0.7 },
  lace: { color: '#3f3150', rough: 0.8 },
  laceCord: { color: '#7a2a58', rough: 0.6 },
  sash: { color: '#561c3f', rough: 0.55 },
  leather: { tex: 'leather.jpg', rough: 0.5 },
  velvet: { color: '#1b1019', rough: 0.95 },
  amethyst: { color: '#8a5cc8', rough: 0.08 },
  shawl: { tex: 'shawl.jpg', rough: 0.85 },
  boot: { tex: 'leather.jpg', rough: 0.42 },
  bootDark: { color: '#1c1311', rough: 0.6 },
  sole: { color: '#171110', rough: 0.75 },
  bootLace: { color: '#3a2622', rough: 0.7 },
  blade: { color: '#dde3ee', rough: 0.14, metal: 1 },
  grip: { color: '#2e1c18', rough: 0.55 },
  moonstone: { color: '#e4e8ff', rough: 0.08, emissive: '#8c8cff', glow: 0.6 },
  flameOuter: { color: '#8a3cff', alpha: 0.5, blend: true, emissive: '#8a3cff', glow: 2.2 },
  flameMid: { color: '#c77dff', alpha: 0.72, blend: true, emissive: '#c77dff', glow: 3 },
  flameCore: { color: '#f6e8ff', alpha: 0.95, blend: true, emissive: '#f1dcff', glow: 4 },
  strap: { tex: 'leather.jpg', color: '#c89a8a', rough: 0.45 },
};

const meshes = {
  Body: new MeshBuilder('Body', skel),
  Face: new MeshBuilder('Face', skel, { morphs: ['Blink', 'Smile', 'Surprise', 'Pain'] }),
  Accessories: new MeshBuilder('Accessories', skel),
  Hat: new MeshBuilder('Hat', skel),
  Hair: new MeshBuilder('Hair', skel),
  Dress: new MeshBuilder('Dress', skel),
  Shawl: new MeshBuilder('Shawl', skel),
  Boots: new MeshBuilder('Boots', skel),
  Athame: new MeshBuilder('Athame', skel),
  Witchfire: new MeshBuilder('Witchfire', skel),
};

// ---------------------------------------------------------------- body
const head = buildHead();
head.move(HC.x, HC.y, HC.z);
meshes.Body.add(head, { mat: 'skin', bone: 'head', color: (p) => skinTint(p.clone().sub(HC)) });
for (const s of [1, -1]) {
  const ear = buildEar(s).move(HC.x, HC.y, HC.z);
  meshes.Body.add(ear, { mat: 'skin', bone: 'head', color: [1, 0.93, 0.9] });
  meshes.Body.add(buildEarring(s).move(HC.x, HC.y, HC.z), { mat: 'gold', bone: 'head' });
}
for (const f of buildFace()) {
  f.geo.move(HC.x, HC.y, HC.z);
  meshes.Face.add(f.geo, { mat: f.mat, bone: 'head', morphs: f.morphs && Object.fromEntries(Object.entries(f.morphs).map(([k, fn]) => [k, (p, i, g) => fn(p.clone().sub(HC), i, g)])) });
}
const glasses = buildGlasses();
meshes.Accessories.add(glasses.frame.move(HC.x, HC.y, HC.z), { mat: 'gold', bone: 'head' });
meshes.Accessories.add(glasses.lenses.move(HC.x, HC.y, HC.z), { mat: 'glass', bone: 'head' });
meshes.Body.add(buildNeck(), { mat: 'skin', weights: (p) => (p.y > 0.95 ? [['head', 1]] : p.y > 0.87 ? [['neck', 1 - Math.max(0, (p.y - 0.92) / 0.03)], ['head', Math.max(0, (p.y - 0.92) / 0.03)]] : [['neck', Math.max(0, (p.y - 0.83) / 0.04)], ['chest', 1 - Math.max(0, (p.y - 0.83) / 0.04)]]) });
meshes.Body.add(buildChestSkin(), { mat: 'skin', weights: torsoWeights });
for (const s of [1, -1]) {
  meshes.Body.add(buildArm(skel, s), { mat: 'sleeve', weights: armWeights(skel, s) });
  const hw = handWeights(skel, s);
  for (const part of buildHand(skel, s)) {
    const isNail = (part.extra?.finger?.[0] ?? -1) >= 10;
    meshes.Body.add(part, { mat: isNail ? 'nail' : 'skin', weights: hw });
  }
  meshes.Body.add(buildLeg(skel, s), { mat: 'stocking', weights: legWeights(skel, s) });
}

// ---------------------------------------------------------------- hat
{
  const { parts, charms } = buildHat(skel);
  addCharmBones(skel, charms);
  const cw = crownWeights(skel);
  // Horns: warm and darker toward the base, with the ridges picked out
  const hornTint = (p, n, i, g) => {
    const t = g.extra?.t?.[i] ?? 0;
    const ridge = Math.pow(Math.max(0, Math.sin(t * 110 - 0.6)), 4);
    const k = (0.72 + 0.28 * Math.min(1, t * 2.2)) * (1 - 0.18 * ridge);
    return [k, k * 0.95, k * 0.86];
  };
  for (const p of parts) {
    if (p.part === 'crown') meshes.Hat.add(p.geo, { mat: p.mat, weights: cw });
    else meshes.Hat.add(p.geo, { mat: p.mat, bone: 'hat', color: p.part === 'horn' ? hornTint : undefined });
  }
  for (const c of charms) meshes.Hat.add(c.geo, { mat: c.mat, bone: `hat_charm${c.index}` });
}

// ---------------------------------------------------------------- hair
{
  const hw = hairWeights(skel);
  for (const part of buildHair(skel)) meshes.Hair.add(part.geo, { mat: 'hair', weights: (p, i, g) => hw(p, i, g, part), color: hairColor(part) });
}

// ---------------------------------------------------------------- dress
{
  for (const p of buildBodice()) meshes.Dress.add(p.geo, { mat: p.mat, weights: torsoWeights });
  const sw = skirtWeights();
  for (const p of buildSkirts()) meshes.Dress.add(p.geo, { mat: p.mat, weights: sw, color: (q) => { const k = 0.75 + 0.25 * Math.min(1, Math.max(0, (0.65 - q.y) / 0.2)); return [k, k, k]; } });
  for (const p of buildSash()) meshes.Dress.add(p.geo, { mat: p.mat, weights: (q) => (q.y < 0.625 ? [['hips', 1]] : torsoWeights(q)) });
  for (const p of buildJewelry(skel)) meshes.Accessories.add(p.geo, { mat: p.mat, bone: p.bone });
}

// ---------------------------------------------------------------- shawl
{
  const parts = buildShawl(skel);
  addDrapeBones(skel, parts);
  // Inner side a little darker
  const shade = (p, n, i, g) => { const s = g.extra?.side?.[i] ?? 1; const k = s < 0 ? 0.62 : 1; return [k, k, k]; };
  for (const part of parts) meshes.Shawl.add(part.geo, { mat: 'shawl', weights: shawlWeights(skel, part), color: shade });
}

// ---------------------------------------------------------------- boots
for (const side of [1, -1]) {
  const bw = bootWeights(skel, side);
  for (const p of buildBoot(skel, side)) meshes.Boots.add(p.geo, { mat: p.mat, weights: bw });
}

// ---------------------------------------------------------------- athame, sheath, witchfire
{
  const knife = buildKnife();
  for (const [g, mat] of [[knife.metal, 'blade'], [knife.gold, 'gold'], [knife.grip, 'grip'], [knife.stone, 'moonstone']]) meshes.Athame.add(g.apply(KNIFE.sheathed), { mat, bone: 'athame' });
  const sheath = buildSheath(KNIFE);
  meshes.Accessories.add(sheath.body, { mat: 'leather', bone: 'hips' });
  meshes.Accessories.add(sheath.gold, { mat: 'gold', bone: 'hips' });
  meshes.Accessories.add(sheath.straps, { mat: 'leather', bone: 'hips' });
  const fire = buildWitchfire();
  const at = skel.get('witchfire').rest;
  for (const [g, mat] of [[fire.outer, 'flameOuter'], [fire.mid, 'flameMid'], [fire.core, 'flameCore']]) meshes.Witchfire.add(g.move(at.x, at.y, at.z), { mat, bone: 'witchfire' });
}

// ---------------------------------------------------------------- write the file
const glb = new GLB();
const matIndex = {};
glb.sampler();
const texIndex = {};
const texture = (file) => {
  if (texIndex[file] == null) {
    const bytes = readFileSync(new URL(`../build/textures/${file}`, import.meta.url));
    texIndex[file] = glb.texture(glb.image(bytes, file.endsWith('.png') ? 'image/png' : 'image/jpeg', file.replace(/\.\w+$/, '')));
  }
  return texIndex[file];
};
for (const [key, m] of Object.entries(MATERIALS)) {
  const [r, g, b] = m.color ? hexToLinear(m.color) : [1, 1, 1];
  const def = { name: key, pbrMetallicRoughness: { baseColorFactor: [r, g, b, m.alpha ?? 1], metallicFactor: m.metal ?? 0, roughnessFactor: m.rough ?? 0.7 } };
  if (m.tex) def.pbrMetallicRoughness.baseColorTexture = { index: texture(m.tex) };
  if (m.doubleSided) def.doubleSided = true;
  if (m.blend) def.alphaMode = 'BLEND';
  if (m.mask) { def.alphaMode = 'MASK'; def.alphaCutoff = m.mask; }
  if (m.emissive) { def.emissiveFactor = hexToLinear(m.emissive); if (m.glow) def.extensions = { KHR_materials_emissive_strength: { emissiveStrength: m.glow } }; }
  matIndex[key] = glb.material(def);
}

// Bones as nodes (rest pose: translations only)
// Bones that start hidden (scaled down): the witchfire only burns while she casts
const HIDDEN = new Set(['witchfire']);
const boneNodes = skel.bones.map((b) => glb.node({ name: b.name, translation: b.local.toArray().map((x) => +x.toFixed(6)), ...(HIDDEN.has(b.name) ? { scale: [0.001, 0.001, 0.001] } : {}) }));
skel.bones.forEach((b, i) => { if (b.children.length) glb.json.nodes[boneNodes[i]].children = b.children.map((c) => boneNodes[c.index]); });
const ibm = new Float32Array(skel.bones.length * 16);
skel.bones.forEach((b, i) => ibm.set(new THREE.Matrix4().makeTranslation(-b.rest.x, -b.rest.y, -b.rest.z).elements, i * 16));
glb.json.skins.push({ name: 'Witch', joints: boneNodes, skeleton: boneNodes[0], inverseBindMatrices: glb.accessor(ibm, 'MAT4') });

const meshNodes = [];
let tris = 0, faceNode = null;
for (const [name, mb] of Object.entries(meshes)) {
  if (!mb.prims.length) continue;
  const mesh = mb.emit(glb, matIndex, new Set(Object.keys(MATERIALS).filter((k) => MATERIALS[k].tex)));
  meshNodes.push(glb.node({ name, mesh, skin: 0 }));
  if (name === 'Face') faceNode = meshNodes.at(-1);
  tris += mb.tris;
  console.log(`${name.padEnd(12)} ${mb.tris.toLocaleString().padStart(9)} triangles`);
}
// ---------------------------------------------------------------- animations
const only = process.env.CLIPS?.split(',');
const springs = springSetup(skel);
const athameI = skel.get('athame').index, fireI = skel.get('witchfire').index, hipsI = skel.get('hips').index, handRI = skel.get('hand_R').index;
const handRest = new THREE.Matrix4().makeTranslation(skel.get('hand_R').rest);
const knifeFix = new THREE.Matrix4().copy(handRest).invert().multiply(KNIFE.held).multiply(KNIFE.sheathed.clone().invert()).multiply(new THREE.Matrix4().makeTranslation(skel.get('athame').rest));
const extras = (pose) => {
  // Witchfire: sized by the clip, always burning upright
  pose.s[fireI] = Math.max(0.001, pose.fire);
  pose.q[fireI].copy(pose.worldQuat('hand_L').invert());
  // Athame: in the sheath, or carried by her right hand
  if (pose.athame > 0.5) {
    const world = new THREE.Matrix4().multiplyMatrices(pose.W[handRI], knifeFix);
    const local = new THREE.Matrix4().copy(pose.W[hipsI]).invert().multiply(world);
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    local.decompose(pos, q, sc);
    pose.t[athameI].copy(pos.sub(skel.get('athame').local));
    pose.q[athameI].copy(q);
  }
};
const baked = [];
for (const clip of CLIPS) {
  if (only && !only.includes(clip.name)) continue;
  const t0 = Date.now();
  baked.push(bakeClip(skel, clip, springs, extras));
  console.log(`clip ${clip.name.padEnd(14)} ${clip.duration.toFixed(2)}s  (${Date.now() - t0} ms)`);
}
writeAnimations(glb, skel, baked, boneNodes, faceNode, meshes.Face.morphs);

// The armature under one named node; the skinned meshes sit at the scene's root, as glTF recommends
const top = glb.node({ name: 'MoonlightWitch', children: [boneNodes[0]] });
glb.json.scenes[0].nodes.push(top, ...meshNodes);

const buf = glb.toBuffer();
writeFileSync(OUT, buf);
console.log(`${OUT}: ${tris.toLocaleString()} triangles, ${skel.bones.length} bones, ${(buf.length / 1e6).toFixed(2)} MB`);
