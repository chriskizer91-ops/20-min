import * as THREE from 'three';
import {
  toon, toonMap, part, joint, sphere, cyl, lathe, skirt, swayCloth, taperedTube, blobShadow, onLayer, Spring, turnToward,
} from './kit.js';
import {
  paintedFace, canvasTexture, merge, ellipse, mixColor, win, arch, lerp, bladeGeometry, PROFILE, Particles, sparkSprite,
} from './party-kit.js';

// Mister Quill, Wickhollow's peddler, from Follow Me Down Witch Way (witch_game_assets/design/LORE.md, and his
// portraits and map sprites in witch_game_assets/npcs/quill/): "tall, thin and older, with a neat silver goatee, a
// plum frock coat with too many pockets, a striped waistcoat and gold watch chain, fingerless gloves, a quill behind
// one ear, and a battered top hat hung with trinkets." To him, everything is a swap, and his fingers ache in the
// cold ("Fingerless gloves. A mistake."). In this game the cold got into his fingers and his skiff sat cold at the
// jetty (docs/LORE.md, "The skiff"), until a Warming Balm: after it he flexes his warm fingers.
//
// A standalone model: it stands behind the swap-shop counter here, and can stand on the Sable riverbank beside
// the skiff (it walks, too). Built from kit.js like the witch: toon shading with the moonlit rim, ink outlines,
// joints, cloth that sways, springy hair, plume and trinkets, and a face painted on a canvas with blinks and moods.
//
//   const quill = createQuill();         scene.add(quill.root); each frame: quill.update(dt, speed, turn)
//   quill.play('talk' | 'tip' | 'swap' | 'flex' | 'warm' | 'polish' | 'arrange' | 'watch', onHit)
//   quill.setWarm(true)                  after the Warming Balm: no more hand-warming; he flexes his fingers instead
//   quill.lookAt(angle | null)           turn to face someone (a heading), or back to quill.rest
//   quill.setMood('calm' | 'happy' | 'sly' | 'cold' | 'surprised')
//   quill.sit(true, 0.46)                sit on something 0.46 m high (a crate by the jetty); quill.sit(false) to stand
//
// Idle life: he breathes, shifts his weight and looks about; while his hands are cold he rubs them, blows into
// them and shivers now and then; he fusses over his curios (takes a glass bauble from a pocket, polishes it on
// his cuff, holds it up to the light, puts it away), straightens things in front of him, checks his pocket watch
// and sets his hat right. Once warm, he flexes his fingers and admires them.

const C = {
  skin: '#e2ae8e', skinShade: '#c48a6e', nose: '#dfa088', noseCold: '#ea9282', line: 'rgba(130,70,58,0.55)',
  hair: '#dcdbe6', hairShade: '#aeabc6', hairDark: '#8c88a8',
  coat: '#7a1f40', coatDark: '#4e1228', lining: '#3a0e1e', cuff: '#5a1630',
  vestA: '#2a1a1c', vestB: '#4a2e22', gold: '#e2b85a', goldDark: '#a8812e',
  cravat: '#efe4c8', trousers: '#2a2430', boot: '#4a2f24', bootLight: '#6a4430',
  glove: '#2c2024', gloveLight: '#4a3438',
  hat: '#2b1e24', hatShade: '#1c1418', band: '#8e1f3a', plume: '#b3284a', plumeDark: '#7a1631',
  brass: '#c8923e', cream: '#f2e6c6', glass: '#cfe0ff', ink: '#2a1c2a',
};

