"""MAP-FINISH screenshot sheet. No renders or generated art; crop and resize only.
python tools/art/map-finish-sheet.py .evidence/2026-10-26/MAP-FINISH docs/board/looks/pilot-map/look-1.jpg
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

root, out = map(Path, sys.argv[1:3])
tiles = [
    ('final/map-whole-after.png', 'Whole chart: spread names and leader lines', None),
    ('final/look-table-top.png', 'The Table: downward player view', None),
    ('before/map-open.png', 'Before: home / city names (mixed ownership)', (600, 355, 845, 545)),
    ('final/map-whole-after.png', 'After: home / city names (all owned)', (600, 355, 845, 545)),
    ('final/look-panorama-ridge-night.png', 'Summit lookout: existing flame / smoke sprites', None),
    ('final/table-landed-logbook.png', 'Table landing: 500 credits and the logbook', None),
    ('final/look-tremblant-woods-reverse.png', 'Logging arrows: downward view at 85 m', None),
    ('final/look-panorama-ridge-reverse.png', 'Reverse start grid: downward view at 85 m', None),
    ('final/look-harbour-lights-reverse.png', 'Harbour chalk line: downward view at 85 m', None),
    ('final/look-harbour-lights-dusk.png', 'Breakwater lamp: downward view at 85 m', None),
]
w, h, caption = 800, 450, 30
sheet = Image.new('RGB', (w * 2, 50 + (h + caption) * ((len(tiles) + 1) // 2)), '#171c1b')
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('arial.ttf', 18)
except OSError:
    font = ImageFont.load_default()
draw.text((15, 13), 'MAP-FINISH | 26 October 2026 | player cameras, 1280 x 720 | no frame timing', font=font, fill='#efe6cf')
for i, (file, title, crop) in enumerate(tiles):
    x, y = (i % 2) * w, 50 + (i // 2) * (h + caption)
    frame = Image.open(root / file).convert('RGB')
    if crop:
        frame = frame.crop(crop)
    frame = ImageOps.contain(frame, (w, h), Image.Resampling.LANCZOS)
    sheet.paste(frame, (x + (w - frame.width) // 2, y + caption + (h - frame.height) // 2))
    draw.text((x + 10, y + 6), title, font=font, fill='#efe6cf')
out.parent.mkdir(parents=True, exist_ok=True)
for quality in range(85, 19, -5):
    sheet.save(out, 'JPEG', quality=quality, optimize=True)
    if out.stat().st_size <= 500_000:
        break
assert out.stat().st_size <= 500_000
print(f'{out}: {out.stat().st_size} bytes, JPEG quality {quality}')
