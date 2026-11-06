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
ref = Path.home() / '.codex/generated_images/wasteland-dam-reference.png'
projection = texture_dir / 'dam-face-projection.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.assemble_only:
    from PIL import Image, ImageOps, ImageDraw, ImageFont
    reference = Image.open(ref).convert('RGB')
    captures = [Image.open(raw / name).convert('RGB') for name in (
        'dam-match.jpg', 'dam-context.jpg', 'filling-shed-interior.jpg', 'spillway.jpg',
        'wrecks.jpg', 'gatehouse.jpg', 'gear-old.jpg')]
    cell_w, cell_h, header_h, pad = 620, 350, 30, 14
    canvas = Image.new('RGB', (cell_w * 3 + pad * 4, (cell_h + header_h) * 4 + pad * 5), (91, 93, 89))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    labels = ['Photographic dam reference', 'Dam face: matching angle and scale',
              'Dam, gatehouse and spillway: basin context', 'Filling shed: train-cab view',
              'Spillway', 'Buried wrecks', 'Gatehouse', 'Buried old gear']
    positions = [(pad, pad), (pad * 2 + cell_w, pad),
                 (pad, pad * 2 + cell_h + header_h),
                 (pad, pad * 3 + (cell_h + header_h) * 2),
                 (pad * 2 + cell_w, pad * 3 + (cell_h + header_h) * 2),
                 (pad * 3 + cell_w * 2, pad * 3 + (cell_h + header_h) * 2),
                 (pad, pad * 4 + (cell_h + header_h) * 3),
                 (pad * 2 + cell_w, pad * 4 + (cell_h + header_h) * 3)]
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
    'weathered-plank': texture_dir / 'dam-salt-crust.jpg',
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

# Bake the target photo's concrete and water marks into a 2K projection image.
# Keep the source reference outside the repository; the committed bake remains
# sufficient for rebuilding after the review scratch folder is cleaned.
if ref.is_file():
    import numpy as np
    source_image = bpy.data.images.load(str(ref.resolve()), check_existing=False)
    source_width, source_height = source_image.size
    source_pixels = np.empty(source_width * source_height * 4, dtype=np.float32)
    source_image.pixels.foreach_get(source_pixels)
    source_pixels = np.flipud(source_pixels.reshape(source_height, source_width, 4))
    crop = source_pixels[104:651, 112:1605, :3]
    x = np.linspace(0, crop.shape[1] - 1, 2048, dtype=np.float32)
    y = np.linspace(0, crop.shape[0] - 1, 750, dtype=np.float32)
    x0, y0 = np.floor(x).astype(np.int32), np.floor(y).astype(np.int32)
    x1, y1 = np.minimum(x0 + 1, crop.shape[1] - 1), np.minimum(y0 + 1, crop.shape[0] - 1)
    wx, wy = (x - x0)[None, :, None], (y - y0)[:, None, None]
    baked = (crop[y0[:, None], x0[None, :]] * (1 - wx) * (1 - wy)
             + crop[y0[:, None], x1[None, :]] * wx * (1 - wy)
             + crop[y1[:, None], x0[None, :]] * (1 - wx) * wy
             + crop[y1[:, None], x1[None, :]] * wx * wy)
    face_image = bpy.data.images.new('Dry Dam face photo bake', width=2048, height=750, alpha=False)
    baked_rgba = np.concatenate((baked, np.ones((*baked.shape[:2], 1), dtype=np.float32)), axis=2)
    face_image.pixels.foreach_set(np.flipud(baked_rgba).astype(np.float32).reshape(-1))
    face_image.filepath_raw = str(projection)
    face_image.file_format = 'JPEG'
    scene.render.image_settings.quality = 88
    face_image.save()
    bpy.data.images.remove(source_image)
    bpy.data.images.remove(face_image)
if not projection.is_file():
    raise FileNotFoundError(f'Face projection is missing: {projection}')
