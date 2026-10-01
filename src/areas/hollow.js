import * as THREE from 'three';
import hollow from '../../scenes/the-hollow.json';
import hollowPainting from '../../art/backgrounds/the-hollow.webp';
import { createGloamwing } from '../actors/bosses-gloamwing.js';
import { createLampMoth } from '../actors/foes.js';
import { turnToward } from '../actors/kit.js';
import { headingTo, flagSet, plantHollowed, updateHollowed, sleep } from './common.js';

// The Hollow (docs/SLICE.md screen 7), Witch Way's own painting: a marsh graveyard past the twisted grove, with
// bone-hung trees, glowing rune stones, a footbridge over a black stream, and an iron gate that stays shut. The
// Gloamwing hangs in the great tree on the left, fat with light, and the lamp-moths circle it with their stolen
// flames. Walking up to it starts B3; once it's beaten it flutters up after the moon, and every moth rises and
// streams away downriver: "Further than I can walk tonight." Inkblot's nest is in the right-hand tree, with his tail
// feather in it, and there's one Hollowed bed by the path to clean for bogwick.
//
// createHollow(host) -> { screens, images }. Only the game goes here (the Gloamwood demo stops at the bridge).

export function createHollow(host) {
  const H = host.state('hollow', { met: false, won: false, feather: false, cleaned: [] });
  const cleaned = flagSet(H.cleaned);
  const flags = host.flags ?? {};
  const S = hollow.spots;

  const HOLLOW = {
    get music() { return H.won ? 'travel' : 'ruins'; },
    ambience: [
      { sfx: 'frog', first: 2, gap: 6, spread: 6 },
      { sfx: 'owl', first: 9, gap: 22, spread: 20 },
      { sfx: 'wisp', first: 5, gap: 14, spread: 10 },
    ],
    herbTotal: 1,
    enter(field) {
      const { paint } = field;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
      const X = (field.hollow = { moths: [], t: 0 });

      // The Gloamwing, high in the bone tree (it hovers a little above wherever its root is)
      if (!H.won) {
        const g = createGloamwing();
        const [x, y, h = 3.5] = S.gloamwing;
        g.root.position.copy(at([x, y])).setY(h - 1.3);
        g.root.scale.setScalar(0.85);
        g.rest = headingTo(g.root.position, at(S['gloamwing perch']));
        g.root.rotation.y = g.rest;
        field.group.add(g.root);
        if (g.fx) field.group.add(g.fx);
        X.gloamwing = g;
        field.things.push({
          id: 'gloamwing', name: null, actor: g, pos: g.root.position, reach: 4, lift: 1.4,
          lines: { first: ['The Gloamwing: a moth the size of a cart, hanging in the bones of the tree, fat with stolen light.', 'There\'s a bell spun into its silk. It hums when it breathes.'] },
          onEnd: (f) => meet(f),
        });
      }
      // The lamp-moths, circling the tree with their violet flames (gone once the Gloamwing is beaten)
      if (!H.won) {
        X.moths = (S.moths ?? []).map((p, i) => {
          const m = createLampMoth();
          m.root.scale.setScalar(1.5);
          const c = at(p);
          field.group.add(m.root);
          if (m.fx) field.group.add(m.fx);
          return { m, c, r: 0.6 + (i % 3) * 0.25, a: i * 1.7, speed: 0.6 + (i % 2) * 0.25 };
        });
      }

      field.things.push(
        {
          id: 'nest', name: null, pos: at(S.nest), reach: 1.4, lift: 0.2,
          get lines() { return nestLines(field); },
        },
        { id: 'gate', name: null, pos: at(S.gate), reach: 0.8, lift: 1.2, lines: LINES.gate, sound: 'sealed-door' },
        { id: 'rune-stone', name: null, pos: at(S['rune stone']), reach: 0.9, lift: 0.6, lines: LINES.rune, sound: 'wisp' },
      );
      // One Hollowed bed by the path: clean it for bogwick (docs/SLICE.md screen 7)
      const [bx, by] = S['hollowed bed'];
      X.patches = plantHollowed(field, [['bogwick', bx, by]], cleaned);
    },
    update(field, dt, time) {
      const X = field.hollow, player = field.player;
      X.t += dt;
      updateHollowed(X.patches, dt);
      for (const o of X.moths) {
        if (o.leaving) {
          o.leaving.t = Math.min(1, o.leaving.t + dt / o.leaving.dur);
          const k = o.leaving.t;
          o.m.root.position.lerpVectors(o.leaving.from, o.leaving.to, k * k);
          o.m.root.position.y += Math.sin(Math.PI * k) * 2;
          o.m.root.rotation.y = headingTo(o.leaving.from, o.leaving.to);
          o.m.root.scale.setScalar(1.5 * (1 - k * 0.8));
          if (k >= 1) o.m.root.visible = false;
        } else {
          o.a += dt * o.speed;
          o.m.root.position.set(o.c.x + Math.cos(o.a) * o.r, o.c.y + Math.sin(o.a * 1.7) * 0.2, o.c.z + Math.sin(o.a) * o.r * 0.6);
          o.m.root.rotation.y = o.a + Math.PI / 2;
        }
        o.m.update(dt);
      }
      const g = X.gloamwing;
      if (g) {
        g.descend?.(dt);
        g.update(dt);
        if (!H.met && !field.locked && !field.talking) {
          // it turns its great soft face to watch her come, and comes down to meet her
          g.root.rotation.y = turnToward(g.root.rotation.y, headingTo(g.root.position, player.pos), 1.5, dt);
          const perch = field.paint.toWorld(...S['gloamwing perch']);
          if (perch.distanceTo(player.pos) < 3.2) meet(field);
        }
      }
    },
  };

  // B3: the Gloamwing comes down out of the tree to meet her
  async function meet(field) {
    const X = field.hollow, g = X.gloamwing;
    if (H.met || !g || field.locked) return;
    H.met = true;
    field.locked = true;
    field.player.path = null;
    field.player.onArrive = null;
    field.keys?.clear?.();
    field.audio.sfx('insect');
    const from = g.root.position.clone();
    const perch = field.paint.toWorld(...S['gloamwing perch']);
    const to = perch.clone().setY(perch.y + 0.4);
    let t = 0;
    await new Promise((resolve) => {
      g.descend = (dt) => {
        t = Math.min(1, t + dt / 1.6);
        const e = t * t * (3 - 2 * t);
        g.root.position.lerpVectors(from, to, e);
        g.root.rotation.y = turnToward(g.root.rotation.y, headingTo(g.root.position, field.player.pos), 4, dt);
        if (t >= 1) { g.descend = null; resolve(); }
      };
    });
    field.player.heading = headingTo(field.player.pos, g.root.position);
    g.play('bell-hum');
    await sleep(700);
    const result = await (host.encounter?.('B3', { field }) ?? 'card');
    if (result === 'lost') {
      // She woke at her last rest. It goes back up into its tree, and waits.
      H.met = false;
      g.root.position.copy(from);
      field.locked = false;
      return;
    }
    H.won = true;
    flags.b3 = true;
    field.things = field.things.filter((t2) => t2.id !== 'gloamwing');
    // It flutters up after the moon...
    g.play('ko');
    const up = field.paint.toWorld(...(S['moths away']?.[0] ?? [200, 120, 8]));
    const start = g.root.position.clone();
    let k = 0;
    g.descend = (dt) => {
      k = Math.min(1, k + dt / 4);
      g.root.position.lerpVectors(start, up, k * k);
      g.root.scale.setScalar(0.85 * (1 - k * 0.85));
      if (k >= 1) { g.root.visible = false; g.descend = null; }
    };
    field.audio.sfx('wind');
    await sleep(1200);
    // ...and every moth rises and streams away downriver, with its stolen flame
    const away = S['moths away'] ?? [[200, 120, 8]];
    X.moths.forEach((o, i) => {
      o.leaving = { from: o.m.root.position.clone(), to: field.paint.toWorld(...away[i % away.length]), t: -i * 0.15, dur: 3 + i * 0.3 };
    });
    field.audio.sfx('insect');
    await sleep(2600);
    field.locked = false;
    field.talk({
      id: 'after-b3', name: null, visits: 0,
      pos: field.player.pos.clone().add(new THREE.Vector3(Math.sin(field.player.heading), 0, Math.cos(field.player.heading))),
      lines: { first: [
        'Every moth in the Hollow, up and away over the trees, all going the same way: down the Sable.',
        { who: 'witch', say: 'Further than I can walk tonight.', face: 'witch-calm' },
        { who: 'witch', say: "Quill's skiff, then. A Warming Balm for his hands, and Silas's flame for her bow.", face: 'witch-sly' },
      ] },
      onEnd: (f) => { if (host.joined?.('inkblot') && !H.feather) fetchFeather(f); },
    });
  }

  // Inkblot's tail feather, back from his nest in the right-hand tree: his surge, Every Shiny Thing (docs/LORE.md §6)
  function nestLines(field) {
    if (H.feather) return { first: ['Inkblot\'s nest: twigs, a button, a thimble, three hairpins, and a spoon. Very tidy, for a crow.'] };
    if (!host.joined?.('inkblot')) return { first: ['A crow\'s nest, up in the bones of the tree, with something long and black sticking out of it.'] };
    return {
      first: [
        'A crow\'s nest up in the bones of the tree. Inkblot\'s: there\'s a button in it, and a thimble, and a spoon.',
        { say: 'And a long black feather, sticking out of the twigs.', do: (f) => setTimeout(() => fetchFeather(f), 100) },
      ],
    };
  }
  function fetchFeather(field) {
    if (H.feather) return;
    H.feather = true;
    field.audio.sfx('flap');
    field.give('inkblots-feather', 1, 'reveal-heirloom');
    field.toast("Kraa! Inkblot flies up to his nest and back with his tail feather. His surge, Every Shiny Thing, is back.", 'reveal-heirloom');
  }

  const LINES = {
    gate: {
      first: ['The iron gate, between two lamps that somebody keeps lit. It stays shut.', 'Whatever is behind it can wait for another night.'],
      again: ['Shut. And not my business tonight.'],
    },
    rune: {
      first: ['A standing stone with a green rune burning in it: an old name, kept bright.', "Somebody remembers whoever it was. That's what the rune is for."],
      again: ['Still burning green.'],
    },
  };

  return {
    screens: { [hollow.id]: { data: hollow, cast: HOLLOW } },
    images: { [hollow.image]: hollowPainting },
  };
}
