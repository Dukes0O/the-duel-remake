"""Build and review the Longhaul six-wheel desert recovery truck."""
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', default='')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/cars/longhaul.glb'
texture_dir = root / 'public/assets/models/wasteland/cars/textures'
blend = root / 'art-build/longhaul/longhaul.blend'
evidence = root / '.evidence/2026-11-06/CAR-ART-LONGHAUL/round-4'
sheet = root / 'docs/board/looks/car-art-longhaul/round-4.jpg'
reference = root / '.qa-dist/longhaul-reference.png'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(evidence)],'summary':[str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('Longhaul neutral overcast')
scene.world.color = (.30, .30, .30)
scene.view_settings.view_transform = 'AgX'

def mat(name, color, metallic=.12, rough=.82, image=None, mapping='UV', repeat=1.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    nodes=m.node_tree.nodes; links=m.node_tree.links; bs=nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Metallic'].default_value=min(.3,metallic); bs.inputs['Roughness'].default_value=rough
    if image:
        texcoord=nodes.new('ShaderNodeTexCoord'); tex=nodes.new('ShaderNodeTexImage')
        tex.image=bpy.data.images.load(str(texture_dir/image),check_existing=True); tex.image.pack(); tex.extension='REPEAT'; tex.interpolation='Linear'
        mapping_node=nodes.new('ShaderNodeMapping'); mapping_node.inputs['Scale'].default_value=(repeat,repeat,repeat)
        links.new(texcoord.outputs[mapping],mapping_node.inputs['Vector']); links.new(mapping_node.outputs['Vector'],tex.inputs['Vector'])
        color=tex.outputs['Color']
        if 'rubber' in name:
            dark=nodes.new('ShaderNodeHueSaturation'); dark.inputs['Value'].default_value=.20; links.new(color,dark.inputs['Color']); color=dark.outputs['Color']
        links.new(color,bs.inputs['Base Color'])
    return m

# The authored GLB contract is +Y up and +Z forward. The review import converts
# that to Blender's +Z-up scene, so the cameras and ground below use Z-up.
def xyz(p): return p
def dims(d): return d

paint=mat('faded ochre enamel with brown rust and dust',(.16,.12,.075),.12,.92,'longhaul-rusted-paint.jpg',repeat=.72)
rust=mat('exposed iron oxide',(.085,.035,.02),.18,.94,'longhaul-rusted-paint.jpg',repeat=.72)
steel=mat('scuffed dark steel',(.12,.105,.084),.24,.78,'longhaul-rusted-paint.jpg',repeat=.6)
frame=mat('soot-dark chassis and underbody',(.028,.027,.024),.25,.9)
rubber=mat('dusty cracked truck tyre rubber',(.035,.036,.032),.01,.97,'longhaul-dusty-rubber.jpg','UV',repeat=1.0)
glass=mat('dark dusty cab glass',(.008,.012,.014),.08,.78)
lens=mat('clouded headlamp glass',(.55,.48,.34),.04,.38)
metal=mat('rubbed bare edge steel',(.22,.20,.16),.22,.68)
dust=mat('pale ground-in dust',(.13,.12,.10),.01,.96,'longhaul-dusty-rubber.jpg',repeat=.58)

vehicle=bpy.data.objects.new('longhaul',None); scene.collection.objects.link(vehicle)
vehicle['vehicle_id']='longhaul'; vehicle['units']='metres'; vehicle['forward']='+Z'; vehicle['up']='+Y'
parts=[]
def box(name, pos, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(pos)); o=bpy.context.object; o.name=name; o.dimensions=dims(size)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material)
    if bevel >= .025:
        b=o.modifiers.new('thin dressed sheet edge','BEVEL'); b.width=bevel; b.segments=1
        o.modifiers.new('shop-weighted normals','WEIGHTED_NORMAL')
    o.parent=vehicle; parts.append(o); return o
def beam(name, a, b, radius, material, sides=12):
    a,b=Vector(xyz(a)),Vector(xyz(b)); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=d.length,location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(material); o.parent=vehicle; parts.append(o); return o
def cylinder(name, pos, radius, depth, material, axis='X', vertices=16):
    # In the authoring scene Y is up and Z is the truck's length. Blender
    # cylinders are Z-aligned, so map each requested model axis explicitly.
    rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=xyz(pos),rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); o.parent=vehicle; parts.append(o); return o
