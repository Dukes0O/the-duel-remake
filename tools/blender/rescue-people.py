# Six people for the H4 Rescue helicopter missions (RESCUE-PEOPLE, docs/HELI_RESCUE.md
# section 13). Original clothing, gear and poses; the bodies start from the CC0
# Quaternius "Universal Base Characters [Standard]" rig, which is posed here, thinned
# to a game-sized triangle count and given plain colours. Nothing from the library is
# copied into the repository: only the finished GLBs are.
#
# Output, public/assets/heli/people/<person>-<pose>.glb. Metres, glTF +Y up, the
# person faces glTF +Z, origin on the ground at the middle of the feet. Every file holds
# an empty `harness`: the clip point, the centre of the chest harness ring (about 1.15 m
# up on an adult standing or hanging), which follows the body in every pose.
#   rescuer-hanging            rescuer in a harness on the short line: arms reaching out to the
#                              casualty, legs hanging, chest ring with a carabiner, two shoulder
#                              straps to the hook above his head (the cable's end)
#   rescuer-casualty-hanging   rescuer and casualty clipped together, face to face, on one hook
#                              (meshes `rescuer` and `casualty`), the rescuer's arms round him
#   The two hanging files are centred under the hook (the line), not under the feet; their lowest
#   point is at 0.
#   hiker-standing, skier-standing, driver-standing   standing and waving
#   hiker-sitting, skier-sitting                      sitting on a slope
#   driver-lying               lying on his back under a foil blanket, sized to lie in the
#                              RESCUE-PROPS stretcher: origin at the middle of the litter floor
#                              under him, body along +Z with the head toward +Z
#   hiker-walking, paramedic-1-walking, paramedic-2-walking   static mid-stride
# The walking files are one frozen stride, not a looping animation.
#
# Run: blender -b --factory-startup --python tools/blender/rescue-people.py -- --root . [--only name,name] [--render DIR]
# The base library is read from DUEL_ART_LIBRARY (default C:/Users/kyleb/dev/art-library).
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
parser.add_argument('--only', default='')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
NAMES = ['rescuer-hanging', 'rescuer-casualty-hanging', 'hiker-standing', 'skier-standing', 'driver-standing',
         'hiker-sitting', 'skier-sitting', 'driver-lying', 'hiker-walking', 'paramedic-1-walking',
         'paramedic-2-walking']
OUT = root / 'public/assets/heli/people'
BLEND = root / 'art-build/heli/people'
if options.paths_only:
    print(json.dumps({'blend': [str(BLEND / f'{n}.blend') for n in NAMES], 'glb': [str(OUT / f'{n}.glb') for n in NAMES], 'json': []}))
    sys.exit(0)

import os, zipfile
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

LIBRARY = Path(os.environ.get('DUEL_ART_LIBRARY', 'C:/Users/kyleb/dev/art-library'))
BASE_ZIP = LIBRARY / 'quaternius-universal-base-characters-standard' / 'Standard.zip'
CACHE = root / 'art-build/heli/people/_base'
TRI_LIMIT = 6000
RING_Z = 1.19  # chest ring height on the 1.81 m base body; about 1.15 m after the height scaling
UP = Vector((0, 0, 1))
FWD = Vector((0, -1, 0))  # Blender -Y becomes glTF +Z

# ---------------------------------------------------------------------------
# Scene and materials

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, colour, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m

COLOURS = {
    # skin
    'skin_a': ((0.50, 0.30, 0.22), 0.55), 'skin_b': ((0.36, 0.21, 0.15), 0.55), 'skin_c': ((0.62, 0.42, 0.33), 0.55),
    'skin_d': ((0.22, 0.12, 0.09), 0.55),
    # rescuer
    'red_suit': ((0.38, 0.015, 0.012), 0.75), 'black': ((0.02, 0.02, 0.022), 0.8), 'webbing': ((0.015, 0.015, 0.017), 0.9),
    'helmet_black': ((0.025, 0.025, 0.03), 0.35), 'red_stripe': ((0.45, 0.02, 0.015), 0.5), 'steel': ((0.45, 0.46, 0.47), 0.4, 1.0),
    'boot_black': ((0.035, 0.03, 0.028), 0.85), 'visor': ((0.01, 0.012, 0.016), 0.15),
    # hiker
    'orange_jacket': ((0.62, 0.16, 0.02), 0.7), 'grey_trouser': ((0.10, 0.10, 0.095), 0.9), 'boot_brown': ((0.12, 0.065, 0.035), 0.8),
    'navy_hat': ((0.025, 0.04, 0.075), 0.9), 'pack_olive': ((0.075, 0.115, 0.055), 0.85), 'pack_strap': ((0.03, 0.04, 0.03), 0.9),
    'bedroll': ((0.30, 0.20, 0.10), 0.9), 'glove_grey': ((0.07, 0.07, 0.075), 0.85),
    # skier
    'ski_jacket': ((0.015, 0.16, 0.38), 0.6), 'ski_pants': ((0.015, 0.03, 0.09), 0.65), 'helmet_white': ((0.65, 0.66, 0.68), 0.35),
    'goggle_strap': ((0.02, 0.02, 0.02), 0.7), 'goggle_lens': ((0.55, 0.22, 0.03), 0.1), 'ski_boot': ((0.05, 0.05, 0.055), 0.5),
    'ski_white': ((0.55, 0.57, 0.6), 0.4), 'ski_trim': ((0.55, 0.45, 0.02), 0.6), 'ski_glove': ((0.03, 0.03, 0.035), 0.7),
    # driver
    'jumper': ((0.13, 0.17, 0.12), 0.95), 'jeans': ((0.045, 0.08, 0.17), 0.9), 'trainer': ((0.5, 0.5, 0.47), 0.7),
    'hair_brown': ((0.07, 0.04, 0.025), 0.95), 'foil': ((0.55, 0.45, 0.12), 0.25, 0.9), 'sole': ((0.6, 0.6, 0.58), 0.8),
    'litter': ((0.55, 0.12, 0.02), 0.6), 'litter_strap': ((0.02, 0.02, 0.02), 0.85), 'strop': ((0.62, 0.22, 0.01), 0.7),
    # paramedics
    'para_green': ((0.035, 0.17, 0.085), 0.8), 'para_trouser': ((0.03, 0.12, 0.06), 0.85), 'hivis': ((0.45, 0.48, 0.02), 0.5),
    'nitrile': ((0.08, 0.22, 0.38), 0.5), 'hair_black': ((0.02, 0.016, 0.016), 0.95), 'bag_orange': ((0.45, 0.17, 0.02), 0.75),
    'bag_white': ((0.6, 0.6, 0.58), 0.7), 'radio': ((0.03, 0.03, 0.035), 0.6),
}
MATS = {}

def mat(key):
    if key not in MATS:
        spec = COLOURS[key]
        MATS[key] = material(key, spec[0], spec[1], spec[2] if len(spec) > 2 else 0.0)
    return MATS[key]

# ---------------------------------------------------------------------------
# Base character: import, regions, thinning

