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
sheet = root / f'docs/board/looks/ww-art-dam-2/round-{args.round}.jpg'
texture_dir = root / 'public/assets/models/wasteland/scablands/textures'
ref = Path.home() / '.codex/generated_images/wasteland-dam-reference.png'
projection = texture_dir / 'dam-face-projection.jpg'
salt_photo = texture_dir / 'dam-salt-wall-photo.jpg'
stone_photo = texture_dir / 'dam-gatehouse-stone.jpg'
silt_photo = texture_dir / 'dam-wet-silt.jpg'
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
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Mesh as PhotoMesh, Photo, slab as photo_slab, lathe as photo_lathe

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'

sources = {
    'cracked-concrete': texture_dir / 'dam-concrete.jpg',
    'rusted-steel': texture_dir / 'dam-rust.jpg',
    'galvanised-tin': texture_dir / 'dam-steel.jpg',
}
missing = [str(path) for path in sources.values() if not path.is_file()]
if missing:
    raise FileNotFoundError('Dam material photos are missing: ' + ', '.join(missing))
materials = town.make_materials(sources)
materials['cracked-concrete'].name = 'Dam / cracked aggregate concrete'
materials['rusted-steel'].name = 'Dam / dark rusted steel'
materials['galvanised-tin'].name = 'Dam / old plated steel'
materials['weathered-plank'].name = 'Dam / weathered timber'
materials['sand'].name = 'Dam / lake-bed silt'
materials['iron-dark'].name = 'Dam / blackened iron'
materials['dirty-glass'].name = 'Dam / dusty glass'
materials['salvaged-brick'].name = 'Dam / dark masonry'
salt_image = bpy.data.images.load(str(salt_photo.resolve()), check_existing=False)
salt_material = bpy.data.materials.new('Dam / wet salt crust photo')
salt_material.name = 'Dam / wet salt crust photo'
salt_material.use_nodes = True
salt_nodes = salt_material.node_tree.nodes
salt_bsdf = salt_nodes.get('Principled BSDF')
salt_bsdf.inputs['Metallic'].default_value = 0
salt_bsdf.inputs['Roughness'].default_value = .92
salt_tex = salt_nodes.new('ShaderNodeTexImage')
salt_tex.image = salt_image
salt_tex.extension = 'EXTEND'
salt_material.node_tree.links.new(salt_tex.outputs['Color'], salt_bsdf.inputs['Base Color'])
silt_image = bpy.data.images.load(str(silt_photo.resolve()), check_existing=False)
silt_material = bpy.data.materials.new('Dam / dark wet silt photograph')
silt_material.diffuse_color = (.035, .03, .024, 1)
silt_material.use_nodes = True
silt_bsdf = silt_material.node_tree.nodes.get('Principled BSDF')
silt_bsdf.inputs['Base Color'].default_value = (.035, .03, .024, 1)
silt_bsdf.inputs['Metallic'].default_value = 0
silt_bsdf.inputs['Roughness'].default_value = .98
silt_tex = silt_material.node_tree.nodes.new('ShaderNodeTexImage')
silt_tex.image = silt_image
silt_tex.extension = 'REPEAT'
silt_material.node_tree.links.new(silt_tex.outputs['Color'], silt_bsdf.inputs['Base Color'])
silt_pixels = np.empty(len(silt_image.pixels), dtype=np.float32)
silt_image.pixels.foreach_get(silt_pixels)
silt_pixels = silt_pixels.reshape((-1, 4))
silt_pixels[:, :3] *= .55
silt_image.pixels.foreach_set(silt_pixels.ravel())
silt_image.update()
stone_image = bpy.data.images.load(str(stone_photo.resolve()), check_existing=False)
stone_material = bpy.data.materials.new('Gatehouse / weathered stone photograph')
stone_material.use_nodes = True
stone_bsdf = stone_material.node_tree.nodes.get('Principled BSDF')
stone_bsdf.inputs['Metallic'].default_value = 0
stone_bsdf.inputs['Roughness'].default_value = .91
stone_tex = stone_material.node_tree.nodes.new('ShaderNodeTexImage')
stone_tex.image = stone_image
stone_tex.extension = 'REPEAT'
stone_material.node_tree.links.new(stone_tex.outputs['Color'], stone_bsdf.inputs['Base Color'])
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
    # The previous crop sampled flipped rows 104:651: it included the sky,
    # side rock and only the upper strip of concrete. Crop crest to foot.
    # Fill the narrow sky fringe above the crest with adjacent concrete so the
    # exported wall texture has no horizon or rock beyond the wall edge.
    crop = source_pixels[145:815, 220:1460, :3].copy()
    crest = np.linspace(3, 1, crop.shape[1]).astype(np.int32)
    for column, row in enumerate(crest):
        crop[:row, column] = crop[row + 4, column]
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
front_face_indices = set()
for xi in range(len(xs) - 1):
    for yi in range(len(ys) - 1):
        ymid = (ys[yi] + ys[yi + 1]) / 2
        xmid = (xs[xi] + xs[xi + 1]) / 2
        a = xi * len(ys) + yi
        b = (xi + 1) * len(ys) + yi
        front_face_indices.add(len(faces))
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
for poly in wall.data.polygons:
    if poly.index in front_face_indices:
        poly.material_index = 1
    for loop_index in poly.loop_indices:
        vertex = wall.data.vertices[wall.data.loops[loop_index].vertex_index].co
        if poly.material_index == 1:
            uv_layer.data[loop_index].uv = ((vertex.x + 75) / 150, vertex.z / 55)
