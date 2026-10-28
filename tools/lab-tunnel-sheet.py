"""One large Watch view per lesson, with a strip of the teaching and challenge."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
source = root / args.source
target = root / 'docs/board/looks/lab-2/lab-lessons-tunnel-1.jpg'
rows = [('grip', 2), ('downforce', 1), ('braking', 0), ('suspension', 0), ('fuel', 2)]
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
sheet = Image.new('RGB', (1000, 4200), '#202a2d')
draw = ImageDraw.Draw(sheet)
for row, (name, watch) in enumerate(rows):
    y = row * 840
    draw.text((12, y+8), f'{name.capitalize()} — Watch it work', font=font, fill='#f5f0dc')
    path = source / f'{name}-watch-{watch}.png'
    sheet.paste(ImageOps.contain(Image.open(path).convert('RGB'), (1000, 625)), (0, y+42))
    for i, step in enumerate(['wonder', 'predict', 'check', 'challenge-result']):
        thumb = ImageOps.contain(Image.open(source / f'{name}-{step}.png').convert('RGB'), (244, 140))
        sheet.paste(thumb, (i*250, y+692))
        draw.text((i*250+5, y+672), step.replace('-', ' '), font=small, fill='#edc557')
target.parent.mkdir(parents=True, exist_ok=True)
for quality in range(85, 29, -5):
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
if target.stat().st_size > 500_000:
    raise RuntimeError('Sheet exceeds the review cap')
print(f'{target}: {target.stat().st_size} bytes')
