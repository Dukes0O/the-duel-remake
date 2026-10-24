"""One comparison sheet (JPG) for a SIRENA-ART look round.

Usage:
  python tools/art/sirena-sheet.py <render folder> <out.jpg> "<title>" [max bytes]

The render folder holds what the round's commands wrote (all under .evidence/):
  car/<view>.png      tools/blender/car-review.py on the restored car
  wreck/<view>.png    tools/blender/sirena-review.py (three-quarter, rear-three-quarter, side, top)
  <part>/three-quarter.png for badge, steering-wheel, wheel, bonnet, door, lift-bag, abalone
Resizes only; no picture is edited. The sheet stays at or under the byte limit
(default 500,000) by lowering JPEG quality.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 300)
CAR = [('front-three-quarter', 'Restored: front three-quarter'), ('side', 'Restored: side'),
       ('rear-three-quarter', 'Restored: rear three-quarter'), ('front-close', 'Restored: nose and covered lamp')]
WRECK = [('three-quarter', 'Wreck: front three-quarter'), ('rear-three-quarter', 'Wreck: rear three-quarter'),
         ('side', 'Wreck: side'), ('top', 'Wreck: from above')]
PARTS = [('badge', 'Part 1: enamel badge'), ('steering-wheel', 'Part 2: wood-rim steering wheel'), ('wheel', 'Part 3: wire wheel'),
         ('bonnet', 'Part 4: bonnet'), ('door', 'Part 5: door with the 7'), ('lift-bag', 'Lift bag'), ('abalone', 'Red abalone on rock')]


def main(folder, out, title, limit='500000'):
    folder, out, limit = Path(folder), Path(out), int(limit)
    tiles = [(folder / 'car' / f'{n}.png', l) for n, l in CAR] + [(folder / 'wreck' / f'{n}.png', l) for n, l in WRECK] \
        + [(folder / n / 'three-quarter.png', l) for n, l in PARTS]
    rows = (len(tiles) + 3) // 4
    sheet = Image.new('RGB', (TILE[0] * 4, TILE[1] * rows + 34), (18, 22, 20))
    draw = ImageDraw.Draw(sheet)
    try:
        font, head = ImageFont.truetype('arialbd.ttf', 15), ImageFont.truetype('arialbd.ttf', 17)
    except OSError:
        font = head = ImageFont.load_default()
    draw.text((10, 8), title, fill=(235, 228, 210), font=head)
    for index, (path, label) in enumerate(tiles):
        x, y = (index % 4) * TILE[0], 34 + (index // 4) * TILE[1]
        sheet.paste(Image.open(path).convert('RGB').resize(TILE, Image.LANCZOS), (x, y))
        draw.rectangle((x, y + TILE[1] - 24, x + TILE[0], y + TILE[1]), fill=(10, 12, 11))
        draw.text((x + 8, y + TILE[1] - 21), label, fill=(235, 228, 210), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    for quality in range(88, 30, -4):
        sheet.save(out, 'JPEG', quality=quality, optimize=True)
        if out.stat().st_size <= limit:
            print(f'{out} {out.stat().st_size} bytes at quality {quality}')
            return
    raise SystemExit(f'{out} is still over {limit} bytes at the lowest quality')


if __name__ == '__main__':
    main(*sys.argv[1:])
