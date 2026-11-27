"""WW-ART-MULE: Mrs Vane's water train, the Iron Mule, from photographs.

Run with Blender 4.5:
    blender -b --python tools/blender/scablands-mule.py -- --root <repo>
    ... -- --root <repo> --only cab --trial --render cab       (one piece into .qa-dist, with its review views)

Metres, +Y up, X along the track with the engine's front towards +X, Z across. Rail top is Y = 0 and
the rails stand at Z = +/-0.83. One root empty `iron-mule`. The train stands in the file as it runs in
the game (src/world/jobs/steps/board.js): the engine's front buffers at X = 0, its rear coupling 12 m
back, the two tank wagons' roof plates 22 m and 42 m back at 3.5 m above the rail.

    iron-mule
      mule-cab             origin on the rail under the engine's middle
      cab-coupling         the one the charge goes on; then tank-wagon-1-coupling, tank-wagon-2-coupling,
                           guard-wagon-coupling: each is three links between two hooks
      mule-tank-wagon-1    its walkable roof plate is the part `tank-wagon-1`; `tank-wagon-1:drip` is an
      mule-tank-wagon-2    empty under the outlet valve, where the game draws the drip
      mule-guard-wagon
      mule-box-wagon       `box-wagon-door` slides along X on its rail; the bars are real holes
      mule-rail            6 m of track, origin on the rail top at its middle
      mule-bridge-span     24 m lattice span with its track, origin on the rail top at its middle

The three plated bodies (engine, guard wagon, box wagon) are carved from their four photographs with
`hull_model.py`: a point is kept only where the side, end and overhead photographs all show the body.
The tanks, wheels and buffers are turned (`lathe`), and frames, bars and the bridge's lattice are
traced from the photographs with their holes left open (`trace`, `slab`). The photographs stand on a
blue backdrop, because the train is white and a pale backdrop eats white paint (docs/ART_LINE.md).
Nothing on the train glows: it carries no lamp.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--only', default='', help='comma list of pieces: cab,tank,guard,box,rail,bridge')
parser.add_argument('--trial', action='store_true', help='write .qa-dist/ww-art-mule/trial.glb, not the game file')
parser.add_argument('--render', default='', help='comma list of review view sets, or "all"')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-mule/renders')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
recipe = root / 'tools/blender/scablands-mule.py'
glb = root / 'public/assets/models/wasteland/scablands/mule.glb'
textures = root / 'public/assets/models/wasteland/scablands/textures'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(glb)], 'evidence': []}))
    raise SystemExit(0)
out_glb = root / '.qa-dist/ww-art-mule/trial.glb' if args.trial else glb
ONLY = [name for name in args.only.split(',') if name] or ['cab', 'tank', 'guard', 'box', 'rail', 'bridge']

import bmesh
import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(recipe.parent))
from photo_model import Mesh, Photo, box, fill, inside, lathe, shrink, slab, tidy, trace
from hull_model import View, carve_hull, largest_part, occupancy
from photo_carve import save_mask

bpy.ops.wm.read_factory_settings(use_empty=True)
render_dir.mkdir(parents=True, exist_ok=True)
GAUGE = .83
PHOTOS = []          # (photo, longest side in the exported file)
TRIANGLES = {}


def game(x, y, z):
    """A glTF point as Blender holds it."""
    return (x, -z, y)


def empty(name, parent=None, at=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = game(*at)
    return obj


def adopt(obj, parent, at=(0, 0, 0)):
    """Hang a piece built in its parent's own coordinates on that parent."""
    obj.parent = parent
    obj.location = game(*at)
    return obj


def count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def weld(obj):
    """Join points that share a place. The kit gives every face its own points, which trebles the file."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def plate(mesh, material, photo, loops, to_world, d0, d1):
    """A thin traced part, as `slab`, but its edge shares its points and wears the outline's own colour.

    The edge of a 5 cm plate is too narrow to show a picture, and built this way it costs a third less.
    """
    forward = Vector(to_world(*loops[0][0], d1)) - Vector(to_world(*loops[0][0], d0))
    for triangle in fill(loops):
        uvs = [photo.uv(*p) for p in triangle]
        mesh.face([to_world(*p, d1) for p in triangle], uvs, material, forward)
        mesh.face([to_world(*p, d0) for p in triangle], uvs, material, -forward)
    for loop in loops:
        ring = [(mesh.vertex(to_world(*p, d1)), mesh.vertex(to_world(*p, d0)), photo.uv(*p)) for p in loop]
        for index, (a, b) in enumerate(zip(loop, loop[1:] + loop[:1])):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            if length == 0:
                continue
            nx, ny = -dy / length, dx / length
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if not inside((mid[0] + nx * .6, mid[1] + ny * .6), loops):
                nx, ny = -nx, -ny
            out = Vector(to_world(mid[0] - nx, mid[1] - ny, d1)) - Vector(to_world(*mid, d1))
            near_a, far_a, uv_a = ring[index]
            near_b, far_b, uv_b = ring[(index + 1) % len(ring)]
            mesh.indexed((near_a, near_b, far_b, far_a), (uv_a, uv_b, uv_b, uv_a), material, out, True)


# ---------------------------------------------------------------- photographs

def keyed(photo, name, pull=2):
    """True where the subject is: everything that is not the blue backdrop."""
    rgb = photo.rgb()
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    backdrop = (b - np.maximum(r, g) > 24) & (b > 40)
    mask = shrink(tidy(~backdrop, 2), pull)
    save_mask(mask, render_dir / f'mask-{name}.png')
    return mask


def extent(mask):
    """(x0, y0, x1, y1) of the subject, the far edges exclusive."""
    rows = np.nonzero(mask.any(axis=1))[0]
    cols = np.nonzero(mask.any(axis=0))[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


class Shot:
    """One dead-on photograph of a piece, its mask, and where the world lands on it.

    kind 'side': seen from +Z, front to the right.   kind 'top': from above, front to the right.
    kind 'front': seen from +X.                      kind 'rear': seen from -X.
    `span` is the metres its measured extent stands for: the length for a side or overhead photograph,
    the height for an end photograph (photographs of one object seldom share a scale).
    """

    def __init__(self, stem, kind, span, limit, pull=2, ground=None, top=None, other=None, keyed_mask=True):
        self.stem, self.kind, self.shape = stem, kind, True
        self.photo = Photo(textures / f'mule-{stem}.jpg')
        PHOTOS.append((self.photo, limit))
        self.mask = keyed(self.photo, stem, pull) if keyed_mask else np.ones((self.photo.h, self.photo.w), dtype=bool)
        x0, y0, x1, y1 = extent(self.mask)
        self.box = (x0, y0, x1, y1)
        self.ground = ground if ground is not None else y1 - 1
        self.top = top if top is not None else y0
        if kind in ('side', 'top'):
            # sx runs along the track. `other` is the metres the extent stands for the other way (the height of
            # a side photograph from ground to top, the width of an overhead one) where the scales differ.
            self.sx = span / (x1 - x0)
            self.cx, self.cy = (x0 + x1) / 2, (y0 + y1) / 2
            self.s = self.sx if other is None else other / ((self.ground - self.top) if kind == 'side' else (y1 - y0))
        else:
            self.s = self.sx = span / (self.ground - self.top)
            self.cx = self.symmetric_centre(x0, x1)
        print(f'SHOT {stem}: box {self.box} ground {self.ground} scale {self.sx * 1000:.2f} x {self.s * 1000:.2f} mm/px centre {self.cx:.1f}')

    def symmetric_centre(self, x0, x1):
        """The column about which the outline mirrors best."""
        best, best_score = (x0 + x1) / 2, -1
        for centre in np.arange((x0 + x1) / 2 - 12, (x0 + x1) / 2 + 12.5, .5):
            middle = int(round(centre))
            half = int(min(middle - x0, x1 - middle))
            score = (self.mask[:, middle - half:middle][:, ::-1] == self.mask[:, middle:middle + half]).mean()
            if score > best_score:
                best, best_score = centre, score
        return float(best)

    def pick(self, x, y, z):
        """World to picture. Arrays or numbers."""
        if self.kind == 'side':
            return self.cx + x / self.sx, self.ground - y / self.s
        if self.kind == 'top':
            return self.cx + x / self.sx, self.cy + z / self.s
        if self.kind == 'front':
            return self.cx - z / self.s, self.ground - y / self.s
        return self.cx + z / self.s, self.ground - y / self.s

    def world(self, px, py, d):
        """Picture to world, at depth d along the photograph's own line of sight."""
        if self.kind == 'side':
            return ((px - self.cx) * self.sx, (self.ground - py) * self.s, d)
        if self.kind == 'top':
            return ((px - self.cx) * self.sx, d, (py - self.cy) * self.s)
        if self.kind == 'front':
            return (d, (self.ground - py) * self.s, -(px - self.cx) * self.s)
        return (d, (self.ground - py) * self.s, (px - self.cx) * self.s)

    def X(self, px): return (px - self.cx) * self.sx
    def Y(self, py): return (self.ground - py) * self.s
    def Z(self, px): return (px - self.cx) * self.s * (-1 if self.kind == 'front' else 1)
    def PX(self, x): return self.cx + x / self.sx
    def PY(self, y): return self.ground - y / self.s
    def uv(self, px, py): return self.photo.uv(px, py)

    def view(self, name, normal):
        """This photograph as a carving view (hull_model.View without its pale-sky flood)."""
        view = View.__new__(View)
        view.name, view.photo, view.pick = name, self.photo, self.pick
        view.normal = np.array(normal, dtype=np.float64)
        view.favour = None
        view.mask = self.mask
        return view

    def frame(self):
        """The camera that takes this same photograph of the model: (eye, target, metres across, pixels)."""
        w, h = self.photo.w, self.photo.h
        if self.kind == 'side':
            x, y = self.X(w / 2), self.Y(h / 2)
            return (x, y, 60), (x, y, 0), w * self.sx, (w, h)
        if self.kind == 'top':
            x, z = self.X(w / 2), (h / 2 - self.cy) * self.s
            return (x, 60, z), (x, 0, z), w * self.sx, (w, h)
        y, z = self.Y(h / 2), self.Z(w / 2)
        return ((60 if self.kind == 'front' else -60), y, z), (0, y, z), w * self.s, (w, h)


