import * as THREE from 'three';
import { toon, toonMap, part, joint, cyl, sphere, taperedTube, glowSprite, onLayer, Spring } from './kit.js';

// The skiff, from Thareia's turnaround sheet (New-game repo, thareia/art-in/airship/airship-skiff-turnaround.png):
// "a wooden hull with small sails under a cluster of glowing amber crystals", their hearts violet with witchfire. A plank hull with brass bands and
// portholes, a keel and rudder, brass-edged side fins, two sail-wings with a sun on each, a stern cabin with a
// lit window, lanterns, a ship's wheel for the witch, and five sunstone crystals on brass stalks that pulse and
// shed golden motes. Built in code like the characters. Local space: deck at y = 0, bow toward +z, 1 unit = 1 m.

const WOOD = '#7a4a2a', WOOD_DARK = '#4e2d19', WOOD_DECK = '#a8764a', BRASS = '#c9a24d', CANVAS = '#efe3c4', AMBER = '#ffb22e';
const STERN = -2.4, BOW = 2.7;

// Hull shape along its length (t = 0 at the stern, 1 at the bow)
const halfWidth = (t) => (t < 0.45 ? 0.62 + 0.33 * Math.sin((t / 0.45) * Math.PI / 2) : 0.95 * Math.pow(Math.cos(((t - 0.45) / 0.55) * Math.PI / 2), 0.75)) + 0.02;
const depth = (t) => 0.55 + 0.35 * Math.sin(Math.min(1, t * 1.25) * Math.PI) * (t < 0.85 ? 1 : 1 - (t - 0.85) * 3);
const sheer = (t) => 0.06 * Math.pow(t, 3) * 4 + (t < 0.1 ? (0.1 - t) * 0.8 : 0);

