"""Build and review the sanitation buildings from the town waterworks kit."""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=2)
parser.add_argument('--reference', default=r'C:\Users\kyleb\.codex\generated_images\01a1b023-23b1-7542-8d00-9381df5f6c46\exec-92de98f3-97fc-4928-b74e-6e038c158e40.png')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
if args.round != 2:
    parser.error('this lane submits round 2')
root = Path(args.root).resolve()
textures = root / 'public/assets/models/wasteland/town/textures'
out = root / 'public/assets/models/wasteland/town/sanitation.glb'
evidence = root / '.qa-dist/town-art-sanitation/round-2'
sheet = root / 'docs/board/looks/town-art-sanitation/round-2.jpg'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

# Reuse the waterworks photos and geometry helpers, with one separate image
# per material. The picture of the reeds is the only alpha texture.
m = town.make_materials({
    'weathered-plank': textures / 'town-water-timber.jpg',
    'galvanised-tin': textures / 'town-water-corrugated.jpg',
    'rusted-steel': textures / 'town-water-tin.jpg',
    'cracked-concrete': textures / 'town-water-concrete.jpg',
    'sand': textures / 'town-water-earth.jpg',
})

def surface(name, color, metallic=0.0, roughness=.84):
    material = bpy.data.materials.new('Sanitation / ' + name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = min(metallic, .29)
    shader.inputs['Roughness'].default_value = roughness
    return material

gravel = m['salvaged-brick']
dark_water = surface('stagnant brown water', (.055, .075, .052), .04, .25)
falling_water = surface('water over the weirs', (.13, .17, .14), .04, .19)
stone = surface('rounded filter stone', (.28, .27, .23))
dark_steel = surface('dark steel channel', (.12, .105, .082), .24)
iron = m['iron-dark']
bottle = surface('bottle glass', (.15, .22, .18), .10, .32)
rubber = surface('salvaged black tyre rubber', (.045, .048, .041), .0, .94)
scrap_red = surface('old oxide paint', (.20, .09, .06), .08)
compost_a = surface('dry brown compost', (.13, .095, .055))
compost_b = surface('damp dark compost', (.075, .061, .041))
compost_c = surface('finished broken compost', (.19, .135, .075))

reed_image = bpy.data.images.load(str((textures / 'sanitation-reed-clump.png').resolve()), check_existing=False)
reed_image.pack()
reed_material = bpy.data.materials.new('Sanitation / photographed reed cutout')
reed_material.use_nodes = True
reed_shader = reed_material.node_tree.nodes.get('Principled BSDF')
reed_tex = reed_material.node_tree.nodes.new('ShaderNodeTexImage')
reed_tex.image = reed_image
reed_tex.interpolation = 'Linear'
reed_material.node_tree.links.new(reed_tex.outputs['Color'], reed_shader.inputs['Base Color'])
reed_material.node_tree.links.new(reed_tex.outputs['Alpha'], reed_shader.inputs['Alpha'])
reed_shader.inputs['Roughness'].default_value = .92
reed_material.alpha_threshold = .5
reed_material.surface_render_method = 'DITHERED'

family = bpy.data.objects.new('town-sanitation', None)
bpy.context.collection.objects.link(family)

def building(name, offset):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = family
    obj.location = town.game_vector(offset)
    return obj

def keep(obj, parent):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = obj.matrix_world.copy()
    world.translation += parent.matrix_world.translation
    obj.parent = parent
    obj.matrix_world = world
    return obj

def box(parent, name, center, size, material, bevel=0):
    # The stock water kit's cube helper is retained, while repetitive boards
    # stay low-poly. Its bevel is reserved for isolated hero props.
    return keep(town.cube(name, center, size, material, 0), parent)

def beam(parent, name, a, b, width, material):
    va = town.game_vector(a); vb = town.game_vector(b); delta = vb - va
    obj = town.cube(name, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2),
                    (width, delta.length, width), material, 0)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return keep(obj, parent)

def cylinder(parent, name, center, radius, depth, material, vertices=10, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=town.game_vector(center))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    if rotation is not None:
        obj.rotation_euler = rotation
    return keep(obj, parent)

def torus(parent, name, center, major, minor, material, rotation=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=8, minor_segments=4,
                                    major_radius=major, minor_radius=minor,
                                    location=town.game_vector(center))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    if rotation is not None:
        obj.rotation_euler = rotation
    return keep(obj, parent)

def pipe(parent, name, points, radius, material):
    before = set(bpy.context.scene.objects)
    town.pipe_run(name, points, radius, material)
    for obj in set(bpy.context.scene.objects) - before:
        keep(obj, parent)

def formed_sheet(parent, name, center, width, height, bent=0, rotation=None):
    """Reuse town-water's formed tin, omitting its decorative sphere bolts."""
    before = set(bpy.context.scene.objects)
    panel = town.corrugated_sheet(name, center, width, height, m, bent=bent)
    for obj in set(bpy.context.scene.objects) - before:
        if 'lap-rivet-' in obj.name:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            if obj is panel and rotation is not None:
                obj.rotation_euler = rotation
            keep(obj, parent)
    return panel

