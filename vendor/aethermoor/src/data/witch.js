// ADDED for the 20-min game "Moonlight in the Aether" (not in Aethermoor): the party's kits and brews in Aethermoor's
// own data formats (see heroes.js, skills.js, items.js and relics.js for the fields). heroes.js, skills.js, items.js
// and relics.js merge these in. The kits follow docs/LORE.md §5, §6 and §8; the numbers are tuned with
// tools/balance.mjs and explained in docs/BALANCE.md.
//
// - The Moonlight Witch: Witchfire (attack), Moonlight (Silver Circle, Moonbeam, Bless), Gather (never damage),
//   Brew, Be Still (defend), Full Moon (her best relic's surge; with none, Moonrise), Slip Away (flee).
// - Inkblot, Quill's crow (A's Pip, the relic-thief): Peck (attack), Pinch, Kraa!, Fetch (his Brew command: the bag
//   is shared, and he is the fastest on the ribbon), and Every Shiny Thing once his tail feather is back.
// - Nettie the Swamp Witch: her stick (attack), Mind the Jars, Stir the Pot, Bitterroot, Hex, and Undo the Knot
//   (her Hexbane Shawl, A's No. 066).

// ---- items: what each of them fights with ------------------------------------------------------------------------
// minIlvl 99 keeps them out of random loot.
export const WITCH_ITEMS = {
  // Her "weapon" is the violet flame in her hand: d20 against Guard for 1d8 Ember (LORE §5). It is also a relic entry
  // below (WITCH_RELICS), which is how Moonrise becomes her Full Moon when she carries no better relic.
  witchfire: {
    id: 'witchfire', name: 'Witchfire', kind: 'witchfire', slot: 'weapon', dice: '1d8', dmg: 'ember', aspect: 'ember',
    hands: 1, weight: -5, ability: ['WIS'], ranged: true, minIlvl: 99, stats: {},
    text: '1d8 ember: the violet flame in her hand, thrown',
  },
  // Inkblot's beak: light, so he acts often (LORE §6 Peck)
  beak: {
    id: 'beak', name: 'Beak', kind: 'beak', slot: 'weapon', dice: '1d4', dmg: 'pierce', hands: 1, weight: -20,
    ability: ['DEX'], minIlvl: 99, stats: {}, text: '1d4 piercing: a crow\'s beak, very quick',
  },
  // His leg ring, the one Quill gave him (LORE §9: a leg ring and one charm)
  'leg-ring': {
    id: 'leg-ring', name: 'Leg Ring', kind: 'ring', slot: 'ring', minIlvl: 99, stats: { mp: 2 }, text: '+2 MP',
  },
  // Nettie's stick: "Down here we use a lamp and a stick." (LORE §6)
  'nettie-stick': {
    id: 'nettie-stick', name: 'Nettie\'s Stick', kind: 'staff', slot: 'weapon', dice: '1d6', dmg: 'crush', hands: 1,
    weight: 0, ability: ['STR', 'WIS'], minIlvl: 99, stats: {}, text: '1d6 crushing: a blackthorn stick with a lamp-hook',
  },
};

// ---- relics: the surges ----------------------------------------------------------------------------------------------
// A hero's Full Moon (Legend Surge) is the power of her best relic (rules/stats.js POWERS, rules/battle.js surgePower).
// These three are not on any Codex page (no `codex` number), never drop at random, and never shatter.
const MOONRISE = {
  id: 'moonrise', name: 'Moonrise', target: 'enemy',
  text: 'The full moon comes up behind her: 2d8 + WIS radiant to one foe, and the rot lets go of every foe (they lose Hollowed).',
  effects: [
    { type: 'damage', dice: '2d8', diceEvery: 3, stat: 'WIS', kind: 'radiant', aspect: 'radiant' },
    { type: 'cleanse', statuses: [], omens: ['hollowed'], all: true },
  ],
};
const EVERY_SHINY_THING = {
  id: 'every-shiny-thing', name: 'Every Shiny Thing', target: 'all-enemies',
  text: 'Inkblot goes round the whole line at once and tugs at everything that glints: 2d6 + DEX grip damage to every relic, and a peck (1d6) for everyone.',
  effects: [{ type: 'damage', dice: '1d6', kind: 'pierce' }, { type: 'grip', dice: '2d6', stat: 'DEX' }],
};

