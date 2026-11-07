"""Original tunnel borer family.
Machine axis: Z. Cutter/front: -Z. Tracks sit on the ground at Y=0.
Game space is +Y up; all placed parts use this one coordinate frame.
"""
import argparse, json, math, sys
import numpy as np
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
from photo_carve import carve_object, lift_if_dark
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

# The tube is the measured core. Its longest dimension is Z, with the cutter
# pivot exactly at its -Z front end. `carve_object` builds Y-up photo geometry;
# the Blender-to-glTF axis mapping below maps that geometry into the same
# game-space frame as town_base before the glTF Y-up export.
TUBE_LENGTH = 30.0
TUBE_DIAMETER = 11.8
TUBE_RADIUS = TUBE_DIAMETER / 2
TUBE_FRONT = -15.45
TUBE_REAR = TUBE_LENGTH / 2
TUBE_CENTER_Y = 6.06
family=empty('town-borer',(0,0,0)); borer=empty('borer',(0,0,0),family)
head=empty('borer:head',(0,TUBE_CENTER_Y,TUBE_FRONT),borer)
head.rotation_euler[1]=math.radians(8)  # turning on the Z shaft axis, with its origin at the bearing

# Clean photo set for the shell only. The full-machine images are left untouched
# for the gantry reference and for the side, rear, above, road and mayor pictures.
body_table={
 'photos': {'side':'borer-round5-tube-side.png','front':'borer-round5-tube-front.png',
            'rear':'borer-round5-tube-rear.png','top':'borer-round5-tube-top.png'},
 'length':TUBE_LENGTH,'width':TUBE_DIAMETER,'height':TUBE_DIAMETER,
 'side':{'start':126,'end':1940,'ground':650},
 'front':{'centre':640,'ground':1256,'top':20},
 'rear':{'centre':640,'ground':1256,'top':20},
 'top':{'front':12,'rear':1228,'centre':352,'along':'x','x_scale':.0253},
 'grey':28,'tolerance':42,'bleed_tolerance':48,'voxel':.14,'target':9000,
 'round':2.2,
 'mask_dir':str(root/'.evidence/round6/masks')}
shield=carve_object('Shield tube carved',tex,body_table)
shield.parent=borer; shield.location=(0,0,0); shield.rotation_euler[0]=math.pi; shield.scale[2]=-1.15

# Measured face photo on the cutter pivot, backed by a deep steel rim and
# individual forged spokes, carbide discs and spoil scoops.
cutter_photo=Photo(tex/'borer-round5-tube-front.png')
lift_if_dark(cutter_photo)
cutter_sky=cutter_photo.sky([(8,8),(cutter_photo.w-9,8),(8,cutter_photo.h-9),(cutter_photo.w-9,cutter_photo.h-9)],tolerance=30,grey=28)
cutter_mask=(~cutter_sky)&(cutter_photo.rgb().mean(axis=2)>42)
cutter_mask[int(cutter_photo.h*.98):,:]=False
cy,cx=np.ogrid[:cutter_photo.h,:cutter_photo.w]
# Restore the shadowed central hub, which the edge flood can reach through the
# deep cutter pockets in the generated photo.
hub_radius_px=int(.72/TUBE_DIAMETER*cutter_photo.w/.92)
cutter_mask[(cx-cutter_photo.w/2)**2+(cy-cutter_photo.h/2)**2<hub_radius_px**2]=True
# The traced silhouette can include pale studio wedges around the cutter.
# Keep the photo slab inside the forged outer rim so no background sheet floats.
rim_radius_px=int(5.10/TUBE_DIAMETER*cutter_photo.w/.92)
cutter_mask[(cx-cutter_photo.w/2)**2+(cy-cutter_photo.h/2)**2>rim_radius_px**2]=False
cutter_loops=trace(cutter_mask,(0,0,cutter_photo.w,cutter_photo.h),tolerance=7.0,min_area=400)
cutter_mesh=Mesh()
def cutter_world(px,py,depth):
 return ((px-cutter_photo.w/2)*TUBE_DIAMETER/cutter_photo.w*.92,
         (cutter_photo.h/2-py)*TUBE_DIAMETER/cutter_photo.h*.92,depth)
slab(cutter_mesh,'face',cutter_photo,cutter_loops,cutter_world,-.22,-.12,wall_scale=TUBE_DIAMETER/cutter_photo.w)
cutter_face=cutter_mesh.finish('Cutter face photo',{'face':cutter_photo.material()})
cutter_face.parent=head; cutter_face.matrix_parent_inverse.identity(); cutter_face.location=(0,0,0)

