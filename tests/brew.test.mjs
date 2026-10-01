// The brewing rules (src/brew/rules.js): every recipe in docs/LORE.md §8, every dud rule, the moonwater limit, the
// blessing and the grimoire. node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  brewResult, recipeOf, nearMiss, newPot, pourWater, addHerb, takeHerb, stir, bless, nextStep, herbsLeft,
  newGrimoire, record, seeHerbs, knows, potColour, virtuesOf, REFUSALS, MAX_HERBS,
} from '../src/brew/rules.js';
import { HERBS, HERB_IDS, BREWS, DUDS, byId } from '../src/brew/recipes.js';
import { WITCH_CONSUMABLES } from '../vendor/aethermoor/src/data/witch.js';

// LORE §8's table, written out again here so a change to the data has to be a deliberate one.
const LORE = {
  'heartsease-tonic': ['witchs_bells'],
  'warming-balm': ['ember_star_lily', 'glowcap'],
  'lantern-oil': ['moonpetal', 'bogwick'],
  'hush-tea': ['lavender', 'silver_mugwort'],
  'wisp-calm': ['lavender', 'wisp_sprout'],
  'remembrance-incense': ['chapel_moss', 'silver_mugwort'],
};

// Brew one pot from start to finish through the rules, the way the screen does.
function brewOnce(state, herbs) {
  let pot = newPot();
  let r = pourWater(pot, state.moonwater);
  assert.ok(r.ok, `pour: ${r.reason}`);
  pot = r.pot;
  for (const h of herbs) {
    r = addHerb(pot, state.basket, h);
    assert.ok(r.ok, `add ${h}: ${r.reason}`);
    pot = r.pot;
  }
  r = stir(pot);
  assert.ok(r.ok, `stir: ${r.reason}`);
  return bless(state, r.pot);
}
const fullBasket = () => Object.fromEntries(HERB_IDS.map((h) => [h, 3]));
const start = (over = {}) => ({ basket: fullBasket(), moonwater: 8, bag: {}, grimoire: newGrimoire(), ...over });

test('the eleven herbs are LORE\'s, each with an icon and a virtue', async () => {
  const { readdirSync } = await import('node:fs');
  const icons = readdirSync(new URL('../art/herbs/', import.meta.url)).map((f) => f.replace('.webp', ''));
  assert.equal(HERB_IDS.length, 11);
  for (const h of HERB_IDS) {
    assert.ok(icons.includes(h), `art/herbs/${h}.webp`);
    assert.ok(HERBS[h].virtues.length >= 1, `${h} has a virtue`);
  }
  assert.deepEqual(HERBS.silver_mugwort.virtues, ['Memory', 'Endure']);
  assert.deepEqual(HERB_IDS.filter((h) => HERBS[h].dose).sort(), ['mandrake', 'witchs_bells']);
});

test('every recipe in LORE §8 brews, in any order', () => {
  assert.deepEqual(BREWS.map((b) => b.id).sort(), Object.keys(LORE).sort());
  for (const [id, herbs] of Object.entries(LORE)) {
    assert.deepEqual(brewResult(herbs), { kind: 'brew', id, why: 'recipe' }, id);
    assert.deepEqual(brewResult([...herbs].reverse()), { kind: 'brew', id, why: 'recipe' }, `${id}, reversed`);
    assert.deepEqual(recipeOf(id), ['moonwater', ...herbs]);
  }
});

test('the brews are the battle bag\'s items, and Wisp-Calm is a field brew only', () => {
  for (const b of BREWS) {
    if (b.id === 'wisp-calm') {
      assert.equal(b.item, null);
      assert.equal(WITCH_CONSUMABLES[b.id], undefined);
    } else {
      assert.equal(b.item, b.id);
      assert.ok(WITCH_CONSUMABLES[b.id], `${b.id} is in WITCH_CONSUMABLES`);
      assert.equal(WITCH_CONSUMABLES[b.id].name, b.name);
    }
    assert.ok(b.field && b.battle, `${b.id} says what it does in the field and in battle`);
  }
  for (const d of DUDS) {
    assert.equal(d.item, d.id);
    assert.ok(WITCH_CONSUMABLES[d.id], `${d.id} is in WITCH_CONSUMABLES`);
    assert.ok(d.field && d.battle, `${d.id} has a card`);
  }
  assert.deepEqual(DUDS.map((d) => d.id).sort(), ['droopy-hat-draught', 'hiccup-tonic', 'swamp-tea']);
});

