"""Build town walkers from the game's licensed Quaternius people.

Run: blender -b --python tools/blender/town-walkers.py -- --root . --render .evidence/DATE/TOWN-ART-WALKERS
The standing Quaternius figures are reused from public/assets/heli/people/.
The source pack is CC0; see public/assets/models/CREDITS.md.
"""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
out=root/'public/assets/models/wasteland/town/walkers.glb';blend=root/'art-build/town/walkers.blend'
render=Path(a.render);render=render if render.is_absolute() else root/render
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(render)] if a.render else []}));raise SystemExit(0)

import bpy, bmesh
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;out.parent.mkdir(parents=True,exist_ok=True);blend.parent.mkdir(parents=True,exist_ok=True)
texdir=root/'public/assets/models/wasteland/town/textures'
SPECS=[
 ('walker-a','driver-standing','coat','hood'),('walker-b','hiker-standing','overalls','cap'),
 ('walker-c','driver-standing','poncho','broad-hat'),('walker-d','driver-standing','long-coat','hood'),
 ('walker-e','hiker-standing','work-shirt','knit-cap'),('walker-f','driver-standing','dust-coat','wide-brim'),
 ('walker-g','hiker-standing','overalls','hardhat'),('walker-h','driver-standing','shawl','wrap'),
 ('walker-kid-a','driver-standing','short-coat','hood'),('walker-kid-b','hiker-standing','overall-shorts','cap'),
 ('walker-guard','driver-standing','guard-coat','helmet'),('walker-trader','hiker-standing','layered-coat','turban'),
 ('walker-vane','driver-standing','white-overalls','bare-head')]

def child(parent,obj):
 world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world;return obj

def make_cloth(name,path,tint=(1,1,1)):
 im=bpy.data.images.load(str(path),check_existing=False);im.filepath_raw=str(path);im.file_format='JPEG';im.pack()
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*tint,1);mat.use_nodes=True
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.93
 image=mat.node_tree.nodes.new('ShaderNodeTexImage');image.image=im;image.extension='REPEAT'
 mat.node_tree.links.new(image.outputs['Color'],bs.inputs['Base Color']);return mat

def mesh_subset(src,name,polys,origin=(0,0,0),material_overrides=None):
 old=src.data;uvold=old.uv_layers.active;mapping={};verts=[];faces=[];mids=[];uvfaces=[]
 for poly in polys:
  face=[];uv=[]
  for li in poly.loop_indices:
   vi=old.loops[li].vertex_index
   if vi not in mapping:
    mapping[vi]=len(verts);verts.append(tuple(old.vertices[vi].co-Vector(origin)))
   face.append(mapping[vi]);uv.append(tuple(uvold.data[li].uv) if uvold else (old.vertices[vi].co.x,old.vertices[vi].co.z))
  faces.append(face);mids.append(poly.material_index);uvfaces.append(uv)
 data=bpy.data.meshes.new(name+' mesh');data.from_pydata(verts,[],faces);data.materials.clear()
 for mat in (material_overrides or old.materials):data.materials.append(mat)
 data.update();uv=data.uv_layers.new(name='UVMap')
 for poly,uvrow,mid in zip(data.polygons,uvfaces,mids):
  poly.material_index=min(mid,len(data.materials)-1)
  poly.use_smooth=True
  for li,coord in zip(poly.loop_indices,uvrow):uv.data[li].uv=coord
 obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);return obj

def assign_photo_cloth(obj,ident):
 path=texdir/f'{ident}-cloth.jpg';fabric=make_cloth(ident+' worn photo-cloth',path)
 mats=[]
 for old in obj.data.materials:
  lower=(old.name if old else '').lower()
  if any(k in lower for k in ('boot','steel','visor','goggle')):
   copy=old.copy() if old else fabric
   mats.append(copy)
  else:mats.append(fabric)
 obj.data.materials.clear()
 for mat in mats:obj.data.materials.append(mat)

