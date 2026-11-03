"""Outlines of the three earned cars, traced by hand from the reference photos (EARN-OUTLINE).

  python tools/art/earned-outlines.py            writes tools/art/earned-outlines.json
  python tools/art/earned-outlines.py --check <lane .evidence folder>
                                                 draws each trace back over its photo

The photos live in C:/Users/kyleb/dev/art-library/<car>/reference/ (viewing only, never
shipped). Each trace is a list of photo pixels read off a 10 to 25 px grid. The side
photos are taken from the front quarter with a slight downward look, so a plain scale
would be wrong: the side view is mapped through a one-dimensional pinhole camera fitted
to the two wheel hubs and the two rim sizes (the 19 or 20 inch rims are a known length),
giving metres along the car and above the road. Front and rear outlines are scaled by
the track of the two contact patches. Output is in game metres: +Z forward, front axle
at the car file's front axle, ground at 0.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = Path('C:/Users/kyleb/dev/art-library')
OUT = ROOT / 'tools/art/earned-outlines.json'

CARS = {
    'ferrari_enzo': {
        'folder': 'ferrari-enzo',
        'axles': [1.30, -1.35], 'length': 4.70,
        'real': {'length': 4.702, 'width': 2.035, 'height': 1.147, 'wheelbase': 2.65},
        'side': {
            'photo': 'side.jpg',
            # Hub centres (px), rim radius seen upright (px), rim radius (m), hub height (m).
            'front_hub': [418, 511], 'rear_hub': [1019, 470], 'rim_px': [66.5, 51.5], 'rim_m': .241,
            'hub_m': [.327, .362], 'nose_px': 93, 'tail_px': 1128,
            'top': [[93, 458], [110, 440], [140, 428], [180, 410], [220, 390], [260, 365], [300, 345],
                    [330, 335], [360, 326], [385, 330], [410, 320], [440, 303], [480, 285], [520, 270],
                    [560, 262], [600, 258], [640, 258], [680, 262], [720, 270], [760, 281], [800, 296],
                    [850, 304], [900, 310], [950, 318], [1000, 332], [1040, 345], [1080, 353],
                    [1115, 368]],
            'tail': [[1115, 368], [1125, 400], [1128, 440], [1120, 480], [1110, 500]],
            'bottom': [[1110, 500], [1080, 505], [955, 522], [900, 526], [780, 530], [600, 548],
                       [505, 560], [325, 572], [280, 570], [240, 566], [200, 562], [170, 555],
                       [140, 548], [125, 530], [110, 500], [95, 470], [93, 458]],
            'window': [[545, 385], [570, 330], [600, 300], [640, 296], [700, 296], [765, 300],
                       [745, 330], [730, 358], [640, 368], [545, 385]],
        },
    },
    'mclaren_f1': {
        'folder': 'mclaren-f1',
        'axles': [1.23, -1.30], 'length': 4.28,
        'real': {'length': 4.287, 'width': 1.820, 'height': 1.140, 'wheelbase': 2.718},
        'side': {
            # Seen square on from the right (nose to the right): the rims are the same size,
            # so no height correction is needed.
            'photo': 'side.jpg', 'lift': False,
            'front_hub': [982, 443], 'rear_hub': [175, 430], 'rim_px': [71, 72], 'rim_m': .216,
            'hub_m': [.322, .358], 'nose_px': 1257, 'tail_px': 21,
            'top': [[1257, 440], [1247, 410], [1221, 397], [1188, 378], [1142, 345], [1109, 329],
                    [1070, 306], [1024, 279], [980, 266], [940, 256], [900, 245], [860, 233],
                    [820, 221], [780, 210], [740, 200], [700, 192], [660, 186], [567, 186],
                    [464, 199], [361, 214], [258, 227], [155, 235], [103, 243], [52, 261],
                    [31, 280]],
            'tail': [[31, 280], [23, 305], [21, 346], [31, 392], [45, 440]],
            'bottom': [[45, 440], [80, 455], [300, 494], [600, 496], [880, 496], [1109, 505],
                       [1208, 499], [1244, 489], [1253, 470], [1257, 440]],
            'window': [[372, 262], [420, 232], [520, 214], [640, 208], [760, 226], [860, 262],
                       [840, 318], [700, 310], [520, 290], [372, 262]],
        },
    },
    'bugatti_bolide': {
        'folder': 'bugatti-bolide',
        'axles': [1.42, -1.33], 'length': 4.82,
        'real': {'length': 4.756, 'width': 1.990, 'height': .995, 'wheelbase': 2.75},
        'side': {
            # Seen square on from the left at a track; the tyre edges (not rims) are the scale,
            # with the slicks' radius. The top line behind the cockpit is the spine and the wing.
            'photo': 'side.jpg', 'lift': False, 'square': True,
            'front_hub': [441, 445], 'rear_hub': [968, 427], 'rim_px': [66.5, 66.5], 'rim_m': .345,
            'hub_m': [.335, .355], 'nose_px': 205, 'tail_px': 1085,
            'top': [[205, 440], [226, 428], [248, 417], [273, 401], [298, 375], [327, 364], [352, 362],
                    [384, 362], [420, 364], [442, 362], [470, 353], [514, 338], [550, 313], [560, 304],
                    [600, 298], [650, 298], [713, 292], [787, 290], [860, 289], [934, 289], [1008, 288],
                    [1063, 290], [1095, 300]],
            'tail': [[1095, 300], [1090, 330], [1075, 380], [1072, 436], [1060, 470]],
            'bottom': [[1060, 470], [1040, 482], [900, 484], [700, 488], [520, 492], [380, 494],
                       [240, 492], [212, 470], [205, 440]],
        },
    },
}


def side_mapper(side, axles, real, length):
    """Pinhole map along the car: x(u) = (A u + B) / (C u + 1), fitted by least squares to the
    nose, the two hubs and the tail at the declared length; heights scale as 1 / (C u + 1) from
    the front rim, then one factor brings the roof to the real height (the camera looks down,
    so the roof's centre line rises in the picture)."""
    import numpy as np
    (x0, y0), (x1, y1) = side['front_hub'], side['rear_hub']
    wheelbase = axles[0] - axles[1]
    nose_u, tail_u = axles[0] - length / 2, axles[0] + length / 2
    xs = [side['nose_px'], x0, x1, side['tail_px']]
    us = [nose_u, 0, wheelbase, tail_u]
    if side.get('square'):
        # Seen square on: a plain scale from nose to tail at the declared length, so the
        # body keeps its proportions even where the game's axles sit a little off the photo's.
        a = (side['tail_px'] - side['nose_px']) / length
        b, c = side['nose_px'] - a * nose_u, 0.0
    else:
        rows = [[u, 1, -u * x] for u, x in zip(us, xs)]
        a, b, c = np.linalg.lstsq(np.array(rows, float), np.array(xs, float), rcond=None)[0]
    d = (y1 * (c * wheelbase + 1) - y0) / wheelbase
    k0 = side['rim_px'][0] / side['rim_m']
    h0, h1 = side['hub_m']

    def raw(px, py):
        u = (px - b) / (a - c * px)
        hub_y = (y0 + d * u) / (c * u + 1)
        scale = k0 / (c * u + 1)
        hub_h = h0 + (h1 - h0) * u / wheelbase
        return axles[0] - u, hub_h + (hub_y - py) / scale
    roof = max(raw(*p)[1] for p in side['top'])
    lift = real['height'] / roof if side.get('lift', True) else 1

    def to_metres(px, py):
        z, h = raw(px, py)
        return [round(float(z), 3), round(float(h * lift), 3)]
    return to_metres


def build():
    out = {}
    for key, car in CARS.items():
        side = car['side']
        to_m = side_mapper(side, car['axles'], car['real'], car['length'])
        entry = {'real': car['real'], 'axles': car['axles']}
        entry['side'] = {name: [to_m(*p) for p in side[name]] for name in ('top', 'tail', 'bottom', 'window') if name in side}
        out[key] = entry
    OUT.write_text(json.dumps(out, indent=1) + '\n', newline='\n')
    return out


def check(folder):
    from PIL import Image, ImageDraw
    folder = Path(folder).resolve()
    if not folder.is_relative_to(ROOT / '.evidence'):
        raise SystemExit('Trace checks belong under .evidence/')
    for key, car in CARS.items():
        side = car['side']
        image = Image.open(LIBRARY / car['folder'] / 'reference' / side['photo']).convert('RGB')
        draw = ImageDraw.Draw(image)
        for name, colour in (('top', (0, 255, 255)), ('tail', (0, 255, 255)), ('bottom', (255, 255, 0)), ('window', (255, 0, 255))):
            if name in side:
                draw.line([tuple(p) for p in side[name]], fill=colour, width=2)
        for hub in (side['front_hub'], side['rear_hub']):
            draw.ellipse([hub[0] - 4, hub[1] - 4, hub[0] + 4, hub[1] + 4], outline=(0, 255, 0), width=2)
        image.save(folder / f'trace-{key}-side.jpg', quality=88)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--check':
        check(sys.argv[2])
    else:
        data = build()
        for key, entry in data.items():
            print(key)
            for name, pts in entry['side'].items():
                print(' ', name, pts)
