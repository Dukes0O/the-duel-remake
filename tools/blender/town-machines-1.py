"""Original four-machine family for Wasteland town, TOWN-ART-MACHINES-1.

Blender is Z-up; the GLB exporter converts the authored geometry to glTF Y-up.
Run with --root and optionally --render for round evidence, --candidate for a
private GLB under .qa-dist, and --paths-only for a no-write plan.
"""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--candidate',action='store_true');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();glb=root/('.qa-dist/town-machines-1/machines-1.glb' if a.candidate else 'public/assets/models/wasteland/town/machines-1.glb');blend=root/'art-build/town/machines-1.blend';evidence=Path(a.render);evidence=evidence if evidence.is_absolute() else root/evidence
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)] if a.render else []}));raise SystemExit(0)
import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
texture_dir=root/'public/assets/models/wasteland/town/textures'
wear_photo=texture_dir/'machine-wear.jpg';paint_photo=texture_dir/'yellow-green-paint.jpg';soil_photo=texture_dir/'wet-brown-earth.jpg'
for source in (wear_photo,paint_photo,soil_photo):
 if not source.exists():raise FileNotFoundError(source)
mats=town.make_materials({'rusted-steel':wear_photo,'galvanised-tin':wear_photo,'iron-dark':wear_photo,
                         'faded-hand-paint':paint_photo,'sand':soil_photo})
steel=mats['rusted-steel'];paint=mats['faded-hand-paint'];tin=mats['galvanised-tin'];black=mats['iron-dark'];glass=mats['dirty-glass'];rubber=mats['iron-dark'];sand=mats['sand']
# The yard has no bright environment to reflect, so keep every finish matte.
for mat in mats.values():
 bsdf=mat.node_tree.nodes.get('Principled BSDF')
 if bsdf:bsdf.inputs['Metallic'].default_value=min(float(bsdf.inputs['Metallic'].default_value),.3)
def shade_picture(material_name,value,saturation,tint=(1,1,1)):
 mat=mats[material_name];image=next(node.image for node in mat.node_tree.nodes if node.type=='TEX_IMAGE')
 pixels=np.empty(image.size[0]*image.size[1]*4,dtype=np.float32);image.pixels.foreach_get(pixels)
 pixels=pixels.reshape((image.size[1],image.size[0],4));rgb=pixels[:,:,:3]
 luminance=rgb[:,:,0:1]*.30+rgb[:,:,1:2]*.59+rgb[:,:,2:3]*.11
 rgb[:]=np.clip((luminance+(rgb-luminance)*saturation)*value*np.asarray(tint,dtype=np.float32)[None,None,:],0,1)
 image.pixels.foreach_set(pixels.ravel());image.pack()
