// board.js: the Captain's firing board, and choosing what to shoot at.
//   Aim at: the hull, the sails or the crystals of the raider the guns are locked on (T cycles, or the buttons). The
//     guns then aim at that part of her, leading her as ever: the hull sinks her for full pay; torn sails slow her and
//     spoil her turning; broken crystals bring her down fastest, but the loot shatters (half pay).
//   The batteries: the four batteries round a little plan of the ship, each with its guns and its reload, the one
//     facing where you look picked out.
//   The target: the raider locked on, how far off, what's left of her hull, sails and crystals, and what the part
//     you're aiming at does.
//   A hit mark by the crosshair: which part your last shots hit, how many, and for how much.
// (After the firing board in the version of the game made with ChatGPT that Chris sent.)
import * as THREE from 'three';
import { BATTERY_NAMES } from './guns.js';
import { emit, on } from './events.js';

export const AIM_PARTS = ['hull', 'sails', 'crystals'];
const LABEL = { hull: 'Hull', sails: 'Sails', crystals: 'Crystals' };
const DOES = {
  hull: 'Breach her hull to sink her: full pay.',
  sails: 'Tear her sails: she slows down and turns badly.',
  crystals: 'Break her crystals to bring her down fastest. The loot shatters: half pay.',
};
const BANKS = ['bow', 'port', 'starboard', 'stern'];
const SHORT = { bow: 'Bow', port: 'Port', starboard: 'Starboard', stern: 'Stern' };

// The point in the world to aim at on raider r for this part: the middle of her hull below the deck, the middle mast's
// sails, or the middle crown of crystals
const at = new THREE.Vector3();
export function partPoint(r, part) {
  const Z = r.zones;
  if (!Z) return null;
  let local;
  if (part === 'sails' || part === 'crystals') {
    const boxes = Z[part].filter((b) => !b.isEmpty());
    if (!boxes.length) return null;
    local = boxes[(boxes.length - 1) >> 1].getCenter(at);
  } else local = at.copy(Z.aim);
  r.ship.body.updateWorldMatrix(true, false);
  return local.clone().applyMatrix4(r.ship.body.matrixWorld);
}

// env: { gunnery(), player(), locked(), reach(), battery(), flying() }
export function makeBoard(env) {
  const $ = (id) => document.getElementById(id);
  let part = 'hull', last = 0, hit = { part: '', n: 0, damage: 0, at: -1e9 }, was = null;
  const banks = Object.fromEntries(BANKS.map((b) => {
    const el = document.querySelector(`#board [data-bank="${b}"]`);
    return [b, { el, n: el.querySelector('b'), fill: el.querySelector('.fill i'), time: el.querySelector('small') }];
  }));
  const rows = Object.fromEntries(AIM_PARTS.map((p) => {
    const el = document.querySelector(`#target [data-part="${p}"]`);
    return [p, { el, bar: el.querySelector('i'), pct: el.querySelector('b') }];
  }));

  function choose(p) {
    if (!AIM_PARTS.includes(p) || p === part) return;
    part = p;
    for (const b of document.querySelectorAll('#aim-parts [data-part]')) b.setAttribute('aria-pressed', String(b.dataset.part === part));
    emit('aim', { part });
    last = 0;
  }
  const cycle = () => choose(AIM_PARTS[(AIM_PARTS.indexOf(part) + 1) % AIM_PARTS.length]);
  $('aim-parts').addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) choose(b.dataset.part); });

  on('hit', (d) => {
    if (d.owner !== 'player' || d.target !== 'enemy') return;
    const now = performance.now();
    if (hit.part !== d.part || now - hit.at > 600) hit = { part: d.part, n: 0, damage: 0, at: now };
    hit.n++; hit.damage += d.damage; hit.at = now;
    const mark = $('hitmark');
    mark.querySelector('span').textContent = `${LABEL[d.part]} hit${hit.n > 1 ? ` ×${hit.n}` : ''} · ${Math.round(hit.damage)}`;
    mark.dataset.part = d.part;
    mark.classList.remove('on'); void mark.offsetWidth; mark.classList.add('on');
  });

  // ten times a second: the batteries, the target, the line under the crosshair
  function update(now = performance.now()) {
    if (now - last < 100) return;
    last = now;
    const show = env.flying(), G = env.gunnery();
    $('board').hidden = !show; $('aim-status').hidden = !show;
    if (!show || !G) { $('target').hidden = true; return; }
    const active = env.battery(), r = env.locked();
    for (const b of BANKS) {
      const n = G.count(b), wait = Math.max(0, G.ready[b]), full = Math.max(0.001, G.reload(b)), x = banks[b];
      x.el.classList.toggle('on', b === active); x.el.classList.toggle('none', !n); x.el.classList.toggle('loaded', n > 0 && wait <= 0.01);
      x.n.textContent = n || '–';
      x.fill.style.transform = `scaleX(${n ? 1 - Math.min(1, wait / full) : 0})`;
      x.time.textContent = !n ? 'no guns' : wait > 0.01 ? `${wait.toFixed(1)} s` : 'ready';
    }
    const n = G.count(active), wait = Math.max(0, G.ready[active]), far = r && !env.reach();
    $('board-state').textContent = `${SHORT[active]} ${!n ? 'has no guns' : wait > 0.01 ? `${wait.toFixed(1)} s` : 'ready'}`;
    const line = $('aim-status');
    line.textContent = !n ? `No ${BATTERY_NAMES[active].toLowerCase()}: turn her to bring guns round`
      : far ? 'Out of reach: close the distance'
        : wait > 0.01 ? `${BATTERY_NAMES[active]} reloading · ${wait.toFixed(1)} s`
          : r ? `${BATTERY_NAMES[active]} ready · aiming at her ${part}` : `${BATTERY_NAMES[active]} ready`;
    line.dataset.state = !n || far ? 'far' : wait > 0.01 ? 'loading' : r ? 'locked' : 'ready';
    $('target').hidden = !r;
    if (r) {
      $('t-name').textContent = r.name;
      $('t-kind').textContent = `${r.captain ? `Raider captain in a ${r.R.cls}` : 'Raider'}${far ? ' · out of reach' : ' · locked on'}`;
      $('t-dist').textContent = `${Math.round(r.f.pos.distanceTo(env.player().pos)).toLocaleString()} m`;
      for (const p of AIM_PARTS) {
        const f = Math.max(0, Math.min(1, r.f.frac(p))), x = rows[p];
        x.bar.style.transform = `scaleX(${f})`; x.pct.textContent = `${Math.round(f * 100)}%`;
        x.el.classList.toggle('on', p === part); x.el.classList.toggle('gone', f <= 0.01);
      }
      $('t-effect').textContent = DOES[part];
      if (was !== r) { const t = $('target'); t.classList.remove('new'); void t.offsetWidth; t.classList.add('new'); }
    }
    was = r;
    if (now - hit.at > 1100) $('hitmark').classList.remove('on');
  }

  // where the guns should aim on raider r: for the hull, nothing new (the ship's own aim point, the middle of her hull,
  // as the game has always aimed and the balance was measured); for the sails or crystals, that part of her
  return { get part() { return part; }, choose, cycle, update, point: (r) => (part === 'hull' ? null : partPoint(r, part)) };
}
