
(function () {
  'use strict';
  let initialized = false;
  function init() {
    if (initialized || !window.Aether || !window.Aether.game) return;
    initialized = true;
    const A = window.Aether, game = A.game;
    const $ = id => document.getElementById(id);
    const roles = {
      skiff: ['Agile scout', 'Quick turns and climbs. Keep moving and trade shots with your bow guns.', 'Fast turns and climbs. Keep moving.'],
      cutter: ['Fast raider', 'Use your speed to choose the fight, then turn to bring three side guns to bear.', 'Choose your fight. Turn for broadsides.'],
      brig: ['Balanced broadside', 'Six guns on each side. Alternate broadsides while the other bank reloads.', 'Alternate sides while your guns reload.'],
      frigate: ['Heavy hunter', 'Ten side guns and a strong hull. Plan your turn early and make the broadside count.', 'Turn early. Make every broadside count.']
    };
    const number = n => Math.round(n).toLocaleString('en');
    const stats = [
      ['speed', 'Top speed', n => `${number(n)} km/h`, true],
      ['turn', 'Turning', n => `${n.toFixed(1)}°/s`, true],
      ['climb', 'Climbing', n => `${n.toFixed(1)} m/s`, true],
      ['hull', 'Hull', number, true],
      ['sails', 'Sails', number, true],
      ['crystals', 'Crystals', number, true],
      ['firepower', 'Firepower', n => `${n.toFixed(1)}/s`, true],
      ['reload', 'Side reload', n => `${n.toFixed(2)} s`, false]
    ];
    const stock = () => ({power: 0, mods: {armour: 0, canvas: 0, drill: 0, crystals: 0}});
    let inspected = game.progress.data.flying, activeTab = 'overview', compareKey = '', lastSignature = '';
    const ships = game.shipCatalog || [];
    const panel = $('port-panel');
    if (panel && ships.length && game.shipStats) {
      panel.classList.add('a-port-panel');
      const role = document.createElement('p');
      role.id = 'a-ship-role';
      $('pp-blurb').after(role);
      const tabs = document.createElement('nav');
      tabs.className = 'a-port-tabs';
      tabs.setAttribute('aria-label', 'Ship information');
      tabs.innerHTML = '<button type="button" data-tab="overview" aria-pressed="true">Overview</button><button type="button" data-tab="refit" aria-pressed="false">Refit & upgrades</button>';
      role.after(tabs);
      const overview = document.createElement('section');
      overview.id = 'a-port-overview';
      const heading = $('pp-stats').previousElementSibling;
      $('pp-stats').before(overview);
      if (heading && heading.tagName === 'H3') overview.append(heading);
      overview.append($('pp-stats'));
      const statNote = document.createElement('p');
      statNote.className = 'a-stat-note';
      statNote.textContent = 'Gold shows your configuration; pale bars show the stock ship.';
      overview.append(statNote);
      const compare = document.createElement('details');
      compare.className = 'a-compare';
      compare.innerHTML = '<summary>Compare ships</summary><label for="a-compare-ship">Compare this ship with</label><select id="a-compare-ship"></select><div id="a-compare-table"></div>';
      overview.append(compare);
      const refit = document.createElement('section');
      refit.id = 'a-port-refit';
      $('pp-own').before(refit);
      refit.append($('pp-own'));
      const hint = document.createElement('p');
      hint.className = 'a-port-buy-hint';
      hint.textContent = 'Preview each upgrade below. Purchases apply to this ship immediately.';
      $('pp-mods').before(hint);
      const powerValues = document.createElement('div');
      powerValues.id = 'a-power-preview';
      $('pp-power-note').after(powerValues);
      tabs.addEventListener('click', event => {
        const button = event.target.closest('button[data-tab]');
        if (!button || button.disabled) return;
        activeTab = button.dataset.tab;
        applyTab();
      });
      $('a-compare-ship').addEventListener('change', event => {
        compareKey = event.target.value;
        lastSignature = '';
        render();
      });
      function applyTab() {
        overview.hidden = activeTab !== 'overview';
        refit.hidden = activeTab !== 'refit';
        for (const button of tabs.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.tab === activeTab));
      }
      function deltaClass(before, after, moreIsBetter) {
        const delta = after - before;
        return Math.abs(delta) < 0.00001 ? 'a-neutral' : ((delta > 0) === moreIsBetter ? 'a-better' : 'a-worse');
      }
      function changedStats(before, after, keys) {
        return stats.filter(([key]) => keys.includes(key) && Math.abs(after[key] - before[key]) > 0.00001).map(([key, label, format, better]) => `<span class="a-upgrade-change ${deltaClass(before[key], after[key], better)}"><span>${label}</span><b>${format(before[key])} <i aria-hidden="true">→</i> ${format(after[key])}</b></span>`).join('');
      }
      const upgradeKeys = {armour: ['hull', 'speed'], canvas: ['sails', 'speed'], drill: ['reload', 'firepower'], crystals: ['crystals', 'climb']};
      function render() {
        const data = game.progress.data;
        inspected = $('port-ships').querySelector('[aria-pressed="true"]')?.dataset.ship || data.flying;
        const entry = data.ships[inspected], ship = ships.find(item => item.id === inspected);
        if (!entry || !ship) return;
        const signature = JSON.stringify([inspected, data.flying, data.shards, data.ships, compareKey]);
        if (signature === lastSignature) return;
        lastSignature = signature;
        const [roleName, tip, shortTip] = roles[inspected] || ['Airship', '', ''];
        role.innerHTML = `<b>${roleName}</b><span class="a-role-full">${tip}</span><span class="a-role-short">${shortTip}</span>`;
        const refitButton = tabs.querySelector('[data-tab="refit"]');
        refitButton.disabled = !entry.owned;
        if (!entry.owned && activeTab === 'refit') activeTab = 'overview';
        applyTab();
        const equipped = game.shipStats(inspected, entry);
        powerValues.innerHTML = `<span>Speed <b>${number(equipped.speed)} km/h</b></span><span>Side reload <b>${equipped.reload.toFixed(2)} s</b></span>`;
        for (const mod of $('pp-mods').querySelectorAll('.mod')) {
          const id = mod.dataset.mod, level = entry.mods[id];
          let preview = mod.querySelector('.a-upgrade-preview');
          if (!preview) { preview = document.createElement('div'); preview.className = 'a-upgrade-preview'; mod.append(preview); }
          const button = mod.querySelector('button');
          button.title = level >= 3 ? 'Fully upgraded' : `Buy ${mod.querySelector('b').firstChild.textContent.trim()}, level ${level + 1}`;
          if (level >= 3) {
            preview.innerHTML = '<span class="a-upgrade-complete">All three upgrades installed</span>';
            button.setAttribute('aria-label', `${id}: fully upgraded`);
          } else {
            const next = {power: entry.power, mods: {...entry.mods, [id]: level + 1}};
            const after = game.shipStats(inspected, next);
            const cost = game.upgradeCost(inspected, level);
            preview.innerHTML = changedStats(equipped, after, upgradeKeys[id] || []) + (data.shards < cost ? `<small class="a-upgrade-short">Need ◆ ${number(cost - data.shards)} more</small>` : '');
            button.setAttribute('aria-label', `Buy ${id} level ${level + 1} for ${cost} shards`);
          }
        }
        const compareSelect = $('a-compare-ship');
        const options = [{value: 'stock', label: `Stock ${ship.name}`}].concat(ships.filter(s => s.id !== inspected && data.ships[s.id]?.owned).map(s => ({value: s.id, label: `Your ${s.name}`})));
        if (!options.some(option => option.value === compareKey)) compareKey = data.flying !== inspected && options.some(option => option.value === data.flying) ? data.flying : 'stock';
        const optionSignature = options.map(option => `${option.value}:${option.label}`).join('|');
        if (compareSelect.dataset.signature !== optionSignature) {
          compareSelect.replaceChildren(...options.map(option => { const el = document.createElement('option'); el.value = option.value; el.textContent = option.label; return el; }));
          compareSelect.dataset.signature = optionSignature;
        }
        compareSelect.value = compareKey;
        const baseline = compareKey === 'stock' ? game.shipStats(inspected, stock()) : game.shipStats(compareKey, data.ships[compareKey]);
        const baselineName = compareKey === 'stock' ? 'Stock' : ships.find(s => s.id === compareKey)?.name || 'Other';
        $('a-compare-table').innerHTML = `<div class="a-compare-head"><span>Performance</span><b>${baselineName}</b><b>${ship.name}</b></div>` + stats.map(([key, label, format, higher]) => `<div class="a-compare-row"><span>${label}</span><b>${format(baseline[key])}</b><b class="${deltaClass(baseline[key], equipped[key], higher)}">${format(equipped[key])}</b></div>`).join('');
        for (const card of $('port-ships').querySelectorAll('button[data-ship]')) {
          const info = roles[card.dataset.ship];
          card.title = `${info?.[0] || card.dataset.ship}. ${info?.[1] || ''}`;
          card.setAttribute('aria-label', `${card.querySelector('b').textContent}, ${info?.[0] || ''}. ${card.querySelector('em').textContent}`);
          if (!card.querySelector('.a-ship-mark')) {
            const mark = document.createElement('span');
            mark.className = `a-ship-mark a-ship-${card.dataset.ship}`;
            mark.setAttribute('aria-hidden', 'true');
            mark.innerHTML = '<i></i><i></i><i></i>';
            card.prepend(mark);
          }
        }
      }
      let pending = false;
      function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; render(); }); } }
      const observer = new MutationObserver(schedule);
      observer.observe($('port-ships'), {subtree: true, attributes: true, attributeFilter: ['aria-pressed'], characterData: true, childList: true});
      observer.observe($('port-shards'), {subtree: true, characterData: true, childList: true});
      $('pp-power').addEventListener('input', schedule);
      $('pp-mods').addEventListener('click', schedule);
      $('btn-buy').addEventListener('click', schedule);
      game.progress.onLoad?.(schedule);
      A.on?.('mode', schedule);
      render();
    }
    // One settings dialog, available from port, title, pause, and flight.
    const access = document.createElement('button');
    access.id = 'a-settings-access'; access.type = 'button'; access.className = 'panel';
    access.innerHTML = '<span aria-hidden="true">⚙</span><span class="a-settings-label">Settings</span>';
    access.setAttribute('aria-label', 'Open settings'); access.title = 'Settings';
    document.body.append(access);
    const modal = document.createElement('section');
    modal.id = 'a-settings'; modal.hidden = true; modal.className = 'a-settings-backdrop';
    modal.innerHTML = `<div class="a-settings-card panel" role="dialog" aria-modal="true" aria-labelledby="a-settings-title">
      <div class="a-settings-heading"><div><span class="a-eyebrow">Make yourself comfortable</span><h2 id="a-settings-title">Settings</h2></div><button id="a-settings-close" class="plain" type="button" aria-label="Close settings">✕</button></div>
      <div class="a-settings-section"><h3>Audio</h3>
        <label class="a-setting-switch"><span>Sound effects<small>Cannons, impacts, wind and pickups</small></span><input type="checkbox" data-setting="sound"></label>
        <label class="a-setting-switch"><span>Music<small>Ambient accompaniment</small></span><input type="checkbox" data-setting="music"></label>
        <label class="a-setting-range"><span>Master volume<output data-output="volume"></output></span><input type="range" min="0" max="1" step="0.05" data-setting="volume" aria-label="Master volume"></label>
      </div>
      <div class="a-settings-section"><h3>Camera & display</h3>
        <label class="a-setting-range"><span>Camera sensitivity<output data-output="sensitivity"></output></span><input type="range" min="0.4" max="2" step="0.1" data-setting="sensitivity" aria-label="Camera sensitivity"></label>
        <label class="a-setting-range"><span>Camera shake<output data-output="shake"></output></span><input type="range" min="0" max="1" step="0.1" data-setting="shake" aria-label="Camera shake"></label>
        <label class="a-setting-range"><span>HUD text size<output data-output="hudScale"></output></span><input type="range" min="0.85" max="1.2" step="0.05" data-setting="hudScale" aria-label="HUD text size"></label>
        <label class="a-setting-switch"><span>Assisted tutorial<small>Show flight and combat tips</small></span><input type="checkbox" data-setting="tutorial"></label>
      </div>
      <p class="a-settings-note">Changes save automatically. Your voyage waits while settings are open.</p>
      <button id="a-settings-done" class="big" type="button">Done</button>
    </div>`;
    document.body.append(modal);
    let previousFocus = null, pausedBySettings = false;
    const labels = {volume: n => `${Math.round(n * 100)}%`, sensitivity: n => `${n.toFixed(1)}×`, shake: n => n === 0 ? 'Off' : `${Math.round(n * 100)}%`, hudScale: n => `${Math.round(n * 100)}%`};
    function settingsValues() {
      for (const input of modal.querySelectorAll('[data-setting]')) {
        const key = input.dataset.setting;
        if (input.type === 'checkbox') input.checked = !!A.settings[key]; else input.value = String(A.settings[key]);
      }
      for (const output of modal.querySelectorAll('[data-output]')) output.textContent = labels[output.dataset.output](Number(A.settings[output.dataset.output]));
      document.documentElement.style.setProperty('--a-hud-scale', A.settings.hudScale);
      document.body.classList.toggle('a-no-tutorial', !A.settings.tutorial);
    }
    function close() {
      if (modal.hidden) return;
      modal.hidden = true; document.body.classList.remove('a-settings-open');
      if (pausedBySettings && game.mode === 'voyage' && !game.waves.sunk) game.pause(false);
      pausedBySettings = false;
      previousFocus?.focus?.({preventScroll: true});
      A.emit?.('settingsClose', {});
    }
    function open() {
      if (!modal.hidden) return;
      previousFocus = document.activeElement;
      pausedBySettings = game.mode === 'voyage' && !game.paused && !game.waves.sunk;
      if (pausedBySettings) game.pause(true);
      if (document.pointerLockElement) document.exitPointerLock();
      settingsValues(); modal.hidden = false; document.body.classList.add('a-settings-open');
      $('a-settings-close').focus({preventScroll: true});
      A.emit?.('settingsOpen', {});
    }
    A.openSettings = open;
    A.closeSettings = close;
    access.addEventListener('click', open);
    $('a-settings-close').addEventListener('click', close);
    $('a-settings-done').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('input', event => {
      const input = event.target.closest('[data-setting]');
      if (!input) return;
      A.settings[input.dataset.setting] = input.type === 'checkbox' ? input.checked : Number(input.value);
      settingsValues(); A.saveSettings(); A.emit?.('settings', {...A.settings});
    });
    window.addEventListener('keydown', event => {
      if (modal.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); close();
      } else if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button, input, select, [tabindex]')].filter(el => !el.disabled && el.offsetParent !== null);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        event.stopPropagation();
      } else {
        // Prevent the underlying game's shortcuts from resuming flight beneath the dialog.
        event.stopImmediatePropagation();
      }
    }, true);
    settingsValues();
    A.emit?.('settings', {...A.settings});
  }
  document.addEventListener('aether:ready', init, {once: true});
  if (window.Aether?.game?.ready) init();
})();

