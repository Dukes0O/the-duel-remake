"""Compose the requested lesson evidence; run after drive-lesson-finish.

python tools/drive-lesson-finish-sheet.py <card-evidence-directory> <output.jpg>
Requires the laptop's existing Pillow installation, not a game dependency.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1]).resolve()
shots = [
    ('beaver-before/tremblant-woods-casual-right-result.png', '1. Before | Casual: wall before brake cone'),
    ('beaver-after/tremblant-woods-casual-before-brake-cone.png', '2. After | Straight approach on The Spur'),
    ('beaver-after/tremblant-woods-casual-right-result.png', '3. After | Casual keyboard right try'),
    ('beaver-after/tremblant-woods-pro-right-result.png', '4. After | Pro keyboard right try'),
]
sheet = Image.new('RGB', (1920, 1160), '#10161b')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
for i, (name, label) in enumerate(shots):
    x, y = (i % 2) * 960, (i // 2) * 580
    draw.text((x + 14, y + 7), label, font=font, fill='#f3eddf')
    with Image.open(root / name) as shot:
        assert shot.size == (1280, 720), (name, shot.size)
        sheet.paste(shot.convert('RGB').resize((960, 540), Image.Resampling.LANCZOS), (x, y + 40))
target = Path(sys.argv[2]).resolve()
target.parent.mkdir(parents=True, exist_ok=True)
for quality in [85, 80, 75, 65, 55]:
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
assert target.stat().st_size <= 500_000
print(f'{target}: {target.stat().st_size} bytes')
