import * as THREE from 'three';
import { Stage } from '../stage.js';
import { buildScreen, loadTexture } from '../screen.js';
import { createWitch } from '../actors/witch.js';
import { createCauldron } from '../actors/cauldron.js';
import { turnToward, INK, glowTexture } from '../actors/kit.js';
import { Particles } from '../actors/party-kit.js';
import hearth from './hearth.json';

// The cauldron and the witch, in 3D, for the brewing screen. Two stagings:
//
//   'hearth'  The cottage painting framed on its hearth (src/brew/hearth.json), drawn by the town engine's Stage:
//             the painting, then the 3D models over it through its painter's camera. The screen fits the fireplace
//             (the scene's frame box) and fills out round it. She stands at the foot of the stone ring, behind the
//             cauldron, facing us; witchfire burns under it on the bare boards. Needs `painting` (the image's URL).
//   'small'   Her own little staging for an overlay on any field screen: the same two models on a round hearthstone,
//             from a little above, on a see-through canvas (the page's own picture shows behind it).
//
// createCauldronView(canvas, { mode, painting, moonwaterIcon }) resolves to
//   { mode, witch, cauldron, update(dt), render(), resize(), dispose(), faceThePot(on), gag(dudId), potOnScreen() }

export async function createCauldronView(canvas, { mode = 'hearth', painting = null, moonwaterIcon = null } = {}) {
  const witch = createWitch();
  const cauldron = createCauldron();
  cauldron.moonwaterIcon = moonwaterIcon;
  const S = mode === 'hearth' ? await hearthStaging(canvas, painting, witch, cauldron) : smallStaging(canvas, witch, cauldron);

  // ---------------------------------------------------------------- her own little jokes, after a dud
  // Witch Way's duds work on her for a minute (game/src/dudfx.js). Here nobody drinks them, but the puff still
  // catches her: Hiccup Tonic makes her hiccup bubbles, Droopy Hat Draught wilts her hat, Swamp Tea leaves a green
  // fug round her head.
  const gagFx = new Particles(S.world, 12, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false })));
  let gag = null;
  const head = new THREE.Vector3();

  let facePot = false, time = 0;
  const view = {
    mode, witch, cauldron, stage: S.stage ?? null, camera: S.camera,
    // She turns to watch the pot while she works (and back to us after).
    faceThePot(on) { facePot = on; },
    gag(id) { gag = { id, t: 0, next: 0.4 }; },
    // Where the pot's mouth is on the screen, in CSS pixels (for floating text).
    potOnScreen() {
      const p = cauldron.root.localToWorld(new THREE.Vector3(0, 0.9, 0));
      return S.toScreen(p);
    },
    update(dt) {
      time += dt;
      const before = witch.root.rotation.y;
      const want = facePot ? S.potHeading : S.restHeading + Math.sin(time * 0.3) * 0.05;
      witch.root.rotation.y = turnToward(before, want, 4, dt);
      const turn = Math.atan2(Math.sin(witch.root.rotation.y - before), Math.cos(witch.root.rotation.y - before)) / Math.max(dt, 1e-3);
      witch.update(dt, 0, turn);
      cauldron.update(dt);
      // the gags ride on top of her own animation
      witch.root.position.y = S.witchY;
      witch.hat.rotation.z = 0;
      if (gag) {
        gag.t += dt;
        witch.head.getWorldPosition(head);
        if (gag.id === 'hiccup-tonic') {
          const since = gag.t % 0.9;
          witch.root.position.y = S.witchY + Math.max(0, Math.sin(Math.min(1, since / 0.22) * Math.PI)) * 0.05 * witch.root.scale.y;
          if ((gag.next -= dt) < 0) {
            gag.next = 0.9;
            gagFx.spawn(head.clone().add(new THREE.Vector3(0.12, 0.05, 0.15).multiplyScalar(witch.root.scale.y)), {
              vel: [0.05, 0.35, 0.05], life: 1.3, size: 0.09 * witch.root.scale.y, grow: 0.8, color: '#d9b8ff', opacity: 0.8,
            });
          }
        } else if (gag.id === 'droopy-hat-draught') {
          const k = Math.min(1, gag.t / 0.8) * (1 - THREE.MathUtils.smoothstep(gag.t, 4.5, 5.5));
          witch.hat.rotation.z = -0.55 * k + Math.sin(time * 3) * 0.04 * k;
        } else if (gag.id === 'swamp-tea' && (gag.next -= dt) < 0 && gag.t < 4) {
          gag.next = 0.35;
          gagFx.spawn(head.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, 0.1).multiplyScalar(witch.root.scale.y)), {
            vel: [(Math.random() - 0.5) * 0.1, 0.12, 0], life: 1.6, size: 0.3 * witch.root.scale.y, grow: 1.2, color: '#8fae5a', opacity: 0.45,
          });
        }
        if (gag.t > 5.5) gag = null;
      }
      gagFx.update(dt);
      S.update(dt, time);
    },
    render() { S.render(); },
    resize() { S.resize(); },
    dispose() { S.dispose(); },
  };
  return view;
}

