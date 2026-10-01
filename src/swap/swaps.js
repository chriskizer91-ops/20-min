// Mister Quill's swaps: what he has, what he wants for it, and the rules of a swap, as data and pure functions
// (no DOM, no three.js), so tests/swaps.test.mjs can check them in Node and any page can use them.
//
// docs/LORE.md §9: "There is no gold. Foes drop herbs where A's dropped coins, and the shop runs on swaps." Quill's
// motto is "Everything's a swap." She offers herbs, brews (and duds) and found things; he offers charms, gear and
// curios, and each ware says what he wants for it.
//
// From Follow Me Down Witch Way's swap rules (game/src/trades.js), where they fit LORE:
//   - Any brew or dud for two herbs of her choosing ("Duds especially. They're vintage."), from Wickhollow's own
//     herbs, the same one twice if she likes. Here that's one line of his stall; glowcap and mandrake aren't in it,
//     because tonight (a full moon) they only come from foes (LORE §8).
//   - Her basket has 12 slots of 5 (herbs, brews and duds go in it); the Horseshoe charm adds 4 slots. A swap that
//     wouldn't fit gives everything back: a swap happens whole, or not at all.
// Everything else follows LORE: the Horseshoe, the Owl and the Bell are WW's charms with LORE §9's powers (Heirloom);
// gear is Aethermoor's base items with Aethermoor's rarities and affixes (vendor/aethermoor/src/data/items.js,
// affixes.js, rarity.js), named by Aethermoor's own rule ("Mossbound Travel Boots of the Wolf-Friend"); the found
// things and the Bog Amber are Aethermoor's (witch.js, relics.js, gems.js); the swap-only curios are defined here.
//
// Quill's own swap for the skiff is a line of the stall, not an item (LORE "The skiff"): a Warming Balm for his
// hands, and a bow-lamp that won't blow out (Silas's flame, relit with Lantern Oil). "Bring her back with the
// lights in her."
//
// An inventory is plain data: { bag: { id: count }, swaps: { wareId: times }, skiff: false }.
//   newInventory()                        the demo's starting basket (DEMO_START), or newInventory({ bag })
//   status(inv, wareId)                   'ok' | 'short' | 'have' | 'done', for the shop's list
//   canSwap(inv, wareId, picks)           { ok, reason, missing, price } without changing anything
//   swap(inv, wareId, picks)              { ok, reason, inventory, took, gave } with a NEW inventory (inv is untouched)
//   picks: { pay: [id for each "any" want, in order], get: [herb ids for a "choose" line] }; defaultPicks() fills them.

import { ITEMS, CONSUMABLES } from '../../vendor/aethermoor/src/data/items.js';
import { RELICS } from '../../vendor/aethermoor/src/data/relics.js';
import { GEMS } from '../../vendor/aethermoor/src/data/gems.js';
import { AFFIXES } from '../../vendor/aethermoor/src/data/affixes.js';
import { RARITY } from '../../vendor/aethermoor/src/data/rarity.js';

export const BASKET_SLOTS = 12; // WW game/src/config.js basket_slots
export const STACK = 5; // WW stack_per_slot
export const HORSESHOE_SLOTS = 4; // WW's Horseshoe: "The basket holds 4 more slots." (LORE §9: Basket +4 slots)

// ---------------------------------------------------------------- everything that can change hands

const herb = (name, rarity, does, note) => ({ kind: 'herb', name, rarity, does, note, basket: true });
const brew = (id, does, note) => ({ kind: 'brew', name: CONSUMABLES[id]?.name, does: does ?? CONSUMABLES[id]?.text, note, basket: true });
const dud = (id, note) => ({ kind: 'dud', name: CONSUMABLES[id].name, does: CONSUMABLES[id].text, note, basket: true });

