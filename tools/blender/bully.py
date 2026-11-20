"""The Bully: a short school bus, cut down and armoured, with a plough (CAR-ART-BULLY, 19 November 2026).

    blender -b --python-exit-code 1 --python tools/blender/bully.py -- --root . [--round 7]
    python tools/blender/bully.py --root . --assemble-sheet <plan.json>      (Pillow; run by the first command)

The body is one solid carved from four dead-on photos with `carve_object`. The wheels, the plough, its push
arms, the headlamps and the stop paddle are their own pieces, each wearing its own photo, and each moving part
has its origin on its pivot. Game metres, +Y up, +Z forward, +X the driver's left, stored at true size. The
origin is on the ground at the middle of the whole length, plough included, so the shared socket layout
(`src/vehicle-sockets.js`) fits it without a change to the model.

Every pixel number below was read from `tools/photo_grid.py` style grids over the photos, which are in
`public/assets/models/wasteland/cars/textures/` (credits beside them).
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--round', type=int, default=0, help='render the review views of this round from the exported file')
parser.add_argument('--assemble-sheet', default='')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/cars/bully.glb'
textures = root / 'public/assets/models/wasteland/cars/textures'
evidence = root / '.evidence/2026-11-19/CAR-ART-BULLY'
sheet = root / f'docs/board/looks/car-art-bully/round-{args.round}.jpg'
if args.paths_only:
    # No .blend is kept (AGENTS: commit the recipe, not the output).
    print(json.dumps({'blend': [], 'glb': [str(glb)], 'evidence': [str(evidence)] if args.round else [],
                      'summary': [str(sheet)] if args.round else []}))
    raise SystemExit(0)

if args.assemble_sheet:
    # Run by the system Python (it has Pillow; Blender's Python does not).
    from PIL import Image, ImageDraw, ImageFont
    plan = json.loads(Path(args.assemble_sheet).read_text(encoding='utf-8'))
    width, gap, top = plan.get('width', 1800), 10, 54
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 24)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
    rows = []
    for row in plan['rows']:
        # The review-only reference photographs live in the ignored evidence folder; a sheet made without them says so.
        row = [panel for panel in row if Path(panel['file']).exists()]
        panels = [Image.open(panel['file']).convert('RGB') for panel in row]
        free = width - 2 * 14 - gap * (len(panels) - 1)
        height = int(free / sum(panel.width / panel.height for panel in panels))
        rows.append((height, [panel.resize((max(1, round(panel.width * height / panel.height)), height), Image.LANCZOS)
                              for panel in panels], [panel['label'] for panel in row]))
    canvas = Image.new('RGB', (width, top + sum(height + 30 for height, _, _ in rows) + 8), (46, 46, 43))
    draw = ImageDraw.Draw(canvas)
    draw.text((14, 12), plan['title'], font=font, fill=(238, 223, 198))
    y = top
    for height, panels, labels in rows:
        x = 14
        for panel, label in zip(panels, labels):
            canvas.paste(panel, (x, y))
            draw.text((x + 2, y + height + 4), label, font=small, fill=(214, 200, 176))
            x += panel.width + gap
        y += height + 30
    target = Path(plan['out'])
    target.parent.mkdir(parents=True, exist_ok=True)
    for quality in (86, 82, 78, 74, 70, 66, 62, 58, 54, 50):
        canvas.save(target, 'JPEG', quality=quality, optimize=True)
        if target.stat().st_size <= 495_000:
            break
    print(json.dumps({'sheet': str(target), 'bytes': target.stat().st_size, 'quality': quality}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Mesh as PhotoMesh, Photo, fill, lathe, slab, trace
from hull_model import headlamp, tyre
from photo_carve import carve_object, edge_seeds, lift_if_dark

bpy.ops.wm.read_factory_settings(use_empty=True)
work = evidence / 'carve-photos'
masks = evidence / 'masks'
work.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------------------------------------------
# Measurements. The body is 5.40 m from the front bumper's face to the rear bumper's, which makes the entry door
# 1.98 m tall and a tyre 1.05 m across; height and width follow from the photos ("Choosing a vehicle's size").
# Side photo, 1536 x 1024: front bumper's face x 17, rear bumper's x 1516, tyres' bottom y 929, roof's top y 138.
SIDE_START, SIDE_END, SIDE_GROUND, SIDE_TOP = 17, 1516, 929, 138
LENGTH = 5.40
S = LENGTH / (SIDE_END - SIDE_START)                 # 3.60 mm per side-photo pixel
HEIGHT = (SIDE_GROUND - SIDE_TOP) * S                # 2.85 m
# Front photo, 1254 x 1254: tyres' bottom y 1192, roof's top y 43, body from x 183 to x 1063 (centre 624).
FRONT_CX, FRONT_GROUND, FRONT_TOP = 624, 1192, 43
FRONT_S = HEIGHT / (FRONT_GROUND - FRONT_TOP)        # 2.48 mm
# Rear photo, 1254 x 1254: tyres' bottom y 1191, roof's top y 64, body from x 197 to x 1054 (centre 625.5).
REAR_CX, REAR_GROUND, REAR_TOP = 625.5, 1191, 64
REAR_S = HEIGHT / (REAR_GROUND - REAR_TOP)
BODY_X = (1063 - 183) * FRONT_S / 2                  # 1.09 m: half the body's width (the rear photo gives 1.08)
# Top photo, 1024 x 1536: front bumper's edge y 39, rear bumper's y 1497, body from x 249 to x 774 (centre 511.5).
# Its body is narrower for its length than the end photos say, so it gets its own scale across.
TOP_FRONT, TOP_REAR, TOP_CX = 39, 1497, 511.5
TOP_S = LENGTH / (TOP_REAR - TOP_FRONT)
TOP_XS = 2 * BODY_X / (774 - 249)
# Wheels on the side photo: front hub (268, 781), rear hub (1211, 780), tyre radius 146 px (142 across, 148 up).
WHEEL_R = 146 * S                                    # 0.526 m
WHEEL_PX = {'front': (268, 781), 'rear': (1211, 780)}
AXLE = {key: LENGTH / 2 - (px - SIDE_START) * S for key, (px, _) in WHEEL_PX.items()}
# Tyres on the front photo: outer edges x 157 and x 1094, inner x 322 and x 926; a tyre is 0.41 m wide. The rear
# photo sets its tyres further in than the overhead photo does; both axles take the front photo's track.
HALF_TYRE = (322 - 157) * FRONT_S / 2
TYRE_OUT = (1094 - 157) * FRONT_S / 2                # 1.16 m
TYRE_X = TYRE_OUT - HALF_TYRE
TYRE_IN = TYRE_OUT - 2 * HALF_TYRE
UNDERSIDE = (SIDE_GROUND - 808) * S                  # 0.44 m: the door's sill, below which nothing is carved
BONNET_X = (721 - 303) * TOP_XS / 2                  # 0.87 m: half the bonnet's width on the overhead photo
FENDER_OUT = 1.12                                    # the front wings stop 4 cm inside the tyre's outer face
FENDER_R = WHEEL_R + .24                             # and are a shell 0.19 m thick over the arch's cut
# Bumpers: the front photo's runs from x 180 to x 1073 and the side photo shows its return from x 17 to x 125,
# top y 680; the rear photo's from x 175 to x 1077, its return on the side photo from x 1400 to x 1516.
BUMPER_X = (1073 - 180) * FRONT_S / 2                # 1.11 m
BUMPER_RETURN = {'front': (125 - SIDE_START) * S, 'rear': (SIDE_END - 1400) * S}
BUMPER_TOP = (SIDE_GROUND - 676) * S                 # 0.91 m


def blender(point):
    """A game point in metres to stored Blender coordinates."""
    return (point[0], -point[2], point[1])


def side_px(z, y):
    return SIDE_START + (LENGTH / 2 - z) / S, SIDE_GROUND - y / S


def pixels(image):
    """An image's colours, top row first, as floats."""
    width, height = image.size
    data = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(data)
    return data.reshape(height, width, 4)[::-1].copy()


