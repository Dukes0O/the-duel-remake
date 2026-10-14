# Burnt forest props for H2 Fire (Claude's art): what a forest course looks
# like after a fire, and as it grows back. Built from primitives with seeded
# variation; the recipe is the source.
#
# One GLB, metres, glTF +Y up, every prop's origin at the centre of its base
# on the ground. Nodes (code instances them):
#   snag_tall, snag_broken, snag_leaning  - charred standing dead pines
#   log_fallen                            - a burnt trunk on the ground
#   stump                                 - a charred stump
#   shoots                                - stage 2: a clump of new green shoots
#   fireweed                              - stage 3: tall pink fireweed spikes
# Run: blender -b --factory-startup --python tools/blender/burnt-forest.py -- --root . [--render DIR]
import argparse, math, random, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/burnt/tremblant-woods/burnt-props.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / options.out
NATIVE = root / 'art-build/burnt/tremblant-woods/burnt-props.blend'
if options.paths_only:
    import json
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

import bpy, bmesh
from mathutils import Vector, Matrix, noise

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
rng = random.Random(2026)

def material(name, colour, rough=0.8, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 0.6
    return m

CHAR = material('char', (0.012, 0.011, 0.010), rough=0.55)          # glossy cracked charcoal          # charcoal bark
CHAR_GREY = material('char_grey', (0.045, 0.042, 0.040), rough=0.9)  # ash-grey where bark fell off
HEART = material('heartwood', (0.075, 0.04, 0.02), rough=0.9)        # scorched wood at breaks       # split wood at breaks
SHOOT = material('shoot', (0.04, 0.11, 0.022), rough=0.7)
STEM = material('fireweed_stem', (0.12, 0.05, 0.05), rough=0.7)
PETAL = material('fireweed_petal', (0.55, 0.07, 0.28), rough=0.6)    # fireweed magenta
LEAF = material('fireweed_leaf', (0.05, 0.12, 0.03), rough=0.7)

def obj_from_bm(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob

def trunk(bm, base, top, r0, r1, sides=10, rings=8, mats=(0, 1), seed=0, cut_angle=0.0):
    """A rough, tapered, slightly crooked trunk between two points, charred with
    grey patches. Returns the top ring's vertices."""
    axis = (top - base); length = axis.length; axis.normalize()
    side = axis.orthogonal().normalized(); up2 = axis.cross(side)
    prev = None
    for j in range(rings + 1):
        t = j / rings
        centre = base + axis * length * t
        centre += side * 0.04 * math.sin(t * 5 + seed) * length / 6
        r = r0 + (r1 - r0) * t
        ring = []
        for i in range(sides):
            a = 2 * math.pi * i / sides
            bump = (1 + 0.22 * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, t * 9 + seed)))
                    + 0.06 * math.sin(a * 7 + seed))   # rough char and bark ridges
            p = centre + (side * math.cos(a) + up2 * math.sin(a)) * r * bump
            if j == rings and cut_angle:
                p += axis * math.tan(cut_angle) * r * math.cos(a)   # jagged snapped top
            ring.append(bm.verts.new(p))
        if prev:
            for i in range(sides):
                f = bm.faces.new((prev[i], prev[(i + 1) % sides], ring[(i + 1) % sides], ring[i]))
                grey = noise.noise(Vector((i * 1.7, t * 11, seed))) > 0.42
                f.material_index = mats[1] if grey else mats[0]
        prev = ring
    return prev

def cap(bm, ring, mat_index):
    f = bm.faces.new(ring); f.material_index = mat_index
    return f

def branch_stubs(bm, base, axis, height, count, seed):
    r = random.Random(seed)
    for k in range(count):
        h = height * (0.35 + 0.6 * r.random())
        a = r.random() * 2 * math.pi
        start = base + axis * h
        out = Vector((math.cos(a), math.sin(a), -0.25 - 0.3 * r.random())).normalized()
        length = 0.4 + 0.9 * r.random() * (1 - h / height)
        ring = trunk(bm, start, start + out * length, 0.045, 0.012, sides=5, rings=2, seed=seed + k)
        cap(bm, ring, 0)