export const WITCH_RELICS = {
  witchfire: {
    id: 'witchfire', name: 'Witchfire', kind: 'witchfire', slot: 'weapon', aspect: 'ember', rarity: 'worn', ilvl: 1,
    holder: 'In her hand', grip: 99,
    weapon: { dice: '1d8', dmg: 'ember', hands: 1, weight: -5, ability: ['WIS'], ranged: true, extra: [] },
    stats: { hit: 1 }, // it goes where she looks: +1 to hit
    power: MOONRISE,
    lore: 'Witchfire burns nothing that belongs. It lights lamps, cauldrons and braziers, and it knows when the moon is up.',
    sockets: 0, deeds: ['first-blood', 'surge', 'untouched'],
  },
  'inkblots-feather': {
    id: 'inkblots-feather', name: 'Inkblot\'s Tail Feather', kind: 'charm', slot: 'amulet', aspect: null, rarity: 'heirloom', ilvl: 1,
    holder: 'In his nest in the Hollow', grip: 99,
    stats: { speed: 1 },
    power: EVERY_SHINY_THING,
    lore: 'The long black feather he lost the week the lights started going. He tucks it back in himself, and looks at everyone as if to say he never lost it.',
    sockets: 0, deeds: ['first-blood', 'surge', 'untouched'],
  },
  // What a lamp-moth carries: one of Wickhollow's flames. Inkblot's Pinch takes it (grip), and it floats home.
  'wickhollow-flame': {
    id: 'wickhollow-flame', name: 'A Wickhollow Flame', kind: 'flame', slot: 'amulet', aspect: 'radiant', rarity: 'worn', ilvl: 1,
    holder: 'Carried by a lamp-moth', grip: 7,
    stats: {},
    lore: 'One violet flame off a Wickhollow wick, still warm. It wants to go home.',
    sockets: 0, deeds: ['first-blood', 'surge', 'untouched'],
  },
};

