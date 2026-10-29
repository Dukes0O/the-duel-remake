"""Lay out the four C5 native views beside their approved reference pictures.

python tools/blender/kogane/landmark-comparison.py --captures .evidence/.../kogane-c5-views
The JPG is review evidence, not generated replacement game imagery.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

p = argparse.ArgumentParser()
p.add_argument('--captures', required=True, type=Path)
p.add_argument('--references', type=Path,
               default=Path('C:/Users/kyleb/dev/art-library/kogane-pass/reference'))
p.add_argument('--output', type=Path, default=Path('docs/board/looks/kogane-pass/c5-round-1.jpg'))
args = p.parse_args()

rows = [
    ('Lakeside start at dusk', 'c5-start', '02.png', 'Native dusk. Torii stands in the near shallows on the right.'),
    ('Torii Bend', 'c5-torii-bend', '02.png', 'View back across the lake from the bend. Road and sightline remain clear.'),
    ('Summit car park', 'c5-car-park', '05.png', 'C4 tea house and vending, C5 stone lanterns and paved parking apron.'),
    ('Lake and start from above', 'c5-overhead', '02.png', 'The basin, shore, start straight and the car park in one native view.'),
]
canvas = Image.new('RGB', (1600, 2440), '#e8e7e0')
d = ImageDraw.Draw(canvas)
fontpath = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(fontpath), 21)
title = ImageFont.truetype(str(fontpath), 31)
small = ImageFont.truetype(str(fontpath), 18)
d.text((22, 15), 'KOGANE PASS / C5 LANDMARK AND LAKE / ROUND 1', font=title, fill='#172323')
d.text((22, 58), 'Native High quality views | Memory-only saves | No frame timing | Claude to judge', font=font, fill='#33403d')
d.text((22, 88), 'GAME', font=font, fill='#172323')
d.text((930, 88), 'APPROVED GENERATED REFERENCE', font=font, fill='#172323')
for i, (label, name, reference, note) in enumerate(rows):
    y = 123 + i * 570
    d.text((22, y), label, font=font, fill='#172323')
    game = Image.open(args.captures/('kogane-'+name+'.png')).convert('RGB')
    # Screenshot contains the native HUD. Preserve the complete frame.
    game = ImageOps.contain(game, (880, 500))
    canvas.paste(game, (22+(880-game.width)//2, y+30))
    ref = Image.open(args.references/reference).convert('RGB')
    canvas.paste(ImageOps.fit(ref, (640, 500)), (930, y+30))
    d.text((22, y+536), note, font=small, fill='#33403d')
args.output.parent.mkdir(parents=True, exist_ok=True)
# Four native views beside the approved generated reference pictures.
# Preserve whole frames; lower the sheet resolution rather than crop scenery.
canvas = canvas.resize((1360, 2074), Image.Resampling.LANCZOS)
for quality in [82, 74, 66, 58, 50, 44, 38, 32, 26]:
    canvas.save(args.output, 'JPEG', quality=quality, optimize=True)
    if args.output.stat().st_size <= 500000:
        break
if args.output.stat().st_size > 500000:
    raise ValueError('Comparison sheet exceeds 500 KB')
print(str(args.output)+': '+str(args.output.stat().st_size)+' bytes')