def save_jpeg(array, name, target):
    height, width, _ = array.shape
    image = bpy.data.images.new(name, width, height, alpha=False)
    image.pixels.foreach_set(array[::-1].ravel())
    image.filepath_raw = str(target)
    image.file_format = 'JPEG'
    image.save()
    bpy.data.images.remove(image)


def working_top(source, target):
    """The overhead photo as the carve needs it. Four things are wrong with the photo as generated, each measured:

    1. Its tyres stand beside the body. They are built separately, so they are painted out with the studio's own
       colour (the lesson "Tyres": the carve would give the arch a ghost of them).
    2. It disagrees with the side photo along the bus: its roof starts 0.89 m behind the bumper's face and the side
       photo's 1.08 m. Rows are moved so that the bumper, the bonnet's nose, the roof's front edge, the body's rear
       and the rear bumper stand where the side photo has them.
    3. It shows no wings over the front tyres, and the side and front photos do. A strip of the roof's own patch
       plate is laid where each wing's top will be, so that the carve may keep a wing there and paint it as plate.
       Its bumpers are also narrower than the end photos' (1.93 m against 2.21 m), so each bumper's own steel is
       laid out to the end photos' width, as far back as the side photo shows the bumper's return.
    4. The kit reads an overhead photo mirrored for a vehicle facing +Z, so it is turned left to right.
    """
    image = bpy.data.images.load(str(source))
    array = pixels(image)
    bpy.data.images.remove(image)
    height, width, _ = array.shape
    plate = array[875:1065, 285:408, :].copy()         # the welded patch on the roof
    steel = {'front': array[45:88, 300:700, :].copy(), 'rear': array[1462:1492, 300:700, :].copy()}
    for rows, cols in (((172, 283), (205, 298)), ((172, 283), (726, 820)), ((283, 445), (205, 252)), ((283, 445), (772, 820)),
                       ((1085, 1375), (205, 248)), ((1085, 1375), (776, 820))):
        for row in range(*rows):
            array[row, cols[0]:cols[1], :3] = array[row, 150:190, :3].mean(axis=0)
    # (overhead row, metres behind the front bumper's face on the side photo)
    marks = [(39, 0), (98, (51 - SIDE_START) * S), (283, (317 - SIDE_START) * S), (1455, (1484 - SIDE_START) * S), (1497, LENGTH)]
    wanted = (np.arange(height) - TOP_FRONT) * TOP_S   # the distance each row of the working copy must show
    source_rows = np.interp(wanted, [m for _, m in marks], [r for r, _ in marks])
    low = np.clip(np.floor(source_rows).astype(int), 0, height - 1)
    high = np.clip(low + 1, 0, height - 1)
    part = (source_rows - low)[:, None, None]
    warped = array[low] * (1 - part) + array[high] * part
    warped[wanted < 0] = array[:TOP_FRONT].mean(axis=(0, 1))
    warped[wanted > LENGTH] = array[TOP_REAR + 1:].mean(axis=(0, 1))
    # The wings' tops: from the bonnet's side out to the wing's edge, over the front tyre.
    behind = LENGTH / 2 - AXLE['front']
    row0, row1 = (round(TOP_FRONT + (behind + sign * FENDER_R) / TOP_S) for sign in (-1, 1))
    strip = np.concatenate([plate, plate[::-1], plate, plate[::-1]])[:row1 - row0]
    for inner, outer in ((BONNET_X - .1, FENDER_OUT + .03), (-(FENDER_OUT + .03), -(BONNET_X - .1))):
        col0, col1 = sorted(round(TOP_CX + x / TOP_XS) for x in (inner, outer))
        warped[row0:row1, col0:col1] = np.tile(strip, (1, 2, 1))[:, :col1 - col0]
    col0, col1 = (round(TOP_CX + x / TOP_XS) for x in (-BUMPER_X, BUMPER_X))
    for key, (z0, z1) in (('front', (0, BUMPER_RETURN['front'])), ('rear', (LENGTH - BUMPER_RETURN['rear'], LENGTH))):
        row0, row1 = round(TOP_FRONT + z0 / TOP_S), round(TOP_FRONT + z1 / TOP_S)
        patch = np.tile(steel[key], (row1 - row0, 2, 1))[:row1 - row0, :col1 - col0]
        bare = np.abs(warped[row0:row1, col0:col1, :3] - warped[row0:row1, 150:190, :3].mean(axis=1, keepdims=True)).max(axis=2) < .12
        warped[row0:row1, col0:col1][bare] = patch[bare]
    save_jpeg(np.ascontiguousarray(warped[:, ::-1], dtype=np.float32), 'bully-top-working', target)


