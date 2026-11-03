"""Panorama Ridge laughing kookaburra: an original recipe (bird.py rig).

About 0.43 m long, stocky and upright with a big head and a long heavy bill
(dark above, pale below): off-white head and underparts, a dark brown eye
stripe and streaked crown, dark brown back and wings with pale blue spots on
the shoulder, and a rufous tail barred with black. Idle: perched, wings
folded, looks round. Fly: quick, direct wingbeats.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'kookaburra'
CREAM = (.50, .46, .38)
BROWN = (.070, .050, .034)
STRIPE = (.040, .028, .019)
BLUE = (.10, .15, .22)
RUFOUS = (.20, .085, .032)

P = {'body': .17, 'width': .066, 'height': .072, 'neck': (.022, .052), 'head': .062,
     'bill': (.088, .034, .026, .10), 'tail': (.12, .050, 'round'), 'span': .33,
     'chord': (.15, .10), 'fingers': 0, 'leg': .045, 'stance': .025, 'toe': .0062,
     'toes': [(0, .036), (25, .030), (-25, .030), (180, .026)], 'tilt': 55, 'beat': 12,
     'flap': .60}


def head_centre(f):
    from mathutils import Vector
    return f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))


def body(f, p):
    import original as o
    q = f.b(p)
    colour = o.mix(CREAM, BROWN, o.smooth((q.z + .005) / .02))
    # Faint brown barring on the pale front.
    return o.mix(colour, BROWN, .25 * (math.sin(q.x * 260) > .6) * (q.z < 0))


def head(f, p):
    import original as o
    d = (p - head_centre(f)) / P['head']
    if abs(d.z - .16) < .26 and d.x < .62 and abs(d.y) > .30:
        return STRIPE                      # dark stripe through the eye
    if d.z > .55:
        return o.mix(CREAM, BROWN, .35 + .5 * o.speckle(p))   # streaked crown
    if d.x < -.6 and d.z > -.2:
        return o.mix(CREAM, BROWN, .55)    # nape
    return CREAM


def wing(f, p):
    import original as o
    q = f.b(p)
    inner = o.smooth((.24 - abs(q.y)) / .06)
    spots = (o.speckle(p, .5) > .55) * inner * (q.x > -.02)
    return o.mix(BROWN, BLUE, .85 * spots)


def tail(f, p):
    import original as o
    q = f.b(p)
    return o.mix(RUFOUS, STRIPE, (math.sin(q.x * 150) > .55) * .9)


def bill(f, p):
    # Upper mandible dark, lower pale horn.
    hc = head_centre(f)
    base_z = hc.z - P['head'] * .12
    centre = base_z - (p.x - (hc.x + P['head'] * .78)) * P['bill'][3]
    return (.030, .026, .022) if p.z > centre - .002 else (.40, .37, .32)


PAINT = {'body': body, 'head': head, 'wing': wing, 'tail': tail, 'bill': bill,
         'leg': lambda f, p: (.07, .06, .05)}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