_DARK = None


def dark_material():
    global _DARK
    if _DARK is None:
        _DARK = bpy.data.materials.new('Mule / unlit underside')
        _DARK.use_nodes = True
        bsdf = _DARK.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (.03, .026, .022, 1)
        bsdf.inputs['Metallic'].default_value = 0
        bsdf.inputs['Roughness'].default_value = .95
    return _DARK


def carve(name, shots, x0, x1, underside, height, half, voxel, target, extra_keep=None, extra_dark=None):
    """One closed body where the side, overhead and end photographs all show it.

    The body is kept between x0 and x1 (buffers and hooks beyond are their own pieces) and above
    `underside` (wheels and frames are their own pieces). An end photograph whose `shape` is False
    only dresses the faces that look its way.
    """
    side, top = shots['side'], shots['top']
    side_view, top_view = side.view('side', (0, 0, 1)), top.view('top', (0, 1, 0))
    end_views = [shots[key].view(key, (0, 0, 0)) for key in ('rear', 'front') if key in shots and shots[key].shape]
    tests = [side_view.covers, top_view.covers]
    if end_views:
        tests.append(lambda x, y, z: np.logical_or.reduce([view.covers(x, y, z) for view in end_views]))

    def keep(x, y, z):
        result = (x >= x0) & (x <= x1) & (y >= underside)
        if extra_keep:
            result &= extra_keep(x, y, z)
        return result

    margin = voxel * 2
    bounds = ((x0 - margin, x1 + margin), (underside - margin, height + margin), (-half - margin, half + margin))
    solid, xs, ys, zs = occupancy(bounds, voxel, tests, keep)
    solid = largest_part(solid)
    if not solid.any():
        raise RuntimeError(f'{name}: nothing left after carving; look at the masks in {render_dir}')
    kept = np.nonzero(solid)
    print(f'CARVE {name}: x {xs[kept[0].min()]:.2f}..{xs[kept[0].max()]:.2f} y {ys[kept[1].min()]:.2f}..{ys[kept[1].max()]:.2f} '
          f'z {zs[kept[2].min()]:.2f}..{zs[kept[2].max()]:.2f}')
    views = [side_view, side.view('side', (0, 0, -1)), top_view]
    materials = {'side': side.photo.material(), 'top': top.photo.material()}
    for key, normal in (('front', (1, 0, 0)), ('rear', (-1, 0, 0))):
        shot = shots.get(key) or shots.get('rear') or shots.get('front')
        views.append(shot.view(shot.kind, normal))
        materials[shot.kind] = shot.photo.material()

    def dark(point, normal):
        return normal[1] < -.6 or bool(extra_dark and extra_dark(point, normal))

    # carve_hull works in glTF axes with any view normals, so the train's X-along-track layout is fine.
    obj = carve_hull(name, views, materials, solid, xs, ys, zs, voxel, target, dark=dark)
    obj.data.materials[len(views)] = dark_material()
    obj.data.name = name
    obj.data.name = name
    return obj


# ---------------------------------------------------------------- turned and traced parts

def wheelset(mesh, key, side, cx, cy, radius_px, half_width=.065, flange=.03, sides=24, lower_only=False):
    """Two flanged wheels and their axle, standing on the rails. Faces wear the side photograph's wheel."""
    radius = radius_px * side.s
    centre = (side.X(cx), radius, 0)
    rx = radius / side.sx        # the wheel's radius along the picture, where the two scales differ

    def up(angle):
        return -abs(math.sin(angle)) if lower_only else math.sin(angle)

    def face(angle, fraction):
        return side.uv(cx + math.cos(angle) * rx * fraction * .97, cy - up(angle) * radius_px * fraction * .97)

    def tread(index, distance, ring, angle):
        return side.uv(cx + math.cos(angle) * rx * .93, cy + abs(math.sin(angle)) * radius_px * .93)

    for sign in (1, -1):
        inner, outer = sign * (GAUGE - half_width), sign * (GAUGE + half_width)
        lathe(mesh, key, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(inner - sign * .03, radius + flange), (inner, radius + flange), (inner, radius), (outer, radius)],
              tread, sides=sides, cap_start=(key, face), cap_end=(key, face))
    lathe(mesh, key, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0), [(-GAUGE, .075), (GAUGE, .075)],
          lambda i, d, r, a: side.uv(cx + math.cos(a) * rx * .9, cy + radius_px * .9), sides=6)


