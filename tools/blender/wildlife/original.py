"""Original wildlife recipes for animals no licensed donor skeleton fits.

Kangaroo, echidna, marmot and the birds are modelled here from lofted
anatomical sections, given their own small skeleton with smooth
nearest-bone weights, and animated by their recipe. Metres, +X forward,
Z up, origin at the feet. Coats are painted per vertex and baked with fine
directional fur or feather grain into one 1K map by common.finish_coat.
"""
import math

import adapt
import common
from mathutils import Quaternion, Vector


class Body(common.Animal):
    """common.Animal whose colours may be functions of the vertex position."""

    def paint(self, p, base, region):
        if callable(base):
            base = base(Vector(p))
        x, y, z = p
        grain = (math.sin(x * 97 + y * 41 + z * 23) * .035 +
                 math.sin(x * 37 - y * 59 + z * 83) * .025)
        return tuple(max(.003, min(1, v * (1 + grain))) for v in base) + (1,)

    def fur(self, sections, colour, weight, sides=14, shag=.06, seed=1.0, region='detail'):
        """Loft with an uneven, furry outline instead of a smooth egg.

        Same sections as Animal.loft; each ring point's radius varies a little
        with a fixed pattern, so tufts and lumps stay identical every build.
        """
        vertices, faces = [], []
        for i, (centre, width, height) in enumerate(sections):
            tangent = Vector(sections[min(i + 1, len(sections) - 1)][0]) - Vector(sections[max(0, i - 1)][0])
            tangent.normalize()
            lateral = Vector((0, 1, 0))
            vertical = tangent.cross(lateral).normalized()
            for j in range(sides):
                ang = 2 * math.pi * j / sides
                jitter = 1 + shag * (math.sin(ang * 3 + i * 1.7 + seed) * .6 + math.sin(ang * 7 - i * 2.3 + seed * 2) * .4)
                if i in (0, len(sections) - 1):
                    jitter = 1
                vertices.append(Vector(centre) + lateral * (math.cos(ang) * width * jitter)
                                + vertical * (math.sin(ang) * height * jitter))
        for i in range(len(sections) - 1):
            for j in range(sides):
                a, b = i * sides + j, i * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces += [tuple(reversed(range(sides))), tuple((len(sections) - 1) * sides + j for j in range(sides))]
        self.surface(vertices, faces, colour, weight, region)

    def tube3(self, points, radii, colour, weight, sides=8, squash=1.0):
        """A tube along any 3D path (the loft keeps its rings in the XZ plane)."""
        pts = [Vector(p) for p in points]
        verts, faces = [], []
        normal = None
        for i, p in enumerate(pts):
            tangent = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            if normal is None:
                ref = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((1, 0, 0))
                normal = ref - tangent * ref.dot(tangent)
            normal = (normal - tangent * normal.dot(tangent)).normalized()
            binormal = tangent.cross(normal)
            r = radii[i]
            for j in range(sides):
                ang = 2 * math.pi * j / sides
                verts.append(p + normal * (math.cos(ang) * r * squash) + binormal * (math.sin(ang) * r))
        n = len(pts)
        for i in range(n - 1):
            for j in range(sides):
                k = (j + 1) % sides
                faces.append((i * sides + j, i * sides + k, (i + 1) * sides + k, (i + 1) * sides + j))
        faces += [tuple(reversed(range(sides))), tuple((n - 1) * sides + j for j in range(sides))]
        self.surface(verts, faces, colour, weight)

    def blade(self, stations, colour, weight):
        """Flat aerofoil sheet: stations of (leading point, trailing point, thickness).

        Used for wings, tail fans and crest feathers. Each station is a ring of
        six points round a thin lens from the leading to the trailing edge.
        """
        verts, faces = [], []
        for lead, trail, thick, up in stations:
            lead, trail, up = Vector(lead), Vector(trail), Vector(up).normalized()
            for u, side in ((0, 0), (.33, 1), (.70, 1), (1, 0), (.70, -1), (.33, -1)):
                verts.append(lead.lerp(trail, u) + up * (side * thick * (1.2 - u)))
        n = len(stations)
        for i in range(n - 1):
            for j in range(6):
                k = (j + 1) % 6
                faces.append((i * 6 + j, i * 6 + k, (i + 1) * 6 + k, (i + 1) * 6 + j))
        faces += [tuple(reversed(range(6))), tuple((n - 1) * 6 + j for j in range(6))]
        self.surface(verts, faces, colour, weight)


def near(a, names, power=4):
    """Smooth weights from the two nearest of the named bone segments."""
    segments = [(n, Vector(a.bones[n][0]), Vector(a.bones[n][1])) for n in names]

    def weights(p):
        p = Vector(p)
        found = []
        for name, head, tail in segments:
            d = tail - head
            u = max(0, min(1, (p - head).dot(d) / max(d.length_squared, 1e-9)))
            found.append(((p - (head + d * u)).length, name))
        found.sort()
        raw = {name: 1 / (dist + .012) ** power for dist, name in found[:2]}
        total = sum(raw.values())
        return {name: w / total for name, w in raw.items()}
    return weights


def speckle(p, scale=1.0):
    """Fixed pseudo-random 0..1 per point: grizzled guard-hair tips."""
    v = math.sin(p.x * 1271.3 * scale + p.y * 3117.7 * scale + p.z * 1723.1 * scale) * 43758.5453
    return v - math.floor(v)


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def smooth(t):
    t = max(0, min(1, t))
    return t * t * (3 - 2 * t)


