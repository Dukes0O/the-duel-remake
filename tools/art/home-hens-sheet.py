"""HOME-GROUND-LOOK-1 review sheet: the game's pictures of the hens, the crate nest box, the tin coop and the egg beside real photographs.

  python tools/art/home-hens-sheet.py --fetch
      fetches the photographs named in tools/art/home-hens-references.json into the art library (outside the repository); each
      must be public domain, CC0 or CC BY, and each is credited on the sheet.
  python tools/art/home-hens-sheet.py --round 2 --pictures .evidence/2026-11-27/HOME-GROUND-LOOK-1/r2/look-home-hens
      lays the pictures taken by the look scenario `look-home-hens` beside the photographs, three rows (the hens; the nest box and
      the egg; the coop), and writes docs/board/looks/home-ground/hens-round-N.jpg at 500 KB or less.

The game's pictures are 1280 x 720 frames; a cell marked 1:1 shows the frame's own pixels, doubled, at the distance named.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = json.loads((Path(__file__).parent / 'home-hens-references.json').read_text(encoding='utf-8'))
LIBRARY = Path(PLAN['directory'])
LICENCES = ('Public domain', 'CC0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0')
CELL = (360, 240)
CAPTION = 34


def fetch():
    LIBRARY.mkdir(parents=True, exist_ok=True)
    agent = {'User-Agent': 'art-reference-fetch/1.0'}
    def read(url):
        for attempt in range(5):
            try:
                return urllib.request.urlopen(urllib.request.Request(url, headers=agent), timeout=40).read()
            except OSError:
                time.sleep(5 + 8 * attempt)
        raise SystemExit('could not fetch ' + url)
    query = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': '|'.join(p['title'] for p in PLAN['photos']),
                                    'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiextmetadatafilter': 'LicenseShortName',
                                    'iiurlwidth': PLAN['width']})
    pages = json.loads(read('https://commons.wikimedia.org/w/api.php?' + query))['query']['pages'].values()
    found = {page['title']: page['imageinfo'][0] for page in pages if 'imageinfo' in page}
    for photo in PLAN['photos']:
        info = found[photo['title']]
        licence = info['extmetadata']['LicenseShortName']['value']
        assert licence in LICENCES and licence == photo['licence'], (photo['title'], licence)
        target = LIBRARY / photo['file']
        if not target.exists():
            target.write_bytes(read(info['thumburl']))
            time.sleep(1.5)
        print(target, licence)


def sheet(round_number, pictures):
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.load_default(size=13) if hasattr(ImageFont, 'load_default') else None
    small = ImageFont.load_default(size=11)
    photos = {p['file']: p for p in PLAN['photos']}

    def photo(name):
        entry = photos[name]
        image = Image.open(LIBRARY / name).convert('RGB')
        x0, y0, x1, y1 = entry['crop']
        w, h = image.size
        return cover(image.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))), 'Photo: ' + entry['caption']

    def cover(image):
        w, h = image.size
        scale = max(CELL[0] / w, CELL[1] / h)
        image = image.resize((max(CELL[0], round(w * scale)), max(CELL[1], round(h * scale))), Image.LANCZOS)
        w, h = image.size
        left, top = (w - CELL[0]) // 2, (h - CELL[1]) // 2
        return image.crop((left, top, left + CELL[0], top + CELL[1]))

    def game(name, label, crop=None, actual=False):
        path = Path(pictures) / f'look-home-hens-{name}.png'
        if not path.exists():
            return Image.new('RGB', CELL, (48, 44, 40)), 'Not taken this round: ' + label
        image = Image.open(path).convert('RGB')
        if crop:
            cx, cy, w = crop
            h = w * CELL[1] // CELL[0]
            image = image.crop((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2))
            if actual:
                return image.resize(CELL, Image.NEAREST), 'Game: ' + label
        return cover(image), 'Game: ' + label

    def earlier(round_before, label):
        # The same view from an earlier round's sheet, so that each round is judged against the last.
        path = ROOT / 'docs/board/looks/home-ground' / f'hens-round-{round_before}.jpg'
        if not path.exists():
            return Image.new('RGB', CELL, (48, 44, 40)), f'No round {round_before} sheet'
        return Image.open(path).convert('RGB').crop((2 * CELL[0], 56, 3 * CELL[0], 56 + CELL[1])), f'Round {round_before}: {label}'

    rows = [
        ('The hens: two Tin Town Brown hens from the wildlife chicken', [
            photo('lohmann-brown-side.jpg'), photo('lohmann-brown-peck.jpg'),
            game('hen-side', 'hen A from 1.2 m, crouched', (640, 360, 640)),
            game('hen-near', 'hen A from 2 m, standing', (640, 360, 640)),
            game('hen-far', 'hen A from 10 m, 1:1 doubled', (640, 360, 180), actual=True),
            game('nest-sit', 'hen B sitting in the box', (640, 360, 760))]),
        ('The nest box from an old crate, and the egg', [
            photo('hen-on-nest.jpg'), photo('crate-board.jpg'), photo('crates.jpg'), photo('brown-egg.jpg'),
            game('egg-in-box', 'the box once she has laid', (640, 360, 900)),
            game('egg-in-box', 'the egg, 1:1 doubled', (640, 400, 180), actual=True)]),
        ('The first coop, in tin (level 1), on his fenced ground', [
            photo('tin-shed.jpg'), photo('brown-hens-tin.jpg'),
            game('coop-day', 'from the lane by day'), game('coop-dusk', 'from the lane at dusk'),
            game('coop-door', 'pop door, ramp, set-down egg'), game('coop-back', 'far corner and his door')]),
    ]
    heading = f'HOME-GROUND-LOOK-1, round {round_number}'
    if round_number >= 5:
        # HOME-HEN-BODY: from round 5 the coop, nest box and egg have passed, and the sheet is the hen's alone.
        heading = f"HOME-HEN-BODY, round {round_number}, a laying hen's own body"
        rows = [
            ('The hen standing, beside photographed Lohmann Browns, and the last round', [
                photo('lohmann-brown-side.jpg'), photo('lohmann-brown-peck.jpg'),
                earlier(round_number - 1, 'hen A from 1.2 m'),
                game('hen-side', 'hen A from 1.2 m, crouched', (640, 360, 640)),
                game('hen-near', 'hen A from 2 m, standing', (640, 360, 640)),
                game('hen-far', 'hen A from 10 m, 1:1 doubled', (640, 360, 180), actual=True)]),
            ('The hen sitting in the nest box, and hens from farther off', [
                photo('hen-on-nest.jpg'),
                game('nest-sit', 'hen B sitting in the box', (640, 390, 520)),
                game('nest-sit', 'hen B in the box, 1:1 doubled', (640, 395, 300), actual=True),
                photo('brown-hens-tin.jpg'),
                game('coop-day', 'both hens from the lane, 9 m'),
                game('coop-day', 'from the lane, 1:1 doubled', (730, 420, 240), actual=True)]),
        ]
    title = 34
    width = CELL[0] * 6
    height = title + len(rows) * (22 + CELL[1] + CAPTION) + 40
    out = Image.new('RGB', (width, height), (26, 24, 22))
    draw = ImageDraw.Draw(out)
    draw.text((10, 9), f'{heading}: the game (Performance, 1280 x 720) beside real photographs',
              fill=(236, 228, 210), font=ImageFont.load_default(size=16))
    y = title
    for heading, cells in rows:
        draw.text((10, y + 4), heading, fill=(232, 190, 120), font=font)
        y += 22
        for index, (image, caption) in enumerate(cells):
            x = index * CELL[0]
            out.paste(image, (x, y))
            draw.rectangle((x, y + CELL[1], x + CELL[0] - 1, y + CELL[1] + CAPTION - 1), fill=(40, 37, 34))
            draw.text((x + 6, y + CELL[1] + 9), caption, fill=(230, 224, 212) if caption.startswith('Game') else (180, 200, 214), font=font)
            draw.line((x, y, x, y + CELL[1] + CAPTION), fill=(26, 24, 22), width=2)
        y += CELL[1] + CAPTION
    shown = PLAN['photos'] if round_number < 5 else [p for p in PLAN['photos'] if p['file'] in
                                                     ('lohmann-brown-side.jpg', 'lohmann-brown-peck.jpg', 'hen-on-nest.jpg', 'brown-hens-tin.jpg')]
    credits = 'Photographs, Wikimedia Commons: ' + '; '.join(f"{p['author']} ({p['licence']})" for p in shown)
    draw.text((10, y + 6), credits[:250], fill=(170, 164, 152), font=small)
    if len(credits) > 250:
        draw.text((10, y + 21), credits[250:], fill=(170, 164, 152), font=small)
    target = ROOT / 'docs/board/looks/home-ground' / f'hens-round-{round_number}.jpg'
    for quality in (86, 80, 74, 68, 62):
        out.save(target, quality=quality, optimize=True)
        if target.stat().st_size <= 500 * 1000:
            break
    print(target, target.stat().st_size // 1024, 'KB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--round', type=int)
    parser.add_argument('--pictures')
    args = parser.parse_args()
    if args.fetch:
        fetch()
    if args.round:
        if not args.pictures:
            sys.exit('--round needs --pictures')
        sheet(args.round, args.pictures)


if __name__ == '__main__':
    main()
