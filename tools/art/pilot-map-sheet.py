"""One comparison sheet (JPG) for a MAP-ART look round.

Usage:
  python tools/art/pilot-map-sheet.py <render folder> <out.jpg> "<title>" [max bytes]

The render folder holds what `blender ... pilot-map-props.py -- --root . --render <folder>`
wrote: <folder>/<prop>/<view>.png. The five signs are shown twice, from the air (about 50 m
up) and from a car's height, so the sheet shows both halves of the brief. Resizes only; no
picture is edited. The sheet stays at or under the byte limit (default 500,000) by lowering
the JPEG quality.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 300)
TILES = [
    ('sign-logging-arrows/air.png', 'Sign 1 from the air: logging track arrows'),
    ('sign-logging-arrows/car.png', 'Sign 1 from a car'),
    ('sign-start-grid/air.png', 'Sign 2 from the air: start grid'),
    ('sign-start-grid/car.png', 'Sign 2 from a car'),
    ('sign-fire-pits/air.png', 'Sign 3 from the air: camp-fire pits'),
    ('sign-fire-pits/car.png', 'Sign 3 from a car'),
    ('sign-chalk-line/air.png', 'Sign 4 from the air: chalk line on the wall'),
    ('sign-chalk-line/car.png', 'Sign 4 from a car'),
    ('sign-lighthouse-window/air.png', 'Sign 5 from the air: lit lighthouse window'),
    ('sign-lighthouse-window/car.png', 'Sign 5 from a car'),
    ('table-mesa/far.png', 'The Table from afar'),
    ('table-mesa/top.png', 'The Table: the top'),
    ('table-lookout/three-quarter.png', 'Fire lookout'),
    ('table-lookout/cab.png', 'Lookout cab and table'),
    ('table-plane-wreck/three-quarter.png', 'Bush plane wreck'),
    ('table-plane-wreck/tail.png', 'Tail number'),
    ('table-strip/along.png', 'Dirt strip'),
    ('table-strip/windsock.png', 'Windsock'),
    ('table-logbook/open.png', 'The logbook'),
]

def main():
    folder, out, title = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else 500_000
    cols = 4; rows = (len(TILES) + cols - 1) // cols
    head = 44; label = 24
    sheet = Image.new('RGB', (cols * TILE[0], head + rows * (TILE[1] + label)), (22, 22, 24))
    draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('arial.ttf', 17); big = ImageFont.truetype('arial.ttf', 22)
    except OSError: font = big = ImageFont.load_default()
    draw.text((10, 10), title, fill=(235, 230, 215), font=big)
    for index, (path, caption) in enumerate(TILES):
        x = (index % cols) * TILE[0]; y = head + (index // cols) * (TILE[1] + label)
        file = folder / path
        if file.exists():
            image = Image.open(file).convert('RGB').resize(TILE, Image.LANCZOS)
            sheet.paste(image, (x, y + label))
        draw.text((x + 8, y + 3), caption, fill=(220, 215, 200), font=font)
    for quality in range(90, 20, -5):
        sheet.save(out, 'JPEG', quality=quality, optimize=True)
        if out.stat().st_size <= limit: break
    print(f'{out} {out.stat().st_size} bytes, quality {quality}')

main()
