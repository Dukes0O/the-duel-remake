# Magnus the Magnet's roof crane and electromagnet (card WARLORD-NINE, art round 1). One original recipe, built from
# plain shapes in code: a bolted roof plate and turntable, a yellow lattice boom with an A-frame, a winch, a generator, a
# counterweight, a hook block with three chains and a round copper-wound electromagnet that hangs over the bonnet.
# The warlord drives a Falcone Heritage with scrap plates; the crane sits on that car's roof socket.
#
# Contract (glTF): metres, +Y up, +Z is the car's FORWARD (the same as every car model and the Gunn turret: the crane
# reaches towards +Z, the magnet hangs in front of the roof), +X is the car's left. One root empty `magnus-magnet`,
# origin on the middle of the roof plate's top at the car's roof socket: (0, size.height + roofLift, roofZ) in the car's
# own metres, which is (0, 1.40, -0.22) for the Heritage. The roof plate's underside is 0.04 m below the origin so it
# sits into the roof's crown. The crane is 1.04 m wide on the roof, reaches 0.65 m behind to 2.49 m ahead of the origin
# and stands 1.29 m tall; the magnet is 1.23 m across, its face centre level with the origin and tilted 9 degrees to look
# a little forward (on the Heritage its face is at least 0.3 m above the bonnet and it stays inside the nose).
#
# Nodes (each a separate object, all at the identity transform so the game can pick them by name):
#   magnus-magnet-base   roof plate, slewing ring, turntable, counterweight, A-frame, generator, winch
#   magnus-magnet-arm    boom, luffing ram, tip head, hook block, three chains, winch cable, power cable
#   magnus-magnet-disc   the magnet: steel shell, copper coil ring, face, lifting eyes
# Materials: magnus-magnet-paint (worn yellow over rust), -steel (dark steel), -iron (chains, pins), -cable (rubber),
# -copper (coil), and magnus-magnet-glow: the flat pole face only. Its base colour is dark and its emissive is zero in the
# file; the game lights it blue (the pull) or red (the window) through the emissive colour.
# Under 6,000 triangles and 300 KB. Run:
#   blender -b --python tools/blender/magnus-magnet.py -- --root . [--render DIR]
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/models/wasteland/kits/magnus-magnet.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='', help='folder for the review pictures (car, kit and crane together)')
parser.add_argument('--samples', type=int, default=40)
parser.add_argument('--res', default='800,600')
parser.add_argument('--only', default='', help='comma list of picture names, for quick tests')
parser.add_argument('--no-build', action='store_true', help='render from the glb already on disk')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / options.out
BUILD = root / 'art-build/magnus-magnet'
NATIVE = BUILD / 'magnus-magnet.blend'
if options.paths_only:
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

import numpy as np
import bpy
from mathutils import Vector, Matrix

BUILD.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)

PAINT, STEEL, IRON, CABLE, COPPER, GLOW = (f'magnus-magnet-{n}' for n in ('paint', 'steel', 'iron', 'cable', 'copper', 'glow'))
X = np.array((1., 0., 0.))
Y = np.array((0., 1., 0.))
Z = np.array((0., 0., 1.))

# ------------------------------------------------------------------ textures
# Tileable worn textures made with plain noise, written as screen colours (sRGB) and saved as small JPEGs.

def noise(size, beta, rng):
    spec = np.fft.fft2(rng.standard_normal((size, size)))
    fy = np.fft.fftfreq(size)[:, None]; fx = np.fft.fftfreq(size)[None, :]
    r = np.hypot(fx, fy); r[0, 0] = 1
    spec = spec / r ** beta; spec[0, 0] = 0
    n = np.fft.ifft2(spec).real
    return (n - n.mean()) / (n.std() + 1e-9)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def streaks(S, rng, strength=1.0):
    s = rng.standard_normal(S)
    s = np.convolve(np.r_[s[-6:], s, s[:6]], np.ones(5) / 5, 'same')[6:-6]
    s = (s - s.mean()) / (s.std() + 1e-9)
    slow = noise(S, 1.4, rng)
    return np.clip(s[None, :] * (.5 + .5 * np.tanh(slow)) * strength, -2, 2)