def load_base(kind):
    """Import the rigged Quaternius body (kind 'Male' or 'Female') without its textures."""
    if not BASE_ZIP.exists():
        raise SystemExit(f'rescue-people: base library not found at {BASE_ZIP}; set DUEL_ART_LIBRARY')
    stem = f'Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_{kind}_FullBody'
    CACHE.mkdir(parents=True, exist_ok=True)
    gltf = CACHE / f'{kind}.gltf'
    if not gltf.exists():
        zf = zipfile.ZipFile(BASE_ZIP)
        data = json.loads(zf.read(stem + '.gltf'))
        for key in ('images', 'textures', 'samplers'):
            data.pop(key, None)
        for m in data.get('materials', []):
            m.get('pbrMetallicRoughness', {}).pop('baseColorTexture', None)
            m.get('pbrMetallicRoughness', {}).pop('metallicRoughnessTexture', None)
            for key in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
                m.pop(key, None)
        uri = data['buffers'][0]['uri']
        (CACHE / uri).write_bytes(zf.read(stem.rsplit('/', 1)[0] + '/' + uri))
        gltf.write_text(json.dumps(data))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(gltf))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    body = max((o for o in new if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    for o in new:
        if o not in (arm, body):
            bpy.data.objects.remove(o)
    body.data.materials.clear()
    return arm, body

def region_of(bone):
    if bone in ('Head', 'neck_01'): return 'head'
    if bone.startswith(('spine', 'clavicle')): return 'torso'
    if bone.startswith(('upperarm', 'lowerarm')): return 'arms'
    if bone.startswith(('hand', 'index', 'middle', 'pinky', 'ring', 'thumb')): return 'hands'
    if bone.startswith(('foot', 'ball')): return 'feet'
    if bone in ('pelvis',) or bone.startswith(('thigh', 'calf')): return 'legs'
    return None

def tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)

def decimate(me, target):
    tris = tri_count(me)
    if tris <= target:
        return me
    ob = bpy.data.objects.new('tmp-decimate', me); bpy.context.scene.collection.objects.link(ob)
    mod = ob.modifiers.new('d', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = target / tris
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    out = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
    bpy.data.objects.remove(ob)
    return out

class Rig:
    """The imported body plus rest-pose measurements and the posing helpers."""
    def __init__(self, arm, body):
        self.arm, self.body = arm, body
        assert arm.matrix_world == Matrix.Identity(4), 'base armature is not at the origin'
        self.head = {b.name: b.head_local.copy() for b in arm.data.bones}
        self.tail = {b.name: b.tail_local.copy() for b in arm.data.bones}
        self.dir = {n: (self.tail[n] - self.head[n]).normalized() for n in self.head}
        self.length = {n: (self.tail[n] - self.head[n]).length for n in self.head}
        names = {vg.index: vg.name for vg in body.vertex_groups}
        self.vertex_region = []
        for v in body.data.vertices:
            acc = {}
            for g in v.groups:
                r = region_of(names[g.group])
                if r: acc[r] = acc.get(r, 0.0) + g.weight
            self.vertex_region.append(max(acc, key=acc.get) if acc else 'torso')

    def head_metrics(self):
        pts = [v.co for v, r in zip(self.body.data.vertices, self.vertex_region) if r == 'head' and v.co.z > 1.575]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        return (lo + hi) / 2, (hi - lo) / 2

    def inflate(self, thickness):
        """Push each region outward a little so the skin shape reads as cloth. thickness: region -> metres."""
        me = self.body.data
        normals = [v.normal.copy() for v in me.vertices]
        for v, n, r in zip(me.vertices, normals, self.vertex_region):
            v.co += n * thickness.get(r, 0.0)
        me.update()
        self.bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
        hit, nrm = self.cast((0, -1, RING_Z), (0, 1, 0))
        self.ring_rest = hit + nrm * 0.02

    def cast(self, origin, direction, bvh=None):
        hit = (bvh or self.bvh).ray_cast(Vector(origin), Vector(direction).normalized(), 3.0)
        return (hit[0], hit[1]) if hit[0] is not None else (None, None)

# ---------------------------------------------------------------------------
# Posing

class Poser:
    def __init__(self, rig):
        self.rig = rig; self.pose = rig.arm.pose
        for pb in self.pose.bones:
            pb.rotation_mode = 'QUATERNION'

    @staticmethod
    def update():
        bpy.context.view_layer.update()

    def pb(self, name):
        return self.pose.bones[name]

    def place(self, name, pos):
        pb = self.pb(name)
        pb.matrix = Matrix.Translation(Vector(pos) - pb.head) @ pb.matrix
        self.update()

    def aim(self, name, direction):
        pb = self.pb(name)
        head = pb.head.copy()
        cur = (pb.tail - pb.head).normalized()
        q = cur.rotation_difference(Vector(direction).normalized())
        pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
        self.update()

    def head_of(self, name):
        return self.pb(name).head.copy()

    def tail_of(self, name):
        return self.pb(name).tail.copy()

    def curl(self, side, amount, thumb=0.3):
        """Close the fingers of one hand. amount 0 open, 1 fist."""
        rig = self.rig
        for finger in ('index', 'middle', 'ring', 'pinky', 'thumb'):
            for i in (1, 2, 3):
                name = f'{finger}_0{i}_{side}'
                if name not in rig.dir: continue
                axis_rest = rig.dir[name].cross(Vector((0, 0, -1)))
                if axis_rest.length < 1e-4: continue
                bone = rig.arm.data.bones[name]
                axis_local = bone.matrix_local.to_3x3().inverted() @ axis_rest.normalized()
                a = (thumb if finger == 'thumb' else amount) * math.radians(65 if i < 3 else 55)
                self.pb(name).rotation_quaternion = Quaternion(axis_local.normalized(), a)
        self.update()

    def two_bone(self, upper, lower, target, pole, tip_bone=None):
        """Aim a two-bone limb so the lower bone's tail reaches target; the middle joint bends toward pole."""
        rig = self.rig
        s = self.head_of(upper); t = Vector(target)
        a, b = rig.length[upper], rig.length[lower]
        d = t - s
        dist = min(max(d.length, abs(a - b) + 1e-3), (a + b) * 0.999)
        u = d.normalized()
        x = (a * a - b * b + dist * dist) / (2 * dist)
        h = math.sqrt(max(a * a - x * x, 0.0))
        pv = Vector(pole) - u * Vector(pole).dot(u)
        pv = pv.normalized() if pv.length > 1e-5 else Vector((0, -1, 0))
        elbow = s + u * x + pv * h
        self.aim(upper, elbow - s)
        self.aim(lower, s + u * dist - elbow)

def apply_pose(rig, pose):
    """Pose the rig. All numbers are in the standing frame (x left, -y forward, z up); pose['T'] then
    moves the whole body (used for lying down)."""
    P = Poser(rig)
    T = pose.get('T', Matrix.Identity(4)); R = T.to_3x3()
    tp = lambda v: T @ Vector(v)
    td = lambda v: (R @ Vector(v)).normalized()
    rq = lambda e: Euler([math.radians(a) for a in e], 'XYZ').to_quaternion()
    qp, qs = rq(pose.get('pelvis_tilt', (0, 0, 0))), rq(pose.get('lean', (0, 0, 0)))
    qn, qh = rq(pose.get('neck', (0, 0, 0))), rq(pose.get('head', (0, 0, 0)))
    P.place('pelvis', tp(rig.head['pelvis'] + Vector(pose.get('pelvis_off', (0, 0, 0)))))
    P.aim('pelvis', td(qp @ rig.dir['pelvis']))
    for bone in ('spine_01', 'spine_02', 'spine_03'):
        P.aim(bone, td(qs @ rig.dir[bone]))
    P.aim('neck_01', td(qs @ qn @ rig.dir['neck_01']))
    P.aim('Head', td(qs @ qn @ qh @ rig.dir['Head']))
    for side, sign in (('l', 1), ('r', -1)):
        arm = pose['arm_' + side]
        cd = rig.dir['clavicle_' + side]
        P.aim('clavicle_' + side, td(Vector((cd.x, cd.y, arm.get('shoulder', -0.12) * abs(cd.x)))))
        P.two_bone('upperarm_' + side, 'lowerarm_' + side, tp(arm['hand']), td(arm['pole']))
        hand_dir = arm.get('hand_dir')
        low = (P.tail_of('lowerarm_' + side) - P.head_of('lowerarm_' + side)).normalized()
        P.aim('hand_' + side, td(hand_dir) if hand_dir else low)
        P.curl(side, arm.get('curl', 0.25), arm.get('thumb', 0.3))
    for side, sign in (('l', 1), ('r', -1)):
        leg = pose['leg_' + side]
        P.two_bone('thigh_' + side, 'calf_' + side, tp(leg['ankle']), td(leg.get('pole', (0, -1, 0))))
        P.aim('foot_' + side, td(leg.get('foot', rig.dir['foot_' + side])))
        P.aim('ball_' + side, td(leg.get('ball', rig.dir['ball_' + side])))
        P.aim('ball_leaf_' + side, td(leg.get('ball', rig.dir['ball_leaf_' + side])))
    P.update()
    return P

# ---------------------------------------------------------------------------
# Small geometry kit (bmesh). Parts are built in the rest pose and ride one bone.

class Parts:
    def __init__(self):
        self.items = []

    def new(self, name, matkey, bone, smooth=False):
        bm = bmesh.new()
        self.items.append((name, matkey, bone, bm, smooth))
        return bm

def _xf(bm, ops_result, loc, rot, scale):
    M = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot], 'XYZ').to_quaternion(), Vector(scale))
    bmesh.ops.transform(bm, matrix=M, verts=ops_result['verts'])

