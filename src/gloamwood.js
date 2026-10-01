import * as THREE from 'three';
import path from '../scenes/lantern-path.json';
import bridge from '../scenes/sable-bridge.json';
import { gloamwoodImages, silasPortraits as SP } from './assets-gloamwood.js';
import { bootTown } from './town.js';
import { LAYER_GLOW } from './stage.js';
import { HERBS } from './data/herbs.js';
import { createSilas, createWaysideKettle, createCrock, createBench } from './actors/silas.js';
import { createMandrake, createGlowcap, createSourWisp, createLampMoth } from './actors/foes.js';
import { glowSprite, turnToward } from './actors/kit.js';

// The Gloamwood, Wickhollow's wild places (docs/SLICE.md screen 5, the lantern path). Witch Way's own painting of the
// path: she comes down from the square at the top, past the waterfall, over the footbridge (where B1's Hollowed
// Mandrake and Glowcap stand in the way) and along to Silas's junction: his dark lamp post, his wayside kettle, crock
// and bench, and his garden that grows out of season. She starts with one Lantern Oil in her basket; given to Silas,
// it relights his pole, and the five lanterns light one by one down the path. He gives her the Owl charm and a flame
// for the skiff's bow, and tells her the moths gather in the Hollow; then the path on to the Sable bridge opens.
//
// What this page adds to the town engine, in this module (see "Engine extras" below): things she carries besides
// herbs (Lantern Oil, the Owl charm, the bow-lamp flame), a camera that can be led away from her for a moment (the
// flame running from lamp to lamp), painted lamps that start dark and light up (the painting itself is repainted),
// and an encounter card.

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// Everything that has happened tonight in the Gloamwood; it carries over from screen to screen.
const night = {
  foesMet: false,    // B1's card has been shown
  foesAside: false,  // and they've stepped off the path
  metSilas: false,
  relit: false,      // the lanterns are lit
  thanked: false,    // Silas has given her the Owl charm and the bow-lamp flame, and told her about the Hollow
  moonwater: false,  // the crock's three are drawn
  rested: 0,
  wispsMet: false,   // B2's card has been shown on the Sable bridge
  wispsAway: false,  // and the wisps have drifted off into the trees
};

// ---------------------------------------------------------------- engine extras