export const THINGS = {
  // Herbs: all WW's (LORE §8), with WW's rarity and LORE's virtues and battle effects
  lavender: herb('Lavender', 'common', 'Calm. In battle, cures Spooked and Charmed.', 'It settles even the jumpiest wisp. Also sextons.'),
  moonpetal: herb('Moonpetal', 'common', 'Light. In battle, Radiant and Warded.', "Wickhollow's lanterns burn its oil."),
  witchs_bells: herb("Witch's bells", 'common', 'Heart, a dose herb: two in one brew makes a dud. In battle, heals.', 'Foxgloves by another name. Mind the dose.'),
  nightrose: herb('Nightrose', 'uncommon', 'Heart. A gift for Rosalind.', 'It only opens while no cloud covers the moon.'),
  chapel_moss: herb('Chapel moss', 'common', 'Memory. In battle, cleanses Rotting and Hexed.', 'Wren said it was so nobody is forgotten.'),
  silver_mugwort: herb('Silver mugwort', 'common', 'Memory and Endure. In battle, cleanses; Guarding.', "For remembering, and for holding on."),
  ember_star_lily: herb('Ember-star lily', 'uncommon', 'Warm. In battle, Ember; cures Chilled.', 'Half of a Warming Balm.'),
  wisp_sprout: herb('Wisp-sprout', 'rare', 'Calm. Calms spirits.', 'Half of a Wisp-Calm.'),
  bogwick: herb('Bogwick', 'uncommon', 'Light. In battle, Radiant and Warded.', 'Every head ends in a little wick, lit. Half of a Lantern Oil.'),
  glowcap: herb('Glowcap', 'common', 'Warm. In battle, Ember; cures Chilled.', 'Tonight it only comes from a Glowcap, by Gather.'),
  mandrake: herb('Mandrake', 'uncommon', 'Root, a dose herb. In battle, Rooted.', 'Tonight it only comes from the Hollowed Mandrake. Say sorry.'),

  // Brews and duds: WW's recipes, as Aethermoor consumables (vendor/aethermoor/src/data/witch.js)
  'heartsease-tonic': brew('heartsease-tonic', null, "Witch's bells in moonwater, for a tired heart."),
  'hush-tea': brew('hush-tea', null, 'Lavender and silver mugwort. Nettie sleeps an hour on it.'),
  'warming-balm': brew('warming-balm', null, 'Ember-star lily and glowcap. It warms cold hands: Quill\'s swap for the skiff.'),
  'lantern-oil': brew('lantern-oil', null, 'Moonpetal and bogwick: a flame no wind or wisp can blow out.'),
  'remembrance-incense': brew('remembrance-incense', null, 'Chapel moss and silver mugwort, so nobody is forgotten.'),
  'wisp-calm': { kind: 'brew', name: 'Wisp-Calm', does: 'Opens the twisted grove: the wisps and moths let her by.', note: 'Lavender and a wisp-sprout.', basket: true },
  'swamp-tea': dud('swamp-tea', 'A dud. Wren insisted it get a page anyway.'),
  'hiccup-tonic': dud('hiccup-tonic', 'A dud: too much witch\'s bells.'),
  'droopy-hat-draught': dud('droopy-hat-draught', 'A dud. Her hat wilted for a minute.'),

  // Found things: a stolen flame, a Wickhollow trinket, and the flame Silas gives her for the skiff's bow
  'wickhollow-flame': { kind: 'found', name: RELICS['wickhollow-flame'].name, does: 'Pinched back off a lamp-moth. It wants to go home to its wick.', note: RELICS['wickhollow-flame'].lore },
  'grave-candle': { kind: 'found', name: 'Grave candle', does: 'A stub from the chapel graveyard. Lit with witchfire, it\'s the only flame the moon altar will take.', note: 'Nobody minds me taking a stub if I say thank you.' },
  'bow-lamp': { kind: 'found', name: 'The bow-lamp', does: "Silas's flame, relit with Lantern Oil: a lamp for the skiff's bow that no wind or wisp can blow out.", note: 'Half of Quill\'s swap for the skiff.' },
  // Relics of the night: Inkblot's tail feather, back from his nest in the Hollow, and what the bosses let go of
  // (Grip & Claim: a relic is only hers if Inkblot prises it loose). Hers to keep, never Quill's.
  'inkblots-feather': { kind: 'relic', name: RELICS['inkblots-feather'].name, does: 'Back in his tail where it belongs. His surge, Every Shiny Thing: he tugs at every relic at once.', note: RELICS['inkblots-feather'].lore },
  dawnbell: { kind: 'relic', name: RELICS.dawnbell.name, does: 'Matins: rung, it mends the party and shakes off what ails them. It comes from a shrine somewhere far north.', note: RELICS.dawnbell.lore },
  'lamplighters-lantern': { kind: 'relic', name: RELICS['lamplighters-lantern'].name, does: 'Every Lamp Lit: the whole party Warded, and Spooked, Hexed and Charmed shaken off.', note: RELICS['lamplighters-lantern'].lore },
  'mourning-veil': { kind: 'relic', name: RELICS['mourning-veil'].name, does: 'The Last Lament: every foe Spooked and Staggered.', note: RELICS['mourning-veil'].lore },

  // Kept: she never swaps these
  'hag-stone': { kind: 'keep', name: RELICS['hag-stone'].name, does: 'Hag-Sight: look through the hole and see what is really there. Her Full Moon: every foe is Exposed and Hexed.', note: "It's also meant to keep witches away. Rude." },
  moonwater: { kind: 'keep', name: 'Moonwater', does: 'The base of every brew. Thrown raw, 2d6 Tide.', note: 'Well water that held the moon all night.' },
};

