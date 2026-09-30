import * as THREE from 'three';
import { joint, sphere, cone, taperedTube, blobShadow, onLayer, Spring } from './kit.js';
import { mat, glowMat, inkMat, makePart, paint, glow, Strands, Particles, Pulses, movePlayer, window4, ss, lerp, rng, flash, mergeParts, TAU } from './bosses-kit.js';

// The Willow-Wight (docs/LORE.md §7; Aethermoor's `willow-wight`): "a weeping black willow that pulled up its
// roots". A willow that walked when Willowmurk's wards went dark. It weeps as it comes, and its switches hold on.
// Intents: Lash (Rooted), Weep (Regenerating), Bough-Fall (charging). Beaten, it roots and sleeps, "only a
// willow again". Nothing here is wicked: the face in its bark is sad and sleepy, never cruel.
//
// Built like the witch: a gnarled trunk (bark painted in code) with a face, four root-feet that step, two boughs
// for arms, and a crown of long fronds (one mesh per cluster, each frond on its own spring) that sway and trail.

const C = {
  bark: '#3a302b', barkDark: '#211a17', barkLight: '#5d4d42', hollow: '#0f0a09', eye: '#d9f59c', tear: '#8ff0c8',
  leaf: '#3d5a3a', leafDark: '#2a3f2b', leafLight: '#86a86a', moss: '#6f8a4f', mossPale: '#a9b98a', cap: '#e8dca8', capGlow: '#ffe7a3',
};