def add_box(bm, size, loc, rot=(0, 0, 0), bevel=0.0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    _xf(bm, r, loc, rot, size)
    if bevel:
        edges = list({e for v in r['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, affect='EDGES')

def add_sphere(bm, radii, loc, rot=(0, 0, 0), u=12, v=8):
    r = bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)
    _xf(bm, r, loc, rot, radii)

def add_cyl(bm, r1, r2, depth, loc, rot=(0, 0, 0), segs=12, caps=True, scale=(1, 1, 1)):
    r = bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth)
    _xf(bm, r, loc, rot, scale)

def add_quad(bm, pts, outward):
    a, b, c, d = [Vector(p) for p in pts]
    n = (b - a).cross(d - a)
    order = (a, b, c, d) if n.dot(Vector(outward)) >= 0 else (a, d, c, b)
    try:
        bm.faces.new([bm.verts.new(p) for p in order])
    except ValueError:
        pass

def add_ribbon(bm, samples, width, closed=False, side_axis=None):
    """A flat strip along (point, normal) samples. side_axis fixes the strip's width direction."""
    n = len(samples)
    ends = n if closed else n - 1
    for i in range(ends):
        (p0, n0), (p1, n1) = samples[i], samples[(i + 1) % n]
        tangent = (p1 - p0).normalized()
        out = (n0 + n1).normalized()
        side = side_axis if side_axis is not None else tangent.cross(out).normalized()
        w = side * (width / 2)
        add_quad(bm, (p0 - w, p1 - w, p1 + w, p0 + w), out)

def cut_plane(bm, point, normal):
    """Remove everything on the negative side of the plane, leaving an open edge."""
    geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=Vector(point), plane_no=Vector(normal), clear_inner=True)

def smooth_path(controls, per=5):
    """Catmull-Rom through (point, normal) controls."""
    out = []
    n = len(controls)
    for i in range(n - 1):
        p0 = controls[max(i - 1, 0)][0]; p1 = controls[i][0]; p2 = controls[i + 1][0]; p3 = controls[min(i + 2, n - 1)][0]
        n1, n2 = controls[i][1], controls[i + 1][1]
        for k in range(per):
            t = k / per
            p = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            out.append((p, (n1 * (1 - t) + n2 * t).normalized()))
    out.append(controls[-1])
    return out

def surface_path(rig, rays, off=0.005, per=5, bvh=None):
    """Lay a path on the body: each ray (origin, direction) finds a point on the skin; the curve between is
    smoothed and pressed back onto the skin."""
    ctl = []
    for o, d in rays:
        p, nrm = rig.cast(o, d, bvh)
        assert p is not None, f'ray missed the body: {o} {d}'
        ctl.append((p, nrm))
    out = []
    for p, nrm in smooth_path(ctl, per):
        q, qn = rig.cast(p + nrm * 0.08, -nrm, bvh)
        if q is None: q, qn = p, nrm
        out.append((q + qn * off, qn))
    return out

def loop_path(rig, center, axis, reach=0.6, n=16, off=0.005, bvh=None):  # reach is unused: rays start inside the limb
    """A closed path around the body (or a limb) in the plane through center perpendicular to axis."""
    axis = Vector(axis).normalized()
    helper = Vector((1, 0, 0)) if abs(axis.x) < 0.9 else Vector((0, 1, 0))
    u = axis.cross(helper).normalized(); v = axis.cross(u).normalized()
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        d = u * math.cos(a) + v * math.sin(a)
        p, nrm = rig.cast(Vector(center), d, bvh)
        if p is None:
            continue
        out.append((p + nrm * off, nrm))
    assert len(out) >= n - 2, f'loop rays missed at {center} {axis}'
    return out

def band(bm, rig, center, axis, width, off=0.006, n=14, reach=0.5, bvh=None):
    pts = loop_path(rig, center, axis, reach, n, off, bvh)
    add_ribbon(bm, pts, width, closed=True, side_axis=Vector(axis).normalized())

# ---------------------------------------------------------------------------
# Building a person

class Person:
    def __init__(self):
        self.pieces = []       # (mesh in metres, material key, smooth)
        self.harness = Vector()
        self.ankles = []
        self.points = {}      # posed positions of a few bones, for gear added after posing
        self.tris = 0

def eval_mesh(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    return bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)

def build_person(spec, pose, gear=None, tri_scale=1.0):
    arm, body = load_base(spec['body'])
    rig = Rig(arm, body)
    rig.inflate(spec['inflate'])
    parts = Parts()
    if gear:
        gear(parts, rig, spec)
    # which clothing group each face belongs to
    group_of_region = {}
    for gi, g in enumerate(spec['groups']):
        for r in g['regions']:
            group_of_region[r] = gi
    me = body.data
    for p in me.polygons:
        votes = [group_of_region[rig.vertex_region[i]] for i in p.vertices]
        p.material_index = max(set(votes), key=votes.count)
    # head size is read before posing so gear can be sized to it
    P = apply_pose(rig, pose)
    person = Person()
    posed = eval_mesh(body)
    for gi, g in enumerate(spec['groups']):
        bm = bmesh.new(); bm.from_mesh(posed)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != gi], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        part = bpy.data.meshes.new(g['name']); bm.to_mesh(part); bm.free()
        part = decimate(part, int(g['tris'] * tri_scale))
        for poly in part.polygons: poly.use_smooth = True
        person.pieces.append((part, g['mat'], True))
    for name, matkey, bone, bm, smooth in parts.items:
        pm = bpy.data.meshes.new(name); bm.to_mesh(pm); bm.free()
        ob = bpy.data.objects.new(name, pm); bpy.context.scene.collection.objects.link(ob)
        vg = ob.vertex_groups.new(name=bone); vg.add(list(range(len(pm.vertices))), 1.0, 'REPLACE')
        mod = ob.modifiers.new('arm', 'ARMATURE'); mod.object = arm
        ev = eval_mesh(ob)
        for poly in ev.polygons: poly.use_smooth = smooth
        person.pieces.append((ev, matkey, smooth))
    # clip point: the chest ring, carried by spine_01
    rest_ring = rig.ring_rest
    bone = arm.data.bones['spine_01']
    person.harness = P.pb('spine_01').matrix @ bone.matrix_local.inverted() @ rest_ring
    person.ankles = [P.head_of('foot_l'), P.head_of('foot_r')]
    person.points = {n: P.head_of(n) for n in ('hand_l', 'hand_r', 'Head', 'upperarm_l', 'upperarm_r')}
    return person

# ---------------------------------------------------------------------------
# Finishing: scale, ground, merge, export

def transform_person(person, scale, drop_to=None, origin=None, offset=Vector((0, 0, 0)), center=True):
    """Scale about the origin, put the lowest point at height drop_to (None keeps z), centre the feet on x/y."""
    S = Matrix.Scale(scale, 4)
    for me, _, _ in person.pieces: me.transform(S)
    person.harness = S @ person.harness
    person.ankles = [S @ a for a in person.ankles]
    person.points = {k: S @ v for k, v in person.points.items()}
    low = min(v.co.z for me, _, _ in person.pieces for v in me.vertices)
    dz = (drop_to - low) if drop_to is not None else 0.0
    feet = (person.ankles[0] + person.ankles[1]) / 2
    shift = Vector((-feet.x if center else 0.0, -feet.y if center else 0.0, dz)) + offset
    M = Matrix.Translation(shift)
    for me, _, _ in person.pieces: me.transform(M)
    person.harness = M @ person.harness
    person.ankles = [M @ a for a in person.ankles]
    person.points = {k: M @ v for k, v in person.points.items()}

def merge_pieces(name, pieces):
    """One mesh object from many pieces, one material slot per colour."""
    verts, faces, slots, flat, order = [], [], [], [], []
    for me, key, smooth in pieces:
        if key not in order: order.append(key)
        base = len(verts)
        verts += [tuple(v.co) for v in me.vertices]
        for p in me.polygons:
            faces.append([base + i for i in p.vertices]); slots.append(order.index(key)); flat.append(p.use_smooth)
    out = bpy.data.meshes.new(name); out.from_pydata(verts, [], faces)
    for key in order: out.materials.append(mat(key))
    for poly, slot, sm in zip(out.polygons, slots, flat):
        poly.material_index = slot; poly.use_smooth = sm
    out.validate()
    ob = bpy.data.objects.new(name, out); bpy.context.scene.collection.objects.link(ob)
    return ob

def add_empty(name, pos):
    e = bpy.data.objects.new(name, None); e.location = pos; e.empty_display_type = 'SPHERE'; e.empty_display_size = 0.04
    bpy.context.scene.collection.objects.link(e); return e

def triangles():
    return sum(tri_count(o.data) for o in bpy.context.scene.objects if o.type == 'MESH')

# ---------------------------------------------------------------------------
# Gear and clothing details. All built in the rest pose on the inflated body and tied to one bone.

