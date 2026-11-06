"""WW-ART-CREW: the crew's favours, each built from its own photo with photo_model.

Run with Blender 4.5: blender -b --python tools/blender/crew-favours.py -- --root <repo>
Metres, X right, Y up, Z towards the viewer. Each prop is a named part under one root.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-crew')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/crew-favours.glb'
blend = root / 'art-build/crew-favours/crew-favours.blend'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
textures = root / 'public/assets/models/wasteland/scablands/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_model import Mesh, Photo, box, lathe, rect_loop, shrink, slab, tidy, trace
from hull_model import View, occupancy, largest_part, carve_hull

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
root_object = bpy.data.objects.new('crew-favours', None)
scene.collection.objects.link(root_object)
triangles = {}

def finish(mesh, name, materials):
    obj = mesh.finish(name, materials)
    obj.parent = root_object
    obj['part'] = name
    triangles[name] = mesh.triangles()
    return obj

# --- jax-harpoon, 2.5 m, along X with its head at +X ---------------------------------
harpoon = Photo(textures / 'ww-harpoon-photo.jpg')
harpoon_solid = tidy(~harpoon.sky([(50, 50), (1650, 500), (850, 500)], grey=26))
HS = 2.5 / 1663
def HX(px): return (px - 850) * HS
HC = 287
mesh = Mesh()
stations = []
for px in range(18, 1462, 12):
    column = np.nonzero(harpoon_solid[:, px])[0]
    if len(column):
        stations.append((HX(px), max(3, (column[-1] - column[0]) / 2) * HS))
# The butt end closes down on itself; the head's blade is a flat piece, below.
def harpoon_uv(index, distance, radius, angle):
    theta = math.degrees(math.asin(math.sin(angle)))
    return harpoon.uv(distance / HS + 850, HC - radius / HS * .9 * theta / 90)
lathe(mesh, 'harpoon', (0, 0, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0), stations, harpoon_uv, sides=12,
      cap_start=('harpoon', lambda a, f: harpoon.uv(28 + math.cos(a) * f * 8, HC - math.sin(a) * f * 14)))
blade = trace(shrink(harpoon_solid, 1), (1455, 215, 1690, 350), tolerance=1.0)
def on_blade(px, py, d): return (HX(px), (HC - py) * HS, d)
slab(mesh, 'harpoon', harpoon, blade, on_blade, -.009, .009, wall_scale=HS)
harpoon.bleed(harpoon_solid)
finish(mesh, 'jax-harpoon', {'harpoon': harpoon.material()})

# --- piano-upright, 1.5 m wide, 1.3 m high, 0.6 m deep, its back at Z = 0 --------------
piano = Photo(textures / 'ww-piano-photo.jpg')
def PX(px): return (px - 647.5) * .001408
def PY(py): return (1040 - py) * .00125
SIDE_STRIP = 112
WOOD = ('piano', piano, (205, 75, 620, 180))       # the upper panel, for hidden wood
TOP = ('piano', piano, (205, 75, 1015, 180))
DARK = ('piano', piano, (1046, 490, 1072, 700))    # the dark inside by the action
def strip(y0, y1): return ('piano', piano, (62, y0, SIDE_STRIP, y1))

mesh = Mesh()
def part(rect, z0, z1, left=DARK, right=DARK, top=WOOD, under=DARK, back=DARK):
    x0, y0, x1, y1 = rect
    faces = {'+z': ('piano', piano, rect), '-x': left, '+x': right, '+y': top, '-y': under, '-z': back}
    box(mesh, PX(x0), PX(x1), PY(y1), PY(y0), z0, z1, faces)

part((115, 30, 1110, 470), 0, .44, strip(30, 470), strip(30, 470), TOP, DARK, TOP)        # upper case
part((115, 470, 1100, 985), 0, .18, DARK, DARK, DARK, DARK, TOP)                          # lower case
part((95, 0, 1130, 32), 0, .60, strip(0, 32), strip(0, 32), TOP, DARK, TOP)               # lid
part((115, 32, 1110, 197), .44, .48, DARK, DARK, DARK)                                    # upper panel
part((160, 197, 1075, 247), .44, .53)                                                     # hinge rail
part((165, 247, 1085, 348), .44, .55)                                                     # fall board
part((235, 348, 1135, 372), .44, .57)                                                     # behind the keys
part((128, 432, 1172, 510), .30, .71, top=DARK)                                           # key bed's front
# The keys slope down to the player, so they catch the light from above.
keys = ((PX(235), PY(372), .57), (PX(1135), PY(372), .57), (PX(1135), PY(432), .71), (PX(235), PY(432), .71))
mesh.face(keys, (piano.uv(235, 372), piano.uv(1135, 372), piano.uv(1135, 432), piano.uv(235, 432)), 'piano', (0, 1, 1))
# The action on its back wall, and the strings further back: real depth in front of both.
part((235, 470, 1105, 722), .26, .28)
part((235, 700, 1030, 738), .28, .37, top=WOOD)
part((240, 722, 1105, 892), .18, .20)
box(mesh, PX(232), PX(236), PY(892), PY(470), .18, .60, {'+x': DARK})
box(mesh, PX(1100), PX(1105), PY(892), PY(470), .18, .60, {'-x': DARK})
# Posts, cheeks, plinth and feet.
POST_WOOD = ('piano', piano, (172, 600, 240, 900))
part((165, 510, 245, 930), .30, .57, POST_WOOD, POST_WOOD)
part((1105, 462, 1172, 830), .30, .57, POST_WOOD, POST_WOOD)
part((115, 470, 165, 1020), 0, .50, strip(470, 1020), DARK, WOOD, DARK)
box(mesh, PX(1100), PX(1110), PY(985), PY(470), 0, .30, {'+x': strip(470, 985), '-z': TOP})
part((250, 855, 1035, 985), .20, .57)
part((175, 905, 250, 950), .30, .59, POST_WOOD, POST_WOOD, POST_WOOD)
part((148, 950, 272, 1038), .30, .62, strip(925, 1020), POST_WOOD, POST_WOOD)
part((1095, 815, 1165, 885), .30, .58, POST_WOOD, POST_WOOD, POST_WOOD)
part((1040, 885, 1178, 972), .30, .60, POST_WOOD, POST_WOOD, POST_WOOD)
box(mesh, PX(115), PX(145), PY(1020), PY(985), 0, .30, {'-x': strip(985, 1020)})
# The cheeks, the keyboard's curved arms, by their outlines.
LEFT_ARM = [[(125, 225), (165, 225), (168, 320), (212, 352), (238, 420), (240, 482), (126, 482)]]
RIGHT_ARM = [[(1072, 228), (1098, 250), (1122, 288), (1190, 320), (1200, 400), (1200, 458), (1072, 472)]]
def on_piano(px, py, d): return (PX(px), PY(py), d)
slab(mesh, 'piano', piano, LEFT_ARM, on_piano, .44, .73, wall_scale=.012)
slab(mesh, 'piano', piano, RIGHT_ARM, on_piano, .44, .73, wall_scale=.012)
# Two pedals and the caster.
for pedal in ([[(600, 935), (632, 935), (657, 996), (622, 1000)]], [[(675, 935), (706, 935), (736, 990), (700, 994)]]):
    slab(mesh, 'piano', piano, pedal, on_piano, .55, .68, wall_scale=.012)
def on_caster(px, py, d): return (PX(px), PY(py) - .025, d)
slab(mesh, 'piano', piano, [rect_loop(1118, 982, 1142, 1014)], on_caster, .44, .49, wall_scale=.012)
finish(mesh, 'piano-upright', {'piano': piano.material()})

# --- gerald, one picture for the whole lizard: overhead and side views on one sheet ----
gerald = Photo(textures / 'ww-gerald-cutout.jpg')
rgb = gerald.rgb()
background = (rgb[:, :, 2] > 170) & (rgb[:, :, 1] > 140) & (rgb[:, :, 0] < 130)
solid = tidy(~background)
GS = .60 / 1425
OVERHEAD_TOP, SIDE_BOTTOM = 385, 345
overhead_solid = solid.copy()
overhead_solid[:OVERHEAD_TOP] = False
side_solid = solid.copy()
side_solid[SIDE_BOTTOM:] = False
GROUND_PY = 330

def table(points):
    xs, ys = zip(*points)
    return lambda x: float(np.interp(x, xs, ys))

tail_points = []
for x in range(860, 1500, 20):
    column = np.nonzero(overhead_solid[:, x])[0]
    if len(column):
        tail_points.append((x, (column[0] + column[-1]) / 2))
spine = table(((75, 672), (200, 672), (500, 680), (800, 672), *tail_points))
width_table = table(((76, 5), (90, 28), (120, 48), (170, 66), (215, 66), (270, 58), (330, 68), (400, 90), (500, 112), (590, 110),
                    (660, 85), (720, 62), (800, 48), (900, 36), (1000, 28), (1100, 22), (1250, 14), (1400, 7), (1498, 1.5)))
tail_width = dict()
for x, centre in tail_points:
    column = np.nonzero(overhead_solid[:, x])[0]
    tail_width[x] = (column[-1] - column[0]) / 2
tail_table = table(sorted(tail_width.items()))
def half_width(x):
    return tail_table(x) if x >= 860 else width_table(x)
belly = table(((85, 125), (110, 150), (170, 178), (260, 212), (330, 240), (420, 256), (560, 258), (640, 245), (720, 232),
               (800, 225), (950, 240), (1150, 245), (1350, 232), (1497, 212)))
def side_x(x): return 85 + (x - 75) * (1497 - 85) / (1500 - 75)

raw_tops = {}
for sx in range(85, 1498):
    column = np.nonzero(side_solid[:, sx])[0]
    if len(column):
        raw_tops[sx] = int(column[0])
def top_row(sx):
    near = [raw_tops[k] for k in range(int(sx) - 5, int(sx) + 6) if k in raw_tops]
    return float(np.median(near)) if near else belly(sx) - 2

mesh = Mesh()
SIDES = 14
rings = []
xs = list(np.linspace(76, 240, 12)) + list(np.linspace(260, 800, 18)) + list(np.linspace(830, 1498, 16))
for x in xs:
    sx = side_x(x)
    w = half_width(x) * GS
    top = min(top_row(sx), belly(sx) - 3)
    y_bottom = (GROUND_PY - belly(sx)) * GS
    y_top = (GROUND_PY - top) * GS
    ring = []
    for k in range(SIDES):
        a = 2 * math.pi * k / SIDES
        y = y_bottom + (y_top - y_bottom) * (.5 + .5 * math.sin(a))
        z = w * math.cos(a)
        ring.append((mesh.vertex(((x - 75) * GS - .15, y, z)), x, sx, y, z, y_bottom))
    rings.append(ring)
for r0, r1 in zip(rings, rings[1:]):
    for k in range(SIDES):
        corners = (r0[k], r0[(k + 1) % SIDES], r1[(k + 1) % SIDES], r1[k])
        angle = 2 * math.pi * (k + .5) / SIDES
        looks_up = math.sin(angle) > .62
        uvs = []
        for _, x, sx, y, z, y_bottom in corners:
            if looks_up:
                uvs.append(gerald.uv(x, spine(x) + z / GS * .8))
            else:
                uvs.append(gerald.uv(sx, belly(sx) - 2 - (y - y_bottom) / GS))
        mesh.indexed([c[0] for c in corners], uvs, 'gerald', (0, math.sin(angle), math.cos(angle)), True)

# Each leg and foot, traced from the overhead view with all its toes. Shoulder at the
# body's flank, sloping to the wrist, then flat on the ground through the toes.
drop = table(((0, .046), (50, .040), (100, .013), (130, .004), (400, .004)))
thickness = table(((0, 1), (100, .55), (135, .25), (400, .25)))
def on_leg(px, py, d):
    distance = max(0, abs(py - spine(px)) - half_width(px))
    return ((px - 75) * GS - .15, drop(distance) + d * thickness(distance), (py - spine(px)) * GS)
yy, xx = np.mgrid[0:gerald.h, 0:gerald.w]
body = np.abs(yy - np.vectorize(spine)(xx[0])[None, :]) < np.vectorize(half_width)(xx[0])[None, :]
legs = shrink(overhead_solid, 1) & ~body
# The body's edge scales leave thin slivers beside it: only a real limb is kept there.
opened = shrink(legs, 5)
for _ in range(6):
    opened = opened | np.roll(opened, 1, 0) | np.roll(opened, -1, 0) | np.roll(opened, 1, 1) | np.roll(opened, -1, 1)
near_body = np.abs(yy - np.vectorize(spine)(xx[0])[None, :]) < np.vectorize(half_width)(xx[0])[None, :] + 45
legs = (legs & ~near_body) | (legs & opened & near_body)
for rect in ((215, 400, 420, 640), (630, 400, 840, 625), (205, 730, 410, 975), (640, 725, 840, 1000)):
    loops = trace(legs, rect, tolerance=1.0, min_area=200)
    slab(mesh, 'gerald', gerald, loops, on_leg, 0, .012, wall_scale=GS * 1.5)
gerald.bleed(shrink(solid, 3), passes=40)
gerald.image.scale(1280, 853)
finish(mesh, 'gerald', {'gerald': gerald.material()})

# --- gerald-box: small photo-built carrier; its ventilation holes stay in the picture ---
gerald_box_photo = Photo(textures / 'ww-gerald-box.jpg')
gb = Mesh()
GB_RECT = (0, 0, gerald_box_photo.w, gerald_box_photo.h)
GB_WOOD = (210, 190, 490, 270)
box(gb, -.20, .20, 0, .21, -.09, .09, {
    '+z': ('carrier', gerald_box_photo, GB_RECT),
    '-z': ('carrier', gerald_box_photo, GB_RECT),
    '+x': ('carrier', gerald_box_photo, GB_WOOD), '-x': ('carrier', gerald_box_photo, GB_WOOD),
    '+y': ('carrier', gerald_box_photo, GB_WOOD), '-y': ('carrier', gerald_box_photo, GB_WOOD)})
finish(gb, 'gerald-box', {'carrier': gerald_box_photo.material()})

# --- ash-hat: lathed side silhouette, with its radius measured from the mask -------------
hat_side = Photo(textures / 'ww-ash-hat-side.jpg')
hat_solid = tidy(~hat_side.sky([(12, 12), (hat_side.w - 12, 12), (12, hat_side.h - 12)], grey=26))
HAT_CX = hat_side.w / 2
HAT_BOTTOM = hat_side.h - 36
HAT_ROWS = []
for py in range(HAT_BOTTOM, 0, -2):
    row = np.nonzero(hat_solid[py])[0]
    if len(row) > 8:
        radius = max(HAT_CX - row[0], row[-1] - HAT_CX)
        HAT_ROWS.append(((HAT_BOTTOM - py) * .00017, radius * .00017))
HAT_ROWS.sort()
hat_solid[HAT_BOTTOM + 1:] = False
hat_side.bleed(shrink(hat_solid, 4), passes=24)
def hat_uv(index, distance, radius, angle):
    px = HAT_CX + radius / .00017 * .85 * math.cos(angle)
    py = HAT_BOTTOM - distance / .00017
    return hat_side.uv(px, py)
hat_mesh = Mesh()
def hat_top_uv(angle, fraction):
    # The cap is a tiny cut across the side photo's crown. Keep its UVs inside
    # the dark crown silhouette instead of sampling the pale overhead backdrop.
    px = HAT_CX + math.cos(angle) * fraction * 42
    py = 24 + math.sin(angle) * fraction * 16
    return hat_side.uv(px, py)
lathe(hat_mesh, 'side', (0, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1), HAT_ROWS, hat_uv, sides=24,
      cap_end=('side', hat_top_uv))
finish(hat_mesh, 'ash-hat', {'side': hat_side.material()})

# --- wren-flag: rag outline is traced from the photo; pole radius is measured from it ----
flag_photo = Photo(textures / 'ww-wren-flag.jpg')
flag_solid = tidy(~flag_photo.sky([(12, 12), (flag_photo.w - 12, 12),
                                   (12, flag_photo.h - 12)], grey=26))
FLAG_S = .00040
FLAG_POLE_X = 214
FLAG_BOTTOM = flag_photo.h - 35
flag_mesh = Mesh()
flag_loops = trace(flag_solid, (218, 80, flag_photo.w - 90, 400), tolerance=2.0, min_area=40)
def on_flag(px, py, d):
    return ((px - FLAG_POLE_X) * FLAG_S, (FLAG_BOTTOM - py) * FLAG_S, d)
slab(flag_mesh, 'flag', flag_photo, flag_loops, on_flag, .006, .016, wall_scale=FLAG_S)
# The loose yellow tie is traced as its own small piece, joined at the pole and rag corner.
yellow_loops = trace(flag_solid, (170, 55, 225, 170), tolerance=1.5, min_area=18)
slab(flag_mesh, 'flag', flag_photo, yellow_loops, on_flag, .004, .014, wall_scale=FLAG_S)
pole_rows = []
for py in range(FLAG_BOTTOM, 20, -8):
    row = np.nonzero(flag_solid[py, FLAG_POLE_X - 15:FLAG_POLE_X + 16])[0]
    if len(row) > 1:
        pole_rows.append(((FLAG_BOTTOM - py) * FLAG_S, (row[-1] - row[0] + 1) * FLAG_S / 2))
pole_rows.sort()
def flag_pole_uv(index, distance, radius, angle):
    return flag_photo.uv(FLAG_POLE_X + radius / FLAG_S * .85 * math.cos(angle),
                         FLAG_BOTTOM - distance / FLAG_S)
lathe(flag_mesh, 'flag', (0, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1), pole_rows,
      flag_pole_uv, sides=10)
flag_photo.bleed(flag_solid, passes=20)
finish(flag_mesh, 'wren-flag', {'flag': flag_photo.material()})

# --- regret-door: the donor's body meshes combine door and bonnet with the shell --------
# The game donor inspected is Falcone F42, its plainest classic coupe. Its glTF body
# is one combined shell, so the detached panel is measured from this car-part photo.
regret_door_photo = Photo(textures / 'ww-regret-door.jpg')
regret_door_sky = regret_door_photo.sky([(10, 10), (755, 10), (400, 100)], grey=26)
regret_door_solid = tidy(~regret_door_sky)
regret_door_photo.bleed(regret_door_solid, passes=20)
regret_door_mesh = Mesh()
DOOR_SCALE = 1.1 / 570
def door_world(px, py, d): return ((px - 380) * DOOR_SCALE, (490 - py) * DOOR_SCALE, d)
door_loops = trace(regret_door_solid, (70, 12, 690, 486), tolerance=2.2, min_area=30)
slab(regret_door_mesh, 'door', regret_door_photo, door_loops, door_world, -.025, .025,
     wall_scale=DOOR_SCALE * 3)
finish(regret_door_mesh, 'regret-door', {'door': regret_door_photo.material()})

# --- regret-bonnet: a traced 2 cm top skin, with a separate rust-only underside -----------
bonnet_photo = Photo(textures / 'ww-regret-bonnet.jpg')
bonnet_solid = tidy(~bonnet_photo.sky([(8, 8), (bonnet_photo.w - 8, 8),
                                       (8, bonnet_photo.h - 8)], grey=26))
bonnet_loops = trace(bonnet_solid, (0, 0, bonnet_photo.w, bonnet_photo.h), tolerance=2.0, min_area=100)
bonnet_photo.bleed(shrink(bonnet_solid, 3), passes=24)
all_bonnet_points = [point for loop in bonnet_loops for point in loop]
BX0 = min(p[0] for p in all_bonnet_points); BX1 = max(p[0] for p in all_bonnet_points)
BY0 = min(p[1] for p in all_bonnet_points); BY1 = max(p[1] for p in all_bonnet_points)
BONNET_SCALE = 1.25 / (BX1 - BX0)
BONNET_CX = (BX0 + BX1) * .5
def bonnet_world(px, py, d): return ((px - BONNET_CX) * BONNET_SCALE, .48 + d, (BY0 + BY1 - 2 * py) * BONNET_SCALE)
bonnet_mesh = Mesh()
slab(bonnet_mesh, 'top', bonnet_photo, bonnet_loops, bonnet_world, 0, .02, wall_scale=BONNET_SCALE)
rust_photo = Photo(textures / 'ww-regret-bonnet-rust.jpg')
rust_loops = [[((px - BX0) / (BX1 - BX0) * rust_photo.w,
                (py - BY0) / (BY1 - BY0) * rust_photo.h) for px, py in loop] for loop in bonnet_loops]
def rust_world(px, py, d):
    return bonnet_world(BX0 + px / rust_photo.w * (BX1 - BX0),
                        BY0 + py / rust_photo.h * (BY1 - BY0), d)
slab(bonnet_mesh, 'rust', rust_photo, rust_loops, rust_world, -.002, -.001,
     wall_scale=BONNET_SCALE)
finish(bonnet_mesh, 'regret-bonnet', {'top': bonnet_photo.material(), 'rust': rust_photo.material()})

# --- regret-wheel: old steel wheel measured from its own dead-on photo -------------------
wheel_photo = Photo(textures / 'ww-regret-wheel-photo.jpg')
wheel_solid = tidy(~wheel_photo.sky([(8, 8), (1014, 8), (8, 1014)], grey=26))
wheel_photo.bleed(shrink(wheel_solid, 3), passes=28)
WHEEL_CX, WHEEL_CY = 512, 512
WHEEL_RADIUS_PX = max(WHEEL_CX - np.nonzero(wheel_solid[WHEEL_CY])[0][0],
                      np.nonzero(wheel_solid[:, WHEEL_CX])[0][-1] - WHEEL_CY)
WHEEL_SCALE = .31 / WHEEL_RADIUS_PX
def wheel_face_uv(angle, fraction):
    return wheel_photo.uv(WHEEL_CX - math.cos(angle) * WHEEL_RADIUS_PX * fraction * .94,
                          WHEEL_CY - math.sin(angle) * WHEEL_RADIUS_PX * fraction * .94)
def wheel_tread_uv(index, distance, radius, angle):
    # Wrap a measured tyre rectangle around the roughly 1.95 m circumference.
    around = ((angle % (2 * math.pi)) / (2 * math.pi) * 8.5) % 1
    radial = min(1, max(0, (radius - .29) / .02))
    return wheel_photo.uv(320 + around * 380, 24 + radial * 112)
wheel_mesh = Mesh()
lathe(wheel_mesh, 'wheel', (0, .40, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0),
      [(-.11, .31), (-.085, .31), (-.055, .30), (.055, .30), (.085, .31), (.11, .31)],
      wheel_tread_uv, sides=32,
      cap_start=('wheel', wheel_face_uv), cap_end=('wheel', wheel_face_uv))
finish(wheel_mesh, 'regret-wheel', {'wheel': wheel_photo.material()})

# --- dynamite-box: five thick boards around a real recessed, photographed interior --------
crate_front = Photo(textures / 'ww-dynamite-front.jpg')
crate_top = Photo(textures / 'ww-dynamite-top.jpg')
crate_mesh = Mesh()
front_mat, top_mat = 'crate-front', 'crate-top'
FRONT_PLANK = (112, 205, 912, 620)
SIDE_PLANK = (125, 205, 205, 620)
BACK_PLANK = (818, 205, 900, 620)
TOP_STICKS = (125, 100, 900, 580)
TOP_RIM_FRONT = (80, 16, 940, 72)
TOP_RIM_BACK = (80, 610, 940, 665)
TOP_RIM_LEFT = (18, 72, 78, 610)
TOP_RIM_RIGHT = (944, 72, 1006, 610)
def crate_face(photo, rect, material): return (material, photo, rect)
def crate_panel(rect, faces): box(crate_mesh, *rect, faces)
crate_panel((-.34, .34, .10, .38, .22, .24), {
    '+z': crate_face(crate_front, FRONT_PLANK, front_mat), '-z': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+x': crate_face(crate_front, BACK_PLANK, front_mat), '-x': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+y': crate_face(crate_top, TOP_RIM_FRONT, top_mat), '-y': crate_face(crate_front, SIDE_PLANK, front_mat)})
crate_panel((-.34, .34, .10, .38, -.24, -.22), {
    '-z': crate_face(crate_front, FRONT_PLANK, front_mat), '+z': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+x': crate_face(crate_front, BACK_PLANK, front_mat), '-x': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+y': crate_face(crate_top, TOP_RIM_BACK, top_mat), '-y': crate_face(crate_front, SIDE_PLANK, front_mat)})
crate_panel((-.34, -.32, .10, .38, -.22, .22), {
    '+x': crate_face(crate_front, SIDE_PLANK, front_mat), '-x': crate_face(crate_front, BACK_PLANK, front_mat),
    '+z': crate_face(crate_front, SIDE_PLANK, front_mat), '-z': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+y': crate_face(crate_top, TOP_RIM_LEFT, top_mat), '-y': crate_face(crate_front, SIDE_PLANK, front_mat)})
crate_panel((.32, .34, .10, .38, -.22, .22), {
    '-x': crate_face(crate_front, SIDE_PLANK, front_mat), '+x': crate_face(crate_front, BACK_PLANK, front_mat),
    '+z': crate_face(crate_front, BACK_PLANK, front_mat), '-z': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+y': crate_face(crate_top, TOP_RIM_RIGHT, top_mat), '-y': crate_face(crate_front, SIDE_PLANK, front_mat)})
# The floor is 10 cm below the rim, and its only visible top wears the contents photo.
crate_panel((-.32, .32, .08, .10, -.22, .22), {
    '+y': crate_face(crate_top, TOP_STICKS, top_mat), '-y': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+x': crate_face(crate_front, SIDE_PLANK, front_mat), '-x': crate_face(crate_front, SIDE_PLANK, front_mat),
    '+z': crate_face(crate_front, SIDE_PLANK, front_mat), '-z': crate_face(crate_front, SIDE_PLANK, front_mat)})
finish(crate_mesh, 'dynamite-box', {front_mat: crate_front.material(), top_mat: crate_top.material()})

# --- open-engine: one carved engine block, with a boxed stand and a nest in its exhaust -----
engine_side_photo = Photo(textures / 'ww-open-engine-side.jpg')
engine_end_photo = Photo(textures / 'ww-open-engine-end.jpg')
engine_top_photo = Photo(textures / 'ww-open-engine-top.jpg')
ENGINE_Z0, ENGINE_Z1 = -.65, .65
ENGINE_X0, ENGINE_X1 = -.38, .38
ENGINE_Y0, ENGINE_Y1 = .04, .85
def engine_side_pick(x, y, z):
    return (45 + (z - ENGINE_Z0) / (ENGINE_Z1 - ENGINE_Z0) * 930,
            20 + (ENGINE_Y1 - y) / (ENGINE_Y1 - ENGINE_Y0) * 480)
def engine_end_pick(x, y, z):
    return (30 + (x - ENGINE_X0) / (ENGINE_X1 - ENGINE_X0) * (engine_end_photo.w - 60),
            35 + (ENGINE_Y1 - y) / (ENGINE_Y1 - ENGINE_Y0) * 930)
def engine_top_pick(x, y, z):
    return (30 + (z - ENGINE_Z0) / (ENGINE_Z1 - ENGINE_Z0) * 960,
            18 + (x - ENGINE_X0) / (ENGINE_X1 - ENGINE_X0) * (engine_top_photo.h - 36))
engine_side_view = View('engine-side', engine_side_photo,
    [(8, 8), (1016, 8), (8, 504), (1016, 504)], engine_side_pick, (1, 0, 0))
engine_end_view = View('engine-end', engine_end_photo,
    [(8, 8), (engine_end_photo.w - 8, 8), (8, engine_end_photo.h - 8),
     (engine_end_photo.w - 8, engine_end_photo.h - 8)], engine_end_pick, (0, 0, -1))
engine_top_view = View('engine-top', engine_top_photo,
    [(8, 8), (1016, 8), (8, engine_top_photo.h - 8), (1016, engine_top_photo.h - 8)], engine_top_pick, (0, 1, 0))
ENGINE_VOXEL = .035
engine_solid, engine_xs, engine_ys, engine_zs = occupancy(
    ((ENGINE_X0, ENGINE_X1), (ENGINE_Y0, ENGINE_Y1), (ENGINE_Z0, ENGINE_Z1)),
    ENGINE_VOXEL, [engine_side_view.covers, engine_end_view.covers, engine_top_view.covers])
engine_solid = largest_part(engine_solid)
engine_materials = {'engine-side': engine_side_photo.material(),
                    'engine-end': engine_end_photo.material(),
                    'engine-top': engine_top_photo.material()}
engine_block = carve_hull('open-engine', [engine_side_view, engine_end_view, engine_top_view],
    engine_materials, engine_solid, engine_xs, engine_ys, engine_zs, ENGINE_VOXEL, 3500)
engine_block.parent = root_object
engine_block['part'] = 'open-engine'
engine_block.data.uv_layers[0].name = 'UVMap'
engine_block.data.calc_loop_triangles()
triangles['open-engine'] = len(engine_block.data.loop_triangles)
for photo, view, seeds in ((engine_side_photo, engine_side_view, [(8, 8), (1016, 8), (8, 504), (1016, 504)]),
                           (engine_end_photo, engine_end_view, [(8, 8), (1016, 8), (8, 1016), (1016, 1016)]),
                           (engine_top_photo, engine_top_view, [(8, 8), (1016, 8), (8, engine_top_photo.h - 8), (1016, engine_top_photo.h - 8)])):
    photo.bleed(view.mask, passes=20)

# Four box feet and upright posts hold the block, with no wide plate faces.
stand_mesh = Mesh()
STAND_RECT = ('engine-side', engine_side_photo, (650, 410, 900, 486))
stand_faces = {key: STAND_RECT for key in ('+z', '-z', '+x', '-x', '+y', '-y')}
box(stand_mesh, -.48, -.38, 0, .07, -.55, .55, stand_faces)
box(stand_mesh, .38, .48, 0, .07, -.55, .55, stand_faces)
for x0, x1 in ((-.44, -.38), (.38, .44)):
    for z0, z1 in ((-.49, -.42), (.42, .49)):
        box(stand_mesh, x0, x1, .07, .46, z0, z1, stand_faces)
stand_obj = finish(stand_mesh, 'open-engine-stand', {'engine-side': engine_side_photo.material()})

# A short open exhaust tube is fixed to the right side; the twig bundle touches its lip.
pipe_mesh = Mesh()
def engine_pipe_uv(index, distance, radius, angle):
    return engine_side_photo.uv(600 + distance / .20 * 100,
                                305 + math.sin(angle) * radius / .08 * 70)
lathe(pipe_mesh, 'engine-side', (.30, .45, -.28), (1, 0, 0), (0, 0, 1), (0, 1, 0),
      [(0, .08), (.03, .085), (.18, .075)], engine_pipe_uv, sides=16)
pipe_obj = finish(pipe_mesh, 'open-engine-exhaust', {'engine-side': engine_side_photo.material()})
twig_mesh = Mesh()
for k in range(8):
    angle = 2 * math.pi * k / 8
    dy, dz = math.cos(angle), math.sin(angle)
    origin = (.48, .45 - .075 * dy, -.28 - .075 * dz)
    lathe(twig_mesh, 'engine-side', origin, (0, dy, dz), (1, 0, 0), (0, -dz, dy),
          [(0, .004), (.15, .0025)], engine_pipe_uv, sides=6)
nest_obj = finish(twig_mesh, 'open-engine-nest', {'engine-side': engine_side_photo.material()})

# --- regret-engine: a 70% tilted copy, with one measured scrub tree through the block ------
regret_root = bpy.data.objects.new('regret-engine', None)
scene.collection.objects.link(regret_root)
regret_root.parent = root_object
regret_root.location = (1.25, 0, 0)
regret_root.rotation_euler[1] = math.radians(7)
regret_root.scale = (.70, .70, .70)
for source in (engine_block, stand_obj, pipe_obj, nest_obj):
    clone = source.copy()
    clone.data = source.data
    scene.collection.objects.link(clone)
    clone.name = 'regret-engine-' + source.name
    clone.parent = regret_root
    clone.matrix_parent_inverse.identity()
    clone.location = source.location.copy()
    clone.rotation_euler = source.rotation_euler.copy()
    clone.scale = source.scale.copy()

tree_photo = Photo(textures / 'ww-regret-engine-tree.jpg')
tree_solid = tidy(~tree_photo.sky([(8, 8), (tree_photo.w - 8, 8),
                                   (8, tree_photo.h - 8)], grey=26))
tree_photo.bleed(shrink(tree_solid, 3), passes=24)
tree_mesh = Mesh()
TREE_CX = int(tree_photo.w * .47)
TREE_GROUND, TREE_CROWN_BASE = tree_photo.h - 20, int(tree_photo.h * .42)
TREE_S = .82 / (TREE_GROUND - TREE_CROWN_BASE)
tree_stations = []
for py in range(TREE_GROUND, TREE_CROWN_BASE, -8):
    row = np.nonzero(tree_solid[py, max(0, TREE_CX - 32):min(tree_photo.w, TREE_CX + 33)])[0]
    if len(row):
        radius = max(TREE_CX - (max(0, TREE_CX - 32) + row[0]),
                     (max(0, TREE_CX - 32) + row[-1]) - TREE_CX)
        tree_stations.append(((TREE_GROUND - py) * TREE_S, max(2, radius) * TREE_S * .60))
if len(tree_stations) < 2:
    tree_stations = [(0, .035), (.4, .025), (.82, .012)]
def tree_trunk_uv(index, distance, radius, angle):
    return tree_photo.uv(TREE_CX + math.cos(angle) * radius / TREE_S / .60,
                         TREE_GROUND - distance / TREE_S)
lathe(tree_mesh, 'tree', (0, .40, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
      sorted(tree_stations), tree_trunk_uv, sides=12,
      cap_start=('tree', lambda a, f: tree_photo.uv(TREE_CX + math.cos(a) * 18 * f, TREE_GROUND - 4)),
      cap_end=('tree', lambda a, f: tree_photo.uv(TREE_CX + math.cos(a) * 10 * f, TREE_CROWN_BASE + 70)))
tree_root_obj = finish(tree_mesh, 'regret-engine-tree', {'tree': tree_photo.material()})
tree_root_obj.parent = regret_root
tree_root_obj.location = (0, 0, 0)

leaves_mesh = Mesh()
leaf_mask = tree_solid.copy()
leaf_mask[int(tree_photo.h * .51):] = False
leaf_world_scale = .0010
def on_tree_leaf(px, py, depth):
    z = (px - TREE_CX) * leaf_world_scale
    y = 1.05 + (TREE_CROWN_BASE - py) * leaf_world_scale
    return (depth, y, z)
leaf_loops = trace(leaf_mask, (0, 0, tree_photo.w, int(tree_photo.h * .51)), tolerance=2.0, min_area=180)
for depth in (-.06, .06):
    slab(leaves_mesh, 'leaves', tree_photo, leaf_loops, on_tree_leaf, depth, depth + .012,
         wall_scale=leaf_world_scale)
leaves_obj = finish(leaves_mesh, 'regret-engine-leaves', {'leaves': tree_photo.material()})
leaves_obj.parent = regret_root
leaves_obj.location = (0, 0, 0)
triangles['regret-engine'] = sum(triangles.pop(k, 0) for k in ('regret-engine-tree', 'regret-engine-leaves'))
triangles['regret-engine'] += sum(len(o.data.loop_triangles) if o.type == 'MESH' else 0
                                  for o in (engine_block, stand_obj, pipe_obj, nest_obj))


print('TRIANGLES=' + json.dumps(triangles))
for layer_object in scene.objects:
    if layer_object.type == 'MESH':
        layer_object.data.uv_layers[0].name = 'UVMap'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)

# --- Render from the exported file, in an empty scene ---------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('flat overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.85, .85, .85, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = .4
sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(-30))
scene.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
ground = bpy.context.object
ground_material = bpy.data.materials.new('ground')
ground_material.use_nodes = True
ground_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.66, .62, .56, 1)
ground_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(ground_material)
camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
scene.collection.objects.link(camera)
scene.camera = camera
part_names = ('jax-harpoon', 'piano-upright', 'gerald', 'gerald-box', 'ash-hat', 'wren-flag', 'regret-door', 'regret-wheel', 'dynamite-box', 'regret-bonnet', 'open-engine', 'regret-engine')
parts = {name: next(o for o in bpy.data.objects if o.name.startswith(name)) for name in part_names}

def shot(name, subject, eye, target, width, height, ortho=None, lens=50, show_ground=True):
    for key, obj in parts.items():
        for piece in scene.objects:
            if piece.name.startswith(key):
                piece.hide_render = key != subject
    ground.hide_render = not show_ground
    scene.render.resolution_x, scene.render.resolution_y = width, height
    eye_v, target_v = Vector((eye[0], -eye[2], eye[1])), Vector((target[0], -target[2], target[1]))
    camera.location = eye_v
    forward = (target_v - eye_v).normalized()
    camera.rotation_euler = forward.to_track_quat('-Z', 'Y').to_euler()
    if abs(forward.z) > .99:
        camera.rotation_euler = (0, 0, 0)
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = lens
    scene.render.filepath = str(render_dir / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('harpoon', 'jax-harpoon', (0, 0, 8), (0, 0, 0), 1400, 467, ortho=2.8, show_ground=False)
shot('harpoon-quarter', 'jax-harpoon', (1.9, .5, 1.5), (.65, 0, 0), 1000, 620, lens=35, show_ground=False)
shot('piano', 'piano-upright', (0, .65, 8), (0, .65, 0), 900, 780, ortho=1.62)
shot('piano-left', 'piano-upright', (-2.1, 1.3, 3.1), (0, .62, .3), 900, 780, lens=45)
shot('piano-right', 'piano-upright', (2.1, 1.3, 3.1), (0, .62, .3), 900, 780, lens=45)
shot('gerald-top', 'gerald', (.15, 2, 0), (.15, 0, 0), 1000, 460, ortho=.68)
shot('gerald-side', 'gerald', (.15, .07, 3), (.15, .07, 0), 1000, 250, ortho=.68)
shot('gerald-quarter', 'gerald', (-.45, .36, .75), (-.02, .04, 0), 1000, 620, lens=50)
shot('gerald-box', 'gerald-box', (0, .11, 1.4), (0, .11, 0), 900, 650, ortho=.43)
shot('gerald-box-quarter', 'gerald-box', (-.50, .50, .85), (0, .10, 0), 900, 650, lens=50)
shot('ash-hat', 'ash-hat', (0, .06, 1.2), (0, .06, 0), 900, 650, ortho=.25, show_ground=False)
shot('ash-hat-quarter', 'ash-hat', (-.28, .25, .48), (0, .04, 0), 900, 650, lens=50, show_ground=False)
shot('wren-flag', 'wren-flag', (.02, .22, 1.3), (.02, .22, 0), 900, 700, ortho=.48, show_ground=False)
shot('wren-flag-quarter', 'wren-flag', (-.23, .38, .72), (.02, .22, 0), 900, 700, lens=50, show_ground=False)
shot('regret-door', 'regret-door', (0, .42, 2.0), (0, .42, 0), 1000, 700, ortho=1.35, show_ground=False)
shot('regret-door-quarter', 'regret-door', (-.9, .52, 1.7), (0, .42, 0), 1000, 700, lens=50, show_ground=False)
shot('regret-wheel', 'regret-wheel', (1.25, .4, 0), (0, .4, 0), 900, 900, ortho=1.08, show_ground=False)
shot('regret-wheel-quarter', 'regret-wheel', (1.8, .9, 1.4), (0, .4, 0), 900, 700, lens=50, show_ground=False)
shot('dynamite-box', 'dynamite-box', (0, .23, 1.7), (0, .23, 0), 900, 650, ortho=.88)
shot('dynamite-box-quarter', 'dynamite-box', (-.9, 1.3, .9), (0, .18, 0), 900, 650, lens=50)
shot('dynamite-box-top', 'dynamite-box', (0, 1.5, 0), (0, .18, 0), 900, 900, ortho=.86)
shot('regret-bonnet', 'regret-bonnet', (0, 2.1, 0), (0, .48, 0), 900, 700, ortho=1.5, show_ground=False)
shot('regret-bonnet-quarter', 'regret-bonnet', (-1.4, 1.3, 1.3), (0, .48, 0), 900, 700, lens=50, show_ground=False)
shot('regret-bonnet-under', 'regret-bonnet', (0, -1.1, 1.3), (0, .48, 0), 900, 700, lens=50, show_ground=False)
shot('open-engine', 'open-engine', (2.1, .9, .3), (0, .42, 0), 1000, 700, lens=50)
shot('open-engine-quarter', 'open-engine', (1.7, 1.3, -1.5), (0, .42, 0), 1000, 700, lens=50)
shot('open-engine-top', 'open-engine', (0, 1.9, 0), (0, .42, 0), 900, 650, ortho=1.8)
shot('regret-engine', 'regret-engine', (3.2, 1.1, .2), (1.25, .45, 0), 1000, 700, lens=50)
shot('regret-engine-quarter', 'regret-engine', (2.8, 1.3, -1.4), (1.25, .45, 0), 1000, 700, lens=50)
