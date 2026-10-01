// Pick Your Poison: the brewing rules, as plain functions of plain data (no DOM, no three.js), so
// tests/brew.test.mjs can check every recipe, every dud and the moonwater limit. The cauldron screen (ui.js) only
// calls these. None of them changes what it's given: each returns new objects.
//
// The state she brews from:  { basket: { herbId: count }, moonwater: n, bag: { brewId: count }, grimoire }
// The pot on the fire:       { water: bool, herbs: [herbId, ...], stirred: bool }
//
// Witch Way's rules (game/src/brewing.js), kept:
// - A brew is moonwater plus its listed herbs, one of each, and nothing else. Any exact mix brews at any time,
//   even before she knows the recipe.
// - Up to three herbs. A dose herb twice in one pot makes that herb's dud whatever else is in it; any other wrong
//   mix makes Swamp Tea.
// - Nothing is used up until the blessing: taking an herb back out, or leaving a half-made pot, loses nothing.
// - The blessing with witchfire is what finishes it: the herbs and the moonwater go, the brew (or dud) goes in
//   the bag, and the grimoire remembers it the first time.
// Changed here:
// - Moonwater is LORE's limit on brewing: exactly one bottle a brew. She can't pour a second, or pour with none.
// - Herbs may go in before or after the moonwater (Witch Way wanted the water first).
// - Stirring is its own step (Witch Way's button order, kept as a rule): the blessing needs a stirred pot, and
//   anything added after stirring needs stirring again.
// - Virtues: Witch Way keeps its first recipes exact and only lets virtues stand in for each other in the mountains,
//   so LORE's recipes stay exact here too. Virtues colour the pot, and a wrong mix whose virtues match a recipe she
//   knows gets a hint on its card.
import { BASE, MAX_HERBS, HERBS, HERB_IDS, BREWS, DUDS, OTHER_DUD, VIRTUES, MOONWATER_COLOR, byId } from './recipes.js';

export { MAX_HERBS, BASE };

const fail = (reason) => ({ ok: false, reason });
const tally = (herbs) => herbs.reduce((n, h) => ((n[h] = (n[h] ?? 0) + 1), n), {});
export const isHerb = (id) => HERB_IDS.includes(id);

// ---------------------------------------------------------------- what a pot makes

// What moonwater plus `herbs` (herb ids, repeats allowed) turns into: { kind: 'brew' | 'dud', id, why }, or null when
// there are no herbs. `why` is 'recipe', 'dose' (a dose herb twice; `herb` says which) or 'mix'.
export function brewResult(herbs) {
  if (!herbs?.length) return null;
  const counts = tally(herbs);
  for (const dud of DUDS) if (dud.herb && (counts[dud.herb] ?? 0) >= 2) return { kind: 'dud', id: dud.id, why: 'dose', herb: dud.herb };
  for (const brew of BREWS) {
    if (brew.herbs.length === herbs.length && brew.herbs.every((h) => counts[h] === 1)) return { kind: 'brew', id: brew.id, why: 'recipe' };
  }
  return { kind: 'dud', id: OTHER_DUD, why: 'mix' };
}

// The recipe for a brew: its herbs, and the moonwater every brew starts with.
export function recipeOf(id) {
  const brew = BREWS.find((b) => b.id === id);
  return brew ? [BASE, ...brew.herbs] : null;
}

// Every virtue in a pot, one per herb virtue (silver mugwort brings two).
export const virtuesOf = (herbs) => herbs.flatMap((h) => HERBS[h]?.virtues ?? []);

// A wrong mix whose virtues are exactly a recipe's (Calm + Memory, but chapel moss for the silver mugwort): which
// recipe, or null. Each herb counts with its first virtue, the one it's known for.
export function nearMiss(herbs) {
  const r = brewResult(herbs);
  if (!r || r.kind !== 'dud' || r.why !== 'mix') return null;
  const key = (hs) => hs.map((h) => HERBS[h]?.virtues[0]).sort().join('+');
  const mine = key(herbs);
  return BREWS.find((b) => key(b.herbs) === mine)?.id ?? null;
}

// ---------------------------------------------------------------- the pot

export const newPot = () => ({ water: false, herbs: [], stirred: false });

// How many of an herb are still in the basket, not counting the ones already in the pot.
export function herbsLeft(basket, pot, herb) {
  return (basket?.[herb] ?? 0) - pot.herbs.filter((h) => h === herb).length;
}

// Pour the one bottle of moonwater a brew takes. It isn't used up until the blessing.
export function pourWater(pot, moonwater) {
  if (pot.water) return fail('one-per-brew');
  if ((moonwater ?? 0) < 1) return fail('no-moonwater');
  return { ok: true, pot: { ...pot, water: true, stirred: false } };
}

// An herb from the basket into the pot.
export function addHerb(pot, basket, herb) {
  if (!isHerb(herb)) return fail('not-an-herb');
  if (pot.herbs.length >= MAX_HERBS) return fail('pot-full');
  if (herbsLeft(basket, pot, herb) < 1) return fail('none-left');
  return { ok: true, pot: { ...pot, herbs: [...pot.herbs, herb], stirred: false } };
}

// Fish an herb back out (it goes back in the basket, a little damp).
export function takeHerb(pot, index) {
  if (!(index >= 0 && index < pot.herbs.length)) return fail('nothing-there');
  return { ok: true, herb: pot.herbs[index], pot: { ...pot, herbs: pot.herbs.filter((_, i) => i !== index), stirred: false } };
}

