"""Hand-built Wasteland civic and service buildings, TOWN-ART-SERVICES.

Coordinates use game metres (+Y up, front -Z). The recipe writes the named
family GLB and renders its review only after importing that GLB into a clean
scene, so the submitted view matches the exported material and UV data.
"""
import argparse, json, math, sys
import numpy as np
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--evidence',default='.qa-dist/town-services');p.add_argument('--review',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/services.glb';blend=Path(a.evidence)/'services.blend'
if not blend.is_absolute():blend=root/blend
sheet=root/'docs/board/looks/town-art-services/round-4.jpg';review_output=root/'.evidence/2026-11-07/TOWN-ART-SERVICES/round-4/rendered'
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
building_roots={}
def make(name,foot):
 o=empty(name,root_obj,foot);building_roots[name]=o;return o
def scrapyard_piece_bounds(obj):
 corners=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
 points=[(p.x,p.z,-p.y) for p in corners]
 return tuple((min(p[i] for p in points),max(p[i] for p in points)) for i in range(3))
def audit_scrapyard_pieces():
 target=building_roots['scrapyard'];pieces=[]
 for obj in bpy.data.objects:
  parent=obj
  while parent and parent!=target:parent=parent.parent
  if parent==target and obj.type=='MESH':pieces.append(obj)
 bpy.context.view_layer.update();bounds={obj:scrapyard_piece_bounds(obj) for obj in pieces}
 for obj,box3 in bounds.items():
  (x0,x1),(y0,y1),(z0,z1)=box3
  if min(x0+11.0,11.0-x1,z0+11.0,11.0-z1)<-0.03:
   raise RuntimeError(f'{obj.name} exceeds the scrapyard footprint: {box3}')
  grounded=y0<=.035 and y0>=-.035
  touching=grounded
  if not touching:
   for other,other_box in bounds.items():
    if other==obj:continue
    gaps=[max(0,other_box[i][0]-box3[i][1],box3[i][0]-other_box[i][1]) for i in range(3)]
    if max(gaps)<=.04:touching=True;break
  print(f'SCRAPYARD PIECE {obj.name} bounds x={x0:.3f}..{x1:.3f} y={y0:.3f}..{y1:.3f} z={z0:.3f}..{z1:.3f} ground_or_contact={"pass" if touching else "FAIL"}')
  if not touching:raise RuntimeError(f'{obj.name} floats: no ground or piece contact')
 cars={obj.name:box3 for obj,box3 in bounds.items() if obj.name.startswith('scrapyard:car-')}
 for name,box3 in cars.items():
  stack,layer=name.rsplit('-',1);layer=int(layer)
  (x0,x1),(y0,y1),(z0,z1)=box3
  if layer==1:
   assert abs(y0)<=.025, f'{name} does not rest on the ground: {y0:.3f}'
   continue
  below=cars[f'{stack}-{layer-1}']
  (bx0,bx1),(by0,by1),(bz0,bz1)=below
  overlap_x=min(x1,bx1)-max(x0,bx0);overlap_z=min(z1,bz1)-max(z0,bz0)
  gap=y0-by1
  print(f'SCRAPYARD CAR CONTACT {name} -> {stack}-{layer-1}: vertical_gap={gap:.3f} xz_overlap={overlap_x:.3f}x{overlap_z:.3f} pass={abs(gap)<=.02 and overlap_x>0 and overlap_z>0}')
  assert abs(gap)<=.02 and overlap_x>0 and overlap_z>0, f'{name} does not touch the car below'

# Town Hall: the measured four-view carve is its full fixed mass. The face
# cut-outs leave the photographed car-wheel clock and flags to their own
# named pieces; porch posts and steps remain in the photographed front carve.
h=make('town-hall',(3,3))
hall_table={
 'photos':{'side':'town-hall-side.jpg','front':'town-hall-front.jpg','rear':'town-hall-rear.jpg','top':'town-hall-roof.jpg'},
 'length':22.0,'width':22.0,'height':12.2,
 'side':{'start':14,'end':749,'ground':414},
 'front':{'centre':384,'ground':419,'top':20},'rear':{'centre':384,'ground':420,'top':20},
 'top':{'front':8,'rear':504,'centre':384},
 'cut':{'front':[(366,145,435,211),(7,140,62,211),(707,140,761,211)]},
 'mask_dir':root/'.evidence/2026-11-06/TOWN-ART-SERVICES/round-4/masks',
 'voxel':.075,'target':4500}
hall_body=carve_object('town-hall:body',tex,hall_table)
parent_keep(hall_body,h)
# True-depth clock wheel and hands sit on the gable where the front photo puts them.
clock_c=(0,7.15,-11.2)
clock=tube('town-hall:clock',clock_c,1.28,.16,dark,h,32,10);clock.rotation_euler[0]=math.pi/2
# The actual wheel in the front photograph becomes the clock face, on a circular mesh.
clock_photo=Photo(tex/'town-hall-front.jpg');clock_mesh=PhotoMesh();cx,cy,pr=400,177,36
for i in range(32):
 a0=math.tau*i/32;a1=math.tau*(i+1)/32
 points=[(0,7.15,-11.37),(math.sin(a0)*1.07,7.15+math.cos(a0)*1.07,-11.37),(math.sin(a1)*1.07,7.15+math.cos(a1)*1.07,-11.37)]
 uvs=[clock_photo.uv(cx,cy),clock_photo.uv(cx+math.sin(a0)*pr,cy-math.cos(a0)*pr),clock_photo.uv(cx+math.sin(a1)*pr,cy-math.cos(a1)*pr)]
 clock_mesh.face(points,uvs,'photo')