// ---- heroes ----------------------------------------------------------------------------------------------------------
// hpDie, mp and base follow heroes.js. The party is three, not Aethermoor's four, so the witch and Nettie are a little
// sturdier than A's scholars (docs/BALANCE.md §2).
export const WITCH_HEROES = {
  witch: {
    id: 'witch', name: 'The Moonlight Witch', title: 'of Wickhollow', race: 'human', role: 'Witchfire, moonlight and brews',
    base: { STR: 9, DEX: 13, CON: 14, INT: 12, WIS: 16, CHA: 14 },
    hpDie: 10, mp: { base: 8, perLevel: 2, stat: 'WIS' },
    domain: 'attunement', secondary: ['knowledge'],
    prof: { weapons: ['witchfire'], armor: ['robe', 'leather'], offhand: ['focus'] },
    asi: [['WIS', 'CON'], ['WIS', 'CHA']],
    skills: [{ level: 1, id: 'silver-circle' }, { level: 1, id: 'moonbeam' }, { level: 1, id: 'gather' }, { level: 2, id: 'bless' }],
    gear: { weapon: { base: 'witchfire', rarity: 'worn' }, body: { base: 'robe', rarity: 'worn' } },
    traits: [{ id: 'moonlit', name: 'Moonlit', text: 'Her Moonlight shows what hides: she always sees a foe\'s aspect.', stats: { hp: 4 } }],
    refuses: { kinds: ['sword', 'dagger', 'axe', 'bow', 'spear', 'hammer', 'mace'], text: 'Her athame cuts herbs and nothing else. She\'s asked it.' },
    blurb: 'Wickhollow\'s witch. She gathers by moonlight, brews for her friends, and apologises to mandrakes.',
  },
  inkblot: {
    id: 'inkblot', name: 'Inkblot', title: 'Mister Quill\'s crow', race: 'crow', role: 'Quick, and a thief with good intentions',
    base: { STR: 8, DEX: 16, CON: 12, INT: 12, WIS: 13, CHA: 10 },
    hpDie: 8, mp: { base: 6, perLevel: 2, stat: 'WIS' },
    domain: 'survival', secondary: ['combat'],
    prof: { weapons: ['beak'], armor: [], offhand: [] },
    asi: [['DEX', 'CON'], ['DEX', 'WIS']],
    skills: [{ level: 1, id: 'pinch' }, { level: 1, id: 'kraa' }],
    gear: { weapon: { base: 'beak', rarity: 'worn' }, ring: { base: 'leg-ring', rarity: 'worn' } },
    traits: [{ id: 'lookout', name: 'Lookout', text: 'Quill\'s lookout on the skiff\'s bow: +1 speed, and nothing roots a crow.', stats: { speed: 1, hp: 4 }, immune: ['rooted'] }],
    refuses: { kinds: ['sword', 'dagger', 'axe', 'bow', 'spear', 'hammer', 'mace', 'staff', 'witchfire'], text: 'Kraa.' },
    blurb: 'Quill\'s crow, a thief with good intentions. All week he has been carrying lights home, one flame at a time.',
  },
  nettie: {
    id: 'nettie', name: 'Nettie', title: 'the Swamp Witch of Bogmire', race: 'human', role: 'Healer, herbalist, witch',
    base: { STR: 8, DEX: 10, CON: 14, INT: 14, WIS: 16, CHA: 11 },
    hpDie: 8, mp: { base: 6, perLevel: 2, stat: 'WIS' },
    domain: 'attunement', secondary: ['craft'],
    prof: { weapons: ['staff'], armor: ['robe'], offhand: [] },
    asi: [['WIS', 'CON'], ['WIS', 'INT']],
    skills: [{ level: 1, id: 'mind-the-jars' }, { level: 1, id: 'stir-the-pot' }, { level: 1, id: 'bitterroot-poultice' }, { level: 1, id: 'hex' }],
    gear: { weapon: { base: 'nettie-stick', rarity: 'worn' }, body: { base: 'robe', rarity: 'worn' } },
    traits: [{ id: 'bog-born', name: 'Bog-Born', text: 'Nothing in the fen surprises her, and nothing gets her down for long: +4 HP.', stats: { hp: 4 } }],
    refuses: { kinds: ['sword', 'axe', 'bow', 'spear', 'hammer', 'mace'], text: 'Nettie has a stick. The stick is enough.' },
    blurb: 'Healer, herbalist, witch. Two of those you can buy. The third you don\'t cross. Mind the jars; some bite.',
  },
};

