"""Make the round 3 town sheet with matched views and photo references."""
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--evidence',default='.evidence/2026-11-05/TOWN-ART-BASE/round-3');p.add_argument('--page',type=int,default=1);p.add_argument('--paths-only',action='store_true')
p.add_argument('--tin-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d503a008-f319-4f8c-8e2b-9e16908bde89.png');p.add_argument('--sand-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d7c1cbbb-f80e-4027-a01a-224d0467927c.png')
a=p.parse_args();root=Path(a.root).resolve();evidence=Path(a.evidence);evidence=evidence if evidence.is_absolute() else root/evidence;dest=root/'docs/board/looks/town-art-base/round-3.jpg'
if a.page!=1:p.error('town-sample fits on one page')
if a.paths_only:
    print(json.dumps({'blend':[],'glb':[],'evidence':[],'summary':[str(dest)]}));raise SystemExit(0)
W,H=1600,3250
sheet=Image.new('RGB',(W,H),(27,29,27));draw=ImageDraw.Draw(sheet)
fontdir=Path('C:/Windows/Fonts');title=ImageFont.truetype(str(fontdir/'segoeuib.ttf'),32);label=ImageFont.truetype(str(fontdir/'segoeuib.ttf'),23);body=ImageFont.truetype(str(fontdir/'segoeui.ttf'),18)
draw.text((32,18),'SCABLANDS TOWN | ROUND 3',font=title,fill=(239,226,201))
draw.text((32,62),'Photo-baked tin and sand | warm daylight | seeded roof and clutter variation',font=body,fill=(218,208,183))
rows=[('1 x 1 SHACK | ABOVE AND DRIVER SEAT',('shack-above-45.png','ABOVE 45 DEGREES'),('shack-driver-seat.png','DRIVER SEAT')),
      ('SAME ABOVE VIEW | OUR ROUND 2 BESIDE ROUND 3',('previous-round-2','OUR ROUND 2'),('shack-above-45.png','ROUND 3')),
      ('TIN TOWN | ACCEPTED ROUND 2 BESIDE THE NEW SHACK',('tintown','TIN TOWN ACCEPTED'),('shack-above-45.png','ROUND 3 ABOVE')),
      ('3 x 2 WORKSHOP | ABOVE AND DRIVER SEAT',('workshop-above-45.png','ABOVE 45 DEGREES'),('workshop-driver-seat.png','DRIVER SEAT'))]
panel_w,panel_h=748,464;top=108;row_h=500
for ri,(caption,left,right) in enumerate(rows):
    y=top+ri*row_h;draw.text((32,y),caption,font=label,fill=(231,189,126))
    for ci,panel_data in enumerate((left,right)):
        x=32+ci*768
        if panel_data[0]=='tintown':
            source=Image.open(root/'docs/board/looks/ww-art-tintown/round-2.jpg').convert('RGB')
            image=source.crop((120,640,520,840));view_label='TIN TOWN - ACCEPTED THREE QUARTER'
        elif panel_data[0]=='previous-round-2':
            source=Image.open(root/'docs/board/looks/town-art-base/round-2.jpg').convert('RGB')
            image=source.crop((28,170,752,410));view_label='OUR OWN ROUND 2 - ABOVE VIEW'
        else:
            filename,view_label=panel_data;image=Image.open(evidence/filename).convert('RGB')
        image=ImageOps.fit(image,(panel_w,panel_h),method=Image.Resampling.LANCZOS,centering=(.5,.52))
        sheet.paste(image,(x,y+34));draw.rectangle((x+8,y+42,x+320,y+72),fill=(20,22,20));draw.text((x+16,y+43),view_label,font=body,fill=(245,229,196))
y=top+4*row_h;draw.text((32,y),'STREET | SIX ROOFS, HEIGHTS, MATERIAL AND CLUTTER COMBINATIONS',font=label,fill=(231,189,126))
street=Image.open(evidence/'street-six-overhead.png').convert('RGB')
street=ImageOps.contain(street,(1484,850),method=Image.Resampling.LANCZOS)
sheet.paste(street,(32+(1484-street.width)//2,y+34))
draw.text((32,3020),'MATERIAL REFERENCES | CORRUGATED TIN AND COMPACTED SAND',font=label,fill=(231,189,126))
for x,source_path,caption in [(32,Path(a.tin_photo),'TIN PHOTO - 100 MM RIDGES'),(800,Path(a.sand_photo),'SAND PHOTO - 2 M TILE')]:
    photo=Image.open(source_path).convert('RGB');photo=ImageOps.fit(photo,(350,102),method=Image.Resampling.LANCZOS)
    draw.text((x,3055),caption,font=body,fill=(218,208,183));sheet.paste(photo,(x,3085))
draw.text((32,3210),'Scale grid: 8 m | person and actual Stuttgart 959 car | warm sun-bleached materials.',font=body,fill=(218,208,183))
dest.parent.mkdir(parents=True,exist_ok=True)
for quality in (76,72,68,64,60,58,56):
    sheet.save(dest,'JPEG',quality=quality,optimize=True,progressive=True)
    if dest.stat().st_size<=500_000:break
if dest.stat().st_size>500_000:raise RuntimeError(f'sheet is {dest.stat().st_size} bytes; limit 500 KB')
print(json.dumps({'sheet':str(dest),'bytes':dest.stat().st_size}))
