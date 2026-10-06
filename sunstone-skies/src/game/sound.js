// sound.js: the game's sound and music, all made in code with the browser's Web Audio, so there are no recordings and
// it works with no internet:
//   wind over the ship, louder the faster she flies, and the low creak of her timbers and rigging
//   broadsides as a rolling volley (one sound for the whole volley, not one per gun), bow and stern guns sharper
//   hits that sound like what they hit: a thud for the hull, tearing for the sails, a crystal ring for the crystals
//   a raider going down, the four abilities, a quiet click when a battery has reloaded, a low bell when raiders come in
//   a little fanfare for a new level and a finished voyage, and chimes for the flight courses (explore)
//   a quiet score in D minor that picks up its pace in a fight
// Browsers keep a page silent until the player clicks or presses a key, so it starts then. Sounds far off are quieter
// and come from their side. At most 28 sounds play at once (a big broadside mustn't swamp the rest), and the oldest,
// least important gives way. (Rewritten from the sound in the version of the game made with ChatGPT that Chris sent.)
import { on } from './events.js';
import { settings } from './settings.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MAX_VOICES = 28;

// env: { mode() ('title' | 'port' | 'flight' | 'photo'), paused(), player(), gunnery(), cam, fighting(), surging() }
export function makeSound(env) {
  let ctx = null, master, effects, music, air, limiter, white, brown, windGain, windFilter, rigGain;
  let unlocked = false, failed = false, ticker = null, nextNote = 0, step = 0, lastTick = 0, nextCreak = 0;
  let lastClick = 0, lastReload = 0, lastChime = 0, gunWas = {};
  const voices = new Set();

  async function unlock() {
    if (failed || unlocked) return unlocked;
    try {
      if (!ctx) build();
      if (ctx.state === 'suspended') await ctx.resume();
      unlocked = ctx.state === 'running';
      if (unlocked) { apply(); ticker ??= setInterval(tick, 100); }
    } catch { failed = true; } // no Web Audio (or not allowed): the game plays on, silent
    return unlocked;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no Web Audio');
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = 0;
    effects = ctx.createGain(); music = ctx.createGain(); music.gain.value = 0; air = ctx.createGain();
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -17; limiter.knee.value = 15; limiter.ratio.value = 5; limiter.attack.value = 0.004; limiter.release.value = 0.2;
    for (const bus of [effects, music, air]) bus.connect(limiter);
    limiter.connect(master); master.connect(ctx.destination);
    // three seconds of white noise, and a darker "brown" noise made from it: the stuff of wind, timber and cannon
    const n = Math.floor(ctx.sampleRate * 3);
    white = ctx.createBuffer(1, n, ctx.sampleRate); brown = ctx.createBuffer(1, n, ctx.sampleRate);
    const w = white.getChannelData(0), b = brown.getChannelData(0);
    for (let i = 0, low = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; low = (low + 0.02 * w[i]) / 1.02; b[i] = clamp(low * 3.2, -1, 1); }
    // two beds that play all the time, turned up and down as she flies: moving air, and her timbers
    windGain = ctx.createGain(); windGain.gain.value = 0;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 900; windFilter.Q.value = 0.35;
    const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 150;
    const wind = ctx.createBufferSource(); wind.buffer = white; wind.loop = true;
    wind.connect(high); high.connect(windFilter); windFilter.connect(windGain); windGain.connect(air); wind.start();
    const timber = ctx.createBufferSource(); timber.buffer = brown; timber.loop = true;
    const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 110;
    rigGain = ctx.createGain(); rigGain.gain.value = 0;
    timber.connect(lowpass); lowpass.connect(rigGain); rigGain.connect(air); timber.start();
    nextNote = ctx.currentTime + 0.45; nextCreak = ctx.currentTime + 8;
    ctx.addEventListener?.('statechange', () => { unlocked = ctx.state === 'running'; });
  }

  function ramp(param, value, seconds = 0.12) {
    if (!ctx) return;
    param.cancelScheduledValues(ctx.currentTime);
    param.setTargetAtTime(value, ctx.currentTime, seconds);
  }
  const quiet = () => env.paused() || env.mode() === 'photo';
  function apply() {
    if (!ctx) return;
    ramp(master.gain, document.hidden ? 0 : settings.volume, 0.06);
    ramp(music.gain, !settings.music || quiet() ? 0 : settings.musicVolume * 0.46, 0.3);
    ramp(effects.gain, !settings.sound ? 0 : env.paused() ? 0.5 : 0.85, 0.12);
    ramp(air.gain, !settings.sound ? 0 : 0.7, 0.12);
  }

  // one sound (often several oscillators and noises together), and what plays it
  function voice(bus, pan = 0, priority = 1) {
    if (!ctx || !unlocked || document.hidden) return null;
    if (bus === music ? !settings.music : !settings.sound) return null;
    if (voices.size >= MAX_VOICES) {
      const victim = [...voices].find((v) => v.priority <= priority);
      if (!victim) return null;
      victim.stop();
    }
    const out = ctx.createGain(), panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) panner.pan.value = clamp(pan, -0.9, 0.9);
    out.connect(panner); panner.connect(bus);
    let dead = false, timer = null;
    const v = {
      out, nodes: [out, panner], sources: [], priority,
      finish(after) { timer = setTimeout(() => v.stop(), Math.max(0, after) * 1000 + 100); },
      stop() {
        if (dead) return;
        dead = true; clearTimeout(timer);
        for (const s of v.sources) { try { s.stop(); } catch { /* already stopped */ } }
        for (const nd of v.nodes) { try { nd.disconnect(); } catch { /* already gone */ } }
        voices.delete(v);
      },
    };
    voices.add(v);
    return v;
  }
  function envelope(v, start, peak, attack, duration) {
    const g = ctx.createGain(); v.nodes.push(g);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    g.connect(v.out);
    return g;
  }
  function tone(v, freq, start, duration, volume, type = 'sine', to = freq, attack = 0.008) {
    const o = ctx.createOscillator(); v.nodes.push(o); v.sources.push(o);
    o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), start);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    o.connect(envelope(v, start, volume, attack, duration)); o.start(start); o.stop(start + duration + 0.02);
    return o;
  }
  function noise(v, start, duration, volume, frequency, type = 'lowpass', q = 0.6, dark = false) {
    const src = ctx.createBufferSource(); src.buffer = dark ? brown : white;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = q;
    src.connect(f); f.connect(envelope(v, start, volume, 0.005, duration));
    v.nodes.push(src, f); v.sources.push(src);
    src.start(start, Math.random() * Math.max(0.1, 2.8 - duration)); src.stop(start + duration + 0.02);
    return f;
  }

  // how loud, and from which side, a sound at this point is heard on the Captain's deck
  function heard(pos, mine) {
    const P = env.player();
    if (!pos || !P || mine) return { pan: 0, gain: 1 };
    const dx = pos.x - P.pos.x, dz = pos.z - P.pos.z, d = Math.hypot(dx, dz, pos.y - P.pos.y);
    const bearing = Math.atan2(dx, dz) - P.heading - env.cam.yaw;
    return { pan: -Math.sin(bearing) * 0.8, gain: clamp(200 / (d + 130), 0.12, 0.85) };
  }

  function cannon({ owner, battery, count = 1, pos }) {
    const mine = owner === 'player', side = battery === 'port' || battery === 'starboard', p = heard(pos, mine);
    if (mine) p.pan = battery === 'port' ? -0.35 : battery === 'starboard' ? 0.35 : 0;
    const v = voice(effects, p.pan, mine ? 3 : 2); if (!v) return;
    const t = ctx.currentTime + 0.002, k = p.gain * (side ? 0.76 : 0.63);
    // the guns of a volley go off one after another, glued together by one low thump
    tone(v, side ? 72 : 92, t, side ? 0.9 : 0.58, k * 0.58, 'sine', 28);
    noise(v, t, side ? 1.25 : 0.7, k * 0.6, 330, 'lowpass', 0.5, true);
    const strikes = Math.min(clamp(count, 1, 24), 5);
    for (let i = 0; i < strikes; i++) {
      const at = t + i * (side ? 0.033 : 0.012) + Math.random() * 0.006, amp = k * (strikes > 2 ? 0.29 : 0.42);
      noise(v, at, 0.11 + Math.random() * 0.07, amp, 2400);
      noise(v, at, 0.35, amp * 0.9, 420, 'lowpass', 0.5, true);
      tone(v, 120 + Math.random() * 35, at, 0.22, amp * 0.5, 'triangle', 45);
    }
    noise(v, t + 0.07, 0.75, k * 0.15, 1400, 'bandpass', 0.45);
    v.finish(1.6);
  }
  function impact({ target, part, at }) {
    const onMe = target === 'player', p = heard(at, onMe);
    const v = voice(effects, p.pan, 2); if (!v) return;
    const t = ctx.currentTime + 0.001, amp = p.gain * (onMe ? 0.9 : 0.52);
    if (part === 'crystals') {
      noise(v, t, 0.14, amp * 0.27, 3700, 'highpass');
      [1046, 1568, 2350, 2793].forEach((hz, i) => tone(v, hz, t + i * 0.009, 0.45 - i * 0.035, amp * 0.08));
    } else if (part === 'sails') {
      noise(v, t, 0.43, amp * 0.5, 2600, 'bandpass', 0.65).frequency.exponentialRampToValueAtTime(720, t + 0.4);
      tone(v, 135, t, 0.15, amp * 0.09, 'triangle', 70);
    } else {
      noise(v, t, 0.17, amp * 0.5, 950);
      tone(v, 160, t, 0.24, amp * 0.44, 'triangle', 58);
      noise(v, t + 0.035, 0.25, amp * 0.3, 220, 'lowpass', 0.5, true);
    }
    v.finish(0.65);
  }
  function sink({ pos, shards }) {
    const p = heard(pos, false), v = voice(effects, p.pan, 3); if (!v) return;
    const t = ctx.currentTime, amp = p.gain;
    noise(v, t, 1.8, 0.55 * amp, 450, 'lowpass', 0.5, true);
    tone(v, 95, t, 1.4, 0.6 * amp, 'sine', 26, 0.01);
    noise(v, t, 0.4, 0.55 * amp, 1900);
    for (let i = 0; i < 4; i++) tone(v, 220 + i * 70, t + 0.18 + i * 0.08, 0.4, 0.1 * amp, 'triangle', 45);
    v.finish(2);
    if (shards) chime([74, 81], 0.5); // shards into the hold
  }
  // a few bright notes, for good news (shards, a ring passed, a new level)
  function chime(notes, delay = 0, gap = 0.09, length = 0.38, vol = 0.08) {
    if (!ctx || ctx.currentTime - lastChime < 0.08) return;
    lastChime = ctx.currentTime;
    const v = voice(effects, 0, 1); if (!v) return;
    const t = ctx.currentTime + delay;
    notes.forEach((n, i) => { tone(v, midi(n), t + i * gap, length, vol); tone(v, midi(n + 12), t + i * gap + 0.012, length * 0.5, vol * 0.25); });
    v.finish(delay + notes.length * gap + length + 0.2);
  }
  function ability({ id }) {
    const v = voice(effects, 0, 3); if (!v) return;
    const t = ctx.currentTime;
    if (id === 'surge') { // a rush of wind, rising, and a bright chord
      const f = noise(v, t, 1.65, 0.5, 240, 'bandpass', 0.5);
      f.frequency.exponentialRampToValueAtTime(2100, t + 0.65); f.frequency.exponentialRampToValueAtTime(700, t + 1.6);
      tone(v, 86, t, 0.65, 0.23, 'sine', 172, 0.08);
      [293.66, 440, 587.33].forEach((hz, i) => tone(v, hz, t + 0.12 + 0.035 * i, 1.25, 0.07, 'sine', hz * 1.005, 0.15));
      v.finish(1.85);
    } else if (id === 'double') { // the loaders racing: quick knocks of iron
      for (let i = 0; i < 6; i++) { noise(v, t + i * 0.07, 0.06, 0.22, 3200, 'bandpass', 1.4); tone(v, 420 - i * 20, t + i * 0.07, 0.07, 0.05, 'triangle', 300); }
      v.finish(0.7);
    } else if (id === 'control') { // the crew at work: hammers on timber
      [0, 0.22, 0.38, 0.62, 0.78].forEach((d) => { noise(v, t + d, 0.09, 0.3, 700, 'lowpass', 0.8, true); tone(v, 190, t + d, 0.12, 0.12, 'triangle', 120); });
      v.finish(1.1);
    } else if (id === 'ward') { // a ring of crystal light: a shimmering chord that swells and fades
      [62, 69, 74, 78].forEach((n, i) => tone(v, midi(n), t + i * 0.05, 1.6, 0.06, 'sine', midi(n) * 1.004, 0.25));
      noise(v, t, 1.2, 0.08, 5200, 'highpass');
      v.finish(1.9);
    }
  }
  function bell() {
    const v = voice(effects, 0, 2); if (!v) return;
    [50, 57, 62].forEach((n, i) => tone(v, midi(n), ctx.currentTime + i * 0.13, 1.1, 0.12));
    v.finish(1.5);
  }
  function click() {
    if (!ctx || ctx.currentTime - lastClick < 0.055) return;
    lastClick = ctx.currentTime;
    const v = voice(effects, 0, 0); if (!v) return;
    tone(v, 720, ctx.currentTime, 0.065, 0.072, 'sine', 430);
    v.finish(0.1);
  }
  function reloaded() {
    if (!ctx || ctx.currentTime - lastReload < 0.4) return;
    lastReload = ctx.currentTime;
    const v = voice(effects, 0, 0); if (!v) return;
    tone(v, 370, ctx.currentTime, 0.085, 0.03, 'triangle'); tone(v, 555, ctx.currentTime + 0.035, 0.11, 0.023);
    v.finish(0.18);
  }
  function creak(turn) {
    const v = voice(air, clamp(turn * 0.4, -0.6, 0.6), 0); if (!v) return;
    const t = ctx.currentTime, f = 120 + Math.random() * 80;
    tone(v, f, t, 0.9, 0.021, 'triangle', f * 0.73, 0.19);
    noise(v, t, 0.8, 0.035, 240, 'bandpass', 2.2, true).frequency.linearRampToValueAtTime(160, t + 0.75);
    v.finish(1.1);
  }

  // the score: soft plucked notes in D minor over slow open fifths, leaving room for the guns
  const MELODY = [74, null, 81, null, 77, null, 76, null, 74, null, 72, null, 69, null, null, null,
    77, null, 81, null, 84, null, 81, null, 79, null, 76, null, 74, null, null, null];
  const HARMONY = [[50, 57, 65], [46, 53, 62], [53, 60, 69], [48, 55, 64]];
  function score(at) {
    const fighting = env.fighting(), s = step++ % MELODY.length;
    if (s % 8 === 0) {
      const pad = voice(music, s % 16 ? 0.12 : -0.12, 0);
      if (pad) {
        HARMONY[Math.floor(s / 8)].forEach((n, i) => {
          tone(pad, midi(n), at + i * 0.06, 8.2, 0.07, 'sine', midi(n) * 0.999, 1.1);
          tone(pad, midi(n + 12), at + i * 0.06, 6.5, 0.009, 'triangle', midi(n + 12), 0.8);
        });
        pad.finish(8.5 + Math.max(0, at - ctx.currentTime));
      }
    }
    const note = MELODY[s];
    if (note !== null) {
      const v = voice(music, Math.sin(s * 1.7) * 0.25, 0);
      if (v) {
        tone(v, midi(note), at, 2.2, fighting ? 0.075 : 0.09, 'sine', midi(note), 0.018);
        tone(v, midi(note + 12), at, 0.75, 0.014, 'sine', midi(note + 12), 0.01);
        tone(v, midi(note), at + 0.24, 1.7, 0.028, 'sine', midi(note), 0.025);
        v.finish(2.6 + Math.max(0, at - ctx.currentTime));
      }
    }
    return fighting ? 1.16 : 1.48; // seconds to the next step
  }

  // ten times a second: the wind and timbers follow the ship, the reload click, the next notes of the score
  function tick() {
    if (!ctx || !unlocked || document.hidden) return;
    const t = ctx.currentTime, dt = Math.min(0.3, Math.max(0, t - lastTick)); lastTick = t;
    const P = env.player(), still = quiet(), flying = env.mode() === 'flight' && !still && P && !P.down;
    const speed = flying ? clamp(P.speed / Math.max(1, P.H.vmax), 0, 1.7) : 0, gust = 1 + Math.sin(t * 0.37) * 0.08 + Math.sin(t * 0.73) * 0.025;
    ramp(windGain.gain, still ? 0 : flying ? (0.025 + 0.045 * speed) * gust : env.mode() === 'port' ? 0.008 : 0.004, 0.45);
    ramp(windFilter.frequency, 520 + speed * 1550 + (env.surging() ? 500 : 0), 0.5);
    ramp(rigGain.gain, still ? 0 : flying ? 0.028 + speed * 0.018 : 0.004, 0.5);
    if (flying && t > nextCreak && settings.sound) { nextCreak = t + 7 + Math.random() * 9; creak(P.turn); }
    const G = env.gunnery();
    if (flying && G) {
      let done = false;
      for (const b of Object.keys(G.ready)) { if (gunWas[b] > 0 && G.ready[b] <= 0 && G.count(b) > 0) done = true; gunWas[b] = G.ready[b]; }
      if (done) reloaded();
    }
    if (!still && settings.music) {
      if (nextNote < t - 0.1) nextNote = t + 0.1;
      if (nextNote < t + 0.22) nextNote += score(nextNote);
    } else nextNote = t + 0.3;
    if (dt) music.gain.setTargetAtTime(!settings.music || still ? 0 : settings.musicVolume * 0.46, t, 0.3);
  }

  const heardOnly = (fn) => (d) => { if (unlocked && settings.sound && !document.hidden) fn(d); };
  on('shot', heardOnly(cannon));
  on('hit', heardOnly(impact));
  on('sunk', heardOnly(sink));
  on('ability', heardOnly(ability));
  on('wave', heardOnly(bell));
  on('level', heardOnly(() => chime([69, 74, 78, 81], 0, 0.13, 0.9, 0.09)));
  on('voyage', heardOnly(() => chime([62, 66, 69, 74, 78], 0, 0.16, 1.1, 0.09)));
  on('course', heardOnly((d) => (d.what === 'start' ? chime([69, 74, 81]) : d.what === 'ring' ? chime([74 + (d.ring % 4) * 2]) : chime([74, 77, 81, 86], 0, 0.13, 0.9, 0.09))));
  on('waypoint', heardOnly((d) => (d.what === 'reached' ? chime([74, 81], 0, 0.14, 0.75) : click())));
  on('aim', heardOnly(click));
  on('power', heardOnly(click));
  for (const name of ['mode', 'pause', 'settings']) on(name, apply);

  document.addEventListener('pointerdown', unlock, { passive: true, capture: true });
  document.addEventListener('keydown', (e) => { if (!e.ctrlKey && !e.metaKey && !e.altKey) unlock(); }, { passive: true, capture: true });
  document.addEventListener('click', (e) => { if (e.target.closest?.('button') && !e.target.closest('button').disabled && unlocked && settings.sound) click(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    apply();
    if (!ctx) return;
    if (document.hidden) { for (const v of [...voices]) v.stop(); ctx.suspend().catch(() => {}); }
    else ctx.resume().then(() => { nextNote = ctx.currentTime + 0.3; apply(); }).catch(() => {});
  });

  return {
    unlock,
    get available() { return !failed && !!(window.AudioContext || window.webkitAudioContext); },
    get unlocked() { return unlocked; },
    get voices() { return voices.size; },
    test() { if (unlocked) { click(); chime([74, 81]); } }, // a sound to hear the volume by, from the settings
  };
}