def photo_cards(parent, name, x, y, z, height, width, angle):
    """Two crossed, textured planes; shared UV name preserves TEXCOORD_0."""
    for side, yaw in enumerate((angle, angle + math.pi / 2)):
        half = width / 2
        verts = [(-half, 0, 0), (half, 0, 0), (half, height, 0), (-half, height, 0)]
        mesh = bpy.data.meshes.new(f'{name}:leaf-card-{side + 1}')
        mesh.from_pydata([town.game_vector(v) for v in verts], [], [(0, 1, 2, 3)])
        mesh.materials.append(reed_material)
        uv = mesh.uv_layers.new(name='UVMap')
        for loop, value in zip(uv.data, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop.uv = value
        obj = bpy.data.objects.new(f'{name}:crossed-card-{side + 1}', mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = town.game_vector((x, y, z))
        obj.rotation_euler[2] = yaw
        keep(obj, parent)

def rough_heap(parent, name, center, rx, ry, rz, material, seed):
    """Low-poly uneven mound with lumpy, torn edges rather than a smooth egg."""
    n = 14
    rings = ((.25, .05), (.58, .47), (1.0, .88), (.71, 1.0))
    verts = []
    for ring, (scale, yscale) in enumerate(rings):
        for i in range(n):
            a = math.tau * i / n
            wobble = 1 + .11 * math.sin(i * 3.7 + seed) + .05 * math.sin(i * 8.1 + seed * 2)
            h = yscale * (1 + .12 * math.sin(i * 2.2 + seed))
            verts.append(town.game_vector((center[0] + math.cos(a) * rx * scale * wobble,
                                           center[1] + ry * h,
                                           center[2] + math.sin(a) * rz * scale * wobble)))
    faces = []
    for row in range(len(rings) - 1):
        for i in range(n):
            a = row * n + i; b = row * n + (i + 1) % n
            c = (row + 1) * n + (i + 1) % n; d = (row + 1) * n + i
            faces.append((a, b, c, d))
    faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n)))
    mesh = bpy.data.meshes.new(name + ' rough compost form')
    mesh.from_pydata(verts, [], faces); mesh.materials.append(material); mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = (co.x / .5, co.y / .5)
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    obj.location = town.game_vector((0, 0, 0))
    return keep(obj, parent)

# 1. Reed bed: three real stepped masonry-and-timber cells, no ground plate.
reed_root = building('reed-bed', (0, 0, 0))
cell_z = (6.2, 0.0, -6.2)
floor_y = (.38, .18, 0.0)
for i, (z, base_y) in enumerate(zip(cell_z, floor_y), 1):
    length, depth, wall_h, wall_t = 17.2, 4.15, .72, .20
    top = base_y + wall_h
    box(reed_root, f'reed-bed:cell-{i}:gravel-bed', (0, base_y + .08, z),
        (length - .38, .16, depth - .38), gravel, .02)
    box(reed_root, f'reed-bed:cell-{i}:dark-water', (0, base_y + .40, z),
        (length - .58, .045, depth - .58), dark_water, .01)
    # Four stone/concrete walls with a real 20 cm section and timber crest.
    for side in (-1, 1):
        x = side * (length / 2 - wall_t / 2)
        box(reed_root, f'reed-bed:cell-{i}:concrete-end-{side}', (x, base_y + wall_h / 2, z),
            (wall_t, wall_h, depth), m['cracked-concrete'], .045)
        beam(reed_root, f'reed-bed:cell-{i}:timber-cap-{side}',
             (x, top + .07, z - depth / 2), (x, top + .07, z + depth / 2), .16, m['weathered-plank'])
    for side in (-1, 1):
        zz = z + side * (depth / 2 - wall_t / 2)
        box(reed_root, f'reed-bed:cell-{i}:concrete-side-{side}', (0, base_y + wall_h / 2, zz),
            (length, wall_h, wall_t), m['cracked-concrete'], .045)
        beam(reed_root, f'reed-bed:cell-{i}:timber-cap-side-{side}',
             (-length / 2, top + .07, zz), (length / 2, top + .07, zz), .16, m['weathered-plank'])
    # Dark steel U-channel posts and exposed bolts at each wall joint.
    for x in (-8.2, -4.1, 0, 4.1, 8.2):
        for side in (-1, 1):
            zz = z + side * (depth / 2 - .07)
            beam(reed_root, f'reed-bed:cell-{i}:channel-post-{x}-{side}',
                 (x, base_y + .04, zz), (x, top + .02, zz), .10, dark_steel)
            for bolt_y in (base_y + .18, top - .12):
                cylinder(reed_root, f'reed-bed:cell-{i}:bolt-{x}-{side}-{bolt_y}',
                         (x, bolt_y, zz - side * .065), .043, .035, iron, 8)
    # Cracks and rust runs sit under the exposed fasteners.
    for k, x in enumerate((-7.9, -3.95, .08, 4.05, 7.8)):
        beam(reed_root, f'reed-bed:cell-{i}:crack-{k}', (x, base_y + .04, z - depth / 2 - .012),
             (x + .10, base_y + .42, z - depth / 2 - .014), .018, scrap_red)
    # Rounded stones are visible around the stems in the shallow water.
    for j in range(14):
        x = -7.25 + (j % 7) * 2.25
        zz = z - 1.05 + (j // 7) * 2.05 + (.18 if j % 2 else 0)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=0, radius=.18 + .03 * (j % 3),
                                             location=town.game_vector((x, base_y + .21, zz)))
        pebble = bpy.context.object; pebble.name = f'reed-bed:cell-{i}:stone-{j}'
        pebble.scale = (1.3, .46, .72); pebble.data.materials.append(stone if j % 4 else m['cracked-concrete'])
        keep(pebble, reed_root)
    # 44 photographed clumps per cell in four staggered rows; each is a crossed
    # pair, 1.2–1.8 m high, so the planted area reads as a dense bed.
    for j in range(44):
        row = j // 11
        x = -7.55 + (j % 11) * 1.42 + (row % 2) * .28
        zz = z - 1.60 + row * 1.04
        height = 1.2 + (j * 13 % 7) * .10
        photo_cards(reed_root, f'reed-bed:cell-{i}:reed-{j + 1}', x, base_y + .31, zz,
                    height, 1.08 + (j % 3) * .08, j * .47)
    # The low notches and cascade lips connect each chamber in order.
    if i < 3:
        lip_z = z - depth / 2 - .12
        box(reed_root, f'reed-bed:weir-{i}:notched-lip', (0, base_y + .46, lip_z),
            (1.15, .08, .42), m['rusted-steel'], .02)
        for x in (-.42, 0, .42):
            pipe(reed_root, f'reed-bed:weir-{i}:fall-{x}',
                 [(x, base_y + .53, lip_z), (x, base_y + .28, lip_z - .26),
                  (x, base_y + .08, lip_z - .62)], .035, falling_water)
