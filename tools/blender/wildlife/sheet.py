"""Compose a wildlife review sheet from actual exports and references.

Run after each species entry point with --review. North woods reference
triptychs are generated with the built-in imagegen tool and live outside the
repository. Later groups (--group) have no reference column: Claude judges
them against the real animals. Their sheets show the 14 m side and
three-quarter views and close Idle and motion frames.
"""
import argparse
import json
import struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

IDS = ('white-tailed-deer', 'moose', 'black-bear', 'beaver', 'eastern-wolf')
BIRDS = ('raven', 'sulphur-crested-cockatoo', 'kookaburra')
GROUPS = {
    'west-australia-1a': ('WESTERN MOUNTAINS', ('mule-deer', 'elk', 'bighorn-sheep', 'cougar', 'coyote',
                                                'yellow-bellied-marmot', 'raven')),
    'west-australia-1b': ('AUSTRALIA, AND WOLF TRACKS', ('eastern-grey-kangaroo', 'sulphur-crested-cockatoo',
                                                        'kookaburra', 'echidna')),
    'west-australia-2': ('WESTERN MOUNTAINS AND AUSTRALIA, CHANGED', ('eastern-grey-kangaroo', 'cougar', 'bighorn-sheep', 'elk',
                                                                    'yellow-bellied-marmot', 'kookaburra', 'raven',
                                                                    'sulphur-crested-cockatoo')),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--references', type=Path)
    parser.add_argument('--round', type=int, choices=(1, 2, 3), default=1)
    parser.add_argument('--group', choices=sorted(GROUPS))
    args = parser.parse_args()
    root = args.root.resolve()
    if args.group:
        return group_sheet(root, args.round, args.group)
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


def glb_facts(path):
    data = path.read_bytes()
    gltf = json.loads(data[20:20 + struct.unpack_from('<I', data, 12)[0]])
    triangles = sum(gltf['accessors'][p['indices']]['count'] // 3
                    for mesh in gltf['meshes'] for p in mesh['primitives'])
    clips = sorted(a['name'] for a in gltf.get('animations', []))
    return {'triangles': triangles, 'bytes': len(data), 'clips': clips}


def group_sheet(root, round_number, group):
    title_text, ids = GROUPS[group]
    part = group.rsplit('-', 1)[1][1:]
    evidence = root / ('.qa-dist/wildlife-round-' + str(round_number))
    rows = len(ids) + (1 if part == 'b' else 0)
    width, cell_w, cell_h = 2040, 498, 225
    sheet = Image.new('RGB', (width, 150 + rows * (cell_h + 46) + 40), '#17201f')
    draw = ImageDraw.Draw(sheet)
    font_path = 'C:/Windows/Fonts/arial.ttf'
    font = ImageFont.truetype(font_path, 25)
    small = ImageFont.truetype(font_path, 20)
    title = ImageFont.truetype(font_path, 38)
    draw.text((28, 18), f'{title_text} | ROUND {round_number}{part} | CLAUDE REVIEW', font=title, fill='#efe7d7')
    draw.text((28, 70), 'Actual GLB imports | columns 1-2: 14 m, 55 mm, Idle frame 1 | columns 3-4: close Idle and gait frames | not game placement',
              font=small, fill='#bbc4b7')
    for i, label in enumerate(('Side, 14 m', 'Three-quarter, 14 m', 'Close: Idle', 'Close: Walk or Fly')):
        draw.text((28 + i * (cell_w + 12), 108), label, font=font, fill='#d4d9c8')
    facts = []
    y = 150
    for species in ids:
        info = glb_facts(root / 'public/assets/wildlife' / (species + '.glb'))
        motion = 'fly' if species in BIRDS else 'walk'
        clip_text = 'Idle, ' + motion.title() + (f' (+{len(info["clips"]) - 2} donor clips)' if len(info['clips']) > 2 else '')
        facts.append({'species': species, **{k: info[k] for k in ('triangles', 'bytes')}, 'clips': len(info['clips'])})
        draw.text((28, y), species.replace('-', ' ').title() + f' | {info["triangles"]:,} triangles | '
                  f'{info["bytes"] / 1e6:.2f} MB | {clip_text}', font=font, fill='#efe7d7')
        for col, view in enumerate(('side', 'three-quarter', 'close-idle', 'close-' + motion)):
            source = Image.open(evidence / (species + '-' + view + '.png')).convert('RGB')
            thumb = ImageOps.contain(source, (cell_w, cell_h), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (12 + col * (cell_w + 12) + (cell_w - thumb.width) // 2, y + 36))
        y += cell_h + 46
    if part == 'b':
        tracks = Image.open(root / 'public/assets/wildlife/wolf-tracks.png').convert('RGBA')
        draw.text((28, y), 'Wolf tracks | 512 x 512 RGBA tiling decal, 1.5 m square, '
                  f'{(root / "public/assets/wildlife/wolf-tracks.png").stat().st_size / 1e3:.0f} KB | on plain snow: one tile, then tiled 3 high',
                  font=font, fill='#efe7d7')
        snow = Image.new('RGBA', (512, 512), (226, 233, 242, 255))
        snow.alpha_composite(tracks)
        sheet.paste(snow.convert('RGB').resize((cell_h, cell_h)), (12 + (cell_w - cell_h) // 2, y + 36))
        strip = Image.new('RGBA', (512, 1536), (226, 233, 242, 255))
        for k in range(3):
            strip.alpha_composite(tracks, (0, 512 * k))
        strip = strip.convert('RGB').rotate(90, expand=True)
        band = round(strip.width * cell_h / (cell_w * 3 + 24))
        strip = strip.crop((0, 256 - band // 2, strip.width, 256 - band // 2 + band)).resize((cell_w * 3 + 24, cell_h))
        sheet.paste(strip, (12 + cell_w + 12, y + 36))
    draw.text((28, sheet.height - 34), 'CC0 Quaternius deer (mule deer, elk, bighorn) and wolf (cougar, coyote) reshaped | '
              'kangaroo, marmot, echidna and birds: original recipes | coats 1K; marmot and birds 512', font=small, fill='#bbc4b7')
    output = root / f'docs/board/looks/wildlife/west-australia-round-{round_number}{part}.jpg'
    output.parent.mkdir(parents=True, exist_ok=True)
    for quality in (86, 82, 78, 74, 70, 66, 62):
        sheet.save(output, quality=quality, optimize=True, subsampling=2)
        if output.stat().st_size <= 500000:
            break
    assert output.stat().st_size <= 500000
    print(json.dumps({'sheet': str(output), 'bytes': output.stat().st_size, 'models': facts}, indent=2))


if __name__ == '__main__':
    main()
