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
evidence = root / '.evidence/town-art-trucks-1'
textures = root / 'public/assets/models/wasteland/town/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)], 'evidence': [str(evidence)]}))
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
    bsdf.inputs['Metallic'].default_value = min(.29, bsdf.inputs['Metallic'].default_value)
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
    'fire-truck': ('fire-engine-projection.jpg', (.30, .055, .032, 1)),
    'water-tanker': ('water-tanker-projection.jpg', (.13, .16, .17, 1)),
    'supply-truck': ('supply-truck-projection.jpg', (.18, .19, .10, 1)),
    'tow-rig': ('tow-rig-projection.jpg', (.20, .12, .045, 1)),
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
    image.name = identifier + ' camera projected photo'
    image.file_format = 'JPEG'
    image.pack()
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.interpolation = 'Linear'
    texture.extension = 'CLIP'
    # glTF keeps a plain image-to-color link reliably; the photo is graded on
    # disk so the exported model and the Blender source share the same paint.
    bsdf.inputs['Base Color'].default_value=(1,1,1,1)
    material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    materials[identifier + '-paint'] = material

paint_rust = materials['rusted-steel']
tin = materials['galvanised-tin']
dark_metal = materials['iron-dark']
glass = materials['dirty-glass']
wood = materials['weathered-plank']
canvas = materials['patched-canvas']
tanker_steel = bpy.data.materials.new('Tanker / rusted bare steel')
tanker_steel.use_nodes=True
tanker_steel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,1,1,1)
tanker_steel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.18
tanker_steel.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.91
tanker_photo=bpy.data.images.get('water-tanker camera projected photo')
if tanker_photo:
    photo_node=tanker_steel.node_tree.nodes.new('ShaderNodeTexImage')
    photo_node.image=tanker_photo;photo_node.extension='CLIP'
    tanker_steel.node_tree.links.new(photo_node.outputs['Color'],tanker_steel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
lamp = bpy.data.materials.new('Aged amber lamp lens')
lamp.use_nodes=True
lamp.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.62,.59,.48,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=0
lamp.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.18,.15,.10,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.35
for name, mat in materials.items():
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Metallic'].default_value = min(.29, bsdf.inputs['Metallic'].default_value)

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
    """Loft smooth pressed-steel sections with a softly crowned cross-section."""
    ring = [(math.copysign(.5*abs(math.cos(math.tau*i/20))**.5, math.cos(math.tau*i/20)),
             math.copysign(.5*abs(math.sin(math.tau*i/20))**.5, math.sin(math.tau*i/20)))
            for i in range(20)]
    verts, faces = [], []
    for z, width, height, cy in stations:
        for x, y in ring:
            verts.append((x * width, -z, cy + y * height))
    for station in range(len(stations)-1):
        for i in range(len(ring)):
            a=station*len(ring)+i; b=station*len(ring)+(i+1)%len(ring)
            faces.append((a,b,b+len(ring),a+len(ring)))
    faces.append(tuple(reversed(range(len(ring)))))
    end=(len(stations)-1)*len(ring)
    faces.append(tuple(end+i for i in range(len(ring))))
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
    for polygon in mesh.polygons: polygon.use_smooth=True
    bevel=obj.modifiers.new('soft rolled panel corners','BEVEL'); bevel.width=.018; bevel.segments=2
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

def swept_mudguard(name, side, axle_z, material):
    """A folded wheel arch with width and gauge, tied into the running board."""
    verts=[];faces=[]
    for layer_x in (side*1.05, side*1.39):
        for i in range(25):
            a=math.pi*i/24
            verts.append(game_vector((layer_x,.56+.76*math.sin(a),axle_z+.76*math.cos(a))))
    for i in range(24): faces.append((i,i+1,26+i,25+i))
    mesh=bpy.data.meshes.new(name+' folded arch mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
    obj.modifiers.new('pressed steel arch gauge','SOLIDIFY').thickness=.055
    obj.modifiers.new('rolled arch lip','BEVEL').width=.022
    obj.modifiers.new('smooth arch normals','WEIGHTED_NORMAL')
    return obj

def export_glb(path):
    """Keep the integration town_base export contract, including embedded JPEGs."""
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
        export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=80)

# Use the shared entry point. This adapter supplies the current integration
# branch's JPEG settings while this lane's older town_base still writes PNG.
town.export_glb=export_glb

def project_paint_from_camera(root_obj, material, camera):
    """Project the matched reference camera onto each truck's paint surfaces."""
    selected=material if isinstance(material,(list,tuple)) else (material,)
    selected_names={item.name for item in selected}
    bpy.context.view_layer.update()
    frame=camera.data.view_frame(scene=scene)
    frame_width=max(v.x for v in frame)-min(v.x for v in frame)
    frame_height=max(v.y for v in frame)-min(v.y for v in frame)
    world_to_camera=camera.matrix_world.inverted()
    for obj in [root_obj]+list(root_obj.children_recursive):
        if obj.type!='MESH' or not selected_names.intersection(item.name for item in obj.data.materials):
            continue
        while obj.data.uv_layers:
            obj.data.uv_layers.remove(obj.data.uv_layers[0])
        uv=obj.data.uv_layers.new(name='UVMap')
        obj.data.uv_layers.active_index=0
        uv.active_render=True
        for loop in obj.data.loops:
            world=obj.matrix_world @ obj.data.vertices[loop.vertex_index].co
            if world.x>0.05:
                world.x=-world.x
            p=world_to_camera @ world
            if p.z>=-0.01:
                uv.data[loop.index].uv=(.5,.5)
                continue
            uv.data[loop.index].uv=(.5+p.x/(-p.z*frame_width), .5+p.y/(-p.z*frame_height))

def set_photo_camera(camera, target=(0,0,1.65)):
    camera.location=(-10.5,12.0,5.4)
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=48

projection_camera_data=bpy.data.cameras.new('reference projection camera')
projection_camera=bpy.data.objects.new('reference projection camera',projection_camera_data)
scene.collection.objects.link(projection_camera)
projection_camera.data.lens=48

def make_wheel(identifier, x, z, rear=False, dual=False):
    center=(x,.56,z); r=.55
    suffix=':dual' if dual else ''
    root_obj=pivot(f'{identifier}:spin-{"rear" if rear else "front"}-{"left" if x>0 else "right"}{suffix}',center)
    # Deep continuous carcass and steel rim.
    bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=5,
        major_radius=r*.70,minor_radius=r*.30,location=game_vector(center),rotation=(0,math.pi/2,0))
    tire=bpy.context.object;tire.name=identifier+':deep lug tyre';tire.data.materials.append(dark_metal)
    parent_keep_world(tire,root_obj)
    rim=cylinder(identifier+':dark pressed steel disc rim',(x+(.28 if x>0 else -.28),.56,z),r*.47,.12,dark_metal,'X',16)
    parent_keep_world(rim,root_obj)
    hub=cylinder(identifier+':rusted hub cap',(x+(.36 if x>0 else -.36),.56,z),r*.20,.14,paint_rust,'X',12)
    parent_keep_world(hub,root_obj)
    lugs=[]
    for i in range(12):
        a=math.tau*i/12
        loc=(x,.56+math.sin(a)*r*.96,z+math.cos(a)*r*.96)
        bpy.ops.mesh.primitive_cube_add(size=1,location=game_vector(loc),rotation=(a,0,0))
        lug=bpy.context.object;lug.name=identifier+':integrated tread lug'
        lug.dimensions=(.18,.075,.052)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        lug.data.materials.append(dark_metal);parent_keep_world(lug,root_obj);lugs.append(lug)
    bpy.ops.object.select_all(action='DESELECT')
    for lug in lugs: lug.select_set(True)
    bpy.context.view_layer.objects.active=lugs[0]
    bpy.ops.object.join()
    bpy.context.object.name=identifier+':joined deep tread lugs'
    for i in range(6):
        a=math.tau*i/6
        bolt=cylinder(identifier+':wheel nut',(x+(.35 if x>0 else -.35),.56+math.sin(a)*r*.27,z+math.cos(a)*r*.27),.026,.04,tin,'X',8)
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
    # Road tyres have a rounded shoulder and close block tread; the tanker,
    # supply and recovery rig use dual tyres on their rear axles.
    for z in axle_z:
        for side in (-1,1):
            wheel_x=side*(.82 if z>0 and kind in ('tanker','supply','tow') else 1.02)
            wheel_root=make_wheel(identifier,wheel_x,z,rear=z>0)
            if z<0:
                steer=pivot(identifier+':steer-front-'+('left' if side>0 else 'right'),(side*1.02,.56,z))
                parent_keep_world(wheel_root,steer)
            elif kind in ('tanker','supply','tow'):
                twin=make_wheel(identifier,side*1.34,z,rear=True,dual=True)

    # Pressed, square-shouldered cab and broad bonnet match the camera reference.
    box(identifier+':pressed flat bonnet',(0,1.15,-2.78),(1.90,.62,1.88),paint,.14)
    box(identifier+':square shouldered cab',(0,1.92,-.92),(2.16,1.44,1.86),paint,.075)
    box(identifier+':seated cab roof',(0,2.675,-.92),(2.30,.18,1.92),paint,.045)
    # The roof overlaps the cab crown by 6 cm; there is no floating roof edge.
    # A visible crown seam and short pressed louvres set into both bonnet sides.
    bar(identifier+':bonnet centre crease',(0,1.40,-3.42),(0,1.47,-2.04),.026,tin)
    for side in (-1,1):
        for i in range(5):
            z=-3.12+i*.18
            bar(identifier+':bonnet side louvre',(side*.89,1.08,z),(side*.93,1.30,z),.026,dark_metal)
        swept_mudguard(identifier+':deep folded mudguard',side,axle_z[0],paint)
        box(identifier+':wide running board',(side*1.21,.70,-.19),(.42,.12,1.42),dark_metal,.035)
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
        bar(identifier+':door beltline seam',(side*1.105,1.82,-1.16),(side*1.105,1.82,-.02),.028,dark_metal)
        bar(identifier+':door seam',(side*1.105,.96,-1.00),(side*1.105,1.83,-1.00),.018,dark_metal)
        box(identifier+':door handle',(side*1.13,1.36,-.52),(.04,.035,.18),tin,.014)
        # Lamps on stalks, with round lenses kept under the named light group.
        z=-3.25
        bar(identifier+':headlamp stalk',(side*.78,.92,z-.06),(side*.88,1.23,z-.06),.055,tin)
        cylinder(identifier+':round headlamp rim',(side*.88,1.23,z-.08),.19,.10,tin,'Z',24)
        lens=cylinder(identifier+':headlamp-'+('left' if side>0 else 'right'),
                      (side*.88,1.23,z-.145),.145,.035,lamp,'Z',24)
        parent_keep_world(lens,lamp_group)
    # Vertical grille bars in a recessed surround.
    box(identifier+':grille surround',(0,1.18,-3.68),(.91,.83,.10),dark_metal,.06)
    if kind=='fire':
        for i in range(9):
            y=.88+i*.075
            bar(identifier+':bright horizontal grille bar',(-.42,y,-3.755),(.42,y,-3.755),.032,tin)
    else:
        for i in range(11):
            x=-.37+i*.074
            bar(identifier+':bright vertical grille bar',(x,.84,-3.755),(x,1.52,-3.755),.032,tin)
    box(identifier+':single heavy steel bumper',(0,.72,-3.86),(2.48,.23,.22),dark_metal,.055)
    for side in (-1,1):
        for z in (-1.35,-.34):
            bar(identifier+':door reinforcing crease',(side*1.105,1.15,z),(side*1.105,1.22,z+.62),.018,tin)
    for side in (-1,1):
        bar(identifier+':windshield wiper arm',(side*.18,2.00,-1.72),(side*.78,2.12,-1.48),.025,dark_metal)
        bar(identifier+':windshield wiper blade',(side*.52,2.13,-1.49),(side*.91,2.16,-1.36),.022,tin)
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
            for coil in range(5):
                bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,
                    major_radius=.37-coil*.046,minor_radius=.029,
                    location=game_vector((side*1.31,1.88,.92)),rotation=(0,math.pi/2,0))
                hose=bpy.context.object;hose.name=identifier+':visible hose coil';hose.data.materials.append(dark_metal)
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
        # Retain the established movable socket; the roof carries a ladder and
        # beacon instead of a weapon-like cannon.
        cannon=pivot(identifier+':cannon',(0,2.88,-.48));parent_keep_world(cannon,root_obj)
    elif kind=='tanker':
        # Six-wheel, nine metre tanker with elliptical steel vessel and walkway.
        cylinder(identifier+':riveted rusted steel tanker',(0,1.96,2.15),.91,4.62,tanker_steel,'Z',48)
        for z in (-.04,.64,1.32,2.00,2.68,3.36,4.04):
            bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,
                major_radius=.91,minor_radius=.035,location=game_vector((0,1.96,z)),rotation=(math.pi/2,0,0))
            bpy.context.object.name=identifier+':dark rusted tank hoop';bpy.context.object.data.materials.append(dark_metal)
        for side in (-1,1):
            box(identifier+':narrow top walkway',(side*.52,2.94,2.15),(.22,.07,4.25),tin,.025)
            for z in (.30,.80,1.30,1.80,2.30,2.80,3.30,3.80):
                cylinder(identifier+':tank visible rivet',(side*.84,1.99,z),.035,.035,tin,'X',10)
            pipe(identifier+':drain and valve pipe',[(side*.78,1.17,.10),(side*.95,.67,.10),(side*.78,.67,1.42)],.045,dark_metal)
            cylinder(identifier+':large valve wheel',(side*.99,.68,1.42),.20,.06,paint_rust,'X',20)
            for streak in range(6):
                z=.20+streak*.70;length=.32+(streak%3)*.18
                pipe(identifier+':dark tank rust run',[(side*.91,1.95,z),(side*.91,1.95,z+length)],.018,dark_metal)
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
            for y in (1.22,1.51,1.80,2.09):
                for z in (-.08,.85,1.80,2.98):
                    bar(identifier+':tall slatted side stake',(side*.98,1.10,z),(side*.98,y,z),.072,wood)
                bar(identifier+':iron stake-side rail',(side*.99,y,0),(side*.99,y,2.94),.055,tin)
        for z in (.08,2.92):
            box(identifier+':bed end board',(0,1.40,z),(1.88,.68,.10),wood,.03)
        # Individually shaped slatted crates with bevelled edges.
        for x,z,w,d,h in [(-.48,.34,.70,.64,.65),(.36,.65,.68,.70,.80),(-.40,1.42,.78,.74,.72),(.38,2.18,.68,.60,.74),(-.08,2.72,.62,.62,.66)]:
            box(identifier+':loaded wooden crate',(x,1.28+h/2,z),(w,h,d),wood,.055)
            for yy in (1.28+h*.28,1.28+h*.68):
                box(identifier+':crate timber slat',(x,yy,z+d*.505),(w*.88,.075,.035),tin,.012)
        for i,(x,z) in enumerate([(-.72,.60),(.72,.88),(-.62,1.44),(.68,1.78),(-.70,2.40),(.65,2.70)]):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=game_vector((x,1.70,z)))
            sack=bpy.context.object;sack.name=identifier+':stitched canvas sack'
            sack.scale=(.30,.42,.40);sack.data.materials.append(canvas)
        for z in (.30,1.08,1.86,2.64):
            pipe(identifier+':cargo tie rope',[(.98,2.30,z),(-.98,2.30,z)],.024,dark_metal)
        for obj in set(bpy.context.scene.objects)-load_start:
            if obj.parent is None: parent_keep_world(obj,load_group)
    elif kind=='tow':
        # Exposed rear chassis and a true braced lattice recovery boom.
        for z in (-.10,.36,.82,1.28,1.74,2.20,2.66,3.02):
            box(identifier+':recovery bed steel plank',(0,1.00,z),(1.72,.09,.38),paint_rust,.025)
        for side in (-1,1):
            bar(identifier+':crane upright',(side*.62,1.28,.45),(side*.62,3.48,1.06),.13,paint_rust)
            bar(identifier+':boom lower chord',(side*.62,3.35,.97),(side*.62,3.84,3.36),.10,paint_rust)
            bar(identifier+':boom upper chord',(side*.62,3.62,1.00),(side*.62,4.11,3.39),.10,paint_rust)
            for t in (.12,.28,.44,.60,.76,.92):
                z=.97+t*2.39;y=3.35+t*.49
                bar(identifier+':lattice vertical',(side*.62,y,z),(side*.62,y+.26,z+.05),.062,paint_rust)
            for t in (.12,.28,.44,.60,.76,.92):
                z=.97+t*2.39;y=3.35+t*.49
                bar(identifier+':lattice diagonal',(side*.62,y,z),(side*.62,y+.26,z+.30),.055,paint_rust)
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
        cable=pipe(identifier+':crane cable',[(0,3.86,3.38),(0,1.68,3.28)],.032,dark_metal)
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
                decimate.ratio=.45 if material_name.endswith('/ photo paint') else .20

