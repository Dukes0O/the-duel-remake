"""Carve one solid body from a vehicle's side, end and overhead photos.

`photo_model.py` builds from flat parts and lathes, which suits an object made
of plates and drums. A vehicle's cab, bonnet and wings curve in every direction,
and flat parts come apart when seen from an angle. Here a voxel is kept only if
every photo shows something at that point, which gives one closed shape that is
right from all sides. Each face then wears the photo it faces most directly.

    view = View(photo, seeds, to_mask, to_picture)
    obj = carve_hull('truck:body', views, faces, bounds, voxel, keep, target)

All coordinates are glTF metres, X right, Y up, Z towards the viewer, front -Z.
"""
import math

import bpy
import numpy as np

from photo_model import lathe, tidy


class View:
    """One photo, and how a point in the world lands on it.

    `pick(x, y, z)` takes arrays of metres and returns arrays of picture pixels.
    `normal` is the way the face looks to wear this photo; `axis` is the world
    direction this photo looks along, used to cast the silhouette.
    """

    def __init__(self, name, photo, seeds, pick, normal, solid=None, grey=26, tolerance=26):
        self.name = name
        self.photo = photo
        self.pick = pick
        self.normal = np.array(normal, dtype=np.float64)
        mask = tidy(~photo.sky(seeds, tolerance=tolerance, grey=grey), 2)
        self.mask = solid(mask) if solid else mask

    def covers(self, x, y, z):
        px, py = self.pick(x, y, z)
        col = np.round(px).astype(np.int64)
        row = np.round(py).astype(np.int64)
        inside = (col >= 0) & (row >= 0) & (col < self.mask.shape[1]) & (row < self.mask.shape[0])
        hit = np.zeros(x.shape, dtype=bool)
        hit[inside] = self.mask[row[inside], col[inside]]
        return hit


def occupancy(bounds, voxel, tests, keep=None):
    """The voxels that every test allows. `tests` is a list of (x, y, z) -> bool arrays."""
    (x0, x1), (y0, y1), (z0, z1) = bounds
    xs = np.arange(x0, x1 + voxel, voxel)
    ys = np.arange(y0, y1 + voxel, voxel)
    zs = np.arange(z0, z1 + voxel, voxel)
    x, y, z = np.meshgrid(xs, ys, zs, indexing='ij')
    solid = np.ones(x.shape, dtype=bool)
    for test in tests:
        solid &= test(x, y, z)
    if keep:
        solid &= keep(x, y, z)
    return solid, xs, ys, zs


def largest_part(solid):
    """Keep only the largest joined piece, so no speck floats free of the body."""
    seen = np.zeros(solid.shape, dtype=np.int32)
    label, best, best_size = 0, 0, 0
    for start in zip(*np.nonzero(solid)):
        if seen[start]:
            continue
        label += 1
        stack, size = [start], 0
        seen[start] = label
        while stack:
            i, j, k = stack.pop()
            size += 1
            for a, b, c in ((i + 1, j, k), (i - 1, j, k), (i, j + 1, k), (i, j - 1, k), (i, j, k + 1), (i, j, k - 1)):
                if 0 <= a < solid.shape[0] and 0 <= b < solid.shape[1] and 0 <= c < solid.shape[2] \
                        and solid[a, b, c] and not seen[a, b, c]:
                    seen[a, b, c] = label
                    stack.append((a, b, c))
        if size > best_size:
            best, best_size = label, size
    return seen == best


def voxel_surface(solid, xs, ys, zs, voxel):
    """The outside faces of the kept voxels, as vertices and quads in Blender axes."""
    padded = np.pad(solid, 1)
    half = voxel / 2
    corners = {}
    verts, quads = [], []

    def corner(i, j, k):
        key = (i, j, k)
        index = corners.get(key)
        if index is None:
            index = len(verts)
            corners[key] = index
            x = xs[0] - half + i * voxel
            y = ys[0] - half + j * voxel
            z = zs[0] - half + k * voxel
            verts.append((x, -z, y))
        return index

    shapes = (
        (1, 0, 0, ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))),
        (-1, 0, 0, ((0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0))),
        (0, 1, 0, ((0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0))),
        (0, -1, 0, ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1))),
        (0, 0, 1, ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))),
        (0, 0, -1, ((0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0))),
    )
    for dx, dy, dz, face in shapes:
        neighbour = np.roll(np.roll(np.roll(padded, -dx, 0), -dy, 1), -dz, 2)
        exposed = padded & ~neighbour
        for i, j, k in zip(*np.nonzero(exposed)):
            i, j, k = int(i) - 1, int(j) - 1, int(k) - 1
            quads.append(tuple(corner(i + a, j + b, k + c) for a, b, c in face))
    return verts, quads


def wheel_well(wheels):
    """Faces in a wheel's arch are dark: they must not wear the photo's picture of the tyre.

    `wheels` is a list of (axle z, radius, inner x). Inside the cut every face is
    the arch's own wall. Just beyond it only faces turned inward are, so the
    wing's outer surface keeps its paint.
    """
    def dark(point, normal):
        x, y, z = point
        # A low underside faces the ground, and no photo shows it. A wing's lip higher up keeps its paint.
        if normal[1] < -.6 and y < max(wheel[1] for wheel in wheels) * 1.3:
            return True
        for axle, radius, inner in wheels:
            if abs(x) < inner - .08:
                continue
            distance = math.hypot(z - axle, y - radius)
            if distance < radius + .07:
                return True
            if distance < radius + .16 and abs(normal[0]) < .75:
                return True
        return False
    return dark


