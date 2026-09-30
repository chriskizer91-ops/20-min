// ADDED for the 20-min game "Moonlight & Mire" (not in Aethermoor): the Moonlight Witch as a hero, her witchfire,
// her skills and her brews, in Aethermoor's own data formats (see heroes.js, skills.js and items.js for the
// fields). heroes.js, skills.js and items.js merge these in. Her kit follows docs/LORE.md §5 and §8: she has no
// weapon but her witchfire; the athame never does damage (Gather); brews come from Follow Me Down Witch Way.

export const WITCH_ITEMS = {
  // Her "weapon" is the violet flame in her hand: d20 against Guard for 1d8 Ember (LORE §5).
  witchfire: {
    id: 'witchfire', name: 'Witchfire', kind: 'witchfire', slot: 'weapon', dice: '1d8', dmg: 'ember', aspect: 'ember',
    hands: 1, weight: -5, ability: ['WIS'], ranged: true, minIlvl: 99, stats: {},
    text: '1d8 ember: the violet flame in her hand, thrown',
  },
};

export const WITCH_HEROES = {
  witch: {
    id: 'witch', name: 'The Moonlight Witch', title: 'of Wickhollow', race: 'human', role: 'Witchfire, moonlight and brews',
    base: { STR: 9, DEX: 13, CON: 13, INT: 12, WIS: 16, CHA: 14 },
    hpDie: 8, mp: { base: 12, perLevel: 3, stat: 'WIS' },
    domain: 'attunement', secondary: ['knowledge'],
    prof: { weapons: ['witchfire'], armor: ['robe', 'leather'], offhand: ['focus'] },
    asi: [['WIS', 'CHA'], ['WIS', 'CON']],
    skills: [{ level: 1, id: 'silver-circle' }, { level: 1, id: 'gather' }, { level: 2, id: 'moonbeam' }, { level: 3, id: 'bless' }],
    gear: { weapon: { base: 'witchfire', rarity: 'worn' }, body: { base: 'robe', rarity: 'wrought' } },
    traits: [{ id: 'moonlit', name: 'Moonlit', text: 'Her Moonlight shows what hides: she always sees a foe\'s aspect.', stats: { mp: 2 } }],
    refuses: { kinds: ['sword', 'dagger', 'axe', 'bow', 'spear', 'hammer', 'mace'], text: 'Her athame cuts herbs and nothing else. She\'s asked it.' },
    blurb: 'Wickhollow\'s witch. She gathers by moonlight, brews for her friends, and apologises to mandrakes.',
  },
};

export const WITCH_SKILLS = {
  'silver-circle': {
    id: 'silver-circle', name: 'Silver Circle', domain: 'attunement', mp: 3, delay: 0.9, target: 'all-enemies',
    text: 'Moonlight in a ring around her: 1d4 radiant to every foe, and she sees what each will do next.',
    effects: [{ type: 'damage', dice: '1d4', diceEvery: 4, kind: 'radiant', aspect: 'radiant' }, { type: 'reveal', ahead: 2 }],
  },
  moonbeam: {
    id: 'moonbeam', name: 'Moonbeam', domain: 'attunement', mp: 3, delay: 1, target: 'enemy',
    text: 'One narrow beam of moonlight: 2d6 radiant.',
    effects: [{ type: 'damage', dice: '2d6', diceEvery: 4, kind: 'radiant', aspect: 'radiant' }],
  },
  bless: {
    id: 'bless', name: 'Bless', domain: 'attunement', mp: 2, delay: 0.8, target: 'ally',
    text: 'She traces Witch Way\'s sign over a friend: Moonlit (+1 to hit) and Warded 1d6.',
    effects: [{ type: 'status', status: 'hearthlit' }, { type: 'status', status: 'warded', value: { dice: '1d6' } }],
  },
  // Like FF9's Steal: the athame cuts an herb off a foe that grows one. It never does damage. The game, not the
  // rules, decides which herb (src/battle), so the effect list is empty.
  gather: {
    id: 'gather', name: 'Gather', domain: 'knowledge', mp: 0, delay: 0.9, target: 'enemy',
    text: 'In with the athame and out again with an herb. It cuts herbs and nothing else.',
    effects: [],
  },
};

// Brews from Follow Me Down Witch Way, as Aethermoor consumables (LORE §8)
export const WITCH_CONSUMABLES = {
  'heartsease-tonic': {
    id: 'heartsease-tonic', name: 'Heartsease Tonic', target: 'ally', price: 0, delay: 0.8,
    effects: [{ type: 'heal', dice: '2d4', pct: 0.25 }],
    text: 'Witch\'s bells in moonwater, for a tired heart. Heals 2d4 + 25% of max HP.',
  },
  'hush-tea': {
    id: 'hush-tea', name: 'Hush Tea', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'delay', save: 'WIS', turns: 1, text: '{target} yawns, sits down, and loses a turn.' }],
    text: 'Lavender and silver mugwort, thrown. WIS save, or the foe loses a turn.',
  },
  moonwater: {
    id: 'moonwater', name: 'Moonwater', target: 'enemy', price: 0, delay: 0.8,
    effects: [{ type: 'damage', dice: '2d6', kind: 'tide', aspect: 'tide' }],
    text: 'Well water that held the full moon, thrown raw: 2d6 tide.',
  },
  'remembrance-incense': {
    id: 'remembrance-incense', name: 'Remembrance Incense', target: 'ally', price: 0, delay: 1,
    effects: [{ type: 'cleanse', statuses: ['rotting', 'hexed', 'unmade'] }],
    text: 'Chapel moss and silver mugwort, so nobody is forgotten. Clears Rotting, Hexed and Greyed.',
  },
};
