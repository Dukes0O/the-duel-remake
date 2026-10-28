"""Assemble LAB-LESSON-FRAME's five browser captures; no game art is generated."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.evidence/2026-10-26/LAB-LESSON-FRAME'
TARGET = ROOT / 'docs/board/looks/lab-2/look-2.jpg'
SHEET = Image.new('RGB', (1440, 1560), '#252c29')
DRAW = ImageDraw.Draw(SHEET)
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 25)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
DRAW.text((22, 12), 'Lab 2: the lesson frame', font=FONT, fill='#edc557')
DRAW.text((22, 48), 'Test-only ball and fan packet in the walking Lab', font=SMALL, fill='#f5f0dc')
for name, caption, x, y, width, height in [
    ('wonder', '1. Wonder', 0, 122, 1440, 510),
    ('words', '2. Words: point at an underlined word', 0, 666, 720, 410),
    ('watch', '3. Watch: arrows, numbers, pause and step', 720, 666, 720, 410),
    ('prediction', '4. Predict: choose a picture', 0, 1110, 720, 410),
    ('hint', 'Help: what happened and what to change', 720, 1110, 720, 410),
]:
    DRAW.text((x + 14, y - 30), caption, font=SMALL, fill='#f5f0dc')
    with Image.open(SOURCE / f'{name}.png') as capture:
        tile = ImageOps.contain(capture.convert('RGB'), (width, height))
        SHEET.paste(tile, (x + (width - tile.width) // 2, y))
TARGET.parent.mkdir(parents=True, exist_ok=True)
for quality in (85, 78, 70, 60):
    SHEET.save(TARGET, quality=quality, optimize=True)
    if TARGET.stat().st_size <= 500_000:
        break
assert TARGET.stat().st_size <= 500_000
print(f'{TARGET}: {TARGET.stat().st_size} bytes')
