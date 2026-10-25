"""One comparison sheet (JPG) for a SKI-ART look round.

Usage:
  python tools/art/ski-sheet.py <render folder> <out.jpg> "<title>" [max bytes]

The render folder holds what `blender ... ski.py -- --root . --render <folder>` wrote:
<folder>/<piece>[-<view>].png. Resizes only; no picture is edited. The sheet stays at or
under the byte limit (default 500,000) by lowering the JPEG quality.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (384, 288)
TILES = [
    ('skier-stand.png', 'Skier: stand'), ('skier-crouch.png', 'Skier: crouch'), ('skier-lean-left.png', 'Skier: lean left'),
    ('skier-lean-right.png', 'Skier: lean right'), ('skier-tuck.png', 'Skier: tuck'),
    ('skier-air.png', 'Skier: air'), ('skier-tumble.png', 'Skier: tumble'), ('skier-crouch-side.png', 'Skier: crouch, side'),
    ('skier-tuck-side.png', 'Skier: tuck, side'), ('skier-air-front.png', 'Skier: air, front'),
    ('guide.png', 'Guide (red jacket, radio)'), ('guest-1.png', 'Guest 1'), ('guest-2.png', 'Guest 2'), ('guest-3.png', 'Guest 3'),
    ('guest-4.png', 'Guest 4'),
    ('pole-red.png', 'Slalom pole'), ('gate-red.png', 'Giant-slalom gate, red'), ('gate-blue.png', 'Giant-slalom gate, blue'),
    ('arch-start.png', 'Timing arch: start'), ('arch-finish.png', 'Timing arch: finish'),
    ('flag-drop.png', 'Drop pad flag'), ('flag-pickup.png', 'Pickup pad flag'), ('kicker.png', 'Kicker with wooden lip'),
    ('kicker-back.png', 'Kicker from the lip'), ('netting.png', 'Safety netting'),
]

def main():
    folder, out, title = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else 500_000
    cols = 5; rows = (len(TILES) + cols - 1) // cols
    head = 40; label = 22
    sheet = Image.new('RGB', (cols * TILE[0], head + rows * (TILE[1] + label)), (22, 22, 24))
    draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('arial.ttf', 16); big = ImageFont.truetype('arial.ttf', 21)
    except OSError: font = big = ImageFont.load_default()
    draw.text((10, 9), title, fill=(235, 230, 215), font=big)
    for index, (path, caption) in enumerate(TILES):
        x = (index % cols) * TILE[0]; y = head + (index // cols) * (TILE[1] + label)
        file = folder / path
        if file.exists():
            sheet.paste(Image.open(file).convert('RGB').resize(TILE, Image.LANCZOS), (x, y + label))
        draw.text((x + 8, y + 3), caption, fill=(220, 215, 200), font=font)
    for quality in range(90, 20, -5):
        sheet.save(out, 'JPEG', quality=quality, optimize=True)
        if out.stat().st_size <= limit: break
    print(f'{out} {out.stat().st_size} bytes, quality {quality}')

main()
