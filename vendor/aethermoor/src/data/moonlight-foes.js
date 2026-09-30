// ADDED for the 20-min game "Moonlight in the Aether" (not in Aethermoor): the foes, the Omen and the status the six
// battles need that Aethermoor lacks (docs/LORE.md §7, docs/SLICE.md §2). foes.js, omens.js and statuses.js merge these
// in. Everything else the fights use is Aethermoor's own: marsh-light (the Sour Wisp), glowcap, boglurcher,
// mire-leech, willow-wight and drowned (its choir variant, the Drowned Chorister), at the levels src/battle/encounters.js
// gives them. Numbers are tuned with tools/balance.mjs; docs/BALANCE.md explains them.
//
// - Omen `hollowed` (LORE §5 "The rot in battle"): counts as Blight (radiant hits it x1.5), its hits add Rotting, and
//   Moonlight that lands before its own first hit breaks it; after that only Moonrise or Remembrance Incense does
//   (rules/combat.js breakOmens, cleanse `omens`). notFor every tier: the Waking and Grudges never roll it.
// - Status `flustered` (Inkblot's Pinch): breaks a charge like Staggered, without the push back on the ribbon.
// - Status `unseen`: Silas, a ghost in the lamplight, can't be targeted.
// - Family `hollowed-mandrake` (new, from A's briarling stats, with a Scream) and family `silas` (the guest).
// - Variants on A's families (moonlightFoes adds them; A's own entries are untouched):
//     lamp-moth `wickhollow`   carries a Wickhollow flame (a grip meter Pinch can empty); Circle the Light needs it
//     willow-wight `moonlight` B5's willow: fewer HP, harder blows, a Weep that does not scale (a short, sharp fight)
//     gloamwing `moonlight`    the first boss, sized for two heroes at level 2; calls lamp-moths; a charging dive
//     lantern-mother `moonlight` and `lights-out`   the final boss's two forms: Lamplight and the Children's Road,
//                              then (after a cut) Lights Out, where Silas steps out of the bow-lamp's flame

const atk = (dice, kind, o = {}) => ({ type: 'attack', dice, kind, ...o });
const status = (id, o = {}) => ({ type: 'status', status: id, ...o });
const ALL_TIERS = ['rabble', 'veteran', 'relic-bearer', 'champion', 'hollow', 'unsmith'];
const EVERYTHING = ['slash', 'pierce', 'crush', 'ember', 'frost', 'storm', 'stone', 'verdant', 'tide', 'radiant', 'blight'];

export const MOONLIGHT_OMENS = {
  hollowed: {
    id: 'hollowed', name: 'Hollowed', color: '#7a4f8f',
    text: 'The rot has made it forget itself, and made it hungry: +4 speed. It counts as Blight: Moonlight hits it half again as hard, and its hits leave you Rotting. Moonlight that lands before its first hit breaks the Omen; after that, only Moonrise or Remembrance Incense can.',
    riders: [status('rotting')], weak: ['radiant'], breaks: 'radiant', speed: 4,
    lost: 'The moonlight burns the rot off {target}. It remembers what it is.',
    notFor: ALL_TIERS,
  },
};

export const MOONLIGHT_STATUSES = {
  // Inkblot's Pinch: a beak in the eye. Whatever it was winding up comes to nothing (like Staggered), but it is not
  // knocked back on the ribbon, so Pinch breaks charges without stalling a boss.
  flustered: {
    id: 'flustered', name: 'Flustered', harmful: true, until: 'turn-start', breaksCharge: true, guard: -1,
    text: 'A crow in the face: a charging move is broken off, and -1 Guard until its next turn.',
  },
  unseen: {
    id: 'unseen', name: 'In the Lamplight', harmful: false, turns: null, untargetable: true,
    text: 'A ghost in the lamplight: nothing can target it, and blows aimed at everyone pass through it.',
  },
};

// ---- new families --------------------------------------------------------------------------------------------------

const MANDRAKE = {
  id: 'hollowed-mandrake', name: 'Hollowed Mandrake', art: 'hollowed-mandrake', tier: 'rabble', kind: 'plant',
  hp: 20, guard: 13, atk: 3, dmg: 1, speed: 10, armor: 'hide', aspect: 'verdant',
  saves: { STR: 0, DEX: 1, CON: 1, WIS: 0 },
  opener: 'scream',
  koText: 'It sulks, arms folded, leaves drooping. Hold still and say sorry, and it comes quietly.',
  moves: {
    nip: { name: 'Nip', target: 'enemy', text: 'A cross turnip bites your ankle.', effects: [atk('1d6', 'pierce')] },
    scream: { name: 'Scream', target: 'all-enemies', text: 'It opens its mouth and SCREAMS. Everyone Staggers, and her hat flies off.', effects: [status('staggered')] },
    tangle: { name: 'Tangle', target: 'enemy', text: 'Grey roots wrap your ankles. STR save or Rooted.', effects: [status('rooted', { save: 'STR' })] },
  },
  table: [[1, 3, 'nip'], [4, 4, 'scream'], [5, 6, 'tangle']],
  text: 'A mandrake from her own grey lavender bed, with the face of a cross turnip. It is not wicked. It has forgotten what it is.',
};

