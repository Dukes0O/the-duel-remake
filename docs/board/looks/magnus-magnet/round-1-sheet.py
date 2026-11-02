"""Compose the round 1 sheet for Magnus the Magnet's roof crane from the Blender pictures.

python docs/board/looks/magnus-magnet/round-1-sheet.py --captures <folder> --output docs/board/looks/magnus-magnet/round-1.jpg
The pictures come from: blender -b --python tools/blender/magnus-magnet.py -- --root . --render <folder>
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROWS = [
    [('three-quarter', 'Three-quarter front', 'crane on the Heritage roof socket, scrapper plates'),
     ('side', 'Side', 'boom clears the roof line, magnet clear of the bonnet')],
    [('front', 'Front', 'magnet hangs inside the nose width'),
     ('top', 'Top', 'turntable, boom and magnet on the centre line'),
     ('close', 'Magnet close', 'chains, lifting eyes, painted band')],
    [('glow-off', 'Face as saved', 'dark base, no glow'),
     ('glow-blue', 'Face blue', 'the Big Pull'),
     ('glow-red', 'Face red', 'red hot window')],
]

parser = argparse.ArgumentParser()
parser.add_argument('--captures', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--width', type=int, default=1800)
args = parser.parse_args()
folder = Path(args.captures)
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
gap = 4

def label(img, title, note):
    band = Image.new('RGB', (img.width, 52), (28, 25, 21))
    draw = ImageDraw.Draw(band)
    draw.text((12, 3), title, font=font, fill=(244, 226, 184))
    draw.text((12, 30), note, font=small, fill=(214, 200, 170))
    out = Image.new('RGB', (img.width, img.height + 52))
    out.paste(band, (0, 0)); out.paste(img, (0, 52))
    return out

def fit(path, width):
    im = Image.open(path).convert('RGB')
    return im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)

rows = []
for row in ROWS:
    cell = (args.width - gap * (len(row) - 1)) // len(row)
    frames = [label(fit(folder / f'{name}.png', cell), title, note) for name, title, note in row]
    strip = Image.new('RGB', (args.width, frames[0].height), (14, 12, 10))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * (cell + gap), 0))
    rows.append(strip)
sheet = Image.new('RGB', (args.width, sum(r.height for r in rows) + gap * (len(rows) - 1)), (14, 12, 10))
y = 0
for strip in rows:
    sheet.paste(strip, (0, y)); y += strip.height + gap
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
