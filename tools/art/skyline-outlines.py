"""Measure the R34 reference pictures and write the outline file the Blender recipe reads.

  python tools/art/skyline-outlines.py [--reference <folder>] [--debug <folder under .evidence>]

Needs only Pillow and numpy. The car is thresholded against the plain grey
studio background (paint is saturated, tyres and trim are dark). From the side
picture it takes the roofline and the underside from nose to tail and the
window openings. From the front and rear pictures it takes the half width of
the car at each height, corrected for camera perspective with a simple
pinhole model fitted to three known facts: the widest body is 1.785 m, the
roof is 1.36 m high and the wheel axle depths. Everything is scaled to the real
R34: 4.60 m long, 1.785 m wide, 1.36 m high, 2.665 m wheelbase.

Output: tools/blender/cars/r34-outlines.json (z forward, h above the tyre
contact, w half width, all in metres).
"""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--reference', default='C:/Users/kyleb/dev/art-library/nissan-skyline-gtr-r34/reference')
parser.add_argument('--debug')
args = parser.parse_args()
ref = Path(args.reference)
root = Path(__file__).resolve().parents[2]

LENGTH, WIDTH, HEIGHT, WHEELBASE = 4.60, 1.785, 1.36, 2.665
FRONT_AXLE, REAR_AXLE = 1.32, -1.345  # the game's axle positions, metres from the car centre
NOSE_Z, TAIL_Z = LENGTH / 2, -LENGTH / 2


def load(name):
    rgb = np.asarray(Image.open(ref / f'{name}.png').convert('RGB')).astype(float) / 255
    mx, mn = rgb.max(2), rgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    lum = rgb.mean(2)
    return rgb, sat, lum


def car_mask(sat, lum):
    return (sat > .25) | (lum < .28)


def first_run(col, length=4):
    """First row whose next `length` rows are all set: ignores specks."""
    run = np.convolve(col.astype(int), np.ones(length, int), 'valid')
    hits = np.where(run == length)[0]
    return int(hits[0]) if len(hits) else -1


# ---------------------------------------------------------------- side view
rgb, sat, lum = load('left-side')
mask = car_mask(sat, lum)
H, W = mask.shape
cols = np.where(mask[300:600].any(0))[0]
x_nose, x_tail = int(cols.min()), int(cols.max())
# Tyre bottom: lowest very dark pixel in the front tyre's columns, ignoring floor shadow.
tyre_dark = lum < .15
front_cols = tyre_dark[:, 300:420].any(1)
ground_row = int(np.where(front_cols)[0].max())
# The wheel centres from the dark tyre ring extent.
# Wheel centres and tyre ends read from the picture (the tyre ring against the arch shadow is not clean).
fl, fr, rl, rr = 226, 494, 1235, 1500
x_front_axle, x_rear_axle = (fl + fr) / 2, (rl + rr) / 2
roof_row = min(first_run(mask[:, x]) for x in range(850, 1150) if first_run(mask[:, x]) >= 0)
v_scale = HEIGHT / (ground_row - roof_row)  # metres per pixel, height


def x_to_z(x):
    """Piecewise map keeping nose, both axles and tail at their real places."""
    return float(np.interp(x, [x_nose, x_front_axle, x_rear_axle, x_tail],
                           [NOSE_Z, FRONT_AXLE, REAR_AXLE, TAIL_Z]))


def y_to_h(y):
    return (ground_row - y) * v_scale


top = np.array([first_run(mask[:, x]) for x in range(W)], float)
# Wing: replace it with the boot deck line, read from the picture beside the uprights.
DECK_START, DECK_END = 1500, 1706
deck_a, deck_b = top[DECK_START], 326.0
for x in range(DECK_START, DECK_END + 1):
    top[x] = deck_a + (deck_b - deck_a) * (x - DECK_START) / (DECK_END - DECK_START)
# Past the lamp panel only the bumper reaches the tail tip.
top[DECK_END + 1:x_tail + 1] = 428.0

