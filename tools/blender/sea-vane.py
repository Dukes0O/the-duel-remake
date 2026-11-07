"""Carve Mrs Vane from her measured four-view studio photographs."""
import argparse
import json
import struct
import sys
from collections import deque
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.evidence/ww-art-sea')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/mrs-vane.glb'
blend = root / 'art-build/scablands/mrs-vane.blend'
textures = root / 'public/assets/models/wasteland/scablands/textures'
render_dir = Path(args.render_dir) if args.render_dir else None
if render_dir and not render_dir.is_absolute():
    render_dir = root / render_dir
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(render_dir)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, str(root / 'tools/blender'))
from hull_model import View, occupancy, largest_part, carve_hull
from photo_model import Photo, Mesh, slab

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100

HEIGHT = 1.58
VOXEL = .014

# Photo-grid measurements (pixels in the committed JPEGs; origins at top left).
# All three standing photos: height 1.58 m; crown y=20, shoe soles y=850,
# x centreline=222 (front), 190 (side profile spine), 221 (back), hip y=405, shoulder y=140.
# At 830 px these give 0.0019036 m/px, hip 0.847 m, shoulder 1.352 m.
# Front: ground 850, crown 20, centre 222, hips 405, shoulders 140.
# Side:  ground 850, crown 20, spine centre 190, hips 405, shoulders 135.
# Back:  ground 850, crown 20, centre 221, hips 405, shoulders 130.
# Top: crown at y=230, soles at y=595, centre x=212, hips y=410,
# shoulders y=320; this overhead crop only sees head/shoulders, so it paints
# top-facing surfaces and does not set the standing height.
STANDING = {
    'front': {'crown': 20, 'ground': 850, 'centre': 222, 'hips': 405, 'shoulders': 140},
    'side':  {'crown': 20, 'ground': 850, 'centre': 190, 'hips': 405, 'shoulders': 135},
    'back':  {'crown': 20, 'ground': 850, 'centre': 221, 'hips': 405, 'shoulders': 130},
}
TOP = {'crown': 230, 'ground': 595, 'centre': 212, 'hips': 410, 'shoulders': 320}
SCALE = HEIGHT / (STANDING['front']['ground'] - STANDING['front']['crown'])
HIP_Y = (850 - 405) * SCALE
SHOULDER_Y = (850 - 140) * SCALE
HEM_Y = (850 - 710) * SCALE

def frame_seeds(photo):
    seeds = [(5, 5), (photo.w - 6, 5), (5, photo.h - 6), (photo.w - 6, photo.h - 6)]
    seeds += [(x, 4) for x in range(32, photo.w - 8, 32)]
    seeds += [(x, photo.h - 5) for x in range(32, photo.w - 8, 32)]
    seeds += [(4, y) for y in range(32, photo.h - 8, 32)]
    seeds += [(photo.w - 5, y) for y in range(32, photo.h - 8, 32)]
    return seeds

def studio_subject(photo):
    """Flood the mid-grey studio away from the coat without losing white cloth."""
    rgb = photo.rgb()
    edge = np.concatenate((rgb[:, :8], rgb[:, -8:]), axis=1)
    background = np.median(edge, axis=1)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    alike = (np.max(np.abs(rgb - background[:, None, :]), axis=2) <= 12) & (spread <= 20)
    outside = np.zeros(alike.shape, dtype=bool)
    queue = deque()
    for x in range(photo.w):
        if alike[0, x]: queue.append((0, x))
        if alike[-1, x]: queue.append((photo.h - 1, x))
    for y in range(photo.h):
        if alike[y, 0]: queue.append((y, 0))
        if alike[y, -1]: queue.append((y, photo.w - 1))
    while queue:
        y, x = queue.popleft()
        if y < 0 or x < 0 or y >= photo.h or x >= photo.w or outside[y, x] or not alike[y, x]:
            continue
        outside[y, x] = True
        queue.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    return ~outside

