"""Make one honest Ardennes sheet from native memory-only High/Performance views."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


def player_crash_accepted(detail):
    final, observer = detail['final'], detail['observer']
    events = observer['playerEvents']
    if observer.get('restored') is not True:
        return False
    incidents = observer['incidents']
    if any(type(row.get('index')) is not int or not -1 <= row['index'] <= 6 for row in incidents):
        return False
    if observer['playerIncidents'] != [row for row in incidents if row['index'] == -1] or observer['cpuIncidents'] != [row for row in incidents if row['index'] >= 0]:
        return False
    if final['crashes'] == 0:
        return len(events) == 0 and detail.get('knownPlayerException') is False
    if final['crashes'] != 1 or len(events) != 1 or detail.get('knownPlayerException') is not True:
        return False
    if (detail['id'], detail['seed'], detail['fieldSeed'], detail['car'], detail['cpuDifficulty'], detail['lineSkill'], detail['stock']) != ('ardennes-forest', 1989, 1000, 'stuttgart_959s', 'medium', .95, True):
        return False
    event = events[0]
    contact = event.get('contact') or {}
    prop = contact.get('selectedProp') or {}
    actual, expected = contact.get('actualResolutionEnd'), contact.get('expectedResolutionEnd')
    if not actual or not expected or actual != expected:
        return False
    placement = {'id': 'armco', 's': 3618.585968309014, 'lateral': -28.3, 'heading': 1.5707963267948966, 'solid': True}
    piece = event.get('piece') or {}
    return (event['completedLaps'] == 0 and piece.get('name') == 'Long Left' and
            piece['s0'] <= event['s'] < piece['s1'] and 3330 <= event['s'] <= 3730 and
            event['event'].get('crash') == 'prop' and event.get('propIdentityVerified') is True and contact.get('verified') is True and
            prop.get('id') == 'kit-solid-1901-armco' and prop.get('kind') == 'prop' and prop.get('kitSolid') is True and prop.get('barrier') is True and
            prop.get('halfX') == 2 and prop.get('halfZ') == .4 and prop.get('authoredPlacement') == placement and detail['placement'] == placement)


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
        if final['laps'] != 2 or final['finished'] != 7 or not final['allDone'] or not player_crash_accepted(detail) or final['resets'] or final['firstLapPileUp']:
            raise ValueError('The actual two-lap field must satisfy the verified player exception and all original field guards')
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
    draw.text((16, 575), 'Native incidents: ' + '; '.join(row['quality'] + ': ' + ('one known Long Left armco player exception' if row['knownPlayerException'] else 'zero player crashes') + ', ' + str(len(row['observer']['cpuIncidents'])) + ' CPU incidents' for row in report['qualities']) + '. Counts are events, not unique cars; see receipt.', font=label, fill='#bdcec5')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in [88, 84, 80, 76, 72, 68, 64]:
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            print(str(args.output) + ': ' + str(args.output.stat().st_size) + ' bytes')
            return
    raise ValueError('Actual art sheet exceeds 500 KB')


if __name__ == '__main__':
    main()
