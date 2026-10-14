# Fire, smoke, steam and water spray for H2 Fire (FIRE-ART-FX,
# docs/HELI_FIRE.md section 14). Packs coloured sprites from the Kenney
# particle pack (CC0, kept outside the repository in the art library) into one
# 1024 square atlas with straight alpha, plus a frame table the game reads.
#
# The pack's sprites are grey shapes meant to be tinted. Each family gets a
# real colour ramp from the sprite's own brightness:
#   flame  6  deep red edges, orange body, yellow-white core
#   smoke  6  grey-brown, thicker and darker toward the base of a column
#   steam  2  white, soft
#   spray  2  pale blue-white droplets (water breaking up as it falls)
#   ember  1  orange spark
#   scorch 3  near-black ground burns, for scars and the burnt edge
# Run: python tools/art/fire-fx.py --root . [--paths-only] [--sheet DIR]
import argparse, json, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--sheet', default='', help='folder for the review sheet')
parser.add_argument('--source', default=r'C:\Users\kyleb\dev\art-library\kenney-particle-pack\unpacked\PNG (Transparent)')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
ATLAS = root / 'public/assets/heli/fire-fx.png'
TABLE = root / 'public/assets/heli/fire-fx.json'
if options.paths_only:
    print(json.dumps({'png': [str(ATLAS)], 'json': [str(TABLE)]}))
    sys.exit(0)

import numpy as np
from PIL import Image

SIZE, CELL, GRID, PAD = 1024, 204, 5, 2
SOURCE = Path(options.source)

