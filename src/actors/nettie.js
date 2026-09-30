import * as THREE from 'three';
import {
  toon, toonMap, part, joint, sphere, cyl, cone, lathe, skirt, swayCloth, taperedTube, badge, starShape, blobShadow, glowSprite,
  onLayer, Spring,
} from './kit.js';
import {
  bladeGeometry, PROFILE, merge, paintedFace, Particles, sparkSprite, twinkleTexture, worldPos, holdOrientation, ss, win, arch, lerp, clamp,
} from './party-kit.js';
import { NC as C, drawNettieFace, shawlTextures, robeTexture, bodiceTexture, feltTexture, waterTexture } from './party-nettie-art.js';

// Nettie the Swamp Witch, of Bogmire in Aethermoor's Gloomfen. "Healer, herbalist, witch. Two of those you can buy.
// The third you don't cross. Mind the jars; some bite." The look is Aethermoor's own (map-sprites.js): a crooked
// peat-brown witch's hat with a reed band, a sedge-green robe trimmed in fen-moss, a red leather sash hung with
// seaglass, ruby and amber bottles, long black hair, bare hands, dark boots, her knotted bog-cotton Hexbane Shawl
// (an open net of knots, tassels, bone charms and one glowing thread) and a gnarled bogwood staff with reed leaves
// and a bead of bog amber. "Moonlight. Very pretty. Down here we use a lamp and a stick": so a tin lantern hangs from
// the crook. Where the sources are silent: she's older than the witch, with a silver streak, a hooked nose and a
// smirk; a toad rides her hat brim; the jar on her hip really does bite; her free hand lives on her hip.
// Moves: attack (a good whack with the stick), jars (Mind the Jars: a biting jar, lobbed), stir (Stir the Pot: a
// little cauldron, stirred with the staff; heals), tide (fen water, slammed up out of the ground), hex (a glowing knot
// tied round the target), ward (a ring of charm-hung stones), undo (Undo the Knot: her shawl's surge), cast, cheer,
// hurt, ko (sits down with her hat over her eyes), rise.

