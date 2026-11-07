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
import numpy as np
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



# Cable and oversized round roof magnet. The boom tip is 16 m from its pin at 50 degrees.
tip_y = 5.2 + 16 * math.sin(math.radians(50))
tip_z = LENGTH/2-.45 + 16 * math.cos(math.radians(50))
magnet_game = (0, tip_y-3.5, tip_z+.12)
beam_between('magnus-crane:cable', (0,tip_y,tip_z), (0,magnet_game[1]+.40,magnet_game[2]), .055, cable_mat, crane)
magnet = bpy.data.objects.new('magnus-crane:magnet', None)
magnet.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(magnet)
magnet.parent = crane
magnet.location = game_to_blender(magnet_game)
magnet['part'] = 'magnus-crane:magnet'

def magnet_cylinder(name, radius, depth, local_z, material, sides=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth, location=(0,0,local_z))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = magnet
    obj['part'] = name
    return obj
magnet_cylinder('magnus-crane:magnet-shell', 1.5, .62, 0, paint, 48)
magnet_cylinder('magnus-crane:magnet-rim', 1.48, .11, -.34, steel, 48)
magnet_cylinder('magnus-crane:magnet-pole', 1.29, .08, -.405, glow, 48)
for index, radius in enumerate((1.37,1.20,1.03),1):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=.045, major_segments=40, minor_segments=8, location=(0,0,.33))
    obj = bpy.context.object
    obj.name = f'magnus-crane:magnet-coil-{index}'
    obj.data.materials.append(copper)
    obj.parent = magnet
    obj['part'] = obj.name
for hand in (-1,1):
    beam_between(f'magnus-crane:magnet-lift-eye-{hand}', (hand*.95,.40,0), (hand*.55,.40,0), .055, iron, magnet)

# A thin corrugated roof slab with three real nail holes. The prototype's top edge
# midpoint is its origin; six instances share the same mesh and sit at odd angles.
roof_photo = Photo(textures / 'peace-magnus-crane-roof.jpg')
rx0, ry0, rx1, ry1 = 160, 18, 1380, 1010
roof_mask = np.zeros((roof_photo.h, roof_photo.w), dtype=bool)
roof_mask[ry0:ry1, rx0:rx1] = True
yy, xx = np.ogrid[:roof_photo.h, :roof_photo.w]
for cx, cy, radius in ((260,470,11),(760,930,11),(1290,500,10)):
    roof_mask &= (xx-cx)**2 + (yy-cy)**2 >= radius**2
roof_loops = trace(roof_mask, (rx0-2,ry0-2,rx1+2,ry1+2), tolerance=1.5, min_area=20)
SHEET_SCALE = 2.4/(rx1-rx0)
def sheet_world(px, py, depth):
    return ((px-(rx0+rx1)/2)*SHEET_SCALE, -(py-ry0)*SHEET_SCALE, depth)
roof_mesh = Mesh()
slab(roof_mesh, 'tin', roof_photo, roof_loops, sheet_world, -.018, .018, wall_scale=SHEET_SCALE)
tin = roof_photo.material(.9)
tin.name = 'magnus-roof-tin'
loose_root = bpy.data.objects.new('magnus-roof', None)
loose_root.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(loose_root)
loose_sheet = roof_mesh.finish('magnus-roof:sheet', {'tin': tin})
loose_sheet['part'] = 'magnus-roof:sheet'
loose_sheet.parent = loose_root
loose_sheet['pivot'] = 'midpoint of top edge'
for index, (offset, rotation) in enumerate((((-.9,-.35,-.1),(.3,.2,.5)),((.85,-.6,.15),(-.2,.4,-.7)),
    ((-1.1,.45,.2),(.7,-.3,1.0)),((1.05,.35,-.2),(-.5,.1,.3)),((0,-.8,.25),(.2,.6,1.4)),((.2,.7,-.3),(-.8,.2,-.4))),1):
    obj = bpy.data.objects.new(f'magnus-crane:stuck-roof-{index}', roof_mesh.finish(
        f'magnus-crane:stuck-roof-{index}', {'tin':tin}).data)
    bpy.context.collection.objects.link(obj)
    obj.parent = crane
    obj.location = game_to_blender(tuple(magnet_game[i]+offset[i] for i in range(3)))
    obj.rotation_euler = (rotation[0], rotation[2], rotation[1])
    obj['part'] = obj.name


out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=False, export_cameras=False,
                          export_lights=False, export_image_format='AUTO')
print('peace-crane body dimensions:', LENGTH, WIDTH, HEIGHT)
print('peace-crane glb bytes:', out.stat().st_size)
print('peace-crane triangle estimate:', sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