def worn_yellow(S, seed):
    """Crane yellow, faded and chipped down to orange rust and, in the worst places, bare dark steel."""
    rng = np.random.default_rng(seed)
    n1, n2, n3, n4 = noise(S, 1.6, rng), noise(S, 1.0, rng), noise(S, .5, rng), noise(S, .25, rng)
    img = np.zeros((S, S, 3), np.float32) + (.74, .54, .07) + .022 * n3[..., None]
    img *= (1 + .08 * n1)[..., None]
    field = n2 * .55 + n3 * .5 + n4 * .3 + n1 * .25
    chip = smooth(.50, .90, field)
    halo = smooth(.22, .50, field) * (1 - chip)
    rust = np.zeros((S, S, 3)) + (.40, .17, .065)
    rust = rust * (.65 + .35 * smooth(-1, 1, n1))[..., None]
    steel = np.zeros((S, S, 3)) + (.17, .15, .13)
    deep = smooth(1.15, 1.6, field)
    img = img * (1 - halo[..., None] * .45) + rust * halo[..., None] * .45
    img = img * (1 - chip[..., None]) + rust * chip[..., None]
    img = img * (1 - deep[..., None]) + steel * deep[..., None]
    img *= 1 - .34 * np.clip(streaks(S, rng, 1.2), 0, 1.4)[..., None]
    img *= 1 - .28 * smooth(.9, 2.0, noise(S, .35, rng))[..., None]
    img *= .90 + .10 * smooth(-1.5, 1.0, noise(S, 2.0, rng))[..., None]
    return np.clip(img, .01, .92)

def worn_steel(S, seed):
    """Dark gunmetal steel with rust blooms, pits and run-off streaks."""
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.6, rng), noise(S, 1.0, rng), noise(S, .5, rng)
    img = np.zeros((S, S, 3), np.float32) + (.150, .155, .160) + .025 * n3[..., None]
    img *= (1 + .10 * n1)[..., None]
    bloom = smooth(.15, 1.1, n1 * .8 + n2 * .5)
    orange = np.zeros((S, S, 3)) + (.30, .125, .05)
    orange = orange * (.7 + .3 * smooth(-1, 1, n2))[..., None]
    img = img * (1 - bloom[..., None] * .55) + orange * bloom[..., None] * .55
    img *= 1 - .22 * np.clip(streaks(S, rng, .8), 0, 1.4)[..., None]
    img *= 1 - .30 * smooth(1.2, 2.0, noise(S, .35, rng))[..., None]
    return np.clip(img, .01, .9)

def save_jpeg(name, arr, quality=58):
    h, w, _ = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(arr[::-1], 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    path = BUILD / f'{name}.jpg'
    img.filepath_raw = str(path); img.file_format = 'JPEG'
    img.save(quality=quality)
    bpy.data.images.remove(img)
    return bpy.data.images.load(str(path))

# ------------------------------------------------------------------ shapes
# Every shape is a list of corners and faces in game metres (x left, y up, z forward), wound so the outside faces out.
# A shape is (corners, faces, smooth flags, optional per-face texture coordinates in metres).

def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)

def basis(w, hint=None):
    w = unit(w)
    if hint is None:
        hint = Y if abs(w[1]) < .9 else X
    u = unit(np.cross(hint, w))
    return u, np.cross(w, u), w

def volume(c, faces):
    total = 0.
    for f in faces:
        for k in range(1, len(f) - 1):
            total += np.dot(c[f[0]], np.cross(c[f[k]], c[f[k + 1]]))
    return total / 6

def closed(c, faces, smooth_flag=False):
    c = [np.asarray(p, float) for p in c]
    if volume(c, faces) < 0:
        faces = [tuple(reversed(f)) for f in faces]
    return c, faces, smooth_flag, None

CUBE = [(0, 4, 6, 2), (1, 3, 7, 5), (0, 1, 5, 4), (2, 6, 7, 3), (0, 2, 3, 1), (4, 5, 7, 6)]

def hexa(c):
    """Eight corners in the order x + 2y + 4z of a deformed box."""
    return closed(c, CUBE)

def box(center, size, axes=None):
    axes = np.eye(3) if axes is None else np.asarray(axes, float)
    half = np.asarray(size, float) / 2
    corners = [np.asarray(center, float) + axes @ (half * ((i & 1) * 2 - 1, ((i >> 1) & 1) * 2 - 1, ((i >> 2) & 1) * 2 - 1))
               for i in range(8)]
    return closed(corners, CUBE)

def prism(poly_yz, x0, x1):
    poly = list(poly_yz)
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    if area < 0:
        poly.reverse()
    n = len(poly)
    c = [np.array((x1, y, z)) for y, z in poly] + [np.array((x0, y, z)) for y, z in poly]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return closed(c, faces)

