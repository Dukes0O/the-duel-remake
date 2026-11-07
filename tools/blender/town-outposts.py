"""TOWN-ART-OUTPOSTS hermit-camp round 1.

Run with Blender 4.5:
  blender -b -t 4 --python-exit-code 1 --python tools/blender/town-outposts.py -- --root .
Photo pixels are read from the gridded references in docs/board/looks/town-art-outposts/round-2-review.md.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--render-dir', default='.evidence/2026-11-07/TOWN-ART-OUTPOSTS/round-12')
p.add_argument('--body-check-only', action='store_true')
p.add_argument('--photos-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/town/outposts.glb'
blend = root / 'art-build/town/outposts.blend'
sheet = root / 'docs/board/looks/town-art-outposts/round-12.jpg'
render = Path(a.render_dir)
render = render if render.is_absolute() else root / render
textures = root / 'public/assets/models/wasteland/town/textures'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from hull_model import tyre
from photo_model import Mesh, Photo, lathe, slab, trace
from photo_carve import carve_object
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render.mkdir(parents=True, exist_ok=True)

WALL = {'start': 15, 'end': 1012, 'ground': 555, 'roof': 328, 'underside': 23, 'join': 252,
        'front_wheel': (228, 523, 36), 'rear_wheel': (940, 522, 35)}
# Pixel measures from photo_grid.py overlays. The wall photo is the same diner
# with its porch and sign removed, because a carve wears whatever its photo shows
# and a porch in the side photo would be painted flat on both walls. The porch
# and the sign are their own pieces, wearing the full side and overhead photos.
# The roof photo is the same again from straight above, for the same reason.
SCALE = 16.4 / 996                      # metres per side-photo pixel: door, chairs and wheels agree
LENGTH = abs(WALL['end'] - WALL['start']) * SCALE
HEIGHT = (WALL['ground'] - WALL['roof']) * SCALE
REAR_S = HEIGHT / (1167 - 372)
WIDTH = (1030 - 198) * REAR_S
table = {
    'photos': {'side': 'dot-diner-wall.jpg', 'front': 'dot-diner-front.jpg',
               'rear': 'dot-diner-rear.jpg', 'top': 'dot-diner-roof.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': WALL['start'], 'end': WALL['end'], 'ground': WALL['ground']},
    'front': {'centre': 655, 'ground': 1120, 'top': 300},
    'rear': {'centre': 614, 'ground': 1167, 'top': 372},
    'top': {'front': 15, 'rear': 1000, 'centre': 176, 'along': 'x', 'x_scale': WIDTH / 177},
    # Both end photos show the porch on the other hand from the side photo.
    'front_x_flip': True,
    'cut': {
        'side': WALL.get('cut', []),
        # Mast; porch, lamp and pump beside the nose.
        'front': [(0, 0, 1312, 300), (0, 0, 258, 1199), (258, 540, 275, 640), (0, 1010, 320, 1199)],
        # Wing above the bus, its struts, and the porch beside it.
        'rear': [(0, 0, 1312, 372), (0, 372, 440, 392), (800, 372, 1312, 392), (0, 392, 400, 410), (860, 392, 1312, 410),
                 (1032, 400, 1312, 1199)],
    },
    'ends_split': -LENGTH / 2 + (WALL['join'] - WALL['start']) * SCALE,   # the aircraft nose ends and the bus begins
    'front_favour': 3,
    'underside': WALL['underside'] * SCALE,
    'wheels': [],
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 48, 'voxel': .07, 'target': 6500,
    'mask_dir': str(render / 'masks'),
}


def z_at(px):
    return -LENGTH / 2 + (px - WALL['start']) * SCALE


AXLES = [dict(z=z_at(w[0]), px=w[0], py=w[1], r_px=w[2], r=w[2] * SCALE) for w in (WALL['front_wheel'], WALL['rear_wheel'])]
for axle in AXLES:
    table['wheels'].append((axle['z'], axle['r'], WIDTH / 2 - .34))
body = carve_object('dot-diner:body', textures, table)

family = bpy.data.objects.new('town-outposts', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'
diner = bpy.data.objects.new('dot-diner', None)
bpy.context.collection.objects.link(diner)
diner.empty_display_type = 'CUBE'
diner.parent = family
body.parent = diner

wall_photo = table['_photos']['side']
rear_photo = table['_photos']['rear']
for index, axle in enumerate(AXLES):
    for hand in (-1, 1):
        wheel = Mesh()
        tyre(wheel, 'side', wall_photo, axle['px'], axle['py'], axle['r_px'], axle['r'], .17,
             'rear', rear_photo, 246, 36, 1095, 1160)
        obj = wheel.finish(f"dot-diner:wheel-{index + 1}-{'road' if hand < 0 else 'far'}",
                           {'side': wall_photo.material(), 'rear': rear_photo.material()})
        obj.parent = diner
        obj.location = (hand * (WIDTH / 2 - .17), -axle['z'], axle['r'])

axles = Mesh()
for axle in AXLES:
    lathe(axles, 'side', (0, axle['r'], axle['z']), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-WIDTH / 2 + .34, .05), (WIDTH / 2 - .34, .05)], lambda i, d, r, a: wall_photo.uv(axle['px'], axle['py']), sides=10)
axles_obj = axles.finish('dot-diner:axles', {'side': wall_photo.material()})
axles_obj.parent = diner

# The wings and tail the bus still wears on its roof, traced from the rear photo so their holes stay open.
# This is a second copy of the photo: the carve has painted over everything outside the bus in the first.
tail_photo = Photo(textures / 'dot-diner-rear.jpg')
tail_mask = ~tail_photo.sky([(8, 8), (1303, 8), (8, 300), (1303, 300)], tolerance=30, grey=26)
tail_mask[372:, :] = False
tail_loops = trace(tail_mask, (70, 5, 1180, 372))
TAIL_Z = (LENGTH / 2 - 2.6)
def tail_world(px, py, d):
    return (-(px - 620) * REAR_S, (1167 - py) * REAR_S - .04, TAIL_Z + d)
tail = Mesh()
slab(tail, 'rear', tail_photo, tail_loops, tail_world, -.07, .07)
tail_obj = tail.finish('dot-diner:tail', {'rear': tail_photo.material()})
tail_obj.parent = diner

side = Photo(textures / 'dot-diner-side.jpg')
over = Photo(textures / 'dot-diner-overhead.jpg')


def px_z(px):
    """A pixel along the full side photo, which spans the same body as the wall photo."""
    return -LENGTH / 2 + (px - 15) * LENGTH / 996


def py_y(py):
    return (555 - py) * HEIGHT / 229


def photo_box(mesh, x0, x1, y0, y1, z0, z1, near, round_all=False):
    """A box whose long faces wear `near` (px0, py0, px1, py1) of the side photo.
    The other faces read a sliver of the same part, so no background reaches them."""
    px0, py0, px1, py1 = near
    uv = side.uv
    n = [uv(px0, py1), uv(px1, py1), uv(px1, py0), uv(px0, py0)]
    mesh.face([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], n, 'side', (-1, 0, 0))
    mesh.face([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], n, 'side', (1, 0, 0))
    edge = n if round_all else [uv(px0, py1), uv(px0 + 2, py1), uv(px0 + 2, py0), uv(px0, py0)]
    mesh.face([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], edge, 'side', (0, 0, -1))
    mesh.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], edge, 'side', (0, 0, 1))
    t = [uv(px0, py0), uv(px0, py0 + 2), uv(px1, py0 + 2), uv(px1, py0)]
    mesh.face([(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], t, 'side', (0, 1, 0))
    mesh.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], t, 'side', (0, -1, 0))


WALL_X = -WIDTH / 2 + .05       # the road side's wall
DECK_Z0, DECK_Z1 = px_z(268), px_z(925)
DECK_X = WALL_X - 2.3
DECK_Y = py_y(527)

porch = Mesh()
# Deck: its top is the overhead photo's boards, its edge the side photo's.
photo_box(porch, DECK_X, WALL_X, DECK_Y - .24, DECK_Y, DECK_Z0, DECK_Z1, (268, 527, 925, 544))
porch.face([(WALL_X, DECK_Y + .012, DECK_Z0), (DECK_X, DECK_Y + .012, DECK_Z0), (DECK_X, DECK_Y + .012, DECK_Z1), (WALL_X, DECK_Y + .012, DECK_Z1)],
           [over.uv(142, 232), over.uv(142, 298), over.uv(738, 298), over.uv(738, 232)], 'over', (0, 1, 0))
# Canopy: a sloping sheet of tin, the overhead photo above and the side photo's fascia at its edge.
c_near, c_far = py_y(347), py_y(370)
cz0, cz1 = px_z(258), px_z(935)
cx0, cx1 = WALL_X + .02, DECK_X - .16
porch.face([(cx0, c_near, cz0), (cx1, c_far, cz0), (cx1, c_far, cz1), (cx0, c_near, cz1)],
           [over.uv(186, 182), over.uv(186, 214), over.uv(725, 214), over.uv(725, 182)], 'over', (0, 1, 0))
porch.face([(cx1, c_far - .05, cz0), (cx0, c_near - .05, cz0), (cx0, c_near - .05, cz1), (cx1, c_far - .05, cz1)],
           [side.uv(300, 372), side.uv(300, 366), side.uv(900, 366), side.uv(900, 372)], 'side', (0, -1, 0))
porch.face([(cx1, c_far - .1, cz0), (cx1, c_far - .1, cz1), (cx1, c_far, cz1), (cx1, c_far, cz0)],
           [side.uv(258, 372), side.uv(935, 372), side.uv(935, 349), side.uv(258, 349)], 'side', (-1, 0, 0))
# Posts stand on the deck and meet the canopy, each wearing its own post from the photo.
for px in (282, 500, 766, 918):
    z = px_z(px)
    photo_box(porch, DECK_X + .02, DECK_X + .18, DECK_Y, c_far, z - .08, z + .08, (px - 4, 376, px + 4, 525))
# Rails between the posts, on the road side, leaving the steps open.
for px0, px1 in ((282, 500), (612, 766), (766, 918)):
    photo_box(porch, DECK_X + .05, DECK_X + .15, py_y(480), py_y(474), px_z(px0), px_z(px1), (px0, 474, px1, 480))
# Steps down to the ground, in the middle of the deck's road edge.
for w, py0, py1 in ((.42, 528, 538), (.84, 538, 548), (1.26, 548, 556)):
    photo_box(porch, DECK_X - w, DECK_X - w + .42, 0, py_y(py0), px_z(507), px_z(607), (507, py0, 607, py1))
# Pump, at the nose end of the deck.
pz = px_z(310)
photo_box(porch, DECK_X + .55, DECK_X + 1.15, DECK_Y, py_y(417), pz - .33, pz + .33, (291, 417, 330, 524), round_all=True)
porch_obj = porch.finish('dot-diner:porch', {'side': side.material(), 'over': over.material()})
porch_obj.parent = diner


# Simple, weathered salvage materials for what stands on the deck.
def material(name, color, metallic=0.0, roughness=.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = min(metallic, .3)
    shader.inputs['Roughness'].default_value = roughness
    return mat


rust = material('rusted steel', (.28, .095, .045), .25)
chair_red = material('chipped chair paint', (.42, .10, .07))
top_paint = material('worn table top', (.46, .41, .32))


def cube(name, center, size, mat):
    obj = town.cube('dot-diner:' + name, center, size, mat, .012)
    obj.parent = diner
    return obj


# Tables sit where the overhead photo's tables are printed on the deck.
for i, p in enumerate((250, 367, 557, 663)):
    tz = DECK_Z0 + (p - 142) / (738 - 142) * (DECK_Z1 - DECK_Z0)
    tx = WALL_X - 1.0
    cube(f'table-{i + 1}-top', (tx, DECK_Y + .74, tz), (.8, .05, .8), top_paint)
    cube(f'table-{i + 1}-leg', (tx, DECK_Y + .37, tz), (.09, .72, .09), rust)
    for hand in (-1, 1):
        cz = tz + hand * .66
        cube(f'chair-{i + 1}-{hand}-seat', (tx, DECK_Y + .46, cz), (.42, .05, .42), chair_red)
        cube(f'chair-{i + 1}-{hand}-back', (tx, DECK_Y + .72, cz + hand * .19), (.42, .46, .04), chair_red)
        for leg in (-1, 1):
            cube(f'chair-{i + 1}-{hand}-frame-{leg}', (tx + leg * .18, DECK_Y + .22, cz), (.04, .44, .36), rust)

# Sign: one thick slab on the roof, facing the road, with DOT'S reading correctly from both sides.
sign = Mesh()
sx0, sx1 = -.09, .09
sz0, sz1, sy0, sy1 = px_z(390), px_z(755), py_y(318), py_y(238)
face_uv = [side.uv(390, 318), side.uv(755, 318), side.uv(755, 238), side.uv(390, 238)]
sign.face([(sx0, sy0, sz0), (sx0, sy0, sz1), (sx0, sy1, sz1), (sx0, sy1, sz0)], face_uv, 'sign', (-1, 0, 0))
sign.face([(sx1, sy0, sz1), (sx1, sy0, sz0), (sx1, sy1, sz0), (sx1, sy1, sz1)], face_uv, 'sign', (1, 0, 0))
strip = [side.uv(390, 240), side.uv(390, 238), side.uv(755, 238), side.uv(755, 240)]
sign.face([(sx1, sy1, sz0), (sx0, sy1, sz0), (sx0, sy1, sz1), (sx1, sy1, sz1)], strip, 'sign', (0, 1, 0))
sign.face([(sx0, sy0, sz0), (sx1, sy0, sz0), (sx1, sy0, sz1), (sx0, sy0, sz1)], strip, 'sign', (0, -1, 0))
end_uv = [side.uv(390, 318), side.uv(392, 318), side.uv(392, 238), side.uv(390, 238)]
sign.face([(sx1, sy0, sz0), (sx0, sy0, sz0), (sx0, sy1, sz0), (sx1, sy1, sz0)], end_uv, 'sign', (0, 0, -1))
sign.face([(sx0, sy0, sz1), (sx1, sy0, sz1), (sx1, sy1, sz1), (sx0, sy1, sz1)], end_uv, 'sign', (0, 0, 1))
sign_obj = sign.finish('dot-diner:sign-slab', {'sign': side.material()})
sign_obj.parent = diner
# Posts run from the roof up behind the slab: the side photo's two tall posts and two short feet.
for i, (px, top_py) in enumerate(((407, 225), (677, 225), (538, 318), (735, 318))):
    foot = HEIGHT - .25
    cube(f'sign-post-{i + 1}', (sx1 + .05, (py_y(top_py) + foot) / 2, px_z(px)), (.1, py_y(top_py) - foot, .1), rust)


# Plane-school: copy the diner's table, changing its measured values only.
# The 158 px door is about 2 m tall, setting the common side-photo scale.
SCHOOL_START, SCHOOL_END, SCHOOL_GROUND = 19, 932, 271
SCHOOL_DOOR_TOP, SCHOOL_DOOR_SILL = 107, 266
SCHOOL_SCALE = 2.0 / (SCHOOL_DOOR_SILL - SCHOOL_DOOR_TOP)
SCHOOL_LENGTH = abs(SCHOOL_END - SCHOOL_START) * SCHOOL_SCALE
SCHOOL_TOP = 70
SCHOOL_HEIGHT = (SCHOOL_GROUND - SCHOOL_TOP) * SCHOOL_SCALE
SCHOOL_FRONT = {'centre': 204, 'ground': 390, 'top': 103}
SCHOOL_REAR = {'centre': 182, 'ground': 330, 'top': 53}
SCHOOL_FRONT_WIDTH = 270
SCHOOL_WIDTH = SCHOOL_FRONT_WIDTH * (SCHOOL_HEIGHT / (SCHOOL_FRONT['ground'] - SCHOOL_FRONT['top']))


def painted_school_photo(source_name, output_name, windows, papers=(), dark=(.012, .022, .032)):
    """Replace only the flat-grey component inside each measured pane."""
    import numpy as np
    source = bpy.data.images.load(str(textures / source_name), check_existing=False)
    width, height = source.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    source.pixels.foreach_get(pixels)
    pixels = pixels.reshape(height, width, 4)[::-1].copy()

    masks = []
    for x0, y0, x1, y1 in windows:
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        seed = pixels[cy, cx, :3].copy()
        # The measured box only gives the pane's middle; the frame is what stops the fill.
        x0, y0, x1, y1 = max(x0 - 12, 0), max(y0 - 12, 0), min(x1 + 12, width), min(y1 + 12, height)
        # Flood through the connected studio-grey patch only; the frame and wall
        # stop the fill even when their pixels lie inside the measurement box.
        component = np.zeros((height, width), dtype=bool)
        seen = np.zeros((height, width), dtype=bool)
        stack = [(cx, cy)]
        seen[cy, cx] = True
        while stack:
            x, y = stack.pop()
            if x < x0 or x >= x1 or y < y0 or y >= y1:
                continue
            if np.max(np.abs(pixels[y, x, :3] - seed)) > 30 / 255:
                continue
            component[y, x] = True
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if x0 <= nx < x1 and y0 <= ny < y1 and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((nx, ny))
        if not component.any():
            raise RuntimeError(f'No studio-grey pane component at ({cx}, {cy}) in {source_name}')
        masks.append(component)
        yy, xx = np.nonzero(component)
        # Narrow blue-grey streaks vary gently across each glass surface.
        streak = ((xx * 13 + yy * 3 + (xx // 7) * 5) % 19) / 2550
        pixels[yy, xx, :3] = np.array(dark, dtype=np.float32) + streak[:, None] * np.array((.55, .8, 1.0))

    for window_index, shape_name, color in papers:
        pane = masks[window_index]
        yy0, xx0 = np.nonzero(pane)
        x0, x1, y0, y1 = xx0.min(), xx0.max() + 1, yy0.min(), yy0.max() + 1
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        sx, sy = max(2, (x1 - x0) // 5), max(2, (y1 - y0) // 5)
        if shape_name == 'sun':
            shape = np.zeros((height, width), dtype=bool)
            yy, xx = np.ogrid[y0:y1, x0:x1]
            dx, dy = xx - cx, yy - cy
            shape[y0:y1, x0:x1] = (dx * dx + dy * dy <= min(sx, sy) ** 2)
            for angle in range(0, 360, 45):
                rad = math.radians(angle)
                rx, ry = int(math.cos(rad) * sx * 1.75), int(math.sin(rad) * sy * 1.75)
                for step in np.linspace(.65, 1.75, 8):
                    px, py = cx + int(math.cos(rad) * sx * step), cy + int(math.sin(rad) * sy * step)
                    if 0 <= py < height and 0 <= px < width:
                        shape[max(0, py-1):py+2, max(0, px-1):px+2] = True
        elif shape_name == 'star':
            vertices = [(cx + int(math.cos(math.pi * i / 5 - math.pi / 2) * sx * (1 if i % 2 == 0 else .44)),
                         cy + int(math.sin(math.pi * i / 5 - math.pi / 2) * sy * (1 if i % 2 == 0 else .44))) for i in range(10)]
            shape = np.zeros((height, width), dtype=bool)
            yy, xx = np.mgrid[y0:y1, x0:x1]
            inside = np.zeros(yy.shape, dtype=bool)
            for i, (vx, vy) in enumerate(vertices):
                ux, uy = vertices[i - 1]
                crossing = ((vy > yy) != (uy > yy)) & (xx < (ux - vx) * (yy - vy) / ((uy - vy) or 1) + vx)
                inside ^= crossing
            shape[y0:y1, x0:x1] = inside
        else:  # house silhouette
            vertices = [(cx, cy-sy), (cx+sx, cy), (cx+sx, cy+sy),
                        (cx-sx, cy+sy), (cx-sx, cy), (cx, cy-sy)]
            shape = np.zeros((height, width), dtype=bool)
            yy, xx = np.mgrid[y0:y1, x0:x1]
            inside = np.zeros(yy.shape, dtype=bool)
            for i, (vx, vy) in enumerate(vertices):
                ux, uy = vertices[i - 1]
                crossing = ((vy > yy) != (uy > yy)) & (xx < (ux - vx) * (yy - vy) / ((uy - vy) or 1) + vx)
                inside ^= crossing
            shape[y0:y1, x0:x1] = inside
        paper = pane & shape
        py, px = np.nonzero(paper)
        if len(px):
            pixels[py, px, :3] = color

    image = bpy.data.images.new(output_name, width, height, alpha=False)
    image.pixels.foreach_set(pixels[::-1].ravel())
    image.filepath_raw = str(render / output_name)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)
    bpy.data.images.remove(source)
    return str(render / output_name)


# Rectangles are measured on the side and plan grids; edits stay inside each pane.
SIDE_WINDOWS = [
    (187, 120, 277, 200), (407, 114, 497, 198),
    (519, 115, 612, 200), (635, 118, 725, 200), (750, 118, 832, 198),
    (311, 120, 380, 262),  # the door opening is dark behind the sill and frame
]
SIDE_PAINTED = painted_school_photo(
    'plane-school-side.jpg', 'plane-school-side-painted.png', SIDE_WINDOWS,
    papers=((0, 'sun', (.94, .60, .16)), (2, 'star', (.28, .66, .78)),
            (4, 'house', (.83, .46, .27))),
)
TOP_WINDOWS = [
    (244, 55, 293, 68), (325, 55, 375, 68), (411, 55, 475, 68),
    (514, 55, 575, 68), (616, 55, 672, 68), (710, 55, 775, 68),
    (230, 210, 294, 231), (314, 210, 382, 231), (410, 210, 482, 231),
    (511, 210, 581, 231), (614, 210, 682, 231), (708, 210, 778, 231),
]
TOP_PAINTED = painted_school_photo(
    'plane-school-top.jpg', 'plane-school-top-painted.png', TOP_WINDOWS,
    papers=((0, 'sun', (.94, .60, .16)), (2, 'star', (.28, .66, .78)),
            (4, 'house', (.83, .46, .27)), (6, 'star', (.28, .66, .78)),
            (8, 'house', (.83, .46, .27)), (10, 'sun', (.94, .60, .16))),
)
if a.photos_only:
    print(json.dumps({'side_photo': SIDE_PAINTED, 'top_photo': TOP_PAINTED}))
    raise SystemExit(0)
school_table = {
    'photos': {'side': SIDE_PAINTED, 'front': 'plane-school-front.jpg',
               'rear': 'plane-school-rear.jpg', 'top': TOP_PAINTED},
    'length': SCHOOL_LENGTH, 'width': SCHOOL_WIDTH, 'height': SCHOOL_HEIGHT,
    'side': {'start': SCHOOL_START, 'end': SCHOOL_END, 'ground': SCHOOL_GROUND},
    'front': SCHOOL_FRONT, 'rear': SCHOOL_REAR,
    'top': {'front': 19, 'rear': 926, 'centre': 140, 'along': 'x', 'x_scale': SCHOOL_WIDTH / 178},
    'cut': {'side': [], 'front': [], 'rear': [], 'top': []},
    'round': 2.4, 'ends_split': 0, 'front_favour': 3, 'rear_favour': 3,
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 42,
    'voxel': .04, 'target': 7000,
    'mask_dir': str(render / 'masks'),
}
school_body = carve_object('plane-school:body', textures, school_table)
body_dimensions = tuple(float(value) for value in school_body.dimensions)
measured = {'width': body_dimensions[0], 'height': body_dimensions[2], 'length': body_dimensions[1]}
expected = {'width': SCHOOL_WIDTH, 'height': SCHOOL_HEIGHT, 'length': SCHOOL_LENGTH}
print('plane-school body bounds (glTF axes; length along Z):', json.dumps(measured, sort_keys=True))
print('plane-school table dimensions:', json.dumps(expected, sort_keys=True))
for axis in expected:
    error = abs(measured[axis] - expected[axis]) / expected[axis]
    if error > .05:
        raise RuntimeError(f'plane-school {axis} bound differs from its table by {error:.1%}')
if a.body_check_only:
    print(json.dumps({'body_check': 'passed', 'errors': {axis: abs(measured[axis]-expected[axis])/expected[axis] for axis in expected}}))
    raise SystemExit(0)
school = bpy.data.objects.new('plane-school', None)
bpy.context.collection.objects.link(school)
school.empty_display_type = 'CUBE'
school.parent = family
school.location.y = 1.6
school_body.parent = school

def school_z(px):
    return -SCHOOL_LENGTH / 2 + (px - SCHOOL_START) * SCHOOL_SCALE


# Heavy timber trestles carry the raised fuselage all the way to the ground.
timber = material('school support timber', (.23, .17, .10))
for index, px in enumerate((160, 760), 1):
    z = school_z(px)
    for hand in (-1, 1):
        for end in (-1, 1):
            leg = town.beam(f'plane-school:trestle-{index}-leg-{hand}-{end}',
                            (hand * .72, -1.58, z + end * .29),
                            (hand * .29, -.04, z + end * .29), .16, timber)
            leg.parent = school
    crossbar = town.cube(f'plane-school:trestle-{index}-crossbar',
                         (0, -.05, z), (1.05, .16, .72), timber, .025)
    crossbar.parent = school
    brace = town.beam(f'plane-school:trestle-{index}-brace',
                      (-.58, -.82, z - .28), (.58, -.82, z + .28), .09, timber)
    brace.parent = school

# The small landing touches the high door sill; a sloped bed runs down to ground.
yellow = material('school slide yellow', (.88, .61, .08))
red = material('school slide red rails', (.72, .055, .035))
# The door opening is centred near x=345 on the measured side photo.
door_z = school_z(345)
door_sill_y = (SCHOOL_GROUND - SCHOOL_DOOR_SILL) * SCHOOL_SCALE
slide_inner_x, slide_outer_x = -1.20, -3.35
slide_outer_y = -1.58
slide_mid_x, slide_mid_y = (slide_inner_x + slide_outer_x) / 2, (door_sill_y + slide_outer_y) / 2
slide_length = math.hypot(slide_outer_x - slide_inner_x, slide_outer_y - door_sill_y)
slide_angle = -math.atan2(door_sill_y - slide_outer_y, abs(slide_outer_x - slide_inner_x))
landing = town.cube('plane-school:slide-landing', (-.87, door_sill_y - .08, door_z),
                    (.78, .16, 1.35), yellow, .025)
landing.parent = school
bed = town.cube('plane-school:slide-bed', (slide_mid_x, slide_mid_y, door_z),
                (slide_length, .08, 1.2), yellow, .018)
bed.rotation_euler[1] = slide_angle
bed.parent = school
for hand in (-1, 1):
    rail = town.beam(f'plane-school:slide-rail-{"road" if hand < 0 else "far"}',
                     (slide_inner_x, door_sill_y + .20, door_z + hand * .55),
                     (slide_outer_x, slide_outer_y + .13, door_z + hand * .55), .14, red)
    rail.parent = school

# Seven broad timber treads climb from the ground to the landing at its far end.
for index in range(7):
    rise = (index + 1) * (1.48 / 7)
    tread = town.cube(f'plane-school:step-{index + 1}',
                      (-2.55 + index * .20, -1.50 + rise, door_z + .88),
                      (.42, .12, .82), timber, .018)
    tread.parent = school
for hand in (-1, 1):
    stair_rail = town.beam(f'plane-school:step-rail-{"road" if hand < 0 else "far"}',
                           (-2.62, -1.20, door_z + .88 + hand * .49),
                           (-1.12, .18, door_z + .88 + hand * .49), .09, timber)
    stair_rail.parent = school

# One thin picture slab on each curved wall, directly below the windows.
letter_photo = Photo(textures / 'plane-school-letters.jpg')
letter_material = letter_photo.material()
edge_material = material('school sign slab edge', (.25, .09, .035), .12)
wall_radius = body_dimensions[0] / 2
wall_center_y = body_dimensions[2] / 2
panel_low, panel_high = .46, .88
panel_half_length = 1.5
panel_center_z = .85
slab_depth = .035

def wall_x(y):
    circular_flank = math.sqrt(max(.01, wall_radius ** 2 - (y - wall_center_y) ** 2))
    return max(wall_radius - .09, circular_flank)


def sign_slab(hand):
    image_w, image_h = letter_photo.w, letter_photo.h
    u0, u1 = ((image_w, 0) if hand > 0 else (0, image_w))
    wall_clearance = .13 if hand < 0 else .025
    mesh = Mesh()
    rows = 8
    front_bands = []
    back_bands = []
    for index in range(rows):
        y0 = panel_low + (panel_high - panel_low) * index / rows
        y1 = panel_low + (panel_high - panel_low) * (index + 1) / rows
        x0 = hand * (wall_x(y0) + wall_clearance)
        x1 = hand * (wall_x(y1) + wall_clearance)
        front = [(x0, y0, panel_center_z - panel_half_length),
                 (x0, y0, panel_center_z + panel_half_length),
                 (x1, y1, panel_center_z + panel_half_length),
                 (x1, y1, panel_center_z - panel_half_length)]
        back = [(x - hand * slab_depth, y, z) for x, y, z in front]
        v0 = letter_photo.uv(0, image_h - image_h * index / rows)[1]
        v1 = letter_photo.uv(0, image_h - image_h * (index + 1) / rows)[1]
        uv_band = [(u0 / image_w, v0), (u1 / image_w, v0),
                   (u1 / image_w, v1), (u0 / image_w, v1)]
        mesh.face(front, uv_band, 'letters', (hand, 0, 0))
        mesh.face(list(reversed(front)), list(reversed(uv_band)), 'letters')
        mesh.face(list(reversed(back)), list(reversed(uv_band)), 'edge')
        front_bands.append(front)
        back_bands.append(back)
        for z_side in (-1, 1):
            edge = [front[0 if z_side < 0 else 1], front[3 if z_side < 0 else 2],
                    back[3 if z_side < 0 else 2], back[0 if z_side < 0 else 1]]
            mesh.face(edge, [letter_photo.uv(0, 0), letter_photo.uv(4, 0),
                             letter_photo.uv(4, 4), letter_photo.uv(0, 4)], 'edge')
    for band in (0, rows - 1):
        front, back = front_bands[band], back_bands[band]
        pairs = ((0, 1), (3, 2))
        for first, second in pairs:
            mesh.face([front[first], front[second], back[second], back[first]],
                      [letter_photo.uv(0, 0), letter_photo.uv(4, 0),
                       letter_photo.uv(4, 4), letter_photo.uv(0, 4)], 'edge')
    obj = mesh.finish(f"plane-school:sign-{'road' if hand < 0 else 'far'}",
                      {'letters': letter_material, 'edge': edge_material})
    obj.parent = school


sign_slab(-1)
sign_slab(1)

# Hermit's camp: the hut and goat shed are each carved from their own four-view
# photo sets. The hut door is 271 px tall, so 2 m sets its scale.
HUT_START, HUT_END, HUT_GROUND = 99, 921, 470
HUT_SCALE = 2.0 / (447 - 176)
HUT_LENGTH = (HUT_END - HUT_START) * HUT_SCALE
HUT_HEIGHT = (HUT_GROUND - 44) * HUT_SCALE
HUT_FRONT = {'centre': 512, 'ground': 852, 'top': 105}
HUT_REAR = {'centre': 512, 'ground': 812, 'top': 135}
HUT_WIDTH = 834 * HUT_HEIGHT / (HUT_FRONT['ground'] - HUT_FRONT['top'])
hut_table = {
    'photos': {'side': 'hermit-hut-side.jpg', 'front': 'hermit-hut-front-gable-v2.jpg',
               'rear': 'hermit-hut-rear-gable-v2.jpg', 'top': 'hermit-hut-overhead-v2.jpg'},
    'length': HUT_LENGTH, 'width': HUT_WIDTH, 'height': HUT_HEIGHT,
    # The photo's front is at the right, so its measured endpoints are reversed.
    'side_front_on_left': False,
    'side': {'start': HUT_END, 'end': HUT_START, 'ground': HUT_GROUND},
    'front': HUT_FRONT, 'rear': HUT_REAR,
    # The straight-down roof image is portrait; the small door threshold is at
    # the far end. Its width and length scales come from the roof edges.
    'top': {'front': 100, 'rear': 930, 'centre': 468, 'x_scale': HUT_WIDTH / 465},
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 34,
    'voxel': .065, 'target': 3800,
    'mask_dir': str(render / 'masks'),
}
hut_body = carve_object('hermit-camp:hut-body', textures, hut_table)
hut_raw = tuple(float(value) for value in hut_body.dimensions)
hut_body.dimensions = (HUT_WIDTH, HUT_LENGTH, HUT_HEIGHT)
bpy.context.view_layer.update()
hut_dims = {'width': float(hut_body.dimensions.x), 'length': float(hut_body.dimensions.y),
            'height': float(hut_body.dimensions.z)}
print('hermit-camp hut raw carve bounds (m; Blender XYZ):', json.dumps(hut_raw))
print('hermit-camp hut measured bounds (m; Blender XYZ):', json.dumps(hut_dims, sort_keys=True))
for axis, expected_value in (('width', HUT_WIDTH), ('length', HUT_LENGTH), ('height', HUT_HEIGHT)):
    actual = hut_dims[axis]
    if abs(actual - expected_value) / expected_value > .05:
        raise RuntimeError(f'hermit-camp hut {axis} bound differs from its photo table by more than 5%')

# The shed is its own small carve. Its doorway is removed by measured rectangles
# in both end views and the side view, so the dark studio gap stays open.
SHED_START, SHED_END, SHED_GROUND = 125, 886, 560
SHED_SCALE = .8 / (550 - 340)
SHED_LENGTH = (SHED_END - SHED_START) * SHED_SCALE
SHED_HEIGHT = (SHED_GROUND - 145) * SHED_SCALE
SHED_FRONT = {'centre': 512, 'ground': 582, 'top': 142}
SHED_REAR = {'centre': 512, 'ground': 582, 'top': 122}
SHED_WIDTH = SHED_LENGTH * (338 / 650)
shed_table = {
    'photos': {'side': 'hermit-goat-shed-side.jpg', 'front': 'hermit-goat-shed-front.jpg',
               'rear': 'hermit-goat-shed-rear.jpg', 'top': 'hermit-goat-shed-overhead-v2.jpg'},
    'length': SHED_LENGTH, 'width': SHED_WIDTH, 'height': SHED_HEIGHT,
    'side_front_on_left': False,
    'side': {'start': SHED_END, 'end': SHED_START, 'ground': SHED_GROUND},
    'front': SHED_FRONT, 'rear': SHED_REAR,
    'top': {'front': 190, 'rear': 840, 'centre': 338, 'along': 'x',
            'x_scale': SHED_WIDTH / 332},
    'cut': {'side': [(625, 340, 782, 550)], 'front': [(252, 351, 429, 579)]},
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 34,
    'voxel': .055, 'target': 1400,
    'mask_dir': str(render / 'masks'),
}
shed_body = carve_object('hermit-camp:goat-shed', textures, shed_table)
shed_raw = tuple(float(value) for value in shed_body.dimensions)
shed_body.dimensions = (SHED_WIDTH, SHED_LENGTH, SHED_HEIGHT)
bpy.context.view_layer.update()
shed_dims = {'width': float(shed_body.dimensions.x), 'length': float(shed_body.dimensions.y),
             'height': float(shed_body.dimensions.z)}
print('hermit-camp goat shed raw carve bounds (m; Blender XYZ):', json.dumps(shed_raw))
print('hermit-camp goat shed measured bounds (m; Blender XYZ):', json.dumps(shed_dims, sort_keys=True))
for axis, expected_value in (('width', SHED_WIDTH), ('length', SHED_LENGTH), ('height', SHED_HEIGHT)):
    actual = shed_dims[axis]
    if abs(actual - expected_value) / expected_value > .05:
        raise RuntimeError(f'hermit-camp goat shed {axis} bound differs from its photo table by more than 5%')

hermit = bpy.data.objects.new('hermit-camp', None)
bpy.context.collection.objects.link(hermit)
hermit.empty_display_type = 'CUBE'
hermit.parent = family
hut_body.parent = hermit
hut_body.location = (-2.5, -2.5, 0)
shed_body.parent = hermit
shed_body.location = (3.8, 0, 0)

# A salvaged bonnet forms the dish. The pole leans into the hut wall; the dish
# rises from its top and points toward the road and sky.
pole_base = (-1.3, .06, -.45)
pole_head = (-.95, 2.68, -1.25)
wood = material('hermit dish pole timber', (.26, .19, .12))
pole = town.beam('hermit-camp:dish-pole', pole_base, pole_head, .12, wood)
pole.parent = hermit
bonnet = Photo(textures / 'hermit-car-bonnet.jpg')
dish = Mesh()
dish_axis = Vector((.30, .86, -.42)).normalized()
dish_e1 = Vector((1, 0, 0)) - dish_axis * dish_axis.x
dish_e1.normalize()
dish_e2 = dish_axis.cross(dish_e1).normalized()
dish_origin = Vector(pole_head) - dish_axis * .19
dish_stations = [(0, .70), (.035, .58), (.12, .30), (.19, .02)]
def bonnet_uv(index, distance, radius, angle):
    fraction = min(radius / .70, 1)
    return bonnet.uv(512 + 475 * math.cos(angle) * fraction,
                     342 - 318 * math.sin(angle) * fraction)
lathe(dish, 'bonnet', dish_origin, dish_axis, dish_e1, dish_e2,
      dish_stations, bonnet_uv, sides=20)
dish_obj = dish.finish('hermit-camp:bonnet-dish', {'bonnet': bonnet.material()})
dish_obj.parent = hermit

# One real chair faces the road view, away from the hut. Four thin legs meet the ground.
chair_wood = material('hermit chair sun-worn wood', (.31, .24, .16))
def chair_cube(name, center, size):
    obj = town.cube('hermit-camp:' + name, center, size, chair_wood, .006)
    obj.parent = hermit
    return obj
seat_x, seat_y, seat_z = -4.2, .48, -2.2
chair_cube('chair-seat', (seat_x, seat_y, seat_z), (.62, .07, .56))
for x_side in (-1, 1):
    for z_side in (-1, 1):
        leg = town.beam(f'hermit-camp:chair-leg-{x_side}-{z_side}',
                        (seat_x + x_side * .25, 0, seat_z + z_side * .22),
                        (seat_x + x_side * .25, seat_y - .02, seat_z + z_side * .22), .045, chair_wood)
        leg.parent = hermit
    back = town.beam(f'hermit-camp:chair-back-upright-{x_side}',
                     (seat_x + x_side * .25, seat_y, seat_z + .24),
                     (seat_x + x_side * .25, 1.25, seat_z + .24), .045, chair_wood)
    back.parent = hermit
chair_back = town.beam('hermit-camp:chair-back-rail',
                       (seat_x - .28, 1.12, seat_z + .24),
                       (seat_x + .28, 1.12, seat_z + .24), .045, chair_wood)
chair_back.parent = hermit

def object_bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH'
              for corner in obj.bound_box]
    if not points:
        raise RuntimeError('cannot check an empty camp piece')
    game = [(point.x, point.z, -point.y) for point in points]
    return {'min': [round(min(point[i] for point in game), 3) for i in range(3)],
            'max': [round(max(point[i] for point in game), 3) for i in range(3)]}

hut_bounds = object_bounds([hut_body])
shed_bounds = object_bounds([shed_body])
dish_bounds = object_bounds([pole, dish_obj])
chair_parts = [obj for obj in hermit.children if obj.name.startswith('hermit-camp:chair-')]
chair_bounds = object_bounds(chair_parts)
chair_leg_parts = [obj for obj in chair_parts if obj.name.startswith('hermit-camp:chair-leg-')]
chair_leg_bounds = object_bounds(chair_leg_parts)
camp_bounds = object_bounds(list(hermit.children))
for label, bounds in (('hut', hut_bounds), ('goat shed', shed_bounds),
                      ('dish and leaning pole', dish_bounds), ('chair', chair_bounds),
                      ('chair legs', chair_leg_bounds),
                      ('whole camp', camp_bounds)):
    print(f'hermit-camp {label} bounds (game X,Y,Z):', json.dumps(bounds, sort_keys=True))
for label, bounds in (('hut', hut_bounds), ('goat shed', shed_bounds),
                      ('dish and leaning pole', dish_bounds), ('chair legs', chair_leg_bounds)):
    if bounds['min'][1] < -.03 or bounds['min'][1] > .08:
        raise RuntimeError(f'hermit-camp {label} does not touch the ground')
    if any(value < -11.5 or value > 11.5 for axis in (0, 2)
           for value in (bounds['min'][axis], bounds['max'][axis])):
        raise RuntimeError(f'hermit-camp {label} leaves its 3 x 3 cell footprint')
if any(value < -11.5 or value > 11.5 for axis in (0, 2)
       for value in (camp_bounds['min'][axis], camp_bounds['max'][axis])):
    raise RuntimeError('hermit-camp whole footprint exceeds 3 x 3 cells')

# Export and read the exact GLB back before making review views.
# Deck town: the ship hull is supplied by the world; carve only its deck.
# The photo grid sets the long side to 14.8 m. The door-sized home reference
# below sets the shared vertical scale for the deck and its rails.
DECK_START, DECK_END, DECK_GROUND, DECK_TOP = 25, 1001, 261, 62
DECK_LENGTH = 14.8
DECK_SCALE = DECK_LENGTH / (DECK_END - DECK_START)
DECK_HEIGHT = (DECK_GROUND - DECK_TOP) * DECK_SCALE
DECK_FRONT = {'centre': 512, 'ground': 580, 'top': 84, 'top_height': 5.08}
DECK_REAR = {'centre': 512, 'ground': 580, 'top': 84, 'top_height': 5.08}
DECK_WIDTH = 7.4
deck_table = {
    'photos': {'side': 'deck-town-deck-side.jpg', 'front': 'deck-town-deck-front.jpg',
               'rear': 'deck-town-deck-rear.jpg', 'top': 'deck-town-deck-top.jpg'},
    'length': DECK_LENGTH, 'width': DECK_WIDTH, 'height': DECK_HEIGHT,
    'side': {'start': DECK_START, 'end': DECK_END, 'ground': DECK_GROUND},
    'front': DECK_FRONT, 'rear': DECK_REAR,
    'top': {'front': 42, 'rear': 980, 'centre': 256, 'along': 'x',
            'x_scale': DECK_WIDTH / 448},
    'grey': 26, 'tolerance': 32, 'bleed_tolerance': 28,
    'voxel': .09, 'target': 4000,
    'mask_dir': str(render / 'masks'),
}

materials = town.make_materials({'rusted-steel': textures / 'rusted-steel.jpg',
                                'galvanised-tin': textures / 'rusted-corrugated-tin.jpg'})
for mat in materials.values():
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        principled.inputs['Metallic'].default_value = min(principled.inputs['Metallic'].default_value, .29)
deck_town = bpy.data.objects.new('deck-town', None)
bpy.context.collection.objects.link(deck_town)
deck_town.parent = family
deck_town.empty_display_type = 'CUBE'
deck_parts = []

deck_body = carve_object('deck-town:deck', textures, deck_table)
deck_body.parent = deck_town
deck_parts.append(deck_body)

def deck_piece(name, center, size, mat, bevel=.02):
    obj = town.cube('deck-town:' + name, center, size, mat, bevel)
    obj.parent = deck_town
    deck_parts.append(obj)
    return obj

DECK_Y = 1.42
for index, x in enumerate((-3.5, 0, 3.5), 1):
    hatch = deck_piece(f'hatch-{index}', (x, DECK_Y + .10, .3), (1.15, .07, 1.35), materials['iron-dark'], .025)

# Carve one photo-built home, then make four linked, slightly varied copies.
# Its door and window stay in the photographs; the ladder is a separate part.
HOME_START, HOME_END, HOME_GROUND, HOME_TOP = 42, 979, 480, 25
HOME_LENGTH = 6.0
HOME_SCALE = HOME_LENGTH / (HOME_END - HOME_START)
HOME_HEIGHT = (HOME_GROUND - HOME_TOP) * HOME_SCALE
HOME_FRONT = {'centre': 512, 'ground': 650, 'top': 28}
HOME_REAR = {'centre': 512, 'ground': 650, 'top': 28}
HOME_WIDTH = 3.0
home_table = {
    'photos': {'side': 'deck-town-home-side.jpg', 'front': 'deck-town-home-front.jpg',
               'rear': 'deck-town-home-rear.jpg', 'top': 'deck-town-home-top.jpg'},
    'length': HOME_LENGTH, 'width': HOME_WIDTH, 'height': HOME_HEIGHT,
    'side': {'start': HOME_START, 'end': HOME_END, 'ground': HOME_GROUND},
    'front': HOME_FRONT, 'rear': HOME_REAR,
    'top': {'front': 52, 'rear': 970, 'centre': 256, 'along': 'x',
            'x_scale': HOME_WIDTH / 410},
    'grey': 26, 'tolerance': 34, 'bleed_tolerance': 28,
    'voxel': .065, 'target': 2000,
    'mask_dir': str(render / 'masks'),
}
home_source = carve_object('deck-town:home-source', textures, home_table)
home_bounds_dimensions = (float(home_source.dimensions.x), float(home_source.dimensions.y), float(home_source.dimensions.z))
print('deck-town carved home bounds (Blender XYZ):', json.dumps(home_bounds_dimensions))

home_layout = [(-1.65, -4.2, 0.0, 1.0), (1.65, -3.9, .10, .94),
               (-1.65, 2.9, -.12, 1.04), (1.65, 3.3, .16, .91)]
home_objects = []
for index, (x, z, angle, scale) in enumerate(home_layout, 1):
    prefix = f'deck-town:home-{index}'
    home = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(home)
    home.parent = deck_town
    home.location = town.game_vector((x, DECK_Y + .12, z))
    home.rotation_euler[2] = angle
    home.scale = (scale, scale, scale)
    body = home_source.copy()
    body.data = home_source.data
    body.name = prefix + ':body'
    bpy.context.collection.objects.link(body)
    body.parent = home
    home_objects.append(body)
    deck_parts.append(body)

    # The ladder leans onto the photographed side wall and its last rung meets the sill.
    ladder = town.beam(prefix + ':ladder-left', (1.52, .04, -1.30), (1.52, 1.54, -1.30), .075, materials['weathered-plank'])
    ladder.parent = home
    for rung in range(1, 7):
        y = rung * .20
        rung_obj = town.beam(prefix + f':ladder-rung-{rung}', (1.52, y, -1.52), (1.52, y, -1.08), .045, materials['rusted-steel'])
        rung_obj.parent = home
        deck_parts.append(rung_obj)
    deck_parts.append(ladder)
    home_objects.extend([ladder])
    bpy.context.view_layer.update()
bpy.data.objects.remove(home_source, do_unlink=True)

# Walkways join the homes with visible plank spans; washing and bell frame are
# named pieces in their own right for future animation/lighting hooks.
for i, (a, b) in enumerate((((-1.65,-4.2),(1.65,-3.9)), ((-1.65,2.9),(1.65,3.3)), ((0,-3.9),(0,2.9)))):
    beam_obj = deck_piece(f'walkway-{i+1}', ((a[0]+b[0])/2,DECK_Y+.10,(a[1]+b[1])/2),
                          (math.dist(a,b),.12,.72), materials['weathered-plank'], .02)
    beam_obj.rotation_euler[2] = math.atan2(-(b[1]-a[1]), b[0]-a[0])
for i, (x,z) in enumerate(((-1.6,-4.2),(-1.6,3.2))):
    line = town.beam(f'deck-town:washing-line-{i+1}', (x,DECK_Y+2.15,z), (x+3.5,DECK_Y+2.15,z+.3), .025, materials['iron-dark'])
    line.parent=deck_town; deck_parts.append(line)
    for j in range(3):
        cloth = deck_piece(f'washing-{i+1}-{j+1}', (x+.35+j*.95,DECK_Y+1.76,z+.1+j*.1), (.38,.68,.035), materials['patched-canvas'], .006)
        cloth.rotation_euler[1]=-.18
bell_frame = deck_piece('bell-frame-post-left', (2.55,1.55,-6.7), (.12,2.0,.12), materials['weathered-plank'])
deck_piece('bell-frame-post-right', (3.35,1.55,-6.7), (.12,2.0,.12), materials['weathered-plank'])
deck_piece('bell-frame-top', (2.95,2.55,-6.7), (.95,.12,.12), materials['weathered-plank'])
bell = deck_piece('bell', (2.95,2.25,-6.7), (.32,.34,.32), materials['iron-dark'], .045)
bell.name = 'deck-town:bell'

deck_bounds = object_bounds(deck_parts)
print('deck-town every named piece bounds (game X,Y,Z):')
for obj in deck_parts:
    print(obj.name, json.dumps(object_bounds([obj]), sort_keys=True))
print('deck-town whole bounds (game X,Y,Z):', json.dumps(deck_bounds, sort_keys=True))
if any(v < -15.5 or v > 15.5 for axis in (0,2) for v in (deck_bounds['min'][axis], deck_bounds['max'][axis])):
    raise RuntimeError('deck-town exceeds 4 x 4 cell footprint')

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
# Keep the credited 1024px source photographs intact in `textures`, and use a
# moderate 768px copy in the family GLB so its 5 MB budget remains available.
for image in bpy.data.images:
    if Path(image.filepath).name.startswith('deck-town-') and image.size[0] > 768:
        image.scale(768, round(image.size[1] * 768 / image.size[0]))
        image.pack()
town.export_glb(out)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100
scene.render.resolution_x, scene.render.resolution_y = 900, 620
scene.world = bpy.data.worlds.new('flat neutral studio')
scene.world.color = (.42, .42, .42)
scene.render.film_transparent = False
ground_mat = material('review ground neutral grey', (.40, .40, .40))
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.018))
ground = bpy.context.object
ground.name = 'review-only grey ground'
ground.data.materials.append(ground_mat)

def area(name, loc, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 3, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

area('soft sky', (0, 12, 25), 3600, 20)
area('open fill', (-16, -16, 14), 1900, 15)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def shot(name, eye, target, ortho):
    camera.location = (eye[0], -eye[2], eye[1])
    camera.rotation_euler = (Vector((target[0], -target[2], target[1])) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho
    if name == 'model-side':
        scene.render.resolution_x, scene.render.resolution_y = 1000, 500
    elif name == 'deck-match-side':
        scene.render.resolution_x, scene.render.resolution_y = 1024, 341
    elif name == 'home-match-side':
        scene.render.resolution_x, scene.render.resolution_y = 1024, 512
    elif name in ('model-front', 'model-rear', 'model-above'):
        scene.render.resolution_x, scene.render.resolution_y = 700, 700
    else:
        scene.render.resolution_x, scene.render.resolution_y = 900, 620
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

def show_hut_only():
    for node in scene.objects:
        if node.type == 'MESH':
            node.hide_render = not node.name.startswith('hermit-camp:hut-body') and node.name != ground.name

def show_camp_only():
    for node in scene.objects:
        if node.type == 'MESH':
            node.hide_render = not node.name.startswith('hermit-camp:') and node.name != ground.name

show_hut_only()
hut_centre = (-2.5, 1.57, 2.5)
shot('model-side', (15, 2.1, 2.5), hut_centre, 7.5)
shot('model-front', (-2.5, 2.1, -12), hut_centre, 4.32)
shot('model-rear', (-2.5, 2.1, 17), hut_centre, 4.75)
shot('model-above', (-2.5, 28, 2.5), hut_centre, 7.5)
show_camp_only()
camp_centre = (0, 1.3, -.3)
shot('model-road', (-11, 2.2, -16), camp_centre, 14.5)
shot('model-far', (18, 2.2, -.3), camp_centre, 18)
# The mayor's camera is 45 degrees down from about 88 m away, as in town.
shot('model-mayor', (-44, 63.3, -44), camp_centre, 20)
def show_deck_town_only():
    for node in scene.objects:
        if node.type == 'MESH':
            node.hide_render = not node.name.startswith('deck-town:') and node.name != ground.name

def show_deck_only():
    for node in scene.objects:
        if node.type == 'MESH':
            node.hide_render = node.name != 'deck-town:deck' and node.name != ground.name

def show_home_one_only():
    for node in scene.objects:
        if node.type == 'MESH':
            node.hide_render = node.name != 'deck-town:home-1:body' and node.name != ground.name

show_deck_town_only()
deck_centre = (0, DECK_Y + 1.5, 0)
show_deck_only()
shot('deck-match-side', (19, DECK_Y + 1.5, 0), deck_centre, 14.8)
show_home_one_only()
home_centre = (-1.65, DECK_Y + HOME_HEIGHT / 2, -4.2)
shot('home-match-side', (13, home_centre[1], -4.2), home_centre, 6.0)
show_deck_town_only()
shot('deck-side', (19, DECK_Y + 1.5, 0), deck_centre, 18)
shot('deck-front', (0, DECK_Y + 1.5, -18), deck_centre, 14)
shot('deck-rear', (0, DECK_Y + 1.5, 18), deck_centre, 14)
shot('deck-above', (0, 32, 0), deck_centre, 18)
shot('deck-road', (-12, 8, -18), deck_centre, 15)
shot('deck-far', (12, 8, 18), deck_centre, 15)
shot('deck-mayor', (-44, 63.3, -44), deck_centre, 19)

print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('*.png'))]}))
