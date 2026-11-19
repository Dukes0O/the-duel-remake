"""Old Smoke's furnace, carved from four photos (EVERBURN-FURNACE-LOOK round 3).

    blender -b --python-exit-code 1 --python tools/blender/old-smoke-photo.py -- --root .

The numbers below are game metres: +Y up, +Z forward, +X the furnace's left, the flank doors' middle at Z = -1 and
the rear door at Z = -4.2, where the chase's rules put them. The game draws the model one and a half times its
stored size, so everything is stored at K = 1/1.5. Pixels were read from tools/photo_grid.py grids over each photo.
The fire, smoke, sparks and firelight are drawn by the game (src/world/scrap-look.js), not stored here.
"""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/old-smoke.glb'
blend = root / 'art-build/scablands/old-smoke.blend'
masks = root / '.evidence/old-smoke-masks'
textures = root / 'public/assets/models/wasteland/scablands/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(masks)]}))
    raise SystemExit(0)

import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Mesh as PhotoMesh
from hull_model import tyre
from photo_carve import carve_object

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)

K = 1 / 1.5
# Side photo, 1400 x 700: ram tip at x 30, tail at x 1348, ground at y 665. The flank door's middle is at x 944 and
# the tail is 404 pixels behind it; the rules put those 3.2 m apart, which sets the scale.
SIDE_START, SIDE_END, SIDE_GROUND = 30, 1348, 665
S = 3.2 / 404                                  # metres per side-photo pixel
LENGTH = (SIDE_END - SIDE_START) * S           # 10.44 m
Z_FRONT = -1 + (944 - SIDE_START) * S          # the ram's tip
Z_SHIFT = Z_FRONT - LENGTH / 2                 # the carve is centred on its own length
HEIGHT = (SIDE_GROUND - 72) * S                # to the top of the dome's valve, 4.70 m
# Rear photo, 820 x 749: ground at y 722, valve top at y 50, armour skirts from x 108 to x 712.
REAR_S = HEIGHT / (722 - 50)
WIDTH = (712 - 108) * REAR_S                   # 4.19 m
WHEEL_R = 85 * S
WHEEL_Z = tuple(Z_FRONT - (px - SIDE_START) * S for px in (350, 952, 1172))
WHEEL_INNER = (410 - 205) * REAR_S
WHEEL_X = WHEEL_INNER + .30


def blender(point):
    """A game point in metres to stored Blender coordinates."""
    return (point[0] * K, -point[2] * K, point[1] * K)


def side_px(z, y):
    return SIDE_START + (Z_FRONT - z) / S, SIDE_GROUND - y / S


table = {
    'photos': {'side': 'old-smoke-side.jpg', 'front': 'old-smoke-front.jpg', 'rear': 'old-smoke-rear.jpg',
               'top': 'old-smoke-top.jpg'},
    'length': LENGTH * K, 'width': (WIDTH + .15) * K, 'height': HEIGHT * K,
    'side': {'start': SIDE_START, 'end': SIDE_END, 'ground': SIDE_GROUND},
    'front': {'centre': 410, 'ground': 722, 'top': 85},
    'rear': {'centre': 410, 'ground': 722, 'top': 50},
    # The overhead photo shows its tyres 267 pixels apart where the rear photo shows the skirts 4.19 m apart.
    'top': {'front': 28, 'rear': 845, 'centre': 220, 'x_scale': WIDTH * K / 267},
    'wheels': [((z - Z_SHIFT) * K, WHEEL_R * K, WHEEL_INNER * K) for z in WHEEL_Z],
    'underside': .32 * K,
    # The chimney stands on a different side in each photo, so it is cut from every mask and built on its own.
    'cut': {'side': [(0, SIDE_GROUND, 1400, 700), (470, 0, 585, 205)],
            'front': [(0, 722, 820, 749), (355, 0, 432, 172), (395, 0, 465, 80)],
            'rear': [(0, 722, 820, 749), (222, 0, 340, 150)]},
    'forward': 1, 'side_front_on_left': True,
    'grey': 26, 'tolerance': 42, 'bleed_tolerance': 50,
    'mask_dir': str(masks), 'voxel': .03, 'target': 9000,
}
furnace = bpy.data.objects.new("Old Smoke's rolling furnace", None)
bpy.context.collection.objects.link(furnace)
body = carve_object('Furnace carved body', textures, table)
body.parent = furnace
body.location = blender((0, 0, Z_SHIFT))
photos = table['_photos']
photo_materials = {key: photo.material() for key, photo in photos.items()}