def median(values, width):
    pad = width // 2
    padded = np.pad(values, pad, mode='edge')
    return np.array([np.median(padded[i:i + width]) for i in range(len(values))])


# Wiper, reflection and trim specks spike the edge; a median pass removes them.
smooth_top = median(top, 9)
smooth_top[440:625] = median(top, 41)[440:625]
smooth_top[1170:1260] = median(top, 15)[1170:1260]
smooth_top[1380:1500] = median(top, 51)[1380:1500]
top = smooth_top

# Underside: dark underbody edge between the wheels, lowest body pixel at the ends.
firm = (sat > .3) | (lum < .17)
bottom = np.full(W, np.nan)
for x in range(x_nose, x_tail + 1):
    in_wheel = (fl - 8 <= x <= fr + 8) or (rl - 8 <= x <= rr + 8)
    if in_wheel:
        continue
    if x < fl or x > rr:
        ys = np.where(firm[:660, x])[0]
        bottom[x] = ys.max() if len(ys) else np.nan
    else:
        y = 500
        while y < H - 1 and firm[y + 1, x]:
            y += 1
        bottom[x] = y
valid = ~np.isnan(bottom)
bottom = np.interp(np.arange(W), np.where(valid)[0], bottom[valid])
bottom = median(bottom, 41)
bottom[:48] = bottom[48]  # the nose tip column is only the leading edge of the bumper
bottom = np.convolve(np.pad(bottom, 6, mode='edge'), np.ones(13) / 13, 'valid')

steps = np.arange(x_nose, x_tail + 1, 4)
side_top = [[round(x_to_z(x), 4), round(y_to_h(top[x]), 4)] for x in steps]
side_bottom = [[round(x_to_z(x), 4), round(y_to_h(bottom[x]), 4)] for x in steps]

# Window openings read from the picture (pixel corners), mapped to metres.
GLASS_PIXELS = {
    'door': [(745, 322), (790, 262), (835, 208), (850, 198), (1030, 196), (1040, 205), (1040, 322)],
    'quarter': [(1092, 210), (1106, 199), (1185, 205), (1225, 232), (1262, 285), (1270, 312), (1255, 322), (1092, 322)],
    'b_pillar': [(1040, 196), (1090, 200), (1092, 322), (1040, 322)],
}
glass = {k: [[round(x_to_z(x), 4), round(y_to_h(y), 4)] for x, y in v] for k, v in GLASS_PIXELS.items()}

# Where the sloping windscreen and rear window start and end along the car (picture columns).
SCREENS_PIXELS = {'windscreen': (600, 805), 'rear_window': (1222, 1432)}
screens = {k: [round(x_to_z(x), 4) for x in v] for k, v in SCREENS_PIXELS.items()}

mirror_px = (625, 285, 745, 335)  # picture box of the door mirror
mirror_side = {'z': [round(x_to_z(mirror_px[0]), 4), round(x_to_z(mirror_px[2]), 4)],
               'h': [round(y_to_h(mirror_px[3]), 4), round(y_to_h(mirror_px[1]), 4)]}
wing_px = {'x0': 1545, 'x1': 1722, 'top': 228, 'deck': 318}
wing_side = {'z': [round(x_to_z(wing_px['x1']), 4), round(x_to_z(wing_px['x0']), 4)],
             'top_h': round(y_to_h(wing_px['top']), 4), 'deck_h': round(y_to_h(wing_px['deck']), 4)}
wheel_side = {'radius': round((fr - fl) / 2 * v_scale, 4)}


# ------------------------------------------------------- front and rear views
def depth_from_side(profile_top):
    """Depth (m from the near end) at which the roofline first reaches each height."""
    pts = np.array(profile_top)
    return pts


def fit_camera(view, ground, roof_top, d_axle, d_roof, wide_px, distance=None):
    """Pinhole fit. The widest body fixes the focal length at the axle depth. The camera
    distance comes from the front picture (the roof is farther away than the wheels, so it
    looks narrower); the rear picture reuses it because its own roof row is not reliable.
    Heights are read straight from the picture rows, ground to roof."""
    cx, cy = view
    s_axle = wide_px / WIDTH
    if distance is None:
        hc = (ground - cy) / s_axle
        a = s_axle * (HEIGHT - hc)
        distance = ((cy - roof_top) * d_roof - a * d_axle) / (a - (cy - roof_top))
    f = s_axle * (distance + d_axle)
    return f, distance