def cyl(p0, p1, r0, r1=None, sides=8, caps=(True, True), smooth_flag=True, hint=None, spin=0.):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    r1 = r0 if r1 is None else r1
    u, v, w = basis(p1 - p0, hint)
    ring = [u * math.cos(spin + 2 * math.pi * k / sides) + v * math.sin(spin + 2 * math.pi * k / sides) for k in range(sides)]
    c = [p0 + r0 * q for q in ring] + [p1 + r1 * q for q in ring]
    faces = [(k, (k + 1) % sides, sides + (k + 1) % sides, sides + k) for k in range(sides)]
    smooth_list = [smooth_flag] * sides
    if caps[0]:
        base = len(c); c += [p0 + r0 * q for q in ring]
        faces.append(tuple(range(base + sides - 1, base - 1, -1))); smooth_list.append(False)
    if caps[1]:
        base = len(c); c += [p1 + r1 * q for q in ring]
        faces.append(tuple(range(base, base + sides))); smooth_list.append(False)
    return c, faces, smooth_list, None

def bolt(center, normal, r=.02, h=.014):
    """A hex bolt head standing on a surface (six sides, open underneath)."""
    c, faces, s, uv = cyl(center, np.asarray(center, float) + unit(normal) * h, r, r * .92, 6, (False, True), True)
    return c, faces, s, uv

def tube(points, radius, sides=6, closed_loop=False, up=None, caps=True, smooth_flag=True):
    pts = [np.asarray(p, float) for p in points]
    n = len(pts)
    radii = [radius] * n if np.isscalar(radius) else list(radius)
    tangents = []
    for i in range(n):
        a = pts[(i - 1) % n] if closed_loop else pts[max(i - 1, 0)]
        b = pts[(i + 1) % n] if closed_loop else pts[min(i + 1, n - 1)]
        tangents.append(unit(b - a))
    frames = []
    normal = None
    for i, t in enumerate(tangents):
        if up is not None:
            nn = unit(np.cross(up, t))
        elif normal is None:
            nn = basis(t)[0]
        else:
            nn = unit(normal - t * np.dot(normal, t))
        normal = nn
        frames.append((nn, np.cross(t, nn)))
    c, faces = [], []
    for i in range(n):
        nn, bb = frames[i]
        c += [pts[i] + radii[i] * (nn * math.cos(2 * math.pi * k / sides) + bb * math.sin(2 * math.pi * k / sides)) for k in range(sides)]
    last = n if closed_loop else n - 1
    for i in range(last):
        j = (i + 1) % n
        faces += [(i * sides + k, i * sides + (k + 1) % sides, j * sides + (k + 1) % sides, j * sides + k) for k in range(sides)]
    smooth_list = [smooth_flag] * len(faces)
    if caps and not closed_loop:
        for ring, rev in ((0, True), (n - 1, False)):
            base = len(c); nn, bb = frames[ring]
            c += [pts[ring] + radii[ring] * (nn * math.cos(2 * math.pi * k / sides) + bb * math.sin(2 * math.pi * k / sides)) for k in range(sides)]
            faces.append(tuple(range(base + sides - 1, base - 1, -1)) if rev else tuple(range(base, base + sides)))
            smooth_list.append(False)
    return c, faces, smooth_list, None

def lathe(origin, u, w, profile, sides=24):
    """Turn a (radius, height) line about an axis. Walk it from the middle of the bottom face outwards and up so the
    outside faces out. Every step of the line is its own strip so that corners stay sharp."""
    origin = np.asarray(origin, float)
    w = unit(w)
    u = unit(np.asarray(u, float) - w * np.dot(u, w))
    v = np.cross(w, u)
    c, faces, smooth_list, uvs = [], [], [], []

    def ring(r, h):
        if r == 0:
            return [origin + w * h]
        return [origin + w * h + r * (u * math.cos(2 * math.pi * k / sides) + v * math.sin(2 * math.pi * k / sides))
                for k in range(sides)]

    for (r0, h0), (r1, h1) in zip(profile[:-1], profile[1:]):
        wall = abs(h1 - h0) > 1e-9
        a0 = len(c); c += ring(r0, h0)
        b0 = len(c); c += ring(r1, h1)
        ia = (lambda k: a0) if r0 == 0 else (lambda k: a0 + k % sides)
        ib = (lambda k: b0) if r1 == 0 else (lambda k: b0 + k % sides)
        rm = (r0 + r1) / 2
        for k in range(sides):
            if r0 == 0:
                f = (ia(k), ib(k + 1), ib(k))
            elif r1 == 0:
                f = (ia(k), ia(k + 1), ib(k))
            else:
                f = (ia(k), ia(k + 1), ib(k + 1), ib(k))
            faces.append(f); smooth_list.append(wall)
            if wall:
                ka, kb = 2 * math.pi * k / sides, 2 * math.pi * (k + 1) / sides
                coord = (h0, h1) if abs(h1 - h0) >= abs(r1 - r0) else (r0, r1)
                if r0 == 0:
                    uvs.append([(0, coord[0]), (kb * rm, coord[1]), (ka * rm, coord[1])])
                elif r1 == 0:
                    uvs.append([(ka * rm, coord[0]), (kb * rm, coord[0]), (ka * rm, coord[1])])
                else:
                    uvs.append([(ka * rm, coord[0]), (kb * rm, coord[0]), (kb * rm, coord[1]), (ka * rm, coord[1])])
            else:
                uvs.append(None)
    return c, faces, smooth_list, uvs

