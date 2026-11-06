"""Build a model from a photo's own outline, so the picture cannot miss the shape.

Art lesson: tiling swatches cut from a photo, or modelling a shape by eye and
projecting a photo on it, both failed round after round. The way that works is
to read each part's outline and each lathe's radius off the photo, and to give
every face a place in the picture that was measured, not estimated.

    side = Photo(path, frame=(2000, 667))         # measure in these pixels
    sky = side.sky([(20, 20), (350, 250)])        # True where the subject is not
    mesh = Mesh()
    loops = trace(~sky, (78, 75, 600, 400))       # the part's outline, with holes
    slab(mesh, 'side', side, loops, to_world, 1.13, 1.18)
    lathe(mesh, 'side', origin, axis, e1, e2, stations, uv)
    box(mesh, x0, x1, y0, y1, z0, z1, {'+z': ('side', side, rect)})
    mesh.finish('name', {'side': side.material()})

All coordinates are glTF metres, X right, Y up, Z towards the viewer. Viewed
from +Z, +X is on the right of the picture; from +X, -Z is; from -X, +Z is.
"""
import math
from collections import deque
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt


class Photo:
    """A picture measured in `frame` pixels, with (0, 0) at its top left."""

    def __init__(self, path, frame=None):
        self.path = Path(path)
        self.image = bpy.data.images.load(str(self.path))
        self.image_w, self.image_h = self.image.size
        self.w, self.h = frame or (self.image_w, self.image_h)
        self._rgb = None
        self._material = None

    def rgb(self):
        """Colours as bytes, resampled to the frame, top row first."""
        if self._rgb is None:
            pixels = np.empty(self.image_w * self.image_h * 4, dtype=np.float32)
            self.image.pixels.foreach_get(pixels)
            array = pixels.reshape(self.image_h, self.image_w, 4)[::-1, :, :3]
            rows = np.minimum((np.arange(self.h) * self.image_h / self.h).astype(int), self.image_h - 1)
            cols = np.minimum((np.arange(self.w) * self.image_w / self.w).astype(int), self.image_w - 1)
            self._rgb = (array[rows][:, cols] * 255).astype(np.int16)
        return self._rgb

    def uv(self, px, py):
        return (px / self.w, 1 - py / self.h)

    def sky(self, seeds, tolerance=20, grey=13):
        """Flood outward from each seed through pale, colourless pixels.

        Colour is taken from each seed, so a bright salt patch on the subject
        does not count as sky unless it touches the sky and matches it.
        """
        rgb = self.rgb()
        spread = rgb.max(axis=2) - rgb.min(axis=2)
        sky = np.zeros((self.h, self.w), dtype=bool)
        for seed_x, seed_y in seeds:
            colour = rgb[seed_y - 2:seed_y + 3, seed_x - 2:seed_x + 3].reshape(-1, 3).mean(axis=0)
            if colour.mean() < 185:
                print(f'SKY seed {seed_x},{seed_y} is not sky: {colour.round().tolist()}')
                continue
            alike = (np.abs(rgb - colour).max(axis=2) < tolerance) & (spread < grey)
            queue = deque([(seed_y, seed_x)])
            while queue:
                y, x = queue.popleft()
                if y < 0 or x < 0 or y >= self.h or x >= self.w or sky[y, x] or not alike[y, x]:
                    continue
                sky[y, x] = True
                queue.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
        return sky

    def bleed(self, solid, passes=8):
        """Replace everything outside `solid` with the subject's own nearby colours.

        The background can then never show on a model's edge, however the
        picture is filtered or compressed. `solid` must be at the image's own size.
        """
        pixels = np.empty(self.image_w * self.image_h * 4, dtype=np.float32)
        self.image.pixels.foreach_get(pixels)
        array = pixels.reshape(self.image_h, self.image_w, 4)
        known = solid[::-1].copy()
        colour = array[:, :, :3]
        for _ in range(passes):
            total = np.zeros_like(colour)
            count = np.zeros(known.shape, dtype=np.float32)
            for axis, step in ((0, 1), (0, -1), (1, 1), (1, -1)):
                total += np.roll(colour * known[..., None], step, axis)
                count += np.roll(known, step, axis)
            grow = ~known & (count > 0)
            colour[grow] = total[grow] / count[grow][..., None]
            known = known | grow
        colour[~known] = colour[known].mean(axis=0)
        self.image.pixels.foreach_set(array.ravel())
        self.image.update()
        self.image.pack()
        self._rgb = None

    def material(self, roughness=.9):
        if self._material is None:
            mat = bpy.data.materials.new('Photo / ' + self.path.stem)
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes['Principled BSDF']
            bsdf.inputs['Metallic'].default_value = 0
            bsdf.inputs['Roughness'].default_value = roughness
            texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = self.image
            mat.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
            self._material = mat
        return self._material


