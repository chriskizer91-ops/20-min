#!/usr/bin/env node
// The battle balance simulator for the slice (docs/BALANCE.md). It plays each encounter in src/battle/encounters.js
// many times with scripted player policies, using Aethermoor's own rules (vendor/aethermoor/src/rules), and reports:
// win rate, player turns, fight length in minutes (6 s a hero turn, 3 s a foe or guest turn, 1 s a lost turn),
// lowest HP, brews used, how often each command is chosen, Witchfire's hit rate, and what happened to Hollowed.
//
//   node tools/balance.mjs [B1 B2 ...] [--n 400] [--policy naive,sensible,expert] [--first-strike] [--path brisk]
//                          [--level N] [--wears witch:hag-stone] [--bag heartsease-tonic:2,moonwater:1]
//                          [--seed N --trace] [--json]
//
// Policies:
//   naive     mashes Witchfire and basic attacks (Peck, Nettie's stick); heals only when someone is almost down
//             (under 20%); fires the Full Moon the moment it is full.
//   sensible  uses aspects (Witchfire on Verdant, Moonlight on Blight and Hollowed, never on Radiant; Tide on the Lantern
//             Mother), heals at about 40%, Gathers when it is safe, Pinches what a foe holds, Silver Circle on a crowd.
//   expert    plans around the intents on the ribbon: heals and wards before a hit lands, Pinches or Hushes a charge,
//             Kraa! when a big hit is aimed at someone fragile, times Moonlight to break Hollowed before it strikes,
//             pries the Veil first, and holds brews for when they matter.

import { ENCOUNTERS, ORDER, CURVE, startEncounter, nextForm, partyFor } from '../src/battle/encounters.js';
import { commands, act, foeTurn, timeline, outcome } from '../vendor/aethermoor/src/rules/battle.js';
import { familyData, targetable, alive, unitsOf, foeTable } from '../vendor/aethermoor/src/rules/ai.js';
import { damageMult, effGuard, saveDC } from '../vendor/aethermoor/src/rules/combat.js';
import { avgExpr, scaledTerms } from '../vendor/aethermoor/src/rules/util.js';
import { STATUSES } from '../vendor/aethermoor/src/data/statuses.js';
import { SKILLS } from '../vendor/aethermoor/src/data/skills.js';
import { OMENS } from '../vendor/aethermoor/src/data/omens.js';
import { TUNING } from '../vendor/aethermoor/src/data/tuning.js';

export const SECONDS = { hero: 6, foe: 3, lost: 1 };
export const POLICIES = ['naive', 'sensible', 'expert'];
// What Gather cuts from each foe (LORE §8; src/battle/director.js GATHERS), and what the herb is worth to her tonight:
// 3 = the story needs it (glowcap for the Warming Balm, the skiff), 2 = a brew she will want (bogwick: a second Lantern
// Oil), 1 = nice to have (the rest: wisp-sprout only matters for skipping the fight she is already in)
export const GATHERS = { glowcap: 'glowcap', 'hollowed-mandrake': 'mandrake', 'marsh-light': 'wisp-sprout', boglurcher: 'bogwick', 'willow-wight': 'silver-mugwort' };
export const HERB_VALUE = { glowcap: 3, boglurcher: 2, 'hollowed-mandrake': 1, 'marsh-light': 1, 'willow-wight': 1 };

// ---- small helpers ---------------------------------------------------------------------------------------------------
const frac = u => (u.maxHp ? Math.max(0, u.hp) / u.maxHp : 0);
const foesUp = s => unitsOf(s, 'foe').filter(targetable);
const heroesUp = s => unitsOf(s, 'hero').filter(targetable);
const fallen = s => unitsOf(s, 'hero').filter(h => h.ko && !h.gone);
const has = (u, id) => u.statuses.some(st => st.id === id);
const stacks = (u, id) => u.statuses.find(st => st.id === id)?.stacks || 0;
const anyFlag = (u, key) => u.statuses.some(st => STATUSES[st.id]?.[key]);
const mod = v => Math.floor(((v ?? 10) - 10) / 2);
const holding = f => (f.held || []).filter(p => p.held);
const isBoss = f => f.tier !== 'rabble' && f.tier !== 'veteran';
const hollowedUnstruck = f => f.omens?.includes('hollowed') && !f.struck;
const pick = (C, id) => C[id] && C[id].enabled ? C[id] : null;
const withTarget = (c, t) => ({ ...c, target: t?.id ?? t ?? null });

// d20 kept-value distribution with advantage / disadvantage
function d20(adv, dis) {
  const both = adv !== dis;
  return Array.from({ length: 21 }, (_, r) => (r === 0 ? 0 : !both ? 1 / 20 : adv ? (2 * r - 1) / 400 : (41 - 2 * r) / 400));
}
export function attackOdds(bonus, guard, { adv = false, dis = false, critAt = 20, graze = TUNING.attack.grazeWindow } = {}) {
  const p = d20(adv, dis);
  let hit = 0, crit = 0, gz = 0;
  for (let r = 2; r <= 20; r++) {
    if (r >= critAt) crit += p[r];
    else if (r + bonus >= guard) hit += p[r];
    else if (guard - (r + bonus) <= graze) gz += p[r];
  }
  return { hit, crit, graze: gz };
}
const dieAvg = (expr, level = 1, every = 0) => avgExpr(expr, level, every);
const heroSave = (h, ab) => (h.mods?.[ab] || 0) + (h.stats?.prof || 2) + (h.stats?.saveBonus || 0);
function saveChance(bonus, dc, dis = false) {
  const p = d20(false, dis);
  let ok = 0;
  for (let r = 1; r <= 20; r++) if (r === 20 || (r !== 1 && r + bonus >= dc)) ok += p[r];
  return ok;
}

// ---- what a hero's options are worth against a foe (expected damage) -------------------------------------------------
function heroAttackOdds(h, t, extraHit = 0) {
  const lit = h.statuses.reduce((n, st) => n + (STATUSES[st.id]?.hit || 0), 0);
  return attackOdds(h.stats.weapon.hit + lit + extraHit, effGuard(t), { adv: anyFlag(t, 'attackersAdv'), dis: anyFlag(h, 'attackDis') || anyFlag(h, 'hex'), critAt: h.stats.critRange });
}
export function weaponExp(h, t, mult = 1) {
  const w = h.stats.weapon;
  const o = heroAttackOdds(h, t);
  const dice = dieAvg(w.dice) + w.extra.reduce((a, e) => a + dieAvg(e.dice), 0);
  const flat = w.flat + (has(t, 'marked') ? STATUSES.marked.bonusDmg : 0);
  const m = damageMult(t, w.dmg, w.aspect);
  const norm = Math.max(1, dice + flat) * mult * m, crit = Math.max(1, 2 * dice + flat) * mult * m;
  return o.hit * norm + o.crit * crit + o.graze * norm * TUNING.attack.grazeMult;
}
function damageExp(h, t, eff) {
  const avg = dieAvg(eff.dice, h.level, eff.diceEvery || 0) + (eff.stat ? h.mods?.[eff.stat] || 0 : 0);
  let v = Math.max(1, avg) * damageMult(t, eff.kind || eff.aspect, eff.aspect);
  if (eff.save) v *= 1 - 0.5 * saveChance(t.saves?.[eff.save] || 0, saveDC(h), anyFlag(t, 'hex'));
  return v;
}
const skillExp = (h, t, id) => damageExp(h, t, SKILLS[id].effects[0]);
const moonwaterExp = t => 7 * damageMult(t, 'tide', 'tide');

