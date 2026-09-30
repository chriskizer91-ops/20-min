// The cut-scene player, FF9-style: each beat is a painting under a slow camera move, dissolving into the next.
// Narration is a centred caption; spoken lines go in the dialogue box with the speaker's name and portrait,
// typed out letter by letter in their blip voice. Tap, Space or Enter moves on (the first tap finishes the
// typing). With Auto on, a line moves on by itself once it has had time to be read: about as long as a slow
// reader needs, and no longer.
import { STILLS, PORTRAITS, PIXEL_PORTRAITS } from './art.js';
import { SPEAKERS } from './scenes.js';
import { stillShot, blackShot } from './screen.js';
import { grimoireShot } from './grimoire.js';

const TYPE_SPEED = 40; // letters a second for spoken lines, as in the field's dialogue box
const NARRATE_SPEED = 34; // narration types a little slower, and without a voice
const FADE = 1.4; // seconds for one painting to dissolve into the next
const FIRST_LINE = 0.9; // seconds a new painting shows before its first line
const DEBOUNCE = 0.3; // a tap this soon after a new beat is ignored, so a double tap can't skip a whole beat
const MIN_BEAT = 7; // with Auto, a painting stays at least this long (a beat's `min` can ask for more), so a
                    // short line doesn't cut its camera move off halfway

// How long a line stays up after it's typed, with Auto on: a second to settle, then about 20 letters a second
const readTime = (text) => Math.max(1.8, 1 + text.length * 0.05);

const $ = (id) => document.getElementById(id);

