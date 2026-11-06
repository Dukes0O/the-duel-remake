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
m=town.make_materials({'rusted-steel':tx/'machine-wear.jpg','galvanised-tin':tx/'machine-wear.jpg','iron-dark':tx/'machine-wear.jpg','faded-hand-paint':tx/'yellow-green-paint.jpg','sand':tx/'dirt.jpg'})
def shade_picture(material_name,value,saturation,tint=(1,1,1)):
 mat=m[material_name];image=next(node.image for node in mat.node_tree.nodes if node.type=='TEX_IMAGE');pixels=np.empty(image.size[0]*image.size[1]*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape((image.size[1],image.size[0],4));rgb=pixels[:,:,:3];lum=rgb[:,:,0:1]*.30+rgb[:,:,1:2]*.59+rgb[:,:,2:3]*.11;rgb[:]=np.clip((lum+(rgb-lum)*saturation)*value*np.asarray(tint,dtype=np.float32)[None,None,:],0,1);image.pixels.foreach_set(pixels.ravel());image.pack()
shade_picture('rusted-steel',.58,.68,(.90,.82,.70));shade_picture('faded-hand-paint',.56,.68,(.94,.90,.74));shade_picture('galvanised-tin',.60,.72);shade_picture('iron-dark',.24,.38,(.84,.82,.78));shade_picture('sand',.88,.92,(1,.78,.58))
for v in m.values():v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.29,v.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
loader_enamel=bpy.data.materials.new('Loader / faded olive enamel');loader_enamel.diffuse_color=(.10,.12,.04,1);loader_enamel.use_nodes=True
loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.10,.12,.04,1);loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.16;loader_enamel.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.78
steel=m['rusted-steel'];tin=m['galvanised-tin'];paint=m['faded-hand-paint'];black=m['iron-dark'];glass=m['dirty-glass']
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
 if bevel:mod=o.modifiers.new('worn plate edges','BEVEL');mod.width=bevel;mod.segments=1;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 if par:parent(o,par)
 return o
def beam(n,a,b,r,mat=steel,par=None):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);o.data.uv_layers.active.name='UVMap'
 if par:parent(o,par)
 return o
