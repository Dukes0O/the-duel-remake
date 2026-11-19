"""Lay out the offline figure review. Input frames are the full 1280 by 720 JPEGs.
python tools/art/story-people-sheet.py EVIDENCE_DIR OUTPUT.jpg [--previous PRIOR_DIR]
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('folder', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--previous', type=Path)
args = parser.parse_args()
background,white,muted,accent = '#242321','#f6efe3','#c3bbae','#dfb382'
margin, gap, width = 28, 16, 660
total = margin*2 + width*2 + gap
resampling = Image.Resampling.LANCZOS

def font(size, bold=False):
    families = (('DejaVuSans-Bold.ttf','arialbd.ttf','LiberationSans-Bold.ttf') if bold
                else ('DejaVuSans.ttf','arial.ttf','LiberationSans-Regular.ttf'))
    for family in families:
        try:
            return ImageFont.truetype(family,size)
        except OSError:
            continue
    return ImageFont.load_default()

def load(folder,name):
    return Image.open(folder/(name+'.jpg')).convert('RGB')

def pair(images, labels, crop=False):
    global y
    text_size = 17 if crop else 19
    for col,(img,label) in enumerate(zip(images,labels)):
        x=margin+col*(width+gap)
        draw.text((x,y),label,fill=muted if crop else white,font=font(text_size,not crop))
        if crop:
            left=(img.width-width)//2
            img=img.crop((left,314,left+width,423))
        else:
            img=img.resize((width,round(width*9/16)),resampling)
        sheet.paste(img,(x,y+30))
    y+=30+img.height+23

sheet=Image.new('RGB',(total,2000),background)
draw=ImageDraw.Draw(sheet)
draw.text((margin,18),'The Walkers at Tin Town',fill=white,font=font(34,True))
draw.text((margin,64),'STORY-PEOPLE  /  EXPORTED GAME FIGURES  /  OFFLINE BLENDER REVIEW',fill=accent,font=font(15,True))
y=106
if args.previous:
    for name,label in [('travellers','Rell, Dace and Wim'),('actions','Running, pushing and resting')]:
        pair([load(args.previous,name),load(args.folder,name)],[label+'  ·  previous',label+'  ·  revised'])
else:
    common=[load(args.folder,'current-20m'),load(args.folder,'gate-walkers-20m')]
    pair(common,['Existing procedural on-foot fallback, staged at the gate','Photographed gate company, same arrangement'])
    pair(common,['Native pixels  ·  centre of the original 1280 × 720 view',
                 '20 m to Rell  ·  1.62 m eye height  ·  72° vertical field'],True)
    pair([load(args.folder,'travellers'),load(args.folder,'gate-talk')],
         ['Rell, Dace and Wim','Speaking and listening, player eye height'])
    if (args.folder/'at-rest.jpg').exists():
        pair([load(args.folder,'actions'),load(args.folder,'at-rest')],
             ['Dace running, a working cart and the resting poses','Rell by the embers, Wim beside Auntie’s stool'])
    else:
        x=margin
        draw.text((x,y),'Running, pushing, sitting and sleeping',fill=white,font=font(19,True))
        img=load(args.folder,'actions').resize((width,round(width*9/16)),resampling)
        sheet.paste(img,(x,y+30))
        y+=30+img.height+23
sheet=sheet.crop((0,0,total,y))
args.output.parent.mkdir(parents=True,exist_ok=True)
for quality in [87,83,79,74]:
    sheet.save(args.output,optimize=True,quality=quality,progressive=True)
    if args.output.stat().st_size <= 500_000: break
else:
    raise SystemExit('Review image exceeds 500 KB')
