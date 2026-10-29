"""Lay the model's outline over the reference pictures and report how well they agree.

  node tools/art/skyline-silhouette.mjs .evidence/<day>/<card>/tris.bin
  python tools/art/skyline-overlay.py .evidence/<day>/<card>

Writes fit-side.png, fit-front.png, fit-rear.png (reference with the model outline in
yellow and the measured outline in cyan) and fit.json (overlap scores) into the folder.
The pictures are mapped exactly as tools/art/skyline-outlines.py mapped them: the side
view through the nose, axle and tail anchors, the front and rear views through the same
pinhole camera and the same ground and roof rows.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]).resolve()
if not out.is_relative_to(root / '.evidence'):
    raise SystemExit('Fit pictures belong under .evidence/')
ref = Path('C:/Users/kyleb/dev/art-library/nissan-skyline-gtr-r34/reference')
data = json.loads((root / 'tools/blender/cars/r34-outlines.json').read_text())
tris = np.fromfile(out / 'tris.bin', dtype=np.float32).reshape(-1, 3, 3)  # x, h, z
HEIGHT, HALF = data['real']['height'], data['real']['length'] / 2
scale = data['pixel_scale']


def car_mask(image):
    rgb = np.asarray(image.convert('RGB')).astype(float) / 255
    mx, mn = rgb.max(2), rgb.min(2)
    return ((mx - mn) / np.maximum(mx, 1e-6) > .25) | (rgb.mean(2) < .28)


def fill(mask, axis):
    """Close the glass, lamps and badges: fill each row (axis 1) or column (axis 0) between its ends."""
    out = np.zeros_like(mask)
    for i in range(mask.shape[1 - axis]):
        line = mask[i] if axis == 1 else mask[:, i]
        idx = np.where(line)[0]
        if len(idx) > 3:
            if axis == 1:
                out[i, idx.min():idx.max() + 1] = True
            else:
                out[idx.min():idx.max() + 1, i] = True
    return out


def edge(mask):
    inner = mask.copy()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        inner &= np.roll(mask, (dy, dx), (0, 1))
    return mask & ~inner


def paint(base, mask, colour):
    arr = np.asarray(base).copy()
    heavy = mask.copy()
    for dx, dy in ((1, 0), (0, 1), (1, 1)):
        heavy |= np.roll(mask, (dy, dx), (0, 1))
    arr[heavy] = colour
    return Image.fromarray(arr)


def raster(size, project):
    img = Image.new('L', size, 0)
    draw = ImageDraw.Draw(img)
    for t in tris:
        pts = [project(*v) for v in t]
        if len({round(p[0]) for p in pts}) == 1 and len({round(p[1]) for p in pts}) == 1:
            continue
        draw.polygon(pts, fill=255)
    return np.asarray(img) > 0


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


result = {}
# Side picture: z maps through nose, front axle, rear axle and tail anchors.
side = Image.open(ref / 'left-side.png').convert('RGB')
ground, roof = scale['ground_row'], scale['roof_row']
anchor_z = [-HALF, data['axles']['rear'], data['axles']['front'], HALF]
anchor_x = [scale['tail_x'], scale['rear_axle_x'], scale['front_axle_x'], scale['nose_x']]
ref_side = car_mask(side)
ref_side[ground + 4:] = False
# Floor shadow lies under the sills: only the wheels reach below them.
wheel_columns = np.zeros(side.size[0], bool)
wheel_columns[226:495] = wheel_columns[1235:1501] = True
shadow = np.zeros_like(ref_side)
shadow[640:, ~wheel_columns] = True
ref_side &= ~shadow
ref_side = fill(ref_side, 0) & ~shadow
model = raster(side.size, lambda x, h, z: (float(np.interp(z, anchor_z, anchor_x)), ground - h / scale['side_height_m_per_px']))
band = np.zeros_like(ref_side)
band[:ground + 1] = True
result['side'] = iou(model & band & ~shadow, ref_side)
img = paint(paint(side, edge(ref_side), (0, 230, 230)), edge(model), (255, 230, 0))
img.save(out / 'fit-side.png')

# Front and rear: the same pinhole camera the outlines were measured with.
for name, picture, sign in (('front', 'front', 1), ('rear', 'rear', -1)):
    view = data[name]
    image = Image.open(ref / f'{picture}.png').convert('RGB')
    cx = view['raw_rows']['centre_x']
    g, r = view['raw_rows']['ground'], view['raw_rows']['roof']
    f, d0 = view['camera']['focal_px'], view['camera']['distance']
    ref_mask = car_mask(image)
    ref_mask[g + 4:] = False
    ref_mask = fill(ref_mask, 1)
    if name == 'front':
        project = lambda x, h, z: (cx + sign * f * x / (d0 + HALF - z), g - h * (g - r) / HEIGHT)
    else:
        project = lambda x, h, z: (cx - f * x / (d0 + z + HALF), g - h * (g - r) / HEIGHT)
    model = raster(image.size, project)
    band = np.zeros_like(ref_mask)
    band[:g + 1] = True
    result[name] = iou(model & band, ref_mask)
    paint(paint(image, edge(ref_mask), (0, 230, 230)), edge(model), (255, 230, 0)).save(out / f'fit-{name}.png')

(out / 'fit.json').write_text(json.dumps({k: round(v, 3) for k, v in result.items()}))
print('Silhouette overlap with the reference (1 is a perfect match):', {k: round(v, 3) for k, v in result.items()})
