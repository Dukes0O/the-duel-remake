"""Extract Tin Town's two crushed cars and their baked photos for the Nest's single wreck draw.

Run with Python and Pillow from any directory. The source is town-services.py's shipped GLB.
The small geometry table lets buildRatsNest keep its synchronous layout and budget contract.
"""
import io
import json
import math
import struct
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'src/world/open/looks'
source = (ROOT / 'public/assets/models/wasteland/town/services.glb').read_bytes()
size, = struct.unpack_from('<I', source, 12)
scene = json.loads(source[20:20 + size])
binary = memoryview(source)[28 + size:]


def view_bytes(index):
    view = scene['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def rows(index):
    entry = scene['accessors'][index]
    component = {5123: 'H', 5126: 'f'}[entry['componentType']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[entry['type']]
    return struct.iter_unpack('<' + component * width, view_bytes(entry['bufferView']))


# At the Nest gate the player also sees the end of the scrapyard extrusion.
# The Rattler's photographed grille and tailgate supply the salvaged fascia there.
atlas = Image.new('RGB', (1024, 1536))
photos = ROOT / 'public/assets/models/wasteland/cars/textures'
for col, (face, crop) in enumerate([('front', (311, 545, 1008, 982)), ('rear', (155, 495, 1246, 859))]):
    photo = Image.open(photos / f'rattler-{face}.jpg').crop(crop)
    photo = ImageEnhance.Brightness(photo).enhance(.70)
    atlas.paste(photo.resize((512, 512), Image.Resampling.LANCZOS), (col * 512, 1024))

wrecks = {}
for row, paint in enumerate(('red', 'brown')):
    mesh = next(m for m in scene['meshes'] if m['name'] == 'scrapyard:car-source-' + paint)
    positions, coordinates, indices, vertices = [], [], [], {}
    for part in mesh['primitives']:
        material = scene['materials'][part['material']]
        col = ['side', 'top'].index(material['name'].split('-')[-1])
        texture = material['pbrMetallicRoughness']['baseColorTexture']['index']
        photo = scene['images'][scene['textures'][texture]['source']]
        image = Image.open(io.BytesIO(view_bytes(photo['bufferView'])))
        atlas.paste(image.resize((512, 512), Image.Resampling.LANCZOS), (512 * col, 512 * row))
        points = list(rows(part['attributes']['POSITION']))
        uv = list(rows(part['attributes']['TEXCOORD_0']))
        corners = [i for i, in rows(part['indices'])]
        for i in range(0, len(corners), 3):
            triangle = corners[i:i+3]
            a, b, c = (points[k] for k in triangle)
            bx, by, bz = (b[k]-a[k] for k in range(3))
            cx, cy, cz = (c[k]-a[k] for k in range(3))
            nx, ny, nz = by*cz-bz*cy, bz*cx-bx*cz, bx*cy-by*cx
            for k in triangle:
                x, y, z = points[k]
                u, v = uv[k]
                tile_x, tile_y = col, row
                if col == 0 and abs(nz) < .1 * math.hypot(nx, ny):
                    # A squashed shell's exposed cross-sections cannot wear a
                    # single edge pixel stretched from one side to the other.
                    if abs(x) > 1.5 and abs(nx) > abs(ny) * .55:
                        tile_x, tile_y = int(x > 0), 2
                        u, v = .5 + z/1.84, .97 - min(max((y-.08)/.54, 0), 1)*.93
                    else:
                        tile_x = 1
                        u, v = .5 + x/4.35, .5 + z/2.06
                # Tuck the two ends in like the bonnet in the plan photograph.
                width = 1 - .18 * max(0, (abs(x)-1.55)/.55)
                vertex = tuple(round(n, 5) for n in (-z*width, y, x, (tile_x+u)/2, (tile_y+v)/3))
                if vertex not in vertices:
                    vertices[vertex] = len(positions) // 3
                    positions.extend(vertex[:3])
                    coordinates.extend(vertex[3:])
                indices.append(vertices[vertex])
    wrecks[paint] = dict(positions=positions, uv=coordinates, indices=indices)
(OUTPUT / 'rats-nest-wrecks.json').write_text(json.dumps(wrecks, separators=(',', ':')) + '\n')
atlas.save(ROOT / 'public/assets/textures/rats-nest-wrecks.jpg', quality=88, optimize=True)