// ---- what a foe's intent threatens ---------------------------------------------------------------------------------------
// HP-equivalents for statuses a foe can put on a hero (rough: ticks over their duration, or the turns they cost)
const STATUS_COST = { rotting: 9, poisoned: 6, bleeding: 6, burning: 8, hexed: 4, frightened: 4, rooted: 3, staggered: 2, charmed: 9, swallowed: 16, exposed: 3, chilled: 2, frozen: 10, marked: 3 };

function foeAttackExp(f, h, eff) {
  const lit = f.statuses.reduce((n, st) => n + (STATUSES[st.id]?.hit || 0), 0);
  const o = attackOdds(f.atk + (eff.hit || 0) + lit, effGuard(h), { adv: !!eff.adv || anyFlag(h, 'attackersAdv'), dis: anyFlag(f, 'attackDis') || anyFlag(f, 'hex') });
  const every = eff.diceEvery || TUNING.foe.diceEvery;
  const dice = dieAvg(eff.dice || '1d4', f.level, every) + (eff.bonusDice || []).reduce((a, b) => a + dieAvg(b.dice), 0);
  const kind = eff.kind || 'crush', aspect = eff.aspect || eff.bonusDice?.find(b => b.aspect)?.aspect || null;
  let m = damageMult(h, kind, aspect) * (eff.mult || 1);
  if (has(h, 'guarding')) m *= STATUSES.guarding.damageMult;
  const norm = Math.max(1, dice + f.dmg) * m, crit = Math.max(1, 2 * dice + f.dmg) * m;
  const land = o.hit + o.crit;
  let riders = 0;
  for (const r of eff.riders || []) if (r.type === 'status') riders += (STATUS_COST[r.status] || 2) * (r.stacks || 1);
  for (const om of f.omens || []) for (const r of OMENS[om]?.riders || []) riders += STATUS_COST[r.status] || 2;
  return { dmg: o.hit * norm + o.crit * crit + o.graze * norm * TUNING.attack.grazeMult, max: land * (dice * 1.6 + f.dmg) * m, riders: riders * land, land };
}
function foeEffectExp(f, h, eff) {
  if (eff.type === 'attack') return foeAttackExp(f, h, eff);
  if (eff.type === 'damage') {
    const every = eff.diceEvery || TUNING.foe.diceEvery;
    const avg = Math.max(1, dieAvg(eff.dice, f.level, every) + Math.floor((f.dmg || 0) / 2));
    const m = damageMult(h, eff.kind || eff.aspect || 'crush', eff.aspect) * (has(h, 'guarding') ? 0.5 : 1);
    const sv = eff.save ? saveChance(heroSave(h, eff.save), 10 + Math.floor(f.level / 2) + ({ veteran: 1, 'relic-bearer': 2, champion: 3 }[f.tier] || 0), anyFlag(h, 'hex')) : 0;
    const riders = (eff.riders || []).reduce((a, r) => a + (STATUS_COST[r.status] || 2), 0) * (1 - sv);
    return { dmg: avg * m * (1 - 0.5 * sv), max: avg * 1.5 * m, riders, land: 1 };
  }
  if (eff.type === 'status' && !eff.self) {
    const dc = 10 + Math.floor(f.level / 2) + ({ veteran: 1, 'relic-bearer': 2, champion: 3 }[f.tier] || 0);
    const sv = eff.save ? saveChance(heroSave(h, eff.save), dc, anyFlag(h, 'hex')) : 0;
    return { dmg: 0, max: 0, riders: (STATUS_COST[eff.status] || 2) * (1 - sv), land: 1 - sv };
  }
  return { dmg: 0, max: 0, riders: 0, land: 0 };
}
// { [heroId]: { dmg, max, riders } } for one foe's intent (null when it threatens nobody)
export function intentThreat(s, f, it = f.intent) {
  if (!it || it.cancelled || !alive(f)) return {};
  const move = familyData(f).moves[it.move];
  if (!move || f.side !== 'foe') return {};
  let tg;
  const prov = f.statuses.find(st => st.id === 'provoked');
  if (move.target === 'all-enemies') tg = unitsOf(s, 'hero').filter(targetable);
  else if (move.target === 'enemy' || move.target === 'strongest') {
    const id = prov && targetable(s.units[prov.source]) ? prov.source : it.target;
    tg = [s.units[id]].filter(u => u && targetable(u) && u.side === 'hero');
  } else tg = [];
  const out = {};
  for (const h of tg) {
    const acc = { dmg: 0, max: 0, riders: 0 };
    for (const eff of move.effects) {
      const e = foeEffectExp(f, h, eff);
      acc.dmg += e.dmg; acc.max += e.max; acc.riders += e.riders;
    }
    out[h.id] = acc;
  }
  return out;
}
// Average threat of a foe per turn over its table (for focus fire): expected HP damage + status cost to the party
const threatCache = new Map();
function foeThreat(s, f) {
  const key = `${f.family}:${f.variant}:${f.level}:${f.phase}:${holding(f).length}:${f.omens?.join()}`;
  if (threatCache.has(key)) return threatCache.get(key);
  const table = foeTable(f);
  const die = f.die;
  const heroes = heroesUp(s);
  let total = 0;
  for (const [lo, hi, id] of table) {
    const faces = Math.max(0, Math.min(hi, die) - lo + 1);
    if (!faces) continue;
    const move = familyData(f).moves[id];
    if (!move) continue;
    const it = { move: id, target: heroes[0]?.id };
    const th = intentThreat(s, f, it);
    const v = Object.values(th).reduce((a, x) => a + x.dmg + 0.6 * x.riders, 0);
    total += faces / die * v;
  }
  const per = total / (f.delay / 100);
  threatCache.set(key, per);
  return per;
}

// Who acts before hero h's next turn, from the ribbon; for the current actor, the turns after this one
function before(s, h, n = 12) {
  const line = timeline(s, n);
  const start = s.actor === h.id ? 1 : 0;
  const out = [];
  for (let i = start; i < line.length; i++) {
    if (line[i] === h.id) break;
    out.push(line[i]);
  }
  return out;
}
// Expected incoming to each hero before that hero's next turn (from the intents on the ribbon)
function incoming(s) {
  const res = {};
  for (const h of heroesUp(s)) {
    const acc = { dmg: 0, max: 0, riders: 0, from: [] };
    const seen = new Set();
    for (const id of before(s, h)) {
      const f = s.units[id];
      if (!f || f.side !== 'foe' || seen.has(id)) continue;
      seen.add(id);
      for (const key of f.dice > 1 ? ['intent', 'intent2'] : ['intent']) {
        const th = intentThreat(s, f, f[key])[h.id];
        if (th) { acc.dmg += th.dmg; acc.max += th.max; acc.riders += th.riders; acc.from.push(f.id); }
      }
    }
    // damage ticks at the start of its next turn
    for (const st of h.statuses) {
      const tick = STATUSES[st.id]?.tick;
      if (tick) acc.dmg += dieAvg(tick.dice) * (tick.perStack ? st.stacks : 1);
    }
    res[h.id] = acc;
  }
  return res;
}