clock_face=clock_mesh.finish('town-hall:clock-face',{'photo':clock_photo.material()});parent_keep(clock_face,h)
for i in range(12):
 angle=i*math.tau/12;px=math.sin(angle)*.89;py=7.15+math.cos(angle)*.89
 box('Clock salvaged hour mark',(px,py,-11.33),(.11,.17,.05),tin,.015,h)
for p0,p1 in [((0,7.15,-11.36),(0,7.87,-11.36)),((0,7.15,-11.38),(.54,6.84,-11.38))]:beam('Clock hand',p0,p1,.075,dark,h)
cyl('Clock hub',(0,7.15,-11.42),.13,.09,steel,16,h).rotation_euler[0]=math.pi/2
# Two torn cloth flags and their poles are separate from the carved roof.
for index,x in enumerate((-10.5,10.5)):
 beam(f'town-hall:flag-pole-{index+1}',(x,5.8,-8.8),(x,10.7,-8.8),.09,dark,h)
 direction=1 if index==0 else -1
 points=[(x,10.55,-8.8),(x+direction*1.8,10.35,-8.8),(x+direction*1.3,9.95,-8.8),(x+direction*1.7,9.55,-8.8),(x+direction*.55,9.75,-8.8),(x,9.65,-8.8)]
 mesh=bpy.data.meshes.new(f'Town Hall torn flag {index+1}');mesh.from_pydata([town.game_vector(q) for q in points],[],[(0,1,5),(1,2,5),(2,4,5),(2,3,4)]);mesh.materials.append(canvas);uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=((v.x-x)*direction/1.8,v.z-9.55)
 mesh.update()
 flag=bpy.data.objects.new(f'town-hall:flag-{index+1}',mesh);bpy.context.collection.objects.link(flag);parent_keep(flag,h)