wall['dimensions_m'] = [150, 55, 12]

# One projection camera maps every visible front surface to the same photo crop.
def project_face_uv(obj, polygon, left=-75, bottom=0, width=150, height=55):
    uv = obj.data.uv_layers.active
    polygon.material_index = 1
    for loop_index in polygon.loop_indices:
        vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
        uv.data[loop_index].uv = ((vertex.x - left) / width, (vertex.z - bottom) / height)

# Tall concrete piers are shallow relief placed over their photographic selves.
for i, x in enumerate((-55, -24, -18, 17, 46, 67)):
    height = 54 if abs(x) > 45 else 55
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
    pier.data.materials.append(face_material)
    pier_uv = pier.data.uv_layers.active
    for polygon in pier.data.polygons:
        # Only the photographed face gets the projection. Relief sides retain
        # the specific concrete tile and do not duplicate painted pier edges.
        if polygon.index in (2, 4):
            project_face_uv(pier, polygon)
    bevel = pier.modifiers.new('worn poured edges', 'BEVEL')
    bevel.width = .14
    bevel.segments = 1

# Removed the zig-zag rock stubs. The surrounding world supplies the hills.

# The reference picture already contains the rail arch, dark recess and door.
# Retain named part hooks while letting the shared photo carry those details.
for gate_name, gate_part in (('dam:rail-gate', 'dam:rail-gate'),
                             ('dam:rail-gate-broken', 'dam:rail-gate-broken')):
    gate_hook = bpy.data.objects.new(gate_name, None)
    scene.collection.objects.link(gate_hook)
    attach(gate_hook, gate_name, gate_part)
