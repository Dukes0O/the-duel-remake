"""Hand-built Wasteland civic and service buildings, TOWN-ART-SERVICES.

Coordinates use game metres (+Y up, front -Z). The recipe writes the named
family GLB and renders its review only after importing that GLB into a clean
scene, so the submitted view matches the exported material and UV data.
"""
import argparse, json, math, sys
import numpy as np
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--evidence',default='.qa-dist/town-services-2');p.add_argument('--review',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/services-2.glb';blend=Path(a.evidence)/'services-2.blend'
if not blend.is_absolute():blend=root/blend
sheet=root/'docs/board/looks/town-art-services/round-11.jpg';review_output=root/'.evidence/2026-11-08/TOWN-ART-SERVICES/round-11/rendered'
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[] if not a.review else [str(review_output)],'summary':str(sheet)}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
from photo_model import Mesh as PhotoMesh, Photo, fill as photo_fill, slab as photo_slab, tidy as photo_tidy, trace as photo_trace
from photo_carve import carve_object
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'galvanised-tin':tex/'town-water-corrugated.jpg','rusted-steel':tex/'town-water-tin.jpg',
                      'salvaged-brick':tex/'town-services-brick.jpg'})
steel=m['rusted-steel'];tin=m['galvanised-tin'];dark=m['iron-dark'];brick=m['salvaged-brick'];wood=m['weathered-plank'];paint=m['faded-hand-paint'];sand=m['sand'];glass=m['dirty-glass'];canvas=m['patched-canvas']
hall_roof_photo=Photo(tex/'rusted-corrugated-tin.jpg');hall_roof_material=hall_roof_photo.material()
for mat in m.values():
 mat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=min(mat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value,.28)
root_obj=bpy.data.objects.new('town-services-2',None);bpy.context.collection.objects.link(root_obj);root_obj.empty_display_type='PLAIN_AXES'
def parent_keep(obj,parent):
 world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world;return obj
def empty(name,parent,foot=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);parent_keep(o,parent);o.empty_display_type='PLAIN_AXES'
 if foot:o['footprint_cells']=list(foot)
 return o
def box(name,c,s,mat=steel,b=.035,parent=None):
 o=town.cube(name,c,s,mat,b)
 return parent_keep(o,parent) if parent else o
