"""Build the Scablands harbour crew's stilt camp."""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/sea-camp.glb'
blend = root / 'art-build/sea-camp/sea-camp.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
sys.path.insert(0, str(root / 'tools/blender'))
from town_base import export_glb

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
camp = bpy.data.objects.new('works-camp', None)
scene.collection.objects.link(camp)
camp.empty_display_type = 'PLAIN_AXES'
for name in ('hut-1', 'hut-2', 'kitchen', 'washing-line'):
    part = bpy.data.objects.new(f'works-camp:{name}', None)
    scene.collection.objects.link(part)
    part.parent = camp
    part.empty_display_type = 'PLAIN_AXES'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
export_glb(out)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))