# Town service buildings: each has its own 8 m cell footprint and distinct roof silhouette.
ids=['scrapyard','forge','workshop','motor-pool','paint-shop','trading-post','toll-bank','school','radio-mast','helipad','notice-board']
for n in ids:
 size={'scrapyard':(3,3),'forge':(2,2),'workshop':(3,2),'motor-pool':(3,2),'paint-shop':(2,2),'trading-post':(3,2),'toll-bank':(2,2),'school':(3,2),'radio-mast':(1,1),'helipad':(4,4),'notice-board':(1,1)}[n]
 w,d=size[0]*8-1,size[1]*8-1
 b=make(n,size);x0,x1=-w/2,w/2;z0,z1=-d/2,d/2
 if n in ('forge','workshop'):continue
 if n=='motor-pool':
  # Four view photo carve of the body. The open bay is cut as a keep volume;
  # dark interior, floor, pit and service equipment remain separate pieces.
  side_photo=Photo(tex/'motor-pool-side.jpg')
  front_photo=Photo(tex/'motor-pool-front.jpg')
  rear_photo=Photo(tex/'motor-pool-rear.jpg')
  top_photo=Photo(tex/'motor-pool-top.jpg')
  table={'photos':{'side':'motor-pool-side.jpg','front':'motor-pool-front.jpg','rear':'motor-pool-rear.jpg','top':'motor-pool-top.jpg'},
   'length':21.4,'width':23.0,'height':5.1,
   'side':{'start':14,'end':1010,'ground':294},
   'front':{'centre':512,'ground':283,'top':71},'rear':{'centre':512,'ground':283,'top':71},
   'top':{'front':80,'rear':430,'centre':512,'x_scale':23.0/996},
   'keep':lambda x,y,z: ~((z < -5.0) & (y < 4.55) & (np.abs(x)<10.8)),
   'cut':{'side':[],'front':[(0,0,1,1)],'rear':[],'top':[]},
   'grey':26,'tolerance':42,'bleed_tolerance':38,'voxel':.10,'target':10500,
   'mask_dir':str(root/'.qa-dist/town-services/motor-pool-masks')}
  body=carve_object('motor-pool:body',tex,table)
  # The side and plan references share the 21.4 m photo scale; the 3x2 town
  # plot compresses only the short axis after carving, keeping the long bay face.
  body.scale.y=15.0/21.4
  parent_keep(body,b)
  # Preserve the dark interior while keeping its open front clearly legible.
  box('motor-pool:interior-dark',(0,2.55,1.8),(20.4,4.7,.12),dark,.02,b)
  box('motor-pool:floor',(0,.08,0),(21.8,.16,13.8),dark,.025,b)
  # Recessed inspection pit, with a dark floor and thick raised concrete lips.
  box('motor-pool:inspection-pit',(0,.02,-1.2),(2.0,.06,7.8),dark,.015,b)
  for x in (-1.12,1.12):box('motor-pool:pit-lip',(x,.14,-1.2),(.22,.24,8.2),m['cracked-concrete'],.025,b)
  # Two tool racks stand inside against the back wall, with tools on their rails.
  for x in (-8.7,8.7):
   for y in (.65,1.65,2.65):box('motor-pool:tool-rack-rail',(x,y,5.85),(2.5,.11,.11),steel,.025,b)
   for dx in (-1.1,-.45,.25,.95):beam('motor-pool:hand-tool',(x+dx,.55,5.75),(x+dx,1.55,5.75),.055,wood,b)
   for dx in (-1.2,1.2):box('motor-pool:tool-rack-upright',(x+dx,1.62,5.85),(.09,2.75,.09),dark,.02,b)
  # Fuel drums are grouped along the rear corners, clear of the inspection pit.
  for i,(x,z) in enumerate(((-9.4,5.0),(-8.3,5.0),(9.4,5.0),(8.3,5.0))):
   cyl(f'motor-pool:fuel-drum-{i+1}',(x,.62,z),.43,1.05,steel,20,b)
   for y in (.3,.92):tube(f'motor-pool:drum-rim-{i+1}',(x,y,z),.43,.035,dark,b,20,6)
  # Open front header and posts frame the bay without filling the opening.
  for x in (-10.6,-5.3,0,5.3,10.6):beam('motor-pool:front-post',(x,.12,-6.8),(x,4.65,-6.8),.18,steel,b)
  box('motor-pool:front-header',(0,4.65,-6.8),(21.4,.24,.24),steel,.035,b)
  # Each piece reports its bounds for the grounding/plot audit.
  bpy.context.view_layer.update()
  pieces=[o for o in b.children if o.type=='MESH'];piece_bounds=[]
  for obj in pieces:
   corners=[obj.matrix_world @ Vector(c) for c in obj.bound_box]
   points=[(v.x,v.z,-v.y) for v in corners] # Blender Z-up -> town X/Y/Z
   lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
   piece_bounds.append((lo,hi))
   print(f'MOTOR-POOL BOUNDS {obj.name}: x={lo[0]:.2f}..{hi[0]:.2f} y={lo[1]:.2f}..{hi[1]:.2f} z={lo[2]:.2f}..{hi[2]:.2f}')
  for index,(lo,hi) in enumerate(piece_bounds):
   grounded=lo[1]<=.16
   joined=any(index!=other and all(max(0,alo[axis]-hi[axis],lo[axis]-ahi[axis])<=.16 for axis in range(3)) for other,(alo,ahi) in enumerate(piece_bounds))
   assert grounded or joined, f'{pieces[index].name} does not touch ground or another piece'
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
 heights={'scrapyard':5.8,'forge':5.5,'workshop':5.3,'motor-pool':5,'paint-shop':4.8,'trading-post':5.4,'toll-bank':4.4,'school':5.2}
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
   if n in ('workshop','motor-pool','school') and x!=0:box(n+' dirty window',(x,ht*.72,z0-.06),(1.2,.8,.08),glass,.025,b)
 if n=='scrapyard':
  # Trace each crushed car's side outline, then extrude the real 1.8 m width.
  # The side photo dresses both faces; a separate plan photo covers the roof.
  def crushed_car(name, paint_id):
   side=Photo(tex/f'scrapyard-car-{paint_id}-side.jpg')
   top=Photo(tex/f'scrapyard-car-{paint_id}-top.jpg')
   # Pixel ranges come from the round-4 grids. Clip the floor shadow below
   # the tyres before tracing so it cannot become a white band on the model.
   side_bounds={
    'red':(10,20,2162,660),
    'brown':(10,45,2162,657),
    'blue':(80,2,2092,690),
   }
   x0,roof,x1,ground=side_bounds[paint_id]
   sky=side.sky([(2,2),(side.w-3,2),(2,side.h-3),(side.w-3,side.h-3)],tolerance=27,grey=26)
   rgb=side.rgb();value=rgb.mean(axis=2);chroma=rgb.max(axis=2)-rgb.min(axis=2)
   # Remove pale studio patches trapped between the crushed body and tyres;
   # the edge flood cannot reach those pockets through the wreck silhouette.
   solid=~sky
   solid[ground:,:]=False
   side.bleed(solid&~((value>100)&(chroma<60)))
   loops=photo_trace(solid,(x0,roof,x1,ground),tolerance=6.0,min_area=100)
   if not loops:raise RuntimeError(f'No traced side silhouette for {name}')
   # Windows and dents remain in the photographed surface, not cut through it.
   silhouette=[max(loops,key=lambda loop:abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]+loop[:1]))))]
   side_scale=4.2/(x1-x0)
   side_roof=np.where(solid.any(axis=0),np.argmax(solid,axis=0),ground)
   def side_point(px,py,depth):
    return ((px-(x0+x1)/2)*side_scale,(ground-py)*(.9/(ground-roof)),depth)
   mesh=PhotoMesh()
   photo_slab(mesh,'side',side,silhouette,side_point,-.9,.9,wall_scale=1.8)
   tx0,tx1,ty0,ty1=((20,1475,25,650) if paint_id=='red' else (15,1478,24,620))
   top_sky=top.sky([(2,2),(top.w-3,2),(2,top.h-3),(top.w-3,top.h-3)],tolerance=27,grey=26)
   rgb=top.rgb();value=rgb.mean(axis=2);chroma=rgb.max(axis=2)-rgb.min(axis=2)
   top_solid=~top_sky
   top_color_solid=top_solid&~((value>100)&(chroma<60))
   top.bleed(top_color_solid)
   top_rows,top_cols=np.where(top_solid)
   tx0,tx1=int(top_cols.min()),int(top_cols.max()+1)
   ty0,ty1=int(top_rows.min()),int(top_rows.max()+1)
   top_loops=photo_trace(top_solid,(tx0,ty0,tx1,ty1),tolerance=6.0,min_area=100)
   if not top_loops:raise RuntimeError(f'No traced plan silhouette for {name}')
   top_outline=[max(top_loops,key=lambda loop:abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]+loop[:1]))))]
   def top_point(px,py):
    world_x=(px-(tx0+tx1)/2)*(4.2/(tx1-tx0))
    side_px=int(np.clip(round(x0+(world_x/4.2+.5)*(x1-x0)),x0,x1-1))
    world_y=float(np.clip((ground-side_roof[side_px])*(.9/(ground-roof)),0,.9))
    return (world_x,world_y,(py-(ty0+ty1)/2)*(1.8/(ty1-ty0)))
   for triangle in photo_fill(top_outline):
    mesh.face([top_point(*point) for point in triangle],[top.uv(*point) for point in triangle],'top',(0,1,0))
   return mesh.finish(name,{'side':side.material(),'top':top.material()})
  car_meshes={paint_id:crushed_car(f'scrapyard:car-source-{paint_id}',paint_id) for paint_id in ('red','brown','blue')}
  # Five and four cars reach the reference's measured 40% and 50% of the
  # nine-metre gantry. Each flat car is .9 m high, 4.2 m long and 1.8 m wide.
  stacks=[('a',-5.15,0.0,5,['red','brown','blue','red','brown']),
          ('b',5.15,0.0,4,['blue','red','brown','blue'])]
  for label,cx,cz,count,paints in stacks:
   stack_top=0
   for layer,paint_id in enumerate(paints):
    source=car_meshes[paint_id]
    car=source.copy();car.data=source.data;car.name=f'scrapyard:car-{label}-{layer+1}'
    bpy.context.collection.objects.link(car);parent_keep(car,b)
    source_bottom,source_top=scrapyard_piece_bounds(source)[1]
    car.location=town.game_vector((cx+((-1)**layer)*.55,stack_top-source_bottom,cz+((layer%3)-1)*.12))
    car.rotation_euler[2]=(.035 if layer%2 else -.035)
    stack_top+=source_top-source_bottom
    print(f'SCRAPYARD CAR {car.name}: source={paint_id}, resting layer={layer+1}')
  for source in car_meshes.values():bpy.data.objects.remove(source,do_unlink=True)

  # Trace the open crane frame from the yard's road-facing photo. The pale
  # connected background remains open through each lattice bay.
  crane_photo=Photo(tex/'scrapyard-front.jpg')
  crane_seeds=[(4,4),(507,4),(4,251),(507,251),(255,4),
               (78,70),(78,97),(78,125),(78,150),(78,177),(78,202),
               (458,67),(458,88),(458,115),(458,145),(458,170),(458,195)]
  crane_sky=crane_photo.sky(crane_seeds,tolerance=38,grey=34)
  crane_rgb=crane_photo.rgb()
  crane_mask=(~crane_sky)&(crane_rgb.mean(axis=2)<220)
  crane_mesh=PhotoMesh()
  photo_ground,photo_top=212,18
  px_scale,py_scale=22.0/512,9.0/(photo_ground-photo_top)
  def crane_point(px,py,depth):
   return ((px-256)*px_scale,(photo_ground-py)*py_scale,depth)
  for name,rect in [('left-leg',(24,16,82,212)),('right-leg',(426,16,482,212)),('top-beam',(56,16,461,66))]:
   loops=photo_trace(crane_mask,rect,tolerance=1.15,min_area=6)
   if not loops:raise RuntimeError(f'No traced scrapyard gantry loops in {name}')
   print(f'SCRAPYARD traced gantry {name}: {len(loops)} loops from {rect}')
   photo_slab(crane_mesh,'crane',crane_photo,loops,crane_point,-1.20,-.88,wall_scale=px_scale)
  crane_frame=crane_mesh.finish('scrapyard:gantry-frame',{'crane':crane_photo.material()})
  parent_keep(crane_frame,b)
  # The measured photo feet stop just above the dirt line. Welded shoes bridge
  # that last gap and give both traced legs a visible ground contact.
  for side,x in (('left',-8.7),('right',8.6)):
   shoe=box(f'scrapyard:gantry-foot-{side}',(x,.26,-1.04),(1.25,.52,.95),dark,.035,b)
  # The hanging equipment is a separate node whose origin is the trolley pin.
  trolley_x=(280-256)*px_scale
  hook_group=empty('scrapyard:hook-magnet',b)
  hook_group.location=town.game_vector((trolley_x,8.0,-1.04))
  # The open air around the chain is enclosed by nearby car roofs in the full
  # photo, so the edge flood cannot reach it. A measured luminance cut keeps
  # that pale patch out of the hanging-part silhouette.
  hook_mask=crane_mask&(crane_rgb.mean(axis=2)<215)
  hook_loops=photo_trace(hook_mask,(258,46,312,169),tolerance=.9,min_area=8)
  if hook_loops:
   hook_mesh=PhotoMesh()
   def hook_point(px,py,depth):
    world=crane_point(px,py,depth)
    return (world[0]-trolley_x,world[1]-8.0,world[2]+1.04)
   photo_slab(hook_mesh,'crane',crane_photo,hook_loops,hook_point,-1.19,-.87,wall_scale=px_scale)
   hook_photo=hook_mesh.finish('scrapyard:hook-magnet-photo',{'crane':crane_photo.material()})
   hook_photo.parent=hook_group
  else:
   cable=beam('scrapyard:hook-cable',(trolley_x,7.55,-1.02),(trolley_x,5.05,-1.02),.075,dark,b)
   parent_keep(cable,hook_group)
   magnet=cyl('scrapyard:magnet',(trolley_x,4.78,-1.02),.85,.5,steel,24,b)
   parent_keep(magnet,hook_group)
   coil=tube('scrapyard:magnet-coil',(trolley_x,4.78,-1.30),.62,.12,paint,hook_group,24,8)
  crane_photo.bleed(crane_mask)
  # The source's low-chroma galvanized steel reads too pale beside the town
  # family. Warm and darken only its bright neutral pixels; keep rust and paint.
  rgba=np.empty(crane_photo.image_w*crane_photo.image_h*4,dtype=np.float32)
  crane_photo.image.pixels.foreach_get(rgba);rgba=rgba.reshape(crane_photo.image_h,crane_photo.image_w,4)
  pixels=rgba[::-1,:,:3].copy()*255
  value=pixels.mean(axis=2);chroma=pixels.max(axis=2)-pixels.min(axis=2)
  pale=(chroma<45)&(value>95);mix=np.clip((value-95)/135,0,.62)
  weathered=np.array([74,52,34],dtype=np.float32)
  pixels[pale]=(pixels*(1-mix[...,None])+weathered*mix[...,None])[pale]
  rgba[::-1,:,:3]=pixels/255
  crane_photo.image.pixels.foreach_set(rgba.ravel());crane_photo.image.update();crane_photo.image.pack();crane_photo._rgb=None
  # A low, open wire fence with a broad road gate; its posts are planted at
  # the plot edge and every wire meets a post.
  edge=10.72;fence_y=1.28
  def fence_run(label,points):
   for index,(p0,p1) in enumerate(zip(points,points[1:])):
    dx,dz=p1[0]-p0[0],p1[1]-p0[1]
    for level,mat,thickness in ((.48,dark,.045),(fence_y,steel,.055)):
     if abs(dx)>abs(dz):size=(abs(dx)+.14,thickness,thickness)
     else:size=(thickness,thickness,abs(dz)+.14)
     bar=box(f'scrapyard:fence-{label}-wire-{index+1}-low' if level<1 else f'scrapyard:fence-{label}-wire-{index+1}-high',
             ((p0[0]+p1[0])/2,level,(p0[1]+p1[1])/2),size,mat,0,b)
  back_x=[-edge+i*(edge*2/8) for i in range(9)]
  front_x=[x for x in back_x if abs(x)>2.4]
  side_z=[-edge+i*(edge*2/8) for i in range(9)]
  for label,xs,z in [('back',back_x,edge),('front',front_x,-edge)]:
   for index,x in enumerate(xs):
    box(f'scrapyard:fence-{label}-post-{index+1}',(x,(fence_y+.12)/2,z),(.12,fence_y+.12,.12),steel,0,b)
   fence_run(label,[(x,z) for x in xs])
  for side,x in [('left',-edge),('right',edge)]:
   for index,z in enumerate(side_z):
    box(f'scrapyard:fence-{side}-post-{index+1}',(x,(fence_y+.12)/2,z),(.12,fence_y+.12,.12),steel,0,b)
   fence_run(side,[(x,z) for z in side_z])

  # Broken stone and clinker sit directly on the ground around the piles and
  # fence, as the yard photo shows.
  rubble_spots=[(-9.2,-8.8,.45),(-7.6,-8.5,.62),(7.2,-8.8,.52),(9.3,-7.1,.40),
                (-9.0,5.6,.56),(8.9,6.8,.48),(-3.5,8.6,.36),(4.5,8.5,.42),
                (-7.1,-3.5,.35),(7.7,3.8,.37)]
  # Heavy litter gathers at the stacks' feet: old tyres and broken bricks sit
  # on the dirt as separate objects, with loose metal mixed into the rubble.
  for index,(x,z,lean) in enumerate([(-7.25,2.9,0),(7.15,2.8,0),(-7.0,-3.0,0)],1):
   tyre=tube(f'scrapyard:rubble-tyre-{index}',(x,.14,z),.43,.14,dark,b,20,8)
   tyre.rotation_euler[0]=lean
  for index,(x,z,turn) in enumerate([(-7.35,-2.9,.10),(-6.8,-3.4,-.16),(7.25,-2.8,.20),(6.8,-3.3,-.08)],1):
   brick_piece=box(f'scrapyard:rubble-brick-{index}',(x,.15,z),(.46,.30,.25),brick,.035,b)
   brick_piece.rotation_euler[2]=turn
  for index,(x,z) in enumerate([(-4.1,3.0),(4.1,-3.0)],1):
   scrap=box(f'scrapyard:rubble-sheet-{index}',(x,.10,z),(.65,.18,.38),steel,.06,b)
   scrap.rotation_euler[2]=(-1 if index==1 else 1)*.22
  for index,(x,z,radius) in enumerate(rubble_spots,1):
   sides=6;low=[];high=[]
   for side in range(sides):
    angle=math.tau*side/sides+index*.19
    spread=radius*(.78+.22*((side+index)%3)/2)
    low.append((x+math.cos(angle)*spread,0,z+math.sin(angle)*spread))
    high.append((x+math.cos(angle)*spread*.72,radius*(.26+.28*((side+index)%4)/3),z+math.sin(angle)*spread*.72))
   verts=low+high;faces=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
   for side in range(sides):faces.append((side,(side+1)%sides,(side+1)%sides+sides,side+sides))
   mesh=bpy.data.meshes.new(f'scrapyard rubble {index:02d}');mesh.from_pydata([town.game_vector(v) for v in verts],[],faces)
   uv=mesh.uv_layers.new(name='UVMap')
   for poly in mesh.polygons:
    for loop_index in poly.loop_indices:
     vertex=verts[mesh.loops[loop_index].vertex_index]
     uv.data[loop_index].uv=((vertex[0]-x)/(2*radius)+.5,(vertex[2]-z)/(2*radius)+.5)
   mesh.materials.append(dark if index%3 else steel);mesh.update()
   stone=bpy.data.objects.new(f'scrapyard:rubble-{index:02d}',mesh);bpy.context.collection.objects.link(stone);parent_keep(stone,b)

  continue
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
 if n!='scrapyard':
  for x in (x0+.5,x1-.5):
   for z in (z0+.5,z1-.5):beam(n+' corner column',(x,.22,z),(x,ht,z),.17,steel,b)
   for z in (z0+.5,z1-.5):box(n+' base footplate',(x,.30,z),(.36,.12,.36),dark,.025,b)
  for x in (x0+.7,x1-.7):beam(n+' front eave beam',(x0+.5,ht+.05,z0+.45),(x1-.5,ht+.05,z0+.45),.13,wood,b)

