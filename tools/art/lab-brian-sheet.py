"""Round 3 comparison from Kyle's original and measured in-game captures."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--before', type=Path, required=True)
parser.add_argument('--captures', type=Path, required=True)
args = parser.parse_args()
TARGET = ROOT / 'docs/board/looks/lab-2/look-5.jpg'
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 26)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 21)
sheet = Image.new('RGB', (1800, 820), '#252c29')
draw = ImageDraw.Draw(sheet)
draw.text((22, 15), 'Brian - final art round 3 / 3', font=font, fill='#edc557')
views = [(args.before, 'Kyle preview - before', (140, 580, 1080, 1648)),
         (args.captures / 'brian-kyle.png', 'Same eye-height angle - after', None),
         (args.captures / 'brian-2m.png', 'In the Lab - 2 m, eye height 1.6 m', None)]
for i, (path, title, crop) in enumerate(views):
    x = i * 600
    draw.text((x+15, 64), title, font=small, fill='#f5f0dc')
    with Image.open(path).convert('RGB') as image:
        if crop:
            image = image.crop(crop)
        else:
            # Brian faces the walker in the middle of the room canvas.
            image = image.crop((440, 300, 1000, 850))
        image = ImageOps.contain(image, (570, 900), Image.Resampling.LANCZOS)
        sheet.paste(image, (x+(600-image.width)//2, 110))
TARGET.parent.mkdir(parents=True, exist_ok=True)
for quality in [86, 78, 68, 58]:
    sheet.save(TARGET, quality=quality, optimize=True)
    if TARGET.stat().st_size <= 500_000:
        break
assert TARGET.stat().st_size <= 500_000
print(f'{TARGET}: {TARGET.stat().st_size} bytes')
