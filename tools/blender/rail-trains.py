"""WW-ART-RAIL: the 2:15's engine and its salt drift, from three photos.

Run with Blender 4.5: blender -b --python tools/blender/rail-trains.py -- --root <repo>
Metres, X along the track, Y up, Z across it. Rail top is Y = 0. The engine's
parts are measured in the side photo at 2000 x 667, where 1 pixel is 6 mm.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-rail')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
recipe = root / 'tools/blender/rail-trains.py'
blend = root / 'art-build/rail/rail-trains.blend'
glb = root / 'public/assets/models/wasteland/rail/rail-trains.glb'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
textures = root / 'public/assets/models/wasteland/rail/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': []}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(recipe.parent))
import town_base as town
from photo_model import Mesh, Photo, box, lathe, rect_loop, slab, tidy, trace

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)

side = Photo(textures / '2-15-side.jpg', frame=(2000, 667))
front = Photo(textures / '2-15-front.jpg')
rear = Photo(textures / '2-15-rear.jpg')
salt = Photo(textures / 'packed-salt.jpg')
salt.image.scale(640, 640)
materials = {'side': side.material(), 'front': front.material(), 'rear': rear.material()}
carriage_side = Photo(textures / 'carriage-side.jpg', frame=(2172, 724))
carriage_end = Photo(textures / 'carriage-end.jpg')
carriage_canvas = Photo(textures / 'carriage-canvas.jpg')
van_side = Photo(textures / 'van-side.jpg', frame=(2048, 683))
van_end = Photo(textures / 'van-end.jpg')
van_canvas = van_side
for photo in (carriage_side, carriage_end, van_side, van_end):
    if max(photo.image.size) > 700:
        photo.image.scale(round(photo.image.size[0] * 700 / max(photo.image.size)),
                          round(photo.image.size[1] * 700 / max(photo.image.size)))
        photo.image_w, photo.image_h = photo.image.size
        photo._rgb = None
        photo.image.pack()
if max(carriage_canvas.image.size) > 512:
    carriage_canvas.image.scale(round(carriage_canvas.image.size[0] * 512 / max(carriage_canvas.image.size)),
                                round(carriage_canvas.image.size[1] * 512 / max(carriage_canvas.image.size)))
    carriage_canvas.image.pack()

# Sky in each photo. Seeds: the open sky, then each opening where sky shows through.
side_solid = tidy(~side.sky([(30, 30), (1000, 40), (1950, 300), (340, 260), (272, 300), (190, 150), (700, 135), (850, 135)]))
front_solid = tidy(~front.sky([(40, 40), (1150, 40), (310, 345), (885, 345)], grey=26))
rear_solid = tidy(~rear.sky([(40, 40), (1270, 40)], grey=26))
for name, mask in (('side', side_solid), ('front', front_solid), ('rear', rear_solid)):
    image = bpy.data.images.new('mask ' + name, mask.shape[1], mask.shape[0], alpha=False)
    grey = mask[::-1].astype(np.float32)
    image.pixels.foreach_set(np.dstack((grey, grey, grey, np.ones_like(grey))).ravel())
    image.filepath_raw = str(render_dir / f'mask-{name}.png')
    image.file_format = 'PNG'
    image.save()

S = .006
def SX(px): return (px - 1000) * S
def SY(py): return (640 - py) * S
def FZ(px): return -(px - 598) * .00279
def RZ(px): return (px - 655) * .00267
def RY(py): return 1.44 + (770 - py) * .00323
def FY(py):
    # The front photo's cab is further off than its smokebox: eave at 255, tank top at 460.
    return 3.37 + (255 - py) * (.0058 if py < 255 else .003)

def on_side(px, py, d): return (SX(px), SY(py), d)
def on_front(px, py, d): return (d, FY(py), FZ(px))
def on_rear(px, py, d): return (d, RY(py), RZ(px))

SHEET = ('side', side, (600, 186, 1320, 330))      # tank plate, for tops
DARK = ('side', side, (1345, 255, 1420, 300))      # black boiler, for what is in shadow
RUST = ('front', front, (130, 790, 330, 960))      # rusty beam, for undersides

engine = Mesh()

# Running plate and the two beams.
box(engine, SX(100), SX(1905), SY(415), SY(385), -1.36, 1.36, {
    '+z': ('side', side, (100, 385, 1905, 415)), '-z': ('side', side, (100, 385, 1905, 415)),
    '+y': SHEET, '-y': RUST})
box(engine, SX(1860), SX(1908), SY(510), SY(385), -1.41, 1.41, {
    '+x': ('front', front, (85, 770, 1095, 965)), '-x': RUST,
    '+z': ('side', side, (1860, 385, 1908, 510)), '-z': ('side', side, (1860, 385, 1908, 510)),
    '+y': ('front', front, (85, 770, 1095, 790)), '-y': RUST})
box(engine, SX(97), SX(140), SY(480), SY(390), -1.38, 1.38, {
    '-x': ('rear', rear, (197, 770, 1115, 905)), '+x': RUST,
    '+z': ('side', side, (97, 390, 140, 480)), '-z': ('side', side, (97, 390, 140, 480)),
    '-y': RUST})
box(engine, SX(1880), SX(1900), SY(590), SY(510), -.62, .62, {'+x': ('front', front, (360, 965, 830, 1100)), '-y': RUST})
box(engine, SX(110), SX(130), SY(590), SY(480), -.62, .62, {'-x': ('rear', rear, (400, 905, 920, 1010)), '-y': RUST})

# Frames between the wheels, then the steps and the sandbox on the outer plane.
frames = trace(side_solid, (180, 415, 1900, 590), tolerance=2.5, min_area=300)
steps = trace(side_solid, (180, 415, 305, 590), min_area=120)
block = trace(side_solid, (1762, 415, 1860, 540), min_area=120)
for sign in (1, -1):
    slab(engine, 'side', side, frames, on_side, sign * .62, sign * .70)
    slab(engine, 'side', side, steps, on_side, sign * 1.18, sign * 1.24)
    slab(engine, 'side', side, block, on_side, sign * 1.12, sign * 1.30)

# Side tanks.
for sign, front_rect, rear_rect in ((1, (120, 460, 305, 765), (758, 470, 1160, 750)),
                                    (-1, (895, 460, 1072, 765), (150, 470, 552, 750))):
    z0, z1 = sorted((sign * .62, sign * 1.33))
    box(engine, SX(440), SX(1325), SY(395), SY(180), z0, z1, {
        '+z' if sign > 0 else '-z': ('side', side, (440, 180, 1325, 395)),
        '-z' if sign > 0 else '+z': DARK,
        '+x': ('front', front, front_rect), '-x': ('rear', rear, rear_rect),
        '+y': SHEET})

# Boiler and smokebox: one radius, with the riveted bands standing proud where the photo has them.
AXIS_PY = 252
BANDS = ((1320, 1342, .022), (1465, 1486, .012), (1590, 1626, .026), (1808, 1838, .02))
stations = [(SX(445), .666)]
for start, end, proud in BANDS:
    stations += [(SX(start - 2), .666), (SX(start), .666 + proud), (SX(end), .666 + proud), (SX(end + 2), .666)]
stations = [station for station in stations if station[0] <= SX(1838)]
stations[-1] = (SX(1838), .686)
axis_y = SY(AXIS_PY)

def boiler_uv(index, distance, radius, angle):
    px = distance / S + 1000
    theta = math.degrees(math.asin(math.sin(angle)))
    top = AXIS_PY - radius / S
    if px >= 1325:
        return side.uv(px, AXIS_PY - (AXIS_PY - top) * .94 * theta / 90)
    # Beside the tanks only the top shows in the photo, above the tank at py 180.
    if theta >= 40:
        return side.uv(px, 180 - (theta - 40) / 50 * (180 - max(top, 145)))
    return side.uv(px, 180)

def door_uv(radius_px):
    return lambda angle, f: front.uv(598 - math.cos(angle) * f * radius_px, 515 - math.sin(angle) * f * radius_px)

def backhead_uv(angle, f):
    return rear.uv(655 + math.cos(angle) * f * 190, 475 - abs(math.sin(angle)) * f * 135)

lathe(engine, 'side', (0, axis_y, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0), stations, boiler_uv, sides=28,
      cap_start=('rear', backhead_uv), cap_end=('front', door_uv(268)))
# The smokebox door stands proud of its flange.
lathe(engine, 'front', (SX(1838), axis_y, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0), [(0, .585), (.06, .585)],
      lambda i, d, r, a: front.uv(598 - math.cos(a) * 225, 515 - math.sin(a) * 225), sides=28,
      cap_end=('front', door_uv(225)))
box(engine, SX(1700), SX(1838), 1.46, 1.95, -.56, .56, {'+x': ('front', front, (400, 640, 800, 770))})
# Below the boiler: pipes and shadow, not daylight.
box(engine, SX(1325), SX(1770), SY(395), SY(335), -.52, .52, {
    '+z': ('side', side, (1325, 335, 1770, 395)), '-z': ('side', side, (1325, 335, 1770, 395))})

# Chimney and dome: each row's width is read off the photo.
def turned(cx, py0, py1, step, half, max_px, cap):
    rows = []
    for py in range(py0, py1, step):
        row = np.nonzero(side_solid[py, cx - half:cx + half])[0]
        if len(row):
            rows.append((py, min(max_px, (row[-1] - row[0]) / 2)))
    profile = [(SY(py), r * S) for py, r in reversed(rows)]
    def uv(index, distance, radius, angle):
        arc = .84 * math.degrees(math.asin(math.sin(angle))) / 90
        return side.uv(cx + radius / S * arc, 640 - distance / S)
    lathe(engine, 'side', (SX(cx), 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0), profile, uv, sides=18, cap_end=cap)

dark_cap = ('side', lambda a, f: side.uv(1380 + math.cos(a) * f * 30, 278 + math.sin(a) * f * 20))
turned(1662, 34, 152, 8, 110, 92, dark_cap)
turned(1167, 30, 160, 8, 110, 82, None)

# Pipes and the valve on the boiler's top, on the centre plane.
for rect in ((600, 88, 1085, 146), (1245, 128, 1325, 146)):
    fittings = trace(side_solid, rect, min_area=60)
    if fittings:
        slab(engine, 'side', side, fittings, on_side, -.04, .04)

# The cab. Its side is traced with the door opening and levers just as they are.
cab_wall = trace(side_solid, (78, 75, 600, 400), tolerance=1.3, min_area=60)
for sign in (1, -1):
    slab(engine, 'side', side, cab_wall, on_side, sign * 1.13, sign * 1.18)
box(engine, SX(85), SX(205), SY(400), SY(200), -1.13, 1.13, {
    '+x': RUST, '+y': ('rear', rear, (240, 480, 1070, 620))})
box(engine, SX(205), SX(445), SY(415), SY(395), -1.13, 1.13, {'+y': RUST})

# Rear sheet, with its real window openings; lower half is solid.
def rounded(x0, y0, x1, y1, r):
    return [(x0 + r, y0), (x1 - r, y0), (x1, y0 + r), (x1, y1 - r), (x1 - r, y1), (x0 + r, y1), (x0, y1 - r), (x0, y0 + r)]

rear_upper = trace(rear_solid, (205, 55, 1110, 475), tolerance=1.5, min_area=400)
rear_upper = [loop for loop in rear_upper if max(p[0] for p in loop) - min(p[0] for p in loop) > 500]
rear_upper += [rounded(272, 178, 428, 452, 22), rounded(468, 135, 848, 470, 34), rounded(888, 178, 1044, 452, 22)]
slab(engine, 'rear', rear, rear_upper, on_rear, SX(78), SX(88), wall_scale=.003)
slab(engine, 'rear', rear, [rect_loop(228, 475, 1082, 770)], on_rear, SX(78), SX(88), wall_scale=.003)

# Front sheet, with its window openings; the middle is cut out where the
# picture shows the chimney, and plain plate goes behind the chimney instead.
cab_mask = front_solid.copy()
cab_mask[190:466, 480:720] = False
cab_front = trace(cab_mask, (172, 190, 1022, 465), tolerance=1.5, min_area=200)
slab(engine, 'front', front, cab_front, on_front, SX(590), SX(600), wall_scale=.003)
box(engine, SX(590), SX(600), 2.6, 3.7, -.34, .34, {
    '+x': ('front', front, (385, 240, 500, 420)), '-x': DARK})

# Roof: the arch in the rear photo. Near the eave it wears the side photo's own roof.
ROOF = 14
def roof_point(a, px, inset=0):
    return (SX(px), 3.37 - inset + .38 * math.sin(a), 1.25 * math.cos(a))
def roof_top_uv(t, px):
    arc = 1 - abs(2 * t - 1)
    if arc < .45:
        return side.uv(px, 75 - 60 * arc / .45)
    return side.uv(600 + (px - 78) / 522 * 520, 185 + (arc - .45) / .55 * 200)
def roof_under_uv(t, px):
    return rear.uv(480 + (px - 78) / 522 * 360, 240 - (1 - abs(2 * t - 1)) * 100)
for k in range(ROOF):
    t0, t1 = k / ROOF, (k + 1) / ROOF
    a0, a1 = t0 * math.pi, t1 * math.pi
    out = (0, math.sin((a0 + a1) / 2), math.cos((a0 + a1) / 2))
    corners = (roof_point(a0, 78), roof_point(a0, 600), roof_point(a1, 600), roof_point(a1, 78))
    engine.face(corners, (roof_top_uv(t0, 78), roof_top_uv(t0, 600), roof_top_uv(t1, 600), roof_top_uv(t1, 78)), 'side', out)
    corners = (roof_point(a0, 78, .05), roof_point(a0, 600, .05), roof_point(a1, 600, .05), roof_point(a1, 78, .05))
    engine.face(corners, (roof_under_uv(t0, 78), roof_under_uv(t0, 600), roof_under_uv(t1, 600), roof_under_uv(t1, 78)),
                'rear', tuple(-c for c in out))

# Five axles, as the photo has them. Each face wears its own wheel; the tread wears
# the front photo's wheel, seen edge on.
def tread(i, d, r, a):
    wave = abs((a / math.pi) % 1 * 2 - 1)
    return front.uv(255 + i * 78, 980 + wave * 215)

WHEELS = ((470, 530, 125), (790, 525, 120), (1070, 523, 123), (1355, 522, 120), (1638, 520, 118))
for cx, cy, r_px in WHEELS:
    radius = r_px * S
    centre = (SX(cx), radius, 0)
    lathe(engine, 'rear', centre, (0, 0, 1), (1, 0, 0), (0, 1, 0), [(-.78, .08), (.78, .08)],
          lambda i, d, r, a: rear.uv(560 + i * 60, 930 + a * 6), sides=8)
    face = lambda a, f, cx=cx, cy=cy, r_px=r_px: side.uv(cx + math.cos(a) * f * r_px, cy - math.sin(a) * f * r_px)
    hub = lambda a, f, cx=cx, cy=cy: side.uv(cx + math.cos(a) * f * 26, cy - math.sin(a) * f * 26)
    hub_side = lambda i, d, r, a, cx=cx, cy=cy: side.uv(cx + math.cos(a) * 26, cy - math.sin(a) * 26)
    for sign in (1, -1):
        near, far = sign * .96, sign * .78
        lathe(engine, 'front', centre, (0, 0, 1), (1, 0, 0), (0, 1, 0), [(far, radius), (near, radius)], tread, sides=32,
              cap_start=('side', face), cap_end=('side', face))
        lathe(engine, 'side', centre, (0, 0, 1), (1, 0, 0), (0, 1, 0), [(near, .15), (near + sign * .07, .13)],
              hub_side, sides=12, cap_end=('side', hub))

# Coupling rods and valve gear stand proud of the wheels.
ROD = [[(450, 520), (780, 505), (1130, 505), (1500, 485), (1510, 510), (1130, 552), (780, 555), (450, 556)]]
VALVE = [[(1350, 456), (1500, 456), (1700, 498), (1700, 520), (1500, 482), (1350, 482)]]
for sign in (1, -1):
    slab(engine, 'side', side, ROD, on_side, sign * 1.03, sign * 1.09)
    slab(engine, 'side', side, VALVE, on_side, sign * 1.03, sign * 1.08)

# Buffers: a thin stock and a broad head, the head's face from each end's photo.
def buffer(x_start, x_end, y, z, head_uv, material):
    direction = 1 if x_end > x_start else -1
    length = abs(x_end - x_start)
    profile = [(0, .1), (length * .62, .1), (length * .72, .16), (length * .78, .225), (length, .225)]
    lathe(engine, 'side', (x_start, y, z), (direction, 0, 0), (0, 0, 1), (0, 1, 0), profile,
          lambda i, d, r, a: side.uv((x_start + direction * d) / S + 1000, 438 - math.sin(a) * r / S), sides=16,
          cap_end=(material, head_uv))

for z, cx in ((1.05, 222), (-1.05, 980)):
    buffer(SX(1908), SX(1985), SY(438), z,
           lambda a, f, cx=cx: front.uv(cx - math.cos(a) * f * 85, 880 - math.sin(a) * f * 85), 'front')
for z, cx in ((.95, 1015), (-.95, 306)):
    buffer(SX(97), SX(12), SY(442), z,
           lambda a, f, cx=cx: rear.uv(cx + math.cos(a) * f * 72, 840 - math.sin(a) * f * 72), 'rear')

objects = {'the-2-15-engine': engine}
engine.finish('the-2-15-engine', materials)

# Track, under the engine, on its own.
track = Mesh()
RAIL = ('front', front, (205, 1225, 285, 1300))
for z in (-.87, .87):
    box(track, -7.2, 7.2, -.14, 0, z - .04, z + .04, {'+z': RAIL, '-z': RAIL, '+y': RAIL, '+x': RAIL, '-x': RAIL})
SLEEPER = ('rear', rear, (560, 900, 760, 960))
for k in range(21):
    x = -7 + k * .7
    box(track, x - .13, x + .13, -.26, -.14, -1.25, 1.25, {'+z': SLEEPER, '-z': SLEEPER, '+y': SLEEPER, '+x': SLEEPER, '-x': SLEEPER})
objects['the-2-15-track'] = track
track.finish('the-2-15-track', {'front': front.material(), 'rear': rear.material()})

# The drift: high and smooth to windward (-Z), up to the tank tops; on the lee
# side it comes down to the running board and runs out in a long tail.
def smooth(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)

def drift_height(x, z):
    if z <= -1.4:
        h = 2.78 * smooth((z + 8.5) / 7.1) ** .8
    elif z <= 1.4:
        h = 2.78 + (1.74 - 2.78) * smooth((z + 1.4) / 2.8)
    else:
        h = 1.74 * (1 - smooth((z - 1.4) / 12)) ** 1.3
    falloff = 1 - smooth((abs(x) - 4.4) / 8.6)
    ripple = .1 * math.sin(x * .9 + z * .35) + .06 * math.sin(x * .31 - z * .8 + 1.2) + .03 * math.sin(x * 2.1 + z * 1.7)
    height = h * falloff + ripple * min(1, h * falloff)
    return height - .1 * (1 - min(1, h * falloff * 4))

drift = Mesh()
NX, NZ = 64, 44
X0, X1, Z0, Z1 = -14, 14, -9.5, 14.5
rows = []
for i in range(NX + 1):
    row = []
    for j in range(NZ + 1):
        x = X0 + (X1 - X0) * i / NX
        z = Z0 + (Z1 - Z0) * j / NZ
        row.append((drift.vertex((x, drift_height(x, z), z)), (x / 5, z / 5)))
    rows.append(row)
for i in range(NX):
    for j in range(NZ):
        a, ua = rows[i][j]
        b, ub = rows[i + 1][j]
        c, uc = rows[i + 1][j + 1]
        d, ud = rows[i][j + 1]
        drift.indexed((a, b, c, d), (ua, ub, uc, ud), 'salt', (0, 1, 0), True)
objects['the-2-15-drift'] = drift
drift.finish('the-2-15-drift', {'salt': salt.material()})

# The first wooden works carriage, measured from its side and coupling-end photos.
# X is the 14 m length, Y is height above the rail, and Z is the 2.7 m width.
CS = 14.0 / 1990
CY_SCALE = 3.7 / (656 - 24)
def CX(px): return (px - 1025) * CS
def CY(py): return (656 - py) * CY_SCALE
def CZ(px): return -(px - 627) * (2.7 / 952)
def carriage_side_point(px, py, z): return (CX(px), CY(py), z)
def carriage_end_point(px, py, x): return (x, (1180 - py) * (3.7 / 1080), CZ(px))

carriage_side_solid = tidy(~carriage_side.sky([(8, 20), (8, 350), (2160, 30), (2160, 350)], grey=26))
carriage_end_solid = tidy(~carriage_end.sky([(35, 35), (1215, 35)], grey=26))
carriage = Mesh()
C_SIDE = 'carriage-side'
C_END = 'carriage-end'
C_CANVAS = 'carriage-canvas'
carriage_materials = {C_SIDE: carriage_side.material(), C_END: carriage_end.material(),
                      C_CANVAS: carriage_canvas.material()}

# Trace the timber body from the photograph, then cut the dark windows and open
# doorways as real holes. The dark interior remains visible through both walls.
carriage_wall = trace(carriage_side_solid, (30, 126, 2040, 478), tolerance=1.5, min_area=300)
for x0, x1 in ((331, 449), (517, 635), (704, 822), (891, 1009),
               (1077, 1195), (1263, 1381), (1449, 1567), (1635, 1753)):
    carriage_wall.append(rounded(x0, 181, x1, 339, 12))
carriage_wall += [rounded(258, 151, 318, 477, 8), rounded(1882, 151, 1984, 477, 10)]
for sign in (1, -1):
    slab(carriage, C_SIDE, carriage_side, carriage_wall, carriage_side_point,
         sign * 1.28, sign * 1.34, wall_scale=CS)

# Dark inner walls and floor make the missing glazing and open doors read as
# empty, unlit space rather than pale background.
DARK_SIDE = (C_SIDE, carriage_side, (354, 220, 423, 270))
box(carriage, CX(70), CX(2000), .78, 3.12, -1.22, -1.16,
    {'+z': DARK_SIDE, '-z': DARK_SIDE})
box(carriage, CX(70), CX(2000), .76, .84, -1.22, 1.22,
    {'+z': DARK_SIDE, '-z': DARK_SIDE, '+y': DARK_SIDE})

# The actual door leaves come from their own picture areas and swing outward.
def swing_door(loop, hinge_px, sign):
    hinge_x = CX(hinge_px)
    angle = math.radians(70)
    def placed(px, py, depth):
        x = CX(px)
        dx = x - hinge_x
        return (hinge_x + dx * math.cos(angle), CY(py),
                sign * (1.34 + abs(dx) * math.sin(angle) + depth))
    slab(carriage, C_SIDE, carriage_side, [loop], placed, 0, .045, wall_scale=CS)

for sign in (1, -1):
    swing_door([(177, 145), (230, 145), (244, 164), (244, 457), (225, 477), (177, 465)], 244, sign)
    swing_door([(1930, 150), (1980, 151), (2014, 176), (2012, 455), (1963, 477), (1930, 462)], 1930, sign)

# End sheets use the dead-on coupling photograph, with empty windows and a door.
end_wall = trace(carriage_end_solid, (152, 95, 1104, 900), tolerance=1.5, min_area=250)
end_wall += [rounded(248, 287, 430, 587, 18), rounded(828, 287, 1010, 587, 18),
             rounded(505, 215, 712, 850, 10)]
for x in (-7.0, 6.92):
    slab(carriage, C_END, carriage_end, end_wall, carriage_end_point,
         x, x + .08, wall_scale=.0035)

# The end openings look into the same unlit compartment, not through to the sky.
DARK_END = (C_END, carriage_end, (550, 390, 650, 470))
box(carriage, -6.84, 6.84, .98, 3.46, -1.24, 1.24,
    {'+x': DARK_END, '-x': DARK_END})

# Shallow canvas roof, with a clear space beneath it to prevent coplanar flicker.
ROOF_STEPS = 20
for k in range(ROOF_STEPS):
    t0, t1 = k / ROOF_STEPS, (k + 1) / ROOF_STEPS
    a0, a1 = t0 * math.pi, t1 * math.pi
    def roof_point(a, px, inset=0):
        return (CX(px), 3.15 - inset + .55 * math.sin(a), 1.35 * math.cos(a))
    out = (0, math.sin((a0 + a1) / 2), math.cos((a0 + a1) / 2))
    for inset, material, photo in ((0, C_CANVAS, carriage_canvas),
                                   (.075, C_SIDE, carriage_side)):
        corners = (roof_point(a0, 30, inset), roof_point(a0, 2020, inset),
                   roof_point(a1, 2020, inset), roof_point(a1, 30, inset))
        t0, t1 = a0 / math.pi, a1 / math.pi
        if inset == 0:
            u0, u1 = (CX(30) + 7) / 2.4, (CX(2020) + 7) / 2.4
            v0, v1 = t0 * 2.7 / 2.4, t1 * 2.7 / 2.4
            uvs = (photo.uv(u0 * photo.w, v0 * photo.h), photo.uv(u1 * photo.w, v0 * photo.h),
                   photo.uv(u1 * photo.w, v1 * photo.h), photo.uv(u0 * photo.w, v1 * photo.h))
        else:
            uvs = (photo.uv(354, 220), photo.uv(423, 220),
                   photo.uv(423, 270), photo.uv(354, 270))
        carriage.face(corners, uvs, material, out if inset == 0 else tuple(-v for v in out))

# The canvas hangs over each eave in a torn, photo-traced band. Three small
# vents rise from the crown where they appear in the side photograph.
carriage_eave = trace(carriage_side_solid, (30, 25, 2040, 132), tolerance=1.8, min_area=45)
for sign in (-1, 1):
    slab(carriage, C_SIDE, carriage_side, carriage_eave, carriage_side_point,
         sign * 1.30, sign * 1.335, wall_scale=CS)
for px in (500, 1170, 1770):
    lathe(carriage, C_SIDE, (CX(px), 3.66, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
          [(0, .075), (.05, .075), (.09, .052)],
          lambda i, d, r, a, px=px: carriage_side.uv(px + math.cos(a) * 10, 55 + i * 8), sides=12)

# Bolster beams and the two four-wheel bogies, all read from the lower side photo.
FRAME = (C_SIDE, carriage_side, (300, 473, 1900, 510))
BOGIE = (C_SIDE, carriage_side, (175, 500, 670, 635))
for x0, x1 in ((CX(90), CX(2080)), (CX(180), CX(700)), (CX(1460), CX(1980))):
    box(carriage, x0, x1, .62, 1.03, -.94, .94,
        {'+z': FRAME, '-z': FRAME, '-y': FRAME})
for start, end in ((115, 700), (1450, 2020)):
    bogie_loops = trace(carriage_side_solid, (start, 490, end, 642), tolerance=1.8, min_area=130)
    if bogie_loops:
        for sign in (1, -1):
            slab(carriage, C_SIDE, carriage_side, bogie_loops, carriage_side_point,
                 sign * .82, sign * 1.03, wall_scale=CS)

# Trace the photographed centre underframe itself, including the tank and
# truss rods between the bogies, onto each outer frame plane.
underframe = trace(carriage_side_solid, (680, 470, 1510, 635), tolerance=1.8, min_area=55)
for sign in (-1, 1):
    slab(carriage, C_SIDE, carriage_side, underframe, carriage_side_point,
         sign * 1.025, sign * 1.055, wall_scale=CS)

WHEEL_CENTRES = ((238, 586, 73), (570, 586, 73), (1600, 586, 73), (1910, 586, 73))
for cx, cy, radius_px in WHEEL_CENTRES:
    radius = radius_px * CY_SCALE
    centre = (CX(cx), radius, 0)
    def wheel_face(angle, fraction, cx=cx, cy=cy, radius_px=radius_px):
        return carriage_side.uv(cx + math.cos(angle) * fraction * radius_px * .82,
                                cy - math.sin(angle) * fraction * radius_px * .82)
    def wheel_tread(index, distance, r, angle, cx=cx):
        u = 0.84 * math.degrees(math.asin(math.sin(angle))) / 90
        return carriage_side.uv(cx + 32 + u * 40, 594 + (1 - index) * 46)
    for sign in (1, -1):
        lathe(carriage, C_SIDE, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(sign * .76, radius), (sign * .96, radius)], wheel_tread, sides=32,
              cap_start=(C_SIDE, wheel_face), cap_end=(C_SIDE, wheel_face))
        lathe(carriage, C_SIDE, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(sign * .96, .16), (sign * 1.02, .13)], wheel_tread, sides=14,
              cap_end=(C_SIDE, lambda a, f, face=wheel_face: face(a, .22)))

# Buffer stocks and heads follow the engine's lathe profile at all four corners.
for x_sign in (-1, 1):
    for z_sign in (-1, 1):
        start_x = x_sign * 6.98
        end_x = x_sign * 7.25
        stations_buffer = [(0, .09), (.16, .09), (.20, .15), (.27, .225)]
        lathe(carriage, C_SIDE, (start_x, 1.02, z_sign * .92), (x_sign, 0, 0),
              (0, 0, 1), (0, 1, 0), stations_buffer,
              lambda i, d, r, a: carriage_side.uv(1980 + i * 10, 502 + math.sin(a) * 12),
              sides=16,
              cap_end=(C_END, lambda a, f: carriage_end.uv(300 + math.cos(a) * f * 95,
                                                            940 - math.sin(a) * f * 95)))

carriage.finish('the-2-15-carriage', carriage_materials)
objects['the-2-15-carriage'] = carriage

# The guard's luggage van: 12.5 m long, with the roof lookout at the brake end.
# Both views are traced and projected from the generated photographs.
VS = 12.5 / 1870
VY = 3.72 / 620
def VX(px): return (px - 1024) * VS
def VYp(py): return (620 - py) * VY
def VZ(px): return -(px - 599.5) * (2.7 / 923)
def van_side_point(px, py, z): return (VX(px), VYp(py), z)
def van_end_point(px, py, x): return (x, .75 + (1000 - py) * (2.94 / 980), VZ(px))

van_side_solid = tidy(~van_side.sky([(18, 18), (2020, 18)], grey=26))
van_end_solid = tidy(~van_end.sky([(25, 25), (1170, 25)], grey=26))
van = Mesh()
V_SIDE, V_END = 'van-side', 'van-end'
van_materials = {V_SIDE: van_side.material(), V_END: van_end.material()}

# Main timber body. Keep the luggage doorway and the two lookout panes open.
van_body = trace(van_side_solid, (130, 112, 1930, 495), tolerance=1.8, min_area=100)
van_body.append(rounded(689, 171, 1117, 438, 8))
for sign in (1, -1):
    slab(van, V_SIDE, van_side, van_body, van_side_point, sign * 1.22, sign * 1.29, wall_scale=VS)

# The doorway looks into the cases, not through a flat pale background.
INTERIOR = (V_SIDE, van_side, (714, 193, 1101, 426))
box(van, VX(690), VX(1118), .80, 2.74, -1.14, 1.14,
    {'+z': INTERIOR, '-z': INTERIOR})
box(van, VX(690), VX(1118), .72, .80, -1.20, 1.20,
    {'+z': INTERIOR, '-z': INTERIOR, '+y': INTERIOR})

# The door has rolled back along its iron rail, leaving the full cargo aperture.
door_loop = trace(van_side_solid, (1110, 150, 1532, 455), tolerance=1.5, min_area=100)
for sign in (1, -1):
    slab(van, V_SIDE, van_side, door_loop, van_side_point,
         sign * 1.30, sign * 1.36, wall_scale=VS)

# Raised lookout: real empty windows with the opposite inner face behind them.
lookout = trace(van_side_solid, (1495, 2, 1850, 116), tolerance=1.4, min_area=80)
lookout += [rounded(1564, 37, 1640, 86, 5), rounded(1686, 37, 1768, 87, 5)]
for sign in (1, -1):
    slab(van, V_SIDE, van_side, lookout, van_side_point,
         sign * .91, sign * .98, wall_scale=VS)
box(van, VX(1510), VX(1842), 3.11, 3.49, -.88, .88,
    {'+z': (V_SIDE, van_side, (1538, 50, 1760, 92)), '-z': (V_SIDE, van_side, (1538, 50, 1760, 92))})

# End sheets carry the doorway and roof lookout through the matching end view.
# Keep the body separate from the photographed buffers and bogies; those are
# modelled in their proper places below.
end_outline = trace(van_end_solid, (165, 190, 1055, 1000), tolerance=1.8, min_area=250)
end_outline = [loop for loop in end_outline
               if max(p[0] for p in loop) - min(p[0] for p in loop) > 700
               and max(p[1] for p in loop) - min(p[1] for p in loop) > 500]
end_outline.append(rounded(438, 373, 762, 852, 18))
end_lookout = trace(van_end_solid, (280, 8, 920, 224), tolerance=1.5, min_area=150)
end_lookout = [loop for loop in end_lookout
               if max(p[0] for p in loop) - min(p[0] for p in loop) > 500]
end_lookout += [rounded(388, 64, 566, 159, 8), rounded(628, 64, 812, 159, 8)]
for x in (-6.24, 6.16):
    slab(van, V_END, van_end, end_outline, van_end_point,
         x, x + .08, wall_scale=.0026)
slab(van, V_END, van_end, end_lookout, van_end_point,
     5.35, 5.43, wall_scale=.0026)
box(van, -6.12, 6.10, .75, 3.06, -1.12, 1.12,
    {'+x': (V_END, van_end, (458, 390, 742, 825)), '-x': (V_END, van_end, (458, 390, 742, 825))})

# The canvas roof is a shallow arch across the van, continued along its length.
for k in range(16):
    a0, a1 = k * math.pi / 16, (k + 1) * math.pi / 16
    def roof_point(a, px):
        return (VX(px), 3.06 + .34 * math.sin(a), 1.26 * math.cos(a))
    corners = (roof_point(a0, 90), roof_point(a0, 1960),
               roof_point(a1, 1960), roof_point(a1, 90))
    py0, py1 = 112 + 34 * k / 16, 112 + 34 * (k + 1) / 16
    uvs = (van_side.uv(145, py0), van_side.uv(1905, py0),
           van_side.uv(1905, py1), van_side.uv(145, py1))
    van.face(corners, uvs, V_SIDE, (0, math.sin((a0 + a1) / 2), math.cos((a0 + a1) / 2)))

# The photograph shows one central axle, with truss rods reaching the ends.
wheel_centres = (850, 1165)
for wheel_x in wheel_centres:
    radius_px = 84
    radius = radius_px * VS
    centre = (VX(wheel_x), radius, 0)
    face_uv = lambda a, f, x=wheel_x: van_side.uv(x + math.cos(a) * f * radius_px * .84,
                                                   580 - math.sin(a) * f * radius_px * .84)
    tread_uv = lambda i, d, r, a: van_side.uv(wheel_x + 46 + i * 14, 558 + abs(math.sin(a)) * 25)
    for sign in (1, -1):
        lathe(van, V_SIDE, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(sign * .77, radius), (sign * 1.0, radius)], tread_uv, sides=24,
              cap_start=(V_SIDE, face_uv), cap_end=(V_SIDE, face_uv))
        lathe(van, V_SIDE, centre, (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(sign * 1.0, .15), (sign * 1.06, .12)],
              lambda i, d, r, a: van_side.uv(155, 548 + math.sin(a) * 16), sides=12,
              cap_end=(V_SIDE, lambda a, f, fn=face_uv: fn(a, .22)))
    box(van, VX(wheel_x - 92), VX(wheel_x + 92), .48, .88, -.90, .90,
        {'+z': (V_SIDE, van_side, (wheel_x - 70, 480, wheel_x + 70, 535)),
         '-z': (V_SIDE, van_side, (wheel_x - 70, 480, wheel_x + 70, 535)), '-y': (V_SIDE, van_side, (wheel_x - 70, 535, wheel_x + 70, 548))})

for z in (-.82, .82):
    slab(van, V_SIDE, van_side, [[(350, 522), (850, 574), (850, 586), (350, 534)]],
         van_side_point, z, z + .035, wall_scale=VS)
    slab(van, V_SIDE, van_side, [[(1165, 574), (1650, 522), (1650, 534), (1165, 586)]],
         van_side_point, z, z + .035, wall_scale=VS)

for x_sign in (-1, 1):
    for z_sign in (-1, 1):
        lathe(van, V_SIDE, (x_sign * 6.25, .83, z_sign * .94), (x_sign, 0, 0),
              (0, 0, 1), (0, 1, 0), [(0, .1), (.16, .1), (.22, .22)],
              lambda i, d, r, a: van_side.uv(1950 + i * 15, 483 + math.sin(a) * 14), sides=16,
              cap_end=(V_END, lambda a, f: van_end.uv(302 + math.cos(a) * 80 * f,
                                                        924 - math.sin(a) * 80 * f)))

# Canvas side bands are traced from the photo's ragged eave, and the three
# vents sit on the roof at the photographed centres.
van_eave = trace(van_side_solid, (125, 90, 1915, 160), tolerance=1.8, min_area=35)
for sign in (-1, 1):
    slab(van, V_SIDE, van_side, van_eave, van_side_point, sign * 1.22, sign * 1.245, wall_scale=VS)
for px in (330, 1010, 1690):
    lathe(van, V_SIDE, (VX(px), 3.12, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
          [(0, .075), (.05, .075), (.08, .055)],
          lambda i, d, r, a, px=px: van_side.uv(px + math.cos(a) * 9, 85 + i * 7), sides=12)
van.finish('the-2-15-van', van_materials)
objects['the-2-15-van'] = van
print('TRIANGLES=' + json.dumps({name: mesh.triangles() for name, mesh in objects.items()}))

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)

# Render from the exported file, imported into an empty scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('flat overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.84, .84, .86, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = .5
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
scene.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, -.27))
ground = bpy.context.object
ground_material = bpy.data.materials.new('ground')
ground_material.use_nodes = True
ground_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.72, .71, .69, 1)
ground_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(ground_material)
camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
scene.collection.objects.link(camera)
scene.camera = camera
drift_object = next(o for o in bpy.data.objects if o.name.startswith('the-2-15-drift'))

def shot(name, eye, target, width, height, ortho=None, lens=35, show_drift=False):
    # eye and target in glTF metres.
    subject = ('the-2-15-engine' if name in ('side', 'front', 'rear', 'quarter', 'quarter-rear', 'buried', 'buried-windward')
               else 'the-2-15-carriage' if name.startswith('carriage-') else 'the-2-15-van')
    for obj in scene.objects:
        if obj.type == 'MESH' and obj.name != subject:
            obj.hide_render = True
        elif obj.type == 'MESH':
            obj.hide_render = False
    drift_object.hide_render = not show_drift
    scene.render.resolution_x, scene.render.resolution_y = width, height
    eye_v, target_v = Vector((eye[0], -eye[2], eye[1])), Vector((target[0], -target[2], target[1]))
    camera.location = eye_v
    camera.rotation_euler = (target_v - eye_v).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = lens
    scene.render.filepath = str(render_dir / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('side', (0, 1.83, 30), (0, 1.83, 0), 1000, 334, ortho=12.0)
shot('front', (30, 1.83, 0), (0, 1.83, 0), 600, 656, ortho=4.0)
shot('rear', (-30, 1.83, 0), (0, 1.83, 0), 656, 600, ortho=4.0)
shot('quarter', (8.5, 1.7, 9.5), (.3, 1.75, 0), 1000, 620, lens=30)
shot('quarter-rear', (-9, 1.7, 8.5), (-1.2, 1.75, 0), 1000, 620, lens=30)
shot('buried', (8.5, 1.7, 13), (.3, 1.75, 0), 1000, 620, lens=30, show_drift=True)
shot('buried-windward', (9, 3.2, -14), (.3, 2.0, 0), 1000, 620, lens=30, show_drift=True)

# Carriage review views also come from the exported GLB in this empty scene.
for obj in scene.objects:
    if obj.name.startswith(('the-2-15-engine', 'the-2-15-track', 'the-2-15-drift')):
        obj.hide_render = True
shot('carriage-side', (0, 1.83, 24), (0, 1.83, 0), 1000, 334, ortho=15.0)
shot('carriage-end', (12, 1.83, 0), (0, 1.83, 0), 600, 600, ortho=4.4)
shot('carriage-quarter', (10, 1.7, 9.5), (1, 1.75, 0), 1000, 620, lens=31)
shot('carriage-quarter-rear', (-10, 1.7, 9.5), (-1.6, 1.75, 0), 1000, 620, lens=31)
for obj in scene.objects:
    if obj.name.startswith(('the-2-15-engine', 'the-2-15-track', 'the-2-15-drift', 'the-2-15-carriage')):
        obj.hide_render = True
shot('van-side', (0, 2.0, 24), (0, 2.0, 0), 1000, 430, ortho=14.5)
shot('van-end', (24, 2.0, 0), (0, 2.0, 0), 600, 620, ortho=4.5)
shot('van-quarter', (10, 1.7, 9.5), (0, 1.7, 0), 1000, 620, lens=31)
shot('van-quarter-rear', (-10, 1.7, 9.5), (-.5, 1.7, 0), 1000, 620, lens=31)