// ---------------------------------------------------------------- Quill's side of the stall

// Gear: an Aethermoor base item, a rarity and its affixes (values rolled once, here, and fixed)
function gear(id, { base, rarity, affixes, forWho, slotName, pitch, story }) {
  const b = ITEMS[base];
  const pre = affixes.map((a) => AFFIXES[a.id]).find((a) => a.type === 'prefix');
  const suf = affixes.map((a) => AFFIXES[a.id]).find((a) => a.type === 'suffix');
  const name = [pre?.name, b.name, suf?.name].filter(Boolean).join(' '); // Aethermoor's affixedName (rules/loot.js)
  // what each part gives, and where it comes from: "+4 MP (Rune Focus); +5 MP (Veilkissed); +1 WIS (of the Attuned)"
  const lower = (t) => t[0].toLowerCase() + t.slice(1);
  const lines = [`${lower(b.text)} (${b.name})`, ...affixes.map((a) => `${lower(AFFIXES[a.id].text.replace('{v}', a.value))} (${AFFIXES[a.id].name})`)];
  const enchant = RARITY[rarity].enchant;
  if (enchant) lines.push(`+${enchant * 3} max HP (${RARITY[rarity].name})`);
  if (RARITY[rarity].gemSlots) lines.push(`${RARITY[rarity].gemSlots} gem slot`);
  const does = lines.join('; ');
  THINGS[id] = { kind: 'gear', name, rarity, base, slot: b.slot, affixes, forWho, slotName, does: does[0].toUpperCase() + does.slice(1) + '.', note: story, pitch, unique: true };
  return id;
}

gear('willowmurk-gloves', {
  base: 'gloves', rarity: 'wrought', affixes: [{ id: 'willowmurk', value: 15 }], forWho: 'the witch', slotName: 'gloves',
  story: 'Fen-lace riding gloves from Bogmire\'s market, with all ten fingers. He had them for himself, and thought better of it.',
  pitch: 'All ten fingers, dear. I learned that lesson so you needn\'t.',
});
gear('mossbound-boots', {
  base: 'boots', rarity: 'tempered', affixes: [{ id: 'mossbound', value: 1 }, { id: 'wolffriend', value: 5 }], forWho: 'the witch', slotName: 'boots',
  story: 'Buckled boots gone green at the seams with moss that will not brush off. They are very comfortable about it.',
  pitch: 'Mossbound. They grow on you. Literally, a little.',
});
gear('veilkissed-focus', {
  base: 'rune-focus', rarity: 'runed', affixes: [{ id: 'veilkissed', value: 5 }, { id: 'attuned', value: 1 }, { id: 'eldergrown', value: 6 }],
  forWho: 'the witch', slotName: 'focus',
  story: 'A carved stone disc on a cord, cold on one side and warm on the other. Nobody knows which side is which for long.',
  pitch: 'Runed, dear. Three virtues and a socket. I\'d not part with it for anything but incense.',
});
gear('eldergrown-amulet', {
  base: 'amulet', rarity: 'wrought', affixes: [{ id: 'eldergrown', value: 5 }], forWho: 'Inkblot', slotName: 'charm',
  story: 'A copper charm on a loop small enough for a crow\'s leg. It has been pecked, fondly.',
  pitch: 'For Inkblot. He already thinks it\'s his.',
});