# Forge: carve the same compact furnace from its four photographs. The front
# opening is a measured cut; its living ember is a separate emissive photo piece.
forge_root=building_roots['forge']
forge_table={
 'photos':{'side':'forge-side.jpg','front':'forge-front.jpg','rear':'forge-rear.jpg','top':'forge-roof.jpg'},
 'length':14.0,'width':14.0,'height':14.5,
 'side':{'start':1088,'end':60,'ground':1196},'side_front_on_left':False,
 'front':{'centre':350,'ground':646,'scale':14.0/690},
 'rear':{'centre':850,'ground':820,'scale':14.0/1515},
 'top':{'front':25,'rear':820,'centre':887,'x_scale':14.0/1640},
 'cut':{'front':[(247,450,453,613)]},
 'keep':lambda x,y,z:~((np.abs(x)<2.2)&(y>.45)&(y<4.2)&(z<-5.5)),
 'mask_dir':root/'.evidence/2026-11-06/TOWN-ART-SERVICES/round-4/masks',
 'voxel':.075,'target':3800}
forge_body=carve_object('forge:body',tex,forge_table);parent_keep(forge_body,forge_root)
# Preserve the actual photographed fire pixels on its own small emissive panel.
forge_fire=Photo(tex/'forge-front.jpg');forge_glow=forge_fire.material().copy();forge_glow.name='Forge living ember photo'
forge_bsdf=forge_glow.node_tree.nodes.get('Principled BSDF');forge_tex=next(n for n in forge_glow.node_tree.nodes if n.type=='TEX_IMAGE')
forge_glow.node_tree.links.new(forge_tex.outputs['Color'],forge_bsdf.inputs['Emission Color']);forge_bsdf.inputs['Emission Strength'].default_value=1.8
fire_mesh=PhotoMesh();fx0,fy0,fx1,fy1=248,452,453,613;fire_z=-7.35
fire_mesh.face([(-2.07,3.94,fire_z),(2.09,3.94,fire_z),(2.09,.67,fire_z),(-2.07,.67,fire_z)],
 [forge_fire.uv(fx0,fy0),forge_fire.uv(fx1,fy0),forge_fire.uv(fx1,fy1),forge_fire.uv(fx0,fy1)],'fire')