# ------------------------------------------------------------------ parts

PARTS = {}   # (part, material) -> accumulated shape

def put(part, material, shape):
    c, faces, smooth_list, uvs = shape
    store = PARTS.setdefault((part, material), {'c': [], 'f': [], 's': [], 'uv': []})
    base = len(store['c'])
    store['c'] += list(c)
    for i, f in enumerate(faces):
        store['f'].append(tuple(base + k for k in f))
        store['s'].append(smooth_list[i] if isinstance(smooth_list, list) else smooth_list)
        store['uv'].append(None if uvs is None else uvs[i])

BASE, ARM, DISC = 'magnus-magnet-base', 'magnus-magnet-arm', 'magnus-magnet-disc'

# ---- the roof plate and turntable (origin: top of the roof plate at the car's roof socket)
put(BASE, STEEL, box((0, -.010, -.04), (1.04, .05, 1.14)))                     # roof plate, y -0.035 to 0.015
for z, depth, x, width in ((.51, .04, 0, 1.04), (-.59, .04, 0, 1.04)):
    put(BASE, PAINT, box((x, .0325, z), (width, .035, depth)))                 # front and back lips
for sx in (-1, 1):
    put(BASE, PAINT, box((sx * .50, .0325, -.04), (.04, .035, 1.06)))          # side lips
for sx in (-1, 1):
    for z in (-.50, -.04, .42):
        put(BASE, IRON, bolt((sx * .41, .015, z), Y, .022, .016))
put(BASE, STEEL, cyl((0, .015, 0), (0, .075, 0), .36, sides=20))                # slewing ring
put(BASE, STEEL, cyl((0, .075, 0), (0, .095, 0), .43, sides=20))                # bolted flange
for k in range(10):
    a = 2 * math.pi * k / 10 + .1
    put(BASE, IRON, bolt((.395 * math.cos(a), .095, .395 * math.sin(a)), Y, .016, .012))
put(BASE, PAINT, cyl((0, .095, 0), (0, .155, 0), .50, sides=20))                # turntable deck

# ---- counterweight at the back of the deck
put(BASE, STEEL, box((0, .335, -.46), (.62, .36, .32)))
put(BASE, PAINT, box((0, .532, -.46), (.68, .035, .38)))
for sx in (-1, 1):
    put(BASE, PAINT, box((sx * .325, .335, -.46), (.03, .38, .30)))

# ---- A-frame for the boom pivot, with the winch cable sheave at its top
for sx in (-1, 1):
    put(BASE, PAINT, prism([(.155, -.10), (.155, .26), (.92, .07), (.92, -.05)], sx * .1475, sx * .1825))
put(BASE, IRON, cyl((-.215, .56, .06), (.215, .56, .06), .026, sides=8))        # boom pivot pin
put(BASE, IRON, cyl((-.215, .84, .01), (.215, .84, .01), .016, sides=6))        # sheave axle
put(BASE, IRON, cyl((-.045, .84, .01), (.045, .84, .01), .06, sides=14))        # winch cable sheave
for sx in (-1, 1):
    put(BASE, STEEL, cyl((sx * .1825, .56, .06), (sx * .2125, .56, .06), .05, sides=10))
    put(BASE, STEEL, cyl((sx * .1825, .84, .01), (sx * .2025, .84, .01), .04, sides=10))
put(BASE, STEEL, box((0, .185, .32), (.12, .06, .08)))                          # foot of the luffing ram

# ---- generator on the right-hand side of the deck (the magnet's power)
put(BASE, STEEL, box((-.31, .31, 0), (.24, .31, .46)))
put(BASE, PAINT, box((-.31, .475, 0), (.27, .03, .50)))
for k in range(5):
    put(BASE, IRON, box((-.435, .225 + k * .045, 0), (.02, .02, .32)))
put(BASE, STEEL, cyl((-.37, .49, -.14), (-.37, .80, -.14), .032, sides=8))      # exhaust stack
put(BASE, IRON, cyl((-.37, .80, -.14), (-.37, .835, -.14), .052, .01, sides=8))

# ---- winch on the centre line behind the A-frame
for sx in (-1, 1):
    put(BASE, PAINT, box((sx * .215, .29, -.20), (.03, .26, .30)))
