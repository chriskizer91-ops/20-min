// Quill's swap shop rules (src/swap/swaps.js): node --test tests/swaps.test.mjs
// What she can afford, that a swap takes and gives exactly the right things (and never changes the inventory it
// was given), the basket's room, the herb line's choices, Quill's own swap for the skiff, and that the wares are
// what docs/LORE.md §9 and Aethermoor's data say they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THINGS, WARES, QUILL_HERBS, DEMO_START, newInventory, status, canSwap, swap, price, defaultPicks, choicesFor,
  basketUsed, basketSlots, count, wareById, wareCard, holdings, BASKET_SLOTS, HORSESHOE_SLOTS, STACK,
} from '../src/swap/swaps.js';
import { ITEMS, CONSUMABLES } from '../vendor/aethermoor/src/data/items.js';
import { AFFIXES } from '../vendor/aethermoor/src/data/affixes.js';
import { RARITY, RARITY_ORDER } from '../vendor/aethermoor/src/data/rarity.js';
import { RELICS } from '../vendor/aethermoor/src/data/relics.js';
import { GEMS } from '../vendor/aethermoor/src/data/gems.js';

const fresh = () => newInventory();

test('every ware says what Quill wants for it, and every want and gift is a real thing', () => {
  assert.ok(WARES.length >= 10);
  for (const w of WARES) {
    assert.ok(w.wants.length > 0, `${w.id} wants something`);
    for (const want of w.wants) {
      if (want.any) assert.ok(['bottle', 'dud', 'brew', 'herb'].includes(want.any), `${w.id}: any ${want.any}`);
      else assert.ok(THINGS[want.id], `${w.id} wants ${want.id}, which exists`);
      assert.ok(want.n >= 1);
      if (!want.any) assert.notEqual(THINGS[want.id].kind, 'keep', `${w.id} never asks for something she keeps`);
    }
    const card = wareCard(w);
    assert.ok(card.name && card.does && card.rarity, `${w.id} has a name, a rarity and says what it does`);
    assert.ok(RARITY[card.rarity], `${w.id}'s rarity ${card.rarity} is one of Aethermoor's`);
    if (typeof w.gives === 'string') assert.ok(['charm', 'gear', 'curio'].includes(THINGS[w.gives].kind), `Quill offers charms, gear and curios (${w.id})`);
  }
  // she offers herbs, brews and found things
  const offered = new Set(WARES.flatMap((w) => w.wants.map((x) => (x.any ? x.any : THINGS[x.id].kind))));
  for (const k of ['herb', 'brew', 'found']) assert.ok(offered.has(k) || (k === 'brew' && offered.has('bottle')), `Quill asks for ${k}s`);
});

test("LORE's named things are the existing items, not copies", () => {
  // the charms LORE §9 names, with its powers, at Heirloom
  assert.equal(THINGS['charm-horseshoe'].name, 'Horseshoe charm');
  assert.match(THINGS['charm-horseshoe'].does, /4 more slots.*\+1 Guard/);
  assert.match(THINGS['charm-owl'].does, /1\.5× wider.*third intent/);
  assert.match(THINGS['charm-bell'].does, /rare herbs.*Gather or Pinch/);
  for (const c of ['charm-horseshoe', 'charm-owl', 'charm-bell']) assert.equal(THINGS[c].rarity, 'heirloom');
  // brews and duds are Aethermoor's consumables (vendor/aethermoor/src/data/witch.js)
  for (const id of ['heartsease-tonic', 'hush-tea', 'warming-balm', 'lantern-oil', 'remembrance-incense', 'swamp-tea']) {
    assert.equal(THINGS[id].name, CONSUMABLES[id].name);
  }
  assert.equal(THINGS['wickhollow-flame'].name, RELICS['wickhollow-flame'].name);
  assert.equal(THINGS['hag-stone'].name, RELICS['hag-stone'].name);
  assert.equal(THINGS['bog-amber'].name, GEMS['bog-amber'].name);
});

