# Kestrel One: an original light two-seat helicopter (HELI-ART-SRC, Claude's
# candidate). Built from primitives so the recipe is the source: no donor
# mesh, no textures to license. Follows the model contract on the card
# docs/board/cards/HELI-ART-SRC.md: metres, glTF +Y up, nose toward +Z,
# origin on the ground under the main rotor mast, nodes body, main_rotor,
# tail_rotor, skids, instrument_panel and the empties cable_hook, pilot_eye,
# plus the gear mounts mount_nose, mount_belly and mount_side_right (SKIN-ART-GEAR
# part 2; the skin gear in tools/blender/skin-gear.py has its origin at these points).
#
# Blender is Z-up and the glTF exporter maps Blender -Y to glTF +Z, so the
# nose points along Blender -Y here. Run:
#   blender -b --factory-startup --python tools/blender/kestrel-one.py -- --root . [--render DIR]
import argparse, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/heli/kestrel-one.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='', help='folder for the four review renders')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / options.out
NATIVE = root / 'art-build/heli/kestrel-one.blend'
if options.paths_only:
    import json
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

import bpy, bmesh
from mathutils import Vector, Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- materials
def material(name, colour, metal=0.0, rough=0.5, alpha=1.0, coat=0.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 2.0
    return m

# Linear colours. A working livery: gloss white upper, deep navy lower,
# a signal-red pinstripe between, satin black rotor and trim.
PAINT = material('paint_white', (0.80, 0.80, 0.78), rough=0.28, coat=0.6)
NAVY = material('paint_navy', (0.018, 0.035, 0.085), rough=0.32, coat=0.6)
STRIPE = material('paint_red', (0.45, 0.025, 0.02), rough=0.3, coat=0.5)
GLASS = material('glass', (0.06, 0.08, 0.09), rough=0.04, alpha=0.32)
TRIM = material('trim_black', (0.02, 0.02, 0.022), rough=0.55)
BLADE = material('blade', (0.035, 0.036, 0.04), metal=0.2, rough=0.45)
TIP = material('blade_tip', (0.6, 0.45, 0.02), rough=0.4)
ALU = material('aluminium', (0.55, 0.56, 0.57), metal=1.0, rough=0.35)
STEEL = material('steel', (0.30, 0.30, 0.31), metal=1.0, rough=0.45)
CABIN = material('cabin_dark', (0.03, 0.03, 0.032), rough=0.8)
SEAT = material('seat', (0.06, 0.05, 0.045), rough=0.9)
PANEL = material('panel', (0.015, 0.015, 0.017), rough=0.6)
RED_L = material('nav_red', (0.5, 0.0, 0.0), rough=0.2, emit=(1.0, 0.02, 0.02))
GREEN_L = material('nav_green', (0.0, 0.4, 0.05), rough=0.2, emit=(0.02, 1.0, 0.1))
WHITE_L = material('nav_white', (0.8, 0.8, 0.8), rough=0.2, emit=(1.0, 1.0, 0.95))

# ---------------------------------------------------------------- helpers
def obj_from_bm(name, bm, mats):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob

def add(op, name, mat, **kw):
    op(**kw)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.clear(); ob.data.materials.append(mat)
    return ob

def box(name, mat, size, loc, rot=(0, 0, 0), bevel=0.0, segs=2):
    ob = add(bpy.ops.mesh.primitive_cube_add, name, mat, size=1, location=loc, rotation=rot)
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = segs
        mod.limit_method = 'ANGLE'
    return ob

def cyl(name, mat, r, depth, loc, rot=(0, 0, 0), verts=16, r2=None):
    if r2 is None:
        return add(bpy.ops.mesh.primitive_cylinder_add, name, mat, radius=r, depth=depth,
                   location=loc, rotation=rot, vertices=verts)
    return add(bpy.ops.mesh.primitive_cone_add, name, mat, radius1=r, radius2=r2, depth=depth,
               location=loc, rotation=rot, vertices=verts)

def tube(name, mat, points, radius):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    ob = bpy.data.objects.new(name, cu); scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat)
    return ob

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
        for m in o.modifiers:
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name
    return ob

