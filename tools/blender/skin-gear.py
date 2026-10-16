# Skin gear for Kestrel One (SKIN-ART-GEAR, docs/HELI_WILDLIFE.md section 12).
# Original models built from primitives; the recipe is the source. Metres,
# glTF +Y up, +Z forward (the helicopter's nose). Each file's origin is its
# mount point on Kestrel One, so the game fits it with no hand placement:
#   drop-sight         fire service: a belly sighting pod looking down      mount_belly
#   heat-camera        search and rescue: a ball turret with two windows    mount_belly
#   zoom-camera        wildlife: a long-lens camera pod                     mount_belly
#   nose-camera        TV: a stabilised camera ball under the chin          mount_nose
#   cargo-net          supply: a heavy hook and a loaded cargo net; origin at the
#                      top of the hook, where the cable meets it (like cargo-hook)
#   main-rotor-quiet   wildlife: the main rotor with swept, thinned tips; same pivot
#                      and spin axis as Kestrel One's main_rotor (origin at the hub)
# Mount points on Kestrel One (glTF metres, origin on the ground under the mast):
#   mount_nose (0, 1.08, 2.30), mount_belly (0, 0.74, 1.50), mount_side_right (-0.60, 1.55, 0.45);
# they are empties in tools/blender/kestrel-one.py, each on the body surface.
# Run: blender -b --factory-startup --python tools/blender/skin-gear.py -- --root . [--render DIR]
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
NAMES = ['drop-sight', 'heat-camera', 'zoom-camera', 'nose-camera', 'cargo-net', 'main-rotor-quiet']
OUT = root / 'public/assets/heli/gear'
BLEND = root / 'art-build/heli/gear'
if options.paths_only:
    print(json.dumps({'blend': [str(BLEND / f'{n}.blend') for n in NAMES], 'glb': [str(OUT / f'{n}.glb') for n in NAMES], 'json': []}))
    sys.exit(0)

import bpy
from mathutils import Vector

def material(name, colour, metal=0.0, rough=0.5, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 1.0
    return m

def mats():
    return {
        'grey': material('gear_grey', (0.20, 0.21, 0.22), 0.5, 0.45),
        'dark': material('gear_dark', (0.035, 0.035, 0.04), 0.4, 0.5),
        'steel': material('steel', (0.38, 0.38, 0.39), 1.0, 0.35),
        'glass': material('gear_window', (0.03, 0.05, 0.07), 0.2, 0.05),
        'germanium': material('heat_window', (0.12, 0.10, 0.06), 0.8, 0.15),
        'lens': material('lens_blue', (0.05, 0.08, 0.16), 0.3, 0.05),
        'white': material('gimbal_white', (0.78, 0.79, 0.78), 0.1, 0.4),
        'orange': material('net_orange', (0.62, 0.20, 0.02), 0.0, 0.8),
        'yellow': material('hook_yellow', (0.62, 0.45, 0.03), 0.3, 0.45),
        'cargo': material('cargo_tarp', (0.16, 0.20, 0.10), 0.0, 0.85),
        'blade': material('blade', (0.035, 0.036, 0.04), 0.2, 0.45),
        'tip': material('blade_tip', (0.6, 0.45, 0.02), 0.0, 0.4),
        'red': material('tally_red', (0.5, 0.0, 0.0), 0.0, 0.3, emit=(1.0, 0.05, 0.03)),
    }

def obj_prim(op, name, mat, **kw):
    op(**kw); ob = bpy.context.active_object; ob.name = name; ob.data.materials.append(mat); return ob

def box(name, mat, size, loc, rot=(0, 0, 0)):
    ob = obj_prim(bpy.ops.mesh.primitive_cube_add, name, mat, size=1, location=loc, rotation=rot)
    ob.scale = size; bpy.ops.object.transform_apply(scale=True); return ob

def cyl(name, mat, r, depth, loc, rot=(0, 0, 0), verts=20):
    return obj_prim(bpy.ops.mesh.primitive_cylinder_add, name, mat, radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)

def sphere(name, mat, r, loc, seg=24, rings=12):
    return obj_prim(bpy.ops.mesh.primitive_uv_sphere_add, name, mat, radius=r, location=loc, segments=seg, ring_count=rings)

def tube(name, mat, points, radius, res=0):
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
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40)); return ob

R90 = math.radians(90)
# Blender Z-up; glTF +Z forward is Blender -Y. Everything hangs below its mount (-Z here).

