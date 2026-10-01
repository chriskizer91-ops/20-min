import * as THREE from 'three';
import inside from '../../scenes/cottage-inside.json';
import garden from '../../scenes/cottage-garden.json';
import square from '../../scenes/wickhollow-square.json';
import river from '../../scenes/sable-riverbank.json';
import { wickhollowImages, rosalindPortraits as RP } from '../assets-wickhollow.js';
import { SQUARE as SQUARE_CAST } from '../field.js';
import { SQUARE_HERBS } from '../data/herbs.js';
import { createAirship } from '../actors/airship.js';
import { createLampMoth } from '../actors/foes.js';
import { createRosalind } from '../actors/rosalind.js';
import { createQuill } from '../actors/quill.js';
import quillPortrait from '../../art/portraits/quill.webp';
import quillHappy from '../../art/portraits/quill-happy.webp';
import { toon, part, cyl, taperedTube, onLayer, INK } from '../actors/kit.js';
import { merge } from '../actors/party-kit.js';
import { headingTo, cardTop, sleep } from './common.js';

// Wickhollow, the witch's village (docs/SLICE.md, screens 1 to 4), as four painted screens joined by doors: her
// cottage, where the opening ends (the armchair is her rest point, and the cauldron is where she brews); her garden,
// where she learns to gather and finds her lavender gone grey; the well square, with Hilde, Agnes, Inkblot and the
// square's herbs exactly as the square demo has them; and the Sable riverbank, where Quill's skiff, the Magpie, sits
// cold at the old jetty, lamp-moths carry violet flames downriver, nightrose grows by the path and Rosalind waits for
// someone to bring her a rose. Cottage <-> garden <-> square <-> riverbank. The square's other two ways out lead to
// the Gloamwood (src/areas/gloamwood.js): the lane down to the lantern path, and the stone bridge.
//
// createWickhollow(host) -> { screens, images }. See src/areas/common.js for the host. In the game (host.game) the
// square is where Inkblot joins, Hilde swaps her Horseshoe charm for a Heartsease Tonic, the well gives the night's
// moonwater, Quill opens his swap shop, and the Magpie, once she's Quill's swap made, takes off from the jetty.

const touch = () => matchMedia('(pointer: coarse)').matches;
const night = [{ sfx: 'crickets', first: 3, gap: 6, spread: 6 }, { sfx: 'owl', first: 20, gap: 25, spread: 30 }];
const HERBS_IN_TOWN = garden.herbs.length + SQUARE_HERBS.length + river.herbs.length;