def on_bone(rig, name, t):
    return rig.head[name].lerp(rig.tail[name], t)

def add_ring3d(bm, centre, normal, R, r, segs=12, tsegs=5, squash=1.0):
    n = Vector(normal).normalized()
    helper = Vector((1, 0, 0)) if abs(n.x) < 0.9 else Vector((0, 1, 0))
    u = n.cross(helper).normalized(); v = n.cross(u).normalized() * squash
    rows = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        radial = (u * math.cos(a) + v * math.sin(a))
        c = Vector(centre) + radial * R
        row = []
        for j in range(tsegs):
            b = 2 * math.pi * j / tsegs
            row.append(bm.verts.new(c + radial.normalized() * (r * math.cos(b)) + n * (r * math.sin(b))))
        rows.append(row)
    for i in range(segs):
        for j in range(tsegs):
            a, b = rows[i], rows[(i + 1) % segs]
            try:
                bm.faces.new([a[j], b[j], b[(j + 1) % tsegs], a[(j + 1) % tsegs]])
            except ValueError:
                pass

def dome(parts, name, matkey, bone, centre, radii, cut_point, cut_normal, u=16, v=10, smooth=True):
    bm = parts.new(name, matkey, bone, smooth=smooth)
    add_sphere(bm, radii, centre, u=u, v=v)
    cut_plane(bm, cut_point, cut_normal)
    return bm

def bm_bvh(bm):
    return BVHTree.FromBMesh(bm)

def helmet(parts, rig, matkey, hc, hr, stripe=None, goggles=None, visor=False):
    """A hard hat: a shell over the skull, higher at the brow, lower at the back."""
    grow = 0.014
    bm = dome(parts, 'helmet', matkey, 'Head', (hc.x, hc.y + 0.005, hc.z + 0.012),
              (hr.x + grow, hr.y + grow, hr.z * 0.96 + grow), (hc.x, hc.y, hc.z + 0.006), (0, 0.3, 1))
    bvh = bm_bvh(bm)
    if stripe:
        sb = parts.new('helmet-stripe', stripe, 'Head', smooth=False)
        rays = [((0, -1, hc.z + 0.03), (0, 1, 0)), ((0, -0.5, hc.z + 0.3), (0, 0.5, -1)), ((0, 0, hc.z + 0.4), (0, 0, -1)),
                ((0, 0.5, hc.z + 0.3), (0, -0.5, -1)), ((0, 1, hc.z - 0.01), (0, -1, 0))]
        ctl = []
        for o, d in rays:
            hit, nrm = rig.cast(o, d, bvh)
            if hit is not None: ctl.append((hit, nrm))
        pts = []
        for p, nrm in smooth_path(ctl, 5):
            q, qn = rig.cast(p + nrm * 0.05, -nrm, bvh)
            if q is not None: pts.append((q + qn * 0.003, qn))
        add_ribbon(sb, pts, 0.03, side_axis=Vector((1, 0, 0)))
    if goggles:
        gb = parts.new('goggle-strap', 'goggle_strap', 'Head')
        band(gb, rig, (hc.x, hc.y, hc.z + 0.05), (0, 0, 1), 0.04, off=0.004, n=18, bvh=bvh)
        lb = parts.new('goggle-lens', goggles, 'Head')
        front = rig.cast((hc.x, hc.y, hc.z + 0.05), (0, -1, 0), bvh)[0]
        add_box(lb, (0.13, 0.03, 0.055), (hc.x, front.y - 0.004, hc.z + 0.05), (0, 0, 0), bevel=0.012)
    if visor:
        vb = parts.new('visor', 'visor', 'Head', smooth=True)
        front = rig.cast((hc.x, hc.y, hc.z + 0.06), (0, -1, 0), bvh)[0]
        add_box(vb, (0.15, 0.05, 0.028), (hc.x, front.y - 0.005, hc.z + 0.045), (-18, 0, 0), bevel=0.008)
    return bvh

def hat(parts, rig, matkey, hc, hr, cuff=None, snug=0.012, cut=-0.012):
    """A beanie pulled down over the forehead and ears."""
    bm = dome(parts, 'hat', matkey, 'Head', (hc.x, hc.y + 0.003, hc.z + 0.01),
              (hr.x + snug, hr.y + snug, hr.z * 0.95 + snug), (hc.x, hc.y, hc.z + cut), (0, 0.18, 1))
    if cuff:
        cb = parts.new('hat-cuff', cuff, 'Head')
        band(cb, rig, (hc.x, hc.y, hc.z + cut + 0.025), (0, 0, 1), 0.04, off=0.004, n=18, bvh=bm_bvh(bm))
    return bm

def hair(parts, rig, matkey, hc, hr, long_back=0.0):
    return dome(parts, 'hair', matkey, 'Head', (hc.x, hc.y + 0.006, hc.z + 0.006),
                (hr.x + 0.008, hr.y + 0.012, hr.z * 0.97 + 0.008), (hc.x, hc.y, hc.z - 0.02 - long_back), (0, 0.55, 1))

def cuffs(parts, rig, matkey, wrist=True, ankle=None, width=0.05, wrist_off=0.006, ankle_off=0.008):
    for side, sign in (('l', 1), ('r', -1)):
        if wrist:
            b = parts.new(f'cuff-{side}', matkey, f'lowerarm_{side}')
            c = rig.head['lowerarm_' + side].lerp(rig.tail['lowerarm_' + side], 0.88)
            band(b, rig, c, (sign, 0, 0), width, off=wrist_off, n=10, reach=0.3)
        if ankle is not None:
            b = parts.new(f'ankle-{side}', matkey, f'calf_{side}')
            t = (rig.head['calf_' + side].z - ankle) / (rig.head['calf_' + side].z - rig.tail['calf_' + side].z)
            band(b, rig, on_bone(rig, 'calf_' + side, t), (0, 0, 1), width, off=ankle_off, n=10, reach=0.3)

def collar(parts, rig, matkey, z=None, width=0.05, off=0.012, bone='neck_01'):
    hc, hr = rig.head_metrics()
    z = hc.z - hr.z - 0.03
    b = parts.new('collar', matkey, bone)
    band(b, rig, (0, 0.03, z), (0, 0, 1), width, off=off, n=14, reach=0.3)

def waist_band(parts, rig, matkey, z=1.07, width=0.05, off=0.006, bone='spine_01', name='waist'):
    b = parts.new(name, matkey, bone)
    band(b, rig, (0, 0.03, z), (0, 0, 1), width, off=off, n=16, reach=0.4)

def strap(parts, rig, matkey, rays, bone, width=0.04, per=5, off=0.005):
    b = parts.new('strap', matkey, bone)
    add_ribbon(b, surface_path(rig, rays, off=off, per=per), width)

def chest_ring(parts, rig, matkey_ring='steel'):
    b = parts.new('ring', matkey_ring, 'spine_01', smooth=True)
    p = rig.ring_rest
    add_ring3d(b, p + Vector((0, -0.012, 0)), (0, 1, 0), 0.032, 0.0055, segs=12, tsegs=4)
    add_ring3d(b, p + Vector((0, -0.02, 0.045)), (0, 1, 0), 0.026, 0.005, segs=10, tsegs=4, squash=1.5)

def rescue_harness(parts, rig):
    for sign in (1, -1):
        side = 'l' if sign > 0 else 'r'
        rays = [((0, -1, RING_Z - 0.01), (0, 1, 0)), ((sign * 0.06, -1, 1.30), (0, 1, 0)), ((sign * 0.085, -1, 1.42), (0, 1, 0)),
                ((sign * 0.11, -0.1, 2.0), (0, 0, -1)), ((sign * 0.1, 1, 1.46), (0, -1, 0)), ((sign * 0.07, 1, 1.32), (0, -1, 0)),
                ((0, 1, 1.26), (0, -1, 0))]
        strap(parts, rig, 'webbing', rays, 'spine_03', width=0.042, off=0.024)
        strap(parts, rig, 'webbing', [((sign * 0.07, -1, 1.12), (0, 1, 0)), ((sign * 0.09, -1, 1.03), (0, 1, 0)), ((sign * 0.114, -1, 0.9), (0, 1, 0))],
              'pelvis', width=0.035, per=4)
        b = parts.new('thigh-loop', 'webbing', f'thigh_{side}')
        t = (rig.head['thigh_' + side].z - 0.82) / 0.43
        band(b, rig, on_bone(rig, 'thigh_' + side, t), (0, 0, 1), 0.075, off=0.008, n=14, reach=0.3)
    strap(parts, rig, 'webbing', [((-0.08, -1, 1.34), (0, 1, 0)), ((0, -1, 1.34), (0, 1, 0)), ((0.08, -1, 1.34), (0, 1, 0))], 'spine_03', width=0.025, per=3, off=0.022)
    waist_band(parts, rig, 'webbing', z=1.05, width=0.12, off=0.012)
    chest_ring(parts, rig)

