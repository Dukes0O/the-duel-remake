"""Assemble SKI-FINISH's six unaltered game views (look-2, 3 November 2026); resize and label only.

Run after the ski-drop-trip, ski-finish and ski-view browser scenarios, with their three output folders:
  python tools/art/ski-finish-sheet.py <ski-drop-trip folder> <ski-finish folder> <ski-view folder>
No Blender render, image generation or frame measurement is involved.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/board/looks/ski-finish/look-2.jpg'
WIDTH, HEIGHT = 640, 360

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
trip, finish, view = (Path(arg) for arg in sys.argv[1:])
TILES = [
    (trip / 'arrival.png', '1. The leg ends 400 m from Devils Playground: the orange light'),
    (trip / 'pad.png', '2. On the pad: orange ring, the run menu'),
    (trip / 'pickup.png', '3. Back at the pickup: the pump and Fill up here'),
    (view / 'ski-chase.png', '4. Slalom gates'),
    (finish / 'aerials-jump-practice.png', '5. Aerials jump (tucked)'),
    (finish / 'powder-yeti.png', '6. Powder bowl and the yeti'),
]
sheet = Image.new('RGB', (WIDTH * 3, HEIGHT * 2), '#141414')
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 18)
for index, (path, caption) in enumerate(TILES):
    with Image.open(path) as source:
        tile = source.convert('RGB').resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(tile)
    draw.rectangle([0, HEIGHT - 30, WIDTH, HEIGHT], fill='black')
    draw.text((8, HEIGHT - 26), caption, fill='white', font=font)
    sheet.paste(tile, (index % 3 * WIDTH, index // 3 * HEIGHT))
for quality in range(85, 29, -5):
    sheet.save(OUT, 'JPEG', quality=quality, optimize=True)
    if OUT.stat().st_size <= 500_000:
        break
else:
    raise RuntimeError('Sheet exceeds 500 KB')
print(f'{OUT}: {OUT.stat().st_size} bytes')