def set_origin(ob, point):
    """Move the object's origin to a world point without moving the mesh."""
    offset = Vector(point) - ob.location
    ob.data.transform(Matrix.Translation(-offset))
    ob.location = Vector(point)

def smooth(ob, angle=40):
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

# ---------------------------------------------------------------- the cabin
# A teardrop: an egg stretched along the body, nose low and full, roof
# sweeping back into the engine deck. Painted by height bands; the front
# and upper forward faces are the canopy.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
for v in bm.verts:
    x, y, z = v.co
    # Longer toward the tail, fuller nose, flatter belly.
    sy = 1.40 if y < 0 else 1.05
    sz = 0.80 if z > 0 else 0.62
    sx = 0.78 * (1 - 0.10 * max(0.0, y))
    v.co = Vector((x * sx, y * sy, z * sz))
    v.co.z -= 0.08 * (y + 1) ** 2 * (1 if y < 0 else 0)  # nose droops toward the chin
for v in bm.verts:
    v.co += Vector((0, -1.05, 1.36))
for f in bm.faces:
    c = f.calc_center_median(); n = f.normal
    if c.y < -0.50 and c.z > 1.26:
        f.material_index = 3          # canopy and door windows above the waist
    elif c.y < -1.62 and c.z > 0.98 and n.y < -0.55:
        f.material_index = 3          # windscreen running down to the chin
    elif c.z < 1.02:
        f.material_index = 1          # navy belly
    elif c.z < 1.10:
        f.material_index = 2          # red pinstripe
    else:
        f.material_index = 0
cabin = obj_from_bm('cabin', bm, [PAINT, NAVY, STRIPE, GLASS])
smooth(cabin, 60)

# Door frames and the canopy bow: a dark frame where real doors meet.
def cabin_ring(y, t0, t1, steps=14, grow=1.012):
    """Points on the cabin surface at station y, from angle t0 to t1 (0 = right side, pi/2 = roof)."""
    if y < -1.05:
        yl, sx = (y + 1.05) / 1.40, 0.78
    else:
        yl = (y + 1.05) / 1.05
        sx = 0.78 * (1 - 0.10 * yl)
    k = math.sqrt(max(0.0, 1 - yl * yl))
    pts = []
    for i in range(steps + 1):
        t = t0 + (t1 - t0) * i / steps
        sz = 0.80 if math.sin(t) > 0 else 0.62
        pts.append((-sx * k * math.cos(t) * grow, y, 1.36 + sz * k * math.sin(t) * grow))
    return pts

frames = [
    tube('canopy_bow', TRIM, cabin_ring(-1.20, 0.35, math.pi - 0.35), 0.020),
    tube('door_frame', TRIM, cabin_ring(-0.45, -0.25, math.pi + 0.25, steps=18), 0.022),
    tube('door_handle_l', ALU, [(0.712, -0.62, 1.22), (0.712, -0.80, 1.22)], 0.012),
    tube('door_handle_r', ALU, [(-0.712, -0.62, 1.22), (-0.712, -0.80, 1.22)], 0.012),
]

# ---------------------------------------------------------------- engine deck and mast
deck = box('deck', PAINT, (1.06, 1.55, 0.78), (0, 0.42, 1.30), bevel=0.22, segs=4)
belly = box('belly', NAVY, (1.02, 1.50, 0.30), (0, 0.42, 0.95), bevel=0.12, segs=3)
cowl = box('cowl', PAINT, (0.82, 1.30, 0.42), (0, 0.40, 1.86), bevel=0.16, segs=4)
louvres = [box(f'louvre_{side}_{i}', TRIM, (0.02, 0.32, 0.03), (side * 0.415, 0.55 + i * 0.0, 1.80 + i * 0.07))
           for side in (1, -1) for i in range(3)]
