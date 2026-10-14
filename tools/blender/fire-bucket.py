# Fire bucket for Kestrel One (HELI-FIRE-BUCKET, docs/HELI_FIRE.md section
# 14). A collapsible firefighting bucket like the ones light helicopters
# carry: orange fabric with black wear bands and straps, a steel rim, four
# rigging lines up to a top ring, and a release valve at the bottom. Built
# from primitives; the recipe is the source.
#
# Contract (glTF): metres, +Y up, origin at the top ring where the cable hook
# meets it. About 1.1 m across, body 1.3 m tall, rigging 2.5 m. Nodes:
#   bucket         - fabric body, rim and straps
#   rigging        - four lines and the top ring
#   valve          - release valve under the floor (pivot at the floor)
#   water          - water surface disc at the rim; the game moves it by fill
#   bucket_dented  - the same body crumpled; the game hides it until the
#                    bucket is dented, torn or ruined (glTF has no hidden flag)
# At most 3,000 triangles. Run:
#   blender -b --factory-startup --python tools/blender/fire-bucket.py -- --root . [--render DIR]
import argparse, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/heli/fire-bucket.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='', help='folder for the review renders')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / options.out
NATIVE = root / 'art-build/heli/fire-bucket.blend'
if options.paths_only:
    import json
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

import bpy, bmesh
from mathutils import Vector, Matrix, noise

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def material(name, colour, metal=0.0, rough=0.5, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    return m

FABRIC = material('fabric_orange', (0.62, 0.13, 0.015), rough=0.75)   # faded safety orange
BAND = material('fabric_black', (0.02, 0.02, 0.02), rough=0.8)
STEEL = material('steel', (0.40, 0.40, 0.41), metal=1.0, rough=0.4)
LINE = material('line', (0.10, 0.10, 0.10), metal=0.5, rough=0.5)
WATER = material('water', (0.05, 0.10, 0.12), rough=0.05, alpha=0.75)

RIM_Z = -2.50                 # rigging length: top ring to rim (Blender Z, exported as glTF Y)
DEPTH = 1.30
R_TOP, R_BOTTOM = 0.55, 0.43
SEG, RINGS = 20, 8

def obj_from_bm(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob

def tube(name, mat, points, radius, res=0):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = res; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    ob = bpy.data.objects.new(name, cu); scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat)
    return ob

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name
    return ob

def smooth(ob, angle=50):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

def shell_radius(t):
    """Tapered body with a slight cloth bulge between rim and floor."""
    return R_TOP + (R_BOTTOM - R_TOP) * t + 0.02 * math.sin(t * math.pi * 2) ** 2

def body(name, dent=0.0, seed=0):
    """The fabric body with rim and straps. dent > 0 crumples it."""
    bm = bmesh.new()
    rings = []
    for j in range(RINGS + 1):
        t = j / RINGS
        ring = []
        for i in range(SEG):
            a = 2 * math.pi * i / SEG
            r = shell_radius(t)
            z = RIM_Z - DEPTH * t
            if dent:
                # Crumpled: a caved side, a sagging floor edge and wrinkles.
                cave = max(0.0, math.cos(a - 0.6)) ** 2 * math.sin(t * math.pi)
                r *= 1 - dent * (0.35 * cave + 0.08 * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, t * 5 + seed))))
                z += dent * 0.10 * math.sin(a * 3 + seed) * t
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append((t, ring))
    for (t0, a_ring), (t1, b_ring) in zip(rings, rings[1:]):
        dark = (t0 + t1) / 2 > 0.78 or (t0 + t1) / 2 < 0.07    # dark collar and wear bottom
        for i in range(SEG):
            f = bm.faces.new((a_ring[i], a_ring[(i + 1) % SEG], b_ring[(i + 1) % SEG], b_ring[i]))
            f.material_index = 1 if dark else 0
    floor = rings[-1][1]
    hole = [bm.verts.new((0.13 * math.cos(2 * math.pi * i / SEG), 0.13 * math.sin(2 * math.pi * i / SEG),
                          floor[0].co.z - 0.03)) for i in range(SEG)]
    for i in range(SEG):
        f = bm.faces.new((floor[i], floor[(i + 1) % SEG], hole[(i + 1) % SEG], hole[i])); f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    shell = obj_from_bm(name + '_shell', bm, [FABRIC, BAND])
    sol = shell.modifiers.new('thickness', 'SOLIDIFY'); sol.thickness = 0.012
    bpy.context.view_layer.objects.active = shell; bpy.ops.object.modifier_apply(modifier='thickness')
    # The steel rim keeps its shape even when the body is crumpled.
    rim = tube(name + '_rim', STEEL, [(R_TOP * math.cos(a), R_TOP * math.sin(a), RIM_Z)
                                      for a in [2 * math.pi * i / 24 for i in range(25)]], 0.02)
    straps = []
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        pts = []
        for i in range(9):
            t = i / 8
            r = shell_radius(t) + 0.02
            if dent:
                cave = max(0.0, math.cos(a - 0.6)) ** 2 * math.sin(t * math.pi)
                r *= 1 - dent * 0.35 * cave
            pts.append((r * math.cos(a), r * math.sin(a), RIM_Z - DEPTH * t))
        straps.append(tube(f'{name}_strap_{k}', BAND, pts, 0.012))
    ob = join(name, [shell, rim] + straps)
    smooth(ob)
    return ob

