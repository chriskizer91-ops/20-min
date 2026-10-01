// Quill's swap shop screen: openSwapShop({ inventory, onSwap, onClose })
//
// An FF9-style shop over whatever page opens it (it brings its own markup and styles; the page only needs the two
// pixel fonts, 'Jacquard 12' and 'Pixelify Sans', which town.js's loadFonts() provides):
//   - Quill at the top, saying his piece (his WW portrait: cold-fingered until the skiff swap, then happy)
//   - Quill's wares on the left, each with what he wants for it (dimmed when she can't, yet)
//   - a preview of the selected ware: its icon, its name in its rarity's colour (Aethermoor's rarity.js), its
//     rarity and kind, what it does, its story, and what he wants against what she has
//   - what she has along the bottom: her basket (with its slots), found things, charms and gear, curios
//   - a confirm step ("Swap with Quill?"): what she gives and what she gets; for "any bottle" she picks which,
//     and for the herb line she picks her two herbs; a warning if she's about to give away half the skiff's swap
//   - a flourish when a swap is made: the ware pops in its rarity's colour with a burst of sparkles and flies down
//     into her things; the skiff gets a bigger one
//
// openSwapShop(options) -> shop
//   options.inventory   her things, in swaps.js's shape ({ bag, swaps, skiff }; newInventory() makes one). The shop
//                       never changes it: every swap makes a new inventory (swaps.js swap()).
//   options.onSwap(result, inventory)
//                       after each swap. result: { ware, took: [{ id, n }], gave: [{ id, n } | { skiff: true }] };
//                       inventory: her things now. Keep it; pass it to the next openSwapShop.
//   options.onClose(inventory)
//                       when she leaves (the Leave button, Escape, or shop.close()).
//   options.sfx(name, opts)   optional: play a sound (the page's audio.sfx). Uses Thareia's ui-* and shop sounds.
//   options.react(event, detail)
//                       optional: for a 3D Quill to act along: 'open', 'select', 'confirm', 'swap' (detail: the
//                       result), 'skiff' (Quill's own swap is made), 'short' (she can't afford it), 'close'.
// shop: { root, close(), get inventory(), select(wareId), confirm(), cancel(), accept() } (the last four drive it
//       from a test or a gamepad, like a tap would)
//
// Keys: up/down (or left/right) choose a ware, Enter or Space opens the confirm step and swaps, Escape steps back
// and leaves. Taps: a ware to see it, the Swap button (or the ware again) to swap. It works down to 390 px wide.

import { RARITY } from '../../vendor/aethermoor/src/data/rarity.js';
import {
  THINGS, WARES, QUILL_LINES, wareCard, status, canSwap, swap, defaultPicks, choicesFor, reserved,
  holdings, basketUsed, basketSlots, count,
} from './swaps.js';
import { swapIcons, quillPortraits } from '../assets-swap.js';
import { pixelIcons } from './icons.js';

const KIND_NAMES = { charm: 'Charm', gear: 'Gear', curio: 'Curio', skiff: "Quill's own swap", herbs: 'Herbs', herb: 'Herb', brew: 'Brew', dud: 'Dud', found: 'Found thing', keep: 'Hers to keep' };
const ANY_NAMES = { bottle: 'any brew or dud', dud: 'any dud', brew: 'any brew', herb: 'any herb' };
const STATUS_TAGS = { have: 'She has it', done: 'Swapped', short: '' };
const GROUPS = [['basket', 'Basket'], ['found', 'Found things'], ['worn', 'Charms & gear'], ['curios', 'Curios'], ['kept', 'Hers to keep']];

export const iconOf = (id) => swapIcons[id] ?? pixelIcons[id] ?? pixelIcons['wickhollow-flame'];
const nameOf = (id) => THINGS[id]?.name ?? id;
const rarityColor = (r) => RARITY[r]?.color ?? '#ecdcb8';
const rarityName = (r) => RARITY[r]?.name ?? (r ? r[0].toUpperCase() + r.slice(1) : '');

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
  return e;
}

// A ware's picture: the herb line shows two herbs, everything else its own icon
function wareIcon(ware, picks) {
  if (ware.line === 'herbs') {
    const [a, b] = picks?.get?.length === 2 ? picks.get : ['nightrose', 'lavender'];
    return el('span', { class: 'ss-pair' }, el('img', { src: iconOf(a), alt: '' }), el('img', { src: iconOf(b), alt: '' }));
  }
  return el('img', { src: iconOf(ware.line === 'skiff' ? 'the-magpie' : ware.gives), alt: '', class: ware.line === 'skiff' ? 'ss-wide' : '' });
}

// "2 × Moonpetal" chips: what a ware wants, ticked or crossed against what she has
function wantChips(inv, ware, picks) {
  let k = 0;
  return ware.wants.map((w) => {
    const id = w.any ? picks?.pay?.[k++] : w.id;
    const have = id ? count(inv, id) : 0;
    const enough = have >= w.n;
    const label = w.any && !id ? ANY_NAMES[w.any] : `${nameOf(id)}${w.any ? ` (${ANY_NAMES[w.any]})` : ''}`;
    return el('span', { class: `ss-want${enough ? ' ok' : ' no'}`, title: `${label}: she has ${have}` },
      id ? el('img', { src: iconOf(id), alt: '' }) : el('span', { class: 'ss-any', text: '?' }),
      el('b', { text: `×${w.n}` }));
  });
}