pipe(reed_root, 'reed-bed:inlet-feed', [(-8.8, 2.65, 8.55), (-8.8, 2.65, 6.55),
                                         (-8.8, 1.25, 6.30), (-8.0, .88, 6.20)], .13, dark_steel)
torus(reed_root, 'reed-bed:inlet-flange', (-8.8, 2.65, 8.5), .22, .045, iron)
pipe(reed_root, 'reed-bed:bottom-outfall', [(8.3, .42, -6.2), (9.1, .24, -6.7),
                                            (9.7, .12, -8.8), (11.2, .10, -9.5)], .15, m['rusted-steel'])
for side in (-1, 1):
    beam(reed_root, f'reed-bed:outfall-ditch-edge-{side}', (8.8, .02, -9.0 + side * .48),
         (12.0, .02, -9.0 + side * .48), .10, m['weathered-plank'])

# 2. Latrine: three narrow timber-and-tin stalls with doors and a pitched roof.
latrine = building('latrine', (-20, 0, -20))
for i, x in enumerate((-1.9, 0, 1.9), 1):
    width, depth, height = 1.75, 2.25, 2.35
    box(latrine, f'latrine:stall-{i}:floor', (x, .10, 0), (width, .20, depth), m['weathered-plank'])
    # Individual vertical boards retain gaps and grain instead of a single block.
    for side in (-1, 1):
        for plank in range(7):
            px = x + side * (width / 2 - .08)
            pz = -.96 + plank * .30
            box(latrine, f'latrine:stall-{i}:side-board-{side}-{plank}', (px, 1.25, pz),
                (.12, 2.12, .27), m['weathered-plank'], .012)
        beam(latrine, f'latrine:stall-{i}:front-post-{side}',
             (x + side * (width / 2 - .08), .18, -1.05),
             (x + side * (width / 2 - .08), 2.58, -1.05), .13, dark_steel)
    for plank in range(7):
        z = .97
        box(latrine, f'latrine:stall-{i}:back-board-{plank}', (x - .78 + plank * .26, 1.25, z),
            (.23, 2.13, .12), m['weathered-plank'], .012)
    # Closed plank door with a visible latch, hinge straps and worn lower kick rail.
    for plank in range(5):
        box(latrine, f'latrine:stall-{i}:door-plank-{plank}',
            (x - .52 + plank * .26, 1.14, -1.085), (.24, 1.92, .10),
            m['weathered-plank'], .01)
    for y in (.48, 1.65):
        beam(latrine, f'latrine:stall-{i}:door-brace-{y}',
             (x - .60, y, -1.15), (x + .60, y, -1.15), .065, dark_steel)
    cylinder(latrine, f'latrine:stall-{i}:latch', (x + .43, 1.08, -1.23), .045, .12, iron, 8)
    # Rear and side cladding runs to roof level; the front is the door line.
    for y in (2.45, 2.60):
        beam(latrine, f'latrine:stall-{i}:front-header-{y}',
             (x - .88, y, -1.05), (x + .88, y, -1.05), .11, m['weathered-plank'])
    for side in (-1, 1):
        roof_panel = town.cube(f'latrine:stall-{i}:sloped-tin-roof-{side}',
                               (x, 2.68, side * .66), (1.9, .10, 1.42),
                               m['galvanised-tin'], 0)
        roof_panel.rotation_euler[0] = side * .17
        keep(roof_panel, latrine)
    beam(latrine, f'latrine:stall-{i}:roof-ridge', (x - .98, 2.84, 0),
         (x + .98, 2.84, 0), .07, dark_steel)
    # Half-moon vent is an open crescent cutout above the door, framed by tin.
    for side in (-1, 1):
        box(latrine, f'latrine:stall-{i}:vent-cheek-{side}', (x + side * .28, 2.24, -1.16),
            (.30, .25, .06), m['galvanised-tin'], .015)
    cylinder(latrine, f'latrine:stall-{i}:half-moon-vent-lintel', (x, 2.34, -1.16), .19, .06, dark_steel, 12)