// ---------------------------------------------------------------- the cottage hearth, through the Stage
async function hearthStaging(canvas, paintingUrl, witch, cauldron) {
  if (!paintingUrl) throw new Error('the hearth view needs the painting');
  const painting = await loadTexture(paintingUrl);
  const screen = buildScreen(hearth, painting);
  const { paint, world } = screen;
  const stage = new Stage(canvas, { paint, painting, world, cutouts: screen.cutouts });
  const at = ([x, y, h = 0]) => paint.toWorld(x, y, h);

  // the cauldron on the boards, the witch at the foot of the ring behind it, both facing the camera
  const potAt = at(hearth.spots.cauldron);
  cauldron.root.position.copy(potAt);
  cauldron.root.scale.setScalar(hearth.spots.cauldronScale ?? 1);
  const witchAt = at(hearth.spots.witch);
  witch.root.position.copy(witchAt);
  const toCam = Math.atan2(paint.camera.position.x - witchAt.x, paint.camera.position.z - witchAt.z);
  const potHeading = Math.atan2(potAt.x - witchAt.x, potAt.z - witchAt.z);
  witch.root.rotation.y = toCam;
  world.add(witch.root, witch.fx, cauldron.root);
  // Up close the ink would be heavy: draw it a little thinner while the brewing screen is up.
  const ink = INK.uniforms.thickness.value;
  INK.uniforms.thickness.value = 0.011;

  const box = hearth.frame.box;
  const center = new THREE.Vector2((box[0] + box[2]) / 2, (box[1] + box[3]) / 2);
  function fit() {
    stage.resize();
    const { w, h } = stage.cssSize;
    const cover = Math.max(w / paint.width, h / paint.height);
    const want = Math.min(w / (box[2] - box[0]), h / (box[3] - box[1]));
    stage.setZoom(Math.max(1, want / cover), true);
    stage.setFocus(center, true);
  }
  fit();

  return {
    stage, world, camera: stage.view, witchY: witchAt.y,
    restHeading: toCam - 0.12, potHeading,
    toScreen: (p) => stage.worldToScreen(p),
    update(dt, time) {
      for (const lamp of screen.lamps) lamp.flicker(time);
      stage.setFocus(center);
      stage.update(dt);
    },
    render() { stage.render(); },
    resize: fit,
    dispose() {
      INK.uniforms.thickness.value = ink;
      stage.renderer.dispose();
      stage.renderer.forceContextLoss?.();
    },
  };
}

// ---------------------------------------------------------------- her own small staging, for an overlay
function smallStaging(canvas, witch, cauldron) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const world = new THREE.Scene();
  world.add(new THREE.HemisphereLight('#b89ad0', '#2a1620', 1.15));
  const key = new THREE.DirectionalLight('#ffd8b0', 1.3);
  key.position.set(-2, 3, 3);
  const moon = new THREE.DirectionalLight('#b8b0ff', 0.9);
  moon.position.set(2, 2.5, -3);
  world.add(key, moon);

  // a round hearthstone that fades into whatever is behind the canvas
  const floorTex = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 10, 64, 64, 63);
    grad.addColorStop(0, 'rgba(58,40,52,1)');
    grad.addColorStop(0.7, 'rgba(40,26,40,0.85)');
    grad.addColorStop(1, 'rgba(20,12,24,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(236,220,184,0.12)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
    return c;
  })());
  floorTex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -2;
  world.add(floor);

  cauldron.root.position.set(0, 0, 0.2);
  cauldron.root.scale.setScalar(0.74);
  witch.root.position.set(0, 0, -0.42);
  world.add(witch.root, witch.fx, cauldron.root);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.layers.enableAll();
  const target = new THREE.Vector3(0, 0.98, 0.05);
  const pitch = THREE.MathUtils.degToRad(19);
  function resize() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // back off far enough to fit her hat and the pot, whatever the box's shape
    const fitH = 2.6 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const fitW = 2.0 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(fitH, fitW);
    camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist).add(target);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }
  resize();
  return {
    world, camera, witchY: 0, restHeading: -0.15, potHeading: 0,
    toScreen: (p) => {
      const v = p.clone().project(camera);
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height);
    },
    update() {},
    render() { renderer.render(world, camera); },
    resize,
    dispose() { renderer.dispose(); renderer.forceContextLoss?.(); },
  };
}