// ---- choosing a target ---------------------------------------------------------------------------------------------
// Focus fire: finish what we can kill, else hurt what hurts us most per HP it has left.
function focus(s, h, expFn, level) {
  const foes = foesUp(s);
  if (!foes.length) return null;
  if (level === 'naive') return [...foes].sort((a, b) => a.hp - b.hp || a.seq - b.seq)[0];
  let best = null, score = -Infinity;
  for (const f of foes) {
    const e = expFn(f);
    const threat = foeThreat(s, f) + 1;
    let sc = (e / Math.max(1, f.hp)) * threat;
    if (e >= f.hp * 0.9) sc *= 2.2; // a likely kill
    if (level === 'expert' && f.summonedBy) {
      const boss = s.units[f.summonedBy];
      if (boss && alive(boss) && boss.hp < 25) sc *= 0.3; // the moths go when she does
    }
    if (sc > score) { score = sc; best = f; }
  }
  return best;
}

// ---- policies --------------------------------------------------------------------------------------------------------------
function cmdIndex(list) {
  const C = {};
  for (const c of list) C[c.id] = c;
  return C;
}
const lowestFoe = s => [...foesUp(s)].sort((a, b) => a.hp - b.hp || a.seq - b.seq)[0];
const worstHero = s => [...heroesUp(s)].sort((a, b) => frac(a) - frac(b))[0];
const nettieCanHeal = s => heroesUp(s).some(x => x.heroId === 'nettie' && x.mp >= SKILLS['stir-the-pot'].mp);
const harmfulCount = s => heroesUp(s).reduce((a, x) => a + x.statuses.filter(st => STATUSES[st.id]?.harmful).length, 0);

// naive: mash the basic attack at the weakest foe; drink or pot only when someone is almost down; fire the Full Moon
// the moment it is full; revive a fallen friend.
function naiveTurn(s, h, C) {
  const heart = pick(C, 'heartsease-tonic');
  const down = fallen(s);
  if (down.length && heart) return withTarget(heart, down[0]);
  const worst = worstHero(s);
  if (worst && frac(worst) < 0.2) {
    if (h.heroId === 'nettie' && pick(C, 'stir-the-pot')) return withTarget(C['stir-the-pot'], worst);
    if (heart) return withTarget(heart, worst);
  }
  const surge = pick(C, 'surge');
  if (surge) return surge.targeting === 'enemy' ? withTarget(surge, lowestFoe(s)) : surge.targeting === 'ally' ? withTarget(surge, h) : surge;
  return withTarget(pick(C, 'attack'), lowestFoe(s));
}

// The Full Moon, for sensible and expert
function surgePlan(s, h, C, level) {
  const c = pick(C, 'surge');
  if (!c) return null;
  const foes = foesUp(s);
  if (!foes.length) return null;
  if (c.power === 'undo-the-knot') {
    const low = heroesUp(s).filter(x => frac(x) < 0.5).length;
    return harmfulCount(s) >= (level === 'expert' ? 3 : 2) || low >= 2 || (level === 'expert' && fallen(s).length === 0 && low >= 1 && harmfulCount(s) >= 2) ? c : null;
  }
  if (c.power === 'every-shiny-thing') {
    if (level !== 'expert') return c;
    const grips = foes.flatMap(holding).map(p => p.grip);
    if (!grips.length || Math.min(...grips) <= 12 || foes.length >= 3) return c;
    return null;
  }
  if (c.power === 'moonrise') {
    const t = focus(s, h, f => damageExp(h, f, POWER_MOONRISE), level);
    return withTarget(c, t);
  }
  if (c.targeting === 'enemy') return withTarget(c, focus(s, h, f => weaponExp(h, f, 1) * 2, level));
  if (c.targeting === 'ally') return withTarget(c, h);
  return c;
}
const POWER_MOONRISE = { dice: '2d8', diceEvery: 3, stat: 'WIS', kind: 'radiant', aspect: 'radiant' };

// Brews that answer the field
function answerPlan(s, h, C, level) {
  const up = heroesUp(s);
  const inc = pick(C, 'remembrance-incense');
  if (inc) {
    const rot = up.reduce((a, x) => a + stacks(x, 'rotting'), 0);
    const hexed = up.filter(x => has(x, 'hexed')).length;
    const struck = foesUp(s).filter(f => f.omens?.includes('hollowed') && f.struck).length;
    const need = level === 'expert' ? rot + hexed >= 3 || struck >= 2 || (struck >= 1 && rot >= 2) : rot + hexed >= 2 || struck >= 2;
    if (need) return inc;
  }
  const oil = pick(C, 'lantern-oil');
  if (oil) {
    const bad = up.filter(x => has(x, 'exposed') || has(x, 'frightened')).length;
    if (bad >= (level === 'expert' ? Math.min(2, up.length) : 2)) return oil;
  }
  return null;
}

function gatherPlan(s, h, C, level, mem) {
  const g = pick(C, 'gather');
  if (!g) return null;
  const left = foesUp(s);
  const herb = left.filter(f => GATHERS[f.family] && !mem.cut.has(f.id) && !mem.cutFamily?.has(f.family)
    && (HERB_VALUE[f.family] >= 2 || (level === 'expert' && left.length === 1 && frac(f) > 0.3)));
  if (!herb.length) return null;
  if (level === 'sensible') {
    if (!heroesUp(s).every(x => frac(x) >= 0.6)) return null;
  } else {
    const inc = mem.inc || (mem.inc = incoming(s));
    if (heroesUp(s).some(x => frac(x) < 0.5 || (inc[x.id]?.max || 0) >= x.hp * 0.5)) return null;
    if (heroesUp(s).some(x => x.statuses.some(st => STATUSES[st.id]?.tick))) return null;
    // an expert snips the last one standing, or one that is nearly beaten, or while nothing much is coming
    const quiet = heroesUp(s).reduce((a, x) => a + (inc[x.id]?.dmg || 0), 0) < 4;
    if (!(left.length === 1 || quiet || herb.some(f => frac(f) < 0.5))) return null;
  }
  const t = herb.sort((a, b) => frac(a) - frac(b))[0];
  return withTarget(g, t);
}

