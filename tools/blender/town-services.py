"""Hand-built Wasteland civic and service buildings, TOWN-ART-SERVICES.

Coordinates use game metres (+Y up, front -Z). The recipe writes the named
family GLB and renders its review only after importing that GLB into a clean
scene, so the submitted view matches the exported material and UV data.
"""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--review',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/services.glb';blend=root/'art-build/town/services.blend'
sheet=root/'docs/board/looks/town-art-services/round-1.jpg';evidence=root/'.evidence/2026-11-06/TOWN-ART-SERVICES/round-1'
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[] if not a.review else [str(evidence)],'summary':str(sheet)}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'galvanised-tin':tex/'town-water-corrugated.jpg','rusted-steel':tex/'town-water-tin.jpg',
                      'salvaged-brick':tex/'town-services-brick.jpg'})
steel=m['rusted-steel'];tin=m['galvanised-tin'];dark=m['iron-dark'];brick=m['salvaged-brick'];wood=m['weathered-plank'];paint=m['faded-hand-paint'];sand=m['sand'];glass=m['dirty-glass'];canvas=m['patched-canvas']
for mat in m.values():
 mat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=min(mat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value,.28)
root_obj=bpy.data.objects.new('town-services',None);bpy.context.collection.objects.link(root_obj);root_obj.empty_display_type='PLAIN_AXES'
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
def tube(name,c,major,minor,mat,parent=None):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=24,minor_segments=8,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def shell(name,x0,x1,z0,z1,h,material,parent):
 box(name+' foundation',(0,.18,0),(x1-x0,.36,z1-z0),dark,.045,parent)
 box(name+' walls',(0,h/2,0),(x1-x0-.3,h,z1-z0-.3),material,.045,parent)
 # Door and shutter openings read as deep dark voids, with thick framing.
 box(name+' entry shadow',(0,1.25,z0-.03),(1.45,2.25,.10),dark,.025,parent)
 for x in (-.83,.83):beam(name+' jamb',(x,.12,z0-.14),(x,2.48,z0-.14),.12,wood,parent)
 beam(name+' lintel',(-.86,2.48,z0-.14),(.86,2.48,z0-.14),.14,steel,parent)
def gable(name,x0,x1,z0,z1,eave,ridge,mat,parent):
 # Four solid planes create a real pitched silhouette and capped gable ends.
 for side in (-1,1):
  z=z0+(z1-z0)*(side+1)/2
  # Brick gable end closes the roof and carries the wheel clock as one solid facade.
  verts=[town.game_vector((x0,eave,z)),town.game_vector((0,ridge,z)),town.game_vector((x1,eave,z))]
  face_normal=Vector((0,.10 if side<0 else -.10,0));verts_back=[v-face_normal for v in verts]
  mesh=bpy.data.meshes.new(name+' brick gable infill');mesh.from_pydata(verts+verts_back,[],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)]);mesh.materials.append(brick);mesh.update()
  uv=mesh.uv_layers.new(name='UVMap')
  for poly in mesh.polygons:
   for li in poly.loop_indices:
    vx,_,vz=verts[mesh.loops[li].vertex_index%3];uv.data[li].uv=(vx/2,vz/2)
  gable_face=bpy.data.objects.new(name+' brick gable infill',mesh);bpy.context.collection.objects.link(gable_face);parent_keep(gable_face,parent)
  beam(name+' rafter',(x0,eave,z),(0,ridge,z),.14,wood,parent)
  beam(name+' rafter',(0,ridge,z),(x1,eave,z),.14,wood,parent)
 for x in (x0,0,x1):beam(name+' purlin',(x,eave,z0-.12),(x,eave,z1+.12),.10,dark,parent)
 # Thin formed roof plates; alternating seam strips, exposed fasteners and patches.
 for side in (-1,1):
  outer=z0 if side<0 else z1
  for j in range(3):
   far=outer+(0-outer)*(j/3);near=outer+(0-outer)*((j+1)/3)
   yf=eave+(ridge-eave)*(1-abs(far)/max(abs(z0),abs(z1)))
   yn=eave+(ridge-eave)*(1-abs(near)/max(abs(z0),abs(z1)))
   verts=[town.game_vector((x0-.35,yf,far)),town.game_vector((x1+.35,yf,far)),town.game_vector((x1+.35,yn,near)),town.game_vector((x0-.35,yn,near))]
   normal=Vector((0,-(near-far),yn-yf)).normalized()*.075
   verts += [v+normal for v in verts]
   mesh=bpy.data.meshes.new(f'{name} pressed roof panel {side} {j}');mesh.from_pydata(verts,[],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]);mesh.materials.append(mat);mesh.update()
   uv=mesh.uv_layers.new(name='UVMap')
   for poly in mesh.polygons:
    for li in poly.loop_indices:
     vx,_,vz=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(vx/2,vz/2)
   obj=bpy.data.objects.new(f'{name} roof sheet {side} {j}',mesh);bpy.context.collection.objects.link(obj);parent_keep(obj,parent)
   # Raised lap straps are separate thick strip steel, physically on the plane.
   for x in (-2.8,-1.5,0,1.55,2.85):
    xx=x*.70; yy=eave+(ridge-eave)*(1-abs(xx)/max(abs(x0),abs(x1)))
    beam(name+' roof lap',(xx,yy+.06,z-.5),(xx,yy+.06,z+.5),.04,dark,parent)
 for x in (x0*.82,x1*.82):
  for j in range(3):sphere(name+' roof rivet',(x,eave+(ridge-eave)*(1-abs(x)/max(abs(x0),abs(x1)))+.08,z0+(z1-z0)*(j+.5)/3),.035,dark,parent)