def tidy(mask, passes=1):
    """Drop single-pixel specks: each pixel takes the majority of its neighbours."""
    for _ in range(passes):
        count = np.zeros(mask.shape, dtype=np.int8)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                count += np.roll(np.roll(mask, dy, 0), dx, 1).astype(np.int8)
        mask = count >= 5
    return mask


def shrink(mask, passes=1):
    """Pull a mask in from its edge by one pixel a pass."""
    for _ in range(passes):
        mask = mask & np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1)
    return mask


def _simplify(loop, tolerance):
    """Ramer-Douglas-Peucker on a closed loop."""
    points = np.array(loop, dtype=np.float64)
    far = int(np.argmax(((points - points[0]) ** 2).sum(axis=1)))
    if far == 0:
        return loop
    keep = {0, far}
    stack = [(0, far), (far, len(points))]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        start = points[a]
        end = points[b % len(points)]
        span = end - start
        length = math.hypot(*span) or 1
        chunk = points[a + 1:b]
        distance = np.abs(span[0] * (chunk[:, 1] - start[1]) - span[1] * (chunk[:, 0] - start[0])) / length
        worst = int(np.argmax(distance))
        if distance[worst] > tolerance:
            middle = a + 1 + worst
            keep.add(middle)
            stack.extend(((a, middle), (middle, b)))
    return [tuple(points[i]) for i in sorted(keep)]


def trace(mask, rect, tolerance=1.6, min_area=40):
    """The outlines inside `rect` (px0, py0, px1, py1), holes included, as loops of pixels."""
    x0, y0, x1, y1 = rect
    part = np.zeros((y1 - y0 + 2, x1 - x0 + 2), dtype=bool)
    part[1:-1, 1:-1] = mask[y0:y1, x0:x1][:part.shape[0] - 2, :part.shape[1] - 2]
    nexts = {}
    rows, cols = np.nonzero(part)
    for r, c in zip(rows.tolist(), cols.tolist()):
        if not part[r - 1, c]:
            nexts.setdefault((c, r), []).append((c + 1, r))
        if not part[r, c + 1]:
            nexts.setdefault((c + 1, r), []).append((c + 1, r + 1))
        if not part[r + 1, c]:
            nexts.setdefault((c + 1, r + 1), []).append((c, r + 1))
        if not part[r, c - 1]:
            nexts.setdefault((c, r + 1), []).append((c, r))
    loops = []
    while nexts:
        start = next(iter(nexts))
        loop = [start]
        point = start
        while True:
            ends = nexts[point]
            step = ends.pop()
            if not ends:
                del nexts[point]
            if step == start:
                break
            loop.append(step)
            point = step
        area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(loop, loop[1:] + loop[:1]))) / 2
        if area >= min_area:
            simple = _simplify(loop, tolerance)
            if len(simple) >= 3:
                loops.append([(p[0] + x0 - 1, p[1] + y0 - 1) for p in simple])
    return loops


