"""Kogane C4 round 2. Metric original props and reused armco finish.

blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/kogane/scenery.py -- --root .
To rebuild some models append --only, for example --only stone-retaining-wall stone-retaining-wall-b.
Writes runtime GLBs and measured settings only, never a blend file.
Blender axes: X across, -Y front, Z up. glTF converts to Y up.
"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

BUDGETS = {'armco-white': (156, 72), 'stone-retaining-wall': (600, 200),
           'stone-retaining-wall-b': (600, 200), 'stone-retaining-wall-c': (600, 200),
           'curve-mirror': (400, 150), 'chevron-board': (200, 100),
           'tea-house': (4500, 1400), 'vending-row': (1500, 500)}


def mat(name, rgb, rough=.85, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Emission Color'].default_value = (*rgb, 1)
    p.inputs['Emission Strength'].default_value = glow
    return m


def box(name, p, size, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m)
    return o


def cylinder(name, p, radius, depth, m, n=12, face=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=radius, depth=depth, location=p)
    o = bpy.context.object
    o.name = name
    if face:
        o.rotation_euler.x = math.pi / 2
    o.data.materials.append(m)
    return o


def polygon(name, vertices, faces, m):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(m)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o


# Retaining wall (KOGANE-WALL). Irregular fitted stones in the ishigaki manner: stone shapes come from a
# staggered, slightly sloping set of seed points (a Voronoi cut of the 4 m piece), so every stone is a
# different polygon. Each variant has its own seed. The picture on the stones (weathered grey, dark joints,
# moss patches near the top, the base and in the joints) is baked from the same cut, so the joints on the
# picture and the joints in the mesh agree. The footprint is the old one exactly: 4 x 2.54 x 0.796 m.
WALL_VARIANTS = {'stone-retaining-wall': 11, 'stone-retaining-wall-b': 29, 'stone-retaining-wall-c': 47}
WALL_W, WALL_H = 4.0, 2.44          # the stone face: 4 m wide, from the ground to under the coping
CORE_FRONT = -.36                   # the front of the core, where the stones sit
FRONT_MAX = .046                    # the deepest a stone stands out of the core (gives depth .796 with the coping)
TEX_TOP = 2.6                       # the picture is 2.6 m tall: the stone face plus a strip for the coping
ANISO = (.5, 1.0)                  # stones are wider than they are tall


def wall_seeds(seed):
    rnd = random.Random(seed)
    rows, z = [], 0
    while z < WALL_H - .25:
        h = rnd.uniform(.26, .6)
        if WALL_H - (z + h) < .3:
            h = WALL_H - z
        rows.append((z, h))
        z += h
    seeds = []
    phase = rnd.uniform(0, 6.28)
    for index, (z0, h) in enumerate(rows):
        slope = rnd.uniform(-.07, .07)
        x = -2 - rnd.uniform(.1, .6)
        while x < 2.5:
            width = rnd.choice([rnd.uniform(.35, .6), rnd.uniform(.5, .85), rnd.uniform(.6, 1.0), rnd.uniform(.7, 1.1), rnd.uniform(1.0, 1.7)])
            cx = x + width / 2
            # Courses run a little off level, as in a hand-fitted wall.
            seeds.append((cx, z0 + h / 2 + rnd.uniform(-.14, .14) * h + slope * cx + .08 * math.sin(cx * .8 + phase + index)))
            x += width
    return seeds


def clip_half(poly, n, c):
    """Keep the part of a convex polygon where n.p <= c."""
    out = []
    for i, a in enumerate(poly):
        b = poly[(i + 1) % len(poly)]
        da, db = n[0] * a[0] + n[1] * a[1] - c, n[0] * b[0] + n[1] * b[1] - c
        if da <= 0:
            out.append(a)
        if (da < 0 < db) or (db < 0 < da):
            t = da / (da - db)
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def wall_cells(seeds, joint):
    """One convex polygon per seed inside the 4 x 2.44 m face; the joints between stones are `joint` wide."""
    w2 = (ANISO[0] ** 2, ANISO[1] ** 2)
    cells = []
    for i, a in enumerate(seeds):
        poly = [(-WALL_W / 2, 0), (WALL_W / 2, 0), (WALL_W / 2, WALL_H), (-WALL_W / 2, WALL_H)]
        for j, b in enumerate(seeds):
            if i == j or (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 > 6:
                continue
            n = (w2[0] * (b[0] - a[0]), w2[1] * (b[1] - a[1]))
            length = math.hypot(*n)
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            poly = clip_half(poly, n, n[0] * mid[0] + n[1] * mid[1] - joint * length)
            if len(poly) < 3:
                break
        if len(poly) >= 3:
            # Drop corners closer than 6 cm so no stone has a needle edge.
            keep = [p for k, p in enumerate(poly) if math.hypot(p[0] - poly[k - 1][0], p[1] - poly[k - 1][1]) > .06]
            if len(keep) >= 3:
                cells.append((a, keep))
    return cells


def noise(rs, width, height, cx, cy):
    grid = rs.random_sample((cy + 2, cx + 2))
    ys, xs = np.linspace(0, cy, height), np.linspace(0, cx, width)
    yi, xi = ys.astype(int), xs.astype(int)
    fy, fx = ys - yi, xs - xi
    fy, fx = (fy * fy * (3 - 2 * fy))[:, None], (fx * fx * (3 - 2 * fx))[None, :]
    g = lambda dy, dx: grid[np.ix_(yi + dy, xi + dx)]
    return (g(0, 0) * (1 - fx) + g(0, 1) * fx) * (1 - fy) + (g(1, 0) * (1 - fx) + g(1, 1) * fx) * fy


def fbm(rs, width, height, cx, cy):
    total, amp, norm = 0, 1, 0
    for octave in range(4):
        total = total + amp * noise(rs, width, height, cx * 2 ** octave, cy * 2 ** octave)
        norm += amp
        amp *= .5
    return total / norm


def wall_picture(seeds, seed, width, height):
    """Baked colour picture of the whole piece: x across 4 m, v up 2.6 m (the top 16 cm strip is the coping)."""
    rs = np.random.RandomState(seed)
    xs = -2 + (np.arange(width) + .5) / width * WALL_W
    zs = (np.arange(height) + .5) / height * TEX_TOP
    gx, gz = np.meshgrid(xs, zs)
    sx, sz = np.array([s[0] for s in seeds]), np.array([s[1] for s in seeds])
    d2 = (ANISO[0] * (gx[..., None] - sx)) ** 2 + (ANISO[1] * (gz[..., None] - sz)) ** 2
    order = np.argsort(d2, axis=-1)
    a, b = order[..., 0], order[..., 1]
    da = np.take_along_axis(d2, a[..., None], -1)[..., 0]
    db = np.take_along_axis(d2, b[..., None], -1)[..., 0]
    nx, nz = ANISO[0] ** 2 * (sx[b] - sx[a]), ANISO[1] ** 2 * (sz[b] - sz[a])
    norm = np.hypot(nx, nz) + 1e-9
    edge = (db - da) / (2 * norm)                      # metres to the nearest joint line
    up = nz / norm                                     # +1: the edge above this stone
    rnd = np.random.RandomState(seed + 5)
    tone = rnd.uniform(.6, 1.45, len(seeds))[a]        # each stone its own grey
    warm = rnd.uniform(-1, 1, len(seeds))[a]
    grain = fbm(rs, width, height, 14, 9)
    speck = noise(rs, width, height, 90, 56)
    streak = noise(rs, width, height, 70, 3)           # long vertical weathering streaks
    base = .15 * tone * (.8 + .5 * grain) * (.9 + .2 * speck) * (.88 + .24 * streak)
    colour = np.stack([base * (1 + .07 * warm), base * (1 + .01 * warm), base * (1 - .06 * warm)], -1)
    # Light from above: the upper rim of each stone catches it, the lower rim is in shade.
    rim = np.clip(1 - edge / .07, 0, 1)
    colour = colour * (1 + .7 * rim * up)[..., None] * (1 + .35 * np.clip(edge / .22, 0, 1))[..., None]
    # Moss: damp patches, heavier near the coping, the foot of the wall and along the joints.
    damp = fbm(rs, width, height, 6, 4)
    wet = np.exp(-(WALL_H - gz) / .38) * .55 + np.exp(-gz / .3) * .5 + np.exp(-edge / .05) * .3
    moss = np.clip((damp + wet - .8) * 5, 0, 1) * (gz < WALL_H + .02)
    mossy = np.stack([.03 + .05 * damp, .075 + .09 * damp, .012 + .02 * damp], -1) * (.75 + .5 * speck)[..., None]
    colour = colour * (1 - moss[..., None] * .92) + mossy * moss[..., None] * .92
    # Dark mortar in the joints, then the coping strip on top.
    joint = np.clip((.02 + .014 * (speck - .5) - edge) / .012, 0, 1)
    colour = colour * (1 - joint[..., None]) + np.array([.018, .02, .017]) * joint[..., None]
    cap = gz >= WALL_H
    cap_grey = (.75 + .5 * grain)[..., None] * np.array([.2, .2, .19])
    cap_moss = np.clip((damp - .55) * 4, 0, 1)[..., None] * .5
    cap_colour = cap_grey * (1 - cap_moss) + np.array([.05, .1, .02]) * cap_moss
    colour = np.where(cap[..., None], cap_colour, colour)
    out = np.ones((height, width, 4))
    out[..., :3] = np.clip(colour, 0, 1)
    return out


def planar_uv(mesh):
    layer = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop in polygon.loop_indices:
            p = mesh.vertices[mesh.loops[loop].vertex_index].co
            layer.data[loop].uv = ((p.x + WALL_W / 2) / WALL_W, p.z / TEX_TOP)


def wall(low, seed=11):
    mortar = mat('dark volcanic mortar', (.045, .05, .042))
    stone = mat('weathered grey stone with moss', (.2, .2, .19), .92)
    pixels_w, pixels_h = (256, 160) if low else (512, 320)
    seeds = wall_seeds(seed)
    picture = bpy.data.images.new('ishigaki stone picture', width=pixels_w, height=pixels_h)
    picture.pixels.foreach_set(wall_picture(seeds, seed, pixels_w, pixels_h).astype(np.float32).ravel())
    picture.pack()
    nodes = stone.node_tree.nodes
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = picture
    stone.node_tree.links.new(texture.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])
    rnd = random.Random(seed + 1)
    verts, faces, materials = [], [], []

    def quad_box(x0, x1, y0, y1, z0, z1, m):
        base = len(verts)
        verts.extend([(x, y, z) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)])
        for f in [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]:
            faces.append(tuple(base + i for i in f))
            materials.append(m)

    # The core, then the coping: a few capstones of different length, the highest at exactly 2.54 m.
    quad_box(-2, 2, CORE_FRONT, -CORE_FRONT, 0, WALL_H, 0)
    if low:
        cuts = [-2, rnd.uniform(-.5, .5), 2]
    else:
        cuts = [-2, -.95 + rnd.uniform(-.25, .25), .05 + rnd.uniform(-.25, .25), 1.1 + rnd.uniform(-.25, .25), 2]
    for k in range(len(cuts) - 1):
        top = 2.54 if k == 0 else rnd.uniform(2.515, 2.54)
        front = -.39 if k == 1 else -rnd.uniform(.37, .39)
        back = .39 if k == 0 else rnd.uniform(.37, .39)
        quad_box(cuts[k] + (0 if k == 0 else .008), cuts[k + 1] - (0 if k == len(cuts) - 2 else .008),
                 front, back, WALL_H, top, 1)
    if low:
        # Far view: the stones are in the picture. One face at the full stone depth carries it.
        base = len(verts)
        y = CORE_FRONT - FRONT_MAX
        verts.extend([(-2, y, 0), (2, y, 0), (2, y, WALL_H), (-2, y, WALL_H)])
        faces.append(tuple(base + i for i in range(4)))
        materials.append(1)
    else:
        cells = wall_cells(seeds, .014)
        for cell, outline in cells:
            cx = sum(p[0] for p in outline) / len(outline)
            cz = sum(p[1] for p in outline) / len(outline)
            reach = rnd.uniform(.018, .042)
            tilt = (rnd.uniform(-.012, .012), rnd.uniform(-.012, .012))
            outer, inner = [], []
            for x, z in outline:
                outer.append(len(verts))
                verts.append((x, CORE_FRONT, z))
            for x, z in outline:
                # Pull the front face in a little from the joint; keep the piece edges and the ground where they are.
                dx, dz = x - cx, z - cz
                shrink = 1 - min(.3, .028 / max(.05, min(math.hypot(dx, dz), .3)))
                ix = x if abs(abs(x) - 2) < 1e-6 else cx + dx * shrink
                iz = z if (z < 1e-6 or abs(z - WALL_H) < 1e-6) else cz + dz * shrink
                depth = min(FRONT_MAX, max(.008, reach + tilt[0] * (ix - cx) + tilt[1] * (iz - cz)))
                inner.append(len(verts))
                verts.append((ix, CORE_FRONT - depth, iz))
            n = len(outline)
            faces.append(tuple(inner))
            materials.append(1)
            for i in range(n):
                j = (i + 1) % n
                # No side face on the ground line or under the coping; they are never seen.
                if (outline[i][1] < 1e-6 and outline[j][1] < 1e-6) or (abs(outline[i][1] - WALL_H) < 1e-6 and abs(outline[j][1] - WALL_H) < 1e-6):
                    continue
                faces.append((outer[i], outer[j], inner[j], inner[i]))
                materials.append(1)
        # The deepest point of the face is exactly 4.6 cm out of the core.
        front = min(range(len(verts)), key=lambda i: verts[i][1])
        verts[front] = (verts[front][0], CORE_FRONT - FRONT_MAX, verts[front][2])
    mesh = bpy.data.meshes.new('retaining wall')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mortar)
    mesh.materials.append(stone)
    mesh.update()
    for polygon, index in zip(mesh.polygons, materials):
        polygon.material_index = index
    planar_uv(mesh)
    o = bpy.data.objects.new('retaining wall', mesh)
    bpy.context.collection.objects.link(o)


def mirror(low):
    orange = mat('weathered safety orange', (.86, .22, .025), .6, .25)
    silver = mat('convex pale mirror face', (.42, .56, .60), .18, .9)
    dark = mat('mirror rear casing', (.12, .14, .14), .6)
    concrete = mat('mirror footing', (.3, .31, .28))
    n = 8 if low else 20
    cylinder('orange mirror pole', (0, 0, 1.75), .055, 3.5, orange, 6 if low else 10)
    box('footing', (0, 0, .12), (.28, .28, .24), concrete)
    cylinder('round orange rim', (0, -.03, 3.2), .48, .13, orange, n, True)
    cylinder('mirror back', (0, .055, 3.2), .43, .06, dark, n, True)
    # A shallow convex fan, not a flat disk, with a sky-tinted polished finish.
    vs = [(0, -.145, 3.2)] + [(.42*math.cos(i*math.tau/n), -.105, 3.2+.42*math.sin(i*math.tau/n)) for i in range(n)]
    polygon('convex glass', vs, [(0, 1+i, 1+(i+1)%n) for i in range(n)], silver)


def chevron(low):
    yellow = mat('reflective warm yellow', (.95, .67, .08), .45, .15)
    ink = mat('charcoal turn arrow', (.018, .025, .025))
    steel = mat('sign post', (.38, .40, .38), .65, .65)
    box('post', (0, 0, 1.05), (.065, .065, 2.1), steel)
    box('yellow curve board', (0, 0, 1.8), (1.1, .07, .85), yellow)
    # Arrow points left in front view and right in back view (KOGANE-PASS-C6): a board for a right-hand turn
    # is turned round so its back faces the road. Turning a board round alone never changes which way its arrow points.
    arrow = [(.35, 2.14), (0, 2.14), (-.38, 1.8), (0, 1.46), (.35, 1.46), (-.03, 1.8)]
    polygon('left chevron', [(x, -.036, z) for x, z in arrow], [(0, 1, 2, 5), (2, 3, 4, 5)], ink)
    polygon('right chevron (back)', [(x, .036, z) for x, z in arrow], [(5, 2, 1, 0), (5, 4, 3, 2)], ink)


def tea(low):
    timber = mat('aged dark cedar timber', (.17, .105, .06))
    plaster = mat('warm tea house plaster', (.54, .46, .32))
    roof = mat('grey ceramic roof', (.14, .17, .18), .72)
    glass = mat('warm shoji windows', (.96, .57, .22), .7, 0, .65)
    cloth = mat('indigo noren', (.055, .085, .15))
    stone = mat('tea house foundation', (.31, .32, .29))
    box('stone foundation', (0, 0, .18), (8, 6, .36), stone)
    box('plaster wall', (0, 0, 1.65), (7.5, 5.1, 2.6), plaster)
    box('deep timber veranda', (0, -2.8, .4), (8, 1.3, .22), timber)
    for x in [-3.65, -1.8, 0, 1.8, 3.65]:
        box('timber upright', (x, -2.65, 1.75), (.15, .18, 2.8), timber)
    for x in [-2.7, 2.7]:
        box('glowing shoji', (x, -2.56, 1.75), (1.55, .05, 1.65), glass)
        for d in [-.7, 0, .7]:
            box('shoji timber', (x+d, -2.61, 1.75), (.045, .035, 1.65), timber)
        for z in [1.2, 1.75, 2.3]:
            box('shoji crossbar', (x, -2.62, z), (1.55, .04, .035), timber)
    box('entrance recess', (0, -2.58, 1.45), (1.6, .06, 2.1), timber)
    for x in [-.57, 0, .57]:
        box('split noren curtain', (x, -2.95, 2.2), (.54, .035, .7), cloth)
    # A broad low roof with gently lifted eaves and a distinct ridge.
    for side in [-1, 1]:
        for a, b, za, zb in [(0, 2.4, 4.05, 3.02), (2.4, 3.65, 3.02, 2.92)]:
            polygon('sloping roof', [(-4.6, side*a, za), (4.6, side*a, za),
                (4.6, side*b, zb), (-4.6, side*b, zb),
                (-4.6, side*a, za-.12), (4.6, side*a, za-.12),
                (4.6, side*b, zb-.12), (-4.6, side*b, zb-.12)],
                [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], roof)
        if not low:
            for i in range(35):
                x = -4.45+i*.26
                for y, z, angle in [(side*1.2, 3.55, side*-.405), (side*3.03, 3, side*-.08)]:
                    o = box('raised tile seam', (x, y, z), (.035, 2.55 if abs(y)<2 else 1.3, .035), roof)
                    o.rotation_euler.x = angle
    box('roof ridge cap', (0, 0, 4.12), (9.4, .24, .18), roof)
    for x in [-3.8, 3.8]:
        box('veranda bench', (x, -3, .82), (1.15, .45, .12), timber)


def vending(low):
    dark = mat('vending dark recess', (.035, .05, .055))
    white = mat('vending enamel', (.75, .78, .74), .38, .25)
    red = mat('vending muted red enamel', (.5, .045, .025), .4, .2)
    glass = mat('vending illuminated display', (.66, .84, .85), .4, 0, 1.4)
    drinks = [mat('generic bottle '+str(i), c, .6, 0, .25) for i,c in enumerate([
        (.75,.22,.08),(.18,.48,.28),(.65,.57,.22),(.24,.44,.62)])]
    roof = mat('vending shelter roof', (.12,.15,.15))
    for i, x in enumerate([-1.24, 0, 1.24]):
        box('machine cabinet', (x, 0, 1.08), (1.17,.85,2.16), red if i==0 else white)
        box('lit display', (x-.12,-.435,1.4), (.79,.035,1.13), glass)
        box('dispensing slot', (x,-.45,.38), (.72,.04,.22), dark)
        box('payment panel', (x+.44,-.45,1.25), (.18,.04,.75), dark)
        for r in range(2 if low else 3):
            for col in range(4):
                box('unbranded product', (x-.4+col*.19,-.46,1.05+r*.30), (.10,.035,.19), drinks[(col+r+i)%4])
    box('shelter roof', (0,.04,2.5), (4.2,1.6,.13), roof)
    for x in [-1.95,1.95]:
        box('shelter post', (x,.45,1.25), (.09,.09,2.5), roof)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--only', nargs='+', choices=list(BUDGETS))
    args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    root = args.root.resolve()
    runtime = root/'public/assets/models/circuits/kits'
    records = []
    measured_path = root/'tools/blender/kogane/scenery.json'
    existing = {model['id']: model for model in json.loads(measured_path.read_text(encoding='utf-8'))['models']} if measured_path.exists() else {}
    for id, caps in BUDGETS.items():
        if args.only and id not in args.only:
            records.append(existing[id])
            continue
        record = {'id': id, 'budget': caps, 'files': []}
        for low in [False, True]:
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
            if id == 'armco-white':
                bpy.ops.import_scene.gltf(filepath=str(runtime/('armco'+('-lod' if low else '')+'.glb')))
                orange = mat('orange delineator reflectors', (1, .22, .015), .35, .1, .32)
                for o in bpy.context.scene.objects:
                    if o.type == 'MESH':
                        for slot in o.material_slots:
                            if 'fixing' in slot.material.name or 'rust' in slot.material.name:
                                slot.material = orange
                            else:
                                m = slot.material.copy()
                                m.name = 'white weathered armco'
                                m.diffuse_color = (.91,.92,.86,1)
                                m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = m.diffuse_color
                                m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .15
                                slot.material = m
                        if 'fixing' in o.name:
                            # Enlarge the donor's fixing faces into orange reflectors.
                            # Same topology and rail footprint; depth is unchanged.
                            centre = sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
                            for vertex in o.data.vertices:
                                vertex.co.x = centre.x + (vertex.co.x - centre.x) * 2.4
                                vertex.co.z = centre.z + (vertex.co.z - centre.z) * 2.4

            else:
                {'stone-retaining-wall':wall,
                 'stone-retaining-wall-b':lambda low:wall(low, WALL_VARIANTS['stone-retaining-wall-b']),
                 'stone-retaining-wall-c':lambda low:wall(low, WALL_VARIANTS['stone-retaining-wall-c']),
                 'curve-mirror':mirror,'chevron-board':chevron,
                 'tea-house':tea,'vending-row':vending}[id](low)
            objects = [o for o in bpy.context.scene.objects if o.type=='MESH']
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:
                o.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.join()
            o = bpy.context.object
            o.name = id
            bpy.context.view_layer.update()
            o.data.calc_loop_triangles()
            tris = len(o.data.loop_triangles)
            if tris > caps[int(low)]:
                raise ValueError(f'{id}: {tris} exceeds {caps[int(low)]}')
            points = [o.matrix_world @ Vector(v) for v in o.bound_box]
            size = [max(v[i] for v in points)-min(v[i] for v in points) for i in [0,2,1]]
            path = runtime/(id+('-lod' if low else '')+'.glb')
            # The stone pictures are exported as JPEG to keep each wall file small.
            bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True,
                export_cameras=False, export_lights=False, export_animations=False,
                export_image_format='JPEG' if id in WALL_VARIANTS else 'AUTO', export_jpeg_quality=82)
            record['files'].append({'path':path.name,'triangles':tris,'size':size,
                'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        records.append(record)
    (root/'tools/blender/kogane/scenery.json').write_text(json.dumps({
        'round':2,'units':'metres','up':'Y','source':'Original shapes; armco-white reuses current armco geometry.',
        'models':records},indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(records))


main()
