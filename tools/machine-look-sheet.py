"""Assemble the comparison sheet for the road machines or the drill rig from pictures taken in the real game.

    python tools/machine-look-sheet.py roads <prefix> <round>
    python tools/machine-look-sheet.py drill <prefix> <round>

The pictures are the ones a hand play leaves in `.evidence/hand-drive/` (tools/hand-drive.mjs): `before-*.jpg` from the
game as it was, and `<prefix>-*.jpg` from the game as it is. No art is made here. The sheet is written to
`docs/board/looks/machine-roads/` or `docs/board/looks/machine-drill/` as `round-<round>.jpg`, 500 KB at most.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.evidence/hand-drive'
FONT = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
WIDTH, GAP, TITLE, CAPTION = 1480, 8, 34, 24

# Each row: a heading, then tiles of (picture, caption). A name starting with '=' is used as it is; any other name
# has the round's prefix put before it.
SHEETS = {
    'roads': ('machine-roads', 'The road machines and the ground they work', [
        ('Before: the game as merged on 14 November', [
            ('=before-roller-near', 'The roller: a box and a drum'),
            ('=before-paver-30m', 'Roller and paver from 30 m'),
            ('=before-dozer-cab', 'The dozer from its seat: no blade'),
            ('=before-ground-loose', 'After a full dozer pass: nothing shows')]),
        ('After, from 30 m', [
            ('dozer-30m', 'Dozer (picture narrowed)'), ('roller-30m', 'Roller (picture narrowed)'), ('paver-30m', 'Paver (picture narrowed)'),
            ('ground-all-low', 'The worked stretch')]),
        ('After, from the driver\'s seat, working', [
            ('dozer-seat-cut', 'Dozer: blade down, cutting'), ('roller-seat-rolling', 'Roller: drum on the fill'),
            ('paver-seat-slow', 'Paver: hopper ahead, steady pace'), ('paver-chase-fast', 'Paver from behind: screed down')]),
        ('After, beside the machine', [
            ('dozer-side-cut', 'Blade down, earth rolling ahead'), ('dozer-side-spread', 'Blade half up, spreading'),
            ('roller-side', 'Roller on rolled ground'), ('paver-side-working', 'Paver laying')]),
        ('The ground: one pass of the roller, six passes, and the whole stretch from above', [
            ('ground-loose-above', 'Loose fill as the dozer leaves it'), ('ground-pass1-above', 'One pass'),
            ('ground-firm-above', 'Six passes: firm'), ('ground-all-above', 'All six states in one stretch')]),
        ('Each state from standing height', [
            ('ground-close-23', 'Cut by the blade'), ('ground-close-38', 'Loose fill'), ('ground-close-36', 'Rolled firm'),
            ('ground-close-31', 'Paved'), ('ground-close-42', 'Bad: paved on soft fill'),
            ('ground-close-17', 'Bad: paved too fast')]),
    ]),
    'drill': ('machine-drill', 'The drill rig, what comes up, the water and the wellhead', [
        ('Before: the game as merged on 14 November', [
            ('=before-drill-near', 'The rig: the trencher with a ladder'), ('=before-drill-30m', 'From 30 m'),
            ('=before-drill-work', 'Drilling: one plain heap'), ('=before-drill-well', 'Water and the wellhead')]),
        ('After: the rig', [
            ('drill-side-travel', 'Mast laid down to travel'), ('drill-30m-travel', 'From 30 m'),
            ('drill-side-work', 'Mast standing over the hole'), ('drill-30m-work', 'From 30 m, drilling')]),
        ('After, from the driller\'s place and from behind', [
            ('drill-chase-mast-rising', 'Tab: the mast rises'), ('drill-seat-clay', 'In clay'),
            ('drill-seat-rock', 'In rock'), ('drill-seat-jammed', 'Fed too hard: the bit jams')]),
        ('What comes up: one sample pile for each metre', [
            ('drill-samples-gravel', 'Clay, then gravel'), ('drill-samples-low', 'The row at water'),
            ('drill-samples-above', 'Read from above'), ('drill-chase-water-10s', 'From behind, ten seconds after water')]),
        ('Water arriving', [
            ('drill-seat-water-1s', 'One second'), ('drill-water-side', 'From the side'),
            ('drill-seat-water-4s', 'Four seconds'), ('drill-chase-mast-laid', 'Mast laid down again')]),
        ('The wellhead left behind', [
            ('drill-chase-leaving', 'Driving on'), ('well-close', 'The head'), ('well-side', 'From the side'),
            ('well-30m', 'From 30 m')]),
    ]),
}


def build(kind, prefix, round_number, allow_missing=False):
    folder, heading, rows = SHEETS[kind]
    height = 64 + sum(TITLE + CAPTION + GAP + round((WIDTH - GAP * (len(tiles) + 1)) / len(tiles) * 9 / 16) for _, tiles in rows) + GAP
    sheet = Image.new('RGB', (WIDTH, height), '#23221f')
    draw = ImageDraw.Draw(sheet)
    draw.text((GAP + 4, 10), heading, font=FONT, fill='#edc557')
    draw.text((GAP + 4, 38), 'Pictures from the real game, played by hand in a visible window. Round %s.' % round_number, font=SMALL, fill='#d8d2c0')
    y, missing = 64, []
    for title, tiles in rows:
        draw.text((GAP + 4, y + 6), title, font=FONT, fill='#f5f0dc')
        y += TITLE
        tile_width = round((WIDTH - GAP * (len(tiles) + 1)) / len(tiles))
        tile_height = round(tile_width * 9 / 16)
        for index, (name, caption) in enumerate(tiles):
            x = GAP + index * (tile_width + GAP)
            path = SOURCE / (name[1:] + '.jpg' if name.startswith('=') else '%s-%s.jpg' % (prefix, name))
            draw.text((x + 2, y + 2), caption, font=SMALL, fill='#d8d2c0')
            if path.exists():
                with Image.open(path) as picture:
                    sheet.paste(ImageOps.fit(picture.convert('RGB'), (tile_width, tile_height)), (x, y + CAPTION))
            else:
                missing.append(path.name)
                draw.rectangle((x, y + CAPTION, x + tile_width, y + CAPTION + tile_height), fill='#3a3833')
                draw.text((x + 10, y + CAPTION + 10), 'no picture: ' + path.name, font=SMALL, fill='#c96a4a')
        y += CAPTION + tile_height + GAP
    if missing and not allow_missing:
        raise SystemExit('Missing pictures: ' + ', '.join(missing))
    target = ROOT / 'docs/board/looks' / folder / ('round-%s.jpg' % round_number)
    target.parent.mkdir(parents=True, exist_ok=True)
    for quality in (82, 76, 70, 64, 58, 52):
        sheet.save(target, quality=quality, optimize=True)
        if target.stat().st_size <= 500_000:
            break
    assert target.stat().st_size <= 500_000, 'the sheet is over 500 KB'
    print('%s: %d bytes, quality %d%s' % (target, target.stat().st_size, quality, ', missing ' + ', '.join(missing) if missing else ''))


if __name__ == '__main__':
    arguments = [value for value in sys.argv[1:] if value != '--allow-missing']
    build(arguments[0], arguments[1], arguments[2], allow_missing='--allow-missing' in sys.argv)