forge_lamp=fire_mesh.finish('forge:lamp',{'fire':forge_glow});parent_keep(forge_lamp,forge_root)
# A dark inner arch sits behind the photo ember so the cut reads as an opening.
box('Forge furnace inner shadow',(0,2.35,-5.35),(3.95,3.3,.14),dark,.12,forge_root)
# Workshop: carve the photographed shed with open bays. The lift car is a
# separate photo piece inside the measured opening, with a restrained solid
# body behind the side photograph to give it depth at three-quarter view.
workshop_root=building_roots['workshop']
def workshop_keep(x,y,z):
 bay=(np.abs(x+4.25)<1.6)|(np.abs(x)<1.9)|(np.abs(x-4.25)<1.6)
 roofline=4.0+(5.85-4.0)*(1-np.abs(x)/7.15)
 return ~((bay)&(y<3.4)) & (y<=roofline)
workshop_table={
 'photos':{'side':'workshop-side.jpg','front':'workshop-front.jpg','rear':'workshop-rear.jpg','top':'workshop-roof.jpg'},
 'length':15.0,'width':15.0,'height':5.9,
 'side':{'start':1940,'end':25,'ground':705},'side_front_on_left':False,
 'front':{'centre':256,'ground':228,'scale':15.0/490},
 'rear':{'centre':850,'ground':824,'scale':15.0/1380},
 'top':{'front':45,'rear':700,'centre':463,'x_scale':15.0/1145},
 'cut':{'side':[(1058,383,1729,686)],'front':[(65,120,167,228),(192,120,319,228),(345,120,449,228)]},
 'keep':workshop_keep,
 'mask_dir':root/'.evidence/2026-11-07/TOWN-ART-SERVICES/round-6/masks',
 'voxel':.075,'target':3600}
