"""Kogane C4 round 2. Metric original props and reused armco finish.

blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/kogane/scenery.py -- --root .
For round 2 append --only armco-white stone-retaining-wall.
Writes runtime GLBs and measured settings only, never a blend file.
Blender axes: X across, -Y front, Z up. glTF converts to Y up.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

BUDGETS = {'armco-white': (156, 72), 'stone-retaining-wall': (600, 200),
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


def wall(low):
    mortar = mat('dark volcanic mortar', (.13, .15, .13))
    stone = [mat('mossy stone '+str(i), c) for i, c in enumerate([
        (.26, .29, .23), (.32, .33, .29), (.23, .27, .20), (.35, .35, .30)])]
    moss = mat('moss at damp joints', (.24, .36, .07))
    # Small baked colour tile: mineral flecks and irregular damp moss patches.
    # Kept inside the GLB, no runtime procedural shader or external texture.
    image = bpy.data.images.new('volcanic stone and moss', width=128, height=128)
    pixels = []
    for y in range(128):
        for x in range(128):
            noise = ((x * 73 + y * 179 + x * y * 13) % 127) / 127
            damp = math.sin(x * .12 + math.sin(y * .11)) + math.cos(y * .15)
            colour = (.22, .36, .07) if damp > .85 else (.52, .55, .46)
            pixels.extend([c * (.68 + noise * .5) for c in colour] + [1])
    image.pixels = pixels
    image.pack()
    for material in stone:
        nodes = material.node_tree.nodes
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        material.node_tree.links.new(texture.outputs['Color'],
                                    nodes.get('Principled BSDF').inputs['Base Color'])
    box('retaining core', (0, 0, 1.22), (4, .72, 2.44), mortar)
    rows, cols = (3, 4) if low else (5, 7)
    for r in range(rows):
        for c in range(cols + r % 2):
            w, h = 4 / (cols + r % 2), 2.4 / rows
            # Staggered diagonal-looking joints, subtle varied face depth.
            x = -2 + (c + .5) * w
            o = box('weathered stone', (x, -.32 - .018*((r+c)%3), (r+.5)*h),
                    (w-.045, .10, h-.045), stone[(r*3+c)%4])
            o.rotation_euler.y = .025 * ((r+c)%3-1)
    box('worn coping', (0, 0, 2.49), (4, .78, .10), stone[1])
    if not low:
        for i in range(7):
            box('moss seam', (-1.8+i*.55, -.385, .38+(i%4)*.48), (.25, .015, .065), moss)


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
    # Arrow points left in front view; placement rotation chooses the turn.
    polygon('left chevron', [(.35, -.036, 2.14), (0, -.036, 2.14),
            (-.38, -.036, 1.8), (0, -.036, 1.46), (.35, -.036, 1.46), (-.03, -.036, 1.8)],
            [(0, 1, 2, 5), (2, 3, 4, 5)], ink)


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
                {'stone-retaining-wall':wall,'curve-mirror':mirror,'chevron-board':chevron,
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
            bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True,
                export_cameras=False, export_lights=False, export_animations=False)
            record['files'].append({'path':path.name,'triangles':tris,'size':size,
                'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        records.append(record)
    (root/'tools/blender/kogane/scenery.json').write_text(json.dumps({
        'round':2,'units':'metres','up':'Y','source':'Original shapes; armco-white reuses current armco geometry.',
        'models':records},indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(records))


main()