// ---- the witch -----
function witchOffense(s, h, C, level, mem) {
  const foes = foesUp(s);
  const mp = h.mp;
  const fire = pick(C, 'attack'), sc = pick(C, 'silver-circle'), mb = pick(C, 'moonbeam'), mw = pick(C, 'moonwater');
  // Hollowed: moonlight before the rot lands
  const fresh = foes.filter(hollowedUnstruck);
  if (fresh.length >= 2 && sc) return sc;
  if (fresh.length === 1 && mb) return withTarget(mb, fresh[0]);
  if (fresh.length === 1 && sc) return sc;
  const p = gatherPlan(s, h, C, level, mem);
  if (p) return p;
  if (sc && foes.length >= 3 && mp >= 6) {
    const circle = foes.reduce((a, f) => a + skillExp(h, f, 'silver-circle'), 0);
    const best = Math.max(...foes.map(f => weaponExp(h, f)));
    if (circle > best * (level === 'expert' ? 1.05 : 1.2)) return sc;
  }
  const bless = pick(C, 'bless');
  if (bless && mp >= 7 && foes.some(isBoss) && !(mem.blessCd > 0)) {
    const t = heroesUp(s).filter(x => !has(x, 'warded')).sort((a, b) => frac(a) - frac(b))[0];
    if (t && frac(t) < 0.75) { mem.blessCd = 3; return withTarget(bless, t); }
  }
  const reserve = level === 'expert' ? 3 : 4;
  const opts = [];
  for (const f of foes) {
    opts.push({ c: fire, t: f, v: weaponExp(h, f) });
    if (mb && mp >= 3 + reserve) opts.push({ c: mb, t: f, v: skillExp(h, f, 'moonbeam') - (level === 'expert' ? 1.2 : 2) });
    if (mw && damageMult(f, 'tide', 'tide') >= 1.5) opts.push({ c: mw, t: f, v: moonwaterExp(f) - 3 });
  }
  const tgt = focus(s, h, f => Math.max(...opts.filter(o => o.t === f).map(o => o.v)), level);
  if (!tgt) return pick(C, 'defend');
  const best = opts.filter(o => o.t === tgt).sort((a, b) => b.v - a.v)[0];
  return withTarget(best.c, tgt);
}

// ---- Inkblot -----
const PRY_ORDER = ['mourning-veil', 'dawnbell', 'lamplighters-lantern', 'wickhollow-flame'];
function inkblotOffense(s, h, C, level, mem) {
  const foes = foesUp(s);
  const pinch = pick(C, 'pinch'), peck = pick(C, 'attack');
  if (pinch && h.mp >= 2) {
    let best = null, rank = 99;
    for (const f of foes) for (const piece of holding(f)) {
      const r = PRY_ORDER.indexOf(piece.relic);
      if (r < 0) continue;
      if (piece.relic === 'wickhollow-flame') {
        if (level === 'sensible' && (mem.flames || 0) >= 1) continue;          // one flame, to see it done
        if (level === 'expert' && (f.hp <= weaponExp(h, f) * 1.5 || f.summonedBy)) continue; // not off a moth about to fall
      }
      if (r < rank) { rank = r; best = f; }
    }
    if (best) { if (PRY_ORDER[rank] === 'wickhollow-flame') mem.flames = (mem.flames || 0) + 1; return { ...withTarget(pinch, best), relic: PRY_ORDER[rank] }; }
  }
  const tgt = focus(s, h, f => weaponExp(h, f), level);
  if (!tgt) return pick(C, 'defend');
  return withTarget(peck, tgt);
}

// ---- Nettie -----
function nettieOffense(s, h, C, level, mem) {
  const foes = foesUp(s);
  const bitter = pick(C, 'bitterroot-poultice');
  if (bitter) {
    const t = heroesUp(s).find(x => stacks(x, 'poisoned') + stacks(x, 'bleeding') >= 2 || (level === 'expert' && has(x, 'rooted') && x.heroId !== 'inkblot' && foesUp(s).length > 1));
    if (t) return withTarget(bitter, t);
  }
  const stir = pick(C, 'stir-the-pot');
  const low = worstHero(s);
  if (stir && low && frac(low) < 0.6 && low.maxHp - low.hp >= 12 && h.mp >= 6) return withTarget(stir, low);
  const hex = pick(C, 'hex');
  if (hex && h.mp >= 5) {
    if (level === 'sensible') {
      // hex the big one once, unless her jars already hurt it more (a Tide-weak foe gets the jars instead)
      const t = foes.find(f => (isBoss(f) || f.tier === 'veteran') && !has(f, 'hexed') && damageMult(f, 'tide', 'tide') <= 1 && !(mem.hexed ||= new Set()).has(f.id));
      if (t) { mem.hexed.add(t.id); return withTarget(hex, t); }
    }
  }
  const jars = pick(C, 'mind-the-jars'), stick = pick(C, 'attack');
  const opts = [];
  for (const f of foes) {
    opts.push({ c: stick, t: f, v: weaponExp(h, f) });
    if (jars && h.mp >= 1 + 5) opts.push({ c: jars, t: f, v: skillExp(h, f, 'mind-the-jars') + (f.hp > 10 ? 1.5 : 0) - 1 });
  }
  const tgt = focus(s, h, f => Math.max(...opts.filter(o => o.t === f).map(o => o.v)), level);
  if (!tgt) return pick(C, 'defend');
  return withTarget(opts.filter(o => o.t === tgt).sort((a, b) => b.v - a.v)[0].c, tgt);
}

const OFFENSE = { witch: witchOffense, inkblot: inkblotOffense, nettie: nettieOffense };

// sensible: the rules a careful player follows without reading the ribbon
function sensibleTurn(s, h, C, mem) {
  const heart = pick(C, 'heartsease-tonic');
  const down = fallen(s);
  if (down.length && heart) return withTarget(heart, down.find(d => d.heroId === 'witch') || down[0]);
  const worst = worstHero(s);
  if (worst && frac(worst) < 0.4) {
    if (h.heroId === 'nettie' && pick(C, 'stir-the-pot')) return withTarget(C['stir-the-pot'], worst);
    if (heart && (!nettieCanHeal(s) || frac(worst) < 0.25)) return withTarget(heart, worst);
  }
  let p = surgePlan(s, h, C, 'sensible') || answerPlan(s, h, C, 'sensible');
  if (p) return p;
  if (h.heroId === 'inkblot' && pick(C, 'kraa') && frac(h) >= 0.6 && heroesUp(s).some(x => x.id !== h.id && frac(x) < 0.35)) return C.kraa;
  return OFFENSE[h.heroId](s, h, C, 'sensible', mem);
}