def working_side(source, target):
    """The side photo shows the headlamp's glass edge-on, a white sliver at x 66 to 84, y 536 to 592. On the carve it
    became a pale streak down the bonnet's corner beside the separately built lamp, so the rust beside it is laid over it."""
    image = bpy.data.images.load(str(source))
    array = pixels(image)
    bpy.data.images.remove(image)
    array[532:596, 64:86] = array[532:596, 88:110]
    save_jpeg(np.ascontiguousarray(array, dtype=np.float32), 'bully-side-working', target)


for name in ('front', 'rear'):
    (work / f'bully-{name}.jpg').write_bytes((textures / f'bully-{name}.jpg').read_bytes())
working_side(textures / 'bully-side.jpg', work / 'bully-side.jpg')
working_top(textures / 'bully-top.jpg', work / 'bully-top.jpg')


def keep(x, y, z):
    """Outside the body's own width only a front wing stands, as a shell close over its tyre."""
    wing = (np.abs(x) <= FENDER_OUT) & ((z - AXLE['front']) ** 2 + (y - WHEEL_R) ** 2 < FENDER_R ** 2)
    nose = z > LENGTH / 2 - (317 - SIDE_START) * S          # ahead of the windscreen
    bumper = (y < BUMPER_TOP) & (np.abs(x) <= BUMPER_X) & ((z > LENGTH / 2 - BUMPER_RETURN['front']) | (z < -LENGTH / 2 + BUMPER_RETURN['rear']))
    return np.where(nose, (np.abs(x) <= BONNET_X + .02) | wing, np.abs(x) <= BODY_X + .02) | bumper


table = {
    'photos': {'side': 'bully-side.jpg', 'front': 'bully-front.jpg', 'rear': 'bully-rear.jpg', 'top': 'bully-top.jpg'},
    'length': LENGTH, 'width': 2 * TYRE_OUT, 'height': HEIGHT,
    'side': {'start': SIDE_START, 'end': SIDE_END, 'ground': SIDE_GROUND},
    'front': {'centre': FRONT_CX, 'ground': FRONT_GROUND, 'top': FRONT_TOP},
    'rear': {'centre': REAR_CX, 'ground': REAR_GROUND, 'top': REAR_TOP},
    'top': {'front': TOP_FRONT, 'rear': TOP_REAR, 'centre': 1023 - TOP_CX, 'x_scale': TOP_XS},
    'wheels': [(AXLE['front'], WHEEL_R, TYRE_IN), (AXLE['rear'], WHEEL_R, TYRE_IN)],
    'underside': UNDERSIDE, 'keep': keep,
    # Between the wheels the body's skirt ends at y 795 on the side photo, above the door's sill. Below it the photo
    # shows the studio floor beyond the bus, walled in by the tyres and their shadow: a pale line under the body.
    'cut': {'side': [(596, 796, 1040, 940)]},
    'forward': 1, 'side_front_on_left': True,
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 50,
    'mask_dir': str(masks), 'voxel': .025, 'target': 17000,
}
vehicle = bpy.data.objects.new('bully', None)
bpy.context.collection.objects.link(vehicle)
body = carve_object('bully body', work, table)
body.parent = vehicle
photos = table['_photos']
# The wheels and lamps lie wholly inside the photos' subject, which the carve's bleed leaves as it was, so they
# wear the carve's own copies and the file holds each photo once.
fresh = photos
materials = {key: photo.material() for key, photo in fresh.items()}