def ramp(stops, t):
    """Colour at t (0..1) along [(position, (r, g, b)), ...] in linear 0..1."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(p1 - p0, 1e-6))[..., None]
        out[m] = (np.array(c0) * (1 - k) + np.array(c1) * k)[m]
    return out

FLAME = [(0.0, (0.35, 0.02, 0.0)), (0.35, (0.85, 0.18, 0.02)), (0.65, (1.0, 0.52, 0.08)),
         (0.88, (1.0, 0.82, 0.38)), (1.0, (1.0, 0.95, 0.80))]
SMOKE = [(0.0, (0.22, 0.20, 0.18)), (0.5, (0.42, 0.39, 0.35)), (1.0, (0.66, 0.63, 0.58))]
STEAM = [(0.0, (0.78, 0.80, 0.82)), (1.0, (0.97, 0.98, 0.99))]
SPRAY = [(0.0, (0.55, 0.66, 0.74)), (1.0, (0.88, 0.94, 0.98))]
EMBER = [(0.0, (0.6, 0.12, 0.0)), (0.6, (1.0, 0.45, 0.05)), (1.0, (1.0, 0.88, 0.5))]
SCORCH = [(0.0, (0.02, 0.018, 0.015)), (1.0, (0.10, 0.08, 0.06))]

FAMILIES = [
    # name, source sprites, colour stops, alpha scale, extra treatment
    ('flame', ['flame_01', 'flame_02', 'flame_03', 'flame_04', 'fire_01', 'fire_02'], FLAME, 1.0, None),
    ('smoke', ['smoke_01', 'smoke_02', 'smoke_03', 'smoke_04', 'smoke_05', 'smoke_06'], SMOKE, 1.35, 'base'),
    ('steam', ['smoke_07', 'smoke_08'], STEAM, 0.7, None),
    ('spray', ['dirt_02', 'dirt_03'], SPRAY, 0.85, None),
    ('ember', [None], EMBER, 1.0, 'embers'),     # the pack's sparks are lightning; embers are drawn
    ('scorch', ['scorch_01', 'scorch_02', 'scorch_03'], SCORCH, 0.92, None),
]

def ember_cluster(size, seed=5):
    """A loose cluster of glowing dots: brightness in lum, coverage in alpha."""
    r = np.random.default_rng(seed)
    yy, xx = np.indices((size, size)).astype(float)
    lum = np.zeros((size, size))
    for _ in range(22):
        cx, cy = r.normal(size / 2, size / 6, 2)
        rad = r.uniform(1.5, 5.0)
        lum = np.maximum(lum, np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad * rad)) * r.uniform(0.6, 1.0))
    return lum, np.clip(lum * 1.4, 0, 1)

def tinted(name, stops, alpha_scale, extra):
    if extra == 'embers':
        lum, alpha = ember_cluster(CELL - 2 * PAD)
    else:
        im = Image.open(SOURCE / f'{name}.png').convert('RGBA').resize((CELL - 2 * PAD, CELL - 2 * PAD), Image.LANCZOS)
        a = np.asarray(im, dtype=float) / 255.0
        lum, alpha = a[..., 0], a[..., 3]
    rgb = ramp(stops, lum)
    if extra == 'base':
        # A smoke column is thick and dark low down and thins as it rises.
        h = rgb.shape[0]
        rise = np.linspace(0.0, 1.0, h)[:, None]            # 0 at the top row, 1 at the bottom
        rgb = rgb * (1.0 - 0.25 * rise[..., None])
        alpha = alpha * (0.75 + 0.25 * rise)
    out = np.dstack([rgb, np.clip(alpha * alpha_scale, 0, 1)])
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')

atlas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
table = {'version': 1, 'size': SIZE, 'cell': CELL, 'source': 'Kenney Particle Pack (CC0)', 'frames': {}}
slot = 0
for family, names, stops, alpha_scale, extra in FAMILIES:
    table['frames'][family] = []
    for name in names:
        x, y = (slot % GRID) * CELL, (slot // GRID) * CELL
        atlas.paste(tinted(name, stops, alpha_scale, extra), (x + PAD, y + PAD))
        table['frames'][family].append({'x': x + PAD, 'y': y + PAD, 'w': CELL - 2 * PAD, 'h': CELL - 2 * PAD,
                                        'from': name or 'drawn'})
        slot += 1
assert slot <= GRID * GRID
ATLAS.parent.mkdir(parents=True, exist_ok=True)
atlas.save(ATLAS, optimize=True)
TABLE.write_text(json.dumps(table, indent=1) + '\n', encoding='utf8', newline='\n')
print(f'fire-fx: {slot} frames, {ATLAS.stat().st_size} bytes')

if options.sheet:
    # Review sheet: the atlas on a checker, and the frames used together over the
    # burnt and green ground textures (a smoke column, a burning edge, a water drop).
    folder = (root / options.sheet).resolve(); folder.mkdir(parents=True, exist_ok=True)
    checker = Image.new('RGB', (SIZE, SIZE))
    c = np.indices((SIZE, SIZE)).sum(0) // 32 % 2
    checker = Image.fromarray(np.where(c[..., None] == 1, 70, 110).astype(np.uint8).repeat(3, 2))
    checker.paste(atlas, (0, 0), atlas)
    ground = root / 'public/assets/burnt/tremblant-woods'
    scene = Image.new('RGB', (1024, 1024))
    green = Image.open(ground / 'ground-fireweed.jpg').convert('RGB')
    black = Image.open(ground / 'ground-black.jpg').convert('RGB')
    scene.paste(green, (0, 0))
    mask = Image.fromarray((np.clip((np.indices((1024, 1024))[1] - 520 + 60 * np.sin(np.indices((1024, 1024))[0] / 70.0)) / 40.0, 0, 1) * 255).astype(np.uint8))
    scene = Image.composite(black, scene, mask)
    frames = table['frames']
    def stamp(family, i, centre, scale):
        f = frames[family][i]
        sprite = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])).resize((int(f['w'] * scale), int(f['h'] * scale)), Image.LANCZOS)
        scene.paste(sprite, (int(centre[0] - sprite.width / 2), int(centre[1] - sprite.height / 2)), sprite)
    rng = np.random.default_rng(7)
    for k in range(9):                                   # scorch along the burnt edge
        stamp('scorch', k % 3, (520 + rng.integers(-40, 60), 120 + k * 100), 0.8)
    for k in range(14):                                  # flames on the burning edge
        stamp('flame', k % 6, (530 + rng.integers(-30, 30), 80 + k * 66), 0.55 + 0.25 * rng.random())
    for k in range(8):                                   # a smoke column leaning downwind
        stamp('smoke', k % 6, (560 + k * 38, 520 - k * 60), 0.9 + 0.25 * k)
    for k in range(3):
        stamp('steam', k % 2, (300 + k * 30, 640 - k * 40), 1.1)
    for k in range(4):                                   # a water drop falling on the near edge
        stamp('spray', k % 2, (300 + k * 10, 420 + k * 70), 0.9)
    for k in range(6):
        stamp('ember', 0, (600 + rng.integers(-80, 120), 300 + rng.integers(-200, 200)), 0.25)
    sheet = Image.new('RGB', (2048, 1024))
    sheet.paste(checker, (0, 0)); sheet.paste(scene, (1024, 0))
    sheet.resize((1600, 800), Image.LANCZOS).save(folder / 'sheet.jpg', quality=82, optimize=True)
    print('fire-fx: sheet', folder / 'sheet.jpg')
