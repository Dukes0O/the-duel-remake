"""Compose EARN-CAR-2 native showroom images; resize only, no generated art."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--captures', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--round', type=int, choices=[1, 2, 3], required=True)
    args = parser.parse_args()
    report = json.loads((args.captures / 'report.json').read_text(encoding='utf-8'))
    if not report.get('passed') or not report.get('memoryOnlySaves') or report.get('issues') or report.get('warnings'):
        raise ValueError('Complete native memory-only report with zero errors and warnings required')
    if args.output.exists():
        raise ValueError('A formal art sheet is not overwritten')
    names = [('f1-front', 'Front three-quarter'), ('f1-rear', 'Rear three-quarter'),
             ('f1-side', 'Side silhouette'), ('f1-detail', 'Wheel and nose'),
             ('f1-damage', 'Actual damage'), ('f1-driver', 'Actual driver steering')]
    sheet = Image.new('RGB', (1200, 1212), '#182126')
    draw = ImageDraw.Draw(sheet)
    font_path = Path('C:/Windows/Fonts')
    title = ImageFont.truetype(str(font_path / 'segoeuib.ttf'), 27)
    label = ImageFont.truetype(str(font_path / 'segoeui.ttf'), 18)
    draw.text((18, 12), 'McLAREN F1 - NATIVE ROUND ' + str(args.round), font=title, fill='#e5e8e5')
    draw.text((18, 48), 'Original procedural model. Existing showroom cameras, lights and controls. Source ' + args.source[:12], font=label, fill='#bdcbd0')
    for index, (name, caption) in enumerate(names):
        path = args.captures / (name + '.png')
        if not any(Path(item).name == path.name for item in report.get('screenshots', [])):
            raise ValueError('Picture is absent from native report: ' + name)
        with Image.open(path) as source:
            if source.size != (1280, 720):
                raise ValueError('Native viewport changed')
            image = ImageOps.contain(source.convert('RGB'), (600, 337), Image.Resampling.LANCZOS)
        x, y = (index % 2) * 600, 88 + (index // 2) * 360
        sheet.paste(image, (x, y))
        draw.text((x + 12, y + 338), caption, font=label, fill='#dce5e7')
    draw.text((18, 1180), 'Appearance only. Gameplay, art verdict and field timing are separate checks.', font=label, fill='#bdcbd0')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in [88, 84, 80, 76, 72, 68]:
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            print(str(args.output) + ': ' + str(args.output.stat().st_size) + ' bytes')
            return
    raise ValueError('Sheet exceeds 500 KB')


if __name__ == '__main__':
    main()
