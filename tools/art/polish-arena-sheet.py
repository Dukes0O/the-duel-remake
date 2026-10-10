"""Compose POLISH-ARENA's single sheet from matched native browser captures."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--evidence', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
root, output = Path(args.evidence), Path(args.output)
width, height = 560, 350
sheet = Image.new('RGB', (width * 4, 90 + (height + 34) * 4), (18, 23, 28))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
draw.text((14, 12), 'POLISH-ARENA | Round 1 | Matched 1280 x 800 game frames | 9 October 2026', font=font, fill='white')
frames = []
for variant in ['before', 'after']:
    path = root / ('frames-' + variant) / 'polish-arena.json'
    if path.exists():
        frames.append(json.loads(path.read_text(encoding='utf-8'))['frames'])
caption = 'High before / after; Performance before / after. Frame gate pending quiet measurement.'
if len(frames) == 2:
    parts = []
    for quality in ['high', 'performance']:
        values = [next(row for row in rows if row['quality'] == quality)['p95Ms'] for rows in frames]
        parts.append(quality + ' P95 ' + ' -> '.join(f'{value:.1f}' for value in values) + ' ms')
    caption = '; '.join(parts) + '. 240 real rAF intervals each; native renderer, memory-only QA.'
draw.text((14, 45), caption, font=small, fill='#c3ccd4')
for row, view in enumerate(['island', 'ridges', 'tanker', 'labels']):
    for col, (quality, variant) in enumerate([('high', 'before'), ('high', 'after'), ('performance', 'before'), ('performance', 'after')]):
        picture = Image.open(root / variant / (quality + '-' + view + '.png')).convert('RGB')
        if view == 'tanker':
            picture = picture.crop((470, 310, 830, 535))
        picture = picture.resize((width, height))
        x, y = col * width, 90 + row * (height + 34)
        label = view.upper() + ' | ' + quality + ' ' + variant
        if view == 'tanker':
            label += ' | 3.56x crop'
        draw.text((x + 8, y + 7), label, font=small, fill='white')
        sheet.paste(picture, (x, y + 34))
output.parent.mkdir(parents=True, exist_ok=True)
for quality in [85, 80, 75, 70, 65, 60, 55]:
    sheet.save(output, quality=quality, optimize=True)
    if output.stat().st_size <= 500000:
        break
assert output.stat().st_size <= 500000, 'Comparison sheet exceeds 500 KB'
print(output, output.stat().st_size)