def buffer(mesh, key, side, end_key, end, x, direction, y, z, head_px, stock_rect, length=.5, head=.23):
    """A stock and a broad head, the head's face from the end photograph (centre px, py, radius px)."""
    cx, cy, radius_px = head_px
    sx0, sy0, sx1, sy1 = stock_rect

    def stock(index, distance, ring, angle):
        return side.uv(sx0 + (sx1 - sx0) * min(1, distance / length), (sy0 + sy1) / 2 - math.sin(angle) * (sy1 - sy0) / 2 * .9)

    def face(angle, fraction):
        return end.uv(cx + math.cos(angle) * radius_px * fraction * .95, cy - math.sin(angle) * radius_px * fraction * .95)

    profile = [(0, .085), (length * .62, .085), (length * .74, .12), (length * .86, head), (length, head)]
    lathe(mesh, key, (x, y, z), (direction, 0, 0), (0, 0, 1), (0, 1, 0), profile, stock, sides=14, cap_end=(end_key, face))


def disc_cut(mask, wheels, keep_box=44, grow=5):
    """Take each wheel's disc out of a frame mask, leaving its axle box in the middle."""
    mask = mask.copy()
    yy, xx = np.ogrid[:mask.shape[0], :mask.shape[1]]
    for cx, cy, radius in wheels:
        disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= (radius + grow) ** 2
        if keep_box:
            disc[int(cy - keep_box):int(cy + keep_box), int(cx - keep_box):int(cx + keep_box)] = False
        mask &= ~disc
    return mask


def stadium(cx, cy, half, radius, points=8):
    loop = []
    for k in range(points * 2):
        angle = -math.pi / 2 + math.pi * (k % points) / (points - 1)
        sign = 1 if k < points else -1
        loop.append((cx + sign * (half - radius) + sign * math.cos(angle) * radius, cy + sign * math.sin(angle) * radius))
    return loop


_COUPLING = None


def coupling(name, parent, shot, rust_px, x, y, reach=.9, links=3):
    """Chain links on the centre line between two hooks, every second one lying flat. Its origin is its middle.

    The first call builds the links from a rusty patch of `shot`; later calls share that mesh.
    """
    global _COUPLING
    if _COUPLING is None:
        mesh = Mesh()
        pcx, pcy = rust_px
        k = .0045                      # metres to a pixel of the rusty patch the links wear
        run = reach / links
        for index in range(links):
            centre = -reach / 2 + run * (index + .5)
            loops = [stadium(pcx, pcy, run * .68 / k, .105 / k), stadium(pcx, pcy, run * .68 / k - .045 / k, .055 / k)]
            flat = index % 2 == 1

            def place(px, py, d, centre=centre, flat=flat):
                u, v = (px - pcx) * k, (pcy - py) * k
                return (centre + u, d, v) if flat else (centre + u, v, d)

            plate(mesh, 'rust', shot.photo, loops, place, -.035, .035)
        obj = weld(mesh.finish(name, {'rust': shot.photo.material()}))
        TRIANGLES[name] = mesh.triangles()
        _COUPLING = obj.data
    else:
        obj = bpy.data.objects.new(name, _COUPLING)
        bpy.context.collection.objects.link(obj)
    return adopt(obj, parent, (x, y, 0))


# ---------------------------------------------------------------- the plated vehicles

def skirt_line(spec):
    """The body's lower edge in the side photograph: a row for every column."""
    points = spec['skirt']
    return lambda px: np.interp(px, [p[0] for p in points], [p[1] for p in points])


def turned(mesh, key, side, cx, row_top, row_base, half, top_key, top, top_centre, top_radius, sides=18):
    """A chimney or dome: each row's width is read off the side photograph; its crown wears the overhead one."""
    rows = []
    for py in range(row_top + 2, row_base, 6):
        cols = np.nonzero(side.mask[py, cx - half:cx + half])[0]
        if len(cols):
            rows.append((py, min(half, (cols[-1] - cols[0]) / 2)))
    profile = [(side.Y(py), r * side.sx) for py, r in reversed(rows)]

    def uv(index, distance, radius, angle):
        arc = .84 * math.degrees(math.asin(math.sin(angle))) / 90
        return side.uv(cx + radius / side.sx * arc, side.PY(distance))

    tcx, tcy = top_centre
    lathe(mesh, key, (side.X(cx), 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0), profile, uv, sides=sides,
          cap_end=(top_key, lambda a, f: top.uv(tcx + math.sin(a) * f * top_radius, tcy + math.cos(a) * f * top_radius)))


