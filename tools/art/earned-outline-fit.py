"""Score an earned car's runtime silhouette against its traced photo outline (EARN-OUTLINE).

  node tools/art/earned-export.mjs <key> <lane .evidence folder>
  python tools/art/earned-outline-fit.py <lane .evidence folder> [key ...]

Rasterises every visible triangle seen from the side (orthographic, 200 px a metre) and
the traced side outline from tools/art/earned-outlines.json, prints their overlap (1 is
exact) and writes fit-<key>-side.png: model filled grey, model edge yellow, trace cyan.
Front and rear widths are scored the same way when the outline has them.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PX = 200
folder = Path(sys.argv[1]).resolve()
if not folder.is_relative_to(ROOT / '.evidence'):
    raise SystemExit('Fit pictures belong under .evidence/')
outlines = json.loads((ROOT / 'tools/art/earned-outlines.json').read_text())
keys = sys.argv[2:] or [k for k in outlines if (folder / f'{k}-tris.bin').exists()]


def raster(size, polys):
    img = Image.new('L', size, 0)
    draw = ImageDraw.Draw(img)
    for poly in polys:
        draw.polygon(poly, fill=255)
    return np.asarray(img) > 0


def edge(mask):
    inner = mask.copy()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        inner &= np.roll(mask, (dy, dx), (0, 1))
    return mask & ~inner


VIEWS = {
    # name: (outline keys joined into one closed polygon, model axes (horizontal, vertical), picture size, origin)
    'side': (('top', 'tail', 'bottom'), (2, 1), (1100, 330), (550, 300), -1),
    'front': (('half',), (0, 1), (520, 330), (260, 300), 1),
    'rear': (('half',), (0, 1), (520, 330), (260, 300), 1),
}
scores = {}
for key in keys:
    tris = np.fromfile(folder / f'{key}-tris.bin', dtype=np.float32).reshape(-1, 3, 3)
    scores[key] = {}
    for view, (parts, (ha, va), size, (ox, oy), flip) in VIEWS.items():
        trace = outlines[key].get(view)
        if not trace or not all(p in trace for p in parts):
            continue
        project = lambda h, v: (ox + flip * h * PX, oy - v * PX)
        if view == 'side':
            poly = [project(z, y) for part in parts for z, y in trace[part]]
            polys = [poly]
        else:
            half = trace['half']
            poly = [project(x, y) for x, y in half] + [project(-x, y) for x, y in reversed(half)]
            polys = [poly]
        traced = raster(size, polys)
        model = raster(size, [[project(t[i][ha], t[i][va]) for i in range(3)] for t in tris])
        score = float((traced & model).sum() / max(1, (traced | model).sum()))
        scores[key][view] = round(score, 3)
        picture = np.full(size[::-1] + (3,), 245, np.uint8)
        picture[model] = (150, 150, 150)
        picture[edge(model)] = (200, 160, 0)
        img = Image.fromarray(picture)
        ImageDraw.Draw(img).line(poly + [poly[0]], fill=(0, 150, 220), width=2)
        ImageDraw.Draw(img).text((8, 8), f'{key} {view}: overlap {score:.3f}', fill=(0, 0, 0))
        img.save(folder / f'fit-{key}-{view}.png')
print(json.dumps(scores))
(folder / 'fit.json').write_text(json.dumps(scores, indent=1))
