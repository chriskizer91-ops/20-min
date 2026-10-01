// Free the GPU copies of everything in a group: geometries, materials and their textures. Nothing is lost: three.js
// uploads them again the next time they're drawn. The field calls it for a screen she's left; the battle screen for a
// fight that's over.
export function freeGpu(group) {
  const seen = new Set();
  const free = (x) => { if (x && !seen.has(x)) { seen.add(x); x.dispose(); } };
  group.traverse((o) => {
    free(o.geometry);
    for (const m of [o.material].flat()) {
      if (!m) continue;
      for (const v of Object.values(m)) if (v?.isTexture) free(v);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) free(u.value);
      free(m);
    }
  });
}
