"""Build WW-ART-PEACE's four measured props from their generated photos."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-peace')
parser.add_argument('--round4-only', action='store_true',
                    help='render only the new sal-pipe-trailer review frames')
parser.add_argument('--round6-only', action='store_true',
                    help='render only the new dust-tanker review frames')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
textures = root / 'public/assets/models/wasteland/town/textures'
glb = root / 'public/assets/models/wasteland/town/peace-props.glb'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
if args.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/town-peace-props.blend')],
                      'glb': [str(glb)], 'evidence': [], 'renders': [str(render_dir)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Mesh, Photo, box as photo_box, trace, slab, lathe, shrink
from hull_model import View, occupancy, largest_part, carve_hull
import town_base as town

def game_vector(p):
    return Vector((p[0], -p[2], p[1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'

def root_part(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj

def own(obj, parent, part):
    obj.parent = parent
    obj['part'] = part
    return obj

LOADED_PHOTOS = {}
def measured_photo(name):
    photo = Photo(textures / f'peace-{name}.jpg')
    LOADED_PHOTOS[name] = photo
    return photo

def seed_points(photo):
    return [(3, 3), (photo.w-4, 3), (3, photo.h-4), (photo.w-4, photo.h-4)]

def fit(photo, px0, px1, world0, world1):
    return lambda px: world0 + (px-px0)*(world1-world0)/(px1-px0)

# 1. Mirage's convincing front and plainly wooden side.
front = measured_photo('billboard-front')
back = measured_photo('billboard-back')
billboard = root_part('mirage-billboard')
frontmat, backmat = front.material(.95), back.material(.95)
board = Mesh()
photo_box(board, -4, 4, 1.9, 4.55, -.09, .09, {
    '+z': ('front', front, (0, 0, front.w, front.h)),
    '-z': ('back', back, (40, 42, 984, 288)),
    '+x': ('back', back, (128, 64, 142, 285)),
    '-x': ('back', back, (868, 64, 882, 285)),
    '+y': ('back', back, (40, 42, 984, 60)),
    '-y': ('back', back, (40, 270, 984, 288)),
})
own(board.finish('mirage-billboard:painted-board', {'front': frontmat, 'back': backmat}), billboard,
    'mirage-billboard:painted-board')
for side, cx, px in (('left', -3.15, 134), ('right', 3.15, 874)):
    post = Mesh()
    photo_box(post, cx-.13, cx+.13, 0, 4.7, -.16, .16, {
        '+z': ('back', back, (px-12, 70, px+12, 285)),
        '-z': ('back', back, (px-12, 70, px+12, 285)),
        '+x': ('back', back, (px-5, 70, px+5, 285)),
        '-x': ('back', back, (px-5, 70, px+5, 285)),
        '+y': ('back', back, (px-8, 48, px+8, 70)),
        '-y': ('back', back, (px-8, 270, px+8, 288)),
    })
    own(post.finish(f'mirage-billboard:rough-pole-{side}', {'back': backmat}), billboard,
        f'mirage-billboard:rough-pole-{side}')

# Shared hull builder: photo coordinates are measured and scaled in memory.
def carve(identifier, photo_names, bounds, voxel, transforms, target, trims=None):
    photos = {key: measured_photo(value) for key, value in photo_names.items()}
    views=[]
    for key,photo in photos.items():
        pick,normal=transforms[key]
        views.append(View(key, photo, seed_points(photo), pick, normal,
                          solid=(trims or {}).get(key), grey=20,tolerance=20))
    tests=[v.covers for v in views]
    solid,xs,ys,zs=occupancy(bounds,voxel,tests)
    solid=largest_part(solid)
    for view in views:
        view.photo.bleed(view.mask)
    return carve_hull(identifier,views,{k:photos[k].material(.86) for k in photos},
                      solid,xs,ys,zs,voxel,target)

# 2. Gunn's unnervingly pristine turret, all from its side photo at one true scale.
# Its barrel points to -X. The photo's right half has no barrel, so the turned body
# wears that half on every side.
ts, tt = measured_photo('turret-side'), measured_photo('turret-top')
turret = root_part('gunn-turret')
ts_solid = ~ts.sky(seed_points(ts), tolerance=20, grey=22)
ts.bleed(ts_solid)
T_SCALE, T_AXIS, T_GROUND = 3.0 / 523, 433, 587
def turret_y(py): return (T_GROUND - py) * T_SCALE
# Radius in the photo's pixels against height: a smooth turned body, not its bumps.
BODY_PROFILE = ((587, 262), (505, 262), (494, 252), (488, 222), (474, 222), (442, 232), (232, 232), (206, 206),
                (196, 188), (178, 188), (160, 120), (136, 62), (124, 30))
profile = [(turret_y(py), radius * T_SCALE) for py, radius in BODY_PROFILE]
def turret_body_uv(index, distance, radius, angle):
    # Read straight across the photo, so that from the side it shows just what the photo shows.
    arc = math.degrees(math.asin(math.sin(angle))) / 90
    py = T_GROUND - distance / T_SCALE
    # The turret's top disc sits off to the right in the photo, and is narrower.
    if py < 204:
        return ts.uv(515 + radius / T_SCALE * .52 * arc, py)
    return ts.uv(T_AXIS + radius / T_SCALE * .9 * arc, py)
def turret_top_uv(angle, fraction):
    return tt.uv(tt.w / 2 + math.cos(angle) * fraction * 120, tt.h / 2 + math.sin(angle) * fraction * 120)
body = Mesh()
lathe(body, 'side', (0, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0), profile, turret_body_uv, sides=48,
      cap_end=('top', turret_top_uv))
own(body.finish('gunn-turret:turned-body', {'side': ts.material(.24), 'top': tt.material(.24)}), turret, 'gunn-turret:turned-body')
# One barrel, its width read column by column from the same photo.
T_BARREL_PY = 299
barrel_stations = []
for px in range(300, 24, -10):
    rows = np.flatnonzero(ts_solid[235:365, px])
    if len(rows):
        barrel_stations.append(((T_AXIS - px) * T_SCALE, (rows[-1] - rows[0]) / 2 * T_SCALE))
def barrel_uv(index, distance, radius, angle):
    return ts.uv(T_AXIS - distance / T_SCALE, T_BARREL_PY - math.sin(angle) * radius / T_SCALE * .86)
def bore_uv(angle, fraction):
    return ts.uv(150 + math.cos(angle) * fraction * 4, 300 + math.sin(angle) * fraction * 4)
bore = bpy.data.materials.new('dark recessed bore')
bore.use_nodes = True
bore.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.008, .009, .012, 1)
barrel = Mesh()
lathe(barrel, 'side', (0, turret_y(T_BARREL_PY), 0), (-1, 0, 0), (0, 0, 1), (0, 1, 0), barrel_stations, barrel_uv, sides=28,
      cap_end=('bore', bore_uv))
own(barrel.finish('gunn-turret:single-barrel', {'side': ts.material(.24), 'bore': bore}), turret, 'gunn-turret:single-barrel')
# Three huge bolts, standing out of the base rim, each wearing the photo's own bolt.
T_BASE_RADIUS = 261 * T_SCALE
for index, theta in enumerate((math.pi / 2, math.pi / 2 + 2 * math.pi / 3, math.pi / 2 + 4 * math.pi / 3)):
    out = (math.sin(theta), 0, math.cos(theta))
    across = (math.cos(theta), 0, -math.sin(theta))
    origin = (out[0] * (T_BASE_RADIUS - .03), turret_y(542), out[2] * (T_BASE_RADIUS - .03))
    bolt = Mesh()
    head = lambda a, f: ts.uv(435 + math.cos(a) * f * 27, 542 + math.sin(a) * f * 27)
    rim = lambda i, d, r, a: ts.uv(435 + math.cos(a) * 27, 542 + math.sin(a) * 27)
    lathe(bolt, 'side', origin, out, across, (0, 1, 0), [(0, .15), (.13, .15)], rim, sides=6, cap_end=('side', head))
    own(bolt.finish(f'gunn-turret:base-bolt-{index + 1}', {'side': ts.material(.24)}), turret, f'gunn-turret:base-bolt-{index + 1}')

# 3. Gunn's rock changes from bullet-scarred to untouched on its far side.
rock=root_part('gunn-rock')
rs,ru=measured_photo('rock-scarred'),measured_photo('rock-untouched')
def rock_side(x,y,z): return (rs.w/2+x/3.0*rs.w*.95, 541-y/1.35*472)
def rock_other(x,y,z): return (ru.w/2-x/3.0*ru.w*.95, 541-y/1.35*472)
def rock_front(x,y,z): return (rs.w/2+z/2.0*rs.w*.72, 541-y/1.35*472)
def rock_top(x,y,z): return (ru.w/2+x/3.0*ru.w*.95, ru.h/2-z/2.0*540)
rockmesh=carve('gunn-rock:photo-carved-boulder',
    {'scarred':'rock-scarred','untouched':'rock-untouched','front':'rock-untouched','top':'rock-untouched'},
    ((-1.5,1.5),(0,1.35),(-1.0,1.0)),.05,
    {'scarred':(rock_side,(0,0,1)),'untouched':(rock_other,(0,0,-1)),
     'front':(rock_front,(1,0,0)),'top':(rock_top,(0,1,0))},7000)
own(rockmesh,rock,'gunn-rock:photo-carved-boulder')

# 4. Kettle's chair, from its side photo at one true scale. Each part stands on its own
# plane: the feet in the middle, an arm on each side, and the lamp and tools on one side.
cs = measured_photo('chair-side')
chair = root_part('kettles-chair')
chair_solid = ~cs.sky(seed_points(cs) + [(300, 290), (395, 300), (305, 150), (200, 300)], tolerance=20, grey=22)
cs.bleed(chair_solid, passes=40)
C_SCALE = 3.2 / 590
def CX(px): return (px - 312) * C_SCALE
def CY(py): return (604 - py) * C_SCALE
def on_chair(px, py, d): return (CX(px), CY(py), d)
LEATHER = ('side', cs, (250, 320, 400, 348))
BACK_LEATHER = ('side', cs, (192, 150, 226, 318))
IRON = ('side', cs, (226, 356, 400, 372))
chair_mesh = Mesh()
def chair_part(rect, z0, z1, min_area=30):
    loops = trace(chair_solid, rect, tolerance=1.1, min_area=min_area)
    # Walls read a short way in from the edge, so they show real material, never sky.
    slab(chair_mesh, 'side', cs, loops, on_chair, z0, z1, wall_scale=abs(z1 - z0) / 14)
chair_part((118, 405, 482, 620), -.24, .24)
chair_part((158, 72, 192, 378), -.14, .14)
chair_part((170, 72, 208, 134), -.26, .26)
for sign in (1, -1):
    z0, z1 = sorted((sign * .38, sign * .46))
    chair_part((238, 248, 380, 346), z0, z1)
chair_part((283, 4, 495, 200), .50, .58)
chair_part((362, 200, 495, 415), .50, .58)
# Seat and back cushion follow their real outlines, and stand between the arms.
chair_part((222, 316, 408, 376), -.40, .40)
chair_part((184, 138, 234, 326), -.36, .36)
# The pedestal, its width read row by row.
pedestal_rows = []
for py in range(530, 372, -8):
    columns = np.flatnonzero(chair_solid[py, 262:342])
    if len(columns):
        pedestal_rows.append((CY(py), min(38, (columns[-1] - columns[0]) / 2) * C_SCALE))
def pedestal_uv(index, distance, radius, angle):
    arc = math.degrees(math.asin(math.sin(angle))) / 90
    return cs.uv(302 + radius / C_SCALE * .84 * arc, 604 - distance / C_SCALE)
lathe(chair_mesh, 'side', (CX(302), 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0), pedestal_rows, pedestal_uv, sides=20)
own(chair_mesh.finish('kettles-chair:body', {'side': cs.material(.72)}), chair, 'kettles-chair:body')

# 5. Toll's filing cabinet, mapped from dead-on front and side photographs.
cab_front, cab_side = measured_photo('toll-cabinet-front'), measured_photo('toll-cabinet-side')
cabinet = root_part('toll-cabinet')
front_solid = ~cab_front.sky(seed_points(cab_front), tolerance=20, grey=22)
side_solid = ~cab_side.sky(seed_points(cab_side), tolerance=20, grey=22)
cab_front.bleed(front_solid, passes=32)
cab_side.bleed(side_solid, passes=32)
cabinet_mesh = Mesh()
cab_front_mat, cab_side_mat = cab_front.material(.86), cab_side.material(.86)
# A true 1.8 m high cabinet, with the photographed outline traced into a thin
# front shell. The case carries real depth and the drawer is a second box.
cab_width = .80
cab_scale = cab_width / (519 - 173)
cab_y = lambda py: (1006 - py) * 1.8 / (1006 - 16)
cab_x = lambda px: (px - 346) * cab_scale
front_loops = trace(front_solid, (171, 15, 520, 1010), tolerance=1.3, min_area=30)
slab(cabinet_mesh, 'front', cab_front, front_loops,
     lambda px, py, d: (cab_x(px), cab_y(py), d), .355, .395, wall_scale=.01)
own(cabinet_mesh.finish('toll-cabinet:photographed-front', {'front': cab_front_mat}),
    cabinet, 'toll-cabinet:photographed-front')
case = Mesh()
# Sample only steel from the side photograph; no background pixels reach a side.
photo_box(case, -.39, .39, 0, 1.8, -.34, .34, {
    '-z': ('steel', cab_side, (240, 260, 465, 800)),
    '+x': ('steel', cab_side, (240, 260, 465, 800)),
    '-x': ('steel', cab_side, (240, 260, 465, 800)),
    '+y': ('steel', cab_side, (250, 30, 465, 55)),
    '-y': ('steel', cab_side, (250, 980, 465, 1010)),
})
own(case.finish('toll-cabinet:steel-case', {'steel': cab_side_mat}), cabinet,
    'toll-cabinet:steel-case')
# The open drawer stands out from the traced opening as an unmistakable box.
drawer = Mesh()
photo_box(drawer, -.39, .39, cab_y(952), cab_y(695), .34, .88, {
    '+z': ('front', cab_front, (173, 463, 519, 635)),
    '-z': ('steel', cab_side, (560, 440, 810, 620)),
    '+x': ('steel', cab_side, (560, 440, 810, 620)),
    '-x': ('steel', cab_side, (560, 440, 810, 620)),
    '+y': ('steel', cab_side, (560, 430, 810, 455)),
    '-y': ('steel', cab_side, (560, 605, 810, 625)),
})
own(drawer.finish('toll-cabinet:open-drawer-box', {'front': cab_front_mat, 'steel': cab_side_mat}),
    cabinet, 'toll-cabinet:open-drawer-box')

# 6. Bound's rough warning, with its deliberately hand-painted words intact.
sign_photo = measured_photo('bound-sign-front')
sign_solid = ~sign_photo.sky(seed_points(sign_photo), tolerance=20, grey=22)
sign_photo.bleed(sign_solid, passes=24)
sign = root_part('bound-sign')
sign_mat = sign_photo.material(.9)
SIGN_X = 1.35 / (820 - 150)
SIGN_Y = 2.15 / (1004 - 17)
def sign_world(px, py, d):
    return ((px - 486) * SIGN_X, (1004 - py) * SIGN_Y, d)
sign_mesh = Mesh()
sign_outline = trace(sign_solid, (150, 84, 820, 550), tolerance=1.2, min_area=30)
slab(sign_mesh, 'paint', sign_photo, sign_outline, sign_world, .025, .095, wall_scale=.01)
own(sign_mesh.finish('bound-sign:hand-painted-board', {'paint': sign_mat}), sign,
    'bound-sign:hand-painted-board')
post = Mesh()
wood_crop = (430, 700, 515, 995)
photo_box(post, -.105, .105, 0, 2.15, -.09, .02, {
    '+z': ('wood', sign_photo, wood_crop),
    '-z': ('wood', sign_photo, wood_crop),
    '+x': ('wood', sign_photo, wood_crop),
    '-x': ('wood', sign_photo, wood_crop),
    '+y': ('wood', sign_photo, wood_crop),
    '-y': ('wood', sign_photo, wood_crop),
})
own(post.finish('bound-sign:crooked-post', {'wood': sign_mat}), sign, 'bound-sign:crooked-post')

# 7. Bound's squat one-metre marker, carved from its front and side photos.
stone_front, stone_side = measured_photo('bound-stone-front'), measured_photo('bound-stone-side')
stone = root_part('bound-stone')
def stone_front_pick(x, y, z):
    return (stone_front.w / 2 + x / 1.2 * stone_front.w * .90,
            812 - y * (812 - 22),)
def stone_side_pick(x, y, z):
    return (stone_side.w / 2 + z / .7 * stone_side.w * .90,
            812 - y * (812 - 22),)
stone_mesh = carve('bound-stone:smiley-crossed-tools-marker',
    {'front': 'bound-stone-front', 'side': 'bound-stone-side'},
    ((-.6, .6), (0, 1.0), (-.35, .35)), .05,
    {'front': (stone_front_pick, (0, 0, 1)), 'side': (stone_side_pick, (1, 0, 0))}, 7000)
own(stone_mesh, stone, 'bound-stone:smiley-crossed-tools-marker')

# 8. Mirage's painted army tent: two rigid boards reveal the trick in profile.
tent_photo = measured_photo('decoy-tent-front')
tent_photo.bleed(np.ones((tent_photo.h, tent_photo.w), dtype=bool), passes=1)
tent = root_part('mirage-decoy-tent')
tent_paint = tent_photo.material(.9)
tent_board_mesh = Mesh()
photo_box(tent_board_mesh, -3.2, 3.2, .45, 4.65, -.08, .08, {
    '+z': ('paint', tent_photo, (0, 0, tent_photo.w, tent_photo.h)),
    '-z': ('timber', back, (40, 42, 984, 288)),
    '+x': ('timber', back, (868, 64, 882, 285)),
    '-x': ('timber', back, (128, 64, 142, 285)),
    '+y': ('timber', back, (40, 42, 984, 60)),
    '-y': ('timber', back, (40, 270, 984, 288)),
})
own(tent_board_mesh.finish('mirage-decoy-tent:large-painted-board',
    {'paint': tent_paint, 'timber': backmat}), tent, 'mirage-decoy-tent:large-painted-board')
small_board = Mesh()
photo_box(small_board, 2.5, 6.0, .85, 3.15, -.34, -.20, {
    '+z': ('paint', tent_photo, (565, 84, 1024, 615)),
    '-z': ('timber', back, (40, 42, 984, 288)),
    '+x': ('timber', back, (868, 64, 882, 285)),
    '-x': ('timber', back, (128, 64, 142, 285)),
    '+y': ('timber', back, (40, 42, 984, 60)),
    '-y': ('timber', back, (40, 270, 984, 288)),
})
own(small_board.finish('mirage-decoy-tent:smaller-rear-board',
    {'paint': tent_paint, 'timber': backmat}), tent, 'mirage-decoy-tent:smaller-rear-board')
for side, cx, px in (('left', -3.05, 134), ('right', 3.05, 874)):
    pole = Mesh()
    photo_box(pole, cx-.13, cx+.13, 0, 4.75, -.22, -.08, {
        '+z': ('timber', back, (px-12, 70, px+12, 285)),
        '-z': ('timber', back, (px-12, 70, px+12, 285)),
        '+x': ('timber', back, (px-5, 70, px+5, 285)),
        '-x': ('timber', back, (px-5, 70, px+5, 285)),
        '+y': ('timber', back, (px-8, 48, px+8, 70)),
        '-y': ('timber', back, (px-8, 270, px+8, 288)),
    })
    own(pole.finish(f'mirage-decoy-tent:rough-pole-{side}', {'timber': backmat}), tent,
        f'mirage-decoy-tent:rough-pole-{side}')

# 9. Mirage's badly drawn oasis on a thin, pegged blue tarp.
tarp_photo = measured_photo('decoy-oasis-overhead')
tarp_outline = ((88, 112), (145, 119), (230, 112), (340, 115), (480, 113),
                (620, 111), (755, 104), (870, 105), (915, 116), (920, 190),
                (916, 285), (922, 385), (918, 500), (923, 615), (916, 705),
                (900, 735), (820, 743), (710, 740), (600, 748), (480, 751),
                (350, 745), (230, 751), (140, 743), (95, 735), (82, 700),
                (87, 600), (82, 500), (86, 400), (80, 300), (84, 210))
grid_x = np.arange(tarp_photo.w)[None, :]
grid_y = np.arange(tarp_photo.h)[:, None]
tarp_solid = np.zeros((tarp_photo.h, tarp_photo.w), dtype=bool)
for i, (x0, y0) in enumerate(tarp_outline):
    x1, y1 = tarp_outline[(i + 1) % len(tarp_outline)]
    cross = ((y0 > grid_y) != (y1 > grid_y)) & \
            (grid_x < (x1 - x0) * (grid_y - y0) / (y1 - y0 or 1) + x0)
    tarp_solid ^= cross
tarp_photo.bleed(tarp_solid, passes=32)
oasis = root_part('mirage-decoy-oasis')
tarp_mat = tarp_photo.material(.92)
TARP_X = 2.8 / (925 - 80)
TARP_Z = 2.15 / (755 - 95)
def tarp_world(px, py, height):
    return ((px - 502.5) * TARP_X, height, (425 - py) * TARP_Z)
tarp_mesh = Mesh()
tarp_loops = trace(tarp_solid, (70, 85, 940, 770), tolerance=1.8, min_area=80)
slab(tarp_mesh, 'blue-paint', tarp_photo, tarp_loops, tarp_world, .008, .026, wall_scale=.004)
own(tarp_mesh.finish('mirage-decoy-oasis:traced-thin-tarpaulin', {'blue-paint': tarp_mat}),
    oasis, 'mirage-decoy-oasis:traced-thin-tarpaulin')
# Small triangular folds lift the photographed corners off the sand.
folds = (
    ((110, 130), (220, 155), (135, 235)),
    ((900, 128), (800, 155), (882, 235)),
    ((900, 722), (800, 695), (875, 620)),
    ((108, 722), (210, 695), (130, 620)),
)
for index, points in enumerate(folds, 1):
    fold = Mesh()
    vertices = [tarp_world(*points[0], .12)] + [tarp_world(*point, .025) for point in points[1:]]
    fold.face(vertices, [tarp_photo.uv(*point) for point in points], 'paint', (0, 1, 0))
    own(fold.finish(f'mirage-decoy-oasis:lifted-corner-{index}', {'paint': tarp_mat}), oasis,
        f'mirage-decoy-oasis:lifted-corner-{index}')
stake_mat = bpy.data.materials.new('Mirage / rusty tent stakes')
stake_mat.diffuse_color = (.23, .19, .14, 1)
stake_mat.use_nodes = True
stake_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.12, .10, .075, 1)
stake_mat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .55
stake_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .82
rope_mat = bpy.data.materials.new('Mirage / dusty guy line')
rope_mat.diffuse_color = (.53, .43, .30, 1)
rope_mat.use_nodes = True
rope_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.38, .28, .17, 1)
rope_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .95
for index, (sx, sz) in enumerate(((-1.55, -1.28), (1.55, -1.28),
                                  (1.55, 1.28), (-1.55, 1.28)), 1):
    peg = town.cube(f'mirage-decoy-oasis:rusty-peg-{index}', (sx, .05, sz),
                    (.04, .08, .04), stake_mat, bevel=0)
    own(peg, oasis, f'mirage-decoy-oasis:rusty-peg-{index}')
    corner = (math.copysign(1.4, sx), .025, math.copysign(1.075, sz))
    line = town.beam(f'mirage-decoy-oasis:guy-line-{index}', corner,
                     (sx, .08, sz), .014, rope_mat)
    own(line, oasis, f'mirage-decoy-oasis:guy-line-{index}')

# Sal's pickup and sagging pipe trailer. The body is the only solid carved
# hull; the frame, hitch, wheels and photographed pipe box remain distinct.
sal_photos = {key: measured_photo(f'sal-pipe-trailer-{key}')
              for key in ('side', 'front', 'rear', 'overhead')}
# Hull bleeding changes only these copies; fine parts keep untouched photos.
sal_details = {key: Photo(textures / f'peace-sal-pipe-trailer-{key}.jpg')
               for key in ('side', 'front', 'rear', 'overhead')}
sal = root_part('sal-pipe-trailer')
sal_side, sal_front = sal_photos['side'], sal_photos['front']
sal_rear, sal_top = sal_photos['rear'], sal_photos['overhead']
SAL_LENGTH = 12.0
SAL_SIDE_X0, SAL_SIDE_X1, SAL_GROUND = 38, 986, 334
SAL_SCALE = SAL_LENGTH / (SAL_SIDE_X1 - SAL_SIDE_X0)
SAL_Z0 = -SAL_LENGTH / 2
SAL_WIDTH = 2.55
SAL_HEIGHT = 2.55
SAL_END_CX, SAL_END_GROUND, SAL_END_SPAN = 253, 435, 345
SAL_END_SCALE = SAL_WIDTH / SAL_END_SPAN
SAL_TOP_X0, SAL_TOP_X1, SAL_TOP_MID, SAL_TOP_WIDTH = 47, 968, 248, 342
SAL_TOP_SCALE = SAL_LENGTH / (SAL_TOP_X1 - SAL_TOP_X0)
SAL_TOP_X_SCALE = SAL_WIDTH / SAL_TOP_WIDTH

def sal_side_pick(x, y, z):
    return SAL_SIDE_X0 + (z - SAL_Z0) / SAL_SCALE, SAL_GROUND - y / SAL_SCALE

def sal_front_pick(x, y, z):
    return SAL_END_CX + x / SAL_END_SCALE, SAL_END_GROUND - y / SAL_END_SCALE

def sal_rear_pick(x, y, z):
    # The rear turnaround shows the clean pipe mouths at the trailer end.
    return sal_rear.w / 2 + x / SAL_END_SCALE, 435 - y / SAL_END_SCALE

def sal_top_pick(x, y, z):
    return SAL_TOP_X0 + (z - SAL_Z0) / SAL_TOP_SCALE, SAL_TOP_MID - x / SAL_TOP_X_SCALE

def sal_trim_side(mask):
    mask = mask.copy()
    mask[SAL_GROUND:, :] = False
    mask[:, 392:] = False  # trailer and hitch are separate photo-kit parts
    return mask

def sal_trim_end(mask):
    mask = mask.copy()
    mask[435:, :] = False
    return mask

sal_views = [
    View('side', sal_side, seed_points(sal_side), sal_side_pick, (-1, 0, 0),
         solid=sal_trim_side, grey=20, tolerance=20),
    View('front', sal_front, seed_points(sal_front), sal_front_pick, (0, 0, -1),
         solid=sal_trim_end, grey=20, tolerance=20),
    View('rear', sal_rear, seed_points(sal_rear), sal_rear_pick, (0, 0, 1),
         solid=sal_trim_end, grey=20, tolerance=20),
    View('overhead', sal_top, seed_points(sal_top), sal_top_pick, (0, 1, 0), grey=20, tolerance=20),
]
sal_bounds = ((-SAL_WIDTH / 2, SAL_WIDTH / 2), (0, SAL_HEIGHT), (-6.05, -1.45))
sal_voxel = .035
sal_solid, sal_xs, sal_ys, sal_zs = occupancy(sal_bounds, sal_voxel,
                                               [view.covers for view in sal_views])
sal_solid = largest_part(sal_solid)
for view in sal_views:
    view.photo.bleed(view.mask)
sal_materials = {view.name: view.photo.material(.86) for view in sal_views}
sal_body = carve_hull('sal-pipe-trailer:pickup-body', sal_views, sal_materials,
                      sal_solid, sal_xs, sal_ys, sal_zs, sal_voxel, 1900)
own(sal_body, sal, 'sal-pipe-trailer:pickup-body')

# Wheel centres and radii are measured from the left-side photo. The far-side
# wheels mirror these positions across the chassis, as the photo shows.
SAL_TRACK = .79
def tire_material(photo, cx, cy, radius_px, stem):
    # A small photo rectangle from the outer rubber band is one true-size
    # tread tile. The UVs repeat it around the measured circumference.
    half_h = max(8, round(radius_px * .25))
    patch_w = max(3, round(radius_px * .08))
    start_x = round(cx + radius_px * .72)
    start_y = round(cy - half_h)
    rgb = photo.rgb()[start_y:start_y + half_h * 2, start_x:start_x + patch_w]
    image = bpy.data.images.new(f'{stem} tread tile', width=patch_w, height=half_h * 2,
                                alpha=True)
    rgba = np.ones((image.size[1], image.size[0], 4), dtype=np.float32)
    # Rubber is dark: anything pale in the patch is a rim or the sky, so it is held down.
    rgba[:, :, :3] = np.minimum(rgb[::-1].astype(np.float32), 62) / 255
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    material = bpy.data.materials.new(f'{stem} rectangular tyre tread')
    material.use_nodes = True
    material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .94
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    material.node_tree.links.new(texture.outputs['Color'],
                                 material.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return material, patch_w

for axle_name, px, cy, radius_px in (('front', 95, 302, 47), ('rear', 314, 302, 46)):
    radius = radius_px * SAL_SCALE
    axle_z = SAL_Z0 + (px - SAL_SIDE_X0) * SAL_SCALE
    tread_mat, tread_width_px = tire_material(sal_details['side'], px, cy,
                                               radius_px, f'Sal pickup {axle_name}')
    for side_name, x in (('left', -SAL_TRACK), ('right', SAL_TRACK)):
        wheel = Mesh()
        tread_uv = lambda i, d, r, a, radius=radius, radius_px=radius_px, tread_width_px=tread_width_px: (
            a / (2 * math.pi) * (2 * math.pi * radius / (tread_width_px * SAL_SCALE)),
            i / 3)
        disc_uv = lambda a, f, cx=px, cy=cy, radius_px=radius_px: sal_details['side'].uv(
            cx - math.cos(a) * radius_px * f * .68, cy - math.sin(a) * radius_px * f * .68)
        lathe(wheel, 'tread', (x, radius, axle_z), (1, 0, 0), (0, 0, 1), (0, 1, 0),
              [(-.15, radius * .9), (-.12, radius),
              (.12, radius), (.15, radius * .9)], tread_uv, sides=20,
              cap_start=('side', lambda a, f: disc_uv(a, f * .9)),
              cap_end=('side', lambda a, f: disc_uv(a, f * .9)))
        own(wheel.finish(f'sal-pipe-trailer:pickup-wheel-{axle_name}-{side_name}',
                         {'side': sal_details['side'].material(.86), 'tread': tread_mat}), sal,
            f'sal-pipe-trailer:pickup-wheel-{axle_name}-{side_name}')

# One separate trailer frame, measured to the sag of its side rails. Each beam
# takes real rust from the vehicle photograph, with no atlas edge stretching.
frame_photo = sal_details['side']
frame_mat = frame_photo.material(.9)
frame = Mesh()
def beam_box(name, center, size, photo_rect):
    x, y, z = center
    sx, sy, sz = size
    px0, py0, px1, py1 = photo_rect
    mesh = Mesh()
    photo_box(mesh, x-sx/2, x+sx/2, y-sy/2, y+sy/2, z-sz/2, z+sz/2, {
        '+z': ('rust', frame_photo, (px0, py0, px1, py1)),
        '-z': ('rust', frame_photo, (px0, py0, px1, py1)),
        '+x': ('rust', frame_photo, (px0, py0, px1, py1)),
        '-x': ('rust', frame_photo, (px0, py0, px1, py1)),
        '+y': ('rust', frame_photo, (px0, py0, px1, py1)),
        '-y': ('rust', frame_photo, (px0, py0, px1, py1)),
    })
    own(mesh.finish(name, {'rust': frame_mat}), sal, name)

for rail_x, side_name in ((-.95, 'left'), (.95, 'right')):
    # Three segments make the sag plain from either long side.
    for segment, (z0, z1, y0, y1) in enumerate(((-1.0, 1.2, .79, .65),
                                                  (1.2, 3.5, .65, .57),
                                                  (3.5, 5.85, .57, .70)), 1):
        beam_box(f'sal-pipe-trailer:frame-rail-{side_name}-{segment}',
                 (rail_x, (y0+y1)/2, (z0+z1)/2), (.12, .14, z1-z0), (404, 242, 473, 265))
for index, z in enumerate((-1.0, .2, 1.5, 2.8, 4.2, 5.65), 1):
    sag = .79 - .20 * math.sin(math.pi * (z + 1.0) / 6.65)
    beam_box(f'sal-pipe-trailer:frame-crossmember-{index}', (0, sag, z), (2.02, .14, .12),
             (404, 242, 473, 265))

# Trace the whole pipe stack from the measured side image. Flooded sky is
# removed before tracing, then bled from a dedicated copy of the photo.
pipe_photo = Photo(textures / 'peace-sal-pipe-trailer-side.jpg')
pipe_solid = ~pipe_photo.sky(seed_points(pipe_photo), tolerance=24, grey=20)
pipe_region = np.zeros_like(pipe_solid)
pipe_region[198:312, 398:988] = pipe_solid[198:312, 398:988]
pipe_solid &= pipe_region
pipe_loops = trace(pipe_solid, (398, 198, 988, 312), tolerance=1.1, min_area=18)
pipe_photo.bleed(pipe_solid)
pipe_load = Mesh()
def pipe_side_point(px, py, depth):
    return (depth, (SAL_GROUND - py) * SAL_SCALE,
            SAL_Z0 + (px - SAL_SIDE_X0) * SAL_SCALE)
slab(pipe_load, 'side', pipe_photo, pipe_loops, pipe_side_point,
     -.80, .80, wall_scale=SAL_SCALE)
own(pipe_load.finish('sal-pipe-trailer:photographed-pipe-stack',
                     {'side': pipe_photo.material(.9)}),
    sal, 'sal-pipe-trailer:photographed-pipe-stack')

# The overhead surface uses the actual top photograph at its measured scale,
# following the traced top edge rather than stretching a side-photo strip.
pipe_top = Mesh()
top_photo = sal_details['overhead']
top_rows = []
for index in range(65):
    px = 408 + (979 - 408) * index / 64
    ix = min(pipe_solid.shape[1] - 1, max(0, round(px)))
    ys = np.flatnonzero(pipe_solid[198:312, ix])
    if not len(ys):
        continue
    py = 198 + int(ys.min())
    z = SAL_Z0 + (px - SAL_SIDE_X0) * SAL_SCALE
    y = (SAL_GROUND - py) * SAL_SCALE
    left = pipe_top.vertex((-.80, y, z))
    right = pipe_top.vertex((.80, y, z))
    u = SAL_TOP_X0 + (z - SAL_Z0) / SAL_TOP_SCALE
    # The load is 1.6 m across, matching this 106 px band in the overhead view.
    v0, v1 = 181, 287
    top_rows.append(((left, top_photo.uv(u, v0)), (right, top_photo.uv(u, v1))))
for a, b in zip(top_rows, top_rows[1:]):
    pipe_top.indexed((a[0][0], a[1][0], b[1][0], b[0][0]),
                     (a[0][1], a[1][1], b[1][1], b[0][1]),
                     'top', (0, 1, 0))
own(pipe_top.finish('sal-pipe-trailer:pipe-stack-top', {'top': top_photo.material(.9)}),
    sal, 'sal-pipe-trailer:pipe-stack-top')

# Both exposed ends are traced from the clean cut-pipe photograph. Bleeding
# removes its pale background before the outlined face is extruded in place.
end_photo = Photo(textures / 'peace-sal-pipe-trailer-rear.jpg')
end_solid = ~end_photo.sky(seed_points(end_photo), tolerance=22, grey=20)
end_region = np.zeros_like(end_solid)
end_region[136:296, 105:439] = end_solid[136:296, 105:439]
end_solid &= end_region
end_loops = trace(end_solid, (105, 136, 439, 296), tolerance=1.1, min_area=12)
end_photo.bleed(end_solid)
for end_name, z, end_direction in (('front', -1.43, -1), ('rear', 5.96, 1)):
    end_mesh = Mesh()
    def end_point(px, py, depth, z=z):
        x = (px - 272) * (1.60 / (439 - 105))
        y = 1.58 - (py - 136) * (.88 / (296 - 136))
        return (x, y, z + depth)
    slab(end_mesh, 'ends', end_photo, end_loops, end_point,
         -end_direction * .018, end_direction * .018, wall_scale=.004)
    own(end_mesh.finish(f'sal-pipe-trailer:pipe-cut-ends-{end_name}',
                        {'ends': end_photo.material(.6)}),
        sal, f'sal-pipe-trailer:pipe-cut-ends-{end_name}')

# Trailer tandem wheel centres and radii are measured separately from the
# side photo; each axle has its own photographed sidewall and tread tile.
for axle_index, (px, cy, radius_px) in enumerate(((795, 312, 35), (861, 312, 34)), 1):
    z = SAL_Z0 + (px - SAL_SIDE_X0) * SAL_SCALE
    radius = radius_px * SAL_SCALE
    tread_mat, tread_width_px = tire_material(sal_details['side'], px, cy,
                                               radius_px, f'Sal trailer axle {axle_index}')
    for side_name, x in (('left', -1.06), ('right', 1.06)):
        trailer_wheel = Mesh()
        tire_uv = lambda i, d, r, a, radius=radius, tread_width_px=tread_width_px: (
            a / (2 * math.pi) * (2 * math.pi * radius / (tread_width_px * SAL_SCALE)),
            i / 3)
        face_uv = lambda a, f, cx=px, cy=cy, radius_px=radius_px: sal_details['side'].uv(
            cx-math.cos(a)*radius_px*f*.68, cy-math.sin(a)*radius_px*f*.68)
        lathe(trailer_wheel, 'tread', (x, radius, z), (1, 0, 0), (0, 0, 1), (0, 1, 0),
              [(-.14, radius*.9), (-.11, radius), (.11, radius), (.14, radius*.9)],
              tire_uv, sides=18,
              cap_start=('side', lambda a, f: face_uv(a, f*.9)),
              cap_end=('side', lambda a, f: face_uv(a, f*.9)))
        own(trailer_wheel.finish(f'sal-pipe-trailer:trailer-wheel-{axle_index}-{side_name}',
                                 {'side': sal_details['side'].material(.86), 'tread': tread_mat}), sal,
            f'sal-pipe-trailer:trailer-wheel-{axle_index}-{side_name}')
for name, center, size in (
    ('front-headboard', (0, .95, -1.0), (1.92, .46, .12)),
    ('rear-tailbar', (0, .67, 5.84), (1.92, .18, .12)),
):
    beam_box(f'sal-pipe-trailer:{name}', center, size, (404, 242, 473, 265))

# Two sloped tow-bar arms meet a low coupler at the truck hitch and climb into
# the trailer's front crossmember; they overlap both endpoints by design.
for side_name, side_sign in (('left', -1), ('right', 1)):
    towbar = town.beam(f'sal-pipe-trailer:tow-bar-{side_name}',
                       (0, .23, -1.60), (side_sign * .92, .73, -.91), .11, frame_mat)
    own(towbar, sal, f'sal-pipe-trailer:tow-bar-{side_name}')
coupler = town.cube('sal-pipe-trailer:pickup-hitch-coupler',
                    (0, .24, -1.57), (.24, .16, .22), frame_mat, bevel=.025)
own(coupler, sal, 'sal-pipe-trailer:pickup-hitch-coupler')

# Dust's tanker. Every number below was measured on the four photos with a grid
# laid over them. Side photo: 1 px = 1 cm, bumper to bumper is columns 20 to 882.
# End photos: the bumper's 332 px is the truck's 2.77 m, 1 px = 8.36 mm.
tanker = root_part('dust-tanker')
t_side = measured_photo('dust-tanker-side')
t_front = measured_photo('dust-tanker-front')
t_rear = measured_photo('dust-tanker-rear')
t_top = measured_photo('dust-tanker-overhead')
T_SCALE = .01
T_SIDE_X0, T_GROUND = 20, 437
T_Z0 = -4.31
T_END_SCALE = .00836
T_FRONT_CX, T_FRONT_GROUND = 315, 476
T_REAR_CX = 300
T_TOP_X0, T_TOP_MID = 44, 246
T_TOP_CAB_SCALE = 3.48 / (378 - 44)
T_TOP_WIDTH_SCALE = .0095
T_CAB_END_PX = 368

def tank_side_z(px):
    return T_Z0 + (px - T_SIDE_X0) * T_SCALE

def tank_side_pick(x, y, z):
    return T_SIDE_X0 + (z - T_Z0) / T_SCALE, T_GROUND - y / T_SCALE

def tank_side_world(px, py, depth):
    return (depth, (T_GROUND - py) * T_SCALE, tank_side_z(px))

def tank_front_pick(x, y, z):
    # The goggles' lower rims at row 190 sit on the bonnet's rear edge, at the
    # height the side photo gives it; the roof and the ground stay where they are.
    return T_FRONT_CX - x / T_END_SCALE, np.interp(y, (0, 2.52, 3.21), (T_FRONT_GROUND, 190, 92))

def tank_front_world(px, py, depth):
    return (-(px - T_FRONT_CX) * T_END_SCALE, (T_FRONT_GROUND - py) * T_END_SCALE, depth)

def tank_top_pick(x, y, z):
    return T_TOP_X0 + (z - T_Z0) / T_TOP_CAB_SCALE, T_TOP_MID - x / T_TOP_WIDTH_SCALE

def tarp_top_pick(x, z):
    side_px = T_SIDE_X0 + (z - T_Z0) / T_SCALE
    return 380 + (side_px - 360) * 533 / 525, T_TOP_MID - x / T_TOP_WIDTH_SCALE

def tank_rear_world(px, py, depth):
    # The rear picture was drawn a little taller above its tank than the side
    # photo allows, so its rows meet the side photo's heights at four marks.
    height = float(np.interp(py, (20, 205, 340, 405), (3.72, 2.52, 1.25, .72)))
    return ((px - T_REAR_CX) * T_END_SCALE, height, depth)

T_FRONT_WHEEL = (153.5, 362, 73)
T_REAR_WHEEL = (697, 364, 73.5)

def tank_cab_trim_side(mask):
    mask = mask.copy()
    mask[376:, :] = False  # the tyres and the ground are separate
    mask[:, T_CAB_END_PX:] = False  # the tank, tarpaulin and chassis are separate
    yy, xx = np.ogrid[:t_side.h, :t_side.w]
    mask &= (xx - T_FRONT_WHEEL[0]) ** 2 + (yy - T_FRONT_WHEEL[1]) ** 2 >= 78 ** 2
    return mask

def tank_cab_trim_top(mask):
    mask = mask.copy()
    mask[100:392, 75:378] = True  # mudguards reach as far forward as the side photo says
    mask[118:374, 46:75] = True  # the bumper's whole width
    mask[:100, :] = False  # mirrors
    mask[392:, :] = False
    mask[:, 378:] = False  # the tarpaulin
    return mask

def tank_cab_trim_front(mask):
    """Keep the cab only: the canvas stands behind it, wider above the mudguards."""
    half_width = np.interp(np.arange(t_front.h),
                           (92, 100, 110, 130, 240, 250, 262, 275, 395),
                           (95, 115, 125, 135, 135, 150, 165, 172, 172))
    half_width[:92] = -1
    half_width[396:] = -1
    xx = np.arange(t_front.w)[None, :]
    return mask & (np.abs(xx - T_FRONT_CX) <= half_width[:, None])

tank_views = [
    View('side', t_side, seed_points(t_side), tank_side_pick, (-1, 0, 0),
         solid=tank_cab_trim_side, grey=20, tolerance=20),
    View('side-far', t_side, seed_points(t_side), tank_side_pick, (1, 0, 0),
         solid=tank_cab_trim_side, grey=20, tolerance=20),
    View('front', t_front, seed_points(t_front), tank_front_pick, (0, 0, -1),
         solid=tank_cab_trim_front, grey=20, tolerance=20),
    View('overhead', t_top, seed_points(t_top), tank_top_pick, (0, 1, 0),
         solid=tank_cab_trim_top, grey=20, tolerance=20),
]
tank_voxel = .03
tank_bounds = ((-1.42, 1.42), (.28, 3.28), (T_Z0 - .03, tank_side_z(T_CAB_END_PX)))
tank_solid, tank_xs, tank_ys, tank_zs = occupancy(
    tank_bounds, tank_voxel, [view.covers for view in tank_views])
tank_solid = largest_part(tank_solid)

# Each photo keeps one embedded copy, so the whole subject stays in it and only
# the background is replaced by the subject's own nearby colours.
t_side_solid = ~t_side.sky(seed_points(t_side), tolerance=20, grey=20)
# The ground between the wheels is cut off from the corners by the wheels' shadow,
# so the flood from the corners never reaches it.
t_side_rgb = t_side.rgb()
t_side_ground = (t_side_rgb.mean(axis=2) > 150) & \
    (t_side_rgb.max(axis=2) - t_side_rgb.min(axis=2) < 24)
t_side_ground[:340, :] = False
t_side_solid &= ~t_side_ground
t_front_solid = ~t_front.sky(seed_points(t_front), tolerance=20, grey=20)
t_rear_solid = ~t_rear.sky(seed_points(t_rear), tolerance=20, grey=20)
t_top_solid = ~t_top.sky(seed_points(t_top), tolerance=20, grey=20)
def tanker_tread_tile():
    """The front photo's left tyre, end on, folded so that it repeats without a seam."""
    rgb = t_front.rgb()[402:466, 152:192].astype(np.float32)
    fold = 10
    blend = np.linspace(0, 1, fold)[:, None, None]
    rgb[:fold] = rgb[:fold] * blend + rgb[-fold:] * (1 - blend)
    rgb = rgb[:-fold]
    image = bpy.data.images.new('Dust tanker tread tile', width=rgb.shape[1], height=rgb.shape[0],
                                alpha=True)
    rgba = np.ones((rgb.shape[0], rgb.shape[1], 4), dtype=np.float32)
    rgba[:, :, :3] = rgb[::-1] / 255
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    material = bpy.data.materials.new('Dust tanker tread')
    material.use_nodes = True
    bsdf = material.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Roughness'].default_value = .96
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    return material, rgb.shape[0] * T_END_SCALE

