"""Four look-review renders of a code-built car (EARN-CAR-3 and later earned
cars): front three-quarter, side, rear three-quarter and a front close-up, on
a neutral grey studio floor. Input is the review GLB from
tools/art/car-review-export.mjs; output is four PNGs under .evidence/.

Run:
  blender -b --factory-startup --python tools/blender/car-review.py -- --root <repo> --glb <in.glb> --out <folder>
With --paths-only (plain Python, no Blender) it prints the files it would
write and writes nothing.
"""
import argparse
import json
import sys
from pathlib import Path

VIEW_NAMES = ('front-three-quarter', 'side', 'rear-three-quarter', 'front-close')

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
for name, location, energy in (('Key', (6, 4, 8), 900), ('Fill', (-7, 3, 5), 350), ('Back', (0, -9, 6), 500)):
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
camera.data.lens = 55

# Views: (name, direction from the car's centre, distance factor, look height).
# Blender -Y is the car's front.
views = (
    ('front-three-quarter', Vector((0.72, -1.0, 0.36)), 1.55, 0.35),
    ('side', Vector((1.0, 0.0, 0.12)), 1.45, 0.35),
    ('rear-three-quarter', Vector((-0.72, 1.0, 0.40)), 1.55, 0.40),
    ('front-close', Vector((0.35, -1.0, 0.18)), 0.95, 0.30),
)
for name, direction, factor, look in views:
    target = Vector((centre.x, centre.y, lo.z + look))
    camera.location = target + direction.normalized() * length * factor
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out / f'{name}.png')
    bpy.ops.render.render(write_still=True)
print('rendered', len(views), 'views to', out)
