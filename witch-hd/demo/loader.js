// Getting witch-hd.glb into the page. Served over http, it is fetched: whole, or in parts where a host limits
// file sizes (window.WITCH_PARTS lists them, with sizes, so we can show progress). Opened from disk, browsers
// won't let a page read files next to it, so we ask for the file instead.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);

export async function loadModelBytes() {
  const status = (t) => { $('load-text').textContent = t; };
  const parts = window.WITCH_PARTS;
  if (parts?.length) {
    try { return await fetchParts(parts, status); } catch (e) { console.warn('parts', e); }
  }
  try {
    const res = await fetch('witch-hd.glb');
    if (res.ok) return await readWithProgress(res, Number(res.headers.get('content-length')) || 0, (got, total) => status(`Loading the witch… ${Math.round((got / total) * 100)}%`));
  } catch {}
  $('load-pick').hidden = false;
  status('Opened from your disk, so the page can’t fetch the model by itself.');
  return new Promise((resolve) => {
    const take = (file) => { status('Reading the witch…'); file.arrayBuffer().then(resolve); };
    $('load-file').addEventListener('change', (e) => e.target.files[0] && take(e.target.files[0]));
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) take(f); });
  });
}

// All parts at once, into one buffer, with a combined progress figure
async function fetchParts(parts, status) {
  const total = parts.reduce((s, p) => s + p.size, 0);
  const out = new Uint8Array(total);
  const got = new Array(parts.length).fill(0);
  const show = () => status(`Loading the witch… ${Math.round((got.reduce((a, b) => a + b, 0) / total) * 100)}% of ${(total / 1e6).toFixed(0)} MB`);
  show();
  let offset = 0;
  await Promise.all(parts.map((p, i) => {
    const at = offset;
    offset += p.size;
    return fetch(p.name).then((res) => {
      if (!res.ok) throw new Error(`${p.name}: ${res.status}`);
      return readWithProgress(res, p.size, (n) => { got[i] = n; show(); }, out, at);
    });
  }));
  return out.buffer;
}

async function readWithProgress(res, size, progress, into = null, at = 0) {
  if (!res.body || !size) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (into) { into.set(buf, at); return into.buffer; }
    return buf.buffer;
  }
  const reader = res.body.getReader();
  const buf = into ?? new Uint8Array(size);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + got + value.length > buf.length) throw new Error('more data than expected');
    buf.set(value, at + got);
    got += value.length;
    progress(got, size);
  }
  if (got !== size) throw new Error(`expected ${size} bytes, got ${got}`);
  return buf.buffer;
}

// Parse the model. GLTFLoader decodes embedded textures with fetch() of blob: URLs when createImageBitmap
// exists; hosts with a strict content policy refuse that. Hiding createImageBitmap while the parser is built
// makes it use plain <img> decoding instead, which such hosts allow. (The choice is made once, synchronously.)
export function parseGLB(bytes) {
  const cib = window.createImageBitmap;
  try {
    window.createImageBitmap = undefined;
    return new GLTFLoader().parseAsync(bytes, '');
  } finally {
    window.createImageBitmap = cib;
  }
}
