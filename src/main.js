import * as THREE from 'three';
import sceneData from '../scenes/wickhollow-square.json';
import { images, fonts } from './assets.js';
import { PaintCamera, ring } from './paint.js';
import { Walkmesh } from './walkmesh.js';
import { buildCutouts, LAYER_GUIDES, LAYER_BACKSTAGE } from './layers.js';
import { Stage, LAYER_GLOW } from './stage.js';
import { createWitch } from './actors/witch.js';
import { glowSprite, turnToward } from './actors/kit.js';
import { createKeys } from './input.js';
import { Field } from './field.js';

const WALK_SPEED = 2.3; // meters per second

async function boot() {
  loadFonts();
  const canvas = document.getElementById('stage');
  const painting = await loadTexture(images[sceneData.image]);
  const paint = new PaintCamera(sceneData.size, sceneData.camera);
  const walk = new Walkmesh(sceneData, paint);

  const world = new THREE.Scene();
  const cutouts = buildCutouts(sceneData, paint, painting);
  world.add(cutouts.group);
  world.add(buildGuides(walk, cutouts));
  const backstage = buildBackstage(paint, painting, cutouts);
  world.add(backstage);
  const cameraModel = backstage.getObjectByName('painter-camera');
  const lamps = addLights(world, sceneData, paint);

  const stage = new Stage(canvas, { paint, painting, world, cutouts });
  const center = walk.bounds.getCenter(new THREE.Vector3());
  stage.target.set(center.x, 0.5, center.z);

  const witch = createWitch();
  world.add(witch.root);
  const player = {
    actor: witch,
    pos: paint.toWorld(...sceneData.spawn.pixel),
    heading: { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[sceneData.spawn.facing] ?? 0,
    path: null,
    onArrive: null,
    radius: 0.18,
  };
  player.obstacle = { x: player.pos.x, z: player.pos.z, r: player.radius, off: true };

  const field = new Field({ world, walk, paint, stage, player, scene: sceneData });
  walk.buildGrid(player.radius);

  const keys = createKeys((what) => field.onKey(what));
  field.keys = keys;
  addEventListener('resize', () => stage.resize());

  let last = performance.now();
  let time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    // Walking: keys first; otherwise follow a tapped path.
    let speed = 0, turn = 0;
    const before = player.heading;
    const dir = field.canWalk() ? keys.vector() : null;
    if (dir) {
      player.path = null;
      player.onArrive = null;
      player.heading = turnToward(player.heading, Math.atan2(dir.x, dir.z), 18, dt);
      if (walk.step(player.pos, dir.x * WALK_SPEED * dt, dir.z * WALK_SPEED * dt, player.radius, player.obstacle)) speed = WALK_SPEED;
    } else if (player.path && field.canWalk()) {
      const next = player.path[0];
      const dx = next.x - player.pos.x, dz = next.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = WALK_SPEED * dt;
      if (dist <= stepLen) {
        player.pos.set(next.x, 0, next.z);
        player.path.shift();
        if (!player.path.length) {
          player.path = null;
          const done = player.onArrive;
          player.onArrive = null;
          done?.();
        }
      } else {
        player.heading = turnToward(player.heading, Math.atan2(dx, dz), 14, dt);
        if (!walk.step(player.pos, (dx / dist) * stepLen, (dz / dist) * stepLen, player.radius, player.obstacle)) player.path = null;
      }
      speed = WALK_SPEED;
    }
    turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before)) / Math.max(dt, 1e-3);
    player.pos.y = walk.heightAt(player.pos.x, player.pos.z, player.pos.y);
    witch.root.position.copy(player.pos);
    witch.root.rotation.y = player.heading;
    witch.update(dt, speed, turn);

    field.update(dt, time);
    for (const lamp of lamps) lamp.flicker(time);

    const focus = paint.toPixel(player.pos.clone().add(new THREE.Vector3(0, 0.8, 0)));
    stage.setFocus(focus);
    stage.update(dt);
    // The little camera model is where the view starts from, so keep it out of the way until we've left it.
    cameraModel.visible = stage.revealCam.position.distanceTo(paint.camera.position) > 8;
    stage.render();
    field.afterRender();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    stage.setFocus(paint.toPixel(player.pos), true);
    frame(now);
    document.body.classList.add('ready');
  });

  // A handle for tests and for poking at things from the browser console.
  window.__game = { THREE, paint, walk, stage, player, field, world, witch };
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, reject);
  });
}