// Charms: WW's, with LORE §9's powers. Heirloom: "Named relics and WW charms only; never random."
THINGS['charm-horseshoe'] = {
  kind: 'charm', name: 'Horseshoe charm', rarity: 'heirloom', unique: true, slotName: 'hat-chain charm', forWho: 'the witch',
  does: 'Her basket holds 4 more slots; +1 Guard.', stats: { guard: 1 }, basketSlots: HORSESHOE_SLOTS,
  note: 'Iron, for luck, and for that hat of hers.', pitch: 'Iron and luck, dear, and room for four more of everything.',
};
THINGS['charm-owl'] = {
  kind: 'charm', name: 'Owl charm', rarity: 'heirloom', unique: true, slotName: 'hat-chain charm', forWho: 'the witch',
  does: 'Her Moonlight reaches 1.5× wider; Silver Circle shows a third intent.',
  note: 'Silver, with amber eyes that catch the moonlight.', pitch: 'An owl sees further. So will you. Bring me a Lantern Oil and a little moss.',
};
THINGS['charm-bell'] = {
  kind: 'charm', name: 'Bell charm', rarity: 'heirloom', unique: true, slotName: 'hat-chain charm', forWho: 'the witch',
  does: 'Chimes near rare herbs, and near foes that carry something to Gather or Pinch.',
  note: 'A silver bell no bigger than a thimble.', pitch: 'Rosalind would give you hers for one nightrose. I am not Rosalind. Two.',
};

// Curios: swap-only, from his years flying the Sable down to Bogmire's market (LORE "The skiff")
THINGS['wisp-jar'] = {
  kind: 'curio', name: 'Wisp jar', rarity: 'storied', unique: true,
  does: 'Empty. Let a calmed wisp drift in, and it leads her toward the nearest rare herb. It comes back every dusk.',
  note: 'Terribly rare, terribly precious, and entirely empty.', pitch: 'Terribly rare, terribly precious, and entirely empty. Trust me.',
};
THINGS['bog-amber'] = {
  kind: 'curio', name: GEMS['bog-amber'].name, rarity: 'tempered', unique: true, gem: 'bog-amber',
  does: 'A gem for a socket: in gear, resist blight 10% and regrow 1 HP a turn; in a weapon, +1d4 blight.',
  note: 'The fen\'s own amber, from Bogmire\'s market. There is a midge in it, very surprised.',
  pitch: 'Bogmire amber. The midge is included at no extra swap.',
};
THINGS['brass-spyglass'] = {
  kind: 'curio', name: 'Brass spyglass', rarity: 'runed', unique: true,
  does: 'On the skiff\'s map, the drifting lights show from twice as far off.',
  note: 'Dented, and it pulls a little to the left. It has seen the whole Sable from a skiff\'s bow.',
  pitch: 'For a Wickhollow flame. I\'ll carry it home to its wick myself; I know every lamp in the square.',
};

