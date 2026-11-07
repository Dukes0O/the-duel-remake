"""Round 1: a portable jaw crusher for the Wasteland town plant family.

Builds the exported candidate and review renders from that GLB. Coordinates
use town_base's metre API: +Y up, front -Z.
"""
import argparse, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/plants.glb'
evidence=Path(a.render);evidence=evidence if evidence.is_absolute() else root/evidence
blend=root/'art-build/town/plants.blend'
if a.paths_only:
 import json;print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)] if a.render else []}));raise SystemExit(0)
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, trace, slab

bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
mats=town.make_materials({'rusted-steel':tex/'faded-yellow-steel.jpg','galvanised-tin':tex/'rusted-corrugated-tin.jpg',
 'faded-hand-paint':tex/'yellow-green-paint.jpg','sand':tex/'wet-brown-earth.jpg','iron-dark':tex/'tire-rubber.jpg'})
for material in mats.values():
 material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.29,material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
steel=mats['rusted-steel'];paint=mats['faded-hand-paint'];tin=mats['galvanised-tin'];dark=mats['iron-dark'];sand=mats['sand']
rootobj=bpy.data.objects.new('town-plants',None);bpy.context.collection.objects.link(rootobj)
crusher=bpy.data.objects.new('crusher',None);bpy.context.collection.objects.link(crusher);crusher.parent=rootobj
parts=[]
def box(name,pos,size,mat=steel,bevel=.04,parent=crusher):
 o=town.cube(name,pos,size,mat,bevel);o.parent=parent;parts.append(o);return o
def beam(name,a,b,width,mat=steel,parent=crusher):
 o=town.beam(name,a,b,width,mat);o.parent=parent;parts.append(o);return o
def pipe(name,points,radius,mat=dark,parent=crusher):
 before=set(bpy.context.scene.objects);town.pipe_run(name,points,radius,mat)
 for o in set(bpy.context.scene.objects)-before:o.parent=parent;parts.append(o)

# Broad 4 x 3 metre crawler-free plant; hopper and belt sit inside its 32 x 24 m cell.
box('crusher-chassis',(0,.72,0),(3.45,.52,4.15),steel,.12)
for x in (-1.38,1.38):
 for z in (-1.72,1.72):
  beam('crusher-leg',(x,.75,z),(x*.82,2.28,z*.84),.16,steel)
  box('crusher-foot',(x*.82,.14,z*.84),(.48,.18,.55),dark,.06)
for x in (-1.28,1.28):
 beam('crusher-side-rail',(x,.35,-1.65),(x,.35,1.65),.12,dark)
 for i in range(6):
  z=-1.42+i*.56
  bpy.ops.mesh.primitive_torus_add(major_radius=.23,minor_radius=.055,major_segments=16,minor_segments=8,location=town.game_vector((x,.38,z)))
  o=bpy.context.object;o.name='crusher-track-roller';o.data.materials.append(dark);o.parent=crusher;parts.append(o)
# Hopper is formed as four thick, sloping plates, with a visibly open mouth.
box('crusher-hopper-back',(0,3.35,1.22),(2.5,2.3,.13),paint,.035).rotation_euler[0]=-.39
box('crusher-hopper-front',(0,3.22,-.62),(2.5,2.18,.13),steel,.035).rotation_euler[0]=.47
for x in (-1.17,1.17):
 box('crusher-hopper-cheek',(x,3.30,.30),(.14,2.1,2.1),paint,.035).rotation_euler[0]=.12
for x in (-1.18,1.18):
 beam('hopper-rim',(x,4.42,-.77),(x,4.42,1.32),.075,dark)
 beam('hopper-cross-rim',(x,4.42,-.77),(-x,4.42,-.77),.075,dark)
# Jaw housing, inspection door and real bolted repair straps.
box('crusher-jaw-housing',(0,2.0,-.83),(2.4,1.55,.76),steel,.12)
box('crusher-jaw-mouth',(0,2.12,-1.25),(1.55,.95,.08),dark,.025)
for x in (-.68,-.42,-.16,.1,.36,.62):
 beam('crusher-tooth',(x,1.75,-1.31),(x+.10,2.42,-1.31),.055,tin)
for x in (-1.0,1.0):
 for y in (1.55,2.45,3.1):
  box('crusher-bolt',(x,y,-1.29),(.09,.09,.05),dark,.035)
box('crusher-inspection-door',(1.31,1.83,-.05),(.045,.78,.62),paint,.025)
for y in (1.54,2.12):box('inspection-hinge',(1.35,y,-.05),(.08,.08,.19),dark,.025)
# The conveyor is traced from the side photograph. The flood mask leaves the
# truss openings empty; slab adds thickness without closing those openings.
belt_parent=bpy.data.objects.new('crusher:belt',None);bpy.context.collection.objects.link(belt_parent);belt_parent.parent=crusher
side_photo=Photo(tex/'crusher-side.jpg')
side_bg=side_photo.sky([(4,4),(1018,4),(4,562),(1018,562)],tolerance=34,grey=40)
side_solid=~side_bg
# Grid-measured photo coordinates: only the rising conveyor run, x=445..840,
# y=155..420. The belt surface itself is retained as its own thin traced part.
truss_mask=side_solid.copy();truss_mask[:145,:]=False;truss_mask[432:,:]=False
truss_mask[:,:438]=False;truss_mask[:,850:]=False
truss_loops=trace(truss_mask,(438,145,850,432),tolerance=2.0,min_area=16)
truss_mesh=PhotoMesh()
def side_world(px,py,depth):
 scale=6.35/(846-28)
 return (depth,(472-py)*scale,-3.175+(px-28)*scale)
