"""Build the mirage caravan as the first piece in the separate peace-camp asset."""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.evidence/2026-11-07/WW-ART-PEACE/round-9')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/town/peace-camp.glb'
blend = root / 'art-build/town-peace-camp.blend'
render = Path(args.render_dir)
render = render if render.is_absolute() else root / render
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)], 'summary': str(root / 'docs/board/looks/ww-art-peace/round-9.jpg')}))
    raise SystemExit(0)

import bpy
import math
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_carve import carve_object
from hull_model import tyre
from photo_model import Mesh, Photo, lathe, slab, trace

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

# WW-ART-PEACE round 9: the real camp. Pixel readings are from photo_grid:
# side tent feet row 775, ridge row 164, ends at columns 20 and 1740; front
# feet row 945, ridge row 112, centre column 768, outside edges 88 and 1448.
# The side sets the 1.5 m ridge scale; matching that height in the front sets
# its end-photo scale. Top view is a true plan, spanning rows 80 to about 980.
CAMP_SIDE = {'start': 20, 'end': 1740, 'ground': 775, 'ridge': 164}
CAMP_FRONT = {'centre': 768, 'ground': 945, 'ridge': 112}
CAMP_LENGTH = (CAMP_SIDE['end'] - CAMP_SIDE['start']) * 1.5 / (CAMP_SIDE['ground'] - CAMP_SIDE['ridge'])
CAMP_WIDTH = 1360 * 1.5 / (CAMP_FRONT['ground'] - CAMP_FRONT['ridge'])
CAMP_TENT_TABLE = {
    'photos': {'side': 'peace-mirage-camp-tent-side.jpg',
               'front': 'peace-mirage-camp-tent-front.jpg',
               'rear': 'peace-mirage-camp-tent-front.jpg',
               'top': 'peace-mirage-camp-tent-overhead.jpg'},
    'length': CAMP_LENGTH, 'width': CAMP_WIDTH, 'height': 1.5,
    'side': {'start': CAMP_SIDE['start'], 'end': CAMP_SIDE['end'], 'ground': CAMP_SIDE['ground']},
    'front': {'centre': CAMP_FRONT['centre'], 'ground': CAMP_FRONT['ground'], 'top': CAMP_FRONT['ridge']},
    'rear': {'centre': CAMP_FRONT['centre'], 'ground': CAMP_FRONT['ground'], 'top': CAMP_FRONT['ridge']},
    'top': {'front': 80, 'rear': 1460, 'centre': 512, 'along': 'x', 'x_scale': CAMP_WIDTH / 760},
    # The dark, triangular front opening is removed from the carved fill.
    'keep': lambda x, y, z: ~((z < -CAMP_LENGTH / 2 + .28) &
                             (np.abs(x) < .42) &
                             (y < 1.5 * (1 - np.abs(x) / .42))),
    'grey': 18, 'tolerance': 28, 'bleed_tolerance': 32,
    'voxel': .035, 'target': 7000,
    'mask_dir': str(render / 'masks'),
}
camp_root = bpy.data.objects.new('mirage-camp', None)
bpy.context.collection.objects.link(camp_root)
camp_root.empty_display_type = 'CUBE'
tent = carve_object('mirage-camp:tent', textures, CAMP_TENT_TABLE)
tent.parent = camp_root

def photo_solid(photo, ground, rect, seeds=None, tolerance=22):
    seeds = seeds or [(8, 8), (photo.w - 9, 8), (8, photo.h - 9), (photo.w - 9, photo.h - 9)]
    solid = ~photo.sky(seeds, tolerance=tolerance, grey=22)
    # The gaps between a crate's slats are walled in, so the flood cannot reach them.
    rgb = photo.rgb()
    solid &= ~((rgb.mean(axis=2) > 150) & (rgb.max(axis=2) - rgb.min(axis=2) < 24))
    solid[ground:, :] = False
    photo.bleed(solid, passes=8)
    return solid, trace(solid, rect, tolerance=1.6, min_area=35)

