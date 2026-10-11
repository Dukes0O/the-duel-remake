"""Create one honest source/Blender/runtime comparison sheet per P4 kit group."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blender', type=Path, required=True)
    parser.add_argument('--browser', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True, help='Canonical docs/board/looks root')
    parser.add_argument('--round', type=int, choices=[1, 2, 3], required=True)
    parser.add_argument('--groups', help='Comma-separated completed groups; omit for all six')
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    browser = json.loads((args.browser / 'p4-kits.json').read_text(encoding='utf-8'))
    if browser.get('round') != args.round or len(browser.get('captures', [])) != 12:
        raise ValueError('Complete matched High/Performance browser evidence is required')
    if browser.get('manifestSha256') != hashlib.sha256(args.manifest.read_bytes()).hexdigest():
        raise ValueError('Browser evidence must match the current manifest bytes')
    fonts = Path('C:/Windows/Fonts')
    title = ImageFont.truetype(str(fonts / 'segoeuib.ttf'), 31)
    heading = ImageFont.truetype(str(fonts / 'segoeuib.ttf'), 24)
    body = ImageFont.truetype(str(fonts / 'segoeui.ttf'), 22)
    small = ImageFont.truetype(str(fonts / 'segoeui.ttf'), 20)
    all_groups = list(dict.fromkeys(p['group'] for p in manifest['pieces']))
    groups = args.groups.split(',') if args.groups else all_groups
    if not groups or any(group not in all_groups for group in groups):
        raise ValueError('Unknown kit group')
    for group in groups:
        pieces = [p for p in manifest['pieces'] if p['group'] == group]
        with_night = group == 'characters' and args.round >= 2
        sheet = Image.new('RGB', (1800, 2474 if with_night else 1410), (27, 31, 33))
        draw = ImageDraw.Draw(sheet)
        draw.text((28, 16), f'P4 KITS | {group.upper()} | ROUND {args.round}', font=title, fill=(239, 227, 201))
        draw.text((28, 58), 'Selected original donors, fitted Blender exports, and the actual game renderer.', font=body, fill=(196, 207, 207))
        panels = [
            ('ORIGINAL DONORS | unchanged shapes and palettes', args.blender / (group + '-source.png')),
            ('BLENDER | adapted High exports', args.blender / (group + '-blender.png')),
            ('GAME HIGH | native textures and circuit lighting', args.browser / ('p4-kits-' + group + '-high.png')),
            ('GAME PERFORMANCE | real distant GLBs', args.browser / ('p4-kits-' + group + '-performance.png')),
        ]
        if with_night:
            witnesses = browser.get('yetiNight', [])
            if sorted(row['quality'] for row in witnesses) != ['high', 'performance']:
                raise ValueError('Both native night character witnesses are required')
            for clip, fraction, caption in [('roar', .51, 'ROAR'), ('walk-off', .99, 'DEPARTURE')]:
                for quality in ['high', 'performance']:
                    witness = next(row for row in witnesses if row['quality'] == quality)
                    if abs(witness['cameraDistance'] - 30) > .00001 or abs(witness['height'] - 2.8) > .005:
                        raise ValueError('Night witness must retain actual 30 m distance and 2.8 m skin')
                    if witness['night'] != 'night' or witness['theme'] != 'alpine':
                        raise ValueError('Actual native alpine night lighting required')
                    capture = next(row for row in witness['captures']
                                   if row['name'] == clip and row['fraction'] == fraction)
                    panels.append((f'NIGHT {quality.upper()} | 30 m | {caption}',
                                   args.browser / (capture['image'] + '.png')))
        for index, (label, path) in enumerate(panels):
            x, y = 24 + (index % 2) * 894, 101 + (index // 2) * 532
            draw.text((x + 8, y), label, font=small, fill=(239, 227, 201))
            image = Image.open(path).convert('RGB')
            # Keep full frames. No repaint, cropping, sharpening or relighting.
            image = ImageOps.contain(image, (872, 490))
            sheet.paste(image, (x + (872 - image.width) // 2, y + 32 + (490 - image.height) // 2))
        footer = 1064 if with_night else 0
        y = 1175 + footer
        draw.text((28, y), 'ORDER: ' + ', '.join(p['id'] for p in pieces[:4]), font=small, fill=(221, 226, 221))
        if len(pieces) > 4:
            draw.text((28, y + 29), 'NEXT ROW: ' + ', '.join(p['id'] for p in pieces[4:]), font=small, fill=(221, 226, 221))
        high = sum(p['highTriangles'] for p in pieces)
        low = sum(p['lowTriangles'] for p in pieces)
        size = sum(p['bytes'] for p in pieces)
        draw.text((28, 1244 + footer), f'{len(pieces)} pieces | High {high:,} triangles | Distant {low:,} triangles | Both files {size / 1024:.0f} KiB', font=heading, fill=(239, 227, 201))
        for line, value in enumerate([
            ('Day comparisons normalize pieces to 4 m. Night frames show the actual 2.8 m skin at a measured 30 m.'
             if with_night else 'Each piece is normalized to 4 m for this sheet. Shipped files retain metric dimensions and ground pivots.'),
            'Donor shapes may repeat where one source supplies several fitted props. Track placement and frame cost await track cards.',
            'Round verdict is written by the reviewer. A screenshot alone does not approve the art or character motion.',
        ]):
            draw.text((28, 1288 + footer + line * 31), value, font=small, fill=(181, 196, 196))
        target = args.output / ('p4-kits-' + group) / ('round-' + str(args.round) + '.jpg')
        target.parent.mkdir(parents=True, exist_ok=True)
        for quality in [88, 84, 80, 76, 72, 68, 64]:
            sheet.save(target, quality=quality, optimize=True)
            if target.stat().st_size <= 500000:
                break
        if target.stat().st_size > 500000:
            raise ValueError('Sheet exceeds 500 KB: ' + str(target))
        print(str(target), target.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