export function createNettie() {
  const root = new THREE.Group();
  root.name = 'nettie';
  const body = joint(root, [0, 0, 0], 'body');

  // ---------------------------------------------------------------- legs and muddy boots
  const hips = joint(body, [0, 0.4, 0], 'hips');
  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, [side * 0.075, 0, 0]);
    const knee = joint(hip, [0, -0.19, 0]);
    part(knee, cyl(0.05, 0.045, 0.16, 10), toon(C.boot), { pos: [0, -0.09, 0] });
    part(knee, cyl(0.058, 0.054, 0.04, 10), toon(C.leather), { pos: [0, -0.015, 0] }); // a folded cuff
    part(knee, cyl(0.049, 0.051, 0.06, 10), toon(C.mud), { pos: [0, -0.15, 0], ink: false }); // caked mud
    const ankle = joint(knee, [0, -0.18, 0]);
    part(ankle, sphere(0.052, 12, 8), toon(C.boot), { pos: [0, -0.012, 0.03], scale: [1, 0.72, 1.7] });
    // the toe turns up, a little, as a witch's should
    part(ankle, taperedTube([[0, -0.01, 0.1], [0, 0.0, 0.13], [0, 0.025, 0.14]], 0.022, 0.006, 6, 6), toon(C.boot), {});
    part(ankle, cyl(0.055, 0.055, 0.012, 10), toon(C.mud), { pos: [0, -0.038, 0.03], scale: [1, 1, 1.75], ink: false });
    return { hip, knee, ankle };
  });

  // ---------------------------------------------------------------- robe, petticoat, sash, bottles, the jar
  const robeTex = robeTexture();
  const petticoat = part(hips, skirt({ top: 0.14, bottom: 0.27, height: 0.43, flare: 0.8, points: 18, zig: 0.02, rows: 5, ragged: 0.03 }), toonMap(robeTexture(C.petticoat, C.mud, false), { side: THREE.DoubleSide }), { pos: [0, 0.14, 0] });
  const robe = part(hips, skirt({ top: 0.148, bottom: 0.3, height: 0.41, flare: 0.72, points: 22, zig: 0.024, rows: 6, gap: 0.62, ragged: 0.045 }), toonMap(robeTex, { side: THREE.DoubleSide }), { pos: [0, 0.16, 0] });
  part(hips, cyl(0.15, 0.156, 0.05, 18), toon(C.sash), { pos: [0, 0.16, 0] });
  // the sash's knot and two tails, at her right hip
  part(hips, sphere(0.03, 8, 6), toon(C.sash), { pos: [-0.13, 0.16, 0.07], scale: [1, 0.8, 0.7] });
  const sashTails = joint(hips, [-0.13, 0.15, 0.08]);
  part(sashTails, merge([
    taperedTube([[0, 0, 0], [-0.02, -0.06, 0.01], [-0.015, -0.14, 0.0]], 0.018, 0.012, 8, 5),
    taperedTube([[0, 0, 0], [0.015, -0.05, 0.015], [0.02, -0.11, 0.01]], 0.017, 0.011, 8, 5),
  ]), toon(C.sashDark));

  // Bottles on cords at her right hip: seaglass, ruby, amber
  const hangers = [];
  const bottleGeo = lathe([[0.001, -0.07], [0.022, -0.066], [0.026, -0.045], [0.02, -0.028], [0.009, -0.02], [0.008, -0.008]], 10);
  for (const [i, [x, z, color]] of [[-0.085, 0.13, C.sea], [-0.125, 0.09, C.ruby], [-0.15, 0.03, C.amberGlass]].entries()) {
    const pivot = joint(hips, [x, 0.14, z]);
    const b = joint(pivot, [0, -0.012, 0]);
    part(b, bottleGeo, toon(color, { emissive: new THREE.Color(color).multiplyScalar(0.25), transparent: true, opacity: 0.88 }), { scale: 0.9 + i * 0.08 });
    part(b, cyl(0.009, 0.008, 0.014, 6), toon('#8a5a36'), { pos: [0, -0.002, 0], ink: false });
    hangers.push({ pivot, sx: new Spring(40, 3.2), sz: new Spring(40, 3.2), phase: i * 1.7 });
  }

  // The jar that bites, at her left hip: murky glass, a lid on a hinge, teeth under the lid, and two eyes inside.
  const jarPivot = joint(hips, [0.13, 0.13, 0.09], 'jar');
  const jar = buildJar(jarPivot);

  // A satchel of remedies at her left hip, on a strap over her right shoulder
  const satchel = joint(hips, [0.16, 0.06, -0.06]);
  satchel.rotation.set(0, 0.9, 0.05);
  part(satchel, new THREE.BoxGeometry(0.1, 0.09, 0.05, 2, 2, 1), toon(C.leather), { pos: [0, 0, 0] });
  part(satchel, new THREE.CylinderGeometry(0.026, 0.026, 0.1, 10, 1, false, 0, Math.PI), toon('#6e4a30'), { pos: [0, 0.045, 0.0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.02] });
  part(satchel, new THREE.BoxGeometry(0.018, 0.022, 0.006), toon(C.bone), { pos: [0, 0.02, 0.03], ink: false });
  part(satchel, merge([[-0.03, 0.02, '#7aa05a'], [-0.012, 0.03, '#9a8a4a'], [0.02, 0.025, '#6a9a50']].map(([x, h]) =>
    new THREE.ConeGeometry(0.012, 0.06 + h, 5).translate(x, 0.07 + h / 2, -0.01))), toon('#7a9a52'));

  // ---------------------------------------------------------------- torso and the Hexbane Shawl
  const torso = joint(hips, [0, 0.17, 0], 'torso');
  const bodiceMat = toonMap(bodiceTexture());
  part(torso, cyl(0.112, 0.14, 0.24, 14), bodiceMat, { pos: [0, 0.11, 0] });
  part(torso, sphere(0.11, 12, 8), toon(C.robe), { pos: [0, 0.12, 0.035], scale: [1.08, 0.82, 0.72] });
  part(torso, cyl(0.07, 0.085, 0.06, 12), toon(C.robe), { pos: [0, 0.245, 0] });

  const shawlPivot = joint(torso, [0, 0.235, 0], 'shawl');
  const { map: shawlMap, glow: shawlGlow } = shawlTextures();
  const shawlMat = toonMap(shawlMap, { side: THREE.DoubleSide, alphaTest: 0.5, emissiveMap: shawlGlow, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.9 });
  const shawlGeo = skirt({ top: 0.12, bottom: 0.33, height: 0.38, flare: 0.7, points: 24, zig: 0.0, gap: 0.55, rows: 6, backDrop: 0.12, ragged: 0 });
  // (no outline shell: it would show black through the net's holes; the net draws its own edges)
  const shawl = part(shawlPivot, shawlGeo, shawlMat, { ink: false });
  part(shawlPivot, new THREE.SphereGeometry(0.16, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), toonMap(shawlMap, { alphaTest: 0.5 }), { pos: [0, -0.035, -0.004], scale: [1, 0.5, 0.95], ink: false });
  // Tied at the breastbone: a fat knot and two knotted tails
  part(shawlPivot, sphere(0.034, 10, 8), toon(C.shawl), { pos: [0, -0.07, 0.12], scale: [1.2, 0.9, 0.8] });
  const knotTails = joint(shawlPivot, [0, -0.08, 0.125]);
  part(knotTails, merge([
    taperedTube([[0, 0, 0], [-0.03, -0.07, 0.02], [-0.04, -0.16, 0.02]], 0.02, 0.01, 8, 6),
    taperedTube([[0, 0, 0], [0.025, -0.06, 0.025], [0.035, -0.13, 0.02]], 0.019, 0.01, 8, 6),
    new THREE.SphereGeometry(0.016, 8, 6).translate(-0.04, -0.16, 0.02),
    new THREE.SphereGeometry(0.015, 8, 6).translate(0.035, -0.13, 0.02),
  ]), toon(C.shawl));
  // Bone charms knotted to the shawl's edge
  const charms = [];
  for (const [i, a] of [-0.9, 0.35, 1.2].entries()) {
    const ang = Math.PI / 2 + a;
    const pivot = joint(shawlPivot, [Math.cos(ang) * 0.29, -0.34, Math.sin(ang) * 0.29]);
    part(pivot, merge([
      new THREE.CylinderGeometry(0.005, 0.005, 0.034, 5).translate(0, -0.055, 0),
      new THREE.SphereGeometry(0.007, 5, 4).translate(-0.004, -0.038, 0), new THREE.SphereGeometry(0.007, 5, 4).translate(0.004, -0.038, 0),
      new THREE.SphereGeometry(0.007, 5, 4).translate(-0.004, -0.072, 0), new THREE.SphereGeometry(0.007, 5, 4).translate(0.004, -0.072, 0),
    ]), toon(C.bone), { rot: [0, 0, i === 1 ? 0.5 : -0.3] });
    charms.push({ pivot, sx: new Spring(36, 3), sz: new Spring(36, 3), phase: i * 2.3 });
  }
  // The satchel strap, from her right shoulder across to her left hip
  part(torso, taperedTube([[-0.12, 0.22, 0.07], [-0.05, 0.16, 0.135], [0.05, 0.06, 0.14], [0.13, -0.03, 0.1], [0.165, -0.1, 0.02]], 0.011, 0.011, 16, 5), toon(C.leather), { scale: [1, 1, 1] });

  // ---------------------------------------------------------------- arms and bare hands
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(torso, [side * 0.14, 0.2, 0]);
    shoulder.rotation.z = side * 0.18;
    part(shoulder, cyl(0.042, 0.048, 0.16, 8), toon(C.robe), { pos: [0, -0.08, 0] });
    const elbow = joint(shoulder, [0, -0.155, 0]);
    part(elbow, cyl(0.046, 0.078, 0.13, 10, true), toonMap(robeTexture(C.robe, C.trim, false), { side: THREE.DoubleSide }), { pos: [0, -0.06, 0] });
    part(elbow, new THREE.TorusGeometry(0.076, 0.009, 4, 14), toon(C.trim, { rim: 0 }), { pos: [0, -0.125, 0], rot: [Math.PI / 2, 0, 0], ink: false });
    part(elbow, cyl(0.026, 0.03, 0.07, 8), toon(C.skin), { pos: [0, -0.1, 0], ink: false }); // the wrist, in the sleeve
    const wrist = joint(elbow, [0, -0.14, 0]);
    part(wrist, sphere(0.034, 8, 6), toon(C.skin), { pos: [0, -0.02, 0], scale: [1, 1.2, 0.72] });
    part(wrist, sphere(0.016, 6, 5), toon(C.skin), { pos: [-side * 0.024, -0.012, 0.012], scale: [0.9, 1.3, 0.9] }); // thumb
    return { shoulder, elbow, wrist, side };
  });
  const [armR, armL] = arms; // arms[0] is her right (x -), arms[1] her left
  // The elbow twists about the upper arm before it bends, so a forearm can swing inward (a fist on the hip)
  for (const a of arms) a.elbow.rotation.order = 'YXZ';
  // her left hand: a crooked pointing finger (for hexes) and her ring of bog amber
  const finger = joint(armL.wrist, [0.004, -0.045, 0.006]);
  part(finger, taperedTube([[0, 0, 0], [0.0, -0.03, 0.004], [0.006, -0.05, 0.012], [0.012, -0.058, 0.02]], 0.009, 0.006, 8, 5), toon(C.skin));
  finger.scale.setScalar(0.01);
  part(armL.wrist, new THREE.TorusGeometry(0.012, 0.004, 5, 10), toon('#b08a3a'), { pos: [0.006, -0.046, 0.012], rot: [Math.PI / 2, 0, 0.3], ink: false });
  const ringStone = part(armL.wrist, sphere(0.007, 8, 6), new THREE.MeshBasicMaterial({ color: C.amber }), { pos: [0.008, -0.044, 0.022], ink: false });
  const ringGlow = glowSprite(C.amber, 0.12, 0);
  ringStone.add(ringGlow);

  // ---------------------------------------------------------------- the staff and its lantern
  const staffPivot = joint(armR.wrist, [0, -0.028, 0.01], 'staff');
  const staff = buildStaff(staffPivot);

  // ---------------------------------------------------------------- head, face, hair
  const neck = joint(torso, [0, 0.25, 0], 'neck');
  part(neck, cyl(0.034, 0.038, 0.07, 8), toon(C.skin), { pos: [0, 0.02, 0], ink: false });
  const head = joint(neck, [0, 0.15, 0.005], 'head');
  const skull = part(head, new THREE.SphereGeometry(0.19, 28, 20), toon(C.skin), { scale: [0.98, 1.0, 0.95] });
  const face = paintedFace(skull, ['calm', 'blink', 'surprised', 'happy', 'cross', 'hurt'], drawNettieFace);
  // the nose: a proper witch's nose, long and a little hooked, with a bump on the bridge
  const noseMat = toon(C.skin, { rim: 0.6 });
  part(head, taperedTube([[0, -0.01, 0.17], [0, -0.026, 0.188], [0, -0.044, 0.196], [0, -0.058, 0.194], [0, -0.064, 0.184]], 0.016, 0.012, 10, 7), noseMat, { ink: false });
  part(head, sphere(0.015, 8, 6), noseMat, { pos: [0, -0.058, 0.19], scale: [1.1, 0.95, 1] , ink: false });

  const hair = joint(head, [0, 0, 0], 'hair');
  const hairMat = toon(C.hair, { side: THREE.DoubleSide });
  part(hair, new THREE.SphereGeometry(0.2, 24, 14, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 0, Math.PI * 0.66), hairMat, { pos: [0, 0.008, -0.006] });
  part(hair, new THREE.SphereGeometry(0.202, 24, 8, 0, Math.PI * 2, 0, 0.66), toon(C.hair), { pos: [0, 0.01, 0] });
  // Parted in the middle and pulled back behind her ears, a silver streak from the parting on her left
  part(hair, merge([
    taperedTube([[0.01, 0.17, 0.08], [0.1, 0.13, 0.13], [0.16, 0.06, 0.12], [0.185, -0.02, 0.07]], 0.03, 0.014, 12, 6),
    taperedTube([[-0.01, 0.17, 0.08], [-0.1, 0.13, 0.13], [-0.16, 0.06, 0.12], [-0.185, -0.02, 0.07]], 0.03, 0.014, 12, 6),
  ]), toon(C.hair));
  part(hair, taperedTube([[0.03, 0.172, 0.09], [0.11, 0.135, 0.14], [0.168, 0.07, 0.128], [0.19, -0.01, 0.08]], 0.017, 0.008, 12, 6), toon(C.streak));
  // A curtain of long black hair down her back, ragged at the ends; the locks swing over it
  const curtain = part(hair, skirt({ top: 0.17, bottom: 0.25, height: 0.5, flare: 0.9, points: 20, zig: 0.05, gap: 2.3, rows: 5, ragged: 0.12 }), toon(C.hairDark, { side: THREE.DoubleSide }), { pos: [0, 0.02, -0.02] });
  // Long straggly locks, each swinging from its root
  const locks = [];
  const lock = (rootPos, drop, spread, thick, tone, waves = 2.5, kink = 0.05) => {
    const j = joint(hair, rootPos);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const wave = Math.sin(t * Math.PI * waves) * kink * Math.min(1, t * 1.6);
      pts.push([spread[0] * t + wave, -drop * t, spread[1] * t + wave * 0.4]);
    }
    part(j, taperedTube(pts, thick, thick * 0.25, 14, 6), toon(tone));
    locks.push({ j, spring: new Spring(24 + Math.random() * 8, 4.2), side: new Spring(20, 4), phase: Math.random() * 6 });
    return j;
  };
  for (const side of [-1, 1]) {
    lock([side * 0.18, -0.02, 0.06], 0.36, [side * 0.05, 0.05], 0.042, C.hairLight, 3.2, 0.03);
    lock([side * 0.17, 0.02, -0.1], 0.52, [side * 0.08, -0.04], 0.05, C.hair, 2.4);
  }
  lock([0.19, -0.03, 0.02], 0.38, [0.07, 0.07], 0.022, C.streak, 3, 0.03); // the streak comes down her left side
  lock([0, 0.06, -0.18], 0.56, [0, -0.08], 0.06, C.hairLight, 2);

  // ---------------------------------------------------------------- the crooked hat
  const hat = joint(head, [0, 0.14, -0.012], 'hat');
  hat.rotation.set(0.06, 0, 0.1);
  const feltMat = toonMap(feltTexture(false), { side: THREE.DoubleSide });
  const patchedMat = toonMap(feltTexture(true), { side: THREE.DoubleSide });
  // the brim is seen edge-on and faces the sky, so it takes less of the moonlit rim, and a darker felt
  const brimMat = toonMap(feltTexture(false), { side: THREE.DoubleSide, color: '#9a8878', rim: 0.25 });
  const brim = part(hat, floppyBrim(0.17, 0.4), brimMat);
  part(hat, cyl(0.176, 0.182, 0.065, 20), toon(C.band, { rim: 0.5 }), { pos: [0, 0.035, 0] });
  const crown = [];
  let parent = joint(hat, [0, 0.06, 0]);
  const segs = [[0.178, 0.15, 0.12], [0.15, 0.112, 0.12], [0.114, 0.07, 0.12], [0.072, 0.03, 0.12]];
  for (const [i, [rb, rt, h]] of segs.entries()) {
    const seg = part(parent, cyl(rt, rb, h, 16 - i * 2, i === 3 ? false : true), i === 1 ? patchedMat : feltMat, { pos: [0, h / 2, 0] });
    seg.scale.set(1, 1, 0.94 + i * 0.02);
    crown.push({ j: parent, sx: new Spring(40 - i * 6, 5), sz: new Spring(40 - i * 6, 5) });
    parent = joint(parent, [0, h * 0.94, 0]);
  }
  // tucked into the band: a bulrush, a heron's feather and a sprig of bog myrtle
  const bulrush = joint(hat, [0.15, 0.05, -0.06]);
  bulrush.rotation.set(-0.25, 0, -0.35);
  part(bulrush, cyl(0.004, 0.005, 0.26, 5), toon(C.reed), { pos: [0, 0.13, 0], ink: false });
  part(bulrush, cyl(0.016, 0.016, 0.07, 8), toon('#6a4428'), { pos: [0, 0.2, 0] });
  const feather = joint(hat, [0.1, 0.05, -0.15]);
  feather.rotation.set(-0.9, 0.5, -0.3);
  part(feather, bladeGeometry(0.2, 0.038, { thick: 0.1, profile: PROFILE.feather, bend: 0.02 }).rotateX(Math.PI / 2), toon('#b8bcc4'));
  part(hat, merge([0, 1, 2, 3].map((i) => bladeGeometry(0.05, 0.02, { profile: PROFILE.leaf, thick: 0.2 }).rotateX(Math.PI / 2 - 0.4 - i * 0.2).rotateY(-0.6 + i * 0.35).translate(0.17, 0.06, 0.05))), toon('#5e8a44'));
  // mushrooms growing on the brim, and the toad
  part(hat, merge([
    new THREE.SphereGeometry(0.018, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.3, -0.0, 0.12),
    new THREE.CylinderGeometry(0.005, 0.006, 0.02, 5).translate(-0.3, -0.01, 0.12),
    new THREE.SphereGeometry(0.012, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.275, -0.008, 0.15),
    new THREE.CylinderGeometry(0.004, 0.005, 0.014, 5).translate(-0.275, -0.015, 0.15),
  ]), toon('#c89060'));
  const toad = buildToad(hat);

  const shadow = blobShadow(0.34, 0.5);
  root.add(shadow);
  onLayer(root);

  // ---------------------------------------------------------------- spell effects in the world
  const fx = new THREE.Group();
  fx.name = 'nettie-fx';
  const spells = buildSpells(fx);

  // ---------------------------------------------------------------- animation
  const S = {
    lean: new Spring(20, 6), shawl: new Spring(30, 5), lanternX: new Spring(22, 1.6), lanternZ: new Spring(22, 1.6),
    hatX: new Spring(50, 6), hatZ: new Spring(50, 6),
  };
  let phase = 0, time = 0, look = 0, lookTarget = 0, nextLook = 2, blinkT = 3, prevSpeed = 0;
  let fidget = null, nextFidget = 5, jarRattle = 0, nextRattle = 4, croak = 0, nextCroak = 3;
  let action = null, mood = 'calm', downed = false;
  const ACTIONS = { attack: 1.0, jars: 1.4, stir: 2.0, tide: 1.6, hex: 1.3, ward: 1.6, undo: 1.9, cast: 1.2, cheer: 1.4, hurt: 0.5, ko: 1.3, rise: 0.9 };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), e1 = new THREE.Euler();
  const lanternLight = staff.light;

  const api = {
    // fire: where her spells leave from (the lantern), as the witch's witchfire is for her
    root, head, hat, staff: staff.group, fire: staff.lantern, fx,
    name: 'Nettie the Swamp Witch',
    height: 1.52,
    radius: 0.24,
    center: 0.8,
    moves: Object.keys(ACTIONS),
    get busy() { return !!action; },
    setMood(m) { mood = m; },
    play(name, onHit, opts = {}) {
      if (!ACTIONS[name]) return;
      if (name === 'rise') downed = false;
      const reach = opts.reach ?? { attack: 0.3, jars: 1.7, tide: 1.7, hex: 1.5 }[name] ?? 0;
      action = { name, t: 0, dur: ACTIONS[name] * (opts.slow ?? 1), onHit, hit: false, reach, fired: {} };
      root.updateMatrixWorld();
      spells.begin(name, root, reach);
    },
    update(dt, speed = 0, turn = 0) {
      time += dt;
      const accel = (speed - prevSpeed) / Math.max(dt, 1e-3);
      prevSpeed = speed;
      const moving = Math.min(1, speed / 1.6);
      phase += ((speed * dt) / 0.55) * Math.PI;
      const s = Math.sin(phase), c = Math.cos(phase);

      // Legs: a short, sure-footed step; a slight stoop
      for (const [i, L] of legs.entries()) {
        const p = i ? phase + Math.PI : phase;
        const swing = Math.sin(p) * 0.5 * moving;
        L.hip.rotation.x = swing;
        L.knee.rotation.x = Math.max(0, -Math.cos(p)) * 0.85 * moving;
        L.ankle.rotation.x = -swing * 0.4;
      }
      hips.position.y = 0.4 + Math.abs(c) * 0.025 * moving - 0.012 * moving + Math.sin(time * 1.9) * 0.004 * (1 - moving);
      hips.rotation.y = s * 0.1 * moving;
      hips.rotation.z = c * 0.04 * moving;
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      torso.rotation.set(S.lean.update(0.1 + 0.1 * moving - accel * 0.01, dt), -s * 0.16 * moving, Math.sin(time * 0.8) * 0.012);
      torso.scale.y = 1 + Math.sin(time * 1.9) * 0.01 * (1 - moving);

      // Arms. Her right holds the staff out at her side; her left fist sits on her hip (or swings as she walks).
      armR.shoulder.rotation.set(-0.22 - s * 0.35 * moving, 0, -0.36);
      armR.elbow.rotation.set(-0.62 + s * 0.2 * moving, 0, 0);
      armR.wrist.rotation.set(0, 0, 0);
      const akimbo = 1 - moving;
      armL.shoulder.rotation.set(lerp(s * 0.3, 0.05, akimbo), 0, lerp(0.2, 0.95, akimbo));
      armL.elbow.rotation.set(lerp(-0.3, -1.75, akimbo), lerp(0, -1.5, akimbo), 0);
      armL.wrist.rotation.set(0, 0, lerp(0, -0.3, akimbo));
      const leftFree = (amt) => { armL.elbow.rotation.y = lerp(armL.elbow.rotation.y, 0, amt); armL.wrist.rotation.z = lerp(armL.wrist.rotation.z, 0, amt); };
      finger.scale.setScalar(0.01);
      // the staff: upright at her side, swung forward and planted with each step as she walks
      let staffTilt = { x: 0.08 + s * 0.3 * moving, z: -0.2 + 0.08 * moving }, staffDrop = 0;
      head.rotation.set(0, 0, 0);
      hat.position.set(0, 0.14, -0.012);
      let hatTip = 0;

      // idle fidgets: settle her hat, peer at something, or quieten the jar
      if (!moving && !action && !downed) {
        if ((nextFidget -= dt) < 0) { fidget = { name: ['hat', 'peer', 'lantern'][Math.floor(Math.random() * 3)], t: 0 }; nextFidget = 6 + Math.random() * 6; }
        if ((nextRattle -= dt) < 0) { jarRattle = 1.1; nextRattle = 7 + Math.random() * 7; }
      }
      if (jarRattle > 0) {
        jarRattle -= dt;
        const r = jarRattle;
        jar.rattle(r > 0.45 ? Math.sin(time * 40) * 0.5 + 0.5 : 0);
        // ...and she slaps the lid shut
        if (!action && !moving) {
          const slap = arch(1.1 - r, 0.45, 1.05);
          leftFree(slap);
          armL.shoulder.rotation.x -= slap * 0.35;
          armL.shoulder.rotation.z -= slap * 0.45;
          armL.elbow.rotation.x += slap * 0.95;
          if (r < 0.55 && r > 0.45) jar.rattle(0);
        }
      } else jar.rattle(0);
      if (fidget) {
        fidget.t += dt;
        const f = fidget.t;
        if (fidget.name === 'hat') {
          const k = f / 1.3, p = arch(k, 0, 1);
          leftFree(p);
          armL.shoulder.rotation.x -= p * 2.3; armL.shoulder.rotation.z -= p * 0.5;
          armL.elbow.rotation.x += p * 0.5;
          hatTip = arch(k, 0.35, 0.8) * -0.12;
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'peer') {
          const k = f / 1.8, p = win(k, 0, 1, 0.2);
          torso.rotation.x += p * 0.12;
          head.rotation.x += p * 0.08;
          lookTarget = 0.5;
          if (p > 0.5) face.show('cross');
          if (k >= 1) fidget = null;
        } else if (fidget.name === 'lantern') {
          const k = f / 1.6, p = win(k, 0, 1, 0.25);
          armR.shoulder.rotation.x -= p * 0.5;
          armR.elbow.rotation.x -= p * 0.2;
          staffTilt.x -= p * 0.15;
          S.lanternX.v += arch(k, 0.3, 0.4) * dt * 30;
          if (k >= 1) fidget = null;
        }
      }

      // ---- moves
      const glowRing = (a) => { ringGlow.material.opacity = a; };
      glowRing(0);
      let lanternBoost = 0, hexGlow = 0.9;
      if (action) {
        action.t += dt;
        const k = Math.min(1, action.t / action.dur);
        const bell = Math.sin(k * Math.PI);
        const hitAt = (at) => { if (!action.hit && k >= at) { action.hit = true; action.onHit?.(); } };
        const once = (key, at, fn) => { if (!action.fired[key] && k >= at) { action.fired[key] = true; fn(); } };
        const twoHands = (amt) => {
          // her left hand joins the right on the staff
          armL.shoulder.rotation.x = lerp(armL.shoulder.rotation.x, armR.shoulder.rotation.x - 0.1, amt);
          armL.shoulder.rotation.y = lerp(armL.shoulder.rotation.y, 0.5, amt);
          armL.shoulder.rotation.z = lerp(armL.shoulder.rotation.z, 0.3, amt);
          armL.elbow.rotation.x = lerp(armL.elbow.rotation.x, armR.elbow.rotation.x - 0.2, amt);
          leftFree(amt);
        };
        switch (action.name) {
          case 'attack': {
            // Two hands on the stick, up, and a good whack: "a lamp and a stick."
            const up = ss(k, 0, 0.38) * (1 - ss(k, 0.42, 0.55)), down = ss(k, 0.42, 0.55) * (1 - ss(k, 0.72, 1));
            body.position.z = action.reach * (ss(k, 0.3, 0.5) * (1 - ss(k, 0.75, 1)));
            armR.shoulder.rotation.x = -0.3 - up * 2.4 - down * 0.9;
            armR.shoulder.rotation.z = -0.32 + up * 0.2;
            armR.elbow.rotation.x = -0.85 + up * 0.5 + down * 0.6;
            twoHands(win(k, 0, 0.9, 0.12));
            staffTilt = { x: -0.06 - up * 0.9 + down * 1.55, z: -0.1 + up * 0.1 };
            torso.rotation.x += -up * 0.15 + down * 0.35;
            legs[1].hip.rotation.x = -down * 0.5;
            legs[0].hip.rotation.x = down * 0.3;
            if (down > 0.5) face.show('cross');
            hitAt(0.52);
            break;
          }
          case 'jars': {
            // Unhook the jar, wind up, and lob it overhand. It bites whatever it lands on.
            const grab = arch(k, 0.02, 0.3), wind = ss(k, 0.25, 0.45) * (1 - ss(k, 0.45, 0.52)), fling = ss(k, 0.45, 0.55) * (1 - ss(k, 0.72, 1));
            const free = ss(k, 0.02, 0.18) * (1 - ss(k, 0.85, 1));
            leftFree(free);
            armL.shoulder.rotation.set(lerp(0.12, 0.05, free) - grab * 0.25 + wind * 0.7 - fling * 2.3, 0.2 * fling, lerp(0.78, 0.3, free) - fling * 0.1);
            armL.elbow.rotation.x = lerp(-1.45, -0.35, free) - wind * 1.0 + fling * 0.3;
            torso.rotation.y += wind * 0.4 - fling * 0.35;
            jar.inHand(k > 0.16 && k < 0.5 ? armL.wrist : null);
            jar.visible(k < 0.5 || k > 0.92);
            once('throw', 0.5, () => { jar.inHand(null); spells.throwJar(worldPos(armL.wrist, v1)); });
            face.show(k > 0.3 && k < 0.8 ? 'cross' : mood);
            hitAt(0.82);
            break;
          }
          case 'stir': {
            // Up comes a little cauldron; she stirs it with the foot of her staff, and the steam does the healing.
            const on = win(k, 0.08, 0.92, 0.1);
            const round = action.t * 7;
            // hands out in front at her chest; the foot of the staff goes down into the pot and round
            armR.shoulder.rotation.x = -0.22 - on * (0.75 + Math.sin(round) * 0.1);
            armR.shoulder.rotation.z = -0.36 + on * (0.2 + Math.cos(round) * 0.08);
            armR.elbow.rotation.x = -0.62 - on * 0.45;
            twoHands(on);
            staffTilt = { x: lerp(staffTilt.x, -0.42 + Math.sin(round) * 0.1, on), z: lerp(staffTilt.z, 0.46 + Math.cos(round) * 0.1, on) };
            staffDrop = on * 0.05;
            torso.rotation.x += on * 0.18;
            head.rotation.x += on * 0.15;
            spells.stir(k, round);
            face.show(k > 0.6 && k < 0.8 ? 'happy' : 'calm');
            hitAt(0.62);
            break;
          }
          case 'tide': {
            // Staff up in both hands, then the foot of it down hard: the fen comes up out of the ground and rolls.
            const up = ss(k, 0.02, 0.3) * (1 - ss(k, 0.3, 0.38)), slam = ss(k, 0.3, 0.38) * (1 - ss(k, 0.7, 1));
            armR.shoulder.rotation.x = -0.3 - up * 2.2 - slam * 0.4;
            armR.shoulder.rotation.z = -0.32 + up * 0.25;
            armR.elbow.rotation.x = -0.85 + up * 0.55;
            twoHands(win(k, 0, 0.9, 0.1));
            staffTilt = { x: -0.06 + slam * 0.25, z: -0.1 + up * 0.1 };
            staffDrop = -up * 0.25 + slam * 0.04;
            hips.position.y -= slam * 0.06;
            torso.rotation.x += slam * 0.3 - up * 0.1;
            for (const L of legs) L.knee.rotation.x = Math.max(L.knee.rotation.x, slam * 0.5);
            legs[0].hip.rotation.x = -slam * 0.3;
            spells.tide(k);
            face.show(k > 0.25 && k < 0.8 ? 'cross' : mood);
            hitAt(0.72);
            break;
          }
          case 'hex': {
            // A crooked finger, a hard look, and a knot of hex-light is tied round whoever she's pointing at.
            const point = win(k, 0.08, 0.9, 0.12);
            leftFree(point);
            armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -1.45, point), lerp(armL.shoulder.rotation.y, 0.25, point), lerp(armL.shoulder.rotation.z, 0.12, point));
            armL.elbow.rotation.x = lerp(armL.elbow.rotation.x, -0.15, point);
            armL.wrist.rotation.x = -0.2 * point;
            finger.scale.setScalar(Math.max(0.01, point));
            torso.rotation.y += point * 0.25;
            head.rotation.x -= point * 0.05;
            glowRing(point * (0.6 + Math.sin(time * 20) * 0.2));
            spells.hex(k, worldPos(finger, v1));
            face.show('cross');
            hexGlow = 0.9 + point * 1.5;
            hitAt(0.72);
            break;
          }
          case 'ward': {
            // She lifts the lamp high; a ring of charm-hung stones comes up round her and hums.
            const up = win(k, 0.05, 0.9, 0.15);
            armR.shoulder.rotation.x = -0.3 - up * 2.1;
            armR.shoulder.rotation.z = -0.32 + up * 0.1;
            armR.elbow.rotation.x = -0.85 + up * 0.7;
            staffTilt = { x: -0.06, z: -0.1 };
            staffDrop = -up * 0.35;
            armL.shoulder.rotation.z += up * 0.4;
            armL.shoulder.rotation.x -= up * 0.4;
            lanternBoost = up * 3;
            hexGlow = 0.9 + up * 1.2;
            spells.ward(k);
            hitAt(0.45);
            break;
          }
          case 'undo': {
            // Undo the Knot: she pulls the knot at her breast; every knot in the shawl lets go its hex at once.
            const tug = arch(k, 0.08, 0.4), reach = win(k, 0.05, 0.5);
            leftFree(ss(k, 0, 0.1));
            armL.shoulder.rotation.set(lerp(0.12, -1.0, reach), 0.6 * reach, lerp(0.5, 0.2, reach));
            armL.elbow.rotation.x = lerp(-0.4, -1.7, reach);
            shawlPivot.position.y = 0.235 - tug * 0.02;
            const burst = arch(k, 0.4, 0.95);
            armR.shoulder.rotation.x = -0.3 - burst * 1.2;
            armR.shoulder.rotation.z = -0.32 - burst * 0.4;
            armL.shoulder.rotation.z += burst * 1.1;
            armL.shoulder.rotation.x -= burst * 0.5;
            torso.rotation.x -= burst * 0.15;
            body.position.y = burst * 0.04;
            hexGlow = 0.9 + tug * 2 + burst * 4;
            lanternBoost = burst * 2;
            spells.undo(k, worldPos(shawlPivot, v1));
            face.show(k > 0.45 ? 'happy' : 'cross');
            hitAt(0.5);
            break;
          }
          case 'cast': {
            armR.shoulder.rotation.x = -0.3 - bell * 1.9;
            armR.elbow.rotation.x = -0.85 + bell * 0.5;
            staffDrop = -bell * 0.3;
            torso.rotation.x -= bell * 0.1;
            lanternBoost = bell * 3.5;
            spells.cast(k, worldPos(staff.lantern, v1));
            hitAt(0.55);
            break;
          }
          case 'cheer': {
            // Two thumps of the staff and a cackle, shoulders going. She'd deny it.
            const thump = Math.max(arch(k, 0.05, 0.35), arch(k, 0.4, 0.7));
            staffDrop = -thump * 0.12;
            armR.shoulder.rotation.x -= thump * 0.3;
            torso.rotation.z = Math.sin(action.t * 28) * 0.03 * win(k, 0.3, 1);
            torso.rotation.x -= 0.1 * win(k, 0.1, 1);
            head.rotation.x -= 0.15 * win(k, 0.1, 1);
            body.position.y = Math.abs(Math.sin(action.t * 28)) * 0.01 * win(k, 0.3, 1);
            face.show('happy');
            if (k > 0.2) toad.croak(1);
            break;
          }
          case 'hurt':
            torso.rotation.x -= bell * 0.35;
            body.position.z = -bell * 0.12;
            hatTip = bell * 0.2;
            face.show('hurt');
            break;
          case 'ko':
          case 'rise': {
            const d = action.name === 'ko' ? ss(k, 0, 0.75) : 1 - ss(k, 0, 1);
            sitDown(d);
            break;
          }
        }
        if (k >= 1) {
          if (!action.hit) action.onHit?.(); // every move calls back by its end, so callers can await any of them
          if (action.name === 'ko') downed = true;
          action = null;
          shawlPivot.position.y = 0.235;
          jar.visible(true);
          jar.inHand(null);
          spells.end();
        }
      } else if (downed) sitDown(1);

      function sitDown(d) {
        // She sits down in the mud with her legs out, and the hat slides down over her eyes. (That's a hero at 0 HP.)
        hips.position.y -= d * 0.3;
        body.position.z = -d * 0.06;
        for (const L of legs) { L.hip.rotation.x = -d * 1.45; L.knee.rotation.x = d * 0.15; L.ankle.rotation.x = d * 0.3; }
        legs[0].hip.rotation.z = -d * 0.12;
        legs[1].hip.rotation.z = d * 0.12;
        torso.rotation.x = lerp(torso.rotation.x, -0.12, d);
        armR.shoulder.rotation.set(lerp(armR.shoulder.rotation.x, -0.6, d), 0, lerp(-0.32, -0.45, d));
        armR.elbow.rotation.x = lerp(armR.elbow.rotation.x, -0.9, d);
        leftFree(d);
        armL.shoulder.rotation.set(lerp(armL.shoulder.rotation.x, -0.3, d), lerp(armL.shoulder.rotation.y, 0, d), lerp(armL.shoulder.rotation.z, 0.35, d));
        armL.elbow.rotation.x = lerp(armL.elbow.rotation.x, -0.5, d);
        staffTilt = { x: lerp(staffTilt.x, 1.1, d), z: lerp(staffTilt.z, -0.5, d) };
        head.rotation.x += d * 0.2;
        hat.position.set(0, 0.14 - d * 0.05, -0.012 + d * 0.05);
        hatTip = d * 0.55;
        if (d > 0.5 && action?.name !== 'rise') face.show('blink');
      }

      // The staff: held at the angle wanted in her body's frame, whatever the arm is doing
      staff.group.position.y = staffDrop;
      holdOrientation(staffPivot, body, q1.setFromEuler(e1.set(staffTilt.x, 0, staffTilt.z)));
      // The lantern hangs straight down from the crook and swings
      const swayX = S.lanternX.update(moving * 0.25 * Math.abs(s) + Math.sin(time * 1.1) * 0.04 - accel * 0.03, dt);
      const swayZ = S.lanternZ.update(-turn * 0.15 + Math.sin(time * 0.8) * 0.03, dt);
      holdOrientation(staff.lanternPivot, root, q1.setFromEuler(e1.set(swayX, 0, swayZ)));
      lanternLight.intensity = (0.07 + Math.sin(time * 13) * 0.007 + Math.sin(time * 7.3) * 0.006) * (1 + lanternBoost);
      staff.glow.material.opacity = 0.55 + lanternBoost * 0.12 + Math.sin(time * 9) * 0.05;
      staff.glow.scale.setScalar(0.34 + lanternBoost * 0.06);
      shawlMat.emissiveIntensity = hexGlow * (0.85 + Math.sin(time * 3) * 0.15);

      // Head: look about, keep level, blink
      if ((nextLook -= dt) < 0) { lookTarget = moving > 0.1 ? 0 : (Math.random() - 0.5) * 1.1; nextLook = 1.8 + Math.random() * 3; }
      look += (lookTarget * (1 - moving) - look) * (1 - Math.exp(-dt * 4));
      head.rotation.y += look - torso.rotation.y * 0.8;
      head.rotation.x += -torso.rotation.x * 0.7 + 0.02;
      if ((blinkT -= dt) < 0) blinkT = 2.4 + Math.random() * 3;
      const busyFace = action && ['attack', 'jars', 'stir', 'tide', 'hex', 'undo', 'cheer', 'hurt'].includes(action.name);
      if (!busyFace && !(fidget?.name === 'peer') && !downed) face.show(blinkT < 0.13 ? 'blink' : mood);

      // Secondary motion: hat, hair, charms, bottles, cloth, the toad
      const hx = S.hatX.update(0.25 * moving + Math.sin(time * 1.2) * 0.03 - accel * 0.02 + hatTip, dt);
      const hz = S.hatZ.update(-turn * 0.08, dt);
      hat.rotation.set(0.06 + hatTip, 0, 0.1);
      // crooked: the crown leans to her right, then slumps back and flops over at the tip
      crown.forEach((cr, i) => cr.j.rotation.set([-0.05, -0.18, -0.35, -0.6][i] + hx * (0.25 + i * 0.2), 0, [-0.12, -0.3, -0.45, -0.7][i] + hz * (1 + i * 0.5)));
      for (const L of locks) {
        L.j.rotation.x = L.spring.update(0.3 * moving + Math.sin(time * 1.5 + L.phase) * 0.03 + Math.abs(s) * 0.05 * moving, dt);
        L.j.rotation.z = L.side.update(-turn * 0.05, dt);
      }
      for (const [i, ch] of [...charms, ...hangers].entries()) {
        ch.pivot.rotation.x = ch.sx.update(0.4 * moving + Math.abs(c) * 0.2 * moving + Math.sin(time * 1.8 + i) * 0.05, dt);
        ch.pivot.rotation.z = ch.sz.update(-turn * 0.08 + s * 0.2 * moving, dt);
      }
      sashTails.rotation.x = charms[0].sx.x * 0.6;
      knotTails.rotation.x = -charms[1].sx.x * 0.3 - torso.rotation.x * 0.5;
      const drag = S.shawl.update(0.07 * moving, dt);
      swayCloth(shawlGeo, { drag, lift: 0.01 * moving, time, ripple: 0.005 + 0.01 * moving });
      swayCloth(robe.geometry, { drag: drag * 0.5, lift: Math.abs(s) * 0.02 * moving, time: time * 1.3, ripple: 0.004 + 0.006 * moving });
      swayCloth(curtain.geometry, { drag: drag * 0.8 + 0.01, lift: 0.004, time: time * 0.9, ripple: 0.006 });
      swayCloth(petticoat.geometry, { drag: drag * 0.4, lift: Math.abs(s) * 0.015 * moving, time: time * 1.2, ripple: 0.003 });
      if ((nextCroak -= dt) < 0) { croak = 1; nextCroak = 4 + Math.random() * 6; }
      croak = Math.max(0, croak - dt * 0.9);
      toad.update(dt, time, croak);
      jar.update(dt, time);
      spells.update(dt);
    },
  };
  return api;
}

