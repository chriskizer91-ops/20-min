"""Bake the title page's lighter copies of its paintings: python3 src/title/bake-art.py (needs Pillow).

dist/title.html carries ten stills and two field paintings as base64, which adds a third to their size. At the
originals' quality the page came to 7.4 MB, so this writes copies to art/title/ that the page imports instead
(the originals in art/stills/ and art/backgrounds/ stay as they are, for everything else):
  - the heavier stills, re-encoded at a slightly lower quality (a painted still survives it; the pans never
    zoom past about 1.4x);
  - the two field paintings, cropped from 3:2 to 16:9 (the cut-scenes only frame the part kept) and re-encoded;
  - the night clouds, cut down to the three puffy cells the title drifts (a 3x1 strip of 256 px cells).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'art' / 'title'
QUALITY = 72

# Stills already this light are imported from art/stills/ directly.
HEAVY = ['moonrise', 'square-from-the-well', 'lights-go-down-the-river', 'witch-at-her-door', 'the-skiff-wakes',
         'lights-go-home', 'two-lamplighters']
# Field paintings: (file, top row of the 16:9 crop). Nettie's hut keeps its rafters and loses some of the fence
# along the bottom; Bogmire keeps the top of the mooring mast and loses the near boardwalk.
CROPS = [('nettie-hut-inside', 40), ('bogmire-moot-circle', 0)]
CLOUD_CELLS = [(0, 0), (1, 0), (1, 1)]  # (column, row) in the 3x2 atlas


def save(im, name, **opts):
    path = OUT / f'{name}.webp'
    im.save(path, 'WEBP', method=6, **opts)
    print(f'{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB')


def main():
    OUT.mkdir(exist_ok=True)
    for name in HEAVY:
        save(Image.open(ROOT / 'art' / 'stills' / f'{name}.webp').convert('RGB'), name, quality=QUALITY)
    for name, top in CROPS:
        im = Image.open(ROOT / 'art' / 'backgrounds' / f'{name}.webp').convert('RGB')
        h = round(im.width * 9 / 16)
        save(im.crop((0, top, im.width, top + h)), name, quality=QUALITY)
    atlas = Image.open(ROOT / 'art' / 'fx' / 'night-clouds.webp').convert('RGBA')
    strip = Image.new('RGBA', (256 * len(CLOUD_CELLS), 256))
    for i, (c, r) in enumerate(CLOUD_CELLS):
        strip.paste(atlas.crop((c * 256, r * 256, c * 256 + 256, r * 256 + 256)), (i * 256, 0))
    save(strip, 'night-clouds-puffy', quality=80, alpha_quality=80)


if __name__ == '__main__':
    main()