// The lines of his stall, in order: what each gives and what he wants for it.
//   wants: [{ id, n }] a particular thing, or [{ any: 'bottle' | 'dud' | 'brew' | 'herb', n }] any of a kind
//   gives: a thing id; or { choose: 'herb', n, from: [...] } (she picks); or { skiff: true } (Quill's own swap)
export const QUILL_HERBS = ['lavender', 'moonpetal', 'witchs_bells', 'nightrose', 'chapel_moss', 'silver_mugwort', 'ember_star_lily', 'wisp_sprout', 'bogwick'];
export const WARES = [
  { id: 'the-magpie', line: 'skiff', name: 'The Magpie', gives: { skiff: true }, wants: [{ id: 'warming-balm', n: 1 }, { id: 'bow-lamp', n: 1 }],
    does: 'Quill\'s sunstone skiff, cold at the jetty since the cold got into his fingers. Warm his hands, light her bow, and she\'s yours to fly.',
    note: 'Named for the shiny things she carried home. It\'s painted on both bows.',
    pitch: 'My own swap, dear: warm hands, and a lamp for her bow that won\'t blow out. Bring her back with the lights in her.' },
  { id: 'charm-horseshoe', gives: 'charm-horseshoe', wants: [{ id: 'heartsease-tonic', n: 1 }, { id: 'moonpetal', n: 2 }] },
  { id: 'charm-owl', gives: 'charm-owl', wants: [{ id: 'lantern-oil', n: 1 }, { id: 'chapel_moss', n: 1 }] },
  { id: 'charm-bell', gives: 'charm-bell', wants: [{ id: 'nightrose', n: 2 }] },
  { id: 'willowmurk-gloves', gives: 'willowmurk-gloves', wants: [{ id: 'lavender', n: 2 }] },
  { id: 'mossbound-boots', gives: 'mossbound-boots', wants: [{ id: 'hush-tea', n: 1 }, { id: 'witchs_bells', n: 1 }] },
  { id: 'veilkissed-focus', gives: 'veilkissed-focus', wants: [{ id: 'remembrance-incense', n: 1 }, { id: 'silver_mugwort', n: 1 }] },
  { id: 'eldergrown-amulet', gives: 'eldergrown-amulet', wants: [{ id: 'grave-candle', n: 1 }] },
  { id: 'wisp-jar', gives: 'wisp-jar', wants: [{ any: 'dud', n: 1 }] },
  { id: 'bog-amber', gives: 'bog-amber', wants: [{ id: 'chapel_moss', n: 1 }, { id: 'lavender', n: 1 }] },
  { id: 'brass-spyglass', gives: 'brass-spyglass', wants: [{ id: 'wickhollow-flame', n: 1 }] },
  { id: 'two-herbs', line: 'herbs', name: 'Two herbs of your choosing', gives: { choose: 'herb', n: 2, from: QUILL_HERBS }, wants: [{ any: 'bottle', n: 1 }],
    does: 'Any two of Wickhollow\'s herbs, the same one twice if she likes (not glowcap or mandrake: tonight those only come from foes).',
    note: 'Follow Me Down Witch Way\'s swap: one brew or dud, two herbs.',
    pitch: 'Any brew, any dud, for two herbs of your choosing. Duds especially. They\'re vintage.' },
];
export const wareById = (id) => WARES.find((w) => w.id === id) ?? null;

// A ware's own card: its name, rarity, kind and what it does (the skiff and the herb line carry their own)
export function wareCard(ware) {
  const t = typeof ware.gives === 'string' ? THINGS[ware.gives] : null;
  return {
    name: ware.name ?? t?.name,
    kind: ware.line === 'skiff' ? 'skiff' : ware.line === 'herbs' ? 'herbs' : t?.kind,
    rarity: ware.line === 'skiff' ? 'heirloom' : ware.line === 'herbs' ? 'wrought' : t?.rarity,
    does: ware.does ?? t?.does,
    note: ware.note ?? t?.note,
    pitch: ware.pitch ?? t?.pitch,
    slotName: t?.slotName, forWho: t?.forWho,
  };
}

// ---------------------------------------------------------------- the witch's side

// The demo's start: a basket of herbs, a couple of brews and a dud, a found thing or two, and what she always
// carries (the hag stone and two moonwater: LORE §5). Enough for several swaps, and not quite enough for all.
export const DEMO_START = {
  lavender: 3, moonpetal: 2, witchs_bells: 2, chapel_moss: 1, nightrose: 1, silver_mugwort: 1, ember_star_lily: 1,
  'heartsease-tonic': 1, 'hush-tea': 1, 'warming-balm': 1, 'swamp-tea': 1,
  'wickhollow-flame': 1, 'grave-candle': 1, 'bow-lamp': 1,
  'hag-stone': 1, moonwater: 2,
};

export function newInventory({ bag = DEMO_START, swaps = {}, skiff = false } = {}) {
  return { bag: { ...bag }, swaps: { ...swaps }, skiff };
}

const copy = (inv) => ({ bag: { ...inv.bag }, swaps: { ...(inv.swaps ?? {}) }, skiff: !!inv.skiff });
export const count = (inv, id) => inv.bag[id] ?? 0;
export const kindOf = (id) => THINGS[id]?.kind ?? null;

// Does a thing answer an "any" want?
export function matches(id, any) {
  const k = kindOf(id);
  if (any === 'bottle') return k === 'brew' || k === 'dud';
  return k === any;
}

