"""Scrapyard work-machine family, authored in real metres and exported Y-up."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--candidate',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();glb=root/('.qa-dist/town-machines-2/candidate.glb' if a.candidate else 'public/assets/models/wasteland/town/machines-2.glb');ev=Path(a.render);ev=ev if ev.is_absolute() else root/ev
if a.paths_only:
 print(json.dumps({'blend':[str(root/'art-build/town/machines-2.blend')],'glb':[str(glb)],'evidence':[],'summary':[]}));raise SystemExit(0)
import bpy
import numpy as np
from mathutils import Vector
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
   phi=math.tau*j/rings;across=abs((phi-math.pi/2+math.pi)%(math.tau)-math.pi);pitch=math.tau/12;sweep=(phi-math.pi/2)*.60;delta=(theta-sweep+math.pi)%(math.tau)-math.pi;dist=abs((delta+pitch/2)%pitch-pitch/2);lug=.13*max(0,1-dist/.20)*max(0,1-across/.82) if dist<.20 else 0;radius=r*.78+r*.22*math.sin(phi)+lug;verts.append((x+w*.5*math.cos(phi),y+radius*math.sin(theta),z+radius*math.cos(theta)))
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
 box(id+' cab sill',(x,y,z),(1.12,1.48,.16),paint,par,.05);box(id+' cab roof',(x,y,z+1.70),(1.26,1.54,.12),paint,par,.04)
 for s in (-1,1):
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
 root=empty('loader',(0,0,0));front=empty('loader:front-frame',(0,-.74,0),root);rear=empty('loader:rear-frame',(0,.74,0),root)
 # Two distinct articulated halves with a full-height kingpin and two steering rams.
 box('loader front ladder chassis',(0,-1.20,1.02),(1.72,2.60,.48),black,front,.14)
 box('loader rear ladder chassis',(0,1.20,1.02),(1.72,2.60,.48),black,rear,.14)
 tyre_pair('loader',front,-1.88,.80);tyre_pair('loader',rear,1.88,.80)
 box('loader front axle housing',(0,-1.35,1.18),(1.82,.52,.56),steel,front,.12)
 box('loader rear axle housing',(0,1.35,1.18),(1.82,.52,.56),steel,rear,.12)
 # Rear counterweight, long engine hood and a real rear grille.
 box('loader rear counterweight lower',(0,2.58,1.37),(2.10,.85,.90),paint,rear,.24)
 box('loader rear counterweight cap',(0,2.94,1.76),(1.86,.18,.22),steel,rear,.07)
 box('loader engine hood',(0,1.63,2.12),(1.75,1.68,.94),paint,rear,.16)
 box('loader engine hood crown',(0,1.63,2.62),(1.45,1.42,.12),tin,rear,.04)
 box('loader rear grille backing',(0,2.48,2.18),(1.18,.035,.58),black,rear,.02)
 for x in (-.52,-.39,-.26,-.13,0,.13,.26,.39,.52):box('loader rear grille bar '+str(x),(x,2.455,2.18),(.035,.035,.52),tin,rear,.01)
 # Cab: 1.1 m wide, 1.7 m high above its sill, dark glazing and roof lamps.
 cab('loader',rear,0,.25,2.18)
 # The door is a real painted lower panel with a seam, hinges and a latch.
 box('loader operator seat base',(0,.13,2.58),(.48,.40,.12),black,rear,.035)
 box('loader operator seat cushion',(0,.19,2.73),(.50,.18,.18),paint,rear,.055)
 box('loader operator seat back',(0,.35,2.99),(.50,.16,.46),black,rear,.045)
 beam('loader steering column',(0,-.28,2.60),(0,-.40,3.05),.045,black,rear)
 beam('loader steering rim',(-.22,-.42,3.06),(.22,-.42,3.06),.035,black,rear)
 for s in (-1,1):
  box('loader cab door lower panel',(s*.558,.25,2.57),(.026,.72,.47),paint,rear,.025)
  beam('loader cab door front seam',(s*.578,-.11,2.34),(s*.578,-.11,2.81),.018,black,rear)
  beam('loader cab door rear seam',(s*.578,.61,2.34),(s*.578,.61,2.81),.018,black,rear)
  beam('loader cab door lower seam',(s*.578,-.11,2.34),(s*.578,.61,2.34),.018,black,rear)
  beam('loader cab door upper seam',(s*.578,-.11,2.81),(s*.578,.61,2.81),.018,black,rear)
  box('loader cab door handle',(s*.60,.48,2.74),(.028,.12,.035),tin,rear,.012)
 for x in (-.42,.42):beam('loader roof lamp bracket',(x,-.47,3.93),(x,-.72,4.03),.035,steel,rear);beam('loader roof work lamp',(x,-.70,4.03),(x,-.79,4.03),.105,tin,rear)
 beam('loader articulation kingpin',(0,-.03,.84),(0,-.03,1.62),.17,tin,root)
 for s in (-1,1):
  beam('loader steering ram barrel',(s*.57,-.38,1.12),(s*.57,.36,1.12),.095,steel,root)
  beam('loader steering chrome rod',(s*.57,-.06,1.12),(s*.57,.34,1.12),.040,tin,root)
 # The arms pivot at their real pins, 2.4 m above ground, and reach 3 m to the bucket.
 arms=empty('loader:arms',(0,-.83,2.42),front)
 for s in (-1,1):
  box_beam('loader lift arm pedestal',(s*.78,-1.02,1.28),(s*.83,-.86,2.39),.18,.44,paint,front,.03)
  beam('loader arm pivot pin',(s*.78,-.86,2.40),(s*.89,-.86,2.40),.16,tin,front)
 def arm_pt(p):return (p[0],p[1]-.83,p[2]+2.42)
 def arm_beam(name,a,b,r,mat=steel):return beam(name,arm_pt(a),arm_pt(b),r,mat,arms)
 def arm_box_beam(name,a,b,w,h,mat=steel,bevel=.03):return box_beam(name,arm_pt(a),arm_pt(b),w,h,mat,arms,bevel)
 for s in (-1,1):
  pin_x=s*.83
  arm_box_beam('loader boxed lift arm lower dogleg',(pin_x,0,-.03),(pin_x,-.50,.24),.22,.29,loader_enamel,.035)
  arm_box_beam('loader boxed lift arm reach',(pin_x,-.50,.24),(pin_x,-3.12,-.68),.23,.31,loader_enamel,.035)
  arm_box_beam('loader outer arm wear cheek',(s*.98,-.48,.23),(s*.98,-3.02,-.64),.045,.27,tin,.012)
  # Large hinge bosses and cross-tube make the arm set read as welded machinery.
  arm_beam('loader lift arm hinge boss',(s*.83,-.03,-.02),(s*.83,-.03,.42),.21,steel)
  arm_beam('loader arm cross tube',(-.86,-.18,.12),(.86,-.18,.12),.14,steel)
  # Hydraulic barrels stay on the front frame; polished rods follow the arm.
  beam('loader lift ram barrel',(s*.60,-.28,1.55),(s*.60,-1.42,1.62),.13,steel,front)
  arm_beam('loader lift ram bright rod',(s*.60,-.66,-.72),(s*.60,-1.52,-.55),.060,tin)
  # Z-bar bell crank and bucket link, with pivots and cross pins.
  arm_beam('loader Z bar rocker',(s*.42,-1.12,-.10),(s*.42,-1.67,-.25),.075,black)
  arm_beam('loader Z bar link',(s*.42,-1.67,-.25),(s*.42,-3.00,-.75),.065,tin)
  arm_beam('loader grease hose',(s*.64,-.38,.16),(s*.64,-.72,.20),.025,black)
 # Bucket hinge is nested under the arms; its local origin is the actual hinge pin.
 bucket=empty('loader:bucket',(0,-3.95,1.40),arms)
 def bucket_pt(p):return (p[0],p[1]-3.95,p[2]+1.40)
 # Deep formed scoop: a rolled cutting lip curls through a curved floor and back.
 # The inside and outside skins are real surfaces with a visible plate thickness.
 outer=[(-1.02,-.38),(-.99,-.22),(-.90,-.04),(-.74,.12),(-.52,.28),(-.25,.39),(.04,.44),(.30,.43)]
 inner=[(-.91,-.29),(-.89,-.19),(-.82,-.06),(-.67,.08),(-.48,.21),(-.23,.31),(.03,.35),(.20,.34)]
 verts=[]
 width=2.38;faces=[];n=len(outer)
 for x in (-width/2,width/2):verts.extend([(x,y,z) for y,z in outer])
 # Outer formed plate.
 for i in range(n-1):faces.append((i,i+1,n+i+1,n+i))
 mesh=bpy.data.meshes.new('loader rolled bucket outer shell');mesh.from_pydata(verts,[],faces);mesh.update();shell=bpy.data.objects.new('loader rolled bucket outer shell',mesh);bpy.context.collection.objects.link(shell);shell.location=(0,-3.95,1.40);shell.data.materials.append(steel);uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   co=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(co[0]/2,co[1]/2)
 parent(shell,bucket)
 # Darker inner skin makes the open scoop legible from above and at wheel height.
 inside_verts=[];inside_faces=[]
 for x in (-width/2+.055,width/2-.055):inside_verts.extend([(x,y,z) for y,z in inner])
 for i in range(n-1):inside_faces.append((i,n+i,n+i+1,i+1))
 im=bpy.data.meshes.new('loader bucket worn inner plate');im.from_pydata(inside_verts,[],inside_faces);im.update();inside=bpy.data.objects.new('loader bucket worn inner plate',im);bpy.context.collection.objects.link(inside);inside.location=(0,-3.95,1.40);inside.data.materials.append(m['rusted-steel']);im.uv_layers.new(name='UVMap');parent(inside,bucket)
 for side in (-1,1):
  # Profiled cheek plates follow the scoop's real curve rather than a box.
  outline=[(outer[0][0],outer[0][1]),(outer[-1][0],outer[-1][1]),(inner[-1][0],inner[-1][1]),(inner[-2][0],inner[-2][1]),(inner[-3][0],inner[-3][1]),(inner[-4][0],inner[-4][1]),(inner[-5][0],inner[-5][1]),(inner[-6][0],inner[-6][1]),(inner[-7][0],inner[-7][1]),(inner[-8][0],inner[-8][1])]
  cheek_x=side*(width/2+.012);cv=[(cheek_x,y,z) for y,z in outline];cm=bpy.data.meshes.new('loader bucket profiled cheek');cm.from_pydata(cv,[],[tuple(range(len(cv)))]);cm.update();cheek=bpy.data.objects.new('loader bucket profiled cheek',cm);bpy.context.collection.objects.link(cheek);cheek.location=(0,-3.95,1.40);cheek.data.materials.append(paint);parent(cheek,bucket)
  for j in (1,3,5,7):
   y0,z0=outline[j];y1,z1=outline[j+1];beam('loader bucket cheek rib '+str(side)+' '+str(j),bucket_pt((side*(width/2+.035),y0,z0)),bucket_pt((side*(width/2+.035),y1,z1)),.055,tin,bucket)
 # Thick replaceable lip and separate forged teeth.
 box_beam('loader thick replaceable cutting edge',bucket_pt((-1.27,-1.00,-.38)),bucket_pt((1.27,-1.00,-.38)),.22,.25,tin,bucket,.035)
 for i in range(9):
  x=-1.08+i*.27
  tooth_verts=[(x-.085,-1.02,-.30),(x+.085,-1.02,-.30),(x+.085,-1.02,-.49),(x-.085,-1.02,-.49),(x-.04,-1.36,-.40),(x+.04,-1.36,-.40)]
  tooth_faces=[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4),(0,3,2,1)]
  tm=bpy.data.meshes.new('loader forged pointed bucket tooth');tm.from_pydata(tooth_verts,[],tooth_faces);tm.update();tooth_obj=bpy.data.objects.new('loader forged pointed bucket tooth '+str(i),tm);bpy.context.collection.objects.link(tooth_obj);tooth_obj.location=(0,-3.95,1.40);tm.materials.append(steel);tm.uv_layers.new(name='UVMap');parent(tooth_obj,bucket)
 for s in (-1,1):
  beam('loader bucket hinge pin',bucket_pt((s*1.26,.0,.02)),bucket_pt((s*1.30,.0,.02)),.11,tin,bucket)
  arm_beam('loader bucket curl ram barrel',(s*.70,-.88,-.05),(s*.70,-1.62,-.35),.085,steel)
  beam('loader bucket curl ram bright rod',bucket_pt((s*.70,-.30,.20)),bucket_pt((s*.70,-.78,-.20)),.038,tin,bucket)
  beam('loader bucket Z-bar link',bucket_pt((s*.57,-.06,.32)),bucket_pt((s*.57,.47,.10)),.065,black,bucket)
 return root,arms,bucket
def basic_family():
 root=empty('town-machines-2',(0,0,0));loader,arms,bucket=articulated_loader();parent(loader,root)
 def road_truck(id,length=7.2,axles=3):
  r=empty(id,(0,0,0),root)
  for side in (-1,1):box(id+' deep ladder rail',(side*.82,0,.74),(.24,length,.44),black,r,.08)
  for yy in (-length*.40,-length*.20,0,length*.20,length*.40):box(id+' welded crossmember',(0,yy,.73),(1.75,.18,.28),steel,r,.045)
  # The cab is a closed, steel-framed work cab with dark panes and an inset roof.
  cab(id,r,0,-length*.27,1.34)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(0,-length*.39,1.30));hood=bpy.context.object;hood.name=id+' curved bonnet';hood.scale=(.92,.96,.48);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);hood.data.materials.append(paint);hood.data.uv_layers.active.name='UVMap';parent(hood,r)
  box(id+' recessed radiator',(0,-length*.39-.87,1.29),(1.00,.045,.58),black,r,.04)
  for x in (-.42,-.30,-.18,-.06,.06,.18,.30,.42):box(id+' radiator vertical bar '+str(x),(x,-length*.39-.90,1.29),(.035,.025,.51),tin,r,.01)
  for s in (-1,1):
   box(id+' headlamp',(s*.68,-length*.39-.88,1.62),(.24,.10,.20),tin,r,.055)
   # Rolled fenders follow the wheel instead of forming a thin lower frame.
   bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(s*1.0,-length*.35,.98));f=bpy.context.object;f.name=id+' pressed wheel arch';f.scale=(.23,1.02,.16);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);f.data.materials.append(paint);f.data.uv_layers.active.name='UVMap';parent(f,r)
   bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.20,depth=1.05,location=(s*.90,.35,.94),rotation=(0,math.pi/2,0));tank=bpy.context.object;tank.name=id+' oval fuel tank';tank.data.materials.append(steel);tank.data.uv_layers.active.name='UVMap';parent(tank,r)
   box(id+' steel access step',(s*1.05,-.92,.82),(.28,.94,.13),black,r,.035)
  box(id+' forged front bumper',(0,-length*.39-1.12,.72),(2.52,.24,.30),steel,r,.09)
  axles_y=[-length*.32] + ([length*.23,length*.37] if axles==3 else [length*.31])
  for yy in axles_y:tyre_pair(id,r,yy,.62 if axles==3 else .66)
  return r
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
 # Mixer: three real axles carry a tilted tapered drum; spiral flights, ladder and chute read at a distance.
 mixer=road_truck('mixer-truck',8.0,3);dr=empty('mixer-truck:drum',(0,.92,2.15),mixer)
 profile=[(-1.72,.54),(-1.42,.75),(-1.12,.94),(.78,.94),(1.18,.82),(1.50,.63)];seg=40;verts=[];faces=[]
 for yy,rad in profile:
  for j in range(seg):q=math.tau*j/seg;verts.append((math.cos(q)*rad,yy,math.sin(q)*rad))
 for ri in range(len(profile)-1):
  for j in range(seg):q=ri*seg+j;faces.append((q,ri*seg+(j+1)%seg,(ri+1)*seg+(j+1)%seg,(ri+1)*seg+j))
 dm=bpy.data.meshes.new('mixer tapered drum shell');dm.from_pydata(verts,[],faces);dm.update();dobj=bpy.data.objects.new('mixer tapered drum shell',dm);bpy.context.collection.objects.link(dobj);dm.materials.append(paint);uv=dm.uv_layers.new(name='UVMap')
 for poly in dm.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:uv.data[li].uv=((dm.loops[li].vertex_index%seg)/seg,(dm.loops[li].vertex_index//seg)/(len(profile)-1))
 dobj.location=(0,.92,2.15);parent(dobj,dr)
 for side in (-1,1):
  bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.12,depth=.30,location=(side*.14,-.80,2.15),rotation=(math.pi/2,0,0));cap=bpy.context.object;cap.name='mixer steel end plate';cap.data.materials.append(steel);cap.data.uv_layers.active.name='UVMap';parent(cap,dr)
 # Three continuous spiral flights are real steel ribs, pitched around the tapered shell.
 for phase in (0,math.tau/3,2*math.tau/3):
  points=[]
  for j in range(25):
   t=j/24;y=-1.58+3.00*t;rad=.70+.20*math.sin(math.pi*t);ang=phase+t*math.tau*2.25
   points.append((math.cos(ang)*rad,y+.92,math.sin(ang)*rad+2.15))
  for j in range(len(points)-1):beam('mixer welded helical flight',points[j],points[j+1],.046,tin,dr)
 for y,rad in ((-1.05,.86),(.86,.88)):
  bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,major_radius=rad,minor_radius=.05,location=(0,y+.92,2.15),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='mixer drum support ring';o.data.materials.append(steel);o.data.uv_layers.active.name='UVMap';parent(o,dr)
 dr.rotation_euler[0]=-.12
 for s in (-1,1):
  beam('mixer drum cradle rail',(s*.58,-.05,1.32),(s*.58,1.65,1.85),.11,steel,mixer)
  beam('mixer drum ladder rail',(s*1.03,.40,1.38),(s*1.03,1.72,2.54),.055,tin,mixer)
 for y in (.58,.87,1.16,1.45):beam('mixer ladder rung',(-1.03,y,1.5),(1.03,y,1.5),.035,steel,mixer)
 chute=empty('mixer-truck:chute',(.70,2.65,1.63),mixer)
 box('mixer folded steel chute',(1.0,3.04,1.30),(.40,1.15,.12),tin,chute,.035)
 for s in (-1,1):box('mixer chute high side flange',(1.0+s*.23,3.04,1.49),(.06,1.15,.35),steel,chute,.025)
 beam('mixer chute hinge pin',(.40,2.65,1.63),(1.0,2.65,1.63),.07,black,mixer)
 # Roller: smooth drum, sculpted rear hood, open canopy and a visible yoke.
 roller=empty('roller',(0,0,0),root)
 box('roller ladder chassis',(0,.56,.76),(1.72,3.12,.52),black,roller,.12)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=16,radius=1,location=(0,1.18,1.43));hood=bpy.context.object;hood.name='roller rounded engine hood';hood.scale=(1.03,1.16,.88);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);hood.data.materials.append(paint);hood.data.uv_layers.active.name='UVMap';parent(hood,roller)
 box('roller dark rear grille',(0,2.27,1.38),(1.18,.04,.52),black,roller,.05)
 for x in (-.50,-.35,-.20,-.05,.10,.25,.40,.55):box('roller grille bars',(x,2.30,1.38),(.035,.03,.47),tin,roller,.01)
 box('roller operator deck',(0,-.06,1.17),(1.82,1.10,.18),steel,roller,.055)
 for s in (-1,1):
  beam('roller canopy front post',(s*.66,-.30,1.24),(s*.66,-.30,3.04),.045,paint,roller)
  beam('roller canopy rear post',(s*.66,.70,1.24),(s*.66,.70,3.04),.045,paint,roller)
  beam('roller canopy side rail',(s*.66,-.30,2.94),(s*.66,.70,2.94),.038,steel,roller)
 box('roller open sun canopy',(0,.20,3.04),(1.68,1.44,.13),paint,roller,.07)
 box('roller seat',(0,.18,1.63),(.48,.42,.54),black,roller,.09)
 beam('roller drum yoke left',(-.94,-1.72,1.34),(-.94,-1.72,1.91),.12,paint,roller);beam('roller drum yoke right',(.94,-1.72,1.34),(.94,-1.72,1.91),.12,paint,roller)
 drum=empty('roller:drum',(0,-1.68,.94),roller)
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.95,depth=1.98,location=(0,-1.68,.94),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='roller smooth full-width steel drum';o.data.materials.append(steel);o.data.uv_layers.active.name='UVMap';parent(o,drum)
 for angle in (0,math.tau/3,2*math.tau/3):
  y=-1.68+math.cos(angle)*.93;z=.94+math.sin(angle)*.93
  beam('roller drum longitudinal wear seam',(-.98,y,z),(.98,y,z),.025,black,drum)
 for s in (-1,1):
  bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.78,depth=.04,location=(s*1.01,-1.68,.94),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='roller drum end cap';o.data.materials.append(black);o.data.uv_layers.active.name='UVMap';parent(o,drum)
  beam('roller drum scraper', (s*.78,-.60,1.05),(s*.78,-.60,1.62),.055,steel,roller)
 for yy in (.94,1.60):tyre_pair('roller',roller,yy,.66)
 # Paver: low wide feed hopper, tracked chassis, screed and open operator's station.
 paver=empty('paver',(0,0,0),root);tracks=empty('paver:tracks',(0,0,0),paver)
 box('paver low steel chassis',(0,.14,1.04),(2.34,3.10,.60),black,paver,.12)
 for s in (-1,1):band_track('paver',s,0,3.70,tracks)
 box('paver wide front hopper floor',(0,-1.52,1.34),(3.25,1.08,.18),steel,paver,.08)
 for s in (-1,1):
  box_beam('paver sloped hopper side',(s*.72,-1.90,1.42),(s*1.54,-1.12,2.05),.11,.82,paint,paver,.045)
  beam('paver hopper rolled lip',(s*1.55,-1.72,1.86),(s*1.55,-.92,2.31),.07,tin,paver)
 box('paver rear hopper bulkhead',(0,-.93,1.72),(2.92,.16,.85),paint,paver,.06)
 box('paver open operator deck',(0,.56,1.42),(1.60,1.10,.18),steel,paver,.04)
 box('paver operator seat',(0,.36,1.72),(.48,.38,.48),black,paver,.08)
 for s in (-1,1):
  beam('paver handrail post',(s*.72,.13,1.50),(s*.72,.13,2.28),.035,tin,paver);beam('paver platform rail',(s*.72,.13,2.28),(s*.72,1.0,2.28),.035,tin,paver)
 screed=empty('paver:screed',(0,1.70,.76),paver)
 box('paver rear screed deck',(0,1.90,.76),(3.60,.42,.25),steel,screed,.08)
 box('paver screed wear plate',(0,2.02,.58),(3.52,.18,.08),black,screed,.025)
 for s in (-1,1):beam('paver screed end wing',(s*1.70,1.76,.67),(s*1.94,2.12,.67),.07,tin,screed)
 # Drill rig: low crawler chassis and a braced lattice mast with a rotary head.
 drill=empty('drill-rig',(0,0,0),root);tracks=empty('drill-rig:undercarriage',(0,0,0),drill)
 box('drill rig tracked base',(0,.52,.92),(2.06,3.10,.72),black,drill,.10)
 for s in (-1,1):band_track('drill-rig',s,.45,3.65,tracks)
 box('drill engine rear housing',(0,1.63,1.65),(1.72,1.10,.92),paint,drill,.16)
 for s in (-1,1):
  box('drill perforated side service panel',(s*.88,1.55,1.64),(.055,.76,.58),steel,drill,.08)
  beam('drill mast hinge trunnion',(s*.50,-.10,1.50),(s*.50,.08,1.50),.14,tin,drill)
 mast=empty('drill-rig:mast',(0,-.14,1.50),drill)
 for s in (-1,1):
  beam('drill mast outer chord',(s*.60,-.14,1.50),(s*.47,-.02,6.25),.075,paint,mast)
  for h in (.40,.92,1.44,1.96,2.48,3.0,3.52,4.04,4.56):
   beam('drill lattice crossmember',(s*.60,-.14,1.50+h),(s*.60,-.14,1.60+h),.04,steel,mast)
  for h in (.25,.77,1.29,1.81,2.33,2.85,3.37,3.89,4.41):beam('drill lattice diagonal',(s*.60,-.14,1.50+h),(0,-.09,2.02+h),.045,tin,mast)
 beam('drill mast crown axle',(-.68,-.02,6.22),(.68,-.02,6.22),.11,steel,mast)
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,major_radius=.25,minor_radius=.06,location=(0,-.02,6.22),rotation=(0,math.pi/2,0));pulley=bpy.context.object;pulley.name='drill crown pulley';pulley.data.materials.append(black);pulley.data.uv_layers.active.name='UVMap';parent(pulley,mast)
 string=empty('drill-rig:string',(0,-.22,6.16),mast)
 box('drill rotary head',(0,-.22,5.68),(.62,.38,.74),steel,string,.08)
 beam('drill feed string',(0,-.22,5.38),(0,-.22,2.98),.075,tin,string)
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.17,radius2=.03,depth=.34,location=(0,-.22,2.84));bit=bpy.context.object;bit.name='drill bit';bit.data.materials.append(steel);bit.data.uv_layers.active.name='UVMap';parent(bit,string)
 # Crane truck: long chassis, genuine slew turret and a braced telescopic boom.
 crane=road_truck('crane-truck',9.0,3)
 turret=empty('crane rotating turret',(0,.82,1.22),crane)
 box('crane slew ring',(0,.82,1.28),(1.76,1.78,.22),steel,turret,.11)
 box('crane turret counterweight',(0,1.52,1.83),(1.45,.70,.98),paint,turret,.16)
 for s in (-1,1):beam('crane cab grab rail',(s*.80,.20,1.50),(s*.80,.60,2.30),.05,tin,turret)
 box('crane boom heel yoke',(0,.35,2.34),(.88,.90,.78),steel,turret,.10)
 boom=empty('crane-truck:boom',(0,.35,2.34),turret)
 box_beam('crane telescopic outer boom',(0,.38,2.70),(0,-2.35,3.45),.50,.44,paint,boom,.055)
 box_beam('crane sliding inner boom',(0,-1.58,3.24),(0,-3.60,3.82),.30,.27,tin,boom,.035)
 for s in (-1,1):
  beam('crane boom gusset',(s*.37,.20,2.82),(s*.22,-1.00,3.10),.07,steel,boom)
  box_beam('crane hydraulic outrigger',(s*.84,.84,.72),(s*1.82,.84,.72),.15,.20,steel,crane,.025)
  box('crane outrigger foot',(s*1.82,.84,.12),(.48,.50,.16),black,crane,.045)
 beam('crane ram barrel',(0,.85,1.98),(0,-.50,2.75),.13,steel,turret);beam('crane ram rod',(0,-.12,2.63),(0,-1.34,3.05),.06,tin,turret)
 hook=empty('crane-truck:hook',(0,-3.60,3.82),boom)
 beam('crane hoist cable',(0,-3.60,3.82),(0,-3.60,2.60),.028,black,hook)
 for s in (-1,1):beam('crane forged hook shank',(s*.10,-3.60,2.62),(s*.10,-3.60,2.39),.075,tin,hook)
 beam('crane hook curve',(-.10,-3.60,2.39),(0,-3.60,2.30),.06,tin,hook);beam('crane hook curve',(0,-3.60,2.30),(.10,-3.60,2.39),.06,tin,hook)
 # Pipe truck: long deck, stakes, crosswise steel pipes in a tied-down stack.
 pipes=road_truck('pipe-truck',9.4,3);box('pipe truck flatbed deck',(0,.26,1.40),(2.40,5.72,.20),steel,pipes,.07)
 for s in (-1,1):
  for y in (-2.30,-.90,.50,1.90,2.72):
   beam('pipe stake socket',(s*1.02,y,1.48),(s*1.02,y,1.72),.09,black,pipes)
   beam('pipe truck upright stake',(s*1.02,y,1.62),(s*1.02,y,2.62),.06,paint,pipes)
   beam('stake gusset',(s*.78,y,1.58),(s*1.02,y,1.86),.045,tin,pipes)
 # Nine pipes sit in a stable triangular stack; first five have independent drop pivots.
 pipe_index=0
 for row,count in enumerate((3,2,1)):
  for j in range(count):
   pipe_index+=1;x=(j-(count-1)/2)*.49;y=-1.70+((row+j)%3)*1.58;z=1.69+row*.37
   node=empty('pipe-truck:pipe-'+str(pipe_index),(x+.94,y,z),pipes) if pipe_index<=5 else pipes
   bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.205,depth=1.94,location=(x,y,z),rotation=(0,math.pi/2,0));q=bpy.context.object;q.name='pipe truck round steel pipe '+str(pipe_index);q.data.materials.append(tin);q.data.uv_layers.active.name='UVMap';parent(q,node)
   for s in (-1,1):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=5,major_radius=.17,minor_radius=.018,location=(x+s*.83,y,z),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='pipe rolled end lip';o.data.materials.append(steel);o.data.uv_layers.active.name='UVMap';parent(o,node)
 # Each root remains a separate family child with a real-scale local origin.
 mixer.location.x=11;roller.location.x=22;paver.location.x=33;drill.location.x=44;crane.location.x=55;pipes.location.x=66
 return root
family=basic_family();bpy.context.view_layer.update()
# Merge the many static salvage pieces into one mesh per rigid assembly. This
# keeps the exported family compact while leaving every named moving joint.
joint_names={'loader:front-frame','loader:rear-frame','loader:arms','loader:bucket','mixer-truck:drum','mixer-truck:chute','roller:drum','paver:screed','drill-rig:mast','drill-rig:string','crane-truck:boom','crane-truck:hook',*(f'pipe-truck:pipe-{i}' for i in range(1,6))}
machine_names={'loader','mixer-truck','roller','paver','drill-rig','crane-truck','pipe-truck'}
triangle_targets={'loader':5600,'mixer-truck':5600,'roller':5600,'paver':5600,'drill-rig':5600,'crane-truck':5600,'pipe-truck':5600}
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
  if node.type=='TEX_IMAGE' and node.image and max(node.image.size)>192:node.image.scale(192,192)
 blend=(root/'.qa-dist/town-machines-2/candidate.blend' if a.candidate else root/'art-build/town/machines-2.blend');blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(glb)
if a.render:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=900;scene.render.resolution_y=680;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=12;scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('Overcast loader daylight');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.54,.56,.55,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.78
 lights=[]
 for loc,power,size in [((7,-8,12),2600,9),((-6,-2,7),1100,8)]:bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;lights.append((l,Vector(loc)))
 bpy.ops.mesh.primitive_plane_add(size=500,location=(0,0,-.06));g=bpy.context.object;g.name='temporary floor';mat=bpy.data.materials.new('dust ground');mat.diffuse_color=(.24,.23,.20,1);g.data.materials.append(mat)
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
    joints['loader:arms'].rotation_euler[0]=0 if pose=='rest' else -.32;joints['loader:bucket'].rotation_euler[0]=0 if pose=='rest' else .24
   elif name=='mixer-truck':
    joints['mixer-truck:drum'].rotation_euler[1]=0 if pose=='rest' else 1.0;joints['mixer-truck:chute'].rotation_euler[0]=0 if pose=='rest' else -.55
   elif name=='roller':joints['roller:drum'].rotation_euler[0]=0 if pose=='rest' else .65
   elif name=='paver':joints['paver:screed'].rotation_euler[0]=0 if pose=='rest' else -.24
   elif name=='drill-rig':
    joints['drill-rig:mast'].rotation_euler[0]=0 if pose=='rest' else .22;joints['drill-rig:string'].location.z=4.35 if pose=='rest' else 2.95
   elif name=='crane-truck':
    joints['crane-truck:boom'].rotation_euler[0]=0 if pose=='rest' else -.45;joints['crane-truck:hook'].location.z=1.12 if pose=='rest' else .57
   elif name=='pipe-truck':
     for index in range(1,6):
      pipe=joints[f'pipe-truck:pipe-{index}'];pipe.rotation_euler[1]=0 if pose=='rest' or index!=1 else -.78
   target=origin+Vector((0,-1.0,3.2 if name=='drill-rig' else 1.8))
   for light,offset in lights:light.location=origin+offset;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
   view_scale=1.0 if name=='loader' else .67 if name in ('mixer-truck','roller','paver','pipe-truck') else 1.62 if name=='drill-rig' else .82
   bpy.ops.object.camera_add(location=target+Vector((8,-8.65,2.5))*view_scale);cam=bpy.context.object;cam.data.lens=43;aim(cam,target);scene.camera=cam;scene.render.filepath=str(ev/f'{name}-{pose}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 print('Rendered all seven machines at rest and work poses from imported GLB')
print('exported',glb,glb.stat().st_size)