# The fire engine is built directly from measured photographs with photo_model.py.
# The existing three builds below remain until their own photo rounds.
from photo_model import Photo, Mesh as PhotoMesh, trace, tidy, slab, box as photo_box, lathe
import numpy as np

PHOTO_ROOT = root / '.evidence/town-art-trucks-1'
fire_photos = {name: Photo(PHOTO_ROOT / f'fire-engine-{name}.jpg')
               for name in ('side','front','rear','overhead')}
FIRE_PARTS = {
    'bonnet': {'view':'side','rect':(78,315,640,705),'half_width':1.20},
    'cab': {'view':'side','rect':(345,145,795,650),'half_width':1.06},
    'equipment-body': {'view':'side','rect':(650,210,1708,710),'half_width':1.22},
    'chassis': {'view':'side','rect':(85,650,1694,790),'half_width':1.08},
    'front-face': {'view':'front','rect':(315,95,1220,800),'width':2.82},
    'rear-face': {'view':'rear','rect':(320,95,1215,815),'width':2.82},
    'bonnet-roof': {'view':'overhead','rect':(180,72,850,460),'height':1.70},
    'cab-roof': {'view':'overhead','rect':(255,345,780,770),'height':2.62},
    'tank-top': {'view':'overhead','rect':(280,700,780,1110),'height':2.72},
    'rear-deck': {'view':'overhead','rect':(210,1060,840,1430),'height':2.35},
}
FIRE_S = .00430
FIRE_FRONT_Z = -3.45
FIRE_REAR_Z = 3.43

