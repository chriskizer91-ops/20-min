"""Bake the title page's lighter copies of its paintings: python3 src/title/bake-art.py (needs Pillow).

dist/title.html carries ten stills and two field paintings as base64, which adds a third to their size. At the
originals' quality the page came to 7.4 MB, so this writes copies to art/title/ that the page imports instead
(the originals in art/stills/ stay as they are, for everything else):
  - every still but the title painting, re-encoded at a slightly lower quality (a painted still survives it;
    the pans never zoom past about 1.6x). The title painting stays as it is: it's on screen longest, and at
    this quality its sky loses some of its faint painted stars;
  - (the two field paintings are no longer copied: the cut-scenes show a 16:9 strip of the field's own paintings,
    which the whole game carries anyway; src/title/art.js gives each strip's top row);
  - the night clouds, cut down to the three puffy cells the title drifts (a 3x1 strip of 256 px cells).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'art' / 'title'
QUALITY = 72

STILLS = ['moonrise', 'square-from-the-well', 'lights-go-down-the-river', 'witch-at-her-door', 'the-skiff-wakes',
          'the-night-misthollow-sank', 'witchfire-cauldron', 'lights-go-home', 'two-lamplighters']
CLOUD_CELLS = [(0, 0), (1, 0), (1, 1)]  # (column, row) in the 3x2 atlas


def save(im, name, **opts):
    path = OUT / f'{name}.webp'
    im.save(path, 'WEBP', method=6, **opts)
    print(f'{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB')


def main():
    OUT.mkdir(exist_ok=True)
    for name in STILLS:
        save(Image.open(ROOT / 'art' / 'stills' / f'{name}.webp').convert('RGB'), name, quality=QUALITY)
    atlas = Image.open(ROOT / 'art' / 'fx' / 'night-clouds.webp').convert('RGBA')
    strip = Image.new('RGBA', (256 * len(CLOUD_CELLS), 256))
    for i, (c, r) in enumerate(CLOUD_CELLS):
        strip.paste(atlas.crop((c * 256, r * 256, c * 256 + 256, r * 256 + 256)), (i * 256, 0))
    save(strip, 'night-clouds-puffy', quality=80, alpha_quality=80)


if __name__ == '__main__':
    main()
