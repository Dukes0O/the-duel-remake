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
from photo_model import Mesh, Photo, box as photo_box, trace, slab
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

# 2. Gunn's unnervingly pristine turret. Its axis is Z; its side photo is the
# profile, front photo closes the silhouette and overhead photo sets the plan.
ts,tf,tt=(measured_photo(n) for n in ('turret-side','turret-front','turret-top'))
turret=root_part('gunn-turret')
def turret_side(x,y,z): return (ts.w/2-z/3.8*630, 560-y/2.5*450)
def turret_front(x,y,z): return (tf.w/2+x/3.2*490, 560-y/2.5*460)
def turret_top(x,y,z): return (tt.w/2+x/3.2*500, 345-z/3.8*640)
tmesh=carve('gunn-turret:carved-body',{'side':'turret-side','front':'turret-front','top':'turret-top'},
    ((-1.6,1.6),(0,2.5),(-1.9,1.9)),.055,
    {'side':(turret_side,(1,0,0)),'front':(turret_front,(0,0,1)),'top':(turret_top,(0,1,0))},9000)
own(tmesh,turret,'gunn-turret:carved-body')
# The prominent three bolts are separate turned photo parts, measured at the base.
boltmat=ts.material(.38)
for i,angle in enumerate((math.pi/2, math.pi/2+2*math.pi/3, math.pi/2+4*math.pi/3)):
    x,z=.0+1.17*math.cos(angle),1.17*math.sin(angle)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.22, depth=.17,
                                        location=game_vector((x,.18,z)))
    bolt=bpy.context.object
    # Blender is Z-up: translate to exported Y-up with the root's child transform.
    bolt.name=f'gunn-turret:base-bolt-{i+1}'
    bolt.data.materials.append(boltmat)
    own(bolt,turret,bolt.name)

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

# 4. Kettle's chair is carved from its four measured views. The drill arm stays
# a separate photo-model part so its thin articulated shape remains distinct.
cs,cf,cr,ct=(measured_photo(n) for n in ('chair-side','chair-front','chair-rear','chair-top'))
chair=root_part('kettles-chair')
def chair_side(x,y,z): return (cs.w/2+z/3.2*370, 604-y/3.2*590)
def chair_front(x,y,z): return (cf.w/2+x/2.5*390, 604-y/3.2*590)
def chair_rear(x,y,z): return (cr.w/2-x/2.5*390, 604-y/3.2*590)
def chair_top(x,y,z): return (ct.w/2+x/2.5*400, ct.h/2+z/3.2*500)
def remove_drill(mask):
    mask=mask.copy()
    mask[110:425,345:505]=False
    return mask
chairmesh=carve('kettles-chair:truck-and-boiler-plate',
    {'side':'chair-side','front':'chair-front','rear':'chair-rear','top':'chair-top'},
    ((-1.25,1.25),(0,3.2),(-1.6,1.6)),.055,
    {'side':(chair_side,(1,0,0)),'front':(chair_front,(0,0,1)),
     'rear':(chair_rear,(0,0,-1)),'top':(chair_top,(0,1,0))},12500,
    {'side':remove_drill})
own(chairmesh,chair,'kettles-chair:truck-and-boiler-plate')
# The whole drill assembly is a thin outline traced from the measured side
# photo; its main-world position follows the photo scale above.
drill_mask=~cs.sky(seed_points(cs),tolerance=20,grey=20)
drill_loops=trace(drill_mask,(345,110,505,425),tolerance=1.0,min_area=5)
drill=Mesh()
def drill_world(px,py,d):
    return (d,(604-py)*3.2/590,(px-cs.w/2)*3.2/370)
slab(drill,'side',cs,drill_loops,drill_world,.82,.90,wall_scale=.006)
own(drill.finish('kettles-chair:photo-drill-arm',{'side':cs.material(.78)}),chair,
    'kettles-chair:photo-drill-arm')

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
show('gunn-turret',(7.2,1.3,8.1),(0,1.1,0),4.3,(700,700))
shot('gunn-turret-front',(0,1.2,12),(0,1.2,0),4.2,(700,700))
shot('gunn-turret-overhead',(0,12,0),(0,1,0),4.4,(700,700))
show('gunn-rock',(7.2,1.3,8.1),(0,.68,0),3.9,(1000,562))
shot('gunn-rock-side',(0,1.5,12),(0,.68,0),3.8,(1000,562))
shot('gunn-rock-untouched',(0,1.5,-12),(0,.68,0),3.8,(1000,562))
show('kettles-chair',(7.2,1.35,8.1),(0,1.5,0),4.5,(700,700))
shot('kettles-chair-side',(12,1.6,0),(0,1.6,0),4.5,(700,700))
shot('kettles-chair-front',(0,1.6,12),(0,1.6,0),4.5,(700,700))
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,'renders':str(render_dir)}))
