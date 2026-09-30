import * as THREE from 'three';
import { LAYER_ACTORS, LAYER_CUTOUTS, LAYER_GUIDES, LAYER_BACKSTAGE } from './layers.js';

export const LAYER_GLOW = 4;

// The stage draws one frame in layers, the way FF9 does:
//   1. the painting, as a flat picture
//   2. the 3D characters, drawn small and scaled up so their pixels match the painting's
//   3. the cut-outs, drawn only where a character stands behind them
//   4. glows (lamps, witchfire) on top
// The screen is a window onto the painting that scrolls to follow the witch. "Behind the scenes"
// flies a second camera out of the painter's camera so you can see how the pieces are arranged.
export class Stage {
  constructor(canvas, { paint, painting, world, cutouts }) {
    this.paint = paint;
    this.world = world;
    this.cutouts = cutouts;
    this.painting = painting;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x07050b, 1);

    this.view = paint.camera.clone();
    this.view.layers.set(LAYER_ACTORS);
    this.pixelSize = 1; // in painting pixels; 0 draws the characters smooth
    this.showGuides = false;

    this.focus = new THREE.Vector2(paint.width / 2, paint.height / 2);
    this.window = { x: 0, y: 0, w: paint.width, h: paint.height };

    this.screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.bgUniforms = { painting: { value: painting }, rect: { value: new THREE.Vector4(0, 0, 1, 1) } };
    this.bgScene = screenQuad(new THREE.ShaderMaterial({
      uniforms: this.bgUniforms,
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D painting; uniform vec4 rect; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(painting, mix(rect.xy, rect.zw, vUv));
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    }));
    this.compUniforms = { actors: { value: null } };
    this.compScene = screenQuad(new THREE.ShaderMaterial({
      uniforms: this.compUniforms,
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D actors; varying vec2 vUv;
        vec3 toSRGB(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        void main() {
          vec4 c = texture2D(actors, vUv); // premultiplied, linear
          vec3 rgb = c.a > 0.004 ? toSRGB(c.rgb / c.a) * c.a : toSRGB(c.rgb);
          gl_FragColor = vec4(rgb, c.a);
        }`,
      depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    }));

    // Behind the scenes
    this.reveal = { on: false, t: 0, yaw: 0.7, pitch: 0.5, dist: 32, drag: null, idle: 0 };
    this.revealCam = new THREE.PerspectiveCamera(40, 1, 0.5, 600);
    this.revealCam.layers.enableAll();
    this.target = new THREE.Vector3();
    this.resize();
  }

  get revealing() {
    return this.reveal.on || this.reveal.t > 0;
  }

  resize() {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.cssSize = { w, h };
    // Fill the screen with the painting ("cover") and scroll over whatever doesn't fit.
    this.scale = Math.max(w / this.paint.width, h / this.paint.height);
    this.window.w = w / this.scale;
    this.window.h = h / this.scale;
    this.makeTarget();
    this.setFocus(this.focus, true);
  }

  makeTarget() {
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    let w = size.x, h = size.y;
    if (this.pixelSize > 0) {
      w = Math.ceil(this.window.w / this.pixelSize);
      h = Math.ceil(this.window.h / this.pixelSize);
    }
    if (this.rt && this.rt.width === w && this.rt.height === h) return;
    this.rt?.dispose();
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(w, h),
    });
    this.compUniforms.actors.value = this.rt.texture;
    this.cutouts.uniforms.actorDepth.value = this.rt.depthTexture;
  }

  setPixelSize(px) {
    this.pixelSize = px;
    this.makeTarget();
  }

  // Scroll so a painting pixel sits in the middle of the screen, as far as the painting's edges allow.
  setFocus(pixel, instant = false) {
    this.focus.copy(pixel);
    if (instant) this.scrollTo(pixel, 1);
  }

  scrollTo(pixel, amount) {
    const W = this.window, P = this.paint;
    const tx = THREE.MathUtils.clamp(pixel.x - W.w / 2, 0, Math.max(0, P.width - W.w));
    const ty = THREE.MathUtils.clamp(pixel.y - W.h / 2, 0, Math.max(0, P.height - W.h));
    W.fx = W.fx === undefined || amount >= 1 ? tx : W.fx + (tx - W.fx) * amount;
    W.fy = W.fy === undefined || amount >= 1 ? ty : W.fy + (ty - W.fy) * amount;
    // Step in whole character-pixels, so the characters' pixels stay lined up with the painting's.
    const snap = this.pixelSize > 0 ? this.pixelSize : 1 / this.scale;
    W.x = Math.round(W.fx / snap) * snap;
    W.y = Math.round(W.fy / snap) * snap;
  }

  update(dt) {
    this.scrollTo(this.focus, 1 - Math.exp(-dt * 4));
    const W = this.window, P = this.paint;
    this.view.setViewOffset(P.width, P.height, W.x, W.y, W.w, W.h);
    this.view.updateProjectionMatrix();
    this.bgUniforms.rect.value.set(W.x / P.width, 1 - (W.y + W.h) / P.height, (W.x + W.w) / P.width, 1 - W.y / P.height);

    const R = this.reveal;
    R.t = THREE.MathUtils.clamp(R.t + (R.on ? dt : -dt) / 1.6, 0, 1);
    if (R.on && !R.drag) {
      R.idle += dt;
      if (R.idle > 2.5) R.yaw += dt * 0.08;
    }
  }

  // Where a screen point (CSS pixels) lands in the painting.
  screenToPixel(x, y) {
    return new THREE.Vector2(this.window.x + x / this.scale, this.window.y + y / this.scale);
  }

  pixelToScreen(p) {
    return new THREE.Vector2((p.x - this.window.x) * this.scale, (p.y - this.window.y) * this.scale);
  }

  // Where a 3D point shows up on screen, for whichever camera is live.
  worldToScreen(v) {
    const cam = this.revealing ? this.revealCam : this.view;
    const p = v.clone().project(cam);
    return new THREE.Vector2((p.x + 1) / 2 * this.cssSize.w, (1 - p.y) / 2 * this.cssSize.h);
  }

  render() {
    const r = this.renderer;
    if (this.revealing) return this.renderReveal();
    this.cutouts.uniforms.compareDepth.value = 1;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    this.cutouts.uniforms.screenSize.value.copy(size);

    // 2. the characters, into their own small picture with depth
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    this.view.layers.set(LAYER_ACTORS);
    r.render(this.world, this.view);

    // 1-4 onto the screen
    r.setRenderTarget(null);
    r.setClearColor(0x07050b, 1);
    r.clear(true, true, true);
    r.render(this.bgScene, this.screenCam);
    if (this.showGuides) {
      this.view.layers.set(LAYER_GUIDES);
      r.render(this.world, this.view);
    }
    r.render(this.compScene, this.screenCam);
    r.clearDepth();
    this.view.layers.set(LAYER_CUTOUTS);
    r.render(this.world, this.view);
    this.view.layers.set(LAYER_GLOW);
    r.render(this.world, this.view);
  }

  renderReveal() {
    const r = this.renderer, R = this.reveal, P = this.paint, W = this.window;
    const t = ease(R.t);
    const cam = this.revealCam;
    const aspect = this.cssSize.w / this.cssSize.h;

    // Start: exactly the play view (the painter's camera, cropped to the window).
    const start = P.camera;
    const tan = Math.tan(THREE.MathUtils.degToRad(start.fov) / 2);
    const full = { l: -tan * start.aspect, r: tan * start.aspect, t: tan, b: -tan };
    const win = {
      l: full.l + (W.x / P.width) * (full.r - full.l),
      r: full.l + ((W.x + W.w) / P.width) * (full.r - full.l),
      t: full.t - (W.y / P.height) * (full.t - full.b),
      b: full.t - ((W.y + W.h) / P.height) * (full.t - full.b),
    };
    // End: an orbiting camera looking at the square from the side.
    const et = Math.tan(THREE.MathUtils.degToRad(aspect < 1 ? 55 : 40) / 2);
    // Nudge the view so the square sits in the part of the screen the explanation panel leaves free.
    const wide = aspect >= 1;
    const sx = wide ? 0.3 : 0, sy = wide ? 0 : 0.32;
    const end = { l: -et * aspect * (1 + sx), r: et * aspect * (1 - sx), t: et * (1 - sy), b: -et * (1 + sy) };
    const orbit = new THREE.Vector3(
      Math.sin(R.yaw) * Math.cos(R.pitch), Math.sin(R.pitch), Math.cos(R.yaw) * Math.cos(R.pitch),
    ).multiplyScalar(R.dist).add(this.target);
    const endQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(orbit, this.target, new THREE.Vector3(0, 1, 0)));

    cam.position.lerpVectors(start.position, orbit, t);
    cam.quaternion.slerpQuaternions(start.quaternion, endQ, t);
    const f = {};
    for (const k of ['l', 'r', 't', 'b']) f[k] = win[k] + (end[k] - win[k]) * t;
    const near = 0.5;
    cam.near = near;
    cam.far = 600;
    cam.projectionMatrix.makePerspective(f.l * near, f.r * near, f.t * near, f.b * near, near, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();

    this.cutouts.uniforms.compareDepth.value = 0;
    r.setRenderTarget(null);
    r.setClearColor(0x07050b, 1);
    r.clear(true, true, true);
    r.render(this.world, cam);
  }

  // Drag to turn the view, wheel or pinch to move closer.
  orbitBy(dx, dy) {
    const R = this.reveal;
    R.yaw -= dx * 0.006;
    R.pitch = THREE.MathUtils.clamp(R.pitch + dy * 0.004, 0.08, 1.35);
    R.idle = 0;
  }

  zoomBy(factor) {
    this.reveal.dist = THREE.MathUtils.clamp(this.reveal.dist * factor, 12, 110);
    this.reveal.idle = 0;
  }
}

const QUAD_VS = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function screenQuad(material) {
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return scene;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