# Four wheels, each turning about its own hub. The faces wear the side photo's wheel, the tread the end photo's.
wheels = {}
TREAD = {'front': ('front', FRONT_CX - (TYRE_X / FRONT_S), HALF_TYRE / FRONT_S, 935, 1186),
         'rear': ('rear', 287.5, 82, 945, 1185)}
for axle, (px, py) in WHEEL_PX.items():
    end_key, end_cx, end_half, row0, row1 = TREAD[axle]
    for hand, side in (('left', 1), ('right', -1)):
        wheel = PhotoMesh()
        tyre(wheel, 'side', fresh['side'], px, py, 146, WHEEL_R, HALF_TYRE, end_key, fresh[end_key], end_cx, end_half, row0, row1, sides=28)
        # Raised lugs round the shoulder, so the tyre's outline is knobbly as the photo's is.
        for index in range(18):
            angle = 2 * math.pi * (index + (.5 if hand == 'left' else 0)) / 18
            for edge in (-1, 1):
                turn = angle + edge * math.pi / 36
                radial = Vector((0, math.sin(turn), math.cos(turn)))
                along = Vector((0, math.cos(turn), -math.sin(turn)))
                centre = radial * (WHEEL_R - .012) + Vector((edge * HALF_TYRE * .62, 0, 0))
                corners = [centre + Vector((dx * HALF_TYRE * .36, 0, 0)) + radial * dr + along * dt
                           for dx, dr, dt in ((-1, 0, -.04), (1, 0, -.04), (1, 0, .04), (-1, 0, .04),
                                              (-1, .028, -.03), (1, .028, -.03), (1, .028, .03), (-1, .028, .03))]
                # Each lug wears its own piece of the tread as the end photo shows it, not one flat colour.
                col0, col1 = sorted((end_cx + edge * end_half * .26, end_cx + edge * end_half * .96))
                lug_row = row0 + (row1 - row0 - 40) * ((index * 7) % 10) / 10
                lug_uv = [fresh[end_key].uv(col, row) for col, row in ((col0, lug_row), (col1, lug_row), (col1, lug_row + 36), (col0, lug_row + 36))]
                for face, out in (((4, 5, 6, 7), radial), ((0, 1, 5, 4), -along), ((3, 2, 6, 7), along),
                                  ((1, 2, 6, 5), Vector((1, 0, 0))), ((0, 3, 7, 4), Vector((-1, 0, 0)))):
                    wheel.face([corners[i] for i in face], lug_uv, end_key, out)
        obj = wheel.finish(f'bully wheel {axle}-{hand}', {'side': materials['side'], end_key: materials[end_key]})
        obj.parent = vehicle
        obj.location = blender((side * TYRE_X, WHEEL_R, AXLE[axle]))
        wheels[f'{axle}-{hand}'] = obj

# Axles join the wheels under the frame, stopping inside each tyre.
axles = PhotoMesh()
for axle, (px, py) in WHEEL_PX.items():
    lathe(axles, 'side', (0, WHEEL_R, AXLE[axle]), (1, 0, 0), (0, 0, 1), (0, 1, 0), [(-TYRE_X, .07), (TYRE_X, .07)],
          lambda index, distance, radius, angle, px=px, py=py: fresh['side'].uv(px + 8 * math.cos(angle), py + 8 * math.sin(angle)), sides=10)
axle_obj = axles.finish('bully axles', {'side': materials['side']})
axle_obj.parent = vehicle

# Headlamps, on the bonnet's flat face: front photo centres (350, 640) and (900, 640), bezel radius 52 px.
BONNET_FACE = LENGTH / 2 - (51 - SIDE_START) * S
lamps = {}
for hand, px in (('left', 900), ('right', 350)):
    lamp = PhotoMesh()
    headlamp(lamp, 'front', 'bulb', fresh['front'], px, 640, 52, 52 * FRONT_S, depth=.07, forward=1)
    obj = lamp.finish(f'bully headlamp {hand}', {'front': materials['front'], 'bulb': materials['front']})
    obj.parent = vehicle
    obj.location = blender(((px - FRONT_CX) * FRONT_S, (FRONT_GROUND - 640) * FRONT_S, BONNET_FACE + .035))
    lamps[hand] = obj

