"""Original tunnel borer family. Game space is +Y up, road/front is -Z."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser(); p.add_argument('--root',required=True); p.add_argument('--render',default=''); p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/borer.glb'; blend=root/'art-build/town/borer.blend'
evidence=Path(a.render); evidence=evidence if evidence.is_absolute() else root/evidence
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)] if a.render else []})); raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent)); import town_base as town
from photo_model import Mesh, Photo, slab, trace
from photo_carve import carve_object
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'rusted-steel':tex/'stages-rusted-steel.jpg','galvanised-tin':tex/'faded-yellow-steel.jpg','faded-hand-paint':tex/'faded-yellow-steel.jpg','iron-dark':tex/'tire-rubber.jpg','sand':tex/'dirt.jpg'})
steel=m['rusted-steel']; tin=m['galvanised-tin']; paint=m['rusted-steel']; dark=m['iron-dark']; glass=m['dirty-glass']; sand=m['sand']
for mat in m.values(): mat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.3,mat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
def parent_keep(o,par): o.parent=par; o.matrix_parent_inverse.identity()
def empty(name,loc,par=None):
 o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=town.game_vector(loc)
 if par: parent_keep(o,par)
 return o
def cube(name,c,size,mat,bevel=.05,par=None):
 o=town.cube(name,c,size,mat,bevel)
 if par: parent_keep(o,par)
 return o
def cyl(name,c,r,depth,mat,axis='z',verts=32,par=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=town.game_vector(c)); o=bpy.context.object; o.name=name; o.data.materials.append(mat)
 if axis=='z': o.rotation_euler[0]=math.pi/2
 if par: parent_keep(o,par)
 return o
def beam(name,a,b,w,mat,par=None):
 o=town.beam(name,a,b,w,mat)
 if par: parent_keep(o,par)
 return o
def torus(name,c,major,minor,mat,par=None):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=8,location=town.game_vector(c),rotation=(math.pi/2,0,0)); o=bpy.context.object; o.name=name; o.data.materials.append(mat)
 if par: parent_keep(o,par)
 return o

# Main borer: cutter head, 12 m diameter, with a true articulated hub pivot.
family=empty('town-borer',(0,0,0)); borer=empty('borer',(0,0,0),family); head=empty('borer:head',(0,0,-13.0),borer)
head.rotation_euler[1]=math.radians(12)  # a turned working pose, with its axis origin preserved
# Trace the cutter face silhouette and open slots from the generated front photo.
cutter_photo=Photo(tex/'borer-round3-head-front.png')
cutter_sky=cutter_photo.sky([(8,8),(cutter_photo.w-9,8),(8,cutter_photo.h-9),(cutter_photo.w-9,cutter_photo.h-9)],tolerance=28,grey=22)
cutter_rgb=cutter_photo.rgb(); cutter_mask=(~cutter_sky)&(cutter_rgb.mean(axis=2)>42)
cutter_loops=trace(cutter_mask,(0,0,cutter_photo.w,cutter_photo.h),tolerance=2.2,min_area=180)
cutter_mesh=Mesh()
def cutter_world(px,py,depth): return ((px-cutter_photo.w/2)*12/cutter_photo.w,(cutter_photo.h/2-py)*12/cutter_photo.h,depth)
slab(cutter_mesh,'face',cutter_photo,cutter_loops,cutter_world,-.2,0.0,wall_scale=12/cutter_photo.w)
cutter_face=cutter_mesh.finish('Cutter head photo slab',{'face':cutter_photo.material()})
parent_keep(cutter_face,head)
# Local geometry around the pivot: massive steel disk, hub, raised ribs and picks.
cyl('Plain dark cutter backing disc',(0,0,.25),5.52,.34,dark,'z',64,head)
torus('Deep rolled cutting rim',(0,0,0),5.72,.30,steel,head)
torus('Inner raised rim',(0,0,.17),5.35,.075,tin,head)
cyl('Propeller shaft flange',(0,0,.34),1.28,.70,steel,'z',48,head)
cyl('Propeller shaft boss',(0,0,.82),.82,1.12,tin,'z',40,head)
cyl('Shaft end cap',(0,0,1.43),.53,.30,steel,'z',32,head)
for i in range(8):
 ang=math.tau*i/16; co,si=math.cos(ang),math.sin(ang)
 # Massive forged spoke arms bridge the recessed face and raised rim.
 spoke=beam(f'Forged cutter spoke {i+1:02}',(co*1.0,si*1.0,.31),(co*5.38,si*5.38,.31),.46,tin,head)
 # Each spoke carries paired round disc cutters in separate thick housings.
 for j,radius in enumerate((2.15,3.28,4.40)):
  px,py=co*radius,si*radius
  cyl(f'Carbide disc housing {i+1:02}-{j+1}',(px,py,.47),.35,.38,steel,'z',20,head)
  cyl(f'Round carbide cutter {i+1:02}-{j+1}',(px,py,.70),.235,.28,dark,'z',24,head)
  torus(f'Cutter retaining ring {i+1:02}-{j+1}',(px,py,.78),.22,.045,tin,head)
 # Raised, hollow spoil scoop: two cheeks and a lip leave an open throat.
 px,py=co*4.72,si*4.72
 beam(f'Scoop cheek A {i+1:02}',(co*3.75-si*.30,si*3.75+co*.30,.32),(px-si*.30,py+co*.30,.62),.16,steel,head)
 beam(f'Scoop cheek B {i+1:02}',(co*3.75+si*.30,si*3.75-co*.30,.32),(px+si*.30,py-co*.30,.62),.16,steel,head)
 beam(f'Scoop cutting lip {i+1:02}',(px-si*.30,py+co*.30,.62),(px+si*.30,py-co*.30,.62),.14,tin,head)
for i in range(24):
 ang=math.tau*i/24; cyl(f'Fist-sized propeller flange bolt {i+1:02}',(math.cos(ang)*1.13,math.sin(ang)*1.13,.78),.105,.24,dark,'z',10,head)

# Long 10 m shield tube and the articulated gripper ring behind the cutter.
# Built-in image tool references: generated dead-on front and rear end views of
# this same yellow-ochre/rust machine on pale neutral studio backgrounds.
body_table={
 'photos': {'side':'borer-round3-machine-side.png','front':'borer-round4-head-front.png',
            'rear':'borer-round4-machine-rear.png','top':'borer-round3-machine-top.png'},
 'length':20.0,'width':11.2,'height':11.2,
 'side':{'start':28,'end':1080,'ground':600},
 'front':{'centre':768,'ground':1110,'scale':.0102},
 'rear':{'centre':768,'ground':850,'scale':.0134},
 'top':{'front':20,'rear':825,'centre':342,'along':'x'},
 'grey':30,'tolerance':42,'bleed_tolerance':42,'voxel':.12,'target':10500,
 'keep':lambda x,y,z: ((x*x+(y-5.6)*(y-5.6) <= 5.65*5.65) & (z >= -10.1) & (z <= 10.1)),
 'mask_dir':str(root/'.evidence/round4/masks')}
shield=carve_object('Shield body',tex,body_table)
parent_keep(shield,borer); shield.rotation_euler[0]=math.pi/2
shield.location=town.game_vector((0,-5.55,-23.0))
# The cutter must be visible through the shield's open front, not hidden by a cap.
for z in (-15.0,-18.0,-21.0):
 torus(f'Shield welded hoop {z}',(0,0,z),4.78,.12,steel,borer)
for i in range(8):
 ang=math.tau*i/8; x,y=math.cos(ang),math.sin(ang)
 shoe=empty(f'Gripper shoe {i+1:02}',(x*4.83,y*4.83,-22.0),borer)
 plate=cube(f'Gripper forged pad {i+1:02}',(0,0,0),(1.18,2.8,.58),tin,.12,shoe); plate.rotation_euler[2]=ang
 beam(f'Gripper ram {i+1:02}',(x*4.35,y*4.35,-20.8),(x*5.18,y*5.18,-22.0),.20,steel,borer)
 cube(f'Ram polished rod {i+1:02}',(x*4.78,y*4.78,-21.45),(.20,.20,1.15),dark,.04,borer)

# One connected gantry assembly: solid deck, rails and cab welded into one mesh.
gantry_parts=[cube('Gantry deck',(0,1.55,-38.0),(6.6,.82,10.2),steel,.08,borer)]
for x in (-3.05,3.05): gantry_parts.append(cube(f'Gantry rail {x}',(x,.55,-38.0),(.48,.62,11.2),tin,.08,borer))
gantry_parts.append(cube('Gantry control cab',(0,3.25,-36.7),(3.2,2.8,3.2),paint,.16,borer))
bpy.ops.object.select_all(action='DESELECT')
for obj in gantry_parts: obj.select_set(True)
bpy.context.view_layer.objects.active=gantry_parts[0]; bpy.ops.object.join()
gantry=gantry_parts[0]; gantry.name='Gantry solid deck and rails'
remesh=gantry.modifiers.new('Fuse touching gantry structure','REMESH'); remesh.mode='VOXEL'; remesh.voxel_size=.11
bpy.context.view_layer.objects.active=gantry; bpy.ops.object.modifier_apply(modifier=remesh.name)
for poly in gantry.data.polygons: poly.use_smooth=False
uv_layer=gantry.data.uv_layers.new(name='UVMap')
coords=[v.co for v in gantry.data.vertices]
mins=[min(v[axis] for v in coords) for axis in range(3)]
maxs=[max(v[axis] for v in coords) for axis in range(3)]
for poly in gantry.data.polygons:
 normal=poly.normal; axes=(1,2) if abs(normal.x)>.5 else (0,2) if abs(normal.y)>.5 else (0,1)
 for loop_index in poly.loop_indices:
  vertex=gantry.data.vertices[gantry.data.loops[loop_index].vertex_index].co
  uv_layer.data[loop_index].uv=tuple((vertex[axis]-mins[axis])/max(1e-6,maxs[axis]-mins[axis]) for axis in axes)
parent_keep(gantry,borer)
belt=empty('borer:belt',(0,2.1,-38.0),borer)
cube('Conveyor trough',(0,0,0),(2.5,.28,6.4),dark,.08,belt)
for x in (-1.24,1.24): beam(f'Conveyor raised edge {x}',(x,.20,-3.1),(x,.20,3.1),.12,tin,belt)
for i in range(11): cyl(f'Belt roller {i+1:02}',(0,-.22,-2.8+i*.56),.11,2.35,steel,'x',12,belt)
for x in (-2.3,2.3):
 lamp=empty('borer:lamp',(x,2.8,-37.4),borer)
 cube('Flood lamp housing',(0,0,0),(.48,.38,.28),dark,.04,lamp)
 cube('Flood lamp lens',(0,-.03,-.16),(.32,.24,.04),tin,.015,lamp)

# Repeating interior lining section with a believable service route and lights.
ring=empty('tunnel-ring',(0,0,0),family)
for i in range(24):
 ang=math.tau*i/24
 # Arc segments: inside-facing blocks around a 4 m radius, real structural depth.
 bpy.ops.mesh.primitive_cube_add(size=1,location=town.game_vector((math.cos(ang)*4.05,math.sin(ang)*4.05,0)))
 o=bpy.context.object; o.name=f'Concrete lining voussoir {i+1:02}'; o.dimensions=(1.08,1.08,.62); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.rotation_euler[1]=-ang; o.data.materials.append(m['cracked-concrete']); parent_keep(o,ring)
for side in (-1,1):
 for z in (-2.1,2.1):
  cyl(f'Ring service pipe {side} {z}',(side*3.4,1.15,z),.12,4.4,tin,'z',16,ring)
 beam(f'Ring cable tray rail {side}',(side*2.8,3.2,-2.0),(side*2.8,3.2,2.0),.10,steel,ring)
 for z in (-1.7,-.6,.6,1.7): beam(f'Tray rung {side} {z}',(side*2.65,3.2,z),(side*2.95,3.2,z),.055,tin,ring)
for side in (-1,1):
 lamp=empty('tunnel-ring:lamp',(side*3.1,3.75,0),ring); cube('Lining lamp cage',(0,0,0),(.38,.18,.28),dark,.03,lamp); cube('Lining lamp lens',(0,.12,0),(.25,.04,.15),paint,.01,lamp)

# Portal: reinforced concrete mouth with battered plate cladding and attached bolts.
portal=empty('portal',(0,0,0),family)
cube('Portal left abutment',(-5.1,3.0,0),(1.7,6.0,1.1),m['cracked-concrete'],.12,portal)
cube('Portal right abutment',(5.1,3.0,0),(1.7,6.0,1.1),m['cracked-concrete'],.12,portal)
cube('Portal crown',(0,6.1,0),(10.5,1.3,1.2),m['cracked-concrete'],.16,portal)
torus('Portal welded steel lip',(0,3.0,-.62),4.35,.22,steel,portal)
for x in (-4.3,4.3):
 for y in (.8,1.8,2.8,3.8,4.8):
  cube(f'Portal plate patch {x} {y}',(x,y,-.68),(1.0,.72,.14),tin,.04,portal)
  cyl(f'Portal patch rivet {x} {y}',(x-.34,y-.20,-.79),.055,.10,dark,'z',8,portal)
for x in range(-4,5): beam(f'Portal crown repair seam {x}',(x,5.45,-.65),(x+.3,6.55,-.65),.045,tin,portal)

# Export the real objects with joined UVMap semantics intact and their moving pivots retained.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and obj.data.uv_layers:
  for layer in obj.data.uv_layers: layer.name='UVMap'
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and obj.name!='Cutter head photo slab':
  mod=obj.modifiers.new('fit the 40000 triangle family budget','DECIMATE'); mod.ratio=.28
  bpy.context.view_layer.objects.active=obj; obj.select_set(True); bpy.ops.object.modifier_apply(modifier=mod.name); obj.select_set(False)
town.export_glb(glb)
if a.render:
 # Exported file is imported in a clean scene for the submitted views.
 bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=1000; scene.render.resolution_y=650; scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard'
 scene.render.image_settings.file_format='PNG'; scene.world=bpy.data.worlds.new('Overcast daylight'); scene.world.color=(.52,.52,.52)
 def aim(obj,target):
  direction=Vector(target)-obj.location
  up='Y' if abs(direction.normalized().z)>.98 else 'Z'
  obj.rotation_euler=direction.to_track_quat('-Z',up).to_euler()
 for obj in scene.objects:
  if obj.name.startswith(('tunnel-ring','portal')): obj.hide_render=True
 for loc,power,size in [((8,17,-18),7000,14),((-14,12,-8),5500,12),((0,15,4),4000,10)]:
  bpy.ops.object.light_add(type='AREA',location=town.game_vector(loc)); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,town.game_vector((0,2,-8)))
 evidence.mkdir(parents=True,exist_ok=True)
 views=[('front',(0,10,-82),(0,2,-13)),('side',(74,22,-28),(0,2,-28)),('above',(0,74,-28),(0,1,-28))]
 for name,loc,target in views:
  bpy.ops.object.camera_add(location=town.game_vector(loc)); camera=bpy.context.object; aim(camera,town.game_vector(target)); camera.data.lens=35; scene.camera=camera
  scene.render.filepath=str(evidence/f'borer-{name}.png'); bpy.ops.render.render(write_still=True)
 print(json.dumps({'glb':str(glb),'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'bytes':glb.stat().st_size}))