def make_views():
    names = ('front', 'side', 'back', 'top')
    photos = {name: Photo(textures / f'sea-mrs-vane-coat-{name}.jpg') for name in names}
    centres = {name: STANDING[name]['centre'] for name in ('front', 'side', 'back')}

    def front_pick(x, y, z):
        return centres['front'] - x / SCALE, 850 - y / SCALE
    # The side reference faces to the right; forward is -Z in the town rig.
    def side_pick(x, y, z):
        return centres['side'] - z / SCALE, 850 - y / SCALE
    def back_pick(x, y, z):
        return centres['back'] + x / SCALE, 850 - y / SCALE
    def top_pick(x, y, z):
        return TOP['centre'] + x / SCALE, TOP['crown'] + (HEIGHT - y) / SCALE

    specs = [
        ('front', front_pick, (0, 0, -1)),
        ('side', side_pick, (-1, 0, 0)),
        ('side-far', side_pick, (1, 0, 0)),
        ('back', back_pick, (0, 0, 1)),
        ('top', top_pick, (0, 1, 0)),
    ]
    views = []
    photos['side-far'] = photos['side']
    for name, pick, normal in specs:
        photo = photos[name]
        subject = studio_subject(photo)
        # Photo.sky assumes a pale sweep. Mrs Vane's white coat needs mid-grey,
        # so give View the measured flood-fill mask without its pale-only test.
        photo.sky = lambda _seeds, tolerance=20, grey=13, subject=subject: ~subject
        view = View(name, photo, frame_seeds(photo), pick, normal)
        views.append(view)
    collar = (850 - 150) * SCALE
    views[0].favour = lambda middle: 2.6 if middle[1] > collar else 1.0
    # Her profile would paint a second face beside the first, so the head's sides
    # wear the front and back photos' hair at their edges instead.
    for side_view in (views[1], views[2]):
        side_view.favour = lambda middle: .05 if middle[1] > collar else 1.0
    bled = set()
    for view in views:
        if id(view.photo) not in bled:
            view.photo.bleed(view.mask, passes=12)
            bled.add(id(view.photo))
    return views

def make_envelope(actor, front_view):
    # A tight four-corner trace from the front photo keeps the envelope a real slab.
    photo = front_view.photo
    loops = [[(99, 493), (126, 510), (112, 540), (94, 520)]]
    mesh = Mesh()
    def place(px, py, depth):
        return ((STANDING['front']['centre'] - px) * SCALE,
                (850 - py) * SCALE, depth)
    slab(mesh, 'front', photo, loops, place, -.13, -.145, wall_scale=.002)
    obj = mesh.finish('mrs-vane:envelope', {'front': photo.material(.9)})
    obj.parent = actor
    obj['piece'] = 'mrs-vane:envelope'
    return obj

def make_glove(actor, side, x):
    mat = bpy.data.materials.get('spotless white glove')
    if mat is None:
        mat = bpy.data.materials.new('spotless white glove')
        mat.diffuse_color = (.98, .975, .94, 1)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (.98, .975, .94, 1)
        bsdf.inputs['Roughness'].default_value = .92
        bsdf.inputs['Metallic'].default_value = 0
    # The four photographs differ slightly at the wrists. A small, joined-looking
    # mitten form fills those few pixels without changing the coat or adding a limb.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1,
                                         location=(x, 0, .79))
    obj = bpy.context.object
    obj.name = f'mrs-vane:glove-{side}'
    obj.scale = (.048, .105, .062)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = actor
    return obj

def make_materials(views):
    materials = {view.name: view.photo.material(.96) for view in views}
    for mat in materials.values():
        mat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0
    return materials

def read_glb(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length].decode('utf-8').rstrip('\0 '))

def exported_triangles(path, ident):
    gltf = read_glb(path)
    nodes = gltf.get('nodes', [])
    index = next(i for i, node in enumerate(nodes) if node.get('name') == ident)
    stack, descendants = [index], []
    while stack:
        node_index = stack.pop()
        descendants.append(node_index)
        stack.extend(nodes[node_index].get('children', []))
    return sum(gltf['accessors'][primitive['indices']]['count'] // 3
        for node_index in descendants if nodes[node_index].get('mesh') is not None
        for primitive in gltf['meshes'][nodes[node_index]['mesh']]['primitives'])