# Wide, low filling hall at the specified offset, open to the train cab.
sx, sz = -17, -23
box('dam:filling-shed', (sx, .18, sz), (36, .36, 30), materials['cracked-concrete'], 'dam:filling-shed', .05)
for side in (-1, 1):
    box(f'dam-filling-shed-side-{side}', (sx + side * 17.7, 5.7, sz), (.6, 11.4, 30), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-roof', (sx, 11.6, sz), (36, .7, 30), materials['cracked-concrete'], 'dam:filling-shed', .08)
box('dam-filling-shed-back', (sx, 5.7, sz - 14.8), (36, 11.4, .8), materials['cracked-concrete'], 'dam:filling-shed', .08)
# Salt-encrusted wet wall gets its own sharp photographed material, framed in runoff.
salt_wall = box('dam-filling-shed-salt-wall', (sx, 6.4, sz - 14.34), (32.5, 11.8, .08), salt_material, 'dam:filling-shed', .01)
for poly in salt_wall.data.polygons:
    if abs(poly.normal.y) > .9:
        for loop_index in poly.loop_indices:
            vertex = salt_wall.data.vertices[salt_wall.data.loops[loop_index].vertex_index].co
            salt_wall.data.uv_layers.active.data[loop_index].uv = ((vertex.x + 16.25) / 32.5, (vertex.z + 5.9) / 11.8)
for row, z in enumerate((-18, -27, -36)):
    for col, x in enumerate((-29, -5)):
        tank_y = 2.3
        cylinder(f'dam-filling-tank-{row}-{col}', (x, tank_y, z), 1.5, 8.0,
                 materials['galvanised-tin'], 'dam:filling-shed', 'X', 36)
        for end in (-1, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1,
                location=town.game_vector((x + end * 3.9, tank_y, z)))
            dome = bpy.context.object
            dome.name = f'dam-filling-tank-domed-end-{row}-{col}-{end}'
            dome.scale = (.5, 1.5, 1.5)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            dome.data.materials.append(materials['galvanised-tin'])
            attach(dome, dome.name, 'dam:filling-shed')
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
sea_gate_photo = mesh('dam:sea-gate', [(-15.5, 44.4, -62.0), (15.5, 44.4, -62.0),
    (15.5, 57.0, -62.0), (-15.5, 57.0, -62.0)], [(0, 1, 2, 3)],
    face_material, 'dam:sea-gate')
for loop_index in sea_gate_photo.data.polygons[0].loop_indices:
    vertex = sea_gate_photo.data.vertices[sea_gate_photo.data.loops[loop_index].vertex_index].co
    sea_gate_photo.data.uv_layers.active.data[loop_index].uv = ((vertex.x + 75) / 150, vertex.z / 55)
for x in range(-15, 16, 2):
    beam(f'dam-sea-gate-rib-x-{x}', (x, 44.4, -61.6), (x, 57.0, -61.6), .18,
         materials['galvanised-tin'], 'dam:sea-gate')
for y in (44.4, 47.5, 50.5, 53.5, 57.0):
    beam(f'dam-sea-gate-rib-y-{y}', (-15.2, y, -61.6), (15.2, y, -61.6), .18,
         materials['rusted-steel'], 'dam:sea-gate')
for side in (-1, 1):
    for y in range(45, 58, 3):
        cylinder(f'dam-sea-gate-bolt-{side}-{y}', (side * 14.8, y, -61.45), .12, .12,
                 materials['galvanised-tin'], 'dam:sea-gate', 'Z', 12)
for side in (-1, 1):
    for x in (-17, 17):
        beam(f'dam-crest-rail-post-{side}-{x}', (x, 28.4, -62.5 + side * 2.6),
             (x, 29.7, -62.5 + side * 2.6), .11, materials['rusted-steel'], 'dam:sea-gate')
for y in (29.1, 29.7):
    beam(f'dam-crest-rail-{y}', (-17, y, -62.5), (17, y, -62.5), .07,
         materials['galvanised-tin'], 'dam:sea-gate')

# Measured hoist assemblies replace the former light open gantry and bicycle wheels.
# Side-photo grid: wheel centre (656, 560), outer radius 550 px. Its steel-frame
# corners are (108,1168), (1206,1170), (838,474), (476,474). Mapping 550 px to
# the existing 3.15 m radius keeps both wheel centres and their 6.30 m diameter.
# End-photo grid: edge-on wheel centreline x=704, y=450, outer radius 450 px,
# rim width 100 px; frame corners (180,1008), (1232,1008), (900,286), (580,286).
# A 100 px rim maps to .59 m, preserving the existing axle span and wheel spacing.
side_photo = Photo(texture_dir / 'dam-hoist-wheel-side.png')
end_photo = Photo(texture_dir / 'dam-hoist-wheel-end-on.png')
wheel_scale = 3.15 / 550
side_centre = (656, 560)
end_centre = (700, 450)

def wheel_position(px, py, depth):
    return ((px - side_centre[0]) * wheel_scale,
            (side_centre[1] - py) * wheel_scale, depth)

def wheel_uv(index, distance, radius, angle):
    # The rim turns through the end-on photo; distance crosses its measured width.
    return end_photo.uv(end_centre[0] + distance / .59 * 100,
                        end_centre[1] - math.sin(angle) * radius / 3.15 * 450)

def wheel_cap(angle, fraction):
    return side_photo.uv(side_centre[0] + math.cos(angle) * fraction * 550,
                         side_centre[1] - math.sin(angle) * fraction * 550)

for x in (-7.5, 7.5):
    wheel = PhotoMesh()
    photo_lathe(wheel, 'rim', (0, 0, 0), (0, 0, 1), (1, 0, 0), (0, 1, 0),
        [(-.295, .58), (-.255, .78), (-.205, 2.92), (-.16, 3.15),
         (.16, 3.15), (.205, 2.92), (.255, .78), (.295, .58)], wheel_uv,
        sides=64,
        cap_start=('face', wheel_cap), cap_end=('face', wheel_cap))
    obj = wheel.finish(f'dam-hoist-lift-wheel-{x}', {'rim': end_photo.material(), 'face': side_photo.material()})
    obj.location = town.game_vector((x, 60.3, -62.75))
    attach(obj, obj.name, 'dam:sea-gate')

    # The side plates trace the photographed frame silhouette around the measured wheel opening.
    frame = PhotoMesh()
    frame_outline = [(108,1168),(148,1110),(364,600),(476,474),(838,474),
                     (952,600),(1168,1110),(1206,1170),(108,1168)]
    wheel_hole = [(656 + math.cos(a) * 552, 560 + math.sin(a) * 552)
                  for a in [math.tau * i / 64 for i in reversed(range(64))]]
    photo_slab(frame, 'steel', side_photo, [frame_outline, wheel_hole], wheel_position,
               -.43, -.31, wall_scale=wheel_scale)
    photo_slab(frame, 'steel', side_photo, [frame_outline, wheel_hole], wheel_position,
               .31, .43, wall_scale=wheel_scale)
    frame_obj = frame.finish(f'dam-hoist-lift-frame-{x}', {'steel': side_photo.material()})
    frame_obj.location = town.game_vector((x, 60.3, -62.75))
    attach(frame_obj, frame_obj.name, 'dam:sea-gate')

    # Measured diagonal and horizontal cross braces are separate traced plates.
    braces = PhotoMesh()
    for brace in ([(318,1080),(352,1060),(628,790),(608,770)],
                  [(994,1080),(960,1060),(684,790),(704,770)],
                  [(352,1060),(960,1060),(960,1100),(352,1100)]):
        photo_slab(braces, 'steel', side_photo, [brace], wheel_position,
                   -.30, .30, wall_scale=wheel_scale)
    brace_obj = braces.finish(f'dam-hoist-lift-cross-braces-{x}', {'steel': side_photo.material()})
    brace_obj.location = town.game_vector((x, 60.3, -62.75))
    attach(brace_obj, brace_obj.name, 'dam:sea-gate')

    for y in (47.5, 36.8):
        beam(f'dam-hoist-chain-{x}-{y}', (x, y, -62.75), (x, y + 2.0, -62.75), .14,
             materials['iron-dark'], 'dam:sea-gate')

# Crest-set main frame: paired legs, cross members and X bracing carry the two hoists.
for x in (-13, 13):
    for z in (-65.0, -60.5):
        beam(f'dam-hoist-gantry-leg-{x}-{z}', (x, 28.2, z), (x, 57, z), .46,
             materials['rusted-steel'], 'dam:sea-gate', .035)
    beam(f'dam-hoist-gantry-cross-{x}', (x, 57, -65), (x, 57, -60.5), .46,
         materials['rusted-steel'], 'dam:sea-gate', .035)
    for y in (35, 46):
        beam(f'dam-hoist-gantry-brace-{x}-{y}-a', (x, y, -65), (x, y + 5, -60.5), .24,
             materials['rusted-steel'], 'dam:sea-gate', .02)
        beam(f'dam-hoist-gantry-brace-{x}-{y}-b', (x, y, -60.5), (x, y + 5, -65), .24,
             materials['rusted-steel'], 'dam:sea-gate', .02)
beam('dam-hoist-gantry-top', (-13, 57, -62.75), (13, 57, -62.75), .55,
     materials['rusted-steel'], 'dam:sea-gate', .04)

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

# Rotten original gear, about seven metres across, buried more than halfway in
# an irregular heap that spreads into the basin floor.
old = ring_gear('dam:gear-old', (13, 1.05, 8), 3.5, .42, materials['rusted-steel'], 'dam:gear-old', 28)
gear_pivot = town.game_vector((13, 1.05, 8))
gear_tilt = Matrix.Rotation(.62, 4, 'X')
for vertex in old.data.vertices:
    vertex.co = gear_pivot + gear_tilt @ (vertex.co - gear_pivot)
# Overlapping wet-clay lobes make an irregular heap instead of a flat plate.
for index, (dx, dz, rx, rz, ry) in enumerate((
    (-4.0, -1.6, 4.0, 3.3, 1.05), (-1.1, 1.8, 4.1, 3.4, 1.3),
    (2.8, -1.4, 3.6, 3.7, 1.1), (4.8, 1.5, 2.3, 2.9, .72),
    (-5.5, 2.5, 2.1, 2.6, .62), (0.0, 0.0, 4.8, 3.8, .7),
)):
    center = (13 + dx, .28 + ry * .48, 8 + dz)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1,
                                         location=town.game_vector(center))
    lobe = bpy.context.object
    lobe.name = f'dam-old-gear-wet-silt-lobe-{index}'
    lobe.scale = (rx, rz, ry)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lobe.data.materials.append(silt_material)
    attach(lobe, lobe.name, 'dam:gear-old')
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
spill_top_y, spill_end_z = 42, 35
mesh('dam:spillway', [(spill_x - 7, spill_top_y, 5), (spill_x + 7, spill_top_y, 5),
     (spill_x + 7, .3, spill_end_z), (spill_x - 7, .3, spill_end_z)], [(0, 1, 2, 3)],
     materials['cracked-concrete'], 'dam:spillway', uv_scale=5)
