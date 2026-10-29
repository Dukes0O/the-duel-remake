"""Final North woods moose adaptation of the licensed deer mesh and rig.

Keep authored bones, inverse binds and NLA clips. Shape the weighted donor
mesh in its rest frame, then fit metres and forward with one parent frame.
"""
import math
import adapt


def build(mesh, rig, output, c):
    bpy, Vector = c.bpy, c.Vector
    adapt.refine(mesh, c, 3600)
    inverse = mesh.matrix_world.inverted()
    groups = {g.index: g.name for g in mesh.vertex_groups}
    eye_vertices = {i for f in mesh.data.polygons
                    if 'eye' in mesh.data.materials[f.material_index].name.lower() for i in f.vertices}
    eye_centres = {}
    for side in (-1, 1):
        pts = [mesh.matrix_world @ mesh.data.vertices[i].co for i in eye_vertices
               if (mesh.matrix_world @ mesh.data.vertices[i].co).x * side > 0]
        eye_centres[side] = sum(pts, Vector()) / len(pts)
    coat = mesh.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    materials = {i: mesh.data.materials[f.material_index].name.lower()
                 for f in mesh.data.polygons for i in f.vertices}
    def shape(point, name, matname):
        p = point.copy()
        base = (.023, .017, .012)
        if name in ('Body', 'Back') or name.startswith(('Torso', 'BackLeg', 'BackShoulder')):
            p.x *= 1.42
            p.z = 2.34 + (p.z - 2.34) * 1.20
            # Smooth dorsal rise, strongest over the forelegs, tapering to rump.
            dorsal = max(0, min(1, (p.z - 2.38) / .55))
            p.z += .42 * math.exp(-((p.y + .96) / .70) ** 2) * dorsal
        elif name.startswith('Neck'):
            p.x *= 1.40
            p.z -= .48 * max(0, min(1, (p.z - 2.55) / 1.05))
        elif name == 'Head' or name.startswith('Ear'):
            p.z -= .48
            if name == 'Head':
                nose = max(0, min(1, (-p.y - 1.98) / .70))
                p.x *= 1.16 + .38 * nose
                p.y -= .26 * nose
                p.z -= .32 * nose
                base = (.032, .024, .017)
            else:
                base = (.040, .031, .022)
        elif 'UpperLeg' in name:
            bone = rig.data.bones[name]
            a, b = rig.matrix_world @ bone.head_local, rig.matrix_world @ bone.tail_local
            t = max(0, min(1, (p.z - b.z) / (a.z - b.z)))
            centre = b.lerp(a, t)
            p.x = centre.x + (p.x - centre.x) * (1.30 + .45 * t)
            p.y = centre.y + (p.y - centre.y) * (1.14 + .22 * t)
        elif 'LowerLeg' in name:
            base = (.18, .15, .115)
        elif name.startswith('Tail'):
            attachment = rig.matrix_world @ rig.data.bones['Tail1'].head_local
            p = attachment + (p - attachment) * .64
        if 'eye' in matname or 'nose' in matname:
            base = (.007, .005, .003)
        elif name.startswith(('FF', 'IK')) or 'hoof' in matname:
            base = (.015, .013, .010)
        return p, base

    for v in mesh.data.vertices:
        original = mesh.matrix_world @ v.co
        if v.index in eye_vertices:
            centre = eye_centres[1 if original.x > 0 else -1]
            original = centre + (original - centre) * .44
        p, base = Vector(), Vector()
        total = sum(g.weight for g in v.groups)
        for g in v.groups:
            shaped, colour = shape(original, groups[g.group], materials[v.index])
            weight = g.weight / total
            p += shaped * weight
            base += Vector(colour) * weight
        grain = .08 * math.sin(p.z * 145 + p.x * 63) + .04 * math.sin(p.y * 87 - p.z * 33)
        coat.data[v.index].color = tuple(q * (1 + grain) for q in base) + (1,)
        v.co = inverse @ p
    for face in mesh.data.polygons:
        face.material_index = 0
        face.use_smooth = True
    mesh.data.materials.clear()
    mesh.data.materials.append(c.material())
    add_head_details(mesh, c)
    root = bpy.data.objects.new('moose metre frame', None)
    bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj.parent is None and obj != root and obj.type != 'MESH':
            obj.parent = root
    root.rotation_euler.z = math.pi / 2
    root.scale = (.75, .78, .60)
    root.location.z = .01310753 * .60
    bpy.context.view_layer.update()
    adapt.export(mesh, rig, output, c, root)


def add_head_details(mesh, c):
    """Two laterally growing curved palms and a hanging throat bell.

    Construct in +X forward, then map into the donor's -Y forward frame.
    Each palm is a shallow solid curved shell, with a narrow skull stalk.
    """
    bpy, Vector = c.bpy, c.Vector
    a = c.Animal('moose')
    a.loft([((1.96, 0, 3.02), .13, .13), ((2.00, 0, 2.78), .115, .15),
            ((1.95, 0, 2.48), .07, .12), ((1.88, 0, 2.35), .008, .012)],
           (.015, .011, .008), 'Head', 12)
    for side in (-1, 1):
        # Canonical y is lateral. Stalk starts inside the skull side.
        a.tube([(1.83, side * .20, 3.49), (1.77, side * .40, 3.51),
                (1.67, side * .66, 3.59)], [.085, .073, .060],
               (.105, .074, .042), 'Head', 10)
        # Width grows outwards, while the palm cups upward, rather than
        # lying as a horizontal plate over the skull. Rim points share the
        # solid outline instead of forming a separate row of tall spikes.
        outline = [(1.75, .56, 3.55), (1.93, .78, 3.61),
                   (2.00, 1.03, 3.74), (2.10, 1.13, 3.89),
                   (1.89, 1.12, 3.82), (1.88, 1.37, 4.04),
                   (1.73, 1.28, 3.98), (1.57, 1.53, 4.20),
                   (1.49, 1.36, 4.09), (1.28, 1.56, 4.24),
                   (1.26, 1.34, 4.11), (1.04, 1.45, 4.20),
                   (1.10, 1.23, 4.02), (.91, 1.26, 4.07),
                   (1.05, 1.06, 3.87), (1.22, .82, 3.67),
                   (1.48, .63, 3.57)]
        rim = [(x, side * y, z) for x, y, z in outline]
        n = len(rim)
        centre = (1.51, side * 1.04, 3.79)
        # Two layers close the palm with a subtly convex centre.
        points = rim + [(x, y, z - .055) for x, y, z in rim]
        points += [centre, (centre[0], centre[1], centre[2] - .055)]
        faces = []
        for i in range(n):
            j = (i + 1) % n
            faces += [(2*n, i, j), (2*n+1, n+j, n+i), (i, n+i, n+j, j)]
        if side < 0:
            faces = [tuple(reversed(f)) for f in faces]
        a.surface(points, faces, (.24, .18, .11), 'Head')
    data = bpy.data.meshes.new('Moose palmate antlers and bell')
    data.from_pydata([mesh.matrix_world.inverted() @ Vector((y, -x, z)) for x, y, z in a.verts], [], a.faces)
    obj = bpy.data.objects.new(data.name, data)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = mesh.matrix_world.copy()
    obj.vertex_groups.new(name='Head').add(list(range(len(data.vertices))), 1, 'REPLACE')
    coat = data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for i, colour in enumerate(a.colours):
        coat.data[i].color = colour
    data.materials.append(mesh.data.materials[0])
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()