// Things she carries that aren't herbs, with little painted icons (field.js knows only moonwater).
const svg = (body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" shape-rendering="crispEdges">${body}</svg>`)}`;
const ITEMS = {
  moonwater: {
    name: 'Moonwater',
    icon: svg('<path fill="#2a1a33" d="M5 1h4v2H8v1h2v1h1v7H3V5h1V4h2V3H5z"/><path fill="#c9b27a" d="M6 2h2v1H6z"/><path fill="#dfe8ff" d="M4 6h6v5H4z"/><path fill="#8fb4ff" d="M4 8h6v3H4z"/><path fill="#fff" d="M5 6h1v2H5z"/>'),
  },
  'lantern-oil': {
    name: 'Lantern Oil',
    icon: svg('<path fill="#2a1a33" d="M5 1h4v3h1v1h1v8H3V5h1V4h1z"/><path fill="#8a5a3a" d="M6 2h2v2H6z"/><path fill="#e8d8ff" d="M4 6h6v6H4z"/><path fill="#b27ae8" d="M4 8h6v4H4z"/><path fill="#ffd27a" d="M6 9h2v2H6z"/><path fill="#fff" d="M5 6h1v2H5z"/>'),
  },
  'owl-charm': {
    name: 'Owl charm',
    icon: svg('<path fill="#2a1a33" d="M3 2h2v1h4V2h2v2h1v6h-1v2H3v-2H2V4h1z"/><path fill="#b08a5a" d="M4 4h6v7H4z"/><path fill="#f2e2b0" d="M4 5h2v2H4zM8 5h2v2H8z"/><path fill="#2a1a33" d="M5 6h1v1H5zM8 6h1v1H8z"/><path fill="#e2a040" d="M6 7h2v1H6z"/><path fill="#d8c090" d="M5 9h4v1H5z"/>'),
  },
  'bow-flame': {
    name: "Silas's flame",
    icon: svg('<path fill="#2a1a33" d="M5 1h4v1h1v1h1v9H3V3h1V2h1z"/><path fill="#c8a040" d="M4 3h6v1H4zM4 11h6v1H4z"/><path fill="#3a2a40" d="M4 4h6v7H4z"/><path fill="#ff9a3a" d="M6 5h2v5H6z"/><path fill="#fff2b0" d="M6 7h2v3H6z"/>'),
  },
};

// Once per page: the basket learns the new things, and the camera can be led away from her.
function extendEngine(field) {
  if (field.gloamwood) return;
  field.gloamwood = true;
  field.showBasket = function showBasket(fresh) {
    $('basket').hidden = false;
    const row = (key, n, icon, name) => {
      const li = document.createElement('li');
      if (key === fresh) li.className = 'fresh';
      const img = document.createElement('img');
      img.src = icon;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = `${name} ×${n}`;
      li.append(img, label);
      return li;
    };
    $('basket-list').replaceChildren(
      ...Object.entries(this.basket).map(([key, n]) => row(key, n, HERBS[key].icon, HERBS[key].name)),
      ...Object.entries(this.items).filter(([, n]) => n > 0).map(([key, n]) => row(key, n, ITEMS[key]?.icon ?? '', ITEMS[key]?.name ?? key)),
    );
    const total = Object.values(this.basket).reduce((a, b) => a + b, 0);
    $('basket-count').textContent = `${total} of ${this.herbTotal}`;
  };
  // The town points the camera at her every frame; while `camera.at` is set (a painting pixel), it looks there instead.
  const stage = field.stage;
  const setFocus = stage.setFocus.bind(stage);
  stage.setFocus = (pixel, instant) => setFocus(camera.at ?? pixel, instant);
}
const camera = { at: null };

// ---------------------------------------------------------------- the painted lanterns
// The painting has its five lanterns lit. While they're out, their glass is painted dark and the warm light they
// throw on the path is cooled; relighting one paints the painting's own pixels back in, round it, and adds a warm
// glow and a light she picks up as she walks past.
const paintings = new WeakMap();
function darkPainting(texture, lanterns) {
  if (paintings.has(texture)) return paintings.get(texture);
  const img = texture.image;
  const W = img.width, H = img.height;
  const lit = document.createElement('canvas');
  lit.width = W; lit.height = H;
  lit.getContext('2d').drawImage(img, 0, 0);
  const dark = document.createElement('canvas');
  dark.width = W; dark.height = H;
  const dg = dark.getContext('2d', { willReadFrequently: true });
  dg.drawImage(img, 0, 0);
  for (const L of lanterns) {
    const [cx, cy] = L.pixel, R = L.halo;
    const x0 = Math.max(0, cx - R), y0 = Math.max(0, cy - R), x1 = Math.min(W, cx + R), y1 = Math.min(H, cy + R);
    const data = dg.getImageData(x0, y0, x1 - x0, y1 - y0);
    const d = data.data, w = x1 - x0;
    const [gx0, gy0, gx1, gy1] = L.glass;
    const ex = (gx0 + gx1) / 2, ey = (gy0 + gy1) / 2, rx = (gx1 - gx0) / 2, ry = (gy1 - gy0) / 2;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    for (let i = 0; i < d.length; i += 4) {
      const x = x0 + ((i / 4) % w), y = y0 + Math.floor(i / 4 / w);
      const o0 = d[i], o1 = d[i + 1], o2 = d[i + 2];
      let r = o0, g = o1, b = o2;
      // the warm light round it, cooled
      const f = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / R) ** 1.5;
      const k = f * clamp((r - b) / 60);
      r *= 1 - 0.42 * k; g *= 1 - 0.34 * k; b *= 1 - 0.08 * k;
      // the glass and the flame (bright, warm pixels in an oval over the glass) go dark slate; the brass stays
      const e = 1.25 - Math.hypot((x - ex) / rx, (y - ey) / ry);
      if (e > 0) {
        const lum = (o0 + o1 + o2) / 3;
        const hot = Math.max(clamp((lum - 70) / 50) * clamp((o0 - o2 - 30) / 40), clamp((lum - 170) / 40)) * Math.min(1, e * 2.5);
        r += (o0 * 0.1 + 24 - r) * hot; g += (o1 * 0.1 + 22 - g) * hot; b += (o2 * 0.12 + 40 - b) * hot;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    dg.putImageData(data, x0, y0);
  }
  // What's shown: the dark painting, with each lantern's circle of the lit one painted back over it as it lights
  const shown = document.createElement('canvas');
  shown.width = W; shown.height = H;
  const sg = shown.getContext('2d');
  const patches = lanterns.map((L) => {
    const R = L.halo, c = document.createElement('canvas');
    c.width = c.height = R * 2;
    const g = c.getContext('2d');
    g.drawImage(lit, L.pixel[0] - R, L.pixel[1] - R, R * 2, R * 2, 0, 0, R * 2, R * 2);
    g.globalCompositeOperation = 'destination-in';
    const grad = g.createRadialGradient(R, R, R * 0.8, R, R, R);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, R * 2, R * 2);
    return { c, x: L.pixel[0] - R, y: L.pixel[1] - R };
  });
  const amount = lanterns.map(() => 0);
  // While a lantern lights, only the square round it is sent to the GPU again (the whole painting is a big upload)
  const region = document.createElement('canvas');
  const regionTex = new THREE.Texture(region);
  const P = {
    amount,
    uploaded: false,
    // which: the lanterns whose squares changed (or none, to send the whole painting)
    redraw(renderer = null, which = null) {
      sg.globalAlpha = 1;
      sg.drawImage(dark, 0, 0);
      for (const [i, p] of patches.entries()) {
        if (amount[i] <= 0) continue;
        sg.globalAlpha = Math.min(1, amount[i]);
        sg.drawImage(p.c, p.x, p.y);
      }
      sg.globalAlpha = 1;
      if (!renderer || !which || !P.uploaded) {
        texture.image = shown;
        texture.needsUpdate = true;
        return;
      }
      for (const i of which) {
        const p = patches[i];
        const x0 = Math.max(0, Math.floor(p.x)), y0 = Math.max(0, Math.floor(p.y));
        const x1 = Math.min(W, Math.ceil(p.x + p.c.width)), y1 = Math.min(H, Math.ceil(p.y + p.c.height));
        region.width = x1 - x0;
        region.height = y1 - y0;
        region.getContext('2d').drawImage(shown, x0, y0, region.width, region.height, 0, 0, region.width, region.height);
        try {
          // the painting is flipped on upload, so its rows count up from the bottom
          renderer.copyTextureToTexture(regionTex, texture, null, new THREE.Vector2(x0, H - y1));
        } catch {
          texture.image = shown;
          texture.needsUpdate = true;
          return;
        }
      }
    },
  };
  P.redraw();
  paintings.set(texture, P);
  return P;
}

// The lanterns on a screen: the repainted painting, a warm glow and a light at each, and relight(i).
function buildLanterns(field, list, isLit) {
  const { paint, stage } = field;
  const P = darkPainting(stage.painting, list);
  const lamps = list.map((L, i) => {
    const base = paint.toWorld(...L.base);
    const toCam = new THREE.Vector3(paint.camera.position.x - base.x, 0, paint.camera.position.z - base.z).normalize();
    const at = paint.toPlane(...L.pixel, new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, base));
    const glow = glowSprite('#ffb85e', 1.2, 0, LAYER_GLOW);
    glow.material.depthTest = false;
    glow.position.copy(at);
    const light = new THREE.PointLight('#ffae5a', 0, 6.5, 2);
    light.position.copy(at);
    field.group.add(glow, light);
    const on = isLit(i);
    if (on && P.amount[i] < 1) P.amount[i] = 1;
    return { at, glow, light, k: on ? 1 : 0, target: on ? 1 : 0, flare: 0, seed: Math.random() * 10 };
  });
  if (lamps.some((l) => l.k)) P.redraw();
  let redrawWait = 0;
  const pending = new Set();
  return {
    lamps,
    relight(i) {
      lamps[i].target = 1;
      lamps[i].flare = 1;
    },
    update(dt, t) {
      // (by the second frame the painting has been drawn once, so it's on the GPU)
      if (P.frames === undefined) P.frames = 0;
      else if (++P.frames > 1) P.uploaded = true;
      for (const [i, l] of lamps.entries()) {
        if (l.k < l.target) { l.k = Math.min(l.target, l.k + dt / 0.7); pending.add(i); }
        l.flare = Math.max(0, l.flare - dt * 1.4);
        const f = 1 + Math.sin(t * 7.3 + l.seed) * 0.05 + Math.sin(t * 13.1 + l.seed * 2) * 0.04;
        l.glow.material.opacity = (0.36 * l.k + l.flare * 0.5) * f;
        l.glow.scale.setScalar(1.2 + l.flare * 1.4);
        l.light.intensity = (7 * l.k + l.flare * 8) * f;
        if (P.amount[i] !== l.k) P.amount[i] = l.k;
      }
      // Repaint the painting round them as they light, a few times a second, and once more when they're done
      redrawWait -= dt;
      if (pending.size && redrawWait <= 0) { P.redraw(stage.renderer, [...pending]); pending.clear(); redrawWait = 0.15; }
    },
  };
}

