
/* Skies of Aethermoor: a self-contained, gesture-unlocked Web Audio soundscape.
   No recordings or network requests. Combat is grouped into capped voices, so
   a large broadside stays powerful without overwhelming a phone's audio graph. */
(() => {
  'use strict';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function start() {
    const A = window.Aether;
    if (!A || A.audio) return;
    let ctx, master, effects, music, atmosphere, limiter, white, brown;
    let windGain, windFilter, airSource, brownSource, rigGain;
    let unlocked = false, failed = false, ticker, nextNote = 0, scoreStep = 0;
    let lastTick = 0, lastPick = 0, lastClick = 0, lastReload = 0, nextCreak = 0;
    let mode = A.game?.mode || 'title', paused = false, previousGun, gunStates = {};
    const voices = new Set();
    const MAX_VOICES = 28;
    let settings = { sound: true, music: true, volume: .65, ...A.settings };

    // All audio remains inaudible until a trusted pointer/key gesture unlocks it.
    async function unlock() {
      if (failed) return false;
      try {
        if (!ctx) createGraph();
        if (ctx.state === 'suspended') await ctx.resume();
        unlocked = ctx.state === 'running';
        if (unlocked) {
          applySettings();
          if (!ticker) ticker = setInterval(tick, 100);
        }
        return unlocked;
      } catch (_) {
        failed = true; // A denied/unavailable API must never break the game.
        return false;
      }
    }

    function createGraph() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable');
      ctx = new AudioContext({ latencyHint: 'interactive' });
      master = ctx.createGain(); master.gain.value = 0;
      effects = ctx.createGain(); effects.gain.value = .85;
      music = ctx.createGain(); music.gain.value = 0;
      atmosphere = ctx.createGain(); atmosphere.gain.value = .7;
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -17; limiter.knee.value = 15;
      limiter.ratio.value = 5; limiter.attack.value = .004; limiter.release.value = .2;
      effects.connect(limiter); music.connect(limiter); atmosphere.connect(limiter);
      limiter.connect(master); master.connect(ctx.destination);
      const length = Math.floor(ctx.sampleRate * 3);
      white = ctx.createBuffer(1, length, ctx.sampleRate);
      brown = ctx.createBuffer(1, length, ctx.sampleRate);
      const w = white.getChannelData(0), b = brown.getChannelData(0);
      let low = 0;
      for (let i = 0; i < length; i++) {
        w[i] = Math.random() * 2 - 1;
        low = (low + .02 * w[i]) / 1.02;
        b[i] = clamp(low * 3.2, -1, 1);
      }
      // Two softly filtered beds: moving air and the low wooden/rigging body.
      windGain = ctx.createGain(); windGain.gain.value = 0;
      windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass';
      windFilter.frequency.value = 900; windFilter.Q.value = .35;
      const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 150;
      airSource = ctx.createBufferSource(); airSource.buffer = white; airSource.loop = true;
      airSource.connect(high); high.connect(windFilter); windFilter.connect(windGain);
      windGain.connect(atmosphere); airSource.start();
      brownSource = ctx.createBufferSource(); brownSource.buffer = brown; brownSource.loop = true;
      const rigFilter = ctx.createBiquadFilter(); rigFilter.type = 'lowpass'; rigFilter.frequency.value = 110;
      rigGain = ctx.createGain(); rigGain.gain.value = 0;
      brownSource.connect(rigFilter); rigFilter.connect(rigGain); rigGain.connect(atmosphere);
      brownSource.start();
      nextNote = ctx.currentTime + .45;
      nextCreak = ctx.currentTime + 8;
      ctx.addEventListener?.('statechange', () => { unlocked = ctx.state === 'running'; });
    }

    function ramp(param, value, seconds = .12) {
      if (!ctx) return;
      param.cancelScheduledValues(ctx.currentTime);
      param.setTargetAtTime(value, ctx.currentTime, seconds);
    }

    function applySettings() {
      if (!ctx) return;
      const volume = clamp(Number(settings.volume ?? .65), 0, 1);
      ramp(master.gain, document.hidden ? 0 : volume, .06);
      const musicVolume = clamp(Number(settings.musicVolume ?? .55), 0, 1);
      ramp(music.gain, settings.music === false || paused || mode === 'photo' || settings.photo ? 0 : musicVolume * .46, .3);
      ramp(effects.gain, settings.sound === false ? 0 : paused ? .5 : .85, .12);
      ramp(atmosphere.gain, settings.sound === false ? 0 : .7, .12);
    }

    function setSettings(patch) {
      settings = { ...settings, ...A.settings, ...(patch || {}) };
      applySettings();
    }

    // A voice is a complete sound (often several oscillators), not one node.
    function voice(bus, pan = 0, priority = 1) {
      if (!ctx || !unlocked || document.hidden) return null;
      if (bus === music ? settings.music === false : settings.sound === false) return null;
      if (voices.size >= MAX_VOICES) {
        const victim = [...voices].find(v => v.priority <= priority);
        if (!victim) return null;
        victim.stop();
      }
      const out = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (panner.pan) panner.pan.value = clamp(pan, -.9, .9);
      out.connect(panner); panner.connect(bus);
      const nodes = [out, panner], sources = [];
      let dead = false, timer;
      const v = {
        out, nodes, sources, priority,
        finish(after) { timer = setTimeout(() => v.stop(), Math.max(0, after) * 1000 + 100); },
        stop() {
          if (dead) return;
          dead = true; clearTimeout(timer);
          for (const source of sources) { try { source.stop(); } catch (_) {} }
          for (const node of nodes) { try { node.disconnect(); } catch (_) {} }
          voices.delete(v);
        }
      };
      voices.add(v);
      return v;
    }

    function gainEnvelope(v, start, peak, attack, duration, release = .04) {
      const g = ctx.createGain(); v.nodes.push(g);
      g.gain.setValueAtTime(.0001, start);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), start + attack);
      g.gain.exponentialRampToValueAtTime(.0001, start + duration);
      g.connect(v.out);
      return g;
    }

    function tone(v, freq, start, duration, volume, type = 'sine', to = freq, attack = .008) {
      const o = ctx.createOscillator(); v.nodes.push(o); v.sources.push(o);
      o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), start);
      if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
      const g = gainEnvelope(v, start, volume, attack, duration);
      o.connect(g); o.start(start); o.stop(start + duration + .02);
      return o;
    }

    function noise(v, start, duration, volume, frequency, type = 'lowpass', q = .6, dark = false) {
      const source = ctx.createBufferSource(); source.buffer = dark ? brown : white;
      const filter = ctx.createBiquadFilter(); filter.type = type;
      filter.frequency.value = frequency; filter.Q.value = q;
      const g = gainEnvelope(v, start, volume, .005, duration);
      source.connect(filter); filter.connect(g);
      v.nodes.push(source, filter); v.sources.push(source);
      source.start(start, Math.random() * Math.max(.1, 2.8 - duration));
      source.stop(start + duration + .02);
      return filter;
    }

    function perspective(pos, owner) {
      const player = A.game?.player;
      if (!pos || !player?.pos || owner === 'player') return { pan: 0, gain: 1 };
      const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz, (pos.y || 0) - player.pos.y);
      const bearing = Math.atan2(dx, dz) - player.heading - (A.game?.cam?.yaw || 0);
      return { pan: Math.sin(bearing) * .8, gain: clamp(200 / (dist + 130), .12, .85) };
    }

    function cannon(d = {}) {
      const count = clamp(d.count || 1, 1, 24), side = /port|starboard/.test(d.bank || '');
      const p = perspective(d.pos, d.owner);
      if (d.owner === 'player' || !d.owner) p.pan = d.bank === 'port' ? -.35 : d.bank === 'starboard' ? .35 : 0;
      const v = voice(effects, p.pan, 3); if (!v) return;
      const t = ctx.currentTime + .002, scale = p.gain * (side ? .76 : .63);
      // Group the guns into a rolling volley. The low pressure wave glues it together.
      tone(v, side ? 72 : 92, t, side ? .9 : .58, scale * .58, 'sine', 28);
      noise(v, t, side ? 1.25 : .7, scale * .6, 330, 'lowpass', .5, true);
      const strikes = Math.min(count, 5);
      for (let i = 0; i < strikes; i++) {
        const at = t + i * (side ? .033 : .012) + Math.random() * .006;
        const amp = scale * (strikes > 2 ? .29 : .42);
        noise(v, at, .11 + Math.random() * .07, amp, 2400, 'lowpass');
        noise(v, at, .35, amp * .9, 420, 'lowpass', .5, true);
        tone(v, 120 + Math.random() * 35, at, .22, amp * .5, 'triangle', 45);
      }
      noise(v, t + .07, .75, scale * .15, 1400, 'bandpass', .45);
      v.finish(1.6);
    }

    function impact(d = {}) {
      const target = d.target || (d.owner === 'raider' ? 'player' : 'enemy');
      const p = perspective(d.at || d.pos, target === 'player' ? 'player' : 'enemy');
      const v = voice(effects, p.pan, 2); if (!v) return;
      const t = ctx.currentTime + .001;
      const amp = p.gain * (target === 'player' ? .9 : .52);
      if (d.part === 'crystals') {
        noise(v, t, .14, amp * .27, 3700, 'highpass');
        [1046, 1568, 2350, 2793].forEach((hz, i) => {
          tone(v, hz, t + i * .009, .45 - i * .035, amp * .08, 'sine');
        });
      } else if (d.part === 'sails') {
        const f = noise(v, t, .43, amp * .5, 2600, 'bandpass', .65);
        f.frequency.exponentialRampToValueAtTime(720, t + .4);
        tone(v, 135, t, .15, amp * .09, 'triangle', 70);
      } else {
        noise(v, t, .17, amp * .5, 950, 'lowpass');
        tone(v, 160, t, .24, amp * .44, 'triangle', 58);
        noise(v, t + .035, .25, amp * .3, 220, 'lowpass', .5, true);
      }
      v.finish(.65);
    }

    function surge() {
      const v = voice(effects, 0, 3); if (!v) return;
      const t = ctx.currentTime;
      const filter = noise(v, t, 1.65, .5, 240, 'bandpass', .5);
      filter.frequency.exponentialRampToValueAtTime(2100, t + .65);
      filter.frequency.exponentialRampToValueAtTime(700, t + 1.6);
      tone(v, 86, t, .65, .23, 'sine', 172, .08);
      [293.66, 440, 587.33].forEach((hz, i) => tone(v, hz, t + .12 + .035 * i, 1.25, .07, 'sine', hz * 1.005, .15));
      v.finish(1.85);
    }

    function pickup(d = {}) {
      if (!ctx || ctx.currentTime - lastPick < .085) return;
      lastPick = ctx.currentTime;
      const v = voice(effects, (Math.random() - .5) * .3, 1); if (!v) return;
      const t = ctx.currentTime, notes = [74, 77, 81, 84, 86];
      const n = notes[Math.floor(Math.random() * notes.length)];
      tone(v, midi(n), t, .34, .14, 'sine');
      tone(v, midi(n + 12), t + .012, .2, .038, 'sine');
      v.finish(.4);
    }

    function sink(d = {}) {
      const p = perspective(d.enemy?.f?.pos || d.pos, 'enemy');
      const v = voice(effects, p.pan, 3); if (!v) return;
      const t = ctx.currentTime, amp = p.gain;
      noise(v, t, 1.8, .55 * amp, 450, 'lowpass', .5, true);
      tone(v, 95, t, 1.4, .6 * amp, 'sine', 26, .01);
      noise(v, t, .4, .55 * amp, 1900, 'lowpass');
      for (let i = 0; i < 4; i++) {
        tone(v, 220 + i * 70, t + .18 + i * .08, .4, .1 * amp, 'triangle', 45);
      }
      v.finish(2);
    }

    function wave(d = {}) {
      const v = voice(effects, 0, 2); if (!v) return;
      const t = ctx.currentTime;
      // A short low bell cue that announces danger without masking aim sounds.
      [50, 57, 62].forEach((n, i) => tone(v, midi(n), t + i * .13, 1.1, .12, 'sine'));
      v.finish(1.5);
    }

    function click() {
      if (!ctx || ctx.currentTime - lastClick < .055) return;
      lastClick = ctx.currentTime;
      const v = voice(effects, 0, 0); if (!v) return;
      tone(v, 720, ctx.currentTime, .065, .072, 'sine', 430);
      v.finish(.1);
    }

    function reload() {
      if (!ctx || ctx.currentTime - lastReload < .4) return;
      lastReload = ctx.currentTime;
      const v = voice(effects, 0, 0); if (!v) return;
      tone(v, 370, ctx.currentTime, .085, .03, 'triangle');
      tone(v, 555, ctx.currentTime + .035, .11, .023, 'sine');
      v.finish(.18);
    }

    function creak(turn = 0) {
      const v = voice(atmosphere, clamp(turn * .4, -.6, .6), 0); if (!v) return;
      const t = ctx.currentTime, f = 120 + Math.random() * 80;
      tone(v, f, t, .9, .021, 'triangle', f * .73, .19);
      const filter = noise(v, t, .8, .035, 240, 'bandpass', 2.2, true);
      filter.frequency.linearRampToValueAtTime(160, t + .75);
      v.finish(1.1);
    }

    // A restrained original score: spacious D-minor/add-nine plucks over soft
    // open fifths. It leaves the midrange free for cannon and damage feedback.
    const melody = [74, null, 81, null, 77, null, 76, null,
                    74, null, 72, null, 69, null, null, null,
                    77, null, 81, null, 84, null, 81, null,
                    79, null, 76, null, 74, null, null, null];
    const harmony = [[50, 57, 65], [46, 53, 62], [53, 60, 69], [48, 55, 64]];
    function score(at) {
      const fighting = mode === 'voyage' && A.game?.waves?.state === 'fight';
      const step = scoreStep++ % melody.length;
      if (step % 8 === 0) {
        const pad = voice(music, (step % 16 ? .12 : -.12), 0);
        if (pad) {
          harmony[Math.floor(step / 8)].forEach((n, i) => {
            tone(pad, midi(n), at + i * .06, 8.2, .07, 'sine', midi(n) * .999, 1.1);
            tone(pad, midi(n + 12), at + i * .06, 6.5, .009, 'triangle', midi(n + 12), .8);
          });
          pad.finish(8.5 + Math.max(0, at - ctx.currentTime));
        }
      }
      const note = melody[step];
      if (note !== null) {
        const v = voice(music, Math.sin(step * 1.7) * .25, 0);
        if (v) {
          tone(v, midi(note), at, 2.2, fighting ? .075 : .09, 'sine', midi(note), .018);
          tone(v, midi(note + 12), at, .75, .014, 'sine', midi(note + 12), .01);
          tone(v, midi(note), at + .24, 1.7, .028, 'sine', midi(note), .025);
          v.finish(2.6 + Math.max(0, at - ctx.currentTime));
        }
      }
      return fighting ? 1.16 : 1.48;
    }

    function tick() {
      if (!ctx || !unlocked || document.hidden) return;
      const t = ctx.currentTime, dt = Math.min(.3, Math.max(0, t - lastTick)); lastTick = t;
      mode = A.game?.mode || mode; paused = !!A.game?.paused;
      const player = A.game?.player;
      const quiet = paused || mode === 'photo' || settings.photo;
      const flying = mode === 'voyage' && !quiet && !player?.down;
      const speed = flying ? clamp((player?.speed || 0) / Math.max(1, player?.H?.vmax || 50), 0, 1.7) : 0;
      const gust = 1 + Math.sin(t * .37) * .08 + Math.sin(t * .73) * .025;
      ramp(windGain.gain, quiet ? 0 : flying ? (.025 + .045 * speed) * gust : mode === 'port' ? .008 : .004, .45);
      ramp(windFilter.frequency, 520 + speed * 1550 + (player?.surge?.on > 0 ? 500 : 0), .5);
      ramp(rigGain.gain, quiet ? 0 : flying ? .028 + speed * .018 : .004, .5);
      if (flying && t > nextCreak && settings.sound !== false) {
        nextCreak = t + 7 + Math.random() * 9;
        creak(player?.turn || 0);
      }
      // A unobtrusive readiness cue when a gun bank completes its reload.
      const gun = A.game?.gunnery;
      if (gun !== previousGun) { previousGun = gun; gunStates = {}; }
      if (flying && gun?.ready) {
        let finished = false;
        for (const bank of Object.keys(gun.ready)) {
          const value = gun.ready[bank];
          if (gunStates[bank] > 0 && value <= 0 && gun.count(bank) > 0) finished = true;
          gunStates[bank] = value;
        }
        if (finished) reload();
      }
      if (!quiet && settings.music !== false) {
        if (nextNote < t - .1) nextNote = t + .1;
        if (nextNote < t + .22) nextNote += score(nextNote);
      } else nextNote = t + .3;
      // Smooth state changes even when pause/mode is toggled by the base game.
      if (dt) {
        const desiredMusic = settings.music === false || quiet ? 0 : clamp(Number(settings.musicVolume ?? .55), 0, 1) * .46;
        music.gain.setTargetAtTime(desiredMusic, t, .3);
      }
    }

    function detail(value) { return value?.detail ?? value ?? {}; }
    const listen = (name, fn) => A.on(name, value => {
      if (unlocked && settings.sound !== false && !document.hidden) fn(detail(value));
    });
    listen('shot', cannon); listen('hit', impact); listen('sunk', sink);
    listen('shards', pickup); listen('surge', surge); listen('wave', wave);
    listen('course:checkpoint', () => pickup());
    listen('course:start', () => {
      const v = voice(effects, 0, 1); if (!v) return;
      const t = ctx.currentTime;
      [69, 74, 81].forEach((n, i) => tone(v, midi(n), t + i * .09, .38, .08));
      v.finish(.65);
    });
    listen('course:finish', () => {
      const v = voice(effects, 0, 2); if (!v) return;
      const t = ctx.currentTime;
      [74, 77, 81, 86].forEach((n, i) => tone(v, midi(n), t + i * .13, .9, .09));
      v.finish(1.5);
    });
    listen('waypoint:arrived', () => {
      const v = voice(effects, 0, 1); if (!v) return;
      tone(v, midi(74), ctx.currentTime, .7, .08);
      tone(v, midi(81), ctx.currentTime + .14, .8, .065);
      v.finish(1.1);
    });
    A.on('mode', value => { mode = detail(value).mode || A.game?.mode || mode; applySettings(); });
    A.on('pause', value => { paused = !!detail(value).paused; applySettings(); });
    A.on('settings', value => setSettings(detail(value)));

    document.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    document.addEventListener('keydown', event => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) unlock();
    }, { passive: true, capture: true });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button, [role="button"]');
      if (button && !button.disabled && !/btn-fire|btn-surge/.test(button.id)) click();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      applySettings();
      if (!ctx) return;
      if (document.hidden) {
        for (const v of [...voices]) v.stop();
        ctx.suspend().catch(() => {});
      } else {
        // Resuming an already unlocked context is permitted by the browser.
        ctx.resume().then(() => { nextNote = ctx.currentTime + .3; applySettings(); }).catch(() => {});
      }
    });
    A.audio = {
      unlock, setSettings,
      get available() { return !failed && !!(window.AudioContext || window.webkitAudioContext); },
      get unlocked() { return unlocked; },
      get activeVoices() { return voices.size; },
      // A settings-panel preview, useful without requiring a fight.
      preview() { if (unlocked) { click(); pickup(); } },
      stop() {
        clearInterval(ticker); ticker = null;
        for (const v of [...voices]) v.stop();
        if (ctx) { ramp(master.gain, 0); ctx.suspend().catch(() => {}); }
      }
    };
  }
  if (window.Aether?.game?.ready) start();
  else document.addEventListener('aether:ready', start, { once: true });
})();

