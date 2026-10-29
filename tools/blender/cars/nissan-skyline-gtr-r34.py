"""Original R34 shell, in metres. No external meshes or image textures.

blender -b -t 2 --python tools/blender/cars/nissan-skyline-gtr-r34.py -- --root .

Round 4 shape method: the body is lofted from outlines measured off the reference
pictures (tools/art/skyline-outlines.py writes tools/blender/cars/r34-outlines.json).
Each cross-section runs from the underside line up to the roofline taken from the
side outline, and its width at each height comes from the front and rear outlines.
Then rounded flared wheel arches are cut, the glasshouse is a body-coloured shell
with dark window panes set into it, and the nose and tail get their openings.
Materials: skyline_paint, skyline_glass (window panes), skyline_trim (black trim,
underbody and wheel houses).
"""
import argparse
import json
import math
import sys
from pathlib import Path
import bmesh
import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--target-triangles', type=int, default=12000)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
data = json.loads((root / 'tools/blender/cars/r34-outlines.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)

AXLES = (1.32, -1.345)
TYRE = .37
ARCH = .408  # arch opening radius around the wheel centre


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


paint = material('skyline_paint', (.011, .047, .262), .35, .32)
glass = material('skyline_glass', (.012, .023, .031), .15, .22)
trim = material('skyline_trim', (.012, .013, .014), .1, .55)
lens = material('skyline_lens', (.62, .68, .72), .1, .18)
silver = material('skyline_alloy', (.72, .75, .77), .9, .25)
MATERIALS = (paint, glass, trim, lens, silver)
PAINT, GLASS, TRIM, LENS, SILVER = range(5)


# ---------------------------------------------------------------- the outlines
def table(points):
    return sorted((float(a), float(b)) for a, b in points)


def lookup(points, x):
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    lo, hi = 0, len(points) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if points[mid][0] <= x:
            lo = mid
        else:
            hi = mid
    (x0, y0), (x1, y1) = points[lo], points[hi]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0) if x1 > x0 else y0


def smooth(points, reach=3):
    """Moving average along the car: removes picture noise, keeps the corners rounded and small."""
    out = []
    for i, (x, y) in enumerate(points):
        lo, hi = max(0, i - reach), min(len(points), i + reach + 1)
        out.append((x, sum(p[1] for p in points[lo:hi]) / (hi - lo)))
    return out


TOP = smooth(table(data['side']['top']))
BOTTOM = smooth(table(data['side']['bottom']), 5)
FRONT = smooth(table((h, w) for h, w in data['front']['half_width']), 2)
REAR = smooth(table((h, w) for h, w in data['rear']['half_width']), 2)
GLASS_POLY = data['side']['glass']
SCREENS = data['side']['screens']
HALF_LENGTH = data['real']['length'] / 2


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def top_h(z):
    return lookup(TOP, z)


def bottom_h(z):
    return max(.125, lookup(BOTTOM, z))


def flare(z):
    """1 at the wheel arches and beyond them, falling away between the wheels."""
    if z >= AXLES[0] or z <= AXLES[1]:
        return 1.0
    return max(math.exp(-((z - a) / .42) ** 2) for a in AXLES)


def half_width(z, h):
    """Half width of the body at station z and height h, in metres."""
    h = max(.06, min(1.34, h))
    mix = smoothstep(-1.2, 1.0, z)
    wide = lookup(REAR, h) * (1 - mix) + lookup(FRONT, h) * mix
    band = smoothstep(.12, .30, h) * (1 - smoothstep(.78, .92, h))
    door = .045 * (1 - flare(z)) * band
    # Plan view: the nose and tail are narrower than the wheel flares. The front and rear
    # pictures show the bumper corners at about .74 m, widening to the full body by the axle.
    d = HALF_LENGTH - abs(z)
    wide = min(wide, .74 + .1525 * min(1.0, d / .97))
    corner = .12 * .85 * (1 - math.sqrt(max(0.0, 1 - max(0.0, (.12 - d) / .12) ** 2)))
    return wide - door - corner


# ---------------------------------------------------------------- loft the cage
def stations():
    zs, z = [], HALF_LENGTH - .002
    while z > -HALF_LENGTH + .002:
        zs.append(z)
        edge = HALF_LENGTH - abs(z)
        z -= .012 if edge < .22 else (.016 if abs(z) < 1.55 else .026)
    zs.append(-HALF_LENGTH + .002)
    return zs


def section(z):
    """Right half of the cross-section as (x, y) from underside centre to roof centre."""
    top, bottom = top_h(z), bottom_h(z)
    span = top - bottom
    rb = min(.05, span * .2)
    rt = min(.075 if top > 1.05 else .055, span * .25)
    pts, roles = [], []

    def add(x, y, role):
        pts.append((x, y))
        roles.append(role)

    wb = half_width(z, bottom + rb)
    xb = max(.0, wb - rb)
    add(0, bottom, 'floor')
    add(xb * .5, bottom, 'floor')
    add(xb, bottom, 'floor')
    for a in (300, 330):
        r = math.radians(a)
        add(xb + rb * math.cos(r), bottom + rb + rb * math.sin(r), 'side')
    low, high = bottom + rb, top - rt
    count = 24
    for i in range(count + 1):
        u = 1 - (1 - i / count) ** 1.4  # denser towards the shoulder and glasshouse
        h = low + (high - low) * u
        add(half_width(z, h), h, 'side')
    wt = half_width(z, high)
    xt = max(.0, wt - rt)
    crown = .03
    for a in (30, 60):
        r = math.radians(a)
        add(xt + rt * math.cos(r), high + rt * math.sin(r), 'corner')
    add(xt, top - crown, 'top')
    for f in (.75, .5, .25):
        add(xt * f, top - crown * f * f, 'top')
    add(0, top, 'top')
    return pts, roles, xt


def in_polygon(point, polygon):
    x, y = point
    inside = False
    for i in range(len(polygon)):
        x0, y0 = polygon[i]
        x1, y1 = polygon[(i + 1) % len(polygon)]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


vertices, faces, face_material = [], [], []
zs = stations()
ring = None
for z in zs:
    pts, roles, xt = section(z)
    full = list(pts) + [(-x, y) for x, y in reversed(pts[1:-1])]
    if ring is None:
        ring, half_roles = len(full), roles
    assert len(full) == ring
    for x, y in full:
        vertices.append((x, -z, y))
half_n = len(half_roles)
first_top = half_roles.index('top')


def half_index(a):
    return a if a <= half_n - 1 else ring - a


for i in range(len(zs) - 1):
    zc = (zs[i] + zs[i + 1]) / 2
    xt = section(zc)[2]
    for a in range(ring):
        b = (a + 1) % ring
        faces.append((i * ring + a, i * ring + b, (i + 1) * ring + b, (i + 1) * ring + a))
        role = half_roles[max(half_index(a), half_index(b))]
        xc = abs(vertices[i * ring + a][0] + vertices[i * ring + b][0]) / 2
        hc = (vertices[i * ring + a][2] + vertices[i * ring + b][2]) / 2
        slot = TRIM if role == 'floor' else PAINT
        face_material.append(slot)
# End caps close the loft.
faces.append(tuple(range(ring - 1, -1, -1)))
face_material.append(PAINT)
faces.append(tuple((len(zs) - 1) * ring + j for j in range(ring)))
face_material.append(PAINT)

mesh = bpy.data.meshes.new('R34 lofted body')
mesh.from_pydata(vertices, [], faces)
for mat in MATERIALS:
    mesh.materials.append(mat)
mesh.update()
for poly, slot in zip(mesh.polygons, face_material):
    poly.material_index = slot
body = bpy.data.objects.new('R34 body', mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)

bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(mesh)
bm.free()


def boolean(name, obj):
    bpy.context.view_layer.objects.active = body
    mod = body.modifiers.new(name, 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = obj
    mod.solver = 'EXACT'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(obj, do_unlink=True)


def dress_cutter(cutter, slot):
    cutter.data.materials.clear()
    for m in MATERIALS:
        cutter.data.materials.append(m)
    for poly in cutter.data.polygons:
        poly.material_index = slot


def cutter_box(name, centre, size, radius, slot=TRIM):
    """centre is (x, height, z) and size is (width, height, depth), in game axes."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(centre[0], -centre[2], centre[1]))
    cutter = bpy.context.object
    cutter.name = name
    cutter.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = cutter.modifiers.new('Rounded opening', 'BEVEL')
    bevel.width = radius
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    dress_cutter(cutter, slot)
    boolean(name, cutter)


# Wheel arches: rounded openings through the flared wings, with dark wheel houses.
for side in (-1, 1):
    for axle in AXLES:
        bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=ARCH, depth=1.05,
                                            location=(side * 1.07, -axle, TYRE), rotation=(0, math.pi / 2, 0))
        cutter = bpy.context.object
        cutter.name = 'Wheel arch'
        dress_cutter(cutter, TRIM)
        boolean('Wheel arch', cutter)

# Nose and tail openings, measured off the front and rear pictures.
cutter_box('Lower intake', (0, .345, 2.30), (.66, .21, .24), .03)
cutter_box('Upper grille', (0, .628, 2.27), (.60, .105, .24), .02)
for side in (-1, 1):
    cutter_box('Side duct', (side * .525, .325, 2.30), (.21, .105, .24), .03)
cutter_box('Tail lamp panel recess', (0, .835, -2.235), (1.62, .19, .16), .045, PAINT)
cutter_box('Exhaust notch', (-.39, .31, -2.27), (.20, .22, .20), .02)

# Collapse flat areas down to the runtime budget. Vertices on material borders carry zero
# weight so window, trim and opening outlines stay exactly where they were cut.
TARGET_TRIANGLES = args.target_triangles
borders = set()
slots = [set() for _ in body.data.vertices]
for poly in body.data.polygons:
    for index in poly.vertices:
        slots[index].add(poly.material_index)
borders = [i for i, used in enumerate(slots) if len(used) > 1]
group = body.vertex_groups.new(name='Collapse interior only')
group.add(list(range(len(body.data.vertices))), 1.0, 'REPLACE')
group.add(borders, 0.0, 'REPLACE')
current = sum(len(p.vertices) - 2 for p in body.data.polygons)
decimate = body.modifiers.new('Runtime budget', 'DECIMATE')
decimate.ratio = min(1.0, TARGET_TRIANGLES / current)
decimate.vertex_group = group.name
decimate.vertex_group_factor = 1.0
decimate.use_collapse_triangulate = True
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=decimate.name)


# ---------------------------------------------- panel lines, arch lips and door handles
def surface_x(side, z, h):
    """Distance from the centre line to the outer body surface at (z, h), or None."""
    hit, location, _, _ = body.ray_cast((side * 3.0, -z, h), (-side, 0, 0))
    return abs(location.x) if hit else None


def tube(name, points, radius, slot, sides=6):
    """A thin round bar through points given as (x, z, h) in game axes."""
    verts, quads = [], []
    count = len(points)
    for i, (x, z, h) in enumerate(points):
        p = (x, -z, h)
        a = points[max(0, i - 1)]
        b = points[min(count - 1, i + 1)]
        t = (b[0] - a[0], -(b[1] - a[1]), b[2] - a[2])
        length = math.sqrt(sum(c * c for c in t)) or 1.0
        t = tuple(c / length for c in t)
        ref = (1.0, 0.0, 0.0) if abs(t[0]) < .9 else (0.0, 0.0, 1.0)
        u = (t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0])
        un = math.sqrt(sum(c * c for c in u)) or 1.0
        u = tuple(c / un for c in u)
        v = (t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0])
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            verts.append(tuple(p[c] + radius * (math.cos(ang) * u[c] + math.sin(ang) * v[c]) for c in range(3)))
    for i in range(count - 1):
        for k in range(sides):
            quads.append((i * sides + k, i * sides + (k + 1) % sides, (i + 1) * sides + (k + 1) % sides, (i + 1) * sides + k))
    quads.append(tuple(range(sides - 1, -1, -1)))
    quads.append(tuple((count - 1) * sides + k for k in range(sides)))
    tube_mesh = bpy.data.meshes.new(name)
    tube_mesh.from_pydata(verts, [], quads)
    tube_mesh.materials.append(MATERIALS[slot])
    for poly in tube_mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, tube_mesh)
    bpy.context.collection.objects.link(obj)
    return obj


extras = []
for side in (-1, 1):
    # Door shut line, from the belt down the front edge, under the sill and up the rear edge.
    door = [(.71, .93), (.705, .66), (.69, .40), (.64, .30), (.50, .285), (-.40, .285), (-.55, .30), (-.63, .38), (-.645, .66), (-.645, .93)]
    pts = []
    for z, h in door:
        x = surface_x(side, z, h)
        if x is not None:
            pts.append((side * (x + .002), z, h))
    if len(pts) > 4:
        extras.append(tube('Door line', pts, .0035, TRIM, 4))
    # Door handle.
    x = surface_x(side, -.43, .83)
    if x is not None:
        extras.append(tube('Door handle', [(side * (x + .004), -.50, .83), (side * (x + .004), -.36, .83)], .0085, PAINT, 6))
    # Rolled lip around each arch opening: stands proud of the door panel beside it.
    for axle in AXLES:
        pts = []
        for step in range(0, 37):
            phi = math.radians(-18 + 216 * step / 36)
            z, h = axle + (ARCH + .006) * math.cos(phi), TYRE + (ARCH + .006) * math.sin(phi)
            x = surface_x(side, axle + (ARCH + .03) * math.cos(phi), TYRE + (ARCH + .03) * math.sin(phi))
            if x is not None:
                pts.append((side * x, z, h))
        if len(pts) > 12:
            extras.append(tube('Arch lip', pts, .013, PAINT, 6))


# ------------------------------------- window panes, headlamp lenses: patches laid on the shell
def cast(origin, direction):
    """Ray in game axes (x, h, z). Returns the hit as (x, h, z) or None."""
    hit, loc, _, _ = body.ray_cast((origin[0], -origin[2], origin[1]), (direction[0], -direction[2], direction[1]))
    return (loc.x, loc.z, -loc.y) if hit else None


def on_side(side, z, h, lift):
    hit = cast((side * 3.0, h, z), (-side, 0, 0))
    return None if hit is None else (hit[0] + side * lift, hit[1], hit[2])


def on_top(x, z, lift):
    hit = cast((x, 2.5, z), (0, -1, 0))
    return None if hit is None else (hit[0], hit[1] + lift, hit[2])


def on_nose(x, h, lift):
    hit = cast((x, h, 3.2), (0, 0, -1))
    return None if hit is None else (hit[0], hit[1], hit[2] + lift)


def on_tail(x, h, lift):
    hit = cast((x, h, -3.2), (0, 0, 1))
    return None if hit is None else (hit[0], hit[1], hit[2] - lift)


def build_patch(name, rows, slot, facing):
    """Quad grid through rows of game-axis points, wound to face `facing` (x, h, z)."""
    flat = [p for row in rows for p in row]
    assert all(p is not None for p in flat), name
    width = len(rows[0])
    verts = [(p[0], -p[2], p[1]) for p in flat]
    quads = [(r * width + c, r * width + c + 1, (r + 1) * width + c + 1, (r + 1) * width + c)
             for r in range(len(rows) - 1) for c in range(width - 1)]
    a, b, c = (verts[i] for i in quads[0][:3])
    n = ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
         (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
         (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    if n[0] * facing[0] + n[1] * -facing[2] + n[2] * facing[1] < 0:
        quads = [q[::-1] for q in quads]
    patch_mesh = bpy.data.meshes.new(name)
    patch_mesh.from_pydata(verts, [], quads)
    patch_mesh.materials.append(MATERIALS[slot])
    for poly in patch_mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, patch_mesh)
    bpy.context.collection.objects.link(obj)
    extras.append(obj)


def shrink_polygon(poly, amount):
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    out = []
    for x, y in poly:
        d = math.hypot(x - cx, y - cy) or 1.0
        out.append((x + (cx - x) / d * amount, y + (cy - y) / d * amount))
    return out


def slab(poly, z):
    """Lowest and highest height of the polygon along the vertical line at z."""
    hs = []
    for i in range(len(poly)):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % len(poly)]
        if (x0 - z) * (x1 - z) <= 0 and x0 != x1:
            hs.append(y0 + (y1 - y0) * (z - x0) / (x1 - x0))
    return min(hs), max(hs)


def polygon_patch(name, side, poly, slot, lift, cols=18, rows=6):
    zs_ = [p[0] for p in poly]
    z0, z1 = min(zs_) + 1e-4, max(zs_) - 1e-4
    grid = []
    for r in range(rows + 1):
        row = []
        for c in range(cols + 1):
            z = z0 + (z1 - z0) * c / cols
            lo, hi = slab(poly, z)
            row.append(on_side(side, z, lo + (hi - lo) * r / rows, lift))
        grid.append(row)
    build_patch(name, grid, slot, (side, 0, 0))


def polygon_rim(name, side, poly, lift, radius):
    path = []
    for i in range(len(poly) + 1):
        (x0, y0), (x1, y1) = poly[i % len(poly)], poly[(i + 1) % len(poly)]
        for k in range(6):
            z, h = x0 + (x1 - x0) * k / 6, y0 + (y1 - y0) * k / 6
            hit = on_side(side, z, h, lift)
            if hit:
                path.append(hit)
        if i == len(poly):
            break
    extras.append(tube(name, [(p[0], p[2], p[1]) for p in path + path[:1]], radius, TRIM, 4))


for side in (-1, 1):
    door, quarter, pillar = (GLASS_POLY[k] for k in ('door', 'quarter', 'b_pillar'))
    polygon_patch('Door glass', side, shrink_polygon(door, .014), GLASS, .003)
    polygon_patch('Quarter glass', side, shrink_polygon(quarter, .014), GLASS, .003)
    polygon_patch('B pillar', side, pillar, TRIM, .004, cols=3, rows=6)
    polygon_rim('Door glass seal', side, door, .004, .006)
    polygon_rim('Quarter glass seal', side, quarter, .004, .006)

for side in (-1, 1):
    # Bonnet shut line from the base of the windscreen round to the top of each headlamp.
    line = [(.60, .80), (.66, 1.2), (.64, 1.7), (.56, 2.0), (.44, 2.16)]
    pts = [on_top(side * x, z, .003) for x, z in line]
    if all(pts):
        extras.append(tube('Bonnet line', [(p[0], p[2], p[1]) for p in pts], .0035, TRIM, 4))

for name, zr in (('Windscreen', SCREENS['windscreen']), ('Rear window', SCREENS['rear_window'])):
    z0, z1 = sorted(zr)
    grid = []
    for r in range(25):
        z = z0 + .02 + (z1 - z0 - .04) * r / 24
        xp = section(z)[2] - .035
        grid.append([on_top(xp * (-1 + 2 * c / 10), z, .003) for c in range(11)])
    build_patch(name, grid, GLASS, (0, 1, 0))
    # Black seal all the way round the opening: top edge, right side, bottom edge, left side.
    steps = [z0 + (z1 - z0) * r / 24 for r in range(25)]
    edge = lambda z: section(z)[2] - .02
    loop = [(edge(z0) * (-1 + 2 * c / 8), z0) for c in range(9)]
    loop += [(edge(z), z) for z in steps[1:]]
    loop += [(edge(z1) * (1 - 2 * c / 8), z1) for c in range(1, 9)]
    loop += [(-edge(z), z) for z in reversed(steps[:-1])]
    pts = [on_top(x, z, .004) for x, z in loop]
    extras.append(tube(name + ' seal', [(p[0], p[2], p[1]) for p in pts if p], .006, TRIM, 4))


def grid_in_x(xs, lower, upper, rows):
    return [[(x, lower(x) + (upper(x) - lower(x)) * r / rows) for x in xs] for r in range(rows + 1)]


def blend(points):
    return lambda x: lookup(sorted(points), x)


for side in (-1, 1):
    xs = [.37 + .30 * i / 14 for i in range(15)]
    lens_rows = grid_in_x(xs, blend([(.37, .612), (.682, .64)]), blend([(.37, .666), (.52, .745), (.66, .775), (.682, .775)]), 4)
    build_patch('Headlamp lens', [[on_nose(side * x, h, .006) for x, h in row] for row in lens_rows], LENS, (0, 0, 1))
    xb = [.355 + .34 * i / 14 for i in range(15)]
    bezel_rows = grid_in_x(xb, blend([(.355, .598), (.695, .628)]), blend([(.355, .674), (.52, .757), (.66, .79), (.695, .79)]), 4)
    build_patch('Headlamp bezel', [[on_nose(side * x, h, .002) for x, h in row] for row in bezel_rows], TRIM, (0, 0, 1))
    for cx, ch in ((.44, .66), (.575, .69)):
        for radius, slot, lift in ((.05, SILVER, .009), (.037, LENS, .011)):
            ring_rows = [[on_nose(side * (cx + math.cos(a) * radius * f), ch + math.sin(a) * radius * f, lift)
                          for a in [2 * math.pi * k / 16 for k in range(17)]] for f in (.0, .5, 1.0)]
            build_patch('Projector', ring_rows, slot, (0, 0, 1))
    fog = [[on_nose(side * (.54 + .08 * c / 3), .435 + .07 * r / 2, .005) for c in range(4)] for r in range(3)]
    build_patch('Fog lamp', fog, LENS, (0, 0, 1))
    fog = [[on_nose(side * (.53 + .10 * c / 3), .425 + .09 * r / 2, .002) for c in range(4)] for r in range(3)]
    build_patch('Fog lamp seat', fog, TRIM, (0, 0, 1))

# Crisp creases where panels meet, smooth shading across the curved surfaces.
bm = bmesh.new()
bm.from_mesh(body.data)
for face in bm.faces:
    face.smooth = True
for edge in bm.edges:
    edge.smooth = not (len(edge.link_faces) == 2 and edge.calc_face_angle(0) > math.radians(38))
bm.to_mesh(body.data)
bm.free()

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
for extra in extras:
    extra.select_set(True)
bpy.context.view_layer.objects.active = body
target = root / 'public/assets/models/unlocks/nissan_skyline_gtr_r34.glb'
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True)
print('Exported lofted shell:', target, 'polygons:', len(body.data.polygons),
      'triangles:', sum(len(p.vertices) - 2 for p in body.data.polygons))