tread_mat, tread_tile_metres = tanker_tread_tile()
t_side.bleed(t_side_solid, passes=16)
t_front.bleed(t_front_solid, passes=16)
t_rear.bleed(t_rear_solid, passes=16)
t_top.bleed(t_top_solid, passes=16)
t_side_mat = t_side.material(.82)
t_front_mat = t_front.material(.86)
t_rear_mat = t_rear.material(.86)
t_top_mat = t_top.material(.92)
tank_cab = carve_hull('dust-tanker:photo-carved-cab', tank_views,
                      {'side': t_side_mat, 'side-far': t_side_mat,
                       'front': t_front_mat, 'overhead': t_top_mat},
                      tank_solid, tank_xs, tank_ys, tank_zs, tank_voxel, 2200)
own(tank_cab, tanker, 'dust-tanker:photo-carved-cab')

mirror_arm_mat = bpy.data.materials.new('Dust tanker mirror arm')
mirror_arm_mat.use_nodes = True
mirror_arm_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.05, .035, .025, 1)
mirror_arm_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9

# Mirrors: the head is traced from the front photo and stands where the overhead
# photo shows it; the arm is a rusty rod back to the cab's door.
for side_sign, side_name in ((1, 'left'), (-1, 'right')):
    head_x0 = 110 if side_sign == 1 else 486
    head_x1 = 146 if side_sign == 1 else 516
    head_solid = np.zeros_like(t_front_solid)
    head_solid[172:210, head_x0:head_x1] = t_front_solid[172:210, head_x0:head_x1]
    head_loops = trace(head_solid, (head_x0 - 2, 170, head_x1 + 2, 212), tolerance=1, min_area=20)
    head_mesh = Mesh()
    slab(head_mesh, 'front', t_front, head_loops, tank_front_world,
         -2.16, -2.12, wall_scale=T_END_SCALE)
    own(head_mesh.finish(f'dust-tanker:mirror-head-{side_name}', {'front': t_front_mat}),
        tanker, f'dust-tanker:mirror-head-{side_name}')
    arm = town.beam(f'dust-tanker:mirror-arm-{side_name}',
                    (side_sign * 1.11, 2.12, -2.36), (side_sign * 1.5, 2.37, -2.14),
                    .018, mirror_arm_mat)
    own(arm, tanker, f'dust-tanker:mirror-arm-{side_name}')

