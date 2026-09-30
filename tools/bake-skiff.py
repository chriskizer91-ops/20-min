"""Bake the skiff's texture atlas from Thareia's turnaround sheet: python3 tools/bake-skiff.py

The 3D skiff (src/actors/airship.js) wears the painted sheet (art/airship/skiff-sheet.webp, from the New-game
repo's thareia/art-in/airship/ship-2-refitted-skiff.webp). Its hull is built to the sheet's side and top
silhouettes, so each view can be projected straight onto the triangles. This cuts the pieces out of the sheet
into one atlas:

  side       the hull's side (side view), with the fin and bow lantern painted over it repainted from nearby planks,
             and the skiff's name on the bow; stored twice, the second mirrored, so the name reads on both sides
  deck       the deck (top view), with the band under the crystals refilled from clean deck
  sail, fin, rudder, lantern   cut out with a transparent background, for flat cards
  crystal, furnace             projected onto the sunstones and the brazier

Writes art/airship/skiff-atlas.webp and src/actors/skiff-atlas.json (where each piece sits, in sheet and atlas
pixels). Needs Pillow and numpy.
"""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SHEET = 'art/airship/skiff-sheet.webp'
NAME = 'Magpie'
W, H = 1024, 1024

sheet = Image.open(SHEET).convert('RGB')
px = np.asarray(sheet).astype(np.float32)
BG = np.array([209, 209, 209], np.float32)

# ---------------------------------------------------------------- the side view's hull lines (sheet pixels)
# Measured from the sheet: the top of the brass rim, and the bottom of the keel, at points along the hull.
STERN_X, BOW_X, MID_RIM = 840, 1485, 346
RIM = [(840, 318), (900, 327), (950, 336), (1000, 342), (1050, 345), (1100, 346), (1150, 346), (1200, 344),
       (1250, 340), (1300, 334), (1350, 325), (1400, 312), (1440, 302), (1485, 296)]
KEEL = [(840, 405), (860, 410), (900, 421), (960, 435), (1000, 440), (1050, 445), (1100, 448), (1160, 450),
        (1220, 450), (1280, 446), (1320, 438), (1360, 419), (1380, 403), (1400, 386), (1420, 366), (1440, 340),
        (1460, 319), (1485, 298)]


def line(points, x):
    xs, ys = zip(*points)
    return float(np.interp(x, xs, ys))


def repaint(img, mask, dx):
    """Fill the masked hull pixels from the same spot on the hull dx pixels along, following the hull's curve,
    then match the fill's colour to the planks around the hole so it doesn't show as a patch."""
    out = img.copy()
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        r, k = line(RIM, x), line(KEEL, x)
        s = (y - r) / max(1.0, k - r)
        x2 = x + dx
        y2 = line(RIM, x2) + s * (line(KEEL, x2) - line(RIM, x2))
        out[y, x] = img[int(round(y2)), x2]
    ring = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(15))) > 0
    ring &= ~mask
    hull = np.zeros_like(mask)
    for x in range(STERN_X, BOW_X):
        hull[int(line(RIM, x)) + 4:int(line(KEEL, x)) - 4, x] = True
    ring &= hull
    inner = mask & hull
    if ring.any() and inner.any():
        gain = img[ring].mean(0) / np.maximum(out[inner].mean(0), 1)
        out[inner] = np.clip(out[inner] * gain, 0, 255)
    outside = mask & ~hull
    out[outside] = img[outside]
    return out


def polygon_mask(shape, points, grow=3):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    if grow:
        m = m.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    return np.asarray(m) > 0


side = px.copy()
# The starboard fin, painted in front of the hull
side = repaint(side, polygon_mask(side.shape, [(944, 356), (1010, 354), (1060, 456), (1018, 460)]), 170)
# The lantern hanging off the bow
side = repaint(side, polygon_mask(side.shape, [(1400, 340), (1444, 336), (1444, 402), (1400, 402)]), -34)

