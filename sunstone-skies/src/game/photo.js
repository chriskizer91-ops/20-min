// photo.js: the photo camera (O). The game stops where it is, the HUD goes, and the camera is free to fly round the
// Captain's ship: drag to swing round her, the mouse wheel (or − and +) to come closer or stand off, a lens from wide
// to long, and the light. Save picture keeps the view as a picture file; O or Esc goes back to flying.
// (After the photo camera in the version of the game made with ChatGPT that Chris sent.)
import { emit } from './events.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// env: { camera, renderer, scene, player(), cam, canFly() (in flight, not in port or going down), pause(on), input }
export function makePhoto(env) {
  const $ = (id) => document.getElementById(id), stage = env.renderer.domElement;
  let shot = null; // the photo camera, while it's out: where it's looking from, and what to put back after

  function enter() {
    if (shot || !env.canFly()) return false;
    const P = env.player(), c = env.camera, target = P.pos.clone();
    target.y += P.ship.recipe.length * 0.22 + 2;
    const off = c.position.clone().sub(target), dist = off.length();
    shot = {
      target, dist, yaw: Math.atan2(off.x, off.z), pitch: Math.asin(clamp(off.y / Math.max(1, dist), -0.99, 0.99)),
      min: P.ship.recipe.length * 0.65 + 10, drag: null,
      put: { fov: c.fov, exposure: env.renderer.toneMappingExposure, pos: c.position.clone(), q: c.quaternion.clone() },
    };
    if (document.pointerLockElement) document.exitPointerLock();
    env.pause(true);
    document.body.classList.add('photo');
    $('photo').hidden = false;
    $('photo-lens').value = String(Math.round(c.fov)); $('photo-lens-n').textContent = `${Math.round(c.fov)}°`;
    $('photo-light').value = String(Math.round(env.renderer.toneMappingExposure * 100));
    $('photo-note').textContent = '';
    emit('mode', { mode: 'photo' });
    return true;
  }
  function exit() {
    if (!shot) return;
    const c = env.camera, put = shot.put;
    shot = null;
    c.fov = put.fov; c.updateProjectionMatrix(); c.position.copy(put.pos); c.quaternion.copy(put.q);
    env.renderer.toneMappingExposure = put.exposure;
    document.body.classList.remove('photo');
    $('photo').hidden = true;
    env.pause(false);
    emit('mode', { mode: 'flight' });
  }
  // place the camera for the picture, every frame while it's out
  function frame() {
    if (!shot) return;
    const c = env.camera, cp = Math.cos(shot.pitch);
    c.position.set(shot.target.x + Math.sin(shot.yaw) * cp * shot.dist, Math.max(20, shot.target.y + Math.sin(shot.pitch) * shot.dist), shot.target.z + Math.cos(shot.yaw) * cp * shot.dist);
    c.lookAt(shot.target);
    c.fov = Number($('photo-lens').value); c.updateProjectionMatrix();
    env.renderer.toneMappingExposure = Number($('photo-light').value) / 100;
  }
  const zoom = (k) => { if (shot) shot.dist = clamp(shot.dist * k, shot.min, 4500); };
  function save() {
    if (!shot) return null;
    try {
      frame(); env.renderer.render(env.scene, env.camera); // the picture is read straight after drawing it
      const url = env.renderer.domElement.toDataURL('image/png'), a = document.createElement('a');
      a.download = `Sunstone Skies ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`; a.href = url;
      document.body.append(a); a.click(); a.remove();
      $('photo-note').textContent = 'Picture saved, into your downloads.';
      return url;
    } catch {
      $('photo-note').textContent = 'The picture couldn\'t be saved here: use your computer\'s screenshot keys.';
      return null;
    }
  }

  $('btn-photo').addEventListener('click', () => (shot ? exit() : enter()));
  $('photo-back').addEventListener('click', exit);
  $('photo-save').addEventListener('click', save);
  $('photo-in').addEventListener('click', () => zoom(1 / 1.18));
  $('photo-out').addEventListener('click', () => zoom(1.18));
  $('photo-lens').addEventListener('input', () => { $('photo-lens-n').textContent = `${$('photo-lens').value}°`; });
  // the mouse flies the photo camera, and nothing else, while it's out
  stage.addEventListener('pointerdown', (e) => {
    if (!shot) return;
    e.preventDefault(); e.stopImmediatePropagation();
    shot.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { stage.setPointerCapture(e.pointerId); } catch { /* still works */ }
  }, true);
  stage.addEventListener('pointermove', (e) => {
    if (!shot) return;
    e.stopImmediatePropagation();
    const d = shot.drag; if (!d || d.id !== e.pointerId) return;
    shot.yaw -= (e.clientX - d.x) * 0.006; shot.pitch = clamp(shot.pitch + (e.clientY - d.y) * 0.004, -0.28, 1.43);
    d.x = e.clientX; d.y = e.clientY;
  }, true);
  for (const type of ['pointerup', 'pointercancel']) stage.addEventListener(type, (e) => { if (shot) { e.stopImmediatePropagation(); shot.drag = null; } }, true);
  for (const type of ['mousedown', 'mouseup']) stage.addEventListener(type, (e) => { if (shot) e.stopImmediatePropagation(); }, true);
  stage.addEventListener('wheel', (e) => { if (!shot) return; e.preventDefault(); e.stopImmediatePropagation(); zoom(Math.exp(Math.sign(e.deltaY) * 0.1)); }, { capture: true, passive: false });
  addEventListener('keydown', (e) => {
    if (!shot) return;
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'o') { e.preventDefault(); e.stopImmediatePropagation(); exit(); }
    else if (k === '+' || k === '=') { zoom(1 / 1.18); e.stopImmediatePropagation(); }
    else if (k === '-') { zoom(1.18); e.stopImmediatePropagation(); }
    else e.stopImmediatePropagation(); // the game's own keys wait until the photo camera is put away
  }, true);

  return { enter, exit, frame, save, get on() { return !!shot; }, get view() { return shot && { yaw: shot.yaw, pitch: shot.pitch, dist: shot.dist }; } };
}
