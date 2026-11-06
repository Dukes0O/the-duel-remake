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
import bpy
import numpy as np

from photo_model import tidy


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


def carve_hull(name, views, materials, solid, xs, ys, zs, voxel, target):
    """One smooth closed mesh from the voxels, each face wearing the photo it faces."""
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
    normals = np.array([view.normal for view in views])
    coords = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get('co', coords)
    coords = coords.reshape(-1, 3)
    # Blender (x, y, z) is glTF (x, z, -y).
    gltf = np.column_stack((coords[:, 0], coords[:, 2], -coords[:, 1]))
    for polygon in mesh.polygons:
        n = polygon.normal
        facing = normals @ np.array((n.x, n.z, -n.y))
        pick = int(np.argmax(facing))
        view = views[pick]
        polygon.material_index = pick
        polygon.use_smooth = True
        chosen = gltf[list(polygon.vertices)]
        px, py = view.pick(chosen[:, 0], chosen[:, 1], chosen[:, 2])
        for loop_index, u, v in zip(polygon.loop_indices, px, py):
            uv_layer.data[loop_index].uv = view.photo.uv(float(u), float(v))
    mesh.update()
    return obj