put(BASE, STEEL, box((0, .185, -.20), (.40, .04, .34)))
put(BASE, IRON, cyl((-.215, .29, -.20), (.215, .29, -.20), .07, sides=12))     # drum core
put(BASE, CABLE, cyl((-.17, .29, -.20), (.17, .29, -.20), .085, sides=12))      # wound cable
put(BASE, STEEL, box((.285, .29, -.20), (.07, .17, .17)))                       # gearbox

# ---- the boom: a four-chord lattice, tapering from the pivot to the tip head
PIVOT = np.array((0, .56, .06))
TIP = np.array((0, 1.17, 1.72))
BOOM = TIP - PIVOT
LEN = np.linalg.norm(BOOM)
D = BOOM / LEN
N = np.array((0, D[2], -D[1]))   # up, square to the boom, in the side view

def depth(s): return .150 - .085 * s / LEN
def width(s): return .130 - .070 * s / LEN
def chord(s, sx, sz): return PIVOT + D * s + N * (sz * depth(s)) + X * (sx * width(s))

for sx in (-1, 1):
    for sz in (-1, 1):
        put(ARM, PAINT, cyl(chord(0, sx, sz), chord(LEN, sx, sz), .024, .017, sides=6))
stations = [LEN * k / 7 for k in range(8)]
for s in stations:
    for sz in (-1, 1):
        put(ARM, PAINT, cyl(chord(s, -1, sz), chord(s, 1, sz), .012, sides=5, caps=(False, False)))
for k in range(2, 7):
    for sx in (-1, 1):
        a, b = (-1, 1) if k % 2 == 0 else (1, -1)
        put(ARM, PAINT, cyl(chord(stations[k], sx, a), chord(stations[k + 1], sx, b), .011, sides=5, caps=(False, False)))
for sx in (-1, 1):                                                              # gusset plates at the pivot end
    corners = []
    for iz, s in enumerate((0., .56)):
        for iy, sz in enumerate((-1, 1)):
            for ix, off in enumerate((.004, .022)):
                corners.append((ix + 2 * iy + 4 * iz, chord(s, sx, sz) + X * sx * off))
    put(ARM, PAINT, hexa([p for _, p in sorted(corners, key=lambda t: t[0])]))
put(ARM, STEEL, cyl((-.14, .56, .06), (.14, .56, .06), .05, sides=10))          # pivot sleeve
for sx in (-1, 1):                                                              # tip head side plates
    poly = [(PIVOT + D * s + N * t)[1:] for s, t in ((LEN - .28, -.075), (LEN + .04, -.11), (LEN + .12, -.01),
                                                       (LEN + .04, .11), (LEN - .28, .085))]
    put(ARM, PAINT, prism([(p[0], p[1]) for p in poly], sx * .062, sx * .082))
SHEAVE = PIVOT + D * (LEN + .02)
put(ARM, IRON, cyl(SHEAVE - X * .045, SHEAVE + X * .045, .09, sides=16))
put(ARM, IRON, cyl(SHEAVE - X * .095, SHEAVE + X * .095, .015, sides=6))

# ---- luffing ram, from the deck to a boom rung
FOOT = np.array((0, .19, .32))
RAM_TOP = chord(stations[3], 0, -1)
MID = FOOT + (RAM_TOP - FOOT) * .52
put(ARM, STEEL, cyl(FOOT, MID, .042, sides=8))
put(ARM, IRON, cyl(MID, RAM_TOP, .022, sides=6))

# ---- the cables and the hook block
DROP_Z = SHEAVE[2] + .09
HOOK_TOP = np.array((0, 1.04, DROP_Z))
put(ARM, CABLE, tube([(0, .90, .01), SHEAVE + N * .098, SHEAVE + (N + D) * .0695, (0, SHEAVE[1], DROP_Z), HOOK_TOP],
                     .014, sides=6))
put(ARM, CABLE, tube([(0, .375 + .085, -.20), (0, .60, -.14), (0, .78, -.05), (0, .90, .01)], .013, sides=6))
put(ARM, STEEL, box((0, .98, DROP_Z), (.11, .13, .12)))
put(ARM, PAINT, box((0, 1.05, DROP_Z), (.14, .035, .15)))
RING = np.array((0, .87, DROP_Z))
put(ARM, IRON, tube([RING + (Y * math.cos(a) + Z * math.sin(a)) * .045 for a in np.linspace(0, 2 * math.pi, 9)[:-1]],
                    .012, sides=4, closed_loop=True, up=X, caps=False))