def beam(name,p0,p1,w,mat=steel,parent=None):
 a0=town.game_vector(p0);b0=town.game_vector(p1);d=b0-a0
 o=box(name,((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2),(w,d.length,w),mat,.012)
 o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 return parent_keep(o,parent) if parent else o
def cyl(name,c,r,depth,mat=steel,verts=20,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def sphere(name,c,r,mat,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=r,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def tube(name,c,major,minor,mat,parent=None,major_segments=24,minor_segments=8):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=major_segments,minor_segments=minor_segments,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def shell(name,x0,x1,z0,z1,h,material,parent):
 box(name+' foundation',(0,.18,0),(x1-x0,.36,z1-z0),dark,.045,parent)
 box(name+' walls',(0,h/2,0),(x1-x0-.3,h,z1-z0-.3),material,.045,parent)
 # Door and shutter openings read as deep dark voids, with thick framing.
 box(name+' entry shadow',(0,1.25,z0-.03),(1.45,2.25,.10),dark,.025,parent)
 for x in (-.83,.83):beam(name+' jamb',(x,.12,z0-.14),(x,2.48,z0-.14),.12,wood,parent)
 beam(name+' lintel',(-.86,2.48,z0-.14),(.86,2.48,z0-.14),.14,steel,parent)
building_roots={}
def make(name,foot):
 o=empty(name,root_obj,foot);building_roots[name]=o;return o
# Town service buildings: each has its own 8 m cell footprint and distinct roof silhouette.
ids=['toll-bank','school','radio-mast','helipad','notice-board']
for n in ids:
 size={'toll-bank':(2,2),'school':(3,2),'radio-mast':(1,1),'helipad':(4,4),'notice-board':(1,1)}[n]
 w,d=size[0]*8-1,size[1]*8-1
 b=make(n,size);x0,x1=-w/2,w/2;z0,z1=-d/2,d/2
 if n=='toll-bank':
  # The vault is measured from the photographed long wall and its door. Its
  # main front faces the road at -Z; the porch, booth and barrier stay separate.
  body_table={
   'photos':{'side':'toll-bank-side.jpg','front':'toll-bank-front.jpg',
             'rear':'toll-bank-rear.jpg','top':'toll-bank-top.jpg'},
   # The front door is about 2 m tall: its 245 px height gives about 8 m
   # across the 940 px elevation and a 2.8 m front roof peak.
   'length':8.0,'width':8.0,'height':2.8,
   'side':{'start':39,'end':983,'ground':412},
   'front':{'centre':512,'ground':438,'top':93,'top_height':2.8},
   # The rear photograph has a lower peak than the front photograph.
   'rear':{'centre':512,'ground':381,'top':137,'top_height':2.0},
   'top':{'front':61,'rear':961,'centre':512,'x_scale':8.0/900},
   'grey':26,'tolerance':40,'bleed_tolerance':42,'voxel':.09,'target':1800,
   'keep':lambda x,y,z:y<=1.82,
   'mask_dir':str(root/'.qa-dist/town-services-2/toll-bank-masks')}
  body=carve_object('toll-bank:body',tex,body_table);parent_keep(body,b)

  # A deep 2.4 m door sits over its photographed opening, with a real wheel,
  # hinges and an uneven bolted frame.
  front_z=-4.0
  door=box('toll-bank:door',(0,1.12,front_z-.14),(2.4,2.12,.24),dark,.12,b)
  box('toll-bank:door-face',(0,1.12,front_z-.28),(2.14,1.88,.06),steel,.055,b)
  for x in (-1.35,1.35):box('toll-bank:door-frame',(x,1.22,front_z-.20),(.18,2.38,.22),tin,.04,b)
  box('toll-bank:door-frame',(0,2.38,front_z-.20),(2.88,.18,.22),tin,.04,b)
  wheel=tube('toll-bank:door-wheel',(0,1.12,front_z-.34),.34,.065,dark,b,24,8);wheel.rotation_euler[0]=math.pi/2
  hub=cyl('toll-bank:door-wheel-hub',(0,1.12,front_z-.36),.10,.12,tin,12,b);hub.rotation_euler[0]=math.pi/2
  box('toll-bank:door-wheel-spoke',(0,1.12,front_z-.405),(.57,.05,.05),tin,.015,b)
  box('toll-bank:door-wheel-spoke',(0,1.12,front_z-.41),(.05,.57,.05),tin,.015,b)
  for x in (-1.2,1.2):
   for y in (.42,1.92):
    hinge=box('toll-bank:door-hinge',(x,y,front_z-.36),(.24,.50,.16),dark,.04,b)
    for dy in (-.14,.14):
     rivet=cyl('toll-bank:door-hinge-rivet',(x,y+dy,front_z-.46),.055,.05,tin,8,b);rivet.rotation_euler[0]=math.pi/2

  # Four roof plates follow the measured rise from the middle to every eave.
  # The side and end photographs both show a central crown, so this is a
  # shallow hipped roof rather than a long gable ridge.
  ridge,eave=2.38,1.82
  top_photo=body_table['_photos']['top']
  corners={
   'front':((-3.86,eave,-3.90),(3.86,eave,-3.90),(0,ridge,0)),
   'right':((3.86,eave,-3.90),(3.86,eave,3.90),(0,ridge,0)),
   'rear':((3.86,eave,3.90),(-3.86,eave,3.90),(0,ridge,0)),
   'left':((-3.86,eave,3.90),(-3.86,eave,-3.90),(0,ridge,0)),
  }
  for side,points in corners.items():
   points=[(x,y+.025,z) for x,y,z in points]
   mesh=bpy.data.meshes.new('toll-bank hipped roof repair plate')
   mesh.from_pydata([town.game_vector(q) for q in points],[],[(0,1,2)])
   mesh.materials.append(top_photo.material());mesh.update()
   uv=mesh.uv_layers.new(name='UVMap')
   for poly in mesh.polygons:
    for li in poly.loop_indices:
     q=points[mesh.loops[li].vertex_index]
     px=512+q[0]/(8.0/900);py=61+(q[2]+4.0)/(8.0/900)
     uv.data[li].uv=top_photo.uv(px,py)
   obj=bpy.data.objects.new(f'toll-bank:roof-panel-{side}',mesh)
   bpy.context.collection.objects.link(obj);parent_keep(obj,b)
  box('toll-bank:roof-crown',(0,ridge-.03,0),(.28,.06,.28),dark,.018,b)

  # The porch canopy meets the strongroom eave and rests on two steel posts.
  box('toll-bank:porch-deck',(0,.15,-4.40),(5.8,.30,1.55),dark,.04,b)
  for x in (-2.7,2.7):box('toll-bank:porch-post',(x,1.18,-5.08),(.16,2.36,.16),steel,.025,b)
  box('toll-bank:porch-canopy',(0,2.30,-4.42),(5.95,.16,1.50),tin,.035,b)
  for x in (-2.5,-1.25,0,1.25,2.5):box('toll-bank:canopy-rib',(x,2.39,-4.48),(.045,.045,1.40),dark,.008,b)

  # A small booth sits beside the barrier. Its roof touches both side walls.
  box('toll-bank:booth-body',(3.05,.92,-3.10),(1.45,1.84,1.50),wood,.07,b)
  box('toll-bank:booth-window',(3.05,1.34,-3.88),(1.02,.56,.035),glass,.035,b)
  box('toll-bank:booth-sill',(3.05,1.04,-3.92),(1.22,.10,.12),steel,.015,b)
  box('toll-bank:booth-roof',(3.05,1.98,-3.10),(1.75,.18,1.80),tin,.045,b)

  # The striped arm pivots at the booth and rests on a low catcher at its tip.
  box('toll-bank:barrier-post',(2.45,.72,-5.18),(.20,1.44,.20),steel,.025,b)
  box('toll-bank:barrier-arm',(-.70,1.10,-5.18),(6.50,.16,.16),wood,.025,b)
  for index,x in enumerate((-3.30,-2.15,-1.0,.15,1.30,2.15)):
   box('toll-bank:barrier-stripe',(x,1.10,-5.29),(.60,.18,.035),paint if index%2==0 else dark,.012,b)
  box('toll-bank:barrier-catcher',(-4.05,.32,-5.18),(.18,.64,.18),steel,.025,b)

  # Fastener heads add depth to the photographed plate seams without filling
  # the door opening. The front and side carry their own rows.
  for x in (-3.35,-2.25,2.25,3.35):
   for y in (.42,.82,1.45,1.72):
    rivet=cyl('toll-bank:wall-rivet',(x,y,front_z+.12),.045,.05,tin,8,b);rivet.rotation_euler[0]=math.pi/2
  for z in (-3.3,-2.0,0,2.0,3.3):
   for y in (.45,1.65):
    for xside in (-3.77,3.77):
     rivet=cyl('toll-bank:side-rivet',(xside,y,z),.035,.05,tin,8,b);rivet.rotation_euler[1]=math.pi/2
  continue
 if n=='radio-mast':
  # 19 m guyed triangular lattice, real-section angle steel, warning lamp.
  for x,z in [(-1.7,-1.7),(1.7,-1.7),(0,1.8)]:beam('Mast foot',(x,.1,z),(x,1,z),.13,steel,b)
  levels=[1,7,13,17.8]
  for x,z in [(-1.7,-1.7),(1.7,-1.7),(0,1.8)]:
   beam('Mast leg',(x,.4,z),(0,18.5,0),.11,steel,b)
  for y in levels:
   rr=1.7*(1-y/19)
   pts=[(-rr,y,-rr),(rr,y,-rr),(0,y,rr)]
   for j in range(3):beam('Mast lattice brace',pts[j],pts[(j+1)%3],.045,dark,b)
  for x,z in [(-1.7,-1.7),(1.7,-1.7),(0,1.8)]:beam('Mast guy wire',(x,.15,z),(0,12,0),.035,dark,b)
  lamp=bpy.data.materials.new('Town service red warning lamp');lamp.use_nodes=True;bs=lamp.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.35,.035,.012,1);bs.inputs['Emission Color'].default_value=(1,.08,.015,1);bs.inputs['Emission Strength'].default_value=2
  sphere('radio-mast:lamp',(0,19.0,0),.22,lamp,b);continue
 if n=='helipad':
  box('Helipad earth plinth',(0,.15,0),(w,d,.3),sand,.08,b);box('Helipad welded steel deck',(0,.42,0),(w-1,d-1,.24),steel,.045,b)
  for x in range(-int(w/2)+1,int(w/2),2):beam('Deck plate weld',(x,.56,-d/2+1),(x,.56,d/2-1),.035,tin,b)
  # Bold letter H from real painted bars and perimeter stop rails.
  for x in (-5,5):box('Landing H upright',(x,.58,0),(.85,.08,8),paint,.025,b)
  box('Landing H crossbar',(0,.59,0),(10,.09,.85),paint,.025,b)
  for x in (-w/2+1,w/2-1):beam('Pad perimeter rail',(x,.68,-d/2+1),(x,.68,d/2-1),.12,tin,b)
  for x in (-w/2+2,w/2-2):
   beam('Floodlight post',(x,.5,-d/2+1),(x,4,-d/2+1),.10,steel,b);box('Floodlight hood',(x,4,-d/2+1),(.45,.24,.7),dark,.03,b)
  for x in (-6,6):cyl('Fuel drum',(x,.95,5),.37,.9,steel,20,b)
  continue
 if n=='notice-board':
  for x in (-2.4,2.4):beam('Notice post',(x,.1,-2),(x,2.7,-2),.15,wood,b)
  box('Public notice plate',(0,1.75,-2),(4.8,1.5,.2),steel,.045,b);box('Notice paper',(0,1.75,-2.15),(3.9,.82,.04),paint,.015,b);continue
 heights={'toll-bank':4.4,'school':5.2}
 ht=heights.get(n,5.0);mat=brick if n=='toll-bank' else wood if n=='school' else tin
 if n!='scrapyard':shell(n,x0+.5,x1-.5,z0+.5,z1-.5,ht,mat,b)
 if n=='school':
  # Brick gable edges and pitch roof with exposed purlins.
  for side in (-1,1):
   z=z0+1 if side<0 else z1-1
   beam(n+' gable slope',(x0+.4,ht,z),(0,ht+2,z),.16,brick,b);beam(n+' gable slope',(0,ht+2,z),(x1-.4,ht,z),.16,brick,b)
  for side in (-1,1):
   roof=box(n+' pitched roof',(0,ht+1,side*d*.18),(w*.58,.14,d*.55),tin,.025,b);roof.rotation_euler[2]=side*.48
 elif n!='scrapyard':
  # Leanto roof with a true fall and thin ridge, patched with corrugated plates.
  for ix in range(4):
   z=z0+1+ix*(d-2)/3
   roof=box(n+' formed roof panel',(0,ht+.55,z),(w+1.2,.16,(d-1)/3+.12),tin,.025,b);roof.rotation_euler[2]=.02
  for x in (-w/2+1,w/2-1):beam(n+' roof side seam',(x,ht+.75,z0+.5),(x,ht+.75,z1-.5),.08,steel,b)
 # Asymmetric corrugated wall patchwork and windows with deep jambs.
 if n!='scrapyard':
  for i,x in enumerate([-w*.32,0,w*.32]):
   box(n+' facade patch',(x,ht*.52,z0+.02),(w*.18,ht*.48,.10),tin if i%2==0 else wood,.025,b)
 if n=='toll-bank':
  # Thick strongroom door, ring wheel, and a real movable-looking hinged barrier arm.
  box('Bank steel strongroom door',(0,2.15,z0-.2),(4.2,3.8,.5),steel,.12,b)
  tube('Bank locking wheel',(0,2.2,z0-.55),.78,.08,dark,b);cyl('Bank wheel hub',(0,2.2,z0-.55),.17,.15,tin,20,b)
  for ang in range(0,360,90):
   x=math.cos(math.radians(ang))*.72;y=2.2+math.sin(math.radians(ang))*.72;beam('Bank wheel spoke',(0,2.2,z0-.65),(x,y,z0-.65),.075,tin,b)
  beam('Barrier pivot',(0,.2,z0-4),(0,2.0,z0-4),.24,steel,b);beam('Toll barrier arm',(0,1.8,z0-4),(6,1.8,z0-4),.22,wood,b)
  for x in (1,3,5):box('Barrier faded bands',(x,1.8,z0-4.14),(.55,.24,.05),paint,.01,b)
 if n=='school':
  # Recognizable salvaged bus shell outside the lean-to, held up by its own axle wheels.
  body=box('Old school bus body',(0,1.65,z0-2.3),(w*.64,2.65,4.2),paint,.35,b)
  for x in (-w*.23,-w*.08,w*.08,w*.23):box('Bus dark window',(x,2.3,z0-4.46),(1.05,.78,.07),glass,.04,b)
  for x in (-w*.2,w*.2):tube('Bus road tyre',(x,.72,z0-1),.55,.17,dark,b)
  box('Chalk board',(0,1.7,z0-5),(3.6,1.8,.14),dark,.035,b)
  beam('Bus lean-to front post',(0,.3,2.6),(0,4.2,2.6),.14,wood,b)
  for x in (-4,4):beam('Bus lean-to roof',(x,4.1,2.6),(0,4.3,2.6),.13,steel,b)
 # Real sectional posts and corner plates visibly tie each facade to its roof frame.
 if n!='scrapyard':
  for x in (x0+.5,x1-.5):
   for z in (z0+.5,z1-.5):beam(n+' corner column',(x,.22,z),(x,ht,z),.17,steel,b)
   for z in (z0+.5,z1-.5):box(n+' base footplate',(x,.30,z),(.36,.12,.36),dark,.025,b)
  for x in (x0+.7,x1-.7):beam(n+' front eave beam',(x0+.5,ht+.05,z0+.45),(x1-.5,ht+.05,z0+.45),.13,wood,b)

# Join each building's fixed geometry before export. The building and lamp
# nodes stay addressable, while small Blender objects collapse into one mesh.
for building_id, building_root in building_roots.items():
 objects=[]
 for obj in list(building_root.children):
  if obj.name.startswith(f'{building_id}:'):
   continue
  if obj.type not in {'MESH','CURVE'}:
   continue
  bpy.ops.object.select_all(action='DESELECT')
  obj.select_set(True);bpy.context.view_layer.objects.active=obj
  if obj.type=='CURVE':bpy.ops.object.convert(target='MESH')
  objects.append(bpy.context.object)
 if len(objects)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  bpy.ops.object.join()
  joined=bpy.context.object
  joined.name=f'{building_id}:structure'
  if building_id=='workshop':
   budget=joined.modifiers.new('Workshop structure triangle budget','DECIMATE');budget.ratio=.72
   bpy.context.view_layer.objects.active=joined;bpy.ops.object.modifier_apply(modifier=budget.name)

 if building_id=='toll-bank':
  # Keep the ground origin at the strongroom footprint center, not the porch centroid.
  continue

 footprint=building_root.get('footprint_cells')
 meshes=[obj for obj in building_root.children if obj.type=='MESH']
 corners=[obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
 if footprint and corners:
  low_x=min(point.x for point in corners);high_x=max(point.x for point in corners)
  low_z=min(-point.y for point in corners);high_z=max(-point.y for point in corners)
  center_x=(low_x+high_x)/2;center_z=(low_z+high_z)/2
  span_x=max(abs(low_x-center_x),abs(high_x-center_x))
  span_z=max(abs(low_z-center_z),abs(high_z-center_z))
  half_x=footprint[0]*4-.6;half_z=footprint[1]*4-.6
  scale_x=min(1,half_x/span_x);scale_z=min(1,half_z/span_z)
  for obj in meshes:
   matrix=obj.matrix_world;inverse=matrix.inverted()
   for vertex in obj.data.vertices:
    point=matrix @ vertex.co
    point.x=(point.x-center_x)*scale_x
    point.y=(point.y+center_z)*scale_z
    vertex.co=inverse @ point
   obj.data.update()
  if building_root.name.split('.')[0]=='motor-pool':
   bpy.context.view_layer.update()
   for obj in meshes:
    points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs=[p.x for p in points];zs=[-p.y for p in points]
    assert min(xs)>=-15.5 and max(xs)<=15.5 and min(zs)>=-7.5 and max(zs)<=7.5, f'{obj.name} exceeds the motor-pool plot'
    print(f'MOTOR-POOL FINAL BOUNDS {obj.name}: X={min(xs):.2f}..{max(xs):.2f}, Y={min(p.z for p in points):.2f}..{max(p.z for p in points):.2f}, Z={min(zs):.2f}..{max(zs):.2f}')

# One durable shared root; separate named children keep in-game placement addressable.

def audit_toll_bank_pieces():
 target=building_roots['toll-bank'];pieces=[obj for obj in bpy.data.objects if obj.parent==target and obj.type=='MESH']
 bpy.context.view_layer.update();bounds={}
 for obj in pieces:
  points=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
  values=[(p.x,p.z,-p.y) for p in points]
  lo=tuple(min(p[i] for p in values) for i in range(3));hi=tuple(max(p[i] for p in values) for i in range(3))
  bounds[obj]=(lo,hi)
 for obj,(lo,hi) in bounds.items():
  assert lo[0]>=-7.5 and hi[0]<=7.5 and lo[2]>=-7.5 and hi[2]<=7.5, f'{obj.name} exceeds the 2x2 toll-bank footprint: {lo}..{hi}'
  grounded=abs(lo[1])<=.035
  touching=any(obj!=other and all(max(0,other_box[0][axis]-hi[axis],lo[axis]-other_box[1][axis])<=.06 for axis in range(3))
               for other,other_box in bounds.items())
  contact='ground' if grounded else 'another piece' if touching else 'FAIL'
  print(f'TOLL-BANK PIECE {obj.name}: x={lo[0]:.3f}..{hi[0]:.3f} y={lo[1]:.3f}..{hi[1]:.3f} z={lo[2]:.3f}..{hi[2]:.3f} contact={contact}')
  assert grounded or touching, f'{obj.name} floats without touching ground or another piece'

audit_toll_bank_pieces()

glb.parent.mkdir(parents=True,exist_ok=True);town.export_glb(glb)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if a.review:
 review_output.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT'
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
 scene.world=bpy.data.worlds.new('even neutral grey studio');scene.world.use_nodes=True
 scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.20,.20,1)
 scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
 ground_mat=bpy.data.materials.new('plain grey review ground');ground_mat.diffuse_color=(.20,.20,.20,1);ground_mat.use_nodes=True
 ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.20,.20,.20,1)
 ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
 ground=town.cube('review-only neutral grey ground',(0,-.10,0),(500,.2,500),ground_mat,0)
 light_data=bpy.data.lights.new('large soft review light','AREA');light_data.energy=14000;light_data.shape='DISK';light_data.size=35
 light=bpy.data.objects.new('large soft review light',light_data);scene.collection.objects.link(light)
 light.location=town.game_vector((14,28,-24));light.rotation_euler=(town.game_vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
 fill_data=bpy.data.lights.new('soft fill','AREA');fill_data.energy=5000;fill_data.shape='DISK';fill_data.size=30
 fill=bpy.data.objects.new('soft fill',fill_data);scene.collection.objects.link(fill)
 fill.location=town.game_vector((-20,18,14));fill.rotation_euler=(town.game_vector((0,2,0))-fill.location).to_track_quat('-Z','Y').to_euler()
 target_root=next(o for o in bpy.data.objects if o.name.split('.')[0]=='toll-bank')
 def within(obj,target):
  parent=obj
  while parent:
   if parent==target:return True
   parent=parent.parent
  return False
 for obj in bpy.data.objects:
  if obj==ground or obj==light or obj==fill:continue
  obj.hide_render=not within(obj,target_root)
 camera_data=bpy.data.cameras.new('orthographic matched review camera');camera=bpy.data.objects.new('orthographic matched review camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
 def render(name,eye,look,scale,resolution):
  camera.location=town.game_vector(eye);camera.rotation_euler=(town.game_vector(look)-camera.location).to_track_quat('-Z','Y').to_euler()
  camera_data.type='ORTHO';camera_data.ortho_scale=scale
  scene.render.resolution_x,scene.render.resolution_y=resolution;scene.render.filepath=str(review_output/(name+'.png'))
  bpy.ops.render.render(write_still=True)
 shots=[
  ('model-side',(30,2.6,0),(0,2.6,0),11.0,(1024,512)),
  ('model-front',(0,2.6,-30),(0,2.6,0),11.0,(1024,512)),
  ('model-rear',(0,2.6,30),(0,2.6,0),11.0,(1024,512)),
  ('model-above',(0,36,0),(0,0,0),11.0,(1024,1024)),
  ('three-quarter-road',(20,12,-22),(0,2.5,0),14.0,(1024,768)),
  ('three-quarter-yard',(-20,12,22),(0,2.5,0),14.0,(1024,768)),
  ('mayor-view',(55,68,-55),(0,0,0),14.0,(1024,768)),
 ]
 for shot in shots:render(*shot)
 print(json.dumps({'glb':str(glb),'renders':[str(review_output/(shot[0]+'.png')) for shot in shots]}))
else:print(json.dumps({'glb':str(glb),'blend':str(blend)}))
