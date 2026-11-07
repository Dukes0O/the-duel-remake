"""Build the mirage caravan as the first piece in the separate peace-camp asset."""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.evidence/2026-11-06/WW-ART-PEACE/round-8')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/town/peace-camp.glb'
blend = root / 'art-build/town-peace-camp.blend'
render = Path(args.render_dir)
render = render if render.is_absolute() else root / render
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)], 'summary': str(root / 'docs/board/looks/ww-art-peace/round-8.jpg')}))
    raise SystemExit(0)

import bpy
import math
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_carve import carve_object
from hull_model import tyre
from photo_model import Mesh, Photo, slab, trace

textures = root / 'public/assets/models/wasteland/town/textures'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)

# Pixel measurements read from the four photo_grid overlays. The caravan's front
# is the left end of the side photo. Its lower body seam is the ground reference;
# wheels and the hitch are separate parts and are excluded from the masks.
# Side: ground row 406; body sill row 390; body ends x=130 and x=737; roof row 17. Wheel centre
# (464,372), radius 34. Hitch ends x=8; visible window corners (420,90) to
# (690,231). The door runs y=62..361 (299 px), set to 1.9 m, giving 0.006355 m/px.
# Front: ground row 394, roof row 17, centre x=408; body corners x=230..585.
# The side body is 389 px high (row 17 to 406), and the front is 377 px high
# (row 17 to 394): the end scale is 389/377 = 1.032 times the side scale.
# Measured end widths are 355 px (front) and 387 px (rear); their mean at the
# side scale sets the model width to 2.36 m.
# Rear: ground row 400, roof row 16, centre x=378; body corners x=185..572.
# End width is 387 px. Its 384 px body height gives 389/384 = 1.013 times
# the side scale.
# Overhead: front body end x=354, rear body end x=866, centre row y=253.
# The hitch reaches x=213; the door/window opening spans x=564..642, y=188..273.
SIDE = {'start': 130, 'end': 737, 'ground': 406, 'body_sill': 390, 'roof': 17,
        'wheel': (464, 372, 34), 'window': (420, 90, 690, 231), 'hitch_end': 8}
FRONT = {'centre': 408, 'ground': 394, 'top': 17, 'left': 230, 'right': 585}
REAR = {'centre': 378, 'ground': 400, 'top': 16, 'left': 185, 'right': 572}
OVERHEAD = {'front': 354, 'rear': 866, 'centre': 253, 'hitch_end': 213}
DOOR_HEIGHT = 1.9
SCALE = DOOR_HEIGHT / (361 - 62)
LENGTH = (SIDE['end'] - SIDE['start']) * SCALE
HEIGHT = (SIDE['ground'] - SIDE['roof']) * SCALE
WIDTH = ((FRONT['right'] - FRONT['left']) + (REAR['right'] - REAR['left'])) / 2 * SCALE
table = {
    'photos': {'side': 'peace-mirage-caravan-side.jpg', 'front': 'peace-mirage-caravan-front.jpg',
               'rear': 'peace-mirage-caravan-rear.jpg', 'top': 'peace-mirage-caravan-overhead.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': SIDE['start'], 'end': SIDE['end'], 'ground': SIDE['ground']},
    'front': {'centre': FRONT['centre'], 'ground': FRONT['ground'], 'top': FRONT['top']},
    'rear': {'centre': REAR['centre'], 'ground': REAR['ground'], 'top': REAR['top']},
    'top': {'front': OVERHEAD['front'], 'rear': OVERHEAD['rear'], 'centre': OVERHEAD['centre'],
            'along': 'x', 'x_scale': WIDTH / (434 - 66)},
    'cut': {'side': [(0, 334, 130, 474)],
            'front': [(230, 369, 320, 474), (495, 369, 585, 474), (378, 391, 438, 510)],
            'rear': [(220, 375, 305, 490), (450, 375, 540, 490)],
            'top': [(205, 180, 372, 286)]},
    'wheels': [(-LENGTH / 2 + (SIDE['wheel'][0] - SIDE['start']) * SCALE,
                SIDE['wheel'][2] * SCALE, WIDTH / 2 - .16)],
    'underside': .24, 'grey': 26, 'tolerance': 38, 'bleed_tolerance': 48,
    'voxel': .035, 'target': 7500,
    'mask_dir': str(render / 'masks'),
}

# This root and export establish the new asset file before its measured parts are added.
caravan = bpy.data.objects.new('mirage-caravan', None)
bpy.context.collection.objects.link(caravan)
caravan.empty_display_type = 'CUBE'
body = carve_object('mirage-caravan:body', textures, table)
body.parent = caravan

# One measured axle, square to the caravan. The side faces and tread both use
# their own photograph coordinates; the axle ends stop inside the tyre faces.
side_photo = table['_photos']['side']
front_photo = table['_photos']['front']
rear_photo = table['_photos']['rear']
axle_z = table['wheels'][0][0]
wheel_radius = SIDE['wheel'][2] * SCALE
wheel_y = wheel_radius
for side, hand in (('road', -1), ('far', 1)):
    wheel_mesh = Mesh()
    end_photo, end_cx, half_px, y0, y1 = (front_photo, 273, 26, 402, 444) if hand < 0 else (rear_photo, 267, 26, 403, 445)
    tyre(wheel_mesh, 'side', side_photo, *SIDE['wheel'], wheel_radius, .105,
         'tread', end_photo, end_cx, half_px, y0, y1)
    wheel = wheel_mesh.finish(f'mirage-caravan:wheel-{side}',
                              {'side': side_photo.material(), 'tread': end_photo.material()})
    wheel.parent = caravan
    wheel.location = (hand * (WIDTH / 2 - .105), -axle_z, wheel_y)

