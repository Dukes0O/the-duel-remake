"""Rebuild Flying round 2: one large Watch per lesson and supporting strips."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent.parent
source = root / '.evidence/2026-10-26/LAB-LESSONS-FLYING/round-2'
target = root / 'docs/board/looks/lab-2/lab-lessons-flying-2.jpg'
sheet = Image.new('RGB', (2560, 2340), '#252c29')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 28)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
draw.text((20, 10), 'Flying corner · look round 2 · Claude to judge · real browser captures', font=font, fill='#edc557')
lessons = [
    ('projectile', 'Projectile motion', 'watch-0', 'word-gravity'),
    ('fire', 'Fire triangle', 'watch-0', 'word-fire-triangle'),
    ('pendulum', 'Pendulums', 'watch-0', 'word-length'),
    ('altitude', 'Air and altitude', 'watch-2', 'word-air-density'),
]
for i, (lesson, title, watch, word) in enumerate(lessons):
    x, y = i % 2 * 1280, 60 + i // 2 * 1140
    draw.text((x + 16, y), title + ' · Watch', font=font, fill='#edc557')
    with Image.open(source / f'{lesson}-{watch}.png') as capture:
        sheet.paste(ImageOps.contain(capture.convert('RGB'), (1248, 780)), (x + 16, y + 40))
    for n, view in enumerate([word, 'prediction', 'challenge']):
        sx, sy = x + 16 + n * 420, y + 832
        draw.text((sx, sy), view.replace('-', ' '), font=small, fill='#edc557')
        with Image.open(source / f'{lesson}-{view}.png') as capture:
            sheet.paste(ImageOps.contain(capture.convert('RGB'), (408, 255)), (sx, sy + 26))
for quality in [88, 82, 75, 68, 60, 52, 44, 36, 28]:
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
assert target.stat().st_size <= 500_000
print(f'{target}: {target.stat().st_size} bytes')
