import * as THREE from 'three';
import moot from '../scenes/bogmire-moot-circle.json';
import hut from '../scenes/nettie-hut.json';
import murk from '../scenes/murkway.json';
import board from '../scenes/long-boardwalk.json';
import hollow from '../scenes/mothers-hollow.json';
import { bogmireImages, nettiePortraits as NP } from './assets-bogmire.js';
import { bootTown, modelPortrait } from './town.js';
import { pointInPolygon } from './field.js';
import { ring } from './paint.js';
import { WALK_SPEED } from './screen.js';
import { LAYER_GLOW } from './stage.js';
import { createGretch } from './actors/gretch.js';
import { createNettie } from './actors/nettie.js';
import { createInkblot } from './actors/inkblot.js';
import { createBoglurcher, createMireLeech } from './actors/foes.js';
import { createWillowWight } from './actors/bosses-willow.js';
import { createDrownedChorister } from './actors/bosses-chorister.js';
import { createLanternMother } from './actors/bosses-lantern.js';
import { createHollowedPatch } from './actors/hollowed-patch.js';
import { HERBS } from './data/herbs.js';
import { turnToward, toon, part, badge, crescentShape, glowSprite, glowTexture, onLayer } from './actors/kit.js';
import { playSfx, fm } from '../vendor/thareia-sfx/sounds.js';

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
// The fights themselves are in the battle demo: here each one is an encounter card, and after it she carries on.
// Once she has met Nettie, Nettie and Inkblot follow her out onto the fen.

const $ = (id) => document.getElementById(id);
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// What's true for the whole night, whichever screen she's on
const night = {
  fen: false, // she's been out on the fen: from then on the basket counts its herbs too
  cleaned: new Set(), // Hollowed patches she's cleaned (by id), which stay in bloom
  met: new Set(), // encounter cards already shown: 'B4', 'B5', 'B6'
  sight: false, // Hag-Sight switched on
  music: null, // what's playing, so the fen's screens don't restart the same piece
};
const TOWN_HERBS = moot.herbs.length + hut.herbs.length;
const ALL_HERBS = TOWN_HERBS + murk.hollowed.length + board.herbs.length;
const herbTotal = () => (night.fen ? ALL_HERBS : TOWN_HERBS);
// A screen's music, unless it's already playing (so the marsh piece carries on from the moot-circle to the fen)
const tune = (id) => (night.music === id ? undefined : id);

// Someone who turns to face whoever talks to them, and back to their own business after
function facing(actor, rest) {
  let faceTo = null;
  actor.lookAt ??= (angle) => { faceTo = angle; };
  return (dt) => {
    const before = actor.root.rotation.y;
    actor.root.rotation.y = turnToward(before, faceTo ?? rest, 5, dt);
    const turn = Math.atan2(Math.sin(actor.root.rotation.y - before), Math.cos(actor.root.rotation.y - before)) / Math.max(dt, 1e-3);
    actor.update(dt, 0, turn);
  };
}

// Every screen starts from the painting as painted, with none of the last screen's fen business, and only the
// Murkway shows the Hag-Sight button. Once she's out on the fen the basket counts its herbs too.
function arrive(field, id, music) {
  night.music = music;
  night.fen ||= [murk.id, board.id, hollow.id].includes(id);
  field.herbTotal = herbTotal();
  if (!$('basket').hidden) field.showBasket();
  Object.assign(field, { fen: null, fight: null, patches: null, rest: null });
  hagSight(0);
  $('btn-hagsight').hidden = id !== murk.id;
}

