"""Build and review the Scablands town works family (TOWN-ART-WORKS).

The whole family, written to works.glb:
    blender -b --python tools/blender/town-works.py -- --root .
One piece or group, written to .qa-dist/works-trial.glb, with its review sheet:
    blender -b --python tools/blender/town-works.py -- --root . --only sawmill --render sawmill --round 3

Groups for --only: `heaps` (the eight stockpiles) and `small` (the pit, trenches, valve box,
pipe stack, handcart, barrow and flatbed). Sheets for --render: sawmill, salvage-yard,
old-ground, small, heaps.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

HEAPS = ['pile-salvage', 'pile-steel', 'pile-tin', 'pile-timber', 'pile-brick', 'pile-pipe', 'pile-sand', 'pile-clay']
SMALL = ['test-pit', 'trench', 'trench-corner', 'valve-box', 'pipe-stack', 'handcart', 'barrow', 'flatbed']
BUILDINGS = ['warehouse', 'kiln', 'sawmill', 'salvage-yard', 'old-ground']
ALL = BUILDINGS + SMALL + HEAPS

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--only', default='')
parser.add_argument('--render', default='')
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--assemble-sheet', default='')
parser.add_argument('--evidence', default='.evidence/2026-11-19/TOWN-ART-WORKS')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
textures = root / 'public/assets/models/wasteland/town/textures'
evidence = Path(args.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
only = set()
for word in filter(None, args.only.split(',')):
    only.update({'heaps': HEAPS, 'small': SMALL}.get(word, [word]))
unknown = only - set(ALL)
if unknown:
    parser.error(f'unknown piece: {sorted(unknown)}')
# A trial of some pieces never overwrites the family file the game loads.
out = root / ('.qa-dist/works-trial.glb' if only else 'public/assets/models/wasteland/town/works.glb')
SHEET_FOLDERS = {'sawmill': 'town-art-works-sawmill', 'salvage-yard': 'town-art-works-salvage-yard',
                 'old-ground': 'town-art-works-old-ground', 'small': 'town-art-works-small',
                 'heaps': 'town-art-works-heaps'}
if args.render and args.render not in SHEET_FOLDERS:
    parser.error(f'unknown sheet: {args.render}')
sheet = root / f'docs/board/looks/{SHEET_FOLDERS[args.render]}/round-{args.round}.jpg' if args.render else None

if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(out)],
                      'evidence': [str(evidence)] if args.render else [],
                      'summary': [str(sheet)] if args.render else []}))
    raise SystemExit(0)

if args.assemble_sheet:
    # Run by the system Python (it has Pillow; Blender's Python does not).
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    plan = json.loads(Path(args.assemble_sheet).read_text(encoding='utf-8'))
    width, gap, top = 2048, 12, 64
    total = top + sum(row['height'] + 34 for row in plan['rows']) + 10
    canvas = Image.new('RGB', (width, total), (47, 47, 43))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 27)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
    draw.text((24, 14), plan['title'], font=font, fill=(238, 223, 198))
    y = top
    for row in plan['rows']:
        draw.text((24, y), row['label'], font=small, fill=(223, 184, 132))
        panels = row['panels']
        weights = row.get('weights') or [1] * len(panels)
        free = width - 2 * 16 - gap * (len(panels) - 1)
        x = 16
        for path, weight in zip(panels, weights):
            panel_w = int(free * weight / sum(weights))
            with Image.open(path) as source:
                image = ImageOps.contain(source.convert('RGB'), (panel_w, row['height']), method=Image.Resampling.LANCZOS)
            canvas.paste(image, (x + (panel_w - image.width) // 2, y + 30 + (row['height'] - image.height) // 2))
            x += panel_w + gap
        y += row['height'] + 34
    target = Path(plan['out'])
    target.parent.mkdir(parents=True, exist_ok=True)
    for quality in (88, 84, 80, 76, 72, 68, 64, 60, 56, 52):
        canvas.save(target, 'JPEG', quality=quality, optimize=True, progressive=True)
        if target.stat().st_size <= 500_000:
            break
    if target.stat().st_size > 500_000:
        raise RuntimeError(f'round sheet is {target.stat().st_size} bytes; limit is 500 KB')
    print(json.dumps({'sheet': str(target), 'bytes': target.stat().st_size, 'dimensions': canvas.size}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from photo_carve import carve_object, edge_seeds, lift_if_dark
from photo_model import Mesh, Photo, box, lathe, trace, slab, tidy
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
render_masks = evidence / 'masks'
family = bpy.data.objects.new('town-works', None); bpy.context.collection.objects.link(family)


def want(piece):
    return not only or piece in only


def node(name, parent, at=None):
    """A named empty. `at` is its place in glTF metres; children are then built around (0, 0, 0)."""
    obj = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if at:
        obj.location = town.game_vector(at)
    return obj


_photos = {}


def photo(name):
    """One shared copy of a photo that no carve has painted over."""
    if name not in _photos:
        _photos[name] = Photo(textures / name)
    return _photos[name]


def subject(picture, tolerance=26, grey=22):
    """True where the photo shows the subject. The grey studio is lifted for the flood only."""
    lift_if_dark(picture)
    mask = tidy(~picture.sky(edge_seeds(picture), tolerance=tolerance, grey=grey), 2)
    picture._rgb = None
    return mask


def polygon_mask(picture, polygons):
    """True inside any of the polygons, each a list of the photo's own pixels."""
    xx, yy = np.meshgrid(np.arange(picture.w), np.arange(picture.h))
    mask = np.zeros((picture.h, picture.w), dtype=bool)
    for polygon in polygons:
        inside_polygon = np.zeros_like(mask)
        for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1]):
            inside_polygon ^= ((y0 > yy) != (y1 > yy)) & (xx < (x1 - x0) * (yy - y0) / (y1 - y0 + 1e-12) + x0)
        mask |= inside_polygon
    return mask


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def strut(mesh, key, picture, strip, a, b, width, depth, up=(0, 1, 0)):
    """A squared member from a to b wearing a strip of a photo along its length.

    `strip` is (px0, py0, px1, py1); its longer side runs along the member.
    """
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    side = axis.cross(Vector(up))
    if side.length < 1e-4:
        side = axis.cross(Vector((1, 0, 0)))
    side.normalize()
    top = side.cross(axis).normalized()
    px0, py0, px1, py1 = strip
    if abs(px1 - px0) >= abs(py1 - py0):
        uvs = (picture.uv(px0, py1), picture.uv(px0, py0), picture.uv(px1, py0), picture.uv(px1, py1))
    else:
        uvs = (picture.uv(px0, py0), picture.uv(px1, py0), picture.uv(px1, py1), picture.uv(px0, py1))
    def ring(p):
        return [p - side * width / 2 - top * depth / 2, p + side * width / 2 - top * depth / 2,
                p + side * width / 2 + top * depth / 2, p - side * width / 2 + top * depth / 2]
    start, end = ring(a), ring(b)
    for i in range(4):
        j = (i + 1) % 4
        mesh.face((start[i], start[j], end[j], end[i]), uvs, key, (start[i] + start[j]) / 2 - a)
    mx, my = (px0 + px1) / 2, (py0 + py1) / 2
    cap = (picture.uv(mx - 4, my + 4), picture.uv(mx + 4, my + 4), picture.uv(mx + 4, my - 4), picture.uv(mx - 4, my - 4))
    mesh.face(start, cap, key, -axis)
    mesh.face(end, cap, key, axis)


def plate(mesh, key, picture, strip, corners, thickness=.02, under=None):
    """A thin sheet through four corners (in order round the sheet), wearing a photo rectangle on both faces."""
    px0, py0, px1, py1 = strip
    uvs = (picture.uv(px0, py1), picture.uv(px1, py1), picture.uv(px1, py0), picture.uv(px0, py0))
    pts = [Vector(p) for p in corners]
    normal = (pts[1] - pts[0]).cross(pts[3] - pts[0]).normalized()
    if normal.y < 0:
        normal = -normal
    mesh.face(pts, uvs, key, normal)
    low = [p - normal * thickness for p in pts]
    ukey, upicture, ustrip = under or (key, picture, strip)
    ux0, uy0, ux1, uy1 = ustrip
    mesh.face(low, (upicture.uv(ux0, uy1), upicture.uv(ux1, uy1), upicture.uv(ux1, uy0), upicture.uv(ux0, uy0)), ukey, -normal)


def mound(mesh, key, centre, rx, rz, height, uv, rings=5, sides=14, seed=1, rough=.12, profile=None, lean=(0, 0)):
    """A heap as a polar height field with an uneven outline and lumps.

    `uv(x, z, fraction, angle)` gives each point's place in the picture; x and z
    are metres from the centre, fraction runs from 0 at the top to 1 at the foot.
    """
    rng = random.Random(seed)
    profile = profile or (lambda f: (1 - f) ** 1.1 * (1 + .3 * f))
    edge = [1 + rng.uniform(-rough, rough) * 1.6 for _ in range(sides)]
    cx, cy, cz = centre
    top = (mesh.vertex((cx + lean[0], cy + height, cz + lean[1])), lean[0], lean[1], 0.0)
    rows = []
    for r in range(1, rings + 1):
        f = r / rings
        row = []
        for k in range(sides):
            angle = 2 * math.pi * k / sides
            wobble = 1 + (edge[k] - 1) * f + rng.uniform(-rough, rough) * .3
            x = math.cos(angle) * rx * f * wobble + lean[0] * (1 - f)
            z = math.sin(angle) * rz * f * wobble + lean[1] * (1 - f)
            y = height * profile(f) * (1 + rng.uniform(-rough, rough)) if r < rings else 0
            row.append((mesh.vertex((cx + x, cy + y, cz + z)), x, z, f))
        rows.append(row)
    def corner(point, k):
        index, x, z, f = point
        return index, uv(x, z, f, 2 * math.pi * k / sides)
    for k in range(sides):
        a, ua = corner(rows[0][k], k)
        b, ub = corner(rows[0][(k + 1) % sides], k + 1)
        mesh.indexed((top[0], a, b), (uv(top[1], top[2], 0, 2 * math.pi * (k + .5) / sides), ua, ub), key, (0, 1, 0), True)
    for r in range(rings - 1):
        for k in range(sides):
            a, ua = corner(rows[r][k], k)
            b, ub = corner(rows[r][(k + 1) % sides], k + 1)
            c, uc = corner(rows[r + 1][(k + 1) % sides], k + 1)
            d, ud = corner(rows[r + 1][k], k)
            mesh.indexed((a, d, c, b), (ua, ud, uc, ub), key, (0, 1, 0), True)


def tiled(picture, metres):
    """A uv function that lays a square material photo flat, repeating every `metres`."""
    return lambda x, z, f=0, angle=0: (x / metres + .5, z / metres + .5)


def round_log(mesh, bark_key, end_key, a, b, radius, sides=10, bark_row=391, end=(256, 250, 142)):
    """A round log from a to b: bark from the side photo of a log, cut ends from the photo of log ends."""
    bark, ends = photo('sawmill-bark.jpg'), photo('timber-weathered-logs.jpg')
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    e1 = axis.cross(Vector((0, 1, 0)))
    if e1.length < 1e-4:
        e1 = Vector((1, 0, 0))
    e1.normalize()
    e2 = axis.cross(e1).normalized()
    length = (b - a).length
    ex, ey, er = end
    def bark_uv(index, distance, ring_radius, angle):
        return bark.uv(14 + distance / length * (bark.w - 28), bark_row + math.sin(angle) * 72)
    def end_uv(angle, fraction):
        return ends.uv(ex + math.cos(angle) * fraction * er, ey + math.sin(angle) * fraction * er)
    lathe(mesh, bark_key, a, axis, e1, e2, [(0, radius), (length, radius * .94)], bark_uv, sides=sides,
          cap_start=(end_key, end_uv), cap_end=(end_key, end_uv))


LOG_ENDS = [(256, 250, 142), (118, 196, 96), (392, 88, 104), (402, 398, 96), (150, 420, 84)]


def pipe(mesh, key, picture, a, b, radius, wall=.03, sides=8, skin=(20, 300, 2150, 420), bore=None, rim=None):
    """A hollow tube from a to b. The bore is dark and faces inward, so that an end reads as a hole."""
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    e1 = axis.cross(Vector((0, 1, 0)))
    if e1.length < 1e-4:
        e1 = Vector((1, 0, 0))
    e1.normalize()
    e2 = axis.cross(e1).normalized()
    sx0, sy0, sx1, sy1 = skin
    bore_key, bore_picture, (bx, by) = bore or (key, picture, ((sx0 + sx1) / 2, sy1))
    rim_key, rim_picture, (rx, ry) = rim or (key, picture, ((sx0 + sx1) / 2, (sy0 + sy1) / 2))
    def around(k, r):
        angle = 2 * math.pi * k / sides
        return (e1 * math.cos(angle) + e2 * math.sin(angle)) * r
    for k in range(sides):
        o0, o1 = around(k, radius), around(k + 1, radius)
        i0, i1 = around(k, radius - wall), around(k + 1, radius - wall)
        v0 = sy0 + (sy1 - sy0) * k / sides
        v1 = sy0 + (sy1 - sy0) * (k + 1) / sides
        mesh.face((a + o0, a + o1, b + o1, b + o0),
                  (picture.uv(sx0, v0), picture.uv(sx0, v1), picture.uv(sx1, v1), picture.uv(sx1, v0)), key, o0 + o1, True)
        dark = [bore_picture.uv(bx + dx, by + dy) for dx, dy in ((0, 0), (3, 0), (3, 3), (0, 3))]
        mesh.face((a + i0, a + i1, b + i1, b + i0), dark, bore_key, -(i0 + i1), True)
        edge = [rim_picture.uv(rx + dx, ry + dy) for dx, dy in ((0, 0), (6, 0), (6, 6), (0, 6))]
        mesh.face((a + o0, a + o1, a + i1, a + i0), edge, rim_key, -axis)
        mesh.face((b + o0, b + o1, b + i1, b + i0), edge, rim_key, axis)


def ring_tyre(mesh, key, picture, centre, axis, radius, width=.22, sides=12, skin=(40, 40, 470, 470)):
    """An old tyre lying or leaning: a ring with an open middle, wearing a photo of rubber."""
    centre, axis = Vector(centre), Vector(axis).normalized()
    e1 = axis.cross(Vector((0, 1, 0)))
    if e1.length < 1e-4:
        e1 = Vector((1, 0, 0))
    e1.normalize()
    e2 = axis.cross(e1).normalized()
    sx0, sy0, sx1, sy1 = skin
    section = [(-width / 2, radius * .58), (-width / 2, radius * .9), (-width * .3, radius), (width * .3, radius),
               (width / 2, radius * .9), (width / 2, radius * .58)]
    for k in range(sides):
        a0, a1 = 2 * math.pi * k / sides, 2 * math.pi * (k + 1) / sides
        for s in range(len(section)):
            (d0, r0), (d1, r1) = section[s], section[(s + 1) % len(section)]
            def at(distance, r, angle):
                return centre + axis * distance + (e1 * math.cos(angle) + e2 * math.sin(angle)) * r
            u0 = sx0 + (sx1 - sx0) * s / len(section)
            u1 = sx0 + (sx1 - sx0) * (s + 1) / len(section)
            v0 = sy0 + (sy1 - sy0) * (k % 4) / 4
            v1 = sy0 + (sy1 - sy0) * (k % 4 + 1) / 4
            quad = (at(d0, r0, a0), at(d1, r1, a0), at(d1, r1, a1), at(d0, r0, a1))
            middle = sum(quad, Vector()) / 4
            ring_centre = centre + (e1 * math.cos((a0 + a1) / 2) + e2 * math.sin((a0 + a1) / 2)) * radius * .78
            mesh.face(quad, (picture.uv(u0, v0), picture.uv(u1, v0), picture.uv(u1, v1), picture.uv(u0, v1)),
                      key, middle - ring_centre, True)


def triangles_under(parent):
    total = 0
    for child in parent.children_recursive:
        if child.type == 'MESH':
            graph = bpy.context.evaluated_depsgraph_get()
            evaluated = child.evaluated_get(graph).to_mesh()
            total += sum(len(p.vertices) - 2 for p in evaluated.polygons)
    return total