def gear_rescuer(parts, rig, spec):
    hc, hr = rig.head_metrics()
    helmet(parts, rig, 'helmet_black', hc, hr, stripe='red_stripe', visor=True)
    rescue_harness(parts, rig)
    cuffs(parts, rig, 'black', width=0.05)
    cuffs(parts, rig, 'black', wrist=False, ankle=0.13, width=0.07, ankle_off=0.014)
    collar(parts, rig, 'black')
    b = parts.new('radio', 'radio', 'spine_03')
    f = rig.cast((-0.09, -1, 1.38), (0, 1, 0))[0]
    add_box(b, (0.075, 0.035, 0.105), (-0.1, f.y - 0.02, 1.38), bevel=0.008)
    b = parts.new('pouch', 'black', 'pelvis')
    add_box(b, (0.07, 0.12, 0.13), (-0.2, 0.05, 0.96), bevel=0.01)

def gear_hiker(parts, rig, spec):
    hc, hr = rig.head_metrics()
    hat(parts, rig, 'navy_hat', hc, hr, cuff='navy_hat', snug=0.014)
    collar(parts, rig, 'orange_jacket', z=1.55, width=0.07, off=0.02)
    cuffs(parts, rig, 'glove_grey', width=0.04, wrist_off=0.008)
    cuffs(parts, rig, 'grey_trouser', wrist=False, ankle=0.13, width=0.07, ankle_off=0.014)
    back = rig.cast((0, 1, 1.3), (0, -1, 0))[0]
    b = parts.new('pack', 'pack_olive', 'spine_03')
    add_box(b, (0.32, 0.2, 0.5), (0, back.y + 0.105, 1.33), bevel=0.028)
    add_box(b, (0.29, 0.21, 0.09), (0, back.y + 0.105, 1.6), bevel=0.02)
    for sx in (-1, 1):
        add_box(b, (0.075, 0.13, 0.22), (sx * 0.19, back.y + 0.085, 1.22), bevel=0.015)
    b = parts.new('bedroll', 'bedroll', 'spine_03', smooth=True)
    add_cyl(b, 0.07, 0.07, 0.38, (0, back.y + 0.1, 1.02), rot=(0, 90, 0), segs=10)
    for sign in (1, -1):
        strap(parts, rig, 'pack_strap', [((sign * 0.075, -1, 1.2), (0, 1, 0)), ((sign * 0.09, -1, 1.36), (0, 1, 0)),
              ((sign * 0.11, -0.1, 2.0), (0, 0, -1)), ((sign * 0.1, 1, 1.5), (0, -1, 0))], 'spine_03', width=0.05)
    strap(parts, rig, 'pack_strap', [((-0.085, -1, 1.34), (0, 1, 0)), ((0, -1, 1.34), (0, 1, 0)), ((0.085, -1, 1.34), (0, 1, 0))], 'spine_03', width=0.025, per=3)
    waist_band(parts, rig, 'pack_strap', z=1.05, width=0.11, off=0.016)

def gear_skier(parts, rig, spec, skis=True):
    hc, hr = rig.head_metrics()
    helmet(parts, rig, 'helmet_white', hc, hr, goggles='goggle_lens')
    collar(parts, rig, 'ski_trim', z=1.56, width=0.06, off=0.02)
    cuffs(parts, rig, 'ski_glove', width=0.055, wrist_off=0.01)
    waist_band(parts, rig, 'ski_trim', z=1.05, width=0.11, off=0.02)
    b = parts.new('chest-band', 'ski_trim', 'spine_03')
    band(b, rig, (0, 0.03, 1.36), (0, 0, 1), 0.04, off=0.018, n=16, reach=0.4)
    for side, sign in (('l', 1), ('r', -1)):
        b = parts.new('boot-shell', 'ski_boot', f'calf_{side}', smooth=False)
        c = on_bone(rig, 'calf_' + side, 0.8)
        add_box(b, (0.125, 0.15, 0.2), (c.x, c.y + 0.004, c.z + 0.015), bevel=0.02)
        if skis:
            b = parts.new('ski', 'ski_white', f'foot_{side}')
            add_box(b, (0.095, 1.5, 0.014), (sign * 0.114, -0.35, -0.05), bevel=0.004)
            add_box(b, (0.095, 0.16, 0.014), (sign * 0.114, -1.16, -0.034), (-14, 0, 0), bevel=0.004)
            b = parts.new('binding', 'black', f'foot_{side}')
            add_box(b, (0.08, 0.28, 0.035), (sign * 0.114, -0.03, -0.028), bevel=0.01)

def gear_driver(parts, rig, spec):
    hc, hr = rig.head_metrics()
    hair(parts, rig, 'hair_brown', hc, hr)
    collar(parts, rig, 'jumper', z=1.555, width=0.06, off=0.02)
    cuffs(parts, rig, 'jeans', wrist=False, ankle=0.13, width=0.07, ankle_off=0.014)
    waist_band(parts, rig, 'jumper', z=1.05, width=0.11, off=0.014, bone='spine_01', name='hem')
    for side, sign in (('l', 1), ('r', -1)):
        b = parts.new('sole', 'sole', f'foot_{side}')
        add_box(b, (0.1, 0.27, 0.03), (sign * 0.114, -0.04, -0.005), bevel=0.012)

def gear_paramedic(parts, rig, spec, cap=False, ponytail=False):
    hc, hr = rig.head_metrics()
    if cap:
        hat(parts, rig, 'para_green', hc, hr, cuff='hivis', snug=0.012, cut=0.012)
        b = parts.new('peak', 'para_green', 'Head')
        front = rig.cast((hc.x, hc.y, hc.z + 0.03), (0, -1, 0))[0]
        add_box(b, (0.15, 0.065, 0.012), (hc.x, front.y - 0.03, hc.z + 0.04), (12, 0, 0), bevel=0.004)
    else:
        hair(parts, rig, 'hair_black', hc, hr)
    if ponytail:
        b = parts.new('ponytail', 'hair_black', 'Head', smooth=True)
        add_cyl(b, 0.012, 0.03, 0.26, (hc.x, hc.y + hr.y + 0.035, hc.z - 0.09), rot=(10, 0, 0), segs=8)
    collar(parts, rig, 'para_green', z=1.56, width=0.05, off=0.012)
    cuffs(parts, rig, 'para_green', width=0.045, wrist_off=0.008)
    cuffs(parts, rig, 'para_trouser', wrist=False, ankle=0.13, width=0.07, ankle_off=0.014)
    b = parts.new('hivis-chest', 'hivis', 'spine_03')
    band(b, rig, (0, 0.03, 1.31), (0, 0, 1), 0.05, off=0.017, n=16, reach=0.4)
    for side, sign in (('l', 1), ('r', -1)):
        b = parts.new('hivis-arm', 'hivis', f'upperarm_{side}')
        band(b, rig, on_bone(rig, 'upperarm_' + side, 0.55), (sign, 0, 0), 0.045, off=0.016, n=10, reach=0.3)
        b = parts.new('hivis-leg', 'hivis', f'calf_{side}')
        band(b, rig, on_bone(rig, 'calf_' + side, 0.6), (0, 0, 1), 0.04, off=0.014, n=10, reach=0.3)
    waist_band(parts, rig, 'black', z=1.05, width=0.1, off=0.016, bone='spine_01', name='belt')
    b = parts.new('radio', 'radio', 'spine_03')
    f = rig.cast((0.09, -1, 1.36), (0, 1, 0))[0]
    add_box(b, (0.06, 0.03, 0.09), (0.1, f.y - 0.018, 1.36), bevel=0.008)
    b = parts.new('pouch', 'black', 'pelvis')
    add_box(b, (0.06, 0.1, 0.12), (-0.2, 0.05, 0.97), bevel=0.01)

# ---------------------------------------------------------------------------
# People: who wears what

INFLATE = {'torso': 0.018, 'arms': 0.015, 'legs': 0.02, 'feet': 0.022, 'hands': 0.006}