test('two witch\'s bells in one brew make Hiccup Tonic, whatever else is in the pot', () => {
  assert.equal(brewResult(['witchs_bells', 'witchs_bells']).id, 'hiccup-tonic');
  assert.equal(brewResult(['witchs_bells', 'witchs_bells', 'witchs_bells']).id, 'hiccup-tonic');
  for (const other of HERB_IDS) {
    const r = brewResult(['witchs_bells', other, 'witchs_bells']);
    assert.equal(r.id, 'hiccup-tonic', `bells, ${other}, bells`);
    assert.equal(r.why, 'dose');
  }
});

test('two mandrakes make Droopy Hat Draught; one mandrake is only Swamp Tea', () => {
  assert.equal(brewResult(['mandrake', 'mandrake']).id, 'droopy-hat-draught');
  assert.equal(brewResult(['mandrake', 'lavender', 'mandrake']).id, 'droopy-hat-draught');
  assert.equal(brewResult(['mandrake']).id, 'swamp-tea');
  assert.equal(brewResult(['mandrake', 'silver_mugwort']).id, 'swamp-tea');
});

test('any other wrong mix is Swamp Tea', () => {
  const wrong = [
    ['nightrose'], ['lavender'], ['glowcap'], ['silver_mugwort'],
    ['lavender', 'lavender'], ['lavender', 'lavender', 'silver_mugwort'], // a recipe with an herb doubled
    ['lavender', 'silver_mugwort', 'chapel_moss'], // a recipe with one more herb
    ['witchs_bells', 'lavender'], // Heartsease with something extra
    ['moonpetal', 'glowcap'], ['lavender', 'chapel_moss'], ['nightrose', 'witchs_bells'],
  ];
  for (const herbs of wrong) assert.deepEqual(brewResult(herbs), { kind: 'dud', id: 'swamp-tea', why: 'mix' }, herbs.join(' + '));
  // every single herb and every pair: a recipe, a dose dud, or Swamp Tea, and nothing else
  for (const a of HERB_IDS) {
    for (const b of [null, ...HERB_IDS]) {
      const herbs = b ? [a, b] : [a];
      const r = brewResult(herbs);
      const recipe = Object.entries(LORE).find(([, hs]) => hs.length === herbs.length && hs.every((h) => herbs.includes(h)) && new Set(herbs).size === herbs.length);
      const dose = ['witchs_bells', 'mandrake'].find((d) => herbs.filter((h) => h === d).length >= 2);
      const want = dose ? { witchs_bells: 'hiccup-tonic', mandrake: 'droopy-hat-draught' }[dose] : recipe ? recipe[0] : 'swamp-tea';
      assert.equal(r.id, want, herbs.join(' + '));
    }
  }
});

test('an empty pot makes nothing', () => {
  assert.equal(brewResult([]), null);
  assert.equal(stir(pourWater(newPot(), 1).pot).reason, 'no-herbs');
});

test('moonwater is the limit: one bottle a brew, and none to pour with none left', () => {
  const pot = newPot();
  assert.deepEqual(pourWater(pot, 0), { ok: false, reason: 'no-moonwater' });
  const poured = pourWater(pot, 1);
  assert.ok(poured.ok && poured.pot.water);
  assert.deepEqual(pourWater(poured.pot, 5), { ok: false, reason: 'one-per-brew' });
  assert.equal(pot.water, false, 'pouring returns a new pot');
  // a dry pot can't be stirred or blessed
  const dry = addHerb(newPot(), fullBasket(), 'witchs_bells').pot;
  assert.equal(stir(dry).reason, 'no-water');
  assert.equal(bless(start(), { ...dry, stirred: true }).reason, 'no-water');
  // eight bottles make eight brews, and not a ninth
  let state = start({ basket: { witchs_bells: 20 } });
  for (let i = 0; i < 8; i++) {
    const r = brewOnce(state, ['witchs_bells']);
    assert.ok(r.ok);
    assert.equal(r.state.moonwater, 7 - i);
    state = r.state;
  }
  assert.equal(pourWater(newPot(), state.moonwater).reason, 'no-moonwater');
  assert.equal(bless(state, { water: true, herbs: ['witchs_bells'], stirred: true }).reason, 'no-moonwater');
  assert.equal(state.bag['heartsease-tonic'], 8);
});