pipe(latrine, 'latrine:vent-stack', [(-2.2, 2.05, .35), (-2.2, 3.65, .35),
                                      (-2.2, 4.0, .35)], .105, m['rusted-steel'])
box(latrine, 'latrine:front-step', (0, .12, -1.62), (5.9, .24, .48), m['cracked-concrete'])
for side in (-1, 1):
    beam(latrine, f'latrine:roof-purlin-{side}', (-3.1, 2.74, side * 1.0),
         (3.1, 2.74, side * 1.0), .11, m['weathered-plank'])

# 3. Bathhouse: enclosed thick walls, patched roof, tank, boiler and duckboards.
bath = building('bathhouse', (20, 0, -20))
width, depth = 13.6, 13.6
for x in (-6.65, 6.65):
    for z in (-6.65, 6.65):
        beam(bath, f'bathhouse:corner-post-{x}-{z}', (x, .08, z), (x, 3.55, z), .22, dark_steel)
# Front wall leaves a 1.25 m doorway; the high windows are dark openings with frames.
for side in (-1, 1):
    for plank in range(18):
        x = side * (1.05 + plank * .31)
        box(bath, f'bathhouse:front-wall-plank-{side}-{plank}', (x, 1.62, -6.65),
            (.30, 3.05, .16), m['weathered-plank'], .012)
for side in (-1, 1):
    box(bath, f'bathhouse:door-jamb-{side}', (side * .67, 1.72, -6.69), (.14, 3.3, .18), dark_steel)
for plank in range(5):
    box(bath, f'bathhouse:door-plank-{plank}', (-.53 + plank * .22, 1.46, -6.71),
        (.205, 2.72, .20), m['weathered-plank'], .014)
beam(bath, 'bathhouse:door-lintel', (-.80, 3.12, -6.7), (.80, 3.12, -6.7), .16, dark_steel)
# Back wall and side walls use separate timber courses and rusted tin patch sheets.
for side in (-1, 1):
    for plank in range(24):
        z = -6.42 + plank * .55
        box(bath, f'bathhouse:side-plank-{side}-{plank}', (side * 6.55, 1.55, z),
            (.18, 2.95, .53), m['weathered-plank'], .01)
    # Alternating formed tin patch bays are bonded over the boards.
    for patch, z in enumerate((-3.1, 3.0)):
        formed_sheet(bath, f'bathhouse:side-tin-patch-{side}-{patch}',
                     (side * 6.64, 1.75, z), 3.4, 2.1, bent=.018 * side,
                     rotation=(0, 0, math.pi / 2))
for plank in range(24):
    box(bath, f'bathhouse:rear-wall-plank-{plank}', (-6.3 + plank * .55, 1.55, 6.55),
        (.53, 2.95, .18), m['weathered-plank'], .01)
# Two little clerestory windows sit high on the road-facing side.
for x in (-3.3, 3.3):
    box(bath, f'bathhouse:high-window-dark-{x}', (x, 2.86, -6.77), (1.42, .54, .08),
        surface('bathhouse dark window', (.025, .035, .031), .02, .22), .01)
    for xx in (-.74, .74):
        beam(bath, f'bathhouse:window-frame-side-{x}-{xx}', (x + xx, 2.55, -6.77),
             (x + xx, 3.17, -6.77), .055, dark_steel)
    for yy in (2.55, 3.17):
        beam(bath, f'bathhouse:window-frame-top-{x}-{yy}', (x - .74, yy, -6.77),
             (x + .74, yy, -6.77), .055, dark_steel)
    beam(bath, f'bathhouse:window-mullion-{x}', (x, 2.55, -6.78), (x, 3.17, -6.78), .035, iron)