face_image = bpy.data.images.load(str(projection.resolve()), check_existing=False)
face_material = bpy.data.materials.new('Dam face / baked photographic projection')
face_material.use_nodes = True
face_material.node_tree.nodes.clear()
face_output = face_material.node_tree.nodes.new('ShaderNodeOutputMaterial')
face_bsdf = face_material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
face_bsdf.inputs['Metallic'].default_value = 0
face_bsdf.inputs['Roughness'].default_value = .92
face_tex = face_material.node_tree.nodes.new('ShaderNodeTexImage')
face_tex.image = face_image
face_tex.interpolation = 'Linear'
face_material.node_tree.links.new(face_tex.outputs['Color'], face_bsdf.inputs['Base Color'])
face_material.node_tree.links.new(face_bsdf.outputs['BSDF'], face_output.inputs['Surface'])

# The first render washed out the concrete against Blender's large soft lights.
# Darken the packed image pixels before export so both the Blender sheet and the
# delivered GLB retain the broken, stained surface instead of a pale grey sheet.
for name, exposure in (('cracked-concrete', .72), ('weathered-plank', .72),
                       ('galvanised-tin', .83), ('rusted-steel', 1.0)):
    image_node = next(node for node in materials[name].node_tree.nodes if node.type == 'TEX_IMAGE')
    image = image_node.image
    if name in ('rusted-steel', 'galvanised-tin'):
        image.scale(384, 384)
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

# Main wall: a straight, sloped, thick concrete gravity dam.
# The rail gate is the separate entrance at the origin; the concrete face stands
# beyond the filling shed at the back of the 50 m deep dam structure.
xs = [-75 + i * 3 for i in range(51)]
ys = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 55]
front, back = [], []
for x in xs:
    top = 55
    z = -54
    for y in ys:
        front.append((x, min(y, top), z - .15 * y))
        back.append((x, min(y, top), z - .15 * y - 12))
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
    faces.append((yi, yi + 1, len(front) + yi + 1, len(front) + yi))
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
wall.data.materials.append(face_material)
uv_layer = wall.data.uv_layers.active
front_face_count = (len(xs) - 1) * (len(ys) - 1)
for poly in wall.data.polygons:
    if poly.index % 2 == 0 and poly.index < front_face_count * 2:
        poly.material_index = 1
    for loop_index in poly.loop_indices:
        vertex = wall.data.vertices[wall.data.loops[loop_index].vertex_index].co
        if poly.material_index == 1:
            uv_layer.data[loop_index].uv = ((vertex.x + 75) / 150, vertex.z / 55)
wall['dimensions_m'] = [150, 55, 12]

# Salt crust bands and individual long wet streaks are separate image-painted surfaces.
# Tall concrete piers stand proud at the photographed spacing and lean with the wall.
for i, x in enumerate((-64, -43, -21, 21, 43, 64)):
    height = 59 if abs(x) == 21 else (52 if abs(x) > 43 else 56)
    front_z = -54
    z_base, z_top = front_z + 4.8, front_z - .15 * height + 3.0
    base_w, top_w, base_d, top_d = 5.8, 4.0, 7.0, 4.8
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

# Short grey broken-rock shoulders frame the wall; the world owns the hills.
for side in (-1, 1):
    for index, (distance, height, z_center) in enumerate(((76, 8, -52), (82, 13, -57),
                                                           (89, 17, -62), (96, 10, -66))):
        count = 8
        vertices = []
        for ring, (radius, y_base) in enumerate(((1.0, .1), (.78, height * .48), (.34, height * .78))):
            for point in range(count):
                angle = math.tau * point / count
                irregular = 1 + .12 * math.sin(point * 4.1 + index * 2 + ring)
                x = side * (distance + radius * 7.5 * irregular * math.cos(angle))
                z = z_center + radius * 6.5 * irregular * math.sin(angle)
                y = y_base + (height * .16 * math.sin(point * 2.2 + index) if ring == 2 else 0)
                vertices.append((x, y, z))
        rock_faces = []
        for ring in range(2):
            for point in range(count):
                a = ring * count + point
                b = ring * count + (point + 1) % count
                c, d = (ring + 1) * count + (point + 1) % count, (ring + 1) * count + point
                rock_faces.extend(((a, b, c), (a, c, d)))
        vertices.append((side * distance, height * .97, z_center))
        rock_faces.extend((16 + point, 16 + (point + 1) % count, 24) for point in range(count))
        vertices.append((side * distance, .1, z_center))
        rock_faces.extend(((point + 1) % count, point, 25) for point in range(count))
        rock_faces.extend((point, 8 + point, 8 + (point + 1) % count, (point + 1) % count)
                          for point in range(count))
        mesh(f'dam-rock-shoulder-{side}-{index}', vertices, rock_faces,
             materials['cracked-concrete'], 'dam:face', uv_scale=4)

