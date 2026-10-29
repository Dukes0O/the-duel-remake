"""Compose a North woods review sheet from actual exports and references.

Run after each species entry point with --review. Reference triptychs are
generated with the built-in imagegen tool and live outside the repository.
"""
import argparse
import json
import struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

IDS = ('white-tailed-deer', 'moose', 'black-bear', 'beaver', 'eastern-wolf')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--references', type=Path, required=True)
    parser.add_argument('--round', type=int, choices=(1, 2, 3), default=1)
    args = parser.parse_args()
    root = args.root.resolve()
    sheet = Image.new('RGB', (2040, 1850), '#17201f')
    draw = ImageDraw.Draw(sheet)
    font_path = 'C:/Windows/Fonts/arial.ttf'
    font = ImageFont.truetype(font_path, 25)
    small = ImageFont.truetype(font_path, 20)
    title = ImageFont.truetype(font_path, 38)
    draw.text((28, 18), f'NORTH WOODS | ROUND {args.round} | CLAUDE REVIEW', font=title, fill='#efe7d7')
    draw.text((28, 70), 'Actual GLB imports | 14 m, 55 mm | neutral forest light | Blender candidates, not game placement', font=small, fill='#bbc4b7')
    for i, label in enumerate(('Generated species reference', 'Candidate side', 'Candidate three-quarter')):
        draw.text((28 + i * 680, 110), label, font=font, fill='#d4d9c8')
    rows = []
    for i, species in enumerate(IDS):
        y = 153 + i * 330
        data = (root / 'public/assets/wildlife' / (species + '.glb')).read_bytes()
        gltf = json.loads(data[20:20 + struct.unpack_from('<I', data, 12)[0]])
        triangles = sum(gltf['accessors'][p['indices']]['count'] // 3
                        for mesh in gltf['meshes'] for p in mesh['primitives'])
        rows.append({'species': species, 'triangles': triangles, 'bytes': len(data)})
        draw.text((28, y), species.replace('-', ' ').title() + ' | ' + f'{triangles:,} triangles', font=font, fill='#efe7d7')
        inputs = [args.references / (species + '.png')] + [
            root / ('.qa-dist/wildlife-round-' + str(args.round)) / (species + '-' + view + '.png')
            for view in ('side', 'three-quarter')]
        for col, path in enumerate(inputs):
            source = Image.open(path).convert('RGB')
            thumb = ImageOps.contain(source, (656, 282), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (12 + col * 680 + (656 - thumb.width) // 2, y + 35 + (282 - thumb.height) // 2))
    draw.text((28, 1815), 'CC0 Quaternius deer/moose/wolf | CC BY 3.0 Poly by Google bear/beaver | all coats 1024 x 1024', font=small, fill='#bbc4b7')
    output = root / f'docs/board/looks/wildlife/north-woods-round-{args.round}.jpg'
    output.parent.mkdir(parents=True, exist_ok=True)
    for quality in (88, 84, 80, 76, 72, 68):
        sheet.save(output, quality=quality, optimize=True, subsampling=2)
        if output.stat().st_size <= 500000:
            break
    assert output.stat().st_size <= 500000
    print(json.dumps({'sheet': str(output), 'bytes': output.stat().st_size, 'models': rows}, indent=2))


if __name__ == '__main__':
    main()
