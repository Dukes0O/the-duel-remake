"""Round-two sheet: one large Watch view per lesson and a small full-flow strip."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.evidence/2026-10-26/LAB-LESSONS-WORKSHOP/round-2'
TARGET = ROOT / 'docs/board/looks/lab-2/lab-lessons-workshop-2.jpg'
WIDTH, HEIGHT = 3200, 2760
sheet = Image.new('RGB', (WIDTH, HEIGHT), '#252c29')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 28)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
draw.text((22, 12), 'The Lab · Workshop lessons · Round 2 · actual browser views', font=font, fill='#edc557')
draw.text((22, 52), 'Strength against weight / Rust / G-force / Headings and maps · Claude review pending · no frame timing', font=small, fill='#f5f0dc')
for index, (lesson, title) in enumerate([
    ('strength', 'Strength against weight'), ('rust', 'Rust'),
    ('gforce', 'G-force'), ('headings', 'Headings and maps'),
]):
    x0 = (index % 2) * 1600
    y = 105 + (index // 2) * 1320
    draw.text((x0 + 18, y), title + ' · Watch', font=font, fill='#edc557')
    watch = 'focus' if lesson == 'gforce' else 0 if lesson == 'rust' else 1
    with Image.open(SOURCE / f'{lesson}-watch-{watch}.png') as capture:
        tile = ImageOps.contain(capture.convert('RGB'), (1568, 980))
        sheet.paste(tile, (x0 + (1600 - tile.width) // 2, y + 45))
    for col, (suffix, label) in enumerate([
        ('wonder', 'Wonder'), ('prediction', 'Predict'),
        ('try-2', 'Alone'), ('challenge', 'Challenge: loaded world'),
    ]):
        x = x0 + col * 400
        draw.text((x + 10, y + 1035), label, font=small, fill='#f5f0dc')
        with Image.open(SOURCE / f'{lesson}-{suffix}.png') as capture:
            tile = ImageOps.contain(capture.convert('RGB'), (396, 223))
            sheet.paste(tile, (x + (400 - tile.width) // 2, y + 1070))
TARGET.parent.mkdir(parents=True, exist_ok=True)
sheet = sheet.resize((2800, 2415), Image.Resampling.LANCZOS)
for quality in (88, 80, 72, 64, 55, 45, 40):
    sheet.save(TARGET, quality=quality, optimize=True)
    if TARGET.stat().st_size <= 500_000:
        break
assert TARGET.stat().st_size <= 500_000
print(f'{TARGET}: {TARGET.stat().st_size} bytes')