# Roof is timber rafters, deck boards and overlapping corrugated patches on two slopes.
for x in (-6.0, -3.0, 0, 3.0, 6.0):
    beam(bath, f'bathhouse:roof-rafter-{x}', (x, 3.48, -6.9), (x, 4.05, 0), .14, m['weathered-plank'])
    beam(bath, f'bathhouse:roof-rafter-rear-{x}', (x, 4.05, 0), (x, 3.48, 6.9), .14, m['weathered-plank'])
for side in (-1, 1):
    for patch, x in enumerate((-3.5, 3.5)):
        formed_sheet(bath, f'bathhouse:patched-roof-{side}-{patch}',
                     (x, 3.80, side * 3.35), 6.8, 7.2,
                     bent=(.025 if patch % 2 else -.02),
                     rotation=((math.pi / 2 - .082) * side, 0, 0))
beam(bath, 'bathhouse:roof-ridge', (-7.1, 4.08, 0), (7.1, 4.08, 0), .15, m['rusted-steel'])
# Elevated water tank and its stand are connected to the roof framing.
for x in (3.4, 5.3):
    for z in (-1.8, 1.8):
        beam(bath, f'bathhouse:tank-stand-leg-{x}-{z}', (x, 4.05, z), (x, 5.65, z), .13, dark_steel)
box(bath, 'bathhouse:tank-stand-deck', (4.35, 5.64, 0), (2.25, .16, 4.2), m['weathered-plank'])
cylinder(bath, 'bathhouse:roof-tank', (4.35, 6.28, 0), .88, 1.1, m['rusted-steel'], 28)
for y in (5.78, 6.25, 6.72):
    torus(bath, f'bathhouse:tank-hoop-{y}', (4.35, y, 0), .90, .045, dark_steel)
pipe(bath, 'bathhouse:tank-down-pipe', [(5.1, 5.8, 0), (5.9, 5.5, 0), (6.15, 3.6, 0)], .075, m['galvanised-tin'])
pipe(bath, 'bathhouse:stovepipe', [(-4.7, 3.2, 2.4), (-4.7, 4.4, 2.4),
                                    (-4.7, 5.6, 2.4)], .11, m['rusted-steel'])
torus(bath, 'bathhouse:stovepipe-collar', (-4.7, 4.55, 2.4), .15, .035, iron)
cylinder(bath, 'bathhouse:boiler', (-4.7, .98, 2.4), .66, 1.8, m['rusted-steel'], 24)
for y in (.30, 1.55):
    torus(bath, f'bathhouse:boiler-band-{y}', (-4.7, y, 2.4), .67, .045, dark_steel)
for i in range(14):
    # Slatted duckboards run from the doorway to the hot-water corner.
    box(bath, f'bathhouse:duckboard-{i}', (-3.0 + i * .46, .12, -5.6 + (i % 3) * .45),
        (.40, .10, 2.0), m['weathered-plank'], .012)

# 4. Trash sorter: posts, tin roof, workbench, scrap piles, bins and low fence.
sorter = building('trash-sorter', (0, 0, 20))
for x in (-10.5, -6.2, -1.8, 2.7, 7.3, 10.5):
    for z in (-6.2, 0, 6.2):
        if x < -1.8 or x > 2.7 or z in (-6.2, 6.2):
            beam(sorter, f'trash-sorter:roof-post-{x}-{z}', (x, .08, z), (x, 4.0, z), .15, dark_steel)
for x in (-8.5, -4.5, -.5, 3.5, 7.5):
    beam(sorter, f'trash-sorter:roof-truss-{x}', (x, 4.05, -6.8), (x, 4.62, 0), .13, m['weathered-plank'])
    beam(sorter, f'trash-sorter:roof-truss-back-{x}', (x, 4.62, 0), (x, 4.05, 6.8), .13, m['weathered-plank'])
for side in (-1, 1):
    for patch, x in enumerate((-7.0, 0, 7.0)):
        formed_sheet(sorter, f'trash-sorter:roof-tin-{side}-{patch}',
                     (x, 4.31, side * 3.4), 7.0, 7.2,
                     bent=.022 * (patch % 2), rotation=(side * 1.49, 0, 0))
beam(sorter, 'trash-sorter:ridge', (-10.7, 4.65, 0), (10.7, 4.65, 0), .15, m['rusted-steel'])
# Sorting bench with a hand-cranked sifting drum and real timber legs.
for x in (-2.2, 2.2):
    for z in (-2.0, 2.0):
        beam(sorter, f'trash-sorter:bench-leg-{x}-{z}', (x, .12, z), (x, 1.5, z), .12, m['weathered-plank'])
box(sorter, 'trash-sorter:sorting-bench', (0, 1.52, 0), (5.0, .18, 4.5), m['weathered-plank'])
for z in (-2.28, 2.28):
    beam(sorter, f'trash-sorter:bench-lip-{z}', (-2.55, 1.75, z), (2.55, 1.75, z), .12, dark_steel)
cylinder(sorter, 'trash-sorter:sifting-drum', (0, 2.45, 0), .64, 3.3, dark_steel, 16,
         rotation=(math.pi / 2, 0, 0))
