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
evidence = root / '.evidence/2026-11-05/CAR-ART-LONGHAUL/round-2'
sheet = root / 'docs/board/looks/car-art-longhaul/round-2.jpg'
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
glass=mat('dark dusty cab glass',(.025,.042,.045),.08,.42)
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
    rot={'X':(0,math.pi/2,0),'Y':(0,0,0),'Z':(math.pi/2,0,0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=xyz(pos),rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); o.parent=vehicle; parts.append(o); return o
def panel(name, points, material, thickness=.035):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata([xyz(p) for p in points],[],[tuple(range(len(points)))]); mesh.materials.append(material); mesh.update()
    o=bpy.data.objects.new(name,mesh); scene.collection.objects.link(o); o.parent=vehicle; parts.append(o)
    solid=o.modifiers.new('visible folded sheet thickness','SOLIDIFY'); solid.thickness=thickness
    bevel=o.modifiers.new('creased panel edge','BEVEL'); bevel.width=.018; bevel.segments=1
    return o
def tyre(name, center, major=.49, section=.18, width=.42, segments=32, rings=10, pitch_count=12):
    """One continuous carcass with raised chevrons built into its rolling surface."""
    cx,cy,cz=center; verts=[]; faces=[]; uvs=[]
    for i in range(segments):
        theta=2*math.pi*i/segments
        for j in range(rings):
            phi=2*math.pi*j/rings
            sweep=(phi-math.pi/2)*.38
            delta=(theta-sweep+math.pi/pitch_count)%(2*math.pi/pitch_count)-math.pi/pitch_count
            across=abs((phi-math.pi/2+math.pi)%(2*math.pi)-math.pi)
            lug=.065 if abs(delta)<.105 and across<.74 else 0
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
    uv=mesh.uv_layers.new(name='one-metre dusty rubber picture')
    for poly,coords in zip(mesh.polygons,uvs):
        poly.use_smooth=True
        for loop_index,coord in zip(poly.loop_indices,coords): uv.data[loop_index].uv=coord
    return ob

# Photo measured envelope: 7.15 m long, 2.72 m wide, 3.53 m high.
# Tyres are 1.34 m across; ride height under the chassis is about .48 m.
for x in (-.92,.92):
    box('deep ladder chassis rail',(x,.99,-.15),(.18,.28,6.18),frame,.035)
for z in (-2.75,-1.55,-.35,.85,2.45): box('heavy chassis crossmember',(0,.95,z),(2.08,.18,.16),steel,.02)
for x in (-.56,.56):
    box('outer chassis web flange',(x,1.12,-.18),(.07,.12,5.95),metal,.012)
box('oil-stained belly skid',(0,.70,-.10),(1.92,.11,3.45),frame,.02)

# Cab-forward silhouette: high, flat roof; long sloped windscreen; square lower nose.
for side in (-1,1):
    x=side
    panel('cab door outer skin',[(x*1.03,1.58,.48),(x*1.03,1.62,2.17),(x*1.03,2.89,2.04),(x*1.03,3.10,.96)],paint,.045)
    panel('cab upper rear wall',[(x*.98,2.02,.42),(x*.98,3.08,.96),(x*.98,3.10,1.02),(x*.98,2.04,.50)],rust,.035)
    # Front sloped windshield and long side window are dark inset planes with thin welded frames.
    panel('side cab window glass',[(x*1.095,2.06,.70),(x*1.095,2.90,1.03),(x*1.095,2.89,1.94),(x*1.095,2.07,2.02)],glass,.018)
    for y,z0,z1 in ((2.02,.67,2.08),(2.93,1.00,1.97)):
        beam('pressed window frame',(x*1.075,y,z0),(x*1.075,y+.02,z1),.035,steel,8)
    beam('cab window division',(x*1.08,2.45,.82),(x*1.08,2.44,2.05),.024,rust,8)
    # Door gaps, hinge straps, handle, and stepped repair patches.
    beam('door front seam',(x*1.075,1.69,.58),(x*1.075,2.91,.88),.012,frame,6)
    beam('door rear seam',(x*1.075,1.68,.57),(x*1.075,1.74,2.23),.012,frame,6)
    for yy in (1.88,2.10):
        box('external door hinge',(x*1.105,yy,1.54),(.035,.12,.32),rust,.008)
        for zz in (1.44,1.65): cylinder('hinge pin',(x*1.13,yy,zz),.028,.028,metal,'X',10)
    box('door latch',(x*1.11,2.50,1.36),(.045,.14,.055),metal,.01)
    # Front and side mudguard sheet arcs above the wheels.
    for zc in (-2.42,-.22,1.98):
        for step in range(9):
            ang=math.pi*step/8
            zz=zc+.75*math.cos(ang); yy=.80+.75*math.sin(ang)
            if step<8:
                ang2=math.pi*(step+1)/8; z2=zc+.75*math.cos(ang2); y2=.80+.75*math.sin(ang2)
                panel('pressed steel wheel-arch fender',[(x*1.07,yy,zz),(x*1.07,y2,z2),(x*1.28,y2,z2),(x*1.28,yy,zz)],paint,.035)
    # Dual long cylindrical tanks with strap bands, protected below the doors.
    cylinder('long external diesel tank',(x*1.06,.95,.02),.40,2.17,paint,'Z',32)
    for zz in (-.91,-.18,.88): cylinder('tank steel saddle strap',(x*1.09,.95,zz),.415,.055,steel,'Z',24)
    cylinder('fuel cap',(x*1.06,1.34,1.13),.09,.09,rust,'X',16)
    box('low tank stone guard',(x*1.13,.55,.01),(.13,.11,2.0),frame,.018)
    # Rear rack has real vertical posts, cross rails and diagonal supports.
    for zz in (-3.10,-1.02):
        beam('rack upright welded to deck',(x*1.08,1.49,zz),(x*1.08,3.38,zz),.052,steel)
    beam('rack upper longitudinal rail',(x*1.08,3.36,-3.12),(x*1.08,3.36,-1.02),.060,rust)
    for y in (1.68,2.28,2.92): beam('rack cross bar',(-1.07,y,-3.10),(1.07,y,-3.10),.038,metal)
    beam('rack diagonal support',(x*1.08,1.58,-3.10),(x*1.08,3.29,-1.02),.042,steel)

# Curved cab roof and sloped glazing. The side silhouette is built from thin sheet, not a box.
panel('cab roof pressed crown',[(-1.02,3.25,.90),(-.78,3.39,.88),(.78,3.39,.88),(1.02,3.25,.90),(.99,3.24,2.13),(-.99,3.24,2.13)],paint,.055)
panel('sloped front windshield', [(-.91,1.83,2.84),(.91,1.83,2.84),(.78,3.17,2.16),(-.78,3.17,2.16)],glass,.025)
for x in (-.94,-.47,0,.47,.94):
    beam('windshield rubber and steel division',(x*.92,1.80,2.87),(x*.82,3.20,2.18),.025,steel,8)
panel('front cowl beneath windshield',[(-.94,1.42,2.95),(.94,1.42,2.95),(.91,1.82,2.84),(-.91,1.82,2.84)],rust,.04)
panel('lower cab nose', [(-1.05,.80,3.13),(1.05,.80,3.13),(1.02,1.52,3.10),(-1.02,1.52,3.10)],paint,.06)

# Engine reads as a working inline diesel ahead of the cab and behind the grille.
box('exposed diesel block',(0,1.12,2.29),(.96,.68,.62),frame,.04)
for i in range(6):
    x=-.42+i*.168
    box('cast cylinder head',(x,1.51,2.32),(.125,.18,.47),metal,.022)
    for n in range(5): beam('cooling fin',(x-.062,1.47+n*.048,2.20),(x+.062,1.47+n*.048,2.44),.014,steel,6)
beam('injection fuel rail',(-.47,1.73,2.40),(.47,1.73,2.40),.035,rust,8)
for i in range(6): beam('diesel injector line',(-.40+i*.16,1.73,2.40),(-.36+i*.16,1.86,2.53),.012,metal,6)
for side in (-1,1):
    beam('exhaust manifold',(side*.45,1.26,2.33),(side*.66,1.10,2.71),.065,rust)
    beam('vertical stack exhaust',(side*.66,1.10,2.71),(side*.68,3.42,2.71),.072,steel)
    cylinder('exhaust rain lip',(side*.68,3.42,2.71),.08,.12,frame,'Y',16)

# Front face: recessed radiator, individual grille bars, round lamps and a layered bull bar.
box('dark recessed radiator cavity',(0,1.10,3.19),(1.44,.70,.12),frame,.018)
for i in range(13):
    x=-.60+i*.10
    box('vertical radiator grille blade',(x,1.10,3.27),(.035,.55,.035),metal,.008)
for yy in (.84,1.35): box('horizontal grille support',(0,yy,3.28),(1.28,.034,.04),steel,.008)
for side in (-1,1):
    cylinder('round headlamp housing',(side*.82,1.22,3.20),.17,.12,frame,'X',24)
    cylinder('headlamp glass lens',(side*.895,1.22,3.20),.125,.025,lens,'X',24)
    box('lamp guard upright',(side*.82,1.20,3.28),(.025,.31,.32),rust,.008)
    beam('bullbar vertical wing',(side*1.16,.52,3.20),(side*1.14,1.73,3.36),.075,steel)
    beam('bullbar upper corner',(side*1.14,1.73,3.36),(side*.94,1.91,3.36),.075,rust)
beam('bullbar upper beam',(-.94,1.91,3.36),(.94,1.91,3.36),.075,steel)
beam('bullbar lower beam',(-1.13,.53,3.19),(1.13,.53,3.19),.08,rust)
for side in (-1,1):
    beam('tow hook shank',(side*.72,.47,3.18),(side*.72,.34,3.32),.045,metal,10)
    beam('tow hook return',(side*.72,.34,3.32),(side*.72,.43,3.41),.035,metal,10)

# Rear work deck: spare wheels, tool boxes and a readable hydraulic winch / crane rack.
box('flat rear steel service deck',(0,1.43,-2.22),(2.1,.13,1.86),steel,.025)
for side in (-1,1):
    # Two vertically strapped spare wheels across the bed, each with visible rim and six lugs.
    center=(side*.46,2.02,-2.72)
    tyre('full-size strapped spare tyre with raised chevrons',center,.50,.18,.38,24,8,10)
    cylinder('spare wheel dish',(side*.66,2.02,-2.72),.34,.13,frame,'X',28)
    cylinder('spare hub',(side*.74,2.02,-2.72),.17,.06,metal,'X',20)
    for i in range(8):
        a=2*math.pi*i/8; cylinder('spare rim bolt',(side*.78,2.02+.25*math.sin(a),-2.72+.25*math.cos(a)),.026,.03,rust,'X',8)
for x in (-.60,.60):
    box('latched rear tool chest',(x,1.72,-1.60),(.72,.50,.68),rust,.025)
    for yy in (1.51,1.95): box('locker hinge',(x,yy,-1.22),(.16,.045,.03),metal,.006)
box('service rack floor panel',(0,1.56,-2.80),(1.88,.07,.45),frame,.015)
beam('hand winch steel drum',(-.42,1.91,-1.20),(.42,1.91,-1.20),.11,rust,16)
for x in (-.34,-.20,-.06,.08,.22,.36): cylinder('winch drum rib',(x,1.91,-1.20),.12,.025,metal,'X',12)
beam('rear recovery boom foot',(0,1.52,-1.08),(0,2.82,-1.12),.070,steel)
beam('rear crane arm',(0,2.82,-1.12),(0,3.24,-2.22),.075,rust)
beam('crane cable',(.02,3.23,-2.20),(.02,2.05,-2.20),.018,frame,8)
beam('crane hook',(-.02,2.05,-2.20),(.02,1.98,-2.20),.025,metal,8)

# Three axles with real leaf spring packs, hydraulic dampers, hubs and silhouette lugs.
wheel_radius=.67; wheel_y=.71
for axle,z in enumerate((2.35,.05,-2.25),1):
    for side in (-1,1):
        x=side*1.16
        tyre(f'axle {axle} integrated chevron tyre',(x,wheel_y,z),.49,.18,.42,44,12,12)
        cylinder('dish wheel rim',(side*1.34,wheel_y,z),.43,.14,frame,'X',24)
        cylinder('rusted rim plate',(side*1.43,wheel_y,z),.32,.07,rust,'X',20)
        cylinder('axle hub',(side*1.49,wheel_y,z),.18,.08,metal,'X',20)
        cylinder('grease cap',(side*1.54,wheel_y,z),.105,.06,frame,'X',16)
        for i in range(8):
            a=2*math.pi*i/8
            cylinder('wheel rim bolt',(side*1.55,wheel_y+.255*math.sin(a),z+.255*math.cos(a)),.027,.03,metal,'X',8)
        beam('solid axle tube',(side*.38,.82,z),(side*1.18,.82,z),.085,frame)
        # Three connected leaves are curved slightly by segment joints and visibly clamp together.
        for leaf in range(4):
            yy=.64+leaf*.045
            beam('leaf spring forward half',(side*.42,yy,z-.67),(side*.84,yy+.035,z),.035,steel,8)
            beam('leaf spring rear half',(side*.84,yy+.035,z),(side*.42,yy,z+.67),.035,steel,8)
        for end in (-1,1):
            beam('spring shackle',(side*.43,.68,z+end*.64),(side*.55,.81,z+end*.64),.032,rust,8)
        beam('damper cylinder',(side*.77,.84,z-.41),(side*.79,1.54,z+.38),.060,frame)
        beam('damper polished shaft',(side*.79,1.22,z+.03),(side*.79,1.64,z+.48),.026,metal,10)
        # Visible helical spring wrapping its shock.
        pts=[]
        for j in range(33):
            t=j/32; angle=t*math.pi*10
            pts.append(xyz((side*.77+.094*math.cos(angle),.90+.61*t,z-.41+.79*t+.094*math.sin(angle))))
        curve=bpy.data.curves.new('five-turn leaf suspension helper coil','CURVE'); curve.dimensions='3D'; curve.bevel_depth=.018; curve.bevel_resolution=0
        spl=curve.splines.new('POLY'); spl.points.add(len(pts)-1)
        for point,co in zip(spl.points,pts): point.co=(*co,1)
        coil=bpy.data.objects.new('heavy helper coil spring',curve); scene.collection.objects.link(coil); coil.data.materials.append(rust); coil.parent=vehicle; parts.append(coil)

# Dust gathers under the chassis and wheel arches; seams and clipped plates break up broad paint.
for side in (-1,1):
    for z in (-2.75,-1.75,-.62,.52,1.54):
        box('overlapping irregular repair plate',(side*1.055,1.46,z),(.055,.30,.50),paint if z%2 else rust,.012)
        for yy in (1.34,1.57):
            cylinder('repair plate rivet',(side*1.092,yy,z),.025,.03,metal,'X',10)
    for z in (-2.64,-2.39,-2.14,-1.89):
        beam('raised longitudinal weld bead',(side*1.08,1.72,z),(side*1.08,1.72,z+.11),.014,metal,6)
    # Dust skirts only span gaps, leaving the wheel and axle structure visible.
    for z0,z1 in ((-3.22,-2.95),(-1.57,-.85),(.72,1.15)):
        panel('dust-caked hanging fender sheet',[(side*1.24,.82,z0),(side*1.24,1.08,z0),(side*1.24,1.08,z1),(side*1.24,.82,z1)],dust,.025)

# Rear-facing panel ribs, tail lamps, towing hardware and ladder steps.
panel('rear cargo gate',[(-1.0,.92,-3.34),(1.0,.92,-3.34),(1.0,1.86,-3.34),(-1.0,1.86,-3.34)],rust,.045)
for y in (1.08,1.34,1.60): beam('tailgate pressed rib',(-.91,y,-3.39),(.91,y,-3.39),.026,metal,8)
for side in (-1,1):
    for y in (1.08,1.51): cylinder('rear lamp',(side*.87,y,-3.40),.09,.06,lens,'Z',16)
    beam('rear tow bracket',(side*.63,.53,-3.13),(side*.63,.38,-3.46),.060,steel)
for i in range(3): box('cab entry ladder step',(1.08,.47+i*.22,.64),(.36,.08,.31),frame,.015)

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
    uv=ob.data.uv_layers.new(name='metre-scaled surface picture')
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
scene.view_settings.view_transform='AgX'; scene.world=bpy.data.worlds.new('empty-scene neutral light'); scene.world.color=(.31,.31,.31)
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
floor_mat=mat('plain mid-grey review ground',(.34,.34,.34),0,.95)
bpy.ops.mesh.primitive_plane_add(size=5000,location=(0,0,-.045)); floor=bpy.context.object; floor.name='review-only ground'; floor.data.materials.append(floor_mat)
for loc,power,size in [((-6,-5,9),2100,7),((5,4,7),1450,6),((0,0,7),900,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,1.55))

def render(name, loc, target, scale, show_person=False):
    bpy.ops.object.camera_add(location=loc); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=scale
    aim(cam,target,(0,1,0) if name=='top' else (0,0,1)); scene.camera=cam
    for ob in human_parts: ob.hide_render=not show_person
    scene.render.resolution_x=1100; scene.render.resolution_y=720; scene.render.filepath=str(evidence/f'{name}.jpg')
    bpy.ops.render.render(write_still=True); bpy.data.objects.remove(cam,do_unlink=True)
views=[('front-three-quarter',(-9,-10,1.72),(0,0,1.75),9.8,False),('rear-three-quarter',(-9,9,1.72),(0,0,1.75),9.8,False),('side',(11,-.2,1.72),(0,0,1.75),9.6,False),('top',(0,0,13),(0,0,0),13.0,False),('scale-person',(-9,-10,1.72),(-.3,-.05,1.65),10.8,True)]
for row in views:render(*row)

if args.render:
    # args.render is retained for the legacy renderer's known path contract; all review views are above.
    Path(args.render).mkdir(parents=True,exist_ok=True)
triangles=sum(len(o.data.polygons) for o in car if o.type=='MESH')
print(json.dumps({'model':str(out),'triangles':triangles,'bytes':out.stat().st_size,'rendered_from':'re-imported GLB in an empty scene','views':[r[0] for r in views]}))