// ---------------------------------------------------------------- the moot-circle
const MOOT = {
  get music() { return tune('marsh'); }, // Thareia's "Gloomfen Drift"
  ambience: [
    { sfx: 'frog', first: 2, gap: 5, spread: 7 },
    { sfx: 'crickets', first: 7, gap: 9, spread: 8 },
    { sfx: 'owl', first: 35, gap: 35, spread: 40 },
  ],
  get herbTotal() { return herbTotal(); },
  enter(field) {
    arrive(field, moot.id, 'marsh');
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

    // Inkblot pecks about the circle and flies up to a post, a lamp arm or the mast deck if she crowds him
    const top = (base, topY) => at(base).setY(paint.heightAbove(base, topY));
    const crow = field.addCrow(at([620, 545]), {
      ground: [[620, 545], [700, 575], [900, 600], [980, 520], [560, 520], [860, 620], [1230, 580], [480, 540]].map((p) => at(p)),
      high: [top([427, 598], 555), top([737, 736], 649), top([908, 733], 646), top([1358, 632], 562), top([1478, 634], 542), top([519, 588], 318)],
    });

    field.things.push(
      {
        id: 'gretch', name: 'Mayor Gretch', actor: gretch, pos: gretch.root.position, voice: 2, lines: LINES.gretch,
        portrait: (line) => portrait(line.mood ?? 'calm'),
        onLine: () => gretch.play('talk'),
        onEnd: () => gretch.setMood('calm'),
      },
      { id: 'inkblot', name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, lines: LINES.inkblot },
      { id: 'moot-fire', name: null, pos: at(S.fire), reach: 1.0, lift: 0.5, lines: LINES.fire, sound: 'campfire' },
      { id: 'mast', name: null, pos: at(S.mast), lift: 1.0, lines: LINES.mast, sound: 'rope-creak' },
      { id: 'moot-hall', name: null, pos: at(S['hall door']), lift: 0.8, lines: LINES.hall, sound: 'sealed-door' },
      { id: 'violet-lamp', name: null, pos: at(S['violet lamp']), reach: 0.45, lift: 2.3, lines: LINES.lamp, sound: 'chime' },
    );
    field.plantHerbs(scene.herbs, 1.6, 0.45);
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
  get music() { return tune('hearth'); }, // the synth's quiet campfire piece: slow bells and an ember crackle, softer than the fen outside
  ambience: [{ sfx: 'campfire', first: 4, gap: 9, spread: 8 }],
  get herbTotal() { return herbTotal(); },
  enter(field) {
    arrive(field, hut.id, 'hearth');
    const { paint, scene } = field;
    const S = scene.spots;
    const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

    // Nettie, by her hearth, with the room (and the door) in front of her
    const nettie = createNettie();
    const home = at(S.nettie);
    const rest = headingTo(home, at([760, 700]));
    field.addPerson(nettie, home, rest);
    nettie.tick = facing(nettie, rest);

    field.things.push(
      {
        id: 'nettie', name: 'Nettie', actor: nettie, pos: nettie.root.position, portrait: NP['nettie-calm'], voice: 5, lines: LINES.nettie,
        onEnd: () => nettie.setMood('calm'),
      },
      { id: 'cauldron', name: null, pos: at(S.cauldron), lift: 0.8, lines: LINES.cauldron, sound: 'campfire' },
      { id: 'rain-butt', name: null, pos: at(S['rain-butt']), reach: 0.45, lift: 0.9, lines: LINES.rainButt, sound: 'well-bucket' },
      { id: 'jars-left', name: null, pos: at(S['jars, left']), lift: 0.7, lines: LINES.jarsLeft, sound: 'ui-page' },
      { id: 'jars-right', name: null, pos: at(S['jars, right']), lift: 1.2, lines: LINES.jarsRight, sound: 'ui-page' },
      { id: 'bed', name: null, pos: at(S.bed), reach: 0.4, lift: 0.4, lines: LINES.bed, sound: 'ui-page' },
    );
    field.plantHerbs(scene.herbs, 1.6, 0.45);
  },
  update(field, dt) {
    for (const v of field.villagers) v.tick(dt);
  },
  labels(field) {
    const card = cardTop(field);
    return { floor: field.paint.toWorld(775, 650), cauldron: card('hearth and cauldron'), gate: card('the gate and the front rail') };
  },
};

// ---------------------------------------------------------------- the Murkway
const MURKWAY = {
  get music() { return tune('marsh'); },
  ambience: [
    { sfx: 'frog', first: 1.5, gap: 4, spread: 6 },
    { sfx: 'river', first: 6, gap: 14, spread: 10 },
    { sfx: 'owl', first: 28, gap: 40, spread: 30 },
  ],
  get herbTotal() { return herbTotal(); },
  enter(field) {
    arrive(field, murk.id, 'marsh');
    const { paint, scene } = field;
    const S = scene.spots;
    const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

    field.fen = { bells: 18 + Math.random() * 10, still: 0, sight: 0, warned: 0 };
    addFight(field, scene.fight);
    field.fen.low = buildLowPath(field, scene.lowPath);
    plantHollowed(field, scene.hollowed);
    field.things.push(
      { id: 'shrine', name: null, pos: at(S.shrine), lift: 0.8, reach: 0.5, lines: LINES.shrine, sound: 'ui-page' },
      { id: 'fen-grave', name: null, pos: at(S['rune stone']), lift: 0.6, reach: 0.5, lines: LINES.grave, sound: 'wisp' },
    );
    joinParty(field);
  },
  update(field, dt, time) {
    fenUpdate(field, dt);
    updateLowPath(field, dt, time);
    // Patches still Hollowed (the field updates the ones in bloom, with the other herbs)
    for (const t of field.patches) if (!t.herb) t.patch.update(dt);
  },
  labels(field) {
    const card = cardTop(field);
    return { floor: field.paint.toWorld(420, 700), rail: card('the bridge, near rail'), fog: field.paint.toWorld(1150, 700, 1.2) };
  },
};

// ---------------------------------------------------------------- the Long Boardwalk
const BOARDWALK = {
  get music() { return tune('marsh'); },
  ambience: [
    { sfx: 'frog', first: 2, gap: 5, spread: 7 },
    { sfx: 'river', first: 9, gap: 16, spread: 10 },
  ],
  get herbTotal() { return herbTotal(); },
  enter(field) {
    arrive(field, board.id, 'marsh');
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
    joinParty(field);
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
  get music() { return tune('ruins'); }, // Thareia's "Beneath the Stone": slow and dark, echoing bells, a heartbeat, a low choir
  ambience: [
    { sfx: 'frog', first: 6, gap: 12, spread: 10 },
    { sfx: 'river', first: 3, gap: 12, spread: 8 },
  ],
  get herbTotal() { return herbTotal(); },
  enter(field) {
    arrive(field, hollow.id, 'ruins');
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
    joinParty(field);
  },
  update(field, dt, time) {
    fenUpdate(field, dt);
  },
  labels(field) {
    return { floor: field.paint.toWorld(790, 850) };
  },
};

// Just above a cut-out's card, for its label behind the scenes
function cardTop(field) {
  return (name) => {
    const c = field.stage.cutouts.cards.find((k) => k.name === name);
    if (!c) return null;
    const box = new THREE.Box3().setFromObject(c.mesh);
    return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
  };
}

// ---------------------------------------------------------------- every fen screen, every frame
function fenUpdate(field, dt) {
  for (const v of field.villagers) v.tick(dt);
  followParty(field, dt);
  // Far off under the water, a drowned bell, now and then
  const F = field.fen;
  if ((F.bells -= dt) < 0) { farBell(field); F.bells = 26 + Math.random() * 30; }
  // Walking into a fight she hasn't met yet
  const fight = field.fight;
  if (fight?.zone && !night.met.has(fight.id) && !field.locked && !field.talking) {
    const foot = field.paint.toPixel(field.player.pos);
    if (pointInPolygon(foot.x, foot.y, fight.zone)) encounter(field, fight.id);
  }
}

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

// ---------------------------------------------------------------- encounters
// Each fight's card: its name, its foes, and where to play it. After the card, she carries on.
const FIGHTS = {
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

// The foes of a fight, from the scene: [kind, x, y, height, facing x, facing y]. They stand where the scene puts them,
// turn to watch her when she's near, and step into view of the card when she walks into their zone or taps one.
const FOE_MAKERS = {
  boglurcher: () => createBoglurcher({ hollowed: true }),
  'mire-leech': () => createMireLeech({ hollowed: true }),
  'willow-wight': () => createWillowWight(),
  'drowned-chorister': () => createDrownedChorister(),
};
const ALERT = { boglurcher: 'mire-grab', 'mire-leech': 'latch', 'willow-wight': 'lash', 'drowned-chorister': 'toll' };

function addFight(field, fight) {
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
    actor.tick = (dt) => {
      // watch her once she's close
      const d = actor.root.position.distanceTo(field.player.pos);
      const want = d < 7 ? headingTo(actor.root.position, field.player.pos) : rest;
      actor.root.rotation.y = turnToward(actor.root.rotation.y, want, 2.5, dt);
      actor.update(dt, 0, 0);
    };
    field.villagers.push(actor);
    field.things.push({
      id: `${fight.id}-${kind}-${x}`, name: null, actor, pos: actor.root.position, lift: actor.center ?? 0.6,
      lines: LINES.foes[fight.id], sound: 'ui-page', onEnd: (f) => encounter(f, fight.id),
    });
    return foe;
  });
  field.fight = { id: fight.id, foes, zone: fight.zone ? ring(fight.zone) : null };
}

function encounter(field, id) {
  const F = FIGHTS[id];
  if (!F || field.locked) return;
  night.met.add(id);
  field.locked = true;
  field.player.path = null;
  field.player.onArrive = null;
  field.audio.sfx(F.sfx);
  field.player.actor.setMood?.('surprised');
  for (const foe of field.fight?.foes ?? []) {
    foe.actor.root.rotation.y = headingTo(foe.actor.root.position, field.player.pos);
    foe.actor.play(foe.alert);
  }
  // FF9 cuts to its battles with a swirl; this is a violet flash, then the card
  const fade = $('fade');
  setTimeout(() => fade.classList.add('on'), 650);
  setTimeout(() => {
    fade.classList.remove('on');
    $('enc-kicker').textContent = F.kicker;
    $('enc-name').textContent = F.name;
    $('enc-foes').replaceChildren(...F.foes.map(([name, what]) => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = name;
      const span = document.createElement('span');
      span.textContent = what;
      li.append(b, span);
      return li;
    }));
    $('enc-note').textContent = F.note;
    $('enc-link').href = `hollow-battle.html#${id}`;
    $('encounter').dataset.fight = id;
    $('encounter').hidden = false;
    $('enc-go').focus({ preventScroll: true });
    field.audio.sfx('ui-open');
  }, 1150);
}