def make(name,foot):return empty(name,root_obj,foot)

# 3x3 Town Hall: the deliberately detailed visual anchor for this family.
h=make('town-hall',(3,3));shell('hall',-10.7,10.7,-10.7,10.7,5.5,brick,h)
gable('hall',-10.9,10.9,-11,11,5.55,10.3,tin,h)
# Patchy roof repairs, extractor, attic vent, cable and rooftop salvage.
for x,z,sx,sz,mat in [(-7,-6,3.4,2.1,steel),(6,5,2.4,3.2,tin),(-4,7,2.2,1.3,steel),(7,-7,1.6,2.4,steel)]:
 box('Hall lapped roof repair',(x,8.18,z),(sx,.08,sz),mat,.025,h)
 for edge in (-1,1):beam('Repair weld bead',(x-sx*.42,8.25,z+edge*sz*.43),(x+sx*.42,8.25,z+edge*sz*.43),.035,dark,h)
for x,z in [(-6,-4),(5,7)]:
 box('Roof vent collar',(x,8.4,z),(.9,.3,.9),steel,.06,h);cyl('Roof vent stack',(x,9.15,z),.24,1.35,dark,16,h);cyl('Vent rain cap',(x,9.86,z),.42,.12,steel,16,h)
# Car-wheel clock: thick tyre ring, hub, spokes, hand-painted clock face.
cyl('Clock face',(0,6.85,-11.02),1.34,.14,wood,32,h).rotation_euler[0]=math.pi/2
wheel=tube('Car wheel clock tyre',(0,6.85,-11.10),1.28,.17,dark,h);wheel.rotation_euler[0]=math.pi/2
cyl('Clock dial',(0,6.85,-11.15),.93,.035,paint,32,h).rotation_euler[0]=math.pi/2
for i in range(12):
 angle=i*math.tau/12; x=math.sin(angle)*.78; y=6.85+math.cos(angle)*.78
 box('Clock hour marker',(x,y,-11.12),(.10,.19,.06),wood,.018,h).rotation_euler[2]=-angle
for a0,a1 in [((0,6.85,-11.18),(0,7.48,-11.18)),((0,6.85,-11.2),(.48,6.58,-11.2))]:beam('Clock hand',a0,a1,.08,dark,h)
cyl('Clock hub',(0,6.85,-11.26),.13,.08,steel,16,h).rotation_euler[0]=math.pi/2
for x in (-7.3,-4.0,4.0,7.3):
 box('Hall recessed window',(x,3.55,-10.83),(1.55,1.85,.12),dark,.035,h)
 box('Hall dirty glass',(x,3.58,-10.93),(1.25,1.48,.05),glass,.025,h)
 beam('Window centre mullion',(x,2.86,-11.00),(x,4.3,-11.00),.075,wood,h)
 beam('Window stone sill',(x-.95,2.61,-10.98),(x+.95,2.61,-10.98),.10,brick,h)
