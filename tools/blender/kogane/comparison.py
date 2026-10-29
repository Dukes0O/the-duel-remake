"""Lay out the C4 native captures and exposure companions beside their approved reference pictures.

python tools/blender/kogane/comparison.py --captures .evidence/.../kogane-views
The JPG is review evidence, not generated replacement game imagery.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

p = argparse.ArgumentParser()
p.add_argument('--captures', required=True, type=Path)
p.add_argument('--references', type=Path,
               default=Path('C:/Users/kyleb/dev/art-library/kogane-pass/reference'))
p.add_argument('--output', type=Path, default=Path('docs/board/looks/kogane-pass/round-2.jpg'))
args = p.parse_args()

rows = [
    ('Lakeside start', 'lakeside-start', '02.png', 'C5 adds the lake and torii. Tea house and vending at left.'),
    ('Hairpin from the car', 'hairpin-car', '04.png', 'Outside mirror and arrows. Low inside rail keeps the exit visible.'),
    ('Hairpin car: daylight exposure only', 'hairpin-car-daylight-exposure', '04.png', 'Same dusk light and camera; renderer exposure 8. No image relighting.'),
    ('Hairpin from above', 'hairpin-above', '01.png', 'Original spiral road. Close fir bands and red, orange and gold maple groups.'),
    ('Stone wall section', 'stone-wall', '04.png', 'Mossy retaining wall above the road; white steel rail below.'),
    ('Stone wall: daylight exposure only', 'stone-wall-daylight-exposure', '04.png', 'Same night light and camera; renderer exposure 8. Stone and moss review.'),
    ('Village run', 'village-run', '05.png', 'Reused shopfronts behind the barriers. Original tea house is at the summit.'),
    ('Sodium lower road', 'sodium-lower-road', '06.png', 'Reused Harbour lamps with warm pools on wet road. Full night below 2.6 km.'),
]
canvas = Image.new('RGB', (1600, 4720), '#e8e7e0')
d = ImageDraw.Draw(canvas)
fontpath = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(fontpath), 21)
title = ImageFont.truetype(str(fontpath), 31)
small = ImageFont.truetype(str(fontpath), 18)
d.text((22, 15), 'KOGANE PASS / C4 SCENERY / ROUND 2', font=title, fill='#172323')
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
# Eight views need a smaller review layout than the original six-view sheet.
# Preserve whole frames; lower the sheet resolution rather than crop scenery.
canvas = canvas.resize((1360, 4012), Image.Resampling.LANCZOS)
for quality in [82, 74, 66, 58, 50, 44, 38, 32, 26]:
    canvas.save(args.output, 'JPEG', quality=quality, optimize=True)
    if args.output.stat().st_size <= 500000:
        break
if args.output.stat().st_size > 500000:
    raise ValueError('Comparison sheet exceeds 500 KB')
print(str(args.output)+': '+str(args.output.stat().st_size)+' bytes')