function closeEncounter(field) {
  const card = $('encounter');
  if (card.hidden) return;
  card.hidden = true;
  field.locked = false;
  field.player.actor.setMood?.('calm');
  field.audio.sfx('back');
}

// ---------------------------------------------------------------- Hollowed patches: clean the patch before you pick
function plantHollowed(field, list) {
  const { paint, scene } = field;
  field.patches = [];
  for (const [kind, x, y, lift = 0] of list) {
    const id = `${scene.id}:${kind}:${x},${y}`;
    if (field.picked.has(id)) continue;
    const patch = createHollowedPatch(kind, { glow: 0.5, cleaned: night.cleaned.has(id) });
    const pos = paint.toWorld(x, y, lift);
    patch.root.position.copy(pos);
    patch.root.rotation.y = Math.random() * Math.PI * 2;
    patch.root.scale.setScalar(1.7);
    field.group.add(patch.root);
    const name = HERBS[kind].name.toLowerCase();
    const thing = {
      id, patch, pos, name: null, lift: 0.2, sound: 'ui-page', visits: 0,
      get lines() { return { first: LINES.hollowed[patch.state](name) }; },
      onEnd: (f) => cleanStep(f, thing),
    };
    const bloom = () => Object.assign(thing, { herb: kind, plant: patch, group: patch.root, name: HERBS[kind].name });
    thing.bloom = bloom;
    if (patch.state === 'bloomed') bloom();
    field.things.push(thing);
    field.patches.push(thing);
  }
}