def dark_material():
    mat = bpy.data.materials.get('Wheel arch') or bpy.data.materials.new('Wheel arch')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (.018, .017, .016, 1)
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Roughness'].default_value = .95
    return mat


def tyre(mesh, side_key, side_photo, cx, cy, radius_px, radius, half_width, tread_key, end_photo, end_cx, end_half_px, end_y0, end_y1, sides=36):
    """One round wheel centred on its own origin, turning about X.

    The faces wear the wheel as the side photo shows it, measured to its outer
    edge. The tread wears the tyre as an end photo shows it, head on, running
    back and forth round the wheel, so no picture of the background can reach it.
    `mesh` faces need `side_key` and `tread_key` materials at `finish`.
    """
    scale = half_width / max(end_half_px, 1)

    def tread(index, distance, ring_radius, angle):
        wave = abs(((angle * 8 / (2 * math.pi)) % 2) - 1)
        return end_photo.uv(end_cx + max(-end_half_px, min(end_half_px, distance / scale)) * .94,
                            end_y0 + (end_y1 - end_y0) * wave)

    def face(angle, fraction):
        return side_photo.uv(cx - math.cos(angle) * radius_px * fraction * .97,
                             cy - math.sin(angle) * radius_px * fraction * .97)

    lathe(mesh, tread_key, (0, 0, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-half_width, radius * .972), (-half_width * .86, radius), (half_width * .86, radius), (half_width, radius * .972)],
          tread, sides=sides, cap_start=(side_key, face), cap_end=(side_key, face))


def headlamp(mesh, lens_key, bulb_key, photo, px, py, radius_px, radius, depth=.1, forward=-1):
    """A lamp is a round part with its own picture, centred on its own origin.

    On a carved surface half a lamp wears the front photo and half the side
    photo, which garbles it. This one faces forward, wearing the lamp as the
    front photo shows it, with a small bulb at its centre that can glow at night.
    `forward` is -1 where the vehicle faces -Z and 1 where it faces +Z.
    """
    def rim(index, distance, ring_radius, angle):
        return photo.uv(px + math.cos(angle) * radius_px * .96, py - math.sin(angle) * radius_px * .96)

    def lens(angle, fraction):
        return photo.uv(px + math.cos(angle) * radius_px * fraction * .96, py - math.sin(angle) * radius_px * fraction * .96)

    axis = (0, 0, forward)
    lathe(mesh, lens_key, (0, 0, 0), axis, (1, 0, 0), (0, 1, 0),
          [(-depth, radius * .86), (0, radius)], rim, sides=24, cap_end=(lens_key, lens))
    lathe(mesh, bulb_key, (0, 0, 0), axis, (1, 0, 0), (0, 1, 0),
          [(0, radius * .16), (.006, radius * .16)], rim, sides=10, cap_end=(bulb_key, lambda angle, fraction: photo.uv(px, py)))


def carve_hull(name, views, materials, solid, xs, ys, zs, voxel, target, dark=None):
    """One smooth closed mesh from the voxels, each face wearing the photo it faces.

    `dark(point, normal)`, if given, marks faces that take the dark arch material.
    """
    verts, quads = voxel_surface(solid, xs, ys, zs, voxel)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], quads)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    remesh = obj.modifiers.new('even surface', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = voxel
    remesh.adaptivity = 0
    smooth = obj.modifiers.new('round off the voxel steps', 'SMOOTH')
    smooth.factor = .6
    smooth.iterations = 6
    graph = bpy.context.evaluated_depsgraph_get()
    settled = bpy.data.meshes.new_from_object(obj.evaluated_get(graph))
    triangles = sum(len(p.vertices) - 2 for p in settled.polygons)
    obj.modifiers.clear()
    obj.data = settled
    if triangles > target:
        decimate = obj.modifiers.new('budget', 'DECIMATE')
        decimate.ratio = target / triangles
        graph = bpy.context.evaluated_depsgraph_get()
        reduced = bpy.data.meshes.new_from_object(obj.evaluated_get(graph))
        obj.modifiers.clear()
        obj.data = reduced

    mesh = obj.data
    mesh.calc_loop_triangles()
    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.materials.clear()
    for view in views:
        mesh.materials.append(materials[view.name])
    if dark:
        mesh.materials.append(dark_material())
    normals = np.array([view.normal for view in views])
    coords = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get('co', coords)
    coords = coords.reshape(-1, 3)
    # Blender (x, y, z) is glTF (x, z, -y).
    gltf = np.column_stack((coords[:, 0], coords[:, 2], -coords[:, 1]))
    for polygon in mesh.polygons:
        n = polygon.normal
        facing = normals @ np.array((n.x, n.z, -n.y))
        chosen = gltf[list(polygon.vertices)]
        middle = chosen.mean(axis=0)[None, :]
        # The photo this face looks at most, if that photo shows the subject here.
        # A wheel's wing can stand outside the end photo's own outline.
        pick = int(np.argmax(facing))
        for option in np.argsort(-facing):
            if facing[option] > 0 and views[option].covers(middle[:, 0], middle[:, 1], middle[:, 2])[0]:
                pick = int(option)
                break
        view = views[pick]
        polygon.material_index = pick
        polygon.use_smooth = True
        if dark and dark(middle[0], (n.x, n.z, -n.y)):
            polygon.material_index = len(views)
        px, py = view.pick(chosen[:, 0], chosen[:, 1], chosen[:, 2])
        for loop_index, u, v in zip(polygon.loop_indices, px, py):
            uv_layer.data[loop_index].uv = view.photo.uv(float(u), float(v))
    mesh.update()
    return obj