# Two narrow flags, guyed poles; canvas is visibly patched and does not read as a block.
for i,x in enumerate((-7.7,7.7)):
 beam('Flag pole',(x,6.3,-6),(x,12,-6),.10,dark,h)
 for sx in (-1,1):beam('Flag guy',(x,5.4,-6),(x+sx*.75,.2,-6),.035,steel,h)
 cloth=box('Patched town flag',(x+1.05,10.8,-6),(.98,1.0,.045),canvas,.012,h);cloth.rotation_euler[2]=-.09
 for q in (-.28,.3):beam('Flag repair seam',(x+.56,10.8+q,-6.04),(x+1.52,10.8+q,-6.04),.035,paint,h)
# Raised roof monitor salvaged from an industrial clerestory, with its own
# thick rafters, small pane divisions and visibly separate patch roof.
box('Hall roof monitor body',(0,9.05,5.2),(6.8,2.2,4.0),wood,.045,h)
for x in (-2.65,-1.35,0,1.35,2.65):
 box('Monitor dark glazing',(x,9.15,3.15),(.92,1.25,.08),glass,.02,h)
 beam('Monitor glazing mullion',(x,8.48,3.08),(x,9.82,3.08),.07,steel,h)
for x in (-3.6,3.6):
 beam('Monitor gable rafter',(x,10.15,3.05),(0,11.3,5.2),.14,steel,h)
 beam('Monitor gable rafter',(0,11.3,5.2),(x,10.15,7.35),.14,steel,h)
for side in (-1,1):
 roof=box('Monitor pressed roof panel',(0,10.82,5.2+side*1.0),(6.7,.12,2.35),tin,.025,h);roof.rotation_euler[0]=side*.28