# ---- the magnet: a shallow steel can with a copper coil ring and a flat pole face, tilted a little forward
TILT = math.radians(9)
AXIS = np.array((0, math.cos(TILT), -math.sin(TILT)))     # up the magnet; the face looks down and a little forward
EU = X
EV = np.cross(AXIS, EU)
FACE = np.array((0, 0., DROP_Z + .48 * math.sin(TILT)))
SIDES = 24
H = .40

def at(r, theta, h):
    return FACE + AXIS * h + r * (EU * math.cos(theta) + EV * math.sin(theta))

def local_axes(theta):
    er = EU * math.cos(theta) + EV * math.sin(theta)
    return np.stack([er, np.cross(AXIS, er), AXIS], axis=1)

def turned(material, profile, sides=SIDES):
    put(DISC, material, lathe(FACE, EU, AXIS, profile, sides))

turned(GLOW, [(0, 0), (.14, 0), (.14, .012), (.19, .012), (.19, 0), (.27, 0), (.27, .012), (.32, .012), (.32, 0), (.395, 0)])
turned(STEEL, [(.395, 0), (.395, .045)])
coil = [(.395, .045)]
for k in range(4):
    r0 = .395 + .031 * k
    coil += [(r0 + .003, .045), (r0 + .008, .023), (r0 + .023, .023), (r0 + .028, .045)]
turned(COPPER, coil + [(.52, .045)])
turned(STEEL, [(.52, .045), (.52, 0), (.585, 0), (.60, .015), (.60, .19)])
turned(PAINT, [(.60, .19), (.615, .19), (.615, .225), (.60, .225)])
turned(STEEL, [(.60, .225), (.60, .37), (.585, H), (.22, H), (.22, .455), (.17, .48), (0, .48)])
for k in range(8):
    theta = math.radians(22.5 + 45 * k)
    put(DISC, STEEL, box(at(.31, theta, H + .022), (.30, .03, .044), local_axes(theta)))
for k in range(8):
    theta = math.radians(45 * k + 22.5 + 11)
    put(DISC, IRON, bolt(at(.50, theta, H), AXIS, .018, .014))
put(DISC, STEEL, box(FACE + AXIS * .505, (.15, .15, .05), np.stack([EU, EV, AXIS], axis=1)))   # power terminal

EYES = []
for theta_deg in (270, 30, 150):
    theta = math.radians(theta_deg)
    axes = local_axes(theta)
    put(DISC, STEEL, box(at(.38, theta, H + .03), (.08, .03, .07), axes))
    eye = at(.38, theta, H + .095)
    er = axes[:, 0]
    put(DISC, IRON, tube([eye + (er * math.cos(a) + AXIS * math.sin(a)) * .045 for a in np.linspace(0, 2 * math.pi, 9)[:-1]],
                         .011, sides=4, closed_loop=True, up=axes[:, 1], caps=False))
    EYES.append(eye)

