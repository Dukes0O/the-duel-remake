"""Compose the round 2 water works sheets from the Blender pictures.

python docs/board/looks/water-works/round-2-sheet.py --captures .qa-dist/water-works --output docs/board/looks/water-works/round-2.jpg
python docs/board/looks/water-works/round-2-sheet.py --captures .qa-dist/water-works --close --output docs/board/looks/water-works/round-2-close.jpg
The pictures come from: blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works --closeups
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

LABELS = ['0 The dry well', '1 Pipe patched', '2 Fuel for the pump', '3 The valve is back', '4 Pump house roofed',
          '5 The boiler is lit', '6 The water truck is home', '7 Tower to the top line', '8 Water runs']
NOTES = ['pipe sawn through, valve gone, boiler cold, tower empty', 'bright welded collar with clamps, level 1',
         'six jerry cans and a hose on the pump, level 2', 'big red valve wheel back on the pipe, level 3',
         'new bright roof on the pump house, level 4', 'fire in the boiler, smoke from the stack, level 5',
         'water truck out of the bay, level 6', 'water at the painted red line, float marker, level 7',
         'brim full, overflow, water in the well, tap running']

parser = argparse.ArgumentParser()
parser.add_argument('--captures', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--width', type=int, default=1800)
parser.add_argument('--close', action='store_true')
args = parser.parse_args()
folder = Path(args.captures)
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)

def label(img, title, note=None):
    img = img.convert('RGBA')
    band = Image.new('RGBA', (img.width, 52 if note else 34), (12, 10, 8, 175))
    img.alpha_composite(band, (0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((12, 3 if note else 4), title, font=font, fill=(244, 226, 184))
    if note:
        draw.text((12, 30), note, font=small, fill=(214, 200, 170))
    return img.convert('RGB')

def fit(path, width):
    im = Image.open(path).convert('RGB')
    return im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)

gap = 4
if not args.close:
    cell_w = args.width // 3
    frames = [label(fit(folder / f'chapter-{i}.png', cell_w), LABELS[i], NOTES[i]) for i in range(9)]
    cell_h = frames[0].height
    sheet = Image.new('RGB', (cell_w * 3 + gap * 2, cell_h * 3 + gap * 2), (14, 12, 10))
    for i, frame in enumerate(frames):
        sheet.paste(frame, ((i % 3) * (cell_w + gap), (i // 3) * (cell_h + gap)))
else:
    W = args.width
    half = (W - gap) // 2
    third = (W - gap * 2) // 3
    boiler = label(fit(folder / 'close-boiler.png', half), 'Boiler lit (chapter 5)')
    truck = label(fit(folder / 'close-truck.png', half), 'Truck out of the bay (chapter 6)')
    row1 = Image.new('RGB', (W, max(boiler.height, truck.height)), (14, 12, 10))
    row1.paste(boiler, (0, 0)); row1.paste(truck, (half + gap, 0))
    towers = [label(fit(folder / f'close-tower{lv}.png', third), f'Tower level {lv}') for lv in (1, 4, 8)]
    row2 = Image.new('RGB', (W, towers[0].height), (14, 12, 10))
    for i, t in enumerate(towers): row2.paste(t, (i * (third + gap), 0))
    well = label(fit(folder / 'close-well.png', half), 'Well and bucket (chapter 8)')
    tap = label(fit(folder / 'close-tap.png', half), 'Tap, trough and wet ground (chapter 8)')
    row3 = Image.new('RGB', (W, max(well.height, tap.height)), (14, 12, 10))
    row3.paste(well, (0, 0)); row3.paste(tap, (half + gap, 0))
    sheet = Image.new('RGB', (W, row1.height + row2.height + row3.height + gap * 2), (14, 12, 10))
    sheet.paste(row1, (0, 0)); sheet.paste(row2, (0, row1.height + gap)); sheet.paste(row3, (0, row1.height + row2.height + gap * 2))
out = Path(args.output)
out.parent.mkdir(parents=True, exist_ok=True)
for width in (sheet.width, int(sheet.width * .9), int(sheet.width * .8)):
    image = sheet if width == sheet.width else sheet.resize((width, round(sheet.height * width / sheet.width)), Image.LANCZOS)
    for quality in (86, 82, 78, 74, 70, 66, 62):
        image.save(out, quality=quality, optimize=True)
        if out.stat().st_size <= 500000:
            break
    if out.stat().st_size <= 500000:
        break
assert out.stat().st_size <= 500000, 'sheet is over 500 KB'
print(f'{out} {image.size[0]}x{image.size[1]} {out.stat().st_size} bytes quality {quality}')