def stand_photo_slab(name, filename, rect, ground, centre_x, scale, x_offset, z_offset, depth, crop=None):
    photo = Photo(textures / filename)
    solid, loops = photo_solid(photo, ground, rect)
    if crop:
        mask = np.zeros((photo.h, photo.w), dtype=bool)
        x0, y0, x1, y1 = crop
        mask[y0:y1, x0:x1] = solid[y0:y1, x0:x1]
        loops = trace(mask, rect, tolerance=1.4, min_area=25)
    def world(px, py, d):
        return (x_offset + (px - centre_x) * scale, (ground - py) * scale, z_offset + d)
    mesh = Mesh()
    slab(mesh, 'photo', photo, loops, world, -depth / 2, depth / 2, wall_scale=scale)
    obj = mesh.finish(name, {'photo': photo.material()})
    obj.parent = camp_root
    return photo

# Folding chair: seat is 0.45 m above the true foot row (1170), measured at
# row 510. Its side silhouette keeps the crossed frame and worn canvas together.
CHAIR_GROUND, CHAIR_SEAT, CHAIR_CENTRE = 1170, 510, 660
CHAIR_SCALE = .45 / (CHAIR_GROUND - CHAIR_SEAT)
chair_photo = stand_photo_slab('mirage-camp:chair', 'peace-mirage-camp-chair.jpg',
                               (235, 25, 1010, 1185), CHAIR_GROUND, CHAIR_CENTRE,
                               CHAIR_SCALE, -.78, -CAMP_LENGTH / 2 - .85, .035)

# Stove body from its lower photo region; the round kettle is turned separately.
STOVE_GROUND, KETTLE_BOTTOM, KETTLE_TOP, KETTLE_CENTRE = 1172, 676, 248, 650
KETTLE_SCALE = .22 / (KETTLE_BOTTOM - KETTLE_TOP)
stove_photo = Photo(textures / 'peace-mirage-camp-stove-kettle.jpg')
stove_solid, _ = photo_solid(stove_photo, STOVE_GROUND, (285, 676, 1100, 1174))
stove_mask = np.zeros((stove_photo.h, stove_photo.w), dtype=bool)
stove_mask[676:STOVE_GROUND, :] = stove_solid[676:STOVE_GROUND, :]
stove_loops = trace(stove_mask, (285, 676, 1100, 1174), tolerance=1.5, min_area=25)
def stove_world(px, py, d):
    return (.72 + (px - KETTLE_CENTRE) * KETTLE_SCALE, (STOVE_GROUND - py) * KETTLE_SCALE, -CAMP_LENGTH / 2 - .75 + d)
stove_mesh = Mesh()
slab(stove_mesh, 'photo', stove_photo, stove_loops, stove_world, -.24, .24, wall_scale=KETTLE_SCALE)
stove = stove_mesh.finish('mirage-camp:stove', {'photo': stove_photo.material()})
stove.parent = camp_root

def round_photo_part(name, photo, centre_px, ground_px, scale, x, z, stations, radius_px, sides=20, y_base=0, cap_end_centre=None, cap_end_row=None):
    mesh = Mesh()
    def uv(index, distance, radius, angle):
        px = centre_px + math.sin(angle) * radius / scale * .85
        py = ground_px - distance / scale
        return photo.uv(px, py)
    start_radius_px = stations[0][1] / scale * .85
    end_radius_px = stations[-1][1] / scale * .85
    end_centre = centre_px if cap_end_centre is None else cap_end_centre
    end_row = ground_px - stations[-1][0] / scale if cap_end_row is None else cap_end_row
    lathe(mesh, 'photo', (x, y_base, z), (0, 1, 0), (1, 0, 0), (0, 0, 1), stations, uv,
          sides=sides, cap_start=('photo', lambda angle, frac: photo.uv(centre_px + math.cos(angle) * start_radius_px * frac, ground_px)),
          cap_end=('photo', lambda angle, frac: photo.uv(end_centre + math.cos(angle) * end_radius_px * frac, end_row)))
    obj = mesh.finish(name, {'photo': photo.material()})
    obj.parent = camp_root
    return obj