export function openSwapShop({ inventory, onSwap = () => {}, onClose = () => {}, sfx = () => {}, react = () => {} } = {}) {
  injectStyle();
  let inv = inventory;
  let sel = Math.max(0, WARES.findIndex((w) => status(inv, w.id) === 'ok'));
  let confirming = null; // { ware, picks }
  let flourishing = false;
  let closed = false;
  const say = { full: '', shown: 0, timer: 0 };

  // ---------------------------------------------------------------- markup
  const sayText = el('p', { class: 'ss-say', 'aria-live': 'polite' });
  const portrait = el('img', { class: 'ss-portrait', alt: 'Mister Quill' });
  const leave = el('button', { class: 'ss-leave', type: 'button', text: 'Leave', onclick: () => close() });
  const list = el('ul', { class: 'ss-list', role: 'listbox', 'aria-label': "Quill's wares", tabindex: '0' });
  const preview = el('section', { class: 'ss-preview', 'aria-live': 'polite' });
  const hers = el('div', { class: 'ss-hers-groups' });
  const slots = el('span', { class: 'ss-slots' });
  const modal = el('div', { class: 'ss-modal', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Swap with Quill?' });
  const fx = el('div', { class: 'ss-fx', 'aria-hidden': 'true' });
  const panel = el('div', { class: 'ss-panel' },
    el('header', { class: 'ss-head' }, portrait, el('div', { class: 'ss-who' }, el('h2', { text: 'Mister Quill' }), sayText), leave),
    el('section', { class: 'ss-wares' }, el('h3', { text: "Quill's wares" }, el('span', { text: 'what he wants' })), list),
    preview,
    el('section', { class: 'ss-hers' }, el('h3', { text: 'What she has' }, slots), hers),
  );
  const root = el('div', { class: 'swap-shop', role: 'dialog', 'aria-label': "Quill's swap shop" }, panel, modal, fx);
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add('on'));

  // ---------------------------------------------------------------- Quill talks
  function speak(text, mood) {
    say.full = text;
    say.shown = 0;
    portrait.src = inv.skiff || mood === 'happy' ? quillPortraits.happy : quillPortraits.cold;
    clearInterval(say.timer);
    sayText.textContent = '';
    say.timer = setInterval(() => {
      say.shown = Math.min(say.full.length, say.shown + 2);
      sayText.textContent = say.full.slice(0, say.shown);
      if (/\w/.test(say.full[say.shown - 1] ?? '')) sfx('blip', { voice: 0 });
      if (say.shown >= say.full.length) clearInterval(say.timer);
    }, 45);
  }

  // ---------------------------------------------------------------- the list
  function renderList() {
    list.replaceChildren(...WARES.map((ware, i) => {
      const st = status(inv, ware.id);
      const card = wareCard(ware);
      const picks = defaultPicks(inv, ware.id);
      const row = el('li', {
        id: `ss-ware-${ware.id}`, role: 'option', 'aria-selected': String(i === sel), class: `ss-row ss-${st}${i === sel ? ' sel' : ''}${ware.line === 'skiff' ? ' ss-skiffrow' : ''}`,
        'data-ware': ware.id,
        onclick: () => { if (i === sel && !flourishing) openConfirm(); else choose(i); },
      },
      el('span', { class: 'ss-icon', style: `--r:${rarityColor(card.rarity)}` }, wareIcon(ware, picks)),
      el('span', { class: 'ss-name' },
        el('b', { text: card.name, style: `color:${rarityColor(card.rarity)}` }),
        el('small', { text: ware.line === 'skiff' ? "Quill's own swap" : `${KIND_NAMES[card.kind]}${card.forWho && card.forWho !== 'the witch' ? `, for ${card.forWho}` : ''}` })),
      st === 'have' || st === 'done'
        ? el('span', { class: 'ss-tag', text: STATUS_TAGS[st] })
        : el('span', { class: 'ss-wants' }, wantChips(inv, ware, picks)));
      return row;
    }));
    list.setAttribute('aria-activedescendant', `ss-ware-${WARES[sel].id}`);
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------------- the preview
  function renderPreview() {
    const ware = WARES[sel];
    const card = wareCard(ware);
    const st = status(inv, ware.id);
    const check = canSwap(inv, ware.id);
    const picks = defaultPicks(inv, ware.id);
    const color = rarityColor(card.rarity);
    const rarity = ware.line === 'skiff' ? 'One of a kind' : ware.line === 'herbs' ? 'As often as she likes' : rarityName(card.rarity);
    const kind = [KIND_NAMES[card.kind], card.slotName && card.kind !== 'charm' ? `${card.forWho === 'the witch' ? 'her' : `${card.forWho}'s`} ${card.slotName}` : card.slotName].filter(Boolean).join(' · ');
    let k = 0;
    const wants = ware.wants.map((w) => {
      const id = w.any ? picks.pay[k++] : w.id;
      const have = id ? count(inv, id) : 0;
      return el('li', { class: have >= w.n ? 'ok' : 'no' },
        id ? el('img', { src: iconOf(id), alt: '' }) : el('span', { class: 'ss-any', text: '?' }),
        el('span', { text: `${w.n} × ${w.any ? ANY_NAMES[w.any] : nameOf(id)}` }),
        el('em', { text: w.any ? (id ? `${nameOf(id)}: has ${have}` : 'has none') : `has ${have}` }));
    });
    const label = st === 'ok' ? 'Swap' : st === 'have' ? 'She has it' : st === 'done' ? 'Swapped' : check.reason === 'full' ? 'Basket full' : 'Not enough';
    preview.replaceChildren(el('div', { class: 'ss-pscroll' },
      el('div', { class: 'ss-card' },
        el('div', { class: `ss-big${ware.line === 'skiff' ? ' wide' : ''}`, style: `--r:${color}` }, wareIcon(ware, picks)),
        el('div', { class: 'ss-title' },
          el('h3', { text: card.name, style: `color:${color}` }),
          el('p', { class: 'ss-rarity' }, el('span', { class: 'ss-gem', style: `background:${color}` }), `${rarity}${kind ? ` · ${kind}` : ''}`))),
      el('p', { class: 'ss-does', text: card.does }),
      card.note ? el('p', { class: 'ss-note', text: card.note }) : null),
    // what he wants, and the Swap button, always in view at the bottom, as a shop's price is
    el('div', { class: 'ss-price' },
      el('div', {}, el('h4', { text: 'Quill wants' }), el('ul', { class: 'ss-wantlist' }, wants)),
      el('button', { class: 'ss-go', type: 'button', disabled: st !== 'ok', text: label, onclick: () => openConfirm() })),
    );
  }

  // ---------------------------------------------------------------- what she has
  function renderHers(highlight = []) {
    const g = holdings(inv);
    slots.textContent = `Basket ${basketUsed(inv)} of ${basketSlots(inv)}`;
    hers.replaceChildren(...GROUPS.filter(([key]) => g[key].length).map(([key, title]) => el('div', { class: `ss-group ss-g-${key}` },
      el('h4', { text: title }),
      el('ul', {}, g[key].map(({ id, n }) => el('li', { class: highlight.includes(id) ? 'want' : '', title: `${nameOf(id)}: ${THINGS[id].does}`, 'data-thing': id },
        el('img', { src: iconOf(id), alt: '' }), el('span', { text: nameOf(id) }), n > 1 ? el('b', { text: `×${n}` }) : null))))));
    if (inv.skiff) hers.prepend(el('div', { class: 'ss-group ss-g-skiff' }, el('h4', { text: 'The skiff' }), el('ul', {}, el('li', { class: 'want' }, el('img', { src: iconOf('the-magpie'), alt: '' }), el('span', { text: 'The Magpie' })))));
  }

  function render() {
    renderList();
    renderPreview();
    const ware = WARES[sel];
    const picks = defaultPicks(inv, ware.id);
    let k = 0;
    renderHers(ware.wants.map((w) => (w.any ? picks.pay[k++] : w.id)).filter(Boolean));
  }

  function choose(i, quiet = false) {
    if (flourishing || confirming) return;
    sel = (i + WARES.length) % WARES.length;
    render();
    const ware = WARES[sel];
    const st = status(inv, ware.id);
    const card = wareCard(ware);
    speak(st === 'have' ? QUILL_LINES.have : st === 'done' ? QUILL_LINES.skiffDone : card.pitch ?? QUILL_LINES.open);
    if (!quiet) { sfx('ui-cursor'); react('select', ware.id); }
  }

  // ---------------------------------------------------------------- confirm: "Swap with Quill?"
  function openConfirm() {
    if (flourishing || confirming) return;
    const ware = WARES[sel];
    const check = canSwap(inv, ware.id);
    if (!check.ok) {
      sfx('ui-error');
      speak(check.reason === 'full' ? QUILL_LINES.full : check.reason === 'have' ? QUILL_LINES.have : check.reason === 'done' ? QUILL_LINES.skiffDone : QUILL_LINES.short);
      react('short', ware.id);
      return;
    }
    confirming = { ware, picks: defaultPicks(inv, ware.id) };
    sfx('ui-confirm');
    react('confirm', ware.id);
    renderModal();
    modal.hidden = false;
    root.classList.add('confirming');
    modal.querySelector('.ss-yes')?.focus({ preventScroll: true });
  }

  // A picker: ◀ the thing ▶, cycling through options
  function cycler(options, value, onPick, label) {
    const i = Math.max(0, options.indexOf(value));
    const step = (d) => { onPick(options[(i + d + options.length) % options.length]); sfx('ui-cursor'); renderModal(); };
    return el('span', { class: 'ss-cycle', 'aria-label': label },
      el('button', { type: 'button', class: 'ss-arrow', 'aria-label': `Previous ${label}`, disabled: options.length < 2, text: '◀', onclick: () => step(-1) }),
      el('span', { class: 'ss-chip' }, el('img', { src: iconOf(value), alt: '' }), el('span', { text: nameOf(value) }), count(inv, value) > 0 ? el('b', { text: `has ${count(inv, value)}` }) : null),
      el('button', { type: 'button', class: 'ss-arrow', 'aria-label': `Next ${label}`, disabled: options.length < 2, text: '▶', onclick: () => step(1) }));
  }

  function renderModal() {
    const { ware, picks } = confirming;
    const card = wareCard(ware);
    const check = canSwap(inv, ware.id, picks);
    const keep = reserved(inv);
    let k = 0;
    const give = ware.wants.map((w) => {
      if (!w.any) return el('li', {}, el('span', { class: 'ss-chip' }, el('img', { src: iconOf(w.id), alt: '' }), el('span', { text: nameOf(w.id) }), el('b', { text: `×${w.n}` })));
      const idx = k++;
      return el('li', {}, el('small', { text: `${w.n} × ${ANY_NAMES[w.any]}:` }),
        cycler(choicesFor(inv, w), picks.pay[idx], (id) => { picks.pay[idx] = id; }, ANY_NAMES[w.any]));
    });
    const get = ware.gives?.choose
      ? picks.get.map((h, i) => el('li', {}, cycler(ware.gives.from, h, (id) => { picks.get[i] = id; }, `herb ${i + 1}`)))
      : [el('li', {}, el('span', { class: `ss-chip big${ware.line === 'skiff' ? ' wide' : ''}`, style: `--r:${rarityColor(card.rarity)}` }, wareIcon(ware, picks), el('span', { text: card.name, style: `color:${rarityColor(card.rarity)}` })))];
    const giving = ware.wants.map((w, i) => (w.any ? picks.pay[ware.wants.slice(0, i).filter((x) => x.any).length] : w.id));
    const warn = ware.line !== 'skiff' && giving.some((id) => keep.includes(id));
    const why = !check.ok ? (check.reason === 'full' ? QUILL_LINES.full : QUILL_LINES.short) : null;
    modal.replaceChildren(el('div', { class: 'ss-box' },
      el('h3', { text: ware.line === 'skiff' ? 'Make Quill\'s swap?' : 'Swap with Quill?' }),
      el('div', { class: 'ss-trade' },
        el('div', {}, el('h4', { text: 'She gives' }), el('ul', {}, give)),
        el('div', { class: 'ss-for', text: 'for' }),
        el('div', {}, el('h4', { text: 'She gets' }), el('ul', {}, get))),
      warn ? el('p', { class: 'ss-warn', text: `Quill: "${QUILL_LINES.keepWarning}"` }) : null,
      why ? el('p', { class: 'ss-warn', text: `Quill: "${why}"` }) : null,
      el('div', { class: 'ss-buttons' },
        el('button', { type: 'button', class: 'ss-yes', disabled: !check.ok, text: ware.line === 'skiff' ? 'Swap: the skiff' : 'Swap', onclick: () => accept() }),
        el('button', { type: 'button', class: 'ss-no', text: 'Not yet', onclick: () => cancel() }))));
  }

  function cancel() {
    if (!confirming) return;
    confirming = null;
    modal.hidden = true;
    root.classList.remove('confirming');
    sfx('ui-back');
    list.focus({ preventScroll: true });
  }

  function accept() {
    if (!confirming || flourishing) return false;
    const { ware, picks } = confirming;
    const r = swap(inv, ware.id, picks);
    if (!r.ok) { sfx('ui-error'); renderModal(); return false; }
    confirming = null;
    modal.hidden = true;
    root.classList.remove('confirming');
    inv = r.inventory;
    const result = { ware: ware.id, took: r.took, gave: r.gave };
    flourish(ware, picks, r);
    render();
    onSwap(result, inv);
    return true;
  }

  // ---------------------------------------------------------------- the flourish
  function flourish(ware, picks, r) {
    const card = wareCard(ware);
    const color = rarityColor(card.rarity);
    const skiff = ware.line === 'skiff';
    flourishing = true;
    root.classList.add('flourish');
    const burst = el('div', { class: `ss-burst${skiff ? ' skiff' : ''}`, style: `--r:${color}` },
      el('div', { class: 'ss-rays' }),
      ...Array.from({ length: skiff ? 26 : 16 }, (_, i) => {
        const a = (i / (skiff ? 26 : 16)) * Math.PI * 2 + Math.random() * 0.3, d = (skiff ? 150 : 95) + Math.random() * 60;
        return el('i', { class: 'ss-spark', style: `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--d:${(Math.random() * 0.25).toFixed(2)}s` });
      }),
      el('div', { class: 'ss-pop' }, wareIcon(ware, picks)),
      el('p', { class: 'ss-banner' }, el('b', { text: skiff ? 'The Magpie' : 'Swapped!' }),
        el('span', { text: skiff ? 'Bring her back with the lights in her.' : r.gave.map((g) => `${g.n > 1 ? `${g.n} × ` : ''}${nameOf(g.id)}`).join(' and ') })));
    fx.replaceChildren(burst);
    const took = r.took.map(({ id }) => id);
    if (took.includes('swamp-tea') || took.some((id) => THINGS[id]?.kind === 'dud')) speak(QUILL_LINES.dud, 'happy');
    else if (skiff) speak(QUILL_LINES.skiff[0], 'happy');
    else speak(QUILL_LINES.done, 'happy');
    if (skiff) {
      sfx('crystal-flare');
      setTimeout(() => sfx('quest'), 350);
      react('skiff', { ware: ware.id, took: r.took, gave: r.gave });
      setTimeout(() => !closed && speak(QUILL_LINES.skiff[1], 'happy'), 2300);
    } else {
      sfx('ui-buy');
      setTimeout(() => sfx(card.rarity === 'heirloom' ? 'reveal-heirloom' : 'reveal', { tier: RARITY[card.rarity]?.rank ?? 0 }), 180);
      react('swap', { ware: ware.id, took: r.took, gave: r.gave });
    }
    // then it flies down into her things
    const hold = skiff ? 3200 : 1500;
    setTimeout(() => {
      burst.classList.add('away');
      const target = hers.querySelector(`[data-thing="${r.gave[0]?.id}"]`) ?? hers.querySelector('.ss-g-skiff li');
      target?.classList.add('fresh');
    }, hold);
    setTimeout(() => {
      fx.replaceChildren();
      flourishing = false;
      root.classList.remove('flourish');
      list.focus({ preventScroll: true });
    }, hold + 650);
  }

  // ---------------------------------------------------------------- keys
  function onKey(e) {
    if (closed) return;
    const k = e.key;
    const inButton = e.target?.closest?.('button');
    e.stopPropagation(); // the field underneath doesn't walk, talk, or fly the camera out while the shop is up
    if (k === 'Escape') { e.preventDefault(); if (confirming) cancel(); else if (!flourishing) close(); return; }
    if (flourishing) return;
    if (confirming) {
      if ((k === 'Enter' || k === ' ') && !inButton) { e.preventDefault(); accept(); }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 's' || k === 'd') { e.preventDefault(); choose(sel + 1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'w' || k === 'a') { e.preventDefault(); choose(sel - 1); }
    else if ((k === 'Enter' || k === ' ') && !inButton) { e.preventDefault(); openConfirm(); }
  }
  addEventListener('keydown', onKey, true);

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(say.timer);
    removeEventListener('keydown', onKey, true);
    sfx('ui-close');
    react('close');
    root.classList.remove('on');
    setTimeout(() => root.remove(), 260);
    onClose(inv);
  }

  // ---------------------------------------------------------------- go
  render();
  speak(inv.skiff ? QUILL_LINES.openWarm : QUILL_LINES.open);
  sfx('shop-bell');
  sfx('ui-open');
  react('open');
  setTimeout(() => list.focus({ preventScroll: true }), 50);

  return {
    root,
    close,
    get inventory() { return inv; },
    get selected() { return WARES[sel].id; },
    get confirming() { return !!confirming; },
    get busy() { return flourishing; },
    select(id) { const i = WARES.findIndex((w) => w.id === id); if (i >= 0) choose(i, true); },
    confirm: openConfirm,
    cancel,
    accept,
    pick(index, id) { if (confirming) { if (index === 'get') confirming.picks.get = id; else confirming.picks.pay[index] = id; renderModal(); } },
  };
}

// ---------------------------------------------------------------- styles
// The witch's colours, as on the town pages: plum panels with a cream edge, gold for names, Jacquard 12 for titles
// and Pixelify Sans for everything else.
function injectStyle() {
  if (document.getElementById('swap-shop-style')) return;
  const css = `
.swap-shop { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; justify-content: flex-end; padding: 0 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(7,5,11,0) 0%, rgba(7,5,11,0.35) 35%, rgba(7,5,11,0.7) 100%); opacity: 0; transition: opacity .25s; font: 16px/1.4 'Pixelify Sans', 'Trebuchet MS', system-ui, sans-serif; font-variant-ligatures: none; color: #f3ead8;
  -webkit-user-select: none; user-select: none; }
.swap-shop.on { opacity: 1; }
.swap-shop button { font: inherit; color: inherit; cursor: pointer; }
.swap-shop button:focus-visible, .swap-shop .ss-list:focus-visible { outline: 2px solid #e2bd67; outline-offset: 2px; }
.ss-panel { width: 100%; max-width: 1060px; margin: 0 auto; height: min(540px, calc(100% - 200px)); min-height: 380px; display: grid; gap: 10px 14px; padding: 12px 14px 14px;
  grid-template: "head head" auto "wares preview" minmax(0, 1fr) "hers hers" auto / minmax(0, 1.12fr) minmax(0, 1fr);
  background: linear-gradient(180deg, rgba(58,22,49,0.96), rgba(20,9,26,0.97)); border: 2px solid #ecdcb8; border-radius: 10px;
  box-shadow: inset 0 0 0 3px #3a1631, inset 0 0 0 4px rgba(236,220,184,0.35), 0 14px 40px rgba(0,0,0,0.65); transform: translateY(20px); transition: transform .3s; }
.swap-shop.on .ss-panel { transform: none; }
.ss-head { grid-area: head; display: flex; align-items: center; gap: 12px; min-width: 0; }
.ss-portrait { width: 64px; height: 64px; flex: none; image-rendering: pixelated; border: 2px solid #ecdcb8; border-radius: 6px; background: radial-gradient(circle at 45% 40%, #5a2a52, #231a2c 75%); }
.ss-who { flex: 1; min-width: 0; }
.ss-who h2 { margin: 0; font: 400 28px/1 'Jacquard 12', Georgia, serif; color: #e2bd67; }
.ss-say { margin: 2px 0 0; min-height: 2.8em; font-size: 16px; line-height: 1.4; color: #f3ead8; }
.ss-leave { flex: none; align-self: flex-start; padding: 7px 14px; background: rgba(24,12,30,0.9); border: 1px solid rgba(236,220,184,0.6); border-radius: 6px; }
.ss-leave:hover { border-color: #ecdcb8; }
.ss-wares, .ss-preview, .ss-hers { min-width: 0; min-height: 0; background: rgba(12,6,16,0.55); border: 1px solid rgba(236,220,184,0.28); border-radius: 8px; }
.ss-wares { grid-area: wares; display: flex; flex-direction: column; padding: 8px 6px 6px 10px; }
.swap-shop h3 { margin: 0 0 6px; font: 400 24px/1 'Jacquard 12', Georgia, serif; color: #ecdcb8; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.swap-shop h3 span { font: 13px 'Pixelify Sans', sans-serif; color: #b9a9c4; }
.ss-list { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 0 4px 0 0; list-style: none; display: grid; align-content: start; gap: 3px; scrollbar-width: thin; scrollbar-color: #7a5a8a transparent; }
.ss-row { position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.ss-row:hover { background: rgba(236,220,184,0.07); }
.ss-row.sel { background: linear-gradient(90deg, rgba(198,61,131,0.35), rgba(198,61,131,0.08)); border-color: rgba(236,220,184,0.55); }
.ss-row.sel::before { content: '▶'; position: absolute; left: -11px; top: calc(50% - 8px); color: #ecdcb8; font-size: 11px; line-height: 16px; animation: ss-nudge .8s ease-in-out infinite; }
@keyframes ss-nudge { 50% { transform: translateX(3px); } }
.ss-row.ss-short .ss-icon, .ss-row.ss-short .ss-name { opacity: 0.55; }
.ss-row.ss-have, .ss-row.ss-done { opacity: 0.6; }
.ss-skiffrow { background: linear-gradient(90deg, rgba(232,184,58,0.14), transparent); }
.ss-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 6px; background: radial-gradient(circle, color-mix(in srgb, var(--r) 22%, transparent), transparent 70%); }
.ss-icon img, .ss-big img, .ss-pop img { image-rendering: auto; }
.ss-icon > img { width: 36px; height: 36px; object-fit: contain; }
.ss-icon > img.ss-wide { width: 40px; height: 32px; }
.ss-pair { position: relative; display: inline-block; width: 100%; height: 100%; }
.ss-pair img { position: absolute; width: 62%; height: 62%; object-fit: contain; }
.ss-pair img:first-child { left: 0; top: 4%; } .ss-pair img:last-child { right: 0; bottom: 4%; }
.ss-name { display: flex; flex-direction: column; min-width: 0; }
.ss-name b { font-weight: 500; font-size: 16px; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-name small { font-size: 12px; color: #b9a9c4; }
.ss-wants { display: flex; gap: 3px; }
.ss-want { position: relative; display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 5px; background: rgba(236,220,184,0.08); }
.ss-want img { width: 24px; height: 24px; object-fit: contain; }
.ss-want b { position: absolute; right: -3px; bottom: -5px; font: 400 12px 'Pixelify Sans', sans-serif; color: #f3ead8; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
.ss-want.no { background: rgba(200,60,80,0.22); box-shadow: inset 0 0 0 1px rgba(255,110,130,0.55); }
.ss-want.no img { filter: grayscale(0.7) brightness(0.8); }
.ss-any { font-weight: 700; color: #e2bd67; }
.ss-tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: rgba(236,220,184,0.15); color: #ecdcb8; white-space: nowrap; }
.ss-preview { grid-area: preview; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.ss-pscroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scrollbar-width: thin; scrollbar-color: #7a5a8a transparent; }
.ss-card { display: flex; gap: 12px; align-items: center; }
.ss-big { flex: none; width: 84px; height: 84px; display: grid; place-items: center; border-radius: 10px; border: 2px solid var(--r);
  background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--r) 35%, #1a0e20), #140a1a 72%); box-shadow: 0 0 18px color-mix(in srgb, var(--r) 45%, transparent); }
.ss-big > img { width: 72px; height: 72px; object-fit: contain; }
.ss-big.wide { width: 110px; } .ss-big.wide > img { width: 104px; height: 80px; }
.ss-big .ss-pair { width: 72px; height: 72px; }
.ss-title { min-width: 0; }
.ss-title h3 { margin: 0; font-size: 30px; line-height: 0.95; display: block; text-shadow: 0 2px 0 #000; }
.ss-rarity { margin: 4px 0 0; font-size: 13px; color: #d8c8e0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ss-gem { width: 10px; height: 10px; transform: rotate(45deg); box-shadow: 0 0 6px currentColor; flex: none; }
.ss-does { margin: 2px 0 0; font-size: 15px; color: #f3ead8; }
.ss-note { margin: 0; font-size: 14px; font-style: italic; color: #c8b8d4; }
.ss-preview h4 { margin: 0 0 4px; font: 400 20px/1 'Jacquard 12', Georgia, serif; color: #ecdcb8; }
.ss-price { flex: none; display: flex; align-items: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid rgba(236,220,184,0.18); }
.ss-price > div { flex: 1; min-width: 0; }
.ss-wantlist { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
.ss-wantlist li { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 8px; font-size: 14px; }
.ss-wantlist img { width: 26px; height: 26px; object-fit: contain; }
.ss-wantlist em { font-style: normal; font-size: 12px; color: #9fe0a0; }
.ss-wantlist li.no em { color: #ff9aa8; }
.ss-go, .ss-yes { flex: none; align-self: flex-end; padding: 8px 22px; font-size: 16px; background: #c63d83; border: 1px solid #ecdcb8; border-radius: 6px; color: #fff; box-shadow: 0 3px 0 #5a1438; }
.ss-go:disabled, .ss-yes:disabled { background: rgba(80,60,90,0.6); color: #b9a9c4; box-shadow: none; cursor: default; }
.ss-go:not(:disabled):hover, .ss-yes:not(:disabled):hover { filter: brightness(1.12); }
.ss-hers { grid-area: hers; padding: 8px 10px; }
.ss-hers h3 { margin-bottom: 4px; }
.ss-slots { font-variant-numeric: tabular-nums; }
.ss-hers-groups { display: flex; gap: 6px 16px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; }
.ss-group { flex: none; }
.ss-group h4 { margin: 0 0 3px; font-size: 12px; font-weight: 400; color: #b9a9c4; text-transform: uppercase; letter-spacing: 0.06em; }
.ss-group ul { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px; max-width: 520px; }
.ss-g-basket ul { max-width: 560px; }
.ss-group li { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 6px; background: rgba(236,220,184,0.07); border: 1px solid rgba(236,220,184,0.15); }
.ss-group li img { width: 32px; height: 32px; object-fit: contain; }
.ss-group li span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.ss-group li b { position: absolute; right: -2px; bottom: -5px; font: 400 12px 'Pixelify Sans', sans-serif; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
.ss-group li.want { border-color: #e2bd67; box-shadow: 0 0 8px rgba(226,189,103,0.5); }
.ss-group li.fresh { animation: ss-fresh 1.1s ease-out; }
@keyframes ss-fresh { 0% { transform: scale(1.6); box-shadow: 0 0 22px #fff; } 100% { transform: none; } }
.ss-g-skiff li { width: 52px; } .ss-g-skiff li img { width: 48px; }
.ss-modal { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(7,5,11,0.45); }
.ss-box { width: min(560px, 100%); padding: 14px 16px 16px; background: linear-gradient(180deg, rgba(58,22,49,0.98), rgba(20,9,26,0.99)); border: 2px solid #ecdcb8; border-radius: 10px;
  box-shadow: inset 0 0 0 3px #3a1631, inset 0 0 0 4px rgba(236,220,184,0.35), 0 14px 40px rgba(0,0,0,0.7); animation: ss-in .18s ease-out; }
@keyframes ss-in { from { transform: scale(0.94); opacity: 0; } }
.ss-box h3 { font-size: 30px; color: #e2bd67; }
.ss-box h4 { margin: 0 0 4px; font-size: 12px; font-weight: 400; color: #b9a9c4; text-transform: uppercase; letter-spacing: 0.06em; }
.ss-trade { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 10px; align-items: center; }
.ss-trade ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.ss-trade li { display: grid; gap: 2px; }
.ss-trade small { font-size: 12px; color: #c8b8d4; }
.ss-for { font: 400 22px 'Jacquard 12', Georgia, serif; color: #ecdcb8; }
.ss-chip { display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 3px 8px 3px 3px; border-radius: 6px; background: rgba(236,220,184,0.08); font-size: 14px; }
.ss-chip img { width: 30px; height: 30px; object-fit: contain; flex: none; }
.ss-chip b { font-size: 13px; color: #b9a9c4; font-weight: 400; white-space: nowrap; margin-left: auto; }
.ss-cycle .ss-chip { width: 176px; }
.ss-chip.big { padding: 4px 10px 4px 4px; font-size: 16px; border: 1px solid var(--r); }
.ss-chip.big img { width: 44px; height: 44px; } .ss-chip.big.wide img { width: 60px; height: 46px; }
.ss-chip.big .ss-pair { width: 44px; height: 44px; }
.ss-cycle { display: inline-flex; align-items: center; gap: 4px; }
.ss-arrow { width: 28px; height: 34px; padding: 0; background: rgba(24,12,30,0.9); border: 1px solid rgba(236,220,184,0.5); border-radius: 5px; font-size: 12px !important; }
.ss-arrow:disabled { opacity: 0.35; cursor: default; }
.ss-warn { margin: 10px 0 0; padding: 6px 10px; font-size: 14px; color: #ffd98a; background: rgba(226,189,103,0.1); border-left: 3px solid #e2bd67; border-radius: 4px; }
.ss-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.ss-no { padding: 8px 18px; background: rgba(24,12,30,0.9); border: 1px solid rgba(236,220,184,0.6); border-radius: 6px; }
.ss-yes { margin-top: 0; }
.ss-fx { position: absolute; inset: 0; pointer-events: none; display: grid; place-items: center; }
.ss-fx:not(:empty) { background: radial-gradient(circle at 50% 50%, rgba(7,5,11,0.72) 0, rgba(7,5,11,0.45) 28%, transparent 60%); }
.ss-burst { position: relative; width: 0; height: 0; display: grid; place-items: center; transition: transform .6s cubic-bezier(.5,0,.75,0), opacity .6s; }
.ss-burst.away { transform: translateY(38vh) scale(0.3); opacity: 0; }
.ss-rays { position: absolute; width: 360px; height: 360px; margin: -180px; left: 0; top: 0; border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--r) 55%, transparent) 0 6deg, transparent 6deg 22deg); -webkit-mask: radial-gradient(circle, #000 18%, transparent 68%); mask: radial-gradient(circle, #000 18%, transparent 68%);
  animation: ss-rays 2.4s linear infinite, ss-fade-in .3s ease-out; }
.ss-burst.skiff .ss-rays { width: 560px; height: 560px; margin: -280px; background: repeating-conic-gradient(from 0deg, rgba(255,200,90,0.55) 0 7deg, rgba(160,110,255,0.35) 7deg 12deg, transparent 12deg 24deg); }
@keyframes ss-rays { to { transform: rotate(1turn); } }
@keyframes ss-fade-in { from { opacity: 0; transform: scale(0.4); } }
.ss-spark { position: absolute; left: 0; top: 0; width: 8px; height: 8px; margin: -4px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px 2px var(--r);
  animation: ss-spark .9s var(--d) ease-out both; }
.ss-burst.skiff .ss-spark { box-shadow: 0 0 10px 3px #c9a2ff; }
@keyframes ss-spark { 0% { transform: translate(0, 0) scale(0.2); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--x), var(--y)) scale(1); opacity: 0; } }
.ss-pop { position: absolute; width: 120px; height: 120px; margin: -60px; left: 0; top: 0; display: grid; place-items: center; border-radius: 16px; border: 2px solid var(--r);
  background: radial-gradient(circle, color-mix(in srgb, var(--r) 40%, #1a0e20), #140a1a 75%); box-shadow: 0 0 30px var(--r); animation: ss-pop .5s cubic-bezier(.2,1.6,.4,1) both; }
.ss-pop > img { width: 96px; height: 96px; object-fit: contain; }
.ss-pop .ss-pair { width: 96px; height: 96px; }
.ss-burst.skiff .ss-pop { width: 260px; height: 200px; margin: -100px -130px; border-color: #e8b83a; box-shadow: 0 0 40px #e8b83a, 0 0 80px rgba(160,110,255,0.6); }
.ss-burst.skiff .ss-pop > img { width: 240px; height: 190px; animation: ss-lift 3s ease-in-out infinite; }
@keyframes ss-lift { 50% { transform: translateY(-8px) rotate(-1.5deg); } }
@keyframes ss-pop { from { transform: scale(0.2) rotate(-12deg); opacity: 0; } }
.ss-banner { position: absolute; left: 0; top: 78px; transform: translateX(-50%); margin: 0; width: max-content; max-width: 86vw; text-align: center; animation: ss-fade-in .4s .15s ease-out both; }
.ss-burst.skiff .ss-banner { top: 116px; }
.ss-banner b { display: block; font: 400 44px/1 'Jacquard 12', Georgia, serif; color: #ecdcb8; text-shadow: 0 2px 0 #000, 0 0 18px var(--r); }
.ss-burst.skiff .ss-banner b { font-size: 56px; color: #ffe2a0; }
.ss-banner span { display: inline-block; margin-top: 4px; padding: 3px 12px; font-size: 16px; background: rgba(20,9,26,0.85); border-radius: 6px; }
.swap-shop.flourish .ss-panel { filter: brightness(0.75); }
@media (max-width: 720px) {
  .swap-shop { padding: 0 8px calc(8px + env(safe-area-inset-bottom, 0px)); }
  .ss-panel { height: min(560px, calc(100% - 190px)); min-height: 0; gap: 8px; padding: 10px; grid-template: "head" auto "wares" minmax(110px, 1fr) "preview" auto "hers" auto / minmax(0, 1fr); }
  .ss-portrait { width: 48px; height: 48px; }
  .ss-who h2 { font-size: 24px; }
  .ss-say { font-size: 14px; min-height: 2.8em; }
  .ss-leave { padding: 5px 10px; font-size: 14px; }
  .ss-row { grid-template-columns: 34px minmax(0, 1fr) auto; gap: 6px; padding: 3px 6px 3px 2px; }
  .ss-icon { width: 34px; height: 34px; } .ss-icon > img { width: 30px; height: 30px; }
  .ss-name b { font-size: 14px; } .ss-name small { font-size: 11px; }
  .ss-want { width: 26px; height: 26px; } .ss-want img { width: 20px; height: 20px; }
  .ss-preview { max-height: 36vh; padding: 8px 10px; gap: 6px; }
  .ss-pscroll { gap: 4px; }
  .ss-big { width: 56px; height: 56px; } .ss-big > img { width: 48px; height: 48px; } .ss-big.wide { width: 76px; } .ss-big.wide > img { width: 70px; height: 54px; }
  .ss-big .ss-pair { width: 48px; height: 48px; }
  .ss-title h3 { font-size: 24px; }
  .ss-does { font-size: 13px; } .ss-note { display: none; }
  .ss-preview h4 { display: none; }
  .ss-price { padding-top: 6px; gap: 8px; }
  .ss-wantlist li { font-size: 13px; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 6px; } .ss-wantlist img { width: 20px; height: 20px; }
  .ss-go { padding: 6px 18px; }
  .ss-hers { padding: 6px 8px; } .ss-hers h3 { font-size: 20px; }
  .ss-group li { width: 32px; height: 32px; } .ss-group li img { width: 27px; height: 27px; }
  .ss-trade { grid-template-columns: minmax(0, 1fr); } .ss-for { text-align: center; font-size: 18px; }
  .ss-cycle .ss-chip { width: auto; flex: 1; } .ss-cycle { display: flex; }
  .ss-banner b { font-size: 36px; }
  .ss-burst.skiff .ss-pop { width: 210px; height: 165px; margin: -82px -105px; } .ss-burst.skiff .ss-pop > img { width: 190px; height: 150px; }
  .ss-burst.skiff .ss-banner b { font-size: 42px; }
}
@media (prefers-reduced-motion: reduce) { .ss-rays, .ss-spark, .ss-row.sel::before, .ss-burst.skiff .ss-pop > img { animation: none !important; } }
`;
  document.head.append(el('style', { id: 'swap-shop-style', text: css }));
}
