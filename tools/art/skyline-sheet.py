"""Compose the four R34 reference/model pairs, without image editing."""
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]).resolve()
if not out.is_relative_to(root / '.evidence'):
    raise ValueError('Read captures only from this lane evidence folder')
# Compare actual geometry to the supplied reference; resize only.
from PIL import Image, ImageDraw, ImageFont, ImageOps
reference = Path('C:/Users/kyleb/dev/art-library/nissan-skyline-gtr-r34/reference')
sheet = Image.new('RGB', (1280, 1510), '#e7e8e6')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
draw.text((16, 8), 'R34 shape - round 1 | Reference left | Code-built model right', fill='#182126', font=font)
draw.text((16, 36), 'Generated reference guides. Model rendered in Blender, not a game capture. No logos modelled.', fill='#182126', font=font)
for row, (name, ref) in enumerate([('front','front'),('rear','rear'),('side','left-side'),('three-quarter','three-quarter')]):
    y = 76 + row * 356
    for col, source in enumerate([reference / (ref+'.png'), out / (name+'.png')]):
        picture = ImageOps.contain(Image.open(source).convert('RGB'), (630, 322), Image.Resampling.LANCZOS)
        sheet.paste(picture, (col*640+(640-picture.width)//2,y+(322-picture.height)//2))
    draw.text((16,y+324),name.replace('-',' ').title(),fill='#182126',font=font)
destination = root / 'docs/board/looks/nissan-skyline-gtr-r34/round-1.jpg'
destination.parent.mkdir(parents=True, exist_ok=True)
for quality in [90,86,82,78,74,70]:
    sheet.save(destination,quality=quality,optimize=True)
    if destination.stat().st_size <= 500000: break
assert destination.stat().st_size <= 500000
print('Sheet:', destination, destination.stat().st_size)