// ---------------------------------------------------------------- the encounter card
function showEncounter({ tag, title, text, foes, note, battle }) {
  return new Promise((resolve) => {
    const card = $('encounter');
    $('enc-tag').textContent = tag;
    $('enc-title').textContent = title;
    $('enc-text').textContent = text;
    $('enc-foes').replaceChildren(...foes.map((f) => Object.assign(document.createElement('li'), { textContent: f })));
    $('enc-note').textContent = note;
    $('enc-battle').href = `hollow-battle.html#${battle}`;
    card.hidden = false;
    const go = $('enc-go');
    setTimeout(() => go.focus({ preventScroll: true }), 50);
    const close = () => {
      card.hidden = true;
      go.removeEventListener('click', close);
      removeEventListener('keydown', key, true);
      resolve();
    };
    const key = (e) => {
      if (!['Space', 'Enter', 'KeyE', 'NumpadEnter', 'Escape'].includes(e.code) || e.target.closest?.('a, button')) return;
      e.preventDefault();
      e.stopPropagation(); // not on to the field, which would take it as "talk"
      close();
    };
    go.addEventListener('click', close);
    addEventListener('keydown', key, true);
  });
}

// A foe stepping off the path: a little hop and a turn, to a new spot, then it settles
function stepAside(foe, to, dur = 1.6) {
  const from = foe.root.position.clone();
  let t = 0;
  foe.stepping = (dt) => {
    t = Math.min(1, t + dt / dur);
    const e = t * t * (3 - 2 * t);
    foe.root.position.lerpVectors(from, to, e);
    foe.root.position.y = from.y + (to.y - from.y) * e + Math.abs(Math.sin(t * Math.PI * 5)) * 0.06 * (1 - t);
    foe.root.rotation.y = turnToward(foe.root.rotation.y, t < 0.8 ? headingTo(from, to) : foe.rest, 8, dt);
    if (t >= 1) foe.stepping = null;
  };
}

// ---------------------------------------------------------------- the lantern path
const PATH_HERBS = path.herbs.length + path.garden.length;