for side in (-1, 1):
    wall_vertices = [(spill_x + side * 6.8, spill_top_y, 5), (spill_x + side * 9.2, spill_top_y, 5),
                     (spill_x + side * 11, .3, spill_end_z), (spill_x + side * 6.8, .3, spill_end_z)]
    mesh(f'dam-spillway-retaining-wall-{side}', wall_vertices, [(0, 1, 2, 3)],
         materials['cracked-concrete'], 'dam:spillway', uv_scale=5)
    beam(f'dam-spillway-retaining-cap-{side}', wall_vertices[1], wall_vertices[2], .38,
         materials['galvanised-tin'], 'dam:spillway')
# Reuse the game's actual crushed van, bus and RV from the Bowl debris model.
# These have joined bodies, frames and wheels; place twelve through the chute.
crush_path = root / 'public/assets/models/wasteland/bowl/crush.glb'
before_import = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(crush_path))
imported = set(scene.objects) - before_import
imported_names = {obj.name for obj in imported}
families = {}
for kind in ('van', 'bus', 'rv'):
    prefix = f'{kind}-crushed-'
    family = [obj for obj in imported if obj.name.startswith(prefix)]
    if not family:
        raise RuntimeError(f'Missing Bowl crushed vehicle source: {kind}')
    families[kind] = family
    for obj in family:
        if obj.type == 'MESH':
            replacement = materials['iron-dark'] if 'wheel' in obj.name else materials['rusted-steel']
            obj.data.materials.clear()
            obj.data.materials.append(replacement)