def hat(parent,ident,kind,cloth):
 # Low-poly curved hat/hood dome, shaped around a real head rather than a box.
 sides=10;cx,cy,cz=0,-.005,1.62
 if kind in ('bare-head','wrap'):return
 verts=[];rings=[(.17,.16,.025),(.145,.14,.105),(.09,.09,.16)]
 for rx,ry,zoff in rings:
  for i in range(sides):
   ang=2*math.pi*i/sides;verts.append((cx+rx*math.cos(ang),cy+ry*math.sin(ang),cz+zoff))
 faces=[]
 for r in range(2):
  for i in range(sides):faces.append((r*sides+i,r*sides+(i+1)%sides,(r+1)*sides+(i+1)%sides,(r+1)*sides+i))
 faces.append(tuple(range(2*sides,3*sides)))
 # Small wrap-around brim is a real curved strip.
 base=len(verts)
 for z,rx,ry in ((cz+.025,.19,.18),(cz+.055,.17,.16)):
  for i in range(sides):
   ang=2*math.pi*i/sides;verts.append((cx+rx*math.cos(ang),cy+ry*math.sin(ang),z))
 for i in range(sides):faces.append((base+i,base+(i+1)%sides,base+sides+(i+1)%sides,base+sides+i))
 data=bpy.data.meshes.new(ident+' hat mesh');data.from_pydata(verts,[],faces);data.materials.append(cloth);uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  for li in poly.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*3,v.z*3)
 obj=bpy.data.objects.new(ident+' hat silhouette',data);scene.collection.objects.link(obj);child(parent,obj)

def coat_shell(parent,ident,cloth):
 # Open-front, tapered drape with an uneven below-knee hem.
 sides=14;verts=[];rings=[(.23,.14,1.21),(.27,.17,.83),(.34,.21,.43)]
 for rx,ry,z in rings:
  for i in range(sides+1):
   ang=math.radians(57)+math.radians(246)*i/sides
   hem=1+(.025*math.sin(i*2.3) if z<.5 else 0)
   verts.append((rx*math.sin(ang)*hem,-.005+ry*math.cos(ang)*hem,z))
 faces=[]
 for r in range(2):
  for i in range(sides):faces.append((r*(sides+1)+i,r*(sides+1)+i+1,(r+1)*(sides+1)+i+1,(r+1)*(sides+1)+i))
 data=bpy.data.meshes.new(ident+' tailored coat shell');data.from_pydata(verts,[],faces);data.materials.append(cloth);uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co
   angle=(math.atan2(v.x,v.y+.005)-math.radians(57))/math.radians(246)
   uv.data[li].uv=(angle,(v.z-.43)/.78)
 obj=bpy.data.objects.new(ident+' long coat shell',data);scene.collection.objects.link(obj);child(parent,obj)

def named_drop(parent):
 verts=[(0,0,.06),(-.035,0,.005),(0,-.008,-.055),(.035,0,.005),(0,.018,.005)]
 faces=[(0,1,4),(0,4,3),(1,2,4),(4,2,3)]
 data=bpy.data.meshes.new('Vane blue drop mesh');data.from_pydata(verts,[],faces);data.materials.append(vane_blue);uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  for li in poly.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x+0.05,v.z+0.06)
 obj=bpy.data.objects.new('walker-vane blue drop',data);scene.collection.objects.link(obj);child(parent,obj)

def trader_pack(parent,cloth):
 sides=8;verts=[];rings=[(.13,.14,.0),(.19,.20,.18),(.15,.16,.40)]
 for rx,ry,z in rings:
  for i in range(sides):
   angle=2*math.pi*i/sides;verts.append((rx*math.cos(angle),.24+ry*math.sin(angle),.84+z))
 faces=[]
 for r in range(2):
  for i in range(sides):faces.append((r*sides+i,r*sides+(i+1)%sides,(r+1)*sides+(i+1)%sides,(r+1)*sides+i))
 faces.extend([tuple(reversed(range(sides))),tuple(range(2*sides,3*sides))])
 data=bpy.data.meshes.new('Trader pack mesh');data.from_pydata(verts,[],faces);data.materials.append(cloth);uv=data.uv_layers.new(name='UVMap')
 for poly in data.polygons:
  for li in poly.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x+.2,v.z-.84)
 obj=bpy.data.objects.new('walker-trader pack main',data);scene.collection.objects.link(obj);child(parent,obj)

