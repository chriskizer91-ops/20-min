/* Skies of Aethermoor — enhancement services. Everything works offline. */
(() => {
  'use strict';
  const defaults = {sound:true, music:true, volume:.65, musicVolume:.22, sensitivity:1, shake:.65, hudScale:1, tutorial:true};
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('aethermoor-enhanced-settings-v1') || '{}') || {}; } catch (_) {}
  const settings = {...defaults};
  for (const key of Object.keys(defaults)) if (typeof stored[key] === typeof defaults[key]) settings[key] = stored[key];
  for (const [key,min,max] of [['volume',0,1],['musicVolume',0,1],['sensitivity',.4,2],['shake',0,1],['hudScale',.85,1.3]]) settings[key] = Math.min(max,Math.max(min,settings[key]));
  const listeners = new Map();
  window.__aetherExplore = false;
  window.__aetherTargetPart = 'auto';
  window.__aetherRouteReward = 1;
  window.__aetherPerks = {reload:1,surgeRecharge:1,magnet:1};
  window.Aether = {
    game:null, settings,
    on(name,fn) { if (!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(fn); return () => listeners.get(name)?.delete(fn); },
    emit(name,detail={}) { for (const fn of listeners.get(name) || []) { try { fn(detail); } catch (error) { console.error('Aethermoor '+name,error); } } },
    saveSettings() { try { localStorage.setItem('aethermoor-enhanced-settings-v1',JSON.stringify(settings)); } catch (_) {} },
    startExplore() { if (!this.game) return; window.__aetherExplore=true; window.__aetherRouteReward=1; this.game.sail(this.game.progress.data.flying); },
    startVoyage() { if (!this.game) return; window.__aetherExplore=false; window.__aetherRouteReward=1; window.__aetherPerks={reload:1,surgeRecharge:1,magnet:1}; this.game.sail(this.game.progress.data.flying); },
    notify(message) { const node=document.getElementById('toast'); if (!node) return; node.textContent=message; node.classList.remove('on'); void node.offsetWidth; node.classList.add('on'); }
  };
  document.documentElement.style.setProperty('--a-hud-scale',String(settings.hudScale));
})();
