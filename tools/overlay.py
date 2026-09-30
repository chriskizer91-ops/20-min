"""Draw a scene's walk area, walk-behind layers, lights and exits over its painting, to check them by eye.

    python3 tools/overlay.py scenes/wickhollow-square.json [out.png] [--crop x0,y0,x1,y1] [--zoom 2]

Cyan: where characters can walk (holes in red). Magenta: layers that can hide a character, with their
base line in yellow. Orange dots: lights. Green: exits. Needs Pillow (pip install Pillow).
"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent


def ring(shape):
    if isinstance(shape, dict) and 'ellipse' in shape:
        cx, cy, rx, ry = shape['ellipse']
        n = shape.get('segments', 16)
        return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]
    return [(p[0], p[1]) for p in shape]


def main():
    args = sys.argv[1:]
    crop, zoom = None, 1
    if '--crop' in args:
        i = args.index('--crop'); crop = [int(v) for v in args[i + 1].split(',')]; del args[i:i + 2]
    if '--zoom' in args:
        i = args.index('--zoom'); zoom = int(args[i + 1]); del args[i:i + 2]
    scene_path = Path(args[0])
    out = Path(args[1]) if len(args) > 1 else Path('overlay.png')
    scene = json.loads(scene_path.read_text())
    img = Image.open(ROOT / scene['image']).convert('RGBA')
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)

    for poly in scene['walk']:
        pts = ring(poly['points'])
        d.polygon(pts, fill=(0, 220, 255, 50), outline=(0, 240, 255, 255))
        for hole in poly.get('holes', []):
            d.polygon(ring(hole), fill=(255, 40, 40, 90), outline=(255, 60, 60, 255))
    for layer in scene['layers']:
        for part in layer['outline']:
            d.polygon(ring(part), fill=(255, 0, 200, 70), outline=(255, 80, 230, 255))
        base = layer['base']
        if isinstance(base[0], list):
            d.line([tuple(base[0]), tuple(base[1])], fill=(255, 240, 0, 255), width=3)
        else:
            x, y = base
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 240, 0, 255))
    for light in scene.get('lights', []):
        x, y = light['pixel']
        d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=(255, 150, 0, 255), width=2)
    for ex in scene.get('exits', []):
        d.polygon(ring(ex['zone']), fill=(0, 255, 80, 60), outline=(0, 255, 80, 255))
    sx, sy = scene['spawn']['pixel']
    d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], outline=(255, 255, 255, 255), width=2)

    result = Image.alpha_composite(img, over)
    if crop:
        result = result.crop(crop)
    if zoom != 1:
        result = result.resize((result.width * zoom, result.height * zoom), Image.LANCZOS)
    result.convert('RGB').save(out)
    print('wrote', out)


if __name__ == '__main__':
    main()
