# Rescue gear and scene props for H4 Rescue (RESCUE-PROPS, docs/HELI_RESCUE.md
# section 13). Original models built from primitives; the recipe is the source.
# Metres, glTF +Y up, +Z forward. One GLB per prop in public/assets/heli/rescue/:
#   winch        side hoist; origin where it bolts to the fuselage, the arm
#                reaches out along +X; empty `line_out` where the line leaves
#   stretcher    rescue litter; origin at the `harness` point where its four
#                lift straps meet (it hangs from the line); the litter 1.2 m below
#   searchlight  belly light; origin at its mount; empty `beam` points down
#                and forward
#   beacon       avalanche transceiver; origin at its centre
#   crate-food, crate-medicine, crate-fuel  origin at the top centre (like the
#                H1 crate); the medicine cross is green (the red cross emblem is
#                protected)
# Run: blender -b --factory-startup --python tools/blender/rescue-props.py -- --root . [--render DIR]
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
NAMES = ['winch', 'stretcher', 'searchlight', 'beacon', 'crate-food', 'crate-medicine', 'crate-fuel']
OUT = root / 'public/assets/heli/rescue'
BLEND = root / 'art-build/heli/rescue'
if options.paths_only:
    print(json.dumps({'blend': [str(BLEND / f'{n}.blend') for n in NAMES], 'glb': [str(OUT / f'{n}.glb') for n in NAMES], 'json': []}))
    sys.exit(0)

import bpy, bmesh, random
from mathutils import Vector, Matrix, noise

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, colour, metal=0.0, rough=0.5, emit=None, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 1.5
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    return m

def mats():
    return {
        'steel': material('steel', (0.32, 0.33, 0.34), 1.0, 0.42),
        'dark': material('dark_steel', (0.06, 0.06, 0.065), 0.6, 0.5),
        'yellow': material('hoist_yellow', (0.62, 0.42, 0.02), 0.2, 0.45),
        'orange': material('rescue_orange', (0.70, 0.17, 0.02), 0.0, 0.55),
        'strap': material('strap_black', (0.02, 0.02, 0.02), 0.0, 0.8),
        'red_strap': material('strap_red', (0.45, 0.03, 0.02), 0.0, 0.7),
        'glass': material('lens', (0.85, 0.85, 0.8), 0.0, 0.05, emit=(1.0, 0.95, 0.8)),
        'wood': material('crate_wood', (0.33, 0.21, 0.11), 0.0, 0.85),
        'wood_dark': material('crate_wood_dark', (0.18, 0.11, 0.06), 0.0, 0.9),
        'white': material('medical_white', (0.82, 0.83, 0.82), 0.0, 0.5),
        'green': material('medical_green', (0.02, 0.36, 0.12), 0.0, 0.5),
        'drum': material('drum_blue', (0.05, 0.14, 0.32), 0.4, 0.5),
        'drum_red': material('drum_red', (0.42, 0.05, 0.03), 0.4, 0.5),
        'stencil': material('stencil_black', (0.015, 0.015, 0.015), 0.0, 0.7),
        'plastic': material('beacon_plastic', (0.75, 0.55, 0.02), 0.0, 0.4),
        'screen': material('beacon_screen', (0.05, 0.10, 0.08), 0.0, 0.2, emit=(0.2, 0.9, 0.4)),
    }

def box(name, mat, size, loc, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2
        bpy.ops.object.modifier_apply(modifier='bevel')
    return ob

def cyl(name, mat, r, depth, loc, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object; ob.name = name; ob.data.materials.append(mat); return ob

def tube(name, mat, points, radius, res=1):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = res; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points): p.co = (*co, 1)
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat); return ob

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]; bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name; return ob

def text(name, body, size, loc, rot, mat):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = 0.003
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat); return ob

