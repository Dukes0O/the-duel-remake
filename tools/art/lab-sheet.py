"""One comparison sheet (JPG) for a LAB-ART look round.

Usage:
  python tools/art/lab-sheet.py <render folder> <out.jpg> "<title>" [max bytes]

The render folder holds what the round's commands wrote (all under .evidence/):
  layout/<view>.png          tools/blender/lab-review.py on layout.glb (roof cut away)
  layout-closed/door.png     the same from the open door, roof on
  <bench>/three-quarter.png  one per bench model
Resizes only; no picture is edited. The sheet stays at or under the byte limit
(default 500,000) by lowering JPEG quality.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 300)
TILES = [
    ('layout/overview.png', 'The Lab from above (roof cut away)'),
    ('layout-closed/door.png', 'From the open door'),
    ('layout/back-wall.png', 'Back wall: rig, jars, rotor, launcher'),
    ('layout/left-side.png', 'Left: drop tower, fire pit, pegboard'),
    ('layout/right-side.png', 'Right: wind tunnel, turning arm'),
    ('layout/weigh-pad.png', 'The weighing pad'),
    ('layout/workshop.png', 'Workshop: benches, pegboard, tool chests'),
    ('layout/coffee.png', 'Coffee corner and cable runs'),
    ('weighing-pad/three-quarter.png', 'Bench: weighing pad'),
    ('weights-and-cans/three-quarter.png', 'Bench: weights and fuel cans'),
    ('drop-tower/three-quarter.png', 'Bench: drop tower and sand pit'),
    ('fire-pit/three-quarter.png', 'Bench: fire pit'),
    ('pendulum-frame/three-quarter.png', 'Bench: pendulum frame'),
    ('rotor-stand/three-quarter.png', 'Bench: rotor test stand'),
    ('bending-rig/three-quarter.png', 'Bench: bending rig'),
    ('nail-jars/three-quarter.png', 'Bench: nail jars'),
    ('turning-arm/three-quarter.png', 'Bench: turning arm'),
    ('map-table/three-quarter.png', 'Bench: map table'),
    ('wind-tunnel/three-quarter.png', 'Bench: wind tunnel'),
    ('launcher-ramp/three-quarter.png', 'Bench: launcher ramp'),
    ('snow-trays/three-quarter.png', 'Bench: snow trays and skis'),
]


def main(folder, out, title, limit='500000'):
    folder, out, limit = Path(folder), Path(out), int(limit)
    rows = (len(TILES) + 3) // 4
    sheet = Image.new('RGB', (TILE[0] * 4, TILE[1] * rows + 34), (18, 22, 20))
    draw = ImageDraw.Draw(sheet)
    try:
        font, head = ImageFont.truetype('arialbd.ttf', 15), ImageFont.truetype('arialbd.ttf', 17)
    except OSError:
        font = head = ImageFont.load_default()
    draw.text((10, 8), title, fill=(235, 228, 210), font=head)
    for index, (name, label) in enumerate(TILES):
        x, y = (index % 4) * TILE[0], 34 + (index // 4) * TILE[1]
        sheet.paste(Image.open(folder / name).convert('RGB').resize(TILE, Image.LANCZOS), (x, y))
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
