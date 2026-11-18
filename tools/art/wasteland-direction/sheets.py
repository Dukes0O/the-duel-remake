"""Arrange the matched offline captures and the separately credited editorial illustration."""
import argparse
from base64 import b64encode
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


PAPER = '#ebe7dc'
INK = '#202622'
MUTED = '#525b53'
ACCENT = '#e6ad58'
WIDTH = 1600
CELL = (752, 423)
LEFT, RIGHT = 32, 816


def font(size, bold=False):
    for face in (('DejaVuSans-Bold.ttf', 'arialbd.ttf') if bold else ('DejaVuSans.ttf', 'arial.ttf')):
        try:
            return ImageFont.truetype(face, size)
        except OSError:
            pass
    raise RuntimeError('Install DejaVu Sans or Arial to reproduce the review sheets.')


def label(draw, xy, text, size=19, bold=False, color=INK):
    draw.text(xy, text, font=font(size, bold), fill=color, anchor='lt')


def image_at(sheet, path, x, y, size):
    with Image.open(path) as source:
        picture = ImageOps.fit(source.convert('RGB'), size, method=Image.Resampling.LANCZOS)
    sheet.paste(picture, (x, y))


def header(sheet, title, subtitle):
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, WIDTH, 115), fill=INK)
    label(draw, (32, 18), 'THE WASTELAND    /    ART DIRECTION', 18, True, ACCENT)
    label(draw, (32, 47), title, 47, True, PAPER)
    label(draw, (WIDTH - 32 - draw.textlength(subtitle, font=font(19)), 63), subtitle, 19, False, PAPER)
    return draw


def save_sheet(sheet, path):
    for quality in (90, 86, 82, 78, 74, 70, 66):
        stream = BytesIO()
        sheet.save(stream, format='JPEG', quality=quality, optimize=True)
        if stream.tell() <= 500_000:
            path.write_bytes(stream.getvalue())
            return
    raise RuntimeError(f'Sheet exceeds 500 KB at quality 66: {path}')


def matches(evidence, dest):
    sheet = Image.new('RGB', (WIDTH, 1598), PAPER)
    draw = header(sheet, 'Big Bess at the south gate', 'Matched cameras    /    Blender Cycles')
    for y, left, right, ltitle, rtitle in (
        (168, 'stock-road', 'trial-road', 'Driving view   ·   Stock materials', 'Lamp spill, wheel wear and body masks'),
        (654, 'stock-cab', 'trial-cab', 'Parked beside the cab   ·   Stock materials', 'Same truck and camera, full trial'),
        (1140, 'stock-glass', 'paint-glass', 'Grazing view   ·   Stock glass', 'Body masks only, same lights and gravel'),
    ):
        label(draw, (LEFT, y - 35), ltitle, 22, True)
        label(draw, (RIGHT, y - 35), rtitle, 22, True)
        image_at(sheet, evidence / f'{left}.jpg', LEFT, y, CELL)
        image_at(sheet, evidence / f'{right}.jpg', RIGHT, y, CELL)
    label(draw, (32, 1573), 'Original game meshes. Camera through the gate uses a 55° vertical field of view. All six panels are offline renders.', 17, False, MUTED)
    save_sheet(sheet, dest / 'round-1.jpg')


def illustration(evidence, dest):
    sheet = Image.new('RGB', (WIDTH, 1440), PAPER)
    draw = header(sheet, 'Big Bess in the Story Wall', 'Generated illustration    /    Vehicle presentation')
    image_at(sheet, evidence / 'story-illustration.png', 0, 116, (1600, 900))
    label(draw, (LEFT, 1040), 'The source vehicle', 25, True)
    label(draw, (RIGHT, 1040), 'The playable asset', 25, True)
    side = Path('public/assets/models/wasteland/scablands/textures/big-bess-side.jpg')
    # Keep the full side profile. The colored band behind it is the image's studio background.
    with Image.open(side) as source:
        fit = ImageOps.contain(source.convert('RGB'), (752, 291), Image.Resampling.LANCZOS)
        draw.rectangle((LEFT, 1083, LEFT + 751, 1373), fill='#d5d4d5')
        sheet.paste(fit, (LEFT + (752 - fit.width) // 2, 1083))
    with Image.open(evidence / 'stock-cab.jpg') as source:
        model = ImageOps.contain(source.convert('RGB'), (752, 291), Image.Resampling.LANCZOS)
        draw.rectangle((RIGHT, 1083, RIGHT + 751, 1373), fill=INK)
        sheet.paste(model, (RIGHT + (752 - model.width) // 2, 1083))
    label(draw, (LEFT, 1390), 'Original November 11 image used to carve the truck.', 17, False, MUTED)
    label(draw, (RIGHT, 1390), 'Production GLB, staged in Blender beside the gate.', 17, False, MUTED)
    save_sheet(sheet, dest / 'round-2.jpg')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('evidence', type=Path)
    p.add_argument('destination', type=Path)
    p.add_argument('--round', type=int, choices=(1, 2))
    args = p.parse_args()
    args.destination.mkdir(exist_ok=True, parents=True)
    for number, draw_sheet in enumerate((matches, illustration), start=1):
        if args.round not in (None, number):
            continue
        # A clean checkout retains the chosen original illustration in the
        # round-2 sheet. Reuse it verbatim unless a new source still is present.
        reuse = (number == 2 and args.round is None
                 and not (args.evidence / 'story-illustration.png').is_file()
                 and (args.destination / 'round-2.jpg').is_file())
        if not reuse:
            draw_sheet(args.evidence, args.destination)

    if args.round is None:
        # A single-file copy can be downloaded directly from the cloud workspace.
        prototype = Path(__file__).with_name('plate.html').read_text(encoding='utf8')
        for number in (1, 2):
            name = f'round-{number}.jpg'
            image_bytes = (args.destination / name).read_bytes()
            inline = 'data:image/jpeg;base64,' + b64encode(image_bytes).decode('ascii')
            prototype = prototype.replace('../../../docs/board/looks/wasteland-art-direction/' + name, inline)
        (args.evidence / 'big-bess.html').write_text(prototype, encoding='utf8')