# Rail gate: a real arched train tunnel, two steel leaves and the burst-in state.
for side in (-1, 1):
    box(f'dam-rail-jamb-{side}', (side * 7.3, 4.6, 0), (2.5, 9.2, 9), materials['cracked-concrete'], 'dam:rail-gate', .18)
    box(f'dam-rail-jamb-shoe-{side}', (side * 7.0, .35, 0), (5.0, .7, 18), materials['cracked-concrete'], 'dam:rail-gate', .10)
# Concrete ring segments form a proper arch around the tunnel mouth.
arch_inner, arch_outer, spring, depth = 6.0, 7.25, 4.6, 8.6
for i in range(16):
    a0, a1 = math.pi * i / 16, math.pi * (i + 1) / 16
    inner0 = (arch_inner * math.cos(a0), spring + arch_inner * math.sin(a0), .15)
    inner1 = (arch_inner * math.cos(a1), spring + arch_inner * math.sin(a1), .15)
    outer0 = (arch_outer * math.cos(a0), spring + arch_outer * math.sin(a0), .15)
    outer1 = (arch_outer * math.cos(a1), spring + arch_outer * math.sin(a1), .15)
    for side_z in (0, depth):
        quad = [(inner0[0], inner0[1], side_z), (inner1[0], inner1[1], side_z),
                (outer1[0], outer1[1], side_z), (outer0[0], outer0[1], side_z)]
        mesh(f'dam-rail-arch-ring-{i}-{side_z}', quad, [(0, 1, 2, 3)],
             materials['cracked-concrete'], 'dam:rail-gate')
    beam(f'dam-rail-arch-depth-{i}', (outer0[0], outer0[1], 0),
         (outer0[0], outer0[1], depth), .16, materials['cracked-concrete'], 'dam:rail-gate')
for side in (-1, 1):
    box(f'dam-rail-arch-foot-{side}', (side * 6.6, 2.3, depth / 2), (1.25, 4.6, depth),
        materials['cracked-concrete'], 'dam:rail-gate', .12)
for side in (-1, 1):
    leaf = box('dam:rail-gate' if side < 0 else 'dam-rail-gate-right-leaf',
               (side * 3.0, 4.05, .48), (5.95, 8.05, .52), materials['rusted-steel'], 'dam:rail-gate', .08)
    leaf.rotation_euler[1] = side * .015
    for x in (-2.2, -1.1, 0, 1.1, 2.2):
        beam(f'dam-gate-vertical-rib-{side}-{x}', (side * 3.0 + x, .25, .84),
             (side * 3.0 + x, 7.9, .84), .11, materials['galvanised-tin'], 'dam:rail-gate')
    for y in (1.1, 3.0, 5.0, 7.5):
        beam(f'dam-gate-horizontal-rib-{side}-{y}', (side * 3.0 - 2.9, y, .88),
             (side * 3.0 + 2.9, y, .88), .11, materials['rusted-steel'], 'dam:rail-gate')
    beam(f'dam-gate-crossbrace-{side}', (side * 3.0 - 2.8, .5, .92),
         (side * 3.0 + 2.8, 7.65, .92), .10, materials['galvanised-tin'], 'dam:rail-gate')
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

