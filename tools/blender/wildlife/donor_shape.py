"""Reshape a licensed Quaternius donor (deer or wolf) into another species.

The moose recipe showed the method: keep the donor's bones, inverse binds
and every authored clip, move the weighted vertices in the donor's rest
frame, paint a new coat, add skull-rooted parts (horns, antlers) on the head
group, then fit metres and +X forward with one parent frame.

Donor frame: x lateral (+ is the animal's left), -y forward, z up, donor units.
Species recipes give:
  DONOR    sources.json key holding the licensed file (e.g. 'white-tailed-deer')
  BUDGET   triangles after refinement, before parts
  SCALE    (lateral, length, height) parent scale, donor units to metres
  shape(p, bone, ctx) -> new point for one bone's influence
  paint(p, bone, material, ctx) -> linear RGB coat colour at the rest point
  parts(a, ctx) optional: adds geometry to a common.Animal in donor frame,
                weighted to 'Head' unless a weight is given
"""
import hashlib
import json
import math
from pathlib import Path

import adapt


class Context:
    """Donor bone positions in the unscaled donor world frame."""

    def __init__(self, rig, c):
        self.rig, self.Vector = rig, c.Vector

    def head(self, name):
        return self.rig.matrix_world @ self.rig.data.bones[name].head_local

    def tail(self, name):
        return self.rig.matrix_world @ self.rig.data.bones[name].tail_local


def smooth(t):
    t = max(0, min(1, t))
    return t * t * (3 - 2 * t)


def scale_about(p, centre, factor):
    if isinstance(factor, (int, float)):
        factor = (factor, factor, factor)
    return type(p)([centre[i] + (p[i] - centre[i]) * factor[i] for i in range(3)])


def grain(p, strength=1):
    return strength * (.07 * math.sin(p.z * 151 + p.x * 67) + .045 * math.sin(p.y * 93 - p.z * 37)
                       + .03 * math.sin(p.x * 211 + p.y * 173))


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def build(species, output, c, cache, spec):
    bpy, Vector = c.bpy, c.Vector
    source = json.loads((Path(__file__).parent / 'sources.json').read_text())[spec.DONOR]
    donor = cache / source['file']
    assert hashlib.sha256(donor.read_bytes()).hexdigest() == source['sha256'], 'licensed original changed'
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(donor))
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.materials))
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    for obj in bpy.context.scene.objects:
        if obj.animation_data:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = True
    bpy.context.scene.frame_set(1)
    ctx = Context(rig, c)
    adapt.refine(mesh, c, spec.BUDGET)
    inverse = mesh.matrix_world.inverted()
    groups = {g.index: g.name for g in mesh.vertex_groups}
    materials = {i: mesh.data.materials[f.material_index].name.lower()
                 for f in mesh.data.polygons for i in f.vertices}
    eyes = {i for i, m in materials.items() if 'eye' in m}
    eye_centres = {}
    for side in (-1, 1):
        pts = [mesh.matrix_world @ mesh.data.vertices[i].co for i in eyes
               if (mesh.matrix_world @ mesh.data.vertices[i].co).x * side > 0]
        if pts:
            eye_centres[side] = sum(pts, Vector()) / len(pts)
    coat = mesh.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for v in mesh.data.vertices:
        original = mesh.matrix_world @ v.co
        if v.index in eyes and eye_centres:
            # Natural small eyes: shrink the donor's large eye patch.
            centre = eye_centres[1 if original.x > 0 else -1]
            original = centre + (original - centre) * getattr(spec, 'EYE', .46)
        p, base = Vector(), Vector()
        total = sum(g.weight for g in v.groups) or 1
        for g in v.groups:
            name = groups[g.group]
            w = g.weight / total
            p += Vector(spec.shape(original.copy(), name, ctx)) * w
            base += Vector(spec.paint(original.copy(), name, materials[v.index], ctx)) * w
        if not v.groups:
            p = original
            base = Vector(spec.paint(original.copy(), '', materials[v.index], ctx))
        g = grain(original, getattr(spec, 'GRAIN', 1))
        coat.data[v.index].color = tuple(max(.002, q * (1 + g)) for q in base) + (1,)
        v.co = inverse @ p
    for face in mesh.data.polygons:
        face.material_index = 0
        face.use_smooth = True
    mesh.data.materials.clear()
    mesh.data.materials.append(c.material())
    if hasattr(spec, 'parts'):
        add_parts(mesh, spec, ctx, c)
    root = bpy.data.objects.new(species + ' metre frame', None)
    bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj.parent is None and obj != root and obj.type != 'MESH':
            obj.parent = root
    root.rotation_euler.z = math.pi / 2
    root.scale = spec.SCALE
    bpy.context.view_layer.update()
    # Feet pivot: the lowest rest-pose hoof or paw sits on the ground.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    floor = min((evaluated.matrix_world @ v.co).z for v in evaluated.data.vertices)
    root.location.z = -floor
    bpy.context.view_layer.update()
    adapt.export(mesh, rig, output, c, root)


def add_parts(mesh, spec, ctx, c):
    bpy, Vector = c.bpy, c.Vector
    a = c.Animal(spec.__name__)
    spec.parts(a, ctx)
    data = bpy.data.meshes.new(spec.__name__ + ' parts')
    data.from_pydata([mesh.matrix_world.inverted() @ Vector(p) for p in a.verts], [], a.faces)
    obj = bpy.data.objects.new(data.name, data)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = mesh.matrix_world.copy()
    for index, weights in enumerate(a.weights):
        for name, w in weights.items():
            group = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            group.add([index], w, 'REPLACE')
    coat = data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for i, colour in enumerate(a.colours):
        coat.data[i].color = colour
    data.materials.append(mesh.data.materials[0])
    for face in data.polygons:
        face.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()


def ring_tube(a, points, radii, colour, bone, sides=8, flat=1.0):
    """A tube through arbitrary 3D points, rings perpendicular to the path.

    Unlike Animal.loft this works for any direction, including sideways.
    `colour` may be a tuple or a function of the parameter t in [0, 1].
    """
    from mathutils import Vector
    pts = [Vector(p) for p in points]
    verts, faces = [], []
    ref = Vector((0, 0, 1))
    normal = None
    for i, p in enumerate(pts):
        tangent = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        if normal is None:
            normal = ref - tangent * ref.dot(tangent)
            if normal.length < 1e-4:
                normal = Vector((1, 0, 0)) - tangent * tangent.x
        normal = (normal - tangent * normal.dot(tangent)).normalized()
        binormal = tangent.cross(normal)
        for j in range(sides):
            ang = 2 * math.pi * j / sides
            verts.append(p + normal * (math.cos(ang) * radii[i] * flat) + binormal * (math.sin(ang) * radii[i]))
    n = len(pts)
    for i in range(n - 1):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((i * sides + j, i * sides + k, (i + 1) * sides + k, (i + 1) * sides + j))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((n - 1) * sides + j for j in range(sides)))
    offset = len(a.verts)
    for idx, v in enumerate(verts):
        t = (idx // sides) / max(1, n - 1)
        col = colour(t) if callable(colour) else colour
        a.verts.append(tuple(v))
        a.weights.append(bone if isinstance(bone, dict) else {bone: 1})
        a.colours.append(tuple(max(.002, q * (1 + grain(v, .6))) for q in col) + (1,))
    a.faces.extend(tuple(i + offset for i in f) for f in faces)