for x in (-1.45, -1.0, -.5, 0, .5, 1.0, 1.45):
    torus(sorter, f'trash-sorter:drum-hoop-{x}', (x, 2.45, 0), .65, .035,
          m['rusted-steel'], rotation=(0, math.pi / 2, 0))
for side in (-1, 1):
    beam(sorter, f'trash-sorter:drum-axle-{side}', (side * 1.95, 2.45, 0), (side * 2.38, 2.45, 0), .12, m['galvanised-tin'])
torus(sorter, 'trash-sorter:drum-crank', (2.42, 2.45, 0), .40, .055, m['rusted-steel'],
      rotation=(0, math.pi / 2, 0))
beam(sorter, 'trash-sorter:crank-handle', (2.42, 2.45, 0), (2.42, 2.85, 0), .06, m['weathered-plank'])
# Three open sorting bays contain distinct real salvage shapes.
for i, x in enumerate((-8.0, -4.0, 5.9), 1):
    for side in (-1, 1):
        beam(sorter, f'trash-sorter:bin-post-{i}-{side}', (x + side * 1.6, .10, -2.9),
             (x + side * 1.6, 1.3, -2.9), .11, dark_steel)
        beam(sorter, f'trash-sorter:bin-side-{i}-{side}', (x + side * 1.6, .82, -2.9),
             (x + side * 1.6, .82, 2.9), .11, m['weathered-plank'])
    for y in (.48, .88):
        beam(sorter, f'trash-sorter:bin-front-{i}-{y}', (x - 1.6, y, -2.9), (x + 1.6, y, -2.9),
             .14, m['weathered-plank'])
    for j in range(12):
        px = x - 1.15 + (j % 4) * .72
        pz = -1.9 + (j // 4) * 1.15
        cylinder(sorter, f'trash-sorter:bin-{i}:bent-tin-{j}', (px, 1.03 + .06 * (j % 3), pz),
                 .22 + .03 * (j % 2), .28 + .1 * (j % 3), m['galvanised-tin'], 10)
# Stacked rubber tyres, each with a real torus section; wrecked vehicle parts echo the Dome.
for stack, (x, z) in enumerate(((-10, 3.6), (-8.9, 3.7), (8.7, 3.7), (9.8, 3.5))):
    for layer in range(3 if stack % 2 == 0 else 2):
        torus(sorter, f'trash-sorter:salvage-tyre-{stack}-{layer}',
              (x, .42 + layer * .31, z), .49, .17, rubber)
for i in range(8):
    x = 5.8 + (i % 4) * .75; z = 2.1 + (i // 4) * 1.1
    cylinder(sorter, f'trash-sorter:glass-bottle-{i}', (x, .45, z), .15, .62, bottle, 12)
    cylinder(sorter, f'trash-sorter:bottle-neck-{i}', (x, .80, z), .07, .16, bottle, 10)
# Chunky bent scrap angles and shell fragments are reused forms from town-dome's yard language.
for i in range(16):
    x = -1.8 + (i % 4) * .78
    z = 3.1 + (i // 4) * .55
    piece = box(sorter, f'trash-sorter:car-scrap-panel-{i}', (x, .52 + (i % 3) * .12, z),
                (.76, .18, .46), scrap_red if i % 3 else m['rusted-steel'], .055)
    piece.rotation_euler[1] = (i % 4 - 1.5) * .18
for side in (-1, 1):
    for z in range(8):
        zz = -7.1 + z * 2.02
        beam(sorter, f'trash-sorter:low-fence-picket-{side}-{z}',
             (side * 11.15, .05, zz), (side * 11.15, 1.05, zz), .10, m['weathered-plank'])
    beam(sorter, f'trash-sorter:low-fence-rail-{side}-low', (side * 11.15, .42, -7.4),
         (side * 11.15, .42, 7.4), .10, dark_steel)
    beam(sorter, f'trash-sorter:low-fence-rail-{side}-high', (side * 11.15, .88, -7.4),
         (side * 11.15, .88, 7.4), .10, m['weathered-plank'])

# 5. Compost: three hand-built bays with rough piles at different stages.
compost = building('compost-heap', (-20, 0, 0))
for bay, x in enumerate((-2.12, 0, 2.12), 1):
    for side in (-1, 1):
        for y in (.45, .86, 1.27):
            beam(compost, f'compost-heap:bay-{bay}:side-board-{side}-{y}',
                 (x + side * .93, y, -1.32), (x + side * .93, y, 1.32), .12, m['weathered-plank'])
        for y in (.32, .73, 1.14):
            beam(compost, f'compost-heap:bay-{bay}:front-board-{y}',
                 (x - .93, y, -1.32), (x + .93, y, -1.32), .12, m['weathered-plank'])
    beam(compost, f'compost-heap:bay-{bay}:back-board', (x - .92, .75, 1.30),
         (x + .92, .75, 1.30), .12, m['weathered-plank'])
    stage_material = (compost_a, compost_b, compost_c)[bay - 1]
    pile_height = (1.00, 1.36, .72)[bay - 1]
    rough_heap(compost, f'compost-heap:bay-{bay}:rough-pile', (x, .18, 0), .82, pile_height, 1.1,
               stage_material, bay * 17)
    # Rough broken clods on top keep the pile granular at road height.
    for j in range(5):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.18 + .03 * (j % 2),
                                             location=town.game_vector((x - .5 + j * .23,
                                                                        .72 + .10 * (j % 3),
                                                                        -.25 + .10 * (j % 4))))
        clod = bpy.context.object; clod.name = f'compost-heap:bay-{bay}:clod-{j}'
        clod.scale = (1.15, .75, .9); clod.data.materials.append(stage_material); keep(clod, compost)
# Pitchfork is visibly planted in the last bay, with four metal tines embedded in the pile.
beam(compost, 'compost-heap:fork-handle', (2.05, .7, -1.48), (2.22, 2.0, -1.20), .07, m['weathered-plank'])
for tine in range(4):
    x = 1.85 + tine * .13
    beam(compost, f'compost-heap:fork-tine-{tine}', (x, .9, -1.43), (x + .04, .28, -1.59), .035, dark_steel)
beam(compost, 'compost-heap:fork-crossbar', (1.78, .83, -1.45), (2.34, .90, -1.45), .06, iron)

# Every authored part uses one named UV set. Missing UVs are generated by a
# physical projection so each exported primitive receives only TEXCOORD_0.
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    layer = obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for uv_layer in obj.data.uv_layers:
        uv_layer.name = 'UVMap'
    layer.name = 'UVMap'
    obj.data.uv_layers.active = layer
    if len(layer.data) == 0 or not any(abs(item.uv.x) + abs(item.uv.y) > .001 for item in layer.data):
        axes = sorted(range(3), key=lambda axis: obj.dimensions[axis], reverse=True)[:2]
        for loop in obj.data.loops:
            co = obj.data.vertices[loop.vertex_index].co
            layer.data[loop.index].uv = (co[axes[0]] / 2, co[axes[1]] / 2)
    if not any(material == reed_material for material in obj.data.materials):
        # Stagger repeated little pieces across different parts of the same
        # photograph, so every plank does not reuse the same crop.
        offset_u = (obj.location.x * .173 + obj.location.y * .071) % 1
        offset_v = (obj.location.z * .137 + obj.location.x * .093) % 1
        for item in layer.data:
            item.uv.x += offset_u
            item.uv.y += offset_v
# The town base helper starts with 512 px images; sanitation is seen from
# several metres away, so 256 px tiling pictures keep the whole family light.
for image in bpy.data.images:
    if image.name.startswith('Town tile /'):
        image.scale(256, 256)
        image.file_format = 'PNG'
for material in bpy.data.materials:
    if material.use_nodes:
        shader = material.node_tree.nodes.get('Principled BSDF')
        if shader and shader.inputs.get('Metallic'):
            shader.inputs['Metallic'].default_value = min(shader.inputs['Metallic'].default_value, .29)

# The card exposes whole buildings, not individual boards as movable parts.
# Join each building's meshes after giving them the common UVMap layer; the
# resulting glTF keeps material primitives and TEXCOORD_0 while avoiding 1,000
# tiny mesh records in the delivered family.
for building_root in (reed_root, latrine, bath, sorter, compost):
    meshes = [obj for obj in building_root.children if obj.type == 'MESH']
    if meshes:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in meshes:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        bpy.context.object.name = building_root.name + ':structure'
        if building_root is not reed_root:
            # The rooms are closed compound shapes with many intersecting
            # boards. A gentle collapse removes hidden internal edges while
            # retaining the names, material boundaries and shared UV channel.
            reducer = bpy.context.object.modifiers.new('remove hidden construction edges', 'DECIMATE')
            reducer.ratio = .65
            bpy.ops.object.modifier_apply(modifier=reducer.name)

out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True,
                          export_apply=True, export_materials='EXPORT', export_image_format='AUTO')

# All review frames are rendered after re-importing the delivered GLB into an
# empty scene. The ground plane exists only in this render scene, never in GLB.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 980
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('neutral daylight')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.68, .69, .68, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8
ground_mat = bpy.data.materials.new('render only mid-grey-brown')
ground_mat.diffuse_color = (.24, .22, .19, 1); ground_mat.use_nodes = True
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.24, .22, .19, 1)
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .96
bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, -.10))
bpy.context.object.name = 'render-only ground'; bpy.context.object.data.materials.append(ground_mat)
light_data = bpy.data.lights.new('large overcast softbox', 'AREA'); light_data.energy = 21000; light_data.size = 42
light = bpy.data.objects.new('render-only overcast', light_data); scene.collection.objects.link(light)
light.location = (25, 37, -36); light.rotation_euler = (Vector((0, 2, 0)) - light.location).to_track_quat('-Z', 'Y').to_euler()
roots = {obj.name: obj for obj in scene.objects if obj.name in
         ('reed-bed', 'latrine', 'bathhouse', 'trash-sorter', 'compost-heap')}