# The RGB correction is baked into each material's own picture. No shader maths
# is needed at runtime, so these tones survive the GLB export and reimport.
shade_picture('faded-hand-paint',.82,.88)
shade_picture('galvanised-tin',.66,.78)
shade_picture('iron-dark',.24,.38,(.84,.82,.78))
shade_picture('sand',.88,.92,(1,.78,.58))
mats['sand'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.48
def box(name,loc,size,mat=steel,bevel=.035,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  b=o.modifiers.new('worn rolled plate edges','BEVEL');b.width=bevel;b.segments=1;o.modifiers.new('welded plate normals','WEIGHTED_NORMAL')
 if parent: parent_keep(o,parent)
 return o
def parent_keep(o,parent):
 # Mesh coordinates are authored in their immediate part's local space.
 o.parent=parent;o.matrix_parent_inverse.identity()
def reparent_world(o,parent):
 # Use only when moving an already-authored pivot under a new machine part.
 bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent
 o.matrix_parent_inverse.identity();o.matrix_world=world
def empty(name,loc,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc
 if parent:parent_keep(o,parent)
 return o
def cyl(name,loc,radius,depth,mat=steel,axis='X',verts=16,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 if axis=='X':o.rotation_euler[1]=math.pi/2
 elif axis=='Y':o.rotation_euler[0]=math.pi/2
 if parent:parent_keep(o,parent)
 return o
def beam(name,a,b,r,mat=steel,parent=None):
 va,vb=Vector(a),Vector(b);d=vb-va;bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(va+vb)*.5);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 if parent:parent_keep(o,parent)
 return o
def box_beam(name,a,b,width,height,mat=steel,parent=None,bevel=.025):
 # A welded rectangular boom section aligned from anchor to anchor.
 va,vb=Vector(a),Vector(b);d=vb-va
 bpy.ops.mesh.primitive_cube_add(size=1,location=(va+vb)*.5)
 o=bpy.context.object;o.name=name;o.dimensions=(width,height,d.length)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('rolled boxed beam edges','BEVEL');mod.width=bevel;mod.segments=1
  o.modifiers.new('weighted plate normals','WEIGHTED_NORMAL')
 if parent:parent_keep(o,parent)
 return o
def weld(name,a,b,parent=None):return beam(name,a,b,.022,tin,parent)
def uv_surface(mesh,mapper):
 layer=mesh.uv_layers.new(name='physical-scale material mapping')
 for loop in mesh.loops:layer.data[loop.index].uv=mapper(mesh.vertices[loop.vertex_index].co)
def lugged_tyre(name,x,y,z,r,width,parent):
 # Continuous carcass with the chevrons formed into its silhouette, adapted
 # from the accepted Scarab paddle-tyre recipe. X is the axle direction.
 seg,rings=(24,8) if name.startswith('trencher') else (32,10);verts=[];faces=[]
 for i in range(seg):
  theta=math.tau*i/seg
  for j in range(rings):
   phi=math.tau*j/rings;across=abs((phi-math.pi/2+math.pi)%(math.tau)-math.pi)
   pitch=math.tau/12;sweep=(phi-math.pi/2)*.60
   delta=(theta-sweep+math.pi)%(math.tau)-math.pi
   dist=abs((delta+pitch/2)%pitch-pitch/2)
   lug=.095*max(0,1-dist/.18)*max(0,1-across/.82) if dist<.18 else 0
   radius=r*.78+r*.22*math.sin(phi)+lug
   verts.append((x+width*.5*math.cos(phi),y+radius*math.sin(theta),z+radius*math.cos(theta)))
 for i in range(seg):
  for j in range(rings):
   a=i*rings+j;b=((i+1)%seg)*rings+j;c=((i+1)%seg)*rings+(j+1)%rings;d=i*rings+(j+1)%rings;faces.append((a,b,c,d))
 mesh=bpy.data.meshes.new(name+' molded chevron carcass');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name+' continuous chevron tread',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(rubber);parent_keep(o,parent)
 uv=mesh.uv_layers.new(name='metre-scaled tread');
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index;uv.data[li].uv=(verts[vi][1]/2,verts[vi][0]/2)
 for side in (-1,1):
  cyl(name+' dished rim',(x+side*width*.30,y,z),r*.60,width*.42,black,'X',24,parent)
  cyl(name+' sidewall ring',(x+side*width*.39,y,z),r*.53,width*.12,black,'X',24,parent)
  cyl(name+' hub',(x+side*width*.45,y,z),r*.25,width*.10,black,'X',16,parent)
  for i in range(12):
   angle=math.tau*i/12
   cyl(name+f' rim bolt {side} {i}',(x+side*width*.51,y+math.sin(angle)*r*.45,z+math.cos(angle)*r*.45),.025,width*.055,steel,'X',8,parent)

def wheel(name,x,y,z,r,width,parent,drive=False):
 lugged_tyre(name,x,y,z,r,width,parent)
def gear_track(name,x,cy,z0,length,height,parent,width=.60):
 # broad reinforced rubberized loop with a row of unmistakable individual steel shoes
 r=height/2;straight=length/2-r;outline=[(-straight,-r),(straight,-r),(straight,r),(-straight,r)]
 # stadium side band, low-sided extruded mesh in (along,up) plane
 points=[]
 for j in range(20):
  t=math.pi*2*j/20;points.append((math.cos(t)*straight+math.copysign(r,math.cos(t))*0,math.sin(t)*r))
 # Use a rounded rectangular loop contour with 8 points per end.
 path=[]
 for cx,ang0 in ((straight,-math.pi/2),(-straight,math.pi/2)):
  for j in range(9):
   ang=ang0+math.pi*j/8;path.append((cx+math.cos(ang)*r,math.sin(ang)*r))
 path=path[:9]+path[9:]
 verts=[]
 for xx,zz in path:verts.extend([(x-width/2,cy+xx,z0+zz),(x+width/2,cy+xx,z0+zz)])
 faces=[]
 for i in range(len(path)):
  n=(i+1)%len(path);faces.append((2*i,2*n,2*n+1,2*i+1))
 mesh=bpy.data.meshes.new(name+' forged loop mesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name+' heavy track belt',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black);parent_keep(o,parent)
 for side in (-1,1):
  rail=bpy.data.curves.new(name+' side chain rail','CURVE');rail.dimensions='3D';rail.resolution_u=1;rail.bevel_depth=.035;rail.bevel_resolution=1
  spline=rail.splines.new('POLY');spline.points.add(len(path)-1)
  for pnt,(xx,zz) in zip(spline.points,path):pnt.co=(x+side*width*.44,cy+xx,z0+zz,1)
  spline.use_cyclic_u=True;rail_obj=bpy.data.objects.new(name+(' left' if side<0 else ' right')+' continuous side rail',rail);bpy.context.collection.objects.link(rail_obj);rail_obj.data.materials.append(black);parent_keep(rail_obj,parent)
 for i,(xx,zz) in enumerate(path):
  # plate orientation around loop, every shoe follows the curve
  cap_center=math.copysign(straight,xx) if abs(xx)>straight else 0
  radial=math.atan2(zz,xx-cap_center);ang=radial+math.pi/2
  shoe=box(name+f' shoe {i:02d}',(x,cy+xx,z0+zz),(width*.96,.37,.055),black,0,parent)
  shoe.rotation_euler[0]=ang
  bar=box(name+f' raised grouser {i:02d}',(x,cy+xx+math.cos(radial)*.05,z0+zz+math.sin(radial)*.05),(width*.96,.12,.07),black,0,parent);bar.rotation_euler[0]=ang
  cyl(name+f' shoe pin {i:02d}',(x-width*.51,cy+xx,z0+zz),.035,.04,tin,'X',8,parent)
 # Continuous steel frame, drive sprocket, front idler and real running rollers.
 box(name+' heavy track frame',(x,cy,z0-.02),(.42,length*.69,.33),black,.07,parent)
 for end,label in ((-straight,'drive sprocket'),(straight,'front idler')):
  cyl(name+' '+label,(x,cy+end,z0),r*.78,width*.80,black,'X',24,parent)
  cyl(name+' '+label+' dark hub',(x-width*.43,cy+end,z0),r*.36,.08,black,'X',16,parent)
 for i in range(5):
  yy=cy-length*.27+i*length*.135
  cyl(name+f' bottom road roller {i}',(x,yy,z0-r*.25),r*.30,width*.64,black,'X',18,parent)
 for i in range(2):
  yy=cy-length*.18+i*length*.36
  cyl(name+f' top return roller {i}',(x,yy,z0+r*.66),r*.16,width*.44,steel,'X',14,parent)

def tractor(prefix,root):
 # Narrow agricultural donor proportions: long bonnet, open rear wheel stance.
 box(prefix+' pressed chassis',(0,.10,1.02),(1.45,3.55,.38),black,.08,root)
 box(prefix+' engine bonnet',(0,-.92,1.72),(1.34,1.60,1.05),paint,.20,root)
 hood=box(prefix+' hood crown',(0,-1.02,2.22),(1.05,1.23,.12),tin,.045,root);hood.rotation_euler[0]=-.06
 box(prefix+' radiator grille',(0,-1.76,1.76),(.82,.08,.75),black,.035,root)
 for x in (-.31,-.16,0,.16,.31):box(prefix+f' grille rib {x}',(x,-1.815,1.76),(.035,.025,.62),tin,.012,root)
 for x in (-.70,.70):
  box(prefix+' headlamp mounting plate',(x,-1.72,2.06),(.30,.12,.30),black,.035,root)
  cyl(prefix+' headlamp',(x,-1.83,2.06),.14,.11,glass,'Y',16,root)
  cyl(prefix+' lamp rim',(x,-1.89,2.06),.17,.05,tin,'Y',16,root)
  box(prefix+' bent rear fender',(x,.83,1.59),(.38,1.62,.11),steel,.06,root)
  # 1.7 m rear wheels and 1 m steering wheels, matching a farm tractor.
  wheel(prefix+' large rear wheel',x,1.02,.86,.85,.38,root)
  wheel(prefix+' small front wheel',x,-1.08,.52,.50,.30,root)
 # seat and open rollover hoop
 box(prefix+' sprung seat',(0,.47,1.60),(.55,.48,.20),black,.07,root)
 beam(prefix+' steering column',(0,-.15,1.86),(0,-.38,2.20),.05,black,root)
 cyl(prefix+' steering wheel',(0,-.39,2.20),.24,.035,black,'Y',20,root)
 for x in (-.54,.54):
  beam(prefix+' ROPS upright',(x,.66,1.44),(x,.95,3.23),.055,tin,root)
  beam(prefix+' ROPS roof rail',(x,.95,3.23),(x,-.12,3.23),.055,steel,root)
 box(prefix+' rain roof',(0,.40,3.28),(1.45,1.25,.11),paint,.07,root)
 # exhaust, muffler, fuel can and plate repairs
 cyl(prefix+' exhaust stack',(.47,-.71,2.70),.085,.92,black,'Z',12,root)
 cyl(prefix+' exhaust rain cap',(.47,-.71,3.18),.13,.08,steel,'Z',12,root)
 box(prefix+' welded bonnet patch',(.49,-.40,2.18),(.24,.58,.07),steel,.022,root)
 for x in (-.69,.69):
  for y in (-.43,.25):cyl(prefix+' fender rivet',(x,y,1.61),.038,.06,tin,'X',8,root)
def trencher(root):
 tractor('trencher tractor',root)
 # Add a proper protective cab around the tractor's existing cab opening.
 cabmat=glass
 for side in (-1,1):
  beam('trencher cab post '+str(side),(side*.58,-.14,1.58),(side*.58,-.14,3.10),.035,steel,root)
  beam('trencher cab rear post '+str(side),(side*.58,.78,1.58),(side*.58,.78,3.10),.035,steel,root)
  beam('trencher cab side sill '+str(side),(side*.58,-.14,1.62),(side*.58,.78,1.62),.028,tin,root)
  box('trencher cab side glazing '+str(side),(side*.57,.30,2.34),(.025,.78,1.28),cabmat,.008,root)
  for i in range(7):beam('trencher cab mesh guard '+str(side)+' '+str(i),(side*.60,-.10+i*.14,1.72),(side*.60,-.10+i*.14,3.02),.009,black,root)
 for z in (1.76,2.02,2.28,2.54,2.80,3.06):beam('trencher cab mesh horizontal '+str(z),(-.60,-.17,z),(.60,-.17,z),.009,black,root)
 # Four-metre rear boom has two formed cheek plates, a chain and a side spoil chute.
 box('trencher three point hitch',(0,1.67,.83),(.72,.42,.55),steel,.06,root)
 chute=box('trencher side dirt chute',(.93,1.25,1.50),(.55,1.75,.25),tin,.08,root);chute.rotation_euler[0]=-.18
 for i in range(4):beam(f'trencher chute brace {i}',(.59,.60+i*.28,1.55),(1.13,.66+i*.27,1.62),.028,steel,root)
 boom=empty('trencher:boom',(0,1.82,1.02),root)
 box_beam('trencher boom near cheek',(-.34,0,.03),(-.34,3.85,-.42),.10,.46,paint,boom,.018)
 box_beam('trencher boom far cheek',(.34,0,.03),(.34,3.85,-.42),.10,.46,steel,boom,.018)
 box_beam('trencher boom cross head',(-.36,0,.03),(.36,0,.03),.11,.50,steel,boom,.02)
 for i in range(12):
  t=i/11;y=t*3.85;z=.03-t*.45
  beam(f'trencher chain cross pin {i}',(-.35,y,z),(.35,y,z),.045,tin,boom)
  for side in (-1,1):box(f'trencher digging tooth {i} {side}',(side*.36,y,z-.065),(.13,.17,.11),steel,.02,boom)
 # separate rotating chain node, pivot at drive sprocket centre
 chain=empty('trencher:chain',(0,0,0),boom);chain.location=(0,0,.07)
 links=[]
 for i in range(32):
  ang=math.tau*i/32;links.append((1.91+1.91*math.cos(ang),.02+.36*math.sin(ang)))
 for i,(yy,zz) in enumerate(links):
  nxt=links[(i+1)%len(links)];direction=math.atan2(nxt[1]-zz,nxt[0]-yy)
  for x in (-.40,.40):
   shoe=box(f'trencher chain forged link {i} {x}',(x,yy,zz),(.18,.21,.055),black,.012,chain);shoe.rotation_euler[0]=direction
   if i%3==0:
    tooth=box(f'trencher chain replaceable tooth {i} {x}',(x,yy,zz-.07),(.12,.10,.095),tin,.018,chain);tooth.rotation_euler[0]=direction
 # Paired aircraft landing-gear rams tie chassis and moving boom at its pins.
 for side in (-1,1):
  beam('trencher hydraulic barrel',(side*.42,1.28,1.35),(side*.42,2.43,1.12),.10,steel,root)
  beam('trencher polished piston',(side*.42,.61,.10),(side*.42,1.20,-.08),.045,tin,boom)
 # Build poses rotate at pivot around X, matching the lateral hinge.
 return boom,chain

def excavator(root):
 # 4.6 m undercarriage, 3 m overall width, 0.6 m shoes and 0.9 m belt height.
 for x in (-1.20,1.20):gear_track('excavator track '+str(x),x,.25,.90,4.60,.90,root,.60)
 box('excavator lower carbody',(0,.38,1.43),(2.05,2.82,.55),black,.12,root)
 box('excavator low swing deck',(0,.12,1.73),(2.45,2.60,.32),steel,.13,root)
 box('excavator engine counterweight',(0,1.22,2.08),(2.08,1.20,.72),paint,.19,root)
 box('excavator rear counterweight cap',(0,1.80,2.20),(1.82,.24,.42),steel,.12,root)
 cyl('excavator turntable bearing',(0,.12,1.88),.90,.22,black,'Z',32,root)
 cyl('excavator bearing ring',(0,.12,2.00),.84,.08,tin,'Z',32,root)
 cab=empty('excavator:cab',(-.64,-.34,1.96),root)
 # Real 1 m wide cab, offset to the left of the boom; open posts and glass.
 box('excavator cab lower tub',(0,0,.70),(1.0,1.48,.82),paint,.09,cab)
 box('excavator cab roof',(0,-.02,1.60),(1.14,1.65,.12),steel,.05,cab)
 box('excavator front glass',(0,-.755,1.14),(.77,.025,.88),glass,.012,cab)
 for x in (-.46,.46):beam('excavator cab front pillar',(x,-.78,.78),(x,-.70,1.66),.035,steel,cab)
 for y in (-.68,.68):beam('excavator cab side pillar',(x if y>0 else -.48,y,.78),(x if y>0 else -.48,y,1.65),.032,tin,cab)
 box('excavator side door',(.51,.02,1.16),(.035,.84,.92),paint,.022,cab)
 box('excavator door glass',(.535,.02,1.42),(.02,.56,.46),glass,.01,cab)
 for i in range(5):beam('excavator cab door mesh',(.55,-.38+i*.18,.96),(.55,-.38+i*.18,1.63),.009,steel,cab)
 for i in range(4):beam('excavator cab mesh cross',(.55,-.38,.98+i*.19),(.55,.34,.98+i*.19),.009,steel,cab)
 box('excavator driver seat',(-.06,.14,.92),(.44,.46,.18),black,.05,cab)
 beam('excavator joystick',(.27,.35,.90),(.27,.28,1.20),.025,black,cab)
 boom=empty('excavator:boom',(0,-.24,.72),root)
 # Long bent boom built from plated sections: 5.7 m to the dipper pin.
 box_beam('excavator boom main tapered box',(0,0,0),(0,-4.70,.62),.62,.82,paint,boom,.055)
 box_beam('excavator boom bent upper section',(0,-4.20,.58),(0,-5.55,1.20),.42,.56,steel,boom,.045)
 box_beam('excavator boom left welded cheek',(-.34,-.04,.08),(-.23,-5.38,1.0),.045,.72,tin,boom,.018)
 box_beam('excavator boom right welded cheek',(.34,-.04,.08),(.23,-5.38,1.0),.045,.72,tin,boom,.018)
 arm=empty('excavator:arm',(0,-5.50,1.12),boom)
 # 2.9 m dipper with a visible dog-leg and a compact 1 m toothed bucket.
 box_beam('excavator dipper tapered steel box',(0,0,0),(0,-2.34,-1.65),.38,.50,paint,arm,.035)
 box_beam('excavator dipper welded spine',(0,-.10,.10),(0,-2.25,-1.52),.055,.36,steel,arm,.015)
 bucket=empty('excavator:bucket',(0,-2.34,-1.65),arm)
 # Rounded scoop shell from faceted formed plates, cheeks, cutting lip and teeth.
 box('excavator bucket back',(0,-.18,-.20),(.84,.30,.62),steel,.10,bucket)
 for x in (-.39,.39):
  cheek=box('excavator bucket side cheek',(x,-.24,-.42),(.12,.72,.62),paint,.07,bucket);cheek.rotation_euler[0]=-.30
 box('excavator bucket cutting lip',(0,-.57,-.58),(.98,.24,.13),steel,.025,bucket)
 for i in range(5):
  x=-.36+i*.18;tooth=box('excavator bucket tooth '+str(i),(x,-.70,-.61),(.10,.27,.085),tin,.02,bucket);tooth.rotation_euler[0]=-.12
 # real hinge pins and visible hydraulic cylinders follow component hierarchy
 cyl('excavator boom hinge pin',(0,0,0),.19,.54,tin,'X',20,boom)
 cyl('excavator arm hinge pin',(0,-5.50,1.12),.15,.48,tin,'X',20,boom)
 cyl('excavator bucket hinge pin',(0,0,0),.14,.54,tin,'X',18,bucket)
 for side in (-1,1):
  beam('excavator boom ram barrel',(side*.42,-.05,1.65),(side*.42,-1.12,1.48),.105,steel,root)
  beam('excavator ram chrome rod',(side*.42,-.88,.76),(side*.42,-1.52,.93),.043,tin,boom)
  beam('excavator arm ram barrel',(side*.32,-.60,.42),(side*.32,-5.35,1.05),.085,steel,boom)
  beam('excavator arm chrome rod',(side*.32,0,0),(side*.32,.78,.08),.038,tin,arm)
  beam('excavator bucket ram',(side*.29,-.46,.16),(side*.29,-2.30,-1.45),.067,steel,arm)
  beam('excavator bucket rod',(side*.29,0,0),(side*.29,.68,.10),.032,tin,bucket)
 # Flexible dark hoses loop from the swing house, follow the boom and turn at
 # the arm; the two runs have real bends rather than painted stripes.
 for side in (-1,1):
  pts=[(side*.34,-.20,.88),(side*.36,-.85,1.20),(side*.36,-1.55,1.13),(side*.36,-2.10,.96),(side*.36,-3.65,.78),(side*.36,-5.15,.95)]
  curve=bpy.data.curves.new('excavator boom hydraulic hose','CURVE');curve.dimensions='3D';curve.bevel_depth=.035;curve.bevel_resolution=2
  spline=curve.splines.new('POLY');spline.points.add(len(pts)-1)
  for pnt,co in zip(spline.points,pts):pnt.co=(*co,1)
  hose=bpy.data.objects.new('excavator black pressure hose',curve);bpy.context.collection.objects.link(hose);hose.data.materials.append(black);parent_keep(hose,boom)
 # roof handrail, exhaust, tie-down lugs, undercarriage sand guards
 cyl('excavator exhaust stack',(.62,1.10,2.56),.08,.55,black,'Z',12,root)
 for i in range(7):box('excavator counterweight vent '+str(i),(-.66+i*.22,1.82,1.55),(.10,.03,.22),black,.02,root)
 return cab,boom,arm,bucket

def dump_truck(root):
 box('dump truck ladder frame',(0,.18,1.16),(2.35,7.30,.42),black,.12,root)
 box('dump truck front axle',(0,-2.55,.88),(3.00,.34,.24),steel,.05,root)
 box('dump truck rear bogie',(0,2.02,.86),(3.04,.58,.34),steel,.07,root)
 # six industrial tyres, two steering and four tandem rear. Deep shoulder tread blocks.
 for side in (-1,1):
  for i,y in enumerate((-2.50,1.35,2.68)):
   wheel(f'dump truck wheel {side} {i}',side*1.30,y,.86,.80,.46,root)
 # forward control cab with a tapering rounded hood, radiator, screen and hand rails
 box('dump truck cab lower sill',(0,-2.23,1.78),(1.88,1.52,.86),paint,.14,root)
 box('dump truck long bonnet',(0,-3.04,1.82),(2.00,1.42,.72),paint,.22,root)
 box('dump truck bonnet top pressed panel',(0,-3.00,2.20),(1.63,1.20,.09),steel,.045,root)
 box('dump truck grille',(0,-3.69,1.78),(1.32,.08,.58),black,.045,root)
 for x in (-.55,-.33,-.11,.11,.33,.55):box('dump truck radiator bar '+str(x),(x,-3.75,1.78),(.045,.035,.49),tin,.015,root)
 for side in (-1,1):
  beam('dump truck narrow cab post',(side*.70,-2.90,1.96),(side*.66,-2.83,2.88),.045,steel,root)
  beam('dump truck narrow cab rear post',(side*.70,-1.58,1.96),(side*.70,-1.58,2.88),.045,tin,root)
  box('dump truck windshield',(side*.34,-2.85,2.42),(.60,.035,.82),glass,.02,root).rotation_euler[1]=side*.08
  beam('dump truck cab roof rail',(side*.70,-2.90,2.88),(side*.70,-1.58,2.88),.045,steel,root)
  beam('dump truck mirror stalk',(side*.75,-2.48,2.28),(side*1.08,-2.62,2.57),.035,tin,root)
  box('dump truck mirror',(side*1.08,-2.65,2.60),(.20,.08,.28),steel,.03,root)
  box('dump truck cab side glass',(side*.72,-2.18,2.43),(.035,.77,.72),glass,.012,root)
  box('dump truck cab rear glass',(side*.24,-1.43,2.42),(.42,.025,.70),glass,.01,root)
  for y in (-3.18,-2.76):cyl('dump truck headlamp',(side*.84,y,1.88),.14,.07,glass,'Y',12,root)
  box('dump truck step',(side*1.10,-1.90,1.18),(.22,.82,.09),tin,.025,root)
 # tip body: hinged at rear, polygonal tray with sloped front bulkhead and folded side ribs
 bed=empty('dump-truck:bed',(0,3.10,1.45),root)
 # local bed origin is the actual rear hinge pin, all steel is forward (negative y)
 box('dump tray floor',(0,-1.20,.30),(2.55,4.50,.18),steel,.06,bed)
 for side in (-1,1):
  # plate panels rise and widen at their upper lips
  verts=[(side*1.22,-3.45,.35),(side*1.22,1.05,.35),(side*1.42,1.05,1.55),(side*1.42,-3.45,1.55),(side*1.25,-3.45,.55),(side*1.25,1.05,.55)]
  mesh=bpy.data.meshes.new('dump tray pressed side');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();uv_surface(mesh,lambda v:(v.y/2,v.z/2));obj=bpy.data.objects.new('dump tray rolled side wall',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(paint);parent_keep(obj,bed)
  for i in range(7):
   y=-3.18+i*.68;weld(f'dump tray side rib {side} {i}',(side*1.25,y,.47),(side*1.42,y,1.44),bed)
   cyl(f'dump tray rivet {side} {i}',(side*1.43,y,1.32),.045,.035,tin,'X',8,bed)
 # front bulkhead tapers into the cab guard
 wall=box('dump tray headboard',(0,-3.37,.94),(2.50,.20,1.35),steel,.12,bed);wall.rotation_euler[0]=-.10
 box('dump tray tailgate',(0,1.04,.96),(2.50,.17,1.25),paint,.07,bed)
 for x in (-.70,.70):
  weld('dump tray hinge bracket',(x,1.00,.24),(x,1.38,.14),bed)
  cyl('dump truck rear hinge pin',(x,3.10,1.45),.16,.34,tin,'X',16,root)
 for side in (-1,1):
  beam('dump truck hoist cylinder',(side*.58,1.15,1.29),(side*.58,1.02,2.32),.12,steel,root)
  beam('dump truck hoist polished rod',(side*.58,-2.08,.87),(side*.58,-2.45,1.33),.05,tin,bed)
 # Keep the wet soil local to the load node so it rides the bed and stays inside.
 load=empty('dump-truck:load',(0,-1.20,.30),bed)
 verts=[];grid=tuple(-1+i*.25 for i in range(9))
 for j,y in enumerate(tuple(-1.25+i*.3125 for i in range(9))):
  for i,x in enumerate(grid):
   mound=max(0,1-(x/1.08)**4-(y/1.5)**4)
   z=.16+1.25*mound**.55+(.018*math.sin(i*2.7+j*1.9) if mound else 0)
   verts.append((x,y,z))
 faces=[]
 for j in range(8):
  for i in range(8):
   a=j*9+i;b=a+1;c=a+10;d=a+9;faces.extend(((a,b,c),(a,c,d)))
 mesh=bpy.data.meshes.new('wet brown soil heap');mesh.from_pydata(verts,[],faces);mesh.update();uv_surface(mesh,lambda v:(v.x/2,v.y/2));heap=bpy.data.objects.new('dump load wet brown earth',mesh);bpy.context.collection.objects.link(heap);heap.data.materials.append(sand);parent_keep(heap,load)
 for poly in mesh.polygons:poly.use_smooth=True
 for x in (-.88,.88):
  for y in (-2.28,-1.54,-.80,-.06,.68):box('dump bed longitudinal wear strip',(x,y,.48),(.11,.07,.09),tin,.02,bed)
 return bed,load

def dozer(root):
 for x in (-1.06,1.06):gear_track('dozer track '+str(x),x,.12,.70,3.60,1.10,root,.52)
 box('dozer main chassis',(0,.30,1.35),(2.15,3.35,.64),black,.15,root)
 box('dozer long engine bonnet',(0,-.10,2.02),(1.78,2.48,1.08),paint,.22,root)
 box('dozer bonnet top service panel',(0,-.23,2.58),(1.55,1.86,.12),steel,.055,root)
 box('dozer radiator grille',(0,-.73,1.89),(1.25,.09,.67),black,.04,root)
 for x in (-.48,-.24,0,.24,.48):box('dozer grille slat',(x,-.79,1.89),(.055,.025,.53),tin,.018,root)
 box('dozer cab tub',(0,1.18,2.16),(1.04,1.22,.72),steel,.10,root)
 box('dozer front glass',(0,.55,2.48),(.82,.035,.72),glass,.018,root)
 box('dozer roof plate',(0,1.18,2.87),(1.20,1.40,.13),paint,.06,root)
 for x in (-.64,.64):
  x*=.72
  beam('dozer cab front pillar',(x,.53,2.04),(x,.56,2.91),.035,tin,root)
  beam('dozer cab rear pillar',(x,1.80,2.04),(x,1.80,2.91),.035,steel,root)
  box('dozer door glass',(x*1.02,1.17,2.48),(.025,1.06,.68),glass,.012,root)
  for j in range(5):beam('dozer safety window guard',(x*1.04,.68+j*.22,2.14),(x*1.04,.68+j*.22,2.78),.012,steel,root)
 box('dozer seat',(0,1.35,2.12),(.46,.48,.16),black,.05,root)
 beam('dozer control lever',(.35,1.15,2.05),(.35,1.13,2.44),.025,tin,root)
 # blade is a concave curved mouldboard panel, with heavy end cheeks, cutting edge and caps.
 blade=empty('dozer:blade',(0,-1.76,1.24),root)
 xs=[-1.72,-1.30,-.86,-.43,0,.43,.86,1.30,1.72];verts=[]
 for x in xs:
  rise=.22*(1-(abs(x)/1.72)**2);sweep=.18*(1-(abs(x)/1.72)**2)
  verts.extend([(x,-sweep,.05+rise),(x,-sweep-.28,1.43+rise),(x,.04,1.48+rise),(x,.12,.02+rise)])
 faces=[]
 for i in range(len(xs)-1):
  j=i*4;k=(i+1)*4;faces.extend([(j,j+1,k+1,k),(j+1,j+2,k+2,k+1),(j+2,j+3,k+3,k+2)])
 mesh=bpy.data.meshes.new('curved dozer blade swept mouldboard');mesh.from_pydata(verts,[],faces);mesh.update();uv_surface(mesh,lambda v:(v.x/2,v.z/2));panel=bpy.data.objects.new('dozer curved welded mouldboard',mesh);bpy.context.collection.objects.link(panel);panel.data.materials.append(paint);parent_keep(panel,blade)
 for x in (-1.67,1.67):
  cheek=box('dozer blade end cheek',(x,-.08,.75),(.20,.37,1.55),steel,.07,blade);cheek.rotation_euler[1]=-.11*math.copysign(1,x)
 box('dozer blade replaceable bare-steel cutting edge',(0,-.09,.03),(3.80,.22,.15),tin,.035,blade)
 for i in range(16):
  x=-1.65+i*.22;cyl('dozer blade cutting bolt '+str(i),(x,-.22,.04),.05,.045,black,'Y',10,blade)
 for side in (-1,1):
  beam('dozer lift arm',(side*.93,-1.06,1.37),(side*1.38,-1.76,.90),.11,steel,root)
  beam('dozer blade lift ram',(side*.83,-.54,2.22),(side*1.29,-1.57,1.65),.09,steel,root)
  beam('dozer ram chrome piston',(side*.05,1.0,.42),(side*.05,.64,.18),.043,tin,blade)
 for side in (-1,1):
  for i in range(8):box('dozer hood side vent',(side*.96,-.34+i*.18,1.88),(.05,.09,.48),black,.015,root)
 cyl('dozer exhaust stack',(.63,.24,2.80),.10,.92,black,'Z',12,root)
 return blade

def parent_group(o,parent):
 for obj in list(bpy.context.scene.objects):
  if obj is o or obj.parent is not None:continue
  if obj.type=='CAMERA' or obj.type=='LIGHT':continue
  parent_keep(obj,o)

# Each root remains independently addressable, while the family exports once.
machines={}
family=empty('town-machines-1',(0,0,0))
for name,builder,pos in [('trencher',trencher,(-12,0,0)),('excavator',excavator,(-4,0,0)),('dump-truck',dump_truck,(4,0,0)),('dozer',dozer,(13,0,0))]:
 # Build the rig at local origin. The family placement moves the root only
 # after all pivots and mesh offsets have been nested in their own frames.
 rootobj=empty(name,(0,0,0),family);machines[name]=rootobj;before=set(bpy.context.scene.objects)
 if name=='trencher':joints=builder(rootobj)
 elif name=='excavator':joints=builder(rootobj)
 elif name=='dump-truck':joints=builder(rootobj)
 else:joints=(builder(rootobj),)
 # The family root is the only export parent; every object stays a proper descendant.
 for obj in list(bpy.context.scene.objects):
  if obj not in set(bpy.context.scene.objects)-before or obj is rootobj or obj.parent is not None or obj.type in ('CAMERA','LIGHT'):continue
  parent_keep(obj,rootobj)
 # Material object positions now resolve relative to articulated pivots.
 # named joints are already childed below the root, with their moving parts nested.
 if name=='trencher':
  boom,chain=joints;parent_keep(boom,rootobj);parent_keep(chain,boom)
  # promote all boom/chain pieces to their named parts without changing world pose
  for obj in list(bpy.context.scene.objects):
   if obj.name.startswith('trencher chain') or obj.name.startswith('trencher scraper'):
    if obj is not chain:parent_keep(obj,chain)
   elif obj.name.startswith('trencher boom') or obj.name.startswith('trencher digging tooth') or obj.name.startswith('trencher chain cross'):
    if obj is not boom and obj.parent is not chain:parent_keep(obj,boom)
 elif name=='excavator':
  cab,boom,arm,bucket=joints
  parent_keep(cab,rootobj);reparent_world(boom,cab);parent_keep(arm,boom);parent_keep(bucket,arm)
  # Nodes made while constructing each child are attached to its moving parent.
 elif name=='dump-truck':
  bed,load=joints;parent_keep(bed,rootobj);parent_keep(load,bed)
 elif name=='dozer':parent_keep(joints[0],rootobj)
 rootobj.location=pos

# Put each moving node's origin on its real hinge. The meshes were authored in
# machine coordinates, so preserve their world transforms while rebuilding
# the hierarchy around the measured pin centres.
bpy.context.view_layer.update()
def set_joint_pivot(name,parent_name,anchor):
 joint=bpy.data.objects[name];parent=bpy.data.objects[parent_name]
 machine=machines[parent_name.split(':')[0]]
 children=list(joint.children)
 for child in children:reparent_world(child,machine)
 reparent_world(joint,machine)
 joint.matrix_world.translation=machine.matrix_world @ Vector(anchor)
 reparent_world(joint,parent)
 for child in children:reparent_world(child,joint)

for name,parent_name,anchor in (
 ('trencher:boom','trencher',(0,1.82,1.02)),
 ('trencher:chain','trencher:boom',(0,3.73,1.09)),
 ('excavator:cab','excavator',(0,.12,1.88)),
 ('excavator:boom','excavator:cab',(0,-.24,.72)),
 ('excavator:arm','excavator:boom',(0,-5.74,1.84)),
 ('excavator:bucket','excavator:arm',(0,-8.08,.19)),
 ('dump-truck:bed','dump-truck',(0,3.10,1.45)),
 ('dozer:blade','dozer',(0,-1.76,1.24)),
):set_joint_pivot(name,parent_name,anchor)

# Keep articulated pivots as distinct nodes, but combine fixed geometry that
# shares a parent and material. This removes per-object GLB overhead without
# simplifying the visible meshes or changing their local transforms.
def merge_fixed_meshes():
 groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH' or obj.children or obj.animation_data:continue
  key=(obj.parent,tuple(slot.material.name if slot.material else '' for slot in obj.material_slots))
  groups.setdefault(key,[]).append(obj)
 for objects in groups.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  bpy.ops.object.convert(target='MESH')
  bpy.ops.object.join()
  bpy.context.view_layer.objects.active.select_set(False)
merge_fixed_meshes()

# Fix pivots to their real joints and keep mesh world poses intact.
for name in ('trencher:boom','trencher:chain','excavator:cab','excavator:boom','excavator:arm','excavator:bucket','dump-truck:bed','dump-truck:load','dozer:blade'):
 obj=bpy.data.objects.get(name)
 if not obj:raise RuntimeError('missing articulated part '+name)

blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(glb)
if a.render:
 # Review evidence must show the exported runtime asset, not the authoring scene.
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(glb))
 machines={name:bpy.data.objects.get(name) for name in ('trencher','excavator','dump-truck','dozer')}
 if any(obj is None for obj in machines.values()):raise RuntimeError('GLB reimport lost a machine root')
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1040;scene.render.resolution_y=680;scene.render.resolution_percentage=100;scene.eevee.taa_render_samples=12;scene.render.image_settings.file_format='PNG';scene.world=bpy.data.worlds.new('bright overcast scrapyard day');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.74,.72,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.9
scene.view_settings.view_transform='AgX'
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((12,-12,19),5200,12),((-10,-3,10),2600,10)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,0))
bpy.ops.mesh.primitive_plane_add(size=80,location=(0,0,-.055));ground=bpy.context.object;ground.name='temporary render floor';floor=bpy.data.materials.new('plain mid-grey-brown photo floor');floor.diffuse_color=(.19,.18,.16,1);floor.use_nodes=True;floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.19,.18,.16,1);floor.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.96;ground.data.materials.append(floor)
if a.render:
 evidence.mkdir(parents=True,exist_ok=True)
 expected_parent={'trencher:boom':'trencher','trencher:chain':'trencher:boom','excavator:cab':'excavator','excavator:boom':'excavator:cab','excavator:arm':'excavator:boom','excavator:bucket':'excavator:arm','dump-truck:bed':'dump-truck','dump-truck:load':'dump-truck:bed','dozer:blade':'dozer'}
 def assert_working_pivots():
  bpy.context.view_layer.update()
  for name,parent_name in expected_parent.items():
   joint=bpy.data.objects[name];parent=bpy.data.objects.get(parent_name)
   if joint.parent is not parent:raise RuntimeError(f'{name} detached from parent {parent_name}')
   # Verify the world-space pin follows the moving parent's authored local pin.
   expected=parent.matrix_world @ joint.location
   error=(joint.matrix_world.translation-expected).length
   if error>.002:raise RuntimeError(f'{name} pivot drifted {error:.4f} m from parent')
 # Hide the other three machines so each pair is easy to inspect and compare.
 def hide_tree(o,value):
  o.hide_render=value
  for c in o.children:hide_tree(c,value)
 for name,o in machines.items():
  hide_tree(o,False)
  meshes=[]
  def collect(meshroot):
   if meshroot.type=='MESH':meshes.append(meshroot)
   for child in meshroot.children:collect(child)
  collect(o)
  world_points=[obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
  minz=min(v.z for v in world_points);maxz=max(v.z for v in world_points)
  miny=min(v.y for v in world_points);maxy=max(v.y for v in world_points)
  span=max(maxz-minz,maxy-miny,5.5);distance=max(11.0,span*(1.42 if name in ('excavator','trencher') else 1.16))
  target=(o.location.x,(miny+maxy)*.5,(minz+maxz)*.5)
  bpy.ops.object.camera_add(location=(o.location.x+distance*.82,-distance,1.70));cam=bpy.context.object;cam.data.lens=62;aim(cam,target);scene.camera=cam
  for other,ro in machines.items():hide_tree(ro,other!=name)
  for pose in ('rest','work'):
   moving={'trencher':('trencher:boom',-.22),'excavator':('excavator:boom',-.22),'dump-truck':('dump-truck:bed',-.785),'dozer':('dozer:blade',.62)}[name]
   j=bpy.data.objects[moving[0]];j.rotation_euler[0]=0 if pose=='rest' else moving[1]
   if name=='excavator' and pose=='work':
    bpy.data.objects['excavator:arm'].rotation_euler[0]=-.24;bpy.data.objects['excavator:bucket'].rotation_euler[0]=.32
   if name=='trencher' and pose=='work':bpy.data.objects['trencher:chain'].rotation_euler[0]=.70
   if name=='dump-truck':
    load=bpy.data.objects['dump-truck:load'];load.location.y=-1.20 if pose=='rest' else -.92
   bpy.context.view_layer.update()
   posed_points=[obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
   posed_min_y=min(v.y for v in posed_points);posed_max_y=max(v.y for v in posed_points)
   posed_min_z=min(v.z for v in posed_points);posed_max_z=max(v.z for v in posed_points)
   aim(cam,(o.location.x,(posed_min_y+posed_max_y)*.5,(posed_min_z+posed_max_z)*.5))
   if name=='dump-truck' and pose=='work':
    cam.location=(o.location.x+distance*1.15,distance*.75,(posed_min_z+posed_max_z)*.5+distance*.72)
    aim(cam,(o.location.x,(posed_min_y+posed_max_y)*.5,(posed_min_z+posed_max_z)*.5))
   assert_working_pivots()
   scene.render.filepath=str(evidence/f'{name}-{pose}.png');bpy.ops.render.render(write_still=True)
   if pose=='work':
    focus={'trencher':'trencher:boom','excavator':'excavator:arm','dump-truck':'dump-truck:bed','dozer':'dozer:blade'}[name]
    point=bpy.data.objects[focus].matrix_world.translation
    if name=='dump-truck':
     point=Vector((o.location.x,1.85,2.65));close=(o.location.x+4.0,4.2,5.0)
    else:close=(point.x+2.2,point.y-3.4,max(1.7,point.z+1.2))
    bpy.ops.object.camera_add(location=close);detail=bpy.context.object;detail.data.lens=65;aim(detail,point);scene.camera=detail
    scene.render.filepath=str(evidence/f'{name}-close.png');bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(detail,do_unlink=True)
   j.rotation_euler[0]=0
   if name=='dump-truck':bpy.data.objects['dump-truck:load'].location.y=-1.20
   if name=='excavator':
    bpy.data.objects['excavator:arm'].rotation_euler[0]=0;bpy.data.objects['excavator:bucket'].rotation_euler[0]=0
   if name=='trencher':bpy.data.objects['trencher:chain'].rotation_euler[0]=0
  bpy.data.objects.remove(cam,do_unlink=True)
# Remove temporary render-only floor, lights, camera; none are in output GLB.
for obj in list(bpy.context.scene.objects):
 if obj.type in ('CAMERA','LIGHT') or obj.name=='temporary render floor':bpy.data.objects.remove(obj,do_unlink=True)
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,'render':str(evidence) if a.render else ''}))