test("Quill's gear is legal Aethermoor loot: real bases, rarities in LORE's tiers, affixes that fit the slot, named by A's rule", () => {
  const lore = ['worn', 'wrought', 'tempered', 'runed', 'storied', 'heirloom'];
  for (const [id, t] of Object.entries(THINGS).filter(([, t]) => t.kind === 'gear')) {
    const base = ITEMS[t.base];
    assert.ok(base, `${id}: base ${t.base}`);
    assert.ok(lore.includes(t.rarity), `${id}: ${t.rarity} is one of the six tiers LORE uses`);
    assert.equal(t.affixes.length, RARITY[t.rarity].affixes, `${id}: a ${t.rarity} piece has ${RARITY[t.rarity].affixes} traits`);
    const groups = new Set();
    const types = { prefix: 0, suffix: 0 };
    for (const a of t.affixes) {
      const A = AFFIXES[a.id];
      assert.ok(A.slots.includes(base.slot), `${id}: ${a.id} can roll on ${base.slot}`);
      assert.ok(A.minTier <= RARITY_ORDER.indexOf(t.rarity), `${id}: ${a.id} at ${t.rarity}`);
      assert.ok(a.value >= A.range[0] && a.value <= Math.ceil(A.range[1] * RARITY[t.rarity].statMult), `${id}: ${a.id} = ${a.value} is in range`);
      if (A.group) { assert.ok(!groups.has(A.group), `${id}: one ${A.group} trait`); groups.add(A.group); }
      types[A.type]++;
    }
    assert.ok(types.prefix <= 2 && types.suffix <= 2);
    const pre = t.affixes.map((a) => AFFIXES[a.id]).find((a) => a.type === 'prefix');
    const suf = t.affixes.map((a) => AFFIXES[a.id]).find((a) => a.type === 'suffix');
    assert.equal(t.name, [pre?.name, base.name, suf?.name].filter(Boolean).join(' '));
  }
  assert.equal(THINGS['mossbound-boots'].name, 'Mossbound Travel Boots of the Wolf-Friend');
});

test('the demo basket can afford several swaps, but not all of them', () => {
  const inv = fresh();
  const ok = WARES.filter((w) => status(inv, w.id) === 'ok').map((w) => w.id);
  const short = WARES.filter((w) => status(inv, w.id) === 'short').map((w) => w.id);
  assert.ok(ok.length >= 6, `several swaps to try: ${ok}`);
  assert.ok(short.length >= 2, `and some she can't yet: ${short}`);
  for (const id of ['the-magpie', 'charm-horseshoe', 'willowmurk-gloves', 'wisp-jar', 'two-herbs']) assert.ok(ok.includes(id), id);
  for (const id of ['charm-owl', 'charm-bell', 'veilkissed-focus']) assert.ok(short.includes(id), id);
  assert.equal(basketUsed(inv), 11);
  assert.equal(basketSlots(inv), BASKET_SLOTS);
});

test('what she can afford: the missing things are named', () => {
  const inv = fresh();
  const owl = canSwap(inv, 'charm-owl');
  assert.equal(owl.ok, false);
  assert.equal(owl.reason, 'short');
  assert.deepEqual(owl.missing, [{ id: 'lantern-oil', n: 1, have: 0 }]);
  const bell = canSwap(inv, 'charm-bell');
  assert.deepEqual(bell.missing, [{ id: 'nightrose', n: 2, have: 1 }]);
  assert.equal(canSwap(inv, 'nothing-at-all').reason, 'unknown');
});

test('a swap takes exactly what Quill wants and gives exactly the ware, and leaves the old inventory alone', () => {
  const inv = fresh();
  const before = JSON.stringify(inv);
  const r = swap(inv, 'charm-horseshoe');
  assert.equal(r.ok, true);
  assert.equal(JSON.stringify(inv), before, 'the inventory it was given is unchanged');
  assert.deepEqual(r.took, [{ id: 'heartsease-tonic', n: 1 }, { id: 'moonpetal', n: 2 }]);
  assert.deepEqual(r.gave, [{ id: 'charm-horseshoe', n: 1 }]);
  const next = r.inventory;
  assert.equal(count(next, 'heartsease-tonic'), 0);
  assert.equal(count(next, 'moonpetal'), 0);
  assert.equal('moonpetal' in next.bag, false, 'used-up things leave the bag');
  assert.equal(count(next, 'charm-horseshoe'), 1);
  assert.equal(next.swaps['charm-horseshoe'], 1);
  // nothing else moved
  for (const [id, n] of Object.entries(DEMO_START)) if (!['heartsease-tonic', 'moonpetal'].includes(id)) assert.equal(count(next, id), n, id);
  // the Horseshoe gives her basket four more slots
  assert.equal(basketSlots(next), BASKET_SLOTS + HORSESHOE_SLOTS);
});