# Inset timber entry, simple steel handle and two broad worn approach steps.
box('Hall timber entry door',(0,1.25,-10.88),(1.28,2.15,.13),wood,.035,h)
for x in (-.38,.38):box('Hall door recessed panel',(x,1.28,-10.97),(.48,1.55,.035),steel,.025,h)
sphere('Hall door handle',(.48,1.18,-11.02),.075,tin,h)
box('Hall entry landing',(0,.28,-11.7),(4.4,.4,2.0),brick,.05,h)
box('Hall entry step',(0,.12,-12.55),(5.0,.22,1.0),steel,.035,h)
for x in (-1.9,1.9):beam('Entry canopy post',(x,.3,-12.2),(x,3.7,-12.2),.14,wood,h)
beam('Entry canopy front beam',(-2.0,3.7,-12.3),(2.0,3.7,-12.3),.14,steel,h)
box('Entry patched tin canopy',(0,3.9,-11.7),(4.7,.16,2.1),tin,.025,h)
# Roof ridge welded ladder, chimney, vents, loose-but-attached salvage and aerial.
for x in (-2.7,-1.6):beam('Roof ladder rail',(x,5.6,2),(x,8.3,2),.07,steel,h)
for y in [5.9+i*.32 for i in range(8)]:beam('Roof ladder rung',(-2.78,y,2),(-1.52,y,2),.055,dark,h)
beam('Roof aerial mast',(8.2,8.1,6),(8.2,11.7,6),.07,dark,h)
for y in (9.0,10.0,11.0):beam('Roof aerial crossarm',(7.7,y,6),(8.7,y,6),.05,steel,h)
# Hand-built freestanding notice board, braced legs, sloped weather hood and pinned notices.
board_x=-6.8
board=box('Notice board back',(board_x,1.65,-12.55),(3.5,2.05,.20),wood,.045,h)
for dx in (-1.48,-.55,.45,1.35):box('Notice paper',(board_x+dx,1.68,-12.68),(.62,.72,.035),paint,.015,h)
for dx in (-1.72,1.72):beam('Notice board post',(board_x+dx,2.8,-12.55),(board_x+dx,.12,-12.55),.14,steel,h)
beam('Notice hood',(board_x-1.9,2.8,-12.75),(board_x+1.9,2.8,-12.75),.12,tin,h)
for dx in (-1.35,1.35):beam('Notice diagonal brace',(board_x+dx,1.25,-12.55),(board_x+dx*.8,.25,-12.55),.09,wood,h)
# Town service buildings: each has its own 8 m cell footprint and distinct roof silhouette.
ids=['scrapyard','forge','workshop','motor-pool','paint-shop','trading-post','toll-bank','school','radio-mast','helipad','notice-board']
for n in ids:
 size={'scrapyard':(3,3),'forge':(2,2),'workshop':(3,2),'motor-pool':(4,2),'paint-shop':(2,2),'trading-post':(3,2),'toll-bank':(2,2),'school':(3,2),'radio-mast':(1,1),'helipad':(4,4),'notice-board':(1,1)}[n]
 w,d=size[0]*8-1,size[1]*8-1
 b=make(n,size);x0,x1=-w/2,w/2;z0,z1=-d/2,d/2
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
 heights={'scrapyard':5.8,'forge':5.5,'workshop':5.3,'motor-pool':5,'paint-shop':4.8,'trading-post':5.4,'toll-bank':4.4,'school':5.2}
 ht=heights.get(n,5.0);mat=brick if n in ('forge','toll-bank') else wood if n=='school' else tin
 shell(n,x0+.5,x1-.5,z0+.5,z1-.5,ht,mat,b)
 if n in ('forge','school'):
  # Brick gable edges and pitch roof with exposed purlins.
  for side in (-1,1):
   z=z0+1 if side<0 else z1-1
   beam(n+' gable slope',(x0+.4,ht,z),(0,ht+2,z),.16,brick,b);beam(n+' gable slope',(0,ht+2,z),(x1-.4,ht,z),.16,brick,b)
  for side in (-1,1):
   roof=box(n+' pitched roof',(0,ht+1,side*d*.18),(w*.58,.14,d*.55),tin,.025,b);roof.rotation_euler[2]=side*.48
 else:
  # Leanto roof with a true fall and thin ridge, patched with corrugated plates.
  for ix in range(4):
   z=z0+1+ix*(d-2)/3
   roof=box(n+' formed roof panel',(0,ht+.55,z),(w+1.2,.16,(d-1)/3+.12),tin,.025,b);roof.rotation_euler[2]=.02
  for x in (-w/2+1,w/2-1):beam(n+' roof side seam',(x,ht+.75,z0+.5),(x,ht+.75,z1-.5),.08,steel,b)
 # Asymmetric corrugated wall patchwork and windows with deep jambs.
 for i,x in enumerate([-w*.32,0,w*.32]):
  box(n+' facade patch',(x,ht*.52,z0+.02),(w*.18,ht*.48,.10),tin if i%2==0 else wood,.025,b)
  if n in ('workshop','motor-pool','school') and x!=0:box(n+' dirty window',(x,ht*.72,z0-.06),(1.2,.8,.08),glass,.025,b)
 if n=='forge':
  # Furnace mouth, thick brick arch surround, glowing ash and tapered chimney stack.
  box('Furnace arch masonry',(0,1.3,z0-.18),(2.7,2.5,.34),brick,.08,b);box('Forge black furnace mouth',(0,1.28,z0-.39),(1.45,1.25,.08),dark,.025,b)
  glow=bpy.data.materials.new('Forge ember glow');glow.use_nodes=True;bs=glow.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.55,.12,.018,1);bs.inputs['Emission Color'].default_value=(1,.22,.025,1);bs.inputs['Emission Strength'].default_value=2.5
  box('Forge bed of embers',(0,.88,z0-.47),(1.05,.12,.04),glow,.02,b);box('forge:lamp',(0,1.35,z0-.53),(.25,.28,.09),glow,.02,b)
  for x in (-1.2,1.2):beam('Furnace arch jamb',(x,.1,z0-.34),(x,2.7,z0-.34),.22,steel,b)
  for y in (5.5,6.5,7.5,8.5):box('Brick chimney course',(x0+1,y,z1-1),(2.1,.16,2.1),brick,.03,b)
  cyl('Forge chimney throat',(x0+1,9,z1-1),.47,1.2,dark,16,b)
 if n=='scrapyard':
  # Uneven connected pressed-car shells are stacked into sculptural ridges.
  for j,(x,z,yaw,col) in enumerate([(-5,-3,-.2,paint),(-2,-4,.17,steel),(1,-3,-.11,tin),(4,-4,.28,paint),(-4,-.3,.19,tin),(0,.1,-.23,steel),(4,.2,.1,paint)]):
   shellob=box('Crushed car shell '+str(j),(x,1.35,z),(4.2,1.1,2.1),col,.35,b);shellob.rotation_euler[1]=yaw
   for dx in (-1.25,1.25):tube('Exposed car wheel',(x+dx,.62,z-1.02),.47,.17,dark,b)
   for side in (-1,1):beam('Bent car roof rail',(x-1.5,2,z+side*.65),(x+1.5,2,z+side*.65),.10,steel,b)
  # Working crane gantry, mast, cantilever and suspended magnet.
  for x in (-w*.36,w*.36):beam('Crane leg',(x,.25,-1),(x,9,-1),.34,steel,b);beam('Crane foot',(x-1,.28,-1),(x+1,.28,-1),.35,dark,b)
  beam('Crane top beam',(-w*.42,9,-1),(w*.42,9,-1),.42,steel,b)
  for x in (-w*.39,w*.39):beam('Crane diagonal',(x,5,-1),(x,9,-1),.16,tin,b)
  beam('Magnet cable',(1.4,8.9,-1),(1.4,3.2,-1),.055,dark,b);cyl('Scrap magnet',(1.4,3,-1),.8,.45,steel,16,b);tube('Magnet coil',(1.4,3,-1),.57,.10,paint,b)
 if n=='workshop':
  # Two post service lift and a recognizable low car silhouette inside the bay.
  for x in (-3.6,3.6):beam('Lift column',(x,.25,-2),(x,3.8,-2),.2,steel,b);beam('Lift pad',(x,3.55,-2),(x,3.55,1.6),.18,tin,b)
  body=box('Workshop car lower body',(0,1.8,0),(4.8,1.05,2.0),paint,.32,b)
  cab=box('Workshop car cabin',(0,2.55,.1),(2.4,.9,1.7),steel,.32,b)
  for x in (-1.5,1.5):tube('Workshop car tyre',(x,1.2,-.85),.38,.14,dark,b);tube('Workshop car tyre',(x,1.2,.85),.38,.14,dark,b)
 if n=='motor-pool':
  for bay in range(4):
   x=-w*.37+bay*(w*.74/3);beam('Numbered bay divider',(x,.1,z0),(x,4.9,z0),.17,steel,b)
   plate=box('Bay number plate',(x,4.1,z0-.12),(1.25,.72,.08),wood,.025,b)
   font=bpy.data.curves.new('bay number','FONT');font.body=str(bay+1);font.size=.48;font.extrude=.002;obj=bpy.data.objects.new('Bay numeral',font);bpy.context.collection.objects.link(obj);obj.location=town.game_vector((x-.14,4.1,z0-.2));obj.rotation_euler=(-math.pi/2,0,0);parent_keep(obj,b);font.materials.append(paint)
 if n=='paint-shop':
  # Drips are distinct tapering metal runs in varied worn pigments beneath spray booth.
  for i,(x,mat) in enumerate(zip((-4,-3,-2,-1,0,1,2,3,4),(paint,steel,tin,wood,paint,steel,tin,paint,wood))):
   beam('Paint drip streak',(x,4.1,z0-.08),(x+.08*(i%2),1.4+(i%3)*.34,z0-.08),.10,mat,b)
  box('Spray booth interior',(0,2.0,2.2),(w*.56,3.5,d*.36),dark,.025,b)
  for y in (2.7,3.2):beam('Booth extraction duct',(-3.5,y,2.5),(3.5,y,2.5),.16,tin,b)
 if n=='trading-post':
  box('Loading dock',(0,.6,z0-1.5),(w-2,1.0,2.0),wood,.08,b)
  for i in range(5):box('Cargo crate',(x0+2+(i%3)*2.6,.7+i//3*1.1,z0-3.3),(1.8,1.5,1.65),wood,.06,b)
  tube('Trade scale ring',(0,3.2,z0-.3),.75,.055,dark,b);beam('Scale post',(0,2.2,z0-.3),(0,4.1,z0-.3),.12,steel,b)
  # Large painted board has pictograms only; no fragile generated lettering.
  box('Trading sign board',(0,ht+.6,z0-.4),(w*.65,1.0,.16),wood,.04,b)
  for x in (-w*.17,0,w*.17):box('Trade sign glyph',(x,ht+.6,z0-.51),(.45,.38,.05),paint,.04,b)
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
 for x in (x0+.5,x1-.5):
  for z in (z0+.5,z1-.5):beam(n+' corner column',(x,.22,z),(x,ht,z),.17,steel,b)
  for z in (z0+.5,z1-.5):box(n+' base footplate',(x,.30,z),(.36,.12,.36),dark,.025,b)
 for x in (x0+.7,x1-.7):beam(n+' front eave beam',(x0+.5,ht+.05,z0+.45),(x1-.5,ht+.05,z0+.45),.13,wood,b)

# One durable shared root; separate named children keep in-game placement addressable.
glb.parent.mkdir(parents=True,exist_ok=True);town.export_glb(glb)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if a.review:
 evidence.mkdir(parents=True,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
 # Capture a matched close view and the roof-heavy mayor view from the exported model.
 def render(name,loc,target,lens=54):
  camdata=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,camdata);bpy.context.collection.objects.link(cam);cam.location=town.game_vector(loc);look=town.game_vector(target);cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=lens;bpy.context.scene.camera=cam
  scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
  scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
  if scene.world is None:scene.world=bpy.data.worlds.new('neutral overcast review daylight')
  scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.60,.60,.60,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
  scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=1.0;scene.view_settings.gamma=1
  # Broad area light and a plain mid-tone ground keep surfaces legible.
  light_data=bpy.data.lights.new('bright overcast area','AREA');light_data.energy=24000;light_data.shape='DISK';light_data.size=45
  light=bpy.data.objects.new('bright overcast area',light_data);bpy.context.collection.objects.link(light);light.location=town.game_vector((22,64,-34));light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
  sun_data=bpy.data.lights.new('soft high desert sun','SUN');sun_data.energy=1.6;sun_data.angle=math.radians(28)
  sun=bpy.data.objects.new('soft high desert sun',sun_data);bpy.context.collection.objects.link(sun);sun.location=town.game_vector((0,42,-25));sun.rotation_euler=(Vector((0,0,0))-sun.location).to_track_quat('-Z','Y').to_euler()
  ground_mat=bpy.data.materials.new('review ground / muted earth');ground_mat.diffuse_color=(.23,.21,.18,1);ground_mat.use_nodes=True;ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.23,.21,.18,1);ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
  ground=town.cube('neutral packed-earth review ground',(0,-.08,0),(1000,.16,1000),ground_mat,0)
  scene.render.filepath=str(evidence/name);bpy.ops.render.render(write_still=True)
  for transient in (cam,light,sun,ground):bpy.data.objects.remove(transient,do_unlink=True)
  if ground_mat.users==0:bpy.data.materials.remove(ground_mat)
 # Locate imported children by hierarchy and center camera on the exported Hall.
 hall=next(o for o in bpy.data.objects if o.name.split('.')[0]=='town-hall')
 bpy.context.view_layer.update();center_blender=hall.matrix_world.translation;center=(center_blender.x,center_blender.z,-center_blender.y)
 # The family roots share one local origin in the asset. Isolate the Hall for
 # its matched detail views so the other in-place buildings do not occlude it.
 for obj in bpy.data.objects:
  parent=obj;is_hall=False
  while parent:
   if parent.name.split('.')[0]=='town-hall':is_hall=True;break
   parent=parent.parent
  obj.hide_render=not is_hall
 # Render 3/4 driver view and 45-degree roof view.
 render('hall-driver.png',(center[0]+11,center[1]+10,center[2]-37),center,39)
 render('hall-mayor.png',(center[0]+8,center[1]+40,center[2]-40),center,48)
 # Build a clean overview by spatially arranging the imported building groups.
 for obj in bpy.data.objects:obj.hide_render=False
 buildings=[o for o in bpy.data.objects if o.type=='EMPTY' and o.name.split('.')[0] in ['town-hall']+ids]
 for i,o in enumerate(buildings):
  if o.name.split('.')[0]!='town-hall':o.location=town.game_vector(((i%4-1.5)*40,0,(i//4-1)*42))
 bpy.context.view_layer.update();render('family-overview.png',(0,115,-130),(0,0,0),44)
 print(json.dumps({'glb':str(glb),'evidence':str(evidence),'hall_triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')}))
else:print(json.dumps({'glb':str(glb),'blend':str(blend)}))
