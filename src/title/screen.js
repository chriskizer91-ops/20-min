// One full-screen canvas that draws "shots": the title painting with its sky, a cut-scene still under a slow
// camera move, the drawn grimoire page, or plain black. Shots are stacked and dissolve into each other: a new
// shot fades in over the one below, and once it is fully in, everything under it is dropped. That one rule
// gives every transition on the page: title to black, black to a still, still to still, still to the title card.
//
// Why a canvas rather than <img> layers: the title's clouds, flames and motes live in the painting's own pixels
// and move with its pan, and one canvas at up to 2x the screen's pixels stays smooth on a phone.

const NIGHT = '#07050b';

// The camera: [x, y, zoom] -> screen = painting * s + (ox, oy). zoom 1 just covers the screen; x and y (0-1)
// are the point of the painting to centre, clamped so the painting always covers the screen.
export function place(vw, vh, w, h, [fx, fy, zoom]) {
  const s = Math.max(vw / w, vh / h) * Math.max(1, zoom);
  return { s, cx: clampCentre(fx * w, vw / (2 * s), w), cy: clampCentre(fy * h, vh / (2 * s), h) };
}
const clampCentre = (c, half, size) => Math.min(Math.max(c, half), size - half);

// A move from one framing to another. Each end is clamped at its own zoom and then the scale and centre are
// blended. The blend never shows past the painting's edge: the clamp's margin (half the screen over the scale)
// curves below the straight line between the two ends' margins, and the blended centre stays on that line.
export function move(vw, vh, w, h, from, to, k) {
  const a = place(vw, vh, w, h, from), b = place(vw, vh, w, h, to);
  const s = a.s + (b.s - a.s) * k, cx = a.cx + (b.cx - a.cx) * k, cy = a.cy + (b.cy - a.cy) * k;
  return { s, ox: vw / 2 - cx * s, oy: vh / 2 - cy * s };
}

// Slow at both ends, like a camera on a dolly
export const ease = (k) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));

// A painting under a camera move lasting `dur` seconds from `t0`. With reduced motion it holds the end framing.
export function stillShot(img, info, from, to, t0, dur, reduced) {
  return {
    kind: 'still',
    draw(ctx, v, now) {
      const k = reduced ? 1 : ease((now - t0) / dur);
      const m = move(v.vw, v.vh, info.w, info.h, from, to, k);
      ctx.setTransform(m.s * v.dpr, 0, 0, m.s * v.dpr, m.ox * v.dpr, m.oy * v.dpr);
      ctx.drawImage(img, 0, 0, info.w, info.h);
    },
  };
}

export const blackShot = {
  kind: 'black',
  draw(ctx, v) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, v.vw * v.dpr, v.vh * v.dpr);
  },
};

export function createScreen(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = { vw: 1, vh: 1, dpr: 1 };
  let layers = [];
  const resize = () => {
    // 2x is plenty for a painting this size, and keeps a 3x phone from pushing 9x the pixels
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.vw = window.innerWidth;
    view.vh = window.innerHeight;
    canvas.width = Math.round(view.vw * view.dpr);
    canvas.height = Math.round(view.vh * view.dpr);
  };
  resize();
  addEventListener('resize', resize);
  const alphaOf = (L, now) => (L.dur > 0 ? Math.min(1, Math.max(0, (now - L.t0) / L.dur)) : 1);
  return {
    view,
    // Fade a shot in over `dur` seconds, over whatever is showing
    push(shot, dur, now) { layers.push({ shot, t0: now, dur }); },
    get top() { return layers[layers.length - 1]?.shot ?? null; },
    // Is this shot showing at all, or has something covered it completely?
    showing(shot, now) {
      const i = layers.findIndex((L) => L.shot === shot);
      return i >= 0 && !layers.slice(i + 1).some((L) => alphaOf(L, now) >= 1);
    },
    draw(now) {
      let first = 0;
      layers.forEach((L, i) => { if (alphaOf(L, now) >= 1) first = i; });
      if (first > 0) layers = layers.slice(first);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const L of layers) {
        const a = alphaOf(L, now);
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a;
        L.shot.draw(ctx, view, now, a);
        ctx.restore();
      }
    },
  };
}
