import { fonts } from '../assets.js';
import { createSound } from '../audio/sound.js';
import { createMapMode } from './mode.js';

// The airship demo: the Magpie flying over the painted valley at night, down the Sable from the witch's village to
// Bogmire (src/airship/mode.js, which the game uses too). Tap the map to fly somewhere, steer with the arrow keys, or
// pick a town and she flies there and sets down at its dock. Nettie is waiting at Bogmire's mast to climb aboard.

async function boot() {
  for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  const audio = createSound();
  const map = await createMapMode({ canvas: document.getElementById('stage'), audio, demo: true });
  document.body.classList.add('ready');
  const loop = (now) => { map.frame(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__airship = map;
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The map couldn't start: ${err.message}`; }
});
