import * as THREE from 'three';
import { createHilde, createAgnes, createCrow } from './actors/villagers.js';
import { portraits } from './assets.js';
import { createSound } from './audio/sound.js';
import { ring } from './paint.js';
import { turnToward, glowSprite } from './actors/kit.js';
import { HERBS, SQUARE_HERBS } from './data/herbs.js';
import { createHerb } from './actors/herbs.js';

const REACH = 1.15; // meters: how close she has to be to talk to someone
const $ = (id) => document.getElementById(id);

// Everything that happens on the field screen: the villagers, talking, tapping to walk, the exits,
// and the buttons for looking behind the scenes.
export class Field {
  constructor({ world, walk, paint, stage, player, scene }) {
    Object.assign(this, { world, walk, paint, stage, player, scene });
    this.audio = createSound();
    this.audio.music('wickhollow');
    this.talking = null;
    this.moved = false;
    this.time = 0;
    this.sparks = new Sparks(world);
    this.glints = new Sparks(world, '#efe6ff', 2.5);

    const at = (x, y, h = 0) => paint.toWorld(x, y, h);
    const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

    // Hilde works at the anvil in the smithy's open front.
    const hilde = createHilde();
    hilde.root.position.copy(at(470, 622));
    const anvil = at(466, 596);
    const anvilTop = anvil.clone().setY(0.62);
    hilde.work = headingTo(hilde.root.position, anvil);
    hilde.root.rotation.y = hilde.work;
    hilde.events.strike = () => {
      this.sparks.burst(anvilTop, 14);
      const d = player.pos.distanceTo(hilde.root.position);
      if (!this.talking) this.audio.sfx('anvil', { g: Math.max(0.12, 1 - d / 9) });
    };
    // Agnes hovers by the chapel wall, knitting.
    const agnes = createAgnes();
    agnes.root.position.copy(at(904, 580));
    agnes.rest = 0.35;
    // Inkblot hops about the square.
    const crow = createCrow();
    crow.root.position.copy(at(610, 850));
    this.crow = { actor: crow, state: 'stand', timer: 2, flight: null, high: false };

    this.villagers = [hilde, agnes];
    for (const v of [hilde, agnes, crow]) world.add(v.root);
    for (const v of this.villagers) {
      v.obstacle = { x: v.root.position.x, z: v.root.position.z, r: v.radius };
      walk.obstacles.push(v.obstacle);
    }

    // Perches for the crow: spots on the ground, and the tops of things.
    const top = (base, topY) => at(...base).setY(paint.heightAbove(base, topY));
    this.perches = {
      ground: [[610, 850], [420, 800], [560, 660], [860, 640], [900, 800], [760, 880], [1150, 1000], [330, 640]].map(([x, y]) => at(x, y)),
      high: [top([705, 724], 548), top([343, 742], 580), top([999, 936], 776), top([1063, 640], 488)],
    };

    // Things to look at, and people to talk to
    this.things = [
      { name: 'Hilde', actor: hilde, pos: hilde.root.position, portrait: 'hilde', voice: 3, lines: DIALOGUE.hilde },
      { name: 'Agnes', actor: agnes, pos: agnes.root.position, portrait: 'agnes', voice: 4, lines: DIALOGUE.agnes },
      { name: 'Inkblot', crow: true, pos: crow.root.position, portrait: 'inkblot', voice: 6, lines: DIALOGUE.inkblot },
      { name: null, pos: at(705, 792), lines: DIALOGUE.well, sound: 'well-bucket' },
      { name: null, pos: at(786, 402, 0.55), lines: DIALOGUE.door, sound: 'sealed-door' },
      { name: null, pos: at(300, 720), lines: DIALOGUE.stall, sound: 'shop-bell' },
    ];
    for (const t of this.things) t.visits = 0;

    // Herbs to gather: the source game's patches on this painting, each one once a night.
    this.basket = {};
    for (const [key, x, y] of SQUARE_HERBS) {
      const herb = HERBS[key];
      const pos = at(x, y);
      const plant = createHerb(key);
      plant.root.position.copy(pos);
      plant.root.rotation.y = Math.random() * Math.PI * 2;
      plant.root.scale.setScalar(1.7); // a touch bigger than life, so they're easy to spot
      world.add(plant.root);
      this.things.push({ name: herb.name, herb: key, pos, group: plant.root, plant, visits: 0 });
    }
    this.exits = scene.exits.map((e) => ({ ...e, zone: ring(e.zone), inside: false }));

    this.buildHud();
    this.bindPointer();
    setTimeout(() => $('place').classList.add('gone'), 5200);
  }

