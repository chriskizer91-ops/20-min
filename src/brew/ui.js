// Pick Your Poison: the cauldron screen, as an overlay any page can open (docs/SLICE.md §4 and §5).
//
//   import { openCauldron } from './brew/ui.js';
//   const cauldron = openCauldron({ basket, moonwater, grimoire, onBrew, onClose });
//
// What it takes (only `basket` and `moonwater` are needed):
//   basket     { herbId: count }: her herbs, by the ids in src/brew/recipes.js (the art/herbs file names, as the
//              field's basket keeps them). It is read, never changed: the new basket comes back in onBrew/onClose.
//   moonwater  how many bottles she carries. One goes into every brew (LORE §8: the limit on brewing).
//   grimoire   her grimoire from last time (the shape rules.newGrimoire() makes), or nothing for a fresh one.
//   bag        { brewId: count }: brews and duds she already carries (optional). Brewed ids are the battle bag's.
//   onBrew     (result, state) after every blessing. result: { kind: 'brew' | 'dud', id, name, item, first, herbs }
//              (item is the WITCH_CONSUMABLES id, or null for Wisp-Calm, a field brew); state: { basket,
//              moonwater, bag, grimoire }, everything she has now.
//   onClose    (state) when she steps away from the pot. A half-made pot costs nothing: it all goes back.
//   view       'hearth' (the cottage painting framed on its hearth, full screen: needs `painting`, its URL),
//              'small' (the default: its own little 3D view of the cauldron and the witch in a frame, for an overlay
//              over a field screen; `backdrop` is an optional picture behind it), or 'none' (the menus only).
//   audio      a createSound() to share, such as the field's (field.audio); otherwise it makes its own.
//   music      the track while it's open (default 'wickhollow'; null leaves the music alone). On close it asks for
//              `musicAfter` if given.
//   place      the line under the title ("Her cottage, at the hearth"; "Nettie's hut").
//   container  where the overlay goes (default document.body).
//
// It returns a handle at once: { el, ready (a promise, once the 3D view is up), state, pot, close(),
// openGrimoire(), view }. The rules are all in rules.js; this file only shows them and plays them out.
import { HERBS, HERB_IDS, BREWS, DUDS, VIRTUES, byId } from './recipes.js';
import {
  newPot, pourWater, addHerb, takeHerb, stir, bless, nextStep, herbsLeft, potColour, newGrimoire, seeHerbs, recipeOf,
  REFUSALS, MAX_HERBS,
} from './rules.js';
import { herbIcons, brewArt, itemArt } from './assets.js';
import { createCauldronView } from './view.js';
import { createSound } from '../audio/sound.js';
import { MOONWATER_COLOR } from './recipes.js';

const GRIMOIRE_LINE = 'Rot is grief that nobody sat with. I sat with some. It\'s better company than it looks.';
const COMMANDS = [
  { id: 'herbs', label: 'Herbs', hint: 'Choose herbs from her basket' },
  { id: 'water', label: 'Moonwater', hint: 'Pour in one bottle of moonwater' },
  { id: 'stir', label: 'Stir', hint: 'Stir it round' },
  { id: 'bless', label: 'Bless', hint: 'Bless it with witchfire' },
  { id: 'grimoire', label: 'Grimoire', hint: 'Read her grimoire' },
  { id: 'leave', label: 'Leave', hint: 'Step away from the pot' },
];
// Her lines as she works, and when a brew comes out right (her voice: warm, dry, small jokes)
const SAY = {
  open: ['Witchfire first. There. Now, what are we making?', 'The pot is warm. What are we making?'],
  herbs: 'Up to three herbs, then the moonwater.',
  water: 'One bottle of moonwater. It holds the full moon, and the full moon holds the rest.',
  stir: 'Round and round. The herbs have to meet each other.',
  bless: 'Now the witchfire, to finish it.',
  good: ['There. That\'s the one.', 'Good. Into the basket with you.', 'That smells right. That smells exactly right.'],
  again: 'Another. I know this one by heart now.',
  empty: 'Nothing in the basket to brew with. The garden, the square and the fen have more.',
  leaveHalf: 'I\'ll tip it back. Nothing is used until the blessing.',
};
const pick = (x) => (Array.isArray(x) ? x[Math.floor(Math.random() * x.length)] : x);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HAND = `<svg class="pyp-hand" viewBox="0 0 16 11" aria-hidden="true" shape-rendering="crispEdges"><path fill="#12091a" d="M0 3h7V1h2v2h6v1h1v4h-1v1H9v1H1V9H0z"/><path fill="#fff8e8" d="M1 4h7V2h1v2h6v3h-1v1H9v1H2V8H1z"/><path fill="#c9b8a0" d="M2 7h6v1H2zM9 6h5v1H9z"/></svg>`;

