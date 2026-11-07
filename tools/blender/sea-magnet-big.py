"""Second, dangerously overloaded Magnus crane for the Scablands harbour."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/sea-magnet-big.glb'
blend = root / 'art-build/sea-magnet-big.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
import numpy as np
sys.path.insert(0, str(root / 'tools/blender'))
from photo_carve import carve_object

textures = root / 'public/assets/models/wasteland/town/textures'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'

def game_to_blender(point):
    return Vector((point[0], -point[2], point[1]))

if args.render_only:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.render.resolution_x = 800
    scene.render.resolution_y = 450
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    world = bpy.data.worlds.new('pale overcast studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.72, .72, .72, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
    scene.world = world
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.02))
    floor = bpy.context.object
    floor.name = 'plain pale ground'
    floor_mat = bpy.data.materials.new('pale grey ground')
    floor_mat.diffuse_color = (.62, .62, .62, 1)
    floor.data.materials.append(floor_mat)
    for location, energy, size in (((18, -15, 32), 6500, 20), ((-22, -7, 20), 3500, 18), ((0, 18, 26), 2400, 16)):
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (game_to_blender((0, 6, -10)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    render_dir = root / '.evidence/2026-11-07/WW-ART-SEA/round-8'
    render_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.import_scene.gltf(filepath=str(out))
    def camera_at(location, target, lens=34):
        bpy.ops.object.camera_add(location=game_to_blender(location))
        cam = bpy.context.object
        cam.data.lens = lens
        cam.rotation_euler = (game_to_blender(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = cam
        return cam
    cam = camera_at((45, 1.6, -10), (0, 12, -10), lens=25)
    scene.render.filepath = str(render_dir / 'whole-east.png')
    bpy.ops.render.render(write_still=True)
    cam.location = game_to_blender((-45, 1.6, -10))
    cam.rotation_euler = (game_to_blender((0, 12, -10)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(render_dir / 'whole-west.png')
    bpy.ops.render.render(write_still=True)
    cam.location = game_to_blender((12, 5.5, -6))
    cam.data.lens = 48
    cam.rotation_euler = (game_to_blender((0, 2.5, -4)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(render_dir / 'props-tracks.png')
    bpy.ops.render.render(write_still=True)
    # The original peace crane is imported for this comparison view only.
    before_comparison = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/wasteland/town/peace-crane.glb'))
    comparison_objects = set(scene.objects) - before_comparison
    comparison_root = next(obj for obj in comparison_objects if obj.name == 'magnus-crane')
    comparison_root.location.x = 12
    def belongs_to_comparison_crane(obj):
        cursor = obj
        while cursor is not None:
            if cursor is comparison_root:
                return True
            cursor = cursor.parent
        return False
    for obj in comparison_objects:
        if not belongs_to_comparison_crane(obj) or 'stuck-roof' in obj.name:
            obj.hide_render = True
    cam.location = game_to_blender((32, 16, -41))
    cam.data.lens = 15.5
    cam.rotation_euler = (game_to_blender((6, 10, -10)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(render_dir / 'scale-comparison.png')
    bpy.ops.render.render(write_still=True)
    raise SystemExit(0)

# Reuse the exact four reference photos and the measured carving table from the
# passed peace crane. The body is moved 0.3 m below grade after carving.
LENGTH = (1705 - 65) * (1.9 / 274)
SIDE_SCALE = 1.9 / 274
FRONT_SCALE = SIDE_SCALE * 500 / 510
REAR_SCALE = SIDE_SCALE * 500 / 526
WIDTH = (1278 - 145) * FRONT_SCALE
HEIGHT = 6.7
body_table = {
    'photos': {'side': 'peace-magnus-crane-side.jpg', 'front': 'peace-magnus-crane-front.jpg',
               'rear': 'peace-magnus-crane-rear.jpg', 'top': 'peace-magnus-crane-top.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': 1705, 'end': 65, 'ground': 850},
    'front': {'centre': 760, 'ground': 1010, 'scale': FRONT_SCALE},
    'rear': {'centre': 770, 'ground': 1000, 'scale': REAR_SCALE},
    'top': {'front': 70, 'rear': 1450, 'centre': 512},
    'forward': -1, 'side_front_on_left': False,
    'cut': {'front': [(430, 760, 1010, 1010)], 'rear': [(390, 760, 1040, 1000)]},
    'grey': 20, 'tolerance': 34, 'bleed_tolerance': 32,
    'voxel': .075, 'target': 9500,
    'mask_dir': str(root / '.evidence/2026-11-07/WW-ART-SEA/masks'),
}
crane = bpy.data.objects.new('magnus-magnet-big', None)
crane.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(crane)
body = carve_object('magnus-magnet-big:body', textures, body_table)
body.parent = crane
body.location.z = -.3
body['part'] = 'magnus-magnet-big:body'
body['tracks_sunk_m'] = .3

def plain(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

steel = plain('overloaded crane steel', (.12, .115, .10), .48, .86)
cable_mat = plain('bar-taut dark cable', (.025, .022, .018), .12, .82)
rust = plain('dark magnet rust', (.105, .055, .032), .28, .94)
magnet_iron = plain('magnet pole dark iron', (.035, .032, .028), .48, .82)
coil_rust = plain('dark oxidized magnet coil', (.19, .075, .035), .45, .82)

def beam_between(name, a, b, radius, material, parent_obj, vertices=10):
    start, end = game_to_blender(a), game_to_blender(b)
    delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=delta.length,
                                        location=(start + end) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = delta.to_track_quat('Z', 'Y')
    obj.data.materials.append(material)
    obj.parent = parent_obj
    obj['part'] = name
    return obj

from photo_model import Mesh, Photo, slab, trace
boom_photo = Photo(textures / 'peace-magnus-crane-boom.jpg')
boom_seeds = [(8, 8), (boom_photo.w-9, 8), (8, boom_photo.h-9), (boom_photo.w-9, boom_photo.h-9)]
rgb = boom_photo.rgb()
spread = rgb.max(axis=2) - rgb.min(axis=2)
boom_seeds += [(x, y) for y in range(250, 470, 32) for x in range(50, 2120, 48)
               if rgb[y, x].mean() > 200 and spread[y, x] < 20]
boom_solid = ~boom_photo.sky(boom_seeds, tolerance=34, grey=20)
boom_loops = trace(boom_solid, (20, 150, boom_photo.w-20, 455), tolerance=2.5, min_area=28)
if not boom_loops:
    raise RuntimeError('No lattice boom outlines found in peace crane reference')
boom_root = bpy.data.objects.new('magnus-magnet-big:boom', None)
boom_root.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(boom_root)
boom_root.parent = crane
BOOM_PIN_Y, BOOM_PIN_Z, BOOM_LENGTH, BOOM_ANGLE = 3.0, -LENGTH/2 + .9, 26.0, 60.0
boom_root.location = game_to_blender((0, BOOM_PIN_Y, BOOM_PIN_Z))
boom_root.rotation_euler = (math.radians(-BOOM_ANGLE), 0, math.pi)
boom_root['part'] = 'magnus-magnet-big:boom'
boom_root['length_m'] = BOOM_LENGTH
boom_root['angle_degrees'] = BOOM_ANGLE
boom_root['boom_spacing_m'] = 1.44
BOOM_SCALE = BOOM_LENGTH / (2142 - 29)
BOOM_CY = (166 + 438) / 2

def boom_world(px, py, depth):
    return (depth, (BOOM_CY - py) * BOOM_SCALE, (px - 29) * BOOM_SCALE)

for hand, depth, label in ((-1, -.72, 'near'), (1, .72, 'far')):
    mesh = Mesh()
    slab(mesh, 'picture', boom_photo, boom_loops, boom_world, depth-.025, depth+.025, wall_scale=BOOM_SCALE)
    frame = mesh.finish(f'magnus-magnet-big:boom-frame-{label}', {'picture': boom_photo.material(.92)})
    frame.parent = boom_root
    frame['part'] = f'magnus-magnet-big:boom-frame-{label}'
for index, px in enumerate((430, 900, 1370, 1840), 1):
    for py, chord in ((190, 'upper'), (425, 'lower')):
        _, y, z = boom_world(px, py, 0)
        beam_between(f'magnus-magnet-big:boom-cross-{index}-{chord}', (-.72, y, z), (.72, y, z), .07, steel, boom_root)

# Side-on generated prop photographs are traced as real thin slabs. Their
# backgrounds stay out of the silhouettes; repeat the photographs only by
# instancing the finished meshes at measured supports.
def traced_photo_part(photo_name, photo_path, rect, tolerance=34, minimum=90):
    photo = Photo(photo_path)
    seeds = [(8, 8), (photo.w-9, 8), (8, photo.h-9), (photo.w-9, photo.h-9)]
    seeds += [(x, 8) for x in range(80, photo.w-8, 120)]
    seeds += [(x, photo.h-9) for x in range(80, photo.w-8, 120)]
    seeds += [(8, y) for y in range(80, photo.h-8, 120)]
    seeds += [(photo.w-9, y) for y in range(80, photo.h-8, 120)]
    solid = ~photo.sky(seeds, tolerance=tolerance, grey=36)
    # The floor shadow is not part of either traced prop.
    solid[int(photo.h*.965):, :] = False
    loops = trace(solid, rect, tolerance=2.8, min_area=minimum)
    if not loops:
        raise RuntimeError(f'{photo_name}: no silhouette traced; inspect the generated photo mask')
    return photo, loops

timber_photo, timber_loops = traced_photo_part(
    'timber', root/'public/assets/models/wasteland/scablands/textures/sea-magnet-big-timber.jpg',
    (28, 35, 1420, 1060), tolerance=38, minimum=120)
timber_scale = 3.0 / (1390 - 54)
def timber_world(px, py, depth):
    return (depth, (1040-py)*timber_scale, -(px-724)*timber_scale)

timber_mesh = Mesh()
slab(timber_mesh, 'photo', timber_photo, timber_loops, timber_world, -.36, .36, wall_scale=timber_scale)
timber_object = timber_mesh.finish('magnus-magnet-big:timber-packing', {'photo': timber_photo.material(.94)})
timber_object['part'] = 'magnus-magnet-big:timber-packing'
for index, x in enumerate((-1.62, 1.62), 1):
    copy = bpy.data.objects.new(f'magnus-magnet-big:timber-stack-{index}', timber_object.data)
    bpy.context.collection.objects.link(copy)
    copy.parent = crane
    copy.location = game_to_blender((x, 0, -LENGTH/2 + 2.0))
    copy['part'] = copy.name
bpy.data.objects.remove(timber_object, do_unlink=True)

prop_photo, prop_loops = traced_photo_part(
    'steel prop', root/'public/assets/models/wasteland/scablands/textures/sea-magnet-big-prop.jpg',
    (18, 20, 1525, 1005), tolerance=34, minimum=100)
def prop_world(px, py, depth):
    # The image's diagonal runs from a foot beyond the track to an inboard
    # upper saddle. Its face points toward the crane's side camera.
    return (depth, (1000-py)*(5.2/(1000-40)), -1.55 + (px-42)*(3.1/(1500-42)))

prop_mesh = Mesh()
slab(prop_mesh, 'photo', prop_photo, prop_loops, prop_world, -.055, .055, wall_scale=.004)
prop_template = prop_mesh.finish('magnus-magnet-big:steel-prop', {'photo': prop_photo.material(.88)})
for side in (-1, 1):
    for index, (z, mirror) in enumerate(((-4.5, 1), (4.5, -1)), 1):
        prop = bpy.data.objects.new(f'magnus-magnet-big:raking-prop-{side}-{index}', prop_template.data)
        bpy.context.collection.objects.link(prop)
        prop.parent = crane
        prop.location = game_to_blender((side*4.0, 0, z))
        prop.scale.z = mirror
        prop['part'] = prop.name
        prop['foot'] = 'ground outside track'
        prop['head'] = 'upper crawler frame'
bpy.data.objects.remove(prop_template, do_unlink=True)

tip_y = BOOM_PIN_Y + BOOM_LENGTH * math.sin(math.radians(BOOM_ANGLE))
tip_z = BOOM_PIN_Z - BOOM_LENGTH * math.cos(math.radians(BOOM_ANGLE))
magnet_y, magnet_z = 2.0 + 1.1, tip_z
cable_root = bpy.data.objects.new('magnus-magnet-big:cable', None)
cable_root.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(cable_root)
cable_root.parent = crane
cable_root['part'] = 'magnus-magnet-big:cable'
magnet_root = bpy.data.objects.new('magnus-magnet-big:magnet', None)
magnet_root.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(magnet_root)
magnet_root.parent = crane
magnet_root.location = game_to_blender((0, magnet_y, magnet_z))
magnet_root['part'] = 'magnus-magnet-big:magnet'
magnet_root['diameter_m'] = 7.0
magnet_root['depth_m'] = 2.2
for hand in (-1, 1):
    for side in (-1, 1):
        anchor = (hand*.70, tip_y, tip_z)
        rim = (side*3.15, magnet_y + 1.1, magnet_z)
        beam_between(f'magnus-magnet-big:cable-{hand}-{side}', anchor, rim, .09, cable_mat, cable_root, vertices=8)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=3.5, depth=2.2, location=(0, 0, 0))
shell = bpy.context.object
shell.name = 'magnus-magnet-big:magnet-shell'
shell.data.materials.append(rust)
shell.parent = magnet_root
shell['part'] = shell.name
bpy.ops.mesh.primitive_torus_add(major_radius=3.4, minor_radius=.16, major_segments=48, minor_segments=8, location=(0, 0, -1.05))
rim = bpy.context.object
rim.name = 'magnus-magnet-big:magnet-rim'
rim.data.materials.append(steel)
rim.parent = magnet_root
for index, radius in enumerate((1.18, 2.02, 2.78, 3.27), 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=.075,
                                     major_segments=48, minor_segments=8, location=(0, 0, -1.13))
    coil = bpy.context.object
    coil.name = f'magnus-magnet-big:magnet-pole-coil-{index}'
    coil.data.materials.append(coil_rust)
    coil.parent = magnet_root
    coil['part'] = coil.name
for index, local_z in enumerate((-.67, 0, .67), 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=3.49, minor_radius=.09,
                                     major_segments=24, minor_segments=4, location=(0, 0, local_z))
    band = bpy.context.object
    band.name = f'magnus-magnet-big:magnet-side-band-{index}'
    band.data.materials.append(coil_rust)
    band.parent = magnet_root
    band['part'] = band.name
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=.86, depth=.12, location=(0, 0, -1.16))
pole = bpy.context.object
pole.name = 'magnus-magnet-big:magnet-pole-face'
pole.data.materials.append(magnet_iron)
pole.parent = magnet_root
pole['part'] = pole.name
for index in range(12):
    angle = math.tau * index / 12
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.105, depth=.14,
                                        location=(3.26*math.cos(angle), 3.26*math.sin(angle), -1.15))
    bolt = bpy.context.object
    bolt.name = f'magnus-magnet-big:magnet-rim-bolt-{index+1}'
    bolt.data.materials.append(magnet_iron)
    bolt.parent = magnet_root

crane.rotation_euler = (math.radians(-3), 0, 0)
crane['lean_degrees'] = 3

out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=False, export_cameras=False,
                          export_lights=False, export_image_format='AUTO')
print('sea-magnet-big glb bytes:', out.stat().st_size)
print('sea-magnet-big triangle estimate:', sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