bucket = body('bucket')
dented = body('bucket_dented', dent=1.0, seed=3)

# Rigging: four lines from the strap tops to a steel top ring at the origin.
line_parts = [tube(f'line_{k}', LINE, [(R_TOP * math.cos(a), R_TOP * math.sin(a), RIM_Z + 0.01),
                                       (0.04 * math.cos(a), 0.04 * math.sin(a), -0.06)], 0.007)
              for k, a in enumerate([math.pi / 4 + k * math.pi / 2 for k in range(4)])]
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.014, major_segments=12, minor_segments=6,
                                 location=(0, 0, -0.03), rotation=(math.radians(90), 0, 0))
ring = bpy.context.active_object; ring.data.materials.append(STEEL)
rigging = join('rigging', line_parts + [ring])
smooth(rigging, 40)

# Release valve under the floor, pivot at the floor so the game can open it.
floor_z = RIM_Z - DEPTH - 0.03
bpy.ops.mesh.primitive_cone_add(radius1=0.22, radius2=0.15, depth=0.18, location=(0, 0, floor_z - 0.09), vertices=16)
skirt = bpy.context.active_object; skirt.data.materials.append(BAND)
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.05, location=(0, 0, floor_z - 0.2), vertices=10)
plug = bpy.context.active_object; plug.data.materials.append(STEEL)
valve = join('valve', [skirt, plug])
pivot = Vector((0, 0, floor_z))
valve.data.transform(Matrix.Translation(valve.location - pivot))
valve.location = pivot

bpy.ops.mesh.primitive_circle_add(radius=R_TOP - 0.02, vertices=SEG, fill_type='NGON', location=(0, 0, RIM_Z - 0.04))
water = bpy.context.active_object; water.name = 'water'; water.data.materials.append(WATER)

root_empty = bpy.data.objects.new('fire_bucket', None); scene.collection.objects.link(root_empty)
for ob in (bucket, dented, rigging, valve, water):
    ob.parent = root_empty
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in scene.objects if o.type == 'MESH')
print(f'fire-bucket: {tri} triangles')
assert tri <= 3000, f'over the 3,000 triangle budget: {tri}'

OUT.parent.mkdir(parents=True, exist_ok=True); NATIVE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
print(f'fire-bucket: wrote {OUT}')

if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    root_empty.location = (0, 0, 4.4)
    dented.location = (2.6, 0, 0)            # beside the clean one, for the sheet only
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    g = bpy.context.active_object; g.data.materials.append(material('grass', (0.05, 0.07, 0.03), rough=0.95))
    world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.55, 0.72, 1)
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0
    s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s)
    s.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 48; scene.cycles.device = 'CPU'
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = 1000, 700
    scene.view_settings.view_transform = 'AgX'
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    for name, (loc, target, lens) in {
        'side': ((5.6, -6.4, 3.6), (1.3, 0, 2.6), 40),
        'above': ((1.0, -2.2, 7.6), (0.6, 0, 1.6), 35),
    }.items():
        cam.location = loc; cam_data.lens = lens
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}.png')
        bpy.ops.render.render(write_still=True)
