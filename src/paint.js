import * as THREE from 'three';

// The camera the painting was "shot" with. Nothing in the painting is 3D, so we pick a camera that
// looks down on the scene at the painter's angle, aimed at the world origin, which lands on the middle
// of the painting. Every 3D thing (the floor, the cut-outs, the characters) is placed with this camera,
// so it all lines up with the brush strokes.
//
// World units are meters. x points right, y up, and z toward the viewer (down the painting).
export class PaintCamera {
  constructor([width, height], { fov, pitch, ppm }) {
    this.width = width;
    this.height = height;
    const focal = height / 2 / Math.tan(THREE.MathUtils.degToRad(fov) / 2); // in painting pixels
    this.distance = focal / ppm;
    const tilt = THREE.MathUtils.degToRad(pitch);
    const camera = new THREE.PerspectiveCamera(fov, width / height, this.distance * 0.25, this.distance * 2.5);
    camera.position.set(0, this.distance * Math.sin(tilt), this.distance * Math.cos(tilt));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    this.camera = camera;
    this.viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  }

  // The ray from the camera through a painting pixel.
  ray(x, y, out = new THREE.Ray()) {
    const point = new THREE.Vector3((x / this.width) * 2 - 1, 1 - (y / this.height) * 2, 0.5).unproject(this.camera);
    out.origin.copy(this.camera.position);
    out.direction.copy(point).sub(this.camera.position).normalize();
    return out;
  }

  // A painting pixel dropped onto level ground at height h.
  toWorld(x, y, h = 0, out = new THREE.Vector3()) {
    const ray = this.ray(x, y);
    const t = (h - ray.origin.y) / ray.direction.y;
    return ray.at(t, out);
  }

  // A painting pixel dropped onto any plane.
  toPlane(x, y, plane, out = new THREE.Vector3()) {
    return this.ray(x, y).intersectPlane(plane, out);
  }

  // Where a 3D point shows up in the painting.
  toPixel(v, out = new THREE.Vector2()) {
    const p = v.clone().project(this.camera);
    return out.set(((p.x + 1) / 2) * this.width, ((1 - p.y) / 2) * this.height);
  }

  // How tall something is in meters, from its foot and head in the painting (for lamp tops and perches).
  heightAbove([x, y], topY) {
    const foot = this.toWorld(x, y, 0);
    const ray = this.ray(x, topY);
    // Closest point on the pixel ray to the vertical line through the foot.
    const toward = new THREE.Vector3(foot.x - ray.origin.x, 0, foot.z - ray.origin.z);
    const flat = new THREE.Vector3(ray.direction.x, 0, ray.direction.z);
    const t = toward.dot(flat) / flat.lengthSq();
    return ray.at(t, new THREE.Vector3()).y;
  }
}

// A shape from scene data: a list of [x, y] or [x, y, h] points, or {ellipse: [cx, cy, rx, ry]}.
export function ring(shape) {
  if (shape.ellipse) {
    const [cx, cy, rx, ry] = shape.ellipse;
    const n = shape.segments ?? 16;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), shape.h ?? 0];
    });
  }
  return shape.map((p) => [p[0], p[1], p[2] ?? 0]);
}
