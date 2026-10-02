"""Rebuild the actual-game Salt comparison. Resize complete frames; do not edit their content."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser()
parser.add_argument('--before', type=Path, required=True)
parser.add_argument('--after', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path(__file__).with_name('round-2.jpg'))
args=parser.parse_args()
font_home=Path('C:/Windows/Fonts')
def font(size,bold=False):
    path=font_home/('arialbd.ttf' if bold else 'arial.ttf')
    return ImageFont.truetype(str(path),size) if path.exists() else ImageFont.load_default(size=size)
rows=[]
for quality in ('high','performance'):
    for view in ('full','racing'):
        name=f'{quality}-salt-flats-{view}.png'
        rows.append((f'{quality.title()}: {view} - generated round one / round two',args.before/name,args.after/name))
for quality in ('high','performance'):
    for view in ('near','full'):
        rows.append((f'{quality.title()}: {view} - Scrapdome / Salt Flats',args.after/f'{quality}-scrapdome-{view}.png',args.after/f'{quality}-salt-flats-{view}.png'))
for quality in ('high','performance'):
    rows.append((f'{quality.title()}: heat at 10 / 10.5 seconds',args.after/f'{quality}-salt-flats-heat-10.png',args.after/f'{quality}-salt-flats-heat-10-5.png'))
width=1200; cell=(580,363); row_height=397; header=120
sheet=Image.new('RGB',(width,header+row_height*len(rows)+36),(25,27,29))
draw=ImageDraw.Draw(sheet)
draw.text((20,15),'Salt Flats - stronger salt materials, round two',font=font(26,True),fill=(245,241,226))
draw.text((20,52),'Same native geometry; complete game frames at both qualities.',font=font(19),fill=(210,211,204))
draw.text((20,78),'Private venue fixture. Public entry held; stills do not establish motion or sound.',font=font(17),fill=(183,186,180))
for row,(label,left,right) in enumerate(rows):
    top=header+row*row_height
    draw.text((20,top),label,font=font(19,True),fill=(237,222,183))
    for x,file in ((20,left),(610,right)):
        with Image.open(file) as original:
            image=original.convert('RGB');image.thumbnail(cell,Image.Resampling.LANCZOS)
            sheet.paste(image,(x+(cell[0]-image.width)//2,top+28+(cell[1]-image.height)//2))
args.output.parent.mkdir(parents=True,exist_ok=True)
for quality in range(85,24,-5):
    sheet.save(args.output,'JPEG',quality=quality,optimize=True,progressive=True)
    if args.output.stat().st_size<=500000: break
if args.output.stat().st_size>500000: raise RuntimeError('Comparison exceeds the 500 KB sheet limit')
print(f'{args.output}: {args.output.stat().st_size} bytes, {width} by {sheet.height}, JPEG quality {quality}')