exhaust = cyl('exhaust', STEEL, 0.09, 0.42, (0.30, 1.10, 1.70), rot=(math.radians(-70), 0, 0), r2=0.07)
mast_fair = cyl('mast_fairing', PAINT, 0.20, 0.30, (0, 0, 2.15), r2=0.12, verts=20)
mast = cyl('mast', STEEL, 0.065, 0.80, (0, 0, 2.45))
swash = cyl('swashplate', ALU, 0.17, 0.05, (0, 0, 2.42), verts=24)
antenna = cyl('antenna', TRIM, 0.008, 0.45, (0, 0.95, 2.20), rot=(math.radians(-25), 0, 0))
beacon = add(bpy.ops.mesh.primitive_uv_sphere_add, 'beacon', RED_L, radius=0.05, location=(0, 0.80, 2.10),
             segments=12, ring_count=6)

# ---------------------------------------------------------------- tail boom and fins
boom_len = 4.9
boom = cyl('boom', PAINT, 0.21, boom_len, (0, 1.10 + boom_len / 2, 1.50),
           rot=(math.radians(-90 + 1.5), 0, 0), r2=0.085, verts=20)
boom_band = cyl('boom_band', NAVY, 0.205, 0.5, (0, 3.6, 1.535), rot=(math.radians(-90 + 1.5), 0, 0), r2=0.19, verts=20)
gearbox = box('tail_gearbox', STEEL, (0.20, 0.30, 0.22), (0, 6.05, 1.65), bevel=0.05)
def plate(name, mat, outline, thickness):
    """A swept fin: an outline in (y, z), extruded across x."""
    bm = bmesh.new()
    verts = [bm.verts.new((-thickness / 2, y, z)) for y, z in outline]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.x += thickness
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj_from_bm(name, bm, [mat])

fin = plate('fin', PAINT, [(5.70, 1.62), (6.18, 1.62), (6.52, 2.42), (6.24, 2.46)], 0.05)
fin_tip = plate('fin_tip', NAVY, [(6.20, 2.36), (6.51, 2.40), (6.52, 2.42), (6.24, 2.46)], 0.054)
fin_low = plate('fin_lower', NAVY, [(5.92, 1.44), (6.16, 1.44), (6.34, 1.06), (6.20, 1.04)], 0.04)
fairing = cyl('aft_fairing', PAINT, 0.50, 1.0, (0, 1.45, 1.45), rot=(math.radians(-90), 0, 0), r2=0.22, verts=24)
fairing.scale = (1.0, 1.0, 0.82)
bpy.ops.object.transform_apply(scale=True)
seams = [tube(f'seam_{i}', TRIM, [(side * 0.532, y, 1.0), (side * 0.532, y, 1.62)], 0.006)
         for i, (side, y) in enumerate([(1, -0.15), (-1, -0.15), (1, 1.00), (-1, 1.00)])]
seams += [tube(f'panel_{i}', TRIM, [(side * 0.533, 0.05, 1.18), (side * 0.533, 0.75, 1.18),
                                     (side * 0.533, 0.75, 1.52), (side * 0.533, 0.05, 1.52),
                                     (side * 0.533, 0.05, 1.18)], 0.005)
          for i, side in enumerate((1, -1))]
stab = box('stabiliser', PAINT, (1.10, 0.32, 0.04), (0, 5.55, 1.58), bevel=0.015)
skid_guard = tube('tail_guard', ALU, [(0, 5.35, 1.36), (0, 5.55, 0.98), (0, 5.85, 1.05)], 0.018)
tail_light = add(bpy.ops.mesh.primitive_uv_sphere_add, 'tail_light', WHITE_L, radius=0.035,
                 location=(0, 6.22, 1.70), segments=10, ring_count=5)
nav_l = add(bpy.ops.mesh.primitive_uv_sphere_add, 'nav_left', RED_L, radius=0.035,
            location=(0.57, 5.55, 1.60), segments=10, ring_count=5)
nav_r = add(bpy.ops.mesh.primitive_uv_sphere_add, 'nav_right', GREEN_L, radius=0.035,
            location=(-0.57, 5.55, 1.60), segments=10, ring_count=5)

# Registration and name on the boom (original marks, no brand).
def lettering(text, size, loc, rot, mat):
    cu = bpy.data.curves.new(text, 'FONT'); cu.body = text; cu.size = size
    cu.extrude = 0.002; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(text, cu); scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat)
    return ob

