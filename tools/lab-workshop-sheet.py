"""Round-one contact sheet from actual memory-only browser captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.evidence/2026-10-26/LAB-LESSONS-WORKSHOP/round-1'
TARGET = ROOT / 'docs/board/looks/lab-2/lab-lessons-workshop-1.jpg'
WIDTH, HEIGHT = 3000, 1820
sheet = Image.new('RGB', (WIDTH, HEIGHT), '#252c29')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 28)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
draw.text((22, 12), 'The Lab · Workshop lessons · Round 1 · actual browser views', font=font, fill='#edc557')
draw.text((22, 52), 'Strength against weight / Rust / G-force / Headings and maps · Claude review pending · no frame timing', font=small, fill='#f5f0dc')
for row, (lesson, title) in enumerate([
    ('strength', 'Strength against weight'), ('rust', 'Rust'),
    ('gforce', 'G-force'), ('headings', 'Headings and maps'),
]):
    y = 105 + row * 426
    draw.text((18, y), title, font=font, fill='#edc557')
    for col, (suffix, label) in enumerate([
        ('wonder', 'Wonder'), ('watch-1', 'Watch'), ('prediction', 'Predict'),
        ('try-2', 'Alone: result'), ('check-0', 'Check: replay correct answer'),
    ]):
        x = col * 600
        draw.text((x + 10, y + 41), label, font=small, fill='#f5f0dc')
        with Image.open(SOURCE / f'{lesson}-{suffix}.png') as capture:
            tile = ImageOps.contain(capture.convert('RGB'), (596, 335))
            sheet.paste(tile, (x + (600 - tile.width) // 2, y + 76))
TARGET.parent.mkdir(parents=True, exist_ok=True)
for quality in (88, 80, 72, 64, 55):
    sheet.save(TARGET, quality=quality, optimize=True)
    if TARGET.stat().st_size <= 500_000:
        break
assert TARGET.stat().st_size <= 500_000
print(f'{TARGET}: {TARGET.stat().st_size} bytes')