slab(truss_mesh,'side',side_photo,truss_loops,side_world,-.68,.68,wall_scale=6.35/(846-28))
truss=truss_mesh.finish('crusher:belt:photo-traced-lattice',{'side':side_photo.material()})
truss.parent=belt_parent
# Two narrow belt lips and cross rollers follow the measured photo slope.
for x in (-.70,.70):
 beam('crusher-belt-edge',(x,.50,-.18),(x,2.38,2.84),.055,dark,belt_parent)
for i in range(8):
 t=i/7;z=-.1+t*2.88;y=.58+t*1.80
 pipe('crusher-belt-roller',[(-.63,y,z),(.63,y,z)],.035,dark,belt_parent)
# Hydraulic jaw pivots and hoses. Jaw remains a named movable node.
jaw=bpy.data.objects.new('crusher:jaw',None);bpy.context.collection.objects.link(jaw);jaw.parent=crusher
box('jaw-plate',(0,2.10,-1.02),(1.35,.82,.10),tin,.025,jaw)
for x in (-.47,.47):
 pipe('jaw-hydraulic-cylinder',[(x,1.50,-.55),(x,1.95,-.80)],.09,steel,jaw)
 pipe('jaw-hydraulic-rod',[(x,1.90,-.79),(x,2.42,-1.02)],.035,tin,jaw)
# The side wheels are the visual signature of this older jaw mechanism.  Their
# crank hubs sit on the housing; the rims have real thickness and open spokes.
for x in (-1.34,1.34):
 bpy.ops.mesh.primitive_torus_add(major_radius=.91,minor_radius=.095,major_segments=40,minor_segments=10,location=town.game_vector((x,2.22,-.40)))
 wheel=bpy.context.object;wheel.name='crusher-flywheel-rim';wheel.data.materials.append(paint);wheel.parent=crusher;parts.append(wheel)
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.19,depth=.23,location=town.game_vector((x,2.22,-.40)))
 hub=bpy.context.object;hub.name='crusher-flywheel-hub';hub.data.materials.append(dark);hub.rotation_euler[1]=math.pi/2;hub.parent=crusher;parts.append(hub)
 for spoke in range(6):
  angle=math.tau*spoke/6
  beam('crusher-flywheel-spoke',(x,2.22+math.sin(angle)*.18,-.40+math.cos(angle)*.18),
       (x,2.22+math.sin(angle)*.82,-.40+math.cos(angle)*.82),.095,paint)
# Drive pack, cooling fins, exhaust, fuel tank and narrow access ladder.
box('crusher-diesel-skid',(1.38,1.12,1.0),(.9,.46,1.22),dark,.07)
box('crusher-engine-block',(1.38,1.62,1.0),(.72,.60,.88),steel,.08)
for i in range(8):box('engine-cooling-fin',(1.78,1.40+i*.065,.98),(.07,.035,.64),tin,.012)
pipe('engine-exhaust',[(1.46,1.92,1.15),(1.46,2.48,1.15),(1.62,2.60,1.15)],.065,dark)
box('engine-fuel-tank',(1.36,2.05,1.68),(.72,.32,.64),paint,.09)
for z in (-.05,.34,.73,1.12,1.51,1.90,2.29,2.68,3.07):beam('crusher-access-ladder-rung',(-1.39,.25,z),(-1.39,1.45,z),.045,tin)
for x in (-1.39,-.96):beam('crusher-access-ladder-rail',(x,.16,-.12),(x,1.52,3.18),.06,steel)
# Discharge chute and a separate, low gravel cone, keyed to the photograph.
box('crusher-discharge-chute',(0,.78,2.28),(1.18,.66,.8),steel,.07).rotation_euler[0]=-.38
bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=1.05,radius2=.05,depth=.70,location=town.game_vector((0,.35,3.0)))
gravel=bpy.context.object;gravel.name='crusher-gravel-cone';gravel.scale=(1.25,1.0,.86);gravel.data.materials.append(sand);gravel.parent=crusher;parts.append(gravel)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
if a.render:
 # Render views by importing the exported file into a fresh scene, as required.
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.world=bpy.data.worlds.new('bright overcast');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.66,.62,1)
 bpy.ops.mesh.primitive_plane_add(size=100,location=town.game_vector((0,-.14,0)));floor=bpy.context.object;floor.name='review-only ground'
 ground=bpy.data.materials.new('Review ground');ground.diffuse_color=(.24,.20,.15,1);floor.data.materials.append(ground)
 bpy.ops.object.light_add(type='AREA',location=town.game_vector((4,14,-5)));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=14
 def camera(name,location,target,lens=45):
  data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(location);cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;return cam
 for name,loc,target,lens in [('above-45',(10,12,-14),(0,1.5,0),45),('driver-seat',(6,2.5,-8),(0,2.2,0),45),('side',(15,5,0),(0,2.2,0),30)]:
  cam=camera(name,loc,target,lens);scene.camera=cam;scene.render.filepath=str(evidence/(name+'.png'));evidence.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
