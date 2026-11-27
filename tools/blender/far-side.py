# The Far Side's art kit (card WW-ART-FAR): Highwater, the mill, PRUDENCE and the green. One family file of named
# parts, each standing at its own origin, for FAR-REGION to place. Green, dark and soaking wet.
#
# Contract (glTF): metres, +Y up, a part's front is -Z. One root empty `far-side`; every named part is a child of it
# at the identity transform, with its foot on y = 0 at the origin:
#   highwater-mill (children :wheel, turning on X at its axle, and :stream), highwater-house, highwater-barn,
#   maud-cart (children :wheel-l and :wheel-r on the axle), top-pond-bank, top-pond-gate (children :leaf, which lifts
#   along Y, and :handwheel), prudence (children :head on the bore's axis and :lunch-tin), prudence-gallery,
#   tunnel-ring, tunnel-portal, spoil-heap, goat-fourteen, sheep, conifer-tall, conifer-small, apple-tree,
#   grass-clump, wet-rock, maud-tarn and wick (each the town walker rig: :upper, :leg-l, :leg-r; like the town's
#   walkers, and unlike the rest of the kit, the two people face +Z).
# Moss is on a building's +Z side, so +Z is north when FAR-REGION places one.
# Materials are named `far-side-<surface>`. `far-side-lamp` is dark in the file; the game lights it.
#
# How it is made (docs/ART_LINE.md): surfaces are photographs already in the repository (stone, timber, canvas,
# steel, the borer's and the walkers' photo sets, the goat's coat) or pictures drawn here in code (slate, moss,
# grass, spruce boughs, wool, bark). Shapes are built from those, never from flat-coloured boxes. People are carved
# with hull_model.py from the town walkers' photo sets, with the clothes dyed to oilskin and the faces left alone.
# Nothing that moves or glows is modelled: falling water, rain and lamp light belong to the game's drawing code.
#
# Run (a heavy job, docs/FACTORY.md section 8):
#   blender -b -t 4 --python-exit-code 1 --python tools/blender/far-side.py -- --root . [--render DIR] [--only a,b]
#   python tools/blender/far-side.py --sheet DIR --out docs/board/looks/ww-art-far/round-N.jpg   (plain Python, Pillow)
# --only builds a trial file under art-build/ and never overwrites the file the game loads.
import argparse, json, math, struct, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', default='.')
parser.add_argument('--out', default='public/assets/models/wasteland/far-side/far-side.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='', help='folder for the review pictures')
parser.add_argument('--only', default='', help='comma list of parts, for a trial build')
parser.add_argument('--no-build', action='store_true', help='render from the glb already on disk')
parser.add_argument('--sheet', default='', help='folder of review pictures to lay out as one sheet (plain Python)')
parser.add_argument('--refs', default='C:/Users/kyleb/dev/art-library/ww-art-far/reference')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
ONLY = [n for n in options.only.split(',') if n]
BUILD = root / 'art-build/far-side'
OUT = (BUILD / 'far-side-trial.glb') if ONLY else root / options.out
NATIVE = BUILD / 'far-side.blend'
TOWN_TEX = root / 'public/assets/models/wasteland/town/textures'
SCAB_TEX = root / 'public/assets/models/wasteland/scablands/textures'
BUDGET, MAX_BYTES = 60000, 3 * 1024 * 1024
PARTS = ['highwater-mill', 'highwater-house', 'highwater-barn', 'maud-cart', 'top-pond-bank', 'top-pond-gate',
         'prudence', 'prudence-gallery', 'tunnel-ring', 'tunnel-portal', 'spoil-heap', 'goat-fourteen', 'sheep',
         'conifer-tall', 'conifer-small', 'apple-tree', 'grass-clump', 'wet-rock', 'maud-tarn', 'wick']
# How each part is photographed for the sheet: the way the camera looks from (degrees round Y from the front, -Z)
# and what the label says. Every picture is taken from car height, 15 m from the part's middle.
VIEWS = {'highwater-mill': 38, 'highwater-house': -28, 'highwater-barn': 30, 'maud-cart': 55, 'top-pond-bank': 28,
         'top-pond-gate': 28, 'prudence': 48, 'prudence-gallery': 12, 'tunnel-ring': 20, 'tunnel-portal': 18,
         'spoil-heap': 25, 'goat-fourteen': 62, 'sheep': 62, 'conifer-tall': 0, 'conifer-small': 0, 'apple-tree': 15,
         'grass-clump': 20, 'wet-rock': 30, 'maud-tarn': 202, 'wick': 158, 'prudence deck': 128}

# A part far longer than 15 m cannot be seen whole from 15 m without a lens that bends it. These are framed on
# the stretch a player looks at, given as limits along the part's own Z (metres).
FRAME = {'highwater-mill': (-6.5, 5.5), 'prudence': (-1.7, 12.5), 'prudence deck': (14.6, 21.5)}
if options.paths_only:
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

if options.sheet:
    # Lay the review pictures out as one sheet: the whole place and two real photographs across the top, then every
    # named part from car height at 15 m, each with its name. Plain Python with Pillow; Blender is not involved.
    from PIL import Image, ImageDraw, ImageFont
    folder = Path(options.sheet)
    cw, ch, cols, bar = 360, 250, 6, 22
    names = [n for n in PARTS + ['prudence deck'] if (folder / f'{n}.png').exists()]
    names.insert(names.index('prudence') + 1, names.pop()) if 'prudence deck' in names and 'prudence' in names else None
    rows = (len(names) + cols - 1) // cols
    top_h = 430
    sheet = Image.new('RGB', (cols * cw, top_h + bar + rows * (ch + bar)), (38, 40, 40))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('arial.ttf', 15)
    except OSError:
        font = ImageFont.load_default()

    def fit(path, w, h):
        im = Image.open(path).convert('RGB')
        s = max(w / im.width, h / im.height)
        im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
        x, y = (im.width - w) // 2, (im.height - h) // 2
        return im.crop((x, y, x + w, y + h))

    tops = [(folder / 'place.png', 'Highwater, the above-ground parts together, from car height (model)', 1150)]
    refs = Path(options.refs)
    for file, label in (('peirce-mill-wheel.jpg', 'real: Peirce Mill, CC0'), ('hoh-mist-forest.jpg', 'real: Hoh forest in mist, NPS')):
        if (refs / file).exists():
            tops.append((refs / file, label, 505))
    x = 0
    for path, label, w in tops:
        if path.exists():
            sheet.paste(fit(path, w - 2, top_h), (x, bar))
            draw.text((x + 6, 3), label, fill=(235, 235, 225), font=font)
        x += w
    for i, name in enumerate(names):
        x, y = (i % cols) * cw, top_h + bar + (i // cols) * (ch + bar)
        sheet.paste(fit(folder / f'{name}.png', cw - 2, ch), (x, y + bar))
        draw.text((x + 6, y + 3), name, fill=(235, 235, 225), font=font)
    out = Path(options.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    quality = 86
    while True:
        sheet.save(out, quality=quality, optimize=True)
        if out.stat().st_size <= 488_000 or quality <= 40:
            break
        quality -= 4
    print(json.dumps({'sheet': str(out), 'bytes': out.stat().st_size, 'quality': quality, 'size': sheet.size}))
    sys.exit(0)

import numpy as np
import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Mesh, Photo

BUILD.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
X, Y, Z = np.array((1., 0., 0.)), np.array((0., 1., 0.)), np.array((0., 0., 1.))
TAU = 2 * math.pi

# ------------------------------------------------------------------ pictures
# Pictures are arrays of screen colours (sRGB, 0 to 1), top row first.

def spectral(size, beta, rng, wide=None):
    """Tileable noise with its mean at 0 and spread 1. `wide` > 1 draws it out down the picture, as streaks."""
    h, w = (size, size) if isinstance(size, int) else size
    spec = np.fft.fft2(rng.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :] * (1 if wide is None else 1 / wide)
    r = np.hypot(fx, fy)
    r[0, 0] = 1
    spec = spec / r ** beta
    spec[0, 0] = 0
    n = np.fft.ifft2(spec).real
    return (n - n.mean()) / (n.std() + 1e-9)

def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def mixc(a, b, t):
    t = np.asarray(t, float)[..., None]
    return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t

def read_picture(path):
    image = bpy.data.images.load(str(path))
    w, h = image.size
    px = np.empty(w * h * 4, np.float32)
    image.pixels.foreach_get(px)
    bpy.data.images.remove(image)
    return px.reshape(h, w, 4)[::-1].copy()

def resize(a, w, h):
    """Shrink by averaging whole blocks, then by taking the nearest two samples each way."""
    sh, sw = a.shape[:2]
    fy, fx = max(1, sh // h), max(1, sw // w)
    if fy > 1 or fx > 1:
        a = a[:sh // fy * fy, :sw // fx * fx]
        a = a.reshape(a.shape[0] // fy, fy, a.shape[1] // fx, fx, -1).mean(axis=(1, 3))
        sh, sw = a.shape[:2]
    ys = (np.arange(h) + .5) * sh / h - .5
    xs = (np.arange(w) + .5) * sw / w - .5
    y0 = np.clip(np.floor(ys).astype(int), 0, sh - 1); y1 = np.clip(y0 + 1, 0, sh - 1); ty = np.clip(ys - y0, 0, 1)[:, None, None]
    x0 = np.clip(np.floor(xs).astype(int), 0, sw - 1); x1 = np.clip(x0 + 1, 0, sw - 1); tx = np.clip(xs - x0, 0, 1)[None, :, None]
    top = a[y0][:, x0] * (1 - tx) + a[y0][:, x1] * tx
    low = a[y1][:, x0] * (1 - tx) + a[y1][:, x1] * tx
    return top * (1 - ty) + low * ty

def luminance(a):
    return a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11

def mirror_tile(a):
    """A picture that is not tileable, laid beside its mirror images so that it is."""
    top = np.concatenate([a, a[:, ::-1]], axis=1)
    return np.concatenate([top, top[::-1]], axis=0)

def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=-1), a.min(axis=-1)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return h % 1, d / (mx + 1e-9), mx

def from_hsv(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)

IMAGES = {}

def save_picture(name, arr, quality=62):
    """Write a picture into the build folder and load it back; alpha, if given, makes a PNG cut-out."""
    arr = np.clip(np.asarray(arr, np.float32), 0, 1)
    h, w = arr.shape[:2]
    alpha = arr.shape[2] == 4
    image = bpy.data.images.new(name, w, h, alpha=alpha)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :arr.shape[2]] = arr[::-1]
    image.pixels.foreach_set(rgba.ravel())
    path = BUILD / f'{name}.{"png" if alpha else "jpg"}'
    image.filepath_raw = str(path)
    image.file_format = 'PNG' if alpha else 'JPEG'
    image.save(quality=quality) if not alpha else image.save()
    bpy.data.images.remove(image)
    IMAGES[name] = bpy.data.images.load(str(path))
    return IMAGES[name]

MATERIALS, TILE = {}, {}

def material(key, picture=None, tile=(1, 1), colour=(.5, .5, .5), rough=.85, metal=0., cutout=False, quality=62, like=None, tint=None):
    """A named surface. `tile` is the picture's size in metres, for surfaces laid out in metres. `like` names a
    surface whose picture this one shares, darkened by `tint`: the file then holds the picture once."""
    mat = bpy.data.materials.new('far-side-' + key)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = min(metal, .3)
    mat.diffuse_color = (*colour, 1)
    if picture is not None or like:
        image = IMAGES['far-side-' + like] if like else save_picture('far-side-' + key, picture, quality)
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        if tint:
            mix = mat.node_tree.nodes.new('ShaderNodeMix')
            mix.data_type, mix.blend_type = 'RGBA', 'MULTIPLY'
            mix.inputs[0].default_value = 1            # factor; sockets 6 and 7 are the two colours
            mix.inputs[7].default_value = (*tint, 1)
            mat.node_tree.links.new(node.outputs['Color'], mix.inputs[6])
            mat.node_tree.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
        else:
            mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
        if cutout:
            mat.node_tree.links.new(node.outputs['Alpha'], bsdf.inputs['Alpha'])
            mat.blend_method = 'CLIP'
            mat.alpha_threshold = .4
            mat.use_backface_culling = False
    MATERIALS[key] = mat
    TILE[key] = tile
    return mat

# ------------------------------------------------------------------ shapes
# A part gathers faces in game metres: x to the right, y up, and its front at the lowest z (the front is -Z).
# Surfaces laid out in metres read their picture at TILE[material].

def vnoise(p, scale=1.0, seed=0):
    """Smooth noise between -1 and 1 at a point, the same every run."""
    x, y, z = (np.asarray(p, float) * scale + seed * 17.13)
    xi, yi, zi = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = x - xi, y - yi, z - zi
    fx, fy, fz = (f * f * (3 - 2 * f) for f in (fx, fy, fz))

    def h(i, j, k):
        n = math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 53.3) * 43758.5453
        return (n - math.floor(n)) * 2 - 1
    c = [[[h(xi + i, yi + j, zi + k) for k in (0, 1)] for j in (0, 1)] for i in (0, 1)]
    x0 = [[c[0][j][k] * (1 - fx) + c[1][j][k] * fx for k in (0, 1)] for j in (0, 1)]
    y0 = [x0[0][k] * (1 - fy) + x0[1][k] * fy for k in (0, 1)]
    return y0[0] * (1 - fz) + y0[1] * fz

def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v)
    return v / n if n else v

class Part:
    def __init__(self, name):
        self.name = name
        self.mesh = Mesh()
        self.children = []

    def uv(self, mat, u, v):
        tw, th = TILE[mat]
        return (u / tw, v / th)

    def face(self, mat, pts, uvs, out=None, smooth=False):
        self.mesh.face([tuple(map(float, p)) for p in pts], uvs, mat, None if out is None else tuple(out), smooth)

    def quad(self, mat, a, b, c, d, out=None, u0=0., v0=0., smooth=False, turn=False, scale=1.0):
        """A four-sided face a, b, c, d (b beside a, d above a), its picture laid out in metres from a."""
        a, b, c, d = (np.asarray(p, float) for p in (a, b, c, d))
        w, h = np.linalg.norm(b - a), np.linalg.norm(d - a)
        w2 = np.linalg.norm(c - d)
        if turn:
            uvs = [self.uv(mat, v0 * scale, u0 * scale), self.uv(mat, v0 * scale, (u0 + w) * scale),
                   self.uv(mat, (v0 + h) * scale, (u0 + w2) * scale), self.uv(mat, (v0 + h) * scale, u0 * scale)]
        else:
            uvs = [self.uv(mat, u0 * scale, v0 * scale), self.uv(mat, (u0 + w) * scale, v0 * scale),
                   self.uv(mat, (u0 + w2) * scale, (v0 + h) * scale), self.uv(mat, u0 * scale, (v0 + h) * scale)]
        self.face(mat, (a, b, c, d), uvs, out, smooth)

    def grid(self, mat, point, nu, nv, uv=None, out=None, smooth=True, flip=False):
        """A sheet of nu by nv faces through point(i, j); uv(i, j) in metres, or taken from the sheet's own lengths."""
        pts = [[np.asarray(point(i, j), float) for j in range(nv + 1)] for i in range(nu + 1)]
        idx = [[self.mesh.vertex(tuple(map(float, p))) for p in col] for col in pts]
        if uv is None:
            us = [0.]
            for i in range(nu):
                us.append(us[-1] + np.linalg.norm(pts[i + 1][nv // 2] - pts[i][nv // 2]))
            vs = [0.]
            for j in range(nv):
                vs.append(vs[-1] + np.linalg.norm(pts[nu // 2][j + 1] - pts[nu // 2][j]))
            uv = lambda i, j: (us[i], vs[j])
        for i in range(nu):
            for j in range(nv):
                corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                if flip:
                    corners.reverse()
                ids = [idx[a][b] for a, b in corners]
                uvs = [self.uv(mat, *uv(a, b)) for a, b in corners]
                o = out
                if callable(out):
                    o = out(sum(pts[a][b] for a, b in corners) / 4)
                self.mesh.indexed(ids, uvs, mat, None if o is None else tuple(o), smooth)

    def box(self, mat, a, b, w, h, up=Y, scale=1.0, ends=True, u0=0.):
        """A timber or bar from a to b, w across and h deep, the picture's grain running along it."""
        a, b = np.asarray(a, float), np.asarray(b, float)
        along = unit(b - a)
        side = unit(np.cross(up, along))
        if not np.linalg.norm(side):
            side = unit(np.cross(X, along))
        top = np.cross(along, side)
        length = np.linalg.norm(b - a)
        c = lambda s, t, e: (a if e == 0 else b) + side * s * w / 2 + top * t * h / 2
        v = 0.
        for (s0, t0, s1, t1, out) in ((-1, -1, 1, -1, -top), (1, -1, 1, 1, side), (1, 1, -1, 1, top), (-1, 1, -1, -1, -side)):
            width = w if t0 == t1 else h
            uvs = [self.uv(mat, u0 * scale, v * scale), self.uv(mat, (u0 + length) * scale, v * scale),
                   self.uv(mat, (u0 + length) * scale, (v + width) * scale), self.uv(mat, u0 * scale, (v + width) * scale)]
            self.face(mat, (c(s0, t0, 0), c(s0, t0, 1), c(s1, t1, 1), c(s1, t1, 0)), uvs, out)
            v += width + .03
        if ends:
            for e, out in ((0, -along), (1, along)):
                uvs = [self.uv(mat, 0, 0), self.uv(mat, w * scale, 0), self.uv(mat, w * scale, h * scale), self.uv(mat, 0, h * scale)]
                self.face(mat, (c(-1, -1, e), c(1, -1, e), c(1, 1, e), c(-1, 1, e)), uvs, out)

    def block(self, mat, lo, hi, scale=1.0, skip=''):
        """An upright box between two corners, the picture laid out in metres on every face. `skip` names faces
        to leave out: x X y Y z Z for the low and high side on each axis."""
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        if 'z' not in skip:
            self.quad(mat, (x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), -Z, scale=scale)
        if 'Z' not in skip:
            self.quad(mat, (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), Z, scale=scale)
        if 'x' not in skip:
            self.quad(mat, (x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), -X, scale=scale)
        if 'X' not in skip:
            self.quad(mat, (x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), X, scale=scale)
        if 'Y' not in skip:
            self.quad(mat, (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1), Y, scale=scale)
        if 'y' not in skip:
            self.quad(mat, (x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0), -Y, scale=scale)

    def tube(self, mat, pts, radii, sides=8, scale=1.0, caps=(False, True), squash=1.0, twist=0., spin=0.):
        """A round limb through the points, smooth, the picture wrapped round it and run along it."""
        pts = [np.asarray(p, float) for p in pts]
        rings, run = [], 0.
        hint = None
        for i, p in enumerate(pts):
            d = unit((pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]))
            if hint is None:
                hint = Y if abs(d[1]) < .9 else X
            u = unit(np.cross(hint, d)); v = np.cross(d, u)
            hint = v
            if i:
                run += np.linalg.norm(p - pts[i - 1])
            ring = []
            for k in range(sides + 1):
                ang = TAU * k / sides + twist * i + spin
                point = p + (u * math.cos(ang) + v * math.sin(ang) * squash) * radii[i]
                ring.append((self.mesh.vertex(tuple(map(float, point))), self.uv(mat, TAU * max(radii) * k / sides * scale, run * scale)))
            rings.append(ring)
        for i in range(len(pts) - 1):
            for k in range(sides):
                a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
                mid = (np.array(self.mesh.verts[a[0]]) + np.array(self.mesh.verts[c[0]])) / 2
                self.mesh.indexed((a[0], b[0], c[0], d[0]), (a[1], b[1], c[1], d[1]), mat, tuple(mid - (pts[i] + pts[i + 1]) / 2), True)
        for end, on in ((0, caps[0]), (-1, caps[1])):
            if on and radii[end] > .004:
                centre = pts[end]
                out = unit(pts[end] - pts[end + 1 if end == 0 else end - 1])
                for k in range(sides):
                    a, b = rings[end][k], rings[end][k + 1]
                    self.face(mat, (centre, self.mesh.verts[a[0]], self.mesh.verts[b[0]]),
                              (self.uv(mat, 0, 0), a[1], b[1]), out)

    def lathe(self, mat, centre, profile, sides=12, axis=Y, scale=1.0, cap_top=True, cap_bottom=False, smooth=True):
        """Turn a profile [(radius, distance along the axis)] round an axis through centre."""
        centre, axis = np.asarray(centre, float), unit(axis)
        u = unit(np.cross(Y if abs(axis[1]) < .9 else X, axis)); v = np.cross(axis, u)
        rings, run = [], 0.
        for i, (r, d) in enumerate(profile):
            if i:
                run += math.hypot(r - profile[i - 1][0], d - profile[i - 1][1])
            rings.append([(self.mesh.vertex(tuple(map(float, centre + axis * d + (u * math.cos(TAU * k / sides) + v * math.sin(TAU * k / sides)) * r))),
                           self.uv(mat, TAU * max(p[0] for p in profile) * k / sides * scale, run * scale)) for k in range(sides + 1)])
        for i in range(len(profile) - 1):
            for k in range(sides):
                a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
                ang = TAU * (k + .5) / sides
                out = u * math.cos(ang) + v * math.sin(ang)
                slope = profile[i + 1][0] - profile[i][0]
                rise = profile[i + 1][1] - profile[i][1]
                if abs(rise) < 1e-6:
                    out = axis * (1 if slope < 0 else -1)
                self.mesh.indexed((a[0], b[0], c[0], d[0]), (a[1], b[1], c[1], d[1]), mat, tuple(out), smooth)
        for end, on, sign in ((0, cap_bottom, -1), (-1, cap_top, 1)):
            r, d = profile[end]
            if on and r > .004:
                c = centre + axis * d
                for k in range(sides):
                    a, b = rings[end][k], rings[end][k + 1]
                    pa, pb = np.array(self.mesh.verts[a[0]]), np.array(self.mesh.verts[b[0]])
                    self.face(mat, (c, pa, pb), [self.uv(mat, .5 * scale, .5 * scale),
                              self.uv(mat, (.5 + (pa - c) @ u) * scale, (.5 + (pa - c) @ v) * scale),
                              self.uv(mat, (.5 + (pb - c) @ u) * scale, (.5 + (pb - c) @ v) * scale)], axis * sign)

    def lump(self, mat, centre, radii, seed=1, rough=.22, rings=5, sides=9, flat=0., scale=1.0, squash_top=1.0, freq=1.3, smooth=True, cap=None):
        """A rounded lump (a boulder, a mound, a sack), its skin pushed in and out by noise; `flat` cuts its foot off.
        cap=(material, rows) lays a second skin over that many of its top rows: moss on a rock."""
        centre, radii = np.asarray(centre, float), np.asarray(radii, float)

        def point(i, j):
            lat = -math.pi / 2 + math.pi * j / rings
            lon = TAU * (i % sides) / sides
            d = np.array((math.cos(lat) * math.cos(lon), math.sin(lat), math.cos(lat) * math.sin(lon)))
            if j in (0, rings):
                d = np.array((0., -1. if j == 0 else 1., 0.))
            k = 1 + rough * vnoise(d * freq + centre * .37, 1.0, seed) + rough * .5 * vnoise(d * freq * 2.3, 1.0, seed + 3)
            p = d * radii * k
            if p[1] > 0:
                p[1] *= squash_top
            p[1] = max(p[1], -radii[1] * (1 - flat))
            return centre + p
        size = float(max(radii))
        self.grid(mat, point, sides, rings, uv=lambda i, j: (i / sides * size * 3 * scale, j / rings * size * 2 * scale),
                  out=lambda mid: mid - centre, smooth=smooth)
        if cap:
            first = rings - cap[1]
            over = lambda i, j: centre + (point(i, first + j) - centre) * (1.045 if j else 1.0) + Y * (.02 if j else -.02)
            self.grid(cap[0], over, sides, cap[1], uv=lambda i, j: (i / sides * size * 3, j / rings * size * 2), out=lambda mid: mid - centre)

    def card(self, mat, a, b, c, d, rect=(0, 0, 1, 1)):
        """A cut-out card a, b, c, d (a and b along its foot), seen from both sides."""
        u0, v0, u1, v1 = rect
        self.face(mat, (a, b, c, d), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)])

    def finish(self, parent, location=(0, 0, 0)):
        """Make the object. A part given a location was built round its own pivot and is moved there."""
        used = []
        for f in self.mesh.faces:
            if f[2] not in used:
                used.append(f[2])
        obj = self.mesh.finish(self.name, {k: MATERIALS[k] for k in used})
        obj.data.validate()
        obj.parent = parent
        obj.location = (location[0], -location[2], location[1])
        return obj

def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = (location[0], -location[2], location[1])
    return obj

# ------------------------------------------------------------------ surfaces
# Everything here is wet. Wet stone, slate and timber are darker than dry and a little shiny, so the pictures are
# taken down and the roughness is low; the game's grey sky does the rest.

def wet(a, k=.72, sat=1.12):
    grey = luminance(a)[..., None]
    return np.clip((grey + (a - grey) * sat) * k, 0, 1)

def moss_over(a, amount, rng, joints=True, low=None):
    """Grow moss and green algae on a picture: in its dark joints first, then in patches."""
    h, w = a.shape[:2]
    lum = luminance(a)
    n = spectral((h, w), 1.5, rng)
    fine = spectral((h, w), .6, rng)
    patch = smooth(1.0 - amount * 1.7, 1.6 - amount * 1.2, n + .25 * fine)
    if joints:
        patch = np.maximum(patch, smooth(.34, .16, lum) * smooth(-.9 + (1 - amount), .4 + (1 - amount), n) * .9)
    if low is not None:
        patch = np.maximum(patch, low * (.55 + .45 * smooth(-1, 1, fine)))
    green = mixc((.085, .15, .045), (.21, .30, .075), smooth(-1, 1.2, fine))
    green = green * (.75 + .5 * lum[..., None] / (lum.mean() + 1e-6) * .5)
    return a * (1 - patch[..., None]) + green * patch[..., None]

def slate_picture(S, rng, rows=8):
    """Old slates in courses of uneven widths, each its own grey, with moss creeping up from every lower edge."""
    img = np.zeros((S, S, 3), np.float32)
    shade = np.zeros((S, S), np.float32)
    joint = np.zeros((S, S), np.float32)
    row_h = S // rows
    xs = np.arange(S)
    greys = np.array([(.235, .255, .285), (.27, .25, .285), (.225, .265, .255), (.30, .255, .225), (.20, .215, .24), (.255, .27, .29)])
    for r in range(rows):
        edges = [0]
        while edges[-1] < S - S * .07:
            edges.append(edges[-1] + int(rng.uniform(.085, .17) * S))
        edges[-1] = S
        edges = np.array(edges)
        shift = int(rng.uniform(0, S))
        col = (xs + shift) % S
        which = np.searchsorted(edges, col, side='right') - 1
        tone = greys[rng.integers(0, len(greys), len(edges))] * rng.uniform(.82, 1.14, (len(edges), 1))
        slip = rng.integers(-3, 4, len(edges)) * (rng.random(len(edges)) < .3)
        y0 = r * row_h
        band = tone[which]
        img[y0:y0 + row_h] = band[None]
        within = (col - edges[which]) / np.maximum(1, (edges[which + 1] - edges[which]))
        gap = np.minimum(within, 1 - within) * (edges[which + 1] - edges[which])
        joint[y0:y0 + row_h] = np.maximum(joint[y0:y0 + row_h], smooth(2.2, .4, gap)[None])
        t = (np.arange(row_h) / row_h)[:, None]
        # The course above overhangs this one and shades its top; the lower edge is thick and catches the light.
        shade[y0:y0 + row_h] = -.42 * smooth(.20, 0, t + slip[which][None] * .01) + .10 * smooth(.86, .97, t) - .25 * smooth(.975, 1, t)
        joint[y0:y0 + row_h] = np.maximum(joint[y0:y0 + row_h], smooth(.90, 1.0, t) * np.ones((1, S)))
    grain = spectral(S, .9, rng)
    damp = spectral(S, 1.9, rng)
    img *= (1 + shade + .05 * grain + .10 * damp)[..., None]
    img *= (1 - .55 * joint * (.5 + .5 * smooth(-1, 1, grain)))[..., None]
    lichen = smooth(1.5, 2.1, spectral(S, .45, rng) + .5 * damp)
    img = mixc(img, (.42, .43, .33), lichen * .7)
    low = np.clip(joint * 1.2, 0, 1) * smooth(-.6, .9, damp)
    img = moss_over(img, .30, rng, joints=False, low=low)
    streak = np.clip(spectral(S, 1.2, rng, wide=9), 0, 2)
    img *= (1 - .10 * streak)[..., None]
    return np.clip(img, .015, .9)

def moss_picture(S, rng):
    n1, n2, n3 = spectral(S, 1.6, rng), spectral(S, .9, rng), spectral(S, .3, rng)
    img = mixc((.075, .13, .04), (.20, .30, .07), smooth(-1.2, 1.3, n1 * .6 + n2 * .6))
    img = mixc(img, (.32, .38, .10), smooth(.9, 2.0, n2 + n3 * .6) * .7)
    img *= (.82 + .18 * smooth(-1, 1, n3))[..., None]
    return np.clip(img, .01, .9)

def grass_picture(S, rng):
    """Rank wet grass seen from above and aside: fine blades all leaning one way, with old straw in it."""
    n1 = spectral(S, 1.7, rng)
    blades = spectral(S, .75, rng, wide=7)
    fine = spectral(S, .2, rng, wide=4)
    img = mixc((.065, .135, .04), (.16, .27, .065), smooth(-1.3, 1.3, blades * .8 + n1 * .5))
    img = mixc(img, (.30, .36, .12), smooth(.8, 2.2, blades + fine * .6) * .55)
    img = mixc(img, (.33, .30, .15), smooth(1.4, 2.4, spectral(S, .6, rng, wide=6) + n1 * .4) * .6)
    img *= (.80 + .20 * smooth(-1, 1, fine))[..., None]
    img *= (.88 + .12 * smooth(-1.5, 1, n1))[..., None]
    return np.clip(img, .01, .9)

def strokes(S, segments, soft=1.0):
    """Coverage of a picture S = (h, w) by thick line strokes [(x0, y0, x1, y1, width0, width1)], in pixels."""
    h, w = S
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cover = np.zeros((h, w), np.float32)
    seg = np.asarray(segments, np.float32)
    for s in range(0, len(seg), 48):
        part = seg[s:s + 48]
        x0, y0, x1, y1, w0, w1 = (part[:, k][:, None, None] for k in range(6))
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy + 1e-6), 0, 1)
        d = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy))
        width = w0 + (w1 - w0) * t
        cover = np.maximum(cover, np.clip((width / 2 - d) / soft + .5, 0, 1).max(axis=0))
    return cover

def blur(a, radius):
    """A soft blur that wraps at the edges, by way of the picture's spectrum."""
    h, w = a.shape[:2]
    fy, fx = np.fft.fftfreq(h)[:, None], np.fft.fftfreq(w)[None, :]
    kernel = np.exp(-2 * (math.pi * radius) ** 2 * (fx * fx + fy * fy))
    if a.ndim == 3:
        return np.stack([np.fft.ifft2(np.fft.fft2(a[..., c]) * kernel).real for c in range(a.shape[2])], axis=2)
    return np.fft.ifft2(np.fft.fft2(a) * kernel).real

def thicken(rgba, radius, level):
    """Close up a cut-out wherever it is dense. A cut-out of fine strokes averages to nothing once it is small on
    the screen and the whole card vanishes (the first conifers were bare poles at 40 m); a mass with a ragged
    edge keeps its shape. Returns the picture with its colour carried into the filled places."""
    alpha = rgba[..., 3]
    pad = 12
    wide = np.pad(alpha, pad)
    soft = blur(wide, radius)[pad:-pad, pad:-pad]
    carried = blur(np.pad(rgba[..., :3] * alpha[..., None], ((pad, pad), (pad, pad), (0, 0))), radius)[pad:-pad, pad:-pad] / np.maximum(soft, 1e-4)[..., None]
    mass = smooth(level, level + .10, soft)
    out = rgba.copy()
    out[..., :3] = np.where((alpha > .5)[..., None], rgba[..., :3], carried)
    out[..., 3] = np.maximum(alpha, mass)
    return out

def bough_picture(S, rng):
    """One spruce bough seen from the side: the branch along the top, its twigs hanging down like a wet curtain,
    every twig set with short needles. A cut-out; the root is on the left and the tip on the right."""
    branch, twigs, needles = [], [], []
    y_at = lambda x: S * (.10 + .10 * (x / S) ** 1.6)
    step = S / 26
    px = 0.
    while px < S * .97:
        nx = px + step
        branch.append((px, y_at(px), nx, y_at(nx), 5.5 * (1 - px / S) + 1.5, 5.5 * (1 - nx / S) + 1.5))
        px = nx
    for i in range(52):
        x = S * (.02 + .95 * (i + rng.uniform(-.3, .3)) / 52)
        t = x / S
        length = S * (.16 + .50 * math.sin(math.pi * min(1, t * 1.15) ** .8) ** .9) * rng.uniform(.55, 1.05)
        lean = rng.uniform(-.10, .22) + .25 * t
        y = y_at(x)
        n = 5
        last = (x, y)
        for k in range(1, n + 1):
            f = k / n
            cur = (x + lean * length * f + rng.uniform(-2, 2), y + length * f)
            twigs.append((*last, *cur, 4.2 * (1 - f) + 2.2, 4.2 * (1 - f) + 1.8))
            for _ in range(11):
                g = rng.uniform(0, 1)
                bx, by = last[0] + (cur[0] - last[0]) * g, last[1] + (cur[1] - last[1]) * g
                side = rng.choice((-1, 1))
                reach = S * rng.uniform(.028, .055)
                needles.append((bx, by, bx + side * reach, by + reach * rng.uniform(.4, 1.0), 4.6, 2.2))
            last = cur
    for seg in branch[::2]:
        for _ in range(3):
            side = rng.choice((-1, 1))
            needles.append((seg[0], seg[1], seg[0] + S * .03, seg[1] + side * S * .028, 1.6, .9))
    wood = strokes((S, S), branch + twigs)
    green = strokes((S, S), needles)
    alpha = np.clip(np.maximum(wood, green), 0, 1)
    n = spectral(S, 1.2, rng)
    f = spectral(S, .3, rng)
    colour = mixc((.035, .085, .05), (.085, .17, .075), smooth(-1.2, 1.4, n * .7 + f * .5))
    tips = smooth(.55, 1.0, (np.mgrid[0:S, 0:S][0] / S)) * .35
    colour = mixc(colour, (.13, .22, .09), tips * smooth(-1, 1, f))
    colour = mixc(colour, (.10, .075, .05), np.clip(wood - green * .6, 0, 1) * .7)
    solid = thicken(np.concatenate([colour, alpha[..., None]], axis=2), 2.1, .50)
    # Inside the mass the needles are drawn as light and dark, since there is no longer daylight between them.
    inner = np.clip(solid[..., 3] - alpha, 0, 1)
    solid[..., :3] = mixc(colour, (.03, .065, .04), inner * (.55 + .45 * smooth(-1, 1, f)))
    solid[..., :3] *= (.82 + .30 * smooth(-.8, 1.4, spectral(S, .5, rng, wide=3.3)))[..., None]
    return solid

def blades_picture(W, H, rng):
    """A tuft of tall wet grass and rush, a cut-out standing on the picture's lower edge."""
    segs, tone = [], []
    for i in range(46):
        x = W * rng.uniform(.10, .90)
        height = H * rng.uniform(.45, .97) * (1 - .45 * abs(x / W - .5) * 2 * rng.uniform(.3, 1))
        lean = (x / W - .5) * 1.1 + rng.uniform(-.35, .35)
        last = (x, H - 1.)
        n = 5
        for k in range(1, n + 1):
            f = k / n
            cur = (x + lean * height * f * f, H - 1 - height * f)
            segs.append((*last, *cur, 5.2 * (1 - f * .85), 5.2 * (1 - (f + 1 / n) * .85) + .4))
            last = cur
    alpha = strokes((H, W), segs, soft=.8)
    n = spectral((H, W), .9, rng, wide=6)
    f = spectral((H, W), .3, rng)
    colour = mixc((.07, .15, .045), (.19, .31, .075), smooth(-1.2, 1.2, n))
    colour = mixc(colour, (.36, .34, .16), smooth(1.0, 2.0, n * .6 + f * .8) * .7)
    rise = (1 - np.mgrid[0:H, 0:W][0] / H)
    colour *= (.55 + .55 * rise)[..., None]
    return thicken(np.concatenate([colour, alpha[..., None]], axis=2), 2.4, .36)

def bark_picture(S, rng):
    """Furrowed wet bark running up the picture, green with algae on one side."""
    ridge = spectral(S, 1.1, rng, wide=11)
    plates = spectral(S, .9, rng, wide=3.3)
    fine = spectral(S, .3, rng)
    furrow = smooth(.2, -1.1, ridge + .35 * plates)
    img = mixc((.17, .135, .105), (.085, .068, .055), furrow)
    img = mixc(img, (.23, .20, .17), smooth(.9, 1.9, ridge) * .5)
    img *= (.85 + .15 * smooth(-1, 1, fine))[..., None]
    side = smooth(.25, .75, np.abs(np.mgrid[0:S, 0:S][1] / S - .5) * 2)
    img = mixc(img, (.10, .18, .06), (1 - side) * smooth(-.4, 1.0, plates + fine * .4) * .55)
    return np.clip(img, .01, .9)

def wool_picture(S, rng):
    """A hill sheep's fleece in the rain: grey-cream locks, parted and hanging, dirty underneath."""
    locks = spectral(S, 1.3, rng, wide=2.9)
    lumps = spectral(S, 1.8, rng)
    fine = spectral(S, .4, rng)
    img = mixc((.40, .38, .31), (.64, .61, .52), smooth(-1.3, 1.2, locks * .7 + lumps * .5))
    img = mixc(img, (.24, .22, .18), smooth(.9, 1.9, -locks - lumps * .3) * .5)
    img *= (.88 + .12 * smooth(-1, 1, fine))[..., None]
    return np.clip(img, .01, .92)

def water_picture(S, rng):
    """Dark peaty water with pale threads of foam drawn out along the flow."""
    n = spectral(S, 1.5, rng, wide=5)
    f = spectral(S, .7, rng, wide=8)
    img = mixc((.035, .05, .045), (.075, .10, .085), smooth(-1, 1, n))
    img = mixc(img, (.55, .58, .55), smooth(1.25, 2.2, f + n * .5) * .75)
    return np.clip(img, .01, .9)

def cartwheel_picture(S):
    """The handcart's spoked wheel from its photograph, as a cut-out. Its lower half stands clear against the
    studio; the upper half has the cart behind it, so the lower half is used twice."""
    a = read_picture(TOWN_TEX / 'handcart-side.jpg')[..., :3]
    cx, cy, r = 352, 408, 141
    half = a[cy:cy + r + 2, cx - r - 2:cx + r + 2]
    bg = np.array((204, 204, 204)) / 255
    diff = np.abs(half - bg).max(axis=2)
    grey = half.max(axis=2) - half.min(axis=2)
    alpha = ((diff > .11) | (grey > .07)).astype(np.float32)
    yy, xx = np.mgrid[0:half.shape[0], 0:half.shape[1]]
    rad = np.hypot(xx - (r + 2), yy)
    alpha[rad > r + .5] = 0
    alpha[rad < r * .16] = 1
    known = alpha > .5
    colour = half.copy()
    for _ in range(10):
        total = np.zeros_like(colour); count = np.zeros(known.shape, np.float32)
        for ax, st in ((0, 1), (0, -1), (1, 1), (1, -1)):
            total += np.roll(colour * known[..., None], st, ax); count += np.roll(known, st, ax)
        grow = ~known & (count > 0)
        colour[grow] = total[grow] / count[grow][..., None]
        known |= grow
    colour[~known] = colour[known].mean(axis=0)
    full = np.concatenate([np.concatenate([colour[::-1], colour[1:]], axis=0),
                           np.concatenate([alpha[::-1], alpha[1:]], axis=0)[..., None]], axis=2)
    out = resize(full, S, S)
    out[..., :3] = wet(out[..., :3], .62, 1.0)
    # Mud thrown up the rim and caked round the felloes.
    yy, xx = np.mgrid[0:S, 0:S]
    rim = smooth(.60, .92, np.hypot(xx - S / 2, yy - S / 2) / (S / 2))
    out[..., :3] = mixc(out[..., :3], (.115, .085, .055), rim * .7)
    out[..., 3] = (out[..., 3] > .5).astype(np.float32)
    return out

def borer_pictures():
    """PRUDENCE wears the town borer's own photographs with the yellow paint taken to an old engineer's green,
    the rust left as it is, and the gripper feet painted out (she stands on cradles)."""
    def green(a, rng):
        h, s, v = hsv(a)
        paint = smooth(.070, .086, h) * smooth(.19, .15, h) * smooth(.40, .55, s) * smooth(.36, .50, v)
        dyed = from_hsv(np.full_like(h, .41), np.clip(s * .55, 0, 1), v * .36)
        a = a * (1 - paint[..., None]) + dyed * paint[..., None]
        return wet(a, .80, 1.0)
    rng = np.random.default_rng(11)
    side = read_picture(TOWN_TEX / 'borer-round5-tube-side.png')[..., :3]
    for x0, x1 in ((590, 722), (922, 1056), (1300, 1428), (1700, 1838)):
        width = x1 - x0
        side[455:724, x0:x1] = side[455:724, x0 - width - 14:x0 - 14]
    front = read_picture(TOWN_TEX / 'borer-round5-tube-front.png')[..., :3]
    return green(side, rng), green(front, rng)

def build_surfaces():
    rng = np.random.default_rng(7)
    stone = resize(read_picture(SCAB_TEX / 'dam-gatehouse-stone.jpg')[..., :3], 512, 512)
    stone = wet(stone, .82, 1.0) * np.array((1.0, .99, .95))
    material('stone', stone, (1.65, 1.65), rough=.62, quality=58)
    yy = np.mgrid[0:384, 0:384][0] / 384
    small = resize(stone, 384, 384)
    material('stone-foot', moss_over(small * (.72 + .2 * (1 - yy))[..., None], .34, rng, low=smooth(.45, 1.0, yy) * .8), (1.65, 1.65), rough=.5, quality=56)
    material('stone-moss', moss_over(small * .88, .62, rng), (1.65, 1.65), rough=.7, quality=56)
    material('slate', slate_picture(512, rng), (2.4, 2.4), rough=.5, quality=60)
    material('moss', moss_picture(256, rng), (.9, .9), rough=.95)
    material('grass', grass_picture(256, rng), (1.6, 1.6), rough=.8)
    material('bark', bark_picture(256, rng), (.9, .9), rough=.8)
    material('wool', wool_picture(256, rng), (.55, .55), rough=.95)
    material('water', water_picture(256, rng), (1.2, 3.0), rough=.55, quality=58)
    material('bough', bough_picture(256, rng), cutout=True, rough=.6)
    material('bough-dark', like='bough', tint=(.55, .62, .58), cutout=True, rough=.6)
    material('blades', blades_picture(256, 128, rng), cutout=True, rough=.6)
    timber = resize(read_picture(TOWN_TEX / 'timber.jpg')[..., :3], 384, 384)
    material('timber', wet(timber, .80, 1.05), (1.0, 1.0), rough=.55)
    t2 = wet(timber, .70, 1.0)
    material('timber-green', moss_over(t2, .50, rng), (1.0, 1.0), rough=.5)
    planks = resize(read_picture(TOWN_TEX / 'town-water-timber.jpg')[..., :3], 384, 384)
    material('planks', wet(planks, .46, .8) * np.array((1.0, .96, .9)), (1.25, 1.25), rough=.6)
    material('wheel-oak', moss_over(wet(resize(planks, 256, 256), .66, .85), .30, rng), (1.25, 1.25), rough=.55)
    mud = np.array((.115, .085, .055))
    low = smooth(.45, .95, np.mgrid[0:256, 0:256][0] / 256 + .12 * spectral(256, 1.2, rng))
    material('planks-mud', mixc(wet(resize(planks, 256, 256), .46, .8), mud * (.8 + .3 * smooth(-1, 1, spectral(256, .6, rng)))[..., None], low * .92), (1.25, 1.0), rough=.5)
    canvas = resize(read_picture(TOWN_TEX / 'patched-canvas.jpg')[..., :3], 384, 384)
    material('tarpaulin', wet(canvas, .70, 1.0), (1.6, 1.6), rough=.42)
    sack = resize(read_picture(TOWN_TEX / 'canvas-tan.jpg')[..., :3], 192, 192)
    material('sacking', wet(sack, .46, .45) * np.array((1.0, .99, .93)), (.8, .8), rough=.8)
    earth = resize(read_picture(TOWN_TEX / 'wet-brown-earth.jpg')[..., :3], 256, 256)
    material('mud', wet(earth, .62, .8), (1.5, 1.5), rough=.62)
    steel = resize(read_picture(TOWN_TEX / 'rusted-steel.jpg')[..., :3], 320, 320)
    material('iron', wet(steel, .62, 1.15), (1.4, 1.4), rough=.68, metal=.1)
    plate = resize(read_picture(TOWN_TEX / 'plate-steel-mill.jpg')[..., :3], 320, 320)
    yy = np.mgrid[0:320, 0:320][0] / 320
    run = np.clip(spectral(320, 1.1, rng, wide=14), 0, 2.2)
    old = wet(steel, .50, 1.2)
    old = mixc(old, (.30, .12, .04), np.clip(run * .45, 0, .8))
    old = mixc(old, (.52, .50, .44), smooth(1.5, 2.3, spectral(320, 1.0, rng, wide=18)) * .55)
    material('old-iron', old, (1.4, 1.4), rough=.7, metal=.1)
    material('new-steel', wet(plate, .78, 1.0) * np.array((.92, .98, 1.04)), (1.6, 1.6), rough=.4, metal=.25)
    rock_photo = read_picture(TOWN_TEX / 'peace-rock-untouched.jpg')[..., :3]
    rock = mirror_tile(resize(rock_photo[150:430, 250:770], 256, 138))
    material('rock', moss_over(wet(rock, .56, .9), .10, rng), (3.4, 1.9), rough=.45)
    material('spoil', np.clip((wet(rock, .46, .4) - .12) * 1.5 + .02, .02, .9) * np.array((.58, .62, .70)), (1.7, 1.2), rough=.5)
    tin = resize(read_picture(TOWN_TEX / 'rusted-corrugated-tin.jpg')[..., :3], 256, 256)
    material('tin', wet(tin, .72, 1.0), (1.8, 1.8), rough=.5, metal=.2)
    logs = resize(read_picture(TOWN_TEX / 'timber-weathered-logs.jpg')[..., :3], 256, 256)
    material('logs', wet(logs, .60, .9), (1.1, 1.1), rough=.7)
    material('cartwheel', cartwheel_picture(256), cutout=True, rough=.6)
    side, front = borer_pictures()
    material('prudence-side', resize(side, 1086, 362), rough=.5, metal=.2, quality=64)
    material('prudence-face', resize(front, 512, 512), rough=.55, metal=.2, quality=62)
    material('glass', None, colour=(.02, .025, .03), rough=.08)
    material('dark', None, colour=(.012, .012, .012), rough=.9)
    material('paint-white', None, colour=(.62, .61, .56), rough=.6)
    material('tin-bright', None, colour=(.36, .37, .37), rough=.38, metal=.3)
    material('brass', None, colour=(.33, .24, .08), rough=.4, metal=.3)
    material('apple', None, colour=(.38, .07, .035), rough=.35)
    lamp = material('lamp', None, colour=(.20, .18, .13), rough=.3)
    lamp.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0

# ------------------------------------------------------------------ buildings
# A Highwater building is rubble stone that leans in as it rises and has settled out of true, under a slate roof
# whose ridge has sagged. Walls are sheets of faces with real openings cut through them; nothing is a plain box.

def settle(seed, lean=.007, wobble=.05):
    """How a building's walls have moved: each point leans in towards the middle with height and wanders a little."""
    def warp(p):
        x, y, z = (float(c) for c in p)
        k = 1 - lean * y
        return np.array((x * k + wobble * vnoise((x, y, z), .33, seed), y + .02 * vnoise((x, z, 0), .4, seed + 1) * min(1, y),
                         z * k + wobble * vnoise((z, y, x), .33, seed + 2)))
    return warp

def wall(part, start, along, out, length, eaves, warp, openings=(), top=None, mat='stone', foot='stone-foot',
         foot_h=.75, upper=None, u0=0., reveal=.26, lintel=True):
    """One wall from `start`, `length` long, up to `eaves`, or to top(u) where that is higher (a gable).
    openings: (u0, u1, y0, y1, kind) with kind door, window, hatch or open. upper: (height, material) for boarding."""
    start, along, out = np.asarray(start, float), np.asarray(along, float), np.asarray(out, float)
    us = {0., length}
    ys = {0., foot_h, eaves}
    if upper:
        ys.add(upper[0])
    for o in openings:
        us.update((o[0], o[1])); ys.update((o[2], o[3]))
    if top:
        us.add(length / 2)
    def fill(values, most):
        values = sorted(values)
        out_values = [values[0]]
        for v in values[1:]:
            n = max(1, math.ceil((v - out_values[-1]) / most))
            first = out_values[-1]
            out_values += [first + (v - first) * (k + 1) / n for k in range(n)]
        return out_values
    us, ys = fill(us, 1.7), fill([y for y in ys if y <= eaves + 1e-6], 1.5)
    at = lambda u, y, depth=0.: warp(start + along * u + Y * y - out * depth)
    ids = {}
    def vid(i, j):
        if (i, j) not in ids:
            ids[(i, j)] = part.mesh.vertex(tuple(map(float, at(us[i], ys[j]))))
        return ids[(i, j)]
    def inside(u, y):
        return any(o[0] - 1e-6 <= u <= o[1] + 1e-6 and o[2] - 1e-6 <= y <= o[3] + 1e-6 for o in openings)
    for i in range(len(us) - 1):
        for j in range(len(ys) - 1):
            if inside((us[i] + us[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2):
                continue
            m = foot if ys[j + 1] <= foot_h + 1e-6 else mat
            turn = False
            if upper and ys[j] >= upper[0] - 1e-6:
                m, turn = upper[1], True
            corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            uvs = [part.uv(m, ys[b], u0 + us[a]) if turn else part.uv(m, u0 + us[a], ys[b]) for a, b in corners]
            part.mesh.indexed([vid(a, b) for a, b in corners], uvs, m, tuple(out), True)
        if top:
            ta, tb = max(eaves, top(us[i])), max(eaves, top(us[i + 1]))
            if ta > eaves + 1e-6 or tb > eaves + 1e-6:
                m, turn = (upper[1], True) if upper else (mat, False)
                j = len(ys) - 1
                pts = [at(us[i], eaves), at(us[i + 1], eaves), at(us[i + 1], tb), at(us[i], ta)]
                raw = [(us[i], eaves), (us[i + 1], eaves), (us[i + 1], tb), (us[i], ta)]
                uvs = [part.uv(m, y, u0 + u) if turn else part.uv(m, u0 + u, y) for u, y in raw]
                if tb <= eaves + 1e-6:
                    pts, uvs = pts[:2] + pts[3:], uvs[:2] + uvs[3:]
                elif ta <= eaves + 1e-6:
                    pts, uvs = pts[:3], uvs[:3]
                part.face(m, pts, uvs, out, True)
    for (a, b, y0, y1, kind) in openings:
        depth = {'door': reveal, 'window': reveal, 'hatch': .10, 'open': .9}[kind]
        proud = y0 >= eaves - 1e-6      # a gable is one sheet, so a shutter or window up there is hung on its face
        if proud:
            depth = -.05
        rm = foot if y1 <= foot_h else mat
        if upper and y0 >= upper[0] - 1e-6:
            rm = upper[1]
        # The four sides of the hole through the wall.
        for (p, q, o2) in (((a, y0), (a, y1), along), ((b, y1), (b, y0), -along), ((a, y1), (b, y1), -Y), ((b, y0), (a, y0), Y)):
            if proud or (kind == 'open' and o2 is Y):
                continue
            part.quad(rm, at(p[0], p[1]), at(p[0], p[1], depth), at(q[0], q[1], depth), at(q[0], q[1]), o2)
        if kind in ('door', 'hatch'):
            part.quad('planks', at(a, y0, depth), at(b, y0, depth), at(b, y1, depth), at(a, y1, depth), out, turn=True, u0=a)
            for y in ((y0 + .35), (y1 - .35)):
                part.box('iron', at(a + .04, y, depth - .03), at(b - .04, y, depth - .03), .09, .025, up=Y, ends=False)
        elif kind == 'window':
            part.quad('glass', at(a, y0, depth), at(b, y0, depth), at(b, y1, depth), at(a, y1, depth), out)
            d = depth - .035
            for (p, q) in (((a, y0), (b, y0)), ((a, y1), (b, y1)), ((a, y0), (a, y1)), ((b, y0), (b, y1)),
                           (((a + b) / 2, y0), ((a + b) / 2, y1)), ((a, (y0 + y1) / 2), (b, (y0 + y1) / 2))):
                part.box('timber', at(p[0], p[1], d), at(q[0], q[1], d), .075, .06, up=out, ends=False)
            part.box('stone-moss', at(a - .12, y0 - .06, -.07), at(b + .12, y0 - .06, -.07), .34, .12, up=Y)
        elif kind == 'open':
            part.quad('dark', at(a, y0, depth), at(b, y0, depth), at(b, y1, depth), at(a, y1, depth), out)
        if lintel and kind != 'hatch':
            part.box('timber', at(a - .28, y1 + .11, -.035), at(b + .28, y1 + .11, -.035), .30, .24, up=Y)
        elif kind == 'hatch':
            part.box('timber', at(a - .2, y1 + .08, -.03), at(b + .2, y1 + .08, -.03), .22, .16, up=Y)

def gable_roof(part, hx, hz, eaves, ridge, seed, mat='slate', over_e=.30, over_g=.16, sag=.16):
    """A slate roof with its ridge along X. Returns surface(x, t, side): a point on a slope, t from the ridge (0) to
    the eaves (1), side -1 for the front (-Z)."""
    x0, x1 = -hx - over_g, hx + over_g
    drop = (ridge - eaves) / hz
    far = hz + over_e
    slope = math.hypot(far, drop * far)

    def surface(x, t, side, lift=0.):
        z = t * far
        s = np.clip((x + hx) / (2 * hx), 0, 1)
        dip = sag * math.sin(math.pi * s) * (1 - .75 * min(1, t * 1.2))
        wave = .035 * vnoise((x, z * side, 0), .8, seed) + .02 * vnoise((x, z * side, 0), 2.1, seed + 5)
        return np.array((x, ridge - drop * z - dip + wave + lift, z * side))

    nu = max(4, round((x1 - x0) / 1.25))
    ts = [0, .3, .62, .9, 1.]
    for side in (-1, 1):
        point = lambda i, j: surface(x0 + (x1 - x0) * i / nu, ts[j], side)
        part.grid(mat, point, nu, 4, uv=lambda i, j: ((x1 - x0) * i / nu + (3.1 if side > 0 else 0), ts[j] * slope), out=(0, 1, side * .5))
        # The thick lower edge of the slates, the boards under the overhang, and the verges.
        for i in range(nu):
            a, b = surface(x0 + (x1 - x0) * i / nu, 1, side), surface(x0 + (x1 - x0) * (i + 1) / nu, 1, side)
            part.quad('timber', a - Y * .10, b - Y * .10, b, a, (0, 0, side))
            ia, ib = surface(x0 + (x1 - x0) * i / nu, ts[-2], side) - Y * .10, surface(x0 + (x1 - x0) * (i + 1) / nu, ts[-2], side) - Y * .10
            part.quad('timber', ia, ib, b - Y * .10, a - Y * .10, (0, -1, 0))
        for x, o in ((x0, -1), (x1, 1)):
            for j in range(4):
                a, b = surface(x, ts[j], side), surface(x, ts[j + 1], side)
                part.quad('timber', a - Y * .10, b - Y * .10, b, a, (o, 0, 0))
    # Ridge stones, each a little different, following the sag.
    n = max(6, round((x1 - x0) / .62))
    for i in range(n):
        xa, xb = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n - .03
        lift = .05 + .025 * vnoise((xa, 0, 0), 3., seed + 9)
        ra, rb = surface(xa, 0, 1, lift), surface(xb, 0, 1, lift)
        for side in (-1, 1):
            ea, eb = surface(xa, .085, side, .035), surface(xb, .085, side, .035)
            part.quad('stone-moss', ea, eb, rb, ra, (0, 1, side), u0=xa)
    return surface

def roof_patch(part, surface, side, x, t, w, h, mat, lift=.04, turn=False, battens=True):
    """A mend on a roof: a sheet laid over the slates between x and x + w, from t down the slope for h of it."""
    n = 2
    point = lambda i, j: surface(x + w * i / n, t + h * j / n, side, lift)
    part.grid(mat, point, n, n, out=(0, 1, side * .5), flip=side > 0,
              uv=(lambda i, j: (h * 3 * j / n, w * i / n)) if turn else None)
    if battens:
        for tt in (t + h * .08, t + h * .92):
            part.box('timber', surface(x - .05, tt, side, lift + .03), surface(x + w + .05, tt, side, lift + .03), .07, .04, up=Y, ends=False)

def roof_moss(part, surface, side, spots, seed):
    for k, (x, t, size) in enumerate(spots):
        p = surface(x, t, side, .0)
        part.lump('moss', p, (size, size * .32, size * .7), seed + k, rough=.35, rings=3, sides=6, flat=.45)

def chimney(part, x, z, base, top, warp, w=.85, d=.7, pot=True):
    lo, hi = (x - w / 2, base, z - d / 2), (x + w / 2, top, z + d / 2)
    for (a, b, out) in (((lo[0], lo[2]), (hi[0], lo[2]), -Z), ((hi[0], lo[2]), (hi[0], hi[2]), X), ((hi[0], hi[2]), (lo[0], hi[2]), Z), ((lo[0], hi[2]), (lo[0], lo[2]), -X)):
        k = .93
        mid = np.array((x, 0, z))
        p = [np.array((a[0], base, a[1])), np.array((b[0], base, b[1])), np.array((b[0], top, b[1])), np.array((a[0], top, a[1]))]
        for q in p[2:]:
            q[[0, 2]] = mid[[0, 2]] + (q[[0, 2]] - mid[[0, 2]]) * k
        part.quad('stone-moss', warp(p[0]), warp(p[1]), warp(p[2]), warp(p[3]), out)
    part.block('stone-moss', warp((x - w * .56, top, z - d * .56)), warp((x + w * .56, top + .11, z + d * .56)) + (0, 0, 0))
    if pot:
        part.lathe('tin', warp((x, top + .11, z)), [(.17, 0), (.15, .36), (.19, .40), (.13, .42)], sides=8, scale=1.)

def lean_to_roof(part, x0, x1, z0, z1, y0, y1, seed, mat='slate', swap=False):
    """A single slope from (z0, y0) down to (z1, y1), between x0 and x1. `swap` turns it to slope along X."""
    turn = (lambda p: np.array((p[2], p[1], p[0]))) if swap else (lambda p: p)

    def surface(x, t, side=1, lift=0.):
        z = z0 + (z1 - z0) * t
        return turn(np.array((x, y0 + (y1 - y0) * t + .03 * vnoise((x, z, 0), .9, seed) - .07 * math.sin(math.pi * (x - x0) / (x1 - x0)) * t + lift, z)))
    nu = max(3, round((x1 - x0) / 1.3))
    part.grid(mat, lambda i, j: surface(x0 + (x1 - x0) * i / nu, j / 3), nu, 3, out=(0, 1, 0))
    edge = turn(np.array((0, 0, 1. if z1 > z0 else -1.)))
    for i in range(nu):
        a, b = surface(x0 + (x1 - x0) * i / nu, 1), surface(x0 + (x1 - x0) * (i + 1) / nu, 1)
        part.quad('timber', a - Y * .09, b - Y * .09, b, a, edge)
    for x, o in ((x0, -1), (x1, 1)):
        part.quad('timber', surface(x, 0) - Y * .09, surface(x, 1) - Y * .09, surface(x, 1), surface(x, 0), turn(np.array((o, 0., 0.))))
    return surface

def shell(part, hx, hz, eaves, ridge, seed, fronts=(), backs=(), lefts=(), rights=(), upper=None, north='stone-moss'):
    """Four walls and their gables. Openings are measured from each wall's left end as you face it."""
    warp = settle(seed)
    top = lambda u: eaves + (ridge - eaves) * (1 - abs(u - hz) / hz) - .12
    wall(part, (-hx, 0, -hz), X, -Z, 2 * hx, eaves, warp, fronts, upper=upper)
    wall(part, (hx, 0, hz), -X, Z, 2 * hx, eaves, warp, backs, mat=north, foot='stone-moss', upper=upper, u0=1.1)
    wall(part, (-hx, 0, hz), -Z, -X, 2 * hz, eaves, warp, lefts, top=top, upper=upper, u0=.6)
    wall(part, (hx, 0, -hz), Z, X, 2 * hz, eaves, warp, rights, top=top, upper=upper, u0=1.7)
    # Corner stones: long and short by turns up each corner, standing a little proud, as rubble walls are tied.
    high = upper[0] if upper else eaves
    for sx in (-1, 1):
        for sz in (-1, 1):
            y, k = 0., 0
            while y < high - .2:
                h = min(.36 + .12 * (vnoise((sx, y, sz), 1.9, seed) * .5 + .5), high - y)
                lx, lz = (.66, .32) if (k + (sx > 0) + (sz > 0)) % 2 else (.32, .66)
                x0, x1 = sorted((sx * (hx + .045), sx * (hx - lx)))
                z0, z1 = sorted((sz * (hz + .045), sz * (hz - lz)))
                a, b = warp((x0, y, z0)), warp((x1, y + h - .02, z1))
                part.block('stone-foot' if y < .5 else ('stone-moss' if sz > 0 else 'stone'), (a[0], y, a[2]), (b[0], y + h - .02, b[2]),
                           skip='y' + ('x' if sx > 0 else 'X') + ('z' if sz > 0 else 'Z'))
                y += h
                k += 1
    return warp

def millstone(part, centre, axis, r=.62, thick=.19):
    part.lathe('stone-moss', centre, [(.10, 0), (r, 0), (r, thick), (.10, thick)], sides=14, axis=axis, cap_top=False, scale=1.)

def water_wheel(part, r=2.2, width=1.3):
    """An overshot wheel of wet oak on the X axis through the origin: two shrouds, a sole, buckets, arms, a shaft."""
    n = 20
    inner = r - .40
    hw = width / 2
    for sx in (-hw, hw):
        ring = lambda rr, k, x=sx: np.array((x, rr * math.cos(TAU * k / n), rr * math.sin(TAU * k / n)))
        for k in range(n):
            a, b, c, d = ring(inner, k), ring(inner, k + 1), ring(r, k + 1), ring(r, k)
            uvs = [part.uv('wheel-oak', .2 * k, 0), part.uv('wheel-oak', .2 * k + .45, 0), part.uv('wheel-oak', .2 * k + .45, .4), part.uv('wheel-oak', .2 * k, .4)]
            part.face('wheel-oak', (a, b, c, d), uvs)
        # Arms: three timbers crossing at the shaft, as old wheels have.
        for k in range(3):
            ang = TAU * k / 6 + .2
            d = np.array((0, math.cos(ang), math.sin(ang)))
            part.box('wheel-oak', np.array((sx * .92, 0, 0)) - d * (inner + .05), np.array((sx * .92, 0, 0)) + d * (inner + .05), .11, .17, up=X, ends=False)
    for k in range(n):
        a0, a1 = TAU * k / n, TAU * (k + 1) / n
        p = lambda rr, ang, x: np.array((x, rr * math.cos(ang), rr * math.sin(ang)))
        # The sole board, then the bucket board that leans back from it to the rim.
        part.face('wheel-oak', (p(inner, a0, -hw), p(inner, a0, hw), p(inner, a1, hw), p(inner, a1, -hw)),
                  [part.uv('wheel-oak', 0, .3 * k), part.uv('wheel-oak', width, .3 * k), part.uv('wheel-oak', width, .3 * k + .55), part.uv('wheel-oak', 0, .3 * k + .55)])
        part.face('wheel-oak', (p(inner, a0, -hw), p(inner, a0, hw), p(r, a0 + TAU / n * .85, hw), p(r, a0 + TAU / n * .85, -hw)),
                  [part.uv('wheel-oak', 0, .21 * k), part.uv('wheel-oak', width, .21 * k), part.uv('wheel-oak', width, .21 * k + .42), part.uv('wheel-oak', 0, .21 * k + .42)])
    part.tube('timber', [(-hw - .75, 0, 0), (-hw - .1, 0, 0), (hw + .1, 0, 0), (hw + .65, 0, 0)], [.21, .25, .25, .21], sides=8, caps=(True, True))
    for x in (-hw - .5, -hw + .12, hw - .12, hw + .45):
        part.lathe('iron', (x - .04, 0, 0), [(.275, 0), (.275, .08)], sides=8, axis=X, cap_top=False)

def trestle(part, x, z, top, spread=.75, mat='timber-green'):
    for s in (-1, 1):
        part.box(mat, (x + s * spread, 0, z), (x + s * .36, top, z), .16, .16, up=Z)
    part.box(mat, (x - .62, top + .08, z), (x + .62, top + .08, z), .18, .16, up=Y)
    part.box(mat, (x - spread * .86, top * .28, z), (x + .42, top * .86, z), .09, .05, up=Z, ends=False)

def log_stack(part, x0, x1, z0, z1, h, seed):
    """Split firewood stacked against a wall: the cut ends face out, the top is uneven."""
    n = max(2, round((x1 - x0) / .6))
    tops = [h * (.82 + .18 * vnoise((x0 + i, 0, z0), 1.3, seed)) for i in range(n + 1)]
    for i in range(n):
        xa, xb = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n
        ta, tb = tops[i], tops[i + 1]
        part.face('logs', ((xb, 0, z0), (xa, 0, z0), (xa, ta, z0), (xb, tb, z0)),
                  [part.uv('logs', xb, 0), part.uv('logs', xa, 0), part.uv('logs', xa, ta), part.uv('logs', xb, tb)], -Z)
        part.face('bark', ((xa, ta, z0), (xa, ta, z1), (xb, tb, z1), (xb, tb, z0)),
                  [part.uv('bark', 0, xa), part.uv('bark', z1 - z0, xa), part.uv('bark', z1 - z0, xb), part.uv('bark', 0, xb)], Y)
    for x, t, o in ((x0, tops[0], -1), (x1, tops[-1], 1)):
        part.quad('bark', (x, 0, z0), (x, 0, z1), (x, t, z1), (x, t, z0), (o, 0, 0), turn=True)

def rain_barrel(part, c, r=.42, h=1.0):
    part.lathe('planks', c, [(r * .84, 0), (r, h * .3), (r, h * .7), (r * .86, h)], sides=10, cap_top=False, scale=1.)
    part.lathe('water', np.asarray(c, float) + Y * (h - .04), [(r * .84, 0), (.01, .001)], sides=10, cap_top=False)
    for y in (h * .16, h * .5, h * .84):
        rr = r * (.93 if y != h * .5 else 1.005)
        part.lathe('iron', np.asarray(c, float) + Y * y, [(rr + .012, 0), (rr + .012, .05)], sides=10, cap_top=False)

def build_mill(parent):
    part = Part('highwater-mill')
    hx, hz, eaves, ridge = 4.6, 3.3, 4.7, 7.75
    fronts = [(2.45, 3.6, 0, 2.15, 'door'), (6.2, 7.15, 1.1, 2.2, 'window'), (1.0, 1.8, 3.05, 3.95, 'window'),
              (4.0, 5.1, 2.9, 4.3, 'hatch'), (6.9, 7.7, 3.05, 3.95, 'window')]
    backs = [(.9, 1.7, 3.1, 3.9, 'window')]
    lefts = [(2.9, 3.7, 4.9, 5.8, 'window')]
    rights = [(2.2, 3.0, 4.95, 5.85, 'hatch')]
    warp = shell(part, hx, hz, eaves, ridge, 3, fronts, backs, lefts, rights)
    # The store behind, under one long slope carried down from the main roof.
    lx0, lx1, lz = -hx, .6, hz + 2.7
    wall(part, (lx1, 0, lz), -X, Z, lx1 - lx0, 2.15, warp, [(1.6, 2.6, 0, 1.85, 'door')], mat='stone-moss', foot='stone-moss', u0=.4)
    wall(part, (lx0, 0, lz), -Z, -X, 2.7, 2.15, warp, [], top=lambda u: 2.15 + u * .62, u0=.9)
    wall(part, (lx1, 0, hz), Z, X, 2.7, 2.15, warp, [], top=lambda u: 2.15 + (2.7 - u) * .62, u0=.2)
    surface = gable_roof(part, hx, hz, eaves, ridge, 21)
    lean = lean_to_roof(part, lx0 - .16, lx1 + .2, hz + .02, lz + .3, eaves - .55, 2.02, 23)
    # Patches on its patches: tin over the slates, sailcloth tied over a corner of the tin, new boards by the ridge.
    roof_patch(part, surface, -1, -3.3, .34, 2.3, .40, 'tin', turn=True)
    roof_patch(part, surface, -1, -1.9, .50, 1.25, .30, 'tarpaulin', lift=.085)
    roof_patch(part, surface, -1, 1.6, .08, 1.5, .22, 'planks', turn=True)
    roof_patch(part, surface, -1, 2.3, .66, 1.7, .26, 'tin', turn=True)
    roof_patch(part, surface, -1, 2.9, .60, .8, .17, 'planks', lift=.09, turn=True, battens=False)
    roof_patch(part, surface, 1, -1.0, .30, 2.6, .36, 'tin', turn=True)
    roof_patch(part, surface, 1, .2, .22, 1.3, .2, 'tarpaulin', lift=.085)
    for x, t in ((-2.6, .5), (-1.7, .82), (-1.3, .5)):
        part.lump('stone-moss', surface(x, t, -1, .12), (.2, .1, .15), 40 + int(x * 7), rings=3, sides=5, flat=.3)
    roof_moss(part, surface, -1, [(-4.2, .9, .5), (-.4, .93, .6), (.9, .78, .4), (3.9, .92, .55), (4.3, .4, .35), (-3.9, .2, .3)], 50)
    roof_moss(part, surface, 1, [(-3.5, .8, .7), (-2.0, .92, .8), (1.5, .85, .8), (3.2, .9, .9), (2.2, .55, .6), (4.1, .35, .5), (-.6, .15, .45)], 60)
    roof_moss(part, lean, 1, [(-3.6, .7, .7), (-1.4, .85, .8), (-.2, .4, .5)], 70)
    chimney(part, -hx + .62, 0, ridge - .75, ridge + 1.15, warp)
    # The hoist beam over the loading door, with its iron hook.
    part.box('timber', warp((-.05, 4.72, -hz + .25)), warp((-.05, 4.60, -hz - 1.15)), .2, .24, up=Y)
    part.box('timber', warp((-.05, 3.95, -hz + .05)), warp((-.05, 4.55, -hz - .75)), .11, .11, up=Y, ends=False)
    part.tube('iron', [(-.05, 4.46, -hz - 1.0), (-.05, 3.95, -hz - 1.0), (-.02, 3.82, -hz - .96), (-.1, 3.74, -hz - 1.0)], [.022, .022, .03, .012], sides=5)
    # Door steps, and two worn-out millstones: one leaning by the door, one lying as a step.
    part.block('stone-foot', (-2.25, 0, -hz - .95), (-.9, .17, -hz - .02), skip='y')
    part.block('stone-foot', (-2.1, .17, -hz - .5), (-1.05, .33, -hz - .02), skip='y')
    millstone(part, (-3.35, .64, -hz - .32), unit((0, .28, 1)))
    millstone(part, (2.0, .0, -hz - .9), Y, r=.58)
    # The wheel's own walls: a bearing block on the gable, an outer pier, and a stone-edged pit and race.
    ax, ay = hx + .98, 2.42
    part.block('stone-foot', (hx - .05, 0, -.5), (hx + .2, ay - .28, .5), skip='yx')
    part.block('timber', (hx - .02, ay - .28, -.34), (hx + .26, ay - .02, .34), skip='x')
    part.block('stone-foot', (ax + .92, 0, -.55), (ax + 1.5, ay - .28, .55), skip='y')
    part.block('timber', (ax + .95, ay - .28, -.34), (ax + 1.47, ay - .02, .34))
    for (x0, x1) in ((hx + .02, hx + .22), (ax + .84, ax + 1.12)):
        part.block('stone-foot', (x0, 0, -7.5), (x1, .42, 2.7), skip='y')
    part.block('stone-foot', (hx + .02, 0, 2.7), (ax + 1.12, .42, 2.98), skip='y')
    wheel = Part('highwater-mill:wheel')
    water_wheel(wheel)
    stream = Part('highwater-mill:stream')
    stream.grid('water', lambda i, j: np.array((hx + .22 + (ax + .84 - hx - .22) * j, .07 + .012 * math.sin(i * 1.7), 2.7 - 10.2 * i / 10)), 10, 1,
                uv=lambda i, j: (j * 1.6, i * 1.02), out=(0, 1, 0), flip=True)
    # The launder: a timber trough on trestles that carries the stream to the top of the wheel.
    top = ay + 2.2 + .18
    for z in (3.3, 5.6, 7.8):
        trestle(part, ax, z, top - .06 + .012 * z)
    part.box('timber-green', (hx - .1, top + .05, .7), (ax + .62, top + .05, .7), .17, .17, up=Y)
    part.box('timber-green', (hx - .02, top - 1.0, .7), (ax + .25, top - .02, .7), .12, .12, up=Z, ends=False)
    la, lb = np.array((ax, top + .16, -.35)), np.array((ax, top + .28, 8.4))
    part.box('timber-green', la, lb, .84, .07, up=Y)
    for s in (-1, 1):
        part.box('timber-green', la + (s * .40, .19, 0), lb + (s * .40, .19, 0), .06, .34, up=Y)
    stream.quad('water', la + (-.36, .2, .05), la + (.36, .2, .05), lb + (.36, .2, 0), lb + (-.36, .2, 0), Y)
    # Moss and wet where the launder has leaked down the gable for forty years.
    part.lump('moss', (hx + .12, 1.5, .55), (.16, .7, .5), 81, rings=4, sides=6, rough=.3)
    part.lump('moss', (ax + 1.2, ay - .2, .3), (.42, .16, .5), 82, rings=3, sides=6, rough=.3, flat=.3)
    obj = part.finish(parent)
    wheel.finish(obj, (ax, ay, 0))
    stream.finish(obj)
    return obj

def build_house(parent):
    part = Part('highwater-house')
    hx, hz, eaves, ridge = 4.1, 2.8, 2.75, 5.35
    fronts = [(3.55, 4.6, 0, 1.95, 'door'), (1.1, 2.25, .95, 1.95, 'window'), (5.95, 7.1, .95, 1.95, 'window')]
    backs = [(1.4, 2.2, 1.1, 1.9, 'window'), (5.6, 6.5, 0, 1.9, 'door')]
    lefts = [(2.4, 3.2, 3.0, 3.8, 'window')]
    rights = [(2.4, 3.2, 3.0, 3.8, 'window')]
    warp = shell(part, hx, hz, eaves, ridge, 5, fronts, backs, lefts, rights, upper=(eaves, 'planks'))
    surface = gable_roof(part, hx, hz, eaves, ridge, 31, sag=.2)
    roof_patch(part, surface, -1, .9, .42, 1.9, .34, 'tin', turn=True)
    roof_patch(part, surface, -1, 1.9, .34, 1.1, .2, 'planks', lift=.09, turn=True, battens=False)
    roof_patch(part, surface, 1, -2.4, .5, 1.6, .3, 'tarpaulin')
    roof_moss(part, surface, -1, [(-3.6, .92, .6), (-2.2, .8, .45), (-.6, .93, .5), (3.4, .9, .55), (-3.0, .3, .35)], 90)
    roof_moss(part, surface, 1, [(-3.2, .85, .8), (-.8, .9, .9), (1.2, .7, .7), (3.0, .88, .9), (2.0, .3, .5), (-2.0, .25, .5)], 95)
    chimney(part, -hx + .55, 0, ridge - .7, ridge + .95, warp)
    chimney(part, hx - .55, 0, ridge - .7, ridge + .8, warp, pot=False)
    # A slate porch on two posts, with the door step under it.
    porch = lean_to_roof(part, -1.05, 1.05, -hz + .02, -hz - 1.35, 2.5, 2.08, 33)
    for x in (-.9, .9):
        part.box('timber', (x, .12, -hz - 1.2), (x, 2.1, -hz - 1.2), .14, .14, up=Z)
        part.block('stone-foot', (x - .17, 0, -hz - 1.37), (x + .17, .13, -hz - 1.03), skip='y')
    part.box('timber', (-1.0, 2.14, -hz - 1.2), (1.0, 2.14, -hz - 1.2), .13, .15, up=Y)
    part.block('stone-foot', (-.85, 0, -hz - .95), (.85, .13, -hz - .02), skip='y')
    roof_moss(part, porch, 1, [(-.5, .7, .4), (.5, .85, .35)], 99)
    # Everything overflows: a barrel under the eaves at the corner, with a wooden spout from the roof.
    rain_barrel(part, (hx - .55, 0, -hz - .55))
    part.box('planks', (hx - .55, 2.62, -hz - .32), (hx - .55, 1.1, -hz - .55), .12, .10, up=X)
    log_stack(part, -3.85, -2.45, -hz - .62, -hz - .04, .85, 7)
    obj = part.finish(parent)
    return obj

def build_barn(parent):
    part = Part('highwater-barn')
    hx, hz, eaves, ridge = 5.4, 3.3, 3.5, 6.4
    fronts = [(3.8, 7.0, 0, 3.05, 'open'), (8.6, 9.5, 0, 1.9, 'door')]
    lefts = [(2.8, 3.8, 3.7, 4.9, 'hatch')]
    rights = [(2.8, 3.8, 3.9, 4.9, 'hatch')]
    warp = shell(part, hx, hz, eaves, ridge, 9, fronts, [], lefts, rights, upper=(2.05, 'planks'))
    surface = gable_roof(part, hx, hz, eaves, ridge, 41, sag=.24)
    roof_patch(part, surface, -1, -4.6, .18, 3.4, .52, 'tin', turn=True)
    roof_patch(part, surface, -1, -2.3, .52, 1.7, .26, 'tarpaulin', lift=.085)
    roof_patch(part, surface, -1, 2.6, .5, 1.9, .34, 'planks', turn=True)
    roof_patch(part, surface, 1, .6, .2, 3.0, .5, 'tin', turn=True)
    roof_moss(part, surface, -1, [(-1.2, .93, .6), (1.0, .9, .7), (4.6, .9, .6), (4.9, .5, .4), (.4, .3, .4)], 110)
    roof_moss(part, surface, 1, [(-4.2, .85, .9), (-2.2, .9, 1.0), (-.6, .7, .7), (4.2, .88, .9), (-3.0, .3, .6), (3.6, .45, .6)], 115)
    # The big doors: one leaf shut, one standing open, with their ledges and braces.
    u0, u1, top = 3.8 - hx, 7.0 - hx, 3.0
    mid = (u0 + u1) / 2
    part.quad('planks', warp((u0 + .03, .06, -hz + .12)), warp((mid, .06, -hz + .12)), warp((mid, top, -hz + .12)), warp((u0 + .03, top, -hz + .12)), -Z, turn=True)
    for y in (.5, 1.5, 2.6):
        part.box('timber', warp((u0 + .08, y, -hz + .07)), warp((mid - .05, y, -hz + .07)), .16, .05, up=Y, ends=False)
    part.box('timber', warp((u0 + .1, .55, -hz + .06)), warp((mid - .08, 1.45, -hz + .06)), .12, .04, up=Z, ends=False)
    swing = np.array((-math.cos(1.15), 0, -math.sin(1.15)))
    hinge = np.array((u1 - .03, 0, -hz + .1))
    leaf = lambda s, y: warp(hinge) * (1, 0, 1) + swing * s + Y * y
    part.quad('planks', leaf(0, .06), leaf(1.6, .06), leaf(1.6, top), leaf(0, top), (-.9, 0, -.4), turn=True)
    for y in (.5, 1.5, 2.6):
        part.box('timber', leaf(.05, y) + (.03, 0, .0), leaf(1.55, y) + (.03, 0, 0), .16, .05, up=Y, ends=False)
    part.box('timber', warp((u0 - .3, top + .16, -hz - .05)), warp((u1 + .3, top + .16, -hz - .05)), .34, .30, up=Y)
    # An open cart bay on the east end, under a slope of its own on three posts.
    bay = lean_to_roof(part, -hz + .3, hz - .3, hx + .02, hx + 3.3, 3.1, 2.2, 43, swap=True)
    for z in (-hz + .5, 0, hz - .5):
        part.box('timber', (hx + 3.1, .14, z), (hx + 3.1, 2.22, z), .17, .17, up=X)
        part.block('stone-foot', (hx + 2.9, 0, z - .2), (hx + 3.3, .15, z + .2), skip='y')
    part.box('timber', (hx + 3.1, 2.28, -hz + .35), (hx + 3.1, 2.28, hz - .35), .15, .17, up=Y)
    for z in (-hz + .5, hz - .5):
        part.box('timber', (hx + .05, 2.95, z), (hx + 3.1, 2.3, z), .11, .15, up=Y, ends=False)
    roof_moss(part, bay, 1, [(-1.5, .8, .7), (1.2, .6, .6), (2.2, .9, .5)], 120)
    log_stack(part, hx + .25, hx + 2.5, hz - 1.2, hz - .55, 1.3, 11)
    rain_barrel(part, (-hx - .5, 0, -hz + .6), r=.4, h=.95)
    part.lump('moss', (-2.6, .2, -hz - .12), (.9, .32, .22), 131, rings=3, sides=7, rough=.3, flat=.4)
    obj = part.finish(parent)
    return obj

def build_cart(parent):
    """Maud's cart: a heavy two-wheeled farm cart, a winter's wool on it under a tied sheet, mud all over it."""
    part = Part('maud-cart')
    hw, z0, z1, deck, axle_z, radius = .78, -1.35, 1.75, 1.0, .25, .74
    # Frame: two long shafts that are also the deck's side rails, cross bearers, and the deck boards.
    for s in (-1, 1):
        part.box('timber', (s * (hw - .06), deck - .08, z1), (s * (hw - .06), deck - .08, z0), .12, .16, up=Y)
        part.box('timber', (s * (hw - .06), deck - .08, z0), (s * .46, .78, -3.75), .10, .13, up=Y)
        part.box('iron', (s * (hw - .06), deck - .2, axle_z), (s * (hw - .06), radius, axle_z), .09, .12, up=Z, ends=False)
    for z in (z0 + .1, -.3, .9, z1 - .1):
        part.box('timber', (-hw, deck - .2, z), (hw, deck - .2, z), .11, .11, up=Y, ends=False)
    part.quad('planks-mud', (-hw, deck, z0), (hw, deck, z0), (hw, deck, z1), (-hw, deck, z1), Y, turn=True)
    part.quad('mud', (hw, deck - .02, z0), (-hw, deck - .02, z0), (-hw, deck - .02, z1), (hw, deck - .02, z1), -Y)
    # Side and end boards, mud to the top of them, with iron straps and standards.
    high = .50
    for s in (-1, 1):
        a, b = np.array((s * hw, deck, z0)), np.array((s * hw, deck, z1))
        lean = np.array((s * .07, high, 0))
        uvs = [(.02, .02), ((z1 - z0) / 1.25, .02), ((z1 - z0) / 1.25, .98), (.02, .98)]
        part.face('planks-mud', (a, b, b + lean, a + lean), uvs, (s, 0, 0))
        part.face('planks-mud', (a - X * s * .04, b - X * s * .04, b + lean - X * s * .04, a + lean - X * s * .04), uvs, (-s, 0, 0))
        for z in (z0 + .12, .2, z1 - .12):
            part.box('timber', (s * (hw + .045), deck - .22, z), (s * (hw + .045) + s * .08, deck + high + .06, z), .09, .07, up=Z)
    for z, o in ((z0, -1),):
        part.face('planks-mud', ((-hw, deck, z), (hw, deck, z), (hw + .07, deck + high, z), (-hw - .07, deck + high, z)),
                  [(.02, .02), (1.2, .02), (1.2, .98), (.02, .98)], (0, 0, o))
    part.tube('iron', [(-hw - .16, radius, axle_z), (hw + .16, radius, axle_z)], [.055, .055], sides=6, caps=(False, False))
    part.box('timber', (0, deck - .25, z0 + .2), (.0, .05, z0 - .15), .09, .09, up=X)
    # The load: big wool sacks in two courses, and a patched sheet roped down over them. The sacks show at the back.
    sacks = [(-.37, .30, z0 + .55), (.37, .30, z0 + .55), (-.37, .30, .15), (.37, .32, .2), (-.36, .3, 1.15), (.38, .3, 1.2),
             (0, .86, z0 + .7), (.02, .88, .35), (-.05, .84, 1.1), (.1, 1.33, .2)]
    for k, (x, y, z) in enumerate(sacks):
        wide = (.43, .33, .47) if y < .8 else (.62, .30, .46) if y < 1.2 else (.5, .22, .5)
        part.lump('sacking', (x, deck + y, z), wide, 150 + k, rough=.12, rings=4, sides=7, scale=1.0)

    def top_of(x, z):
        h = max([y + (.33 if y < .8 else .30 if y < 1.2 else .22) * max(0, 1 - ((x - sx) / .62) ** 2 - ((z - sz) / .62) ** 2) ** .5
                 for sx, y, sz in sacks] + [.2])
        return h
    zs = [z0 + .2 + (z1 - .62 - z0) * i / 8 for i in range(9)]
    xs = [-1.02, -.86, -.74, -.5, -.2, .1, .4, .7, .82, .98]

    def sheet(i, j):
        z, x = zs[i], xs[j]
        inner = max(-.72, min(.72, x))
        h = deck + top_of(inner, z) + .035
        out = abs(x) - .72
        if out > 0:
            h = deck + max(.38 + .1 * vnoise((x, z, 0), 2., 3), top_of(inner, z) - out * 3.4 - .1) + .02 * math.sin(z * 9)
            x = (inner + math.copysign(min(out, .12) + .05, x))
        if i == 0:
            h = min(h, deck + .62 + .25 * (1 - abs(x) / .9))
        return np.array((x, h, z + (.12 * math.sin(x * 5) if i == 8 else 0)))
    part.grid('tarpaulin', sheet, 8, 9, out=(0, 1, 0))
    for z in (z0 + .75, .35, 1.0):
        rope = [(x, deck + (.2 if abs(x) > .9 else .75 if abs(x) > .75 else top_of(x, z) + .06), z) for x in (-.95, -.84, -.45, 0, .45, .84, .95)]
        part.tube('sacking', rope, [.016] * len(rope), sides=4, caps=(False, False))
    # Mud caked under the deck and on the axle.
    part.lump('mud', (0, radius - .05, axle_z), (.7, .16, .2), 171, rings=3, sides=7, rough=.4)
    obj = part.finish(parent)
    for s, tag in ((-1, 'l'), (1, 'r')):
        wheel = Part(f'maud-cart:wheel-{tag}')
        for dx in (-.045, .045):
            wheel.card('cartwheel', (dx, -radius, -radius), (dx, -radius, radius), (dx, radius, radius), (dx, radius, -radius))
        wheel.lathe('iron', (-.055, 0, 0), [(radius, 0), (radius, .11)], sides=20, axis=X, cap_top=False)
        wheel.lathe('timber', (-.16, 0, 0), [(.09, 0), (.13, .08), (.13, .24), (.07, .32)], sides=8, axis=X)
        wheel.lump('mud', (0, -radius + .06, .1), (.09, .1, .34), 180 + s, rings=3, sides=6, rough=.4)
        wheel.finish(obj, (s * (hw + .22), radius, axle_z))
    return obj

def build_bank(parent):
    """The Top Pond's old earth dam: a slumped grassy bank with a stone lip on the water side and an old overflow sill."""
    part = Part('top-pond-bank')
    half, crest = 11.5, 3.0
    profile = [(-8.6, 0), (-7.2, .38), (-5.4, 1.2), (-3.3, 2.2), (-1.5, 2.95), (-.2, 3.05), (1.15, 3.0)]

    def shape(x, z, y):
        end = smooth(half, half - 3.2, abs(x))
        notch = smooth(1.3, .6, abs(x + 6.3)) * .55 * smooth(-3.0, -1.2, z)
        # Where the bank has begun to slip: a hollow high on the face and a bulge at its foot.
        slip = math.exp(-((x - 3.6) / 2.6) ** 2)
        y = y + slip * (.42 * math.exp(-((z + 6.2) / 1.2) ** 2) - .36 * math.exp(-((z + 3.4) / 1.1) ** 2))
        y = (y - notch) * end + .16 * vnoise((x, z, 0), .35, 7) * end * min(1, y) + .05 * vnoise((x, z, 0), 1.3, 8) * min(1, y * 2)
        return np.array((x, max(0, y), z + .25 * vnoise((x, z, 1), .3, 9)))
    nx = 26
    xs = [-half + 2 * half * i / nx for i in range(nx + 1)]
    part.grid('grass', lambda i, j: shape(xs[i], *profile[j]), nx, len(profile) - 1, out=(0, 1, -.3),
              uv=lambda i, j: (xs[i], profile[j][0] * 1.2))
    scar = lambda i, j: shape(1.9 + 3.6 * i / 4 + .5 * math.sin(j * 1.9), -5.0 + 2.3 * j / 3 + .35 * math.sin(i * 2.3), np.interp(-5.0 + 2.3 * j / 3 + .35 * math.sin(i * 2.3), [q[0] for q in profile], [q[1] for q in profile])) + Y * .035
    part.grid('mud', scar, 4, 3, out=(0, 1, -.3))
    # The water side: pitched stone under the lip, then bare mud down to the pond.
    back = [(1.15, 3.0), (1.75, 2.72), (2.5, 2.2), (3.4, 1.6), (4.6, .8), (6.0, 0)]
    for a in range(len(back) - 1):
        m = 'stone-moss' if a < 3 else 'mud'
        part.grid(m, lambda i, j, a=a: shape(xs[i], *back[a + j]), nx, 1, out=(0, 1, .4), uv=lambda i, j, a=a: (xs[i], back[a + j][0] * 1.3))
    # The stone lip: rough copings set along the water-side edge of the crest, some tipped, a few gone.
    k = 0
    x = -half + 3.0
    while x < half - 3.2:
        w = .7 + .35 * (vnoise((x, 0, 0), 1.7, 21) * .5 + .5)
        if abs(x + 6.3) > 1.4 and vnoise((x, 3, 0), .9, 22) > -.55:
            base = shape(x + w / 2, 1.2, 3.0)
            tip = .12 * vnoise((x, 1, 0), 1.1, 23)
            part.box('stone-moss', base + (-w / 2 + .03, .26 + .08 * tip, 0), base + (w / 2 - .03, .26 + tip, .05), .50, .58 + .5 * tip, up=Y)
        x += w
        k += 1
    # The old overflow: a notch through the crest floored with slabs, green and slippery.
    for i in range(4):
        zc = -2.2 + i * 1.05
        p = shape(-6.3, zc, 3.0 if zc > -1.5 else 3.0 + (zc + 1.5) * .45)
        part.block('stone-moss', (p[0] - .9, p[1] - .05, p[2] - .5), (p[0] + .9, p[1] + .09, p[2] + .52))
    # Old fence posts along the crest, leaning; tufts of rush on the face.
    for i, x in enumerate((-8.2, -4.4, -1.0, 2.6, 6.2, 9.0)):
        base = shape(x, -1.0, 3.0)
        lean = np.array((.14 * vnoise((x, 0, 0), 1., 31), 1.25 + .15 * vnoise((x, 0, 0), 1., 32), .22 * vnoise((x, 0, 0), 1., 33)))
        part.box('timber-green', base - Y * .1, base + lean, .11, .11, up=Z)
    for i in range(16):
        x = -half + 2.5 + (2 * half - 5) * ((i * .618) % 1)
        z = -7.6 + 6.8 * ((i * .377) % 1)
        y = np.interp(z, [p[0] for p in profile], [p[1] for p in profile])
        tuft(part, shape(x, z, y), .55 + .3 * ((i * .71) % 1), i)
    obj = part.finish(parent)
    return obj

def tuft(part, at, size, seed, cards=3):
    """Crossed cut-out cards of tall grass standing at a point."""
    at = np.asarray(at, float)
    for k in range(cards):
        ang = math.pi * k / cards + seed * 1.3
        d = np.array((math.cos(ang), 0, math.sin(ang))) * size * .62
        lean = np.array((math.sin(ang), 0, -math.cos(ang))) * size * .16 * (1 if k % 2 else -1)
        part.card('blades', at - d - Y * .03, at + d - Y * .03, at + d + Y * size + lean, at - d + Y * size + lean,
                  (0, 0, 1, 1) if (k + seed) % 2 else (1, 0, 0, 1))

def build_gate(parent):
    """The new gate at the Top Pond: bright steel bolted onto two old mossy piers. The leaf lifts; the wheel turns."""
    part = Part('top-pond-gate')
    gap, pier_w, pier_d, pier_h = 1.7, 1.15, 2.2, 2.7
    warp = settle(14, lean=.012, wobble=.03)
    for s in (-1, 1):
        x0, x1 = s * gap / 2, s * (gap / 2 + pier_w)
        lo, hi = min(x0, x1), max(x0, x1)
        wall(part, (lo, 0, -pier_d / 2), X, -Z, pier_w, pier_h, warp, mat='stone', foot='stone-foot', foot_h=.9, u0=.3 + s)
        wall(part, (hi, 0, pier_d / 2), -X, Z, pier_w, pier_h, warp, mat='stone-moss', foot='stone-moss', u0=1.4)
        wall(part, (lo, 0, pier_d / 2), -Z, -X, pier_d, pier_h, warp, mat='stone' if s > 0 else 'stone-moss', foot='stone-foot', foot_h=.9, u0=.7)
        wall(part, (hi, 0, -pier_d / 2), Z, X, pier_d, pier_h, warp, mat='stone' if s < 0 else 'stone-moss', foot='stone-foot', foot_h=.9, u0=2.1)
        part.grid('stone-moss', lambda i, j, lo=lo, hi=hi: warp((lo - .06 + (hi - lo + .12) * i / 2, pier_h + .14 * math.sin(math.pi * i / 2) * math.sin(math.pi * j / 2) + .0,
                  -pier_d / 2 - .06 + (pier_d + .12) * j / 2)), 2, 2, out=(0, 1, 0))
        # Wing walls that run back into the bank, lower, with moss along the top.
        wa, wb = (x1, x1 + s * 2.6) if s > 0 else (x1 + s * 2.6, x1)
        wall(part, (wa, 0, -.4), X, -Z, 2.6, 1.5, warp, mat='stone', foot='stone-foot', u0=.5)
        wall(part, (wb, 0, .4), -X, Z, 2.6, 1.5, warp, mat='stone-moss', foot='stone-moss', u0=.9)
        part.grid('moss', lambda i, j, wa=wa: warp((wa + 2.6 * i / 3, 1.5 + .1 * math.sin(i * 2.1 + j), -.45 + .9 * j)), 3, 1, out=(0, 1, 0))
        # New steel guides bolted to the old stone, with their fixings.
        gx = s * (gap / 2 - .07)
        part.box('new-steel', (gx, .2, 0), (gx, 4.75, 0), .14, .26, up=Z)
        for y in (.6, 1.4, 2.2):
            part.block('iron', (gx - .09, y - .05, -.2), (gx + .09, y + .05, -.13))
            part.block('iron', (gx - .09, y - .05, .13), (gx + .09, y + .05, .2))
    part.block('stone-foot', (-gap / 2, 0, -pier_d / 2 - .2), (gap / 2, .26, pier_d / 2 + .2), skip='y')
    part.box('new-steel', (-gap / 2 - .25, 4.86, 0), (gap / 2 + .25, 4.86, 0), .34, .24, up=Y)
    # The working deck across the pier tops: open grating, a toe plate, posts and two rails.
    dz = -.95
    part.quad('new-steel', (-gap / 2 - pier_w, pier_h + .16, dz - .45), (gap / 2 + pier_w, pier_h + .16, dz - .45),
              (gap / 2 + pier_w, pier_h + .16, dz + .45), (-gap / 2 - pier_w, pier_h + .16, dz + .45), Y)
    for z in (dz - .45, dz + .45):
        part.box('new-steel', (-gap / 2 - pier_w, pier_h + .1, z), (gap / 2 + pier_w, pier_h + .1, z), .06, .16, up=Z, ends=False)
    for x in (-gap / 2 - pier_w + .05, -.0, gap / 2 + pier_w - .05):
        part.box('new-steel', (x, pier_h + .16, dz - .43), (x, pier_h + 1.26, dz - .43), .05, .05, up=Z, ends=False)
    for y in (pier_h + .72, pier_h + 1.26):
        part.tube('new-steel', [(-gap / 2 - pier_w + .05, y, dz - .43), (gap / 2 + pier_w - .05, y, dz - .43)], [.024, .024], sides=5, caps=(False, False))
    # The lifting gear on the head beam: a boxed gear, a screw down to the leaf, and the handwheel.
    part.block('new-steel', (-.2, 4.98, -.2), (.2, 5.32, .2))
    part.tube('iron', [(0, 1.9, .0), (0, 4.98, .0)], [.035, .035], sides=6, caps=(False, False))
    obj = part.finish(parent)
    leaf = Part('top-pond-gate:leaf')
    lw = gap - .22
    leaf.block('new-steel', (-lw / 2, 0, -.03), (lw / 2, 1.75, .03))
    for y in (.12, .65, 1.2, 1.68):
        leaf.box('new-steel', (-lw / 2, y, -.075), (lw / 2, y, -.075), .09, .1, up=Y, ends=False)
    leaf.box('new-steel', (0, 1.75, 0), (0, 1.98, 0), .12, .1, up=Z)
    leaf.finish(obj, (0, .26, 0))
    wheel = Part('top-pond-gate:handwheel')
    n = 14
    ring = [(.34 * math.cos(TAU * k / n), .34 * math.sin(TAU * k / n), 0) for k in range(n + 1)]
    wheel.tube('new-steel', ring, [.022] * (n + 1), sides=5, caps=(False, False))
    for k in range(4):
        d = np.array((math.cos(TAU * k / 4), math.sin(TAU * k / 4), 0)) * .33
        wheel.box('new-steel', (0, 0, 0), d, .03, .03, up=Z, ends=False)
    wheel.lathe('iron', (0, 0, -.04), [(.05, 0), (.05, .28)], sides=6, axis=Z)
    wheel.finish(obj, (0, 5.15, -.34))
    return obj

# ------------------------------------------------------------------ the tunnel and what is in it

def lettering(part, words, mat, place, height):
    """Raised painted letters. place(s, t) puts a point s metres along the word and t metres up it."""
    curve = bpy.data.curves.new('letters', 'FONT')
    curve.body = words
    curve.align_x = 'CENTER'
    curve.size = height / .69
    curve.resolution_u = 2
    curve.space_character = 1.12
    obj = bpy.data.objects.new('letters', curve)
    bpy.context.collection.objects.link(obj)
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        pts = [place(mesh.vertices[i].co.x, mesh.vertices[i].co.y) for i in tri.vertices]
        part.face(mat, pts, [(.5, .5)] * 3)
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    bpy.data.meshes.remove(mesh)

P_R, P_CY, P_LEN = 4.0, 4.15, 15.0

def side_uv(y, px):
    return (px / 2172, 1 - (357 - (y - P_CY) / P_R * 300) / 724)

def build_prudence(parent):
    """PRUDENCE: a boring machine far bigger than the player's, left in the dark with every part still bolted
    together. The shield and head wear the borer's photographs; her name is in careful white letters."""
    part = Part('prudence')
    sides, stations = 28, 7
    ids = {}
    for i in range(stations + 1):
        z = P_LEN * i / stations
        px = 392 + (1522 - 392) * i / stations
        for k in range(sides + 1):
            a = TAU * k / sides
            p = (P_R * math.cos(a), P_CY + P_R * math.sin(a), z)
            ids[(i, k)] = (part.mesh.vertex(p), side_uv(p[1], px))
    for i in range(stations):
        for k in range(sides):
            q = [ids[(i, k)], ids[(i, k + 1)], ids[(i + 1, k + 1)], ids[(i + 1, k)]]
            a = TAU * (k + .5) / sides
            part.mesh.indexed([v[0] for v in q], [v[1] for v in q], 'prudence-side', (math.cos(a), math.sin(a), 0), True)
    # The open tail of the shield, dark inside, with the thrust ring showing.
    part.lathe('iron', (0, P_CY, P_LEN - .02), [(P_R, 0), (P_R - .32, 0)], sides=sides, axis=Z, cap_top=False)
    part.lathe('dark', (0, P_CY, P_LEN - .6), [(P_R - .32, .58), (P_R - .32, 0), (.01, 0)], sides=14, axis=Z, cap_top=False)
    for name_side in (1, -1):
        def place(s, t, o=name_side):
            a = (t + .55) / P_R
            if o < 0:
                a = math.pi - a
            return (math.cos(a) * (P_R + .015), P_CY + math.sin(a) * (P_R + .015), 7.6 - o * s)
        lettering(part, 'PRUDENCE', 'paint-white', place, .95)
    # Timber cradles she was left standing on, and the rails of her own skips beside her.
    for z in (2.5, 7.5, 12.5):
        for s in (-1, 1):
            part.box('timber', (s * 2.6, .17, z), (s * .9, .17, z), .5, .34, up=Y, ends=True)
            part.box('timber', (s * 2.75, .16, z), (s * 1.55, .62, z), .5, .3, up=Y)
    # Behind the shield: the driver's deck, railed, with the seat, the levers, the gauges and a hooded lamp.
    d0, d1, dy, dw = P_LEN + .1, P_LEN + 6.2, 1.55, 1.6
    part.quad('iron', (-dw, dy, d0), (dw, dy, d0), (dw, dy, d1), (-dw, dy, d1), Y)
    part.quad('iron', (dw, dy - .14, d0), (-dw, dy - .14, d0), (-dw, dy - .14, d1), (dw, dy - .14, d1), -Y)
    for s in (-1, 1):
        part.box('iron', (s * dw, dy - .07, d0), (s * dw, dy - .07, d1), .1, .16, up=Y)
        for z in (d0 + .3, d0 + 2.2, d0 + 4.1, d1 - .2):
            part.box('iron', (s * (dw - .2), 0, z), (s * (dw - .2), dy - .14, z), .13, .13, up=Z, ends=False)
            part.box('iron', (s * dw, dy, z), (s * dw, dy + 1.05, z), .05, .05, up=Z, ends=False)
        for y in (dy + .55, dy + 1.05):
            part.tube('iron', [(s * dw, y, d0 + .3), (s * dw, y, d1 - .2)], [.025, .025], sides=5, caps=(False, False))
        part.lathe('iron', (s * (dw - .2) - s * .09, .3, d0 + .3), [(.3, 0), (.3, .12)], sides=10, axis=X)
        part.lathe('iron', (s * (dw - .2) - s * .09, .3, d1 - .2), [(.3, 0), (.3, .12)], sides=10, axis=X)
        part.box('iron', (s * (dw - .2), .03, d0 - 1.0), (s * (dw - .2), .03, d1 + 2.0), .07, .1, up=Y)
    part.box('iron', (-dw, dy, d1), (dw, dy, d1), .05, .05, up=Z, ends=False)
    for i in range(5):
        part.box('timber', (-dw - .2, -.02, d0 - .6 + i * 1.9), (dw + .2, -.02, d0 - .6 + i * 1.9), .22, .12, up=Y, ends=False)
    sx, sz = -.55, d0 + 2.3
    part.lathe('iron', (sx, dy, sz), [(.16, 0), (.05, .06), (.05, .42), (.1, .46)], sides=7)
    part.lump('iron', (sx, dy + .52, sz), (.25, .075, .23), 201, rough=.08, rings=3, sides=8)
    part.grid('iron', lambda i, j: np.array((sx - .24 + .24 * i, dy + .56 + .16 * j + .03 * (i == 1), sz + .24 + .04 * j - .05 * (i != 1))), 2, 2, out=(0, 0, -1))
    for k, x in enumerate((-.28, -.1, .08)):
        part.tube('iron', [(sx + x, dy, sz - .62), (sx + x, dy + .7, sz - .62 - .12 * (k - 1))], [.022, .016], sides=5)
        part.lump('brass', (sx + x, dy + .74, sz - .62 - .12 * (k - 1)), (.04, .04, .04), 210 + k, rough=.05, rings=3, sides=6)
    part.block('iron', (.35, dy, sz - .95), (1.25, dy + 1.25, sz - .78))
    for k in range(4):
        part.lathe('brass', (.52 + .2 * (k % 2) + .3 * (k // 2) * 0 + .0, dy + .75 + .26 * (k // 2), sz - .96), [(.085, 0), (.085, .02)], sides=8, axis=-Z)
    part.tube('iron', [(1.3, dy, d0 + .5), (1.3, dy + 2.3, d0 + .5), (1.05, dy + 2.5, d0 + .7)], [.035, .03, .03], sides=5)
    part.lathe('iron', (1.0, dy + 2.52, d0 + .75), [(.05, 0), (.2, .16)], sides=8, axis=unit((-.3, -.6, .5)), cap_top=False)
    part.lump('lamp', (.93, dy + 2.42, d0 + .86), (.07, .09, .07), 221, rough=.05, rings=3, sides=6)
    # The muck belt, run back from inside the shield over the deck on its own light frame.
    b0, b1 = np.array((.0, 3.3, P_LEN - 1.5)), np.array((.0, 4.5, d1 + 2.6))
    for s in (-1, 1):
        part.box('iron', b0 + (s * .52, 0, 0), b1 + (s * .52, 0, 0), .07, .16, up=Y)
        for f in (.42, .72, .97):
            p = b0 + (b1 - b0) * f
            part.box('iron', (s * (dw - .05), dy if f < .8 else 0, p[2]), p + (s * .52, 0, 0), .06, .06, up=Z, ends=False)
    part.quad('dark', b0 + (-.45, .05, 0), b0 + (.45, .05, 0), b1 + (.45, .05, 0), b1 + (-.45, .05, 0), Y)
    obj = part.finish(parent)
    # The cutting head, on the bore's axis.
    head = Part('prudence:head')
    rim = [(.0, P_R), (-.9, P_R), (-1.32, P_R * .985), (-1.5, P_R * .93)]
    hid = {}
    for i, (z, r) in enumerate(rim):
        for k in range(sides + 1):
            a = TAU * k / sides
            p = (r * math.cos(a), r * math.sin(a), z)
            hid[(i, k)] = (head.mesh.vertex(p), side_uv(p[1] * (.9 + .1 * (1 + z / 1.5)) * .93 + P_CY, 392 + z / 1.5 * 190))
    for i in range(len(rim) - 1):
        for k in range(sides):
            q = [hid[(i, k)], hid[(i, k + 1)], hid[(i + 1, k + 1)], hid[(i + 1, k)]]
            a = TAU * (k + .5) / sides
            head.mesh.indexed([v[0] for v in q], [v[1] for v in q], 'prudence-side', (math.cos(a), math.sin(a), -.2), True)
    rings = [0, .3, .62, .93]
    face_uv = lambda x, y: ((625 - x / P_R * 592) / 1254, 1 - (634 - y / P_R * 592) / 1254)

    def face_point(i, k):
        r = P_R * rings[i]
        a = TAU * k / sides
        return np.array((r * math.cos(a), r * math.sin(a), -1.62 + .12 * rings[i] ** 2))
    fid = {(i, k): (head.mesh.vertex(tuple(face_point(i, k))), face_uv(*face_point(i, k)[:2])) for i in range(4) for k in range(sides + 1)}
    for i in range(3):
        for k in range(sides):
            q = [fid[(i, k)], fid[(i, k + 1)], fid[(i + 1, k + 1)], fid[(i + 1, k)]]
            if i == 0:
                q = q[1:]
            head.mesh.indexed([v[0] for v in q], [v[1] for v in q], 'prudence-face', (0, 0, -1), True)
    head.finish(obj, (0, P_CY, 0))
    # The lunch tin on the seat: small, dented, and the brightest thing down here.
    tin = Part('prudence:lunch-tin')
    tin.tube('tin-bright', [(-.13, .085, 0), (-.03, .08, .012), (.03, .078, .014), (.13, .085, 0)], [.092, .083, .08, .092], sides=4, caps=(True, True), spin=TAU / 8)
    tin.lathe('tin-bright', (-.13, .148, 0), [(.066, 0), (.066, .26)], sides=8, axis=X, cap_top=True, cap_bottom=True)
    tin.tube('iron', [(-.09, .2, 0), (-.07, .27, .0), (.07, .27, .0), (.09, .2, 0)], [.006] * 4, sides=4, caps=(False, False))
    tin.finish(obj, (sx, dy + .595, sz - .02))
    return obj

def build_gallery(parent):
    """Somebody else's tunnel: old iron rings set by hand, a segment at a time, weeping rust, over a mud floor
    with the rails of a skip road. One 6 m length; lay them end to end along Z."""
    part = Part('prudence-gallery')
    R, cy, n, rings, length = 5.2, 3.6, 16, 4, 1.5
    a0 = -math.asin(cy / R)
    a1 = math.pi - a0
    ang = lambda k: a0 + (a1 - a0) * k / n
    at = lambda r, k, z: np.array((r * math.cos(ang(k)), cy + r * math.sin(ang(k)), z))
    for ring in range(rings):
        z0, z1 = ring * length, (ring + 1) * length
        shift = .5 if ring % 2 else 0
        for k in range(n):
            ka, kb = k + shift if k + shift <= n else n, min(n, k + 1 + shift)
            if kb <= ka:
                continue
            arc = R * (ang(kb) - ang(ka))
            uvs = [part.uv('old-iron', z0 + .05, R * ang(ka)), part.uv('old-iron', z0 + .05, R * ang(kb)), part.uv('old-iron', z1 - .05, R * ang(kb)), part.uv('old-iron', z1 - .05, R * ang(ka))]
            part.face('old-iron', (at(R + .24, ka, z0 + .05), at(R + .24, kb, z0 + .05), at(R + .24, kb, z1 - .05), at(R + .24, ka, z1 - .05)), uvs)
            # The bolted flange along each segment's side.
            part.quad('iron', at(R + .24, ka, z0), at(R + .24, ka, z1), at(R, ka, z1), at(R, ka, z0), None, u0=ring * 1.7 + k)
        if shift:
            part.face('old-iron', (at(R + .24, 0, z0 + .05), at(R + .24, shift, z0 + .05), at(R + .24, shift, z1 - .05), at(R + .24, 0, z1 - .05)), [(0, 0), (.2, 0), (.2, 1), (0, 1)])
    for j in range(rings + 1):
        z = j * length
        for k in range(n):
            for dz, o in ((-.05, -1), (.05, 1)):
                if (j == 0 and o < 0) or (j == rings and o > 0):
                    continue
                part.quad('iron', at(R + .24, k, z + dz), at(R + .24, k + 1, z + dz), at(R, k + 1, z + dz), at(R, k, z + dz), None, u0=k * .8, v0=j * .37)
            za, zb = max(0, z - .05), min(rings * length, z + .05)
            part.quad('iron', at(R, k, za), at(R, k + 1, za), at(R, k + 1, zb), at(R, k, zb), None, u0=k * .8)
    half = R * math.cos(a0)
    total = rings * length
    part.grid('mud', lambda i, j: np.array((-half + 2 * half * i / 6, .04 * vnoise((i, j, 0), .9, 5) + .05 * (i in (0, 6)), total * j / 4)), 6, 4, out=(0, 1, 0),
              uv=lambda i, j: (2 * half * i / 6, total * j / 4))
    for s in (-1, 1):
        part.box('iron', (s * .55 + 1.9, .13, 0), (s * .55 + 1.9, .13, total), .06, .1, up=Y, ends=False)
    for i in range(6):
        part.box('timber', (1.0, .05, .5 + i), (2.8, .05, .5 + i), .2, .1, up=Y)
    obj = part.finish(parent)
    return obj

def build_ring(parent):
    """One steel rib of the player's own tunnel, 6 m across inside, with its lamp at the crown."""
    part = Part('tunnel-ring')
    R, n = 3.0, 32
    at = lambda r, k, z: np.array((r * math.cos(TAU * k / n), R + .22 + r * math.sin(TAU * k / n), z))
    for k in range(n):
        u = TAU * R * k / n
        part.quad('new-steel', at(R, k, -.09), at(R, k + 1, -.09), at(R, k + 1, .09), at(R, k, .09), None, u0=u)
        part.quad('new-steel', at(R + .22, k, -.09), at(R + .22, k + 1, -.09), at(R + .22, k + 1, .09), at(R + .22, k, .09), None, u0=u, v0=.5)
        part.quad('new-steel', at(R, k, 0), at(R, k + 1, 0), at(R + .22, k + 1, 0), at(R + .22, k, 0), None, u0=u, v0=.9)
    for k in (4, 12, 20, 28):
        c = at(R + .11, k, 0)
        d = unit(at(R, k, 0) - np.array((0, R + .22, 0)))
        t = np.array((-d[1], d[0], 0))
        for z in (-.02, .02):
            part.box('iron', c - t * .3 + Z * z * 1.5, c + t * .3 + Z * z * 1.5, .03, .17, up=Z)
    # The lamp: a caged bulkhead light under the crown, and its cable clipped down one side.
    top = at(R, 8, 0)
    part.lathe('iron', top - Y * .0, [(.13, 0), (.13, -.06), (.09, -.1)], sides=8, cap_top=True)
    part.lump('lamp', top - Y * .2, (.085, .11, .085), 231, rough=.04, rings=3, sides=7)
    for k in range(4):
        a = TAU * k / 4
        part.tube('iron', [top + (.1 * math.cos(a), -.1, .1 * math.sin(a)), top + (.1 * math.cos(a), -.26, .1 * math.sin(a)), top + (0, -.34, 0)], [.007] * 3, sides=3, caps=(False, False))
    part.tube('dark', [at(R - .02, k, .11) for k in range(8, 21)], [.018] * 13, sides=4, caps=(False, False))
    obj = part.finish(parent)
    return obj

def sandbag(part, c, along, seed, size=(.33, .11, .19)):
    c = np.asarray(c, float)
    along = unit(along)
    side = np.cross(Y, along)

    def point(i, j):
        lat = -math.pi / 2 + math.pi * j / 3
        lon = TAU * (i % 5) / 5
        d = np.array((math.cos(lat) * math.cos(lon), math.sin(lat), math.cos(lat) * math.sin(lon)))
        d = np.sign(d) * np.abs(d) ** .55
        k = 1 + .1 * vnoise(d * 2 + c, 1., seed)
        return c + along * d[0] * size[0] * k + Y * d[1] * size[1] + side * d[2] * size[2] * k
    part.grid('sacking', point, 5, 3, uv=lambda i, j: (i * .19 + seed * .13, j * .14), out=lambda mid: mid - c)

def build_portal(parent):
    """The raw far mouth of the tunnel: a timber hood on heavy sets, the broken rock face it came out of, and
    sandbag walls thrown up either side against the mud."""
    part = Part('tunnel-portal')
    R, cy, depth = 3.0, 3.1, 1.9
    verts = [(3.5 * math.cos(math.radians(a)), cy + 3.5 * math.sin(math.radians(a))) for a in (-28, 10, 48, 90, 132, 170, 208)]
    verts = [(verts[0][0], 0)] + verts + [(verts[-1][0], 0)]
    for z in (-depth, -depth / 2, -.05):
        for (xa, ya), (xb, yb) in zip(verts, verts[1:]):
            part.box('timber', (xa, ya, z), (xb, yb, z), .34, .34, up=Z)
    for (xa, ya), (xb, yb) in zip(verts, verts[1:]):
        o = unit(((xa + xb) / 2, (ya + yb) / 2 - cy, 0))
        a, b = np.array((xa, ya, -depth - .12)) + o * .19, np.array((xb, yb, -depth - .12)) + o * .19
        part.quad('planks', a, b, b + Z * (depth + .15), a + Z * (depth + .15), o)
    # The face the bore broke out of: a wall of broken rock, wider than it is high, in rough benches, with the
    # hole through the foot of it.
    cols = [-10.5, -9.3, -8.2, -7.1, -6.2, -5.4, -4.7, -3.75, -2.6, -1.3, 0, 1.3, 2.6, 3.75, 4.7, 5.4, 6.2, 7.1, 8.2, 9.3, 10.5]
    rows = [0, 1.5, 3.1, 4.8, 6.75, 7.6, 8.9, 10.4]

    def face(i, j):
        x, y = cols[i], rows[j]
        if abs(x) < 3.76 and y < 6.8:
            # Round the hole: these points are drawn out to the hood's edge.
            a = math.atan2(max(y, .01) - cy, x)
            return np.array((3.72 * math.cos(a), max(0, cy + 3.72 * math.sin(a)), .02))
        edge = max(0, 1 - abs(x) / 10.5) ** .5
        top = (7.2 + 3.4 * edge) * (.86 + .22 * vnoise((x, 0, 0), .45, 61) + .08 * vnoise((x, 0, 0), 1.7, 66))
        y = min(y, top) if j < len(rows) - 1 else top
        z = .15 + .55 * y / 4 + .55 * vnoise((x, y, 0), .42, 62) + .3 * math.floor(y / 3.2) + .25 * vnoise((x, y, 0), 1.3, 63)
        return np.array((x + .3 * vnoise((x, y, 1), .5, 64), y, z))
    idx = {(i, j): part.mesh.vertex(tuple(map(float, face(i, j)))) for i in range(len(cols)) for j in range(len(rows))}
    for i in range(len(cols) - 1):
        for j in range(len(rows) - 1):
            mx, my = (cols[i] + cols[i + 1]) / 2, (rows[j] + rows[j + 1]) / 2
            if abs(mx) < 3.75 and my < 4.9 and math.hypot(mx, my - cy) < 3.4:
                continue
            corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            pts = [np.array(part.mesh.verts[idx[c]]) for c in corners]
            uvs = [part.uv('rock', (q[0] + q[2] * .3) * .45, (q[1] + q[2] * .4) * .45) for q in pts]
            part.face('rock', pts, uvs, (0, .2, -1))
    for s in (-1, 1):
        part.grid('mud', lambda i, j, s=s: np.array((s * (3.4 + 2.4 * i), (1.5 - .65 * i) * (1 - j / 3) + .06 * vnoise((i, j, s), 1., 63), .3 - 2.6 * j / 3 - .4 * i * (j / 3))), 2, 3, out=(s * .3, 1, -.5))
    for k in range(9):
        x = -9.5 + 19 * ((k * .618) % 1)
        if abs(x) > 4.2:
            size = .35 + .4 * ((k * .37) % 1)
            part.lump('rock', (x, size * .3, -.5 - 1.2 * ((k * .53) % 1)), (size, size * .7, size * .8), 65 + k, rough=.3, rings=3, sides=5, smooth=False, freq=1.8)
    # Sandbags: a wall each side of the mouth, stepped back as it rises, a return at each end, and a row on the hood.
    seed = 0
    for s in (-1, 1):
        for course in range(11):
            count = 5 - course // 3
            for b in range(count):
                x = s * (3.80 + .07 * course + (b + (course % 2) * .5) * .64)
                seed += 1
                sandbag(part, (x, .10 + course * .2, -depth - .3 + .04 * vnoise((seed, 0, 0), 1., 64) + .04 * b), X, seed)
        for b in range(8):
            seed += 1
            sandbag(part, (s * (3.98 + .05 * (b % 2)), .10 + (b // 2) * .2 * 2 + .2 * (b % 2), -depth + .35 + .62 * (b % 2)), Z, seed)
    for b in range(9):
        seed += 1
        x = -2.6 + b * .65
        y = cy + math.sqrt(max(0, 3.72 ** 2 - x ** 2)) + .22
        sandbag(part, (x, y, -depth + .2), X, seed)
    part.tube('iron', [(1.9, cy + 2.55, -depth - .2), (1.9, cy + 2.1, -depth - .22)], [.008, .008], sides=3, caps=(False, False))
    part.lathe('iron', (1.9, cy + 1.86, -depth - .22), [(.07, 0), (.08, .04), (.05, .2), (.02, .25)], sides=6)
    part.lump('lamp', (1.9, cy + 1.98, -depth - .22), (.05, .07, .05), 241, rough=.04, rings=3, sides=6)
    obj = part.finish(parent)
    return obj

def build_spoil(parent):
    """What came out of the hole: a big dark heap of broken rock, tipped from one end, its sides at the angle
    loose rock lies at, with the big lumps run out round its foot."""
    part = Part('spoil-heap')
    peaks = [((0, 0), 6.4), ((4.2, 1.2), 4.9), ((-4.4, -1.0), 4.3), ((1.2, -3.2), 3.6), ((-1.4, 3.0), 4.2)]

    def height(x, z):
        # Each tip is a cone at about 36 degrees; the heap is the highest of them, broken up by the rock itself.
        h = max(top - .78 * math.hypot(x - cx, z - cz) for (cx, cz), top in peaks)
        return max(0, h + .22 * vnoise((x, z, 0), .9, 251) + .12 * vnoise((x, z, 0), 2.4, 252)) if h > -.4 else 0
    n = 22
    span = 11.5
    grid = [[np.array((-span + 2 * span * i / n + .25 * vnoise((i, j, 0), 1., 253), height(-span + 2 * span * i / n, (-span + 2 * span * j / n) * .85),
                       (-span + 2 * span * j / n) * .85 + .25 * vnoise((i, j, 1), 1., 254))) for j in range(n + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(n):
            pts = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            if max(q[1] for q in pts) > .02:
                part.face('spoil', pts, [part.uv('spoil', q[0], q[2]) for q in pts], (0, 1, 0))
    for k in range(46):
        a = TAU * ((k * .618) % 1)
        d = 1.5 + 8.2 * ((k * .377) % 1) ** .8
        x, z = math.cos(a) * d, math.sin(a) * d * .85
        size = (.22 + .5 * ((k * .733) % 1) ** 2) * (1.3 if d > 6 else 1)
        part.lump('spoil', (x, height(x, z) + size * .25, z), (size, size * .65, size * .8), 270 + k, rough=.32, rings=3, sides=5, freq=1.8, smooth=False)
    obj = part.finish(parent)
    return obj

# ------------------------------------------------------------------ the green

def bough(part, root, out, reach, droop, seed, leans=(0., 1.2, -1.2), mat='bough'):
    """One spruce bough as three cut-out strips sharing the branch line: one hanging and one spread to each side."""
    root, out = np.asarray(root, float), unit(out)
    side = np.cross(Y, out)
    line = [root, root + out * reach * .5 - Y * reach * droop * .25, root + out * reach - Y * reach * droop]
    for lean in leans:
        hang = -Y * math.cos(lean) + side * math.sin(lean)
        depth = reach * (.62 if lean == 0 else .50)
        for k in range(2):
            a, b = line[k], line[k + 1]
            da, db = depth * (.6 if k == 0 else 1.0), depth * (1.0 if k == 0 else .5)
            u0, u1 = (k / 2, (k + 1) / 2)
            part.face(mat, (a + hang * da, b + hang * db, b - hang * depth * .14, a - hang * depth * .14),
                      [(u0, 0), (u1, 0), (u1, 1), (u0, 1)])

def build_conifer(parent, name, height, girth, whorls, per, reach, seed):
    """A spruce of the wet side: a straight dark trunk, dead stubs low down, and tier on uneven tier of heavy
    boughs that hang, longest a quarter of the way up and ragged all the way."""
    part = Part(name)
    lean = np.array((.02 * vnoise((seed, 0, 0), 1., 1), 0, .02 * vnoise((seed, 1, 0), 1., 2)))
    spine = lambda y: np.array((0, y, 0)) + lean * y * (1 + .3 * math.sin(y * .5 + seed))
    stations = [0, .12, .5, 1.5, height * .35, height * .7, height * .975]
    part.tube('bark', [spine(y) for y in stations], [girth * 1.5, girth * 1.12, girth, girth * .92, girth * .66, girth * .3, .015], sides=7, caps=(False, False))
    first = height * (.13 if height > 9 else .10)
    for k in range(6 if height > 9 else 2):
        y = .8 + (first - .8) * (k + .5) / 6
        a = seed + k * 2.4
        d = np.array((math.cos(a), -.15, math.sin(a)))
        part.tube('bark', [spine(y), spine(y) + d * (.5 + .5 * ((k * .7) % 1))], [girth * .16, .012], sides=4, caps=(False, False))
    for w in range(whorls):
        f = (w + .35 * vnoise((w, seed, 0), 1.9, 6)) / (whorls - 1)
        f = min(1, max(0, f))
        y = first + (height * .985 - first) * f ** .95
        r = reach * (1 - f) ** .72 * (.62 + .38 * min(1, f / .14)) + .14 + height * .012
        n = per + (1 if f < .5 else 0) - (2 if f > .85 else 0)
        for b in range(n):
            jit = vnoise((w, b, seed), 1.7, 4)
            if jit < -.62 and f < .8:
                continue                                     # a bough lost to wind or shade leaves a gap
            a = TAU * (b + (w % 2) * .5 + .22 * vnoise((w, b, seed), 1., 3)) / n + seed
            d = np.array((math.cos(a), 0, math.sin(a)))
            lee = 1 - .32 * max(0, math.cos(a - seed * 1.7))
            bough(part, spine(y) - Y * .05 * r, d, r * lee * (.78 + .34 * (jit * .5 + .5)), (.22 + .30 * (1 - f) + .08 * jit) if f < .9 else .5, w * 7 + b + seed,
                  leans=(0., 1.2, -1.2) if f < .9 else (0.,), mat='bough-dark' if (f < .22 or jit > .45) else 'bough')
    return part.finish(parent)

def beech_leaf_tile():
    """The leaf spray the Ardennes beech already uses (ambientCG LeafSet024, CC0), read out of its own file."""
    raw = (root / 'public/assets/models/circuits/kits/ardennes-beech.glb').read_bytes()
    n = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + n])
    view = gltf['bufferViews'][gltf['images'][0]['bufferView']]
    start = 20 + n + 8 + view.get('byteOffset', 0)
    path = BUILD / 'beech-leaf-spray.png'
    path.write_bytes(raw[start:start + view['byteLength']])
    return read_picture(path)

def build_apple(parent):
    """An old orchard apple: a short leaning mossy trunk, heavy crooked limbs, a low wide head, fruit on it and under it."""
    part = Part('apple-tree')
    trunk = [(0, 0, 0), (.06, .5, .02), (.22, 1.15, .08), (.3, 1.55, .12)]
    part.tube('bark', trunk, [.34, .25, .22, .24], sides=8, caps=(False, False))
    fork = np.array(trunk[-1])
    tips = []
    for k in range(5):
        a = TAU * k / 5 + .4
        d = np.array((math.cos(a), 0, math.sin(a)))
        reach = 1.9 + .5 * vnoise((k, 0, 0), 1., 71)
        limb = [fork - Y * .15, fork + d * reach * .35 + Y * .55, fork + d * reach * .7 + Y * (1.25 + .2 * (k % 2)), fork + d * reach + Y * (1.5 + .5 * (k % 2))]
        part.tube('bark', limb, [.15, .12, .085, .03], sides=6, caps=(False, False))
        tips += [limb[2], limb[3]]
        for j, side in enumerate((-1, 1)):
            d2 = unit(d + np.array((-d[2], 0, d[0])) * side * .9)
            twig = [limb[1 + j], limb[1 + j] + d2 * .7 + Y * .5, limb[1 + j] + d2 * 1.25 + Y * .7]
            part.tube('bark', twig, [.07, .045, .015], sides=5, caps=(False, False))
            tips.append(twig[2])
    tips.append(fork + Y * 2.4)
    for k, tip in enumerate(tips):
        for c in range(3):
            a = math.pi * c / 3 + k
            d = np.array((math.cos(a), .25 * math.sin(k * 2.1 + c), math.sin(a))) * (.95 + .25 * ((k * .37) % 1))
            up = np.array((-d[2] * .3, 1., d[0] * .3)) * .8
            part.card('leaves', tip - d - up * .7, tip + d - up * .7, tip + d + up * .9, tip - d + up * .9, (0, 0, 1, 1) if (k + c) % 2 else (1, 0, 0, 1))
        if k % 2 == 0:
            for j in range(3):
                p = tip + np.array((.5 * math.cos(k + j * 2.1), -.35 - .2 * j, .5 * math.sin(k + j * 2.1)))
                part.lump('apple', p, (.05, .047, .05), 300 + k * 3 + j, rough=.05, rings=2, sides=5)
    for j in range(9):
        a, d = TAU * ((j * .618) % 1), 1.0 + 1.5 * ((j * .41) % 1)
        part.lump('apple', (math.cos(a) * d, .04, math.sin(a) * d), (.05, .045, .05), 330 + j, rough=.05, rings=2, sides=5)
    part.lump('moss', (.02, .55, -.2), (.2, .5, .12), 340, rings=3, sides=6, rough=.3)
    return part.finish(parent)

def build_grass(parent):
    part = Part('grass-clump')
    tuft(part, (0, 0, 0), .78, 1, cards=3)
    tuft(part, (.26, 0, .14), .55, 4, cards=2)
    tuft(part, (-.2, 0, -.22), .48, 6, cards=2)
    return part.finish(parent)

def build_rock(parent):
    """A boulder that has sat in the rain since the ice left: dark, split, with a cap of moss and grass at its foot."""
    part = Part('wet-rock')
    part.lump('rock', (0, .55, 0), (1.05, .95, .82), 351, rough=.24, rings=8, sides=11, flat=.42, freq=1.5, cap=('moss', 2))
    part.lump('rock', (.85, .25, .45), (.55, .5, .46), 352, rough=.25, rings=5, sides=7, flat=.5, freq=1.6, cap=('moss', 2))
    tuft(part, (-.95, 0, .5), .5, 3, cards=2)
    tuft(part, (.3, 0, -.85), .42, 8, cards=2)
    return part.finish(parent)

# ------------------------------------------------------------------ animals

def take_animal(name, file):
    """A game animal's own model, standing as it was modelled, as a plain mesh in metres facing -Z."""
    before = set(bpy.data.objects)
    images = set(bpy.data.images)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/wildlife' / file))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'ARMATURE':
            o.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    skin = max((o for o in new if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    groups = [g.name for g in skin.vertex_groups]
    mesh = bpy.data.meshes.new_from_object(skin.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.transform(skin.matrix_world)
    # The file splits the skin along every seam of its picture. Join it again, so that it can be reshaped whole.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(mesh)
    bm.free()
    weights = [{groups[g.group]: g.weight for g in v.groups} for v in mesh.vertices]
    coat = next(i for i in bpy.data.images if i not in images)
    w, h = coat.size
    px = np.empty(w * h * 4, np.float32)
    coat.pixels.foreach_get(px)
    picture = px.reshape(h, w, 4)[::-1, :, :3].copy()
    for o in new:
        bpy.data.objects.remove(o)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    # Turn the animal to face the part's front: glTF -Z, which is +Y here.
    head = np.mean([v.co for v, wt in zip(mesh.vertices, weights) if wt.get('Head', 0) > .5], axis=0)
    turn = math.pi / 2 - math.atan2(head[1], head[0])
    co, si = math.cos(turn), math.sin(turn)
    for v in mesh.vertices:
        v.co.x, v.co.y = v.co.x * co - v.co.y * si, v.co.x * si + v.co.y * co
    mesh.materials.clear()
    mesh.update()
    print('ANIMAL', name, 'verts', len(mesh.vertices), 'head', [round(float(c), 2) for c in head])
    return obj, weights, picture

def islands(mesh):
    """Which joined piece each vertex belongs to, largest first."""
    parent = list(range(len(mesh.vertices)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for e in mesh.edges:
        a, b = find(e.vertices[0]), find(e.vertices[1])
        if a != b:
            parent[a] = b
    label = [find(i) for i in range(len(parent))]
    order = sorted(set(label), key=lambda l: -label.count(l))
    return [order.index(l) for l in label]

def thin(obj, target):
    obj.data.calc_loop_triangles()
    count = len(obj.data.loop_triangles)
    if count > target:
        mod = obj.modifiers.new('fewer faces', 'DECIMATE')
        mod.ratio = target / count
        with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
            bpy.ops.object.modifier_apply(modifier=mod.name)

BODY = ('Body', 'Back', 'Torso', 'Neck', 'Hips', 'Spine', 'Chest', 'BackShoulder', 'FrontShoulder')

def body_weight(wt):
    return sum(w for g, w in wt.items() if g.startswith(BODY))

def build_goat(parent):
    """Fourteen: the town's goat, longer in the coat and wet through, with a bell at the neck that reads HIGHWATER 14."""
    part = Part('goat-fourteen')
    obj, weights, picture = take_animal('goat-fourteen:body', 'goat.glb')
    mesh = obj.data
    back = np.percentile([v.co.z for v, wt in zip(mesh.vertices, weights) if body_weight(wt) > .5], 92)
    belly = np.percentile([v.co.z for v, wt in zip(mesh.vertices, weights) if body_weight(wt) > .5], 6)
    for v, wt in zip(mesh.vertices, weights):
        k = body_weight(wt)
        if k > .3:
            # A long wet coat hangs: fuller on the flanks, dragged into ragged points along the belly line.
            t = np.clip((back - v.co.z) / (back - belly), 0, 1)
            rag = vnoise((v.co.x * 9, v.co.y * 9, v.co.z * 3), 1., 5) * .5 + .5
            v.co += v.normal * (.012 + .03 * math.sin(math.pi * min(1, t * 1.1))) * k
            v.co.z -= k * (.02 + .085 * rag) * smooth(.45, .95, t)
    mesh.update()
    material('goat-coat', wet(resize(picture, 512, 512), .80, .95), rough=.9, quality=64)
    mesh.materials.append(MATERIALS['goat-coat'])
    thin(obj, 2300)
    # The collar goes round the neck behind the jaw, and the bell hangs under it.
    pts = np.array([(v.co.x, v.co.z, -v.co.y) for v in mesh.vertices])
    front = pts[:, 2].min()
    head_at = pts[pts[:, 2] < front * .72].mean(axis=0)
    chest = pts[(np.abs(pts[:, 2] - front * .28) < .04)]
    low = np.array((0, float(np.percentile(chest[:, 1], 75)), front * .28))
    axis = unit(head_at * (0, 1, 1) - low)
    mid = low + (head_at * (0, 1, 1) - low) * .52
    across = unit(np.cross(X, axis))
    near = pts[(np.abs((pts - mid) @ axis) < .035) & (np.abs(pts[:, 0]) < .13) & (np.abs((pts - mid) @ across) < .16)]
    if len(near) < 4:
        near = np.array([mid + X * .06, mid - X * .06, mid + across * .08, mid - across * .08])
    rx = float(np.abs(near[:, 0]).max()) + .012
    lo_, hi_ = float(((near - mid) @ across).min()), float(((near - mid) @ across).max())
    mid = mid + across * (lo_ + hi_) / 2
    ra = (hi_ - lo_) / 2 + .012
    ring = [mid + X * rx * math.cos(a) + across * ra * math.sin(a) for a in np.linspace(0, TAU, 11)]
    part.tube('sacking', ring, [.011] * 11, sides=4, caps=(False, False))
    under = min(ring, key=lambda q: q[1])
    bell = np.array((0, under[1] - .085, under[2] - .01))
    part.lathe('brass', bell, [(.046, 0), (.04, .012), (.032, .056), (.013, .072)], sides=8, cap_top=True)
    part.lump('iron', bell - Y * .01, (.012, .014, .012), 361, rough=.02, rings=2, sides=4)
    print('GOAT collar', [round(float(c), 2) for c in mid], 'radii', round(rx, 3), round(ra, 3), 'bell', [round(float(c), 2) for c in bell])
    for text, up in (('HIGHWATER', .036), ('14', .020)):
        lettering(part, text, 'dark', lambda s, t, up=up: (bell[0] + math.sin(s / .04) * .04, bell[1] + up + t, bell[2] - math.cos(s / .04) * .04), .009)
    # Long wet locks hang from the flanks and the neck in points, each wearing the coat's own colour where it grows.
    mesh.calc_loop_triangles()
    uv_of = {}
    for loop in mesh.loops:
        uv_of.setdefault(loop.vertex_index, tuple(mesh.uv_layers.active.data[loop.index].uv))
    trunk = [(i, q) for i, q in enumerate(pts) if abs(q[0]) > .05 and front * .45 < q[2] < -front * .75 and .30 < q[1] < .46]
    step = max(1, len(trunk) // 150)
    for k, (i, q) in enumerate(trunk[::step]):
        side = 1 if q[0] > 0 else -1
        width = .022 + .018 * ((k * .37) % 1)
        drop = .07 + .08 * ((k * .61) % 1)
        a_, b_ = q + (0, 0, -width), q + (0, 0, width)
        tip = q + (side * .012, -drop, .02 * math.sin(k))
        uv = uv_of[i]
        part.face('goat-coat', (a_, b_, tip), [uv, uv, uv])
    root_obj = part.finish(parent)
    obj.parent = root_obj
    return root_obj

def build_sheep(parent):
    """A Highwater hill sheep, made from the same animal as the goat: horns and beard off, a heavy wet fleece
    put on, the face and legs left dark and bare."""
    part = Part('sheep')
    obj, weights, picture = take_animal('sheep:body', 'goat.glb')
    mesh = obj.data
    label = islands(mesh)
    height = max(v.co.z for v in mesh.vertices)
    stats = {}
    for i, l in enumerate(label):
        stats.setdefault(l, []).append(mesh.vertices[i].co.copy())
    drop = set()
    for l, pts in stats.items():
        c = np.mean(pts, axis=0)
        span = np.ptp(np.array(pts), axis=0)
        if len(pts) >= 10:
            print('ISLAND', l, len(pts), [round(float(x), 2) for x in c], [round(float(x), 2) for x in span])
        horn = l > 0 and len(pts) >= 20 and c[2] > height * .72 and span[2] > .07
        beard = l > 0 and 8 <= len(pts) <= 70 and height * .35 < c[2] < height * .66 and c[1] > .3 and abs(c[0]) < .04
        if horn or beard:
            drop.add(l)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if label[v.index] in drop], context='VERTS')
    keep = [i for i in range(len(label)) if label[i] not in drop]
    bm.to_mesh(mesh)
    bm.free()
    weights = [weights[i] for i in keep]
    mesh.update()
    back = np.percentile([v.co.z for v, wt in zip(mesh.vertices, weights) if body_weight(wt) > .5], 95)
    belly = np.percentile([v.co.z for v, wt in zip(mesh.vertices, weights) if body_weight(wt) > .5], 5)
    fleece = []
    for v, wt in zip(mesh.vertices, weights):
        k = smooth(.35, .8, body_weight(wt))
        fleece.append(k)
        if k > 0:
            t = np.clip((back - v.co.z) / (back - belly), 0, 1)
            lump = vnoise((v.co.x * 7, v.co.y * 7, v.co.z * 7), 1., 9)
            v.co += v.normal * k * (.075 + .03 * lump + .02 * math.sin(math.pi * t))
            v.co.z -= k * .05 * smooth(.5, 1, t)
    mesh.update()
    material('sheep-face', wet(resize(picture, 256, 256), .34, .25), rough=.9)
    mesh.materials.append(MATERIALS['wool'])
    mesh.materials.append(MATERIALS['sheep-face'])
    uv = mesh.uv_layers.active.data
    for poly in mesh.polygons:
        woolly = min(fleece[i] for i in poly.vertices) > .45
        poly.material_index = 0 if woolly else 1
        if woolly:
            for li, vi in zip(poly.loop_indices, poly.vertices):
                co = mesh.vertices[vi].co
                uv[li].uv = ((co.y + co.x * .35) / .55, co.z / .55)
    thin(obj, 2200)
    root_obj = part.finish(parent) if part.mesh.faces else empty('sheep', parent)
    obj.parent = root_obj
    return root_obj

# ------------------------------------------------------------------ people

def oilskin_picture(colour, rng, S=96):
    n, f = spectral(S, 1.6, rng), spectral(S, .5, rng, wide=4)
    img = np.asarray(colour) * (1 + .22 * n + .12 * f)[..., None]
    img = mixc(img, np.asarray(colour) * 2.1 + .05, smooth(1.1, 2.2, f + n * .4) * .5)
    return np.clip(img, .01, .9)

def build_person(parent, name, photo_set, height, kind, coat, coat_key, hem_y, long_coat):
    """Maud and Wick are the town's walkers under oilskins: carved from the same photo sets by the same rig
    (an upper body and two legs that swing at the hem), the clothes dyed and the face left as it was."""
    from hull_model import View, occupancy, largest_part, carve_hull
    top_px, ground, centre, hips = (7, 253, 95, 133) if kind == 'adult' else (7, 253, 95, 128)
    scale = height / (ground - top_px)
    neck = top_px + (.150 if kind == 'adult' else .215) * (ground - top_px)
    picks = {'front': lambda x, y, z: (centre + x / scale, ground - y / scale), 'side': lambda x, y, z: (centre + z / scale, ground - y / scale),
             'back': lambda x, y, z: (centre - x / scale, ground - y / scale), 'top': lambda x, y, z: (centre + x / scale, 256 - z / scale)}
    normals = {'front': (0, 0, 1), 'side': (1, 0, 0), 'back': (0, 0, -1), 'top': (0, 1, 0)}
    views = []
    hem_row = ground - hem_y / scale
    for key in ('front', 'side', 'back', 'top'):
        photo = Photo(TOWN_TEX / f'{photo_set}-{key}.jpg')
        seeds = [(5, 5), (photo.w - 6, 5), (5, photo.h - 6), (photo.w - 6, photo.h - 6)]
        seeds += [(x, 4) for x in range(32, photo.w - 8, 32)] + [(x, photo.h - 5) for x in range(32, photo.w - 8, 32)]
        seeds += [(4, y) for y in range(32, photo.h - 8, 32)] + [(photo.w - 5, y) for y in range(32, photo.h - 8, 32)]
        view = View(key, photo, seeds, picks[key], normals[key], grey=28, tolerance=34)
        if key == 'side':
            # The town rig has no photo for a walker's left; faces there took the overhead photo and came out
            # as a smear. The profile turned over serves.
            left = View('left', photo, seeds, lambda x, y, z: (centre - z / scale, ground - y / scale), (-1, 0, 0), grey=28, tolerance=34)
        a = photo.rgb().astype(np.float32) / 255
        lum = luminance(a)
        rows = np.mgrid[0:photo.h, 0:photo.w][0]
        skin = (a[..., 0] > a[..., 1] * 1.13) & (a[..., 0] > a[..., 2] * 1.32) & (lum > .46)
        body = (rows > neck) if key != 'top' else np.ones(lum.shape, bool)
        ref = lum[view.mask & body].mean()
        shade = np.clip(lum / ref, .25, 2.2) ** .8
        dyed = np.asarray(coat) * shade[..., None] + .07 * smooth(1.25, 1.9, shade)[..., None]
        boots = np.array((.035, .04, .035)) * shade[..., None]
        out = a.copy()
        change = body & ~skin
        out[change] = dyed[change]
        if key != 'top':
            low = change & (rows > hem_row)
            out[low] = boots[low]
        rgba = np.ones((photo.h, photo.w, 4), np.float32)
        rgba[..., :3] = out[::-1]
        photo.image.pixels.foreach_set(rgba.ravel())
        photo.image.update()
        photo._rgb = None
        views.append(view)
    for view in views:
        view.photo.bleed(view.mask, passes=12)
    views.append(left)
    materials = {v.name: v.photo.material(.42) for v in views}
    facing = {}
    for v in views:
        materials[v.name].name = f'far-side-{name}-{v.name}'
    hip_y = (ground - hips) * scale
    cut = hem_y if long_coat else hip_y
    half_x = .47 if kind == 'adult' else .39
    actor = empty(name, parent)
    tests = [v.covers for v in views if v.name not in ('top', 'left')]
    voxel = .015
    for label, bounds, keep, target in (
            ('upper', ((-half_x, half_x), (0, height + .10), (-.38, .38)), lambda x, y, z: y >= cut, 215),
            ('leg-l', ((-.34, .34), (0, hip_y + .06), (-.30, .30)), lambda x, y, z: (y < cut + .015) & (x <= .012), 75),
            ('leg-r', ((-.34, .34), (0, hip_y + .06), (-.30, .30)), lambda x, y, z: (y < cut + .015) & (x >= -.012), 75)):
        solid, xs, ys, zs = occupancy(bounds, voxel, tests, keep)
        solid = largest_part(solid)
        mesh = carve_hull(f'{name}:{label}', views, materials, solid, xs, ys, zs, voxel, target)
        if label == 'upper':
            mesh.parent = actor
            for poly in mesh.data.polygons:
                key = mesh.data.materials[poly.material_index].name
                facing[key] = facing.get(key, Vector((0, 0, 0))) + poly.normal * poly.area
        else:
            px = -.095 if label.endswith('l') else .095
            pivot = empty(f'{name}:{label}', actor)
            pivot.location = (px, 0, cut)
            pivot['swing_axis'] = 'X'
            mesh.name = f'{name}:{label}:mesh'
            mesh.location = (-px, 0, -cut)
            mesh.parent = pivot
    # A sou'wester: a round crown and a brim that is short in front and long down the back of the neck.
    gear = Part(f'{name}:hat')
    hs = height / 1.70 * (1.0 if kind == 'adult' else 1.22)
    crown = np.array((0, height - .058 * hs, -.012 * hs))
    rings = [(.004, .10), (.075, .085), (.108, .035), (.118, -.012)]

    def hat(i, j):
        a = TAU * (i % 10) / 10
        if j < 4:
            r, y = rings[j]
            return crown + np.array((math.cos(a) * r * .95, y, math.sin(a) * r * 1.08)) * hs
        back_ = max(0, -math.sin(a))      # the walkers face +Z, so the back of the neck is at -Z
        r = .175 + .11 * back_ ** 1.5
        return crown + np.array((math.cos(a) * r * .9, -.012 + .03 * max(0, math.sin(a)) - .10 * back_ - .02 * abs(math.cos(a)), math.sin(a) * r)) * hs
    gear.grid(coat_key, hat, 10, 4, out=lambda mid: mid - crown + Y * .1, uv=lambda i, j: (i * .05, j * .05))
    if not long_coat:
        # The coat's long skirt, down to the tops of the boots; the legs swing inside it.
        def skirt(i, j):
            a = TAU * (i % 9) / 9
            f = j / 3
            y = hip_y + .16 - (hip_y + .16 - hem_y) * f
            rx, rz = .185 + .06 * f, .135 + .055 * f
            flap = .012 * math.sin(a * 3 + j) * f
            return np.array((math.cos(a) * (rx + flap), y, math.sin(a) * (rz + flap) + .01))
        gear.grid(coat_key, skirt, 9, 3, out=lambda mid: mid * (1, 0, 1), uv=lambda i, j: (i * .08, j * .14))
    gear.finish(actor)
    actor['height_m'] = height
    actor['hip_height_m'] = round(hip_y, 3)
    print('PERSON', name, {k: [round(c, 2) for c in v.normalized()] for k, v in facing.items()}, '(Blender axes; -Y here is glTF +Z)')
    return actor

# ------------------------------------------------------------------ build, export, read back

def build_family():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    build_surfaces()
    rng = np.random.default_rng(5)
    leaves = beech_leaf_tile()
    leaves[..., :3] = wet(leaves[..., :3], .40, .85) * np.array((.85, 1.0, .8))
    leaves = thicken(resize(leaves, 256, 256), 4.0, .22)
    material('leaves', leaves, cutout=True, rough=.5)
    material('oilskin-dark', oilskin_picture((.055, .052, .042), rng), (.5, .5), rough=.3)
    material('oilskin-yellow', oilskin_picture((.36, .27, .055), rng), (.5, .5), rough=.34)
    family = empty('far-side')
    builders = {
        'highwater-mill': build_mill, 'highwater-house': build_house, 'highwater-barn': build_barn, 'maud-cart': build_cart,
        'top-pond-bank': build_bank, 'top-pond-gate': build_gate, 'prudence': build_prudence, 'prudence-gallery': build_gallery,
        'tunnel-ring': build_ring, 'tunnel-portal': build_portal, 'spoil-heap': build_spoil, 'goat-fourteen': build_goat,
        'sheep': build_sheep,
        'conifer-tall': lambda p: build_conifer(p, 'conifer-tall', 17.0, .30, 24, 5, 3.3, 3),
        'conifer-small': lambda p: build_conifer(p, 'conifer-small', 6.5, .13, 13, 4, 1.7, 8),
        'apple-tree': build_apple, 'grass-clump': build_grass, 'wet-rock': build_rock,
        'maud-tarn': lambda p: build_person(p, 'maud-tarn', 'walker-a', 1.62, 'adult', (.075, .07, .055), 'oilskin-dark', .25, True),
        'wick': lambda p: build_person(p, 'wick', 'walker-kid-b', 1.30, 'child', (.40, .30, .06), 'oilskin-yellow', .30, False),
    }
    for name in PARTS:
        if ONLY and name not in ONLY:
            continue
        obj = builders[name](family)
        tris = 0
        for o in [obj, *obj.children_recursive]:
            if o.type == 'MESH':
                o.data.calc_loop_triangles()
                tris += len(o.data.loop_triangles)
        print('PART', name, 'triangles', tris)
    for image in list(bpy.data.images):
        if not image.users:
            bpy.data.images.remove(image)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [family, *family.children_recursive]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = family
    bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_materials='EXPORT', export_image_format='AUTO', export_image_quality=78,
                              export_extras=True, export_animations=False, export_skins=False, export_morph=False)
    if not ONLY:
        bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))

def read_back():
    raw = OUT.read_bytes()
    n = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + n])
    nodes = gltf['nodes']
    by_name = {node.get('name'): i for i, node in enumerate(nodes)}

    def triangles(i):
        total = 0
        if 'mesh' in nodes[i]:
            total += sum(gltf['accessors'][p['indices']]['count'] // 3 for p in gltf['meshes'][nodes[i]['mesh']]['primitives'])
        return total + sum(triangles(c) for c in nodes[i].get('children', []))
    family = by_name['far-side']
    report = {nodes[c]['name']: triangles(c) for c in nodes[family].get('children', [])}
    total = sum(report.values())
    pictures = sorted(((gltf['bufferViews'][im['bufferView']]['byteLength'], im.get('name')) for im in gltf.get('images', [])), reverse=True)
    print(json.dumps({'glb': str(OUT), 'bytes': len(raw), 'triangles': total, 'parts': report,
                      'picture_bytes': sum(p[0] for p in pictures), 'largest_pictures': pictures[:8]}))
    missing = [name for name in PARTS if name not in report and not ONLY]
    if missing:
        raise SystemExit(f'far-side.glb is missing {missing}')
    if not ONLY and (total > BUDGET or len(raw) > MAX_BYTES):
        raise SystemExit(f'far-side.glb is over budget: {total} triangles, {len(raw)} bytes')
    for node in nodes:
        if node.get('name') in PARTS and any(abs(v) > 1e-5 for v in node.get('translation', [0, 0, 0])):
            raise SystemExit(f"{node['name']} is not at the origin")

# ------------------------------------------------------------------ review pictures
# Every picture is rendered from the exported file, imported into an empty scene, under one flat grey sky.

def world_bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi

def render_pictures(folder):
    folder.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples = 24
    scene.view_settings.view_transform = 'Standard'
    scene.render.image_settings.file_format = 'PNG'
    world = bpy.data.worlds.new('flat grey sky')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.62, .66, .70, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.15
    scene.world = world
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 30))
    sun = bpy.context.object
    sun.data.energy = .55
    sun.data.angle = math.radians(60)
    sun.rotation_euler = (math.radians(38), 0, math.radians(-25))
    ground_mat = bpy.data.materials.new('review ground')
    ground_mat.use_nodes = True
    ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.17, .17, .16, 1)
    ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .7
    bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, -.004))
    ground = bpy.context.object
    ground.data.materials.append(ground_mat)
    family = bpy.data.objects['far-side']
    parts = {o.name: o for o in family.children}
    # A cut-out that the importer leaves as a blended surface is missing from the mist pass: the first whole-place
    # pictures showed every tree as a bare pole, because its boughs were given the sky's mist.
    for mat in bpy.data.materials:
        if mat.use_nodes and any(n.type == 'TEX_IMAGE' and n.outputs['Alpha'].is_linked for n in mat.node_tree.nodes):
            mat.surface_render_method = 'DITHERED'

    def show(names):
        for name, obj in parts.items():
            for o in [obj, *obj.children_recursive]:
                o.hide_render = name not in names
        ground.hide_render = False

    def camera_at(position, target, lens):
        cam_data = bpy.data.cameras.new('review')
        cam = bpy.data.objects.new('review', cam_data)
        scene.collection.objects.link(cam)
        cam.location = position
        cam.rotation_euler = (Vector(target) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
        cam_data.lens = lens
        cam_data.sensor_width = 36
        cam_data.clip_end = 2000
        scene.camera = cam
        return cam

    scene.render.resolution_x, scene.render.resolution_y = 864, 600
    wanted = [n for n in PARTS if n in parts] + (['prudence deck'] if 'prudence' in parts else [])
    for shot in wanted:
        name = shot.split(' ')[0]
        show([name])
        bpy.context.view_layer.update()
        lo, hi = world_bounds([parts[name], *parts[name].children_recursive])
        if shot in FRAME:           # glTF z is -y here
            lo.y, hi.y = max(lo.y, -FRAME[shot][1]), min(hi.y, -FRAME[shot][0])
        centre = (lo + hi) / 2
        ang = math.radians(VIEWS[shot])
        # A part's front is glTF -Z, which is Blender +Y. The camera stands 15 m from the middle, at car height.
        eye = Vector((centre.x + 15 * math.sin(ang), centre.y + 15 * math.cos(ang), 1.2))
        if shot == 'prudence deck':
            lo.z, hi.z = 1.3, 4.6
            centre = (lo + hi) / 2
            eye = Vector((centre.x + 15 * math.sin(ang), centre.y + 15 * math.cos(ang), 1.2))
        if name == 'prudence-gallery':
            eye = Vector((1.2, centre.y + 15, 1.6))
        cam = camera_at(eye, centre, 50)
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        tan_x = tan_y = 0.
        for o in [parts[name], *parts[name].children_recursive]:
            if o.type != 'MESH':
                continue
            for v in o.data.vertices:
                w = o.matrix_world @ v.co
                if lo.y - .01 <= w.y <= hi.y + .01 and lo.z - .01 <= w.z <= hi.z + .01:
                    p = inv @ w
                    if p.z < -.5:
                        tan_x, tan_y = max(tan_x, abs(p.x / p.z)), max(tan_y, abs(p.y / p.z))
        need = max(tan_x, tan_y * 864 / 600) * 1.12
        cam.data.lens = float(np.clip(18 / max(need, 1e-3), 14, 900))
        scene.render.filepath = str(folder / f'{shot}.png')
        bpy.ops.render.render(write_still=True)
        print('PICTURE', shot, 'lens', round(cam.data.lens), 'bounds', [round(v, 2) for v in (*lo, *hi)])
        bpy.data.objects.remove(cam)
    if ONLY:
        return
    # The whole place: everything that stands above ground, set out as Highwater might be, on wet grass.
    show([n for n in parts if n not in ('prudence', 'prudence-gallery', 'tunnel-ring')])
    grass = bpy.data.materials.new('review grass')
    grass.use_nodes = True
    tree = grass.node_tree
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(BUILD / 'far-side-grass.jpg'))
    mapping = tree.nodes.new('ShaderNodeMapping')
    coords = tree.nodes.new('ShaderNodeTexCoord')
    mapping.inputs['Scale'].default_value = (560, 560, 1)
    tree.links.new(coords.outputs['UV'], mapping.inputs['Vector'])
    tree.links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
    tree.links.new(tex.outputs['Color'], tree.nodes['Principled BSDF'].inputs['Base Color'])
    tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .85
    tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = .15
    ground.data.materials[0] = grass
    # A lower sky, and mist that takes the far trees.
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.44, .48, .52, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .9
    world.mist_settings.start, world.mist_settings.depth, world.mist_settings.falloff = 18, 170, 'LINEAR'
    bpy.context.view_layer.use_pass_mist = True
    scene.use_nodes = True
    nodes, links = scene.node_tree.nodes, scene.node_tree.links
    nodes.clear()
    layers, mix, out_node = nodes.new('CompositorNodeRLayers'), nodes.new('CompositorNodeMixRGB'), nodes.new('CompositorNodeComposite')
    mix.inputs[2].default_value = (.52, .56, .59, 1)
    links.new(layers.outputs['Mist'], mix.inputs[0])
    links.new(layers.outputs['Image'], mix.inputs[1])
    links.new(mix.outputs[0], out_node.inputs[0])
    place = {'highwater-mill': (0, 0, 0), 'highwater-house': (-17, -9, 20), 'highwater-barn': (17, -10, -24),
             'maud-cart': (-6.5, 9.5, -60), 'top-pond-bank': (-6, -40, 0), 'top-pond-gate': (-21, -37.5, 0),
             'tunnel-portal': (44, -30, 35), 'spoil-heap': (36, -6, 0), 'goat-fourteen': (-2.2, 12.5, 130),
             'sheep': (5.0, 14.0, 70), 'conifer-tall': (-30, -18, 0), 'conifer-small': (-24, -4, 0),
             'apple-tree': (-10.5, 3.5, 0), 'grass-clump': (2.6, 15.5, 0), 'wet-rock': (9.5, 12.0, 30),
             'maud-tarn': (-3.4, 6.4, 20), 'wick': (-4.3, 7.6, -30)}
    for name, (x, y, turn) in place.items():
        if name in parts:
            parts[name].location = (x, y, 0)
            parts[name].rotation_euler = (0, 0, math.radians(turn))

    def copies(name, spots):
        if name not in parts:
            return
        for (x, y, turn, size) in spots:
            for o in [parts[name], *parts[name].children_recursive]:
                dup = o.copy()
                scene.collection.objects.link(dup)
                if o is parts[name]:
                    dup.location, dup.rotation_euler, dup.scale = (x, y, 0), (0, 0, math.radians(turn)), (size, size, size)
                    top = dup
                else:
                    dup.parent = top
    rnd = np.random.default_rng(3)
    copies('conifer-tall', [(-46 + 6.2 * i + rnd.uniform(-2, 2), -16 - rnd.uniform(0, 22) - 5 * (i % 3), rnd.uniform(0, 360), rnd.uniform(.75, 1.3)) for i in range(17)])
    copies('conifer-small', [(-38 + 8 * i + rnd.uniform(-3, 3), -12 - rnd.uniform(0, 6), rnd.uniform(0, 360), rnd.uniform(.8, 1.5)) for i in range(10)])
    copies('grass-clump', [(rnd.uniform(-16, 16), rnd.uniform(5, 24), rnd.uniform(0, 360), rnd.uniform(.7, 1.5)) for _ in range(38)])
    copies('wet-rock', [(-12, 15, 80, .7), (13, 5, 200, 1.2)])
    copies('sheep', [(8.5, 17, 200, 1.0), (12, 9, 300, .95)])
    copies('apple-tree', [(-15, 9, 130, .9)])
    cam = camera_at((2.0, 27.0, 1.25), (-1.0, 0, 3.4), 21)
    scene.render.resolution_x, scene.render.resolution_y = 1600, 600
    scene.render.filepath = str(folder / 'place.png')
    bpy.ops.render.render(write_still=True)

if not options.no_build:
    build_family()
read_back()
if options.render:
    render_pictures(Path(options.render) if Path(options.render).is_absolute() else root / options.render)
