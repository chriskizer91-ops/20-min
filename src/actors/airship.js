import * as THREE from 'three';
import atlasUrl from '../../art/airship/skiff-atlas.webp';
import ATLAS from './skiff-atlas.json';
import { toon, part, joint, cyl, sphere, taperedTube, glowSprite, onLayer, Spring } from './kit.js';

// The Magpie: Quill's sunstone skiff, from Thareia's turnaround sheet (art/airship/skiff-sheet.webp, from the
// New-game repo's thareia/art-in/airship/ship-2-refitted-skiff.webp), wearing the sheet's own paint.
//
// The hull is built to the sheet's silhouettes: its length, rim and keel lines from the side view, its width from
// the top view. So the painted side can be projected straight onto the hull's triangles, and the painted top view
// onto the deck (tools/bake-skiff.py cuts the pieces into one atlas). The crystals and the brazier take the
// painting the same way; the sails, fins, rudder and lanterns are cut-out cards. Five sunstones stand in a row
// across the ship, with violet witchfire hearts (docs/LORE.md, "The skiff").
//
// Local space: the rim amidships at y = 0, bow toward +z, 1 unit = 1 m.

const STERN = -2.4, BOW = 2.7, LENGTH = BOW - STERN;
const S = ATLAS.side, T = ATLAS.top, [AW, AH] = ATLAS.size;
const SIDE_PPM = (S.bowX - S.sternX) / LENGTH; // sheet pixels per meter in the side view
const TOP_PPM = (T.stern - T.bow) / LENGTH; // and in the top view
const BRASS = '#c9a24d', WOOD_DARK = '#4e2d19', COPPER = '#b8683a';
const DECK_Y = -0.06;

const lerpTable = (table, x) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) { const [x0, y0] = table[i - 1]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return table[table.length - 1][1];
};
const sideX = (z) => S.sternX + (z - STERN) * SIDE_PPM;
const rimY = (z) => (S.midRim - lerpTable(S.rim, sideX(z))) / SIDE_PPM;
const keelY = (z) => (S.midRim - lerpTable(S.keel, sideX(z))) / SIDE_PPM;
const topY = (z) => T.stern - (z - STERN) * TOP_PPM;
const halfWidth = (z) => lerpTable(T.half, topY(z)) / TOP_PPM;

// A hull section: th = 0 at the rim, pi/2 at the keel. Near-vertical at the rim, round underneath.
const section = (z, th) => {
  const top = rimY(z), d = top - keelY(z);
  return [halfWidth(z) * Math.cos(th), top - d * Math.pow(Math.sin(th), 0.75)];
};

// Sheet pixels to atlas UVs, through one piece of the atlas
function uvOf(piece, sx, sy) {
  const p = ATLAS.pieces[piece];
  const ax = p.mirror ? p.at[0] + (p.src[2] - sx) : p.at[0] + (sx - p.src[0]);
  const ay = p.at[1] + (sy - p.src[1]);
  return [ax / AW, 1 - ay / AH];
}
// The whole of a piece's rectangle, for a card: [u0, v0, u1, v1], left to right and bottom to top as painted
function rectOf(piece) {
  const p = ATLAS.pieces[piece];
  const [u0, v1] = uvOf(piece, p.src[0], p.src[1]);
  const [u1, v0] = uvOf(piece, p.src[2], p.src[3]);
  return [u0, v0, u1, v1];
}

let atlasTexture = null;
function atlas() {
  if (!atlasTexture) {
    atlasTexture = new THREE.TextureLoader().load(atlasUrl);
    atlasTexture.colorSpace = THREE.SRGBColorSpace;
    atlasTexture.anisotropy = 4;
  }
  return atlasTexture;
}
// Painted surfaces: toon-lit, with a little of the paint showing through in the dark
const painted = (opts = {}) => new THREE.MeshToonMaterial({ map: atlas(), emissive: 0xffffff, emissiveMap: atlas(), emissiveIntensity: 0.12, ...opts });
const cardMat = (opts = {}) => painted({ alphaTest: 0.5, side: THREE.DoubleSide, ...opts });