export function createWillowWight() {
  const ink = inkMat('#12091a', { scale: 1.25 });
  const thin = inkMat('#12091a', { scale: 0.7 });
  const part = makePart(ink);
  const { map: barkTex, cracks } = makeBarkTexture();
  const leafTex = makeLeafTexture();
  const barkMat = mat('#ffffff', { map: barkTex, emissive: new THREE.Color('#000000'), emissiveMap: cracks });
  const barkLimb = mat('#ffffff', { map: barkTex.clone(), emissive: new THREE.Color('#000000'), emissiveMap: cracks.clone() });
  barkLimb.map.repeat.set(1, 3);
  barkLimb.emissiveMap.repeat.set(1, 3);
  const leafMat = mat('#ffffff', { map: leafTex, vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color('#000000') });
  const canopyMat = mat('#ffffff', { map: makeCanopyTexture(), emissive: new THREE.Color('#000000') });
  const hollowMat = mat(C.hollow, { rim: 0 });
  const mossMat = mat(C.moss, { vertexColors: true });
  const own = [barkMat, barkLimb, leafMat, canopyMat, mossMat];

  const root = new THREE.Group();
  root.name = 'willow-wight';
  const body = joint(root, [0, 0, 0], 'body');
  const base = joint(body, [0, 0.62, 0], 'base');

  // ---------------------------------------------------------------- trunk
  // A gnarled trunk that flares into its roots at the bottom, narrows, swells again where the face is, and
  // splits into boughs at the top. Ridges twist as they climb; the front is smoother, for the face.
  const trunk = joint(base, [0, 0, 0], 'trunk');
  const T = { h: 1.62, y0: -0.32 };
  const trunkR = (t, a) => {
    const prof = 0.25 + 0.24 * Math.pow(1 - ss(t, 0, 0.3), 1.6) + 0.035 * Math.sin(ss(t, 0.25, 0.8) * Math.PI) + 0.1 * ss(t, 0.82, 1);
    const front = Math.pow(Math.max(0, Math.sin(a)), 3) * ss(t, 0.3, 0.42) * (1 - ss(t, 0.78, 0.88));
    const ridge = 0.075 * Math.sin(a * 6 + t * 3.5) + 0.04 * Math.sin(a * 11 - t * 6);
    // the flare splits into the four roots
    const roots = (1 - ss(t, 0, 0.28)) * 0.35 * Math.pow(Math.abs(Math.sin(a * 2)), 3);
    return prof * (1 + ridge * (1 - front * 0.9) + roots);
  };
  const trunkOff = (t) => [Math.sin(t * Math.PI) * 0.03, 0, Math.sin(t * Math.PI * 0.9) * 0.06 + t * t * 0.04];
  const trunkGeo = (() => {
    const g = new THREE.CylinderGeometry(1, 1, T.h, 24, 18, true);
    g.translate(0, T.h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y / T.h;
      const a = Math.atan2(z, x);
      const r = trunkR(t, a);
      const [ox, , oz] = trunkOff(t);
      p.setXYZ(i, Math.cos(a) * r + ox, y + T.y0, Math.sin(a) * r + oz);
    }
    g.computeVertexNormals();
    return g;
  })();
  part(trunk, trunkGeo, barkMat);
  part(trunk, new THREE.CircleGeometry(0.5, 16), barkMat, { rot: [Math.PI / 2, 0, 0], pos: [0, T.y0 + 0.01, 0], ink: false });
  // Where a point on the bark is (t up the trunk, a around it; π/2 is the front), pushed out by `out`.
  const onBark = (t, a, out = 0) => {
    const r = trunkR(t, a) + out;
    const [ox, , oz] = trunkOff(t);
    return [Math.cos(a) * r + ox, t * T.h + T.y0, Math.sin(a) * r + oz];
  };

  // ---------------------------------------------------------------- root-feet
  // Four roots it walks on, two in front and two behind, coming out of the flare. Each has a thigh (out and
  // down) and a foot that runs along the ground and splits into rootlets.
  const legs = [];
  const groundY = -0.62;
  for (const [i, a] of [Math.PI / 2 - 0.78, Math.PI / 2 + 0.78, -Math.PI / 2 - 0.82, -Math.PI / 2 + 0.82].entries()) {
    const hy = -0.12;
    const hr = trunkR(0.12, a) * 0.72;
    const hip = joint(base, [Math.cos(a) * hr, hy, Math.sin(a) * hr]);
    hip.rotation.order = 'YXZ';
    const yaw = Math.PI / 2 - a; // local +z points out along a
    hip.rotation.y = yaw;
    const big = i < 2 ? 1 : 0.88;
    part(hip, taperedTube([[0, 0.14, -0.12], [0, 0.04, 0.06], [0, -0.1, 0.2], [0, -0.26, 0.3]], 0.15 * big, 0.085 * big, 10, 8), barkLimb);
    const knee = joint(hip, [0, -0.26, 0.3]);
    const dy = groundY - hy + 0.26; // from the knee down to the ground
    const foot = mergeParts([
      { geo: taperedTube([[0, 0.03, -0.03], [0, dy * 0.5, 0.08], [0, dy * 0.92, 0.22], [0, dy, 0.38]], 0.085 * big, 0.045 * big, 8, 7) },
      { geo: taperedTube([[0, dy + 0.01, 0.3], [0.09, dy, 0.42], [0.17, dy, 0.47]], 0.035, 0.008, 6, 5) },
      { geo: taperedTube([[0, dy + 0.01, 0.3], [-0.08, dy, 0.44], [-0.14, dy, 0.52]], 0.035, 0.008, 6, 5) },
      { geo: taperedTube([[0, dy + 0.01, 0.34], [0.01, dy, 0.48], [0.03, dy, 0.6]], 0.035, 0.008, 6, 5) },
    ]);
    part(knee, foot, barkLimb);
    legs.push({ hip, knee, a, yaw, dy, front: i < 2, side: Math.cos(a) > 0 ? 1 : -1 });
  }
  // Moss and three pale mushrooms on the front-left root
  const shrooms = joint(legs[0].knee, [0, 0, 0]);
  const capMat = mat(C.cap, { emissive: new THREE.Color(C.capGlow), emissiveIntensity: 0.35 });
  const dy0 = legs[0].dy;
  for (const [x, y, z, s] of [[0.05, dy0 * 0.45, 0.1, 1], [-0.045, dy0 * 0.7, 0.16, 0.8], [0.02, dy0 * 0.9, 0.26, 0.6]]) {
    part(shrooms, new THREE.CylinderGeometry(0.008 * s, 0.012 * s, 0.07 * s, 5), mat('#d8cfb0'), { pos: [x, y + 0.03 * s, z], ink: false });
    part(shrooms, new THREE.SphereGeometry(0.035 * s, 10, 6, 0, TAU, 0, Math.PI / 2), capMat, { pos: [x, y + 0.065 * s, z], scale: [1, 0.7, 1], ink: thin });
  }

  // ---------------------------------------------------------------- the face in the bark
  const face = joint(trunk, [0, 0, 0], 'face');
  const eyes = [-1, 1].map((side) => {
    const a = Math.PI / 2 + side * 0.36;
    const [x, y, z] = onBark(0.66, a, -0.015);
    const eye = joint(face, [x, y, z]);
    eye.rotation.y = -side * 0.36;
    part(eye, sphere(0.1, 16, 12), hollowMat, { scale: [1.05, 0.82, 0.45] });
    const pupil = new THREE.Mesh(sphere(0.042, 14, 10), glowMat(C.eye));
    pupil.position.set(0, -0.012, 0.036);
    pupil.scale.set(1, 1.1, 0.5);
    eye.add(pupil);
    // a little white catch-light, so the eyes look wet and kind
    const catchLight = new THREE.Mesh(sphere(0.011, 8, 6), glowMat('#ffffff'));
    catchLight.position.set(side * -0.012, 0.014, 0.022);
    pupil.add(catchLight);
    const shine = glow(C.eye, 0.24, 0.55);
    shine.position.z = 0.04;
    eye.add(shine);
    // The heavy lid: sleepy by nature, shut when it sleeps
    // (tilted so the outer corners droop: sad, not cross)
    const lidTilt = joint(eye, [0, 0.004, 0.004]);
    lidTilt.rotation.z = side * 0.32;
    const lid = part(lidTilt, new THREE.SphereGeometry(0.11, 16, 8, 0, TAU, 0, Math.PI * 0.55), barkMat, { scale: [1.08, 1, 0.6], ink: thin });
    lid.rotation.x = -0.9;
    // A heavy bark brow, sloping up toward the middle: sad, not cross
    const [ix, iy, iz] = onBark(0.745, Math.PI / 2 + side * 0.12, 0.02);
    const [ox2, oy2, oz2] = onBark(0.715, Math.PI / 2 + side * 0.62, 0.0);
    const [mx0, my0, mz0] = onBark(0.74, Math.PI / 2 + side * 0.36, 0.045);
    part(face, taperedTube([[ix, iy + 0.03, iz - 0.01], [mx0, my0, mz0], [ox2, oy2 - 0.03, oz2]], 0.04, 0.022, 10, 7), barkLimb);
    // A tear track, wet and faintly glowing
    const [tx, ty, tz] = onBark(0.61, a + side * 0.04, 0.006);
    const [mx, my, mz] = onBark(0.52, a + side * 0.1, 0.014);
    const [bx, by, bz] = onBark(0.42, a + side * 0.13, 0.006);
    part(face, taperedTube([[tx, ty, tz], [mx, my, mz], [bx, by, bz]], 0.016, 0.007, 10, 5), glowMat(C.tear, 0.6, { blending: THREE.AdditiveBlending, depthWrite: false }), { ink: false });
    return { eye, pupil, lid, shine, side, tearFrom: new THREE.Vector3(bx, by, bz) };
  });
  // A knotted nose
  {
    const [x, y, z] = onBark(0.62, Math.PI / 2, -0.01);
    part(face, taperedTube([[x, y + 0.08, z], [x + 0.005, y + 0.0, z + 0.07], [x - 0.012, y - 0.08, z + 0.09], [x, y - 0.12, z + 0.055]], 0.055, 0.034, 12, 8), barkLimb);
  }
  // The mouth: a long, drooping hollow, and a lower lip of bark
  const mouthJ = joint(face, onBark(0.5, Math.PI / 2, -0.035));
  const mouth = part(mouthJ, sphere(0.1, 16, 10), hollowMat, { scale: [1.2, 0.4, 0.4] });
  part(mouthJ, taperedTube([[-0.12, 0.03, -0.02], [-0.065, -0.045, 0.035], [0.065, -0.045, 0.035], [0.12, 0.03, -0.02]], 0.026, 0.026, 12, 6), barkLimb);
  // A beard of hanging moss under it
  const beard = new Strands();
  const rb = rng(11);
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 0.024 + (rb() - 0.5) * 0.02, len = 0.34 + rb() * 0.26 - Math.abs(x) * 1.1;
    beard.add([[x, 0, 0], [x * 1.25, -len * 0.4, 0.03], [x * 1.1 + (rb() - 0.5) * 0.06, -len, 0.015]], 0.012, 0.003, {
      segments: 9, radial: 4, color: C.mossPale, tip: rb() < 0.5 ? C.moss : '#c4cfa8', bumps: 4, bumpAmp: 0.6, stiff: 8 + rb() * 4, damp: 1.8, wave: 0.03, lag: 1.5,
    });
  }
  beard.build(mossMat, null, part, joint(face, onBark(0.45, Math.PI / 2, -0.01)));

  // ---------------------------------------------------------------- crown: boughs, canopy and fronds
  const top = trunkOff(1);
  const crown = joint(trunk, [top[0], T.h + T.y0 - 0.06, top[2]], 'crown');
  const rc = rng(5);
  for (const b of [-2.5, -1.57, -0.64, 0.35, 2.79]) {
    const dx = Math.cos(b), dz = Math.sin(b);
    part(crown, taperedTube([[0, -0.1, 0], [dx * 0.25, 0.14, dz * 0.22], [dx * 0.55, 0.22, dz * 0.5], [dx * 0.75, 0.1, dz * 0.68]], 0.13, 0.035, 12, 7), barkLimb);
  }
  // Leafy masses on top: lumpy, drooping domes, so the crown reads as a willow's rounded head
  const clumpGeo = (r, seed, squash = 0.62) => {
    const g = new THREE.SphereGeometry(r, 28, 18);
    const p = g.attributes.position, rr = rng(seed);
    const k = [rr() * 6, rr() * 6, rr() * 6];
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let s = 1 + 0.09 * Math.sin(v.x * 7 + k[0]) * Math.sin(v.y * 6 + k[1]) + 0.06 * Math.sin(v.z * 9 + k[2]);
      // a scalloped, drooping lower edge
      const lower = ss(-v.y, -0.2, 0.5);
      s *= 1 - lower * 0.12 + lower * 0.08 * Math.sin(Math.atan2(v.z, v.x) * 9);
      p.setXYZ(i, v.x * r * s, (v.y < 0 ? v.y * 0.5 : v.y) * r * s * squash, v.z * r * s);
    }
    g.computeVertexNormals();
    return g;
  };
  const canopy = joint(crown, [0, 0.22, -0.08], 'canopy');
  part(canopy, clumpGeo(0.64, 3, 0.7), canopyMat, { pos: [0, 0.04, -0.02] });
  for (const [x, y, z, r, sd] of [[0.42, -0.06, 0.14, 0.36, 7], [-0.44, -0.05, 0.1, 0.38, 9], [0.12, 0.0, -0.46, 0.4, 13], [0.02, 0.16, 0.2, 0.32, 17], [-0.3, 0.08, -0.3, 0.36, 19]]) {
    part(canopy, clumpGeo(r, sd), canopyMat, { pos: [x, y, z] });
  }
  // The curtain: long fronds that start on top of the crown, spill over it and hang all round, except in front
  // of the face. Thin, leafy (bumps are leaf-clusters) and each on its own spring.
  const curtain = new Strands();
  const leafy = (o = {}) => ({ segments: 18, radial: 5, bumps: 13, bumpAmp: 0.95, stiff: 7 + rc() * 4, damp: 1.6, lag: 1.2, wave: 0.01, ...o });
  const shade = () => {
    const c = new THREE.Color(C.leaf).lerp(new THREE.Color(C.leafDark), rc() * 0.8);
    if (rc() < 0.25) c.lerp(new THREE.Color('#8a9a6a'), 0.45);
    return ['#' + c.getHexString(), '#' + new THREE.Color(C.leafLight).lerp(c, 0.25 + rc() * 0.45).getHexString()];
  };
  const N = 64;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / N) * TAU + (rc() - 0.5) * 0.08;
    const d = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
    if (Math.abs(d) < 0.78) continue; // leave the face (and the arms) clear
    const layer = i % 3;
    const ring = [0.86, 0.74, 0.96][layer] + (rc() - 0.5) * 0.06;
    const cx = Math.cos(a), cz = Math.sin(a);
    const len = 1.35 + rc() * 0.55 - (Math.abs(d) < 1.1 ? 0.35 : 0) - layer * 0.08;
    const top = 0.62 - layer * 0.1 + rc() * 0.05;
    const rim = 0.3 - layer * 0.08;
    const [c0, c1] = shade();
    curtain.add([
      [cx * 0.25, top, cz * 0.25 - 0.08], [cx * 0.62, top - 0.12, cz * 0.62 - 0.08], [cx * ring, rim, cz * ring - 0.08],
      [cx * (ring + 0.1), rim - len * 0.45, cz * (ring + 0.1) - 0.08], [cx * (ring + 0.06), rim - len, cz * (ring + 0.06) - 0.08],
    ], 0.016, 0.006, leafy({ color: c0, tip: c1 }));
  }
  // A shorter fringe round the rim of the crown (bangs in front, above the brow) so it never reads as a cap.
  const M = 44;
  for (let i = 0; i < M; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / M) * TAU + (rc() - 0.5) * 0.08;
    const d = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
    const front = Math.abs(d) < 0.95;
    const cx = Math.cos(a), cz = Math.sin(a);
    const ring = 0.66 + rc() * 0.08;
    const len = front ? 0.2 + rc() * 0.14 : 0.35 + rc() * 0.35;
    const topY = 0.68 + rc() * 0.06;
    const rim = 0.3 + (front ? 0.02 : 0);
    const [c0, c1] = shade();
    curtain.add([[cx * 0.15, topY, cz * 0.15 - 0.08], [cx * 0.5, topY - 0.08, cz * 0.5 - 0.08], [cx * ring, rim, cz * ring - 0.08], [cx * (ring + 0.06), rim - len, cz * (ring + 0.06) - 0.08]],
      0.018, 0.008, leafy({ color: c0, tip: c1, segments: 12, bumps: 8, stiff: 12, lag: 0.8 }));
  }
  curtain.build(leafMat, null, part, crown);

  // ---------------------------------------------------------------- the two boughs it uses as arms
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(crown, [side * 0.2, -0.3, 0.2]);
    part(shoulder, taperedTube([[-side * 0.05, 0.02, -0.03], [side * 0.2, 0.1, 0.03], [side * 0.42, 0.1, 0.1]], 0.11, 0.075, 10, 8), barkLimb);
    const elbow = joint(shoulder, [side * 0.42, 0.1, 0.1]);
    part(elbow, taperedTube([[0, 0, 0], [side * 0.2, -0.02, 0.06], [side * 0.4, -0.14, 0.1], [side * 0.5, -0.32, 0.12]], 0.075, 0.035, 12, 7), barkLimb);
    // twig fingers
    const hand = joint(elbow, [side * 0.5, -0.32, 0.12]);
    const fingers = mergeParts([
      { geo: taperedTube([[0, 0, 0], [side * 0.05, -0.08, 0.04], [side * 0.04, -0.17, 0.08]], 0.03, 0.006, 6, 5) },
      { geo: taperedTube([[0, 0, 0], [side * -0.01, -0.09, 0.07], [side * -0.04, -0.16, 0.12]], 0.028, 0.006, 6, 5) },
      { geo: taperedTube([[0, 0, 0], [side * 0.07, -0.05, -0.02], [side * 0.12, -0.11, -0.02]], 0.026, 0.006, 6, 5) },
    ]);
    part(hand, fingers, barkLimb);
    // Fronds hanging from the forearm: in a hanger that stays upright however the bough swings
    const hangers = [];
    for (const [j, [hx, hy, hz]] of [[side * 0.14, -0.01, 0.04], [side * 0.36, -0.1, 0.09]].entries()) {
      const hanger = joint(elbow, [hx, hy, hz]);
      const s = new Strands();
      for (let k = 0; k < 5; k++) {
        const ox = (k - 2) * 0.045 + (rc() - 0.5) * 0.03, oz = (rc() - 0.5) * 0.08;
        const len = (j ? 0.95 : 1.15) + rc() * 0.35;
        const [c0, c1] = shade();
        s.add([[ox, 0.02, oz], [ox * 1.4, -len * 0.3, oz], [ox * 1.6, -len * 0.7, oz * 1.2], [ox * 1.5, -len, oz]], 0.016, 0.006, leafy({ color: c0, tip: c1, lag: 1.8 }));
      }
      s.build(leafMat, null, part, hanger);
      hangers.push({ hanger, s });
    }
    return { side, shoulder, elbow, hand, hangers };
  });

  // ---------------------------------------------------------------- life: fireflies, tears, leaves, sap-light
  const fireflies = [];
  for (let i = 0; i < 5; i++) {
    const f = glow('#e9ff9a', 0.1, 0.9);
    root.add(f);
    fireflies.push({ f, a: rc() * TAU, r: 0.6 + rc() * 0.6, y: 1.2 + rc() * 1.2, s: 0.3 + rc() * 0.4, p: rc() * 6 });
  }
  const tears = new Particles(40, { color: C.tear, size: 0.05 });
  const leaves = new Particles(30, { color: '#7fa064', size: 0.06, additive: false, texture: makeLeafSprite() });
  const motes = new Particles(50, { color: '#b8ff9a', size: 0.07 });
  root.add(tears.points, leaves.points, motes.points);
  const heartGlow = glow('#a6ff9a', 1.8, 0);
  heartGlow.position.set(0, 1.35, 0.35);
  root.add(heartGlow);
  const light = new THREE.PointLight('#bfff9a', 0, 3.5, 2);
  light.position.set(0, 1.6, 0.6);
  root.add(light);
  const pulses = new Pulses(root, 3, '#b5ff9e');
  const shadow = blobShadow(0.95, 0.55);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- animation
  const moves = movePlayer({
    attack: [1.2, 0.48], lash: [1.2, 0.48], weep: [2.2, 0.6], 'bough-fall': [2.4, 0.72], cast: [2.2, 0.6],
    hurt: [0.6, 0.1], ko: [3.0, 0.9], rise: [1.4, 1],
  });
  const S = { lean: new Spring(12, 5), side: new Spring(12, 5), crownX: new Spring(18, 3), crownZ: new Spring(18, 3) };
  let time = rc() * 10, phase = 0, blinkT = 3, lookX = 0, lookY = 0, lookTX = 0, lookTY = 0, nextLook = 2;
  let shiftT = 4, shiftLeg = 0, shift = 0, tearT = 0, leafT = 0, sleep = 0, gust = 0, push = [0, 0];
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();

  const api = {
    root, name: 'Willow-Wight', height: 2.65, radius: 0.75, center: 1.3,
    // Moves: attack/lash (a whipping bough that wraps round your legs), weep (long green tears; its bark closes:
    // Regenerating; also its cast), bough-fall (lifts both boughs overhead, charging, and brings them down), hurt,
    // ko (it roots and sleeps: only a willow again), rise.
    moves: ['attack', 'lash', 'weep', 'bough-fall', 'cast', 'hurt', 'ko', 'rise'],
    play: (name, onHit, opts) => moves.play(name, onHit, opts),
    get busy() { return moves.busy; },
    update(dt, speed = 0) {
      dt = Math.min(dt, 0.05);
      time += dt;
      const moving = Math.min(1, speed / 1.2);
      phase += dt * (1.2 + speed * 1.6);
      const breathe = Math.sin(time * 0.9);

      // ---- rest pose, with a slow breathing sway
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      base.position.y = 0.62 + breathe * 0.008;
      trunk.rotation.set(S.lean.update(0.04 + breathe * 0.015, dt), 0, S.side.update(Math.sin(time * 0.5) * 0.02, dt));
      crown.rotation.set(S.crownX.update(Math.sin(time * 0.7) * 0.03, dt), Math.sin(time * 0.33) * 0.05, S.crownZ.update(Math.sin(time * 0.6 + 1) * 0.03, dt));
      for (const A of arms) {
        A.shoulder.rotation.set(0.05 + breathe * 0.02, -A.side * 0.5, A.side * (-0.3 + Math.sin(time * 0.8 + A.side) * 0.04));
        A.elbow.rotation.set(0, A.side * 0.1, A.side * -0.2);
      }
      mouth.scale.set(1.15, 0.42 + Math.max(0, breathe) * 0.05, 0.4);
      let lidOpen = 1, glowK = 0, wind = [0.05, -0.04], sway = 1;
      gust = Math.max(0, gust - dt * 1.5);
      push[0] *= Math.exp(-dt * 4);
      push[1] *= Math.exp(-dt * 4);

      // ---- roots: walking, or now and then lifting one and planting it again
      for (const L of legs) { L.hip.rotation.set(0, L.yaw, 0); L.knee.rotation.set(0, 0, 0); }
      if (moving > 0.01) {
        for (const [i, L] of legs.entries()) {
          const p = phase * Math.PI + (i === 0 || i === 3 ? 0 : Math.PI);
          const lift = Math.max(0, Math.sin(p)) * moving;
          L.hip.rotation.x = -lift * 0.35;
          L.knee.rotation.x = lift * 0.5;
          L.hip.rotation.y = L.yaw + Math.cos(p) * 0.25 * moving * (L.side);
        }
        base.position.y += Math.abs(Math.sin(phase * Math.PI)) * 0.03 * moving;
      } else if (!moves.downed && !moves.now) {
        if ((shiftT -= dt) < 0) { shiftT = 4 + rc() * 5; shift = 1; shiftLeg = Math.floor(rc() * 4); }
        if (shift > 0) {
          shift = Math.max(0, shift - dt / 1.1);
          const lift = Math.sin((1 - shift) * Math.PI);
          const L = legs[shiftLeg];
          L.hip.rotation.x = -lift * 0.3;
          L.knee.rotation.x = lift * 0.45;
          trunk.rotation.z += -L.side * lift * 0.025;
          if (shift === 0) pulses.fire(v.set(Math.cos(L.a) * 0.6, 0.02, Math.sin(L.a) * 0.6), { from: 0.05, to: 0.35, life: 0.7, peak: 0.25 });
        }
      }

      // ---- asleep (s 0-1): roots dug in, boughs up in the crown, mouth shut
      function asleep(s, dig) {
        sleep = s;
        base.position.y -= dig * 0.12;
        for (const L of legs) { L.hip.rotation.x = dig * 0.25; L.knee.rotation.x = -dig * 0.2; }
        for (const A of arms) {
          A.shoulder.rotation.y += A.side * s * 0.9;
          A.shoulder.rotation.z += A.side * s * 1.0;
          A.elbow.rotation.z += A.side * s * 0.35;
        }
        trunk.rotation.x = lerp(trunk.rotation.x, 0.02 + breathe * 0.01, s);
        mouth.scale.y = lerp(mouth.scale.y, 0.08, s);
      }

      // ---- moves
      const a = moves.step(dt);
      if (a) {
        const k = a.k, bell = Math.sin(k * Math.PI);
        const name = a.name === 'attack' ? 'lash' : a.name === 'cast' ? 'weep' : a.name;
        const R = arms[0]; // its right bough (x -)
        switch (name) {
          case 'lash': {
            // Draw the bough back, then whip it round and across the front; the fronds trail and wrap.
            const back = window4(k, 0, 0.36, 0.4, 0.5);
            const whip = window4(k, 0.4, 0.54, 0.72, 1);
            R.shoulder.rotation.y += -back * 1.1 + whip * 1.45;
            R.shoulder.rotation.z += -back * 0.55 + whip * 0.1;
            R.shoulder.rotation.x += -back * 0.2 + whip * 0.25;
            R.elbow.rotation.y += back * 0.6 - whip * 0.2 + window4(k, 0.4, 0.48, 0.5, 0.62) * 0.7;
            trunk.rotation.y = -back * 0.3 + whip * 0.35;
            trunk.rotation.x += whip * 0.1;
            body.position.z = whip * 0.3;
            mouth.scale.y += whip * 0.35;
            legs[0].hip.rotation.x = -back * 0.2;
            if (a.hit && k < 0.56) gust = 1;
            break;
          }
          case 'weep': {
            // It bows its crown and weeps, long and green, and the cuts in its bark close (a green light runs
            // up the cracks).
            const bow = window4(k, 0, 0.25, 0.8, 1);
            trunk.rotation.x += bow * 0.16;
            crown.rotation.x += bow * 0.14;
            for (const A of arms) { A.shoulder.rotation.z += A.side * bow * 0.3; A.shoulder.rotation.y += A.side * bow * 0.25; A.elbow.rotation.z += A.side * bow * 0.25; }
            lidOpen = 1 - bow * 0.85;
            glowK = window4(k, 0.3, 0.55, 0.8, 1);
            sway = 1 + bow * 0.5;
            if (bow > 0.3 && Math.random() < dt * 30) tearsAt(1);
            if (glowK > 0.1 && Math.random() < dt * 40) {
              const ang = Math.random() * TAU, r = 0.35 + Math.random() * 0.5;
              motes.spawn(Math.cos(ang) * r, 0.2 + Math.random() * 1.4, Math.sin(ang) * r, 0, 0.5 + Math.random() * 0.4, 0, 1.4);
            }
            if (a.hit && k < 0.62) pulses.fire(v.set(0, 0.03, 0), { from: 0.3, to: 1.6, life: 1.2, peak: 0.6 });
            break;
          }
          case 'bough-fall': {
            // Charging: both boughs come forward and up over its head, it leans back and creaks; then it brings
            // them down in front of it with a step.
            const up = ss(k, 0.02, 0.42) * (1 - ss(k, 0.64, 0.72));
            const down = ss(k, 0.64, 0.72) * (1 - ss(k, 0.86, 1));
            const tremble = up * Math.sin(time * 40) * 0.04 * ss(k, 0.3, 0.6);
            for (const A of arms) {
              A.shoulder.rotation.y += -A.side * (up + down) * 0.85;
              A.shoulder.rotation.z += A.side * (up * 0.55 + down * 0.3);
              A.shoulder.rotation.x += -up * 1.1 + down * 0.55 + tremble;
              A.elbow.rotation.z += A.side * up * 0.3;
              A.elbow.rotation.x = -up * 0.3;
            }
            trunk.rotation.x += -up * 0.16 + down * 0.3 + tremble * 0.5;
            crown.rotation.x += -up * 0.1 + down * 0.2;
            body.position.z = down * 0.45 - up * 0.06;
            // a step forward with the front roots as it comes down
            legs[0].hip.rotation.x = -window4(k, 0.55, 0.64, 0.7, 0.85) * 0.35;
            legs[1].hip.rotation.x = -window4(k, 0.58, 0.66, 0.72, 0.88) * 0.3;
            mouth.scale.y += up * 0.3 + down * 0.4;
            if (a.hit && k < 0.75) { gust = 1.2; pulses.fire(v.set(0, 0.03, 1.2), { from: 0.2, to: 1.4, life: 0.8, peak: 0.8 }); for (let i = 0; i < 8; i++) dropLeaf(); }
            break;
          }
          case 'hurt': {
            trunk.rotation.x -= bell * 0.2;
            body.position.z = -bell * 0.15;
            lidOpen = 1 - bell * 0.7;
            if (a.first) { gust = 1.2; push = [(Math.random() - 0.5) * 0.3, -0.35]; for (let i = 0; i < 6; i++) dropLeaf(); }
            break;
          }
          case 'ko': {
            // It stops, digs its roots in, lifts its boughs back into its crown and goes to sleep: only a willow
            // again. The face shuts and the light in its eyes goes out.
            asleep(ss(k, 0.1, 0.8), ss(k, 0.05, 0.5));
            lidOpen = 1 - ss(k, 0.2, 0.7);
            if (k > 0.1 && k < 0.5 && Math.random() < dt * 20) pulses.fire(v.set((Math.random() - 0.5) * 1.2, 0.02, (Math.random() - 0.5) * 1.2), { from: 0.05, to: 0.4, life: 0.8, peak: 0.3 });
            break;
          }
          case 'rise': {
            const up = ss(k, 0, 0.8);
            asleep(1 - up, 1 - up);
            lidOpen = up;
            break;
          }
        }
        if (k >= 1) moves.finish();
      } else if (moves.downed) {
        asleep(1, 1);
        lidOpen = 0;
      } else sleep = 0;

      // ---- the face: blink slowly, look about, glow while awake
      if ((blinkT -= dt) < 0) blinkT = 3 + rc() * 4;
      if (blinkT < 0.22) lidOpen = Math.min(lidOpen, Math.abs(blinkT - 0.11) / 0.11);
      if ((nextLook -= dt) < 0) { lookTX = (rc() - 0.5) * 0.025; lookTY = (rc() - 0.6) * 0.012; nextLook = 1.5 + rc() * 3; }
      lookX += (lookTX - lookX) * (1 - Math.exp(-dt * 4));
      lookY += (lookTY - lookY) * (1 - Math.exp(-dt * 4));
      for (const E of eyes) {
        E.lid.rotation.x = lerp(1.3, -0.95, lidOpen);
        E.pupil.position.set(lookX, -0.008 + lookY, 0.028);
        E.pupil.scale.y = 1.15 * Math.max(0.05, lidOpen);
        E.pupil.material.opacity = 1;
        E.shine.material.opacity = 0.55 * lidOpen * (1 - sleep);
      }

      // ---- tears and leaves
      if (!sleep && (tearT -= dt) < 0) { tearT = 0.6 + rc() * 1.4; tearsAt(0.5); }
      if ((leafT -= dt) < 0) { leafT = 1.5 + rc() * 3; dropLeaf(); }
      tears.update(dt, { gravity: 3, floor: 0.02 });
      leaves.update(dt, { gravity: 0.25, drag: 1.5, wobble: 0.25, time, floor: 0.02, fadeIn: 0.05 });
      motes.update(dt, { drag: 0.5, wobble: 0.1, time });
      pulses.update(dt);

      // ---- sap-light (weeping heals it) and fireflies
      const g = glowK * (0.8 + Math.sin(time * 9) * 0.2);
      barkMat.emissive.setRGB(0.32 * g, 0.75 * g, 0.28 * g);
      barkLimb.emissive.copy(barkMat.emissive);
      heartGlow.material.opacity = g * 0.3;
      light.intensity = g * 3;
      for (const F of fireflies) {
        F.a += dt * F.s * (1 - sleep * 0.8);
        const rest = sleep;
        F.f.position.set(Math.cos(F.a) * F.r * (1 - rest * 0.4), F.y - rest * 0.4 + Math.sin(time * 1.3 + F.p) * 0.12, Math.sin(F.a) * F.r * 0.8 * (1 - rest * 0.4) + 0.1);
        F.f.material.opacity = 0.5 + 0.5 * Math.max(0, Math.sin(time * 2.2 + F.p * 3));
      }

      // ---- hurt flash
      const hurtK = a && a.name === 'hurt' ? Math.sin(a.k * Math.PI) : 0;
      if (hurtK > 0 || flashOn) { flash(own, hurtK * 0.6); flashOn = hurtK > 0; }

      // ---- the fronds: the upright hangers on the boughs, then every strand's spring
      root.getWorldQuaternion(q);
      for (const A of arms)
        for (const H of A.hangers) {
          H.hanger.parent.getWorldQuaternion(q2);
          H.hanger.quaternion.copy(q2.invert().multiply(q));
        }
      const still = sleep * 0.75;
      const opts = { wind: [wind[0] * sway, wind[1] * sway], gust: gust + 0.15, still, push };
      curtain.update(dt, time, opts);
      for (const A of arms) for (const H of A.hangers) H.s.update(dt, time, opts);
      beard.update(dt, time, { wind: [0, 0.02], gust: gust * 0.5 + 0.1, still });
    },
  };
  let flashOn = false;
  function tearsAt(rate) {
    for (const E of eyes) {
      if (Math.random() > rate) continue;
      E.eye.parent.localToWorld(v.copy(E.tearFrom));
      root.worldToLocal(v);
      tears.spawn(v.x, v.y, v.z + 0.02, (Math.random() - 0.5) * 0.05, -0.1, 0.05, 1.4);
    }
  }
  function dropLeaf() {
    const ang = Math.random() * TAU, r = 0.3 + Math.random() * 0.7;
    leaves.spawn(Math.cos(ang) * r, 1.4 + Math.random() * 1.1, Math.sin(ang) * r, (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3, 4 + Math.random() * 2);
  }
  return api;
}

