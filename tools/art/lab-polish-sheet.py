"""LAB-POLISH: resize all sixteen unedited player views into one review JPG.
python tools/art/lab-polish-sheet.py <scenario output folder> <sheet.jpg>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

LESSONS = ['lift', 'projectile', 'fire', 'pendulum', 'altitude', 'strength',
           'rust', 'gforce', 'headings', 'grip', 'downforce', 'braking',
           'suspension', 'fuel', 'launch', 'wax']


def main(folder, output):
    folder, output = Path(folder), Path(output)
    width, height = 480, 300
    sheet = Image.new('RGB', (width * 4, height * 4 + 32), '#101516')
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('arial.ttf', 16)
    except OSError:
        font = ImageFont.load_default()
    draw.text((10, 7), 'LAB-POLISH | all 16 player bench views | 1440 x 900 | High', font=font, fill='white')
    for i, lesson in enumerate(LESSONS):
        x, y = i % 4 * width, 32 + i // 4 * height
        view = Image.open(folder / f'bench-{lesson}.png').convert('RGB')
        view.thumbnail((width, height - 24), Image.Resampling.LANCZOS)
        sheet.paste(view, (x, y))
        draw.text((x + 8, y + height - 22), lesson, font=font, fill='white')
    output.parent.mkdir(parents=True, exist_ok=True)
    for quality in range(90, 29, -5):
        sheet.save(output, 'JPEG', quality=quality, optimize=True)
        if output.stat().st_size <= 500000:
            print(f'{output}: {output.stat().st_size} bytes')
            return
    raise SystemExit('Sheet exceeds 500 KB')


if __name__ == '__main__':
    main(*sys.argv[1:])