// Her basket: 12 slots of 5 (the Horseshoe adds 4); herbs, brews and duds go in it
export const basketSlots = (inv) => BASKET_SLOTS + (count(inv, 'charm-horseshoe') ? HORSESHOE_SLOTS : 0);
export function basketUsed(inv) {
  let slots = 0;
  for (const [id, n] of Object.entries(inv.bag)) if (n > 0 && THINGS[id]?.basket) slots += Math.ceil(n / STACK);
  return slots;
}

// What she has, grouped for the shop's "what she has" panel
export function holdings(inv) {
  const groups = { basket: [], found: [], worn: [], curios: [], kept: [] };
  for (const [id, n] of Object.entries(inv.bag)) {
    if (!(n > 0) || !THINGS[id]) continue;
    const k = THINGS[id].kind;
    const g = THINGS[id].basket ? 'basket' : k === 'found' ? 'found' : k === 'charm' || k === 'gear' ? 'worn' : k === 'curio' ? 'curios' : 'kept';
    groups[g].push({ id, n });
  }
  return groups;
}

// Things she'd better not swap away: what Quill's own swap for the skiff needs, until it's done
export function reserved(inv) {
  return inv.skiff ? [] : wareById('the-magpie').wants.map((w) => w.id);
}

// What she could pay for an "any" want, best first: Quill's favourites (duds) first, then what she has most of,
// and anything the skiff needs last
export function choicesFor(inv, want) {
  const keep = reserved(inv);
  return Object.keys(inv.bag)
    .filter((id) => count(inv, id) > 0 && matches(id, want.any))
    .sort((a, b) => (keep.includes(a) - keep.includes(b)) || ((kindOf(b) === 'dud') - (kindOf(a) === 'dud')) || count(inv, b) - count(inv, a) || a.localeCompare(b));
}

// Picks to start the confirm step from: the best choice for each "any" want, and for a "choose" line the first herbs
export function defaultPicks(inv, wareId) {
  const ware = wareById(wareId);
  if (!ware) return { pay: [], get: [] };
  const pay = ware.wants.filter((w) => w.any).map((w) => choicesFor(inv, w)[0] ?? null);
  const get = ware.gives?.choose ? Array.from({ length: ware.gives.n }, (_, i) => ware.gives.from[i % ware.gives.from.length]) : [];
  return { pay, get };
}

// What a swap would take from her, in things (the "any" wants resolved by picks), merged by id
export function price(inv, wareId, picks = defaultPicks(inv, wareId)) {
  const ware = wareById(wareId);
  if (!ware) return [];
  const out = new Map();
  let k = 0;
  for (const w of ware.wants) {
    const id = w.any ? picks.pay?.[k++] : w.id;
    if (!id) continue;
    out.set(id, (out.get(id) ?? 0) + w.n);
  }
  return [...out].map(([id, n]) => ({ id, n }));
}

// Can she make this swap? { ok, reason, missing: [{ id | any, n, have }], price }
//   reasons: 'unknown' (no such ware), 'done' (the skiff is already swapped), 'have' (she already has the one he
//   had), 'pick' (a pick that doesn't answer its want), 'short' (not enough), 'full' (it wouldn't fit her basket)
export function canSwap(inv, wareId, picks) {
  const ware = wareById(wareId);
  if (!ware) return { ok: false, reason: 'unknown', missing: [], price: [] };
  if (ware.line === 'skiff' && inv.skiff) return { ok: false, reason: 'done', missing: [], price: [] };
  if (typeof ware.gives === 'string' && THINGS[ware.gives].unique && count(inv, ware.gives) > 0) return { ok: false, reason: 'have', missing: [], price: [] };
  picks = picks ?? defaultPicks(inv, wareId);
  const anyWants = ware.wants.filter((w) => w.any);
  // every "any" pick must be something she has that answers it (and never something she keeps)
  for (const [i, w] of anyWants.entries()) {
    const id = picks.pay?.[i];
    if (id && (!matches(id, w.any) || THINGS[id]?.kind === 'keep')) return { ok: false, reason: 'pick', missing: [], price: [] };
  }
  if (ware.gives?.choose) {
    const get = picks.get ?? [];
    if (get.length !== ware.gives.n || !get.every((h) => ware.gives.from.includes(h))) return { ok: false, reason: 'pick', missing: [], price: [] };
  }
  const missing = [];
  let k = 0;
  const cost = price(inv, wareId, picks);
  for (const w of ware.wants) {
    if (w.any) {
      const id = picks.pay?.[k++];
      if (!id) missing.push({ any: w.any, n: w.n, have: 0 });
      continue;
    }
  }
  for (const { id, n } of cost) if (count(inv, id) < n) missing.push({ id, n, have: count(inv, id) });
  if (missing.length) return { ok: false, reason: 'short', missing, price: cost };
  // Would it fit? Try it on a copy: pay first, then take
  const after = apply(copy(inv), ware, cost, picks);
  if (basketUsed(after) > basketSlots(after)) return { ok: false, reason: 'full', missing: [], price: cost };
  return { ok: true, reason: null, missing: [], price: cost };
}

