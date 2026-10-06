// guide.js: the flight guide, a few tips the first time the Captain flies, each moving on by itself once it's been
// done (turning, the sails, looking round, firing, the crystal power), or with Next. It can be closed, turned off in
// the settings, and shown again from there. (After the flight guide in the version of the game made with ChatGPT
// that Chris sent.)
import { on } from './events.js';
import { settings } from './settings.js';

const DONE = 'sunstone-skies:guide:1';
const LESSONS = [
  ['Take the helm', 'A and D turn her. Space climbs and Shift dives. The bigger the ship, the slower she answers.'],
  ['Set your sails', 'W sets more sail and S takes it in. Slower, she turns tighter: good for lining up a broadside.'],
  ['Bring the guns to bear', 'Click the sky, then move the mouse to look round her: the guns facing where you look are the ones that fire. Esc lets the mouse go.'],
  ['Choose where to hit', 'Click or F fires. On a raider the guns lock on and lead her. T chooses what to aim at: her hull sinks her for full pay, her sails slow her, her crystals bring her down fastest but the loot shatters.'],
  ['Power and the rest', 'R shifts the crystal power to the sails or the guns. Z, X, V and B are your abilities once your skills unlock them. O is the photo camera, M the map, Esc the settings.'],
];

// env: { player(), cam, flying() }
export function makeGuide(env) {
  const $ = (id) => document.getElementById(id), box = $('guide');
  let step = -1, since = 0, sail0 = 0.5, done = false;
  try { done = localStorage.getItem(DONE) === '1'; } catch { /* no storage */ }

  function show(i) {
    step = i; since = 0; sail0 = env.player()?.sail ?? 0.5;
    if (i >= LESSONS.length) { box.hidden = true; done = true; try { localStorage.setItem(DONE, '1'); } catch { /* no storage */ } return; }
    box.hidden = false;
    $('guide-n').textContent = `Flight guide ${i + 1} of ${LESSONS.length}`;
    $('guide-title').textContent = LESSONS[i][0]; $('guide-text').textContent = LESSONS[i][1];
    $('guide-next').textContent = i === LESSONS.length - 1 ? 'Ready to fly' : 'Next tip →';
  }
  const next = () => show(step + 1);
  $('guide-next').addEventListener('click', next);
  $('guide-close').addEventListener('click', () => show(LESSONS.length));
  on('shot', (d) => { if (d.owner === 'player' && step === 3 && since > 1.5) next(); });
  on('aim', () => { if (step === 3 && since > 1.5) next(); });
  on('power', () => { if (step === 4) next(); });
  on('settings', () => { if (!settings.guide) box.hidden = true; });

  // every frame in flight: start the guide on the first flight, and see whether the tip has been done
  function update(dt) {
    if (!env.flying()) { if (!box.hidden) box.hidden = true; return; }
    if (step < 0 && !done && settings.guide) show(0);
    if (step < 0 || step >= LESSONS.length || !settings.guide) return;
    if (box.hidden) box.hidden = false;
    since += dt;
    const P = env.player();
    if (since < 1.8 || !P) return;
    if ((step === 0 && Math.abs(P.turn) > 0.25) || (step === 1 && Math.abs(P.sail - sail0) > 0.1) || (step === 2 && Math.abs(env.cam.yaw) > 0.25)) next();
  }
  // from the settings: the guide again, from the top
  function again() { done = false; try { localStorage.removeItem(DONE); } catch { /* no storage */ } step = -1; }

  return { update, again, show, get step() { return step; } };
}