def groups(skin, top, bottom, boots, gloves=None, tri=(520, 1000, 720, 300, 240)):
    g = [dict(name='head', mat=skin, regions=['head'] + ([] if gloves else ['hands']), tris=tri[0] + (0 if gloves else 220)),
         dict(name='top', mat=top, regions=['torso', 'arms'], tris=tri[1]),
         dict(name='bottom', mat=bottom, regions=['legs'], tris=tri[2]),
         dict(name='boots', mat=boots, regions=['feet'], tris=tri[3])]
    if gloves:
        g.append(dict(name='gloves', mat=gloves, regions=['hands'], tris=tri[4]))
    return g

SPECS = {
    'rescuer': dict(body='Male', scale=1.02, inflate=INFLATE, gear=gear_rescuer,
                    groups=groups('skin_a', 'red_suit', 'black', 'boot_black', gloves='black')),
    'hiker': dict(body='Male', scale=0.97, inflate=INFLATE, gear=gear_hiker,
                  groups=groups('skin_c', 'orange_jacket', 'grey_trouser', 'boot_brown', gloves='glove_grey')),
    'skier': dict(body='Male', scale=0.99, inflate=dict(INFLATE, legs=0.026), gear=gear_skier,
                  groups=groups('skin_c', 'ski_jacket', 'ski_pants', 'ski_boot', gloves='ski_glove')),
    'driver': dict(body='Male', scale=0.96, inflate=INFLATE, gear=gear_driver,
                   groups=groups('skin_b', 'jumper', 'jeans', 'trainer')),
    'paramedic-1': dict(body='Male', scale=0.98, inflate=INFLATE, gear=lambda p, r, s: gear_paramedic(p, r, s, cap=True),
                        groups=groups('skin_c', 'para_green', 'para_trouser', 'boot_black', gloves='nitrile')),
    'paramedic-2': dict(body='Female', scale=0.97, inflate=INFLATE, gear=lambda p, r, s: gear_paramedic(p, r, s, ponytail=True),
                        groups=groups('skin_d', 'para_green', 'para_trouser', 'boot_black', gloves='nitrile')),
}

# ---------------------------------------------------------------------------
# Poses (standing frame: x to the person's left, -y forward, z up; metres on the 1.81 m base)

def arm_down(sign, out=0.0, fwd=0.0, curl=0.3, shoulder=-0.12):
    return dict(hand=(sign * (0.27 + out), 0.02 - fwd, 1.0), pole=(sign * 0.4, 0.8, -0.2), curl=curl, shoulder=shoulder)

def leg_stand(sign, spread=0.0, fwd=0.0):
    return dict(ankle=(sign * (0.114 + spread), 0.088 - fwd, 0.086), pole=(sign * 0.1, -1, 0))

def pose_stand_wave(side='l', lean=(0, 0, 0), both=False):
    sign = 1 if side == 'l' else -1
    pose = dict(lean=lean, head=(-4, 0, 0))
    pose['arm_' + side] = dict(hand=(sign * 0.46, -0.02, 1.84), pole=(sign * 1.0, 0.5, -0.1), curl=0.1, shoulder=0.35, hand_dir=(sign * 0.2, 0, 1))
    other = 'r' if side == 'l' else 'l'
    pose['arm_' + other] = (dict(hand=(-sign * 0.40, -0.1, 1.80), pole=(-sign * 1.0, 0.5, -0.1), curl=0.1, shoulder=0.3, hand_dir=(-sign * 0.2, 0, 1))
                            if both else arm_down(-sign, out=0.0, fwd=0.05))
    pose['leg_l'] = leg_stand(1, 0.04); pose['leg_r'] = leg_stand(-1, 0.04)
    return pose

def pose_stand_tired(side='l'):
    """The stranded driver: one arm raised, head a little down, weight on one leg."""
    sign = 1 if side == 'l' else -1
    pose = dict(lean=(4, 0, sign * 3), head=(6, 0, 0))
    pose['arm_' + side] = dict(hand=(sign * 0.42, -0.14, 1.64), pole=(sign * 1.0, 0.7, -0.3), curl=0.15, shoulder=0.15, hand_dir=(sign * 0.3, -0.1, 1))
    other = 'r' if side == 'l' else 'l'
    pose['arm_' + other] = dict(hand=(-sign * 0.2, -0.17, 1.1), pole=(-sign * 0.6, 0.9, -0.1), curl=0.35, shoulder=-0.1)
    pose['leg_l'] = leg_stand(1, 0.05); pose['leg_r'] = leg_stand(-1, 0.04, fwd=0.05)
    return pose

def pose_hanging(rescuer=True, pair=False):
    if rescuer:
        pose = dict(lean=(-4, 0, 0), head=(-6, 0, 0))
        if pair:
            # both arms round the casualty, hands gripping his strop at the sides of his chest
            pose['arm_l'] = dict(hand=(0.20, -0.47, 1.36), pole=(1.0, 0.1, -0.2), curl=0.8, shoulder=0.05, hand_dir=(-0.3, -1, -0.2))
            pose['arm_r'] = dict(hand=(-0.20, -0.47, 1.36), pole=(-1.0, 0.1, -0.2), curl=0.8, shoulder=0.05, hand_dir=(0.3, -1, -0.2))
        else:
            # reaching out to the casualty: arms forward and a little apart, hands open
            pose['arm_l'] = dict(hand=(0.24, -0.50, 1.38), pole=(1.0, 0.3, -0.5), curl=0.12, shoulder=0.05, hand_dir=(0.15, -1, -0.15))
            pose['arm_r'] = dict(hand=(-0.20, -0.52, 1.42), pole=(-1.0, 0.3, -0.5), curl=0.12, shoulder=0.05, hand_dir=(-0.1, -1, -0.1))
        # legs hang loose, one knee a little bent
        pose['leg_l'] = dict(ankle=(0.11, -0.06, 0.11), pole=(0.1, -1, 0.2), foot=(0, -0.25, -1), ball=(0, -0.45, -0.9))
        pose['leg_r'] = dict(ankle=(-0.10, 0.04, 0.15), pole=(-0.1, -1, 0.2), foot=(0, -0.25, -1), ball=(0, -0.45, -0.9))
        return pose
    # the casualty hangs limp in the strop: arms draped forward over the rescuer's, head fallen to one side
    pose = dict(lean=(6, 0, 0), neck=(8, 4, 0), head=(14, 14, 0))
    pose['arm_l'] = dict(hand=(0.30, -0.30, 1.20), pole=(1.0, 0.3, -0.6), curl=0.35, shoulder=-0.05)
    pose['arm_r'] = dict(hand=(-0.27, -0.24, 1.10), pole=(-1.0, 0.3, -0.6), curl=0.35, shoulder=-0.05)
    pose['leg_l'] = dict(ankle=(0.10, -0.08, 0.12), pole=(0.1, -1, 0.2), foot=(0, -0.2, -1), ball=(0, -0.3, -0.95))
    pose['leg_r'] = dict(ankle=(-0.12, 0.06, 0.13), pole=(-0.1, -1, 0.2), foot=(0, -0.1, -1), ball=(0, -0.2, -0.95))
    return pose

def pose_sit_hiker():
    pose = dict(pelvis_off=(0, 0.1, -0.8), lean=(-12, 0, 0), head=(14, 0, 0), pelvis_tilt=(-12, 0, 0))
    pose['arm_l'] = dict(hand=(0.1, -0.28, 0.52), pole=(1.0, 0.3, 0.3), curl=0.4, shoulder=-0.1)
    pose['arm_r'] = dict(hand=(-0.1, -0.30, 0.5), pole=(-1.0, 0.3, 0.3), curl=0.4, shoulder=-0.1)
    pose['leg_l'] = dict(ankle=(0.15, -0.38, 0.09), pole=(0.2, -0.2, 1), foot=(0, -1, -0.25), ball=(0, -1, -0.15))
    pose['leg_r'] = dict(ankle=(-0.15, -0.36, 0.09), pole=(-0.2, -0.2, 1), foot=(0, -1, -0.25), ball=(0, -1, -0.15))
    return pose

def pose_sit_skier():
    pose = dict(pelvis_off=(0, 0.12, -0.8), lean=(-22, 0, 0), head=(14, 0, 0), pelvis_tilt=(-15, 0, 0))
    pose['arm_l'] = dict(hand=(0.30, 0.42, 0.07), pole=(0.6, 0.4, -0.2), curl=0.2, shoulder=-0.1)
    pose['arm_r'] = dict(hand=(-0.14, -0.40, 0.42), pole=(-1.0, 0.3, 0.2), curl=0.5, shoulder=-0.1)
    pose['leg_l'] = dict(ankle=(0.17, -0.7, 0.1), pole=(0.2, -0.2, 1), foot=(0, -1, 0.15), ball=(0, -1, 0.1))
    pose['leg_r'] = dict(ankle=(-0.16, -0.46, 0.1), pole=(-0.3, -0.2, 1), foot=(0, -1, -0.1), ball=(0, -1, -0.05))
    return pose

