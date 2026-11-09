"""Build and review the carved warehouse in the Scablands works family."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', action='store_true')
parser.add_argument('--assemble-sheet', action='store_true')
parser.add_argument('--evidence', default='.evidence/2026-11-09/TOWN-ART-WORKS/round-1')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/town/works.glb'
textures = root / 'public/assets/models/wasteland/town/textures'
evidence = Path(args.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
sheet = root / 'docs/board/looks/town-art-works/warehouse/round-1.jpg'
blend = root / 'art-build/town/works.blend'

if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)],
                      'evidence': [str(evidence)] if args.render else [],
                      'summary': [str(sheet)] if args.render else []}))
    raise SystemExit(0)

if args.assemble_sheet:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    width, panel_h = 2048, 410
    labels = [('side', 'SIDE'), ('front', 'FRONT'), ('rear', 'REAR'), ('above', 'STRAIGHT DOWN')]
    canvas = Image.new('RGB', (width, 70 + 4 * (panel_h + 34) + 2 * (panel_h + 34)), (47, 47, 43))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 27)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
    draw.text((28, 15), 'TOWN WORKS | WAREHOUSE | ROUND 1', font=font, fill=(238, 223, 198))
    def fit_panel(path, xy, size):
        with Image.open(path) as source:
            image = ImageOps.contain(source.convert('RGB'), size, method=Image.Resampling.LANCZOS)
            x, y = xy
            canvas.paste(image, (x + (size[0] - image.width) // 2, y + (size[1] - image.height) // 2))
    row_y = 65
    for view, label in labels:
        draw.text((28, row_y), f'{label} | SOURCE PHOTO  /  EXPORTED GLB, SAME ORTHOGRAPHIC CAMERA', font=small, fill=(223, 184, 132))
        fit_panel(textures / f'warehouse-{"top" if view == "above" else view}.jpg', (16, row_y + 31), (1000, panel_h))
        fit_panel(evidence / f'{view}.png', (1032, row_y + 31), (1000, panel_h))
        row_y += panel_h + 34
    draw.text((28, row_y), 'THREE-QUARTER VIEWS | EXPORTED GLB', font=small, fill=(223, 184, 132))
    fit_panel(evidence / 'front-three-quarter.png', (16, row_y + 31), (1000, panel_h))
    fit_panel(evidence / 'rear-three-quarter.png', (1032, row_y + 31), (1000, panel_h))
    row_y += panel_h + 34
    draw.text((28, row_y), 'MAYOR VIEW | 45° DOWN, ROOF AND LOADING DOCK', font=small, fill=(223, 184, 132))
    fit_panel(evidence / 'mayor.png', (16, row_y + 31), (2016, panel_h))
    sheet.parent.mkdir(parents=True, exist_ok=True)
    for quality in (88, 84, 80, 76, 72, 68, 64, 60):
        canvas.save(sheet, 'JPEG', quality=quality, optimize=True, progressive=True)
        if sheet.stat().st_size <= 500_000:
            break
    if sheet.stat().st_size > 500_000:
        raise RuntimeError(f'round sheet is {sheet.stat().st_size} bytes; limit is 500 KB')
    print(json.dumps({'sheet': str(sheet), 'bytes': sheet.stat().st_size, 'dimensions': canvas.size}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from photo_carve import carve_object
from photo_model import Photo
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
render_masks = evidence / 'masks'
table = {
    'photos': {'side': 'warehouse-side.jpg', 'front': 'warehouse-front.jpg',
               'rear': 'warehouse-rear.jpg', 'top': 'warehouse-top.jpg'},
    'length': 20.4, 'width': 9.4, 'height': 6.8,
    # Grid pixels measured from the four 1024px-wide reference photos.
    'side': {'start': 30, 'end': 995, 'ground': 422},
    # Both end photos state the roof peak's pixel row. The clear loading door
    # is 286 px high and sets a 3.6 m door on a 6.8 m body.
    'front': {'centre': 512, 'ground': 612, 'top': 78},
    'rear': {'centre': 512, 'ground': 612, 'top': 78},
    # The straight-down photo is turned 180 degrees for carve_object's front-first row order.
    'top': {'front': 57, 'rear': 953, 'centre': 342, 'x_scale': 9.4 / 400},
    'cut': {
        # Remove the two side loading-door panels; they are separate pieces.
        'side': [(300, 265, 435, 423), (744, 265, 878, 423)],
        # Keep the front opening and rear panel out of the carved shell.
        'front': [(367, 322, 650, 613)],
        'rear': [(402, 352, 607, 613)],
    },
    # Silver tin is close to the grey studio; a tight match keeps it in the mask.
    'grey': 22, 'tolerance': 26, 'bleed_tolerance': 38,
    'voxel': .11, 'target': 9000, 'mask_dir': str(render_masks),
}
body = carve_object('warehouse:body', textures, table)
# Voxel centres leave an 8 cm lower edge above the measured floor; seat it on y=0.
body.location.z -= .08

def simple_material(name, colour, metallic=.1):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*colour, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = .88
    return material

oxide = simple_material('Warehouse / burnt oxide', (.22, .075, .035), .25)
dark = simple_material('Warehouse / iron shadow', (.065, .07, .066), .35)
tin = simple_material('Warehouse / patched tin', (.31, .29, .24), .3)
family = bpy.data.objects.new('town-works', None); bpy.context.collection.objects.link(family)
building = bpy.data.objects.new('warehouse', None); bpy.context.collection.objects.link(building)
building.parent = family
body.parent = building

def game_loc(point):
    return town.game_vector(point)

def add_box(name, center, size, material, bevel=.025):
    obj = town.cube(name, center, size, material, bevel)
    obj.parent = building
    return obj

def add_door(name, center, width, height, rotation=0):
    obj = town.corrugated_sheet(name, center, width, height,
                                {'galvanised-tin': tin, 'iron-dark': dark}, bent=.035)
    obj.rotation_euler[2] = rotation
    obj.parent = building
    # Dark edge rails and three formed ribs make the leaves read as sliding doors.
    x, y, z = center
    if abs(rotation) < .1:
        for edge in (-1, 1):
            rail = add_box(name + f'-edge-{edge}', (x + edge * width * .48, y + height / 2, z - .035),
                           (.09, height, .08), oxide, .01)
        for row in (1, 2, 3):
            add_box(name + f'-rib-{row}', (x, y + row * height / 4, z - .075),
                    (width * .91, .065, .06), oxide, .01)
    return obj

piece_names = []
def piece(name):
    parent = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(parent)
    parent.parent = building; piece_names.append(parent)
    return parent

# Front road-side sliding doors: two leaves meet over the 3.7 m opening.
for side in (-1, 1):
    parent = piece(f'warehouse:loading-door-front-{"left" if side < 0 else "right"}')
    door = add_door(f'warehouse-front-door-leaf-{side}', (side * .91, 1.91, -10.18), 1.88, 3.62)
    door.parent = parent
    rail = add_box(f'warehouse-front-door-rail-{side}', (side * .91, 3.86, -10.22), (2.0, .13, .12), dark, .02)
    rail.parent = parent

# Two broad sliding leaves on each long wall, aligned with the photographed panels.
for hand in (-1, 1):
    for index, z in enumerate((-5.7, 5.7), 1):
        parent = piece(f'warehouse:loading-door-side-{hand}-{index}')
        angle = math.pi / 2 if hand > 0 else -math.pi / 2
        leaf = town.corrugated_sheet(f'warehouse-side-door-{hand}-{index}', (hand * 4.68, 1.52, z),
                                     2.9, 3.05, {'galvanised-tin': tin, 'iron-dark': dark}, bent=.02)
        leaf.rotation_euler[2] = angle; leaf.parent = parent
        for y in (.12, 3.00):
            rail = add_box(f'warehouse-side-door-frame-{hand}-{index}-{y}',
                           (hand * 4.69, y, z), (3.04, .10, .12), oxide, .01)
            rail.rotation_euler[2] = math.pi / 2
            rail.parent = parent

# The rear loading leaf is a separate, closed panel.
rear_door = piece('warehouse:loading-door-rear')
leaf = town.corrugated_sheet('warehouse-rear-door-leaf', (0, 1.85, 10.10), 2.65, 3.05,
                             {'galvanised-tin': tin, 'iron-dark': dark}, bent=.02)
leaf.rotation_euler[2] = math.pi; leaf.parent = rear_door

# Low loading dock and three steel supports; the supports reach the ground.
dock = piece('warehouse:dock')
deck = add_box('warehouse-loading-dock-slab', (0, .62, -10.80), (6.0, .24, 1.20), oxide, .035)
deck.parent = dock
for x in (-2.65, 0, 2.65):
    support = add_box(f'warehouse-dock-foot-{x}', (x, .30, -10.80), (.30, .60, 1.00), dark, .025)
    support.parent = dock
for x in (-2.7, 2.7):
    bumper = add_box(f'warehouse-dock-bumper-{x}', (x, .82, -10.18), (.28, .45, .16), tin, .025)
    bumper.parent = dock

# Roof vents sit on the ridge skin. Their bases overlap the carved roof slightly.
for index, z in enumerate((-3.5, 3.8), 1):
    parent = piece(f'warehouse:roof-vent-{index}')
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.26, depth=1.05,
                                        location=game_loc((0, 7.18, z)))
    tube = bpy.context.object; tube.name = f'warehouse-roof-vent-{index}-stack'; tube.data.materials.append(oxide)
    tube.parent = parent
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.40, depth=.12,
                                        location=game_loc((0, 7.75, z)))
    cap = bpy.context.object; cap.name = f'warehouse-roof-vent-{index}-cap'; cap.data.materials.append(tin)
    cap.parent = parent

out.parent.mkdir(parents=True, exist_ok=True)
town.export_glb(out)

def bounds_for(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    if not points:
        raise RuntimeError('piece has no mesh bounds')
    return ((min(v.x for v in points), max(v.x for v in points)),
            (min(v.z for v in points), max(v.z for v in points)),
            (-max(v.y for v in points), -min(v.y for v in points)))

def descendants(parent):
    result = []
    for child in parent.children:
        result.append(child); result.extend(descendants(child))
    return result

all_piece_roots = [body, *piece_names]
body_bounds = bounds_for([body])
print('warehouse:body bounds x/y/z', body_bounds)
assert body_bounds[1][0] <= .03, 'carved shell must touch the ground'
for item in all_piece_roots:
    meshes = [item] if item == body else [obj for obj in descendants(item) if obj.type == 'MESH']
    if item != body and item.type == 'MESH': meshes.append(item)
    b = bounds_for(meshes)
    print(f'{item.name} bounds x/y/z', b)
    assert b[0][0] >= -11.5 and b[0][1] <= 11.5 and b[2][0] >= -11.5 and b[2][1] <= 11.5, f'{item.name} exceeds the 3x3 m footprint margin'
    if item != body:
        touching = all(b[axis][0] <= body_bounds[axis][1] + .08 and b[axis][1] >= body_bounds[axis][0] - .08 for axis in range(3))
        touches_ground = b[1][0] <= .03
        assert touching or touches_ground, f'{item.name} floats free of the body and ground'

if args.render:
    # Re-import the exported GLB in a clean scene; all review renders use that file.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 12; scene.cycles.use_denoising = True
    scene.render.resolution_x = 1024; scene.render.resolution_y = 768; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'Medium High Contrast'
    scene.world = bpy.data.worlds.new('Warehouse soft grey studio'); scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.43, .43, .41, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
    bpy.ops.mesh.primitive_plane_add(size=100, location=(0, -.025, 0))
    plane = bpy.context.object; plane.name = 'review-only grey ground'
    ground = simple_material('Review / grey ground', (.31, .31, .29), 0)
    plane.data.materials.append(ground)
    for location, power, size in [((18, 25, -18), 9500, 16), ((-16, 12, 18), 6500, 14)]:
        bpy.ops.object.light_add(type='AREA', location=game_loc(location))
        light = bpy.context.object; light.data.energy = power; light.data.shape = 'DISK'; light.data.size = size
        light.rotation_euler = (game_loc((0, 3.5, 0)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=game_loc((0, 12, -30)))
    camera = bpy.context.object; camera.data.type = 'ORTHO'; scene.camera = camera
    def render_view(name, location, target, scale):
        camera.location = game_loc(location)
        camera.rotation_euler = (game_loc(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = scale
        if name == 'side':
            scene.render.resolution_x, scene.render.resolution_y = 1024, 512
        elif name in ('front', 'rear'):
            scene.render.resolution_x, scene.render.resolution_y = 1024, 683
        elif name == 'above':
            scene.render.resolution_x, scene.render.resolution_y = 683, 1024
        elif name == 'mayor':
            scene.render.resolution_x, scene.render.resolution_y = 1280, 720
        else:
            scene.render.resolution_x, scene.render.resolution_y = 1024, 768
        scene.render.filepath = str(evidence / f'{name}.png')
        bpy.ops.render.render(write_still=True)
    evidence.mkdir(parents=True, exist_ok=True)
    render_view('side', (24, 4, 0), (0, 3.3, 0), 23.5)
    render_view('front', (0, 4, -27), (0, 3.6, 0), 14.5)
    render_view('rear', (0, 4, 27), (0, 3.6, 0), 14.5)
    render_view('above', (0, 37, 0), (0, 0, 0), 16)
    render_view('front-three-quarter', (22, 15, -24), (0, 3.5, 0), 28)
    render_view('rear-three-quarter', (-22, 15, 22), (0, 3.5, 0), 28)
    render_view('mayor', (42, 62, -42), (0, 3.2, 0), 34)
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    import subprocess
    subprocess.run(['python', str(Path(__file__).resolve()), '--root', str(root),
                    '--evidence', str(evidence), '--assemble-sheet'], check=True)
    print(json.dumps({'glb': str(out), 'sheet': str(sheet)}))
