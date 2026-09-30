"""Source-choice layout only: existing game captures, original previews and a source-skin render."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
p=argparse.ArgumentParser()
p.add_argument('--library',default='C:/Users/kyleb/dev/art-library')
p.add_argument('--evidence',required=True)
p.add_argument('--output',required=True)
a=p.parse_args();base=Path(a.library);e=Path(a.evidence)
sheet=Image.new('RGB',(1800,1660),(25,28,28));d=ImageDraw.Draw(sheet)
fonts=Path('C:/Windows/Fonts')
title=ImageFont.truetype(str(fonts/'segoeuib.ttf'),31)
heading=ImageFont.truetype(str(fonts/'segoeuib.ttf'),24)
font=ImageFont.truetype(str(fonts/'segoeui.ttf'),22)
small=ImageFont.truetype(str(fonts/'segoeui.ttf'),20)
cream=(240,225,190);white=(230,232,227);muted=(175,187,183);warn=(240,179,115)
def lines(x,y,items,f=font,color=white,step=31):
    for i,t in enumerate(items):d.text((x,y+i*step),t,font=f,fill=color)
def place(path,box,crop=None):
    im=Image.open(path).convert('RGB')
    if crop:im=im.crop(crop)
    x,y,w,h=box;im=ImageOps.contain(im,(w,h))
    sheet.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2))
d.text((32,20),'WOMEN CREW SOURCES | STOP AT CHOICE | 30 SEP 2026',font=title,fill=cream)
d.text((32,66),'Two downloaded CC0 candidates; requested Modular Women remains unverified and on hold.',font=font,fill=white)
d.rounded_rectangle((28,112,1772,548),radius=12,fill=(40,44,44))
for i,(crew,tris) in enumerate([('nell','5,380'),('odessa','4,876'),('wren','5,560')]):
    x=45+i*255
    d.text((x,126),'CURRENT '+crew.upper(),font=heading,fill=cream)
    place(e/('current/current-'+crew+'.png'),(x,164,225,310))
    d.text((x,491),tris+' tris | one draw',font=small,fill=muted)
lines(836,130,['Settled silhouettes stay the target:','Nell: compact goggles; rust-red utility harness.','Odessa: older mechanic; rolled sleeves; tool belt.','Wren: cropped sand jacket; light packs; trail boots.'],f=heading,step=43)
lines(836,328,['Vesper Blackiron is a woman, revealed by WAR-04.','Her runtime figure is not present in this baseline.','No source shown below is fitted or installed.','Current images use production GLBs and renderer;','neutral private pose fixture and memory-only saves.'],f=small,step=34)
cards=[(28,'A | UNIVERSAL BASE STANDARD'),(617,'B | KENNEY SURVIVORS'),(1206,'ON HOLD | MODULAR WOMEN')]
for x,label in cards:
    d.rounded_rectangle((x,574,x+566,1450),radius=12,fill=(40,44,44))
    d.text((x+17,590),label,font=heading,fill=warn if x==1206 else cream)
place(base/'quaternius-universal-base-characters-standard/Preview.jpg',(44,634,534,375),crop=(300,185,936,776))
place(base/'quaternius-universal-base-characters-standard/Preview.jpg',(44,1018,534,98),crop=(575,790,1430,926))
place(e/'sources/kenney-female-source.png',(634,634,532,482))
place(base/'quaternius-modular-women/Preview.jpg',(1222,634,532,310))
lines(1223,964,['Official preview only.','No model or embedded licence downloaded.'],color=warn)
lines(45,1134,['Embedded CC0 licence verified; free $0 archive.','Female + eyes + brows: 15,060 triangles.','65 bones; no embedded animation actions.','Four inspected hair parts: 830–3,284 tris.','Better face/body detail; no crew garments.','Needs major LOD and a licensed action source.','Paid Source edition and its bodies excluded.'],f=small,step=40)
lines(634,1134,['Embedded CC0 licence verified; cached original.','Shared body with supplied female skin.','1,604 triangles; 58 bones; three motion clips.','Idle / jump / run, plus targeting-pose tracks.','No Nell / Odessa / Wren outfit silhouettes.','Cartoon head and body fail the settled tone.','Other required actions and rig mapping unproven.'],f=small,step=40)
lines(1223,1091,['Pack page says CC0; general page says QAL.','Actual licence / FBX access: quota blocked.','10 outfits / 24 actions are advertised only.','Actual triangles, bones and actions unknown.','Shared rig with selected men is unverified.','Workwear may help, but not usable yet.','Revisit only with licence and model access.'],f=small,step=44)
d.rounded_rectangle((28,1472,1772,1613),radius=12,fill=(55,51,42))
lines(48,1488,['RECOMMENDATION: KEEP CURRENT WOMEN FOR NOW.',
 'Neither verified source supplies the settled costumes and all actions. Standard is the better anatomy lead,',
 'but needs existing garment/action sources. Do not start fitting or ship a placeholder. Kyle chooses the next step.'],f=heading,step=39)
d.text((32,1630),'Source previews retain original palettes. Source choice is not a shipped-art score or a rights clearance for the held pack.',font=small,fill=muted)
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
for quality in [88,84,80,76,72,68]:
    sheet.save(out,quality=quality,optimize=True)
    if out.stat().st_size<=500000:break
if out.stat().st_size>500000:raise RuntimeError('Comparison exceeds 500 KB')
print(str(out),out.stat().st_size,'bytes')