def small_leg(a, name, hip, knee, ankle, toe, radii, colour, foot, hind, parent='spine', claws=3):
    """A short-legged animal's limb with a padded foot and claws.

    Registers the bones and leg entry used by common.animate's walk.
    """
    a.bone(name + '.upper', hip, knee, parent)
    a.bone(name + '.lower', knee, ankle, name + '.upper')
    a.bone(name + '.foot', ankle, toe, name + '.lower')
    a.legs.append((name, hip, knee, ankle, toe, hind))
    limb = near(a, [name + '.upper', name + '.lower', name + '.foot', parent])
    a.tube3([hip, knee, ankle], list(radii), colour, limb, 8)
    paw = near(a, [name + '.foot', name + '.lower'])
    ankle, toe = Vector(ankle), Vector(toe)
    a.tube3([ankle, ankle.lerp(toe, .55), toe], [radii[2] * 1.05, radii[2] * 1.15, radii[2] * .7], foot, paw, 8, .55)
    ahead = (toe - ankle).normalized()
    side = Vector((0, 0, 1)).cross(ahead).normalized()
    for k in range(claws):
        offset = (k - (claws - 1) / 2) * radii[2] * .7
        start = toe + side * offset
        a.tube3([start, start + ahead * radii[2] * 1.4 + Vector((0, 0, -radii[2] * .5))],
                [radii[2] * .22, radii[2] * .04], (.02, .018, .015), paw, 3)


# ---------------------------------------------------------------- posing

def reset(obj):
    for bone in obj.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def turn(obj, name, angle, axis=(0, 1, 0)):
    """Add a rotation about a rest-frame world axis, relative to the parent."""
    rest = obj.data.bones[name].matrix_local.to_3x3()
    local = (rest.inverted() @ Vector(axis)).normalized()
    bone = obj.pose.bones[name]
    bone.rotation_quaternion = Quaternion(local, angle) @ bone.rotation_quaternion


def turn_q(obj, name, q_world):
    """Add a rotation given as a rest-frame world quaternion."""
    rest = obj.data.bones[name].matrix_local.to_3x3()
    local = (rest.inverted() @ q_world.to_matrix() @ rest).to_quaternion()
    bone = obj.pose.bones[name]
    bone.rotation_quaternion = local @ bone.rotation_quaternion


def shift(obj, name, offset):
    rest = obj.data.bones[name].matrix_local.to_3x3()
    obj.pose.bones[name].location = rest.inverted() @ Vector(offset)


def stretch(obj, name, factors):
    obj.pose.bones[name].scale = factors


def clips(obj, recipe, fps=30):
    """Key every bone on every frame of each (name, frames, pose(obj, t)) clip.

    Each clip becomes a muted NLA track, as the North woods exports do.
    """
    scene = common.bpy.context.scene
    scene.render.fps = fps
    obj.animation_data_create()
    for name, frames, pose in recipe:
        obj.animation_data.action = None
        for f in range(1, frames + 2):
            scene.frame_set(f)
            reset(obj)
            pose(obj, (f - 1) / frames)
            for bone in obj.pose.bones:
                bone.keyframe_insert('rotation_quaternion')
                bone.keyframe_insert('location')
                bone.keyframe_insert('scale')
        action = obj.animation_data.action
        action.name = name
        track = obj.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
        obj.animation_data.action = None
    reset(obj)
    scene.frame_set(1)


def angle_down(v):
    """Angle of a vector in the XZ plane, from straight down towards +X."""
    return math.atan2(v.x, -v.z)


def plane_rotate(obj, name, delta):
    """Rotate a bone forward (towards +X from down) by delta radians in XZ."""
    turn(obj, name, -delta)


def two_bone(hip, target, l1, l2, knee_forward=True):
    """Knee position for a planar two-bone chain reaching target."""
    d = target - hip
    dist = min(d.length, (l1 + l2) * .999)
    alpha = math.acos(max(-1, min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))))
    theta = angle_down(d) + (alpha if knee_forward else -alpha)
    return hip + Vector((math.sin(theta) * l1, 0, -math.cos(theta) * l1))


# ---------------------------------------------------------------- export

def finish(a, c, output, recipe, budget=5000, roughness=None, specular=None, refine=None):
    bpy = c.bpy
    data = bpy.data.meshes.new(a.species)
    data.from_pydata(a.verts, [], a.faces)
    data.validate()
    mesh = bpy.data.objects.new(a.species, data)
    bpy.context.collection.objects.link(mesh)
    coat = data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for i, colour in enumerate(a.colours):
        coat.data[i].color = colour
    data.materials.append(c.material())
    for face in data.polygons:
        face.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    shader = data.materials[0].node_tree.nodes.get('Principled BSDF')
    if roughness is not None:
        shader.inputs['Roughness'].default_value = roughness
    if specular is not None:
        shader.inputs['Specular IOR Level'].default_value = specular
    rig = c.rig(a, mesh)
    if callable(recipe):
        recipe(rig)
    else:
        clips(rig, recipe)
    if refine:
        # One smoothing level, then back under budget, as the donor recipes do.
        adapt.refine(mesh, c, refine)
        data = mesh.data
        # Smoothing pulls the soles up a few millimetres; set them back on the ground.
        floor = min(v.co.z for v in data.vertices)
        if floor > 0:
            for v in data.vertices:
                v.co.z -= floor
    data.calc_loop_triangles()
    assert len(data.loop_triangles) <= budget, (a.species, len(data.loop_triangles))
    adapt.export(mesh, rig, output, c)