export function createAirship() {
  const root = new THREE.Group();
  root.name = 'airship';
  const ship = joint(root, [0, 0, 0], 'ship'); // banks and bobs
  const planks = plankTexture();
  const deckTex = deckTexture();

  // ---------------------------------------------------------------- hull
  const rows = 22, cols = 18;
  const pos = [], uv = [], idx = [];
  const at = (t, s) => {
    const z = STERN + (BOW - STERN) * t;
    const w = halfWidth(t), d = depth(t), top = sheer(t);
    const th = Math.PI * s;
    return [-w * Math.cos(th), top - d * Math.pow(Math.sin(th), 0.75), z];
  };
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const t = r / rows, s = c / cols;
    pos.push(...at(t, s));
    uv.push(s, t);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hullGeo.setIndex(idx);
  hullGeo.computeVertexNormals();
  part(ship, hullGeo, toonMap(planks, { side: THREE.DoubleSide }));

  // Transom: the flat stern, with a brass frame
  const transom = new THREE.Shape();
  for (let c = 0; c <= cols; c++) {
    const [x, y] = at(0, c / cols);
    c ? transom.lineTo(x, y) : transom.moveTo(x, y);
  }
  part(ship, new THREE.ShapeGeometry(transom), toon(WOOD_DARK, { side: THREE.DoubleSide }), { pos: [0, 0, STERN + 0.005], ink: false });

  // Deck
  const deck = new THREE.Shape();
  const n = 20;
  for (let i = 0; i <= n; i++) { const t = i / n; deck.lineTo(-halfWidth(t) * 0.97, STERN + (BOW - STERN) * t); }
  for (let i = n; i >= 0; i--) { const t = i / n; deck.lineTo(halfWidth(t) * 0.97, STERN + (BOW - STERN) * t); }
  const deckGeo = new THREE.ShapeGeometry(deck, 2);
  deckGeo.rotateX(Math.PI / 2);
  const deckUv = deckGeo.attributes.uv;
  for (let i = 0; i < deckUv.count; i++) deckUv.setXY(i, deckGeo.attributes.position.getX(i) * 0.6 + 0.5, deckGeo.attributes.position.getZ(i) * 0.3);
  part(ship, deckGeo, toonMap(deckTex, { side: THREE.DoubleSide }), { pos: [0, 0.02, 0], ink: false });

  // Brass gunwale rails and posts
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = 0.02 + (i / 12) * 0.9; pts.push([side * halfWidth(t) * 0.97, sheer(t) + 0.2, STERN + (BOW - STERN) * t]); }
    part(ship, taperedTube(pts, 0.028, 0.02, 24, 6), toon(BRASS));
    for (let i = 0; i <= 8; i++) {
      const t = 0.04 + (i / 8) * 0.84;
      part(ship, cyl(0.016, 0.018, 0.2, 5), toon(BRASS), { pos: [side * halfWidth(t) * 0.97, sheer(t) + 0.1, STERN + (BOW - STERN) * t], ink: false });
    }
    // Portholes: brass rings with warm light inside
    for (const t of [0.3, 0.45, 0.6]) {
      const [x, y, z] = at(t, side < 0 ? 0.13 : 0.87);
      const ring = part(ship, new THREE.TorusGeometry(0.07, 0.018, 6, 14), toon(BRASS), { pos: [x * 1.01, y - 0.05, z], ink: false });
      ring.rotation.y = Math.PI / 2;
      const glass = part(ship, new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: '#ffcf7a', side: THREE.DoubleSide }), { pos: [x * 1.005, y - 0.05, z], ink: false });
      glass.rotation.y = Math.PI / 2;
    }
  }

  // Keel, with a brass stem curving up at the bow
  const keelPts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const [, y, z] = at(t, 0.5); keelPts.push([0, y - 0.05, z]); }
  keelPts.push([0, 0.1, BOW + 0.15], [0, 0.45, BOW + 0.2]);
  part(ship, taperedTube(keelPts, 0.05, 0.03, 30, 6), toon(WOOD_DARK));
  part(ship, taperedTube(keelPts.slice(-4), 0.035, 0.02, 10, 6), toon(BRASS), { ink: false });

  // Rudder, hinged at the stern
  const rudder = joint(ship, [0, -0.2, STERN - 0.05], 'rudder');
  const rShape = new THREE.Shape();
  rShape.moveTo(0, 0.2); rShape.lineTo(-0.5, 0.1); rShape.quadraticCurveTo(-0.6, -0.4, -0.2, -0.7); rShape.lineTo(0, -0.55);
  const rGeo = new THREE.ExtrudeGeometry(rShape, { depth: 0.05, bevelEnabled: false });
  rGeo.translate(0, 0, -0.025);
  const rud = part(rudder, rGeo, toon(WOOD));
  rud.rotation.y = Math.PI / 2;

  // Side fins, brass-edged, angled down and out
  const fins = [-1, 1].map((side) => {
    const f = joint(ship, [side * 0.78, -0.42, 0.35]);
    f.rotation.z = side * 0.55;
    const s = new THREE.Shape();
    s.moveTo(0, -0.35); s.lineTo(0.75, -0.2); s.lineTo(0.85, 0.05); s.lineTo(0, 0.35);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.02, 0);
    const fin = part(f, g, toon(WOOD));
    fin.scale.x = side;
    part(f, taperedTube([[0, 0, -0.35], [side * 0.75, 0, -0.2], [side * 0.85, 0, 0.05]], 0.02, 0.018, 10, 5), toon(BRASS), { ink: false });
    return f;
  });

  // ---------------------------------------------------------------- sail-wings
  const sailTex = sailTexture();
  const sails = [-1, 1].map((side) => {
    const mast = joint(ship, [side * 0.55, 0.15, 0.55]);
    mast.rotation.z = -side * 0.62;
    part(mast, cyl(0.035, 0.045, 2.0, 6), toon(WOOD_DARK), { pos: [0, 1.0, 0] });
    part(mast, sphere(0.05, 6, 5), toon(BRASS), { pos: [0, 2.02, 0], ink: false });
    // A triangular sail from the masthead down to a boom
    const geo = new THREE.BufferGeometry();
    const N = 8, verts = [], uvs = [], ind = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
      const u = i / N, v = j / N; // barycentric over (mast top, mast foot, boom end)
      const A = [0, 1.9, 0], B = [0, 0.25, 0], Cc = [0, 0.3, -1.25];
      const w = 1 - u - v;
      verts.push(A[0] * w + B[0] * u + Cc[0] * v, A[1] * w + B[1] * u + Cc[1] * v, A[2] * w + B[2] * u + Cc[2] * v);
      uvs.push(0.5 + (v - u) * 0.45, 1 - u * 0.9);
    }
    const id = (i, j) => { let k = 0; for (let a = 0; a < i; a++) k += N - a + 1; return k + j; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
      ind.push(id(i, j), id(i + 1, j), id(i, j + 1));
      if (j < N - i - 1) ind.push(id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(ind);
    geo.computeVertexNormals();
    geo.userData.rest = Float32Array.from(verts);
    const sail = part(mast, geo, toonMap(sailTex, { side: THREE.DoubleSide }));
    sail.rotation.y = side * 0.25;
    part(mast, cyl(0.02, 0.02, 1.3, 5), toon(WOOD_DARK), { pos: [0, 0.3, -0.62], rot: [Math.PI / 2, 0, 0], ink: false });
    return { mast, geo };
  });

  // ---------------------------------------------------------------- the sunstone array
  const array = joint(ship, [0, 0, -0.35], 'sunstones');
  part(array, cyl(0.22, 0.28, 0.4, 12), toon(BRASS), { pos: [0, 0.2, 0] });
  part(array, cyl(0.16, 0.2, 0.25, 12), toon('#8a5a2a'), { pos: [0, 0.52, 0] });
  part(array, new THREE.TorusGeometry(0.2, 0.025, 6, 16), toon(BRASS), { pos: [0, 0.42, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  // Faceted: one normal per face, so each facet catches the light on its own
  const crystalGeo = new THREE.LatheGeometry([[0.001, -0.2], [0.13, -0.06], [0.13, 0.12], [0.001, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 6).toNonIndexed();
  crystalGeo.computeVertexNormals();
  const crystalMat = new THREE.MeshToonMaterial({ color: AMBER, emissive: new THREE.Color('#ff8a1a'), emissiveIntensity: 0.9 });
  const crystals = [];
  const stalks = [[0, 0, 1.75, 1.2], [0.42, 0.25, 1.4, 0.9], [-0.42, 0.25, 1.4, 0.9], [0.4, -0.3, 1.35, 0.85], [-0.4, -0.3, 1.35, 0.85]];
  for (const [x, z, h, s] of stalks) {
    part(array, taperedTube([[0, 0.6, 0], [x * 0.4, h * 0.6, z * 0.4], [x, h - 0.22 * s, z]], 0.035, 0.025, 10, 5), toon(BRASS), { ink: false });
    const cup = part(array, cyl(0.12 * s, 0.06 * s, 0.1 * s, 8, true), toon(BRASS, { side: THREE.DoubleSide }), { pos: [x, h - 0.18 * s, z], ink: false });
    const c = new THREE.Mesh(crystalGeo, crystalMat);
    c.position.set(x, h, z);
    c.scale.setScalar(s);
    array.add(c);
    const glow = glowSprite('#ffc45a', 1.1 * s, 0.55);
    glow.position.set(x, h + 0.05, z);
    array.add(glow);
    // Lit with witchfire, each amber crystal has a violet heart (docs/LORE.md, "The skiff")
    const heart = glowSprite('#b25cff', 0.42 * s, 0.95);
    heart.position.set(x, h + 0.04, z);
    array.add(heart);
    crystals.push({ c, glow, heart, s, phase: Math.random() * 6, cup });
  }
  const sunLight = new THREE.PointLight('#ffb44a', 6, 9, 2);
  sunLight.position.set(0, 1.5, 0);
  array.add(sunLight);

  // ---------------------------------------------------------------- stern cabin, wheel, lanterns
  const cabin = joint(ship, [0, 0, -1.75]);
  part(cabin, new THREE.BoxGeometry(1.0, 0.62, 0.7), toon('#8a5634'), { pos: [0, 0.31, 0] });
  const roof = new THREE.Shape();
  roof.moveTo(-0.6, 0); roof.lineTo(0, 0.32); roof.lineTo(0.6, 0); roof.lineTo(-0.6, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: 0.8, bevelEnabled: false });
  roofGeo.translate(0, 0.62, -0.4);
  part(cabin, roofGeo, toon('#6b2a3a'));
  part(cabin, new THREE.BoxGeometry(0.26, 0.42, 0.02), toon(WOOD_DARK), { pos: [0, 0.23, 0.36], ink: false });
  part(cabin, sphere(0.02, 5, 4), toon(BRASS), { pos: [0.08, 0.23, 0.38], ink: false });
  for (const x of [-0.32, 0.32]) {
    part(cabin, new THREE.TorusGeometry(0.075, 0.015, 5, 12), toon(BRASS), { pos: [x, 0.36, 0.355], ink: false });
    part(cabin, new THREE.CircleGeometry(0.065, 12), new THREE.MeshBasicMaterial({ color: '#ffd28a' }), { pos: [x, 0.36, 0.352], ink: false });
  }
  // The helm: the wheel on a post, at the height of her hands, with the witch standing behind it (api.helm)
  const wheel = joint(ship, [0, 0.95, -0.92], 'wheel');
  part(ship, cyl(0.04, 0.06, 0.95, 6), toon(WOOD_DARK), { pos: [0, 0.47, -0.98], ink: false });
  part(wheel, new THREE.TorusGeometry(0.2, 0.022, 6, 16), toon(WOOD_DARK), { ink: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(wheel, cyl(0.01, 0.01, 0.5, 4), toon(BRASS), { rot: [0, 0, a], ink: false });
  }
  const lanterns = [];
  for (const [x, y, z] of [[0, 0.7, BOW - 0.2], [-0.5, 0.95, -1.4], [0.5, 0.95, -1.4]]) {
    const l = joint(ship, [x, y, z]);
    if (z > 0) part(ship, cyl(0.02, 0.025, 0.55, 5), toon(BRASS), { pos: [x, y - 0.3, z], ink: false });
    part(l, cyl(0.06, 0.07, 0.14, 6), new THREE.MeshBasicMaterial({ color: '#ffd07a' }), { ink: false });
    part(l, cyl(0.03, 0.08, 0.05, 6), toon(BRASS), { pos: [0, 0.09, 0], ink: false });
    const g = glowSprite('#ffb45e', 0.7, 0.6);
    l.add(g);
    lanterns.push(g);
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.3, 3.2, 1);
  shadow.renderOrder = -1;

  // Golden motes shed by the crystals, left behind in the air (world space: the scene adds `fx`)
  const fx = new THREE.Group();
  fx.name = 'airship-fx';
  const moteMax = 90;
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
  const api = {
    root, fx, shadow, name: 'Skiff', length: BOW - STERN,
    deck: ship, // add crew here so they bank and bob with her
    helm: new THREE.Vector3(0, 0.02, -1.3), // where the witch stands to steer
    perch: new THREE.Vector3(-0.5, 0.37, 1.93), // a spot on the port rail near the bow, for Inkblot
    // speed in m/s, turn in rad/s, climb in m/s, ground: the height of the ground under her
    update(dt, speed = 0, turn = 0, climb = 0, ground = 0) {
      t += dt;
      const cruise = Math.min(1, speed / 8);
      ship.position.y = Math.sin(t * 1.3) * 0.12 + Math.sin(t * 0.7) * 0.06;
      ship.rotation.z = bank.update(-turn * 0.35 + Math.sin(t * 0.9) * 0.02, dt);
      ship.rotation.x = pitch.update(-climb * 0.05 + Math.sin(t * 1.1) * 0.015 - cruise * 0.02, dt);
      rudder.rotation.y = -turn * 0.6;
      wheel.rotation.z = turn * 1.4;
      for (const [i, f] of fins.entries()) f.rotation.x = Math.sin(t * 1.5 + i) * 0.04;
      // Sails fill with the wind of her speed
      for (const [i, s] of sails.entries()) {
        const rest = s.geo.userData.rest, p = s.geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const y = rest[k * 3 + 1], z = rest[k * 3 + 2];
          const inner = Math.sin(Math.min(1, (y - 0.25) / 1.65) * Math.PI) * Math.sin(Math.min(1, -z / 1.25 + 0.001) * Math.PI);
          const fill = (0.12 + cruise * 0.22) * inner + Math.sin(t * 3 + y * 2 + i) * 0.02 * inner;
          p.setX(k, rest[k * 3] + (i ? 1 : -1) * fill);
        }
        p.needsUpdate = true;
        s.geo.computeVertexNormals();
      }
      // Sunstones pulse and turn slowly
      for (const c of crystals) {
        const pulse = 0.85 + Math.sin(t * 2.4 + c.phase) * 0.15;
        c.c.rotation.y += dt * 0.4;
        c.glow.material.opacity = 0.45 * pulse;
        c.glow.scale.setScalar(1.1 * c.s * pulse);
        c.heart.material.opacity = 0.75 + Math.sin(t * 3.1 + c.phase) * 0.2;
      }
      crystalMat.emissiveIntensity = 0.8 + Math.sin(t * 2.4) * 0.15;
      sunLight.intensity = 6 * (0.9 + Math.sin(t * 2.4) * 0.1);
      for (const [i, g] of lanterns.entries()) g.material.opacity = 0.55 + Math.sin(t * 7 + i * 2) * 0.06;

      // Motes: a few a second from the crystals, more when she's moving
      root.updateMatrixWorld();
      emit += dt * (10 + cruise * 30);
      while (emit > 1 && motes.length < moteMax) {
        emit--;
        const s = stalks[Math.floor(Math.random() * stalks.length)];
        array.localToWorld(tmp.set(s[0], s[2], s[1]));
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
        mc.setXYZ(i, 1 * k, 0.75 * k, 0.3 * k);
      });
      mp.needsUpdate = mc.needsUpdate = true;
      moteGeo.setDrawRange(0, motes.length);

      // Her shadow on the ground below, softer and smaller the higher she flies
      root.getWorldPosition(tmp);
      shadow.position.set(tmp.x, ground + 0.05, tmp.z);
      shadow.rotation.z = root.rotation.y;
      const alt = Math.max(0, tmp.y - ground), size = root.scale.x;
      shadow.material.opacity = 0.4 / (1 + alt * 0.08);
      shadow.scale.set((0.9 + alt * 0.02) * size, (2.5 + alt * 0.04) * size, 1);
    },
  };
  return api;
}

// ---------------------------------------------------------------- textures painted in code

function plankTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = WOOD; g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 16) {
    g.fillStyle = (x / 16) % 2 ? '#84522e' : '#704326';
    g.fillRect(x, 0, 15, 64);
    g.fillStyle = 'rgba(40,20,10,0.8)';
    g.fillRect(x + 15, 0, 1, 64);
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(30,15,5,0.35)'; g.fillRect(x + 3 + k * 4, (x * 7 + k * 23) % 64, 1, 6); }
  }
  // Brass bands under the rail on both sides
  g.fillStyle = BRASS;
  g.fillRect(4, 0, 8, 64); g.fillRect(244, 0, 8, 64);
  g.fillStyle = '#e8c97a';
  for (let y = 4; y < 64; y += 16) { g.fillRect(7, y, 2, 2); g.fillRect(247, y, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

function deckTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = WOOD_DECK; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 12) { g.fillStyle = 'rgba(60,35,20,0.6)'; g.fillRect(0, y, 64, 1); }
  for (let x = 0; x < 64; x += 21) { g.fillStyle = 'rgba(60,35,20,0.35)'; g.fillRect(x, 0, 1, 256); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function sailTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = CANVAS; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,120,80,0.35)';
  g.lineWidth = 2;
  for (let y = 30; y < 256; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  // A golden sun, as on the refitted skiff's sails
  g.fillStyle = '#e2a93a';
  g.beginPath(); g.arc(128, 140, 26, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e2a93a';
  g.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(128 + Math.cos(a) * 34, 140 + Math.sin(a) * 34); g.lineTo(128 + Math.cos(a) * 48, 140 + Math.sin(a) * 48); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