// ---------------------------------------------------------------- the look (injected once)
const CSS = `
.pyp { --pyp-plum: #3a1631; --pyp-cream: #ecdcb8; --pyp-ink: #f3ead8; --pyp-dim: #b9a9c4; --pyp-gold: #e2bd67; --pyp-magenta: #c63d83;
  --pyp-display: 'Jacquard 12', 'Georgia', serif; --pyp-body: 'Pixelify Sans', 'Trebuchet MS', system-ui, sans-serif;
  --pyp-gutter: max(16px, env(safe-area-inset-left, 0px));
  position: fixed; inset: 0; z-index: 50; color: var(--pyp-ink); font: 16px/1.4 var(--pyp-body); -webkit-user-select: none; user-select: none; }
.pyp [hidden] { display: none !important; }
.pyp *, .pyp *::before, .pyp *::after { box-sizing: border-box; }
.pyp button { font: inherit; color: inherit; cursor: pointer; }
.pyp button:focus-visible { outline: 2px solid var(--pyp-gold); outline-offset: 2px; }
.pyp-win { background: linear-gradient(180deg, rgba(58, 22, 49, 0.95), rgba(20, 9, 26, 0.96)); border: 2px solid var(--pyp-cream); border-radius: 8px;
  box-shadow: inset 0 0 0 3px var(--pyp-plum), inset 0 0 0 4px rgba(236, 220, 184, 0.35), 0 10px 30px rgba(0, 0, 0, 0.6); }
.pyp--none, .pyp--small { background: radial-gradient(ellipse at 50% 40%, rgba(40, 18, 44, 0.72), rgba(8, 4, 12, 0.9) 75%); }
.pyp-scene { position: absolute; inset: 0; }
.pyp-scene canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.pyp--small .pyp-scene { inset: auto; left: 50%; top: calc(16px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); width: min(420px, calc(100% - 32px)); height: min(46vh, 360px);
  overflow: hidden; background: radial-gradient(ellipse at 50% 60%, #4a2840, #1a0c1c 75%) center / cover; }
.pyp--small .pyp-scene.has-backdrop::before { content: ''; position: absolute; inset: -8px; background: var(--pyp-backdrop) center / cover; filter: blur(3px) brightness(0.5); }
.pyp--small .pyp-scene canvas { position: relative; }
.pyp--none .pyp-scene { display: none; }
.pyp-title { position: absolute; top: calc(12px + env(safe-area-inset-top, 0px)); left: var(--pyp-gutter); pointer-events: none; text-shadow: 0 2px 0 #000, 0 0 18px rgba(0,0,0,0.9); }
.pyp-title h2 { margin: 0; font: 400 clamp(38px, 5.4vw, 60px)/0.9 var(--pyp-display); color: var(--pyp-cream); letter-spacing: 0.01em; }
.pyp-title p { margin: 4px 0 0 2px; font-size: 14px; color: var(--pyp-gold); letter-spacing: 0.08em; text-transform: uppercase; }
.pyp--small .pyp-title { display: none; }
.pyp-say { position: absolute; top: calc(14px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); width: min(520px, calc(100% - 32px));
  margin: 0; padding: 10px 16px; text-align: center; font-size: 16px; min-height: 2.9em; display: flex; align-items: center; justify-content: center; }
.pyp-say.refuse { color: var(--pyp-gold); }
.pyp--hearth .pyp-say { top: auto; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); width: min(440px, calc(100% - 640px)); min-width: 260px; }
.pyp--small .pyp-say { top: calc(min(46vh, 360px) + 26px + env(safe-area-inset-top, 0px)); }
.pyp--none .pyp-say { top: auto; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); width: min(440px, calc(100% - 640px)); min-width: 260px; }
.pyp-menu { position: absolute; left: var(--pyp-gutter); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); width: 272px; padding: 12px 12px 10px; }
.pyp-menu h3, .pyp-basket h3 { margin: 0 0 6px; font: 400 26px/1 var(--pyp-display); color: var(--pyp-cream); display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.pyp-menu h3 small, .pyp-basket h3 small { font: 13px var(--pyp-body); color: var(--pyp-dim); }
.pyp-pot { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0 0 10px; }
.pyp-slot { position: relative; aspect-ratio: 1; padding: 0; background: #12070f; border: 1px solid #3a1838; border-radius: 4px; display: grid; place-items: center; }
.pyp-slot img { width: 86%; height: 86%; image-rendering: pixelated; }
.pyp-slot.water { border-color: #3a4a68; }
.pyp-slot.water img { opacity: 0.3; filter: grayscale(0.6); }
.pyp-slot.water.in img { opacity: 1; filter: none; }
.pyp-slot.water b { position: absolute; right: 3px; bottom: 1px; font-size: 13px; font-weight: 400; text-shadow: 0 1px 0 #000; }
.pyp-slot.herb:not(:empty) { border-color: rgba(236, 220, 184, 0.45); }
.pyp-slot.herb:empty::after { content: ''; width: 10px; height: 10px; border: 1px dashed rgba(236, 220, 184, 0.25); border-radius: 50%; }
.pyp-slot .x { position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; border-radius: 50%; background: var(--pyp-plum); border: 1px solid var(--pyp-cream);
  font-size: 11px; line-height: 13px; text-align: center; opacity: 0; transition: opacity 0.2s; }
.pyp-slot:hover .x, .pyp-slot:focus-visible .x { opacity: 1; }
.pyp-colour { height: 6px; margin: -4px 0 10px; border-radius: 3px; background: #231a2c; transition: background 0.8s; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5); }
.pyp-commands { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.pyp-commands button { position: relative; width: 100%; text-align: left; padding: 5px 10px 5px 34px; background: none; border: 0; border-radius: 4px; font-size: 18px; }
.pyp-commands button[aria-disabled='true'] { color: #8a7a92; }
.pyp-commands button.next:not([aria-disabled='true'])::after { content: '•'; margin-left: 8px; color: var(--pyp-gold); }
.pyp-commands button:focus-visible { outline: none; background: rgba(236, 220, 184, 0.08); }
.pyp-hand { position: absolute; left: 4px; top: 50%; width: 24px; height: 17px; margin-top: -9px; image-rendering: pixelated; opacity: 0; }
.pyp-commands button.cur .pyp-hand, .pyp-herbs button.cur .pyp-hand { opacity: 1; animation: pyp-point 0.7s steps(2) infinite; }
@keyframes pyp-point { 50% { transform: translateX(-3px); } }
.pyp-basket { position: absolute; right: var(--pyp-gutter); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); width: 332px; padding: 12px; }
.pyp-herbs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.pyp-herbs button { position: relative; width: 100%; aspect-ratio: 1; padding: 0; background: #12070f; border: 1px solid #3a1838; border-radius: 4px; display: grid; place-items: center; }
.pyp-herbs button img { width: 84%; height: 84%; image-rendering: pixelated; }
.pyp-herbs button b { position: absolute; right: 4px; bottom: 1px; font-size: 14px; font-weight: 400; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
.pyp-herbs button[aria-disabled='true'] img { opacity: 0.3; }
.pyp-herbs button.cur { border-color: var(--pyp-gold); }
.pyp-herbs .pyp-hand { left: -14px; top: 50%; }
.pyp-herb-name { margin: 8px 0 8px; min-height: 2.8em; font-size: 14px; color: var(--pyp-dim); }
.pyp-herb-name b { color: var(--pyp-ink); font-weight: 400; font-size: 16px; }
.pyp-virtue { display: inline-block; padding: 0 6px; margin-left: 4px; border-radius: 8px; font-size: 12px; color: #1a0c1c; }
.pyp-row { display: flex; gap: 8px; justify-content: flex-end; }
.pyp-btn { padding: 7px 14px; background: rgba(58, 22, 49, 0.9); border: 1px solid rgba(236, 220, 184, 0.6); border-radius: 6px; font-size: 15px; }
.pyp-btn:hover { border-color: var(--pyp-cream); }
.pyp-btn.main { background: var(--pyp-magenta); border-color: var(--pyp-cream); color: #fff; }
.pyp-veil { position: absolute; inset: 0; background: rgba(7, 3, 10, 0.55); }
.pyp-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100% - 32px)); max-height: calc(100% - 32px); overflow: auto;
  padding: 18px 20px 16px; text-align: center; animation: pyp-card 0.45s cubic-bezier(.2, 1.4, .4, 1); }
@keyframes pyp-card { from { transform: translate(-50%, -40%) scale(0.85); opacity: 0; } }
.pyp-card .art { width: 128px; height: 128px; image-rendering: pixelated; filter: drop-shadow(0 0 18px var(--glow, #b48cff)); }
.pyp-card h3 { margin: 2px 0 4px; font: 400 44px/0.95 var(--pyp-display); color: var(--pyp-cream); }
.pyp-new { display: inline-block; margin: 0 0 6px; padding: 2px 10px; border-radius: 10px; background: var(--pyp-gold); color: #2a1020; font-size: 14px; letter-spacing: 0.06em;
  text-transform: uppercase; animation: pyp-new 1.2s ease-in-out infinite; }
@keyframes pyp-new { 50% { box-shadow: 0 0 14px 2px rgba(226, 189, 103, 0.7); } }
.pyp-new small { text-transform: none; letter-spacing: 0; }
.pyp-recipe { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 4px 0 10px; font-size: 18px; color: var(--pyp-dim); }
.pyp-recipe img { width: 36px; height: 36px; image-rendering: pixelated; }
.pyp-does { margin: 0 0 8px; text-align: left; font-size: 15px; display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; }
.pyp-does dt { color: var(--pyp-gold); font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 2px; }
.pyp-does dd { margin: 0; }
.pyp-card .dud { margin: 0 0 8px; color: var(--pyp-dim); font-size: 14px; }
.pyp-card .said { margin: 6px 0 12px; font-style: italic; color: #e9e0f2; }
.pyp-card .count { margin: 0 0 12px; font-size: 13px; color: var(--pyp-dim); }
.pyp-grimoire { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(820px, calc(100% - 32px)); max-height: min(600px, calc(100% - 32px));
  display: grid; grid-template-rows: auto auto auto minmax(0, 1fr); padding: 14px 18px 18px; }
.pyp-grimoire header { display: flex; align-items: baseline; gap: 12px; }
.pyp-grimoire h3 { margin: 0; font: 400 38px/1 var(--pyp-display); color: var(--pyp-cream); }
.pyp-grimoire header span { flex: 1; color: var(--pyp-dim); font-size: 13px; }
.pyp-epigraph { margin: 2px 0 8px; font-size: 13px; font-style: italic; color: var(--pyp-dim); }
.pyp-tabs { display: flex; gap: 6px; margin: 0 0 10px; }
.pyp-tabs button { padding: 4px 12px; background: #140816; border: 1px solid rgba(236, 220, 184, 0.35); border-radius: 6px 6px 0 0; font-size: 14px; color: var(--pyp-dim); }
.pyp-tabs button[aria-selected='true'] { background: #3a1838; color: var(--pyp-ink); border-color: var(--pyp-cream); box-shadow: inset 0 -2px 0 var(--pyp-gold); }
.pyp-book { display: grid; grid-template-columns: 236px 1fr; gap: 16px; min-height: 0; }
.pyp-pages { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; align-content: start; overflow: auto; }
.pyp-pages button { width: 100%; aspect-ratio: 1; padding: 2px; background: #140816; border: 1px solid #3a2440; border-radius: 3px; }
.pyp-pages button img { width: 100%; height: 100%; image-rendering: pixelated; }
.pyp-pages button.blank img { filter: brightness(0) invert(0.16) sepia(1) hue-rotate(250deg) saturate(2); opacity: 0.8; }
.pyp-pages button[aria-current='true'] { background: #3a1838; border-color: var(--pyp-gold); }
.pyp-page { overflow: auto; min-height: 0; padding-right: 4px; }
.pyp-page .top { display: flex; gap: 14px; align-items: center; }
.pyp-page .top img { width: 112px; height: 112px; image-rendering: pixelated; flex: none; }
.pyp-page .top img.blank { filter: brightness(0) invert(0.16) sepia(1) hue-rotate(250deg) saturate(2); opacity: 0.8; }
.pyp-page h4 { margin: 0; font: 400 34px/1 var(--pyp-display); color: var(--pyp-gold); }
.pyp-page .sub { margin: 4px 0 0; font-size: 14px; color: var(--pyp-dim); }
.pyp-page p { margin: 8px 0; font-size: 15px; }
.pyp-page .faded { color: #8a7a92; font-style: italic; }
.pyp-float { position: absolute; pointer-events: none; transform: translate(-50%, -100%); font: 400 30px/1 var(--pyp-display); color: var(--pyp-cream); text-shadow: 0 2px 0 #000, 0 0 12px var(--glow, #b48cff);
  animation: pyp-float 1.6s ease-out forwards; white-space: nowrap; }
@keyframes pyp-float { from { opacity: 0; margin-top: 10px; } 15% { opacity: 1; } to { opacity: 0; margin-top: -60px; } }
@media (max-width: 1100px) { .pyp--hearth .pyp-say, .pyp--none .pyp-say { width: min(440px, calc(100% - 32px)); left: 50%; top: calc(82px + env(safe-area-inset-top, 0px)); bottom: auto; } }
@media (max-width: 700px) {
  .pyp--hearth .pyp-scene { bottom: auto; height: 64%; }
  .pyp--hearth .pyp-say, .pyp--none .pyp-say { top: auto; bottom: calc(250px + env(safe-area-inset-bottom, 0px)); font-size: 15px; padding: 8px 12px; min-height: 0; width: auto; left: var(--pyp-gutter); right: var(--pyp-gutter); transform: none; min-width: 0; }
  .pyp--small .pyp-say { font-size: 15px; padding: 8px 12px; min-height: 0; }
  .pyp--small .pyp-scene { height: min(40vh, 360px); }
  .pyp--small .pyp-say { top: calc(min(40vh, 360px) + 24px + env(safe-area-inset-top, 0px)); }
  .pyp:has(.pyp-basket:not([hidden])) .pyp-menu { visibility: hidden; }
  .pyp:has(.pyp-basket:not([hidden])) .pyp-say { bottom: calc(318px + env(safe-area-inset-bottom, 0px)); }
  .pyp-title h2 { font-size: 36px; }
  .pyp-title p { font-size: 12px; }
  .pyp-menu, .pyp-basket { left: var(--pyp-gutter); right: var(--pyp-gutter); width: auto; }
  .pyp-menu { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto auto 1fr; gap: 0 12px; align-items: start; padding: 10px; }
  .pyp-menu h3 { grid-column: 1 / -1; font-size: 22px; }
  .pyp-pot { margin-bottom: 6px; }
  .pyp-colour { grid-column: 1; margin: 0; }
  .pyp-commands { grid-column: 2; grid-row: 2 / span 3; }
  .pyp-commands button { font-size: 16px; padding: 3px 8px 3px 30px; }
  .pyp-herbs { grid-template-columns: repeat(6, 1fr); }
  .pyp-grimoire { height: calc(100% - 32px); max-height: none; padding: 12px 14px; }
  .pyp-grimoire header { flex-wrap: wrap; row-gap: 0; }
  .pyp-grimoire header span { order: 3; flex-basis: 100%; }
  .pyp-grimoire h3 { font-size: 32px; flex: 1; }
  .pyp-book { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .pyp-pages { grid-template-columns: repeat(6, 1fr); max-height: 34vh; }
  .pyp-card h3 { font-size: 36px; }
}
@media (max-width: 700px) and (max-height: 700px) { .pyp-card .art { width: 96px; height: 96px; } }
@media (max-height: 520px) and (min-width: 701px) {
  .pyp-menu { width: 268px; padding: 8px 10px; }
  .pyp-menu h3, .pyp-basket h3 { font-size: 20px; margin-bottom: 4px; }
  .pyp-pot { gap: 4px; margin-bottom: 6px; grid-template-columns: repeat(4, 44px); }
  .pyp-commands { grid-template-columns: 1fr 1fr; }
  .pyp-commands button { font-size: 15px; padding: 3px 6px 3px 28px; }
  .pyp-basket { width: 380px; padding: 8px 10px; }
  .pyp-herbs { grid-template-columns: repeat(6, 1fr); }
  .pyp-herb-name { min-height: 0; margin: 4px 0; }
  .pyp-card .art { width: 72px; height: 72px; }
  .pyp-card h3 { font-size: 32px; }
  .pyp--hearth .pyp-say, .pyp--none .pyp-say { top: auto; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); left: auto; right: var(--pyp-gutter);
    transform: none; width: min(320px, calc(100% - 320px)); min-width: 0; font-size: 14px; padding: 8px 12px; }
  .pyp:has(.pyp-basket:not([hidden])) .pyp-say { visibility: hidden; }
}
@media (prefers-reduced-motion: reduce) { .pyp-card, .pyp-new, .pyp-float, .pyp-hand { animation: none !important; } }
`;
function injectStyle() {
  if (document.getElementById('pyp-style')) return;
  const s = document.createElement('style');
  s.id = 'pyp-style';
  s.textContent = CSS;
  document.head.append(s);
}