def save_photo_mask(name, mask):
    image=bpy.data.images.new('review mask '+name, mask.shape[1], mask.shape[0], alpha=False)
    grey=mask[::-1].astype(np.float32)
    image.pixels.foreach_set(np.dstack((grey,grey,grey,np.ones_like(grey))).ravel())
    image.filepath_raw=str(PHOTO_ROOT / ('mask-'+name+'.png'))
    image.file_format='PNG'; image.save()

# The generated warm/blue-gray studio floor needs the photo kit's wider grey cut.
fire_masks={}
seed_sets={
    'side':[(20,20),(1750,860),(20,850)],
    'front':[(20,20),(20,1000),(1510,1000)],
    'rear':[(20,20),(20,1000),(1510,1000)],
    'overhead':[(20,20),(1000,20),(20,1510),(1000,1510)],
}
for name,photo in fire_photos.items():
    fire_masks[name]=tidy(~photo.sky(seed_sets[name],grey=26))
    save_photo_mask(name,fire_masks[name])

fire_root=pivot('fire-truck',(0,0,0)); TRUCKS['fire-truck']=fire_root
side_mask=fire_masks['side'].copy()
for cx,cy,rx,ry in ((333,675,91,101),(1375,675,93,103)):
    yy,xx=np.ogrid[:side_mask.shape[0],:side_mask.shape[1]]
    side_mask[((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1]=False
save_photo_mask('side-wheel-openings',side_mask)
body_mesh=PhotoMesh()
def side_point(px,py,x):
    return (x,(780-py)*FIRE_S,(px-78)*FIRE_S-3.45)
for name in ('bonnet','cab','equipment-body','chassis'):
    part=FIRE_PARTS[name]; photo=fire_photos['side']
    loops=trace(side_mask,part['rect'],tolerance=1.2,min_area=120)
    if not loops: raise RuntimeError(f'{name}: Photo.sky found no outline in {part["rect"]}')
    for sign in (-1,1):
        half=part['half_width']
        slab(body_mesh,'side',photo,loops,
             lambda px,py,d,sign=sign:side_point(px,py,sign*d),
             half-.055,half,wall_scale=FIRE_S)

# Front and rear shells keep their photographed opaque cab glass and close the body.
for name in ('front-face','rear-face'):
    part=FIRE_PARTS[name]; photo=fire_photos[part['view']]
    end_mask=fire_masks[part['view']].copy()
    for cx,cy,rx,ry in ((540,870,108,122),(1000,870,108,122)):
        yy,xx=np.ogrid[:end_mask.shape[0],:end_mask.shape[1]]
        end_mask[((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1]=False
    save_photo_mask(part['view']+'-wheel-openings',end_mask)
    loops=trace(end_mask,part['rect'],tolerance=1.5,min_area=250)
    if not loops: raise RuntimeError(f'{name}: no measured outline in {part["rect"]}')
    z0=FIRE_FRONT_Z if name=='front-face' else FIRE_REAR_Z
    def end_point(px,py,d,z0=z0):
        return ((px-768)*.0035,(948-py)*.0035,z0+d)
    slab(body_mesh,part['view'],photo,loops,end_point,0,.085,wall_scale=.0035)

# Roof shapes are measured in the real top photo at each part's actual height.
def top_point(px,py,y):
    return ((px-512)*.0046,y,(py-58)*.0046-3.42)
for name in ('bonnet-roof','cab-roof','tank-top','rear-deck'):
    part=FIRE_PARTS[name]; photo=fire_photos['overhead']
    loops=trace(fire_masks['overhead'],part['rect'],tolerance=1.7,min_area=240)
    if not loops: raise RuntimeError(f'{name}: no measured overhead outline in {part["rect"]}')
    slab(body_mesh,'overhead',photo,loops,top_point,part['height']-.045,part['height'],wall_scale=.0046)

def side_radial(photo,cx,cy,radius_px):
    def uv(index,distance,radius,angle):
        arc=.85
        return photo.uv(cx-math.cos(angle)*radius_px*arc,cy-math.sin(angle)*radius_px*arc)
    return uv

# Round axle shafts join the chassis and wheels; both use photo-measured lathe UVs.
def axle_uv(index,distance,radius,angle):
    return side_radial(fire_photos['side'],860,766,15)(index,distance,radius,angle)
for cx,cy in ((333,675),(1375,675)):
    wheel_y=(780-cy)*FIRE_S; wheel_z=(cx-78)*FIRE_S-3.45
    lathe(body_mesh,'side',(0,wheel_y,wheel_z),(1,0,0),(0,0,1),(0,1,0),
          [(-1.08,.07),(1.08,.07)],axle_uv,sides=16)

# Photo-derived tyres and rims stand at the measured 0.49 m radius and ground height.
for cx,cy,suffix in ((333,675,'front-left'),(333,675,'front-right'),
                     (1375,675,'rear-left'),(1375,675,'rear-right')):
    x=1.09 if suffix.endswith('left') else -1.09
    centre=(x,(780-cy)*FIRE_S,(cx-78)*FIRE_S-3.45)
    steer=None
    if suffix.startswith('front'):
        steer=pivot('fire-truck:steer-'+suffix,centre); parent_keep_world(steer,fire_root)
    spin=pivot('fire-truck:spin-'+suffix,centre); parent_keep_world(spin,steer or fire_root)
    wheel=PhotoMesh(); photo=fire_photos['side']
    tire_cap=lambda a,f,cx=cx,cy=cy:photo.uv(cx-math.cos(a)*112*f,cy-math.sin(a)*112*f)
    lathe(wheel,'side',(0,0,0),(1,0,0),(0,0,1),(0,1,0),
          [(-.13,.38),(-.12,.49),(.12,.49),(.13,.38)],side_radial(photo,cx,cy,112),sides=28,
          cap_start=('side',tire_cap),cap_end=('side',tire_cap))
    cap=lambda a,f,cx=cx,cy=cy:photo.uv(cx-math.cos(a)*52*f,cy-math.sin(a)*52*f)
    lathe(wheel,'side',(0,0,0),(1,0,0),(0,0,1),(0,1,0),[(-.14,.24),(.14,.24)],
          side_radial(photo,cx,cy,55),sides=24,cap_start=('side',cap),cap_end=('side',cap))
    wheel_obj=wheel.finish('fire-truck:'+suffix,{'side':photo.material()})
    wheel_obj.location=game_vector(centre); parent_keep_world(wheel_obj,spin)

# Side-photo lathes preserve the real hose-reel outlines without their edge pixels.
for sign in (-1,1):
    reel=PhotoMesh(); photo=fire_photos['side']; rcx,rcy=905,594
    lathe(reel,'side',(0,0,0),(1,0,0),(0,0,1),(0,1,0),
          [(-.16,.28),(-.14,.39),(.14,.39),(.16,.28)],side_radial(photo,rcx,rcy,72),sides=24)
    obj=reel.finish('fire-truck:hose-reel-'+str(sign),{'side':photo.material()})
    obj.location=game_vector((sign*1.22,(780-rcy)*FIRE_S,(rcx-78)*FIRE_S-3.45))
    parent_keep_world(obj,fire_root)

# Roof ladder rails and rungs use individual measured rectangles from the top photo.
ladder_mesh=PhotoMesh(); overhead=fire_photos['overhead']
def ladder_box(x0,x1,y0,y1,z0,z1,rect):
    photo_box(ladder_mesh,x0,x1,y0,y1,z0,z1,{'+y':('overhead',overhead,rect)})
for x,rect in ((-.66,(255,730,305,1340)),(.58,(715,730,765,1340))):
    ladder_box(x-.055,x+.055,2.88,2.98,-.35,2.55,rect)
for i in range(13):
    z=-.25+i*.215; px=335+i*28
    ladder_box(-.66,.58,2.89,2.96,z-.025,z+.025,(px,785,px+24,805))
ladder_obj=ladder_mesh.finish('fire-truck:roof-ladder',{'overhead':overhead.material()})
parent_keep_world(ladder_obj,fire_root)

# A separate cannon object turns around the origin at the measured roof pivot.
cannon=pivot('fire-truck:cannon',(0,2.89,-.18)); parent_keep_world(cannon,fire_root)
cannon_mesh=PhotoMesh(); photo=fire_photos['side']
lathe(cannon_mesh,'side',(0,0,0),(0,0,-1),(1,0,0),(0,1,0),
      [(0,.16),(-.24,.13),(-.72,.085)],side_radial(photo,795,158,35),sides=18)
cannon_obj=cannon_mesh.finish('fire-truck:cannon-barrel',{'side':photo.material()})
cannon_obj.location=game_vector((0,2.89,-.18)); parent_keep_world(cannon_obj,cannon)

# Round headlights are traced from the two circles in the front photo.
lamp_group=pivot('fire-truck:lamp',(0,0,0)); parent_keep_world(lamp_group,fire_root)
front_photo=fire_photos['front']
for side,cx in (('left',520),('right',1014)):
    cy=610; light_mesh=PhotoMesh()
    lathe(light_mesh,'front',(0,0,0),(0,0,1),(1,0,0),(0,1,0),
          [(-.045,.16),(.025,.16)],side_radial(front_photo,cx,cy,61),sides=24,
          cap_end=('front',lambda a,f,cx=cx,cy=cy:front_photo.uv(cx-math.cos(a)*55*f,cy-math.sin(a)*55*f)))
    head=light_mesh.finish('fire-truck:headlamp-'+side,{'front':front_photo.material()})
    head.location=game_vector(((cx-768)*.0035,(948-cy)*.0035,FIRE_FRONT_Z-.035))
    parent_keep_world(head,lamp_group)

photo_body=body_mesh.finish('fire-truck:photo measured shell',
    {name:photo.material() for name,photo in fire_photos.items()})
parent_keep_world(photo_body,fire_root)

specs=(('fire-truck',7.5,(-2.45,2.23),'fire'),
       ('water-tanker',9.0,(-3.00,2.55),'tanker'),
       ('supply-truck',7.5,(-2.35,2.22),'supply'),
       ('tow-rig',7.0,(-2.15,1.95),'tow'))
for identifier,length,axles,kind in specs:
    if identifier == 'fire-truck':
        continue  # The measured Photo model above owns this geometry.
    build_truck(identifier,length,axles,materials[identifier+'-paint'],kind)
    set_photo_camera(projection_camera, target=(0,0,1.65))
    projected=[materials[identifier+'-paint']]
    if identifier=='water-tanker': projected.append(tanker_steel)
    project_paint_from_camera(TRUCKS[identifier],projected,projection_camera)
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
        'paintImage':('four measured Photo sources' if identifier=='fire-truck' else PAINT_FILES[identifier][0]),
        'paintImageBytes':(sum((PHOTO_ROOT/f'fire-engine-{view}.jpg').stat().st_size for view in fire_photos)
                           if identifier=='fire-truck' else (textures/PAINT_FILES[identifier][0]).stat().st_size),
        'paintImageDimensions':('four source views' if identifier=='fire-truck' else list(bpy.data.images[identifier+' camera projected photo'].size)),
    }
triangles=sum(item['triangles'] for item in truck_metrics.values())
if any(item['triangles']>12000 for item in truck_metrics.values()):
    raise RuntimeError('A truck exceeds the 12,000 triangle budget: '+json.dumps(truck_metrics))
if args.export_only:
    print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                      'trucks':truck_metrics}))
    raise SystemExit(0)