export function createQuill() {
  const root = new THREE.Group();
  root.name = 'quill';
  const body = joint(root, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- long legs, dark trousers, pointed boots
  const hips = joint(body, [0, 0.74, 0], 'hips');
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.075, 0, 0]);
    part(hip, cyl(0.058, 0.05, 0.36, 10), toon(C.trousers), { pos: [0, -0.175, 0] });
    const knee = joint(hip, [0, -0.34, 0]);
    part(knee, cyl(0.05, 0.044, 0.3, 10), toon(C.boot), { pos: [0, -0.15, 0] });
    part(knee, cyl(0.06, 0.056, 0.05, 10), toon(C.bootLight), { pos: [0, -0.04, 0], ink: false }); // the boot's turned-down top
    const ankle = joint(knee, [0, -0.32, 0]);
    part(ankle, sphere(0.05, 12, 8), toon(C.boot), { pos: [0, -0.045, 0.045], scale: [0.95, 0.7, 2.1] });
    return { hip, knee, ankle };
  });

  // ---------------------------------------------------------------- the frock coat's tails: long, open at the front, ragged
  const coatTex = coatTexture();
  const tailsGeo = skirt({ top: 0.15, bottom: 0.25, height: 0.74, flare: 0.85, points: 20, zig: 0.03, gap: 0.95, rows: 6, backDrop: 0.06, ragged: 0.07 });
  const tails = part(hips, tailsGeo, toonMap(coatTex, { side: THREE.FrontSide }), { pos: [0, 0.17, 0] });
  part(tails, tailsGeo, toon(C.lining, { side: THREE.BackSide, rim: 0 }), { ink: false });

  // ---------------------------------------------------------------- torso: striped waistcoat, watch chain, cravat, the open coat
  const torso = joint(hips, [0, 0.17, 0], 'torso');
  part(torso, lathe([[0.125, 0], [0.138, 0.09], [0.146, 0.2], [0.14, 0.3], [0.12, 0.36], [0.07, 0.41], [0.001, 0.42]], 16), toonMap(vestTexture()), {});
  // brass buttons down the waistcoat
  part(torso, merge([0.06, 0.13, 0.2, 0.27].map((y) => new THREE.SphereGeometry(0.011, 6, 5).translate(0, y, 0.142 + (y > 0.25 ? -0.004 : 0)))), toon(C.gold, { rim: 0.3 }), { ink: false });
  // the gold watch chain, from a button to the pocket on his left, sagging
  part(torso, taperedTube([[0, 0.13, 0.15], [0.04, 0.1, 0.152], [0.08, 0.1, 0.14], [0.11, 0.125, 0.115]], 0.0045, 0.0045, 12, 4), toon(C.gold, { emissive: new THREE.Color('#3a2400'), emissiveIntensity: 0.4 }), { ink: false });
  // the coat's body, open over the waistcoat, and its lapels
  const coatBodyGeo = skirt({ top: 0.158, bottom: 0.152, height: 0.37, flare: 1, points: 20, zig: 0, gap: 1.05, rows: 2 });
  const coatBody = part(torso, coatBodyGeo, toon(C.coat, { side: THREE.FrontSide }), { pos: [0, 0.37, 0] });
  part(coatBody, coatBodyGeo, toon(C.lining, { side: THREE.BackSide, rim: 0 }), { ink: false });
  part(torso, merge([-1, 1].map((s) => {
    // a lapel: a long wedge from the shoulder to the waist, turned back along the coat's opening
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(s * 0.055, -0.02), new THREE.Vector2(s * 0.004, -0.22)]);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }).rotateY(s * 0.45).translate(s * 0.074, 0.37, 0.128);
  })), toon(C.coatDark, { side: THREE.DoubleSide }));
  // too many pockets: flapped pockets on the coat's chest and at the top of the tails
  const pocketGeo = (a, y, w, h) => new THREE.BoxGeometry(w, h, 0.022).rotateY(a).translate(Math.sin(a) * 0.162, y, Math.cos(a) * 0.162);
  part(torso, merge([pocketGeo(0.95, 0.24, 0.07, 0.06), pocketGeo(-0.95, 0.24, 0.07, 0.06), pocketGeo(1.25, 0.1, 0.08, 0.075), pocketGeo(-1.3, 0.12, 0.06, 0.06)]), toon(C.coatDark));
  part(hips, merge([
    new THREE.BoxGeometry(0.09, 0.08, 0.024).rotateY(1.05).translate(Math.sin(1.05) * 0.168, 0.09, Math.cos(1.05) * 0.168),
    new THREE.BoxGeometry(0.08, 0.07, 0.024).rotateY(-1.1).translate(Math.sin(-1.1) * 0.168, 0.1, Math.cos(-1.1) * 0.168),
    new THREE.BoxGeometry(0.07, 0.06, 0.024).rotateY(1.6).translate(Math.sin(1.6) * 0.175, 0.02, Math.cos(1.6) * 0.175),
  ]), toon(C.coatDark));
  // the cravat: cream ruffles under the chin, with a gold pin
  part(torso, merge([
    new THREE.SphereGeometry(0.05, 10, 7).scale(1.2, 0.8, 0.6).translate(0, 0.39, 0.075),
    new THREE.SphereGeometry(0.04, 8, 6).scale(1.0, 1.1, 0.5).translate(0, 0.335, 0.11),
    new THREE.SphereGeometry(0.032, 8, 6).scale(1.0, 1.1, 0.5).translate(0, 0.29, 0.13),
  ]), toon(C.cravat));
  part(torso, sphere(0.012, 6, 5), toon(C.gold, { emissive: new THREE.Color('#5a3a00'), emissiveIntensity: 0.5 }), { pos: [0, 0.34, 0.132], ink: false });
  // the coat's turned-up collar round the back of the neck
  part(torso, new THREE.TorusGeometry(0.1, 0.03, 6, 14, Math.PI * 1.25).rotateX(Math.PI / 2).rotateZ(0).rotateY(-Math.PI * 0.125 + Math.PI), toon(C.coat), { pos: [0, 0.41, -0.01], scale: [1, 1, 1.35] });

  // ---------------------------------------------------------------- arms: long sleeves, turned cuffs, fingerless gloves
  const skinMat = toon(C.skin, { rim: 0.4 });
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.175, 0.34, 0]);
    shoulder.rotation.z = side * 0.12;
    part(shoulder, sphere(0.066, 10, 7), toon(C.coat), { pos: [side * 0.008, -0.005, 0], scale: [1.05, 0.9, 1.05] });
    part(shoulder, cyl(0.05, 0.056, 0.27, 10), toon(C.coat), { pos: [0, -0.135, 0] });
    const elbow = joint(shoulder, [0, -0.27, 0]);
    elbow.rotation.order = 'YXZ';
    part(elbow, cyl(0.048, 0.062, 0.2, 10, true), toon(C.coat, { side: THREE.DoubleSide }), { pos: [0, -0.095, 0] });
    part(elbow, cyl(0.066, 0.068, 0.05, 12, true), toon(C.cuff, { side: THREE.DoubleSide }), { pos: [0, -0.2, 0] });
    part(elbow, new THREE.TorusGeometry(0.067, 0.006, 4, 14), toon(C.gold, { rim: 0.3 }), { pos: [0, -0.178, 0], rot: [Math.PI / 2, 0, 0], ink: false });
    const wrist = joint(elbow, [0, -0.22, 0]);
    // the glove: palm and back of the hand in black leather, stopping at the knuckles
    part(wrist, sphere(0.036, 10, 7), toon(C.glove), { pos: [0, -0.03, 0.004], scale: [1.1, 1.25, 0.62] });
    // long, thin fingers, bare from the first knuckle (fingerless gloves: a mistake), curling together
    const fingers = joint(wrist, [0, -0.066, 0.006]);
    part(fingers, merge([-1.5, -0.5, 0.5, 1.5].map((k) => {
      const len = [0.042, 0.05, 0.052, 0.046][k + 1.5];
      return taperedTube([[k * 0.0135, 0.004, 0], [k * 0.015, -len * 0.5, 0.003], [k * 0.016, -len, 0.001]], 0.0085, 0.0065, 5, 5);
    })), skinMat);
    part(fingers, cyl(0.035, 0.035, 0.014, 10), toon(C.gloveLight), { pos: [0, 0.002, 0], scale: [1.05, 1, 0.5], ink: false }); // the glove's edge at the knuckles
    const thumb = joint(wrist, [-side * 0.03, -0.03, 0.02]);
    part(thumb, taperedTube([[0, 0, 0], [-side * 0.012, -0.02, 0.012], [-side * 0.016, -0.04, 0.016]], 0.01, 0.0075, 5, 5), skinMat);
    return { shoulder, elbow, wrist, fingers, thumb, side };
  });
  const [armR, armL] = arms; // arms[0] is his right (x -), arms[1] his left

  // A glass bauble he fusses over (in a coat pocket, until he takes it out to polish it)
  const bauble = joint(armR.wrist, [0.0, -0.085, 0.03], 'bauble');
  part(bauble, sphere(0.034, 12, 9), new THREE.MeshToonMaterial({ color: C.glass, emissive: new THREE.Color('#6a58c8'), emissiveIntensity: 0.45, transparent: true, opacity: 0.85 }), {});
  part(bauble, merge([
    new THREE.CylinderGeometry(0.012, 0.014, 0.012, 8).translate(0, 0.036, 0),
    new THREE.TorusGeometry(0.006, 0.002, 4, 8).translate(0, 0.046, 0),
  ]), toon(C.brass), { ink: false });
  const baubleGlint = sparkSprite('#ffffff');
  baubleGlint.scale.setScalar(0.001);
  baubleGlint.position.set(-0.012, 0.012, 0.03);
  bauble.add(baubleGlint);
  bauble.scale.setScalar(0.001);
  // His pocket watch, on the chain: in its pocket until he takes it out to look
  const watch = joint(armL.wrist, [0.0, -0.08, 0.03], 'watch');
  part(watch, cyl(0.028, 0.028, 0.012, 14), toon(C.gold, { emissive: new THREE.Color('#3a2400'), emissiveIntensity: 0.3 }), { rot: [Math.PI / 2, 0, 0] });
  part(watch, cyl(0.022, 0.022, 0.004, 14), toon(C.cream, { rim: 0 }), { pos: [0, 0, 0.007], rot: [Math.PI / 2, 0, 0], ink: false });
  watch.scale.setScalar(0.001);

  // ---------------------------------------------------------------- head: a long, clever face, silver hair and goatee
  const neck = joint(torso, [0, 0.4, 0.005], 'neck');
  part(neck, cyl(0.04, 0.046, 0.1, 8), toon(C.skin), { pos: [0, 0.03, 0], ink: false });
  const head = joint(neck, [0, 0.17, 0.01], 'head');
  head.scale.setScalar(1.15); // a big head, FF9-fashion, like the witch's (and his hat with it)
  const skull = part(head, new THREE.SphereGeometry(0.165, 28, 20), toon(C.skin), { scale: [0.93, 1.08, 0.96] });
  const face = paintedFace(skull, ['calm', 'blink', 'talk', 'happy', 'sly', 'cold', 'surprised'], drawQuillFace, { rim: 0.3 });
  // a long nose with a gentle hook (pink at the tip when he's cold)
  const noseBase = toon(C.nose, { rim: 0.6 });
  const noseMat = noseBase.clone();
  noseMat.onBeforeCompile = noseBase.onBeforeCompile;
  noseMat.customProgramCacheKey = noseBase.customProgramCacheKey;
  part(head, taperedTube([[0, 0.02, 0.148], [0, -0.002, 0.164], [0, -0.024, 0.173], [0, -0.04, 0.17]], 0.011, 0.009, 8, 7), noseMat, { ink: false });
  part(head, sphere(0.011, 8, 6), noseMat, { pos: [0, -0.038, 0.167], scale: [1.05, 0.9, 1], ink: false });
  // ears, half under the hair
  part(head, merge([-1, 1].map((s) => new THREE.SphereGeometry(0.03, 8, 6).scale(0.45, 1.1, 0.8).translate(s * 0.152, -0.01, -0.005))), toon(C.skin, { rim: 0.4 }));
  // the goatee: neat, silver and pointed, and a thin moustache that curls up at the ends
  const goatee = joint(head, [0, -0.13, 0.12], 'goatee');
  part(goatee, taperedTube([[0, 0.02, 0.0], [0, -0.03, 0.02], [0.002, -0.08, 0.026]], 0.03, 0.004, 8, 7), toon(C.hair));
  part(head, merge([-1, 1].map((s) => taperedTube([[s * 0.004, -0.066, 0.168], [s * 0.035, -0.074, 0.158], [s * 0.062, -0.064, 0.142], [s * 0.072, -0.046, 0.132]], 0.009, 0.004, 8, 5))), toon(C.hair), { ink: false });

  const hair = joint(head, [0, 0, 0], 'hair');
  part(hair, new THREE.SphereGeometry(0.175, 22, 12, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.62), toon(C.hair, { side: THREE.DoubleSide }), { pos: [0, 0.012, -0.004], scale: [0.95, 1.08, 1] });
  // Long, wispy silver hair from under the hat, down to his collar
  const locks = [];
  const lock = (rootPos, drop, spread, thick, tone, waves = 2.5, kink = 0.035) => {
    const j = joint(hair, rootPos);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const wave = Math.sin(t * Math.PI * waves) * kink * Math.min(1, t * 1.6);
      pts.push([spread[0] * t + wave, -drop * t, spread[1] * t + wave * 0.4]);
    }
    part(j, taperedTube(pts, thick, thick * 0.2, 14, 6), toon(tone));
    locks.push({ j, spring: new Spring(24 + Math.random() * 8, 4), side: new Spring(20, 4), phase: Math.random() * 6 });
    return j;
  };
  for (const side of [-1, 1]) {
    lock([side * 0.145, 0.03, 0.04], 0.24, [side * 0.07, 0.02], 0.035, C.hair, 3, 0.03);
    lock([side * 0.13, 0.05, -0.08], 0.3, [side * 0.08, -0.05], 0.045, side > 0 ? C.hairShade : C.hair, 2.5);
  }
  lock([0, 0.06, -0.15], 0.3, [0, -0.07], 0.06, C.hairShade, 2);
  // the quill behind his left ear
  const quillPen = joint(head, [0.16, 0.02, 0.02], 'quill-pen');
  quillPen.rotation.set(-0.55, 0.15, -0.35);
  part(quillPen, bladeGeometry(0.2, 0.036, { thick: 0.12, profile: PROFILE.feather, bend: 0.015 }).rotateX(Math.PI / 2).translate(0, 0.02, 0), toon(C.cream, { side: THREE.DoubleSide }));
  part(quillPen, cyl(0.0035, 0.002, 0.05, 5), toon(C.ink), { pos: [0, -0.005, 0], ink: false });

  // ---------------------------------------------------------------- the battered top hat, hung with trinkets
  const hat = joint(head, [0, 0.14, -0.012], 'hat');
  hat.rotation.set(-0.1, 0, 0.1);
  const hatBase = joint(hat, [0, 0, 0]);
  part(hatBase, topBrim(0.14, 0.235), toon(C.hat, { side: THREE.DoubleSide, rim: 0.4 }));
  part(hatBase, crownGeometry(), toonMap(hatTexture()), { pos: [0, 0.005, 0] });
  part(hatBase, cyl(0.146, 0.149, 0.05, 20), toon(C.band, { rim: 0.5 }), { pos: [0, 0.035, 0] });
  // a brass clockwork eye on the band, with a cream face
  part(hatBase, merge([
    new THREE.TorusGeometry(0.026, 0.008, 6, 14).translate(0, 0, 0),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.BoxGeometry(0.01, 0.01, 0.008).translate(Math.cos(i * Math.PI / 4) * 0.036, Math.sin(i * Math.PI / 4) * 0.036, 0)),
  ]).rotateY(-0.35), toon(C.brass, { emissive: new THREE.Color('#3a2408'), emissiveIntensity: 0.3 }), { pos: [-0.052, 0.04, 0.142] });
  part(hatBase, cyl(0.02, 0.02, 0.006, 12).rotateX(Math.PI / 2).rotateY(-0.35), toon(C.cream, { rim: 0, emissive: new THREE.Color('#40382a'), emissiveIntensity: 0.4 }), { pos: [-0.052, 0.04, 0.143], ink: false });
  // the plume: crimson feathers sweeping up and back from his left side
  const plume = joint(hatBase, [0.12, 0.05, -0.04], 'plume');
  plume.rotation.set(-0.5, 0.2, -0.45);
  part(plume, merge([
    bladeGeometry(0.34, 0.09, { thick: 0.1, profile: PROFILE.feather, bend: -0.05, droop: 0.02 }).rotateX(Math.PI / 2),
    bladeGeometry(0.28, 0.075, { thick: 0.1, profile: PROFILE.feather, bend: -0.04, droop: -0.03 }).rotateX(Math.PI / 2).rotateZ(0.35).translate(0.01, 0, 0.01),
  ]), toon(C.plume, { side: THREE.DoubleSide }));
  part(plume, bladeGeometry(0.22, 0.06, { thick: 0.1, profile: PROFILE.feather, bend: -0.03 }).rotateX(Math.PI / 2).rotateZ(-0.4).translate(-0.01, 0, -0.01), toon(C.plumeDark, { side: THREE.DoubleSide }), { ink: false });
  // trinkets on little chains round the brim: a gold bell, a brass key and a moon
  const trinkets = [];
  for (const [i, a] of [1.15, 1.6, -1.05].entries()) {
    const ang = Math.PI / 2 + a;
    const pivot = joint(hatBase, [Math.cos(ang) * 0.2, 0.0, Math.sin(ang) * 0.2]);
    const len = 0.05 + i * 0.012;
    const chain = new THREE.CylinderGeometry(0.0022, 0.0022, len, 3).translate(0, -len / 2, 0);
    let charm;
    if (i === 0) charm = new THREE.LatheGeometry([[0.001, 0], [0.016, 0.002], [0.016, 0.01], [0.012, 0.022], [0.006, 0.028], [0.001, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 8).translate(0, -len - 0.03, 0);
    else if (i === 1) charm = merge([new THREE.TorusGeometry(0.008, 0.003, 4, 8).translate(0, -len - 0.008, 0), new THREE.BoxGeometry(0.004, 0.03, 0.004).translate(0, -len - 0.03, 0), new THREE.BoxGeometry(0.01, 0.005, 0.004).translate(0.005, -len - 0.042, 0)]);
    else charm = new THREE.TorusGeometry(0.012, 0.004, 4, 10, Math.PI * 1.3).rotateZ(-0.6).translate(0, -len - 0.012, 0);
    part(pivot, merge([chain, charm]), toon(i === 2 ? '#dfe3ec' : C.gold, { emissive: new THREE.Color('#3a2a00'), emissiveIntensity: 0.4 }), { ink: false });
    trinkets.push({ pivot, sx: new Spring(40, 3), sz: new Spring(40, 3) });
  }

  const shadow = blobShadow(0.34, 0.5);
  root.add(shadow);

  // Breath in the cold, when he blows into his hands
  const breath = new Particles(root, 8, () => sparkSprite('#e8ecff'));
  onLayer(root);

  // ---------------------------------------------------------------- animation
  const S = {
    lean: new Spring(20, 6), tails: new Spring(26, 4.5), plume: new Spring(34, 3.2), plumeZ: new Spring(30, 3),
    goatee: new Spring(50, 5), hatLift: new Spring(60, 8),
  };
  let phase = 0, time = Math.random() * 10, look = 0, lookTarget = 0, nextLook = 2, blinkT = 2, prevSpeed = 0;
  let fidget = null, nextFidget = 2.5 + Math.random() * 2, action = null, mood = 'calm', faceTo = null, warm = false;
  let seat = null; // the height he sits at (a crate, a bollard by the jetty), or null when he stands
  let shiver = 0, nextShiver = 5;
  const ACTIONS = { talk: 1.6, tip: 1.5, swap: 1.8, flex: 2.2, warm: 2.8, polish: 3.6, arrange: 2.2, watch: 2.6 };
  const MOODS = { tip: 'happy', swap: 'happy', flex: 'happy', warm: 'cold', polish: 'sly' };
  const v1 = new THREE.Vector3();

  const api = {
    root, head, hat, face, name: 'Mister Quill', height: 1.95, radius: 0.26, center: 1.0,
    moves: Object.keys(ACTIONS),
    get busy() { return !!action; },
    get mood() { return mood; },
    get warm() { return warm; },
    // The heading he rests at when nobody's talking to him
    rest: 0,
    setMood(m) { mood = m; },
    setWarm(on = true) { warm = !!on; noseMat.color.set(warm ? C.nose : C.noseCold); if (warm && fidget?.name === 'warm') fidget = null; },
    // Sit down on something `height` meters high (by his cold skiff, say: docs/SLICE.md screen 4), or stand: sit(false)
    sit(on = true, height = 0.46) { seat = on ? height : null; },
    lookAt(angle) { faceTo = angle; },
    play(name, onHit) {
      if (!ACTIONS[name]) return;
      fidget = null;
      action = { name, t: 0, dur: ACTIONS[name], onHit, hit: false };
    },
    // speed: m/s if he's walking; turn: how fast he's turning (rad/s), for the tails, hair and plume
    update(dt, speed = 0, turn = 0) {
      time += dt;
      const accel = (speed - prevSpeed) / Math.max(dt, 1e-3);
      prevSpeed = speed;
      const moving = Math.min(1, speed / 1.5);
      phase += ((speed * dt) / 0.62) * Math.PI;
      const s = Math.sin(phase), c = Math.cos(phase);
      if (faceTo !== null || !moving) root.rotation.y = turnToward(root.rotation.y, faceTo ?? api.rest, 5, dt);

      // Legs: long, unhurried strides (or, sitting, his knees up)
      for (const [i, L] of legs.entries()) {
        const p = i ? phase + Math.PI : phase;
        const swing = Math.sin(p) * 0.5 * moving;
        L.hip.rotation.set(seat !== null ? -1.5 : swing, seat !== null ? (i ? -0.12 : 0.12) : 0, 0);
        L.knee.rotation.x = seat !== null ? 1.4 + i * 0.12 : Math.max(0, -Math.cos(p)) * 0.85 * moving;
        L.ankle.rotation.x = seat !== null ? 0.1 : -swing * 0.35;
      }
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      const breathe = Math.sin(time * 1.5);
      const sway = Math.sin(time * 0.45);
      hips.position.set(sway * 0.01 * (1 - moving), seat !== null ? seat + 0.06 : 0.74 + Math.abs(c) * 0.025 * moving, seat !== null ? -0.06 : 0);
      hips.rotation.set(0, s * 0.1 * moving, c * 0.05 * moving + sway * 0.02 * (1 - moving));
      // a slight stoop: he's tall, and spends his life leaning over a counter
      torso.rotation.set(S.lean.update(0.08 + 0.06 * moving - accel * 0.008, dt), -s * 0.12 * moving, -hips.rotation.z * 0.8);
      torso.scale.set(1 + breathe * 0.01, 1 + breathe * 0.008, 1 + breathe * 0.01);

      // Arms at rest: hands loosely clasped in front of him (a shopkeeper's pose), swinging when he walks
      for (const A of arms) {
        A.shoulder.rotation.set(-0.28 + A.side * s * 0.3 * moving + 0.25 * moving, 0, A.side * (0.1 - 0.02 * breathe));
        A.elbow.rotation.set(-1.0 + 0.6 * moving, -A.side * 0.62 * (1 - moving), 0);
        A.wrist.rotation.set(0.1, 0, 0);
        A.fingers.rotation.set(0.5, 0, 0);
        A.thumb.rotation.set(0, 0, 0);
      }
      head.rotation.set(0, 0, 0);
      hatBase.position.set(0, 0, 0);
      hatBase.rotation.set(0, 0, 0);
      let faceNow = null, hatLift = 0, glint = 0;
      bauble.scale.setScalar(0.001);
      watch.scale.setScalar(0.001);

      // A shiver now and then, while his fingers are cold
      if (!warm && !action && !fidget && (nextShiver -= dt) < 0) { shiver = 0.6; nextShiver = 6 + Math.random() * 6; }
      if (shiver > 0) {
        shiver -= dt;
        const k = shiver / 0.6;
        torso.rotation.z += Math.sin(time * 60) * 0.02 * k;
        for (const A of arms) A.shoulder.rotation.z -= A.side * 0.08 * k;
        faceNow = 'cold';
      }

      // Idle fidgets: he fusses over his curios, straightens the counter, checks his watch; warms or flexes his hands
      if (!moving && !action && faceTo === null && !fidget && (nextFidget -= dt) < 0) {
        const pool = warm ? ['polish', 'arrange', 'watch', 'flex', 'polish'] : ['warm', 'polish', 'arrange', 'watch', 'warm'];
        const name = pool[Math.floor(Math.random() * pool.length)];
        fidget = { name, t: 0, dur: ACTIONS[name] };
        nextFidget = 3 + Math.random() * 4;
      }
      const run = action ?? fidget;
      if (run) {
        run.t += dt;
        const k = Math.min(1, run.t / run.dur);
        const hitAt = (at) => { if (action && !action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        const both = (fn) => { for (const A of arms) fn(A); };
        switch (run.name) {
          case 'talk': {
            // "Everything's a swap": his right hand sweeps out, palm up, presenting the stall; the left to his chest
            const p = win(k, 0, 1, 0.2), beat = Math.sin(run.t * 6.5);
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -0.9 + beat * 0.08, p);
            armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.55, p);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -0.5 + beat * 0.1, p), lerp(armR.elbow.rotation.y, 0.2, p), 0);
            armR.wrist.rotation.set(lerp(0.1, -0.6, p), lerp(0, 1.1, p), 0);
            armR.fingers.rotation.x = lerp(0.5, -0.1, p);
            armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, -0.55, p);
            armL.elbow.rotation.set(lerp(armL.elbow.rotation.x, -1.75, p), lerp(armL.elbow.rotation.y, -0.9, p), 0);
            torso.rotation.y += p * 0.12;
            head.rotation.set(arch(k, 0.3, 0.6) * 0.1, 0, p * -0.08);
            faceNow = Math.sin(run.t * 15) > 0.05 && k < 0.85 ? 'talk' : 'sly';
            hitAt(0.5);
            break;
          }
          case 'tip': {
            // He tips his hat: two fingers to the brim, the hat lifts and tilts, a little bow
            const reach = win(k, 0.05, 0.95, 0.2), lift = arch(k, 0.3, 0.75), bow = arch(k, 0.25, 0.8);
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -2.5, reach);
            armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.35, reach);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.3, reach), lerp(armR.elbow.rotation.y, 0.6, reach), 0);
            armR.fingers.rotation.x = lerp(0.5, 0.2, reach);
            hatLift = lift;
            torso.rotation.x += bow * 0.35;
            head.rotation.x += bow * 0.2;
            armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, -0.05, bow);
            armL.elbow.rotation.set(lerp(armL.elbow.rotation.x, -1.4, bow), lerp(armL.elbow.rotation.y, -1.0, bow), 0);
            faceNow = 'happy';
            hitAt(0.5);
            break;
          }
          case 'swap': {
            // The deal is done: both hands forward, offering, then thrown open wide. Splendid.
            const offer = win(k, 0.02, 0.55, 0.12), open = win(k, 0.5, 0.98, 0.1);
            both((A) => {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -1.05, offer) + open * 0.35;
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.05, offer) + A.side * open * 0.75;
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -0.55, offer) - open * 0.2, lerp(A.elbow.rotation.y, -A.side * 0.5, offer) * (1 - open), 0);
              A.wrist.rotation.set(-0.5 * (offer + open), A.side * -0.9 * (offer + open), 0);
              A.fingers.rotation.x = 0.5 - 0.6 * (offer + open);
            });
            torso.rotation.x += offer * 0.18 - open * 0.08;
            head.rotation.x += offer * 0.1 - open * 0.12;
            body.position.y = arch(k, 0.5, 0.9) * 0.02;
            faceNow = open > 0.3 ? 'happy' : 'sly';
            hitAt(0.5);
            break;
          }
          case 'flex': {
            // Warm hands at last: both up in front of him, fingers open and close, and he admires them
            const up = win(k, 0.02, 0.96, 0.15), flex = Math.max(0, Math.sin(run.t * 9)) * win(k, 0.15, 0.85, 0.05);
            both((A) => {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.95, up);
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.18, up);
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -1.55, up), lerp(A.elbow.rotation.y, -A.side * 0.35, up), 0);
              A.wrist.rotation.set(-0.5 * up, A.side * -1.2 * up, 0);
              A.fingers.rotation.x = lerp(0.5, -0.15 + flex * 1.5, up);
              A.thumb.rotation.z = A.side * flex * 0.5;
            });
            head.rotation.x += up * 0.2;
            faceNow = up > 0.4 ? 'happy' : null;
            hitAt(0.5);
            break;
          }
          case 'warm': {
            // Cold fingers: rub the hands together hard, cup them to his mouth and blow, a shiver
            const up = win(k, 0.02, 0.96, 0.12), rub = win(k, 0.08, 0.5, 0.05), blow = win(k, 0.5, 0.92, 0.08);
            const r = Math.sin(run.t * 26) * rub;
            both((A) => {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.75 - blow * 0.45 + A.side * r * 0.08, up);
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.05, up);
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -1.75 - blow * 0.35, up), lerp(A.elbow.rotation.y, -A.side * (0.95 + blow * 0.15), up), 0);
              A.wrist.rotation.set(-0.3 * up, A.side * -1.3 * up, 0);
              A.fingers.rotation.x = lerp(0.5, 0.2 + blow * 0.6, up);
            });
            head.rotation.x += blow * 0.18 - rub * 0.05;
            torso.rotation.x += blow * 0.06;
            if (blow > 0.6 && Math.random() < dt * 14) {
              head.updateWorldMatrix(true, false);
              const at = root.worldToLocal(head.localToWorld(v1.set(0, -0.09, 0.2)));
              const fwd = 0.25 + Math.random() * 0.15;
              breath.spawn(at, { vel: [(Math.random() - 0.5) * 0.08, 0.05, fwd], life: 0.9, size: 0.05, grow: 1.6, drag: 1.5, opacity: 0.4 });
            }
            faceNow = blow > 0.3 ? 'blink' : 'cold';
            break;
          }
          case 'polish': {
            // A glass bauble from his pocket, a rub on his cuff, held up to the lamp and admired, and back it goes
            const out = win(k, 0.08, 0.92, 0.1), rub = win(k, 0.2, 0.5, 0.04), show = win(k, 0.52, 0.82, 0.08);
            bauble.scale.setScalar(Math.max(0.001, win(k, 0.12, 0.9, 0.04)));
            const r = Math.sin(run.t * 22) * rub;
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -0.7 - show * 1.1, out);
            armR.shoulder.rotation.z = lerp(armR.shoulder.rotation.z, -0.05 - show * 0.2, out);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.5 + show * 0.6, out), lerp(armR.elbow.rotation.y, 0.75 - show * 0.5, out), 0);
            armR.fingers.rotation.x = lerp(0.5, 0.9, out);
            armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, -0.8 + r * 0.06, rub + show * 0.3);
            armL.elbow.rotation.set(lerp(armL.elbow.rotation.x, -1.65, rub), lerp(armL.elbow.rotation.y, -1.0 + r * 0.15, rub), 0);
            head.rotation.set(lerp(0, 0.28, rub) - show * 0.22, lerp(0, 0.25, rub) + show * -0.15, 0);
            glint = show;
            faceNow = show > 0.3 ? 'happy' : rub > 0.3 ? 'sly' : null;
            break;
          }
          case 'arrange': {
            // Straighten the curios in front of him: lean in, both hands down, a tap, a nudge, back up
            const lean = win(k, 0.05, 0.95, 0.2), tap = Math.max(arch(k, 0.35, 0.5), arch(k, 0.58, 0.73));
            torso.rotation.x += lean * 0.3;
            both((A) => {
              A.shoulder.rotation.x = lerp(A.shoulder.rotation.x, -0.75 - (A.side > 0 ? tap * 0.12 : 0), lean);
              A.shoulder.rotation.z = lerp(A.shoulder.rotation.z, A.side * 0.2, lean);
              A.elbow.rotation.set(lerp(A.elbow.rotation.x, -0.45, lean), lerp(A.elbow.rotation.y, -A.side * 0.2, lean), 0);
              A.fingers.rotation.x = lerp(0.5, 0.2 + (A.side > 0 ? tap : 0), lean);
            });
            head.rotation.x += lean * 0.25;
            faceNow = lean > 0.5 ? 'sly' : null;
            break;
          }
          case 'watch': {
            // The pocket watch up on its chain; he peers at it, taps it, and tucks it away
            const up = win(k, 0.05, 0.92, 0.15), tap = arch(k, 0.55, 0.68);
            watch.scale.setScalar(Math.max(0.001, win(k, 0.1, 0.88, 0.04)));
            armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, -0.9, up);
            armL.shoulder.rotation.z = lerp(armL.shoulder.rotation.z, 0.05, up);
            armL.elbow.rotation.set(lerp(armL.elbow.rotation.x, -1.45, up), lerp(armL.elbow.rotation.y, -0.7, up), 0);
            armL.wrist.rotation.set(-0.7 * up, 0, 0);
            armR.shoulder.rotation.x = lerp(armR.shoulder.rotation.x, -0.75 - tap * 0.1, tap > 0 ? 1 : 0);
            armR.elbow.rotation.set(lerp(armR.elbow.rotation.x, -1.6, tap > 0 ? 1 : 0), lerp(armR.elbow.rotation.y, 0.9, tap > 0 ? 1 : 0), 0);
            head.rotation.set(0.3 * up, -0.2 * up, 0);
            faceNow = up > 0.4 ? (tap > 0.3 ? 'surprised' : 'sly') : null;
            break;
          }
        }
        if (k >= 1) {
          if (action) { if (!action.hit) action.onHit?.(); action = null; } else fidget = null;
        }
      }

      // The hat: lifted off his head for a tip, and it settles back with a wobble
      const lift = S.hatLift.update(hatLift, dt);
      hatBase.position.set(0, lift * 0.07, lift * 0.03);
      hatBase.rotation.set(lift * 0.5, 0, 0);

      // Head: look about when idle; toward whoever he's talking to otherwise; blink
      if ((nextLook -= dt) < 0) { lookTarget = moving > 0.1 || faceTo !== null ? 0 : (Math.random() - 0.5) * 1.0; nextLook = 1.6 + Math.random() * 3; }
      look += (lookTarget * (1 - moving) - look) * (1 - Math.exp(-dt * 4));
      head.rotation.y += run ? 0 : look - torso.rotation.y * 0.8;
      head.rotation.x += -torso.rotation.x * 0.5;
      if ((blinkT -= dt) < 0) blinkT = 2 + Math.random() * 3.5;
      const resting = !warm && mood === 'calm' ? 'calm' : mood;
      face.show(faceNow ?? (blinkT < 0.12 && mood !== 'happy' ? 'blink' : action ? MOODS[action.name] ?? resting : resting));

      // Secondary motion: the coat tails, the hair, the plume, the trinkets and the goatee
      const drag = S.tails.update(0.06 * moving + Math.max(0, torso.rotation.x - 0.08) * -0.1, dt);
      swayCloth(tailsGeo, { drag, lift: Math.abs(s) * 0.025 * moving + 0.004, time, ripple: 0.004 + 0.008 * moving });
      for (const L of locks) {
        L.j.rotation.x = L.spring.update(0.3 * moving + Math.sin(time * 1.4 + L.phase) * 0.03 + Math.abs(s) * 0.05 * moving - head.rotation.x * 0.5, dt);
        L.j.rotation.z = L.side.update(-turn * 0.05, dt);
      }
      plume.rotation.x = -0.5 + S.plume.update(0.25 * moving - accel * 0.03 + lift * 0.6 + Math.sin(time * 1.1) * 0.03, dt);
      plume.rotation.z = -0.45 + S.plumeZ.update(-turn * 0.06 + s * 0.05 * moving, dt);
      for (const [i, T] of trinkets.entries()) {
        T.pivot.rotation.x = T.sx.update(0.5 * moving + Math.abs(c) * 0.2 * moving + lift * 0.8 + Math.sin(time * 2 + i) * 0.06 - head.rotation.x, dt);
        T.pivot.rotation.z = T.sz.update(-turn * 0.08 + s * 0.2 * moving - head.rotation.z, dt);
      }
      goatee.rotation.x = S.goatee.update(-accel * 0.01 + (faceNow === 'talk' ? Math.sin(time * 30) * 0.05 : 0), dt);
      baubleGlint.scale.setScalar(Math.max(0.001, glint * (0.09 + Math.sin(time * 9) * 0.03)));
      breath.update(dt);
    },
  };
  api.setWarm(false);
  return api;
}