const PATH = {
  music: 'travel', // Thareia's "Over the Wilds": out of town and into the wood
  ambience: [
    { sfx: 'river', first: 1.5, gap: 7, spread: 5 },
    { sfx: 'crickets', first: 4, gap: 7, spread: 6 },
    { sfx: 'owl', first: 14, gap: 26, spread: 30 },
  ],
  herbTotal: PATH_HERBS,
  enter(field) {
    extendEngine(field);
    const { paint, scene, player, walk } = field;
    const S = scene.spots;
    const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
    const top = (base, topY) => at(base).setY(paint.heightAbove(base, topY));
    const P = (field.path = {});

    // The lanterns, dark until he relights
    P.lanterns = buildLanterns(field, scene.lanterns, () => night.relit);

    // Silas, by his post, facing up the path toward whoever comes down it
    const silas = createSilas();
    const home = at(S.silas);
    silas.rest = headingTo(home, at([560, 1000])); // watching the path, and the camera can see his face
    field.addPerson(silas, home, silas.rest);
    silas.setLit(night.relit);
    silas.setMood(night.relit ? 'happy' : 'calm');
    P.silas = silas;

    // His wayside kettle, the moonwater crock and his bench, all standing in her way like furniture
    const props = [
      ['kettle', createWaysideKettle(), 0.3],
      ['crock', createCrock(), -0.4],
      ['bench', createBench(), 0.35],
    ].map(([id, prop, turn]) => {
      const pos = at(S[id]);
      prop.root.position.copy(pos);
      prop.root.rotation.y = turn;
      field.group.add(prop.root);
      walk.obstacles.push({ x: pos.x, z: pos.z, r: prop.radius });
      return [id, prop];
    });
    P.props = Object.fromEntries(props);
    P.props.crock.setFull(!night.moonwater);

    // B1: the Hollowed Mandrake and the Glowcap, on the path above the footbridge (or already off it, grumbling)
    const foes = [
      ['mandrake', createMandrake({ hollowed: true })],
      ['glowcap', createGlowcap()],
    ].map(([id, foe]) => {
      const pos = at(night.foesAside ? S[`${id} aside`] : S[id]);
      foe.root.position.copy(pos);
      foe.rest = headingTo(pos, at(night.foesAside ? S.footbridge : [1150, 380]));
      foe.root.rotation.y = foe.rest;
      field.group.add(foe.root);
      foe.obstacle = { x: pos.x, z: pos.z, r: foe.radius + 0.05, off: night.foesAside };
      walk.obstacles.push(foe.obstacle);
      foe.id = id;
      if (night.foesAside && id === 'mandrake') foe.play('ko');
      return foe;
    });
    P.foes = foes;

    // Inkblot, hopping about the path; he flies up to the lamp posts, the stumps and the footbridge posts
    const crow = field.addCrow(at(S.inkblot), {
      ground: [[1150, 330], [1120, 250], [1180, 420], [1090, 520], [880, 660], [600, 700], [380, 730], [260, 640]].map((p) => at(p)),
      high: [top([185, 872], 656), top([1272, 230], 124), top([1080, 280], 230), top([280, 518], 462), top([706, 676], 628), top([860, 630], 586)],
    });

    field.things.push(
      {
        id: 'silas', name: 'Silas', actor: silas, pos: silas.root.position, voice: 0,
        portrait: (L) => (night.relit ? SP.happy : SP.calm),
        get lines() { return { first: silasLines(field) }; },
        onTalk: () => { night.metSilas = true; },
        onLine: (text, f) => { if (!f.talking?.lines[f.talking.index]?.who) silas.play('talk'); },
        onEnd: (f) => { silas.setMood(night.relit ? 'happy' : 'calm'); if (P.after) { const next = P.after; P.after = null; next(f); } },
      },
      { id: 'inkblot', name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, get lines() { return LINES.inkblot(); } },
      { id: 'kettle', name: null, pos: P.props.kettle.root.position, reach: 0.55, lift: 0.7, brew: 'wayside', lines: LINES.kettle, sound: 'campfire' },
      { id: 'crock', name: null, pos: P.props.crock.root.position, reach: 0.35, lift: 0.5, get lines() { return LINES.crock(); }, sound: 'well-bucket' },
      { id: 'bench', name: null, pos: P.props.bench.root.position, reach: 0.45, lift: 0.5, get lines() { return LINES.bench(); }, sound: 'ui-page' },
      { id: 'waterfall', name: null, pos: at(S.waterfall), reach: 0.9, lift: 0.3, lines: LINES.waterfall, sound: 'waterfall' },
      { id: 'garden', name: null, pos: at(S.garden), reach: 0.6, lift: 0.2, lines: LINES.garden, sound: 'leaves' },
      ...foes.map((foe) => ({
        id: foe.id, name: null, pos: foe.root.position, reach: 0.4, lift: 0.4,
        get lines() { return night.foesAside ? LINES[foe.id] : { first: ['They won\'t budge while I stand here glaring.'] }; },
      })),
    );
    // Herbs: witch's bells, ember-star lilies and silver mugwort along the path; Silas's garden by his post
    field.plantHerbs(scene.herbs, 1.6);
    field.plantHerbs(scene.garden, 1.6);

  },

  update(field, dt, time) {
    const P = field.path, player = field.player;
    // The way on to the Sable bridge opens once Silas has told her where the moths go (the field makes its exits
    // after enter(), so this waits for the first frame)
    if (!P.bridgeExit) {
      P.bridgeExit = field.exits.find((e) => e.name === 'the Sable bridge');
      P.bridgeTo = P.bridgeExit.to;
      if (!night.thanked) P.bridgeExit.to = undefined;
    }
    P.lanterns.update(dt, time);
    // Silas turns to whoever talks to him, and back to watching the path
    const s = P.silas;
    const before = s.root.rotation.y;
    s.update(dt, 0, s.turn ?? 0);
    const turn = Math.atan2(Math.sin(s.root.rotation.y - before), Math.cos(s.root.rotation.y - before)) / Math.max(dt, 1e-3);
    s.turn = turn;
    for (const prop of Object.values(P.props)) prop.update(dt);
    for (const foe of P.foes) {
      foe.stepping?.(dt);
      foe.update(dt);
      foe.obstacle.x = foe.root.position.x;
      foe.obstacle.z = foe.root.position.z;
      // until they've met her, they watch her come
      if (!night.foesMet && !field.locked) foe.root.rotation.y = turnToward(foe.root.rotation.y, headingTo(foe.root.position, player.pos), 3, dt);
    }

    // B1: walking up to them shows the card, and then they let her pass
    if (!night.foesMet && !field.locked && !field.talking && P.foes.some((f) => f.root.position.distanceTo(player.pos) < 2.4)) meetFoes(field);

    // The flame running from lamp to lamp
    P.run?.(dt);
  },

  labels(field) {
    const card = (name) => {
      const c = field.stage.cutouts.cards.find((k) => k.name === name);
      const box = new THREE.Box3().setFromObject(c.mesh);
      return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
    };
    return { floor: field.paint.toWorld(1150, 420), post: card("Silas's lamp post, by the junction"), rail: card('footbridge, near rail') };
  },
};

