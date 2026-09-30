// All the game's sound, made in code. Two libraries, both from the New-game repo:
//   Thareia's sound studio (vendor/thareia-sfx): 100+ effects, each levelled, for battle, magic, places, creatures
//   Aethermoor's synth (./synth.js): the music tracks (with the Wickhollow lullaby) and the per-speaker dialogue blips
// sfx(name) plays Thareia's sound of that name if it has one, else the synth's.
import { createAudio } from './synth.js';
import { sfxInit, playSfx, SFX } from '../../vendor/thareia-sfx/sounds.js';
import { MUSIC, musicPlay, musicStop } from '../../vendor/thareia-sfx/music.js';

const THAREIA = new Set(SFX.map((s) => s.id));
const PIECES = new Set(MUSIC.map((m) => m.id));

export function createSound() {
  const synth = createAudio();
  let ready = false, enabled = true, musicOn = true, wanted = null;
  // A track name in Thareia's music ('battle', 'marsh', 'ruins'...) plays that piece; any other name goes to the
  // synth ('wickhollow', 'victory'...). 'thareia:<id>' forces Thareia's.
  const sync = () => {
    const id = musicOn ? wanted : null;
    const t = id?.startsWith('thareia:') ? id.slice(8) : id;
    if (ready && t && PIECES.has(t) && !['victory', 'title'].includes(id)) {
      synth.music(null);
      try { musicPlay(t); } catch { /* ignore */ }
    } else {
      try { musicStop(); } catch { /* ignore */ }
      synth.music(id);
    }
  };
  return {
    unlock() {
      synth.unlock();
      const was = ready;
      try { sfxInit(); ready = true; } catch { /* no audio on this device */ }
      if (ready && !was) sync();
    },
    get enabled() { return enabled; },
    setEnabled(on) { enabled = !!on; synth.setEnabled(on); },
    setMusicEnabled(on) { musicOn = !!on; synth.setMusicEnabled(on); sync(); },
    music(track) { wanted = track; sync(); },
    duck(a, s) { synth.duck(a, s); },
    sfx(name, opts = {}) {
      if (!enabled) return;
      if (ready && THAREIA.has(name) && !opts.synth) {
        try { playSfx(name); } catch { /* never let sound break the game */ }
      } else synth.sfx(name, opts);
    },
    has: (name) => THAREIA.has(name),
  };
}
