"""Assemble the base, selected painting and measured outlines at the fixed 16:9 camera.
python tools/art/story-plates/night-2-sheet.py EVIDENCE PLATE LANDMARKS SHEET
"""
import argparse
import csv
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence',type=Path)
parser.add_argument('plate',type=Path)
parser.add_argument('landmarks',type=Path)
parser.add_argument('sheet',type=Path)
parser.add_argument('--laptop',type=Path,help='Optional real native game capture from Claude for the reserved panel')
args=parser.parse_args()
native=(1920,1080)
base=Image.open(args.evidence/'base.png').convert('RGB')
plate=Image.open(args.plate).convert('RGB')
ids=np.load(args.evidence/'base-ids.npy',allow_pickle=False)
assert base.size==native and plate.size==native and ids.shape==(1080,1920)
field=np.asarray(Image.blend(plate,base,.32)).copy()
boundary=np.zeros_like(ids,dtype=bool)
boundary[1:]|=ids[1:]!=ids[:-1]
boundary[:-1]|=ids[:-1]!=ids[1:]
boundary[:,1:]|=ids[:,1:]!=ids[:,:-1]
boundary[:,:-1]|=ids[:,:-1]!=ids[:,1:]
field[boundary]=[57,242,233]
overlay=Image.fromarray(field)
pen=ImageDraw.Draw(overlay)
with args.landmarks.open(newline='') as f:
    rows=list(csv.DictReader(f))
def error(row):
    return math.hypot(float(row['plate_x'])-float(row['base_x']),float(row['plate_y'])-float(row['base_y']))
for row in rows:
    x,y=map(float,(row['base_x'],row['base_y']))
    a,b=map(float,(row['plate_x'],row['plate_y']))
    if error(row)>38.4:
        pen.line((x,y,a,b),fill='#fc7867',width=4)
        pen.ellipse((a-7,b-7,a+7,b+7),outline='#fc7867',width=3)
    else:
        pen.line((a-4,b,a+4,b),fill='#efaa51',width=2)
        pen.line((a,b-4,a,b+4),fill='#efaa51',width=2)
overlay.save(args.evidence/'overlay.png')

def font(size,bold=False):
    for file in (('DejaVuSans-Bold.ttf','arialbd.ttf') if bold else ('DejaVuSans.ttf','arial.ttf')):
        try: return ImageFont.truetype(file,size)
        except OSError: pass
    return ImageFont.load_default(size=size)

width,height=1800,1185
margin,gap=34,22
tile_w=(width-margin*2-gap)//2
tile_h=round(tile_w*9/16)
out=Image.new('RGB',(width,height),'#172127')
draw=ImageDraw.Draw(out)
draw.text((margin,19),'Night 2  /  Strangers at the gate',font=font(35,True),fill='#f1e9d8')
draw.text((width-margin,34),'TIN TOWN  ·  1.62 m EYE',font=font(15),anchor='ra',fill='#b4bec1')
laptop=Image.open(args.laptop).convert('RGB') if args.laptop else None
if laptop is not None and laptop.size!=native:
    raise ValueError('The matching live game capture must be 1920 by 1080.')
slots=[
  (margin,96,'Game geometry in Blender',base),
  (margin+tile_w+gap,96,'Painted plate',plate),
  (margin,646,'Base outlines over the painting',overlay),
  (margin+tile_w+gap,646,'Running game at the same camera',laptop)]
for x,y,title,picture in slots:
    draw.text((x,y-28),title,font=font(17,True),fill='#e5ded2')
    if picture is None:
        draw.rectangle((x,y,x+tile_w-1,y+tile_h-1),fill='#202c31',outline='#526167',width=1)
        draw.text((x+tile_w/2,y+tile_h/2),'Awaiting Claude’s laptop capture',font=font(20),anchor='mm',fill='#aab5b7')
    else:
        out.paste(picture.resize((tile_w,tile_h),Image.Resampling.LANCZOS),(x,y))
draw.text((margin,1152),'32% Blender over the painting. Cyan follows the rendered outlines. Ochre marks matched points on the painting.',font=font(15),fill='#b8c2c2')
args.sheet.parent.mkdir(parents=True,exist_ok=True)
for quality in range(94,57,-3):
    out.save(args.sheet,'JPEG',quality=quality,optimize=True,subsampling=0)
    if args.sheet.stat().st_size<=500000: break
else: raise ValueError('The comparison sheet exceeds 500 KB.')
print(f'{len(rows)} matched landmarks; maximum {max(map(error,rows)):.1f} px; {args.sheet.stat().st_size} bytes.')
