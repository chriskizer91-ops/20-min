// Tools for building a model's face moods out of a painted face sheet (art/faces/*.webp): a few painted faces
// become many moods by cutting out and tilting the brows, closing the eyes, and redrawing the mouth, all on a
// canvas the size of one sheet cell. Used by Nettie (party-nettie-art.js) and the Lantern Mother (bosses-lantern-parts.js).

// The flat skin colour a sheet cell was painted on, read from near its top left corner.
export function sampleSkin(img, x = 8, y = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d');
  g.drawImage(img, x, y, 1, 1, 0, 0, 1, 1);
  const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
  return [r, gg, b];
}

export const rgb = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;

// A copy of part of an image, re-skinned: each pixel is divided by the colour it was painted on and multiplied by
// the new skin, so the features keep their shading but sit on the model's own skin tone.
export function reskin(img, [sx, sy, sw, sh], from, to) {
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const g = c.getContext('2d');
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = g.getImageData(0, 0, sw, sh);
  const d = data.data;
  const k = [0, 1, 2].map((i) => to[i] / Math.max(1, from[i]));
  for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] * k[j]);
  g.putImageData(data, 0, 0);
  return c;
}

// Drawing helpers on one cell canvas `g` whose painted skin is `skin` ([r, g, b]).
export function faceTools(g, skin) {
  // Paint skin over an ellipse, solid in the middle and feathered at the edge. (The gradient is made after the
  // transform, because a canvas gradient lives in the coordinates it's filled in.)
  const erase = (x, y, rx, ry) => {
    const r = Math.max(rx, ry);
    g.save();
    g.translate(x, y);
    g.scale(rx / r, ry / r);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, rgb(skin));
    grad.addColorStop(0.78, rgb(skin));
    grad.addColorStop(1, rgb(skin, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  return {
    erase,
    // Cut a brow out of `src` (a cell-sized image) and put it back tilted and moved. `inner` is +1 when the brow's
    // inner end is on its right (the viewer's left brow); tilt > 0 turns the inner end down.
    moveBrow(src, [x0, y0, x1, y1], inner, tilt, dy) {
      const strip = document.createElement('canvas');
      strip.width = x1 - x0;
      strip.height = y1 - y0;
      strip.getContext('2d').drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
      erase((x0 + x1) / 2, (y0 + y1) / 2 - 2, (x1 - x0) / 2 + 30, (y1 - y0) / 2 + 16);
      g.save();
      g.translate((x0 + x1) / 2, (y0 + y1) / 2 + dy);
      g.rotate(inner * tilt);
      g.drawImage(strip, -(x1 - x0) / 2, -(y1 - y0) / 2);
      g.restore();
    },
    // Lay part of another cell over this one with a feathered oval edge (e.g. closed eyes from a smiling face).
    transplant(src, [x, y, w, h]) {
      const piece = document.createElement('canvas');
      piece.width = w;
      piece.height = h;
      const pg = piece.getContext('2d');
      pg.drawImage(src, x, y, w, h, 0, 0, w, h);
      pg.globalCompositeOperation = 'destination-in';
      pg.translate(w / 2, h / 2);
      pg.scale(1, h / w);
      const grad = pg.createRadialGradient(0, 0, 0, 0, 0, w / 2);
      grad.addColorStop(0, '#000');
      grad.addColorStop(0.75, '#000');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      pg.fillStyle = grad;
      pg.fillRect(-w / 2, -w / 2, w, w);
      g.drawImage(piece, x, y);
    },
    // Closed eyes drawn in ink: a relaxed lid curve with lashes flicking out at the outer corner (or, squeezed, a
    // flatter line). side is -1 for the viewer's left eye.
    closedEye(x, y, side, { lash = '#2b1714', width = 64, sag = 26, crease = 'rgba(160,100,80,0.45)' } = {}) {
      g.strokeStyle = lash;
      g.lineCap = 'round';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(x - width, y + 4);
      g.quadraticCurveTo(x, y + sag, x + width, y + 4);
      g.stroke();
      g.lineWidth = 4;
      for (const k of [0, 1]) {
        g.beginPath();
        g.moveTo(x + side * (width - 6), y + 8 - k * 2);
        g.lineTo(x + side * (width + 12 + k * 8), y - 4 - k * 10);
        g.stroke();
      }
      g.strokeStyle = crease;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - width * 0.78, y - 18);
      g.quadraticCurveTo(x, y - 30, x + width * 0.78, y - 18);
      g.stroke();
    },
    // A mouth: 'o' (open, surprised), 'flat' (pressed), 'down' (pained)
    mouth(kind, x, y, { lip = '#b0645c', dark = '#7c3a36', half = 54 } = {}) {
      g.lineCap = 'round';
      if (kind === 'o') {
        g.fillStyle = dark;
        g.beginPath();
        g.ellipse(x, y + 2, 17, 21, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = lip;
        g.lineWidth = 6;
        g.stroke();
        return;
      }
      const droop = kind === 'down' ? 12 : 6;
      g.strokeStyle = dark;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x - half, y + droop);
      g.quadraticCurveTo(x, y - 10, x + half, y + droop);
      g.stroke();
      g.strokeStyle = lip;
      g.globalAlpha = 0.6;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x - 22, y + 12);
      g.quadraticCurveTo(x, y + 18, x + 22, y + 12);
      g.stroke();
      g.globalAlpha = 1;
    },
  };
}
