"""Photo-carved Magnus crane base for WW-ART-PEACE."""
import argparse
import json
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

out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=False, export_cameras=False,
                          export_lights=False, export_image_format='AUTO')
print('peace-crane body dimensions:', LENGTH, WIDTH, HEIGHT)
print('peace-crane glb bytes:', out.stat().st_size)
