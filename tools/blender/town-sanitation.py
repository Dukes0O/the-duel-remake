"""Original five-building sanitation family for the Scablands town."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser(); p.add_argument('--root',required=True); p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(a.root).resolve()
out=root/'public/assets/models/wasteland/town/sanitation.glb'
evidence=root/'.evidence/2026-11-06/town-art-sanitation/round-1'
sheet=root/'docs/board/looks/town-art-sanitation/round-1.jpg'
if a.paths_only:
 print(json.dumps({'blend':[],'glb':[str(out)],'evidence':[str(evidence)],'summary':[str(sheet)]})); raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent)); import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True)
tex=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'weathered-plank':tex/'bleached-plank.jpg','galvanised-tin':tex/'corrugated-tin.jpg',
 'rusted-steel':tex/'rusted-steel.jpg','cracked-concrete':tex/'town-water-concrete.jpg',
 'sand':tex/'town-water-earth.jpg','patched-canvas':tex/'canvas-patched-cream.jpg'})
def mat(name,color,metal=0):
 x=bpy.data.materials.new('Sanitation / '+name); x.diffuse_color=(*color,1); x.use_nodes=True
 b=x.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*color,1); b.inputs['Roughness'].default_value=.91; b.inputs['Metallic'].default_value=min(metal,.29); return x
water=mat('stagnant water',(.075,.105,.065)); glass=mat('dirty bottle glass',(.17,.22,.18),.02); reed=mat('reed leaf',(.20,.27,.105)); compost=mat('dark compost',(.105,.075,.045));
family=bpy.data.objects.new('town-sanitation',None); bpy.context.collection.objects.link(family)
def start(name,offset):
 r=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(r); r.parent=family; r.location=town.game_vector(offset); return r
def keep(obj,parent):
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);world=obj.matrix_world.copy()
 # Child geometry is authored at its building-local origin. Add the building
 # grid offset before preserving world space under its named root.
 world.translation+=parent.matrix_world.translation
 obj.parent=parent;obj.matrix_world=world;return obj
def box(parent,n,c,s,ma,b=.025): return keep(town.cube(n,c,s,ma,b),parent)
def beam(parent,n,a,b,w,ma): return keep(town.beam(n,a,b,w,ma),parent)
def cyl(parent,n,c,r,d,ma,v=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=town.game_vector(c));o=bpy.context.object;o.name=n;o.data.materials.append(ma);return keep(o,parent)
def tube(parent,n,pts,r,ma):
 before=set(bpy.context.scene.objects);town.pipe_run(n,pts,r,ma)
 for o in set(bpy.context.scene.objects)-before: keep(o,parent)
def reed_stalk(parent,n,x,y,z,h,lean):
 # A tapered, multi-face blade rooted inside the saturated gravel bed.
 verts=[(x-.055,y,z),(x+lean-.045,y+h*.55,z),(x+lean,y+h,z),(x+lean+.045,y+h*.04,z+.04),(x+lean+.045,y+h*.55,z+.035),(x+.055,y,z+.035)]
 mesh=bpy.data.meshes.new(n+' blade mesh');mesh.from_pydata(verts,[],[(0,1,4,3),(0,4,2,5),(0,3,5)]);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(reed);return keep(o,parent)

# Lead piece: three stepped wet reed beds, with real 150 mm bolted steel inlet.
r=start('reed-bed',(0,0,0)); box(r,'reed-bed:earth-pad',(0,.12,0),(20,.24,20),m['sand'],.08)
for i,(z,y,w,d) in enumerate(((-5.6,.70,15.5,3.2),(-1.5,.97,15.5,3.2),(2.6,1.24,15.5,3.2)),1):
 box(r,f'reed-bed:basin-{i}:water',(0,y,z),(w-1,.07,d-1),water,.025)
 for side in (-1,1):
  box(r,f'reed-bed:basin-{i}:wall-{side}',(side*w/2,y+.28,z),(.24,.56,d),m['cracked-concrete'],.045)
 for end in (-1,1): box(r,f'reed-bed:basin-{i}:end-{end}',(0,y+.28,z+end*d/2),(w,.56,.24),m['cracked-concrete'],.045)
 for x in (-w*.42,w*.42):
  for j in range(0,8,2): box(r,f'reed-bed:basin-{i}:tie-{x}-{j}',(x,y+.42,z-d*.42+j*.34),(.18,.20,.17),m['rusted-steel'],.025)
 # 24 varied thick clumps; leaves remain connected at ground and visibly rise above rails.
 for j in range(24):
  x=-5.4+(j%6)*2.12+(i%2)*.3; zz=z-1.0+(j//6)*.65; h=1.15+(j*17%9)*.115
  reed_stalk(r,f'reed-bed:basin-{i}:reed-{j+1}',x,y+.07,zz,h,((j%5)-2)*.09)
 tube(r,f'reed-bed:inlet-{i}',[(-10,.95,-7.4+i*4.1),(-8,.95,-7.4+i*4.1),(-7,.5,-7.4+i*4.1)],.075,m['rusted-steel'])
for i,z in enumerate((-5.6,-1.5,2.6),1):
 tube(r,f'reed-bed:interstage-{i}',[(7.5,.76+(i-1)*.27,z),(8.5,.65+(i-1)*.3,z),(8.5,.65+i*.3,z+4.1)],.09,m['galvanised-tin'])
tube(r,'reed-bed:outfall',[(8.4,1.55,6.7),(9.4,.75,7.4),(10,.24,8.3),(10,.14,10)],.12,m['rusted-steel'])
for x in (-8,8):
 for z in (-9,9):
  cyl(r,f'reed-bed:pipe-flange-{x}-{z}',(x,.96,z),.18,.1,m['rusted-steel'],20)

# Row of three original plank privies, half-moon cutouts represented by open door panels.
r=start('latrine',(-20,0,-20));box(r,'latrine:shared-platform',(0,.12,0),(7,.24,7),m['sand'],.04)
for i,x in enumerate((-2.15,0,2.15),1):
 box(r,f'latrine:cubicle-{i}:floor',(x,.24,0),(1.85,.12,2.65),m['weathered-plank'])
 for xx in (x-.92,x+.92): box(r,f'latrine:cubicle-{i}:side-{xx}',(xx,1.35,0),(.13,2.15,2.65),m['weathered-plank'])
 for z in (-1.26,1.26): box(r,f'latrine:cubicle-{i}:back-{z}',(x,1.35,z),(1.85,2.15,.13),m['weathered-plank'])
 # Split door leaves leave a genuine crescent-shaped opening at child height.
 for sx in (-1,1): box(r,f'latrine:cubicle-{i}:door-leaf-{sx}',(x+sx*.38,1.20,-1.27),(.68,1.9,.13),m['weathered-plank'],.018)
 beam(r,f'latrine:cubicle-{i}:hinge',(x-.77,.45,-1.38),(x-.77,1.95,-1.38),.045,m['rusted-steel'])
 cyl(r,f'latrine:cubicle-{i}:vent-cap',(x,2.85,.65),.22,.18,m['rusted-steel'])
tube(r,'latrine:vent-stack',[(-3,2.05,.75),(-3,3.65,.75),(-3,4.1,.75)],.09,m['rusted-steel'])

# Wash house: roof tank, formed corrugation, visible louvered steam stack and laundry.
r=start('bathhouse',(20,0,-20));box(r,'bathhouse:slab',(0,.16,0),(14,.32,14),m['cracked-concrete'],.08)
for x in (-6.2,6.2):
 for z in (-6.2,6.2): beam(r,f'bathhouse:post-{x}-{z}',(x,.3,z),(x,4.1,z),.16,m['rusted-steel'])
for x in (-4.4,-1.5,1.5,4.4):
 for z in (-6.25,6.25):
  obj=town.corrugated_sheet(f'bathhouse:wall-{x}-{z}',(x,2.05,z),2.8,3.6,m); keep(obj,r)
for side in (-1,1):
 obj=town.corrugated_sheet(f'bathhouse:roof-{side}',(0,4.45,side*1.75),7.3,7.2,m);obj.rotation_euler[0]=side*.18;keep(obj,r)
cyl(r,'bathhouse:roof-tank',(2.7,5.15,1.2),1.35,1.7,m['rusted-steel'],28)
for a0 in range(12):
 ang=math.tau*a0/12;x=2.7+1.36*math.cos(ang);z=1.2+1.36*math.sin(ang)
 cyl(r,f'bathhouse:tank-rivet-{a0}',(x,5.4,z),.045,.05,m['iron-dark'],8)
tube(r,'bathhouse:steam-vent',[(0,4.4,-2),(0,5.0,-2),(0,5.9,-2)],.10,m['rusted-steel'])
for x in (-3,3): beam(r,f'bathhouse:towel-line-post-{x}',(x,.3,-7),(x,2.7,-7),.08,m['weathered-plank'])
town.washing_line('bathhouse:towels',(-3,2.55,-7),(3,2.55,-7),m)
for o in [o for o in bpy.context.scene.objects if o.name.startswith('bathhouse:towels') and o.parent is None]:keep(o,r)

# Waste yard: hand-powered sorting belt, welded bay rails and distinctive glass/tyre/tin loads.
r=start('trash-sorter',(0,0,20));box(r,'trash-sorter:yard',(0,.12,0),(20,.24,14),m['sand'],.04)
for x in (-8,-3,3,8):
 for z in (-5.4,5.4):beam(r,f'trash-sorter:bay-post-{x}-{z}',(x,.15,z),(x,2.0,z),.11,m['rusted-steel'])
for x in (-5.5,0,5.5):beam(r,f'trash-sorter:bay-rail-{x}',(x,.7,-5.4),(x,.7,5.4),.12,m['rusted-steel'])
for x in (-2.4,2.4):cyl(r,f'trash-sorter:belt-roller-{x}',(x,1.25,0),.43,4.6,m['iron-dark'],20)
box(r,'trash-sorter:belt-rubber',(0,1.55,0),(4.8,.14,4.3),mat('belt',(.13,.14,.12)),.05)
for x in (-2.1,2.1):beam(r,f'trash-sorter:belt-frame-{x}',(x,.4,0),(x,1.65,0),.14,m['rusted-steel'])
for i in range(18):
 x=-1.9+(i%6)*.72; z=-1.55+(i//6)*1.5; y=1.68+(i%3)*.035
 cyl(r,f'trash-sorter:sorted-tin-{i}',(x,y,z),.24,.42,m['galvanised-tin'],10)
for i,x in enumerate((-8.5,-7.45,7.45,8.5)):
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=.48,minor_radius=.15,location=town.game_vector((x,.55,-2.7+i%2)))
 o=bpy.context.object;o.name=f'trash-sorter:salvage-tyre-{i}';o.data.materials.append(m['iron-dark']);keep(o,r)
for i in range(8):
 x=5.5+(i%4)*.52;z=2.5+(i//4)*.5;cyl(r,f'trash-sorter:glass-bottle-{i}',(x,.48,z),.16,.62,glass,12)

# One steaming compost pile contained by timber pallets; a connected fork handle and tines.
r=start('compost-heap',(-20,0,0));box(r,'compost-heap:earth-pad',(0,.12,0),(7,.24,7),m['sand'],.04)
for x in (-2.6,2.6):
 for z in (-2.5,2.5):beam(r,f'compost-heap:pallet-upright-{x}-{z}',(x,.15,z),(x,1.2,z),.13,m['weathered-plank'])
for z in (-2.5,2.5):
 for y in (.35,.72,1.08):beam(r,f'compost-heap:pallet-board-{z}-{y}',(-2.6,y,z),(2.6,y,z),.14,m['weathered-plank'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=town.game_vector((0,1.0,0)))
o=bpy.context.object;o.name='compost-heap:heap';o.scale=(2.35,1.18,2.15);o.data.materials.append(compost);keep(o,r)
for i in range(4):
 x=-.42+i*.28;beam(r,f'compost-heap:fork-tine-{i}',(x,.85,-.6),(x,.1,-.9),.045,m['iron-dark'])
beam(r,'compost-heap:fork-handle',(0,.75,-.6),(.1,2.4,-.5),.085,m['weathered-plank'])
steam=mat('warm steam',(.67,.64,.55));steam.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.24,.22,.18,1);steam.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.28
for i in range(3):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=town.game_vector((-.25+i*.32,2.3+i*.25,.1)))
 o=bpy.context.object;o.name=f'compost-heap:steam-{i}';o.scale=(.22,.42,.20);o.data.materials.append(steam);keep(o,r)

# UV layers must converge on TEXCOORD_0 after joins/export; primitives keep all material pictures unique.
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  layer=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
  for other in o.data.uv_layers: other.name='UVMap'
  layer.name='UVMap';o.data.uv_layers.active=layer
  if len(layer.data)==0 or not any(abs(value.uv.x)+abs(value.uv.y)>.001 for value in layer.data):
   dims=sorted(range(3),key=lambda axis:o.dimensions[axis],reverse=True)[:2]
   for loop in o.data.loops:
    co=o.data.vertices[loop.vertex_index].co;layer.data[loop.index].uv=(co[dims[0]]/2,co[dims[1]]/2)
for material in bpy.data.materials:
 b=material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
 if b and b.inputs.get('Metallic'): b.inputs['Metallic'].default_value=min(b.inputs['Metallic'].default_value,.29)
town.export_glb(out)

# Rendering helper imported by an empty scene from the exported GLB.
def render_import(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
 bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'; bpy.context.scene.render.resolution_x=1000;bpy.context.scene.render.resolution_y=760;bpy.context.scene.render.resolution_percentage=100
 scene=bpy.context.scene;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
 scene.world=bpy.data.worlds.new('bright overcast studio');scene.world.color=(.72,.72,.72)
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH': obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.select_all(action='DESELECT')
 bpy.ops.object.light_add(type='AREA',location=(14,-18,24));light=bpy.context.object;light.data.energy=4800;light.data.shape='DISK';light.data.size=18
 bpy.ops.object.camera_add(location=(26,27,-34));cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
 scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
 views=[('reed-bed',(0,0,0),25),('latrine',(-20,0,-20),12),('bathhouse',(20,0,-20),19),('trash-sorter',(0,0,20),24),('compost-heap',(-20,0,0),12)]
 for name,target,scale in views:
  focus=town.game_vector(target); focus=Vector(focus); cam.location=focus+Vector((scale*.58,-scale*.75,scale*.72));cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
  scene.render.filepath=str(evidence/f'{name}.png');bpy.ops.render.render(write_still=True)
render_import(out)
