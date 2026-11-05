"""Build the Rattler from its photographic round-3 reference.

Run with Blender: blender -b --python-exit-code 1 --python tools/blender/rattler.py -- --root .
Model-local metres, +Y up, +Z forward. Review renders stay in .evidence/.
"""
import argparse, json, math, sys
from datetime import date
from pathlib import Path
parser=argparse.ArgumentParser(); parser.add_argument('--root',required=True); parser.add_argument('--paths-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(args.root).resolve()
glb=root/'public/assets/models/wasteland/cars/rattler.glb'; blend=root/'art-build/cars/rattler.blend'
sheet=root/'docs/board/looks/car-art-rattler/round-3.jpg'; evidence=root/'.evidence'/date.today().isoformat()/'CAR-ART-RATTLER'/'round-3'
if args.paths_only: print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)],'summary':[str(sheet)]})); raise SystemExit(0)
import bpy
from mathutils import Vector
for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'; scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1000; scene.render.resolution_y=700; scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.quality=91
scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.view_settings.exposure=0
scene.world.color=(.58,.60,.61)

def image_mat(name,path,metal=.55,rough=.78,scale=1.0):
 m=bpy.data.materials.new(name); m.use_nodes=True; n=m.node_tree.nodes; bs=n.get('Principled BSDF'); bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
 tex=n.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(path),check_existing=True); tex.image.pack(); tex.interpolation='Linear'
 uv=n.new('ShaderNodeTexCoord'); mapping=n.new('ShaderNodeVectorMath'); mapping.operation='SCALE'; mapping.inputs[3].default_value=scale
 m.node_tree.links.new(uv.outputs['Generated'],mapping.inputs[0]); m.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector']); m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']); return m
ruststeel=image_mat('Photographic sandblasted steel with iron oxide',evidence.parent/'steel-rust.png',.48,.84,4.0)
darksteel=image_mat('Oil-darkened bare steel',evidence.parent/'steel-rust.png',.64,.76,5.0)
def mat(name,col,metal=.2,rough=.75):
 m=bpy.data.materials.new(name); m.diffuse_color=(*col,1); m.use_nodes=True; s=m.node_tree.nodes.get('Principled BSDF'); s.inputs['Base Color'].default_value=(*col,1); s.inputs['Metallic'].default_value=metal; s.inputs['Roughness'].default_value=rough; return m
rubber=mat('Game car tyre rubber',(.035,.039,.037),.02,.96); black=mat('Blackened steel',(.075,.08,.075),.68,.78); oxide=mat('Rust-red repair steel',(.32,.12,.055),.52,.86); glass=mat('Dusty smoky glass',(.085,.12,.12),.35,.36); leather=mat('Cracked seat leather',(.15,.075,.035),.05,.93); silver=mat('Scuffed steel edges',(.36,.37,.34),.76,.62)
car=bpy.data.objects.new('Rattler reference-built chopped pickup',None); bpy.context.collection.objects.link(car)
def assign(o,m,name,parent=True):
 o.name=name; o.data.materials.append(m)
 if parent: o.parent=car
 if o.type=='MESH':
  for p in o.data.polygons: p.use_smooth=True
 return o
def cube(name,loc,dim,m,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=dim; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); assign(o,m,name)
 if bevel:
  b=o.modifiers.new('Rolled panel edges','BEVEL'); b.width=bevel; b.segments=4; o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,m,rot=(0,math.pi/2,0),verts=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc,rotation=rot); return assign(bpy.context.object,m,name)
def tube(name,a,b,r,m,verts=12):
 mid=(Vector(a)+Vector(b))/2; d=Vector(b)-Vector(a); bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=mid); o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return assign(o,m,name)
