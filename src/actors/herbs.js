import * as THREE from 'three';
import { toon, toonMap, part, joint, sphere, cyl, cone, lathe, taperedTube, glowSprite, onLayer } from './kit.js';
import { merge } from './party-kit.js';

// Herbs as small 3D plants, in full colour, so they read against the night paintings. Each has a twinkle over it
// (like FF9's glinting pick-ups) and a soft glow on the ground. createHerb(kind) returns { root, update(dt) }.
// Kinds match art/herbs: moonpetal, lavender, nightrose, chapel_moss, bogwick, silver_mugwort, witchs_bells, ember_star_lily,
// wisp_sprout, and a generic fallback.

const STEM = '#4f8a3c', LEAF = '#5fa34a', LEAF_DARK = '#3d6e31';

function leaf(parent, len, angle, lift, color = LEAF) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(len * 0.45, len * 0.22, len, 0);
  s.quadraticCurveTo(len * 0.45, -len * 0.22, 0, 0);
  const m = part(parent, new THREE.ShapeGeometry(s, 5), toon(color, { side: THREE.DoubleSide }), { ink: false });
  m.rotation.set(-Math.PI / 2 + lift, angle, 0);
  return m;
}

function flower(parent, { petals = 5, r = 0.05, color, center = '#ffe28a', cup = 0.35 }) {
  const f = new THREE.Group();
  for (let i = 0; i < petals; i++) {
    const p = part(f, sphere(r * 0.55, 8, 6), toon(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.25 }), { ink: false });
    const a = (i / petals) * Math.PI * 2;
    p.position.set(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6);
    p.scale.set(1.2, 0.35, 0.7);
    p.rotation.set(0, -a, cup);
  }
  part(f, sphere(r * 0.3, 6, 5), toon(center), { pos: [0, r * 0.12, 0], ink: false });
  parent.add(f);
  return f;
}

