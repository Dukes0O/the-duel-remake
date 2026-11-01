# The camp's water works for The Water Road (card WATER-YARD-ART, packet
# docs/story/wasteland-water-road.md sections 2 and 11). One original recipe:
# a dry stone well, a sawn overground pipe, a scrap engine pump in a corrugated
# pump house, a riveted boiler, a lean-to truck bay with a rusted water tanker
# and a scrap water tower with a level window and eight water heights. The
# game shows each stage by chapter by showing or hiding the named nodes below.
#
# Contract (glTF): metres, +Y up, one root empty `water-works`, origin on the
# ground at the group's middle. The group is about 29 m wide (X), 13 m deep (Z)
# and 11 m tall (the tower). Its front (the side the camp looks at) is -Z.
# Seen from the front, the well is on the left and the camp tap on the right.
#
# Suggested placement in yard.glb (gate-local metres, heading 0): position
# (-4, 0, 31), no rotation. That puts the group on the open ground between the
# gate and the first wreck banks (x -19 to 11, z 30 to 43, clear of the barrier
# line at z 48), in view of the home camera at (0, 4, 0). Check it against the
# real ground when the card that wires it in lands.
#
# Nodes (each a separate object; show or hide by name):
#   always:  well, pump, pump-house, truck-bay, tower, camp-tap
#   ch 0:    pipe-cut, valve-missing, boiler-cold          (tower-water-0 = none)
#   ch 1:    pipe-patched replaces pipe-cut
#   ch 2:    pump-fuel
#   ch 3:    valve replaces valve-missing
#   ch 4:    pump-house-roof
#   ch 5:    boiler-lit replaces boiler-cold
#   ch 6:    water-truck
#   ch 7/8:  tower-water-7 (painted top line) / tower-water-8 (brim full)
#            tower-water-1 to -6 are the in-between heights (show exactly one)
#   ch 8:    well-water and tap-running
# Every node together is under 30,000 triangles (alternatives such as the cut and
# patched pipe are never shown together); under 2 MB. Run:
#   blender -b --python tools/blender/water-works.py -- --root . [--render DIR]
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/models/wasteland/scrapdome/water-works.glb')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='', help='folder for the nine chapter pictures')
parser.add_argument('--samples', type=int, default=48)
parser.add_argument('--only', default='', help='comma list of chapters to render, for quick tests')
parser.add_argument('--cam', default='', help='camera x,y,z in front-view metres, for close looks')
parser.add_argument('--target', default='', help='camera target x,y,z in front-view metres')
parser.add_argument('--res', default='640,480')
parser.add_argument('--closeups', action='store_true', help='also render the close-up pictures')
parser.add_argument('--no-chapters', action='store_true')
parser.add_argument('--close-only', default='', help='comma list of close-up names, for quick tests')
parser.add_argument('--lens', type=float, default=0.0)
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / options.out
BUILD = root / 'art-build/water-works'
NATIVE = BUILD / 'water-works.blend'
if options.paths_only:
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [str(OUT)], 'json': []}))
    sys.exit(0)

import random
import numpy as np
import bpy
from mathutils import Vector, Matrix

V = Vector
rnd = random.Random(1979)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
BUILD.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------------ textures
# Tileable painted textures made with plain noise. Colours are written as the
# screen colours we want (sRGB), saved as JPEG so the GLB stays small.

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

def mix(a, b, t):
    return a * (1 - t[..., None]) + np.array(b) * t[..., None] if np.ndim(a) == 3 else \
        np.array(a) * (1 - t[..., None]) + np.array(b) * t[..., None]

def dot(img, S, cx, cy, r, light, dark):
    yy, xx = np.mgrid[0:S, 0:S]
    dx = ((xx - cx + S / 2) % S) - S / 2; dy = ((yy - cy + S / 2) % S) - S / 2
    d = np.hypot(dx, dy)
    ring = (d < r) & (d > r * .55)
    core = d <= r * .55
    img[ring] *= dark
    img[core] = np.clip(img[core] * light, 0, 1)

def streaks(S, rng, strength=1.0):
    s = rng.standard_normal(S)
    s = np.convolve(np.r_[s[-6:], s, s[:6]], np.ones(5) / 5, 'same')[6:-6]
    s = (s - s.mean()) / (s.std() + 1e-9)
    slow = noise(S, 1.4, rng)
    return np.clip(s[None, :] * (.5 + .5 * np.tanh(slow)) * strength, -2, 2)

