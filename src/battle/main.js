import { fonts } from '../assets.js';
import { createSound } from '../audio/sound.js';
import { RARITY } from './engine.js';
import { ENCOUNTERS, ORDER, CURVE } from './encounters.js';
import { createBattleMode } from './mode.js';

// The battle demo: the night's six fights (docs/SLICE.md §2, tuned in docs/BALANCE.md), each on its own painted
// backdrop, with the party it's met with: the witch and Inkblot in the Gloamwood, and Nettie too in the fen. Pick a
// fight, or play them in order. B6 turns into Lights Out when her first form is beaten. The battle screen itself is
// src/battle/mode.js, which the game uses too.

const $ = (id) => document.getElementById(id);

async function boot() {
  for (const [family, url] of Object.entries(fonts)) new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  const audio = createSound();
  const battle = await createBattleMode({ canvas: $('stage'), audio, first: pickFromHash() ?? 'B1' });

  async function fight(id) {
    $('result').hidden = true;
    $('picker').hidden = true;
    history.replaceState(null, '', `#${id}`);
    const r = await battle.fight(id);
    showResult(id, r);
  }

  function showResult(id, { out, herbs }) {
    const win = out?.result === 'victory';
    const box = $('result');
    box.hidden = false;
    const at = ORDER.indexOf(id === 'B6b' ? 'B6' : id);
    const nextId = win ? ORDER[at + 1] : null;
    $('result-title').textContent = win ? 'Victory' : 'The party is sent home';
    const lines = [];
    if (win) {
      lines.push(`${out.xp} XP`);
      if (id === 'B6b') lines.push('The veil falls. "Are they safe?" Everyone got home. Every one.');
    } else {
      lines.push('Nothing is lost. She wakes by her last rest with everything she had, and the fight waits.');
    }
    $('result-text').textContent = lines.join(' ');
    const loot = (herbs || []).map((h) => ({ name: h.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()), rarity: 'herb' }));
    // The Wickhollow flames aren't loot: they float home (LORE §9)
    const drops = (out?.drops || []).filter((d) => !/wickhollow flame/i.test(d.name));
    $('result-loot').replaceChildren(...[...loot, ...drops].map((item) => {
      const li = document.createElement('li');
      const r = item.rarity === 'herb' ? { name: 'Gathered', color: '#9dffb0' } : RARITY[item.rarity];
      li.style.setProperty('--rarity', r?.color || '#ccc');
      li.innerHTML = '<b></b><span></span>';
      li.querySelector('b').textContent = item.name;
      li.querySelector('span').textContent = r?.name || item.rarity;
      return li;
    }));
    $('again').textContent = win ? 'Fight again' : 'Try again';
    $('again').onclick = () => { audio.unlock(); fight(id === 'B6b' ? 'B6' : id); };
    const onward = $('onward');
    onward.hidden = !nextId;
    if (nextId) onward.textContent = `On to ${ENCOUNTERS[nextId].name}`;
    onward.onclick = () => { audio.unlock(); fight(nextId); };
  }

  // The fight picker
  $('fights').replaceChildren(...ORDER.map((id) => {
    const e = ENCOUNTERS[id];
    const b = document.createElement('button');
    const party = e.party.map((h) => ({ witch: 'the witch', inkblot: 'Inkblot', nettie: 'Nettie' }[h])).join(', ');
    b.innerHTML = `<b>${e.name}</b><span>${e.where} · ${party} · level ${CURVE.typical[id]?.level ?? 1}${e.flags.boss ? ' · boss' : ''}${e.flags.required ? '' : ' · optional'}</span>`;
    b.addEventListener('click', () => { audio.unlock(); audio.sfx('ui-confirm'); fight(id); });
    return b;
  }));
  $('btn-fights').addEventListener('click', () => { audio.sfx('ui-open'); $('picker').hidden = false; });
  $('picker-close').addEventListener('click', () => { $('picker').hidden = true; });
  $('choose').addEventListener('click', () => { $('picker').hidden = false; });
  addEventListener('pointerdown', () => audio.unlock(), { once: true });
  addEventListener('keydown', () => audio.unlock());

  fight(pickFromHash() ?? 'B1');
  const loop = (now) => { battle.frame(now); requestAnimationFrame(loop); };
  requestAnimationFrame((now) => { loop(now); document.body.classList.add('ready'); });
  // (fight() starts one and returns at once, so a test can drive it)
  window.__battle = {
    THREE: battle.THREE, paint: battle.paint, stage: battle.stage, world: battle.world,
    get director() { return battle.director; }, get fightId() { return battle.fightId; }, fight: (id) => { fight(id); return id; }, ENCOUNTERS,
  };
}

function pickFromHash() {
  const id = location.hash.slice(1).toUpperCase();
  return ENCOUNTERS[id] && id !== 'B6B' ? id : null;
}

boot().catch((e) => { console.error(e); });
