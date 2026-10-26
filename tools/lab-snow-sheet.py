"""One large Watch view per Snow lesson, plus small full-flow captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent.parent
source = root / '.evidence/2026-10-26/LAB-LESSONS-SNOW/round-1'
target = root / 'docs/board/looks/lab-2/lab-lessons-snow-1.jpg'
sheet = Image.new('RGB', (2880, 1320), '#252c29')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 28)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 21)
draw.text((20, 12), 'The Lab / Snow corner / Round 1 / actual browser captures / Claude review pending', font=font, fill='#edc557')
for index, (lesson, name) in enumerate([('launch', 'Launch angles'), ('wax', 'Ski wax')]):
    x = index * 1440
    draw.text((x + 14, 55), name + ' / Watch', font=font, fill='#f5f0dc')
    with Image.open(source / f'{lesson}-watch-0.png') as image:
        tile = ImageOps.contain(image.convert('RGB'), (1416, 885))
        sheet.paste(tile, (x + 12, 95))
    for col, (suffix, label) in enumerate([('wonder', 'Wonder'), ('prediction', 'Predict'), ('try-2', 'Alone'), ('challenge', 'Challenge')]):
        draw.text((x + col * 360 + 12, 995), label, font=small, fill='#edc557')
        with Image.open(source / f'{lesson}-{suffix}.png') as image:
            tile = ImageOps.contain(image.convert('RGB'), (350, 245))
            sheet.paste(tile, (x + col * 360 + 5, 1030))
target.parent.mkdir(parents=True, exist_ok=True)
for quality in (88, 80, 72, 64, 55, 45, 35):
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
assert target.stat().st_size <= 500_000
print(f'{target}: {target.stat().st_size} bytes')