def pose_lying():
    pose = dict(T=Matrix.Rotation(math.radians(-90), 4, 'X'), head=(-5, 0, 0))
    pose['arm_l'] = dict(hand=(0.07, -0.2, 1.1), pole=(1.0, 0.4, 0.0), curl=0.4, shoulder=-0.15)
    pose['arm_r'] = dict(hand=(-0.1, -0.21, 1.08), pole=(-1.0, 0.4, 0.0), curl=0.4, shoulder=-0.15)
    pose['leg_l'] = dict(ankle=(0.12, 0.09, 0.09), pole=(0.2, -1, 0))
    pose['leg_r'] = dict(ankle=(-0.12, 0.09, 0.09), pole=(-0.2, -1, 0))
    return pose

def pose_walk(carry=None):
    pose = dict(lean=(5, 0, 0), head=(-5, 0, 0), pelvis_off=(0, 0, -0.03))
    pose['leg_l'] = dict(ankle=(0.11, -0.30, 0.13), pole=(0.1, -1, 0.2), foot=(0, -1, 0.3), ball=(0, -1, 0.25))
    pose['leg_r'] = dict(ankle=(-0.11, 0.40, 0.21), pole=(-0.1, -1, 0.1), foot=(0, -0.7, -0.7), ball=(0, -1, -0.3))
    pose['arm_l'] = dict(hand=(0.25, 0.30, 1.08), pole=(0.5, 0.8, -0.3), curl=0.3, shoulder=-0.12)
    pose['arm_r'] = dict(hand=(-0.22, -0.28, 1.12), pole=(-0.8, 0.5, -0.5), curl=0.4, shoulder=-0.12)
    if carry == 'bag':
        pose['arm_r'] = dict(hand=(-0.28, -0.1, 0.97), pole=(-0.5, 0.8, -0.2), curl=0.9, shoulder=-0.14, hand_dir=(-0.3, -0.1, -1))
    return pose

# ---------------------------------------------------------------------------
# Finishing: ground, merge, export

def export_scene(name):
    BLEND.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND / f'{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

def clear_scene():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)

def add_static(person, name, matkey, build, smooth=False):
    """Gear added after posing, in final coordinates."""
    bm = bmesh.new(); build(bm)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for poly in me.polygons: poly.use_smooth = smooth
    person.pieces.append((me, matkey, smooth))

def body_bvh(person):
    verts, polys = [], []
    for me, _, _ in person.pieces:
        base = len(verts)
        verts += [v.co.copy() for v in me.vertices]
        polys += [tuple(base + i for i in p.vertices) for p in me.polygons]
    return BVHTree.FromPolygons(verts, polys)

def post_lying(person):
    """A foil blanket over the legs and hips. Everything is then turned and moved so the man lies along
    +Z (head toward +Z), centred on the origin, his back on the floor of the rescue litter (y 0)."""
    bvh = body_bvh(person)
    pad = 0.0
    nx, ny = 14, 28
    def blanket(bm):
        grid = []
        for j in range(ny + 1):
            y = 0.18 + (0.72 - 0.18) * j / ny
            row = []
            for i in range(nx + 1):
                x = -0.27 + 0.54 * i / nx
                zs = []
                for ox, oy in ((0, 0), (0.04, 0), (-0.04, 0), (0, 0.04), (0, -0.04), (0.04, 0.04), (-0.04, -0.04), (0.04, -0.04), (-0.04, 0.04)):
                    hit = bvh.ray_cast(Vector((x + ox, y + oy, 2.0)), Vector((0, 0, -1)))
                    if hit[0] is not None: zs.append(hit[0].z)
                z = (max(zs) + 0.03) if zs else pad + 0.03
                edge = min(i, nx - i)
                z = max(z, pad + 0.03) if edge else pad + 0.03
                z += 0.004 * math.sin(j * 1.7 + i * 0.9)
                row.append(bm.verts.new((x, y, z)))
            grid.append(row)
        for j in range(ny):
            for i in range(nx):
                bm.faces.new([grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]])
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        for f in bm.faces:
            if f.normal.z < 0: f.normal_flip()
    add_static(person, 'blanket', 'foil', blanket, smooth=True)
    ys = [v.co.y for me, _, _ in person.pieces for v in me.vertices]
    mid = (min(ys) + max(ys)) / 2
    M = Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Translation((0, -mid, 0))
    for me, _, _ in person.pieces: me.transform(M)
    person.harness = M @ person.harness
    person.ankles = [M @ a for a in person.ankles]
    person.points = {k: M @ v for k, v in person.points.items()}

def post_bag(person):
    h = person.points['hand_r']
    def bag(bm):
        add_box(bm, (0.13, 0.36, 0.27), (h.x, h.y, h.z - 0.27), bevel=0.025)
    add_static(person, 'bag', 'bag_orange', bag)
    def trim(bm):
        add_box(bm, (0.135, 0.2, 0.05), (h.x, h.y, h.z - 0.3), bevel=0.004)
        add_box(bm, (0.02, 0.18, 0.1), (h.x, h.y, h.z - 0.1), bevel=0.004)
    add_static(person, 'bag-trim', 'bag_white', trim)

def post_skis_on_ground(person):
    def skis(bm):
        for sx in (0.55, 0.68):
            add_box(bm, (0.095, 1.5, 0.014), (sx, 0.45, 0.007), bevel=0.004)
            add_box(bm, (0.095, 0.16, 0.014), (sx, -0.36, 0.02), (14, 0, 0), bevel=0.004)
    add_static(person, 'skis', 'ski_white', skis)

def add_link(bm, a, b, w, t):
    """A flat strap of width w and thickness t from point a to point b (final coordinates)."""
    a, b = Vector(a), Vector(b); d = b - a
    z = d.normalized(); x = z.cross(Vector((0, 1, 0)))
    x = x.normalized() if x.length > 1e-4 else Vector((1, 0, 0))
    y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = (a + b) / 2
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, matrix=M @ Matrix.Diagonal((w, t, d.length, 1)), verts=r['verts'])

def shoulder_tops(person):
    """Where a strap leaves the top of each shoulder (final coordinates)."""
    out = []
    for side in ('l', 'r'):
        h = person.points['upperarm_' + side]
        out.append(Vector((h.x * 0.62, h.y, h.z + 0.085)))
    return out

def hook_height(people):
    """The hook's centre: a hand's breadth above the highest helmet or hair."""
    top = max(v.co.z for person in people for me, _, _ in person.pieces for v in me.vertices)
    return top + 0.30

def build_hook(bm, hx, hy, hz):
    """The line's hook: a steel link under a swivel and an eye; the eye's top is the cable's end."""
    add_ring3d(bm, (hx, hy, hz), (0, 1, 0), 0.052, 0.0095, segs=14, tsegs=6, squash=0.62)
    add_cyl(bm, 0.017, 0.017, 0.07, (hx, hy, hz + 0.085), segs=10)
    add_cyl(bm, 0.026, 0.026, 0.022, (hx, hy, hz + 0.052), segs=10)
    add_ring3d(bm, (hx, hy, hz + 0.155), (1, 0, 0), 0.028, 0.0075, segs=12, tsegs=5)

def add_carabiner(person, face):
    """A steel carabiner clipped through the chest ring. face is +1 where the person faces +y, -1 for -y."""
    c = person.harness
    def build(bm):
        add_ring3d(bm, (c.x, c.y + face * 0.04, c.z - 0.012), (1, 0, 0), 0.052, 0.0075, segs=14, tsegs=5, squash=0.55)
        add_box(bm, (0.016, 0.018, 0.03), (c.x, c.y + face * 0.04, c.z + 0.052), bevel=0.003)
    add_static(person, 'carabiner', 'steel', build, smooth=True)

def lift_straps(person, starts, hook, matkey, width=0.04):
    """Two flat straps from the person's shoulders (or strop) to the bottom of the hook link."""
    low = Vector((hook.x, hook.y, hook.z - 0.052))
    def build(bm):
        for st in starts:
            add_link(bm, st, low, width, 0.012)
    add_static(person, 'lift-straps', matkey, build)