test('a ware he only had one of: once she has it, it is gone from the stall', () => {
  const r = swap(fresh(), 'willowmurk-gloves');
  assert.equal(status(r.inventory, 'willowmurk-gloves'), 'have');
  const again = swap(r.inventory, 'willowmurk-gloves');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'have');
  assert.equal(again.inventory, r.inventory, 'a failed swap hands back the same inventory');
  // she had three lavender and paid two: one left, not enough for the gloves again anyway
  assert.equal(count(r.inventory, 'lavender'), 1);
});

test("any dud will do for the wisp jar, and Quill picks a dud before a brew for 'any bottle'", () => {
  const inv = fresh();
  assert.deepEqual(choicesFor(inv, { any: 'dud' }), ['swamp-tea']);
  // duds first, the skiff's Warming Balm last
  const bottles = choicesFor(inv, { any: 'bottle' });
  assert.equal(bottles[0], 'swamp-tea');
  assert.equal(bottles.at(-1), 'warming-balm');
  assert.deepEqual(defaultPicks(inv, 'wisp-jar').pay, ['swamp-tea']);
  const r = swap(inv, 'wisp-jar');
  assert.deepEqual(r.took, [{ id: 'swamp-tea', n: 1 }]);
  assert.deepEqual(r.gave, [{ id: 'wisp-jar', n: 1 }]);
  // no duds left: the jar's 'any dud' can't be met (and the jar is hers now anyway)
  assert.equal(choicesFor(r.inventory, { any: 'dud' }).length, 0);
  // a pick that isn't a dud is refused
  assert.equal(canSwap(inv, 'wisp-jar', { pay: ['hush-tea'] }).reason, 'pick');
  assert.equal(canSwap(inv, 'wisp-jar', { pay: ['moonwater'] }).reason, 'pick', 'she never pays with what she keeps');
});