export function createWickhollow(host) {
  const W = host.state('wickhollow', { tutorial: false, gifted: false, hilde: false, inkblotMet: false });
  const flags = host.flags ?? {};
  const game = !!host.game;
  const say = (text, extra = {}) => ({ say: text, ...extra });
  const witch = (text, face = 'witch-calm', extra = {}) => ({ who: 'witch', say: text, face, ...extra });

  // ---------------------------------------------------------------- 1. the cottage, inside
  // Her armchair is where she rests: it mends everyone and saves the night there
  function rest(field) {
    const p = field.player;
    field.glints.burst(p.pos.clone().setY(p.pos.y + 1.0), 30);
    p.actor.setMood?.('happy');
    field.rested = { at: field.scene.id, time: field.time };
    field.toast('Rested in the armchair: mended, and the night saved here.', 'hearthfire');
    host.rest?.(field, { screen: inside.id, pixel: inside.spots.armchair, facing: 'down', name: 'her armchair' });
  }

  const INSIDE = {
    music: 'wickhollow',
    ambience: [{ sfx: 'campfire', first: 0.5, gap: 2.6, spread: 0.5 }], // the hearth, crackling on and on
    herbTotal: HERBS_IN_TOWN,
    enter(field) {
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
      field.things.push(
        { id: 'armchair', name: null, pos: at(S.armchair), reach: 0.45, lift: 0.7, lines: LINES.armchair, sound: 'ui-page' },
        // The cauldron opens the brewing screen where there is one (src/brew/ui.js, openCauldron)
        {
          id: 'cauldron', name: null, pos: at(S.cauldron), reach: 0.5, lift: 0.9, sound: 'campfire',
          get lines() { return host.brew ? cauldronLines(field) : LINES.cauldron; },
          onEnd: (f) => host.brew?.(f, 'cottage'),
        },
        { id: 'round-window', name: null, pos: at(S['round window']), reach: 0.4, lift: 2.3, lines: LINES.window, sound: 'chime' },
        { id: 'worktable', name: null, pos: at(S.worktable), reach: 0.45, lift: 0.8, lines: LINES.worktable, sound: 'ui-page' },
        { id: 'chest', name: null, pos: at(S.chest), reach: 0.4, lift: 0.4, lines: LINES.chest, sound: 'chest' },
        { id: 'broom', name: null, pos: at(S.broom), reach: 0.35, lift: 0.9, lines: LINES.broom, sound: 'ui-page' },
      );
    },
    labels(field) {
      return { floor: field.paint.toWorld(780, 760) };
    },
  };

  // What she says at her own pot, before it opens: the brewing tutorial the first time (docs/SLICE.md screen 1)
  function cauldronLines(field) {
    const herbs = Object.keys(field.bag).some((id) => ['lavender', 'moonpetal', 'witchs_bells', 'nightrose', 'chapel_moss', 'silver_mugwort', 'ember_star_lily', 'wisp_sprout', 'bogwick', 'glowcap', 'mandrake'].includes(id));
    if (!field.has('moonwater')) return { first: ['My cauldron, over a good fire. Every brew starts with a bottle of moonwater, and mine are in the chest.'] };
    if (!herbs) return { first: ['My cauldron, over a good fire. Nothing in it yet.', "The garden first. Moonwater, witchfire, and whatever the garden gives me."] };
    return {
      first: [
        "My cauldron. Moonwater, up to three herbs, a stir, and witchfire to bless it.",
        "Witch's bells and moonwater make a Heartsease Tonic. One sprig, mind: two is a dud.",
      ],
      again: ['Moonwater, herbs, a stir, witchfire. Then we talk.'],
    };
  }

  // ---------------------------------------------------------------- 2. the cottage garden
  // The grey bed: the painting's own lavender, drained of colour in place (a card over it that shows the painting's
  // pixels grey), and the rot trail Moonlight shows, down the path and out of the gate.
  const G = { trail: null, patch: null };

  const GARDEN = {
    music: 'wickhollow',
    ambience: night,
    herbTotal: HERBS_IN_TOWN,
    enter(field) {
      const { paint, scene } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
      const patch = rotPatch(paint, field.stage.painting, [1190, 706], [62, 40], [1188, 742]);
      field.group.add(patch.mesh);
      G.patch = patch;
      G.trail = rotTrail(field, scene['rot trail']);
      field.things.push(
        { id: 'grey-bed', name: null, pos: at(S['grey bed']), reach: 0.55, lift: 0.45, lines: LINES.greyBed, sound: 'ui-page' },
        { id: 'birdbath', name: null, pos: at(S.birdbath), reach: 0.35, lift: 0.8, lines: LINES.birdbath, sound: 'well-bucket' },
      );
      field.plantHerbs(scene.herbs, 1.6, 0.45);
      // The gathering tutorial: the first time she steps out, a word on how to pick
      if (!W.tutorial) {
        W.tutorial = true;
        setTimeout(() => field.scene.id === garden.id && !field.talking && field.toast(touch()
          ? 'The garden. Tap anything that glints to gather it into your basket.'
          : 'The garden. Walk up to anything that glints and press Space to gather it, or click it.', 'chime'), 1600);
      }
    },
    update(field, dt, time) {
      G.patch.uniforms.time.value = time;
      const T = G.trail;
      if (T.t >= 0) {
        T.t += dt;
        for (const [i, m] of T.marks.entries()) {
          const on = THREE.MathUtils.smoothstep(T.t, 0.2 + i * 0.16, 0.6 + i * 0.16);
          const off = 1 - THREE.MathUtils.smoothstep(T.t, 9 + i * 0.1, 11 + i * 0.1);
          m.material.opacity = on * off * (0.85 + Math.sin(time * 3 + i) * 0.1);
        }
        if (T.t > 12) T.t = -1;
      }
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(930, 640), gatepost: card('gate post and lantern, left'), fence: card('fence and flowers, right of the gate') };
    },
  };
  function showTrail(field) {
    if (!G.trail) return;
    G.trail.t = 0;
    field.audio.sfx('chime');
  }

  // ---------------------------------------------------------------- 3. the square
  // The square demo's cast (field.js SQUARE), with the town's ways out. In the game: Inkblot joins here, Hilde has a
  // swap of her own, and the well gives moonwater.
  const SQUARE = {
    ...SQUARE_CAST,
    herbTotal: HERBS_IN_TOWN,
    enter(field) {
      SQUARE_CAST.enter(field);
      if (!game) return;
      const hilde = field.things.find((t) => t.name === 'Hilde');
      Object.defineProperty(hilde, 'lines', { get: () => hildeLines(field), configurable: true });
      const well = field.things.find((t) => t.sound === 'well-bucket');
      Object.defineProperty(well, 'lines', { get: () => wellLines(), configurable: true });
      const crowThing = field.things.find((t) => t.crow);
      if (host.joined?.('inkblot')) {
        // He's with her now: the square's own crow is him, so he isn't here twice
        field.group.remove(field.crow.actor.root);
        field.crow = null;
        field.things = field.things.filter((t) => t !== crowThing);
      } else {
        crowThing.lines = LINES.inkblotJoins;
        crowThing.onEnd = (f) => joinInkblot(f);
        // The first time she comes into the square, he comes to her (as soon as she's free to listen)
        field.inkblotComes = { thing: crowThing, wait: 1.8 };
      }
    },
    update(field, dt, time) {
      SQUARE_CAST.update(field, dt, time);
      const C = field.inkblotComes;
      if (!C || W.inkblotMet || !field.crow) return;
      if ((C.wait -= dt) > 0 || field.talking || field.locked || field.player.actor.busy) return;
      field.inkblotComes = null;
      const to = field.player.pos.clone().add(new THREE.Vector3(Math.sin(field.player.heading), 0, Math.cos(field.player.heading)).multiplyScalar(0.8));
      if (field.walk.canStand(to.x, to.z, 0.1, null, false)) to.y = field.walk.heightAt(to.x, to.z);
      else to.copy(field.player.pos).add(new THREE.Vector3(0.6, 0, 0.4));
      field.crowFly(to, false);
      setTimeout(() => { if (!field.talking && field.crow) field.talk(C.thing); }, 1100);
    },
    // The square's two ways into the Gloamwood: the lane down to the lantern path is open; the bridge waits until
    // Silas has said where the moths go
    locked(exit) {
      if (exit.to === 'sable-bridge' && !flags.silas) return 'The stone bridge over the Sable, and past it the twisted grove and the Hollow. Not before I\'ve asked Silas where the lights go.';
      return false;
    },
  };

  function joinInkblot(field) {
    W.inkblotMet = true;
    const crow = field.crow;
    const from = crow?.actor.root.position.clone();
    if (crow) {
      field.group.remove(crow.actor.root);
      field.crow = null;
      field.things = field.things.filter((t) => !t.crow);
    }
    host.join?.('inkblot', field, { from });
  }

  function hildeLines(field) {
    if (W.hilde) return { first: ["Ha! Still steady as a church clock, thanks to you. Mind that charm on your hat. Ha!"] };
    if (field.has('heartsease-tonic')) {
      return {
        first: [
          say("Ha! Evening, witch! Is that... a Heartsease Tonic? For this old drum of mine?"),
          witch('Brewed this evening. One sprig of witch\'s bells, no more.', 'witch-delighted'),
          say('Ha! Down it goes.', { do: (f) => { f.take('heartsease-tonic'); f.audio.sfx('heal'); } }),
          say("Oh. Oh, that's better. Steady as a church clock. Here: a horseshoe, for that hat of yours. Ha!", {
            do: (f) => { W.hilde = true; f.give('charm-horseshoe', 1, 'reveal-heirloom'); f.toast('The Horseshoe charm: the basket holds four more slots.', 'equip'); },
          }),
        ],
      };
    }
    return {
      first: [
        "Ha! Evening, witch! Mind the soot. I've hammered all night, and my heart won't settle!",
        "Would you brew me a Heartsease Tonic sometime? Witch's bells and moonwater. That'd settle this old drum.",
      ],
      again: ['A Heartsease Tonic, witch. Then I\'ll find you something for that hat. Ha!'],
    };
  }

  // The well and the lantern path's crock share three bottles a night (docs/LORE.md §8)
  function wellLines() {
    if (flags.wickhollowWater) return { first: ['Still the moon down there. Tonight\'s moonwater is drawn; the well fills again at moonrise.'] };
    return {
      first: [
        'The water is black and still, with the moon sitting right in the middle of it.',
        say('Moonwater: three bottles a night, shared with the crock on the lantern path.', {
          do: (f) => { flags.wickhollowWater = true; f.give('moonwater', 3, 'well-bucket'); f.toast('The well gives three moonwater.', 'well-bucket'); },
        }),
      ],
    };
  }

  // ---------------------------------------------------------------- 4. the Sable riverbank
  // The heavy pieces (the skiff, the moths, Rosalind, Quill) are built once and moved into each new visit's cast.
  const R = { built: false, skiffLit: null };

  function buildSkiff(lit) {
    // The Magpie: cold until the witch lights her brazier (no light in her crystals or lanterns, no motes); after,
    // warm, with the lights in her. Everything under the river's surface is clipped away, so she sits low in the
    // water rather than on it.
    const skiff = createAirship({ lit });
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -river.water);
    const clipped = new Map();
    const inkClip = new THREE.ShaderMaterial({
      uniforms: INK.uniforms, side: THREE.BackSide, clipping: true, clippingPlanes: [plane],
      vertexShader: /* glsl */ `
        #include <clipping_planes_pars_vertex>
        uniform float thickness;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          mvPosition.xyz += normalize(normalMatrix * normal) * thickness;
          gl_Position = projectionMatrix * mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <clipping_planes_pars_fragment>
        uniform vec3 color;
        void main() {
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(color, 1.0);
        }`,
    });
    skiff.root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material === INK) { o.material = inkClip; return; }
      if (!clipped.has(o.material)) {
        const m = o.material.clone();
        m.onBeforeCompile = o.material.onBeforeCompile; // the toon rim light (kit.js), which clone() leaves behind
        m.customProgramCacheKey = o.material.customProgramCacheKey;
        m.clippingPlanes = [plane];
        clipped.set(o.material, m);
      }
      o.material = clipped.get(o.material);
    });
    skiff.root.scale.setScalar(0.9);
    return skiff;
  }

  function buildRiver() {
    if (R.built) return;
    R.built = true;
    // A faint ring where the hull meets the water
    R.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({
      color: '#cfc4ff', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    R.ring.rotation.x = -Math.PI / 2;
    onLayer(R.ring);
    // Lamp-moths over the water, each carrying a violet flame downriver
    R.moths = river.moths.map((m) => {
      const moth = createLampMoth();
      moth.root.scale.setScalar(1.9);
      return { moth, ...m };
    });
    // Rosalind, by the bench
    R.rosalind = createRosalind();
    // Quill's stool at the foot of the jetty: three legs and a worn round seat
    const stool = new THREE.Group();
    stool.name = 'quills-stool';
    part(stool, cyl(0.17, 0.16, 0.06, 14), toon('#6b4a30'), { pos: [0, 0.45, 0] });
    part(stool, merge([0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2;
      return new THREE.CylinderGeometry(0.022, 0.03, 0.46, 6).rotateX(Math.sin(a) * 0.18).rotateZ(-Math.cos(a) * 0.18).translate(Math.cos(a) * 0.1, 0.22, Math.sin(a) * 0.1);
    })), toon('#4a3020'));
    onLayer(stool);
    R.stool = stool;
    // Mister Quill on it, by his cold skiff (docs/SLICE.md screen 4), blowing on his fingers
    R.quill = createQuill();
  }

  // Lit once she's woken her (the Skiff Wakes), or once she's flown her home
  const skiffAwake = () => !!flags.skiffAwake;

  const RIVER = {
    music: 'wickhollow',
    ambience: [{ sfx: 'river', first: 0.2, gap: 2.7, spread: 0.3 }, ...night], // the river, running on and on
    herbTotal: HERBS_IN_TOWN,
    enter(field) {
      buildRiver();
      const { paint, scene, walk } = field;
      const S = scene.spots;
      const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);
      field.stage.renderer.localClippingEnabled = true;

      // The Magpie, moored off the jetty's end, broadside to the bank with her bow downriver
      if (!R.skiff || R.skiffLit !== skiffAwake()) {
        R.skiffLit = skiffAwake();
        R.skiff = buildSkiff(R.skiffLit);
      }
      const { skiff, ring } = R;
      skiff.root.position.copy(at([...S['magpie mooring'], river.water])).setY(river.water + 0.12);
      skiff.root.rotation.y = Math.PI / 2 + 0.28;
      field.group.add(skiff.root, ring);
      if (skiff.fx) field.group.add(skiff.fx);
      ring.position.copy(skiff.root.position).setY(river.water + 0.01);
      ring.rotation.z = -skiff.root.rotation.y;
      ring.scale.set(1.05, 2.5, 1);
      // Her mooring rope, from the stern to the post at the jetty's end
      skiff.root.updateMatrixWorld(true);
      const stern = skiff.root.localToWorld(new THREE.Vector3(0, 0.28, -2.2));
      const post = at([766, 626, river.water]).setY(river.water + 0.95);
      const mid = stern.clone().lerp(post, 0.5).setY(Math.min(stern.y, post.y) - 0.2);
      R.rope?.removeFromParent();
      R.rope = part(field.group, taperedTube([stern, mid, post].map((v) => v.toArray()), 0.018, 0.018, 12, 5), toon('#8a7350'), { ink: false });
      onLayer(R.rope);

      // The lamp-moths
      for (const m of R.moths) {
        field.group.add(m.moth.root, m.moth.fx);
        const [a, v, b] = [m.from, m.via, m.to].map(([x, y, h]) => at([x, y, river.water + h]));
        m.curve = new THREE.QuadraticBezierCurve3(a, v, b);
      }

      // Rosalind by the bench, looking out over the path toward the jetty
      const ros = R.rosalind;
      const home = at(S.rosalind);
      ros.rest = headingTo(home, at([700, 860]));
      field.addPerson(ros, home, ros.rest);
      if (W.gifted) ros.holdRose(true);

      // Quill's stool, and Quill on it with his back to his cold skiff, watching the path for a customer
      R.stool.position.copy(at(S.quill));
      R.stool.rotation.y = 0.4;
      field.group.add(R.stool);
      const quill = R.quill;
      quill.rest = headingTo(R.stool.position, at([640, 900]));
      field.addPerson(quill, R.stool.position.clone(), quill.rest);
      quill.sit(true, 0.46);
      quill.setWarm(!!flags.skiff);
      walk.obstacles.push({ x: R.stool.position.x, z: R.stool.position.z, r: 0.3 });

      field.things.push(
        {
          id: 'rosalind', name: 'Rosalind', actor: ros, pos: ros.root.position, portrait: RP['rosalind-calm'], voice: 4,
          lines: { get first() { return rosalindLines(field, true); }, get again() { return rosalindLines(field, false); } },
          onLine: () => ros.play('talk'),
          onEnd: () => ros.setMood('calm'),
        },
        {
          id: 'quill', name: 'Mister Quill', actor: quill, pos: quill.root.position, voice: 3,
          get portrait() { return flags.skiff ? quillHappy : quillPortrait; },
          get lines() { return quillLines(); },
          onLine: () => quill.play('talk'),
          onEnd: (f) => { quill.setMood('calm'); if (host.shop) host.shop(f); },
        },
        {
          id: 'magpie', name: null, pos: at(S.magpie), reach: 0.4, lift: 1.4, sound: 'rope-creak',
          get lines() { return magpieLines(); },
          onEnd: (f) => { if (canFly()) host.fly(f, 'wickhollow'); },
        },
        { id: 'water', name: null, pos: at(S["water's edge"]), reach: 0.4, lift: 1.6, lines: LINES.water, sound: 'chime' },
        { id: 'bench', name: null, pos: at(S.bench), reach: 0.4, lift: 0.4, lines: LINES.bench, sound: 'ui-page' },
        { id: 'willow', name: null, pos: at(S.willow), reach: 0.45, lift: 1.4, lines: LINES.willow, sound: 'leaves' },
      );
      field.plantHerbs(scene.herbs, 1.6, 0.45);
    },
    update(field, dt, time) {
      // The skiff rides the river gently: a slow rise and fall, and a little roll
      const { skiff } = R;
      skiff.update(dt, 0, 0, 0, river.water);
      skiff.deck.position.y = Math.sin(time * 0.9) * 0.025;
      skiff.deck.rotation.z = Math.sin(time * 0.7) * 0.02;
      skiff.deck.rotation.x = Math.sin(time * 0.5 + 1) * 0.01;
      R.ring.material.opacity = 0.12 + Math.sin(time * 1.3) * 0.04;
      // The moths go down the river one after another, and come round again (once the lights go home, they don't)
      for (const m of R.moths) {
        const cycle = m.seconds + 7;
        const k = ((time - m.delay) % cycle + cycle) % cycle / m.seconds;
        const on = time >= m.delay && k <= 1 && !flags.lightsHome;
        m.moth.root.visible = m.moth.fx.visible = on;
        if (!on) continue;
        m.curve.getPoint(k, m.moth.root.position);
        m.moth.root.position.y += Math.sin(time * 0.8 + m.delay) * 0.25;
        const ahead = m.curve.getTangent(Math.min(1, k));
        m.moth.root.rotation.y = Math.atan2(ahead.x, ahead.z);
        m.moth.update(dt);
      }
      for (const v of field.villagers) v.update(dt);
    },
    labels(field) {
      const card = cardTop(field);
      return { floor: field.paint.toWorld(800, 770), reeds: card('reeds and grass by the jetty'), skiff: R.skiff.root.position.clone().setY(river.water + 2.2) };
    },
  };

  // Quill: his swap for the skiff (docs/SLICE.md screen 4, docs/LORE.md "The skiff"); in the game, then his shop
  function quillLines() {
    if (!game) return LINES.quill;
    if (flags.skiff) {
      return {
        first: ["Warm as toast, dear. She's yours till you bring her home, with the lights in her.", 'And while you\'re here: everything else on my stall is a swap too.'],
      };
    }
    return {
      first: [...LINES.quill.first, "And while you're here, dear: everything on my stall is a swap. Have a look."],
      again: ["A Warming Balm, dear, and a lamp no wind or wisp can blow out. Then she's yours to fly. Now, what have you brought me?"],
    };
  }

  // The Magpie at the jetty: cold until the swap, then hers to board once the moths have shown the way
  const canFly = () => game && !!host.fly && !!flags.skiff && !!flags.b3;
  function magpieLines() {
    if (!game || !host.fly || !flags.skiff) return LINES.magpie;
    if (!flags.b3) {
      return { first: ["She's mine to fly, once I know where to fly her.", 'The moths gather in the Hollow, Silas said. I\'ll see where they go from there.'] };
    }
    return {
      first: flags.skiffAwake
        ? ['The Magpie, nodding on her rope, warm all through. Aboard, then.']
        : ['The Magpie. Witchfire for the brazier, Silas\'s flame at the bow, and the lights to follow.', 'Down the Sable, then, after them.'],
    };
  }

  // Rosalind's lines depend on what's in the basket: a nightrose earns the Bell charm (docs/SLICE.md, screen 4)
  function rosalindLines(field, first) {
    const ros = R.rosalind;
    if (W.gifted) return LINES.rosalind.after;
    if (field.has('nightrose')) {
      return [
        ...(first ? LINES.rosalind.greet : []),
        { say: LINES.rosalind.thanks[0], face: RP['rosalind-happy'], do: (f) => {
          f.take('nightrose');
          ros.holdRose(true);
          ros.play('cheer');
          W.gifted = true;
        } },
        { say: LINES.rosalind.thanks[1], face: RP['rosalind-happy'], do: () => ros.play('twirl') },
        { say: LINES.rosalind.thanks[2], face: RP['rosalind-happy'], do: (f) => { f.give('charm-bell', 1, 'reveal-heirloom'); f.toast('Rosalind gives you the Bell charm.', 'chime'); } },
      ];
    }
    return first ? [...LINES.rosalind.greet, ...LINES.rosalind.want] : LINES.rosalind.want;
  }

  // ---------------------------------------------------------------- what everyone says
  // Lines with no name are the witch's own thoughts; { who: 'witch' } lines she says out loud. The lanterns going out
  // "one a night, no wind" is docs/SLICE.md's opening; the hag stone's "Rude.", the broom that won't carry a basket, a
  // crow and a friend, Quill's skiff and its name, and "she never sleeps, so the moon stays full" are docs/LORE.md's.
  // Rosalind's lines are her own, from Follow Me Down Witch Way (game/data/dialogue.json), moved from the bridge to the
  // river; the "little boats" are LORE.md's.
  const LINES = {
    armchair: {
      first: ['My armchair. It still has the shape of me in it.', { say: 'A moment with my feet to the fire. Mended, and the night saved here.', do: rest }],
      again: [{ say: 'Sit, mend, up again. I never sleep on a full moon, so the moon stays full.', do: rest }],
    },
    cauldron: {
      first: ['My cauldron, over a good fire. Nothing in it yet.', "I'll brew here: moonwater, witchfire, and whatever the garden gives me."],
      again: ['Moonwater, herbs, witchfire. Then we talk.'],
    },
    window: {
      first: ['The moon is full, and sitting right in the middle of the round window, the way it likes.', "Wickhollow's lanterns have been going out all month. One a night. No wind."],
      again: ['Still full. Still watching.'],
    },
    worktable: {
      first: [
        'My worktable: candles, crystals, and the grimoire open at nothing in particular.',
        { say: 'The hag stone, on its cord. I never go out without it.', do: (f) => { f.give('hag-stone'); f.toast('The hag stone goes round her neck.', 'shard-pickup'); } },
        "It's also meant to keep witches away. Rude.",
      ],
      again: ['Candles, crystals, the grimoire. All where I left them.'],
    },
    chest: {
      first: [
        'The chest at the foot of the stairs.',
        { say: 'Two bottles of moonwater, wrapped in a shawl. Every brew starts with one.', do: (f) => { f.give('moonwater', 2); f.toast('Two moonwater, into the basket.', 'well-bucket'); } },
      ],
      again: ['Just the shawl now. Two bottles is what I carry.'],
    },
    broom: {
      first: ["My broom. It won't carry a basket, a crow and a friend.", "It's for sweeping, mostly. Don't tell anyone."],
      again: ['Leaning, like it does.'],
    },
    greyBed: {
      first: [
        'My lavender. Grey as ash, from the root to the tip.',
        "It isn't dead. It's forgotten what it is. That's the rot: where the light leaves, it moves in.",
        { say: "Moonlight, then. Let's see which way it came.", do: (f) => f.player.actor.play('moonlight', () => showTrail(f)) },
        'There. A grey trail, down the path and out of the gate. Toward the Gloamwood.',
      ],
      again: [{ say: "Still grey. Nothing to pick here until it remembers what it is.", do: (f) => f.player.actor.play('moonlight', () => showTrail(f)) }],
    },
    birdbath: {
      first: ['The birdbath. It has caught a moon of its own.'],
      again: ['Still got its moon.'],
    },
    // Quill sets his swap for the skiff (docs/SLICE.md screen 4, docs/LORE.md "The skiff"); his shop is swap-shop.html
    quill: {
      first: [
        "Evening, dear. Mind the rope. That's my Magpie, cold as a fish since the cold got into my fingers.",
        "I can't stoke her brazier like this. Look at them. Ten little icicles.",
        "Everything's a swap, so here's mine: something to warm these hands, and a bow-lamp that won't blow out.",
        'Bring me both, and she flies for you. Bring her back with the lights in her.',
      ],
      again: ['A Warming Balm, dear, and a lamp no wind or wisp can blow out. Then she\'s yours to fly.'],
    },
    magpie: {
      first: [
        "The Magpie: Quill's sunstone skiff. She's sat cold at this jetty since the cold got into his fingers.",
        'Her name is painted on both bows. Quill named her for the shiny things she carried home.',
        "Sunstones lift when they're warm. And nothing in Wickhollow burns warmer than witchfire.",
      ],
      again: ['Cold crystals, a cold brazier, riding low on the water.'],
    },
    water: {
      first: ['Lamp-moths, each carrying a violet flame, all going the same way: down the Sable.', 'Every one of those flames was a Wickhollow lantern.'],
      again: ['Still going. Downriver, toward the bridge and on.'],
    },
    bench: {
      first: ['A stone bench, worn smooth by a hundred years of picnics.'],
      again: ['Room for two, and a lamp.'],
    },
    willow: {
      first: ['The leaning willow, trailing its fingers in the Sable.'],
      again: ['It never gets tired of the river.'],
    },
    rosalind: {
      greet: [
        'Oh! You can see me. At last. Do you know how long I\'ve waited?',
        { say: 'A hundred years by this river, for someone to bring me a rose. A hundred!', do: () => R.rosalind.play('sigh') },
        'And all month the lights have gone by on the water, like little boats.',
      ],
      want: ["A nightrose, dear. Just one. It opens only when the clouds clear. I'll wait."],
      thanks: [
        'A nightrose. For me. Oh, I shall weep. I shan\'t. I might.',
        "Look, I'm twirling! A hundred years, and worth every one.",
        'Here, a little Bell charm for your hat. It chimes when a rare herb is near.',
      ],
      after: [{ say: 'Still twirling, dear. A hundred years of waiting saves up a great deal of twirl.', face: RP['rosalind-happy'], do: () => R.rosalind.play('twirl') }],
    },
    // Inkblot joins (docs/SLICE.md screen 3): a rescued flame in her basket, and he settles in to come along
    inkblotJoins: {
      first: [
        'Kraa! [Inkblot hops up to you, very pleased with himself, with something violet in his beak.]',
        { say: '[He drops it in your basket: a little flame, still warm. One of the lanterns.]', do: (f) => f.give('wickhollow-flame', 1, 'crystal-flare') },
        "He's been carrying them home, one flame at a time. All week. No wonder he looks tired.",
        { who: 'witch', say: "The lights went down the river. I'm going after them. Coming?", face: 'witch-sly' },
        'Kraa. [He ruffles up, as if to say he was going anyway, and you could come if you liked.]',
      ],
    },
  };

  // ---------------------------------------------------------------- the screens
  // The square's ways out to the Gloamwood lead on in the game, and only say where they go in the town demo
  const SQUARE_LINES = {
    'the Sable bridge': 'The stone bridge over the Sable, and past it the twisted grove and the Hollow. Not before I\'ve asked Silas where the lights go.',
    'the lane': 'The lane down to the lantern path, where Silas walks his rounds. The Gloamwood can wait until I\'ve seen the river.',
  };
  const squareData = { ...square, exits: square.exits.map((e) => (SQUARE_LINES[e.name] && !game ? { ...e, line: SQUARE_LINES[e.name] } : e)) };
  return {
    screens: {
      [inside.id]: { data: inside, cast: INSIDE },
      [garden.id]: { data: garden, cast: GARDEN },
      [square.id]: { data: squareData, cast: SQUARE },
      [river.id]: { data: river, cast: RIVER },
    },
    images: wickhollowImages,
    R, G, W,
  };
}