// After she's looked at a grey patch: Moonlight shows the rot. After she's seen the rot: witchfire burns it off.
function cleanStep(field, thing) {
  const { patch } = thing;
  const witch = field.player.actor;
  if (patch.state === 'grey') {
    field.audio.sfx('radiant');
    witch.play('moonlight', () => {
      patch.reveal();
      field.audio.sfx('rot');
      field.toast('Moonlight shows the rot, wound round the roots.', 'wisp');
    });
  } else if (patch.state === 'shown') {
    witch.play('cast', () => {
      night.cleaned.add(thing.id);
      field.audio.sfx('burn');
      patch.burn(() => {
        thing.bloom();
        field.glints.burst(thing.pos.clone().setY(thing.pos.y + 0.3), 16);
        field.toast(`Witchfire burns nothing that belongs. The ${HERBS[thing.patch.kind].name.toLowerCase()} blooms.`, 'secret');
      });
    });
  }
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

  // Fog: soft flat puffs lying low over the water and the planks, drifting, thinning under Hag-Sight. They're drawn in
  // the stage's last pass, straight onto the screen (so they blend over the planks just as over the painting), with a
  // clearing round her and her friends from the knees up, so the fog hides her boots and never her.
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
  // The clearings in the fog: round her, and round Nettie and Inkblot if they're with her
  const who = [[player.pos, 1.75, 0.42], party.on && [party.nettie.root.position, 1.55, 0.36], party.on && [party.inkblot.root.position, 0.6, 0.25]];
  who.forEach((w, i) => fogHole(field.stage, L.holes[i], w));
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

// Looking through the hag stone: the edges of the view close in like the stone's hole, tinged green (bogmire.html's
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
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#dcd6ff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(stand).setY(0.02);
  group.add(onLayer(ring));
  field.rest = { marker, ring, y, bench, stand };
  field.things.push({ id: 'rest-bench', name: null, pos: stand.clone().lerp(bench, 0.5), reach: 0.6, lift: 0.6, lines: LINES.rest, sound: 'ui-page' });
}