def plated(name, spec):
    """The engine, the guard wagon and the box wagon: a carved body on traced frames and turned wheels."""
    vehicle = empty(name)
    stem = spec['stem']
    side = Shot(f'{stem}-side', 'side', spec['length'], spec.get('side_limit', 1024), ground=spec.get('ground'))
    height = side.Y(side.box[1])
    shots = {'side': side}
    for key in ('rear', 'front'):
        if spec.get(key):
            shots[key] = Shot(spec[key], key, height, spec.get('end_limit', 512))
            shots[key].shape = key in spec.get('shape_from', ('front', 'rear'))
    widest = next(shots[key] for key in ('rear', 'front') if key in shots and shots[key].shape)
    width = (widest.box[2] - widest.box[0]) * widest.s
    top = shots['top'] = Shot(f'{stem}-top', 'top', spec['length'], spec.get('top_limit', 768), other=width)
    print(f'{name}: height {height:.2f} m, width {width:.2f} m')
    xb0, xb1 = side.X(spec['body'][0]), side.X(spec['body'][1])
    skirt = skirt_line(spec)
    lowest = side.Y(max(p[1] for p in spec['skirt']))
    gear = Mesh()
    materials = {'side': side.photo.material(), 'top': top.photo.material()}

    # Turned parts are read off the whole side mask, then cut out of it so the carving leaves a flat roof.
    whole = side.mask.copy()
    for cx, row_top, row_base, half, top_centre, top_radius in spec.get('turned', ()):
        turned(gear, 'side', side, cx, row_top, row_base, half, 'top', top, top_centre, top_radius)
    for x0, x1, row in spec.get('flatten', ()):
        side.mask[:row, x0:x1] = False
    doorway = spec.get('doorway')

    def kept(x, y, z):
        result = y >= side.Y(skirt(side.cx + x / side.sx))
        if doorway:
            result &= ~((x > side.X(doorway[0])) & (x < side.X(doorway[2])) & (y < side.Y(doorway[1])))
        return result

    def unlit(point, normal):
        # Inside the doorway nothing is lit.
        return bool(doorway) and side.X(doorway[0]) - .04 < point[0] < side.X(doorway[2]) + .04 \
            and abs(point[2]) < width / 2 - .1 and point[1] < side.Y(doorway[1]) + .04

    body = carve(f'{name}:body', shots, xb0, xb1, lowest, height, width / 2 + .1, spec.get('voxel', .05),
                 spec.get('target', 5000), kept, unlit)
    adopt(body, vehicle)
    TRIANGLES[body.name] = count(body)
    side.mask = whole

    # Below the skirt: frames traced from the side photograph on each side, wheels on the rails.
    wheels = spec['wheels']
    beam = spec.get('beam', spec['body'])
    low = side.mask.copy()
    rows = np.arange(low.shape[0])[:, None]
    low &= rows >= (skirt(np.arange(low.shape[1])) - 4)[None, :]
    low[:, :beam[0]] = False
    low[:, beam[1]:] = False
    low = disc_cut(low, wheels, keep_box=spec.get('axle_box', 44))
    frames = trace(low, (beam[0], int(min(p[1] for p in spec['skirt'])) - 4, beam[1], side.ground + 2),
                   tolerance=2.8, min_area=300)
    frame_z = spec.get('frame_z', 1.0)
    for sign in (1, -1):
        plate(gear, 'side', side.photo, frames, side.world, sign * (frame_z - .05), sign * frame_z)
    for cx, cy, radius in wheels:
        wheelset(gear, 'side', side, cx, cy, radius, lower_only=spec.get('wheels_half_hidden', False))
    # What is between the frames is unlit iron, not daylight.
    DARK = ('dark', side.photo, spec['dark'])
    materials['dark'] = dark_material()
    box(gear, side.X(beam[0]) + .15, side.X(beam[1]) - .15, spec.get('under', .32), lowest + .04, -(frame_z - .12), frame_z - .12,
        {'+z': DARK, '-z': DARK, '-y': DARK, '+x': DARK, '-x': DARK, '+y': DARK})
    # Buffers and hooks at both ends. A wagon photographed from one end wears that end at both.
    for end_key, direction, column, over_px in (('front', 1, beam[1], side.box[2]), ('rear', -1, beam[0], side.box[0])):
        end = shots.get(end_key) or shots.get('rear') or shots.get('front')
        materials[end.kind] = end.photo.material()
        x_end = side.X(column)
        for cx, cy, radius in spec['buffers'][end.kind]:
            buffer(gear, 'side', side, end.kind, end, x_end - direction * .02, direction, side.Y(spec['buffer_row']),
                   end.Z(cx) * (1 if end.kind == end_key else -1), (cx, cy, radius), spec['stock'],
                   length=abs(side.X(over_px) - x_end) + .02, head=radius * end.s)
        hooks = trace(side.mask, spec['hooks'][0 if direction < 0 else 1], tolerance=1.2, min_area=40)
        if hooks:
            plate(gear, 'side', side.photo, hooks, side.world, -.035, .035)
    if doorway:
        box(gear, side.X(doorway[0]) - .1, side.X(doorway[2]) + .1, lowest, side.Y(doorway[1]) + .1, -.03, .03, {'+z': DARK, '-z': DARK})
    gear_obj = weld(gear.finish(f'{name}:running-gear', materials))
    adopt(gear_obj, vehicle)
    TRIANGLES[gear_obj.name] = gear.triangles()
    for shot in shots.values():
        shot.photo.bleed(shot.mask, passes=16)
        FRAMES[shot.stem] = shot.frame()
    shots['half'] = width / 2
    return vehicle, shots


FRAMES = {}          # photograph stem -> the camera that repeats it, for the review sheet
train = empty('iron-mule')
PLACE = {}           # vehicle -> X of its middle, the engine's front buffers at X = 0

if 'cab' in ONLY:
    # Side photograph 2172 x 724, front to the right. Every pixel number is read from a grid (tools/photo_grid.py).
    cab, cab_shots = plated('mule-cab', {
        'stem': 'cab', 'length': 12.0, 'front': 'cab-front', 'rear': 'cab-rear', 'shape_from': ('rear',),
        'ground': 700, 'body': (113, 2063), 'voxel': .05, 'target': 6000,
        'skirt': ((113, 594), (525, 594), (548, 557), (1728, 557), (1762, 594), (2063, 594)),
        'wheels': ((664, 567, 133), (1127, 567, 133), (1590, 567, 133)),
        'dark': (880, 600, 960, 640), 'frame_z': .98,
        'buffers': {'front': ((354, 894, 76), (899, 894, 76)), 'rear': ((332, 926, 79), (915, 926, 79))},
        'buffer_row': 516, 'stock': (2000, 480, 2060, 560), 'hooks': ((60, 462, 113, 660), (2063, 462, 2110, 660)),
        'wheels_half_hidden': True,
        # The chimney and the steam dome are turned, so the roof is carved flat under them.
        'flatten': ((1120, 1345, 108), (1575, 1720, 108)),
        'turned': ((1647, 20, 112, 62, (1662, 366), 50), (1231, 48, 112, 100, (1231, 366), 88)),
    })
    adopt(cab, train, (-6.0, 0, 0))
    PLACE['mule-cab'] = -6.0
    coupling('cab-coupling', train, cab_shots['side'], (150, 520), -12.0, .86)


# ---------------------------------------------------------------- the tank wagons