// ---------------------------------------------------------------- the grey bed and the rot trail
function rotPatch(paint, painting, [cx, cy], [rx, ry], base) {
  const foot = paint.toWorld(...base);
  const cam = paint.camera.position;
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(cam.x - foot.x, 0, cam.z - foot.z).normalize(), foot);
  const pts = [[cx - rx, cy - ry], [cx + rx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry]].map(([x, y]) => paint.toPlane(x, y, plane));
  const geo = new THREE.BufferGeometry().setFromPoints([pts[0], pts[3], pts[1], pts[1], pts[3], pts[2]]);
  const uniforms = {
    painting: { value: painting }, paintViewProjection: { value: paint.viewProjection },
    center: { value: new THREE.Vector2(cx, cy) }, radii: { value: new THREE.Vector2(rx, ry) },
    size: { value: new THREE.Vector2(paint.width, paint.height) }, time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      uniform mat4 paintViewProjection; varying vec4 vPaint;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vPaint = paintViewProjection * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D painting; uniform vec2 center; uniform vec2 radii; uniform vec2 size; uniform float time; varying vec4 vPaint;
      void main() {
        vec2 uv = vPaint.xy / vPaint.w * 0.5 + 0.5;
        vec2 px = vec2(uv.x, 1.0 - uv.y) * size;
        float d = length((px - center) / radii);
        float a = 1.0 - smoothstep(0.6, 1.0, d);
        vec3 c = texture2D(painting, uv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        // ash-grey, a touch green, and breathing very slowly
        vec3 grey = vec3(l) * vec3(0.9, 0.96, 0.92) * (0.85 + 0.05 * sin(time * 0.8)) + vec3(0.004, 0.006, 0.005);
        gl_FragColor = vec4(grey * a, a);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'grey bed';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}

let stainTex = null;
function stainTexture() {
  if (stainTex) return stainTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) {
    const x = 18 + rnd() * 28, y = 18 + rnd() * 28, r = 7 + rnd() * 10;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(168,166,178,0.85)');
    grad.addColorStop(0.7, 'rgba(132,128,152,0.55)');
    grad.addColorStop(1, 'rgba(200,190,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  stainTex = new THREE.CanvasTexture(c);
  stainTex.colorSpace = THREE.SRGBColorSpace;
  return stainTex;
}

// The trail: grey stains on the ground with a moonlit sheen, appearing one after another from the bed to the gate
function rotTrail(field, points) {
  const group = new THREE.Group();
  group.name = 'rot trail';
  const marks = points.map(([x, y], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: stainTexture(), transparent: true, opacity: 0, depthWrite: false, color: '#e6e0ff' }));
    m.rotation.set(-Math.PI / 2, 0, i * 1.7);
    m.position.copy(field.paint.toWorld(x, y)).setY(0.015);
    m.scale.setScalar(0.75 + (i % 3) * 0.18);
    m.renderOrder = 1;
    group.add(m);
    return m;
  });
  field.group.add(group);
  return { group, marks, t: -1 };
}

export { sleep };
