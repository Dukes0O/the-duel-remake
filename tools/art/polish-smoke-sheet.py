"""Rebuild the single Smoke round sheet from a private arsenal-core capture."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('capture', type=Path)
parser.add_argument('--output', type=Path, default=Path('docs/board/looks/smoke/round-1.jpg'))
args = parser.parse_args()
rows = json.loads((args.capture / 'concealment.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
sheet = Image.new('RGB', (1600, 1250), '#172020')
draw = ImageDraw.Draw(sheet)
draw.text((18, 12), 'POLISH-SMOKE | Round 1 | Native Screen / Wren | selected soft-density source', font=font, fill='white')
draw.text((18, 39), 'Screen: <=10% car pixels visible. Wren: shared look only; F42 extends outside native 2.5 m radius.', font=small, fill='#c7d2cb')
for index, (kind, quality) in enumerate([('screen','high'),('screen','performance'),('wren','high'),('wren','performance')]):
    y = 72 + index * 290
    metrics = [row for row in rows if row['kind']==kind and row['quality']==quality]
    text = f'{kind.upper()} / {quality.upper()} | radius {metrics[0]["radius"]} m | 10 m: {metrics[0]["visibleFraction"]*100:.3f}% | 25 m: {metrics[1]["visibleFraction"]*100:.3f}% visible'
    draw.text((18,y), text, font=font, fill='white')
    names = [(f'control-{kind}-10-{quality}-clear.png','Clear control at 10 m'),
             (f'control-{kind}-10-{quality}-smoke.png','Smoke at 10 m'),
             (f'control-{kind}-25-{quality}-smoke.png','Smoke at 25 m'),
             (f'smoke-{kind}-inside-{quality}.png','Camera inside: 96% haze')]
    for column, (name,label) in enumerate(names):
        picture = Image.open(args.capture / name).convert('RGB')
        picture.thumbnail((396,248), Image.Resampling.LANCZOS)
        x = column*400+2
        sheet.paste(picture, (x,y+29))
        draw.text((x+5,y+272), label, font=small, fill='#c7d2cb')
args.output.parent.mkdir(parents=True,exist_ok=True)
sheet.save(args.output, quality=86, optimize=True)
if args.output.stat().st_size > 500_000:
    raise SystemExit('Comparison sheet exceeds 500 KB')
print(f'{args.output}: {args.output.stat().st_size} bytes')
