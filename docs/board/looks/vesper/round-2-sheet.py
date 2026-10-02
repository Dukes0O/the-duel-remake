"""Build the Vesper review sheet from complete actual-game frames."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser()
parser.add_argument('--captures',type=Path,required=True)
parser.add_argument('--output',type=Path,default=Path(__file__).with_name('round-2.jpg'))
args=parser.parse_args()
def font(size,bold=False):
    p=Path('C:/Windows/Fonts')/('arialbd.ttf' if bold else 'arial.ttf')
    return ImageFont.truetype(str(p),size) if p.exists() else ImageFont.load_default(size=size)
rows=('front','side','back','overhead','walk');cell=(580,363);row_height=398;header=147
sheet=Image.new('RGB',(1200,header+len(rows)*row_height+28),(25,27,29));draw=ImageDraw.Draw(sheet)
draw.text((20,14),'Vesper Blackiron - costume materials, round two',font=font(27,True),fill=(245,241,226))
draw.text((20,53),'High on the left; Performance on the right. Original game world and lighting.',font=font(18),fill=(208,211,204))
draw.text((20,79),'Front, side, back: left to right Vesper, Nell, Odessa, Wren.',font=font(17),fill=(183,186,180))
draw.text((20,104),'Declared figure row and inspection poses; normal overhead and native walking below.',font=font(17),fill=(183,186,180))
for i,mode in enumerate(rows):
    y=header+i*row_height;draw.text((20,y),mode.title(),font=font(19,True),fill=(237,222,183))
    for x,quality in ((20,'high'),(610,'performance')):
        with Image.open(args.captures/f'vesper-{mode}-{quality}.png') as original:
            image=original.convert('RGB');image.thumbnail(cell,Image.Resampling.LANCZOS)
            sheet.paste(image,(x+(cell[0]-image.width)//2,y+28+(cell[1]-image.height)//2))
args.output.parent.mkdir(parents=True,exist_ok=True)
for quality in range(85,24,-5):
    sheet.save(args.output,'JPEG',quality=quality,optimize=True,progressive=True)
    if args.output.stat().st_size<=500000:break
if args.output.stat().st_size>500000:raise RuntimeError('Comparison exceeds 500 KB')
print(f'{args.output}: {args.output.stat().st_size} bytes, 1200 by {sheet.height}, JPEG quality {quality}')
