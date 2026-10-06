// garage.js: the port's garage, the panel the Captain spends shards in. Four tabs:
//   Ships     buy the next ship up, or choose which one to sail
//   Parts     buy parts and their upgrades (Mk I to V), and fit them into the ship's slots
//   Tuning    share the crystal power between sails, guns and lift (free)
//   Captain   the Captain's level and renown, and skill points for the Helm, Gunnery, Crew and Crystals
// Every change shows on the ship at once (her fittings, her numbers), and is saved.
import * as P from './progress.js';
import { STATS } from '../ships/index.js';
import { handling } from './flight.js';

const $ = (id) => document.getElementById(id);
const MK = P.MARKS;
const pct = (x) => `${x > 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;
const WORDS = { hull: 'hull', sails: 'sails', crystals: 'crystals', speed: 'speed', turn: 'turning', climb: 'climbing', damage: 'damage',
  reload: 'reload time', range: 'range', pitch: 'gun tilt', swing: 'gun swing', power: 'power to share', repair: 'repairs' };
const { GAIN, COST } = P;

// env: { captain(), names: { id: name }, changed(), setSail(), free() }
export function makeGarage(env) {
  let tab = 'ships', note = '';
  const C = () => env.captain();
  const say = (err, ok) => { note = err ?? ok ?? ''; if (!err) { P.save(C()); env.changed(); } render(); };

  function tabs() {
    for (const b of $('g-tabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  }
  // what the part does at a mark, in words with numbers
  function partLine(Pt, m) {
    const g = Object.entries(Pt.plus).map(([k, x]) => `${pct(x * GAIN[m])} ${WORDS[k]}`).join(', ');
    const c = Object.entries(Pt.minus).map(([k, x]) => `${pct(x * COST[m])} ${WORDS[k]}`).join(', ');
    return `<small class="gain">${g}</small><small class="cost">${c}</small>`;
  }
  function shipStats(id) {
    const c = C(), S = STATS[id], H = handling(S), e = P.effects(c, id);
    const kmh = (v) => Math.round(v * 3.6);
    const row = (k, base, mult, unit = '') => `<dt>${k}</dt><dd>${Math.round(base * mult).toLocaleString()}${unit}${Math.abs(mult - 1) > 0.005 ? ` <i>${pct(mult - 1)}</i>` : ''}</dd>`;
    return `<dl class="g-stats">${row('Hull', S.hull, e.hull)}${row('Sails', S.sails, e.sails)}${row('Crystals', S.crystals, e.crystals)}`
      + `${row('Top speed', kmh(H.vmax), e.speed, ' km/h')}${row('Turning', (H.turn * 180) / Math.PI, e.turn, '° a second')}${row('Climbing', H.climb, e.climb, ' m/s')}`
      + `<dt>Guns</dt><dd>${S.bow} bow · ${S.stern} stern · ${S.side} a side</dd><dt>Part slots</dt><dd>${P.SLOTS[id]}</dd></dl>`;
  }

  function render() {
    const c = C(), free = env.free();
    tabs();
    const lv = P.levelOf(c.renown);
    $('g-purse').innerHTML = free ? 'Free flight: everything is yours' : `<b>${c.shards.toLocaleString()}</b> shards · voyage ${c.voyage}, wave ${c.wave} of ${P.wavesIn(c.voyage)}`;
    $('g-note').textContent = note;
    let html = '';
    if (tab === 'ships') {
      html = P.SHIP_ORDER.map((id) => {
        const own = c.ships.includes(id), sailing = c.ship === id, price = P.SHIP_PRICE[id];
        const btn = sailing ? '<button type="button" class="chip" disabled>Sailing her</button>'
          : own ? `<button type="button" class="chip" data-act="sail" data-id="${id}">Sail her</button>`
            : `<button type="button" class="chip buy" data-act="buyship" data-id="${id}"${c.shards < price ? ' aria-disabled="true"' : ''}>Buy · ${price.toLocaleString()}</button>`;
        return `<article class="g-card${sailing ? ' on' : ''}"><header><b>${env.names[id]}</b><span>${id[0].toUpperCase() + id.slice(1)}</span>${btn}</header>${shipStats(id)}</article>`;
      }).join('');
    } else if (tab === 'parts') {
      const list = c.fitted[c.ship], slots = P.SLOTS[c.ship];
      html = `<p class="g-slots">${list.length} of ${slots} slot${slots > 1 ? 's' : ''} used on the ${env.names[c.ship]}</p>` + P.PARTS.map((Pt) => {
        const m = c.parts[Pt.id] ?? 0, fitted = list.includes(Pt.id), next = m + 1;
        const buy = m >= P.MAX_MARK ? '' : !P.markOpen(c, next) ? `<small class="later">${MK[next]} from voyage ${P.MARK_FROM[next]}</small>`
          : `<button type="button" class="chip buy" data-act="buypart" data-id="${Pt.id}"${c.shards < Pt.price[m] && !free ? ' aria-disabled="true"' : ''}>${m ? `Upgrade to ${MK[next]}` : 'Buy Mk I'} · ${Pt.price[m].toLocaleString()}</button>`;
        const fit = !m ? '' : `<button type="button" class="chip" data-act="${fitted ? 'unfit' : 'fit'}" data-id="${Pt.id}" aria-pressed="${fitted}">${fitted ? 'Fitted' : 'Fit'}</button>`;
        return `<article class="g-part${fitted ? ' on' : ''}"><header><b>${Pt.name}</b><span>${m ? MK[m] : 'Not bought'}</span></header>`
          + `<div class="g-what">${partLine(Pt, Math.max(1, m))}</div><footer>${fit}${buy}</footer></article>`;
      }).join('');
    } else if (tab === 'tuning') {
      const e = P.effects(c);
      const row = (k, name) => `<div class="g-row"><label for="g-p-${k}">${name}</label><input id="g-p-${k}" type="range" min="0" max="100" value="${Math.round(c.power[k] * 100)}" data-power="${k}"><output>${Math.round(c.power[k] * 100)}%</output></div>`;
      html = `<p class="g-about">Tuning is free. More power to the sails is more speed; to the guns, faster reloads and a little more damage;
        to the lift, faster climbing. The pipes on deck glow with each share.</p>${row('sails', 'Sails')}${row('guns', 'Guns')}${row('lift', 'Lift')}
        <p class="g-about">With this tuning and her parts: speed ${pct(e.speed - 1)}, reload time ${pct(e.reload - 1)}, damage ${pct(e.damage - 1)}, climbing ${pct(e.climb - 1)}.</p>
        <button type="button" class="chip" data-act="even">Share evenly</button>`;
    } else {
      const pts = P.skillPoints(c);
      html = `<div class="g-level"><b>Level ${lv.level}</b>${lv.need ? `<span class="meter"><i style="width:${(lv.into / lv.need) * 100}%"></i></span><small>${lv.into} of ${lv.need} renown to level ${lv.level + 1}</small>` : '<small>The top level</small>'}</div>
        <p class="g-about">${pts > 0 ? `<b>${pts}</b> skill point${pts > 1 ? 's' : ''} to spend.` : 'Renown from raiders and waves wins levels; each level is a skill point.'}
        ${P.DIFFICULTY[c.difficulty].name}.</p>` + P.SKILLS.map((S) => {
        const r = c.ranks[S.id], A = S.ability;
        const pips = Array.from({ length: P.MAX_RANK }, (_, i) => `<i class="${i < r ? 'on' : ''}${i === 1 || i === 3 || i === 5 ? ' mark' : ''}"></i>`).join('');
        const per = Object.entries(S.per).map(([k, x]) => `${pct(x)} ${WORDS[k]}`).join(', ');
        return `<article class="g-skill"><header><b>${S.name}</b><span class="pips">${pips}</span>
          <button type="button" class="chip buy" data-act="rank" data-id="${S.id}"${pts <= 0 || r >= P.MAX_RANK ? ' aria-disabled="true"' : ''}>Rank up</button></header>
          <small>Each rank: ${per}.</small>
          <small class="${r >= 2 ? 'gain' : ''}">${A.name} (${A.key.toUpperCase()}): ${A.about.toLowerCase()} for ${A.time[0]} s, every ${A.cooldown} s. ${r >= 2 ? 'Unlocked' : 'Unlocks at rank 2'}; stronger at rank 4, sooner at rank 6.</small></article>`;
      }).join('');
    }
    $('g-body').innerHTML = html;
  }

  // one handler for every button and slider in the panel
  $('g-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const c = C(), id = b.dataset.id, free = env.free();
    switch (b.dataset.act) {
      case 'buyship': return say(P.buyShip(c, id), `The ${env.names[id]} is yours`);
      case 'sail': return say(P.chooseShip(c, id), `Sailing the ${env.names[id]}`);
      case 'buypart': {
        if (free) { c.parts[id] = Math.min(P.MAX_MARK, (c.parts[id] ?? 0) + 1); return say(null, ''); }
        const m = P.nextMark(c, id), err = P.buyPart(c, id);
        return say(err, `${P.partById(id).name} ${MK[m]} bought${c.fitted[c.ship].includes(id) ? '' : ': fit it to use it'}`);
      }
      case 'fit': return say(P.fitPart(c, id, true), `${P.partById(id).name} fitted`);
      case 'unfit': return say(P.fitPart(c, id, false), `${P.partById(id).name} taken off`);
      case 'rank': return say(P.rankUp(c, id), `${P.SKILLS.find((S) => S.id === id).name} rank ${c.ranks[id]}`);
      case 'even': c.power = { sails: 1 / 3, guns: 1 / 3, lift: 1 / 3 }; return say(null, '');
    }
  });
  $('g-body').addEventListener('input', (e) => {
    const k = e.target.dataset.power; if (!k) return;
    P.setPower(C(), k, +e.target.value / 100);
    for (const key of ['sails', 'guns', 'lift']) { const el = $(`g-p-${key}`); if (el !== e.target) el.value = Math.round(C().power[key] * 100); el.nextElementSibling.textContent = `${Math.round(C().power[key] * 100)}%`; }
    P.save(C()); env.changed();
  });
  $('g-body').addEventListener('change', (e) => { if (e.target.dataset.power) { note = ''; render(); } });
  for (const b of $('g-tabs').children) b.addEventListener('click', () => { tab = b.dataset.tab; note = ''; render(); });
  $('g-sail').addEventListener('click', () => env.setSail());

  return {
    open() { $('port').hidden = false; document.body.classList.add('in-port'); note = ''; render(); },
    close() { $('port').hidden = true; document.body.classList.remove('in-port'); },
    render, get tab() { return tab; }, set tab(t) { tab = t; render(); },
  };
}