for obj in imported:
    if not any(obj in family for family in families.values()):
        bpy.data.objects.remove(obj, do_unlink=True)

placements = [
    (81.0, 7.5, .2), (85.0, 8.0, 1.0), (89.0, 8.8, .5),
    (88.5, 12.0, .8), (84.5, 12.8, .1), (80.8, 13.5, 1.1),
    (81.0, 17.0, .7), (85.2, 17.8, 1.3), (89.0, 18.5, .2),
    (88.7, 22.0, 1.2), (84.8, 22.8, .3), (80.8, 23.5, .8),
    (81.0, 27.0, .1), (85.1, 27.8, .9), (89.0, 28.5, .4),
    (88.5, 32.0, 1.0), (84.5, 32.8, .2), (80.8, 33.5, .7),
]
templates = {}
for kind, family in families.items():
    marker = next(obj for obj in family if obj.name == f'{kind}-crushed-assembly')
    templates[kind] = {
        'center': marker.matrix_world.translation.copy(),
        'meshes': [(obj, obj.matrix_world.copy()) for obj in family if obj.type == 'MESH'],
    }
for index, (x, z, stack_y) in enumerate(placements):
    kind = ('van', 'bus', 'rv')[index % 3]
    y = spill_top_y - (z - 5) * ((spill_top_y - .3) / (spill_end_z - 5)) + .12 + stack_y
    wreck_root = bpy.data.objects.new(f'dam-spillway-wreck-{index}-{kind}', None)
    scene.collection.objects.link(wreck_root)
    wreck_root.parent = root_obj
    wreck_root.location = town.game_vector((x, y, z))
    wreck_root['part'] = 'dam:spillway'
    template = templates[kind]
    target = town.game_vector((x, y, z))
    yaw = (-.72, .38, -.18, .92, -.42, .16)[index % 6]
    tilt = (.18, -.24, .36, -.12)[index % 4]
    source_points = [world @ Vector(corner) for source, world in template['meshes'] for corner in source.bound_box]
    source_extent = max(max(point[axis] for point in source_points) - min(point[axis] for point in source_points) for axis in range(3))
    scale = 6.5 / max(source_extent, .01)
    rotation = Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X')
    transform = Matrix.Translation(target) @ rotation @ Matrix.Scale(scale, 4) @ Matrix.Translation(-template['center'])
    for source, source_world in template['meshes']:
        duplicate = source.copy()
        duplicate.data = source.data
        duplicate.name = f'dam-spillway-wreck-{index}-{source.name}'
        scene.collection.objects.link(duplicate)
        duplicate.parent = root_obj
        duplicate.matrix_parent_inverse = Matrix.Identity(4)
        duplicate.matrix_world = transform @ source_world