evidence.mkdir(parents=True, exist_ok=True)

def hide_tree(obj, hide):
    obj.hide_render = hide
    for child in obj.children:
        hide_tree(child, hide)

def render_view(filename, camera_position, target, lens=48, ortho_scale=None):
    if filename != 'reed-bed-exported.png':
        scene.render.resolution_x = 800
        scene.render.resolution_y = 900
    bpy.ops.object.camera_add(location=town.game_vector(camera_position))
    camera = bpy.context.object
    camera.data.lens = lens
    if ortho_scale is not None:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho_scale
    camera.rotation_euler = (town.game_vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.render.filepath = str(evidence / filename)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)

# Matching reed reference angle, then mayor and road views for every building.
for name, obj in roots.items():
    hide_tree(obj, name != 'reed-bed')
render_view('reed-bed-exported.png', (20, 17, -22), (0, .8, 0), 46)
for name, obj in roots.items():
    hide_tree(obj, name != 'reed-bed')
for name, obj in roots.items():
    hide_tree(obj, name != 'reed-bed')

configs = {
    'latrine': ((-20, 0, -20), 9, 8.2), 'bathhouse': ((20, 0, -20), 17, 19.0),
    'trash-sorter': ((0, 0, 20), 22, 28.0), 'compost-heap': ((-20, 0, 0), 9, 8.0),
}
for name, (center, span, mayor_scale) in configs.items():
    for obj in roots.values(): hide_tree(obj, obj.name != name)
    render_view(f'{name}-mayor.png', (center[0] + span * .75, span * .92, center[2] - span * .85),
                (center[0], 1.2, center[2]), 40, mayor_scale)
    render_view(f'{name}-road.png', (center[0] + .2, 1.65, center[2] - span * 1.25),
                (center[0], 1.55, center[2]), 50)