test('up to three herbs, and only herbs she has', () => {
  const basket = { lavender: 1, moonpetal: 5 };
  let pot = newPot();
  pot = addHerb(pot, basket, 'lavender').pot;
  assert.equal(addHerb(pot, basket, 'lavender').reason, 'none-left');
  assert.equal(addHerb(pot, basket, 'glowcap').reason, 'none-left');
  assert.equal(addHerb(pot, basket, 'wolfsbane').reason, 'not-an-herb', "wolfsbane isn't one of LORE's eleven");
  assert.equal(addHerb(pot, basket, 'moonwater').reason, 'not-an-herb');
  pot = addHerb(pot, basket, 'moonpetal').pot;
  pot = addHerb(pot, basket, 'moonpetal').pot;
  assert.equal(pot.herbs.length, MAX_HERBS);
  assert.equal(addHerb(pot, basket, 'moonpetal').reason, 'pot-full');
  assert.equal(herbsLeft(basket, pot, 'moonpetal'), 3);
});

test('herbs can go in before or after the moonwater, and stirring comes before the blessing', () => {
  const basket = fullBasket();
  const a = stir(pourWater(addHerb(addHerb(newPot(), basket, 'lavender').pot, basket, 'silver_mugwort').pot, 1).pot);
  const b = stir(addHerb(addHerb(pourWater(newPot(), 1).pot, basket, 'silver_mugwort').pot, basket, 'lavender').pot);
  assert.ok(a.ok && b.ok);
  assert.equal(bless(start(), a.pot).result.id, 'hush-tea');
  assert.equal(bless(start(), b.pot).result.id, 'hush-tea');
  // not stirred, or something added after stirring
  const unstirred = pourWater(addHerb(newPot(), basket, 'witchs_bells').pot, 1).pot;
  assert.equal(bless(start(), unstirred).reason, 'not-stirred');
  const restirred = addHerb(stir(unstirred).pot, basket, 'lavender').pot;
  assert.equal(restirred.stirred, false);
  assert.equal(bless(start(), restirred).reason, 'not-stirred');
});

test('nothing is used up until the blessing, and then exactly the moonwater and the herbs', () => {
  const state = start();
  const before = JSON.stringify(state);
  let pot = pourWater(newPot(), state.moonwater).pot;
  pot = addHerb(pot, state.basket, 'moonpetal').pot;
  pot = addHerb(pot, state.basket, 'bogwick').pot;
  pot = stir(pot).pot;
  assert.equal(JSON.stringify(state), before, 'pouring, adding and stirring change nothing she carries');
  const out = takeHerb(pot, 0);
  assert.equal(out.herb, 'moonpetal');
  assert.deepEqual(out.pot.herbs, ['bogwick']);
  assert.equal(out.pot.stirred, false);
  const r = bless(state, pot);
  assert.ok(r.ok);
  assert.equal(r.result.id, 'lantern-oil');
  assert.equal(r.result.item, 'lantern-oil');
  assert.equal(r.state.moonwater, 7);
  assert.equal(r.state.basket.moonpetal, 2);
  assert.equal(r.state.basket.bogwick, 2);
  assert.equal(r.state.basket.lavender, 3);
  assert.deepEqual(r.state.bag, { 'lantern-oil': 1 });
  assert.deepEqual(r.pot, newPot());
  assert.equal(JSON.stringify(state), before, 'the blessing returns a new state');
  // herbs that are gone from the basket can't be blessed
  assert.equal(bless({ ...state, basket: { moonpetal: 1 } }, pot).reason, 'missing-herbs');
  // the last of an herb leaves the basket altogether
  assert.equal(brewOnce(start({ basket: { witchs_bells: 1 } }), ['witchs_bells']).state.basket.witchs_bells, undefined);
});

