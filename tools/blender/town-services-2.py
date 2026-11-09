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
sheet=root/'docs/board/looks/town-art-services/round-18.jpg';review_output=root/'.evidence/2026-11-08/TOWN-ART-SERVICES/round-18/rendered'
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[] if not a.review else [str(review_output)],'summary':str(sheet)}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
from photo_model import Mesh as PhotoMesh, Photo, fill as photo_fill, slab as photo_slab, tidy as photo_tidy, trace as photo_trace, box as photo_box, lathe as photo_lathe
from hull_model import tyre
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
def cable(name,p0,p1,radius,mat,parent=None):
 # Build the prism in world coordinates so a thin guy cable follows its full
 # diagonal in the Y-up export, independent of the beam helper's axis remap.
 start=town.game_vector(p0);end=town.game_vector(p1);direction=(end-start).normalized()
 reference=Vector((0,1,0)) if abs(direction.dot(Vector((0,1,0))))<.95 else Vector((1,0,0))
 u=direction.cross(reference).normalized()*radius;v=direction.cross(u).normalized()*radius
 verts=[tuple(point+offset) for point in (start,end) for offset in (u,v,-u,-v)]
 faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(1,5,7,3),(3,7,6,2),(2,6,4,0)]
 mesh=bpy.data.meshes.new(name+' mesh');mesh.from_pydata(verts,[],faces);mesh.materials.append(mat);mesh.update()
 uv=mesh.uv_layers.new(name='Cable UV')
 for polygon in mesh.polygons:
  for corner,loop_index in enumerate(polygon.loop_indices):
   uv.data[loop_index].uv=((0,0),(1,0),(1,1),(0,1))[corner]
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 return parent_keep(obj,parent) if parent else obj
def cyl(name,c,r,depth,mat=steel,verts=20,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def sphere(name,c,r,mat,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=r,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def tube(name,c,major,minor,mat,parent=None,major_segments=24,minor_segments=8):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=major_segments,minor_segments=minor_segments,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 return parent_keep(o,parent) if parent else o
def photographed_door(photo,parent):
 # Trace a sturdy round-top door silhouette in the front reference's pixels.
 # The face UVs stay on that exact photographed region, including its rivets,
 # wheel and hinges; only the shallow edge is built from steel geometry.
 pixel_outline=[(390,438),(390,285),(398,256),(414,232),(438,214),(466,202),(558,202),(586,210),(610,230),(628,256),(635,280),(635,438)]
 verts=[]
 for depth in (-4.20,-3.98):
  for px,py in pixel_outline:
   x=(px-512)*(8.0/944);y=max(0,(438-py)*(2.8/(438-93)))
   verts.append(town.game_vector((x,y,depth)))
 n=len(pixel_outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
 mesh=bpy.data.meshes.new('photo-wearing round vault door');mesh.from_pydata(verts,[],faces);mesh.materials.append(photo.material());mesh.materials.append(steel);mesh.update()
 uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   vertex=mesh.loops[li].vertex_index
   if vertex<n:
    px,py=pixel_outline[vertex];uv.data[li].uv=photo.uv(px,py)
   elif vertex<2*n:
    px,py=pixel_outline[vertex-n];uv.data[li].uv=photo.uv(px,py)
   else:uv.data[li].uv=photo.uv(390,438)
  poly.material_index=0 if poly.index==0 else 1
 obj=bpy.data.objects.new('toll-bank:door',mesh);bpy.context.collection.objects.link(obj);return parent_keep(obj,parent)
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

  # Its own shallow slab wears the photographed door, wheel, rivets and hinges.
  front_photo=Photo(tex/'toll-bank-front.jpg')
  photographed_door(front_photo,b)
  front_z=-4.24
  for x in (-1.28,1.28):box('toll-bank:door-heavy-frame',(x,1.02,front_z+.10),(.22,2.08,.34),tin,.055,b)
  box('toll-bank:door-heavy-frame',(0,2.08,front_z+.10),(2.78,.24,.34),tin,.055,b)

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

  # Roadside booth has a readable glazed opening and its own pitched cap.
  booth_x,booth_z=4.8,-4.65
  box('toll-bank:booth-body',(booth_x,1.08,booth_z),(2.1,2.16,2.15),wood,.08,b)
  booth_front=booth_z-1.12
  box('toll-bank:booth-window',(booth_x,1.48,booth_front-.025),(1.38,.72,.045),glass,.035,b)
  for x in (booth_x-.76,booth_x+.76):box('toll-bank:booth-window-jamb',(x,1.48,booth_front-.08),(.12,.90,.12),steel,.02,b)
  box('toll-bank:booth-window-sill',(booth_x,1.06,booth_front-.10),(1.62,.12,.16),steel,.02,b)
  box('toll-bank:booth-roof',(booth_x,2.28,booth_z),(2.42,.20,2.42),tin,.05,b)
  for x in (booth_x-1.0,booth_x+1.0):box('toll-bank:booth-roof-edge',(x,2.34,booth_z),(0.12,.16,2.32),dark,.02,b)

  # A long striped arm closes the road lane. Its weighted pivot sits beside
  # the booth and the counterweight balances the arm at the post.
  pivot_x,pivot_z=3.35,-5.65
  box('toll-bank:barrier-post',(pivot_x,.96,pivot_z),(.30,1.92,.30),steel,.035,b)
  box('toll-bank:barrier-pivot-hub',(pivot_x,1.76,pivot_z-.18),(.62,.62,.28),dark,.08,b)
  box('toll-bank:barrier-counterweight',(pivot_x+.48,1.76,pivot_z+.05),(.88,.48,.72),steel,.08,b)
  arm_start,arm_end=-3.55,3.35;arm_y=1.78
  box('toll-bank:barrier-arm',((arm_start+arm_end)/2,arm_y,pivot_z),(arm_end-arm_start,.19,.20),wood,.03,b)
  span=(arm_end-arm_start)/7
  for index in range(7):
   x=arm_start+span*(index+.5)
   box('toll-bank:barrier-stripe',(x,arm_y,pivot_z-.115),(span*.62,.205,.035),paint if index%2==0 else dark,.012,b)
  box('toll-bank:barrier-catcher',(arm_start,.43,pivot_z),(.22,.86,.22),steel,.03,b)

  continue
 if n=='school':
  # The 2.05 m passenger door sets the side-photo scale. Its 234 px height
  # gives 8.51 m long by 2.90 m high; the end photos use their measured roof
  # rows at that same physical height. Each end silhouette tapers, so round 3.
  length=8.51;width=2.50;height=2.90
  side_scale=length/(1000-29)
  axle_pixels=((166,342,55),(785,342,55))
  axles=[{'px':px,'py':py,'r_px':rpx,'r':rpx*side_scale,
          'z':-length/2+(px-29)*side_scale} for px,py,rpx in axle_pixels]
  table={
   'photos':{'side':'school-bus-side.jpg','front':'school-bus-front.jpg',
             'rear':'school-bus-rear.jpg','top':'school-bus-top.jpg'},
   'length':length,'width':width,'height':height,
   'side':{'start':29,'end':1000,'ground':391},
   # The front and rear roof pixels are explicit; both are scaled from the
   # same 2.90 m roof height set by the measured side door.
   'front':{'centre':512,'ground':920,'top':60,'top_height':height},
   'rear':{'centre':512,'ground':930,'top':55,'top_height':height},
   'top':{'front':77,'rear':1450,'centre':512,'x_scale':width/478},
   'round':3,
   'wheels':[(axle['z'],axle['r'],width/2-.30) for axle in axles],
   'cut':{
    # Remove photographed mirror stalks and tyres; mirrors and wheels are
    # separate geometry rather than paint on the carved body.
    'side':[(145,104,202,191),(96,280,226,391),(712,280,852,391)],
    'front':[(110,785,350,940),(670,785,920,940)],
    'rear':[(130,785,360,940),(670,785,900,940)],
   },
   'grey':26,'tolerance':42,'bleed_tolerance':48,'voxel':.065,'target':5200,
   'mask_dir':str(root/'.qa-dist/town-services-2/school-masks')}
  body=carve_object('school:body',tex,table);parent_keep(body,b)
  def school_beam(name,p0,p1,w,mat):
   start=town.game_vector(p0);end=town.game_vector(p1);direction=end-start
   o=box(name,((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2),(w,direction.length,w),mat,.012,b)
   up='Y' if abs(direction.normalized().dot(Vector((0,1,0))))<.95 else 'X'
   o.rotation_euler=direction.to_track_quat('Z',up).to_euler()
   return o
  side_photo=table['_photos']['side'];front_photo=table['_photos']['front']
  rubber=bpy.data.materials.new('school bus weathered black rubber');rubber.diffuse_color=(.035,.031,.026,1);rubber.use_nodes=True
  rubber.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.035,.031,.026,1)
  rubber.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.92
  for index,axle in enumerate(axles):
   for hand in (-1,1):
    wheel_mesh=PhotoMesh()
    tread_centre=245 if hand<0 else 778
    tyre(wheel_mesh,'side',side_photo,axle['px'],axle['py'],axle['r_px'],axle['r'],.15,
         'front',front_photo,tread_centre,36,834,879)
    wheel=wheel_mesh.finish(f"school:wheel-{index+1}-{'road' if hand<0 else 'far'}",
                            {'side':side_photo.material(),'front':front_photo.material()})
    wheel.parent=b;wheel.location=(hand*(width/2-.15),-axle['z'],axle['r'])
    # Keep the measured photo materials: the sidewall and tread carry the
    # visible rust, rubber and tread detail from the bus references.
    wheel_x=hand*(width/2-.15)
    shoulder=tube(f"school:wheel-rubber-shoulder-{index+1}-{'road' if hand<0 else 'far'}",
                  (wheel_x+hand*.135,axle['r'],axle['z']),axle['r']*.78,.075,rubber,b,16,6)
    shoulder.rotation_euler[1]=math.pi/2
    hub_x=wheel_x+hand*.18
    sphere(f"school:wheel-hub-{index+1}-{'road' if hand<0 else 'far'}",
           (hub_x,axle['r'],axle['z']),.14,steel,b)

  # Lean-to ledger, four timber posts, one cross beam, and a continuous
  # corrugated sheet falling away from the bus onto the post line.
  outer_x=-4.12;inner_x=-1.10;roof_y=2.78;outer_y=2.15
  post_z=(-3.35,-1.12,1.12,3.35)
  for index,z in enumerate(post_z):
   school_beam(f'school:lean-to-post-{index+1}',(outer_x,.025,z),(outer_x,outer_y,z),.16,wood)
  school_beam('school:lean-to-outer-beam',(outer_x,outer_y,post_z[0]),(outer_x,outer_y,post_z[-1]),.18,wood)
  school_beam('school:lean-to-wall-ledger',(inner_x,roof_y,post_z[0]),(inner_x,roof_y,post_z[-1]),.16,wood)
  sheet=box('school:lean-to-tin-roof',((inner_x+outer_x)/2,(roof_y+outer_y)/2,0),
            (inner_x-outer_x+.22,.11,7.35),tin,.025,b)
  sheet.rotation_euler[1]=-math.atan2(roof_y-outer_y,inner_x-outer_x)
  for index,z in enumerate((-3.20,-2.12,-1.04,.04,1.12,2.20,3.28)):
   school_beam(f'school:lean-to-roof-rib-{index+1}',(outer_x-.06,outer_y+.04,z),(inner_x+.06,roof_y+.04,z),.055,steel)
  # A front-facing chalkboard stands on two timber legs at the bus's nose.
  board_z=-5.55
  for x,label in ((-1.38,'left'),(1.38,'right')):
   school_beam(f'school:chalkboard-leg-{label}',(x,.025,board_z),(x,2.05,board_z),.12,wood)
  box('school:chalkboard-frame',(0,1.48,board_z),(3.05,1.38,.16),wood,.035,b)
  box('school:chalkboard-face',(0,1.49,board_z-.105),(2.77,1.10,.035),dark,.01,b)
  for index,(x0,x1,y) in enumerate(((-.88,-.20,1.70),(-.75,.62,1.47),(-.72,.24,1.25))):
   school_beam(f'school:chalk-mark-{index+1}',(x0,y,board_z-.132),(x1,y,board_z-.132),.028,paint)
  continue
 if n=='radio-mast':
  # Trace both open lattice faces from the committed side photograph. The
  # narrow crop excludes the hut and guy wires; the grey studio is identified
  # by colour distance because this source's neutral grey is below Photo.sky's
  # bright-background threshold.
  rust=m['rusted-steel'];wire=m['iron-dark'];side=Photo(tex/'radio-mast-side.jpg')
  rgb=side.rgb();studio=np.array([123,123,123]);
  mask=np.max(np.abs(rgb-studio),axis=2)>18
  mask[:7,:]=False;mask[1000:,:]=False;mask[:,:420]=False;mask[:,588:]=False
  # Keep only the mast silhouette; the isolated upper lamp is a separate part.
  mask[4:36,:]=False
  loops=photo_trace(photo_tidy(mask,1),(420,30,588,1000),tolerance=14.0,min_area=750)
  print('RADIO-MAST traced loops',len(loops),'points',sum(len(loop) for loop in loops))
  scale_y=30.0/(1000-34);scale_x=4.8/(588-420)
  def mast_world(px,py,depth,turn=0):
   x=(px-504)*scale_x;y=max(0,(1000-py)*scale_y)
   return (x*math.cos(turn)+depth*math.sin(turn),y,-x*math.sin(turn)+depth*math.cos(turn))
  for face,turn in (('front',0),('side',math.pi/2)):
   mesh=PhotoMesh();photo_slab(mesh,'side',side,loops,lambda px,py,d,turn=turn:mast_world(px,py,d,turn),-.045,.045)
   obj=mesh.finish(f'radio-mast:lattice-{face}',{'side':side.material()});parent_keep(obj,b)
  # Hut body and its road-facing wall wear the photographed hut crop. Its
  # isolated placement is between the cardinal guy lines, outside their paths.
  hut=box('radio-mast:hut-body',(1.80,1.22,-1.80),(1.95,2.44,1.95),tin,0,b)
  hut_photo=Photo(tex/'radio-mast-side.jpg')
  hutmesh=PhotoMesh();hutmask=np.max(np.abs(rgb-studio),axis=2)>18
  hutloops=photo_trace(hutmask,(580,846,744,1000),tolerance=2,min_area=80)
  # The photo facade is traced as a shallow, separate slab at the hut front.
  if hutloops:
   photo_slab(hutmesh,'side',hut_photo,hutloops,lambda px,py,d:(1.80+(px-662)*.0118, max(0,(1000-py)*.0145), -2.86+d),-.025,.025)
   facade=hutmesh.finish('radio-mast:hut-photo-face',{'side':hut_photo.material()});parent_keep(facade,b)
  # Concrete stays have visible pale weathered tops and all sit 1 m inside
  # the one-cell plot edge. Cardinal placement leaves the hut unobstructed.
  concrete=bpy.data.materials.new('radio mast weathered concrete anchors');concrete.diffuse_color=(.42,.40,.36,1);concrete.use_nodes=True;concrete.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.42,.40,.36,1)
  anchors=[(-2.75,0),(2.75,0),(0,-2.75),(0,2.75)]
  for i,(ax,az) in enumerate(anchors):
   box(f'radio-mast:anchor-{i}',(ax,.24,az),(.42,.48,.42),concrete,0,b)
   # The real stays split between two collars. Keep every cable in its own
   # cardinal plane so none crosses the hut in the south-east quadrant.
   attachment_y=(17.2,19.2,17.2,19.2)[i]
   cable(f'radio-mast:guy-wire-{i}',(ax,.48,az),(0,attachment_y,0),.025,wire,b)
  lamp=bpy.data.materials.new('Town service red warning lamp');lamp.use_nodes=True;bs=lamp.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.35,.012,.008,1);bs.inputs['Emission Color'].default_value=(1,.012,.004,1);bs.inputs['Emission Strength'].default_value=3
  box('radio-mast:lamp-spindle',(0,29.98,0),(.14,.70,.14),rust,.01,b)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.18,location=town.game_vector((0,30.18,0)))
  beacon=bpy.context.object;beacon.name='radio-mast:lamp';beacon.data.materials.append(lamp);parent_keep(beacon,b);continue
 if n=='helipad':
  # The measured side elevations set the low deck and its drum supports. The
  # straight-down photo carries the H, circle, seams and weathering on one
  # flat slab; the old plain box-and-stripe pad is fully replaced.
  photos={view:Photo(tex/f'helipad-{view}.jpg') for view in ('side','front','rear','top')}
  side,front,rear,top=(photos[key] for key in ('side','front','rear','top'))
  # Keep the painted deck's 24 m plan and photo mapping unchanged. Its top is
  # now 1.18 m, over a 0.30 m girder/deck edge and full-height drum supports.
  deck_y=1.18;deck_half=12.0;frame_half=11.72;deck_bottom=deck_y-.30
  plate_crop=(88,88,936,934)
  side_band=(19,329,1005,371);front_band=(28,295,996,364);rear_band=(29,306,994,367)
  materials={key:photos[key].material() for key in ('side','front','rear','top')}
  part=PhotoMesh();photo_box(part,-deck_half,deck_half,deck_bottom,deck_y,-deck_half,deck_half,{
   '+y':('top',top,plate_crop),'-y':('side',side,(45,370,80,400)),
   '+z':('front',front,front_band),'-z':('rear',rear,rear_band),
   '+x':('side',side,side_band),'-x':('side',side,side_band)})
  deck=part.finish('helipad:body-deck',materials);parent_keep(deck,b)

  # Welded perimeter rails and cross members stop at the deck edge.
  girder_specs=[('road',-frame_half,-frame_half,-frame_half,frame_half,'long'),
                ('yard',frame_half,-frame_half,frame_half,frame_half,'long'),
                ('west',-frame_half,-frame_half,frame_half,-frame_half,'cross'),
                ('east',-frame_half,frame_half,frame_half,frame_half,'cross'),
                ('middle',-frame_half,0,frame_half,0,'cross')]
  for label,x0,z0,x1,z1,kind in girder_specs:
   if kind=='long':
    lo,hi=sorted((z0,z1));bounds=(x0-.16,x0+.16,deck_bottom-.30,deck_bottom,lo,hi)
    faces={'+x':('side',side,side_band),'-x':('side',side,side_band),
           '+z':('front',front,front_band),'-z':('rear',rear,rear_band)}
   else:
    lo,hi=sorted((x0,x1));bounds=(lo,hi,deck_bottom-.30,deck_bottom,z0-.16,z0+.16)
    faces={'+z':('side',side,side_band),'-z':('side',side,side_band),
           '+x':('front',front,front_band),'-x':('rear',rear,rear_band)}
   part=PhotoMesh();photo_box(part,*bounds,faces)
   girder=part.finish(f'helipad:body-girder-{label}',materials);parent_keep(girder,b)

  # Turn each drum from one measured drum in the side photo, keeping the
  # photograph on its circumference instead of stretching a flat box.
  # Five individually measured patches preserve the photo's blue, rust,
  # white and green drum finishes without wrapping its grey studio background.
  drum_crops=((27,374,82,422),(267,374,331,422),(485,374,539,422),
              (700,374,757,422),(932,374,995,422))
  def photographed_drum(name,x,z,bottom,height,radius,crop=0,axis=(0,1,0),axis_u=(1,0,0),axis_v=(0,0,1)):
   support_crop=drum_crops[crop%len(drum_crops)]
   mesh=PhotoMesh();stations=[(0,radius*.84),(.025,radius),(height-.035,radius),(height,radius*.86)]
   def drum_uv(index,distance,r,angle):
    width=support_crop[2]-support_crop[0]
    return side.uv(support_crop[0]+width*(.075+.85*angle/(2*math.pi)),
                   support_crop[3]-(support_crop[3]-support_crop[1])*distance/height)
   cap=('side',lambda angle,fraction:side.uv((support_crop[0]+support_crop[2])/2+(support_crop[2]-support_crop[0])*.04*fraction*math.cos(angle),
                                             support_crop[1]+(support_crop[3]-support_crop[1])*.48))
   photo_lathe(mesh,'side',(x,bottom,z),axis,axis_u,axis_v,stations,drum_uv,
               sides=12,cap_start=cap,cap_end=cap)
   obj=mesh.finish(name,materials);parent_keep(obj,b);return obj
  supports=[]
  for x in (-frame_half,frame_half):
   supports.extend((x,z) for z in (-9,-4.5,0,4.5,9))
  for z in (-frame_half,frame_half):
   supports.extend((x,z) for x in (-7.5,0,7.5))
  for index,(x,z) in enumerate(supports,1):
   photographed_drum(f'helipad:body-support-drum-{index}',x,z,0,.88,.285,index-1)

  # Fuel is stored on the ground just outside the east deck edge, not on the
  # landing surface. Three real-size drums form a two-high stack.
  fuel_x,fuel_z=13.0,7.7
  photographed_drum('helipad:fuel-drum-1',fuel_x-.30,fuel_z,0,.88,.285,0)
  photographed_drum('helipad:fuel-drum-2',fuel_x+.30,fuel_z,0,.88,.285,3)
  photographed_drum('helipad:fuel-drum-3',fuel_x-.44,fuel_z,1.165,.88,.285,
                    crop=2,axis=(1,0,0),axis_u=(0,1,0),axis_v=(0,0,1))
  pump_x,pump_z=14.0,7.7
  box('helipad:pump-body',(pump_x,.45,pump_z),(.18,.52,.18),tin,.025,b)
  box('helipad:pump-handle',(pump_x-.15,.74,pump_z),(.45,.07,.07),steel,.012,b)
  box('helipad:pump-spout',(pump_x,.50,pump_z-.14),(.055,.055,.28),dark,.008,b)

  # Short pole and horizontal sleeve keep the windsock below 1.5 m overall.
  sock_x,sock_z=-10.4,8.4
  beam('helipad:windsock-pole',(sock_x,deck_y,sock_z),(sock_x,1.46,sock_z),.055,steel,b)
  canvas=bpy.data.materials.new('Worn orange helipad windsock');canvas.use_nodes=True
  canvas_bsdf=canvas.node_tree.nodes['Principled BSDF'];canvas_bsdf.inputs['Base Color'].default_value=(.78,.20,.035,1);canvas_bsdf.inputs['Roughness'].default_value=.9
  mesh=PhotoMesh();sock_stations=[(0,.09),(.32,.077),(.75,.047),(1.15,.012)]
  photo_lathe(mesh,'canvas',(sock_x,1.39,sock_z),(1,0,0),(0,0,1),(0,-1,0),sock_stations,
              lambda i,d,r,angle:(i/3,angle/(2*math.pi)),sides=8)
  sock=mesh.finish('helipad:windsock',{'canvas':canvas});parent_keep(sock,b)

  # Emissive lenses and their short corner posts remain individually named.
  lamp=bpy.data.materials.new('Helipad emissive floodlight');lamp.use_nodes=True
  lamp_bsdf=lamp.node_tree.nodes['Principled BSDF'];lamp_bsdf.inputs['Base Color'].default_value=(1,.55,.16,1)
  lamp_bsdf.inputs['Emission Color'].default_value=(1,.36,.08,1);lamp_bsdf.inputs['Emission Strength'].default_value=4
  for index,(x,z) in enumerate(((-10.8,-10.8),(10.8,-10.8),(-10.8,10.8),(10.8,10.8)),1):
   beam(f'helipad:floodlight-pole-{index}',(x,deck_y,z),(x,1.39,z),.07,steel,b)
   box(f'helipad:floodlight-housing-{index}',(x,1.43,z),(.34,.08,.24),dark,.025,b)
   lens_name='helipad:lamp' if index==1 else f'helipad:lamp-{index}'
   box(lens_name,(x,1.478,z-.02),(.24,.025,.14),lamp,.008,b)
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

