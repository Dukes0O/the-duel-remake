"""Lay out the C4 native captures beside their generated reference pictures on one sheet.

python tools/blender/eifel/comparison.py --captures .evidence/<date>/<run>/eifel-scenery-views --round 1
The JPG is review evidence for Claude's picture judgement, not game imagery.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

p = argparse.ArgumentParser()
p.add_argument('--captures', required=True, type=Path)
p.add_argument('--round', type=int, default=1)
p.add_argument('--references', type=Path,
               default=Path('C:/Users/kyleb/dev/art-library/eifel-crown/reference'))
p.add_argument('--output', type=Path)
args = p.parse_args()
output = args.output or Path('docs/board/looks/eifel-crown/round-%d.jpg' % args.round)

rows = [
    ('Start and Start Kink', 'start', '02.png', 'Grid on the Lodge Straight, then the forest closes in behind the Armco. Lodge is C5.'),
    ('Forest esses', 'forest-esses', '02.png', 'Spruce right behind the Armco, rows deep, beech among them in a duller green, damp verge.'),
    ('Crown ridge meadows', 'ridge-meadows', '01.png', 'Meadow patches, wall and hedge lines, cross hedges, wooded far hills.'),
    ('Drystone wall field edge', 'drystone-wall', '04.png', 'Rougher wall: uneven courses, moss, ragged top; softer hedge behind it.'),
    ('Village Street before the village', 'village-street', '03.png', 'Field wall and hedge on the left. The right is open for the C5 village; castle crag beyond.'),
    ('Valley Sweep', 'valley-sweep', '05.png', 'Wooded valley side close to the road; the reservoir basin on the right is left clear for C5.'),
]
W, ROW, GAME, REF = 1340, 500, (780, 440), (440, 440)
canvas = Image.new('RGB', (W, 120 + ROW * len(rows)), '#e8e7e0')
d = ImageDraw.Draw(canvas)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 21)
title = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 30)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
d.text((20, 12), 'EIFEL CROWN / C4 SCENERY / ROUND %d' % args.round, font=title, fill='#172323')
d.text((20, 54), 'Native High quality, switch on, overcast light | Memory-only saves | No frame timing | Claude to judge', font=font, fill='#33403d')
d.text((20, 88), 'GAME', font=font, fill='#172323')
d.text((830, 88), 'GENERATED REFERENCE (visual guide only)', font=font, fill='#172323')
for i, (label, name, reference, note) in enumerate(rows):
    y = 120 + i * ROW
    d.text((20, y), label, font=font, fill='#172323')
    game = Image.open(args.captures / ('eifel-c4-' + name + '.png')).convert('RGB')
    canvas.paste(ImageOps.contain(game, GAME), (20, y + 28))
    ref = Image.open(args.references / reference).convert('RGB')
    canvas.paste(ImageOps.fit(ref, REF), (830, y + 28))
    d.text((20, y + 28 + GAME[1] + 2), note, font=small, fill='#33403d')
output.parent.mkdir(parents=True, exist_ok=True)
for quality in [84, 78, 72, 66, 60, 54, 48, 42, 36, 30]:
    canvas.save(output, 'JPEG', quality=quality, optimize=True)
    if output.stat().st_size <= 500000:
        break
if output.stat().st_size > 500000:
    raise ValueError('Comparison sheet exceeds 500 KB')
print(str(output) + ': ' + str(output.stat().st_size) + ' bytes')
