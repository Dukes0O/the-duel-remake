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
sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_carve import carve_object

textures = root / 'public/assets/models/wasteland/town/textures'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)

# Pixel measurements read from the four photo_grid overlays. The caravan's front
# is the left end of the side photo. Its lower body seam is the ground reference;
# wheels and the hitch are separate parts and are excluded from the masks.
# Side: ground row 390; body ends x=130 and x=737; roof row 17. Wheel centre
# (464,372), radius 36. Hitch ends x=8; visible window corners (420,90) to
# (690,231). The door runs y=62..361 (299 px), set to 1.9 m, giving 0.006355 m/px.
# Front: ground row 394, roof row 17, centre x=408; body corners x=230..585.
# The 377 px side height and 377 px front height give a scale ratio of 1.000.
# End width is 355 px at that scale (2.26 m).
# Rear: ground row 400, roof row 16, centre x=378; body corners x=185..572.
# End width is 387 px. Its 384 px body height is within the photo scale ratio.
# Overhead: front body end y=72, rear body end y=431, centre x=603. The hitch
# reaches x=213; the door/window opening is visible around x=564..642, y=188..273.
SIDE = {'start': 130, 'end': 737, 'ground': 390, 'roof': 17,
        'wheel': (464, 372, 36), 'window': (420, 90, 690, 231), 'hitch_end': 8}
FRONT = {'centre': 408, 'ground': 394, 'top': 17, 'left': 230, 'right': 585}
REAR = {'centre': 378, 'ground': 400, 'top': 16, 'left': 185, 'right': 572}
OVERHEAD = {'front': 72, 'rear': 431, 'centre': 603, 'hitch_end': 213}
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
    'top': {'front': OVERHEAD['front'], 'rear': OVERHEAD['rear'], 'centre': OVERHEAD['centre'], 'along': 'x'},
    'cut': {'side': [(0, 334, 130, 474), (425, 331, 505, 414)],
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

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))
