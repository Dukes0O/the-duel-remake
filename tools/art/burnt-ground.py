# Ground looks for Tremblant Woods after the fire (FIRE-BURNT-LOOK part 2,
# docs/HELI_FIRE.md sections 8.4 and 14): three tiling textures, one per
# stage, built from seeded noise so the recipe is the source.
#   ground-black.jpg     closed and black: char with grey-white ash drifts
#   ground-shoots.jpg    ash with green shoots coming through
#   ground-fireweed.jpg  green again, ash patches, flecks of fireweed pink
# 1024 square, sRGB, tiling seamlessly (noise is built in frequency space, so
# it wraps). Run: python tools/art/burnt-ground.py --root . [--paths-only]
import argparse, json, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / 'public/assets/burnt/tremblant-woods'
NAMES = ['ground-black.jpg', 'ground-shoots.jpg', 'ground-fireweed.jpg']
if options.paths_only:
    print(json.dumps({'textures': [str(OUT / n) for n in NAMES]}))
    sys.exit(0)

import numpy as np
from PIL import Image

N = 1024
rng = np.random.default_rng(2026)

def noise(scale, seed):
    """Tiling noise with features about `scale` pixels across, in 0..1."""
    r = np.random.default_rng(seed)
    white = r.standard_normal((N, N))
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    spectrum = np.fft.fft2(white) * np.exp(-(f * scale) ** 2)
    out = np.real(np.fft.ifft2(spectrum))
    out -= out.min(); out /= out.max()
    return out

def fbm(seed, scales=(220, 90, 36, 12, 4), weights=(0.4, 0.25, 0.18, 0.11, 0.06)):
    out = sum(w * noise(s, seed + i) for i, (s, w) in enumerate(zip(scales, weights)))
    return (out - out.min()) / (out.max() - out.min())

def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return a * (1 - t) + b * t

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def colour(rgb):
    return np.broadcast_to(np.array(rgb, dtype=float) / 255.0, (N, N, 3))

base = fbm(1)
ash_field = fbm(11)
grain = noise(2.0, 21)
twigs = smoothstep(0.80, 0.86, noise(3.0, 31) * 0.6 + noise(40, 32) * 0.4)   # charred needles and twigs

# Stage: closed and black. Charcoal floor, grey-white ash drifting in hollows.
char = mix(colour((14, 12, 11)), colour((34, 30, 27)), base)
ash = mix(colour((96, 92, 88)), colour((150, 146, 140)), grain)
black = mix(char, ash, smoothstep(0.55, 0.75, ash_field) * 0.85)
black = mix(black, colour((5, 5, 5)), twigs * 0.8)

# Stage: shoots. The same floor, ash washed thinner, green shoots in clumps.
clumps = smoothstep(0.50, 0.68, fbm(41)) * smoothstep(0.30, 0.70, noise(6.0, 42))
shoots = mix(mix(char, ash, smoothstep(0.62, 0.80, ash_field) * 0.55), colour((44, 82, 30)), clumps)
shoots = mix(shoots, colour((70, 112, 40)), clumps * smoothstep(0.6, 0.9, grain) * 0.6)

# Stage: fireweed. Green again with ash patches and flecks of fireweed pink.
green = mix(colour((38, 66, 26)), colour((62, 96, 36)), base)
patches = smoothstep(0.58, 0.72, ash_field)
fire_green = mix(green, mix(char, ash, 0.35), patches * 0.8)
pink = smoothstep(0.63, 0.73, noise(2.5, 51) * 0.5 + fbm(52) * 0.5) * smoothstep(0.45, 0.7, fbm(53))
fireweed = mix(fire_green, colour((176, 40, 108)), pink * 0.9)

OUT.mkdir(parents=True, exist_ok=True)
for name, img in zip(NAMES, (black, shoots, fireweed)):
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(OUT / name, quality=86, optimize=True)
    print('burnt-ground:', OUT / name)
