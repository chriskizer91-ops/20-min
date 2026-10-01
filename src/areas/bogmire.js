import * as THREE from 'three';
import moot from '../../scenes/bogmire-moot-circle.json';
import hut from '../../scenes/nettie-hut.json';
import murk from '../../scenes/murkway.json';
import board from '../../scenes/long-boardwalk.json';
import hollow from '../../scenes/mothers-hollow.json';
import { bogmireImages, nettiePortraits as NP } from '../assets-bogmire.js';
import { modelPortrait } from '../town.js';
import { pointInPolygon } from '../field.js';
import { ring } from '../paint.js';
import { LAYER_GLOW } from '../stage.js';
import { createGretch } from '../actors/gretch.js';
import { createNettie } from '../actors/nettie.js';
import { createBoglurcher, createMireLeech } from '../actors/foes.js';
import { createWillowWight } from '../actors/bosses-willow.js';
import { createDrownedChorister } from '../actors/bosses-chorister.js';
import { createLanternMother } from '../actors/bosses-lantern.js';
import { turnToward, toon, part, badge, crescentShape, glowSprite, glowTexture, onLayer } from '../actors/kit.js';
import { playSfx, fm } from '../../vendor/thareia-sfx/sounds.js';
import { headingTo, cardTop, facing, flagSet, plantHollowed, updateHollowed, sleep } from './common.js';

// Bogmire, the fen town on stilts (docs/SLICE.md, screens 9 to 13). In town: the moot-circle, where Mayor Gretch keeps
// the mud outside and Inkblot warms his toes by the fire, and Nettie's hut, where the middle turn of the story is told.
// Nettie's door is the bottle-lined cottage on the moot-circle's left; the gate at the bottom of her hut leads back
// out. The lamps are violet: every one burns a flame borrowed from Wickhollow.
//
// Out on the fen, Bogmire's wild places, where its foes live:
//   the Murkway (down the pier): a path past old fen graves, Hollowed herb patches to clean before she picks them, and
//     fog over the low path, where Hag-Sight shows which planks hold; B4's Hollowed foes stand on the high path, and
//     the planks through the fog are the way round them
//   the Long Boardwalk (past the mast, or on from the Murkway): B5's Willow-Wight and Drowned Choristers, silver
//     mugwort on the reed islets, and at the landing, a bench under a lamp-post where she rests and saves
//   Mother's Hollow (the far end of the boardwalk): the sunken house, and the Lantern Mother on its step (B6)
//
// createBogmire(host) -> { screens, images, partyLines, night }. See src/areas/common.js for the host. In the game,
// Nettie's first words lead into the Middle Turn, she asks for a Hush Tea, and joins once she's slept on it; the fen
// waits until she has; the mast is where the Magpie ties up; and the fights are fought.

const $ = (id) => document.getElementById(id);
const TOWN_HERBS = moot.herbs.length + hut.herbs.length;
const ALL_HERBS = TOWN_HERBS + murk.hollowed.length + board.herbs.length;
const FEN = [murk.id, board.id, hollow.id];

// Each fight's card: its name, its foes, and a line about it
export const FIGHTS = {
  B4: {
    kicker: 'B4 · optional', name: 'The Murkway', sfx: 'alert',
    foes: [
      ['Hollowed Boglurcher', 'A heap of bog with eyes in it, grey with rot.'],
      ['Hollowed Mire Leech ×2', 'Glossy and black, more slug than horror.'],
    ],
    note: 'You can walk round them: Hag-Sight shows which planks hold through the fog.',
  },
  B5: {
    kicker: 'B5', name: 'The Long Boardwalk', sfx: 'alert',
    foes: [
      ['Willow-Wight', 'A weeping black willow that pulled up its roots.'],
      ['Drowned Chorister ×2', "Misthollow's choir, singing in their sleep."],
    ],
    note: 'The last test before Mother\'s Hollow.',
  },
  B6: {
    kicker: 'B6 · the final fight', name: 'The Lantern Mother', sfx: 'boss',
    foes: [['The Lantern Mother', 'Tall, in a wet lace veil, with a lantern of borrowed flames. Kind, and wrong.']],
    note: 'She calls lamp-moths to her light. Losing once is fine.',
  },
};