marks = [
    lettering('C-KSTR', 0.15, (0.178, 2.60, 1.535), (math.radians(90), 0, math.radians(90)), NAVY),
    lettering('C-KSTR', 0.15, (-0.178, 2.60, 1.535), (math.radians(90), 0, math.radians(-90)), NAVY),
    lettering('KESTREL ONE', 0.09, (0.532, 0.40, 1.35), (math.radians(90), 0, math.radians(90)), NAVY),
    lettering('KESTREL ONE', 0.09, (-0.532, 0.40, 1.35), (math.radians(90), 0, math.radians(-90)), NAVY),
]

body = join('body', [cabin, deck, belly, cowl, exhaust, mast_fair, mast, swash, antenna, beacon, boom, boom_band,
                     gearbox, fin, fin_tip, fin_low, fairing, stab, skid_guard, tail_light, nav_l, nav_r] + frames + louvres + marks + seams)
smooth(body, 35)

# ---------------------------------------------------------------- inside the cabin
seats = [box(f'seat_{s}', SEAT, (0.48, 0.42, 0.10), (s * 0.33, -0.75, 0.95), bevel=0.04) for s in (1, -1)]
backs = [box(f'seatback_{s}', SEAT, (0.48, 0.10, 0.62), (s * 0.33, -0.52, 1.28), rot=(math.radians(-12), 0, 0),
             bevel=0.04) for s in (1, -1)]
floor = box('cabin_floor', CABIN, (0.95, 1.25, 0.04), (0, -1.00, 0.88))
sticks = [tube(f'cyclic_{s}', TRIM, [(s * 0.33, -1.05, 0.88), (s * 0.33, -1.12, 1.25)], 0.015) for s in (1, -1)]
interior = join('interior', seats + backs + [floor] + sticks)
interior.parent = body

panel = box('instrument_panel', PANEL, (0.80, 0.08, 0.30), (0, -1.58, 1.20), rot=(math.radians(20), 0, 0), bevel=0.03)
glare = box('glareshield', TRIM, (0.84, 0.16, 0.04), (0, -1.55, 1.37), bevel=0.02)
pod = join('instrument_panel', [panel, glare])
pod.parent = body

# ---------------------------------------------------------------- skids
skid_parts = []
for side in (1, -1):
    x = side * 0.98
    skid_parts.append(tube(f'skid_{side}', ALU, [(x, -2.15, 0.30), (x, -1.98, 0.14), (x, -1.75, 0.05),
                                                  (x, 1.30, 0.05), (x, 1.48, 0.10)], 0.040))
    skid_parts.append(box(f'step_{side}', TRIM, (0.10, 0.36, 0.025), (side * 0.86, -0.85, 0.36)))
for y in (-1.15, 0.55):
    skid_parts.append(tube(f'cross_{y}', ALU, [(0.98, y, 0.05), (0.92, y, 0.40), (0.62, y, 0.80),
                                               (-0.62, y, 0.80), (-0.92, y, 0.40), (-0.98, y, 0.05)], 0.045))
skids = join('skids', skid_parts)
smooth(skids, 50)

# ---------------------------------------------------------------- rotors
HUB = Vector((0, 0, 2.85))
blades = []
for k in (0, 1):
    a = k * math.pi
    blade = box(f'blade_{k}', BLADE, (4.80, 0.19, 0.035), (2.55, 0, 0), bevel=0.012)
    tip = box(f'tip_{k}', TIP, (0.30, 0.192, 0.037), (4.82, 0, 0))
    grip = box(f'grip_{k}', STEEL, (0.40, 0.14, 0.08), (0.30, 0, 0))
    for part in (blade, tip, grip):
        for m in part.modifiers:
            bpy.context.view_layer.objects.active = part
            bpy.ops.object.modifier_apply(modifier=m.name)
        part.data.transform(Matrix.Rotation(math.radians(-1.5), 4, 'Y'))  # slight droop at rest
        part.data.transform(Matrix.Rotation(a, 4, 'Z'))
        part.location = HUB
        blades.append(part)
