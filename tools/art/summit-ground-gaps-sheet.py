"""Rebuild the compact five-view comparison from the manual browser recipe."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("evidence", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
views = ["15-foothills", "16-pine-entry", "17-switchbacks", "18-snowfields", "19-gallery"]
sheet = Image.new("RGB", (980, 1530), "#111b22")
draw = ImageDraw.Draw(sheet)
draw.text((12, 10), "SUMMIT GROUND GAPS | matching native road-level views | BEFORE / AFTER", fill="white")
for row, name in enumerate(views):
    for col, leg in enumerate(["before", "after"]):
        image = Image.open(args.evidence / f"{leg}-{name}.jpg").convert("RGB")
        image.thumbnail((480, 270))
        x, y = 5 + col * 490, 40 + row * 296
        sheet.paste(image, (x, y))
        draw.text((x + 5, y + 274), f"{name} | {leg}", fill="white")
args.output.parent.mkdir(parents=True, exist_ok=True)
for quality in [88, 82, 76, 70, 64]:
    sheet.save(args.output, quality=quality, optimize=True)
    if args.output.stat().st_size <= 500000:
        break
assert args.output.stat().st_size <= 500000
print(f"{args.output}: {args.output.stat().st_size} bytes")