# ---------------------------------------------------------------------------------------------------------------
# The plough. Front photo of the blade alone, 1536 x 1024: blade from x 51 to x 1484, y 264 to y 804.
# Side photo of the plough alone, 1536 x 1024: blade's top y 100, its toe on the floor y 927 and x 150. The push
# arms are 1.17 m long on the photo; they are used as far as x 1100, where they pass into the frame under the
# bonnet, which leaves the blade's back 0.12 m ahead of the bumper. The blade is 2.56 m wide (0.12 m wider than
# the tyres each side), which makes it 0.965 m tall on its own photo.
PLOUGH_W = 2.56
PF_X0, PF_X1, PF_Y0, PF_Y1 = 51, 1484, 264, 804
PF_S = PLOUGH_W / (PF_X1 - PF_X0)
PLOUGH_H = (PF_Y1 - PF_Y0) * PF_S
PS_TOP, PS_GROUND, PS_TOE, PS_MOUNT = 100, 927, 150, 1100
PS_S = PLOUGH_H / (PS_GROUND - PS_TOP)
CLEAR = .10                                           # the blade rides 0.10 m off the ground
MOUNT_Z = LENGTH / 2 - .70                            # where the arms pass into the frame, ahead of the front axle
ARM_X = .46
plough_front = Photo(textures / 'bully-plough-front.jpg')
plough_side = Photo(textures / 'bully-plough-side.jpg')
plate = Photo(textures / 'bully-plate.jpg')           # welded armour plate, 1254 x 1254, about 1 m across
plough_materials = {'front': plough_front.material(.9), 'side': plough_side.material(.9), 'plate': plate.material(.92)}
lift_if_dark(plough_side)
plough_mask = ~plough_side.sky(edge_seeds(plough_side), tolerance=40, grey=26)
plough_mask[PS_GROUND:, :] = False                    # the floor's shadow
lift_if_dark(plough_front)
blade_mask = ~plough_front.sky(edge_seeds(plough_front), tolerance=40, grey=26)
blade_mask[PF_Y1 + 1:, :] = False
# The studio's colour must not show on an edge of either picture.
plough_side.bleed(plough_mask)
plough_front.bleed(blade_mask)


def plough_world(px, py, x):
    return (x, (PS_GROUND - py) * PS_S + CLEAR, MOUNT_Z + (PS_MOUNT - px) * PS_S)


# The blade's own curve: the first subject pixel of each row of the side photo, top to toe.
curve = []
for row in range(PS_TOP + 4, PS_GROUND - 2, 14):
    cols = np.nonzero(plough_mask[row, :700])[0]
    if len(cols):
        curve.append((float(cols[0]), float(row)))
curve.append((float(PS_TOE), float(PS_GROUND - 1)))
# Bolt heads stand proud of the blade's face on the photo and notched the blade's ends: each point takes the middle
# value of five, then the mean of three.
columns = np.array([px for px, _ in curve])
padded = np.pad(columns, 2, mode='edge')
columns = np.median(np.stack([padded[k:k + len(columns)] for k in range(5)]), axis=0)
padded = np.pad(columns, 1, mode='edge')
columns = (padded[:-2] + padded[1:-1] + padded[2:]) / 3
curve = [(float(px), row) for px, (_, row) in zip(columns, curve)]
plough = PhotoMesh()
THICK = .05
half = PLOUGH_W / 2
strips = 2                                            # across the blade: its back wears the plate photo once each way
points = [Vector(plough_world(px, py, 0)) for px, py in curve]
normals = []
for i, point in enumerate(points):
    a, b = points[max(i - 1, 0)], points[min(i + 1, len(points) - 1)]
    tangent = (b - a).normalized()
    normals.append(Vector((0, -tangent.z, tangent.y)))   # square to the curve, towards the bus
for i in range(len(points) - 1):
    for k in range(strips):
        x0, x1 = -half + PLOUGH_W * k / strips, -half + PLOUGH_W * (k + 1) / strips
        quad = [Vector((x0, points[i].y, points[i].z)), Vector((x1, points[i].y, points[i].z)),
                Vector((x1, points[i + 1].y, points[i + 1].z)), Vector((x0, points[i + 1].y, points[i + 1].z))]

        def face_uv(point):
            # Seen from the front, the bus's left (+X) is on the picture's right.
            return plough_front.uv(PF_X0 + (point.x + half) / PF_S, PF_Y1 - (point.y - CLEAR) / PF_S)

        plough.face(quad, [face_uv(p) for p in quad], 'front', Vector((0, 0, 1)), True)
        back = [quad[0] + normals[i] * THICK, quad[1] + normals[i] * THICK, quad[2] + normals[i + 1] * THICK, quad[3] + normals[i + 1] * THICK]
        # The back wears welded plate at the plate's own size, turned about at the middle.
        u0, u1 = (40, 1240) if k % 2 == 0 else (1240, 40)
        v0 = 330 + 900 * i / (len(points) - 1)
        v1 = 330 + 900 * (i + 1) / (len(points) - 1)
        plough.face(back, [plate.uv(u0, v0), plate.uv(u1, v0), plate.uv(u1, v1), plate.uv(u0, v1)], 'plate', Vector((0, 0, -1)), True)
    for x, out in ((-half, Vector((-1, 0, 0))), (half, Vector((1, 0, 0)))):
        a, b = Vector((x, points[i].y, points[i].z)), Vector((x, points[i + 1].y, points[i + 1].z))
        end = [a, b, b + normals[i + 1] * THICK, a + normals[i] * THICK]
        (pa, ra), (pb, rb) = curve[i], curve[i + 1]
        plough.face(end, [plough_side.uv(pa + 4, ra), plough_side.uv(pb + 4, rb), plough_side.uv(pb + 30, rb), plough_side.uv(pa + 30, ra)], 'side', out)
