"""Compose the water works comparison sheet: nine chapters, same view, 3 by 3.

python docs/board/looks/water-works/round-1-sheet.py --captures .qa-dist/water-works --output docs/board/looks/water-works/round-1.jpg
The captures come from: blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

LABELS = ['0 The dry well', '1 Pipe patched', '2 Fuel for the pump', '3 The valve is back', '4 Pump house roofed',
          '5 The boiler is lit', '6 The water truck is home', '7 Tower to the top line', '8 Water runs']

NOTES = ['pipe sawn through, valve gone, boiler cold, tower empty', 'welded collar over the cut, level 1',
         'jerry cans and fuel line on the pump, level 2', 'red valve wheel back on the pipe, level 3',
         'roof on the pump house, level 4', 'fire in the boiler, level 5', 'water truck in its bay, level 6',
         'tower filled to the painted top line, level 7', 'brim full (level 8), water in the well, tap running']

parser = argparse.ArgumentParser()
parser.add_argument('--captures', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--width', type=int, default=1800)
args = parser.parse_args()
folder = Path(args.captures)
frames = [Image.open(folder / f'chapter-{i}.png').convert('RGB') for i in range(9)]
cell_w = args.width // 3
cell_h = round(cell_w * frames[0].height / frames[0].width)
gap = 4
sheet = Image.new('RGB', (cell_w * 3 + gap * 2, cell_h * 3 + gap * 2), (14, 12, 10))
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
for i, frame in enumerate(frames):
    frame = frame.resize((cell_w, cell_h), Image.LANCZOS)
    band = Image.new('RGBA', (cell_w, 52), (12, 10, 8, 175))
    frame = frame.convert('RGBA')
    frame.alpha_composite(band, (0, 0))
    draw = ImageDraw.Draw(frame)
    draw.text((12, 3), LABELS[i], font=font, fill=(244, 226, 184))
    draw.text((12, 30), NOTES[i], font=small, fill=(214, 200, 170))
    sheet.paste(frame.convert('RGB'), ((i % 3) * (cell_w + gap), (i // 3) * (cell_h + gap)))
out = Path(args.output)
out.parent.mkdir(parents=True, exist_ok=True)
for quality in (86, 82, 78, 74, 70, 66, 62):
    sheet.save(out, quality=quality, optimize=True)
    if out.stat().st_size <= 500000:
        break
assert out.stat().st_size <= 500000, 'sheet is over 500 KB'
print(f'{out} {sheet.size[0]}x{sheet.size[1]} {out.stat().st_size} bytes quality {quality}')