async function meetFoes(field) {
  const P = field.path, player = field.player;
  night.foesMet = true;
  field.locked = true;
  player.path = null;
  player.onArrive = null;
  field.keys?.clear?.();
  field.audio.sfx('alert');
  for (const foe of P.foes) foe.root.rotation.y = headingTo(foe.root.position, player.pos);
  player.heading = headingTo(player.pos, P.foes[0].root.position);
  P.foes[0].play('cast'); // the mandrake's scream; nobody's hat comes off, this time
  P.foes[1].play('glow');
  await sleep(900);
  await showEncounter({
    tag: 'B1', title: 'The Lantern Path',
    text: 'A Hollowed Mandrake and a Glowcap block the path.',
    foes: ['Hollowed Mandrake: grey leaves, the face of a cross turnip', 'Glowcap: walking toward the wrong light'],
    note: 'The fight itself is in the battle demo. For now, they let her by.',
    battle: 'B1',
  });
  // They step aside, grumbling
  night.foesAside = true;
  const S = field.scene.spots;
  const [mandrake, glowcap] = P.foes;
  for (const foe of P.foes) foe.obstacle.off = true;
  stepAside(mandrake, field.paint.toWorld(...S['mandrake aside']));
  stepAside(glowcap, field.paint.toWorld(...S['glowcap aside']), 2);
  mandrake.rest = headingTo(field.paint.toWorld(...S['mandrake aside']), field.paint.toWorld(...S.footbridge));
  glowcap.rest = headingTo(field.paint.toWorld(...S['glowcap aside']), field.paint.toWorld(...S.footbridge));
  field.audio.sfx('leaves');
  field.toast('The mandrake stomps off the path, grumbling. The glowcap toddles after it.', 'leaves');
  field.locked = false;
  await sleep(1700);
  mandrake.play('ko'); // it sulks
}

// ---------------------------------------------------------------- the relighting
// The pole flares; one flame runs from it all the way up the path to the lamp by the square, then lights every lantern
// on its way back down to Silas's own. The camera goes with it, and comes back to her.
function relight(field) {
  const P = field.path, player = field.player, silas = P.silas;
  field.locked = true;
  player.path = null;
  const order = [0, 1, 2, 3, 4]; // the scene lists them from the top of the path down
  const lamps = P.lanterns.lamps;
  const mote = glowSprite('#ffd08a', 0.55, 0.95, LAYER_GLOW);
  mote.material.depthTest = false;
  const core = glowSprite('#fff4d6', 0.2, 1, LAYER_GLOW);
  core.material.depthTest = false;
  mote.add(core);
  const trail = Array.from({ length: 6 }, () => {
    const s = glowSprite('#ffb45a', 0.25, 0, LAYER_GLOW);
    s.material.depthTest = false;
    field.group.add(s);
    return s;
  });
  field.group.add(mote);
  const from = silas.tip();
  mote.position.copy(from);
  const legs = [];
  let prev = from;
  for (const i of order) {
    const to = lamps[i].at;
    legs.push({ from: prev, to, dur: Math.min(1.7, 0.45 + prev.distanceTo(to) * 0.075), lamp: i });
    prev = to;
  }
  let leg = 0, t = 0, pause = 0.5, clock = 0;
  const history = [];
  return new Promise((resolve) => {
    P.run = (dt) => {
      clock += dt;
      if (pause > 0) { pause -= dt; camera.at = field.paint.toPixel(mote.position); return; }
      const L = legs[leg];
      if (!L) {
        // back to her
        mote.material.opacity = Math.max(0, mote.material.opacity - dt * 2);
        core.material.opacity = mote.material.opacity;
        camera.at = null;
        if (mote.material.opacity <= 0) {
          field.group.remove(mote, ...trail);
          P.run = null;
          resolve();
        }
        return;
      }
      t = Math.min(1, t + dt / L.dur);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      mote.position.lerpVectors(L.from, L.to, e);
      mote.position.y += Math.sin(Math.PI * e) * Math.min(3, L.from.distanceTo(L.to) * 0.18);
      const s = 0.5 + Math.sin(clock * 20) * 0.06;
      mote.scale.setScalar(s);
      history.unshift(mote.position.clone());
      history.length = Math.min(history.length, 18);
      trail.forEach((sp, k) => {
        const h = history[(k + 1) * 3];
        if (!h) { sp.material.opacity = 0; return; }
        sp.position.copy(h);
        sp.material.opacity = 0.45 * (1 - k / trail.length);
        sp.scale.setScalar(0.3 * (1 - k / trail.length) + 0.08);
      });
      camera.at = field.paint.toPixel(mote.position);
      player.heading = turnToward(player.heading, headingTo(player.pos, mote.position), 4, dt);
      if (t >= 1) {
        P.lanterns.relight(L.lamp);
        field.audio.sfx('ember');
        field.audio.sfx('hearthfire');
        leg++;
        t = 0;
        pause = 0.3;
      }
    };
  });
}