function loadFonts() {
  for (const [family, url] of Object.entries(fonts)) {
    const face = new FontFace(family, `url(${url})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => {});
  }
}

// The floor and the cut-outs drawn as see-through colors, for "Show layers" and "Behind the scenes".
function buildGuides(walk, cutouts) {
  const group = new THREE.Group();
  group.name = 'guides';
  const pos = [];
  for (const t of walk.tris) for (const v of [t.a, t.b, t.c]) pos.push(v.x, v.y + 0.01, v.z);
  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#35e6ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(fillGeo), new THREE.LineBasicMaterial({ color: '#35e6ff', transparent: true, opacity: 0.35 }));
  const edgePos = [];
  for (const [a, b] of walk.edges) edgePos.push(a.x, a.y + 0.02, a.z, b.x, b.y + 0.02, b.z);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: '#8ff4ff' }));
  for (const o of [fill, wire, edges]) {
    o.layers.set(LAYER_GUIDES);
    o.frustumCulled = false;
    group.add(o);
  }
  return group;
}

// Things only seen behind the scenes: the painting as a flat backdrop, the painter's camera and its
// view lines, and the outline of every cut-out card.
function buildBackstage(paint, painting, cutouts) {
  const group = new THREE.Group();
  group.name = 'backstage';
  const cam = paint.camera;
  const depth = paint.distance * 1.45;
  const h = 2 * depth * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const w = h * cam.aspect;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: painting, side: THREE.DoubleSide }));
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  backdrop.position.copy(cam.position).addScaledVector(forward, depth);
  backdrop.quaternion.copy(cam.quaternion);
  group.add(backdrop);

  // The camera itself: a little box with a lens, and lines out to the painting's corners.
  const body = new THREE.Group();
  body.position.copy(cam.position);
  body.quaternion.copy(cam.quaternion);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.8), new THREE.MeshBasicMaterial({ color: '#f5d88a' }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.8, 12), new THREE.MeshBasicMaterial({ color: '#b8923e' }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -1.2;
  body.add(box, lens);
  body.name = 'painter-camera';
  group.add(body);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
    backdrop.position.clone()
      .add(new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar((x * w) / 2))
      .add(new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion).multiplyScalar((y * h) / 2)));
  const lines = [];
  for (const c of corners) lines.push(cam.position.x, cam.position.y, cam.position.z, c.x, c.y, c.z);
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; lines.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#f5d88a', transparent: true, opacity: 0.55 })));

  // Card outlines
  const cardLines = [];
  for (const card of cutouts.cards) {
    const p = card.mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3)
      for (const [a, b] of [[i, i + 1], [i + 1, i + 2], [i + 2, i]])
        cardLines.push(p.getX(a), p.getY(a), p.getZ(a), p.getX(b), p.getY(b), p.getZ(b));
  }
  const cardGeo = new THREE.BufferGeometry();
  cardGeo.setAttribute('position', new THREE.Float32BufferAttribute(cardLines, 3));
  group.add(new THREE.LineSegments(cardGeo, new THREE.LineBasicMaterial({ color: '#ff5fd8', transparent: true, opacity: 0.5 })));

  group.traverse((o) => { o.layers.set(LAYER_BACKSTAGE); o.frustumCulled = false; });
  return group;
}

// Night lighting: cool moonlight from the top left (where the moon is painted), a dim violet sky, and a
// warm point light at every lamp, so she picks up lamplight as she walks past.
function addLights(world, scene, paint) {
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight('#8b80d8', '#2b1b2e', 1.35));
  const moon = new THREE.DirectionalLight('#d4cdff', 1.5);
  moon.position.set(-8, 12, -6);
  lights.add(moon, moon.target);
  const lamps = [];
  for (const l of scene.lights) {
    const base = paint.toWorld(...l.base);
    const toCam = new THREE.Vector3(paint.camera.position.x - base.x, 0, paint.camera.position.z - base.z).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(toCam, base);
    const at = paint.toPlane(...l.pixel, plane);
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
    light.position.copy(at);
    lights.add(light);
    const glow = glowSprite(l.color, l.glow ?? 1.1, 0.35, LAYER_GLOW);
    glow.material.depthTest = false;
    glow.position.copy(at);
    world.add(glow);
    const seed = Math.random() * 10;
    lamps.push({
      flicker(t) {
        const f = 1 + Math.sin(t * 7.3 + seed) * 0.05 + Math.sin(t * 13.1 + seed * 2) * 0.04;
        light.intensity = l.intensity * f;
        glow.material.opacity = 0.32 * f;
      },
    });
  }
  lights.traverse((o) => o.layers.enableAll());
  world.add(lights);
  return lamps;
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});

export { ring };