const MAKERS = {
  // Pale lilac-white flowers that glow a little: "Wickhollow's lanterns burn its oil"
  moonpetal(g) {
    for (const [x, z, h, tilt] of [[0, 0, 0.3, 0], [0.07, 0.04, 0.22, 0.3], [-0.06, 0.05, 0.25, -0.3], [0.02, -0.07, 0.18, 0.2]]) {
      const stem = joint(g, [x, 0, z]);
      stem.rotation.set(tilt * 0.6, 0, tilt);
      part(stem, cyl(0.006, 0.008, h, 5), toon(STEM), { pos: [0, h / 2, 0], ink: false });
      const head = flower(stem, { petals: 6, r: 0.055, color: '#efe6ff', center: '#fff2b0' });
      head.position.y = h;
    }
    for (let i = 0; i < 5; i++) leaf(g, 0.11, (i / 5) * Math.PI * 2, 0.35, LEAF);
    return '#e9e1ff';
  },
  // Tall purple spikes
  lavender(g) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = 0.03 + (i % 3) * 0.02, h = 0.26 + (i % 3) * 0.06;
      const stem = joint(g, [Math.cos(a) * r, 0, Math.sin(a) * r]);
      stem.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      part(stem, cyl(0.005, 0.007, h, 4), toon('#6d8f5a'), { pos: [0, h / 2, 0], ink: false });
      for (let k = 0; k < 6; k++) part(stem, sphere(0.02 - k * 0.0015, 6, 5), toon(k % 2 ? '#9a6ae0' : '#b485f0', { emissive: new THREE.Color('#5a2a9a'), emissiveIntensity: 0.3 }), { pos: [0, h - 0.1 + k * 0.022, 0], ink: false });
    }
    for (let i = 0; i < 6; i++) leaf(g, 0.09, (i / 6) * Math.PI * 2 + 0.3, 0.6, '#7fa368');
    return '#c9a8ff';
  },
  // A low rose bush with deep red blooms; it only opens under a clear moon
  nightrose(g) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const l = part(g, sphere(0.06, 7, 5), toon(i % 2 ? LEAF_DARK : '#467a38'), { pos: [Math.cos(a) * 0.08, 0.07 + (i % 3) * 0.03, Math.sin(a) * 0.08], ink: false });
      l.scale.set(1, 0.6, 1);
    }
    for (const [x, y, z] of [[0, 0.2, 0], [0.08, 0.15, 0.05], [-0.07, 0.16, -0.03]]) {
      const rose = joint(g, [x, y, z]);
      for (let k = 0; k < 3; k++) {
        const p = part(rose, sphere(0.045 - k * 0.012, 8, 6), toon(k ? '#c41f45' : '#e0344f', { emissive: new THREE.Color('#5a0018'), emissiveIntensity: 0.35 }), { pos: [0, k * 0.012, 0], ink: k === 0 });
        p.scale.set(1, 0.7, 1);
      }
    }
    return '#ff8fa8';
  },
  // A cushion of moss on an old stone, with tiny pale spores
  chapel_moss(g) {
    const stone = part(g, sphere(0.12, 8, 6), toon('#7d7a86'), { pos: [0, 0.04, 0] });
    stone.scale.set(1.2, 0.55, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, sphere(0.05, 7, 5), toon(i % 2 ? '#5fa34a' : '#79bd5c', { emissive: new THREE.Color('#1f4a14'), emissiveIntensity: 0.3 }), { pos: [Math.cos(a) * 0.09, 0.09 + Math.sin(i) * 0.01, Math.sin(a) * 0.07], scale: [1, 0.5, 1], ink: false });
    }
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      part(g, sphere(0.008, 4, 3), new THREE.MeshBasicMaterial({ color: '#e8ffd8' }), { pos: [Math.cos(a) * 0.08, 0.13, Math.sin(a) * 0.06], ink: false });
    }
    return '#b8f0a0';
  },
  // Bulrushes whose velvet-brown heads end in a little lit wick: Bogmire grows it in its lamp-pole planters
  bogwick(g) {
    for (const [i, [x, z, h, tilt]] of [[0, 0, 0.42, 0], [0.06, 0.03, 0.34, 0.22], [-0.05, 0.04, 0.37, -0.18], [0.02, -0.06, 0.3, 0.12], [-0.03, -0.04, 0.26, -0.3]].entries()) {
      const stem = joint(g, [x, 0, z]);
      stem.rotation.set(tilt * 0.5, 0, tilt);
      part(stem, cyl(0.005, 0.008, h, 5), toon('#5f8f3e'), { pos: [0, h / 2, 0], ink: false });
      // the head: a fat brown spindle, darker at the top
      const head = part(stem, sphere(0.024, 8, 6), toon(i % 2 ? '#8a5530' : '#7a4526', { emissive: new THREE.Color('#2a1206'), emissiveIntensity: 0.4 }), { pos: [0, h - 0.035, 0] });
      head.scale.set(1, 2.6, 1);
      // and its wick, alight
      part(stem, cone(0.009, 0.03, 5), new THREE.MeshBasicMaterial({ color: '#f2ff9a' }), { pos: [0, h + 0.04, 0], ink: false });
      part(stem, sphere(0.013, 6, 5), new THREE.MeshBasicMaterial({ color: '#d8ff6a', transparent: true, opacity: 0.55 }), { pos: [0, h + 0.035, 0], ink: false });
    }
    // long blades, standing up round the stems
    for (let i = 0; i < 9; i++) leaf(g, 0.2 + (i % 3) * 0.05, (i / 9) * Math.PI * 2 + 0.2, 1.05 + (i % 2) * 0.25, i % 3 ? '#6aa84a' : LEAF_DARK);
    return '#e2ff8a';
  },
  // Feathery silver leaves, pale as moonlight on water, with small clusters of yellow flowers on top
  silver_mugwort(g) {
    const silver = toon('#d7dde8', { side: THREE.DoubleSide, emissive: new THREE.Color('#6a7390'), emissiveIntensity: 0.35 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4, r = 0.03 + (i % 2) * 0.02, h = 0.22 + (i % 3) * 0.05;
      const stem = joint(g, [Math.cos(a) * r, 0, Math.sin(a) * r]);
      stem.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      part(stem, cyl(0.005, 0.007, h, 4), toon('#8a9a7a'), { pos: [0, h / 2, 0], ink: false });
      // silver fronds up the stem, each a little leaf turned out and up
      for (let k = 0; k < 3; k++) {
        const f = joint(stem, [0, 0.05 + k * h * 0.25, 0]);
        f.rotation.y = k * 2.1 + i;
        const m = part(f, new THREE.ShapeGeometry(frond(0.08 - k * 0.015), 4), silver, { ink: false });
        m.rotation.set(-0.5, 0, 0);
      }
      // the flower cluster: small yellow buds
      for (let k = 0; k < 5; k++) {
        const b = k * 2.4;
        part(stem, sphere(0.011, 5, 4), toon(k % 2 ? '#f2cf4a' : '#ffe27a', { emissive: new THREE.Color('#6a4a00'), emissiveIntensity: 0.5 }), { pos: [Math.cos(b) * 0.018, h + (k % 3) * 0.012, Math.sin(b) * 0.018], ink: false });
      }
    }
    for (let i = 0; i < 7; i++) {
      const m = part(g, new THREE.ShapeGeometry(frond(0.11), 4), silver, { ink: false });
      m.rotation.set(-Math.PI / 2 + 0.45, (i / 7) * Math.PI * 2, 0);
    }
    return '#e6ecff';
  },

  // The Gloamwood's three (LORE.md §8, from the lantern path). A maker can also return { glow, top, update(dt, t) }:
  // top is how high the twinkle sits (tall plants), and update adds a life of its own (a flicker, drifting motes).

  // Witch's bells: foxglove spires, three of them, hung with purple bells that open pale and freckled inside,
  // smaller up the stem, then closed buds at the tip, over a rosette of broad soft leaves. The bells of each
  // spire are one mesh, so a tall plant still costs little.
  witchs_bells(g) {
    const bellOut = toon('#9a3cd6', { emissive: new THREE.Color('#6a1aa8'), emissiveIntensity: 0.55 });
    const bellIn = toon('#f6e4f2', { emissive: new THREE.Color('#7a4a7a'), emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const freckle = new THREE.MeshBasicMaterial({ color: '#6a1f5a' });
    const bud = toon('#c98ae8', { emissive: new THREE.Color('#4a1a6a'), emissiveIntensity: 0.4 });
    const spires = [];
    for (const [x, z, h, lean, turn] of [[0, 0, 0.56, 0, 0], [0.075, 0.045, 0.44, 0.16, 1.3], [-0.07, 0.035, 0.4, -0.18, 2.6]]) {
      const stem = joint(g, [x, 0, z]);
      stem.rotation.set(lean * 0.4, turn, lean);
      part(stem, cyl(0.005, 0.009, h, 5), toon('#4f7a3c'), { pos: [0, h / 2, 0], ink: false });
      // the bells: a lathe cup hanging mouth-down, turned out from the stem, on a spiral up the stem's front two thirds
      const outer = [], inner = [], dots = [], buds = [];
      const n = Math.round(h / 0.05);
      for (let i = 0; i < n; i++) {
        const k = i / n, y = h * (0.28 + k * 0.62), size = 0.04 * (1 - k * 0.55);
        const a = i * 2.1 + turn, r = 0.02 + size * 0.5;
        const place = (geo) => geo.rotateX(0.95).rotateY(-a - Math.PI / 2).translate(Math.cos(a) * r, y, Math.sin(a) * r); // mouth out and down
        if (k > 0.78) { buds.push(place(new THREE.SphereGeometry(size * 0.55, 6, 5).scale(0.8, 1.3, 0.8))); continue; }
        // bottom (the flared mouth) to top, so the faces point out
        const cup = [[size * 0.8, -size * 1.5], [size * 0.62, -size * 1.35], [size * 0.5, -size * 0.8], [size * 0.42, -size * 0.2], [size * 0.18, size * 0.1]];
        outer.push(place(lathe(cup, 8)));
        inner.push(place(lathe(cup.map(([cx, cy]) => [cx * 0.86, cy + size * 0.04]), 8)));
        // two freckles on the lower lip, the way a foxglove signs its bells
        for (const s of [-1, 1]) dots.push(place(new THREE.SphereGeometry(size * 0.12, 4, 3).translate(s * size * 0.22, -size * 1.3, size * 0.5)));
      }
      part(stem, merge(outer), bellOut, { ink: true });
      part(stem, merge(inner), bellIn, { ink: false });
      part(stem, merge(dots), freckle, { ink: false });
      part(stem, merge(buds), bud, { ink: false });
      spires.push(stem);
    }
    // the rosette: broad, soft, a little furry-grey at the edges
    for (let i = 0; i < 7; i++) leaf(g, 0.15 + (i % 2) * 0.03, (i / 7) * Math.PI * 2 + 0.2, 0.25 + (i % 3) * 0.12, i % 2 ? '#4f8a3c' : '#62a04c');
    return {
      glow: '#d49cff', top: 0.62,
      update(dt, t) { for (const [i, s] of spires.entries()) s.rotation.z += Math.sin(t * 1.7 + i * 2) * 0.0015; },
    };
  },

  // Ember-star lily: one tall bloom and one smaller, each a star of six petals that curl back like a spider lily,
  // glowing ember-orange at the heart and red at the tips, with long stamens tipped in gold sparks. It "holds the
  // day's warmth long after dark", so it flickers like a banked fire.
  ember_star_lily(g) {
    const petal = toonMap(null, { color: '#ff4a1e', emissive: new THREE.Color('#ff3000'), emissiveIntensity: 0.6, side: THREE.DoubleSide }); // its own, to flicker
    const heart = new THREE.MeshBasicMaterial({ color: '#ffd27a' });
    const filament = toon('#ff7a3a', { emissive: new THREE.Color('#c83000'), emissiveIntensity: 0.6 });
    const spark = new THREE.MeshBasicMaterial({ color: '#ffe58a' });
    const glows = [];
    for (const [x, z, h, size, tilt] of [[0, 0, 0.42, 1, 0.1], [0.07, -0.05, 0.3, 0.75, -0.3]]) {
      const stem = joint(g, [x, 0, z]);
      stem.rotation.set(tilt * 0.5, 0, tilt);
      part(stem, taperedTube([[0, 0, 0], [0.01, h * 0.5, 0], [0, h, 0.01]], 0.008, 0.005, 6, 4), toon('#4f7a3c'), { ink: false });
      const head = joint(stem, [0, h, 0.01]);
      head.rotation.x = 0.45; // the star turned up and out, to whoever comes down the path
      // six petals: flat blades arching out and back, each a narrow star point
      const petals = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (i % 2) * 0.12;
        const L = 0.13 * size;
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.quadraticCurveTo(L * 0.35, L * 0.3, L, 0);
        s.quadraticCurveTo(L * 0.35, -L * 0.3, 0, 0);
        const geo = new THREE.ShapeGeometry(s, 5);
        // bend it: up and out, then the tip curls back down
        const p = geo.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const u = p.getX(v) / L;
          p.setZ(v, Math.sin(u * Math.PI * 0.9) * L * 0.35 - u * u * L * 0.25);
        }
        geo.computeVertexNormals();
        geo.rotateX(-Math.PI / 2).rotateY(-a);
        petals.push(geo);
      }
      part(head, merge(petals), petal, { ink: true });
      part(head, sphere(0.016 * size, 7, 5), heart, { pos: [0, 0.01, 0], ink: false });
      // the stamens: long curved filaments with a gold spark on each
      const threads = [], tips = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3, R = 0.09 * size;
        const end = [Math.cos(a) * R, 0.07 * size, Math.sin(a) * R];
        threads.push(taperedTube([[0, 0.01, 0], [Math.cos(a) * R * 0.45, 0.07 * size, Math.sin(a) * R * 0.45], end], 0.0025, 0.0018, 6, 3));
        tips.push(new THREE.SphereGeometry(0.007 * size, 5, 4).translate(...end));
      }
      part(head, merge(threads), filament, { ink: false });
      part(head, merge(tips), spark, { ink: false });
      const ember = glowSprite('#ff8a3a', 0.28 * size, 0.6);
      ember.position.y = 0.02;
      head.add(ember);
      glows.push(ember);
    }
    // strap leaves at the foot
    for (let i = 0; i < 5; i++) leaf(g, 0.16, (i / 5) * Math.PI * 2 + 0.5, 0.7 + (i % 2) * 0.3, i % 2 ? LEAF_DARK : '#4f8a3c');
    return {
      glow: '#ff9a4a', top: 0.56,
      update(dt, t) {
        const f = 0.45 + Math.sin(t * 5.3) * 0.08 + Math.sin(t * 8.9 + 1) * 0.06;
        petal.emissiveIntensity = f + 0.1;
        for (const e of glows) e.material.opacity = f + 0.1;
      },
    };
  },

  // Wisp-sprout: pale fiddleheads, three uncurling and two still tight, each curl holding a soft green-white light,
  // and little wisp motes that drift up off them and fade. "One uncurls wherever a will-o'-wisp stops to rest."
  wisp_sprout(g) {
    const pale = toon('#cfe8c0', { emissive: new THREE.Color('#5a8a4a'), emissiveIntensity: 0.55 });
    const bulb = new THREE.MeshBasicMaterial({ color: '#dcffc8' });
    const curls = [], lights = [];
    for (const [x, z, h, r, turn, open] of [[0, 0, 0.3, 0.06, 0, 1], [0.07, 0.03, 0.24, 0.05, 2.2, 0.8], [-0.06, 0.04, 0.26, 0.052, 4.1, 0.9], [0.02, -0.07, 0.17, 0.036, 1.2, 0.5], [-0.04, -0.05, 0.14, 0.03, 3.3, 0.4]]) {
      const j = joint(g, [x, 0, z]);
      j.rotation.y = turn;
      // up the stem, over the top and round into a spiral that closes in on itself
      const pts = [[0, 0, 0], [0.01, h * 0.45, 0], [0.012, h * 0.85, 0]];
      for (let i = 0; i <= 10; i++) {
        const a = i * 0.62 * (0.7 + open * 0.3), rr = r * (1 - i / 13);
        pts.push([0.012 + Math.sin(a) * rr, h * 0.85 + r - Math.cos(a) * rr + r * 0.05, 0]);
      }
      pts[pts.length - 1][0] += 0.002;
      part(j, taperedTube(pts, 0.013, 0.006, 24, 5), pale, { ink: true });
      const c = part(j, sphere(r * 0.42, 8, 6), bulb, { pos: [0.012 + r * 0.25, h * 0.85 + r * 0.95, 0], ink: false });
      const l = glowSprite('#b8ffa0', r * 5, 0.5);
      l.position.copy(c.position);
      j.add(l);
      lights.push(l);
      curls.push(j);
    }
    // two soft leaves at the foot, grey-green and furred
    for (let i = 0; i < 4; i++) leaf(g, 0.12, (i / 4) * Math.PI * 2 + 0.7, 0.5, i % 2 ? '#6f9a5c' : '#8ab07a');
    // the motes: small wisp-lights that rise from the curls, drift and fade, one after another
    const motes = Array.from({ length: 4 }, (_, i) => {
      const m = glowSprite('#c8ffb0', 0.07, 0);
      g.add(m);
      return { m, age: i / 4, x: 0, z: 0, spin: Math.random() * 6 };
    });
    return {
      glow: '#c8ffb0', top: 0.46,
      update(dt, t) {
        for (const [i, l] of lights.entries()) l.material.opacity = 0.4 + Math.sin(t * 2.4 + i * 1.7) * 0.15;
        for (const [i, c] of curls.entries()) c.rotation.z = Math.sin(t * 1.1 + i) * 0.04;
        for (const p of motes) {
          p.age += dt / 2.6;
          if (p.age >= 1) { p.age -= 1; p.spin = Math.random() * 6; }
          const a = p.age, r = 0.05 + a * 0.08;
          p.m.position.set(Math.cos(p.spin + a * 3) * r, 0.2 + a * 0.4, Math.sin(p.spin + a * 3) * r);
          p.m.material.opacity = Math.sin(a * Math.PI) * 0.9;
          p.m.scale.setScalar(0.05 + Math.sin(a * Math.PI) * 0.05);
        }
      },
    };
  },
};