# The tank is an ellipse, as road tankers are, and as the rear photo draws it:
# 137 px by 104 px there, 1.14 m by .87 m here. Its picture is the side photo laid
# straight on, so the tarpaulin's own fringe falls where the canvas stops.
T_TANK_V = .87
T_TANK_H = 1.14
T_TANK_ROW = 185
T_TANK_Y = (T_GROUND - T_TANK_ROW) * T_SCALE
T_TANK_START, T_TANK_END = 372, 858
T_TARP_ROW_TOP = (360, 372, 380, 400, 420, 440, 460, 470, 480, 640, 700, 740, 760, 780, 800,
                  820, 840, 860, 884)
T_TARP_PHOTO_TOP = (115, 108, 95, 72, 66, 66, 68, 85, 92, 93, 95, 92, 85, 85, 92,
                    105, 112, 140, 215)
T_TARP_ROW_LOW = (360, 370, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620,
                  640, 650, 660, 680, 700, 720, 740, 760, 780, 800, 820, 840, 850, 860)
T_TARP_PHOTO_LOW = (175, 178, 165, 160, 158, 155, 142, 142, 150, 157, 162, 165, 172, 178, 190,
                    200, 205, 195, 165, 155, 148, 140, 137, 140, 150, 155, 160, 190, 205)