def rust_texture(S, seed, base, rust_amount=.55, seams=True, rivets=True, streak=.5):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.7, rng), noise(S, 1.1, rng), noise(S, .5, rng)
    img = np.array(base, np.float32) + .028 * n3[..., None]
    mask = smooth(-.7 + (.55 - rust_amount) * 2.2, .55, n1 * .8 + n2 * .45)
    orange = mix(np.zeros((S, S, 3)) + (.46, .21, .075), (.27, .10, .045), smooth(-.4, 1.1, n2))
    img = img * (1 - mask[..., None] * .93) + (orange + .035 * n3[..., None]) * mask[..., None] * .93
    img *= 1 - .17 * np.clip(streaks(S, rng, streak), 0, 1.4)[..., None]
    img *= 1 + .05 * noise(S, .3, rng)[..., None]
    pits = smooth(1.3, 2.2, noise(S, .35, rng))
    img *= 1 - .35 * pits[..., None]
    if seams:
        for y in (0, S // 2):
            rows = (np.arange(S) - y) % S
            groove = np.where(rows < 3, .42, np.where(rows < 5, 1.22, 1.0))
            img *= groove[:, None, None]
            if rivets:
                for x in range(S // 16 // 2, S, S // 16):
                    for off in (9,):
                        dot(img, S, x + rng.integers(-1, 2), y + off, S * .0095, 1.25, .55)
    return np.clip(img, .01, .95)

def sheet_texture(S, seed):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.6, rng), noise(S, 1.0, rng), noise(S, .5, rng)
    img = np.zeros((S, S, 3), np.float32) + (.40, .385, .345) + .03 * n3[..., None]
    col = streaks(S, rng, 1.0)
    mask = smooth(.15, 1.0, n1 * .7 + n2 * .4 + np.clip(col, 0, 2) * .55)
    orange = np.zeros((S, S, 3)) + (.44, .20, .08)
    orange = orange * (.75 + .25 * smooth(-1, 1, n2))[..., None]
    img = img * (1 - mask[..., None] * .88) + orange * mask[..., None] * .88
    img *= 1 - .22 * np.clip(-col, 0, 1.5)[..., None]
    for y in (S // 4, 3 * S // 4):
        for x in range(0, S, S // 12):
            dot(img, S, x + S // 24, y, S * .008, 1.1, .5)
    return np.clip(img, .01, .95)

def iron_texture(S, seed):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.4, rng), noise(S, .9, rng), noise(S, .4, rng)
    img = np.zeros((S, S, 3), np.float32) + (.065, .06, .055) + .02 * n3[..., None]
    img += .03 * smooth(.2, 1.4, n1)[..., None]
    spec = smooth(1.0, 2.0, n2)
    img = img * (1 - spec[..., None] * .5) + np.array((.34, .15, .06)) * spec[..., None] * .5
    oil = smooth(.5, 1.6, noise(S, 1.8, rng))
    img *= 1 - .35 * oil[..., None]
    return np.clip(img, .01, .9)

def stone_texture(S, seed):
    rng = np.random.default_rng(seed)
    img = np.zeros((S, S, 3), np.float32)
    mortar = np.array((.16, .145, .12))
    palette = [(.37, .335, .285), (.31, .295, .265), (.43, .37, .29), (.25, .24, .22), (.40, .34, .26)]
    rows = S // 64
    n2 = noise(S, 1.2, rng); n3 = noise(S, .5, rng)
    img[:] = mortar
    for r in range(rows):
        y0 = r * 64
        x = int(rng.integers(0, 60))
        widths = []
        total = 0
        while total < S:
            w = int(rng.integers(90, 170))
            if S - total - w < 80: w = S - total
            widths.append(w); total += w
        for w in widths:
            c = np.array(palette[rng.integers(0, len(palette))]) * rng.uniform(.82, 1.12)
            xs = (np.arange(x + 3, x + w - 3)) % S
            ys = np.arange(y0 + 3, y0 + 61)
            block = np.zeros((len(ys), len(xs), 3)) + c
            block += (.04 * n3[np.ix_(ys, xs)])[..., None]
            block *= (1 + .10 * n2[np.ix_(ys, xs)])[..., None]
            edge = np.minimum.reduce([np.arange(len(ys))[:, None] + 0 * np.arange(len(xs))[None, :],
                                      (len(ys) - 1 - np.arange(len(ys)))[:, None] + 0 * np.arange(len(xs))[None, :],
                                      np.arange(len(xs))[None, :] + 0 * np.arange(len(ys))[:, None],
                                      (len(xs) - 1 - np.arange(len(xs)))[None, :] + 0 * np.arange(len(ys))[:, None]])
            block *= (.78 + .22 * np.clip(edge / 6, 0, 1))[..., None]
            img[np.ix_(ys, xs)] = block
            x += w
    img *= 1 - .22 * smooth(.4, 1.6, noise(S, 1.6, rng))[..., None]
    return np.clip(img, .01, .9)

def wood_texture(S, seed):
    rng = np.random.default_rng(seed)
    n1 = noise(S, 1.3, rng); n3 = noise(S, .5, rng)
    img = np.zeros((S, S, 3), np.float32)
    plank = S // 8
    for p in range(8):
        base = np.array((.30, .225, .15)) * rng.uniform(.75, 1.15)
        grey = np.array((.33, .30, .26))
        x0 = p * plank
        g = rng.standard_normal(plank)
        g = np.convolve(g, np.ones(3) / 3, 'same')
        weather = np.clip(.5 + .5 * g[None, :], 0, 1) * 0 + smooth(-.5, 1.3, n1[:, x0:x0 + plank])
        img[:, x0:x0 + plank] = base * (1 - weather[..., None] * .5) + grey * weather[..., None] * .5
        img[:, x0:x0 + plank] *= (1 + .09 * g[None, :, None] + .05 * n3[:, x0:x0 + plank, None])
        img[:, x0:x0 + 2] *= .32
    return np.clip(img, .01, .9)

def paint_texture(S, seed, color, chip=.5, grime=.4):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.5, rng), noise(S, 1.0, rng), noise(S, .5, rng)
    img = np.zeros((S, S, 3), np.float32) + color + .018 * n3[..., None]
    img *= 1 + .06 * n1[..., None]
    chipmask = smooth(.5 + (1 - chip) * .9, 1.4 + (1 - chip) * .9, n2 * .7 + n3 * .5 + n1 * .3)
    rust = np.zeros((S, S, 3)) + (.36, .16, .07)
    rust = rust * (.7 + .3 * smooth(-1, 1, n1))[..., None]
    img = img * (1 - chipmask[..., None]) + rust * chipmask[..., None]
    col = streaks(S, rng, grime)
    img *= 1 - .20 * np.clip(col, 0, 1.4)[..., None]
    return np.clip(img, .01, .9)

def concrete_texture(S, seed):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.5, rng), noise(S, 1.0, rng), noise(S, .45, rng)
    img = np.zeros((S, S, 3), np.float32) + (.42, .405, .37) + .03 * n3[..., None]
    img *= 1 + .12 * n1[..., None]
    stain = smooth(.3, 1.6, n2)
    img = img * (1 - .35 * stain[..., None]) + np.array((.20, .14, .09)) * (.35 * stain[..., None])
    for _ in range(6):
        x, y = rng.integers(0, S), rng.integers(0, S)
        ang = rng.uniform(0, 6.28)
        for _s in range(int(S * .35)):
            ang += rng.normal(0, .25)
            x = (x + math.cos(ang)) % S; y = (y + math.sin(ang)) % S
            img[int(y), int(x)] *= .35
    return np.clip(img, .01, .9)

def zinc_texture(S, seed):
    """New galvanised sheet: pale and clean, with a little weather."""
    rng = np.random.default_rng(seed)
    n1, n3 = noise(S, 1.4, rng), noise(S, .5, rng)
    img = np.zeros((S, S, 3), np.float32) + (.60, .62, .60) + .025 * n3[..., None]
    img *= 1 + .06 * n1[..., None]
    img *= 1 - .12 * np.clip(streaks(S, rng, .8), 0, 1.4)[..., None]
    spot = smooth(1.5, 2.3, noise(S, .8, rng))
    img = img * (1 - spot[..., None] * .6) + np.array((.38, .2, .09)) * spot[..., None] * .6
    return np.clip(img, .01, .95)

def dirt_texture(S, seed):
    rng = np.random.default_rng(seed)
    n1, n2, n3 = noise(S, 1.8, rng), noise(S, 1.0, rng), noise(S, .45, rng)
    img = np.zeros((S, S, 3), np.float32) + (.52, .44, .335)
    img *= 1 + .07 * n1[..., None] + .07 * n2[..., None] + .08 * n3[..., None]
    img *= 1 - .18 * smooth(.9, 2.2, noise(S, 1.4, rng))[..., None]
    return np.clip(img, .02, .9)

FONT = {
 'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
 'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
 'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
 'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
 'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
 '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
 '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
 '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
 '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
 '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
 '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
 '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
 '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
}

def glyph(ch, scale):
    rows = FONT[ch]
    g = np.array([[int(c) for c in r] for r in rows], np.float32)
    return np.kron(g, np.ones((scale, scale), np.float32))

def stamp(mask, text, x, y, scale, gap=1):
    """mask[row from top, col]; draws text with its top-left at (x, y)."""
    for ch in text:
        g = glyph(ch, scale)
        h, w = g.shape
        mask[y:y + h, x:x + w] = np.maximum(mask[y:y + h, x:x + w], g)
        x += w + gap * scale

LEVELS = [.07, .19, .31, .43, .55, .67, .82, .955]   # share of the tank height, levels 1 to 8

def gauge_texture():
    """Painted level strip. Rows from the bottom (tank floor); u is across."""
    W, H = 128, 1024
    rng = np.random.default_rng(31)
    img = np.zeros((H, W, 3), np.float32) + (.62, .58, .46)
    big = np.kron(noise(128, 1.3, rng), np.ones((8, 1)))[:H, :]
    img *= 1 + .10 * big[..., None]
    ink = np.zeros((H, W), np.float32)
    red = np.zeros((H, W), np.float32)
    top_row = lambda f: int(H * (1 - f))       # row from the top
    for i, f in enumerate(LEVELS):
        r = top_row(f)
        if i == 6:
            red[r - 5:r + 6, :] = 1
        else:
            ink[r - 3:r + 4, 0:56] = 1
        stamp(ink, str(i + 1), 64, r - 21, 6)
    img = img * (1 - ink[..., None] * .92) + np.array((.05, .045, .04)) * ink[..., None] * .92
    img = img * (1 - red[..., None]) + np.array((.62, .06, .04)) * red[..., None]
    chip = smooth(1.2, 2.0, np.kron(noise(128, .8, rng), np.ones((8, 1)))[:H, :])
    img = img * (1 - chip[..., None] * .8) + np.array((.34, .15, .07)) * chip[..., None] * .8
    img[:, :4] *= .5; img[:, -4:] *= .5
    return np.clip(img[::-1], .01, .95)       # to bottom-origin rows

def water_stencil_texture():
    """Faded blue panel with a stencilled WATER; u runs up the tank, v along it."""
    Wt, Ht = 512, 160
    rng = np.random.default_rng(17)
    big = noise(512, 1.3, rng)[:Ht, :Wt]
    img = np.zeros((Ht, Wt, 3), np.float32) + (.27, .385, .42)
    img *= 1 + .09 * big[..., None]
    ink = np.zeros((Ht, Wt), np.float32)
    stamp(ink, 'WATER', 62, 26, 14, 1)
    chip = smooth(.6, 1.7, noise(512, .9, rng)[:Ht, :Wt])
    img = img * (1 - ink[..., None] * .9) + np.array((.60, .58, .5)) * ink[..., None] * .9
    img = img * (1 - chip[..., None] * .85) + np.array((.34, .15, .065)) * chip[..., None] * .85
    img *= 1 - .18 * np.clip(streaks(512, rng, .9)[:Ht, :Wt], 0, 1.4)[..., None]
    # text reads along the tank (v) and up the tank (u): rotate
    tex = img[::-1].transpose(1, 0, 2)          # [v, u]; text row from top becomes u from the top
    return np.clip(tex, .01, .95)

def save_jpeg(name, arr, quality=60):
    h, w, _ = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(arr, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    path = BUILD / f'{name}.jpg'
    img.filepath_raw = str(path); img.file_format = 'JPEG'
    img.save(quality=quality)
    bpy.data.images.remove(img)
    return bpy.data.images.load(str(path))

def top_origin(a):            # tileable textures are drawn with row 0 at the top
    return a[::-1]

TEX = {
    'plate': (lambda: save_jpeg('plate', top_origin(rust_texture(512, 3, (.21, .185, .155), .66))), 2.0),
    'sheet': (lambda: save_jpeg('sheet', top_origin(sheet_texture(512, 5))), 2.0),
    'iron': (lambda: save_jpeg('iron', top_origin(iron_texture(256, 7))), 1.5),
    'stone': (lambda: save_jpeg('stone', top_origin(stone_texture(512, 9))), 2.0),
    'wood': (lambda: save_jpeg('wood', top_origin(wood_texture(256, 11))), 2.0),
    'red': (lambda: save_jpeg('red', top_origin(paint_texture(256, 13, (.40, .045, .03), .6, .5))), 1.0),
    'blue': (lambda: save_jpeg('blue', top_origin(paint_texture(256, 15, (.26, .37, .40), .5, .6))), 1.5),
    'olive': (lambda: save_jpeg('olive', top_origin(paint_texture(256, 19, (.20, .235, .09), .5, .5))), 1.0),
    'concrete': (lambda: save_jpeg('concrete', top_origin(concrete_texture(256, 21))), 2.0),
    'zinc': (lambda: save_jpeg('zinc', top_origin(zinc_texture(256, 27))), 2.0),
    'gauge': (lambda: save_jpeg('gauge', gauge_texture()), 1.0),
    'stencil': (lambda: save_jpeg('stencil', water_stencil_texture()), 1.0),
}
TILE = {k: v[1] for k, v in TEX.items()}
for k in ('rubber', 'ash', 'rope', 'glass', 'water', 'ember', 'cream', 'smoke', 'watertop', 'stream', 'float',
          'glow', 'wet', 'bare', 'brightred', 'ember2', 'steel', 'silver'):
    TILE[k] = 1.0

def make_material(name, texture=None, color=None, rough=.92, alpha=None, emit=None, vertex=True):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = 0.0
    source = None
    if texture:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = texture
        tex.interpolation = 'Linear'
        source = tex.outputs['Color']
    else:
        source = None
        b.inputs['Base Color'].default_value = (*color, 1)
    if vertex:
        attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs[0].default_value = 1.0
        if source is not None:
            nt.links.new(source, mx.inputs[6])
        else:
            mx.inputs[6].default_value = (*color, 1)
        nt.links.new(attr.outputs['Color'], mx.inputs[7])
        nt.links.new(mx.outputs[2], b.inputs['Base Color'])
    elif source is not None:
        nt.links.new(source, b.inputs['Base Color'])
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1)
        b.inputs['Emission Strength'].default_value = emit[1]
    m.use_backface_culling = False
    return m

MATS = {}
for key, (maker, _tile) in TEX.items():
    MATS[key] = make_material(key, texture=maker(), vertex=key not in ('gauge', 'stencil'),
                              rough=.88 if key != 'iron' else .7)
MATS['rubber'] = make_material('rubber', color=(.028, .027, .026), rough=.95)
MATS['ash'] = make_material('ash', color=(.016, .014, .012), rough=1.0, vertex=False)
MATS['rope'] = make_material('rope', color=(.40, .30, .17), rough=1.0)
MATS['glass'] = make_material('glass', color=(.045, .06, .06), rough=.25, vertex=False)
MATS['cream'] = make_material('cream', color=(.60, .56, .44), rough=.8)
MATS['water'] = make_material('water', color=(.015, .06, .075), rough=.03, alpha=.93, vertex=False)
MATS['watertop'] = make_material('watertop', color=(.12, .28, .31), rough=.02, alpha=.96, vertex=False)
MATS['stream'] = make_material('stream', color=(.80, .91, .97), rough=.02, alpha=.82, vertex=False, emit=((.6, .8, .92), .35))
MATS['float'] = make_material('float', color=(1.0, .3, .02), rough=.5, vertex=False, emit=((1.0, .28, .0), 1.2))
MATS['glow'] = make_material('glow', color=(.05, .01, .0), rough=1.0, alpha=.12, vertex=False, emit=((1.0, .22, .0), .7))
MATS['wet'] = make_material('wet', color=(.055, .04, .028), rough=.3, alpha=.62, vertex=False)
MATS['bare'] = make_material('bare', color=(.5, .48, .43), rough=.5)
MATS['brightred'] = make_material('brightred', color=(.30, .004, .003), rough=.5)
MATS['steel'] = make_material('steel', color=(.085, .09, .095), rough=.55)
MATS['silver'] = make_material('silver', color=(.30, .31, .33), rough=.3)
MATS['ember'] = make_material('ember', color=(.03, .005, .0), rough=.6, vertex=False, emit=((1.0, .06, .0), .45))
MATS['ember2'] = make_material('ember2', color=(.05, .02, .0), rough=.6, vertex=False, emit=((1.0, .25, .0), .6))

# ----------------------------------------------------------------- geometry
# Everything below is written as it looks from the front (viewer at -Z, well on
# the left, tap on the right). `mirror` turns that into the glTF frame so the
# group reads the same way round from the gate. Faces are turned to point out
# of the solid they belong to after the mirror, so winding is always right.

def mirror(p):
    return V((-p.x, p.y, p.z))

def newell(pts):
    n = V((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n.x += (a.y - b.y) * (a.z + b.z)
        n.y += (a.z - b.z) * (a.x + b.x)
        n.z += (a.x - b.x) * (a.y + b.y)
    return n

def planar_uv(pts, n, tile, off):
    up = V((0, 1, 0))
    if abs(n.y) < .75:
        e2 = (up - n * up.dot(n)).normalized(); e1 = e2.cross(n)
    else:
        e1 = (V((1, 0, 0)) - n * n.x).normalized(); e2 = n.cross(e1)
    return [(((p - pts[0]).dot(e1)) / tile + off[0], ((p - pts[0]).dot(e2)) / tile + off[1]) for p in pts]

def jt(lo=.78, hi=1.12):
    v = rnd.uniform(lo, hi)
    return (v, v * rnd.uniform(.94, 1.02), v * rnd.uniform(.86, 1.02))

def dust(y):
    h = min(1.0, max(0.0, y / 1.25)); h = h * h * (3 - 2 * h)
    return (.58 + .42 * h, .50 + .50 * h, .40 + .60 * h)

class Node:
    def __init__(self, name):
        self.name = name; self.parts = {}; self.order = []

    def part(self, mat):
        if mat not in self.parts:
            self.parts[mat] = dict(v=[], c=[], f=[], uv=[], s=[]); self.order.append(mat)
        return self.parts[mat]

    def add(self, mat, verts, faces, uvs=None, hints=None, smooth_=False, tint=None):
        part = self.part(mat)
        tint = jt() if tint is None else (tint, tint, tint) if isinstance(tint, (int, float)) else tint
        g = [mirror(V(p)) for p in verts]
        base = len(part['v'])
        part['v'].extend(g)
        for p in g:
            d = dust(p.y)
            part['c'].append((d[0] * tint[0], d[1] * tint[1], d[2] * tint[2], 1.0))
        off = (rnd.random() * 4, rnd.random() * 4)
        for fi, face in enumerate(faces):
            idx = list(face)
            pts = [g[i] for i in idx]
            n = newell(pts)
            if n.length < 1e-10:
                continue
            fuv = uvs[fi] if uvs and uvs[fi] is not None else None
            hint = hints[fi] if hints else None
            if hint is not None:
                if n.dot(sum(pts, V()) / len(pts) - mirror(V(hint))) < 0:
                    idx.reverse(); pts.reverse(); n = -n
                    if fuv: fuv = list(reversed(fuv))
            if fuv is None:
                fuv = planar_uv(pts, n.normalized(), TILE[mat], off)
            part['f'].append([base + i for i in idx]); part['uv'].append(fuv); part['s'].append(smooth_)

    def poly(self, mat, pts, hint=None, tint=None, uv=None):
        self.add(mat, pts, [list(range(len(pts)))], [uv] if uv else None, [hint] if hint is not None else None, False, tint)

    def box_corners(self, mat, c, R, half, tint=None):
        hx, hy, hz = half
        pts = [c + R @ V(p) for p in [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
                                      (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]]
        faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]
        self.add(mat, pts, faces, None, [c] * 6, False, tint)

    def box(self, mat, c, size, ry=0.0, rx=0.0, rz=0.0, tint=None):
        R = (Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X') @ Matrix.Rotation(rz, 3, 'Z'))
        self.box_corners(mat, V(c), R, (size[0] / 2, size[1] / 2, size[2] / 2), tint)

    def beam(self, mat, p0, p1, w, h, up=(0, 1, 0), tint=None):
        p0, p1 = V(p0), V(p1)
        a = (p1 - p0).normalized()
        u = V(up)
        if abs(a.dot(u)) > .95: u = V((1, 0, 0))
        side = a.cross(u).normalized(); upv = side.cross(a).normalized()
        R = Matrix((side, upv, a)).transposed()
        self.box_corners(mat, (p0 + p1) / 2, R, (w / 2, h / 2, (p1 - p0).length / 2), tint)

    def prism(self, mat, p0, p1, r0, r1=None, n=8, caps=(True, True), tint=None, smooth_=True, rot=0.0, span=False):
        p0, p1 = V(p0), V(p1); r1 = r0 if r1 is None else r1
        a = (p1 - p0); L = a.length; a.normalize()
        ref = V((0, 1, 0)) if abs(a.y) < .9 else V((1, 0, 0))
        u = a.cross(ref).normalized(); v = a.cross(u).normalized()
        tile = TILE[mat]
        verts, faces, uvs, hints = [], [], [], []
        for k in range(n + 1):
            t = rot + 2 * math.pi * k / n
            d = u * math.cos(t) + v * math.sin(t)
            verts += [p0 + d * r0, p1 + d * r1]
        circ = 2 * math.pi * (r0 + r1) / 2
        mid = (p0 + p1) / 2
        for k in range(n):
            i = 2 * k
            if span:
                uu0, uu1, vv1 = k / n, (k + 1) / n, 1.0
                vv0 = 0.0
            else:
                uu0, uu1 = k / n * circ / tile, (k + 1) / n * circ / tile; vv0 = 0.0; vv1 = L / tile
            if r1 < 1e-6:
                faces.append([i, i + 2, i + 3]); uvs.append([(uu0, vv0), (uu1, vv0), ((uu0 + uu1) / 2, vv1)])
            else:
                faces.append([i, i + 2, i + 3, i + 1]); uvs.append([(uu0, vv0), (uu1, vv0), (uu1, vv1), (uu0, vv1)])
            hints.append(mid)
        self.add(mat, verts, faces, uvs, hints, smooth_, tint)
        for end, (p, r, cap) in enumerate([(p0, r0, caps[0]), (p1, r1, caps[1])]):
            if cap and r > 1e-6:
                pts = [p + (u * math.cos(rot + 2 * math.pi * k / n) + v * math.sin(rot + 2 * math.pi * k / n)) * r for k in range(n)]
                self.add(mat, pts, [list(range(n))], None, [p1 if end == 0 else p0], False, tint)

    def sphere(self, mat, c, r, n=8, rings=4, squash=1.0, tint=None):
        c = V(c)
        verts = [c + V((0, r * squash, 0))]
        for i in range(1, rings):
            ph = math.pi * i / rings
            for k in range(n):
                th = TAU * k / n
                verts.append(c + V((r * math.sin(ph) * math.cos(th), r * math.cos(ph) * squash, r * math.sin(ph) * math.sin(th))))
        verts.append(c - V((0, r * squash, 0)))
        faces = [[0, 1 + (k + 1) % n, 1 + k] for k in range(n)]
        for i in range(rings - 2):
            a = 1 + i * n
            for k in range(n):
                faces.append([a + k, a + (k + 1) % n, a + n + (k + 1) % n, a + n + k])
        last = len(verts) - 1; a = 1 + (rings - 2) * n
        faces += [[last, a + k, a + (k + 1) % n] for k in range(n)]
        self.add(mat, verts, faces, None, [c] * len(faces), True, tint)

    def disc(self, mat, c, axis, r, n=12, tint=None):
        c = V(c); a = V(axis).normalized()
        ref = V((0, 1, 0)) if abs(a.y) < .9 else V((1, 0, 0))
        u = a.cross(ref).normalized(); v = a.cross(u).normalized()
        pts = [c + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * r for k in range(n)]
        self.add(mat, pts, [list(range(n))], None, [c - a], False, tint)

    def ring(self, mat, c, axis, rin, rout, length, n=12, a0=0.0, a1=2 * math.pi, tint=None, smooth_=True,
             span=False, basis=None, ends=True):
        c = V(c); a = V(axis).normalized()
        if basis:
            u, v = V(basis[0]), V(basis[1])
        else:
            ref = V((0, 1, 0)) if abs(a.y) < .9 else V((1, 0, 0))
            u = (ref - a * ref.dot(a)).normalized(); v = a.cross(u).normalized()
        segs = max(2, int(math.ceil(n * (a1 - a0) / (2 * math.pi))))
        full = abs((a1 - a0) - 2 * math.pi) < 1e-6
        tile = TILE[mat]
        def pt(r, t, z): return c + (u * math.cos(t) + v * math.sin(t)) * r + a * z
        verts, faces, uvs, hints = [], [], [], []
        zs = (-length / 2, length / 2)
        ang = [a0 + (a1 - a0) * k / segs for k in range(segs + 1)]
        for t in ang:
            for r in (rout, rin):
                for z in zs: verts.append(pt(r, t, z))
        # vertex index: (k, r_index, z_index) -> k*4 + r_index*2 + z_index
        def vi(k, ri, zi): return k * 4 + ri * 2 + zi
        smooth_faces = 0
        for k in range(segs):
            arc_o = (a1 - a0) / segs * rout; arc_i = (a1 - a0) / segs * rin
            if span:
                u0, u1, v0, v1 = k / segs, (k + 1) / segs, 0.0, 1.0
                ui0, ui1 = u0, u1
            else:
                u0, u1 = k * arc_o / tile, (k + 1) * arc_o / tile; v0, v1 = 0.0, length / tile
                ui0, ui1 = k * arc_i / tile, (k + 1) * arc_i / tile
            mid_t = (ang[k] + ang[k + 1]) / 2
            faces.append([vi(k, 0, 0), vi(k + 1, 0, 0), vi(k + 1, 0, 1), vi(k, 0, 1)])
            uvs.append([(u0, v0), (u1, v0), (u1, v1), (u0, v1)]); hints.append(c)
            faces.append([vi(k, 1, 0), vi(k + 1, 1, 0), vi(k + 1, 1, 1), vi(k, 1, 1)])
            uvs.append([(ui0, v0), (ui1, v0), (ui1, v1), (ui0, v1)])
            hints.append(c + (u * math.cos(mid_t) + v * math.sin(mid_t)) * (rout + 1.0))
        self.add(mat, verts, faces, uvs, hints, smooth_, tint)
        flat_v, flat_f, flat_h = [], [], []
        for zi, z in enumerate(zs):
            for k in range(segs):
                base = len(flat_v)
                flat_v += [pt(rout, ang[k], z), pt(rout, ang[k + 1], z), pt(rin, ang[k + 1], z), pt(rin, ang[k], z)]
                flat_f.append([base, base + 1, base + 2, base + 3])
                flat_h.append(c + a * (zs[1 - zi]))
        if ends and not full:
            for t, tt in ((a0, a0 + .3 * (a1 - a0) / segs), (a1, a1 - .3 * (a1 - a0) / segs)):
                base = len(flat_v)
                flat_v += [pt(rout, t, zs[0]), pt(rout, t, zs[1]), pt(rin, t, zs[1]), pt(rin, t, zs[0])]
                flat_f.append([base, base + 1, base + 2, base + 3])
                flat_h.append(c + (u * math.cos(tt) + v * math.sin(tt)) * ((rin + rout) / 2))
        self.add(mat, flat_v, flat_f, None, flat_h, False, tint)

    def tube(self, mat, pts, r, n=8, caps=(True, True), tint=None, smooth_=True):
        pts = [V(p) for p in pts]
        m = len(pts)
        dirs = [(pts[i + 1] - pts[i]).normalized() for i in range(m - 1)]
        tans = [dirs[0]] + [(dirs[i - 1] + dirs[i]).normalized() for i in range(1, m - 1)] + [dirs[-1]]
        ref = V((0, 1, 0)) if abs(tans[0].y) < .9 else V((1, 0, 0))
        u = tans[0].cross(ref).normalized()
        verts, faces, uvs, hints = [], [], [], []
        tile = TILE[mat]
        run = 0.0
        frames = []
        for i in range(m):
            t = tans[i]
            u = (u - t * u.dot(t)).normalized(); v = t.cross(u).normalized()
            scale = 1.0 / max(.6, t.dot(dirs[min(i, m - 2)]))
            frames.append((u, v))
            for k in range(n + 1):
                th = 2 * math.pi * k / n
                verts.append(pts[i] + (u * math.cos(th) + v * math.sin(th)) * r * scale)
        circ = 2 * math.pi * r
        lens = [0.0]
        for i in range(1, m): lens.append(lens[-1] + (pts[i] - pts[i - 1]).length)
        for i in range(m - 1):
            for k in range(n):
                a0_, a1_ = i * (n + 1) + k, i * (n + 1) + k + 1
                b0_, b1_ = (i + 1) * (n + 1) + k, (i + 1) * (n + 1) + k + 1
                faces.append([a0_, a1_, b1_, b0_])
                uvs.append([(k / n * circ / tile, lens[i] / tile), ((k + 1) / n * circ / tile, lens[i] / tile),
                            ((k + 1) / n * circ / tile, lens[i + 1] / tile), (k / n * circ / tile, lens[i + 1] / tile)])
                hints.append((pts[i] + pts[i + 1]) / 2)
        self.add(mat, verts, faces, uvs, hints, smooth_, tint)
        for end in (0, 1):
            if caps[end]:
                i = 0 if end == 0 else m - 1
                u_, v_ = frames[i]
                ring_pts = [pts[i] + (u_ * math.cos(2 * math.pi * k / n) + v_ * math.sin(2 * math.pi * k / n)) * r for k in range(n)]
                self.add(mat, ring_pts, [list(range(n))], None, [pts[1] if end == 0 else pts[-2]], False, tint)

    def sheet(self, mat, origin, udir, vdir, w, h, ridge=.075, depth=.026, tint=None, vseg=1, wob=0.0):
        origin, udir, vdir = V(origin), V(udir).normalized(), V(vdir).normalized()
        nrm = udir.cross(vdir).normalized()
        cols = max(1, int(round(w / ridge))) if depth > 0 else 1
        tile = TILE[mat]
        ox, oy = rnd.random() * 4, rnd.random() * 4
        verts, faces, uvs = [], [], []
        for i in range(cols + 1):
            x = w * i / cols
            off = depth * ((i % 2) - .5) if depth > 0 else 0.0
            for j in range(vseg + 1):
                y = h * j / vseg
                bump = wob * math.sin(i * 1.3 + j * 2.1) if wob else 0.0
                verts.append(origin + udir * x + vdir * y + nrm * (off + bump))
        for i in range(cols):
            for j in range(vseg):
                a_ = i * (vseg + 1) + j; b_ = (i + 1) * (vseg + 1) + j
                faces.append([a_, b_, b_ + 1, a_ + 1])
                x0, x1 = w * i / cols, w * (i + 1) / cols
                y0, y1 = h * j / vseg, h * (j + 1) / vseg
                uvs.append([(x0 / tile + ox, y0 / tile + oy), (x1 / tile + ox, y0 / tile + oy),
                            (x1 / tile + ox, y1 / tile + oy), (x0 / tile + ox, y1 / tile + oy)])
        self.add(mat, verts, faces, uvs, None, False, tint)

    def bolt(self, mat, pos, normal, r=.032, h=.028, n=4):
        # a low four-sided rivet head: cheap, and it reads as a bolt from a few metres
        pos, nm = V(pos), V(normal).normalized()
        self.prism(mat, pos, pos + nm * h, r, 0.0, n=n, caps=(False, False), smooth_=False, tint=(.85, .85, .85), rot=.4)

    def shift(self, dx):
        # move the whole node along the front-view X axis (the stored points are already mirrored)
        for part in self.parts.values():
            part['v'] = [V((v.x - dx, v.y, v.z)) for v in part['v']]

    def build(self):
        mesh = bpy.data.meshes.new(self.name)
        verts, faces, uvs, mats_idx, smooths, cols = [], [], [], [], [], []
        for mi, mat in enumerate(self.order):
            p = self.parts[mat]
            base = len(verts)
            verts += [(v.x, -v.z, v.y) for v in p['v']]
            cols += p['c']
            for f, uv, s in zip(p['f'], p['uv'], p['s']):
                faces.append([base + i for i in f]); uvs.append(uv); mats_idx.append(mi); smooths.append(s)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        for mat in self.order:
            mesh.materials.append(MATS[mat])
        layer = mesh.uv_layers.new(name='UVMap')
        for poly, uv in zip(mesh.polygons, uvs):
            for loop, coord in zip(poly.loop_indices, uv): layer.data[loop].uv = coord
        mesh.polygons.foreach_set('material_index', mats_idx)
        mesh.polygons.foreach_set('use_smooth', smooths)
        attr = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
        for poly in mesh.polygons:
            for loop, vert in zip(poly.loop_indices, poly.vertices): attr.data[loop].color = cols[vert]
        mesh.update()
        ob = bpy.data.objects.new(self.name, mesh)
        scene.collection.objects.link(ob)
        return ob

# ---------------------------------------------------------------- shared bits
MZ, MY, MR = 1.25, .90, .20          # main pipe: z, height of its middle, radius
TAU = 2 * math.pi

def flange(n, x, y=MY, z=MZ, axis=(1, 0, 0), r=.31, bolts=4):
    n.ring('plate', (x, y, z), axis, MR * .92, r, .07, n=12, smooth_=False)
    a = V(axis).normalized()
    ref = V((0, 1, 0)) if abs(a.y) < .9 else V((1, 0, 0))
    u = a.cross(ref).normalized(); v = a.cross(u).normalized()
    for k in range(bolts):
        t = TAU * k / bolts + .2
        d = u * math.cos(t) + v * math.sin(t)
        n.bolt('iron', V((x, y, z)) + d * (r - .05) + a * .035, a, r=.026, h=.03, n=5)

def trestle(n, x, z=MZ, y=MY):
    n.beam('iron', (x, 0, z - .34), (x, y - MR - .02, z - .12), .09, .09)
    n.beam('iron', (x, 0, z + .34), (x, y - MR - .02, z + .12), .09, .09)
    n.box('plate', (x, y - MR - .03, z), (.34, .05, .34))
    n.box('plate', (x, y + MR + .02, z), (.07, .04, .46), tint=.9)

def jerry_can(n, pos, ry, mat='olive', lean=0.0):
    x, y, z = pos
    R = Matrix.Rotation(ry, 3, 'Y')
    def at(dx, dy, dz): return V(pos) + R @ V((dx, dy, dz))
    n.box(mat, at(0, .26, 0), (.36, .52, .17), ry=ry)
    n.box(mat, at(0, .56, -.0), (.2, .08, .17), ry=ry)               # shoulder / handle block
    n.box('iron', at(0, .63, 0), (.24, .06, .035), ry=ry)             # handle bar
    n.prism('iron', at(.11, .53, -.04), at(.11, .66, -.04), .032, .028, n=6)   # spout
    n.box('plate', at(0, .27, -.088), (.28, .018, .01), ry=ry + .7, tint=.7)  # pressed X
    n.box('plate', at(0, .27, -.088), (.28, .018, .01), ry=ry - .7, tint=.7)

# ---------------------------------------------------------------- the nodes
nodes = []

def block_ring(n, mat, cx, cz, y0, y1, rin, rout, count, phase, jit=.03):
    for i in range(count):
        a0 = phase + i * TAU / count + rnd.uniform(-.02, .02)
        a1 = phase + (i + 1) * TAU / count - .025
        ro = rout + rnd.uniform(-jit, jit); ri = rin + rnd.uniform(-.015, .015)
        yy1 = y1 + rnd.uniform(-.03, .03)
        c = lambda r, a, y: V((cx + r * math.cos(a), y, cz + r * math.sin(a)))
        pts = [c(ri, a0, y0), c(ri, a1, y0), c(ro, a1, y0), c(ro, a0, y0),
               c(ri, a0, yy1), c(ri, a1, yy1), c(ro, a1, yy1), c(ro, a0, yy1)]
        center = sum(pts, V()) / 8
        faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
        n.add(mat, pts, faces, None, [center] * 6, False, jt(.7, 1.1))

WELL = V((-12.5, 0, 1.85))

def build_well():
    n = Node('well'); W = WELL
    for y0, y1, ph in ((0, .34, 0), (.34, .68, TAU / 28), (.68, 1.0, 0.0)):
        block_ring(n, 'stone', W.x, W.z, y0, y1, .70, 1.06, 12, ph)
    n.disc('ash', (W.x, .03, W.z), (0, 1, 0), .72, n=14)
    for s in (-1, 1):
        n.beam('wood', (W.x + s * 1.3, 0, W.z), (W.x + s * 1.24, 2.55, W.z), .17, .17)
        n.beam('wood', (W.x + s * 1.28, 1.45, W.z), (W.x + s * 2.15, 0, W.z + .15 * s), .1, .1)
        n.box('plate', (W.x + s * 1.3, .9, W.z + .09), (.2, .22, .02), tint=1.0)
    n.prism('wood', (W.x - 1.28, 2.18, W.z), (W.x + 1.28, 2.18, W.z), .075, n=7)
    n.prism('wood', (W.x - .7, 2.18, W.z), (W.x + .7, 2.18, W.z), .15, n=10)
    for k in range(3):
        n.ring('rope', (W.x - .35 + k * .05, 2.18, W.z), (1, 0, 0), .146, .165, .04, n=10, smooth_=False)
    n.beam('iron', (W.x + .7, 2.18, W.z), (W.x + .86, 1.8, W.z), .05, .05)
    n.prism('iron', (W.x + .86, 1.8, W.z), (W.x + 1.12, 1.8, W.z), .026, n=5)
    n.tube('rope', [(W.x, 2.04, W.z), (W.x, 1.8, W.z + .01), (W.x, 1.6, W.z)], .022, n=5)
    n.prism('iron', (W.x, 1.12, W.z), (W.x, 1.42, W.z), .14, .185, n=10, caps=(True, False))
    n.ring('plate', (W.x, 1.4, W.z), (0, 1, 0), .165, .195, .04, n=10)
    n.tube('iron', [(W.x + .185 * math.cos(t), 1.42 + .19 * math.sin(t), W.z) for t in [k * math.pi / 6 for k in range(7)]], .014, n=4)
    # a scrap sheet roof over the windlass, tilted back, and a wind shield
    n.sheet('sheet', (W.x - 1.55, 2.62, W.z - .9), (1, 0, 0), (0, .22, 1), 3.1, 2.0, vseg=2, wob=.012)
    n.beam('iron', (W.x - 1.4, 2.56, W.z - .6), (W.x - 1.4, 2.72, W.z + .9), .06, .06)
    n.beam('iron', (W.x + 1.4, 2.56, W.z - .6), (W.x + 1.4, 2.72, W.z + .9), .06, .06)
    n.sheet('sheet', (W.x - .8, .05, W.z + 1.0), (1, 0, 0), (0, 1, .12), 1.6, 1.6, vseg=2, wob=.01)
    for k in range(8):
        a = rnd.uniform(-1.9, 1.4)
        if abs(a) < .45 or abs(a - 0.0) < .0: a += .7
        r = rnd.uniform(1.35, 1.95)
        s = rnd.uniform(.18, .4)
        n.box('stone', (W.x + r * math.cos(a + 1.2), s * .4, W.z + r * math.sin(a + 1.2) * .9),
              (s, s * .8, s * rnd.uniform(.8, 1.2)), ry=rnd.uniform(0, 3), rx=rnd.uniform(-.2, .2), tint=jt(.7, 1.0))
    return n

def build_well_water():
    n = Node('well-water')
    W = WELL
    n.disc('water', (W.x, .86, W.z), (0, 1, 0), .69, n=14, tint=1.0)
    n.disc('watertop', (W.x, .862, W.z), (0, 1, 0), .69, n=14, tint=1.0)                  # lighter ring at the edge
    n.disc('water', (W.x, .866, W.z), (0, 1, 0), .5, n=14, tint=1.0)
    # the bucket is full and dripping back into the well
    n.disc('watertop', (W.x, 1.39, W.z), (0, 1, 0), .15, n=10, tint=1.0)
    for dx, dz in ((0, 0), (.07, .03), (-.06, -.05)):
        n.tube('stream', [(W.x + dx, 1.1, W.z + dz), (W.x + dx, .98, W.z + dz), (W.x + dx, .88, W.z + dz)], .014, n=4, caps=(False, False), tint=1.0)
    n.disc('stream', (W.x, .872, W.z), (0, 1, 0), .13, n=8, tint=1.0)
    return n

# ---- pump: an engine on a skid, belt to a pump, suction line from the well
PX, PZ = -7.9, 1.25

def build_pump():
    n = Node('pump')
    for s in (-1, 1):
        n.beam('iron', (-8.9, .09, PZ + s * .55), (-6.0, .09, PZ + s * .55), .14, .17)
    for x in (-8.8, -7.6, -6.4):
        n.box('iron', (x, .1, PZ), (.12, .14, 1.2))
    n.box('wood', (-7.45, .2, PZ), (2.9, .05, 1.05), tint=.95)
    n.box('iron', (PX, .52, PZ), (.9, .56, .62))                             # engine block
    n.box('plate', (PX - .05, .86, PZ), (.62, .22, .52), tint=1.05)           # head
    n.prism('iron', (PX - .22, .97, PZ), (PX - .22, 1.28, PZ), .12, n=8)
    n.prism('iron', (PX + .1, .97, PZ), (PX + .1, 1.28, PZ), .12, n=8)
    for k in range(3):
        n.ring('plate', (PX - .22, 1.0 + k * .09, PZ), (0, 1, 0), .11, .155, .028, n=8, smooth_=False, tint=.9)
        n.ring('plate', (PX + .1, 1.0 + k * .09, PZ), (0, 1, 0), .11, .155, .028, n=8, smooth_=False, tint=.9)
    n.prism('plate', (PX - .55, 1.52, PZ - .05), (PX + .15, 1.52, PZ - .05), .2, n=10)  # fuel tank
    n.beam('iron', (PX - .4, 1.0, PZ - .2), (PX - .4, 1.36, PZ - .2), .05, .05)
    n.beam('iron', (PX, 1.0, PZ - .2), (PX, 1.36, PZ - .2), .05, .05)
    n.prism('iron', (PX - .55, 1.7, PZ - .05), (PX - .55, 1.8, PZ - .05), .045, n=6)      # filler neck
    n.box('iron', (PX + .1, .9, PZ + .34), (.18, .14, .1))                                # carburettor
    # flywheel with spokes, rim and hub
    FX = -7.28
    n.ring('iron', (FX, .72, PZ), (1, 0, 0), .31, .43, .09, n=14, smooth_=False)
    n.prism('iron', (FX - .1, .72, PZ), (FX + .1, .72, PZ), .09, n=8)
    for k in range(5):
        t = k * TAU / 5 + .3
        n.beam('iron', (FX, .72 + .09 * math.cos(t), PZ + .09 * math.sin(t)),
               (FX, .72 + .33 * math.cos(t), PZ + .33 * math.sin(t)), .05, .045, up=(1, 0, 0))
    n.prism('iron', (PX + .45, .7, PZ), (FX - .05, .72, PZ), .05, n=6)                    # crankshaft
    # pump casing, axis along z, with flanges
    pxx = -6.55
    n.prism('iron', (pxx, .55, PZ - .32), (pxx, .55, PZ + .3), .27, n=12)
    n.prism('plate', (pxx, .55, PZ - .32), (pxx, .55, PZ - .08), .36, .29, n=12, caps=(True, False), tint=.95)
    n.prism('iron', (pxx + .25, .62, PZ), (pxx + .45, .62, PZ), .1, n=8)
    n.ring('plate', (pxx, .55, PZ + .32), (0, 0, 1), .1, .3, .06, n=12, smooth_=False)
    for k in range(6):
        t = TAU * k / 6 + .2
        n.bolt('iron', (pxx + .26 * math.cos(t), .55 + .26 * math.sin(t), PZ + .35), (0, 0, 1), r=.026, h=.03, n=5)
    n.ring('iron', (pxx + .0, .55, PZ - .38), (0, 0, 1), .0 + .05, .16, .05, n=8)             # pulley hub
    n.ring('iron', (pxx + .45, .62, PZ), (1, 0, 0), .09, .16, .06, n=10)
    # belt, flywheel to the pump pulley
    n.beam('rubber', (FX + .04, .74 + .43, PZ), (pxx + .2, .62 + .17, PZ - .0), .025, .12, up=(0, 0, 1))
    n.beam('rubber', (FX + .04, .74 - .43, PZ), (pxx + .2, .62 - .17, PZ - .0), .025, .12, up=(0, 0, 1))
    # discharge elbow up to the main pipe
    n.tube('iron', [(pxx, .8, PZ), (pxx, .86, PZ), (pxx + .12, MY, MZ), (-6.2, MY, MZ)], .14, n=10, caps=(False, False))
    # suction line from the well along the ground
    n.tube('iron', [(WELL.x + 1.02, .42, WELL.z), (-9.6, .42, WELL.z), (pxx, .42, WELL.z), (pxx, .42, PZ + .5), (pxx, .5, PZ + .32)],
           .1, n=8, caps=(False, False))
    for x in (-11.2, -10.2, -9.0, -7.9):
        n.ring('plate', (x, .42, WELL.z), (1, 0, 0), .095, .135, .05, n=8, smooth_=False)
    # exhaust pipe with a rain cap, up through the roof gap
    n.tube('iron', [(-8.3, 1.0, PZ + .1), (-8.3, 2.2, PZ + .1), (-8.3, 3.85, PZ + .1)], .055, n=8, caps=(False, True))
    n.prism('plate', (-8.3, 3.95, PZ + .1), (-8.3, 4.12, PZ + .1), .17, .0, n=8)
    for k in range(3): n.beam('iron', (-8.3 + .12 * math.cos(k * 2.1), 3.88, PZ + .1 + .12 * math.sin(k * 2.1)),
                              (-8.3, 3.95, PZ + .1), .015, .015)
    # a dented oil can and a rusty bucket by the skid
    n.prism('iron', (-9.2, 0, 2.2), (-9.2, .36, 2.2), .17, .15, n=8, caps=(True, False))
    n.prism('blue', (-5.9, 0, -.2), (-5.9, .5, -.2), .13, n=8, caps=(True, True))
    return n

def build_pump_fuel():
    n = Node('pump-fuel')
    jerry_can(n, (-8.65, .0, -.2), .3, 'olive')
    jerry_can(n, (-8.2, .0, -.3), -.2, 'red')
    jerry_can(n, (-7.75, .0, -.16), .8, 'olive')
    jerry_can(n, (-8.4, .0, .3), 1.4, 'red')
    jerry_can(n, (-7.3, .0, .05), -.5, 'red')
    jerry_can(n, (-8.2, .52, -.3), .4, 'olive')                      # one stacked on top
    n.tube('rubber', [(-8.0, .66, -.22), (-7.85, .8, .1), (-7.9, 1.0, .55), (-8.42, 1.35, .95), (-8.45, 1.74, 1.0)], .024, n=5, caps=(True, True))
    n.tube('rubber', [(-7.3, .62, .05), (-7.1, .4, .5), (-7.0, .1, 1.0), (-7.2, .1, 1.5)], .022, n=5, caps=(True, True))
    n.prism('iron', (-8.54, 1.82, 1.2), (-8.54, 1.92, 1.2), .0, .09, n=8, caps=(False, False))   # funnel
    return n

# ---- pump house: corrugated walls round the pump, open door to the front
def roof_y(z): return 2.85 + .5 * (z + 1.4) / 4.8
HX0, HX1, HZ0, HZ1 = -9.6, -5.6, -1.0, 3.0

def wall(n, a, b, hfun, skips=(), y0=.05):
    a, b = V(a), V(b); d = b - a; L = d.length; d.normalize()
    nrm = V((0, 1, 0)).cross(d)
    s = 0.0
    while s < L - .05:
        for s0, s1 in skips:
            if s + .05 >= s0 and s < s1:
                s = s1
        if s >= L - .05: break
        w = min(rnd.uniform(.82, .95), L - s)
        for s0, s1 in skips:
            if s < s0 < s + w:
                w = s0 - s
        if w < .25:
            s += max(w, .25); continue
        p = a + d * (s + w / 2)
        top = hfun(p) - y0
        off = nrm * rnd.uniform(-.025, .025)
        base = a + d * s + off + V((0, y0 + rnd.uniform(0, .07), 0))
        vd = V((0, 1, 0)) + d * rnd.uniform(-.012, .012)
        if rnd.random() < .16:
            n.sheet('plate', base, d, vd, w, top - .05, depth=0, tint=jt(.85, 1.15))
        else:
            n.sheet('sheet', base, d, vd, w, top, tint=jt(.72, 1.12), wob=.006)
        s += w - .035

def build_pump_house():
    n = Node('pump-house')
    top = lambda p: roof_y(p.z) - .12
    wall(n, (HX0, 0, HZ0), (HX0, 0, HZ1), top)
    wall(n, (HX0, 0, HZ1), (HX1, 0, HZ1), top)
    wall(n, (HX1, 0, HZ1), (HX1, 0, HZ0), top, skips=((1.0, 1.7),))
    wall(n, (HX1, 0, HZ0), (HX0, 0, HZ0), top, skips=((0.8, 3.2),))
    for x, z in ((HX0, HZ0), (HX0, HZ1), (HX1, HZ1), (HX1, HZ0), (-8.8, HZ0), (-6.4, HZ0)):
        n.beam('iron', (x, 0, z), (x, roof_y(z) - .08, z), .12, .12)
    n.beam('iron', (-8.8, 2.55, HZ0), (-6.4, 2.55, HZ0), .12, .12)            # lintel over the door
    for k in range(6):                                                            # patch plates with bolts
        side = k % 3
        if side == 0:
            c = (HX0 - .03, 1.0 + .4 * (k % 2), .3 + k * .45); nm = (-1, 0, 0); box = (.02, .6, .5)
        elif side == 1:
            c = (-9.0 + k * .4, 1.2 + .3 * (k % 2), HZ1 + .03); nm = (0, 0, 1); box = (.55, .5, .02)
        else:
            c = (-9.3 + k * .22, 1.1, HZ0 - .03); nm = (0, 0, -1); box = (.18, .5, .02)
        n.box('plate', c, box, tint=jt(.9, 1.2))
        for dx, dy in ((-.2, -.18), (.2, -.18), (-.2, .18), (.2, .18)):
            pos = V(c) + (V((0, dy, dx)) if side == 0 else V((dx, dy, 0)))
            n.bolt('iron', pos, nm, r=.028, h=.022, n=5)
    # a hand-lettered "PUMP" is left out on purpose: plain sheet reads as scrap
    return n

def build_pump_house_roof():
    n = Node('pump-house-roof')
    z0, z1 = -1.45, 3.45
    dirv = V((0, roof_y(z1) - roof_y(z0), z1 - z0))
    for x in (-9.7, -8.6, -7.5, -6.4, -5.5):
        n.beam('wood', (x, roof_y(z0) - .14, z0), (x, roof_y(z1) - .14, z1), .1, .13, up=(0, 1, 0))
    for z in (-.9, .5, 1.9, 3.1):
        n.beam('iron', (-9.85, roof_y(z) - .07, z), (-5.3, roof_y(z) - .07, z), .06, .06)
    n.sheet('zinc', (-9.95, roof_y(z0), z0), (1, 0, 0), dirv, 1.55, dirv.length, tint=jt(1.0, 1.25), vseg=3, wob=.008)
    n.sheet('zinc', (-8.1, roof_y(z0), z0), (1, 0, 0), dirv, 2.9, dirv.length, tint=jt(1.0, 1.25), vseg=3, wob=.01)
    n.sheet('plate', (-7.2, roof_y(-.1) + .04, -.1), (1, 0, 0), dirv, 1.0, 1.1, depth=0, tint=1.15)
    for x in (-9.7, -8.6, -7.5, -6.4, -5.5):                    # bright new rivets along each rafter
        for z in (-1.0, 2.0):
            n.bolt('bare', (x, roof_y(z) + .035, z), (0, 1, 0), r=.034, h=.03, n=4)
    for x, z in ((-9.2, .3), (-6.2, 2.2), (-8.9, 2.7), (-6.4, -.1)):
        n.ring('rubber', (x, roof_y(z) + .12, z), (0, 1, -.1), .17, .38, .2, n=12, smooth_=False)
    return n

# ---- the overground pipe, cut and patched
def pipe_run(n, cut):
    pts = []
    xs = [-6.2, -4.6, -3.0, -1.5, 0.0, 1.2]
    if cut:
        west = [(x, MY, MZ) for x in xs]
        for k in range(1, 7):
            x = 1.2 + 2.65 * k / 6
            west.append((x, MY - .56 * (k / 6) ** 2, MZ))
        east = []
        for k in range(0, 8):
            x = 4.15 + 2.75 * k / 7
            east.append((x, MY - .5 * (1 - k / 7) ** 2, MZ))
        east += [(x, MY, MZ) for x in (8.4, 10.0, 11.4, 12.2)]
        n.tube('plate', west, MR, n=12, caps=(False, False))
        n.tube('plate', east, MR, n=12, caps=(False, False))
        ex = west[-1]; fx = east[0]
        n.ring('plate', ex, (1, -.16, 0), MR * .84, MR, .03, n=12, smooth_=False, tint=1.5)
        n.ring('plate', fx, (1, .12, 0), MR * .84, MR, .03, n=12, smooth_=False, tint=1.5)
        n.disc('ash', (ex[0] - .35, ex[1] + .02, ex[2]), (1, 0, 0), MR * .84, n=12)
        n.disc('ash', (fx[0] + .35, fx[1] + .02, fx[2]), (1, 0, 0), MR * .84, n=12)
        for k, dx in enumerate((-.12, -.26, -.4)):                            # false starts of the saw
            n.ring('ash', (ex[0] + dx, ex[1], ex[2]), (1, -.15, 0), MR * .96, MR * 1.02, .016, n=12,
                   a0=-1.6 + k * .5, a1=1.7 + k * .2, smooth_=False, basis=((0, 1, 0), (0, 0, 1)))
        n.ring('ash', (fx[0] + .2, fx[1], fx[2]), (1, .12, 0), MR * .96, MR * 1.02, .016, n=12, a0=-1.2, a1=1.5,
               smooth_=False, basis=((0, 1, 0), (0, 0, 1)))
        flanges = (-6.0, -3.0, -1.5, 8.4, 11.4)
    else:
        n.tube('plate', [(x, MY, MZ) for x in (-6.2, -3.0, 0.0, 3.0, 6.0, 9.0, 12.2)], MR, n=12, caps=(False, False))
        n.ring('steel', (4.0, MY, MZ), (1, 0, 0), MR * .9, MR + .12, 1.3, n=12, smooth_=True, tint=1.0)
        for dx in (-.68, .68):                                     # fresh weld beads, bright silver
            n.ring('silver', (4.0 + dx, MY, MZ), (1, 0, 0), MR + .03, MR + .17, .11, n=12, smooth_=True, tint=1.0)
        for dx in (-.34, 0.0, .34):                                # darker clamps with lugs and big bolts
            n.ring('iron', (4.0 + dx, MY, MZ), (1, 0, 0), MR + .1, MR + .2, .12, n=12, smooth_=True, tint=.7)
            n.box('iron', (4.0 + dx, MY + MR + .21, MZ), (.14, .1, .2), tint=.8)
            n.bolt('silver', (4.0 + dx, MY + MR + .27, MZ - .06), (0, 1, 0), r=.05, h=.05, n=6)
            n.bolt('silver', (4.0 + dx, MY + MR + .27, MZ + .06), (0, 1, 0), r=.05, h=.05, n=6)
        n.beam('wood', (4.0, 0, MZ), (4.0, MY - MR - .02, MZ), .16, .16, tint=1.5)   # a new prop under the patch
        n.box('steel', (4.0, MY - MR - .05, MZ), (.5, .05, .36))
        flanges = (-6.0, -3.0, -1.5, 8.4, 11.4, 2.4, 6.0)
    for x in flanges:
        flange(n, x)
    ts = [-4.4, -2.2, 1.2, 6.9, 9.4, 11.8] if cut else [-4.4, -2.2, 1.2, 3.0, 5.1, 6.9, 9.4, 11.8]
    for x in ts: trestle(n, x)
    if cut:     # a knocked-over trestle and a spilled pile of dirt where the pipe has sagged
        n.beam('iron', (2.6, .06, MZ - .55), (3.6, .09, MZ - 1.0), .09, .09)
        n.beam('iron', (2.9, .06, MZ - .98), (3.3, .09, MZ - .12), .09, .09)
        n.box('plate', (3.1, .05, MZ - .5), (.34, .05, .34), ry=.5)
    # tower feed and boiler feed branches (always on the main line past the cut)
    # (kept with the pipe so each stage stays one piece)

def tee_stub(n, with_flange_open):
    n.tube('iron', [(0.0, MY, MZ), (0.0, 1.3, MZ), (0.0, 1.45, MZ)], .17, n=10, caps=(False, False))
    n.ring('plate', (0.0, 1.48, MZ), (0, 1, 0), .1, .34, .07, n=12, smooth_=False)

def build_pipe_cut():
    n = Node('pipe-cut'); pipe_run(n, True); return n

def build_pipe_patched():
    n = Node('pipe-patched'); pipe_run(n, False); return n

def build_valve_missing():
    n = Node('valve-missing')
    tee_stub(n, True)
    n.disc('ash', (0.0, 1.2, MZ), (0, 1, 0), .15, n=10)
    for k in range(6):
        t = TAU * k / 6 + .2
        n.prism('iron', (.255 * math.cos(t), 1.51, MZ + .255 * math.sin(t)), (.255 * math.cos(t), 1.68, MZ + .255 * math.sin(t)), .02, n=5)
    n.box('plate', (.0, .05, MZ + .45), (.4, .03, .3), ry=.3, tint=.8)            # the bolt-holes rag
    return n

def build_valve():
    n = Node('valve')
    tee_stub(n, False)
    n.prism('iron', (0, 1.51, MZ), (0, 1.9, MZ), .22, .2, n=10)
    n.ring('plate', (0, 1.54, MZ), (0, 1, 0), .2, .33, .06, n=12, smooth_=False)
    for k in range(6):
        t = TAU * k / 6 + .2
        n.bolt('iron', (.255 * math.cos(t), 1.575, MZ + .255 * math.sin(t)), (0, 1, 0), r=.034, h=.034, n=6)
    n.prism('plate', (0, 1.9, MZ), (0, 2.18, MZ), .15, .12, n=10)
    n.ring('plate', (0, 1.92, MZ), (0, 1, 0), .15, .27, .05, n=10, smooth_=False)
    n.prism('iron', (0, 2.18, MZ), (0, 2.95, MZ), .04, n=6)
    for sd in (-1, 1):
        n.beam('iron', (sd * .13, 2.1, MZ), (sd * .09, 2.55, MZ), .05, .055)
    n.beam('iron', (-.11, 2.57, MZ), (.11, 2.57, MZ), .07, .07)
    n.ring('brightred', (0, 2.99, MZ), (0, 1, 0), .46, .58, .08, n=14, smooth_=True, tint=1.0)
    n.prism('brightred', (0, 2.94, MZ), (0, 3.1, MZ), .09, n=8, tint=1.0)
    for k in range(6):
        t = TAU * k / 6
        n.beam('brightred', (.06 * math.cos(t), 3.0, MZ + .06 * math.sin(t)), (.5 * math.cos(t), 3.0, MZ + .5 * math.sin(t)), .06, .055, up=(0, 1, 0), tint=1.0)
    return n

# ---- boiler: riveted drum on stone saddles, cold or lit firebox
BX, BZ0, BZ1, BY = 10.4, 3.6, 6.9, 1.46

def boiler_body(n, lit):
    n.prism('plate', (BX, BY, BZ0), (BX, BY, BZ1), 1.0, n=16, caps=(False, False))
    n.prism('plate', (BX, BY, BZ1), (BX, BY, BZ1 + .3), 1.0, .62, n=16, caps=(False, True), tint=.95)
    for z in (3.9, 4.9, 5.9, 6.75):
        n.ring('iron', (BX, BY, z), (0, 0, 1), .99, 1.065, .16, n=16, smooth_=True)
        for k in range(16):
            t = TAU * k / 16 + .1
            if math.sin(t) > -.55:
                n.bolt('iron', (BX + 1.065 * math.cos(t), BY + 1.065 * math.sin(t), z + .06), (math.cos(t), math.sin(t), 0), r=.026, h=.024, n=5)
    for z in (4.3, 6.2):
        n.box('stone', (BX, .22, z), (2.1, .46, .7), tint=.9)
    # front head of the drum, with a bolted smokebox hatch and the pressure gauge
    n.disc('plate', (BX, BY, BZ0), (0, 0, -1), 1.0, n=16, tint=.95)
    n.disc('iron', (BX - .3, 1.98, BZ0 - .02), (0, 0, -1), .34, n=14, tint=.9)
    for k in range(8):
        t = TAU * k / 8
        n.bolt('iron', (BX - .3 + .29 * math.cos(t), 1.98 + .29 * math.sin(t), BZ0 - .03), (0, 0, -1), r=.028, h=.026, n=5)
    n.prism('iron', (BX - .3, 1.98, BZ0 - .03), (BX - .3, 1.98, BZ0 - .2), .045, n=6)
    n.beam('iron', (BX - .3 - .2, 1.98, BZ0 - .2), (BX - .3 + .2, 1.98, BZ0 - .2), .06, .05)
    n.ring('iron', (BX + .55, 1.9, BZ0 - .06), (0, 0, 1), .13, .18, .08, n=12)
    n.disc('cream', (BX + .55, 1.9, BZ0 - .105), (0, 0, -1), .13, n=12, tint=1.0)
    n.beam('iron', (BX + .55, 1.9, BZ0 - .11), (BX + .62, 1.97, BZ0 - .11), .012, .012)
    # firebox: a box with a four-sided mouth, a glowing or cold bed inside, bars and an open door
    FW, FH = 1.8, 1.45
    n.box('plate', (BX, .15 + FH / 2, 3.0), (FW, FH, 1.2))
    n.box('iron', (BX, .1, 2.85), (FW + .2, .2, 1.7))
    n.box('plate', (BX, 1.45, 2.25), (FW, .3, .3), tint=.95)       # mouth: top, bottom, left, right
    n.box('plate', (BX, .37, 2.25), (FW, .44, .3), tint=.95)
    n.box('plate', (BX - .7, .95, 2.25), (.4, .7, .3), tint=.95)
    n.box('plate', (BX + .7, .95, 2.25), (.4, .7, .3), tint=.95)
    n.box('ash', (BX, .96, 2.405), (1.0, .72, .02))
    n.box('iron', (BX, 1.31, 2.1), (1.04, .05, .05)); n.box('iron', (BX, .62, 2.1), (1.04, .05, .05))
    for k in range(4):
        n.beam('ember2' if lit else 'iron', (BX - .36 + k * .24, .66, 2.12), (BX - .36 + k * .24, .66, 2.4), .045, .05)
    if lit:
        n.box('ember', (BX, .98, 2.39), (.92, .64, .015), tint=1.0)               # deep orange back wall
        n.box('ember2', (BX, .85, 2.385), (.5, .3, .015), tint=1.0)               # hot yellow core
        for k, (dx, dz) in enumerate(((-.3, 2.3), (.05, 2.28), (.33, 2.3), (-.05, 2.2), (.17, 2.34))):
            n.sphere('ember2' if k % 2 else 'ember', (BX + dx, .7, dz), .15 + .02 * (k % 2), n=8, rings=3, squash=.6, tint=1.0)   # round coals
        # orange light spilling from the mouth onto the ground and the boiler front
        for k, (ax, az, y_) in enumerate(((2.0, 1.7, .03), (1.4, 1.15, .034), (.8, .65, .038))):
            n.poly('glow', [V((BX + ax * math.cos(TAU * i / 14), y_, 1.0 + az * math.sin(TAU * i / 14))) for i in range(14)], tint=1.0)
        n.poly('glow', [V((BX - .75, .12, 2.02)), V((BX + .75, .12, 2.02)), V((BX + .55, 1.45, 2.02)), V((BX - .55, 1.45, 2.02))], tint=1.0)
    else:
        for k in range(5):
            n.box('rubber', (BX - .3 + k * .15, .72, 2.32 + .04 * (k % 2)), (.16, .08, .14), ry=k, tint=.9)
    hinge = V((BX + .5, .95, 2.1)); phi = 1.15
    dr = V((math.cos(phi), 0, -math.sin(phi)))
    n.box('plate', hinge + dr * .5, (1.0, .74, .05), ry=phi, tint=.95)
    n.box('iron', hinge + dr * .5 + V((0, 0, 0)), (.9, .06, .07), ry=phi)
    # pressure gauge on the front of the drum, a safety valve on top, ash pit
    n.prism('iron', (BX - .2, BY + .98, 4.6), (BX - .2, BY + 1.3, 4.6), .07, n=8)
    n.prism('plate', (BX - .2, BY + 1.3, 4.6), (BX - .2, BY + 1.42, 4.6), .11, .05, n=8)
    # stack
    n.prism('plate', (BX, BY + .9, 6.4), (BX, BY + 2.6, 6.4), .3, n=12, caps=(False, False))
    n.prism('plate', (BX, BY + 2.55, 6.4), (BX, BY + 3.9, 6.4), .26, n=12, caps=(False, False), tint=.9)
    n.ring('iron', (BX, BY + 2.55, 6.4), (0, 1, 0), .26, .34, .1, n=12)
    n.ring('iron', (BX, BY + 3.85, 6.4), (0, 1, 0), .24, .3, .07, n=12)
    n.ring('iron', (BX, BY + 1.5, 6.4), (0, 1, 0), .3, .35, .06, n=12)
    for s in (0, 1, 2):
        t = s * 2.1 + .4
        n.tube('iron', [(BX, BY + 3.0, 6.4), (BX + 2.2 * math.cos(t), .1, 6.4 + 2.2 * math.sin(t))], .012, n=4)
    # feed pipe from the main line, in at the side of the drum
    n.tube('iron', [(9.0, MY, MZ), (9.0, MY, 5.0), (BX - 1.0 + .12, MY, 5.0)], .09, n=8, caps=(False, False))
    n.ring('plate', (BX - .9, MY, 5.0), (1, 0, 0), .08, .17, .05, n=10, smooth_=False)

def build_boiler_cold():
    n = Node('boiler-cold'); boiler_body(n, False); return n

def build_boiler_lit():
    n = Node('boiler-lit'); boiler_body(n, True)
    top = BY + 3.9
    for s in range(3):
        t = s * 2.1 + .4
        n.beam('iron', (BX + .2 * math.cos(t), top, 6.4 + .2 * math.sin(t)), (BX + .05 * math.cos(t), top + .42, 6.4 + .05 * math.sin(t)), .03, .03)
    n.prism('plate', (BX, top + .4, 6.4), (BX, top + .62, 6.4), .46, .0, n=12, tint=.6)    # cap, stained dark by the fire
    n.ring('ash', (BX, top - .05, 6.4), (0, 1, 0), .245, .31, .22, n=12)                   # soot at the top of the stack
    # no smoke: round shapes read as beads from the sheet camera; the stained cap and soot band carry it
    return n

# ---- truck bay and tanker
BAYX0, BAYX1, BAYZ0, BAYZ1 = -11.2, -1.6, 5.4, 9.9

def bay_y(z): return 4.4 - .8 * (BAYZ1 - z) / (BAYZ1 - 5.5)

def build_truck_bay():
    n = Node('truck-bay')
    n.box('concrete', ((BAYX0 + BAYX1) / 2, .04, (BAYZ0 + BAYZ1) / 2 + .1), (9.6, .08, 4.7), tint=.95)
    for x in (-11.0, -8.4, -5.8, -3.2, -1.8):                  # front posts
        n.prism('iron', (x, 0, 5.55), (x, 3.6, 5.55), .1, n=8)
    for x in (-11.0, -6.4, -1.8):                              # back posts
        n.prism('iron', (x, 0, 9.85), (x, 4.45, 9.85), .12, n=8)
    top = lambda p: 4.3
    wall(n, (BAYX0, 0, BAYZ1), (BAYX1, 0, BAYZ1), lambda p: 4.2 - rnd.uniform(0, .3), skips=((5.1, 5.9),))
    wall(n, (BAYX0, 0, 5.5), (BAYX0, 0, BAYZ1), lambda p: 3.5 + .8 * (p.z - 5.5) / 4.4 - .15)
    for x in (-10.9, -8.8, -6.7, -4.6, -2.5, -1.8):
        n.beam('wood', (x, 3.52, 5.52), (x + .0, bay_y(9.85) - .1, 9.85), .12, .15)
    for z in (6.4, 7.6, 8.8):
        n.beam('iron', (BAYX0, bay_y(z) - .02, z), (BAYX1 + .0, bay_y(z) - .02, z), .07, .07)
    for x0, x1 in ((-11.3, -8.1), (-7.9, -4.9), (-4.7, -1.5)):
        zf = 7.1 if x0 > -9 else 6.6
        dirv = V((0, bay_y(9.9) - bay_y(zf), 9.9 - zf))
        n.sheet('sheet', (x0, bay_y(zf), zf), (1, 0, 0), dirv, x1 - x0, dirv.length, tint=jt(.72, 1.05), vseg=3, wob=.014)
    n.beam('iron', (BAYX0, 3.5, 5.55), (BAYX1, 3.5, 5.55), .12, .12)
    # props: drums, tyres, a bench, a chain
    for k, (x, z, mat) in enumerate(((-2.4, 9.2, 'blue'), (-2.0, 8.6, 'plate'), (-2.7, 8.5, 'red'))):
        n.prism(mat, (x, 0, z), (x, .9, z), .3, n=10)
        n.ring('iron', (x, .25, z), (0, 1, 0), .3, .325, .04, n=10, smooth_=False)
        n.ring('iron', (x, .66, z), (0, 1, 0), .3, .325, .04, n=10, smooth_=False)
    for k in range(4):
        n.ring('rubber', (-2.3 + .05 * (k % 2), .11 + k * .2, 6.9), (0, 1, 0), .2, .43, .2, n=12, smooth_=False)
    n.box('wood', (-3.0, .8, 9.5), (1.7, .06, .6)); n.beam('iron', (-3.7, 0, 9.3), (-3.7, .78, 9.3), .08, .08)
    n.beam('iron', (-2.3, 0, 9.3), (-2.3, .78, 9.3), .08, .08)
    n.box('iron', (-3.5, .92, 9.55), (.18, .18, .14)); n.box('plate', (-2.8, .87, 9.45), (.4, .05, .06), ry=.4)
    n.tube('iron', [(-5.0, 4.1, 9.0), (-5.05, 3.6, 9.0), (-4.95, 3.1, 9.05)], .018, n=4)
    return n

def build_water_truck():
    n = Node('water-truck'); zc = 4.9
    for s in (-1, 1):
        n.box('iron', (-6.5, .96, zc + s * .66), (7.2, .25, .16))
    for x in (-9.9, -8.7, -7.5, -6.2, -4.9, -3.9, -3.2):
        n.box('iron', (x, .96, zc), (.14, .2, 1.5), tint=.9)
    for x in (-3.75, -8.2, -9.45):
        n.prism('iron', (x, .56, zc - 1.1), (x, .56, zc + 1.1), .09, n=8)
        if x < -5:
            n.box('iron', (x, .6, zc), (.5, .38, .5))
        for s in (-1, 1):
            zt = zc + s * 1.17
            n.ring('rubber', (x, .56, zt), (0, 0, 1), .30, .56, .36, n=14, smooth_=False)
            n.disc('plate', (x, .56, zt + s * .165), (0, 0, s), .31, n=12, tint=1.0)
            n.disc('iron', (x, .56, zt + s * .171), (0, 0, s), .12, n=8, tint=1.0)
            for k in range(6):
                t = TAU * k / 6
                n.bolt('iron', (x + .2 * math.cos(t), .56 + .2 * math.sin(t), zt + s * .17), (0, 0, s), r=.025, h=.03, n=5)
            n.box('rubber', (x - .62, .38, zt), (.04, .5, .5), tint=.9) if x < -5 else None
    # cab: a boxy conventional cab, hood and engine, bumper, grille
    n.box('blue', (-5.2, 2.0, zc), (2.0, 2.0, 2.2))
    n.box('plate', (-5.2, 3.04, zc), (2.12, .1, 2.34), tint=.85)
    n.box('blue', (-3.7, 1.7, zc), (1.4, .9, 1.9), tint=.95)
    n.box('plate', (-3.7, 2.2, zc), (1.38, .05, 1.74), rx=0.0, tint=.9)
    n.box('iron', (-2.95, 1.5, zc), (.12, .8, 1.5))                                            # grille
    for k in range(5): n.box('plate', (-2.9, 1.2 + k * .15, zc), (.04, .05, 1.34), tint=.8)
    n.box('plate', (-2.88, .82, zc), (.2, .22, 2.3), tint=1.0)                                 # bumper
    n.box('iron', (-2.78, .82, zc - .9), (.06, .1, .5), ry=.2)
    for s in (-1, 1):
        n.prism('cream', (-2.92, 1.7, zc + s * .65), (-2.82, 1.7, zc + s * .65), .17, n=10, caps=(True, True))
        n.box('glass', (-4.2, 2.25, zc + s * 1.105), (1.05, .72, .02))                         # side windows
        n.box('iron', (-4.2, 1.88, zc + s * 1.11), (1.08, .04, .03))
        n.box('iron', (-4.2, 1.3, zc + s * 1.108), (.04, 1.05, .03))
        n.box('iron', (-4.62, 1.55, zc + s * 1.115), (.14, .04, .05))
        n.box('plate', (-4.0, .98, zc + s * 1.15), (1.3, .08, .35), tint=.9)                  # running board
        n.beam('iron', (-4.2, 2.4, zc + s * 1.2), (-3.55, 2.6, zc + s * 1.55), .03, .03)      # mirror arm
        n.box('plate', (-3.55, 2.6, zc + s * 1.58), (.06, .34, .2))
    n.sheet('glass', (-4.11, 1.9, zc - .95), (0, 0, 1), (0, 1, 0), 1.9, .78, depth=0)           # windscreen (back)
    n.box('glass', (-4.2, 2.52, zc), (.04, .78, 1.95), rz=0.0, tint=1.0)
    n.box('cream', (-4.17, 2.5, zc + .4), (.01, .02, .75), rx=.5, tint=1.3)                     # crack
    n.box('cream', (-4.17, 2.45, zc + .3), (.01, .02, .5), rx=-.4, tint=1.3)
    # exhaust stack behind the cab, fuel tank step
    n.prism('iron', (-6.28, .9, zc + .98), (-6.28, 3.9, zc + .98), .075, n=8)
    n.prism('plate', (-6.28, 3.9, zc + .98), (-6.28, 4.0, zc + .98), .13, .0, n=8)
    n.prism('plate', (-5.9, .95, zc - 1.0), (-5.0, .95, zc - 1.0), .26, n=10)
    # tanker: horizontal drum with domed ends, hoops, manhole, ladder, valve, hose coil
    TX0, TX1, TY, TR = -10.1, -6.1, 2.2, 1.0
    n.prism('plate', (TX0, TY, zc), (TX1, TY, zc), TR, n=18, caps=(False, False))
    n.prism('plate', (TX0 - .16, TY, zc), (TX0, TY, zc), TR * .82, TR, n=18, caps=(True, False), tint=.95)
    n.prism('plate', (TX1, TY, zc), (TX1 + .16, TY, zc), TR, TR * .82, n=18, caps=(False, True), tint=.95)
    for x in (-9.7, -8.1, -6.5):
        n.ring('iron', (x, TY, zc), (1, 0, 0), TR - .01, TR + .06, .14, n=18, smooth_=True)
    n.ring('stencil', (-8.1, TY, zc), (1, 0, 0), TR, TR + .015, 2.5, n=18, a0=-math.pi / 2 - .62, a1=-math.pi / 2 + .62,
           smooth_=True, span=True, basis=((0, 1, 0), (0, 0, 1)), ends=False, tint=1.0)
    n.ring('plate', (-8.4, TY, zc), (1, 0, 0), TR, TR + .018, 1.5, n=18, a0=math.pi / 2 - .5, a1=math.pi / 2 + .5,
           smooth_=True, basis=((0, 1, 0), (0, 0, 1)), tint=1.2)
    n.prism('plate', (-8.0, TY + TR - .05, zc), (-8.0, TY + TR + .16, zc), .3, n=10, caps=(False, True))
    n.prism('iron', (-8.0, TY + TR + .16, zc), (-8.0, TY + TR + .21, zc), .34, n=10)
    n.box('iron', (-8.0, TY + TR + .26, zc), (.08, .08, .5), tint=.9)
    for k in range(6):
        t = TAU * k / 6
        n.bolt('iron', (-8.0 + .3 * math.cos(t), TY + TR + .215, zc + .3 * math.sin(t)), (0, 1, 0), r=.03, h=.03, n=5)
    n.box('iron', (-6.75, TY + TR + .13, zc), (.3, .26, .3))                                     # vent
    # rear: ladder, outlet valve and a coil of hose
    for s in (-1, 1): n.beam('iron', (-10.35, .9, zc + s * .32), (-10.35, 3.1, zc + s * .32), .05, .05)
    for k in range(8): n.beam('iron', (-10.35, 1.15 + k * .26, zc - .32), (-10.35, 1.15 + k * .26, zc + .32), .04, .04)
    n.tube('iron', [(-10.3, 1.3, zc + .55), (-10.62, 1.3, zc + .55), (-10.62, .95, zc + .55)], .08, n=8, caps=(False, True))
    n.ring('red', (-10.62, 1.12, zc + .55), (0, 1, 0), .15, .23, .04, n=10, smooth_=True)
    for k in range(3): n.ring('rubber', (-10.55, 1.62 + k * .09, zc - .55), (0, 1, 0), .14, .26, .09, n=12, smooth_=False)
    # mudguards and the rear bumper
    for x in (-3.75, -8.2, -9.45):
        for s in (-1, 1):
            n.ring('plate', (x, .56, zc + s * 1.17), (0, 0, 1), .62, .655, .5, n=14, a0=-1.1, a1=1.1,
                   basis=((0, 1, 0), (-1, 0, 0)), smooth_=True, tint=.9, ends=False)
    n.box('plate', (-10.4, .9, zc), (.2, .22, 2.3))
    n.ring('rubber', (-6.0, 1.95, zc + 1.2), (0, 0, 1), .26, .54, .28, n=12, smooth_=False)       # spare tyre on the side
    # a crushed section of the front: a bent mudguard stay, and a hanging light
    n.beam('iron', (-2.9, 1.9, zc + .65), (-2.7, 1.5, zc + .75), .03, .03)
    n.shift(4.2)        # pulled out of the bay, east of the pump house, so the tank and blue cab show
    return n

# ---- water tower on four legs, a ladder, a painted level window
TX, TZ = 5.6, 9.0
TH, TY0, TR2 = 3.4, 6.2, 1.7
SLOT = -math.pi / 2

def build_tower():
    n = Node('tower')
    base, top, hy = 2.3, 1.6, 6.0
    legs = {}
    for sx in (-1, 1):
        for sz in (-1, 1):
            legs[(sx, sz)] = ((TX + sx * base, 0, TZ + sz * base), (TX + sx * top, hy, TZ + sz * top))
            n.beam('plate', legs[(sx, sz)][0], legs[(sx, sz)][1], .24, .24)
            n.box('concrete', (TX + sx * base, .16, TZ + sz * base), (.8, .32, .8), tint=.95)
    def at(key, y):
        a, b = legs[key]; t = y / hy
        return V(a) * (1 - t) + V(b) * t
    for y0, y1 in ((0.3, 3.0), (3.0, 6.0)):
        for (k0, k1) in (((-1, -1), (1, -1)), ((1, -1), (1, 1)), ((1, 1), (-1, 1)), ((-1, 1), (-1, -1))):
            n.beam('iron', at(k0, y0), at(k1, y1), .09, .09)
            n.beam('iron', at(k1, y0), at(k0, y1), .09, .09)
            if y0 > 1:
                n.beam('iron', at(k0, y0), at(k1, y0), .11, .11)
    for (k0, k1) in (((-1, -1), (1, -1)), ((1, -1), (1, 1)), ((1, 1), (-1, 1)), ((-1, 1), (-1, -1))):
        n.beam('iron', at(k0, hy - .1), at(k1, hy - .1), .14, .14)
        n.beam('iron', at(k0, 0.35), at(k1, 0.35), .1, .1)
    # deck, planks, rail
    for k in range(10):
        n.box('wood', (TX, 6.06, TZ - 1.95 + k * .433), (4.1, .08, .4), tint=jt(.7, 1.0))
    for x in (-1.7, -.6, .6, 1.7): n.box('iron', (TX + x, 5.92, TZ), (.12, .14, 4.2))
    for sx in (-1, 1):
        for z in (-1.95, 0, 1.95):
            n.beam('iron', (TX + sx * 1.97, 6.1, TZ + z), (TX + sx * 1.97, 7.15, TZ + z), .07, .07)
        n.beam('iron', (TX + sx * 1.97, 7.1, TZ - 1.95), (TX + sx * 1.97, 7.1, TZ + 1.95), .05, .05)
        n.beam('iron', (TX + sx * 1.97, 6.6, TZ - 1.95), (TX + sx * 1.97, 6.6, TZ + 1.95), .04, .04)
    n.beam('iron', (TX - 1.97, 7.1, TZ + 1.95), (TX + 1.97, 7.1, TZ + 1.95), .05, .05)
    n.beam('iron', (TX - 1.97, 6.6, TZ + 1.95), (TX + 1.97, 6.6, TZ + 1.95), .04, .04)
    # ladder on the front left leg, up to the deck
    p0 = V((TX - 2.45, 0, TZ - 2.7)); p1 = V((TX - 1.85, hy + .85, TZ - 2.0))
    for s in (-.2, .2):
        n.beam('iron', p0 + V((0, 0, 0)) + V((s, 0, 0)), p1 + V((s, 0, 0)), .05, .06, up=(0, 0, 1))
    for k in range(1, 15):
        t = k / 15
        c = p0 * (1 - t) + p1 * t
        n.beam('iron', c + V((-.2, 0, 0)), c + V((.2, 0, 0)), .035, .035)
    # tank: a tall narrow slot up the front, an open hatch notch at the top, bands, floor, roof
    HW, HL = .09, TH * .9
    lower = dict(a0=SLOT + HW, a1=SLOT - HW + TAU)
    upper = dict(a0=SLOT + .10, a1=SLOT - .55 + TAU)
    bs = ((1, 0, 0), (0, 0, 1))
    n.ring('plate', (TX, TY0 + HL / 2, TZ), (0, 1, 0), TR2 - .06, TR2, HL, n=28, smooth_=True, basis=bs, **lower)
    n.ring('plate', (TX, TY0 + HL + (TH - HL) / 2, TZ), (0, 1, 0), TR2 - .06, TR2, TH - HL, n=28, smooth_=True, basis=bs, **upper)
    n.ring('iron', (TX, TY0 + TH - .06, TZ), (0, 1, 0), TR2 - .09, TR2 + .03, .12, n=28, smooth_=True, basis=bs, **upper)
    n.ring('iron', (TX, TY0 + .12, TZ), (0, 1, 0), TR2 - .09, TR2 + .03, .24, n=28, smooth_=True, basis=bs, **lower)
    for yy in (1.0, 2.0):
        n.ring('iron', (TX, TY0 + yy, TZ), (0, 1, 0), TR2 - .06, TR2 + .045, .1, n=28, smooth_=True, basis=bs, **lower)
    n.disc('ash', (TX, TY0 + .02, TZ), (0, 1, 0), TR2 - .05, n=24)
    # painted level strip beside the slot, iron frame and rivets along both slot edges
    gx0 = SLOT + HW + .045
    n.ring('gauge', (TX, TY0 + TH / 2, TZ), (0, 1, 0), TR2, TR2 + .02, TH, n=28, a0=gx0, a1=gx0 + .31,
           smooth_=True, span=True, basis=bs, ends=False, tint=1.0)
    for sd in (-1, 1):
        edge = SLOT + sd * (HW + .02)
        n.ring('iron', (TX, TY0 + HL / 2, TZ), (0, 1, 0), TR2 - .06, TR2 + .04, HL, n=28,
               a0=min(edge, edge + sd * .03), a1=max(edge, edge + sd * .03), smooth_=False, basis=bs, ends=False)
        for k in range(7):
            t = edge + sd * .015
            n.bolt('bare', (TX + (TR2 + .04) * math.cos(t), TY0 + .25 + k * (HL - .4) / 6, TZ + (TR2 + .04) * math.sin(t)),
                   (math.cos(t), 0, math.sin(t)), r=.03, h=.026, n=5)
    yl = TY0 + LEVELS[6] * TH
    n.beam('red', (TX - .19, yl, TZ - TR2 + .02), (TX + .19, yl, TZ - TR2 + .02), .06, .07, tint=1.0)   # painted top line across the slot
    n.ring('red', (TX, yl, TZ), (0, 1, 0), TR2 - .01, TR2 + .03, .09, n=28, a0=SLOT + HW + .02, a1=SLOT + HW + .02 + .5, smooth_=True, basis=bs, ends=False, tint=1.0)
    # the open hatch: posts at the notch edges
    for t in (SLOT + .1, SLOT - .55):
        n.beam('iron', (TX + (TR2 + .02) * math.cos(t), TY0 + HL, TZ + (TR2 + .02) * math.sin(t)),
               (TX + (TR2 + .02) * math.cos(t), TY0 + TH, TZ + (TR2 + .02) * math.sin(t)), .06, .06)
    # roof: sixteen facets with two left out over the hatch
    apex = V((TX, TY0 + TH + 1.05, TZ))
    ring_pts = [V((TX + (TR2 + .12) * math.cos(TAU * i / 16), TY0 + TH, TZ + (TR2 + .12) * math.sin(TAU * i / 16))) for i in range(16)]
    facets = [[i, (i + 1) % 16, 16] for i in range(16) if i not in (10, 11)]
    n.add('sheet', ring_pts + [apex], facets, None, [V((TX, TY0 + TH + .2, TZ))] * len(facets), False, .95)
    n.prism('iron', (TX, TY0 + TH + 1.0, TZ), (TX, TY0 + TH + 1.3, TZ), .09, n=8)
    n.prism('plate', (TX, TY0 + TH + 1.3, TZ), (TX, TY0 + TH + 1.42, TZ), .22, .0, n=8)
    # feed riser and a pipe along the ground to the main line
    n.tube('iron', [(6.8, MY, MZ), (6.8, .45, 2.0), (6.8, .45, TZ - .6), (6.8, 1.0, TZ), (6.8, TY0 + .1, TZ)], .11, n=8, caps=(False, False))
    for yy in (.45,):
        n.ring('plate', (6.8, .45, 4.5), (0, 0, 1), .1, .19, .06, n=10, smooth_=False)
        n.ring('plate', (6.8, .45, 6.5), (0, 0, 1), .1, .19, .06, n=10, smooth_=False)
    for y in (2.2, 4.0): n.ring('iron', (6.8, y, TZ), (0, 1, 0), .1, .15, .07, n=8, smooth_=False)
    return n

def build_tower_water(level):
    n = Node(f'tower-water-{level}')
    y = TY0 + 0.04 + LEVELS[level - 1] * TH
    n.prism('water', (TX, TY0 + .05, TZ), (TX, y, TZ), TR2 - .1, n=16, caps=(False, False), smooth_=True, tint=1.0)
    n.disc('watertop', (TX, y + .004, TZ), (0, 1, 0), TR2 - .1, n=16, tint=1.3)          # light edge ring ...
    n.disc('water', (TX, y + .008, TZ), (0, 1, 0), TR2 - .3, n=16, tint=1.0)               # ... around a darker middle
    # a bright float marker rides in the slot at the water level so it can be read from far away
    n.box('float', (TX, y, TZ - TR2 - .01), (.3, .2, .1), tint=1.0)
    if level == 8:       # brim full: a trickle over the lip of the hatch and down the side
        t = SLOT - .45
        r0 = TR2 + .04
        top_y = TY0 + TH * .9
        n.tube('stream', [(TX + r0 * math.cos(t), top_y + .02, TZ + r0 * math.sin(t)),
                          (TX + (r0 + .05) * math.cos(t), top_y - .3, TZ + (r0 + .05) * math.sin(t)),
                          (TX + (r0 + .045) * math.cos(t), TY0 + .3, TZ + (r0 + .045) * math.sin(t)),
                          (TX + (r0 + .07) * math.cos(t), TY0 + .12, TZ + (r0 + .07) * math.sin(t))], .03, n=5, caps=(False, False), tint=1.0)
        n.ring('wet', (TX, TY0 + TH * .45, TZ), (0, 1, 0), TR2 + .002, TR2 + .01, TH * .9, n=28, a0=t - .045, a1=t + .045, smooth_=True,
               basis=((1, 0, 0), (0, 0, 1)), ends=False, tint=1.0)
        n.disc('watertop', (TX + (TR2 + .3) * math.cos(t), TY0 + .005, TZ + (TR2 + .3) * math.sin(t)), (0, 1, 0), .4, n=10, tint=1.0)
    return n

# ---- the camp tap and its trough
def build_camp_tap():
    n = Node('camp-tap')
    n.tube('iron', [(12.2, MY, MZ), (12.7, MY, MZ), (13.1, MY, MZ), (13.1, 1.12, MZ)], .1, n=8, caps=(False, False))
    n.tube('iron', [(13.1, MY, MZ), (13.1, .95, MZ - .05), (13.1, .78, MZ - .05)], .06, n=8, caps=(False, True))
    n.prism('iron', (13.1, .86, MZ - .05), (13.1, .74, MZ - .05), .075, .055, n=8, caps=(False, False))
    n.ring('red', (13.1, 1.14, MZ), (0, 1, 0), .035, .12, .04, n=8, smooth_=False)
    n.beam('red', (12.98, 1.2, MZ), (13.22, 1.2, MZ), .04, .04)
    flange(n, 12.2)
    n.prism('iron', (13.1, 0, MZ + .35), (13.1, .62, MZ + .35), .06, n=6)
    n.beam('iron', (13.1, .7, MZ + .35), (13.1, .7, MZ), .05, .05)
    # trough: a cut half oil drum on bricks
    tx, tz = 13.1, MZ - .05
    n.box('plate', (tx, .27, tz), (1.7, .06, .75), tint=1.0)
    n.box('plate', (tx, .52, tz - .37), (1.7, .5, .05), tint=1.0)
    n.box('plate', (tx, .52, tz + .37), (1.7, .5, .05), tint=1.0)
    n.box('plate', (tx - .85, .52, tz), (.05, .5, .75), tint=1.0)
    n.box('plate', (tx + .85, .52, tz), (.05, .5, .75), tint=1.0)
    for dx in (-.6, .6): n.box('concrete', (tx + dx, .12, tz), (.35, .24, .8), tint=.9)
    n.box('ash', (tx, .31, tz), (1.62, .02, .68))
    n.box('stone', (tx + 1.05, .1, tz + .3), (.5, .2, .4), ry=.4)
    return n

def build_tap_running():
    n = Node('tap-running')
    tx, tz = 13.1, MZ - .05
    n.tube('stream', [(tx, .74, tz), (tx, .68, tz), (tx, .64, tz)], .055, n=6, caps=(False, False), tint=1.0)   # a clear white-blue stream
    n.box('water', (tx, .62, tz), (1.6, .02, .66), tint=1.0)                                               # trough filled near the rim
    n.disc('watertop', (tx, .632, tz), (0, 1, 0), .3, n=10, tint=1.2)
    n.disc('stream', (tx, .636, tz), (0, 1, 0), .13, n=8, tint=1.0)                                       # splash
    # it spills over the lip and soaks the ground: a ragged dark wet patch
    pts = []
    for i in range(18):
        a_ = TAU * i / 18
        r = 1.15 + .35 * math.sin(a_ * 3 + 1.0) + .18 * math.sin(a_ * 5)
        pts.append(V((tx - .1 + r * 1.35 * math.cos(a_), .014, tz - .5 + r * .8 * math.sin(a_))))
    n.poly('wet', pts, tint=1.0)
    return n

# --------------------------------------------------------------------- build
builders = [build_well, build_well_water, build_pump, build_pump_fuel, build_pump_house, build_pump_house_roof,
            build_pipe_cut, build_pipe_patched, build_valve_missing, build_valve, build_boiler_cold, build_boiler_lit,
            build_truck_bay, build_water_truck, build_tower]
builders += [lambda lv=lv: build_tower_water(lv) for lv in range(1, 9)]
builders += [build_camp_tap, build_tap_running]

root_empty = bpy.data.objects.new('water-works', None)
scene.collection.objects.link(root_empty)
objects = {}
total_tris = 0
report = {}
for make in builders:
    node = make()
    ob = node.build()
    ob.parent = root_empty
    objects[node.name] = ob
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    report[node.name] = tris
    total_tris += tris
print('water-works triangles per node:', json.dumps(report))
print(f'water-works triangles: {total_tris}')
assert total_tris <= 30000, f'over the 30,000 triangle budget: {total_tris}'

NATIVE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
bpy.ops.object.select_all(action='DESELECT')
root_empty.select_set(True)
for ob in objects.values(): ob.select_set(True)
bpy.context.view_layer.objects.active = root_empty
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=False, export_cameras=False, export_lights=False,
                          export_vertex_color='MATERIAL', export_all_vertex_colors=False,
                          export_active_vertex_color_when_no_material=False, export_image_format='AUTO')

def shrink_vertex_colors(path):
    """Blender writes vertex colours as three floats; store them as four bytes to keep the file small."""
    import struct
    data = path.read_bytes()
    jlen = struct.unpack('<I', data[12:16])[0]
    j = json.loads(data[20:20 + jlen])
    blen = struct.unpack('<I', data[20 + jlen:24 + jlen])[0]
    blob = data[28 + jlen:28 + jlen + blen]
    views, accessors = j['bufferViews'], j['accessors']
    used = {}
    for a in accessors:
        used.setdefault(a.get('bufferView'), []).append(a)
    replaced = {}
    for mesh in j['meshes']:
        for prim in mesh['primitives']:
            if 'COLOR_0' not in prim['attributes']: continue
            a = accessors[prim['attributes']['COLOR_0']]
            if a['componentType'] != 5126 or a['type'] != 'VEC3' or len(used[a['bufferView']]) != 1: continue
            v = views[a['bufferView']]
            raw = np.frombuffer(blob, np.float32, a['count'] * 3, v['byteOffset'] + a.get('byteOffset', 0)).reshape(-1, 3)
            out = np.full((a['count'], 4), 255, np.uint8)
            out[:, :3] = np.clip(raw * 255 + .5, 0, 255)
            replaced[a['bufferView']] = out.tobytes()
            a['componentType'] = 5121; a['type'] = 'VEC4'; a['normalized'] = True; a['byteOffset'] = 0
            a.pop('min', None); a.pop('max', None); v.pop('byteStride', None)
    fresh = bytearray()
    for i, v in enumerate(views):
        chunk = replaced.get(i, blob[v['byteOffset']:v['byteOffset'] + v['byteLength']])
        while len(fresh) % 4: fresh.append(0)
        v['byteOffset'] = len(fresh); v['byteLength'] = len(chunk)
        fresh += chunk
    while len(fresh) % 4: fresh.append(0)
    j['buffers'][0]['byteLength'] = len(fresh)
    text = json.dumps(j, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    total = 12 + 8 + len(text) + 8 + len(fresh)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(text), b'JSON') + text +
                     struct.pack('<I4s', len(fresh), b'BIN' + bytes(1)) + bytes(fresh))

shrink_vertex_colors(OUT)
print(f'water-works: wrote {OUT} ({OUT.stat().st_size} bytes)')

# ------------------------------------------------------------------ pictures
# The nine chapter pictures for the review sheet. Everything here is for the
# picture only and is not exported.
CHAPTERS = [
    ('0 The dry well', ['well', 'pump', 'pump-house', 'truck-bay', 'tower', 'camp-tap', 'pipe-cut', 'valve-missing', 'boiler-cold']),
    ('1 Pipe patched', ['pipe-patched', 'tower-water-1']),
    ('2 Fuel for the pump', ['pump-fuel', 'tower-water-2']),
    ('3 The valve is back', ['valve', 'tower-water-3']),
    ('4 Pump house roofed', ['pump-house-roof', 'tower-water-4']),
    ('5 The boiler is lit', ['boiler-lit', 'tower-water-5']),
    ('6 The water truck is home', ['water-truck', 'tower-water-6']),
    ('7 Tower to the top line', ['tower-water-7']),
    ('8 Water runs', ['tower-water-8', 'well-water', 'tap-running']),
]
BASE = CHAPTERS[0][1]

def stage_nodes(ch):
    shown = set(BASE)
    for c in range(1, ch + 1):
        shown |= set(CHAPTERS[c][1])
        if c == 1: shown.discard('pipe-cut')
        if c == 3: shown.discard('valve-missing')
        if c == 5: shown.discard('boiler-cold')
        if 2 <= c <= 7: shown.discard(f'tower-water-{c - 1}')
        if c == 8: shown.discard('tower-water-7')
    return shown

CLOSEUPS = {
    'boiler': (5, (12.8, 4.6, -3.2), (10.2, 1.6, 3.2), 38, 800, 600),
    'tower1': (1, (9.5, 11.0, -3.5), (5.6, 8.0, 9.0), 40, 600, 760),
    'tower4': (4, (9.5, 11.0, -3.5), (5.6, 8.0, 9.0), 40, 600, 760),
    'tower8': (8, (9.5, 11.0, -3.5), (5.6, 8.0, 9.0), 40, 600, 760),
    'truck': (6, (9.0, 5.0, -10.0), (-2.5, 2.0, 5.2), 34, 800, 600),
    'well': (8, (-17.0, 3.4, -4.5), (-11.8, 1.0, 1.9), 42, 800, 600),
    'tap': (8, (10.8, 3.4, -4.5), (12.9, .7, 1.2), 40, 800, 600),
}

if options.render:
    folder = Path(options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    def wp(x, y, z):                      # front-view coordinates to the Blender scene
        return (-x, -z, y)
    ground = bpy.data.objects.new('ground', bpy.data.meshes.new('ground'))
    size = 400
    ground.data.from_pydata([(-size, -size, 0), (size, -size, 0), (size, size, 0), (-size, size, 0)], [], [(0, 1, 2, 3)])
    ground.data.update()
    uvl = ground.data.uv_layers.new(name='UVMap')
    for loop, uv in zip(ground.data.polygons[0].loop_indices, [(0, 0), (size / 2, 0), (size / 2, size / 2), (0, size / 2)]):
        uvl.data[loop].uv = uv
    dirt = save_jpeg('dirt', top_origin(dirt_texture(512, 23)))
    gm = make_material('ground', texture=dirt, vertex=False, rough=1.0)
    gt = gm.node_tree
    # two scales of the same dirt blended, then faded into the haze in the distance
    tcg = gt.nodes.new('ShaderNodeTexCoord')
    maps = []
    for scale, rot in ((.22, 0.0), (.057, .7)):
        mp = gt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale)
        mp.inputs['Rotation'].default_value = (0, 0, rot)
        gt.links.new(tcg.outputs['Object'], mp.inputs['Vector'])
        im = gt.nodes.new('ShaderNodeTexImage'); im.image = dirt
        gt.links.new(mp.outputs['Vector'], im.inputs['Vector'])
        maps.append(im)
    blend = gt.nodes.new('ShaderNodeMix'); blend.data_type = 'RGBA'; blend.inputs[0].default_value = .5
    gt.links.new(maps[0].outputs['Color'], blend.inputs[6]); gt.links.new(maps[1].outputs['Color'], blend.inputs[7])
    dist = gt.nodes.new('ShaderNodeVectorMath'); dist.operation = 'LENGTH'
    gt.links.new(tcg.outputs['Object'], dist.inputs[0])
    rng_ = gt.nodes.new('ShaderNodeMapRange'); rng_.inputs['From Min'].default_value = 70; rng_.inputs['From Max'].default_value = 230
    gt.links.new(dist.outputs['Value'], rng_.inputs['Value'])
    fade = gt.nodes.new('ShaderNodeMix'); fade.data_type = 'RGBA'
    fade.inputs[7].default_value = (.48, .39, .29, 1)
    gt.links.new(rng_.outputs['Result'], fade.inputs[0]); gt.links.new(blend.outputs[2], fade.inputs[6])
    gt.links.new(fade.outputs[2], gt.nodes['Principled BSDF'].inputs['Base Color'])
    ground.data.materials.append(gm)
    scene.collection.objects.link(ground)
    # damp dark patches and tyre ruts on the ground, for the picture only (not in the GLB)
    wetm = make_material('damp', color=(.07, .05, .035), rough=.35, alpha=.4, vertex=False)
    rutm = make_material('rut', color=(.15, .105, .07), rough=.8, alpha=.7, vertex=False)
    def flat(name, pts, mat):
        me = bpy.data.meshes.new(name)
        me.from_pydata([wp(x, .012, z) for x, z in pts], [], [list(range(len(pts)))]); me.update()
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return ob
    def blob(name, cx, cz, r, seed):
        rr = random.Random(seed)
        ph = [rr.uniform(0, 6) for _ in range(3)]
        pts = []
        for i in range(24):
            a_ = TAU * i / 24
            k = r * (1 + .28 * math.sin(a_ * 2 + ph[0]) + .16 * math.sin(a_ * 3 + ph[1]) + .08 * math.sin(a_ * 5 + ph[2]))
            pts.append((cx + k * math.cos(a_) * 1.3, cz + k * math.sin(a_)))
        flat(name, pts, wetm)
    blob('damp1', -9.5, -4.0, 2.6, 3); blob('damp2', 4.5, -6.0, 3.2, 5); blob('damp3', 1.0, 15.0, 3.0, 8)
    blob('damp4', 17.5, 3.0, 2.2, 11); blob('damp5', -16.5, 6.0, 2.0, 13)
    def rut(name, pts, width=.38):
        left, right = [], []
        for i, (x, z) in enumerate(pts):
            x2, z2 = pts[min(i + 1, len(pts) - 1)]; x1, z1 = pts[max(i - 1, 0)]
            dx, dz = x2 - x1, z2 - z1; ln = math.hypot(dx, dz) or 1
            nx, nz = -dz / ln, dx / ln
            w = width * (1 + .25 * math.sin(i * 1.7))
            left.append((x + nx * w, z + nz * w)); right.append((x - nx * w, z - nz * w))
        flat(name, left + right[::-1], rutm)
    def curve(f, n_=30): return [f(i / (n_ - 1)) for i in range(n_)]
    for off, nm in ((-.9, 'a'), (.9, 'b')):      # a road sweeping past the front of the camp
        rut('rut' + nm, curve(lambda t, off=off: (-34 + 70 * t, -9.5 - 3.5 * math.sin(t * 3.0) + off)))
    for off, nm in ((-.9, 'c'), (.9, 'd')):      # a spur up to the pump house door
        rut('rut' + nm, curve(lambda t, off=off: (-7.6 + off + 5 * (1 - t) ** 2, -3.5 - 6 * (1 - t)), 12))
    fire = bpy.data.lights.new('fire', 'POINT'); fire.energy = 40; fire.color = (1.0, .35, .08); fire.shadow_soft_size = .3
    fo = bpy.data.objects.new('fire', fire); scene.collection.objects.link(fo)
    fo.location = wp(BX, 1.0, 0.5)
    world = bpy.data.worlds.new('late afternoon'); scene.world = world; world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes['Background']
    grad = nt.nodes.new('ShaderNodeTexGradient'); grad.gradient_type = 'LINEAR'
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = .46; ramp.color_ramp.elements[0].color = (.62, .46, .33, 1)   # dusty horizon
    ramp.color_ramp.elements[1].position = .85; ramp.color_ramp.elements[1].color = (.56, .50, .46, 1)   # hazy overhead
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = .42
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 8.0; sun.color = (1.0, .64, .34); sun.angle = math.radians(2.5)
    so = bpy.data.objects.new('sun', sun); scene.collection.objects.link(so)
    # the sun is low, to the front right of the group, so the faces the camp looks at catch it
    d = V(wp(.55, .42, -.72)).normalized()
    so.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()   # sun looks along -d
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    cam_data.lens = options.lens or 43
    cam_at = [float(v) for v in options.cam.split(',')] if options.cam else [15.0, 13.5, -27.0]
    cam_to = [float(v) for v in options.target.split(',')] if options.target else [1.2, 3.3, 5.2]
    cam.location = wp(*cam_at)
    target = V(wp(*cam_to))
    cam.rotation_euler = (target - V(cam.location)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.engine = 'CYCLES'; scene.cycles.samples = options.samples; scene.cycles.device = 'CPU'
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = [int(v) for v in options.res.split(',')]
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = .45
    scene.render.image_settings.file_format = 'PNG'
    wanted = [] if options.no_chapters else [int(c) for c in options.only.split(',')] if options.only else range(9)
    for ch in wanted:
        shown = stage_nodes(ch)
        for name, ob in objects.items():
            ob.hide_render = name not in shown
            ob.hide_viewport = name not in shown
        fo.hide_render = 'boiler-lit' not in shown
        scene.render.filepath = str(folder / f'chapter-{ch}.png')
        bpy.ops.render.render(write_still=True)
        print(f'water-works: rendered chapter {ch}: {sorted(shown)}')
    if options.closeups:
        for name, (ch, cam_p, cam_t, lens, w, h) in CLOSEUPS.items():
            if options.close_only and name not in options.close_only.split(','): continue
            shown = stage_nodes(ch)
            for oname, ob in objects.items():
                ob.hide_render = oname not in shown; ob.hide_viewport = oname not in shown
            fo.hide_render = 'boiler-lit' not in shown
            cam_data.lens = lens
            cam.location = wp(*cam_p)
            cam.rotation_euler = (V(wp(*cam_t)) - V(cam.location)).to_track_quat('-Z', 'Y').to_euler()
            scene.render.resolution_x, scene.render.resolution_y = w, h
            scene.render.filepath = str(folder / f'close-{name}.png')
            bpy.ops.render.render(write_still=True)
            print(f'water-works: rendered close-up {name}')
