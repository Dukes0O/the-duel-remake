"""Lay out the C5 native captures beside their generated reference pictures on one sheet.

python tools/blender/eifel/comparison-c5.py --captures .evidence/<date>/<run>/eifel-c5-views --round 1
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
output = args.output or Path('docs/board/looks/eifel-crown/c5-round-%d.jpg' % args.round)

rows = [
    ('Castle on its crag, from the ridge', 'castle', '06.png', 'Seen from the Crag Corner approach, across the valley, over the fields.'),
    ('Castle on its crag, close', 'castle-near', '06.png', 'From the road below Wall Left: keep, round tower and wall stubs on rock.'),
    ('Half-timbered village along Village Street', 'village', '03.png', 'White plaster and dark oak, slate roofs, church spire, garden walls (right of the road).'),
    ('Reservoir and concrete dam', 'reservoir', '05.png', 'Reflective reservoir water inside Reservoir Right, dam wall at the far end.'),
    ('Timber lodge at the start', 'lodge', None, 'Log lodge beyond the stands. No lodge picture in the reference set.'),
]
W, ROW, GAME, REF = 1340, 500, (780, 439), (440, 440)
canvas = Image.new('RGB', (W, 120 + ROW * len(rows)), '#e8e7e0')
d = ImageDraw.Draw(canvas)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 21)
title = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 30)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
d.text((20, 12), 'EIFEL CROWN / C5 LANDMARKS, WATER AND SOUND / ROUND %d' % args.round, font=title, fill='#172323')
d.text((20, 54), 'Native High quality, switch on, overcast light | Memory-only saves | No frame timing | Claude to judge', font=font, fill='#33403d')
d.text((20, 88), 'GAME', font=font, fill='#172323')
d.text((830, 88), 'GENERATED REFERENCE (visual guide only)', font=font, fill='#172323')
for i, (label, name, reference, note) in enumerate(rows):
    y = 120 + i * ROW
    d.text((20, y), label, font=font, fill='#172323')
    game = Image.open(args.captures / ('eifel-c5-' + name + '.png')).convert('RGB')
    canvas.paste(ImageOps.contain(game, GAME), (20, y + 28))
    if reference:
        ref = Image.open(args.references / reference).convert('RGB')
        canvas.paste(ImageOps.fit(ref, REF), (830, y + 28))
    else:
        d.rectangle((830, y + 28, 830 + REF[0], y + 28 + REF[1]), outline='#8a8f88')
        d.text((850, y + 40), 'No reference picture for the lodge.', font=small, fill='#33403d')
    d.text((20, y + 28 + GAME[1] + 2), note, font=small, fill='#33403d')
output.parent.mkdir(parents=True, exist_ok=True)
for quality in [84, 78, 72, 66, 60, 54, 48, 42, 36, 30]:
    canvas.save(output, 'JPEG', quality=quality, optimize=True)
    if output.stat().st_size <= 500000:
        break
if output.stat().st_size > 500000:
    raise ValueError('Comparison sheet exceeds 500 KB')
print(str(output) + ': ' + str(output.stat().st_size) + ' bytes')