// A swap, whole or not at all. Returns a new inventory; `inv` is never changed.
//   { ok, reason, inventory, took: [{ id, n }], gave: [{ id, n }] (or [{ skiff: true }]), ware }
export function swap(inv, wareId, picks) {
  picks = picks ?? defaultPicks(inv, wareId);
  const check = canSwap(inv, wareId, picks);
  if (!check.ok) return { ok: false, reason: check.reason, missing: check.missing, inventory: inv, took: [], gave: [] };
  const ware = wareById(wareId);
  const next = apply(copy(inv), ware, check.price, picks);
  next.swaps[wareId] = (next.swaps[wareId] ?? 0) + 1;
  return { ok: true, reason: null, inventory: next, took: check.price, gave: gives(ware, picks), ware: wareId };
}

function gives(ware, picks) {
  if (ware.gives?.skiff) return [{ skiff: true }];
  if (ware.gives?.choose) {
    const out = new Map();
    for (const h of picks.get) out.set(h, (out.get(h) ?? 0) + 1);
    return [...out].map(([id, n]) => ({ id, n }));
  }
  return [{ id: ware.gives, n: 1 }];
}

function apply(inv, ware, cost, picks) {
  for (const { id, n } of cost) {
    inv.bag[id] = (inv.bag[id] ?? 0) - n;
    if (inv.bag[id] <= 0) delete inv.bag[id];
  }
  for (const g of gives(ware, picks)) {
    if (g.skiff) inv.skiff = true;
    else inv.bag[g.id] = (inv.bag[g.id] ?? 0) + g.n;
  }
  return inv;
}

// For the list: 'ok' (she can), 'short' (not enough yet), 'have' (she has it), 'done' (the skiff is hers)
export function status(inv, wareId) {
  const r = canSwap(inv, wareId);
  if (r.ok) return 'ok';
  if (r.reason === 'have' || r.reason === 'done') return r.reason;
  return 'short';
}

// ---------------------------------------------------------------- what Quill says
// His first lines, his after line and his swap lines are Follow Me Down Witch Way's (game/data/dialogue.json, quill);
// "Everything's a swap" and "Bring her back with the lights in her" are LORE's and SLICE's. The rest are written in
// his voice for the shop: sly, well dressed, and always coming out slightly ahead.
export const QUILL_LINES = {
  open: 'Everything on this stall is a swap. Everything.',
  openWarm: 'Fingers toasty, pockets full of oddities. What more could a peddler want? A swap.',
  short: 'Alas. Do come back with the rest of it, dear. Everything\'s a swap, and that\'s only half of one.',
  have: 'You have that one already, dear. I only ever had the one.',
  full: "Your basket's full, dear. Even I can't swap into nothing.",
  done: 'Splendid. We both did very well. I did slightly better.',
  dud: 'A dud! Duds especially. They\'re vintage.',
  skiff: ['Ahh. Warm as toast. Warm as two toasts.', 'Everything\'s a swap. Bring her back with the lights in her.'],
  skiffDone: 'She\'s yours, dear, till you bring her home. With the lights in her.',
  keepWarning: 'Mind that one, dear. It\'s half of my swap for the skiff.',
  leave: 'Do come back. Bring a bottle. Bring two.',
};
