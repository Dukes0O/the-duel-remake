"""Compose recorded evidence only. No new dependencies; Blender supplies NumPy."""
import argparse
import json
import hashlib
import struct
import sys
import zlib
from pathlib import Path
import bpy
import numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--manifest',required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root=Path(args.root)
manifest=json.loads(Path(args.manifest).read_text())
for path, expected in manifest.get('sources', {}).items():
    if hashlib.sha256((root/path).read_bytes()).hexdigest() != expected:
        raise ValueError('Evidence source changed: ' + path)
if manifest.get('round') and Path(args.output).exists():
    raise ValueError('Fidelity round PNG is immutable')
tile_w,tile_h=256,320
header,row_label=48,28
width=tile_w*4
height=header+len(manifest['rows'])*(tile_h+row_label)
canvas=np.full((height,width,3),24,dtype=np.uint8)
# Small deterministic bitmap labels avoid font/platform differences.
letters={
'A':['01110','10001','10001','11111','10001','10001','10001'],
'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01110'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['111','010','010','010','010','010','111'],
'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','11011','10001'],
'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['010','110','010','010','010','010','111'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'5':['11111','10000','10000','11110','00001','00001','11110'],
'.':['0','0','0','0','0','1','1'],
'-':['000','000','000','111','000','000','000'],
' ':['000']*7,
}
def label(text,x,y,scale=2):
    for char in text.upper():
        glyph=letters.get(char,letters[' '])
        for gy,line in enumerate(glyph):
            for gx,pixel in enumerate(line):
                if pixel=='1':
                    canvas[y+gy*scale:y+(gy+1)*scale,x+gx*scale:x+(gx+1)*scale]=225
        x+=(len(glyph[0])+1)*scale

def picture(path,crop=None):
    image=bpy.data.images.load(str(root/path),check_existing=False)
    w,h=image.size
    pixels=np.empty(w*h*4,dtype=np.float32)
    image.pixels.foreach_get(pixels)
    image_data=np.clip(pixels.reshape(h,w,4)[::-1,:,:3]*255+.5,0,255).astype(np.uint8)
    bpy.data.images.remove(image)
    if crop:
        left,top,right,bottom=crop
        if not (0 <= left < right <= w and 0 <= top < bottom <= h):
            raise ValueError('Reference crop leaves the source image')
        image_data=image_data[top:bottom,left:right]
    h,w=image_data.shape[:2]
    scale=min(tile_w/w,tile_h/h)
    new_w,new_h=round(w*scale),round(h*scale)
    # Nearest sampling keeps the recorded pixels unretouched; all sources are
    # scaled uniformly and padded, never stretched to mimic the reference.
    return image_data[(np.arange(new_h)/scale).astype(int)[:,None],
                      (np.arange(new_w)/scale).astype(int)[None,:]]

for column,name in enumerate(['Reference','Blender','High','Performance']):
    label(name,column*tile_w+12,15)
for index,row in enumerate(manifest['rows']):
    y=header+index*(tile_h+row_label)
    label((row.get('crew','')+' '+row['clip']+' '+row['view']+' '+str(row['time'])+' S').strip(),12,y+7)
    for column,key in enumerate(['reference','blender','high','performance']):
        image=picture(row[key],row['crop'] if key=='reference' else None)
        h,w=image.shape[:2]
        x=column*tile_w+(tile_w-w)//2
        top=y+row_label+(tile_h-h)//2
        canvas[top:top+h,x:x+w]=image

def chunk(name,data):
    return struct.pack('!I',len(data))+name+data+struct.pack('!I',zlib.crc32(name+data)&0xffffffff)
raw=b''.join(b'\x00'+row.tobytes() for row in canvas)
png=b'\x89PNG\r\n\x1a\n'
png+=chunk(b'IHDR',struct.pack('!2I5B',width,height,8,2,0,0,0))
png+=chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
with Path(args.output).open('xb' if manifest.get('round') else 'wb') as output:
    output.write(png)
print('Composed recorded PNG evidence:',args.output)