# Wide, low filling hall at the specified offset, open to the train cab.
sx, sz = -17, -23
box('dam:filling-shed', (sx, .18, sz), (36, .36, 30), materials['cracked-concrete'], 'dam:filling-shed', .05)
for side in (-1, 1):
    box(f'dam-filling-shed-side-{side}', (sx + side * 17.7, 5.7, sz), (.6, 11.4, 30), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-roof', (sx, 11.6, sz), (36, .7, 30), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-back', (sx, 5.7, sz - 14.8), (36, 11.4, .8), materials['cracked-concrete'], 'dam:filling-shed', .08)
# Salt-encrusted wet wall gets its own sharp photographed material, framed in runoff.
salt_wall = box('dam-filling-shed-salt-wall', (sx, 6.4, sz - 14.34), (32.5, 9.2, .08), materials['weathered-plank'], 'dam:filling-shed', .01)
for poly in salt_wall.data.polygons:
    if abs(poly.normal.y) > .9:
        for loop_index in poly.loop_indices:
            vertex = salt_wall.data.vertices[salt_wall.data.loops[loop_index].vertex_index].co
            salt_wall.data.uv_layers.active.data[loop_index].uv = (vertex.x / 12, vertex.z / 12)
for row, z in enumerate((-18, -27, -36)):
    for col, x in enumerate((-29, -5)):
        tank_y = 2.3
        cylinder(f'dam-filling-tank-{row}-{col}', (x, tank_y, z), 1.5, 8.0,
                 materials['galvanised-tin'], 'dam:filling-shed', 'X', 36)
        for xx in (x - 3.7, x + 3.7):
            torus(f'dam-tank-rim-{row}-{col}-{xx}', (xx, tank_y, z), 1.42, .10,
                  materials['rusted-steel'], 'dam:filling-shed', 'X', 20, 4)
        cylinder(f'dam-tank-neck-{row}-{col}', (x, tank_y + 1.65, z), .42, .65,
                 materials['rusted-steel'], 'dam:filling-shed', 'Y', 20)
for pipe in range(4):
    y = 2.1 + pipe * 2.4
    beam(f'dam-intake-pipe-back-{pipe}', (-33, y, -38), (-1, y, -38), .30 if pipe == 0 else .19,
         materials['rusted-steel'], 'dam:filling-shed')
    beam(f'dam-intake-pipe-turn-{pipe}', (-32, y, -38), (-32, y, -10), .18,
         materials['galvanised-tin'], 'dam:filling-shed')
    for j in range(4):
        cylinder(f'dam-pipe-flange-{pipe}-{j}', (-32, y, -36 + j * 7), .42, .18,
                 materials['rusted-steel'], 'dam:filling-shed', 'Z', 20)

# Crest walkway and great shut gate, aligned over the central arched rail tunnel.
box('dam-crest-walkway', (0, 28, -62.5), (40, .48, 7.0), materials['galvanised-tin'], 'dam:sea-gate', .08)
box('dam-sea-gate-shadow', (0, 37.5, -58.75), (26, 14.2, 1.0), materials['iron-dark'], 'dam:sea-gate', .12)
box('dam:sea-gate', (0, 37.5, -58.0), (24, 13.2, .85), materials['rusted-steel'], 'dam:sea-gate', .12)
for x in range(-11, 12, 2):
    beam(f'dam-sea-gate-rib-x-{x}', (x, 31.0, -57.45), (x, 44.0, -57.45), .18,
         materials['galvanised-tin'], 'dam:sea-gate')
for y in (31.0, 34.0, 37.0, 40.5, 44.0):
    beam(f'dam-sea-gate-rib-y-{y}', (-11.7, y, -57.4), (11.7, y, -57.4), .18,
         materials['rusted-steel'], 'dam:sea-gate')
for side in (-1, 1):
    for y in range(31, 44, 3):
        cylinder(f'dam-sea-gate-bolt-{side}-{y}', (side * 11.2, y, -57.25), .12, .12,
                 materials['galvanised-tin'], 'dam:sea-gate', 'Z', 12)