# Reopen the exported GLB in an empty Blender scene. Every review frame is from
# this imported deliverable, lit flat and rendered with the Standard transform.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'
scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='Standard'
scene.render.resolution_percentage=100; scene.render.resolution_x=900; scene.render.resolution_y=600
scene.world=bpy.data.worlds.new('flat pale overcast review'); scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.72,.72,.70,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.8
bpy.ops.import_scene.gltf(filepath=str(output))
# Blender is Z-up after import; the road plane lies in XY at Z=0.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0))
floor=bpy.context.object; floor.name='plain pale review ground'
floor_mat=bpy.data.materials.new('plain pale review ground'); floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.58,.58,.56,1)
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.98
floor.data.materials.append(floor_mat)
for loc,power,size in [((4,1,9),1100,8),((-5,-4,6),700,7)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((0,0,1.35))-light.location).to_track_quat('-Z','Y').to_euler()
root_node=bpy.data.objects.get('fire-truck')
if root_node is None: raise RuntimeError('exported GLB lost fire-truck')
all_roots=[bpy.data.objects.get(name) for name,_,_,_ in specs]
for other in all_roots:
    if other:
        hidden=other.name!='fire-truck'; other.hide_render=hidden
        for child in other.children_recursive: child.hide_render=hidden