// ---------------------------------------------------------------- the staff
// Gnarled bogwood with a crook at the top: twine at the grip, reed leaves tied under the crook, a bead of bog amber
// caught in a twist of the wood, and the tin lantern hung from the crook's end.
function buildStaff(pivot) {
  const group = joint(pivot, [0, 0, 0], 'staff-wood');
  const G = 0.52, L = 1.0; // grip height above the foot; length to the crook (a stick that comes to her shoulder)
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, y = -G + t * L;
    pts.push([Math.sin(t * 9) * 0.012 + Math.sin(t * 23) * 0.004, y, Math.cos(t * 7) * 0.01]);
  }
  const top = L - G;
  pts.push([0.0, top + 0.05, 0.03], [0.0, top + 0.08, 0.085], [0.0, top + 0.05, 0.13], [0.0, top, 0.14]);
  part(group, taperedTube(pts, 0.019, 0.014, 40, 7), toon(C.wood));
  // knots in the wood and twine wraps
  part(group, merge([0, 0.03, 0.06, top - 0.2, top - 0.17].map((y) => new THREE.TorusGeometry(0.021, 0.004, 4, 10).rotateX(Math.PI / 2).translate(Math.sin(((y + G) / L) * 9) * 0.012, y, Math.cos(((y + G) / L) * 7) * 0.01))), toon('#b8a070'), { ink: false });
  part(group, merge([0, 1, 2].map((i) => bladeGeometry(0.2 - i * 0.03, 0.03, { profile: PROFILE.leaf, thick: 0.18, bend: 0.03, droop: (i - 1) * 0.02 }).rotateX(-Math.PI / 2 - 0.25).rotateY(i * 2.1).translate(0, top - 0.16, 0))), toon(C.reed));
  const bead = part(group, sphere(0.024, 10, 8), new THREE.MeshBasicMaterial({ color: C.amber }), { pos: [0.0, top + 0.07, 0.06], ink: false });
  const beadGlow = glowSprite('#ffb44a', 0.16, 0.6);
  bead.add(beadGlow);
  // the lantern
  const lanternPivot = joint(group, [0, top, 0.14], 'lantern-pivot');
  const lantern = joint(lanternPivot, [0, -0.11, 0], 'lantern');
  part(lanternPivot, cyl(0.0025, 0.0025, 0.09, 3), toon(C.tin), { pos: [0, -0.045, 0], ink: false });
  part(lantern, new THREE.TorusGeometry(0.014, 0.003, 4, 10), toon(C.tin), { pos: [0, 0.055, 0], ink: false });
  part(lantern, cone(0.046, 0.04, 8), toon(C.tin), { pos: [0, 0.035, 0] });
  const glass = part(lantern, cyl(0.034, 0.034, 0.06, 8), new THREE.MeshBasicMaterial({ color: '#ffd889', transparent: true, opacity: 0.92 }), { pos: [0, -0.01, 0], ink: false });
  part(lantern, merge([0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.004, 0.004, 0.065, 4).translate(Math.cos((i * Math.PI) / 2) * 0.036, -0.01, Math.sin((i * Math.PI) / 2) * 0.036))), toon(C.tin));
  part(lantern, cyl(0.042, 0.038, 0.014, 8), toon(C.tin), { pos: [0, -0.045, 0], ink: false });
  const flame = part(lantern, sphere(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff6d8' }), { pos: [0, -0.01, 0], scale: [1, 1.5, 1], ink: false });
  const glow = glowSprite('#ffc060', 0.34, 0.55);
  glow.position.y = -0.01;
  lantern.add(glow);
  const light = new THREE.PointLight('#ffc46a', 0.07, 1.0, 2);
  light.position.y = -0.01;
  lantern.add(light);
  group.userData.flame = flame;
  return { group, lanternPivot, lantern, light, glow, glass, bead };
}

// ---------------------------------------------------------------- the jar that bites
function buildJar(pivot) {
  const holder = joint(pivot, [0, 0, 0]);
  const jar = joint(holder, [0, 0, 0]);
  part(jar, lathe([[0.001, -0.06], [0.034, -0.058], [0.04, -0.03], [0.038, 0.0], [0.03, 0.012], [0.03, 0.02]], 12), toon('#6a8a5a', { transparent: true, opacity: 0.85, emissive: '#1a2a18' }));
  const eyes = [-1, 1].map((s) => part(jar, sphere(0.006, 6, 5), new THREE.MeshBasicMaterial({ color: '#f0e050' }), { pos: [s * 0.012, -0.018, 0.028], ink: false }));
  part(jar, merge(Array.from({ length: 7 }, (_, i) => new THREE.ConeGeometry(0.0055, 0.014, 4).translate(Math.cos((i / 7) * Math.PI * 2) * 0.024, 0.026, Math.sin((i / 7) * Math.PI * 2) * 0.024))), toon('#f2ecd8'), { ink: false });
  const hinge = joint(jar, [0, 0.022, -0.03]);
  part(hinge, cyl(0.035, 0.036, 0.014, 12), toon(C.wood), { pos: [0, 0.006, 0.03] });
  part(jar, new THREE.TorusGeometry(0.032, 0.003, 4, 12), toon('#b8a070'), { pos: [0, 0.012, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  let open = 0, held = null, t = 0;
  return {
    jar,
    rattle(a) { open = a; },
    visible(v) { jar.visible = v; },
    inHand(wrist) {
      if (wrist && held !== wrist) { held = wrist; wrist.add(jar); jar.position.set(0, -0.06, 0.02); }
      if (!wrist && held) { held = null; holder.add(jar); jar.position.set(0, 0, 0); }
    },
    update(dt, time) {
      t = time;
      hinge.rotation.x = -open * 0.9;
      jar.rotation.z = open * Math.sin(time * 50) * 0.08;
      for (const e of eyes) e.scale.y = open > 0.2 ? 1 : Math.sin(time * 0.7) > 0.97 ? 0.1 : 1;
    },
  };
}

// ---------------------------------------------------------------- the toad on her hat
function buildToad(hat) {
  const toad = joint(hat, [0.2, -0.004, 0.2], 'toad');
  toad.rotation.set(0.12, 0.5, -0.08);
  const skin = toon(C.toad);
  part(toad, sphere(0.034, 12, 9), skin, { scale: [1, 0.66, 1.15] });
  part(toad, sphere(0.024, 10, 8), skin, { pos: [0, 0.008, 0.028], scale: [1.2, 0.72, 1] });
  const throat = part(toad, sphere(0.016, 8, 6), toon(C.toadBelly), { pos: [0, -0.008, 0.042], scale: [1.1, 0.8, 0.9], ink: false });
  const eyes = [-1, 1].map((s) => {
    const e = joint(toad, [s * 0.015, 0.022, 0.035]);
    part(e, sphere(0.0085, 8, 6), toon('#d8b040', { emissive: '#3a2a00' }), { ink: false });
    const lid = part(e, sphere(0.009, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(C.toadDark), { rot: [-0.6, 0, 0], ink: false });
    part(e, new THREE.BoxGeometry(0.009, 0.0025, 0.002), new THREE.MeshBasicMaterial({ color: '#141008' }), { pos: [0, 0.0, 0.008], ink: false });
    return lid;
  });
  part(toad, merge([-1, 1].flatMap((s) => [
    taperedTube([[s * 0.026, -0.006, 0.02], [s * 0.034, -0.016, 0.034], [s * 0.03, -0.022, 0.045]], 0.007, 0.004, 6, 5),
    taperedTube([[s * 0.024, -0.004, -0.02], [s * 0.042, -0.014, -0.005], [s * 0.036, -0.022, 0.018]], 0.011, 0.005, 6, 5),
  ])), skin);
  let blink = 3;
  return {
    croak() { throat.userData.croak = 1; },
    update(dt, time, croak) {
      const c = Math.max(croak, throat.userData.croak ?? 0);
      throat.userData.croak = Math.max(0, (throat.userData.croak ?? 0) - dt);
      const puff = c > 0 ? Math.max(0, Math.sin(time * 18)) * c : 0;
      throat.scale.set(1.1 + puff * 0.9, 0.8 + puff * 0.8, 0.9 + puff * 0.6);
      toad.scale.y = 1 + Math.sin(time * 2.2) * 0.03;
      if ((blink -= dt) < 0) blink = 2.5 + Math.random() * 4;
      for (const l of eyes) l.rotation.x = blink < 0.15 ? 0.6 : -0.6;
    },
  };
}

// A wide felt brim that flops: lower at the back and her right, a wave in it, and a dent where it's been sat on.
function floppyBrim(inner, outer, segments = 40) {
  const pts = [], idx = [], uvs = [];
  const rings = 4;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const radius = inner + (outer - inner) * t * (1 + Math.sin(a * 3 + 1) * 0.05);
      const back = Math.max(0, -Math.sin(a)); // z < 0
      const right = Math.max(0, -Math.cos(a)); // x < 0
      const droop = -t * t * (0.05 + back * 0.05 + right * 0.035) + Math.sin(a * 5) * 0.012 * t * t + Math.max(0, Math.sin(a)) * t * t * 0.02;
      pts.push(Math.cos(a) * radius, droop, Math.sin(a) * radius);
      uvs.push((Math.cos(a) * radius) / outer * 0.5 + 0.5, (Math.sin(a) * radius) / outer * 0.5 + 0.5);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < segments; i++) {
      const a = r * (segments + 1) + i, b = a + 1, c = a + segments + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- her spells, in the world
function buildSpells(fx) {
  const v = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3();
  const origin = new THREE.Vector3(), quat = new THREE.Quaternion();
  const motes = new Particles(fx, 28, () => sparkSprite('#b8f070'));
  const twinkles = new Particles(fx, 14, () => sparkSprite('#fff4c0', twinkleTexture()));
  const drops = new Particles(fx, 26, () => new THREE.Mesh(sphere(0.02, 6, 5), new THREE.MeshBasicMaterial({ color: '#7ad0b0', transparent: true })));
  const at = (x, y, z) => v.set(x, y, z).applyQuaternion(quat).add(origin);

  // Tide: a curling wave of fen water, and rings where the staff struck
  const waterMat = new THREE.MeshToonMaterial({ map: waterTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#123a30'), emissiveIntensity: 0.8 });
  const waveGeo = new THREE.PlaneGeometry(1.2, 0.72, 18, 8);
  waveGeo.translate(0, 0.36, 0);
  const waveRest = Float32Array.from(waveGeo.attributes.position.array);
  const wave = new THREE.Mesh(waveGeo, waterMat);
  wave.visible = false;
  wave.frustumCulled = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#8fe0c0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ripples = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), ringMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; fx.add(m); return m; });
  fx.add(wave);

  // Hex: a knot of light
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.07, 0.012, 64, 6, 2, 3), new THREE.MeshBasicMaterial({ color: '#c8f26a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const knotGlow = glowSprite('#b0e050', 0.5, 0);
  knot.add(knotGlow);
  knot.visible = false;
  fx.add(knot);

  // Ward: six stones hung with charms
  const wardGroup = new THREE.Group();
  const stoneMat = toon('#7d8a7a');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.26, 5), stoneMat);
    s.position.set(Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62);
    s.rotation.set(0.1 * Math.sin(i), i, 0.1 * Math.cos(i * 2));
    const charm = new THREE.Mesh(badge(starShape(0.03, 5, 0.5), 0.006), new THREE.MeshBasicMaterial({ color: '#e8dfc4' }));
    charm.position.set(0, 0.06, 0.07);
    s.add(charm);
    wardGroup.add(s);
  }
  const wardRing = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.66, 48), new THREE.MeshBasicMaterial({ color: '#c8f26a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  wardRing.rotation.x = -Math.PI / 2;
  wardRing.position.y = 0.02;
  wardGroup.add(wardRing);
  const wardGlow = glowSprite('#c8f26a', 1.6, 0);
  wardGlow.position.y = 0.4;
  wardGroup.add(wardGlow);
  wardGroup.visible = false;
  fx.add(wardGroup);

  // Stir the Pot: a little three-legged cauldron
  const pot = new THREE.Group();
  const potMat = toon('#2e2a2e');
  part(pot, lathe([[0.001, 0.0], [0.08, 0.01], [0.12, 0.06], [0.115, 0.12], [0.1, 0.15], [0.108, 0.16]], 14), potMat);
  part(pot, merge([0, 1, 2].map((i) => new THREE.CylinderGeometry(0.012, 0.008, 0.05, 5).translate(Math.cos((i / 3) * Math.PI * 2) * 0.07, -0.01, Math.sin((i / 3) * Math.PI * 2) * 0.07))), potMat);
  const brew = part(pot, new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: '#8ee860' }), { pos: [0, 0.14, 0], rot: [-Math.PI / 2, 0, 0], ink: false });
  const potGlow = glowSprite('#9dff80', 0.6, 0);
  potGlow.position.y = 0.2;
  pot.add(potGlow);
  pot.visible = false;
  fx.add(pot);

  // The thrown jar (a copy of the one on her belt)
  const flyer = new THREE.Group();
  flyer.scale.setScalar(1.8); // it reads at a distance
  part(flyer, lathe([[0.001, -0.06], [0.034, -0.058], [0.04, -0.03], [0.038, 0.0], [0.03, 0.012], [0.03, 0.02]], 12), toon('#7aa46a', { emissive: '#1e3a1a' }));
  const flyGlow = glowSprite('#9ad870', 0.22, 0.5);
  flyer.add(flyGlow);
  for (const x of [-0.012, 0.012]) part(flyer, sphere(0.006, 6, 5), new THREE.MeshBasicMaterial({ color: '#f0e050' }), { pos: [x, -0.018, 0.03], ink: false });
  const flyLid = joint(flyer, [0, 0.022, -0.03]);
  part(flyLid, cyl(0.035, 0.036, 0.014, 12), toon(C.wood), { pos: [0, 0.006, 0.03] });
  part(flyer, merge(Array.from({ length: 7 }, (_, i) => new THREE.ConeGeometry(0.0055, 0.014, 4).translate(Math.cos((i / 7) * Math.PI * 2) * 0.024, 0.026, Math.sin((i / 7) * Math.PI * 2) * 0.024))), toon('#f2ecd8'), { ink: false });
  flyer.visible = false;
  fx.add(flyer);
  onLayer(fx);

  let current = null, reach = 1.5, throwFrom = new THREE.Vector3(), throwT = -1, target = new THREE.Vector3();
  const burst = (pos, n, color, speed = 0.8, up = 0.6) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = speed * (0.3 + Math.random() * 0.7);
      motes.spawn(pos, { vel: [Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r], life: 0.6 + Math.random() * 0.5, size: 0.08 + Math.random() * 0.08, drag: 2.5, color });
    }
  };
  const splash = (pos, n) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.9;
      drops.spawn(pos, { vel: [Math.cos(a) * r, 1.2 + Math.random() * 1.4, Math.sin(a) * r], life: 0.8, size: 0.6 + Math.random() * 0.8, gravity: 5, opacity: 0.9 });
    }
  };
  return {
    begin(name, root, r) {
      current = name;
      reach = r || 1.5;
      root.getWorldPosition(origin);
      root.getWorldQuaternion(quat);
      fwd.set(0, 0, 1).applyQuaternion(quat);
      side.set(1, 0, 0).applyQuaternion(quat);
      if (name === 'stir') { pot.position.copy(at(0.05, 0, 0.36)); pot.quaternion.copy(quat); }
      if (name === 'ward') { wardGroup.position.copy(origin); }
      if (name === 'tide') { wave.position.copy(at(0, 0, 0.4)); wave.quaternion.copy(quat); }
      target.copy(at(0, 0.25, reach));
    },
    throwJar(from) { throwFrom.copy(from); throwT = 0; flyer.visible = true; },
    stir(k, round) {
      const up = ss(k, 0.02, 0.14) * (1 - ss(k, 0.88, 1));
      pot.visible = up > 0.01;
      pot.scale.setScalar(Math.max(0.01, up));
      brew.material.color.setHSL(0.27, 0.7, 0.55 + Math.sin(round * 2) * 0.08);
      potGlow.material.opacity = up * (0.5 + arch(k, 0.5, 0.8) * 0.6);
      if (Math.random() < 0.5 && k > 0.15 && k < 0.85) {
        const p = v.copy(pot.position).add(side.clone().multiplyScalar((Math.random() - 0.5) * 0.14));
        p.y += 0.15;
        motes.spawn(p, { vel: [(Math.random() - 0.5) * 0.1, 0.35 + Math.random() * 0.3, (Math.random() - 0.5) * 0.1], life: 1.1, size: 0.1 + Math.random() * 0.08, grow: 1.5, drag: 0.5, color: k > 0.55 && k < 0.75 ? '#e8ffb0' : '#9dff80', opacity: 0.8 });
      }
      if (k > 0.6 && k < 0.62) burst(v.copy(pot.position).setY(pot.position.y + 0.3), 3, '#e8ffb0', 0.4, 1.2);
    },
    tide(k) {
      const rise = ss(k, 0.36, 0.5), fall = ss(k, 0.72, 0.92);
      wave.visible = k > 0.35 && k < 0.95;
      const d = 0.35 + ss(k, 0.36, 0.78) * (reach - 0.35);
      wave.position.copy(origin).addScaledVector(fwd, d);
      const pos = waveGeo.attributes.position;
      // a standing wall of water that leans forward at the crest, its ends trailing behind, then crashes
      const curl = 0.05 + ss(k, 0.5, 0.74) * 0.16;
      for (let i = 0; i < pos.count; i++) {
        const x = waveRest[i * 3], y = waveRest[i * 3 + 1];
        const h = y / 0.72;
        const edge = Math.abs(x) / 0.6;
        const height = rise * (1 - fall * 0.85) * (1 - edge * edge * 0.55) * (0.9 + 0.1 * Math.sin(x * 7 + k * 12));
        pos.setXYZ(i, x, y * height, (curl * h * h * h - 0.04 * h) * height - edge * edge * 0.3 + Math.sin(x * 9 + k * 20) * 0.015);
      }
      pos.needsUpdate = true;
      waveGeo.computeVertexNormals();
      waterMat.opacity = 1 - ss(k, 0.8, 0.95);
      ripples.forEach((m, i) => {
        const kk = k - 0.33 - i * 0.08;
        m.visible = kk > 0 && kk < 0.5;
        m.position.copy(at(0, 0.02, 0.3));
        m.scale.setScalar(0.15 + ss(kk, 0, 0.5) * 0.9);
        m.material.opacity = 0.8 * (1 - ss(kk, 0.1, 0.5));
      });
      if (k > 0.34 && k < 0.36) splash(at(0, 0.05, 0.32), 10);
      if (k > 0.5 && k < 0.78 && Math.random() < 0.6) {
        const p = v.copy(wave.position).addScaledVector(side, (Math.random() - 0.5) * 1.1);
        p.y += 0.45 * rise * (1 - fall);
        drops.spawn(p, { vel: [fwd.x * 0.8, 0.8 + Math.random(), fwd.z * 0.8], life: 0.6, size: 0.5 + Math.random() * 0.5, gravity: 5, opacity: 0.9 });
      }
      if (k > 0.72 && k < 0.745) splash(v.copy(wave.position).setY(origin.y + 0.1), 14);
    },
    hex(k, fingertip) {
      const form = ss(k, 0.15, 0.4), fly = ss(k, 0.42, 0.7), cinch = arch(k, 0.68, 0.95);
      knot.visible = k > 0.15 && k < 0.95;
      knot.position.copy(fingertip).lerp(target, fly);
      knot.position.y += Math.sin(fly * Math.PI) * 0.2;
      knot.rotation.set(k * 9, k * 13, 0);
      knot.scale.setScalar(Math.max(0.01, form * (1 + cinch * 1.4) * (1 - ss(k, 0.85, 0.95))));
      knot.material.opacity = 0.9;
      knotGlow.material.opacity = 0.5 + cinch;
      if (k > 0.7 && k < 0.72) burst(target, 10, '#c8f26a', 0.9, 0.6);
    },
    ward(k) {
      const up = ss(k, 0.1, 0.4) * (1 - ss(k, 0.82, 1));
      wardGroup.visible = up > 0.01;
      wardGroup.children.forEach((s, i) => {
        if (s.isMesh && s.geometry.type === 'CylinderGeometry') s.position.y = -0.14 + up * 0.27 + Math.sin(k * 30 + i) * 0.004 * up;
      });
      wardRing.material.opacity = up * (0.5 + Math.sin(k * 40) * 0.2);
      wardGlow.material.opacity = up * 0.35;
      if (Math.random() < 0.4 * up) {
        const a = Math.random() * Math.PI * 2;
        motes.spawn(v.set(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62).add(wardGroup.position), { vel: [0, 0.5, 0], life: 0.9, size: 0.07, drag: 0.5, color: '#c8f26a' });
      }
    },
    undo(k, at2) {
      if (k > 0.1 && k < 0.5 && Math.random() < 0.5) motes.spawn(at2, { vel: [(Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3], life: 0.5, size: 0.06, color: '#c8f26a' });
      if (k > 0.48 && k < 0.5) {
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          motes.spawn(at2, { vel: [Math.cos(a) * 1.1, 0.6 + (i % 3) * 0.3, Math.sin(a) * 1.1], life: 1.1, size: 0.1, drag: 1.5, color: i % 2 ? '#c8f26a' : '#fff0b0' });
        }
        for (let i = 0; i < 8; i++) twinkles.spawn(at2, { vel: [(Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8], life: 1, size: 0.1, drag: 2 });
      }
    },
    cast(k, lamp) {
      if (k > 0.3 && k < 0.8 && Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        motes.spawn(lamp, { vel: [Math.cos(a) * 0.4, 0.3 + Math.random() * 0.4, Math.sin(a) * 0.4], life: 0.8, size: 0.07, drag: 1.5, color: '#ffc870' });
      }
    },
    end() {
      current = null;
      wave.visible = false;
      knot.visible = false;
      wardGroup.visible = false;
      pot.visible = false;
      for (const m of ripples) m.visible = false;
    },
    update(dt) {
      if (throwT >= 0) {
        throwT += dt / 0.45;
        const t = Math.min(1, throwT);
        flyer.position.copy(throwFrom).lerp(target, t);
        flyer.position.y += Math.sin(t * Math.PI) * 0.45;
        flyer.rotation.set(t * 8, 0, t * 3);
        flyLid.rotation.x = -Math.abs(Math.sin(t * 25)) * 0.9; // chomp chomp
        if (Math.random() < 0.5) drops.spawn(flyer.position, { vel: [0, -0.2, 0], life: 0.4, size: 0.4, gravity: 3, opacity: 0.8 });
        if (t >= 1) { throwT = -1; flyer.visible = false; splash(target, 12); burst(target, 6, '#f2ecd8', 0.6, 0.8); }
      }
      motes.update(dt);
      twinkles.update(dt);
      drops.update(dt);
    },
  };
}
