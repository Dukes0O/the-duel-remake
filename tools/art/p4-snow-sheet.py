"""Compress complete native Snow frames into the card's single comparison sheet."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--evidence', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--round', type=int, default=1, choices=[1, 2, 3])
args = parser.parse_args()
evidence, output = Path(args.evidence), Path(args.output)
report = json.loads((evidence / 'p4-snow.json').read_text(encoding='utf-8'))
assert report['passed'], 'Only a complete native acceptance can supply the art sheet'
captures = {(row['quality'], row['view']): row for row in report['captures']}
views = ['grid', 'tracks', 'pond', 'ridge']
assert len(captures) == 8
width, height, label = 640, 400, 32
sheet = Image.new('RGB', (width * 4, 92 + 2 * (height + label)), '#121923')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
draw.text((15, 13), f'P4-SNOW | Round {args.round} | Approved Snow kits in the actual renderer', font=font, fill='white')
targets = report['bloomTargets']
assert len(targets) == 12 and all(row['floatRead'] and row['nan'] == 0 and row['infinite'] == 0 for row in targets)
caption = 'High above; Performance below. Bloom enabled; actual field and wheel contacts. Frames: ' + report['frameStatus']
draw.text((15, 49), caption, font=small, fill='#c3cfdf')
for row, quality in enumerate(['high', 'performance']):
    for column, view in enumerate(views):
        capture = captures[(quality, view)]
        assert capture['field'] == 8
        if view == 'grid':
            assert capture['visibleCars'] == 8
        picture = Image.open(evidence / (capture['file'] + '.png')).convert('RGB')
        assert picture.size == (1280, 800), 'Native fixed-resolution full frames required'
        x, y = column * width, 92 + row * (height + label)
        draw.text((x + 10, y + 6), quality.upper() + ' | ' + view.upper(), font=small, fill='white')
        sheet.paste(picture.resize((width, height), Image.Resampling.LANCZOS), (x, y + label))
output.parent.mkdir(parents=True, exist_ok=True)
for quality in [86, 81, 76, 71, 66, 61, 56, 51]:
    sheet.save(output, quality=quality, optimize=True)
    if output.stat().st_size <= 500000:
        break
assert output.stat().st_size <= 500000, 'Review sheet exceeds 500 KB'
print(output, output.stat().st_size)