def panel(name, points, material, thickness=.035):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata([xyz(p) for p in points],[],[tuple(range(len(points)))]); mesh.materials.append(material); mesh.update()
    o=bpy.data.objects.new(name,mesh); scene.collection.objects.link(o); o.parent=vehicle; parts.append(o)
    solid=o.modifiers.new('visible folded sheet thickness','SOLIDIFY'); solid.thickness=thickness
    bevel=o.modifiers.new('creased panel edge','BEVEL'); bevel.width=.018; bevel.segments=1
    return o
def tyre(name, center, major=.52, section=.18, width=.42, segments=42, rings=14, pitch_count=24):
    """A round continuous carcass with deep block lugs shaped into its tread."""
    cx,cy,cz=center; verts=[]; faces=[]; uvs=[]
    for i in range(segments):
        theta=2*math.pi*i/segments
        for j in range(rings):
            phi=2*math.pi*j/rings
            sweep=(phi-math.pi/2)*.38
            delta=(theta-sweep+math.pi/pitch_count)%(2*math.pi/pitch_count)-math.pi/pitch_count
            across=abs((phi-math.pi/2+math.pi)%(2*math.pi)-math.pi)
            lug=0
            radius=major+section*math.sin(phi)+lug
            verts.append((cx+width*.5*math.cos(phi),cy+radius*math.sin(theta),cz+radius*math.cos(theta)))
    for i in range(segments):
        ni=(i+1)%segments
        for j in range(rings):
            nj=(j+1)%rings
            faces.append((i*rings+j,ni*rings+j,ni*rings+nj,i*rings+nj))
            uvs.append(((i/segments*4.2,j/rings*.72),((i+1)/segments*4.2,j/rings*.72),
                        ((i+1)/segments*4.2,(j+1)/rings*.72),(i/segments*4.2,(j+1)/rings*.72)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.materials.append(rubber); mesh.update()
    ob=bpy.data.objects.new(name,mesh); scene.collection.objects.link(ob); ob.parent=vehicle; parts.append(ob)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly,coords in zip(mesh.polygons,uvs):
        poly.use_smooth=True
        for loop_index,coord in zip(poly.loop_indices,coords): uv.data[loop_index].uv=coord
    # Twenty-four separate raised blocks per tyre make the working tread clear
    # in the silhouette and on the top view, while leaving the round carcass.
    for i in range(24):
        theta=2*math.pi*i/24
        radial=Vector((0,math.sin(theta),math.cos(theta)))
        tangent=Vector((0,-math.cos(theta),math.sin(theta)))
        center=Vector((cx,cy,cz))+radial*.725
        verts=[]
        for dx,dr,dt in ((-.17,-.045,-.07),(.17,-.045,-.07),(.17,.045,-.07),(-.17,.045,-.07),
                         (-.17,-.045,.07),(.17,-.045,.07),(.17,.045,.07),(-.17,.045,.07)):
            point=center+Vector((dx,0,0))+radial*dr+tangent*dt
            verts.append(tuple(point))
        faces=((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7))
        block_mesh=bpy.data.meshes.new(f'{name} tread block mesh')
        block_mesh.from_pydata(verts,[],faces); block_mesh.materials.append(rubber); block_mesh.update()
        block=bpy.data.objects.new(f'{name} raised block tread {i+1:02}',block_mesh)
        scene.collection.objects.link(block); block.parent=vehicle; parts.append(block)
    return ob

# Reference envelope: 7.2 m long, 2.8 m wide, 3.6 m high. Model coordinates
# are X across, Y up and Z forward; all load-bearing pieces meet the chassis.
wheel_y=.70
axles=(2.12,-1.20,-2.72)
for x in (-.91,.91):
    box('continuous ladder chassis rail',(x,1.05,-.18),(.20,.32,6.78),frame,.035)
for z in (-3.45,-2.55,-1.45,-.75,.45,1.45,2.72):
    box('chassis crossmember',(0,1.00,z),(2.04,.20,.18),steel,.025)
box('joined belly skid plate',(0,.78,-.15),(1.78,.10,4.55),frame,.025)
box('front chassis bumper',(0,.63,3.03),(2.30,.20,.24),steel,.03)
box('rear chassis bumper',(0,.62,-3.60),(2.26,.20,.24),steel,.03)

# Three full axles support six round 1.4 m tyres. Suspension members meet the
# rails, axles, hubs and wheels rather than hanging as isolated details.
for axle,z in enumerate(axles,1):
    for side in (-1,1):
        x=side*1.16
        tyre(f'axle {axle} round tread tyre',(x,wheel_y,z),.54,.16,.44,36,10,24)
        cylinder('pressed steel wheel rim',(side*1.36,wheel_y,z),.40,.15,frame,'X',32)
        cylinder('rusted rim dish',(side*1.45,wheel_y,z),.30,.07,rust,'X',28)
        cylinder('wheel hub',(side*1.52,wheel_y,z),.17,.10,frame,'X',24)
        for i in range(10):
            a=2*math.pi*i/10
            cylinder('wheel lug nut',(side*1.57,wheel_y+.235*math.sin(a),z+.235*math.cos(a)),.032,.045,steel,'X',10)
        beam('solid axle tube',(side*.36,.80,z),(side*1.18,.80,z),.095,frame)
        beam('leaf spring pack front',(side*.42,.67,z-.70),(side*.86,.78,z),.055,steel)
        beam('leaf spring pack rear',(side*.86,.78,z),(side*.42,.67,z+.70),.055,steel)
        beam('shock absorber',(side*.78,.76,z-.36),(side*.78,1.35,z+.30),.065,frame)
        beam('polished shock shaft',(side*.78,1.18,z+.12),(side*.78,1.48,z+.44),.028,metal,10)

# Low deck is fixed to both rails. The cab and bed sit directly on this frame.
box('flatbed deck behind cab',(0,1.30,-2.30),(2.18,.16,2.55),steel,.03)
for x in (-.97,.97):
    box('bed side wall',(x,1.53,-2.30),(.11,.30,2.50),rust,.025)
box('tailgate panel',(0,1.60,-3.58),(2.0,.53,.10),paint,.025)
for y in (1.42,1.62,1.82): beam('tailgate pressed rib',(-.90,y,-3.645),(.90,y,-3.645),.026,metal,8)

# Two horizontal fuel tanks sit between the front wheel and close rear axle pair.
# Their shortened span leaves at least 15 cm of clear space from both tyres.
for side in (-1,1):
    x=side*1.07
    cylinder('horizontal fuel tank',(x,.94,.38),.34,1.45,paint,'Z',40)
    for z in (-.30,.12,.64,1.06):
        cylinder('tank securing saddle',(x,.94,z),.355,.055,steel,'Z',32)
    cylinder('tank filler cap',(x,.94,1.15),.075,.10,rust,'Y',16)
    box('tank lower stone guard',(x,.57,.38),(.20,.10,1.38),frame,.02)

# Cab envelope 2.4 wide x 2.2 tall x 2.0 deep. A solid painted shell surrounds
# a modest dark two-pane windshield and restrained side windows.
cab_bottom,cab_top=1.34,3.54
cab_back,cab_front=.47,2.47
box('continuous cab lower shell',(0,1.78,1.48),(2.32,.96,1.88),paint,.045)
box('cab rear wall',(0,2.43,.49),(2.32,1.30,.10),rust,.025)
box('cab roof pressed edge',(0,3.50,1.44),(2.40,.12,2.02),paint,.045)
for z in (.60,1.94):
    box('cab mount crossmember fixed to rails',(0,1.28,z),(2.08,.14,.22),steel,.02)
for side in (-1,1):
    x=side*1.16
    box('full side door skin',(x,2.39,1.45),(.09,1.66,1.88),paint,.035)
    # One modest pane is inset in the solid door shell with steel around it.
    window_x=side*1.225
    panel('dark side door window glass',[(window_x,2.57,.78),(window_x,2.57,1.63),(window_x,3.27,1.63),(window_x,3.27,.78)],glass,.022)
    beam('side window front pillar',(window_x,2.54,.74),(window_x,3.30,.74),.032,paint,10)
    beam('side window rear pillar',(window_x,2.54,1.68),(window_x,3.30,1.68),.032,paint,10)
    beam('side window roof rail',(window_x,3.30,.74),(window_x,3.30,1.68),.032,paint,10)
    beam('side window lower rail',(window_x,2.54,.74),(window_x,2.54,1.68),.032,paint,10)
    beam('side window narrow divider',(window_x,2.58,1.22),(window_x,3.27,1.22),.018,steel,8)
    beam('door rear seam',(x*1.025,1.58,.70),(x*1.025,2.45,.70),.012,frame,6)
    for y in (1.77,1.98): box('door hinge',(x*1.06,y,.74),(.05,.13,.30),rust,.01)
    box('door handle',(x*1.07,2.22,1.14),(.045,.16,.06),metal,.01)
    beam('wing mirror arm',(x,2.72,1.69),(x*1.19,2.78,1.88),.035,steel,8)
    box('wing mirror housing',(x*1.19,2.91,1.90),(.10,.38,.25),frame,.035)

# Slightly sloped windshield glass is inset into the flat front face and split
# into two panes. Front lower edge reaches forward; the roof edge sits back.
panel('left front windshield pane',[(-1.03,2.53,2.48),(-.035,2.53,2.48),(-.035,3.35,2.36),(-1.03,3.35,2.36)],glass,.025)
panel('right front windshield pane',[(.035,2.53,2.48),(1.03,2.53,2.48),(1.03,3.35,2.36),(.035,3.35,2.36)],glass,.025)
for x in (-1.10,0,1.10): beam('windshield steel pillar',(x,2.48,2.51),(x,3.42,2.34),.04,paint,10)
beam('front windshield lower seal',(-1.10,2.48,2.51),(1.10,2.48,2.51),.035,rust)
beam('front windshield upper seal',(-1.10,3.42,2.34),(1.10,3.42,2.34),.035,rust)
box('front cowl and dash',(0,2.32,2.53),(2.28,.18,.25),paint,.025)
# A shadowed seat and steering wheel are the only cabin objects visible through glass.
box('dark driver seat cushion',(-.34,1.87,1.42),(.58,.18,.58),frame,.08)
box('dark driver seat back',(-.34,2.21,1.16),(.58,.70,.18),frame,.07)
beam('steering column',(-.34,2.22,1.83),(-.34,2.52,2.18),.045,steel,10)
steer=[]
for i in range(17):
    a=2*math.pi*i/16
    steer.append((-.34+.27*math.cos(a),2.48+.27*math.sin(a),2.19))
for a,b in zip(steer,steer[1:]): beam('dark steering wheel rim',a,b,.025,frame,8)

# Compact diesel nose, radiator, six grille bars and a broad bull bar.
box('forward engine cover',(0,1.47,2.63),(1.80,.62,.62),paint,.06)
box('recessed radiator mesh',(0,1.45,2.96),(1.36,.57,.10),frame,.015)
for i in range(13):
    x=-.60+i*.10
    box('radiator vertical mesh wire',(x,1.45,3.02),(.018,.48,.025),metal,.006)
for i in range(7):
    y=1.22+i*.077
    box('radiator horizontal mesh wire',(0,y,3.025),(1.20,.018,.025),steel,.006)
for side in (-1,1):
    cylinder('headlamp housing',(side*.88,1.54,2.96),.18,.11,frame,'X',24)
    cylinder('clouded lamp lens',(side*.95,1.54,2.96),.13,.03,lens,'X',24)
    box('round lamp protective hoop',(side*.96,1.54,2.96),(.035,.43,.43),steel,.18)
    beam('bull bar outer upright',(side*1.15,.48,3.06),(side*1.15,1.90,3.12),.085,steel,14)
    beam('bull bar mount',(side*.90,.54,2.45),(side*.90,.74,3.10),.075,rust)
beam('bull bar lower crossbar',(-1.15,.50,3.06),(1.15,.50,3.06),.09,rust,14)
beam('bull bar upper crossbar',(-1.15,1.90,3.12),(1.15,1.90,3.12),.075,steel,14)
for side in (-1,1):
    cx=side*.76; cy=.48; cz=3.19; r=.12
    points=[]
    for i in range(9):
        a=math.pi*i/8
        points.append((cx+r*math.cos(a),cy+r*math.sin(a),cz))
    for a,b in zip(points,points[1:]): beam('front tow shackle',a,b,.025,rust,8)

# Body-integrated pressed wheel arch crowns over all six wheels.
for side in (-1,1):
    for zc in axles:
        verts=[]; faces=[]
        for i in range(13):
            a=math.pi*i/12
            y=.70+.78*math.sin(a); z=zc+.78*math.cos(a)
            if i<12:
                b=math.pi*(i+1)/12
                y2=.70+.78*math.sin(b); z2=zc+.78*math.cos(b)
                k=len(verts); verts.extend(((side*1.40,y,z),(side*1.40,y2,z2),(side*1.56,y2,z2),(side*1.56,y,z)))
                faces.append((k,k+1,k+2,k+3))
        mesh=bpy.data.meshes.new('continuous pressed wheel arch fender'); mesh.from_pydata(verts,[],faces); mesh.materials.append(paint); mesh.update()
        arch=bpy.data.objects.new('continuous pressed wheel arch fender',mesh); scene.collection.objects.link(arch); arch.parent=vehicle; parts.append(arch)
        solid=arch.modifiers.new('folded fender sheet','SOLIDIFY'); solid.thickness=.045
        edge=arch.modifiers.new('rounded fender edge','BEVEL'); edge.width=.012; edge.segments=1
    for y in (1.46,1.70):
        beam('flatbed side rail',(side*1.20,y,-3.56),(side*1.20,y,-.45),.035,steel,8)
    for z in (-2.76,-1.68,-.56,.62,1.72):
        box('riveted repair patch',(side*1.22,1.36,z),(.06,.25,.36),rust,.012)

# Compact braced rack rises from the bed and stays inside the tail. Two upright
# spares, paired tool chests and hanging chains are secured to the deck.
for x in (-.88,.88):
    for z in (-3.00,-1.18):
        beam('rack post welded to bed',(x,1.40,z),(x,2.80,z),.05,steel)
    beam('rack top longitudinal rail',(x,2.80,-3.00),(x,2.80,-1.18),.055,rust)
    beam('rack bed weld foot',(x,1.38,-3.00),(x,1.50,-3.00),.07,metal,10)
for y in (1.52,2.05,2.78):
    beam('rack rear crossbar',(-.88,y,-3.00),(.88,y,-3.00),.04,metal)
for x in (-.88,.88): beam('rack diagonal brace',(x,1.46,-3.00),(x,2.72,-1.18),.04,steel)
for side in (-1,1):
    center=(side*.40,2.02,-2.25)
    tyre('deck mounted spare tyre',center,.50,.15,.32,32,12,20)
    cylinder('spare rim',(side*.56,2.02,-2.25),.30,.10,frame,'X',28)
    cylinder('spare hub',(side*.62,2.02,-2.25),.13,.05,metal,'X',20)
toolbox=mat('faded red toolbox enamel',(.30,.055,.032),.10,.90)
for x in (-.70,.70):
    box('latched red recovery toolbox',(x,1.64,-1.45),(.52,.48,.66),toolbox,.035)
    box('tool chest lid seam',(x,1.89,-1.45),(.53,.035,.67),metal,.012)
    for y in (1.63,1.81): box('tool chest latch',(x,y,-1.10),(.10,.06,.025),steel,.008)
for x in (-.60,-.42,.42,.60):
    for i in range(6):
        y=2.55-i*.18
        beam('hanging recovery chain link',(x,y,-2.98),(x+(.035 if i%2 else -.035),y-.09,-2.98),.018,rust,8)
beam('rear recovery winch drum',(-.42,1.48,-1.32),(.42,1.48,-1.32),.10,frame,16)
# Bed-mounted A-frame with gusseted feet, cross head and a real recovery cable.
beam('A-frame left leg',(-.76,1.45,-2.82),(-.08,3.05,-2.45),.075,steel,12)
beam('A-frame right leg',(.76,1.45,-2.82),(.08,3.05,-2.45),.075,steel,12)
beam('A-frame cross head',(-.10,3.05,-2.45),(.10,3.05,-2.45),.09,rust,14)
beam('A-frame rear brace',(-.54,1.52,-2.72),(-.08,2.82,-2.52),.05,rust,10)
beam('A-frame rear brace',(.54,1.52,-2.72),(.08,2.82,-2.52),.05,rust,10)
beam('winch cable',(-.42,1.48,-1.32),(0,2.96,-2.45),.018,metal,8)
for side in (-1,1):
    beam('rear towing bracket',(side*.64,.80,-3.06),(side*.64,.48,-3.31),.055,steel)
    for i in range(3): box('cab entry step',(side*1.17,.48+i*.20,.42),(.26,.075,.36),frame,.015)
for x in (-.82,-.28,.28,.82):
    cylinder('roof marker lamp',(x,3.61,2.05),.075,.12,lens,'Y',16)

# Review-only scale person. The game crew model is imported only after GLB export.
def aim(obj, point, world_up=(0,0,1)):
    forward=(Vector(point)-obj.location).normalized(); right=forward.cross(Vector(world_up)).normalized(); up=right.cross(forward).normalized()
    obj.rotation_euler=Matrix(((right.x,up.x,-forward.x),(right.y,up.y,-forward.y),(right.z,up.z,-forward.z))).to_euler()

out.parent.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True); evidence.mkdir(parents=True,exist_ok=True)
# glTF carries UV pictures, not Blender's procedural Object coordinates. Give
# every hard-surface mesh a metre-scaled dominant-axis projection before export.
for ob in parts:
    if ob.type!='MESH' or ob.data.uv_layers:
        continue
    uv=ob.data.uv_layers.new(name='UVMap')
    matrix=ob.matrix_world
    for poly in ob.data.polygons:
        normal=matrix.to_3x3() @ poly.normal
        axis=max(range(3),key=lambda n:abs(normal[n]))
        for loop_index in poly.loop_indices:
            point=matrix @ ob.data.vertices[ob.data.loops[loop_index].vertex_index].co
            if axis==0: pair=(point.y,point.z)
            elif axis==1: pair=(point.x,point.z)
            else: pair=(point.x,point.y)
            uv.data[loop_index].uv=(pair[0]*.72,pair[1]*.72)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT')
for o in [vehicle]+parts:o.select_set(True)
bpy.context.view_layer.objects.active=vehicle
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=False,export_apply=True)