def bounds_of(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    if not points:
        raise RuntimeError('piece has no mesh bounds')
    return ((min(v.x for v in points), max(v.x for v in points)),
            (min(v.z for v in points), max(v.z for v in points)),
            (-max(v.y for v in points), -min(v.y for v in points)))


def check_piece(piece_root, half_x, half_z, budget, grounded=True):
    """Print and hold a piece to its plot, its triangle budget and the ground."""
    bpy.context.view_layer.update()
    meshes = [obj for obj in piece_root.children_recursive if obj.type == 'MESH']
    b = bounds_of(meshes)
    count = triangles_under(piece_root)
    print(f'{piece_root.name}: x {b[0][0]:.2f}..{b[0][1]:.2f}  y {b[1][0]:.2f}..{b[1][1]:.2f}  z {b[2][0]:.2f}..{b[2][1]:.2f}  triangles {count}')
    assert b[0][0] >= -half_x - .001 and b[0][1] <= half_x + .001, f'{piece_root.name} leaves its plot along X'
    assert b[2][0] >= -half_z - .001 and b[2][1] <= half_z + .001, f'{piece_root.name} leaves its plot along Z'
    assert count <= budget, f'{piece_root.name} has {count} triangles; budget {budget}'
    if grounded:
        assert -.06 <= b[1][0] <= .06, f'{piece_root.name} does not stand on the ground'
    for child in piece_root.children:
        parts = [obj for obj in [child, *child.children_recursive] if obj.type == 'MESH']
        if parts:
            cb = bounds_of(parts)
            print(f'  {child.name}: x {cb[0][0]:.2f}..{cb[0][1]:.2f}  y {cb[1][0]:.2f}..{cb[1][1]:.2f}  z {cb[2][0]:.2f}..{cb[2][1]:.2f}')
    return b


# ---------------------------------------------------------------------------------------------
# Warehouse, 3 by 3 (passed 9 November 2026). Carved from its four photos.
if want('warehouse'):
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
    check_piece(building, 11.5, 11.5, 9000)

# ---------------------------------------------------------------------------------------------
# Kiln, 2 by 2 (passed 9 November 2026).
if want('kiln'):
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
    check_piece(kiln, 7.5, 7.5, 5000)

# ---------------------------------------------------------------------------------------------
# Sawmill, 3 by 2. Photos generated with OpenAI image generation, 9 November 2026
# (sawmill-CREDITS.md). The front photo sets one scale for everything: 0.0095 m a pixel puts
# the eaves at 3.9 m, the ridge at 6.7 m and the roof 8.9 m wide. The posts, tie beam, king
# post and knee braces are traced from that photo and stood at five post lines; the shed is
# 20.6 m long. Two bays of the front slope are left unsheeted so the saw shows from above.
if want('sawmill'):
    mill = node('sawmill', family)
    front, roof = photo('sawmill-front.jpg'), photo('sawmill-roof.jpg')
    MS, MILL_GROUND, MILL_CENTRE = .0095, 737, 511.5
    RIDGE = (MILL_GROUND - 27) * MS
    EAVE_Z = (MILL_CENTRE - 45) * MS
    EAVE_Y = (MILL_GROUND - 322) * MS
    SLOPE = (RIDGE - EAVE_Y) / EAVE_Z
    POST_LINES = (-9.4, -4.7, 0, 4.7, 9.4)
    MILL_HALF = 10.3
    TIMBER = (200, 284, 820, 310)             # the tie beam's own timber, for members no photo shows square on
    RUST = (100, 374, 930, 394)               # the ridge capping, for iron

    def roof_y(z):
        return RIDGE - abs(z) * SLOPE

    def gable(px, py, d):
        return (d, (MILL_GROUND - py) * MS, (px - MILL_CENTRE) * MS)

    frame_root = node('sawmill:timber-frame', mill)
    members = [rect(153, 298, 197, 737), rect(826, 298, 870, 737), rect(156, 280, 866, 313), rect(501, 92, 523, 282),
               [(186, 386), (260, 312), (288, 312), (198, 414), (186, 414)],
               [(837, 386), (763, 312), (735, 312), (825, 414), (837, 414)]]
    frame_loops = trace(polygon_mask(front, members), (140, 85, 885, 740), tolerance=1.5, min_area=60)
    frames = []
    for index, x in enumerate(POST_LINES):
        mesh = Mesh()
        slab(mesh, 'front', front, frame_loops, gable, x - .19, x + .19, wall_scale=MS)
        for hand in (-1, 1):
            strut(mesh, 'front', front, TIMBER, (x, roof_y(4.25) - .27, hand * 4.25), (x, roof_y(.07) - .27, hand * .07), .14, .2)
        obj = mesh.finish(f'sawmill-frame-line-{index + 1}', {'front': front.material()})
        obj.parent = frame_root
        frames.append(obj)
    mesh = Mesh()
    for hand in (-1, 1):
        z = hand * 3.2
        for x0, x1 in zip(POST_LINES, POST_LINES[1:]):
            strut(mesh, 'front', front, TIMBER, (x0, 4.12, z), (x1, 4.12, z), .2, .2)
        for index, x in enumerate(POST_LINES):
            for way in (-1, 1):
                if (index == 0 and way < 0) or (index == len(POST_LINES) - 1 and way > 0):
                    continue
                strut(mesh, 'front', front, (210, 286, 420, 308), (x + way * .12, 3.1, z), (x + way * 1.1, 4.06, z), .13, .16)
        for purlin_z in (.55, 2.3, 4.0):
            ends = (-MILL_HALF + .1, *POST_LINES[1:-1], MILL_HALF - .1)
            for x0, x1 in zip(ends, ends[1:]):
                strut(mesh, 'front', front, TIMBER, (x0, roof_y(purlin_z) - .09, hand * purlin_z),
                      (x1, roof_y(purlin_z) - .09, hand * purlin_z), .12, .12)
    obj = mesh.finish('sawmill-plates-braces-purlins', {'front': front.material()})
    obj.parent = frame_root

    roof_root = node('sawmill:tin-roof', mill)
    mesh = Mesh()
    rng = random.Random(7)
    COLUMNS = 8
    column_w = 2 * MILL_HALF / COLUMNS
    OPEN_BAYS = {(-1, 4), (-1, 5)}

    def roof_px(x):
        return 90 + (x + MILL_HALF) / (2 * MILL_HALF) * (935 - 90)

    def roof_rows(hand):
        return (398, 572) if hand < 0 else (370, 197)     # ridge row, eave row

    for hand in (-1, 1):
        ridge_row, eave_row = roof_rows(hand)
        for column in range(COLUMNS):
            if (hand, column) in OPEN_BAYS:
                continue
            x0 = -MILL_HALF + column * column_w + rng.uniform(0, .05)
            x1 = -MILL_HALF + (column + 1) * column_w - rng.uniform(0, .05)
            # A replaced sheet wears another sheet's rust, so the roof reads as patched from stock.
            source = column if rng.random() < .6 else rng.randrange(COLUMNS)
            u0 = roof_px(-MILL_HALF + source * column_w)
            u1 = roof_px(-MILL_HALF + (source + 1) * column_w)
            z_ridge, z_eave = hand * .14, hand * (EAVE_Z + rng.uniform(-.1, .22))
            lift = rng.uniform(0, .04)
            plate(mesh, 'roof', roof, (u0, eave_row, u1, ridge_row),
                  [(x0, roof_y(z_ridge) + lift, z_ridge), (x1, roof_y(z_ridge) + lift, z_ridge),
                   (x1, roof_y(z_eave) + lift + rng.uniform(-.03, .05), z_eave),
                   (x0, roof_y(z_eave) + lift + rng.uniform(-.03, .05), z_eave)])
    # One sheet has slipped down across the open bays and lies skewed on the purlins.
    plate(mesh, 'roof', roof, (roof_px(-MILL_HALF + 4 * column_w), 572, roof_px(-MILL_HALF + 5 * column_w), 398),
          [(.35, roof_y(1.5) + .06, -1.5), (2.75, roof_y(1.3) + .06, -1.3),
           (2.3, roof_y(4.75) + .1, -4.75), (-.1, roof_y(4.95) + .1, -4.95)])
    # Patches laid over holes, from the greyer sheets.
    for (x0, x1, z0, z1), strip in (((3.1, 4.7, 1.3, 3.3), (562, 205, 630, 360)),
                                    ((-7.6, -6.3, -3.9, -2.2), (300, 410, 368, 560)),
                                    ((-2.2, -.9, 2.6, 4.2), (150, 205, 210, 360))):
        plate(mesh, 'roof', roof, strip,
              [(x0, roof_y(z0) + .07, z0), (x1, roof_y(z0) + .08, z0), (x1 + .12, roof_y(z1) + .08, z1), (x0 + .1, roof_y(z1) + .07, z1)])
    # The ridge capping, in four lengths, lapped and a little out of line.
    for index in range(4):
        x0 = -MILL_HALF + index * MILL_HALF / 2 - .04
        x1 = x0 + MILL_HALF / 2 + .08
        kick = (.0, .03, -.02, .02)[index]
        for hand in (-1, 1):
            plate(mesh, 'roof', roof, (roof_px(x0), 372 if hand > 0 else 384, roof_px(x1), 384 if hand > 0 else 396),
                  [(x0, RIDGE + .09 + kick, 0), (x1, RIDGE + .09 + kick, 0),
                   (x1, roof_y(.34) + .06 + kick, hand * .34), (x0, roof_y(.34) + .06 + kick, hand * .34)])
    roof_obj = mesh.finish('sawmill-roof-tin-sheets', {'roof': roof.material()})
    roof_obj.parent = roof_root
    # Old tyres hold loose sheets down in the wind.
    rubber = photo('machines2-dusty-rubber.jpg')
    mesh = Mesh()
    for x, z, r in ((-8.6, 2.9, .4), (5.6, 3.6, .36), (-3.4, -3.3, .4), (8.9, -2.2, .34)):
        n = Vector((0, 1, SLOPE if z > 0 else -SLOPE)).normalized()
        ring_tyre(mesh, 'rubber', rubber, Vector((x, roof_y(z) + .04, z)) + n * .11, n, r,
                  skin=(8, 8, rubber.w - 8, rubber.h - 8))
    obj = mesh.finish('sawmill-roof-tyres', {'rubber': rubber.material()})
    obj.parent = roof_root

    # The saw bench: two side frames traced from the bench's side photo, under a plank top.
    bench_root = node('sawmill:bench', mill)
    bench_side, bench_top = photo('bench-side.jpg'), photo('bench-top.jpg')
    BS = 3.2 / 978
    BENCH_X = 2.9
    BENCH_TOP = (612 - 258) * BS
    bench_parts = [rect(12, 258, 990, 322), rect(100, 322, 178, 575), rect(88, 560, 185, 612),
                   rect(820, 322, 895, 575), rect(808, 560, 910, 612), rect(178, 472, 820, 520),
                   [(178, 440), (238, 322), (305, 322), (178, 478)], [(820, 440), (765, 322), (698, 322), (820, 478)]]
    bench_loops = trace(polygon_mask(bench_side, bench_parts), (5, 250, 1000, 615), tolerance=1.5, min_area=60)

    def bench_world(px, py, d):
        return (BENCH_X + (px - 501) * BS, (612 - py) * BS, d)

    mesh = Mesh()
    for d0, d1 in ((-.62, -.44), (.44, .62)):
        slab(mesh, 'side', bench_side, bench_loops, bench_world, d0, d1, wall_scale=BS)
    x0, x1 = bench_world(12, 0, 0)[0], bench_world(990, 0, 0)[0]
    edge = ('side', bench_side, (12, 258, 990, 280))
    box(mesh, x0 - .02, x1 + .02, BENCH_TOP - .07, BENCH_TOP + .012, -.88, .64,
        {'+y': ('top', bench_top, (22, 185, 972, 555)), '+z': edge, '-z': edge,
         '+x': ('side', bench_side, (940, 258, 990, 280)), '-x': ('side', bench_side, (12, 258, 62, 280))})
    obj = mesh.finish('sawmill-bench-frames-and-top', {'side': bench_side.material(), 'top': bench_top.material()})
    obj.parent = bench_root

    # The blade stands up through the bench's edge: its toothed outline is traced from its photo.
    blade = photo('sawmill-blade.jpg')
    blade_mask = subject(blade)
    rows_hit, cols_hit = np.nonzero(blade_mask)
    blade_cx, blade_cy = (cols_hit.min() + cols_hit.max()) / 2, (rows_hit.min() + rows_hit.max()) / 2
    blade_scale = 1.2 / (cols_hit.max() - cols_hit.min())
    blade_loops = trace(blade_mask, (int(cols_hit.min()) - 3, int(rows_hit.min()) - 3, int(cols_hit.max()) + 3, int(rows_hit.max()) + 3),
                        tolerance=4.0, min_area=500)
    blade_loops = [max(blade_loops, key=len)]
    SAW_AT = (BENCH_X - .3, BENCH_TOP, -.80)
    saw_root = node('sawmill:circular-saw', mill, at=SAW_AT)
    mesh = Mesh()
    slab(mesh, 'blade', blade, blade_loops, lambda px, py, d: ((px - blade_cx) * blade_scale, (blade_cy - py) * blade_scale, d),
         -.012, .012, wall_scale=blade_scale)
    steel_uv = lambda *a: blade.uv(blade_cx + 90, blade_cy + 40)
    lathe(mesh, 'blade', (0, 0, -.05), (0, 0, 1), (1, 0, 0), (0, 1, 0), [(0, .1), (.5, .1)], steel_uv, sides=8,
          cap_start=('blade', steel_uv))
    obj = mesh.finish('sawmill-toothed-blade', {'blade': blade.material()})
    obj.parent = saw_root
    print('sawmill blade diameter', round((cols_hit.max() - cols_hit.min()) * blade_scale, 2),
          'triangles', sum(len(p.vertices) - 2 for p in obj.data.polygons))

    # The log carriage runs on rails past the blade, carrying a log half-way through its cut.
    carriage_root = node('sawmill:log-carriage', mill)
    mesh = Mesh()
    TRACK_Z = -1.10
    for z in (TRACK_Z - .35, TRACK_Z + .35):
        strut(mesh, 'roof', roof, RUST, (-2.2, .14, z), (8.2, .14, z), .07, .1)
    for index in range(9):
        x = -2.0 + index * 1.25
        strut(mesh, 'front', front, (210, 286, 420, 308), (x, .045, TRACK_Z - .62), (x, .045, TRACK_Z + .62), .2, .09)
    for z in (TRACK_Z - .35, TRACK_Z + .35):
        strut(mesh, 'front', front, TIMBER, (.5, .4, z), (4.3, .4, z), .16, .16)
    for x in (.7, 2.4, 4.1):
        strut(mesh, 'front', front, (210, 286, 420, 308), (x, .4, TRACK_Z - .5), (x, .4, TRACK_Z + .5), .14, .14)
        for z in (TRACK_Z - .35, TRACK_Z + .35):
            lathe(mesh, 'blade', (x, .28, z - .04), (0, 0, 1), (1, 0, 0), (0, 1, 0), [(0, .15), (.08, .15)], steel_uv,
                  sides=8, cap_start=('blade', steel_uv), cap_end=('blade', steel_uv))
    obj = mesh.finish('sawmill-carriage-and-rails', {'roof': roof.material(), 'front': front.material(), 'blade': blade.material()})
    obj.parent = carriage_root
    bark, log_ends = photo('sawmill-bark.jpg'), photo('timber-weathered-logs.jpg')
    wood = {'bark': bark.material(), 'end': log_ends.material()}
    mesh = Mesh()
    round_log(mesh, 'bark', 'end', (.2, .48 + .34, TRACK_Z), (4.7, .48 + .34, TRACK_Z), .34, sides=12)
    obj = mesh.finish('sawmill-log-on-carriage', wood)
    obj.parent = node('sawmill:log-on-carriage', mill)

    # Log stacks behind the shed, between stakes; sawn boards and the sawdust heap in front.
    stack_rng = random.Random(21)
    for number, (centre_x, base_z, rows) in enumerate(((-5.9, 5.05, (3, 2, 1)), (1.4, 5.05, (3, 2)), (7.6, 5.4, (2, 1))), 1):
        stack_root = node(f'sawmill:log-stack-{number}', mill)
        mesh = Mesh()
        radius = .35
        for row, count in enumerate(rows):
            for i in range(count):
                r = radius * stack_rng.uniform(.86, 1.0)
                z = base_z + (i + row * .5) * radius * 2.06
                y = radius * (1 + row * 1.74)
                length = stack_rng.uniform(4.3, 5.0) if number < 3 else stack_rng.uniform(2.6, 3.2)
                shift = stack_rng.uniform(-.25, .25)
                round_log(mesh, 'bark', 'end', (centre_x - length / 2 + shift, y, z), (centre_x + length / 2 + shift, y, z), r,
                    sides=10, end=stack_rng.choice(LOG_ENDS))
        for x in (centre_x - 1.5, centre_x + 1.5) if number < 3 else (centre_x,):
            for z in (base_z - radius - .09, base_z + (rows[0] - 1) * radius * 2.06 + radius + .09):
                strut(mesh, 'front', front, (155, 320, 195, 730), (x, 0, z), (x, 1.35, z + .03), .12, .12, up=(1, 0, 0))
        obj = mesh.finish(f'sawmill-log-stack-{number}-logs', {**wood, 'front': front.material()})
        obj.parent = stack_root
    boards_root = node('sawmill:board-stacks', mill)
    mesh = Mesh()
    for stack, (cx, cz, layers, length) in enumerate(((-8.2, -6.15, 5, 4.2), (-3.4, -6.3, 3, 4.6))):
        for layer in range(layers):
            y = .12 + layer * .2
            shift = stack_rng.uniform(-.18, .18)
            box(mesh, cx - length / 2 + shift, cx + length / 2 + shift, y, y + .13, cz - .55, cz + .55,
                {'+y': ('top', bench_top, (22, 190 + layer * 30, 972, 420 + layer * 30)),
                 '+z': ('side', bench_side, (20, 262, 985, 290)), '-z': ('side', bench_side, (20, 290, 985, 318)),
                 '+x': ('side', bench_side, (300, 262, 600, 290)), '-x': ('side', bench_side, (500, 290, 800, 318))})
            for sticker in (-1.5, 0, 1.5):
                strut(mesh, 'side', bench_side, (200, 480, 500, 512), (cx + sticker, y - .035, cz - .6), (cx + sticker, y - .035, cz + .6), .09, .07)
    obj = mesh.finish('sawmill-sawn-board-stacks', {'top': bench_top.material(), 'side': bench_side.material()})
    obj.parent = boards_root
    dust = photo('sawmill-sawdust.jpg')
    dust_uv = lambda x, z, f, angle: dust.uv(408 + math.cos(angle) * f * 320, 398 + f * 262)
    mesh = Mesh()
    mound(mesh, 'dust', (6.4, 0, -5.3), 2.5, 1.7, 1.2, dust_uv, rings=5, sides=16, seed=4, rough=.1)
    mound(mesh, 'dust', (3.4, 0, -2.5), 1.0, .8, .42, dust_uv, rings=3, sides=10, seed=9, rough=.14)
    obj = mesh.finish('sawmill-sawdust-mounds', {'dust': dust.material()})
    obj.parent = node('sawmill:sawdust-heap', mill)

    check_piece(mill, 11.5, 7.5, 9000)
    roof_b = bounds_of([roof_obj])
    print(f'sawmill roof: lowest {roof_b[1][0]:.2f} m, ridge {roof_b[1][1]:.2f} m, length {roof_b[0][1] - roof_b[0][0]:.2f} m, width {roof_b[2][1] - roof_b[2][0]:.2f} m')
    assert roof_b[1][0] > 3.5, 'the roof must clear 3.5 m everywhere'
    ridge = [roof_obj.matrix_world @ v.co for v in roof_obj.data.vertices if abs((roof_obj.matrix_world @ v.co).y) < .2]
    west = [v.z for v in ridge if v.x < -MILL_HALF / 2]
    east = [v.z for v in ridge if v.x > MILL_HALF / 2]
    print(f'sawmill ridge: mean height {sum(west) / len(west):.2f} m at one end, {sum(east) / len(east):.2f} m at the other')
    assert abs(sum(west) / len(west) - sum(east) / len(east)) < .05, 'the roof must not slope along its length'
    for obj in frames:
        b = bounds_of([obj])
        print(f'  {obj.name}: foot {b[1][0]:.2f} m, top {b[1][1]:.2f} m, x {b[0][0]:.2f}..{b[0][1]:.2f}, z {b[2][0]:.2f}..{b[2][1]:.2f}')
        assert b[1][0] < .03, f'{obj.name} does not start at the ground'
        assert b[1][1] > 6.2, f'{obj.name} does not reach the roof'

# ---------------------------------------------------------------------------------------------
# Stockpiles and small works. Each stands alone at its own origin inside one 8 m cell.
# Material photos generated with OpenAI image generation for the family's first rounds
# (CREDITS.md); the heaps, tools and works photos on 19 November 2026 (works-CREDITS.md).
RUST_STRIP = (100, 374, 930, 394)             # on sawmill-roof.jpg: a rusted iron capping
PLANK_TOP = (22, 185, 972, 555)               # on bench-top.jpg: weathered planks from above
PIPE_SKIN = (40, 310, 2100, 430)              # on pipe-truck-pipe.jpg: one rusted pipe, side on


def extent(mask):
    """The subject's box in a mask: (x0, y0, x1, y1)."""
    rows_hit, cols_hit = np.nonzero(mask)
    return int(cols_hit.min()), int(rows_hit.min()), int(cols_hit.max()) + 1, int(rows_hit.max()) + 1


def darkest(picture, size=10):
    """The middle of the darkest small square of a photo: the inside of a pipe, a shadow."""
    grey = picture.rgb().sum(axis=2).astype(np.float64)
    h, w = grey.shape
    cells = grey[:h - h % size, :w - w % size].reshape(h // size, size, w // size, size).mean(axis=(1, 3))
    row, col = np.unravel_index(np.argmin(cells), cells.shape)
    return (col * size + size / 2, row * size + size / 2)


def block(mesh, key, picture, centre, size, yaw=0, metres=1.05, shift=(0, 0), top=None, side=None):
    """An upright block turned by `yaw`, standing on `centre`. A square material photo covers `metres`."""
    cx, cy, cz = centre
    sx, sy, sz = size
    c, s = math.cos(yaw), math.sin(yaw)
    def at(lx, y, lz):
        return (cx + lx * c + lz * s, y, cz - lx * s + lz * c)
    def uvs(across, up, strip):
        if strip:
            px0, py0, px1, py1 = strip
        else:
            px0, py0 = shift
            px1, py1 = px0 + across / metres * picture.w, py0 + up / metres * picture.h
        return (picture.uv(px0, py1), picture.uv(px1, py1), picture.uv(px1, py0), picture.uv(px0, py0))
    x0, x1, z0, z1 = -sx / 2, sx / 2, -sz / 2, sz / 2
    mesh.face((at(x0, cy + sy, z1), at(x1, cy + sy, z1), at(x1, cy + sy, z0), at(x0, cy + sy, z0)), uvs(sx, sz, top), key, (0, 1, 0))
    for (ax, az), (bx, bz) in (((x0, z1), (x1, z1)), ((x1, z1), (x1, z0)), ((x1, z0), (x0, z0)), ((x0, z0), (x0, z1))):
        a0, b0, b1, a1 = at(ax, cy, az), at(bx, cy, bz), at(bx, cy + sy, bz), at(ax, cy + sy, az)
        out_way = Vector(((a0[0] + b0[0]) / 2 - cx, 0, (a0[2] + b0[2]) / 2 - cz))
        mesh.face((a0, b0, b1, a1), uvs(math.hypot(bx - ax, bz - az), sy, side), key, out_way)


def corrugated(mesh, key, picture, corners, waves=9, depth=.022, repeat=None):
    """A corrugated sheet through four corners: the first edge runs across the ribs. Both faces."""
    c0, c1, c2, c3 = (Vector(p) for p in corners)
    normal = (c1 - c0).cross(c3 - c0).normalized()
    if normal.y < 0:
        normal = -normal
    length = (c3 - c0).length
    repeat = repeat or length / .9
    steps = waves * 2
    near, far = [], []
    for i in range(steps + 1):
        t = i / steps
        lift = normal * (depth if i % 2 == 0 else -depth)
        near.append((c0.lerp(c1, t) + lift, picture.uv(t * picture.w, 0)))
        far.append((c3.lerp(c2, t) + lift, picture.uv(t * picture.w, repeat * picture.h)))
    for i in range(steps):
        (a, ua), (b, ub), (c, uc), (d, ud) = near[i], near[i + 1], far[i + 1], far[i]
        face_normal = (b - a).cross(d - a)
        if face_normal.dot(normal) < 0:
            face_normal = -face_normal
        mesh.face((a, b, c, d), (ua, ub, uc, ud), key, face_normal)
        under = normal * .008
        mesh.face((a - under, b - under, c - under, d - under), (ua, ub, uc, ud), key, -face_normal)


def i_beam(mesh, key, picture, strip, a, b, width=.18, height=.26, web=.03):
    a, b = Vector(a), Vector(b)
    up = Vector((0, 1, 0))
    for offset in (height / 2 - web / 2, -(height / 2 - web / 2)):
        strut(mesh, key, picture, strip, a + up * offset, b + up * offset, width, web)
    strut(mesh, key, picture, strip, a, b, web, height - 2 * web)


_tools = {}


def place_tool(mesh, key, index, foot, height, right=(1, 0, 0), up=(0, 1, 0), sink=0, thickness=.03):
    """Stand or lay one hand tool, traced from the tools photo: 0 the depth stick, 1 the spade, 2 the pick."""
    tools = photo('works-tools.jpg')
    if not _tools:
        mask = subject(tools)
        columns = mask.any(axis=0)
        starts = [x for x in range(1, tools.w) if columns[x] and not columns[x - 1]]
        stops = [x for x in range(1, tools.w) if not columns[x] and columns[x - 1]]
        spans = [(a, b) for a, b in zip(starts, stops) if b - a > 12]
        _tools['mask'] = mask
        _tools['boxes'] = []
        for a, b in spans:
            rows_hit = np.nonzero(mask[:, a:b].any(axis=1))[0]
            _tools['boxes'].append((a, int(rows_hit.min()), b, int(rows_hit.max()) + 1))
        print('works tools found at', _tools['boxes'])
        assert len(_tools['boxes']) == 3, 'the tools photo should show three tools standing apart'
    x0, y0, x1, y1 = _tools['boxes'][index]
    scale = height / (y1 - y0)
    right, up = Vector(right).normalized(), Vector(up).normalized()
    normal = right.cross(up).normalized()
    foot = Vector(foot)
    loops = trace(_tools['mask'], (x0 - 2, y0 - 2, x1 + 2, y1 + 2), tolerance=1.6, min_area=40)
    def world(px, py, d):
        return foot + right * ((px - (x0 + x1) / 2) * scale) + up * ((y1 - py) * scale - sink) + normal * d
    slab(mesh, key, tools, loops, world, -thickness / 2, thickness / 2, wall_scale=scale)
    return tools


def bearers(mesh, key, picture, xs, z0, z1, y=.06, size=.12):
    for x in xs:
        strut(mesh, key, picture, (22, 300, 500, 340), (x, y, z0), (x, y, z1), size, size)


if want('pile-sand'):
    piece = node('pile-sand', family)
    sand, planks = photo('sand-pale-fine.jpg'), photo('bench-top.jpg')
    mesh = Mesh()
    mound(mesh, 'sand', (-.35, 0, .25), 2.85, 2.6, 1.8, tiled(sand, 2.6), rings=6, sides=18, seed=11, rough=.045,
          profile=lambda f: (1 - f) ** .95)
    mound(mesh, 'sand', (2.0, 0, -1.7), 1.25, 1.1, .72, tiled(sand, 2.6), rings=4, sides=12, seed=12, rough=.08)
    strut(mesh, 'plank', planks, (22, 300, 972, 345), (-3.3, .04, -2.5), (-1.55, .78, -1.2), .28, .05)
    tools = place_tool(mesh, 'tools', 1, (1.75, .55, -1.55), 1.05, right=(.8, 0, .6), up=(.12, 1, -.1), sink=.2)
    obj = mesh.finish('pile-sand-heap', {'sand': sand.material(), 'plank': planks.material(), 'tools': tools.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-clay'):
    piece = node('pile-clay', family)
    clay = photo('clay-wet-red-brown.jpg')
    mesh = Mesh()
    dome = lambda f: (1 - f ** 1.7) * (1 - .25 * f)
    mound(mesh, 'clay', (.2, 0, .1), 2.7, 2.2, 1.15, tiled(clay, 2.2), rings=6, sides=16, seed=31, rough=.2, profile=dome, lean=(.3, -.2))
    for seed, (x, z, r, h) in enumerate(((-2.1, -1.9, .85, .5), (2.3, 1.7, .8, .42), (2.2, -1.9, .6, .34), (-2.3, 1.7, .55, .3)), 40):
        mound(mesh, 'clay', (x, 0, z), r, r * .8, h, tiled(clay, 2.2), rings=3, sides=9, seed=seed, rough=.22, profile=dome)
    tools = place_tool(mesh, 'tools', 2, (-2.9, .09, .3), .95, right=(0, 0, 1), up=(1, .12, .1))
    obj = mesh.finish('pile-clay-heap', {'clay': clay.material(), 'tools': tools.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-salvage'):
    piece = node('pile-salvage', family)
    scrap, rubber, pipe_photo, tin = (photo('pile-salvage-top.jpg'), photo('machines2-dusty-rubber.jpg'),
                                      photo('pipe-truck-pipe.jpg'), photo('tin-corrugated-rust.jpg'))
    sx0, sy0, sx1, sy1 = extent(subject(scrap))
    scx, scy, srad = (sx0 + sx1) / 2, (sy0 + sy1) / 2, min(sx1 - sx0, sy1 - sy0) / 2
    print('salvage heap photo: centre', scx, scy, 'radius', srad)
    mesh = Mesh()
    R = 2.75
    mound(mesh, 'scrap', (0, 0, 0), R, R, 1.55, lambda x, z, f, a: scrap.uv(scx + x / R * srad * .86, scy + z / R * srad * .86),
          rings=6, sides=18, seed=51, rough=.13, profile=lambda f: (1 - f ** 1.35) * (1 - .15 * f))
    rubber_skin = (8, 8, rubber.w - 8, rubber.h - 8)
    ring_tyre(mesh, 'rubber', rubber, (2.45, .42, 1.3), (.5, .25, .83), .44, skin=rubber_skin)
    ring_tyre(mesh, 'rubber', rubber, (-2.7, .13, -1.2), (.05, 1, .03), .42, skin=rubber_skin)
    pipe(mesh, 'pipe', pipe_photo, (-.6, .9, .3), (-2.9, 1.75, 1.9), .09, sides=6, skin=PIPE_SKIN)
    pipe(mesh, 'pipe', pipe_photo, (.9, .7, -1.2), (2.4, .1, -3.1), .07, sides=6, skin=PIPE_SKIN)
    corrugated(mesh, 'tin', tin, [(-.3, 1.2, -1.6), (.55, 1.05, -1.75), (.9, .25, -3.05), (-.1, .3, -2.95)], waves=8)
    obj = mesh.finish('pile-salvage-heap', {'scrap': scrap.material(), 'rubber': rubber.material(),
                                            'pipe': pipe_photo.material(), 'tin': tin.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-steel'):
    piece = node('pile-steel', family)
    steel, rust, planks = photo('plate-steel-mill.jpg'), photo('sawmill-roof.jpg'), photo('bench-top.jpg')
    rng = random.Random(61)
    mesh = Mesh()
    bearers(mesh, 'plank', planks, (-2.6, -1.2, .2), .1, 2.4)
    for layer in range(7):
        block(mesh, 'steel', steel, (-1.2 + rng.uniform(-.12, .12), .12 + layer * .05, 1.25 + rng.uniform(-.1, .1)),
              (3.4 - layer * .08, .042, 1.9 - (layer // 3) * .25), yaw=rng.uniform(-.05, .05), metres=2.2,
              shift=(rng.uniform(0, 200), rng.uniform(0, 200)), side=(0, 300, 512, 316))
    for layer in range(4):
        block(mesh, 'steel', steel, (2.35 + rng.uniform(-.05, .05), .12 + layer * .05, 1.6), (1.3, .042, 1.5),
              yaw=.32 + rng.uniform(-.06, .06), metres=2.2, shift=(rng.uniform(0, 200), 40), side=(0, 300, 512, 316))
    bearers(mesh, 'plank', planks, (2.0, 2.8), .85, 2.35)
    bearers(mesh, 'plank', planks, (-2.3, 0, 2.3), -2.9, -.5)
    for index in range(5):
        z = -2.65 + index * .46
        skew = rng.uniform(-.06, .06)
        i_beam(mesh, 'rust', rust, RUST_STRIP, (-3.05 + rng.uniform(0, .3), .25, z - skew), (2.9 + rng.uniform(0, .35), .25, z + skew))
    for index in range(3):
        z = -2.4 + index * .5
        i_beam(mesh, 'rust', rust, RUST_STRIP, (-2.6 + index * .3, .51, z + .1), (3.1 - index * .2, .51, z - .08))
    i_beam(mesh, 'rust', rust, RUST_STRIP, (-1.2, .14, -.2), (3.2, .14, .35), width=.14, height=.2)
    obj = mesh.finish('pile-steel-plate-and-beams', {'steel': steel.material(), 'rust': rust.material(), 'plank': planks.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-tin'):
    piece = node('pile-tin', family)
    tin, planks, front = photo('tin-corrugated-rust.jpg'), photo('bench-top.jpg'), photo('sawmill-front.jpg')
    mesh = Mesh()
    bearers(mesh, 'plank', planks, (-2.7, -1.5, -.3), .1, 2.2)
    block(mesh, 'tin', tin, (-1.5, .12, 1.15), (2.42, .34, 1.86), side=(0, 250, 512, 262))
    for z0 in (.22, 1.15):
        corrugated(mesh, 'tin', tin, [(-2.72, .49, z0), (-2.72, .49, z0 + .93), (-.28, .485, z0 + .93 + .04), (-.28, .485, z0 + .04)])
    corrugated(mesh, 'tin', tin, [(-2.2, .52, .7), (-2.3, .52, 1.62), (.2, .54, 1.9), (.3, .54, .98)])
    block(mesh, 'tin', tin, (1.9, .0, 1.9), (.95, .22, 2.42), yaw=.06, side=(0, 250, 512, 258))
    corrugated(mesh, 'tin', tin, [(1.42, .245, .72), (2.36, .245, .66), (2.5, .25, 3.06), (1.56, .25, 3.12)])
    # A leaning rack: sheets stood against a rail between two posts.
    for z in (-2.9, -.55):
        strut(mesh, 'front', front, (155, 320, 195, 730), (-.9, 0, z), (-.9, 1.45, z), .11, .11, up=(1, 0, 0))
    strut(mesh, 'front', front, (200, 284, 820, 310), (-.9, 1.32, -3.05), (-.9, 1.32, -.4), .09, .09)
    for index in range(5):
        foot = -.05 + index * .13
        z0 = -2.85 + index * .32 + (.12 if index % 2 else 0)
        corrugated(mesh, 'tin', tin, [(foot, .03, z0), (foot, .03, z0 + .92), (-.82 + index * .05, 1.38 + index * .03, z0 + .92),
                                      (-.82 + index * .05, 1.38 + index * .03, z0)], repeat=1.9)
    corrugated(mesh, 'tin', tin, [(1.3, .035, -2.7), (2.2, .035, -2.95), (2.85, .06, -.75), (1.95, .06, -.5)])
    corrugated(mesh, 'tin', tin, [(-3.25, .04, -2.2), (-2.3, .04, -2.5), (-1.7, .05, -.35), (-2.65, .05, -.05)])
    obj = mesh.finish('pile-tin-sheets', {'tin': tin.material(), 'plank': planks.material(), 'front': front.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-timber'):
    piece = node('pile-timber', family)
    bark, log_ends, front = photo('sawmill-bark.jpg'), photo('timber-weathered-logs.jpg'), photo('sawmill-front.jpg')
    rng = random.Random(71)
    mesh = Mesh()
    radius = .31
    for row, count in enumerate((6, 5, 4, 2)):
        for i in range(count):
            z = -1.6 + (i + row * .5 + (.5 if row == 3 else 0)) * radius * 2.05
            y = radius * (1 + row * 1.74) + .1
            length = rng.uniform(3.9, 4.6)
            shift = rng.uniform(-.3, .3)
            round_log(mesh, 'bark', 'end', (-length / 2 + shift - .3, y, z), (length / 2 + shift - .3, y, z),
                radius * rng.uniform(.82, 1.0), sides=9, end=rng.choice(LOG_ENDS))
    bearers(mesh, 'front', front, (-1.9, 1.3), -2.0, 1.9, y=.05, size=.1)
    for x in (-1.7, 1.1):
        for z in (-2.0, -1.6 + 5 * radius * 2.05 + .4):
            strut(mesh, 'front', front, (155, 320, 195, 730), (x, 0, z), (x, 1.7, z), .12, .12, up=(1, 0, 0))
    round_log(mesh, 'bark', 'end', (-2.2, .2, 2.75), (1.9, .2, 3.1), .2, sides=8, end=LOG_ENDS[1])
    round_log(mesh, 'bark', 'end', (2.75, .24, -2.6), (3.05, .24, 1.2), .24, sides=8, end=LOG_ENDS[2])
    obj = mesh.finish('pile-timber-logs', {'bark': bark.material(), 'end': log_ends.material(), 'front': front.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-brick'):
    piece = node('pile-brick', family)
    brick, planks = photo('brick-red-orange.jpg'), photo('bench-top.jpg')
    rng = random.Random(81)
    mesh = Mesh()
    for (x, z, height, yaw) in ((-2.0, 1.6, 1.15, .04), (-.55, 1.75, .95, -.05), (-2.05, .1, .75, .02),
                                (-.6, .25, 1.15, .07), (.95, 1.55, .55, -.03)):
        bearers(mesh, 'plank', planks, (x - .4, x + .4), z - .6, z + .6, y=.05, size=.1)
        block(mesh, 'brick', brick, (x, .1, z), (1.22, height, 1.22), yaw=yaw, shift=(rng.uniform(0, 300), rng.uniform(0, 300)))
        if height < 1.1:
            block(mesh, 'brick', brick, (x - .2, .1 + height, z + .15), (.75, .2, .9), yaw=yaw, shift=(rng.uniform(0, 300), 60))
    tumble = lambda x, z, f, a: (x / 1.05 + .5 + .3 * math.sin(a * 3), z / 1.05 + .5)
    mound(mesh, 'brick', (1.7, 0, -1.5), 1.75, 1.45, .7, tumble, rings=4, sides=12, seed=82, rough=.24,
          profile=lambda f: (1 - f ** 1.4))
    for index in range(9):
        angle = rng.uniform(0, 6.28)
        x, z = 1.7 + math.cos(angle) * rng.uniform(1.2, 2.2) * .8, -1.5 + math.sin(angle) * rng.uniform(1.0, 1.7)
        z = max(z, -3.3)
        block(mesh, 'brick', brick, (min(x, 3.3), 0, z), (.22, .075, .105), yaw=rng.uniform(0, 3.1), metres=.22,
              shift=(40 + rng.randrange(4) * 105, 30 + rng.randrange(6) * 72), side=(60, 100, 150, 130))
    obj = mesh.finish('pile-brick-stacks', {'brick': brick.material(), 'plank': planks.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pile-pipe'):
    piece = node('pile-pipe', family)
    pipe_photo, pipe_ends, rust, planks = (photo('pipe-truck-pipe.jpg'), photo('pipe-rusted-steel.jpg'),
                                           photo('sawmill-roof.jpg'), photo('bench-top.jpg'))
    bore = ('ends', pipe_ends, darkest(pipe_ends))
    rng = random.Random(91)
    mesh = Mesh()
    radius = .155
    bearers(mesh, 'plank', planks, (-2.0, 0, 2.0), -1.3, 1.5, y=.05, size=.1)
    for row, count in enumerate((7, 6, 5)):
        for i in range(count):
            z = -.95 + (i + row * .5) * radius * 2.04
            y = .1 + radius * (1 + row * 1.74)
            shift = rng.uniform(-.2, .2)
            pipe(mesh, 'pipe', pipe_photo, (-3.0 + shift, y, z), (3.0 + shift, y, z), radius, sides=7, skin=PIPE_SKIN, bore=bore)
    for x in (-1.6, 1.6):
        for z in (-.95 - radius - .07, -.95 + 6 * radius * 2.04 + radius + .07):
            strut(mesh, 'rust', rust, RUST_STRIP, (x, 0, z), (x, 1.25, z), .07, .07, up=(1, 0, 0))
    pipe(mesh, 'pipe', pipe_photo, (-3.1, .16, -2.3), (2.6, .16, -1.85), radius, sides=7, skin=PIPE_SKIN, bore=bore)
    pipe(mesh, 'pipe', pipe_photo, (-2.2, .16, 2.35), (3.2, .16, 2.9), radius, sides=7, skin=PIPE_SKIN, bore=bore)
    pipe(mesh, 'pipe', pipe_photo, (-1.0, .16, -2.95), (3.1, .16, -2.7), radius * .8, sides=7, skin=PIPE_SKIN, bore=bore)
    obj = mesh.finish('pile-pipe-stack', {'pipe': pipe_photo.material(), 'ends': pipe_ends.material(),
                                          'rust': rust.material(), 'plank': planks.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('pipe-stack'):
    piece = node('pipe-stack', family)
    pipe_photo, pipe_ends, planks = photo('pipe-truck-pipe.jpg'), photo('pipe-rusted-steel.jpg'), photo('bench-top.jpg')
    bore = ('ends', pipe_ends, darkest(pipe_ends))
    mesh = Mesh()
    radius = .46
    bearers(mesh, 'plank', planks, (-1.9, 0, 1.9), -1.5, 1.5, y=.07, size=.14)
    for (y, z, shift) in ((.14 + radius, -.48, .1), (.14 + radius, .48, -.15), (.14 + radius * 2.72, 0, .25)):
        pipe(mesh, 'pipe', pipe_photo, (-2.9 + shift, y, z), (2.9 + shift, y, z), radius, wall=.05, sides=12, skin=PIPE_SKIN, bore=bore)
    for x in (-1.9, 0, 1.9):
        for z in (-1.02, 1.02):
            block(mesh, 'plank', planks, (x, .14, z), (.14, .16, .22), top=(60, 300, 120, 330), side=(60, 300, 120, 330))
    pipe(mesh, 'pipe', pipe_photo, (-2.4, radius, 2.15), (3.0, radius, 2.6), radius, wall=.05, sides=12, skin=PIPE_SKIN, bore=bore)
    block(mesh, 'plank', planks, (0, 0, 1.55), (.2, .14, .2), top=(60, 300, 120, 330), side=(60, 300, 120, 330))
    obj = mesh.finish('pipe-stack-mains', {'pipe': pipe_photo.material(), 'ends': pipe_ends.material(), 'plank': planks.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)


def photo_wall(mesh, key, picture, mask, a, b, px0, scale, ground_row, top_row, thickness, tolerance=3.5, grow=1.0):
    """One length of wall from ground point a to ground point b, traced from an elevation photo starting at px0."""
    a, b = Vector(a), Vector(b)
    along = (b - a).normalized()
    across = Vector((0, 1, 0)).cross(along).normalized()
    px1 = px0 + (b - a).length / scale
    loops = trace(mask, (int(px0), top_row, int(px1), ground_row + 1), tolerance=tolerance, min_area=300)
    loops = [max(loops, key=lambda loop: abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(loop, loop[1:] + loop[:1]))))]
    def world(px, py, d):
        return a + along * ((px - px0) * scale) + Vector((0, (ground_row - py) * scale * grow, 0)) + across * d
    slab(mesh, key, picture, loops, world, -thickness / 2, thickness / 2, wall_scale=scale)


def drum(mesh, key, picture, strip, centre, radius=.29, height=.88, sides=10, lying=None):
    """An oil drum wearing a strip of rusted iron; `lying` is the direction it lies along, if it has fallen."""
    px0, py0, px1, py1 = strip
    axis = Vector(lying).normalized() if lying else Vector((0, 1, 0))
    e1 = axis.cross(Vector((0, 0, 1)))
    if e1.length < 1e-4:
        e1 = Vector((1, 0, 0))
    e1.normalize()
    e2 = axis.cross(e1).normalized()
    def skin(index, distance, ring_radius, angle):
        return picture.uv(px0 + (px1 - px0) * angle / (2 * math.pi), py0 + (py1 - py0) * distance / height)
    def lid(angle, fraction):
        return picture.uv((px0 + px1) / 2 + math.cos(angle) * fraction * 8, (py0 + py1) / 2 + math.sin(angle) * fraction * 8)
    lathe(mesh, key, centre, axis, e1, e2, [(0, radius), (height * .33, radius * 1.03), (height * .66, radius * 1.03), (height, radius)],
          skin, sides=sides, cap_start=(key, lid), cap_end=(key, lid))


# ---------------------------------------------------------------------------------------------
# Salvage yard, 3 by 3: walled on three sides with sleeper walls, sorted bays along the back,
# the unsorted heap under a tripod hoist, and the gang's shed by the gate. Photos generated
# with OpenAI image generation on 19 November 2026 (works-CREDITS.md).
if want('salvage-yard'):
    yard = node('salvage-yard', family)
    rng = random.Random(101)
    ground, bay, tin = photo('machine-yard-ground.jpg'), photo('salvage-bay-wall.jpg'), photo('tin-corrugated-rust.jpg')
    rust, pipe_photo, pipe_ends = photo('sawmill-roof.jpg'), photo('pipe-truck-pipe.jpg'), photo('pipe-rusted-steel.jpg')
    steel, planks, front = photo('plate-steel-mill.jpg'), photo('bench-top.jpg'), photo('sawmill-front.jpg')
    rubber = photo('machines2-dusty-rubber.jpg')
    EDGE = 11.25

    # The yard floor: trodden, oil-stained earth, its road edge ragged.
    mesh = Mesh()
    cells = 6
    grid = {}
    for i in range(cells + 1):
        for j in range(cells + 1):
            x = -EDGE + .15 + (2 * EDGE - .3) * i / cells
            z = -EDGE + .15 + (2 * EDGE - .3) * j / cells
            if j == 0:
                z += rng.uniform(-.1, .5)
            grid[i, j] = (mesh.vertex((x, .03 if 0 < j else .012, z)), ground.uv(x * 60 + 512, z * 60 + 340))
    for i in range(cells):
        for j in range(cells):
            quad = [grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]]
            mesh.indexed([q[0] for q in quad], [q[1] for q in quad], 'ground', (0, 1, 0))
    obj = mesh.finish('salvage-yard-floor', {'ground': ground.material()})
    obj.parent = node('salvage-yard:floor', yard)

    # Sleeper walls round three sides, and between the bays.
    bay_mask = subject(bay)
    BAY_SCALE = 6.0 / (928 - 95)
    mesh = Mesh()
    def wall(a, b, runs):
        a, b = Vector(a), Vector(b)
        for index in range(runs):
            start, stop = a.lerp(b, index / runs), a.lerp(b, (index + 1) / runs)
            room = 928 - 95 - (stop - start).length / BAY_SCALE
            photo_wall(mesh, 'bay', bay, bay_mask, start, stop, 95 + rng.uniform(0, max(room - 2, 0)), BAY_SCALE, 403, 120, .24,
                       grow=rng.uniform(.95, 1.12))
    wall((-EDGE, 0, EDGE), (EDGE, 0, EDGE), 4)
    wall((-EDGE, 0, -EDGE), (-EDGE, 0, EDGE), 4)
    wall((EDGE, 0, -4.0), (EDGE, 0, EDGE), 3)
    wall((-EDGE, 0, -EDGE), (-3.3, 0, -EDGE), 2)
    wall((3.3, 0, -EDGE), (6.0, 0, -EDGE), 1)
    BAY_FRONT = 5.7
    for x in (-6.7, -2.25, 2.25, 6.7):
        wall((x, 0, BAY_FRONT), (x, 0, EDGE - .1), 1)
    obj = mesh.finish('salvage-yard-sleeper-walls', {'bay': bay.material()})
    obj.parent = node('salvage-yard:walls', yard)
    print('salvage yard walls triangles', sum(len(p.vertices) - 2 for p in obj.data.polygons))

    # The bays, left to right: tyres, steel, tin, pipe, drums.
    bays = node('salvage-yard:bays', yard)
    tyres = photo('pile-tyres-top.jpg')
    tx0, ty0, tx1, ty1 = extent(subject(tyres))
    tcx, tcy, trad = (tx0 + tx1) / 2, (ty0 + ty1) / 2, min(tx1 - tx0, ty1 - ty0) / 2
    mesh = Mesh()
    mound(mesh, 'tyres', (-8.95, 0, 8.6), 1.95, 2.3, 1.35, lambda x, z, f, a: tyres.uv(tcx + x / 1.95 * trad * .84, tcy + z / 2.3 * trad * .84),
          rings=5, sides=14, seed=103, rough=.12, profile=lambda f: (1 - f ** 1.5) * (1 - .1 * f))
    rubber_skin = (8, 8, rubber.w - 8, rubber.h - 8)
    for centre, axis, r in (((-8.2, .5, 6.1), (.2, .3, 1), .45), ((-9.9, .14, 6.3), (0, 1, .05), .43), ((-7.6, .13, 5.2), (.05, 1, 0), .4),
                            ((-8.9, 1.45, 8.9), (.3, 1, .2), .42)):
        ring_tyre(mesh, 'rubber', rubber, centre, axis, r, sides=10, skin=rubber_skin)
    # steel
    bearers(mesh, 'plank', planks, (-5.9, -3.1), 6.4, 10.6, y=.06, size=.12)
    for index in range(6):
        x = -6.05 + index * .52
        i_beam(mesh, 'rust', rust, RUST_STRIP, (x + rng.uniform(-.05, .05), .25, 6.2 + rng.uniform(0, .4)),
               (x + rng.uniform(-.05, .05), .25, 10.9 - rng.uniform(0, .5)))
    for index in range(3):
        i_beam(mesh, 'rust', rust, RUST_STRIP, (-5.7 + index * .6, .52, 6.6), (-5.5 + index * .55, .52, 10.4))
    for layer in range(5):
        block(mesh, 'steel', steel, (-3.3, .12 + layer * .05, 7.6 + rng.uniform(-.1, .1)), (1.3, .042, 2.6), yaw=rng.uniform(-.04, .04),
              metres=2.2, shift=(rng.uniform(0, 200), rng.uniform(0, 200)), side=(0, 300, 512, 316))
    # tin
    block(mesh, 'tin', tin, (-.9, .0, 8.6), (.95, .4, 2.42), yaw=.03, side=(0, 250, 512, 262))
    corrugated(mesh, 'tin', tin, [(-1.38, .425, 7.4), (-.44, .425, 7.36), (-.4, .43, 9.78), (-1.34, .43, 9.82)])
    for index in range(4):
        foot = 1.25 - index * .14
        z0 = 6.4 + index * .95
        corrugated(mesh, 'tin', tin, [(foot, .03, z0), (foot, .03, z0 + .92), (2.05, 1.7, z0 + .92), (2.05, 1.7, z0)], repeat=2.0)
    corrugated(mesh, 'tin', tin, [(-.2, .04, 5.9), (.72, .04, 5.75), (1.0, .05, 8.1), (.1, .05, 8.25)])
    # pipe
    bore = ('ends', pipe_ends, darkest(pipe_ends))
    for z in (7.0, 9.9):
        strut(mesh, 'plank', planks, (22, 300, 500, 340), (2.9, .05, z), (5.6, .05, z), .1, .1)
    for row, count in enumerate((6, 5, 3)):
        for i in range(count):
            x = 3.2 + (i + row * .5) * .33
            y = .1 + .16 * (1 + row * 1.74)
            shift = rng.uniform(-.25, .25)
            pipe(mesh, 'pipe', pipe_photo, (x, y, 6.0 + shift), (x, y, 10.8 + shift * .5), .16, sides=7, skin=PIPE_SKIN, bore=bore)
    pipe(mesh, 'pipe', pipe_photo, (5.7, .16, 6.3), (5.95, .16, 10.6), .13, sides=7, skin=PIPE_SKIN, bore=bore)
    # drums
    for index, (x, z) in enumerate(((7.5, 10.5), (8.15, 10.45), (8.8, 10.5), (9.45, 10.4), (10.1, 10.45), (7.55, 9.8), (8.2, 9.75),
                                    (10.2, 9.7), (8.5, 10.1), (9.15, 10.05))):
        base = .9 if index >= 8 else 0
        drum(mesh, 'rust', rust, (100 + index * 70, 205 + (index % 3) * 40, 180 + index * 70, 360 + (index % 2) * 180),
             (x + rng.uniform(-.04, .04), base, z))
    drum(mesh, 'rust', rust, (300, 410, 380, 560), (8.3, .29, 7.2), lying=(1, 0, .3))
    drum(mesh, 'rust', rust, (600, 205, 680, 360), (9.9, .29, 6.4), lying=(.2, 0, 1))
    obj = mesh.finish('salvage-yard-sorted-stock', {'tyres': tyres.material(), 'rubber': rubber.material(), 'plank': planks.material(),
                                                    'rust': rust.material(), 'steel': steel.material(), 'tin': tin.material(),
                                                    'pipe': pipe_photo.material(), 'ends': pipe_ends.material()})
    obj.parent = bays

    # The unsorted heap by the gate, under a tripod hoist, and a smaller heap half sorted.
    scrap = photo('pile-salvage-top.jpg')
    sx0, sy0, sx1, sy1 = extent(subject(scrap))
    scx, scy, srad = (sx0 + sx1) / 2, (sy0 + sy1) / 2, min(sx1 - sx0, sy1 - sy0) / 2
    mesh = Mesh()
    mound(mesh, 'scrap', (-7.0, 0, -4.6), 3.5, 4.4, 2.3, lambda x, z, f, a: scrap.uv(scx + x / 3.5 * srad * .86, scy + z / 4.4 * srad * .86),
          rings=6, sides=18, seed=105, rough=.14, profile=lambda f: (1 - f ** 1.35) * (1 - .15 * f))
    mound(mesh, 'scrap', (1.2, 0, 1.3), 1.7, 1.5, .8, lambda x, z, f, a: scrap.uv(scx + z / 1.7 * srad * .8, scy - x / 1.5 * srad * .8),
          rings=4, sides=12, seed=106, rough=.16, profile=lambda f: (1 - f ** 1.35))
    ring_tyre(mesh, 'rubber', rubber, (-4.1, .45, -6.9), (1, .2, .5), .46, sides=10, skin=rubber_skin)
    pipe(mesh, 'pipe', pipe_photo, (-7.6, 1.5, -3.2), (-4.3, 2.9, -1.9), .09, sides=6, skin=PIPE_SKIN)
    corrugated(mesh, 'tin', tin, [(-5.1, 1.5, -6.6), (-4.25, 1.2, -6.9), (-3.5, .05, -5.0), (-4.3, .3, -4.7)], waves=8)
    obj = mesh.finish('salvage-yard-unsorted-heaps', {'scrap': scrap.material(), 'rubber': rubber.material(),
                                                      'pipe': pipe_photo.material(), 'tin': tin.material()})
    obj.parent = node('salvage-yard:heap', yard)
    hoist = node('salvage-yard:hoist', yard)
    mesh = Mesh()
    apex = Vector((-2.4, 5.4, -2.6))
    for foot in ((-4.6, 0, -1.2), (-.4, 0, -1.6), (-2.3, 0, -5.0)):
        pipe(mesh, 'pipe', pipe_photo, foot, apex + (apex - Vector(foot)).normalized() * .35, .085, sides=6, skin=PIPE_SKIN)
    strut(mesh, 'rust', rust, RUST_STRIP, apex - Vector((0, .15, 0)), apex - Vector((0, 3.3, 0)), .035, .035, up=(1, 0, 0))
    block(mesh, 'rust', rust, apex - Vector((0, .75, 0)), (.3, .34, .2), top=(300, 376, 360, 392), side=(300, 376, 360, 392))
    block(mesh, 'steel', steel, (-2.4, 1.6, -2.6), (1.5, .05, .95), yaw=.3, metres=2.2, side=(0, 300, 512, 316))
    obj = mesh.finish('salvage-yard-tripod-hoist', {'pipe': pipe_photo.material(), 'rust': rust.material(), 'steel': steel.material()})
    obj.parent = hoist

    # The gang's shed, carved from its four photos; the stove pipe is its own piece.
    SHED_AT = (8.5, 0, -7.7)
    shed_table = {
        'photos': {'side': 'salvage-shed-side.jpg', 'front': 'salvage-shed-front.jpg',
                   'rear': 'salvage-shed-rear.jpg', 'top': 'salvage-shed-top.jpg'},
        'length': 7.0, 'width': 4.9, 'height': 3.78,
        'side': {'start': 81, 'end': 939, 'ground': 644},
        # The end photos are at their own scales; each is set from the 4.9 m width.
        'front': {'centre': 511, 'ground': 679, 'scale': 4.9 / 650},
        'rear': {'centre': 511.5, 'ground': 632, 'scale': 4.9 / 783},
        'top': {'front': 114, 'rear': 909, 'centre': 383.5, 'x_scale': 4.9 / 563},
        # The stove pipe stands at a different place in each view, so it leaves every mask.
        'cut': {'side': [(128, 95, 174, 187)], 'front': [(226, 50, 278, 150)], 'rear': [(822, 120, 868, 199)]},
        'grey': 22, 'tolerance': 26, 'bleed_tolerance': 38,
        'voxel': .12, 'target': 1500, 'mask_dir': str(render_masks),
    }
    shed_root = node('salvage-yard:shed', yard, at=SHED_AT)
    shed_body = carve_object('salvage-yard-shed-body', textures, shed_table)
    shed_body.parent = shed_root
    shed_side = Photo(textures / 'salvage-shed-side.jpg')         # a copy the carve has not painted over
    mesh = Mesh()
    pipe_uv = lambda index, distance, radius, angle: shed_side.uv(151 + math.cos(angle) * 9, 185 - distance / .9 * 60)
    lathe(mesh, 'side', (1.95, 3.55, -2.94), (0, 1, 0), (1, 0, 0), (0, 0, 1),
          [(0, .1), (.72, .1), (.74, .17), (.86, .17), (.9, .05)], pipe_uv, sides=8)
    obj = mesh.finish('salvage-yard-shed-stove-pipe', {'side': shed_side.material()})
    obj.parent = shed_root

    # Gates: two leaves of tin on iron frames, standing open into the yard. Each turns on its hinge post.
    for name, hinge_x, way, swing in (('left', -3.3, 1, -74), ('right', 3.3, -1, 68)):
        leaf = node(f'salvage-yard:gate-{name}', yard, at=(hinge_x, 0, -EDGE))
        mesh = Mesh()
        width = 3.2
        for y in (.25, 1.05, 1.85):
            strut(mesh, 'rust', rust, RUST_STRIP, (0, y, 0), (way * width, y, 0), .07, .07)
        for x in (0, way * width):
            strut(mesh, 'rust', rust, RUST_STRIP, (x, .08, 0), (x, 2.0 + (.25 if x == 0 else 0), 0), .09, .09, up=(1, 0, 0))
        strut(mesh, 'rust', rust, RUST_STRIP, (0, .25, 0), (way * width, 1.85, 0), .05, .05)
        for index in range(3):
            x0 = way * (.08 + index * 1.03)
            x1 = x0 + way * 1.0
            corrugated(mesh, 'tin', tin, [(x0, .2, -.05), (x1, .2, -.05), (x1, 1.9 + (index % 2) * .08, -.05), (x0, 1.9 + (index % 2) * .08, -.05)],
                       waves=10, repeat=1.9)
        obj = mesh.finish(f'salvage-yard-gate-{name}-leaf', {'rust': rust.material(), 'tin': tin.material()})
        obj.parent = leaf
        leaf.rotation_euler[2] = math.radians(swing)

    # A lamp on a pole by the shed door.
    mesh = Mesh()
    strut(mesh, 'front', front, (155, 320, 195, 730), (5.3, 0, -3.5), (5.3, 4.6, -3.5), .16, .16, up=(1, 0, 0))
    strut(mesh, 'rust', rust, RUST_STRIP, (5.3, 4.4, -3.5), (4.4, 4.55, -3.5), .05, .05)
    obj = mesh.finish('salvage-yard-lamp-pole', {'front': front.material(), 'rust': rust.material()})
    obj.parent = node('salvage-yard:lamp-pole', yard)
    lamp_root = node('salvage-yard:lamp', yard, at=(4.4, 4.38, -3.5))
    lamp_material = bpy.data.materials.new('Works / lamp glow')
    lamp_material.use_nodes = True
    lamp_bsdf = lamp_material.node_tree.nodes['Principled BSDF']
    lamp_bsdf.inputs['Base Color'].default_value = (1.0, .62, .25, 1)
    lamp_bsdf.inputs['Emission Color'].default_value = (1.0, .55, .18, 1)
    lamp_bsdf.inputs['Emission Strength'].default_value = 3.0
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=.13, location=(0, 0, 0))
    bulb = bpy.context.object; bulb.name = 'salvage-yard-lamp-bulb'; bulb.data.materials.append(lamp_material)
    bulb.parent = lamp_root

    check_piece(yard, 11.5, 11.5, 9000)


def limb(mesh, key, picture, points, to_world, sides=6):
    """A tapering bough through `points` [(px, py, radius in pixels, depth in metres)].

    It wears the photo along its own length, so from the photo's side it shows the photo's own
    bough, and it is round from every other side.
    """
    rings = []
    count = len(points)
    for i, (px, py, radius, depth) in enumerate(points):
        before, after = points[max(i - 1, 0)], points[min(i + 1, count - 1)]
        tx, ty = after[0] - before[0], after[1] - before[1]
        length = math.hypot(tx, ty) or 1
        nx, ny = -ty / length, tx / length
        centre = Vector(to_world(px, py, depth))
        tangent = (Vector(to_world(after[0], after[1], after[3])) - Vector(to_world(before[0], before[1], before[3]))).normalized()
        side = Vector(to_world(px + nx, py + ny, depth)) - centre
        metre = side.length
        side = (side - tangent * side.dot(tangent)).normalized()
        other = tangent.cross(side).normalized()
        ring = []
        for k in range(sides + 1):
            angle = 2 * math.pi * k / sides
            out_way = side * math.cos(angle) + other * math.sin(angle)
            ring.append((mesh.vertex(centre + out_way * radius * metre),
                         picture.uv(px + nx * math.cos(angle) * radius * .8, py + ny * math.cos(angle) * radius * .8), out_way))
        rings.append(ring)
    for i in range(count - 1):
        for k in range(sides):
            (a, ua, na), (b, ub, nb) = rings[i][k], rings[i][k + 1]
            (c, uc, _), (d, ud, _) = rings[i + 1][k + 1], rings[i + 1][k]
            mesh.indexed((a, b, c, d), (ua, ub, uc, ud), key, na + nb, True)
    px, py, radius, depth = points[-1]
    before = points[-2]
    tip = Vector(to_world(px + (px - before[0]) * .15, py + (py - before[1]) * .15, depth))
    tip_index = mesh.vertex(tip)
    for k in range(sides):
        (a, ua, na), (b, ub, nb) = rings[-1][k], rings[-1][k + 1]
        mesh.indexed((a, b, tip_index), (ua, ub, picture.uv(px, py)), key, na + nb, True)


# ---------------------------------------------------------------------------------------------
# Old Ground, 3 by 3: the town's burial ground. A sound dry-stone wall, a timber gateway with a
# lantern, a swept path, graves edged with stones, plain wooden markers and one dead tree.
# Each `old-ground:marker-N` is a whole grave (its mound, its stones and its marker) with its
# origin at the grave's head, so the game shows as many as the town has buried.
# Photos generated with OpenAI image generation on 19 November 2026 (works-CREDITS.md).
if want('old-ground'):
    ground_root = node('old-ground', family)
    rng = random.Random(121)
    wall_side = photo('old-ground-wall-side.jpg')
    wall_mask = subject(wall_side)
    WALL_SCALE = 6.0 / (934 - 87)
    HALF = 10.3
    GATE_HALF = 1.62
    mesh = Mesh()
    def stone_wall(a, b, runs):
        a, b = Vector(a), Vector(b)
        for index in range(runs):
            start, stop = a.lerp(b, index / runs), a.lerp(b, (index + 1) / runs)
            room = 934 - 87 - (stop - start).length / WALL_SCALE
            photo_wall(mesh, 'wall', wall_side, wall_mask, start, stop, 87 + rng.uniform(0, max(room - 2, 0)), WALL_SCALE, 318, 184, .5,
                       tolerance=3.0, grow=rng.uniform(.96, 1.08))
    stone_wall((-HALF, 0, HALF), (HALF, 0, HALF), 4)
    stone_wall((-HALF, 0, -HALF), (-HALF, 0, HALF), 4)
    stone_wall((HALF, 0, -HALF), (HALF, 0, HALF), 4)
    stone_wall((-HALF, 0, -HALF), (-GATE_HALF, 0, -HALF), 2)
    stone_wall((GATE_HALF, 0, -HALF), (HALF, 0, -HALF), 2)
    obj = mesh.finish('old-ground-dry-stone-wall', {'wall': wall_side.material()})
    obj.parent = node('old-ground:wall', ground_root)
    print('old ground wall triangles', sum(len(p.vertices) - 2 for p in obj.data.polygons))

    # The gateway: posts and lintel traced from the photo; the lantern is its own thin piece.
    gate = photo('old-ground-gate.jpg')
    gate_mask = subject(gate)
    GATE_SCALE = 2.75 / (685 - 84)
    LANTERN = (468, 172, 558, 338)
    frame_mask = gate_mask.copy()
    frame_mask[LANTERN[1]:LANTERN[3], LANTERN[0]:LANTERN[2]] = False
    def gate_world(px, py, d):
        return ((px - 511.5) * GATE_SCALE, (685 - py) * GATE_SCALE, -HALF + d)
    mesh = Mesh()
    slab(mesh, 'gate', gate, trace(frame_mask, (140, 78, 884, 688), tolerance=1.8, min_area=300), gate_world, -.17, .17, wall_scale=GATE_SCALE)
    lantern_mask = np.zeros_like(gate_mask)
    lantern_mask[LANTERN[1]:LANTERN[3], LANTERN[0]:LANTERN[2]] = gate_mask[LANTERN[1]:LANTERN[3], LANTERN[0]:LANTERN[2]]
    lantern_loops = trace(lantern_mask, LANTERN, tolerance=1.2, min_area=30)
    lantern_loops = [max(lantern_loops, key=len)]
    slab(mesh, 'gate', gate, lantern_loops, gate_world, -.07, .07, wall_scale=GATE_SCALE)
    obj = mesh.finish('old-ground-gateway', {'gate': gate.material()})
    obj.parent = node('old-ground:gate', ground_root)
    lantern_rows, lantern_cols = np.nonzero(lantern_mask)
    glass = gate_world((lantern_cols.min() + lantern_cols.max()) / 2, lantern_rows.max() - (lantern_rows.max() - lantern_rows.min()) * .3, 0)
    lamp_root = node('old-ground:lamp', ground_root, at=glass)
    if 'Works / lamp glow' in bpy.data.materials:
        lamp_material = bpy.data.materials['Works / lamp glow']
    else:
        lamp_material = bpy.data.materials.new('Works / lamp glow')
        lamp_material.use_nodes = True
        lamp_bsdf = lamp_material.node_tree.nodes['Principled BSDF']
        lamp_bsdf.inputs['Base Color'].default_value = (1.0, .62, .25, 1)
        lamp_bsdf.inputs['Emission Color'].default_value = (1.0, .55, .18, 1)
        lamp_bsdf.inputs['Emission Strength'].default_value = 3.0
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    glow = bpy.context.object; glow.name = 'old-ground-lantern-glow'; glow.scale = (.12, .17, .16)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    glow.data.materials.append(lamp_material); glow.parent = lamp_root

    # A swept sand path from the gate to the tree's shade.
    sand = photo('sand-pale-fine.jpg')
    mesh = Mesh()
    stations = [(-HALF + .2, 0), (-7.5, .05), (-4.5, -.08), (-1.5, .06), (1.5, -.05), (4.4, .3), (6.3, 1.1)]
    edges = []
    for index, (z, bend) in enumerate(stations):
        half_width = .95 + rng.uniform(-.1, .1) if index < len(stations) - 1 else 1.5
        edges.append(((bend - half_width, .012, z), (bend + half_width, .012, z)))
    for (l0, r0), (l1, r1) in zip(edges, edges[1:]):
        mesh.face((l0, r0, r1, l1), [sand.uv(p[0] * 190 + 256, p[2] * 190) for p in (l0, r0, r1, l1)], 'sand', (0, 1, 0))
    obj = mesh.finish('old-ground-swept-path', {'sand': sand.material()})
    obj.parent = node('old-ground:path', ground_root)

    # Twelve graves in four plots of three, either side of the path.
    grave, markers = photo('old-ground-grave-top.jpg'), photo('old-ground-markers.jpg')
    marker_mask = subject(markers)
    MARKER_BOXES = [(100, 60, 280, 453), (326, 55, 483, 453), (529, 85, 704, 453), (739, 160, 921, 453)]
    MARKER_SCALE = 1.2 / (451 - 64)
    GRAVE_SCALE = 2.2 / (912 - 98)
    places = [(x, z) for z in (-2.3, 4.6) for x in (-7.6, -5.2, -2.8, 2.8, 5.2, 7.6)]
    order = [2, 3, 8, 1, 9, 4, 7, 10, 0, 5, 6, 11]          # filled from the path outward, row by row
    for number, slot in enumerate(order, 1):
        x, z = places[slot]
        grave_root = node(f'old-ground:marker-{number}', ground_root, at=(x, 0, z))
        mesh = Mesh()
        def grave_uv(gx, gz, f, angle):
            return grave.uv(505 - (gz + 1.14) / GRAVE_SCALE * .96, 261 + gx / GRAVE_SCALE * .96)
        mound(mesh, 'grave', (0, 0, -1.14), .5, 1.12, .26, grave_uv, rings=4, sides=14, seed=130 + number, rough=.03,
              profile=lambda f: (1 - f ** 2.4) * .9 + .1 * (1 - f))
        box_index = (number * 3 + slot) % 4
        bx0, by0, bx1, by1 = MARKER_BOXES[box_index]
        lean_x, lean_z = rng.uniform(-.06, .06), rng.uniform(-.03, .07)
        turn = rng.uniform(-.12, .12)
        def marker_world(px, py, d, bx0=bx0, bx1=bx1, lean_x=lean_x, lean_z=lean_z, turn=turn):
            lx, ly = (px - (bx0 + bx1) / 2) * MARKER_SCALE, (451 - py) * MARKER_SCALE
            return (lx * math.cos(turn) + d * math.sin(turn) + ly * lean_x, ly, .16 - lx * math.sin(turn) + d * math.cos(turn) + ly * lean_z)
        marker_loops = trace(marker_mask, (bx0, by0, bx1, by1), tolerance=2.2, min_area=200)
        slab(mesh, 'marker', markers, marker_loops, marker_world, -.04, .04, wall_scale=MARKER_SCALE)
        obj = mesh.finish(f'old-ground-grave-{number}', {'grave': grave.material(), 'marker': markers.material()})
        obj.parent = grave_root

    # The dead tree: each bough follows its bough in the photo and wears that part of the photo.
    tree = photo('old-ground-tree.jpg')
    TREE_SCALE = 6.4 / (910 - 95)
    TREE_AT, TREE_TURN = (6.9, 0, 6.6), math.radians(205)
    def tree_world(px, py, depth):
        lx, ly = (px - 372) * TREE_SCALE, (910 - py) * TREE_SCALE
        c, s = math.cos(TREE_TURN), math.sin(TREE_TURN)
        return (TREE_AT[0] + lx * c + depth * s, ly, TREE_AT[2] - lx * s + depth * c)
    boughs = [
        [(372, 908, 92, 0), (368, 850, 62, 0), (360, 760, 48, 0), (372, 660, 50, 0), (385, 585, 54, 0), (392, 540, 46, 0)],
        [(350, 545, 34, 0), (300, 440, 26, .3), (265, 350, 21, .5), (245, 270, 13, .7), (265, 165, 6, .9)],
        [(255, 290, 10, .6), (190, 245, 7, .2), (140, 225, 4, -.1), (95, 182, 2.5, -.3)],
        [(150, 235, 4, -.1), (150, 140, 2, -.2)],
        [(340, 565, 30, 0), (280, 522, 22, -.5), (215, 482, 16, -.9), (150, 462, 10, -1.3), (85, 470, 5, -1.6)],
        [(165, 463, 8, -1.2), (165, 410, 6, -1.4), (138, 350, 3, -1.6)],
        [(398, 548, 36, 0), (415, 440, 28, -.4), (425, 330, 21, -.7), (400, 250, 14, -.9), (368, 190, 9, -1.0), (385, 120, 4, -1.1), (420, 98, 2, -1.2)],
        [(372, 185, 6, -1.0), (330, 180, 3, -1.2)],
        [(380, 185, 6, -1.0), (430, 180, 4, -.8), (468, 215, 2, -.7)],
        [(415, 532, 32, 0), (480, 482, 24, .5), (545, 442, 18, .9), (600, 427, 11, 1.2), (650, 440, 6, 1.5), (688, 412, 2.5, 1.7)],
        [(560, 437, 12, 1.0), (585, 387, 7, 1.3), (600, 372, 4, 1.4)],
        [(428, 410, 17, -.6), (470, 370, 15, -.3), (530, 330, 11, .1), (590, 300, 7, .5), (665, 285, 2.5, .9)],
        [(575, 305, 6, .4), (580, 250, 5, .7), (630, 225, 3, .9), (682, 212, 1.5, 1.1)],
        [(330, 880, 34, .1), (245, 893, 15, .5), (188, 904, 6, .7)],
        [(412, 880, 34, -.1), (480, 890, 16, -.4), (555, 902, 6, -.6)],
        [(372, 880, 34, .3), (366, 898, 15, 1.0), (360, 906, 6, 1.5)],
        [(372, 880, 34, -.3), (380, 898, 15, -1.0), (386, 906, 6, -1.45)],
    ]
    mesh = Mesh()
    for index, bough in enumerate(boughs):
        limb(mesh, 'tree', tree, bough, tree_world, sides=8 if index == 0 else 5)
    obj = mesh.finish('old-ground-dead-tree', {'tree': tree.material()})
    obj.parent = node('old-ground:tree', ground_root)
    print('old ground tree triangles', sum(len(p.vertices) - 2 for p in obj.data.polygons))

    check_piece(ground_root, 11.5, 11.5, 9000)


def colour_mask(picture, tolerance=30, grey=26):
    """True wherever a pixel is not the studio's colour, so gaps walled in by the subject stay open."""
    rgb = picture.rgb()
    studio = np.median(np.concatenate([rgb[4:14, 4:14].reshape(-1, 3), rgb[4:14, -14:-4].reshape(-1, 3)]), axis=0)
    return tidy((np.abs(rgb - studio).max(axis=2) > tolerance) | ((rgb.max(axis=2) - rgb.min(axis=2)) > grey), 1)


def trench_run(mesh, key, picture, path, seed):
    """Sweep the trench photo's cross-section along a path of (x, z) points. The spoil lies on the path's left.

    The trench cannot be dug below the town's ground, so its floor is the photo's dark floor laid
    just above the ground between a raised lip and the spoil bank.
    """
    profile = [(30, .004), (70, .28), (130, .48), (200, .25), (238, .07), (246, .016), (300, .016), (308, .06), (345, .004)]
    rng = random.Random(seed)
    travelled, rows = 0, []
    for i, (x, z) in enumerate(path):
        before, after = path[max(i - 1, 0)], path[min(i + 1, len(path) - 1)]
        tx, tz = after[0] - before[0], after[1] - before[1]
        length = math.hypot(tx, tz)
        nx, nz = -tz / length, tx / length
        if i:
            travelled += math.hypot(x - path[i - 1][0], z - path[i - 1][1])
        swell = 1 + rng.uniform(-.22, .22)
        row = []
        for py, height in profile:
            reach = (272 - py) * .011
            row.append((mesh.vertex((x + nx * reach, height * (swell if height > .1 else 1), z + nz * reach)),
                        picture.uv(travelled / (8 / 1024), py)))
        rows.append(row)
    for near, far in zip(rows, rows[1:]):
        for k in range(len(profile) - 1):
            quad = (near[k], near[k + 1], far[k + 1], far[k])
            mesh.indexed([q[0] for q in quad], [q[1] for q in quad], key, (0, 1, 0), True)


def loaf(mesh, key, uv, centre, length_x, length_z, height, seed, cells=(7, 5)):
    """A roped-down load: a height field with a rectangular outline. `uv(fx, fz)` takes fractions across it."""
    rng = random.Random(seed)
    nx, nz = cells
    grid = {}
    for i in range(nx + 1):
        for j in range(nz + 1):
            fx, fz = i / nx, j / nz
            rim = min(fx, 1 - fx, fz, 1 - fz)
            y = 0 if rim == 0 else height * min(1, .55 + rim * 2.2) * (1 + rng.uniform(-.22, .22))
            pull = .06 if rim == 0 else 0
            grid[i, j] = (mesh.vertex((centre[0] + (fx - .5) * length_x * (1 - pull * 0), centre[1] + y, centre[2] + (fz - .5) * length_z)),
                          uv(fx, fz))
    for i in range(nx):
        for j in range(nz):
            quad = (grid[i, j], grid[i, j + 1], grid[i + 1, j + 1], grid[i + 1, j])
            mesh.indexed([q[0] for q in quad], [q[1] for q in quad], key, (0, 1, 0), True)


if want('test-pit'):
    piece = node('test-pit', family)
    pit, planks = photo('test-pit-top.jpg'), photo('bench-top.jpg')
    PS = 1.3 / 355
    def pit_point(px, py, y=0):
        return ((px - 540) * PS, y, (500 - py) * PS)
    def pit_uv(point):
        return pit.uv(point[0] / PS + 540, 500 - point[2] / PS)
    rng = random.Random(141)
    mesh = Mesh()
    # The hole: the photo's own dark floor and cut walls, inside a low lip of trodden earth.
    hole = [(85, 315), (262, 315), (440, 315), (440, 498), (440, 680), (262, 680), (85, 680), (85, 498)]
    inner = [mesh.vertex(pit_point(px, py, .05)) for px, py in hole]
    crest, outer = [], []
    for px, py in hole:
        dx, dz = (px - 262) / 177, (py - 498) / 182
        reach = 40 + rng.uniform(-8, 14)
        crest.append(mesh.vertex(pit_point(px + dx * reach * .5, py + dz * reach * .5, .11 + rng.uniform(-.02, .03))))
        outer.append(mesh.vertex(pit_point(px + dx * reach * 1.7, py + dz * reach * 1.7, .004)))
    def uv_of(index):
        return pit_uv(mesh.verts[index])
    count = len(hole)
    for k in range(count):
        j = (k + 1) % count
        for ring_a, ring_b in ((outer, crest), (crest, inner)):
            quad = (ring_a[k], ring_a[j], ring_b[j], ring_b[k])
            mesh.indexed(quad, [uv_of(q) for q in quad], 'pit', (0, 1, 0), True)
    floor = [mesh.vertex(pit_point(px, py, .014)) for px, py in ((85, 315), (440, 315), (440, 680), (85, 680))]
    mesh.indexed(floor, [uv_of(q) for q in floor], 'pit', (0, 1, 0))
    heap_x, _, heap_z = pit_point(735, 510)
    mound(mesh, 'pit', (heap_x, 0, heap_z), 1.02, 1.05, .62, lambda x, z, f, a: pit.uv(735 + x / PS * .96, 510 - z / PS * .96),
          rings=5, sides=14, seed=142, rough=.1, profile=lambda f: (1 - f ** 1.5) * (1 - .12 * f))
    tools = place_tool(mesh, 'tools', 0, pit_point(140, 370, .014), 1.6, right=(.9, 0, .43), up=(-.1, 1, .12), thickness=.035)
    place_tool(mesh, 'tools', 1, (heap_x + .25, .42, heap_z - .1), 1.05, right=(.7, 0, -.7), up=(.15, 1, .1), sink=.22)
    for index, z in enumerate((-.95, -1.24)):
        strut(mesh, 'plank', planks, (22, 300 + index * 60, 972, 345 + index * 60), (-2.0 + index * .3, .045, z), (-.1 + index * .25, .045, z - .08), .25, .05)
    obj = mesh.finish('test-pit-hole-and-spoil', {'pit': pit.material(), 'tools': tools.material(), 'plank': planks.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

for trench_id, trench_path, pipes, plank_spots in (
        ('trench', [(-4 + i, 0) for i in range(9)], [((-3.75, 0), (3.75, 0))], [(-1.9, 0, 0), (-1.6, 0, 0), (2.3, 0, 0)]),
        ('trench-corner',
         [(-4, 0), (-3, 0), (-2, 0), (-1.2, 0)] + [(-1.2 + 1.2 * math.sin(math.radians(a)), -1.2 + 1.2 * math.cos(math.radians(a))) for a in (22.5, 45, 67.5, 90)]
         + [(0, -2), (0, -3), (0, -4)],
         [((-3.75, 0), (-.75, 0)), ((0, -.95), (0, -3.75))], [(-2.4, 0, 0), (0, -2.6, 1), (0, -2.3, 1)])):
    if not want(trench_id):
        continue
    piece = node(trench_id, family)
    trench, pipe_photo, pipe_ends, planks = (photo('trench-top.jpg'), photo('pipe-truck-pipe.jpg'),
                                             photo('pipe-rusted-steel.jpg'), photo('bench-top.jpg'))
    mesh = Mesh()
    trench_run(mesh, 'trench', trench, trench_path, seed=151)
    bore = ('ends', pipe_ends, darkest(pipe_ends))
    for (x0, z0), (x1, z1) in pipes:
        pipe(mesh, 'pipe', pipe_photo, (x0, .17, z0), (x1, .17, z1), .15, sides=8, skin=PIPE_SKIN, bore=bore)
    for index, (x, z, turned) in enumerate(plank_spots):
        a, b = ((x - .62, .1, z), (x + .55, .11, z)) if turned else ((x, .1, z - .62), (x, .11, z + .55))
        strut(mesh, 'plank', planks, (22, 195 + index * 70, 500, 240 + index * 70), a, b, .26, .045)
    obj = mesh.finish(f'{trench_id}-cut-spoil-and-pipe', {'trench': trench.material(), 'pipe': pipe_photo.material(),
                                                          'ends': pipe_ends.material(), 'plank': planks.material()})
    obj.parent = piece
    # A trench runs from cell edge to cell edge so that neighbouring pieces join.
    check_piece(piece, 4.0, 4.0, 1800)

if want('valve-box'):
    piece = node('valve-box', family)
    box_top, box_side, wheel, pipe_photo = (photo('valve-box-top.jpg'), photo('valve-box-side.jpg'),
                                            photo('valve-wheel.jpg'), photo('pipe-truck-pipe.jpg'))
    mesh = Mesh()
    side_face = ('side', box_side, (49, 165, 973, 380))
    box(mesh, -.5, .5, 0, .24, -.5, .5, {'+y': ('top', box_top, (71, 72, 946, 980)), '+z': side_face, '-z': side_face,
                                         '+x': side_face, '-x': side_face})
    pipe(mesh, 'pipe', pipe_photo, (.95, 0, .15), (.95, .86, .15), .07, sides=8, skin=PIPE_SKIN)
    pipe(mesh, 'pipe', pipe_photo, (.95, .3, .15), (.95, .36, .15), .13, wall=.06, sides=8, skin=PIPE_SKIN)
    pipe(mesh, 'pipe', pipe_photo, (-.85, 0, -.6), (-.85, .42, -.6), .09, sides=8, skin=PIPE_SKIN)
    pipe(mesh, 'pipe', pipe_photo, (-.85, .42, -.6), (-.85, .46, -.6), .14, wall=.13, sides=8, skin=PIPE_SKIN)
    obj = mesh.finish('valve-box-collar-and-risers', {'top': box_top.material(), 'side': box_side.material(), 'pipe': pipe_photo.material()})
    obj.parent = piece
    wheel_mask = colour_mask(wheel)
    wx0, wy0, wx1, wy1 = extent(wheel_mask)
    wheel_scale = .56 / (wx1 - wx0)
    wheel_root = node('valve-box:wheel', piece, at=(.95, .88, .15))
    mesh = Mesh()
    slab(mesh, 'wheel', wheel, trace(wheel_mask, (wx0 - 2, wy0 - 2, wx1 + 2, wy1 + 2), tolerance=3.0, min_area=300),
         lambda px, py, d: ((px - (wx0 + wx1) / 2) * wheel_scale, d, (py - (wy0 + wy1) / 2) * wheel_scale), -.02, .02, wall_scale=wheel_scale)
    obj = mesh.finish('valve-box-hand-wheel', {'wheel': wheel.material()})
    obj.parent = wheel_root
    check_piece(piece, 3.5, 3.5, 1800)

if want('handcart'):
    # Built from flat photographed parts: a carve would fill the wheels' spokes and the space between the shafts.
    piece = node('handcart', family)
    cart_side, cart_top, rust = photo('handcart-side.jpg'), photo('handcart-top.jpg'), photo('sawmill-roof.jpg')
    CS = 2.2 / (902 - 119)
    CART_GROUND, CART_MID = 548, 510
    def cart_world(px, py, d):
        return (d, (CART_GROUND - py) * CS, (px - CART_MID) * CS)
    side_mask = colour_mask(cart_side)
    low = side_mask[420:CART_GROUND + 2, :640]
    wheel_cols = np.nonzero(low.any(axis=0))[0]
    wheel_r = (wheel_cols.max() - wheel_cols.min()) / 2
    wheel_cx, wheel_cy = (wheel_cols.max() + wheel_cols.min()) / 2, CART_GROUND - wheel_r
    print(f'handcart wheel in the side photo: centre ({wheel_cx:.0f}, {wheel_cy:.0f}), radius {wheel_r:.0f} px = {wheel_r * CS:.2f} m')
    yy, xx = np.mgrid[0:cart_side.h, 0:cart_side.w]
    wheel_mask = side_mask & ((xx - wheel_cx) ** 2 + (yy - wheel_cy) ** 2 <= (wheel_r + 1) ** 2)
    wheel_loops = trace(wheel_mask, (int(wheel_cx - wheel_r) - 2, int(wheel_cy - wheel_r) - 2, int(wheel_cx + wheel_r) + 3, CART_GROUND + 2),
                        tolerance=2.6, min_area=120)
    HALF_W = .43
    z0, z1 = cart_world(121, 0, 0)[2], cart_world(615, 0, 0)[2]
    y0, y1 = (CART_GROUND - 360) * CS, (CART_GROUND - 235) * CS
    mesh = Mesh()
    board = ('side', cart_side, (121, 235, 615, 360))
    box(mesh, -HALF_W, HALF_W, y0, y1, z0, z1, {'+x': board, '-x': board, '+z': ('side', cart_side, (130, 240, 330, 355)),
                                                '-z': ('side', cart_side, (400, 240, 600, 355)), '-y': ('side', cart_side, (130, 300, 600, 355))})
    mesh.face(((-HALF_W, y1, z0), (-HALF_W, y1, z1), (HALF_W, y1, z1), (HALF_W, y1, z0)),
              (cart_top.uv(56, 215), cart_top.uv(463, 215), cart_top.uv(463, 552), cart_top.uv(56, 552)), 'top', (0, 1, 0))
    for hand in (-1, 1):
        slab(mesh, 'side', cart_side, wheel_loops, cart_world, hand * (HALF_W + .04), hand * (HALF_W + .1), wall_scale=CS)
        strut(mesh, 'side', cart_side, (620, 341, 860, 357), (hand * .37, .56, z1 - .1), (hand * .37, .56, z1 + .82), .06, .06)
    axle_z, axle_y = cart_world(wheel_cx, wheel_cy, 0)[2], (CART_GROUND - wheel_cy) * CS
    strut(mesh, 'rust', rust, RUST_STRIP, (-HALF_W - .12, axle_y, axle_z), (HALF_W + .12, axle_y, axle_z), .05, .05)
    strut(mesh, 'side', cart_side, (620, 341, 860, 357), (-.4, .56, z1 + .76), (.4, .56, z1 + .76), .055, .055)
    strut(mesh, 'side', cart_side, (864, 365, 878, 535), (0, .54, z1 + .7), (0, 0, z1 + .72), .06, .06, up=(1, 0, 0))
    obj = mesh.finish('handcart-deck-wheels-and-shafts', {'side': cart_side.material(), 'top': cart_top.material(), 'rust': rust.material()})
    obj.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('barrow'):
    piece = node('barrow', family)
    barrow_table = {
        'photos': {'side': 'barrow-side.jpg', 'front': 'barrow-front.jpg', 'rear': 'barrow-rear.jpg', 'top': 'barrow-top.jpg'},
        'length': 1.5, 'width': .8, 'height': .9,
        'side': {'start': 32, 'end': 980, 'ground': 658},
        'front': {'centre': 511.5, 'ground': 739, 'top': 21},
        'rear': {'centre': 511.5, 'ground': 710, 'top': 34},
        'top': {'front': 41, 'rear': 979, 'centre': 384, 'along': 'x', 'x_scale': .8 / 388},
        'grey': 22, 'tolerance': 26, 'bleed_tolerance': 38,
        'voxel': .03, 'target': 700, 'mask_dir': str(render_masks),
    }
    barrow_body = carve_object('barrow-tray-wheel-and-load', textures, barrow_table)
    barrow_body.parent = piece
    check_piece(piece, 3.5, 3.5, 1800)

if want('flatbed'):
    piece = node('flatbed', family)
    FB = 6.5 / (985 - 41)
    FRONT_Z = -3.25
    def side_z(px):
        return FRONT_Z + (px - 41) * FB
    WHEEL_R = 68 * FB
    axles = (side_z(175), side_z(765))
    flatbed_table = {
        'photos': {'side': 'flatbed-side.jpg', 'front': 'flatbed-front.jpg', 'rear': 'flatbed-rear.jpg', 'top': 'flatbed-top.jpg'},
        'length': 6.5, 'width': 2.3, 'height': (428 - 97) * FB,
        'side': {'start': 41, 'end': 985, 'ground': 428},
        'front': {'centre': 511.5, 'ground': 743, 'top': 25},
        # The rear photo shows the deck far wider than the cab; it is set from the 2.3 m deck.
        'rear': {'centre': 511.5, 'ground': 700, 'scale': 2.3 / 775},
        'top': {'front': 37, 'rear': 978, 'centre': 256, 'along': 'x', 'x_scale': 2.3 / 266},
        # The front photo shapes the cab and the rear photo the deck behind it.
        'ends_split': side_z(350),
        'underside': .6,
        'wheels': [(axles[0], WHEEL_R, .72), (axles[1], WHEEL_R, .6)],
        'grey': 22, 'tolerance': 26, 'bleed_tolerance': 38,
        'voxel': .07, 'target': 1050, 'mask_dir': str(render_masks),
    }
    flatbed_body = carve_object('flatbed-cab-and-deck', textures, flatbed_table)
    flatbed_body.parent = node('flatbed:body', piece)
    from hull_model import tyre
    flat_side, flat_front = Photo(textures / 'flatbed-side.jpg'), Photo(textures / 'flatbed-front.jpg')
    wheels_root = node('flatbed:wheels', piece)
    for name, axle, centre_px, half_width, track in (('front', axles[0], 175, .13, .86), ('rear', axles[1], 765, .25, .88)):
        for hand in (-1, 1):
            mesh = Mesh()
            tyre(mesh, 'side', flat_side, centre_px, 360, 68, WHEEL_R, half_width, 'tread', flat_front, 250, 38, 625, 735, sides=12)
            obj = mesh.finish(f'flatbed-{name}-wheel-{"left" if hand < 0 else "right"}', {'side': flat_side.material(), 'tread': flat_front.material()})
            obj.location = town.game_vector((hand * track, WHEEL_R, axle))
            obj.parent = wheels_root
    load_photo = photo('flatbed-load-top.jpg')
    deck_y = (428 - 278) * FB
    load_root = node('flatbed:load', piece, at=(0, deck_y, (side_z(360) + side_z(985)) / 2))
    mesh = Mesh()
    # The load lies along the deck: the photo's long axis runs along Z.
    loaf(mesh, 'load', lambda fx, fz: load_photo.uv(19 + fz * (1004 - 19), 17 + fx * (491 - 17)), (0, 0, 0), 2.05, 3.9, .95, seed=161)
    obj = mesh.finish('flatbed-salvage-load', {'load': load_photo.material()})
    obj.parent = load_root
    check_piece(piece, 3.5, 3.5, 1800)

# ---------------------------------------------------------------------------------------------
# Export, then review renders taken from the exported file in an empty scene.
out.parent.mkdir(parents=True, exist_ok=True)
for mesh_data in bpy.data.meshes:
    mesh_data.validate()
# Every mask is made by now, so the photos can be shrunk to what each surface needs. The passed
# warehouse and kiln keep their photos as they were reviewed.
PHOTO_LIMITS = {'sawmill-roof': 1024, 'sawmill-front': 1024, 'salvage-shed': 768, 'old-ground-tree': 768,
                'old-ground-wall-side': 768, 'flatbed-side': 768, 'flatbed-top': 768, 'pile-salvage-top': 768,
                'salvage-bay-wall': 768, 'works-tools': 768, 'pile-tyres-top': 640}
for image in bpy.data.images:
    if image.name.startswith(('warehouse-', 'kiln-')) or not image.size[0]:
        continue
    limit = next((size for stem, size in PHOTO_LIMITS.items() if image.name.startswith(stem)), 512)
    image_w, image_h = image.size
    if max(image_w, image_h) > limit:
        image.scale(max(1, round(image_w * limit / max(image_w, image_h))), max(1, round(image_h * limit / max(image_w, image_h))))
town.export_glb(out)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size}))

if args.render:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 14; scene.cycles.use_denoising = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'None'
    scene.world = bpy.data.worlds.new('review-soft grey studio'); scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.5, .5, .49, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -.02))
    plane = bpy.context.object; plane.name = 'review-only grey ground'
    ground_mat = bpy.data.materials.new('review-ground'); ground_mat.use_nodes = True
    ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.36, .35, .33, 1)
    ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    plane.data.materials.append(ground_mat)
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 50))
    sun = bpy.context.object; sun.name = 'review-sun'; sun.data.energy = 2.6; sun.data.angle = math.radians(18)
    sun.rotation_euler = (math.radians(38), math.radians(8), math.radians(-28))
    bpy.ops.object.camera_add()
    camera = bpy.context.object; camera.name = 'review-camera'; scene.camera = camera
    camera.data.clip_end = 600
    shots = evidence / f'{args.render}-round-{args.round}'
    shots.mkdir(parents=True, exist_ok=True)
    by_name = {obj.name: obj for obj in bpy.data.objects}

    def show(ids, hidden=(), places=None, parts=None):
        """Show only these pieces, each at its place (x, z) if given. `hidden` names parts to leave
        out; `parts`, if given, names the only parts to show."""
        for obj in bpy.data.objects:
            if not obj.name.startswith('review-'):
                obj.hide_render = True
        for piece_id in ids:
            piece_root = by_name[piece_id]
            x, z = (places or {}).get(piece_id, (0, 0))
            piece_root.location = (x, -z, 0)
            stack = [piece_root] if parts is None else [by_name[part] for part in parts]
            while stack:
                obj = stack.pop()
                if obj.name in hidden:
                    continue
                obj.hide_render = False
                stack.extend(obj.children)

    def shoot(name, kind, eye, target, size, res, roll=0):
        """`size` is the ortho scale in metres, or for a perspective view the width in metres to fit at the target."""
        camera.location = town.game_vector(eye)
        direction = town.game_vector(target) - camera.location
        camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        if roll:
            camera.rotation_euler.rotate_axis('Z', roll)
        if kind == 'ortho':
            camera.data.type = 'ORTHO'; camera.data.ortho_scale = size
        else:
            camera.data.type = 'PERSP'; camera.data.sensor_width = 36
            camera.data.lens = 36 * direction.length / size
        scene.render.resolution_x, scene.render.resolution_y = res
        scene.render.filepath = str(shots / f'{name}.png')
        bpy.ops.render.render(write_still=True)
        return str(shots / f'{name}.png')

    def mayor(name, target, fit, res=(1280, 720), distance=80, turn=45):
        """The mayor's camera: 45 degrees down from `distance` metres, looking from the road side."""
        flat = distance * math.cos(math.radians(45))
        eye = (target[0] + flat * math.sin(math.radians(turn)), target[1] + distance * math.sin(math.radians(45)),
               target[2] - flat * math.cos(math.radians(turn)))
        return shoot(name, 'persp', eye, target, fit, res)

    def driver(name, target, fit, res=(1280, 720), distance=28, across=6):
        """The driver's seat: eyes 1.2 m above the road, `distance` metres out on the road side."""
        return shoot(name, 'persp', (target[0] + across, 1.2, target[2] - distance), target, fit, res)

    def ref(name):
        return str(textures / name)

    rows = []
    if args.render == 'sawmill':
        show(['sawmill'])
        rows = [
            {'label': 'LONG SIDE | SOURCE PHOTO  /  EXPORTED MODEL, SAME ORTHOGRAPHIC CAMERA', 'height': 400,
             'panels': [ref('sawmill-side.jpg'), shoot('side', 'ortho', (0, 3.3, -60), (0, 3.3, 0), 24.5, (1024, 512))]},
            {'label': 'END | SOURCE PHOTO  /  EXPORTED MODEL, SAME ORTHOGRAPHIC CAMERA', 'height': 430,
             'panels': [ref('sawmill-front.jpg'), shoot('end', 'ortho', (-60, 3.55, 0), (0, 3.55, 0), 9.75, (1024, 768))]},
            {'label': 'STRAIGHT DOWN | SOURCE PHOTO  /  EXPORTED MODEL (two bays left open over the saw)', 'height': 400,
             'panels': [ref('sawmill-roof.jpg'), shoot('above', 'ortho', (0, 60, 0), (0, 0, 0), 25, (1024, 683))]},
            {'label': 'THREE-QUARTER VIEWS | EXPORTED MODEL', 'height': 430,
             'panels': [shoot('three-quarter-front', 'ortho', (30, 22, -34), (0, 2.6, 0), 27, (1024, 768)),
                        shoot('three-quarter-rear', 'ortho', (-30, 22, 34), (0, 2.6, 0), 27, (1024, 768))]},
            {'label': "MAYOR'S CAMERA, 45 DEGREES DOWN FROM 80 M  /  DRIVER'S SEAT, 1.2 M HIGH AT 30 M", 'height': 500,
             'panels': [mayor('mayor', (0, 2, 0), 30), driver('driver', (0, 3.2, 0), 27, distance=30)]},
            {'label': 'THE SAW UNDER THE ROOF, FROM 9 M  /  LOG STACKS BEHIND', 'height': 430,
             'panels': [shoot('saw', 'persp', (-2.5, 2.3, -9.5), (2.6, 1.1, -.8), 9, (1024, 768)),
                        shoot('stacks', 'persp', (-9, 2.2, 18), (0, 1.6, 4), 22, (1024, 768))]},
        ]
        title = f'TOWN WORKS | SAWMILL | ROUND {args.round}'
    elif args.render == 'heaps':
        places = {piece_id: ((index % 4 - 1.5) * 8, (index // 4 - .5) * -9) for index, piece_id in enumerate(HEAPS)}
        show(HEAPS, places=places)
        names = [piece_id.replace('pile-', '').upper() for piece_id in HEAPS]
        rows = [
            {'label': "ALL EIGHT FROM THE MAYOR'S CAMERA AT 80 M, IN 8 M CELLS  |  back row: " + ', '.join(names[:4])
                      + '  |  front row: ' + ', '.join(names[4:]),
             'height': 640, 'panels': [mayor('all-mayor', (0, .5, 0), 38, res=(1600, 800), turn=20)]},
            {'label': 'ALL EIGHT AS SMALL AS THE MAYOR SEES THEM FROM 120 M (true size at 1280 px across the screen)', 'height': 260,
             'panels': [shoot('all-far', 'persp', (120 * .7071 * .342, 120 * .7071, -120 * .7071 * .94), (0, .5, 0), 95, (1280, 260))]},
        ]
        for start in (0, 4):
            ids = HEAPS[start:start + 4]
            panels = []
            for piece_id in ids:
                show([piece_id])
                panels.append(driver(f'{piece_id}-driver', (0, .8, 0), 8.5, res=(640, 400), distance=16, across=5))
            rows.append({'label': "DRIVER'S SEAT AT 16 M | " + ' | '.join(i.replace('pile-', '').upper() for i in ids),
                         'height': 300, 'panels': panels})
            panels = []
            for piece_id in ids:
                show([piece_id])
                panels.append(shoot(f'{piece_id}-above', 'ortho', (0, 30, 0), (0, 0, 0), 8, (512, 512)))
            rows.append({'label': 'STRAIGHT DOWN, ONE 8 M CELL | ' + ' | '.join(i.replace('pile-', '').upper() for i in ids),
                         'height': 420, 'panels': panels})
        title = f'TOWN WORKS | THE EIGHT STOCKPILES | ROUND {args.round}'
    elif args.render == 'salvage-yard':
        show(['salvage-yard'], parts=['salvage-yard:shed'])
        shed = (8.5, 1.9, -7.7)
        rows = [
            {'label': "THE GANG'S SHED, LONG SIDE AND FRONT | SOURCE PHOTO  /  EXPORTED MODEL, SAME ORTHOGRAPHIC CAMERA", 'height': 330,
             'panels': [ref('salvage-shed-side.jpg'), shoot('shed-side', 'ortho', (-60, 1.9, -7.7), shed, 8.6, (1024, 768)),
                        ref('salvage-shed-front.jpg'), shoot('shed-front', 'ortho', (8.5, 1.9, -70), shed, 7.5, (1024, 768))]},
        ]
        shed_top = shoot('shed-top', 'ortho', (8.5, 40, -7.7), (8.5, 0, -7.7), 9.3, (768, 1024))
        show(['salvage-yard'])
        rows += [
            {'label': 'SHED ROOF AND BAY WALL | SOURCE PHOTOS  /  THE YARD STRAIGHT DOWN', 'height': 560,
             'panels': [ref('salvage-shed-top.jpg'), shed_top, shoot('above', 'ortho', (0, 60, 0), (0, 0, 0), 24.5, (1024, 1024))],
             'weights': [.75, .75, 1.3]},
            {'label': "MAYOR'S CAMERA, 45 DEGREES DOWN FROM 80 M  /  FROM THE OTHER FRONT CORNER", 'height': 520,
             'panels': [mayor('mayor', (0, 1, 0), 34), mayor('mayor-left', (0, 1, 0), 34, turn=-40)]},
            {'label': "DRIVER'S SEAT ON THE ROAD, 1.2 M HIGH AT 28 M  /  INSIDE THE GATE, LOOKING AT THE BAYS", 'height': 500,
             'panels': [driver('driver', (0, 2.2, -8), 30, distance=20, across=4),
                        shoot('bays', 'persp', (0, 3.2, -9.5), (0, 1.2, 8), 26, (1280, 720))]},
            {'label': 'THREE-QUARTER VIEWS | EXPORTED MODEL', 'height': 470,
             'panels': [shoot('three-quarter-front', 'ortho', (34, 26, -38), (0, 1.5, 0), 34, (1024, 768)),
                        shoot('three-quarter-rear', 'ortho', (-34, 26, 38), (0, 1.5, 0), 34, (1024, 768))]},
        ]
        title = f'TOWN WORKS | SALVAGE YARD | ROUND {args.round}'
    elif args.render == 'old-ground':
        few = {f'old-ground:marker-{n}' for n in range(5, 13)}
        all_markers = [f'old-ground:marker-{n}' for n in range(1, 13)]
        show(['old-ground'], parts=['old-ground:wall'])
        wall_view = shoot('wall', 'ortho', (-6, .5, -60), (-6, .5, -10.3), 6.4, (1024, 256))
        show(['old-ground'], parts=['old-ground:gate', 'old-ground:lamp'])
        gate_view = shoot('gate', 'ortho', (0, 1.45, -60), (0, 1.45, -10.3), 4.4, (1024, 768))
        show(['old-ground'], parts=all_markers[:4])
        marker_view = shoot('markers', 'persp', (0, 1.5, -12.5), (0, .5, -3.2), 9.5, (1024, 512))
        grave_view = shoot('grave', 'ortho', (-2.8, 30, -3.45), (-2.8, 0, -3.45), 3.0, (1024, 512), roll=math.radians(90))
        show(['old-ground'], parts=['old-ground:tree'])
        turn = math.radians(205)
        tree_view = shoot('tree', 'ortho', (6.9 + 60 * math.sin(turn), 3.3, 6.6 + 60 * math.cos(turn)), (6.9, 3.3, 6.6), 8.2, (768, 1024))
        tree_other = shoot('tree-other', 'ortho', (6.9 + 60 * math.cos(turn), 3.3, 6.6 - 60 * math.sin(turn)), (6.9, 3.3, 6.6), 8.2, (768, 1024))
        rows = [
            {'label': 'DRY-STONE WALL AND GATEWAY | SOURCE PHOTO  /  EXPORTED MODEL, SAME ORTHOGRAPHIC CAMERA', 'height': 330,
             'panels': [ref('old-ground-wall-side.jpg'), wall_view, ref('old-ground-gate.jpg'), gate_view], 'weights': [1.3, 1.3, .9, .9]},
            {'label': 'MARKERS AND ONE GRAVE | SOURCE PHOTOS  /  EXPORTED MODEL', 'height': 300,
             'panels': [ref('old-ground-markers.jpg'), marker_view, ref('old-ground-grave-top.jpg'), grave_view]},
            {'label': 'THE DEAD TREE | SOURCE PHOTO  /  MODEL FROM THE SAME SIDE  /  MODEL FROM A QUARTER TURN ROUND', 'height': 560,
             'panels': [ref('old-ground-tree.jpg'), tree_view, tree_other]},
        ]
        show(['old-ground'], hidden=few)
        rows.append({'label': "WITH ITS FIRST FOUR GRAVES | MAYOR'S CAMERA, 45 DEGREES DOWN FROM 80 M  /  STRAIGHT DOWN", 'height': 520,
                     'panels': [mayor('mayor-few', (0, 1, 0), 31), shoot('above-few', 'ortho', (0, 60, 0), (0, 0, 0), 23, (1024, 1024))],
                     'weights': [1.5, 1]})
        show(['old-ground'])
        rows += [
            {'label': "WITH ALL TWELVE | MAYOR'S CAMERA FROM 80 M  /  DRIVER'S SEAT ON THE ROAD, 1.2 M HIGH AT 26 M", 'height': 500,
             'panels': [mayor('mayor', (0, 1, 0), 31, turn=-35), driver('driver', (0, 2.2, -6), 27, distance=16, across=5)]},
            {'label': 'THREE-QUARTER VIEWS, ALL TWELVE | EXPORTED MODEL', 'height': 450,
             'panels': [shoot('three-quarter-front', 'ortho', (30, 24, -36), (0, 1.2, 0), 31, (1024, 768)),
                        shoot('inside', 'persp', (-1.5, 1.7, -8.5), (2.5, 1.3, 4), 16, (1024, 768))]},
        ]
        title = f'TOWN WORKS | OLD GROUND | ROUND {args.round}'
    elif args.render == 'small':
        def pair(piece_id, side_photo, top_photo, side_scale, side_res, top_scale, top_res, side_height, hidden=()):
            show([piece_id], hidden=hidden)
            return [ref(side_photo), shoot(f'{piece_id}-side', 'ortho', (-40, side_height, 0), (0, side_height, 0), side_scale, side_res),
                    ref(top_photo), shoot(f'{piece_id}-top', 'ortho', (0, 30, 0), (0, 0, 0), top_scale, top_res, roll=math.radians(90))]
        rows = [
            {'label': 'FLATBED, WITHOUT ITS LOAD | SIDE AND TOP | SOURCE PHOTO  /  EXPORTED MODEL, SAME ORTHOGRAPHIC CAMERA', 'height': 250,
             'panels': pair('flatbed', 'flatbed-side.jpg', 'flatbed-top.jpg', 7.05, (1024, 512), 7.05, (1024, 512), 1.25, hidden={'flatbed:load'})},
            {'label': 'HANDCART | SIDE AND TOP | SOURCE PHOTO  /  EXPORTED MODEL', 'height': 370,
             'panels': pair('handcart', 'handcart-side.jpg', 'handcart-top.jpg', 2.88, (1024, 768), 2.4, (1024, 768), .42)},
            {'label': 'BARROW | SIDE AND TOP | SOURCE PHOTO  /  EXPORTED MODEL', 'height': 370,
             'panels': pair('barrow', 'barrow-side.jpg', 'barrow-top.jpg', 1.62, (1024, 768), 1.6, (1024, 768), .47)},
        ]
        show(['flatbed'])
        rows.append({'label': "FLATBED WITH ITS LOAD | MAYOR'S CAMERA FROM 80 M  /  DRIVER'S SEAT AT 18 M  /  THREE-QUARTER", 'height': 400,
                     'panels': [mayor('flatbed-mayor', (0, 1, 0), 10, res=(800, 600)), driver('flatbed-driver', (0, 1.2, 0), 9.5, res=(800, 600), distance=18, across=7),
                                shoot('flatbed-three-quarter', 'ortho', (-20, 14, -24), (0, 1.1, 0), 9, (800, 600))]})
        for label, ids in (('HANDCART | BARROW | VALVE BOX | PIPE STACK', ['handcart', 'barrow', 'valve-box', 'pipe-stack']),
                           ('TEST PIT | TRENCH | TRENCH CORNER', ['test-pit', 'trench', 'trench-corner'])):
            fits = {'handcart': 4, 'barrow': 3, 'valve-box': 4, 'pipe-stack': 8.5, 'test-pit': 6, 'trench': 9.5, 'trench-corner': 9.5}
            near, far = [], []
            for piece_id in ids:
                show([piece_id])
                near.append(mayor(f'{piece_id}-mayor', (0, .3, 0), fits[piece_id], res=(640, 480)))
                far.append(driver(f'{piece_id}-driver', (0, .5, 0), fits[piece_id] * 1.1, res=(640, 400), distance=15, across=5))
            rows.append({'label': "MAYOR'S CAMERA FROM 80 M, CLOSE | " + label, 'height': 380 if len(ids) == 4 else 440, 'panels': near})
            rows.append({'label': "DRIVER'S SEAT AT 15 M | " + label, 'height': 300, 'panels': far})
        rows.append({'label': 'SOURCE PHOTOS | TEST PIT, TRENCH, VALVE BOX, HAND WHEEL, TOOLS', 'height': 300,
                     'panels': [ref('test-pit-top.jpg'), ref('trench-top.jpg'), ref('valve-box-top.jpg'), ref('valve-wheel.jpg'), ref('works-tools.jpg')],
                     'weights': [1, 1.6, 1, 1, 1.2]})
        places = {piece_id: ((index % 4 - 1.5) * 8, (index // 4 - .5) * -9) for index, piece_id in enumerate(SMALL)}
        show(SMALL, places=places)
        rows.append({'label': "ALL EIGHT IN 8 M CELLS FROM THE MAYOR'S CAMERA AT 80 M  |  back row: " + ', '.join(SMALL[:4]) + '  |  front row: ' + ', '.join(SMALL[4:]),
                     'height': 600, 'panels': [mayor('all-mayor', (0, .5, 0), 38, res=(1600, 800), turn=20)]})
        title = f'TOWN WORKS | SMALL WORKS AND HAULERS | ROUND {args.round}'
    plan = {'title': title, 'out': str(sheet), 'rows': rows}
    plan_path = shots / 'sheet-plan.json'
    plan_path.write_text(json.dumps(plan, indent=1), encoding='utf-8')
    import subprocess
    subprocess.run(['python', str(Path(__file__).resolve()), '--root', str(root), '--assemble-sheet', str(plan_path)], check=True)
    print(json.dumps({'glb': str(out), 'sheet': str(sheet)}))
