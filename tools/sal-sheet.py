"""Build one compact High/Performance Sal state review sheet."""
import argparse
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--root',required=True)
p.add_argument('--round',type=int,required=True)
p.add_argument('--evidence',required=True)
a=p.parse_args()
root=Path(a.root).resolve()
if a.round < 1 or a.round > 3:
    p.error('round must be from 1 to 3')
evidence=Path(a.evidence).resolve()
out=root/f'docs/board/looks/sal/round-{a.round}.jpg'
if not evidence.is_relative_to(root/'.evidence') or not out.is_relative_to(root/'docs/board/looks/sal'):
    p.error('Sal sheet paths must stay in their governed folders')

from PIL import Image, ImageDraw, ImageFont
states=['idle','spin-up','sparking','sparking-chase']
modes=['high','performance']
sheet=Image.new('RGB',(1600,790),'#171815')
draw=ImageDraw.Draw(sheet)
font=ImageFont.load_default(size=18)
title_font=ImageFont.load_default(size=22)
draw.text((18,12),f'SAWTOOTH SAL · BANSHEE SIDE-SAW RIG · ROUND {a.round}',fill='#f0dfba',font=title_font)
for row,mode in enumerate(modes):
    for column,state in enumerate(states):
        path=evidence/f'{mode}-{state}.png'
        image=Image.open(path).convert('RGB')
        image=image.crop((250,110,min(image.width,1040),min(image.height,610)))
        image.thumbnail((375,325))
        x=15+column*395+(375-image.width)//2
        y=45+row*365+(325-image.height)//2
        sheet.paste(image,(x,y))
        label='SPARK PEAK · CHASE' if state=='sparking-chase' else state.upper()
        draw.text((15+column*395,375+row*365),f'{mode.upper()} · {label}',fill='#f0dfba',font=font)
out.parent.mkdir(parents=True,exist_ok=True)
sheet.save(out,quality=76,optimize=True,progressive=True)
if out.stat().st_size > 500_000:
    p.error(f'sheet exceeds 500 KB: {out.stat().st_size}')
print(out,out.stat().st_size)