def loft(name,sections,m):
 # sections: z, width, lower-y, shoulder-y, roof-y; ellipsoid-like cab cross sections
 verts=[]; faces=[]; around=24
 for z,w,lo,shoulder,top in sections:
  for i in range(around):
   a=2*math.pi*i/around; sn,cs=math.sin(a),math.cos(a)
   y=(lo+top)/2+(top-lo)/2*cs; x=w/2*sn*(.90+.10*cs)
   if y>shoulder: x*=max(.16,1-.30*(y-shoulder)/(top-shoulder))
   verts.append((x,y,z))
 for j in range(len(sections)-1):
  for i in range(around): a=j*around+i; b=j*around+(i+1)%around; faces.append((a,b,b+around,a+around))
 faces.extend([tuple(range(around-1,-1,-1)),tuple((len(sections)-1)*around+i for i in range(around))])
 mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.materials.append(m); ob=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(ob); ob.parent=car
 for p in mesh.polygons:p.use_smooth=True
 s=ob.modifiers.new('Hand-formed panel thickness','SOLIDIFY'); s.thickness=.035
 be=ob.modifiers.new('Soft rolled seams','BEVEL'); be.width=.018; be.segments=2
 return ob
# Long, low 4.15 m chassis and front suspension.
cube('Twin ladder rails',(0,.47,-.05),(1.28,.19,3.75),black,.06); cube('Floor pan',(0,.63,-.34),(1.32,.13,2.75),darksteel,.05)
# Cab shell made from curved loft sections: narrow cowl, swept rear and crowned chopped roof.
loft('Curved chopped cab lower shell',[(-1.42,1.38,.77,1.15,1.25),(-1.18,1.53,.70,1.23,1.32),(-.75,1.58,.68,1.25,1.34),(-.25,1.57,.68,1.25,1.34),(.10,1.53,.70,1.23,1.32),(.35,1.43,.74,1.15,1.25)],ruststeel)
# Separate crowned roof leaves the chopped side-window apertures open.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=(0,1.49,-.55)); roof=bpy.context.object; roof.dimensions=(1.46,.30,1.20); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); assign(roof,ruststeel,'Crowned chopped roof skin')
# Actual openings, curved window framing and a narrow low windshield slit.
for x in (-.70,.70):
 tube('Swept A pillar',(x*.76,1.23,.32),(x*.90,1.58,-.02),.045,oxide); tube('Rear cab pillar',(x*.90,1.58,-.04),(x*.94,1.25,-1.30),.05,silver)
 tube('Window sill',(x*.92,1.22,.05),(x*.94,1.22,-1.27),.028,oxide)
 cube('Smoky door window glass',(x*.91,1.39,-.60),(.035,.20,.91),glass,.075)
cube('Windshield slit glazing',(0,1.47,.352),(1.12,.04,.065),glass,.03); tube('Upper windscreen brow',(-.60,1.56,.27),(.60,1.56,.27),.035,silver)
cube('Rear window inset',(0,1.47,-1.39),(1.02,.04,.10),glass,.04)
cube('Curved door lower panel left',(-.765,.99,-.63),(.04,.34,.94),ruststeel,.16); cube('Curved door lower panel right',(.765,.99,-.63),(.04,.34,.94),ruststeel,.16)
for x in (-.78,.78):
 tube('Door bead rolled seam',(x,1.12,-1.08),(x,1.12,-.18),.012,silver); cyl('Door handle',(x,1.13,-.46),.035,.045,black,verts=12)
# Short steel pickup box with pressed ribs, wheel tubs and a timber floor only.
cube('Pickup bed steel floor',(0,.79,-1.75),(1.25,.06,.92),darksteel,.025)
for x in (-.67,.67):
 cube('Pickup bed rolled side',(x,1.00,-1.75),(.06,.38,.99),ruststeel,.035)
 for z in (-2.13,-1.91,-1.69,-1.47): tube('Pressed bed side rib',(x*1.015,.86,z),(x*1.015,1.13,z),.018,silver)