def tarp_photo_top(px):
    return float(np.interp(px, T_TARP_ROW_TOP, T_TARP_PHOTO_TOP))

def tarp_photo_low(px):
    return float(np.interp(px, T_TARP_ROW_LOW, T_TARP_PHOTO_LOW))

def tank_body_uv(index, distance, radius, angle):
    px = T_SIDE_X0 + distance / T_SCALE
    return t_side.uv(px, T_TANK_ROW - radius * math.sin(angle) / T_SCALE)

tank_profile = [(px - T_SIDE_X0) * T_SCALE for px in (T_TANK_START, T_TANK_START + 6, T_TANK_START + 20,
                                                      500, 620, 740, T_TANK_END - 8, T_TANK_END)]
tank_profile = list(zip(tank_profile, (.62, .8, T_TANK_V, T_TANK_V, T_TANK_V, T_TANK_V, T_TANK_V, .8)))
tank_body = Mesh()
lathe(tank_body, 'side', (0, T_TANK_Y, T_Z0), (0, 0, 1), (T_TANK_H / T_TANK_V, 0, 0), (0, 1, 0),
      tank_profile, tank_body_uv, sides=32)
own(tank_body.finish('dust-tanker:photo-turned-fuel-tank', {'side': t_side_mat}),
    tanker, 'dust-tanker:photo-turned-fuel-tank')

