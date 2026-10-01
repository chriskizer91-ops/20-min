// The title demo (title.html): the title screen and the four cut-scenes (src/title/mode.js, which the game uses too).
// New game plays the Opening, Story plays any of the four, and Sound switches sound and music on and off.
import { createTitleMode } from './mode.js';
import { createSound } from '../audio/sound.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  const audio = createSound();
  const title = await createTitleMode({ canvas: $('stage'), audio });
  const loop = () => { title.frame(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  document.body.classList.add('ready');
  // For tests and screenshots
  window.__title = {
    get state() { return title.state; },
    scenes: title.scenes,
    begin: title.begin,
    choose: title.choose,
    play: title.playScene,
    advance: title.advance,
    skip: title.skip,
    escape: title.escape,
    set auto(on) { title.auto = on; },
    get auto() { return title.auto; },
    to: title.to,
  };
}

boot().catch((err) => {
  console.error(err);
  const box = $('error');
  box.hidden = false;
  box.textContent = `The title screen couldn't start: ${err.message}`;
});