def build():
    views = make_views()
    materials = make_materials(views)
    front, side, side_far, back, top = views
    actor = bpy.data.objects.new('mrs-vane', None)
    scene.collection.objects.link(actor)
    actor['height_m'] = HEIGHT
    actor['hip_height_m'] = round(HIP_Y, 3)
    actor['shoulder_height_m'] = round(SHOULDER_Y, 3)
    actor['coat_hem_m'] = round(HEM_Y, 3)
    actor['photo_set'] = 'sea-mrs-vane-coat'
    actor['outfit'] = 'one closed spotless white coat-skirt; white gloves; pale envelope'

    body_bounds = ((-.43, .43), (0, HEIGHT), (-.38, .38))
    leg_bounds = ((-.31, .31), (0, HEM_Y + .045), (-.30, .30))
    tests = [view.covers for view in (front, side, back)]
    for label, bounds, keep, target in (
        ('upper', body_bounds, lambda x, y, z: y >= HEM_Y, 7000),
        ('leg-l', leg_bounds, lambda x, y, z: (y < HEM_Y + .02) & (x <= .012), 700),
        ('leg-r', leg_bounds, lambda x, y, z: (y < HEM_Y + .02) & (x >= -.012), 700),
    ):
        solid, xs, ys, zs = occupancy(bounds, VOXEL, tests, keep)
        if not solid.any():
            raise RuntimeError(f'mrs-vane:{label} photo masks do not overlap')
        solid = largest_part(solid)
        if not solid.any():
            raise RuntimeError(f'mrs-vane:{label} photo carve is empty')
        obj = carve_hull(f'mrs-vane:{label}', views, materials, solid, xs, ys, zs, VOXEL, target)
        obj['piece'] = label
        if label == 'upper':
            obj.parent = actor
        else:
            side_id = label[-1]
            pivot_x = -.095 if side_id == 'l' else .095
            pivot = bpy.data.objects.new(f'mrs-vane:{label}', None)
            scene.collection.objects.link(pivot)
            pivot.parent = actor
            pivot.location = (pivot_x, 0, HEM_Y)
            pivot['swing_axis'] = 'X'
            obj.location = (-pivot_x, 0, -HEM_Y)
            obj.parent = pivot

    make_envelope(actor, front)
    make_glove(actor, 'l', -.22)
    make_glove(actor, 'r', .22)
    bpy.context.view_layer.update()
    # Each foot's sole is checked against its front-photo centreline and ground line.
    # The measured shoe centres are x=199 and 245; the shared soles are y=850.
    for side, pixel_x in (('l', 245), ('r', 199)):
        label = f'leg-{side}'
        obj = next(obj for obj in actor.children_recursive
                   if obj.type == 'MESH' and obj.get('piece') == label)
        points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        sole = min(point.z for point in points)
        foot_x = sum(point.x for point in points) / len(points)
        expected_x = (STANDING['front']['centre'] - pixel_x) * SCALE
        if abs(sole) > .03 or abs(foot_x - expected_x) > .07:
            raise RuntimeError(f'{label} foot missed measured photo: x={foot_x:.3f}, ground={sole:.3f}')
        print(f'FOOT {label} world_x={foot_x:.3f} ground_z={sole:.3f} photo_x={expected_x:.3f}')
    for obj in actor.children_recursive:
        if obj.type == 'MESH':
            obj.data.calc_loop_triangles()
    count = sum(len(obj.data.loop_triangles) for obj in actor.children_recursive if obj.type == 'MESH')
    actor['triangle_count'] = count
    if count > 9000:
        raise RuntimeError(f'mrs-vane has {count} triangles, over 9000')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [actor, *actor.children_recursive]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = actor
    glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
        export_yup=True, export_apply=True, export_materials='EXPORT',
        export_image_format='JPEG', export_image_quality=88)
    triangles = exported_triangles(glb, 'mrs-vane')
    size = glb.stat().st_size
    if triangles > 9000 or size > 1_500_000:
        raise RuntimeError(f'export budget exceeded: {triangles} triangles, {size} bytes')
    print(json.dumps({'glb': str(glb), 'bytes': size, 'triangles': triangles,
                      'height_m': HEIGHT, 'hip_m': round(HIP_Y, 3), 'hem_m': round(HEM_Y, 3)}))
    return triangles

