"""Carve the Wasteland town walkers from four-view photographic turnarounds.

Run: blender -b -t 4 --python-exit-code 1 --python tools/blender/town-walkers.py -- --root . --render-dir .qa-dist/town-walkers
The four small photo sets are rebuild inputs in the adjacent textures folder.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--people', default='all')
parser.add_argument('--render-dir', default='.qa-dist/town-walkers')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
script = root / 'tools/blender/town-walkers.py'
glb = root / 'public/assets/models/wasteland/town/walkers.glb'
textures = root / 'public/assets/models/wasteland/town/textures'
blend = root / 'art-build/town/walkers.blend'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir

PEOPLE = [
    ('walker-a', 'walker-a', 1.70, 'dust coat', .83),
    ('walker-b', 'walker-b', 1.70, 'poncho', .82),
    ('walker-c', 'walker-c', 1.70, 'welding apron', .84),
    ('walker-d', 'walker-d', 1.70, 'patched long coat', .81),
    ('walker-e', 'walker-e', 1.70, 'work apron', .84),
    ('walker-f', 'walker-f', 1.70, 'hooded poncho', .82),
    ('walker-g', 'walker-g', 1.70, 'rolled sleeve overalls', .83),
    ('walker-h', 'walker-h', 1.70, 'head scarf and overalls', .82),
    ('walker-kid-a', 'walker-kid-a', 1.30, 'child jacket and patched shorts', .66),
    ('walker-kid-b', 'walker-kid-b', 1.30, 'child overshirt and trousers', .66),
    ('walker-guard', 'walker-guard', 1.70, 'guard coat with slung rifle', .83),
    ('walker-trader', 'walker-trader', 1.70, 'long coat and loaded pack', .83),
    ('walker-vane', 'walker-vane', 1.70, 'white overalls and blue drop', .84),
]
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(render_dir)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(script.parent))
from hull_model import View, occupancy, largest_part, carve_hull
from photo_model import Photo

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
blend.parent.mkdir(parents=True, exist_ok=True)
glb.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)

# Hand measurements on the 190 x 256 crops: adult head top y=7, ground y=253,
# centreline x=95, hip y=133. The child uses the same measured photo span,
# scaled to 1.30 m; her hip is y=128. Each panel was reduced without distortion.
PHOTO = {'adult': (7, 253, 95, 133), 'child': (7, 253, 95, 128)}
VOXEL = .015
def frame_seeds(photo):
    seeds = [(5, 5), (photo.w - 6, 5), (5, photo.h - 6), (photo.w - 6, photo.h - 6)]
    seeds += [(x, 4) for x in range(32, photo.w - 8, 32)]
    seeds += [(x, photo.h - 5) for x in range(32, photo.w - 8, 32)]
    seeds += [(4, y) for y in range(32, photo.h - 8, 32)]
    seeds += [(photo.w - 5, y) for y in range(32, photo.h - 8, 32)]
    return seeds

def measurements(height, kind):
    top, ground, centre, hips = PHOTO[kind]
    scale = height / (ground - top)
    ground_y = (ground - top) * scale
    return scale, centre, ground, hips, ground_y

def views_for(photo_set, height, kind):
    scale, centre, ground, hips, world_height = measurements(height, kind)
    photos = {name: Photo(textures / f'{photo_set}-{name}.jpg') for name in ('front', 'side', 'back', 'top')}

    def front_pick(x, y, z):
        return centre + x / scale, ground - y / scale
    def side_pick(x, y, z):
        return centre + z / scale, ground - y / scale
    def back_pick(x, y, z):
        return centre - x / scale, ground - y / scale
    def top_pick(x, y, z):
        return centre + x / scale, 256 - z / scale

    specs = [
        ('front', front_pick, (0, 0, 1)),
        ('side', side_pick, (1, 0, 0)),
        ('back', back_pick, (0, 0, -1)),
        ('top', top_pick, (0, 1, 0)),
    ]
    result = []
    for name, pick, normal in specs:
        photo = photos[name]
        view = View(name, photo, frame_seeds(photo), pick, normal, grey=28, tolerance=34)
        result.append(view)
    return result, scale, centre, ground, hips, world_height

def look_any(view, x, y, z):
    return view.covers(x, y, z)

def add_actor(person, index):
    ident, photo_set, height, outfit, hip_fraction = person
    kind = 'child' if 'kid' in ident else 'adult'
    views, scale, centre, ground, hips_px, world_height = views_for(photo_set, height, kind)
    materials = {view.name: view.photo.material(.94) for view in views}
    for material in materials.values():
        material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0

    hip_y = (ground - hips_px) * scale
    half_x = .47 if kind == 'adult' else .39
    body_bounds = ((-half_x, half_x), (0, height + .10), (-.38, .38))
    leg_bounds = ((-.34, .34), (0, hip_y + .06), (-.30, .30))
    actor = bpy.data.objects.new(ident, None)
    scene.collection.objects.link(actor)
    actor.parent = root_node

    def upper_keep(x, y, z):
        # The coat/apron photographed below the hip stays with the torso;
        # the two leg hulls sit behind its open split and swing at the hip.
        if outfit in ('dust coat', 'patched long coat', 'long coat and loaded pack',
                      'welding apron', 'work apron', 'poncho', 'hooded poncho'):
            return (y >= hip_y) | (np.abs(x) >= .12)
        return y >= hip_y
    def left_keep(x, y, z):
        return (y < hip_y + .015) & (x <= .012)
    def right_keep(x, y, z):
        return (y < hip_y + .015) & (x >= -.012)

    # An upright body has no 1.7 m ground-plane footprint. The overhead image
    # is measured and used to paint upward-facing surfaces, while the front,
    # profile and back masks define occupancy.
    tests = [view.covers for view in views if view.name != 'top']
    parts = []
    upper_target = 180 if ident == 'walker-guard' else 205
    leg_target = 65 if ident == 'walker-guard' else 75
    for label, bounds, keep, target in (
        ('upper', body_bounds, upper_keep, upper_target),
        ('leg-l', leg_bounds, left_keep, leg_target),
        ('leg-r', leg_bounds, right_keep, leg_target),
    ):
        solid, xs, ys, zs = occupancy(bounds, VOXEL, tests, keep)
        if not solid.any():
            raise RuntimeError(f'{ident}:{label} photo masks do not overlap')
        solid = largest_part(solid)
        if not solid.any():
            raise RuntimeError(f'{ident}:{label} photo carve is empty')
        mesh = carve_hull(f'{ident}:{label}', views, materials, solid, xs, ys, zs, VOXEL, target)
        mesh['piece'] = label
        if label == 'upper':
            mesh.parent = actor
            parts.append(mesh)
        else:
            side = 'l' if label.endswith('l') else 'r'
            pivot = bpy.data.objects.new(f'{ident}:{label}', None)
            scene.collection.objects.link(pivot)
            pivot.parent = actor
            pivot.location = (-.095 if side == 'l' else .095, 0, hip_y)
            pivot['swing_axis'] = 'X'
            mesh.location = (0, 0, -hip_y)
            mesh.parent = pivot
            parts.append(mesh)

    actor['height_m'] = height
    actor['photo_set'] = photo_set
    actor['hip_height_m'] = round(hip_y, 3)
    actor['outfit'] = outfit
    add_outfit_parts(actor, ident, outfit, height)
    count = 0
    for obj in actor.children_recursive:
        if obj.type == 'MESH':
            obj.data.calc_loop_triangles()
            count += len(obj.data.loop_triangles)
    if count > 450:
        raise RuntimeError(f'{ident}: {count} triangles exceeds 450')
    actor['triangle_count'] = count
    print('WALKER', ident, 'triangles', count, 'height', height, 'hip', round(hip_y, 3))
    return actor

def accessory_material(name, color, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = min(metallic, .3)
    bsdf.inputs['Roughness'].default_value = .92
    return mat

def make_ellipsoid(name, actor, center, radius, material, segments=8, rings=5):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radius
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    uv = obj.data.uv_layers.active
    if uv:
        uv.name = 'UVMap'
    obj.parent = actor
    return obj

def make_rifle(name, actor, steel, wood, strap_material):
    # A narrow, slung salvage rifle follows the guard's shoulder to opposite hip.
    beam(name + ' leather sling', actor, (-.23, -.17, 1.38), (.19, -.18, .87), .012, strap_material)
    # Slim parts show a plausible stock, receiver and barrel at town scale.
    beam(name + ' stock', actor, (-.20, -.19, 1.27), (-.05, -.19, 1.10), .028, wood)
    beam(name + ' receiver', actor, (-.05, -.19, 1.10), (.10, -.19, .98), .024, steel)
    beam(name + ' barrel', actor, (.10, -.19, .98), (.28, -.19, .83), .010, steel)

def beam(name, actor, start, end, radius, material):
    a, b = Vector(start), Vector(end)
    direction = b - a
    mid = (a + b) * .5
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius, depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(material)
    uv = obj.data.uv_layers.active
    if uv:
        uv.name = 'UVMap'
    obj.parent = actor
    return obj

def add_outfit_parts(actor, ident, outfit, height):
    if outfit == 'guard coat with slung rifle':
        steel = accessory_material(ident + ' blued steel', (.10, .11, .10), .2)
        wood = accessory_material(ident + ' dark rifle wood', (.16, .11, .07))
        strap = accessory_material(ident + ' worn leather rifle sling', (.12, .075, .045))
        make_rifle(ident + ' slung rifle', actor, steel, wood, strap)
        beam(ident + ' rifle grip', actor, (-.07, -.195, 1.12), (-.04, -.195, 1.02), .025, wood)
    if outfit == 'long coat and loaded pack':
        canvas = accessory_material(ident + ' salvage pack canvas', (.25, .21, .15))
        make_ellipsoid(ident + ' pack main', actor, (0, .21, 1.05), (.22, .17, .31), canvas)
        beam(ident + ' pack roll', actor, (-.14, .18, 1.29), (.14, .18, 1.29), .045, canvas)
    if outfit == 'white overalls and blue drop':
        blue = accessory_material(ident + ' blue drop', (.07, .23, .31))
        # The model's white overalls are carved from the separate Vane photo set.
        make_ellipsoid(ident + ' blue drop', actor, (.19, -.16, 1.12), (.035, .025, .06), blue, 7, 4)

def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    world = bpy.data.worlds.new('even overcast grey')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.23, .22, .19, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    scene.world = world
    bpy.ops.object.light_add(type='AREA', location=(0, -5, 8))
    light = bpy.context.object
    light.data.energy = 560
    light.data.shape = 'DISK'
    light.data.size = 13
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=1000000, location=(0, 0, -.02))
    ground = bpy.context.object
    ground.name = 'plain mid grey-brown ground'
    mat = bpy.data.materials.new('mid grey-brown dirt, evenly lit')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (.23, .22, .19, 1)
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])
    ground.data.materials.append(mat)

def look_render():
    if not args.render_dir:
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(glb))
    setup_scene()
    people = [o for o in scene.objects if o.type == 'EMPTY' and o.name in {p[0] for p in selected}]
    if not people:
        return
    # The real game car is the scale reference. Fit its measured longest ground
    # dimension to 4.2 m and park it beside the first photographed person.
    before = set(scene.objects)
    car_path = root / 'public/assets/models/wasteland/cars/rattler.glb'
    if car_path.exists():
        bpy.ops.import_scene.gltf(filepath=str(car_path))
        car_parts = [o for o in scene.objects if o not in before and o.type == 'MESH']
        if car_parts:
            scene.view_layers.update()
            corners = [o.matrix_world @ Vector(corner) for o in car_parts for corner in o.bound_box]
            low = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
            high = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
            length = max(high.x - low.x, high.y - low.y)
            scale_car = 4.2 / max(length, .001)
            for obj in car_parts:
                obj.location *= scale_car
                obj.scale *= scale_car
            car_root = bpy.data.objects.new('actual game car for scale', None)
            scene.collection.objects.link(car_root)
            car_root.location = (3.1, 0, 0)
            for obj in car_parts:
                world = obj.matrix_world.copy()
                obj.parent = car_root
                obj.matrix_world = world
    # Matched three-quarter views from the exported file; one even light and dirt.
    for i, actor in enumerate(people):
        actor_index = people.index(actor)
        for other in people:
            other.location.x = (people.index(other) - actor_index) * .72
        for obj in scene.objects:
            if obj.type == 'MESH':
                parent = obj
                belongs = False
                while parent:
                    if parent == actor:
                        belongs = True
                        break
                    parent = parent.parent
                obj.hide_render = not (belongs or obj.name == 'plain mid grey-brown ground')
        bpy.ops.object.camera_add(location=(1.9, -4.6, 2.0))
        camera = bpy.context.object
        camera.data.lens = 52
        camera.location = (0, -4.6, 1.0)
        camera.rotation_euler = (Vector((0, 0, .87)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = camera
        scene.render.resolution_x = 600
        scene.render.resolution_y = 680
        scene.render.filepath = str(render_dir / f'{actor.name}-exported.png')
        bpy.ops.render.render(write_still=True)
        for obj in locals().get('car_parts', []):
            obj.hide_render = False
        for distance in (40, 80):
            camera.location = (distance * .35, -distance * .66, distance * .66)
            camera.data.lens = 50
            camera.rotation_euler = (Vector((0, 0, .82)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
            scene.render.resolution_x = 900
            scene.render.resolution_y = 600
            scene.render.filepath = str(render_dir / f'{actor.name}-{distance}m.png')
            bpy.ops.render.render(write_still=True)
        for obj in locals().get('car_parts', []):
            obj.hide_render = True
        bpy.data.objects.remove(camera, do_unlink=True)
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = obj in locals().get('car_parts', [])
    for i, actor in enumerate(people):
        actor.location = ((i - (len(people) - 1) / 2) * .60, 0, 0)
        if actor.name == 'walker-trader':
            actor.rotation_euler.z = math.pi
    bpy.ops.object.camera_add(location=(0, -10, 3.5))
    camera = bpy.context.object
    camera.data.lens = 38
    camera.rotation_euler = (Vector((0, 0, .80)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 620
    scene.render.filepath = str(render_dir / 'family-lineup.png')
    bpy.ops.render.render(write_still=True)
    # Reuse the exported figures for a 40-person mayor-height crowd view.
    sources = {actor.name: actor for actor in people}
    originals = list(scene.objects)
    def clone_actor(source, offset):
        subtree = []
        def visit(obj):
            subtree.append(obj)
            for child in obj.children:
                visit(child)
        visit(source)
        copies = {}
        for obj in subtree:
            dup = obj.copy()
            if obj.data:
                dup.data = obj.data
            scene.collection.objects.link(dup)
            copies[obj] = dup
        for obj, dup in copies.items():
            if obj.parent in copies:
                dup.parent = copies[obj.parent]
        copies[source].location = offset
    for i in range(40):
        source = people[i % len(people)]
        clone_actor(source, ((i % 8 - 3.5) * 1.0, (i // 8) * 1.0, 0))
    bpy.ops.object.camera_add(location=(0, -60, 60))
    camera = bpy.context.object
    camera.data.lens = 55
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 850
    scene.render.filepath = str(render_dir / 'mayor-crowd-40.png')
    bpy.ops.render.render(write_still=True)

selected = PEOPLE if args.people == 'all' else [p for p in PEOPLE if p[0] in set(args.people.split(','))]
if not selected:
    raise SystemExit('No walkers selected; use --people all or a comma-separated list')
root_node = bpy.data.objects.new('town-walkers', None)
scene.collection.objects.link(root_node)
actors = []
for person in selected:
    # Create the root first, so the carve pieces have their final ground origin.
    # The routine sets the parent after geometry is complete; no origin is shifted.
    actors.append(add_actor(person, len(actors)))
    actors[-1].parent = root_node

bpy.ops.object.select_all(action='DESELECT')
for obj in [root_node, *root_node.children_recursive]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root_node
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                           export_yup=True, export_apply=True, export_materials='EXPORT',
                           export_image_format='JPEG', export_image_quality=84)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
look_render()

def read_glb(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length].decode('utf-8').rstrip('\0 '))

gltf = read_glb(glb)
nodes = gltf.get('nodes', [])
for person in selected:
    ident = person[0]
    index = next(i for i, node in enumerate(nodes) if node.get('name') == ident)
    stack = [index]
    descendants = []
    while stack:
        node_index = stack.pop()
        descendants.append(node_index)
        stack.extend(nodes[node_index].get('children', []))
    count = sum(gltf['accessors'][primitive['indices']]['count'] // 3
                for node_index in descendants if nodes[node_index].get('mesh') is not None
                for primitive in gltf['meshes'][nodes[node_index]['mesh']]['primitives'])
    if count > 450:
        raise RuntimeError(f'{ident} has {count} triangles, over 450')
if glb.stat().st_size > 1024 * 1024:
    raise RuntimeError(f'walkers.glb is {glb.stat().st_size} bytes, over 1 MB')
print(json.dumps({'glb': str(glb), 'bytes': glb.stat().st_size, 'people': len(selected)}))
