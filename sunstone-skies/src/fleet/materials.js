// materials.js: each levelled-up ship's materials. They start from the ships' own painted materials (ship/materials.js, cut
// from Chris's Brig pictures) and add a few: gilt paint for the port lids and carvings, red lead inside the lids, iron
// for armour plate, lamp glass, the aether conduits, and racing silk. Every ship gets its own copies, patched with
// the features in shaders.js and sharing one set of uniforms, so its damage and power show on it alone.
import * as THREE from 'three';
import { patch, depthFor, shipUniforms } from './shaders.js';

const FEATS = {
  hull: ['STRAKE', 'SCORCH'], plates: ['STRAKE', 'SCORCH'], deck: ['SCORCH'], wood: ['SCORCH'],
  canvas: ['RIPPLE', 'HOLES'], silk: ['RIPPLE', 'HOLES'],
  gem: ['GEM'], flag: ['RIPPLE', 'PENNANT'], flow: ['FLOW'],
};

// The new materials, made once and copied for each ship
function extras(art) {
  const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o });
  const canvas = art.M.canvas.clone(); canvas.vertexColors = true;
  const silk = art.M.canvas.clone(); silk.vertexColors = true; silk.color.set(0xfff3d2); silk.emissive.set(0xfff0d0); silk.emissiveIntensity = 0.26; silk.roughness = 0.55;
  return {
    canvas, silk,
    gilt: std({ color: 0xd9a547, metalness: 0.6, roughness: 0.34 }),
    redlead: std({ color: 0x86281c, roughness: 0.75 }),
    iron: std({ color: 0x4a4f58, metalness: 0.78, roughness: 0.42 }),
    glass: std({ color: 0xffdca8, emissive: 0xffa448, emissiveIntensity: 1.5, roughness: 0.18 }),
    flow: std({ color: 0x2a1a0c, emissive: 0xffa63d, emissiveIntensity: 1, roughness: 0.25, metalness: 0.1 }),
    plumwood: std({ map: art.T.deck, color: 0x7c3a66, normalMap: art.T.deckN, roughness: 0.7 }),
  };
}

// Colours: the Captain's plum and cream, or a raider's rust
export const COLOURS = {
  captain: { strake: 0x6a2456, sails: 0xffffff, sailGlow: 0xfff2dc, trim: [0.42, 0.12, 0.32], pennant: [[0.95, 0.72, 0.28], [0.42, 0.1, 0.3]], planks: 0xffffff },
  raider: { strake: 0x6e2318, sails: 0xc8735c, sailGlow: 0x7a3020, trim: [0.25, 0.08, 0.06], pennant: [[0.09, 0.07, 0.06], [0.72, 0.09, 0.07]], planks: 0x9a8781 },
};

export function fleetArt(art) {
  const X = extras(art);
  const base = { ...art.M, ...X };
  // a fresh set of materials for one ship
  function instance(colours = COLOURS.captain) {
    const U = shipUniforms();
    U.uPaint.value.set(colours.strake);
    const fixed = {}, moving = {}, depth = {};
    const make = (key, rig) => {
      const m = base[key].clone();
      if (key === 'hull') m.color.set(colours.planks);
      if (key === 'plates') m.color.multiply(new THREE.Color(colours.planks));
      if (key === 'canvas') { m.color.set(colours.sails); m.emissive.set(colours.sailGlow); }
      const feats = [...(FEATS[key] ?? []), ...(rig ? ['RIG'] : [])];
      if (feats.length) patch(m, U, feats);
      return m;
    };
    return {
      U, colours,
      get(key, rig = false) {
        const set = rig ? moving : fixed;
        return (set[key] ??= make(key, rig));
      },
      depth(key) {
        const feats = [...(FEATS[key] ?? []), 'RIG'];
        return (depth[key] ??= depthFor(U, feats));
      },
    };
  }
  return { ...art, X, instance };
}
