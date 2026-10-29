"""Original R34 shell, in metres. No external meshes or image textures.

blender -b -t 2 --python tools/blender/cars/nissan-skyline-gtr-r34.py -- --root .

Round 4 shape method: the body is lofted from outlines measured off the reference
pictures (tools/art/skyline-outlines.py writes tools/blender/cars/r34-outlines.json).
Each cross-section runs from the underside line up to the roofline taken from the
side outline, and its width at each height comes from the front and rear outlines.
Then rounded flared wheel arches are cut, the glasshouse is a body-coloured shell
with dark window panes set into it, and the nose and tail get their openings.

V3 detail: the loft also carries the bonnet's raised centre and its two creases, the
front wing crease, the rear haunch line and the sill step (all small, the roofline and
outline are unchanged). The nose gets deep grille and duct openings with rolled lips,
angular headlamp pockets with reflector, projectors, indicator and a clear cover, and
round fog lamps. The tail gets a shaped pod and a round pocket for each of the four
lamps; the lamps themselves are built in src/skyline-vehicle.js at the empties named
"Socket tail ..." that this recipe leaves in the GLB.
Materials: skyline_paint, skyline_glass (window panes), skyline_trim (black trim,
underbody and wheel houses), skyline_lens, skyline_alloy, skyline_cover (clear lamp
cover) and skyline_amber (indicator lamps).
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
parser.add_argument('--target-triangles', type=int, default=13500)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
data = json.loads((root / 'tools/blender/cars/r34-outlines.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)

AXLES = (1.32, -1.345)
TYRE = .34   # photo wheel radius (the V2 round used .37; the photo measures .348)
ARCH = .372  # arch opening radius around the wheel centre


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
cover = material('skyline_cover', (.55, .62, .66), .0, .08)
amber = material('skyline_amber', (.85, .38, .02), .0, .3)
MATERIALS = (paint, glass, trim, lens, silver, cover, amber)
PAINT, GLASS, TRIM, LENS, SILVER, COVER, AMBER = range(7)


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


def crease_amount(z, h):
    """How far the surface is tucked in below the front wing line and the rear haunch line (metres).

    Above each line the surface keeps the measured outline width, so the roofline and
    the silhouette stay where the photo put them; below it the wing steps in by a
    centimetre or so, which leaves a crisp crease along the line."""
    front = smoothstep(.75, 1.1, z) * (1 - smoothstep(2.0, 2.2, z))
    line = top_h(z) - .095
    tuck = front * .019 * smoothstep(line, line - .03, h) * (1 - smoothstep(line - .14, line - .2, h))
    rear = smoothstep(-.9, -1.2, z) * (1 - smoothstep(-1.7, -1.95, z))
    line = top_h(z) - .115
    tuck += rear * .022 * smoothstep(line, line - .03, h) * (1 - smoothstep(line - .16, line - .24, h))
    return tuck


def bonnet_dip(z, x, xt):
    """The bonnet keeps its centre height; the outer parts sit 2.4 cm lower behind two creases."""
    zone = smoothstep(.72, .98, z) * (1 - smoothstep(2.0, 2.2, z))
    if zone <= 0:
        return 0.0
    crease_x = .34 - .10 * smoothstep(.8, 2.1, z)
    return .024 * zone * smoothstep(crease_x - .025, crease_x + .025, x) * (1 - smoothstep(.78, 1.0, x / max(xt, .01)))


def half_width(z, h):
    """Half width of the body at station z and height h, in metres."""
    h = max(.06, min(1.34, h))
    mix = smoothstep(-1.2, 1.0, z)
    wide = lookup(REAR, h) * (1 - mix) + lookup(FRONT, h) * mix
    # The door panel sits 4.5 cm inside the sill and the wings; the step is sharp (about 5 cm tall).
    band = smoothstep(.27, .315, h) * (1 - smoothstep(.78, .92, h))
    door = .055 * (1 - flare(z)) * band
    # Plan view: the nose and tail are narrower than the wheel flares. The front and rear pictures
    # show the bumper corners at about .74 m, widening to the full body by the axle.
    d = HALF_LENGTH - abs(z)
    wide = min(wide, .74 + .1525 * min(1.0, d / .97))
    corner = .12 * .85 * (1 - math.sqrt(max(0.0, 1 - max(0.0, (.12 - d) / .12) ** 2)))
    return wide - door - corner - crease_amount(z, h)


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
    step = min(.03, (high - low) / 10)
    heights = [low + step * k for k in range(5)]  # close spacing so the sill step stays crisp
    base = low + step * 4
    count = 20
    for i in range(1, count + 1):
        u = 1 - (1 - i / count) ** 1.4  # denser towards the shoulder and glasshouse
        heights.append(base + (high - base) * u)
    for h in heights:
        add(half_width(z, h), h, 'side')
    wt = half_width(z, high)
    xt = max(.0, wt - rt)
    crown = .03
    for a in (30, 60):
        r = math.radians(a)
        add(xt + rt * math.cos(r), high + rt * math.sin(r), 'corner')
    add(xt, top - crown, 'top')
    for f in (.93, .86, .79, .72, .65, .58, .52, .47, .43, .39, .35, .30, .22, .12):
        add(xt * f, top - crown * f * f - bonnet_dip(z, xt * f, xt), 'top')
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

extras = []


def cast(origin, direction):
    """Ray in game axes (x, h, z). Returns the hit as (x, h, z) or None."""
    hit, loc, _, _ = body.ray_cast((origin[0], -origin[2], origin[1]), (direction[0], -direction[2], direction[1]))
    return (loc.x, loc.z, -loc.y) if hit else None


def on_nose(x, h, lift):
    hit = cast((x, h, 3.2), (0, 0, -1))
    return None if hit is None else (hit[0], hit[1], hit[2] + lift)


def grid_in_x(xs, lower, upper, rows):
    return [[(x, lower(x) + (upper(x) - lower(x)) * r / rows) for x in xs] for r in range(rows + 1)]


def blend(points):
    return lambda x: lookup(sorted(points), x)


# Nose openings, measured off the front picture. They are cut deep so the grille and duct
# meshes built in src/skyline-vehicle.js sit well back inside real recesses.
cutter_box('Lower intake', (0, .345, 2.22), (.66, .21, .40), .03)
cutter_box('Upper grille', (0, .628, 2.20), (.60, .105, .40), .02)
for side in (-1, 1):
    cutter_box('Side duct', (side * .525, .325, 2.22), (.21, .105, .40), .03)

# Headlamp pocket: an angular recess whose floor follows the slope of the nose. The clear
# cover is measured on the uncut surface first, because the pocket takes the surface away.
LAMP_POLY = [(.355, .598), (.695, .628), (.695, .79), (.66, .79), (.52, .757), (.355, .674)]
LENS_LOW = blend([(.37, .612), (.682, .64)])
LENS_HIGH = blend([(.37, .666), (.52, .745), (.66, .775), (.682, .775)])
samples = [cast((x, h, 3.2), (0, 0, -1)) for x, h in ((.355, .62), (.695, .62), (.50, .77))]
assert all(samples), 'headlamp samples must hit the nose'
(_, h1, z1), (_, _, z2), (_, h3, z3) = samples
PLANE_B = (z2 - z1) / (.695 - .355)
PLANE_C = (z3 - z1 - PLANE_B * (.50 - .355)) / (h3 - h1)
PLANE_A = z1 - PLANE_B * .355 - PLANE_C * h1


def lamp_z(x, h, offset=0.0):
    """Z of the headlamp pocket floor at (x, h), plus offset (outwards positive)."""
    return PLANE_A + PLANE_B * abs(x) + PLANE_C * h - .04 + offset


COVER_XS = [.355 + .34 * i / 16 for i in range(17)]
COVER_ROWS = grid_in_x(COVER_XS, blend([(.355, .598), (.695, .628)]),
                       blend([(.355, .674), (.52, .757), (.66, .79), (.695, .79)]), 5)
COVER_SLOT = 5
COVER_DATA = {side: [[on_nose(side * x, h, .004) for x, h in row] for row in COVER_ROWS] for side in (-1, 1)}


def prism_cutter(name, poly, floor, depth=.30, slot=TRIM):
    """Cut a prism: polygon (x, h) with its floor at floor(x, h), reaching `depth` outwards."""
    n = len(poly)
    verts = [(x, -floor(x, h), h) for x, h in poly] + [(x, -(floor(x, h) + depth), h) for x, h in poly]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    faces += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    cutter_mesh = bpy.data.meshes.new(name)
    cutter_mesh.from_pydata(verts, [], faces)
    cutter_obj = bpy.data.objects.new(name, cutter_mesh)
    bpy.context.collection.objects.link(cutter_obj)
    cm = bmesh.new()
    cm.from_mesh(cutter_mesh)
    bmesh.ops.recalc_face_normals(cm, faces=cm.faces)
    cm.to_mesh(cutter_mesh)
    cm.free()
    dress_cutter(cutter_obj, slot)
    boolean(name, cutter_obj)


for side in (-1, 1):
    prism_cutter('Headlamp pocket', [(side * x, h) for x, h in (LAMP_POLY if side > 0 else LAMP_POLY[::-1])],
                 lambda x, h: lamp_z(x, h))

# Tail: a shallow shaped pod holding the two lamps on each side, and a round pocket for each
# lamp (outer larger). Cut along the surface normal so the pockets sit square to the panel.
TAIL = ((.595, .085, 'outer'), (.42, .068, 'inner'))
TAIL_H = .84
sockets = []


def tail_hit(x, h):
    hit, loc, nor, _ = body.ray_cast((x, 3.2, h), (0, -1, 0))
    assert hit, 'tail ray must hit'
    return loc.copy(), nor.normalized()


def local_frame(n):
    from mathutils import Vector
    ex = Vector((1, 0, 0))
    ex = (ex - n * ex.dot(n)).normalized()
    return ex, n.cross(ex).normalized()


def convex_hull(points):
    points = sorted(set(points))
    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and ((out[-1][0] - out[-2][0]) * (p[1] - out[-2][1]) - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0])) <= 0:
                out.pop()
            out.append(p)
        return out
    lower, upper = half(points), half(points[::-1])
    return lower[:-1] + upper[:-1]


for side in (-1, 1):
    # Pod: hull of two circles slightly larger than the lamps, 2 cm deep.
    loc, n = tail_hit(side * .5, TAIL_H)
    ex, ev = local_frame(n)
    pts = []
    for x, r, _ in TAIL:
        for k in range(28):
            a = 2 * math.pi * k / 28
            pts.append((round(side * x + (r + .026) * math.cos(a), 5), round((r + .026) * math.sin(a), 5)))
    hull = convex_hull(pts)
    from mathutils import Vector
    origin = Vector((0, loc.y, TAIL_H))
    base = [origin + ex * u + ev * v - n * .022 for u, v in hull]
    verts = [tuple(p) for p in base] + [tuple(p + n * .3) for p in base]
    count = len(hull)
    faces = [tuple(range(count)), tuple(range(2 * count - 1, count - 1, -1))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i) for i in range(count)]
    pod_mesh = bpy.data.meshes.new('Tail pod')
    pod_mesh.from_pydata(verts, [], faces)
    pod = bpy.data.objects.new('Tail pod', pod_mesh)
    bpy.context.collection.objects.link(pod)
    cm = bmesh.new()
    cm.from_mesh(pod_mesh)
    bmesh.ops.recalc_face_normals(cm, faces=cm.faces)
    cm.to_mesh(pod_mesh)
    cm.free()
    dress_cutter(pod, PAINT)
    boolean('Tail pod', pod)
    for x, r, name in TAIL:
        loc, n = tail_hit(side * x, TAIL_H)
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=.3, location=loc + n * (.15 - .06))
        cutter = bpy.context.object
        cutter.rotation_euler = n.to_track_quat('Z', 'X').to_euler()
        dress_cutter(cutter, TRIM)
        boolean('Tail lamp pocket', cutter)
        sockets.append((f'Socket tail {name} {"R" if side < 0 else "L"}', loc - n * .06, n))
cutter_box('Exhaust notch', (-.39, .30, -2.27), (.26, .26, .24), .02)

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
def on_side(side, z, h, lift):
    hit = cast((side * 3.0, h, z), (-side, 0, 0))
    return None if hit is None else (hit[0] + side * lift, hit[1], hit[2])


def on_top(x, z, lift):
    hit = cast((x, 2.5, z), (0, -1, 0))
    return None if hit is None else (hit[0], hit[1] + lift, hit[2])


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
    # Use the largest face to find which way the patch winds (a disc has a degenerate first row).
    def face_normal(q):
        a, b, c = (verts[i] for i in q[:3])
        return ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
                (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
                (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    n = max((face_normal(q) for q in quads), key=lambda v: abs(v[0]) + abs(v[1]) + abs(v[2]))
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


def disc_rows(cx, ch, rings, point):
    """Rows of 17 points round (cx, ch): rings is a list of (radius, offset); point maps (x, h, offset)."""
    return [[point(cx + math.cos(a) * r, ch + math.sin(a) * r, off) for a in [2 * math.pi * k / 16 for k in range(17)]]
            for r, off in rings]


# ---- headlamps: reflector tray, two projectors with chrome rings, an amber indicator end, a clear cover
PROJECTORS = ((.465, .668, .044), (.585, .695, .05))
for side in (-1, 1):
    pt = lambda x, h, off: (side * x, h, lamp_z(x, h, off))
    tray_x = [.37 + .275 * i / 12 for i in range(13)]
    build_patch('Headlamp reflector', [[pt(x, h, .004) for x, h in row] for row in grid_in_x(tray_x, LENS_LOW, LENS_HIGH, 3)], SILVER, (0, 0, 1))
    amber_x = [.648 + .034 * i / 3 for i in range(4)]
    build_patch('Headlamp indicator', [[pt(x, h, .008) for x, h in row] for row in grid_in_x(amber_x, LENS_LOW, LENS_HIGH, 2)], AMBER, (0, 0, 1))
    for cx, ch, r in PROJECTORS:
        build_patch('Projector socket', disc_rows(cx, ch, [(0, .006), (r * .5, .006), (r, .006)], pt), TRIM, (0, 0, 1))
        build_patch('Projector ring', disc_rows(cx, ch, [(r * .66, .012), (r * .86, .012)], pt), SILVER, (0, 0, 1))
        build_patch('Projector lens', disc_rows(cx, ch, [(0, .019), (r * .3, .018), (r * .6, .014)], pt), LENS, (0, 0, 1))
    build_patch('Headlamp cover', COVER_DATA[side], COVER, (0, 0, 1))
    # Round fog lamp and the indicator pod above the corner duct.
    fx, fh = .485, .455
    nose = lambda x, h, off: on_nose(side * x, h, off)
    build_patch('Fog lamp seat', disc_rows(fx, fh, [(0, .002), (.03, .002), (.058, .002)], nose), TRIM, (0, 0, 1))
    build_patch('Fog lamp ring', disc_rows(fx, fh, [(.044, .008), (.053, .008)], nose), SILVER, (0, 0, 1))
    build_patch('Fog lamp', disc_rows(fx, fh, [(0, .016), (.02, .015), (.04, .011)], nose), LENS, (0, 0, 1))
    pod_x = [.56 + .08 * i / 4 for i in range(5)]
    build_patch('Indicator seat', [[nose(x, h, .002) for x, h in row] for row in grid_in_x(pod_x, blend([(.55, .495)]), blend([(.55, .565)]), 2)], TRIM, (0, 0, 1))
    pod_x = [.568 + .064 * i / 4 for i in range(5)]
    build_patch('Indicator lamp', [[nose(x, h, .005) for x, h in row] for row in grid_in_x(pod_x, blend([(.55, .505)]), blend([(.55, .555)]), 2)], AMBER, (0, 0, 1))


# ---- rolled lips round the grille and duct openings
def rect_path(cx, ch, w, hh, rc, step=.06):
    corners = []
    for sx, sy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ccx, ccy = cx + sx * (w / 2 - rc), ch + sy * (hh / 2 - rc)
        corners.append([(ccx + rc * math.cos(math.radians(a0 + 90 * k / 4)), ccy + rc * math.sin(math.radians(a0 + 90 * k / 4))) for k in range(5)])
    path = []
    for i, arc in enumerate(corners):
        path.extend(arc)
        nxt = corners[(i + 1) % 4][0]
        gap = math.hypot(nxt[0] - arc[-1][0], nxt[1] - arc[-1][1])
        for k in range(1, int(gap / step)):
            t = k / int(gap / step)
            path.append((arc[-1][0] + (nxt[0] - arc[-1][0]) * t, arc[-1][1] + (nxt[1] - arc[-1][1]) * t))
    return path + path[:1]


for cx, ch, w, hh in ((0, .345, .69, .24), (0, .628, .63, .135), (-.525, .325, .24, .135), (.525, .325, .24, .135)):
    pts = [on_nose(x, h, .004) for x, h in rect_path(cx, ch, w, hh, .035)]
    if all(pts):
        extras.append(tube('Rolled lip', [(p[0], p[2], p[1]) for p in pts], .0105, PAINT, 4))

# ---- tail lamp sockets: empties the runtime reads to place the four lamps
for name, location, n in sockets:
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.location = location
    empty.rotation_euler = n.to_track_quat('Z', 'X').to_euler()
    bpy.context.collection.objects.link(empty)
    extras.append(empty)
    print('SOCKET', name, tuple(round(c, 4) for c in location), tuple(round(c, 4) for c in n))

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