workshop_body=carve_object('workshop:body',tex,workshop_table);parent_keep(workshop_body,workshop_root)
# A real gable frame restores the reference's pitched roof silhouette over the
# carved shell. The corrugated sheets are divided into repairable lengths.
roof_front,roof_back=-7.15,7.15
roof_eave,roof_ridge=4.0,5.85
def workshop_roof_panel(name,side,z0,z1):
 from mathutils import Vector
 corners=[(side*7.28,roof_eave,z0),(0,roof_ridge,z0),(0,roof_ridge,z1),(side*7.28,roof_eave,z1)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([town.game_vector(p) for p in corners],[],[(0,1,2,3)]);mesh.materials.append(tin);mesh.update()
 uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   p=corners[mesh.loops[li].vertex_index];uv.data[li].uv=(p[0]/2,p[2]/2)
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);parent_keep(obj,workshop_root)
 solid=obj.modifiers.new('folded sheet edge','SOLIDIFY');solid.thickness=.06
for side in (-1,1):
 for i in range(3):workshop_roof_panel(f'Workshop patched pitched roof {side} {i}',side,roof_front+i*4.76,roof_front+(i+1)*4.76)
# A front-photo gable keeps the measured truss and glass readable at driver
# height; the two roof planes carry its pitch back through the shed.
gable_photo=Photo(tex/'workshop-front.jpg');gable_mesh=PhotoMesh();gable_z=-7.22
gable_mesh.face([(-7.35,4.0,gable_z),(0,5.76,gable_z),(7.35,4.0,gable_z)],
 [gable_photo.uv(16,98),gable_photo.uv(256,41),gable_photo.uv(496,98)],'gable')