# Render only the exported model imported into an otherwise empty Blender scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'; scene.render.engine='BLENDER_EEVEE_NEXT'
scene.view_settings.view_transform='AgX'; scene.world=bpy.data.worlds.new('empty-scene bright overcast'); scene.world.color=(.32,.32,.32); scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.32,.32,.32,1)
scene.render.resolution_percentage=100; scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.quality=88
bpy.ops.import_scene.gltf(filepath=str(out))
car=[o for o in bpy.context.scene.objects if o.type in {'MESH','CURVE'}]
crew_path=root/'public/assets/models/wasteland/crew/cinder.glb'
before=set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=str(crew_path)); human_parts=[o for o in bpy.data.objects if o not in before]
human_mesh=[o for o in human_parts if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in human_mesh for c in o.bound_box]
hmin=min(c.z for c in corners); h=max(c.z for c in corners)-hmin; scale=1.72/max(.001,h)
person=bpy.data.objects.new('review-only Cinder for scale',None); scene.collection.objects.link(person); person.scale=(scale,)*3; person.location=(-4.6,-.3,-hmin*scale)
roots=[o for o in human_parts if o.parent not in human_parts]
for o in roots:o.parent=person
floor_mat=mat('plain mid-grey review ground',(.32,.32,.32),0,.95)
floor_shader=floor_mat.node_tree.nodes.get('Principled BSDF')
floor_shader.inputs['Emission Color'].default_value=(.32,.32,.32,1)
floor_shader.inputs['Emission Strength'].default_value=1.0
bpy.ops.mesh.primitive_plane_add(size=500000,location=(0,0,-.045)); floor=bpy.context.object; floor.name='review-only ground'; floor.data.materials.append(floor_mat)
for loc,power,size in [((-6,-5,9),2100,7),((5,4,7),1450,6),((0,0,7),900,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,1.55))

