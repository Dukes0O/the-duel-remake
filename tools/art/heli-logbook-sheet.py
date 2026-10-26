"""Compose a paint round's native game-renderer pictures, without painting over them.

python tools/art/heli-logbook-sheet.py <browser evidence> <round-N.jpg> [round]
The same central 960x600 region is cropped for every view. Both native
qualities and distances are kept, alongside the current stock helicopter.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder, out = Path(sys.argv[1]), Path(sys.argv[2])
round_number = int(sys.argv[3]) if len(sys.argv)>3 else 1
paints = [('stock','Current stock'),('rank-student','Student: white / training orange'),
          ('rank-private','Private: midnight / silver'),('rank-commercial','Commercial: forest / cream / kestrel'),
          ('rank-mountain','Mountain: rescue red / reflective bands'),('rank-chief','Chief: Gus cream / signal red / kestrel')]
columns = [('high','near'),('high','distance'),('performance','near'),('performance','distance')]
tile=(400,250); label=28; header=64
sheet=Image.new('RGB',(tile[0]*4,header+(tile[1]+label)*6),(24,27,29))
draw=ImageDraw.Draw(sheet)
try:
    font=ImageFont.truetype('arial.ttf',15); title=ImageFont.truetype('arial.ttf',24)
except OSError: font=title=ImageFont.load_default()
draw.text((12,8),f'HELI-LOGBOOK | ROUND {round_number} | 26 October 2026 | For Claude',font=title,fill=(235,228,211))
draw.text((12,39),'Current Kestrel One in the game renderer. Same pad. Near = 24 deg lens; distance = native 55 deg lens. No timing.',font=font,fill=(198,204,203))
for row,(ident,name) in enumerate(paints):
    for col,(quality,distance) in enumerate(columns):
        x=col*tile[0]; y=header+row*(tile[1]+label)
        path=folder/f'{ident}-{quality}-{distance}.png'
        image=Image.open(path).convert('RGB')
        image=image.crop((240,150,1200,750)).resize(tile,Image.Resampling.LANCZOS)
        sheet.paste(image,(x,y+label))
        draw.text((x+7,y+5),f'{name} | {quality} {distance}',font=font,fill=(225,221,205))
out.parent.mkdir(parents=True,exist_ok=True)
for quality in range(92,30,-3):
    sheet.save(out,quality=quality,optimize=True)
    if out.stat().st_size<=500_000: break
assert out.stat().st_size<=500_000
print(f'{out}: {out.stat().st_size} bytes; JPEG quality {quality}')
