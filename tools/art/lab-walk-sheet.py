"""Make LAB-WALK's four-view review sheet from its browser scenario captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '.evidence/2026-10-26/LAB-WALK'
TARGET = ROOT / 'docs/board/looks/lab-2/look-1.jpg'
VIEWS = [('door', 'Entrance board'), ('corner', 'Flying corner'),
         ('machine-prompt', 'Machine prompt'), ('brian', 'Brian in the room')]


def main():
    sheet = Image.new('RGB', (1920, 1280), '#252c29')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 26)
    for index, (name, caption) in enumerate(VIEWS):
        x, y = (index % 2) * 960, (index // 2) * 640
        draw.text((x + 16, y + 10), caption, font=font, fill='#edc557')
        with Image.open(SOURCE / f'{name}.png') as image:
            image.thumbnail((960, 594), Image.Resampling.LANCZOS)
            sheet.paste(image, (x + (960 - image.width) // 2, y + 46))
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(TARGET, quality=82, optimize=True)
    if TARGET.stat().st_size > 500_000:
        sheet.save(TARGET, quality=68, optimize=True)
    assert TARGET.stat().st_size <= 500_000
    print(f'{TARGET.relative_to(ROOT)}: {TARGET.stat().st_size} bytes')


if __name__ == '__main__':
    main()
