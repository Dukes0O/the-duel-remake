"""Make the compact reference/Blender/game kit fidelity sheet."""
import argparse
import json
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--root',required=True)
p.add_argument('--round',type=int,required=True)
p.add_argument('--blender',required=True)
p.add_argument('--high',required=True)
p.add_argument('--performance',required=True)
p.add_argument('--paths-only',action='store_true')
a=p.parse_args()
root=Path(a.root).resolve()
out=root/f'docs/board/looks/kits/round-{a.round}.jpg'
if a.round<1 or not out.is_relative_to(root/'docs/board/looks/kits'):
    p.error('round sheet must be under docs/board/looks/kits')
if a.paths_only:
    print(json.dumps({'blend':[],'glb':[],'evidence':[],'summary':[str(out)]}))
    raise SystemExit(0)
if out.exists():
    p.error(f'completed round sheet already exists: {out}')

from PIL import Image, ImageDraw
reference=Image.open(root/'public/assets/reference/wasteland-art-direction.png').convert('RGB')
reference=reference.crop((0,0,min(reference.width,1100),min(reference.height,350)))
blender=Image.open(a.blender).convert('RGB')
games=[]
for path in [a.high,a.performance]:
    im=Image.open(path).convert('RGB')
    games.append(im.crop((300,240,min(im.width,940),min(im.height,580))))
sheet=Image.new('RGB',(1600,335),'#e8e5df')
draw=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate(zip(['Reference: top panel','Blender: real car + kit',
                                  'Game: High','Game: Performance'],
                                 [reference,blender,*games])):
    im.thumbnail((390,285))
    x=i*400+(400-im.width)//2
    y=35+(285-im.height)//2
    sheet.paste(im,(x,y))
    draw.text((i*400+10,8),label,fill='#1d2426')
out.parent.mkdir(parents=True,exist_ok=True)
sheet.save(out,quality=78,optimize=True)
print(out,out.stat().st_size)