def render(name, loc, target, scale, show_person=False):
    bpy.ops.object.camera_add(location=loc); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=scale
    aim(cam,target,(0,1,0) if name=='top' else (0,0,1)); scene.camera=cam
    for ob in human_parts: ob.hide_render=not show_person
    scene.render.resolution_x=1100; scene.render.resolution_y=720; scene.render.filepath=str(evidence/f'{name}.jpg')
    bpy.ops.render.render(write_still=True); bpy.data.objects.remove(cam,do_unlink=True)
views=[('front-three-quarter',(-9,-10,1.72),(0,0,1.75),7.5,False),('rear-three-quarter',(-9,9,1.72),(0,0,1.75),7.5,False),('side',(11,-.2,1.72),(0,0,1.75),7.5,False),('top',(0,0,13),(0,0,0),9.2,False),('scale-person',(-9,-10,1.72),(-.3,-.05,1.65),8.9,True)]
for row in views:render(*row)

if args.render:
    # args.render is retained for the legacy renderer's known path contract; all review views are above.
    Path(args.render).mkdir(parents=True,exist_ok=True)
triangles=sum(len(o.data.polygons) for o in car if o.type=='MESH')
print(json.dumps({'model':str(out),'triangles':triangles,'bytes':out.stat().st_size,'rendered_from':'re-imported GLB in an empty scene','views':[r[0] for r in views]}))