export function createBogmire(host) {
  // What's true for the whole night, whichever screen she's on
  const night = host.state('bogmire', {
    fen: false, // she's been out on the fen: from then on the basket counts its herbs too
    cleaned: [], // Hollowed patches she's cleaned (by id), which stay in bloom
    met: [], // fights already met: 'B4', 'B5', 'B6'
    won: [], // and won
    sight: false, // Hag-Sight switched on
    asked: false, // Nettie has asked for a Hush Tea
    middle: false, // the Middle Turn has been told
  });
  const cleaned = flagSet(night.cleaned), met = flagSet(night.met), won = flagSet(night.won);
  // A fight met but never won (the night was saved, or the page closed, in the middle of it) waits for her again
  for (const id of [...night.met]) if (!won.has(id)) forget(id);
  function forget(id) { const i = night.met.indexOf(id); if (i >= 0) night.met.splice(i, 1); }
  const flags = host.flags ?? {};
  const game = !!host.game;
  const herbTotal = () => (night.fen ? ALL_HERBS : TOWN_HERBS);
  const nettieIn = () => !!host.joined?.('nettie');

  // Every screen starts from the painting as painted, with none of the last screen's fen business, and only the
  // Murkway shows the Hag-Sight button. Once she's out on the fen the basket counts its herbs too.
  function arrive(field, id) {
    night.fen ||= FEN.includes(id);
    field.herbTotal = herbTotal();
    if (!$('basket').hidden) field.showBasket();
    Object.assign(field, { fen: null, fight: null, patches: null, rest: null });
    hagSight(0);
    const btn = $('btn-hagsight');
    if (btn) btn.hidden = id !== murk.id;
  }
  // Leaving the Murkway takes the hag stone's view with it
  const leaveFen = () => {
    hagSight(0);
    const btn = $('btn-hagsight');
    if (btn) btn.hidden = true;
  };

  // ---------------------------------------------------------------- the moot-circle
  const MOOT = {
    music: 'marsh', // Thareia's "Gloomfen Drift"
    ambience: [
      { sfx: 'frog', first: 2, gap: 5, spread: 7 },
      { sfx: 'crickets', first: 7, gap: 9, spread: 8 },
      { sfx: 'owl', first: 35, gap: 35, spread: 40 },
    ],
    get herbTotal() { return herbTotal(); },
    enter(field) {
      arrive(field, moot.id);
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

      // Mayor Gretch, on the planks by the fire, keeping an eye on the mast where boats (and the odd skiff) come in
      const gretch = createGretch();
      const home = at(S.gretch);
      gretch.rest = headingTo(home, at([1150, 640]));
      field.addPerson(gretch, home, gretch.rest);
      gretch.tick = (dt) => gretch.update(dt, 0, 0);
      const portrait = modelPortrait(field.stage.renderer, gretch);

      // Inkblot pecks about the circle and flies up to a post, a lamp arm or the mast deck if she crowds him (unless
      // he's with her)
      const top = (base, topY) => at(base).setY(paint.heightAbove(base, topY));
      const crow = host.joined?.('inkblot') ? null : field.addCrow(at([620, 545]), {
        ground: [[620, 545], [700, 575], [900, 600], [980, 520], [560, 520], [860, 620], [1230, 580], [480, 540]].map((p) => at(p)),
        high: [top([427, 598], 555), top([737, 736], 649), top([908, 733], 646), top([1358, 632], 562), top([1478, 634], 542), top([519, 588], 318)],
      });

      field.things.push(
        {
          id: 'gretch', name: 'Mayor Gretch', actor: gretch, pos: gretch.root.position, voice: 2,
          get lines() { return game && !nettieIn() && field.visits.get('gretch') ? LINES.gretchFen : LINES.gretch; },
          portrait: (line) => portrait(line.mood ?? 'calm'),
          onLine: () => gretch.play('talk'),
          onEnd: () => gretch.setMood('calm'),
        },
        ...(crow ? [{ id: 'inkblot', name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, lines: LINES.inkblot }] : []),
        { id: 'moot-fire', name: null, pos: at(S.fire), reach: 1.0, lift: 0.5, lines: LINES.fire, sound: 'campfire' },
        {
          id: 'mast', name: null, pos: at(S.mast), lift: 1.0, sound: 'rope-creak',
          get lines() { return game && host.fly ? LINES.mastFly : LINES.mast; },
          onEnd: (f) => { if (game && host.fly) host.fly(f, 'bogmire'); },
        },
        { id: 'moot-hall', name: null, pos: at(S['hall door']), lift: 0.8, lines: LINES.hall, sound: 'sealed-door' },
        { id: 'violet-lamp', name: null, pos: at(S['violet lamp']), reach: 0.45, lift: 2.3, lines: LINES.lamp, sound: 'chime' },
      );
      field.plantHerbs(scene.herbs, 1.6, 0.45);
    },
    // In the game, the fen waits until Nettie is with her (docs/SLICE.md: "Nettie joins before the first fen fight")
    locked(exit) {
      if (game && FEN.includes(exit.to) && !nettieIn()) return "Not out on the fen alone. Gretch said Nettie would know: the hut with the bottles in the window.";
      return false;
    },
    update(field, dt) {
      for (const v of field.villagers) v.tick(dt);
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(804, 620), fire: card('fire ring'), lamp: card('lamp and planter, front left') };
    },
  };

  // ---------------------------------------------------------------- Nettie's hut
  const HUT = {
    music: 'hearth', // the synth's quiet campfire piece: slow bells and an ember crackle, softer than the fen outside
    ambience: [{ sfx: 'campfire', first: 4, gap: 9, spread: 8 }],
    get herbTotal() { return herbTotal(); },
    enter(field) {
      arrive(field, hut.id);
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

      // Nettie, by her hearth, with the room (and the door) in front of her: until she's joined, and then she walks
      // with the party instead
      if (!nettieIn()) {
        const nettie = createNettie();
        const home = at(S.nettie);
        const rest = headingTo(home, at([760, 700]));
        field.addPerson(nettie, home, rest);
        nettie.tick = facing(nettie, rest);
        field.nettie = nettie;
        field.things.push({
          id: 'nettie', name: 'Nettie', actor: nettie, pos: nettie.root.position, portrait: NP['nettie-calm'], voice: 5,
          get lines() { return game ? nettieLines(field) : LINES.nettie; },
          onEnd: (f) => { nettie.setMood('calm'); afterNettie(f); },
        });
      }

      field.things.push(
        {
          id: 'cauldron', name: null, pos: at(S.cauldron), lift: 0.8, sound: 'campfire',
          get lines() { return game && host.brew && (night.asked || nettieIn()) ? LINES.cauldronYours : LINES.cauldron; },
          onEnd: (f) => { if (game && host.brew && (night.asked || nettieIn())) host.brew(f, 'nettie'); },
        },
        { id: 'rain-butt', name: null, pos: at(S['rain-butt']), reach: 0.45, lift: 0.9, lines: LINES.rainButt, sound: 'well-bucket' },
        { id: 'jars-left', name: null, pos: at(S['jars, left']), lift: 0.7, lines: LINES.jarsLeft, sound: 'ui-page' },
        { id: 'jars-right', name: null, pos: at(S['jars, right']), lift: 1.2, lines: LINES.jarsRight, sound: 'ui-page' },
        {
          id: 'bed', name: null, pos: at(S.bed), reach: 0.4, lift: 0.4,
          get lines() { return game && nettieIn() ? LINES.bedRest : LINES.bed; },
          sound: 'ui-page',
        },
      );
      field.plantHerbs(scene.herbs, 1.6, 0.45);
    },
    update(field, dt) {
      for (const v of field.villagers) v.tick?.(dt);
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(775, 650), cauldron: card('hearth and cauldron'), gate: card('the gate and the front rail') };
    },
  };

  // Nettie in the game: her first words lead into the Middle Turn (a painted cut-scene), and then she wants a Hush Tea
  // before she'll go anywhere (docs/LORE.md §6: "She joins after a Hush Tea: every borrowed lamp on the boardwalk
  // shines in her window")
  const N = (say, face = 'nettie-calm', extra = {}) => ({ say, face: NP[face], ...extra });
  const Wi = (say, face = 'witch-calm', extra = {}) => ({ who: 'witch', say, face, ...extra });
  function nettieLines(field) {
    if (!night.middle) {
      return {
        first: [
          N("Healer, herbalist, witch. Two of those you can buy. The third you don't cross. Mind the jars; some bite.", 'nettie-sly'),
          Wi("I've come about the lamps. Wickhollow's. Your town is burning them."),
          N("Your lamps weren't stolen. They were called.", 'nettie-calm', { mood: 'calm' }),
        ],
      };
    }
    if (field.has('hush-tea')) {
      return {
        first: [
          Wi('A Hush Tea. Lavender and silver mugwort, blessed with witchfire.', 'witch-delighted'),
          N("Hmph. It smells right. I'm not saying thank you.", 'nettie-sly', { do: (f) => f.take('hush-tea') }),
          N('An hour. Wake me if the boardwalk falls in.', 'nettie-calm', { do: (f) => { f.nettieDrank = true; } }),
        ],
      };
    }
    night.asked = true;
    return {
      first: [
        N("And I've not slept a wink in a week. Every borrowed lamp on that boardwalk shines straight in my window.", 'nettie-cross', { mood: 'cross' }),
        N("Brew me a Hush Tea, lavender and silver mugwort, and I'll sleep an hour. Then I'll walk you out to her.", 'nettie-sly'),
        N('Use my pot if you must. Mind the jars. Moonwater\'s in the butt: three. Not four.', 'nettie-calm'),
      ],
      again: [N('Lavender and silver mugwort. The window boxes, and the plank edges. Then an hour. Then the fen.', 'nettie-sly')],
    };
  }

  // After she's talked to Nettie: the Middle Turn the first time; after the Hush Tea, she sleeps an hour and joins
  async function afterNettie(field) {
    if (!game) return;
    if (!night.middle) {
      night.middle = true;
      if (host.cutscene) await host.cutscene('middle');
      field.talk(field.things.find((t) => t.id === 'nettie'));
      return;
    }
    if (field.nettieDrank) {
      field.nettieDrank = false;
      nettieSleeps(field);
    }
  }

  // ---------------------------------------------------------------- the Murkway
  const MURKWAY = {
    music: 'marsh',
    ambience: [
      { sfx: 'frog', first: 1.5, gap: 4, spread: 6 },
      { sfx: 'river', first: 6, gap: 14, spread: 10 },
      { sfx: 'owl', first: 28, gap: 40, spread: 30 },
    ],
    get herbTotal() { return herbTotal(); },
    enter(field) {
      arrive(field, murk.id);
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

      field.fen = { bells: 18 + Math.random() * 10, still: 0, sight: 0, warned: 0 };
      addFight(field, scene.fight);
      field.fen.low = buildLowPath(field, scene.lowPath);
      field.patches = plantHollowed(field, scene.hollowed, cleaned);
      field.things.push(
        { id: 'shrine', name: null, pos: at(S.shrine), lift: 0.8, reach: 0.5, lines: LINES.shrine, sound: 'ui-page' },
        { id: 'fen-grave', name: null, pos: at(S['rune stone']), lift: 0.6, reach: 0.5, lines: LINES.grave, sound: 'wisp' },
      );
    },
    leave: leaveFen,
    update(field, dt, time) {
      fenUpdate(field, dt);
      updateLowPath(field, dt, time);
      updateHollowed(field.patches, dt);
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(420, 700), rail: card('the bridge, near rail'), fog: field.paint.toWorld(1150, 700, 1.2) };
    },
  };

  // ---------------------------------------------------------------- the Long Boardwalk
  const BOARDWALK = {
    music: 'marsh',
    ambience: [
      { sfx: 'frog', first: 2, gap: 5, spread: 7 },
      { sfx: 'river', first: 9, gap: 16, spread: 10 },
    ],
    get herbTotal() { return herbTotal(); },
    enter(field) {
      arrive(field, board.id);
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

      field.fen = { bells: 8 + Math.random() * 8 };
      addFight(field, scene.fight);
      field.plantHerbs(scene.herbs, 1.7, 0.4);
      addRestPoint(field, S);
      field.things.push(
        { id: 'boardwalk-lamp', name: null, pos: at(S['violet lamp']), reach: 0.5, lift: 2.2, lines: LINES.boardwalkLamp, sound: 'chime' },
        { id: 'rowing-boat', name: null, pos: at(S.boat), reach: 0.9, lift: 0.1, lines: LINES.boat, sound: 'rope-creak' },
      );
    },
    update(field, dt, time) {
      fenUpdate(field, dt);
      const R = field.rest;
      if (R) {
        R.marker.position.y = R.y + Math.sin(time * 1.6) * 0.06;
        R.marker.rotation.y = time * 0.8;
        R.ring.material.opacity = 0.35 + Math.sin(time * 2.2) * 0.12;
      }
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(420, 800), rail: card('the near rail'), bench: field.rest?.marker.position.clone().setY(field.rest.y + 0.4) };
    },
  };

  // ---------------------------------------------------------------- Mother's Hollow
  const HOLLOW = {
    music: 'ruins', // Thareia's "Beneath the Stone": slow and dark, echoing bells, a heartbeat, a low choir
    ambience: [
      { sfx: 'frog', first: 6, gap: 12, spread: 10 },
      { sfx: 'river', first: 3, gap: 12, spread: 8 },
    ],
    get herbTotal() { return herbTotal(); },
    enter(field) {
      arrive(field, hollow.id);
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

      field.fen = { bells: 4 + Math.random() * 6 };
      // The Lantern Mother, on the step of the sunken house, watching the jetty for her children
      const mother = createLanternMother();
      mother.root.scale.setScalar(scene.lanternMother.scale);
      const home = at(S['lantern mother']);
      const rest = headingTo(home, at(S.jetty));
      field.addPerson(mother, home, rest);
      mother.tick = facing(mother, rest);
      // (her face is about 2.06 m up, and she's drawn at the scene's scale)
      const faceY = 2.06 * scene.lanternMother.scale;
      const portrait = modelPortrait(field.stage.renderer, mother, { at: [0, faceY - 0.02, 0], from: [0.38, faceY + 0.02, 1.25], fov: 24 });
      const say = (text, mood = 'calm', extra = {}) => ({ say: text, face: portrait(mood), mood, ...extra });
      // After the Ending: her veil is off and her lamp is down, and the lights have gone home
      if (flags.ending) {
        mother.dropRelic?.('veil');
        mother.dropRelic?.('lantern');
        for (let i = 0; i < 80; i++) mother.update(0.05); // (they're already down when she comes back: no fall to watch)
        field.things.push({
          // (her own id: the first thing she says after the Ending is new, however often they spoke before it)
          id: 'lantern-mother-home', name: 'The Lantern Mother', actor: mother, pos: mother.root.position, voice: 7,
          // (her face drawn when she speaks, as she is now: without the veil)
          get lines() {
            return {
              first: [say('They got home. Every one of them. Somebody should have told me a hundred years ago.', 'rest'), say('The tea has gone cold. I find I don\'t mind.', 'calm')],
              again: [say('Go on home, little witch. The lights will find their own way now.', 'rest')],
            };
          },
        });
        field.fight = null;
        return;
      }
      field.things.push(
        {
          id: 'lantern-mother', name: 'The Lantern Mother', actor: mother, pos: mother.root.position, voice: 7,
          lines: {
            first: [
              say(LINES.mother.first[0], 'hush', { do: () => mother.play('hush-now') }),
              say(LINES.mother.first[1], 'calm'),
              { say: LINES.mother.first[2], name: '', face: 'witch-calm', voice: 1 },
            ],
            again: [say(LINES.mother.again[0], 'hush', { do: () => mother.play('hush-now') })],
          },
          onEnd: (f) => encounter(f, 'B6'),
        },
        { id: 'sunken-house', name: null, pos: at(S.house), reach: 0.6, lift: 1.2, lines: LINES.house, sound: 'ui-page' },
        { id: 'hollow-lantern', name: null, pos: at(S.lantern), reach: 0.5, lift: 1.0, lines: LINES.hollowLantern, sound: 'chime' },
      );
      field.fight = { id: 'B6', foes: [{ actor: mother, alert: 'hush-now' }], zone: null };
    },
    update(field, dt) {
      fenUpdate(field, dt);
    },
    labels(field) {
      return { floor: field.paint.toWorld(790, 850) };
    },
  };

  // ---------------------------------------------------------------- every fen screen, every frame
  function fenUpdate(field, dt) {
    for (const v of field.villagers) v.tick(dt);
    // Far off under the water, a drowned bell, now and then
    const F = field.fen;
    if ((F.bells -= dt) < 0) { farBell(field); F.bells = 26 + Math.random() * 30; }
    // Walking into a fight she hasn't met yet
    const fight = field.fight;
    if (fight?.zone && !met.has(fight.id) && !field.locked && !field.talking) {
      const foot = field.paint.toPixel(field.player.pos);
      if (pointInPolygon(foot.x, foot.y, fight.zone)) encounter(field, fight.id);
    }
  }

  // ---------------------------------------------------------------- encounters
  // The foes of a fight, from the scene: [kind, x, y, height, facing x, facing y]. They stand where the scene puts
  // them; B5's turn to watch her when she's near, but B4's keep their eyes on the water, so she can come up behind one
  // and cast Moonlight on its back for a First Strike (docs/LORE.md §5). A fight already won leaves nobody standing.
  const FOE_MAKERS = {
    boglurcher: () => createBoglurcher({ hollowed: true }),
    'mire-leech': () => createMireLeech({ hollowed: true }),
    'willow-wight': () => createWillowWight(),
    'drowned-chorister': () => createDrownedChorister(),
  };
  const ALERT = { boglurcher: 'mire-grab', 'mire-leech': 'latch', 'willow-wight': 'lash', 'drowned-chorister': 'toll' };
  const WARY = { B4: 2.2, B5: 7 }; // how near she has to be before they turn to look at her

  function addFight(field, fight) {
    if (won.has(fight.id)) { field.fight = null; return; }
    const { paint } = field;
    const foes = fight.foes.map(([kind, x, y, h = 0, fx, fy]) => {
      const actor = FOE_MAKERS[kind]();
      const pos = paint.toWorld(x, y, h);
      const rest = fx !== undefined ? headingTo(pos, paint.toWorld(fx, fy)) : 0;
      actor.root.position.copy(pos);
      actor.root.rotation.y = rest;
      field.group.add(actor.root);
      if (actor.fx) field.group.add(actor.fx);
      if (h === 0) {
        actor.obstacle = { x: pos.x, z: pos.z, r: actor.radius * 0.85 };
        field.walk.obstacles.push(actor.obstacle);
      }
      const foe = { kind, actor, rest, alert: ALERT[kind] };
      const wary = WARY[fight.id] ?? 7;
      actor.tick = (dt) => {
        if (foe.down) { actor.update(dt, 0, 0); return; }
        const d = actor.root.position.distanceTo(field.player.pos);
        const want = d < wary ? headingTo(actor.root.position, field.player.pos) : rest;
        actor.root.rotation.y = turnToward(actor.root.rotation.y, want, 2.5, dt);
        actor.update(dt, 0, 0);
      };
      field.villagers.push(actor);
      const thing = {
        id: `${fight.id}-${kind}-${x}`, name: null, actor, pos: actor.root.position, lift: actor.center ?? 0.6, sound: 'ui-page',
        get lines() { return thing.behind ? LINES.foesBehind[fight.id] ?? LINES.foes[fight.id] : LINES.foes[fight.id]; },
        // She's come up behind it: is she on its back?
        onTalk: () => {
          const to = field.player.pos.clone().sub(actor.root.position).setY(0).normalize();
          const ahead = new THREE.Vector3(Math.sin(actor.root.rotation.y), 0, Math.cos(actor.root.rotation.y));
          thing.behind = game && fight.id === 'B4' && to.dot(ahead) < -0.1;
        },
        onEnd: (f) => encounter(f, fight.id, { firstStrike: thing.behind }),
      };
      field.things.push(thing);
      return foe;
    });
    field.fight = { id: fight.id, foes, zone: fight.zone ? ring(fight.zone) : null };
  }

  async function encounter(field, id, { firstStrike = false } = {}) {
    const F = FIGHTS[id];
    if (!F || field.locked || won.has(id)) return;
    met.add(id);
    field.locked = true;
    field.player.path = null;
    field.player.onArrive = null;
    field.keys?.clear?.();
    field.audio.sfx(F.sfx);
    field.player.actor.setMood?.('surprised');
    if (firstStrike) {
      // Moonlight on its back: the silver circle, and they've not even turned round
      field.player.actor.play('moonlight');
      field.audio.sfx('radiant');
      await sleep(900);
    }
    for (const foe of field.fight?.foes ?? []) {
      foe.actor.root.rotation.y = headingTo(foe.actor.root.position, field.player.pos);
      foe.actor.play(foe.alert);
    }
    await sleep(650);
    const result = await (host.encounter?.(id, { field, card: F, firstStrike }) ?? 'card');
    if (result === 'lost') {
      // She woke at her last rest; the fight waits for her
      forget(id);
      return;
    }
    field.player.actor.setMood?.('calm');
    if (result === 'won') {
      won.add(id);
      // Nobody falls: they sink, root, wake, or sit (docs/LORE.md §7), and step out of her way
      for (const foe of field.fight?.foes ?? []) {
        foe.down = true;
        foe.actor.play('ko');
        if (foe.actor.obstacle) foe.actor.obstacle.off = true;
      }
      field.things = field.things.filter((t) => !t.id?.startsWith?.(`${id}-`));
    }
    field.locked = false;
  }

  // ---------------------------------------------------------------- the rest point: a bench under a lamp-post
  function addRestPoint(field, S) {
    const { paint, group } = field;
    const bench = paint.toWorld(...S.bench);
    const stand = paint.toWorld(...S['bench, in front']);
    // Clear from afar: a silver crescent turning slowly over the bench, a column of moonlight under it, and a ring of
    // light on the planks where she sits. She never sleeps, so the moon stays full; a rest is a sit, and a save.
    const marker = new THREE.Group();
    const moonMat = toon('#f2eeff', { emissive: new THREE.Color('#b8b0ff'), emissiveIntensity: 0.9 });
    part(marker, badge(crescentShape(0.3, 0.78, 0.45), 0.06), moonMat, { rot: [0, 0, 0.5] });
    const halo = glowSprite('#e4dcff', 1.8, 0.75);
    marker.add(halo);
    const y = 2.1; // over her hat when she sits down, so it's never hidden behind her
    marker.position.copy(bench).setY(y);
    group.add(onLayer(marker));
    const column = glowSprite('#cfc8ff', 1, 0.35);
    column.center.set(0.5, 0);
    column.scale.set(0.8, 2.1, 1);
    column.position.copy(bench).setY(0);
    group.add(column);
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#dcd6ff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.copy(stand).setY(0.02);
    group.add(onLayer(ringMesh));
    field.rest = { marker, ring: ringMesh, y, bench, stand };
    field.things.push({ id: 'rest-bench', name: null, pos: stand.clone().lerp(bench, 0.5), reach: 0.6, lift: 0.6, lines: LINES.rest, sound: 'ui-page' });
  }

  // Sitting down: a slow fade, a warm chord, everyone mended, and the night saved at this bench (or Nettie's bed)
  function rest(field, where = 'bench') {
    const fade = $('fade');
    field.locked = true;
    fade.classList.add('on');
    field.audio.sfx('hearthfire');
    setTimeout(() => {
      const who = [field.player.pos, ...field.followers.filter((f) => f.actor.root.parent).map((f) => f.actor.root.position)];
      for (const p of who) field.glints.burst(p.clone().setY(p.y + 0.9), 12);
      fade.classList.remove('on');
      field.locked = false;
      field.rested = true;
      const spot = where === 'bed'
        ? { screen: hut.id, pixel: [775, 760], facing: 'up', name: "Nettie's hut" }
        : { screen: board.id, pixel: board.spots['bench, in front'], facing: 'down', name: 'the lamp-post bench' };
      if (host.rest) host.rest(field, spot);
      else {
        try {
          localStorage.setItem('witch-way:rest', JSON.stringify({ at: 'the lamp-post bench, the Long Boardwalk', bag: field.bag, time: Date.now() }));
        } catch { /* no storage here: the rest still mends everyone */ }
      }
      field.audio.sfx('heal');
      field.toast(where === 'bed' ? "Rested at Nettie's: everyone mended, and the night saved." : 'Rested: everyone mended. Saved at the lamp-post bench.', 'ui-save');
    }, 1300);
  }

  // Nettie sleeps an hour on her Hush Tea, wakes cross and rested, and joins (the game)
  async function nettieSleeps(field) {
    const fade = $('fade');
    const nettie = field.nettie;
    field.locked = true;
    nettie?.play?.('ko');
    fade.classList.add('on');
    field.audio.sfx('hearthfire');
    await sleep(1500);
    field.toast('An hour later.', 'clock');
    await sleep(1600);
    fade.classList.remove('on');
    nettie?.play?.('rise');
    await sleep(900);
    field.locked = false;
    const N2 = { id: 'nettie-wakes', name: 'Nettie', actor: nettie, pos: nettie.root.position, portrait: NP['nettie-cross'], voice: 5,
      lines: { first: [
        N('Hrmph. Who let the morning in? Oh. You.', 'nettie-cross', { mood: 'cross' }),
        N("I slept. I don't thank people, so don't wait for it.", 'nettie-sly'),
        N('Right. A lamp and a stick, and out to the fen. Mind the planks; half of them are only pretending.', 'nettie-delighted', { mood: 'happy', do: () => nettie.play?.('cheer') }),
      ] },
      onEnd: (f) => {
        field.things = field.things.filter((t) => t !== N2 && t.id !== 'nettie');
        host.storyFloor?.('B4');
        host.join?.('nettie', f, { actor: nettie });
        // an hour's sleep did everyone good: Nettie's hut is where they wake if a fight goes wrong (docs/LORE.md §5)
        host.rest?.(f, { name: "Nettie's hut" });
      },
    };
    field.things.push(N2);
    field.talk(N2);
  }

  // ---------------------------------------------------------------- the low path: fog, planks, and Hag-Sight
  // The scene's lowPath: fog puffs [x, y, radius m], the painted bridge's middle line (it holds), and the planks laid
  // on through the fog [{ from, to, holds }]. The planks that hold are part of the walkmesh; the rest are only drawn.
  const PLANK_W = 0.86;
  function buildLowPath(field, low) {
    const { paint, group } = field;
    const out = { planks: [], fog: [], glows: [], rotten: [] };

    // Planks: three boards side by side, wet and dark. The ones that don't hold are split and sagging.
    const wood = toon('#251b16', { rim: 0.4 }), woodDark = toon('#1a1411', { rim: 0.4 }), woodWet = toon('#2c211b', { rim: 0.4 });
    for (const p of low.planks) {
      const a = paint.toWorld(...p.from), b = paint.toWorld(...p.to);
      const len = a.distanceTo(b);
      const g = new THREE.Group();
      g.position.copy(a).lerp(b, 0.5);
      g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * (PLANK_W / 3);
        const jitter = Math.sin(i * 7.1 + a.x) * 0.06;
        if (p.holds) {
          part(g, new THREE.BoxGeometry(PLANK_W / 3 - 0.03, 0.05, len - 0.08 + jitter), i === 1 ? woodWet : wood, { pos: [x, 0.02, jitter * 0.5], rot: [0, jitter * 0.3, 0] });
        } else {
          // broken in the middle: two halves, one tipped into the water
          const half = (len - 0.1) / 2 - 0.06;
          part(g, new THREE.BoxGeometry(PLANK_W / 3 - 0.03, 0.05, half), i === 1 ? woodWet : woodDark, { pos: [x, 0.0, -half / 2 - 0.08], rot: [0.05, jitter, 0] });
          part(g, new THREE.BoxGeometry(PLANK_W / 3 - 0.03, 0.05, half), woodDark, { pos: [x, -0.07 - i * 0.02, half / 2 + 0.1], rot: [-0.16 - i * 0.05, -jitter, 0.08 * (i - 1)] });
        }
      }
      // What Hag-Sight shows: a pale green light along a plank that holds, and a sour violet one on one that won't
      const glowMat = new THREE.MeshBasicMaterial({ map: plankGlow(p.holds), color: p.holds ? '#b8ffd8' : '#9a5ab8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(PLANK_W + 0.3, len + 0.25), glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.07;
      glow.renderOrder = 6;
      g.add(glow);
      group.add(onLayer(g));
      out.glows.push({ mat: glowMat, holds: p.holds });
      // Its outline in painting pixels, to tell her when she tries a plank that won't hold
      if (!p.holds) {
        const side = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize().multiplyScalar(PLANK_W / 2);
        out.rotten.push([a.clone().add(side), b.clone().add(side), b.clone().sub(side), a.clone().sub(side)].map((v) => { const q = paint.toPixel(v); return [q.x, q.y]; }));
      }
      out.planks.push({ ...p, a, b });
    }
    // The painted bridge holds too: Hag-Sight lights it along its length
    for (let i = 0; i < low.bridge.length - 1; i++) {
      const a = paint.toWorld(...low.bridge[i]), b = paint.toWorld(...low.bridge[i + 1]);
      const mat = new THREE.MeshBasicMaterial({ map: plankGlow(true), color: '#b8ffd8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, a.distanceTo(b) + 0.3), mat);
      glow.rotation.x = -Math.PI / 2;
      glow.renderOrder = 6;
      const holder = new THREE.Group();
      holder.position.copy(a).lerp(b, 0.5).setY(0.07);
      holder.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      holder.add(glow);
      group.add(onLayer(holder));
      out.glows.push({ mat, holds: true });
    }

    // Fog: soft flat puffs lying low over the water and the planks, drifting, thinning under Hag-Sight. They're drawn
    // in the stage's last pass, straight onto the screen (so they blend over the planks just as over the painting),
    // with a clearing round her and her friends from the knees up, so the fog hides her boots and never her.
    const fogTex = fogTexture();
    out.holes = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
    for (const [i, [x, y, r]] of low.fog.entries()) {
      for (let k = 0; k < 2; k++) {
        const mat = fogMaterial(fogTex, out.holes);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = Math.random() * Math.PI * 2;
        const at = paint.toWorld(x, y, 0.16 + k * 0.2 + (i % 3) * 0.04);
        m.position.copy(at);
        m.renderOrder = 5;
        group.add(onLayer(m, LAYER_GLOW));
        out.fog.push({ m, mat, base: at.clone(), spin: (Math.random() - 0.5) * 0.08, drift: Math.random() * 6, amount: k ? 0.36 : 0.46 });
      }
    }
    // Near the low path: close enough that standing still there brings Hag-Sight up by itself
    out.near = low.near ? ring(low.near) : null;
    return out;
  }

  function updateLowPath(field, dt, time) {
    const L = field.fen.low, F = field.fen, player = field.player;
    // Standing still near the fog, she looks through the hag stone without being asked
    const foot = field.paint.toPixel(player.pos);
    const near = L.near && pointInPolygon(foot.x, foot.y, L.near);
    const idle = !player.path && !field.keys?.vector() && !field.talking && !field.locked;
    F.still = idle ? F.still + dt : 0;
    const want = night.sight ? 1 : near && F.still > 1.5 ? 0.7 : 0;
    F.sight += (want - F.sight) * (1 - Math.exp(-dt * 3));
    const s = F.sight;
    hagSight(s);
    for (const f of L.fog) {
      f.m.position.x = f.base.x + Math.sin(time * 0.13 + f.drift) * 0.35;
      f.m.position.z = f.base.z + Math.cos(time * 0.11 + f.drift) * 0.2;
      f.m.rotation.z += f.spin * dt;
      f.mat.uniforms.opacity.value = f.amount * (0.85 + Math.sin(time * 0.4 + f.drift) * 0.15) * (1 - s * 0.62);
    }
    // The clearings in the fog: round her, and round whoever walks with her
    const friends = field.followers.filter((f) => f.actor.root.parent).map((f) => [f.actor.root.position, f.id === 'inkblot' ? 0.6 : 1.55, f.id === 'inkblot' ? 0.25 : 0.36]);
    const who = [[player.pos, 1.75, 0.42], ...friends];
    L.holes.forEach((h, i) => fogHole(field.stage, h, who[i]));
    for (const g of L.glows) g.mat.opacity = s * (g.holds ? 0.85 + Math.sin(time * 3) * 0.12 : 0.5);
    // Trying a plank that won't hold
    F.warned -= dt;
    const dir = field.keys?.vector();
    if (dir && F.warned < 0 && L.rotten.length) {
      const ahead = field.paint.toPixel(player.pos.clone().add(new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading)).multiplyScalar(0.45)));
      if (L.rotten.some((q) => pointInPolygon(ahead.x, ahead.y, q))) warnPlank(field);
    }
  }

  function warnPlank(field) {
    field.fen.warned = 5;
    field.audio.sfx('bump');
    field.toast(night.sight ? "Not that one. It's soft right through." : "That plank's gone soft as bread. Hag-Sight would show which ones hold.", 'rope-creak');
  }

  // ---------------------------------------------------------------- the Hag-Sight button
  // The page's Hag-Sight button (H, or the button, bottom left) and a tap on a plank that won't hold. The game binds
  // this once for its field; a demo for its page.
  function bindFenControls(town) {
    const { field } = town;
    const btn = $('btn-hagsight');
    if (!btn) return;
    const toggle = () => {
      field.audio.unlock();
      night.sight = !night.sight;
      btn.setAttribute('aria-pressed', String(night.sight));
      field.audio.sfx(night.sight ? 'secret' : 'back');
    };
    btn.setAttribute('aria-pressed', String(night.sight));
    btn.addEventListener('click', toggle);
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('button, input, textarea, a')) return;
      if (e.code === 'KeyH' && !btn.hidden && !e.repeat && town.active !== false) toggle();
    });
    const canvas = town.stage.renderer.domElement;
    canvas.addEventListener('pointerup', (e) => {
      const L = field.fen?.low;
      if (!L || field.locked || field.talking || town.here.id !== murk.id || town.active === false) return;
      const p = town.stage.screenToPixel(e.clientX, e.clientY);
      if (L.rotten.some((q) => pointInPolygon(p.x, p.y, q))) warnPlank(field);
    });
  }

  // ---------------------------------------------------------------- what people say
  // A move for someone on this screen, at a line: { say, do: act('gretch', 'boots') }
  const act = (id, move) => (field) => field.things.find((t) => t.id === id)?.actor.play(move);

  // What people say. Gretch's first line is Aethermoor's (dialogue.js), and her voice is its voice: fussy, dry, kinder
  // than she lets on, and never a fool. Nettie's are docs/LORE.md's and the middle turn from docs/SLICE.md §3,
  // shortened. The Lantern Mother is LORE's "kind, and wrong": she takes them for the lost children. Lines with no name
  // are the witch's own thoughts; { who: 'witch' } lines she says out loud.
  const LINES = {
    gretch: {
      first: [
        { say: 'Wipe your boots. No, the other way. We keep the mud outside.', mood: 'cross', do: act('gretch', 'boots') },
        { say: 'Mayor Gretch. I keep this town standing, and I count everything twice. Everyone in Bogmire counts twice.', mood: 'fuss', do: act('gretch', 'count') },
        { say: "You'll have come about the lamps. Every pole in Bogmire lit violet this month, and nobody lit them.", mood: 'calm' },
        { say: "I'm glad of the light. I'm not a fool, mind. Light that comes from nowhere is going somewhere.", mood: 'fuss', do: act('gretch', 'fuss') },
        { say: "And my window boxes have gone grey as porridge. I'm sorry about the herbs. Take what you find green.", mood: 'calm', do: act('gretch', 'sigh') },
        { say: "Nettie will know. The hut with the bottles in the window. Knock, then wait, then knock again.", mood: 'happy' },
      ],
      again: [
        { say: "Nettie's hut: the bottles in the window. Knock twice. She'll pretend she didn't hear the first.", mood: 'calm' },
        { say: 'And wipe your boots on the way out, too. Her mud is her own business.', mood: 'fuss', do: act('gretch', 'boots') },
      ],
    },
    gretchFen: {
      first: [
        { say: "Out on the fen? Not without someone who knows which planks are lying. Nettie's hut. The bottles.", mood: 'fuss', do: act('gretch', 'fuss') },
      ],
    },
    inkblot: {
      first: [
        'Kraa! [Inkblot has found the moot-fire, and is warming his toes on the planks beside it.]',
        'Kraa. [He eyes the violet lamps. Every one of them was a Wickhollow flame once.]',
      ],
      again: ['Kraa. [He fluffs up against the fen damp.]'],
    },
    fire: {
      first: ['The moot-fire. Bogmire keeps it burning so nobody walks home in the dark.', "It's the only flame in town that isn't violet. It's theirs."],
      again: ['Warm hands, cold planks. Very Bogmire.'],
    },
    mast: {
      first: ['The mooring mast. The Magpie is tied up here, nodding on her rope like she wants to go again.', "Quill's knot. I watched him tie it a hundred times, and it held the first time I tried. I'm told that's luck."],
      again: ['The Magpie is tied up here. She\'ll keep.'],
    },
    mastFly: {
      first: ['The mooring mast, and the Magpie nodding on her rope like she wants to go again.', "Quill's knot. It held the first time I tried. Aboard, then?"],
      again: ['The Magpie, tied up at the mast. Aboard, then.'],
    },
    hall: {
      first: ['The moot-hall. A notice on the door, in a very firm hand: MOOT POSTPONED. THE MAYOR HAS A COLD.'],
      again: ['Still postponed. Still a cold.'],
    },
    lamp: {
      first: ["That flame is violet. Wickhollow's lanterns burn moonpetal oil, and moonpetal burns violet.", "Silas's lamp, maybe, or the one by the chapel door. It's a long way from home."],
      again: ["A long way from home. I'll bring it back."],
    },
    nettie: {
      first: [
        { say: "Healer, herbalist, witch. Two of those you can buy. The third you don't cross. Mind the jars; some bite.", face: NP['nettie-sly'] },
        { who: 'witch', say: "I've come about the lamps. Wickhollow's. Your town is burning them.", face: 'witch-calm' },
        { say: "Your lamps weren't stolen. They were called.", face: NP['nettie-calm'], mood: 'calm' },
        { say: 'A hundred years ago the water came up over Misthollow. The lamplighter led the children out, and went back for the last one.', face: NP['nettie-calm'] },
        { say: "They all got home. Nobody told her. She's still lighting the way, and every light she can't find, she borrows.", face: NP['nettie-calm'] },
        { say: "Where she takes the light, the rot comes in behind. That's your grey riverbank.", face: NP['nettie-cross'], mood: 'cross' },
        { who: 'witch', say: "So she's not a thief. She's someone who hasn't sat down in a hundred years.", face: 'witch-sly', mood: 'calm' },
        { say: "You'll have to fight her to sit her down. Then you can make her tea.", face: NP['nettie-delighted'], mood: 'happy', do: act('nettie', 'cheer') },
      ],
      again: [
        { say: "I'm Nettie, and I don't thank people. Take the moonwater from the butt if you're brewing. Three. Not four.", face: NP['nettie-sly'] },
        { say: 'Moonlight. Very pretty. Down here we use a lamp and a stick.', face: NP['nettie-cross'], mood: 'cross' },
      ],
    },
    cauldron: {
      first: ["Nettie's cauldron, and something in it that smells like a wet dog apologising.", "I don't stir another witch's pot. That's how you end up in it."],
      again: ['Still bubbling. Still apologising.'],
    },
    cauldronYours: {
      first: ["Nettie's cauldron, scrubbed out, more or less. She said I could. I'm choosing to believe her."],
      again: ['Her pot, my brew. Mind the jars.'],
    },
    rainButt: {
      first: [
        "Nettie's rain-butt, full to the lid with rain that fell by moonlight.",
        { say: 'Moonwater. Three bottles, and not a drop more: she said so twice.', do: (field) => { field.give('moonwater', 3, 'well-bucket'); field.toast("Nettie's rain-butt gives three moonwater.", 'well-bucket'); } },
      ],
      again: ['Three was the deal. The moon can fill it again tomorrow.'],
    },
    jarsLeft: {
      first: ['Jars of things in brine, lined up under her worktable. One of them blinks.', 'Mind the jars; some bite. I believe her.'],
      again: ['The one on the end is watching me.'],
    },
    jarsRight: {
      first: ['Mandrake root, wisp-sprout, something labelled NO. These are hers, not mine to pick.'],
      again: ['NO is underlined.'],
    },
    bed: {
      first: ["Nettie's bed, under a patchwork of every colour the fen has.", 'A good place to rest, later. Not while the lights are still out.'],
      again: ['Later.'],
    },
    bedRest: {
      first: ["Nettie's bed, under a patchwork of every colour the fen has.", { who: 'witch', say: 'Five minutes, and nobody tell her.', face: 'witch-sly', do: (field) => rest(field, 'bed') }],
      again: [{ who: 'witch', say: 'Five more minutes.', face: 'witch-sly', do: (field) => rest(field, 'bed') }],
    },

    // ---- the fen
    foes: {
      B4: {
        first: ['A Boglurcher and two mire leeches, grey with rot, and none of it their fault.'],
        again: ['Still grey, still in the way. The planks through the fog go round them.'],
      },
      B5: {
        first: ["A willow that's pulled up its roots, and Misthollow's choir, singing in their sleep."],
        again: ['They\'re still singing.'],
      },
    },
    foesBehind: {
      B4: { first: ["It hasn't seen me. Its back is to me, and the rot is all down its back.", 'Moonlight first, then. On its back.'] },
    },
    shrine: {
      first: ['A wayside shrine, with two candles someone in Bogmire keeps lit.', "Somebody walks out here every night to do that. I like them already."],
      again: ['The candles are still lit. Somebody cares a great deal.'],
    },
    grave: {
      first: ['An old fen grave. The rune on it still glows, faint and green: a name, in letters nobody reads any more.', "Remembered, though. Moss doesn't grow over the rune. Someone scrapes it."],
      again: ['Still glowing. Still remembered.'],
    },
    boardwalkLamp: {
      first: ["Another violet flame, hung out over the water. Wickhollow's.", 'Every lamp on this boardwalk is lit, and nobody in Bogmire lit them.'],
      again: ['Keep to the lamps, and count them. I\'ve lost count.'],
    },
    boat: {
      first: ["Someone's rowing boat, tied up and dry inside. Not mine to borrow.", "Besides, I've already borrowed a skiff this week. One's plenty."],
      again: ['Still tied up. Still not mine.'],
    },
    rest: {
      first: [
        'A bench under a lamp-post, on the last dry landing before Mother\'s Hollow.',
        { who: 'witch', say: 'Five minutes. Boots up, hat on. I never sleep on a full moon, but a sit does wonders.', face: 'witch-calm', do: (field) => rest(field) },
      ],
      again: [{ who: 'witch', say: 'Another sit, then. The moon will wait; it always does.', face: 'witch-calm', do: (field) => rest(field) }],
    },
    mother: {
      first: [
        "Hush now, hush. You're out late, little ones, and the water's up to the boards.",
        "Come in by my lamp. I've lit the whole way home for you. Every light I could find.",
        "She thinks we're the children. Every one of us, even the crow. Kind, and wrong.",
      ],
      again: ['Hush now. Stay by the light, where I can see you.'],
    },
    house: {
      first: ['The sunken house, with every window lit.', "Some of those flames will be Wickhollow's. She's been borrowing a long time."],
      again: ['Every window lit, and nobody home but her.'],
    },
    hollowLantern: {
      first: ['A lantern on a post, lit, at the edge of the jetty.', 'She keeps the way lit for somebody. For a hundred years.'],
      again: ['Still lit.'],
    },
  };

  // What Nettie and Inkblot say when she turns to them on the fen
  const partyLines = {
    nettie: () => ({
      first: [
        { say: 'Moonlight. Very pretty. Down here we use a lamp and a stick.', face: NP['nettie-sly'] },
        { say: 'Mind the planks. Half of them are only pretending.', face: NP['nettie-cross'], mood: 'cross' },
      ],
      again: [{ say: "Well? Walk on. She won't sit herself down.", face: NP['nettie-calm'] }],
    }),
    inkblot: () => ({
      first: ['Kraa. [He keeps close, and keeps one eye on every violet lamp.]'],
      again: ['Kraa! [A frog, somewhere. He pretends not to have jumped.]'],
    }),
  };

  return {
    screens: {
      [moot.id]: { data: moot, cast: MOOT },
      [hut.id]: { data: hut, cast: HUT },
      [murk.id]: { data: murk, cast: MURKWAY },
      [board.id]: { data: board, cast: BOARDWALK },
      [hollow.id]: { data: hollow, cast: HOLLOW },
    },
    images: bogmireImages,
    partyLines,
    night,
    bindFenControls,
    FEN,
  };
}

