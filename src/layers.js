import * as THREE from 'three';
import { ring } from './paint.js';

// Cut-outs: pieces of the painting (the well, the lamp posts, the roof in front) stood up in 3D at their
// own depth. They show exactly the painting's own pixels, so on their own they're invisible. When a
// character walks behind one, the cut-out is nearer the camera and covers her, as the real thing would.
// FF9 splits every background into layers like this.
//
// Each cut-out is a flat, upright card through its "base": one point on the ground (the card turns to
// face the camera) or a line along the ground (for a fence or a wall that runs at an angle).

export const LAYER_ACTORS = 0;
export const LAYER_CUTOUTS = 1;
export const LAYER_GUIDES = 2;
export const LAYER_BACKSTAGE = 3;

const vertexShader = /* glsl */ `
  uniform mat4 paintViewProjection;
  varying vec4 vPaint;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPaint = paintViewProjection * world;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D painting;
  uniform sampler2D actorDepth;
  uniform vec2 screenSize;
  uniform float compareDepth;
  uniform vec3 tint;
  uniform float tintAmount;
  varying vec4 vPaint;
  void main() {
    // A character nearer the camera than this card shows through it. Where nobody stands behind the card,
    // it draws the same pixels as the painting underneath, so it can't be seen.
    float hiding = 0.0;
    if (compareDepth > 0.5) {
      float actor = texture2D(actorDepth, gl_FragCoord.xy / screenSize).r;
      if (gl_FragCoord.z >= actor) discard;
      hiding = step(actor, 0.99999);
    }
    vec2 uv = vPaint.xy / vPaint.w * 0.5 + 0.5;
    vec4 color = texture2D(painting, uv);
    // When the layers are shown, a card glows brighter where it is hiding someone.
    gl_FragColor = vec4(mix(color.rgb, tint, tintAmount * mix(0.4, 0.85, hiding)), 1.0);
    #include <colorspace_fragment>
  }
`;

export function buildCutouts(scene, paint, painting) {
  const uniforms = {
    painting: { value: painting },
    paintViewProjection: { value: paint.viewProjection },
    actorDepth: { value: null },
    screenSize: { value: new THREE.Vector2(1, 1) },
    compareDepth: { value: 1 },
    tint: { value: new THREE.Color('#ff3fd0') },
    tintAmount: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.name = 'cutouts';
  const cards = [];
  const toCamera = paint.camera.position;

  for (const layer of scene.layers) {
    const plane = basePlane(layer.base, paint, toCamera);
    const positions = [];
    for (const part of layer.outline) {
      const pts = ring(part);
      const faces = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []);
      const world = pts.map(([x, y]) => paint.toPlane(x, y, plane));
      for (const f of faces) for (const i of f) positions.push(world[i].x, world[i].y, world[i].z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = layer.name;
    mesh.layers.set(LAYER_CUTOUTS);
    mesh.frustumCulled = false;
    group.add(mesh);
    cards.push({ name: layer.name, mesh, plane });
  }
  return { group, cards, material, uniforms };
}

// The upright plane a cut-out stands in.
function basePlane(base, paint, cameraPos) {
  const up = new THREE.Vector3(0, 1, 0);
  if (Array.isArray(base[0])) {
    const a = paint.toWorld(base[0][0], base[0][1]);
    const b = paint.toWorld(base[1][0], base[1][1]);
    const normal = new THREE.Vector3().subVectors(b, a).cross(up).normalize();
    if (normal.dot(new THREE.Vector3().subVectors(cameraPos, a)) < 0) normal.negate();
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, a);
  }
  const p = paint.toWorld(base[0], base[1]);
  const normal = new THREE.Vector3(cameraPos.x - p.x, 0, cameraPos.z - p.z).normalize();
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, p);
}
