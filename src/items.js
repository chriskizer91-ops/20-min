// Everything she can carry, by one set of ids: Quill's catalogue (src/swap/swaps.js THINGS), which already names every
// herb, brew, dud, charm, piece of gear, curio, found thing and relic of the night. The basket, the swap shop, the
// cauldron and the battle bag all count things by these ids.
//
//   nameOf(id), kindOf(id), iconOf(id)
//   sortBag(bag) -> [[id, n]] in the order the basket lists them
//   basketSlots / basketUsed (WW's basket: 12 slots of 5, 16 with the Horseshoe charm)
import { THINGS, BASKET_SLOTS, STACK, HORSESHOE_SLOTS } from './swap/swaps.js';
import { itemIcons } from './assets-items.js';
import { pixelIcons } from './swap/icons.js';

export { THINGS };
export const nameOf = (id) => THINGS[id]?.name ?? id;
export const kindOf = (id) => THINGS[id]?.kind ?? null;
export const iconOf = (id) => itemIcons[id] ?? pixelIcons[id] ?? pixelIcons['wickhollow-flame'];

// The order things are listed in: moonwater first (every brew needs one), then herbs, brews and duds (the basket),
// then what she keeps about her
const ORDER = ['keep', 'herb', 'brew', 'dud', 'found', 'relic', 'charm', 'gear', 'curio'];
const FIRST = ['moonwater', 'hag-stone'];
export function sortBag(bag) {
  const rank = (id) => (FIRST.includes(id) ? -10 + FIRST.indexOf(id) : ORDER.indexOf(kindOf(id)) + (kindOf(id) ? 0 : 99));
  return Object.entries(bag).filter(([, n]) => n > 0).sort(([a], [b]) => rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b)));
}

// What goes in the basket proper (herbs, brews, duds), as against what she wears or keeps in a pocket
export const inBasket = (id) => !!THINGS[id]?.basket;
export const basketSlots = (bag) => BASKET_SLOTS + ((bag['charm-horseshoe'] ?? 0) > 0 ? HORSESHOE_SLOTS : 0);
export function basketUsed(bag) {
  let slots = 0;
  for (const [id, n] of Object.entries(bag)) if (n > 0 && inBasket(id)) slots += Math.ceil(n / STACK);
  return slots;
}
