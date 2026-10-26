"""Compose the requested lesson evidence; run after drive-lesson-finish.

python tools/drive-lesson-finish-sheet.py <evidence-directory>
Requires the laptop's existing Pillow installation, not a game dependency.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1]).resolve()
shots = [
    ('panorama-ridge-casual-before-brake-cone.png', '1. Cone before The Cutting | Casual'),
    ('panorama-ridge-pro-right-instructions.png', '2. Right-try guide | Pro'),
    ('tremblant-woods-pro-right-result.png', '3. Failed try: reason and next action | Woods Pro'),
    ('panorama-ridge-pro-challenge-result.png', '4. Three wins | Pro: 0.11 s spare'),
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
target = root / 'lesson1-comparison.jpg'
for quality in [85, 80, 75, 65, 55]:
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
assert target.stat().st_size <= 500_000
print(f'{target}: {target.stat().st_size} bytes')
