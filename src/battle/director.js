import * as THREE from 'three';
import * as E from './engine.js';
import { portraits } from '../assets.js';

// Sounds from Thareia's studio for what happens in a fight
const STATUS_SOUND = { burning: 'burn', chilled: 'chill', frozen: 'chill', poisoned: 'poison', rotting: 'rot', staggered: 'stagger', frightened: 'fear',
  charmed: 'charm', hexed: 'hex', warded: 'ward', hasted: 'haste', regenerating: 'regen', guarding: 'shield-up', marked: 'counter', rooted: 'stagger', bleeding: 'poison' };
const HIT_SOUND = { ember: 'ember', frost: 'frost', storm: 'storm', stone: 'stone', verdant: 'verdant', tide: 'tide', radiant: 'radiant', blight: 'blight',
  slash: 'hit-slash', pierce: 'hit-thrust', crush: 'hit-blunt' };
const FOE_SOUND = { 'marsh-light': 'wisp', 'lamp-moth': 'insect', 'bog-hag': 'hex', 'willow-wight': 'leaves', 'mire-leech': 'slime', drowned: 'ghost', 'lantern-mother': 'ghost' };
const SKILL_SOUND = { attack: 'ember', 'silver-circle': 'radiant', moonbeam: 'radiant', bless: 'ward', gather: 'dagger' };

// docs/LORE.md: Aethermoor's statuses keep their rules, five get gentler names
const STATUS_NAME = { bleeding: 'Snagged', frightened: 'Spooked', swallowed: 'Led Away', unmade: 'Greyed', hearthlit: 'Moonlit' };
// What each foe does when beaten, instead of dying (LORE §7)
const BEATEN = {
  'marsh-light': 'It hiccups, turns green again and drifts off, shy.',
  'lamp-moth': 'It drops the flame, which floats home.',
  'willow-wight': 'It roots and sleeps, only a willow again.',
  'mire-leech': 'It slips back into the water.',
  glowcap: 'It sits down and puts down roots.',
};
// What Gather cuts from each foe (LORE §8), by herb id in art/herbs
const GATHERS = { 'marsh-light': 'wisp_sprout', glowcap: 'glowcap', boglurcher: 'bogwick', 'willow-wight': 'silver_mugwort' };
const HERB_NAMES = { wisp_sprout: 'Wisp-sprout', glowcap: 'Glowcap', bogwick: 'Bogwick', silver_mugwort: 'Silver mugwort' };