def look_render():
    """Render the exported GLB, then put the six shots on the round sheet."""
    if not render_dir:
        return
    render_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    world = bpy.data.worlds.new('even mid-grey studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.25, .25, .25, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
    scene.world = world
    bpy.ops.import_scene.gltf(filepath=str(glb))
    actor = next((obj for obj in scene.objects if obj.type == 'EMPTY' and obj.name == 'mrs-vane'), None)
    if actor is None:
        raise RuntimeError('exported GLB has no mrs-vane root')
    floor_mat = bpy.data.materials.new('flat neutral grey floor')
    floor_mat.diffuse_color = (.25, .25, .25, 1)
    floor_mat.use_nodes = True
    floor_nodes = floor_mat.node_tree.nodes
    floor_nodes.clear()
    emit = floor_nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (.25, .25, .25, 1)
    out = floor_nodes.new('ShaderNodeOutputMaterial')
    floor_mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    bpy.ops.mesh.primitive_plane_add(size=1000, location=(0, 0, -.015))
    floor = bpy.context.object
    floor.name = 'even grey ground'
    floor.data.materials.append(floor_mat)
    bpy.ops.object.light_add(type='AREA', location=(-3, 4, 5))
    light = bpy.context.object
    light.data.energy = 500
    light.data.shape = 'DISK'
    light.data.size = 5
    light.rotation_euler = (Vector((0, 0, .85)) - light.location).to_track_quat('-Z', 'Y').to_euler()

    def image_material(path, name):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        nodes.clear()
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = bpy.data.images.load(str(path), check_existing=True)
        emission = nodes.new('ShaderNodeEmission')
        output = nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color'])
        mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])
        return mat

    def camera_at(location, target, orthographic=None, lens=52):
        bpy.ops.object.camera_add(location=location)
        camera = bpy.context.object
        direction = (Vector(target) - camera.location).normalized()
        right = direction.cross(Vector((0, 0, 1))).normalized()
        if right.length < 1e-6:
            right = Vector((1, 0, 0))
        up = right.cross(direction).normalized()
        rotation = Matrix(((right.x, up.x, -direction.x),
                           (right.y, up.y, -direction.y),
                           (right.z, up.z, -direction.z)))
        camera.rotation_euler = rotation.to_quaternion().to_euler()
        camera.data.lens = lens
        if orthographic is not None:
            camera.data.type = 'ORTHO'
            camera.data.ortho_scale = orthographic
        scene.camera = camera
        return camera

    def under(obj, parent):
        while obj:
            if obj == parent:
                return True
            obj = obj.parent
        return False

    def image_plane(path, center, right, up, width, height, name):
        center = Vector(center)
        right, up = Vector(right), Vector(up)
        verts = [center-right*width/2-up*height/2, center+right*width/2-up*height/2,
                 center+right*width/2+up*height/2, center-right*width/2+up*height/2]
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        uv = mesh.uv_layers.new(name='UVMap')
        for loop, coord in zip(uv.data, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop.uv = coord
        obj.data.materials.append(image_material(path, name + ' picture'))
        return obj

    def render_pair(name, photo_name, location, target):
        for obj in scene.objects:
            if obj.type == 'MESH' and obj != floor:
                obj.hide_render = True
        for obj in actor.children_recursive:
            if obj.type == 'MESH':
                obj.hide_render = False
        camera = camera_at(location, target, orthographic=3.0)
        camera_right = camera.rotation_euler.to_matrix() @ Vector((1, 0, 0))
        camera_up = camera.rotation_euler.to_matrix() @ Vector((0, 1, 0))
        direction = camera.rotation_euler.to_matrix() @ Vector((0, 0, -1))
        photo_path = textures / f'sea-mrs-vane-coat-{photo_name}.jpg'
        image_plane(photo_path, Vector(target)-camera_right*1.0+direction*.1,
                    camera_right, camera_up, .82, 1.65, f'{photo_name} measured photo')
        actor.location = camera_right*.95
        scene.render.resolution_x = 1200
        scene.render.resolution_y = 750
        scene.render.filepath = str(render_dir / f'{photo_name}-pair.png')
        bpy.ops.render.render(write_still=True)
        actor.location = (0, 0, 0)
        bpy.data.objects.remove(camera, do_unlink=True)

    render_pair('front-pair', 'front', (0, 5, .83), (0, 0, .83))
    render_pair('side-pair', 'side', (-5, 0, .83), (0, 0, .83))
    render_pair('back-pair', 'back', (0, -5, .83), (0, 0, .83))

    # Close facial read from the exported model, with no reference model in scene.
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = obj != floor and not under(obj, actor)
    camera = camera_at((0, 1.12, 1.42), (0, 0, 1.40), orthographic=.72)
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 750
    scene.render.filepath = str(render_dir / 'face-close.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)

    # A three-quarter road-height view, six metres from her, with nothing else in front.
    for obj in scene.objects:
        if obj.type == 'MESH' and obj != floor:
            obj.hide_render = not under(obj, actor)
    camera = camera_at((-3.2, 5.0, .78), (0, 0, .82), lens=52)
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 750
    scene.render.filepath = str(render_dir / 'three-quarter-car-height-6m.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)

    # Import one real town walker for scale; hide every other imported person.
    crew_path = root / 'public/assets/models/wasteland/town/walkers.glb'
    bpy.ops.import_scene.gltf(filepath=str(crew_path))
    crew = next((obj for obj in scene.objects if obj.type == 'EMPTY' and obj.name in ('walker-a', 'walker-vane')), None)
    if crew is None:
        raise RuntimeError('walkers.glb has no adult walker root for the size shot')
    right = Vector((1, 0, 0))
    actor.location = -right*.52
    crew.matrix_world.translation += right*1.1
    for obj in scene.objects:
        if obj.type == 'MESH' and obj != floor:
            obj.hide_render = not (under(obj, actor) or under(obj, crew))
    camera = camera_at((0, 5, .85), (0, 0, .85), orthographic=3.2)
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 750
    scene.render.filepath = str(render_dir / 'crew-size.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)

    print(json.dumps({'review_shots': ['front-pair', 'side-pair', 'back-pair', 'face-close',
                                      'three-quarter-car-height-6m', 'crew-size'],
                      'render_dir': str(render_dir)}))

build()
look_render()