# ---------------------------------------------------------------- the top view's deck (sheet pixels)
# The bow is up. Centre line x = 383; the bow tip at y = 15 and the stern rail at y = 428.
TOP_CX, TOP_BOW, TOP_STERN = 383, 15, 428
# The hull's half-width at points along it, measured where nothing covers it (the middle is under the crystals)
HALF = [(15, 0), (25, 7), (40, 14), (55, 22), (70, 33), (85, 42), (100, 55), (115, 66), (150, 76), (200, 81),
        (260, 82), (330, 80), (385, 64), (400, 56), (415, 46), (428, 36)]

top = px.copy()
# Refill the band under the crystals row by row from clean deck further aft, stretched to the hull's width there
for y in range(148, 308):
    src_y = 352 + (y - 148) % 32
    h, hs = line(HALF, y), line(HALF, src_y)
    for x in range(TOP_CX - int(h) - 4, TOP_CX + int(h) + 5):
        xs = TOP_CX + (x - TOP_CX) * hs / h
        top[y, x] = px[src_y, int(round(xs))]

# ---------------------------------------------------------------- the atlas
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
pieces = {}


def cut(img, box, alpha=False):
    x0, y0, x1, y1 = box
    region = img[y0:y1, x0:x1]
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = np.clip(region, 0, 255).astype(np.uint8)
    if alpha:
        d = np.abs(region - BG).sum(2)
        a = np.clip((d - 18) * 8, 0, 255)
        rgba[..., 3] = a.astype(np.uint8)
        piece = Image.fromarray(rgba, 'RGBA')
        # Pull in the grey fringe a pixel
        a_img = piece.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
        piece.putalpha(a_img)
        return piece
    rgba[..., 3] = 255
    return Image.fromarray(rgba, 'RGBA')


def place(name, img, box, at, alpha=False, mirror=False):
    piece = cut(img, box, alpha)
    if mirror:
        piece = piece.transpose(Image.FLIP_LEFT_RIGHT)
    atlas.paste(piece, at)
    pieces[name] = {'src': list(box), 'at': list(at), 'mirror': mirror}
    return piece


SIDE_BOX = (830, 280, 1500, 462)
place('side', side, SIDE_BOX, (0, 0))
place('sideMirror', side, SIDE_BOX, (0, 190), mirror=True)
place('deck', top, (292, 5, 476, 440), (680, 0))
place('sail', px, (132, 140, 286, 302), (0, 400), alpha=True)
place('crystal', px, (1068, 14, 1176, 162), (160, 400))
place('furnace', px, (1082, 196, 1184, 340), (280, 400))
place('fin', px, (208, 321, 316, 388), (400, 400), alpha=True)
place('rudder', px, (768, 302, 840, 450), (530, 400), alpha=True)
place('lantern', px, (1006, 270, 1044, 324), (620, 400), alpha=True)

# The name on the bow, between the rim and the keel, reading the right way on each side
font = ImageFont.truetype('art/fonts/Jacquard12-Regular.ttf', 30)
for key in ('side', 'sideMirror'):
    p = pieces[key]
    x0, y0 = p['src'][0], p['src'][1]
    layer = Image.new('RGBA', (SIDE_BOX[2] - SIDE_BOX[0], SIDE_BOX[3] - SIDE_BOX[1]), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Near the bow: centred on sheet x 1318, a little under the rim
    cx, cy = 1318 - x0, 368 - y0
    if p['mirror']:
        cx = layer.width - cx
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
        d.text((cx + ox, cy + oy), NAME, font=font, fill=(40, 22, 12, 255), anchor='mm')
    d.text((cx, cy), NAME, font=font, fill=(236, 196, 104, 255), anchor='mm')
    atlas.alpha_composite(layer, tuple(p['at']))

atlas.save('art/airship/skiff-atlas.webp', quality=90, method=6)
meta = {
    'size': [W, H], 'name': NAME, 'pieces': pieces,
    'side': {'sternX': STERN_X, 'bowX': BOW_X, 'midRim': MID_RIM, 'rim': RIM, 'keel': KEEL},
    'top': {'cx': TOP_CX, 'bow': TOP_BOW, 'stern': TOP_STERN, 'half': HALF},
}
with open('src/actors/skiff-atlas.json', 'w') as f:
    json.dump(meta, f, indent=1)
print('wrote art/airship/skiff-atlas.webp and src/actors/skiff-atlas.json')
