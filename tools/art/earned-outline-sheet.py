"""Comparison sheet for the earned cars' outline round (EARN-OUTLINE).

  python tools/art/earned-outline-sheet.py <lane .evidence folder> <out.jpg> [max bytes]

Expects <folder>/before/<car>/ and <folder>/after/<car>/ from tools/art/skyline-review.py
(views side and three-quarter) and <folder>/before/fit.json, <folder>/after/fit.json from
tools/art/earned-outline-fit.py. Each row: the reference photo, the model before, the
model after; renders are turned to face the photo's way. Photos stay in the art library
and are only read here.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

LIBRARY = Path('C:/Users/kyleb/dev/art-library')
TILE = (420, 236)
CARS = [
    # key, render folder, art-library folder, name, rows: (view, photo, photo crop, flip render)
    ('ferrari_enzo', 'enzo', 'ferrari-enzo', 'Ferrari Enzo', [
        ('side', 'side.jpg', (60, 230, 1180, 640), False),
        ('three-quarter', 'three-quarter.jpg', (0, 120, 1200, 803), True)]),
    ('mclaren_f1', 'f1', 'mclaren-f1', 'McLaren F1', [
        ('side', 'side.jpg', (0, 160, 1280, 540), True),
        ('three-quarter', 'three-quarter.jpg', (0, 80, 1280, 705), True)]),
    ('bugatti_bolide', 'bolide', 'bugatti-bolide', 'Bugatti Bolide', [
        ('side', 'side.jpg', (180, 260, 1120, 530), False),
        ('three-quarter', 'three-quarter.jpg', (0, 60, 1280, 730), False)]),
]


def trim(image):
    """Crop a studio render to the car with a small margin."""
    grey = image.convert('L')
    corner = grey.getpixel((2, 2))
    mask = grey.point(lambda v: 255 if abs(v - corner) > 18 else 0)
    box = mask.getbbox() or (0, 0, *image.size)
    pad = 12
    return image.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(image.width, box[2] + pad), min(image.height, box[3] + pad)))


def fit(image):
    image = image.convert('RGB')
    image.thumbnail(TILE, Image.LANCZOS)
    tile = Image.new('RGB', TILE, (28, 30, 32))
    tile.paste(image, ((TILE[0] - image.width) // 2, (TILE[1] - image.height) // 2))
    return tile


def credits():
    """Author and licence of each photo on the sheet, read from each car's sources.json."""
    lines = []
    for _, _, library, name, views in CARS:
        sources = {e['file']: e for e in json.loads((LIBRARY / library / 'reference' / 'sources.json').read_text())}
        used = {}
        for _, photo, _, _ in views:
            e = sources[photo]
            used.setdefault(f"{e['author']}, {e['licence']}", []).append(photo.removesuffix('.jpg'))
        lines.append(f'{name} ' + ', '.join(f"{' and '.join(views)} by {who}" for who, views in used.items()))
    return lines


def main(folder, out, limit='500000'):
    folder, out, limit = Path(folder), Path(out), int(limit)
    scores = {when: json.loads((folder / when / 'fit.json').read_text()) for when in ('before', 'after')}
    rows = sum(len(car[4]) for car in CARS)
    head, label, foot = 40, 22, 74
    sheet = Image.new('RGB', (TILE[0] * 3, head + rows * (TILE[1] + label) + foot), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font, title = ImageFont.truetype('arialbd.ttf', 14), ImageFont.truetype('arialbd.ttf', 17)
    except OSError:
        font = title = ImageFont.load_default()
    draw.text((10, 10), 'Earned cars, outline round: photo / model before / model after (studio light, same runtime models the game draws)',
              fill=(235, 228, 210), font=title)
    y = head
    for key, short, library, name, views in CARS:
        for view, photo, crop, flip in views:
            picture = Image.open(LIBRARY / library / 'reference' / photo).crop(crop)
            tiles = [fit(picture)]
            for when in ('before', 'after'):
                render = trim(Image.open(folder / when / short / f'{view}.png').convert('RGB'))
                tiles.append(fit(ImageOps.mirror(render) if flip else render))
            for i, tile in enumerate(tiles):
                sheet.paste(tile, (i * TILE[0], y + label))
            texts = [f'{name}: photo, {view}']
            for when in ('before', 'after'):
                side = scores[when].get(key, {}).get('side')
                texts.append(f'{when}' + (f' (side outline overlap {side:.2f})' if view == 'side' and side else ''))
            for i, text in enumerate(texts):
                draw.text((i * TILE[0] + 8, y + 3), text, fill=(235, 228, 210), font=font)
            y += TILE[1] + label
    for i, line in enumerate(['Photos from Wikimedia Commons, used for comparison only:', *credits()]):
        draw.text((10, y + 4 + i * 17), line, fill=(200, 196, 186), font=font)
    for quality in range(88, 30, -4):
        sheet.save(out, quality=quality, optimize=True)
        if out.stat().st_size <= limit:
            break
    print(out, out.stat().st_size, 'bytes')


if __name__ == '__main__':
    main(*sys.argv[1:])