kettle_radius_px = 260
kettle = round_photo_part('mirage-camp:kettle', stove_photo, KETTLE_CENTRE, KETTLE_BOTTOM,
                          KETTLE_SCALE, .72, -CAMP_LENGTH / 2 - .75,
                          [(0, .12), (.018, .125), (.065, .126), (.15, .11), (.20, .06), (.22, .045)],
                          kettle_radius_px, y_base=.25)

# Water can: a compact turned steel vessel, read from the measured side photo.
CAN_GROUND, CAN_TOP, CAN_CENTRE = 995, 70, 760
CAN_SCALE = .31 / (CAN_GROUND - CAN_TOP)
can_photo = Photo(textures / 'peace-mirage-camp-water-can.jpg')
can_solid, can_loops = photo_solid(can_photo, CAN_GROUND, (125, 20, 1410, 1000))
can = round_photo_part('mirage-camp:water-can', can_photo, CAN_CENTRE, CAN_GROUND,
                       CAN_SCALE, 1.18, -CAMP_LENGTH / 2 - .45,
                       [(0, .185), (.012, .2), (.21, .2), (.24, .185), (.27, .13), (.29, .06), (.31, .036)], 600,
                       cap_end_centre=760, cap_end_row=500)

# Crate table and mug. The crate is traced without the mug; the mug is turned.
CRATE_GROUND, CRATE_TOP, CRATE_CENTRE = 950, 320, 768
CRATE_SCALE = .48 / (CRATE_GROUND - CRATE_TOP)
CRATE_X_SCALE = .60 / (1430 - 90)
crate_photo = Photo(textures / 'peace-mirage-camp-crate-mug.jpg')
crate_solid, _ = photo_solid(crate_photo, CRATE_GROUND, (90, CRATE_TOP, 1430, CRATE_GROUND))
crate_mask = np.zeros((crate_photo.h, crate_photo.w), dtype=bool)
crate_mask[CRATE_TOP:CRATE_GROUND, :] = crate_solid[CRATE_TOP:CRATE_GROUND, :]
crate_loops = trace(crate_mask, (90, CRATE_TOP, 1430, CRATE_GROUND), tolerance=1.6, min_area=30)
def crate_world(px, py, d):
    return (-1.28 + (px - CRATE_CENTRE) * CRATE_X_SCALE, (CRATE_GROUND - py) * CRATE_SCALE,
            -CAMP_LENGTH / 2 - .55 + d)
crate_mesh = Mesh()
slab(crate_mesh, 'photo', crate_photo, crate_loops, crate_world, -.15, .15, wall_scale=CRATE_SCALE)
crate = crate_mesh.finish('mirage-camp:crate', {'photo': crate_photo.material()})
crate.parent = camp_root

MUG_BOTTOM, MUG_TOP, MUG_CENTRE = 320, 108, 694
MUG_SCALE = .15 / (MUG_BOTTOM - MUG_TOP)
round_photo_part('mirage-camp:mug', crate_photo, MUG_CENTRE, MUG_BOTTOM, MUG_SCALE,
                 -1.28, -CAMP_LENGTH / 2 - .55,
                 [(0, .060), (.012, .065), (.13, .062), (.15, .058)], 90, y_base=.48)

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

# This file keeps the already-reviewed caravan unchanged. Hide only its imported
# review objects so round 9's four views judge the new camp on its own.
for obj in scene.objects:
    if obj.name.startswith('mirage-caravan'):
        obj.hide_render = True

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
camp_photographs = [obj for obj in scene.objects if obj.name.startswith('mirage-camp:')]
tent_objects = [obj for obj in camp_photographs if obj.name == 'mirage-camp:tent']
for obj in camp_photographs:
    obj.hide_render = obj not in tent_objects
shot('model-side', (-9, .8, 0), (0, .8, 0), 85)
shot('model-front', (0, .8, -9), (0, .8, -.5), 85)
for obj in camp_photographs:
    obj.hide_render = False
shot('model-front-three-quarter', (-6, 1.35, -8), (0, .7, -.5), 62)
shot('model-rear-three-quarter', (6, 1.35, 8), (0, .7, -.5), 62)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('model-*.png'))]}))