def tank_wagon(name, plate_name):
    """A 20 m bogie tank wagon from photographs of a 12 m one.

    The game stands the two roof plates 20 m apart, and the photographed wagon is 12 m long. The tank is
    therefore turned in two lengths of the same photograph, joined on a riveted band: columns 26 to 1652,
    then columns 546 to 2155 moved 1106 pixels along. Frames, saddles and the overhead photograph follow
    the same two lengths, which gives a long wagon two trusses and two outlet valves.
    """
    wagon = empty(name)
    side = Shot('tank-side', 'side', 1, 1024, ground=688)
    end = Shot('tank-end', 'rear', 1, 448)
    top = Shot('tank-top', 'top', 1, 768)
    CUT_A, CUT_B = 546, 1652
    MOVE = CUT_B - CUT_A
    V0, V1 = 26, 2155 + MOVE                     # the wagon over its buffers, in moved pixels
    side.s = 3.5 / (688 - 84)                    # the walkway's top stands 3.5 m above the rail
    side.sx = 20.0 / (V1 - V0)
    middle = (V0 + V1) / 2
    AXIS, R_PX = 284, 194                        # the tank's centre row and radius in the side photograph
    radius, axis_y = R_PX * side.s, (688 - AXIS) * side.s
    end.s = end.sx = side.Y(55) / (end.ground - end.box[1])   # both photographs reach the hatch's top
    TOP_CY, TOP_R = 361, 246.5                   # the tank's centre row and half width in the overhead photograph
    top.s = radius / TOP_R
    END_C = (624, 458, 390)                      # the tank's disc in the end photograph
    print(f'{name}: tank radius {radius:.2f} m, axis {axis_y:.2f} m, along {side.sx * 1000:.2f} mm/px, up {side.s * 1000:.2f} mm/px')

    def vx(v): return (v - middle) * side.sx
    def world_1(px, py, d): return (vx(px), (688 - py) * side.s, d)
    def world_2(px, py, d): return (vx(px + MOVE), (688 - py) * side.s, d)

    mesh = Mesh()
    # The shell. Each station is (moved pixel, radius, photograph column).
    SIDES, DISH = 28, 48
    stations = []
    for t in (1, .9, .68, .4, 0):                # the left dish, tip first
        stations.append((62 + (1 - t) * DISH, radius * max(.02, math.sqrt(1 - t * t)), 62 + (1 - t) * DISH))
    stations.append((CUT_B, radius, CUT_B))
    joint = len(stations)
    stations.append((CUT_B, radius, CUT_A))
    for t in (0, .4, .68, .9, 1):
        stations.append((2119 - (1 - t) * DISH + MOVE, radius * max(.02, math.sqrt(1 - t * t)), 2119 - (1 - t) * DISH))
    rings = []
    for v, r, column in stations:
        ring = []
        for k in range(SIDES):
            angle = math.tau * k / SIDES
            ring.append(mesh.vertex((vx(v), axis_y + math.sin(angle) * r, math.cos(angle) * r)))
        rings.append(ring)

    def shell_uv(material, column, r, angle, flip):
        fraction = r / radius
        if material == 'top':
            return top.uv(column - 3, TOP_CY + math.cos(angle) * fraction * TOP_R * .985)
        if material == 'end':
            cx, cy, rr = END_C
            return end.uv(cx + flip * math.cos(angle) * fraction * rr * .97, cy - math.sin(angle) * fraction * rr * .97)
        # The side photograph shows the tank down to row 470; below that it is behind the frame.
        return side.uv(column, min(470, AXIS - math.sin(angle) * fraction * R_PX * .985))

    for s in range(len(stations) - 1):
        if s == joint - 1:
            continue                              # the two lengths meet here; no face between them
        dish = s < 4 or s >= len(stations) - 5
        for k in range(SIDES):
            a0, a1 = math.tau * k / SIDES, math.tau * (k + 1) / SIDES
            mid = (a0 + a1) / 2
            material = 'end' if dish else ('top' if math.sin(mid) > .57 else 'side')
            flip = 1 if s < joint else -1
            corners = (rings[s][k], rings[s][(k + 1) % SIDES], rings[s + 1][(k + 1) % SIDES], rings[s + 1][k])
            uvs = (shell_uv(material, stations[s][2], stations[s][1], a0, flip), shell_uv(material, stations[s][2], stations[s][1], a1, flip),
                   shell_uv(material, stations[s + 1][2], stations[s + 1][1], a1, flip), shell_uv(material, stations[s + 1][2], stations[s + 1][1], a0, flip))
            mesh.indexed(corners, uvs, material, (0, math.sin(mid), math.cos(mid)), True)

    # Saddles under the riveted bands, each a cradle the width of the tank.
    def saddle(world, column):
        x0, x1 = world(column - 22, 0, 0)[0], world(column + 22, 0, 0)[0]
        rect = ('side', side.photo, (column - 22, 405, column + 22, 488))
        box(mesh, x0, x1, side.Y(488), side.Y(405), -.97, .97, {'+z': rect, '-z': rect, '+x': rect, '-x': rect})

    for column in (248, 546, 862, 1322, 1652):
        saddle(world_1, column)
    for column in (862, 1322, 1652, 1939):
        saddle(world_2, column)

    # Frames: the solebar, the trusses, the valves and the bogies' side frames, traced with their holes.
    wheels_1, wheels_2 = ((292, 610, 78), (608, 610, 78)), ((1576, 609, 78), (1894, 609, 78))
    low = side.mask.copy()
    low[:484, :] = False
    first, second = low.copy(), low.copy()
    first[537:, 1478:] = False                   # the far bogie belongs to the second length
    second[537:, :703] = False
    first = disc_cut(first, wheels_1, keep_box=30)
    second = disc_cut(second, wheels_2, keep_box=30)
    for mask, rect, world in ((first, (105, 484, CUT_B, 690), world_1), (second, (CUT_A, 484, 2062, 690), world_2)):
        loops = trace(mask, rect, tolerance=2.8, min_area=300)
        for sign in (1, -1):
            plate(mesh, 'side', side.photo, loops, world, sign * .97, sign * 1.03)
    for wheels, world in ((wheels_1, world_1), (wheels_2, world_2)):
        for cx, cy, r in wheels:
            shifted = Shot.__new__(Shot)
            shifted.__dict__.update(side.__dict__)
            shifted.X = lambda px, world=world: world(px, 0, 0)[0]
            wheelset(mesh, 'side', shifted, cx, cy, r, sides=22, lower_only=True)
    IRON = ('side', side.photo, (1180, 495, 1290, 528))
    UNLIT = ('dark', side.photo, (1180, 495, 1290, 528))
    x_left, x_right = world_1(105, 0, 0)[0], world_2(2062, 0, 0)[0]
    box(mesh, x_left + .1, x_right - .1, .78, side.Y(490), -.9, .9, {'+z': UNLIT, '-z': UNLIT, '-y': UNLIT})
    # End sills, buffers, hooks and a ladder up each end.
    SILL = ('end', end.photo, (233, 857, 1019, 967))
    for direction, x_end, world, over, hook in ((-1, x_left, world_1, vx(V0), (86, 538, 134, 642)),
                                                (1, x_right, world_2, vx(V1), (2044, 538, 2096, 642))):
        x0, x1 = sorted((x_end, x_end - direction * .1))
        box(mesh, x0, x1, side.Y(535), side.Y(486), -1.23, 1.23,
            {('+x' if direction > 0 else '-x'): SILL, '+y': IRON, '-y': IRON, '+z': IRON, '-z': IRON})
        for cx, cy, r in ((327, 909, 60), (922, 909, 60)):
            buffer(mesh, 'side', side, 'end', end, x_end, direction, side.Y(510), (cx - END_C[0]) * end.s,
                   (cx, cy, r), (1180, 495, 1290, 528), length=abs(over - x_end), head=r * end.s)
        hooks = trace(side.mask, hook, tolerance=1.2, min_area=40)
        if hooks:
            plate(mesh, 'side', side.photo, hooks, world, -.035, .035)
        tip = (vx(62) if direction < 0 else vx(2119 + MOVE)) + direction * .07
        RUNG = ('end', end.photo, (574, 620, 683, 640))
        for z in (-.2, .2):
            box(mesh, tip - .025, tip + .025, side.Y(486), 3.42, z - .025, z + .025,
                {'+x': ('end', end.photo, (574, 200, 590, 850)), '-x': ('end', end.photo, (574, 200, 590, 850)),
                 '+z': ('end', end.photo, (574, 200, 590, 850)), '-z': ('end', end.photo, (574, 200, 590, 850))})
        for step in range(8):
            y = side.Y(486) + .22 + step * .27
            box(mesh, tip - .018, tip + .018, y - .018, y + .018, -.2, .2, {'+x': RUNG, '-x': RUNG, '+y': RUNG, '-y': RUNG})
    # Filler hatches beside the walkway, one on each length.
    for v in (646, 1540 + MOVE):
        profile = [(3.0, .2), (3.28, .2), (3.3, .23), (3.35, .23)]
        lathe(mesh, 'side', (vx(v), 0, -.8), (0, 1, 0), (0, 0, 1), (1, 0, 0), profile,
              lambda i, d, r, a: side.uv(656 + math.sin(a) * 50, 90 - (d - 3.0) * 70), sides=14,
              cap_end=('top', lambda a, f: top.uv(646 + math.sin(a) * f * 62, 221 + math.cos(a) * f * 62)))
    body = weld(mesh.finish(f'{name}:body', {'side': side.photo.material(), 'top': top.photo.material(),
                                             'end': end.photo.material(), 'dark': dark_material()}))
    adopt(body, wagon)
    TRIANGLES[body.name] = mesh.triangles()

    # The walkable roof plate: chequer plate from the overhead photograph, its two halves mirrored so no seam shows.
    walk = Mesh()
    x0, x1, half_plate, top_y = vx(190), vx(1989 + MOVE), .6, 3.5
    ROWS = 176 / .8                                # overhead rows to a metre across the walkway
    for a, b, pa, pb in ((x0, 0, 200, 1979), (0, x1, 1979, 200)):
        for z0, z1, r0, r1 in ((-.6, -.4, 271 + .2 * ROWS, 271), (-.4, .4, 271, 447), (.4, .6, 447, 447 - .2 * ROWS)):
            walk.face(((a, top_y, z1), (b, top_y, z1), (b, top_y, z0), (a, top_y, z0)),
                       (top.uv(pa, r1), top.uv(pb, r1), top.uv(pb, r0), top.uv(pa, r0)), 'top', (0, 1, 0))
    EDGE = ('top', top.photo, (300, 437, 1900, 449))
    box(walk, x0, x1, top_y - .1, top_y, -half_plate, half_plate, {'+z': EDGE, '-z': EDGE, '+x': EDGE, '-x': EDGE, '-y': EDGE})
    plate_obj = walk.finish(plate_name, {'top': top.photo.material()})
    adopt(plate_obj, wagon)
    TRIANGLES[plate_name] = walk.triangles()
    for index, v in enumerate((1101, 1101 + MOVE)):
        empty(f'{plate_name}:drip-{index + 1}', wagon, (vx(v), .42, 0))
    side.photo.bleed(side.mask, passes=16)
    top.photo.bleed(top.mask, passes=16)
    end.photo.bleed(end.mask, passes=16)
    return wagon, side


