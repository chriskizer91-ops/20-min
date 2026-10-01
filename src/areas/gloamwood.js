import * as THREE from 'three';
import path from '../../scenes/lantern-path.json';
import bridge from '../../scenes/sable-bridge.json';
import { gloamwoodImages, silasPortraits as SP } from '../assets-gloamwood.js';
import { LAYER_GLOW } from '../stage.js';
import { createSilas, createWaysideKettle, createCrock, createBench } from '../actors/silas.js';
import { createMandrake, createGlowcap, createSourWisp, createLampMoth } from '../actors/foes.js';
import { glowSprite, turnToward } from '../actors/kit.js';
import { headingTo, cardTop, sleep, stepAside } from './common.js';

// The Gloamwood, Wickhollow's wild places (docs/SLICE.md screens 5 and 6). The lantern path is Witch Way's own
// painting: she comes down from the square at the top, past the waterfall, over the footbridge (where B1's Hollowed
// Mandrake and Glowcap stand in the way) and along to Silas's junction: his dark lamp post, his wayside kettle, crock
// and bench, and his garden that grows out of season. Given Lantern Oil, Silas relights his pole, and the five lanterns
// light one by one down the path. He gives her the Owl charm and a flame for the skiff's bow, and tells her the moths
// gather in the Hollow; then the path on to the Sable bridge opens. On the bridge, lamp-moths carry stolen lights away
// under the arches, and Sour Wisps crowd the twisted grove at the far end (B2); Wisp-Calm lets her by without a fight.
// The far end goes on to the Hollow (src/areas/hollow.js).
//
// createGloamwood(host) -> { screens, images }. See src/areas/common.js for the host.

// The painted lanterns: the painting has its five lanterns lit. While they're out, their glass is painted dark and the
// warm light they throw on the path is cooled; relighting one paints the painting's own pixels back in, round it, and
// adds a warm glow and a light she picks up as she walks past.
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

// The cards of the Gloamwood's two fights, for a host that shows a card rather than playing the fight
export const CARDS = {
  B1: {
    tag: 'B1', title: 'The Lantern Path',
    text: 'A Hollowed Mandrake and a Glowcap block the path.',
    foes: ['Hollowed Mandrake: grey leaves, the face of a cross turnip', 'Glowcap: walking toward the wrong light'],
    note: 'The fight itself is in the battle demo. For now, they let her by.',
  },
  B2: {
    tag: 'B2', title: 'The Twisted Grove',
    text: 'Sour Wisps crowd the twisted grove at the end of the bridge.',
    foes: ['Sour Wisp ×2: grey at the edges, and pouting', 'Lamp-Moth: carrying one violet Wickhollow flame'],
    note: 'Wisp-Calm (lavender and wisp-sprout) lets her by without a fight. The fight itself is in the battle demo. For now, the wisps drift off, shy.',
  },
};