def empty(name, loc, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = rot
    bpy.context.scene.collection.objects.link(e); return e

def smooth(ob, angle=40):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

# Blender is Z-up and the exporter maps Blender -Y to glTF +Z: "forward" is -Y here, "up" is +Z.

def build_winch(m):
    plate = box('plate', m['dark'], (0.06, 0.32, 0.42), (0.03, 0, 0), bevel=0.01)
    bolts = [cyl(f'bolt{i}', m['steel'], 0.018, 0.02, (0.065, y, z), (0, math.radians(90), 0), 8)
             for i, (y, z) in enumerate([(-0.12, -0.16), (0.12, -0.16), (-0.12, 0.16), (0.12, 0.16)])]
    arm = tube('arm', m['yellow'], [(0.06, 0, 0.10), (0.45, 0, 0.32), (0.92, 0, 0.36)], 0.045, 2)
    brace = tube('brace', m['yellow'], [(0.06, 0, -0.14), (0.62, 0, 0.30)], 0.03, 1)
    drum_house = cyl('drum_house', m['yellow'], 0.11, 0.30, (0.92, 0, 0.28), (math.radians(90), 0, 0), 20)
    caps = [cyl(f'cap{s}', m['dark'], 0.115, 0.03, (0.92, s * 0.16, 0.28), (math.radians(90), 0, 0), 20) for s in (-1, 1)]
    motor = cyl('motor', m['dark'], 0.07, 0.22, (0.92, 0.27, 0.28), (math.radians(90), 0, 0), 16)
    pulley = cyl('pulley', m['steel'], 0.05, 0.03, (0.98, 0, 0.12), (math.radians(90), 0, 0), 16)
    line = tube('line_stub', m['strap'], [(0.98, 0, 0.12), (0.98, 0, -0.10)], 0.006, 1)
    hook = tube('hook', m['steel'], [(0.98, 0, -0.10), (0.98, 0, -0.18), (1.03, 0, -0.22), (1.06, 0, -0.17)], 0.012, 1)
    body = join('winch', [plate, arm, brace, drum_house, motor, pulley, line, hook] + bolts + caps); smooth(body)
    empty('line_out', (0.98, 0, 0.12)).parent = body
    return body

def build_stretcher(m):
    # The litter hangs 1.2 m below the harness point at the origin.
    y0 = -1.2; L, W = 2.1, 0.62
    rail = [tube(f'rail{s}', m['steel'], [(s * W / 2, -L / 2, y0 + 0.18), (s * W / 2, L / 2, y0 + 0.18)], 0.016, 1) for s in (-1, 1)]
    ends = [tube(f'end{s}', m['steel'], [(-W / 2, s * L / 2, y0 + 0.18), (W / 2, s * L / 2, y0 + 0.18)], 0.016, 1) for s in (-1, 1)]
    # Basket shell: a shallow orange tub.
    bm = bmesh.new(); seg = 12
    rows = []
    for j in range(seg + 1):
        t = j / seg; yy = -L / 2 + L * t
        taper = 1 - 0.18 * abs(t - 0.5) * 2 if t < 0.2 else 1
        row = [bm.verts.new((x * W / 2 * taper, yy, y0 + z)) for x, z in [(-1, 0.18), (-0.92, 0.04), (-0.5, 0.0), (0.5, 0.0), (0.92, 0.04), (1, 0.18)]]
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for i in range(5): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    for row in (rows[0], rows[-1]): bm.faces.new(row)
    me = bpy.data.meshes.new('shell'); bm.to_mesh(me); bm.free()
    shell = bpy.data.objects.new('shell', me); bpy.context.scene.collection.objects.link(shell); me.materials.append(m['orange'])
    sol = shell.modifiers.new('t', 'SOLIDIFY'); sol.thickness = 0.01
    bpy.context.view_layer.objects.active = shell; bpy.ops.object.modifier_apply(modifier='t')
    ribs = [tube(f'rib{i}', m['steel'], [(-W / 2, -L / 2 + L * i / 5, y0 + 0.18), (-W * 0.46, -L / 2 + L * i / 5, y0 + 0.02),
                                        (W * 0.46, -L / 2 + L * i / 5, y0 + 0.02), (W / 2, -L / 2 + L * i / 5, y0 + 0.18)], 0.008, 1) for i in range(1, 5)]
    belts = [box(f'belt{i}', m['red_strap'], (W * 0.98, 0.07, 0.012), (0, yy, y0 + 0.17)) for i, yy in enumerate((-0.6, 0.0, 0.6))]
    straps = [tube(f'strap{i}', m['strap'], [(sx * W / 2, sy * (L / 2 - 0.15), y0 + 0.18), (0, 0, -0.02)], 0.009, 1)
              for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)])]
    ring = cyl('ring', m['steel'], 0.035, 0.015, (0, 0, 0), (math.radians(90), 0, 0), 12)
    body = join('stretcher', [shell] + rail + ends + ribs + belts + straps + [ring]); smooth(body)
    empty('harness', (0, 0, 0)).parent = body
    return body

