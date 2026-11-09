"""Build and review the warehouse, kiln and sawmill in the Scablands works family."""
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
parser.add_argument('--evidence', default='.evidence/2026-11-09/TOWN-ART-WORKS/round-2')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/town/works.glb'
textures = root / 'public/assets/models/wasteland/town/textures'
evidence = Path(args.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
sheet = root / 'docs/board/looks/town-art-works-sawmill/round-2.jpg'
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
    draw.text((28, 15), 'TOWN WORKS | SAWMILL | ROUND 2', font=font, fill=(238, 223, 198))
    def fit_panel(path, xy, size):
        with Image.open(path) as source:
            image = ImageOps.contain(source.convert('RGB'), size, method=Image.Resampling.LANCZOS)
            x, y = xy
            canvas.paste(image, (x + (size[0] - image.width) // 2, y + (size[1] - image.height) // 2))
    row_y = 65
    for view, label in labels:
        draw.text((28, row_y), f'{label} | SOURCE PHOTO  /  EXPORTED GLB, SAME ORTHOGRAPHIC CAMERA', font=small, fill=(223, 184, 132))
        fit_panel(textures / f'sawmill-{"roof" if view == "above" else view}.jpg', (16, row_y + 31), (1000, panel_h))
        fit_panel(evidence / f'{view}.png', (1032, row_y + 31), (1000, panel_h))
        row_y += panel_h + 34
    draw.text((28, row_y), 'THREE-QUARTER VIEWS | EXPORTED GLB', font=small, fill=(223, 184, 132))
    fit_panel(evidence / 'front-three-quarter.png', (16, row_y + 31), (1000, panel_h))
    fit_panel(evidence / 'rear-three-quarter.png', (1032, row_y + 31), (1000, panel_h))
    row_y += panel_h + 34
    draw.text((28, row_y), 'MAYOR VIEW | 45° DOWN, OPEN SHED AND WORKING SAW', font=small, fill=(223, 184, 132))
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
from photo_model import Photo, Mesh, Photo, lathe, trace, slab
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
    'voxel': .11, 'target': 6000, 'mask_dir': str(render_masks),
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

def add_door(name, center, width, height, owner, rotation=0):
    obj = town.corrugated_sheet(name, center, width, height,
                                {'galvanised-tin': tin, 'iron-dark': dark}, bent=.035)
    obj.rotation_euler[2] = rotation
    obj.parent = owner
    # Dark edge rails and three formed ribs make the leaves read as sliding doors.
    x, y, z = center
    if abs(rotation) < .1:
        for edge in (-1, 1):
            rail = add_box(name + f'-edge-{edge}', (x + edge * width * .48, y, z - .035),
                           (.09, height, .08), oxide, .01)
            rail.parent = owner
        for row in (1, 2, 3):
            rib = add_box(name + f'-rib-{row}', (x, y - height / 2 + row * height / 4, z - .075),
                          (width * .91, .065, .06), oxide, .01)
            rib.parent = owner
    return obj

piece_names = []
def piece(name):
    parent = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(parent)
    parent.parent = building; piece_names.append(parent)
    return parent

# Front road-side sliding doors: two leaves meet over the 3.7 m opening.
for side in (-1, 1):
    parent = piece(f'warehouse:loading-door-front-{"left" if side < 0 else "right"}')
    door = add_door(f'warehouse-front-door-leaf-{side}', (side * .91, 1.91, -10.18), 1.88, 3.62, parent)
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

# TOWN-ART-WORKS, round 1: brick beehive kiln. Original reference photos were
# generated with OpenAI image generation on 9 November 2026: kiln-dome-side.jpg,
# kiln-dome-front.jpg, kiln-dome-rear.jpg, kiln-dome-top.jpg, kiln-chimney.jpg,
# and kiln-door.jpg.
kiln = bpy.data.objects.new('kiln', None); bpy.context.collection.objects.link(kiln); kiln.parent = family
dome_side = Photo(textures / 'kiln-dome-side.jpg')
dome_front = Photo(textures / 'kiln-dome-front.jpg')
dome_rear = Photo(textures / 'kiln-dome-rear.jpg')
dome_top = Photo(textures / 'kiln-dome-top.jpg')
chimney_photo = Photo(textures / 'kiln-chimney.jpg')

def kiln_piece(name):
    parent = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(parent)
    parent.parent = kiln
    return parent

dome_piece = kiln_piece('kiln:body')
dome_mesh = Mesh()
dome_px_m = .00632
dome_stations = [((633 - py) * dome_px_m, radius_px * dome_px_m) for py, radius_px in
                 ((633, 446), (590, 445), (550, 446), (510, 444), (470, 439),
                  (430, 432), (390, 423), (350, 410), (310, 394), (270, 375),
                  (230, 352), (190, 325), (150, 292), (110, 248), (70, 188),
                  (30, 20))]
def dome_uv(index, distance, radius, angle):
    # Map the side photo's silhouette around the lathe; 0.85 keeps edge pixels out.
    px = dome_side.w / 2 + (radius / dome_px_m) * math.cos(angle) * .85
    py = 633 - distance / dome_px_m
    return dome_side.uv(px, py)
lathe(dome_mesh, 'dome', (0, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
      dome_stations, dome_uv, sides=32,
      cap_start=('dome', lambda angle, fraction: dome_side.uv(512, 615)),
      cap_end=('top', lambda angle, fraction: dome_top.uv(512 + math.cos(angle) * fraction * 360,
                                                           342 + math.sin(angle) * fraction * 360)))
dome_obj = dome_mesh.finish('kiln-dome-brick-shell', {'dome': dome_side.material(), 'top': dome_top.material()})
dome_obj.parent = dome_piece

chimney_piece = kiln_piece('kiln:chimney')
chimney_mesh = Mesh()
chimney_stations = [(0, .61), (.26, .60), (.90, .59), (1.8, .57),
                    (2.6, .54), (3.4, .51), (4.2, .49), (4.6, .48),
                    (4.85, .57), (4.98, .58), (5.02, .55)]
def chimney_uv(index, distance, radius, angle):
    px = chimney_photo.w / 2 + (radius / .0061) * math.cos(angle) * .85
    py = 1000 - distance / 5.02 * 965
    return chimney_photo.uv(px, py)
lathe(chimney_mesh, 'chimney', (3.35, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
      chimney_stations, chimney_uv, sides=20,
      cap_start=('chimney', lambda angle, fraction: chimney_photo.uv(340, 990)),
      cap_end=('chimney', lambda angle, fraction: chimney_photo.uv(340, 45)))
chimney_obj = chimney_mesh.finish('kiln-brick-chimney', {'chimney': chimney_photo.material()})
chimney_obj.parent = chimney_piece

# The arch is a separate photographed facing set into the curved front. Its
# own backing remains dark; the named emitter is visible just inside it.
door_piece = kiln_piece('kiln:door')
door_mesh = Mesh()
door_photo = Photo(textures / 'kiln-door.jpg')
cx, floor_px, scale = 512, 620, .00315
outer = []; inner = []
for i in range(13):
    theta = math.pi - i * math.pi / 12
    outer.append((cx + math.cos(theta) * 235, 360 - math.sin(theta) * 235))
    inner.append((cx + math.cos(theta) * 167, 395 - math.sin(theta) * 167))
outer += [(cx + 235, floor_px), (cx - 235, floor_px)]
inner += [(cx + 167, 585), (cx - 167, 585)]
def door_point(pixel):
    px, py = pixel
    x = (px - cx) * scale
    y = (floor_px - py) * scale
    z = -math.sqrt(max(.01, 2.82 * 2.82 - x * x)) - .04
    return (x, y, z)
for i in range(len(outer)):
    j = (i + 1) % len(outer)
    door_mesh.face([door_point(outer[i]), door_point(outer[j]), door_point(inner[j]), door_point(inner[i])],
                    [door_photo.uv(*p) for p in (outer[i], outer[j], inner[j], inner[i])], 'door', (0, 0, -1))
door_mesh.face([door_point(p) for p in inner], [door_photo.uv(*p) for p in inner], 'door', (0, 0, -1))
door_obj = door_mesh.finish('kiln-arched-firedoor-photo', {'door': door_photo.material()})
door_obj.parent = door_piece

lamp_piece = kiln_piece('kiln:lamp')
lamp_mat = bpy.data.materials.new('Kiln / fire glow')
lamp_mat.use_nodes = True
nodes = lamp_mat.node_tree.nodes; nodes.clear()
emission = nodes.new('ShaderNodeEmission'); emission.inputs['Color'].default_value = (1.0, .12, .008, 1)
emission.inputs['Strength'].default_value = 2.5
output = nodes.new('ShaderNodeOutputMaterial'); lamp_mat.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=town.game_vector((0, .42, -2.86)))
fire = bpy.context.object; fire.name = 'kiln-door-fire-glow'; fire.scale = (.26, .035, .30)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); fire.data.materials.append(lamp_mat); fire.parent = lamp_piece

brick_piece = kiln_piece('kiln:brick-stacks')
kiln_mats = town.make_materials()
for row, (count, y) in enumerate(((4, .12), (3, .38), (2, .64)), 1):
    offset = -(count - 1) * .34 / 2
    for n in range(count):
        x = -3.25 + offset + n * .34
        brick = town.cube(f'kiln-fired-brick-{row}-{n+1}', (x, y, -1.15 + (row % 2) * .11),
                          (.32, .24, .22), kiln_mats['salvaged-brick'], .012)
        brick.parent = brick_piece

wood_piece = kiln_piece('kiln:woodpile')
for row in range(3):
    for n in range(3 - row):
        x0 = -3.35 + n * .54 + row * .27
        z0 = 2.05 + row * .28
        log = town.beam(f'kiln-seasoned-log-{row+1}-{n+1}', (x0, .10 + row * .29, z0),
                        (x0 + 1.08, .10 + row * .29, z0), .20, kiln_mats['weathered-plank'])
        log.parent = wood_piece
for index in range(3):
    end = town.cube(f'kiln-log-end-ring-{index+1}', (-3.2 + index * .54, .10 + index * .29, 2.05 + index * .28),
                    (.07, .20, .20), kiln_mats['salvaged-brick'], .012)
    end.parent = wood_piece

# TOWN-ART-WORKS, round 2: Sal's open saw shed. The roof and photographed frame
# are separate so the open bays stay open. The workbench is the only carved body;
# the blade, carriage log, log stacks and sawdust are separate round pieces.
sawmill = bpy.data.objects.new('sawmill', None); bpy.context.collection.objects.link(sawmill); sawmill.parent = family
sawmill.empty_display_type = 'CUBE'
sawmill_mats = town.make_materials()
roof_top = Photo(textures / 'sawmill-roof.jpg')
roof_side = Photo(textures / 'sawmill-side.jpg')
blade_photo = Photo(textures / 'sawmill-blade.jpg')
bark_photo = Photo(textures / 'sawmill-bark.jpg')
log_end_photo = Photo(textures / 'timber-weathered-logs.jpg')
dust_photo = Photo(textures / 'sawmill-sawdust.jpg')

def sawmill_piece(name):
    parent = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(parent)
    parent.parent = sawmill
    return parent

frame_piece = sawmill_piece('sawmill:timber-frame')
def frame_beam(name, a, b, width):
    obj = town.beam('sawmill-' + name, a, b, width, sawmill_mats['weathered-plank'])
    obj.parent = frame_piece
    return obj

# The side photo is 2.63 times its ground-to-ridge height; the front photo's
# measured span is 15.0 m and its roof pitch is 37 degrees. These dimensions
# fit the 3 by 2 cells with 0.5 m clearance: 16.0 m long, 15.0 m wide.
mill_length = 15.0
mill_half_span = 3.75
mill_eave = 3.55
mill_ridge = 5.7
front = Photo(textures / 'sawmill-front.jpg')
front_rgb = front.rgb()
timber_mask = np.zeros(front_rgb.shape[:2], dtype=bool)
# Keep only the measured timber members. The spaces between them are studio
# background and must stay open even where the truss encloses them.
timber_polygons = [
    [(117,300),(153,300),(153,735),(117,735)],
    [(870,300),(907,300),(907,735),(870,735)],
    [(501,91),(523,91),(523,339),(501,339)],
    [(132,295),(892,295),(892,329),(132,329)],
    [(499,25),(520,25),(153,310),(132,300)],
    [(505,25),(525,25),(892,300),(871,310)],
    [(141,390),(163,400),(260,310),(239,300)],
    [(879,390),(857,400),(760,310),(781,300)],
    [(158,365),(177,376),(263,321),(248,307)],
    [(862,365),(843,376),(757,321),(772,307)],
]
for polygon in timber_polygons:
    xx, yy = np.meshgrid(np.arange(front.w), np.arange(front.h))
    inside_poly = np.zeros_like(timber_mask)
    for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1]):
        crossing = ((y0 > yy) != (y1 > yy)) & (
            xx < (x1 - x0) * (yy - y0) / (y1 - y0 + 1e-12) + x0)
        inside_poly ^= crossing
    timber_mask |= inside_poly
front_loops = trace(timber_mask, (65, 75, 955, 395), tolerance=2.0, min_area=70)
side_scale = mill_length / (1000 - 20)
front_ground, front_centre, front_span_px = 735, 512, 930
front_scale = (mill_half_span * 2) / front_span_px
def gable_world(px, py, d):
    return ((px-front_centre)*front_scale, (front_ground-py)*front_scale,
            d)
for line_index, z in enumerate((-7.25, -3.625, 0.0, 3.625, 7.25)):
    frame_mesh = Mesh()
    slab(frame_mesh, 'frame', front, front_loops, gable_world,
         z-.20, z+.20, wall_scale=front_scale)
    traced = frame_mesh.finish(f'sawmill-timber-frame-line-{line_index+1}',
                               {'frame': front.material()})
    traced.parent = frame_piece

# A corrugated pitched skin carries a roof-plan photograph outside and the
# saw shed's side photograph below. The folded strip geometry catches light.
roof_piece = sawmill_piece('sawmill:tin-roof')
verts = []; faces = []; uv_top = []; uv_under = []; material_ids = []
steps = 12; across = 16; half_run = mill_half_span; ridge_y = mill_ridge; eave_y = mill_eave; half_depth = mill_length / 2
top_base = []; bottom_base = []
for hand in (-1, 1):
    start = len(top_base)
    for j in range(across + 1):
        t = j / across
        x = hand * half_run * t
        base_y = ridge_y + (eave_y - ridge_y) * t
        wave = .035 * (1 if j % 2 == 0 else -1)
        y = base_y + wave
        for i in range(steps + 1):
            z = -half_depth + 2 * half_depth * i / steps
            top_base.append(town.game_vector((x, y, z)))
            bottom_base.append(town.game_vector((x, y - .07, z)))
    for j in range(across):
        for i in range(steps):
            a = start + j * (steps + 1) + i
            b = a + 1; c = b + steps + 1; d = a + steps + 1
            verts.extend((top_base[a], top_base[b], top_base[c], top_base[d],
                          bottom_base[d], bottom_base[c], bottom_base[b], bottom_base[a]))
            base = len(verts) - 8
            faces.extend(((base, base+1, base+2, base+3), (base+4, base+5, base+6, base+7)))
            for px, py in ((a,0),(b,0),(c,0),(d,0),(d,1),(c,1),(b,1),(a,1)):
                if py == 0:
                    ti = px - start
                    row = ti // (steps + 1); col = ti % (steps + 1)
                    t = row / across; z = -half_depth + 2 * half_depth * col / steps
                    # Repeat the full photographed roof width across both
                    # slopes and map its full length to the shed's full length.
                    py_uv = roof_top.h * (0.26 + t * .55)
                    px_uv = roof_top.w * (z + half_depth) / (2 * half_depth)
                    uv_top.append(roof_top.uv(px_uv, py_uv))
                    side_x = col / steps * (roof_side.w - 1)
                    side_y = 215 + t * 120
                    uv_under.append(roof_side.uv(side_x, side_y))
                else:
                    uv_top.append((0, 0)); uv_under.append((0, 0))
            material_ids.extend((0, 1))
mesh = bpy.data.meshes.new('sawmill corrugated pitched roof skin'); mesh.from_pydata(verts, [], faces); mesh.update()
uvlayer = mesh.uv_layers.new(name='photographed roof surfaces')
for poly in mesh.polygons:
    for li in poly.loop_indices:
        uvlayer.data[li].uv = uv_top[li] if poly.index % 2 == 0 else uv_under[li]
obj = bpy.data.objects.new('sawmill-roof-corrugated-tin', mesh); bpy.context.collection.objects.link(obj)
obj.data.materials.append(roof_top.material()); obj.data.materials.append(roof_side.material())
for poly in mesh.polygons: poly.material_index = 0 if poly.index % 2 == 0 else 1
obj.parent = roof_piece

# Bench carve measured from the 1024 px views: a 4.25 m long body with a
# 1.58 m tabletop, on its own photographs, without the blade or carriage log.
bench_table = {
    'photos': {'side': 'bench-side.jpg', 'front': 'bench-front.jpg',
               'rear': 'bench-rear.jpg', 'top': 'bench-top.jpg'},
    'length': 4.25, 'width': 3.55, 'height': 1.58,
    'side': {'start': 12, 'end': 1010, 'ground': 628},
    'front': {'centre': 512, 'ground': 635, 'top': 171},
    'rear': {'centre': 512, 'ground': 635, 'top': 171},
    'top': {'front': 14, 'rear': 1008, 'centre': 390, 'along': 'x', 'x_scale': 3.55 / 520},
    'grey': 26, 'tolerance': 38, 'bleed_tolerance': 46,
    'voxel': .075, 'target': 4200, 'mask_dir': str(render_masks),
}
bench_piece = sawmill_piece('sawmill:bench')
bench_body = carve_object('sawmill:bench', textures, bench_table)
bench_body.location = town.game_vector((0, 0, 0))
bench_body.parent = bench_piece

# The blade is a thin photographed steel disc set into the leading edge of the
# bench. Both faces use the actual single-face blade photo.
blade_piece = sawmill_piece('sawmill:circular-saw')
blade_mesh = Mesh()
blade_radius = .60
def blade_uv(index, distance, radius, angle):
    return blade_photo.uv(blade_photo.w / 2 + math.cos(angle) * (radius / blade_radius) * blade_photo.w * .35,
                          blade_photo.h / 2 + math.sin(angle) * (radius / blade_radius) * blade_photo.h * .35)
lathe(blade_mesh, 'blade', (0, 1.60, -.25), (0, 0, 1), (1, 0, 0), (0, 1, 0),
      [(-.045, blade_radius), (.045, blade_radius)], blade_uv, sides=40,
      cap_start=('blade', lambda a, f: blade_photo.uv(blade_photo.w/2 + math.cos(a)*f*blade_photo.w*.35,
                                                        blade_photo.h/2 + math.sin(a)*f*blade_photo.h*.35)),
      cap_end=('blade', lambda a, f: blade_photo.uv(blade_photo.w/2 + math.cos(a)*f*blade_photo.w*.35,
                                                      blade_photo.h/2 + math.sin(a)*f*blade_photo.h*.35)))
blade_obj = blade_mesh.finish('sawmill-thin-circular-blade', {'blade': blade_photo.material()})
blade_obj.parent = blade_piece
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.21, depth=.13, location=town.game_vector((0, 1.60, -.31)))
hub = bpy.context.object; hub.name = 'sawmill-blade-arbor-hub'; hub.rotation_euler[0] = math.pi / 2
hub.data.materials.append(sawmill_mats['iron-dark']); hub.parent = blade_piece