for side in (-1, 1):
    for x in (-17, 17):
        beam(f'dam-crest-rail-post-{side}-{x}', (x, 28.4, -62.5 + side * 2.6),
             (x, 29.7, -62.5 + side * 2.6), .11, materials['rusted-steel'], 'dam:sea-gate')
for y in (29.1, 29.7):
    beam(f'dam-crest-rail-{y}', (-17, y, -62.5), (17, y, -62.5), .07,
         materials['galvanised-tin'], 'dam:sea-gate')

# Open hoist gantry and a pair of big iron lift wheels stand above the shut gate.
for x in (-13, 13):
    for z in (-65.0, -60.5):
        beam(f'dam-hoist-gantry-leg-{x}-{z}', (x, 28.2, z), (x, 57, z), .38,
             materials['rusted-steel'], 'dam:sea-gate', .035)
        beam(f'dam-hoist-gantry-brace-{x}-{z}', (x, 34, z), (x + (1.5 if x < 0 else -1.5), 38, z), .22,
             materials['galvanised-tin'], 'dam:sea-gate', .02)
    beam(f'dam-hoist-gantry-cross-{x}', (x, 57, -65), (x, 57, -60.5), .38,
         materials['rusted-steel'], 'dam:sea-gate', .035)
beam('dam-hoist-gantry-top', (-13, 57, -62.75), (13, 57, -62.75), .5,
     materials['rusted-steel'], 'dam:sea-gate', .04)
for x in (-7.5, 7.5):
    torus(f'dam-hoist-lift-wheel-{x}', (x, 60.3, -62.75), 3.15, .20,
          materials['rusted-steel'], 'dam:sea-gate', 'Z', 48, 8)
    cylinder(f'dam-hoist-lift-hub-{x}', (x, 60.3, -62.75), .58, .75,
             materials['galvanised-tin'], 'dam:sea-gate', 'Z', 24)
    for spoke in range(10):
        a = spoke * math.tau / 10
        beam(f'dam-hoist-lift-spoke-{x}-{spoke}',
             (x + .4 * math.cos(a), 60.3 + .4 * math.sin(a), -62.35),
             (x + 2.95 * math.cos(a), 60.3 + 2.95 * math.sin(a), -62.35), .12,
             materials['galvanised-tin'], 'dam:sea-gate')
    for y in (47.5, 36.8):
        beam(f'dam-hoist-chain-{x}-{y}', (x, y, -62.75), (x, y + 2.0, -62.75), .14,
             materials['iron-dark'], 'dam:sea-gate')

# The walkway control wheel is taller than a person; it sits beside its open gearbox.
torus('dam:sea-wheel', (0, 32.2, -62), 3.5, .17, materials['rusted-steel'], 'dam:sea-wheel', 'Z', 56, 8)
cylinder('dam-sea-wheel-hub', (0, 32.2, -62), .48, .62, materials['galvanised-tin'], 'dam:sea-wheel', 'Z')
for i in range(12):
    a = i * math.tau / 12
    beam(f'dam-sea-wheel-spoke-{i}', (math.cos(a) * .35, 32.2 + math.sin(a) * .35, -61.7),
         (math.cos(a) * 3.35, 32.2 + math.sin(a) * 3.35, -61.7), .09,
         materials['galvanised-tin'], 'dam:sea-wheel')
    beam(f'dam-sea-wheel-grip-{i}', (math.cos(a) * 3.35, 32.2 + math.sin(a) * 3.35, -62),
         (math.cos(a) * 3.95, 32.2 + math.sin(a) * 3.95, -62), .12,
         materials['rusted-steel'], 'dam:sea-wheel')
for x in (3.3, 10.7):
    beam(f'dam-gearbox-post-{x}', (x, 28.4, -62), (x, 36.5, -62), .36,
         materials['rusted-steel'], 'dam:gearbox', .03)
