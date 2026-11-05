"""Original four-machine family for Wasteland town, TOWN-ART-MACHINES-1.

Blender is Z-up; the GLB exporter converts the authored geometry to glTF Y-up.
Run with --root and optionally --render for round evidence, --candidate for a
private GLB under .qa-dist, and --paths-only for a no-write plan.
"""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--candidate',action='store_true');p.add_argument('--paint-photo',default='C:/Users/kyleb/.codex/generated_images/01a1adc0-a5ff-7e93-9239-5f1fad064264/exec-d53872c5-d976-4b22-a386-ec9340923250.png');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();glb=root/('.qa-dist/town-machines-1/machines-1.glb' if a.candidate else 'public/assets/models/wasteland/town/machines-1.glb');blend=root/'art-build/town/machines-1.blend';evidence=Path(a.render);evidence=evidence if evidence.is_absolute() else root/evidence
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)] if a.render else []}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
if not Path(a.paint_photo).exists():raise FileNotFoundError(a.paint_photo)
mats=town.make_materials({'rusted-steel':Path(a.paint_photo),'galvanised-tin':Path(a.paint_photo)})
steel=mats['rusted-steel'];paint=mats['galvanised-tin'];tin=mats['rusted-steel'];black=mats['iron-dark'];glass=mats['dirty-glass'];rubber=mats['iron-dark'];sand=mats['sand']
# Keep the single shared 1K atlas compact inside the GLB.
atlas=bpy.data.images['Scablands shared town wear atlas 1K'];atlas.file_format='JPEG';atlas.filepath_raw=str(root/'.qa-dist/town-machines-1/atlas.jpg');Path(atlas.filepath_raw).parent.mkdir(parents=True,exist_ok=True);atlas.save();atlas.pack()
def box(name,loc,size,mat=steel,bevel=.035,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  b=o.modifiers.new('worn rolled plate edges','BEVEL');b.width=bevel;b.segments=1;o.modifiers.new('welded plate normals','WEIGHTED_NORMAL')
 if parent: parent_keep(o,parent)
 return o
def parent_keep(o,parent):
 # Geometry is authored in family-local coordinates. Preserve that local
 # transform so all children follow their real parent hinge when it moves.
 o.parent=parent;o.matrix_parent_inverse.identity()
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
def weld(name,a,b,parent=None):return beam(name,a,b,.022,tin,parent)
def uv_surface(mesh,mapper):
 layer=mesh.uv_layers.new(name='physical-scale material mapping')
 for loop in mesh.loops:layer.data[loop.index].uv=mapper(mesh.vertices[loop.vertex_index].co)
def wheel(name,x,y,z,r,width,parent,drive=False):
 cyl(name+' tyre',(x,y,z),r,width,rubber,'X',24,parent)
 cyl(name+' rusty rim',(x*1.015,y,z),r*.61,width*1.06,steel,'X',20,parent)
 cyl(name+' hub',(x*1.03,y,z),r*.23,width*1.12,tin,'X',16,parent)
 for i in range(10):
  angle=i*math.tau/10;cyl(name+f' lug {i}',(x*1.04,y+math.sin(angle)*r*.43,z+math.cos(angle)*r*.43),.035,width*1.14,black,'X',8,parent)
 for side in (-1,1):
  for i in range(24):
   angle=i*math.tau/24
   # deep, separate rubber cleats wrap the shoulder in purposeful groups
   if i%8==0:box(name+f' tread {side} {i}',(x+side*width*.29,y+math.sin(angle)*r*.89,z+math.cos(angle)*r*.89),(.10,r*.17,.08),black,.018,parent)
def gear_track(name,x,cy,z0,length,height,parent):
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
 for xx,zz in path:verts.extend([(x-.16,cy+xx,z0+zz),(x+.16,cy+xx,z0+zz)])
 faces=[]
 for i in range(len(path)):
  n=(i+1)%len(path);faces.append((2*i,2*n,2*n+1,2*i+1))
 mesh=bpy.data.meshes.new(name+' forged loop mesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name+' heavy track belt',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black);parent_keep(o,parent)
 for i,(xx,zz) in enumerate(path):
  # plate orientation around loop, every shoe follows the curve
  ang=math.atan2(zz,xx)
  shoe=box(name+f' shoe {i:02d}',(x,cy+xx,z0+zz),(.36,.30,.13),steel,.025,parent)
  shoe.rotation_euler[0]=ang
  cyl(name+f' pin {i:02d}',(x-.193,cy+xx,z0+zz),.045,.025,tin,'X',8,parent)
 for i in range(5):
  yy=cy-length*.30+i*length*.15
  cyl(name+f' road roller {i}',(x,yy,z0),r*.34,.26,steel,'X',16,parent)

def tractor(prefix,root):
 # Narrow agricultural donor proportions: long bonnet, open rear wheel stance.
 box(prefix+' pressed chassis',(0,.10,1.02),(1.45,3.55,.38),black,.08,root)
 box(prefix+' engine bonnet',(0,-.92,1.72),(1.34,1.60,1.05),paint,.20,root)
 hood=box(prefix+' hood crown',(0,-1.02,2.22),(1.05,1.23,.12),tin,.045,root);hood.rotation_euler[0]=-.06
 box(prefix+' radiator grille',(0,-1.76,1.76),(.82,.08,.75),black,.035,root)
 for x in (-.31,-.16,0,.16,.31):box(prefix+f' grille rib {x}',(x,-1.815,1.76),(.035,.025,.62),tin,.012,root)
 for x in (-.64,.64):
  cyl(prefix+' headlamp',(x,-1.83,2.06),.14,.11,glass,'Y',16,root)
  cyl(prefix+' lamp rim',(x,-1.89,2.06),.17,.05,tin,'Y',16,root)
  box(prefix+' bent fender',(x,.03,1.55),(.30,1.35,.10),steel,.06,root)
  # big back wheels, smaller front steering pair: close to the photographic tractor
  wheel(prefix+(' rear' if abs(x)>.6 else ' front'),x*1.05,.90 if abs(x)>.6 else -1.10,.79,.93 if abs(x)>.6 else .53,.34,root)
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
 # rear hitch and side throw chute
 box('trencher three point hitch',(0,1.67,.83),(.72,.42,.55),steel,.06,root)
 chute=box('trencher side dirt chute',(.88,1.10,1.45),(.52,1.34,.24),tin,.08,root);chute.rotation_euler[0]=-.18
 for i in range(4):beam(f'trencher chute brace {i}',(.57,.60+i*.21,1.53),(.97,.66+i*.20,1.58),.028,steel,root)
 boom=empty('trencher:boom',(0,1.82,1.02),root)
 # curved twin girders slant to the trenching tooth at ground level
 beam('trencher boom near cheek',(-.34,0,.03),(-.34,2.65,-.42),.11,paint,boom)
 beam('trencher boom far cheek',(.34,0,.03),(.34,2.65,-.42),.11,steel,boom)
 for i in range(8):
  t=i/7;y=t*2.65;z=.03-t*.45
  beam(f'trencher chain cross pin {i}',(-.35,y,z),(.35,y,z),.045,tin,boom)
  for side in (-1,1):box(f'trencher digging tooth {i} {side}',(side*.36,y,z-.065),(.13,.17,.11),steel,.02,boom)
 # separate rotating chain node, pivot at drive sprocket centre
 chain=empty('trencher:chain',(0,0,0),boom);chain.location=(0,0,.07)
 links=[]
 for i in range(24):
  ang=math.tau*i/24;links.append((1.32+1.38*math.cos(ang),.02+.36*math.sin(ang)))
 for i,(yy,zz) in enumerate(links):
  nxt=links[(i+1)%len(links)];direction=math.atan2(nxt[1]-zz,nxt[0]-yy)
  for x in (-.40,.40):
   shoe=box(f'trencher chain forged link {i} {x}',(x,yy,zz),(.18,.21,.085),black,.018,chain);shoe.rotation_euler[0]=direction
   if i%3==0:
    tooth=box(f'trencher chain replaceable tooth {i} {x}',(x,yy,zz-.07),(.12,.10,.095),tin,.018,chain);tooth.rotation_euler[0]=direction
 # exposed landing-gear ram to lower the boom
 cyl('trencher hydraulic cylinder',(0,2.10,1.31),.12,.72,steel,'X',16,root)
 beam('trencher ram chrome rod',(0,1.91,1.22),(0,1.91,.62),.055,tin,root)
 # Build poses rotate at pivot around X, matching the lateral hinge.
 return boom,chain

def excavator(root):
 for x in (-.91,.91):gear_track('excavator track '+str(x),x,.30,.68,3.45,1.20,root)
 box('excavator lower carbody',(0,.38,1.04),(2.0,2.82,.55),black,.12,root)
 box('excavator engine counterweight',(0,1.22,1.71),(1.88,1.20,1.05),paint,.19,root)
 box('excavator rear counterweight cap',(0,1.80,1.89),(1.62,.24,.62),steel,.12,root)
 cyl('excavator turntable bearing',(0,.12,1.47),.82,.22,black,'Z',32,root)
 cyl('excavator bearing ring',(0,.12,1.59),.77,.08,tin,'Z',32,root)
 cab=empty('excavator:cab',(0,-.40,1.57),root)
 box('excavator cab lower tub',(0,0,.65),(1.36,1.26,.94),paint,.13,cab)
 # cab rises forward, with broad glazed windscreen and mesh side window guards
 box('excavator cab roof',(0,-.02,1.92),(1.42,1.42,.15),steel,.065,cab)
 box('excavator front glass',(0,-.665,1.34),(1.08,.035,.87),glass,.016,cab)
 for x in (-.61,.61):beam('excavator cab front pillar',(x,-.70,.92),(x,-.62,1.98),.055,steel,cab)
 for y in (-.52,.49):beam('excavator cab side pillar',(0.70,y,.98),(.70,y,1.97),.045,tin,cab)
 box('excavator side door',(0.716,.03,1.34),(.045,.84,.88),paint,.03,cab)
 box('excavator door glass',(.744,.02,1.58),(.026,.56,.40),glass,.01,cab)
 for i in range(5):beam('excavator cab safety mesh',(.765,-.38+i*.18,1.18),(.765,-.38+i*.18,1.88),.012,steel,cab)
 for i in range(4):beam('excavator cab mesh cross',(.765,-.38,1.20+i*.19),(.765,.34,1.20+i*.19),.012,steel,cab)
 boom=empty('excavator:boom',(0,-.25,.65),cab)
 # heavy arched box-section boom forged from tapered polygon sides
 beam('excavator boom lower beam',(0,0,0),(0,-1.48,.58),.21,paint,boom)
 beam('excavator boom upper beam',(0,-.08,.37),(0,-1.51,.91),.145,steel,boom)
 for x in (-.18,.18):beam('excavator boom side cheek',(x,-.03,.14),(x,-1.46,.77),.065,tin,boom)
 arm=empty('excavator:arm',(0,-1.48,.58),boom)
 beam('excavator dipper arm',(0,0,0),(0,-1.72,-1.18),.14,paint,arm)
 beam('excavator dipper reinforcing spine',(0,-.10,.10),(0,-1.65,-1.08),.06,steel,arm)
 bucket=empty('excavator:bucket',(0,-1.72,-1.18),arm)
 # curved shell from heavy back plate, cheeks, serrated lip and teeth
 box('excavator bucket back',(0,-.14,-.20),(.78,.22,.68),steel,.09,bucket)
 for x in (-.37,.37):
  cheek=box('excavator bucket side cheek',(x,-.20,-.41),(.10,.68,.65),paint,.07,bucket);cheek.rotation_euler[0]=-.30
 box('excavator bucket cutting lip',(0,-.54,-.59),(.94,.24,.14),tin,.035,bucket)
 for i in range(5):
  x=-.36+i*.18;tooth=box('excavator bucket tooth '+str(i),(x,-.68,-.62),(.12,.30,.10),steel,.025,bucket);tooth.rotation_euler[0]=-.12
 # real hinge pins and visible hydraulic cylinders follow component hierarchy
 cyl('excavator boom hinge pin',(0,0,0),.19,.54,tin,'X',20,boom)
 cyl('excavator arm hinge pin',(0,-1.48,.58),.15,.48,tin,'X',20,boom)
 cyl('excavator bucket hinge pin',(0,0,0),.14,.54,tin,'X',18,bucket)
 for side in (-1,1):
  beam('excavator boom ram barrel',(side*.42,.05,.30),(side*.42,-.48,.72),.105,steel,cab)
  beam('excavator ram chrome rod',(side*.42,-.48,.72),(side*.42,-.72,1.05),.043,tin,cab)
  beam('excavator arm ram barrel',(side*.32,-.35,.38),(side*.32,-1.02,.70),.085,steel,boom)
  beam('excavator arm chrome rod',(side*.32,-1.02,.70),(side*.32,-1.63,.33),.038,tin,boom)
  beam('excavator bucket ram',(side*.29,-.24,.17),(side*.29,-.82,.30),.067,steel,arm)
  beam('excavator bucket rod',(side*.29,-.82,.30),(side*.29,-1.43,-.25),.032,tin,arm)
 # roof handrail, exhaust, tie-down lugs, undercarriage sand guards
 cyl('excavator exhaust stack',(.62,1.10,2.56),.08,.55,black,'Z',12,root)
 for i in range(7):box('excavator counterweight vent '+str(i),(-.66+i*.22,1.82,1.55),(.10,.03,.22),black,.02,root)
 return cab,boom,arm,bucket

def dump_truck(root):
 box('dump truck ladder frame',(0,.05,1.16),(2.15,5.40,.42),black,.12,root)
 box('dump truck front axle',(0,-1.88,.88),(2.75,.34,.24),steel,.05,root)
 box('dump truck rear bogie',(0,1.43,.86),(2.82,.50,.34),steel,.07,root)
 # six industrial tyres, two steering and four tandem rear. Deep shoulder tread blocks.
 for side in (-1,1):
  for i,y in enumerate((-1.85,.96,1.86)):
   wheel(f'dump truck wheel {side} {i}',side*1.23,y,.91,.72,.38,root)
 # forward control cab with a tapering rounded hood, radiator, screen and hand rails
 box('dump truck cab lower sill',(0,-1.72,1.68),(1.92,1.48,.92),paint,.18,root)
 box('dump truck bonnet',(0,-2.48,1.82),(1.80,1.12,.68),steel,.19,root)
 box('dump truck grille',(0,-3.055,1.81),(1.18,.08,.51),black,.045,root)
 for x in (-.45,-.23,0,.23,.45):box('dump truck radiator bar '+str(x),(x,-3.108,1.81),(.045,.035,.42),tin,.015,root)
 for side in (-1,1):
  box('dump truck windshield',(side*.46,-2.52,2.43),(.75,.045,.87),glass,.025,root).rotation_euler[1]=side*.08
  beam('dump truck windscreen pillar',(side*.88,-2.59,1.95),(side*.87,-2.31,2.92),.055,steel,root)
  beam('dump truck mirror stalk',(side*.93,-2.15,2.26),(side*1.20,-2.30,2.66),.035,tin,root)
  box('dump truck mirror',(side*1.20,-2.33,2.69),(.22,.10,.32),steel,.03,root)
  for y in (-2.62,-2.18):cyl('dump truck headlamp',(side*.79,y,1.88),.13,.07,glass,'Y',12,root)
  box('dump truck step',(side*1.12,-1.24,1.17),(.22,.72,.09),tin,.025,root)
 # tip body: hinged at rear, polygonal tray with sloped front bulkhead and folded side ribs
 bed=empty('dump-truck:bed',(0,2.35,1.45),root)
 # local bed origin is the actual rear hinge pin, all steel is forward (negative y)
 box('dump tray floor',(0,-.88,.30),(2.20,3.82,.18),steel,.06,bed)
 for side in (-1,1):
  # plate panels rise and widen at their upper lips
  verts=[(side*1.00,-2.75,.35),(side*1.00,.98,.35),(side*1.20,.98,1.55),(side*1.20,-2.75,1.55),(side*1.03,-2.75,.55),(side*1.03,.98,.55)]
  mesh=bpy.data.meshes.new('dump tray pressed side');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();uv_surface(mesh,lambda v:(v.y/2,v.z/2));obj=bpy.data.objects.new('dump tray rolled side wall',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(paint);parent_keep(obj,bed)
  for i in range(7):
   y=-2.52+i*.53;weld(f'dump tray side rib {side} {i}',(side*1.03,y,.47),(side*1.20,y,1.44),bed)
   cyl(f'dump tray rivet {side} {i}',(side*1.21,y,1.32),.045,.035,tin,'X',8,bed)
 # front bulkhead tapers into the cab guard
 wall=box('dump tray headboard',(0,-2.66,.94),(2.10,.20,1.35),steel,.12,bed);wall.rotation_euler[0]=-.10
 box('dump tray tailgate',(0,1.00,.96),(2.15,.17,1.25),paint,.07,bed)
 for x in (-.70,.70):
  weld('dump tray hinge bracket',(x,.95,.24),(x,1.35,.14),bed)
  cyl('dump truck rear hinge pin',(x,2.35,1.45),.16,.34,tin,'X',16,root)
 for side in (-1,1):
  beam('dump truck hoist cylinder',(side*.48,.18,1.32),(side*.48,-.22,2.57),.13,steel,root)
  beam('dump truck hoist polished rod',(side*.48,-.22,2.57),(side*.48,-.53,2.85),.055,tin,root)
 load=empty('dump-truck:load',(0,-.82,.70),bed)
 # lumpy heaped spoil with irregular triangular facets and darker mineral bands
 verts=[(-.88,-1.45,.08),(.88,-1.45,.08),(.92,1.10,.08),(-.92,1.10,.08),(0,-1.12,.70),(-.46,-.38,1.02),(.30,.26,1.10),(-.28,.82,.82),(.70,.65,.40),(-.72,.37,.52)]
 faces=[(0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7),(4,5,6),(4,6,7),(0,4,9),(0,9,3),(3,9,7),(1,8,2),(1,6,8),(2,8,7),(7,8,6)]
 mesh=bpy.data.meshes.new('compacted spoil heap');mesh.from_pydata(verts,[],faces);mesh.update();uv_surface(mesh,lambda v:(v.x/2,v.y/2));heap=bpy.data.objects.new('dump load spoil heap',mesh);bpy.context.collection.objects.link(heap);heap.data.materials.append(sand);heap.data.materials.append(steel);parent_keep(heap,load)
 for poly in mesh.polygons:
  if poly.index in (4,7,10,12,15):poly.material_index=1
 for x in (-.88,.88):
  for y in (-2.28,-1.54,-.80,-.06,.68):box('dump bed longitudinal wear strip',(x,y,.48),(.11,.07,.09),tin,.02,bed)
 return bed,load

def dozer(root):
 for x in (-1.06,1.06):gear_track('dozer track '+str(x),x,.12,.69,3.85,1.40,root)
 box('dozer main chassis',(0,.30,1.27),(2.15,3.35,.64),black,.15,root)
 box('dozer engine hood',(0,.19,1.91),(1.88,1.70,1.08),paint,.21,root)
 box('dozer radiator grille',(0,-.73,1.89),(1.25,.09,.67),black,.04,root)
 for x in (-.48,-.24,0,.24,.48):box('dozer grille slat',(x,-.79,1.89),(.055,.025,.53),tin,.018,root)
 box('dozer cab tub',(0,.86,2.11),(1.46,1.55,1.24),steel,.15,root)
 box('dozer front glass',(0,.07,2.38),(1.14,.045,.62),glass,.025,root)
 box('dozer roof plate',(0,.88,2.83),(1.65,1.71,.15),paint,.07,root)
 for x in (-.64,.64):
  beam('dozer cab front pillar',(x,.06,2.00),(x,.14,2.86),.055,tin,root)
  beam('dozer cab rear pillar',(x,1.60,2.00),(x,1.62,2.86),.055,steel,root)
  box('dozer door glass',(x*1.02,.85,2.38),(.035,1.20,.58),glass,.016,root)
  for j in range(5):beam('dozer safety window guard',(x*1.04,.30+j*.23,2.09),(x*1.04,.30+j*.23,2.71),.014,steel,root)
 # blade is a concave curved mouldboard panel, with heavy end cheeks, cutting edge and caps.
 blade=empty('dozer:blade',(0,-1.76,1.24),root)
 xs=[-1.72,-1.30,-.86,-.43,0,.43,.86,1.30,1.72];verts=[]
 for x in xs:
  rise=.23*(1-(abs(x)/1.72)**2);sweep=.18*(1-(abs(x)/1.72)**2)
  verts.extend([(x,-sweep,.05+rise),(x,-sweep-.18,.72+rise),(x,.04,.78+rise),(x,.12,.02+rise)])
 faces=[]
 for i in range(len(xs)-1):
  j=i*4;k=(i+1)*4;faces.extend([(j,j+1,k+1,k),(j+1,j+2,k+2,k+1),(j+2,j+3,k+3,k+2)])
 mesh=bpy.data.meshes.new('curved dozer blade swept mouldboard');mesh.from_pydata(verts,[],faces);mesh.update();uv_surface(mesh,lambda v:(v.x/2,v.z/2));panel=bpy.data.objects.new('dozer curved welded mouldboard',mesh);bpy.context.collection.objects.link(panel);panel.data.materials.append(steel);parent_keep(panel,blade)
 for x in (-1.67,1.67):
  cheek=box('dozer blade end cheek',(x,-.08,.49),(.20,.37,.89),steel,.07,blade);cheek.rotation_euler[1]=-.11*math.copysign(1,x)
 box('dozer blade replaceable cutting edge',(0,-.09,.03),(3.54,.22,.15),tin,.035,blade)
 for i in range(12):
  x=-1.48+i*.27;cyl('dozer blade cutting bolt '+str(i),(x,-.22,.04),.05,.045,black,'Y',10,blade)
 for side in (-1,1):
  beam('dozer lift arm',(side*.93,-1.06,1.37),(side*1.38,-1.76,.90),.11,steel,root)
  beam('dozer blade lift ram',(side*.83,-.54,2.22),(side*1.29,-1.57,1.65),.09,steel,root)
  beam('dozer ram chrome piston',(side*1.29,-1.57,1.65),(side*1.42,-1.82,1.36),.043,tin,root)
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
  parent_keep(cab,rootobj);parent_keep(boom,cab);parent_keep(arm,boom);parent_keep(bucket,arm)
  # Nodes made while constructing each child are attached to its moving parent.
 elif name=='dump-truck':
  bed,load=joints;parent_keep(bed,rootobj);parent_keep(load,bed)
 elif name=='dozer':parent_keep(joints[0],rootobj)
 rootobj.location=pos

# Fix pivots to their real joints and keep mesh world poses intact.
for name in ('trencher:boom','trencher:chain','excavator:cab','excavator:boom','excavator:arm','excavator:bucket','dump-truck:bed','dump-truck:load','dozer:blade'):
 obj=bpy.data.objects.get(name)
 if not obj:raise RuntimeError('missing articulated part '+name)

scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1100;scene.render.resolution_y=820;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.world=bpy.data.worlds.new('bright overcast scrapyard day');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.65,.68,.68,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
scene.view_settings.view_transform='AgX'
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((12,-12,19),3000,12),((-10,-3,10),1500,10)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,0))
bpy.ops.mesh.primitive_plane_add(size=80,location=(0,0,-.055));ground=bpy.context.object;ground.name='temporary render floor';ground.data.materials.append(sand)
if a.render:
 evidence.mkdir(parents=True,exist_ok=True)
 # Hide the other three machines so each pair is easy to inspect and compare.
 def hide_tree(o,value):
  o.hide_render=value
  for c in o.children:hide_tree(c,value)
 for name,o in machines.items():
  hide_tree(o,False)
  aim_y={'trencher':.9,'excavator':-.7,'dump-truck':.1,'dozer':-.3}[name]
  camera_y=13 if name=='trencher' else -10
  if name=='trencher':aim_y=2.0
  bpy.ops.object.camera_add(location=(o.location.x+5,camera_y,8 if name=='trencher' else 6.5));cam=bpy.context.object;cam.data.lens=52;aim(cam,(o.location.x,aim_y,1.5));scene.camera=cam
  for other,ro in machines.items():hide_tree(ro,other!=name)
  for pose in ('rest','work'):
   moving={'trencher':('trencher:boom',-0.42),'excavator':('excavator:boom',-0.30),'dump-truck':('dump-truck:bed',-.52),'dozer':('dozer:blade',.42)}[name]
   j=bpy.data.objects[moving[0]];j.rotation_euler[0]=0 if pose=='rest' else moving[1]
   if name=='excavator' and pose=='work':
    bpy.data.objects['excavator:arm'].rotation_euler[0]=-.32;bpy.data.objects['excavator:bucket'].rotation_euler[0]=.36
   if name=='trencher' and pose=='work':bpy.data.objects['trencher:chain'].rotation_euler[0]=.70
   scene.render.filepath=str(evidence/f'{name}-{pose}.png');bpy.ops.render.render(write_still=True)
   j.rotation_euler[0]=0
   if name=='excavator':
    bpy.data.objects['excavator:arm'].rotation_euler[0]=0;bpy.data.objects['excavator:bucket'].rotation_euler[0]=0
   if name=='trencher':bpy.data.objects['trencher:chain'].rotation_euler[0]=0
  bpy.data.objects.remove(cam,do_unlink=True)
# Remove temporary render-only floor, lights, camera; none are in output GLB.
for obj in list(bpy.context.scene.objects):
 if obj.type in ('CAMERA','LIGHT') or obj.name=='temporary render floor':bpy.data.objects.remove(obj,do_unlink=True)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(glb)
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,'render':str(evidence) if a.render else ''}))
