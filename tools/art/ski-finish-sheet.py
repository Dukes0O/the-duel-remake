"""Assemble SKI-FINISH's four unaltered game views; resize and label only.

Run after the default, DETAIL=1 and PHOTO=1 ski-finish browser recipes:
  python tools/art/ski-finish-sheet.py
No Blender render, image generation or frame measurement is involved.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / '.evidence/2026-10-26/SKI-FINISH'
OUT = ROOT / 'docs/board/looks/ski-finish/look-1.jpg'
TILES = [
    ('keyboard-corrected/slalom-gate.png', 'Slalom: visible poles; keyboard line is difficult'),
    ('jump-photo/aerials-jump-tuck.png', 'Aerials: tuck for air; straight bronze, whole spin gold'),
    ('detail/powder-yeti.png', 'Powder: the yeti watches; three stashes, no clock'),
    ('keyboard-corrected/pickup-snow.png', 'Pickup: alpine snow at 3,233 m; ground gap 0.016 m'),
]
sheet = Image.new('RGB', (1280, 830), '#171c20')
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