def twin(wagon, name, old, new):
    """A second wagon sharing the first one's meshes."""
    copy = empty(name)
    for child in wagon.children:
        other = child.copy()
        other.name = child.name.replace(old, new)
        bpy.context.collection.objects.link(other)
        other.parent = copy
    return copy


if 'tank' in ONLY:
    tank_1, tank_side = tank_wagon('mule-tank-wagon-1', 'tank-wagon-1')
    adopt(tank_1, train, (-22.0, 0, 0))
    tank_2 = twin(tank_1, 'mule-tank-wagon-2', 'tank-wagon-1', 'tank-wagon-2')
    adopt(tank_2, train, (-42.0, 0, 0))
    PLACE['mule-tank-wagon-1'], PLACE['mule-tank-wagon-2'] = -22.0, -42.0
    coupling('tank-wagon-1-coupling', train, tank_side, (1230, 510), -32.0, .86)
    coupling('tank-wagon-2-coupling', train, tank_side, (1230, 510), -52.0, .86)

GUARD_LENGTH, BOX_LENGTH = 8.2, 7.72
if 'guard' in ONLY:
    # Side photograph 1774 x 887. One end photograph dresses both ends.
    guard, guard_shots = plated('mule-guard-wagon', {
        'stem': 'guard', 'length': GUARD_LENGTH, 'rear': 'guard-end', 'ground': 866, 'body': (73, 1700),
        'voxel': .045, 'target': 3600, 'skirt': ((73, 629), (1700, 629)), 'under': .76,
        'wheels': ((451, 759, 107), (1315, 759, 107)), 'dark': (600, 645, 700, 690), 'frame_z': .98,
        'buffers': {'rear': ((342, 910, 61), (913, 910, 61))}, 'buffer_row': 647,
        'stock': (600, 645, 700, 690), 'hooks': ((66, 676, 112, 782), (1662, 676, 1708, 782)),
    })
    PLACE['mule-guard-wagon'] = -52.0 - GUARD_LENGTH / 2
    adopt(guard, train, (PLACE['mule-guard-wagon'], 0, 0))
    coupling('guard-wagon-coupling', train, guard_shots['side'], (900, 668), -52.0 - GUARD_LENGTH, .86)

if 'box' in ONLY:
    # Side photograph 1774 x 887: the old prison wagon. Its doorway is cut through the carving and left dark,
    # and each door is its own piece on the runner rail, its bars traced with daylight between them.
    DOOR = (653, 147, 1147, 645)
    BARS = (682, 176, 1112, 388)
    box_wagon, box_shots = plated('mule-box-wagon', {
        'stem': 'box', 'length': BOX_LENGTH, 'rear': 'box-end', 'ground': 854, 'body': (53, 1724), 'beam': (86, 1693),
        'voxel': .045, 'target': 3600, 'skirt': ((53, 612), (1724, 612)), 'under': .81,
        'wheels': ((433, 727, 127), (1353, 727, 127)), 'dark': (700, 626, 800, 660), 'frame_z': .98,
        'buffers': {'rear': ((327, 884, 64), (939, 884, 64))}, 'buffer_row': 620,
        'stock': (700, 626, 800, 660), 'hooks': ((62, 648, 112, 760), (1658, 648, 1704, 760)),
        'doorway': (690, 164, 1110, 612),
    })
    box_side = box_shots['side']
    box_end = box_shots['rear']
    wall = np.flatnonzero(box_end.mask[int(box_end.ground - 2.0 / box_end.s)])
    BOX_HALF = (wall[-1] - wall[0] + 1) * box_end.s / 2      # the wall's width 2 m up, not the eaves'
    print(f'box wagon wall half width {BOX_HALF:.2f} m')
    door_mask = box_side.mask.copy()
    shade = box_side.photo.rgb().max(axis=2)
    gaps = np.zeros_like(door_mask)
    gaps[BARS[1]:BARS[3], BARS[0]:BARS[2]] = shade[BARS[1]:BARS[3], BARS[0]:BARS[2]] < 46
    door_mask &= ~tidy(gaps, 1)
    BOX_DOOR_LOOPS = trace(door_mask, DOOR, tolerance=1.3, min_area=60)
    PLACE['mule-box-wagon'] = -52.0 - GUARD_LENGTH - BOX_LENGTH / 2
    adopt(box_wagon, train, (PLACE['mule-box-wagon'], 0, 0))
    origin = (box_side.X((DOOR[0] + DOOR[2]) / 2), box_side.Y((DOOR[1] + DOOR[3]) / 2))
    door = Mesh()
    plate(door, 'side', box_side.photo, BOX_DOOR_LOOPS,
          lambda px, py, d: (box_side.X(px) - origin[0], box_side.Y(py) - origin[1], d), 0, .06)
    door_obj = weld(door.finish('box-wagon-door', {'side': box_side.photo.material()}))
    adopt(door_obj, box_wagon, (origin[0], origin[1], BOX_HALF - .01))
    TRIANGLES['box-wagon-door'] = door.triangles()
    far_door = bpy.data.objects.new('box-wagon-door-far', door_obj.data)
    bpy.context.collection.objects.link(far_door)
    adopt(far_door, box_wagon, (origin[0], origin[1], -(BOX_HALF - .01)))
    far_door.rotation_euler = (0, 0, math.pi)      # half a turn about the upright axis

# ---------------------------------------------------------------- the line

def sleepers_in(shot):
    """Each sleeper's columns in the overhead photograph: timber is paler than the stone between."""
    rgb = shot.photo.rgb()
    strip = rgb[330:560].mean(axis=(0, 2))
    smooth = np.convolve(strip, np.ones(15) / 15, mode='same')
    timber = smooth > (smooth.max() + smooth.min()) / 2
    edges = np.flatnonzero(np.diff(timber.astype(np.int8)))
    runs = [(int(a) + 1, int(b) + 1) for a, b in zip(edges[::2], edges[1::2])] if not timber[0] else \
           [(int(a) + 1, int(b) + 1) for a, b in zip(edges[1::2], edges[2::2])]
    runs = [run for run in runs if 50 < run[1] - run[0] < 140]
    print('SLEEPERS', runs)
    return runs