// ---- skills ------------------------------------------------------------------------------------------------------------
export const WITCH_SKILLS = {
  // The witch's Moonlight
  'silver-circle': {
    id: 'silver-circle', name: 'Silver Circle', domain: 'attunement', mp: 3, delay: 0.9, target: 'all-enemies',
    text: 'Moonlight in a ring around her: 1d4 radiant to every foe, and she sees what each will do next, and next again.',
    effects: [{ type: 'damage', dice: '1d4', diceEvery: 4, kind: 'radiant', aspect: 'radiant' }, { type: 'reveal', ahead: 2 }],
  },
  moonbeam: {
    id: 'moonbeam', name: 'Moonbeam', domain: 'attunement', mp: 3, delay: 1, target: 'enemy',
    text: 'One narrow beam of moonlight: 2d6 radiant. It never misses.',
    effects: [{ type: 'damage', dice: '2d6', diceEvery: 4, kind: 'radiant', aspect: 'radiant' }],
  },
  bless: {
    id: 'bless', name: 'Bless', domain: 'attunement', mp: 2, delay: 0.8, target: 'ally',
    text: 'She traces Witch Way\'s sign over a friend: Moonlit (+1 to hit) and Warded 1d6 + WIS.',
    effects: [{ type: 'status', status: 'hearthlit' }, { type: 'status', status: 'warded', value: { dice: '1d6', stat: 'WIS', diceEvery: 4 } }],
  },
  // Like FF9's Steal: the athame cuts an herb off a foe that grows one. It never does damage and changes nothing in the
  // fight; the game, not the rules, decides which herb (src/battle/director.js GATHERS). A quick snip.
  gather: {
    id: 'gather', name: 'Gather', domain: 'knowledge', mp: 0, delay: 0.6, target: 'enemy',
    text: 'In with the athame and out again with an herb. It cuts herbs and nothing else.',
    effects: [],
  },
  // Inkblot
  pinch: {
    id: 'pinch', name: 'Pinch', domain: 'survival', mp: 2, delay: 0.8, target: 'enemy',
    text: 'A beak where it hurts and a tug at whatever it holds: half-damage peck, 2d6 + DEX grip damage, and it is Flustered (a charge comes to nothing).',
    effects: [{ type: 'attack', weapon: true, mult: 0.5, hit: 2, grip: '2d6', gripStat: 'DEX', riders: [{ type: 'status', status: 'flustered' }] }],
  },
  kraa: {
    id: 'kraa', name: 'Kraa!', domain: 'survival', mp: 0, delay: 0.7, target: 'all-enemies',
    text: '"KRAA." Every foe is Provoked into going for him, and he Guards.',
    effects: [{ type: 'status', status: 'provoked', turns: 1 }, { type: 'status', status: 'guarding', self: true }],
  },
  // Nettie
  'mind-the-jars': {
    id: 'mind-the-jars', name: 'Mind the Jars', domain: 'attunement', mp: 2, delay: 0.9, target: 'enemy',
    text: 'A jar of fen-water, thrown: 1d6 + WIS tide (the Lantern Mother\'s weakness). Some jars bite: DEX save or Snagged.',
    effects: [{ type: 'damage', dice: '1d6', stat: 'WIS', diceEvery: 4, kind: 'tide', aspect: 'tide' }, { type: 'status', status: 'bleeding', save: 'DEX' }],
  },
  'stir-the-pot': {
    id: 'stir-the-pot', name: 'Stir the Pot', domain: 'attunement', mp: 4, delay: 1, target: 'ally',
    text: 'A ladleful from the pot for whoever needs it most: heal 2d8 + WIS.',
    effects: [{ type: 'heal', dice: '2d8', stat: 'WIS', diceEvery: 4 }],
  },
  'bitterroot-poultice': {
    id: 'bitterroot-poultice', name: 'Bitterroot', domain: 'craft', mp: 1, delay: 0.7, target: 'ally',
    text: 'Tastes like regret. Cures Poisoned, Snagged and Rooted, and heals 1d6.',
    effects: [{ type: 'cleanse', statuses: ['poisoned', 'bleeding', 'rooted'] }, { type: 'heal', dice: '1d6' }],
  },
  hex: {
    id: 'hex', name: 'Hex', domain: 'attunement', mp: 1, delay: 0.5, target: 'enemy',
    text: 'Quick as spitting: she says its name backwards. For its next three turns it is Hexed (its attacks and saves roll with disadvantage) and Exposed (-2 Guard). No save: it is her name for it now.',
    effects: [{ type: 'status', status: 'exposed' }, { type: 'status', status: 'hexed', turns: 3 }],
  },
};

