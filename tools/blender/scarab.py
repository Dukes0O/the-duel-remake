"""Build the original Scarab desert buggy and its single-round review views.

Run from the repository root:
  blender -b -t 4 --python-exit-code 1 --python tools/blender/scarab.py -- --root .

The model is authored in metres with Y up and +Z forward, matching vehicle sockets.
The displayed person, ground, lights and cameras are review-only and stay out of the GLB.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/cars/scarab.glb'
blend = root / 'art-build/cars/scarab.blend'
evidence = root / '.evidence/2026-11-05/CAR-ART-SCARAB/round-1'
sheet = root / 'docs/board/looks/car-art-scarab/round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(evidence)],'summary':[str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.world=bpy.data.worlds.new('Scarab neutral studio')
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1000; scene.render.resolution_y=700; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.quality=90
scene.render.film_transparent=False
scene.world.color=(.035,.038,.035)

def material(name,color,metal=.5,rough=.78):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=7.0; noise.inputs['Detail'].default_value=3.0
    ramp=m.node_tree.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.26
    ramp.color_ramp.elements[0].color=(*(c*.48 for c in color),1)
    ramp.color_ramp.elements[1].position=.76; ramp.color_ramp.elements[1].color=(*(min(1,c*1.42+.025) for c in color),1)
    m.node_tree.links.new(noise.outputs['Fac'],ramp.inputs['Fac']); m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
    return m

steel=material('soot-dark welded tube',(.105,.112,.105),.68,.82)
rust=material('oxidized steel',(.30,.105,.043),.58,.92)
ochre=material('old sand-yellow enamel',(.39,.285,.105),.42,.84)
rubber=material('cracked tyre rubber',(.033,.037,.034),.12,.96)
iron=material('blackened iron',(.055,.061,.057),.62,.82)
alloy=material('scratched hub steel',(.35,.34,.29),.78,.66)
glass=material('dust filmed instrument glass',(.055,.09,.085),.25,.48)
flagmat=material('faded red sand flag',(.42,.10,.045),.05,.9)
personmat=material('scale figure canvas',(.14,.16,.13),.05,.95)
floor_mat=material('neutral display ground',(.07,.075,.07),.05,.96)

vehicle=bpy.data.objects.new('scarab',None); scene.collection.objects.link(vehicle)
vehicle['vehicle_id']='scarab'; vehicle['units']='metres'; vehicle['forward']='+Z'; vehicle['up']='+Y'
meshes=[]
def mesh_obj(name,verts,faces,mat,parent=vehicle):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.materials.append(mat); me.update()
    ob=bpy.data.objects.new(name,me); scene.collection.objects.link(ob); ob.parent=parent
    for p in me.polygons:p.use_smooth=True
    meshes.append(ob); return ob
def beam(name,a,b,r,mat=steel,sides=10):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=d.length,location=(a+b)/2)
    ob=bpy.context.object; ob.name=name; ob.rotation_euler=d.to_track_quat('Z','Y').to_euler(); ob.data.materials.append(mat); ob.parent=vehicle
    meshes.append(ob); return ob
def box(name,loc,dim,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); ob=bpy.context.object; ob.name=name; ob.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); ob.data.materials.append(mat); ob.parent=vehicle; meshes.append(ob)
    if bevel:
        mod=ob.modifiers.new('hand dressed corners','BEVEL');mod.width=bevel;mod.segments=1
        ob.modifiers.new('welded face normals','WEIGHTED_NORMAL')
    return ob
def torus(name,loc,major,minor,mat,rotation=(math.pi/2,0,0),major_segments=40,minor_segments=10):
    bpy.ops.mesh.primitive_torus_add(major_segments=major_segments,minor_segments=minor_segments,major_radius=major,minor_radius=minor,location=loc,rotation=rotation)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(mat);ob.parent=vehicle;meshes.append(ob);return ob
def cyl(name,loc,radius,depth,mat,rotation=(0,math.pi/2,0),verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rotation)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(mat);ob.parent=vehicle;meshes.append(ob);return ob

# Dimensions match the model-local socket contract: 2.05 wide, 3.82 long, 1.72 high.
# Four large paddle tyres are centered at z=+/-1.19; bottoms sit at ground y=0.
for z in (1.19,-1.19):
    for x in (-.78,.78):
        wheel=bpy.data.objects.new(f'scarab-wheel-{x:+.2f}-{z:+.2f}',None);scene.collection.objects.link(wheel);wheel.parent=vehicle;wheel.location=(x,.62,z)
        torus('paddle tyre carcass',(x,.62,z),.535,.115,rubber,major_segments=36,minor_segments=10)
        cyl('deep dished wheel centre',(x,.62,z),.37,.22,iron)
        cyl('scarred hub',(x*1.17,.62,z),.19,.055,alloy)
        cyl('grease cap',(x*1.22,.62,z),.09,.06,rust,verts=12)
        # Individual broad, angled paddles show real directional sand tread.
        for n in range(18):
            a=2*math.pi*n/18; yy=.62+.60*math.sin(a); zz=z+.60*math.cos(a)
            paddle=box('welded paddle lug',(x,yy,zz),(.19,.20,.075),rubber,.012)
            paddle.rotation_euler[0]=a*.28
        # Brake drum and exposed steering knuckle at the inside of each wheel.
        cyl('vented brake drum',(x*.72,.62,z),.30,.12,rust)
        beam('suspension upper arm',(x*.30,.92,z),(x*.91,.81,z+.12),.055,steel)
        beam('suspension lower arm',(x*.28,.41,z),(x*.92,.49,z-.09),.075,rust)
        beam('long travel damper',(x*.55,.43,z),(x*.78,1.02,z),.066,alloy)
        # A helical spring wrapped around the real damper shaft.
        pts=[]
        for i in range(49):
            t=i/48; ang=t*math.pi*8; pts.append((x*.55+.13*math.cos(ang),.45+.53*t,z+.13*math.sin(ang)))
        cu=bpy.data.curves.new('hand wound coil spring','CURVE');cu.dimensions='3D';cu.bevel_depth=.025;cu.bevel_resolution=2
        sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
        for p,co in zip(sp.points,pts):p.co=(*co,1)
        ob=bpy.data.objects.new('long travel coil spring',cu);scene.collection.objects.link(ob);ob.data.materials.append(ochre);ob.parent=vehicle;meshes.append(ob)

# Open triangulated tube chassis; intentionally no body shell to hide the welded construction.
for x in (-.56,.56):
    beam('lower ladder rail',(x,.48,-1.58),(x,.48,1.60),.065,steel)
    beam('upper cage rail',(x,1.32,-1.25),(x,1.38,1.18),.055,rust)
    for z in (-1.35,-.52,.42,1.31):beam('vertical cage leg',(x,.48,z),(x,1.35,z),.045,steel)
    beam('side shoulder diagonal',(x,.50,-1.32),(x,1.30,.36),.045,ochre)
    beam('rear cage brace',(x,.51,.52),(x,1.34,-1.28),.045,rust)
for y,z,w in ((.49,-1.50,1.17),(.50,-.55,1.17),(.50,.46,1.17),(.50,1.51,1.12),(1.34,-1.25,1.12),(1.34,.35,1.12),(1.37,1.14,1.10)):
    beam('cross welded tube',(-w/2,y,z),(w/2,y,z),.045,steel)
for side in (-1,1):
    beam('front triangulated nose', (0,.54,1.58),(side*.56,1.34,1.08),.052,ochre)
    beam('rear tower brace',(0,.51,-1.54),(side*.56,1.34,-1.20),.055,rust)

# Cockpit and battered partial panels; the driver can see the engine, links and dirt through it.
box('low floor pan',(0,.56,-.06),(1.02,.12,1.42),iron,.035)
box('left footwell shield',(-.47,.66,.48),(.08,.34,.62),ochre,.018)
box('right torn side skin',(.56,.76,-.43),(.055,.42,.52),rust,.015)
box('skewed nose plate',(0,.85,1.44),(.87,.13,.40),ochre,.035)
box('nose patch welded over split',(-.19,.94,1.42),(.24,.026,.29),rust,.012)
box('small lower skid plate',(0,.37,.45),(.90,.08,.60),steel,.025)
box('bucket seat',(0,.93,-.08),(.54,.53,.56),rubber,.05)
box('seat back reinforcement',(0,1.20,-.30),(.58,.10,.14),rust,.02)
beam('steering column',(0,1.15,.70),(0,1.02,.30),.035,alloy)
torus('three spoke steering wheel',(0,1.02,.27),.19,.025,steel,rotation=(math.pi/2,0,0),major_segments=24,minor_segments=8)
box('small instrument box',(0,1.25,.57),(.48,.13,.30),iron,.025)
for x in (-.13,0,.13):cyl('dusty analogue gauge',(x,1.33,.58),.052,.025,glass,rotation=(0,0,0),verts=16)

# Rear mounted, exposed air-cooled engine: block, finned cylinders, flywheel and twin exhausts.
box('rear engine crankcase',(0,.89,-.82),(.78,.53,.73),iron,.045)
for side in (-1,1):
    cyl('air cooled cylinder',(side*.30,1.19,-.79),.19,.42,rust,rotation=(math.pi/2,0,0),verts=16)
    for y in (1.02,1.10,1.18,1.26,1.34):
        torus('cooling fin',(side*.30,y,-.79),.193,.018,alloy,rotation=(0,math.pi/2,0),major_segments=16,minor_segments=6)
    beam('exhaust header',(side*.30,.98,-.91),(side*.49,.88,-1.28),.044,rust)
    beam('high side exhaust',(side*.49,.88,-1.28),(side*.56,1.18,-1.49),.052,steel)
    cyl('exhaust dark mouth',(side*.56,1.18,-1.52),.062,.06,iron,rotation=(0,0,0),verts=12)
torus('exposed flywheel',(0,.88,-1.22),.27,.045,rust,rotation=(0,math.pi/2,0),major_segments=28,minor_segments=8)
box('rear engine skid cage',(0,.54,-1.50),(1.26,.13,.42),steel,.025)
for side in (-1,1):
    box('bolt-on armor scab',(side*.61,.79,-.45),(.08,.30,.38),ochre,.015)
    for y in (.68,.86):cyl('armor plate rivet',(side*.66,y,-.45),.035,.03,alloy,verts=8)

# Sand flag on a flexible, visibly sprung whip extending above the vehicle.
for i in range(8):
    t=i/8; beam('whip mast segment',(0,1.36+t*1.15,-1.12-t*.17),(0,1.36+(t+1/8)*1.15,-1.12-(t+1/8)*.17),.012,alloy,6)
flagverts=[(-.01,2.22,-2.08),(.42,2.18,-2.10),(.30,2.43,-2.12),(.02,2.42,-2.10)]
mesh_obj('faded triangular sand flag',flagverts,[(0,1,2,3)],flagmat)
beam('whip foot',(0,1.30,-1.05),(0,1.42,-1.18),.045,rust,8)

# Hand-cut welds, mismatched bolts, scrape strips and tow eyes.
for z in (-1.32,-.65,.10,.78,1.25):
    for side in (-1,1):
        cyl('visible cage joint cap',(side*.59,1.32,z),.065,.028,alloy,verts=10)
for side in (-1,1):
    beam('front tow loop',(side*.36,.48,1.52),(side*.36,.35,1.77),.035,rust,8)
    beam('rear tow loop',(side*.34,.48,-1.50),(side*.34,.35,-1.75),.035,alloy,8)
for i in range(5):
    box('scraped enamel edge',( -.44+i*.22,.93,1.56),(.11,.012,.025),rust,.003)

# Human scale figure is review-only. Feet at y=0; approximately 1.72 m tall.
person=bpy.data.objects.new('review-only scale person',None);scene.collection.objects.link(person);person.location=(2.0,0,-.2)
person_parts=[]
def person_box(name,local,size,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=local);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);o.parent=person
    mod=o.modifiers.new('soft cloth edges','BEVEL');mod.width=.035;mod.segments=1
    person_parts.append(o);return o
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=.13,location=(0,1.59,0))
head=bpy.context.object;head.name='review person head';head.data.materials.append(personmat);head.parent=person;person_parts.append(head)
person_box('review person torso',(0,1.13,0),(.34,.66,.22),personmat)
for x in (-.20,.20):person_box('review person leg',(x,.46,0),(.14,.78,.16),iron)
person_box('review person arms',(0,1.28,0),(.18,.50,.16),rust)
ground=bpy.data.objects.new('review ground',None);scene.collection.objects.link(ground)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.035,0),rotation=(math.pi/2,0,0));floor=bpy.context.object;floor.name='review-only ground';floor.data.materials.append(floor_mat)

def aim(obj,point,up='Y'):
    forward=(Vector(point)-obj.location).normalized()
    up_hint=Vector((0,0,1) if up=='Z' else (0,1,0))
    right=forward.cross(up_hint).normalized()
    true_up=right.cross(forward).normalized()
    basis=Matrix(((right.x,true_up.x,-forward.x),(right.y,true_up.y,-forward.y),(right.z,true_up.z,-forward.z)))
    obj.rotation_euler=basis.to_euler()
for loc,power,size in [((-4,7,5),1700,5),( (4,5,-4),1100,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;aim(l,(0,.7,0))
scene.view_settings.view_transform='AgX'
out.parent.mkdir(parents=True,exist_ok=True);blend.parent.mkdir(parents=True,exist_ok=True);evidence.mkdir(parents=True,exist_ok=True);sheet.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

views=[
 ('front-three-quarter',(5,3.6,6),(0,.83,.12),5.2),
 ('rear-three-quarter',(-5,3.6,-6),(0,.85,-.15),5.2),
 ('side',(7,2.1,0),(0,.85,0),4.8),
 ('top',(0,8,0),(0,.2,0),4.8),
 ('beside-person',(5,3.5,7),(.45,.9,0),5.6),
]
renders=[]
for name,loc,target,scale in views:
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.name='review camera '+name;cam.data.type='ORTHO';cam.data.ortho_scale=scale;aim(cam,target,'Z' if name=='top' else 'Y');scene.camera=cam
    # Exclude the person except in the dedicated scale view.
    for ob in person_parts: ob.hide_render=(name!='beside-person')
    scene.render.filepath=str(evidence/f'{name}.jpg');bpy.ops.render.render(write_still=True);renders.append(str(evidence/f'{name}.jpg'))
    bpy.data.objects.remove(cam,do_unlink=True)
for ob in person_parts:ob.hide_render=False

# Export only the car root and its descendants. The GLB is a candidate for Claude's review,
# not installed by game code in this art-only card.
bpy.ops.object.select_all(action='DESELECT')
for ob in [vehicle]+meshes:ob.select_set(True)
bpy.context.view_layer.objects.active=vehicle
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=False,export_apply=True)
triangles=sum(sum(max(0,len(poly.vertices)-2) for poly in ob.data.polygons) for ob in meshes if ob.type=='MESH')
if triangles>25000:raise RuntimeError(f'Scarab has {triangles} triangles; budget is 25000')
if out.stat().st_size>8*1024*1024:raise RuntimeError(f'Scarab GLB is {out.stat().st_size} bytes; budget is 8 MB')
manifest={'id':'scarab','dimensions_m':{'width':2.05,'length':3.82,'height':1.72},'wheel_radius_m':.62,
          'triangles':triangles,'bytes':out.stat().st_size,'forward':'+Z','up':'+Y','sockets':['front','rear','roof','hood','left','right','door','shield'],
          'renders':renders}
(evidence/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