# ---- three chains from the hook ring to the lifting eyes
def chain(start, end, links=8):
    direction = end - start
    length = np.linalg.norm(direction)
    direction = direction / length
    p1 = unit(np.cross(direction, X))
    p2 = np.cross(direction, p1)
    pitch = length / links
    for i in range(links):
        plane_normal, in_plane = (p2, p1) if i % 2 == 0 else (p1, p2)
        centre = start + direction * pitch * (i + .5)
        pts = [centre + direction * (pitch * .64) * math.cos(a) + in_plane * .028 * math.sin(a)
               for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
        put(ARM, IRON, tube(pts, .0105, sides=4, closed_loop=True, up=plane_normal, caps=False))

for eye in EYES:
    sideways = np.array((eye[0], 0., eye[2] - DROP_Z))
    start = RING - Y * .045 + (unit(sideways) * .03 if np.linalg.norm(sideways) > 1e-6 else 0)
    chain(start, eye)

# ---- the power cable: generator, up the left of the boom, then a slack loop down to the magnet's terminal
TERMINAL = FACE + AXIS * .535
route = [np.array((-.30, .50, .22)), np.array((-.24, .56, .30))]
route += [chord(LEN * f, -1, -1) + np.array((-.022, -.02, 0)) for f in (.25, .5, .75, .93)]
hang_top = route[-1]
for i in range(1, 7):
    u_ = i / 7
    point = hang_top + (TERMINAL - hang_top) * u_
    point = point + np.array((-.17 * math.sin(math.pi * u_) ** .8, 0., .08 * math.sin(math.pi * u_)))
    route.append(point)
route.append(TERMINAL)
put(ARM, CABLE, tube(route, .014, sides=5))

# ------------------------------------------------------------------ materials and meshes

def build_materials():
    textured = {PAINT: (save_jpeg('paint', worn_yellow(512, 31), 40), .92, .42, .9),
                STEEL: (save_jpeg('steel', worn_steel(256, 37), 60), .7, .62, .75)}
    plain = {IRON: ((.045, .036, .03), .62, .72), CABLE: ((.012, .012, .013), 0., .9),
             COPPER: ((.55, .22, .08), .85, .42), GLOW: ((.028, .034, .046), .5, .42)}
    mats, tile = {}, {}
    for name, (image, tile_m, metal, rough) in textured.items():
        m = bpy.data.materials.new(name); m.use_nodes = True
        nodes = m.node_tree.nodes; b = nodes['Principled BSDF']
        tex = nodes.new('ShaderNodeTexImage'); tex.image = image
        m.node_tree.links.new(tex.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Metallic'].default_value = metal * (.35 if name == PAINT else .55)
        b.inputs['Roughness'].default_value = rough
        mats[name] = m; tile[name] = tile_m
    for name, (color, metal, rough) in plain.items():
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*color, 1)
        b.inputs['Metallic'].default_value = metal
        b.inputs['Roughness'].default_value = rough
        if name == GLOW:
            b.inputs['Emission Color'].default_value = (0, 0, 0, 1)
            b.inputs['Emission Strength'].default_value = 0
        mats[name] = m; tile[name] = 0
    return mats, tile

def make_mesh(part, mats, tile):
    keys = [key for key in PARTS if key[0] == part]
    order = [key[1] for key in keys]
    verts, faces, smooth_flags, material_index, uv_list = [], [], [], [], []
    for key in keys:
        store = PARTS[key]
        base = len(verts)
        verts += [(p[0], -p[2], p[1]) for p in store['c']]          # game (x, y, z) to Blender (x, -z, y)
        for i, f in enumerate(store['f']):
            faces.append(tuple(base + k for k in f))
            smooth_flags.append(store['s'][i])
            material_index.append(order.index(key[1]))
            pts = [store['c'][k] for k in f]
            if tile[key[1]] == 0:
                uv_list.append([(0., 0.)] * len(f))
            elif store['uv'][i] is not None:
                uv_list.append([(a / tile[key[1]], b / tile[key[1]]) for a, b in store['uv'][i]])
            else:
                normal = np.zeros(3)
                for a in range(len(pts)):
                    p, q = pts[a], pts[(a + 1) % len(pts)]
                    normal += np.array((((p[1] - q[1]) * (p[2] + q[2])), ((p[2] - q[2]) * (p[0] + q[0])), ((p[0] - q[0]) * (p[1] + q[1]))))
                axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[int(np.argmax(np.abs(normal)))]
                uv_list.append([(p[axes[0]] / tile[key[1]], p[axes[1]] / tile[key[1]]) for p in pts])
    mesh = bpy.data.meshes.new(part)
    mesh.from_pydata(verts, [], faces)
    for slot in order:
        mesh.materials.append(mats[slot])
    mesh.polygons.foreach_set('material_index', material_index)
    mesh.polygons.foreach_set('use_smooth', smooth_flags)
    layer = mesh.uv_layers.new(name='UVMap')
    for poly, uvs in zip(mesh.polygons, uv_list):
        for loop, uv in zip(poly.loop_indices, uvs):
            layer.data[loop].uv = uv
    mesh.update()
    obj = bpy.data.objects.new(part, mesh)
    bpy.context.collection.objects.link(obj)
    triangles = sum(len(f) - 2 for f in faces)
    return obj, triangles

def build_and_export():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats, tile = build_materials()
    root_empty = bpy.data.objects.new('magnus-magnet', None)
    root_empty.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(root_empty)
    report, total = {}, 0
    objects = []
    for part in (BASE, ARM, DISC):
        obj, tris = make_mesh(part, mats, tile)
        obj.parent = root_empty
        report[part] = tris; total += tris
        objects.append(obj)
    print('magnus-magnet triangles per node:', json.dumps(report))
    print(f'magnus-magnet triangles: {total}')
    assert total <= 6000, f'over the 6,000 triangle budget: {total}'
    bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
    bpy.ops.object.select_all(action='DESELECT')
    root_empty.select_set(True)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root_empty
    bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=False, export_cameras=False, export_lights=False,
                              export_image_format='AUTO')
    size = OUT.stat().st_size
    print(f'magnus-magnet glb bytes: {size}')
    assert size <= 300000, f'over the 300 KB budget: {size}'

# ------------------------------------------------------------------ review pictures

HERITAGE = {'size': (2.3, 4.8, 1.3), 'roofLift': .10, 'roofZ': -.22}       # src/hero-vehicle.js, src/vehicle-sockets.js
SOCKET = (0., HERITAGE['size'][2] + HERITAGE['roofLift'], HERITAGE['roofZ'])