test('the grimoire records each recipe the first time she makes it', () => {
  let state = start();
  const first = brewOnce(state, LORE['hush-tea']);
  assert.equal(first.result.first, true);
  assert.deepEqual(first.state.grimoire.recipes, ['hush-tea']);
  assert.ok(knows(first.state.grimoire, 'hush-tea'));
  const again = brewOnce(first.state, LORE['hush-tea']);
  assert.equal(again.result.first, false);
  assert.deepEqual(again.state.grimoire.recipes, ['hush-tea']);
  assert.equal(again.state.grimoire.made['hush-tea'], 2);
  // duds get pages too ("Duds get cards too"), with what made them
  const dud = brewOnce(again.state, ['witchs_bells', 'witchs_bells']);
  assert.equal(dud.result.kind, 'dud');
  assert.equal(dud.result.first, true);
  assert.deepEqual(dud.state.grimoire.recipes, ['hush-tea', 'hiccup-tonic']);
  assert.deepEqual(dud.state.grimoire.from['hiccup-tonic'], ['witchs_bells', 'witchs_bells']);
  // the demo's basket makes every recipe once, and two of the three duds, with its eight moonwater
  state = start({
    basket: { lavender: 2, moonpetal: 1, witchs_bells: 3, nightrose: 1, chapel_moss: 1, silver_mugwort: 2, ember_star_lily: 1, wisp_sprout: 1, bogwick: 1, glowcap: 1, mandrake: 2 },
  });
  for (const herbs of [...Object.values(LORE), ['witchs_bells', 'witchs_bells'], ['mandrake', 'mandrake']]) {
    const r = brewOnce(state, herbs);
    assert.ok(r.ok && r.result.first);
    state = r.state;
  }
  assert.equal(state.moonwater, 0);
  assert.equal(state.grimoire.recipes.length, 8);
  assert.deepEqual(state.basket, { nightrose: 1 });
  // herbs she carries fill their pages
  assert.deepEqual(seeHerbs(newGrimoire(), { glowcap: 1, nightrose: 0, wolfsbane: 2 }).herbs, ['glowcap']);
  assert.deepEqual(record(undefined, 'swamp-tea', ['nightrose']).grimoire.recipes, ['swamp-tea']);
});

test('the pot changes colour with each herb, and virtues hint at a near miss', () => {
  assert.equal(potColour(newPot()), null);
  const water = potColour({ water: true, herbs: [] });
  const one = potColour({ water: true, herbs: ['lavender'] });
  const two = potColour({ water: true, herbs: ['lavender', 'ember_star_lily'] });
  assert.ok(water && one && two && new Set([water, one, two]).size === 3);
  assert.notEqual(potColour({ water: true, herbs: ['ember_star_lily'] }), potColour({ water: true, herbs: ['moonpetal'] }));
  assert.deepEqual(virtuesOf(['silver_mugwort', 'lavender']), ['Memory', 'Endure', 'Calm']);
  assert.equal(nearMiss(['lavender', 'chapel_moss']), 'hush-tea', 'Calm and Memory, with chapel moss for silver mugwort');
  assert.equal(nearMiss(['nightrose']), 'heartsease-tonic', 'a Heart herb, but not the dose herb');
  assert.equal(nearMiss(['lavender', 'silver_mugwort']), null, 'a real recipe is no near miss');
  assert.equal(nearMiss(['witchs_bells', 'witchs_bells']), null);
});

test('the next step, and a line for every refusal', () => {
  const state = start();
  assert.equal(nextStep(newPot(), state).next, 'herbs');
  const withHerb = addHerb(newPot(), state.basket, 'lavender').pot;
  assert.equal(nextStep(withHerb, state).next, 'water');
  const wet = pourWater(withHerb, 8).pot;
  assert.equal(nextStep(wet, state).next, 'stir');
  assert.equal(nextStep(stir(wet).pot, state).next, 'bless');
  assert.equal(nextStep(newPot(), { basket: {}, moonwater: 0 }).steps.water, false);
  for (const reason of ['one-per-brew', 'no-moonwater', 'pot-full', 'none-left', 'not-an-herb', 'no-water', 'no-herbs', 'not-stirred', 'missing-herbs', 'nothing-there']) {
    assert.ok(REFUSALS[reason], reason);
  }
  for (const d of [...BREWS, ...DUDS]) assert.equal(byId(d.id), d);
});