# The tarpaulin is a draped cloth, not a slab: each station runs from its hanging
# edge in the side photo, up over the top. The rear of the cloth is kept high so
# that it meets the rear photo's plate. The front photo gave the widths.
T_TARP_WIDE = 1.38
T_TARP_SHOULDER = 3.45
T_TARP_SIDE_QUADS = 5
T_TARP_MODEL_TOP = (358, 400, 420, 440, 460, 480, 760, 800, 820, 840, 858)
T_TARP_MODEL_ROW = (68, 66, 66, 66, 68, 92, 88, 90, 88, 80, 72)

def tank_half_width(height):
    fraction = min(1, abs(height - T_TANK_Y) / T_TANK_V)
    return T_TANK_H * math.sqrt(1 - fraction ** 2)

def tarp_outline(px):
    """One half of the cloth from its hanging edge up to the crown, never doubling back."""
    top = (T_GROUND - float(np.interp(px, T_TARP_MODEL_TOP, T_TARP_MODEL_ROW))) * T_SCALE
    low = (T_GROUND - (tarp_photo_low(px) - 3)) * T_SCALE
    shoulder = min(top, T_TARP_SHOULDER)
    rise = shoulder - T_TANK_Y
    hump = top - shoulder
    points = []
    for level in (0, .12, .26, .4, .54, .68, .8, .9):
        height = low + (shoulder - low) * level
        above = max(0, height - T_TANK_Y) / rise
        sine = min(.995, above ** (1 / .7))
        draped = T_TARP_WIDE * math.sqrt(1 - sine ** 2) ** .7
        close = tank_half_width(height) + .05
        points.append((close + (draped - close) * min(1, level / .26), height))
    points += [(.30, shoulder + hump * .35), (.16, shoulder + hump * .75), (0, top)]
    return points