cube('Steel tailgate',(0,.97,-2.22),(1.37,.35,.07),oxide,.03)
for x in (-.42,-.14,.14,.42): cube('Worn bed floor plank',(x,.835,-1.75),(.19,.035,.84),leather,.015)
# Fenderless stance, with actual game-like torus tyres, tread lugs, rims, hubs and lug bolts.
for xside in (-.87,.87):
 for z,rad,width in ((1.27,.39,.20),(-1.23,.57,.31)):
  bpy.ops.mesh.primitive_torus_add(major_radius=rad*.76,minor_radius=rad*.24,major_segments=48,minor_segments=16,location=(xside,rad,z),rotation=(0,math.pi/2,0)); tire=assign(bpy.context.object,rubber,'Game-pattern torus tyre')
  rimR=rad*.53; cyl('Deep stamped wheel barrel',(xside,rad,z),rimR,width*.76,black)
  face=xside+math.copysign(width*.40,xside); cyl('Worn alloy wheel face',(face,rad,z),rimR*.83,.035,silver)
  cyl('Grease-dark hub',(face+math.copysign(.03,xside),rad,z),rimR*.25,.055,oxide,verts=20)
  for k in range(8):
   a=2*math.pi*k/8; cyl('Wheel spoke',(face,rad+math.sin(a)*rimR*.52,z+math.cos(a)*rimR*.52),.025,.035,black,verts=8)
   cyl('Wheel lug nut',(face+math.copysign(.03,xside),rad+math.sin(a)*rimR*.67,z+math.cos(a)*rimR*.67),.022,.035,silver,verts=8)
  # Raised independent tread blocks wrap the shoulder like the game's gravel tyres.
  for k in range(40):
   a=2*math.pi*k/40
   for row in (-1,0,1):
    xx=xside+row*width*.27; yy=rad+math.sin(a)*(rad*.99); zz=z+math.cos(a)*(rad*.99)
    b=cube('Raised moulded tyre tread',(xx,yy,zz),(width*.29,.060,.105),rubber,.014); b.rotation_euler.x=a
  tube('Front leaf spring',(xside*.65,.44,.87),(xside*.65,.44,1.50),.025,black); tube('Rear leaf spring',(xside*.65,.48,-1.65),(xside*.65,.48,-.81),.032,black)
# Mechanically legible exposed V8: valley, separate heads, rocker covers, intake, pulleys, belt, headers.
cube('V8 crankcase',(0,.93,.76),(.62,.56,.72),black,.11)
for x in (-.24,.24):
 cover=cube('Cast cylinder head',(x,.98,.82),(.31,.57,.62),silver,.075); cover.rotation_euler.z=math.copysign(.20,x)
 cube('Ribbed rocker cover',(x,1.32,.77),(.20,.10,.52),oxide,.035)
 for z in (.54,.70,.86,1.02):
  tube('Exposed exhaust header',(x,.87,z),(x*1.8,.68,z-.10),.035,oxide)
 cyl('Front crank pulley',(0,.96,1.16),.19,.12,black,rot=(math.pi/2,0,0)); cyl('Alternator pulley',(.34,1.07,1.10),.11,.09,silver,rot=(math.pi/2,0,0))
 tube('V8 fan belt',(-.20,1.14,1.15),(.35,1.14,1.10),.022,black)
cube('Intake manifold',(0,1.36,.93),(.30,.16,.35),oxide,.045); cyl('Four barrel carburettor',(0,1.51,.93),.15,.15,black,rot=(0,0,0),verts=20)
cyl('Air cleaner rim',(0,1.60,.93),.28,.07,silver,rot=(0,0,0),verts=32); cyl('Air cleaner top',(0,1.65,.93),.25,.04,black,rot=(0,0,0),verts=32)
for x in (-.74,.74):
 tube('Short side exhaust outlet',(x,.63,.20),(x,.63,.78),.065,oxide); cyl('Open exhaust mouth',(x,.63,.79),.07,.045,black,rot=(math.pi/2,0,0),verts=20)
 # Visible front shocks and steering links.
 tube('Front coil shock',(x*.67,.34,1.05),(x*.73,.77,1.39),.035,silver); tube('Tie rod',(x*.72,.53,1.24),(0,.53,1.24),.025,black)