  // ---------------------------------------------------------------- input

  canWalk() {
    return !this.talking && !this.player.actor.busy;
  }

  onKey(what) {
    this.audio.unlock();
    if (what === 'move') {
      this.noteMoved();
      return;
    }
    if (what === 'act') {
      if (this.player.actor.busy) return;
      if (this.talking) this.advance();
      else if (this.nearby) this.talk(this.nearby);
    } else if (what === 'back') {
      if (this.stage.reveal.on) this.toggleBackstage(false);
    } else if (what === 'backstage') this.toggleBackstage();
    else if (what === 'layers') this.toggleLayers();
  }

  noteMoved() {
    if (this.moved) return;
    this.moved = true;
    setTimeout(() => $('hint').classList.add('gone'), 5000);
  }

  bindPointer() {
    const canvas = this.stage.renderer.domElement;
    const pointers = new Map();
    let pinch = 0, downAt = null;
    canvas.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (this.stage.revealing) {
        if (pointers.size === 1) this.stage.orbitBy(e.clientX - p.x, e.clientY - p.y);
        else if (pointers.size === 2) {
          p.x = e.clientX; p.y = e.clientY;
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) this.stage.zoomBy(pinch / d);
          pinch = d;
          return;
        }
        this.stage.reveal.drag = true;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      this.stage.reveal.drag = pointers.size ? true : null;
      if (!downAt || pointers.size) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      const quick = performance.now() - downAt.t < 450;
      downAt = null;
      if (e.type === 'pointerup' && moved < 12 && quick) this.tap(e.clientX, e.clientY);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      if (!this.stage.revealing) return;
      e.preventDefault();
      this.stage.zoomBy(Math.exp(e.deltaY * 0.001));
    }, { passive: false });
  }

  // Tap: talk if a dialogue is open; walk to a person and talk; or walk to the spot.
  tap(x, y) {
    if (this.talking) return this.advance();
    if (this.stage.revealing) return;
    this.noteMoved();
    const hit = this.thingAt(x, y);
    const player = this.player;
    if (hit) {
      const dir = new THREE.Vector3().subVectors(player.pos, hit.pos).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      const stand = hit.pos.clone().addScaledVector(dir.normalize(), (hit.actor?.radius ?? 0.25) + player.radius + 0.15);
      this.walkTo(stand, () => this.talk(hit));
      return;
    }
    const pixel = this.stage.screenToPixel(x, y);
    const ray = this.paint.ray(pixel.x, pixel.y);
    const spot = this.walk.raycast(ray) ?? this.paint.toWorld(pixel.x, pixel.y);
    this.walkTo(spot);
    this.showTapMark(x, y);
  }

  walkTo(spot, then) {
    const player = this.player;
    if (then && player.pos.distanceTo(spot) < 0.25) return then();
    const path = this.walk.findPath(player.pos, spot, player.obstacle);
    player.path = path && path.length ? path : null;
    player.onArrive = then ?? null;
    if (!player.path && then) then();
  }

  thingAt(x, y) {
    let best = null, bestD = 44;
    for (const t of this.things) {
      if (t.crow && this.crow.state !== 'stand') continue;
      const lift = t.crow ? 0.15 : t.actor ? 0.6 : t.herb ? 0.2 : 0.3;
      const s = this.stage.worldToScreen(t.pos.clone().setY(t.pos.y + lift));
      const d = Math.hypot(s.x - x, s.y - y) / Math.max(0.6, this.stage.scale);
      if (d < bestD) (bestD = d), (best = t);
    }
    return best;
  }

  showTapMark(x, y) {
    const m = $('tapmark');
    m.style.left = `${x}px`;
    m.style.top = `${y}px`;
    m.classList.remove('on');
    void m.offsetWidth;
    m.classList.add('on');
  }

  // ---------------------------------------------------------------- talking

  talk(thing) {
    if (this.talking || this.player.actor.busy) return;
    if (thing.herb) return this.gather(thing);
    const player = this.player;
    player.path = null;
    const lines = thing.visits > 0 && thing.lines.again ? thing.lines.again : thing.lines.first;
    thing.visits++;
    this.talking = { thing, lines, index: -1 };
    $('hint').classList.add('gone');
    // Face each other.
    player.heading = Math.atan2(thing.pos.x - player.pos.x, thing.pos.z - player.pos.z);
    thing.actor?.lookAt?.(Math.atan2(player.pos.x - thing.pos.x, player.pos.z - thing.pos.z));
    if (thing.crow) this.crow.actor.root.rotation.y = Math.atan2(player.pos.x - thing.pos.x, player.pos.z - thing.pos.z);
    const box = $('talk');
    box.hidden = false;
    box.classList.toggle('plain', !thing.name);
    $('talk-name').textContent = thing.name ?? '';
    const face = $('talk-face');
    // Her own thoughts show her portrait with no name, the way a field message would.
    face.src = portraits[thing.portrait ?? 'witch-calm'];
    this.player.actor.setMood?.(thing.name ? 'happy' : 'calm');
    this.audio.sfx(thing.sound ?? (thing.name ? 'ui-confirm' : 'ui-page'));
    if (thing.crow) this.audio.sfx('kraa');
    this.advance();
  }

  advance() {
    const T = this.talking;
    if (!T) return;
    if (T.typing) {
      T.shown = T.text.length;
      return;
    }
    T.index++;
    if (T.index >= T.lines.length) return this.endTalk();
    T.text = T.lines[T.index];
    T.shown = 0;
    T.typing = true;
    if (T.thing.name === 'Hilde' && /Ha!/.test(T.text)) T.thing.actor.laugh();
    $('talk-more').hidden = true;
  }

  // Kneel, pick, and into the basket it goes.
  gather(thing) {
    const player = this.player;
    player.path = null;
    player.heading = Math.atan2(thing.pos.x - player.pos.x, thing.pos.z - player.pos.z);
    this.things = this.things.filter((t) => t !== thing);
    this.audio.sfx('leaves');
    player.actor.play('harvest', () => this.pick(thing));
  }

  pick(thing) {
    const herb = HERBS[thing.herb];
    thing.leaving = 0;
    this.leaving = [...(this.leaving ?? []), thing];
    this.glints.burst(thing.pos.clone().setY(thing.pos.y + 0.2), 22);
    const first = !this.basket[thing.herb];
    this.basket[thing.herb] = (this.basket[thing.herb] ?? 0) + 1;
    this.showBasket(thing.herb);
    this.toast(first ? herb.note : `${herb.name} went into the basket.`, 'shard-pickup');
    this.player.actor.setMood?.('happy');
    setTimeout(() => !this.talking && this.player.actor.setMood?.('calm'), 1400);
  }

  showBasket(fresh) {
    const box = $('basket');
    box.hidden = false;
    const list = $('basket-list');
    list.replaceChildren(...Object.entries(this.basket).map(([key, n]) => {
      const li = document.createElement('li');
      if (key === fresh) li.className = 'fresh';
      const img = document.createElement('img');
      img.src = HERBS[key].icon;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = `${HERBS[key].name} ×${n}`;
      li.append(img, label);
      return li;
    }));
    const total = Object.values(this.basket).reduce((a, b) => a + b, 0);
    $('basket-count').textContent = `${total} of ${SQUARE_HERBS.length}`;
  }

  endTalk() {
    const { thing } = this.talking;
    this.talking = null;
    $('talk').hidden = true;
    thing.actor?.lookAt?.(null);
    this.player.actor.setMood?.('calm');
    if (thing.crow) this.crowFlee(true);
    this.audio.sfx('back');
  }

  // ---------------------------------------------------------------- each frame

  update(dt, time) {
    this.time = time;
    // Night sounds: crickets now and then, and once in a while an owl in the Gloamwood
    this.nextCrickets = (this.nextCrickets ?? 3) - dt;
    if (this.nextCrickets < 0) { this.audio.sfx('crickets'); this.nextCrickets = 6 + Math.random() * 6; }
    this.nextOwl = (this.nextOwl ?? 20) - dt;
    if (this.nextOwl < 0) { this.audio.sfx('owl'); this.nextOwl = 25 + Math.random() * 30; }
    const player = this.player;
    const [hilde, agnes] = this.villagers;
    hilde.update(dt, hilde.work);
    agnes.update(dt, agnes.rest);
    this.updateCrow(dt);
    this.sparks.update(dt);
    this.glints.update(dt);
    for (const t of this.things) if (t.herb) t.plant.update(dt);
    for (const t of this.leaving ?? []) {
      t.leaving += dt / 0.5;
      const k = Math.min(1, t.leaving);
      t.group.position.y = t.pos.y + k * 0.35;
      t.group.scale.setScalar(1 - k);
      if (k >= 1) this.world.remove(t.group);
    }
    this.leaving = (this.leaving ?? []).filter((t) => t.leaving < 1);

    // Typewriter
    const T = this.talking;
    if (T?.typing) {
      const before = Math.floor(T.shown);
      T.shown = Math.min(T.text.length, T.shown + dt * 42);
      const now = Math.floor(T.shown);
      if (now > before && now % 2 === 0 && /\w/.test(T.text[now - 1] ?? '')) this.audio.sfx('blip', { voice: T.thing.voice ?? 1 });
      $('talk-text').textContent = T.text.slice(0, now);
      if (now >= T.text.length) {
        T.typing = false;
        $('talk-text').textContent = T.text;
        $('talk-more').hidden = false;
      }
    }

    // Who's close enough to talk to? FF9 puts a "!" over your head.
    this.nearby = null;
    if (!T) {
      let best = REACH;
      const facing = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
      for (const t of this.things) {
        if (t.crow && this.crow.state !== 'stand') continue;
        const to = new THREE.Vector3().subVectors(t.pos, player.pos).setY(0);
        const d = to.length() - (t.actor?.radius ?? (t.crow ? 0.1 : t.herb ? 0.05 : 0.2));
        if (d < best && (d < 0.35 || to.normalize().dot(facing) > 0.2)) (best = d), (this.nearby = t);
      }
    }

    // Exits
    const foot = this.paint.toPixel(player.pos);
    for (const e of this.exits) {
      const inside = pointInPolygon(foot.x, foot.y, e.zone);
      if (inside && !e.inside) this.toast(e.line);
      e.inside = inside;
    }
    player.obstacle.x = player.pos.x;
    player.obstacle.z = player.pos.z;
  }

  // Inkblot: pecks about, hops now and then, and flies up to a lamp or the well if you crowd him.
  updateCrow(dt) {
    const C = this.crow, crow = C.actor, pos = crow.root.position;
    const player = this.player;
    C.timer -= dt;
    if (C.state === 'fly') {
      const f = C.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = f.t;
      pos.lerpVectors(f.from, f.to, e);
      pos.y += Math.sin(Math.PI * e) * f.arc;
      crow.root.rotation.y = turnToward(crow.root.rotation.y, Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z), 10, dt);
      if (f.t >= 1) {
        C.state = 'stand';
        C.high = f.high;
        C.timer = f.high ? 5 + Math.random() * 6 : 2 + Math.random() * 3;
      }
    } else if (C.state === 'hop') {
      const f = C.flight;
      f.t = Math.min(1, f.t + dt / 0.28);
      pos.lerpVectors(f.from, f.to, f.t);
      pos.y += Math.sin(Math.PI * f.t) * 0.12;
      if (f.t >= 1) (C.state = 'stand'), (C.timer = 0.4 + Math.random() * 1.6);
    } else if (!this.talking || this.talking.thing.crow !== true) {
      const near = pos.distanceTo(player.pos) < 1.1 && !C.high;
      if (near && !this.talking) this.crowFlee(false);
      else if (C.timer < 0) {
        if (C.high) this.crowFly(this.pickPerch(false), false);
        else this.crowHop();
      }
    }
    const ground = C.state === 'stand' && !C.high ? this.walk.heightAt(pos.x, pos.z, 0) : this.walk.heightAt(pos.x, pos.z, 0);
    crow.update(dt, C.state === 'fly' ? 'fly' : 'stand', ground);
  }

  crowHop() {
    const C = this.crow, pos = C.actor.root.position;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, d = 0.25 + Math.random() * 0.35;
      const to = new THREE.Vector3(pos.x + Math.sin(a) * d, 0, pos.z + Math.cos(a) * d);
      if (!this.walk.canStand(to.x, to.z, 0.1, null, false)) continue;
      to.y = this.walk.heightAt(to.x, to.z);
      C.actor.root.rotation.y = a;
      C.state = 'hop';
      C.flight = { from: pos.clone(), to, t: 0 };
      return;
    }
    C.timer = 1;
  }

  pickPerch(high) {
    const list = high ? this.perches.high : this.perches.ground;
    const p = this.player.pos;
    const options = list.filter((v) => v.distanceTo(p) > 2.5 && v.distanceTo(this.crow.actor.root.position) > 0.5);
    return (options.length ? options : list)[Math.floor(Math.random() * (options.length || list.length))];
  }

  crowFlee(afterTalk) {
    this.crowFly(this.pickPerch(true), true);
    if (!afterTalk) this.audio.sfx('kraa');
  }

  crowFly(to, high) {
    const C = this.crow, from = C.actor.root.position.clone();
    const dist = from.distanceTo(to);
    C.state = 'fly';
    C.flight = { from, to: to.clone(), t: 0, dur: 0.5 + dist / 5, arc: 0.6 + dist * 0.12, high };
    this.audio.sfx('flap');
  }

  // After the 3D frame is drawn: place the "!" and the dialogue over the right spots on screen.
  afterRender() {
    const bang = $('bang');
    const show = !!this.nearby && !this.talking && !this.stage.revealing;
    bang.hidden = !show;
    if (show) {
      const p = this.stage.worldToScreen(this.player.pos.clone().setY(this.player.pos.y + 1.9));
      bang.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    const labels = $('labels');
    const on = this.stage.reveal.t > 0.85;
    labels.hidden = !on;
    if (on) for (const el of labels.children) {
      const at = this.labelSpots[el.dataset.spot];
      const p = this.stage.worldToScreen(at);
      const { w, h } = this.stage.cssSize;
      const ahead = at.clone().sub(this.stage.revealCam.position).dot(this.stage.revealCam.getWorldDirection(new THREE.Vector3())) > 0;
      el.hidden = !ahead || p.x < 0 || p.y < 0 || p.x > w - 40 || p.y > h;
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  }

  toast(text, sound = 'door') {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    t.classList.remove('gone');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('gone'), 3800);
    this.audio.sfx(sound);
  }

  // ---------------------------------------------------------------- buttons

  buildHud() {
    $('place-name').textContent = this.scene.title;
    $('place-sub').textContent = this.scene.subtitle;
    const touch = matchMedia('(pointer: coarse)').matches;
    $('hint').textContent = touch
      ? 'Tap anywhere to walk there. Tap a person to talk.'
      : 'Arrow keys or WASD to walk. Space to talk. Or click anywhere.';

    $('btn-backstage').addEventListener('click', () => this.toggleBackstage());
    $('btn-back').addEventListener('click', () => this.toggleBackstage(false));
    $('btn-notes').addEventListener('click', () => {
      const folded = $('backstage').classList.toggle('folded');
      $('btn-notes').textContent = folded ? 'Show notes' : 'Hide notes';
      $('btn-notes').setAttribute('aria-expanded', String(!folded));
    });
    $('btn-layers').addEventListener('click', () => this.toggleLayers());
    $('btn-pixels').addEventListener('click', () => {
      const sizes = [0, 1, 2];
      const next = sizes[(sizes.indexOf(this.stage.pixelSize) + 1) % sizes.length];
      this.stage.setPixelSize(next);
      $('btn-pixels').textContent = next ? `Pixels ${next}×` : 'Pixels off';
    });
    $('btn-sound').addEventListener('click', () => {
      this.audio.unlock();
      const on = !this.audio.enabled;
      this.audio.setEnabled(on);
      this.audio.setMusicEnabled(on);
      $('btn-sound').setAttribute('aria-pressed', String(on));
      $('btn-sound').textContent = on ? 'Sound on' : 'Sound off';
    });
    $('bang').addEventListener('click', () => this.nearby && this.talk(this.nearby));
    $('talk').addEventListener('click', () => this.advance());

    // Where the labels sit behind the scenes
    const card = (name) => {
      const c = this.stage.cutouts.cards.find((k) => k.name === name);
      const box = new THREE.Box3().setFromObject(c.mesh);
      return box.getCenter(new THREE.Vector3()).setY(box.max.y + 0.2);
    };
    const cam = this.paint.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.labelSpots = {
      painting: cam.position.clone().addScaledVector(forward, this.paint.distance * 1.45).add(new THREE.Vector3(0, 9.5, 0)),
      camera: cam.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
      floor: this.paint.toWorld(1150, 980),
      well: card('well'),
      lamp: card('lamp post, bottom right'),
    };
  }

  toggleBackstage(on = !this.stage.reveal.on) {
    this.audio.unlock();
    const R = this.stage.reveal;
    R.on = on;
    R.idle = 0;
    $('backstage').hidden = !on;
    $('btn-backstage').setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('backstage', on);
    this.audio.sfx(on ? 'chime' : 'back');
  }

  toggleLayers() {
    this.stage.showGuides = !this.stage.showGuides;
    this.stage.cutouts.uniforms.tintAmount.value = this.stage.showGuides ? 1 : 0;
    $('btn-layers').setAttribute('aria-pressed', String(this.stage.showGuides));
    this.audio.sfx('select');
  }
}

