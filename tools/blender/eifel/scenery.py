"""Eifel Crown C4 scenery: the drystone field wall and the clipped hedge row.

blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/eifel/scenery.py -- --root .
Add --only drystone-wall (or hedge-row) to rebuild one piece.
Writes the runtime GLBs and the measured sizes (scenery.json), never a blend file.
Each piece is 4 m long, like the guardrail, and stands with its base on y = 0.
Blender axes: X along the piece, Y across it, Z up; glTF export turns this into Y up.
Everything is original shapes made from boxes and a displaced ring, with fixed
seeds, so the same recipe always gives the same files.
"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

# (High triangles, LOD triangles), from docs/courses/eifel-crown.md section 2.3.
BUDGETS = {'drystone-wall': (600, 200), 'hedge-row': (500, 200)}


def material(name, rgb, rough=1.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = 0
    # Matt stone and leaf: no sheen at a grazing angle, which would wash a long wall out to pale grey.
    p.inputs['Specular IOR Level'].default_value = 0
    return m


class Builder:
    """Collects vertices and quads, each quad with its material slot."""

    def __init__(self, materials):
        self.materials, self.verts, self.faces, self.slots = materials, [], [], []

    def quad(self, points, slot):
        base = len(self.verts)
        self.verts.extend(points)
        self.faces.append((base, base + 1, base + 2, base + 3))
        self.slots.append(slot)

    def box(self, centre, size, slot, yaw=0, roll=0, skip=()):
        """An upright box. `skip` names faces left out because nobody sees them:
        'bottom', 'back' (+Y side), 'front' (-Y side), 'left' or 'right' end."""
        cx, cy, cz = centre
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        cs, sn, cr, sr = math.cos(yaw), math.sin(yaw), math.cos(roll), math.sin(roll)

        def at(x, y, z):
            # Lean about the long axis (roll), then turn about the vertical (yaw).
            y, z = y * cr - z * sr, y * sr + z * cr
            return (cx + x * cs - y * sn, cy + x * sn + y * cs, cz + z)

        c = {(i, j, k): at(i * hx, j * hy, k * hz) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)}
        sides = {
            'top': [c[-1, -1, 1], c[1, -1, 1], c[1, 1, 1], c[-1, 1, 1]],
            'bottom': [c[-1, 1, -1], c[1, 1, -1], c[1, -1, -1], c[-1, -1, -1]],
            'front': [c[-1, -1, -1], c[1, -1, -1], c[1, -1, 1], c[-1, -1, 1]],
            'back': [c[1, 1, -1], c[-1, 1, -1], c[-1, 1, 1], c[1, 1, 1]],
            'left': [c[-1, 1, -1], c[-1, -1, -1], c[-1, -1, 1], c[-1, 1, 1]],
            'right': [c[1, -1, -1], c[1, 1, -1], c[1, 1, 1], c[1, -1, 1]],
        }
        for name, points in sides.items():
            if name not in skip:
                self.quad(points, slot)

    def build(self, name, smooth=False):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        for m in self.materials:
            mesh.materials.append(m)
        for polygon, slot in zip(mesh.polygons, self.slots):
            polygon.material_index = slot
            polygon.use_smooth = smooth
        mesh.update()
        o = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(o)
        return o


def wall(low):
    """Dry-laid grey stone, a little wider at the foot, with upright cope stones on top.
    Grey-green greywacke with lichen and moss at the damp joints, as along the Eifel field edges."""
    rng = random.Random(1989 + low)
    # Linear colours: the grey of wet greywacke under an overcast sky reads as a mid-dark grey.
    stones = [material('wall stone ' + str(i), c) for i, c in enumerate([
        (.07, .073, .067), (.095, .095, .085), (.052, .057, .054), (.105, .10, .085)])]
    lichen = material('wall stone with lichen', (.08, .10, .065))
    moss = material('wall moss', (.035, .065, .018))
    earth = material('wall hearting', (.03, .03, .028))
    cope = material('wall cope stone', (.08, .083, .077))
    b = Builder(stones + [lichen, moss, earth, cope])
    LICHEN, MOSS, EARTH, COPE = 4, 5, 6, 7
    foot, top_depth, height = .56, .40, 1.02
    # The hearting between the faces: a tapering block the stones stand against.
    h = height / 2
    half_foot, half_top = foot / 2 - .035, top_depth / 2 - .02
    corners = {(sx, sy, sz): (sx * 2, sy * (half_top if sz > 0 else half_foot), sz * h + h)
               for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)}
    for pts in ([(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)], [(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)],
                [(1, 1, -1), (-1, 1, -1), (-1, 1, 1), (1, 1, 1)], [(-1, 1, -1), (-1, -1, -1), (-1, -1, 1), (-1, 1, 1)],
                [(1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)]):
        b.quad([corners[p] for p in pts], EARTH)
    courses = 3 if low else 5
    per_course = 2 if low else 5
    course_height = height / courses
    for face in (-1, 1):
        for r in range(courses):
            # Each course is shorter and set in a little, so the face leans back like a real batter.
            depth_here = (foot - (foot - top_depth) * (r + .5) / courses) / 2
            x = -2.0
            while x < 2.0 - .05:
                width = (4.0 / per_course) * rng.uniform(.55, 1.45)
                width = min(width, 2.0 - x)
                if 2.0 - (x + width) < .22:
                    width = 2.0 - x
                kind = rng.random()
                slot = (LICHEN if kind < .12 else MOSS if kind < .17 and r < 2 else rng.randrange(4))
                tall = course_height * rng.uniform(.7, 1.12)
                thick = rng.uniform(.10, .19)
                proud = rng.uniform(-.03, .05)
                lift = rng.uniform(-.015, .035)
                b.box((x + width / 2, face * (depth_here - thick / 2 + proud), r * course_height + tall / 2 + lift),
                      (width - .05, thick, tall - .045), slot, yaw=rng.uniform(-.03, .03),
                      skip=('bottom', 'back' if face < 0 else 'front'))
                x += width
    # Cope stones standing on edge along the top.
    count = 3 if low else 8
    for i in range(count):
        width = 4.0 / count
        tall = rng.uniform(.14, .30)
        b.box((-2 + width * (i + .5), 0, height + tall / 2 - .02),
              (width - .03, top_depth + rng.uniform(.0, .06), tall), COPE if i % 3 else rng.randrange(4),
              yaw=rng.uniform(-.03, .03), skip=('bottom',))
    return b.build('drystone-wall')


def hedge(low):
    """A clipped boundary hedge: a rounded green mass, 4 m long, lumpy with leaf, on short dark stems."""
    rng = random.Random(7 + low)
    greens = [material('hedge leaf ' + str(i), c) for i, c in enumerate([
        (.024, .048, .015), (.028, .055, .017), (.021, .043, .013), (.032, .06, .019)])]
    brown = material('hedge dry leaf', (.05, .038, .016))
    b = Builder(greens + [brown])
    BROWN = 4
    ring = [(-.36, 0), (-.40, .35), (-.42, .85), (-.39, 1.30), (-.29, 1.60), (-.11, 1.74),
            (.11, 1.74), (.29, 1.60), (.39, 1.30), (.42, .85), (.40, .35), (.36, 0)]
    if low:
        ring = [(-.36, 0), (-.42, .80), (-.32, 1.45), (-.10, 1.72), (.10, 1.72), (.32, 1.45), (.42, .80), (.36, 0)]
    segments = 6 if low else 15
    grid = []
    for i in range(segments + 1):
        x = -2 + 4 * i / segments
        row = []
        for j, (z0, y0) in enumerate(ring):
            # Lumps of leaf: pushed out and in along the ring, never at the base, and nothing at the two ends
            # so a row of pieces meets without a gap.
            end = 0 if i in (0, segments) else 1
            bump = 0 if y0 == 0 else rng.uniform(-.05, .06) * end
            lean = Vector((z0, y0 - .9)).normalized() if abs(z0) + abs(y0 - .9) else Vector((0, 1))
            row.append((x, z0 + lean.x * bump, y0 + lean.y * bump))
        grid.append(row)
    n = len(ring)
    for i in range(segments):
        for j in range(n - 1):
            a, c = grid[i][j], grid[i][j + 1]
            d, e = grid[i + 1][j], grid[i + 1][j + 1]
            slot = BROWN if rng.random() < .03 else rng.randrange(4)
            b.quad([(a[0], a[1], a[2]), (d[0], d[1], d[2]), (e[0], e[1], e[2]), (c[0], c[1], c[2])], slot)
    # End caps close the mass (a hedge ends somewhere); drawn as fans of quads.
    for i, flip in ((0, True), (segments, False)):
        row = grid[i]
        half = (n - 1) // 2
        for j in range(half):
            lo, hi = row[j], row[n - 1 - j]
            lo2, hi2 = row[j + 1], row[n - 2 - j]
            pts = [lo, hi, hi2, lo2] if not flip else [lo, lo2, hi2, hi]
            b.quad(pts, rng.randrange(4))
    return b.build('hedge-row', smooth=True)


MAKERS = {'drystone-wall': wall, 'hedge-row': hedge}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--only', nargs='+', choices=list(BUDGETS))
    args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    root = args.root.resolve()
    runtime = root / 'public/assets/models/circuits/kits'
    measured_path = root / 'tools/blender/eifel/scenery.json'
    existing = {m['id']: m for m in json.loads(measured_path.read_text(encoding='utf-8'))['models']} \
        if measured_path.exists() else {}
    records = []
    for id, caps in BUDGETS.items():
        if args.only and id not in args.only:
            records.append(existing[id])
            continue
        record = {'id': id, 'budget': caps, 'files': []}
        for low in (False, True):
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
            for m in list(bpy.data.materials):
                bpy.data.materials.remove(m)
            o = MAKERS[id](int(low))
            bpy.context.view_layer.objects.active = o
            o.name = id
            bpy.context.view_layer.update()
            o.data.calc_loop_triangles()
            tris = len(o.data.loop_triangles)
            if tris > caps[int(low)]:
                raise ValueError(f'{id}: {tris} triangles exceed {caps[int(low)]}')
            points = [o.matrix_world @ Vector(v) for v in o.bound_box]
            lows = [min(v[i] for v in points) for i in range(3)]
            # Stand on y = 0 (Blender z), centred along x and across y.
            o.location = (-(max(v[0] for v in points) + lows[0]) / 2,
                          -(max(v[1] for v in points) + lows[1]) / 2, -lows[2])
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
            points = [o.matrix_world @ Vector(v) for v in o.bound_box]
            size = [max(v[i] for v in points) - min(v[i] for v in points) for i in (0, 2, 1)]
            path = runtime / (id + ('-lod' if low else '') + '.glb')
            bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True,
                                      export_cameras=False, export_lights=False, export_animations=False)
            record['files'].append({'path': path.name, 'triangles': tris, 'size': [round(v, 3) for v in size],
                                    'bytes': path.stat().st_size,
                                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        records.append(record)
    measured_path.write_text(json.dumps({
        'card': 'EIFEL-CROWN-C4', 'round': 1, 'units': 'metres', 'up': 'Y',
        'source': 'Original shapes made by tools/blender/eifel/scenery.py; no outside models or textures.',
        'models': records}, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(records))


main()
