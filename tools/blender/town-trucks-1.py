"""Build four original Scablands work trucks and render from their GLB.

Coordinates are metres, +Y up, front -Z. The candidate is always exported
before a fresh empty Blender scene imports it for review renders.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--export-only', action='store_true')
parser.add_argument('--candidate-suffix', default='')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
if args.candidate_suffix and (not args.candidate_suffix.startswith('-') or
        any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            for c in args.candidate_suffix)):
    parser.error('--candidate-suffix must start with a hyphen and contain only letters, digits and hyphens')
output = (root / '.qa-dist/art-candidates' / f'town-trucks-1{args.candidate_suffix}.glb'
          if args.export_only else root / 'public/assets/models/wasteland/town/trucks-1.glb')
blend = root / 'art-build/town-trucks-1.blend'
evidence = root / '.evidence/2026-11-05/TOWN-ART-TRUCKS-1'
textures = root / 'public/assets/models/wasteland/town/textures'
if args.paths_only:
    candidate = root / '.qa-dist/art-candidates/town-trucks-1.glb'
    print(json.dumps({'blend': [str(blend)], 'glb': [str(candidate)], 'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('bright overcast truck reference')
scene.world.color = (.48, .49, .50)

# Use the shared material factory for its palette, then use standalone image
# nodes. Blender node maths cannot repeat one cell of an atlas in exported glTF.
shared = town.make_materials()
base_colors={
    'rusted-steel':(.12,.045,.024,1), 'galvanised-tin':(.24,.27,.25,1),
    'weathered-plank':(.15,.10,.055,1), 'patched-canvas':(.30,.23,.15,1),
    'dirty-glass':(.045,.065,.065,1), 'iron-dark':(.045,.048,.045,1),
}
for material in shared.values():
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = min(.3, bsdf.inputs['Metallic'].default_value)
    color=base_colors.get(material.name.removeprefix('Town / '),material.diffuse_color)
    material.diffuse_color=color
    bsdf.inputs['Base Color'].default_value = color
    for node in list(material.node_tree.nodes):
        if node.type == 'TEX_IMAGE':
            material.node_tree.nodes.remove(node)
for image in list(bpy.data.images):
    if image.users == 0:
        bpy.data.images.remove(image)
materials = dict(shared)

PAINT_FILES = {
    'fire-truck': ('fire-engine-paint.jpg', (.30, .055, .032, 1)),
    'water-tanker': ('water-tanker-paint.jpg', (.25, .28, .23, 1)),
    'supply-truck': ('supply-truck-paint.jpg', (.18, .19, .10, 1)),
    'tow-rig': ('tow-rig-paint.jpg', (.38, .25, .09, 1)),
}
for identifier, (filename, color) in PAINT_FILES.items():
    material = shared['faded-hand-paint'].copy()
    material.name = identifier + ' / photo paint'
    material.diffuse_color = color
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = .12
    bsdf.inputs['Roughness'].default_value = .88
    image = bpy.data.images.load(str(textures / filename), check_existing=False)
    image.name = identifier + ' own repeating paint photograph'
    image.file_format = 'JPEG'
    image.pack()
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.interpolation = 'Linear'
    texture.extension = 'REPEAT'
    material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    materials[identifier + '-paint'] = material

paint_rust = materials['rusted-steel']
tin = materials['galvanised-tin']
dark_metal = materials['iron-dark']
glass = materials['dirty-glass']
wood = materials['weathered-plank']
canvas = materials['patched-canvas']
lamp = bpy.data.materials.new('Aged amber lamp lens')
lamp.use_nodes=True
lamp.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.42,.22,.075,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=0
lamp.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.45,.19,.035,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.8
for name, mat in materials.items():
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Metallic'].default_value = min(.3, bsdf.inputs['Metallic'].default_value)

def game_vector(p):
    return Vector((p[0], -p[2], p[1]))

def box(name, center, size, material, bevel=.025):
    return town.cube(name, center, size, material, bevel)

def bar(name, a, b, width, material):
    va, vb = game_vector(a), game_vector(b)
    d = vb - va
    obj = box(name, ((a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2),
              (width, d.length, width), material, .012)
    obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return obj

def cylinder(name, center, radius, depth, material, axis='Y', vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                         location=game_vector(center))
    obj = bpy.context.object
    obj.name = name
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('rolled metal edge', 'BEVEL')
    bevel.width = .018
    bevel.segments = 1
    obj.modifiers.new('weighted panel normals', 'WEIGHTED_NORMAL')
    return obj

def pipe(name, points, radius, material):
    before = set(bpy.context.scene.objects)
    town.pipe_run(name, points, radius, material)
    created = list(set(bpy.context.scene.objects) - before)
    if not created:
        raise RuntimeError(f'{name}: expected pipe geometry')
    return created[0] if len(created)==1 else created

def rounded_body(name, stations, material):
    """Loft chamfered body sections so the panels have shoulders, not box corners."""
    ring = ((-.37,-.50),(.37,-.50),(.50,-.37),(.50,.37),
            (.37,.50),(-.37,.50),(-.50,.37),(-.50,-.37))
    verts, faces = [], []
    for z, width, height, cy in stations:
        for x, y in ring:
            verts.append((x * width, -z, cy + y * height))
    for station in range(len(stations)-1):
        for i in range(8):
            a=station*8+i; b=station*8+(i+1)%8
            faces.append((a,b,b+8,a+8))
    faces.append(tuple(range(7,-1,-1)))
    end=(len(stations)-1)*8
    faces.append(tuple(end+i for i in range(8)))
    mesh=bpy.data.meshes.new(name+' curved stamped panels')
    mesh.from_pydata(verts,[],faces); mesh.update()
    uv=mesh.uv_layers.new(name='two metre paint repeat')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=verts[mesh.loops[li].vertex_index]
            n=poly.normal
            if abs(n.x)>=abs(n.y) and abs(n.x)>=abs(n.z): u,w=v[1],v[2]
            elif abs(n.y)>=abs(n.z): u,w=v[0],v[2]
            else: u,w=v[0],v[1]
            uv.data[li].uv=(u/2,w/2)
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bevel=obj.modifiers.new('soft rolled panel corners','BEVEL'); bevel.width=.035; bevel.segments=2
    obj.modifiers.new('weighted panel normals','WEIGHTED_NORMAL')
    return obj

def curved_glass(name, corners, material):
    verts=[game_vector(p) for p in corners]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],[(0,1,2,3)]); mesh.update()
    uv=mesh.uv_layers.new(name='window')
    for li, coords in zip(mesh.polygons[0].loop_indices,((0,0),(1,0),(1,1),(0,1))):
        uv.data[li].uv=coords
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def pivot(name, center):
    obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj)
    obj.location=game_vector(center)
    return obj

def parent_keep_world(obj, parent):
    obj.location -= parent.location
    obj.parent=parent
    obj.matrix_parent_inverse.identity()

def export_glb(path):
    """Keep the integration town_base export contract, including embedded JPEGs."""
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
        export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=80)

# Use the shared entry point. This adapter supplies the current integration
# branch's JPEG settings while this lane's older town_base still writes PNG.
town.export_glb=export_glb

def make_wheel(identifier, x, z, rear=False):
    center=(x,.56,z); r=.55
    root_obj=pivot(f'{identifier}:spin-{"rear" if rear else "front"}-{"left" if x>0 else "right"}',center)
    # Deep continuous carcass and steel rim.
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,
        major_radius=r*.70,minor_radius=r*.30,location=game_vector(center),rotation=(0,math.pi/2,0))
    tire=bpy.context.object;tire.name=identifier+':deep lug tyre';tire.data.materials.append(dark_metal)
    parent_keep_world(tire,root_obj)
    rim=cylinder(identifier+':pressed wheel rim',(x+(.28 if x>0 else -.28),.56,z),r*.47,.12,tin,'X',20)
    parent_keep_world(rim,root_obj)
    lugs=[]
    for i in range(14):
        a=math.tau*i/14
        loc=(x,.56+math.sin(a)*r*.95,z+math.cos(a)*r*.95)
        bpy.ops.mesh.primitive_cube_add(size=1,location=game_vector(loc),rotation=(a,0,0))
        lug=bpy.context.object;lug.name=identifier+':integrated tread lug'
        lug.dimensions=(.24,.13,.085)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        lug.data.materials.append(dark_metal);parent_keep_world(lug,root_obj);lugs.append(lug)
    bpy.ops.object.select_all(action='DESELECT')
    for lug in lugs: lug.select_set(True)
    bpy.context.view_layer.objects.active=lugs[0]
    bpy.ops.object.join()
    bpy.context.object.name=identifier+':joined deep tread lugs'
    for i in range(6):
        a=math.tau*i/6
        bolt=cylinder(identifier+':rim bolt',(x+(.35 if x>0 else -.35),.56+math.sin(a)*r*.25,z+math.cos(a)*r*.25),.025,.035,dark_metal,'X',8)
        parent_keep_world(bolt,root_obj)
    return root_obj

TRUCKS={}
def build_truck(identifier, length, axle_z, paint, kind):
    before=set(bpy.context.scene.objects)
    root_obj=pivot(identifier,(0,0,0)); TRUCKS[identifier]=root_obj
    # Ladder chassis, cross-members and exposed leaf springs.
    for side in (-1,1):
        box(identifier+':ladder frame rail',(side*.67,.80,0),(.16,.20,length-.5),dark_metal,.035)
        for z in axle_z:
            for leaf in range(3):
                bar(identifier+':laminated leaf spring',(side*.82,.36+leaf*.045,z-.43),
                    (side*.82,.36+leaf*.045,z+.43),.035,tin)
    for z in axle_z:
        cylinder(identifier+':solid cross axle',(0,.58,z),.09,1.92,dark_metal,'X',16)
    for z in (-length*.32,0,length*.32):
        box(identifier+':chassis cross member',(0,.73,z),(1.62,.14,.13),paint_rust,.018)
    # Wheels at exactly 1.10 m diameter; axles are measured along the truck.
    for z in axle_z:
        for side in (-1,1):
            wheel_root=make_wheel(identifier,side*1.02,z,rear=z>0)
            if z<0:
                steer=pivot(identifier+':steer-front-'+('left' if side>0 else 'right'),(side*1.02,.56,z))
                parent_keep_world(wheel_root,steer)

    # Nose, long bonnet, front fenders, and separate dark bumper.
    rounded_body(identifier+':long curved bonnet',[(-3.68,1.78,.34,1.13),(-3.52,2.0,.56,1.22),
        (-2.50,2.05,.61,1.22),(-1.68,1.88,.58,1.20)],paint)
    rounded_body(identifier+':cab lower body',[(-1.95,2.14,.86,1.27),(-1.50,2.20,1.26,1.60),
        (.05,2.20,1.30,1.60),(.12,2.12,.95,1.26)],paint)
    rounded_body(identifier+':cab roof',[(-1.47,2.16,.13,2.62),(-.10,2.16,.13,2.62)],paint)
    # Slanted two-pane windscreen and thin frames.
    lamp_group=pivot(identifier+':lamp',(0,0,0))
    for side in (-1,1):
        x=side*.025
        curved_glass(identifier+':split dark windscreen pane',[(x,1.98,-1.68),(x+side*.99,1.98,-1.68),
            (x+side*.99,2.53,-1.29),(x,2.53,-1.29)],glass)
        bar(identifier+':windscreen outer post',(side*1.04,1.94,-1.72),(side*1.04,2.68,-1.18),.065,tin)
        bar(identifier+':split windscreen post',(x,1.98,-1.70),(x,2.55,-1.30),.04,dark_metal)
        # Door window and fine window surround.
        curved_glass(identifier+':side door glass',[(side*1.08,1.92,-1.13),(side*1.08,1.92,-.05),
            (side*1.08,2.48,-.05),(side*1.08,2.48,-1.13)],glass)
        for z in (-1.16,-.02):
            bar(identifier+':window frame',(side*1.10,1.88,z),(side*1.10,2.54,z),.045,tin)
        bar(identifier+':side window lower rail',(side*1.10,1.91,-1.14),(side*1.10,1.91,-.02),.045,tin)
        bar(identifier+':door seam',(side*1.105,.96,-1.00),(side*1.105,1.83,-1.00),.018,dark_metal)
        box(identifier+':door handle',(side*1.13,1.36,-.52),(.04,.035,.18),tin,.014)
        # Thin arched swept mudguard with a folded outer lip.
        for z in axle_z[:1]:
            curve=bpy.data.curves.new(identifier+' swept mudguard','CURVE');curve.dimensions='3D';curve.resolution_u=1
            curve.bevel_depth=.035;curve.bevel_resolution=2
            spline=curve.splines.new('POLY');spline.points.add(16)
            for i,p in enumerate(spline.points):
                a=math.pi*i/16
                p.co=(side*1.13,-z+math.cos(a)*.72,.60+math.sin(a)*.72,1)
            f=bpy.data.objects.new(identifier+':separate sheet fender',curve);bpy.context.collection.objects.link(f)
            f.data.materials.append(paint)
        # Lamps on stalks, with round lenses kept under the named light group.
        z=-3.25
        bar(identifier+':headlamp stalk',(side*.78,.92,z-.06),(side*.88,1.23,z-.06),.055,tin)
        cylinder(identifier+':round headlamp rim',(side*.88,1.23,z-.08),.19,.10,tin,'Z',24)
        lens=cylinder(identifier+':headlamp-'+('left' if side>0 else 'right'),
                      (side*.88,1.23,z-.145),.145,.035,lamp,'Z',24)
        parent_keep_world(lens,lamp_group)
    # Vertical grille bars in a recessed surround.
    box(identifier+':grille surround',(0,1.18,-3.68),(.91,.83,.10),dark_metal,.06)
    for i in range(11):
        x=-.37+i*.074
        bar(identifier+':individual grille bar',(x,.84,-3.755),(x,1.52,-3.755),.032,tin)
    for x in (-.60,.60):
        box(identifier+':split bumper horn',(x,.76,-3.82),(.42,.22,.20),dark_metal,.035)
    # Utility rails, fuel tank, exhaust, and body hardware.
    for side in (-1,1):
        pipe(identifier+':steel side step',[(side*1.13,.71,-1.28),(side*1.13,.71,.20)],.032,tin)
        cylinder(identifier+':fuel tank',(side*.75,.74,.58),.18,.72,dark_metal,'Z',20)
        pipe(identifier+':exhaust stack',[(side*.72,1.42,-.25),(side*.72,2.30,-.25)],.055,paint_rust)
        box(identifier+':mirror arm',(side*1.10,1.93,-1.57),(.45,.045,.045),dark_metal,.012)
        box(identifier+':mirror head',(side*1.30,2.02,-1.58),(.11,.26,.20),tin,.025)
    if kind=='fire':
        box(identifier+':equipment locker',(0,1.58,.91),(2.02,1.22,2.65),paint,.12)
        for side in (-1,1):
            for i in range(3):
                box(identifier+':red locker door',(side*1.02,1.52,.08+i*.76),(.045,.62,.69),paint,.035)
                for y in (1.29,1.75):
                    cylinder(identifier+':locker latch',(side*1.06,y,.08+i*.76),.025,.025,tin,'X',8)
            # Hose reel core, curled hose, and metal cheek plates.
            cylinder(identifier+':hose reel core',(side*1.18,1.88,.92),.42,.24,tin,'X',28)
            for depth in (-.16,.16):
                cylinder(identifier+':hose reel rim',(side*1.31,1.88,.92),.48,.045,paint_rust,'X',28)
            cylinder(identifier+':coiled dark hose',(side*1.34,1.88,.92),.35,.07,dark_metal,'X',28)
            pipe(identifier+':exposed pump pipe',[(side*1.14,1.28,1.02),(side*1.20,2.08,1.02),(side*.98,2.08,.23)],.055,tin)
        # Longitudinal tank with rolled rings and a roof ladder.
        cylinder(identifier+':fire water tank',(0,2.47,.83),.55,2.75,paint,'Z',40)
        for z in (-.48,.10,.68,1.26,1.91):
            bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,
                major_radius=.55,minor_radius=.035,location=game_vector((0,2.47,z)),rotation=(math.pi/2,0,0))
            bpy.context.object.name=identifier+':tank rolled band';bpy.context.object.data.materials.append(tin)
        for x in (-.36,.36):
            bar(identifier+':ladder rail',(x,2.94,-.47),(x,2.94,2.05),.065,tin)
        for i in range(14):
            z=-.44+i*.185
            bar(identifier+':ladder rung',(-.36,2.94,z),(.36,2.94,z),.038,dark_metal)
        cannon=pivot(identifier+':cannon',(0,2.88,-.48))
        turntable=cylinder(identifier+':cannon turntable',(0,2.91,-.48),.22,.16,tin,'Y',20)
        barrel=pipe(identifier+':water cannon barrel',[(0,3.00,-.48),(0,3.20,-1.15),(0,3.20,-1.72)],.115,dark_metal)
        parent_keep_world(turntable,cannon)
        for piece in barrel if isinstance(barrel,list) else [barrel]: parent_keep_world(piece,cannon)
        parent_keep_world(cannon,root_obj)
    elif kind=='tanker':
        # Six-wheel, nine metre tanker with elliptical steel vessel and walkway.
        cylinder(identifier+':riveted steel tanker',(0,1.96,2.15),.91,4.62,paint,'Z',48)
        for z in (-.04,.64,1.32,2.00,2.68,3.36,4.04):
            bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,
                major_radius=.91,minor_radius=.035,location=game_vector((0,1.96,z)),rotation=(math.pi/2,0,0))
            bpy.context.object.name=identifier+':tank band';bpy.context.object.data.materials.append(tin)
        for side in (-1,1):
            box(identifier+':narrow top walkway',(side*.52,2.94,2.15),(.22,.07,4.25),tin,.025)
            for z in (.30,.80,1.30,1.80,2.30,2.80,3.30,3.80):
                cylinder(identifier+':tank visible rivet',(side*.84,1.99,z),.035,.035,tin,'X',10)
            pipe(identifier+':drain and valve pipe',[(side*.78,1.17,.10),(side*.95,.67,.10),(side*.78,.67,1.42)],.045,dark_metal)
            cylinder(identifier+':large valve wheel',(side*.99,.68,1.42),.20,.06,paint_rust,'X',20)
        for z in (-.16,4.46):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,
                location=game_vector((0,1.96,z)),rotation=(math.pi/2,0,0))
            head=bpy.context.object;head.name=identifier+':domed tank head'
            head.scale=(.91,.91,.20);head.data.materials.append(paint)
        cylinder(identifier+':top fill neck',(0,2.98,2.12),.15,.42,paint_rust,'Y',20)
        box(identifier+':rear bumper',(0,.76,4.48),(2.25,.22,.16),dark_metal,.035)
    elif kind=='supply':
        # Slatted open bed, timber headboard, mixed crates and lashed sacks.
        load_group=pivot(identifier+':load',(0,0,0))
        load_start=set(bpy.context.scene.objects)
        for side in (-1,1):
            for z in (-.05,.25,.55,.85,1.15,1.45,1.75,2.05,2.35,2.65,2.95):
                box(identifier+':individual timber deck slat',(side*.48,1.04,z),(.86,.12,.18),wood,.025)
            for y in (1.24,1.51,1.78):
                bar(identifier+':wooden side stake',(side*.98,1.10,-.08),(side*.98,y,2.98),.065,wood)
                bar(identifier+':iron bed rail',(side*.99,y,0),(side*.99,y,2.94),.06,tin)
        for z in (.08,2.92):
            box(identifier+':bed end board',(0,1.40,z),(1.88,.68,.10),wood,.03)
        # Individually shaped slatted crates with bevelled edges.
        for x,z,w,d,h in [(-.42,.34,.70,.64,.56),(.38,.50,.68,.70,.78),(-.33,1.48,.78,.74,.63),(.38,2.25,.68,.60,.55)]:
            box(identifier+':loaded wooden crate',(x,1.28+h/2,z),(w,h,d),wood,.055)
            for yy in (1.28+h*.28,1.28+h*.68):
                box(identifier+':crate timber slat',(x,yy,z+d*.505),(w*.88,.075,.035),tin,.012)
        for i,(x,z) in enumerate([(-.72,.76),(.72,1.02),(-.62,2.15),(.68,2.55)]):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=game_vector((x,1.70,z)))
            sack=bpy.context.object;sack.name=identifier+':stitched canvas sack'
            sack.scale=(.28,.34,.38);sack.data.materials.append(canvas)
            for side in (-1,1):
                pipe(identifier+':cargo tie rope',[(side*.95,2.14,.20),(side*-.90,2.14,2.76)],.022,dark_metal)
        for obj in set(bpy.context.scene.objects)-load_start:
            if obj.parent is None: parent_keep_world(obj,load_group)
    elif kind=='tow':
        # Exposed rear chassis and a true braced lattice recovery boom.
        for side in (-1,1):
            bar(identifier+':crane upright',(side*.62,1.28,.45),(side*.62,3.48,1.06),.11,paint_rust)
            bar(identifier+':boom lower chord',(side*.62,3.35,.97),(side*.62,3.84,3.36),.095,tin)
            bar(identifier+':boom upper chord',(side*.62,3.62,1.00),(side*.62,4.11,3.39),.095,paint)
            for t in (.20,.42,.64,.84):
                z=.97+t*2.39;y=3.35+t*.49
                bar(identifier+':lattice vertical',(side*.62,y,z),(side*.62,y+.26,z+.05),.055,paint_rust)
            for t in (.20,.42,.64,.84):
                z=.97+t*2.39;y=3.35+t*.49
                bar(identifier+':lattice diagonal',(side*.62,y,z),(side*.62,y+.26,z+.30),.05,tin)
        bar(identifier+':boom cross beam',(-.62,3.86,3.36),(.62,3.86,3.36),.11,dark_metal)
        # Real grooved winch drum and hand-cranked gearbox.
        cylinder(identifier+':winch drum',(0,1.76,1.08),.30,.86,dark_metal,'X',32)
        for x in (-.39,.39):
            cylinder(identifier+':winch cheek',(x,1.76,1.08),.38,.07,tin,'X',32)
        for i in range(7):
            bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=5,major_radius=.30,
                minor_radius=.018,location=game_vector((-.30+i*.10,1.76,1.08)),rotation=(0,math.pi/2,0))
            bpy.context.object.name=identifier+':winch drum groove';bpy.context.object.data.materials.append(paint_rust)
        hook=pivot(identifier+':hook',(0,1.32,3.28))
        cable=pipe(identifier+':crane cable',[(0,3.82,3.28),(0,1.68,3.28)],.028,dark_metal)
        swivel=cylinder(identifier+':hook swivel',(0,1.58,3.28),.10,.18,tin,'X',16)
        parent_keep_world(cable,hook);parent_keep_world(swivel,hook)
        # Forged hook has a thick open throat, made from a smooth curve.
        curve=bpy.data.curves.new(identifier+' forged hook','CURVE');curve.dimensions='3D';curve.bevel_depth=.075;curve.bevel_resolution=3
        spline=curve.splines.new('POLY');spline.points.add(18)
        for i,p in enumerate(spline.points):
            a=math.radians(-68+i*18);p.co=(math.cos(a)*.28,0,math.sin(a)*.28,1)
        obj=bpy.data.objects.new(identifier+':forged hook',curve);bpy.context.collection.objects.link(obj)
        obj.location=game_vector((0,1.32,3.28));obj.data.materials.append(tin);parent_keep_world(obj,hook)
        parent_keep_world(hook,root_obj)
    # Axle sockets remain named and the body is one drivable child under each root.
    for obj in list(set(bpy.context.scene.objects)-before):
        if obj != root_obj and obj.parent is None:
            parent_keep_world(obj,root_obj)
    return root_obj

def merge_static_meshes(root_obj):
    """Keep named pivots while batching repeated panels and hardware by material."""
    parents=[root_obj]+[obj for obj in root_obj.children_recursive if obj.type=='EMPTY']
    for parent in parents:
        if parent.name.endswith(':lamp'):
            continue
        groups={}
        for child in list(parent.children):
            if child.type=='MESH' and len(child.data.materials)==1:
                groups.setdefault(child.data.materials[0].name,[]).append(child)
        for material_name,objects in groups.items():
            if len(objects)<2:
                continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects: obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.convert(target='MESH')
            bpy.ops.object.join()
            bpy.context.object.name=parent.name+':batched-'+material_name.replace(' ','-')
            if ':spin-' not in parent.name:
                decimate=bpy.context.object.modifiers.new('truck detail budget reduction','DECIMATE')
                decimate.ratio=.30

specs=(('fire-truck',7.5,(-2.45,1.18,2.23),'fire'),
       ('water-tanker',9.0,(-3.00,1.15,2.55),'tanker'),
       ('supply-truck',7.5,(-2.35,2.22),'supply'),
       ('tow-rig',7.0,(-2.15,1.95),'tow'))
for identifier,length,axles,kind in specs:
    build_truck(identifier,length,axles,materials[identifier+'-paint'],kind)
for truck in TRUCKS.values(): merge_static_meshes(truck)

family=pivot('town-trucks-1',(0,0,0))
for truck in TRUCKS.values(): parent_keep_world(truck,family)

output.parent.mkdir(parents=True,exist_ok=True)
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(output)
def mesh_triangles(obj, depsgraph):
    evaluated=obj.evaluated_get(depsgraph)
    mesh=evaluated.to_mesh()
    count=sum(max(0, len(poly.vertices)-2) for poly in mesh.polygons)
    evaluated.to_mesh_clear()
    return count

truck_metrics={}
depsgraph=bpy.context.evaluated_depsgraph_get()
for identifier,_,_,_ in specs:
    truck_meshes=[obj for obj in bpy.context.scene.objects
                  if obj.type=='MESH' and obj.name.startswith(identifier)]
    truck_metrics[identifier]={
        'triangles':sum(mesh_triangles(obj,depsgraph) for obj in truck_meshes),
        'paintImage':PAINT_FILES[identifier][0],
        'paintImageBytes':(textures/PAINT_FILES[identifier][0]).stat().st_size,
        'paintImageDimensions':list(bpy.data.images[identifier+' own repeating paint photograph'].size),
    }
triangles=sum(item['triangles'] for item in truck_metrics.values())
if any(item['triangles']>15000 for item in truck_metrics.values()):
    raise RuntimeError('A truck exceeds the 15,000 triangle round 4 budget: '+json.dumps(truck_metrics))
if args.export_only:
    print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                      'trucks':truck_metrics}))
    raise SystemExit(0)

# Read the delivered file into a genuinely empty scene before making any view.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU'
scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('mid grey overcast review');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.42,.43,.44,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.8
bpy.ops.import_scene.gltf(filepath=str(output))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.02,0))
floor=bpy.context.object;floor.name='plain mid-grey ground'
floor_mat=bpy.data.materials.new('plain mid-grey ground');floor_mat.diffuse_color=(.34,.35,.36,1);floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.34,.35,.36,1)
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.96;floor.data.materials.append(floor_mat)
for loc,power,size in [((4,5,9),4300,7),((-5,-5,6),2600,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object
    light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector((0,0,1.6))-light.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('matched low photo camera');camera=bpy.data.objects.new('matched low photo camera',camera_data)
scene.collection.objects.link(camera);camera.location=(7.5,9.5,3.0)
camera.rotation_euler=(Vector((0,0,1.65))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=52;scene.camera=camera
evidence.mkdir(parents=True,exist_ok=True)
for identifier,_,_,_ in specs:
    root_node=bpy.data.objects.get(identifier)
    if root_node is None: raise RuntimeError('exported GLB lost truck root '+identifier)
    # One truck is visible at a time in the imported scene.
    all_roots=[bpy.data.objects.get(name) for name,_,_,_ in specs]
    for other in all_roots:
        if other:
            hidden=other.name!=identifier
            other.hide_render=hidden
            for child in other.children_recursive: child.hide_render=hidden
    scene.render.filepath=str(evidence/(identifier+'.png'))
    bpy.ops.render.render(write_still=True)
print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                  'trucks':truck_metrics,
                  'renderedFromImportedGlb':True,'evidence':str(evidence)}))