for z in (-65.2, -58.8):
    beam(f'dam-gearbox-crossbase-{z}', (3.3, 28.4, z), (10.7, 28.4, z), .36,
         materials['galvanised-tin'], 'dam:gearbox', .03)
    beam(f'dam-gearbox-crosstop-{z}', (3.3, 36.5, z), (10.7, 36.5, z), .36,
         materials['rusted-steel'], 'dam:gearbox', .03)
ring_gear('dam-gearbox-empty-seven-metre-seat', (7, 32.4, -62), 3.5, .28,
          materials['galvanised-tin'], 'dam:gearbox', 24)

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
mesh('dam:spillway', [(spill_x - 7, 18, 5), (spill_x + 7, 18, 5),
     (spill_x + 7, .3, 68), (spill_x - 7, .3, 68)], [(0, 1, 2, 3)],
     materials['cracked-concrete'], 'dam:spillway', uv_scale=5)
for side in (-1, 1):
    wall_vertices = [(spill_x + side * 6.8, 18, 5), (spill_x + side * 9.2, 18, 5),
                     (spill_x + side * 11, .3, 68), (spill_x + side * 6.8, .3, 68)]
    mesh(f'dam-spillway-retaining-wall-{side}', wall_vertices, [(0, 1, 2, 3)],
         materials['cracked-concrete'], 'dam:spillway', uv_scale=5)
    beam(f'dam-spillway-retaining-cap-{side}', wall_vertices[1], wall_vertices[2], .38,
         materials['galvanised-tin'], 'dam:spillway')
for i in range(7):
    x = spill_x + (-1 if i % 2 else 1) * (.55 + (i % 3) * .48)
    z = spill_z - 10 + i * 7.2
    y = 18 - (z - 5) * (17.7 / 63) + .58
    angle = (i % 3 - 1) * .13
    hull = box(f'dam-spillway-wreck-{i}-crushed-body', (x, y, z), (3.2, 1.1, 5.8),
               materials['rusted-steel'], 'dam:spillway', .28)
    hull.rotation_euler[1] = angle
    # Open cab frames and folded roof panels leave these as crushed vehicles,
    # not featureless blocks buried in the concrete channel.
    if i < 5:
        for side in (-1, 1):
            beam(f'dam-spillway-wreck-{i}-cab-pillar-{side}-front',
                 (x + side * 1.05, y + .42, z - .9), (x + side * 1.05, y + 1.75, z - .75), .13,
                 materials['galvanised-tin'], 'dam:spillway')
            beam(f'dam-spillway-wreck-{i}-cab-pillar-{side}-back',
                 (x + side * 1.05, y + .42, z + 1.35), (x + side * 1.05, y + 1.45, z + 1.2), .13,
                 materials['rusted-steel'], 'dam:spillway')
        beam(f'dam-spillway-wreck-{i}-broken-roof', (x - .95, y + 1.72, z - .7),
             (x + .95, y + 1.45, z + 1.2), .20, materials['galvanised-tin'], 'dam:spillway')
    for side in (-1, 1):
        for dz in (-2.0, 2.0):
            torus(f'dam-spillway-wreck-{i}-wheel-{side}-{dz}', (x + side * 1.72, y - .35, z + dz),
                  .72, .18, materials['iron-dark'], 'dam:spillway', 'X', 16, 6)
    # One folded plate leaves a torn body contour among the exposed wheels.
    box(f'dam-spillway-wreck-{i}-folded-panel', (x, y + 1.0, z - 2.0), (2.8, .12, 1.9),
        materials['galvanised-tin'], 'dam:spillway', .08)

# The gatehouse stands on its own raised pad, well above the bed.
gx, gy, gz = 45, 30, -60
box('gatehouse-own-pad', (gx, gy - .45, gz), (7.8, .9, 7.6), materials['cracked-concrete'], 'gatehouse', .14)
box('gatehouse', (gx, gy + 1.9, gz), (5.1, 3.8, 5.2), materials['cracked-concrete'], 'gatehouse', .09)
mesh('gatehouse-gable-front', [(gx - 2.55, gy + 3.8, gz + 2.62), (gx + 2.55, gy + 3.8, gz + 2.62),
     (gx, gy + 5.3, gz + 2.62)], [(0, 1, 2)], materials['cracked-concrete'], 'gatehouse')
