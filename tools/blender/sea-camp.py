"""Build the Scablands harbour crew's raised camp from measured photo kits."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.evidence/ww-art-sea')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/sea-camp.glb'
blend = root / 'art-build/sea-camp/sea-camp.blend'
textures = root / 'public/assets/models/wasteland/scablands/textures'
render = Path(args.render_dir)
render = render if render.is_absolute() else root / render
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from town_base import export_glb
from photo_model import Mesh, Photo, slab, trace
from photo_carve import carve_object

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
camp = bpy.data.objects.new('works-camp', None)
scene.collection.objects.link(camp)
camp.empty_display_type = 'PLAIN_AXES'

# Gridded photo measurements, in source pixels. The ground is the point where
# the wall itself meets the floor, not a sill, shadow or lower edge.
# Hut side (1774 x 887): x=45..1715, ground=833, roof=51. The door is
# x=385..515, y=209..829: 620 px at 1.9 m, or 0.0030645 m/px.
# Hut end (1310 x 1200): x=120..1195, ground=1105, roof=105.
# Hut overhead (1536 x 1024): long axis x=142..1256, centre row=470,
# width y=100..840. The floor contact is the hut wall line, not the roof eave.
HUT = {
    'photos': {'side': 'sea-camp-hut-side.jpg', 'front': 'sea-camp-hut-end.jpg',
               'rear': 'sea-camp-hut-end.jpg', 'top': 'sea-camp-hut-top.jpg'},
    'length': (1715 - 45) * (1.9 / (829 - 209)),
    'width': ((1195 - 120) * ((833 - 51) * (1.9 / (829 - 209)) / (1105 - 105))),
    'height': (833 - 51) * (1.9 / (829 - 209)),
    'side': {'start': 45, 'end': 1715, 'ground': 833},
    'front': {'centre': 655, 'ground': 1105, 'top': 105},
    'rear': {'centre': 655, 'ground': 1105, 'top': 105},
    'top': {'front': 142, 'rear': 1256, 'centre': 470, 'along': 'x',
            'x_scale': ((1195 - 120) * ((833 - 51) * (1.9 / (829 - 209)) / (1105 - 105))) / (840 - 100)},
    'voxel': .035, 'target': 6500, 'grey': 25, 'tolerance': 34,
    'bleed_tolerance': 38, 'mask_dir': str(render / 'masks'),
}
# Kitchen side (1942 x 809): x=38..1904, ground=992, roof=204;
# door x=404..536, y=432..982 (550 px at 1.9 m). Kitchen end
# (1536 x 1024): x=90..1446, ground=902, roof=101. Overhead
# (2172 x 724): along x=34..2140, centre row=337, width y=50..620.
KITCHEN = {
    'photos': {'side': 'sea-camp-kitchen-side.jpg', 'front': 'sea-camp-kitchen-end.jpg',
               'rear': 'sea-camp-kitchen-end.jpg', 'top': 'sea-camp-kitchen-top.jpg'},
    'length': (1904 - 38) * (1.9 / (982 - 432)),
    'width': ((1446 - 90) * ((992 - 204) * (1.9 / (982 - 432)) / (902 - 101))),
    'height': (992 - 204) * (1.9 / (982 - 432)),
    'side': {'start': 38, 'end': 1904, 'ground': 992},
    'front': {'centre': 768, 'ground': 902, 'top': 101},
    'rear': {'centre': 768, 'ground': 902, 'top': 101},
    'top': {'front': 34, 'rear': 2140, 'centre': 337, 'along': 'x',
            'x_scale': ((1446 - 90) * ((992 - 204) * (1.9 / (982 - 432)) / (902 - 101))) / (620 - 50)},
    'voxel': .04, 'target': 8000, 'grey': 25, 'tolerance': 34,
    'bleed_tolerance': 38, 'mask_dir': str(render / 'masks'),
}

def to_blender(point):
    """Convert a glTF/model point (X right, Y up, Z forward) to Blender XYZ."""
    x, y, z = point
    return (x, -z, y)

def named_part(name, parent, location=(0, 0, 0), yaw=0):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = to_blender(location)
    obj.rotation_euler[2] = yaw
    obj.empty_display_type = 'PLAIN_AXES'
    obj['part'] = name
    return obj

def attach_carve(name, table, location, yaw=0, reuse=None):
    if reuse is None:
        body = carve_object(name, textures, table)
        for photo in table['_photos'].values():
            if photo.image.size[0] > 768:
                photo.image.scale(768, max(1, round(photo.image.size[1] * 768 / photo.image.size[0])))
    else:
        body = bpy.data.objects.new(name, reuse.data)
        scene.collection.objects.link(body)
    body.name = name
    body.parent = camp
    body.location = to_blender(location)
    body.rotation_euler[2] = yaw
    body['part'] = name
    return body

TRACE_PHOTOS = {}

def trace_photo(filename):
    if filename not in TRACE_PHOTOS:
        TRACE_PHOTOS[filename] = Photo(textures / filename)
    return TRACE_PHOTOS[filename]

hut = attach_carve('works-camp:hut-1', HUT, (-5.5, 3, -1))
hut2 = attach_carve('works-camp:hut-2', HUT, (5.5, 3, -1), math.pi / 2, reuse=hut)
kitchen = attach_carve('works-camp:kitchen', KITCHEN, (0, 3, 8))

def traced_part(name, parent, photo_name, mask_fn, rect, mapper, depth=.06, wall_scale=None):
    photo = trace_photo(photo_name)
    solid = mask_fn(photo)
    loops = trace(solid, rect, tolerance=1.2, min_area=70)
    if not getattr(photo, '_sea_camp_bled', False):
        photo.bleed(solid)
        photo._sea_camp_bled = True
    mesh = Mesh()
    slab(mesh, name, photo, loops, mapper, -depth / 2, depth / 2, wall_scale=wall_scale)
    obj = mesh.finish(name, {name: photo.material()})
    obj.parent = parent
    obj['part'] = name
    return obj

def frame_mask(photo):
    return ~photo.sky([(8, 8), (photo.w - 9, 8), (8, photo.h - 9),
                       (photo.w - 9, photo.h - 9)], tolerance=30, grey=30)

def add_stilts(body, length, width):
    frame = trace_photo('sea-camp-stilt-frame.jpg')
    # Grid: 1024 x 1536; timber feet meet floor at row 1510, top row 20,
    # and outer legs span x=145..878. 3 m / 1490 px = 0.002013 m/px.
    frame_scale = 3 / (1510 - 20)
    frame_x = (145 + 878) / 2
    solid = frame_mask(frame)
    positions = [-length / 2]
    while positions[-1] + 4 < length / 2:
        positions.append(positions[-1] + 4)
    if length / 2 - positions[-1] > .05:
        positions.append(length / 2)
    for station, z in enumerate(positions):
        for edge, x in enumerate((-width / 2, width / 2)):
            traced_part(f'{body.name}:stilt-{station + 1}-{edge + 1}', body,
                'sea-camp-stilt-frame.jpg', lambda _p, s=solid: s,
                (120, 18, 900, 1515),
                lambda px, py, d, x=x: (x + d, (1510 - py) * frame_scale - 3,
                                         z + (px - frame_x) * frame_scale),
                depth=.10, wall_scale=frame_scale)

def add_ladder(body, door_z, width, suffix):
    ladder = trace_photo('sea-camp-ladder.jpg')
    # Grid: 1024 x 1536; feet touch floor at row 1510, rails reach row 30.
    # The upper rail tips are near x=880; the floor feet are near x=160.
    ladder_top, ladder_ground = 30, 1510
    vertical_scale = 3 / (ladder_ground - ladder_top)
    top_x = 880
    horizontal_scale = 1.1 / (880 - 160)
    solid = frame_mask(ladder)
    traced_part(f'{body.name}:ladder-{suffix}', body, 'sea-camp-ladder.jpg',
        lambda _p, s=solid: s, (140, 20, 900, 1515),
        lambda px, py, d: (width / 2 + .11 + d,
                           (ladder_ground - py) * vertical_scale - 3,
                           door_z + (px - top_x) * horizontal_scale),
        depth=.055, wall_scale=.006)

def door_offset(table, side_start, door_center):
    side_scale = table['length'] / abs(table['side']['end'] - side_start)
    return -table['length'] / 2 + (door_center - side_start) * side_scale

add_stilts(hut, HUT['length'], HUT['width'])
add_ladder(hut, door_offset(HUT, 45, 450), HUT['width'], '1')
add_stilts(hut2, HUT['length'], HUT['width'])
add_ladder(hut2, door_offset(HUT, 45, 450), HUT['width'], '2')
add_stilts(kitchen, KITCHEN['length'], KITCHEN['width'])
add_ladder(kitchen, door_offset(KITCHEN, 38, 470), KITCHEN['width'], 'kitchen')

# The washing line's own image traces two poles, the line and a few grey clothes.
# Pole tops are at row 20 and their floor contacts at row 860; the clothes hang
# below the line. Stretch its horizontal dimension to the measured camp gap.
laundry = trace_photo('sea-camp-washing-line.jpg')
laundry_solid = frame_mask(laundry)
laundry_scale_y = 3 / (860 - 20)
laundry_scale_x = 7.4 / (1615 - 140)
washing_line = traced_part('works-camp:washing-line', camp,
    'sea-camp-washing-line.jpg', lambda _p: laundry_solid,
    (120, 15, 1640, 870),
    lambda px, py, d: ((px - (140 + 1615) / 2) * laundry_scale_x,
                       (860 - py) * laundry_scale_y, -1 + d),
    depth=.045, wall_scale=.006)

# Downsample only after all masks have read the full-resolution photos. Traced
# UVs keep their source-grid coordinates; the compressed copies stay in budget.
for photo in TRACE_PHOTOS.values():
    if photo.image.size[0] > 768:
        photo.image.scale(768, max(1, round(photo.image.size[1] * 768 / photo.image.size[0])))

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
export_glb(out)

# Render from the exported GLB in a fresh scene, with a neutral floorless studio.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('flat neutral studio')
scene.world.color = (.43, .43, .43)
scene.render.film_transparent = False

def area(name, loc, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = to_blender(loc)
    obj.rotation_euler = (Vector(to_blender((0, 2, 2))) - obj.location).to_track_quat('-Z', 'Y').to_euler()

area('soft sky', (0, 23, -16), 3200, 18)
area('open fill', (-18, 15, 16), 1700, 14)
camera_data = bpy.data.cameras.new('review camera')
camera = bpy.data.objects.new('review camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

def shot(name, eye, target, ortho=None, resolution=(800, 400)):
    camera.location = to_blender(eye)
    camera.rotation_euler = (Vector(to_blender(target)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO' if ortho else 'PERSP'
    if ortho:
        camera.data.ortho_scale = ortho
    else:
        camera.data.lens = 50
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('model-hut-side', (-25, 3.0, -1), (-5.5, 3, -1), ortho=14.4)
shot('camp-quarter-a', (-18, 1.6, -17), (0, 2.0, 3), resolution=(800, 400))
shot('camp-quarter-b', (18, 1.6, -15), (0, 2.0, 3), resolution=(800, 400))

from PIL import Image
photo = Image.open(textures / HUT['photos']['side']).convert('RGB').resize((800, 400), Image.Resampling.LANCZOS)
model = Image.open(render / 'model-hut-side.png').convert('RGB').resize((800, 400), Image.Resampling.LANCZOS)
camp_a = Image.open(render / 'camp-quarter-a.png').convert('RGB')
camp_b = Image.open(render / 'camp-quarter-b.png').convert('RGB')
sheet = Image.new('RGB', (1600, 800))
sheet.paste(photo, (0, 0)); sheet.paste(model, (800, 0))
sheet.paste(camp_a, (0, 400)); sheet.paste(camp_b, (800, 400))
sheet_path = root / 'docs/board/looks/ww-art-sea/round-6.jpg'
sheet_path.parent.mkdir(parents=True, exist_ok=True)
sheet.save(sheet_path, 'JPEG', quality=88, optimize=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
triangles = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
                for obj in bpy.context.scene.objects if obj.type == 'MESH')
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'triangles': triangles, 'sheet': str(sheet_path),
                  'sheet_bytes': sheet_path.stat().st_size,
                  'renders': [str(render / name) for name in
                              ('model-hut-side.png', 'camp-quarter-a.png', 'camp-quarter-b.png')]}))
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
export_glb(out)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))