export function stir(pot) {
  if (!pot.water) return fail('no-water');
  if (!pot.herbs.length) return fail('no-herbs');
  return { ok: true, pot: { ...pot, stirred: true } };
}

// What she can do next: the steps in order, each ready or not, and the one to suggest.
export function nextStep(pot, state) {
  const steps = {
    herbs: pot.herbs.length < MAX_HERBS && HERB_IDS.some((h) => herbsLeft(state.basket, pot, h) > 0),
    water: !pot.water && (state.moonwater ?? 0) >= 1,
    stir: pot.water && pot.herbs.length > 0 && !pot.stirred,
    bless: pot.stirred,
  };
  const next = pot.stirred ? 'bless' : !pot.herbs.length ? (steps.herbs ? 'herbs' : 'water') : !pot.water ? 'water' : 'stir';
  return { steps, next };
}

// ---------------------------------------------------------------- the blessing

// Bless the pot with witchfire: it becomes a brew or a dud. Returns
// { ok: true, result: { kind, id, why, herb?, first, def, item }, state, pot } (the new state, and an empty pot), or
// { ok: false, reason: 'no-water' | 'no-herbs' | 'not-stirred' | 'no-moonwater' | 'missing-herbs' }.
export function bless(state, pot) {
  if (!pot.water) return fail('no-water');
  if (!pot.herbs.length) return fail('no-herbs');
  if (!pot.stirred) return fail('not-stirred');
  if ((state.moonwater ?? 0) < 1) return fail('no-moonwater');
  const need = tally(pot.herbs);
  if (Object.entries(need).some(([h, n]) => (state.basket?.[h] ?? 0) < n)) return fail('missing-herbs');

  const r = brewResult(pot.herbs);
  const basket = { ...state.basket };
  for (const [h, n] of Object.entries(need)) {
    basket[h] -= n;
    if (basket[h] <= 0) delete basket[h];
  }
  const bag = { ...(state.bag ?? {}) };
  bag[r.id] = (bag[r.id] ?? 0) + 1;
  const { grimoire, first } = record(state.grimoire, r.id, pot.herbs);
  const def = byId(r.id);
  return {
    ok: true,
    result: { ...r, first, def, item: def.item, near: nearMiss(pot.herbs) },
    state: { ...state, basket, moonwater: state.moonwater - 1, bag, grimoire },
    pot: newPot(),
  };
}

// ---------------------------------------------------------------- the grimoire

// Her grimoire: the recipes she has made, in the order she first made them, how often, and the herbs that made
// each (so a dud's page can say what went wrong); and the herbs she has had in her basket.
export const newGrimoire = () => ({ recipes: [], made: {}, from: {}, herbs: [] });

export function record(grimoire = newGrimoire(), id, herbs = []) {
  const g = { ...newGrimoire(), ...grimoire };
  const first = !g.recipes.includes(id);
  return {
    first,
    grimoire: {
      ...g,
      recipes: first ? [...g.recipes, id] : g.recipes,
      made: { ...g.made, [id]: (g.made[id] ?? 0) + 1 },
      from: first ? { ...g.from, [id]: [...herbs].sort() } : g.from,
      herbs: [...new Set([...g.herbs, ...herbs])],
    },
  };
}

// Herbs she has in the basket get their pages too (Witch Way fills an herb's page when she finds it).
export function seeHerbs(grimoire = newGrimoire(), basket = {}) {
  const g = { ...newGrimoire(), ...grimoire };
  const seen = Object.keys(basket).filter((h) => isHerb(h) && basket[h] > 0 && !g.herbs.includes(h));
  return seen.length ? { ...g, herbs: [...g.herbs, ...seen] } : g;
}

export const knows = (grimoire, id) => !!grimoire?.recipes?.includes(id);

// ---------------------------------------------------------------- the colour of the pot

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

// The colour of the water: moonwater's blue, turned by each herb's virtues (every herb weighs a little more than the
// water, so each one dropped in shows). null for a dry, empty pot.
export function potColour(pot) {
  const parts = [];
  if (pot.water) parts.push([MOONWATER_COLOR, 1]);
  for (const h of pot.herbs) {
    const vs = HERBS[h]?.virtues ?? [];
    for (const v of vs) parts.push([VIRTUES[v].color, 1.6 / vs.length]);
  }
  if (!parts.length) return null;
  const total = parts.reduce((s, [, w]) => s + w, 0);
  const rgb = [0, 0, 0];
  for (const [c, w] of parts) hex(c).forEach((v, i) => (rgb[i] += (v * w) / total));
  return toHex(rgb);
}

// ---------------------------------------------------------------- what she says

// Her line when a step can't be done (her voice: warm, dry, small jokes).
export const REFUSALS = {
  'one-per-brew': 'One bottle a brew. Any more and it\'s soup.',
  'no-moonwater': "No moonwater left. The well, the lantern path's crock and Nettie's rain-butt keep the rest.",
  'pot-full': 'Three herbs is a full pot. Any more is a salad.',
  'none-left': "That's the last of those.",
  'not-an-herb': "That doesn't go in a pot.",
  'no-water': 'Stirring a dry pot just scrapes it. Moonwater first.',
  'no-herbs': 'Stirring plain water is just exercise. Herbs first.',
  'not-stirred': 'Stir it first. Blessing an unstirred pot only warms it.',
  'missing-herbs': "Some of those aren't in the basket any more.",
  'nothing-there': 'Nothing to fish out.',
};
