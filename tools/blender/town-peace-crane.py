"""Photo-carved Magnus crane base for WW-ART-PEACE."""
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
out = root / 'public/assets/models/wasteland/town/peace-crane.glb'
blend = root / 'art-build/town-peace-crane.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
sys.path.insert(0, str(root / 'tools/blender'))
from photo_carve import carve_object

textures = root / 'public/assets/models/wasteland/town/textures'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'

# Photo-grid measurements in source pixels. Tracks touch the floor at side y=850.
# The cab door is 274 px high and 1.9 m: side scale = 0.006934 m/px.
# Side body runs x=65..1705 (11.38 m); side cab shell is about 500 px high.
# The same cab-shell height is 510 px in front and 526 px at rear; end scales
# use the side scale times each measured height ratio. Front ground is y=1010,
# rear ground y=1000. Overhead body extent is y=70..1450 and x=170..880.
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
    'side': {'start': 65, 'end': 1705, 'ground': 850},
    'front': {'centre': 760, 'ground': 1010, 'scale': FRONT_SCALE},
    'rear': {'centre': 770, 'ground': 1000, 'scale': REAR_SCALE},
    'top': {'front': 70, 'rear': 1450, 'centre': 512},
    'forward': -1, 'side_front_on_left': False,
    # Open pale patches between crawler tracks are background, not chassis.
    'cut': {'front': [(430, 760, 1010, 1010)], 'rear': [(390, 760, 1040, 1000)]},
    'grey': 20, 'tolerance': 34, 'bleed_tolerance': 32,
    'voxel': .075, 'target': 9500,
    'mask_dir': str(root / '.evidence/2026-11-07/WW-ART-PEACE/masks'),
}
crane = bpy.data.objects.new('magnus-crane', None)
crane.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(crane)
# The photo table describes one integrated body volume. The kit returns one mesh,
# so the upper house and crawler tracks remain one piece rather than fake pivots.
body = carve_object('magnus-crane:body', textures, body_table)
body.parent = crane
body['part'] = 'magnus-crane:body'
body['cab_door_height_m'] = 1.9
body['table_length_m'] = LENGTH
body['table_width_m'] = WIDTH


from mathutils import Vector
from photo_model import Mesh, Photo, slab, trace

side_photo = body_table['_photos']['side']
paint = side_photo.material(.92)
paint.name = 'magnus-magnet-paint'
def plain(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat
steel = plain('magnus-magnet-steel', (.15, .155, .16), .34, .75)
iron = plain('magnus-magnet-iron', (.045, .036, .03), .62, .72)
cable_mat = plain('magnus-magnet-cable', (.012, .012, .013), 0, .9)
copper = plain('magnus-magnet-copper', (.55, .22, .08), .85, .42)
glow = plain('magnus-magnet-glow', (.028, .034, .046), .5, .42)
glow.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0

def game_to_blender(point):
    return Vector((point[0], -point[2], point[1]))

def beam_between(name, a, b, radius, material, parent_obj):
    start, end = game_to_blender(a), game_to_blender(b)
    delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=delta.length, location=(start+end)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = delta.to_track_quat('Z', 'Y')
    obj.data.materials.append(material)
    obj.parent = parent_obj
    obj['part'] = name
    return obj

# Trace both open side frames from the measured side-on boom photo. Explicit pale
# seeds preserve every enclosed lattice bay as a hole in the mask.
boom_photo = Photo(textures / 'peace-magnus-crane-boom.jpg')
boom_seeds = [(8, 8), (boom_photo.w-9, 8), (8, boom_photo.h-9), (boom_photo.w-9, boom_photo.h-9)]
rgb = boom_photo.rgb()
spread = rgb.max(axis=2)-rgb.min(axis=2)
boom_seeds += [(x,y) for y in range(250,470,32) for x in range(50,2120,48)
               if rgb[y,x].mean()>200 and spread[y,x]<20]
boom_solid = ~boom_photo.sky(boom_seeds, tolerance=34, grey=20)
boom_loops = trace(boom_solid, (20, 150, boom_photo.w-20, 455), tolerance=2.5, min_area=28)
if not boom_loops:
    raise RuntimeError('No lattice boom outlines found in boom photo')
boom_root = bpy.data.objects.new('magnus-crane:boom', None)
boom_root.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(boom_root)
boom_root.parent = crane
boom_root.location = game_to_blender((0, 5.2, LENGTH/2-.45))
boom_root.rotation_euler[0] = math.radians(-50)
boom_root['part'] = 'magnus-crane:boom'
BOOM_SCALE = 16 / (2142 - 29)
BOOM_CY = (166 + 438) / 2

def boom_world(px, py, depth):
    return (depth, (BOOM_CY-py)*BOOM_SCALE, (px-29)*BOOM_SCALE)
for hand, label in ((-.5, 'near'), (.5, 'far')):
    mesh = Mesh()
    slab(mesh, 'paint', boom_photo, boom_loops, boom_world, hand-.022, hand+.022, wall_scale=BOOM_SCALE)
    frame = mesh.finish(f'magnus-crane:boom-frame-{label}', {'paint': paint})
    frame.parent = boom_root
    frame['part'] = f'magnus-crane:boom-frame-{label}'
for index, px in enumerate((430, 900, 1370, 1840), 1):
    for py, chord in ((190, 'upper'), (425, 'lower')):
        _, y, z = boom_world(px, py, 0)
        beam_between(f'magnus-crane:boom-cross-{index}-{chord}', (-.5,y,z), (.5,y,z), .045, steel, boom_root)


out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=False, export_cameras=False,
                          export_lights=False, export_image_format='AUTO')
print('peace-crane body dimensions:', LENGTH, WIDTH, HEIGHT)
print('peace-crane glb bytes:', out.stat().st_size)