def build_searchlight(m):
    mount = box('mount', m['dark'], (0.20, 0.20, 0.04), (0, 0, -0.02), bevel=0.008)
    yoke = [box(f'yoke{s}', m['dark'], (0.025, 0.06, 0.20), (s * 0.13, 0, -0.14)) for s in (-1, 1)]
    head = cyl('head', m['dark'], 0.11, 0.24, (0, 0, -0.22), (math.radians(-60), 0, 0), 24)
    # Lamp axis points down and forward: Blender (0, -sin30, -cos30)... pitched 60 degrees from straight down toward -Y.
    direction = Vector((0, -math.sin(math.radians(30)), -math.cos(math.radians(30))))
    lens = cyl('lens', m['glass'], 0.095, 0.02, Vector((0, 0, -0.22)) + direction * 0.12, (math.radians(-60), 0, 0), 24)
    rim = bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.012, location=Vector((0, 0, -0.22)) + direction * 0.125,
                                           rotation=(math.radians(-60), 0, 0), major_segments=24, minor_segments=6)
    rim = bpy.context.active_object; rim.data.materials.append(m['steel'])
    fins = [box(f'fin{i}', m['steel'], (0.18, 0.012, 0.05), Vector((0, 0, -0.22)) - direction * (0.06 + i * 0.03), (math.radians(-60), 0, 0)) for i in range(3)]
    body = join('searchlight', [mount, head, lens, rim] + yoke + fins); smooth(body)
    e = empty('beam', Vector((0, 0, -0.22)) + direction * 0.14)
    e.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler(); e.parent = body
    return body

def build_beacon(m):
    case = box('case', m['plastic'], (0.075, 0.03, 0.12), (0, 0, 0), bevel=0.012)
    screen = box('screen', m['screen'], (0.045, 0.004, 0.035), (0, -0.016, 0.025))
    buttons = [box(f'btn{i}', m['dark'], (0.014, 0.006, 0.01), (x, -0.016, -0.015)) for i, x in enumerate((-0.02, 0, 0.02))]
    antenna = cyl('antenna', m['dark'], 0.004, 0.06, (0.025, 0, 0.085), (0, 0, 0), 8)
    strap = tube('lanyard', m['red_strap'], [(-0.03, 0, 0.06), (-0.05, 0, 0.12), (-0.02, 0, 0.17)], 0.004, 1)
    body = join('beacon', [case, screen, antenna, strap] + buttons); smooth(body)
    return body