def tarp_side_uv(px, height):
    row = T_GROUND - height / T_SCALE
    return t_side.uv(px, max(row, tarp_photo_top(px) + 2))

T_TARP_STATIONS = [358] + list(range(370, 858, 16)) + [860]
for side_sign, side_name in ((-1, 'left'), (1, 'right')):
    tarp_mesh = Mesh()
    rings = []
    for px in T_TARP_STATIONS:
        ring = []
        for x, height in tarp_outline(px):
            point = (side_sign * x, height, tank_side_z(px))
            top_uv = t_top.uv(*tarp_top_pick(point[0], point[2]))
            ring.append((tarp_mesh.vertex(point), tarp_side_uv(px, height), top_uv))
        rings.append(ring)
    for station in range(len(rings) - 1):
        for k in range(len(rings[station]) - 1):
            a, b = rings[station][k], rings[station][k + 1]
            c, d = rings[station + 1][k + 1], rings[station + 1][k]
            indices = (a[0], b[0], c[0], d[0])
            out = (side_sign * (1 - k / 10), .15 + k / 10, 0)
            if k < T_TARP_SIDE_QUADS:
                tarp_mesh.indexed(indices, (a[1], b[1], c[1], d[1]), 'side', out, True)
            else:
                tarp_mesh.indexed(indices, (a[2], b[2], c[2], d[2]), 'overhead', out, True)
    own(tarp_mesh.finish(f'dust-tanker:tied-tarpaulin-{side_name}',
                         {'side': t_side_mat, 'overhead': t_top_mat}),
        tanker, f'dust-tanker:tied-tarpaulin-{side_name}')