export function createPlayer({ screen, images, titleShot, audio, music, reduced, onCard, onEnd }) {
  let P = null; // the scene playing: { scene, beat, index, line, shown, typing, waitAt, lineAt, beatAt }
  let auto = true;

  const caption = $('caption'), talk = $('talk');

  function panTime(beat) {
    // The camera move lasts about as long as the beat will, so it's still easing when the next one comes
    const lines = beat.lines ?? [];
    const t = FIRST_LINE + lines.reduce((a, l) => a + l.say.length / (l.who ? TYPE_SPEED : NARRATE_SPEED) + readTime(l.say) + 0.3, 0);
    return Math.max(9, (beat.min ?? MIN_BEAT) + 1.5, t * 1.15);
  }

  function shotFor(beat, now) {
    if (beat.still === 'title') return titleShot;
    if (beat.still === 'grimoire') return grimoireShot(beat.from, beat.to, now, panTime(beat), reduced);
    const info = STILLS[beat.still];
    return stillShot(images.get(beat.still), info, beat.from, beat.to, now, panTime(beat), reduced);
  }

  function start(scene, now) {
    P = { scene, index: -1, beatAt: now, ended: false };
    hideText();
    // The title dissolves to night, then the first painting comes up out of it
    screen.push(blackShot, 0.8, now);
    P.startAt = now + 0.7;
    images.warm(scene.beats.slice(0, 2).map((b) => b.still));
  }

  function beatStart(i, now) {
    const beat = P.scene.beats[i];
    P.index = i;
    P.beat = beat;
    P.line = -1;
    P.typing = false;
    P.text = null;
    P.who = null;
    P.waitAt = null;
    P.beatAt = now;
    P.lineAt = beat.lines ? now + FIRST_LINE : null;
    P.holdUntil = beat.lines ? null : now + (beat.hold ?? 5);
    hideText();
    // The drawn page is dark round the edges already; the caption needs no scrim there, and it would grey the page
    document.body.classList.toggle('bare', beat.still === 'grimoire');
    if (beat.music) music(beat.music);
    if (beat.sfx) audio.sfx(beat.sfx);
    screen.push(shotFor(beat, now), beat.card ? 1.8 : (i === 0 ? 1.6 : FADE), now);
    if (beat.card) onCard?.();
    const next = P.scene.beats[i + 1];
    if (next) images.warm([next.still]);
  }

  function showLine(j, now, typed = false) {
    const line = P.beat.lines[j];
    P.line = j;
    P.text = line.say;
    P.shown = typed ? line.say.length : 0;
    P.typing = !typed;
    P.waitAt = typed ? now : null;
    P.lineAt = null;
    const who = line.who ? SPEAKERS[line.who] : null;
    P.who = who;
    $('sr-line').textContent = who ? `${who.name}: ${line.say}` : line.say;
    if (line.sfx) audio.sfx(line.sfx);
    if (who?.sfx) audio.sfx(who.sfx);
    if (who) {
      caption.hidden = true;
      document.body.classList.remove('captioned');
      talk.hidden = false;
      $('talk-name').textContent = who.name;
      const face = PORTRAITS[line.who]?.[line.face ?? 'calm'];
      const img = $('talk-face');
      talk.classList.toggle('faceless', !face);
      if (face) { img.src = face; img.classList.toggle('pixel', PIXEL_PORTRAITS.has(face)); }
      // restart the box's little rise each time the speaker changes
      if (talk.dataset.who !== line.who) { talk.dataset.who = line.who; talk.classList.remove('rise'); void talk.offsetWidth; talk.classList.add('rise'); }
    } else {
      talk.hidden = true;
      talk.dataset.who = '';
      caption.hidden = false;
      document.body.classList.add('captioned');
      caption.classList.remove('rise'); void caption.offsetWidth; caption.classList.add('rise');
    }
    render();
  }

  // Draw the typed text: the rest of the line is laid out but invisible, so words don't jump to the next
  // line as they're typed, and a centred caption doesn't slide about.
  function render() {
    const box = P.who ? $('talk-text') : caption;
    box.querySelector('.shown').textContent = P.text.slice(0, Math.floor(P.shown));
    box.querySelector('.rest').textContent = P.text.slice(Math.floor(P.shown));
    const done = !P.typing;
    $('talk-more').hidden = !(done && P.who);
    caption.querySelector('.more').hidden = !(done && !P.who);
  }

  function hideText() {
    caption.hidden = true;
    talk.hidden = true;
    talk.dataset.who = '';
    document.body.classList.remove('captioned');
  }

  function next(now) {
    const lines = P.beat.lines ?? [];
    if (P.line + 1 < lines.length) return showLine(P.line + 1, now);
    if (P.index + 1 < P.scene.beats.length) return beatStart(P.index + 1, now);
    finish(now);
  }

  // The scene is over: back to the title (after the Opening, it's already showing, as the title card)
  function finish(now) {
    if (!P || P.ended) return;
    P.ended = true;
    hideText();
    document.body.classList.remove('bare');
    if (!P.beat?.card) screen.push(titleShot, 1.2, now);
    music('title');
    const scene = P.scene;
    P = null;
    onEnd?.(scene);
  }

  return {
    get playing() { return !!P; },
    get auto() { return auto; },
    set auto(on) { auto = !!on; if (P?.waitAt) P.waitAt = performance.now() / 1000; },
    start,
    // Tap, Space or Enter
    advance(now) {
      if (!P || P.index < 0 || now - P.beatAt < DEBOUNCE) return;
      if (P.lineAt != null) return showLine(0, now, true); // before the first line: show it whole
      if (P.typing) { P.shown = P.text.length; P.typing = false; P.waitAt = now; render(); return; }
      next(now);
    },
    skip(now) { if (P) finish(now); },
    // Straight to a beat, for screenshots
    jump(i, now) { if (P && P.scene.beats[i]) beatStart(i, now); },
    update(dt, now) {
      if (!P) return;
      if (P.index < 0) { if (now >= P.startAt) beatStart(0, now); return; }
      if (P.lineAt != null && now >= P.lineAt) showLine(0, now);
      if (P.typing) {
        const before = Math.floor(P.shown);
        P.shown = Math.min(P.text.length, P.shown + dt * (P.who ? TYPE_SPEED : NARRATE_SPEED));
        const shown = Math.floor(P.shown);
        if (shown !== before) {
          // a blip on every other letter, in the speaker's voice (field.js does the same)
          if (P.who?.pitch && shown % 2 === 0 && /\w/.test(P.text[shown - 1] ?? '')) audio.sfx('blip', { pitch: P.who.pitch });
          if (shown >= P.text.length) { P.typing = false; P.waitAt = now; }
          render();
        }
      }
      if (!auto) return;
      if (P.holdUntil && now >= P.holdUntil) return next(now);
      if (P.waitAt && !P.typing && now - P.waitAt >= readTime(P.text)) {
        const last = P.line + 1 >= (P.beat.lines?.length ?? 0);
        if (!last || now - P.beatAt >= (P.beat.min ?? MIN_BEAT)) next(now);
      }
    },
    // For the page's test handle
    get state() {
      if (!P) return null;
      return {
        scene: P.scene.id, beat: P.index, beats: P.scene.beats.length, still: P.beat?.still ?? null, card: !!P.beat?.card,
        line: P.line, speaker: P.who?.name ?? null, text: P.text ?? null, typing: !!P.typing,
      };
    },
  };
}