def child(o, parent, loc, rotation=None):
 o.parent=parent; o.matrix_parent_inverse.identity(); o.location=town.game_vector(loc)
 if rotation is not None: o.rotation_euler=rotation
 return o

def part_cube(name, parent, center, size, mat, bevel=.04):
 return child(town.cube(name,(0,0,0),size,mat,bevel),parent,center)

def part_beam(name, parent, start, end, width, mat):
 mid=tuple((a+b)/2 for a,b in zip(start,end))
 return child(town.beam(name,(0,0,0),(end[0]-start[0],end[1]-start[1],end[2]-start[2]),width,mat),parent,mid)

def part_cylinder(name, parent, center, radius, depth, mat, axis='z', verts=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=(0,0,0))
 o=bpy.context.object; o.name=name; o.data.materials.append(mat)
 if axis=='x': o.rotation_euler[1]=math.pi/2
 elif axis=='y': o.rotation_euler[0]=math.pi/2
 return child(o,parent,center)

def part_torus(name, parent, center, major, minor, mat):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=16,minor_segments=6,location=(0,0,0),rotation=(math.pi/2,0,0))
 o=bpy.context.object; o.name=name; o.data.materials.append(mat)
 return child(o,parent,center)

# A ship-shaft bearing, rolled rims, and raised radial cutters give the head
# real depth behind the photo-cut openings.
part_torus('Cutter outer rolled rim',head,(0,0,-.05),5.1,.16,steel)
part_torus('Cutter inner bearing rim',head,(0,0,.12),5.28,.085,tin)
for i in range(8):
 ang=math.tau*i/8; co,si=math.cos(ang),math.sin(ang)
 part_beam(f'Forged cutter spoke {i+1:02}',head,(co*1.0,si*1.0,.20),(co*5.35,si*5.35,.20),.30,tin)
 for j,radius in enumerate((2.35,4.30)):
  x,y=co*radius,si*radius
  part_cylinder(f'Carbide housing {i+1:02}-{j+1}',head,(x,y,.44),.29,.34,steel,'z',16)
  part_cylinder(f'Carbide cutter {i+1:02}-{j+1}',head,(x,y,.66),.19,.18,dark,'z',20)
  part_torus(f'Cutter retaining ring {i+1:02}-{j+1}',head,(x,y,.77),.19,.035,tin)
 # Open scoop cheeks and a bridged cutting lip.
 x,y=co*4.88,si*4.88
 part_beam(f'Spoil scoop cheek A {i+1:02}',head,(co*3.9-si*.28,si*3.9+co*.28,.3),(x-si*.28,y+co*.28,.55),.12,steel)
 part_beam(f'Spoil scoop cheek B {i+1:02}',head,(co*3.9+si*.28,si*3.9-co*.28,.3),(x+si*.28,y-co*.28,.55),.12,steel)
 part_beam(f'Spoil scoop lip {i+1:02}',head,(x-si*.28,y+co*.28,.55),(x+si*.28,y-co*.28,.55),.11,tin)
for i in range(16):
 ang=math.tau*i/16
 part_cylinder(f'Propeller flange bolt {i+1:02}',head,(math.cos(ang)*1.12,math.sin(ang)*1.12,.62),.075,.16,dark,'z',8)

# Separate forged gripper shoes brace the lower tube, with paired hydraulic rams.
for i,z in enumerate((-7.2,-1.8,3.6,8.7)):
 for side in (-1,1):
  x=side*4.75
  shoe=part_cube(f'Gripper shoe {i+1:02} {side:+}',borer,(x,4.55,z),(1.30,.82,1.65),steel,.10)
  part_cube(f'Gripper contact pad {i+1:02} {side:+}',borer,(x,4.99,z),(1.24,.20,1.58),tin,.05)
  part_beam(f'Gripper hydraulic ram {i+1:02} {side:+}',borer,(x,5.17,z-.34),(side*5.35,5.7,z-.34),.18,dark)
  part_cylinder(f'Ram pin {i+1:02} {side:+}',borer,(x,5.17,z-.34),.18,.34,tin,'x',12)