for index, out in ((0, Vector((0, 1, 0))), (len(points) - 1, Vector((0, -1, 0)))):
    a = Vector((-half, points[index].y, points[index].z))
    b = Vector((half, points[index].y, points[index].z))
    row = PF_Y0 + 6 if index == 0 else PF_Y1 - 6
    plough.face([a, b, b + normals[index] * THICK, a + normals[index] * THICK],
                [plough_front.uv(PF_X0, row), plough_front.uv(PF_X1, row), plough_front.uv(PF_X1, row + 3), plough_front.uv(PF_X0, row + 3)], 'front', out)
# The push arms, their braces and mounting plates, traced from the side photo with their holes open. The trace
# starts 14 pixels behind the blade's face, so that no edge lies in the blade's own surface.
arm_mask = plough_mask & np.roll(plough_mask, 14, axis=1)
arm_loops = trace(arm_mask, (300, 150, PS_MOUNT, 860), tolerance=2.2, min_area=200)
for x in (-ARM_X, ARM_X):
    slab(plough, 'side', plough_side, arm_loops, lambda px, py, d, x=x: plough_world(px, py, x + d), -.05, .05, wall_scale=PS_S)
plough_obj = plough.finish('bully plough', plough_materials)
plough_obj.parent = vehicle

# ---------------------------------------------------------------------------------------------------------------
# The stop paddle, 1254 x 1254 photo: the octagon from x 48 to x 870 (centre 459, 624), its hinge barrel at x 1180.
# It lies flat on the left side behind the door, 0.56 m across, and turns out about its hinge.
stop = Photo(textures / 'bully-stop-sign.jpg')
stop_material = {'stop': stop.material(.85)}
lift_if_dark(stop)
stop_mask = ~stop.sky(edge_seeds(stop), tolerance=40, grey=26)
stop.bleed(stop_mask)
STOP_S = .56 / (870 - 48)
HINGE_PX = (1180, 624)
HINGE = (BODY_X + .035, (SIDE_GROUND - 490) * S, LENGTH / 2 - (862 - SIDE_START) * S)   # on the side photo: x 862, y 490


def stop_local(px, py, d):
    """Seen from the bus's left the front of the bus is on the picture's left, so +Z runs to the picture's left."""
    return (d, (HINGE_PX[1] - py) * STOP_S, (HINGE_PX[0] - px) * STOP_S)


paddle = PhotoMesh()
slab(paddle, 'stop', stop, trace(stop_mask, (880, 100, 1254, 1150), tolerance=3, min_area=200), stop_local, -.012, .012, wall_scale=STOP_S)
plate_loops = trace(stop_mask, (30, 100, 880, 1150), tolerance=3, min_area=400)
for triangle in fill(plate_loops):
    paddle.face([stop_local(px, py, .009) for px, py in triangle], [stop.uv(px, py) for px, py in triangle], 'stop', (1, 0, 0))
    # The inner face reads the right way round too, so the word is never seen backwards when the paddle is out.
    paddle.face([stop_local(px, py, -.009) for px, py in triangle], [stop.uv(2 * 459 - px, py) for px, py in triangle], 'stop', (-1, 0, 0))
for a, b in zip(plate_loops[0], plate_loops[0][1:] + plate_loops[0][:1]):
    paddle.face([stop_local(*a, .009), stop_local(*b, .009), stop_local(*b, -.009), stop_local(*a, -.009)],
                [stop.uv(*a), stop.uv(*b), stop.uv(*b), stop.uv(*a)], 'stop')
paddle_obj = paddle.finish('bully stop-paddle', stop_material)
paddle_obj.parent = vehicle
paddle_obj.location = blender(HINGE)

# ---------------------------------------------------------------------------------------------------------------
# The whole length, plough included, is centred on the origin, as the socket layout expects.
bpy.context.view_layer.update()


def world_bounds(objects):
    corners = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    return [(min(c[i] for c in corners), max(c[i] for c in corners)) for i in range(3)]


pieces = [obj for obj in vehicle.children if obj.type == 'MESH']
before = world_bounds(pieces)
shift = (before[1][0] + before[1][1]) / 2             # Blender Y is game -Z
for obj in pieces:
    obj.location.y -= shift
bpy.context.view_layer.update()
bounds = world_bounds(pieces)
size = {'width': round(bounds[0][1] - bounds[0][0], 3), 'length': round(bounds[1][1] - bounds[1][0], 3),
        'height': round(bounds[2][1], 3)}
if abs(bounds[2][0]) > .05:
    raise RuntimeError(f'the Bully does not stand on the ground: {bounds[2]}')
body_bounds = world_bounds([body])
if body_bounds[0][1] - body_bounds[0][0] > 2 * FENDER_OUT + .1 or body_bounds[1][1] - body_bounds[1][0] < LENGTH - .2:
    raise RuntimeError(f'the carved body is not the size of its table: {body_bounds}')