// Sparks off the anvil: little additive points that fly up and fall.
class Sparks {
  constructor(world, color = '#ffc46b', gravity = 7) {
    this.gravity = gravity;
    this.max = 60;
    this.list = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.max * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.points.frustumCulled = false;
    world.add(this.points);
  }
  burst(at, n) {
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.4;
      this.list.push({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s), life: 0.3 + Math.random() * 0.4 });
    }
  }
  update(dt) {
    const arr = this.points.geometry.attributes.position.array;
    this.list = this.list.filter((s) => (s.life -= dt) > 0);
    for (const [i, s] of this.list.entries()) {
      s.v.y -= this.gravity * dt;
      s.p.addScaledVector(s.v, dt);
      arr.set([s.p.x, s.p.y, s.p.z], i * 3);
    }
    this.points.geometry.setDrawRange(0, this.list.length);
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// What people say. Hilde's, Agnes's and Inkblot's first lines are from Follow Me Down Witch Way's
// dialogue.json; the rest are written for this square. Lines with no name are the witch's own thoughts.
const DIALOGUE = {
  hilde: {
    first: [
      "Ha! Evening, witch! Mind the soot. I've hammered all night, and my heart won't settle!",
      "Hear it? Bang, bang, bang, like it's still at the anvil. Ha!",
    ],
    again: [
      "Would you brew me a Heartsease Tonic sometime? That'd settle this old drum.",
      'Ha! Go on, then. That anvil won\'t hit itself. Well, it might. Ha!',
    ],
  },
  agnes: {
    first: [
      'Oh, hello, dear! Mind my wool. Now, where did I put my other needle?',
      "I can't remember my husband's name. It's right on the tip of my tongue.",
      'Such bushy eyebrows, he has. But his name? Gone, like a dropped stitch.',
    ],
    again: [
      "Something to help a ghost remember, dear. Remembrance Incense, I think it's called.",
      'Knit one, purl one, forget one.',
    ],
  },
  inkblot: {
    first: [
      'Kraa! [A glossy black crow. His amber eyes go straight to your basket.]',
      'Kraa. [He turns, and you see a gap in his tail where a feather should be.]',
    ],
    again: ['Kraa. [He fluffs up, trying to look like a crow with all his feathers.]'],
  },
  well: {
    first: [
      'The water is black and still, with the moon sitting right in the middle of it.',
      "I don't make wishes in wells. It feels like cheating when you're a witch.",
    ],
    again: ['Still the moon down there. It never gets bored of the view.'],
  },
  door: {
    first: ["St. Vesper's is locked for the night.", 'Tobias keeps the key, and Tobias keeps early hours. Mostly.'],
    again: ['Locked. Tobias is asleep, or pretending.'],
  },
  stall: {
    first: ["Mister Quill's striped stall. A sign in his curly writing says: BACK SOON. EVERYTHING IS A SWAP."],
    again: ['BACK SOON. EVERYTHING IS A SWAP. Underlined twice.'],
  },
};