mesh('gatehouse-gable-back', [(gx - 2.55, gy + 3.8, gz - 2.62), (gx + 2.55, gy + 3.8, gz - 2.62),
     (gx, gy + 5.3, gz - 2.62)], [(0, 1, 2)], materials['cracked-concrete'], 'gatehouse')
for side in (-1, 1):
    roof_vertices = [(gx, gy + 5.3, gz - 3.2), (gx, gy + 5.3, gz + 3.2),
                     (gx + side * 3.25, gy + 3.75, gz + 3.2), (gx + side * 3.25, gy + 3.75, gz - 3.2)]
    mesh(f'gatehouse-roof-slope-{side}', roof_vertices, [(0, 1, 2, 3)],
         materials['rusted-steel'], 'gatehouse')
box('gatehouse:door', (gx, gy + 1.05, gz + 2.65), (1.1, 2.2, .12), materials['weathered-plank'], 'gatehouse:door', .04)
box('gatehouse-dead-lamp-case', (gx + 1.2, gy + 2.25, gz + 2.72), (.42, .62, .24), materials['iron-dark'], 'gatehouse', .06)
for side in (-1, 1):
    box(f'gatehouse-window-{side}', (gx + side * 1.5, gy + 2.1, gz + 2.66), (.72, .64, .08), materials['dirty-glass'], 'gatehouse', .03)
box('gatehouse-bench-seat', (gx + 2.6, gy + .72, gz + 4.6), (2.2, .16, .55), materials['weathered-plank'], 'gatehouse', .05)
for x in (gx + 1.75, gx + 3.45):
    beam(f'gatehouse-bench-leg-{x}', (x, gy, gz + 4.6), (x, gy + .65, gz + 4.6), .09,
         materials['rusted-steel'], 'gatehouse')

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
scene.world.color = (.48, .49, .47)
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

area_light('large cloudy key', (5, 115, 70), 180000, 100)
area_light('soft fill', (-100, 75, -40), 85000, 90)
area_light('crest rim', (40, 95, -95), 52000, 75)

# The sheet uses a neutral mid-tone stage only; this ground is not exported.
ground_material = bpy.data.materials.new('Review / matte mid-tone ground')
ground_material.diffuse_color = (.22, .23, .22, 1)
bpy.ops.mesh.primitive_plane_add(size=900, location=town.game_vector((0, -.4, 0)))
ground = bpy.context.object
ground.name = 'review ground only'
ground.data.materials.append(ground_material)

def camera(name, location, target, focal=50):
    bpy.ops.object.camera_add(location=town.game_vector(location))
    cam = bpy.context.object
    cam.name = 'review camera ' + name
    if name == 'dam-match':
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = 170
    else:
        cam.data.type = 'PERSP'
        cam.data.lens = focal
    aim(cam, target)
    scene.camera = cam
    return cam

views = [
    ('dam-match', (0, 27, 220), (0, 27, -57), 38),
    ('dam-context', (159, 79, 128), (12, 20, -25), 36),
    ('filling-shed-interior', (-17, 2.0, -10), (-17, 3.4, -38), 35),
    ('spillway', (104, 25, 82), (85, 7, 25), 42),
    ('wrecks', (111, 26, 40), (85, 8, 40), 50),
    ('gatehouse', (61, 34, -42), (45, 32, -60), 52),
    ('gear-old', (10, 8, 26), (0, 3.5, 6), 60),
]
captures = []
for name, location, target, focal in views:
    camera(name, location, target, focal)
    path = raw / f'{name}.jpg'
    if name == 'dam-match':
        scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    else:
        scene.render.resolution_x, scene.render.resolution_y = 1000, 720
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    captures.append(path)

print('GLB reimport review renders completed.')
