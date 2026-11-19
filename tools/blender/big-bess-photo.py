"""Big Bess, an old gas tanker truck, carved from four photos (BIG-BESS-PHOTO trial, 11 November 2026).

    blender -b --python-exit-code 1 --python tools/blender/big-bess-photo.py -- --root .

Game metres, +Y up, +Z forward, +X the truck's left, stored at true size (K = 1). The origin is on the ground at the
middle of the truck's length. Pixels were read from zoomed tools/photo_grid.py style grids over each photo. The truck is
8.0 m from bumper to tail; its height and width follow from that by the method in docs/ART_LINE.md ("Choosing a
vehicle's size").
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/big-bess.glb'
evidence = root / '.evidence/2026-11-11/BIG-BESS-PHOTO'
blend = root / 'art-build/scablands/big-bess.blend'
masks = evidence / 'masks'
textures = root / 'public/assets/models/wasteland/scablands/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(masks)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Mesh as PhotoMesh, Photo, lathe
from hull_model import tyre
from photo_carve import carve_object

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)

# Side photo, 1400 x 700: the bumper's front face is at x 30, the rear step's end at x 1356, the tyres' bottom at y 653
# and the valve wheel on top of the dome at y 91. The truck is 8.0 m from bumper to tail, which sets the scale.
SIDE_START, SIDE_END, SIDE_GROUND, SIDE_TOP = 30, 1356, 653, 91
LENGTH = 8.0
S = LENGTH / (SIDE_END - SIDE_START)           # metres per side-photo pixel, 6.03 mm
HEIGHT = (SIDE_GROUND - SIDE_TOP) * S          # 3.39 m to the top of the valve wheel
# Front photo, 820 x 749: tyres' bottom at y 722, valve wheel top at y 12, bumper from x 117 to x 702 (centre 409.5).
FRONT_S = HEIGHT / (722 - 12)
WIDTH = (702 - 117) * FRONT_S                  # 2.80 m, bumper to bumper; the rear photo's outer tyres read 2.76 m
# Rear photo, 820 x 749: tyres' bottom at y 702, valve wheel top at y 26, outer tyres' edges x 132 and x 682.
REAR_S = HEIGHT / (702 - 26)
# Tyres: radius 92 px on the side photo. The front tyre's inner face is at x 215 on the front photo (centre 409), the
# rear axles' outer tyre of each twin pair at x 212 on the rear photo (centre 408).
WHEEL_R = 92 * S                               # 0.555 m
WHEEL_PX = (287, 968, 1160)                    # wheel centres on the side photo, all at y 561
WHEEL_Z = tuple(LENGTH / 2 - (px - SIDE_START) * S for px in WHEEL_PX)
WHEEL_INNER = ((409 - 215) * FRONT_S, (408 - 212) * REAR_S, (408 - 212) * REAR_S)
HALF_TYRE = .21                                # a tyre is 0.42 m wide
SPLIT_PX = 420                                 # the gap between the cab's back and the tank's nose on the side photo
SPLIT_Z = LENGTH / 2 - (SPLIT_PX - SIDE_START) * S


# Front photo rectangles (x0, y0, x1, y1) of the tank, ladder, mirrors and bumper bar that stand beside or above the cab.
FRONT_TRIM = [(0, 0, 820, 180), (0, 180, 250, 335), (568, 180, 820, 335), (0, 335, 226, 500), (594, 335, 820, 500)]


def cab_only(x, y, z):
    col, row = 409 + x / FRONT_S, 722 - y / FRONT_S
    outside = np.zeros(x.shape, dtype=bool)
    for x0, y0, x1, y1 in FRONT_TRIM:
        outside |= (col >= x0) & (col < x1) & (row >= y0) & (row < y1)
    return ~((z > SPLIT_Z) & outside)


def blender(point):
    """A game point in metres to stored Blender coordinates."""
    return (point[0], -point[2], point[1])


def side_px(z, y):
    return SIDE_START + (LENGTH / 2 - z) / S, SIDE_GROUND - y / S


table = {
    'photos': {'side': 'big-bess-side.jpg', 'front': 'big-bess-front.jpg', 'rear': 'big-bess-rear.jpg',
               'top': 'big-bess-top.jpg'},
    'length': LENGTH, 'width': WIDTH + .2, 'height': HEIGHT,
    'side': {'start': SIDE_START, 'end': SIDE_END, 'ground': SIDE_GROUND},
    'front': {'centre': 409, 'ground': 722, 'top': 12},
    'rear': {'centre': 408, 'ground': 702, 'top': 26},
    # Top photo, 443 x 886: bumper bar's front at y 18, the frame's rear edge at y 826, centre line x 221.
    'top': {'front': 18, 'rear': 826, 'centre': 221},
    'wheels': [(z, WHEEL_R, inner) for z, inner in zip(WHEEL_Z, WHEEL_INNER)],
    'underside': .36,
    # The front photo shows the tank and ladder behind and beside the cab, which would make the cab as wide as the
    # tank. The cab and what is ahead of it keep the front photo; everything behind the split keeps the rear photo.
    # Ahead of the split, 'keep' also trims what stands outside the cab (FRONT_TRIM), so the front photo itself stays
    # whole and the tank's nose can wear its real picture.
    'ends_split': SPLIT_Z, 'keep': cab_only,
    # The exhaust stack, the rear draw pipe and its valve stand on a different side in different photos, so they are
    # cut from every mask and built on their own below.
    'cut': {'side': [(403, 100, 470, 200), (403, 200, 448, 441),
                     (1228, 140, 1300, 188), (1252, 188, 1264, 200), (1264, 188, 1277, 212), (1277, 188, 1290, 234),
                     (1290, 188, 1300, 288), (1300, 140, 1380, 445),
                     # Background the subject walls in: under the running boards, beside the stack, at the tail.
                     (405, 577, 858, 620), (448, 405, 472, 441), (1299, 510, 1321, 549), (1255, 396, 1279, 438),
                     (1232, 423, 1252, 437), (55, 445, 69, 484)],
            # The ladder's two hoops stand outside the tank's outline in the rear photo; each strip stops at the outline.
            'rear': [(0, 100, 300, 124), (0, 124, 272, 134), (0, 134, 250, 148), (0, 148, 228, 162), (0, 162, 208, 176)]},
    'forward': 1, 'side_front_on_left': True,
    'grey': 26, 'tolerance': 42, 'bleed_tolerance': 50,
    'mask_dir': str(masks), 'voxel': .03, 'target': 9000,
}
truck = bpy.data.objects.new('Big Bess gas truck', None)
bpy.context.collection.objects.link(truck)


def mirrored(source, target):
    """A left-right copy of a photo. The kit's top-photo lookup runs the other way for a vehicle facing +Z (checked on the
    ladder, which stands on the left in the overhead photo and landed on the right of the carve)."""
    image = bpy.data.images.load(str(source))
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    flipped = bpy.data.images.new('big-bess-top-flipped', width, height, alpha=False)
    flipped.pixels.foreach_set(pixels.reshape(height, width, 4)[:, ::-1, :].ravel())
    flipped.filepath_raw = str(target)
    flipped.file_format = 'JPEG'
    flipped.save()
    bpy.data.images.remove(flipped)
    bpy.data.images.remove(image)


# The carve works from its own copies of the four photos, with the overhead one turned round.
carve_photos = evidence / 'carve-photos'
carve_photos.mkdir(parents=True, exist_ok=True)
for key, file in table['photos'].items():
    if key == 'top':
        mirrored(textures / file, carve_photos / file)
    else:
        (carve_photos / file).write_bytes((textures / file).read_bytes())
body = carve_object('Big Bess carved body', carve_photos, table)
body.parent = truck
photos = table['_photos']
photo_materials = {key: photo.material() for key, photo in photos.items()}
# The carve paints over the background and the cut places in its own copy of the side photo, so the pipes, which are
# built from the side photo after the cuts, wear a fresh copy.
side_fresh = Photo(textures / 'big-bess-side.jpg')
fresh_material = side_fresh.material()

# Six wheels, each wearing the side photo's wheel and the rear photo's tread. The rear photo shows twin tyres on the
# two rear axles; the side photo shows single ones, so each rear axle gets one tyre a side, in the outer place.
for index, (z, px, inner) in enumerate(zip(WHEEL_Z, WHEEL_PX, WHEEL_INNER), 1):
    for side in (1, -1):
        wheel = PhotoMesh()
        tyre(wheel, 'side', photos['side'], px, 561, 92, WHEEL_R, HALF_TYRE,
             'front', photos['rear'], 172, 40, 620, 695, sides=24)
        obj = wheel.finish(f'Big Bess wheel {index} {"left" if side > 0 else "right"}',
                           {'side': photo_materials['side'], 'front': photo_materials['rear']})
        obj.parent = truck
        obj.location = blender((side * (inner + HALF_TYRE), WHEEL_R, z))


def sweep(name, x, path, sides=10):
    """A round pipe along a path read off the side photo, standing at `x`, wearing the side photo.

    `path` is [((side px, side py), radius in side pixels)], and lies in the truck's length-and-height plane.
    """
    mesh = PhotoMesh()
    rings = []
    points = []
    for (px, py), radius in path:
        points.append((LENGTH / 2 - (px - SIDE_START) * S, (SIDE_GROUND - py) * S, radius * S))
    for i, (z, y, radius) in enumerate(points):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        tangent = Vector((0, b[1] - a[1], b[0] - a[0]))
        tangent.normalize()
        across = Vector((1, 0, 0))
        up = tangent.cross(across)
        up.normalize()
        ring = []
        for k in range(sides):
            angle = 2 * math.pi * k / sides
            offset = across * math.cos(angle) + up * math.sin(angle)
            point = Vector((x, y, z)) + offset * radius
            # Sampled inside the pipe's outline, so its sides do not wear the pale fringe of the photo's edge.
            inner = Vector((x, y, z)) + offset * radius * .5
            uv = side_fresh.uv(*side_px(inner.z, inner.y))
            ring.append((mesh.vertex(point), uv, offset))
        rings.append(ring)
    for level in range(len(rings) - 1):
        for k in range(sides):
            a, ua, oa = rings[level][k]
            b, ub, ob = rings[level][(k + 1) % sides]
            c, uc, _ = rings[level + 1][(k + 1) % sides]
            d, ud, _ = rings[level + 1][k]
            mesh.indexed((a, b, c, d), (ua, ub, uc, ud), 'side', oa + ob, True)
    obj = mesh.finish(name, {'side': fresh_material})
    obj.parent = truck
    return obj


def disc(name, x, centre_px, radius_px, thickness):
    """A flat round part facing the truck's left, wearing the side photo's picture of it."""
    mesh = PhotoMesh()
    cx, cy = centre_px
    z, y = LENGTH / 2 - (cx - SIDE_START) * S, (SIDE_GROUND - cy) * S

    def face(angle, fraction):
        return side_fresh.uv(cx + math.cos(angle) * radius_px * fraction, cy - math.sin(angle) * radius_px * fraction)

    lathe(mesh, 'side', (x, y, z), (1, 0, 0), (0, 0, -1), (0, 1, 0),
          [(-thickness / 2, radius_px * S), (thickness / 2, radius_px * S)],
          lambda index, distance, radius, angle: face(angle, 1), sides=24,
          cap_start=('side', face), cap_end=('side', face))
    obj = mesh.finish(name, {'side': fresh_material})
    obj.parent = truck
    return obj


# The exhaust stack behind the cab: the side photo has it on the truck's left, the front and top photos have it on the
# centre line. It is built on the left, where the side photo (the view most players see) puts it. The lower pipe below
# the frame's top stays painted on the body.
STACK_X = .98
sweep('Big Bess exhaust stack', STACK_X,
      [((421, 441), 9), ((421, 395), 10), ((424, 390), 19), ((424, 200), 19), ((422, 196), 11), ((422, 170), 10),
       ((424, 152), 9), ((431, 138), 9), ((443, 128), 9), ((458, 121), 9)], sides=12)

# The rear draw pipe, valve and hose: at the tail on the centre line in the rear and top photos, at the truck's left
# in the front photo; the side photo shows it past the tail. Built on the centre line.
sweep('Big Bess draw pipe', 0,
      [((1241, 182), 8), ((1241, 163), 8), ((1248, 155), 8), ((1264, 153), 8), ((1300, 152), 8), ((1322, 155), 8),
       ((1334, 164), 8), ((1337, 180), 8), ((1337, 245), 8), ((1339, 262), 9), ((1341, 332), 10), ((1342, 345), 13),
       ((1342, 395), 13), ((1339, 422), 13), ((1328, 440), 13), ((1308, 449), 13)])
disc('Big Bess valve wheel', 0, (1346, 291), 26, .05)

bpy.context.view_layer.update()
bounds = [[min(c[i] for o in truck.children_recursive if o.type == 'MESH' for c in (o.matrix_world @ v.co for v in o.data.vertices)),
           max(c[i] for o in truck.children_recursive if o.type == 'MESH' for c in (o.matrix_world @ v.co for v in o.data.vertices))]
          for i in range(3)]
print('big bess stored bounds, Blender XYZ:', json.dumps([[round(v, 3) for v in pair] for pair in bounds]))
print('scale m/px', S, 'height', HEIGHT, 'width', WIDTH, 'wheel z', WHEEL_Z, 'inner', WHEEL_INNER, 'split z', SPLIT_Z)
if bounds[2][0] < -.05 or bounds[2][0] > .05:
    raise RuntimeError(f'the truck does not stand on the ground: {bounds[2]}')
body_bounds = [[min((body.matrix_world @ v.co)[i] for v in body.data.vertices), max((body.matrix_world @ v.co)[i] for v in body.data.vertices)] for i in range(3)]
print('body bounds, Blender XYZ:', json.dumps([[round(v, 3) for v in pair] for pair in body_bounds]), 'triangles', sum(len(p.vertices) - 2 for p in body.data.polygons))

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for obj in bpy.data.objects:
    obj.select_set(obj is truck or obj in truck.children_recursive)
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_extras=True, use_selection=True,
                          export_image_format='JPEG', export_image_quality=84)
if glb.stat().st_size > 1_500_000:
    raise RuntimeError(f'GLB budget exceeded: {glb.stat().st_size}')
print(json.dumps({'glb': str(glb), 'bytes': glb.stat().st_size}))