const SILAS = {
  id: 'silas', name: 'Silas', art: 'silas', tier: 'veteran', kind: 'undead', unique: true,
  hp: 30, guard: 20, atk: 0, dmg: 0, speed: 10, armor: 'none', aspect: 'radiant', immune: EVERYTHING,
  saves: { STR: 0, DEX: 0, CON: 0, WIS: 5 },
  opener: 'step-out',
  moves: {
    'step-out': {
      name: 'Out of the Lamp', target: 'all-allies',
      text: 'The bow-lamp\'s flame is the one light she could not put out. Silas steps out of it, lifts his pole, and lights the lamps: every ally is Warded 1d8 and shakes off Spooked.',
      effects: [status('unseen', { self: true }), status('warded', { value: { dice: '1d8' } }), { type: 'cleanse', statuses: ['frightened'] }],
    },
    'light-the-lamps': {
      name: 'Light the Lamps', target: 'all-allies',
      text: 'Silas goes along the dark lamp-posts with his pole, one by one: every ally is Warded 1d8 and shakes off Spooked.',
      effects: [status('warded', { value: { dice: '1d8' } }), { type: 'cleanse', statuses: ['frightened'] }],
    },
  },
  table: [[1, 8, 'light-the-lamps']],
  text: 'The ghost lamplighter of Wickhollow\'s lantern path. He can\'t keep a lantern lit, but he can light one.',
};

// ---- variants of Aethermoor's families ---------------------------------------------------------------------------------

const MOTH_MOVES = {
  batter: { name: 'Batter', target: 'enemy', text: 'It batters at your face the way a moth batters at a lamp.', effects: [atk('1d6', 'crush')] },
  dust: { name: 'Dust in the Eyes', target: 'enemy', text: 'A burst of glittering wing-dust in your face. DEX save or Spooked.', effects: [status('frightened', { save: 'DEX' })] },
  circle: { name: 'Circle the Light', target: 'self', requires: 'wickhollow-flame', fallback: 'batter', text: 'It wheels round the flame it carries, faster and faster: Hasted.', effects: [status('hasted')] },
};

