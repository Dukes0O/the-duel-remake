"""Build the original Dry Dam and render a GLB-reimport review sheet."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--assemble-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/dam.glb'
blend = root / 'art-build/wasteland-dam/dam.blend'
raw = root / f'.qa-dist/dam-round-{args.round}'
sheet = root / f'docs/board/looks/ww-art-dam/round-{args.round}.jpg'
texture_dir = root / 'public/assets/models/wasteland/scablands/textures'
ref = root / '.qa-dist/dam-photo-reference.png'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.assemble_only:
    from PIL import Image, ImageOps, ImageDraw, ImageFont
    reference = Image.open(ref).convert('RGB')
    captures = [Image.open(raw / name).convert('RGB') for name in (
        'lake-bed-200m.jpg', 'reference-40m.jpg', 'filling-shed-interior.jpg', 'dam-context.jpg')]
    cell_w, cell_h, header_h, pad = 820, 470, 34, 16
    canvas = Image.new('RGB', (cell_w * 2 + pad * 3, (cell_h + header_h) * 3 + pad * 4), (41, 43, 42))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    labels = ['Photographic dam reference', 'Basin: face from the lake bed at 200 m',
              'Car height: rail gate and face from 40 m', 'Filling shed: train-cab view',
              'Dam, gatehouse and spillway: basin context']
    positions = [(pad, pad), (pad * 2 + cell_w, pad),
                 (pad, pad * 2 + cell_h + header_h), (pad * 2 + cell_w, pad * 2 + cell_h + header_h),
                 (pad, pad * 3 + (cell_h + header_h) * 2)]
    for image, label, (x, y) in zip([reference] + captures, labels, positions):
        draw.text((x, y + 5), label, fill=(236, 236, 231), font=font)
        canvas.paste(ImageOps.fit(image, (cell_w, cell_h), method=Image.Resampling.LANCZOS), (x, y + header_h))
    sheet.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(sheet, 'JPEG', quality=86, optimize=True)
    print(f'Review sheet: {sheet} ({sheet.stat().st_size} bytes)')
    raise SystemExit(0)

import bpy
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'

sources = {
    'cracked-concrete': texture_dir / 'dam-concrete.jpg',
    'rusted-steel': texture_dir / 'dam-rust.jpg',
    'galvanised-tin': texture_dir / 'dam-steel.jpg',
    'weathered-plank': texture_dir / 'dam-water-stains.jpg',
}
missing = [str(path) for path in sources.values() if not path.is_file()]
if missing:
    raise FileNotFoundError('Dam material photos are missing: ' + ', '.join(missing))
materials = town.make_materials(sources)
materials['cracked-concrete'].name = 'Dam / cracked aggregate concrete'
materials['rusted-steel'].name = 'Dam / dark rusted steel'
materials['galvanised-tin'].name = 'Dam / old plated steel'
materials['weathered-plank'].name = 'Dam / salt and water streaks'
materials['sand'].name = 'Dam / lake-bed silt'
materials['iron-dark'].name = 'Dam / blackened iron'
materials['dirty-glass'].name = 'Dam / dusty glass'
materials['salvaged-brick'].name = 'Dam / dark masonry'
materials['cracked-concrete'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = 0
materials['rusted-steel'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .28
materials['galvanised-tin'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .28
materials['iron-dark'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .25

# The first render washed out the concrete against Blender's large soft lights.
# Darken the packed image pixels before export so both the Blender sheet and the
# delivered GLB retain the broken, stained surface instead of a pale grey sheet.
for name, exposure in (('cracked-concrete', .72), ('weathered-plank', .72), ('galvanised-tin', .83)):
    image_node = next(node for node in materials[name].node_tree.nodes if node.type == 'TEX_IMAGE')
    image = image_node.image
    pixels = list(image.pixels[:])
    for i in range(0, len(pixels), 4):
        pixels[i] = min(1, pixels[i] * exposure)
        pixels[i + 1] = min(1, pixels[i + 1] * exposure)
        pixels[i + 2] = min(1, pixels[i + 2] * exposure)
    image.pixels[:] = pixels
    image.update()


root_obj = bpy.data.objects.new('dam', None)
scene.collection.objects.link(root_obj)
root_obj['units'] = 'metres'
root_obj['up'] = '+Y'
root_obj['origin'] = 'rail-gate centre at ground level'
parts = []

def attach(obj, name, part):
    obj.name = name
    obj.parent = root_obj
    obj['part'] = part
    parts.append(obj)
    return obj

def box(name, center, size, mat, part, bevel=.04):
    obj = town.cube(name, center, size, mat, bevel)
    return attach(obj, name, part)

def beam(name, a, b, width, mat, part, bevel=.01):
    obj = town.beam(name, a, b, width, mat)
    return attach(obj, name, part)

def cylinder(name, center, radius, depth, mat, part, axis='Y', vertices=32):
    rotation = {'Y': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Z': (math.pi / 2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=town.game_vector(center), rotation=rotation)
    obj = bpy.context.object
    obj.data.materials.append(mat)
    return attach(obj, name, part)

def torus(name, center, major, minor, mat, part, axis='Y', major_segments=72, minor_segments=12):
    rotation = {'Y': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Z': (math.pi / 2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_torus_add(major_segments=major_segments, minor_segments=minor_segments,
                                     major_radius=major, minor_radius=minor,
                                     location=town.game_vector(center), rotation=rotation)
    obj = bpy.context.object
    obj.data.materials.append(mat)
    return attach(obj, name, part)

def mesh(name, vertices, faces, mat, part, uv_scale=2):
    data = bpy.data.meshes.new(name + ' mesh')
    data.from_pydata([town.game_vector(p) for p in vertices], [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    uv = data.uv_layers.new(name='Physical metre tile')
    for poly in data.polygons:
        for loop in poly.loop_indices:
            co = data.vertices[data.loops[loop].vertex_index].co
            # Scene coordinates are converted to Blender Y-up by game_vector.
            uv.data[loop].uv = (co.x / uv_scale, co.z / uv_scale)
    return attach(obj, name, part)

def ring_gear(name, center, radius, thickness, mat, part, teeth=28):
    """A forged ring with real open centre, thick web and individual tooth roots."""
    cx, cy, cz = center
    verts, faces = [], []
    steps = teeth * 4
    for layer, z_offset in enumerate((0, thickness)):
        for i in range(steps):
            a = 2 * math.pi * i / steps
            tooth = i % 4 in (1, 2)
            r = radius + (0.34 if tooth else 0)
            verts.extend(((cx + r * math.cos(a), cy + r * math.sin(a), cz + z_offset),
                          (cx + (radius - .72) * math.cos(a), cy + (radius - .72) * math.sin(a), cz + z_offset)))
    stride = steps * 2
    for layer in range(2):
        offset = layer * stride
        for i in range(steps):
            n = (i + 1) % steps
            faces.append((offset + i * 2, offset + n * 2, offset + n * 2 + 1, offset + i * 2 + 1))
    for i in range(steps):
        n = (i + 1) % steps
        faces.append((i * 2, n * 2, stride + n * 2, stride + i * 2))
        faces.append((i * 2 + 1, n * 2 + 1, stride + n * 2 + 1, stride + i * 2 + 1))
    return mesh(name, verts, faces, mat, part, 2)

# Main wall: a bowed, thick gravity dam with its top lower at the rocky shoulders.
# The rail gate is the separate entrance at the origin; the concrete face stands
# beyond the filling shed at the back of the 50 m deep dam structure.
xs = [-75 + i * 3 for i in range(51)]
ys = [0, 2.5, 5, 7.5, 10, 13, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]
front, back = [], []
for x in xs:
    top = 42 + 13 * math.sqrt(max(0, 1 - (x / 78) ** 2))
    z = -54 + 9 * (x / 75) ** 2
    for y in ys:
        front.append((x, min(y, top), z + .0012 * x * x))
        back.append((x, min(y, top), z - 12 + .0012 * x * x))
faces = []
for xi in range(len(xs) - 1):
    for yi in range(len(ys) - 1):
        ymid = (ys[yi] + ys[yi + 1]) / 2
        xmid = (xs[xi] + xs[xi + 1]) / 2
        a = xi * len(ys) + yi
        b = (xi + 1) * len(ys) + yi
        faces.append((a, a + 1, b + 1, b))
        # Back shell is closed with less visible faces, keeping a real wall thickness.
        faces.append((len(front) + a, len(front) + b, len(front) + b + 1, len(front) + a + 1))
for yi in range(len(ys) - 1):
    faces.append((yi, len(ys) + yi, len(front) + len(ys) + yi, len(front) + yi))
    a = (len(xs) - 1) * len(ys) + yi
    faces.append((a, len(front) + a, len(front) + a + 1, a + 1))
for xi in range(len(xs) - 1):
    a = xi * len(ys)
    b = (xi + 1) * len(ys)
    faces.append((a, len(front) + a, len(front) + b, b))
    a += len(ys) - 1
    b += len(ys) - 1
    faces.append((a, b, len(front) + b, len(front) + a))
wall = mesh('dam:face', front + back, faces, materials['cracked-concrete'], 'dam:face', uv_scale=5)
wall['dimensions_m'] = [150, 55, 12]

# Salt crust bands and individual long wet streaks are separate image-painted surfaces.
for i, x in enumerate(range(-68, 70, 8)):
    z = -54 + 9 * (x / 75) ** 2 + .0012 * x * x + .018
    top = 42 + 13 * math.sqrt(max(0, 1 - (x / 78) ** 2))
    heights = [10 + (i % 3) * .65, 33 + (i % 4) * .5]
    for j, y in enumerate(heights):
        w = 2.4 + (i % 4) * .34
        bottom = max(.4, y - (8.0 + (i % 3) * .9))
        verts = [(x, bottom, z), (x + w, bottom + .2, z),
                 (x + w * .6, min(top - 1, y + 2.2), z), (x - .15, y + 1.5, z)]
        mesh(f'dam-water-stain-{i}-{j}', verts, [(0, 1, 2, 3)], materials['weathered-plank'], 'dam:face')

# A pale raised old waterline runs across the face above the low wet trails.
for i, x in enumerate(range(-72, 72, 4)):
    next_x = x + 4
    z1 = -54 + 9 * (x / 75) ** 2 + .0012 * x * x + .04
    z2 = -54 + 9 * (next_x / 75) ** 2 + .0012 * next_x * next_x + .04
    low = 20.5 + (i % 4) * .18
    high = low + 1.0 + (i % 3) * .12
    mesh(f'dam-old-waterline-{i}', [(x, low, z1), (next_x, low + .1, z2),
         (next_x, high, z2), (x, high - .05, z1)], [(0, 1, 2, 3)],
         materials['weathered-plank'], 'dam:face')

# Uneven lift joints and long broken cracks give the poured face a real scale.
def face_z(x):
    return -54 + 9 * (x / 75) ** 2 + .0012 * x * x

for y in (7.5, 15.0, 23.0, 31.0, 39.0):
    for x in range(-72, 72, 12):
        end_x = min(74, x + 11.6)
        beam(f'dam-face-lift-joint-{y}-{x}', (x, y, face_z(x) + .065),
             (end_x, y + (x % 3) * .08, face_z(end_x) + .065), .055,
             materials['weathered-plank'], 'dam:face', .003)

for crack_index, crack_x in enumerate((-59, -37, -11, 24, 53)):
    start_y = 3.5 + crack_index * 1.4
    path = [(crack_x, start_y), (crack_x - 1.2, start_y + 2.1),
            (crack_x + .45, start_y + 4.4), (crack_x - .9, start_y + 6.5)]
    for segment, ((x1, y1), (x2, y2)) in enumerate(zip(path, path[1:])):
        beam(f'dam-face-crack-{crack_index}-{segment}',
             (x1, y1, face_z(x1) + .085), (x2, y2, face_z(x2) + .085), .07,
             materials['iron-dark'], 'dam:face', .004)

# Massive tapered buttresses anchor the wall to the basin; broad faces catch daylight.
for i, x in enumerate(range(-66, 67, 12)):
    height = 35 + 14 * math.sqrt(max(0, 1 - (x / 78) ** 2))
    front_z = -54 + 9 * (x / 75) ** 2 + .0012 * x * x
    z_base, z_top = front_z + 4.2, front_z + 2.3
    base_w, top_w, base_d, top_d = 7.2, 3.1, 11.2, 6.0
    vertices = [
        (x - base_w / 2, .25, z_base - base_d / 2), (x + base_w / 2, .25, z_base - base_d / 2),
        (x + base_w / 2, .25, z_base + base_d / 2), (x - base_w / 2, .25, z_base + base_d / 2),
        (x - top_w / 2, height, z_top - top_d / 2), (x + top_w / 2, height, z_top - top_d / 2),
        (x + top_w / 2, height, z_top + top_d / 2), (x - top_w / 2, height, z_top + top_d / 2),
    ]
    pier = mesh(f'dam-buttress-{i}', vertices,
        [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
        materials['cracked-concrete'], 'dam:face', uv_scale=5)
    bevel = pier.modifiers.new('worn poured edges', 'BEVEL')
    bevel.width = .14
    bevel.segments = 1

# A low, irregular silt bowl with a ragged edge replaces the hard display slab.
floor_vertices = [(0, -.30, -10)]
floor_faces = []
floor_rings = (0.18, .36, .56, .76, 1.0)
segments = 32
for ring, radius in enumerate(floor_rings):
    for i in range(segments):
        a = math.tau * i / segments
        rough = 1 + .018 * math.sin(a * 7 + ring * 1.7) + .012 * math.sin(a * 13 - ring)
        floor_vertices.append((104 * radius * rough * math.cos(a),
                               -.30 + .08 * math.sin(a * 5 + ring),
                               -10 + 88 * radius * rough * math.sin(a)))
for i in range(segments):
    floor_faces.append((0, 1 + i, 1 + (i + 1) % segments))
for ring in range(len(floor_rings) - 1):
    inner, outer = 1 + ring * segments, 1 + (ring + 1) * segments
    for i in range(segments):
        n = (i + 1) % segments
        floor_faces.extend(((inner + i, outer + i, outer + n),
                            (inner + i, outer + n, inner + n)))
mesh('dam-basin-silt-floor', floor_vertices, floor_faces, materials['sand'], 'dam:face', uv_scale=7)

# Steep, broken rock flanks hold the basin at roughly 150 m across; the far
# side is left out of the model. The uneven grid makes real slopes, not beams.
for side in (-1, 1):
    distances = (70, 72, 76, 82, 90, 99, 110, 124)
    depths = (-96, -72, -48, -24, 0, 24, 48, 68)
    profile = (0, 10, 23, 35, 42, 39, 27, 6)
    top_vertices = []
    for row, depth in enumerate(depths):
        for column, distance in enumerate(distances):
            x = side * (distance + 1.2 * math.sin(row * 1.8 + column * 2.1))
            z = depth + 1.6 * math.sin(column * 1.5 - row * 1.4)
            y = max(.05, profile[column] + 3.6 * math.sin(row * 1.1 + column * .8)
                    + 1.7 * math.sin(row * 2.2 - column * 1.6))
            top_vertices.append((x, y, z))
    row_size = len(distances)
    top_count = len(top_vertices)
    rock_vertices = top_vertices + [(x, -.28, z) for x, _, z in top_vertices]
    rock_faces = []
    for row in range(len(depths) - 1):
        for column in range(row_size - 1):
            a = row * row_size + column
            b, c, d = a + 1, a + row_size, a + row_size + 1
            rock_faces.extend(((a, b, d), (a, d, c)))
    perimeter = (list(range(row_size))
                 + [row * row_size + row_size - 1 for row in range(1, len(depths))]
                 + list(range((len(depths) - 1) * row_size + row_size - 2,
                              (len(depths) - 1) * row_size - 1, -1))
                 + [row * row_size for row in range(len(depths) - 2, 0, -1)])
    for i, a in enumerate(perimeter):
        b = perimeter[(i + 1) % len(perimeter)]
        rock_faces.append((a, b, top_count + b, top_count + a))
    mesh(f'dam-rock-basin-flank-{side}', rock_vertices, rock_faces,
         materials['salvaged-brick'], 'dam:face', uv_scale=9)

# Rail gate: a real train-width tunnel, closed cross-braced steel leaf, and the burst-in state.
for side in (-1, 1):
    box(f'dam-rail-jamb-{side}', (side * 5.4, 5.5, 0), (2.5, 11, 7), materials['cracked-concrete'], 'dam:rail-gate', .18)
    box(f'dam-rail-jamb-shoe-{side}', (side * 5.1, .35, 0), (4.5, .7, 18), materials['cracked-concrete'], 'dam:rail-gate', .10)
box('dam-rail-lintel', (0, 10.4, 0), (13, 2.1, 7), materials['cracked-concrete'], 'dam:rail-gate', .18)
box('dam:rail-gate', (0, 4.5, .55), (8.2, 8.7, .65), materials['rusted-steel'], 'dam:rail-gate', .10)
for x in (-3.6, -1.8, 0, 1.8, 3.6):
    beam(f'dam-gate-vertical-rib-{x}', (x, .45, .95), (x, 8.5, .95), .12, materials['galvanised-tin'], 'dam:rail-gate')
for y in (1.0, 3.0, 5.0, 7.0, 8.1):
    beam(f'dam-gate-horizontal-rib-{y}', (-3.9, y, .98), (3.9, y, .98), .11, materials['rusted-steel'], 'dam:rail-gate')
beam('dam-gate-crossbrace-a', (-3.7, .8, 1.02), (3.7, 8.2, 1.02), .10, materials['galvanised-tin'], 'dam:rail-gate')
beam('dam-gate-crossbrace-b', (3.7, .8, 1.02), (-3.7, 8.2, 1.02), .10, materials['galvanised-tin'], 'dam:rail-gate')
# Broken variant sits deeper in the tunnel and is folded inward, with lifted corners.
broken = box('dam:rail-gate-broken', (.5, 1.0, -8), (7.7, .5, 7.8), materials['rusted-steel'], 'dam:rail-gate-broken', .08)
broken.rotation_euler[0] = -.17
broken.rotation_euler[2] = -.12
for i in range(8):
    x = -3.2 + i * .92
    beam(f'dam-broken-door-torn-rib-{i}', (x, .25, -4), (x + (-.8 if i % 2 else .8), 1.5 + (i % 3) * .55, -11),
         .09, materials['galvanised-tin'], 'dam:rail-gate-broken')
rail_path = [(0, 16), (0, -9), (-2, -14), (-7, -19), (-13, -25), (-17, -32), (-17, -43)]
for side in (-.72, .72):
    for i, ((ax, az), (bx, bz)) in enumerate(zip(rail_path, rail_path[1:])):
        beam(f'dam-curved-rail-{side}-{i}', (ax + side, .18, az), (bx + side, .18, bz),
             .12, materials['galvanised-tin'], 'dam:rail-gate')
for segment, ((ax, az), (bx, bz)) in enumerate(zip(rail_path, rail_path[1:])):
    dx, dz = bx - ax, bz - az
    length = math.hypot(dx, dz)
    count = max(1, round(length / 2.7))
    angle = math.atan2(dx, -dz)
    for j in range(count):
        t = j / count
        sleeper = box(f'dam-curved-sleeper-{segment}-{j}',
                      (ax + dx * t, .07, az + dz * t), (2.6, .15, .30),
                      materials['weathered-plank'], 'dam:rail-gate', .04)
        sleeper.rotation_euler[2] = angle

# Filling shed at the specified offset, with an open train-height bay into the interior.
sx, sz = -17, -23
box('dam:filling-shed', (sx, .18, sz), (26, .36, 28), materials['cracked-concrete'], 'dam:filling-shed', .05)
for side in (-1, 1):
    box(f'dam-filling-shed-side-{side}', (sx + side * 12.7, 7, sz), (.65, 14, 28), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-roof', (sx, 14.1, sz), (26, .8, 28), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-back', (sx, 7, sz - 13.6), (26, 14, .8), materials['cracked-concrete'], 'dam:filling-shed', .08)
# Salt-encrusted back-wall face is a specific photographed surface, not procedural noise.
box('dam-filling-shed-salt-wall', (sx, 8.3, sz - 13.12), (22.4, 8.3, .08), materials['weathered-plank'], 'dam:filling-shed', .01)
for row, z in enumerate((-16, -23, -30)):
    for col, x in enumerate((-26, -8)):
        tank_y = 4.4
        cylinder(f'dam-filling-tank-{row}-{col}', (x, tank_y, z), 2.3, 6.2,
                 materials['galvanised-tin'], 'dam:filling-shed', 'Y', 48)
        for yy in (tank_y - 3, tank_y + 3):
            torus(f'dam-tank-rim-{row}-{col}-{yy}', (x, yy, z), 2.23, .11,
                  materials['rusted-steel'], 'dam:filling-shed', 'Y', 32, 6)
        cylinder(f'dam-tank-neck-{row}-{col}', (x, tank_y + 3.35, z), .48, .7,
                 materials['rusted-steel'], 'dam:filling-shed', 'Y', 20)
        for ypipe in (tank_y - 1.5, tank_y + 1.5):
            beam(f'dam-tank-band-{row}-{col}-{ypipe}', (x - 2.15, ypipe, z),
                 (x + 2.15, ypipe, z), .075, materials['rusted-steel'], 'dam:filling-shed')
for pipe in range(4):
    y = 3.0 + pipe * 2.8
    beam(f'dam-intake-pipe-back-{pipe}', (-29, y, -34), (-6, y, -34), .30 if pipe == 0 else .19,
         materials['rusted-steel'], 'dam:filling-shed')
    beam(f'dam-intake-pipe-turn-{pipe}', (-28, y, -34), (-28, y, -13), .18,
         materials['galvanised-tin'], 'dam:filling-shed')
    for j in range(4):
        cylinder(f'dam-pipe-flange-{pipe}-{j}', (-28, y, -32 + j * 5.5), .42, .18,
                 materials['rusted-steel'], 'dam:filling-shed', 'Z', 20)

# Crest walkway (28 m) and sealed sea gate at the story coordinates.
box('dam-crest-walkway', (0, 28, -50), (32, .48, 5.5), materials['galvanised-tin'], 'dam:sea-gate', .08)
box('dam-sea-gate-shadow', (0, 36, -52.5), (25, 18, 1.1), materials['iron-dark'], 'dam:sea-gate', .12)
box('dam:sea-gate', (0, 36, -51.7), (24, 17, .9), materials['rusted-steel'], 'dam:sea-gate', .12)
for x in range(-11, 12, 2):
    beam(f'dam-sea-gate-rib-x-{x}', (x, 28.2, -51.05), (x, 44.0, -51.05), .18,
         materials['galvanised-tin'], 'dam:sea-gate')
for y in (29.2, 33, 37, 41, 44):
    beam(f'dam-sea-gate-rib-y-{y}', (-11.7, y, -51.0), (11.7, y, -51.0), .18,
         materials['rusted-steel'], 'dam:sea-gate')
for side in (-1, 1):
    for y in range(30, 45, 3):
        cylinder(f'dam-sea-gate-bolt-{side}-{y}', (side * 11.2, y, -50.85), .12, .12,
                 materials['galvanised-tin'], 'dam:sea-gate', 'Z', 12)
for side in (-1, 1):
    beam(f'dam-crest-rail-post-{side}', (side * 15.5, 28.4, -52.5),
         (side * 15.5, 29.7, -52.5), .11, materials['rusted-steel'], 'dam:sea-gate')
for y in (29.1, 29.7):
    beam(f'dam-crest-rail-{y}', (-15.5, y, -52.5), (15.5, y, -52.5), .07,
         materials['galvanised-tin'], 'dam:sea-gate')

# The handwheel is taller than a person; its housing and empty seat stand beside it.
torus('dam:sea-wheel', (0, 32.2, -50), 3.8, .16, materials['rusted-steel'], 'dam:sea-wheel', 'Z', 56, 8)
cylinder('dam-sea-wheel-hub', (0, 32.2, -50), .48, .62, materials['galvanised-tin'], 'dam:sea-wheel', 'Z')
for i in range(12):
    a = i * math.tau / 12
    beam(f'dam-sea-wheel-spoke-{i}', (math.cos(a) * .35, 32.2 + math.sin(a) * .35, -49.7),
         (math.cos(a) * 3.65, 32.2 + math.sin(a) * 3.65, -49.7), .09,
         materials['galvanised-tin'], 'dam:sea-wheel')
    beam(f'dam-sea-wheel-grip-{i}', (math.cos(a) * 3.55, 32.2 + math.sin(a) * 3.55, -50),
         (math.cos(a) * 4.15, 32.2 + math.sin(a) * 4.15, -50), .12,
         materials['rusted-steel'], 'dam:sea-wheel')
box('dam:gearbox', (7, 29.1, -50), (9, .75, 8), materials['rusted-steel'], 'dam:gearbox', .12)
for x in (3.3, 10.7):
    box(f'dam-gearbox-side-{x}', (x, 32.7, -50), (.42, 6.8, 7.4), materials['galvanised-tin'], 'dam:gearbox', .1)
for z in (-53.4, -46.6):
    box(f'dam-gearbox-cross-{z}', (7, 32.7, z), (7.8, 6.8, .42), materials['rusted-steel'], 'dam:gearbox', .1)
ring_gear('dam-gearbox-empty-seven-metre-seat', (7, 32.2, -49.6), 3.5, .36,
          materials['galvanised-tin'], 'dam:gearbox', 24)
for side in (-1, 1):
    for z in (-53, -50, -47):
        beam(f'dam-gearbox-bay-brace-{side}-{z}', (7 + side * 3.2, 29.8, z),
             (7 + side * 3.2, 35.8, z), .13, materials['rusted-steel'], 'dam:gearbox')

# Rotten original gear at the foot, half buried in silt; its teeth and open hub stay visible.
old = ring_gear('dam:gear-old', (0, 3.55, 6), 4.0, .48, materials['rusted-steel'], 'dam:gear-old', 24)
old.rotation_euler[1] = .08
for i in range(6):
    a = math.tau * i / 6
    beam(f'dam-old-gear-spoke-{i}', (math.cos(a) * .6, 3.5 + math.sin(a) * .6, 6.2),
         (math.cos(a) * 3.25, 3.5 + math.sin(a) * 3.25, 6.2), .22,
         materials['rusted-steel'], 'dam:gear-old')
torus('dam-old-gear-hub', (0, 3.5, 6.18), .58, .22, materials['galvanised-tin'], 'dam:gear-old', 'Z', 24, 8)

# Boiler room outside the shed, in the specified east-side position.
for i, x in enumerate((21.8, 27.3)):
    cylinder('dam:boilers' if i == 0 else f'dam-boiler-{i}', (x, 3.4, 5), 2.25, 6.8, materials['rusted-steel'], 'dam:boilers', 'Y', 48)
    for y in (.55, 1.15, 5.7, 6.2):
        torus(f'dam-boiler-rim-{i}-{y}', (x, y, 5), 2.25, .10,
              materials['galvanised-tin'], 'dam:boilers', 'Y', 32, 6)
    cylinder(f'dam-boiler-dome-{i}', (x, 6.95, 5), .9, .9,
             materials['rusted-steel'], 'dam:boilers', 'Y', 32)
    for side in (-1, 1):
        beam(f'dam-boiler-leg-{i}-{side}', (x + side * 1.4, .25, 5),
             (x + side * 1.15, 1.3, 5), .15, materials['galvanised-tin'], 'dam:boilers')
for y in (2.2, 3.4, 4.6):
    beam(f'dam-boiler-manifold-{y}', (19.5, y, 1.6), (30, y, 1.6), .18,
         materials['galvanised-tin'], 'dam:boilers')
for x in (22, 27):
    beam(f'dam-boiler-steam-riser-{x}', (x, 4.8, 1.6), (x, 8.6, 1.6), .22,
         materials['rusted-steel'], 'dam:boilers')

# Spillway down the east side, blocked by a layered pile of rusted wrecks.
spill_x, spill_z = 85, 25
for side in (-1, 1):
    beam(f'dam-spillway-bank-{side}', (spill_x + side * 7, 18, spill_z - 18),
         (spill_x + side * 12, 0.3, spill_z + 27), 1.8, materials['cracked-concrete'], 'dam:spillway')
for i in range(8):
    z = spill_z - 13 + i * 5.8
    y = 14 - i * 1.4
    box('dam:spillway' if i == 0 else f'dam-spillway-step-{i}', (spill_x, y, z), (12, .6, 6.2),
        materials['cracked-concrete'], 'dam:spillway', .18)
for i in range(7):
    x = spill_x + (-1 if i % 2 else 1) * (1.4 + (i % 3) * .7)
    z = spill_z - 10 + i * 5.5
    y = max(.8, 12.5 - i * 1.45)
    angle = (i % 3 - 1) * .13
    hull = box(f'dam-spillway-wreck-{i}-crushed-body', (x, y, z), (3.4, 1.25, 6.0),
               materials['rusted-steel'], 'dam:spillway', .18)
    hull.rotation_euler[1] = angle
    for side in (-1, 1):
        for dz in (-2.0, 2.0):
            torus(f'dam-spillway-wreck-{i}-wheel-{side}-{dz}', (x + side * 1.72, y - .1, z + dz),
                  .58, .18, materials['iron-dark'], 'dam:spillway', 'X', 16, 6)
    # Torn roof rails and a folded bonnet make these read as crushed vehicle shells.
    beam(f'dam-spillway-wreck-{i}-roof-a', (x - 1.4, y + 1.0, z - 1.8),
         (x + .7, y + 1.55, z + .1), .10, materials['galvanised-tin'], 'dam:spillway')
    beam(f'dam-spillway-wreck-{i}-roof-b', (x + 1.45, y + 1.0, z - 1.8),
         (x - .8, y + 1.35, z + 1.8), .10, materials['rusted-steel'], 'dam:spillway')
    box(f'dam-spillway-wreck-{i}-folded-panel', (x, y + 1.0, z - 2.0), (2.8, .12, 1.9),
        materials['galvanised-tin'], 'dam:spillway', .08)

# The gatehouse stands on its own raised pad, well above the bed.
gx, gy, gz = 45, 30, -60
box('gatehouse-own-pad', (gx, gy - .45, gz), (7.8, .9, 7.6), materials['cracked-concrete'], 'gatehouse', .14)
box('gatehouse', (gx, gy + 1.9, gz), (5.1, 3.8, 5.2), materials['salvaged-brick'], 'gatehouse', .09)
box('gatehouse-roof', (gx, gy + 4.0, gz), (6.0, .48, 6.0), materials['rusted-steel'], 'gatehouse', .09)
box('gatehouse:door', (gx, gy + 1.05, gz + 2.65), (1.1, 2.2, .12), materials['weathered-plank'], 'gatehouse:door', .04)
box('gatehouse-dead-lamp-case', (gx + 1.2, gy + 2.25, gz + 2.72), (.42, .62, .24), materials['iron-dark'], 'gatehouse', .06)
for side in (-1, 1):
    box(f'gatehouse-window-{side}', (gx + side * 1.5, gy + 2.1, gz + 2.66), (.72, .64, .08), materials['dirty-glass'], 'gatehouse', .03)
box('gatehouse-bench-seat', (gx + 2.6, gy + .72, gz + 4.6), (2.2, .16, .55), materials['weathered-plank'], 'gatehouse', .05)
for x in (gx + 1.75, gx + 3.45):
    beam(f'gatehouse-bench-leg-{x}', (x, gy, gz + 4.6), (x, gy + .65, gz + 4.6), .09,
         materials['rusted-steel'], 'gatehouse')

# A handful of eroded silt ribs, spaced so the basin reads as ground, not a wall.
for i in range(5):
    z = 18 + i * 12
    beam(f'dam-silt-rib-{i}', (-72, .08, z), (72, .08, z), .10,
         materials['cracked-concrete'], 'dam:face')

# Keep every authored node under one empty scene root and export only this asset.
out.parent.mkdir(parents=True, exist_ok=True)
texture_dir.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
print(f'Wrote {out}')

# Count the delivered binary, not the source scene, then render a fresh GLB import.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.ops.import_scene.gltf(filepath=str(out))
imported = list(bpy.context.scene.objects)
mesh_objects = [obj for obj in imported if obj.type == 'MESH']
triangles = sum(len(poly.vertices) - 2 for obj in mesh_objects for poly in obj.data.polygons)
bytes_glb = out.stat().st_size
print(json.dumps({'glb_bytes': bytes_glb, 'triangles': triangles,
                  'nodes': sorted(obj.name for obj in imported if obj.name.startswith(('dam:', 'gatehouse')))}))
if triangles > 60000 or bytes_glb > 3 * 1024 * 1024:
    raise RuntimeError(f'GLB exceeds budget: {triangles} triangles, {bytes_glb} bytes')

# Render the actual exported asset imported into the empty scene above.
scene = bpy.context.scene
scene.render.resolution_x = 1000
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
scene.render.film_transparent = False
scene.render.image_settings.color_mode = 'RGB'
scene.world = bpy.data.worlds.new('Overcast dam review')
scene.world.color = (.34, .35, .34)
scene.view_settings.view_transform = 'AgX'
raw.mkdir(parents=True, exist_ok=True)
sheet.parent.mkdir(parents=True, exist_ok=True)

def aim(obj, point):
    direction = town.game_vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

def area_light(name, location, power, size):
    bpy.ops.object.light_add(type='AREA', location=town.game_vector(location))
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    aim(light, (0, 16, -22))

area_light('large cloudy key', (5, 115, 70), 105000, 90)
area_light('soft fill', (-100, 75, -40), 42000, 80)
area_light('crest rim', (40, 95, -95), 28000, 65)

def camera(name, location, target, focal=50):
    bpy.ops.object.camera_add(location=town.game_vector(location))
    cam = bpy.context.object
    cam.name = 'review camera ' + name
    cam.data.type = 'PERSP'
    cam.data.lens = focal
    aim(cam, target)
    scene.camera = cam
    return cam

views = [
    ('reference-40m', (0, 2.0, 40), (0, 18, -10), 40),
    ('lake-bed-200m', (0, 4, 200), (0, 18, -14), 32),
    ('filling-shed-interior', (-17, 2.2, -10), (-24, 4.5, -36), 35),
    ('dam-context', (150, 85, 140), (10, 16, -20), 35),
]
captures = []
for name, location, target, focal in views:
    camera(name, location, target, focal)
    path = raw / f'{name}.jpg'
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    captures.append(path)

print('GLB reimport review renders completed.')
