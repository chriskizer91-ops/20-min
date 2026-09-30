// square.html: Wickhollow Square with the HD witch
import { loadModelBytes } from './loader.js';
import { startSquare } from './square.js';

const $ = (id) => document.getElementById(id);
loadModelBytes()
  .then((bytes) => { $('load-pick').hidden = true; $('load-text').textContent = 'Dressing her…'; return startSquare(bytes); })
  .then(() => $('loading').classList.add('done'))
  .catch((err) => {
    console.error(err);
    $('load-text').textContent = `The scene couldn't start: ${err.message}`;
  });