def build(spec):
 ident,donor,outfit,hatkind=spec;is_kid='kid' in ident;height=1.30 if is_kid else 1.70
 source=bpy.data.objects.new(ident+' donor source',donor_templates[donor].copy());scene.collection.objects.link(source)
 bpy.ops.object.select_all(action='DESELECT');source.select_set(True);bpy.context.view_layer.objects.active=source
 source.data.calc_loop_triangles();initial=len(source.data.loop_triangles)
 dec=source.modifiers.new('Preserve human silhouette under town budget','DECIMATE');dec.ratio=220/initial;dec.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=dec.name);source.data.calc_loop_triangles()
 factor=height/max(v.co.z for v in source.data.vertices)
 for v in source.data.vertices:
  if is_kid:
   # Children have shorter legs, a compressed torso and a slightly larger head.
   z=v.co.z
   if z<.93:v.co.z*=.70
   elif z<1.48:v.co.z=.651+(z-.93)*.84
   else:v.co.z=.651+.55*.84+(z-1.48)*1.12
  v.co*=factor
 source.data.update()
 bpy.ops.object.select_all(action='DESELECT');source.select_set(True);bpy.context.view_layer.objects.active=source
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 source.data.uv_layers.active.name='UVMap'
 actor=bpy.data.objects.new(ident,None);scene.collection.objects.link(actor);actor.parent=root_obj;actor['height_m']=height;actor['source']='Quaternius Universal Base Characters, Standard (CC0)'
 assign_photo_cloth(source,ident)
 # Classify the decimated donor surface into a head, an upper body, and two legs.
 hip=height*.51
 upper=[];legs=[[],[]]
 for poly in source.data.polygons:
  center=poly.center;z=center.z
  if z<hip:legs[0 if center.x<0 else 1].append(poly)
  else:upper.append(poly)
 legparts=[]
 for index,label in enumerate(('leg-l','leg-r')):
  pivot=bpy.data.objects.new(ident+':'+label,None);scene.collection.objects.link(pivot);child(actor,pivot)
  pivot.location=( (-.105 if index==0 else .105),0,hip);pivot['swing_axis']='X'
  obj=mesh_subset(source,ident+' articulated '+label,legs[index],origin=tuple(pivot.location),material_overrides=source.data.materials);child(pivot,obj);legparts.append(obj)
 body=mesh_subset(source,ident+' donor body',upper,material_overrides=source.data.materials);child(actor,body)
 # Keep the donor's complete head joined to its shoulders. A small shaded face
 # insert is a separate adjustable part and stays within the head-node budget.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(0,-.095,height*.90))
 head=bpy.context.object;head.name=ident+' head';head.scale=(.075,.025,.10)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 head.data.materials.append(skin_mat);head.data.uv_layers.active.name='UVMap' if head.data.uv_layers.active else None;child(actor,head)
 bpy.data.objects.remove(source,do_unlink=True)
 # Custom outfit markups stay within the body budget; shells follow cloth rather than cube primitives.
 fabric=next(m for m in body.data.materials if m and m.name.startswith(ident+' worn'))
 if outfit in ('coat','long-coat','dust-coat','guard-coat','layered-coat','short-coat'):
  coat_shell(actor,ident,fabric)
 hat(actor,ident,hatkind,fabric)
 if ident=='walker-trader':trader_pack(actor,fabric)
 if ident=='walker-vane':named_drop(actor)
 triangles=0
 for ob in actor.children_recursive:
  if ob.type=='MESH':ob.data.calc_loop_triangles();triangles+=len(ob.data.loop_triangles)
 if triangles>450:raise RuntimeError(f'{ident}: {triangles} triangles exceeds 450')
 actor['triangle_count']=triangles
 for ob in actor.children_recursive:
  if ob.type=='MESH' and ob.data.uv_layers.active:ob.data.uv_layers.active.name='UVMap'
 print('WALKER',ident,'triangles',triangles,'height',height)
 return actor

donor_templates={}
for donor in sorted({spec[1] for spec in SPECS}):
 bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/heli/people'/f'{donor}.glb'))
 imported=next(o for o in bpy.context.selected_objects if o.type=='MESH')
 bpy.ops.object.select_all(action='DESELECT');imported.select_set(True);bpy.context.view_layer.objects.active=imported
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 donor_templates[donor]=imported.data.copy()
 bpy.data.objects.remove(imported,do_unlink=True)
