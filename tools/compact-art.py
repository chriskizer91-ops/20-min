#!/usr/bin/env python3
"""The game's paintings, made small enough for one page: python3 tools/compact-art.py

The whole game is one HTML file with every picture written into it as text (a data: URL), and a page can be at most
16 MB. The art at full quality would make it about 20 MB, so tools/build.mjs runs this first. Its paintings are
re-encoded a little smaller here, into node_modules/.cache/compact-art/ (same paths as art/), and the game's build
reads those copies instead of the originals. The demos, which hold only their own paintings, use the originals.

  field paintings (art/backgrounds)  full size, webp quality 78: side by side at 2x, hard to tell from the originals
  battle backdrops (art/battle)      full size, quality 72: they sit behind the fight
  cut-scene stills (art/title)       1280 wide, quality 76: shown under slow camera moves (src/title/art.js keeps
                                     their original sizes, which the camera moves are in, and draws them to that size)
  the title painting (art/stills)    full size, quality 78
  the world map (art/map)            full size, quality 75
Everything else (portraits, icons, effects, anything with see-through parts) is used as it is.

A copy is only made again when its original is newer, or the settings change. It needs Pillow (pip install pillow);
without it the build uses the originals and says the page is too big to publish.
"""
import json
import os
import sys

RULES = [  # folder, widest it can be (None: as it is), webp quality
    ('art/backgrounds/', None, 78),
    ('art/battle/', None, 72),
    ('art/title/', 1280, 76),
    ('art/stills/', None, 78),
    ('art/map/', None, 75),
]
OUT = 'node_modules/.cache/compact-art'


def main():
    try:
        from PIL import Image
    except ImportError:
        print('compact-art: Pillow is not installed (pip install pillow); the game will use the full-size art')
        return 1
    manifest_path = os.path.join(OUT, 'manifest.json')
    try:
        manifest = json.load(open(manifest_path))
    except (OSError, ValueError):
        manifest = {}
    before = after = made = 0
    for folder, widest, quality in RULES:
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            src = os.path.join(folder, name)
            if not name.endswith('.webp'):
                continue
            dst = os.path.join(OUT, src)
            settings = f'{widest}/{quality}'
            size = os.path.getsize(src)
            before += size
            fresh = os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src) and manifest.get(src) == settings
            if not fresh:
                img = Image.open(src)
                img.load()
                if img.mode != 'RGB':  # see-through sheets (the title's clouds) stay as they are
                    data = open(src, 'rb').read()
                else:
                    if widest and img.width > widest:
                        img = img.resize((widest, round(img.height * widest / img.width)), Image.LANCZOS)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    img.save(dst + '.part', 'WEBP', quality=quality, method=6)
                    data = open(dst + '.part', 'rb').read()
                    os.remove(dst + '.part')
                    if len(data) >= size:  # (never bigger than the original)
                        data = open(src, 'rb').read()
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                open(dst, 'wb').write(data)
                manifest[src] = settings
                made += 1
            after += os.path.getsize(dst)
    os.makedirs(OUT, exist_ok=True)
    json.dump(manifest, open(manifest_path, 'w'), indent=1, sort_keys=True)
    print(f'compact-art: the paintings, {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB ({made} made just now)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