# The cloth's ends are the end photos themselves. In front, behind the cab, only
# canvas shows; behind, the tank's end with its valve, and lower down the lamp bar.
front_canvas = t_front_solid.copy()
front_canvas[:34, :] = False  # the hump's very top would stand clear of the cloth
front_canvas[254:, :] = False
front_canvas[:, :141] = False
front_canvas[:, 490:] = False
front_mesh = Mesh()
slab(front_mesh, 'front', t_front, trace(front_canvas, (138, 32, 492, 256), tolerance=1.5, min_area=60),
     tank_front_world, tank_side_z(361) - .006, tank_side_z(361) + .006, wall_scale=T_END_SCALE)
own(front_mesh.finish('dust-tanker:canvas-behind-cab', {'front': t_front_mat}),
    tanker, 'dust-tanker:canvas-behind-cab')

rear_upper = t_rear_solid.copy()
rear_upper[:34, :] = False  # the bundle's very top would stand clear of the cloth
rear_upper[322:, :] = False
rear_lower = t_rear_solid.copy()
rear_lower[:322, :] = False
rear_lower[405:, :] = False
for name, solid, box_rows, px in (('tank-end', rear_upper, (32, 324), T_TANK_END + 2),
                                  ('lamp-bar', rear_lower, (320, 407), 880)):
    rear_mesh = Mesh()
    slab(rear_mesh, 'rear', t_rear, trace(solid, (100, box_rows[0], 480, box_rows[1]),
                                          tolerance=1.5, min_area=60),
         tank_rear_world, tank_side_z(px) - .006, tank_side_z(px) + .006, wall_scale=T_END_SCALE)
    own(rear_mesh.finish(f'dust-tanker:rear-{name}', {'rear': t_rear_mat}),
        tanker, f'dust-tanker:rear-{name}')

# Wheels stand on the circles measured on the side photo. The front axle has one
# tyre a side, as the front photo shows; the rear has two, as the rear photo shows.
T_WHEELS = (('front', T_FRONT_WHEEL, .19, ((1.19, ''),)),
            ('rear', T_REAR_WHEEL, .16, ((1.16, ''), (.82, 'inner-'))))
for axle_name, (cx, cy, radius_px), half_width, tyres in T_WHEELS:
    radius = radius_px * T_SCALE
    axle_y = (T_GROUND - cy) * T_SCALE
    axle_z = tank_side_z(cx)
    def tread_uv(i, d, r, a, radius=radius):
        return i / 3, a * radius / tread_tile_metres
    def disc_uv(a, f, cx=cx, cy=cy, radius_px=radius_px):
        return t_side.uv(cx + math.cos(a) * radius_px * f * .94,
                         cy - math.sin(a) * radius_px * f * .94)
    for offset, prefix in tyres:
        for side_sign, side_name in ((-1, 'left'), (1, 'right')):
            wheel = Mesh()
            lathe(wheel, 'tread', (side_sign * offset, axle_y, axle_z), (1, 0, 0), (0, 0, 1), (0, 1, 0),
                  [(-half_width, radius * .94), (-half_width + .04, radius),
                   (half_width - .04, radius), (half_width, radius * .94)],
                  tread_uv, sides=22, cap_start=('side', disc_uv), cap_end=('side', disc_uv))
            part_name = f'dust-tanker:wheel-{axle_name}-{prefix}{side_name}'
            own(wheel.finish(part_name, {'side': t_side_mat, 'tread': tread_mat}), tanker, part_name)

for wheel_px, wheel_row, _ in (T_FRONT_WHEEL, T_REAR_WHEEL):
    well = Mesh()
    centre = (0, (T_GROUND - wheel_row) * T_SCALE, tank_side_z(wheel_px))
    for step in range(14):
        a0, a1 = math.pi * step / 14, math.pi * (step + 1) / 14
        p0 = (0, centre[1] + .8 * math.sin(a0), centre[2] + .8 * math.cos(a0))
        p1 = (0, centre[1] + .8 * math.sin(a1), centre[2] + .8 * math.cos(a1))
        for out in ((1, 0, 0), (-1, 0, 0)):
            well.face((centre, p0, p1), ((0, 0), (1, 0), (1, 1)), 'dark', out)
    well_name = 'dust-tanker:wheel-well-' + ('front' if wheel_px < 300 else 'rear')
    own(well.finish(well_name, {'dark': mirror_arm_mat}), tanker, well_name)

