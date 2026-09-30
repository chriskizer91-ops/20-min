import * as THREE from 'three';
import { fonts } from './assets.js';
import { PaintCamera } from './paint.js';
import { Walkmesh } from './walkmesh.js';
import { buildCutouts, LAYER_GUIDES, LAYER_BACKSTAGE } from './layers.js';
import { LAYER_GLOW } from './stage.js';
import { glowSprite, turnToward } from './actors/kit.js';

// One painted screen, built from its scene file (scenes/*.json): the painter's camera, the walkmesh, the
// cut-outs, the lamps, and the pieces only seen behind the scenes. The square builds one of these; a town with
// more than one screen (src/town.js) builds one per painting and swaps between them at the exits.

export const WALK_SPEED = 2.3; // meters per second

export function buildScreen(data, painting) {
  const paint = new PaintCamera(data.size, data.camera);
  const walk = new Walkmesh(data, paint);
  const world = new THREE.Scene();
  const cutouts = buildCutouts(data, paint, painting);
  world.add(cutouts.group);
  world.add(buildGuides(walk, cutouts));
  const backstage = buildBackstage(paint, painting, cutouts);
  world.add(backstage);
  const cameraModel = backstage.getObjectByName('painter-camera');
  const lamps = addLights(world, data, paint);
  return { data, paint, painting, walk, world, cutouts, backstage, cameraModel, lamps };
}

// One frame of her walking: the keys first; otherwise follow a tapped path. `free` is false while she's talking
// or busy. Returns how fast she moved, in meters per second. Pass `paint` to make the keys follow the screen:
// through a wide lens (the Bogmire screens) "up" then goes up the painting where she stands, rather than
// straight away from the camera, which near the edges would carry her off at a slant.
export function walkPlayer(player, walk, keys, free, dt, paint = null) {
  let speed = 0;
  let dir = free ? keys.vector() : null;
  if (dir && paint) dir = screenDirection(paint, player.pos, dir);
  if (dir) {
    player.path = null;
    player.onArrive = null;
    player.heading = turnToward(player.heading, Math.atan2(dir.x, dir.z), 18, dt);
    if (walk.step(player.pos, dir.x * WALK_SPEED * dt, dir.z * WALK_SPEED * dt, player.radius, player.obstacle)) speed = WALK_SPEED;
  } else if (player.path && free) {
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
  player.pos.y = walk.heightAt(player.pos.x, player.pos.z, player.pos.y);
  return speed;
}

// The direction on the floor that shows on screen as `dir` (x right, z down the screen), where she stands.
function screenDirection(paint, pos, dir) {
  const p = paint.toPixel(pos);
  const q = paint.toWorld(p.x + dir.x * 40, p.y + dir.z * 40, pos.y);
  const x = q.x - pos.x, z = q.z - pos.z, len = Math.hypot(x, z);
  return len > 1e-6 ? { x: x / len, z: z / len } : dir;
}

export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, reject);
  });
}

export function loadFonts() {
  for (const [family, url] of Object.entries(fonts)) {
    const face = new FontFace(family, `url(${url})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => {});
  }
}

// The floor and the cut-outs drawn as see-through colors, for "Show layers" and "Behind the scenes".
export function buildGuides(walk, cutouts) {
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
export function buildBackstage(paint, painting, cutouts) {
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
// warm point light at every lamp, so she picks up lamplight as she walks past. A scene can change the sky and
// the moon with "ambient" (an indoor screen wants a warm room and only a little moon through the window).
export function addLights(world, scene, paint) {
  const A = { sky: '#8b80d8', ground: '#2b1b2e', hemi: 1.35, moon: '#d4cdff', moonlight: 1.5, moonFrom: [-8, 12, -6], ...scene.ambient };
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(A.sky, A.ground, A.hemi));
  const moon = new THREE.DirectionalLight(A.moon, A.moonlight);
  moon.position.set(...A.moonFrom);
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