def audit_school_pieces():
 target=building_roots['school'];pieces=[obj for obj in bpy.data.objects if obj.parent==target and obj.type=='MESH']
 bpy.context.view_layer.update();bounds={}
 for obj in pieces:
  points=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
  values=[(p.x,p.z,-p.y) for p in points]
  lo=tuple(min(p[i] for p in values) for i in range(3));hi=tuple(max(p[i] for p in values) for i in range(3))
  bounds[obj]=(lo,hi)
 for obj,(lo,hi) in bounds.items():
  assert lo[0]>=-11.4 and hi[0]<=11.4 and lo[2]>=-7.4 and hi[2]<=7.4, f'{obj.name} exceeds the 3x2 school footprint: {lo}..{hi}'
  grounded=abs(lo[1])<=.045
  touching=any(obj!=other and all(max(0,other_box[0][axis]-hi[axis],lo[axis]-other_box[1][axis])<=.07 for axis in range(3))
               for other,other_box in bounds.items())
  contact='ground' if grounded else 'another piece' if touching else 'FAIL'
  print(f'SCHOOL PIECE {obj.name}: x={lo[0]:.3f}..{hi[0]:.3f} y={lo[1]:.3f}..{hi[1]:.3f} z={lo[2]:.3f}..{hi[2]:.3f} contact={contact}')
  assert grounded or touching, f'{obj.name} floats without touching ground or another piece'