camera_data=bpy.data.cameras.new('round 7 review camera')
camera=bpy.data.objects.new('round 7 review camera',camera_data); scene.collection.objects.link(camera)
scene.camera=camera; camera.data.type='ORTHO'
evidence.mkdir(parents=True,exist_ok=True)
def render_view(name, location, target=(0,0,1.35), width=8.4, resolution=(900,600)):
    scene.render.resolution_x,scene.render.resolution_y=resolution
    camera.location=location
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=width
    scene.render.filepath=str(evidence/('round-7-'+name+'.png'))
    bpy.ops.render.render(write_still=True)

# Dead-on photos use the same orthographic camera directions and scale.
render_view('side-render',(-10,0,1.4),width=8.4,resolution=(900,450))
render_view('front-render',(0,10,1.4),width=4.8,resolution=(720,600))
render_view('rear-render',(0,-10,1.4),width=4.8,resolution=(720,600))
render_view('overhead-render',(0,0,14),target=(0,0,0),width=8.1,resolution=(600,900))
# Two three-quarter views, then the mayor's high view and the driver's 20 m view.
render_view('three-quarter-front',(-9,9,5.5),width=8.6)
render_view('three-quarter-rear',(9,-9,5.2),width=8.6)
render_view('mayor-height',(12,15,13),width=20)
render_view('driver-height-20m',(0,20,1.55),target=(0,0,1.45),width=12)
print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                  'trucks':truck_metrics,'renderedFromImportedGlb':True,'viewTransform':'Standard',
                  'reviewViews':8,'evidence':str(evidence)}))