gable_piece=gable_mesh.finish('workshop:pitched-gable',{'gable':gable_photo.material()});parent_keep(gable_piece,workshop_root)

# Two lift posts and cross-pads remain inside the photographed open center bay.
for x in (-1.6,1.6):
 beam('Workshop lift post',(x,.18,-4.2),(x,4.15,-4.2),.14,steel,workshop_root)
 beam('Workshop lift arm',(x,2.5,-4.2),(x,2.5,-2.3),.13,tin,workshop_root)
# Car body and wheels follow the side photograph's measured position.
car_z=-3.55
car_root=empty('workshop:car-on-lift',workshop_root)
car_body=box('Workshop car lower body',(0,2.82,car_z),(2.34,.68,4.25),paint,.20,car_root)
car_cab=box('Workshop car roof',(0,3.48,car_z+.12),(1.84,.78,2.05),paint,.20,car_root)
for side in (-1,1):
 for window_z in (car_z-.53,car_z+.64):
  box('Workshop car side window',(side*1.15,3.50,window_z),(.05,.43,.82),glass,.04,car_root)
 for offset in (-1.32,1.32):
  tire=tube('Workshop car tyre',(side*1.27,2.35,car_z+offset),.42,.15,dark,car_root,16,6)
  tire.rotation_euler[1]=math.pi/2
  hub=cyl('Workshop car wheel hub',(side*1.40,2.35,car_z+offset),.23,.08,steel,16,car_root)
  hub.rotation_euler[1]=math.pi/2
# Three old tyre piles sit inside the outer bays, clear of the door posts.
for x in (-1.65,1.65):
 for index in range(4):
  tube('Workshop stacked tyre',(x,.38+index*.34,-1.3),.42,.13,dark,workshop_root,20,8)
# The front photo contributes the car's face through the open center bay.
work_front_photo=Photo(tex/'workshop-front.jpg');front_car=PhotoMesh()
fx0,fy0,fx1,fy1=226,131,310,184;front_scale=15.0/490;front_z=car_z-2.18
front_car.face([((fx0-256)*front_scale,(228-fy0)*front_scale,front_z),((fx0-256)*front_scale,(228-fy1)*front_scale,front_z),
                ((fx1-256)*front_scale,(228-fy1)*front_scale,front_z),((fx1-256)*front_scale,(228-fy0)*front_scale,front_z)],
               [work_front_photo.uv(fx0,fy0),work_front_photo.uv(fx0,fy1),work_front_photo.uv(fx1,fy1),work_front_photo.uv(fx1,fy0)],'front')
front_car_piece=front_car.finish('workshop:car-front',{'front':work_front_photo.material()});parent_keep(front_car_piece,car_root)

# Join each building's fixed geometry before export. The building and lamp
# nodes stay addressable, while hundreds of small Blender objects collapse
# into one mesh per building and keep the family below the GLB size cap.
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
    assert min(xs)>=-11.5 and max(xs)<=11.5 and min(zs)>=-7.5 and max(zs)<=7.5, f'{obj.name} exceeds the motor-pool plot'
    print(f'MOTOR-POOL FINAL BOUNDS {obj.name}: X={min(xs):.2f}..{max(xs):.2f}, Y={min(p.z for p in points):.2f}..{max(p.z for p in points):.2f}, Z={min(zs):.2f}..{max(zs):.2f}')

