
/* Free flight, navigation courses and a pause-and-orbit photo camera. */
(() => {
  'use strict';
  function setup() {
    const A = window.Aether, game = A?.game;
    if (!game || document.getElementById('explore-tools')) return;
    const $ = id => document.getElementById(id);
    const html = (tag, id, markup) => {
      const el = document.createElement(tag); el.id = id; el.innerHTML = markup;
      document.body.append(el); return el;
    };
    const portButton = document.createElement('button');
    portButton.id = 'explore-launch'; portButton.type = 'button'; portButton.className = 'plain';
    portButton.textContent = 'Explore the skies';
    portButton.title = 'Free flight: no enemy waves. Fly a navigation course or take photographs.';
    $('btn-sail').parentElement.append(portButton);
    const tools = html('section', 'explore-tools', '<div id="explore-mode">FREE FLIGHT</div><div class="explore-buttons"><button id="explore-course" type="button">Flight course</button><button id="explore-photo" type="button" title="Photo camera (O)">Photo</button></div><div id="explore-course-note"></div>');
    tools.setAttribute('aria-label', 'Exploration and camera controls');
    const nav = html('section', 'explore-nav', '<div id="explore-nav-heading"><span id="explore-nav-arrow">↑</span><b id="explore-nav-title">Waypoint</b><span id="explore-nav-distance"></span></div><p id="explore-nav-detail"></p><div><button id="explore-clear" type="button">Clear waypoint</button><button id="explore-cancel-course" type="button">End course</button></div>');
    nav.setAttribute('aria-live', 'off');
    const marker = html('div', 'explore-beacon', '<span>◇</span><b></b>');
    const mapOverlay = html('canvas', 'explore-map-overlay', '');
    const mapClose = html('button', 'explore-map-close', 'Close map'); mapClose.type = 'button';
    const photoUI = html('section', 'explore-photo-ui', '<div class="explore-photo-bar"><div><b>Photo camera</b><small>Drag to orbit · scroll or + / − to zoom</small></div><button id="explore-photo-save" type="button">Save picture</button><button id="explore-photo-exit" type="button">Return to flight</button></div><div class="explore-photo-settings"><button id="explore-photo-out" type="button" aria-label="Zoom out">−</button><button id="explore-photo-in" type="button" aria-label="Zoom in">+</button><label>Lens <input id="explore-photo-fov" type="range" min="25" max="85" value="55"><span id="explore-photo-lens">55°</span></label><label>Light <input id="explore-photo-light" type="range" min="65" max="150" value="100"></label></div><p id="explore-photo-message" aria-live="polite"></p>');
    photoUI.hidden = true;
    let waypoint = null, course = null, rings = null, photo = null, previousMode = '', previousExplore = false;
    let elapsedAt = performance.now(), lastUI = 0, lastMap = 0, lastPos = null;
    const map = $('minimap');
    const vec = (x, y, z) => game.player.pos.clone().set(x, y, z);
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const seconds = value => `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
    function trialData() {
      let data = game.progress.data.exploreTrials;
      if (!data || typeof data !== 'object' || Array.isArray(data)) data = game.progress.data.exploreTrials = {};
      if (!data.best || typeof data.best !== 'object' || Array.isArray(data.best)) data.best = {};
      return data;
    }
    function tell(text) {
      $('explore-course-note').textContent = text;
      A.emit?.('exploration:message', { text });
    }
    function removeRings() {
      if (!rings) return;
      game.scene.remove(rings);
      rings.traverse(child => { child.geometry?.dispose(); child.material?.dispose(); });
      rings = null;
    }
    function createRings(points, origin) {
      removeRings();
      const T = A.THREE;
      if (!T?.BufferGeometry || !T.Mesh) return;
      rings = new T.Group(); rings.name = 'Exploration flight course';
      points.forEach((p, index) => {
        const verts = [], radius = 120, thickness = 7, steps = 72;
        for (let segment = 0; segment < steps; segment++) {
          const a = segment / steps * Math.PI * 2, b = (segment + 1) / steps * Math.PI * 2;
          const p0 = [Math.cos(a) * (radius - thickness), Math.sin(a) * (radius - thickness), 0];
          const p1 = [Math.cos(a) * (radius + thickness), Math.sin(a) * (radius + thickness), 0];
          const p2 = [Math.cos(b) * (radius + thickness), Math.sin(b) * (radius + thickness), 0];
          const p3 = [Math.cos(b) * (radius - thickness), Math.sin(b) * (radius - thickness), 0];
          verts.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(verts), 3));
        const material = new T.MeshBasicMaterial({ color: index ? 0x9adcee : 0xffd277, side: T.DoubleSide, transparent: true, opacity: index ? .34 : .9, depthWrite: false, toneMapped: false });
        const mesh = new T.Mesh(geometry, material); mesh.position.copy(p);
        const prior = index ? points[index - 1] : origin;
        mesh.rotation.y = Math.atan2(p.x - prior.x, p.z - prior.z);
        mesh.userData.checkpoint = index; rings.add(mesh);
      });
      game.scene.add(rings);
    }
    function startTrial() {
      if (!window.__aetherExplore || game.mode !== 'voyage' || game.paused || photo) return;
      const p = game.player, origin = p.pos.clone(), heading = p.heading;
      const f = { x: Math.sin(heading), z: Math.cos(heading) }, r = { x: Math.cos(heading), z: -Math.sin(heading) };
      const coursePoints = [[0, 420, 0], [100, 850, 55], [230, 1270, 90], [170, 1690, 35], [-30, 2110, -45], [0, 2520, 0]];
      const points = coursePoints.map(([side, forward, altitude]) => vec(origin.x + f.x * forward + r.x * side, clamp(origin.y + altitude, 220, 2000), origin.z + f.z * forward + r.z * side));
      course = { points, next: 0, time: 0, ship: p.ship.recipe.id, origin };
      waypoint = null; lastPos = origin.clone(); createRings(points, origin);
      const mapWasExpanded = map.classList.contains('big');
      map.classList.remove('big'); if (mapWasExpanded) window.dispatchEvent(new Event('resize')); $('explore-course').textContent = 'Restart course';
      tell('Six rings ahead. Fly through the gold ring; use surge for a faster time.');
      A.emit?.('course:start', { ship: course.ship });
    }
    function stopTrial(message = '') {
      course = null; lastPos = null; removeRings();
      $('explore-course').textContent = 'Flight course';
      if (message) tell(message);
    }
    function completeTrial() {
      const finished = course, data = trialData(), old = Number(data.best[finished.ship]) || 0;
      const improved = !old || finished.time < old;
      if (improved) data.best[finished.ship] = finished.time;
      let reward = 0;
      if (!data.rewarded) { data.rewarded = true; reward = 80; game.progress.data.shards += reward; }
      game.progress.save();
      stopTrial(`Course complete · ${seconds(finished.time)}${improved ? ' · New ship best!' : ` · Best ${seconds(old)}`}${reward ? ' · ◆ 80 banked' : ''}`);
      A.emit?.('course:finish', { time: finished.time, improved, reward });
    }
    function setWaypoint(x, z) {
      if (!game.player || !window.__aetherExplore) return;
      stopTrial(); waypoint = vec(clamp(x, -11520, 11520), game.player.pos.y, clamp(z, -7680, 7680));
      tell('Waypoint set. Follow the bearing below.');
    }
    function enterPhoto() {
      if (game.mode !== 'voyage' || !game.player || game.player.down || game.paused || photo) return;
      const camera = game.camera, p = game.player;
      const target = p.pos.clone(); target.y += p.ship.recipe.length * .22 + 2;
      const offset = camera.position.clone().sub(target), dist = offset.length();
      photo = { target, yaw: Math.atan2(offset.x, offset.z), pitch: Math.asin(clamp(offset.y / dist, -.99, .99)), dist, fov: camera.fov, exposure: game.renderer.toneMappingExposure, cameraPos: camera.position.clone(), quaternion: camera.quaternion.clone(), camYaw: game.cam.yaw, camPitch: game.cam.pitch, camZoom: game.cam.zoom, drag: null, minDist: p.ship.recipe.length * .65 + 10 };
      game.pause(true); game.input.active = false;
      if (document.pointerLockElement) document.exitPointerLock();
      document.body.classList.add('explore-photo'); photoUI.hidden = false;
      $('explore-photo-fov').value = String(Math.round(camera.fov)); $('explore-photo-lens').textContent = `${Math.round(camera.fov)}°`;
      $('explore-photo-light').value = String(Math.round(photo.exposure * 100)); $('explore-photo-message').textContent = '';
      if (rings) rings.visible = false;
    }
    function exitPhoto(resume = true) {
      if (!photo) return;
      const saved = photo; photo = null;
      game.camera.position.copy(saved.cameraPos); game.camera.quaternion.copy(saved.quaternion);
      game.camera.fov = saved.fov; game.camera.updateProjectionMatrix();
      game.renderer.toneMappingExposure = saved.exposure;
      Object.assign(game.cam, { yaw: saved.camYaw, pitch: saved.camPitch, zoom: saved.camZoom });
      document.body.classList.remove('explore-photo'); photoUI.hidden = true;
      if (rings) rings.visible = true;
      if (resume && game.mode === 'voyage') game.pause(false);
    }
    function drawPhoto() {
      if (!photo) return;
      const c = game.camera, cp = Math.cos(photo.pitch);
      c.position.set(photo.target.x + Math.sin(photo.yaw) * cp * photo.dist, Math.max(12, photo.target.y + Math.sin(photo.pitch) * photo.dist), photo.target.z + Math.cos(photo.yaw) * cp * photo.dist);
      c.lookAt(photo.target); c.fov = Number($('explore-photo-fov').value); c.updateProjectionMatrix();
      game.renderer.toneMappingExposure = Number($('explore-photo-light').value) / 100;
      game.renderer.render(game.scene, c);
    }
    portButton.addEventListener('click', () => {
      waypoint = null; stopTrial(); A.startExplore();
      tell('Tap the map to enlarge it, then tap anywhere to set a waypoint.');
    });
    $('explore-course').addEventListener('click', startTrial);
    $('explore-cancel-course').addEventListener('click', () => stopTrial('Course ended. Free flight continues.'));
    $('explore-clear').addEventListener('click', () => { waypoint = null; tell('Waypoint cleared.'); });
    $('explore-photo').addEventListener('click', enterPhoto);
    $('explore-photo-exit').addEventListener('click', () => exitPhoto());
    $('explore-photo-in').addEventListener('click', () => { if (photo) photo.dist = Math.max(photo.minDist, photo.dist / 1.18); });
    $('explore-photo-out').addEventListener('click', () => { if (photo) photo.dist = Math.min(4500, photo.dist * 1.18); });
    $('explore-photo-fov').addEventListener('input', () => { $('explore-photo-lens').textContent = `${$('explore-photo-fov').value}°`; });
    $('explore-photo-save').addEventListener('click', () => {
      if (!photo) return;
      try {
        drawPhoto(); const link = document.createElement('a');
        link.download = `Aethermoor-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
        link.href = game.renderer.domElement.toDataURL('image/png'); document.body.append(link); link.click(); link.remove();
        $('explore-photo-message').textContent = 'Picture saved. On mobile you can also take a screenshot.';
      } catch (_) { $('explore-photo-message').textContent = 'Use your device screenshot controls to capture this view.'; }
    });
    const stage = game.renderer.domElement;
    stage.addEventListener('pointerdown', event => {
      if (!photo) return; event.preventDefault(); event.stopImmediatePropagation();
      photo.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      stage.setPointerCapture?.(event.pointerId);
    }, true);
    stage.addEventListener('pointermove', event => {
      if (!photo) return; event.preventDefault(); event.stopImmediatePropagation();
      const drag = photo.drag; if (!drag || drag.id !== event.pointerId) return;
      photo.yaw -= (event.clientX - drag.x) * .006;
      photo.pitch = clamp(photo.pitch + (event.clientY - drag.y) * .004, -.28, 1.43);
      drag.x = event.clientX; drag.y = event.clientY;
    }, true);
    for (const type of ['pointerup', 'pointercancel']) stage.addEventListener(type, event => {
      if (photo) { event.preventDefault(); event.stopImmediatePropagation(); photo.drag = null; }
    }, true);
    stage.addEventListener('wheel', event => {
      if (!photo) return; event.preventDefault(); event.stopImmediatePropagation();
      photo.dist = clamp(photo.dist * Math.exp(Math.sign(event.deltaY) * .1), photo.minDist, 4500);
    }, { capture: true, passive: false });
    stage.addEventListener('mousedown', event => { if (photo) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    document.addEventListener('keydown', event => {
      if (photo && (event.key === 'Escape' || event.key.toLowerCase() === 'o')) {
        event.preventDefault(); event.stopImmediatePropagation(); exitPhoto();
      } else if (!/input|select|textarea/i.test(event.target.tagName) && !photo && event.key.toLowerCase() === 'o' && game.mode === 'voyage') {
        event.preventDefault(); event.stopImmediatePropagation(); enterPhoto();
      }
    }, true);
    map.addEventListener('click', event => {
      if (!window.__aetherExplore || !map.classList.contains('big')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const box = map.getBoundingClientRect();
      setWaypoint(((event.clientX - box.left) / box.width - .5) * 23040, ((event.clientY - box.top) / box.height - .5) * 15360);
      map.classList.remove('big');
      window.dispatchEvent(new Event('resize'));
    }, true);
    mapClose.addEventListener('click', () => { map.classList.remove('big'); window.dispatchEvent(new Event('resize')); });
    function drawMap() {
      const shown = game.mode === 'voyage' && window.__aetherExplore && !photo;
      mapOverlay.hidden = !shown; mapClose.hidden = !shown || !map.classList.contains('big');
      if (!shown) return;
      const box = map.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
      mapOverlay.style.left = `${box.left}px`; mapOverlay.style.top = `${box.top}px`;
      mapOverlay.style.width = `${box.width}px`; mapOverlay.style.height = `${box.height}px`;
      const width = Math.round(box.width * dpr), height = Math.round(box.height * dpr);
      if (mapOverlay.width !== width || mapOverlay.height !== height) { mapOverlay.width = width; mapOverlay.height = height; }
      const ctx = mapOverlay.getContext('2d'); ctx.clearRect(0, 0, width, height);
      const to = p => [(p.x / 23040 + .5) * width, (p.z / 15360 + .5) * height];
      if (course) {
        ctx.beginPath(); let points = [course.origin, ...course.points];
        points.forEach((p, index) => { const [x, y] = to(p); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.strokeStyle = '#e8c87aaa'; ctx.lineWidth = Math.max(1, dpr); ctx.stroke();
        if (map.classList.contains('big')) course.points.forEach((p, index) => {
          if (index < course.next) return; const [x, y] = to(p);
          ctx.beginPath(); ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2); ctx.fillStyle = index === course.next ? '#ffd277' : '#8ccbdd'; ctx.fill();
          ctx.font = `${11 * dpr}px system-ui`; ctx.fillStyle = '#101b2b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), x, y);
        });
      }
      if (waypoint) {
        const [x, y] = to(waypoint), size = 7 * dpr;
        ctx.fillStyle = '#b3f0ff'; ctx.strokeStyle = '#17364b'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    function updateNavigation() {
      const p = game.player, target = course ? course.points[course.next] : waypoint;
      nav.hidden = !target || game.mode !== 'voyage' || photo;
      marker.hidden = nav.hidden;
      $('explore-clear').hidden = !waypoint; $('explore-cancel-course').hidden = !course;
      if (!target || nav.hidden || !p) return;
      const dx = target.x - p.pos.x, dz = target.z - p.pos.z, distance = Math.hypot(dx, dz);
      const bearing = Math.atan2(dx, dz), turn = Math.atan2(Math.sin(bearing - p.heading), Math.cos(bearing - p.heading));
      $('explore-nav-arrow').style.transform = `rotate(${-turn}rad)`;
      $('explore-nav-title').textContent = course ? `Ring ${course.next + 1} / 6` : 'Waypoint';
      $('explore-nav-distance').textContent = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
      const best = course ? Number(trialData().best[course.ship]) : 0;
      $('explore-nav-detail').textContent = course ? `${seconds(course.time)} · Ring altitude ${Math.round(target.y)} m${best ? ` · Best ${seconds(best)}` : ''}` : 'Tap the enlarged map to choose another destination.';
      const projected = target.clone(); if (!course) projected.y = p.pos.y + 30; projected.project(game.camera);
      const behind = projected.z > 1, edgeX = innerWidth * .43, edgeY = innerHeight * .34;
      let sx = projected.x * innerWidth / 2 * (behind ? -1 : 1), sy = -projected.y * innerHeight / 2 * (behind ? -1 : 1);
      const scale = Math.max(Math.abs(sx) / edgeX, Math.abs(sy) / edgeY, behind ? 1.1 : 1);
      sx /= scale; sy /= scale;
      marker.style.left = `${innerWidth / 2 + sx}px`; marker.style.top = `${innerHeight / 2 + sy}px`;
      marker.classList.toggle('edge', behind || scale > 1);
      marker.querySelector('b').textContent = course ? `${course.next + 1}` : 'Waypoint';
      if (waypoint && distance < 130) { waypoint = null; nav.hidden = true; marker.hidden = true; tell('Waypoint reached. Choose another destination on the map.'); A.emit?.('waypoint:arrived', {}); }
    }
    function frame(now) {
      const dt = Math.min(.15, Math.max(0, (now - elapsedAt) / 1000)); elapsedAt = now;
      const exploring = game.mode === 'voyage' && !!window.__aetherExplore;
      if (game.mode !== previousMode || exploring !== previousExplore) {
        if (!exploring) { waypoint = null; stopTrial(); }
        if (photo && game.mode !== 'voyage') exitPhoto(false);
        document.body.classList.toggle('exploring', exploring);
        previousMode = game.mode; previousExplore = exploring;
        if (exploring) tell('Free flight · no raiders. Tap the map to set a waypoint, or try a flight course.');
      }
      tools.hidden = game.mode !== 'voyage' || photo;
      $('explore-course').hidden = !exploring;
      $('explore-mode').hidden = !exploring;
      $('explore-course-note').hidden = !exploring;
      if (photo) drawPhoto();
      if (course && exploring && !game.paused && !photo) {
        course.time += dt;
        const p = game.player.pos, target = course.points[course.next];
        if (p.distanceTo(target) < 120) {
          if (rings) rings.children[course.next].visible = false;
          course.next++;
          if (course.next === course.points.length) completeTrial();
          else {
            const nextRing = rings?.children[course.next];
            if (nextRing) { nextRing.material.color.setHex(0xffd277); nextRing.material.opacity = .9; }
            A.emit?.('course:checkpoint', { next: course.next });
          }
        }
        lastPos = p.clone();
      }
      if (now - lastUI > 70) { updateNavigation(); lastUI = now; }
      if (now - lastMap > 90) { drawMap(); lastMap = now; }
      requestAnimationFrame(frame);
    }
    A.exploration = { startTrial, stopTrial, setWaypoint, enterPhoto, exitPhoto, get course() { return course; }, get waypoint() { return waypoint; }, get photo() { return photo; } };
    requestAnimationFrame(frame);
  }
  document.addEventListener('aether:ready', setup, { once: true });
  if (window.Aether?.game?.ready) setup();
})();

