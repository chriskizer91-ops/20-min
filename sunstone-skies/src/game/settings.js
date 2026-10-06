// settings.js: the player's own settings, kept in the browser apart from the Captain's save: sound and music and their
// volumes, how fast the mouse swings the view, how much the camera shakes, the size of the HUD, and whether the flight
// guide shows. (After the settings in the version of the game made with ChatGPT that Chris sent.)
import { emit } from './events.js';

const KEY = 'sunstone-skies:settings:1';
export const DEFAULTS = { sound: true, music: true, volume: 0.65, musicVolume: 0.5, sensitivity: 1, shake: 0.65, hudScale: 1, guide: true };
// the range each number can take (a saved value outside it is brought back inside)
export const RANGES = { volume: [0, 1], musicVolume: [0, 1], sensitivity: [0.4, 2], shake: [0, 1], hudScale: [0.85, 1.3] };

function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* no storage: the defaults */ }
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) out[k] = saved[k];
  for (const [k, [lo, hi]] of Object.entries(RANGES)) out[k] = Math.min(hi, Math.max(lo, out[k]));
  return out;
}

export const settings = load();

// change some settings, keep them, and tell whoever's listening (the sound, the HUD)
export function setSettings(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULTS) || typeof v !== typeof DEFAULTS[k]) continue;
    settings[k] = RANGES[k] ? Math.min(RANGES[k][1], Math.max(RANGES[k][0], v)) : v;
  }
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* no storage: they last this visit */ }
  emit('settings', { ...settings });
}