def plain(name, colour, emission=0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*colour, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Metallic'].default_value = 0
    shader.inputs['Roughness'].default_value = .9
    if emission:
        shader.inputs['Emission Color'].default_value = (*colour, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return material


glow = plain('Vent glow look', (.95, .19, .025), 2.0)
iron = plain('Fire door iron', (.02, .018, .016))


def box(name, low, high, material, uv=None, parent=furnace):
    """A box between two game corners. `uv(x, y, z)` gives each corner its place in a photo."""
    xs, ys, zs = (low[0], high[0]), (low[1], high[1]), (low[2], high[2])
    corners = [(xs[i], ys[j], zs[k]) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    at = lambda i, j, k: i * 4 + j * 2 + k
    faces = [(at(1, 0, 0), at(1, 1, 0), at(1, 1, 1), at(1, 0, 1)), (at(0, 0, 0), at(0, 0, 1), at(0, 1, 1), at(0, 1, 0)),
             (at(0, 1, 0), at(0, 1, 1), at(1, 1, 1), at(1, 1, 0)), (at(0, 0, 0), at(1, 0, 0), at(1, 0, 1), at(0, 0, 1)),
             (at(0, 0, 1), at(1, 0, 1), at(1, 1, 1), at(0, 1, 1)), (at(0, 0, 0), at(0, 1, 0), at(1, 1, 0), at(1, 0, 0))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([blender(corner) for corner in corners], [], faces)
    layer = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            corner = corners[mesh.loops[loop_index].vertex_index]
            layer.data[loop_index].uv = uv(*corner) if uv else (0, 0)
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


# Six wheels, each wearing the side photo's wheel and the rear photo's tread.
for index, (z, px) in enumerate(zip(WHEEL_Z, (350, 952, 1172)), 1):
    for side in (1, -1):
        wheel = PhotoMesh()
        tyre(wheel, 'side', photos['side'], px, 583, 85, WHEEL_R * K, .30 * K,
             'front', photos['rear'], 162, 42, 645, 718, sides=16)
        obj = wheel.finish(f'Furnace wheel {index} {"left" if side > 0 else "right"}',
                           {'side': photo_materials['side'], 'front': photo_materials['rear']})
        obj.parent = furnace
        obj.location = blender((side * WHEEL_X, WHEEL_R, z))

# The chimney: a leaning tube on the furnace's left, wearing the side photo's chimney.
CHIMNEY_X, RINGS = 1.1, 10
path = [(side_point, radius) for side_point, radius in (((530, 232), .25), ((526, 170), .24), ((523, 110), .23),
                                                        ((540, 62), .23), ((560, 36), .26), ((568, 26), .30))]
import math
verts, faces, uvs = [], [], []
for (px, py), radius in path:
    z, y = Z_FRONT - (px - SIDE_START) * S, (SIDE_GROUND - py) * S
    for ring in range(RINGS):
        angle = ring * 2 * math.pi / RINGS
        point = (CHIMNEY_X + math.cos(angle) * radius, y, z + math.sin(angle) * radius)
        verts.append(blender(point))
        uvs.append(photos['side'].uv(*side_px(point[2], point[1])))
for level in range(len(path) - 1):
    for ring in range(RINGS):
        a, b = level * RINGS + ring, level * RINGS + (ring + 1) % RINGS
        faces.append((a, a + RINGS, b + RINGS, b))
mesh = bpy.data.meshes.new('Crooked furnace chimney')
mesh.from_pydata(verts, [], faces)
layer = mesh.uv_layers.new(name='UVMap')
for polygon in mesh.polygons:
    polygon.use_smooth = True
    for loop_index in polygon.loop_indices:
        layer.data[loop_index].uv = uvs[mesh.loops[loop_index].vertex_index]
mesh.materials.append(photo_materials['side'])
mesh.update()
chimney = bpy.data.objects.new('Crooked furnace chimney', mesh)
bpy.context.collection.objects.link(chimney)
chimney.parent = furnace
box('Chimney dark mouth', (CHIMNEY_X - .2, 5.0, 1.72), (CHIMNEY_X + .2, 5.04, 2.1), iron)

# The fire behind each door: three lights a door, which the game shows only while that door glows, with the door's
# bars standing in front of them. The names are the ones the game looks for.
FLANK_X = (410 - 135) * REAR_S + .03            # just proud of the firebox flank
DOOR_Y = ((SIDE_GROUND - 440) * S + .06, (SIDE_GROUND - 320) * S - .06)
for side in (1, -1):
    for index, z in enumerate((-1.56, -1.0, -.44), 1):
        light = box(f'Flank vent {side} {index} ember', (min(side * FLANK_X, side * (FLANK_X + .03)), DOOR_Y[0], z - .25),
                    (max(side * FLANK_X, side * (FLANK_X + .03)), DOOR_Y[1], z + .25), glow)
        if index == 2:
            for bar_z in (-1.84, -1.28, -.72, -.16):
                box('Flank door bar', (min(side * (FLANK_X + .03), side * (FLANK_X + .07)), DOOR_Y[0] - .05, bar_z - .04),
                    (max(side * (FLANK_X + .03), side * (FLANK_X + .07)), DOOR_Y[1] + .05, bar_z + .04), iron, parent=light)
            for bar_y in (DOOR_Y[0] + .28, DOOR_Y[1] - .28):
                box('Flank door bar', (min(side * (FLANK_X + .03), side * (FLANK_X + .07)), bar_y - .03, -1.84),
                    (max(side * (FLANK_X + .03), side * (FLANK_X + .07)), bar_y + .03, -.16), iron, parent=light)
REAR_Z = Z_FRONT - (1322 - SIDE_START) * S - .03
REAR_Y = ((722 - 470) * REAR_S + .06, (722 - 335) * REAR_S - .06)
for index, x in enumerate((-.58, 0, .58), 1):
    light = box(f'old-smoke-vent-{index}-glow', (x - .26, REAR_Y[0], REAR_Z - .03), (x + .26, REAR_Y[1], REAR_Z), glow)
    if index == 2:
        for bar_x in (-.87, -.29, .29, .87):
            box('Rear door bar', (bar_x - .04, REAR_Y[0] - .05, REAR_Z - .07), (bar_x + .04, REAR_Y[1] + .05, REAR_Z - .03), iron, parent=light)
        for bar_y in (REAR_Y[0] + .28, REAR_Y[1] - .28):
            box('Rear door bar', (-.87, bar_y - .03, REAR_Z - .07), (.87, bar_y + .03, REAR_Z - .03), iron, parent=light)

# Six armour shields, two lost with each hit. Each wears a piece of the photos' ochre skirt.
def side_crop(z0, z1, y0, y1, px0, px1, py0, py1):
    return lambda x, y, z: photos['side'].uv(px0 + (px1 - px0) * (z0 - z) / (z0 - z1), py1 - (py1 - py0) * (y - y0) / (y1 - y0))


def rear_crop(x0, x1, y0, y1, px0, px1, py0, py1):
    return lambda x, y, z: photos['rear'].uv(px0 + (px1 - px0) * (x - x0) / (x1 - x0), py1 - (py1 - py0) * (y - y0) / (y1 - y0))


SHIELD_Y = (1.78, 2.86)
for side in (1, -1):
    near, far = sorted((side * (FLANK_X + .02), side * (FLANK_X + .10)))
    # Both wear the skirt between the front and middle wheels, the only stretch with no tyre in it.
    box('Furnace side armor', (near, SHIELD_Y[0], .10), (far, SHIELD_Y[1], 1.50), photo_materials['side'],
        side_crop(1.50, .10, *SHIELD_Y, 505, 665, 482, 586))
    box('Hanging torn furnace plate', (near, SHIELD_Y[0], -3.62), (far, SHIELD_Y[1], -2.12), photo_materials['side'],
        side_crop(-2.12, -3.62, *SHIELD_Y, 665, 835, 482, 586))
    low, high = sorted((side * .98, side * 1.90))
    box('Furnace torn corner plate', (low, 1.66, REAR_Z - .11), (high, 2.96, REAR_Z - .03), photo_materials['rear'],
        rear_crop(low, high, 1.66, 2.96, 125, 330, 505, 612))

bpy.context.view_layer.update()
bounds = [[min(c[i] for o in furnace.children_recursive if o.type == 'MESH' for c in (o.matrix_world @ v.co for v in o.data.vertices)),
           max(c[i] for o in furnace.children_recursive if o.type == 'MESH' for c in (o.matrix_world @ v.co for v in o.data.vertices))]
          for i in range(3)]
print('old smoke stored bounds, Blender XYZ:', json.dumps([[round(v, 3) for v in pair] for pair in bounds]))
if bounds[2][0] < -.05 or bounds[2][0] > .05:
    raise RuntimeError(f'the furnace does not stand on the ground: {bounds[2]}')

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for obj in bpy.data.objects:
    obj.select_set(obj is furnace or obj in furnace.children_recursive)
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_extras=True, use_selection=True,
                          export_image_format='JPEG', export_image_quality=84)
if glb.stat().st_size > 1_500_000:
    raise RuntimeError(f'GLB budget exceeded: {glb.stat().st_size}')
print(json.dumps({'glb': str(glb), 'bytes': glb.stat().st_size}))