const GLOAMWING = {
  name: 'The Gloamwing', hp: 84, guard: 14, atk: 4, dmg: 2, speed: 12,
  koText: 'The Gloamwing flutters up after the moon, drowsy, and settles on Silas\'s moth-bower to sleep.',
  moves: {
    'wing-buffet': { name: 'Wing Buffet', target: 'enemy', text: 'Pale wings hit like a door slammed in a gale.', effects: [atk('1d6', 'crush')] },
    dreamdust: { name: 'Dreamdust', target: 'all-enemies', text: 'Scales like snow. WIS save or Spooked.', effects: [status('frightened', { save: 'WIS' })] },
    cocoon: { name: 'Cocoon', target: 'self', when: { hpBelow: 0.5 }, fallback: 'wing-buffet', text: 'It wraps itself in silk: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
    'moon-dive': { name: 'Moon-Dive', target: 'enemy', charge: true, text: 'It climbs toward the moon and folds its wings, charging: when it comes down, 3d6 crushing. A Stagger breaks it off.', effects: [atk('3d6', 'crush')] },
    'call-moths': { name: 'Call the Moths', target: 'self', fallback: 'wing-buffet', text: 'The Dawnbell hums, and a lamp-moth comes to it out of the dark, carrying a Wickhollow flame.', effects: [{ type: 'summon', family: 'lamp-moth', variant: 'wickhollow', count: 1, max: 2, levelDelta: -1 }] },
    'bell-hum': { name: 'Bell-Hum', target: 'all-enemies', requires: 'dawnbell', fallback: 'wing-buffet', text: 'The Dawnbell hums on its thorax: 1d6 radiant to all, and you Stagger.', effects: [{ type: 'damage', dice: '1d6', kind: 'radiant', aspect: 'radiant', riders: [status('staggered')] }] },
  },
  // d12; with the Dawnbell pried loose the die drops to a d8, and Call the Moths and Bell-Hum can no longer come up
  table: [[1, 3, 'wing-buffet'], [4, 5, 'dreamdust'], [6, 6, 'cocoon'], [7, 9, 'moon-dive'], [10, 10, 'call-moths'], [11, 12, 'bell-hum']],
};

const LM_MOVES = {
  'lamp-pole': { name: 'Lamp-Pole', target: 'enemy', text: 'The long hooked pole she lit Misthollow\'s lamps with, swung like a scythe: 1d10 crushing.', effects: [atk('1d10', 'crush')] },
  'lantern-flare': { name: 'Lantern Flare', target: 'all-enemies', text: 'Every lamp in the Hollow flares at once: 1d8 radiant to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '1d8', kind: 'radiant', aspect: 'radiant', save: 'DEX' }] },
  lure: { name: 'Lure', target: 'enemy', charge: true, requires: 'lamplighters-lantern', fallback: 'lamp-pole', text: 'She lifts the lantern and smiles at one of you, the way she smiled at the children, charging. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
  'hush-now': { name: 'Hush Now', target: 'all-enemies', text: '"Hush now," she says, "hush," and it is very hard not to. Every hero: WIS save or Hexed.', effects: [status('hexed', { save: 'WIS' })] },
  'lead-them-down': { name: 'Lead Them Down', target: 'enemy', charge: true, text: 'She takes one of you by the hand, charging: she means to lead you down the drowned road, where it is safe. WIS save, or you are Led Away for two turns.', effects: [status('swallowed', { save: 'WIS', label: 'Led away' })] },
  moths: { name: 'The Moths', target: 'self', fallback: 'lamp-pole', text: 'She holds up the lantern, and a lamp-moth comes to it out of the dark.', effects: [{ type: 'summon', family: 'lamp-moth', variant: 'wickhollow', count: 1, max: 2, levelDelta: -2 }] },
  mourning: { name: 'Mourning', target: 'all-enemies', requires: 'mourning-veil', fallback: 'hush-now', text: 'She lifts the veil, and you see her grief. Every hero: WIS save or Spooked, and Rotting.', effects: [status('frightened', { save: 'WIS' }), status('rotting')] },
  snuff: { name: 'Snuff', target: 'all-enemies', text: 'She pinches out the lamps one by one, and the dark comes in close. Every hero is Exposed.', effects: [status('exposed')] },
  'lantern-nova': { name: 'Lantern Nova', target: 'all-enemies', requires: 'lamplighters-lantern', fallback: 'lamp-pole', text: 'The lantern burns white, and so does everything it shines on: 1d8 radiant to every hero, DEX save for half, and on a failed save you Burn.', effects: [{ type: 'damage', dice: '1d8', kind: 'radiant', aspect: 'radiant', save: 'DEX', riders: [status('burning')] }] },
  'drown-the-light': { name: 'Drown the Light', target: 'enemy', charge: true, text: 'She plunges the lantern into the black water, and the water comes up out of it at one of you, charging: 3d10 tide.', effects: [atk('3d10', 'tide', { aspect: 'tide' })] },
};

const LANTERN_MOTHER = {
  name: 'The Lantern Mother', hp: 48, guard: 14, atk: 7, dmg: 5, speed: 16,
  koText: 'The lamps go out, all but hers, and the one at the skiff\'s bow. She stops being gentle.',
  moves: LM_MOVES,
  phases: [
    { at: 1, text: 'Lamplight. Every window in the sunken house is lit, and she stands on the step with her lantern held high.', table: [[1, 6, 'lamp-pole'], [7, 11, 'lantern-flare'], [12, 15, 'lure'], [16, 20, 'hush-now']] },
    { at: 0.5, text: 'The Children\'s Road. She turns toward the black water, and the lamps along the drowned path light one by one.', table: [[1, 5, 'lamp-pole'], [6, 10, 'lead-them-down'], [11, 14, 'moths'], [15, 20, 'mourning']] },
  ],
};

const LIGHTS_OUT = {
  name: 'The Lantern Mother', hp: 40, guard: 14, atk: 7, dmg: 5, speed: 16,
  opener: 'snuff',
  koText: 'The veil falls. "Are they safe?" she asks. "I was taking them home."',
  moves: LM_MOVES,
  phases: [
    { at: 1, text: 'Lights Out. The lamps go out, all but hers, and she stops being gentle.', table: [[1, 4, 'lamp-pole'], [5, 7, 'snuff'], [8, 13, 'lantern-nova'], [14, 20, 'drown-the-light']] },
  ],
};

// Merge these into Aethermoor's FOES: new families, and copies of A's families with extra variants (A's own fields and
// variants are kept as they are). `base` is A's FOES before the merge.
export function moonlightFoes(base) {
  const withVariants = (id, variants) => ({ ...base[id], variants: { ...(base[id].variants || {}), ...variants } });
  return {
    'hollowed-mandrake': MANDRAKE,
    silas: SILAS,
    'lamp-moth': withVariants('lamp-moth', {
      wickhollow: {
        relics: ['wickhollow-flame'], moves: MOTH_MOVES, table: [[1, 3, 'batter'], [4, 5, 'dust'], [6, 6, 'circle']],
        koText: 'It drops the flame it was carrying, and the flame floats off home up the river.',
      },
    }),
    // B5's willow: the last test before the boss is meant to be short and sharp (docs/BALANCE.md), so fewer HP and
    // harder blows than A's willow at the same level, and a Weep that does not grow with its level
    'willow-wight': withVariants('willow-wight', {
      moonlight: {
        hp: 24, dmg: 6, table: [[1, 3, 'lash'], [4, 6, 'bough-fall'], [7, 8, 'weep']],
        moves: { ...base['willow-wight'].moves, weep: { ...base['willow-wight'].moves.weep, effects: [status('regenerating', { value: { dice: '1d6' } })] } },
      },
    }),
    gloamwing: withVariants('gloamwing', { moonlight: GLOAMWING }),
    'lantern-mother': withVariants('lantern-mother', { moonlight: LANTERN_MOTHER, 'lights-out': LIGHTS_OUT }),
  };
}