// The battle director: asks the rules what happens (engine.js) and plays it out on the 3D stage and the HUD.
// Foes act on their own; on the witch's turn the command menu opens. Every event from the rules is shown:
// the intent dice, the d20 rolls, damage (weak and resisted hits called out), statuses, KOs.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Director {
  constructor({ stage, actors, state, audio, fx, onEnd }) {
    Object.assign(this, { stage, actors, state, audio, fx, onEnd });
    this.labels = {};
    for (const [id, a] of Object.entries(actors)) if (this.unit(id).side === 'foe') this.labels[id] = this.makeFoeLabel(id);
    this.renderParty();
    this.renderRibbon();
  }

  unit(id) { return this.state.units[id]; }

  async run() {
    await wait(900);
    await this.play(this.state.openingEvents || []);
    for (let guard = 0; guard < 400; guard++) {
      if (E.outcome(this.state)) break;
      const id = E.current(this.state);
      if (!id) break;
      if (this.unit(id).side === 'hero') {
        const cmd = await this.chooseCommand(id);
        const r = E.act(this.state, cmd);
        await this.apply(r, id, cmd);
      } else {
        await wait(350);
        const r = E.foeTurn(this.state);
        await this.apply(r, id, null);
      }
    }
    const out = E.outcome(this.state);
    this.onEnd?.(out);
  }

  async apply(r, actorId, cmd) {
    this.pending = r.state;
    await this.play(r.events, actorId, cmd);
    this.gathered(cmd);
    this.state = r.state;
    this.renderParty();
    this.renderRibbon();
    this.refreshLabels();
  }

  // ---------------------------------------------------------------- events

  async play(events, actorId, cmd) {
    for (const e of events) {
      const h = this[`on_${e.t}`];
      if (h) await h.call(this, e, actorId, cmd);
    }
  }

  async on_turn(e) {
    this.activeId = e.actor;
    if (this.unit(e.actor)?.side === 'hero') this.audio.sfx('turn');
    this.renderRibbon(e.actor);
    for (const [id, l] of Object.entries(this.labels)) l.el.classList.toggle('acting', id === e.actor);
  }

  async on_intent(e) {
    const l = this.labels[e.foe];
    if (l) l.intent.textContent = `d${e.die} · ${e.face} · ${e.move ? (this.moveName(e) || e.move) : ''}`;
    if (l) l.intent.title = e.text || '';
  }

  moveName(e) { return (e.text || '').replace(/^\d+:\s*/, '').replace(/ at .*$/, ''); }

  async on_move(e, actorId, cmd) {
    const actor = this.actors[e.actor];
    const side = this.unit(e.actor)?.side;
    const label = side === 'hero' ? this.labelFor(cmd) ?? e.name : e.name;
    this.banner(label);
    if (side === 'hero') {
      const tgt = cmd?.target;
      const foe = tgt && this.actors[tgt] && this.unit(tgt)?.side === 'foe';
      const item = cmd?.type === 'item';
      const sound = item ? (foe ? 'bow-shot' : 'mp-restore') : SKILL_SOUND[cmd?.id] ?? 'ui-confirm';
      this.audio.sfx(sound);
      if (cmd?.id === 'gather' && foe) {
        // Like FF9's Steal: dash in with the athame, cut, and back.
        const from = actor.root.rotation.y;
        const to = this.actors[tgt].root.position;
        actor.root.rotation.y = Math.atan2(to.x - actor.root.position.x, to.z - actor.root.position.z);
        const reach = Math.max(0.8, actor.root.position.distanceTo(to) - 0.9);
        await new Promise((r) => actor.play('dash', r, { reach, slow: 1.3 }));
        await wait(650);
        actor.root.rotation.y = from;
      } else if (cmd?.id === 'silver-circle' || cmd?.type === 'surge') {
        actor.play('moonlight');
        await wait(700);
        await this.fx.moonRing(Object.keys(this.labels).filter((id) => !this.unit(id).ko).map((id) => this.actors[id].root.position));
      } else if (cmd?.id === 'bless') {
        actor.play('rune');
        await wait(1200);
      } else if (cmd?.type === 'defend') {
        actor.play('veil');
        await wait(900);
      } else if (item && !foe) {
        actor.play('brew');
        await wait(900);
      } else {
        // Witchfire, Moonbeam, or a thrown brew: wind up and let it fly.
        actor.play(cmd?.id === 'moonbeam' ? 'cast' : 'throw');
        await wait(cmd?.id === 'moonbeam' ? 700 : 420);
        const color = cmd?.id === 'moonbeam' ? '#e6ecff' : cmd?.item === 'hush-tea' ? '#d8b8ff' : cmd?.item === 'moonwater' ? '#8fc8ff' : '#c77dff';
        if (foe) await this.fx.bolt(actor.fire.getWorldPosition(new THREE.Vector3()), this.center(tgt), color, cmd?.type === 'attack' ? 1 : 1.4);
      }
    } else {
      actor.play('attack');
      this.audio.sfx(FOE_SOUND[this.unit(e.actor)?.family] ?? 'foe-charge');
      await wait(380);
    }
    if (e.text && !(side === 'hero' && cmd?.type === 'attack')) this.caption(e.text);
  }

  // After the rules resolve a Gather, the game picks the herb (the rules don't know about herbs).
  gathered(cmd) {
    if (cmd?.id !== 'gather') return;
    const fam = this.unit(cmd.target)?.family;
    const herb = GATHERS[fam];
    if (!herb || this.cut?.[cmd.target]) {
      this.popup(cmd.target, 'Nothing to cut', 'miss');
      this.caption(herb ? 'She already has what it grows.' : 'Nothing grows on this one. The athame stays clean.');
      return;
    }
    this.cut = { ...this.cut, [cmd.target]: true };
    this.herbs = [...(this.herbs ?? []), herb];
    this.popup(cmd.target, `+ ${HERB_NAMES[herb]}`, 'heal');
    this.caption(`She cuts a sprig of ${HERB_NAMES[herb].toLowerCase()} and says thank you.`);
    this.audio.sfx('shard-pickup');
    this.fx.sparkle(this.center(cmd.target), '#b8f0a0', 16);
  }

  labelFor(cmd) {
    if (!cmd) return null;
    return { attack: 'Witchfire', defend: 'Be Still', surge: 'Full Moon', flee: 'Slip Away' }[cmd.type] ?? null;
  }

  async on_roll(e) {
    const who = this.unit(e.actor)?.name ?? '';
    const res = { crit: 'Critical!', hit: 'Hit', graze: 'Graze', miss: 'Miss', fumble: 'Fumble', save: 'Saved', fail: 'Failed' }[e.result] || e.result;
    const dice = e.rolls.length > 1 ? `${e.rolls.join(' / ')} → ${e.kept}` : `${e.kept}`;
    const label = e.purpose === 'save' ? `${this.unit(e.target)?.name ?? ''} saves` : who;
    this.rollBadge(`${label}: d20 ${dice} + ${e.bonus} = ${e.total} vs ${e.vs} · ${res}`, e.result);
    this.audio.sfx('dice-roll');
    if (e.result === 'miss' || e.result === 'fumble') { this.popup(e.target || e.actor, 'Miss', 'miss'); setTimeout(() => this.audio.sfx('miss'), 200); }
    await wait(420);
  }

  async on_damage(e) {
    const a = this.actors[e.target];
    a?.play('hurt');
    const note = e.eff === 'weak' ? 'weak' : e.eff === 'resist' ? 'resist' : e.eff === 'immune' ? 'immune' : e.crit ? 'crit' : 'hit';
    this.popup(e.target, `${e.amount}`, note);
    if (note === 'weak') this.popup(e.target, 'Weak!', 'tag', 0.35);
    if (note === 'resist') this.popup(e.target, 'Resisted', 'tag', 0.35);
    this.audio.sfx(e.crit ? 'crit' : HIT_SOUND[e.aspect] ?? HIT_SOUND[e.kind] ?? 'hit-blunt');
    this.stage.shake = e.crit ? 0.35 : 0.15;
    this.setHp(e.target, -e.amount);
    await wait(380);
  }

  async on_heal(e) {
    this.popup(e.target, `+${e.amount}`, 'heal');
    this.fx.sparkle(this.center(e.target), '#9dffb0');
    this.audio.sfx('heal');
    this.setHp(e.target, e.amount);
    await wait(320);
  }

  async on_status(e) {
    if (e.op !== 'add' && e.op !== 'trigger') return;
    const name = STATUS_NAME[e.status] || E.STATUSES[e.status]?.name || e.status;
    this.popup(e.target, e.label || name, 'status', 0.2);
    this.audio.sfx(STATUS_SOUND[e.status] ?? 'buff-end');
    await wait(260);
  }

  async on_ko(e) {
    this.actors[e.target]?.play('ko');
    const beaten = BEATEN[this.unit(e.target)?.family];
    if (e.text || beaten) this.caption(e.text || beaten);
    if (this.unit(e.target)?.family === 'lamp-moth') this.fx.floatHome(this.center(e.target));
    this.audio.sfx(this.unit(e.target)?.side === 'foe' ? 'foe-down' : 'ko');
    const l = this.labels[e.target];
    if (l) l.el.classList.add('gone');
    await wait(700);
  }

  async on_escape(e) {
    this.actors[e.foe]?.play('ko');
    if (e.text) this.caption(e.text);
    const l = this.labels[e.foe];
    if (l) l.el.classList.add('gone');
    await wait(600);
  }

  async on_text(e) { this.caption(e.text); await wait(500); }
  async on_surge() {}

  // ---------------------------------------------------------------- the command menu

  chooseCommand(heroId) {
    return new Promise((resolve) => {
      const menu = $('menu');
      const all = E.commands(this.state, heroId);
      const show = (list, title) => {
        menu.hidden = false;
        $('menu-title').textContent = title;
        const ul = $('menu-list');
        ul.replaceChildren(...list.map((c) => {
          const li = document.createElement('li');
          const b = document.createElement('button');
          b.disabled = !c.enabled;
          b.innerHTML = `<span>${c.label ?? c.name}</span>${c.mp ? `<em>${c.mp} MP</em>` : c.count != null ? `<em>×${c.count}</em>` : c.sub ? '<em>▸</em>' : ''}`;
          b.title = c.reason || c.text || '';
          b.addEventListener('click', () => c.sub ? c.sub() : pickTarget(c));
          b.addEventListener('mouseenter', () => this.hint(c.reason || c.text || ''));
          b.addEventListener('focus', () => this.hint(c.reason || c.text || ''));
          li.append(b);
          return li;
        }));
        ul.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
      };
      const top = () => {
        // Her commands are Aethermoor's, renamed (docs/LORE.md §5)
        const find = (type, id) => all.find((c) => c.type === type && (!id || c.id === id));
        const moon = all.filter((c) => c.type === 'skill' && c.id !== 'gather');
        const brews = all.filter((c) => c.type === 'item');
        const list = [];
        const fire = find('attack');
        if (fire) list.push({ ...fire, label: 'Witchfire', text: 'The violet flame in her hand, thrown: 1d8 ember.' });
        if (moon.length) list.push({ name: 'Moonlight', enabled: true, text: 'Silver Circle, Moonbeam, Bless.', sub: () => show([...moon, back], 'Moonlight') });
        const gather = find('skill', 'gather');
        if (gather) list.push(gather);
        if (brews.length) list.push({ name: 'Brew', enabled: brews.some((i) => i.enabled), text: 'Drink one, or throw it.', sub: () => show([...brews, back], 'Brew') });
        const still = find('defend');
        if (still) list.push({ ...still, label: 'Be Still', text: 'Draw her veil: +2 Guard, half damage, and 2 MP back.' });
        const surge = find('surge');
        if (surge) list.push({ ...surge, label: 'Full Moon', text: surge.reason ? 'The moon is still waxing. It fills as she fights.' : surge.text });
        const flee = find('flee');
        if (flee) list.push({ ...flee, label: 'Slip Away' });
        show(list, this.unit(heroId).name);
      };
      const back = { name: 'Back', enabled: true, sub: () => top() };
      const pickTarget = (c) => {
        const opts = E.targets(this.state, c);
        if (!opts.length || c.targeting === 'self' || c.targeting === 'all-enemies' || c.targeting === 'all-allies' || opts.length === 1) return done({ ...c, target: opts[0] ?? null });
        menu.hidden = true;
        this.caption(`${c.name}: choose a target. Tap one, or use the arrow keys and Enter.`);
        this.targeting = { opts, i: 0, pick: (id) => done({ ...c, target: id }), cancel: () => { this.targeting = null; this.cursor(null); top(); } };
        this.cursor(opts[0]);
      };
      const done = (cmd) => {
        this.targeting = null;
        this.cursor(null);
        menu.hidden = true;
        this.hint('');
        this.audio.sfx('ui-confirm');
        resolve(cmd);
      };
      top();
    });
  }

  // Keyboard and taps while choosing a target
  targetKey(dir) {
    const T = this.targeting;
    if (!T) return;
    T.i = (T.i + dir + T.opts.length) % T.opts.length;
    this.cursor(T.opts[T.i]);
    this.audio.sfx('ui-cursor');
  }

  tapAt(x, y) {
    const T = this.targeting;
    if (!T) return false;
    let best = null, bestD = 90;
    for (const id of T.opts) {
      const s = this.stage.worldToScreen(this.center(id));
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) (bestD = d), (best = id);
    }
    if (best) T.pick(best);
    return !!best;
  }

  // ---------------------------------------------------------------- HUD

  center(id) {
    const a = this.actors[id];
    const p = a.root.position.clone();
    p.y += (a.center ?? 0.9) * a.root.scale.y;
    return p;
  }

  makeFoeLabel(id) {
    const el = document.createElement('div');
    el.className = 'foe-label';
    const name = document.createElement('b');
    name.textContent = this.unit(id).name;
    const bar = document.createElement('i');
    const fill = document.createElement('span');
    bar.append(fill);
    const intent = document.createElement('small');
    el.append(name, bar, intent);
    $('labels').append(el);
    const u = this.unit(id);
    return { el, fill, intent, hp: u.hp, max: u.maxHp };
  }

  refreshLabels() {
    for (const [id, l] of Object.entries(this.labels)) {
      const u = this.unit(id);
      l.hp = u.hp;
      l.fill.style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
    }
  }

  setHp(id, delta) {
    const l = this.labels[id];
    if (l) {
      l.hp = Math.max(0, l.hp + delta);
      l.fill.style.width = `${Math.max(0, (l.hp / l.max) * 100)}%`;
    }
    const p = this.partyRows?.[id];
    if (p) {
      p.hp = Math.max(0, Math.min(p.max, p.hp + delta));
      p.hpText.textContent = `${p.hp}/${p.max}`;
      p.hpBar.style.width = `${(p.hp / p.max) * 100}%`;
    }
  }

  renderParty() {
    const box = $('party');
    this.partyRows = {};
    box.replaceChildren(...Object.values(this.state.units).filter((u) => u.side === 'hero').map((u) => {
      const row = document.createElement('div');
      row.className = 'hero';
      const face = document.createElement('img');
      face.src = portraits['witch-calm'];
      face.alt = '';
      const info = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = u.name;
      const hp = meter('HP', u.hp, u.maxHp, 'hp');
      const mp = meter('MP', u.mp, u.maxMp, 'mp');
      const surge = meter('Surge', u.surge ?? 0, 100, 'surge');
      info.append(name, hp.el, mp.el, surge.el);
      row.append(face, info);
      this.partyRows[u.id] = { hp: u.hp, max: u.maxHp, hpText: hp.text, hpBar: hp.bar };
      return row;
    }));
  }

  renderRibbon(active) {
    const ids = E.timeline(this.state, 8);
    $('ribbon').replaceChildren(...ids.map((id, i) => {
      const u = this.unit(id);
      const chip = document.createElement('span');
      chip.className = `chip ${u.side}${i === 0 ? ' now' : ''}`;
      chip.title = u.name;
      if (u.side === 'hero') {
        const img = document.createElement('img');
        img.src = portraits['witch-calm'];
        img.alt = u.name;
        chip.append(img);
      } else chip.textContent = u.name.split(/[\s-]/).map((w) => w[0]).join('').slice(0, 2);
      return chip;
    }));
  }

  banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  caption(text) {
    const c = $('caption');
    c.textContent = text;
    c.classList.remove('show');
    void c.offsetWidth;
    c.classList.add('show');
  }

  hint(text) { $('hint').textContent = text; }

  rollBadge(text, result) {
    const r = $('roll');
    r.textContent = text;
    r.dataset.result = result;
    r.classList.remove('show');
    void r.offsetWidth;
    r.classList.add('show');
  }

  popup(id, text, kind, delay = 0) {
    const a = this.actors[id];
    if (!a) return;
    setTimeout(() => {
      const s = this.stage.worldToScreen(this.center(id).add(new THREE.Vector3(0, 0.5 * a.root.scale.y, 0)));
      const el = document.createElement('span');
      el.className = `pop ${kind}`;
      el.textContent = text;
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
      $('labels').append(el);
      setTimeout(() => el.remove(), 1300);
    }, delay * 1000);
  }

  cursor(id) {
    const c = $('cursor');
    c.hidden = !id;
    this.cursorId = id;
  }

  // Keep floating labels on their actors
  afterRender() {
    for (const [id, l] of Object.entries(this.labels)) {
      const a = this.actors[id];
      const s = this.stage.worldToScreen(a.root.position.clone().add(new THREE.Vector3(0, (a.height ?? 1) * a.root.scale.y + 0.25, 0)));
      l.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
    if (this.cursorId) {
      const s = this.stage.worldToScreen(this.center(this.cursorId));
      $('cursor').style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
  }
}

function meter(label, value, max, kind) {
  const el = document.createElement('div');
  el.className = `meter ${kind}`;
  const l = document.createElement('span');
  l.textContent = label;
  const bar = document.createElement('i');
  const fill = document.createElement('u');
  fill.style.width = `${(value / max) * 100}%`;
  bar.append(fill);
  const text = document.createElement('em');
  text.textContent = kind === 'surge' ? '' : `${value}/${max}`;
  el.append(l, bar, text);
  return { el, bar: fill, text };
}