// Sitting down: a slow fade, a warm chord, everyone mended, and the night saved at this bench
function rest(field) {
  const fade = $('fade');
  field.locked = true;
  fade.classList.add('on');
  field.audio.sfx('hearthfire');
  setTimeout(() => {
    const who = [field.player.pos, party.on && party.nettie?.root.position, party.on && party.inkblot?.root.position].filter(Boolean);
    for (const p of who) field.glints.burst(p.clone().setY(p.y + 0.9), 12);
    fade.classList.remove('on');
    field.locked = false;
    field.rested = true;
    try {
      localStorage.setItem('witch-way:rest', JSON.stringify({ at: 'the lamp-post bench, the Long Boardwalk', basket: field.basket, items: field.items, time: Date.now() }));
    } catch { /* no storage here: the rest still mends everyone */ }
    field.audio.sfx('heal');
    field.toast('Rested: everyone mended. Saved at the lamp-post bench.', 'ui-save');
  }, 1300);
}

// ---------------------------------------------------------------- Nettie and Inkblot, following her out on the fen
const party = { nettie: null, inkblot: null, trail: [], on: false };
function joinParty(field) {
  party.on = (field.visits.get('nettie') ?? 0) > 0;
  if (!party.on) return;
  party.nettie ??= createNettie();
  party.inkblot ??= createInkblot();
  const { nettie, inkblot } = party;
  field.group.add(nettie.root, nettie.fx, inkblot.root, inkblot.fx);
  // Where she came in, and which way she's walking: they come in behind her
  const P = field.player.pos;
  const foot = field.paint.toPixel(P);
  const arrival = Object.values(field.scene.arrivals).reduce((best, a) => {
    const d = Math.hypot(a.pixel[0] - foot.x, a.pixel[1] - foot.y);
    return !best || d < best.d ? { a, d } : best;
  }, null)?.a;
  const into = arrival?.walk ? field.paint.toWorld(...arrival.walk).sub(P).setY(0).normalize() : new THREE.Vector3(0, 0, -1);
  const behind = (d) => P.clone().addScaledVector(into, -d);
  nettie.root.position.copy(behind(0.9));
  inkblot.root.position.copy(behind(1.7));
  nettie.root.rotation.y = inkblot.root.rotation.y = Math.atan2(into.x, into.z);
  party.trail = [behind(2.2), behind(1.7), behind(1.2), behind(0.7), behind(0.2), P.clone()];
  field.things.push(
    { id: 'nettie-fen', name: 'Nettie', actor: nettie, pos: nettie.root.position, portrait: NP['nettie-calm'], voice: 5, lines: LINES.nettieFen, onEnd: () => nettie.setMood('calm') },
    { id: 'inkblot-fen', name: 'Inkblot', actor: inkblot, pos: inkblot.root.position, portrait: 'inkblot', voice: 6, lines: LINES.inkblotFen, lift: 0.3 },
  );
}

function followParty(field, dt) {
  if (!party.on) return;
  const P = field.player.pos, T = party.trail;
  if (T[T.length - 1].distanceTo(P) > 0.1) {
    T.push(P.clone());
    if (T.length > 80) T.shift();
  }
  // A point `d` back along her trail
  const back = (d) => {
    let left = d;
    for (let i = T.length - 1; i > 0; i--) {
      const seg = T[i].distanceTo(T[i - 1]);
      if (seg >= left) return T[i].clone().lerp(T[i - 1], left / seg);
      left -= seg;
    }
    return T[0].clone();
  };
  const talking = field.talking?.thing;
  step(party.nettie, back(0.95), 1.15, talking?.actor === party.nettie);
  step(party.inkblot, back(1.8), 1.3, talking?.actor === party.inkblot);
  function step(actor, target, pace, still) {
    const pos = actor.root.position;
    const to = target.sub(pos).setY(0);
    const dist = to.length();
    let speed = 0;
    const before = actor.root.rotation.y;
    if (dist > 0.06 && !still) {
      speed = Math.min(WALK_SPEED * pace, dist / Math.max(dt, 1e-3));
      pos.addScaledVector(to.normalize(), speed * dt);
      actor.root.rotation.y = turnToward(before, Math.atan2(to.x, to.z), 10, dt);
    } else {
      actor.root.rotation.y = turnToward(before, headingTo(pos, P), 3, dt);
    }
    pos.y = field.walk.heightAt(pos.x, pos.z, pos.y);
    const turn = Math.atan2(Math.sin(actor.root.rotation.y - before), Math.cos(actor.root.rotation.y - before)) / Math.max(dt, 1e-3);
    actor.update(dt, speed > 0.2 ? speed : 0, turn);
  }
}

