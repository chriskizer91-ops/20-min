import * as THREE from 'three';
import sceneData from '../scenes/wickhollow-square.json';
import { images } from './assets.js';
import { ring } from './paint.js';
import { Stage } from './stage.js';
import { createWitch } from './actors/witch.js';
import { createKeys } from './input.js';
import { Field } from './field.js';
import { buildScreen, walkPlayer, loadTexture, loadFonts } from './screen.js';

async function boot() {
  loadFonts();
  const canvas = document.getElementById('stage');
  const painting = await loadTexture(images[sceneData.image]);
  // The painter's camera, the walkmesh, the cut-outs and the lamps (src/screen.js)
  const { paint, walk, world, cutouts, cameraModel, lamps } = buildScreen(sceneData, painting);

  const stage = new Stage(canvas, { paint, painting, world, cutouts });
  const center = walk.bounds.getCenter(new THREE.Vector3());
  stage.target.set(center.x, 0.5, center.z);

  const witch = createWitch();
  world.add(witch.root, witch.fx);
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
    const before = player.heading;
    const speed = walkPlayer(player, walk, keys, field.canWalk(), dt);
    const turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before)) / Math.max(dt, 1e-3);
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

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) { box.hidden = false; box.textContent = `The scene couldn't start: ${err.message}`; }
});

export { ring };