audit_school_pieces()

def audit_radio_mast_pieces():
 target=building_roots['radio-mast'];pieces=[obj for obj in bpy.data.objects if obj.parent==target and obj.type=='MESH']
 bpy.context.view_layer.update();bounds={}
 for obj in pieces:
  points=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
  values=[(p.x,p.z,-p.y) for p in points]
  lo=tuple(min(p[i] for p in values) for i in range(3));hi=tuple(max(p[i] for p in values) for i in range(3))
  bounds[obj]=(lo,hi)
 for obj,(lo,hi) in bounds.items():
  assert lo[0]>=-3.0 and hi[0]<=3.0 and lo[2]>=-3.0 and hi[2]<=3.0, f'{obj.name} exceeds radio-mast plot with 0.5 m clearance: {lo}..{hi}'
  grounded=abs(lo[1])<=.035
  touching=any(obj!=other and all(max(0,other_box[0][axis]-hi[axis],lo[axis]-other_box[1][axis])<=.06 for axis in range(3))
               for other,other_box in bounds.items())
  contact='ground' if grounded else 'another piece' if touching else 'FAIL'
  print(f'RADIO-MAST PIECE {obj.name}: x={lo[0]:.3f}..{hi[0]:.3f} y={lo[1]:.3f}..{hi[1]:.3f} z={lo[2]:.3f}..{hi[2]:.3f} contact={contact}')
  assert grounded or touching, f'{obj.name} floats without touching ground or another piece'
 triangles=0;depsgraph=bpy.context.evaluated_depsgraph_get()
 for obj in pieces:
  evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();triangles+=len(mesh.loop_triangles);evaluated.to_mesh_clear()
 print(f'RADIO-MAST TRIANGLES {triangles}')
 assert triangles<=1800, f'radio-mast exceeds 1800 triangles: {triangles}'

