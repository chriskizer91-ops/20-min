
/* The captain's firing board. This layer observes the game and only changes
   the chosen aim point; cannon arcs, collisions and damage stay in the game. */
(() => {
  'use strict';
  const banks = ['bow', 'port', 'starboard', 'stern'];
  const bankLabels = {bow: 'Bow', stern: 'Stern', port: 'Port', starboard: 'Starboard'};
  const parts = ['auto', 'hull', 'sails', 'crystals'];
  const partLabels = {auto: 'Auto', hull: 'Hull', sails: 'Sails', crystals: 'Crystals'};
  const clamp = value => Math.max(0, Math.min(1, value));
  let started = false;

  function start() {
    if (started || !window.Aether?.game) return;
    started = true;
    const A = window.Aether;
    const game = A.game;
    const hud = document.getElementById('hud');
    if (!hud) return;
    window.__aetherTargetPart = 'auto';

    const board = document.createElement('section');
    board.id = 'aether-guns';
    board.className = 'ac-card';
    board.setAttribute('aria-label', 'Gun banks and selected target component');
    board.innerHTML = `<header class="ac-board-head"><span>Batteries</span><b id="ac-bank-state">Bow ready</b></header>
      <div class="ac-battery-map">
        <svg class="ac-ship" viewBox="0 0 48 94" aria-hidden="true"><path d="M24 3C14 16 8 28 8 47L11 78Q24 91 37 78L40 47C40 28 34 16 24 3Z"/><path class="ac-ship-deck" d="M24 18V78M12 45H36M15 66H33M17 30H31"/><circle cx="24" cy="49" r="5"/></svg>
        ${banks.map(bank => `<div class="ac-bank" data-bank="${bank}"><span class="ac-bank-label">${bank === 'starboard' ? '<span class="ac-long-bank">Starboard</span><span class="ac-short-bank">Stbd</span>' : bankLabels[bank]}</span><b class="ac-bank-count">—</b><span class="ac-bank-track"><i></i></span><small class="ac-bank-time">Ready</small></div>`).join('')}
      </div>
      <div class="ac-part-picker" role="group" aria-label="Aim at a ship component">
        ${parts.map(part => `<button type="button" data-aim="${part}" aria-pressed="${part === 'auto'}" title="${part === 'auto' ? 'Automatic aim point' : `Aim at ${part}`} (T cycles)">${partLabels[part]}</button>`).join('')}
      </div>
      <button id="ac-part-cycle" type="button" title="Change component target">Aim: <b>Auto</b><span> ↻</span></button>`;
    hud.append(board);

    const targetPanel = document.createElement('section');
    targetPanel.id = 'aether-target';
    targetPanel.className = 'ac-card';
    targetPanel.hidden = true;
    targetPanel.setAttribute('aria-label', 'Selected enemy ship');
    targetPanel.innerHTML = `<header class="ac-target-head"><div><span id="ac-target-kind">Target locked</span><b id="ac-target-name"></b></div><span id="ac-target-distance"></span></header>
      <div class="ac-target-health">${parts.slice(1).map(part => `<div class="ac-health-row" data-part="${part}"><span>${partLabels[part]}</span><div class="ac-health-track"><i></i></div><b>100%</b></div>`).join('')}</div>
      <p id="ac-target-effect"></p>`;
    hud.append(targetPanel);

    const reticleStatus = document.createElement('p');
    reticleStatus.id = 'aether-fire-status';
    reticleStatus.setAttribute('aria-live', 'off');
    hud.append(reticleStatus);
    const confirm = document.createElement('div');
    confirm.id = 'aether-hit-confirm';
    confirm.innerHTML = `<svg viewBox="-25 -25 50 50" aria-hidden="true"><path d="M-18 -18l8 8M18 -18l-8 8M-18 18l8-8M18 18l-8-8"/></svg><span></span>`;
    confirm.setAttribute('aria-hidden', 'true');
    hud.append(confirm);

    const bankNodes = Object.fromEntries([...board.querySelectorAll('[data-bank]')].map(node => [node.dataset.bank, {
      node, count: node.querySelector('.ac-bank-count'), track: node.querySelector('i'), time: node.querySelector('small')
    }]));
    const aimButtons = [...board.querySelectorAll('[data-aim]')];
    const cycleLabel = board.querySelector('#ac-part-cycle b');
    const bankState = board.querySelector('#ac-bank-state');
    const targetName = targetPanel.querySelector('#ac-target-name');
    const targetKind = targetPanel.querySelector('#ac-target-kind');
    const targetDistance = targetPanel.querySelector('#ac-target-distance');
    const targetEffect = targetPanel.querySelector('#ac-target-effect');
    const healthNodes = Object.fromEntries([...targetPanel.querySelectorAll('[data-part]')].map(node => [node.dataset.part, {
      node, bar: node.querySelector('i'), value: node.querySelector('b')
    }]));
    let externalVisible = true;
    let lastUpdate = 0;
    let lastHitAt = -1e9;
    let hitPart = '';
    let hitCount = 0;
    let hitDamage = 0;
    let lastPulse = -1e9;
    let previousTarget = null;

    function choose(part) {
      if (!parts.includes(part)) return;
      window.__aetherTargetPart = part;
      aimButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.aim === part)));
      cycleLabel.textContent = partLabels[part];
      A.emit?.('target-part', {part});
      lastUpdate = 0;
    }
    function cycle() {
      choose(parts[(parts.indexOf(window.__aetherTargetPart) + 1) % parts.length]);
    }
    board.addEventListener('click', event => {
      const button = event.target.closest('[data-aim]');
      if (button) choose(button.dataset.aim);
      else if (event.target.closest('#ac-part-cycle')) cycle();
    });
    board.addEventListener('pointerdown', event => event.stopPropagation());
    document.addEventListener('keydown', event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || /input|textarea|select/i.test(event.target.tagName)) return;
      if (event.key.toLowerCase() === 't' && game.mode === 'voyage' && !game.paused && !document.body.classList.contains('exploring')) {
        event.preventDefault();
        cycle();
      }
    });
    // Add this control to the existing keyboard reference without changing input.
    const help = document.querySelector('#help dl');
    if (help) {
      const term = document.createElement('dt');
      const meaning = document.createElement('dd');
      term.textContent = 'T';
      meaning.textContent = 'aim at hull, sails, or crystals';
      help.append(term, meaning);
    }

    function targetPoint(target) {
      const part = window.__aetherTargetPart;
      if (!target || part === 'auto' || !parts.includes(part)) return null;
      const zones = part === 'hull' ? [target.zones?.hullBox] : target.zones?.[part];
      if (!zones?.length || !target.ship?.body) return null;
      target.ship.body.updateWorldMatrix(true, false);
      // Prefer the middle mast/crystal cluster: it gives a clear, stable point
      // and avoids swinging the aim between components as the camera moves.
      const usable = zones.filter(box => box && !box.isEmpty());
      if (!usable.length) return null;
      const zone = usable[Math.floor((usable.length - 1) / 2)];
      return zone.getCenter(target.f.pos.clone()).applyMatrix4(target.ship.body.matrixWorld);
    }

    A.combat = {choose, cycle, targetPoint, get part() {return window.__aetherTargetPart;}, setVisible(value) {externalVisible = Boolean(value); lastUpdate = 0;}};
    A.on?.('hit', detail => {
      if (detail?.owner !== 'player') return;
      const now = performance.now();
      if (hitPart !== detail.part || now - lastHitAt > 180) {hitPart = detail.part; hitCount = 0; hitDamage = 0;}
      hitCount += 1;
      hitDamage += Number(detail.damage) || 0;
      lastHitAt = now;
      confirm.querySelector('span').textContent = `${partLabels[detail.part] || 'Ship'} hit${hitCount > 1 ? ` ×${hitCount}` : ''} · ${Math.round(hitDamage)}`;
      confirm.dataset.part = detail.part;
      confirm.classList.add('ac-confirm-visible');
      if (now - lastPulse > 85 && !A.settings?.reducedMotion) {
        confirm.classList.remove('ac-confirm-pulse');
        void confirm.offsetWidth;
        confirm.classList.add('ac-confirm-pulse');
        lastPulse = now;
      }
    });

    function update(now) {
      requestAnimationFrame(update);
      if (now - lastUpdate < 100) return;
      lastUpdate = now;
      const visible = externalVisible && game.mode === 'voyage' && !game.paused && !game.waves.sunk && !document.body.classList.contains('exploring') && !document.body.classList.contains('explore-photo');
      board.hidden = !visible;
      reticleStatus.hidden = !visible;
      confirm.hidden = !visible;
      if (!visible || !game.player || !game.gunnery) {targetPanel.hidden = true; return;}
      const gun = game.gunnery;
      const active = game.bank || 'bow';
      const target = game.locked && !game.locked.f.down ? game.locked : null;
      const part = window.__aetherTargetPart;
      for (const bank of banks) {
        const {node, count, track, time} = bankNodes[bank];
        const number = gun.count(bank);
        const remaining = Math.max(0, gun.ready[bank]);
        const fill = number ? clamp(1 - remaining / Math.max(.001, gun.reload(bank))) : 0;
        node.classList.toggle('ac-active', active === bank);
        node.classList.toggle('ac-empty', !number);
        node.classList.toggle('ac-loaded', number > 0 && remaining <= .01);
        count.textContent = String(number);
        track.style.transform = `scaleX(${fill})`;
        time.textContent = !number ? 'No guns' : remaining > .01 ? `${remaining.toFixed(1)}s` : 'Ready';
        node.setAttribute('aria-label', `${bankLabels[bank]}: ${number} gun${number === 1 ? '' : 's'}, ${time.textContent}${active === bank ? ', selected' : ''}`);
      }
      const hasGuns = gun.count(active) > 0;
      const reload = Math.max(0, gun.ready[active]);
      const outOfRange = target && game.inRange === false;
      bankState.textContent = `${bankLabels[active]} ${!hasGuns ? 'unarmed' : reload > .01 ? `${reload.toFixed(1)}s` : 'ready'}`;
      board.dataset.state = !hasGuns ? 'empty' : reload > .01 ? 'loading' : 'ready';
      let status;
      if (!hasGuns) status = `No ${bankLabels[active].toLowerCase()} guns · turn your ship`;
      else if (outOfRange) status = 'Out of reach · close the distance';
      else if (reload > .01) status = `${bankLabels[active]} reloading · ${reload.toFixed(1)}s`;
      else status = target ? `${bankLabels[active]} ready · ${part === 'auto' ? 'target locked' : partLabels[part].toLowerCase() + ' targeted'}` : `${bankLabels[active]} ready`;
      reticleStatus.textContent = status;
      reticleStatus.dataset.state = outOfRange || !hasGuns ? 'far' : reload > .01 ? 'loading' : target ? 'locked' : 'ready';
      targetPanel.hidden = !target;
      if (target) {
        targetName.textContent = target.R.name || target.R.cls;
        targetKind.textContent = `${target.captain ? 'Raider captain' : target.role === 'prize' ? 'Treasure ship' : target.R.cls} · ${outOfRange ? 'out of reach' : 'locked'}`;
        targetDistance.textContent = `${Math.round(target.f.pos.distanceTo(game.player.pos)).toLocaleString()} m`;
        for (const component of parts.slice(1)) {
          const {node, bar, value} = healthNodes[component];
          const fraction = clamp(target.f.frac(component));
          bar.style.transform = `scaleX(${fraction})`;
          value.textContent = `${Math.round(fraction * 100)}%`;
          node.classList.toggle('ac-selected', component === part);
          node.classList.toggle('ac-depleted', fraction <= .01);
        }
        targetEffect.textContent = part === 'sails' ? 'Tear the sails to slow her down.' : part === 'crystals' ? 'Break the crystals to bring her down.' : part === 'hull' ? 'Breach the hull to sink her.' : 'T changes the component you aim at.';
        if (previousTarget !== target) {
          targetPanel.classList.remove('ac-acquired');
          void targetPanel.offsetWidth;
          targetPanel.classList.add('ac-acquired');
        }
      }
      previousTarget = target;
      if (now - lastHitAt > 1050) confirm.classList.remove('ac-confirm-visible', 'ac-confirm-pulse');
    }
    requestAnimationFrame(update);
  }
  document.addEventListener('aether:ready', start, {once: true});
  if (window.Aether?.game) start();
})();

