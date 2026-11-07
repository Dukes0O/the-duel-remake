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
# is the left end of the side photo, so its front is at -Z as a town object's is.
# Side: the tyre's foot is the ground, row 456; the door runs rows 65 to 370, set
# to 1.9 m. The wheel's outer circle is centred at (476, 400), radius 57.
# Front: ground row 438, roof row 25, centre column 408; tyres at 270 and 536.
# Rear (cropped at the right): ground row 472, roof row 38, centre column 384;
# tyres at 238 and 528.
# Overhead: body columns 355 to 870, rows 70 to 400.
SIDE = {'start': 135, 'end': 745, 'ground': 456, 'roof': 25, 'wheel': (476, 400, 57)}
DOOR_HEIGHT = 1.9
SCALE = DOOR_HEIGHT / (370 - 65)
LENGTH = (SIDE['end'] - SIDE['start']) * SCALE
HEIGHT = (SIDE['ground'] - SIDE['roof']) * SCALE
WIDTH = 2.36
UNDERSIDE = (SIDE['ground'] - 385) * SCALE
WHEEL_RADIUS = SIDE['wheel'][2] * SCALE
WHEEL_TRACK = .92
WHEEL_HALF = .12
AXLE_Z = -LENGTH / 2 + (SIDE['wheel'][0] - SIDE['start']) * SCALE
table = {
    'photos': {'side': 'peace-mirage-caravan-side.jpg', 'front': 'peace-mirage-caravan-front.jpg',
               'rear': 'peace-mirage-caravan-rear.jpg', 'top': 'peace-mirage-caravan-overhead.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': SIDE['start'], 'end': SIDE['end'], 'ground': SIDE['ground']},
    'front': {'centre': 408, 'ground': 438, 'top': SIDE['roof']},
    'rear': {'centre': 384, 'ground': 472, 'top': 38},
    'top': {'front': 355, 'rear': 870, 'centre': 235, 'along': 'x', 'x_scale': WIDTH / 330},
    # The roof vent stands above the roof line and is its own piece; the tow bar too.
    'cut': {'side': [(0, 290, 137, 510), (365, 0, 475, 25)],
            'front': [(350, 0, 470, 25)],
            'rear': [(335, 0, 450, 38)],
            'top': [(0, 0, 352, 507)]},
    'wheels': [(AXLE_Z, WHEEL_RADIUS, WHEEL_TRACK - WHEEL_HALF)],
    'underside': UNDERSIDE, 'grey': 18, 'tolerance': 24, 'bleed_tolerance': 32,
    'voxel': .035, 'target': 7500,
    'mask_dir': str(render / 'masks'),
}

caravan = bpy.data.objects.new('mirage-caravan', None)
bpy.context.collection.objects.link(caravan)
caravan.empty_display_type = 'CUBE'
body = carve_object('mirage-caravan:body', textures, table)
body.parent = caravan

def plain_material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = 0
    shader.inputs['Roughness'].default_value = .9
    return mat

rust_dark = plain_material('caravan dark rusty steel', (.06, .042, .03))

# One axle, square to the body, stopping inside the tyres.
side_photo = table['_photos']['side']
front_photo = table['_photos']['front']
rear_photo = table['_photos']['rear']
for side, hand, end_photo, end_cx, half_px, y0, y1 in (
        ('road', -1, front_photo, 270, 18, 372, 438),
        ('far', 1, rear_photo, 238, 22, 405, 472)):
    wheel_mesh = Mesh()
    tyre(wheel_mesh, 'side', side_photo, *SIDE['wheel'], WHEEL_RADIUS, WHEEL_HALF,
         'tread', end_photo, end_cx, half_px, y0, y1)
    wheel = wheel_mesh.finish(f'mirage-caravan:wheel-{side}',
                              {'side': side_photo.material(), 'tread': end_photo.material()})
    wheel.parent = caravan
    wheel.location = (hand * WHEEL_TRACK, -AXLE_Z, WHEEL_RADIUS)
