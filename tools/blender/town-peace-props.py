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

# 2. Gunn's unnervingly pristine turret. The dome is turned from the front
# silhouette; its arc maps to the front photo, kept safely inside the mask.
ts,tf,tt=(measured_photo(n) for n in ('turret-side','turret-front','turret-top'))
turret=root_part('gunn-turret')
tfmask=~tf.sky(seed_points(tf),tolerance=22,grey=22)
tf.bleed(tfmask)
rows=[]
cx=tf.w/2
for py in range(0,tf.h,8):
    xs=np.flatnonzero(tfmask[py])
    if len(xs)>4:
        radius=(xs.max()-xs.min())*.5/490*1.6
        y=(tf.h-py)/tf.h*2.5
        rows.append((y,radius))
profile=[]
for y,r in rows:
    if not profile or abs(y-profile[-1][0])>.025: profile.append((y,r))
def dome_uv(i,d,r,a):
    arc=math.asin(math.sin(a))
    return tf.uv(cx+arc/math.pi*tf.w*.425, (tf.h-d/2.5*tf.h))
dome=Mesh()
lathe(dome,'front',(0,0,0),(0,1,0),(1,0,0),(0,0,1),profile,dome_uv,sides=48,
      cap_start=('front',lambda a,f:tf.uv(cx+math.cos(a)*f*180,tf.h-8)))
own(dome.finish('gunn-turret:turned-dome',{'front':tf.material(.24)}),turret,'gunn-turret:turned-dome')
# One forward barrel, turned along its axis; its bore is a recessed dark cap.
barrel=Mesh(); bmat=ts.material(.28)
def barrel_uv(i,d,r,a):
    px=ts.w/2+d/3.4*ts.w*.68
    py=ts.h*.60+math.sin(a)*r/0.45*ts.h*.11
    return ts.uv(px,py)
boremat=bpy.data.materials.new('dark recessed bore'); boremat.diffuse_color=(.008,.009,.012,1)
boremat.use_nodes=True; boremat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.008,.009,.012,1)
dark_uv=lambda a,f:ts.uv(ts.w-90+math.cos(a)*f*28,ts.h*.60+math.sin(a)*f*28)
lathe(barrel,'side',(0,1.35,0),(0,0,1),(1,0,0),(0,1,0),
      [(0,.32),(.2,.3),(1.55,.19),(1.72,.18)],barrel_uv,sides=32,
      cap_end=('bore',dark_uv))
own(barrel.finish('gunn-turret:single-barrel',{'side':bmat,'bore':boremat}),turret,'gunn-turret:single-barrel')
# Three separately turned oversized bolts sit around the base rim.
for i,angle in enumerate((math.pi/2, math.pi/2+2*math.pi/3, math.pi/2+4*math.pi/3)):
    bolt=Mesh(); x,z=1.12*math.cos(angle),1.12*math.sin(angle)
    uv=lambda idx,d,r,a,angle=angle:tf.uv(cx+math.cos(angle)*r*180+math.cos(a)*30,tf.h-70-d*100)
    lathe(bolt,'bolt',(x,.12,z),(0,1,0),(1,0,0),(0,0,1),[(0,.15),(.12,.15)],uv,sides=12)
    own(bolt.finish(f'gunn-turret:base-bolt-{i+1}',{'bolt':tf.material(.3)}),turret,f'gunn-turret:base-bolt-{i+1}')

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

# 4. Kettle's chair is a traced side frame, with solid seat, back and footrest
# joining its two side planes. The side image supplies the full frame outline.
cs,cf,cr,ct=(measured_photo(n) for n in ('chair-side','chair-front','chair-rear','chair-top'))
chair=root_part('kettles-chair')
def chair_side(x,y,z): return (cs.w/2+z/3.2*370, 604-y/3.2*590)
chairmask=~cs.sky(seed_points(cs),tolerance=22,grey=22)
cs.bleed(chairmask)
frame_loops=trace(chairmask,(0,0,cs.w,cs.h),tolerance=1.2,min_area=28)
def chair_world(px,py,d): return (d,(604-py)*3.2/590,(px-cs.w/2)*3.2/370)
for side in (-.45,.45):
    frame=Mesh(); slab(frame,'side',cs,frame_loops,chair_world,side-.045,side+.045,wall_scale=.006)
    own(frame.finish(f'kettles-chair:traced-frame-{side:+.2f}',{'side':cs.material(.72)}),chair,
        f'kettles-chair:traced-frame-{side:+.2f}')
# Real volumes bridge the two traced side planes. Use the photographed seat,
# backrest and footrest regions on every box face so there are no white seams.
seat=Mesh()
photo_box(seat,-.45,.45,.98,1.30,-.68,.68,{
 '+z':('side',cs,(350,390,500,455)),'-z':('side',cs,(350,390,500,455)),
 '+x':('front',cf,(180,290,360,390)),'-x':('rear',cr,(180,290,360,390)),
 '+y':('top',ct,(190,210,390,390)),'-y':('side',cs,(350,430,500,455))})
own(seat.finish('kettles-chair:solid-seat',{'side':cs.material(.9),'front':cf.material(.9),'rear':cr.material(.9),'top':ct.material(.95)}),chair,'kettles-chair:solid-seat')
back=Mesh()
photo_box(back,-.45,.45,1.30,2.65,.42,.72,{
 '+z':('side',cs,(420,190,530,410)),'-z':('side',cs,(420,190,530,410)),
 '+x':('front',cf,(190,100,360,360)),'-x':('rear',cr,(190,100,360,360)),
 '+y':('side',cs,(420,180,530,205)),'-y':('side',cs,(420,395,530,420))})
own(back.finish('kettles-chair:solid-backrest',{'side':cs.material(.9),'front':cf.material(.9),'rear':cr.material(.9)}),chair,'kettles-chair:solid-backrest')
foot=Mesh()
photo_box(foot,-.38,.38,.32,.48,-.75,-.12,{
 '+z':('side',cs,(355,460,490,510)),'-z':('side',cs,(355,460,490,510)),
 '+x':('front',cf,(220,470,340,520)),'-x':('rear',cr,(220,470,340,520)),
 '+y':('top',ct,(190,430,390,510)),'-y':('side',cs,(355,500,490,515))})
own(foot.finish('kettles-chair:solid-footrest',{'side':cs.material(.86),'front':cf.material(.86),'rear':cr.material(.86),'top':ct.material(.86)}),chair,'kettles-chair:solid-footrest')
# Turned hydraulic pedestal between the seat and the broad traced truck feet.
ped=Mesh(); pedestal_uv=lambda i,d,r,a:cs.uv(615+math.cos(a)*r/0.28*30,445-d/1.0*110)
lathe(ped,'side',(0,.45,0),(0,1,0),(1,0,0),(0,0,1),[(0,.25),(.12,.29),(.65,.22)],pedestal_uv,sides=20)
own(ped.finish('kettles-chair:turned-pedestal',{'side':cs.material(.68)}),chair,'kettles-chair:turned-pedestal')

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
