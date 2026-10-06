// explore.js: exploring Aethermoor with no raiders about (Explore, from the start).
//   Flight course: six rings in the sky ahead, at different heights; fly through them in order, against the clock.
//     The next ring is gold. The best time for each ship is kept.
//   Waypoint: open the map (M) and click anywhere on it; the panel points the way and says how far, and a marker shows
//     where it is on screen. It's reached within 150 m.
// (After the flight courses and waypoints in the version of the game made with ChatGPT that Chris sent.)
import * as THREE from 'three';
import { emit } from './events.js';
import { MAP } from './world.js';

const BEST = 'sunstone-skies:courses:1';
// the rings, from the ship: [to the right (m), ahead (m), above her (m)]
const COURSE = [[0, 420, 0], [100, 850, 55], [230, 1270, 90], [170, 1690, 35], [-30, 2110, -45], [0, 2520, 0]];
const RING = 120; // the rings' radius: through one is within this of its middle
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// env: { scene, camera, player(), exploring(), paused() }
export function makeExplore(env) {
  const $ = (id) => document.getElementById(id);
  let course = null, waypoint = null, rings = null, lastUI = 0;
  let best = {};
  try { best = JSON.parse(localStorage.getItem(BEST) ?? '{}') ?? {}; } catch { /* no storage */ }

  const say = (text) => { $('ex-note').textContent = text; };
  function clearRings() {
    if (!rings) return;
    env.scene.remove(rings);
    rings.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    rings = null;
  }
  function start() {
    if (!env.exploring()) return;
    const P = env.player(), o = P.pos.clone(), h = P.heading;
    const f = new THREE.Vector3(Math.sin(h), 0, Math.cos(h)), right = new THREE.Vector3(-Math.cos(h), 0, Math.sin(h));
    const points = COURSE.map(([x, ahead, up]) => o.clone().addScaledVector(f, ahead).addScaledVector(right, x).setY(clamp(o.y + up, 250, 1900)));
    course = { points, next: 0, time: 0, ship: P.ship.recipe.id };
    waypoint = null; clearRings();
    rings = new THREE.Group(); rings.name = 'flight course';
    points.forEach((p, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(RING, 6, 10, 72), new THREE.MeshBasicMaterial({ color: i ? 0x9adcee : 0xffd277, transparent: true, opacity: i ? 0.4 : 0.9, depthWrite: false, toneMapped: false, fog: false }));
      m.position.copy(p);
      const from = i ? points[i - 1] : o; m.lookAt(from.x, p.y, from.z); // facing the way in
      rings.add(m);
    });
    env.scene.add(rings);
    $('ex-course').textContent = 'Start again';
    say('Six rings ahead: through the gold one, then the next. Crystal Surge helps.');
    emit('course', { what: 'start', ship: course.ship });
  }
  function stop(text = '') {
    course = null; clearRings();
    $('ex-course').textContent = 'Flight course';
    if (text) say(text);
  }
  function finish() {
    const c = course, old = best[c.ship], better = !old || c.time < old;
    if (better) { best[c.ship] = c.time; try { localStorage.setItem(BEST, JSON.stringify(best)); } catch { /* no storage */ } }
    stop(`Course done in ${clock(c.time)}${better ? (old ? ` · the ship's best, beating ${clock(old)}` : ' · the ship\'s first time') : ` · her best is ${clock(old)}`}`);
    emit('course', { what: 'finish', time: c.time, better });
  }
  // a waypoint where the big map was clicked (x and y from 0 to 1 across it)
  function point(x, y) {
    if (!env.exploring()) return false;
    stop();
    waypoint = new THREE.Vector3(clamp((x - 0.5) * MAP.w, -MAP.w / 2, MAP.w / 2), env.player().pos.y, clamp((y - 0.5) * MAP.h, -MAP.h / 2, MAP.h / 2));
    say('Waypoint set: follow the arrow.');
    emit('waypoint', { what: 'set' });
    return true;
  }

  $('ex-course').addEventListener('click', start);
  $('ex-end').addEventListener('click', () => stop('Course ended.'));
  $('ex-clear').addEventListener('click', () => { waypoint = null; say('Waypoint cleared.'); });

  const proj = new THREE.Vector3();
  function update(dt) {
    const show = env.exploring();
    $('explore').hidden = !show;
    if (!show) { if (course || waypoint) { stop(); waypoint = null; } $('beacon').hidden = true; return; }
    const P = env.player();
    if (course && !env.paused()) {
      course.time += dt;
      const ring = course.points[course.next];
      if (P.pos.distanceTo(ring) < RING) {
        rings.children[course.next].visible = false;
        course.next++;
        if (course.next === course.points.length) finish();
        else {
          const m = rings.children[course.next].material; m.color.setHex(0xffd277); m.opacity = 0.9;
          emit('course', { what: 'ring', ring: course.next });
        }
      }
    }
    if (waypoint && P.pos.distanceTo(new THREE.Vector3(waypoint.x, P.pos.y, waypoint.z)) < 150) {
      waypoint = null; say('Waypoint reached. Pick another on the map (M).');
      emit('waypoint', { what: 'reached' });
    }
    // the panel and the marker, a dozen times a second
    if ((lastUI += dt) < 0.08) return;
    lastUI = 0;
    const to = course ? course.points[course.next] : waypoint;
    $('ex-nav').hidden = !to; $('beacon').hidden = !to;
    $('ex-end').hidden = !course; $('ex-clear').hidden = !waypoint;
    const mine = best[P.ship.recipe.id];
    $('ex-best').textContent = mine ? `The ${P.ship.recipe.name}'s best course: ${clock(mine)}` : 'No course flown in this ship yet';
    if (!to) return;
    const dx = to.x - P.pos.x, dz = to.z - P.pos.z, d = Math.hypot(dx, dz), turn = Math.atan2(Math.sin(Math.atan2(dx, dz) - P.heading), Math.cos(Math.atan2(dx, dz) - P.heading));
    $('ex-arrow').style.transform = `rotate(${-turn}rad)`;
    $('ex-what').textContent = course ? `Ring ${course.next + 1} of ${course.points.length}` : 'Waypoint';
    $('ex-dist').textContent = d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
    $('ex-detail').textContent = course ? `${clock(course.time)} · the ring is at ${Math.round(to.y)} m` : `${Math.round(Math.abs(turn) * 180 / Math.PI)}° to the ${turn > 0 ? 'left' : 'right'}`;
    // the marker: where it is on screen, or pinned to the edge in its direction
    proj.copy(to); if (!course) proj.y = P.pos.y + 30; proj.project(env.camera);
    const behind = proj.z > 1, W2 = innerWidth / 2, H2 = innerHeight / 2;
    let x = proj.x * W2 * (behind ? -1 : 1), y = -proj.y * H2 * (behind ? -1 : 1);
    const k = Math.max(Math.abs(x) / (W2 * 0.86), Math.abs(y) / (H2 * 0.7), behind ? 1.1 : 1);
    x /= k; y /= k;
    const b = $('beacon'); b.style.transform = `translate(${W2 + x}px, ${H2 + y}px) translate(-50%, -50%)`;
    b.classList.toggle('edge', behind || k > 1); b.querySelector('b').textContent = course ? String(course.next + 1) : 'Waypoint';
  }
  // the course and the waypoint on the map
  function drawMap(ctx, W, H, big) {
    if (!env.exploring()) return;
    const at = (p) => [(p.x / MAP.w + 0.5) * W, (p.z / MAP.h + 0.5) * H], s = Math.max(4, W / 70);
    if (course) {
      ctx.beginPath(); course.points.forEach((p, i) => { const [x, y] = at(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.strokeStyle = 'rgba(232, 200, 122, 0.8)'; ctx.lineWidth = Math.max(1, s / 4); ctx.stroke();
      if (big) course.points.forEach((p, i) => { if (i < course.next) return; const [x, y] = at(p); ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, Math.PI * 2); ctx.fillStyle = i === course.next ? '#ffd277' : '#8ccbdd'; ctx.fill(); });
    }
    if (waypoint) {
      const [x, y] = at(waypoint);
      ctx.fillStyle = '#b3f0ff'; ctx.strokeStyle = '#17364b'; ctx.lineWidth = Math.max(1.5, s / 4);
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  return { start, stop, point, update, drawMap, get course() { return course; }, get waypoint() { return waypoint; }, get best() { return { ...best }; } };
}