# Sockets by the shared layout (src/vehicle-sockets.js), with this car's own four adjustments.
ADJUST = {'frontY': .58, 'roofLift': .10, 'roofZ': -.55, 'shieldLift': .20}
half_w, half_l, tall = size['width'] / 2, size['length'] / 2, size['height']
sockets = {
    'front': (0, ADJUST['frontY'], half_l + .04), 'rear': (0, ADJUST['frontY'], -half_l - .04),
    'roof': (0, tall + ADJUST['roofLift'], ADJUST['roofZ']),
    'hood': (0, max(ADJUST['frontY'] + .14, tall * .57), half_l * .43),
    'left': (half_w + .04, tall * .55, 0), 'right': (-half_w - .04, tall * .55, 0),
    'door': (half_w + .03, tall * .55, -half_l * .08), 'shield': (0, tall * .54 + ADJUST['shieldLift'], 0),
}
for key, point in sockets.items():
    node = bpy.data.objects.new('vehicle-socket-' + key, None)
    bpy.context.collection.objects.link(node)
    node.parent = vehicle
    node.location = blender(point)
vehicle['vehicle_id'] = 'bully'
vehicle['units'] = 'metres'
vehicle['forward'] = '+Z'
vehicle['up'] = '+Y'
vehicle['size_m'] = [size['width'], size['length'], size['height']]
vehicle['socket_adjustment'] = json.dumps(ADJUST)
vehicle['wheel_radius_m'] = round(WHEEL_R, 3)
vehicle['wheelbase_m'] = round(AXLE['front'] - AXLE['rear'], 3)
vehicle['track_m'] = round(2 * TYRE_X, 3)
vehicle['body_m'] = [round(2 * BODY_X, 3), LENGTH, round(HEIGHT, 3)]

for image in bpy.data.images:
    if image.size[0] and not image.packed_file:
        image.pack()
for obj in bpy.data.objects:
    obj.select_set(obj is vehicle or obj.parent is vehicle)
bpy.context.view_layer.objects.active = vehicle
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_extras=True, use_selection=True,
                          export_image_format='JPEG', export_image_quality=86)

# Read the file back: what the game will load is what is checked.
import struct
raw = glb.read_bytes()
json_length = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + json_length].decode('utf-8'))
nodes = {node.get('name'): node for node in gltf['nodes']}
required = {'bully', 'bully body', 'bully plough', 'bully stop-paddle', 'bully axles', 'bully headlamp left', 'bully headlamp right'}
required |= {'vehicle-socket-' + key for key in sockets} | {'bully wheel ' + key for key in wheels}
if not required.issubset(nodes):
    raise RuntimeError('the file is missing nodes: ' + ', '.join(sorted(required - set(nodes))))
triangles = 0
for mesh_data in gltf['meshes']:
    for primitive in mesh_data['primitives']:
        if [key for key in primitive['attributes'] if key.startswith('TEXCOORD_')] != ['TEXCOORD_0']:
            raise RuntimeError(f'{mesh_data["name"]} needs exactly one UV layer')
        triangles += gltf['accessors'][primitive['indices']]['count'] // 3
for material in gltf['materials']:
    if material.get('pbrMetallicRoughness', {}).get('metallicFactor', 0) > .3:
        raise RuntimeError(f'{material["name"]} is too metallic')
for key in wheels:
    node = nodes['bully wheel ' + key]
    parts = [gltf['accessors'][primitive['attributes']['POSITION']] for primitive in gltf['meshes'][node['mesh']]['primitives']]
    diameter = max(part['max'][1] for part in parts) - min(part['min'][1] for part in parts)
    if abs(diameter - 2 * WHEEL_R) > .08 or abs(node['translation'][1] - WHEEL_R) > .01:
        raise RuntimeError(f'wheel {key}: {diameter:.3f} m across at height {node["translation"][1]:.3f}')
front_socket = nodes['vehicle-socket-front']['translation']
if abs(front_socket[2] - (half_l + .04)) > .01 or abs(front_socket[0]) > .001:
    raise RuntimeError(f'the front socket is not ahead of the plough on +Z: {front_socket}')
if triangles > 25000 or len(raw) > 8_000_000:
    raise RuntimeError(f'over budget: {triangles} triangles, {len(raw)} bytes')
report = {'glb': str(glb), 'triangles': triangles, 'bytes': len(raw), 'size_m': size, 'wheel_radius_m': round(WHEEL_R, 3),
          'wheelbase_m': round(AXLE['front'] - AXLE['rear'], 3), 'track_m': round(2 * TYRE_X, 3),
          'body_triangles': sum(len(p.vertices) - 2 for p in body.data.polygons),
          'sockets': {key: [round(v, 3) for v in point] for key, point in sockets.items()}}
print('BULLY ' + json.dumps(report))

if not args.round:
    raise SystemExit(0)

# ---------------------------------------------------------------------------------------------------------------
# Review views, from the exported file alone in an empty scene, flat daylight, Standard view transform.
shots = evidence / f'round-{args.round}'
shots.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 92
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('review overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.6, .61, .62, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -.005))
ground = bpy.context.object
ground.name = 'review ground'
ground_material = bpy.data.materials.new('review ground')
ground_material.use_nodes = True
ground_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.36, .35, .33, 1)
ground_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(ground_material)
# A sun of 2.0 lights a white surface to about 0.64, and the sky adds the rest: a bright overcast day. It stands
# high on the bus's left and a little ahead, the side every three-quarter view is taken from.
bpy.ops.object.light_add(type='SUN', location=(0, 0, 50))
sun = bpy.context.object
sun.data.energy = 2.0
sun.data.angle = math.radians(30)
sun.rotation_euler = (Vector(blender((-5, -9, -2.5)))).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.clip_end = 600
person_parts = []


