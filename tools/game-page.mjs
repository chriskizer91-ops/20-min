// Writes game.html, the whole game's page: tools/game-shell.html, with one <template> per screen of the game taken
// from the demo page that screen grew up on, so the game and its demos share one look:
//   title    title.html     the title screen and the cut-scenes (its canvas becomes #cut-stage: the game's WebGL
//                           canvas is #stage, shared by the field, the battles and the map)
//   field    bogmire.html   the painted screens: place names, talk, the basket, Hag-Sight (the fullest field page)
//   battle   battle.html    the battle screen (without the demo's fight picker; its result box has one button)
//   map      airship.html   the Magpie over the map (with a "Go ashore" button on the town card)
// Each template's <style> comes with it, and only the screen on show is in the page, so their ids and rules never
// meet. The game's own additions (src/game/) are in the shell. tools/build.mjs runs this first.
//
//   node tools/game-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

function page(file) {
  const html = readFileSync(file, 'utf8');
  const body = html.slice(html.indexOf('<!-- PAGE -->') + 13, html.indexOf('<!-- /PAGE -->'));
  const style = body.match(/<style>([\s\S]*?)<\/style>/)[1];
  const markup = body.slice(body.indexOf('</style>') + 8).replace(/<title>[\s\S]*?<\/title>/, '').trim();
  return { style, markup };
}

// Each edit is [what, with]; a missing `what` stops the build, so a demo page's change can't quietly break the game
function edit(text, edits, where) {
  for (const [what, to] of edits) {
    const hit = typeof what === 'string' ? text.includes(what) : what.test(text);
    if (!hit) throw new Error(`game-page: ${where} has no ${what}`);
    text = text.replace(what, to);
  }
  return text;
}

const MODES = {
  title: {
    from: 'title.html',
    style: [[/#stage/g, '#cut-stage']],
    markup: [[/<canvas id="stage"/, '<canvas id="cut-stage"'], [/<p id="error" hidden><\/p>/, '']],
  },
  field: {
    from: 'bogmire.html',
    style: [],
    markup: [
      [/<canvas id="stage"[^>]*><\/canvas>/, ''],
      [/<div id="fade"[^>]*><\/div>/, ''],
      [/<p id="error" hidden><\/p>/, ''],
      [/<section id="encounter"[\s\S]*?<\/section>/, ''],
      ['<button id="btn-sound" aria-pressed="true">Sound on</button>', '<button id="btn-sound" aria-pressed="true">Sound on</button>\n  <button id="btn-menu" aria-haspopup="dialog" title="The party and their things (M)">Menu</button>'],
    ],
  },
  battle: {
    from: 'battle.html',
    style: [],
    markup: [
      [/<canvas id="stage"[^>]*><\/canvas>/, ''],
      [/<button id="btn-fights"[^>]*>Fights<\/button>/, ''],
      [/<section id="picker"[\s\S]*?<\/section>/, ''],
      [/<div class="row">[\s\S]*?<\/div>/, '<div class="row"><button id="result-go" type="button">Carry on</button></div>'],
    ],
  },
  map: {
    from: 'airship.html',
    style: [],
    markup: [
      [/<canvas id="stage"[^>]*><\/canvas>/, ''],
      [/<p id="error" hidden><\/p>/, ''],
      ['<button id="btn-takeoff" class="go" type="button">Take off</button>', '<button id="btn-takeoff" class="go" type="button">Take off</button>\n      <button id="btn-ashore" class="go" type="button" hidden>Go ashore</button>'],
    ],
  },
};

export function gamePage() {
  let shell = readFileSync('tools/game-shell.html', 'utf8');
  for (const [name, M] of Object.entries(MODES)) {
    const p = page(M.from);
    const style = edit(p.style, M.style, `${M.from}'s style`);
    const markup = edit(p.markup, M.markup, M.from);
    const extraStyle = shell.match(new RegExp(`<!-- STYLE ${name} -->([\\s\\S]*?)<!-- /STYLE ${name} -->`))?.[1] ?? '';
    const extraMarkup = shell.match(new RegExp(`<!-- MARKUP ${name} -->([\\s\\S]*?)<!-- /MARKUP ${name} -->`))?.[1] ?? '';
    const template = `<template id="mode-${name}"><style>/* from ${M.from} */${style}${extraStyle}</style>\n${markup}\n${extraMarkup.trim()}\n</template>`;
    shell = shell.replace(`<!-- MODE ${name} -->`, template);
  }
  // the extras have gone into their templates
  shell = shell.replace(/<!-- (STYLE|MARKUP) (\w+) -->[\s\S]*?<!-- \/\1 \2 -->\n?/g, '');
  writeFileSync('game.html', shell);
  return shell;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = gamePage();
  console.log(`game.html  ${(html.length / 1e3).toFixed(0)} kB`);
}