def rect_loop(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def inside(point, loops):
    """Even-odd test, so a hole's inside counts as outside."""
    x, y = point
    hit = False
    for loop in loops:
        for (ax, ay), (bx, by) in zip(loop, loop[1:] + loop[:1]):
            if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
                hit = not hit
    return hit


def fill(loops):
    """Triangles covering the loops' inside, holes left open."""
    coords, edges = [], []
    for loop in loops:
        base = len(coords)
        coords.extend(Vector((float(x), float(y))) for x, y in loop)
        edges.extend((base + i, base + (i + 1) % len(loop)) for i in range(len(loop)))
    out_coords, _, out_faces, _, _, _ = delaunay_2d_cdt(coords, edges, [], 0, 1e-4)
    points = [(c.x, c.y) for c in out_coords]
    triangles = []
    for face in out_faces:
        corners = [points[i] for i in face]
        centre = (sum(c[0] for c in corners) / len(corners), sum(c[1] for c in corners) / len(corners))
        if inside(centre, loops):
            triangles.append(corners)
    return triangles


class Mesh:
    """Faces gathered in glTF metres; each carries its own UVs and material."""

    def __init__(self):
        self.verts = []
        self.faces = []

    def vertex(self, point):
        self.verts.append(tuple(point))
        return len(self.verts) - 1

    def face(self, points, uvs, material, out=None, smooth=False):
        indices = [self.vertex(p) for p in points]
        self.indexed(indices, uvs, material, out, smooth)

    def indexed(self, indices, uvs, material, out=None, smooth=False):
        indices, uvs = list(indices), list(uvs)
        if out is not None:
            a, b, c = (Vector(self.verts[i]) for i in indices[:3])
            if (b - a).cross(c - a).dot(Vector(out)) < 0:
                indices.reverse()
                uvs.reverse()
        self.faces.append((indices, uvs, material, smooth))

    def triangles(self):
        return sum(len(f[0]) - 2 for f in self.faces)

    def finish(self, name, materials):
        """Make one Blender object. Y up in glTF is Z up in Blender."""
        order = list(materials)
        mesh = bpy.data.meshes.new(name)
        blender = [(x, -z, y) for x, y, z in self.verts]
        mesh.from_pydata(blender, [], [f[0] for f in self.faces])
        uv_layer = mesh.uv_layers.new(name='UVMap')
        for polygon, (_, uvs, material, smooth) in zip(mesh.polygons, self.faces):
            polygon.material_index = order.index(material)
            polygon.use_smooth = smooth
            for loop_index, uv in zip(polygon.loop_indices, uvs):
                uv_layer.data[loop_index].uv = uv
        for key in order:
            mesh.materials.append(materials[key])
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


def slab(mesh, material, photo, loops, to_world, d0, d1, wall_scale=None):
    """A flat part traced from the photo, with real thickness from d0 to d1.

    `to_world(px, py, d)` places a picture point at depth d. The walls read the
    picture inward from the edge, so they show real material and no streaks.
    """
    near = Vector(to_world(*loops[0][0], d1))
    far = Vector(to_world(*loops[0][0], d0))
    forward = near - far
    for triangle in fill(loops):
        uvs = [photo.uv(*p) for p in triangle]
        mesh.face([to_world(*p, d1) for p in triangle], uvs, material, forward)
        mesh.face([to_world(*p, d0) for p in triangle], uvs, material, -forward)
    depth = abs(d1 - d0)
    for loop in loops:
        for a, b in zip(loop, loop[1:] + loop[:1]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            if length == 0:
                continue
            nx, ny = -dy / length, dx / length
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if not inside((mid[0] + nx * .6, mid[1] + ny * .6), loops):
                nx, ny = -nx, -ny
            run = depth / (wall_scale or 0.006)
            ax, ay = a[0] + nx * run, a[1] + ny * run
            bx, by = b[0] + nx * run, b[1] + ny * run
            out = Vector(to_world(mid[0] - nx, mid[1] - ny, d1)) - Vector(to_world(*mid, d1))
            mesh.face((to_world(*a, d1), to_world(*b, d1), to_world(*b, d0), to_world(*a, d0)),
                      (photo.uv(*a), photo.uv(*b), photo.uv(bx, by), photo.uv(ax, ay)), material, out)


_BOX = {
    '+z': lambda x0, x1, y0, y1, z0, z1: ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
    '-z': lambda x0, x1, y0, y1, z0, z1: ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)),
    '+x': lambda x0, x1, y0, y1, z0, z1: ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)),
    '-x': lambda x0, x1, y0, y1, z0, z1: ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),
    '+y': lambda x0, x1, y0, y1, z0, z1: ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)),
    '-y': lambda x0, x1, y0, y1, z0, z1: ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
}
_OUT = {'+z': (0, 0, 1), '-z': (0, 0, -1), '+x': (1, 0, 0), '-x': (-1, 0, 0), '+y': (0, 1, 0), '-y': (0, -1, 0)}