test("WW's herb swap: any brew or dud for two herbs of her choosing, the same one twice if she likes", () => {
  const inv = fresh();
  const r = swap(inv, 'two-herbs', { pay: ['hush-tea'], get: ['nightrose', 'nightrose'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.took, [{ id: 'hush-tea', n: 1 }]);
  assert.deepEqual(r.gave, [{ id: 'nightrose', n: 2 }]);
  assert.equal(count(r.inventory, 'nightrose'), 3);
  // and now the Bell charm (two nightrose) is within reach
  assert.equal(status(r.inventory, 'charm-bell'), 'ok');
  // he swaps it as often as she has bottles
  assert.equal(status(r.inventory, 'two-herbs'), 'ok');
  // only Wickhollow's herbs he grows, never glowcap or mandrake tonight, and exactly two
  assert.ok(!QUILL_HERBS.includes('glowcap') && !QUILL_HERBS.includes('mandrake'));
  assert.equal(canSwap(inv, 'two-herbs', { pay: ['hush-tea'], get: ['glowcap', 'lavender'] }).reason, 'pick');
  assert.equal(canSwap(inv, 'two-herbs', { pay: ['hush-tea'], get: ['lavender'] }).reason, 'pick');
  assert.equal(canSwap(inv, 'two-herbs', { pay: ['bow-lamp'], get: ['lavender', 'lavender'] }).reason, 'pick', 'a found thing is not a bottle');
});

test("a swap that won't fit her basket gives everything back; the Horseshoe makes room", () => {
  // 11 of 12 slots: one herb line for two new kinds fits (pay one bottle, gain two slots)...
  let inv = fresh();
  let r = swap(inv, 'two-herbs', { pay: ['swamp-tea'], get: ['wisp_sprout', 'bogwick'] });
  assert.equal(r.ok, true);
  assert.equal(basketUsed(r.inventory), 12);
  // ...a second one doesn't
  inv = r.inventory;
  r = swap(inv, 'two-herbs', { pay: ['hush-tea'], get: ['moonpetal', 'nightrose'] });
  assert.equal(r.ok, true, 'moonpetal and nightrose stack onto what she has');
  r = swap(r.inventory, 'two-herbs', { pay: ['heartsease-tonic'], get: ['silver_mugwort', 'ember_star_lily'] });
  assert.equal(r.ok, true, 'and these stack too');
  const full = swap(r.inventory, 'two-herbs', { pay: ['warming-balm'], get: ['wisp_sprout', 'witchs_bells'] });
  assert.equal(full.ok, true, 'stacks of five hold');
  const full2 = swap(full.inventory, 'two-herbs', { pay: ['warming-balm'], get: ['lavender', 'chapel_moss'] });
  assert.equal(full2.ok, false);
  assert.equal(full2.reason, 'short', 'no Warming Balm left to pay with');
  // build a basket that's exactly full, then try
  const tight = newInventory({ bag: { lavender: 5, moonpetal: 5, witchs_bells: 5, chapel_moss: 5, nightrose: 5, silver_mugwort: 5, ember_star_lily: 5, wisp_sprout: 5, bogwick: 5, 'hush-tea': 1, 'swamp-tea': 2, 'heartsease-tonic': 5 } });
  assert.equal(basketUsed(tight), 12);
  const no = swap(tight, 'two-herbs', { pay: ['hush-tea'], get: ['lavender', 'moonpetal'] });
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'full', 'two new stacks for one freed slot');
  assert.equal(no.inventory, tight, 'nothing changed hands');
  // with the Horseshoe, it fits
  const lucky = newInventory({ bag: { ...tight.bag, 'charm-horseshoe': 1 } });
  assert.equal(swap(lucky, 'two-herbs', { pay: ['hush-tea'], get: ['lavender', 'moonpetal'] }).ok, true);
  assert.equal(STACK, 5);
});

test("Quill's own swap for the skiff: a Warming Balm and the bow-lamp, once", () => {
  const inv = fresh();
  assert.deepEqual(price(inv, 'the-magpie'), [{ id: 'warming-balm', n: 1 }, { id: 'bow-lamp', n: 1 }]);
  const r = swap(inv, 'the-magpie');
  assert.equal(r.ok, true);
  assert.deepEqual(r.gave, [{ skiff: true }]);
  assert.equal(r.inventory.skiff, true);
  assert.equal(count(r.inventory, 'warming-balm'), 0);
  assert.equal(count(r.inventory, 'bow-lamp'), 0);
  assert.equal(Object.keys(r.inventory.bag).includes('the-magpie'), false, 'the skiff is a line of the stall, not a thing in her basket');
  assert.equal(status(r.inventory, 'the-magpie'), 'done');
  assert.equal(swap(r.inventory, 'the-magpie').reason, 'done');
  // without the bow-lamp she can't, yet
  const noLamp = newInventory({ bag: { ...DEMO_START, 'bow-lamp': 0 } });
  assert.deepEqual(canSwap(noLamp, 'the-magpie').missing, [{ id: 'bow-lamp', n: 1, have: 0 }]);
  // and if she spends her Warming Balm on herbs, the skiff has to wait for another
  const spent = swap(inv, 'two-herbs', { pay: ['warming-balm'], get: ['lavender', 'lavender'] });
  assert.equal(spent.ok, true);
  assert.equal(status(spent.inventory, 'the-magpie'), 'short');
});

test('holdings sorts what she has for the shop: basket, found things, worn, curios, kept', () => {
  let inv = swap(fresh(), 'mossbound-boots').inventory;
  inv = swap(inv, 'brass-spyglass').inventory;
  const h = holdings(inv);
  assert.ok(h.basket.some((x) => x.id === 'lavender'));
  assert.ok(h.found.some((x) => x.id === 'bow-lamp'));
  assert.ok(h.worn.some((x) => x.id === 'mossbound-boots'));
  assert.ok(h.curios.some((x) => x.id === 'brass-spyglass'));
  assert.ok(h.kept.some((x) => x.id === 'hag-stone'));
  assert.ok(!h.found.some((x) => x.id === 'wickhollow-flame'), 'the flame went to Quill, to carry home');
  assert.equal(wareById('the-magpie').line, 'skiff');
});