// ---------------------------------------------------------------- what Silas says
// His lines are Witch Way's (game/data/dialogue.json, "silas"); the Owl charm, the flame for the skiff's bow ("no wind or
// wisp can blow out") and the moths in the Hollow are docs/LORE.md §6 and docs/SLICE.md screen 5.
function silasLines(field) {
  const P = field.path, silas = P.silas;
  const hasOil = (field.items['lantern-oil'] ?? 0) > 0;
  const say = (text, extra = {}) => ({ say: text, ...extra });
  const witch = (text, face = 'witch-calm', extra = {}) => ({ who: 'witch', say: text, face, ...extra });
  if (night.relit && night.thanked) {
    return [
      say('Every lamp lit, all the way round. Do stop and admire them. I certainly do.', { mood: 'happy' }),
      say('The moths gather in the Hollow. Over the Sable bridge, and through the twisted grove. Mind the wisps.', { mood: 'calm', do: () => silas.play('point') }),
    ];
  }
  if (night.relit) {
    return [
      say('At last, I can finish my rounds.', { mood: 'happy', do: () => silas.play('tip') }),
      say('Take this Owl charm, with thanks. Your Moonlight will reach farther with it.', {
        mood: 'happy',
        do: (f) => silas.play('give', () => { f.give('owl-charm'); f.toast('The Owl charm. Moonlight reaches farther.', 'reveal-heirloom'); }),
      }),
      witch("One more thing. Quill's skiff wants a lamp at her bow that won't blow out.", 'witch-sly'),
      say("Then take a flame from my pole. For the skiff's bow: no wind or wisp can blow it out.", {
        mood: 'happy',
        do: (f) => silas.play('give', () => { f.give('bow-flame'); f.toast("Silas's flame, for the Magpie's bow.", 'crystal-flare'); }),
      }),
      witch('And the lights that float away down the river. Do you see where they go?', 'witch-calm'),
      say('The moths carry them. Every night they gather in the Hollow, over the Sable bridge and through the twisted grove, and then away downriver.', { mood: 'sad', do: () => silas.play('point') }),
      witch('The Hollow, then. Thank you, Silas.', 'witch-delighted', {
        do: (f) => { night.thanked = true; if (P.bridgeExit) P.bridgeExit.to = P.bridgeTo; f.toast('The way on to the Sable bridge is open.', 'new-area'); },
      }),
    ];
  }
  if (!hasOil) {
    return [
      say('Evening! Mind the pole. Silas, lamplighter. These are my lamps. Fine, aren\'t they?', { mood: 'happy' }),
      say('Lantern Oil, if you could brew some. A flame no wisp can blow out. Imagine it!', { mood: 'sad' }),
    ];
  }
  const oil = [
    witch('I brought you something. Lantern Oil: moonpetal and bogwick.', 'witch-delighted'),
    say('Lantern Oil! Look at that flame. Go on, wisps, puff away. There!', {
      mood: 'surprised',
      do: (f) => {
        f.items['lantern-oil'] -= 1;
        f.showBasket();
        silas.play('relight', () => { silas.setLit(true); f.audio.sfx('crystal-flare'); });
        P.after = async (ff) => {
          await relight(ff);
          night.relit = true;
          ff.player.actor.play('cheer');
          // then he goes on, once she's done cheering
          for (let i = 0; i < 100 && ff.player.actor.busy; i++) await sleep(100);
          ff.locked = false;
          ff.talk(ff.things.find((k) => k.id === 'silas'));
        };
      },
    }),
  ];
  if (night.metSilas) return [say('Is that... do you have...?', { mood: 'surprised' }), ...oil];
  return [
    say('Evening! Mind the pole. Silas, lamplighter. These are my lamps. Fine, aren\'t they?', { mood: 'happy' }),
    say('Only the wisps keep blowing my flame out. I\'ve never once finished my rounds.', { mood: 'sad' }),
    say('Still, they don\'t mean it. I\'ll just start again. I always do.', { mood: 'calm' }),
    ...oil,
  ];
}