# The carriage rails and rollers meet the table; the long bark-covered log
# lies on them, aimed from the front of the shed into the blade.
carriage_piece = sawmill_piece('sawmill:log-carriage')
for x in (-.72, .72):
    rail = town.beam(f'sawmill-carriage-rail-{x}', (x, 1.42, -4.65), (x, 1.42, -1.00), .16, sawmill_mats['weathered-plank'])
    rail.parent = carriage_piece
for z in (-4.2, -3.2, -2.2, -1.2):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.13, depth=1.55, location=town.game_vector((0, 1.53, z)))
    roller = bpy.context.object; roller.name = f'sawmill-carriage-roller-{z}'; roller.rotation_euler[1] = math.pi / 2
    roller.data.materials.append(sawmill_mats['iron-dark']); roller.parent = carriage_piece

def bark_log(name, center, axis, length, radius, parent):
    mesh = Mesh()
    if axis == 'x':
        origin=(center[0]-length/2, center[1], center[2]); direction=(1,0,0); u=(0,0,1); v=(0,1,0)
    else:
        origin=(center[0], center[1], center[2]-length/2); direction=(0,0,1); u=(1,0,0); v=(0,1,0)
    stations=[(0,radius),(length,radius)]
    def uv(i,d,r,a):
        # The source is a side-on log, so its long pixel axis follows the log;
        # sample only the bark strip and leave the grey studio out of the UVs.
        return bark_photo.uv(14 + d/length * (bark_photo.w - 28), 391 + math.sin(a) * 72)
    lathe(mesh,'bark',origin,direction,u,v,stations,uv,sides=16,
          cap_start=('end',lambda a,f:log_end_photo.uv(256+math.cos(a)*f*142,250+math.sin(a)*f*142)),
          cap_end=('end',lambda a,f:log_end_photo.uv(256+math.cos(a)*f*142,250+math.sin(a)*f*142)))
    obj=mesh.finish(name,{'bark':bark_photo.material(),'end':log_end_photo.material()}); obj.parent=parent
    return obj

