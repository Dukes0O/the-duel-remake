"""One comparison sheet (JPG) for a MAP-ART look round. The first set of tiles (the five signs, lookout, strip, windsock, logbook) was accepted
in MAP-ART; MAP-ART-2 shows the mesa and the plane wreck.

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
    ('table-mesa/far.png', 'The Table from afar'),
    ('table-mesa/butte.png', 'The Table: the butte on the horizon'),
    ('table-mesa/cliff.png', 'Cliff: strata, joints, broken rim'),
    ('table-mesa/foot.png', 'Foot: fallen blocks, scree, a spire'),
    ('table-plane-wreck/three-quarter.png', 'Bush plane wreck'),
    ('table-plane-wreck/side.png', 'Dented airframe, torn wing'),
    ('table-plane-wreck/tail.png', 'Tail number N4471K on the fin'),
    ('table-plane-wreck/gear.png', 'Collapsed gear leg, dust and rust in the seams'),
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