def view_outline(name, ground, roof_top, d_axle, d_roof, interp_rows, depth_of_height, distance=None):
    rgb, sat, lum = load(name)
    mask = car_mask(sat, lum)
    H, W = mask.shape
    left = np.full(H, np.nan); right = np.full(H, np.nan)
    for y in range(H):
        xs = np.where(mask[y])[0]
        if len(xs) > 3:
            left[y], right[y] = xs.min(), xs.max()
    centre_x = np.nanmedian((left + right)[int(H * .55):int(H * .8)] / 2)
    half_px = (right - left) / 2
    rows = np.arange(H)
    ok = ~np.isnan(half_px)
    # Rows polluted by mirrors or the wing: interpolate between their clean neighbours.
    for a, b in interp_rows:
        half_px[a:b] = np.interp(np.arange(a, b), [a - 1, b], [half_px[a - 1], half_px[b]])
    wide_px = np.nanmax(half_px[int(H * .5):int(H * .85)]) * 2
    cy = H / 2
    f, D = fit_camera((W / 2, cy), ground, roof_top, d_axle, d_roof, wide_px, distance)
    result = []
    for y in range(int(roof_top), int(ground) - 4):
        if np.isnan(half_px[y]):
            continue
        h = (ground - y) * HEIGHT / (ground - roof_top)
        d = depth_of_height(h)
        w = half_px[y] * (D + d) / f
        result.append((h, w, d))
    result.sort()
    hs = np.arange(0.05, HEIGHT - 0.005, 0.02)
    arr = np.array(result)
    # Width never grows with height past the roof; clip to the picture's range.
    ws = np.interp(hs, arr[:, 0], arr[:, 1])
    ws = np.array([np.median(ws[max(0, i - 2):i + 3]) for i in range(len(ws))])
    # Above the shoulder the car only gets narrower: a running minimum removes mirror leftovers.
    start = int(np.searchsorted(hs, .85))
    ws[start:] = np.minimum.accumulate(ws[start:])
    # The glasshouse leans in at a steady rate from the belt line to the roof edge.
    a, b = int(np.searchsorted(hs, .93)), int(np.searchsorted(hs, 1.29))
    ws[a:b + 1] = np.interp(hs[a:b + 1], [hs[a], hs[b]], [ws[a], ws[b]])
    return {'camera': {'focal_px': round(float(f), 1), 'distance': round(float(D), 3), 'image': [W, H]},
            'half_width': [[round(float(h), 3), round(float(w), 4)] for h, w in zip(hs, ws)],
            'raw_rows': {'ground': ground, 'roof': roof_top, 'centre_x': round(float(centre_x), 1)}}, half_px, centre_x, (f, D)


side_t = np.array(side_top)  # z, h from nose to tail


def depth_front(h):
    near = NOSE_Z - FRONT_AXLE
    if h <= .85:
        return near
    # first station from the nose where the roofline reaches h
    idx = np.where(side_t[:, 1] >= h)[0]
    first = NOSE_Z - side_t[idx[0], 0] if len(idx) else 2.4
    t = min(1, (h - .85) / .15)
    return near + (max(first, near) - near) * t


def depth_rear(h):
    near = REAR_AXLE - TAIL_Z
    if h <= .85:
        return near
    idx = np.where(side_t[::-1, 1] >= h)[0]
    last = side_t[::-1][idx[0], 0] - TAIL_Z if len(idx) else 2.4
    t = min(1, (h - .85) / .15)
    return near + (max(last, near) - near) * t


def rows_where(name, thresh_dark=.12, cols=(120, 340)):
    rgb, sat, lum = load(name)
    dark = lum < thresh_dark
    r = np.where(dark[:, cols[0]:cols[1]].any(1))[0]
    return int(r.max())