# Gantry: paired ground rails and crawler wheels, uprights, then a deck whose
# front edge meets the tube's rear end at Z=+15 m.
gantry=empty('borer:gantry',(0,0,0),borer)
for side in (-1,1):
 x=side*4.5
 # The rails sit on the same Y=0 plane as the tube's four gripper feet.
 part_cube(f'Gantry ground rail {side:+}',gantry,(x,.20,23.0),(.52,.40,16.0),dark,.05)
 part_cube(f'Gantry upper rail cap {side:+}',gantry,(x,.43,23.0),(.62,.10,16.0),tin,.025)
 for i,z in enumerate((16.0,20.5,25.0,30.0)):
  part_cylinder(f'Gantry crawler wheel {side:+}-{i+1}',gantry,(x,.40,z),.36,.20,steel,'x',20)
  part_cylinder(f'Gantry wheel hub {side:+}-{i+1}',gantry,(x-side*.12,.40,z),.14,.08,tin,'x',12)
 for z in (16.0,21.0,27.0):
  part_beam(f'Gantry upright {side:+}-{z}',gantry,(x,.52,z),(side*4.2,5.65,z),.26,steel)
  part_beam(f'Gantry diagonal brace {side:+}-{z}',gantry,(x,.55,z-.8),(side*4.2,5.4,z+.8),.13,tin)
part_cube('Gantry deck',gantry,(0,5.85,21.2),(9.0,.46,12.8),steel,.09)
part_cube('Gantry front coupling plate',gantry,(0,5.85,14.42),(8.4,.72,1.10),tin,.04)
for x in (-4.25,4.25):
 part_beam(f'Deck side girder {x:+}',gantry,(x,6.15,14.3),(x,6.15,27.3),.28,steel)
 part_beam(f'Deck diagonal truss {x:+}',gantry,(x,5.8,17.0),(x,6.6,21.0),.16,tin)
 part_beam(f'Deck diagonal truss rear {x:+}',gantry,(x,5.8,23.0),(x,6.6,27.0),.16,tin)
# A compact battered control cab and glazed windows sit over the deck.
part_cube('Gantry cab shell',gantry,(0,8.05,19.2),(3.7,3.8,3.5),paint,.16)
for side in (-1,1):
 part_cube(f'Cab front glass {side:+}',gantry,(side*.94,8.15,17.42),(1.36,1.8,.08),glass,.025)
 part_cube(f'Cab side glass {side:+}',gantry,(side*1.91,8.15,19.25),(.08,1.8,1.62),glass,.025)
 part_beam(f'Cab window frame {side:+}',gantry,(side*.02,7.18,17.35),(side*.02,9.10,17.35),.09,tin)
# Ladder on the road-facing side, with real open rungs.
for z in (17.4,20.1): part_beam(f'Gantry ladder stile {z}',gantry,(-4.72,1.0,z),(-4.72,5.6,z),.09,tin)
for i in range(11):
 y=1.12+i*.42
 part_beam(f'Gantry ladder rung {i+1:02}',gantry,(-4.72,y,17.4),(-4.72,y,20.1),.07,steel)

# The conveyor is a separately named moving assembly on its rear pivot.
belt=empty('borer:belt',(0,6.65,23.7),borer)
part_cube('Conveyor trough',belt,(0,0,0),(2.6,.34,12.8),steel,.06)
for side in (-1,1):
 x=side*1.32
 part_beam(f'Conveyor raised lip {side:+}',belt,(x,.22,-6.1),(x,.22,6.1),.13,tin)
 for i in range(13):
  z=-5.8+i*.96
  part_cylinder(f'Conveyor roller {side:+}-{i+1:02}',belt,(0,-.22,z),.095,2.42,steel,'x',12)
for i,z in enumerate((-5.7,-2.0,2.0,5.7)):
 part_beam(f'Conveyor support leg {i+1}',belt,(-1.1,-.8,z),(1.1,-.8,z),.12,steel)
# Floodlights belong to one separately named part for the night-light hook.
lamps=empty('borer:lamp',(0,0,0),borer)
for side in (-1,1):
 x=side*3.7
 part_beam(f'Floodlight mast {side:+}',lamps,(x,6.55,19.0),(x,10.1,19.0),.11,steel)
 part_cube(f'Floodlight housing {side:+}',lamps,(x,10.1,19.0),(.56,.42,.68),dark,.06)
 part_cube(f'Floodlight lens {side:+}',lamps,(x,10.0,18.64),(.34,.25,.10),tin,.02)

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
# Count the evaluated family once. Avoid per-object decimation: it can erase
# small braced parts and corrupt the authored silhouettes.
graph=bpy.context.evaluated_depsgraph_get()
triangles=0
counts=[]
for obj in bpy.context.scene.objects:
 if obj.type=='MESH':
  evaluated=obj.evaluated_get(graph); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles(); count=len(mesh.loop_triangles); triangles+=count; counts.append((count,obj.name)); evaluated.to_mesh_clear()