// ---------------------------------------------------------------- the Hag-Sight button and the encounter card
function bindFenControls(game) {
  const { field } = game;
  const btn = $('btn-hagsight');
  const toggle = () => {
    field.audio.unlock();
    night.sight = !night.sight;
    btn.setAttribute('aria-pressed', String(night.sight));
    field.audio.sfx(night.sight ? 'secret' : 'back');
  };
  btn.addEventListener('click', toggle);
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('button, input, textarea, a')) return;
    if (e.code === 'KeyH' && !btn.hidden && !e.repeat) toggle();
  });
  $('enc-go').addEventListener('click', () => closeEncounter(field));
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('encounter').hidden) closeEncounter(field); });
  // A tap on a plank that won't hold
  const canvas = game.stage.renderer.domElement;
  canvas.addEventListener('pointerup', (e) => {
    const L = field.fen?.low;
    if (!L || field.locked || field.talking || game.here.id !== murk.id) return;
    const p = game.stage.screenToPixel(e.clientX, e.clientY);
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
  rainButt: {
    first: [
      "Nettie's rain-butt, full to the lid with rain that fell by moonlight.",
      { say: 'Moonwater. Three bottles, and not a drop more: she said so twice.', do: (field) => { field.give('moonwater', 3); field.toast("Nettie's rain-butt gives three moonwater.", 'well-bucket'); } },
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

  // ---- the fen
  // A Hollowed patch, by what she can see of it
  hollowed: {
    grey: (name) => [
      `This was ${name}. Grey as ash now, and cracked right through. It's forgotten what it is.`,
      "Clean the patch before you pick. Moonlight first, to see where the rot's got in.",
    ],
    shown: (name) => [`There it is: the rot, wound round the ${name}'s roots like black string.`, 'Witchfire burns nothing that belongs.'],
    burning: () => ['Burning clean. Give it a moment.'],
    bloomed: () => [],
  },
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
  shrine: {
    first: ['A wayside shrine, with two candles someone in Bogmire keeps lit.', "Somebody walks out here every night to do that. I like them already."],
    again: ['The candles are still lit. Somebody cares a great deal.'],
  },
  grave: {
    first: ['An old fen grave. The rune on it still glows, faint and green: a name, in letters nobody reads any more.', "Remembered, though. Moss doesn't grow over the rune. Someone scrapes it."],
    again: ['Still glowing. Still remembered.'],
  },
  nettieFen: {
    first: [
      { say: 'Moonlight. Very pretty. Down here we use a lamp and a stick.', face: NP['nettie-sly'] },
      { say: 'Mind the planks. Half of them are only pretending.', face: NP['nettie-cross'], mood: 'cross' },
    ],
    again: [{ say: "Well? Walk on. She won't sit herself down.", face: NP['nettie-calm'] }],
  },
  inkblotFen: {
    first: ['Kraa. [He keeps close, and keeps one eye on every violet lamp.]'],
    again: ['Kraa! [A frog, somewhere. He pretends not to have jumped.]'],
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

bootTown({
  screens: {
    [moot.id]: { data: moot, cast: MOOT },
    [hut.id]: { data: hut, cast: HUT },
    [murk.id]: { data: murk, cast: MURKWAY },
    [board.id]: { data: board, cast: BOARDWALK },
    [hollow.id]: { data: hollow, cast: HOLLOW },
  },
  start: moot.id,
  images: bogmireImages,
}).then((game) => {
  bindFenControls(game);
  game.night = night;
  game.party = party;
}).catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