for obj in roots.values(): hide_tree(obj, False)

"""The regular Python image stack is outside Blender; run it after GLB shots."""
compose = evidence / 'compose-sheet.py'
compose.write_text(r'''from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps
reference_path, evidence_path, sheet_path = map(Path, sys.argv[1:])
evidence_path.mkdir(parents=True, exist_ok=True)
reference = Image.open(reference_path).convert('RGB')
W, H = 1600, 1640
page = Image.new('RGB', (W, H), (30, 32, 30)); draw = ImageDraw.Draw(page)
fontdir = Path('C:/Windows/Fonts')
title = ImageFont.truetype(str(fontdir / 'segoeuib.ttf'), 34)
label = ImageFont.truetype(str(fontdir / 'segoeuib.ttf'), 23)
body = ImageFont.truetype(str(fontdir / 'segoeui.ttf'), 18)
draw.text((32, 18), 'TOWN SANITATION | ROUND 2', font=title, fill=(239,228,206))
draw.text((32,62), 'Waterworks materials | exported GLB re-imported | bright overcast', font=body, fill=(215,207,188))
pw, ph = 748, 390
for x, image, heading in ((32, reference, 'PHOTOGRAPHIC TARGET | REED BED'), (800, Image.open(evidence_path/'reed-bed-exported.png'), 'EXPORTED GLB | SAME CAMERA')):
    draw.text((x,104), heading, font=label, fill=(231,190,129))
    page.paste(ImageOps.fit(image.convert('RGB'), (pw,ph), method=Image.Resampling.LANCZOS), (x,140))
for index, name in enumerate(('latrine','bathhouse','trash-sorter','compost-heap')):
    x=32+(index%2)*768; y=570+(index//2)*530
    draw.text((x,y), name.upper()+' | MAYOR HEIGHT AND ROAD HEIGHT', font=label, fill=(231,190,129))
    for col, view in enumerate(('mayor','road')):
        image=Image.open(evidence_path/f'{name}-{view}.png').convert('RGB')
        page.paste(ImageOps.fit(image,(360,440),method=Image.Resampling.LANCZOS),(x+col*380,y+40))
        draw.text((x+col*380+10,y+44),view.upper(),font=body,fill=(240,229,202))
draw.text((32,1600),'Grid: 8 m per cell. No ground plates are part of the exported family.',font=body,fill=(215,207,188))
for quality in (78,74,70,66,62,58,54):
    page.save(sheet_path,'JPEG',quality=quality,optimize=True,progressive=True)
    if sheet_path.stat().st_size<=500000: break
if sheet_path.stat().st_size>500000: raise RuntimeError(f'sheet exceeds 500 KB: {sheet_path.stat().st_size}')
''', encoding='utf-8')
subprocess.run(['python', str(compose), str(Path(args.reference)), str(evidence), str(sheet)], check=True)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size, 'sheet': str(sheet),
                  'sheetBytes': sheet.stat().st_size, 'evidence': str(evidence)}))