def snag(name, height, lean, snapped, seed):
    bm = bmesh.new()
    base = Vector((0, 0, -0.15))
    axis = Vector((math.sin(lean), 0, math.cos(lean))).normalized()
    top = base + axis * height
    ring = trunk(bm, base, top, 0.26, 0.05 if not snapped else 0.13, sides=12, rings=10, seed=seed,
                 cut_angle=math.radians(35) if snapped else 0.0)
    cap(bm, ring, 2 if snapped else 0)
    branch_stubs(bm, base, axis, height, 14 if not snapped else 7, seed)
    # Root flare: a few roots spreading into the ground.
    for k in range(5):
        a = k * 2 * math.pi / 5 + seed
        r = trunk(bm, Vector((0, 0, 0.25)), Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, -0.05)),
                  0.11, 0.04, sides=6, rings=2, seed=seed + k)
        cap(bm, r, 0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj_from_bm(name, bm, [CHAR, CHAR_GREY, HEART])

def log(name, seed):
    bm = bmesh.new()
    a = trunk(bm, Vector((-2.6, 0, 0.18)), Vector((2.4, 0.2, 0.14)), 0.22, 0.14, sides=10, rings=10, seed=seed)
    cap(bm, a, 2)
    branch_stubs(bm, Vector((-2.6, 0, 0.18)), Vector((1, 0.04, 0)).normalized(), 5.0, 5, seed)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = obj_from_bm(name, bm, [CHAR, CHAR_GREY, HEART])
    # The far end of the first ring lies open: close it.
    return ob

def stump(name, seed):
    bm = bmesh.new()
    ring = trunk(bm, Vector((0, 0, -0.1)), Vector((0, 0, 0.55)), 0.30, 0.25, sides=12, rings=4, seed=seed,
                 cut_angle=math.radians(38))
    centre = bm.verts.new(Vector((0.05, 0, 0.62)))   # burnt to a ragged point, not sawn
    for i in range(len(ring)):
        f = bm.faces.new((ring[i], ring[(i + 1) % len(ring)], centre)); f.material_index = 0
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        r = trunk(bm, Vector((0, 0, 0.15)), Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, -0.05)), 0.12, 0.04,
                  sides=6, rings=2, seed=seed + k)
        cap(bm, r, 0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj_from_bm(name, bm, [CHAR, CHAR_GREY, HEART])

def blade_clump(name, count, height, mats, seed, spike=False):
    """Crossed tapering blades for shoots; with spike, fireweed stems with pink flower spikes."""
    r = random.Random(seed)
    bm = bmesh.new()
    for k in range(count):
        a = r.random() * math.pi; d = r.random() * 0.45
        x, y = math.cos(r.random() * 6.28) * d, math.sin(r.random() * 6.28) * d
        h = height * (0.6 + 0.4 * r.random())
        w = r.uniform(0.012, 0.03) if not spike else 0.018
        dx, dy = math.cos(a) * w, math.sin(a) * w
        lean = Vector((r.uniform(-0.12, 0.12), r.uniform(-0.12, 0.12), 0)) * h
        v = [bm.verts.new((x - dx, y - dy, 0)), bm.verts.new((x + dx, y + dy, 0)),
             bm.verts.new(Vector((x + dx * 0.3, y + dy * 0.3, h)) + lean), bm.verts.new(Vector((x - dx * 0.3, y - dy * 0.3, h)) + lean)]
        f = bm.faces.new(v); f.material_index = 0
        if spike:
            # Leaves along the stem and a long magenta flower spike at the top.
            for j in range(3):
                t = 0.25 + 0.2 * j; c = Vector((x, y, h * t)) + lean * t
                la = r.random() * 6.28
                lv = [bm.verts.new(c), bm.verts.new(c + Vector((math.cos(la) * 0.16, math.sin(la) * 0.16, 0.05))),
                      bm.verts.new(c + Vector((math.cos(la + 0.3) * 0.08, math.sin(la + 0.3) * 0.08, 0.06)))]
                lf = bm.faces.new(lv); lf.material_index = 2
            top = Vector((x, y, h)) + lean
            for j in range(3):
                a2 = a + j * math.pi / 3
                sx, sy = math.cos(a2) * 0.045, math.sin(a2) * 0.045
                pv = [bm.verts.new(top + Vector((-sx, -sy, -0.30))), bm.verts.new(top + Vector((sx, sy, -0.30))),
                      bm.verts.new(top + Vector((sx * 0.3, sy * 0.3, 0.05))), bm.verts.new(top + Vector((-sx * 0.3, -sy * 0.3, 0.05)))]
                pf = bm.faces.new(pv); pf.material_index = 1
    ob = obj_from_bm(name, bm, mats)
    return ob

props = [
    snag('snag_tall', 9.5, math.radians(2), False, 1),
    snag('snag_broken', 5.0, math.radians(4), True, 2),
    snag('snag_leaning', 7.5, math.radians(14), False, 3),
    log('log_fallen', 4),
    stump('stump', 5),
    blade_clump('shoots', 44, 0.32, [SHOOT], 6),
    blade_clump('fireweed', 14, 1.3, [STEM, PETAL, LEAF], 7, spike=True),
]
for ob in props:
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(55))
    for m in ob.data.materials:
        if m.name.startswith(('shoot', 'fireweed')):
            m.use_backface_culling = False

tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in props)
print(f'burnt-forest: {tri} triangles')
assert tri <= 12000, tri
OUT.parent.mkdir(parents=True, exist_ok=True); NATIVE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
bpy.ops.object.select_all(action='DESELECT')
for ob in props:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
print(f'burnt-forest: wrote {OUT}')

if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    # A burnt slope: lay the props out the way a course would scatter them.
    spots = {'snag_tall': (-3, 3), 'snag_broken': (0.5, 4.5), 'snag_leaning': (3.5, 2.5), 'log_fallen': (0, 0.5),
             'stump': (-2.2, -0.8), 'shoots': (2.0, -1.2), 'fireweed': (-0.6, -2.2)}
    for ob in props:
        ob.location = (*spots[ob.name], 0)
    bpy.ops.mesh.primitive_plane_add(size=40)
    g = bpy.context.active_object; g.data.materials.append(material('ash_ground', (0.035, 0.032, 0.03), rough=1.0))
    world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.52, 0.48, 1)   # smoky sky
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.5
    s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s)
    s.rotation_euler = (math.radians(55), math.radians(5), math.radians(-30))
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 48; scene.cycles.device = 'CPU'
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = 1200, 700
    scene.view_settings.view_transform = 'AgX'
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    cam.location = (0.5, -10.5, 3.2); cam_data.lens = 32
    cam.rotation_euler = (Vector((0, 1.5, 2.6)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(folder / 'slope.png')
    bpy.ops.render.render(write_still=True)
