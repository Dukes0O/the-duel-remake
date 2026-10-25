"""One comparison sheet (JPG) for a LAB-FAN-ART look round.

Usage:
  python tools/art/speirling-sheet.py <render folder> <out.jpg> "<title>" [max bytes]

The render folder holds what the round's commands wrote (all under .evidence/):
  car/<view>.png        tools/blender/car-review.py on the Spéirling (four views)
  car2/<view>.png       tools/blender/lab-review.py on the same GLB (top, left)
Resizes only; no picture is edited. Stays at or under the byte limit (default
500,000) by lowering JPEG quality.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 300)
TILES = [
    ('car/front-three-quarter.png', 'Speirling: front three-quarter'), ('car/side.png', 'Side'),
    ('car/rear-three-quarter.png', 'Rear three-quarter: spine, grilles, wing'), ('car2/top.png', 'From above'),
    ('car2/left.png', 'From the other side'), ('car/front-close.png', 'Nose and canopy close-up'),
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
        draw.text((x + 8, y + TILE[1] - 21), label.replace('Spirling', 'Speirling'), fill=(235, 228, 210), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    for quality in range(88, 30, -4):
        sheet.save(out, 'JPEG', quality=quality, optimize=True)
        if out.stat().st_size <= limit:
            print(f'{out} {out.stat().st_size} bytes at quality {quality}')
            return
    raise SystemExit(f'{out} is still over {limit} bytes at the lowest quality')


if __name__ == '__main__':
    main(*sys.argv[1:])
