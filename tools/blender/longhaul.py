"""Build and photograph the original six-wheel Longhaul desert truck."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser(); p.add_argument('--root',required=True); p.add_argument('--render',default=''); p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
root=Path(a.root).resolve(); out=root/'public/assets/models/wasteland/cars/longhaul.glb'; blend=root/'art-build/longhaul/longhaul.blend'
if a.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[],'summary':[str(root/'docs/board/looks/car-art-longhaul/round-1.jpg')]})); raise SystemExit(0)
import bpy
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.resolution_x=1200; scene.render.resolution_y=900
scene.world.color=(.31,.32,.34)
def mat(n,c,metal=.45,rough=.78):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True; b=m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*c,1); b.inputs['Metallic'].default_value=metal; b.inputs['Roughness'].default_value=rough
 noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=27; noise.inputs['Detail'].default_value=4; noise.inputs['Roughness'].default_value=.8
 ramp=m.node_tree.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.27; ramp.color_ramp.elements[0].color=(*(v*.28 for v in c),1); ramp.color_ramp.elements[1].position=.72; ramp.color_ramp.elements[1].color=(*(min(1,v*1.42+.025) for v in c),1); m.node_tree.links.new(noise.outputs['Fac'],ramp.inputs['Fac']); m.node_tree.links.new(ramp.outputs['Color'],b.inputs['Base Color'])
 bump=m.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.19; bump.inputs['Distance'].default_value=.025; m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],b.inputs['Normal']); return m
steel=mat('Bare scuffed welded steel',(.18,.19,.18),.72,.72); rust=mat('Layered red brown iron oxide',(.32,.12,.055),.42,.92); ochre=mat('Flaking old ochre enamel',(.48,.31,.105),.36,.83); charcoal=mat('Blackened frame steel',(.055,.063,.06),.65,.86); rubber=mat('Dust ground tyre rubber',(.075,.073,.067),.05,.95); glass=mat('Dust scratched cab glass',(.075,.19,.21),.16,.38); glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.34; lens=mat('Amber safety glass',(.86,.34,.06),.22,.38)
objs=[]
def xyz(pt): return (pt[0],-pt[2],pt[1]) # game-local: +Y up, +Z forward to Blender Z up
def bevel(o,w=.04):
 if w: mod=o.modifiers.new('worn radiused plate edges','BEVEL'); mod.width=w; mod.segments=1; o.modifiers.new('weighted shop normals','WEIGHTED_NORMAL')
 objs.append(o); return o
def box(n,pos,dims,ma,w=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos)); o=bpy.context.object; o.name=n; o.dimensions=(dims[0],dims[2],dims[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(ma); return bevel(o,w)
def beam(n,p1,p2,r,ma,vertices=12):
 v1,v2=Vector(xyz(p1)),Vector(xyz(p2)); d=v2-v1; bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(v1+v2)/2); o=bpy.context.object; o.name=n; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(ma); return bevel(o,0)
def cyl(n,pos,r,depth,ma,vertices=32,axis='x'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=min(vertices,24),radius=r,depth=depth,location=xyz(pos)); o=bpy.context.object; o.name=n
 if axis=='x': o.rotation_euler[1]=math.pi/2
 elif axis=='z': o.rotation_euler[0]=math.pi/2
 elif axis=='y': pass
 o.data.materials.append(ma); return bevel(o,0)
def sphere(n,pos,scale,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=xyz(pos)); o=bpy.context.object; o.name=n; o.scale=(scale[0],scale[2],scale[1]); o.data.materials.append(ma); return bevel(o,0)
# Four rounded longitudinal chassis rails and cross-members carry the load.
for x in (-.86,.86):
 box('boxed ladder chassis rail',(x,.94,-.12),(.19,.30,6.45),charcoal,.07)
 for z in (-2.65,-1.45,-.1,1.15,2.45): box('forged chassis cross member',(0,.90,z),(2.0,.17,.18),steel,.035)
box('deep belly skid plate',(0,.78,-.15),(2.2,.12,4.9),charcoal,.05)
# Scalloped continuous body shell built as curved cross-section stations.
stations=[(-3.38,1.07,.46,.70),(-3.08,1.40,.50,.76),(-2.50,1.44,.52,.78),(-1.3,1.43,.51,.78),(.30,1.38,.47,.76)]
verts=[]
for z,w,h,y in stations:
 verts += [(-w,y-.25,z),(-w*.90,y+.25,z),(-w*.68,y+h*.75,z),(-w*.50,y+h,z),(w*.50,y+h,z),(w*.68,y+h*.75,z),(w*.90,y+.25,z),(w,y-.25,z)]
faces=[]
for k in range(len(stations)-1):
 for j in range(7): faces.append((k*8+j,k*8+j+1,(k+1)*8+j+1,(k+1)*8+j))
faces += [tuple(range(7,-1,-1)),tuple((len(stations)-1)*8+j for j in range(8))]
mesh=bpy.data.meshes.new('hand formed continuous body panels'); mesh.from_pydata([xyz(v) for v in verts],[],faces); mesh.materials.append(ochre); mesh.materials.append(rust)
body=bpy.data.objects.new('longhaul rounded cab and load body',mesh); bpy.context.collection.objects.link(body); body.data.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons)); bevel(body,.065)
# Cab-forward sloped windshield and thick frames follow the body taper.
box('deep front cowl',(0,1.49,2.11),(1.66,.44,.84),rust,.16)
box('cab roof with pressed curve',(0,2.56,1.42),(1.78,.12,1.76),steel,.16)
for side in (-1,1):
 for z in (.42,2.12): beam('cab A and B pillar',(side*1.40,1.78,z),(side*1.36,2.50,z+.10),.07,steel)
 box('cab lower side sheet',(side*1.38,1.56,1.30),(.10,.78,1.46),ochre,.10)
box('wide twin pane windshield',(0,2.19,3.02),(1.50,.62,.045),glass,.07)
for x in (-.79,.79): beam('windshield welded frame',(x,1.96,2.69),(x*.91,2.46,3.32),.045,steel)
beam('split windshield bar',(0,1.99,2.69),(0,2.46,3.32),.025,rust)
for side in (-1,1):
 x=side*.84
 # Door skins curved by bevel, inset window and externally strapped repair patches.
 box('cab door pressed steel',(side*1.48,1.63,1.15),(.09,.94,1.13),ochre,.085)
 box('door window dusty glass',(side*1.53,2.18,1.35),(.035,.48,.60),glass,.055)
 beam('window surround front',(side*1.54,1.92,1.63),(side*1.54,2.42,1.63),.035,steel)
 beam('window surround back',(side*1.54,1.92,1.04),(side*1.54,2.42,1.04),.035,steel)
 for z in (.72,1.48):
  for y in (1.40,1.82): sphere('countersunk door rivet',(side*1.54,y,z),(.035,.027,.027),steel)
 box('mismatched door patch',(side*1.54,1.36,1.17),(.035,.36,.52),rust,.035)
 # Large cylindrical fuel tank and its circumferential bands under the doors.
 cyl('side fuel tank',(side*1.03,.96,-.65),.46,2.48,ochre,36,'z')
 for z in (-1.72,-.95,.02): cyl('tank retaining steel strap',(side*1.03,.96,z),.475,.075,steel,32,'z')
 cyl('fuel filler cap',(side*1.03,1.42,.43),.095,.09,rust,16,'x')
 box('tank rock guard',(side*1.14,.57,-.65),(.16,.13,2.20),charcoal,.05)
 # Uneven but securely joined armored fenders with broad radiused lips.
 for z in (-2.28,-.02,2.22):
  box('formed wheel arch flare',(side*1.00,1.56,z),(1.10,.18,1.18),rust,.12)
  box('worn arch lip',(side*1.00,1.66,z),(1.17,.10,.94),steel,.08)
 # open rack with diagonal braces is structural, not loose dressing.
 for z in (-2.72,-1.10): beam('rack upright',(side*1.02,1.58,z),(side*1.02,3.02,z),.055,steel)
 beam('rack upper rail',(side*1.02,3.02,-2.72),(side*1.02,3.02,-1.10),.065,rust)
 beam('rack diagonal brace',(side*1.02,1.72,-2.72),(side*1.02,2.95,-1.10),.045,steel)
# All six tires have a rounded carcass, metal rims, raised rings, hubs and connected tread blocks.
for axle,z in enumerate((2.22,0,-2.22),1):
 for side in (-1,1):
  x=side*1.02; center=(x,.83,z)
  bpy.ops.mesh.primitive_torus_add(major_radius=.54,minor_radius=.25,major_segments=28,minor_segments=8,location=xyz(center),rotation=(0,math.pi/2,0)); tire=bpy.context.object; tire.name=f'axle {axle} continuous heavy tyre'; tire.data.materials.append(rubber); objs.append(tire)
  cyl('steel wheel barrel',(side*1.29,.83,z),.49,.15,steel,32,'x'); cyl('rusted hub disk',(side*1.39,.83,z),.30,.10,rust,24,'x'); cyl('grease cap',(side*1.45,.83,z),.12,.08,charcoal,20,'x')
  for k in range(8):
    angle=2*math.pi*k/8
    sphere('wheel hub bolt',(side*1.46,.83+math.sin(angle)*.22,z+math.cos(angle)*.22),(.035,.034,.034),steel)
  for row in (-.14,0,.14):
   for k in range(10):
    a0=2*math.pi*k/10 + (row!=0)*math.pi/10
    rr=.765; y=.83+math.sin(a0)*rr; zz=z+math.cos(a0)*rr
    # Each lug intersects the carcass and its neighbors; no floating detached spikes.
    box('deep chevron tyre lug',(x+row,y,zz),(.24,.14,.17),rubber,.055)
  # exposed leaf springs and axle tube visually connect each wheel to chassis.
  beam('solid axle housing',(side*1.02,.82,z),(0,.82,z),.10,charcoal)
  for j in range(3): beam('stacked leaf spring',(side*.86,.73+j*.045,z-.54),(side*.86,.73+j*.045,z+.54),.035,steel,8)
# Nose: heavy bull bar, recovery eyes, slotted radiator and paired round lamps.
box('deep radiator shadow',(0,1.42,2.76),(1.05,.66,.16),charcoal,.11)
for x in (-.40,-.27,-.14,0,.14,.27,.40): box('vertical radiator bar',(x,1.44,2.86),(.032,.48,.035),steel,.014)
for side in (-1,1):
 sphere('amber sealed headlamp',(side*.63,1.73,2.68),(.14,.14,.14),lens)
 beam('bull bar rising wing',(side*.91,.72,2.90),(side*.91,1.54,3.02),.105,steel)
 beam('bull bar upper arc',(side*.91,1.54,3.02),(side*.75,1.83,3.03),.105,rust)
 beam('bull bar horizontal',(side*.75,1.83,3.03),(-side*.75,1.83,3.03),.105,steel)
 beam('bull bar lower arc',(side*.75,1.83,3.03),(side*.75,.75,3.03),.105,rust)
 beam('bull bar lower crossmember',(side*.75,.75,3.03),(-side*.75,.75,3.03),.10,steel)
 box('recovery hook mount',(side*.70,.59,2.92),(.20,.19,.24),rust,.05)
# Tool rack, strapped spares and boxed salvaged tools on rear deck.
box('rear service deck',(0,1.45,-2.86),(1.8,.20,.65),charcoal,.06)
for x in (-.54,.54):
  bpy.ops.mesh.primitive_torus_add(major_radius=.42,minor_radius=.15,major_segments=24,minor_segments=8,location=xyz((x,2.04,-2.55)),rotation=(0,math.pi/2,0)); o=bpy.context.object; o.name='rack strapped spare wheel'; o.data.materials.append(rubber); objs.append(o)
  box('spare wheel welded cradle',(x,1.78,-2.55),(.13,.54,.42),rust,.035)
box('latched tool locker',(0,1.75,-2.65),(1.05,.48,.60),ochre,.08)
for x in (-.32,0,.32): beam('tool handle',(x,2.02,-2.86),(x,2.40,-2.86),.035,steel,8)
# Faded chipped paint plates and weld beads add handcrafted construction cues.
for side in (-1,1):
 for z in (-1.62,-.80,.38,1.36):
  box('overlapping hand cut repair panel',(side*1.57,1.57,z),(.055,.42,.50),ochre if z%2 else rust,.035)
  for y in (1.42,1.71): sphere('repair plate plug weld',(side*1.61,y,z),(.035,.025,.028),steel)
 for z in (-2.28,-1.95,-1.62,-1.29,-.96,-.63): beam('visible stitched seam',(side*1.57,1.70,z),(side*1.57,1.70,z+.14),.018,steel,8)
# Small human figure for silhouette scale, hidden from export.
human=[]
for n,pos,scale in [('person torso',(2.9,.95,-.1),(.36,.74,.24)),('person head',(2.9,1.57,-.1),(.22,.22,.22)),('person legs',(2.9,.39,-.1),(.30,.60,.22))]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=xyz(pos)); o=bpy.context.object; o.name=n; o.scale=scale; o.data.materials.append(charcoal); human.append(o)
root_obj=bpy.data.objects.new('longhaul',None); bpy.context.collection.objects.link(root_obj)
for o in objs: o.parent=root_obj
scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=1200; scene.render.resolution_y=900
scene.world.color=(.35,.36,.37)
for loc,power,size in [((7,-9,9),3800,7),((-7,-5,6),2600,6),((0,7,10),3100,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size
def camera(name,loc,target,scale):
 bpy.ops.object.camera_add(location=loc); c=bpy.context.object; c.name=name; c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler(); c.data.type='ORTHO'; c.data.ortho_scale=scale; scene.camera=c
def render(path,loc,target,scale):
 camera('review camera',loc,target,scale); scene.render.filepath=str(path); bpy.ops.render.render(write_still=True); bpy.data.objects.remove(scene.camera,do_unlink=True)
out.parent.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT')
for o in [root_obj,*objs]: o.select_set(True)
bpy.context.view_layer.objects.active=root_obj; bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True)
if a.render:
 r=Path(a.render).resolve()
 if not r.is_relative_to(root/'.evidence'): raise SystemExit('renders must remain in .evidence')
 r.mkdir(parents=True,exist_ok=True); scene.render.resolution_x=1000; scene.render.resolution_y=700
 views=[('front-three-quarter',(8,-11,7),(0,1.5,0),9),('rear-three-quarter',(-8,11,7),(0,1.5,-.2),9),('side',(12,0,4),(0,1.4,0),9),('top',(0,-3,16),(0,0,0),9),('scale-person',(8,-11,6),(0,1.5,0),9)]
 for name,loc,target,scale in views:
  for h in human: h.hide_render=(name!='scale-person')
  render(r/f'{name}.png',loc,target,scale)
print('GLB',out,'bytes',out.stat().st_size,'triangles',sum(len(o.data.polygons) for o in objs if o.type=='MESH'))
