# Kestrel One's paints and grime (SKIN-ART-PAINT, docs/HELI_WILDLIFE.md
# sections 5 and 12). Writes, into public/assets/heli/skins/:
#   palettes.json   the seven paints as colours for the model's three paint
#                   materials (paint_white = body, paint_navy = lower and tail,
#                   paint_red = stripe), sRGB hex; the wildlife skin's body and
#                   lower use camo.jpg; the TV skin carries the Barely News logo
#                   on both doors (decal centre, size and facing, glTF metres)
#   camo.jpg        tiling camouflage, olive, brown and dark green, 1024 square
#   grime-dust.jpg, grime-mud.jpg, grime-soot.jpg, grime-salt.jpg
#                   tiling greyscale masks (white = dirty), 1024 square, blended
#                   over the paint by grime level, each in its own colour
# The textures are projected in object space (triplanar) by SKIN-VIEW, because
# Kestrel One is built from primitives without a painted UV layout.
# Seeded noise built in frequency space, so every texture tiles. Run:
#   python tools/art/kestrel-skins.py --root . [--paths-only]
import argparse, json, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / 'public/assets/heli/skins'
FILES = ['palettes.json', 'camo.jpg', 'grime-dust.jpg', 'grime-mud.jpg', 'grime-soot.jpg', 'grime-salt.jpg']
if options.paths_only:
    print(json.dumps({'files': [str(OUT / f) for f in FILES]}))
    sys.exit(0)

import numpy as np
from PIL import Image

N = 1024

def noise(scale, seed):
    r = np.random.default_rng(seed)
    white = r.standard_normal((N, N))
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
    spectrum = np.fft.fft2(white) * np.exp(-((np.sqrt(fx * fx + fy * fy)) * scale) ** 2)
    out = np.real(np.fft.ifft2(spectrum)); out -= out.min(); return out / out.max()

def fbm(seed, scales=(240, 100, 40, 14, 5), weights=(.4, .25, .18, .11, .06)):
    out = sum(w * noise(s, seed + i) for i, (s, w) in enumerate(zip(scales, weights)))
    return (out - out.min()) / (out.max() - out.min())

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def save_grey(name, mask):
    Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8), 'L').save(OUT / name, quality=88, optimize=True)

OUT.mkdir(parents=True, exist_ok=True)

# Camouflage: three overlapping blob layers with hard edges, like a real military scheme.
rgb = np.zeros((N, N, 3)) + np.array([0x5a, 0x5e, 0x3a]) / 255          # olive
brown = smoothstep(.58, .60, fbm(11, (180, 70, 25, 9, 4)))
green = smoothstep(.60, .62, fbm(23, (150, 60, 22, 8, 4)))
black = smoothstep(.70, .715, fbm(37, (120, 50, 18, 7, 3)))
for layer, colour in ((brown, (0x5c, 0x47, 0x2e)), (green, (0x2c, 0x3a, 0x22)), (black, (0x1d, 0x1f, 0x18))):
    rgb = rgb * (1 - layer[..., None]) + np.array(colour) / 255 * layer[..., None]
grain = (noise(2.0, 51) - .5) * .05
Image.fromarray((np.clip(rgb + grain[..., None], 0, 1) * 255).astype(np.uint8)).save(OUT / 'camo.jpg', quality=88, optimize=True)

# Grime masks. Dust: a fine, even film with streaks; mud: splatter, heavier in clumps;
# soot: smoky blooms with streaks; salt: crusty white rings and spots.
streak_y = np.repeat(noise(3.0, 61)[:1, :], N, axis=0)                    # rain streaks run down the body
save_grey('grime-dust.jpg', smoothstep(.25, .85, fbm(71)) * .75 + .25 * smoothstep(.4, .9, noise(2.5, 72)))
splat = smoothstep(.66, .74, fbm(81, (60, 25, 10, 4, 2)))
save_grey('grime-mud.jpg', np.clip(splat + .45 * smoothstep(.55, .8, fbm(82)), 0, 1))
save_grey('grime-soot.jpg', np.clip(smoothstep(.45, .85, fbm(91, (300, 120, 45, 16, 6))) * .85 + .25 * smoothstep(.5, .9, noise(1.5, 92) * .5 + streak_y * .5), 0, 1))
rings = np.abs(fbm(101, (90, 40, 15, 6, 3)) - .5) < .025
save_grey('grime-salt.jpg', np.clip(rings * .9 + .7 * smoothstep(.72, .8, noise(3.0, 102)), 0, 1))

palettes = {
    'version': 1,
    'materials': {'body': 'paint_white', 'lower': 'paint_navy', 'stripe': 'paint_red'},
    'grime': {'dust': {'mask': 'grime-dust.jpg', 'colour': '#8a7a5e'}, 'mud': {'mask': 'grime-mud.jpg', 'colour': '#3e3020'},
              'soot': {'mask': 'grime-soot.jpg', 'colour': '#1c1a18'}, 'salt': {'mask': 'grime-salt.jpg', 'colour': '#d8d6cc'}},
    'skins': {
        'stock': {'body': '#e7e7e4', 'lower': '#283654', 'stripe': '#b0312a'},
        'fire': {'body': '#a8261c', 'lower': '#e2a51c', 'stripe': '#ecebe5'},
        'medevac': {'body': '#ededea', 'lower': '#ededea', 'stripe': '#b3231c'},
        'rescue': {'body': '#e9b512', 'lower': '#b3231c', 'stripe': '#161616'},
        'wildlife': {'body': 'camo.jpg', 'lower': 'camo.jpg', 'stripe': '#2c3a22'},
        'supply': {'body': '#d9671b', 'lower': '#ededea', 'stripe': '#161616'},
        'tv': {'body': '#141516', 'lower': '#141516', 'stripe': '#b8902e',
               'decal': {'image': '../barely-news.svg', 'size': .5,
                         'doors': [{'centre': [.72, 1.28, .78], 'normal': [1, 0, 0]}, {'centre': [-.72, 1.28, .78], 'normal': [-1, 0, 0]}]}},
    },
}
(OUT / 'palettes.json').write_text(json.dumps(palettes, indent=1) + '\n', encoding='utf8', newline='\n')
print('kestrel-skins: wrote', ', '.join(FILES))
