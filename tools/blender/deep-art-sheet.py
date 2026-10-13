"""Compose the one Deep art sheet from exact-GLB ACTUAL look-test captures.

The existing browser-harness photography recipe captures the actual water.
This file does no rendering, alteration, runtime integration or timing.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',required=True);p.add_argument('--evidence',required=True);a=p.parse_args()
root=Path(a.root).resolve();evidence=Path(a.evidence).resolve();receipt=json.loads((evidence/'deep-art-native.json').read_text());manifest=json.loads((root/'public/assets/models/deep/manifest.json').read_text());models={m['id']:m for m in manifest['models']}
if not receipt.get('actualLookTest') or not receipt.get('complete') or len(receipt['views'])!=18:raise RuntimeError('A complete actual look-test capture is required')
W,H=1800,2140;sheet=Image.new('RGB',(W,H),(10,22,27));d=ImageDraw.Draw(sheet);fonts=Path('C:/Windows/Fonts');title=ImageFont.truetype(str(fonts/'segoeuib.ttf'),30);head=ImageFont.truetype(str(fonts/'segoeuib.ttf'),24);small=ImageFont.truetype(str(fonts/'segoeui.ttf'),19)
d.text((26,18),'THE DEEP | ACTUAL LOOK-TEST WATER | ROUND 2 | 18 ROLES',font=title,fill=(234,218,168))
d.text((26,61),'Exact fitted GLBs; original High water, lights, shaders and post-processing. Photography only; no frame timing.',font=small,fill=(209,225,220))
d.text((26,90),'True metric model scale; cameras frame each subject. Silver school: 36-instance photography proof, no runtime install.',font=small,fill=(173,199,200))
for i,view in enumerate(receipt['views']):
    role=view['id'];m=models[role]
    if view['sha256']!=m['sha256']:raise RuntimeError('Stale captured model '+role)
    x=26+i%3*592;y=136+i//3*322;d.rounded_rectangle((x,y,x+570,y+308),radius=8,fill=(20,38,43));d.text((x+13,y+8),role,font=head,fill=(234,218,168))
    image=Image.open(evidence/view['photo']).convert('RGB');image=ImageOps.contain(image,(546,230));sheet.paste(image,(x+12+(546-image.width)//2,y+43))
    if view.get('detail'):
        detail=Image.open(evidence/view['detail']['photo']).convert('RGB');detail=ImageOps.contain(detail,(286,161))
        sheet.paste(detail,(x+570-detail.width-13,y+106));d.rectangle((x+270,y+249,x+558,y+272),fill=(10,22,27));d.text((x+282,y+250),'Hull breach / open hold detail',font=small,fill=(234,218,168))
    size=' x '.join(f'{v:.2f}' for v in m['dimensionsMetres']);d.text((x+13,y+276),f'{size} m | {m["triangles"]:,} tris | eye {view["cameraDepthMetres"]:.1f} m',font=small,fill=(201,221,215))
d.text((26,2082),'Claude round-two verdict pending. No race/saves/renderer installation or frame, balance, gameplay browser/full pass.',font=small,fill=(209,225,220))
destination=root/'docs/board/looks/deep-art/round-2.jpg'
for q in [87,83,79,75,71,67,63]:
    sheet.save(destination,quality=q,optimize=True)
    if destination.stat().st_size<=500000:break
if destination.stat().st_size>500000:raise RuntimeError('Sheet exceeds 500 KB')
print(json.dumps({'sheet':str(destination),'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}))