// ---------------------------------------------------------------- the face
// The canvas covers the front half of his head (see paintedFace in party-kit.js): x 256 is the middle of his face,
// y 244 his eye line, y 338 his mouth (the nose is modelled between). His own left is the viewer's right. A long,
// clever face: narrow, sly amber eyes under hooded lids and thin arched silver brows, crow's feet and hollow cheeks,
// a thin moustache and a neat pointed goatee (its tip is modelled).
function drawQuillFace(g, mood, S) {
  const k = S / 512;
  g.save();
  g.scale(k, k);
  g.fillStyle = C.skin;
  g.fillRect(0, 0, 512, 512);
  // hollow cheeks under high cheekbones, and a flush that goes pinker in the cold
  for (const s of [-1, 1]) {
    const grad = g.createRadialGradient(256 + s * 92, 330, 6, 256 + s * 92, 330, 70);
    grad.addColorStop(0, 'rgba(170,110,90,0.28)');
    grad.addColorStop(1, 'rgba(170,110,90,0)');
    g.fillStyle = grad;
    ellipse(g, 256 + s * 92, 330, 70, 60);
    g.fill();
    const flush = g.createRadialGradient(256 + s * 78, 296, 4, 256 + s * 78, 296, 38);
    flush.addColorStop(0, mood === 'cold' ? 'rgba(236,110,120,0.55)' : mood === 'happy' ? 'rgba(226,120,110,0.4)' : 'rgba(220,130,120,0.22)');
    flush.addColorStop(1, 'rgba(220,130,120,0)');
    g.fillStyle = flush;
    ellipse(g, 256 + s * 78, 296, 40, 30);
    g.fill();
  }
  // silver sideburns at the temples, running down into the hair
  g.fillStyle = C.hairShade;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 256, 120);
    g.lineTo(256 + s * 182, 150);
    g.quadraticCurveTo(256 + s * 170, 250, 256 + s * 196, 330);
    g.lineTo(256 + s * 256, 360);
    g.closePath();
    g.fill();
  }
  g.fillStyle = C.hair;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 256, 120);
    g.lineTo(256 + s * 196, 142);
    g.quadraticCurveTo(256 + s * 186, 240, 256 + s * 206, 312);
    g.lineTo(256 + s * 256, 340);
    g.closePath();
    g.fill();
  }
  // lines: crow's feet, the nose-to-mouth creases, a little under each eye
  g.strokeStyle = C.line;
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (const a of [-0.5, 0.1, 0.6]) {
      g.beginPath();
      g.moveTo(256 + s * 96, 246 + a * 8);
      g.lineTo(256 + s * 112, 240 + a * 24);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(256 + s * 30, 296);
    g.quadraticCurveTo(256 + s * 52, 318, 256 + s * 50, 352);
    g.stroke();
    g.beginPath();
    g.moveTo(256 + s * 36, 272);
    g.quadraticCurveTo(256 + s * 60, 280, 256 + s * 82, 270);
    g.stroke();
  }
  g.fillStyle = 'rgba(150,90,70,0.3)'; // under the nose (the nose is modelled)
  ellipse(g, 256, 306, 16, 5);
  g.fill();

  // brows: thin, high and arched, and they do a good deal of his selling
  const brows = {
    calm: [[-1, 196, 0], [1, 196, 0]], blink: [[-1, 198, 0], [1, 198, 0]], talk: [[-1, 188, -0.1], [1, 184, -0.2]],
    happy: [[-1, 188, -0.15], [1, 188, -0.15]], sly: [[-1, 204, 0.25], [1, 176, -0.35]], cold: [[-1, 184, -0.6], [1, 184, -0.6]],
    surprised: [[-1, 172, -0.2], [1, 170, -0.2]],
  };
  for (const [s, y, tilt] of brows[mood]) {
    const inner = 256 + s * 22, outer = 256 + s * 92;
    g.strokeStyle = '#5e566e';
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(inner, y + tilt * 16);
    g.quadraticCurveTo(256 + s * 58, y - 20 + tilt * 4, outer, y + 4 - tilt * 6);
    g.stroke();
    g.strokeStyle = C.hair;
    g.lineWidth = 6;
    g.stroke();
  }

  // eyes: narrow and knowing, amber, under heavy lids
  const eye = (s, { open = 1, lid = 0.4, look = 0 } = {}) => {
    const cx = 256 + s * 54, cy = 246, rx = 27, ry = 13 * open;
    g.save();
    g.beginPath();
    g.moveTo(cx - rx, cy + 2);
    g.quadraticCurveTo(cx - s * 4, cy - ry * 2.0, cx + rx, cy - 2 * s);
    g.quadraticCurveTo(cx, cy + ry * 1.3, cx - rx, cy + 2);
    g.closePath();
    g.fillStyle = '#f4ecdc';
    g.fill();
    g.clip();
    const ix = cx + look * 6, iy = cy;
    g.fillStyle = '#6a3a12';
    g.beginPath(); g.arc(ix, iy, 12.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c0801e';
    g.beginPath(); g.arc(ix, iy, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1010';
    g.beginPath(); g.arc(ix, iy, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ix - 4, iy - 4, 3.4, 0, Math.PI * 2); g.fill();
    // the heavy upper lid
    g.fillStyle = mixColor(C.skin, C.skinShade, 0.55);
    g.fillRect(cx - rx - 2, cy - 30, rx * 2 + 4, 30 - ry * (1.4 - lid * 2.2));
    g.restore();
    g.strokeStyle = '#3a2420';
    g.lineWidth = 5;
    const lidY = cy - ry * (1.4 - lid * 2.2);
    g.beginPath();
    g.moveTo(cx - rx - 2, cy + 2);
    g.quadraticCurveTo(cx, Math.min(lidY, cy) - 3, cx + rx + 2, cy - 2 * s);
    g.stroke();
  };
  const closed = (s, curve) => {
    const cx = 256 + s * 54, cy = 248;
    g.strokeStyle = '#3a2420';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(cx - 24, cy - curve * 0.3);
    g.quadraticCurveTo(cx, cy + curve, cx + 24, cy - curve * 0.3);
    g.stroke();
  };
  for (const s of [-1, 1]) {
    if (mood === 'blink') closed(s, 4);
    else if (mood === 'happy') closed(s, -10);
    else if (mood === 'cold') { closed(s, 3); g.lineWidth = 3; g.beginPath(); g.moveTo(256 + s * 30, 238); g.lineTo(256 + s * 42, 246); g.stroke(); }
    else if (mood === 'surprised') eye(s, { open: 1.35, lid: -0.1 });
    else if (mood === 'sly') eye(s, { lid: s > 0 ? 0.25 : 0.62, look: -0.7 });
    else if (mood === 'talk') eye(s, { lid: 0.35, look: 0.3 });
    else eye(s, { lid: 0.45, look: 0.4 });
  }

  // the moustache: thin, silver, turned up at the ends (the modelled one sits on top of this)
  g.strokeStyle = C.hairDark;
  g.lineWidth = 11;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 4, 318);
    g.quadraticCurveTo(256 + s * 40, 326, 256 + s * 62, 312);
    g.stroke();
  }
  g.strokeStyle = C.hair;
  g.lineWidth = 6;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 4, 317);
    g.quadraticCurveTo(256 + s * 40, 324, 256 + s * 62, 310);
    g.stroke();
  }

  // the mouth: thin lips and a sly corner
  g.strokeStyle = '#8a3c38';
  g.fillStyle = '#5a2426';
  g.lineWidth = 5.5;
  if (mood === 'calm' || mood === 'blink') {
    g.beginPath(); // a half-smile, up at his left corner
    g.moveTo(228, 342);
    g.quadraticCurveTo(256, 350, 290, 334);
    g.stroke();
  } else if (mood === 'sly') {
    g.beginPath();
    g.moveTo(230, 344);
    g.quadraticCurveTo(262, 348, 294, 330);
    g.stroke();
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(292, 330); g.lineTo(298, 326); g.stroke();
  } else if (mood === 'talk') {
    ellipse(g, 258, 344, 17, 11);
    g.fill();
    g.fillStyle = '#efe6d8';
    g.fillRect(246, 334, 24, 4);
  } else if (mood === 'happy') {
    g.beginPath();
    g.moveTo(222, 336);
    g.quadraticCurveTo(258, 346, 296, 332);
    g.quadraticCurveTo(260, 374, 222, 336);
    g.fill();
    g.fillStyle = '#efe6d8';
    g.fillRect(236, 338, 42, 6);
  } else if (mood === 'cold') {
    // teeth clenched against the cold
    g.fillStyle = '#efe6d8';
    g.fillRect(232, 336, 50, 12);
    g.strokeRect(232, 336, 50, 12);
    g.lineWidth = 2;
    for (const x of [244, 257, 270]) { g.beginPath(); g.moveTo(x, 336); g.lineTo(x, 348); g.stroke(); }
  } else if (mood === 'surprised') {
    ellipse(g, 258, 346, 11, 14);
    g.fill();
  }
  // the goatee, from the lower lip down to his chin, where the modelled tip takes over
  g.fillStyle = C.hairShade;
  g.beginPath();
  g.moveTo(236, 362);
  g.quadraticCurveTo(256, 356, 276, 362);
  g.lineTo(268, 470);
  g.lineTo(244, 470);
  g.closePath();
  g.fill();
  g.fillStyle = C.hair;
  g.beginPath();
  g.moveTo(242, 364);
  g.quadraticCurveTo(256, 360, 270, 364);
  g.lineTo(262, 470);
  g.lineTo(250, 470);
  g.closePath();
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- cloth, felt and the hat, painted and shaped in code