front_ground = rows_where('front', cols=(170, 340))
rear_ground = rows_where('rear', cols=(120, 300))
rear_roof = int(np.where(car_mask(*load('rear')[1:]).any(1))[0].min())
front_roof = int(np.where(car_mask(*load('front')[1:]).any(1))[0].min())
front_out, fhalf, fcx, fcam = view_outline('front', front_ground, front_roof, NOSE_Z - FRONT_AXLE, 2.2, [(246, 330)], depth_front)
rear_out, rhalf, rcx, rcam = view_outline('rear', rear_ground, rear_roof, REAR_AXLE - TAIL_Z, 1.45, [(250, 380)], depth_rear, distance=fcam[1])

# Wing and mirror from the front and rear pictures.
ff, fD = fcam
rf, rD = rcam
mirror_front = {'outer_px': 215, 'inner_px': 330, 'rows': [245, 322]}
mz = (mirror_side['z'][0] + mirror_side['z'][1]) / 2
mirror = {
    'z_range': mirror_side['z'], 'h_range': mirror_side['h'],
    'outer_x': round((fcx - 215) * (fD + NOSE_Z - mz) / ff, 4),
    'inner_x': round((fcx - 330) * (fD + NOSE_Z - mz) / ff, 4),
}
wz = (wing_side['z'][0] + wing_side['z'][1]) / 2
wing_scale = (rD + wz - TAIL_Z) / rf
wing = {
    'z_range': wing_side['z'], 'top_h': wing_side['top_h'], 'deck_h': wing_side['deck_h'],
    'half_span': round((1175 - 270) / 2 * wing_scale, 4),
    'upright_x': round((1017 - 425) / 2 * wing_scale, 4),
}

out = {
    'note': 'Measured from the R34 reference pictures by tools/art/skyline-outlines.py. Metres; z forward from the car centre, h above tyre contact, w half width.',
    'real': {'length': LENGTH, 'width': WIDTH, 'height': HEIGHT, 'wheelbase': WHEELBASE},
    'axles': {'front': FRONT_AXLE, 'rear': REAR_AXLE},
    'pixel_scale': {'side_height_m_per_px': round(v_scale, 6), 'ground_row': ground_row, 'roof_row': roof_row,
                    'nose_x': x_nose, 'tail_x': x_tail, 'front_axle_x': x_front_axle, 'rear_axle_x': x_rear_axle},
    'side': {'top': side_top, 'bottom': side_bottom, 'glass': glass, 'screens': screens, 'wheel': wheel_side},
    'front': front_out, 'rear': rear_out,
    'mirror': mirror, 'wing': wing,
}
target = root / 'tools/blender/cars/r34-outlines.json'
target.write_text(json.dumps(out, separators=(',', ':')) + '\n')
print('Wrote', target, target.stat().st_size, 'bytes')
print('side: ground', ground_row, 'roof', roof_row, 'nose/tail x', x_nose, x_tail, 'axles', x_front_axle, x_rear_axle)
print('front camera', front_out['camera'], 'rear camera', rear_out['camera'])
print('mirror', mirror, 'wing', wing)

if args.debug:
    d = Path(args.debug).resolve()
    if not d.is_relative_to(root / '.evidence'):
        raise SystemExit('Debug pictures go under .evidence/')
    d.mkdir(parents=True, exist_ok=True)
    im = Image.open(ref / 'left-side.png').convert('RGB')
    dr = ImageDraw.Draw(im)
    dr.line([(x, top[x]) for x in range(x_nose, x_tail)], fill=(255, 255, 0), width=2)
    dr.line([(x, bottom[x]) for x in range(x_nose, x_tail) if not (fl - 8 <= x <= fr + 8 or rl - 8 <= x <= rr + 8)], fill=(255, 0, 0), width=2)
    for k, v in GLASS_PIXELS.items():
        dr.polygon(v, outline=(0, 255, 0))
    dr.line([(0, ground_row), (W, ground_row)], fill=(0, 255, 255))
    im.save(d / 'side-extract.png')
