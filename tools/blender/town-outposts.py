"""TOWN-ART-OUTPOSTS round 3: Dot's Diner, measured and carved from four views.

Run with Blender 4.5:
  blender -b -t 4 --python-exit-code 1 --python tools/blender/town-outposts.py -- --root .
Photo pixels are read from the gridded references in docs/board/looks/town-art-outposts/round-2-review.md.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--render-dir', default='.evidence/2026-11-06/TOWN-ART-OUTPOSTS/round-3')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/town/outposts.glb'
blend = root / 'art-build/town/outposts.blend'
sheet = root / 'docs/board/looks/town-art-outposts/round-3.jpg'
render = Path(a.render_dir)
render = render if render.is_absolute() else root / render
textures = root / 'public/assets/models/wasteland/town/textures'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from photo_model import Mesh, Photo
from photo_carve import carve_object
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render.mkdir(parents=True, exist_ok=True)

# Pixel measures from photo_grid.py overlays. Front/rear scales are derived
# from the shared side scale; the generated end views are proportionally
# normalized in the pick functions below instead of assigning new metre scales.
# The new rear reference includes the damaged airframe above the bus; the table
# removes that unreachable patch instead of letting it widen the carved hull.
table = {
    'photos': {'side': 'dot-diner-side.jpg', 'front': 'dot-diner-front.jpg',
               'rear': 'dot-diner-rear.jpg', 'top': 'dot-diner-overhead.jpg'},
    'length': 29.0, 'width': 8.2, 'height': 8.1,
    'side': {'start': 15, 'end': 1011, 'ground': 558},
    'front': {'centre': 656, 'ground': 1112},
    'rear': {'centre': 615, 'ground': 1120},
    'top': {'front': 12, 'rear': 1012, 'centre': 161, 'along': 'x', 'x_scale': 8.2 / (222 - 82)},
    'cut': {
        # The side porch sits below and outside the continuous fuselage/bus body.
        'side': [(115, 444, 890, 560)],
        # The sign mast is not part of the airframe; keep its picture for the slab below.
        'front': [(480, 0, 830, 300)],
        # Remove wing and tailplane above the bus's rear silhouette.
        'rear': [(0, 0, 1312, 390), (1020, 390, 1312, 1199)],
        # Remove the side porch and roof sign from the top-down hull silhouette.
        'top': [(0, 220, 1024, 341), (280, 0, 610, 82)],
    },
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 48,
    'voxel': .12, 'target': 10500,
    'mask_dir': str(render / 'masks'),
}
body = carve_object('dot-diner:body', textures, table)

family = bpy.data.objects.new('town-outposts', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'
diner = bpy.data.objects.new('dot-diner', None)
bpy.context.collection.objects.link(diner)
diner.empty_display_type = 'CUBE'
diner.parent = family
body.parent = diner

# Simple, weathered salvage materials. Each box still has a measured UV map;
# metallic values stay under the town art limit.
def material(name, color, metallic=0.0, roughness=.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = min(metallic, .3)
    shader.inputs['Roughness'].default_value = roughness
    return mat

wood = material('sun-bleached porch timber', (.31, .22, .13))
rust = material('rusted red steel', (.28, .095, .045), .25)
dark = material('soot-dark iron', (.075, .073, .064), .22)
paint = material('faded diner paint', (.34, .30, .22))

def cube(name, center, size, mat):
    obj = town.cube('dot-diner:' + name, center, size, mat, .018)
    obj.parent = diner
    return obj

# Porch on the true road-side shoulder. Its posts start at the ground and meet
# the deck; the tables stand on the deck, and each has legs to that same deck.
porch_x = -1.6
porch_z0, porch_z1 = -10.0, 11.0
deck_y = .82
cube('porch-deck', (porch_x, deck_y, (porch_z0 + porch_z1) / 2), (3.0, .26, porch_z1 - porch_z0), wood)
for i, z in enumerate(np.linspace(porch_z0 + .18, porch_z1 - .18, 8)):
    cube(f'porch-post-{i + 1}', (porch_x - 1.38, .42, float(z)), (.16, .84, .16), wood)
    cube(f'porch-wall-bracket-{i + 1}', (porch_x + 1.35, 1.56, float(z)), (.14, 1.48, .14), rust)
cube('porch-outer-rail', (porch_x - 1.38, 1.25, 0.5), (.13, .12, 20.7), wood)
cube('porch-canopy', (porch_x, 3.12, .5), (3.05, .2, 21.8), rust)
for i, z in enumerate((-7.6, -2.4, 2.8, 8.0)):
    cube(f'table-{i + 1}-top', (porch_x - .15, 1.57, z), (1.45, .12, 1.2), paint)
    for dx in (-.59, .59):
        for dz in (-.46, .46):
            cube(f'table-{i + 1}-leg-{dx}-{dz}', (porch_x - .15 + dx, 1.17, z + dz), (.07, .8, .07), dark)

# Pump stands at the roadside end of the porch, its feet on the earth and its
# body attached to the ground plate. Hose and nozzle are recognizable details.
pump_x, pump_z = -2.55, -11.15
cube('fuel-pump-foot', (pump_x, .10, pump_z), (.86, .20, .72), dark)
cube('fuel-pump-body', (pump_x, 1.06, pump_z), (.68, 1.75, .62), rust)
cube('fuel-pump-face', (pump_x, 1.51, pump_z - .321), (.46, .48, .025), paint)
cube('fuel-pump-display', (pump_x, 1.57, pump_z - .34), (.29, .16, .025), dark)

# Sign: one thick slab on two real timber posts. Front and back use separate
# UVs; the back reverses picture X so DOT'S reads correctly from either side.
side = Photo(textures / 'dot-diner-side.jpg')
sign = Mesh()
x0, x1, y0, y1 = -4.0, 4.0, 6.55, 9.05
z_front, z_back = -4.8, -4.98
quad = [(x0, y0, z_front), (x1, y0, z_front), (x1, y1, z_front), (x0, y1, z_front)]
uv = [side.uv(385, 322), side.uv(760, 322), side.uv(760, 238), side.uv(385, 238)]
sign.face(quad, uv, 'sign')
sign.face([(x1, y0, z_back), (x0, y0, z_back), (x0, y1, z_back), (x1, y1, z_back)],
          [side.uv(385, 322), side.uv(760, 322), side.uv(760, 238), side.uv(385, 238)], 'sign')
sign.face([(x0, y0, z_back), (x0, y0, z_front), (x0, y1, z_front), (x0, y1, z_back)],
          [side.uv(385, 322)] * 4, 'sign')
sign.face([(x1, y0, z_front), (x1, y0, z_back), (x1, y1, z_back), (x1, y1, z_front)],
          [side.uv(760, 322)] * 4, 'sign')
sign_obj = sign.finish('dot-diner:sign-slab', {'sign': side.material()})
sign_obj.parent = diner
for i, x in enumerate((-3.25, 3.25)):
    cube(f'sign-post-{i + 1}', (x, 4.53, -4.88), (.18, 4.05, .2), wood)
    cube(f'sign-cross-brace-{i + 1}', (x, 6.25, -4.88), (.11, .12, .32), dark)

# Export and read the exact GLB back before making review views.
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100
scene.render.resolution_x, scene.render.resolution_y = 820, 600
scene.world = bpy.data.worlds.new('flat neutral studio')
scene.world.color = (.42, .42, .42)
scene.render.film_transparent = False

def area(name, loc, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 3, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

area('soft sky', (0, 25, -12), 3600, 20)
area('open fill', (-16, 14, 16), 1900, 15)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def shot(name, eye, target, ortho):
    camera.location = (eye[0], -eye[2], eye[1])
    camera.rotation_euler = (Vector((target[0], -target[2], target[1])) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('model-side', (-44, 9, 0), (0, 4.3, 0), 38)
shot('model-front', (0, 9, -40), (0, 4.3, 0), 24)
shot('model-above', (0, 58, 0), (0, 1.8, 0), 38)
shot('model-three-quarter-road', (-24, 19, -29), (0, 4, 0), 38)
shot('model-three-quarter-back', (24, 17, 27), (0, 4, 0), 38)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('model-*.png'))]}))