// The frock coat: plum, with darker folds, a gold braid near the hem, and the odd patch
function coatTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = C.coat;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 20) {
      const grad = g.createLinearGradient(x, 0, x + 20, 0);
      grad.addColorStop(0, 'rgba(30,0,12,0.22)');
      grad.addColorStop(0.5, 'rgba(255,140,170,0.06)');
      grad.addColorStop(1, 'rgba(30,0,12,0.22)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 20, h);
    }
    g.fillStyle = C.gold;
    g.fillRect(0, h * 0.86, w, h * 0.025);
    g.fillStyle = C.goldDark;
    for (let x = 3; x < w; x += 9) g.fillRect(x, h * 0.865, 3, h * 0.015);
    // a patch or two, neatly stitched: well dressed, and well travelled
    g.fillStyle = mixColor(C.coat, '#3a1030', 0.4);
    g.fillRect(w * 0.62, h * 0.35, 18, 14);
    g.strokeStyle = C.gold;
    g.setLineDash([2, 2]);
    g.lineWidth = 1;
    g.strokeRect(w * 0.62, h * 0.35, 18, 14);
    g.setLineDash([]);
  }, { flipY: false });
}

// The waistcoat: dark stripes and a brown ground (the stripes run down him: u goes round the lathe)
function vestTexture() {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = C.vestB;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.vestA;
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 4, h);
    g.fillStyle = 'rgba(226,184,90,0.55)';
    for (let x = 6; x < w; x += 16) g.fillRect(x, 0, 1, h);
  }, { flipY: false });
}

