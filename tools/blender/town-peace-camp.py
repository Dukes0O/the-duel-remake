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

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)

# This root and export establish the new asset file before its measured parts are added.
caravan = bpy.data.objects.new('mirage-caravan', None)
bpy.context.collection.objects.link(caravan)
caravan.empty_display_type = 'CUBE'

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))