def drop_sight(m):
    base = box('base', m['grey'], (0.16, 0.22, 0.03), (0, 0, -0.015))
    pod = cyl('pod', m['grey'], 0.07, 0.18, (0, -0.02, -0.12), (0, 0, 0))
    window = cyl('window', m['glass'], 0.055, 0.01, (0, -0.02, -0.215))
    reticle = obj_prim(bpy.ops.mesh.primitive_torus_add, 'reticle', m['red'], major_radius=0.03, minor_radius=0.004,
                       location=(0, -0.02, -0.222), major_segments=20, minor_segments=4)
    fin = box('fin', m['grey'], (0.01, 0.12, 0.06), (0, 0.06, -0.06))
    return join('drop-sight', [base, pod, window, reticle, fin])

def heat_camera(m):
    plate = cyl('plate', m['grey'], 0.10, 0.03, (0, 0, -0.015))
    stem = cyl('stem', m['dark'], 0.05, 0.08, (0, 0, -0.07))
    yoke = [box(f'yoke{s}', m['white'], (0.03, 0.08, 0.20), (s * 0.15, 0, -0.20)) for s in (-1, 1)]
    bridge = box('bridge', m['white'], (0.33, 0.08, 0.03), (0, 0, -0.11))
    ball = sphere('ball', m['white'], 0.135, (0, 0, -0.25))
    windows = [cyl(f'win{i}', mat, r, 0.02, (x, -0.13, -0.25), (R90, 0, 0)) for i, (x, r, mat) in
               enumerate([(-0.045, 0.045, m['germanium']), (0.055, 0.03, m['glass'])])]
    return join('heat-camera', [plate, stem, bridge, ball] + yoke + windows)

def zoom_camera(m):
    rail = box('rail', m['grey'], (0.08, 0.36, 0.03), (0, 0, -0.015))
    body = box('body', m['dark'], (0.12, 0.20, 0.11), (0, 0.04, -0.09))
    barrel = cyl('barrel', m['grey'], 0.055, 0.32, (0, -0.20, -0.09), (R90, 0, 0))
    hood = cyl('hood', m['dark'], 0.068, 0.08, (0, -0.39, -0.09), (R90, 0, 0))
    glass = cyl('glass', m['lens'], 0.05, 0.01, (0, -0.43, -0.09), (R90, 0, 0))
    rings = [cyl(f'ring{i}', m['dark'], 0.058, 0.015, (0, -0.10 - i * 0.09, -0.09), (R90, 0, 0)) for i in range(3)]
    return join('zoom-camera', [rail, body, barrel, hood, glass] + rings)

def nose_camera(m):
    mount = box('mount', m['dark'], (0.14, 0.14, 0.04), (0, 0, -0.02))
    stem = cyl('stem', m['dark'], 0.04, 0.10, (0, 0, -0.09))
    collar = cyl('collar', m['white'], 0.12, 0.05, (0, 0, -0.16))
    ball = sphere('ball', m['white'], 0.16, (0, 0, -0.30), seg=28, rings=14)
    window = cyl('window', m['lens'], 0.075, 0.02, (0, -0.155, -0.30), (R90, 0, 0))
    bezel = obj_prim(bpy.ops.mesh.primitive_torus_add, 'bezel', m['dark'], major_radius=0.08, minor_radius=0.01,
                     location=(0, -0.158, -0.30), rotation=(R90, 0, 0), major_segments=24, minor_segments=6)
    tally = sphere('tally', m['red'], 0.012, (0.09, -0.12, -0.21), seg=8, rings=4)
    return join('nose-camera', [mount, stem, collar, ball, window, bezel, tally])

