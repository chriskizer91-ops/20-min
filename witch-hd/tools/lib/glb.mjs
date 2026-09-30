// A small glTF 2.0 binary (.glb) writer: buffers, accessors, images, materials, skinned meshes with morph
// targets, a skeleton, and animations. Only what the witch needs, written to the core spec so any glTF viewer,
// three.js or Blender can open the file.

const GL = { BYTE: 5120, UNSIGNED_BYTE: 5121, SHORT: 5122, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125, FLOAT: 5126 };
const TARGET = { ARRAY: 34962, ELEMENT: 34963 };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export { GL };

export class GLB {
  constructor() {
    this.json = {
      asset: { version: '2.0', generator: 'witch-hd (built in code)' },
      scene: 0, scenes: [{ name: 'Scene', nodes: [] }],
      nodes: [], meshes: [], materials: [], textures: [], images: [], samplers: [], skins: [], animations: [],
      accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }],
    };
    this.chunks = [];
    this.length = 0;
    this.extensionsUsed = new Set();
  }

  // Raw bytes into the binary chunk, 4-byte aligned. Returns a bufferView index.
  view(bytes, target) {
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) { this.chunks.push(new Uint8Array(pad)); this.length += pad; }
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const bv = { buffer: 0, byteOffset: this.length, byteLength: u8.byteLength };
    if (target) bv.target = target;
    this.chunks.push(u8);
    this.length += u8.byteLength;
    this.json.bufferViews.push(bv);
    return this.json.bufferViews.length - 1;
  }

  // An accessor over a typed array. type: 'SCALAR' | 'VEC2' | ... ; normalized for unit-range integers.
  accessor(array, type, { target, normalized = false, minmax = false } = {}) {
    const componentType =
      array instanceof Float32Array ? GL.FLOAT :
      array instanceof Uint32Array ? GL.UNSIGNED_INT :
      array instanceof Uint16Array ? GL.UNSIGNED_SHORT :
      array instanceof Int16Array ? GL.SHORT :
      array instanceof Uint8Array ? GL.UNSIGNED_BYTE :
      array instanceof Int8Array ? GL.BYTE : null;
    if (componentType == null) throw new Error('unsupported array type');
    const n = SIZE[type];
    const acc = { bufferView: this.view(array, target), componentType, count: array.length / n, type };
    if (normalized) acc.normalized = true;
    if (minmax) Object.assign(acc, bounds(array, n));
    this.json.accessors.push(acc);
    return this.json.accessors.length - 1;
  }

  // An all-zero accessor with no data (the spec fills it with zeros): unused morph target deltas.
  zeros(count, type = 'VEC3') {
    const acc = { componentType: GL.FLOAT, count, type, min: new Array(SIZE[type]).fill(0), max: new Array(SIZE[type]).fill(0) };
    this.json.accessors.push(acc);
    return this.json.accessors.length - 1;
  }

  image(bytes, mimeType, name) {
    const bufferView = this.view(bytes);
    this.json.images.push({ bufferView, mimeType, name });
    return this.json.images.length - 1;
  }

  sampler(opts = {}) {
    this.json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497, ...opts });
    return this.json.samplers.length - 1;
  }

  texture(image, sampler = 0) {
    this.json.textures.push({ source: image, sampler });
    return this.json.textures.length - 1;
  }

  material(def) {
    this.json.materials.push(def);
    for (const ext of Object.keys(def.extensions ?? {})) this.extensionsUsed.add(ext);
    return this.json.materials.length - 1;
  }

  node(def) {
    this.json.nodes.push(def);
    return this.json.nodes.length - 1;
  }

  mesh(def) {
    this.json.meshes.push(def);
    return this.json.meshes.length - 1;
  }

  toBuffer() {
    const json = this.json;
    json.buffers[0].byteLength = this.length;
    for (const key of ['meshes', 'materials', 'textures', 'images', 'samplers', 'skins', 'animations'])
      if (!json[key].length) delete json[key];
    if (this.extensionsUsed.size) json.extensionsUsed = [...this.extensionsUsed];
    let text = JSON.stringify(json);
    while (text.length % 4) text += ' ';
    const jsonBytes = Buffer.from(text, 'utf8');
    const binPad = (4 - (this.length % 4)) % 4;
    const binLength = this.length + binPad;
    const total = 12 + 8 + jsonBytes.length + 8 + binLength;
    const out = Buffer.alloc(total);
    out.writeUInt32LE(0x46546c67, 0); // 'glTF'
    out.writeUInt32LE(2, 4);
    out.writeUInt32LE(total, 8);
    out.writeUInt32LE(jsonBytes.length, 12);
    out.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
    jsonBytes.copy(out, 20);
    let o = 20 + jsonBytes.length;
    out.writeUInt32LE(binLength, o);
    out.writeUInt32LE(0x004e4942, o + 4); // 'BIN'
    o += 8;
    for (const c of this.chunks) { out.set(c, o); o += c.byteLength; }
    return out;
  }
}

function bounds(array, n) {
  const min = new Array(n).fill(Infinity), max = new Array(n).fill(-Infinity);
  for (let i = 0; i < array.length; i += n)
    for (let k = 0; k < n; k++) {
      const v = array[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  return { min, max };
}