carriage_log_piece = sawmill_piece('sawmill:log-on-carriage')
bark_log('sawmill-carriage-log', (0, 1.87, -2.85), 'z', 3.9, .34, carriage_log_piece)

for side, x in (('road', -7.1), ('far', 7.1)):
    stack = sawmill_piece(f'sawmill:log-stack-{side}')
    for row in range(3):
        for across_index in range(3 - row):
            z = 3.65 + across_index * .72 + row * .36
            bark_log(f'sawmill-{side}-stack-log-{row+1}-{across_index+1}',
                     (x, .36 + row * .59, z), 'x', 3.45, .36, stack)

# A low photographed sawdust heap rests directly on the shed floor near the
# saw exit. Its turned profile keeps it a mound from every angle.
dust_piece = sawmill_piece('sawmill:sawdust-heap')
dust_mesh = Mesh()
dust_stations=[(0,1.35),(.08,1.48),(.2,1.37),(.38,1.12),(.56,.73),(.72,.24),(.75,.03)]
def dust_uv(i,d,r,a):
    return dust_photo.uv(dust_photo.w/2 + math.cos(a)*r/1.48*dust_photo.w*.45,
                         dust_photo.h*.82 - d/.75*dust_photo.h*.43)
lathe(dust_mesh,'dust',(7.7,0,-2.7),(0,1,0),(1,0,0),(0,0,1),dust_stations,dust_uv,sides=28,
      cap_start=('dust',lambda a,f:dust_photo.uv(dust_photo.w/2+math.cos(a)*f*dust_photo.w*.45,dust_photo.h-3)),
      cap_end=('dust',lambda a,f:dust_photo.uv(dust_photo.w*.5,dust_photo.h*.47)))