// What the witch thinks of things (lines with no name are her own thoughts), and what Inkblot says
const LINES = {
  inkblot: () => ({
    first: night.relit
      ? ['Kraa! [Inkblot puffs up in the lamplight, very pleased, as if he lit them himself.]']
      : ['Kraa. [Inkblot peers up at the dark lanterns, then at your basket.]', 'Kraa. [He has carried a few lights home this week, one flame at a time. He looks tired of it.]'],
  }),
  kettle: {
    first: ["Silas's wayside kettle, simmering over its embers, violet to the brim.", 'I can brew here, with moonwater from the crock beside it. The kettle is anyone\'s who needs it: that\'s what "wayside" means.'],
    again: ['The wayside kettle. I can brew here.'],
  },
  garden: {
    first: ["Silas's garden: lavender, bogwick and wisp-sprout, all in flower at once.", 'It grows out of season. Nobody has ever told it, and I\'m not going to.'],
    again: ['Lavender and bogwick side by side. Wren would have words.'],
  },
  crock: () => (night.moonwater
    ? { first: ["Tonight's moonwater is drawn. The crock fills again at moonrise, with the well."] }
    : {
      first: [
        'The wayside crock, with a gold moon on its belly. It holds moonwater: water that held the moon\'s reflection all night.',
        {
          say: 'Three bottles a night, shared with the well in the square.',
          do: (field) => { night.moonwater = true; field.give('moonwater', 3); field.path.props.crock.setFull(false); field.toast('The wayside crock gives three moonwater.', 'well-bucket'); },
        },
      ],
    }),
  bench: () => ({
    first: [
      night.rested ? 'Silas\'s bench again. My feet vote yes.' : 'The wayside bench, gone green with moss. Somebody sits here a lot, and floats a little above it.',
      { say: 'A moment\'s rest, hat over my eyes...', do: (field) => rest(field) },
    ],
  }),
  waterfall: {
    first: ['The falls come down off the rocks and run under the footbridge, down to the Sable.', 'Silver mugwort likes it here. So do I.'],
    again: ['Still falling. Water is very dedicated.'],
  },
  shrine: {
    first: ['A wayside shrine in the bridge wall, with candles burning in it, and lavender and bundled herbs left at its foot.', 'Somebody comes and lights these every night.'],
    again: ['The candles are still burning. Somebody tends them.'],
  },
  wisps: { first: ['Sour Wisps, grey at the edges and pouting. They won\'t let anyone into the grove.'] },
  wispsGone: { first: ['Up in the twisted trees, three small lights sulk among the branches.'] },
  mandrake: {
    first: ['The Hollowed Mandrake, sulking in the bracken with its arms folded. The rot has gone grey right through its leaves.', 'I\'d say sorry, but it isn\'t listening yet.'],
    again: ['Still sulking. Mandrakes can keep it up for a week.'],
  },
  glowcap: {
    first: ['The glowcap has sat itself down by the path, gazing up the hill. It walks toward any light it can see.', 'You\'re not wicked. You\'re walking toward the wrong light.'],
    again: ['It sways a little, dreaming of lamps.'],
  },
};

// Rest on the bench: she sits down in front of it with her hat over her eyes, and the night is saved.
async function rest(field) {
  const P = field.path, player = field.player;
  night.rested++;
  field.locked = true;
  const bench = P.props.bench.root;
  const front = new THREE.Vector3(0, 0, 0.42).applyAxisAngle(new THREE.Vector3(0, 1, 0), bench.rotation.y).add(bench.position);
  if (field.walk.canStand(front.x, front.z, 0.1, player.obstacle)) player.pos.set(front.x, player.pos.y, front.z);
  player.heading = bench.rotation.y;
  player.actor.play('ko');
  try {
    localStorage.setItem('witch-way:gloamwood', JSON.stringify({ at: 'lantern-path:bench', night, basket: field.basket, items: field.items, picked: [...field.picked], when: Date.now() }));
  } catch { /* no storage: the rest still does her good */ }
  await sleep(1800);
  field.audio.sfx('ui-save');
  field.toast('Rested on the wayside bench. The night is saved.', 'ui-save');
  await sleep(900);
  player.actor.play('rise');
  await sleep(800);
  field.locked = false;
}