scene=bpy.context.scene
vane_blue=bpy.data.materials.new('Mrs Vane chipped blue workwear mark');vane_blue.diffuse_color=(.10,.24,.30,1);vane_blue.use_nodes=True
vane_blue.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.10,.24,.30,1)
vane_blue.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=0
skin_mat=bpy.data.materials.new('Muted dusty skin under shade');skin_mat.diffuse_color=(.24,.18,.13,1);skin_mat.use_nodes=True
skin_bs=skin_mat.node_tree.nodes.get('Principled BSDF');skin_bs.inputs['Base Color'].default_value=(.24,.18,.13,1);skin_bs.inputs['Roughness'].default_value=.96
root_obj=bpy.data.objects.new('town-walkers',None);scene.collection.objects.link(root_obj);root_obj.empty_display_type='PLAIN_AXES'
actors=[build(spec) for spec in SPECS]

def setup_scene():
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.world=bpy.data.worlds.new('bright overcast')
 scene.world.color=(.48,.49,.50)
 for loc,power,size in [((0,-4,5),650,5),((4,1,3),260,4),((-3,2,4),320,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
  light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.02));ground=bpy.context.object;ground.name='mid grey-brown dirt'
 ground.data.materials.append(bpy.data.materials.new('mid grey-brown dirt'))
 ground.data.materials[0].diffuse_color=(.24,.22,.19,1)
 ground.data.materials[0].use_nodes=True;ground.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.24,.22,.19,1)
 return scene

def camera(scene,loc,target,lens):
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.lens=lens;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam

def render_sheet_views():
 if not a.render:return
 render.mkdir(parents=True,exist_ok=True)
 # Every look view follows the exported GLB, imported into an empty scene.
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;bpy.ops.import_scene.gltf(filepath=str(out));setup_scene()
 targets=[o for o in scene.objects if o.type=='MESH']
 for ob in targets:ob.hide_render=not ob.name.startswith('walker-a ')
 camera(scene,(2.4,-3.5,2.3),(0,0,.86),55);scene.render.filepath=str(render/'walker-a-three-quarter.png');bpy.ops.render.render(write_still=True)
 for ob in targets:ob.hide_render=False
 # Row of all thirteen separately, filling frame.
 actors2=[o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('walker-') and ':' not in o.name]
 for i,actor in enumerate(actors2):actor.location.x=(i-6)*.53
 scene.render.resolution_x=2200;scene.render.resolution_y=700
 camera(scene,(0,-8,3.5),(0,0,.65),30);scene.render.filepath=str(render/'family-row.png');bpy.ops.render.render(write_still=True)
 # Crowd view from the mayor's height, 40 instances from the exported family.
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;bpy.ops.import_scene.gltf(filepath=str(out));setup_scene()
 family=[o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('walker-') and ':' not in o.name]
 sources={o.name:o for o in family};
 def duplicate_person(source,offset,rotation):
  originals=[]
  def walk(obj):
   originals.append(obj)
   for child_obj in obj.children:walk(child_obj)
  walk(source);copies={}
  for obj in originals:
   duplicate=obj.copy()
   if obj.data:duplicate.data=obj.data.copy()
   scene.collection.objects.link(duplicate);copies[obj]=duplicate
  for obj,duplicate in copies.items():
   if obj.parent in copies:duplicate.parent=copies[obj.parent]
  root_copy=copies[source];root_copy.location=offset;root_copy.rotation_euler.z=rotation
 for i in range(40):
  source=sources[SPECS[i%len(SPECS)][0]]
  duplicate_person(source,((i%8-3.5)*.85,(i//8)*.85,0),((i*7)%11)*.12)
 camera(scene,(0,-15,5),(0,0,0),42);scene.render.resolution_x=1400;scene.render.resolution_y=900
 scene.render.filepath=str(render/'crowd-40.png');bpy.ops.render.render(write_still=True)

out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=False,export_yup=True,export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=84)
bpy.ops.wm.save_as_mainfile(filepath=str(blend));render_sheet_views()
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'blend':str(blend)}))
