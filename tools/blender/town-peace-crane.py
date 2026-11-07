import argparse
import json
import sys
from pathlib import Path

# Photo-grid measurements (all source pixels, 100 px grid): side 1774x887,
# tracks touch the floor at y=850; the cab door is 274 px high (1.9 m), so
# side scale is 0.006934 m/px. The body runs x=65..1705 (11.38 m). The same
# cab shell height is 500 px on the side and 510 px on the front: end scale
# is side_scale*500/510. Rear shell height is 526 px: rear scale is
# side_scale*500/526. Front ground y=1010, rear ground y=1000. Overhead body
# spans y=70..1450 and x=170..880. The boom's visible outline runs x=29..2142,
# y=166..438; at 16 m the tracing scale is 0.007572 m/px.

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
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
for name in ('magnus-crane', 'magnus-roof'):
    root_obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(root_obj)
out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=False)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))