// ---- the expert's valuation: what is coming at each hero before their next turn, and what each answer is worth ------
// A hit is a random variable with outcomes { p, mean, var } (a miss is the rest). koChance enumerates up to five hits'
// outcomes and treats the dice inside each as normal, which is close enough to rank the answers.
function phi(z) { // standard normal CDF (Abramowitz-Stegun 7.1.26)
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
function diceStats(expr, level, every) {
  const { terms, flat } = scaledTerms(expr || '1d4', level, every);
  let mean = flat, v = 0;
  for (const t of terms) { const n = Math.abs(t.n); mean += n * (t.sides + 1) / 2; v += n * (t.sides * t.sides - 1) / 12; }
  return { mean, var: v };
}
// the outcomes of one foe effect on hero h ({ guard: +2 and half damage when `guarded` })
function hitOf(f, h, eff, guarded) {
  const halve = guarded || has(h, 'guarding') ? 0.5 : 1;
  if (eff.type === 'attack') {
    const lit = f.statuses.reduce((n, st) => n + (STATUSES[st.id]?.hit || 0), 0);
    const g = effGuard(h) + (guarded && !has(h, 'guarding') ? 2 : 0);
    const o = attackOdds(f.atk + (eff.hit || 0) + lit, g, { adv: !!eff.adv || anyFlag(h, 'attackersAdv'), dis: anyFlag(f, 'attackDis') || anyFlag(f, 'hex') });
    const d = diceStats(eff.dice, f.level, eff.diceEvery || TUNING.foe.diceEvery);
    for (const b of eff.bonusDice || []) { const e = diceStats(b.dice, 1, 0); d.mean += e.mean; d.var += e.var; }
    const kind = eff.kind || 'crush', aspect = eff.aspect || eff.bonusDice?.find(b => b.aspect)?.aspect || null;
    const m = damageMult(h, kind, aspect) * (eff.mult || 1) * halve;
    const base = d.mean + f.dmg;
    const riders = ((eff.riders || []).reduce((a, r) => a + (STATUS_COST[r.status] || 2) * (r.stacks || 1), 0)
      + (f.omens || []).reduce((a, om) => a + (OMENS[om]?.riders || []).reduce((x, r) => x + (STATUS_COST[r.status] || 2), 0), 0)) * (o.hit + o.crit);
    return { outs: [{ p: o.hit, mean: base * m, var: d.var * m * m }, { p: o.crit, mean: (base + d.mean) * m, var: 2 * d.var * m * m }, { p: o.graze, mean: base * m * 0.5, var: d.var * m * m / 4 }], riders };
  }
  if (eff.type === 'damage') {
    const d = diceStats(eff.dice, f.level, eff.diceEvery || TUNING.foe.diceEvery);
    const base = Math.max(1, d.mean + Math.floor((f.dmg || 0) / 2));
    const m = damageMult(h, eff.kind || eff.aspect || 'crush', eff.aspect) * halve;
    const dc = 10 + Math.floor(f.level / 2) + ({ veteran: 1, 'relic-bearer': 2, champion: 3 }[f.tier] || 0);
    const sv = eff.save ? saveChance(heroSave(h, eff.save), dc, anyFlag(h, 'hex')) : 0;
    const riders = (eff.riders || []).reduce((a, r) => a + (STATUS_COST[r.status] || 2), 0) * (1 - sv);
    return { outs: [{ p: 1 - sv, mean: base * m, var: d.var * m * m }, { p: sv, mean: base * m / 2, var: d.var * m * m / 4 }], riders };
  }
  if (eff.type === 'status' && !eff.self) {
    const dc = 10 + Math.floor(f.level / 2) + ({ veteran: 1, 'relic-bearer': 2, champion: 3 }[f.tier] || 0);
    const sv = eff.save ? saveChance(heroSave(h, eff.save), dc, anyFlag(h, 'hex')) : 0;
    return { outs: [], riders: (STATUS_COST[eff.status] || 2) * (1 - sv) };
  }
  return null;
}
// every hit coming at each hero before that hero's next turn: { [heroId]: [{ foe, single, outs, riders }] }
function hitsComing(s, { guarded = new Set(), redirect = null, cancel = new Set() } = {}) {
  const res = {};
  for (const h of heroesUp(s)) res[h.id] = [];
  for (const h of heroesUp(s)) {
    const seen = new Set();
    for (const id of before(s, h)) {
      const f = s.units[id];
      if (!f || f.side !== 'foe' || seen.has(id) || cancel.has(id)) continue;
      seen.add(id);
      for (const key of f.dice > 1 ? ['intent', 'intent2'] : ['intent']) {
        const it = f[key];
        if (!it || it.cancelled) continue;
        const move = familyData(f).moves[it.move];
        if (!move) continue;
        const prov = f.statuses.find(st => st.id === 'provoked');
        let target = prov && targetable(s.units[prov.source]) ? prov.source : it.target;
        if (redirect && move.target === 'enemy') target = redirect;
        const aimed = move.target === 'all-enemies' || ((move.target === 'enemy' || move.target === 'strongest') && target === h.id);
        if (!aimed) continue;
        for (const eff of move.effects) {
          const x = hitOf(f, h, eff, guarded.has(h.id));
          if (x) res[h.id].push({ foe: f.id, single: move.target !== 'all-enemies', ...x });
        }
      }
    }
  }
  return res;
}
function koChance(hp, hits, ticks = 0) {
  const vars = hits.filter(x => x.outs.length).sort((a, b) => b.outs.reduce((s, o) => s + o.p * o.mean, 0) - a.outs.reduce((s, o) => s + o.p * o.mean, 0));
  const top = vars.slice(0, 5);
  let base = ticks;
  for (const x of vars.slice(5)) base += x.outs.reduce((s, o) => s + o.p * o.mean, 0);
  let total = 0;
  const walk = (i, p, mean, v) => {
    if (p < 1e-4) return;
    if (i === top.length) {
      const need = hp - 0.5 - mean;
      total += p * (v > 0 ? 1 - phi(need / Math.sqrt(v)) : (need <= 0 ? 1 : 0));
      return;
    }
    const outs = top[i].outs;
    const miss = Math.max(0, 1 - outs.reduce((a, o) => a + o.p, 0));
    walk(i + 1, p * miss, mean, v);
    for (const o of outs) if (o.p > 0) walk(i + 1, p * o.p, mean + o.mean, v + o.var);
  };
  walk(0, 1, base, 0);
  return total;
}
const koCost = x => 0.6 * x.maxHp + (x.heroId === 'witch' ? 10 : 6);
function ticksOn(h) {
  let t = 0;
  for (const st of h.statuses) { const tick = STATUSES[st.id]?.tick; if (tick) t += dieAvg(tick.dice) * (tick.perStack ? st.stacks : 1); }
  return t;
}
function wardOn(h) { return h.statuses.find(st => st.id === 'warded')?.value || 0; }
// the danger to the party: expected damage + status cost + the cost of whoever might drop
function dangerOf(s, hits, { hpAdd = {}, wardAdd = {} } = {}) {
  let cost = 0;
  for (const x of heroesUp(s)) {
    const hs = hits[x.id] || [];
    const exp = hs.reduce((a, h) => a + h.outs.reduce((b, o) => b + o.p * o.mean, 0), 0) + ticksOn(x);
    const riders = hs.reduce((a, h) => a + h.riders, 0);
    const hp = Math.min(x.maxHp, x.hp + (hpAdd[x.id] || 0)) + wardOn(x) + (wardAdd[x.id] || 0);
    const ko = koChance(hp, hs, ticksOn(x));
    cost += Math.max(0, exp - (wardAdd[x.id] || 0) * 0.8) + riders * 0.6 + ko * koCost(x);
  }
  return cost;
}

// The expert's reactions, each valued as danger removed; the best is taken when it beats the turn's best attack.
export function expertReaction(s, h, C, mem) {
  const base = hitsComing(s);
  const d0 = dangerOf(s, base);
  if (d0 < 3) return null;
  const opts = [];
  const add = (cmd, danger, extra = 0) => opts.push({ cmd, v: d0 - danger + extra });
  const heroes = heroesUp(s);
  // a heal: HP now, and whatever it takes off the chance of dropping
  const healOpt = (c, amount, x) => {
    const missing = x.maxHp - x.hp;
    add(withTarget(c, x), dangerOf(s, base, { hpAdd: { [x.id]: amount } }), Math.min(amount, missing) * 0.35 - (missing < amount * 0.5 ? 2 : 0));
  };
  const heart = pick(C, 'heartsease-tonic');
  if (heart) for (const x of heroes) healOpt(heart, 5 + Math.round(0.3 * x.maxHp), x);
  const stir = pick(C, 'stir-the-pot');
  if (stir) for (const x of heroes) healOpt(stir, 9 + (h.mods?.WIS || 0) + (h.level >= 5 ? 4.5 : 0), x);
  const bless = pick(C, 'bless');
  if (bless) for (const x of heroes) if (!has(x, 'warded')) add(withTarget(bless, x), dangerOf(s, base, { wardAdd: { [x.id]: 3.5 + (h.mods?.WIS || 0) } }), 0.5);
  if (pick(C, 'defend')) add(C.defend, dangerOf(s, hitsComing(s, { guarded: new Set([h.id]) })), 0.4);
  const kraa = pick(C, 'kraa');
  if (kraa) add(kraa, dangerOf(s, hitsComing(s, { guarded: new Set([h.id]), redirect: h.id })), 0);
  // Hex: its attack rolls go to disadvantage for two of its turns (the second turn is worth about as much again)
  const hex = pick(C, 'hex');
  if (hex) {
    for (const f of foesUp(s)) {
      if (has(f, 'hexed')) continue;
      const hexedF = { ...f, statuses: [...f.statuses, { id: 'hexed', stacks: 1, turns: 3 }] };
      const s2 = { ...s, units: { ...s.units, [f.id]: hexedF } };
      const gain = d0 - dangerOf(s2, hitsComing(s2));
      // Exposed: -2 Guard for its next two turns, so the party lands about 10% more of the hits it throws meanwhile
      // Exposed for three of its turns: -2 Guard, so the party's attacks land more often meanwhile (at most two rounds
      // counted, since the fight moves on). Hex is a quick action, 0.6 of a turn.
      const exposedF = { ...f, statuses: [...f.statuses, { id: 'exposed', stacks: 1, turns: 3 }] };
      const rounds = Math.min(2, 3 * f.delay / 100);
      const exposeGain = has(f, 'exposed') ? 0 : heroesUp(s).reduce((a, x) => a + (weaponExp(x, exposedF) - weaponExp(x, f)) * 100 / x.delay, 0) * rounds;
      add(withTarget(hex, f), d0 - gain * 1.3 - exposeGain - 0.5 * offenseWorth(s, h, C) * damageWorth(s));
    }
  }
  const pinch = pick(C, 'pinch'), hush = pick(C, 'hush-tea');
  for (const f of foesUp(s)) {
    if (!f.intent?.charging || f.intent.cancelled) continue;
    const without = dangerOf(s, hitsComing(s, { cancel: new Set([f.id]) }));
    if (pinch) { const o = heroAttackOdds(h, f); const q = o.hit + o.crit; add(withTarget(pinch, f), q * without + (1 - q) * d0, weaponExp(h, f, 0.5)); }
    if (hush) add(withTarget(hush, f), without, -3); // a brew is worth keeping when a Pinch will do
  }
  if (!opts.length) return null;
  opts.sort((a, b) => b.v - a.v);
  return opts[0];
}

// what this hero's turn is worth spent on the attack (expected damage, and a little for a likely kill)
export function offenseWorth(s, h, C) {
  let best = 0;
  for (const f of foesUp(s)) {
    let e = weaponExp(h, f);
    if (h.heroId === 'witch' && pick(C, 'moonbeam') && h.mp >= 6) e = Math.max(e, skillExp(h, f, 'moonbeam') - 1);
    if (h.heroId === 'nettie' && pick(C, 'mind-the-jars') && h.mp >= 6) e = Math.max(e, skillExp(h, f, 'mind-the-jars'));
    if (e >= f.hp) e += foeThreat(s, f) * 0.5;
    best = Math.max(best, Math.min(e, f.hp + 2));
  }
  return best;
}

// Damage dealt is worth more than itself: it ends the fight sooner, and every round saved is a round of the foes'
// damage not taken. rate = the foes' damage per round over the party's per round.
export function damageWorth(s) {
  const threat = foesUp(s).reduce((a, f) => a + foeThreat(s, f), 0);
  let dps = 0;
  for (const x of heroesUp(s)) {
    const C = cmdIndex(commands({ ...s, actor: x.id }, x.id));
    dps += offenseWorth(s, x, C) * 100 / x.delay;
  }
  return 1 + Math.max(0.3, Math.min(3, threat / Math.max(1, dps)));
}

function expertTurn(s, h, C, mem) {
  const heart = pick(C, 'heartsease-tonic');
  const foes = foesUp(s);
  const down = fallen(s);
  const nearlyWon = foes.reduce((a, f) => a + f.hp, 0) <= 6;
  if (down.length && heart && !nearlyWon) return withTarget(heart, down.find(d => d.heroId === 'witch') || down[0]);
  const r = expertReaction(s, h, C, mem);
  if (r && r.v > offenseWorth(s, h, C) * damageWorth(s) + 0.5) return r.cmd;
  let p = surgePlan(s, h, C, 'expert') || answerPlan(s, h, C, 'expert');
  if (p) return p;
  // a sensible safety net: nobody sits below a quarter for long
  const worst = worstHero(s);
  if (worst && frac(worst) < 0.25) {
    if (h.heroId === 'nettie' && pick(C, 'stir-the-pot')) return withTarget(C['stir-the-pot'], worst);
    if (heart && !nettieCanHeal(s)) return withTarget(heart, worst);
  }
  return OFFENSE[h.heroId](s, h, C, 'expert', mem);
}

// A foe's expected damage from attack rolls per turn (what Hexed halves the odds of)
function attackRollThreat(s, f) {
  const table = foeTable(f);
  const heroes = heroesUp(s);
  if (!heroes.length) return 0;
  let v = 0;
  for (const [lo, hi, id] of table) {
    const faces = Math.max(0, Math.min(hi, f.die) - lo + 1);
    const move = familyData(f).moves[id];
    if (!faces || !move) continue;
    const n = move.target === 'all-enemies' ? heroes.length : 1;
    for (const eff of move.effects) if (eff.type === 'attack') v += faces / f.die * n * foeAttackExp(f, heroes[0], eff).dmg;
  }
  return v;
}

// Slip Away: only when the fight is lost anyway (one hero up and nearly down, nothing left to drink, foes well)
function hopeless(s, C) {
  if (!pick(C, 'flee')) return false;
  const up = heroesUp(s);
  const heals = (s.bag['heartsease-tonic'] || 0) + (up.some(x => x.heroId === 'nettie' && x.mp >= 4) ? 1 : 0);
  const foeHp = foesUp(s).reduce((a, f) => a + f.hp / f.maxHp, 0);
  return up.length === 1 && frac(up[0]) < 0.35 && heals === 0 && foeHp > 0.8;
}

export function decide(s, heroId, level, mem = {}) {
  const h = s.units[heroId];
  const C = cmdIndex(commands(s, heroId).filter(c => !mem.ban?.has(c.id) && !mem.ban?.has(`${h.heroId}:${c.id}`)));
  mem.inc = null;
  if (level !== 'naive' && hopeless(s, C)) return C.flee;
  mem.cut ||= new Set();
  if (mem.blessCd > 0 && h.heroId === 'witch') mem.blessCd--;
  let c = level === 'naive' ? naiveTurn(s, h, C) : level === 'sensible' ? sensibleTurn(s, h, C, mem) : expertTurn(s, h, C, mem);
  if (!c || !c.enabled || !C[c.id]) c = pick(C, 'defend') || pick(C, 'attack') || Object.values(C).find(x => x.enabled && x.targeting !== 'ally-ko');
  if (c.targeting === 'enemy' && !c.target) c = { ...c, target: foesUp(s)[0]?.id };
  return c;
}

// ---- playing one fight -------------------------------------------------------------------------------------------------------
const cmdKey = c => (c.type === 'attack' ? 'attack' : c.type === 'skill' ? c.skill : c.type === 'item' ? `brew:${c.item}` : c.type);

export function playFight(id, { seed = 1, policy = 'sensible', firstStrike = false, path = 'typical', level, wears, bag, trace = false, maxActions = 500, ban = [] } = {}) {
  let s = startEncounter(id, { seed, firstStrike, path, level, wears, bag });
  const st = {
    id, seed, policy, result: null, heroTurns: 0, foeTurns: 0, lost: 0, seconds: 0, lowest: 1, lowestParty: 1, downs: 0,
    brews: {}, moves: {}, fire: { hit: 0, crit: 0, graze: 0, miss: 0, fumble: 0 }, herbs: 0, pried: [], surges: {},
    hollowed: { start: 0, broken: 0, stripped: 0, struck: 0 }, rot: 0, forms: 1, trace: [], hurt: {},
  };
  let lastMove = null;
  const mem = { cut: new Set(), ban: new Set(ban) };
  const hollowStart = new Set(unitsOf(s, 'foe').filter(f => f.omens?.includes('hollowed')).map(f => f.id));
  st.hollowed.start = hollowStart.size;
  const note = (u, text) => { if (trace) st.trace.push(`${String(Math.round(s.time)).padStart(4)} ${u}: ${text}`); };
  const scan = (events, cmd, actor) => {
    for (const e of events) {
      if (e.t === 'move') lastMove = e.name;
      if (e.t === 'status' && e.op === 'tick') lastMove = `tick:${e.status}`;
      if (e.t === 'damage' && s.units[e.target]?.side === 'hero' && e.amount) st.hurt[lastMove || '?'] = (st.hurt[lastMove || '?'] || 0) + e.amount;
      if (e.t === 'roll' && e.purpose === 'attack' && cmd?.type === 'attack' && e.actor === 'witch' && actor === 'witch') st.fire[e.result] = (st.fire[e.result] || 0) + 1;
      else if (e.t === 'ko' && s.units[e.target]?.side === 'hero') st.downs++;
      else if (e.t === 'disarm') st.pried.push(e.relic);
      else if (e.t === 'legend') st.surges[e.power] = (st.surges[e.power] || 0) + 1;
      else if (e.t === 'omen' && e.omen === 'hollowed') {
        if (cmd?.type === 'surge' || cmd?.item === 'remembrance-incense') st.hollowed.stripped++; else st.hollowed.broken++;
      } else if (e.t === 'status' && e.op === 'add' && e.status === 'rotting') st.rot++;
      else if (e.t === 'status' && e.op === 'trigger' && STATUSES[e.status]?.skipTurn) st.lost++;
      else if (e.t === 'move' && e.charm) st.lost++;
      if (trace && ['move', 'roll', 'damage', 'heal', 'ko', 'text', 'phase', 'disarm', 'omen', 'spawn', 'legend'].includes(e.t)) {
        const who = n => s.units[n]?.name || n;
        const line = e.t === 'damage' ? `  ${who(e.target)} takes ${e.amount}${e.eff !== 'normal' ? ` (${e.eff})` : ''}${e.graze ? ' graze' : ''}${e.crit ? ' CRIT' : ''} -> ${e.hp}`
          : e.t === 'roll' ? `  d20 ${e.kept}+${e.bonus}=${e.total} vs ${e.vs} ${e.result}` : e.t === 'heal' ? `  ${who(e.target)} heals ${e.amount} -> ${e.hp}`
            : e.t === 'move' ? `  ${who(e.actor)}: ${e.name}` : `  [${e.t}] ${e.text || e.relic || e.omen || e.name || ''}`;
        st.trace.push(line);
      }
    }
  };
  const track = () => {
    const hs = unitsOf(s, 'hero');
    for (const h of hs) st.lowest = Math.min(st.lowest, frac(h));
    st.lowestParty = Math.min(st.lowestParty, hs.reduce((a, h) => a + Math.max(0, h.hp), 0) / hs.reduce((a, h) => a + h.maxHp, 0));
  };
  scan(s.openingEvents || [], null, null);
  for (let n = 0; n < maxActions; n++) {
    if (s.ended) {
      if (s.ended.result === 'victory') {
        const nx = nextForm(s, { path, level, wears });
        if (nx) { s = nx; st.forms++; scan(s.openingEvents || [], null, null); continue; }
      }
      break;
    }
    const u = s.units[s.actor];
    if (u.side === 'hero') {
      const cmd = decide(s, u.id, policy, mem);
      const k = `${u.heroId}:${cmdKey(cmd)}`;
      st.moves[k] = (st.moves[k] || 0) + 1;
      if (cmd.type === 'item') st.brews[cmd.item] = (st.brews[cmd.item] || 0) + 1;
      if (cmd.skill === 'gather' && GATHERS[s.units[cmd.target]?.family] && !mem.cut.has(cmd.target)) { mem.cut.add(cmd.target); (mem.cutFamily ||= new Set()).add(s.units[cmd.target].family); st.herbs++; }
      note(u.name, `${cmdKey(cmd)}${cmd.target ? ` -> ${s.units[cmd.target]?.name}` : ''}  (hp ${u.hp}/${u.maxHp} mp ${u.mp})`);
      const r = act(s, cmd);
      s = r.state;
      st.heroTurns++;
      scan(r.events, cmd, u.id);
    } else {
      const r = foeTurn(s);
      note(u.name, `${u.intent?.name || '?'}${u.intent?.cancelled ? ' (broken off)' : ''}`);
      s = r.state;
      st.foeTurns++;
      scan(r.events, null, u.id);
    }
    track();
  }
  st.result = s.ended?.result || 'stalemate';
  for (const f of unitsOf(s, 'foe')) if (hollowStart.has(f.id) && f.struck && f.omens?.includes('hollowed')) st.hollowed.struck++;
  st.seconds = st.heroTurns * SECONDS.hero + st.foeTurns * SECONDS.foe + st.lost * SECONDS.lost;
  const out = outcome(s);
  st.xp = out?.xp || 0;
  st.end = unitsOf(s, 'hero').map(h => ({ id: h.heroId, hp: h.hp, maxHp: h.maxHp }));
  return st;
}

// ---- many fights ------------------------------------------------------------------------------------------------------------
const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
const pct = (a, q) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };

export function battery(id, { n = 400, seed0 = 1, ...opts } = {}) {
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(playFight(id, { ...opts, seed: seed0 + i * 7919 }));
  const wins = runs.filter(r => r.result === 'victory');
  const moves = {}, brews = {};
  for (const r of runs) {
    for (const [k, v] of Object.entries(r.moves)) moves[k] = (moves[k] || 0) + v;
    for (const [k, v] of Object.entries(r.brews)) brews[k] = (brews[k] || 0) + v;
  }
  const hurt = {};
  for (const r of runs) for (const [k, v] of Object.entries(r.hurt)) hurt[k] = (hurt[k] || 0) + v / n;
  const fire = runs.reduce((a, r) => { for (const [k, v] of Object.entries(r.fire)) a[k] = (a[k] || 0) + v; return a; }, {});
  const fireN = Object.values(fire).reduce((a, b) => a + b, 0) || 1;
  const sum = (f) => runs.reduce((a, r) => a + f(r), 0);
  return {
    id, policy: opts.policy, firstStrike: !!opts.firstStrike, n,
    win: wins.length / n, lose: runs.filter(r => r.result === 'defeat').length / n, fled: runs.filter(r => r.result === 'fled').length / n, stalemate: runs.filter(r => r.result === 'stalemate').length / n,
    heroTurns: median(runs.map(r => r.heroTurns)), foeTurns: median(runs.map(r => r.foeTurns)),
    minutes: median(runs.map(r => r.seconds / 60)), minutesP10: pct(runs.map(r => r.seconds / 60), 0.1), minutesP90: pct(runs.map(r => r.seconds / 60), 0.9),
    lowest: median(runs.map(r => r.lowest)), lowestWin: median(wins.map(r => r.lowest)), lowestParty: median(runs.map(r => r.lowestParty)),
    downs: sum(r => r.downs) / n, brewsPerFight: sum(r => Object.values(r.brews).reduce((a, b) => a + b, 0)) / n, brews: Object.fromEntries(Object.entries(brews).map(([k, v]) => [k, v / n])),
    moves, fire: { land: (fire.hit + fire.crit) / fireN, graze: fire.graze / fireN, miss: (fire.miss + (fire.fumble || 0)) / fireN, n: fireN / n },
    herbs: sum(r => r.herbs) / n, pried: runs.reduce((a, r) => { for (const p of r.pried) a[p] = (a[p] || 0) + 1 / n; return a; }, {}),
    surges: sum(r => Object.values(r.surges).reduce((a, b) => a + b, 0)) / n,
    hollowed: { start: sum(r => r.hollowed.start) / n, broken: sum(r => r.hollowed.broken) / n, stripped: sum(r => r.hollowed.stripped) / n },
    hurt, rot: sum(r => r.rot) / n, fastest: wins.length ? Math.min(...wins.map(r => r.heroTurns)) : 0,
  };
}

