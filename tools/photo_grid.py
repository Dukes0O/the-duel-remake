"""Draw a measuring grid over a photo, so its numbers are read and not guessed.

    python tools/photo_grid.py photo.jpg out.png [step]

Lines every `step` pixels (100 by default), labelled in the photo's own pixels,
with fainter lines at a fifth of that. Keep the output in `.evidence`.
"""
import sys

from PIL import Image, ImageDraw


def grid(path, out, step=100):
    image = Image.open(path).convert('RGB')
    width, height = image.size
    scale = 1400 / width if width > 1400 else 1
    shown = image.resize((int(width * scale), int(height * scale)))
    draw = ImageDraw.Draw(shown)
    fine = max(step // 5, 1)
    for x in range(0, width, fine):
        major = x % step == 0
        draw.line([(x * scale, 0), (x * scale, shown.height)], fill=(0, 220, 255) if major else (0, 110, 130))
        if major:
            draw.text((x * scale + 2, 2), str(x), fill=(255, 255, 0))
    for y in range(0, height, fine):
        major = y % step == 0
        draw.line([(0, y * scale), (shown.width, y * scale)], fill=(0, 220, 255) if major else (0, 110, 130))
        if major:
            draw.text((2, y * scale + 2), str(y), fill=(255, 255, 0))
    shown.save(out)


if __name__ == '__main__':
    grid(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 100)