// ---------------------------------------------------------------- sounds and textures the fen shares
// A bell tolling far off: Thareia's town bell, softer, lower and further away (her sound studio's own voice)
const FAR_BELL = {
  id: 'far-bell',
  play: (t) => {
    fm(t, { f: 174.6, ratio: 2.4, index: 2.4, d: 3.4, g: 0.05, rv: 0.95, pan: -0.3 });
    fm(t + 1.7, { f: 155.6, ratio: 2.4, index: 2.2, d: 3.4, g: 0.04, rv: 0.95, pan: -0.3 });
  },
};
function farBell(field) {
  if (!field.audio.enabled) return;
  try { playSfx(FAR_BELL); } catch { /* no sound on this device */ }
}

// Looking through the hag stone: the edges of the view close in like the stone's hole, tinged green (the page's
// #hagstone). It's an overlay rather than a grade of the painting, because the cut-outs draw the painting's own pixels
// and would show ungraded through it.
function hagSight(k) {
  document.body.classList.toggle('hagsight', k > 0.35);
}

// A fog puff: its texture's alpha, faded out inside each clearing (holes: x, y the middle in drawing-buffer pixels,
// z, w the half width and height; z = 0 for none)
function fogMaterial(map, holes) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, color: { value: new THREE.Color('#aab4c8') }, opacity: { value: 0 }, holes: { value: holes } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform vec3 color; uniform float opacity; uniform vec4 holes[3];
      varying vec2 vUv;
      void main() {
        float a = texture2D(map, vUv).a * opacity;
        for (int i = 0; i < 3; i++) {
          vec4 h = holes[i];
          if (h.z > 0.0) a *= smoothstep(0.7, 1.15, length((gl_FragCoord.xy - h.xy) / h.zw));
        }
        gl_FragColor = vec4(color, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
}

// One clearing: from someone's knees to the top of their head, as wide as they are, in drawing-buffer pixels
const fv = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector2()];
function fogHole(stage, hole, who) {
  if (!who || stage.revealing) return hole.set(0, 0, 0, 0);
  const [pos, height, width] = who;
  const [a, b, c, size] = fv;
  stage.renderer.getDrawingBufferSize(size);
  const px = (v) => v.project(stage.view).set((v.x + 1) / 2 * size.x, (v.y + 1) / 2 * size.y, 0);
  px(a.copy(pos).setY(pos.y + 0.3));
  px(b.copy(pos).setY(pos.y + height));
  px(c.copy(pos).setY(pos.y + height * 0.6).add(new THREE.Vector3(width, 0, 0).applyQuaternion(stage.view.quaternion)));
  const mid = a.clone().lerp(b, 0.5);
  hole.set(mid.x, mid.y, Math.max(4, Math.abs(c.x - mid.x)), Math.max(4, Math.abs(b.y - a.y) / 2));
}