dust_obj=dust_mesh.finish('sawmill-sawdust-photo-mound',{'dust':dust_photo.material()}); dust_obj.parent=dust_piece

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

kiln_bounds = {}
for item in kiln.children:
    meshes = [obj for obj in descendants(item) if obj.type == 'MESH']
    if item.type == 'MESH': meshes.append(item)
    b = bounds_for(meshes)
    kiln_bounds[item.name] = b
    print(f'{item.name} bounds x/y/z', b)
    assert b[0][0] >= -7.5 and b[0][1] <= 7.5 and b[2][0] >= -7.5 and b[2][1] <= 7.5, f'{item.name} exceeds the 2x2 footprint margin'
for item in kiln.children:
    b = kiln_bounds[item.name]
    touches_ground = b[1][0] <= .03
    touches_other = any(other_name != item.name and all(
        b[axis][0] <= other[axis][1] + .01 and b[axis][1] >= other[axis][0] - .01
        for axis in range(3)) for other_name, other in kiln_bounds.items())
    assert touches_ground or touches_other, f'{item.name} floats free of the ground and other pieces'
assert len(kiln_bounds) == 6, 'kiln body and five separate pieces are present'

sawmill_bounds = {}
for item in sawmill.children:
    meshes = [obj for obj in descendants(item) if obj.type == 'MESH']
    if item.type == 'MESH': meshes.append(item)
    b = bounds_for(meshes)
    sawmill_bounds[item.name] = b
    print(f'{item.name} bounds x/y/z', b)
    assert b[0][0] >= -11.5 and b[0][1] <= 11.5 and b[2][0] >= -7.5 and b[2][1] <= 7.5, f'{item.name} exceeds the 3x2 footprint margin'
