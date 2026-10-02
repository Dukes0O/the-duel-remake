"""Round 2: arrange unmodified actual App captures; no recolor/crop/compositing art."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont
p=argparse.ArgumentParser();p.add_argument('--captures',required=True);p.add_argument('--output',required=True);a=p.parse_args()
base=Path(a.captures);out=Path(a.output)
rows=[]
for quality in ['high','performance']:
    for distance in ['near','racing']:
        rows.append([(f'tanker-source-{distance}-{quality}',f'{quality} {distance}: SOURCE PALETTE'),(f'tanker-candidate-{distance}-{quality}',f'{quality} {distance}: FITTED GRIT')])
for quality in ['high','performance']:
    rows.append([(f'tanker-all-three-broken-{quality}',f'{quality}: ALL THREE BROKEN / lamps on'),(f'tanker-recovered-{quality}',f'{quality}: RECOVERED / lamps off')])
for quality in ['high','performance']:
    rows.append([(f'tanker-opposite-valve-{quality}',f'{quality}: native opposite valve / flange'),(f'tanker-roof-plate-{quality}',f'{quality}: raised boarding plate')])
rows.append([('tanker-source-and-fit-high','High: source left / fitted right'),('tanker-source-and-fit-performance','Performance: source left / fitted right')])
w=600;h=375;label=28
sheet=Image.new('RGB',(w*2,80+(h+label)*len(rows)),(20,24,24));d=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
d.text((12,10),'ART-FIT-TANKER | ROUND 2 | ACTUAL SCRAPDOME YARD',font=font,fill='white')
d.text((12,36),'Source a1ce674 | candidate a3ed6fa8 | Claude review pending; private art, no gameplay/frame clearance',font=font,fill='#d9c89d')
for ri,row in enumerate(rows):
    for ci,(name,title) in enumerate(row):
        y=80+ri*(h+label);x=ci*w
        d.text((x+8,y+4),title,font=font,fill='white')
        im=Image.open(base/(name+'.png')).convert('RGB');im.thumbnail((w,h),Image.Resampling.LANCZOS)
        sheet.paste(im,(x,y+label))
for quality in [70,60,50,40,30,20]:
    sheet.save(out,'JPEG',quality=quality,optimize=True)
    if out.stat().st_size<=500000:break
if out.stat().st_size>500000:raise RuntimeError('Comparison sheet exceeds 500 KB')
print(out, out.stat().st_size, 'JPEG quality', quality, 'size', sheet.size)