# Everything between the tank and the wheels is one traced picture on each side:
# the rail, valves, toolbox, mudguard and rear bumper, with the rear wheel cut out.
frame_solid = np.zeros_like(t_side_solid)
frame_solid[266:396, 358:886] = t_side_solid[266:396, 358:886]
yy, xx = np.ogrid[:t_side.h, :t_side.w]
frame_solid &= (xx - T_REAR_WHEEL[0]) ** 2 + (yy - T_REAR_WHEEL[1]) ** 2 >= 76 ** 2
frame_solid[346:396, 590:630] = False  # the inner rear tyre, seen past the outer one
frame_loops = trace(frame_solid, (356, 264, 888, 398), tolerance=1.4, min_area=18)
for depth, side_name in ((-1.0, 'left'), (1.0, 'right')):
    frame_mesh = Mesh()
    slab(frame_mesh, 'side', t_side, frame_loops, tank_side_world,
         depth - .03, depth + .03, wall_scale=T_SCALE)
    own(frame_mesh.finish(f'dust-tanker:traced-frame-rail-{side_name}', {'side': t_side_mat}),
        tanker, f'dust-tanker:traced-frame-rail-{side_name}')

for part in sal.children_recursive:
    if part.type == 'MESH':
        part['part'] = part.name
sal['assetRoot'] = True

for root_obj in (billboard,turret,rock,chair,cabinet,sign,stone,tent,oasis,sal,tanker):
    root_obj['assetRoot']=True

glb.parent.mkdir(parents=True,exist_ok=True)
# The full measured JPGs remain the source. Downsample only the five new
# props' embedded GLB images after masks, bleed and UVs are complete.
for image_name, scale in {
        'toll-cabinet-front': .25, 'toll-cabinet-side': .25,
        'bound-sign-front': .5,
        'bound-stone-front': .25, 'bound-stone-side': .25,
        'decoy-tent-front': .5,
        'decoy-oasis-overhead': .375,
}.items():
    images = [LOADED_PHOTOS[image_name].image]
    if image_name.startswith('sal-pipe-trailer-'):
        images.append(sal_details[image_name.removeprefix('sal-pipe-trailer-')].image)
    for image in images:
        image.scale(max(1, round(image.size[0] * scale)), max(1, round(image.size[1] * scale)))
# Keep every tanker photo whole and bring its embedded copy to the 1024 px
# ceiling without cropping; source JPEGs on disk remain untouched.
for photo in (t_side, t_front, t_rear, t_top):
    if photo.image.size[0] < 1024:
        photo.image.scale(1024, max(1, round(photo.image.size[1] * 1024 / photo.image.size[0])))
town.export_glb(glb)

# Review renders always come from the exported GLB after a fresh empty scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=16
scene.view_settings.view_transform='Standard'
scene.render.resolution_x=700; scene.render.resolution_y=500; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('bright flat overcast'); scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.85,.85,.85,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.8
bpy.ops.import_scene.gltf(filepath=str(glb))
camera_data=bpy.data.cameras.new('peace review camera'); camera=bpy.data.objects.new('peace review camera',camera_data)
scene.collection.objects.link(camera); scene.camera=camera; camera.data.type='ORTHO'
for loc,power,size in [((4,8,7),1100,8),((-6,7,-4),700,7)]:
    bpy.ops.object.light_add(type='AREA',location=game_vector(loc)); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(game_vector((0,1.4,0))-light.location).to_track_quat('-Z','Y').to_euler()
render_dir.mkdir(parents=True,exist_ok=True)
def shot(name, loc, target, scale, resolution=(700,500)):
    camera.location=game_vector(loc)
    camera.rotation_euler=(game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale
    scene.render.resolution_x,scene.render.resolution_y=resolution
    scene.render.filepath=str(render_dir/(name+'.png'))
    bpy.ops.render.render(write_still=True)
def show(identifier,loc,target,scale,resolution=(700,500)):
    for obj in scene.objects:
        if obj.type=='MESH': obj.hide_render=not obj.name.startswith(identifier)
    shot(identifier+'-three-quarter',loc,target,scale,resolution)

if not args.round4_only and not args.round6_only:
    show('mirage-billboard',(8.5,1.35,8.5),(0,2.7,0),10.5,(1200,400))
    shot('mirage-billboard-front',(0,3.2,12),(0,3.2,0),9.2,(1200,400))
    shot('mirage-billboard-side',(12,3.2,0),(0,2.7,0),7,(600,900))
    show('gunn-turret',(-7.2,1.3,8.1),(-.4,1.3,0),5.4,(700,700))
    shot('gunn-turret-side',(-.5,1.4,12),(-.5,1.4,0),5.4,(700,700))
    shot('gunn-turret-barrel',(-12,1.4,0),(0,1.4,0),4.2,(700,700))
    shot('gunn-turret-overhead',(0,12,0),(0,1,0),4.4,(700,700))
    show('gunn-rock',(7.2,1.3,8.1),(0,.68,0),3.9,(1000,562))
    shot('gunn-rock-side',(0,1.5,12),(0,.68,0),3.8,(1000,562))
    shot('gunn-rock-untouched',(0,1.5,-12),(0,.68,0),3.8,(1000,562))
    show('kettles-chair',(6.5,1.5,8.1),(0,1.6,0),3.8,(700,700))
    shot('kettles-chair-side',(0,1.6,12),(0,1.6,0),3.6,(700,700))
    shot('kettles-chair-front',(12,1.6,0),(0,1.6,0),3.6,(700,700))
    show('toll-cabinet',(6.8,2.2,7.6),(.2,.95,.2),2.7,(700,900))
    shot('toll-cabinet-front',(0,.95,7),(0,.95,0),2.3,(700,900))
    shot('toll-cabinet-side',(7,.95,0),(0,.95,0),2.3,(700,900))
    show('bound-sign',(6.6,2.6,7.5),(0,1.2,0),2.25,(964,1024))
    shot('bound-sign-front',(0,1.2,8),(0,1.2,0),2.25,(964,1024))
    show('bound-stone',(7,2.0,7),(0,.5,0),2.0,(900,700))
    shot('bound-stone-front',(0,.5,8),(0,.5,0),1.8,(900,700))
    shot('bound-stone-side',(8,.5,0),(0,.5,0),1.5,(900,700))
    show('mirage-decoy-tent',(7,2.5,7),(1.5,2.4,-.1),8.0,(1200,800))
    shot('mirage-decoy-tent-front',(0,2.5,12),(0,2.5,0),7.2,(1200,800))
    shot('mirage-decoy-tent-side',(12,2.5,0),(1.5,2.4,-.1),5.0,(800,800))
    show('mirage-decoy-oasis',(7,3,7),(0,.05,0),3.25,(1000,833))
    shot('mirage-decoy-oasis-overhead',(0,10,0),(0,0,0),3.25,(1000,833))

# Round 5 contains only Sal's rig. Each frame is from the imported GLB in the
# empty review scene; the side photo and render share identical dimensions.
def sal_shot(name, eye, target, resolution, ortho=None, lens=35):
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = not obj.name.startswith('sal-pipe-trailer')
    scene.render.resolution_x, scene.render.resolution_y = resolution
    camera.location = game_vector(eye)
    camera.rotation_euler = (game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = lens
    scene.render.filepath = str(render_dir / f'sal-pipe-trailer-{name}.png')
    bpy.ops.render.render(write_still=True)

if not args.round6_only:
    sal_shot('side', (-15, 1.45, 0), (0, 1.35, 0), (1400, 690), ortho=13.4)
    sal_shot('three-quarter-front', (-10.6, 2.0, -10.6), (0, 1.15, 0), (1200, 650), lens=43)
    sal_shot('three-quarter-rear', (10.6, 2.0, 10.6), (0, 1.15, 0), (1200, 650), lens=43)

def tanker_shot(name, eye, target, resolution=(1200, 666), ortho=None, lens=43):
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = not obj.name.startswith('dust-tanker')
    scene.render.resolution_x, scene.render.resolution_y = resolution
    camera.location = game_vector(eye)
    camera.rotation_euler = (game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = lens
    scene.render.filepath = str(render_dir / f'dust-tanker-{name}.png')
    bpy.ops.render.render(write_still=True)

if args.round6_only:
    # The straight shots cover what each photo covers, so they can be laid over it.
    tanker_shot('side', (-15, 1.82, .09), (0, 1.82, .09), resolution=(920, 510), ortho=9.2)
    tanker_shot('front', (.08, 1.85, -14), (.08, 1.85, 0), resolution=(611, 510), ortho=5.11)
    tanker_shot('rear', (-.117, 1.9, 14), (-.117, 1.9, 0), resolution=(572, 507), ortho=4.78)
    tanker_shot('three-quarter-front', (-7.5, 1.5, -13), (0, 1.75, 0), lens=42)
    tanker_shot('three-quarter-rear', (7.5, 1.5, 13), (0, 1.75, 0), lens=42)
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,'renders':str(render_dir),
                  'newAsset':'dust-tanker' if args.round6_only else 'sal-pipe-trailer'}))