audit_radio_mast_pieces()

def audit_helipad_pieces():
 target=building_roots['helipad'];pieces=[obj for obj in bpy.data.objects if obj.parent==target and obj.type=='MESH']
 bpy.context.view_layer.update();bounds={}
 for obj in pieces:
  points=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
  values=[(p.x,p.z,-p.y) for p in points]
  lo=tuple(min(p[i] for p in values) for i in range(3));hi=tuple(max(p[i] for p in values) for i in range(3))
  bounds[obj]=(lo,hi)
 for obj,(lo,hi) in bounds.items():
  assert lo[0]>=-15.5 and hi[0]<=15.5 and lo[2]>=-15.5 and hi[2]<=15.5, f'{obj.name} exceeds the helipad footprint clearance: {lo}..{hi}'
  assert lo[1]>=-.025 and hi[1]<=1.5, f'{obj.name} exceeds the 1.5 m helipad height: {lo}..{hi}'
  grounded=abs(lo[1])<=.035
  touching=any(obj!=other and all(max(0,other_box[0][axis]-hi[axis],lo[axis]-other_box[1][axis])<=.065 for axis in range(3))
               for other,other_box in bounds.items())
  contact='ground' if grounded else 'another piece' if touching else 'FAIL'
  print(f'HELIPAD PIECE {obj.name}: x={lo[0]:.3f}..{hi[0]:.3f} y={lo[1]:.3f}..{hi[1]:.3f} z={lo[2]:.3f}..{hi[2]:.3f} contact={contact}')
  assert grounded or touching, f'{obj.name} floats without touching ground or another piece'
 triangles=0;depsgraph=bpy.context.evaluated_depsgraph_get()
 for obj in pieces:
  evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();triangles+=len(mesh.loop_triangles);evaluated.to_mesh_clear()
 print(f'HELIPAD TRIANGLES {triangles}')
 assert triangles<=14000, f'helipad exceeds 14000 triangles: {triangles}'

