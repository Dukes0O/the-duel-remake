"""LAB-ART look-review renders of the Lab's models: the whole Lab seen from named
cameras (layout.glb from tools/art/lab-props.mjs --review), or a single bench
model framed on its own size. Output is PNGs under .evidence/.

Run:
  blender -b --factory-startup --python tools/blender/lab-review.py -- --root <repo> --glb <in.glb> --out <folder> --views overview,door,...
  blender ... -- --root <repo> --glb <bench.glb> --out <folder> --views three-quarter
With --paths-only (plain Python, no Blender) it prints the files it would write
and writes nothing.
"""
import argparse
import json
import sys
from pathlib import Path

# Named cameras for the whole Lab: (camera position, look-at point). Metres; the
# hangar is 30 x 18 m with the door on +Z; Blender's -Y is glTF +Z, so the
# conversion below swaps axes.
LAB_VIEWS = {
    'overview': ((-9.0, 23.0, 16.0), (0.0, 0.0, -1.0)),
    'door': ((0.0, 2.2, 17.5), (0.0, 1.8, -4.0)),
    'back-wall': ((2.0, 2.6, 4.5), (-2.0, 1.4, -8.0)),
    'left-side': ((-1.0, 3.2, 8.0), (-12.0, 1.4, 0.0)),
    'right-side': ((2.0, 3.0, 5.5), (11.0, 1.2, -3.0)),
    'weigh-pad': ((-5.0, 3.0, 12.0), (0.0, 0.6, 2.8)),
    'workshop': ((-6.0, 2.4, -1.0), (-14.5, 1.3, -6.0)),
    'coffee': ((8.5, 2.2, 8.2), (14.6, 0.9, 5.3)),
}
SINGLE_VIEWS = {
    'three-quarter': ((0.72, 1.0, 0.62), 1.0),
    'front': ((0.0, 1.0, 0.35), 1.0),
    'side': ((1.0, 0.0, 0.25), 1.0),
    'left': ((-1.0, 0.0, 0.25), 1.0),
    'inlet': ((-0.8, 0.5, 0.3), 1.0),
    'top': ((0.05, 0.3, 1.0), 0.95),
    'wall': ((0.0, 0.0, 1.0), 0.75),
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
if any(name not in LAB_VIEWS and name not in SINGLE_VIEWS for name in names):
    parser.error('Unknown view; choose from ' + ', '.join(list(LAB_VIEWS) + list(SINGLE_VIEWS)))
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
whole_lab = any(name in LAB_VIEWS for name in names)

meshes = [o for o in scene.objects if o.type == 'MESH']
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
centre = (lo + hi) / 2
span = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)

world = bpy.data.worlds.new('Lab')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.45, 0.5, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55 if whole_lab else 0.7

def to_blender(p):
    # glTF (x, y, z) -> Blender (x, -z, y).
    return Vector((p[0], -p[2], p[1]))

if whole_lab:
    for name, location, energy, size in (('Sun', (0, 0, 24), 5000, 24), ('FillL', (-14, -12, 9), 1500, 12), ('FillR', (14, -10, 9), 1500, 12), ('Door', (0, -16, 5), 1500, 14)):
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.rotation_euler = (Vector((0, -2, 0)) - light.location).to_track_quat('-Z', 'Y').to_euler()
else:
    bpy.ops.mesh.primitive_plane_add(size=span * 14, location=(0, 0, lo.z))
    floor = bpy.context.active_object
    grey = bpy.data.materials.new('Studio floor')
    grey.use_nodes = True
    grey.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.30, 0.31, 0.32, 1)
    grey.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    floor.data.materials.append(grey)
    for name, location, energy in (('Key', (4, -3, 6), 900), ('Fill', (-5, -2, 4), 350), ('Back', (0, 6, 5), 500)):
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
camera.data.lens = 28 if whole_lab else 50
for name in names:
    if name in LAB_VIEWS:
        position, target = LAB_VIEWS[name]
        camera.location = to_blender(position)
        look = to_blender(target)
    else:
        direction, factor = SINGLE_VIEWS[name]
        g = Vector((direction[0], -direction[2], direction[1]))
        camera.location = centre + g.normalized() * span * 2.1 * factor
        look = centre
    camera.rotation_euler = (look - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out / f'{name}.png')
    bpy.ops.render.render(write_still=True)
print('rendered', len(names), 'views to', out)