// ---- report ---------------------------------------------------------------------------------------------------------------
const P = x => `${(100 * x).toFixed(0)}%`.padStart(4);
export function report(b) {
  const lines = [];
  const tag = `${b.id}${b.firstStrike ? '+FS' : ''} ${b.policy}`.padEnd(16);
  lines.push(`${tag} win ${P(b.win)}${b.fled ? ` (fled ${P(b.fled).trim()})` : ''}  turns ${String(b.heroTurns).padStart(3)} (+${b.foeTurns} foe)  ${b.minutes.toFixed(1)} min [${b.minutesP10.toFixed(1)}-${b.minutesP90.toFixed(1)}]  lowest ${P(b.lowest)} (party ${P(b.lowestParty)})  downs ${b.downs.toFixed(2)}  brews ${b.brewsPerFight.toFixed(2)}  fire land ${P(b.fire.land)} graze ${P(b.fire.graze)} miss ${P(b.fire.miss)}`);
  const total = {};
  for (const [k, v] of Object.entries(b.moves)) { const h = k.split(':')[0]; total[h] = (total[h] || 0) + v; }
  for (const h of Object.keys(total)) {
    const parts = Object.entries(b.moves).filter(([k]) => k.startsWith(`${h}:`)).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k.slice(h.length + 1)} ${P(v / total[h]).trim()}`);
    lines.push(`    ${h.padEnd(8)} ${parts.join(', ')}`);
  }
  const extra = [];
  if (b.herbs) extra.push(`herbs ${b.herbs.toFixed(2)}`);
  if (Object.keys(b.pried).length) extra.push(`pried ${Object.entries(b.pried).map(([k, v]) => `${k} ${P(v).trim()}`).join(', ')}`);
  if (b.hollowed.start) extra.push(`hollowed ${b.hollowed.start.toFixed(1)}: broken first ${b.hollowed.broken.toFixed(2)}, stripped ${b.hollowed.stripped.toFixed(2)}; rot landed ${b.rot.toFixed(1)}`);
  if (b.surges) extra.push(`surges ${b.surges.toFixed(2)}`);
  if (Object.keys(b.brews).length) extra.push(`brews ${Object.entries(b.brews).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
  extra.push(`fastest win ${b.fastest} turns`);
  lines.push(`    ${extra.join(' | ')}`);
  if (process.env.HURT) lines.push(`    hurt by: ${Object.entries(b.hurt).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}`);
  return lines.join('\n');
}

// ---- CLI ---------------------------------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { ids: [], n: 400, policies: POLICIES, path: 'typical', wears: {}, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (/^B\d/i.test(a)) o.ids.push(a.toUpperCase());
    else if (a === '--n') o.n = +argv[++i];
    else if (a === '--policy') o.policies = argv[++i].split(',');
    else if (a === '--first-strike' || a === '--fs') o.firstStrike = true;
    else if (a === '--path') o.path = argv[++i];
    else if (a === '--level') o.level = +argv[++i];
    else if (a === '--seed') o.seed = +argv[++i];
    else if (a === '--trace') o.trace = true;
    else if (a === '--json') o.json = true;
    else if (a === '--wears') for (const w of argv[++i].split(',')) { const [h, r] = w.split(':'); (o.wears[h] ||= []).push(r); }
    else if (a === '--ban') o.ban = argv[++i].split(',');
    else if (a === '--bag') o.bag = Object.fromEntries(argv[++i].split(',').map(x => { const [k, v] = x.split(':'); return [k, +v]; }));
  }
  if (!o.ids.length) o.ids = ORDER;
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.seed != null) {
    for (const id of o.ids) for (const policy of o.policies) {
      const r = playFight(id, { seed: o.seed, policy, firstStrike: o.firstStrike, path: o.path, level: o.level, wears: o.wears, bag: o.bag, trace: o.trace });
      console.log(`${id} ${policy} seed ${o.seed}: ${r.result} in ${r.heroTurns} hero turns, ${(r.seconds / 60).toFixed(1)} min`);
      if (o.trace) console.log(r.trace.join('\n'));
    }
    return;
  }
  const all = [];
  for (const id of o.ids) {
    const lv = o.level ?? CURVE[o.path][id]?.level;
    if (!o.json) console.log(`\n== ${id} ${ENCOUNTERS[id].name}: party ${ENCOUNTERS[id].party.join(', ')} at level ${lv} (${o.path}); foes ${ENCOUNTERS[id].foes.map(f => `${f.name} L${f.level}`).join(', ')}`);
    const fsModes = o.firstStrike ? [true] : ENCOUNTERS[id].flags.firstStrike ? [false, true] : [false];
    for (const fs of fsModes) for (const policy of o.policies) {
      const b = battery(id, { n: o.n, policy, firstStrike: fs, path: o.path, level: o.level, wears: o.wears, bag: o.bag, ban: o.ban });
      all.push(b);
      if (!o.json) console.log(report(b));
    }
  }
  if (o.json) console.log(JSON.stringify(all, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
