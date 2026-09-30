// The one-page app: the witch up close, and walking in Wickhollow Square. The model is downloaded once and both
// views are built from it; the square is only built the first time you go there.
import { loadFonts } from './fonts.js';
import { loadModelBytes } from './loader.js';
import { startViewer } from './viewer.js';
import { startSquare } from './square.js';

const $ = (id) => document.getElementById(id);
let bytes = null, viewer = null, square = null, mode = 'viewer', switching = false;

// Keys belong to whichever view is showing (the square listens on the window)
addEventListener('keydown', (e) => { if (mode !== 'square') e.stopImmediatePropagation(); }, true);
addEventListener('keyup', (e) => { if (mode !== 'square') e.stopImmediatePropagation(); }, true);

async function show(next) {
  if (switching || next === mode) return;
  switching = true;
  try {
    if (next === 'square') {
      viewer.pause();
      $('viewer').hidden = true;
      $('square').hidden = false;
      mode = 'square';
      if (!square) {
        $('loading').classList.remove('done');
        $('load-text').textContent = 'Walking to the square…';
        await new Promise((r) => requestAnimationFrame(r));
        square = await startSquare(bytes);
        $('loading').classList.add('done');
      } else square.resume();
    } else {
      square?.pause();
      $('square').hidden = true;
      $('viewer').hidden = false;
      mode = 'viewer';
      viewer.resume();
    }
  } catch (err) {
    console.error(err);
    $('load-text').textContent = `That didn't work: ${err.message}`;
  } finally {
    switching = false;
  }
}

loadFonts();
loadModelBytes()
  .then(async (b) => {
    bytes = b;
    $('load-pick').hidden = true;
    $('load-text').textContent = 'Dressing her…';
    viewer = await startViewer(bytes);
    $('loading').classList.add('done');
    $('go-square').addEventListener('click', () => show('square'));
    $('btn-close').addEventListener('click', () => show('viewer'));
  })
  .catch((err) => {
    console.error(err);
    $('load-text').textContent = `She couldn't load: ${err.message}`;
  });