// lit: false leaves her cold, as she sits at the jetty before the witch lights the brazier (docs/SLICE.md, screen 4):
// the crystals and the lanterns dark, no glows, no lights, and no motes.
export function createAirship({ lit = true } = {}) {
  const root = new THREE.Group();
  root.name = 'the-magpie';
  const ship = joint(root, [0, 0, 0], 'ship'); // banks and bobs

  // ---------------------------------------------------------------- hull: two halves, each wearing the side view
  // Seen from -x the bow is on the right, as painted; from +x it's on the left, so that half uses the mirrored copy.
  const ROWS = 44, COLS = 12;
  const zAt = (r) => STERN + LENGTH * (1 - Math.pow(1 - r / ROWS, 1.25)); // closer rows toward the bow, where it curves
  for (const side of [-1, 1]) {
    const pos = [], uv = [], idx = [];
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) {
      const z = zAt(r), th = (c / COLS) * Math.PI / 2;
      const [x, y] = section(z, th);
      pos.push(side * x, y, z);
      uv.push(...uvOf(side < 0 ? 'side' : 'sideMirror', sideX(z), S.midRim - y * SIDE_PPM));
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
      if (side < 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    part(ship, geo, painted({ side: THREE.DoubleSide }));
  }
  // The transom: the flat stern, dark wood
  const transom = new THREE.Shape();
  for (let c = 0; c <= COLS * 2; c++) {
    const th = (c / (COLS * 2)) * Math.PI;
    const [x, y] = section(STERN, th < Math.PI / 2 ? th : Math.PI - th);
    const sx = th < Math.PI / 2 ? -x : x;
    c ? transom.lineTo(sx, y) : transom.moveTo(sx, y);
  }
  part(ship, new THREE.ShapeGeometry(transom), toon(WOOD_DARK, { side: THREE.DoubleSide }), { pos: [0, 0, STERN + 0.004], ink: false });

  // ---------------------------------------------------------------- deck: the top view, projected from above
  // The deck sits a little under the rim; its edge is where the hull's side crosses that height.
  const deckHalf = (z) => {
    const top = rimY(z), d = top - keelY(z);
    if (top <= DECK_Y) return halfWidth(z);
    const s = Math.min(1, Math.pow((top - DECK_Y) / d, 1 / 0.75));
    return halfWidth(z) * Math.cos(Math.asin(s)) * 0.99;
  };
  const deckShape = new THREE.Shape();
  const N = 40;
  const zs = Array.from({ length: N + 1 }, (_, i) => STERN + 0.01 + (LENGTH - 0.25) * (i / N));
  zs.forEach((z, i) => (i ? deckShape.lineTo(-deckHalf(z), z) : deckShape.moveTo(-deckHalf(z), z)));
  for (const z of [...zs].reverse()) deckShape.lineTo(deckHalf(z), z);
  const deckGeo = new THREE.ShapeGeometry(deckShape, 1);
  deckGeo.rotateX(Math.PI / 2); // shape (x, y) -> (x, 0, y): its y becomes z
  const dp = deckGeo.attributes.position, duv = deckGeo.attributes.uv;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), z = dp.getZ(i);
    dp.setY(i, DECK_Y);
    // In the top view the bow is up and the ship's +x side is on the left
    duv.setXY(i, ...uvOf('deck', T.cx - x * TOP_PPM, topY(z)));
  }
  deckGeo.computeVertexNormals();
  part(ship, deckGeo, painted({ side: THREE.DoubleSide }), { ink: false });

  // Brass rails along the rim, on posts
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const z = STERN + 0.1 + (LENGTH - 0.75) * (i / 16); pts.push([side * halfWidth(z) * 0.96, rimY(z) + 0.17, z]); }
    part(ship, taperedTube(pts, 0.026, 0.02, 32, 6), toon(BRASS));
    for (let i = 0; i <= 10; i++) {
      const z = STERN + 0.12 + (LENGTH - 0.8) * (i / 10);
      part(ship, cyl(0.016, 0.018, 0.18, 5), toon(BRASS), { pos: [side * halfWidth(z) * 0.96, rimY(z) + 0.08, z], ink: false });
    }
  }

  // ---------------------------------------------------------------- the brazier and the sunstones
  const array = joint(ship, [0, 0, 0.05], 'sunstones'); // the crystal row, a little forward of amidships (top view)
  // The brazier: a copper stove with a lit grate, wearing the painted one (projected from the side)
  const stove = [[0.001, DECK_Y], [0.3, DECK_Y], [0.33, 0.0], [0.33, 0.33], [0.31, 0.42], [0.26, 0.55], [0.17, 0.66], [0.12, 0.73], [0.11, 0.76], [0.11, 1.08], [0.001, 1.08]];
  const stoveGeo = new THREE.LatheGeometry(stove.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  planarUV(stoveGeo, 'furnace', (x, y) => [1133 + x * SIDE_PPM, 340 - (y - DECK_Y) * SIDE_PPM]);
  part(array, stoveGeo, painted({ emissiveIntensity: lit ? 0.3 : 0.06 }));
  const grate = new THREE.PointLight('#ff9a3a', 2, 3, 2);
  grate.position.set(0, 0.2, 0.4);
  if (lit) array.add(grate);
  // The copper flue beside it
  part(array, taperedTube([[-0.45, DECK_Y, -0.35], [-0.45, 0.85, -0.35], [-0.42, 1.0, -0.2], [-0.2, 1.02, -0.08]], 0.06, 0.06, 12, 8), toon(COPPER));

  // Five crystals, the middle one biggest, each in a brass cup on a curved arm. The sheet's top and front views put
  // them in a row across the ship and its side view in a row along it; seen from the side (as she mostly is on the
  // map) a row across stacks into one column, so they stand in a diamond, which shows both.
  const unit = [[0.001, -0.05], [0.6, 0], [0.8, 0.06], [0.96, 0.2], [1, 0.42], [1, 0.57], [0.72, 0.71], [0.36, 0.86], [0.001, 1]];
  const crystalGeo = new THREE.LatheGeometry(unit.map(([r, y]) => new THREE.Vector2(r, y)), 6).toNonIndexed();
  crystalGeo.computeVertexNormals(); // faceted: each facet catches the light on its own
  planarUV(crystalGeo, 'crystal', (x, y) => [1122 + x * 50, 158 - y * 138]);
  const crystalMat = painted(lit ? { emissiveIntensity: 0.75 } : { emissiveIntensity: 0.05, color: 0x645e78 }); // cold: dull and dark
  const cupGeo = new THREE.LatheGeometry([[0.05, -0.1], [0.12, -0.04], [0.2, 0.02], [0.26, 0.1], [0.28, 0.16]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const crystals = [];
  const ROW = [[0, -0.8, 1.3, 0.72], [-0.78, 0, 1.2, 0.66], [0, 0, 1.55, 1.25], [0.78, 0, 1.2, 0.66], [0, 0.8, 1.3, 0.72]];
  for (const [x, z, h, s] of ROW) {
    const w = 0.36 * s; // half-width: the painted crystal is about 0.72 as wide as it is tall
    if (x || z) part(array, taperedTube([[0, 1.02, 0], [x * 0.35, 1.0 + (h - 1) * 0.2, z * 0.35], [x * 0.85, h - 0.35 * s, z * 0.85], [x, h - 0.18 * s, z]], 0.035, 0.028, 14, 6), toon(BRASS), { ink: false });
    const cup = part(array, cupGeo, toon(BRASS, { side: THREE.DoubleSide }), { pos: [x, h - 0.12 * s, z], ink: false });
    cup.scale.set(w * 3.2, s, w * 3.2);
    const c = new THREE.Mesh(crystalGeo, crystalMat);
    c.position.set(x, h, z);
    c.scale.set(w, s, w);
    c.rotation.y = Math.PI / 6;
    array.add(c);
    const glow = glowSprite('#ffc45a', 1.3 * s, 0.5);
    glow.position.set(x, h + 0.45 * s, z);
    // Lit with witchfire, each has a violet heart
    const heart = glowSprite('#b25cff', 0.5 * s, 0.9);
    heart.position.set(x, h + 0.4 * s, z);
    if (lit) array.add(glow, heart);
    crystals.push({ c, glow, heart, s, phase: Math.random() * 6, top: [x, h + 0.5 * s, z] });
  }
  const sunLight = new THREE.PointLight('#ffb44a', 6, 10, 2);
  sunLight.position.set(0, 1.9, 0);
  if (lit) array.add(sunLight);

  // ---------------------------------------------------------------- sail-wings
  // As in the sheet's top view, each sail hangs off a spar along the ship's side and reaches out to a tip. The tips
  // are raised, like a bird's wings in a V, so the sails face the camera whether she's seen from the side or above.
  const sailMat = cardMat();
  const sails = [-1, 1].map((side) => {
    const A = new THREE.Vector3(side * 1.3, 1.05, 1.05); // the spar's forward end
    const B = new THREE.Vector3(side * 1.3, 0.45, -0.85); // the spar's aft end
    const C = new THREE.Vector3(side * 2.6, 1.2, -0.3); // the tip
    // The painted sail's corners in the top view
    const uvA = uvOf('sail', 265, 150), uvB = uvOf('sail', 270, 293), uvC = uvOf('sail', 146, 247);
    // A touch larger than the painted sail, so its own edge (cut out by the alpha) is the edge you see
    const grow = 1.05, mid = A.clone().add(B).add(C).divideScalar(3);
    const [gA, gB, gC] = [A, B, C].map((p) => p.clone().sub(mid).multiplyScalar(grow).add(mid));
    const uvMid = [0, 1].map((k) => (uvA[k] + uvB[k] + uvC[k]) / 3);
    const [tA, tB, tC] = [uvA, uvB, uvC].map((u) => [0, 1].map((k) => uvMid[k] + (u[k] - uvMid[k]) * grow));
    const n = 10, verts = [], uvs = [], ind = [], bary = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const b = i / n, c = j / n, a = 1 - b - c;
      verts.push(gA.x * a + gB.x * b + gC.x * c, gA.y * a + gB.y * b + gC.y * c, gA.z * a + gB.z * b + gC.z * c);
      uvs.push(tA[0] * a + tB[0] * b + tC[0] * c, tA[1] * a + tB[1] * b + tC[1] * c);
      bary.push(a * b * c * 27);
    }
    const id = (i, j) => { let k = 0; for (let q = 0; q < i; q++) k += n - q + 1; return k + j; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
      ind.push(id(i, j), id(i + 1, j), id(i, j + 1));
      if (j < n - i - 1) ind.push(id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(ind);
    geo.computeVertexNormals();
    // Which way the sail bellies: outward and a little back, away from the wind of her flight
    const belly = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
    if (belly.y > 0) belly.negate(); // it fills downward, like a wing
    geo.userData = { rest: Float32Array.from(verts), bary, belly };
    part(ship, geo, sailMat, { ink: false });
    // The spar, with brass knobs, on brackets from the rim; the boom along the sail's foot; a line to the tip
    const foot = B.clone().add(new THREE.Vector3(0, -0.04, -0.2)), head = A.clone().add(new THREE.Vector3(0, 0.05, 0.2));
    part(ship, taperedTube([foot.toArray(), head.toArray()], 0.045, 0.035, 4, 6), toon(WOOD_DARK));
    for (const p of [foot, head]) part(ship, sphere(0.06, 8, 6), toon(BRASS), { pos: p.toArray(), ink: false });
    for (const z of [-0.6, 0.1, 0.8]) {
      const k = (z - B.z) / (A.z - B.z), y = B.y + (A.y - B.y) * k;
      part(ship, taperedTube([[side * halfWidth(z) * 0.95, rimY(z) + 0.05, z], [side * 1.3, y, z]], 0.028, 0.028, 4, 5), toon(BRASS), { ink: false });
    }
    part(ship, taperedTube([B.toArray(), C.toArray()], 0.03, 0.022, 4, 5), toon(WOOD_DARK), { ink: false });
    part(ship, sphere(0.045, 6, 5), toon(BRASS), { pos: C.toArray(), ink: false });
    part(ship, taperedTube([C.toArray(), head.toArray()], 0.008, 0.008, 4, 3), new THREE.MeshBasicMaterial({ color: '#3a2a1c' }), { ink: false });
    return { geo };
  });

  // ---------------------------------------------------------------- fins, rudder, lanterns: painted cards
  const finSrc = ATLAS.pieces.fin.src;
  const finW = (finSrc[2] - finSrc[0]) / TOP_PPM, finD = (finSrc[3] - finSrc[1]) / TOP_PPM;
  const finZ = STERN + (T.stern - (finSrc[1] + finSrc[3]) / 2) / TOP_PPM; // where the painted fins sit
  const fins = [-1, 1].map((side) => {
    const geo = new THREE.PlaneGeometry(finW, finD);
    geo.rotateX(Math.PI / 2); // the texture's up -> +z, the bow, as in the top view
    setRectUV(geo, ...rectOf('fin'));
    const pivot = joint(ship, [side * (halfWidth(finZ) - 0.08), -0.32, finZ]);
    const fin = new THREE.Mesh(geo, cardMat());
    // The painted fin is the ship's +x one (on the left in the top view), its tip at the texture's left
    fin.scale.x = -side;
    fin.position.x = side * finW / 2;
    pivot.add(fin);
    pivot.rotation.z = -side * 0.3; // angled down and out
    return pivot;
  });

  const rudder = joint(ship, [0, 0, STERN - 0.02], 'rudder');
  {
    const src = ATLAS.pieces.rudder.src;
    const w = (src[2] - src[0]) / SIDE_PPM, h = (src[3] - src[1]) / SIDE_PPM;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.rotateY(-Math.PI / 2); // the texture's right -> +z, the bow, as in the side view
    setRectUV(geo, ...rectOf('rudder'));
    const card = new THREE.Mesh(geo, cardMat());
    card.position.set(0, (S.midRim - (src[1] + src[3]) / 2) / SIDE_PPM, ((src[0] + src[2]) / 2 - S.sternX) / SIDE_PPM + 0.02);
    rudder.add(card);
  }

  const lanternGeos = (() => {
    const src = ATLAS.pieces.lantern.src;
    const w = (src[2] - src[0]) / SIDE_PPM * 0.9, h = (src[3] - src[1]) / SIDE_PPM * 0.9;
    const a = new THREE.PlaneGeometry(w, h), b = new THREE.PlaneGeometry(w, h);
    b.rotateY(Math.PI / 2);
    for (const g of [a, b]) setRectUV(g, ...rectOf('lantern'));
    return [a, b];
  })();
  const lanternMat = cardMat(lit ? { emissiveIntensity: 0.6 } : { emissiveIntensity: 0.05, color: 0x8a8296 });
  const lanterns = [];
  const hang = [[0, keelY(2.2) + 0.12, 2.2], [0, rimY(STERN) + 0.55, STERN - 0.12]];
  for (const side of [-1, 1]) hang.push([side * 1.3, 0.78, 1.2], [side * 1.3, 0.22, -1.05]);
  for (const [x, y, z] of hang) {
    const l = joint(ship, [x, y, z]);
    for (const g of lanternGeos) l.add(new THREE.Mesh(g, lanternMat));
    const g = glowSprite('#ffb45e', 0.8, 0.55);
    if (lit) l.add(g);
    lanterns.push(g);
  }
  part(ship, cyl(0.025, 0.03, 0.55, 5), toon(BRASS), { pos: [0, rimY(STERN) + 0.2, STERN - 0.12], ink: false });

  // ---------------------------------------------------------------- the helm, at the stern
  const wheel = joint(ship, [0, 0.95, -1.62], 'wheel');
  part(ship, cyl(0.04, 0.06, 1.0, 6), toon(WOOD_DARK), { pos: [0, 0.45, -1.68], ink: false });
  part(wheel, new THREE.TorusGeometry(0.22, 0.024, 6, 18), toon(WOOD_DARK), { ink: false });
  for (let i = 0; i < 8; i++) part(wheel, cyl(0.011, 0.011, 0.56, 4), toon(BRASS), { rot: [0, 0, (i / 8) * Math.PI * 2], ink: false });
  part(wheel, sphere(0.05, 8, 6), toon(BRASS), { ink: false });

  // ---------------------------------------------------------------- shadow and motes (world space: add `fx`)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;
  const fx = new THREE.Group();
  fx.name = 'airship-fx';
  const moteMax = 110;
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(moteMax * 3), 3));
  moteGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(moteMax * 3), 3));
  const motesMesh = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  motesMesh.frustumCulled = false;
  fx.add(motesMesh, shadow);
  const motes = [];

  onLayer(root);
  onLayer(fx);

  const bank = new Spring(8, 4), pitch = new Spring(10, 5);
  let t = 0, emit = 0;
  const tmp = new THREE.Vector3();
  return {
    root, fx, shadow, name: 'the Magpie', length: LENGTH,
    deck: ship, // add crew here so they bank and bob with her
    helm: new THREE.Vector3(0, DECK_Y, -2.0), // where the witch stands to steer
    perch: new THREE.Vector3(-halfWidth(1.9) * 0.96, rimY(1.9) + 0.19, 1.9), // the port rail near the bow, for Inkblot
    // speed in m/s, turn in rad/s, climb in m/s, ground: the height of the ground under her
    update(dt, speed = 0, turn = 0, climb = 0, ground = 0) {
      t += dt;
      const cruise = Math.min(1, speed / 6);
      ship.position.y = Math.sin(t * 1.3) * 0.12 + Math.sin(t * 0.7) * 0.06;
      ship.rotation.z = bank.update(-turn * 0.35 + Math.sin(t * 0.9) * 0.02, dt);
      ship.rotation.x = pitch.update(-climb * 0.05 + Math.sin(t * 1.1) * 0.015 - cruise * 0.02, dt);
      rudder.rotation.y = -turn * 0.6;
      wheel.rotation.z = turn * 1.4;
      for (const [i, f] of fins.entries()) f.rotation.x = Math.sin(t * 1.5 + i) * 0.04;
      // The sails belly out with the wind of her speed
      for (const [i, s] of sails.entries()) {
        const { rest, bary, belly } = s.geo.userData, p = s.geo.attributes.position;
        const fill = 0.1 + cruise * 0.22;
        for (let k = 0; k < p.count; k++) {
          const b = bary[k] * (fill + Math.sin(t * 3 + k * 0.3 + i) * 0.015);
          p.setXYZ(k, rest[k * 3] + belly.x * b, rest[k * 3 + 1] + belly.y * b, rest[k * 3 + 2] + belly.z * b);
        }
        p.needsUpdate = true;
        s.geo.computeVertexNormals();
      }
      // The sunstones pulse and turn slowly
      for (const c of crystals) {
        const pulse = 0.85 + Math.sin(t * 2.4 + c.phase) * 0.15;
        c.c.rotation.y += dt * 0.3;
        c.glow.material.opacity = 0.42 * pulse;
        c.glow.scale.setScalar(1.3 * c.s * pulse);
        c.heart.material.opacity = 0.75 + Math.sin(t * 3.1 + c.phase) * 0.2;
      }
      if (lit) crystalMat.emissiveIntensity = 0.7 + Math.sin(t * 2.4) * 0.12;
      sunLight.intensity = 6 * (0.9 + Math.sin(t * 2.4) * 0.1);
      grate.intensity = 2 * (0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13.7) * 0.07);
      for (const [i, g] of lanterns.entries()) g.material.opacity = 0.55 + Math.sin(t * 7 + i * 2) * 0.06;

      // Motes: a few a second from the crystals, more when she's moving
      root.updateMatrixWorld();
      if (lit) emit += dt * (12 + cruise * 34);
      while (emit > 1 && motes.length < moteMax) {
        emit--;
        const c = crystals[Math.floor(Math.random() * crystals.length)];
        array.localToWorld(tmp.set(...c.top));
        motes.push({ p: tmp.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.2 - Math.random() * 0.3, (Math.random() - 0.5) * 0.4), life: 1.6 + Math.random() });
      }
      emit = Math.min(emit, 2);
      const mp = moteGeo.attributes.position, mc = moteGeo.attributes.color;
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.life -= dt;
        if (m.life <= 0) { motes.splice(i, 1); continue; }
        m.p.addScaledVector(m.v, dt);
      }
      motes.forEach((m, i) => {
        const k = Math.min(1, m.life / 1.2);
        mp.setXYZ(i, m.p.x, m.p.y, m.p.z);
        mc.setXYZ(i, k, 0.75 * k, 0.3 * k);
      });
      mp.needsUpdate = mc.needsUpdate = true;
      moteGeo.setDrawRange(0, motes.length);

      // Her shadow on the ground below, softer and larger the higher she flies
      root.getWorldPosition(tmp);
      shadow.position.set(tmp.x, ground + 0.05, tmp.z);
      shadow.rotation.z = root.rotation.y;
      const alt = Math.max(0, tmp.y - ground), size = root.scale.x;
      shadow.material.opacity = 0.4 / (1 + alt * 0.08);
      shadow.scale.set((1.5 + alt * 0.02) * size, (2.6 + alt * 0.04) * size, 1);
    },
  };
}

// Project a piece of the sheet onto a geometry from the side (along z): sheetXY(x, y) gives the sheet pixel.
function planarUV(geo, piece, sheetXY) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [u, v] = uvOf(piece, ...sheetXY(p.getX(i), p.getY(i)));
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Map a plane's 0..1 UVs onto one rectangle of the atlas
function setRectUV(geo, u0, v0, u1, v1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
}
