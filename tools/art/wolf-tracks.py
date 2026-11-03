# Wolf tracks in snow for Tremblant Snow (WILD-ART-SRC, docs/HELI_WILDLIFE.md 3.1):
# one tiling decal, 512 x 512 RGBA, transparent where the snow is untouched.
# The tile is 1.5 m square: a walking wolf's line of prints runs up the
# middle, one print every 0.5 m, each about 11 cm long. Soft snow blurs the
# four toes, claw marks and heel pad into a rounded hole; a faint drag trough
# and kicked-out crumbs of snow join the prints.
# It tiles top to bottom (prints wrap), so a strip of any length repeats it.
# Light comes from the upper left; depressions are cool blue-grey shadow
# with a bright crumbled rim. Seeded, so the recipe is the source.
# Run: python tools/art/wolf-tracks.py --root . [--paths-only]
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / 'public/assets/wildlife/wolf-tracks.png'
if options.paths_only:
    print(json.dumps({'textures': [str(OUT)]}))
    sys.exit(0)

import numpy as np
from PIL import Image

N = 512
PX = N / 1.5                 # pixels per metre
rng = np.random.default_rng(1024)
yy, xx = np.mgrid[0:N, 0:N].astype(float)


def blob(cx, cy, rx, ry, angle=0.0, power=2.0):
    """Soft elliptical depression, 1 in the middle, wrapping top to bottom."""
    out = np.zeros((N, N))
    c, s = np.cos(angle), np.sin(angle)
    for wrap in (-N, 0, N):
        dx, dy = xx - cx, yy - (cy + wrap)
        u = (dx * c + dy * s) / rx
        v = (-dx * s + dy * c) / ry
        out = np.maximum(out, np.clip(1 - (u * u + v * v) ** (power / 2), 0, 1))
    return out


def tiling_noise(scale, seed):
    r = np.random.default_rng(seed)
    white = r.standard_normal((N, N))
    fy = np.fft.fftfreq(N)[:, None]
    fx = np.fft.fftfreq(N)[None, :]
    spectrum = np.fft.fft2(white) * np.exp(-((fx * fx + fy * fy) ** .5 * scale) ** 2)
    out = np.real(np.fft.ifft2(spectrum))
    return (out - out.min()) / (out.max() - out.min())


depth = np.zeros((N, N))
cm = PX / 100.0 * 1.2           # prints spread a little in soft snow
stride = N / 3
for k in range(3):
    cx = N / 2 + (1 if k % 2 else -1) * 4.5 * cm + rng.normal(0, .8 * cm)
    cy = k * stride + stride / 2 + rng.normal(0, 1.2 * cm)
    turn = rng.normal(0, .08) + (.06 if k % 2 else -.06)
    c, s = np.cos(turn), np.sin(turn)

    def at(x, y):
        # Print frame: x across, y towards the heel (the wolf walks up).
        return cx + x * cm * c - y * cm * s, cy + x * cm * s + y * cm * c

    pads = [(0, 2.6, 3.6, 3.0, 2.2), (-1.7, -2.4, 1.5, 2.0, 2.6), (1.7, -2.4, 1.5, 2.0, 2.6),
            (-3.6, -.6, 1.3, 1.8, 2.6), (3.6, -.6, 1.3, 1.8, 2.6)]
    for x, y, rx, ry, power in pads:
        px, py = at(x, y)
        depth = np.maximum(depth, (.85 + .15 * rng.random()) * blob(px, py, rx * cm, ry * cm, turn, power))
    for x, y in ((-1.8, -5.0), (1.8, -5.0), (-4.1, -3.2), (4.1, -3.2)):
        px, py = at(x, y)
        depth = np.maximum(depth, .55 * blob(px, py, .55 * cm, .9 * cm, turn))
    # The whole foot presses a shallow oval round the pads.
    px, py = at(0, -.5)
    depth = np.maximum(depth, .62 * blob(px, py, 5.4 * cm, 7.0 * cm, turn, 1.4))
    # Snow dragged forward out of the print by the toes.
    px, py = at(0, -8.5)
    depth = np.maximum(depth, .14 * blob(px, py, 2.4 * cm, 4.5 * cm, turn, 1.2))

# Faint drag trough along the line of travel, broken by the noise.
trough = np.clip(1 - np.abs(xx - N / 2) / (6 * cm), 0, 1) ** 1.5 * .10
depth = np.maximum(depth, trough * (tiling_noise(30, 7) > .45))
grain = tiling_noise(3, 11)
depth = np.clip(depth * (.85 + .3 * grain), 0, 1)
# Soft snow: blur the crisp pad shapes into a rounded hole (wraps).
fy = np.fft.fftfreq(N)[:, None]
fx = np.fft.fftfreq(N)[None, :]
depth = np.real(np.fft.ifft2(np.fft.fft2(depth) * np.exp(-(fx * fx + fy * fy) * (3.3 * np.pi) ** 2 * 2)))
depth = np.clip(depth, 0, 1)

# Shade the depression: light from upper left, so the far walls catch light.
gy, gx = np.gradient(np.pad(depth, 2, mode='wrap'))
gy, gx = gy[2:-2, 2:-2], gx[2:-2, 2:-2]
light = np.clip(.5 + (gx * .7 + gy * .7) * 9, 0, 1)
shadow = np.array([132, 146, 166], float)
lit = np.array([236, 241, 248], float)
rgb = shadow[None, None, :] * (1 - light[..., None]) + lit[None, None, :] * light[..., None]
rgb = rgb * (1 - .25 * depth[..., None]) + rgb * .04 * (grain[..., None] - .5)
# Crumbled bright rim just outside each print.
spread = depth.copy()
for shift in ((0, 2), (0, -2), (2, 0), (-2, 0), (2, 2), (-2, -2)):
    spread = np.maximum(spread, np.roll(depth, shift, axis=(0, 1)))
rim = np.clip(spread - depth, 0, 1) * .6
# Crumbs of snow kicked out round each print.
crumbs = (tiling_noise(1.5, 13) > .78) * np.clip(spread * 3 - depth * 2, 0, 1)
rim = np.clip(rim + crumbs * .7, 0, 1)
alpha = np.clip(depth * 2.2 + rim * .5, 0, 1) * .92
rgb = rgb * (1 - rim[..., None]) + lit[None, None, :] * rim[..., None]
image = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(image, 'RGBA').save(OUT, optimize=True)
print(json.dumps({'texture': str(OUT), 'bytes': OUT.stat().st_size, 'size': [N, N]}))
