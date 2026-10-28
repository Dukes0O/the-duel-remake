"""LAB-LIFT-2 comparison sheet from the round's real captures and Brian render."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--round', type=int, choices=[1, 2], default=2)
args = parser.parse_args()

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.evidence/2026-10-26/LAB-LIFT-2'
if args.round == 2:
    SOURCE = SOURCE / 'round-2'
TARGET = ROOT / f'docs/board/looks/lab-2/look-{args.round + 2}.jpg'
SHEET = Image.new('RGB', (1600, 3260 if args.round == 2 else 2740), '#252c29')
DRAW = ImageDraw.Draw(SHEET)
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 29)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
DRAW.text((24, 14), f'Lab 2 · Lift and weight · art round {args.round}', font=FONT, fill='#edc557')
subtitle = ('Kilograms, real loads, the collective close-up · Brian in his work clothes' if args.round == 2
            else 'Kestrel One, real loads and flight numbers · Brian in his own work clothes')
DRAW.text((24, 55), subtitle, font=SMALL, fill='#f5f0dc')
views = [
    ('wonder.png', '1 · Wonder: Dusthawk + three crates'),
    ('word-collective.png', '2 · Collective: lever, both blades, air, lift'),
    ('watch-hover.png', '3 · Watch: matching arrows and a hover'),
    ('watch-heavy.png', '3 · Full lift is shorter than weight'),
    ('prediction.png', '4 · Predict, then use the real objects'),
    ('hint.png', 'Help · What happened, and the change in kg'),
    ('alone.png', '4 · Alone: the full-power overload'),
    ('check-0.png', '5 · Which loaded helicopter can hover?'),
    ('brian-in-room.png', 'Brian · His own figure in the actual walking Lab'),
    ('brian/brian.png', 'Brian · Blender figure with work clothes and glasses'),
]
if args.round == 2:
    views[1:1] = [('word-lift.png', '2 · Lift: Brian explains the kg comparison')]
    views.insert(3, ('collective-close-up.png', 'Detail · Left hand, lever and twisting blades'))
    views[-1] = ('brian/brian-portrait.png', 'Brian · Clear glasses, face, canvas apron and pencil')
for i, (file, caption) in enumerate(views):
    x, y = i % 2 * 800, 108 + i // 2 * 524
    DRAW.text((x + 14, y), caption, font=SMALL, fill='#edc557')
    with Image.open(SOURCE / file) as capture:
        if file == 'collective-close-up.png':
            capture = capture.crop((1056, 177, 1416, 418))
        tile = ImageOps.contain(capture.convert('RGB'), (800, 484))
        SHEET.paste(tile, (x + (800 - tile.width) // 2, y + 34 + (484 - tile.height) // 2))
TARGET.parent.mkdir(parents=True, exist_ok=True)
for quality in [88, 82, 75, 68, 60, 52]:
    SHEET.save(TARGET, quality=quality, optimize=True)
    if TARGET.stat().st_size <= 500_000:
        break
assert TARGET.stat().st_size <= 500_000
print(f'{TARGET}: {TARGET.stat().st_size} bytes')
