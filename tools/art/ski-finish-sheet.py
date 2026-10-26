"""Assemble SKI-FINISH's eight unaltered game views; resize and label only.

Run after the default ski-finish recipe with output second-layout:
  python tools/art/ski-finish-sheet.py
No Blender render, image generation or frame measurement is involved.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / '.evidence/2026-10-26/SKI-FINISH'
OUT = ROOT / 'docs/board/looks/ski-finish/look-1.jpg'
TILES = [
    ('second-layout/slalom-gate.png', 'Slalom: only the next pair of poles glows'),
    ('second-layout/slalom-finish-steady.png', 'Steady: 69.46 s, nine misses; stop condition'),
    ('second-layout/slalom-finish-practice.png', 'Practice: 30.59 s, two misses; scored finish'),
    ('second-layout/moguls-finish-steady.png', 'Moguls: steady weaving remains gold'),
    ('second-layout/aerials-jump-practice.png', 'Aerials: the tucked jump remains bronze'),
    ('second-layout/powder-yeti.png', 'Powder: the yeti watches; no clock'),
    ('second-layout/pickup-snow.png', 'Pickup: alpine snow at 3,233 m'),
    ('second-layout/group-summit.png', 'Thin air: advice appears as radio text'),
]
sheet = Image.new('RGB', (1280, 1610), '#171c20')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
draw.text((12, 12), 'SKI-FINISH | 26 October 2026 | keyboard evidence for Claude | switch stays dev', fill='white', font=font)
for index, (path, caption) in enumerate(TILES):
    x, y = index % 2 * 640, 45 + index // 2 * 390
    draw.text((x + 8, y + 5), caption, fill='white', font=font)
    with Image.open(RAW / path) as source:
        sheet.paste(source.convert('RGB').resize((640, 360), Image.Resampling.LANCZOS), (x, y + 30))
OUT.parent.mkdir(parents=True, exist_ok=True)
for quality in range(90, 29, -5):
    sheet.save(OUT, 'JPEG', quality=quality, optimize=True)
    if OUT.stat().st_size <= 500_000:
        break
else:
    raise RuntimeError('Sheet exceeds 500 KB')
print(f'{OUT}: {OUT.stat().st_size} bytes')