def box_beam(n,a,b,width,height,mat=steel,par=None,bevel=.03):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cube_add(size=1,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.dimensions=(width,height,d.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 if bevel:mod=o.modifiers.new('rolled welded edges','BEVEL');mod.width=bevel;mod.segments=1;o.modifiers.new('weighted plate normals','WEIGHTED_NORMAL')
 o.data.uv_layers.active.name='UVMap'
 if par:parent(o,par)
 return o
def wheel(n,x,y,z,r,w,par):
 # Continuous carcass with moulded chevrons, based on the accepted machines-1 tyre.
 seg,rings=24,8;verts=[];faces=[]
 for i in range(seg):
  theta=math.tau*i/seg
  for j in range(rings):
   phi=math.tau*j/rings;across=abs((phi-math.pi/2+math.pi)%(math.tau)-math.pi);pitch=math.tau/12;sweep=(phi-math.pi/2)*.60;delta=(theta-sweep+math.pi)%(math.tau)-math.pi;dist=abs((delta+pitch/2)%pitch-pitch/2);lug=.13*max(0,1-dist/.20)*max(0,1-across/.82) if dist<.20 else 0;radius=r*.78+r*.22*math.sin(phi)+lug;verts.append((x+w*.5*math.cos(phi),y+radius*math.sin(theta),z+radius*math.cos(theta)))
 for i in range(seg):
  for j in range(rings):
   q=i*rings+j;faces.append((q,((i+1)%seg)*rings+j,((i+1)%seg)*rings+(j+1)%rings,i*rings+(j+1)%rings))
 mesh=bpy.data.meshes.new(n+' continuous chevron tyre');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(n+' molded rubber carcass',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black);parent(o,par);uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index;uv.data[li].uv=(verts[vi][1]/2,verts[vi][0]/2)
 for side in (-1,1):
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r*.59,depth=w*.50,location=(x+side*w*.29,y,z),rotation=(0,math.pi/2,0));rim=bpy.context.object;rim.name=n+' dirty painted steel rim';rim.data.materials.append(paint);rim.data.uv_layers.active.name='UVMap';parent(rim,par)
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
 box(id+' dark windscreen',(x,y-.69,z+.99),(1.02,.025,1.16),glass,par,.012);box(id+' rear cab glazing',(x,y+.69,z+.99),(1.00,.025,1.14),glass,par,.012)
 for s in (-1,1):box(id+' dark side glazing',(x+s*.55,y,z+1.00),(.025,1.14,1.08),glass,par,.012)
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
 # The loader receives the full authored treatment; these companion originals
 # have distinct chassis, silhouettes and card-required moving assemblies.
 root=empty('town-machines-2',(0,0,0));loader,arms,bucket=articulated_loader();parent(loader,root)
 def road_truck(id,length=6.1):
  r=empty(id,(0,0,0),root)
  for side in (-1,1):box(id+' ladder frame rail',(side*.72,0,.70),(.22,length,.42),black,r,.055)
  for yy in (-length*.38,-length*.16,length*.08,length*.30,length*.42):box(id+' chassis crossmember',(0,yy,.68),(1.55,.20,.30),steel,r,.035)
  cab(id,r,0,-length*.23,1.30)
  box(id+' olive engine bonnet',(0,-length*.36,1.38),(1.66,1.55,.80),paint,r,.12)
  box(id+' dark radiator grille',(0,-length*.36-.79,1.34),(.92,.035,.50),black,r,.035)
  for x in (-.33,-.22,-.11,0,.11,.22,.33):box(id+' radiator slat '+str(x),(x,-length*.36-.815,1.34),(.035,.025,.43),tin,r,.009)
  for s in (-1,1):
   box(id+' headlamp',(s*.65,-length*.36-.82,1.64),(.22,.09,.18),tin,r,.045)
   box(id+' front mudguard',(s*1.02,-length*.28,.95),(.20,1.55,.16),steel,r,.04)
   box(id+' side fuel tank',(s*.88,.42,.94),(.28,1.05,.45),tin,r,.06)
   box(id+' side step',(s*1.08,-.82,.77),(.20,.88,.12),black,r,.025)
  box(id+' front bumper',(0,-length*.36-1.02,.72),(2.35,.22,.25),steel,r,.07)
  for yy in (-length*.32,length*.18,length*.34):tyre_pair(id,r,yy,.48)
  return r
 mixer=road_truck('mixer-truck',7.2);dr=empty('mixer-truck:drum',(0,.72,2.05),mixer)
 profile=[(-1.55,.57),(-1.34,.76),(-1.02,.90),(.82,.90),(1.18,.79),(1.48,.62)];segments=32;verts=[];faces=[]
 for yy,radius in profile:
  for j in range(segments):
   angle=math.tau*j/segments;verts.append((math.cos(angle)*radius,.72+yy,2.05+math.sin(angle)*radius))
 for ring_index in range(len(profile)-1):
  for j in range(segments):q=ring_index*segments+j;faces.append((q,ring_index*segments+(j+1)%segments,(ring_index+1)*segments+(j+1)%segments,(ring_index+1)*segments+j))
 dm=bpy.data.meshes.new('mixer rolled tapered drum');dm.from_pydata(verts,[],faces);dm.update();dobj=bpy.data.objects.new('mixer rolled tapered drum',dm);bpy.context.collection.objects.link(dobj);dm.materials.append(paint);duv=dm.uv_layers.new(name='UVMap')
 for poly in dm.polygons:
  for li in poly.loop_indices:
   vi=dm.loops[li].vertex_index;duv.data[li].uv=((vi%segments)/segments,(vi//segments)/(len(profile)-1))
 parent(dobj,dr)
 cap_verts=[];cap_faces=[];cap_rings=((profile[0][0],profile[0][1],-1),(profile[-1][0],profile[-1][1],1))
 for yy,radius,direction in cap_rings:
  center=len(cap_verts);cap_verts.append((0,.72+yy,2.05));start=len(cap_verts)
  for j in range(segments):angle=math.tau*j/segments;cap_verts.append((math.cos(angle)*radius,.72+yy,2.05+math.sin(angle)*radius))
  for j in range(segments):tri=(center,start+j,start+(j+1)%segments);cap_faces.append(tri if direction>0 else tuple(reversed(tri)))
 cm=bpy.data.meshes.new('mixer drum end plates');cm.from_pydata(cap_verts,[],cap_faces);cm.update();caps=bpy.data.objects.new('mixer drum end plates',cm);bpy.context.collection.objects.link(caps);cm.materials.append(steel);cuv=cm.uv_layers.new(name='UVMap')
 for poly in cm.polygons:
  for li in poly.loop_indices:
   co=cap_verts[cm.loops[li].vertex_index];cuv.data[li].uv=(co[0]/2,co[2]/2)
 parent(caps,dr)
 for yy,radius in ((-.98,.905),(.78,.905)):
  bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=radius,minor_radius=.045,location=(0,.72+yy,2.05),rotation=(math.pi/2,0,0));ring=bpy.context.object;ring.name='mixer drum rolled strengthening band';ring.data.materials.append(steel);ring.data.uv_layers.active.name='UVMap';parent(ring,dr)
 chute=empty('mixer-truck:chute',(.70,2.04,1.72),mixer)
 box('mixer discharge chute',(.92,2.58,1.39),(.42,1.10,.12),tin,chute,.035)
 for side in (-1,1):box('mixer chute side flange',(.92+side*.22,2.58,1.56),(.06,1.10,.34),steel,chute,.025)
 beam('mixer chute pivot rod',(.32,2.04,1.72),(1.08,2.04,1.72),.07,black,mixer)
 beam('mixer chute support link',(.45,1.82,1.50),(.86,2.34,1.56),.045,steel,mixer)
 roller=empty('roller',(0,0,0),root)
 box('roller rear engine housing',(0,1.08,1.42),(2.08,2.05,.92),paint,roller,.18)
 box('roller operator platform',(0,-.02,1.16),(1.75,1.52,.22),steel,roller,.07)
 for s in (-1,1):
  beam('roller canopy front post',(s*.62,.05,1.25),(s*.62,.05,3.15),.055,steel,roller)
  beam('roller canopy rear post',(s*.62,1.12,1.25),(s*.62,1.12,3.15),.055,steel,roller)
 box('roller sun canopy',(0,.58,3.15),(1.55,1.42,.12),tin,roller,.04)
 box('roller operator seat',(0,.68,1.65),(.52,.46,.50),black,roller,.09)
 drum=empty('roller:drum',(0,-1.65,.94),roller)
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.94,depth=2.02,location=(0,-1.65,.94),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='roller steel drum';o.data.materials.append(tin);o.data.uv_layers.active.name='UVMap';parent(o,drum)
 for s in (-1,1):
  bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.82,depth=.025,location=(s*1.03,-1.65,.94),rotation=(0,math.pi/2,0));cap=bpy.context.object;cap.name='roller drum end plate';cap.data.materials.append(black);parent(cap,drum)
  box('roller drum scraper blade',(s*.72,-.57,1.06),(.14,.16,.62),steel,roller,.035)
 beam('roller drum welded seam',(-.96,-1.65,1.88),(.96,-1.65,1.88),.035,tin,drum)
 tyre_pair('roller',roller,1.55,.65)
 paver=empty('paver',(0,0,0),root);box('paver main chassis',(0,.10,1.22),(2.30,2.92,.94),black,paver,.10)
 for s in (-1,1):
  box('paver continuous track carcass',(s*1.25,.08,.52),(.46,3.35,.58),black,paver,.14)
  for yy in (-1.05,-.35,.35,1.05):wheel('paver road roller',s*1.34,yy,.55,.31,.28,paver)
  box('paver track top guard',(s*1.25,.05,.88),(.44,2.95,.15),steel,paver,.035)
 cab('paver',paver,0,.78,1.78)
 box('paver feed hopper rear wall',(0,-1.46,1.68),(2.25,.14,.95),tin,paver,.05)
 box('paver feed hopper side left',(-1.05,-1.04,1.72),(.16,.92,.93),steel,paver,.035)
 box('paver feed hopper side right',(1.05,-1.04,1.72),(.16,.92,.93),steel,paver,.035)
 box('paver hopper nose',(0,-1.88,1.70),(2.14,.18,.74),paint,paver,.05)
 box('paver paving screed',(0,1.91,.68),(3.40,.55,.24),steel,paver,.045)
 drill=road_truck('drill-rig',7);mast=empty('drill-rig:mast',(0,1.1,1.10),drill)
 beam('drill mast welded spine',(0,1.1,1.10),(0,1.2,5.65),.15,paint,mast)
 for side in (-1,1):
  beam('drill mast side stile',(side*.58,1.1,1.10),(side*.58,1.2,5.4),.075,steel,mast)
  for height in (1.55,2.1,2.65,3.2,3.75,4.3,4.85):beam('drill mast ladder rung '+str(height),(-.58,1.16,height),(.58,1.16,height),.035,tin,mast)
 beam('drill mast crown pulley axle',(-.68,1.2,5.5),(.68,1.2,5.5),.11,steel,mast)
 string=empty('drill-rig:string',(0,.78,5.45),mast);beam('drill steel string',(0,.78,5.45),(0,.78,3.35),.07,tin,string)
 crane=road_truck('crane-truck',7)
 box('crane slew platform',(0,.80,1.18),(1.62,1.32,.30),steel,crane,.08)
 box('crane boom pedestal',(0,.80,2.16),(.88,.92,1.72),paint,crane,.10)
 for side in (-1,1):beam('crane boom pedestal brace',(side*.70,.80,1.42),(side*.39,.80,3.12),.10,steel,crane)
 boom=empty('crane-truck:boom',(0,.80,3.25),crane)
 box_beam('crane telescopic outer boom',(0,.80,3.25),(0,-1.85,4.01),.46,.40,paint,boom,.055)
 box_beam('crane sliding inner boom',(0,-1.25,3.84),(0,-3.15,4.37),.27,.25,tin,boom,.035)
 beam('crane lift ram barrel',(0,1.10,2.45),(0,-.60,3.25),.12,steel,boom);beam('crane lift ram chrome rod',(0,-.18,3.12),(0,-1.20,3.60),.055,tin,boom)
 for side in (-1,1):
  box_beam('crane stabilizer outrigger',(side*.82,.80,.72),(side*1.68,.80,.72),.14,.18,steel,crane,.02)
  box('crane stabilizer ground pad',(side*1.68,.80,.12),(.40,.42,.14),black,crane,.04)
 hook=empty('crane-truck:hook',(0,-3.15,4.37),boom);beam('crane hoist cable',(0,-3.15,4.37),(0,-3.15,2.87),.025,black,hook);box('crane forged hook',(0,-3.15,2.79),(.16,.20,.28),tin,hook,.06)
 pipes=road_truck('pipe-truck',7.2);box('pipe truck flatbed',(0,.55,1.35),(2.1,4.0,.20),steel,pipes,.04)
 for i in range(5):
  y=-.85+i*.58
  pipe_node=empty('pipe-truck:pipe-'+str(i+1),(0,y,1.64),pipes)
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.18,depth=1.8,location=(0,y,1.64),rotation=(0,math.pi/2,0));q=bpy.context.object;q.name='pipe-truck salvaged pipe '+str(i+1);q.data.materials.append(tin);q.data.uv_layers.active.name='UVMap';parent(q,pipe_node)
 # Place roots only after every part is attached. Each machine then keeps its
 # own local origin when a consumer clones it out of this family row.
 mixer.location.x=11;roller.location.x=22;paver.location.x=33;drill.location.x=44;crane.location.x=55;pipes.location.x=66
 return root