// ---------------------------------------------------------------- the Sable bridge
// The stone bridge on the way to the Hollow (docs/SLICE.md screen 6): lamp-moths carry stolen lights away under the
// arches, and Sour Wisps crowd the twisted grove at the far end (B2). Wisp-Calm would let her by; here the card says
// so, and the wisps drift off, shy. The far end leads on to the Hollow.
const BRIDGE = {
  music: 'travel',
  ambience: [
    { sfx: 'river', first: 1, gap: 5, spread: 4 },
    { sfx: 'crickets', first: 5, gap: 8, spread: 6 },
    { sfx: 'owl', first: 18, gap: 28, spread: 30 },
    { sfx: 'wisp', first: 6, gap: 12, spread: 8 },
  ],
  herbTotal: PATH_HERBS,
  enter(field) {
    extendEngine(field);
    const { paint, scene, walk } = field;
    const S = scene.spots;
    const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
    const B = (field.bridge = {});

    // The Sour Wisps, crowding the end of the bridge where the twisted grove begins (or gone up into its branches)
    B.wisps = S.wisps.map((spot, i) => {
      const wisp = createSourWisp();
      const pos = at(night.wispsAway ? S['wisps away'][i] : spot);
      if (night.wispsAway) pos.y = 2.4;
      wisp.root.position.copy(pos);
      wisp.rest = headingTo(pos, at([900, 520]));
      wisp.root.rotation.y = wisp.rest;
      wisp.root.scale.setScalar(1.6); // big enough to read at the far end of the bridge
      field.group.add(wisp.root);
      wisp.obstacle = { x: pos.x, z: pos.z, r: 0.3, off: night.wispsAway };
      walk.obstacles.push(wisp.obstacle);
      return wisp;
    });

    // Lamp-moths, each carrying one violet Wickhollow flame low over the water and away under an arch
    B.moths = S['lamp-moths'].map((line, i) => {
      const moth = createLampMoth();
      field.group.add(moth.root);
      return { moth, from: at(line.from), to: at(line.to), t: i * 0.45 + 0.1, dur: 9 + i * 2 };
    });

    field.things.push(
      { id: 'shrine', name: null, pos: at(S.shrine), reach: 0.5, lift: 0.8, lines: LINES.shrine, sound: 'bell' },
      ...B.wisps.map((w, i) => ({
        id: `wisp-${i}`, name: null, pos: w.root.position, reach: 0.4, lift: 0.6,
        get lines() { return night.wispsAway ? LINES.wispsGone : LINES.wisps; },
      })),
    );
  },
  update(field, dt) {
    const B = field.bridge, player = field.player;
    for (const w of B.wisps) {
      w.stepping?.(dt);
      w.update(dt);
      w.obstacle.x = w.root.position.x;
      w.obstacle.z = w.root.position.z;
    }
    // The moths: in low over the water, a lazy weave, and smaller and smaller into the dark under the arch
    for (const m of B.moths) {
      m.t += dt / m.dur;
      if (m.t >= 1) m.t -= 1;
      const k = m.t;
      const pos = m.moth.root.position.lerpVectors(m.from, m.to, k);
      pos.x += Math.sin(k * 9 + m.dur) * 0.4 * (1 - k);
      pos.y += Math.sin(k * 6) * 0.25;
      m.moth.root.rotation.y = headingTo(m.from, m.to) + Math.cos(k * 9 + m.dur) * 0.3;
      m.moth.root.scale.setScalar(1.1 * Math.min(1, k * 6) * (1 - Math.max(0, (k - 0.72) / 0.28)));
      m.moth.update(dt);
    }
    // B2: walking up to the wisps shows the card
    if (!night.wispsMet && !field.locked && !field.talking && B.wisps.some((w) => w.root.position.distanceTo(player.pos) < 3.4)) meetWisps(field);
  },
  labels(field) {
    const c = field.stage.cutouts.cards.find((k) => k.name === "the bridge's near wall");
    const box = new THREE.Box3().setFromObject(c.mesh);
    return { floor: field.paint.toWorld(700, 600), arch: box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2) };
  },
};

async function meetWisps(field) {
  const B = field.bridge, player = field.player;
  night.wispsMet = true;
  field.locked = true;
  player.path = null;
  player.onArrive = null;
  field.keys?.clear?.();
  field.audio.sfx('alert');
  player.heading = headingTo(player.pos, B.wisps[1].root.position);
  for (const w of B.wisps) { w.root.rotation.y = headingTo(w.root.position, player.pos); w.play('flicker'); }
  await sleep(800);
  await showEncounter({
    tag: 'B2', title: 'The Twisted Grove',
    text: 'Sour Wisps crowd the twisted grove at the end of the bridge.',
    foes: ['Sour Wisp ×2: grey at the edges, and pouting', 'Lamp-Moth: carrying one violet Wickhollow flame'],
    note: 'Wisp-Calm (lavender and wisp-sprout) lets her by without a fight. The fight itself is in the battle demo. For now, the wisps drift off, shy.',
    battle: 'B2',
  });
  night.wispsAway = true;
  const S = field.scene.spots;
  B.wisps.forEach((w, i) => {
    w.obstacle.off = true;
    const to = field.paint.toWorld(...S['wisps away'][i]);
    to.y = 2.4;
    stepAside(w, to, 2.4 + i * 0.4);
  });
  field.audio.sfx('wisp');
  field.toast('The wisps hiccup, go a little greener, and drift up into the twisted trees.', 'wisp');
  field.locked = false;
}

// ---------------------------------------------------------------- start
bootTown({
  screens: { [path.id]: { data: path, cast: PATH }, [bridge.id]: { data: bridge, cast: BRIDGE } },
  start: path.id,
  images: gloamwoodImages,
  footsteps: 'step-stone',
}).then((game) => {
  // She comes with one Lantern Oil in her basket, brewed at home, so the relight can be played
  game.field.give('lantern-oil', 1);
  game.field.showPlace(); // (again, now the page is up: building it can take a while on a slow device)
  game.night = night;
}).catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