def build_crate(kind, m):
    W, D, H = (1.0, 0.8, 0.7) if kind != 'fuel' else (1.2, 1.0, 0.0)
    parts = []
    if kind == 'fuel':
        # A pallet of four fuel drums, strapped; origin at the top centre of the drums.
        H = 0.12 + 0.88
        parts.append(box('deck', m['wood'], (1.2, 1.0, 0.04), (0, 0, -H + 0.10)))
        for x in (-0.45, 0, 0.45): parts.append(box(f'runner{x}', m['wood_dark'], (0.10, 1.0, 0.08), (x, 0, -H + 0.04)))
        for i, (x, y) in enumerate([(-0.29, -0.24), (0.29, -0.24), (-0.29, 0.24), (0.29, 0.24)]):
            parts.append(cyl(f'drum{i}', m['drum'] if i % 3 else m['drum_red'], 0.28, 0.86, (x, y, -H + 0.12 + 0.43), (0, 0, 0), 16))
            for z in (0.28, 0.58): parts.append(cyl(f'hoop{i}{z}', m['dark'], 0.285, 0.025, (x, y, -H + 0.12 + z), (0, 0, 0), 16))
        # The ratchet strap hugs the four drums: around each drum's outer curve, straight between them.
        band = []
        for cx, cy, a0 in [(0.29, -0.24, -90), (0.29, 0.24, 0), (-0.29, 0.24, 90), (-0.29, -0.24, 180)]:
            for k in range(7):
                a = math.radians(a0 + k * 15)
                band.append((cx + 0.293 * math.cos(a), cy + 0.293 * math.sin(a), -0.35))
        band.append(band[0])
        parts.append(tube('band', m['strap'], band, 0.012, 0))
        body = join('crate-fuel', parts)
    else:
        top = 0.0
        shell = box('shell', m['wood'] if kind == 'food' else m['white'], (W, D, H), (0, 0, top - H / 2), bevel=0.01)
        parts.append(shell)
        if kind == 'food':
            for z in (-0.12, -0.35, -0.58): parts.append(box(f'slat{z}', m['wood_dark'], (W + 0.02, D + 0.02, 0.05), (0, 0, z)))
            for x in (-1, 1): parts.append(box(f'post{x}', m['wood_dark'], (0.06, D + 0.03, H + 0.02), (x * (W / 2 - 0.02), 0, -H / 2)))
            parts.append(text('stencil', 'FOOD', 0.16, (0, -D / 2 - 0.016, -H / 2), (math.radians(90), 0, 0), m['stencil']))
        else:
            for x in (-1, 1): parts.append(box(f'edge{x}', m['green'], (0.04, D + 0.02, H + 0.02), (x * W / 2, 0, -H / 2)))
            parts.append(box('cross_v', m['green'], (0.10, 0.012, 0.32), (0, -D / 2 - 0.008, -H / 2 + 0.03)))
            parts.append(box('cross_h', m['green'], (0.32, 0.010, 0.10), (0, -D / 2 - 0.0095, -H / 2 + 0.03)))  # proud of the upright, no shared face
            parts.append(text('stencil', 'MEDICAL', 0.07, (0, -D / 2 - 0.016, -H + 0.12), (math.radians(90), 0, 0), m['stencil']))
        for x in (-1, 1): parts.append(tube(f'strap{x}', m['red_strap'], [(x * 0.28, -D / 2 - 0.01, -H), (x * 0.28, -D / 2 - 0.01, 0.005), (x * 0.28, D / 2 + 0.01, 0.005), (x * 0.28, D / 2 + 0.01, -H)], 0.01, 0))
        parts.append(tube('lift', m['strap'], [(-0.28, -D / 2, 0.01), (0, 0, 0.5), (0.28, D / 2, 0.01)], 0.008, 0))
        body = join(f'crate-{kind}', parts)
    return body

BUILDERS = {'winch': build_winch, 'stretcher': build_stretcher, 'searchlight': build_searchlight, 'beacon': build_beacon,
            'crate-food': lambda m: build_crate('food', m),
            'crate-medicine': lambda m: build_crate('medicine', m), 'crate-fuel': lambda m: build_crate('fuel', m)}
LIMITS = {'crate-food': 1500, 'crate-medicine': 1500, 'crate-fuel': 1500}

def triangles():
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')

OUT.mkdir(parents=True, exist_ok=True); BLEND.mkdir(parents=True, exist_ok=True)
renders = []
for name in NAMES:
    reset(); m = mats(); BUILDERS[name](m)
    tri = triangles(); print(f'rescue-props: {name} {tri} triangles')
    assert tri <= LIMITS.get(name, 6000), f'{name} over budget: {tri}'
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND / f'{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

if options.render:
    # One review sheet: every prop on a plain floor, rendered one at a time.
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    framing = {'winch': (2.2, 0.4), 'stretcher': (4.5, -0.7), 'searchlight': (1.3, -0.2), 'beacon': (0.45, 0.0),
               'crate-food': (2.6, -0.3), 'crate-medicine': (2.6, -0.3), 'crate-fuel': (3.2, -0.5)}
    for name in NAMES:
        bpy.ops.wm.open_mainfile(filepath=str(BLEND / f'{name}.blend'))
        scene = bpy.context.scene
        dist, zc = framing[name]
        floor_z = min((o.matrix_world @ Vector(c)).z for o in scene.objects if o.type == 'MESH' for c in o.bound_box)
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, floor_z))
        g = bpy.context.active_object; gm = bpy.data.materials.new('ground'); gm.use_nodes = True
        gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.2, 0.2, 0.2, 1); g.data.materials.append(gm)
        world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.68, 1)
        sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.5
        s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s); s.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
        scene.render.engine = 'CYCLES'; scene.cycles.samples = 32; scene.cycles.device = 'CPU'; scene.cycles.use_denoising = True
        scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
        scene.render.resolution_x, scene.render.resolution_y = 600, 450; scene.view_settings.view_transform = 'AgX'
        cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); scene.camera = cam
        cam.location = (dist * 0.75, -dist * 0.85, zc + dist * 0.55); cd.lens = 40
        cam.rotation_euler = (Vector((0, 0, zc)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}.png'); bpy.ops.render.render(write_still=True)