audit_helipad_pieces()

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
 ground_bsdf=ground_mat.node_tree.nodes['Principled BSDF'];ground_bsdf.inputs['Base Color'].default_value=(0,0,0,1)
 ground_bsdf.inputs['Emission Color'].default_value=(.20,.20,.20,1);ground_bsdf.inputs['Emission Strength'].default_value=1
 ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
 bpy.ops.mesh.primitive_plane_add(size=20000,location=town.game_vector((0,-.10,0)))
 ground=bpy.context.object;ground.name='review-only neutral grey ground';ground.data.materials.append(ground_mat)
 light_data=bpy.data.lights.new('large soft review light','AREA');light_data.energy=14000;light_data.shape='DISK';light_data.size=35
 light=bpy.data.objects.new('large soft review light',light_data);scene.collection.objects.link(light)
 light.location=town.game_vector((14,28,-24));light.rotation_euler=(town.game_vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
 fill_data=bpy.data.lights.new('soft fill','AREA');fill_data.energy=5000;fill_data.shape='DISK';fill_data.size=30
 fill=bpy.data.objects.new('soft fill',fill_data);scene.collection.objects.link(fill)
 fill.location=town.game_vector((-20,18,14));fill.rotation_euler=(town.game_vector((0,2,0))-fill.location).to_track_quat('-Z','Y').to_euler()
 target_root=next(o for o in bpy.data.objects if o.name.split('.')[0]=='helipad')
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
 bpy.ops.mesh.primitive_plane_add(size=300,location=(0,0,0));backdrop=bpy.context.object;backdrop.name='review seamless grey backdrop'
 backdrop_mat=bpy.data.materials.new('review neutral backdrop emission');backdrop_mat.use_nodes=True
 backdrop_bsdf=backdrop_mat.node_tree.nodes['Principled BSDF'];backdrop_bsdf.inputs['Base Color'].default_value=(0,0,0,1)
 backdrop_bsdf.inputs['Emission Color'].default_value=(.20,.20,.20,1);backdrop_bsdf.inputs['Emission Strength'].default_value=1
 backdrop.data.materials.append(backdrop_mat)
 def render(name,eye,look,scale,resolution,body_only=False):
  camera.location=town.game_vector(eye);camera.rotation_euler=(town.game_vector(look)-camera.location).to_track_quat('-Z','Y').to_euler()
  target_world=town.game_vector(look);view_direction=(target_world-camera.location).normalized()
  backdrop.location=target_world+view_direction*80
  backdrop.rotation_euler=(-view_direction).to_track_quat('Z','Y').to_euler()
  camera_data.type='ORTHO';camera_data.ortho_scale=scale
  scene.render.resolution_x,scene.render.resolution_y=resolution;scene.render.filepath=str(review_output/(name+'.png'))
  body_prefixes=('helipad:body-','helipad:body-girder-')
  for obj in bpy.data.objects:
   if obj==ground or obj==light or obj==fill or obj==backdrop:continue
   is_body_piece=obj.name.startswith(body_prefixes)
   obj.hide_render=(not within(obj,target_root) or (body_only and not is_body_piece))
  bpy.ops.render.render(write_still=True)
 shots=[
  # Photo comparisons use the same orthographic cameras as their source views.
  ('model-side',(48,2.2,0),(0,.70,0),25.5,(1024,683),True),
  ('model-front',(0,2.2,-48),(0,.70,0),25.5,(1024,683),True),
  ('model-rear',(0,2.2,48),(0,.70,0),25.5,(1024,683),True),
  ('model-above',(0,48,0),(0,0,0),29.0,(1024,1024),True),
  ('three-quarter-road',(24,22,-28),(0,.75,0),31.0,(1024,683)),
  ('three-quarter-yard',(-24,22,28),(0,.75,0),31.0,(1024,683)),
  ('mayor-view',(45,55,-45),(0,.75,0),38.0,(1024,683)),
 ]
 for shot in shots:render(*shot)
 print(json.dumps({'glb':str(glb),'renders':[str(review_output/(shot[0]+'.png')) for shot in shots]}))
else:print(json.dumps({'glb':str(glb),'blend':str(blend)}))