def track(mesh, shot, length, x0, bed):
    """Rails on sleepers along X from x0. With `bed`, sleepers lie in ballast; without, they are bridge timbers."""
    w, h = shot.photo.w, shot.photo.h
    per_metre = w / 8.0                            # the overhead photograph shows 8 m of track
    runs = SLEEPERS
    pitch = 8.0 / len(runs)
    if bed:
        # The photograph lies flat as the bed. Its shoulders wear the stone between two sleepers.
        half = h / per_metre / 2
        mesh.face(((x0, -.2, half), (x0 + length, -.2, half), (x0 + length, -.2, -half), (x0, -.2, -half)),
                  (shot.uv(0, h), shot.uv(w, h), shot.uv(w, 0), shot.uv(0, 0)), 'track', (0, 1, 0))
        g0, g1 = runs[4][1] + 6, runs[5][0] - 6    # stone between two sleepers, and only between the rails
        parts = max(2, 2 * round(length / 2.7))
        for sign in (1, -1):
            for part in range(parts):
                a, b = x0 + length * part / parts, x0 + length * (part + 1) / parts
                ra, rb = (290, 590) if part % 2 == 0 else (590, 290)
                mesh.face(((a, -.2, sign * half), (b, -.2, sign * half), (b, -.5, sign * (half + .45)), (a, -.5, sign * (half + .45))),
                          (shot.uv(g0, ra), shot.uv(g0, rb), shot.uv(g1, rb), shot.uv(g1, ra)), 'track', (0, .8, sign * .6))
    count_sleepers = round(length / pitch)
    middle = (254 + 628) / 2                       # the rows of the two rails in the photograph
    reach = 1.42 * (628 - 254) / (2 * GAUGE)       # rows from the middle to a sleeper's end, 1.42 m out
    for k in range(count_sleepers):
        p0, p1 = runs[k % len(runs)]
        x = x0 + (k + .5) * pitch
        half_width = (p1 - p0) / per_metre / 2
        TIMBER = ('track', shot.photo, (p0 + 3, middle - reach, p1 - 3, middle + reach))
        GRAIN = ('track', shot.photo, (p0 + 6, middle - 60, p1 - 6, middle + 60))
        thick = .05 if bed else .2
        box(mesh, x - half_width, x + half_width, -.14 - thick, -.14, -1.42, 1.42,
            {'+y': TIMBER, '+x': GRAIN, '-x': GRAIN, '+z': GRAIN, '-z': GRAIN, '-y': GRAIN})
    RAIL = ('track', shot.photo, (0, 247, w, 261))
    for z in (-GAUGE, GAUGE):
        box(mesh, x0, x0 + length, -.105, 0, z - .035, z + .035, {'+y': RAIL, '+z': RAIL, '-z': RAIL, '+x': RAIL, '-x': RAIL})
        box(mesh, x0, x0 + length, -.14, -.105, z - .075, z + .075, {'+y': RAIL, '+z': RAIL, '-z': RAIL, '+x': RAIL, '-x': RAIL})


if 'rail' in ONLY or 'bridge' in ONLY:
    track_shot = Shot('track-top', 'top', 8.0, 640, keyed_mask=False)
    SLEEPERS = sleepers_in(track_shot)
if 'rail' in ONLY:
    rail_root = empty('mule-rail', train, (-4.0, 0, 9.0))
    rail = Mesh()
    track(rail, track_shot, 8.0, -4.0, True)
    adopt(weld(rail.finish('mule-rail:track', {'track': track_shot.photo.material()})), rail_root)
    TRIANGLES['mule-rail:track'] = rail.triangles()
    PLACE['mule-rail'] = (-4.0, 9.0)

if 'bridge' in ONLY:
    # Side photograph 2172 x 724: a 24 m lattice span. The truss is columns 50 to 2119, its top chord's top at
    # row 161, where the bridge timbers lie; the rail top is 0.34 m above that.
    bridge_root = empty('mule-bridge-span', train, (-30.0, 0, 16.0))
    span = Shot('bridge-side', 'side', 1, 1024)
    span.sx = span.s = 24.0 / (2119 - 50)
    span.cx, span.ground = (50 + 2119) / 2, 161 - .34 / span.s
    bridge = Mesh()
    truss = span.mask.copy()
    truss[500:, :] = False                         # the bearing blocks are built below
    loops = trace(truss, (40, 150, 2130, 501), tolerance=2.2, min_area=300)
    for z in (-1.3, 1.3):
        slab(bridge, 'span', span.photo, loops, span.world, z - .13, z + .13, wall_scale=span.s)
    CHORD = ('span', span.photo, (700, 430, 1000, 462))
    for column in (293, 614, 929, 1243, 1557, 1871):   # the lower nodes carry cross girders
        x = span.X(column)
        box(bridge, x - .12, x + .12, span.Y(462), span.Y(432), -1.2, 1.2, {'+x': CHORD, '-x': CHORD, '+y': CHORD, '-y': CHORD})
    for column in (121, 443, 771, 1086, 1393, 1707, 2029):   # and the upper nodes
        x = span.X(column)
        box(bridge, x - .1, x + .1, span.Y(196), span.Y(170), -1.2, 1.2, {'+x': CHORD, '-x': CHORD, '+y': CHORD, '-y': CHORD})
    for block in ((14, 500, 207, 654), (1964, 500, 2154, 654)):
        STONE = ('span', span.photo, block)
        box(bridge, span.X(block[0]), span.X(block[2]), span.Y(block[3]), span.Y(block[1]), -2.0, 2.0,
            {'+z': STONE, '-z': STONE, '+x': STONE, '-x': STONE, '+y': STONE})
    track(bridge, track_shot, 24.0, -12.0, False)
    adopt(weld(bridge.finish('mule-bridge-span:span', {'span': span.photo.material(), 'track': track_shot.photo.material()})), bridge_root)
    TRIANGLES['mule-bridge-span:span'] = bridge.triangles()
    span.photo.bleed(span.mask, passes=16)
    PLACE['mule-bridge-span'] = (-30.0, 16.0)

# ---------------------------------------------------------------- export

print('TRIANGLES=' + json.dumps(TRIANGLES) + f' total {sum(TRIANGLES.values())}')
for photo, limit in PHOTOS:
    longest = max(photo.image.size)
    if longest > limit:
        photo.image.scale(round(photo.image.size[0] * limit / longest), round(photo.image.size[1] * limit / longest))
    photo.image.pack()
out_glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format='GLB', export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_image_format='JPEG', export_image_quality=74,
                          export_cameras=False, export_lights=False)
print(f'GLB {out_glb} {out_glb.stat().st_size} bytes')

# ---------------------------------------------------------------- review views, from the exported file