// A feathery frond: a leaf with deep notches down both sides, lying along +x
function frond(len) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  const n = 4;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * len, w = len * 0.2 * Math.sin((i / n) * Math.PI * 0.9 + 0.2);
    s.lineTo(x - len / n / 2, w);
    s.lineTo(x - len / n / 4, w * 0.35);
  }
  s.lineTo(len, 0);
  for (let i = n; i >= 1; i--) {
    const x = (i / n) * len, w = len * 0.2 * Math.sin((i / n) * Math.PI * 0.9 + 0.2);
    s.lineTo(x - len / n / 4, -w * 0.35);
    s.lineTo(x - len / n / 2, -w);
  }
  s.lineTo(0, 0);
  return s;
}

// glow: how wide the soft glow round it is (m, before the field scales the plant up). Smaller for herbs that grow
// in pots she can stand right behind, so the glow doesn't wash over her.
export function createHerb(kind, { glow: glowSize = 0.9 } = {}) {
  const root = new THREE.Group();
  root.name = `herb-${kind}`;
  const plant = joint(root, [0, 0, 0]);
  const made = (MAKERS[kind] ?? MAKERS.moonpetal)(plant);
  const { glow: glowColor, top = 0.46, update: own } = typeof made === 'string' ? { glow: made } : made;
  const glow = glowSprite(glowColor, glowSize, 0.45);
  glow.position.y = 0.1;
  root.add(glow);
  // The twinkle: a small four-point star that turns and pulses above the plant
  const twinkle = glowSprite('#ffffff', 0.16, 0.9);
  twinkle.position.y = top + 0.02;
  root.add(twinkle);
  onLayer(root);
  let t = Math.random() * 10;
  return {
    root,
    update(dt) {
      t += dt;
      plant.rotation.z = Math.sin(t * 1.3) * 0.05;
      plant.rotation.x = Math.cos(t * 1.1) * 0.04;
      glow.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.1;
      const tw = Math.max(0, Math.sin(t * 2.6));
      twinkle.material.opacity = 0.35 + tw * 0.65;
      twinkle.scale.setScalar(0.12 + tw * 0.18);
      twinkle.position.y = top + Math.sin(t * 1.4) * 0.03;
      own?.(dt, t);
    },
  };
}