# Narrow grille shell and lamp buckets.
loft('Narrow hand-rolled grille shell',[(1.14,.55,.53,.90,1.50),(1.32,.61,.48,.94,1.47),(1.50,.58,.47,.92,1.40),(1.66,.45,.52,.85,1.28)],oxide)
cube('Black radiator recess',(0,.99,1.413),(.39,.46,.035),black,.02)
for y in (.79,.88,.97,1.06,1.15): tube('Grille vertical steel bar',(-.18,y,1.43),(.18,y,1.43),.012,silver,8)
for x in (-.50,.50):
 cyl('Round headlamp bucket',(x,1.00,1.36),.16,.13,black,rot=(0,0,0)); cyl('Clouded glass lamp',(x,1.00,1.44),.12,.025,glass,rot=(0,0,0))
# Simple welded roll hoop and visible bench seats.
for x in (-.58,.58): tube('Roll cage hoop upright',(x,1.17,-1.45),(x,2.02,-1.45),.047,silver)
tube('Roll cage crossbar',(-.58,2.02,-1.45),(.58,2.02,-1.45),.047,oxide)
for x in (-.30,.30):
 cube('Separate worn bucket seat',(x,.91,-.60),(.42,.31,.42),leather,.10); cube('Seat back',(x,1.18,-.80),(.40,.55,.18),leather,.08)
# Repair patches, bolts, hanging chassis detail and raw bumpers.
for x in (-.79,.79):
 cube('Welded irregular patch',(x,1.02,-.08),(.045,.24,.32),oxide,.04)
 for y in (.94,1.12):
  for z in (-.20,.04): cyl('Patch rivet',(x*1.02,y,z),.018,.025,silver,verts=8)
cube('Front narrow tube bumper',(0,.52,1.88),(1.62,.12,.08),silver,.035); cube('Rear narrow tube bumper',(0,.55,-2.26),(1.56,.12,.08),oxide,.035)

# Human scale study, excluded from the model.
study=[]
def person(name,loc,dim,m):
 o=cube(name,loc,dim,m,.02); o.parent=None; study.append(o); return o
person('Study figure torso',(2.12,1.12,0),(.30,.58,.20),oxide); person('Study figure legs',(2.12,.43,0),(.23,.78,.20),black)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=.13,location=(2.12,1.61,0)); assign(bpy.context.object,leather,'Study figure head',False); study.append(bpy.context.object)
ground=mat('Muted overcast gravel',(.29,.30,.29),.0,.98); cube('Review ground',(0,-.05,0),(8,.1,8),ground,0)
def aim(o,p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-4,7,5),6500,10),((4,5,-4),4200,9),((0,6,-1),2600,12)]:
 bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; aim(l,(0,1,0))
blend.parent.mkdir(parents=True,exist_ok=True); glb.parent.mkdir(parents=True,exist_ok=True); evidence.mkdir(parents=True,exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=str(blend))
car.rotation_euler.x=math.pi/2; bpy.context.view_layer.update(); bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'
views=(('front-three-quarter',(6,-7,4),(0,0,1),5.6),('rear-three-quarter',(-6,7,4),(0,0,1),5.6),('side',(9,0,2.8),(0,0,1),5.2),('top',(0,0,10),(0,0,.7),5.2),('beside-person',(6,-7,4),(0,0,1),5.6))
rendered=[]
for name,direction,target,scale in views:
 for o in study:o.hide_render=(name!='beside-person')
 camera.location=direction; aim(camera,target); camera.data.ortho_scale=scale; scene.render.filepath=str(evidence/(name+'.jpg')); bpy.ops.render.render(write_still=True); rendered.append(str(evidence/(name+'.jpg')))
car.rotation_euler.x=0
for o in bpy.context.selected_objects:o.select_set(False)
for o in list(bpy.data.objects):
 o.select_set(False)
 if o.parent is car:o.select_set(True)
bpy.context.view_layer.objects.active=car
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True,export_materials='EXPORT',use_selection=True)
tris=sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' and o.parent is car for p in o.data.polygons)
if tris>25000 or glb.stat().st_size>8_000_000: raise RuntimeError(f'budget exceeded: {tris} triangles, {glb.stat().st_size} bytes')
print(json.dumps({'renders':rendered,'model':str(glb),'bytes':glb.stat().st_size,'triangles':tris,'sheet':str(sheet)}))