def shoot(name, kind, eye, target, fit, res, person=False, roll=0):
    """`fit` is the width in metres across the picture at the target."""
    camera.location = blender(eye)
    direction = Vector(blender(target)) - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    if roll:
        camera.rotation_euler.rotate_axis('Z', roll)
    if kind == 'ortho':
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = fit
    else:
        camera.data.type = 'PERSP'
        camera.data.sensor_width = 36
        camera.data.lens = 36 * direction.length / fit
    for part in person_parts:
        part.hide_render = not person
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = str(shots / f'{name}.jpg')
    bpy.ops.render.render(write_still=True)
    return str(shots / f'{name}.jpg')


half_l = size['length'] / 2
mid = (0, 1.3, 0)
views = {
    'front-three-quarter': shoot('front-three-quarter', 'persp', (6.4, 1.7, 8.2), (0, 1.25, .2), 8.2, (1200, 800)),
    'rear-three-quarter': shoot('rear-three-quarter', 'persp', (6.6, 1.9, -8.6), (0, 1.3, -.1), 8.4, (1200, 800)),
    'side': shoot('side', 'ortho', (40, 1.45, 0), (0, 1.45, 0), 7.2, (1500, 720)),
    'top': shoot('top', 'ortho', (0, 40, 0), (0, 0, 0), 7.2, (1500, 720), roll=math.radians(90)),
    'front': shoot('front', 'ortho', (0, 1.45, 40), (0, 1.45, 0), 3.4, (800, 760)),
    'rear': shoot('rear', 'ortho', (0, 1.45, -40), (0, 1.45, 0), 3.4, (800, 760)),
    'close': shoot('close', 'persp', (3.6, 1.0, half_l + 2.4), (.5, .8, half_l - 1.2), 3.6, (1000, 760)),
    'chase': shoot('chase', 'persp', (0, 3.4, -half_l - 7.5), (0, 1.2, 0), 9.0, (1000, 620)),
    'right': shoot('right', 'persp', (-7.0, 2.2, -8.0), (0, 1.3, 0), 8.6, (1000, 620)),
    'low-front': shoot('low-front', 'persp', (-2.6, .7, half_l + 5.5), (0, 1.1, 0), 5.6, (1000, 620)),
}
# The scale figure is for review only and is imported after the views of the car alone.
existing = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/models/wasteland/crew/cinder.glb'))
person_parts = [obj for obj in bpy.data.objects if obj not in existing]
corners = [obj.matrix_world @ Vector(corner) for obj in person_parts if obj.type == 'MESH' for corner in obj.bound_box]
low, high = min(c.z for c in corners), max(c.z for c in corners)
person = bpy.data.objects.new('review person, 1.72 m', None)
scene.collection.objects.link(person)
person.scale = (1.72 / (high - low),) * 3
person.location = blender((.5, -low * 1.72 / (high - low), -half_l - .8))
for obj in person_parts:
    if obj.parent not in person_parts:
        obj.parent = person
views['person'] = shoot('person', 'persp', (12, 1.6, 1.5), (0, 1.4, -.5), 8.4, (1200, 800), person=True)

plan = {
    'title': f'CAR-ART-BULLY, round {args.round}: the exported bully.glb beside its reference photographs',
    'out': str(sheet), 'width': 1640,
    'rows': [
        [{'file': str(evidence / 'photos/bully-hero-front.jpg'), 'label': 'Reference photograph (generated): front three-quarter'},
         {'file': views['front-three-quarter'], 'label': 'Model: front three-quarter'}],
        [{'file': str(evidence / 'photos/bully-hero-rear.jpg'), 'label': 'Reference photograph (generated): rear three-quarter'},
         {'file': views['rear-three-quarter'], 'label': 'Model: rear three-quarter'}],
        [{'file': str(textures / 'bully-side.jpg'), 'label': 'Carve photograph: side'},
         {'file': views['side'], 'label': 'Model: side'}],
        [{'file': views['top'], 'label': 'Model: top (front at the left)'},
         {'file': views['front'], 'label': 'Model: front'}, {'file': views['rear'], 'label': 'Model: rear'}],
        [{'file': views['person'], 'label': 'Model beside a 1.72 m person'},
         {'file': views['close'], 'label': 'Model: plough, lamp and wheel'},
         {'file': views['chase'], 'label': "Model: from the game's chase camera height"}],
        [{'file': str(evidence / 'photos/ref-short-bus.jpg'), 'label': 'Reference photograph (generated): an ordinary short school bus'},
         {'file': views['right'], 'label': 'Model: right side from the rear (no paddle on this side)'},
         {'file': views['low-front'], 'label': 'Model: low, from the front right'}],
    ],
}
plan_path = shots / 'sheet.json'
plan_path.write_text(json.dumps(plan, indent=1), encoding='utf-8')
done = subprocess.run(['python', str(Path(__file__).resolve()), '--root', str(root), '--assemble-sheet', str(plan_path)],
                      capture_output=True, text=True)
print(done.stdout.strip() or done.stderr.strip())
if done.returncode:
    raise RuntimeError('the sheet was not assembled')