// The hat's felt: dusty black, scuffed, with a crimson band's shadow
function hatTexture() {
  return canvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = C.hat;
    g.fillRect(0, 0, w, h);
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(90,70,80,0.35)' : 'rgba(0,0,0,0.3)';
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1 + rnd() * 2);
    }
  }, { flipY: false });
}

// The crown of the top hat: tall, a little wider at the top, battered (a dent on one side, the top pushed askew)
function crownGeometry() {
  const geo = new THREE.CylinderGeometry(0.152, 0.14, 0.27, 20, 6, false);
  geo.translate(0, 0.135, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / 0.27;
    const a = Math.atan2(z, x);
    // a dent on his right, and the top tipped back a touch
    const dent = Math.max(0, Math.cos(a - Math.PI * 0.95)) ** 3 * 0.025 * Math.sin(t * Math.PI);
    const len = Math.hypot(x, z) || 1;
    pos.setXYZ(i, x - (x / len) * dent, y + (t > 0.99 ? -z * 0.08 : 0), z - (z / len) * dent - t * t * 0.015);
  }
  geo.computeVertexNormals();
  return geo;
}

// A top hat's brim: a flat ring whose sides curl up and whose front and back dip
function topBrim(inner, outer, segments = 36) {
  const pts = [], idx = [];
  const rings = 3;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const radius = inner + (outer - inner) * t;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const curl = 0.05 * t * t * Math.cos(a) ** 2 - 0.012 * t * Math.sin(a) ** 2;
      pts.push(Math.cos(a) * radius * 0.92, curl, Math.sin(a) * radius);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < segments; i++) {
      const a = r * (segments + 1) + i, b = a + 1, c = a + segments + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
