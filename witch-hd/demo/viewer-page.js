// viewer.html: the HD witch up close
import { loadFonts } from './fonts.js';
import { loadModelBytes } from './loader.js';
import { startViewer } from './viewer.js';

const $ = (id) => document.getElementById(id);
loadFonts();
loadModelBytes()
  .then((bytes) => { $('load-pick').hidden = true; $('load-text').textContent = 'Dressing her…'; return startViewer(bytes); })
  .then(() => $('loading').classList.add('done'))
  .catch((err) => {
    console.error(err);
    $('load-text').textContent = `She couldn't load: ${err.message}`;
  });