export function createGloamwood(host) {
  // Everything that has happened tonight in the Gloamwood; it carries over from screen to screen.
  const night = host.state('gloamwood', {
    foesMet: false,    // B1 has been met
    foesAside: false,  // and they've stepped off the path
    metSilas: false,
    relit: false,      // the lanterns are lit
    thanked: false,    // Silas has given her the Owl charm and the bow-lamp flame, and told her about the Hollow
    moonwater: false,  // (the demo's crock; in the game the crock and the well share the night's three)
    rested: 0,
    wispsMet: false,   // B2 has been met on the Sable bridge
    wispsAway: false,  // and the wisps have drifted off into the trees
  });
  const flags = host.flags ?? {};
  const game = !!host.game;
  const crockDrawn = () => (game ? !!flags.wickhollowWater : night.moonwater);

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
      const { paint, scene, walk } = field;
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
      P.props.crock.setFull(!crockDrawn());

      // B1: the Hollowed Mandrake and the Glowcap, on the path above the footbridge (or already off it, grumbling)
      const foes = [
        ['mandrake', createMandrake({ hollowed: !night.foesAside || !game })],
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

      // Inkblot, hopping about the path (unless he's with her): he flies up to the lamp posts, the stumps and the
      // footbridge posts
      const crow = host.joined?.('inkblot') ? null : field.addCrow(at(S.inkblot), {
        ground: [[1150, 330], [1120, 250], [1180, 420], [1090, 520], [880, 660], [600, 700], [380, 730], [260, 640]].map((p) => at(p)),
        high: [top([185, 872], 656), top([1272, 230], 124), top([1080, 280], 230), top([280, 518], 462), top([706, 676], 628), top([860, 630], 586)],
      });

      field.things.push(
        {
          id: 'silas', name: 'Silas', actor: silas, pos: silas.root.position, voice: 0,
          portrait: () => (night.relit ? SP.happy : SP.calm),
          get lines() { return { first: silasLines(field) }; },
          onTalk: () => { night.metSilas = true; },
          onLine: (text, f) => { if (!f.talking?.lines[f.talking.index]?.who) silas.play('talk'); },
          onEnd: (f) => { silas.setMood(night.relit ? 'happy' : 'calm'); if (P.after) { const next = P.after; P.after = null; next(f); } },
        },
        ...(crow ? [{ id: 'inkblot', name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, get lines() { return LINES.inkblot(); } }] : []),
        {
          id: 'kettle', name: null, pos: P.props.kettle.root.position, reach: 0.55, lift: 0.7, sound: 'campfire', brew: 'wayside',
          get lines() { return host.brew ? LINES.kettleBrew : LINES.kettle; },
          onEnd: (f) => host.brew?.(f, 'kettle'),
        },
        { id: 'crock', name: null, pos: P.props.crock.root.position, reach: 0.35, lift: 0.5, get lines() { return LINES.crock(); }, sound: 'well-bucket' },
        { id: 'bench', name: null, pos: P.props.bench.root.position, reach: 0.45, lift: 0.5, get lines() { return LINES.bench(); }, sound: 'ui-page' },
        { id: 'waterfall', name: null, pos: at(S.waterfall), reach: 0.9, lift: 0.3, lines: LINES.waterfall, sound: 'waterfall' },
        { id: 'garden', name: null, pos: at(S.garden), reach: 0.6, lift: 0.2, lines: LINES.garden, sound: 'leaves' },
        ...foes.map((foe) => ({
          id: foe.id, name: null, pos: foe.root.position, reach: 0.4, lift: 0.4,
          get lines() {
            if (!night.foesAside) return { first: ['They won\'t budge while I stand here glaring.'] };
            // The glowcap, sitting with its roots down, lets her snip a cap if she has none (it's half a Warming Balm)
            if (game && foe.id === 'glowcap' && !field.has('glowcap')) return LINES.glowcapGives;
            return LINES[foe.id];
          },
        })),
      );
      // Herbs: witch's bells, ember-star lilies and silver mugwort along the path; Silas's garden by his post
      field.plantHerbs(scene.herbs, 1.6);
      field.plantHerbs(scene.garden, 1.6);
    },

    // The way on to the Sable bridge opens once Silas has told her where the moths go
    locked(exit) {
      if (exit.to === 'sable-bridge' && !night.thanked) return exit.line;
      return false;
    },

    update(field, dt, time) {
      const P = field.path, player = field.player;
      P.lanterns.update(dt, time);
      // Silas turns to whoever talks to him, and back to watching the path
      const s = P.silas;
      const before = s.root.rotation.y;
      s.update(dt, 0, s.turn ?? 0);
      s.turn = Math.atan2(Math.sin(s.root.rotation.y - before), Math.cos(s.root.rotation.y - before)) / Math.max(dt, 1e-3);
      for (const prop of Object.values(P.props)) prop.update(dt);
      for (const foe of P.foes) {
        foe.stepping?.(dt);
        foe.update(dt);
        foe.obstacle.x = foe.root.position.x;
        foe.obstacle.z = foe.root.position.z;
        // until they've met her, they watch her come
        if (!night.foesMet && !field.locked) foe.root.rotation.y = turnToward(foe.root.rotation.y, headingTo(foe.root.position, player.pos), 3, dt);
      }

      // B1: walking up to them starts it, and then they let her pass
      if (!night.foesMet && !field.locked && !field.talking && P.foes.some((f) => f.root.position.distanceTo(player.pos) < 2.4)) meetFoes(field);

      // The flame running from lamp to lamp
      P.run?.(dt);
    },

    labels(field) {
      const card = cardTop(field);
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
    const result = await (host.encounter?.('B1', { field, card: CARDS.B1 }) ?? 'card');
    if (result === 'lost') { night.foesMet = false; return; } // she woke at her last rest; they're still here
    // They step aside: the mandrake sulks (it's itself again, once beaten), the glowcap sits and puts down roots
    night.foesAside = true;
    const S = field.scene.spots;
    const [mandrake, glowcap] = P.foes;
    for (const foe of P.foes) foe.obstacle.off = true;
    if (result === 'won') mandrake.setHollowed?.(false);
    stepAside(mandrake, field.paint.toWorld(...S['mandrake aside']));
    stepAside(glowcap, field.paint.toWorld(...S['glowcap aside']), 2);
    mandrake.rest = headingTo(field.paint.toWorld(...S['mandrake aside']), field.paint.toWorld(...S.footbridge));
    glowcap.rest = headingTo(field.paint.toWorld(...S['glowcap aside']), field.paint.toWorld(...S.footbridge));
    field.audio.sfx('leaves');
    field.toast(result === 'won'
      ? 'The mandrake stomps off the path, grey no longer, and sulks. The glowcap toddles after it and sits.'
      : 'The mandrake stomps off the path, grumbling. The glowcap toddles after it.', 'leaves');
    field.locked = false;
    await sleep(1700);
    mandrake.play('ko'); // it sulks
  }

  // ---------------------------------------------------------------- the relighting
  // The pole flares; one flame runs from it all the way up the path to the lamp by the square, then lights every
  // lantern on its way back down to Silas's own. The camera goes with it, and comes back to her.
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
    const stage = field.stage;
    return new Promise((resolve) => {
      P.run = (dt) => {
        clock += dt;
        if (pause > 0) { pause -= dt; stage.look(field.paint.toPixel(mote.position)); return; }
        const L = legs[leg];
        if (!L) {
          // back to her
          mote.material.opacity = Math.max(0, mote.material.opacity - dt * 2);
          core.material.opacity = mote.material.opacity;
          stage.look(null);
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
        stage.look(field.paint.toPixel(mote.position));
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
  // His lines are Witch Way's (game/data/dialogue.json, "silas"); the Owl charm, the flame for the skiff's bow ("no
  // wind or wisp can blow out") and the moths in the Hollow are docs/LORE.md §6 and docs/SLICE.md screen 5.
  function silasLines(field) {
    const P = field.path, silas = P.silas;
    const hasOil = field.has('lantern-oil');
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
          do: (f) => silas.play('give', () => { f.give('charm-owl', 1, 'reveal-heirloom'); f.toast('The Owl charm. Moonlight reaches farther.', 'reveal-heirloom'); }),
        }),
        witch("One more thing. Quill's skiff wants a lamp at her bow that won't blow out.", 'witch-sly'),
        say("Then take a flame from my pole. For the skiff's bow: no wind or wisp can blow it out.", {
          mood: 'happy',
          do: (f) => silas.play('give', () => { f.give('bow-lamp', 1, 'crystal-flare'); f.toast("Silas's flame, for the Magpie's bow.", 'crystal-flare'); }),
        }),
        witch('And the lights that float away down the river. Do you see where they go?', 'witch-calm'),
        say('The moths carry them. Every night they gather in the Hollow, over the Sable bridge and through the twisted grove, and then away downriver.', { mood: 'sad', do: () => silas.play('point') }),
        witch('The Hollow, then. Thank you, Silas.', 'witch-delighted', {
          do: (f) => {
            night.thanked = true;
            flags.silas = true;
            host.storyFloor?.('B2');
            f.toast('The way on to the Sable bridge is open.', 'new-area');
          },
        }),
      ];
    }
    if (!hasOil) {
      return [
        say('Evening! Mind the pole. Silas, lamplighter. These are my lamps. Fine, aren\'t they?', { mood: 'happy' }),
        say('Lantern Oil, if you could brew some. A flame no wisp can blow out. Imagine it!', { mood: 'sad' }),
        ...(game ? [witch('Moonpetal and bogwick. And his garden grows bogwick, out of season. The kettle, then.', 'witch-sly')] : []),
      ];
    }
    const oil = [
      witch('I brought you something. Lantern Oil: moonpetal and bogwick.', 'witch-delighted'),
      say('Lantern Oil! Look at that flame. Go on, wisps, puff away. There!', {
        mood: 'surprised',
        do: (f) => {
          f.take('lantern-oil');
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
    kettleBrew: {
      first: ["Silas's wayside kettle, simmering over its embers. The kettle is anyone's who needs it: that's what \"wayside\" means."],
      again: ['The wayside kettle. Moonwater, herbs, witchfire.'],
    },
    garden: {
      first: ["Silas's garden: lavender, bogwick and wisp-sprout, all in flower at once.", 'It grows out of season. Nobody has ever told it, and I\'m not going to.'],
      again: ['Lavender and bogwick side by side. Wren would have words.'],
    },
    crock: () => (crockDrawn()
      ? { first: [game ? "Tonight's moonwater is drawn, here and at the well. The crock fills again at moonrise." : "Tonight's moonwater is drawn. The crock fills again at moonrise, with the well."] }
      : {
        first: [
          'The wayside crock, with a gold moon on its belly. It holds moonwater: water that held the moon\'s reflection all night.',
          {
            say: 'Three bottles a night, shared with the well in the square.',
            do: (field) => {
              night.moonwater = true;
              flags.wickhollowWater = true;
              field.give('moonwater', 3, 'well-bucket');
              field.path.props.crock.setFull(false);
              field.toast('The wayside crock gives three moonwater.', 'well-bucket');
            },
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
    glowcapGives: {
      first: [
        'The glowcap has sat itself down by the path and put down roots. It sways, dreaming of lamps.',
        { say: 'It lets me snip one cap with the athame. I say thank you. It glows a little, pleased.', do: (f) => { f.player.actor.play('harvest'); f.give('glowcap'); f.toast('A glowcap, for a Warming Balm.', 'shard-pickup'); } },
      ],
    },
  };
  if (game) {
    LINES.mandrake = {
      first: ['The mandrake, green again and sulking in the bracken with its arms folded.', 'Sorry. Truly. Grey didn\'t suit you.'],
      again: ['Still sulking. Mandrakes can keep it up for a week.'],
    };
  }

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
    if (host.rest) host.rest(field, { screen: path.id, pixel: path.spots.bench, facing: 'down', name: "Silas's bench" });
    else {
      try {
        localStorage.setItem('witch-way:gloamwood', JSON.stringify({ at: 'lantern-path:bench', night, bag: field.bag, picked: [...field.picked], when: Date.now() }));
      } catch { /* no storage: the rest still does her good */ }
    }
    await sleep(1800);
    field.audio.sfx('ui-save');
    field.toast('Rested on the wayside bench. Everyone mended, and the night saved.', 'ui-save');
    await sleep(900);
    player.actor.play('rise');
    await sleep(800);
    field.locked = false;
  }

  // ---------------------------------------------------------------- the Sable bridge
  // The stone bridge on the way to the Hollow (docs/SLICE.md screen 6): lamp-moths carry stolen lights away under the
  // arches, and Sour Wisps crowd the twisted grove at the far end (B2). Wisp-Calm lets her by; otherwise they fight.
  // The near end goes back the way she came (the lantern path, or the square); the far end, on to the Hollow.
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
      const { paint, scene, walk } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
      const B = (field.bridge = {});
      // Back the way she came
      const near = field.exits.find((e) => e.name === 'the lantern path');
      if (near && field.from === 'wickhollow-square') Object.assign(near, { to: 'wickhollow-square', line: 'Back to the square.' });

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
      B.moths = flags.lightsHome ? [] : S['lamp-moths'].map((line, i) => {
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
    locked(exit) {
      if (exit.name === 'the Hollow' && !night.wispsAway) return "The wisps won't let anyone into the grove.";
      return false;
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
      // B2: walking up to the wisps
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
    let result;
    if (game && field.has('wisp-calm')) {
      // Wisp-Calm: uncorked, it ends the fight before it starts (docs/LORE.md §8)
      field.take('wisp-calm');
      player.actor.play('throw');
      field.audio.sfx('wisp');
      await sleep(700);
      field.toast('She uncorks the Wisp-Calm. Lavender and wisp-sprout drift over the bridge, and the wisps go quiet.', 'wisp');
      await sleep(1200);
      result = 'calmed';
    } else {
      result = await (host.encounter?.('B2', { field, card: CARDS.B2 }) ?? 'card');
    }
    if (result === 'lost') { night.wispsMet = false; return; }
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

  return {
    screens: { [path.id]: { data: path, cast: PATH }, [bridge.id]: { data: bridge, cast: BRIDGE } },
    images: gloamwoodImages,
    night,
  };
}