def cargo_net(m):
    # Heavy hook at the origin, four lifting legs, and a loaded net bag 1.6 m below.
    shackle = obj_prim(bpy.ops.mesh.primitive_torus_add, 'shackle', m['steel'], major_radius=0.06, minor_radius=0.016,
                       location=(0, 0, -0.06), rotation=(R90, 0, 0), major_segments=16, minor_segments=6)
    housing = box('housing', m['yellow'], (0.16, 0.10, 0.22), (0, 0, -0.23))
    hook = tube('hook', m['steel'], [(0, 0, -0.34), (0, 0, -0.46), (0.06, 0, -0.52), (0.11, 0, -0.46), (0.10, 0, -0.40)], 0.022, 1)
    bag_top = -1.6
    # Each leg ends on the bag's shoulder, where the net's top ring is.
    legs = [tube(f'leg{i}', m['dark'], [(0.04, 0, -0.46), (x * 0.36, y * 0.35, bag_top - 0.17)], 0.012, 0)
            for i, (x, y) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)])]
    load = obj_prim(bpy.ops.mesh.primitive_uv_sphere_add, 'load', m['cargo'], radius=0.6, location=(0, 0, bag_top - 0.42), segments=16, ring_count=8)
    load.scale = (1.05, 1.0, 0.72); bpy.ops.object.transform_apply(scale=True)
    net = []
    for i in range(8):
        a = i * math.pi / 4
        net.append(tube(f'mer{i}', m['orange'], [(0.62 * math.cos(a) * math.sin(t), 0.6 * math.sin(a) * math.sin(t), bag_top - 0.42 + 0.46 * math.cos(t))
                                                  for t in [k * math.pi / 8 for k in range(1, 9)]], 0.012, 0))
    for k in range(1, 5):
        t = k * math.pi / 6
        net.append(tube(f'lat{k}', m['orange'], [(0.64 * math.sin(t) * math.cos(a), 0.62 * math.sin(t) * math.sin(a), bag_top - 0.42 + 0.47 * math.cos(t))
                                                 for a in [j * math.pi / 8 for j in range(17)]], 0.012, 0))
    return join('cargo-net', [shackle, housing, hook, load] + legs + net)

def rotor_quiet(m):
    # Two blades like Kestrel One's (radius 5 m, hub at the origin), the outer 0.7 m swept back and thinned.
    parts = []
    for k in (0, 1):
        sgn = 1 if k == 0 else -1
        inner = box(f'blade{k}', m['blade'], (4.15, 0.19, 0.035), (sgn * 2.23, 0, 0))
        tip = bpy.data.meshes.new(f'tip{k}')
        verts = [(4.30, -0.095, -0.016), (4.30, 0.095, -0.016), (5.0, 0.10, -0.012), (5.0, 0.03, -0.012),
                 (4.30, -0.095, 0.016), (4.30, 0.095, 0.016), (5.0, 0.10, 0.012), (5.0, 0.03, 0.012)]
        verts = [(sgn * x, sgn * y, z) for x, y, z in verts]
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        tip.from_pydata(verts, [], faces); tip.update()
        tob = bpy.data.objects.new(f'tip{k}', tip); bpy.context.scene.collection.objects.link(tob); tip.materials.append(m['tip'])
        if sgn < 0:
            bpy.ops.object.select_all(action='DESELECT'); tob.select_set(True); bpy.context.view_layer.objects.active = tob
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
        grip = box(f'grip{k}', m['steel'], (0.40, 0.14, 0.08), (sgn * 0.30, 0, 0))
        parts += [inner, tob, grip]
    hub = cyl('hub', m['steel'], 0.12, 0.16, (0, 0, 0), verts=16)
    cap = sphere('cap', m['steel'], 0.09, (0, 0, 0.09), seg=12, rings=6)
    return join('main-rotor-quiet', parts + [hub, cap])

BUILDERS = {'drop-sight': drop_sight, 'heat-camera': heat_camera, 'zoom-camera': zoom_camera,
            'nose-camera': nose_camera, 'cargo-net': cargo_net, 'main-rotor-quiet': rotor_quiet}
OUT.mkdir(parents=True, exist_ok=True); BLEND.mkdir(parents=True, exist_ok=True)
for name in NAMES:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    BUILDERS[name](mats())
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    print(f'skin-gear: {name} {tri} triangles'); assert tri <= 3000, f'{name} over budget: {tri}'
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND / f'{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    framing = {'drop-sight': 0.9, 'heat-camera': 1.1, 'zoom-camera': 1.3, 'nose-camera': 1.2, 'cargo-net': 5.0, 'main-rotor-quiet': 12.0}
    for name in NAMES:
        bpy.ops.wm.open_mainfile(filepath=str(BLEND / f'{name}.blend'))
        scene = bpy.context.scene
        pts = [o.matrix_world @ Vector(c) for o in scene.objects if o.type == 'MESH' for c in o.bound_box]
        centre = sum(pts, Vector()) / len(pts)
        world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.68, 1)
        sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.5
        s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s); s.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
        scene.render.engine = 'CYCLES'; scene.cycles.samples = 32; scene.cycles.device = 'CPU'; scene.cycles.use_denoising = True
        scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
        scene.render.resolution_x, scene.render.resolution_y = 600, 450; scene.view_settings.view_transform = 'AgX'
        cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); scene.camera = cam
        d = framing[name]
        cam.location = centre + Vector((d * 0.8, -d * 0.9, d * (0.25 if name != 'main-rotor-quiet' else 0.7)))
        cd.lens = 40; cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}.png'); bpy.ops.render.render(write_still=True)
