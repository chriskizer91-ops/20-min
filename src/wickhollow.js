import { createWickhollow } from './areas/wickhollow.js';
import { bootTown } from './town.js';

// The Wickhollow demo (wickhollow.html): the witch's village as its own page (docs/SLICE.md, screens 1 to 4). The
// screens and their casts are src/areas/wickhollow.js, shared with the game; here nothing carries over between visits
// and nothing leads out of town. The demo starts inside, like the game.
const area = createWickhollow({ game: false, state: (name, defaults) => defaults, flags: {} });

bootTown({ screens: area.screens, start: 'cottage-inside', images: area.images, footsteps: 'step-stone' }).then(() => {
  window.__wick = { R: area.R, G: area.G };
}).catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});
