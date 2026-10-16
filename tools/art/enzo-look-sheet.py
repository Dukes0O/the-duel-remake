"""Comparison sheet for the Ferrari Enzo's in-game look (EARN-CAR-1 round 5).

Builds one JPG (500 KB at most) from the screenshots of the `enzo-look`
browser scenario. Usage:
  python tools/art/enzo-look-sheet.py <final run folder> <before-fix side.png> <out.jpg> [max bytes]
The looks folder has a 20 MB budget (tools/test-review-evidence.mjs), so the
round 5 sheet was built with a 125,000-byte limit.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 270)
TILES = [
    ('enzo-chase.png', 'Racing, chase camera'),
    ('enzo-side.png', 'Side (round 5 wheels)'),
    ('enzo-front-straight.png', 'Front'),
    ('enzo-rear-three-quarter.png', 'Rear three-quarter'),
    ('enzo-damaged.png', 'Damaged: 2 front hits, 1 left'),
    ('enzo-showroom.png', 'Menu showroom'),
    ('enzo-garage.png', 'Garage page'),
    (None, 'Side before the fix (white wheels)'),
]


def main(run, before, out, limit='500000'):
    run, out, limit = Path(run), Path(out), int(limit)
    sheet = Image.new('RGB', (TILE[0] * 4, TILE[1] * 2 + 34), (18, 22, 20))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('arialbd.ttf', 15)
        title = ImageFont.truetype('arialbd.ttf', 17)
    except OSError:
        font = title = ImageFont.load_default()
    draw.text((10, 8), 'EARN-CAR-1 Ferrari Enzo, round 5: in the game at Panorama Ridge Sunset (1280 x 720, High)',
              fill=(235, 228, 210), font=title)
    for index, (name, label) in enumerate(TILES):
        source = Path(before) if name is None else run / name
        image = Image.open(source).convert('RGB').resize(TILE, Image.LANCZOS)
        x, y = (index % 4) * TILE[0], 34 + (index // 4) * TILE[1]
        sheet.paste(image, (x, y))
        draw.rectangle((x, y + TILE[1] - 24, x + TILE[0], y + TILE[1]), fill=(10, 12, 11))
        draw.text((x + 8, y + TILE[1] - 21), label, fill=(232, 190, 130), font=font)
    for quality in (82, 76, 70, 64, 58, 52, 46, 40):
        sheet.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        if out.stat().st_size <= limit:
            break
    else:
        sys.exit(f'{out} is {out.stat().st_size} bytes, over the {limit:,}-byte limit')
    print(f'{out} {out.stat().st_size} bytes')


if __name__ == '__main__':
    main(*sys.argv[1:5])
