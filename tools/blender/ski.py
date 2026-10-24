# Art for H5 Skiing (SKI-ART, docs/HELI_SKIING.md section 8): the skier in seven poses, the
# guide and four guests, the slalom and giant-slalom gates, the timing arches, the pad flags,
# the kicker lip and the orange safety netting. Original clothing, gear and poses; the bodies
# start from the CC0 Quaternius "Universal Base Characters [Standard]" rig, posed and thinned
# by the same kit as the rescue people (tools/blender/rescue-people.py, whose helpers this
# recipe reuses: it reads that file up to its `make` function, so a change there reaches here).
# Nothing from the library is copied into the repository: only the finished GLBs are.
# Metres, glTF +Y up, +Z forward. Output in public/assets/models/ski/:
#   skier-stand, skier-crouch, skier-lean-left, skier-lean-right, skier-tuck, skier-air,
#   skier-tumble     the player's skier in a one-piece suit with helmet, goggles, skis and poles.
#                    Origin on the snow under the boots' midpoint (the same point in every pose, so
#                    the game swaps poses without a jump; in the air the skier sits above it).
#                    Materials named for recolouring: `suit_primary` (the driver's colour),
#                    `suit_secondary` (collar, belt and chest band) and `helmet_shell`; skin,
#                    boots, gloves, goggles, skis and poles keep their own.
#   guide            standing, the lodge's red jacket, a chest radio with antenna, a red helmet
#   guest-1 .. guest-4   standing, other suit colours (one a woman)
#   pole-red, pole-blue          one slalom pole, base on the snow at the origin, 1.8 m tall
#   gate-red, gate-blue          a giant-slalom gate: two poles 4.2 m apart (along X), each with a
#                                panel; origin on the snow at the middle
#   arch-start, arch-finish      a small timing arch, posts 6 m apart (along X), board across the top
#   flag-drop, flag-pickup       one pad flag on its pole, origin at its foot
#   kicker                       the snow kicker with a wooden lip, 8 m wide (X), the lip at +Z end,
#                                origin on the snow at the middle of the foot of the ramp
#   netting                      a 12 m run of orange safety netting on posts (along X), origin at
#                                the middle of its foot
# Run: blender -b --factory-startup --python tools/blender/ski.py -- --root . [--only a,b] [--render DIR]
# The base library is read from DUEL_ART_LIBRARY (default C:/Users/kyleb/dev/art-library).
import json, math, sys
from pathlib import Path

SKI_NAMES = ['skier-stand', 'skier-crouch', 'skier-lean-left', 'skier-lean-right', 'skier-tuck', 'skier-air', 'skier-tumble',
         'guide', 'guest-1', 'guest-2', 'guest-3', 'guest-4',
         'pole-red', 'pole-blue', 'gate-red', 'gate-blue', 'arch-start', 'arch-finish', 'flag-drop', 'flag-pickup',
         'kicker', 'netting']
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
_root = Path(_argv[_argv.index('--root') + 1]).resolve()
if '--paths-only' in _argv:
    out = _root / 'public/assets/models/ski'; blend = _root / 'art-build/ski'
    print(json.dumps({'blend': [str(blend / f'{n}.blend') for n in SKI_NAMES], 'glb': [str(out / f'{n}.glb') for n in SKI_NAMES], 'json': []}))
    sys.exit(0)

# The rescue people's kit: everything above its `make` function (arguments, the rig, posing, geometry helpers).
_source = (_root / 'tools/blender/rescue-people.py').read_text(encoding='utf8')
_cut = _source.index('\ndef make(name):')
exec(compile(_source[:_cut], 'rescue-people.py', 'exec'), globals())
OUT = root / 'public/assets/models/ski'
BLEND = root / 'art-build/ski'
CACHE = root / 'art-build/ski/_base'
TRI_LIMIT = 5200
from mathutils import noise

# ---------------------------------------------------------------------------
# Colours: the suit's named materials are what the game recolours.