for object_name in imported_names:
    obj = bpy.data.objects.get(object_name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)

# Wet silt packs into the remaining gaps and softens the exposed chute edges.
for index, (x, z, radius) in enumerate(((80, 12, .8), (90, 13, .65), (84, 18, .72),
                                        (80, 24, .65), (91, 27, .85), (84, 31, .7))):
    y = spill_top_y - (z - 5) * ((spill_top_y - .3) / (spill_end_z - 5)) + .12
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1,
                                         location=town.game_vector((x, y, z)))
    patch = bpy.context.object
    patch.name = f'dam-spillway-wet-silt-{index}'
    patch.scale = (radius * 2.0, radius * .8, radius * .22)
    patch.rotation_euler[0] = math.radians(54)
    patch.data.materials.append(silt_material)
    attach(patch, patch.name, 'dam:spillway')

# The gatehouse stands on its own raised pad, well above the bed.
gx, gy, gz = 45, 30, -48
box('gatehouse-own-pad', (gx, gy - .25, gz), (4.2, .5, 5.2), materials['cracked-concrete'], 'gatehouse', .14)
hut = box('gatehouse', (gx, gy + 1.25, gz), (3.2, 2.5, 4.0), stone_material, 'gatehouse', .09)
for poly in hut.data.polygons:
    for loop_index in poly.loop_indices:
        vertex = hut.data.vertices[hut.data.loops[loop_index].vertex_index].co
        normal = poly.normal
        if abs(normal.x) > .9:
            u, v = vertex.y, vertex.z
        elif abs(normal.y) > .9:
            u, v = vertex.x, vertex.z
        else:
            u, v = vertex.x, vertex.y
        hut.data.uv_layers.active.data[loop_index].uv = (u / 2.5, v / 2.5)
