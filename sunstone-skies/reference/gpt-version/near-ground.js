
(() => {
  'use strict';
  const roofFootprints = [{"x":-6792.45,"z":6901.42,"width":51.31,"depth":33.01,"yaw":0.65475,"color":"#d88355","source_pixel":[1181.89,3645.35],"confidence":"high","merged":false},{"x":-7095.89,"z":7031.96,"width":36.22,"depth":20.37,"yaw":1.55205,"color":"#b1714c","source_pixel":[1106.03,3677.99],"confidence":"high","merged":false},{"x":-4763.91,"z":-126.42,"width":26.11,"depth":22.21,"yaw":1.35417,"color":"#c17d5d","source_pixel":[1689.02,1888.4],"confidence":"high","merged":false},{"x":-4613.78,"z":-28.01,"width":52.8,"depth":30.53,"yaw":0.84145,"color":"#ba7c5b","source_pixel":[1726.56,1913.0],"confidence":"high","merged":false},{"x":-4656.0,"z":122.0,"width":24.33,"depth":12.86,"yaw":1.52722,"color":"#c37459","source_pixel":[1716.0,1950.5],"confidence":"high","merged":false},{"x":-4626.17,"z":230.01,"width":32.24,"depth":17.29,"yaw":-1.48734,"color":"#c4735c","source_pixel":[1723.46,1977.5],"confidence":"high","merged":false},{"x":-2982.16,"z":1436.2,"width":40.87,"depth":23.46,"yaw":-0.69493,"color":"#c77f5d","source_pixel":[2134.46,2279.05],"confidence":"high","merged":false},{"x":-3034.4,"z":1718.08,"width":43.35,"depth":26.87,"yaw":-1.36325,"color":"#d4785b","source_pixel":[2121.4,2349.52],"confidence":"high","merged":false}];
  const SAMPLE_W = 1920, SAMPLE_H = 1280, WORLD_W = 23040, WORLD_H = 15360;
  const TREE_LIMIT = 768, GRID = 40, STREAM_RADIUS = 720, VISIBLE_RADIUS = 620;
  const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
  const random = (x, z, salt) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 69069);
    h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  let booted = false;
  function start() {
    if (booted || !window.__game?.ready || !window.Aether?.THREE?.InstancedMesh) return;
    booted = true;
    const game = window.__game, T = window.Aether.THREE;
    const group = new T.Group(); group.name = 'Near-ground forest and vetted roof detail'; group.visible = false;
    game.scene.add(group);
    const info = window.__aetherNearGroundInfo = {
      ready: false, sampleReady: false, visible: false, cameraHeight: 0,
      sampleResolution: [SAMPLE_W, SAMPLE_H], worldSize: [WORLD_W, WORLD_H],
      poolLimit: TREE_LIMIT, poolLimits: { canopies: TREE_LIMIT, trunks: TREE_LIMIT, roofs: roofFootprints.length, walls: roofFootprints.length },
      pooledTrees: 0, count: 0, counts: { canopies: 0, trunks: 0, roofs: 0, walls: 0, total: 0 },
      streamRadius: STREAM_RADIUS, visibleRadius: VISIBLE_RADIUS, rebuildDistance: 100,
      rebuilds: 0, vettedRoofFootprints: roofFootprints.length, triangleLimit: 0,
    };
    Object.defineProperty(info, 'group', { value: group, enumerable: false });

    const canvas = document.createElement('canvas'); canvas.width = SAMPLE_W; canvas.height = SAMPLE_H;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    const tiles = [];
    game.scene.traverse(mesh => {
      if (mesh.isMesh && mesh.material?.map?.image?.width === 1952 && mesh.material.map.image.height === 1312) tiles.push(mesh);
    });
    if (tiles.length !== 9) { info.reason = 'Satellite texture sampling is unavailable'; return; }
    for (const tile of tiles) {
      const col = Math.round((tile.position.x + 7680) / 7680), row = Math.round((tile.position.z + 5120) / 5120);
      context.drawImage(tile.material.map.image, 16, 16, 1920, 1280, col * SAMPLE_W / 3, row * SAMPLE_H / 3, SAMPLE_W / 3, SAMPLE_H / 3);
    }
    const pixels = context.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    info.sampleReady = true;
    function sample(x, z) {
      const col = Math.floor((x / WORLD_W + .5) * SAMPLE_W), row = Math.floor((z / WORLD_H + .5) * SAMPLE_H);
      if (col < 0 || col >= SAMPLE_W || row < 0 || row >= SAMPLE_H) return null;
      const offset = (row * SAMPLE_W + col) * 4;
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    }
    function forest(color) {
      if (!color) return false;
      const [r, g, b] = color;
      return g > 40 && g < 142 && r < 98 && b < 94 && g > r * 1.16 && g > b * 1.25 && g - r > 14;
    }
    function forestSite(x, z) {
      const middle = sample(x, z);
      if (!forest(middle)) return null;
      const nearby = [middle, sample(x - 18, z), sample(x + 18, z), sample(x, z - 18), sample(x, z + 18)];
      if (nearby.filter(forest).length < 4) return null;
      // Avoid smooth cultivated patches as well as pale roads and shore edges.
      const greens = nearby.filter(Boolean).map(color => color[1]);
      if (Math.max(...greens) - Math.min(...greens) < 12) return null;
      return middle;
    }
    Object.defineProperty(info, 'sampleAt', { value: (x, z) => ({ color: sample(x, z), forest: !!forestSite(x, z) }), enumerable: false });

    function geometry(positions, indices, colors) {
      const result = new T.BufferGeometry();
      result.setAttribute('position', new T.BufferAttribute(new Float32Array(positions), 3));
      if (colors) result.setAttribute('color', new T.BufferAttribute(new Float32Array(colors), 3));
      result.setIndex(indices); result.computeVertexNormals(); result.computeBoundingSphere();
      return result;
    }
    function canopyGeometry() {
      const positions = [], colors = [], indices = [], segments = 9, rings = 5;
      const lobes = [[0, .74, 0, .34, .38, .31], [-.26, .59, .09, .30, .30, .29], [.23, .66, -.08, .30, .32, .29], [-.04, .53, -.25, .29, .29, .29], [.08, .55, .27, .28, .29, .28]];
      lobes.forEach((lobe, lobeIndex) => {
        const offset = positions.length / 3;
        for (let ring = 0; ring <= rings; ring++) {
          const phi = ring / rings * Math.PI;
          for (let segment = 0; segment <= segments; segment++) {
            const angle = segment / segments * Math.PI * 2;
            const asymmetry = 1 + .055 * Math.sin(angle * 3 + lobeIndex * 1.7) * Math.sin(phi);
            positions.push(lobe[0] + Math.sin(phi) * Math.cos(angle) * lobe[3] * asymmetry, lobe[1] + Math.cos(phi) * lobe[4], lobe[2] + Math.sin(phi) * Math.sin(angle) * lobe[5] * asymmetry);
            const light = .76 + .20 * Math.max(0, Math.cos(phi)) + .025 * Math.sin(angle * 4 + lobeIndex);
            colors.push(light * .88, light, light * .77);
          }
        }
        for (let ring = 0; ring < rings; ring++) for (let segment = 0; segment < segments; segment++) {
          const a = offset + ring * (segments + 1) + segment, b = a + segments + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      });
      return geometry(positions, indices, colors);
    }
    function trunkGeometry() {
      const positions = [], indices = [], segments = 10;
      for (let ring = 0; ring < 2; ring++) for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * Math.PI * 2, radius = ring ? .024 : .040;
        positions.push(Math.cos(angle) * radius, ring * .54, Math.sin(angle) * radius);
      }
      for (let segment = 0; segment < segments; segment++) { const b = segment + segments + 1; indices.push(segment, b, segment + 1, b, b + 1, segment + 1); }
      return geometry(positions, indices);
    }
    function roofGeometry() {
      const positions = [], indices = [];
      const faces = [
        [[-.5, 0, -.5], [-.5, 1, 0], [.5, 1, 0], [.5, 0, -.5]],
        [[-.5, 0, .5], [.5, 0, .5], [.5, 1, 0], [-.5, 1, 0]],
        [[-.5, 0, -.5], [-.5, 0, .5], [-.5, 1, 0]],
        [[.5, 0, -.5], [.5, 1, 0], [.5, 0, .5]],
      ];
      for (const face of faces) {
        const offset = positions.length / 3; face.forEach(vertex => positions.push(...vertex));
        indices.push(offset, offset + 1, offset + 2); if (face.length === 4) indices.push(offset, offset + 2, offset + 3);
      }
      return geometry(positions, indices);
    }
    function wallGeometry() {
      const positions = [], indices = [];
      const faces = [
        [[-.5, 0, -.5], [-.5, 1, -.5], [.5, 1, -.5], [.5, 0, -.5]],
        [[.5, 0, .5], [.5, 1, .5], [-.5, 1, .5], [-.5, 0, .5]],
        [[-.5, 0, .5], [-.5, 1, .5], [-.5, 1, -.5], [-.5, 0, -.5]],
        [[.5, 0, -.5], [.5, 1, -.5], [.5, 1, .5], [.5, 0, .5]],
      ];
      for (const face of faces) { const offset = positions.length / 3; face.forEach(vertex => positions.push(...vertex)); indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3); }
      return geometry(positions, indices);
    }
    function roofMaterial() {
      const material = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .94, metalness: 0, envMapIntensity: .12, toneMapped: false });
      material.onBeforeCompile = shader => {
        const varyings = 'varying vec3 vAetherRoofWorld; varying vec3 vAetherRoofMeters;\n';
        shader.vertexShader = varyings + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
vec4 aetherRoofWorld = vec4(transformed, 1.0);
vec3 aetherRoofScale = vec3(1.0);
#ifdef USE_INSTANCING
aetherRoofWorld = instanceMatrix * aetherRoofWorld;
aetherRoofScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
vAetherRoofWorld = (modelMatrix * aetherRoofWorld).xyz;
vAetherRoofMeters = transformed * aetherRoofScale;`);
        shader.fragmentShader = varyings + `
float aetherRoofHash(vec2 p) { vec3 q = fract(vec3(p.x, p.y, p.x + p.y) * vec3(0.1031, 0.11369, 0.13787)); q += dot(q, q.yzx + 19.19); return fract((q.x + q.y) * q.z); }
float aetherRoofGrain(vec2 p) { vec2 c = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(aetherRoofHash(c), aetherRoofHash(c + vec2(1.0, 0.0)), f.x), mix(aetherRoofHash(c + vec2(0.0, 1.0)), aetherRoofHash(c + vec2(1.0)), f.x), f.y) - 0.5; }
` + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
vec2 aetherRoofTiles = vec2(vAetherRoofMeters.x / 0.75, abs(vAetherRoofMeters.z) / 0.60);
aetherRoofTiles.x += mod(floor(aetherRoofTiles.y), 2.0) * 0.5;
float aetherRoofFootprint = max(fwidth(aetherRoofTiles.x), fwidth(aetherRoofTiles.y));
float aetherRoofResolved = 1.0 - smoothstep(0.40, 1.15, aetherRoofFootprint);
vec2 aetherRoofCell = fract(aetherRoofTiles), aetherRoofEdge = min(aetherRoofCell, 1.0 - aetherRoofCell);
vec2 aetherRoofJoint = 1.0 - smoothstep(vec2(0.0), vec2(0.018 + aetherRoofFootprint * 0.35), aetherRoofEdge);
float aetherRoofVariation = (aetherRoofHash(floor(aetherRoofTiles)) - 0.5) * 0.10;
float aetherRoofRoll = cos(aetherRoofCell.x * 6.2831853) * 0.045;
float aetherRoofRidge = (1.0 - smoothstep(0.08, 0.26, abs(vAetherRoofMeters.z))) * 0.11;
float aetherRoofGrainResolved = 1.0 - smoothstep(0.12, 0.90, max(length(dFdx(vAetherRoofWorld)), length(dFdy(vAetherRoofWorld))) * 2.0);
diffuseColor.rgb *= 1.0 + aetherRoofResolved * (aetherRoofVariation + aetherRoofRoll + aetherRoofRidge - aetherRoofJoint.y * 0.10 - aetherRoofJoint.x * 0.035) + aetherRoofGrainResolved * aetherRoofGrain(vAetherRoofWorld.xz * 2.0) * 0.04;`);
      };
      material.customProgramCacheKey = () => 'aether-vetted-roof-tiles-v1';
      return material;
    }
    function mesh(name, shape, material, limit) {
      const result = new T.InstancedMesh(shape, material, limit);
      result.name = name; result.count = 0; result.frustumCulled = false;
      result.instanceMatrix.setUsage(T.DynamicDrawUsage);
      result.castShadow = false; result.receiveShadow = false; group.add(result);
      return result;
    }
    const leaves = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .97, metalness: 0, vertexColors: true, envMapIntensity: .18, toneMapped: false });
    const bark = new T.MeshStandardMaterial({ color: 0x725b3b, roughness: 1, metalness: 0, envMapIntensity: .12, toneMapped: false });
    const canopies = mesh('Near-ground clustered canopies', canopyGeometry(), leaves, TREE_LIMIT);
    const trunks = mesh('Near-ground trunks', trunkGeometry(), bark, TREE_LIMIT);
    const roofs = mesh('Near-ground vetted roofs', roofGeometry(), roofMaterial(), Math.max(1, roofFootprints.length));
    const walls = mesh('Near-ground house walls', wallGeometry(), new T.MeshStandardMaterial({ color: 0xd9d0b8, roughness: 1, metalness: 0, envMapIntensity: .12, toneMapped: false }), Math.max(1, roofFootprints.length));
    info.triangleLimit = TREE_LIMIT * (canopies.geometry.index.count + trunks.geometry.index.count) / 3 + roofFootprints.length * (roofs.geometry.index.count + walls.geometry.index.count) / 3;
    const matrix = new T.Matrix4(), scale = new T.Vector3(), color = new T.Color();
    let instances = [], centerX = NaN, centerZ = NaN;
    function rebuild(x, z) {
      const candidates = [], cells = Math.ceil(STREAM_RADIUS / GRID);
      const middleX = Math.floor(x / GRID), middleZ = Math.floor(z / GRID);
      for (let cx = middleX - cells; cx <= middleX + cells; cx++) for (let cz = middleZ - cells; cz <= middleZ + cells; cz++) {
        const px = (cx + .5) * GRID + (random(cx, cz, 1) - .5) * 22, pz = (cz + .5) * GRID + (random(cx, cz, 2) - .5) * 22;
        const distance = Math.hypot(px - x, pz - z);
        if (distance > STREAM_RADIUS) continue;
        const tint = forestSite(px, pz); if (!tint) continue;
        candidates.push({ x: px, z: pz, height: 16 + random(cx, cz, 3) * 8, width: .74 + random(cx, cz, 4) * .22, yaw: random(cx, cz, 5) * Math.PI * 2, tint, distance });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      instances = candidates.slice(0, TREE_LIMIT); centerX = x; centerZ = z;
      info.pooledTrees = instances.length; info.rebuilds++;
    }
    function hide() {
      group.visible = false; info.visible = false; info.count = 0;
      canopies.count = trunks.count = roofs.count = walls.count = 0;
      info.counts = { canopies: 0, trunks: 0, roofs: 0, walls: 0, total: 0 };
    }
    function update() {
      requestAnimationFrame(update);
      const camera = game.camera.position; info.cameraHeight = camera.y;
      const heightFade = 1 - smooth(160, 500, camera.y);
      if (game.mode !== 'voyage' || heightFade < .002) { hide(); return; }
      if (!Number.isFinite(centerX) || Math.hypot(camera.x - centerX, camera.z - centerZ) > 100) rebuild(camera.x, camera.z);
      let treeCount = 0;
      for (const tree of instances) {
        const fade = heightFade * (1 - smooth(430, VISIBLE_RADIUS, Math.hypot(camera.x - tree.x, camera.z - tree.z)));
        if (fade < .003) continue;
        const height = tree.height * fade;
        matrix.makeRotationY(tree.yaw).scale(scale.set(height * tree.width, height, height * tree.width)).setPosition(tree.x, .03, tree.z);
        canopies.setMatrixAt(treeCount, matrix); trunks.setMatrixAt(treeCount, matrix);
        const [r, g, b] = tree.tint;
        color.setRGB((r * .50 + 25) / 255, (g * .55 + 39) / 255, (b * .45 + 18) / 255, 'srgb');
        canopies.setColorAt(treeCount, color); treeCount++;
      }
      canopies.count = trunks.count = treeCount;
      canopies.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true;
      if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
      let roofCount = 0;
      for (const footprint of roofFootprints) {
        const fade = heightFade * (1 - smooth(430, VISIBLE_RADIUS, Math.hypot(camera.x - footprint.x, camera.z - footprint.z)));
        if (fade < .003) continue;
        const roofHeight = Math.min(8, 4 + footprint.depth * .10) * fade, eaves = 5 * fade;
        matrix.makeRotationY(footprint.yaw).scale(scale.set(footprint.width * .95, roofHeight, footprint.depth * .95)).setPosition(footprint.x, eaves, footprint.z);
        roofs.setMatrixAt(roofCount, matrix); color.set(footprint.color); roofs.setColorAt(roofCount, color);
        matrix.makeRotationY(footprint.yaw).scale(scale.set(footprint.width * .93, eaves, footprint.depth * .93)).setPosition(footprint.x, .02, footprint.z);
        walls.setMatrixAt(roofCount, matrix);
        roofCount++;
      }
      roofs.count = walls.count = roofCount;
      roofs.instanceMatrix.needsUpdate = walls.instanceMatrix.needsUpdate = true;
      if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
      group.visible = treeCount + roofCount > 0; info.visible = group.visible; info.count = treeCount + roofCount;
      info.counts = { canopies: treeCount, trunks: treeCount, roofs: roofCount, walls: roofCount, total: treeCount * 2 + roofCount * 2 };
    }
    info.ready = true;
    update();
  }
  document.addEventListener('aether:ready', start, { once: true });
  if (window.__game?.ready) start();
})();

