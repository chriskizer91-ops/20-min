import * as THREE from 'three';
import moot from '../scenes/bogmire-moot-circle.json';
import hut from '../scenes/nettie-hut.json';
import { bogmireImages, nettiePortraits as NP } from './assets-bogmire.js';
import { bootTown, modelPortrait } from './town.js';
import { createGretch } from './actors/gretch.js';
import { createNettie } from './actors/nettie.js';
import { turnToward } from './actors/kit.js';

// Bogmire, the fen town on stilts (docs/SLICE.md, screens 9 and 10): the moot-circle, where Mayor Gretch keeps the
// mud outside and Inkblot warms his toes by the fire, and Nettie's hut, where the middle turn of the story is told.
// Nettie's door is the bottle-lined cottage on the moot-circle's left; the gate at the bottom of her hut leads back
// out. The lamps are violet: every one burns a flame borrowed from Wickhollow.

const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const HERBS_IN_TOWN = moot.herbs.length + hut.herbs.length;

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

// ---------------------------------------------------------------- the moot-circle
const MOOT = {
  music: 'marsh', // Thareia's "Gloomfen Drift"
  ambience: [
    { sfx: 'frog', first: 2, gap: 5, spread: 7 },
    { sfx: 'crickets', first: 7, gap: 9, spread: 8 },
    { sfx: 'owl', first: 35, gap: 35, spread: 40 },
  ],
  herbTotal: HERBS_IN_TOWN,
  enter(field) {
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
  music: 'hearth', // the synth's quiet campfire piece: slow bells and an ember crackle, softer than the fen outside
  ambience: [{ sfx: 'campfire', first: 4, gap: 9, spread: 8 }],
  herbTotal: HERBS_IN_TOWN,
  enter(field) {
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

// Just above a cut-out's card, for its label behind the scenes
function cardTop(field) {
  return (name) => {
    const c = field.stage.cutouts.cards.find((k) => k.name === name);
    const box = new THREE.Box3().setFromObject(c.mesh);
    return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
  };
}

// A move for someone on this screen, at a line: { say, do: act('gretch', 'boots') }
const act = (id, move) => (field) => field.things.find((t) => t.id === id)?.actor.play(move);

// What people say. Gretch's first line is Aethermoor's (dialogue.js), and her voice is its voice: fussy, dry, kinder
// than she lets on, and never a fool. Nettie's are docs/LORE.md's and the middle turn from docs/SLICE.md §3,
// shortened. Lines with no name are the witch's own thoughts; { who: 'witch' } lines she says out loud.
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
};

bootTown({
  screens: { [moot.id]: { data: moot, cast: MOOT }, [hut.id]: { data: hut, cast: HUT } },
  start: moot.id,
  images: bogmireImages,
}).catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
