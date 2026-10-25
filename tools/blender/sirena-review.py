"""SIRENA-ART look-review renders of the Sirena models, any size: the wreck, the
loose parts, the lift bag and the abalone. The camera is framed on the model's
own size, so a 10 cm badge and a 5 m wreck fill the picture alike. Input is a
GLB (the models in public/assets/models/sirena/, or review exports under
.evidence/); output is PNGs under .evidence/.

Run:
  blender -b --factory-startup --python tools/blender/sirena-review.py -- --root <repo> --glb <in.glb> --out <folder> [--views three-quarter,side]
With --paths-only (plain Python, no Blender) it prints the files it would
write and writes nothing.
"""
import argparse
import json
import sys
from pathlib import Path

VIEWS = {
    'three-quarter': ((0.72, -1.0, 0.62), 1.0),
    'side': ((1.0, 0.0, 0.18), 1.0),
    'rear-three-quarter': ((-0.72, 1.0, 0.55), 1.0),
    'top': ((0.05, -0.3, 1.0), 0.95),
}

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--glb', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--views', default='three-quarter')
parser.add_argument('--size', default='960x600')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = Path(args.out).resolve()
names = [name for name in args.views.split(',') if name]
if not out.is_relative_to(root / '.evidence'):
    parser.error('Renders go under .evidence/.')
if any(name not in VIEWS for name in names):
    parser.error('Unknown view; choose from ' + ', '.join(VIEWS))
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [], 'evidence': [str(out / f'{name}.png') for name in names], 'summary': []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

out.mkdir(parents=True, exist_ok=True)
width, height = (int(v) for v in args.size.split('x'))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(Path(args.glb).resolve()))
meshes = [o for o in scene.objects if o.type == 'MESH']
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
centre = (lo + hi) / 2
span = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)

bpy.ops.mesh.primitive_plane_add(size=span * 14, location=(0, 0, lo.z))
floor = bpy.context.active_object
grey = bpy.data.materials.new('Studio floor')
grey.use_nodes = True
grey.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.30, 0.31, 0.32, 1)
grey.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
floor.data.materials.append(grey)

world = bpy.data.worlds.new('Studio')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.57, 0.6, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
for name, location, energy in (('Key', (4, -3, 6), 900), ('Fill', (-5, -2, 4), 350), ('Back', (0, 6, 5), 500)):
    # Lights keep the car-review rig's strength (900 W at about ten metres for a
    # five metre subject) at any size: power follows the distance squared.
    reach = span * 2.4
    bpy.ops.object.light_add(type='AREA', location=centre + Vector(location).normalized() * reach)
    light = bpy.context.active_object
    light.name = name
    light.data.energy = energy * (reach / 10) ** 2
    light.data.size = span * 1.2
    light.rotation_euler = (centre - light.location).to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = width, height
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'

bpy.ops.object.camera_add()
camera = bpy.context.active_object
scene.camera = camera
camera.data.lens = 50
for name in names:
    direction, factor = VIEWS[name]
    camera.location = centre + Vector(direction).normalized() * span * 2.1 * factor
    camera.rotation_euler = (centre - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out / f'{name}.png')
    bpy.ops.render.render(write_still=True)
print('rendered', len(names), 'views to', out)
