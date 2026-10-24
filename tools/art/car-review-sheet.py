"""One look-review sheet (JPG) from the four renders of tools/blender/car-review.py.

Usage:
  python tools/art/car-review-sheet.py <render folder> <out.jpg> "<title>" [max bytes]
The looks folder has a 20 MB budget (tools/test-review-evidence.mjs), so keep
sheets small; the default limit is 125,000 bytes.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TILE = (480, 300)
VIEWS = [('front-three-quarter', 'Front three-quarter'), ('side', 'Side'),
         ('rear-three-quarter', 'Rear three-quarter'), ('front-close', 'Front close-up')]


def main(folder, out, title, limit='125000'):
    folder, out, limit = Path(folder), Path(out), int(limit)
    sheet = Image.new('RGB', (TILE[0] * 2, TILE[1] * 2 + 34), (18, 22, 20))
    draw = ImageDraw.Draw(sheet)
    try:
        font, head = ImageFont.truetype('arialbd.ttf', 15), ImageFont.truetype('arialbd.ttf', 17)
    except OSError:
        font = head = ImageFont.load_default()
    draw.text((10, 8), title, fill=(235, 228, 210), font=head)
    for index, (name, label) in enumerate(VIEWS):
        image = Image.open(folder / f'{name}.png').convert('RGB').resize(TILE, Image.LANCZOS)
        x, y = (index % 2) * TILE[0], 34 + (index // 2) * TILE[1]
        sheet.paste(image, (x, y))
        draw.rectangle((x, y + TILE[1] - 24, x + TILE[0], y + TILE[1]), fill=(10, 12, 11))
        draw.text((x + 8, y + TILE[1] - 21), label, fill=(232, 190, 130), font=font)
    for quality in (84, 78, 72, 66, 60, 54, 48, 42):
        sheet.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        if out.stat().st_size <= limit:
            break
    else:
        sys.exit(f'{out} is {out.stat().st_size} bytes, over the {limit:,}-byte limit')
    print(f'{out} {out.stat().st_size} bytes')


if __name__ == '__main__':
    main(*sys.argv[1:5])