let fogTex = null;
function fogTexture() {
  if (fogTex) return fogTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // lumpy blobs near the middle...
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 26, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 14 + rand() * 20;
    const grad = g.createRadialGradient(x, y, 0, x, y, s);
    grad.addColorStop(0, `rgba(255,255,255,${0.18 + rand() * 0.14})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  // ...faded out well before the edge, so no puff shows its square
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(64, 64, 10, 64, 64, 63);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 128, 128);
  fogTex = new THREE.CanvasTexture(c);
  fogTex.colorSpace = THREE.SRGBColorSpace;
  return fogTex;
}

// A soft light the length of a plank, brightest along its middle; on a rotten plank, broken up like the wood
const glowTex = {};
function plankGlow(holds) {
  if (glowTex[holds]) return glowTex[holds];
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 10, 64, 108);
  const fade = g.createLinearGradient(0, 0, 0, 128);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.12, 'rgba(0,0,0,0)');
  fade.addColorStop(0.88, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = fade;
  g.fillRect(0, 0, 64, 128);
  if (!holds) {
    // gaps where it's rotted through
    for (const [y, h] of [[40, 10], [58, 16], [84, 8]]) g.fillRect(0, y, 64, h);
  }
  glowTex[holds] = new THREE.CanvasTexture(c);
  return glowTex[holds];
}

export { sleep };