COLOURS.update({
    'suit_primary': ((0.015, 0.16, 0.38), 0.55), 'suit_secondary': ((0.62, 0.62, 0.64), 0.6),
    'helmet_shell': ((0.62, 0.63, 0.66), 0.3), 'ski_deck': ((0.05, 0.05, 0.055), 0.4), 'ski_top': ((0.55, 0.12, 0.04), 0.4),
    'pole_shaft': ((0.07, 0.07, 0.075), 0.35, 0.8), 'pole_grip': ((0.025, 0.025, 0.03), 0.8), 'pole_basket': ((0.03, 0.03, 0.035), 0.7),
    'guide_dark': ((0.03, 0.03, 0.035), 0.7), 'radio_body': ((0.02, 0.02, 0.025), 0.5),
    # course pieces
    'slalom_red': ((0.55, 0.025, 0.02), 0.45), 'slalom_blue': ((0.02, 0.08, 0.5), 0.45), 'rubber': ((0.025, 0.025, 0.027), 0.9),
    'panel_red': ((0.62, 0.03, 0.025), 0.5), 'panel_blue': ((0.02, 0.10, 0.58), 0.5), 'panel_white': ((0.66, 0.67, 0.68), 0.6),
    'aluminium': ((0.55, 0.57, 0.6), 0.4, 1.0), 'timber': ((0.36, 0.22, 0.11), 0.85), 'timber_dark': ((0.17, 0.10, 0.055), 0.9),
    'snow': ((0.78, 0.82, 0.88), 0.9), 'snow_blue': ((0.62, 0.70, 0.82), 0.9),
    'net_orange': ((0.75, 0.22, 0.015), 0.85), 'post_grey': ((0.20, 0.21, 0.22), 0.6, 0.6), 'banner_dark': ((0.05, 0.06, 0.07), 0.6),
    'banner_white': ((0.72, 0.72, 0.70), 0.6), 'flag_orange': ((0.72, 0.28, 0.02), 0.7), 'flag_green': ((0.04, 0.34, 0.12), 0.7),
    'checker_black': ((0.02, 0.02, 0.022), 0.6), 'eye_lens': ((0.4, 0.05, 0.03), 0.2),
})

# ---------------------------------------------------------------------------
# The ski suit: gear on the rest pose, tied to bones. The skis and poles are added after posing.

def gear_ski_suit(parts, rig, spec):
    hc, hr = rig.head_metrics()
    bvh = helmet(parts, rig, 'helmet_shell', hc, hr)
    gb = parts.new('goggle-strap', 'goggle_strap', 'Head')
    band(gb, rig, (hc.x, hc.y, hc.z + 0.012), (0, 0, 1), 0.045, off=0.006, n=18)
    front = rig.cast((hc.x, hc.y, hc.z + 0.012), (0, -1, 0))[0]
    if front is not None:
        fb = parts.new('goggle-frame', 'goggle_strap', 'Head', smooth=True)
        add_sphere(fb, (0.074, 0.026, 0.040), (hc.x, front.y + 0.002, hc.z + 0.012), u=18, v=10)
        lb = parts.new('goggle-lens', 'goggle_lens', 'Head', smooth=True)
        add_sphere(lb, (0.066, 0.026, 0.033), (hc.x, front.y - 0.010, hc.z + 0.012), u=18, v=10)
    collar(parts, rig, 'suit_secondary', z=1.60, width=0.045, off=0.01)
    cuffs(parts, rig, 'ski_glove', width=0.055, wrist_off=0.01)
    waist_band(parts, rig, 'suit_secondary', z=1.05, width=0.09, off=0.016)
    b = parts.new('chest-band', 'suit_secondary', 'spine_03')
    band(b, rig, (0, 0.03, 1.36), (0, 0, 1), 0.028, off=0.012, n=16, reach=0.4)
    for side in ('l', 'r'):
        b = parts.new('boot-shell', 'ski_boot', f'calf_{side}', smooth=False)
        c = on_bone(rig, 'calf_' + side, 0.8)
        add_box(b, (0.125, 0.15, 0.2), (c.x, c.y + 0.004, c.z + 0.015), bevel=0.02)
    if spec.get('radio'):
        # The guide's chest radio: a body on the left of the chest, its antenna, and a mic clipped at the shoulder.
        hit, nrm = rig.cast((0.085, -1, 1.30), (0, 1, 0))
        if hit is not None:
            rb = parts.new('radio', 'radio_body', 'spine_03', smooth=False)
            add_box(rb, (0.07, 0.038, 0.115), (hit.x, hit.y - 0.018, hit.z), bevel=0.008)
            add_cyl(rb, 0.006, 0.004, 0.2, (hit.x + 0.025, hit.y - 0.012, hit.z + 0.15), segs=6)
        hit, nrm = rig.cast((0.15, -1, 1.45), (0, 1, 0))
        if hit is not None:
            mb = parts.new('mic', 'radio_body', 'spine_03', smooth=False)
            add_box(mb, (0.035, 0.03, 0.05), (hit.x, hit.y - 0.014, hit.z), bevel=0.006)