// ---- brews -------------------------------------------------------------------------------------------------------------
// From Follow Me Down Witch Way, as Aethermoor consumables (LORE §8). One moonwater each; see docs/SLICE.md §4.
export const WITCH_CONSUMABLES = {
  'heartsease-tonic': {
    id: 'heartsease-tonic', name: 'Heartsease Tonic', target: 'ally-any', price: 0, delay: 0.8,
    effects: [{ type: 'heal', dice: '2d4', pct: 0.3 }, { type: 'revive', pct: 0.3 }],
    text: 'Witch\'s bells in moonwater, for a tired heart. Heals 2d4 + 30% of max HP, or gets a fallen friend up with 30%.',
  },
  'hush-tea': {
    id: 'hush-tea', name: 'Hush Tea', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'status', status: 'staggered' }, { type: 'delay', save: 'WIS', dc: 13, turns: 1, text: '{target} yawns, sits down, and loses a turn.' }],
    text: 'Lavender and silver mugwort, thrown. Whatever it was winding up comes to nothing (Staggered), and unless it makes a WIS save (DC 13) it sits down and loses a turn.',
  },
  moonwater: {
    id: 'moonwater', name: 'Moonwater', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'damage', dice: '2d6', kind: 'tide', aspect: 'tide' }],
    text: 'Well water that held the full moon, thrown raw: 2d6 tide.',
  },
  'remembrance-incense': {
    id: 'remembrance-incense', name: 'Remembrance Incense', target: 'all-allies', price: 0, delay: 1,
    effects: [{ type: 'cleanse', statuses: ['rotting', 'hexed', 'unmade'], omens: ['hollowed'], all: true }],
    text: 'Chapel moss and silver mugwort, so nobody is forgotten. The party sheds Rotting, Hexed and Greyed, and every foe loses Hollowed.',
  },
  'lantern-oil': {
    id: 'lantern-oil', name: 'Lantern Oil', target: 'all-allies', price: 0, delay: 1,
    effects: [{ type: 'cleanse', statuses: ['exposed', 'frightened'] }, { type: 'status', status: 'warded', value: { dice: '1d8', diceEvery: 3 } }],
    text: 'Moonpetal and bogwick: a lamp nobody can put out. The party sheds Exposed and Spooked, and is Warded 1d8.',
  },
  'warming-balm': {
    id: 'warming-balm', name: 'Warming Balm', target: 'ally', price: 0, delay: 0.8,
    effects: [{ type: 'cleanse', statuses: ['chilled', 'frozen'] }, { type: 'status', status: 'hasted' }],
    text: 'Ember-star lily and glowcap, rubbed in. Cures Chilled and Frozen, and Hastes.',
  },
  // In the field Wisp-Calm opens the twisted grove (skips B2); thrown in a fight, every wisp and moth drifts off, shy.
  // Bosses are immune to 'calm'.
  'wisp-calm': {
    id: 'wisp-calm', name: 'Wisp-Calm', target: 'all-enemies', price: 0, delay: 1,
    effects: [{ type: 'damage', dice: '99', kind: 'calm' }],
    text: 'Lavender and wisp-sprout. Every wisp and moth hiccups, goes green again and drifts off, shy.',
  },
  // Duds get cards too ("Wren insisted"), and they are useful thrown (LORE §8)
  'hiccup-tonic': {
    id: 'hiccup-tonic', name: 'Hiccup Tonic', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'status', status: 'staggered' }], text: 'A dud. Thrown, the foe hiccups and Staggers.',
  },
  'swamp-tea': {
    id: 'swamp-tea', name: 'Swamp Tea', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'status', status: 'poisoned', stacks: 2 }], text: 'A dud. Thrown, the foe is Poisoned (two stacks).',
  },
  'droopy-hat-draught': {
    id: 'droopy-hat-draught', name: 'Droopy Hat Draught', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'status', status: 'exposed' }], text: 'A dud. Thrown, its "hat" wilts: Exposed.',
  },
};
