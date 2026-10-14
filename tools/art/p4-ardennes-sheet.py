"""Make one honest Ardennes sheet from native memory-only High/Performance views."""
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
    report = json.loads((args.browser / 'ardennes-views.json').read_text(encoding='utf-8'))
    harness = json.loads((args.browser / 'report.json').read_text(encoding='utf-8'))
    if not report.get('passed') or not harness.get('passed') or not harness.get('memoryOnlySaves') or harness.get('issues'):
        raise ValueError('Complete actual memory-only native acceptance is required')
    keys = [('Pit Straight', 'mist-grid')] + [(name, 'first-lap') for name in
        ['La Fontaine', 'Red Water', 'The Wall', 'Kestrel Straight', 'Les Combes', 'Riverside', 'Stavelot', 'Bus Stop Exit']] + [('Pit Straight', 'clear-second-lap')]
    rows = []
    for quality in ['high', 'performance']:
        detail = next(row for row in report['qualities'] if row['quality'] == quality)
        final = detail['final']
        if final['laps'] != 2 or final['finished'] != 7 or not final['allDone'] or final['crashes'] or final['resets'] or final['firstLapPileUp']:
            raise ValueError('The actual two-lap native field must complete cleanly')
        captures = []
        for name, phase in keys:
            found = [row for row in report['captures'] if row['quality'] == quality and row['name'] == name and row['phase'] == phase]
            if len(found) != 1 or found[0].get('nativeFieldSize') != 8 or not found[0].get('stateUnchanged'):
                raise ValueError('Actual eight-car field or read-only native capture missing')
            capture = found[0]
            if not 1 <= capture['nativeCars'] <= 8 or phase == 'mist-grid' and capture['nativeCars'] != 8:
                raise ValueError('The real native grid must show eight actual cars')
            if phase == 'mist-grid' and capture['fogNear'] != 90:
                raise ValueError('Authored morning start is missing')
            if phase == 'clear-second-lap' and (capture['laps'] < 1 or capture['fogNear'] != 360):
                raise ValueError('Clear light must come from actual second-lap progress')
            captures.append(capture)
        rows.append(captures)
    cell = 256
    sheet = Image.new('RGB', (cell * len(keys), 610), '#11201d')
    draw = ImageDraw.Draw(sheet)
    fonts = Path('C:/Windows/Fonts')
    title = ImageFont.truetype(str(fonts / 'segoeuib.ttf'), 28)
    label = ImageFont.truetype(str(fonts / 'segoeui.ttf'), 16)
    draw.text((16, 12), 'ARDENNES FOREST: NATIVE ROUND ' + str(args.round), font=title, fill='#e7d6ad')
    draw.text((16, 52), 'Actual authored road and kits. Original stone bridge, footbridge and timing tower. Genuine eight-car, two-lap field.', font=label, fill='#bdcec5')
    for row_index, captures in enumerate(rows):
        y = 88 + row_index * 225
        for column, capture in enumerate(captures):
            image = Image.open(args.browser / capture['file']).convert('RGB')
            if image.size != (1280, 720):
                raise ValueError('Viewport changed; no crop or replacement is allowed')
            image = ImageOps.contain(image, (cell, 144), Image.Resampling.LANCZOS)
            sheet.paste(image, (column * cell, y))
            draw.text((column * cell + 6, y + 148), capture['quality'].title() + ': ' + capture['name'], font=label, fill='#e0e9e1')
            draw.text((column * cell + 6, y + 172), 'Lap ' + str(capture['laps'] + 1) + ', fog near ' + format(capture['fogNear'], '.0f') + ' m', font=label, fill='#b0c5b6')
    draw.text((16, 548), 'Full native images resized only. No synthetic laps, finishes, poses or scenery composites. Art acceptance belongs to Claude.', font=label, fill='#bdcec5')
    draw.text((16, 575), 'This sheet records appearance. Field tuning, drive-through contact and quiet frame timing are separate checks.', font=label, fill='#bdcec5')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in [88, 84, 80, 76, 72, 68, 64]:
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            print(str(args.output) + ': ' + str(args.output.stat().st_size) + ' bytes')
            return
    raise ValueError('Actual art sheet exceeds 500 KB')


if __name__ == '__main__':
    main()
