// settings-panel.js: the settings, from the start, in port or in flight (the gear button, or Esc). In flight the
// voyage waits while it's open. Sound and music and their volumes, how fast the mouse swings the view, how much the
// camera shakes, the size of the HUD, and the flight guide. Changes keep by themselves.
// (After the settings in the version of the game made with ChatGPT that Chris sent.)
import { settings, setSettings } from './settings.js';
import { on } from './events.js';

const SHOW = {
  volume: (x) => `${Math.round(x * 100)}%`, musicVolume: (x) => `${Math.round(x * 100)}%`, sensitivity: (x) => `${x.toFixed(1)}×`,
  shake: (x) => (x === 0 ? 'off' : `${Math.round(x * 100)}%`), hudScale: (x) => `${Math.round(x * 100)}%`,
};

// env: { pause(on), flying(), guideAgain(), testSound() }
export function makeSettingsPanel(env) {
  const $ = (id) => document.getElementById(id), box = $('settings');
  let paused = false, before = null;

  function fill() {
    for (const el of box.querySelectorAll('[data-set]')) {
      const k = el.dataset.set;
      if (el.type === 'checkbox') el.checked = !!settings[k]; else el.value = String(settings[k]);
    }
    for (const el of box.querySelectorAll('[data-show]')) el.textContent = SHOW[el.dataset.show](settings[el.dataset.show]);
  }
  function open() {
    if (!box.hidden) return;
    before = document.activeElement;
    if (document.pointerLockElement) document.exitPointerLock();
    paused = env.flying(); if (paused) env.pause(true);
    fill(); box.hidden = false; document.body.classList.add('settings-open');
    $('settings-done').focus({ preventScroll: true });
  }
  function close() {
    if (box.hidden) return;
    box.hidden = true; document.body.classList.remove('settings-open');
    if (paused) env.pause(false);
    paused = false;
    before?.focus?.({ preventScroll: true });
  }
  for (const b of document.querySelectorAll('[data-settings]')) b.addEventListener('click', open);
  $('settings-done').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  box.addEventListener('input', (e) => {
    const el = e.target.closest('[data-set]'); if (!el) return;
    setSettings({ [el.dataset.set]: el.type === 'checkbox' ? el.checked : Number(el.value) });
    fill();
  });
  $('settings-guide-again').addEventListener('click', () => { env.guideAgain(); setSettings({ guide: true }); fill(); $('settings-guide-again').textContent = 'The guide will show next time you fly'; });
  $('settings-test').addEventListener('click', () => env.testSound());
  // while it's open, Esc closes it, and the game doesn't see the keys (the sliders and Tab still work: stopping the
  // key on its way down doesn't stop what it does)
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }, true);
  // the HUD's size follows the setting
  const size = () => document.documentElement.style.setProperty('--hud', String(settings.hudScale));
  on('settings', size); size();

  return { open, close, get on() { return !box.hidden; } };
}