mesh('gatehouse-gable-front', [(gx - 1.6, gy + 2.5, gz + 2.02), (gx + 1.6, gy + 2.5, gz + 2.02),
     (gx, gy + 3.05, gz + 2.02)], [(0, 1, 2)], stone_material, 'gatehouse', uv_scale=2.5)
mesh('gatehouse-gable-back', [(gx - 1.6, gy + 2.5, gz - 2.02), (gx + 1.6, gy + 2.5, gz - 2.02),
     (gx, gy + 3.05, gz - 2.02)], [(0, 1, 2)], stone_material, 'gatehouse', uv_scale=2.5)
for side in (-1, 1):
    roof_vertices = [(gx, gy + 3.05, gz - 2.4), (gx, gy + 3.05, gz + 2.4),
                     (gx + side * 2.05, gy + 2.5, gz + 2.4), (gx + side * 2.05, gy + 2.5, gz - 2.4)]
    mesh(f'gatehouse-roof-slope-{side}', roof_vertices, [(0, 1, 2, 3)],
         materials['rusted-steel'], 'gatehouse')
box('gatehouse:door', (gx, gy + .97, gz + 2.04), (.82, 1.9, .10), materials['weathered-plank'], 'gatehouse:door', .04)
beam('gatehouse-lamp-bracket', (gx + 1.0, gy + 2.28, gz + 2.0), (gx + 1.55, gy + 2.28, gz + 2.0), .07,
     materials['rusted-steel'], 'gatehouse')
box('gatehouse-dead-lamp-case', (gx + 1.55, gy + 2.0, gz + 2.0), (.34, .42, .27), materials['iron-dark'], 'gatehouse', .06)
for side in (-1, 1):
    box(f'gatehouse-window-{side}', (gx + side * 1.05, gy + 1.55, gz + 2.02), (.48, .52, .08), materials['dirty-glass'], 'gatehouse', .03)