# One durable shared root; separate named children keep in-game placement addressable.
audit_scrapyard_pieces()
glb.parent.mkdir(parents=True,exist_ok=True);town.export_glb(glb)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if a.review:
 review_output.mkdir(parents=True,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
 # Capture a matched close view and the roof-heavy mayor view from the exported model.
 def render(name,loc,target,lens=54,resolution=(1000,760)):
  camdata=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,camdata);bpy.context.collection.objects.link(cam);cam.location=town.game_vector(loc);look=town.game_vector(target);cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=lens;bpy.context.scene.camera=cam
  scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x,scene.render.resolution_y=resolution;scene.render.resolution_percentage=100
  scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
  if scene.world is None:scene.world=bpy.data.worlds.new('neutral overcast review daylight')
  scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.27,.25,.22,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
  scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=1.0;scene.view_settings.gamma=1
  # Broad area light and a plain mid-tone ground keep surfaces legible.
  light_data=bpy.data.lights.new('bright overcast area','AREA');light_data.energy=24000;light_data.shape='DISK';light_data.size=45
  light=bpy.data.objects.new('bright overcast area',light_data);bpy.context.collection.objects.link(light);light.location=town.game_vector((22,64,-34));light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
  sun_data=bpy.data.lights.new('soft high desert sun','SUN');sun_data.energy=1.6;sun_data.angle=math.radians(28)
  sun=bpy.data.objects.new('soft high desert sun',sun_data);bpy.context.collection.objects.link(sun);sun.location=town.game_vector((0,42,-25));sun.rotation_euler=(Vector((0,0,0))-sun.location).to_track_quat('-Z','Y').to_euler()
  ground_mat=bpy.data.materials.new('review ground / muted earth');ground_mat.diffuse_color=(.23,.21,.18,1);ground_mat.use_nodes=True;ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.23,.21,.18,1);ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
  ground=town.cube('neutral packed-earth review ground',(0,-.08,0),(1000,.16,1000),ground_mat,0)
  scene.render.filepath=str(review_output/name);bpy.ops.render.render(write_still=True)
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
 render('hall-front.png',(0,7,-46),(0,5,0),47)
 render('hall-driver.png',(center[0]+8,center[1]+2,center[2]-33),(center[0],center[1]+5,center[2]),39)
 render('hall-mayor.png',(center[0]+8,center[1]+45,center[2]-54),center,48)
 forge=next(o for o in bpy.data.objects if o.name.split('.')[0]=='forge')
 def within(obj,target):
  while obj:
   if obj==target:return True
   obj=obj.parent
  return False
 for obj in bpy.data.objects:obj.hide_render=not within(obj,forge)
 render('forge-front.png',(0,6,-34),(0,5,0),49)
 render('forge-driver.png',(8,2,-24),(0,4,0),42)
 render('forge-mayor.png',(6,42,-42),(0,0,0),48)
 scrap=next(o for o in bpy.data.objects if o.name.split('.')[0]=='scrapyard')
 for obj in bpy.data.objects:obj.hide_render=not within(obj,scrap)
 render('scrapyard-photo-match.png',(0,8,-50),(0,5,0),80,(1024,512))
 render('scrapyard-three-quarter-left.png',(13,12,-23),(0,3.5,0),38)
 render('scrapyard-three-quarter-right.png',(-13,12,-23),(0,3.5,0),38)
 render('scrapyard-road.png',(0,1.8,-30),(0,3.5,0),36)
 render('scrapyard-mayor.png',(28,50,-35),(0,0,0),75)
 workshop=next(o for o in bpy.data.objects if o.name.split('.')[0]=='workshop')
 for obj in bpy.data.objects:obj.hide_render=not within(obj,workshop)
 render('workshop-front.png',(0,8,-31),(0,4,0),46)
 render('workshop-driver.png',(9,2,-23),(0,4,0),43)
 render('workshop-mayor.png',(7,36,-42),(0,4,0),46)
 # One clear three-quarter view of every named building, framed to its plot.
 footprint={'town-hall':(3,3),'scrapyard':(3,3),'forge':(2,2),'workshop':(3,2),
            'motor-pool':(3,2),'paint-shop':(2,2),'trading-post':(3,2),
            'toll-bank':(2,2),'school':(3,2),'radio-mast':(1,1),
            'helipad':(4,4),'notice-board':(1,1)}
 for building_id,(fw,fd) in footprint.items():
  target=next(o for o in bpy.data.objects if o.name.split('.')[0]==building_id)
  for obj in bpy.data.objects:obj.hide_render=not within(obj,target)
  distance=max(fw,fd)*16+18;height=distance*.68
  render(building_id+'-three-quarter.png',(distance*.63,height,-distance*.72),(0,height*.12,0),44)
 # Build a clean overview by spatially arranging the imported building groups.
 for obj in bpy.data.objects:obj.hide_render=False
 buildings=[o for o in bpy.data.objects if o.type=='EMPTY' and o.name.split('.')[0] in ['town-hall']+ids]
 for i,o in enumerate(buildings):
  if o.name.split('.')[0]!='town-hall':o.location=town.game_vector(((i%4-1.5)*40,0,(i//4-1)*42))
 bpy.context.view_layer.update();render('family-overview.png',(0,115,-130),(0,0,0),44)
 print(json.dumps({'glb':str(glb),'evidence':str(review_output),'hall_triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')}))
else:print(json.dumps({'glb':str(glb),'blend':str(blend)}))
