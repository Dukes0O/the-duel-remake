"""Build one honest Panorama sheet from complete native High/Performance captures."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--round', type=int, choices=[1, 2, 3], required=True)
    args = parser.parse_args()
    report = json.loads((args.browser / 'p4-panorama.json').read_text(encoding='utf-8'))
    harness = json.loads((args.browser / 'report.json').read_text(encoding='utf-8'))
    if not report.get('passed') or not harness.get('passed') or not harness.get('memoryOnlySaves'):
        raise ValueError('Complete actual memory-only native acceptance is required')
    if harness.get('issues'):
        raise ValueError('A browser failure cannot become an art sheet')
    qualities = ['high', 'performance']
    keys = [('Pit Straight', 'golden-grid'), ('Ridge Top', 'golden-racing'),
            ('Skyline', 'golden-racing'), ('Conrod Straight', 'golden-racing'), ('Final Lap', 'dusk')]
    if args.round >= 2:
        keys += [('The Esses 1', 'golden-racing'), ('Murray Corner', 'golden-racing')]
    if args.round == 3:
        keys += [('Skyline', 'dusk'), ('Conrod Straight', 'dusk')]
    captures = report['captures']
    rows = []
    for quality in qualities:
        detail = next(row for row in report['qualities'] if row['quality'] == quality)
        if detail['final']['laps'] != 3 or detail['final']['finished'] != 7:
            raise ValueError('Every actual car must finish before the sheet claims a full race')
        matches = []
        for name, phase in keys:
            found = [row for row in captures if row['quality'] == quality and row['name'] == name and row['phase'] == phase]
            if len(found) != 1 or found[0].get('nativeFieldSize') != 8 or not 1 <= found[0]['nativeCars'] <= 8:
                raise ValueError('Actual eight-car native field or visible racer is missing')
            if phase == 'golden-grid' and found[0]['nativeCars'] != 8:
                raise ValueError('The genuine grid must show all eight native models')
            if phase == 'dusk' and (found[0]['laps'] < 2 or found[0]['nightAmount'] <= 0):
                raise ValueError('Dusk must come from actual lap progress and light metadata')
            matches.append(found[0])
        rows.append(matches)
    cell_width = 384 if args.round == 1 else 256 if args.round == 3 else 320
    image_height = cell_width * 9 // 16
    width = cell_width * len(keys)
    sheet = Image.new('RGB', (width, 730), '#111c23')
    draw = ImageDraw.Draw(sheet)
    fonts = Path('C:/Windows/Fonts')
    title = ImageFont.truetype(str(fonts / 'segoeuib.ttf'), 30)
    label = ImageFont.truetype(str(fonts / 'segoeui.ttf'), 20)
    draw.text((20, 14), 'PANORAMA RIDGE SUNSET — NATIVE ROUND ' + str(args.round), font=title, fill='#e9cc9a')
    draw.text((20, 57), 'Actual approved kits and road. Genuine eight-car field; distant racers use native culling. No synthetic laps, finishes or poses.', font=label, fill='#bfced5')
    for row_index, captures_row in enumerate(rows):
        y = 100 + row_index * 265
        for column, capture in enumerate(captures_row):
            image = Image.open(args.browser / capture['file']).convert('RGB')
            if image.size != (1280, 720):
                raise ValueError('Native viewport changed; no crop or substitute allowed')
            image = ImageOps.contain(image, (cell_width, image_height), Image.Resampling.LANCZOS)
            sheet.paste(image, (column * cell_width, y))
            text = qualities[row_index].title() + ': ' + capture['name']
            draw.text((column * cell_width + 8, y + image_height + 4), text, font=label, fill='#dce5e9')
            light = 'light ' + format(capture['nightAmount'], '.3f') + ' · lap ' + str(capture['laps'] + 1)
            draw.text((column * cell_width + 8, y + image_height + 27), light, font=label, fill='#afc4cc')
    draw.text((20, 648), 'Full images resized only. Grid is a static genuine start; later views follow native driving and actual light progress.', font=label, fill='#bfced5')
    draw.text((20, 680), 'This sheet records appearance. The card separately records full-field balance, quiet frame timing and Claude’s verdict.', font=label, fill='#bfced5')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in [88, 84, 80, 76, 72, 68, 64]:
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            print(str(args.output) + ': ' + str(args.output.stat().st_size) + ' bytes')
            return
    raise ValueError('Native sheet exceeds 500 KB; no oversized output is accepted')


if __name__ == '__main__':
    main()
