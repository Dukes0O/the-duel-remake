"""Scrapyard work-machine family, authored in real metres and exported Y-up."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--render-machine',default='crane-truck');p.add_argument('--candidate',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();project_root=root;glb=root/('.qa-dist/town-machines-2/candidate.glb' if a.candidate else 'public/assets/models/wasteland/town/machines-2.glb');ev=Path(a.render);ev=ev if ev.is_absolute() else root/ev
if a.paths_only:
 print(json.dumps({'blend':[str(root/'art-build/town/machines-2.blend')],'glb':[str(glb)],'evidence':[],'summary':[]}));raise SystemExit(0)
import bpy
import numpy as np
from mathutils import Vector
eevee_engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
def game_vector(point):return Vector((point[0],-point[2],point[1]))
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tx=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'rusted-steel':tx/'machines2-dusty-steel.jpg','galvanised-tin':tx/'machines2-dusty-steel.jpg','iron-dark':tx/'machines2-dusty-steel.jpg','faded-hand-paint':tx/'yellow-green-paint.jpg','sand':tx/'dirt.jpg'})
def shade_picture(material_name,value,saturation,tint=(1,1,1)):
 mat=m[material_name];image=next(node.image for node in mat.node_tree.nodes if node.type=='TEX_IMAGE');pixels=np.empty(image.size[0]*image.size[1]*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape((image.size[1],image.size[0],4));rgb=pixels[:,:,:3];lum=rgb[:,:,0:1]*.30+rgb[:,:,1:2]*.59+rgb[:,:,2:3]*.11;rgb[:]=np.clip((lum+(rgb-lum)*saturation)*value*np.asarray(tint,dtype=np.float32)[None,None,:],0,1);image.pixels.foreach_set(pixels.ravel());image.pack()
shade_picture('rusted-steel',.58,.68,(.90,.82,.70));shade_picture('faded-hand-paint',.56,.68,(.68,.78,.42));shade_picture('galvanised-tin',.60,.72);shade_picture('iron-dark',.24,.38,(.84,.82,.78));shade_picture('sand',.88,.92,(1,.78,.58))
shade_picture('dirty-glass',.12,.35,(.65,.68,.66))
for v in m.values():v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.29,v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
glass=m['dirty-glass'];glass.diffuse_color=(.025,.035,.034,.88);glass.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.025,.035,.034,1);glass.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.02;glass.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.34
black=m['iron-dark'];black.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.16
rubber_image=bpy.data.images.load(str((tx/'machines2-dusty-rubber.jpg').resolve()),check_existing=False);rubber_image.scale(256,256);rubber_pixels=np.empty(256*256*4,dtype=np.float32);rubber_image.pixels.foreach_get(rubber_pixels);rubber_pixels=rubber_pixels.reshape((256,256,4));rubber_pixels[:,:,:3]*=.52;rubber_image.pixels.foreach_set(rubber_pixels.ravel());rubber_image.file_format='JPEG';rubber_image.pack()
rubber=bpy.data.materials.new('Machines / dusty black rubber');rubber.diffuse_color=(.018,.020,.019,1);rubber.use_nodes=True;rubber_bsdf=rubber.node_tree.nodes['Principled BSDF'];rubber_bsdf.inputs['Base Color'].default_value=(.018,.020,.019,1);rubber_bsdf.inputs['Metallic'].default_value=.01;rubber_bsdf.inputs['Roughness'].default_value=.94
rubber_tex=rubber.node_tree.nodes.new('ShaderNodeTexImage');rubber_tex.image=rubber_image;rubber_tex.extension='REPEAT';rubber.node_tree.links.new(rubber_tex.outputs['Color'],rubber_bsdf.inputs['Base Color'])
loader_enamel=bpy.data.materials.new('Loader / faded olive enamel');loader_enamel.diffuse_color=(.10,.12,.04,1);loader_enamel.use_nodes=True
loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.10,.12,.04,1);loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.16;loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.78
loader_arm_paint=bpy.data.materials.new('Loader / worn ochre yellow lift arms');loader_arm_paint.diffuse_color=(.58,.36,.08,1);loader_arm_paint.use_nodes=True
arm_bsdf=loader_arm_paint.node_tree.nodes['Principled BSDF'];arm_bsdf.inputs['Base Color'].default_value=(.58,.36,.08,1);arm_bsdf.inputs['Metallic'].default_value=.18;arm_bsdf.inputs['Roughness'].default_value=.86
steel=m['rusted-steel'];tin=m['galvanised-tin'];paint=m['faded-hand-paint'];glass=m['dirty-glass']
def parent(o,p):
 bpy.context.view_layer.update();world=o.matrix_world.copy();parent_world=p.matrix_world.copy();o.parent=p;o.matrix_parent_inverse.identity();o.matrix_basis=parent_world.inverted_safe()@world
def empty(name,loc,par=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc
 if par:parent(o,par)
 return o
def box(n,loc,sz,mat=steel,par=None,bevel=.06):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=sz;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 uv=o.data.uv_layers.active
 if uv:uv.name='UVMap'
 else:o.data.uv_layers.new(name='UVMap')
 for poly in o.data.polygons:
  normal=poly.normal
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=((co.x,co.z) if abs(normal.y)>max(abs(normal.x),abs(normal.z)) else (co.x,co.y))
 if bevel:
  mod=o.modifiers.new('worn plate edges','BEVEL');mod.width=bevel;mod.segments=1
  weighted=o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=weighted.name)
 if par:parent(o,par)
 return o
def beam(n,a,b,r,mat=steel,par=None):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);o.data.uv_layers.active.name='UVMap'
 if par:parent(o,par)
 return o
def box_beam(n,a,b,width,height,mat=steel,par=None,bevel=.03):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cube_add(size=1,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.dimensions=(width,height,d.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('rolled welded edges','BEVEL');mod.width=bevel;mod.segments=1
  weighted=o.modifiers.new('weighted plate normals','WEIGHTED_NORMAL')
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=weighted.name)
 o.data.uv_layers.active.name='UVMap'
 if par:parent(o,par)
 return o
def wheel(n,x,y,z,r,w,par):
 # Continuous carcass with moulded chevrons, based on the accepted machines-1 tyre.
 seg,rings=24,12;verts=[];faces=[]
 for i in range(seg):
  theta=math.tau*i/seg
  for j in range(rings):
   phi=math.tau*j/rings;across=abs((phi-math.pi/2+math.pi)%(math.tau)-math.pi);pitch=math.tau/12;sweep=(phi-math.pi/2)*.60;delta=(theta-sweep+math.pi)%(math.tau)-math.pi;dist=abs((delta+pitch/2)%pitch-pitch/2);lug=.055*max(0,1-dist/.20)*max(0,1-across/.82) if dist<.20 else 0;radius=r*.78+r*.22*math.sin(phi)+lug;verts.append((x+w*.5*math.cos(phi),y+radius*math.sin(theta),z+radius*math.cos(theta)))
 for i in range(seg):
  for j in range(rings):
   q=i*rings+j;faces.append((q,((i+1)%seg)*rings+j,((i+1)%seg)*rings+(j+1)%rings,i*rings+(j+1)%rings))
 mesh=bpy.data.meshes.new(n+' continuous chevron tyre');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(n+' molded rubber carcass',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(rubber);parent(o,par);uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index;uv.data[li].uv=(verts[vi][1]/2,verts[vi][0]/2)
 for side in (-1,1):
  bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r*.59,depth=w*.50,location=(x+side*w*.29,y,z),rotation=(0,math.pi/2,0));rim=bpy.context.object;rim.name=n+' dark steel rim';rim.data.materials.append(black);rim.data.uv_layers.active.name='UVMap';parent(rim,par)
  bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=r*.55,minor_radius=.045,location=(x+side*w*.44,y,z),rotation=(0,math.pi/2,0));ring=bpy.context.object;ring.name=n+' rolled rim bead';ring.data.materials.append(tin);ring.data.uv_layers.active.name='UVMap';parent(ring,par)
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r*.23,depth=w*.16,location=(x+side*w*.49,y,z),rotation=(0,math.pi/2,0));hub=bpy.context.object;hub.name=n+' forged hub';hub.data.materials.append(black);hub.data.uv_layers.active.name='UVMap';parent(hub,par)
  for i in range(6):
   q=math.tau*i/6;beam(n+' rim bolt '+str(side)+' '+str(i),(x+side*w*.54,y+math.sin(q)*r*.43,z+math.cos(q)*r*.43),(x+side*w*.54+side*.025,y+math.sin(q)*r*.43,z+math.cos(q)*r*.43),.022,tin,par)
def tyre_pair(id,par,y,r=.72):
 for x in (-.98,.98):wheel(id+' industrial tyre',x,y,r,r,.56,par)
def cab(id,par,x=0,y=-.1,z=1.8):
 # Closed welded cab shell: floor, roof, front/rear panels and full side walls.
 # The glazed apertures are closed panes set into painted sheet-metal frames.
 box(id+' cab sill',(x,y,z),(1.12,1.48,.16),paint,par,.05);box(id+' cab roof',(x,y,z+1.70),(1.26,1.54,.12),paint,par,.04)
 for face_y,label in ((y-.68,'front'),(y+.68,'rear')):
  box(id+' cab '+label+' lower steel wall',(x,face_y,z+.27),(1.12,.14,.38),paint,par,.035)
  box(id+' cab '+label+' roof header',(x,face_y,z+1.57),(1.12,.14,.22),paint,par,.035)
  for side in (-1,1):
   box(id+' cab '+label+' window jamb',(x+side*.49,face_y,z+.96),(.14,.14,1.12),paint,par,.025)
 for s in (-1,1):
  box(id+' solid cab side lower wall',(x+s*.55,y,z+.31),(.12,1.34,.48),paint,par,.04)
  box(id+' solid cab side upper frame',(x+s*.55,y,z+1.52),(.12,1.34,.26),paint,par,.035)
  box(id+' cab side window divider',(x+s*.55,y-.05,z+.99),(.13,.075,.98),paint,par,.025)
  beam(id+' narrow cab front post',(x+s*.55,y-.68,z+.08),(x+s*.55,y-.68,z+1.68),.035,steel,par);beam(id+' narrow cab rear post',(x+s*.55,y+.68,z+.08),(x+s*.55,y+.68,z+1.68),.035,tin,par);beam(id+' cab side sill',(x+s*.55,y-.68,z+.12),(x+s*.55,y+.68,z+.12),.025,tin,par)
  beam(id+' cab side window divider',(x+s*.555,y-.05,z+.60),(x+s*.555,y-.05,z+1.54),.025,steel,par)
 box(id+' dark windscreen',(x,y-.69,z+1.06),(.86,.025,.94),glass,par,.012);box(id+' rear cab glazing',(x,y+.69,z+1.06),(.82,.025,.90),glass,par,.012)
 for s in (-1,1):
  box(id+' dark side glazing',(x+s*.55,y,z+1.06),(.025,.82,.80),glass,par,.012)
  beam(id+' painted window top rail',(x+s*.57,y-.48,z+1.52),(x+s*.57,y+.48,z+1.52),.035,paint,par)
  beam(id+' painted window lower rail',(x+s*.57,y-.48,z+.60),(x+s*.57,y+.48,z+.60),.04,paint,par)
  beam(id+' painted windshield header',(x-.49,y-.70,z+1.56),(x+.49,y-.70,z+1.56),.04,paint,par)
 for s in (-1,1):
  box(id+' painted cab door',(x+s*.565,y+.12,z+.37),(.055,.82,.50),paint,par,.025)
  beam(id+' cab door front seam',(x+s*.595,y-.30,z+.12),(x+s*.595,y-.30,z+.62),.018,black,par)
  beam(id+' cab door rear seam',(x+s*.595,y+.54,z+.12),(x+s*.595,y+.54,z+.62),.018,black,par)
  box(id+' cab door latch',(x+s*.61,y+.40,z+.58),(.025,.10,.035),tin,par,.01)
 for s in (-1,1):
  bpy.ops.object.light_add(type='AREA',location=(x+s*.42,y-.66,z+1.80));lamp=bpy.context.object;lamp.name=id+':lamp';lamp.data.energy=18;lamp.data.color=(1.0,.78,.42);lamp.data.shape='DISK';lamp.data.size=.12;parent(lamp,par)
def articulated_loader():
 root=empty('loader',(0,0,0));front=empty('loader:front-frame',(0,.74,0),root);rear=empty('loader:rear-frame',(0,-.74,0),root)
 # Round 26 replaces the old block body with a photo carve. Attachments stay
 # in their named joints so the arm and bucket can move independently.
 from photo_model import Photo as LoaderPhoto, Mesh as LoaderMesh, slab as photo_slab, trace as photo_trace
 from photo_carve import carve_object
 from hull_model import tyre as photo_tyre
 loader_textures=project_root/'public/assets/models/wasteland/town/textures'
 side=LoaderPhoto(loader_textures/'loader-side.jpg');front_photo=LoaderPhoto(loader_textures/'loader-front.jpg');rear_photo=LoaderPhoto(loader_textures/'loader-rear.jpg');top=LoaderPhoto(loader_textures/'loader-top.jpg')
 # Measured on the current full loader-side photo: silhouette x=58..748,
 # ground y=400; rear/front tyre centres x=160/540 at y=321, radius 80 px.
 length=5.0;width=2.55;height=2.62;side_start,side_end,side_ground=58,748,400
 side_scale=length/(side_end-side_start)
 wheel_radius=80*side_scale;wheel_width=.42;track=1.22
 axle_pixels=(160,540);axle_centres=(321,321)
 axle_z=[-length/2+((px-side_start)/(side_end-side_start))*length for px in axle_pixels]
 table={'photos':{'side':'loader-side.jpg','front':'loader-front.jpg','rear':'loader-rear.jpg','top':'loader-top.jpg'},
  'length':length,'width':width,'height':height,'side':{'start':side_start,'end':side_end,'ground':side_ground},
  'front':{'centre':319,'ground':431,'top':20},'rear':{'centre':319,'ground':431,'top':24},
  'top':{'front':45,'rear':570,'centre':285,'along':'x','x_scale':width/(430-168)},
  'underside':.50,'wheels':[(z,wheel_radius,track) for z in axle_z],
  # The front and rear tyres hide frame faces; leave the side tyre pixels in
  # place so the body behind them is not cut away.
  'cut':{'front':[(85,160,225,445),(416,160,565,445)],'rear':[(82,165,225,445),(415,165,565,445)],
         'top':[(0,0,875,40),(0,470,875,570),(105,70,238,202),(620,70,742,202)]},
 'voxel':.04,'target':6200,'grey':22,'tolerance':35,'bleed_tolerance':32,
  'mask_dir':str(project_root/'.evidence/2026-11-09/TOWN-ART-MACHINES-2/round-26/masks')}
 # A centre articulation is a real break in the body silhouette. Carve each
 # half against the same photo set, trimming only its opposite half in side
 # and plan masks so largest_part never discards the front frame.
 front_table=dict(table);rear_table=dict(table)
 front_table['photos']=dict(table['photos']);rear_table['photos']=dict(table['photos'])
 front_table['cut']={key:list(rects) for key,rects in table['cut'].items()};rear_table['cut']={key:list(rects) for key,rects in table['cut'].items()}
 middle_side=(side_start+side_end)//2;middle_top=(45+570)//2
 front_table['cut'].setdefault('side',[]).append((middle_side,0,side.w,side.h))
 rear_table['cut'].setdefault('side',[]).append((0,0,middle_side,side.h))
 front_table['cut'].setdefault('top',[]).append((middle_top,0,top.w,top.h))
 rear_table['cut'].setdefault('top',[]).append((0,0,middle_top,top.h))
 front_body=carve_object('loader:front-body',loader_textures,front_table)
 rear_body=carve_object('loader:rear-body',loader_textures,rear_table)
 for photo in front_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 for photo in rear_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 parent(front_body,front);parent(rear_body,rear)
 # Articulated centre and paired cross axles connect the two photo-carved
 # halves. The pivot is in the centre of the two frames.
 beam('loader articulation kingpin',(0,-.03,.80),(0,-.03,1.65),.16,tin,root)
 for axle_index,z in enumerate(axle_z):
  wheel_height=(side_ground-axle_centres[axle_index])*side_scale
  beam('loader axle housing',(-.88,z,wheel_height),(.88,z,wheel_height),.14,steel,root)
  for x in (-track,track):
   wheel_parent=front if z==axle_z[0] else rear
   bpy.ops.mesh.primitive_cylinder_add(vertices=36,radius=wheel_radius*.98,depth=wheel_width*.90,location=(x,z,wheel_height),rotation=(0,math.pi/2,0))
   tyre_core=bpy.context.object;tyre_core.name='loader solid dusty rubber tyre';tyre_core.data.materials.append(rubber);parent(tyre_core,wheel_parent)
   bpy.ops.mesh.primitive_torus_add(major_radius=wheel_radius*.82,minor_radius=wheel_radius*.18,major_segments=36,minor_segments=10,location=(x,z,wheel_height),rotation=(0,math.pi/2,0))
   wheel_obj=bpy.context.object;wheel_obj.name='loader dark rubber tyre shoulder';wheel_obj.data.materials.append(rubber);parent(wheel_obj,wheel_parent)
   bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=wheel_radius*.53,depth=wheel_width*.12,location=(x+(-1 if x<0 else 1)*wheel_width*.48,z,wheel_height),rotation=(0,math.pi/2,0))
   hub=bpy.context.object;hub.name='loader worn photo-hub';hub.data.materials.append(tin);parent(hub,front if z==axle_z[0] else rear)
 # The articulated headstock and moving assemblies have real pin origins.
 # The side-photo frame pins beside the cab are at about x=300, y=255.
 # The arm joint origin is that pin; its photo-mapped arms run forward/down.
 arms=empty('loader:arms',(0,.75,1.55),front)
 arm_photo=LoaderPhoto(loader_textures/'loader-arm-side.jpg')
 from photo_carve import lift_if_dark
 arm_rgb=arm_photo.rgb();arm_chroma=arm_rgb.max(axis=2)-arm_rgb.min(axis=2);arm_mask=(arm_chroma>14)|(arm_rgb.mean(axis=2)<145)
 arm_loops=photo_trace(arm_mask,(20,20,arm_photo.w-20,arm_photo.h-20),tolerance=2.5,min_area=120)
 # Two worn-yellow lift arms connect the measured pins beside the cab to the
 # bucket pin ahead of the front tyres. Their shared pivot is the arm origin.
 for side_sign in (-1,1):
  box_beam('loader lift arm '+('left' if side_sign<0 else 'right'),
   (side_sign*1.17,.75,1.55),(side_sign*1.17,3.10,.39),.20,.18,loader_arm_paint,arms,.03)
 beam('loader lift ram barrels left',(-.60,.30,1.52),(-.60,1.32,1.58),.09,steel,front)
 beam('loader lift ram barrels right',(.60,.30,1.52),(.60,1.32,1.58),.09,steel,front)
 beam('loader arm hinge pin',(-.90,.75,1.55),(.90,.75,1.55),.12,tin,front)
 # The bucket hinge is 2.35 m ahead and 1.16 m below the arm pivot. In world
 # space it lands at y=+3.10, with the 1 m scoop resting on the ground.
 bucket=empty('loader:bucket',(0,3.10,.39),arms)
 bucket_photo=LoaderPhoto(loader_textures/'loader-bucket-side.jpg')
 bucket_rgb=bucket_photo.rgb();bucket_chroma=bucket_rgb.max(axis=2)-bucket_rgb.min(axis=2);bucket_mask=(bucket_chroma>14)|(bucket_rgb.mean(axis=2)<145)
 bucket_loops=photo_trace(bucket_mask,(10,10,bucket_photo.w-10,bucket_photo.h-10),tolerance=2.3,min_area=100)
 bucket_mesh=LoaderMesh();bucket_pin_px,bucket_pin_py=1110,95;bucket_scale=1.0/(1160-bucket_pin_py)
 def bucket_world(px,py,depth):return (depth,(bucket_pin_px-px)*bucket_scale,(bucket_pin_py-py)*bucket_scale)
 for loop in bucket_loops:
  area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]+loop[:1])))/2
  if area<20000:continue
  photo_slab(bucket_mesh,'bucket',bucket_photo,[loop],bucket_world,-1.30,1.30)
 traced_bucket=bucket_mesh.finish('loader:bucket:photo-traced-scoop',{'bucket':bucket_photo.material()})
 # Keep the photographed scoop's lower edge on the ground while setting its
 # measured overall height to exactly one metre.
 bucket_z=[vertex.co.z for vertex in traced_bucket.data.vertices]
 bucket_low=min(bucket_z);bucket_high=max(bucket_z);bucket_height=bucket_high-bucket_low
 if bucket_height>0:
  for vertex in traced_bucket.data.vertices:vertex.co.z=bucket_low+(vertex.co.z-bucket_low)/bucket_height
 # The photo mesh is pin-local: translate it to the measured arm-tip pin,
 # then parent it so the bucket curls around that pin at work.
 traced_bucket.location+=bucket.matrix_world.translation
 parent(traced_bucket,bucket)
 beam('loader bucket hinge pin',(-.65,3.10,.39),(.65,3.10,.39),.105,tin,bucket)
 print('LOADER MEASURED PHOTO BOUNDS m length',round(length,3),'width',round(width,3),'height',round(height,3),'tyre radius',round(wheel_radius,3),'axle centres',tuple(round(v,3) for v in axle_z))
 # Report every mesh part before rigid assemblies are joined, with neighbour
 # contacts used to check that the structure is connected and grounded.
 bpy.context.view_layer.update()
 for obj in [o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name.startswith('loader') or o.parent and o.parent.name.startswith('loader'))]:
  bounds=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
  low=tuple(round(min(v[i] for v in bounds),3) for i in range(3));high=tuple(round(max(v[i] for v in bounds),3) for i in range(3))
  print('LOADER PIECE BOUNDS',obj.name,'min',low,'max',high)
 return root,arms,bucket
def basic_family():
 root=empty('town-machines-2',(0,0,0));loader,arms,bucket=articulated_loader();parent(loader,root)
 def band_track(id,side,center_y,length,track_parent):
  # A continuous rounded belt wraps front and rear rollers; tread shoes sit on it.
  x=side*1.22;radius=.46;lo=center_y-length/2+radius;hi=center_y+length/2-radius
  for yy in (lo,hi):
   bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=1,location=(x,yy,.58));o=bpy.context.object;o.name=id+' track end roller';o.scale=(.32,radius,.43);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(black);o.data.uv_layers.active.name='UVMap';parent(o,track_parent)
  for s in (-1,1):
   box(id+' continuous track side belt',(x+s*.15,center_y,.58),(.14,length-2*radius,.76),rubber,track_parent,.13)
  count=18
  for end in (lo,hi):
   for j in range(8):
    ang=math.pi*j/7;yy=end+math.cos(ang)*radius;zz=.58+math.sin(ang)*radius
    box(id+' molded track shoe',(x,yy,zz),(.62,.22,.12),steel,track_parent,.035)
  for j in range(count):
   yy=lo+(hi-lo)*j/(count-1)
   box(id+' lower track pad',(x,yy,.18),(.68,.20,.11),steel,track_parent,.03)
   box(id+' upper track pad',(x,yy,.98),(.68,.20,.11),black,track_parent,.03)
# Mixer: a whole-truck photo carve leaves the drum as its only turning part.
 mixer=empty('mixer-truck',(0,0,0),root)
 from photo_model import Photo, Mesh as PhotoMesh, lathe
 from photo_carve import carve_object
 from hull_model import tyre
 mixer_textures=project_root/'public/assets/models/wasteland/town/textures'
 side_photo=Photo(mixer_textures/'mixer-truck-side.jpg')
 front_photo=Photo(mixer_textures/'mixer-truck-front.jpg')
 rear_photo=Photo(mixer_textures/'mixer-truck-rear.jpg')
 top_photo=Photo(mixer_textures/'mixer-truck-top.jpg')
 drum_photo=Photo(mixer_textures/'mixer-drum-side.jpg')
 # Grid measurements: 8.5 m across side pixels 26â€“1945; 0.69 m wheel radius
 # from the 155 px side radius. End views use their own measured roof and ground.
 mixer_length,mixer_width,mixer_height=8.5,2.35,3.10
 side_scale=mixer_length/(1945-26)
 wheel_radius=(757-602)*side_scale
 wheel_half=.19
 # The front grid puts the tyre centres about 0.8 m either side of centre.
 track=.80
 axle_rows=[(231,602),(1195,602),(1620,602)]
 axle_z=[-mixer_length/2+(px-26)*side_scale for px,_ in axle_rows]
 mixer_wheels=[(z,wheel_radius,track-wheel_half) for z in axle_z]
 def keep_mixer_body(x,y,z):
  # The side and plan silhouettes enclose the open channel between the rails.
  frame_gap=(abs(x)<.53)&(y<1.22)&(z>-.35)&(z<3.28)
  return ~frame_gap
 mixer_body_table={
  'photos':{'side':'mixer-truck-side.jpg','front':'mixer-truck-front.jpg',
            'rear':'mixer-truck-rear.jpg','top':'mixer-truck-top.jpg'},
  'length':mixer_length,'width':mixer_width,'height':mixer_height,
  'side':{'start':26,'end':1945,'ground':757},
  'front':{'centre':627,'ground':1218,'top':26},
  'rear':{'centre':627,'ground':1218,'top':20},
  'top':{'front':26,'rear':1945,'centre':396,'along':'x','x_scale':2.35/(620-140)},
  # Stop the carve at the frame-rail lower edge. Rails, suspension, axles and
  # tanks below this line are built geometry, not photo-filled underside.
  'underside':1.16,'wheels':mixer_wheels,'keep':keep_mixer_body,
  'cut':{'side':[(0,740,1983,793)],'front':[(0,890,1254,1254)],'rear':[(0,890,1254,1254)]},
  'voxel':.035,'target':8200,'grey':20,'tolerance':30,'bleed_tolerance':32,
  'mask_dir':str(project_root/'.evidence/2026-11-08/TOWN-ART-MACHINES-2/round-10/masks')}
 mixer_body=carve_object('mixer-truck:body',mixer_textures,mixer_body_table)
 # Cubic photo sampling softens the hard transitions where orthographic
 # projections meet on the curved body.
 for photo in mixer_body_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 parent(mixer_body,mixer)
 mixer_piece_roots=[('mixer-truck:body',mixer_body)]
 bpy.context.view_layer.update()
 body_vertices=[vertex.co[:] for vertex in mixer_body.data.vertices]
 print('MIXER BODY BOUNDS','min',tuple(round(min(v[i] for v in body_vertices),3) for i in range(3)),
       'max',tuple(round(max(v[i] for v in body_vertices),3) for i in range(3)))

 def mixer_material(name,color,roughness,metallic=0):
  material=bpy.data.materials.new(name);material.diffuse_color=(*color,1);material.use_nodes=True
  bsdf=material.node_tree.nodes['Principled BSDF'];bsdf.inputs['Base Color'].default_value=(*color,1)
  bsdf.inputs['Roughness'].default_value=roughness;bsdf.inputs['Metallic'].default_value=metallic
  return material
 mixer_yellow=mixer_material('Mixer truck / worn construction yellow',(.48,.30,.055),.84,.10)
 mixer_dark=mixer_material('Mixer truck / dark concrete and steel',(.16,.16,.14),.94,.06)
 mixer_steel=m['rusted-steel']
 def mixer_game_box(name,center,size,material,par,bevel=.04):
  return box(name,game_vector(center),(size[0],size[2],size[1]),material,par,bevel)
 def mixer_game_beam(name,a,b,radius,material,par):
  return beam(name,game_vector(a),game_vector(b),radius,material,par)
 def mixer_attach(obj,par,point=(0,0,0)):
  obj.parent=par;obj.matrix_parent_inverse.identity();obj.location=game_vector(point)
 # Build the chassis below the cut line. The carve supplies the bonnet, cab,
 # empty drum supports, hopper and ladder, but none of the under-frame fill.
 frame_y=1.19
 for sx in (-1,1):
  rail=mixer_game_box(f'mixer-truck:frame-rail-{"left" if sx<0 else "right"}',
   (sx*.53,frame_y,.05),(.18,.18,7.55),mixer_steel,mixer,.025)
  mixer_piece_roots.append((rail.name,rail))
 for axle_index,z in enumerate(axle_z):
  cross=mixer_game_beam(f'mixer-truck:frame-crossmember-{axle_index+1}',(-.58,frame_y,z),(.58,frame_y,z),.085,mixer_steel,mixer)
  mixer_piece_roots.append((cross.name,cross))
  axle=mixer_game_beam(f'mixer-truck:axle-{axle_index+1}',(-.47,.69,z),(.47,.69,z),.14,black,mixer)
  mixer_piece_roots.append((axle.name,axle))
  for sx in (-1,1):
   side='left' if sx<0 else 'right'
   spring=mixer_game_beam(f'mixer-truck:leaf-spring-{axle_index+1}-{side}',
    (sx*.52,.91,z-.58),(sx*.52,.91,z+.58),.045,mixer_steel,mixer)
   mixer_piece_roots.append((spring.name,spring))
   hanger=mixer_game_beam(f'mixer-truck:spring-hanger-{axle_index+1}-{side}',
    (sx*.52,.91,z),(sx*.52,1.18,z),.055,mixer_yellow,mixer)
   mixer_piece_roots.append((hanger.name,hanger))
 for name,center,size in [
  ('mixer-truck:fuel-tank',(-.50,1.00,-.05),(.46,.38,.82)),
  ('mixer-truck:water-tank',(.50,1.00,-.05),(.46,.38,.82)),
 ]:
  tank=mixer_game_box(name,center,size,mixer_steel,mixer,.07)
  mixer_piece_roots.append((tank.name,tank))
 for label,z in [('front',-4.03),('rear',4.03)]:
  bumper=mixer_game_box(f'mixer-truck:{label}-bumper',(0,1.06,z),(1.9,.24,.20),mixer_steel,mixer,.035)
  mixer_piece_roots.append((bumper.name,bumper))
 # The turning drum is only the separate closed-nose/open-mouth lathe.
 drum_center=(0,2.30,.75)
 drum=empty('mixer-truck:drum',game_vector(drum_center),mixer)
 mixer_piece_roots.append(('mixer-truck:drum',drum))
 drum.rotation_euler[0]=-.17
 drum_mesh=PhotoMesh()
 drum_stations=[(-2.14,.31),(-2.02,.48),(-1.78,.72),(-1.48,.89),(-1.16,.97),(.55,.97),(1.15,.99),(1.52,.96),(1.82,.82),(2.02,.57),(2.13,.31)]
 def drum_uv(index,distance,radius,angle):
  px=512+distance*(1002/4.27)
  py=310-radius*math.sin(angle)*(228/1.08)
  return drum_photo.uv(px,py)
 lathe(drum_mesh,'drum',(0,0,0),(0,0,1),(1,0,0),(0,1,0),drum_stations,drum_uv,sides=48,
       cap_start=('drum',lambda angle,fraction:drum_photo.uv(12,310-.31*fraction*(228/1.08))))
 drum_shell=drum_mesh.finish('mixer-truck:drum:photo-lathe',{'drum':drum_photo.material()})
 mixer_attach(drum_shell,drum)
 # The inside wall tapers to a closed front while the rear mouth stays open.
 drum_inner=PhotoMesh()
 inner_stations=[(2.12,.23),(1.98,.48),(1.70,.70),(1.42,.83),(1.05,.89),(-1.08,.89),(-1.43,.78),(-1.70,.56),(-1.82,.27)]
 lathe(drum_inner,'concrete',(0,0,0),(0,0,1),(1,0,0),(0,1,0),inner_stations,
       lambda i,d,r,a:drum_photo.uv(512+d*(1002/4.27),310-r*math.sin(a)*(228/1.08)),sides=40,
       cap_end=('concrete',lambda a,f:drum_photo.uv(512-1.82*(1002/4.27),310-.27*f*math.sin(a)*(228/1.08))))
 inner=drum_inner.finish('mixer drum dark inner wall and closed nose',{'concrete':mixer_dark});mixer_attach(inner,drum)
 # Photo-width black rubber treads. The rear two axles carry dual tyres on
 # each side; their inner and outer centres follow the measured end-view track.
 end_scales={'front':mixer_height/(1218-26),'rear':mixer_height/(1218-20)}
 for axle_index,((side_px,side_py),z) in enumerate(zip(axle_rows,axle_z)):
  end_key='front' if axle_index==0 else 'rear'
  end_photo=mixer_body_table['_photos'][end_key]
  end_centre=627;end_scale=end_scales[end_key]
  tire_centres=([-track,track] if axle_index==0 else [-.98,-.68,.68,.98])
  for tire_x in tire_centres:
   tire_mesh=PhotoMesh()
   tire_side=-1 if tire_x<0 else 1
   end_cx=end_centre+tire_side*abs(tire_x)/end_scale
   tire_half=.15
   tyre(tire_mesh,'side',side_photo,side_px,side_py,155,wheel_radius,tire_half,
        'rubber',end_photo,end_cx,tire_half/end_scale*.9,
        1218-wheel_radius/end_scale,
        1218-wheel_radius*.08/end_scale,sides=32)
   wheel=tire_mesh.finish(f'mixer-truck:wheel-{axle_index+1}-{"left" if tire_side<0 else "right"}',
       {'side':side_photo.material(),'rubber':rubber})
   wheel.name=f'mixer-truck:wheel-{axle_index+1}-{"left" if tire_side<0 else "right"}'+('-inner' if abs(tire_x)<.8 else '-outer' if axle_index>0 else '')
   mixer_attach(wheel,mixer,(tire_x,wheel_radius,z))
   mixer_piece_roots.append((wheel.name,wheel))
   print('MIXER WHEEL BOUNDS',axle_index+1,tire_x,round(tire_x-tire_half,3),round(tire_x+tire_half,3),0,round(2*wheel_radius,3),round(z,3))

 # Pedestals, support rollers, ladder and fenders remain in the truck carve.

 # A latched return chute pivots just below the drum mouth. Positive X rotation
 # lowers its rear end into the work position used by the review render.
 chute_origin=(0,1.68,3.38)
 chute=empty('mixer-truck:chute',game_vector(chute_origin),mixer)
 mixer_piece_roots.append(('mixer-truck:chute',chute))
 def chute_point(point):return tuple(chute_origin[i]+point[i] for i in range(3))
 mixer_game_box('mixer chute trough',chute_point((0,-.12,.72)),(.54,.12,1.55),mixer_steel,chute,.045)
 for sx in (-1,1):
  mixer_game_beam('mixer chute folded side wall',chute_point((sx*.29,-.02,.10)),chute_point((sx*.29,-.02,1.52)),.045,mixer_yellow,chute)
 mixer_game_beam('mixer chute hinge shaft',chute_point((-.48,0,0)),chute_point((.48,0,0)),.075,black,mixer)
 mixer_game_beam('mixer chute outer lip',chute_point((-.30,-.12,1.50)),chute_point((.30,-.12,1.50)),.05,mixer_steel,chute)
 # Bounds are reported in game coordinates. Wheels must meet the floor; the
 # other fitted parts must meet the body envelope and remain in the 2x2-cell lot.
 def mixer_bounds(piece):
  nodes=[piece]+list(piece.children_recursive);points=[];graph=bpy.context.evaluated_depsgraph_get()
  for node in nodes:
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(graph);mesh=evaluated.to_mesh()
   points.extend((node.matrix_world@vertex.co)[:] for vertex in mesh.vertices)
   evaluated.to_mesh_clear()
  if not points:return None
  game=[(point[0],point[2],-point[1]) for point in points]
  return tuple(min(p[i] for p in game) for i in range(3)),tuple(max(p[i] for p in game) for i in range(3))
 body_bounds=mixer_bounds(mixer_body)
 def bounds_touch(a,b,epsilon=.04):
  return all(a[0][axis] <= b[1][axis]+epsilon and b[0][axis] <= a[1][axis]+epsilon for axis in range(3))
 measured_bounds={label:mixer_bounds(piece) for label,piece in mixer_piece_roots}
 for label,piece in mixer_piece_roots:
  bounds=measured_bounds[label]
  if bounds is None:raise RuntimeError(f'{label} has no mesh')
  lo,hi=bounds
  print('MIXER PIECE BOUNDS',label,'min',tuple(round(v,3) for v in lo),'max',tuple(round(v,3) for v in hi))
  if any(abs(lo[i])>7.5 or abs(hi[i])>7.5 for i in (0,2)):
   raise RuntimeError(f'{label} extends outside the mixer truck 2x2-cell footprint')
  if label.startswith('mixer-truck:wheel-') and (abs(lo[1])>.035 or abs(hi[1]-2*wheel_radius)>.08):
   raise RuntimeError(f'{label} does not touch the ground at its measured radius')
  if label.startswith('mixer-truck:wheel-') and abs(lo[1])<=.035:
   print('MIXER PIECE CONTACT',label,'ground')
  else:
   neighbours=[]
   for other,other_bounds in measured_bounds.items():
    if other!=label and bounds_touch(bounds,other_bounds):neighbours.append(other)
   if not neighbours:raise RuntimeError(f'{label} does not touch the ground or another mixer piece')
   print('MIXER PIECE CONTACT',label,', '.join(neighbours[:4]))
 # Roller: photo-carved engine and frame, with the open station and moving drum built separately.
 roller=empty('roller',(0,0,0),root)
 from photo_model import Photo as RollerPhoto
 from hull_model import tyre as photo_tyre
 from photo_carve import carve_object
 roller_textures=project_root/'public/assets/models/wasteland/town/textures'
 # Round 22 uses new bare-body views. The drum, yoke and canopy remain
 # separately built pieces, outside the body carve.
 roller_target_length,roller_width,roller_height=4.5,2.0,2.2
 roller_tyre_radius=1.3/2
 roller_rear_tyre_px=492-368
 roller_rear_scale=roller_tyre_radius/roller_rear_tyre_px
 roller_side_scale=roller_rear_scale
 # The photo's tyre-based width and the bare body's measured length disagree
 # in perspective; keep tyre scale for height and set the body length explicitly.
 roller_length=5.1
 roller_drum_z=(128-30)*roller_side_scale-roller_length/2
 roller_rear_axle_z=((453-46)/(588-46))*roller_length-roller_length/2
 print('ROLLER MEASURED TARGET m body 4.50 x 2.00 x 1.90; canopy-height 2.90; rear-tyre diameter 1.30; drum diameter 1.50 width 1.80')
 print('ROLLER PHOTO SCALE from rear tyre',roller_rear_tyre_px,'px radius ->',round(roller_rear_scale,6),'m/px; side silhouette length',round(roller_length,3),'m vs target',roller_target_length,'m; side tyre diameter',round(2*roller_side_scale*112,3),'m')
 roller_table={
  'photos':{'side':'roller-side.jpg','front':'roller-front.jpg','rear':'roller-rear.jpg','top':'roller-top.jpg'},
  'length':roller_length,'width':roller_width,'height':roller_height,
  # Grid measurements from the new bare-body side photo: the body spans x=46..588;
  # the rear tyre centre is x=453. The carve's own 5.1 m length sets the axle.
  'side':{'start':46,'end':588,'ground':492},
  'front':{'centre':310,'ground':523,'top':80},
  'rear':{'centre':310,'ground':523,'top':80},
  'top':{'front':14,'rear':607,'centre':310,'along':'x','x_scale':roller_width/(500-120)},
  'underside':.55,
  'wheels':[(roller_rear_axle_z,roller_tyre_radius,.70)],
  # Remove the photographed rear tyres so only the separately-built tyres show.
  # The side photo keeps its tyre: the tyre hides the body's rear in that view, and
  # cutting it removed the body behind it, leaving a strip at 2 m (rounds 23 to 25).
  # The front, rear and top photos still cut the tyres, so they add no bulk.
  'cut':{'side':[(0,0,621,54),(0,520,621,621)],
   'front':[(0,0,621,54),(0,520,621,621),(91,250,211,560),(410,250,540,560)],
   'rear':[(0,0,621,54),(0,520,621,621),(110,275,230,560),(399,275,530,560)],
   'top':[(0,0,621,40),(0,580,621,621),(390,35,535,175),(390,450,535,600)]},
  'voxel':.04,'target':5600,'grey':20,'tolerance':34,'bleed_tolerance':32,
  'mask_dir':str(project_root/'.evidence/2026-11-09/TOWN-ART-MACHINES-2/round-25/masks')}
 roller_body=carve_object('roller:body',roller_textures,roller_table)
 for photo in roller_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 parent(roller_body,roller)
 # carve_hull already maps the photo grid from game axes into Blender's Z-up
 # mesh coordinates in voxel_surface. Do not transform the returned vertices again.
 def roller_bounds(obj):
  deps=bpy.context.evaluated_depsgraph_get();pts=[]
  nodes=[obj]
  while nodes:
   node=nodes.pop();nodes.extend(node.children)
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(deps);mesh=evaluated.to_mesh();pts.extend(node.matrix_world@v.co for v in mesh.vertices);evaluated.to_mesh_clear()
  if not pts:return None
  game=[(p.x,p.z,-p.y) for p in pts]
  return tuple(min(p[i] for p in game) for i in range(3)),tuple(max(p[i] for p in game) for i in range(3))
 roller_body_bounds=roller_bounds(roller_body)
 print('ROLLER CARVED BODY BOUNDS m min',tuple(round(v,3) for v in roller_body_bounds[0]),'max',tuple(round(v,3) for v in roller_body_bounds[1]))
 body_extents=tuple(roller_body_bounds[1][i]-roller_body_bounds[0][i] for i in range(3))
 print('ROLLER CARVED BODY EXTENTS m length',round(body_extents[2],3),'width',round(body_extents[0],3),'height',round(body_extents[1],3),'against bare-body targets 4.50 x 2.00 x 1.90 m')
 if not (3.8<=body_extents[2]<=5.1 and 1.55<=body_extents[0]<=2.4 and 1.5<=body_extents[1]<=2.2):
  raise RuntimeError(f'roller body is outside printed bounds: {body_extents}')
 axle_z=roller_rear_axle_z
 print('ROLLER BODY/AXLE CHECK: rear axle z',round(axle_z,3),'body bounds',tuple(round(v,3) for v in roller_body_bounds[0]),tuple(round(v,3) for v in roller_body_bounds[1]))
 if not (roller_body_bounds[0][2] < axle_z < roller_body_bounds[1][2] and roller_body_bounds[0][1] <= roller_tyre_radius+.45):
  raise RuntimeError('roller body does not sit on the rear axle')
 def roller_box(name,center,size,material,bevel=.04):
  return box(name,game_vector(center),(size[0],size[2],size[1]),material,roller,bevel)
 def roller_beam(name,start,end,radius,material):
  return beam(name,game_vector(start),game_vector(end),radius,material,roller)
 # The canopy is a flat roof on four posts, photo-mapped from the worn yellow
 # roof and uprights. No old olive-green canopy meshes are retained.
 roller_photo=roller_table['_photos']['side']
 roller_photo_mat=roller_photo.material()
 def map_box_to_photo(obj,rect,size_x,size_z):
  x0,y0,x1,y1=rect
  uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
  for poly in obj.data.polygons:
   for li in poly.loop_indices:
    co=obj.data.vertices[obj.data.loops[li].vertex_index].co
    uv.data[li].uv=(x0/roller_photo.w+(co.x/size_x+.5)*(x1-x0)/roller_photo.w,
                    1-(y0/roller_photo.h+(co.z/size_z+.5)*(y1-y0)/roller_photo.h))
 for x in (-.69,.69):
  for z in (-.44,.52):
   post=roller_box('roller canopy post',(x,2.33,z),(.12,.90,.12),roller_photo_mat,.018)
   map_box_to_photo(post,(308 if x<0 else 418,96,330 if x<0 else 440,252),.12,.12)
 roller_roof=roller_box('roller flat canopy roof',(0,2.84,.04),(1.72,.13,.98),roller_photo_mat,.045)
 map_box_to_photo(roller_roof,(190,52,470,98),1.72,.98)
 roller_box('roller seat pan',(0,1.15,.02),(.52,.16,.48),black,.045)
 roller_box('roller seat back',(0,1.43,.26),(.52,.56,.15),black,.045)
 roller_beam('roller steering column',(0,1.65,-.35),(0,2.24,-.35),.035,steel)
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=.22,minor_radius=.025,location=game_vector((0,2.26,-.35)),rotation=(0,math.pi/2,0));wheel=bpy.context.object;wheel.name='roller steering wheel';wheel.data.materials.append(black);parent(wheel,roller)
 # Drum photo is wrapped around one closed, wide steel cylinder on its axle origin.
 drum_photo=RollerPhoto(roller_textures/'roller-drum-side.jpg')
 drum_center=game_vector((0,.75,roller_drum_z));drum_mat=drum_photo.material();drum=empty('roller:drum',drum_center,roller)
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.75,depth=1.80,location=drum_center,rotation=(0,math.pi/2,0))
 o=bpy.context.object;o.name='roller photo-wrapped steel drum';o.data.materials.append(drum_mat);o.data.uv_layers.active.name='UVMap';parent(o,drum)
 # Crosswise cylinder axle is the joint origin; work turns around it.
 for side in (-1,1):
  roller_beam('roller drum yoke',(side*.91,1.62,roller_drum_z+.48),(side*.91,.75,roller_drum_z),.13,roller_photo_mat)
 roller_side=roller_table['_photos']['side'];roller_ends=roller_table['_photos']['rear']
 roller_end_scale=roller_height/(535-50)
 for side in (-1,1):
  tire_mesh=PhotoMesh()
  photo_tyre(tire_mesh,'side',roller_side,453,412,140,roller_tyre_radius,.20,'rubber',roller_ends,
             198 if side<0 else 425,.20/roller_end_scale*.90,
             535-roller_tyre_radius/roller_end_scale,535-roller_tyre_radius*.08/roller_end_scale,sides=32)
  tire=tire_mesh.finish('roller rear tyre',{'side':roller_side.material(),'rubber':rubber})
  tire.name='roller rear tyre '+('left' if side<0 else 'right');parent(tire,roller)
  # Map the measured side-photo rear-tyre centre through the carve's own
  # start, end and length so the built tyres share the photographed axle.
  tire.location=game_vector((side*.78,roller_tyre_radius,roller_rear_axle_z))
  # The photographed wheel is elliptical in the generated side view. Keep its
  # hub at the measured centre, but use a dark rubber face and a compact photo
  # hub so the background and yellow body cannot fill the whole tyre face.
  tire_center=tire.location.copy()
  for face_side in (-1,1):
   face_x=tire_center.x+face_side*(.20+.008)
   verts=[(face_x,tire_center.y,tire_center.z)]
   for i in range(48):
    angle=math.tau*i/48
    verts.append((face_x,tire_center.y+math.cos(angle)*roller_tyre_radius*.96,
                  tire_center.z+math.sin(angle)*roller_tyre_radius*.96))
   faces=[(0,i+1,((i+1)%48)+1) for i in range(48)]
   mesh=bpy.data.meshes.new('roller dark rubber sidewall mesh');mesh.from_pydata(verts,[],faces);mesh.update()
   face_obj=bpy.data.objects.new('roller dark rubber tyre face',mesh);bpy.context.collection.objects.link(face_obj)
   face_obj.data.materials.append(rubber);face_obj.data.uv_layers.new(name='UVMap');parent(face_obj,roller)
   hub_verts=[(face_x+face_side*.004,tire_center.y,tire_center.z)]
   hub_radius=roller_tyre_radius*.56
   for i in range(48):
    angle=math.tau*i/48
    hub_verts.append((face_x+face_side*.004,tire_center.y+math.cos(angle)*hub_radius,
                      tire_center.z+math.sin(angle)*hub_radius))
   hub_mesh=bpy.data.meshes.new('roller photo hub mesh');hub_mesh.from_pydata(hub_verts,[],faces);hub_mesh.update()
   hub_obj=bpy.data.objects.new('roller side photo hub',hub_mesh);bpy.context.collection.objects.link(hub_obj)
   hub_obj.data.materials.append(roller_side.material());hub_uv=hub_obj.data.uv_layers.new(name='UVMap')
   hub_center_x,hub_center_y,hub_source_radius=453,412,80
   for poly in hub_mesh.polygons:
    for li in poly.loop_indices:
     vi=hub_mesh.loops[li].vertex_index
     if vi==0:uv_x,uv_y=hub_center_x,hub_center_y
     else:
      angle=math.tau*(vi-1)/48
      uv_x=hub_center_x+math.cos(angle)*hub_source_radius
      uv_y=hub_center_y-math.sin(angle)*hub_source_radius
     hub_uv.data[li].uv=roller_side.uv(uv_x,uv_y)
   parent(hub_obj,roller)
 roller_parts=[('carved body',roller_body),('drum',drum)]
 for label,obj in roller_parts:
  b=roller_bounds(obj);print('ROLLER PIECE BOUNDS',label,'min',tuple(round(v,3) for v in b[0]),'max',tuple(round(v,3) for v in b[1]))
 for obj in sorted((child for child in roller.children_recursive if child.type=='MESH'),key=lambda piece:piece.name):
  b=roller_bounds(obj)
  if b:print('ROLLER PIECE BOUNDS BEFORE JOIN',obj.name,'min',tuple(round(v,3) for v in b[0]),'max',tuple(round(v,3) for v in b[1]))
 # Paver round 31: carve only the machine above the track tops; the detached
 # screed stays outside these four photos and moves on its tow-pin origin.
 from photo_model import Photo as PaverPhoto
 from photo_carve import carve_object
 paver=empty('paver',(0,0,0),root)
 paver_textures=project_root/'public/assets/models/wasteland/town/textures'
 paver_length,paver_width,paver_height=8.0,4.8,3.8
 paver_table={
  'photos':{'side':'paver-side.jpg','front':'paver-front.jpg','rear':'paver-rear.jpg','top':'paver-top.jpg'},
  'length':paver_length,'width':paver_width,'height':paver_height,
  # Pixel grid is measured on the source JPEGs (1400 px wide). The side photo
  # sets length and ground; each end states its own roof row as required.
  'side':{'start':28,'end':1372,'ground':665},
  'front':{'centre':700,'ground':913,'top':18},
  'rear':{'centre':700,'ground':913,'top':18},
  # forward=-1 means the top photo's front row comes before its rear row.
  'top':{'front':34,'rear':1310,'centre':600},
  'underside':1.43,
  # Tracks hide the lower body in side view, so that view is never cut there.
  # End and plan views see the tracks outside the body; remove those copies.
  'cut':{'front':[(0,0,1400,110),(0,660,365,933),(1035,660,1400,933)],
         'rear':[(0,0,1400,105),(0,670,360,933),(1040,670,1400,933)],
         'top':[(0,0,1400,34),(0,1310,1400,1400),(0,285,220,1040),(980,280,1400,1050)]},
  'voxel':.045,'target':7200,'grey':24,'tolerance':38,'bleed_tolerance':36,
  'mask_dir':str(project_root/'.qa-dist/town-machines-2/round-31/masks')}
 paver_body=carve_object('paver:body',paver_textures,paver_table);parent(paver_body,paver)
 for photo in paver_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 paver_side=paver_table['_photos']['side'];paver_front=paver_table['_photos']['front']
 # Two closed rounded belts are cut from the photographed side-track region.
 # Each ring is a true capsule loop with an open centre for the rollers.
 def paver_track(side):
  center_x=side*1.62;track_length=5.72;center_z=.715;outer_r=.715;inner_r=.47
  straight=track_length/2-outer_r
  def capsule(radius):
   points=[]
   for i in range(25):
    angle=-math.pi/2+math.pi*i/24
    points.append((straight+radius*math.cos(angle),center_z+radius*math.sin(angle)))
   for i in range(25):
    angle=math.pi/2+math.pi*i/24
    points.append((-straight+radius*math.cos(angle),center_z+radius*math.sin(angle)))
   return points
  outer=capsule(outer_r);inner=capsule(inner_r);verts=[];faces=[];uvs=[]
  px0,px1,py0,py1=280,1235,418,650
  for x in (center_x-.39,center_x+.39):
   for y,z in outer+inner:
    verts.append((x,y,z));px=px1-(y+track_length/2)/track_length*(px1-px0);py=py1-(z/1.45)*(py1-py0);uvs.append(paver_side.uv(px,py))
  count=len(outer)
  for i in range(count):
   k=(i+1)%count
   faces.extend(((i,k,count+k,count+i),(2*count+i,3*count+i,3*count+k,2*count+k),
                 (i,2*count+i,2*count+k,k),(count+i,count+k,3*count+k,3*count+i)))
  mesh=bpy.data.meshes.new('paver rounded crawler belt mesh');mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new('paver rounded photo-worn crawler belt '+('left' if side<0 else 'right'),mesh);bpy.context.collection.objects.link(obj)
  obj.data.materials.append(paver_side.material());obj.data.materials.append(rubber);uv=mesh.uv_layers.new(name='UVMap')
  # The visible side wears the actual tread photo; edge faces use dark rubber.
  for poly in mesh.polygons:
   poly.material_index=0 if poly.index%4 in (0,1) else 1
   for li in poly.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
  parent(obj,paver);return obj
 paver_tracks=[paver_track(side) for side in (-1,1)]
 # Seven steel rollers and one larger sprocket/idler show through each belt.
 for side in (-1,1):
  for index,track_y in enumerate((-2.14,-1.43,-.72,0,.72,1.43,2.14)):
   radius=.43 if abs(track_y)>2 else .31
   bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=.64,location=(side*1.62,track_y,.70),rotation=(0,math.pi/2,0))
   roller=bpy.context.object;roller.name=f'paver crawler roller {side} {index}';roller.data.materials.append(black);roller.data.uv_layers.active.name='UVMap';parent(roller,paver)
   bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=radius*.73,minor_radius=.035,location=(side*1.62+side*.34,track_y,.70),rotation=(0,math.pi/2,0))
   rim=bpy.context.object;rim.name=f'paver crawler roller rim {side} {index}';rim.data.materials.append(tin);rim.data.uv_layers.active.name='UVMap';parent(rim,paver)
  # Raised tread cleats cross each straight run and wrap around the end rollers.
  for index in range(19):
   track_y=-2.15+index*4.30/18
   for z in (.035,1.385):
    box('paver crawler tread shoe',(side*1.62,track_y,z),(.80,.17,.075),steel,paver,.025)
  for sign in (-1,1):
   for index in range(8):
    angle=math.pi*index/7;track_y=sign*(2.15+.66*math.cos(angle));z=.715+.66*math.sin(angle)
    shoe=box('paver crawler curved tread shoe',(side*1.62,track_y,z),(.80,.16,.075),steel,paver,.022)
 # Tow pin axis is the paver:screed origin. Plate and fittings are built once;
 # local offsets put the broad strike plate on the ground at rest.
 screed=empty('paver:screed',(0,-3.98,1.62),paver)
 screed_photo=PaverPhoto(paver_textures/'paver-screed-rear.jpg')
 screed_mat=screed_photo.material();screed_bsdf=screed_mat.node_tree.nodes['Principled BSDF'];screed_bsdf.inputs['Metallic'].default_value=.12
 def paver_screed_box(name,center,size,material=steel,bevel=.025):
  obj=box(name,center,size,material,None,bevel)
  if material==screed_mat:
   uv=obj.data.uv_layers.active
   for poly in obj.data.polygons:
    for li in poly.loop_indices:
     co=obj.data.vertices[obj.data.loops[li].vertex_index].co
     uv.data[li].uv=(.02+(co.x/size[0]+.5)*.96,.16+(co.z/size[2]+.5)*.40)
  parent(obj,screed);return obj
 paver_screed_box('paver wide photo-faced screed plate',(0,-4.45,.38),(5.55,.22,.72),screed_mat,.035)
 paver_screed_box('paver screed lower strike edge',(0,-4.43,.045),(5.48,.28,.12),black,.018)
 paver_screed_box('paver screed upper yellow beam',(0,-4.39,.82),(5.38,.30,.18),paint,.025)
 def paver_link(name,start,end,width,material,owner):
  delta=Vector(end)-Vector(start);mid=(Vector(end)+Vector(start))/2
  bpy.ops.mesh.primitive_cube_add(size=1,location=mid);obj=bpy.context.object;obj.name=name
  obj.dimensions=(width,width,delta.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  obj.rotation_euler=delta.to_track_quat('Z','X').to_euler();obj.data.materials.append(material)
  obj.data.uv_layers.active.name='UVMap';parent(obj,owner);return obj
 for side in (-1,1):
  paver_screed_box('paver screed end plate',(side*2.70,-4.43,.43),(.18,.34,.78),screed_mat,.02)
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.12,depth=.28,location=(side*1.34,-3.98,1.62),rotation=(0,math.pi/2,0))
  pin=bpy.context.object;pin.name='paver screed tow pin';pin.data.materials.append(tin);pin.data.uv_layers.active.name='UVMap';parent(pin,screed)
  paver_link('paver screed angled tow link',(side*1.34,-3.98,1.62),(side*2.35,-4.28,.79),.13,steel,screed)
 # Export-space bounds are checked before the family join. The screed must be
 # at the rear (Blender -Y) and its plate must touch the floor at rest.
 bpy.context.view_layer.update()
 def paver_piece_bounds(obj):
  nodes=[obj]+list(obj.children_recursive);points=[];deps=bpy.context.evaluated_depsgraph_get()
  for node in nodes:
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(deps);mesh=evaluated.to_mesh();points.extend(node.matrix_world@v.co for v in mesh.vertices);evaluated.to_mesh_clear()
  if not points:return None
  return tuple(min(v[i] for v in points) for i in range(3)),tuple(max(v[i] for v in points) for i in range(3))
 paver_body_bounds=paver_piece_bounds(paver_body);print('PAVER BODY BOUNDS BLENDER m',paver_body_bounds)
 paver_screed_bounds=paver_piece_bounds(screed);print('PAVER SCREED EXPORTED BOUNDS BLENDER m',paver_screed_bounds)
 if not paver_screed_bounds or paver_screed_bounds[1][1]>=paver_body_bounds[0][1]:
  raise RuntimeError('paver:screed must be behind the body at Blender -Y')
 if paver_screed_bounds[0][2]>.06:raise RuntimeError('paver:screed must rest on the ground')
 paver_meshes=sorted((obj for obj in paver.children_recursive if obj.type=='MESH'),key=lambda obj:obj.name)
 paver_bounds={obj.name:paver_piece_bounds(obj) for obj in paver_meshes}
 for label,bounds in paver_bounds.items():
  if not bounds:raise RuntimeError(f'paver piece {label} has no exported mesh')
  print('PAVER PIECE BOUNDS BEFORE JOIN',label,'min',tuple(round(v,3) for v in bounds[0]),'max',tuple(round(v,3) for v in bounds[1]))
 for label,bounds in paver_bounds.items():
  if bounds[0][2]<=.035:
   print('PAVER PIECE CONTACT',label,'ground')
   continue
  neighbours=[other for other,other_bounds in paver_bounds.items() if other!=label and all(bounds[0][i]<=other_bounds[1][i]+.04 and other_bounds[0][i]<=bounds[1][i]+.04 for i in range(3))]
  if not neighbours:raise RuntimeError(f'paver piece {label} touches neither the ground nor another piece')
  print('PAVER PIECE CONTACT',label,', '.join(neighbours[:3]))
 # Drill rig: one photo-carved truck, six measured tyres, and a traced open
 # lattice mast whose hinge origin is the rear cradle pin.
 drill=empty('drill-rig',(0,0,0),root)
 from photo_model import Photo as DrillPhoto, Mesh as DrillMesh, trace as drill_trace, slab as drill_slab
 from photo_carve import carve_object
 from hull_model import tyre as drill_tyre
 drill_textures=project_root/'public/assets/models/wasteland/town/textures'
 drill_side=DrillPhoto(drill_textures/'drill-rig-side.jpg');drill_front=DrillPhoto(drill_textures/'drill-rig-front.jpg')
 drill_rear=DrillPhoto(drill_textures/'drill-rig-rear.jpg');drill_top=DrillPhoto(drill_textures/'drill-rig-top.jpg')
 drill_length,drill_width,drill_height=7.2,2.70,2.95
 drill_scale=drill_length/(912-26);drill_radius=67*drill_scale
 drill_axles=[-drill_length/2+(px-26)*drill_scale for px in (181,620,761)]
 drill_table={'photos':{'side':'drill-rig-side.jpg','front':'drill-rig-front.jpg','rear':'drill-rig-rear.jpg','top':'drill-rig-top.jpg'},
  'length':drill_length,'width':drill_width,'height':drill_height,
  'side':{'start':26,'end':912,'ground':397},'front':{'centre':367,'ground':400,'top':54},
  'rear':{'centre':344,'ground':402,'top':49},
  'top':{'front':82,'rear':895,'centre':235,'along':'x','x_scale':.0090},
  'ends_split':-drill_length/2+(289-26)*drill_scale,
  'underside':.38,'wheels':[(z,drill_radius,.78) for z in drill_axles],
  'cut':{'front':[(0,0,734,46),(0,398,734,470),(0,210,110,395),(621,210,734,395)],
   'rear':[(0,0,689,45),(0,405,689,470),(78,220,224,405),(453,220,604,405)],
   'top':[(0,0,982,36),(0,431,982,470),(0,120,175,360),(803,120,982,360)]},
  'voxel':.045,'target':5500,'grey':24,'tolerance':38,'bleed_tolerance':30,
  'mask_dir':str(project_root/'.evidence/2026-11-09/TOWN-ART-MACHINES-2/round-32/masks')}
 drill_body=carve_object('drill-rig:body',drill_textures,drill_table)
 for photo in drill_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 parent(drill_body,drill)
 # Frame rails and outriggers meet the body and ground. The photos show a
 # three-axle road truck, not the previous crawler base.
 def drill_box(label,center,size,material=steel,bevel=.035):return box(label,game_vector(center),(size[0],size[2],size[1]),material,drill,bevel)
 def drill_beam(label,start,end,radius,material=steel):return beam(label,game_vector(start),game_vector(end),radius,material,drill)
 for side in (-1,1):
  drill_box('drill-rig frame rail',(side*.53,.72,0),(.18,.34,5.9),black,.025)
  for axle_index,zpos in enumerate(drill_axles):
   drill_beam(f'drill-rig axle {axle_index+1}',(side*.35,.64,zpos),(side*.98,.64,zpos),.10,steel)
  # Four yellow stabilizer beams, chrome hydraulic rams, and broad pads.
  for zpos in (-2.65,2.10):
   drill_box('drill-rig yellow outrigger',(side*1.24,.92,zpos),(1.55,.20,.22),paint,.025)
   drill_beam('drill-rig silver stabilizer ram',(side*1.84,.82,zpos),(side*1.84,.12,zpos),.075,tin)
   drill_box('drill-rig outrigger foot',(side*1.84,.07,zpos),(.48,.10,.48),steel,.025)
 drill_rubber=bpy.data.materials.new('Drill rig / black rubber');drill_rubber.diffuse_color=(.025,.027,.026,1);drill_rubber.use_nodes=True
 drill_rubber.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.025,.027,.026,1);drill_rubber.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.94
 drill_axle_rows=((181,312,112,564),(620,312,170,455),(761,312,190,493))
 for axle_index,(zpos,(side_px,side_py,front_x,rear_x)) in enumerate(zip(drill_axles,drill_axle_rows)):
  end_photo=drill_front if axle_index==0 else drill_rear;end_meta=drill_table['front' if axle_index==0 else 'rear']
  end_scale=drill_height/(end_meta['ground']-end_meta['top']);half_width=.19 if axle_index==0 else .16
  for side_sign in (-1,1):
   tire_mesh=DrillMesh();end_cx=front_x if side_sign<0 else end_photo.w-front_x
   drill_tyre(tire_mesh,'side',drill_side,side_px,side_py,67,drill_radius,half_width,'rubber',end_photo,
    end_cx,half_width/end_scale*.92,end_meta['ground']-drill_radius/end_scale,end_meta['ground']-drill_radius*.08/end_scale,sides=32)
   wheel=tire_mesh.finish('drill-rig photo-width black rubber tyre',{'side':drill_side.material(),'rubber':drill_rubber})
   wheel.name=f'drill-rig:wheel-{axle_index+1}-'+('left' if side_sign<0 else 'right');parent(wheel,drill)
   wheel.location=game_vector((side_sign*.94,drill_radius,zpos))
 for side in (-1,1):drill_beam('drill-rig mast pivot pin',(side*.58,1.08,2.57),(side*.58,1.08,2.84),.13,tin)
 mast=empty('drill-rig:mast',(0,-2.70,1.08),drill)
 mast_photo=DrillPhoto(drill_textures/'drill-rig-mast.jpg');rgb=mast_photo.rgb()
 mast_mask=(rgb[:,:,0]>rgb[:,:,1]*1.12)&(rgb[:,:,0]>95)&(rgb[:,:,0]>rgb[:,:,2]*1.08)
 mast_loops=drill_trace(mast_mask,(8,12,mast_photo.w-8,mast_photo.h-12),tolerance=2.2,min_area=55)
 print('DRILL MAST TRACE',mast_photo.w,mast_photo.h,'loops',len(mast_loops),'extents',[(round(min(p[0] for p in loop)),round(min(p[1] for p in loop)),round(max(p[0] for p in loop)),round(max(p[1] for p in loop))) for loop in mast_loops[:12]])
 mast_mesh=DrillMesh();mast_pin_px,mast_pin_py=mast_photo.w-54,355;mast_scale=5.70/(mast_pin_px-35)
 # Mesh.finish converts game (x, up, forward) to Blender (x, -forward, up).
 def mast_world(px,py,depth):return (depth,(mast_pin_py-py)*mast_scale,-(mast_pin_px-px)*mast_scale)
 for loop in mast_loops:
  # Traced photo silhouettes keep the lattice gaps between the welded rails open.
  if abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]+loop[:1])))/2<100:continue
  drill_slab(mast_mesh,'mast',mast_photo,[loop],mast_world,-.12,.12)
 mast_obj=mast_mesh.finish('drill-rig:mast:photo-traced-lattice',{'mast':mast_photo.material()});mast_obj.location=mast.location.copy();parent(mast_obj,mast)
 # Mast head sits 5.7 m toward the cab at rest; the steel drill pipe is a
 # separate sliding joint whose lower end travels below the ground in work.
 string=empty('drill-rig:string',(0,3.0,1.26),mast);string.rotation_euler[0]=math.pi
 string_mesh=DrillMesh()
 from photo_model import lathe as drill_lathe
 drill_lathe(string_mesh,'steel', (0,0,0),(0,0,1),(1,0,0),(0,1,0),[(0,.105),(7.0,.105)],
  lambda i,d,r,a:(drill_front.uv(367+math.cos(a)*22,220+math.sin(a)*22)),sides=16,cap_start=('steel',lambda a,f:drill_front.uv(367,220)),cap_end=('steel',lambda a,f:drill_front.uv(367,220)))
 string_obj=string_mesh.finish('drill-rig:string:steel-feed-pipe',{'steel':m['galvanised-tin']});string_obj.location=string.matrix_world.translation.copy();parent(string_obj,string)
 def drill_piece_bounds(piece):
  points=[];deps=bpy.context.evaluated_depsgraph_get()
  for node in [piece]+list(piece.children_recursive):
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(deps);mesh=evaluated.to_mesh();points.extend(node.matrix_world@v.co for v in mesh.vertices);evaluated.to_mesh_clear()
  if not points:return None
  return (tuple(round(min(v[i] for v in points),3) for i in range(3)),tuple(round(max(v[i] for v in points),3) for i in range(3)))
 drill_parts=[drill_body]+[o for o in drill.children if o.type=='MESH']+[mast,string]
 body_bounds=drill_piece_bounds(drill_body);body_vertices=[drill_body.matrix_world@v.co for v in drill_body.data.vertices]
 cab_vertices=[v for v in body_vertices if v.y>=max(p.y for p in body_vertices)-1.8]
 cab_bounds=(tuple(round(min(v[i] for v in cab_vertices),3) for i in range(3)),tuple(round(max(v[i] for v in cab_vertices),3) for i in range(3)))
 for label,bounds in [('body',body_bounds),('cab end',cab_bounds),('mast',drill_piece_bounds(mast_obj)),('string',drill_piece_bounds(string))]:
  print('DRILL EXPORTED BOUNDS',label,bounds)
  if label=='cab end' and bounds[0][1]<=0:raise RuntimeError('drill rig cab end must face Blender +Y')
 print('DRILL MAST PIVOT BLENDER',tuple(round(v,3) for v in mast.matrix_world.translation))
 if mast.matrix_world.translation.y>=0:raise RuntimeError('drill mast pivot must be at the rear (-Y)')
 for piece in [o for o in drill.children_recursive if o.type=='MESH']:
  bounds=drill_piece_bounds(piece);print('DRILL PIECE BOUNDS BEFORE JOIN',piece.name,bounds)
  if bounds[0][2]<=.035:continue
  others=[q for q in [o for o in drill.children_recursive if o.type=='MESH' and o!=piece] if all(bounds[0][i]<=drill_piece_bounds(q)[1][i]+.05 and drill_piece_bounds(q)[0][i]<=bounds[1][i]+.05 for i in range(3))]
  if not others:raise RuntimeError(f'{piece.name} touches neither ground nor another piece')
 # Crane truck: the body is carved with the boom and stabilizers absent;
 # chassis, wheels, outriggers, turntable, boom and hook are separate pieces.
 from photo_model import Photo, Mesh as PhotoMesh, trace, slab, lathe
 from photo_carve import carve_object
 from hull_model import tyre
 crane=empty('crane-truck',(0,0,0),root)
 crane_textures=project_root/'public/assets/models/wasteland/town/textures'
 crane_length,crane_width,crane_height=8.4,2.70,3.55
 crane_side=Photo(crane_textures/'crane-truck-side.jpg')
 crane_front=Photo(crane_textures/'crane-truck-front.jpg')
 crane_rear=Photo(crane_textures/'crane-truck-rear.jpg')
 crane_top=Photo(crane_textures/'crane-truck-overhead.jpg')
 crane_boom_photo=Photo(crane_textures/'crane-truck-boom.jpg')
 # All measured from the four-photo contact sheet after confirming its matching landmarks.
 crane_side_rows=[(151,316),(581,316),(715,316)]
 crane_scale=crane_length/(866-18)
 crane_radius=65*crane_scale
 crane_axle_z=[-crane_length/2+(x-18)*crane_scale for x,_ in crane_side_rows]
 crane_track=1.08
 crane_wheels=[(z,crane_radius,.78) for z in crane_axle_z]
 def keep_crane_body(x,y,z):
  # The body carve stops at the lower frame rails; clear the full slew deck
  # footprint so no photo-carved island floats above the built turntable.
  ring=(x*x+(z-1.58)**2<1.08**2)&(y>.35)&(y<3.18)
  floating_block=(abs(x)<.46)&(y>3.68)&(z>1.62)&(z<2.70)
  # Side and roof projections leave high slabs behind the cab; let the rear
  # photo shape the deck and keep its carve below the rail tops.
  rear_slabs=(z>1.10)&(y>1.90)
  return (y>=1.02)&~ring&~floating_block&~rear_slabs
 crane_body_table={
  'photos':{'side':'crane-truck-side.jpg','front':'crane-truck-front.jpg',
            'rear':'crane-truck-rear.jpg','top':'crane-truck-overhead.jpg'},
  'length':crane_length,'width':crane_width,'height':crane_height,
  'side':{'start':18,'end':866,'ground':382},
  'front':{'centre':292,'ground':399,'top':17},
  'rear':{'centre':307,'ground':416,'top':22},
  'top':{'front':22,'rear':806,'centre':237,'along':'x','x_scale':.0088},
  # Split at the cab's back wall: side and top shape the cab, and the rear
  # photo shapes only the open deck behind it.
  'ends_split':-crane_length/2+(320-18)*crane_scale,
  'underside':1.02,'wheels':crane_wheels,'keep':keep_crane_body,
  # Cut the outriggers, exhaust and turntable out so none is doubled by a built part.
  'cut':{
   'side':[(304,0,365,165),(295,294,375,390),(792,292,858,390),(530,138,754,232)],
   'front':[(0,235,142,410),(437,235,583,410),(151,0,207,111)],
   'rear':[(0,0,613,210)],
   'top':[(0,0,827,96),(0,405,827,473)]},
  'voxel':.04,'target':3100,'grey':23,'tolerance':30,'bleed_tolerance':34,
  'mask_dir':str(project_root/'.evidence/2026-11-08/TOWN-ART-MACHINES-2/round-12/masks')}
 crane_body=carve_object('crane-truck:body',crane_textures,crane_body_table)
 split=crane_body_table['ends_split']
 print('CRANE REAR PHOTO SPLIT',round(split,3),'m at cab back wall (side photo x=320 px)')
 print('CRANE BODY PHOTO MAP: cab volume=side/top with front end view; rear deck volume=side/top with rear end view; rear face pixels above y=210 are cut')
 for photo in crane_body_table['_photos'].values():
  for node in photo.material().node_tree.nodes:
   if node.type=='TEX_IMAGE':node.interpolation='Cubic'
 parent(crane_body,crane)
 crane_parts=[('crane-truck:body',crane_body)]
 crane_yellow=bpy.data.materials.new('Crane truck / worn safety yellow');crane_yellow.diffuse_color=(.52,.32,.055,1);crane_yellow.use_nodes=True
 crane_yellow_bsdf=crane_yellow.node_tree.nodes['Principled BSDF'];crane_yellow_bsdf.inputs['Base Color'].default_value=(.52,.32,.055,1);crane_yellow_bsdf.inputs['Roughness'].default_value=.84;crane_yellow_bsdf.inputs['Metallic'].default_value=.10
 crane_dark=bpy.data.materials.new('Crane truck / dark rubber');crane_dark.diffuse_color=(.018,.019,.018,1);crane_dark.use_nodes=True
 crane_dark_bsdf=crane_dark.node_tree.nodes['Principled BSDF'];crane_dark_bsdf.inputs['Base Color'].default_value=(.018,.019,.018,1);crane_dark_bsdf.inputs['Roughness'].default_value=.96
 crane_silver=bpy.data.materials.new('Crane truck / worn hydraulic silver');crane_silver.diffuse_color=(.48,.51,.50,1);crane_silver.use_nodes=True
 crane_silver_bsdf=crane_silver.node_tree.nodes['Principled BSDF'];crane_silver_bsdf.inputs['Base Color'].default_value=(.48,.51,.50,1);crane_silver_bsdf.inputs['Metallic'].default_value=.62;crane_silver_bsdf.inputs['Roughness'].default_value=.48
 def crane_box(name,center,size,material=steel,bevel=.04,parent_obj=crane):
  return box(name,game_vector(center),(size[0],size[2],size[1]),material,parent_obj,bevel)
 def crane_beam(name,start,end,radius,material=steel,parent_obj=crane):
  return beam(name,game_vector(start),game_vector(end),radius,material,parent_obj)
 def crane_add_part(name,obj):crane_parts.append((name,obj));return obj
 def crane_photo_box(name,center,size,crop):
  """Build a box beam with every face painted from one worn photo crop."""
  obj=crane_box(name,center,size,crane_yellow,.035)
  photo_material=crane_front.material()
  obj.data.materials.append(photo_material)
  image_index=len(obj.data.materials)-1
  x0,y0,x1,y1=crop
  for polygon in obj.data.polygons:
   polygon.material_index=image_index
   for loop_index in polygon.loop_indices:
    vertex=obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
    if abs(polygon.normal.y)>.9:
     fx=(vertex.x+size[0]/2)/size[0];fy=(vertex.z+size[1]/2)/size[1]
    elif abs(polygon.normal.x)>.9:
     fx=(vertex.y+size[1]/2)/size[1];fy=(vertex.z+size[2]/2)/size[2]
    else:
     fx=(vertex.x+size[0]/2)/size[0];fy=(vertex.y+size[1]/2)/size[1]
    obj.data.uv_layers.active.data[loop_index].uv=crane_front.uv(x0+fx*(x1-x0),y1-fy*(y1-y0))
  return obj
 # Ladder rails, crossmembers, suspension and axles meet the bottom edge of the photo carve.
 frame_y=1.08
 for sx in (-1,1):crane_add_part(f'crane-truck:frame-rail-{sx}',crane_box('crane frame ladder rail',(sx*.77,frame_y,.08),(.18,.17,7.45),steel,.025))
 for i,z in enumerate(crane_axle_z):
  crane_add_part(f'crane-truck:crossmember-{i+1}',crane_beam('crane frame crossmember',(-.79,frame_y,z),(.79,frame_y,z),.09,steel))
  crane_add_part(f'crane-truck:axle-{i+1}',crane_beam('crane heavy axle',(-.86,.70,z),(.86,.70,z),.13,black))
  for sx in (-1,1):
   crane_beam('crane leaf spring',(sx*.75,.90,z-.54),(sx*.75,.90,z+.54),.045,steel)
   crane_beam('crane suspension hanger',(sx*.75,.92,z),(sx*.75,1.12,z),.055,paint)
 # Six side-view tyre stations: the two rear axles use dual tyres on each side.
 for axle_index,((side_px,side_py),z) in enumerate(zip(crane_side_rows,crane_axle_z)):
  end_key='front' if axle_index==0 else 'rear';end_photo=crane_body_table['_photos'][end_key]
  end_meta=crane_body_table[end_key];end_scale=crane_height/(end_meta['ground']-end_meta['top'])
  tire_centres=([-crane_track,crane_track] if axle_index==0 else [-1.18,-.82,.82,1.18])
  half_width=.31 if axle_index==0 else .20
  for tire_x in tire_centres:
   photo_centre=170 if tire_x<0 else 414
   if axle_index>0:photo_centre=(186 if tire_x<0 else 424)+(-1 if abs(tire_x)<1 else 1)*19
   tire_mesh=PhotoMesh();tyre(tire_mesh,'side',crane_side,side_px,side_py,65,crane_radius,half_width,
    'rubber',end_photo,photo_centre,half_width/end_scale*.94,
    end_meta['ground']-crane_radius/end_scale,
    end_meta['ground']-crane_radius*.08/end_scale,sides=32)
   wheel=tire_mesh.finish(f'crane-truck:wheel-{axle_index+1}',{'side':crane_side.material(),'rubber':crane_dark})
   wheel.name=f'crane-truck:wheel-{axle_index+1}-'+('left' if tire_x<0 else 'right')+('-inner' if axle_index>0 and abs(tire_x)<1 else '-outer' if axle_index>0 else '')
   parent(wheel,crane);wheel.location=game_vector((tire_x,crane_radius,z));crane_parts.append((wheel.name,wheel))
 # Fuel tank, hydraulic reservoir and service boxes hang from, or sit on, the rails.
 for label,center,size in [
  ('fuel-tank',(-.52,.91,-.82),(.42,.44,.92)),('hydraulic-tank',(.52,.91,-.72),(.42,.44,.82)),
  ('tool-box-left',(-.99,1.43,-.02),(.32,.60,.90)),('tool-box-right',(.99,1.43,-.02),(.32,.60,.90))]:
  crane_add_part('crane-truck:'+label,crane_box('crane '+label.replace('-',' '),center,size,steel,.07))
 # Box-beam stabilizers telescope from the chassis. Vertical jacks end in broad pads.
 for sx in (-1,1):
  for z in (-.55,2.85):
   crop=(55,260,115,285) if sx<0 else (470,260,525,285)
   stem=crane_photo_box('crane photo-faced outrigger box beam',(sx*1.67,1.08,z),(1.55,.34,.46),crop)
   crane_add_part(f'crane-truck:outrigger-{sx}-{z}',stem)
   telescoping=crane_photo_box('crane painted sliding outrigger box',(sx*2.25,1.08,z),(.62,.28,.36),crop)
   crane_add_part(f'crane-truck:outrigger-slide-{sx}-{z}',telescoping)
   crane_add_part(f'crane-truck:stabilizer-ram-{sx}-{z}',crane_beam('crane silver vertical stabilizer jack',(sx*2.42,.94,z),(sx*2.42,.20,z),.105,crane_silver))
   collar=crane_box('crane silver jack foot collar',(sx*2.42,.15,z),(.30,.18,.30),crane_silver,.025)
   foot=crane_box('crane square silver stabilizer foot plate',(sx*2.42,.07,z),(.56,.14,.56),crane_silver,.035)
   crane_add_part(f'crane-truck:jack-collar-{sx}-{z}',collar)
   crane_add_part(f'crane-truck:outrigger-foot-{sx}-{z}',foot)
 # Photo-faced round slew disc; both circular caps stay inside the photographed
 # tooth ring, with the boom hinge pin seated directly above its centre.
 turret=empty('crane truck turntable',(0,0,0),crane)
 slew_photo=Photo(crane_textures/'crane-truck-overhead.jpg')
 slew_mesh=PhotoMesh();slew_centre=(570,218);slew_r=94
 def slew_side_uv(index,distance,radius,angle):
  u=.43+index*.14;v=.55+angle/math.tau
  return slew_photo.uv(u*slew_photo.w,v*slew_photo.h)
 def slew_cap_uv(angle,fraction):
  px=slew_centre[0]+math.cos(angle)*slew_r*fraction
  py=slew_centre[1]+math.sin(angle)*slew_r*fraction
  return slew_photo.uv(px,py)
 lathe(slew_mesh,'slew-face',(0,1.58,1.58),(0,1,0),(1,0,0),(0,0,1),
       [(0,.94),(.10,1.00),(.22,.94)],slew_side_uv,sides=48,
       cap_start=('slew-face',slew_cap_uv),cap_end=('slew-face',slew_cap_uv))
 slew_obj=slew_mesh.finish('crane photo-faced toothed turntable',{'slew-face':slew_photo.material()})
 parent(slew_obj,turret);crane_add_part('crane-truck:turntable',slew_obj)
 # A circular lower race supports the disc; no square deck overlays its cap.
 support_mesh=PhotoMesh()
 lathe(support_mesh,'slew-face',(0,1.47,1.58),(0,1,0),(1,0,0),(0,0,1),
       [(0,.96),(.14,.96)],slew_side_uv,sides=48)
 support=support_mesh.finish('crane circular slew race',{'slew-face':slew_photo.material()})
 parent(support,turret);crane_add_part('crane-truck:slew-support',support)
 # Twin cheek plates carry one crosswise hinge pin over the photographed disc.
 for sx in (-1,1):
  crane_box('crane painted boom cheek plate',(sx*.39,2.32,1.62),(.22,1.00,.48),crane_yellow,.045,turret)
  crane_beam('crane silver cheek wear edge',(sx*.39,1.82,1.62),(sx*.39,2.82,1.62),.035,crane_silver,turret)
 crane_beam('crane cheek plate pivot pin',(-.48,2.82,1.62),(.48,2.82,1.62),.105,crane_silver,turret)
 # Trace the open lattice from its own side photo. Its local origin is the pivot pin.
 from photo_carve import lift_if_dark
 from photo_carve import lift_if_dark
 lift_if_dark(crane_boom_photo)
 boom_rgb=crane_boom_photo.rgb();boom_h,boom_w=boom_rgb.shape[:2]
 # Each triangular lattice opening is enclosed by welded braces, so the outside
 # flood cannot reach it. Seed the pale grey background patches as well.
 boom_rgb=np.clip(boom_rgb+22,0,255).astype(np.int16);crane_boom_photo._rgb=boom_rgb
 edge_colour=boom_rgb[8,8].astype(np.int16);boom_seeds=[(8,8),(boom_w-9,8),(8,boom_h-9),(boom_w-9,boom_h-9)]
 for sy in range(300,boom_h-230,28):
  for sx in range(160,boom_w-170,42):
   sample=boom_rgb[sy-2:sy+3,sx-2:sx+3].reshape(-1,3).mean(axis=0)
   if sample.mean()>185 and sample.max()-sample.min()<32 and np.abs(sample-edge_colour).max()<48:
    boom_seeds.append((sx,sy))
 boom_sky=crane_boom_photo.sky(boom_seeds,tolerance=54,grey=40)
 from photo_carve import save_mask
 save_mask(~boom_sky,project_root/'.qa-dist/town-machines-2/round-12/boom-trace-mask.png')
 boom_loops=trace(~boom_sky,(0,0,boom_w,boom_h),tolerance=2.2,min_area=65)
 print('CRANE BOOM MASK',int(boom_sky.sum()),'sky pixels of',boom_w*boom_h,'loops',len(boom_loops),'seeds',len(boom_seeds),'edge',boom_rgb[8,8].tolist(),'lattice',boom_rgb[400,600].tolist())
 if len(boom_loops)<8:raise RuntimeError(f'crane boom trace retained only {len(boom_loops)} loops; lattice openings were lost')
 boom_scale=7.85/(boom_w-160);boom_pivot_px=110;boom_pivot_py=410;boom_tip_px=boom_w-102;boom_tip_py=409
 boom=empty('crane-truck:boom',game_vector((0,2.82,1.62)),turret)
 boom_mesh=PhotoMesh()
 def crane_boom_world(px,py,depth):
  # PhotoMesh.finish converts these game-space points into Blender Z-up.
  return (depth,(boom_pivot_py-py)*boom_scale,(px-boom_pivot_px)*boom_scale)
 slab(boom_mesh,'boom',crane_boom_photo,boom_loops,crane_boom_world,-.25,.25,wall_scale=boom_scale)
 boom_obj=boom_mesh.finish('crane-truck:boom:lattice-photo-trace',{'boom':crane_boom_photo.material()})
 bpy.context.view_layer.update();boom_obj.location=boom.matrix_world.translation.copy()
 parent(boom_obj,boom)
 hook_origin=(0,-(boom_tip_px-boom_pivot_px)*boom_scale,(boom_pivot_py-boom_tip_py)*boom_scale)
 crane_hook_world=(0,2.82+hook_origin[2],1.62-hook_origin[1])
 hook=empty('crane-truck:hook',game_vector(crane_hook_world),boom)
 crane_beam('crane hoist cable',crane_hook_world,(crane_hook_world[0],crane_hook_world[1]-1.18,crane_hook_world[2]),.025,black,hook)
 crane_beam('crane hook shank',(crane_hook_world[0]-.08,crane_hook_world[1]-1.18,crane_hook_world[2]),(crane_hook_world[0]-.08,crane_hook_world[1]-1.52,crane_hook_world[2]),.07,tin,hook)
 crane_beam('crane hook shank',(crane_hook_world[0]+.08,crane_hook_world[1]-1.18,crane_hook_world[2]),(crane_hook_world[0]+.08,crane_hook_world[1]-1.52,crane_hook_world[2]),.07,tin,hook)
 crane_beam('crane forged hook curve',(crane_hook_world[0]-.08,crane_hook_world[1]-1.52,crane_hook_world[2]),(crane_hook_world[0],crane_hook_world[1]-1.67,crane_hook_world[2]),.055,tin,hook)
 crane_beam('crane forged hook curve',(crane_hook_world[0],crane_hook_world[1]-1.67,crane_hook_world[2]),(crane_hook_world[0]+.08,crane_hook_world[1]-1.52,crane_hook_world[2]),.055,tin,hook)
 crane_parts.extend((('crane-truck:boom',boom),('crane-truck:hook',hook)))
 print('CRANE BOOM TRACE',len(boom_loops),'loops','pivot',tuple(round(v,3) for v in game_vector((0,2.82,1.62))),
       'tip',tuple(round(v,3) for v in hook_origin),'length',round((boom_tip_px-boom_pivot_px)*boom_scale,3))
 def crane_bounds(piece):
  nodes=[piece]+list(piece.children_recursive);points=[];graph=bpy.context.evaluated_depsgraph_get()
  for node in nodes:
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(graph);mesh=evaluated.to_mesh()
   points.extend((node.matrix_world@vertex.co)[:] for vertex in mesh.vertices)
   evaluated.to_mesh_clear()
  if not points:return None
  game_points=[(point[0],point[2],-point[1]) for point in points]
  return tuple(min(point[i] for point in game_points) for i in range(3)),tuple(max(point[i] for point in game_points) for i in range(3))
 def crane_bounds_touch(a,b,epsilon=.05):
  return all(a[0][axis]<=b[1][axis]+epsilon and b[0][axis]<=a[1][axis]+epsilon for axis in range(3))
 crane_measured={label:crane_bounds(piece) for label,piece in crane_parts}
 for label,piece in crane_parts:
  bounds=crane_measured[label]
  if bounds is None:raise RuntimeError(f'{label} has no mesh')
  lo,hi=bounds
  print('CRANE PIECE BOUNDS',label,'min',tuple(round(v,3) for v in lo),'max',tuple(round(v,3) for v in hi))
  if label.startswith('crane-truck:wheel-'):
   if abs(lo[1])>.035:raise RuntimeError(f'{label} does not touch the ground')
   print('CRANE PIECE CONTACT',label,'ground')
  else:
   neighbours=[other for other,other_bounds in crane_measured.items() if other!=label and other_bounds and crane_bounds_touch(bounds,other_bounds)]
   if not neighbours:raise RuntimeError(f'{label} does not touch the ground or another crane piece')
   print('CRANE PIECE CONTACT',label,', '.join(neighbours[:4]))
 # Pipe truck: only the empty cab, folded loader crane, frame and stake bed are
 # carved. The steel pipes are separate photo-faced cylinders with drop pivots.
 from photo_model import Photo, Mesh as PhotoMesh, lathe
 from photo_carve import carve_object
 from hull_model import tyre
 pipes=empty('pipe-truck',(0,0,0),root)
 pipe_textures=project_root/'public/assets/models/wasteland/town/textures'
 pipe_side=Photo(pipe_textures/'pipe-truck-side.jpg')
 pipe_front=Photo(pipe_textures/'pipe-truck-front.jpg')
 pipe_rear=Photo(pipe_textures/'pipe-truck-rear.jpg')
 pipe_top=Photo(pipe_textures/'pipe-truck-overhead.jpg')
 pipe_photo=Photo(pipe_textures/'pipe-truck-pipe.jpg')
 pipe_length,pipe_width,pipe_height=9.4,3.05,3.45
 pipe_scale=pipe_length/(856-25)
 pipe_radius=.70
 pipe_axles=[-pipe_length/2+(px-25)*pipe_scale for px in (139,583,694)]
 pipe_wheels=[(axle,pipe_radius,.83) for axle in pipe_axles]
 def keep_pipe_body(x,y,z):
  # Frame rails and wheel wells stay open below the photographed body.
  keep=y>=1.12
  for axle in pipe_axles:
   keep &= ~((np.abs(x)<1.30)&((z-axle)**2+(y-pipe_radius)**2<(.82)**2))
  # Leave the whole stake-bed silhouette open. Its rails, headboard and tailgate
  # are traced as thin pieces below, so the carve cannot turn them into walls.
  keep &= ~((y>1.48)&(z>-.78))
  # The folded loading crane is restored as its own traced photo piece.
  keep &= ~((y>1.40)&(z> -1.55)&(z<-.55))
  return keep
 pipe_body_table={
  'photos':{'side':'pipe-truck-side.jpg','front':'pipe-truck-front.jpg',
            'rear':'pipe-truck-rear.jpg','top':'pipe-truck-overhead.jpg'},
  'length':pipe_length,'width':pipe_width,'height':pipe_height,
  'side':{'start':25,'end':856,'ground':389},
  'front':{'centre':443,'ground':399,'top':65},
  'rear':{'centre':443,'ground':399,'top':75},
  'top':{'front':49,'rear':850,'centre':222,'along':'x','x_scale':pipe_length/(850-49)},
  'ends_split':-pipe_length/2+(367-25)*pipe_scale,
  'underside':1.12,'wheels':pipe_wheels,'keep':keep_pipe_body,
  'cut':{'side':[(351,12,431,326),(420,153,876,264)],
         'front':[(0,0,887,50),(320,50,586,87)],
         'rear':[(0,0,887,58),(274,137,623,258)],
         'top':[(0,0,887,50),(0,410,887,444),(335,75,875,112),(335,332,875,370)]},
  'voxel':.045,'target':3200,'grey':25,'tolerance':36,'bleed_tolerance':38,
  'mask_dir':str(project_root/'.evidence/2026-11-08/TOWN-ART-MACHINES-2/round-16/masks')}
 pipe_body=carve_object('pipe-truck:body',pipe_textures,pipe_body_table)
 print('ROUND 19 TRACE: pipe body carved',flush=True)
 split=pipe_body_table['ends_split']
 print('PIPE TRUCK REAR PHOTO SPLIT',round(split,3),'m at cab back wall (side photo x=367 px)')
 print('PIPE TRUCK BODY PHOTO MAP: cab volume=side/top with front end view; rear bed volume=side/top with rear end view')
 for photo in pipe_body_table['_photos'].values():
  for image_node in photo.material().node_tree.nodes:
   if image_node.type=='TEX_IMAGE':image_node.interpolation='Cubic'
 parent(pipe_body,pipes)
 pipe_parts=[('pipe-truck:body',pipe_body)]
 def pipe_box(name,center,size,material=steel,bevel=.04):return box(name,game_vector(center),(size[0],size[2],size[1]),material,pipes,bevel)
 def pipe_beam(name,start,end,radius,material=steel):return beam(name,game_vector(start),game_vector(end),radius,material,pipes)
 def pipe_add(label,obj):pipe_parts.append((label,obj));return obj
 # Restore the folded loading crane as a fitted, separate piece traced from the
 # same photo as round 17. It remains outside the body carve.
 crane_node=empty('pipe-truck:loading-crane',game_vector((0,0,0)),pipes)
 from photo_carve import lift_if_dark
 lift_if_dark(pipe_side)
 crane_crop=(351,12,431,326)
 crane_sky=pipe_side.sky([(8,8),(pipe_side.w-9,8),(8,pipe_side.h-9),(pipe_side.w-9,pipe_side.h-9)],tolerance=44,grey=32)
 crane_mask=np.zeros((pipe_side.h,pipe_side.w),dtype=bool)
 crane_mask[crane_crop[1]:crane_crop[3],crane_crop[0]:crane_crop[2]]=~crane_sky[crane_crop[1]:crane_crop[3],crane_crop[0]:crane_crop[2]]
 crane_loops=trace(crane_mask,crane_crop,tolerance=1.5,min_area=12)
 if not crane_loops:raise RuntimeError('pipe truck loading crane photo trace is empty')
 crane_scale=pipe_scale
 def crane_world(px,py,depth):return (depth,(389-py)*crane_scale,-pipe_length/2+(px-25)*crane_scale)
 crane_mesh=PhotoMesh();slab(crane_mesh,'folded-loading-crane',pipe_side,crane_loops,crane_world,-.30,.30,wall_scale=crane_scale)
 crane_obj=crane_mesh.finish('pipe truck round 17 folded loading crane photo trace',{'folded-loading-crane':pipe_side.material()})
 parent(crane_obj,crane_node)
 pipe_add('pipe-truck:loading-crane',crane_node)
 print('ROUND 19 TRACE: loading crane restored',flush=True)
 def photo_painted_box(name,center,size,photo,crop,direction='wide'):
  obj=box(name,game_vector(center),(size[0],size[2],size[1]),steel,pipes,.018)
  obj.data.materials.clear();obj.data.materials.append(photo.material())
  uv=obj.data.uv_layers.active;x0,y0,x1,y1=crop
  for poly in obj.data.polygons:
   for li in poly.loop_indices:
    co=obj.data.vertices[obj.data.loops[li].vertex_index].co
    u=max(0,min(1,(co.y/size[2] if direction=='long' else co.x/size[0])+.5));v=max(0,min(1,co.z/size[1]+.5))
    uv.data[li].uv=photo.uv(x0+u*(x1-x0),y0+v*(y1-y0))
  return obj
 # Posts and three open rails per side, plus the front rack and rear gate, are
 # separate worn-yellow box beams. Their UVs use tight crops from each photo.
 for side in (-1,1):
  for y in (-.55,.70,1.95,3.18,4.20):
   pipe_add(f'pipe-truck:stake-{side}-{y}',photo_painted_box('pipe truck worn yellow bed post',(side*1.38,2.05,y),(.09,1.20,.09),pipe_side,(331,150,358,179)))
  for rail_index,height in enumerate((1.80,2.16,2.52),1):
   rail=photo_painted_box(f'pipe truck worn yellow side rail {side} {rail_index}',(side*1.38,height,1.84),(.075,.10,4.86),pipe_side,(445,164,790,181),'long')
   pipe_add(f'pipe-truck:side-rail-{side}-{rail_index}',rail)
 # Open headboard rack uses the front photo's painted cross members.
 for x in (-1.10,1.10):
  pipe_add(f'pipe-truck:headboard-post-{x}',photo_painted_box('pipe truck headboard rack post',(x,2.12,-.82),(.10,1.24,.10),pipe_front,(330,55,348,168)))
 for index,height in enumerate((1.68,2.08,2.48),1):
  pipe_add(f'pipe-truck:headboard-rail-{index}',photo_painted_box('pipe truck headboard rack rail',(0,height,-.82),(2.25,.09,.09),pipe_front,(330,54,416,72)))
 # Tailgate stands across the open rear of the flatbed.
 for x in (-1.12,-.38,.38,1.12):
  pipe_add(f'pipe-truck:tailgate-post-{x}',photo_painted_box('pipe truck tailgate upright',(x,2.10,4.24),(.09,1.15,.09),pipe_rear,(276,143,301,254)))
 for index,height in enumerate((1.72,2.08,2.44),1):
  pipe_add(f'pipe-truck:tailgate-rail-{index}',photo_painted_box('pipe truck worn yellow tailgate rail',(0,height,4.24),(2.35,.10,.09),pipe_rear,(280,145,615,165)))
 print('ROUND 19 TRACE: bed rails built',flush=True)
 frame_y=1.08
 for side in (-1,1):pipe_add(f'pipe-truck:frame-rail-{side}',pipe_beam('pipe frame ladder rail',(side*.54,.76,-3.78),(side*.54,.76,3.78),.055,steel))
 for index,axle_z in enumerate(pipe_axles):
  pipe_add(f'pipe-truck:crossmember-{index+1}',pipe_beam('pipe frame crossmember',(-.96,frame_y,axle_z),(.96,frame_y,axle_z),.09,steel))
  pipe_add(f'pipe-truck:axle-{index+1}',pipe_beam('pipe heavy axle',(-1.24,pipe_radius,axle_z),(1.24,pipe_radius,axle_z),.13,black))
  for side in (-1,1):pipe_beam('pipe truck leaf spring',(side*.85,.86,axle_z-.45),(side*.85,.86,axle_z+.45),.045,steel)
 # Built tanks and six wide dark tyres; each rear axle carries dual pairs.
 for name,center,size in [('fuel-tank',(-.60,.84,-.64),(.44,.46,.88)),('air-tank',(.60,.84,-.56),(.38,.40,.78))]:
  pipe_add('pipe-truck:'+name,pipe_box('pipe truck '+name.replace('-',' '),center,size,steel,.08))
 pipe_dark=bpy.data.materials.new('Pipe truck / dusty dark rubber');pipe_dark.diffuse_color=(.025,.027,.025,1);pipe_dark.use_nodes=True
 pipe_dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.025,.027,.025,1);pipe_dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.94
 for axle_index,(axle_z,side_px,side_py) in enumerate(zip(pipe_axles,(139,583,694),(328,330,330))):
  centres=[-1.0,1.0] if axle_index==0 else [-1.26,-.86,.86,1.26]
  width=.31 if axle_index==0 else .20
  for tire_x in centres:
   end_photo=pipe_body_table['_photos']['front' if axle_index==0 else 'rear']
   meta=pipe_body_table['front' if axle_index==0 else 'rear'];end_scale=pipe_height/(meta['ground']-meta['top'])
   tyre_mesh=PhotoMesh();tyre(tyre_mesh,'side',pipe_side,side_px,side_py,(62,60,60)[axle_index],pipe_radius,width,'rubber',end_photo,
      330 if tire_x<0 else 555,width/end_scale*.94,meta['ground']-pipe_radius/end_scale,
      meta['ground']-pipe_radius*.08/end_scale,sides=32)
   wheel=tyre_mesh.finish('pipe truck photo-width rubber tyre',{'side':pipe_side.material(),'rubber':pipe_dark})
   wheel.name=f'pipe-truck:wheel-{axle_index+1}-'+('left' if tire_x<0 else 'right')+('-inner' if axle_index and abs(tire_x)<1 else '-outer' if axle_index else '')
   parent(wheel,pipes);wheel.location=game_vector((tire_x,pipe_radius,axle_z));pipe_add(wheel.name,wheel)
 # Bed deck and five stake stations along both sides.
 pipe_add('pipe-truck:flatbed',pipe_box('pipe truck photo-width flatbed deck',(0,1.40,1.92),(2.54,.18,5.60),steel,.05))
 for side in (-1,1):
  for y in (-.55,.70,1.95,3.18,4.20):
   pipe_beam('pipe stake socket',(side*1.38,1.48,y),(side*1.38,1.72,y),.09,black)
   pipe_add(f'pipe-truck:stake-{side}-{y}',pipe_beam('pipe truck worn yellow upright stake',(side*1.38,1.48,y),(side*1.38,2.62,y),.06,paint))
   pipe_beam('pipe stake gusset',(side*1.10,1.58,y),(side*1.38,1.86,y),.045,tin)
 def pipe_uv_x(index,distance,radius,angle):
  px=pipe_photo.w*(.025+.95*(distance/5.10));py=pipe_photo.h*(.39+.20*(angle/math.tau));return pipe_photo.uv(px,py)
 def pipe_cap_uv(angle,fraction):
  px=pipe_photo.w*(.025+.95*fraction);py=pipe_photo.h*(.39+.20*(angle/math.tau));return pipe_photo.uv(px,py)
 pipe_roots=[]
 # Five longitudinal pipes, each centered on its own joint. Three lie in the
 # bottom course and two sit in the upper course between the stake rails.
 for index,(x,height) in enumerate(((-.55,1.69),(0,1.69),(.55,1.69),(-.275,2.04),(.275,2.04)),1):
  long_pos=1.92; joint=empty(f'pipe-truck:pipe-{index}',game_vector((x,height,long_pos)),pipes);pipe_roots.append((f'pipe-truck:pipe-{index}',joint))
  mesh=PhotoMesh();lathe(mesh,'pipe', (x,height,long_pos-2.55),(0,0,1),(1,0,0),(0,1,0),[(0,.205),(5.10,.205)],pipe_uv_x,sides=32,cap_start=('pipe',pipe_cap_uv),cap_end=('pipe',pipe_cap_uv))
  obj=mesh.finish(f'pipe-truck:pipe-{index}:rusty-cylinder',{'pipe':pipe_photo.material()});parent(obj,joint)
 pipe_parts.extend(pipe_roots)
 # The frame, bed, tyres, body and cargo are measured in game metres.
 def pipe_bounds(piece):
  nodes=[piece]+list(piece.children_recursive);points=[];graph=bpy.context.evaluated_depsgraph_get()
  for node in nodes:
   if node.type!='MESH':continue
   evaluated=node.evaluated_get(graph);mesh=evaluated.to_mesh();points.extend((node.matrix_world@vertex.co)[:] for vertex in mesh.vertices);evaluated.to_mesh_clear()
  if not points:return None
  gp=[(point[0],point[2],-point[1]) for point in points];return tuple(min(q[i] for q in gp) for i in range(3)),tuple(max(q[i] for q in gp) for i in range(3))
 measured={label:pipe_bounds(piece) for label,piece in pipe_parts}
 for label,piece in pipe_parts:
  bounds=measured[label]
  if bounds is None:raise RuntimeError(f'{label} has no mesh')
  lo,hi=bounds;print('PIPE PIECE BOUNDS',label,'min',tuple(round(v,3) for v in lo),'max',tuple(round(v,3) for v in hi))
  if label.startswith('pipe-truck:wheel-'):
   if abs(lo[1])>.04:raise RuntimeError(f'{label} does not touch the ground')
   print('PIPE PIECE CONTACT',label,'ground')
  else:
   neighbours=[other for other,other_bounds in measured.items() if other!=label and other_bounds and all(bounds[0][i]<=other_bounds[1][i]+.05 and other_bounds[0][i]<=bounds[1][i]+.05 for i in range(3))]
   if not neighbours:raise RuntimeError(f'{label} does not touch the ground or another piece')
   print('PIPE PIECE CONTACT',label,', '.join(neighbours[:4]))
 # Each root remains a separate family child with a real-scale local origin.
 mixer.location.x=11;roller.location.x=22;paver.location.x=33;drill.location.x=44;crane.location.x=55;pipes.location.x=66
 return root
family=basic_family();bpy.context.view_layer.update()
# Merge the many static salvage pieces into one mesh per rigid assembly. This
# keeps the exported family compact while leaving every named moving joint.
joint_names={'loader:front-frame','loader:rear-frame','loader:arms','loader:bucket','mixer-truck:drum','mixer-truck:chute','roller:drum','paver:screed','drill-rig:mast','drill-rig:string','crane-truck:boom','crane-truck:hook',*(f'pipe-truck:pipe-{i}' for i in range(1,6))}
machine_names={'loader','mixer-truck','roller','paver','drill-rig','crane-truck','pipe-truck'}
triangle_targets={'loader':5600,'mixer-truck':14500,'roller':5600,'paver':5600,'drill-rig':5600,'crane-truck':5600,'pipe-truck':5600}
# Reduce individual source parts before joining them. This keeps a tire round
# and avoids collapsing disconnected beams into large plates.
for machine_name in machine_names:
 root_obj=bpy.data.objects[machine_name];parts=[]
 def gather_parts(node):
  for child in node.children:
   if child.type=='MESH':parts.append(child)
   gather_parts(child)
 gather_parts(root_obj);counts=[];depsgraph=bpy.context.evaluated_depsgraph_get()
 for obj in parts:
  evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();counts.append((obj,sum(max(1,len(poly.vertices)-2) for poly in mesh.polygons)));evaluated.to_mesh_clear()
 total=sum(triangles for _,triangles in counts)
 if total>triangle_targets[machine_name]:
  ratio=triangle_targets[machine_name]/total
  for obj,triangles in counts:
   if triangles<50 or 'molded rubber carcass' in obj.name or 'pipe truck round steel pipe' in obj.name or 'roller smooth full-width steel drum' in obj.name:continue
   decimate=obj.modifiers.new('compact mesh details','DECIMATE');decimate.ratio=ratio;decimate.use_collapse_triangulate=False
   bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=decimate.name)
for machine_name in machine_names:
 groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH':continue
  node=obj.parent;owner=None
  while node:
   if node.name in joint_names or node.name in machine_names:
    owner=node;break
   node=node.parent
  if owner is None or (owner.name not in joint_names and owner.name!=machine_name):continue
  if owner.name!=machine_name and owner.name not in joint_names:continue
  if owner.name==machine_name or owner.name in joint_names:groups.setdefault(owner.name,[]).append(obj)
 for owner_name,objects in groups.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();merged=bpy.context.view_layer.objects.active;merged.name=owner_name+' rigid assembly'
  target=bpy.data.objects[owner_name]
  if merged.parent!=target:parent(merged,target)
# Keep each machine below its 15,000-triangle cap and within the small family
# file budget. Planar welded plate surfaces need few triangles after bevels.
for machine_name in machine_names:
 root_obj=bpy.data.objects[machine_name]
 descendants=[]
 def gather(node):
  descendants.extend(c for c in node.children if c.type=='MESH');[gather(c) for c in node.children]
 gather(root_obj);estimated=0;moving_triangles=0;static=[];depsgraph=bpy.context.evaluated_depsgraph_get()
 for obj in descendants:
  evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();triangles=sum(max(1,len(poly.vertices)-2) for poly in mesh.polygons);evaluated.to_mesh_clear();node=obj.parent;animated=False
  while node and node!=root_obj:
   if node.name in joint_names:animated=True;break
   node=node.parent
  if animated:moving_triangles+=triangles
  else:static.append(obj);estimated+=triangles
 target_triangles=triangle_targets[machine_name]
 static_target=max(1000,target_triangles-moving_triangles)
 if estimated>static_target:
  ratio=max(.06,min(1,static_target/estimated))
  for obj in static:
   decimate=obj.modifiers.new('compact welded geometry','DECIMATE');decimate.ratio=ratio;decimate.use_collapse_triangulate=False;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=decimate.name);obj.select_set(False)
# Export exactly the gameplay joint hierarchy; preserve all mesh UVs as UVMap.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and obj.data.uv_layers.active:obj.data.uv_layers.active.name='UVMap'
for mat in bpy.data.materials:
 for node in mat.node_tree.nodes if mat.use_nodes else []:
  if node.type=='TEX_IMAGE' and node.image and max(node.image.size)>192:
   filename=node.image.filepath.lower().replace('\\','/').rsplit('/',1)[-1]
   if not filename.startswith(('mixer-truck-','mixer-drum-side','crane-truck-','pipe-truck-','paver-')):node.image.scale(192,192)
blend=(root/'.qa-dist/town-machines-2/candidate.blend' if a.candidate else root/'art-build/town/machines-2.blend');blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(glb)
if not a.render:
 print('exported',glb,glb.stat().st_size)
 raise SystemExit(0)
if a.render:
 from mathutils import Vector
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene
scene.render.engine=eevee_engine;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=24
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.world=bpy.data.worlds.new('neutral even crane studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.36,.36,.36,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.62
def hide_tree(node,value):node.hide_render=value;[hide_tree(child,value) for child in node.children]
if a.render_machine=='loader':
 ev.mkdir(parents=True,exist_ok=True)
 for name in machine_names:hide_tree(bpy.data.objects[name],name!='loader')
 bpy.ops.mesh.primitive_plane_add(size=80,location=(0,-.04,0));floor=bpy.context.object;floor.name='temporary loader grey ground'
 floor_mat=bpy.data.materials.new('loader plain grey review ground');floor_mat.diffuse_color=(.36,.36,.36,1);floor_mat.use_nodes=True
 floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.36,.36,1);floor.data.materials.append(floor_mat)
 loader_obj=bpy.data.objects['loader']; joints={obj.name:obj for obj in bpy.data.objects if obj.name.startswith('loader:')}
 bpy.context.view_layer.update()
 for joint_name in ('loader:arms','loader:bucket'):
  joint=joints[joint_name]
  meshes=[child for child in joint.children_recursive if child.type=='MESH']
  vertices=[child.matrix_world@Vector(corner) for child in meshes for corner in child.bound_box]
  low=tuple(round(min(v[i] for v in vertices),3) for i in range(3));high=tuple(round(max(v[i] for v in vertices),3) for i in range(3))
  print('EXPORTED LOADER BOUNDS',joint_name,'min',low,'max',high)
  if low[1]<=0:raise RuntimeError(f'{joint_name} must lie at Blender y > 0')
  if joint_name=='loader:bucket' and low[1]<=2.6:raise RuntimeError('loader:bucket must lie beyond Blender y +2.6')
 for loc,power,size in [((7,8,11),1700,7),((-5,-3,7),800,5)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1.4))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.resolution_x=900;scene.render.resolution_y=560;scene.render.resolution_percentage=100
 def loader_cam(label,location,target,scale,up='Y'):
  bpy.ops.object.camera_add(location=location);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z',up).to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam;scene.render.filepath=str(ev/f'loader-{label}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 loader_cam('side',(12,0,1.55),(0,1.0,1.55),7.6)
 loader_cam('front',(0,13,1.55),(0,.1,1.55),4.5)
 loader_cam('rear',(0,-13,1.55),(0,.1,1.55),4.5)
 loader_cam('overhead',(0,0,13),(0,1.0,0),8.0,'X')
 loader_cam('rest',(8,9,7),(0,1.4,1.5),8.0)
 joints['loader:arms'].rotation_euler[0]=.38;joints['loader:bucket'].rotation_euler[0]=-.25
 loader_cam('work',(8,9,7),(0,1.4,1.5),8.0)
 print('Rendered loader orthographic views, rest comparison, and work pose with camera up Y')
 raise SystemExit(0)
if a.render_machine=='roller':
 ev.mkdir(parents=True,exist_ok=True)
 roller_obj=bpy.data.objects['roller'];hide_tree(roller_obj,False)
 for name in machine_names:hide_tree(bpy.data.objects[name],name!='roller')
 bpy.ops.mesh.primitive_plane_add(size=100,location=(22,0,-.04));floor=bpy.context.object;floor.name='temporary roller grey ground'
 floor_mat=bpy.data.materials.new('roller plain grey review ground');floor_mat.diffuse_color=(.36,.36,.36,1);floor_mat.use_nodes=True
 floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.36,.36,1);floor.data.materials.append(floor_mat)
 for loc,power,size in [((16,-8,10),1800,7),((27,4,7),950,6)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
  light.rotation_euler=(Vector((22,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.resolution_x=1200;scene.render.resolution_y=720;scene.render.resolution_percentage=100
 def roller_cam(label,location,target,scale,ortho=True,up='Y'):
  bpy.ops.object.camera_add(location=location);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z',up).to_euler();cam.data.type='ORTHO' if ortho else 'PERSP'
  if ortho:cam.data.ortho_scale=scale
  else:cam.data.lens=56
  scene.camera=cam;scene.render.filepath=str(ev/f'roller-{label}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 roller_cam('side',(9,0,1.45),(22,0,1.45),12.0,up='Y')
 roller_cam('front',(22,15,1.45),(22,0,1.45),8.0,up='Y')
 roller_cam('rear',(22,-15,1.45),(22,0,1.45),8.0,up='Y')
 roller_cam('overhead',(22,0,15),(22,0,0),12.0,up='X')
 drum_joint=next(o for o in bpy.data.objects if o.name=='roller:drum');drum_joint.rotation_mode='XYZ';drum_joint.rotation_euler=(0,0,0)
 roller_cam('rest',(29,-9,6),(22,0,1.45),10.0,up='Y')
 drum_joint.rotation_euler[0]=.65;roller_cam('work',(29,-9,6),(22,0,1.45),10.0,up='Y')
 print('Rendered roller side, front, rear, overhead, rest and work views from imported family GLB')
 raise SystemExit(0)
if a.render_machine=='paver':
 for name in machine_names:hide_tree(bpy.data.objects[name],name!='paver')
 bpy.ops.mesh.primitive_plane_add(size=80,location=(33,0,-.045));floor=bpy.context.object;floor.name='temporary paver grey ground'
 floor_mat=bpy.data.materials.new('paver plain grey review ground');floor_mat.diffuse_color=(.36,.36,.36,1);floor_mat.use_nodes=True
 floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.36,.36,1);floor.data.materials.append(floor_mat)
 for loc,power,size in [((27,-7,12),1800,8),((39,6,9),900,7)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
  light.rotation_euler=(Vector((33,0,1.8))-light.location).to_track_quat('-Z','Y').to_euler()
 paver_joints={obj.name:obj for obj in bpy.data.objects if obj.name.startswith('paver:')}
 def paver_review_cam(label,location,target,scale,width,height,up='Y'):
  scene.render.resolution_x=width;scene.render.resolution_y=height
  bpy.ops.object.camera_add(location=location);cam=bpy.context.object
  cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z',up).to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale
  scene.camera=cam;scene.render.filepath=str(ev/f'paver-{label}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 for joint in paver_joints.values():joint.rotation_mode='XYZ';joint.rotation_euler=(0,0,0)
 screed_joint=paver_joints['paver:screed'];hide_tree(screed_joint,True)
 paver_review_cam('side',(19,0,1.9),(33,0,1.9),8.45,1400,700)
 paver_review_cam('front',(33,15,1.9),(33,0,1.9),5.6,1400,933)
 paver_review_cam('rear',(33,-15,1.9),(33,0,1.9),5.6,1400,933)
 paver_review_cam('overhead',(33,0,15),(33,0,0),7.65,1199,1312,'Y')
 hide_tree(screed_joint,False);hide_tree(bpy.data.objects['paver'],True);hide_tree(screed_joint,False)
 paver_review_cam('screed',(33,-15,1.1),(33,-4.3,.9),8.2,1400,467)
 hide_tree(bpy.data.objects['paver'],False);screed_joint.rotation_euler=(0,0,0)
 paver_review_cam('rest',(39,-11,7.4),(33,-.2,1.8),12.4,1400,720)
 screed_joint.rotation_euler[0]=-.38
 paver_review_cam('work',(39,-11,7.4),(33,-.2,1.8),12.4,1400,720)
 print('Rendered paver photo-scale side/front/rear/overhead and screed views, plus exported rest and raised work poses with camera up Y')
 raise SystemExit(0)
if a.render_machine=='pipe-truck':
 for name in machine_names:hide_tree(bpy.data.objects[name],name!='pipe-truck')
 bpy.ops.mesh.primitive_plane_add(size=200,location=(66,0,-.045));floor=bpy.context.object;floor.name='pipe truck review grey ground'
 floor_mat=bpy.data.materials.new('pipe truck plain grey ground');floor_mat.diffuse_color=(.36,.36,.36,1);floor_mat.use_nodes=True
 floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.36,.36,1);floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98;floor.data.materials.append(floor_mat)
 joints={obj.name:obj for obj in bpy.data.objects if obj.name.startswith('pipe-truck:')}
 for joint in joints.values():joint.rotation_mode='XYZ';joint.rotation_euler=(0,0,0)
 def pipe_review_cam(label,location,look_at,scale,width,height,up='Y',perspective=False):
  scene.render.resolution_x=width;scene.render.resolution_y=height
  bpy.ops.object.camera_add(location=location);review_cam=bpy.context.object
  review_cam.rotation_euler=(Vector(look_at)-review_cam.location).to_track_quat('-Z',up).to_euler()
  if label=='overhead':review_cam.rotation_euler.rotate_axis('Z',math.pi/2)
  review_cam.data.type='PERSP' if perspective else 'ORTHO'
  if perspective:review_cam.data.lens=56
  else:review_cam.data.ortho_scale=scale
  scene.camera=review_cam
  scene.render.filepath=str(ev/f'pipe-truck-{label}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(review_cam,do_unlink=True)
 for loc,power,size in [((61,-7,12),1400,9),((73,5,8),700,7)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((66,0,1.8))-light.location).to_track_quat('-Z','Y').to_euler()
 pipe_review_cam('side',(50,0,1.9),(66,0,1.9),10.3,887,443)
 pipe_review_cam('front',(66,15,1.9),(66,0,1.9),8.8,887,443)
 pipe_review_cam('rear',(66,-15,1.9),(66,0,1.9),8.8,887,443)
 pipe_review_cam('overhead',(66,0,18),(66,0,0),10.2,887,443,'X')
 for index in range(1,6):
  joint=joints[f'pipe-truck:pipe-{index}'];joint.location.x=[-.55,0,.55,-.275,.275][index-1];joint.location.z=[1.69,1.69,1.69,2.04,2.04][index-1];joint.rotation_euler=(0,0,0)
 pipe_review_cam('rest',(74,-11,7.5),(66,0,1.8),11.3,1400,720)
 drop_positions={1:(1.72,.205,-.5),2:(2.24,.205,-.5),3:(2.76,.205,-.5)}
 for index,(x,height,long_pos) in drop_positions.items():
  joint=joints[f'pipe-truck:pipe-{index}'];joint.location.x=x;joint.location.z=height;joint.location.y=-long_pos;joint.rotation_euler[1]=-.48 if index%2 else .48
 pipe_review_cam('work',(74,-11,7.5),(66,0,1.8),11.3,1400,720)
 print('Rendered pipe truck side, front, rear, overhead, rest and work comparisons from the imported family GLB')
 raise SystemExit(0)
for name in machine_names:hide_tree(bpy.data.objects[name],name!='crane-truck')
bpy.ops.mesh.primitive_plane_add(size=200,location=(55,0,-.045));floor=bpy.context.object;floor.name='crane review grey ground'
floor_mat=bpy.data.materials.new('plain medium grey review ground');floor_mat.diffuse_color=(.36,.36,.36,1);floor_mat.use_nodes=True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.36,.36,1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98;floor.data.materials.append(floor_mat)
for loc,power,size in [((50,-5,12),1300,9),((60,3,8),650,7)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power
 light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((55,0,2.0))-light.location).to_track_quat('-Z','Y').to_euler()
ev.mkdir(parents=True,exist_ok=True)
joints={obj.name:obj for obj in bpy.data.objects if obj.name.startswith('crane-truck:')}
def crane_cam(label,location,target,scale,width,height,ortho=True,up='Y'):
 scene.render.resolution_x=width;scene.render.resolution_y=height
 bpy.ops.object.camera_add(location=location);cam=bpy.context.object
 cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z',up).to_euler()
 if label=='overhead':cam.rotation_euler.rotate_axis('Z',math.pi/2)
 cam.data.type='ORTHO' if ortho else 'PERSP'
 if ortho:cam.data.ortho_scale=scale
 else:cam.data.lens=56
 scene.camera=cam;scene.render.filepath=str(ev/f'crane-truck-{label}.png')
 bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
for joint in joints.values():joint.rotation_mode='XYZ';joint.rotation_euler=(0,0,0)
boom_joint=joints['crane-truck:boom'];hook_joint=joints['crane-truck:hook']
hide_tree(boom_joint,True)
crane_cam('side',(35,0,2.0),(55,0,2.0),9.4,1500,640,up='Y')
crane_cam('front',(55,15,2.0),(55,0,2.0),5.8,900,650,up='Y')
crane_cam('rear',(55,-15,2.0),(55,0,2.0),5.8,900,650,up='Y')
crane_cam('overhead',(55,0,17),(55,0,0),9.4,1200,685,up='X')
hide_tree(boom_joint,False)
hook_base=hook_joint.location.z
boom_joint.rotation_euler[0]=0;hook_joint.location.z=hook_base
crane_cam('assembled-rest',(70,-12,8),(55,0,1.9),20.5,1400,720,True,up='Y')
boom_joint.rotation_euler[0]=-.45;hook_joint.location.z=hook_base-.62
crane_cam('assembled-work',(70,-12,8),(55,0,1.9),20.5,1400,720,True,up='Y')
print('Rendered crane truck photo comparisons and both articulated poses from the imported GLB')
raise SystemExit(0)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));scene=bpy.context.scene;scene.render.engine=eevee_engine;scene.render.resolution_x=900;scene.render.resolution_y=680;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=12;scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('neutral even studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.38,.38,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
lights=[]
for loc,power,size in [((7,-8,12),2600,9),((-6,-2,7),1100,8)]:bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;lights.append((l,Vector(loc)))
bpy.ops.mesh.primitive_plane_add(size=500,location=(0,0,-.06));g=bpy.context.object;g.name='temporary floor';mat=bpy.data.materials.new('plain mid-grey ground');mat.diffuse_color=(.38,.38,.38,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.38,.38,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98;g.data.materials.append(mat)
def hide(node,v):node.hide_render=v;[hide(c,v) for c in node.children]
ev.mkdir(parents=True,exist_ok=True)
machine_names=['loader','mixer-truck','roller','paver','drill-rig','crane-truck','pipe-truck']
def aim(cam,p):cam.rotation_euler=(Vector(p)-cam.location).to_track_quat('-Z','Y').to_euler()
# The paver's work image includes a short fresh road behind its screed.
bpy.ops.mesh.primitive_plane_add(size=1,location=(33,2.65,-.045));road=bpy.context.object;road.name='temporary fresh asphalt';road.scale=(1.7,2.0,1);asphalt=bpy.data.materials.new('temporary laid asphalt');asphalt.diffuse_color=(.055,.058,.052,1);asphalt.roughness=.96;road.data.materials.append(asphalt);road.hide_render=True
for name in machine_names:
 machine=bpy.data.objects[name];joints={obj.name:obj for obj in bpy.data.objects if obj.name.startswith(name+':')}
 for pose in ('rest','work'):
  bpy.context.view_layer.update();origin=machine.matrix_world.translation.copy()
  for other in machine_names:hide(bpy.data.objects[other],other!=name)
  road.hide_render=not(name=='paver' and pose=='work')
  for joint in joints.values():joint.rotation_mode='XYZ'
  if name=='loader':
   joints['loader:arms'].rotation_euler[0]=0 if pose=='rest' else .32;joints['loader:bucket'].rotation_euler[0]=0 if pose=='rest' else -.24
  elif name=='mixer-truck':
   joints['mixer-truck:drum'].rotation_euler[2]=0 if pose=='rest' else 1.0;joints['mixer-truck:chute'].rotation_euler[0]=0 if pose=='rest' else -.55
  elif name=='roller':joints['roller:drum'].rotation_euler[0]=0 if pose=='rest' else .65
  elif name=='paver':joints['paver:screed'].rotation_euler[0]=0 if pose=='rest' else -.24
  elif name=='drill-rig':
   joints['drill-rig:mast'].rotation_euler[0]=0 if pose=='rest' else math.pi/2
   joints['drill-rig:string'].location.z=.18 if pose=='rest' else -1.45
  elif name=='crane-truck':
   joints['crane-truck:boom'].rotation_euler[0]=0 if pose=='rest' else -.45
   joints['crane-truck:hook'].location.z+=0 if pose=='rest' else -.62
  elif name=='pipe-truck':
    # Three pipes roll clear together while two remain on the bed.
    drop_positions={1:(1.72,.205,-.5),2:(2.24,.205,-.5),3:(2.76,.205,-.5)}
    for index in range(1,6):
     pipe=joints[f'pipe-truck:pipe-{index}']
     if pose=='work' and index<=3:
      x,height,long_pos=drop_positions[index];pipe.location.x=x;pipe.location.z=height;pipe.location.y=-long_pos;pipe.rotation_euler[1]=-.48 if index%2 else .48
     else:
      pipe.location.x=[-.55,0,.55,-.275,.275][index-1];pipe.location.z=[1.69,1.69,1.69,2.04,2.04][index-1];pipe.location.y=-1.92;pipe.rotation_euler[1]=0
  target=origin+Vector((0,1.0 if name=='loader' else -1.0,3.2 if name=='drill-rig' else 1.8))
  for light,offset in lights:light.location=origin+offset;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
  view_scale=1.65 if name=='loader' else 1.55 if name in ('mixer-truck','roller','paver','pipe-truck') else 2.55 if name=='drill-rig' else 1.75
  camera_side=8 if name!='loader' else -8
  camera_front=-8.65 if name!='loader' else 8.65
  bpy.ops.object.camera_add(location=target+Vector((camera_side,camera_front,2.5))*view_scale);cam=bpy.context.object;cam.data.lens=70;aim(cam,target);scene.camera=cam;scene.render.filepath=str(ev/f'{name}-{pose}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
print('Rendered all seven machines at rest and work poses from imported GLB')
print('exported',glb,glb.stat().st_size)
