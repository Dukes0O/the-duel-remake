"""Scrapyard work-machine family, authored in real metres and exported Y-up."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();glb=root/'public/assets/models/wasteland/town/machines-2.glb';ev=Path(a.render);ev=ev if ev.is_absolute() else root/ev
if a.paths_only:
 print(json.dumps({'blend':[str(root/'art-build/town/machines-2.blend')],'glb':[str(glb)],'evidence':[],'summary':[]}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tx=root/'public/assets/models/wasteland/town/textures'
m=town.make_materials({'rusted-steel':tx/'machine-wear.jpg','galvanised-tin':tx/'machine-wear.jpg','iron-dark':tx/'tire-rubber.jpg','faded-hand-paint':tx/'yellow-green-paint.jpg','sand':tx/'dirt.jpg'})
for v in m.values():v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.3,v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
steel=m['rusted-steel'];tin=m['galvanised-tin'];paint=m['faded-hand-paint'];black=m['iron-dark'];glass=m['dirty-glass']
def parent(o,p):
 world=o.matrix_world.copy();o.parent=p;o.matrix_parent_inverse.identity();o.matrix_world=world
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
 if bevel:mod=o.modifiers.new('worn plate edges','BEVEL');mod.width=bevel;mod.segments=1;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 if par:parent(o,par)
 return o
def beam(n,a,b,r,mat=steel,par=None):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);o.data.uv_layers.active.name='UVMap'
 if par:parent(o,par)
 return o
def wheel(n,x,y,z,r,w,par):
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=10,major_radius=r*.72,minor_radius=r*.28,location=(x,y,z),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=n;o.data.materials.append(black);o.data.uv_layers.active.name='UVMap';parent(o,par)
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r*.52,depth=w*.7,location=(x,y,z),rotation=(0,math.pi/2,0));h=bpy.context.object;h.name=n+' forged hub';h.data.materials.append(tin);h.data.uv_layers.active.name='UVMap';parent(h,par)
 for i in range(10):
  q=math.tau*i/10;beam(n+' chevron '+str(i),(x,y+math.sin(q)*r*.8,z+math.cos(q)*r*.8),(x,y+math.sin(q+.12)*r*.95,z+math.cos(q+.12)*r*.95),.055,black,par)
def tyre_pair(id,par,y,r=.72):
 for x in (-1.12,1.12):wheel(id+' industrial tyre',x,y,r,r,.48,par)
def cab(id,par,x=0,y=-.1,z=1.8):
 box(id+' cab tub',(x,y,z),(1.55,1.65,.64),paint,par,.12);box(id+' cab roof',(x,y,z+1.12),(1.72,1.76,.14),steel,par,.04)
 for s in (-1,1):
  beam(id+' narrow cab post',(x+s*.70,y-.72,z+.28),(x+s*.70,y-.72,z+1.08),.04,tin,par);beam(id+' rear cab post',(x+s*.70,y+.72,z+.28),(x+s*.70,y+.72,z+1.08),.04,steel,par)
 box(id+' windscreen',(x,y-.73,z+.70),(1.27,.035,.63),glass,par,.015)
def articulated_loader():
 root=empty('loader',(0,0,0));front=empty('loader:front-frame',(0,-.55,0),root);rear=empty('loader:rear-frame',(0,.72,0),root)
 for par,cy in ((front,-.62),(rear,.72)):
  box('loader welded ladder chassis',(0,cy,.72),(1.42,2.25,.48),black,par,.10);tyre_pair('loader',par,cy-.62,.74);tyre_pair('loader',par,cy+.55,.74)
 box('loader rear counterweight',(0,1.34,1.38),(1.7,1.05,.88),paint,rear,.20);box('loader engine hood',(0,1.31,1.89),(1.38,.86,.16),tin,rear,.05)
 cab('loader',rear,0,.20,1.85)
 # Scrapyard-repaired articulation hinge and paired landing-gear hydraulic steering rams.
 beam('loader kingpin',(0,-.02,.72),(0,-.02,1.35),.16,tin,root)
 for s in (-1,1):beam('loader steering ram',(s*.50,-.35,.90),(s*.50,.34,.90),.09,steel,root);beam('loader steering chrome rod',(s*.50,-.18,.90),(s*.50,.05,.90),.035,tin,root)
 arms=empty('loader:arms',(-.79,-1.10,1.34),front)
 for s in (-1,1):
  # Boxed curved loader arms with welded gussets; long enough to reach over a stockpile.
  beam('loader lift arm rear pivot',(s*.18,0,.05),(s*.18,-.22,1.02),.17,paint,arms)
  beam('loader lift arm upper reach',(s*.18,-.22,1.02),(s*.18,-2.45,.90),.17,paint,arms)
  beam('loader arm outer cheek',(s*.30,-.17,.16),(s*.30,-2.43,.92),.045,tin,arms)
  beam('loader aircraft ram barrel',(s*.39,.05,.42),(s*.39,-1.05,1.15),.115,steel,arms)
  beam('loader polished piston',(s*.39,-.92,1.08),(s*.39,-1.75,1.15),.05,tin,arms)
  for y in (-.25,-.82,-1.42,-2.15):beam('loader grease hose', (s*.29,y,.75),(s*.29,y-.18,.77),.022,black,arms)
 bucket=empty('loader:bucket',(-.79,-3.25,.94),arms)
 # Deep curved scoop built from bottom, back and side cheeks, not a box shell.
 box('loader bucket curved floor',(0,-.36,-.18),(1.78,1.18,.14),steel,bucket,.045)
 back=box('loader bucket rolled back',(0,.10,.18),(1.78,.16,.70),paint,bucket,.05);back.rotation_euler[0]=-.20
 for s in (-1,1):
  cheek=box('loader bucket side cheek',(s*.86,-.18,.02),(.12,1.12,.60),tin,bucket,.04);cheek.rotation_euler[0]=-.20
 box('loader replaceable cutting edge',(0,-.91,-.08),(1.92,.16,.18),tin,bucket,.025)
 for i in range(7):box('loader bolt on tooth '+str(i),(-.78+i*.26,-1.00,-.08),(.16,.26,.13),steel,bucket,.03)
 for x in (-.66,.66):beam('loader bucket linkage',(x,-.65,.28),(x,.20,.45),.07,black,bucket)
 return root,arms,bucket
def basic_family():
 # The loader receives the full authored treatment; these companion originals
 # have distinct chassis, silhouettes and card-required moving assemblies.
 root=empty('town-machines-2',(0,0,0));loader,arms,bucket=articulated_loader();parent(loader,root)
 def road_truck(id,length=6.1):
  r=empty(id,(11,0,0),root);box(id+' frame',(0,0,.68),(2.05,length,.40),black,r,.08);cab(id,r,0,-length*.31,1.35)
  for yy in (-length*.32,length*.18,length*.34):tyre_pair(id,r,yy,.48)
  return r
 mixer=road_truck('mixer-truck',7.2);dr=empty('mixer-truck:drum',(0,.72,2.05),mixer)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(0,.70,2.05));o=bpy.context.object;o.name='mixer steel drum';o.scale=(.96,1.72,.96);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(paint);o.data.uv_layers.active.name='UVMap';parent(o,dr)
 chute=empty('mixer-truck:chute',(0,2.2,1.5),mixer);box('mixer discharge chute',(0,.20,0),(.55,.95,.10),tin,chute,.03)
 roller=empty('roller',(22,0,0),root);box('roller welded frame',(0,0,1.3),(2.3,4.4,1.1),paint,roller,.25);cyl=None
 bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.88,depth=1.86,location=(0,-1.65,.94),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='roller:drum';o.data.materials.append(tin);o.data.uv_layers.active.name='UVMap';parent(o,roller)
 for y in (1.45,):tyre_pair('roller',roller,y,.68)
 paver=empty('paver',(33,0,0),root);box('paver tracked chassis',(0,0,1.2),(2.5,3.2,1.05),black,paver,.12)
 for s in (-1,1):
  wheel('paver track idler',s*1.34,-.5,.65,.48,.38,paver);wheel('paver drive sprocket',s*1.34,1.0,.65,.48,.38,paver)
 box('paver front feed hopper',(0,-1.72,1.92),(2.3,1.1,1.05),tin,paver,.18);box('paver rear screed',(0,1.92,.60),(3.25,.55,.22),steel,paver,.04)
 drill=road_truck('drill-rig',7);mast=empty('drill-rig:mast',(0,1.1,2.0),drill);beam('drill mast welded spine',(0,0,0),(0,.10,4.4),.15,paint,mast);string=empty('drill-rig:string',(0,.1,4.25),mast);beam('drill steel string',(0,0,0),(0,0,-2.1),.07,tin,string)
 crane=road_truck('crane-truck',7);boom=empty('crane-truck:boom',(0,-.2,2.4),crane);beam('crane telescopic boom',(0,0,0),(0,-3.8,1.1),.24,paint,boom);hook=empty('crane-truck:hook',(0,-3.8,1.1),boom);beam('crane hoist cable',(0,0,0),(0,0,-1.5),.025,black,hook);box('crane forged hook',(0,0,-1.6),(.16,.20,.28),tin,hook,.06)
 pipes=road_truck('pipe-truck',7.2);box('pipe truck flatbed',(0,.55,1.35),(2.1,4.0,.20),steel,pipes,.04)
 for i in range(5):
  y=-.85+i*.58
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.18,depth=1.8,location=(0,y,1.64),rotation=(0,math.pi/2,0));q=bpy.context.object;q.name='pipe-truck salvaged pipe '+str(i);q.data.materials.append(tin);q.data.uv_layers.active.name='UVMap';parent(q,pipes)
 return root
family=basic_family();bpy.context.view_layer.update()
# Export exactly the gameplay joint hierarchy; preserve all mesh UVs as UVMap.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and obj.data.uv_layers.active:obj.data.uv_layers.active.name='UVMap'
for mat in bpy.data.materials:
 for node in mat.node_tree.nodes if mat.use_nodes else []:
  if node.type=='TEX_IMAGE' and node.image and max(node.image.size)>256:node.image.scale(256,256)
blend=root/'art-build/town/machines-2.blend';blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(glb)
if a.render:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=900;scene.render.resolution_y=680;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=12;scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('Overcast loader daylight');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.74,.72,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.9
 for loc,power,size in [((7,-8,12),4300,9),((-6,-2,7),1800,8)]:bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,-1,1))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=80,location=(0,0,-.06));g=bpy.context.object;g.name='temporary floor';mat=bpy.data.materials.new('dust ground');mat.diffuse_color=(.24,.23,.20,1);g.data.materials.append(mat)
 loader=bpy.data.objects['loader'];
 def hide(node,v):node.hide_render=v;[hide(c,v) for c in node.children]
 for name in ['loader','mixer-truck','roller','paver','drill-rig','crane-truck','pipe-truck']:hide(bpy.data.objects[name],name!='loader')
 ev.mkdir(parents=True,exist_ok=True)
 def aim(cam,p):cam.rotation_euler=(Vector(p)-cam.location).to_track_quat('-Z','Y').to_euler()
 for pose in ('rest','work'):
  bpy.data.objects['loader:arms'].rotation_euler[0]=0 if pose=='rest' else -.32;bpy.data.objects['loader:bucket'].rotation_euler[0]=0 if pose=='rest' else .24
  bpy.ops.object.camera_add(location=(8,-10,6.8));cam=bpy.context.object;cam.data.lens=52;aim(cam,(0,-.45,1.55));scene.camera=cam;scene.render.filepath=str(ev/f'loader-{pose}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 print('Rendered loader rest and work poses from imported GLB')
print('exported',glb,glb.stat().st_size)