// ---------------------------------------------------------------- open the cauldron
export function openCauldron(opts = {}) {
  injectStyle();
  const {
    onBrew, onClose, view: mode = 'small', painting = null, backdrop = null, music = 'wickhollow', musicAfter,
    place = 'At the cauldron', container = document.body,
  } = opts;
  const audio = opts.audio ?? createSound();
  const ownAudio = !opts.audio;
  let state = {
    basket: { ...(opts.basket ?? {}) }, moonwater: opts.moonwater ?? 0, bag: { ...(opts.bag ?? {}) },
    grimoire: seeHerbs(opts.grimoire ?? newGrimoire(), opts.basket ?? {}),
  };
  let pot = newPot();
  let busy = false, closed = false, layer = 'menu', cur = 0, herbCur = 0, view = null, raf = 0;
  const sfx = (name) => { try { audio.sfx(name); } catch { /* sound never breaks the pot */ } };
  // Waits that run on the scene's own clock, so the steps keep in time with the animation even on a slow device
  // (with no 3D view, on the wall clock).
  const timers = [];
  const wait = (sec) => (view ? new Promise((r) => timers.push({ t: sec, r })) : sleep(sec * 1000));

  // ---------------------------------------------------------------- the DOM
  const el = document.createElement('div');
  el.className = `pyp pyp--${mode}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Pick Your Poison: brewing at the cauldron');
  el.innerHTML = `
    <div class="pyp-scene${backdrop ? ' has-backdrop' : ''}"><canvas aria-label="The witch at her cauldron"></canvas></div>
    <header class="pyp-title"><h2>Pick Your Poison</h2><p>${esc(place)}</p></header>
    <p class="pyp-say pyp-win" aria-live="polite"></p>
    <section class="pyp-menu pyp-win" aria-label="Brewing">
      <h3>In the pot <small class="pyp-left"></small></h3>
      <div class="pyp-pot"></div>
      <div class="pyp-colour" aria-hidden="true"></div>
      <ul class="pyp-commands" role="menu"></ul>
    </section>
    <section class="pyp-basket pyp-win" hidden aria-label="Her basket">
      <h3>Her basket <small>up to ${MAX_HERBS} herbs</small></h3>
      <ul class="pyp-herbs"></ul>
      <p class="pyp-herb-name"></p>
      <div class="pyp-row"><button class="pyp-btn pyp-done">Done</button></div>
    </section>
    <div class="pyp-veil" hidden></div>
    <section class="pyp-card pyp-win" hidden aria-live="assertive"></section>
    <section class="pyp-grimoire pyp-win" hidden aria-label="Her grimoire"></section>`;
  if (backdrop) el.querySelector('.pyp-scene').style.setProperty('--pyp-backdrop', `url(${backdrop})`);
  container.append(el);
  const $ = (s) => el.querySelector(s);
  const canvas = $('canvas');

  // ---------------------------------------------------------------- saying things
  let sayTimer = 0;
  function say(text, refuse = false) {
    const p = $('.pyp-say');
    p.textContent = text;
    p.classList.toggle('refuse', refuse);
    clearTimeout(sayTimer);
    if (refuse) sayTimer = setTimeout(() => { if (!closed) hint(); }, 3200);
  }
  function hint() {
    if (!HERB_IDS.some((h) => (state.basket[h] ?? 0) > 0) && !pot.herbs.length) return say(SAY.empty);
    const { next } = nextStep(pot, state);
    if (!pot.water && state.moonwater < 1 && pot.herbs.length) return say(REFUSALS['no-moonwater'], false);
    say(SAY[next]);
  }
  function refuse(reason) {
    sfx('ui-error');
    say(REFUSALS[reason] ?? 'Not now.', true);
    view?.cauldron.play('talk'); // the pot burbles back at her
  }
  function floatText(text, glow) {
    const at = view ? view.potOnScreen() : { x: innerWidth / 2, y: innerHeight * 0.4 };
    const f = document.createElement('div');
    f.className = 'pyp-float';
    f.textContent = text;
    f.style.left = `${at.x}px`;
    f.style.top = `${at.y}px`;
    if (glow) f.style.setProperty('--glow', glow);
    el.append(f);
    setTimeout(() => f.remove(), 1700);
  }

  // ---------------------------------------------------------------- the pot window
  function renderPot() {
    const slots = [];
    const water = pot.water;
    slots.push(`<button class="pyp-slot water${water ? ' in' : ''}" data-slot="water" title="Moonwater: ${state.moonwater} carried" aria-label="Moonwater ${water ? 'in the pot' : 'not poured'}, ${state.moonwater} carried"><img src="${itemArt.moonwater}" alt=""><b>×${Math.max(0, state.moonwater - (water ? 1 : 0))}</b></button>`);
    for (let i = 0; i < MAX_HERBS; i++) {
      const h = pot.herbs[i];
      slots.push(h
        ? `<button class="pyp-slot herb" data-slot="${i}" title="${esc(HERBS[h].name)}: tap to fish it out" aria-label="${esc(HERBS[h].name)} in the pot; take it out"><img src="${herbIcons[h]}" alt=""><span class="x" aria-hidden="true">×</span></button>`
        : `<button class="pyp-slot herb" data-slot="${i}" aria-label="Empty"></button>`);
    }
    $('.pyp-pot').innerHTML = slots.join('');
    const c = potColour(pot);
    $('.pyp-colour').style.background = c ?? '#231a2c';
    $('.pyp-left').textContent = `${state.moonwater} moonwater`;
  }

  function renderCommands() {
    const { steps, next } = nextStep(pot, state);
    const ok = { herbs: steps.herbs, water: steps.water, stir: steps.stir, bless: steps.bless, grimoire: true, leave: true };
    $('.pyp-commands').innerHTML = COMMANDS.map((c, i) => `<li><button role="menuitem" data-cmd="${c.id}" class="${i === cur && layer === 'menu' ? 'cur' : ''}${c.id === next ? ' next' : ''}" aria-disabled="${!ok[c.id]}" title="${esc(c.hint)}">${HAND}${c.label}</button></li>`).join('');
  }

  // ---------------------------------------------------------------- the basket window
  const herbList = () => HERB_IDS.filter((h) => (state.basket[h] ?? 0) > 0);
  function renderBasket() {
    const list = herbList();
    herbCur = Math.min(herbCur, Math.max(0, list.length - 1));
    $('.pyp-herbs').innerHTML = list.map((h, i) => {
      const left = herbsLeft(state.basket, pot, h);
      return `<li><button data-herb="${h}" class="${i === herbCur && layer === 'basket' ? 'cur' : ''}" aria-disabled="${left < 1 || pot.herbs.length >= MAX_HERBS}" aria-label="${esc(HERBS[h].name)}, ${left} left">${HAND}<img src="${herbIcons[h]}" alt=""><b>${left}</b></button></li>`;
    }).join('') || '<li class="pyp-herb-name">The basket is empty.</li>';
    showHerbName(list[herbCur]);
  }
  function showHerbName(h) {
    const p = $('.pyp-herb-name');
    if (!h) { p.textContent = ''; return; }
    const H = HERBS[h];
    p.innerHTML = `<b>${esc(H.name)}</b>${H.virtues.map((v) => `<span class="pyp-virtue" style="background:${VIRTUES[v].color}">${v}</span>`).join('')}${H.dose ? ' <span class="pyp-virtue" style="background:#e2bd67">dose herb</span>' : ''}<br>${esc(H.note)}`;
  }

  function render() {
    renderPot();
    renderCommands();
    if (layer === 'basket') renderBasket();
  }

  // ---------------------------------------------------------------- the steps
  async function doCommand(id) {
    if (busy || closed) return;
    if (id === 'grimoire') { sfx('ui-page'); return openGrimoire(); }
    if (id === 'leave') return close();
    if (id === 'herbs') {
      if (pot.herbs.length >= MAX_HERBS) return refuse('pot-full');
      if (!herbList().length) { sfx('ui-error'); return say(SAY.empty, true); }
      sfx('ui-open');
      layer = 'basket';
      $('.pyp-basket').hidden = false;
      herbCur = Math.max(0, herbList().findIndex((h) => herbsLeft(state.basket, pot, h) > 0));
      render();
      focusCurrent();
      return say(SAY.herbs);
    }
    if (id === 'water') {
      const r = pourWater(pot, state.moonwater);
      if (!r.ok) return refuse(r.reason);
      sfx('ui-confirm');
      busy = true;
      pot = r.pot;
      render();
      view?.faceThePot(true);
      if (view) {
        view.cauldron.play('pour');
        sfx('river');
        await wait(0.55);
        view.cauldron.setWater(true);
        view.cauldron.setColor(potColour(pot));
        await wait(0.95);
        view.faceThePot(false);
      }
      busy = false;
      hint();
      render();
      return;
    }
    if (id === 'stir') {
      const r = stir(pot);
      if (!r.ok) return refuse(r.reason);
      sfx('ui-confirm');
      busy = true;
      pot = r.pot;
      render();
      if (view) {
        view.faceThePot(true);
        view.witch.play('stir');
        view.cauldron.play('stir');
        sfx('step-water');
        say(SAY.stir);
        await wait(1.15);
        sfx('step-water');
        await wait(1.25);
        view.faceThePot(false);
      }
      busy = false;
      hint();
      render();
      return;
    }
    if (id === 'bless') return doBless();
  }

  async function doHerb(h) {
    if (busy || closed) return;
    const r = addHerb(pot, state.basket, h);
    if (!r.ok) return refuse(r.reason);
    pot = r.pot;
    sfx('ui-confirm');
    render();
    if (view) {
      view.faceThePot(true);
      view.cauldron.dropHerb(herbIcons[h]);
      wait(0.42).then(() => {
        if (closed) return;
        sfx(pot.water ? 'poison' : 'bump');
        view.cauldron.setColor(potColour(pot) ?? MOONWATER_COLOR);
        view.faceThePot(false);
      });
    }
    const H = HERBS[h];
    say(`${H.name} in. ${H.virtues.join(' and ')}.${pot.herbs.length >= MAX_HERBS ? ' That\'s a full pot.' : ''}`);
    if (pot.herbs.length >= MAX_HERBS) closeBasket();
  }

  function doTakeOut(i) {
    if (busy || closed) return;
    const r = takeHerb(pot, i);
    if (!r.ok) return;
    pot = r.pot;
    sfx('ui-back');
    view?.cauldron.takeHerb(i);
    view?.cauldron.setColor(potColour(pot) ?? MOONWATER_COLOR);
    say(`She fishes the ${HERBS[r.herb].name.toLowerCase()} back out. It's only a little damp.`);
    render();
  }

  function closeBasket() {
    if (layer !== 'basket') return;
    layer = 'menu';
    $('.pyp-basket').hidden = true;
    cur = COMMANDS.findIndex((c) => c.id === nextStep(pot, state).next);
    render();
    focusCurrent();
  }

  async function doBless() {
    const r = bless(state, pot);
    if (!r.ok) return refuse(r.reason);
    busy = true;
    sfx('ui-confirm');
    const herbs = [...pot.herbs];
    const result = r.result;
    const def = result.def;
    say(SAY.bless);
    if (view) {
      view.faceThePot(true);
      view.witch.play('cast');
      await wait(0.65);
      sfx('burn');
      view.cauldron.play('bless');
      await wait(0.6);
      view.cauldron.setColor(def.color);
      if (result.kind === 'brew') {
        view.cauldron.setMurk(0);
        view.cauldron.play('good');
        sfx(result.first ? 'reveal-heirloom' : 'chime');
        view.witch.setMood('happy');
        view.witch.play('cheer');
        floatText(def.name, def.color);
      } else {
        view.cauldron.setMurk(1);
        view.cauldron.play('dud');
        sfx('slime');
        setTimeout(() => sfx('stagger'), 260);
        view.witch.setMood('surprised');
        view.witch.play('hurt');
        view.gag(def.id);
        floatText('Plop.', def.color);
      }
      await wait(1.5);
    } else {
      sfx(result.kind === 'brew' ? (result.first ? 'reveal-heirloom' : 'chime') : 'slime');
    }
    state = r.state;
    pot = r.pot;
    busy = false;
    const out = { kind: result.kind, id: result.id, name: def.name, item: def.item, first: result.first, herbs };
    try { onBrew?.(out, snapshot()); } catch (e) { console.error(e); }
    showCard(result, herbs);
    if (view) {
      view.cauldron.setWater(false);
      view.faceThePot(false);
      wait(2.5).then(() => {
        if (closed) return;
        view.cauldron.setMurk(0);
        view.cauldron.setColor(MOONWATER_COLOR);
        view.witch.setMood('calm');
      });
    }
    render();
  }

  // ---------------------------------------------------------------- the result card
  function showCard(result, herbs) {
    const def = result.def;
    const card = $('.pyp-card');
    const recipe = [`<img src="${itemArt.moonwater}" alt="moonwater" title="Moonwater">`, ...herbs.map((h) => `<img src="${herbIcons[h]}" alt="${esc(HERBS[h].name)}" title="${esc(HERBS[h].name)}">`)].join('+');
    let hintLine = '';
    if (result.near) {
      const near = byId(result.near);
      const known = state.grimoire.recipes.includes(near.id);
      const virtues = [...new Set(herbs.map((h) => HERBS[h].virtues[0]))].join(' and ');
      hintLine = known
        ? `<p class="dud">The virtues were right, ${esc(virtues)}, but ${esc(near.name)} wants ${near.herbs.map((h) => esc(HERBS[h].name.toLowerCase())).join(' and ')}.</p>`
        : `<p class="dud">${esc(virtues)}… that's nearly something.</p>`;
    }
    const said = result.kind === 'dud' ? def.say : result.first ? pick(SAY.good) : SAY.again;
    const have = state.bag[def.id] ?? 0;
    card.style.setProperty('--glow', def.color);
    card.innerHTML = `
      <img class="art" src="${brewArt[def.id]}" alt="">
      <div>${result.first ? `<span class="pyp-new">New recipe!${result.kind === 'dud' ? ' <small>(Of a sort.)</small>' : ''}</span>` : ''}</div>
      <h3>${esc(def.name)}</h3>
      <div class="pyp-recipe">${recipe}</div>
      ${result.kind === 'dud' ? `<p class="dud">A dud. ${esc(def.rule)} makes one. Wren insisted duds get cards too.</p>` : ''}
      ${hintLine}
      <dl class="pyp-does"><dt>In the field</dt><dd>${esc(def.field)}</dd><dt>In battle</dt><dd>${esc(def.battle)}</dd></dl>
      <p class="said">“${esc(said)}”</p>
      <p class="count">${def.item ? `Into the bag: she has ${have}.` : `Into the basket: she has ${have}. It isn't for battle.`}</p>
      <button class="pyp-btn main pyp-card-ok">Into the basket</button>`;
    layer = 'card';
    card.hidden = false;
    $('.pyp-veil').hidden = false;
    card.querySelector('.pyp-card-ok').focus();
  }
  function closeCard() {
    $('.pyp-card').hidden = true;
    $('.pyp-veil').hidden = true;
    layer = 'menu';
    cur = 0;
    sfx('ui-back');
    hint();
    render();
    focusCurrent();
  }

  // ---------------------------------------------------------------- the grimoire
  let gTab = 'brews', gSel = 0;
  const TABS = {
    brews: { label: 'Brews', items: () => BREWS.map((b) => b.id), filled: (id) => state.grimoire.recipes.includes(id) },
    duds: { label: 'Duds', items: () => DUDS.map((d) => d.id), filled: (id) => state.grimoire.recipes.includes(id) },
    herbs: { label: 'Herbs', items: () => HERB_IDS, filled: (id) => state.grimoire.herbs.includes(id) },
  };
  function openGrimoire() {
    if (closed || busy || layer === 'card') return;
    if (layer === 'basket') closeBasket();
    layer = 'grimoire';
    $('.pyp-grimoire').hidden = false;
    $('.pyp-veil').hidden = false;
    renderGrimoire();
    el.querySelector('.pyp-tabs [aria-selected="true"]')?.focus();
  }
  function closeGrimoire() {
    $('.pyp-grimoire').hidden = true;
    $('.pyp-veil').hidden = true;
    layer = 'menu';
    sfx('ui-close');
    render();
    focusCurrent();
  }
  function renderGrimoire() {
    const g = $('.pyp-grimoire');
    const tab = TABS[gTab];
    const items = tab.items();
    gSel = Math.min(gSel, items.length - 1);
    const total = Object.values(TABS).reduce((n, t) => n + t.items().length, 0);
    const filled = Object.values(TABS).reduce((n, t) => n + t.items().filter(t.filled).length, 0);
    const icon = (id) => (gTab === 'herbs' ? herbIcons[id] : brewArt[id]);
    g.innerHTML = `
      <header><h3>Her grimoire</h3><span class="pyp-gcount">${filled} of ${total} pages</span><button class="pyp-btn pyp-gclose">Close</button></header>
      <p class="pyp-epigraph">“${esc(GRIMOIRE_LINE)}”</p>
      <div class="pyp-tabs" role="tablist">${Object.entries(TABS).map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === gTab}">${t.label} ${t.items().filter(t.filled).length}/${t.items().length}</button>`).join('')}</div>
      <div class="pyp-book">
        <ul class="pyp-pages">${items.map((id, i) => `<li><button data-page="${i}" class="${tab.filled(id) ? '' : 'blank'}" aria-current="${i === gSel}" aria-label="${esc(nameOf(id))}${tab.filled(id) ? '' : ' (not filled yet)'}"><img src="${icon(id)}" alt=""></button></li>`).join('')}</ul>
        <article class="pyp-page">${pageHtml(items[gSel], tab.filled(items[gSel]))}</article>
      </div>`;
  }
  const nameOf = (id) => HERBS[id]?.name ?? byId(id)?.name ?? id;
  function pageHtml(id, filled) {
    if (gTab === 'herbs') {
      const H = HERBS[id];
      if (!filled) return `<div class="top"><img class="blank" src="${herbIcons[id]}" alt=""><div><h4>${esc(H.name)}</h4><p class="sub">Not in her basket yet.</p></div></div><p class="faded">Where it grows tonight: ${esc(H.grows)}.</p>`;
      return `<div class="top"><img src="${herbIcons[id]}" alt=""><div><h4>${esc(H.name)}</h4><p class="sub">${H.virtues.map((v) => `<span class="pyp-virtue" style="background:${VIRTUES[v].color}">${v}</span>`).join('')}${H.dose ? ' <span class="pyp-virtue" style="background:#e2bd67">dose herb</span>' : ''}</p></div></div>
        <p>${esc(H.note)}</p><p><b>Where it grows tonight:</b> ${esc(H.grows)}.</p><p><b>In battle:</b> ${esc(H.battle)}.</p>
        <p class="sub">In: ${BREWS.filter((b) => b.herbs.includes(id)).map((b) => esc(b.name)).join(', ') || 'no recipe'}</p>`;
    }
    const def = byId(id);
    const icons = (hs) => hs.map((h) => (h === 'moonwater' ? `<img src="${itemArt.moonwater}" alt="moonwater" title="Moonwater">` : `<img src="${herbIcons[h]}" alt="${esc(HERBS[h].name)}" title="${esc(HERBS[h].name)}">`)).join('+');
    if (def.kind === 'brew') {
      const recipe = `<div class="pyp-recipe" style="justify-content:flex-start">${icons(recipeOf(id))}</div>`;
      if (!filled) return `<div class="top"><img class="blank" src="${brewArt[id]}" alt=""><div><h4>${esc(def.name)}</h4><p class="sub">Not brewed tonight. The page fills in when she makes it.</p></div></div>${recipe}<p class="faded">Witch Way's recipe, in her own hand: moonwater, ${def.herbs.map((h) => esc(HERBS[h].name.toLowerCase())).join(' and ')}.</p>`;
      return `<div class="top"><img src="${brewArt[id]}" alt=""><div><h4>${esc(def.name)}</h4><p class="sub">Brewed ${state.grimoire.made[id] ?? 0} time${state.grimoire.made[id] === 1 ? '' : 's'} tonight · ${def.item ? 'for the bag' : 'a field brew'}</p></div></div>
        ${recipe}<dl class="pyp-does"><dt>In the field</dt><dd>${esc(def.field)}</dd><dt>In battle</dt><dd>${esc(def.battle)}</dd></dl>`;
    }
    if (!filled) return `<div class="top"><img class="blank" src="${brewArt[id]}" alt=""><div><h4>A blank page</h4><p class="sub">For a mistake she hasn't made yet.</p></div></div>`;
    const from = state.grimoire.from[id] ?? [];
    return `<div class="top"><img src="${brewArt[id]}" alt=""><div><h4>${esc(def.name)}</h4><p class="sub">A dud · made ${state.grimoire.made[id] ?? 0} time${state.grimoire.made[id] === 1 ? '' : 's'}</p></div></div>
      <p>${esc(def.rule)} makes it. The first one came from:</p><div class="pyp-recipe" style="justify-content:flex-start">${icons(['moonwater', ...from])}</div>
      <dl class="pyp-does"><dt>In the field</dt><dd>${esc(def.field)}</dd><dt>In battle</dt><dd>${esc(def.battle)}</dd></dl>`;
  }

  // ---------------------------------------------------------------- input: pointer
  el.addEventListener('pointerdown', () => { try { audio.unlock(); } catch { /* */ } });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || closed) return;
    if (t.dataset.cmd) {
      cur = COMMANDS.findIndex((c) => c.id === t.dataset.cmd);
      if (layer === 'basket') closeBasket();
      renderCommands();
      return doCommand(t.dataset.cmd);
    }
    if (t.dataset.herb) {
      herbCur = herbList().indexOf(t.dataset.herb);
      return doHerb(t.dataset.herb);
    }
    if (t.dataset.slot !== undefined) {
      if (t.dataset.slot === 'water') return doCommand('water');
      return doTakeOut(Number(t.dataset.slot));
    }
    if (t.classList.contains('pyp-done')) { sfx('ui-back'); return closeBasket(); }
    if (t.classList.contains('pyp-card-ok')) return closeCard();
    if (t.classList.contains('pyp-gclose')) return closeGrimoire();
    if (t.dataset.tab) { gTab = t.dataset.tab; gSel = 0; sfx('ui-page'); renderGrimoire(); el.querySelector(`[data-tab="${gTab}"]`)?.focus(); return; }
    if (t.dataset.page !== undefined) { gSel = Number(t.dataset.page); sfx('ui-cursor'); renderGrimoire(); el.querySelector(`[data-page="${gSel}"]`)?.focus(); }
  });
  el.addEventListener('pointerover', (e) => {
    const t = e.target.closest('button');
    if (t?.dataset.herb) showHerbName(t.dataset.herb);
  });
  $('.pyp-veil').addEventListener('click', () => { if (layer === 'card') closeCard(); else if (layer === 'grimoire') closeGrimoire(); });

  // ---------------------------------------------------------------- input: keys (FF9's: arrows, confirm, back)
  function focusCurrent() {
    if (layer === 'menu') el.querySelectorAll('.pyp-commands button')[cur]?.focus({ preventScroll: true });
    if (layer === 'basket') el.querySelectorAll('.pyp-herbs button')[herbCur]?.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (closed) return;
    try { audio.unlock(); } catch { /* */ }
    const k = e.key;
    const back = k === 'Escape' || k === 'Backspace' || k === 'x' || k === 'X';
    const ok = k === 'Enter' || k === ' ' || k === 'e' || k === 'E' || k === 'z' || k === 'Z';
    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k];
    if (!back && !ok && !dir) return;
    e.preventDefault();
    e.stopPropagation();
    if (layer === 'card') { if (ok || back) closeCard(); return; }
    if (layer === 'grimoire') {
      if (back) return closeGrimoire();
      const tabs = Object.keys(TABS), items = TABS[gTab].items();
      const cols = matchMedia('(max-width: 700px)').matches ? 6 : 4;
      if (dir && e.shiftKey || (dir && dir[0] && document.activeElement?.dataset.tab)) {
        gTab = tabs[(tabs.indexOf(gTab) + (dir[0] || dir[1]) + tabs.length) % tabs.length];
        gSel = 0;
        sfx('ui-page');
        renderGrimoire();
        el.querySelector(`[data-tab="${gTab}"]`)?.focus();
        return;
      }
      if (dir) {
        gSel = Math.max(0, Math.min(items.length - 1, gSel + dir[0] + dir[1] * cols));
        sfx('ui-cursor');
        renderGrimoire();
        el.querySelector(`[data-page="${gSel}"]`)?.focus();
      }
      if (ok && document.activeElement?.classList.contains('pyp-gclose')) closeGrimoire();
      return;
    }
    if (busy) return;
    if (layer === 'basket') {
      const list = herbList();
      const cols = matchMedia('(max-width: 700px)').matches ? 6 : 4;
      if (back) { sfx('ui-back'); return closeBasket(); }
      if (dir) {
        herbCur = Math.max(0, Math.min(list.length - 1, herbCur + dir[0] + dir[1] * cols));
        sfx('ui-cursor');
        renderBasket();
        focusCurrent();
      }
      if (ok) {
        if (document.activeElement?.classList.contains('pyp-done')) return closeBasket();
        if (list[herbCur]) doHerb(list[herbCur]);
      }
      return;
    }
    // the command window
    if (back) return close();
    if (dir) {
      const step = dir[1] || dir[0];
      cur = (cur + step + COMMANDS.length) % COMMANDS.length;
      sfx('ui-cursor');
      renderCommands();
      focusCurrent();
      say(COMMANDS[cur].hint);
    }
    if (ok) {
      const a = document.activeElement;
      if (a?.dataset.slot !== undefined && a.closest('.pyp')) { a.click(); return; }
      doCommand(COMMANDS[cur].id);
    }
  }
  addEventListener('keydown', onKey, true);

  // ---------------------------------------------------------------- the frame loop and the view
  let last = performance.now(), bubbleWait = 6;
  function frame(now) {
    if (closed) return;
    // (a frame's timestamp can be a hair earlier than the clock read when the view came up: never step backwards)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = Math.max(last, now);
    for (const t of [...timers]) if ((t.t -= dt) <= 0) { timers.splice(timers.indexOf(t), 1); t.r(); }
    if (view) {
      view.update(dt);
      view.render();
      if (pot.water && (bubbleWait -= dt) < 0) { sfx('lava'); bubbleWait = 9 + Math.random() * 5; }
    }
    raf = requestAnimationFrame(frame);
  }
  const onResize = () => view?.resize();
  addEventListener('resize', onResize);

  const ready = (async () => {
    await null; // the handle below exists by the time this goes on
    if (mode !== 'none') {
      try {
        view = await createCauldronView(canvas, { mode: mode === 'hearth' ? 'hearth' : 'small', painting, moonwaterIcon: itemArt.moonwater });
      } catch (err) {
        console.error(err);
        el.classList.replace(`pyp--${mode}`, 'pyp--none');
        view = null;
      }
    }
    if (closed) { view?.dispose(); return handle; }
    // She lights the pot with witchfire: Witch Way's first step, done as she arrives
    if (view) {
      view.witch.play('cast');
      wait(0.6).then(() => { if (!closed) { view.cauldron.setFire(1); sfx('burn'); } });
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return handle;
  })();

  if (music !== null) audio.music(music);
  sfx('ui-open');
  say(pick(SAY.open));
  render();
  setTimeout(() => focusCurrent(), 30);

  function snapshot() {
    return { basket: { ...state.basket }, moonwater: state.moonwater, bag: { ...state.bag }, grimoire: state.grimoire };
  }
  function close() {
    if (closed) return;
    if (pot.water || pot.herbs.length) say(SAY.leaveHalf);
    closed = true;
    sfx('ui-close');
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onResize);
    clearTimeout(sayTimer);
    view?.dispose();
    el.remove();
    if (musicAfter !== undefined) audio.music(musicAfter);
    else if (ownAudio && music !== null) audio.music(null);
    try { onClose?.(snapshot()); } catch (e) { console.error(e); }
  }

  const handle = {
    el, ready, close, openGrimoire, mode,
    get view() { return view; },
    get state() { return snapshot(); },
    get pot() { return { ...pot, herbs: [...pot.herbs] }; },
    get busy() { return busy; },
    get layer() { return layer; },
    audio,
  };
  return handle;
}
