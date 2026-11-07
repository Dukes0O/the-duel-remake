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
from photo_model import Mesh, Photo, box as photo_box, trace, slab, lathe
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

def measured_photo(name):
    return Photo(textures / f'peace-{name}.jpg')

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

for root_obj in (billboard,turret,rock,chair):
    root_obj['assetRoot']=True

glb.parent.mkdir(parents=True,exist_ok=True)
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
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,'renders':str(render_dir)}))
