"""Build the original Scarab desert buggy and its round-three review views.

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
evidence = root / '.evidence/2026-11-05/CAR-ART-SCARAB/round-3'
sheet = root / 'docs/board/looks/car-art-scarab/round-3.jpg'
texture_dir = root / 'public/assets/models/wasteland/cars/textures'
reference = root / '.qa-dist/scarab-reference.png'
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
scene.world.color=(.30,.27,.21)

def material(name,color,metal=.5,rough=.78):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=28.0; noise.inputs['Detail'].default_value=2.0
    ramp=m.node_tree.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.27
    ramp.color_ramp.elements[0].color=(*(c*.78 for c in color),1)
    ramp.color_ramp.elements[1].position=.73; ramp.color_ramp.elements[1].color=(*(min(1,c*1.16+.012) for c in color),1)
    m.node_tree.links.new(noise.outputs['Fac'],ramp.inputs['Fac']); m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
    return m

def pictured_material(name,color,metal,rough,image_path):
    m=material(name,color,metal,rough)
    nodes=m.node_tree.nodes; links=m.node_tree.links
    texcoord=nodes.new('ShaderNodeTexCoord')
    image=nodes.new('ShaderNodeTexImage'); image.image=bpy.data.images.load(str(image_path),check_existing=True)
    image.image.pack(); image.interpolation='Linear'; image.extension='REPEAT'
    coordinates=texcoord.outputs['UV'] if 'tire' in name else texcoord.outputs['Object']
    links.new(coordinates,image.inputs['Vector'])
    color=image.outputs['Color']
    if 'rust' in name:
        darken=nodes.new('ShaderNodeHueSaturation'); darken.inputs['Value'].default_value=.22
        links.new(color,darken.inputs['Color']); color=darken.outputs['Color']
    links.new(color,nodes.get('Principled BSDF').inputs['Base Color'])
    return m

steel=pictured_material('dark oily rusted chromoly tubing',(.045,.028,.023),.66,.83,texture_dir/'oily-rust.jpg')
rust=pictured_material('exposed dark red-brown iron oxide',(.12,.035,.02),.48,.95,texture_dir/'oily-rust.jpg')
paint=material('chipped deep olive enamel',(.105,.14,.085),.42,.87)
rubber=pictured_material('dust-caked paddle tire rubber',(.025,.026,.024),.02,.99,texture_dir/'dusty-paddle-rubber.jpg')
dust=pictured_material('ground-in sand and road dust on lower chassis',(.20,.15,.09),.01,.98,texture_dir/'dusty-paddle-rubber.jpg')
iron=material('oiled black iron',(.043,.049,.046),.66,.88)
alloy=material('scratched bare steel',(.25,.25,.22),.82,.67)
glass=material('dust filmed instrument glass',(.055,.09,.085),.25,.48)
flagmat=material('faded red sand flag',(.42,.10,.045),.05,.9)
personmat=material('scale figure canvas',(.14,.16,.13),.05,.95)
floor_mat=material('sunlit sand',(.40,.34,.24),.01,.98)

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

def paddle_tyre(name, center, major=.43, section=.19, width=.40, segments=72, rings=14):
    """Closed tire surface with broad, swept paddles blended into its carcass."""
    cx,cy,cz=center; verts=[]; faces=[]
    uv_faces=[]
    for i in range(segments):
        theta=2*math.pi*i/segments
        for j in range(rings):
            phi=2*math.pi*j/rings
            sweep=(phi-math.pi/2)*.65
            delta=(theta-sweep+math.pi)%(2*math.pi)-math.pi
            pitch=2*math.pi/10
            dist=abs((delta+pitch/2)%pitch-pitch/2)
            across=abs((phi-math.pi/2+math.pi)%(2*math.pi)-math.pi)
            lug=.13*max(0.0,min(1.0,(.21-dist)/.08))*max(0.0,1-across/1.35) if dist<.21 else 0.0
            radius=major+section*math.sin(phi)+lug
            verts.append((cx+width*.5*math.cos(phi),cy+radius*math.sin(theta),cz+radius*math.cos(theta)))
    for i in range(segments):
        ni=(i+1)%segments
        for j in range(rings):
            nj=(j+1)%rings
            a=i*rings+j; b=ni*rings+j; c=ni*rings+nj; d=i*rings+nj
            faces.append((a,b,c,d))
            uv_faces.append(((i/segments*3.4,j/rings*1.5),
                             ((i+1)/segments*3.4,j/rings*1.5),
                             ((i+1)/segments*3.4,(j+1)/rings*1.5),
                             (i/segments*3.4,(j+1)/rings*1.5)))
    ob=mesh_obj(name,verts,faces,rubber)
    uv=ob.data.uv_layers.new(name='Metre-scaled tread texture')
    for face_index,(poly,coords) in enumerate(zip(ob.data.polygons,uv_faces)):
        for loop_index,coord in zip(poly.loop_indices,coords):uv.data[loop_index].uv=coord
        i,j=divmod(face_index,rings)
        theta=(i+.5)*2*math.pi/segments; phi=(j+.5)*2*math.pi/rings
        sweep=(phi-math.pi/2)*.65
        delta=(theta-sweep+math.pi)%(2*math.pi)-math.pi
        dist=abs((delta+math.pi/10)%(math.pi/5)-math.pi/10)
        across=abs((phi-math.pi/2+math.pi)%(2*math.pi)-math.pi)
        if dist<.14 and across<.75:poly.use_smooth=False
    return ob

# Dimensions match the model-local socket contract: 2.05 wide, 3.82 long, 1.72 high.
# Round, broad tyres fill the corners; each lug is blended into its carcass.
wheel_y=.62
for z in (1.23,-1.23):
    for x in (-.875,.875):
        inner_x=x-math.copysign(.15,x)
        shock_x=x*.66; shock_z=z+math.copysign(.22,z)
        wheel=bpy.data.objects.new(f'scarab-wheel-{x:+.2f}-{z:+.2f}',None);scene.collection.objects.link(wheel);wheel.parent=vehicle;wheel.location=(x,wheel_y,z)
        paddle_tyre('continuous carcass with swept paddle tread',(x,wheel_y,z),width=.30)
        cyl('deep dished wheel centre',(x,wheel_y,z),.38,.28,iron)
        cyl('scarred rim',(x*1.02,wheel_y,z),.31,.30,alloy,verts=24)
        cyl('scarred hub',(x*1.19,wheel_y,z),.19,.075,rust,verts=20)
        cyl('grease cap',(x*1.25,wheel_y,z),.09,.08,steel,verts=16)
        for n in range(8):
            a=2*math.pi*n/8
            cyl('rim vent fastener',(x*1.20,wheel_y+.245*math.sin(a),z+.245*math.cos(a)),.025,.035,iron,verts=8)
        cyl('vented brake disc',(x*.72,wheel_y,z),.30,.15,rust,verts=24)
        # Upper and lower A-arms meet at the hub and at separate chassis mounts.
        for dz in (-.28,.28):
            beam('upper A-arm forward link',(x*.32,.98,z+dz*.45),(inner_x,.88,z+dz),.050,steel)
            beam('upper A-arm rear link',(x*.32,.98,z-dz*.45),(inner_x,.88,z-dz),.050,steel)
            beam('dust packed lower A-arm forward link',(x*.27,.37,z+dz*.40),(inner_x,.43,z+dz),.068,dust)
            beam('dust packed lower A-arm rear link',(x*.27,.37,z-dz*.40),(inner_x,.43,z-dz),.068,dust)
        beam('damper lower clevis',(shock_x,.42,z),(inner_x,.50,z),.045,iron)
        beam('coil-over damper body',(shock_x,.48,shock_z),(shock_x,1.04,shock_z),.070,iron)
        beam('polished shock piston',(shock_x,.64,shock_z),(shock_x,1.12,shock_z),.026,alloy)
        pts=[]
        for i in range(49):
            t=i/48; ang=t*math.pi*12; pts.append((shock_x+.096*math.cos(ang),.52+.56*t,shock_z+.096*math.sin(ang)))
        cu=bpy.data.curves.new('individual six-turn coil-over spring','CURVE');cu.dimensions='3D';cu.bevel_depth=.024;cu.bevel_resolution=1
        sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
        for p,co in zip(sp.points,pts):p.co=(*co,1)
        ob=bpy.data.objects.new('long travel coil spring',cu);scene.collection.objects.link(ob);ob.data.materials.append(alloy);ob.parent=vehicle;meshes.append(ob)

# The fifth tyre rides in a braced cradle over the rear engine.
spare_center=(0,1.54,-1.28)
paddle_tyre('rear mounted spare with integrated paddle tread',spare_center,width=.32,segments=72,rings=14)
cyl('spare wheel dish',(0,1.54,-1.28),.34,.24,iron,verts=24)
cyl('spare hub',(0,1.54,-1.28),.16,.28,alloy,verts=20)
beam('spare cradle cross tube',(-.53,1.22,-1.10),(.53,1.22,-1.10),.055,steel)
for side in (-1,1):
    beam('spare cradle diagonal',(side*.48,1.18,-1.10),(side*.16,1.36,-1.28),.045,rust)

# Open triangulated tube chassis; intentionally no body shell to hide the welded construction.
for x in (-.56,.56):
    beam('lower ladder rail',(x,.48,-1.58),(x,.48,1.60),.065,steel)
    beam('upper cage rail',(x,1.32,-1.25),(x,1.38,1.18),.055,steel)
    for z in (-1.35,-.52,.42,1.31):beam('vertical cage leg',(x,.48,z),(x,1.35,z),.045,steel)
    beam('side shoulder diagonal',(x,.50,-1.32),(x,1.30,.36),.045,paint)
    beam('rear cage brace',(x,.51,.52),(x,1.34,-1.28),.045,steel)
for y,z,w in ((.49,-1.50,1.17),(.50,-.55,1.17),(.50,.46,1.17),(.50,1.51,1.12),(1.34,-1.25,1.12),(1.34,.35,1.12),(1.37,1.14,1.10)):
    beam('cross welded tube',(-w/2,y,z),(w/2,y,z),.045,steel)
for side in (-1,1):
    beam('front triangulated nose', (0,.54,1.58),(side*.56,1.34,1.08),.052,steel)
    beam('rear tower brace',(0,.51,-1.54),(side*.56,1.34,-1.20),.055,steel)

# Cockpit and battered partial panels; the driver can see the engine, links and dirt through it.
box('low floor pan',(0,.56,-.06),(1.02,.12,1.42),iron,.035)
box('left footwell shield',(-.47,.66,.48),(.08,.34,.62),paint,.018)
box('right torn side skin',(.56,.76,-.43),(.055,.42,.52),rust,.015)
box('skewed nose plate',(0,.85,1.44),(.87,.13,.40),paint,.035)
box('nose patch welded over split',(-.19,.94,1.42),(.24,.026,.29),rust,.012)
box('mud and dust coated lower skid plate',(0,.37,.45),(.90,.08,.60),dust,.025)
for sx in (-.27,.27):
    box('sculpted seat cushion',(sx,.82,-.02),(.43,.16,.50),rubber,.075)
    box('high wraparound bucket seat back',(sx,1.05,-.30),(.43,.50,.17),rubber,.07)
    box('seat shoulder bolster',(sx-.18,1.06,-.29),(.07,.46,.20),iron,.03)
    box('seat shoulder bolster',(sx+.18,1.06,-.29),(.07,.46,.20),iron,.03)
    box('seat back reinforcement',(sx,1.20,-.30),(.45,.10,.14),rust,.02)
    for strap_z in (-.39,-.19):
        strap=box('faded canvas restraint strap',(sx,1.05,strap_z),(.045,.35,.014),flagmat,.006)
        strap.rotation_euler[1]=-.12 if sx<0 else .12
beam('steering column',(.27,1.15,.70),(.27,1.02,.30),.035,alloy)
torus('three spoke steering wheel',(.27,1.02,.27),.19,.025,steel,rotation=(math.pi/2,0,0),major_segments=24,minor_segments=8)
box('small instrument box',(0,1.25,.57),(.48,.13,.30),iron,.025)
for x in (-.13,0,.13):cyl('dusty analogue gauge',(x,1.33,.58),.052,.025,glass,rotation=(0,0,0),verts=16)

# Rear mounted, exposed air-cooled engine: block, finned cylinders, flywheel and twin exhausts.
box('rear engine crankcase',(0,.89,-.82),(.78,.53,.73),iron,.045)
for side in (-1,1):
    cyl('air cooled cylinder',(side*.30,1.19,-.79),.19,.42,steel,rotation=(math.pi/2,0,0),verts=20)
    for y in (1.00,1.07,1.14,1.21,1.28,1.35):
        torus('stacked air-cooling fin',(side*.30,y,-.79),.194,.018,alloy,rotation=(math.pi/2,0,0),major_segments=20,minor_segments=6)
    beam('exhaust header',(side*.30,.98,-.91),(side*.48,.86,-1.24),.042,rust)
    beam('high side exhaust',(side*.48,.86,-1.24),(side*.66,1.13,-1.62),.052,steel)
    cyl('open exhaust tip',(side*.66,1.13,-1.67),.067,.11,iron,rotation=(0,0,0),verts=16)
torus('exposed flywheel',(0,.88,-1.22),.27,.045,rust,rotation=(0,math.pi/2,0),major_segments=28,minor_segments=8)
box('dust coated rear engine skid cage',(0,.54,-1.50),(1.26,.13,.42),dust,.025)
# A clear intake and ignition detail make the air-cooled engine read behind the cage.
box('finned sump and oil pan',(0,.60,-.87),(.62,.12,.48),rust,.04)
for side in (-1,1):
    box('carburetor throat',(side*.19,1.41,-.77),(.15,.11,.15),alloy,.025)
    cyl('round air intake bell',(side*.19,1.47,-.77),.09,.055,iron,rotation=(0,0,0),verts=24)
    beam('spark plug lead',(side*.30,1.22,-.80),(side*.18,1.37,-.78),.013,flagmat,6)
box('filter housing',(0,1.39,-.76),(.40,.075,.20),iron,.04)
for z in (-.87,-.82,-.77,-.72,-.67):
    beam('air filter raised rib',(-.20,1.40,z),(.20,1.40,z),.012,alloy,6)
for side in (-1,1):
    box('bolt-on armor scab',(side*.61,.79,-.45),(.08,.30,.38),paint,.015)
    for y in (.68,.86):cyl('armor plate rivet',(side*.66,y,-.45),.035,.03,alloy,verts=8)

# Sand flag on a flexible, visibly sprung whip extending above the vehicle.
for i in range(8):
    t=i/8; beam('whip mast segment',(.50,1.36+t*1.15,-1.12-t*.17),(.50,1.36+(t+1/8)*1.15,-1.12-(t+1/8)*.17),.012,alloy,6)
flagverts=[(.49,2.22,-2.08),(.91,2.18,-2.10),(.79,2.43,-2.12),(.51,2.42,-2.10)]
mesh_obj('faded triangular sand flag',flagverts,[(0,1,2,3)],flagmat)
beam('whip foot',(.50,1.30,-1.05),(.50,1.42,-1.18),.045,rust,8)

# Hand-cut welds, mismatched bolts, scrape strips and tow eyes.
for z in (-1.32,-.65,.10,.78,1.25):
    for side in (-1,1):
        cyl('visible cage joint cap',(side*.59,1.32,z),.065,.028,alloy,verts=10)
for side in (-1,1):
    beam('front tow loop',(side*.36,.48,1.52),(side*.36,.35,1.77),.035,rust,8)
    beam('rear tow loop',(side*.34,.48,-1.50),(side*.34,.35,-1.75),.035,alloy,8)
for i in range(5):
    box('scraped enamel edge',( -.44+i*.22,.93,1.56),(.11,.012,.025),rust,.003)

# Real crew model for scale. It is review-only and never enters the car export.
before_person=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/wasteland/crew/cinder.glb'))
person_parts=[ob for ob in bpy.data.objects if ob not in before_person]
person_roots=[ob for ob in person_parts if ob.parent not in person_parts]
person_meshes=[ob for ob in person_parts if ob.type=='MESH']
crew_bounds=[ob.matrix_world @ Vector(corner) for ob in person_meshes for corner in ob.bound_box]
crew_zmin=min(p.z for p in crew_bounds); crew_height=max(p.z for p in crew_bounds)-crew_zmin
crew_scale=1.72/max(.001,crew_height)
person=bpy.data.objects.new('review-only Cinder scale model',None);scene.collection.objects.link(person)
person.rotation_euler[0]=-math.pi/2; person.scale=(crew_scale,)*3
person.location=(2.05,-crew_zmin*crew_scale,-.2)
for ob in person_roots:
    ob.parent=person
ground=bpy.data.objects.new('review ground',None);scene.collection.objects.link(ground)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.035,0),rotation=(math.pi/2,0,0));floor=bpy.context.object;floor.name='review-only ground';floor.data.materials.append(floor_mat)

def aim(obj,point,up='Y'):
    forward=(Vector(point)-obj.location).normalized()
    up_hint=Vector((0,0,1) if up=='Z' else (0,1,0))
    right=forward.cross(up_hint).normalized()
    true_up=right.cross(forward).normalized()
    basis=Matrix(((right.x,true_up.x,-forward.x),(right.y,true_up.y,-forward.y),(right.z,true_up.z,-forward.z)))
    obj.rotation_euler=basis.to_euler()
for loc,power,size in [((-4,7,5),2100,6),( (4,5,-4),1450,5),((0,9,-1),850,7)]:
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;aim(l,(0,.7,0))
scene.view_settings.view_transform='AgX'
out.parent.mkdir(parents=True,exist_ok=True);blend.parent.mkdir(parents=True,exist_ok=True);evidence.mkdir(parents=True,exist_ok=True);sheet.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

views=[
 ('front-three-quarter',(5,3.6,6),(0,.90,.12),6.3),
 ('rear-three-quarter',(-5,3.6,-6),(0,.90,-.15),6.3),
 ('side',(7,2.1,0),(0,.90,0),6.3),
 ('top',(0,8,0),(0,.2,0),7.2),
 ('beside-person',(5,3.5,7),(.45,.95,0),6.6),
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
glb_data=out.read_bytes()
json_length=int.from_bytes(glb_data[12:16],'little')
gltf=json.loads(glb_data[20:20+json_length].decode('utf-8').rstrip('\0 '))
triangles=sum(gltf['accessors'][primitive['indices']]['count']//3
              for mesh in gltf['meshes'] for primitive in mesh['primitives'] if 'indices' in primitive)
if triangles>25000:raise RuntimeError(f'Scarab GLB has {triangles} triangles; budget is 25000')
if out.stat().st_size>8*1024*1024:raise RuntimeError(f'Scarab GLB is {out.stat().st_size} bytes; budget is 8 MB')
manifest={'id':'scarab','dimensions_m':{'width':2.05,'length':3.95,'height':2.24},'wheel_radius_m':.75,
          'triangles':triangles,'bytes':out.stat().st_size,'forward':'+Z','up':'+Y','sockets':['front','rear','roof','hood','left','right','door','shield'],
          'renders':renders}
(evidence/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
