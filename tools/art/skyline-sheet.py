"""Compose the R34 round sheet: four reference/model pairs and the side outline overlay.

  python tools/art/skyline-sheet.py <evidence folder> [round number]

The folder holds the four Blender renders (front, rear, side, three-quarter .png from
tools/art/skyline-review.py) and fit-side.png plus fit.json from tools/art/skyline-overlay.py.
Pictures are only resized, never edited.
"""
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]).resolve()
number = sys.argv[2] if len(sys.argv) > 2 else '4'
if not out.is_relative_to(root / '.evidence'):
    raise ValueError('Read captures only from this lane evidence folder')
from PIL import Image, ImageDraw, ImageFont, ImageOps
reference = Path('C:/Users/kyleb/dev/art-library/nissan-skyline-gtr-r34/reference')
fit = json.loads((out / 'fit.json').read_text())
sheet = Image.new('RGB', (1280, 2210), '#e7e8e6')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
draw.text((16, 8), f'R34 shape - round {number} | Reference left | Runtime GLB model right', fill='#182126', font=font)
draw.text((16, 36), 'Body lofted from outlines measured off the reference pictures. Model rendered in Blender, not a game capture. No logos modelled.', fill='#182126', font=font)
for row, (name, ref) in enumerate([('front', 'front'), ('rear', 'rear'), ('side', 'left-side'), ('three-quarter', 'three-quarter')]):
    y = 76 + row * 356
    for col, source in enumerate([reference / (ref + '.png'), out / (name + '.png')]):
        picture = ImageOps.contain(Image.open(source).convert('RGB'), (630, 322), Image.Resampling.LANCZOS)
        sheet.paste(picture, (col * 640 + (640 - picture.width) // 2, y + (322 - picture.height) // 2))
    draw.text((16, y + 324), name.replace('-', ' ').title(), fill='#182126', font=font)
y = 76 + 4 * 356
overlay = ImageOps.contain(Image.open(out / 'fit-side.png').convert('RGB'), (1260, 640), Image.Resampling.LANCZOS)
sheet.paste(overlay, ((1280 - overlay.width) // 2, y))
draw.text((16, y + overlay.height + 4),
          'Side fit: yellow is the model outline, cyan the outline measured from the photo. '
          f'Silhouette overlap side {fit["side"]:.2f}, front {fit["front"]:.2f}, rear {fit["rear"]:.2f} (1 is exact).',
          fill='#182126', font=font)
destination = root / f'docs/board/looks/nissan-skyline-gtr-r34/round-{number}.jpg'
destination.parent.mkdir(parents=True, exist_ok=True)
for quality in [90, 86, 82, 78, 74, 70, 66]:
    sheet.save(destination, quality=quality, optimize=True)
    if destination.stat().st_size <= 500000:
        break
assert destination.stat().st_size <= 500000
print('Sheet:', destination, destination.stat().st_size)
