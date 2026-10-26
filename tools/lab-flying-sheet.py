"""Rebuild the Flying corner's single round-1 sheet from its real browser captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent.parent
source = root / '.evidence/2026-10-26/LAB-LESSONS-FLYING/round-1'
target = root / 'docs/board/looks/lab-2/lab-lessons-flying-1.jpg'
sheet = Image.new('RGB', (2000, 2590), '#252c29')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
draw.text((20, 12), 'Lab 2 · Flying corner · look round 1 · Claude to judge', font=font, fill='#edc557')
draw.text((20, 47), 'Real room captures · kilograms, metres, seconds and mph · memory-only · no frame timing', font=small, fill='#f5f0dc')
columns = [
    ('projectile', 'Projectile motion', ['wonder', 'word-gravity', 'watch-0', 'watch-2', 'prediction', 'hint', 'check-0', 'challenge']),
    ('fire', 'Fire triangle', ['wonder', 'word-fire-triangle', 'watch-2', 'watch-3', 'prediction', 'try-1', 'check-1', 'challenge']),
    ('pendulum', 'Pendulums', ['wonder', 'word-length', 'watch-0', 'watch-2', 'prediction', 'try-1', 'check-0', 'challenge']),
    ('altitude', 'Air and altitude', ['wonder', 'word-air-density', 'watch-0', 'watch-2', 'prediction', 'try-2', 'check-0', 'challenge']),
]
for col, (lesson, title, views) in enumerate(columns):
    draw.text((col * 500 + 12, 82), title, font=font, fill='#edc557')
    for row, name in enumerate(views):
        x, y = col * 500, 125 + row * 306
        draw.text((x + 10, y), name.replace('-', ' '), font=small, fill='#edc557')
        with Image.open(source / f'{lesson}-{name}.png') as capture:
            tile = ImageOps.contain(capture.convert('RGB'), (500, 278))
            sheet.paste(tile, (x + (500 - tile.width) // 2, y + 24))
target.parent.mkdir(parents=True, exist_ok=True)
for quality in [88, 82, 75, 68, 60, 52, 44]:
    sheet.save(target, quality=quality, optimize=True)
    if target.stat().st_size <= 500_000:
        break
assert target.stat().st_size <= 500_000
print(f'{target}: {target.stat().st_size} bytes')
