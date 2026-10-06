// voyage.js: what happens between and during the fights. Two ways to play:
//   A voyage (the campaign): the Captain sets sail from port; each wave of the voyage comes in (a big wave in two
//   groups, the second as reinforcements once the first is mostly down); after each wave the Captain flies on or puts
//   in to port; the last wave brings a raider captain, and beating it ends the voyage. Going down loses the hold and
//   the wave is sailed again from port, a little weaker each time. (The rules and numbers are in progress.js.)
//   Free flight: the old endless waves, with everything unlocked and the garage open between waves.
import * as P from './progress.js';
import { waveAt } from './raiders.js';

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const NUMBER = ['', 'a', 'two', 'three', 'four', 'five', 'six', 'seven'];

// env: { captain(), raiders, player(), ui: { banner, toast, choice(show), port(open) }, compass(heading), classOf(id) }
export function makeDirector(env) {
  const W = { mode: 'free', state: 'calm', timer: 6, n: 0, lost: 0, groups: [], next: 0, wave: null, threat: 0, choiceTimer: 0 };
  const C = () => env.captain();

  function describe(ids) {
    const count = {};
    for (const id of ids) count[id] = (count[id] ?? 0) + 1;
    const parts = Object.entries(count).map(([id, n]) => `${NUMBER[n] ?? n} ${env.classOf(id)}${n > 1 ? 's' : ''}`);
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  }
  const threatOf = (list) => list.reduce((a, r) => a + P.THREAT[r.id] * (r.captain ? 2 : 1), 0);
  const live = () => env.raiders.list.filter((r) => !r.f.down);

  // start a wave: the voyage's next wave, or free flight's next on the ladder
  function startWave() {
    const player = env.player(), c = C();
    if (W.mode === 'free') {
      const ids = waveAt(W.n), a = env.raiders.spawnWave(ids, player);
      env.ui.banner(`Raiders, wave ${W.n + 1}`, `${describe(ids)}, to the ${env.compass(a)}`);
      W.groups = []; W.state = 'fight';
      return;
    }
    const wave = P.waveOf(c.voyage, c.wave, c.tries ?? 0), o = { difficulty: c.difficulty, level: P.raiderLevel(c.voyage) };
    W.wave = wave; W.groups = wave.groups.map((g) => [...g]); W.next = 0;
    const first = W.groups[W.next++], ids = wave.captain ? [wave.captain.id, ...first] : first;
    const a = env.raiders.spawnWave(ids, player, { ...o, captain: wave.captain });
    W.threat = threatOf(live());
    const who = wave.captain ? `${wave.captain.name} in a ${env.classOf(wave.captain.id)}${first.length ? `, with ${describe(first)}` : ''}` : describe(first);
    env.ui.banner(wave.boss ? `Voyage ${c.voyage}: the last wave` : `Voyage ${c.voyage}, wave ${c.wave} of ${P.wavesIn(c.voyage)}`,
      `${who}, to the ${env.compass(a)}${W.groups.length > 1 ? '. More behind them' : ''}${c.tries ? '. They lost ships last time too' : ''}`);
    W.state = 'fight';
  }

  // the Captain's ship went down
  function lose() {
    const c = C();
    W.lost = 6;
    if (W.mode === 'free') { env.ui.banner(`The ${env.player().ship.recipe.name} is going down`, 'Your crew will get her back up'); return; }
    const { kept, lost } = P.wentDown(c);
    P.save(c);
    env.ui.banner(`The ${env.player().ship.recipe.name} is going down`, lost ? `${lost} shards lost from the hold${kept ? `, ${kept} saved` : ''}` : 'Towed back to port');
  }

  function update(dt) {
    const player = env.player(), c = C();
    if (W.lost > 0) {
      if ((W.lost -= dt) <= 0) {
        env.raiders.clear();
        if (W.mode === 'free') { player.reset(player.pos.clone().setY(700), player.heading); W.state = 'calm'; W.timer = 10; env.ui.banner('Back in the air', 'The raiders will be back'); }
        else toPort('Towed back to port', `Wave ${c.wave} of voyage ${c.voyage} waits`);
      }
      return;
    }
    if (W.state === 'port') return;
    if (player.down) { lose(); return; }
    if (W.state === 'calm') {
      player.repair(dt * (W.mode === 'free' ? 0.12 : 0.02));
      if ((W.timer -= dt) <= 0) startWave();
      return;
    }
    if (W.state === 'after') {
      if ((W.choiceTimer -= dt) <= 0) flyOn();
      return;
    }
    // the fight: reinforcements when the first group is mostly down; the wave won when every raider is
    const now = live();
    if (W.mode === 'campaign' && W.next < W.groups.length && threatOf(now) <= W.threat * 0.35) {
      const ids = W.groups[W.next++], a = env.raiders.spawnWave(ids, player, { difficulty: c.difficulty, level: P.raiderLevel(c.voyage) });
      W.threat = threatOf(live());
      env.ui.banner('Reinforcements', `${describe(ids)}, to the ${env.compass(a)}`);
      return;
    }
    if (now.length) return;
    if (W.mode === 'free') { W.n++; W.state = 'calm'; W.timer = 12; env.ui.banner(`Wave ${W.n} beaten`, 'The crew patch her up · G for the garage'); return; }
    const renown = P.waveRenown(c);
    c.renown += renown;
    if (W.wave.boss) {
      const v = c.voyage, paid = P.voyageDone(c);
      P.save(c);
      toPort(`Voyage ${v} done`, `${paid} shards banked · voyage ${c.voyage} waits`);
      return;
    }
    P.waveBeaten(c); P.save(c);
    W.state = 'after'; W.choiceTimer = 25;
    env.ui.choice(true);
    env.ui.banner(`Wave ${c.wave - 1} beaten`, `+${renown} renown · fly on, or put in to port`);
  }

  // after a wave: fly on (the hold's bonus grows, the crew patch what they can) or put in to port
  function flyOn() {
    if (W.state !== 'after') return;
    const c = C(), player = env.player();
    P.flyOn(c); P.save(c);
    env.ui.choice(false);
    player.repair(0.2 * P.effects(c).repair);
    W.state = 'calm'; W.timer = 8;
    env.ui.toast(`Flying on: the hold pays ×${P.holdBonus(c).toFixed(1)} when banked`);
  }
  function putIn() {
    if (W.state !== 'after') return;
    const paid = P.bank(C()); P.save(C());
    toPort('In port', `${paid} shards banked`);
  }
  function toPort(title, line) {
    env.ui.choice(false);
    env.raiders.clear();
    const player = env.player();
    player.reset(player.pos.clone().setY(700), player.heading);
    W.state = 'port';
    env.ui.port(true);
    env.ui.banner(title, line);
  }
  // leave port for the voyage's next wave
  function setSail() {
    if (W.state !== 'port') return;
    env.raiders.warm?.(P.classesOf(C().voyage)); // build this voyage's raider ships now, not when they appear
    env.ui.port(false);
    W.state = 'calm'; W.timer = 6;
  }

  return {
    W, update, flyOn, putIn, setSail, toPort,
    // begin playing: a voyage (from port) or free flight (straight into the air)
    begin(mode) {
      W.mode = mode; W.n = 0; W.lost = 0; env.raiders.clear(); env.ui.choice(false);
      if (mode === 'campaign') toPort('In port', `Voyage ${C().voyage}, wave ${C().wave} waits`);
      else { env.ui.port(false); W.state = 'calm'; W.timer = 6; }
    },
    get calm() { return W.state === 'calm' || W.state === 'port' || W.state === 'after'; },
    COMPASS,
  };
}