if args.render:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out_glb))
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 90
    scene.view_settings.view_transform = 'Standard'
    scene.world = bpy.data.worlds.new('flat overcast')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.84, .84, .86, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = .5
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    scene.collection.objects.link(sun)
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, -.3))
    ground = bpy.context.object
    ground.name = 'review-ground'
    ground_material = bpy.data.materials.new('review ground')
    ground_material.use_nodes = True
    ground_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.36, .35, .34, 1)
    ground_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    ground.data.materials.append(ground_material)
    camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.clip_end = 800
    TRAIN = ['mule-cab', 'cab-coupling', 'mule-tank-wagon-1', 'tank-wagon-1-coupling', 'mule-tank-wagon-2',
             'tank-wagon-2-coupling', 'mule-guard-wagon', 'guard-wagon-coupling', 'mule-box-wagon']

    def under(names):
        found = set()
        for obj in scene.objects:
            node = obj
            while node is not None:
                if node.name in names:
                    found.add(obj)
                    break
                node = node.parent
        return found

    def shot(name, roots, eye, target, size, ortho=None, lens=35, floor=True, floor_at=-.3):
        """eye and target in glTF metres. Only the pieces under `roots` are drawn."""
        shown = under(roots)
        for obj in scene.objects:
            if obj.type == 'MESH':
                obj.hide_render = obj not in shown
        ground.hide_render = not floor
        ground.location.z = floor_at
        scene.render.resolution_x, scene.render.resolution_y = size
        eye_v, target_v = Vector(game(*eye)), Vector(game(*target))
        camera.location = eye_v
        camera.rotation_euler = (target_v - eye_v).to_track_quat('-Z', 'Y').to_euler()
        if ortho:
            camera.data.type = 'ORTHO'
            camera.data.ortho_scale = ortho
        else:
            camera.data.type = 'PERSP'
            camera.data.lens = lens
        scene.render.filepath = str(render_dir / f'{name}.jpg')
        bpy.ops.render.render(write_still=True)

    def repeat(stem, root, offset):
        """The model from the camera that took photograph `stem`, the piece standing at X = offset."""
        eye, target, across, (w, h) = FRAMES[stem]
        scale = min(1, 1100 / w)
        shot(f'same-{stem}', [root], (eye[0] + offset, eye[1], eye[2]), (target[0] + offset, target[1], target[2]),
             (round(w * scale), round(h * scale)), ortho=across, floor=False)

    def piece_views(tag, root, stems, length, extra=()):
        x = PLACE[root]
        for stem in stems:
            repeat(stem, root, x)
        roots = [root, *extra]
        reach = length * .55 + 5
        shot(f'{tag}-road-front', roots, (x + reach, 1.3, 8.5), (x + .5, 1.9, 0), (1100, 620), lens=32)
        shot(f'{tag}-road-rear', roots, (x - reach, 1.3, 8.5), (x - .5, 1.9, 0), (1100, 620), lens=32)
        shot(f'{tag}-high', roots, (x + reach * .8, 7.5, 9.5), (x, 1.6, 0), (1100, 620), lens=35)

    wanted = [name for name in args.render.split(',') if name]
    everything = 'all' in wanted
    if (everything or 'cab' in wanted) and 'mule-cab' in PLACE:
        piece_views('cab', 'mule-cab', ('cab-side', 'cab-front', 'cab-rear', 'cab-top'), 12, ['cab-coupling'])
        shot('cab-close', ['mule-cab', 'cab-coupling'], (-4.5, 1.2, 5.2), (-3.4, 1.0, 0), (1100, 620), lens=30)
    if (everything or 'tank' in wanted) and 'mule-tank-wagon-1' in PLACE:
        x = PLACE['mule-tank-wagon-1']
        shot('tank-side', ['mule-tank-wagon-1'], (x, 1.75, 60), (x, 1.75, 0), (1500, 330), ortho=20.6, floor=False)
        shot('tank-top', ['mule-tank-wagon-1'], (x, 60, 0), (x, 0, 0), (1500, 260), ortho=20.6, floor=False)
        shot('tank-end', ['mule-tank-wagon-1'], (x - 60, 1.9, 0), (x, 1.9, 0), (560, 560), ortho=4.2, floor=False)
        shot('tank-road-front', ['mule-tank-wagon-1'], (x + 15, 1.3, 9), (x + 1, 1.8, 0), (1100, 620), lens=30)
        shot('tank-road-rear', ['mule-tank-wagon-1'], (x - 15, 1.3, 9), (x - 1, 1.8, 0), (1100, 620), lens=30)
        shot('tank-high', ['mule-tank-wagon-1'], (x + 13, 7.5, 9.5), (x, 1.6, 0), (1100, 620), lens=32)
        shot('tank-close', ['mule-tank-wagon-1'], (x - 6.5, 1.2, 5.0), (x - 8.2, 1.0, 0), (1100, 620), lens=30)
    if (everything or 'guard' in wanted) and 'mule-guard-wagon' in PLACE:
        piece_views('guard', 'mule-guard-wagon', ('guard-side', 'guard-end', 'guard-top'), GUARD_LENGTH)
    if (everything or 'box' in wanted) and 'mule-box-wagon' in PLACE:
        piece_views('box', 'mule-box-wagon', ('box-side', 'box-end', 'box-top'), BOX_LENGTH)
        x = PLACE['mule-box-wagon']
        shot('box-door', ['mule-box-wagon'], (x + 2.6, 1.5, 4.6), (x + .2, 1.8, 0), (1100, 620), lens=30)
    if (everything or 'line' in wanted) and 'mule-bridge-span' in PLACE:
        x, z = PLACE['mule-bridge-span']
        shot('bridge-side', ['mule-bridge-span'], (x, -2.2, z + 60), (x, -2.2, z), (1500, 420), ortho=26, floor=False)
        shot('bridge-below', ['mule-bridge-span'], (x + 17, -4.2, z + 13), (x, -1.2, z), (1100, 620), lens=30, floor_at=-6.05)
        shot('bridge-deck', ['mule-bridge-span'], (x - 13.5, 1.6, z + .5), (x, -.2, z), (1100, 620), lens=30, floor_at=-6.05)
    if (everything or 'line' in wanted) and 'mule-rail' in PLACE:
        x, z = PLACE['mule-rail']
        shot('rail-road', ['mule-rail'], (x + 5.5, 1.2, z + 5), (x, -.1, z), (1100, 620), lens=32, floor_at=-.62)
        shot('rail-top', ['mule-rail'], (x, 30, z), (x, 0, z), (1100, 620), ortho=9, floor_at=-.62)
    if (everything or 'train' in wanted) and all(root in PLACE for root in ('mule-cab', 'mule-box-wagon')):
        shot('train-road', TRAIN, (9, 1.25, 13), (-16, 2.0, 0), (1500, 640), lens=24)
        shot('train-side', TRAIN, (-34, 2.0, 120), (-34, 2.0, 0), (1500, 200), ortho=70, floor=False)
        shot('train-high', TRAIN, (12, 14, 26), (-30, 1.5, 0), (1500, 640), lens=30)
        shot('train-tail', TRAIN, (-76, 1.25, 11), (-52, 2.0, 0), (1500, 640), lens=24)
        shot('roof-walk', TRAIN, (-49.5, 5.2, 0), (-20, 2.6, 0), (1500, 640), lens=22)
        shot('coupling-close', TRAIN, (-11.0, 1.5, 3.4), (-12.0, .9, 0), (1100, 620), lens=30)
        shot('coupling-top', TRAIN, (-12.0, 30, 0), (-12.0, 0, 0), (900, 560), ortho=4.6)
