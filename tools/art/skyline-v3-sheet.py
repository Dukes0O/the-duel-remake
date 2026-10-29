"""Compose the R34 V3 detail sheet: four reference/model pairs, a front and a rear close-up,
and a strip of the four paint finishes.

  python tools/art/skyline-v3-sheet.py <evidence folder> [round number]

The folder holds the Blender renders (front, rear, side, three-quarter, front-close and
rear-close .png from tools/art/skyline-review.py) and fit.json from tools/art/skyline-overlay.py.
paints/<id>/three-quarter.png are the same view with each finish applied
(node tools/art/skyline-export.mjs <glb> <paint id>). Pictures are only resized and cropped.
"""
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]).resolve()
number = sys.argv[2] if len(sys.argv) > 2 else '1'
if not out.is_relative_to(root / '.evidence'):
    raise ValueError('Read captures only from this lane evidence folder')
from PIL import Image, ImageDraw, ImageFont, ImageOps
reference = Path('C:/Users/kyleb/dev/art-library/nissan-skyline-gtr-r34/reference')
fit = json.loads((out / 'fit.json').read_text())
PAINTS = (('factory', 'Bayside Blue (factory)'), ('skyline_white', 'Skyline White'), ('skyline_silver', 'Sonic Silver'), ('skyline_black', 'Midnight Black'))
CROPS = {'front': (0, .38, 1, 1), 'rear': (0, .35, 1, 1)}
rows = [('front', 'front'), ('rear', 'rear'), ('side', 'left-side'), ('three-quarter', 'three-quarter')]
height = 76 + (len(rows) + 2) * 356 + 270
sheet = Image.new('RGB', (1280, height), '#e7e8e6')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
draw.text((16, 8), f'R34 detail - V3 round {number} | Reference left | Runtime GLB model right', fill='#182126', font=font)
draw.text((16, 36), 'Model rendered in Blender (flat studio light, no flake shader), not a game capture. No logos modelled.', fill='#182126', font=font)


def crop(path, box):
    image = Image.open(path).convert('RGB')
    w, h = image.size
    return image.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))


def place(row, label, left, right):
    y = 76 + row * 356
    for col, picture in enumerate((left, right)):
        picture = ImageOps.contain(picture, (630, 322), Image.Resampling.LANCZOS)
        sheet.paste(picture, (col * 640 + (640 - picture.width) // 2, y + (322 - picture.height) // 2))
    draw.text((16, y + 324), label, fill='#182126', font=font)


for row, (name, ref) in enumerate(rows):
    place(row, name.replace('-', ' ').title(), Image.open(reference / (ref + '.png')).convert('RGB'), Image.open(out / (name + '.png')).convert('RGB'))
place(4, 'Front close-up (reference crop of the nose)', crop(reference / 'front.png', CROPS['front']), Image.open(out / 'front-close.png').convert('RGB'))
place(5, 'Rear close-up (reference crop of the tail)', crop(reference / 'rear.png', CROPS['rear']), Image.open(out / 'rear-close.png').convert('RGB'))
y = 76 + 6 * 356
for col, (pid, label) in enumerate(PAINTS):
    picture = ImageOps.contain(Image.open(out / 'paints' / pid / 'three-quarter.png').convert('RGB'), (312, 210), Image.Resampling.LANCZOS)
    sheet.paste(picture, (4 + col * 318, y))
    draw.text((8 + col * 318, y + 214), label, fill='#182126', font=font)
draw.text((16, y + 244), f'Silhouette overlap with the photos (1 is exact): side {fit["side"]:.2f}, front {fit["front"]:.2f}, rear {fit["rear"]:.2f}.', fill='#182126', font=font)
destination = root / f'docs/board/looks/nissan-skyline-gtr-r34/v3-round-{number}.jpg'
destination.parent.mkdir(parents=True, exist_ok=True)
for quality in [88, 82, 76, 70, 64, 58, 52]:
    sheet.save(destination, quality=quality, optimize=True)
    if destination.stat().st_size <= 500000:
        break
assert destination.stat().st_size <= 500000
print('Sheet:', destination, destination.stat().st_size)