print(json.dumps({'triangle_count':triangles,'largest_meshes':sorted(counts,reverse=True)[:18]}))
if triangles>40000: raise RuntimeError(f'family triangle budget exceeded: {triangles} > 40000')
town.export_glb(glb)
# Read the exported GLB back and verify the true Y-up game-space bounds first.
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene

def game_bounds(obj):
 points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
 xs=[p.x for p in points]; ys=[p.z for p in points]; zs=[-p.y for p in points]
 return ([min(xs),min(ys),min(zs)],[max(xs),max(ys),max(zs)])

def is_borer_part(obj):
 parent=obj.parent
 while parent:
  if parent.name=='borer' or parent.name.startswith('borer:'): return True
  parent=parent.parent
 return False

bounds={}
for obj in scene.objects:
 if obj.type=='MESH' and is_borer_part(obj):
  lo,hi=game_bounds(obj); bounds[obj.name]=(lo,hi)
  print(json.dumps({'part':obj.name,'min':lo,'max':hi}))
tube=next((b for n,b in bounds.items() if n.startswith('Shield tube carved')),None)
if tube is None: raise RuntimeError('placement gate: carved tube missing after GLB readback')
extents=[tube[1][i]-tube[0][i] for i in range(3)]
if not (extents[2]>extents[0] and extents[2]>extents[1]): raise RuntimeError(f'placement gate: tube longest axis is not Z: {extents}')
head_node=next((obj for obj in scene.objects if obj.name=='borer:head'),None)
if head_node is None: raise RuntimeError('placement gate: cutter pivot node missing')
head_z_game=-head_node.matrix_world.translation.y
if abs(head_z_game-tube[0][2])>.08: raise RuntimeError(f'placement gate: cutter centre Z {head_z_game:.3f} != tube front {tube[0][2]:.3f}')
for name,(lo,hi) in bounds.items():
 if lo[1]<-.01: raise RuntimeError(f'placement gate: {name} stands below ground Y=0 ({lo[1]:.3f})')
print(json.dumps({'placement_gate':'passed','tube_extents_xyz':extents,'tube_front_z':tube[0][2],'cutter_center_z':head_z_game,'mesh_parts':len(bounds)}))
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
 ground=bpy.data.materials.new('Plain grey photo ground'); ground.diffuse_color=(.38,.38,.38,1); ground.use_nodes=True
 ground.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.38,.38,1)
 ground.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.94
 bpy.ops.mesh.primitive_plane_add(size=1000,location=(0,0,0)); bpy.context.object.name='Plain grey ground'; bpy.context.object.data.materials.append(ground)
 for loc,power,size in [((12,24,-18),6500,18),((-18,16,24),4200,16),((4,28,8),3000,20)]:
  bpy.ops.object.light_add(type='AREA',location=town.game_vector(loc)); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,town.game_vector((0,5,8)))
 evidence.mkdir(parents=True,exist_ok=True)
 views=[('side',(48,20,8),(0,5.9,8),60,math.pi/2),('front',(0,18,-42),(0,6,-15.45),18,0),
        ('rear',(0,18,44),(0,6,27),18,0),('above',(0,68,8),(0,0,8),58,math.pi/2),
        ('road',(36,16,-30),(0,5.8,8),68,math.pi/2),('mayor',(-48,62,-42),(0,5.8,8),76,math.pi/2)]
 for name,loc,target,scale,roll in views:
  bpy.ops.object.camera_add(location=town.game_vector(loc)); camera=bpy.context.object; aim(camera,town.game_vector(target)); camera.data.type='ORTHO'; camera.data.ortho_scale=scale; scene.camera=camera
  if roll: camera.rotation_euler.rotate_axis('Z',roll)
  scene.render.filepath=str(evidence/f'borer-{name}.png'); bpy.ops.render.render(write_still=True)
 print(json.dumps({'glb':str(glb),'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'bytes':glb.stat().st_size}))