// ---------------------------------------------------------------- painted in code

function makeBarkTexture() {
  // The bark, and a second picture of just its cracks (white on black) that glows green when it weeps.
  const furrows = [];
  const r = rng(21);
  for (let i = 0; i < 46; i++) furrows.push({ x0: r() * 256, w: 2 + r() * 7, dark: r() < 0.6, i });
  const trace = (g, f, H) => {
    g.beginPath();
    for (let y = -10; y <= H + 10; y += 16) {
      const x = f.x0 + Math.sin(y * 0.02 + f.i) * 6 + Math.sin(y * 0.07 + f.i * 3) * 2;
      y < 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  };
  const map = paint(256, 512, (g, W, H) => {
    g.fillStyle = C.bark;
    g.fillRect(0, 0, W, H);
    for (const f of furrows) {
      g.strokeStyle = f.dark ? 'rgba(20,14,12,0.75)' : 'rgba(110,94,80,0.4)';
      g.lineWidth = f.dark ? f.w : f.w * 0.6;
      trace(g, f, H);
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = r() * H;
      g.strokeStyle = 'rgba(15,10,9,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 6);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = r() * W, y = r() * H;
      g.fillStyle = 'rgba(18,12,10,0.8)';
      g.beginPath(); g.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(120,100,85,0.5)';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(x, y, 11, 16, 0, 0, Math.PI * 2); g.stroke();
    }
    // moss and lichen, thicker toward the bottom (v 0 is the bottom of the trunk)
    for (let i = 0; i < 160; i++) {
      const y = H - Math.pow(r(), 1.8) * H, x = r() * W;
      g.fillStyle = r() < 0.7 ? `rgba(98,128,70,${0.35 + r() * 0.4})` : `rgba(170,180,140,${0.3 + r() * 0.3})`;
      g.beginPath(); g.arc(x, y, 1.5 + r() * 4, 0, Math.PI * 2); g.fill();
    }
  });
  const cracks = paint(256, 512, (g, W, H) => {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff';
    for (const f of furrows) if (f.dark) { g.lineWidth = Math.max(1.5, f.w * 0.45); trace(g, f, H); }
  });
  return { map, cracks };
}

function makeCanopyTexture() {
  // The top of the crown: fronds combed down from the top like hair, in dark and moonlit greens.
  return paint(512, 256, (g, W, H) => {
    const r = rng(33);
    g.fillStyle = '#34492f';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) {
      const x0 = r() * W, tone = r();
      g.strokeStyle = tone < 0.45 ? 'rgba(22,34,22,0.7)' : tone < 0.85 ? 'rgba(92,124,74,0.6)' : 'rgba(150,176,112,0.55)';
      g.lineWidth = 2 + r() * 4;
      g.beginPath();
      g.moveTo(x0, -4);
      g.bezierCurveTo(x0 + (r() - 0.5) * 20, H * 0.35, x0 + (r() - 0.5) * 30, H * 0.7, x0 + (r() - 0.5) * 24, H + 4);
      g.stroke();
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(20,30,20,0.5)' : 'rgba(170,200,130,0.4)';
      g.save();
      g.translate(r() * W, r() * H);
      g.rotate(1.3 + (r() - 0.5) * 0.6);
      g.beginPath();
      g.ellipse(0, 0, 6, 1.6, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }, { repeat: [2, 1] });
}

function makeLeafTexture() {
  // Along u: slender willow leaves in two shades, overlapping like a frond seen from the side.
  return paint(128, 64, (g, W, H) => {
    const r = rng(8);
    g.fillStyle = '#b8c8a8';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H;
      g.fillStyle = r() < 0.5 ? 'rgba(60,80,50,0.55)' : 'rgba(240,255,220,0.5)';
      g.save();
      g.translate(x, y);
      g.rotate(0.5 + (r() - 0.5) * 0.6);
      g.beginPath();
      g.ellipse(0, 0, 9, 2.2, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }, { repeat: [6, 1] });
}

function makeLeafSprite() {
  return paint(32, 32, (g) => {
    g.translate(16, 16);
    g.rotate(0.7);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, 0, 13, 4, 0, 0, Math.PI * 2);
    g.fill();
  }, { wrap: false });
}
