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
    assert min(xs)>=-15.5 and max(xs)<=15.5 and min(zs)>=-7.5 and max(zs)<=7.5, f'{obj.name} exceeds the motor-pool plot'
    print(f'MOTOR-POOL FINAL BOUNDS {obj.name}: X={min(xs):.2f}..{max(xs):.2f}, Y={min(p.z for p in points):.2f}..{max(p.z for p in points):.2f}, Z={min(zs):.2f}..{max(zs):.2f}')

# One durable shared root; separate named children keep in-game placement addressable.

glb.parent.mkdir(parents=True,exist_ok=True);town.export_glb(glb)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if a.review:
 review_output.mkdir(parents=True,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
 # Capture a matched close view and the roof-heavy mayor view from the exported model.
 def render(name,loc,target,lens=54,resolution=(1000,760)):
  camdata=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,camdata);bpy.context.collection.objects.link(cam);cam.location=town.game_vector(loc);look=town.game_vector(target);cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=lens
  if name.startswith('trading-post-model-') or name.startswith('paint-shop-model-'):camdata.type='ORTHO';camdata.ortho_scale=lens
  bpy.context.scene.camera=cam
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
 motor=next(o for o in bpy.data.objects if o.name.split('.')[0]=='motor-pool')
 for obj in bpy.data.objects:obj.hide_render=not within(obj,motor)
 render('motor-pool-front.png',(0,8,-40),(0,3,0),46)
 render('motor-pool-side.png',(0,8,40),(0,3,0),46)
 render('motor-pool-end.png',(32,8,0),(0,3,0),46)
 render('motor-pool-above.png',(2,40,-8),(0,2,0),48)
 render('motor-pool-mayor.png',(18,28,-32),(0,2,0),44)
 render('motor-pool-three-quarter-left.png',(20,15,-28),(0,3,0),44)
 # One clear three-quarter view of every named building, framed to its plot.
 footprint={'town-hall':(3,3),'scrapyard':(3,3),'forge':(2,2),'workshop':(3,2),
            'motor-pool':(4,2),'paint-shop':(2,2),'trading-post':(3,3),
            'toll-bank':(2,2),'school':(3,2),'radio-mast':(1,1),
            'helipad':(4,4),'notice-board':(1,1)}
 for building_id,(fw,fd) in footprint.items():
  target=next(o for o in bpy.data.objects if o.name.split('.')[0]==building_id)
  for obj in bpy.data.objects:
   if building_id=='trading-post' and obj.type=='MESH':obj.hide_render=not obj.name.startswith('trading-post:')
   else:obj.hide_render=not within(obj,target)
  distance=max(fw,fd)*16+18;height=distance*.68
  render(building_id+'-three-quarter.png',(distance*.63,height,-distance*.72),(0,height*.12,0),44)
 paint_shop=next(o for o in bpy.data.objects if o.name.split('.')[0]=='paint-shop')
 for obj in bpy.data.objects:obj.hide_render=not within(obj,paint_shop)
 # Orthographic model views align with the four generated photo cameras.
 for name,loc,target,scale in [
  ('paint-shop-model-side.png',(35,5,0),(0,5,0),18),
  ('paint-shop-model-front.png',(0,5,-35),(0,5,0),17.5),
  ('paint-shop-model-rear.png',(0,5,35),(0,5,0),17.5),
  ('paint-shop-model-above.png',(0,35,0),(0,0,0),17.5)]:
  render(name,loc,target,scale,(1000,1000) if name.endswith('above.png') else (1000,760))
 render('paint-shop-three-quarter-left.png',(-22,13,-24),(0,4,0),44,(1000,760))
 render('paint-shop-three-quarter-right.png',(22,13,-24),(0,4,0),44,(1000,760))
 render('paint-shop-mayor.png',(24,46,-35),(0,1.5,0),60,(1000,760))
 if building_id=='trading-post':
  for name,loc,target,angle in [
   ('trading-post-model-side.png',(31,7.5,0),(0,3.7,0),18),
   ('trading-post-model-front.png',(0,7.5,-31),(0,3.7,0),16),
   ('trading-post-model-rear.png',(0,7.5,31),(0,3.7,0),16),
   ('trading-post-model-above.png',(0,38,-1),(0,3.7,-1),28),
   ('trading-post-three-quarter-left.png',(24,18,-27),(0,3,0),48),
   ('trading-post-three-quarter-right.png',(-24,18,-27),(0,3,0),48),
   ('trading-post-mayor.png',(48,68,-48),(0,0,0),140)]:
   render(name,loc,target,angle,(900,640))
 # Build a clean overview by spatially arranging the imported building groups.
 for obj in bpy.data.objects:obj.hide_render=False
 buildings=[o for o in bpy.data.objects if o.type=='EMPTY' and o.name.split('.')[0] in ['town-hall']+ids]
 for i,o in enumerate(buildings):
  if o.name.split('.')[0]!='town-hall':o.location=town.game_vector(((i%4-1.5)*40,0,(i//4-1)*42))
 bpy.context.view_layer.update();render('family-overview.png',(0,115,-130),(0,0,0),44)
 print(json.dumps({'glb':str(glb),'evidence':str(review_output),'hall_triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')}))
else:print(json.dumps({'glb':str(glb),'blend':str(blend)}))