hub = cyl('hub', STEEL, 0.12, 0.16, HUB, verts=16)
cap = add(bpy.ops.mesh.primitive_uv_sphere_add, 'hub_cap', STEEL, radius=0.09, location=HUB + Vector((0, 0, 0.09)),
          segments=12, ring_count=6)
main_rotor = join('main_rotor', blades + [hub, cap])
set_origin(main_rotor, HUB)

TAIL_HUB = Vector((0.17, 6.12, 1.70))
tparts = []
for k in (0, 1):
    tb = box(f'tblade_{k}', BLADE, (0.03, 0.10, 0.58), (0, 0, 0.30), bevel=0.006)
    for m in tb.modifiers:
        bpy.context.view_layer.objects.active = tb
        bpy.ops.object.modifier_apply(modifier=m.name)
    tb.data.transform(Matrix.Rotation(k * math.pi, 4, 'X'))
    tb.location = TAIL_HUB
    tparts.append(tb)
thub = cyl('thub', STEEL, 0.05, 0.08, TAIL_HUB, rot=(0, math.radians(90), 0), verts=12)
tail_rotor = join('tail_rotor', tparts + [thub])
set_origin(tail_rotor, TAIL_HUB)

# ---------------------------------------------------------------- empties and hierarchy
root_empty = bpy.data.objects.new('kestrel_one', None); scene.collection.objects.link(root_empty)
hook = bpy.data.objects.new('cable_hook', None); hook.location = (0, 0, 0.62); scene.collection.objects.link(hook)
eye = bpy.data.objects.new('pilot_eye', None); eye.location = (-0.33, -1.10, 1.70); scene.collection.objects.link(eye)
# Gear mounts, on the body surface and turned like the model (no rotation). glTF metres (x, y, z) are
# Blender (x, -z, y): nose (0, 1.08, 2.30), belly (0, 0.74, 1.50), right side (-0.60, 1.55, 0.45).
mounts = []
for name, loc in (('mount_nose', (0, -2.30, 1.08)), ('mount_belly', (0, -1.50, 0.74)), ('mount_side_right', (-0.60, -0.45, 1.55))):
    m_ob = bpy.data.objects.new(name, None); m_ob.location = loc; scene.collection.objects.link(m_ob)
    mounts.append(m_ob)
for ob in (body, main_rotor, tail_rotor, skids, hook, eye, *mounts):
    ob.parent = root_empty

def triangles():
    total = 0
    for ob in scene.objects:
        if ob.type == 'MESH':
            total += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return total

tri = triangles()
print(f'kestrel-one: {tri} triangles')
assert tri <= 20000, f'over the 20,000 triangle budget: {tri}'

out = OUT
out.parent.mkdir(parents=True, exist_ok=True); NATIVE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
print(f'kestrel-one: wrote {out}')

# ---------------------------------------------------------------- review renders
if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    ground = add(bpy.ops.mesh.primitive_plane_add, 'ground', material('tarmac', (0.09, 0.09, 0.085), rough=0.9),
                 size=60, location=(0, 0, 0))
    world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.55, 0.72, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0; sun.angle = math.radians(2)
    sun_ob = bpy.data.objects.new('sun', sun); scene.collection.objects.link(sun_ob)
    sun_ob.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 48; scene.cycles.device = 'CPU'
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.view_settings.view_transform = 'AgX'
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    views = {
        'three-quarter': ((-7.5, -8.5, 3.6), (0, 0.8, 1.4), 35),
        'side': ((-13.0, 1.9, 1.6), (0, 1.9, 1.5), 40),
        'rear-quarter': ((7.0, 11.0, 4.2), (0, 2.0, 1.5), 35),
        'cockpit-close': ((-2.6, -4.2, 1.9), (0, -1.2, 1.35), 40),
    }
    for name, (loc, target, lens) in views.items():
        cam.location = loc; cam_data.lens = lens
        direction = Vector(target) - Vector(loc)
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}.png')
        bpy.ops.render.render(write_still=True)
    print(f'kestrel-one: renders in {folder}')