family=basic_family();bpy.context.view_layer.update()
# Merge the many static salvage pieces into one mesh per rigid assembly. This
# keeps the exported family compact while leaving every named moving joint.
joint_names={'loader:front-frame','loader:rear-frame','loader:arms','loader:bucket','mixer-truck:drum','mixer-truck:chute','roller:drum','drill-rig:mast','drill-rig:string','crane-truck:boom','crane-truck:hook',*(f'pipe-truck:pipe-{i}' for i in range(1,6))}
machine_names={'loader','mixer-truck','roller','paver','drill-rig','crane-truck','pipe-truck'}
triangle_targets={'loader':8000,'mixer-truck':4000,'roller':3500,'paver':3000,'drill-rig':3500,'crane-truck':3000,'pipe-truck':2500}
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
  if len(objects)<2 or owner_name in joint_names:continue
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
  if node.type=='TEX_IMAGE' and node.image and max(node.image.size)>256:node.image.scale(256,256)
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
   elif name=='drill-rig':
    joints['drill-rig:mast'].rotation_euler[0]=0 if pose=='rest' else .12;joints['drill-rig:string'].location.z=4.35 if pose=='rest' else 2.95
   elif name=='crane-truck':
    joints['crane-truck:boom'].rotation_euler[0]=0 if pose=='rest' else -.15;joints['crane-truck:hook'].location.z=1.12 if pose=='rest' else .57
   elif name=='pipe-truck':
    for index in range(1,6):
     pipe=joints[f'pipe-truck:pipe-{index}'];pipe.location.x=0 if pose=='rest' or index!=1 else 2.0;pipe.location.z=1.64 if pose=='rest' or index!=1 else .35
   target=origin+Vector((0,-1.0,1.8))
   for light,offset in lights:light.location=origin+offset;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
   view_scale=1.0 if name=='loader' else .67 if name in ('mixer-truck','roller','paver','pipe-truck') else 1.15 if name=='drill-rig' else .82
   bpy.ops.object.camera_add(location=target+Vector((8,-8.65,2.5))*view_scale);cam=bpy.context.object;cam.data.lens=43;aim(cam,target);scene.camera=cam;scene.render.filepath=str(ev/f'{name}-{pose}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
 print('Rendered all seven machines at rest and work poses from imported GLB')
print('exported',glb,glb.stat().st_size)