def recentre(people, hook):
    """Move everything so the hook is over the origin; the line then hangs from the middle of the file."""
    M = Matrix.Translation(Vector((-hook.x, -hook.y, 0)))
    for person in people:
        for me, _, _ in person.pieces: me.transform(M)
        person.harness = M @ person.harness
        person.points = {k: M @ v for k, v in person.points.items()}
    return M @ hook

def casualty_strop(person, face):
    """The rescue strop on the casualty, in final coordinates: an orange band round the chest under the
    arms, with a steel chest ring on its front. face is +1 where he faces +y. Returns the points where
    the two straps rise from the band (either side of his chest, in front)."""
    h = person.harness
    top = h.z + 0.15
    centre = Vector((h.x, h.y - face * 0.125, top))
    rx, ry = 0.168, 0.128
    def band(bm):
        pts = []
        n = 20
        for i in range(n):
            a = 2 * math.pi * i / n
            nrm = Vector((math.cos(a) / rx, math.sin(a) / ry, 0)).normalized()
            pts.append((centre + Vector((math.cos(a) * rx, math.sin(a) * ry, 0)), nrm))
        add_ribbon(bm, pts, 0.085, closed=True, side_axis=Vector((0, 0, 1)))
    add_static(person, 'strop', 'strop', band)
    def ring(bm):
        add_ring3d(bm, (h.x, centre.y + face * (ry + 0.02), top - 0.012), (0, 1, 0), 0.03, 0.0065, segs=12, tsegs=5)
    add_static(person, 'strop-ring', 'steel', ring, smooth=True)
    return [Vector((centre.x + sx * 0.10, centre.y + face * (ry - 0.012), top + 0.03)) for sx in (1, -1)]

def finish_hanging(name, person, scale):
    """The rescuer alone on the line."""
    transform_person(person, scale, 0.0, center=False)
    hz = hook_height([person])
    starts = shoulder_tops(person)
    hook = Vector((0, sum(v.y for v in starts) / 2, hz))
    add_carabiner(person, -1)
    lift_straps(person, starts, hook, 'webbing', width=0.045)
    add_static(person, 'hook', 'steel', lambda bm: build_hook(bm, hook.x, hook.y, hook.z), smooth=True)
    hook = recentre([person], hook)
    clear_scene()
    merge_pieces(name, person.pieces)
    add_empty('harness', person.harness)
    tri = triangles()
    print(f'rescue-people: {name} {tri} triangles')
    assert tri <= TRI_LIMIT, f'{name} over budget: {tri}'
    export_scene(name)
    return tri

def finish_pair(name, rescuer, casualty, scale_r, scale_c, gap=0.31):
    """The rescuer and the casualty face to face, both clipped to one hook: the casualty (turned about) hangs
    chest to chest in front of the rescuer, a little lower, in an orange strop."""
    transform_person(rescuer, scale_r, 0.0, center=False)
    transform_person(casualty, scale_c, None, center=False)
    turn = Matrix.Rotation(math.pi, 4, 'Z')
    for me, _, _ in casualty.pieces: me.transform(turn)
    casualty.harness = turn @ casualty.harness
    casualty.points = {k: turn @ v for k, v in casualty.points.items()}
    dz = rescuer.harness.z - casualty.harness.z - 0.09
    shift = Vector((rescuer.harness.x - casualty.harness.x, rescuer.harness.y - gap - casualty.harness.y, dz))
    for me, _, _ in casualty.pieces: me.transform(Matrix.Translation(shift))
    casualty.harness += shift
    casualty.points = {k: v + shift for k, v in casualty.points.items()}
    hz = hook_height([rescuer, casualty])
    r_starts = shoulder_tops(rescuer)
    c_starts = casualty_strop(casualty, +1)
    hook = Vector((0, (rescuer.harness.y + casualty.harness.y) / 2, hz))
    add_carabiner(rescuer, -1)
    lift_straps(rescuer, r_starts, hook, 'webbing', width=0.045)
    lift_straps(casualty, c_starts, hook, 'strop', width=0.04)
    # a short strap links the two chest rings through the carabiner
    def link(bm):
        add_link(bm, rescuer.harness + Vector((0, -0.04, 0)), casualty.harness + Vector((0, 0.03, 0.15)), 0.03, 0.01)
    add_static(rescuer, 'chest-link', 'strop', link)
    add_static(rescuer, 'hook', 'steel', lambda bm: build_hook(bm, hook.x, hook.y, hook.z), smooth=True)
    hook = recentre([rescuer, casualty], hook)
    clear_scene()
    merge_pieces('rescuer', rescuer.pieces)
    merge_pieces('casualty', casualty.pieces)
    add_empty('harness', rescuer.harness)
    tri = triangles()
    print(f'rescue-people: {name} {tri} triangles')
    assert tri <= TRI_LIMIT, f'{name} over budget: {tri}'
    export_scene(name)
    return tri

def finish_single(name, person, scale, drop_to=0.0, post=None, center=True):
    transform_person(person, scale, drop_to, center=center)
    if post: post(person)
    clear_scene()
    merge_pieces(name, person.pieces)
    add_empty('harness', person.harness)
    tri = triangles()
    print(f'rescue-people: {name} {tri} triangles')
    assert tri <= TRI_LIMIT, f'{name} over budget: {tri}'
    export_scene(name)
    return tri

def make(name):
    """Build one finished file."""
    reset(); MATS.clear()
    if name == 'rescuer-hanging':
        sp = SPECS['rescuer']; p = build_person(sp, pose_hanging(True), sp['gear'])
        return finish_hanging(name, p, sp['scale'])
    if name == 'rescuer-casualty-hanging':
        sr, sc = SPECS['rescuer'], SPECS['driver']
        pr = build_person(sr, pose_hanging(True, pair=True), sr['gear'], tri_scale=0.7)
        pc = build_person(sc, pose_hanging(False), sc['gear'], tri_scale=0.7)
        return finish_pair(name, pr, pc, sr['scale'], sc['scale'])
    if name == 'hiker-standing':
        sp = SPECS['hiker']; p = build_person(sp, pose_stand_wave('l'), sp['gear'])
        return finish_single(name, p, sp['scale'])
    if name == 'skier-standing':
        sp = SPECS['skier']; p = build_person(sp, pose_stand_wave('r', both=True), sp['gear'])
        return finish_single(name, p, sp['scale'])
    if name == 'driver-standing':
        sp = SPECS['driver']; p = build_person(sp, pose_stand_tired('l'), sp['gear'])
        return finish_single(name, p, sp['scale'])
    if name == 'hiker-sitting':
        sp = SPECS['hiker']; p = build_person(sp, pose_sit_hiker(), sp['gear'])
        return finish_single(name, p, sp['scale'])
    if name == 'skier-sitting':
        sp = SPECS['skier']; p = build_person(sp, pose_sit_skier(), lambda a, b, c: gear_skier(a, b, c, skis=False))
        return finish_single(name, p, sp['scale'], post=post_skis_on_ground)
    if name == 'driver-lying':
        sp = SPECS['driver']; p = build_person(sp, pose_lying(), sp['gear'])
        return finish_single(name, p, sp['scale'], drop_to=0.0, post=post_lying, center=False)
    if name == 'hiker-walking':
        sp = SPECS['hiker']; p = build_person(sp, pose_walk(), sp['gear'])
        return finish_single(name, p, sp['scale'])
    if name == 'paramedic-1-walking':
        sp = SPECS['paramedic-1']; p = build_person(sp, pose_walk('bag'), sp['gear'])
        return finish_single(name, p, sp['scale'], post=post_bag)
    if name == 'paramedic-2-walking':
        sp = SPECS['paramedic-2']; p = build_person(sp, pose_walk(), sp['gear'])
        return finish_single(name, p, sp['scale'])
    raise SystemExit(f'unknown file {name}')

# ---------------------------------------------------------------------------
# Review renders: each finished GLB on a plain grey floor, two views

def render_glb(name, folder):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(OUT / f'{name}.glb'))
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2; size = max((hi - lo).length, 0.5)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
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
    cd.lens = 50
    views = {'': (-0.55, -1.0), 'back': (0.75, 0.85), 'side': (-1.0, 0.05)}  # front three-quarter, back three-quarter, side
    for suffix, (vx, vy) in views.items():
        direction = Vector((vx, vy, 0.28)).normalized()
        cam.location = centre + direction * size * 2.15
        cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}{"-" + suffix if suffix else ""}.png')
        bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------------------
# Entry point

wanted = [n for n in NAMES if not options.only or n in options.only.split(',')]
for name in wanted:
    make(name)
if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    for name in wanted:
        render_glb(name, folder)