def oriented_box(bm, centre, right, fwd, up, size, bevel=0.0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    M = Matrix([[right.x * size[0], fwd.x * size[1], up.x * size[2], centre.x],
                [right.y * size[0], fwd.y * size[1], up.y * size[2], centre.y],
                [right.z * size[0], fwd.z * size[1], up.z * size[2], centre.z],
                [0, 0, 0, 1]])
    bmesh.ops.transform(bm, matrix=M, verts=r['verts'])
    if bevel:
        edges = list({e for v in r['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect='EDGES')

def rod(bm, a, b, r0, r1=None, segs=8):
    """A tapering cylinder from point a to point b."""
    a, b = Vector(a), Vector(b); d = b - a
    e = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    add_cyl(bm, r0, r1 if r1 is not None else r0, d.length, (a + b) / 2, (math.degrees(e.x), math.degrees(e.y), math.degrees(e.z)), segs=segs)

def to_mesh(bm):
    me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); return me

def add_part(person, name, matkey, bm, smooth=False):
    me = to_mesh(bm)
    for poly in me.polygons: poly.use_smooth = smooth
    person.pieces.append((me, matkey, smooth))

def add_skis_and_poles(person, pose, s):
    """Skis (one per foot) and poles (one per hand) in final coordinates. pose['ski'] gives each ski's
    forward vector and roll; pose['poles'] each pole's direction grip to tip (the standing frame, turned by pose['T'])."""
    T = pose.get('T', Matrix.Identity(4)); R = T.to_3x3()
    for idx, side in enumerate(('l', 'r')):
        fwd_spec, roll = pose['ski'][side]
        f = (R @ Vector(fwd_spec)).normalized()
        right = (R @ Vector((0, 0, 1))).cross(f).normalized()
        up = f.cross(right).normalized()
        rot = Matrix.Rotation(math.radians(roll), 3, f)
        right = (rot @ right).normalized(); up = (rot @ up).normalized()
        ankle = person.ankles[idx]
        centre = ankle + (f * 0.438 - up * 0.136) * s
        deck = bmesh.new()
        oriented_box(deck, centre, right, f, up, (0.095 * s, 1.5 * s, 0.014 * s), bevel=0.003 * s)
        tip_f = (Matrix.Rotation(math.radians(-18), 3, right) @ f).normalized()
        oriented_box(deck, centre + f * 0.72 * s + up * 0.012 * s, right, tip_f, right.cross(tip_f).normalized(), (0.092 * s, 0.17 * s, 0.014 * s), bevel=0.003 * s)
        add_part(person, f'ski_{side}', 'ski_deck', deck)
        topb = bmesh.new()
        oriented_box(topb, centre + up * 0.0085 * s + f * 0.05 * s, right, f, up, (0.07 * s, 1.0 * s, 0.004 * s))
        add_part(person, f'ski_top_{side}', 'ski_top', topb)
        bind = bmesh.new()
        oriented_box(bind, ankle + (f * 0.118 - up * 0.114) * s, right, f, up, (0.08 * s, 0.28 * s, 0.035 * s), bevel=0.01 * s)
        add_part(person, f'binding_{side}', 'guide_dark', bind)
    for side in ('l', 'r'):
        hand = person.points['hand_' + side]
        pd = (R @ Vector(pose['poles'][side])).normalized()
        top = hand - pd * 0.10 * s; tip = hand + pd * 1.10 * s
        pb = bmesh.new(); rod(pb, top, hand + pd * 0.08 * s, 0.016 * s, 0.0155 * s, 8)
        add_part(person, f'pole_grip_{side}', 'pole_grip', pb, True)
        sb = bmesh.new(); rod(sb, hand + pd * 0.08 * s, tip, 0.0085 * s, 0.006 * s, 6)
        add_part(person, f'pole_shaft_{side}', 'pole_shaft', sb, True)
        kb = bmesh.new()
        rod(kb, tip - pd * 0.09 * s, tip - pd * 0.075 * s, 0.045 * s, 0.045 * s, 12)
        rod(kb, tip - pd * 0.075 * s, tip - pd * 0.02 * s, 0.045 * s, 0.012 * s, 12)
        add_part(person, f'pole_basket_{side}', 'pole_basket', kb)

# ---------------------------------------------------------------------------
# Poses (standing frame: x to the person's left, -y forward, z up; metres on the 1.81 m base)

F = (0, -1, 0)

def hold(sign, x=0.30, y=-0.28, z=1.02, curl=0.7):
    return dict(hand=(sign * x, y, z), pole=(sign * 1.0, 0.6, -0.3), curl=curl, shoulder=-0.05)

def legs(spread=0.03):
    return {'leg_l': dict(ankle=(0.114 + spread, 0.088, 0.086), pole=(0.1, -1, 0)),
            'leg_r': dict(ankle=(-0.114 - spread, 0.088, 0.086), pole=(-0.1, -1, 0))}

def ski_plain(f=F, roll=0.0):
    return {'l': (f, roll), 'r': (f, roll)}

def pose_ski_stand():
    pose = dict(lean=(0, 0, 0), head=(-3, 0, 0), arm_l=hold(1), arm_r=hold(-1))
    pose.update(legs()); pose['ski'] = ski_plain(); pose['poles'] = {'l': (0.06, 0.10, -1), 'r': (-0.06, 0.10, -1)}
    return pose

def pose_ski_crouch():
    pose = dict(pelvis_off=(0, 0.06, -0.22), lean=(22, 0, 0), head=(-16, 0, 0), arm_l=hold(1, 0.31, -0.42, 0.88), arm_r=hold(-1, 0.31, -0.42, 0.88))
    pose.update(legs(0.04)); pose['ski'] = ski_plain(); pose['poles'] = {'l': (0.05, 0.55, -0.85), 'r': (-0.05, 0.55, -0.85)}
    return pose

def pose_ski_lean(sign):
    """A carved turn to the left (sign 1) or right (-1): hips in, shoulders over the skis, the skis on edge."""
    pose = dict(pelvis_off=(sign * 0.13, 0.0, -0.20), lean=(18, sign * 11, 0), pelvis_tilt=(0, sign * 6, 0), head=(-12, 0, 0),
                arm_l=hold(1, 0.31, -0.40, 0.90), arm_r=hold(-1, 0.31, -0.40, 0.90))
    pose.update(legs(0.06))
    pose['leg_l']['ankle'] = (0.114 + 0.06 + sign * 0.07, 0.088, 0.086); pose['leg_r']['ankle'] = (-0.114 - 0.06 + sign * 0.07, 0.088, 0.086)
    pose['ski'] = ski_plain(roll=sign * 24.0)
    pose['poles'] = {'l': (0.05, 0.5, -0.85), 'r': (-0.05, 0.5, -0.85)}
    return pose

def pose_ski_tuck():
    pose = dict(pelvis_off=(0, 0.22, -0.56), lean=(74, 0, 0), head=(-52, 0, 0), pelvis_tilt=(20, 0, 0),
                arm_l=dict(hand=(0.10, -0.62, 0.78), pole=(1.0, 0.3, -0.2), curl=0.8, shoulder=0.0),
                arm_r=dict(hand=(-0.10, -0.62, 0.78), pole=(-1.0, 0.3, -0.2), curl=0.8, shoulder=0.0))
    pose.update(legs(0.0)); pose['ski'] = ski_plain(); pose['poles'] = {'l': (0.02, 0.98, 0.12), 'r': (-0.02, 0.98, 0.12)}
    return pose

def pose_ski_air():
    pose = dict(pelvis_off=(0, 0.08, -0.22), lean=(18, 0, 0), head=(-12, 0, 0),
                arm_l=dict(hand=(0.56, -0.12, 1.14), pole=(1.0, 0.7, -0.1), curl=0.7, shoulder=0.2),
                arm_r=dict(hand=(-0.56, -0.12, 1.14), pole=(-1.0, 0.7, -0.1), curl=0.7, shoulder=0.2))
    pose['leg_l'] = dict(ankle=(0.15, 0.12, 0.46), pole=(0.1, -1, 0), foot=(0.05, -1, 0.3), ball=(0.05, -1, 0.25))
    pose['leg_r'] = dict(ankle=(-0.15, 0.10, 0.42), pole=(-0.1, -1, 0), foot=(-0.05, -1, 0.3), ball=(-0.05, -1, 0.25))
    pose['ski'] = {'l': ((0.07, -1, 0.26), 3.0), 'r': ((-0.07, -1, 0.24), -3.0)}
    pose['poles'] = {'l': (0.35, 0.85, -0.3), 'r': (-0.35, 0.85, -0.3)}
    return pose

def pose_ski_tumble():
    T = Matrix.Translation((0, -0.05, 0.62)) @ Matrix.Rotation(math.radians(78), 4, 'X') @ Matrix.Rotation(math.radians(-26), 4, 'Y')
    pose = dict(T=T, lean=(8, 0, 10), head=(-20, 0, 8), pelvis_tilt=(8, 0, 0),
                arm_l=dict(hand=(0.88, -0.15, 1.30), pole=(1.0, 0.4, -0.2), curl=0.3, shoulder=0.4),
                arm_r=dict(hand=(-0.30, -0.55, 1.50), pole=(-1.0, 0.4, 0.4), curl=0.3, shoulder=0.3))
    pose['leg_l'] = dict(ankle=(0.42, 0.28, 0.46), pole=(0.3, -1, 0.3), foot=(0.5, -0.5, 0.4), ball=(0.5, -0.5, 0.4))
    pose['leg_r'] = dict(ankle=(-0.28, 0.12, 0.10), pole=(-0.3, -1, 0.2), foot=(-0.6, -0.3, 0.2), ball=(-0.6, -0.3, 0.2))
    pose['ski'] = {'l': ((0.5, -0.5, 0.45), 0.0), 'r': ((-0.8, -0.3, 0.1), 40.0)}
    pose['poles'] = {'l': (0.6, 0.5, -0.5), 'r': (-0.3, 0.6, 0.7)}
    return pose

# ---------------------------------------------------------------------------
# Who wears what

GUESTS = {
    'guest-1': dict(body='Male', scale=1.00, primary=(0.62, 0.45, 0.02), secondary=(0.03, 0.03, 0.035), skin='skin_a', helmet=(0.03, 0.03, 0.035)),
    'guest-2': dict(body='Female', scale=0.96, primary=(0.03, 0.30, 0.13), secondary=(0.62, 0.62, 0.60), skin='skin_d', helmet=(0.55, 0.55, 0.55)),
    'guest-3': dict(body='Male', scale=0.93, primary=(0.30, 0.06, 0.36), secondary=(0.35, 0.35, 0.37), skin='skin_b', helmet=(0.18, 0.08, 0.28)),
    'guest-4': dict(body='Male', scale=1.03, primary=(0.62, 0.20, 0.02), secondary=(0.02, 0.04, 0.12), skin='skin_c', helmet=(0.04, 0.05, 0.12)),
}

def spec_for(body='Male', scale=0.99, skin='skin_c', radio=False):
    return dict(body=body, scale=scale, inflate=dict(INFLATE, legs=0.026, torso=0.022), gear=gear_ski_suit,
                groups=groups(skin, 'suit_primary', 'suit_primary', 'ski_boot', gloves='ski_glove'), radio=radio)

def set_suit(primary, secondary, helmet):
    COLOURS['suit_primary'] = (primary, 0.55); COLOURS['suit_secondary'] = (secondary, 0.6); COLOURS['helmet_shell'] = (helmet, 0.3)

def build_ski_person(pose, spec, name):
    """Build, put the skis' underside on the snow at the origin (the same offset in every pose), add skis and poles."""
    scale = spec['scale']
    person = build_person(spec, pose, spec['gear'])
    transform_person(person, scale, drop_to=None)
    add_skis_and_poles(person, pose, scale)
    # The skis' underside sits 0.057 m (on the 1.81 m body) under the ankles of the standing pose: that is the snow.
    M = Matrix.Translation((0, 0, 0.057 * scale))
    for me, _, _ in person.pieces: me.transform(M)
    clear_scene()
    merge_pieces(name, person.pieces)
    tri = triangles()
    print(f'ski: {name} {tri} triangles')
    assert tri <= TRI_LIMIT, f'{name} over budget: {tri}'
    export_scene(name)
    return tri

POSES = {'skier-stand': pose_ski_stand, 'skier-crouch': pose_ski_crouch, 'skier-lean-left': lambda: pose_ski_lean(1),
         'skier-lean-right': lambda: pose_ski_lean(-1), 'skier-tuck': pose_ski_tuck, 'skier-air': pose_ski_air, 'skier-tumble': pose_ski_tumble}

def make_figure(name):
    reset(); MATS.clear()
    if name in POSES:
        set_suit((0.015, 0.16, 0.38), (0.62, 0.62, 0.64), (0.62, 0.63, 0.66))
        return build_ski_person(POSES[name](), spec_for(), name)
    if name == 'guide':
        set_suit((0.42, 0.03, 0.02), (0.03, 0.03, 0.035), (0.42, 0.03, 0.02))
        return build_ski_person(pose_ski_stand(), spec_for(scale=1.01, radio=True), name)
    if name in GUESTS:
        g = GUESTS[name]
        set_suit(g['primary'], g['secondary'], g['helmet'])
        return build_ski_person(pose_ski_stand(), spec_for(g['body'], g['scale'], g['skin']), name)
    return None

# ---------------------------------------------------------------------------
# Course pieces (original geometry; one colour per material, metres, origin on the snow)

def box(name, key, size, loc, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat(key))
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 1
        bpy.ops.object.modifier_apply(modifier='bevel')
    return ob

def cyl(name, key, r, depth, loc, rot=(0, 0, 0), verts=10, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object; ob.name = name; ob.data.materials.append(mat(key)); return ob

def tube(name, key, points, radius, res=0):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = res; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for pt, co in zip(sp.points, points): pt.co = (*co, 1)
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat(key)); return ob

def join_all(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]; bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name; return ob

def text_mesh(name, body, size, loc, rot, key):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = 0.006; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat(key)); return ob

def finish_piece(name, parts, limit=6000):
    ob = join_all(name, parts)
    for pl in ob.data.polygons: pl.use_smooth = False
    tri = triangles()
    print(f'ski: {name} {tri} triangles')
    assert tri <= limit, f'{name} over budget: {tri}'
    BLEND.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND / f'{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

# Blender Z is up and Blender -Y becomes glTF +Z: a piece "facing +Z" in the file faces -Y here.

def slalom_pole(colour, at=(0, 0), tall=1.8):
    """A slalom pole: a rubber hinge on the snow, a flexible shaft, a scuffed tip."""
    x, y = at; key = 'slalom_' + colour
    parts = [cyl('hinge', 'rubber', 0.032, 0.16, (x, y, 0.08), verts=12),
             cyl('hinge_ring', 'post_grey', 0.036, 0.025, (x, y, 0.17), verts=12),
             cyl('shaft', key, 0.0135, tall - 0.17, (x, y, 0.17 + (tall - 0.17) / 2), verts=10),
             cyl('cap', 'rubber', 0.0145, 0.03, (x, y, tall + 0.012), verts=10)]
    return parts

def build_pole(colour):
    return finish_piece('pole-' + colour, slalom_pole(colour))

def build_gate(colour):
    """A giant-slalom gate: two poles 4.2 m apart; each carries a panel on its inside, hung from two clips."""
    key = 'panel_' + colour; parts = []
    for side in (-1, 1):
        x = side * 2.1
        parts += slalom_pole(colour, (x, 0), 1.95)
        # the panel: a coloured sheet in a white edge, 0.75 m across and 0.5 m high, on the inside of the pole
        cx = x - side * 0.42
        parts.append(box('panel', key, (0.72, 0.018, 0.46), (cx, 0, 1.42), bevel=0.004))
        parts.append(box('panel_edge_top', 'panel_white', (0.75, 0.02, 0.025), (cx, 0, 1.665)))
        parts.append(box('panel_edge_bottom', 'panel_white', (0.75, 0.02, 0.025), (cx, 0, 1.175)))
        parts.append(box('panel_edge_in', 'panel_white', (0.025, 0.02, 0.5), (cx - side * 0.37, 0, 1.42)))
        for z in (1.62, 1.22):
            parts.append(box('clip', 'post_grey', (0.05, 0.03, 0.03), (x - side * 0.03, 0, z)))
    return finish_piece('gate-' + colour, parts)

def build_arch(kind):
    """A small timing arch: two truss posts 6 m apart, a truss beam, a board with the word, timing eyes under the beam."""
    parts = []
    for side in (-1, 1):
        x = side * 3.0
        for dx, dy in ((-0.1, -0.1), (0.1, -0.1), (0.1, 0.1), (-0.1, 0.1)):
            parts.append(cyl('chord', 'aluminium', 0.016, 3.2, (x + dx, dy, 1.6), verts=8))
        for k in range(8):
            parts.append(tube('brace', 'aluminium', [(x - 0.1, -0.1, 0.25 + k * 0.38), (x + 0.1, -0.1, 0.25 + (k + 1) * 0.38)], 0.008))
        parts.append(box('foot', 'rubber', (0.5, 0.5, 0.1), (x, 0, 0.05), bevel=0.02))
        for dy in (-0.55, 0.55):
            parts.append(box('ballast', 'banner_dark', (0.35, 0.22, 0.2), (x, dy, 0.1), bevel=0.03))
    for dy in (-0.1, 0.1):
        for dz in (3.1, 3.3):
            parts.append(cyl('beam', 'aluminium', 0.016, 6.2, (0, dy, dz), (0, math.radians(90), 0), verts=8))
    for k in range(30):
        parts.append(tube('beam_brace', 'aluminium', [(-3.05 + k * 0.205, -0.1, 3.1), (-3.05 + (k + 0.5) * 0.205, -0.1, 3.3)], 0.006))
    # the board hung on the beam's front (the +Z side is -Y here)
    parts.append(box('board', 'banner_dark', (5.4, 0.03, 0.62), (0, -0.16, 2.72), bevel=0.01))
    parts.append(box('board_edge_a', 'banner_white', (5.4, 0.032, 0.03), (0, -0.162, 3.03)))
    parts.append(box('board_edge_b', 'banner_white', (5.4, 0.032, 0.03), (0, -0.162, 2.41)))
    word = 'START' if kind == 'start' else 'FINISH'
    parts.append(text_mesh('word', word, 0.46, (0, -0.19, 2.72), (math.radians(90), 0, 0), 'banner_white'))
    if kind == 'finish':
        for k in range(36):
            if k % 2 == 0:
                parts.append(box('check', 'checker_black', (0.15, 0.034, 0.075), (-2.62 + k * 0.15, -0.165, 3.0)))
                parts.append(box('check', 'checker_black', (0.15, 0.034, 0.075), (-2.62 + (k + 1) * 0.15, -0.165, 2.925)))
    # timing eyes: a small box and a red lens on each post, facing across the course
    for side in (-1, 1):
        parts.append(box('eye_body', 'post_grey', (0.12, 0.09, 0.12), (side * 2.87, -0.02, 0.95), bevel=0.01))
        parts.append(box('eye_lens', 'eye_lens', (0.04, 0.05, 0.05), (side * 2.87 - side * 0.07, -0.02, 0.95)))
    return finish_piece('arch-' + kind, parts, 9000)

def build_flag(kind):
    """A pad flag: a thin pole, a long pennant, a ground spike; orange for the drop, green for the pickup."""
    key = 'flag_orange' if kind == 'drop' else 'flag_green'
    parts = [cyl('pole', 'timber', 0.014, 2.6, (0, 0, 1.3), verts=8, r2=0.011), cyl('spike', 'post_grey', 0.02, 0.2, (0, 0, 0.03), verts=8, r2=0.004)]
    me = bpy.data.meshes.new('pennant')
    verts = [(0.014, 0, 2.52), (0.014, 0, 2.18), (0.78, 0.06, 2.35), (0.30, 0.04, 2.38)]
    me.from_pydata(verts, [], [(0, 1, 2, 3)]); me.update()
    ob = bpy.data.objects.new('pennant', me); bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(mat(key))
    sol = ob.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = 0.006
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='solid')
    parts.append(ob)
    return finish_piece('flag-' + kind, parts)

def build_kicker():
    """A snow kicker: a curved ramp 8 m wide rising 1.4 m over 5 m to a lip, banks at the sides, a wooden lip board
    and a steep snow face under it. +Z (Blender -Y) is the way the skier goes."""
    nx, nz = 16, 40
    def profile(u): return 1.4 * u ** 2.2
    verts = []; faces = []
    for j in range(nz + 1):
        u = j / nz; z = -2.5 + 5.0 * u; h = profile(u)
        for i in range(nx + 1):
            fx = -1 + 2 * i / nx; x = fx * 4.0
            bank = 0.28 * max(0.0, abs(fx) - 0.80) / 0.20
            wob = noise.noise(Vector((x * 0.5, z * 0.5, 1.0))) * 0.03
            verts.append((x * (1 + 0.04 * bank), -z, h + bank * (0.35 + 0.65 * u) + wob))
    for j in range(nz):
        for i in range(nx):
            a_ = j * (nx + 1) + i
            faces.append((a_, a_ + 1, a_ + nx + 2, a_ + nx + 1))
    ramp = bpy.data.meshes.new('ramp'); ramp.from_pydata(verts, [], faces); ramp.update()
    ob = bpy.data.objects.new('ramp', ramp); bpy.context.scene.collection.objects.link(ob); ob.data.materials.append(mat('snow'))
    parts = [ob]
    # two ski tracks down the ramp, shallow grooves in a slightly bluer snow
    for tx in (-0.55, 0.55):
        for j in range(0, nz, 2):
            u0 = j / nz; u1 = (j + 2) / nz; z0 = -2.5 + 5.0 * u0; z1 = -2.5 + 5.0 * u1
            h0 = profile(u0) + 0.006; h1 = profile(u1) + 0.006
            ang = math.atan2(h1 - h0, z1 - z0)
            parts.append(box('track', 'snow_blue', (0.11, (z1 - z0) * 1.02, 0.004), (tx, -(z0 + z1) / 2, (h0 + h1) / 2), (-ang, 0, 0)))
    # the steep face under the lip, and the fill of each bank down to the snow
    face_v = []; face_f = []
    for i in range(nx + 1):
        fx = -1 + 2 * i / nx; x = fx * 4.0; bank = 0.28 * max(0.0, abs(fx) - 0.80) / 0.20
        face_v += [(x * (1 + 0.04 * bank), -2.5, 1.4 + bank * 0.75), (x * (1 + 0.04 * bank), -2.5, 0.0)]
    for i in range(nx): face_f.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    fm = bpy.data.meshes.new('face'); fm.from_pydata(face_v, [], face_f); fm.update()
    fo = bpy.data.objects.new('face', fm); bpy.context.scene.collection.objects.link(fo); fo.data.materials.append(mat('snow_blue'))
    parts.append(fo)
    for side in (-1, 1):
        sv = []; sf = []
        for j in range(nz + 1):
            u = j / nz; z = -2.5 + 5.0 * u
            sv += [(side * 4.0 * 1.04, -z, profile(u) + 0.28 * (0.35 + 0.4 * u) + 0.0), (side * 4.0 * 1.04, -z, 0.0)]
        for j in range(nz): sf.append((2 * j, 2 * j + 2, 2 * j + 3, 2 * j + 1) if side > 0 else (2 * j, 2 * j + 1, 2 * j + 3, 2 * j + 2))
        sm = bpy.data.meshes.new('side'); sm.from_pydata(sv, [], sf); sm.update()
        so = bpy.data.objects.new('side', sm); bpy.context.scene.collection.objects.link(so); so.data.materials.append(mat('snow_blue'))
        parts.append(so)
    # the wooden lip: a board along the edge of the last metre, held by posts driven into the face, planks end to end
    for k in range(8):
        parts.append(box('lip_plank', 'timber', (1.02, 0.30, 0.055), (-3.57 + k * 1.02, 2.46, 1.405), (math.radians(-6), 0, 0), bevel=0.006))
        parts.append(box('lip_face', 'timber_dark', (1.0, 0.045, 0.30), (-3.57 + k * 1.02, 2.585, 1.27), (math.radians(-6), 0, 0), bevel=0.006))
    for k in range(5):
        parts.append(box('lip_post', 'timber_dark', (0.1, 0.1, 0.55), (-3.6 + k * 1.8, 2.56, 1.0)))
    for k in range(4):
        parts.append(box('lip_screw_plate', 'post_grey', (0.12, 0.012, 0.06), (-2.7 + k * 1.8, 2.6, 1.31)))
    return finish_piece('kicker', parts, 8000)

def build_netting():
    """A 12 m run of orange safety netting on four steel posts: a top and bottom rope, vertical and horizontal
    cords on a 0.2 m mesh, sagging between the posts, ground sleeves and guy ropes."""
    parts = []; height = 2.4; posts = [-6.0, -2.0, 2.0, 6.0]
    for x in posts:
        parts.append(cyl('post', 'post_grey', 0.04, height + 0.3, (x, 0, (height + 0.3) / 2 - 0.15), verts=10))
        parts.append(cyl('post_cap', 'post_grey', 0.05, 0.05, (x, 0, height + 0.17), verts=10))
        parts.append(cyl('sleeve', 'rubber', 0.055, 0.35, (x, 0, 0.1), verts=10))
        parts.append(tube('guy', 'net_orange', [(x, 0, height - 0.15), (x, 1.1, 0.0)], 0.007))
    def sag(x):
        # distance from the nearest post: the net hangs a little between them
        d = min(abs(x - p) for p in posts); span = 2.0
        return 0.10 * math.sin(min(d, span) / span * math.pi / 2) ** 2
    xs = [-6.0 + k * 0.2 for k in range(61)]
    top = [(x, 0, height - sag(x)) for x in xs]
    parts.append(tube('top_rope', 'net_orange', top, 0.012))
    parts.append(tube('bottom_rope', 'net_orange', [(x, 0, 0.1) for x in xs], 0.012))
    for k in range(len(xs) - 1):
        x0, x1 = xs[k], xs[k + 1]; z0, z1 = height - sag(x0) - 0.08, height - sag(x1) - 0.08
        parts.append(box('tape', 'net_orange', (x1 - x0 + 0.002, 0.012, 0.16), ((x0 + x1) / 2, 0, (z0 + z1) / 2 - 0.0), (0, -math.atan2(z1 - z0, x1 - x0), 0)))
    for k, x in enumerate(xs):
        parts.append(box('vertical', 'net_orange', (0.014, 0.014, height - 0.1 - sag(x)), (x, 0, 0.1 + (height - 0.1 - sag(x)) / 2)))
    for z in [0.1 + 0.2 * k for k in range(1, 11)]:
        parts.append(tube('cord', 'net_orange', [(x, 0, z - sag(x) * (z / height)) for x in xs], 0.008))
    return finish_piece('netting', parts, 14000)

PIECES = {'pole-red': lambda: build_pole('red'), 'pole-blue': lambda: build_pole('blue'), 'gate-red': lambda: build_gate('red'),
          'gate-blue': lambda: build_gate('blue'), 'arch-start': lambda: build_arch('start'), 'arch-finish': lambda: build_arch('finish'),
          'flag-drop': lambda: build_flag('drop'), 'flag-pickup': lambda: build_flag('pickup'), 'kicker': build_kicker, 'netting': build_netting}

def make_piece(name):
    if name not in PIECES: return None
    reset(); MATS.clear()
    return PIECES[name]()

# ---------------------------------------------------------------------------
# Review renders

def render_glb(name, folder, views=None):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(OUT / f'{name}.glb'))
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2; size = max((hi - lo).length, 0.5)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    g = bpy.context.active_object; gm = bpy.data.materials.new('snow'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.72, 0.76, 0.82, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    g.data.materials.append(gm)
    world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.65, 0.80, 1)
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0
    s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s); s.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    scene.render.image_settings.file_format = 'PNG'
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 32; scene.cycles.device = 'CPU'; scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = 600, 450; scene.view_settings.view_transform = 'AgX'
    cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); scene.camera = cam
    cd.lens = 50
    for suffix, (vx, vy, vz, dist) in (views or {'': (-0.55, -1.0, 0.28, 2.15)}).items():
        direction = Vector((vx, vy, vz)).normalized()
        cam.location = centre + direction * size * dist
        cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / f'{name}{"-" + suffix if suffix else ""}.png')
        bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------------------
# Entry

wanted = [n for n in SKI_NAMES if not options.only or n in options.only.split(',')]
for name in wanted:
    if make_figure(name) is None: make_piece(name)
if options.render:
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    for name in wanted:
        if (OUT / f'{name}.glb').exists():
            views = {'': (-0.55, -1.0, 0.28, 2.15), 'side': (-1.0, 0.05, 0.2, 2.15), 'front': (0.0, -1.0, 0.2, 2.15)}
            if name.startswith(('arch', 'netting', 'kicker')): views = {'': (-0.45, -1.0, 0.25, 1.5), 'back': (0.5, 1.0, 0.3, 1.5)}
            if name.startswith('gate'): views = {'': (-0.3, -1.0, 0.25, 1.4), 'side': (-1.0, 0.1, 0.2, 1.4)}
            render_glb(name, folder, views)