def render_review(folder):
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    existing = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/models/car-concept.glb'))
    car_objs = [o for o in scene.objects if o not in existing]
    meshes = [o for o in car_objs if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    s = 4.8 / (hi[1] - lo[1])                       # the game scales the licensed body to 4.8 m long
    car_root = bpy.data.objects.new('car-root', None); scene.collection.objects.link(car_root)
    for o in car_objs:
        if o.parent is None:
            o.parent = car_root
    car_root.scale = (s, s, s)
    car_root.location = (-(lo[0] + hi[0]) / 2 * s, -(lo[1] + hi[1]) / 2 * s, -lo[2] * s)
    for o in meshes:
        for slot in o.material_slots:
            if slot.material and 'Paint 1' in slot.material.name:
                slot.material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.58, .012, .006, 1)
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/models/wasteland/kits/falcone_heritage.glb'))
    for o in set(scene.objects) - before:
        n = o
        while n is not None:
            if n.name.startswith(('kit-raider', 'kit-warlord')):
                o.hide_render = True; o.hide_viewport = True
            n = n.parent
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    crane = [o for o in set(scene.objects) - before if o.parent is None][0]
    crane.location = (SOCKET[0], -SOCKET[2], SOCKET[1])
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = options.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = (int(v) for v in options.res.split(','))
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.exposure = -.25
    scene.world = bpy.data.worlds.new('sky'); scene.world.use_nodes = True
    sky = scene.world.node_tree.nodes['Background']
    sky.inputs['Color'].default_value = (.30, .33, .38, 1); sky.inputs['Strength'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    floor = bpy.context.object
    fm = bpy.data.materials.new('road'); fm.use_nodes = True
    fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.10, .095, .09, 1)
    fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .95
    floor.data.materials.append(fm)
    for location, energy, size, color in (((6, -7, 9), 2600, 8, (1, .93, .82)), ((-7, 3, 5), 900, 8, (.75, .85, 1)),
                                           ((0, -8, 4), 500, 6, (1, 1, 1))):
        bpy.ops.object.light_add(type='AREA', location=location)
        lamp = bpy.context.object
        lamp.data.energy = energy; lamp.data.size = size; lamp.data.color = color
        lamp.rotation_euler = (Vector((0, -.5, 1.2)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
    glow = [m for m in bpy.data.materials if m.name.startswith('magnus-magnet-glow')][0]
    bsdf = glow.node_tree.nodes['Principled BSDF']

    def camera(location, target, ortho=None, lens=45, top=False):
        bpy.ops.object.camera_add(location=location)
        cam = bpy.context.object
        if top:
            cam.rotation_euler = (0, 0, math.pi)
        else:
            cam.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
        if ortho:
            cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
        else:
            cam.data.lens = lens
        cam.data.clip_end = 200
        scene.camera = cam
        return cam

    # Blender coordinates: x left, y = -forward, z up. The nose of the car is at -y.
    mag = (0, -1.9, 1.35)
    views = [
        ('side', lambda: camera((30, -.2, 1.35), (0, -.2, 1.35), ortho=6.0), None),
        ('three-quarter', lambda: camera((4.7, -5.7, 3.0), (0, -.5, 1.3), lens=42), None),
        ('front', lambda: camera((0, -30, 1.45), (0, 0, 1.45), ortho=3.6), None),
        ('top', lambda: camera((0, -.1, 30), (0, -.1, 0), ortho=7.3, top=True), None),
        ('close', lambda: camera((2.6, -4.6, 2.1), mag, lens=50), None),
        ('glow-off', lambda: camera((2.3, -5.4, .75), (0, -1.9, 1.45), lens=50), (0, 0, 0)),
        ('glow-blue', lambda: camera((2.3, -5.4, .75), (0, -1.9, 1.45), lens=50), (.03, .25, 1.0)),
        ('glow-red', lambda: camera((2.3, -5.4, .75), (0, -1.9, 1.45), lens=50), (1.0, .03, .01)),
    ]
    wanted = [v for v in options.only.split(',') if v]
    for name, make_camera, tint in views:
        if wanted and name not in wanted:
            continue
        for o in [o for o in scene.objects if o.type == 'CAMERA']:
            bpy.data.objects.remove(o)
        make_camera()
        bsdf.inputs['Emission Color'].default_value = (*(tint or (0, 0, 0)), 1)
        bsdf.inputs['Emission Strength'].default_value = 3.0 if tint and any(tint) else 0.0
        scene.render.filepath = str(folder / f'{name}.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', scene.render.filepath)

if not options.no_build:
    build_and_export()
if options.render:
    render_review(options.render)