def box(mesh, x0, x1, y0, y1, z0, z1, faces):
    """A box. `faces` maps '+z' and so on to (material, photo, (px0, py0, px1, py1)).

    The rectangle is the face as seen from outside it: its first corner is the
    picture's top left. A face left out is not built.
    """
    for key, (material, photo, (px0, py0, px1, py1)) in faces.items():
        corners = _BOX[key](x0, x1, y0, y1, z0, z1)
        uvs = (photo.uv(px0, py1), photo.uv(px1, py1), photo.uv(px1, py0), photo.uv(px0, py0))
        mesh.face(corners, uvs, material, _OUT[key])


def lathe(mesh, material, origin, axis, e1, e2, stations, uv, sides=16, cap_start=None, cap_end=None):
    """Turn a profile round an axis. stations is [(distance along axis, radius)].

    `uv(index, distance, radius, angle)` gives each ring vertex's UV, so a
    profile read off the picture can wear that same picture. A cap is
    (material, uv_function(angle, fraction_of_radius)).
    """
    origin, axis, e1, e2 = Vector(origin), Vector(axis), Vector(e1), Vector(e2)
    rings = []
    for index, (distance, radius) in enumerate(stations):
        ring = []
        for k in range(sides + 1):
            angle = 2 * math.pi * k / sides
            point = origin + axis * distance + (e1 * math.cos(angle) + e2 * math.sin(angle)) * radius
            ring.append((mesh.vertex(point), uv(index, distance, radius, angle)))
        rings.append(ring)
    for s in range(len(stations) - 1):
        d0, r0 = stations[s]
        for k in range(sides):
            a, ua = rings[s][k]
            b, ub = rings[s][k + 1]
            c, uc = rings[s + 1][k + 1]
            d, ud = rings[s + 1][k]
            angle = 2 * math.pi * (k + .5) / sides
            out = e1 * math.cos(angle) + e2 * math.sin(angle)
            mesh.indexed((a, b, c, d), (ua, ub, uc, ud), material, out, True)
    direction = 1 if stations[-1][0] >= stations[0][0] else -1
    for cap, position, sign in ((cap_start, 0, -direction), (cap_end, -1, direction)):
        if not cap:
            continue
        cap_material, cap_uv = cap
        distance, radius = stations[position]
        centre = origin + axis * distance
        for k in range(sides):
            a0 = 2 * math.pi * k / sides
            a1 = 2 * math.pi * (k + 1) / sides
            p0 = centre + (e1 * math.cos(a0) + e2 * math.sin(a0)) * radius
            p1 = centre + (e1 * math.cos(a1) + e2 * math.sin(a1)) * radius
            mesh.face((centre, p0, p1), (cap_uv(a0, 0), cap_uv(a0, 1), cap_uv(a1, 1)), cap_material, axis * sign)