for item in sawmill.children:
    b = sawmill_bounds[item.name]
    touches_ground = b[1][0] <= .04
    touches_other = any(other_name != item.name and all(
        b[axis][0] <= other[axis][1] + .08 and b[axis][1] >= other[axis][0] - .08
        for axis in range(3)) for other_name, other in sawmill_bounds.items())
    assert touches_ground or touches_other, f'{item.name} floats free of the ground and other pieces'
assert len(sawmill_bounds) == 9, 'sawmill frame, roof, bench, blade, carriage, log, two stacks and heap are present'

if args.render:
    # Re-import the exported GLB in a clean scene; all review renders use that file.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out))
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and not obj.name.startswith('sawmill'):
            obj.hide_render = True
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 12; scene.cycles.use_denoising = True
    scene.render.resolution_x = 1024; scene.render.resolution_y = 768; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'Medium High Contrast'
    scene.world = bpy.data.worlds.new('Sawmill soft grey studio'); scene.world.use_nodes = True
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
    bpy.ops.object.camera_add(location=game_loc((0, 5, -12)))
    camera = bpy.context.object; camera.data.type = 'ORTHO'; scene.camera = camera
    def render_view(name, location, target, scale):
        camera.location = game_loc(location)
        camera.rotation_euler = (game_loc(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        if name == 'above':
            camera.rotation_euler.rotate_axis('Z', math.pi / 2)
        camera.data.ortho_scale = scale
        if name == 'side':
            scene.render.resolution_x, scene.render.resolution_y = 1024, 512
        elif name in ('front', 'rear'):
            scene.render.resolution_x, scene.render.resolution_y = 1024, 683
        elif name == 'above':
            scene.render.resolution_x, scene.render.resolution_y = 1024, 683
        elif name == 'mayor':
            scene.render.resolution_x, scene.render.resolution_y = 1280, 720
        else:
            scene.render.resolution_x, scene.render.resolution_y = 1024, 768
        scene.render.filepath = str(evidence / f'{name}.png')
        bpy.ops.render.render(write_still=True)
    evidence.mkdir(parents=True, exist_ok=True)
    render_view('side', (20, 5.5, 0), (0, 3.8, 0), 17)
    render_view('front', (0, 6, -22), (0, 3.7, 0), 19)
    render_view('rear', (0, 6, 22), (0, 3.7, 0), 19)
    render_view('above', (0, 28, 0), (0, 0, 0), 25)
    render_view('front-three-quarter', (18, 12, -19), (0, 3.4, 0), 26)
    render_view('rear-three-quarter', (-18, 12, 19), (0, 3.4, 0), 26)
    render_view('mayor', (45, 64, -45), (0, 2.3, 0), 34)
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    import subprocess
    subprocess.run(['python', str(Path(__file__).resolve()), '--root', str(root),
                    '--evidence', str(evidence), '--assemble-sheet'], check=True)
    print(json.dumps({'glb': str(out), 'sheet': str(sheet)}))