# Trace the A-frame tongue from the overhead photo. Its raised end meets the
# caravan; the narrow nose reaches the jockey wheel seen ahead of the body.
over_photo = Photo(textures / 'peace-mirage-caravan-overhead.jpg')
hitch_mask = np.zeros((over_photo.h, over_photo.w), dtype=bool)
hitch_polygon = [(214, 231), (343, 192), (379, 194), (379, 213), (340, 210), (220, 247)]
for row in range(192, 248):
    intersections = []
    for a, b in zip(hitch_polygon, hitch_polygon[1:] + hitch_polygon[:1]):
        if (a[1] <= row < b[1]) or (b[1] <= row < a[1]):
            intersections.append(a[0] + (row - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
    intersections.sort()
    for left, right in zip(intersections[0::2], intersections[1::2]):
        hitch_mask[row, max(0, int(left)):min(over_photo.w, int(right) + 1)] = True
hitch_loops = trace(hitch_mask, (205, 180, 390, 258), min_area=8)
top_x_scale = WIDTH / (434 - 66)
top_length_scale = LENGTH / (OVERHEAD['rear'] - OVERHEAD['front'])
def hitch_world(px, py, depth):
    x = (py - OVERHEAD['centre']) * top_x_scale
    z = -LENGTH / 2 + (px - OVERHEAD['front']) * top_length_scale
    return (x, .19 + depth, z)

hitch_mesh = Mesh()
slab(hitch_mesh, 'steel', over_photo, hitch_loops, hitch_world, -.035, .035,
     wall_scale=top_x_scale)
hitch = hitch_mesh.finish('mirage-caravan:traced-tow-bar', {'steel': over_photo.material()})
hitch.parent = caravan

def plain_material(name, color, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = min(metallic, .3)
    shader.inputs['Roughness'].default_value = .9
    return mat

rubber = plain_material('jockey wheel rubber', (.035, .033, .03))
dummy_paint = plain_material('dummy painted wood', (.62, .43, .24))
hat_paint = plain_material('dummy broad straw hat', (.31, .22, .13))

# Jockey wheel and fork hold the traced tongue at the height shown in the photo.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, LENGTH / 2 + .04, .17))
stand = bpy.context.object
stand.name = 'mirage-caravan:jockey-stand'
stand.scale = (.045, .045, .22)
stand.data.materials.append(rubber)
stand.parent = caravan
bpy.ops.mesh.primitive_torus_add(major_radius=.105, minor_radius=.025, major_segments=24,
                                 minor_segments=8, location=(0, LENGTH / 2 + .13, .105),
                                 rotation=(0, math.pi / 2, 0))
jockey = bpy.context.object
jockey.name = 'mirage-caravan:jockey-tyre'
jockey.data.materials.append(rubber)
jockey.parent = caravan

# A slumped wooden dummy sits just inside the road-side window. Its broad hat,
# painted face and jointed shoulders make the trick legible at close range.
def uv_sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    obj.parent = caravan
    return obj

dummy_z = -LENGTH / 2 + (560 - SIDE['start']) * SCALE
uv_sphere('mirage-caravan:dummy-body', (-.74, dummy_z, 1.05), (.24, .23, .36), dummy_paint)
uv_sphere('mirage-caravan:dummy-head', (-.76, dummy_z, 1.53), (.20, .19, .23), dummy_paint)
uv_sphere('mirage-caravan:dummy-eye-road', (-.94, dummy_z - .07, 1.57), (.025, .03, .035), rubber)
uv_sphere('mirage-caravan:dummy-eye-tail', (-.94, dummy_z + .07, 1.57), (.025, .03, .035), rubber)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.29, depth=.055,
                                   location=(-.76, dummy_z, 1.77))
hat_brim = bpy.context.object
hat_brim.name = 'mirage-caravan:dummy-hat-brim'
hat_brim.scale = (1, 1, .16)
hat_brim.data.materials.append(hat_paint)
hat_brim.parent = caravan
bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=.18, radius2=.08, depth=.26,
                                location=(-.76, dummy_z, 1.91))
hat_crown = bpy.context.object
hat_crown.name = 'mirage-caravan:dummy-hat-crown'
hat_crown.data.materials.append(hat_paint)
hat_crown.parent = caravan

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)

# Review views are imported from the exported GLB into a fresh scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_percentage = 100
scene.render.resolution_x, scene.render.resolution_y = 800, 600
scene.world = bpy.data.worlds.new('flat grey review world')
scene.world.color = (.34, .34, .34)
scene.render.film_transparent = False

def review_light(name, location, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, -0.2, 1.2)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

review_light('large flat key', (-6, 8, 12), 1700, 8)
review_light('soft fill', (7, 2, 8), 900, 7)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.015))
ground = bpy.context.object
ground.name = 'plain mid-grey floor'
floor_mat = bpy.data.materials.new('plain mid-grey')
floor_mat.diffuse_color = (.34, .34, .34, 1)
floor_mat.use_nodes = True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.34, .34, .34, 1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(floor_mat)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def game_to_blender(point):
    return Vector((point[0], -point[2], point[1]))

def shot(name, eye, target, lens=50):
    camera.location = game_to_blender(eye)
    camera.rotation_euler = (game_to_blender(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.lens = lens
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

render.mkdir(parents=True, exist_ok=True)
shot('model-side', (-12, 1.2, 0), (0, 1.2, 0), 85)
shot('model-front', (0, 1.2, -12), (0, 1.2, 0), 85)
shot('model-front-three-quarter', (-10.6, 4, -10.6), (0, 1.2, 0), 68)
shot('model-rear-three-quarter', (10.6, 4, 10.6), (0, 1.2, 0), 68)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('model-*.png'))]}))