box('gatehouse-bench-seat', (gx + 2.0, gy + .55, gz + 2.75), (1.65, .14, .42), materials['weathered-plank'], 'gatehouse', .05)
for x in (gx + 1.4, gx + 2.6):
    beam(f'gatehouse-bench-leg-{x}', (x, gy, gz + 2.75), (x, gy + .48, gz + 2.75), .08,
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
scene.view_settings.view_transform = 'Standard'
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
area_light('filling hall daylight on salt wall', (-17, 19, -16), 26000, 13)

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
    ('filling-shed-interior', (-17, 4.0, -5), (-17, 5.5, -37), 35),
    ('spillway', (104, 30, 60), (85, 18, 20), 42),
    ('wrecks', (111, 36, 35), (85, 15, 20), 50),
    ('gatehouse', (53, 34, -35), (45, 32, -48), 52),
    ('gear-old', (22, 9, 27), (13, 1.35, 8), 60),
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
    if name == 'dam-match':
        visible_prefixes = ('dam:face', 'dam-buttress-', 'dam-rail-', 'dam:rail-')
        visible_prefixes += ('dam:sea-gate', 'dam-sea-gate-', 'dam-hoist-', 'dam:sea-wheel', 'dam-sea-wheel-')
        for obj in imported:
            if obj.type == 'MESH':
                obj.hide_render = (obj.name != 'review ground only'
                    and not obj.name.startswith(visible_prefixes))
    elif name == 'gatehouse':
        for obj in imported:
            obj.hide_render = (obj.name != 'review ground only'
                and not obj.name.startswith(('gatehouse',)))
    bpy.ops.render.render(write_still=True)
    for obj in imported:
        if obj.type == 'MESH':
            obj.hide_render = False
    captures.append(path)

# The requested art sheet uses only GLB re-imports. Two top panels share one
# side camera and scale; the lower panels show the crest structure and dam context.
from PIL import Image, ImageOps
round_dir = root / 'docs/board/looks/ww-art-dam-2'
round_dir.mkdir(parents=True, exist_ok=True)
def render_detail(name, location, target, prefixes, ortho=None, focal=50, size=(800,450)):
    camera(name, location, target, focal)
    scene.camera.data.type = 'ORTHO' if ortho else 'PERSP'
    if ortho:
        scene.camera.data.ortho_scale = ortho
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(raw / f'{name}.jpg')
    for obj in imported:
        if obj.type == 'MESH':
            obj.hide_render = (obj.name != 'review ground only'
                               and not obj.name.startswith(prefixes))
    bpy.ops.render.render(write_still=True)
    for obj in imported:
        if obj.type == 'MESH':
            obj.hide_render = False
    return Path(scene.render.filepath)

wheel_view = ((7.5, 60.3, -50), (7.5, 60.3, -62.75))
model_side = render_detail('hoist-wheel-side', *wheel_view,
    ('dam-hoist-lift-wheel-7.5', 'dam-hoist-lift-frame-7.5', 'dam-hoist-lift-cross-braces-7.5'),
    ortho=8.4)
gantry_view = render_detail('hoist-gantry-crest', (0, 31, -48), (0, 49, -62.75),
    ('dam-hoist-',), focal=42)
dam_view = render_detail('dam-context-60m', (112, 84, 50), (0, 25, -45), ('',), focal=38)

photo_image = Image.open(texture_dir / 'dam-hoist-wheel-side.png').convert('RGB')
photo_panel = Image.new('RGB', (800,450), (218,218,215))
photo_fit = ImageOps.contain(photo_image, (800,450), method=Image.Resampling.LANCZOS)
photo_panel.paste(photo_fit, ((800-photo_fit.width)//2, (450-photo_fit.height)//2))
model_panel = ImageOps.fit(Image.open(model_side).convert('RGB'), (800,450), method=Image.Resampling.LANCZOS)
gantry_panel = ImageOps.fit(Image.open(gantry_view).convert('RGB'), (800,450), method=Image.Resampling.LANCZOS)
dam_panel = ImageOps.fit(Image.open(dam_view).convert('RGB'), (800,450), method=Image.Resampling.LANCZOS)
sheet_image = Image.new('RGB', (1600,900))
sheet_image.paste(photo_panel, (0,0)); sheet_image.paste(model_panel, (800,0))
sheet_image.paste(gantry_panel, (0,450)); sheet_image.paste(dam_panel, (800,450))
sheet_image.save(sheet, 'JPEG', quality=88, optimize=True)
print(f'WW-ART-DAM-2 sheet: {sheet} ({sheet.stat().st_size} bytes)')

print('GLB reimport review renders completed.')
