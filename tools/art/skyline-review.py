"""Render front, rear, side and three-quarter views of the runtime R34.

Export with tools/art/skyline-export.mjs, then run Blender with:
  --background --factory-startup --python tools/art/skyline-review.py --
  --root <lane> --glb <review.glb> --out <evidence folder>
Compose with: python tools/art/skyline-sheet.py <evidence folder>
Use --paths-only with normal Python to inspect output paths without rendering.
"""
import argparse
import json
import math
import sys
from pathlib import Path

VIEW_NAMES = ('front', 'rear', 'side', 'three-quarter', 'top')

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--glb', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--size', default='960x600')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = Path(args.out).resolve()
if not out.is_relative_to(root / '.evidence'):
    parser.error('Renders go under .evidence/.')
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [], 'evidence': [str(out / f'{name}.png') for name in VIEW_NAMES], 'summary': []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

out.mkdir(parents=True, exist_ok=True)
width, height = (int(v) for v in args.size.split('x'))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(Path(args.glb).resolve()))
car = [o for o in scene.objects if o.type == 'MESH']
# Bounds in world space: glTF +Z forward becomes Blender -Y.
corners = [o.matrix_world @ Vector(c) for o in car for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
centre = (lo + hi) / 2
length = hi.y - lo.y

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, lo.z))
floor = bpy.context.active_object
grey = bpy.data.materials.new('Studio floor')
grey.use_nodes = True
grey.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.32, 0.33, 0.34, 1)
grey.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.85
floor.data.materials.append(grey)

world = bpy.data.worlds.new('Studio')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.57, 0.6, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.65
for name, location, energy in (('Key', (4, -6, 8), 1100), ('Fill', (-7, -3, 5), 450), ('Back', (0, 7, 6), 700)):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.active_object
    light.name = name
    light.data.energy = energy
    light.data.size = 6
    direction = centre - light.location
    light.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = width, height
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'

bpy.ops.object.camera_add()
camera = bpy.context.active_object
scene.camera = camera
camera.data.lens = 62

# Views: (name, direction from the car's centre, distance factor, look height).
# Blender -Y is the car's front.
views = (
    ('front', Vector((0, -1, .055)), 1.70, .70),
    ('rear', Vector((0, 1, .055)), 1.70, .70),
    ('side', Vector((1, 0, .025)), 1.95, .70),
    ('three-quarter', Vector((.72, -1, .23)), 1.95, .65),
    ('top', Vector((0, -.001, 1)), 1.95, .65),
)
for name, direction, factor, look in views:
    camera.data.type = 'PERSP' if name == 'three-quarter' else 'ORTHO'
    camera.data.ortho_scale = 2.65 if name in ('front', 'rear') else 5.1
    target = Vector((centre.x, centre.y, lo.z + look))
    camera.location = target + direction.normalized() * length * factor
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    if name == 'top':
        camera.rotation_euler.rotate_axis('Z', math.pi / 2)
    scene.render.filepath = str(out / f'{name}.png')
    bpy.ops.render.render(write_still=True)
print('rendered', len(views), 'views to', out)