axle = town.beam('mirage-caravan:axle', (-WHEEL_TRACK, WHEEL_RADIUS, AXLE_Z),
                 (WHEEL_TRACK, WHEEL_RADIUS, AXLE_Z), .07, rust_dark)
axle.parent = caravan

# The tow bar with its jack and small wheel is one traced picture from the side
# photo, in a second copy, since the carve has painted over the first. Its small
# wheel's foot, row 446, stands on the ground.
hitch_photo = Photo(textures / 'peace-mirage-caravan-side.jpg')
hitch_seeds = [(8, 8), (hitch_photo.w - 9, 8), (8, 300), (60, 300)]
hitch_solid = ~hitch_photo.sky(hitch_seeds, tolerance=24, grey=18)
# The ground between the small wheel and the body is walled in, so the flood from
# the corners cannot reach it: pale and colourless is background here.
hitch_rgb = hitch_photo.rgb()
hitch_solid &= ~((hitch_rgb.mean(axis=2) > 150) & (hitch_rgb.max(axis=2) - hitch_rgb.min(axis=2) < 24))
hitch_solid[:315, :] = False
hitch_solid[447:, :] = False
hitch_solid[:, 150:] = False
hitch_solid[:, :6] = False
hitch_loops = trace(hitch_solid, (4, 313, 152, 449), tolerance=1, min_area=8)
hitch_photo.bleed(hitch_solid, passes=8)
def hitch_world(px, py, depth):
    return (depth, (446 - py) * SCALE, -LENGTH / 2 + (px - SIDE['start']) * SCALE)

hitch_mesh = Mesh()
slab(hitch_mesh, 'steel', hitch_photo, hitch_loops, hitch_world, -.035, .035, wall_scale=SCALE)
hitch = hitch_mesh.finish('mirage-caravan:traced-tow-bar', {'steel': hitch_photo.material()})
hitch.parent = caravan

# The tow bar's A-frame, measured on the overhead photo: the arms meet at column
# 285 and reach the body at rows 215 and 295.
TOP_LENGTH_SCALE = LENGTH / (870 - 355)
arm_tip_z = -LENGTH / 2 - (355 - 285) * TOP_LENGTH_SCALE
arm_height = (446 - 372) * SCALE
for hand, row, name in ((-1, 215, 'road'), (1, 295, 'far')):
    arm_x = (row - 235) * WIDTH / 330
    arm = town.beam(f'mirage-caravan:tow-arm-{name}', (0, arm_height, arm_tip_z),
                    (arm_x, arm_height, -LENGTH / 2 + .1), .045, rust_dark)
    arm.parent = caravan

# The roof vent, traced from the front photo and standing on the roof, as its own
# small piece. The carve leaves it out so that the roof line stays clean.
vent_photo = Photo(textures / 'peace-mirage-caravan-front.jpg')
vent_solid = np.zeros((vent_photo.h, vent_photo.w), dtype=bool)
vent_solid[10:26, 372:449] = True
vent_loops = trace(vent_solid, (370, 8, 451, 28), tolerance=1, min_area=20)
vent_scale = HEIGHT / (438 - 25)
def vent_world(px, py, depth):
    return ((408 - px) * vent_scale, HEIGHT + (25 - py) * vent_scale, depth)

vent_z = -LENGTH / 2 + (415 - SIDE['start']) * SCALE
vent_mesh = Mesh()
slab(vent_mesh, 'front', vent_photo, vent_loops, vent_world, vent_z - .24, vent_z + .24, wall_scale=vent_scale)
vent = vent_mesh.finish('mirage-caravan:roof-vent', {'front': vent_photo.material()})
vent.parent = caravan

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
shot('model-side', (-12, 1.35, 0), (0, 1.35, 0), 85)
shot('model-front', (0, 1.35, -12), (0, 1.35, 0), 85)
shot('model-front-three-quarter', (-8, 1.5, -11), (0, 1.25, 0), 62)
shot('model-rear-three-quarter', (8, 1.5, 11), (0, 1.25, 0), 62)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('model-*.png'))]}))
