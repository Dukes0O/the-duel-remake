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
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'rusted-steel':tex/'stages-rusted-steel.jpg','galvanised-tin':tex/'faded-yellow-steel.jpg','faded-hand-paint':tex/'faded-yellow-steel.jpg','iron-dark':tex/'tire-rubber.jpg','sand':tex/'dirt.jpg'})
steel=m['rusted-steel']; tin=m['galvanised-tin']; paint=m['faded-hand-paint']; dark=m['iron-dark']; glass=m['dirty-glass']; sand=m['sand']
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
# Local geometry around the pivot: massive steel disk, hub, raised ribs and picks.
cyl('Recessed cutter plate',(0,0,0),5.58,.30,dark,'z',64,head)
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
cyl('Shield barrel',(0,0,-6.7),4.82,9.8,paint,'z',64,borer)
for z in (-2.0,-5.0,-8.0,-11.0):
 torus(f'Shield welded hoop {z}',(0,0,z),4.78,.12,steel,borer)
for i in range(8):
 ang=math.tau*i/8; x,y=math.cos(ang),math.sin(ang)
 shoe=empty(f'Gripper shoe {i+1:02}',(x*4.83,y*4.83,-8.2),borer)
 plate=cube(f'Gripper forged pad {i+1:02}',(0,0,0),(1.18,2.8,.58),tin,.12,shoe); plate.rotation_euler[2]=ang
 beam(f'Gripper ram {i+1:02}',(x*4.35,y*4.35,-6.4),(x*5.18,y*5.18,-8.0),.20,steel,borer)
 cube(f'Ram polished rod {i+1:02}',(x*4.78,y*4.78,-7.15),(.20,.20,1.55),dark,.04,borer)

# Rear gantry with independently named conveyor joint and operator cab.
for x in (-3.1,3.1):
 for z in (-14.3,-20.0):
  beam(f'Gantry leg {x} {z}',(x,2.9,z),(x*.72,0.65,z),.24,steel,borer)
  beam(f'Lower longitudinal rail {x} {z}',(x*.72,.65,-14.3),(x*.72,.65,-21),.22,tin,borer)
for y in (.7,1.5,2.3): beam(f'Gantry cross beam {y}',(-2.7,y,-18.0),(2.7,y,-18.0),.18,steel,borer)
belt=empty('borer:belt',(0,1.25,-17.2),borer)
cube('Conveyor trough',(0,0,0),(2.5,.28,6.4),dark,.08,belt)
for x in (-1.24,1.24): beam(f'Conveyor raised edge {x}',(x,.20,-3.1),(x,.20,3.1),.12,tin,belt)
for i in range(11): cyl(f'Belt roller {i+1:02}',(0,-.22,-2.8+i*.56),.11,2.35,steel,'x',12,belt)
for x in (-1.05,1.05):
 beam(f'Conveyor hydraulic support {x}',(x,1.4,-14.5),(x,2.8,-18.2),.13,steel,borer)
# Elevated cab: curved glass achieved with framed slanted, thick panels.
cube('Cab floor',(0,3.25,-18.5),(3.4,.18,2.7),steel,.08,borer)
for x in (-1.55,1.55):
 beam(f'Cab A post {x}',(x,3.35,-19.7),(x*.90,5.7,-19.2),.12,tin,borer)
 beam(f'Cab rear post {x}',(x,3.35,-17.2),(x,5.5,-17.25),.12,steel,borer)
 beam(f'Cab roof rail {x}',(x*.90,5.7,-19.2),(x,5.5,-17.25),.12,tin,borer)
cube('Cab rear bulkhead',(0,4.4,-17.22),(3.0,2.1,.12),paint,.05,borer)
for x in (-1.0,1.0): cube(f'Cab side window {x}',(x*1.54,4.45,-18.4),(.06,1.45,1.35),glass,.02,borer)
# Real-thickness ladder and hand rails, service pipes, and work lights.
for x in (-2.25,2.25): beam(f'Cab ladder stringer {x}',(x,0.7,-15.4),(x,3.25,-17.4),.075,tin,borer)
for i in range(11): beam(f'Ladder rung {i+1:02}',(-2.27,.85+i*.23,-15.55-i*.18),(-1.78,.85+i*.23,-15.55-i*.18),.055,steel,borer)
for x in (-2.3,2.3):
 lamp=empty(f'borer:lamp',(x,5.9,-18.7),borer)
 cube('Flood lamp housing',(0,0,0),(.48,.38,.28),dark,.04,lamp)
 cube('Flood lamp lens',(0,-.03,-.16),(.32,.24,.04),m['faded-hand-paint'],.015,lamp)
for x in (-2.0,-1.0,0,1.0,2.0): beam(f'Access catwalk rail {x}',(x,1.15,-14),(x,1.15,-20.9),.055,tin,borer)
for side in (-1,1):
 beam(f'Catwalk handrail upper {side}',(side*3.1,2.0,-14.3),(side*3.1,2.0,-20.8),.07,tin,borer)
 beam(f'Catwalk handrail lower {side}',(side*3.1,1.3,-14.3),(side*3.1,1.3,-20.8),.06,steel,borer)

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
town.export_glb(glb)
if a.render:
 # Exported file is imported in a clean scene for the submitted views.
 bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=1100; scene.render.resolution_y=760; scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'; scene.world=bpy.data.worlds.new('Overcast daylight'); scene.world.color=(.52,.52,.52)
 def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
 for obj in scene.objects:
  if obj.name.startswith(('tunnel-ring','portal')): obj.hide_render=True
 bpy.ops.object.camera_add(location=town.game_vector((12,15,-31))); camera=bpy.context.object; aim(camera,town.game_vector((0,2,-9))); scene.camera=camera; camera.data.lens=46
 for loc,power,size in [((8,17,-18),7000,14),((-14,12,-8),5500,12),((0,15,4),4000,10)]:
  bpy.ops.object.light_add(type='AREA',location=town.game_vector(loc)); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,town.game_vector((0,2,-8)))
 evidence.mkdir(parents=True,exist_ok=True); scene.render.filepath=str(evidence/'borer-three-quarter.png'); bpy.ops.render.render(write_still=True)
 print(json.dumps({'glb':str(glb),'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'bytes':glb.stat().st_size}))
