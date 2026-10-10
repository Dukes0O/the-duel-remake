"""One review sheet from native P4-DAYNIGHT captures; never changes the images."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--evidence', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--round', type=int, default=1, choices=[1, 2, 3])
args = parser.parse_args()
root, output = Path(args.evidence), Path(args.output)
report = json.loads((root / 'p4-daynight.json').read_text(encoding='utf-8'))
width, height, caption = 640, 400, 32
sheet = Image.new('RGB', (width * 4, 92 + (height + caption) * 2), '#121923')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
draw.text((15, 13), f'P4-DAYNIGHT | Round {args.round} | Native eight-car harbor view', font=font, fill='white')
draw.text((15, 49), 'Same native models and camera. Frame-cost status: ' + report['frameStatus'] + '. High above; Performance below.', font=small, fill='#c3cfdf')
for row, quality in enumerate(['high', 'performance']):
    for column, look in enumerate(['day', 'golden', 'dusk', 'night']):
        picture = Image.open(root / f'{quality}-{look}.png').convert('RGB')
        assert picture.size == (1280, 800), f'Unexpected native capture dimensions: {picture.size}'
        picture = picture.resize((width, height), Image.Resampling.LANCZOS)
        x, y = column * width, 92 + row * (height + caption)
        draw.text((x + 10, y + 6), quality.upper() + ' | ' + look.upper(), font=small, fill='white')
        sheet.paste(picture, (x, y + caption))
output.parent.mkdir(parents=True, exist_ok=True)
for quality in [86, 81, 76, 71, 66, 61, 56, 51]:
    sheet.save(output, quality=quality, optimize=True)
    if output.stat().st_size <= 500000:
        break
assert output.stat().st_size <= 500000, 'Review sheet exceeds 500 KB'
print(output, output.stat().st_size)
